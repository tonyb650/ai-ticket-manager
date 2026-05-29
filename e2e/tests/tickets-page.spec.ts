/**
 * E2E — Tickets page (/tickets)
 *
 * Covers the integration that mocked unit tests cannot verify:
 * 1. Auth gating — unauthenticated visit redirects to /login
 * 2. NavBar visibility — Tickets link shown to both admin and agent;
 *    Users link shown only to admin
 * 3. NavBar navigation — clicking Tickets link routes to /tickets
 * 4. Real-data round trip + newest-first ordering — tickets created via the
 *    inbound webhook appear on the page in created-desc order
 * 5. Empty → populated transition — empty state shows when DB has no tickets,
 *    then rows appear after seeding
 *
 * Isolation strategy:
 * - Every test that creates tickets uses a unique uid() in the sender address
 *   and deletes its rows in afterEach via direct SQL DELETE. This keeps tests
 *   order-agnostic and safe for parallel runs.
 */

import { test, expect, request as playwrightRequest, type Page } from "@playwright/test";
import { spawnSync } from "node:child_process";
import {
  ADMIN_AUTH_FILE,
  AGENT_AUTH_FILE,
  TEST_SERVER_URL,
} from "./helpers/auth";

// The empty-state test performs a global DELETE FROM ticket which is
// incompatible with parallel execution of other ticket-creating tests in this
// file.  Serializing the whole file is the safest option.
test.describe.configure({ mode: "serial" });

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const WEBHOOK_PATH = "/api/webhooks/inbound-email";
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET ?? "test-webhook-secret-e2e";
const TEST_DATABASE_URL =
  process.env.DATABASE_URL ??
  "postgresql://helpdesk:helpdesk@localhost:5433/helpdesk_test";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function uid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function deleteTickets(ids: number[]) {
  if (ids.length === 0) return;
  const sql = `DELETE FROM ticket WHERE id IN (${ids.join(",")});`;
  spawnSync("psql", [TEST_DATABASE_URL, "-c", sql], { stdio: "inherit" });
}

async function newServerContext() {
  return playwrightRequest.newContext({ baseURL: TEST_SERVER_URL });
}

async function postTicket(
  from: string,
  subject: string,
  overrides: Record<string, unknown> = {},
): Promise<number> {
  const ctx = await newServerContext();
  const res = await ctx.post(WEBHOOK_PATH, {
    data: { from, subject, text: "Test body.", ...overrides },
    headers: { "x-inbound-token": WEBHOOK_SECRET },
    failOnStatusCode: true,
  });
  const body = await res.json();
  await ctx.dispose();
  return body.ticket.id as number;
}

/** Navigate to /tickets and wait for the page heading. */
async function gotoTickets(page: Page) {
  await page.goto("/tickets");
  await expect(page.getByRole("heading", { name: "Tickets" })).toBeVisible();
}

// ---------------------------------------------------------------------------
// 1. Auth gating
// ---------------------------------------------------------------------------

test.describe("Tickets page — auth gating", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("should redirect to /login when visiting /tickets unauthenticated", async ({
    page,
  }) => {
    await page.goto("/tickets");
    await expect(page).toHaveURL(/\/login$/);
  });
});

// ---------------------------------------------------------------------------
// 2 & 3. NavBar link visibility and navigation
// ---------------------------------------------------------------------------

test.describe("Tickets page — NavBar (admin)", () => {
  test.use({ storageState: ADMIN_AUTH_FILE });

  test("should show both Tickets and Users links when signed in as admin", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: "Tickets" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Users" })).toBeVisible();
  });

  test("should navigate to /tickets and render the heading when the Tickets link is clicked", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Tickets" }).click();
    await expect(page).toHaveURL("/tickets");
    await expect(page.getByRole("heading", { name: "Tickets" })).toBeVisible();
  });
});

