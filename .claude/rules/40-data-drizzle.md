---
paths:
  - "packages/db-schema/**"
  - "db/**"
  - "apps/api/**"
---

# Data layer — queries, indexes, migrations

## Injection

Drizzle's query builder parameterises automatically; its raw `sql` template does **not** protect you if you
build the string yourself. Hunt for:

- User input concatenated or interpolated into a `sql` template rather than passed as a placeholder value.
- `sql.raw(...)` with anything derived from a request.
- Dynamic column or table names taken from input — these cannot be parameterised, so they need an
  allowlist, not escaping.
- ORDER BY / sort direction taken from a request string and dropped into the query unvalidated.

## N+1 is the highest-yield performance bug

The shape to grep for: a query inside a `for`/`map`/`forEach`, or an `await` per item in a collection.

```
posts = await getPosts()
for (const p of posts) p.author = await getUser(p.authorId)   // N+1
```

Fix with a join, or one batched `inArray(...)` lookup plus an in-memory map. Both preserve the response
shape exactly, which keeps the fix surgical and backwards-compatible. Check the *serialisation* path too —
a resolver that looks clean can still trigger a query per field.

## Indexes

Any column used in a `WHERE`, `JOIN`, or `ORDER BY` on a growing table needs an index. Cross-check the
Drizzle schema's declared indexes against the queries that actually run. A missing index is invisible on
seed data and fatal at scale — exactly the "breaks at scale" signal being graded.

## Transactions

Multi-write operations that must succeed or fail together need a transaction. Look for: create-then-update
pairs, counter increments alongside row inserts, and anything that leaves a dangling reference if the second
write fails. On SQLite also watch for write contention — long-running transactions block writers.

## Migrations

Schema changes ship **additive → backfill → narrow**, never as one destructive step:

1. Add the new nullable column / new table. Deploy. Old code still works.
2. Backfill and start dual-writing.
3. Only once nothing reads the old shape, add the constraint or drop the column.

A migration that renames or drops a column in a single step breaks any running instance of the old code.
Say this explicitly in the **Migration / Scale Considerations** section of the commit — demonstrating the
migration path is a graded criterion, and a security fix that needs a phased rollout is the best possible
place to show it.
