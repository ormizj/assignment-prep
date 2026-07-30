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
├── settings.json          # permissions.defaultMode: "plan", plus permissions.allow
├── settings.local.json    # enableAllProjectMcpServers — must stay in this file
├── rules/                 # standing constraints on how code is written
├── skills/                # procedures invoked as /name
└── agents/                # subagent definitions
.mcp.json                  # project-scoped MCP servers (playwright)
```

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

## Per-assignment checklist

Once the stack is known and the real script names exist:

- Fill in `permissions.allow` in `.claude/settings.json` (it ships empty). Syntax:
  `Bash(npm run:*)`, and note that `:*` is only recognized at the end of a pattern.
- Leave `enableAllProjectMcpServers` in `.claude/settings.local.json`. In an untrusted folder —
  which a freshly cloned assignment repo is — it is only honored from a settings file that is
  not checked into the repo.
- `.claude/settings.local.json` lands untracked in the assignment repo. Bootstrap does not touch
  the target's `.gitignore`; add it yourself if the repo doesn't already ignore it.

`rules/`, `skills/`, and `agents/` currently ship empty.

See [CLAUDE.md](CLAUDE.md) for the reasoning behind the settings split, the permission-rule
syntax notes, and why the bundle is a zip rather than a copy.
