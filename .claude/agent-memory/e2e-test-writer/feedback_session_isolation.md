---
name: Session isolation for tests that call logout()
description: Tests that call logout() mid-test must start with their own fresh admin session, not the shared admin.json storage state
type: feedback
---

Any test that calls `logout()` mid-test (to verify credentials after an admin action) MUST use a fresh session, not the shared `admin.json` storage state.

**Why:** Better Auth's sign-out endpoint deletes the specific session token from the DB. All parallel workers load the same `admin.json` at test start, giving them the same session token. When one test logs out, it revokes that token, and every other parallel test using the same token gets 401 on the next API call — causing "Failed to update user" / "Failed to create user" errors with no obvious cause.

**How to apply:** Use `test.use({ storageState: { cookies: [], origins: [] } })` at the top of any `test.describe` block that contains a logout-mid-test flow. Add `await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD)` as the first line of the test body. This gives that test its own independent session token. Tests that never call `logout()` can safely share `ADMIN_AUTH_FILE`.

See `e2e/tests/users-management.spec.ts` for the pattern.
