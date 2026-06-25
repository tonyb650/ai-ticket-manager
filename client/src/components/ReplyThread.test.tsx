import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import axios from "axios";
import { SenderType, TicketCategory, TicketStatus } from "core";
import type { TicketDetail, TicketReply } from "core";
import ReplyThread from "./ReplyThread";

vi.mock("axios");

const mockedGet = vi.mocked(axios.get);

const MOCK_TICKET: TicketDetail = {
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

const AGENT_REPLY: TicketReply = {
  id: 1,
  body: "Have you tried turning it off and on?",
  bodyHtml: null,
  senderType: SenderType.agent,
  createdAt: "2026-05-20T11:00:00.000Z",
  author: { id: "user-1", name: "Agent One", email: "one@example.com" },
};

const CUSTOMER_REPLY: TicketReply = {
  id: 2,
  body: "Yes, still broken.",
  bodyHtml: null,
  senderType: SenderType.customer,
  createdAt: "2026-05-20T12:00:00.000Z",
  author: null,
};

function mockReplies(replies: TicketReply[]) {
  mockedGet.mockResolvedValue({ data: { replies } });
}

function renderThread(ticket: TicketDetail = MOCK_TICKET) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ReplyThread ticket={ticket} />
    </QueryClientProvider>,
  );
}

describe("<ReplyThread />", () => {
  beforeEach(() => {
    mockedGet.mockReset();
  });

  it("fetches the thread for the ticket id", async () => {
    mockReplies([AGENT_REPLY]);
    renderThread();

    await screen.findByText(AGENT_REPLY.body);
    expect(mockedGet).toHaveBeenCalledWith(
      "/api/tickets/42/replies",
      expect.anything(),
    );
  });

  it("attributes an agent reply to its author", async () => {
    mockReplies([AGENT_REPLY]);
    renderThread();

    expect(
      await screen.findByText("Agent One <one@example.com>"),
    ).toBeInTheDocument();
  });

  it("attributes a customer reply to the ticket's sender", async () => {
    mockReplies([CUSTOMER_REPLY]);
    renderThread();

    await screen.findByText(CUSTOMER_REPLY.body);
    expect(
      screen.getByText("Alice Customer <alice@example.com>"),
    ).toBeInTheDocument();
  });

  it("renders a reply's bodyHtml as markup when present", async () => {
    mockReplies([
      {
        ...AGENT_REPLY,
        bodyHtml: '<p>See this <a href="https://example.com">link</a></p>',
      },
    ]);
    renderThread();

    const link = await screen.findByRole("link", { name: "link" });
    expect(link).toHaveAttribute("href", "https://example.com");
    // The plain-text body should not be rendered when bodyHtml is shown.
    expect(screen.queryByText(AGENT_REPLY.body)).not.toBeInTheDocument();
  });

  it("sanitizes dangerous markup in a reply's bodyHtml", async () => {
    mockReplies([
      {
        ...AGENT_REPLY,
        bodyHtml:
          '<p>Safe reply</p><script>window.__pwned = true;</script><img src=x onerror="window.__pwned = true">',
      },
    ]);
    renderThread();

    await screen.findByText("Safe reply");
    expect(document.querySelector("script")).toBeNull();
    expect(document.querySelector("img[onerror]")).toBeNull();
  });

  it("renders nothing when the thread is empty", async () => {
    mockReplies([]);
    const { container } = renderThread();

    // Let the query resolve, then confirm no thread content was rendered.
    await Promise.resolve();
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByText(AGENT_REPLY.body)).not.toBeInTheDocument();
  });

  describe("when the request fails", () => {
    let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    });

    afterEach(() => {
      consoleErrorSpy.mockRestore();
    });

    it("shows an error message", async () => {
      mockedGet.mockRejectedValue(new Error("network down"));
      renderThread();

      expect(
        await screen.findByText(/failed to load replies/i),
      ).toBeInTheDocument();
    });
  });
});
