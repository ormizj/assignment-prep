---
paths:
  - "apps/api/**"
  - "packages/proto/**"
  - "packages/grpc-client/**"
  - "**/server/**"
  - "**/routes/**"
  - "**/handlers/**"
  - "**/trpc/**"
  - "**/*.proto"
---

# API surface — authn, authz, validation

Every RPC handler is a trust boundary. The client is attacker-controlled; the proto schema is a shape
contract, not a security control. A field being typed `string` in the proto says nothing about its length,
content, or whether this caller may send it.

## The two-step check every handler needs

1. **Authenticate** — who is calling? A missing or unverified token must reject before any work happens.
2. **Authorise** — may *this* caller do *this* to *this object*? These are separate checks and the second
   is the one that gets skipped.

## IDOR is the highest-yield bug class here

Any identifier that arrives in a request — `userId`, `postId`, `commentId`, `bookmarkId` — must be checked
for ownership or role before it is used. Pattern to hunt:

```
handler receives id from request  →  repo.findById(id)  →  returns it
```

with no step asserting the caller owns it or has a role permitting it. Read every handler that takes an id
and answer: *what stops me passing someone else's?* Pay particular attention to:

- **Admin services** — is the admin check on every method, or only on the first one someone remembered?
- **Mutations on nested resources** — deleting a comment usually needs a check against the comment's
  author *and* the post's author.
- **Bulk or list endpoints** that take a filter, where the filter is trusted to scope the results.

## Input validation

Validate **before** the value reaches a service or query. Check for: unbounded strings and arrays, missing
numeric ranges, pagination limits that can be set to `Number.MAX_SAFE_INTEGER`, enum fields accepting
arbitrary values, and fields that are optional in the schema but assumed present in code.

## Errors

- **Never swallow.** An empty `catch`, a `catch` that only logs, or one returning a default value hides
  failures and is a reliability finding in its own right.
- **Never leak.** Stack traces, SQL text, file paths, and internal ids in an error returned to a client are
  an information-disclosure finding. Map to a status code and a safe message; log the detail server-side.
- Use the correct gRPC status code — `NOT_FOUND` where the caller may not know the object exists,
  `PERMISSION_DENIED` where they may. Returning `NOT_FOUND` for an unauthorised object is often the
  *correct* choice, because `PERMISSION_DENIED` confirms the object exists.

## Scale

No unbounded queries. A list RPC with no limit works on seed data and falls over in production — flag it
even when it is not the bug you were sent to find.
