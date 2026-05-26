import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import axios from "axios";
import { TicketCategory, TicketStatus } from "core";
import Tickets from "./Tickets";

vi.mock("axios");

const MOCK_TICKETS = [
  {
    id: 42,
    subject: "Printer broken",
    fromEmail: "alice@example.com",
    fromName: "Alice Customer",
    category: TicketCategory.technical_question,
    status: TicketStatus.open,
    createdAt: "2026-05-20T10:00:00.000Z",
  },
  {
    id: 41,
    subject: "Refund question",
    fromEmail: "bob@example.com",
    fromName: null,
    category: TicketCategory.refund_request,
    status: TicketStatus.closed,
    createdAt: "2026-05-19T10:00:00.000Z",
  },
  {
    id: 40,
    subject: "Just wondering",
    fromEmail: "carol@example.com",
    fromName: "Carol",
    category: TicketCategory.general_question,
    status: TicketStatus.open,
    createdAt: "2026-05-18T10:00:00.000Z",
  },
  {
    id: 39,
    subject: "No category here",
    fromEmail: "dave@example.com",
    fromName: null,
    category: null,
    status: TicketStatus.open,
    createdAt: "2026-05-17T10:00:00.000Z",
  },
] as const;

function renderTickets() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <Tickets />
    </QueryClientProvider>,
  );
}

const mockedGet = vi.mocked(axios.get);

describe("<Tickets />", () => {
  beforeEach(() => {
    mockedGet.mockReset();
  });

  it("renders the page heading", () => {
    mockedGet.mockResolvedValueOnce({ data: { tickets: [] } });
    renderTickets();
    expect(
      screen.getByRole("heading", { level: 1, name: /tickets/i }),
    ).toBeInTheDocument();
  });

  it("shows skeleton placeholders while tickets are loading", () => {
    mockedGet.mockReturnValueOnce(new Promise(() => {}));
    renderTickets();

    expect(screen.getAllByRole("status").length).toBeGreaterThan(0);
    expect(screen.queryByText(/no tickets yet/i)).not.toBeInTheDocument();
  });

  it("renders the empty state when the API returns no tickets", async () => {
    mockedGet.mockResolvedValueOnce({ data: { tickets: [] } });
    renderTickets();

    expect(await screen.findByText(/no tickets yet/i)).toBeInTheDocument();
  });

  it("renders rows in the order returned by the API", async () => {
    mockedGet.mockResolvedValueOnce({ data: { tickets: MOCK_TICKETS } });
    renderTickets();

    await screen.findByText("Printer broken");

    const subjectCells = screen
      .getAllByRole("row")
      .slice(1)
      .map((row) => row.children[1].textContent);

    expect(subjectCells).toEqual([
      "Printer broken",
      "Refund question",
      "Just wondering",
      "No category here",
    ]);
  });

  it("renders ticket id, subject, and formatted created date", async () => {
    mockedGet.mockResolvedValueOnce({ data: { tickets: MOCK_TICKETS } });
    renderTickets();

    expect(await screen.findByText("#42")).toBeInTheDocument();
    expect(screen.getByText("Printer broken")).toBeInTheDocument();

    const formattedDate = new Date(MOCK_TICKETS[0].createdAt).toLocaleDateString();
    expect(screen.getAllByText(formattedDate).length).toBeGreaterThan(0);
  });

  it("shows fromName with fromEmail underneath when both are present", async () => {
    mockedGet.mockResolvedValueOnce({ data: { tickets: MOCK_TICKETS } });
    renderTickets();

    expect(await screen.findByText("Alice Customer")).toBeInTheDocument();
    expect(screen.getByText("alice@example.com")).toBeInTheDocument();
  });

  it("falls back to fromEmail alone when fromName is null", async () => {
    mockedGet.mockResolvedValueOnce({ data: { tickets: MOCK_TICKETS } });
    renderTickets();

    await screen.findByText("Refund question");
    expect(screen.getByText("bob@example.com")).toBeInTheDocument();
    expect(screen.queryByText("dave@example.com")).toBeInTheDocument();
  });

  it("uses default variant for open and secondary for closed status badges", async () => {
    mockedGet.mockResolvedValueOnce({ data: { tickets: MOCK_TICKETS } });
    renderTickets();

    const openBadges = await screen.findAllByText(TicketStatus.open);
    const closedBadge = screen.getByText(TicketStatus.closed);

    for (const badge of openBadges) {
      expect(badge).toHaveAttribute("data-slot", "badge");
      expect(badge).toHaveAttribute("data-variant", "default");
    }
    expect(closedBadge).toHaveAttribute("data-slot", "badge");
    expect(closedBadge).toHaveAttribute("data-variant", "secondary");
  });

  it("maps each category to its pretty label and renders an outline badge", async () => {
    mockedGet.mockResolvedValueOnce({ data: { tickets: MOCK_TICKETS } });
    renderTickets();

    const technical = await screen.findByText("Technical");
    const refund = screen.getByText("Refund");
    const general = screen.getByText("General");

    for (const badge of [technical, refund, general]) {
      expect(badge).toHaveAttribute("data-slot", "badge");
      expect(badge).toHaveAttribute("data-variant", "outline");
    }
  });

  it("renders an em dash for tickets with no category", async () => {
    mockedGet.mockResolvedValueOnce({ data: { tickets: MOCK_TICKETS } });
    renderTickets();

    await screen.findByText("No category here");
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  describe("error state", () => {
    let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
    });

    afterEach(() => {
      consoleErrorSpy.mockRestore();
    });

    it("shows an error message when the request fails", async () => {
      mockedGet.mockRejectedValueOnce(new Error("Network down"));
      renderTickets();

      expect(
        await screen.findByText(/failed to load tickets: network down/i),
      ).toBeInTheDocument();
      expect(screen.queryByRole("table")).not.toBeInTheDocument();
    });
  });
});
