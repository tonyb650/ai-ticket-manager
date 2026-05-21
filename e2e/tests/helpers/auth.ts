import path from "path";
import type { Page } from "@playwright/test";

export const ADMIN_AUTH_FILE = path.join(__dirname, "..", ".auth", "admin.json");
export const AGENT_AUTH_FILE = path.join(__dirname, "..", ".auth", "agent.json");

export const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@test.local";
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "test-admin-password";
export const AGENT_EMAIL = process.env.AGENT_EMAIL ?? "agent@test.local";
export const AGENT_PASSWORD = process.env.AGENT_PASSWORD ?? "test-agent-password";

export const TEST_SERVER_URL = "http://localhost:3031";

/** Log the current session out and wait for the /login redirect. */
export async function logout(page: Page) {
  await page.getByRole("button", { name: "Sign out" }).click();
  await page.waitForURL(/\/login$/);
}

/** Log in as an arbitrary email/password and wait for the / redirect. */
export async function loginAs(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("/");
}
