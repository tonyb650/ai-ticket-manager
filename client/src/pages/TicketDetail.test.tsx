import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Routes, Route } from "react-router";
import axios from "axios";
import { TicketCategory, TicketStatus } from "core";
import type { Assignee, TicketDetail as TicketDetailType } from "core";
import TicketDetail from "./TicketDetail";

vi.mock("axios");

const mockedGet = vi.mocked(axios.get);
const mockedPatch = vi.mocked(axios.patch);
const mockedIsAxiosError = vi.mocked(axios.isAxiosError);

const MOCK_AGENTS: Assignee[] = [
  { id: "user-1", name: "Agent One", email: "one@example.com" },
  { id: "user-2", name: "Agent Two", email: "two@example.com" },
];

const MOCK_TICKET: TicketDetailType = {
  id: 42,
  subject: "Printer broken",
  body: "It will not print.",
  fromEmail: "alice@example.com",
  fromName: "Alice Customer",
  category: TicketCategory.technical_question,
  status: TicketStatus.open,
  createdAt: "2026-05-20T10:00:00.000Z",
  updatedAt: "2026-05-21T10:00:00.000Z",
  assignedTo: null,
};

/**
 * Route GET calls by URL: the detail page fetches both the ticket and the
 * agent list on mount. `agents` defaults to a never-resolving promise so the
 * caller can opt into a loading state.
 */
