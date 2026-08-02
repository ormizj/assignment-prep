---
name: audit
description: Kickoff for a timed code audit. Verifies the environment, captures a green test baseline, maps the monorepo, dispatches parallel domain auditors, and writes a ranked findings register to AUDIT.md. Use at the start of an audit assessment, or when asked to audit/review an unfamiliar codebase for security, performance, reliability, and tooling issues.
user-invocable: true
allowed-tools: Read, Grep, Glob, Agent, Write, Bash(pnpm:*), Bash(npm:*), Bash(npx:*), Bash(git status:*), Bash(git log:*), Bash(git rev-parse:*), Bash(cat:*), Bash(ls:*), Bash(printf:*), Bash(grep:*), Bash(rg:*), Bash(node:*), AskUserQuestion
---

# audit — map the codebase, find the issues, rank them

The first 25 minutes of a timed audit. It produces a ranked findings register; it fixes **nothing**.
Fixes go through `/fix`, one at a time, so each lands as its own atomic commit.

Read the whole codebase before writing any code. That is the explicit advice for this assessment, and it
is also how you avoid fixing a symptom three layers below its cause.

## Step 0 — Environment and safety

Run these first, in one message, in parallel. Report what each returned before continuing.

1. **Hide our own config from the repo.** This is load-bearing:

   ```bash
   git rev-parse --git-dir >/dev/null 2>&1 && \
     grep -qxF '.claude/' "$(git rev-parse --git-dir)/info/exclude" 2>/dev/null || \
     printf '.claude/\n.mcp.json\nAUDIT.md\n' >> "$(git rev-parse --git-dir)/info/exclude"
   ```

   `.claude/` and `.mcp.json` are *our* tooling, unzipped into someone else's repository. Without this they
   show up as untracked files and can be swept into a commit, putting audit-prep scaffolding into the diff
   a grader reads. `.git/info/exclude` is local-only — unlike editing `.gitignore`, it never appears in the
   diff itself.

   Then confirm with `git status --porcelain` that neither path is listed.

   > If `AUDIT.md` is meant to be part of the deliverable, remove it from that list and commit it
   > deliberately. Ask the user which they want before step 3.

2. **Establish the real layout.** Read `package.json`, `pnpm-workspace.yaml`, and `turbo.json`. Note the
   actual script names and workspace globs. If they contradict `.claude/rules/10-workspace.md`, **rewrite
   that rule file now** — every later step reasons from it, and a stale map costs more than the minute it
   takes to correct.

   Then do the same for the **`paths:` frontmatter of the stack rules** — `30-api-grpc.md`,
   `35-node-runtime.md`, `40-data-drizzle.md`, `50-client-react.md`, `70-secrets-config.md`. Each carries
   both a guessed layout (`apps/api/**`, `apps/client-*/**`) and layout-agnostic fallbacks (`**/*.tsx`,
   `**/server/**`). Add the real directories. This failure mode is silent: a rule whose globs match nothing
   in this repo simply never loads, with no warning, and you would only notice by its absence from the
   advice you get an hour later.

   Report which rules are now scoped to which directories, so the coverage is visible rather than assumed.

3. **Install and capture the baseline.** `pnpm install`, then `pnpm typecheck` and `pnpm test`.

   Record the exact counts. If the suite is **already failing on a clean clone**, stop and say so — that is
   itself a finding, and knowing it now prevents blaming your own fix later. Do not attempt to fix it yet.

4. `git log --oneline -15` — how the repo got here, and the commit-message style to match.

## Step 1 — Read before delegating

Spend a few minutes yourself on: the root `README`, the API's service registry / server entry point, the
DB schema, and one representative RPC handler end to end. You need enough of a mental model to judge what
the auditors report back. Do not skip this to save time — an unvetted finding list costs more.

## Step 2 — Dispatch the auditors in parallel

Launch all five in a **single message** so they run concurrently:

`security-auditor`, `performance-auditor`, `reliability-auditor`, `tooling-auditor`, `types-auditor`.

Give each the real layout from step 0 and the baseline result. They are read-only by construction and
return findings, never edits.

While they run, keep reading the highest-risk paths yourself — auth, the admin service, and anything
handling ids from a request.

## Step 3 — Build the register

Merge the returned findings, drop duplicates, and discard anything you cannot point at a `file:line` for.
An unverifiable finding wastes fix-time you do not have.

Write `AUDIT.md`:

```markdown
# Audit findings

| ID | Severity | Confidence | Effort | Area | Location | Finding |
|----|----------|-----------|--------|------|----------|---------|
| F1 | critical | high      | S      | security | apps/api/…:47 | one line |

## F1 — <title>
**Problem** · **Root cause** · **Smallest viable fix** · **Blast radius**
```

Rank by **confidence × severity ÷ effort**. High-confidence, high-severity, small-effort goes first — a
thorough fix on two issues beats a superficial pass on five, and a confident fix you can justify is worth
more than a speculative one on a scarier-sounding bug.

## Step 4 — Stop and ask

Present the top findings with the ranking and your recommended order, then **stop**. Use `AskUserQuestion`
to confirm which to fix first. Do not start fixing — the user owns the time budget, and `/fix` handles one
finding at a time on purpose.

State the elapsed time and how much of the 90 minutes remains, so the choice is informed.
