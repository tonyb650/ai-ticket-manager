import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TicketCategory, TicketStatus } from "core";
import type { TicketDetail as TicketDetailType } from "core";
import TicketDetail from "./TicketDetail";

const MOCK_TICKET: TicketDetailType = {
  id: 42,
  subject: "Printer broken",
  body: "It will not print.\nTried twice.",
  fromEmail: "alice@example.com",
  fromName: "Alice Customer",
  category: TicketCategory.technical_question,
  status: TicketStatus.open,
  createdAt: "2026-05-20T10:00:00.000Z",
  updatedAt: "2026-05-21T10:00:00.000Z",
  assignedTo: null,
};

describe("<TicketDetail />", () => {
  it("renders the ticket body", () => {
    render(<TicketDetail ticket={MOCK_TICKET} />);

    expect(
      screen.getByText(/It will not print\./),
    ).toBeInTheDocument();
  });

  it("renders the created and last-updated timestamps", () => {
    render(<TicketDetail ticket={MOCK_TICKET} />);

    expect(screen.getByText("Created")).toBeInTheDocument();
    expect(screen.getByText("Last updated")).toBeInTheDocument();
    // The dates are rendered via toLocaleString(); assert against the same
    // runtime formatting so the test stays timezone-agnostic.
    expect(
      screen.getByText(new Date(MOCK_TICKET.createdAt).toLocaleString()),
    ).toBeInTheDocument();
    expect(
      screen.getByText(new Date(MOCK_TICKET.updatedAt).toLocaleString()),
    ).toBeInTheDocument();
  });
});
