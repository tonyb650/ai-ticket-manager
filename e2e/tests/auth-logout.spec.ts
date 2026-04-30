import { test, expect } from "@playwright/test";
import {
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
} from "./helpers/auth";

// These tests log in fresh rather than reusing storage state so the logged-out
// post-condition does not pollute the shared admin/agent auth files.
test.describe("Logout flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(ADMIN_EMAIL);
    await page.getByLabel("Password").fill(ADMIN_PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL("/");
  });

  test("clicking Sign out redirects to /login", async ({ page }) => {
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/login$/);
  });

  test("after logout, visiting / redirects to /login", async ({ page }) => {
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/login$/);

    await page.goto("/");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("after logout, visiting /users redirects to /login", async ({ page }) => {
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/login$/);

    await page.goto("/users");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("session cookie is cleared after logout", async ({ page, context }) => {
    const cookiesBefore = await context.cookies();
    expect(
      cookiesBefore.some((c) => c.name.startsWith("helpdesk")),
    ).toBe(true);

    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/login$/);

    const cookiesAfter = await context.cookies();
    const sessionCookie = cookiesAfter.find(
      (c) => c.name.startsWith("helpdesk") && c.name.includes("session_token"),
    );
    // Cookie is either removed entirely or cleared to an empty value.
    expect(sessionCookie?.value ?? "").toBe("");
  });

  test("after logout, the session API returns no user", async ({ page }) => {
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/login$/);

    const response = await page.request.get("/api/me");
    expect(response.status()).toBe(401);
  });
});
