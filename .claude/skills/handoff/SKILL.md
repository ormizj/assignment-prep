---
name: handoff
description: Write up the findings you did not have time to fix, with diagnosis and proposed approach, and produce the final submission summary. Use near the end of a timed audit, when wrapping up, or when asked to summarise what was found and what remains.
user-invocable: true
allowed-tools: Read, Grep, Glob, Write, Edit, Bash(git log:*), Bash(git status:*), Bash(git diff:*), Bash(git show:*), Bash(pnpm:*)
---

# handoff — bank the findings you could not fix

Run this at roughly **T-minus 10 minutes**, before the clock forces it.

Documenting a finding you did not fix still demonstrates diagnostic ability — that is stated outright in
the assessment guidance. An unfixed issue with a correct root-cause analysis is worth real marks; the same
issue left unmentioned is worth nothing. This is the highest return on the last ten minutes.

## Step 1 — Take stock

Run in parallel: `git log --oneline`, `git status --porcelain`, `pnpm typecheck`, `pnpm test:unit`.

Report honestly:

- Which findings landed as commits.
- Whether the suite is green, and whether any failure predates your work (from the `/audit` baseline).
- **Any uncommitted work in progress.** Half-finished edits in the working tree are worse than nothing —
  they make the final state ambiguous. Either finish and commit, or revert them and describe the intended
  fix in writing instead. Ask the user which; do not revert their work unprompted.

## Step 2 — Write up the unfixed findings

Update `AUDIT.md` so every finding not fixed carries:

- **Problem** — what is wrong, at `file:line`, and how it is triggered.
- **Root cause** — why it exists. This is the part being graded; a symptom restated is not a diagnosis.
- **Proposed fix** — the smallest change that would close it, and why that one.
- **Migration / scale** — whether it can ship in one step, and how it behaves as the system grows.
- **Why it was not fixed** — usually "lower confidence-to-effort ratio than F1–F3". Saying so shows the
  prioritisation was deliberate rather than an oversight.

Be brief. Clear, brief writing is explicitly valued over lengthy prose.

## Step 3 — Decide whether `AUDIT.md` ships

`/audit` step 0 may have added it to `.git/info/exclude`. Ask the user:

- **Commit it** — the written audit becomes part of the deliverable, alongside the commits. Usually right,
  since documentation is a graded criterion.
- **Leave it untracked** — if the deliverable is meant to be commits only.

If committing, do it as its own commit (`docs: audit findings and remaining issues`), never folded into a
fix commit.

## Step 4 — Final summary

Output for the user to read or paste:

1. **What I found** — one line per finding, grouped by security / performance / reliability / tooling.
2. **What I fixed** — commit hash, one line each, and the evidence tests still pass.
3. **What I deliberately did not fix** — and why, with the prioritisation reasoning.
4. **What I would do next** with more time, in order.

Point 3 is the one candidates skip. Naming a known issue you chose not to touch, with the reasoning, reads
as judgement. Silence reads as having missed it.
