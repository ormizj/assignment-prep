---
paths:
  - "apps/client-*/**"
  - "packages/ui/**"
  - "**/*.tsx"
  - "**/components/**"
---

# Client — XSS, render cycles, leaked data

## XSS

- **`dangerouslySetInnerHTML`** — trace the value to its origin. If any part came from user input and is
  not sanitised, that is a stored-XSS finding. On a social app, post/comment/bio/display-name fields are
  the obvious carriers.
- Markdown or rich-text rendering without sanitisation, and any HTML built by string concatenation.
- `href`/`src` taken from user data — `javascript:` URLs still execute. Validate the scheme.
- `<img onError=...>`-style handlers injected via unsanitised attributes.

## Data that should not reach the client

The client bundle is public. Check for API keys or secrets imported into client code, admin-only fields
returned by a shared endpoint and merely hidden in the UI, and over-fetching that ships a whole user record
(password hash, email, tokens) to render a username. **Hiding a field with CSS or a conditional render is
not access control** — the data is in the network response either way.

Where the repo splits admin and end-user into separate client apps, that split is a security boundary, not
an organisational one. An admin capability reachable from the user client, or an admin-only type imported
into it, is a finding.

## Render cycles

- **Unmemoised context values** — `<Ctx.Provider value={{a, b}}>` allocates a new object every render and
  re-renders every consumer. One of the most common real performance defects in React apps.
- **Unstable dependencies** — inline objects, arrays, or functions passed to a memoised child or listed in
  a `useEffect` dependency array, defeating the memoisation entirely.
- **Index as `key`** in a list that reorders, filters, or deletes — causes wrong state to stick to the
  wrong row, which reads as a mystery UI bug rather than a perf one.
- **Effect chains** — a `useEffect` that only computes state from other state should be derived during
  render instead. Each link adds a render pass.
- **Missing cleanup** — listeners, intervals, subscriptions, and aborted fetches not torn down in the
  effect's return. This is the usual client-side memory leak.

Confirm before claiming. React Profiler or a Playwright run beats asserting a re-render happens.

## Reliability

Missing **error boundaries** mean one thrown render blanks the whole app. Check that async states have
loading and error branches, not just the happy path, and that a failed request surfaces something to the
user rather than an empty list that looks like "no data".

## Styling and framework conventions

**Match whatever is already there.** Identify the styling system from the code before touching it — StyleX,
Tailwind, CSS modules, vanilla-extract — and stay inside it. Introducing inline styles or a second CSS-in-JS
library to fix a bug is a new dependency and a new pattern in a diff that is supposed to be surgical.

The same applies to the framework. TanStack Start, Next.js, and plain Vite + React put routing, data
loading, and the server/client boundary in different places, and a fix that is correct in one is wrong in
another — a `"use client"` boundary, a route loader, and a server function are not interchangeable. Read one
existing route end to end before editing any of them.
