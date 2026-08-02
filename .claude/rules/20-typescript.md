---
paths:
  - "**/*.{ts,tsx}"
---

# TypeScript — types are the audit surface

Loose typing is not a style issue here. Every `any` is a place the compiler stopped checking, and bugs
concentrate exactly there. Treat a weak type as a lead, not a nitpick.

## Flag and replace

- **`any`** — explicit or implicit. Replace with the real type, or `unknown` plus a narrowing check.
  `any` on a value that crosses a package boundary is a finding worth reporting on its own.
- **Unchecked `as`** — a cast asserts something the compiler could not prove. Ask what happens when the
  assertion is wrong. `as unknown as T` is a double assertion and almost always hides a real mismatch.
- **`!` non-null assertions** used to silence a genuinely nullable value. If the value can be null at
  runtime, the `!` converts a type error into a production crash.
- **`@ts-ignore` / `@ts-expect-error`** — read what it suppresses. It is a comment marking a known bug.
- **Over-wide types**: `object`, `Function`, `Record<string, any>`, index signatures that erase known keys,
  optional fields that are actually always present (or vice versa).

## Where it matters most

Type holes at **package boundaries** (`packages/proto`, `packages/shared-types`, `packages/grpc-client`)
propagate: one `any` in a shared type erases checking in every consumer. Prioritise those over a local
`any` inside a single function body.

Check the strict flags actually in effect — `tooling/typescript` and each package's `tsconfig.json`.
A disabled `strictNullChecks` or `noUncheckedIndexedAccess` is a repo-wide finding, but changing it is
**not** a surgical fix: it will surface hundreds of errors. Report it, propose the incremental path
(enable per-package, or `noUncheckedIndexedAccess` first), and fix the specific defect it was hiding.

## When fixing

Tighten the type **and** verify the narrowed type is actually correct at runtime — a type change that
makes the compiler happy while the value is still wrong has fixed nothing. Run `pnpm typecheck` after
every type change; a tightened type in a shared package can break consumers you did not open.
