---
name: fix
description: Fix exactly one audited finding as a minimal, surgical change and land it as a single atomic commit with the full Problem / Root Cause / Fix / Migration justification. Use after /audit when the user picks a finding to fix, or when asked to fix one specific identified issue and commit it.
user-invocable: true
argument-hint: <finding-id or short description>
allowed-tools: Read, Grep, Glob, Edit, Write, Agent, Bash(pnpm:*), Bash(git status:*), Bash(git diff:*), Bash(git add:*), Bash(git commit:*), Bash(git log:*), Bash(git rev-parse:*), Bash(git show:*), AskUserQuestion
---

# fix — one finding, one commit

This produces the graded artifact. Diagnosis quality, minimality, backwards compatibility, and the written
justification are all judged from what this leaves in `git log`.

## Guard: exactly one finding

If the request covers more than one finding, **stop and say so**. Fix the first, then the user runs `/fix`
again. Never bundle — a reviewer must be able to revert any single fix without unpicking another, and a
combined commit reads as not having understood which change did what.

If no finding was named, ask which one rather than guessing.

## Step 1 — Restate before touching anything

Write out, in the conversation:

- **The problem** — what is broken, at which `file:line`, and how it is triggered or exploited.
- **The root cause** — the decision or missing check that allowed it. If you cannot name one, go back and
  read; you are not ready to fix.
- **The intended fix** — the smallest change that fully closes it.
- **What you are deliberately not changing**, and why the smaller fix suffices.

If the root cause turns out to be different from what `AUDIT.md` recorded, say so and update the register.
That correction is itself evidence of diagnostic depth.

**If the register marked this finding medium confidence or lower, dispatch `finding-verifier` first** and
wait for its verdict. It re-reads the path with a context that has not already been sold on the finding,
and it is looking for the guard the auditor missed — middleware, a scope inside the repository method, a DB
constraint, a route that is never mounted. A `REFUTED` verdict here costs a minute; discovering the same
thing twenty minutes into a fix costs the fix.

Do **not** run it on high-confidence findings. The verification is worth less than the clock it spends once
the evidence is already unambiguous.

## Step 2 — Confirm green before you start

`pnpm typecheck` and `pnpm test:unit`. You need a known-good starting point, or you cannot attribute a
later failure to your change. If something is already red, note which — do not fix it as part of this
commit.

## Step 3 — Make the minimal change

- Change only what closes the flaw. Resist touching neighbouring code, renaming, reformatting, or
  "while I'm here" cleanups — a large diff is scored against you.
- Preserve observable behaviour: response shape, error codes, ordering, timing. Unless the observable
  behaviour *is* the bug, in which case say so explicitly in the commit body.
- **Do not run `biome check --write` / `lint:fix` across a file.** It reformats pre-existing lines and
  inflates the diff, which directly undercuts the "minimal, surgical" criterion. Format only what you wrote.
- If the fix cannot be applied in one step without breaking callers, implement the first phase and describe
  the rest in the migration section. A phased security fix, clearly explained, scores better than a
  breaking one-shot.

Consider a regression test that fails against the old code — for a security fix, one asserting the
unauthorised call is now rejected is the strongest possible evidence.

## Step 4 — Verify

In order: `pnpm typecheck` → the targeted test file → `pnpm test:unit` → `pnpm lint`.
Run `pnpm test:e2e` only if the change is user-visible.

**If a pre-existing test now fails, stop.** That means behaviour changed. Narrow the fix, or justify the
change explicitly. Never edit an assertion to match your new output.

Then `git diff` and read your own change as a reviewer would. If it is larger than the problem, cut it back.

## Step 5 — Commit atomically

Stage and commit with an **explicit pathspec on `git commit` itself**:

```bash
git add -- <files-for-this-fix>
git commit -m "$(cat <<'EOF'
<type>: <one-line summary>

## The Problem
...
## The Root Cause
...
## The Fix
...
## Migration / Scale Considerations
...
EOF
)" -- <files-for-this-fix>
git status --porcelain
```

The pathspec on `commit` is the load-bearing guard, not decoration. A bare `git commit` commits the
**entire index** — anything already staged, plus `.claude/` if `/audit` step 0 was skipped, leaks into this
commit and destroys its atomicity. **Never use `git add -A` or `git commit -a` here.**

Match the repo's existing commit style from `git log` for the subject line. Do not add co-author trailers
unless the repo's history already uses them.

Finish by confirming with `git status --porcelain` that files outside this fix are still uncommitted, and
report the commit hash plus what remains.

## Step 6 — Do not continue

Report and stop. Do not roll into the next finding — the user decides what the remaining time buys.
