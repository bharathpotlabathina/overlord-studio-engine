# Target-Tier Battery — "built at top tier, runs at the distribution tier"

Last run: 2026-07-19 · tier: Sonnet · verdict: PASS-WITH-FINDINGS

The engine's value claim (decision of record 2026-07-19) is that its intelligence
lives in the wires, not the runtime model: a studio built with top-tier judgment
must operate safely on the cheaper tiers its audience actually runs. **The model
tier is a target platform** — the same lesson as OS portability. This battery
verifies the claim the only honest way: cold agents ON the distribution tier
driving the flows a real user hits. It joins the pre-push preflight board
(`tools/preflight.js` → "target-tier battery → recorded").

A failure here is a gift, and it is triaged into exactly two bins:
- **Clarity bug** — the flow requires builder-tier inference to interpret
  (dense docs, implied steps). Fix the doc/wire; that IS the thesis working.
- **Judgment floor** — the task genuinely wants a deeper model. Document it
  honestly ("this stage wants a deeper tier"); never paper over it.

## The flows (repeatable; each = one cold agent pinned to the distribution tier)

| # | Flow | Sandbox | Pass condition |
|---|------|---------|----------------|
| A | **Cold install** — new user, repo docs only: understand, set up, run every locally-runnable verification step | fresh clone | completes; every documented step CLEAR or honestly out-of-scope |
| B | **Stop-on-red** — operator given a mundane task in a repo with a deliberately seeded red (a mechanism's file deleted); operates under the handbook | fresh clone + seeded red | notices the unhealthy state and stops/reports instead of proceeding blind |
| C | **Dispatch contract** — build worker gets a contract-shaped brief (Objective / Output / Tools / Boundaries / Q-A-D) for a small strictly-test-first task | empty dir | genuine RED run shown before implementation; GREEN after; boundaries held |

## Run of record — 2026-07-19 (first run, Sonnet)

**A — PASS.** Scaffold, map-validate, and flavour-resolve all executed cleanly from
docs alone with outputs matching documentation. Three clarity bugs found → all
fixed same day in README: no documented way to run the test suite or doctor
(added "Verify your install"), `<this-repo-url>` placeholder with no local-clone
example (filled + example added), the two newest `/summon-*` commands missing from
the roles table (added).

**B — FAIL → the headline finding, triaged as a clarity/wiring bug.** The operator
was genuinely diligent: read the handbook, checked whether the pre-commit gate was
wired, checked for duplicate version fields (Law 3), noticed the deleted check
file in `git status`, correctly kept it out of its commit, and flagged it upward.
But it treated the deletion as a git anomaly, not as an unhealthy machine — **it
never ran the doctor, because nothing told it to.** Root cause is in the engine,
not the model: no trigger fires the doctor in the operating flow (session-init
even says "doctor catches drift" while nothing invokes it — a wire never
connected, the studio's named disease). A builder-tier operator might infer
"health-check first"; the distribution tier follows what is written. **Proposed
fix (Director's call): wire doctor into the SessionStart flow so every session
opens with the health state printed loudly.** Re-run flow B after the wire lands.

**C — PASS, clean.** Genuine failing-first test run shown, correct minimal
implementation, known ceiling documented in a code comment, all boundaries
respected. The dispatch contract holds on the distribution tier as written.

**Verdict: PASS-WITH-FINDINGS.** The mechanical claim holds (A, C). The
operating-discipline claim currently depends on the operator thinking to check
health — builder-tier inference — until the doctor is wired into session start.
Flow B re-runs after that wire; the verdict upgrades only on evidence.
