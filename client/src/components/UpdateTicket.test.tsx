import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import axios from "axios";
import { TicketCategory, TicketStatus } from "core";
import type { Assignee, TicketDetail as TicketDetailType } from "core";
import UpdateTicket from "./UpdateTicket";

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
 * Mock the agents list fetch. `agentsPending` opts into a never-resolving
 * promise so a test can assert the loading (disabled) state.
 */
function mockAgents({
  agents = MOCK_AGENTS,
  agentsPending = false,
}: { agents?: Assignee[]; agentsPending?: boolean } = {}) {
  mockedGet.mockImplementation((url: string) => {
    if (url === "/api/agents") {
      return agentsPending
        ? new Promise(() => {})
        : Promise.resolve({ data: { agents } });
    }
    return Promise.reject(new Error(`unexpected GET ${url}`));
  });
}

function renderUpdate(ticket: TicketDetailType = MOCK_TICKET) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <UpdateTicket ticket={ticket} />
    </QueryClientProvider>,
  );
  return { ...utils, queryClient };
}

const assignControl = () => screen.getByLabelText("Assign ticket");

describe("<UpdateTicket />", () => {
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
    it("shows 'Unassigned' in the control when the ticket has no assignee", () => {
      mockAgents();
      renderUpdate({ ...MOCK_TICKET, assignedTo: null });

      expect(assignControl()).toHaveTextContent("Unassigned");
    });

    it("shows the current assignee's name in the control", async () => {
      mockAgents();
      renderUpdate({ ...MOCK_TICKET, assignedTo: MOCK_AGENTS[0] });

      // The assignee label resolves once the agents list loads.
      await waitFor(() =>
        expect(assignControl()).toHaveTextContent("Agent One"),
      );
    });

    it("lists 'Unassigned' plus every agent as options", async () => {
      mockAgents();
      const user = userEvent.setup();
      renderUpdate();

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

    it("disables the control while the agent list is still loading", () => {
      mockAgents({ agentsPending: true });
      renderUpdate();

      expect(assignControl()).toBeDisabled();
    });
  });

  describe("assigning a ticket", () => {
    it("PATCHes the ticket with the chosen agent id", async () => {
      mockAgents();
      mockedPatch.mockResolvedValue({
        data: { ticket: { ...MOCK_TICKET, assignedTo: MOCK_AGENTS[0] } },
      });
      const user = userEvent.setup();
      renderUpdate({ ...MOCK_TICKET, assignedTo: null });

      await user.click(assignControl());
      await user.click(await screen.findByRole("option", { name: /Agent One/ }));

      await waitFor(() => {
        expect(mockedPatch).toHaveBeenCalledWith("/api/tickets/42", {
          assignedToId: "user-1",
        });
      });
    });

    it("PATCHes with null when 'Unassigned' is chosen for an assigned ticket", async () => {
      mockAgents();
      mockedPatch.mockResolvedValue({
        data: { ticket: { ...MOCK_TICKET, assignedTo: null } },
      });
      const user = userEvent.setup();
      renderUpdate({ ...MOCK_TICKET, assignedTo: MOCK_AGENTS[0] });

      await user.click(assignControl());
      await user.click(
        await screen.findByRole("option", { name: /unassigned/i }),
      );

      await waitFor(() => {
        expect(mockedPatch).toHaveBeenCalledWith("/api/tickets/42", {
          assignedToId: null,
        });
      });
    });

    it("invalidates the ticket and tickets-list queries on success", async () => {
      mockAgents();
      mockedPatch.mockResolvedValue({
        data: { ticket: { ...MOCK_TICKET, assignedTo: MOCK_AGENTS[1] } },
      });
      const user = userEvent.setup();
      const { queryClient } = renderUpdate({ ...MOCK_TICKET, assignedTo: null });
      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

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
      mockAgents();
      mockedPatch.mockReturnValueOnce(new Promise(() => {}));
      const user = userEvent.setup();
      renderUpdate({ ...MOCK_TICKET, assignedTo: null });

      await user.click(assignControl());
      await user.click(await screen.findByRole("option", { name: /Agent One/ }));

      await waitFor(() => expect(assignControl()).toBeDisabled());
    });
  });

  describe("updating status", () => {
    it("renders a control reflecting the current status", () => {
      mockAgents();
      renderUpdate({ ...MOCK_TICKET, status: TicketStatus.open });

      expect(screen.getByLabelText("Set status")).toHaveTextContent("Open");
    });

    it("PATCHes the chosen status", async () => {
      mockAgents();
      mockedPatch.mockResolvedValue({
        data: { ticket: { ...MOCK_TICKET, status: TicketStatus.closed } },
      });
      const user = userEvent.setup();
      renderUpdate({ ...MOCK_TICKET, status: TicketStatus.open });

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
      mockAgents();
      mockedPatch.mockResolvedValue({
        data: {
          ticket: { ...MOCK_TICKET, category: TicketCategory.refund_request },
        },
      });
      const user = userEvent.setup();
      renderUpdate({
        ...MOCK_TICKET,
        category: TicketCategory.technical_question,
      });

      await user.click(screen.getByLabelText("Set category"));
      await user.click(await screen.findByRole("option", { name: "Refund" }));

      await waitFor(() => {
        expect(mockedPatch).toHaveBeenCalledWith("/api/tickets/42", {
          category: TicketCategory.refund_request,
        });
      });
    });

    it("PATCHes a null category when 'Uncategorized' is chosen", async () => {
      mockAgents();
      mockedPatch.mockResolvedValue({
        data: { ticket: { ...MOCK_TICKET, category: null } },
      });
      const user = userEvent.setup();
      renderUpdate({
        ...MOCK_TICKET,
        category: TicketCategory.technical_question,
      });

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
      mockAgents();
      mockedPatch.mockRejectedValueOnce(new Error("network down"));
      const user = userEvent.setup();
      renderUpdate({ ...MOCK_TICKET, assignedTo: null });

      await user.click(assignControl());
      await user.click(await screen.findByRole("option", { name: /Agent One/ }));

      expect(
        await screen.findByText(/failed to update ticket/i),
      ).toBeInTheDocument();

      consoleErrorSpy.mockRestore();
    });
  });
});
