/**
 * Auth setup — logs in as admin and as agent and saves storage state so
 * authenticated test projects can reuse cookies without logging in per test.
 *
 * This file matches the `testMatch: /auth\.setup\.ts/` pattern in
 * playwright.config.ts, so it runs only in the `setup:admin` and
 * `setup:agent` projects and is excluded from every other project via
 * `testIgnore`.
 */

import { test as setup } from "@playwright/test";
import path from "path";

const ADMIN_AUTH_FILE = path.join(__dirname, ".auth/admin.json");
const AGENT_AUTH_FILE = path.join(__dirname, ".auth/agent.json");

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@test.local";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "test-admin-password";
const AGENT_EMAIL = process.env.AGENT_EMAIL ?? "agent@test.local";
const AGENT_PASSWORD = process.env.AGENT_PASSWORD ?? "test-agent-password";

setup("authenticate as admin", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(ADMIN_EMAIL);
  await page.getByLabel("Password").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  // Wait until navigation to home is complete
  await page.waitForURL("/");
  await page.context().storageState({ path: ADMIN_AUTH_FILE });
});

setup("authenticate as agent", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(AGENT_EMAIL);
  await page.getByLabel("Password").fill(AGENT_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("/");
  await page.context().storageState({ path: AGENT_AUTH_FILE });
});
