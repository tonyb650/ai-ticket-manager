/**
 * E2E — Users management (CRUD happy paths)
 *
 * Each test creates its own throwaway data (unique emails) so tests are
 * independent and order-agnostic.
 *
 * Session isolation strategy:
 * - The read and delete tests reuse the shared admin.json storage state (they
 *   never call logout, so the shared session token stays valid for parallel
 *   tests).
 * - The create, update-profile, and update-password tests each do a fresh
 *   admin login so they own a distinct session token. This prevents their
 *   mid-test logout() call from invalidating the shared token and breaking
 *   sibling tests running in parallel.
 */

import { test, expect, type Page } from "@playwright/test";
import {
  ADMIN_AUTH_FILE,
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  loginAs,
  logout,
} from "./helpers/auth";

// Default: reuse the shared admin session (safe for tests that never logout).
test.use({ storageState: ADMIN_AUTH_FILE });

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Navigate to /users and wait for the table heading to be visible. */
async function gotoUsers(page: Page) {
  await page.goto("/users");
  await expect(page.getByRole("heading", { name: "Users" })).toBeVisible();
}

/**
 * Return the table row whose email cell exactly matches `email`.
 * Scoping button clicks to the row prevents false matches against stale rows
 * from prior test runs (the test DB accumulates rows between test:e2e runs).
 */
function getRowByEmail(page: Page, email: string) {
  return page
    .getByRole("row")
    .filter({ has: page.getByRole("cell", { name: email, exact: true }) });
}

/**
 * Generate a unique token that is safe to use in emails across parallel
 * workers and across repeated test runs against the same test DB.
 * Date.now() alone can collide when two workers tick at the same millisecond.
 */
function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

