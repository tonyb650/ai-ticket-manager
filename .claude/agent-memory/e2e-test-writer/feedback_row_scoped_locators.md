---
name: Use row-scoped locators for table actions on an accumulating test DB
description: The test DB accumulates rows between runs; always scope edit/delete button clicks to the specific row identified by its unique email cell
type: feedback
---

The test DB (`helpdesk_test`) is NOT wiped between `bun run test:e2e` invocations — rows from prior runs persist. Only a `bun run db:test:up` (which recreates the Docker volume) fully resets it.

**Why this matters for locators:** If you click `page.getByRole("button", { name: "Edit Alice" })` and there are three rows named "Alice" from three prior runs, Playwright throws a strict-mode violation or (worse) silently picks the wrong row. The wrong row might have a stale email that conflicts with an in-flight update from another test, causing 409/500 errors.

**How to apply:** Use `getRowByEmail(page, email)` to scope all action-button clicks:

```ts
function getRowByEmail(page: Page, email: string) {
  return page
    .getByRole("row")
    .filter({ has: page.getByRole("cell", { name: email, exact: true }) });
}

await getRowByEmail(page, email).getByRole("button", { name: /^Edit/ }).click();
await getRowByEmail(page, email).getByRole("button", { name: /^Delete/ }).click();
```

Also use `uid()` (timestamp + random suffix) for all test data emails and names to prevent cross-run and cross-worker collisions:

```ts
function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}
```

`Date.now()` alone is not sufficient — parallel workers in the same run can tick at the same millisecond.
