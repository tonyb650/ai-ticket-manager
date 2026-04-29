# E2E Tests

Playwright end-to-end tests for the helpdesk app, isolated from dev data via a dedicated test database.

## Stack

| Component | Dev port | Test port |
|---|---|---|
| Postgres | 5432 | 5433 |
| Server | 3030 | 3031 |
| Client | 5173 | 5174 |

The test stack runs side-by-side with dev, so you can keep `bun run dev:client` / `bun run dev:server` running while tests execute.

## First-time setup

```bash
bun install
bun run --filter e2e install:browsers
```

## Running tests

From the repo root:

```bash
bun run db:test:up      # start the test Postgres container
bun run test:e2e        # runs migrations + seed via globalSetup, then Playwright
```

Playwright's `webServer` config starts the test server (port 3031) and test client (port 5174) automatically using `e2e/.env.test`.

## Resetting the test DB

The test volume is wiped fast — drop and recreate:

```bash
bun run db:test:down
bun run db:test:up
```

## Files

- `playwright.config.ts` — webServer + base URL configuration
- `global-setup.ts` — runs `prisma migrate deploy` and the seed script against the test DB before any test runs
- `.env.test` — committed test-only env (no real secrets); loaded by both `globalSetup` and the server's `--env-file` flag
- `tests/` — spec files live here
