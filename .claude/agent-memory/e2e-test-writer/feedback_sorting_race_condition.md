---
name: sorting-race-condition
description: After clicking a sort header, aria-sort updates synchronously but row data only updates once the refetch resolves — must wait for both
metadata:
  type: feedback
---

After clicking a TanStack Table sort header, `aria-sort` on the `<th>` updates **synchronously** with React local state — it does not mean the network fetch has resolved. If you gate on `aria-sort` alone and then call `allTextContents()` to read row order, you'll often read skeleton rows (the page shows skeletons during `isPending`), causing `findIndex` to return -1.

**Fix:** After clicking a header and asserting `aria-sort`, also `await expect(page.getByText(expectedFirstRow)).toBeVisible()` before reading row positions. Pick the row you expect to appear first for the new sort direction — that locator will only resolve once the fetch lands and skeletons are replaced with real data.

**Why:** Observed in the tickets-page sorting tests. The first click worked (no prior data in cache) but the second click failed because the page transitioned through a skeleton state between the first and second fetches.

**How to apply:** Any time a test clicks a sort header and then asserts row order, add a `toBeVisible()` wait on the expected leading row before calling `allTextContents()`.