test.describe("Users page — read", () => {
  test("should render the seeded admin row in the table", async ({ page }) => {
    await gotoUsers(page);
    // The seeded admin@test.local should appear in the table
    await expect(page.getByRole("cell", { name: "admin@test.local" })).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

test.describe("Users page — create", () => {
  // Fresh login so this test owns its own session token. Its mid-test logout()
  // won't invalidate the shared admin.json token used by other parallel tests.
  test.use({ storageState: { cookies: [], origins: [] } });

  test("should create a new agent and the new credentials should work", async ({
    page,
  }) => {
    await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);

    const id = uid();
    const email = `e2e-create-${id}@example.com`;
    const name = `E2E Create ${id}`;
    const password = "create-pass-1";

    await gotoUsers(page);

    // Open create dialog
    await page.getByRole("button", { name: "New user" }).click();
    await expect(page.getByRole("heading", { name: "New user" })).toBeVisible();

    // Fill and submit
    await page.getByLabel("Name").fill(name);
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Create user" }).click();

    // Dialog closes and new row appears in the table (email is the unique key)
    await expect(page.getByRole("heading", { name: "New user" })).not.toBeVisible();
    await expect(page.getByRole("cell", { name: email })).toBeVisible();

    // Verify the credentials work end-to-end: log out as admin, log in as the
    // new agent with the password that was just set.
    await logout(page);
    await loginAs(page, email, password);
    await expect(page).toHaveURL("/");
  });
});

// ---------------------------------------------------------------------------
// Update — profile only (name + email, password field left blank)
// ---------------------------------------------------------------------------

test.describe("Users page — update profile", () => {
  // Fresh login — mid-test logout() must not invalidate the shared session.
  test.use({ storageState: { cookies: [], origins: [] } });

  test("should update name/email and leave password unchanged", async ({ page }) => {
    await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);

    // First create a throwaway agent to edit
    const id = uid();
    const origEmail = `e2e-edit-profile-orig-${id}@example.com`;
    const origName = `E2E Profile Orig ${id}`;
    const agentPassword = "profile-pass-1";

    await gotoUsers(page);

    // Create the agent
    await page.getByRole("button", { name: "New user" }).click();
    await page.getByLabel("Name").fill(origName);
    await page.getByLabel("Email").fill(origEmail);
    await page.getByLabel("Password").fill(agentPassword);
    await page.getByRole("button", { name: "Create user" }).click();
    await expect(page.getByRole("heading", { name: "New user" })).not.toBeVisible();
    await expect(page.getByRole("cell", { name: origEmail })).toBeVisible();

    // Edit name + email, leave password blank
    const updatedName = `E2E Profile Updated ${id}`;
    const updatedEmail = `e2e-edit-profile-upd-${id}@example.com`;

    await getRowByEmail(page, origEmail).getByRole("button", { name: /^Edit/ }).click();
    await expect(page.getByRole("heading", { name: "Edit user" })).toBeVisible();

    await page.getByLabel("Name").fill(updatedName);
    await page.getByLabel("Email").fill(updatedEmail);
    // Password left blank intentionally
    await page.getByRole("button", { name: "Save changes" }).click();

    // Dialog closes; updated email is visible and original email is gone
    await expect(page.getByRole("heading", { name: "Edit user" })).not.toBeVisible();
    await expect(page.getByRole("cell", { name: updatedEmail })).toBeVisible();
    await expect(page.getByRole("cell", { name: origEmail })).not.toBeVisible();

    // Prove password was not changed: log in as the agent with the original password
    await logout(page);
    await loginAs(page, updatedEmail, agentPassword);
    await expect(page).toHaveURL("/");
  });
});

// ---------------------------------------------------------------------------
// Update — password change
// ---------------------------------------------------------------------------

test.describe("Users page — update password", () => {
  // Fresh login — mid-test logout() must not invalidate the shared session.
  test.use({ storageState: { cookies: [], origins: [] } });

  test("should update the password and the new credential should work", async ({
    page,
  }) => {
    await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);

    const id = uid();
    const email = `e2e-edit-pw-${id}@example.com`;
    const name = `E2E PW ${id}`;
    const origPassword = "old-password-1";
    const newPassword = "new-password-2";

    await gotoUsers(page);

    // Create the agent
    await page.getByRole("button", { name: "New user" }).click();
    await page.getByLabel("Name").fill(name);
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(origPassword);
    await page.getByRole("button", { name: "Create user" }).click();
    await expect(page.getByRole("heading", { name: "New user" })).not.toBeVisible();
    await expect(page.getByRole("cell", { name: email })).toBeVisible();

    // Edit — only update the password
    await getRowByEmail(page, email).getByRole("button", { name: /^Edit/ }).click();
    await expect(page.getByRole("heading", { name: "Edit user" })).toBeVisible();
    await page.getByLabel("Password").fill(newPassword);
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByRole("heading", { name: "Edit user" })).not.toBeVisible();

    // Prove the new password works
    await logout(page);
    await loginAs(page, email, newPassword);
    await expect(page).toHaveURL("/");
  });
});

// ---------------------------------------------------------------------------
// Delete
// ---------------------------------------------------------------------------

test.describe("Users page — delete", () => {
  test("should soft-delete a non-admin user and remove the row from the table", async ({
    page,
  }) => {
    const id = uid();
    const email = `e2e-delete-${id}@example.com`;
    const name = `E2E Delete ${id}`;

    await gotoUsers(page);

    // Create an agent to delete
    await page.getByRole("button", { name: "New user" }).click();
    await page.getByLabel("Name").fill(name);
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("delete-pass-1");
    await page.getByRole("button", { name: "Create user" }).click();
    await expect(page.getByRole("heading", { name: "New user" })).not.toBeVisible();
    await expect(page.getByRole("cell", { name: email })).toBeVisible();

    // Open delete confirmation
    await getRowByEmail(page, email).getByRole("button", { name: /^Delete/ }).click();
    await expect(
      page.getByRole("heading", { name: "Delete this user?" }),
    ).toBeVisible();

    // Confirm delete
    await page.getByRole("button", { name: "Delete" }).click();

    // Row disappears from the table
    await expect(page.getByRole("cell", { name: email })).not.toBeVisible();
  });
});
