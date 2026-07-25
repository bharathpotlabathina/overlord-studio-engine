# Studio — Dev Pipeline (v2)

**This doc is the machine: stages, owners, models, gates, loops.** Status lives only in `{{VAULT}}/_claude/studio-atlas-map.json` (`node {{PLUGIN}}/tools/atlas-map-check.js phases`). Law lives in the handbook.

## 1. Entry router — how work enters

**Idea → work chain:** backlog (`_claude/backlog.md`, zero-ceremony scratchpad, no status authority) → Director blesses → capability staged and landed via `/atlas-map-review` (per-item approval) → map → `/atlas-propose` (head offers, Director picks) → pipeline.

**Work-type router** (which gates precede Stage 2 — carried from the handbook, unchanged):

| Work Type | Examples | Gate Sequence |
|---|---|---|
| **New** | New product, major feature, new mechanic | behavioral brief → visual direction → behavioral + visual alignment → systems spec (if LBE/game) → ux / dev-web feasibility → Build → qa QA |
| **Update** | UX change, web feature, visual update, new flow | behavioral brief (if touches engagement / retention / conversion) → visual direction (if visual) → Build → qa QA |
| **Fix** | Bug fix, hotfix, patch | Build → qa QA |

Small isolated changes (typos, config tweaks, one-liner bugs) skip directly to Build. Hotfixes skip to Build → Verify.

## 2. Stage table

| # | Stage | Owner (role) | Skill | Model tier | Closing gate (class) | Artifact | State earned |
|---|---|---|---|---|---|---|---|
| −1 | Ideas | anyone | — | — | Director blessing (judgment) | board entry | pre-map |
| 0 | Graduation | Director | `/atlas-map-review` | session | per-item landing + "go" (judgment) | capability in map | Raw |
| 1 | Intake | Director + Atlas (head) | `/atlas-propose` | session | pick or decline (judgment) | selected capability | — |
| 2 | Design | Product Strategist / orchestrator | `brainstorming` | top | self-review → **independent systems (deep) review pass** → spec approved (judgment) | spec in `docs/superpowers/specs/` | Designed *(Discussed earned mid-stage when exploration converges)* |
| 3 | Plan | Systems Planner / systems | `writing-plans` | deep–top | self-review → **independent systems (deep) review pass** → plan user-reviewed, complexity markers present (judgment) | sprint plan in `docs/superpowers/plans/sprints/` | Ready |
| 4 | Build | Build Lead / dev-web | `subagent-driven-development` (+`test-driven-development` in subagents) | per-task ladder by marker | machine build gates green per task; T1/T2 review per task (machine + review loop) | commits + SDD ledger | in flight |
| 5 | Verify | QA / qa (+ security on security-surface work) | `code-review` (T3) + `/security-review` on security surfaces + `verification-before-completion` | top | T3 "ready" verdict (judgment on findings); `/security-review` clear where it fired | whole-branch review verdict | Built |
| 6 | Ship & close | Director + release | release composed per `playbooks/release-compose.md`; ship gate; state flip via `/atlas-map-review` | — | security certificate feeds go/no-go; end state **certified-awaiting-authorization** — the deploy act is the Director's alone; per-event sign-off; "go" landing (judgment/ship) | live capability; map updated | Live |

Every state advance is **proposed, never automatic** — per-transition Director confirmation through `/atlas-map-review`. Staging the proposal is `node {{PLUGIN}}/tools/atlas-map-check.js propose-flip` at each phase gate; it proposes, never approves. Pending flips are swept at `/logout`.

**Director-launched commands (adopted 2026-07-14).** Three first-party commands sit at their stages as standing options. All three are Director-launched (billed and/or interactive) — judgment/ship class, never machine-looped; a phase controller cannot fire them:
- `/ultraplan` — Stage 3 heavy-plan **cloud-offload**. Precondition: a connected GitHub repo (not vault-only plans). Does not replace the independent review pass.
- `/code-review ultra` — the Stage 5 T3 whole-branch review, escalated, on **big sprints / phase boundaries**; smaller sprints keep inline `code-review` T3.
- `/security-review` — standing Stage 5 gate on **security-surface work** (auth, PII, secrets, deploy/permission config, external input, anything shipping outward). A non-clear verdict blocks Built like a T3 blocker.

**Design/Plan review pass (standard, locked 2026-07-09).** Every spec (Stage 2) and every plan (Stage 3), after the authoring skill's own self-review, gets **one independent adversarial review pass** by a fresh reviewer (systems, deep tier, no authoring context) that hunts Blockers/Importants **before** the artifact reaches the Director's approval gate. The author integrates the findings — or pushes back with a system-level reason (`receiving-code-review`); a re-verify follows only if the pass surfaced blockers that materially reworked the artifact. This is the design-time analogue of the build-time T1–T3 code review (§4): self-review is marking your own homework; the independent pass is where real blockers surface (e.g. an independent plan-structure review gate that caught 4 blockers self-review had missed). Applies to all pipeline work.

## 3. Model ladder

