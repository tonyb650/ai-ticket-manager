# Helpdesk

A helpdesk application with a React frontend and Express backend.

## Project structure

Bun workspace monorepo with three packages:

```
client/   React + Vite frontend
server/   Express + Prisma backend
e2e/      Playwright end-to-end tests
```

## Commands

Run from the repo root:

```bash
bun run dev:client     # Vite dev server at http://localhost:5173
bun run dev:server     # Express server at http://localhost:3030 (watch mode)
bun run test:client    # Run Vitest component tests (one-shot)
bun run test:e2e       # Run Playwright (boots test server + client on test ports)
bun run db:test:up     # Start the test Postgres container (port 5433)
bun run db:test:down   # Stop and wipe the test Postgres volume
```

Run from `server/`:

```bash
bun run db:migrate         # Run Prisma migrations against the dev DB
bun run db:generate        # Regenerate Prisma client after schema changes
bun run db:seed            # Seed admin user (reads ADMIN_EMAIL / ADMIN_PASSWORD from .env)
bun run db:studio          # Open Prisma Studio
bun run db:migrate:test    # Apply migrations to the test DB (uses e2e/.env.test)
bun run db:seed:test       # Seed test admin user into the test DB
```

Run from `client/`:

```bash
bun run build          # Type-check + Vite build
bun run test           # Run component tests once (vitest run)
bun run test:watch     # Run component tests in watch mode
```

⚠️ `bun test` (no `run`) invokes Bun's built-in test runner, **not** Vitest, and ignores the `test` script. Always use `bun run test` (or `bunx vitest`).

## Infrastructure

PostgreSQL via Docker:

```bash
docker compose up -d                    # Start the dev database (port 5432)
docker compose --profile test up -d     # Also start the test database (port 5433)
```

Connections:
- Dev: `postgresql://helpdesk:helpdesk@localhost:5432/helpdesk`
- Test: `postgresql://helpdesk:helpdesk@localhost:5433/helpdesk_test`

The `db-test` service is gated behind the `test` Docker Compose profile so a default `docker compose up` only starts the dev DB.

## Test stack ports

The test stack uses different ports from dev so both can run side by side:

| Component | Dev | Test |
|---|---|---|
| Client | 5173 | 5174 |
| Server | 3030 | 3031 |
| Postgres | 5432 | 5433 |

## Environment

Copy `server/.env.example` to `server/.env` and fill in values before starting. Required vars:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Postgres connection string |
| `BETTER_AUTH_SECRET` | Secret for Better Auth session signing |
| `BETTER_AUTH_URL` | Server origin (e.g. `http://localhost:3030`) |
| `CLIENT_URL` | Frontend origin for CORS (e.g. `http://localhost:5173`) |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Credentials used by the seed script |
| `ANTHROPIC_API_KEY` | For future AI features |

## Tech stack

**Client:** React 19, React Router v7, Vite, Tailwind CSS v4, shadcn/ui (Nova preset, neutral base color), react-hook-form + Zod, Better Auth client, axios, TanStack Query v5

**Server:** Express v5, Better Auth, Prisma v7 (pg adapter), PostgreSQL 17, express-rate-limit

**Testing:** Vitest + React Testing Library + jsdom (component tests, in `client/`); Playwright (E2E, in `e2e/`)

**Tooling:** Bun (package manager + runtime), TypeScript

## Key conventions

### Client path alias
`@/` maps to `client/src/`. Use it for all internal imports (e.g. `@/components/ui/button`).

### Adding shadcn components
```bash
bunx --bun shadcn@latest add <component> -c client
```
Components land in `client/src/components/ui/`. The `-c client` flag is required because the project is a Bun workspace monorepo — running without it from the repo root errors out asking for a workspace.

### Client data fetching
- Use **axios** for HTTP requests, not `fetch`. It's already installed in `client/`.
- Wrap server reads in **TanStack Query** (`useQuery`) and writes in `useMutation`. The `QueryClient` is set up at the app root in `client/src/main.tsx`.
- Forward the `signal` from `queryFn` into the axios call so React Query can abort in-flight HTTP requests on unmount or refetch:
  ```ts
  useQuery({
    queryKey: ["users"],
    queryFn: ({ signal }) =>
      axios.get<{ users: User[] }>("/api/users", { signal }).then((r) => r.data.users),
  });
  ```
