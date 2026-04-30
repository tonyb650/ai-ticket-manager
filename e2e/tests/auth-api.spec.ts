import { test, expect, request as playwrightRequest } from "@playwright/test";
import {
  ADMIN_AUTH_FILE,
  AGENT_AUTH_FILE,
} from "./helpers/auth";

// All requests go through the test client (Vite) origin so the storage state
// cookies (scoped to the client origin) are sent correctly via the proxy.

test.describe("API authorization — /api/me", () => {
  test("returns 401 when unauthenticated", async ({ request }) => {
    const res = await request.get("/api/me");
    expect(res.status()).toBe(401);
  });

  test("returns 200 with the agent user when authenticated as agent", async () => {
    const ctx = await playwrightRequest.newContext({
      baseURL: "http://localhost:5174",
      storageState: AGENT_AUTH_FILE,
    });
    const res = await ctx.get("/api/me");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.role).toBe("agent");
    await ctx.dispose();
  });

  test("returns 200 with the admin user when authenticated as admin", async () => {
    const ctx = await playwrightRequest.newContext({
      baseURL: "http://localhost:5174",
      storageState: ADMIN_AUTH_FILE,
    });
    const res = await ctx.get("/api/me");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.role).toBe("admin");
    await ctx.dispose();
  });
});

test.describe("API authorization — admin-only /api/users", () => {
  test("returns 401 when unauthenticated", async ({ request }) => {
    const res = await request.get("/api/users");
    expect(res.status()).toBe(401);
  });

  test("returns 403 when authenticated as agent (non-admin)", async () => {
    const ctx = await playwrightRequest.newContext({
      baseURL: "http://localhost:5174",
      storageState: AGENT_AUTH_FILE,
    });
    const res = await ctx.get("/api/users");
    expect(res.status()).toBe(403);
    await ctx.dispose();
  });

  test("returns 200 when authenticated as admin", async () => {
    const ctx = await playwrightRequest.newContext({
      baseURL: "http://localhost:5174",
      storageState: ADMIN_AUTH_FILE,
    });
    const res = await ctx.get("/api/users");
    expect(res.status()).toBe(200);
    await ctx.dispose();
  });
});

test.describe("API authorization — tampered/missing cookie", () => {
  test("dropping the session cookie drops auth", async ({ browser }) => {
    // Start with a valid admin session, then clear cookies and confirm
    // protected endpoints reject the request.
    const context = await browser.newContext({ storageState: ADMIN_AUTH_FILE });

    const before = await context.request.get("/api/me");
    expect(before.status()).toBe(200);

    await context.clearCookies();

    const after = await context.request.get("/api/me");
    expect(after.status()).toBe(401);

    await context.close();
  });

  test("a tampered session cookie value is rejected", async ({ browser }) => {
    const context = await browser.newContext({ storageState: ADMIN_AUTH_FILE });

    const cookies = await context.cookies();
    const sessionCookie = cookies.find((c) =>
      c.name.startsWith("helpdesk") && c.name.includes("session_token"),
    );
    expect(sessionCookie, "expected a Better Auth session cookie").toBeTruthy();

    await context.clearCookies();
    await context.addCookies([
      {
        ...sessionCookie!,
        value: "this-is-not-a-real-session-token",
      },
    ]);

    const res = await context.request.get("/api/me");
    expect(res.status()).toBe(401);

    await context.close();
  });
});

test.describe("Sign-up is disabled", () => {
  test("POST /api/auth/sign-up/email is rejected", async ({ request }) => {
    const res = await request.post("/api/auth/sign-up/email", {
      data: {
        email: `should-not-create-${Date.now()}@test.local`,
        password: "anotherpassword",
        name: "Should Not Exist",
      },
      failOnStatusCode: false,
    });

    // Better Auth with disableSignUp: true responds with a non-2xx error.
    expect(res.ok()).toBe(false);
    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
  });

  test("the login UI does not expose a sign-up link", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("link", { name: /sign[-\s]?up|register|create.*account/i }))
      .toHaveCount(0);
  });
});

// Rate limiting on /api/auth/* is production-only (skipped in dev/test per
// CLAUDE.md), so we don't assert it here. Adding a guarded test would couple
// to environment-specific behavior that's intentionally absent in this run.