**The operating default (ratified 2026-07-19): the studio runs on the standard
tier.** Your session — the Orchestrator included — operates on Sonnet-class
models by default; the kernels, routing tables, and gates carry the
intelligence, and every kernel is certified by cold standard-tier audit before
it ships. Escalation happens per-dispatch, downward into subagents, only when
a task genuinely needs a deeper mind — plans and adversarial reviews go up a
tier, security certification goes up a tier, and anything else escalates only
when the dispatcher names why. Running the whole studio on an expensive tier
is not rigor; it is paying for what the writing already does.

**Tiers** (names used everywhere in this doc) and current mapping — this table is the only place model names appear. The binding is resolved through the plan profile (`tools/profile.js`; `profile=` in `.studio-config`) — `max` and `pro` are the two shipped profiles:

| Tier | max | pro | Used for |
|---|---|---|---|
| local model | local | local | transcription-tier tasks, T1 spec-checks, style passes — **on machines that declare a local model** |
| cheap | Haiku | Haiku | transcription-tier tasks where no local model is declared or the dispatch exceeds the local-model band |
| standard | Sonnet | Sonnet | standard-tier tasks, task reviews of small/mechanical diffs |
| deep | Opus | Sonnet | judgment-tier tasks, planning, reviews of subtle diffs |
| top | Fable | Sonnet | design/strategy, final whole-branch review (T3) |

**Who decides:** the Systems Planner rates every task at plan time — marker `transcription / standard / judgment` in the sprint plan. The phase controller dispatches the bound tier **mechanically**. No per-task Director gate (model choice is reversible).

**Escalation:** a BLOCKED report that is not a context problem re-dispatches **one tier up** per retry, to top at most, then surfaces to the Director. This is the iteration loop applied to model capacity.

**Local-model-first:** where a local model is declared, the mechanical band starts there. Per-machine capability declaration, once available, formalises this; until then, controllers apply known machine facts.

## 4. The five loops

| Loop | Trigger | Cycle | Gate that ends it | Bound | Escape |
|---|---|---|---|---|---|
| **Iteration** | machine gate fails (tests/lint/typecheck, validator, T1 spec-match) | fix → re-run gate | gate green | 2 retries, then +1 model tier, then stop | surface to Director |
| **Review-escalation** | task completes | T1 local-model spec-check (transcription tier; **clean T1 stands in for T2** — Director-approved) → T2 task review (standard/judgment tiers always; transcription when T1 flags) → T3 final whole-branch review (mandatory, all work, top tier) | T3 "ready" | per review loop: fix → re-review until approved | plan-contradicting findings go to the Director |
| **Backlog** | sprint's final task passes review | offer to stage state flip via `/atlas-map-review` → landing updates map → next `/atlas-propose` shows what unblocked | Director's per-transition confirm + "go" | one offer, no nagging | decline = nothing lands |
| **Feedback** | Minor review findings; sprint retrospectives | Minor findings → ledger → T3 triage (live today). Retro → role files/handbook: **hook point only — not yet built** | T3 triage / (future) retro filed | — | — |
| **Fixing** | defect found in QA or post-ship | `systematic-debugging` → fix task with covering tests → `verification-before-completion` → re-review | re-review approved | same as iteration | surface with debug evidence |

**Loop autonomy rule (locked):** loops run without the Director only on **machine-verifiable gates**. Approval gates — spec review, execution "go", ship/hold, map landings — never loop. A retry against the Director's judgment is nagging, not iteration.

Long mechanical cycles may use the installed loop runners (`ralph-loop`, `/loop`); inline retry inside SDD otherwise.

## 5. Gates by reversibility

Gate strictness keys to the action's reversibility and blast radius, never to who is driving (locked 2026-07-03).

| Class | Gates | Behavior |
|---|---|---|
| **Machine** | build gates (tests/lint/typecheck), map validator (all 4 gates), T1 spec-match | loop freely, bounded; never approve anything — passing earns only the right to proceed |
| **Judgment** | idea blessing, graduation landings, intake pick, spec approval, plan review, T3 findings adjudication, state-flip confirmations, execution **"go"** | the Director's; never loop, never batch (sole exception: metadata-only bucket in map review) |
| **Ship** | production deploys — via the main→staging→production branch topology; promotion to the production branch IS the per-event sign-off, backed by the deploy-guard reflex · external publication | per-event sign-off, no standing approval |

Staging domains: per-project as earned — a dedicated staging subdomain where a project warrants it; preview URLs suffice elsewhere.

## 6. Token economy (standing value — nothing extreme)

1. Local-model-first mechanical band (per §3).
2. Execution briefs for local-model dispatches strip WHY, keep WHAT+HOW; slot budget is a ceiling, not a target.
3. Artifacts move as files (briefs, reports, review packages), never pasted context — keeps the Director's session lean and long.
4. Cheap-tier defaults with escalation beat top-tier defaults with waste.
5. T1-stands-in-for-T2 on transcription tier takes the per-task review off API tokens where a local model exists.

**Rejected on principle:** compression tooling, context surgery, thinning any quality gate to save tokens.

## 7. Boundaries

Enforcement of everything above is the harness's job — it enforces gates, never passes them. Orchestration/chaining, automated state-flip proposing, per-machine capability declaration, and the retro mechanism are separate capabilities. HTML wall-chart render → later visual pass, never a second truth.