- Use relative `/api/...` URLs — Vite proxies `/api` to the server in dev (`client/vite.config.ts`), and Better Auth's session cookie is sent automatically as same-origin.
- Loading-state gate: prefer `isPending` for queries that always run; use `isLoading` (`isPending && isFetching`) when the query is conditional via `enabled`, otherwise the spinner stays up forever for a query that hasn't started.

### Auth
- Sign-up is disabled; users are created via the seed script or directly in the database.
- User roles: `admin` | `agent` (stored on the `User` model).
- The Better Auth handler must be mounted **before** `express.json()` — see `server/src/index.ts`.
- `requireAuth` middleware (`server/src/middleware/requireAuth.ts`) attaches `req.session` (typed via global augmentation).
- `requireAdmin` middleware (`server/src/middleware/requireAdmin.ts`) returns 403 if `req.session.user.role !== "admin"`. Use it as `app.get("/api/admin-thing", requireAuth, requireAdmin, handler)`. Always pair it with `requireAuth` first — it relies on `req.session` being populated.
- The client auth client is at `client/src/lib/authClient.ts`; import `useSession` from there.
- `role` is exposed on the client via `inferAdditionalFields` in `authClient.ts`. The field is declared manually (not imported from the server) because the client tsconfig only includes `client/src/`. If new fields are added to `additionalFields` in `server/src/lib/auth.ts`, update `authClient.ts` to match.
- Route protection: `ProtectedRoute` redirects unauthenticated users to `/login`; `AdminRoute` redirects unauthenticated users to `/login` and authenticated non-admins to `/`. Server-side enforcement (`requireAdmin`) is the source of truth — `AdminRoute` is UX only.
- Cookie attributes are set explicitly in `server/src/lib/auth.ts` (`advanced.defaultCookieAttributes`): `httpOnly: true`, `sameSite: "lax"`, `secure: true` only when `NODE_ENV === "production"`.
- Rate limiting on `/api/auth/*` is **production-only** (`server/src/index.ts`). Dev and test runs skip the limiter so login flows aren't throttled during E2E tests.
- Production startup guards (`server/src/index.ts`) reject a missing/default/short `BETTER_AUTH_SECRET` and a non-HTTPS `BETTER_AUTH_URL`. They're inactive when `NODE_ENV !== "production"`.

### Database changes
1. Edit `server/prisma/schema.prisma`
2. `bun run db:migrate` to create and apply a migration against the dev DB
3. `bun run db:generate` to update the Prisma client types
4. New migrations are picked up by the test DB automatically next time `test:e2e` runs (Playwright's `globalSetup` calls `prisma migrate deploy`)

### Component tests
- Stack: **Vitest** (jsdom environment) + **React Testing Library** + **`@testing-library/jest-dom`** matchers. Config lives in `client/vite.config.ts` under the `test` block; matchers and `cleanup()` are wired up in `client/src/test/setup.ts`.
- Tests live next to the component as `<Component>.test.tsx` in `client/src/`.
- Run from the repo root with `bun run test:client`, or from `client/` with `bun run test` (one-shot) / `bun run test:watch`.
- Mock `axios` with `vi.mock("axios")` and stub `axios.get` per test (`vi.mocked(axios.get).mockResolvedValueOnce(...)`); call `mockReset()` in `beforeEach` so implementations don't leak between tests.
- Wrap components that use TanStack Query in a fresh `QueryClientProvider` per render with `defaultOptions: { queries: { retry: false } }` so failed queries don't retry and tests don't share cache state.
- Query the accessibility tree (`screen.getByRole`, `screen.getByText`, `findBy*`) rather than `container.querySelectorAll`. Reach for `data-slot` / `data-testid` only when there is no semantic alternative.
- TanStack Query logs failed queries to `console.error`. In error-path tests, scope a `vi.spyOn(console, "error").mockImplementation(() => {})` to that test (restore in `afterEach`) — don't silence it globally, or real regressions will be hidden.

### E2E tests
Playwright tests live in `e2e/`. When writing or extending e2e tests, delegate to the `e2e-test-writer` agent (via the Agent tool) — it has the project-specific conventions, setup details, and quality bar baked in. See `.claude/agents/e2e-test-writer.md` for what it knows.
