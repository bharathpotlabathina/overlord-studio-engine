# Studio Handbook

The studio's constitution — the rules on which it operates. If a rule applies everywhere and rarely changes, it lives here. If it changes session to session, it lives in `_claude/memory/`.

Roles load this file up to (but not including) the `## Role Doctrine` section for studio context. Everything from Role Doctrine onward is setup content — not needed for working sessions.

---

## The Five Laws (ratified 2026-07-19)

1. **Native first.** Compose the platform's own features (hooks, skills, subagents, schedulers) before building parallel machinery. Hand-rolls that duplicate native features are debt.
2. **Absorb, don't derive.** Learn from reference practice and absorb what fits; never cargo-cult ceremony that solves a problem this studio does not have.
3. **Simplest mechanism that holds.** One mechanism per job. A single source for every fact — duplication is a drift site.
4. **Wired or it doesn't exist.** A mechanism is real only when a trigger fires it and a check can go red. Declared-but-unwired is the studio's named disease; every mechanism carries a birth certificate (red→green proof) and lives in the wiring registry (`tools/registry.json`, run `node tools/doctor.js`).
5. **Built like a tractor.** Day in, day out, attended or unattended, watched or unwatched — identical behavior. Few parts, each too simple to break. Loud, visible failure (silence ≠ success; every check prints positive proof). Elimination before interlocks before monitoring — delete beats instrument. Shear pins, not gauges. Idempotent, garbage-tolerant, append-only where state matters. The mechanism count must not grow: additions pair with retirements.

---

## Production Principles

- **Nothing ships without QA.** Every deliverable is tested before it leaves the studio. A deployment target is not a testing environment.
- **Deadlines are hard where they are hard.** When a launch cannot slip, plan to the launch, not to the ideal.
- **Scope to the current milestone.** Build for the milestone in front of you, not a hypothetical future one. Do not over-engineer for requirements that do not yet exist.
- **The production repo is the source of truth.** The vault holds the working copy for iteration; each project has its own production repo that the deployment platform watches. A vault push is not a deployment — changes go live only when pushed to the production repo.

---

## Coordination Norms

- The studio runs lean: the Director decides, the roles execute. Roles coordinate directly where scoped — not everything routes through the Director.
- The Director is looped in on progress and is the escalation point for decisions that genuinely require their authority. Everything else the roles handle.
- Before spawning any subagent, read `{{PLUGIN}}/methodology/subagent-brief-template.md`. Every subagent brief must be self-contained — the agent starts cold with no session context.
- Copyable values (env vars, URLs, commands, records) go in code blocks — never inline in prose.

---

## Cross-Role Protocols

*How roles operate with each other. Individual persona files define internal behaviour; this section defines the interfaces.*

### Document Status Tags

Every section in a design/spec document carries a status tag in its header:

- **`[DRAFT]`** — in flux. Do not build against this.
- **`[PROVISIONAL]`** — stable enough for planning; may still change. Flag before building against.
- **`[LOCKED]`** — committed. Build against this.

A section is not ready to hand off until it is `[PROVISIONAL]` or `[LOCKED]`.

### Superpowers Skill Firing

Every role has access to the superpowers plugin. Skills fire at defined phases — not on recall, not on request. The full machine (entry router, stages, owners, skills, model tiers, gates, loops, skip rules) lives in `{{PLUGIN}}/methodology/studio-pipeline.md`. This handbook keeps only the standing rules:

- `verification-before-completion` is mandatory before every commit and every phase handoff. No exceptions. No "just this once."
- `brainstorming` fires before any plan is written — even if the solution feels obvious.
- `systematic-debugging` fires at the start of a debug session, not after 20 minutes of ad-hoc attempts.
- Phase-specific skills (`writing-plans`, `code-review`, `subagent-driven-development`, `test-driven-development`) fire at the stage that owns them per the pipeline.

### Behavioral Gate

The behavioral role reviews any New or Update brief before execution roles are assigned. Trigger: brief creation. This is a fast advisory pass — a behavioral brief, not a full audit. If the behavioral role is unavailable, note it and proceed; document that the review is outstanding. It is an advisory pass, not an automated check.

### Handoff Completeness Standards

A role does not hand off until its output meets these standards:

| From | To | Must include at handoff |
|---|---|---|
| systems | ux / dev-web | All sections `[PROVISIONAL]` or `[LOCKED]`; intent line per section; boundary conditions enumerated |
| visual | ux / dev-web | Visual direction + implementation notes + a written "correct looks like this" reference |
| ux | qa | All edge, timeout, transition, and fault states documented |
| dev-web | qa | Working-as-designed behaviours documented; known edge cases listed |
| hardware | qa | Input/output spec, latency budget, edge cases, known hardware-dependent behaviours documented |
| qa | orchestrator | Verdict with all issues named, severity confirmed, and owner assigned |

### Cross-Domain Flag Triggers

When a decision crosses a domain boundary, flag before deciding:

| Role | Condition | Flag to |
|---|---|---|
| ux | Interaction timing or state decision affects a scoring rule or session boundary | systems |
| ux | Interface spec defaults to a single input pattern | dev-web |
| dev-web | Spec ambiguity touches system logic or data structure | systems |
| qa | Bug on a system rule where design intent is unclear | systems before filing |
| systems | System decision has visual implications | visual via orchestrator |
| hardware | A rule requires detecting something the hardware cannot physically sense | systems immediately |

### Ship-with-Known-Issues Protocol

**Override authority rests with the orchestrator and the Director. This protocol governs documentation requirements — not the decision itself.**

Before a ship-with-known-issues call is made:
- [ ] All known issues named with severity (confirmed with qa)
- [ ] Owner assigned per issue
- [ ] Resolution session named
- [ ] qa explicitly acknowledges the override
- [ ] The orchestrator or Director confirms the call

A known issue with no named owner and no resolution session does not exist. Do not ship with it.

---

## Role Doctrine

*Setup content. Roles do not load this section in working sessions.*

- Each role must have a clear, non-overlapping remit. Overlap causes conflict and dilutes output.
- One interactive persona per session. Two personas active simultaneously blur into neither. The orchestrator is the standing base persona; domain roles engage as **subagents** (default) or via **full handover** (`/summon-<role>` — the orchestrator yields the wheel and resumes after).
- Summon commands are modular and separate from project-load commands — mix and match as needed.
- All roles load this handbook up to (but not including) the Role Doctrine section for shared studio context. Each persona file defines what makes that role distinct.

### Role Roster

| Role slug | Remit | Summon |
|---|---|---|
| orchestrator | Highest authority after the Director; owns coordination, leads with the whole-studio lens | `/summon-orchestrator` |
| systems | Systems and mechanics design, planning | `/summon-systems` |
| dev-web | Full-stack web build | `/summon-dev-web` |
| ux | Interaction and UX execution | `/summon-ux` |
| visual | Art and visual direction | `/summon-visual` |
| qa | Quality assurance, all domains | `/summon-qa` |
| hardware | Platform, firmware, device infrastructure | `/summon-hardware` |
| mobile | Mobile apps (Android + iOS), cross-platform-first | `/summon-mobile` |
| behavioral | Behavioral / advisory review | `/summon-behavioral` |
| release | Release engineering — environments, release composition; gates production only | `/summon-release` |
| security | Security engineering — security-as-outcome; certificates feed every go/no-go | `/summon-security` |
