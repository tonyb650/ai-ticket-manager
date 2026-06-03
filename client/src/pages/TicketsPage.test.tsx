import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import axios from "axios";
import { TicketCategory, TicketStatus } from "core";
import TicketsPage from "./TicketsPage";

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
      <TicketsPage />
    </QueryClientProvider>,
  );
}

const mockedGet = vi.mocked(axios.get);

describe("<TicketsPage />", () => {
  beforeEach(() => {
    mockedGet.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders the page heading", () => {
    mockedGet.mockResolvedValueOnce({ data: { tickets: [], total: 0 } });
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
    mockedGet.mockResolvedValueOnce({ data: { tickets: [], total: 0 } });
    renderTickets();

    expect(await screen.findByText(/no tickets yet/i)).toBeInTheDocument();
  });

  it("renders rows in the order returned by the API", async () => {
    mockedGet.mockResolvedValueOnce({ data: { tickets: MOCK_TICKETS, total: MOCK_TICKETS.length } });
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
    mockedGet.mockResolvedValueOnce({ data: { tickets: MOCK_TICKETS, total: MOCK_TICKETS.length } });
    renderTickets();

    expect(await screen.findByText("#42")).toBeInTheDocument();
    expect(screen.getByText("Printer broken")).toBeInTheDocument();

    const formattedDate = new Date(MOCK_TICKETS[0].createdAt).toLocaleDateString();
    expect(screen.getAllByText(formattedDate).length).toBeGreaterThan(0);
  });

  it("shows fromName with fromEmail underneath when both are present", async () => {
    mockedGet.mockResolvedValueOnce({ data: { tickets: MOCK_TICKETS, total: MOCK_TICKETS.length } });
    renderTickets();

    expect(await screen.findByText("Alice Customer")).toBeInTheDocument();
    expect(screen.getByText("alice@example.com")).toBeInTheDocument();
  });

  it("falls back to fromEmail alone when fromName is null", async () => {
    mockedGet.mockResolvedValueOnce({ data: { tickets: MOCK_TICKETS, total: MOCK_TICKETS.length } });
    renderTickets();

    await screen.findByText("Refund question");
    expect(screen.getByText("bob@example.com")).toBeInTheDocument();
    expect(screen.queryByText("dave@example.com")).toBeInTheDocument();
  });

  it("uses default variant for open and secondary for closed status badges", async () => {
    mockedGet.mockResolvedValueOnce({ data: { tickets: MOCK_TICKETS, total: MOCK_TICKETS.length } });
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
    mockedGet.mockResolvedValueOnce({ data: { tickets: MOCK_TICKETS, total: MOCK_TICKETS.length } });
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
    mockedGet.mockResolvedValueOnce({ data: { tickets: MOCK_TICKETS, total: MOCK_TICKETS.length } });
    renderTickets();

    await screen.findByText("No category here");
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  describe("server-side sorting", () => {
    it("requests createdAt desc by default", async () => {
      mockedGet.mockResolvedValueOnce({ data: { tickets: MOCK_TICKETS, total: MOCK_TICKETS.length } });
      renderTickets();

      await screen.findByText("Printer broken");

      expect(mockedGet).toHaveBeenCalledTimes(1);
      expect(mockedGet.mock.calls[0][1]).toMatchObject({
        params: { sort: "createdAt", order: "desc" },
      });
    });

    it("shows a descending chevron on the default-sorted Created header", async () => {
      mockedGet.mockResolvedValueOnce({ data: { tickets: MOCK_TICKETS, total: MOCK_TICKETS.length } });
      renderTickets();

      await screen.findByText("Printer broken");

      const createdHeader = screen.getByRole("columnheader", { name: /created/i });
      expect(createdHeader).toHaveAttribute("aria-sort", "descending");
      expect(createdHeader.querySelector("svg")).not.toBeNull();
    });

    it("refetches with ?sort=subject&order=asc when the Subject header is clicked", async () => {
      mockedGet.mockResolvedValue({ data: { tickets: MOCK_TICKETS, total: MOCK_TICKETS.length } });
      const user = userEvent.setup();
      renderTickets();

      await screen.findByText("Printer broken");

      await user.click(screen.getByRole("columnheader", { name: /subject/i }));

      await waitFor(() => {
        expect(mockedGet).toHaveBeenCalledTimes(2);
      });
      expect(mockedGet.mock.calls[1][1]).toMatchObject({
        params: { sort: "subject", order: "asc" },
      });
    });

    it("flips to desc when the same column header is clicked twice", async () => {
      mockedGet.mockResolvedValue({ data: { tickets: MOCK_TICKETS, total: MOCK_TICKETS.length } });
      const user = userEvent.setup();
      renderTickets();

      await screen.findByText("Printer broken");

      const subjectHeader = screen.getByRole("columnheader", { name: /subject/i });
      await user.click(subjectHeader);
      await waitFor(() => expect(mockedGet).toHaveBeenCalledTimes(2));

      await user.click(subjectHeader);
      await waitFor(() => expect(mockedGet).toHaveBeenCalledTimes(3));

      expect(mockedGet.mock.calls[2][1]).toMatchObject({
        params: { sort: "subject", order: "desc" },
      });
    });
  });

  describe("server-side filtering", () => {
    it("sends no filter params on initial render", async () => {
      mockedGet.mockResolvedValueOnce({ data: { tickets: MOCK_TICKETS, total: MOCK_TICKETS.length } });
      renderTickets();

      await screen.findByText("Printer broken");

      const params = mockedGet.mock.calls[0][1]?.params as Record<string, unknown>;
      expect(params).not.toHaveProperty("status");
      expect(params).not.toHaveProperty("category");
      expect(params).not.toHaveProperty("search");
    });

    it("refetches with status=open when the Status filter is set", async () => {
      mockedGet.mockResolvedValue({ data: { tickets: MOCK_TICKETS, total: MOCK_TICKETS.length } });
      const user = userEvent.setup();
      renderTickets();
      await screen.findByText("Printer broken");

      await user.click(screen.getByLabelText("Filter by status"));
      await user.click(await screen.findByRole("option", { name: "Open" }));

      await waitFor(() => expect(mockedGet).toHaveBeenCalledTimes(2));
      expect(mockedGet.mock.calls[1][1]).toMatchObject({
        params: { status: "open" },
      });
    });

    it("sends category=none when the Uncategorized option is selected", async () => {
      mockedGet.mockResolvedValue({ data: { tickets: MOCK_TICKETS, total: MOCK_TICKETS.length } });
      const user = userEvent.setup();
      renderTickets();
      await screen.findByText("Printer broken");

      await user.click(screen.getByLabelText("Filter by category"));
      await user.click(await screen.findByRole("option", { name: "Uncategorized" }));

      await waitFor(() => expect(mockedGet).toHaveBeenCalledTimes(2));
      expect(mockedGet.mock.calls[1][1]).toMatchObject({
        params: { category: "none" },
      });
    });

    it("debounces the search input before refetching with search", async () => {
      mockedGet.mockResolvedValue({ data: { tickets: MOCK_TICKETS, total: MOCK_TICKETS.length } });
      const user = userEvent.setup();
      renderTickets();
      await screen.findByText("Printer broken");

      await user.type(screen.getByLabelText("Search tickets"), "login");

      // Debounce contract: the next refetch carries the *final* value
      // "login", not the intermediate "l"/"lo"/etc. A broken debounce
      // would fire per-keystroke and the first refetch's search would be "l".
      await waitFor(() => expect(mockedGet).toHaveBeenCalledTimes(2));
      expect(mockedGet.mock.calls[1][1]).toMatchObject({
        params: { search: "login" },
      });
    });

    it("combines filters with the current sort", async () => {
      mockedGet.mockResolvedValue({ data: { tickets: MOCK_TICKETS, total: MOCK_TICKETS.length } });
      const user = userEvent.setup();
      renderTickets();
      await screen.findByText("Printer broken");

      await user.click(screen.getByLabelText("Filter by status"));
      await user.click(await screen.findByRole("option", { name: "Open" }));
      await waitFor(() => expect(mockedGet).toHaveBeenCalledTimes(2));

      await user.click(screen.getByRole("columnheader", { name: /subject/i }));
      await waitFor(() => expect(mockedGet).toHaveBeenCalledTimes(3));

      expect(mockedGet.mock.calls[2][1]).toMatchObject({
        params: { sort: "subject", order: "asc", status: "open" },
      });
    });

    it("clears all filters and refetches without filter params", async () => {
      mockedGet.mockResolvedValue({ data: { tickets: MOCK_TICKETS, total: MOCK_TICKETS.length } });
      const user = userEvent.setup();
      renderTickets();
      await screen.findByText("Printer broken");

      await user.click(screen.getByLabelText("Filter by status"));
      await user.click(await screen.findByRole("option", { name: "Closed" }));
      await waitFor(() => expect(mockedGet).toHaveBeenCalledTimes(2));

      await user.click(screen.getByRole("button", { name: /clear/i }));

      await waitFor(() => expect(mockedGet).toHaveBeenCalledTimes(3));
      const params = mockedGet.mock.calls[2][1]?.params as Record<string, unknown>;
      expect(params).not.toHaveProperty("status");
    });

    it("shows a filter-aware empty state when no tickets match", async () => {
      mockedGet.mockResolvedValue({ data: { tickets: [], total: 0 } });
      const user = userEvent.setup();
      renderTickets();

      expect(await screen.findByText(/no tickets yet/i)).toBeInTheDocument();

      await user.click(screen.getByLabelText("Filter by status"));
      await user.click(await screen.findByRole("option", { name: "Open" }));

      expect(
        await screen.findByText(/no tickets match these filters/i),
      ).toBeInTheDocument();
    });
  });

  describe("server-side pagination", () => {
    it("sends page=1 and pageSize=25 on the initial request", async () => {
      mockedGet.mockResolvedValueOnce({
        data: { tickets: MOCK_TICKETS, total: MOCK_TICKETS.length },
      });
      renderTickets();
      await screen.findByText("Printer broken");

      expect(mockedGet.mock.calls[0][1]).toMatchObject({
        params: { page: 1, pageSize: 25 },
      });
    });

    it("renders the total count and total page count from the response", async () => {
      mockedGet.mockResolvedValueOnce({
        data: { tickets: MOCK_TICKETS, total: 100 },
      });
      renderTickets();
      await screen.findByText("Printer broken");

      expect(screen.getByText("100 tickets")).toBeInTheDocument();
      expect(screen.getByText("Page 1 of 4")).toBeInTheDocument();
    });

    it("uses the singular 'ticket' label when total is 1", async () => {
      mockedGet.mockResolvedValueOnce({
        data: { tickets: [MOCK_TICKETS[0]], total: 1 },
      });
      renderTickets();
      await screen.findByText("Printer broken");

      expect(screen.getByText("1 ticket")).toBeInTheDocument();
    });

    it("disables the Previous page button on the first page", async () => {
      mockedGet.mockResolvedValueOnce({
        data: { tickets: MOCK_TICKETS, total: 100 },
      });
      renderTickets();
      await screen.findByText("Printer broken");

      expect(
        screen.getByRole("button", { name: "Previous page" }),
      ).toBeDisabled();
    });

    it("disables the Next page button when results fit on a single page", async () => {
      mockedGet.mockResolvedValueOnce({
        data: { tickets: MOCK_TICKETS, total: MOCK_TICKETS.length },
      });
      renderTickets();
      await screen.findByText("Printer broken");

      expect(
        screen.getByRole("button", { name: "Next page" }),
      ).toBeDisabled();
    });

    it("requests page 2 when the Next page button is clicked", async () => {
      mockedGet.mockResolvedValue({
        data: { tickets: MOCK_TICKETS, total: 100 },
      });
      const user = userEvent.setup();
      renderTickets();
      await screen.findByText("Printer broken");

      await user.click(screen.getByRole("button", { name: "Next page" }));

      await waitFor(() => {
        expect(mockedGet.mock.calls[mockedGet.mock.calls.length - 1][1]).toMatchObject({
          params: { page: 2, pageSize: 25 },
        });
      });
    });

    it("requests pageSize=50 and resets to page 1 when Rows per page changes", async () => {
      mockedGet.mockResolvedValue({
        data: { tickets: MOCK_TICKETS, total: 100 },
      });
      const user = userEvent.setup();
      renderTickets();
      await screen.findByText("Printer broken");

      // Jump to page 2 first so the page-reset side of this is observable.
      await user.click(screen.getByRole("button", { name: "Next page" }));
      await waitFor(() => {
        expect(mockedGet.mock.calls[mockedGet.mock.calls.length - 1][1]).toMatchObject({
          params: { page: 2 },
        });
      });

      await user.click(screen.getByLabelText("Rows per page"));
      await user.click(await screen.findByRole("option", { name: "50" }));

      await waitFor(() => {
        expect(mockedGet.mock.calls[mockedGet.mock.calls.length - 1][1]).toMatchObject({
          params: { page: 1, pageSize: 50 },
        });
      });
    });

    it("resets to page 1 when a filter changes", async () => {
      mockedGet.mockResolvedValue({
        data: { tickets: MOCK_TICKETS, total: 100 },
      });
      const user = userEvent.setup();
      renderTickets();
      await screen.findByText("Printer broken");

      await user.click(screen.getByRole("button", { name: "Next page" }));
      await waitFor(() => {
        expect(mockedGet.mock.calls[mockedGet.mock.calls.length - 1][1]).toMatchObject({
          params: { page: 2 },
        });
      });

      await user.click(screen.getByLabelText("Filter by status"));
      await user.click(await screen.findByRole("option", { name: "Open" }));

      await waitFor(() => {
        expect(mockedGet.mock.calls[mockedGet.mock.calls.length - 1][1]).toMatchObject({
          params: { page: 1, status: "open" },
        });
      });
    });

    it("resets to page 1 when sort changes", async () => {
      mockedGet.mockResolvedValue({
        data: { tickets: MOCK_TICKETS, total: 100 },
      });
      const user = userEvent.setup();
      renderTickets();
      await screen.findByText("Printer broken");

      await user.click(screen.getByRole("button", { name: "Next page" }));
      await waitFor(() => {
        expect(mockedGet.mock.calls[mockedGet.mock.calls.length - 1][1]).toMatchObject({
          params: { page: 2 },
        });
      });

      await user.click(screen.getByRole("columnheader", { name: /subject/i }));

      await waitFor(() => {
        expect(mockedGet.mock.calls[mockedGet.mock.calls.length - 1][1]).toMatchObject({
          params: { page: 1, sort: "subject" },
        });
      });
    });
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
