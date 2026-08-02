---
paths:
  - "**/*.{test,spec}.{ts,tsx,js,mjs}"
  - "**/e2e/**"
  - "**/tests/**"
  - "vitest.config.*"
  - "playwright.config.*"
---

# Testing — the baseline is evidence

"Do all existing tests still pass?" is graded directly, and breaking existing behaviour is called out as a
significant negative signal. The test suite is how you prove you did not.

## Capture the baseline first

Before the first edit, record the result of `pnpm typecheck` and `pnpm test`. This matters more than it
sounds: **if the suite is already red when you clone**, you need to know that now, not after your third
fix, or you will spend time chasing a failure you did not cause. A pre-existing failure is itself a finding
worth reporting.

Write the baseline down. "All 47 unit tests passed before and after" is a concrete claim you can put in a
commit body; "tests pass" is not.

## The loop

- `pnpm test:unit` after every change — fast enough to run constantly, which is the explicit advice.
- `pnpm typecheck` after any change to a type or a shared package, because a tightened type breaks
  consumers you did not open.
- `pnpm test:e2e` only when the change is user-visible. Playwright runs are slow; running them after every
  edit is how you lose ten minutes you needed.

## Never edit a test to make a fix pass

A failing existing test means your change altered observable behaviour. Options, in order:

1. Narrow the fix so behaviour is preserved. Usually correct.
2. If the old behaviour *was* the bug, the test encoded the bug. Change it — and say so explicitly in the
   commit's **Migration / Scale Considerations**, naming what callers must adapt to.

What you must never do is quietly adjust an assertion to match whatever the new output happens to be. That
deletes the only evidence the codebase still works.

## Adding tests

A regression test for the specific bug you fixed is high value and stays surgical — it proves the fix and
documents the vulnerability. Keep it in the existing style and file layout. Do **not** embark on raising
overall coverage; that is a rewrite, not a fix.

For a security fix, the strongest test is the one that fails against the old code: assert that the
unauthorised call is now rejected.
