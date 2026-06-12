import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TicketCategory, TicketStatus } from "core";
import type { TicketDetail } from "core";
import TicketSummary from "./TicketSummary";

const MOCK_TICKET: TicketDetail = {
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

describe("<TicketSummary />", () => {
  it("renders the ticket id and subject heading", () => {
    render(<TicketSummary ticket={MOCK_TICKET} />);

    expect(screen.getByText("#42")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Printer broken" }),
    ).toBeInTheDocument();
  });

  it("shows the sender's name and email when a name is present", () => {
    render(<TicketSummary ticket={MOCK_TICKET} />);

    expect(screen.getByText("Alice Customer")).toBeInTheDocument();
    expect(
      screen.getByText(/<alice@example\.com>/),
    ).toBeInTheDocument();
  });

  it("falls back to just the email when the ticket has no sender name", () => {
    render(<TicketSummary ticket={{ ...MOCK_TICKET, fromName: null }} />);

    expect(screen.getByText("alice@example.com")).toBeInTheDocument();
    expect(screen.queryByText("Alice Customer")).not.toBeInTheDocument();
  });
});
