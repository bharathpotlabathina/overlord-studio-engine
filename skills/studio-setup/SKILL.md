---
name: studio-setup
description: First-run wiring for the studio plugin on a new machine. Use to set up the studio, wire the vault, do first-run wiring, or bootstrap a fresh install — it scaffolds an empty vault, links memory into ~/.claude, points git hooks at the plugin, prints the permissions allow-list, and runs the Flavour first-time-user setup. Idempotent and re-runnable; /login calls it so it self-heals each session. Do NOT use for changing personas or flavours after setup (that is /flavour), or for normal git/commit work.
---

# Studio Setup — first-run wiring

The plugin ships the studio's brain (personas, playbooks, hooks, tools) but a
plugin cannot scaffold the user's vault, create symlinks in `~/.claude`, set
`git config`, or edit `settings.json`. This skill does exactly those four
things, then runs the Flavour first-time-user experience. Everything here is
**idempotent** — safe to re-run; `/login` calls it every session to self-heal.

**Heads-up for the user (say this up front):** the first run is prompt-heavy —
each Bash step is permission-prompted individually until the allow-list (Step 5)
is pasted. After that, re-running completes cleanly and quietly.

## Inputs

- `vault_path` — where the studio vault lives (default `~/Documents/studio-vault`;
  ask the user if unset). Call it `V` below.
- `${CLAUDE_PLUGIN_ROOT}` — the installed plugin root (set by Claude Code). The
  engine's `tools/` and the `_neutral` Flavour fallback live under it.

Confirm `vault_path` with the user before writing anything.

## Steps 1–3 — Scaffold + memory link + git hooks (one cross-platform command)

A single Node script does all three: scaffolds the vault (idempotent, `_neutral`
Flavour copied from the plugin, Flavour pointer seeded to `none`), links memory
into `~/.claude` (a **junction** on Windows — no admin rights needed — a symlink
on macOS/Linux), and points `core.hooksPath` at the plugin's `tools/` for the
vault and every repo in `repos.local` (skip-if-different guard preserved). Runs
the same on macOS, Linux, and Windows (Node is guaranteed present):

```bash
node "${CLAUDE_PLUGIN_ROOT}/tools/studio-setup.js" all "<vault_path>"
```

(Run individual phases with `scaffold` / `link-memory` / `wire-hooks` in place of
`all` if you need to.)

Then confirm the scaffolded map validates (so a cold `/logout` runs clean):

```bash
node "${CLAUDE_PLUGIN_ROOT}/tools/atlas-map-check.js" validate "<vault_path>/_claude/studio-atlas-map.json"
```

## Step 4 — Plan profile question

Ask the user: "Which Claude plan runs this studio? (max / pro — pro is the
safe default; max unlocks Opus/Fable tiers for planning and review)"

Scaffold already seeded `profile=pro` into `.studio-config` (Steps 1–3). If
the answer is `pro`, nothing to do. If the answer is `max`, write it as
`profile=max` into `<vault_path>/_claude/.studio-config`, replacing the
`profile=` line.

## Step 5 — Permissions allow-list

A plugin cannot add `settings.permissions.allow`. Print this **plugin-era**
allow-list (git scoped to the vault via `-C`), substituting the real
`vault_path`, and ask the user to paste it into `~/.claude/settings.json` — or
offer to append it via Bash with their explicit consent. State plainly: the
first run is prompt-heavy until this is pasted, and re-running after is clean.

```
Bash(git -C <vault_path> pull *)
Bash(git -C <vault_path> add *)
Bash(git -C <vault_path> commit *)
Bash(git -C <vault_path> push *)
Bash(git -C <vault_path> rm *)
Bash(git -C <vault_path> status *)
Bash(npm install *)
Bash(pip install *)
mcp__Claude_Preview__preview_start
```

## Step 6 — Flavour first-time-user setup

Wiring done — now offer the Flavour funnel. Invoke the **`flavour-setup`** skill,
which runs the flavour? → genre → universe → faction funnel and generates the
user's Flavour bundle under `<vault_path>/_claude/flavours/`, then activates it.

If the user declines Flavour, the `active` pointer stays `none` and the studio
runs neutral/professional (the `_neutral` skins copied in Step 1). Either way,
`flavour.js resolve` returns a valid directory, so summons and the session
loader always have skins to read.

## Done — verify

- `flavour.js resolve` returns a valid dir (neutral if declined, else the
  generated Flavour):
  ```bash
  node "${CLAUDE_PLUGIN_ROOT}/tools/flavour.js" resolve --vault "<vault_path>"
  ```
- Re-run this whole skill any time — every step above is idempotent.
