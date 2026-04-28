# Helpdesk

A helpdesk application with a React frontend and Express backend.

## Project structure

Bun workspace monorepo with two packages:

```
client/   React + Vite frontend
server/   Express + Prisma backend
```

## Commands

Run from the repo root:

```bash
bun run dev:client     # Vite dev server at http://localhost:5173
bun run dev:server     # Express server at http://localhost:3030 (watch mode)
```

Run from `server/`:

```bash
bun run db:migrate     # Run Prisma migrations
bun run db:generate    # Regenerate Prisma client after schema changes
bun run db:seed        # Seed admin user (reads ADMIN_EMAIL / ADMIN_PASSWORD from .env)
bun run db:studio      # Open Prisma Studio
```

Run from `client/`:

```bash
bun run build          # Type-check + Vite build
```

## Infrastructure

PostgreSQL via Docker:

```bash
docker compose up -d   # Start the database
```

Connection: `postgresql://helpdesk:helpdesk@localhost:5432/helpdesk`

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

**Client:** React 19, React Router v7, Vite, Tailwind CSS v4, shadcn/ui (Nova preset, neutral base color), react-hook-form + Zod, Better Auth client

**Server:** Express v5, Better Auth, Prisma v7 (pg adapter), PostgreSQL 17

**Tooling:** Bun (package manager + runtime), TypeScript

## Key conventions

### Client path alias
`@/` maps to `client/src/`. Use it for all internal imports (e.g. `@/components/ui/button`).

### Adding shadcn components
```bash
bunx --bun shadcn@latest add <component>
```
Components land in `client/src/components/ui/`.

### Auth
- Sign-up is disabled; users are created via the seed script or directly in the database.
- User roles: `admin` | `agent` (stored on the `User` model).
- The Better Auth handler must be mounted **before** `express.json()` — see `server/src/index.ts`.
- `requireAuth` middleware (`server/src/middleware/requireAuth.ts`) attaches `req.session` (typed via global augmentation).
- The client auth client is at `client/src/lib/authClient.ts`; import `useSession` from there.
- `role` is exposed on the client via `inferAdditionalFields` in `authClient.ts`. The field is declared manually (not imported from the server) because the client tsconfig only includes `client/src/`. If new fields are added to `additionalFields` in `server/src/lib/auth.ts`, update `authClient.ts` to match.
- Route protection: `ProtectedRoute` redirects unauthenticated users to `/login`; `AdminRoute` redirects non-admins to `/`.

### Database changes
1. Edit `server/prisma/schema.prisma`
2. `bun run db:migrate` to create and apply a migration
3. `bun run db:generate` to update the Prisma client types
