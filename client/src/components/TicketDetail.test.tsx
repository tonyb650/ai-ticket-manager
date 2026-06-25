import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TicketCategory, TicketStatus } from "core";
import type { TicketDetail as TicketDetailType } from "core";
import TicketDetail from "./TicketDetail";

const MOCK_TICKET: TicketDetailType = {
  id: 42,
  subject: "Printer broken",
  body: "It will not print.\nTried twice.",
  bodyHtml: null,
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

  it("renders bodyHtml as markup when present", () => {
    render(
      <TicketDetail
        ticket={{
          ...MOCK_TICKET,
          bodyHtml: '<p>Hello <a href="https://example.com">link</a></p>',
        }}
      />,
    );

    const link = screen.getByRole("link", { name: "link" });
    expect(link).toHaveAttribute("href", "https://example.com");
    // The plain-text body should not be rendered when bodyHtml is shown.
    expect(screen.queryByText(/It will not print\./)).not.toBeInTheDocument();
  });

  it("sanitizes dangerous markup in bodyHtml", () => {
    render(
      <TicketDetail
        ticket={{
          ...MOCK_TICKET,
          bodyHtml:
            '<p>Safe</p><script>window.__pwned = true;</script><img src=x onerror="window.__pwned = true">',
        }}
      />,
    );

    expect(screen.getByText("Safe")).toBeInTheDocument();
    expect(document.querySelector("script")).toBeNull();
    expect(document.querySelector("img[onerror]")).toBeNull();
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
