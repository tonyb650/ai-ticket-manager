/**
 * E2E — Inbound email webhook (POST /api/webhooks/inbound-email)
 *
 * These are API-level tests: they call the test server directly (port 3031)
 * using Playwright's `request` fixture, with no browser involved.
 *
 * Isolation strategy:
 * - Every test uses a unique `from` email (via uid()) so no test's created
 *   tickets interfere with another test's deduplication lookups.
 * - Tests that create tickets delete them in afterEach via a direct SQL
 *   DELETE using the test DATABASE_URL (no delete API exists on the server).
 *   Only the creating test's ticket IDs are deleted, leaving other test data
 *   intact if tests run in parallel.
 */

import { test, expect, request as playwrightRequest } from "@playwright/test";
import { spawnSync } from "node:child_process";
import path from "node:path";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SERVER_URL = "http://localhost:3031";
const WEBHOOK_PATH = "/api/webhooks/inbound-email";

// Read from env (populated by globalSetup via dotenv, and forwarded to the
// test server via the webServer command in playwright.config.ts).
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET ?? "test-webhook-secret-e2e";
const TEST_DATABASE_URL =
  process.env.DATABASE_URL ??
  "postgresql://helpdesk:helpdesk@localhost:5433/helpdesk_test";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Unique token safe to embed in emails across parallel workers and
 * repeated runs against the same test DB.
 */
function uid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * A minimal valid inbound-email payload.  Callers spread overrides on top.
 */
function validPayload(from: string, overrides: Record<string, unknown> = {}) {
  return {
    from,
    subject: "Help with my order",
    text: "Hi, I need help.",
    category: "general_question",
    ...overrides,
  };
}

/**
 * DELETE ticket rows by their IDs directly against the test DB.
 * This is the simplest cleanup mechanism given the server exposes no
 * delete-ticket endpoint.
 */
function deleteTickets(ids: number[]) {
  if (ids.length === 0) return;
  const sql = `DELETE FROM ticket WHERE id IN (${ids.join(",")});`;
  spawnSync(
    "psql",
    [TEST_DATABASE_URL, "-c", sql],
    { stdio: "inherit" },
  );
}

/**
 * Set a ticket's status to 'closed' directly in the test DB.
 */
function closeTicket(id: number) {
  const sql = `UPDATE ticket SET status = 'closed' WHERE id = ${id};`;
  spawnSync(
    "psql",
    [TEST_DATABASE_URL, "-c", sql],
    { stdio: "inherit" },
  );
}

// ---------------------------------------------------------------------------
// Shared request context (no cookies needed — webhook uses a shared secret)
// ---------------------------------------------------------------------------

// We use a fresh APIRequestContext scoped to the test server so we don't go
// through the Vite proxy (which is only needed for cookie-based auth).
async function newServerContext() {
  return playwrightRequest.newContext({ baseURL: SERVER_URL });
}

// ---------------------------------------------------------------------------
// 1. Auth — X-Inbound-Token header
// ---------------------------------------------------------------------------

test.describe("Webhook auth — X-Inbound-Token", () => {
  test("should return 401 when the token header is missing", async () => {
    const ctx = await newServerContext();
    const res = await ctx.post(WEBHOOK_PATH, {
      data: validPayload(`missing-token-${uid()}@example.com`),
      failOnStatusCode: false,
    });
    expect(res.status()).toBe(401);
    await ctx.dispose();
  });

  test("should return 401 when the token header is wrong", async () => {
    const ctx = await newServerContext();
    const res = await ctx.post(WEBHOOK_PATH, {
      data: validPayload(`wrong-token-${uid()}@example.com`),
      headers: { "x-inbound-token": "this-is-not-the-right-secret" },
      failOnStatusCode: false,
    });
    expect(res.status()).toBe(401);
    await ctx.dispose();
  });

  test("should pass auth and return 2xx when the token is correct", async () => {
    const from = `correct-token-${uid()}@example.com`;
    const ctx = await newServerContext();
    const res = await ctx.post(WEBHOOK_PATH, {
      data: validPayload(from),
      headers: { "x-inbound-token": WEBHOOK_SECRET },
      failOnStatusCode: false,
    });
    expect(res.status()).toBeGreaterThanOrEqual(200);
    expect(res.status()).toBeLessThan(300);

    // Cleanup: remove the ticket created by the passing auth check
    const body = await res.json();
    if (body.ticket?.id) deleteTickets([body.ticket.id]);

    await ctx.dispose();
  });
});

// ---------------------------------------------------------------------------
// 2. Validation — inboundEmailSchema
// ---------------------------------------------------------------------------

