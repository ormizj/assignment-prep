---
name: commit
description: Commit everything in the working tree as the correct number of atomic commits — one per finding — each with an explicit pathspec and the full Problem / Root Cause / Fix / Migration justification. Use when changes have accumulated outside the /fix loop, or when asked to commit the current work properly.
user-invocable: true
argument-hint: [optional grouping hint]
allowed-tools: Read, Grep, Glob, Edit, Bash(git status:*), Bash(git diff:*), Bash(git add:*), Bash(git commit:*), Bash(git log:*), Bash(git show:*), Bash(git rev-parse:*), Bash(git stash:*), Bash(pnpm:*), AskUserQuestion
---

# commit — land what's already in the tree, split correctly

`/fix` commits a change it made itself, one finding at a time, from a clean start. This is for the state you
actually end up in: a working tree holding edits from two or three findings, because reading led to a quick
fix, or a reproduction turned into a real change, or the clock got ahead of the process.

Two bad options are on the table and both are graded against you — bundle it all into one commit and lose
atomicity, or split it by hand under time pressure and miss something. This skill does the split properly.

**It does not diagnose and it does not write new fixes.** The only code it may touch is un-mixing two
findings that landed in one file (step 4). If a change in the tree looks wrong, say so and stop; that is a
`/fix` conversation.

## Step 1 — Enumerate everything first

```bash
git status --porcelain
git diff
git diff --cached
git log --oneline -10
```

Account for **every** modified, added, deleted, and untracked path before proposing anything. "Commit all
the changes properly" means nothing is left behind by accident — the final `git status` is the proof, and
you cannot produce it if you never enumerated the starting state. Read the full diff, not just the file
list: the grouping depends on what changed, not on which files changed.

`git log` is for matching the repo's existing subject-line style, exactly as in `/fix`.

## Step 2 — Confirm green before the first commit

`pnpm typecheck` and `pnpm test:unit`. Before, not after — committing a red tree and discovering it three
commits later leaves you unpicking history you no longer have time to unpick.

Compare against the baseline from `/audit` step 0. A failure that predates all of this work is not a
regression and is not a reason to stop; a new one is, and means something in the tree is not ready to
commit. Say which.

## Step 3 — Propose the commit plan, then wait

Group by **finding, not by file**. One finding that touched three files is one commit; three findings in
one file are three commits.

Show the plan before running anything:

```
1. fix(api): <subject>        — apps/api/src/handlers/post.ts, apps/api/src/handlers/post.test.ts
2. perf(db): <subject>        — packages/db-schema/src/schema.ts
3. docs: audit findings       — AUDIT.md            [only if the user wants it tracked]
```

If a grouping is ambiguous — two changes that might be one finding or two — ask with `AskUserQuestion`
rather than guessing. Guessing wrong in the direction of bundling is the expensive mistake.

## Step 4 — Un-mix collisions honestly

When one file carries edits belonging to two findings, you cannot stage them separately: `git add -p` is
interactive and unavailable here.

Do this instead — revert the file to the first fix only, commit that, then re-apply the second and commit
again. Keep the second edit's content in the conversation before you revert so it is not lost.

Never paper over it by bundling the two into one commit, and never silently drop one. If the un-mix is not
cleanly possible, say exactly why, and commit them together with the coupling stated explicitly in the body
— a reviewer forgiving one documented exception is fine; a reviewer discovering an undocumented one is not.

## Step 5 — Never stage the tooling

`.claude/`, `.mcp.json`, and `AUDIT.md` are ours, unzipped into someone else's repository. They must not
appear in a commit a grader reads.

`/audit` step 0 adds them to `.git/info/exclude`, but **do not assume it ran.** Check `git status
--porcelain` for them explicitly. If they are showing as untracked, exclude them before staging anything:

```bash
printf '.claude/\n.mcp.json\nAUDIT.md\n' >> "$(git rev-parse --git-dir)/info/exclude"
```

`AUDIT.md` is the one deliberate exception — if the user wants the written audit to ship, commit it on its
own (`docs: audit findings and remaining issues`), never folded into a fix.

## Step 6 — Commit each group with an explicit pathspec

Per commit, using the mandatory body from `00-mission.md`:

```bash
git add -- <files-for-this-finding>
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
)" -- <files-for-this-finding>
```

The pathspec on `git commit` itself is load-bearing, not decoration: a bare `git commit` takes the **entire
index**, which is exactly how a careful two-commit split turns into one commit with everything in it.
`git add -A`, `git add .`, and `git commit -a` are denied in `settings.json` for the same reason — if one of
them is what you reached for, that is the signal you are about to lose the atomicity, not a permission
problem to route around.

Write a real justification for each. A commit landed through this skill is indistinguishable in the log
from one landed through `/fix`, and it is graded the same way — "committed leftover work" is not a
justification.

## Step 7 — Prove the tree is clean

```bash
git log --oneline -<n>
git status --porcelain
```

Report every commit hash with its subject, and then either an empty `git status` or a precise statement of
what remains uncommitted and why it was left. Do not claim everything is committed without showing it.
