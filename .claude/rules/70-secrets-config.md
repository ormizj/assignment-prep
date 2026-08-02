---
paths:
  - "**/.env*"
  - "**/*.config.{ts,js,mjs,cjs,json}"
  - "**/config/**"
  - "**/Dockerfile*"
  - "**/docker-compose*.{yml,yaml}"
  - "**/.github/workflows/**"
---

# Configuration — secrets, hardcoded values, CI

## Secrets

**Never print a secret value into the transcript.** This session is screen-recorded. Refer to a credential
by name and location — "an API key is hardcoded at `apps/api/src/config.ts:12`" — and never echo, `cat`, or
quote the value itself, in conversation or in a commit body.

What to look for: a committed `.env` (as opposed to `.env.example`), keys and tokens literal in source,
credentials in a compose file or Dockerfile `ENV`, a default that silently weakens security
(`process.env.JWT_SECRET ?? 'dev-secret'` — the fallback *is* the vulnerability, because production runs on
it the day someone forgets a variable), and anything secret imported into client code, where the bundle
is public.

**Deleting the line does not fix it.** A secret that has been committed is in the reflog, in every clone,
and in the CI cache — it is compromised and must be rotated. That distinction is the finding. Say so in
**Migration / Scale Considerations**: remove from source and read from the environment now, rotate the
credential out of band, and treat history rewriting as a separate operation with its own coordination cost.
A fix that quietly drops the literal and claims the problem is closed is worse than one that names the
rotation requirement, because it looks resolved.

## Hardcoded values that break at scale

- URLs, hostnames, ports, and bucket names pinned to one environment.
- Timeouts, retry counts, page sizes, and rate limits as magic numbers — especially a page size that is
  fine at 100 rows and fatal at 100,000.
- `NODE_ENV` checks that disable a control in the wrong direction: auth skipped when not production, CORS
  opened to `*`, TLS verification off, verbose errors returned to the client. Read every
  `NODE_ENV !== 'production'` and ask what happens if the variable is simply unset.

Not every literal is a finding. A constant that has one correct value forever is fine. The finding is a
value that *differs by environment or by scale* and has no way to differ.

## Configuration handling

Validate configuration once, at boot, and fail loudly — a missing variable should stop startup, not surface
as `undefined` in a query three layers down at 3am. Scattered `process.env.X!` is the anti-pattern: the `!`
asserts to the compiler something nobody checked at runtime.

Keep the fix surgical. Adding a schema validator for the two variables that are actually broken is right;
introducing a config library and rewriting every access site is a rewrite.

## CI

- Secrets reachable from untrusted PR builds — `pull_request_target` combined with a checkout of the PR
  head is the classic token-exfiltration shape.
- A step that cannot fail the build: `continue-on-error`, a pipe that swallows the exit code, a test command
  whose non-zero status is discarded. Green CI on broken code is a reliability finding in its own right.
- Install without `--frozen-lockfile`, which lets CI resolve different versions than any developer has.
- Unpinned third-party actions (`@main` rather than a tag or SHA), and missing dependency caching.
- Checks that exist locally but never run in CI — typecheck and lint are the usual omissions.
