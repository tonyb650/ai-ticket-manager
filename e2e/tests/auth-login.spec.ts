import { test, expect } from "@playwright/test";
import {
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  AGENT_EMAIL,
  AGENT_PASSWORD,
} from "./helpers/auth";

test.describe("Login form — validation", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
  });

  test("shows email validation error when email is empty", async ({ page }) => {
    await page.getByLabel("Password").fill("anything");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page.getByText("Enter a valid email")).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });

  test("shows password validation error when password is empty", async ({ page }) => {
    await page.getByLabel("Email").fill(ADMIN_EMAIL);
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page.getByText("Password is required")).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });

  test("shows both validation errors when fields are empty", async ({ page }) => {
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page.getByText("Enter a valid email")).toBeVisible();
    await expect(page.getByText("Password is required")).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });

  test("shows email validation error when email is malformed", async ({ page }) => {
    await page.getByLabel("Email").fill("not-an-email");
    await page.getByLabel("Password").fill("anything");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page.getByText("Enter a valid email")).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });

  test("marks email input as invalid via aria-invalid when malformed", async ({ page }) => {
    await page.getByLabel("Email").fill("nope");
    await page.getByLabel("Password").fill("x");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page.getByLabel("Email")).toHaveAttribute("aria-invalid", "true");
  });
});

test.describe("Login form — server-side errors", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
  });

  test("shows error and stays on /login when password is wrong", async ({ page }) => {
    await page.getByLabel("Email").fill(ADMIN_EMAIL);
    await page.getByLabel("Password").fill("definitely-not-the-password");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page.getByRole("alert")).toBeVisible();
    await expect(page.getByRole("alert")).not.toBeEmpty();
    await expect(page).toHaveURL(/\/login$/);
  });

  test("shows error and stays on /login when email does not exist", async ({ page }) => {
    await page.getByLabel("Email").fill("nobody-here@test.local");
    await page.getByLabel("Password").fill("any-password");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page.getByRole("alert")).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });

  test("returns the same generic error for wrong password and missing user", async ({ page }) => {
    // Better Auth's invalid-credentials response should not leak whether the
    // email exists. Capture both error messages and assert they match.
    await page.getByLabel("Email").fill(ADMIN_EMAIL);
    await page.getByLabel("Password").fill("wrong-password");
    await page.getByRole("button", { name: "Sign in" }).click();
    const wrongPasswordError = await page.getByRole("alert").textContent();

    await page.goto("/login");
    await page.getByLabel("Email").fill("ghost@test.local");
    await page.getByLabel("Password").fill("wrong-password");
    await page.getByRole("button", { name: "Sign in" }).click();
    const missingUserError = await page.getByRole("alert").textContent();

    expect(wrongPasswordError).toBeTruthy();
    expect(missingUserError).toBeTruthy();
    expect(wrongPasswordError).toEqual(missingUserError);
  });
});

test.describe("Login form — happy paths", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
  });

  test("admin login redirects to / and shows admin name", async ({ page }) => {
    await page.getByLabel("Email").fill(ADMIN_EMAIL);
    await page.getByLabel("Password").fill(ADMIN_PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page).toHaveURL("/");
    await expect(page.getByRole("heading", { name: /Welcome,/ })).toBeVisible();
  });

  test("agent login redirects to / and shows agent name", async ({ page }) => {
    await page.getByLabel("Email").fill(AGENT_EMAIL);
    await page.getByLabel("Password").fill(AGENT_PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page).toHaveURL("/");
    await expect(page.getByRole("heading", { name: /Welcome,/ })).toBeVisible();
  });

  test("admin sees Users link in nav after login", async ({ page }) => {
    await page.getByLabel("Email").fill(ADMIN_EMAIL);
    await page.getByLabel("Password").fill(ADMIN_PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page).toHaveURL("/");
    await expect(page.getByRole("link", { name: "Users" })).toBeVisible();
  });

  test("agent does NOT see Users link in nav after login", async ({ page }) => {
    await page.getByLabel("Email").fill(AGENT_EMAIL);
    await page.getByLabel("Password").fill(AGENT_PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page).toHaveURL("/");
    await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Users" })).not.toBeVisible();
  });

  test("session persists across full page reload", async ({ page }) => {
    await page.getByLabel("Email").fill(ADMIN_EMAIL);
    await page.getByLabel("Password").fill(ADMIN_PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL("/");

    await page.reload();

    await expect(page).toHaveURL("/");
    await expect(page.getByRole("heading", { name: /Welcome,/ })).toBeVisible();
  });

  test("visiting /login while already authenticated redirects to /", async ({ page }) => {
    await page.getByLabel("Email").fill(ADMIN_EMAIL);
    await page.getByLabel("Password").fill(ADMIN_PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL("/");

    await page.goto("/login");
    await expect(page).toHaveURL("/");
  });
});
