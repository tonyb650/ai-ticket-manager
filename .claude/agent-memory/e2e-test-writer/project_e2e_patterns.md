---
name: e2e-patterns
description: Project-specific e2e test patterns, conventions, and known gotchas for the helpdesk monorepo
metadata:
  type: project
---

## Auth setup

- `e2e/tests/auth.setup.ts` logs in as admin and agent, saves to `.auth/admin.json` and `.auth/agent.json`
- Reuse via `test.use({ storageState: ADMIN_AUTH_FILE })` (import from `helpers/auth.ts`)
- For tests that call `logout()` mid-test or need cache isolation, use a fresh context: `test.use({ storageState: { cookies: [], origins: [] } })` and log in manually with `loginAs(page, email, password)`

## Helper exports (`e2e/tests/helpers/auth.ts`)

Exports: `ADMIN_AUTH_FILE`, `AGENT_AUTH_FILE`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `AGENT_EMAIL`, `AGENT_PASSWORD`, `TEST_SERVER_URL`, `logout(page)`, `loginAs(page, email, password)`

## DB cleanup pattern

- No delete-ticket REST endpoint exists; use `spawnSync("psql", [TEST_DATABASE_URL, "-c", sql], { stdio: "inherit" })`
- `TEST_DATABASE_URL` defaults to `postgresql://helpdesk:helpdesk@localhost:5433/helpdesk_test`
- Always delete by specific IDs to avoid clobbering parallel tests' rows

## Global DELETE caveat (tickets)

Global `DELETE FROM ticket` is racy with parallel workers. If a test requires it:
1. Add `test.describe.configure({ mode: "serial" })` at the top of the file to serialize all tests in the file
2. Use a fresh browser context (not shared storageState) so React Query cache is isolated
3. Hard-navigate (`page.goto("/tickets")`) rather than SPA-navigate to force a fresh fetch after DB mutation

## React Query cache isolation

- TanStack Query's default stale time is 0; a `page.goto(url)` from a different URL triggers a refetch
- BUT if two tests share a storageState file, they may share a browser context and thus share React Query cache
- For tests that read data that other concurrent tests are mutating, use `test.use({ storageState: { cookies: [], origins: [] } })` and log in fresh — this gives an isolated browser context with its own cache

## fullyParallel: true behavior

- `playwright.config.ts` has `fullyParallel: true` — tests within the same *file* also run in parallel across workers (not just across files)
- Use `test.describe.configure({ mode: "serial" })` at the file level when tests within the file share mutable global state (like a DB table)

## Inbound webhook helper pattern

```ts
async function postTicket(from, subject, overrides = {}): Promise<number> {
  const ctx = await playwrightRequest.newContext({ baseURL: TEST_SERVER_URL });
  const res = await ctx.post(WEBHOOK_PATH, {
    data: { from, subject, text: "Test body.", ...overrides },
    headers: { "x-inbound-token": WEBHOOK_SECRET },
    failOnStatusCode: true,
  });
  const body = await res.json();
  await ctx.dispose();
  return body.ticket.id;
}
```

`WEBHOOK_SECRET=test-webhook-secret-e2e` from `e2e/.env.test`.

## Port map (test stack)

| Component | Port |
|-----------|------|
| Client (Vite) | 5174 |
| Server (Express) | 3031 |
| Postgres | 5433 |

**Why:** test and dev stacks run side by side without conflict.
**How to apply:** use `http://localhost:3031` for direct API calls; `baseURL: http://localhost:5174` is set in `playwright.config.ts` for browser tests.
