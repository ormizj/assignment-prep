---
name: check
description: Fast green-check of the workspace — typecheck, lint, and unit tests — reporting pass or fail without changing anything. Use after an edit to confirm nothing broke, or whenever asked whether the build and tests still pass.
user-invocable: true
allowed-tools: Bash(pnpm:*), Bash(npx:*), Bash(git status:*), Bash(git diff:*), Read
---

# check — is it still green?

> Named `check`, not `verify`, because Claude Code ships a bundled `/verify` skill and a shadowed name is
> the wrong thing to debug under a clock.

Cheap enough to run after every change, which is exactly the advice for this assessment: run the tests
constantly, because breaking existing behaviour is the worst signal you can send.

## This skill fixes nothing

Report status and stop. If something fails, say what and where — do not repair it. Repairs belong in
`/fix`, so they land as a deliberate, attributable commit rather than an untracked drive-by.

## Procedure

1. Run in sequence, and **keep going after a failure** so one report covers everything:

   ```bash
   pnpm typecheck
   pnpm lint
   pnpm test:unit
   ```

   Use the real script names confirmed in `/audit` step 0. If a script does not exist, say so rather than
   inventing one.

2. `pnpm test:e2e` **only** when asked, or when the change was user-visible. Playwright runs cost minutes
   you may need.

3. Report compactly:

   - `typecheck` — pass, or the first few errors with `file:line`
   - `lint` — pass, or the count and whether any are in files you touched
   - `test:unit` — passed/failed counts

4. Compare against the baseline captured in `/audit` step 0. **A failure that was already there before any
   edits is not a regression** — say which category each failure falls into. Conflating the two wastes time
   chasing a bug you did not introduce.

5. If `git diff` shows changes to files outside the current fix, flag it. That is how a commit stops being
   atomic.
