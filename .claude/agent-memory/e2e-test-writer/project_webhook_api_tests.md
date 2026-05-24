---
name: project-webhook-api-tests
description: Conventions established when writing API-only (no browser) Playwright e2e tests for the inbound-email webhook
metadata:
  type: project
---

API-only webhook tests hit the test server directly at `http://localhost:3031` via `playwrightRequest.newContext({ baseURL: SERVER_URL })`, bypassing the Vite proxy. The Vite proxy is only needed when cookie-based auth is required.

**WEBHOOK_SECRET** must be present in `e2e/.env.test` (added as `test-webhook-secret-e2e`). It is read by the test server via `process.env.WEBHOOK_SECRET`.

**DB cleanup** for webhook tests: there is no delete-ticket API, so cleanup uses `spawnSync("psql", [DATABASE_URL, "-c", sql])` with a raw SQL DELETE/UPDATE. `psql` is available at `/opt/homebrew/opt/libpq/bin/psql`. Track created ticket IDs per test and clean up in-test (not beforeEach/afterEach) to keep tests fully independent.

**Unique from emails** using `uid()` isolate deduplication-sensitive tests from each other across parallel workers without requiring table truncation.

**No `core` package import in e2e tests** — the e2e package.json does not list `core` as a dependency. Use string literals (`"general_question"`, `"open"`, etc.) directly.

**Why:** API-only tests for webhooks don't need a browser at all; the `request` fixture handles them cleanly.

**How to apply:** For any future route that is not UI-facing (webhooks, background job triggers, admin APIs), prefer this pattern: `playwrightRequest.newContext` pointed at the test server, SQL-based cleanup for rows with no REST delete endpoint.