test.describe("Webhook validation", () => {
  test("should return 400 when `from` is not a valid email", async () => {
    const ctx = await newServerContext();
    const res = await ctx.post(WEBHOOK_PATH, {
      data: { from: "not-an-email", text: "body" },
      headers: { "x-inbound-token": WEBHOOK_SECRET },
      failOnStatusCode: false,
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.issues).toBeDefined();
    await ctx.dispose();
  });

  test("should return 400 when `text` is missing", async () => {
    const ctx = await newServerContext();
    const res = await ctx.post(WEBHOOK_PATH, {
      data: { from: `no-text-${uid()}@example.com` },
      headers: { "x-inbound-token": WEBHOOK_SECRET },
      failOnStatusCode: false,
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.issues).toBeDefined();
    await ctx.dispose();
  });

  test("should return 400 when `category` is not a recognised value", async () => {
    const ctx = await newServerContext();
    const res = await ctx.post(WEBHOOK_PATH, {
      data: validPayload(`bad-category-${uid()}@example.com`, {
        category: "unknown_category",
      }),
      headers: { "x-inbound-token": WEBHOOK_SECRET },
      failOnStatusCode: false,
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.issues).toBeDefined();
    await ctx.dispose();
  });

  test("should accept all valid category values", async () => {
    const categories = ["general_question", "technical_question", "refund_request"];
    for (const category of categories) {
      const ctx = await newServerContext();
      const from = `category-${category.replace("_", "-")}-${uid()}@example.com`;
      const res = await ctx.post(WEBHOOK_PATH, {
        data: validPayload(from, { category }),
        headers: { "x-inbound-token": WEBHOOK_SECRET },
        failOnStatusCode: false,
      });
      expect(res.status()).toBe(201);
      const body = await res.json();
      deleteTickets([body.ticket.id]);
      await ctx.dispose();
    }
  });
});

// ---------------------------------------------------------------------------
// 3. Ticket creation — 201 with shape check
// ---------------------------------------------------------------------------

test.describe("Webhook ticket creation", () => {
  test("should return 201 with the ticket shape when the payload is valid", async () => {
    const from = `create-ticket-${uid()}@example.com`;
    const ctx = await newServerContext();
    const res = await ctx.post(WEBHOOK_PATH, {
      data: validPayload(from, { category: "technical_question" }),
      headers: { "x-inbound-token": WEBHOOK_SECRET },
      failOnStatusCode: false,
    });

    expect(res.status()).toBe(201);

    const body = await res.json();
    const ticket = body.ticket;
    expect(ticket).toBeDefined();
    expect(typeof ticket.id).toBe("number");
    expect(typeof ticket.subject).toBe("string");
    expect(ticket.fromEmail).toBe(from);
    expect(ticket.category).toBe("technical_question");
    expect(ticket.status).toBe("open");
    expect(typeof ticket.createdAt).toBe("string");

    deleteTickets([ticket.id]);
    await ctx.dispose();
  });
});

// ---------------------------------------------------------------------------
// 4. Auto-responder filter
// ---------------------------------------------------------------------------

test.describe("Webhook auto-responder filter", () => {
  test("should return 202 accepted:false when autoSubmitted is set to a non-'no' value", async () => {
    const ctx = await newServerContext();
    const res = await ctx.post(WEBHOOK_PATH, {
      data: validPayload(`auto-sub-${uid()}@example.com`, {
        autoSubmitted: "auto-replied",
      }),
      headers: { "x-inbound-token": WEBHOOK_SECRET },
      failOnStatusCode: false,
    });

    expect(res.status()).toBe(202);
    const body = await res.json();
    expect(body.accepted).toBe(false);
    expect(body.reason).toBe("auto-submitted");
    await ctx.dispose();
  });

  test("should NOT filter when autoSubmitted is 'no'", async () => {
    const from = `auto-no-${uid()}@example.com`;
    const ctx = await newServerContext();
    const res = await ctx.post(WEBHOOK_PATH, {
      data: validPayload(from, { autoSubmitted: "no" }),
      headers: { "x-inbound-token": WEBHOOK_SECRET },
      failOnStatusCode: false,
    });

    expect(res.status()).toBe(201);
    const body = await res.json();
    deleteTickets([body.ticket.id]);
    await ctx.dispose();
  });

  test("should return 202 accepted:false when precedence is 'bulk'", async () => {
    const ctx = await newServerContext();
    const res = await ctx.post(WEBHOOK_PATH, {
      data: validPayload(`prec-bulk-${uid()}@example.com`, {
        precedence: "bulk",
      }),
      headers: { "x-inbound-token": WEBHOOK_SECRET },
      failOnStatusCode: false,
    });

    expect(res.status()).toBe(202);
    const body = await res.json();
    expect(body.accepted).toBe(false);
    expect(body.reason).toBe("bulk-precedence");
    await ctx.dispose();
  });

  test("should return 202 accepted:false when precedence is 'list'", async () => {
    const ctx = await newServerContext();
    const res = await ctx.post(WEBHOOK_PATH, {
      data: validPayload(`prec-list-${uid()}@example.com`, {
        precedence: "list",
      }),
      headers: { "x-inbound-token": WEBHOOK_SECRET },
      failOnStatusCode: false,
    });

    expect(res.status()).toBe(202);
    const body = await res.json();
    expect(body.accepted).toBe(false);
    expect(body.reason).toBe("bulk-precedence");
    await ctx.dispose();
  });

  test("should return 202 accepted:false when precedence is 'junk'", async () => {
    const ctx = await newServerContext();
    const res = await ctx.post(WEBHOOK_PATH, {
      data: validPayload(`prec-junk-${uid()}@example.com`, {
        precedence: "junk",
      }),
      headers: { "x-inbound-token": WEBHOOK_SECRET },
      failOnStatusCode: false,
    });

    expect(res.status()).toBe(202);
    const body = await res.json();
    expect(body.accepted).toBe(false);
    expect(body.reason).toBe("bulk-precedence");
    await ctx.dispose();
  });
});

// ---------------------------------------------------------------------------
// 5. Subject handling
// ---------------------------------------------------------------------------

test.describe("Webhook subject handling", () => {
  test("should use '(no subject)' when subject is empty", async () => {
    const from = `no-subj-empty-${uid()}@example.com`;
    const ctx = await newServerContext();
    const res = await ctx.post(WEBHOOK_PATH, {
      data: { from, text: "body", subject: "" },
      headers: { "x-inbound-token": WEBHOOK_SECRET },
      failOnStatusCode: false,
    });

    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.ticket.subject).toBe("(no subject)");
    deleteTickets([body.ticket.id]);
    await ctx.dispose();
  });

  test("should use '(no subject)' when subject is whitespace-only", async () => {
    const from = `no-subj-ws-${uid()}@example.com`;
    const ctx = await newServerContext();
    const res = await ctx.post(WEBHOOK_PATH, {
      data: { from, text: "body", subject: "   " },
      headers: { "x-inbound-token": WEBHOOK_SECRET },
      failOnStatusCode: false,
    });

    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.ticket.subject).toBe("(no subject)");
    deleteTickets([body.ticket.id]);
    await ctx.dispose();
  });

  test("should strip a leading 'Re:' prefix from the subject", async () => {
    const from = `strip-re-${uid()}@example.com`;
    const ctx = await newServerContext();
    const res = await ctx.post(WEBHOOK_PATH, {
      data: { from, text: "body", subject: "Re: My original subject" },
      headers: { "x-inbound-token": WEBHOOK_SECRET },
      failOnStatusCode: false,
    });

    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.ticket.subject).toBe("My original subject");
    deleteTickets([body.ticket.id]);
    await ctx.dispose();
  });

  test("should strip a leading 'Fwd:' prefix from the subject", async () => {
    const from = `strip-fwd-${uid()}@example.com`;
    const ctx = await newServerContext();
    const res = await ctx.post(WEBHOOK_PATH, {
      data: { from, text: "body", subject: "Fwd: My original subject" },
      headers: { "x-inbound-token": WEBHOOK_SECRET },
      failOnStatusCode: false,
    });

    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.ticket.subject).toBe("My original subject");
    deleteTickets([body.ticket.id]);
    await ctx.dispose();
  });

  test("should strip a leading 'FW:' prefix from the subject", async () => {
    const from = `strip-fw-${uid()}@example.com`;
    const ctx = await newServerContext();
    const res = await ctx.post(WEBHOOK_PATH, {
      data: { from, text: "body", subject: "FW: My original subject" },
      headers: { "x-inbound-token": WEBHOOK_SECRET },
      failOnStatusCode: false,
    });

    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.ticket.subject).toBe("My original subject");
    deleteTickets([body.ticket.id]);
    await ctx.dispose();
  });

  test("should strip a leading 'Forward:' prefix from the subject", async () => {
    const from = `strip-forward-${uid()}@example.com`;
    const ctx = await newServerContext();
    const res = await ctx.post(WEBHOOK_PATH, {
      data: { from, text: "body", subject: "Forward: My original subject" },
      headers: { "x-inbound-token": WEBHOOK_SECRET },
      failOnStatusCode: false,
    });

    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.ticket.subject).toBe("My original subject");
    deleteTickets([body.ticket.id]);
    await ctx.dispose();
  });

  test("should strip repeated prefixes (e.g. 'Re: Re: subject')", async () => {
    const from = `strip-re-re-${uid()}@example.com`;
    const ctx = await newServerContext();
    const res = await ctx.post(WEBHOOK_PATH, {
      data: { from, text: "body", subject: "Re: Re: Fwd: My original subject" },
      headers: { "x-inbound-token": WEBHOOK_SECRET },
      failOnStatusCode: false,
    });

    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.ticket.subject).toBe("My original subject");
    deleteTickets([body.ticket.id]);
    await ctx.dispose();
  });

  test("should strip prefixes case-insensitively", async () => {
    const from = `strip-re-ci-${uid()}@example.com`;
    const ctx = await newServerContext();
    const res = await ctx.post(WEBHOOK_PATH, {
      data: { from, text: "body", subject: "RE: My original subject" },
      headers: { "x-inbound-token": WEBHOOK_SECRET },
      failOnStatusCode: false,
    });

    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.ticket.subject).toBe("My original subject");
    deleteTickets([body.ticket.id]);
    await ctx.dispose();
  });
});

