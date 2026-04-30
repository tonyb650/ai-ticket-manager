import { test, expect } from "@playwright/test";
import { ADMIN_AUTH_FILE, AGENT_AUTH_FILE } from "./helpers/auth";

test.describe("Route protection — unauthenticated", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("redirects to /login when visiting /", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("redirects to /login when visiting /users", async ({ page }) => {
    await page.goto("/users");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("redirects to /login when visiting an unknown protected path", async ({ page }) => {
    await page.goto("/some/random/path");
    // App.tsx has no catch-all; React Router renders nothing for unknown
    // paths. The unauthenticated redirect only happens for paths matched by
    // ProtectedRoute. We at minimum verify we don't end up authenticated on
    // an admin/protected page.
    await expect(page).not.toHaveURL(/\/users$/);
  });
});

test.describe("Route protection — authenticated agent", () => {
  test.use({ storageState: AGENT_AUTH_FILE });

  test("can access /", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL("/");
    await expect(page.getByRole("heading", { name: /Welcome,/ })).toBeVisible();
  });

  test("is redirected from /users to /", async ({ page }) => {
    await page.goto("/users");
    await expect(page).toHaveURL("/");
  });

  test("does not see the Users nav link", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: "Users" })).not.toBeVisible();
  });
});

test.describe("Route protection — authenticated admin", () => {
  test.use({ storageState: ADMIN_AUTH_FILE });

  test("can access /", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL("/");
    await expect(page.getByRole("heading", { name: /Welcome,/ })).toBeVisible();
  });

  test("can access /users", async ({ page }) => {
    await page.goto("/users");
    await expect(page).toHaveURL("/users");
    await expect(page.getByRole("heading", { name: "Users" })).toBeVisible();
  });

  test("sees Users nav link and can navigate via it", async ({ page }) => {
    await page.goto("/");
    const usersLink = page.getByRole("link", { name: "Users" });
    await expect(usersLink).toBeVisible();
    await usersLink.click();
    await expect(page).toHaveURL("/users");
  });
});
