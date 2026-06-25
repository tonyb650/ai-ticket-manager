import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Routes, Route } from "react-router";
import axios from "axios";
import { TicketCategory, TicketStatus } from "core";
import type { Assignee, TicketDetail as TicketDetailType } from "core";
import TicketDetailPage from "./TicketDetailPage";

vi.mock("axios");

const mockedGet = vi.mocked(axios.get);
const mockedIsAxiosError = vi.mocked(axios.isAxiosError);

const MOCK_AGENTS: Assignee[] = [
  { id: "user-1", name: "Agent One", email: "one@example.com" },
  { id: "user-2", name: "Agent Two", email: "two@example.com" },
];

const MOCK_TICKET: TicketDetailType = {
  id: 42,
  subject: "Printer broken",
  body: "It will not print.",
  bodyHtml: null,
  fromEmail: "alice@example.com",
  fromName: "Alice Customer",
  category: TicketCategory.technical_question,
  status: TicketStatus.open,
  createdAt: "2026-05-20T10:00:00.000Z",
  updatedAt: "2026-05-21T10:00:00.000Z",
  assignedTo: null,
};

/**
 * Route GET calls by URL. The page fetches the ticket; its children fetch the
 * agent list and reply thread. `ticketPending` opts the ticket fetch into a
 * never-resolving promise so a test can assert the loading skeleton, and
 * `ticketError` rejects it to exercise the error states.
 */
function mockGets({
  ticket = MOCK_TICKET,
  ticketPending = false,
  ticketError,
}: {
  ticket?: TicketDetailType;
  ticketPending?: boolean;
  ticketError?: unknown;
} = {}) {
  mockedGet.mockImplementation((url: string) => {
    if (url === "/api/agents") {
      return Promise.resolve({ data: { agents: MOCK_AGENTS } });
    }
    if (typeof url === "string" && url.endsWith("/replies")) {
      return Promise.resolve({ data: { replies: [] } });
    }
    if (typeof url === "string" && url.startsWith("/api/tickets/")) {
      if (ticketPending) return new Promise(() => {});
      if (ticketError) return Promise.reject(ticketError);
      return Promise.resolve({ data: { ticket } });
    }
    return Promise.reject(new Error(`unexpected GET ${url}`));
  });
}

function renderDetail(id = "42") {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/tickets/${id}`]}>
        <Routes>
          <Route path="/tickets/:id" element={<TicketDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return { ...utils, queryClient };
}

describe("<TicketDetailPage />", () => {
  beforeEach(() => {
    mockedGet.mockReset();
    mockedIsAxiosError.mockReset();
    mockedIsAxiosError.mockImplementation(
      (err: unknown): err is import("axios").AxiosError =>
        typeof err === "object" && err !== null && "response" in err,
    );
  });

  it("shows a loading skeleton while the ticket is being fetched", () => {
    mockGets({ ticketPending: true });
    renderDetail();

    expect(screen.getAllByRole("status", { name: "Loading" }).length).toBeGreaterThan(0);
    expect(
      screen.queryByRole("heading", { name: "Printer broken" }),
    ).not.toBeInTheDocument();
  });

  describe("when the ticket loads", () => {
    let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      // The agents/replies child queries log nothing here, but keep parity with
      // error-path silencing if a child query is added later.
      consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    });

    it("renders the summary, the update controls, and the reply form", async () => {
      mockGets();
      renderDetail();

      await screen.findByRole("heading", { name: "Printer broken" });

      // Summary
      expect(screen.getByText("#42")).toBeInTheDocument();
      // UpdateTicket controls are wired in
      expect(screen.getByLabelText("Assign ticket")).toBeInTheDocument();
      expect(screen.getByLabelText("Set status")).toBeInTheDocument();
      // TicketDetail body
      expect(screen.getByText(/It will not print\./)).toBeInTheDocument();
      // ReplyForm
      expect(
        screen.getByRole("textbox", { name: "Reply" }),
      ).toBeInTheDocument();

      consoleErrorSpy.mockRestore();
    });

    it("links back to the tickets list", async () => {
      mockGets();
      renderDetail();

      await screen.findByRole("heading", { name: "Printer broken" });

      const back = screen.getByRole("link", { name: /back to tickets/i });
      expect(back).toHaveAttribute("href", "/tickets");

      consoleErrorSpy.mockRestore();
    });
  });

  describe("error states", () => {
    let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    });

    it("shows a generic error when the ticket fetch fails", async () => {
      mockGets({ ticketError: new Error("network down") });
      renderDetail();

      await waitFor(() =>
        expect(
          screen.getByText(/failed to load ticket/i),
        ).toBeInTheDocument(),
      );

      consoleErrorSpy.mockRestore();
    });

    it("shows 'Ticket not found.' on a 404", async () => {
      mockGets({ ticketError: { response: { status: 404 } } });
      renderDetail();

      await waitFor(() =>
        expect(screen.getByText(/ticket not found/i)).toBeInTheDocument(),
      );

      consoleErrorSpy.mockRestore();
    });
  });
});
