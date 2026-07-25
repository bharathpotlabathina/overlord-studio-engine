# Overlord Studio Engine

v0.2.0 · by Bharath Potlabathina

A structured **studio engine** for Claude Code: a team of role-based personas, a shared methodology (planning → build → QA → verification), and the machinery to skin them to a theme of your choosing — all wired to **your own vault** of memory, projects, and context.

You bring the vault. The engine brings the studio.

> **Public preview.** Shared openly to try and evaluate. See `LICENSE` for terms.

---

## What it is

The engine ships the studio's *brain* — personas, playbooks, hooks, tools — as an installable plugin. It does **not** contain any personal setup: no owner persona, no private data. On first run you generate your own **Flavour** (the theme/naming skin), and it wires itself to a vault directory you own.

Companion product: **Atlas** (the architecture-mapping tool) — the two are designed to travel together, but each installs independently.

## Requirements

- Claude Code
- A directory to use as your **studio vault** (created for you if it doesn't exist) — this is where your memory, projects, and active context live, git-synced by you.

Runs on **macOS, Linux, and Windows** — the runtime is Node (which Claude Code always provides), with OS detection where platforms differ (memory is linked via a directory *junction* on Windows, a symlink elsewhere). The macOS/Linux paths are verified; **Windows is written with OS-detection and reasoned but not yet certified on a real Windows box** — see `test/windows-smoke.md` for the ~20-minute verification checklist.

## Install

```
/plugin marketplace add https://github.com/bharathpotlabathina/overlord-studio-engine
/plugin install overlord-studio-engine@overlord-studio-engine
```

(Working from a local clone? `/plugin marketplace add /path/to/your/clone` works the same way.)

Then set the **`vault_path`** config when prompted (or point it at an existing vault), and run first-time setup:

```
/studio-setup
```

`/studio-setup` scaffolds the vault, links memory into `~/.claude`, points git hooks at the plugin, prints a permissions allow-list to paste, and runs the **Flavour** first-time-user funnel. It's idempotent — safe to re-run; the session-start wiring re-runs the heal automatically each session, and `/login` re-runs it on demand.

> The first run is prompt-heavy (each setup step is permission-prompted) until you paste the allow-list from Step 5. After that, sessions are quiet.

### Verify your install

From the plugin/clone directory, two commands prove the engine is healthy — no setup needed:

```
node --test tools/test/*.test.js    # the full engine test suite
node tools/doctor.js                # the wiring registry health check
```

Both must come back clean (suite all-pass; doctor reports every mechanism green).

## What this costs to run

Every role runs on **Sonnet** by default — the `pro` profile, safe for any Claude plan, never leaves it.

Opt into the `max` profile (`profile=max` in `_claude/.studio-config`) and two things escalate: planning (Systems) and security certification (Security) dispatch to **Opus** — a handful of calls per project, not a standing cost — and the mandatory final whole-branch review escalates to **Fable** when it's available on your plan. Everything else, on either profile, stays on Sonnet.

## Flavour — the theming layer

Instead of shipping a fixed persona, the engine generates yours. The FTUE funnel walks **flavour? → genre → universe → faction → relationship register**, then produces an honorific, a mood, role names, light thematic language, and how the team regards you. You choose the register from five options — Sovereign, Council, Crew, Mentor, or Straight (plain professional, no theater) — nothing is hardcoded; skip the question and it defaults to Council.

- `/flavour` — view, switch, rename, or turn Flavour off (drops to a neutral/professional skin).
- Decline the funnel and the studio runs neutral out of the box.

## The roles

Summon any role for deep interactive work; the orchestrator dispatches bounded work to the others as subagents by default.

| Command | Role |
|---|---|
| `/summon-orchestrator` | Orchestrator — strategy, PM, dispatch (the default voice) |
| `/summon-systems` | Systems / planning |
| `/summon-dev-web` | Web build + deploy |
| `/summon-ux` | Experience design — game UX, physical installs, projection & spatial |
| `/summon-visual` | Design direction — visual, brand, copy, game art + audio |
| `/summon-qa` | QA / verification |
| `/summon-hardware` | Physical sensing & projection — rigs, CV build, calibration, install lifecycle |
| `/summon-mobile` | Mobile — Android/iOS app build + app UX (cross-platform-first) |
| `/summon-game` | Game build — Unity/engine dev, game design, levels, netcode |
| `/summon-behavioral` | Behavioral / verification counterweight |
| `/summon-release` | Release engineering — environments, release composition; gates production |
| `/summon-security` | Security engineering — security certificates feed every go/no-go |

Other commands: `/login` · `/logout` · `/flavour` · `/project-health` · `/context-budget` · `/silent-failure-hunter` · `/atlas-propose` · `/atlas-map-review` · `/update-source-of-truth` · `/retro-integrate`.

## Structure

```
.
├── .claude-plugin/          # plugin + marketplace manifests
├── personas/                # role kernels + tone contract (the brain)
├── methodology/             # studio handbook, pipeline, playbooks, doc protocol
├── flavours/                # _neutral fallback skin + Flavour schema
├── skills/                  # studio-setup + flavour-setup (FTUE)
├── commands/                # slash commands
├── hooks/hooks.json         # session wiring (setup, rules inject, vault sync)
├── tools/                   # setup, guards, map checker, Flavour resolver
├── README.md
└── LICENSE
```

---

**Overlord Studio · by Bharath Potlabathina**