function mockGets({
  ticket = MOCK_TICKET,
  agents = MOCK_AGENTS,
  agentsPending = false,
}: {
  ticket?: TicketDetailType;
  agents?: Assignee[];
  agentsPending?: boolean;
} = {}) {
  mockedGet.mockImplementation((url: string) => {
    if (url === "/api/agents") {
      return agentsPending
        ? new Promise(() => {})
        : Promise.resolve({ data: { agents } });
    }
    if (typeof url === "string" && url.startsWith("/api/tickets/")) {
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
          <Route path="/tickets/:id" element={<TicketDetail />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return { ...utils, queryClient };
}

const assignControl = () => screen.getByLabelText("Assign ticket");

describe("<TicketDetail /> assignment", () => {
  beforeEach(() => {
    mockedGet.mockReset();
    mockedPatch.mockReset();
    mockedIsAxiosError.mockReset();
    mockedIsAxiosError.mockImplementation(
      (err: unknown): err is import("axios").AxiosError =>
        typeof err === "object" && err !== null && "response" in err,
    );
  });

  describe("rendering the current assignment", () => {
    it("shows 'Unassigned' in the control when the ticket has no assignee", async () => {
      mockGets({ ticket: { ...MOCK_TICKET, assignedTo: null } });
      renderDetail();

      await screen.findByRole("heading", { name: "Printer broken" });

      expect(assignControl()).toHaveTextContent("Unassigned");
    });

    it("shows the current assignee's name in the control", async () => {
      mockGets({ ticket: { ...MOCK_TICKET, assignedTo: MOCK_AGENTS[0] } });
      renderDetail();

      await screen.findByRole("heading", { name: "Printer broken" });

      expect(assignControl()).toHaveTextContent("Agent One");
    });

    it("lists 'Unassigned' plus every agent as options", async () => {
      mockGets();
      const user = userEvent.setup();
      renderDetail();

      await screen.findByRole("heading", { name: "Printer broken" });
      await user.click(assignControl());

      expect(
        await screen.findByRole("option", { name: /unassigned/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("option", { name: /Agent One/ }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("option", { name: /Agent Two/ }),
      ).toBeInTheDocument();
    });

    it("disables the control while the agent list is still loading", async () => {
      mockGets({ agentsPending: true });
      renderDetail();

      await screen.findByRole("heading", { name: "Printer broken" });

      expect(assignControl()).toBeDisabled();
    });
  });

  describe("assigning a ticket", () => {
    it("PATCHes the ticket with the chosen agent id", async () => {
      mockGets({ ticket: { ...MOCK_TICKET, assignedTo: null } });
      mockedPatch.mockResolvedValue({
        data: { ticket: { ...MOCK_TICKET, assignedTo: MOCK_AGENTS[0] } },
      });
      const user = userEvent.setup();
      renderDetail();

      await screen.findByRole("heading", { name: "Printer broken" });
      await user.click(assignControl());
      await user.click(await screen.findByRole("option", { name: /Agent One/ }));

      await waitFor(() => {
        expect(mockedPatch).toHaveBeenCalledWith("/api/tickets/42", {
          assignedToId: "user-1",
        });
      });
    });

    it("PATCHes with null when 'Unassigned' is chosen for an assigned ticket", async () => {
      mockGets({ ticket: { ...MOCK_TICKET, assignedTo: MOCK_AGENTS[0] } });
      mockedPatch.mockResolvedValue({
        data: { ticket: { ...MOCK_TICKET, assignedTo: null } },
      });
      const user = userEvent.setup();
      renderDetail();

      await screen.findByRole("heading", { name: "Printer broken" });
      await user.click(assignControl());
      await user.click(await screen.findByRole("option", { name: /unassigned/i }));

      await waitFor(() => {
        expect(mockedPatch).toHaveBeenCalledWith("/api/tickets/42", {
          assignedToId: null,
        });
      });
    });

    it("invalidates the ticket and tickets-list queries on success", async () => {
      mockGets({ ticket: { ...MOCK_TICKET, assignedTo: null } });
      mockedPatch.mockResolvedValue({
        data: { ticket: { ...MOCK_TICKET, assignedTo: MOCK_AGENTS[0] } },
      });
      const user = userEvent.setup();
      const { queryClient } = renderDetail();
      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

      await screen.findByRole("heading", { name: "Printer broken" });
      await user.click(assignControl());
      await user.click(await screen.findByRole("option", { name: /Agent Two/ }));

      await waitFor(() => {
        expect(invalidateSpy).toHaveBeenCalledWith({
          queryKey: ["ticket", "42"],
        });
      });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["tickets"] });
    });

    it("disables the control while the assignment mutation is in flight", async () => {
      mockGets({ ticket: { ...MOCK_TICKET, assignedTo: null } });
      mockedPatch.mockReturnValueOnce(new Promise(() => {}));
      const user = userEvent.setup();
      renderDetail();

      await screen.findByRole("heading", { name: "Printer broken" });
      await user.click(assignControl());
      await user.click(await screen.findByRole("option", { name: /Agent One/ }));

      await waitFor(() => expect(assignControl()).toBeDisabled());
    });
  });

  describe("updating status", () => {
    it("renders a control reflecting the current status", async () => {
      mockGets({ ticket: { ...MOCK_TICKET, status: TicketStatus.open } });
      renderDetail();

      await screen.findByRole("heading", { name: "Printer broken" });

      expect(screen.getByLabelText("Set status")).toHaveTextContent("Open");
    });

    it("PATCHes the chosen status", async () => {
      mockGets({ ticket: { ...MOCK_TICKET, status: TicketStatus.open } });
      mockedPatch.mockResolvedValue({
        data: { ticket: { ...MOCK_TICKET, status: TicketStatus.closed } },
      });
      const user = userEvent.setup();
      renderDetail();

      await screen.findByRole("heading", { name: "Printer broken" });
      await user.click(screen.getByLabelText("Set status"));
      await user.click(await screen.findByRole("option", { name: "Closed" }));

      await waitFor(() => {
        expect(mockedPatch).toHaveBeenCalledWith("/api/tickets/42", {
          status: TicketStatus.closed,
        });
      });
    });
  });

  describe("updating category", () => {
    it("PATCHes the chosen category", async () => {
      mockGets({
        ticket: { ...MOCK_TICKET, category: TicketCategory.technical_question },
      });
      mockedPatch.mockResolvedValue({
        data: {
          ticket: { ...MOCK_TICKET, category: TicketCategory.refund_request },
        },
      });
      const user = userEvent.setup();
      renderDetail();

      await screen.findByRole("heading", { name: "Printer broken" });
      await user.click(screen.getByLabelText("Set category"));
      await user.click(await screen.findByRole("option", { name: "Refund" }));

      await waitFor(() => {
        expect(mockedPatch).toHaveBeenCalledWith("/api/tickets/42", {
          category: TicketCategory.refund_request,
        });
      });
    });

    it("PATCHes a null category when 'Uncategorized' is chosen", async () => {
      mockGets({
        ticket: { ...MOCK_TICKET, category: TicketCategory.technical_question },
      });
      mockedPatch.mockResolvedValue({
        data: { ticket: { ...MOCK_TICKET, category: null } },
      });
      const user = userEvent.setup();
      renderDetail();

      await screen.findByRole("heading", { name: "Printer broken" });
      await user.click(screen.getByLabelText("Set category"));
      await user.click(
        await screen.findByRole("option", { name: /uncategorized/i }),
      );

      await waitFor(() => {
        expect(mockedPatch).toHaveBeenCalledWith("/api/tickets/42", {
          category: null,
        });
      });
    });
  });

  describe("error handling", () => {
    let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    });

    it("shows an error message when the assignment PATCH fails", async () => {
      mockGets({ ticket: { ...MOCK_TICKET, assignedTo: null } });
      mockedPatch.mockRejectedValueOnce(new Error("network down"));
      const user = userEvent.setup();
      renderDetail();

      await screen.findByRole("heading", { name: "Printer broken" });
      await user.click(assignControl());
      await user.click(await screen.findByRole("option", { name: /Agent One/ }));

      expect(
        await screen.findByText(/failed to update ticket/i),
      ).toBeInTheDocument();

      consoleErrorSpy.mockRestore();
    });
  });
});
