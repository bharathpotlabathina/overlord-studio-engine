# Runbook — QA release pass

Owner: QA Engineer. Standing on `release-composed`. Output: a verdict — CLEAR
or HOLD — written into the composition record, findings tagged
BLOCKER/WARNING/MINOR. One gate, two certificates: yours and the Security
Engineer's each bind on their own artifact; the Release Engineer's go/no-go
consumes both and does not proceed without either.

## 1. Scope from the composition record
Pull the inventory from the composition record (`release-compose.md`'s
output) — every feature/commit/migration going in is your test surface.
Anything not listed does not ship, and does not need testing here. If a
composition record doesn't exist yet, this isn't a QA release pass — that's a
normal commissioned QA cycle; the standing pass only fires once composition
has produced the record it writes into.

## 2. Risk-first order
Test the highest-risk domain first, never the happy path:
- **Web admin / ATS** → auth and session integrity, then data writes.
- **LBE / cabinet** → hardware state, then operator recovery flows.
- **API / backend** → error and failure paths, then the happy path.
- **Anything touching a migration** → the expand/contract boundary and the
  couplings named in the composition record. An unnamed coupling was already
  a compose blocker; a named one is still yours to exercise.

## 3. Verify against the real artifact
Every finding is confirmed against staging (or the deploy target named in the
composition record) — never against memory of how the build should behave. A
finding that can't be reproduced against the real artifact is not filed.

## 4. Persona-instrument invocation
If the release touches operator-facing UI (admin panel, cabinet control
surface, any screen a non-builder operates), invoke the persona-instrument
toolkit:
- **Average-operator persona** — usability under real operating conditions:
  clarity, fatigue, friction, time-to-task.
- **Owner-lens persona** — commercial-credibility and efficiency-at-volume
  read.

Both are QA instruments — versioned, calibrated definitions you maintain, not
staff. They report usability findings only, never a fun-verdict. If the
release is playtest-relevant (a new mechanic, a tuned system), the persona
toolkit still doesn't play it — that's harvested from human playtests (§5),
not simulated.

## 5. Playtest harvest & telemetry payload
When a human playtest ran for this release, you own the instruments and the
harvest — not the play. Define what the telemetry payload captures ahead of
the playtest, not retroactively: session length, replay rate, walk-away
points, plus any release-specific event worth tracking — the location-test
metric sheet. Fold the harvest into the pass as evidence, not as a substitute
for your own testing: a good playtest number does not clear a Critical bug.

## 6. Bug report format
Every finding:
```
Title: [what broke]
Severity: Critical / High / Medium / Low
Environment: [browser, device, OS, page/screen]
Steps to reproduce: 1. 2. 3.
Expected: [what should happen]
Actual: [what happened]
Notes: [root cause hypothesis if known, related findings]
```
Severity: Critical blocks core function or causes data loss · High breaks a
feature for real users · Medium degrades experience · Low is cosmetic.

## 7. Verdict
- **CLEAR** — no unresolved Critical or High; Medium documented as known
  issues; Low logged for next pass.
- **HOLD** — any unresolved Critical, or a High that affects a core user
  flow.

Tag every finding **[BLOCKER]** (Critical/High, forces HOLD) /
**[WARNING]** (Medium, doesn't block) / **[MINOR]** (Low, logged for next
pass). Write the verdict and the tagged findings into the composition record
under a QA section — this is where the go/no-go gate reads it. Severity
Critical or High also gets flagged to the Orchestrator immediately; don't
wait for the full pass to finish before raising it.

## Scope note
A single-feature change or one-line fix doesn't fire this runbook's full
weight — that's a normal verification pass (see `qa-kernel.md` §Behavioural
Rules, effort-matching rule). This runbook is for the standing pass
`release-composed` fires: a full build, a multi-domain release, anything
ending in a ship/hold call. Pair with `/silent-failure-hunter` on the same
trigger line.
