---
paths:
  - "apps/api/**"
  - "**/server/**"
  - "**/services/**"
  - "**/*.server.ts"
---

# Node runtime — the event loop, memory, and concurrency

One process serves every request. That is the whole reason these bugs matter: a defect that costs one
request 40ms of blocked CPU costs *every concurrent request* the same 40ms, and a leak of one object per
request is unbounded by definition. None of it shows up on seed data with one user.

## Blocking the event loop

Synchronous work in a request path stalls the entire server, not just the caller.

- `readFileSync`, `writeFileSync`, `existsSync`, `execSync`, `spawnSync` reached from a handler.
- `crypto.pbkdf2Sync` / `scryptSync` / synchronous bcrypt in a login path — the expensive-by-design ones are
  the worst possible thing to run synchronously, and login is the endpoint an attacker can hammer for free.
- `JSON.parse` on an unbounded request body, and `JSON.stringify` of a large result set.
- A CPU loop over a collection whose size comes from the database or the request.

**The smallest fix is usually not "make the whole call chain async."** Prefer, in order: move the work to
startup and cache it (config, templates, key material); swap the sync API for the async one already in
`node:fs/promises` when the caller is *already* async; bound the input so the work is small. Converting a
synchronous helper into a promise ripples through every caller and their tests — that is a rewrite, and it
is the diff a grader reads as not having understood the problem.

## Memory leaks

The shape to hunt: something added per request, never removed.

- Module-level `Map`, `Set`, array, or object used as a cache with no eviction and no size bound. A cache
  without a bound is a leak with good intentions.
- `emitter.on(...)`, `process.on(...)`, or a signal handler registered inside a handler or per-connection
  path rather than once at startup — `MaxListenersExceededWarning` is the symptom, not the bug.
- `setInterval` / `setTimeout` never cleared, and timers that keep a request-scoped closure alive.
- A closure captured in a long-lived structure that transitively retains the request, its body, or a DB
  connection.

State the growth relationship in the finding: "one entry per authenticated user, never evicted" is a
diagnosis; "possible memory leak" is not.

## Concurrency and race conditions

Node is single-threaded, which lulls people into thinking there are no races. There are — every `await` is
a point where another request can interleave.

- **Check-then-act across an `await`**: read a row, decide, then write. Between the read and the write,
  another request did the same. Uniqueness checks, balance decrements, "claim this slot", and idempotency
  guards all have this shape. The fix is a transaction with the right isolation, a unique constraint, or a
  conditional update (`WHERE version = ?`) — not a mutex in application code.
- **Module-level mutable state** shared across requests: a `let currentUser`, a request-scoped value cached
  on a module singleton, a builder object reused between calls. This is cross-request data leakage, which
  is a security finding as much as a correctness one.
- **Missing `await`** on a promise-returning call — the work escapes the request's error handling and its
  rejection becomes an unhandled rejection. Grep for calls whose result is discarded.
- **`Promise.all` over an unbounded array** — issues N concurrent queries and can exhaust the connection
  pool. Bound the concurrency or batch the query.

## Process-level reliability

Missing `unhandledRejection` / `uncaughtException` handling, and shutdown that does not drain in-flight
requests or close the DB, are real findings — but check whether the process manager already covers it
before proposing one, and keep the change to a few lines at the entry point.
