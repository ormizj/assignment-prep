---
name: prove
description: Reproduce a finding against the unfixed code so the diagnosis rests on observed behaviour rather than on reading. Produces the evidence sentence for the commit body and, where cheap, the regression test that fails before the fix. Use before /fix on anything you have not actually seen happen.
user-invocable: true
argument-hint: <finding-id or short description>
allowed-tools: Read, Grep, Glob, Write, Edit, Bash(pnpm:*), Bash(npx:*), Bash(node:*), Bash(sqlite3:*), Bash(curl:*), Bash(git status:*), Bash(git diff:*), Bash(git stash:*), AskUserQuestion
---

# prove — make the bug happen before you fix it

"Line 47 looks unsafe" and "I sent this request and got back another user's row" are graded very
differently. This skill converts the first into the second.

It pays for itself three ways: diagnostic depth is the top-weighted criterion, the observation becomes the
one sentence the commit body needs under **The Problem**, and the artifact you build here is usually the
regression test `/fix` step 3 asks for — the one that fails against the old code, which is the strongest
evidence a security fix is real.

## Time-box it: 3 minutes

If it will not reproduce in about three minutes, **stop and say so**. Downgrade the finding's confidence in
`AUDIT.md` and move on, or fix it on the strength of the code reading and say in the commit body that the
diagnosis is static. A failed reproduction is information — it often means the guard you could not find in
the code is real and running. It is not a failure, and it is not a reason to keep digging.

## Step 1 — Pick the cheapest instrument that settles it

In order. Stop at the first one that can answer the question.

1. **A unit test.** Best by far when the defect is in a service, a repository, or a pure function. It runs
   in seconds, needs no server, and the file you write is the deliverable.
2. **`sqlite3` against the dev database.** For data-layer claims this is near-instant and conclusive:
   `EXPLAIN QUERY PLAN <the query>` shows `SCAN` instead of `SEARCH ... USING INDEX` for a missing index,
   and a row count shows what "unbounded" means in practice. `Bash(sqlite3:*)` is already permitted.
3. **A direct request** — `curl` to the HTTP surface, or the repo's own client/`grpcurl` for RPC — against
   a running dev server. Right for authorization and IDOR findings: authenticate as user A, ask for user
   B's object, show the response.
4. **A counter or a log line.** For N+1, the honest measurement is the query count, not the wall clock.
   If the DB layer has a logger or hook, enable it, hit the endpoint once, and count. State the result as a
   relationship: "a 50-post feed issued 51 queries".
5. **Playwright**, last, and only for something genuinely visual — an XSS payload actually executing, a
   render loop you can see. It costs minutes.

## Step 2 — Run it against the unfixed code

This is the whole point and the easiest step to get backwards. The observation is only evidence if it was
made *before* the change. If you have already edited the file, stash the change, observe, then restore it.

Capture the output verbatim — the failing assertion, the query plan, the response body, the count. Redact
any secret or token before quoting it; this session is recorded.

## Step 3 — Leave no scratch files

If you wrote a test, write it at the path where the regression test will permanently live, in the repo's
existing test style and naming. Then it is the same artifact `/fix` commits, and nothing extra appears in
`git status`.

If you needed a throwaway script, delete it before finishing and confirm with `git status --porcelain` that
the tree holds only what it held before. An untracked scratch file that gets swept into a commit undoes
the atomicity `/fix` works to protect.

## Step 4 — Hand back the evidence

Report:

- **What you ran**, exactly, so it can be repeated.
- **What you observed**, verbatim.
- **The one sentence for the commit body** — the concrete trigger or abuse path, phrased for
  **The Problem** section. This is the deliverable.
- **Whether a regression test now exists**, and at which path.
- **Whether the finding survived.** If the reproduction failed, say what that implies about the diagnosis
  and update `AUDIT.md` rather than quietly moving on.

Then stop. Proving is not fixing — `/fix` owns the change and the commit.