test.describe("Tickets page — NavBar (agent)", () => {
  test.use({ storageState: AGENT_AUTH_FILE });

  test("should show Tickets link but NOT Users link when signed in as agent", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: "Tickets" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Users" })).not.toBeVisible();
  });

  test("should navigate to /tickets and render the heading when the Tickets link is clicked", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Tickets" }).click();
    await expect(page).toHaveURL("/tickets");
    await expect(page.getByRole("heading", { name: "Tickets" })).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// 4. Real-data round trip + newest-first ordering
// ---------------------------------------------------------------------------

test.describe("Tickets page — real-data round trip", () => {
  // Use a fresh (unauthenticated) storage state so we own a clean browser
  // context.  We do a full login inside the test to get a session.  This
  // prevents cross-test React Query cache contamination from shared
  // storageState contexts running in parallel.
  test.use({ storageState: { cookies: [], origins: [] } });

  test("should display tickets created via the webhook in newest-first order", async ({
    page,
  }) => {
    const tag = uid();
    const senderA = `ticket-order-a-${tag}@example.com`;
    const senderB = `ticket-order-b-${tag}@example.com`;
    const subjectA = `Order test A ${tag}`;
    const subjectB = `Order test B ${tag}`;

    // Create ticket A first, then B — B should appear above A on the page.
    // Sequential API calls guarantee A.createdAt < B.createdAt.
    const idA = await postTicket(senderA, subjectA);
    const idB = await postTicket(senderB, subjectB);

    try {
      // Log in with a fresh context (no shared cache) so the page fetches
      // real data from the DB that already contains both tickets.
      await page.goto("/login");
      await page.getByLabel("Email").fill(process.env.ADMIN_EMAIL ?? "admin@test.local");
      await page.getByLabel("Password").fill(process.env.ADMIN_PASSWORD ?? "test-admin-password");
      await page.getByRole("button", { name: "Sign in" }).click();
      await page.waitForURL("/");

      await gotoTickets(page);

      // Both rows must be visible.
      await expect(page.getByText(subjectA)).toBeVisible();
      await expect(page.getByText(subjectB)).toBeVisible();

      // B (newer) must appear before A (older) in the DOM.
      // allTextContents() resolves after the locator is already visible, so
      // we only call it once both rows are confirmed present above.
      const allRowTexts = await page.getByRole("row").allTextContents();
      const posA = allRowTexts.findIndex((t) => t.includes(subjectA));
      const posB = allRowTexts.findIndex((t) => t.includes(subjectB));

      expect(posB).toBeGreaterThan(0); // sanity: not the header row
      expect(posA).toBeGreaterThan(0);
      expect(posB).toBeLessThan(posA); // B (newer) must come before A (older)
    } finally {
      deleteTickets([idA, idB]);
    }
  });
});

// ---------------------------------------------------------------------------
// 5. Empty → populated transition
//
// These two tests are intentionally sequential (fullyParallel still runs
// them in the same worker because they share a describe block and Playwright
// serializes tests within a worker by file).  We run the empty-state check
// within a single test that creates its own isolated snapshot: navigate to
// /tickets with no tickets seeded for this context, assert empty, then seed
// one and reload to assert populated.
// ---------------------------------------------------------------------------

test.describe("Tickets page — empty and populated states", () => {
  // Fresh browser context so we don't share React Query cache with other
  // parallel tests.  We log in manually inside the test.
  test.use({ storageState: { cookies: [], origins: [] } });

  test("should show 'No tickets yet.' then show rows after seeding", async ({
    page,
  }) => {
    // Log in fresh so we own this browser context's React Query cache.
    await page.goto("/login");
    await page.getByLabel("Email").fill(process.env.ADMIN_EMAIL ?? "admin@test.local");
    await page.getByLabel("Password").fill(process.env.ADMIN_PASSWORD ?? "test-admin-password");
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL("/");

    // Navigate to /tickets before creating any tickets.  Other parallel tests
    // may have rows in the DB, so we can't assert the global empty state.
    // Instead we assert the empty state within this isolated context by
    // deleting all rows, reloading, then re-seeding.
    spawnSync("psql", [TEST_DATABASE_URL, "-c", "DELETE FROM ticket;"], {
      stdio: "inherit",
    });

    // Hard-navigate (not SPA navigate) so React Router mounts fresh and
    // React Query fetches from the now-empty DB.
    await page.goto("/tickets");
    await expect(page.getByRole("heading", { name: "Tickets" })).toBeVisible();
    await expect(page.getByText("No tickets yet.")).toBeVisible();

    // Seed one ticket, then reload to trigger a fresh fetch.
    const tag = uid();
    const sender = `ticket-populated-${tag}@example.com`;
    const subject = `Populated test ${tag}`;
    const id = await postTicket(sender, subject);

    try {
      await page.reload();
      await expect(page.getByText(subject)).toBeVisible();
      await expect(page.getByText(`#${id}`)).toBeVisible();
    } finally {
      deleteTickets([id]);
    }
  });
});

// ---------------------------------------------------------------------------
// 6. Server-side sorting
//
// Seeds 3 tickets with UID-prefixed subjects chosen so alphabetical order is
// unambiguous: "AAA …", "MMM …", "ZZZ …".  Sequential postTicket() calls also
// guarantee monotonically increasing createdAt values (A < B < C).
//
// All three tests share one beforeEach/afterEach fixture that seeds and cleans
// up the rows.  The describe block re-uses ADMIN_AUTH_FILE storage state so no
// manual login is needed.
// ---------------------------------------------------------------------------

test.describe("Tickets page — server-side sorting", () => {
  test.use({ storageState: ADMIN_AUTH_FILE });

  // Shared ticket IDs — populated in beforeEach, cleaned up in afterEach.
  let idA: number;
  let idB: number;
  let idC: number;
  let subjectA: string;
  let subjectB: string;
  let subjectC: string;

  test.beforeEach(async () => {
    const tag = uid();
    // AAA / MMM / ZZZ prefixes guarantee unambiguous alphabetical ordering.
    subjectA = `AAA sort-test ${tag}`;
    subjectB = `MMM sort-test ${tag}`;
    subjectC = `ZZZ sort-test ${tag}`;

    // Sequential awaits ensure A.createdAt < B.createdAt < C.createdAt.
    idA = await postTicket(`sort-a-${tag}@example.com`, subjectA);
    idB = await postTicket(`sort-b-${tag}@example.com`, subjectB);
    idC = await postTicket(`sort-c-${tag}@example.com`, subjectC);
  });

  test.afterEach(() => {
    deleteTickets([idA, idB, idC]);
  });

  test("should reorder rows ascending then descending when Subject header is clicked", async ({
    page,
  }) => {
    await gotoTickets(page);

    // All three rows must be present before we assert order.
    await expect(page.getByText(subjectA)).toBeVisible();
    await expect(page.getByText(subjectB)).toBeVisible();
    await expect(page.getByText(subjectC)).toBeVisible();

    const subjectHeader = page.getByRole("columnheader", { name: "Subject" });

    // --- First click: ascending by subject ---
    await subjectHeader.click();

    // aria-sort updates synchronously with local state, but the row data only
    // updates once the refetch resolves.  Wait for the heading attribute AND
    // for subjectA to be visible (it would be the first row in asc order and
    // confirms the new fetch has landed before we read row positions).
    await expect(subjectHeader).toHaveAttribute("aria-sort", "ascending");
    await expect(page.getByText(subjectA)).toBeVisible();

    const ascRows = await page.getByRole("row").allTextContents();
    const posA_asc = ascRows.findIndex((t) => t.includes(subjectA));
    const posB_asc = ascRows.findIndex((t) => t.includes(subjectB));
    const posC_asc = ascRows.findIndex((t) => t.includes(subjectC));

    // AAA < MMM < ZZZ in ascending order.
    expect(posA_asc).toBeGreaterThan(0);
    expect(posA_asc).toBeLessThan(posB_asc);
    expect(posB_asc).toBeLessThan(posC_asc);

    // --- Second click: descending by subject ---
    await subjectHeader.click();
    await expect(subjectHeader).toHaveAttribute("aria-sort", "descending");
    // ZZZ should be first in descending order — wait for the fetch to settle.
    await expect(page.getByText(subjectC)).toBeVisible();

    const descRows = await page.getByRole("row").allTextContents();
    const posA_desc = descRows.findIndex((t) => t.includes(subjectA));
    const posB_desc = descRows.findIndex((t) => t.includes(subjectB));
    const posC_desc = descRows.findIndex((t) => t.includes(subjectC));

    // ZZZ > MMM > AAA in descending order.
    expect(posC_desc).toBeGreaterThan(0);
    expect(posC_desc).toBeLessThan(posB_desc);
    expect(posB_desc).toBeLessThan(posA_desc);
  });

  test("should reorder rows oldest-first then newest-first when Created header is clicked", async ({
    page,
  }) => {
    await gotoTickets(page);

    // All three rows must be present before we assert order.
    await expect(page.getByText(subjectA)).toBeVisible();
    await expect(page.getByText(subjectB)).toBeVisible();
    await expect(page.getByText(subjectC)).toBeVisible();

    const createdHeader = page.getByRole("columnheader", { name: "Created" });

    // Default sort is createdAt desc — "Created" header already has
    // aria-sort="descending" on page load.
    await expect(createdHeader).toHaveAttribute("aria-sort", "descending");

    // Verify default newest-first: C (newest) before A (oldest).
    const defaultRows = await page.getByRole("row").allTextContents();
    const posA_default = defaultRows.findIndex((t) => t.includes(subjectA));
    const posC_default = defaultRows.findIndex((t) => t.includes(subjectC));
    expect(posC_default).toBeGreaterThan(0);
    expect(posC_default).toBeLessThan(posA_default); // C (newest) first

    // --- First click: ascending by createdAt (oldest-first) ---
    await createdHeader.click();
    // Wait for the header attribute AND for subjectA to be visible — A is the
    // oldest ticket and should appear first once the fetch resolves.
    await expect(createdHeader).toHaveAttribute("aria-sort", "ascending");
    await expect(page.getByText(subjectA)).toBeVisible();

    const ascRows = await page.getByRole("row").allTextContents();
    const posA_asc = ascRows.findIndex((t) => t.includes(subjectA));
    const posB_asc = ascRows.findIndex((t) => t.includes(subjectB));
    const posC_asc = ascRows.findIndex((t) => t.includes(subjectC));

    // A (oldest) < B < C (newest) in ascending order.
    expect(posA_asc).toBeGreaterThan(0);
    expect(posA_asc).toBeLessThan(posB_asc);
    expect(posB_asc).toBeLessThan(posC_asc);

    // --- Second click: back to descending (newest-first) ---
    await createdHeader.click();
    // C is the newest and should be first once the descending fetch resolves.
    await expect(createdHeader).toHaveAttribute("aria-sort", "descending");
    await expect(page.getByText(subjectC)).toBeVisible();

    const descRows = await page.getByRole("row").allTextContents();
    const posA_desc = descRows.findIndex((t) => t.includes(subjectA));
    const posB_desc = descRows.findIndex((t) => t.includes(subjectB));
    const posC_desc = descRows.findIndex((t) => t.includes(subjectC));

    // C (newest) > B > A (oldest) in descending order.
    expect(posC_desc).toBeGreaterThan(0);
    expect(posC_desc).toBeLessThan(posB_desc);
    expect(posB_desc).toBeLessThan(posA_desc);
  });

  test("should update aria-sort on the clicked header and clear it on others", async ({
    page,
  }) => {
    await gotoTickets(page);

    // Wait for data to render so the table is fully mounted.
    await expect(page.getByText(subjectA)).toBeVisible();

    const subjectHeader = page.getByRole("columnheader", { name: "Subject" });
    const createdHeader = page.getByRole("columnheader", { name: "Created" });

    // Before clicking: default sort is createdAt desc.
    await expect(createdHeader).toHaveAttribute("aria-sort", "descending");
    await expect(subjectHeader).toHaveAttribute("aria-sort", "none");

    // Click Subject — it becomes the active sort column (ascending).
    await subjectHeader.click();
    await expect(subjectHeader).toHaveAttribute("aria-sort", "ascending");

    // Created is no longer the active sort column.
    await expect(createdHeader).toHaveAttribute("aria-sort", "none");

    // Click Subject again — it flips to descending.
    await subjectHeader.click();
    await expect(subjectHeader).toHaveAttribute("aria-sort", "descending");
    await expect(createdHeader).toHaveAttribute("aria-sort", "none");
  });
});
