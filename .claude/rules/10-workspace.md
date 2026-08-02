# Workspace — pnpm + Turborepo monorepo

## Expected layout — verify before trusting

This is the **expected** shape, not a verified fact. `/audit` step 0 re-derives the real layout from
`pnpm-workspace.yaml`, `turbo.json`, and the root `package.json`, and **rewrites this file if they
disagree**. Do not reason from the map below once the real one is known.

```
apps/api            backend service (gRPC + protobuf)
apps/client-user    TanStack Start + React 19
apps/client-admin   TanStack Start + React 19
packages/db-schema  Drizzle ORM schema
packages/proto      protobuf service definitions
packages/grpc-client  generated/typed client
packages/ui         shared components (StyleX)
packages/shared-types
tooling/typescript  shared tsconfig
db/migrations
```

Toolchain: **pnpm workspaces** + **Turborepo** · TypeScript strict · **SQLite + Drizzle** ·
**Biome** for lint/format (not ESLint/Prettier) · **Vitest** unit · **Playwright** e2e.

Expected scripts: `dev`, `dev:user`, `dev:admin`, `dev:api`, `build`, `typecheck`, `lint`, `lint:fix`,
`test`, `test:unit`, `test:e2e`, `db:generate`, `db:migrate`, `db:seed`, `proto:generate`, `clean`.
Confirm against the root `package.json` before running any of them.

## Trace data flow across workspace boundaries

A bug is rarely contained in the package where it shows up. The request path runs:

```
apps/client-*  →  packages/grpc-client  →  packages/proto  →  apps/api handler
                                                            →  service layer
                                                            →  Drizzle query  →  SQLite
```

- **Follow the whole path before diagnosing.** A slow page may be an N+1 three packages away; a type that
  is `string | undefined` in the client may be non-nullable in the proto.
- **A change in `proto`, `shared-types`, or `db-schema` has N consumers.** Before editing one, grep for
  importers across every workspace — `packages/*` are imported by name, not relative path, so a naive
  file-local search misses them.
- **Generated code is not source.** If `grpc-client` or proto output is generated, fix the generator input
  and regenerate; editing generated files is reverted by the next build.

## The environment is fixed

Do **not** change the Node version, the package manager, Turborepo, or the base build configuration.
Assume the infrastructure is intentional and correct. The single exception: when a tooling script or config
*is itself* the defect you are diagnosing — then fix it, and say in the commit body why it was the bug
rather than the baseline.

This matters because a diff that bumps a Node version or swaps a package manager reads as scope creep and
buries the actual fixes.
