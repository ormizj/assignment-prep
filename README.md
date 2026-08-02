# assignment-prep

A pre-built Claude Code config bundle for timed take-home assignments.

When an assignment starts the clock is already running, and none of it should go to creating
`.claude/` directories, writing permission allowlists, or approving MCP servers one prompt at a
time. That work happens here, in advance. This repo packages the config into a zip; kickoff
costs one `unzip`.

It is not an application — no dependencies, no tests, no build step.

## Usage

**Here, whenever the bundle changes** — writes `boot/claude-config.zip`:

```bash
npm run bootstrap
```

**In the assignment directory, at kickoff:**

```bash
unzip ~/SynologyDrive/Projects/assignment-prep/boot/claude-config.zip
```

`unzip` prompts before replacing an existing file, which is what you want when the assignment
repo ships its own `.claude/`. To decide up front instead:

```bash
unzip -n ~/.../claude-config.zip   # keep the repo's files, add only what's missing
unzip -o ~/.../claude-config.zip   # overwrite without asking
```

## What lands in the assignment repo

```
.claude/
├── settings.json          # defaultMode "plan" + allow/ask/deny for pnpm & git
├── settings.local.json    # enableAllProjectMcpServers — must stay in this file
├── rules/                 # 2 always-on + 5 path-scoped; loaded natively
├── skills/                # /audit  /fix  /check  /handoff
└── agents/                # 5 read-only auditors
.mcp.json                  # project-scoped MCP servers (playwright, pinned)
```

**Skills**

| | |
|---|---|
| `/audit` | Kickoff. Hides `.claude/` from git, captures a green test baseline, maps the workspace, re-scopes the rule globs to the real layout, runs the five auditors in parallel, writes a ranked `AUDIT.md`. Fixes nothing. |
| `/fix <id>` | One finding → minimal change → verify → one atomic commit with the Problem / Root Cause / Fix / Migration justification. Refuses to bundle two findings. |
| `/check` | `typecheck` + `lint` + `test:unit`, report only. Cheap enough to run after every edit. |
| `/handoff` | T-minus 10 min. Writes up what you didn't fix, with diagnosis, plus the final summary. |

**Agents** — `security-auditor`, `performance-auditor`, `reliability-auditor`, `tooling-auditor`,
`types-auditor`. All read-only (`disallowedTools: Edit, Write`): they report, `/fix` applies.

Nothing else. **The bundle is the `INCLUDE` list at the top of `bootstrap.mts`** — an include
list, not an exclude list, so files added to this repo stay in this repo unless you put them on
it. That is deliberate: `README.md` and `CLAUDE.md` document the bundle rather than belonging to
it, and shipping them would drop assignment-prep notes into an employer's repo.

To ship something new, add its name to `INCLUDE` and re-run `npm run bootstrap`.

Missing entries are reported under `not found, skipped:` rather than failing the build — a
half-filled bundle is the normal state of this repo.

## Requirements

Node 22.18+ or 23.6+, which runs the TypeScript directly via native type stripping. On
22.6–22.17, add `--experimental-strip-types` to the `bootstrap` script in `package.json`.

**No dependencies — never run `npm install` here.** The zip is written by a small writer over
`node:zlib`, so there is nothing to install.

## Before test day

- **Pre-warm the MCP server** so nothing downloads under the clock:
  `npx @playwright/mcp@0.0.78 --help` and `pnpm dlx playwright install chromium`.
  `.mcp.json` pins the version deliberately — `@latest` hits the npm registry on every start, and a slow
  or flaky fetch during a timed assessment is pure loss.
- **Verify `pnpm` is installed** (`npm install -g pnpm`) and Node is v22+.
- **Rehearse `/audit` once** against any pnpm + Turborepo repo. Step 0 — the `.git/info/exclude` write and
  the baseline capture — is the part that must work; a typo discovered at minute 3 of 90 is expensive.

## At kickoff

- `unzip` the bundle, then run `/audit`. Its step 0 adds `.claude/`, `.mcp.json`, and `AUDIT.md` to
  `.git/info/exclude`, so this tooling never lands in the diff a grader reads. That's local-only —
  bootstrap still doesn't touch the target's `.gitignore`, which would itself show up in the diff.
- Keep `defaultMode: "plan"` for the read phase; switch to `acceptEdits` with **Shift+Tab** once `/audit`
  is done and you're in the `/fix` loop.
- Leave `enableAllProjectMcpServers` in `.claude/settings.local.json`. In an untrusted folder — which a
  freshly cloned assignment repo is — it is only honored from a settings file not checked into the repo.
- Confirm the workspace layout matches `.claude/rules/10-workspace.md`; `/audit` rewrites it if not.

See [CLAUDE.md](CLAUDE.md) for the reasoning behind the settings split, the permission-rule
syntax notes, and why the bundle is a zip rather than a copy.
