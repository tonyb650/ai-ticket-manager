# Memory Index

- [Session isolation for tests that call logout()](feedback_session_isolation.md) — tests that logout mid-test must start with a fresh admin session, not shared admin.json
- [Row-scoped locators for accumulating test DB](feedback_row_scoped_locators.md) — scope edit/delete clicks to the row by unique email; use uid() not Date.now() alone
- [API-only webhook test conventions](project_webhook_api_tests.md) — direct server requests, psql cleanup, WEBHOOK_SECRET in .env.test, no core import in e2e
- [Sorting race condition: aria-sort vs row data](feedback_sorting_race_condition.md) — aria-sort updates synchronously; wait for expected first-row text to be visible before reading row order