// ---------------------------------------------------------------------------
// 6. Deduplication
// ---------------------------------------------------------------------------

test.describe("Webhook deduplication", () => {
  test("should return 200 with the existing ticket when an open ticket with the same normalized subject + sender exists", async () => {
    const from = `dedup-${uid()}@example.com`;
    const ctx = await newServerContext();
    const payload = validPayload(from, { subject: "Help with billing" });
    const headers = { "x-inbound-token": WEBHOOK_SECRET };

    // First call → creates a new ticket
    const first = await ctx.post(WEBHOOK_PATH, {
      data: payload,
      headers,
      failOnStatusCode: false,
    });
    expect(first.status()).toBe(201);
    const firstBody = await first.json();
    const originalId = firstBody.ticket.id;

    // Second call with identical payload → deduplicates
    const second = await ctx.post(WEBHOOK_PATH, {
      data: payload,
      headers,
      failOnStatusCode: false,
    });
    expect(second.status()).toBe(200);
    const secondBody = await second.json();
    // Must return the same ticket, not a new one
    expect(secondBody.ticket.id).toBe(originalId);

    deleteTickets([originalId]);
    await ctx.dispose();
  });

  test("should match sender case-insensitively for deduplication", async () => {
    const base = `dedup-ci-${uid()}`;
    const fromLower = `${base}@example.com`;
    const fromUpper = `${base.toUpperCase()}@EXAMPLE.COM`;
    const ctx = await newServerContext();
    const headers = { "x-inbound-token": WEBHOOK_SECRET };

    // First call with lowercase from
    const first = await ctx.post(WEBHOOK_PATH, {
      data: validPayload(fromLower, { subject: "Billing question" }),
      headers,
      failOnStatusCode: false,
    });
    expect(first.status()).toBe(201);
    const originalId = (await first.json()).ticket.id;

    // Second call with uppercase from → should deduplicate
    const second = await ctx.post(WEBHOOK_PATH, {
      data: validPayload(fromUpper, { subject: "Billing question" }),
      headers,
      failOnStatusCode: false,
    });
    expect(second.status()).toBe(200);
    expect((await second.json()).ticket.id).toBe(originalId);

    deleteTickets([originalId]);
    await ctx.dispose();
  });

  test("should deduplicate after stripping Re:/Fwd: prefixes from the subject", async () => {
    const from = `dedup-prefix-${uid()}@example.com`;
    const ctx = await newServerContext();
    const headers = { "x-inbound-token": WEBHOOK_SECRET };

    // First call — plain subject
    const first = await ctx.post(WEBHOOK_PATH, {
      data: validPayload(from, { subject: "Account access issue" }),
      headers,
      failOnStatusCode: false,
    });
    expect(first.status()).toBe(201);
    const originalId = (await first.json()).ticket.id;

    // Second call — Re: prefix on same subject
    const second = await ctx.post(WEBHOOK_PATH, {
      data: validPayload(from, { subject: "Re: Account access issue" }),
      headers,
      failOnStatusCode: false,
    });
    expect(second.status()).toBe(200);
    expect((await second.json()).ticket.id).toBe(originalId);

    deleteTickets([originalId]);
    await ctx.dispose();
  });

  test("should create a new ticket after the open ticket is closed", async () => {
    const from = `dedup-close-${uid()}@example.com`;
    const ctx = await newServerContext();
    const payload = validPayload(from, { subject: "Shipping delay" });
    const headers = { "x-inbound-token": WEBHOOK_SECRET };

    // Create the initial open ticket
    const first = await ctx.post(WEBHOOK_PATH, {
      data: payload,
      headers,
      failOnStatusCode: false,
    });
    expect(first.status()).toBe(201);
    const firstId = (await first.json()).ticket.id;

    // Close the ticket directly in the test DB
    closeTicket(firstId);

    // Same payload again — should now create a new ticket (not deduplicate)
    const second = await ctx.post(WEBHOOK_PATH, {
      data: payload,
      headers,
      failOnStatusCode: false,
    });
    expect(second.status()).toBe(201);
    const secondId = (await second.json()).ticket.id;
    expect(secondId).not.toBe(firstId);

    deleteTickets([firstId, secondId]);
    await ctx.dispose();
  });
});
