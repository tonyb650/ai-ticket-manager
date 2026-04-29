---
name: Helpdesk Security Posture
description: Key security architecture facts about this helpdesk app — auth, RBAC, CORS, endpoints, risks
type: project
---

This is a monorepo helpdesk app (React + Express + PostgreSQL) with Better Auth session-based auth, two roles (admin/agent), sign-up disabled.

**Why:** Initial security audit performed 2026-04-28; these facts inform future reviews.
**How to apply:** Use as baseline for incremental audits — focus on what has changed since this snapshot.

## Endpoint surface (as of audit)
- `GET /api/health` — public, no auth
- `GET /api/me` — requireAuth, returns full req.session.user object
- `ALL /api/auth/*` — Better Auth handler (login, signout, session, etc.)
- No ticket, user-management, or admin API routes exist yet (app is early stage)

## Authorization pattern
- Server: single `requireAuth` middleware; NO role-enforcement middleware exists on the server yet
- Client: `ProtectedRoute` (auth check) and `AdminRoute` (role check) components in React Router
- The /users page is client-only protected — no server-side admin API endpoint yet, but when one is added it must enforce role server-side

## Known gaps (confirmed in audit)
- No rate limiting on login or any endpoint
- No `requireAdmin` server-side middleware exists; only client-side `AdminRoute`
- `GET /api/me` returns the full Better Auth session user object — includes role, email, name, id — acceptable but should be reviewed when fields expand
- Cookie security flags (httpOnly, secure, sameSite) are Better Auth defaults — not explicitly configured; not verified against Better Auth source
- `.env.example` has placeholder secrets (`change-me-in-production`) for BETTER_AUTH_SECRET and ADMIN_PASSWORD; `.env` is gitignored

## Correctly implemented
- Better Auth mounted before express.json() (correct per docs)
- CORS restricted to CLIENT_URL env var, credentials: true
- `input: false` on role field prevents clients from setting their own role at signup
- disableSignUp: true prevents self-registration
- Prisma schema uses onDelete: Cascade on Session/Account → User (no orphaned sessions)
- No raw SQL ($queryRaw/$executeRaw) found
- No dangerouslySetInnerHTML or localStorage session storage found
- .env is gitignored at root
