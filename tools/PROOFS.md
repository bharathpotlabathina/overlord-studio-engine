# Birth-certificate log (Stage 3, Law 4)

Append-only. One entry per mechanism: the red→green mutation proof, kept here
so "a check never seen red is a rumor" has an answer. Never edit a past entry;
a superseding proof gets a new entry.

---

## Task 0.1 — Wiring registry + `studio doctor` (2026-07-19)

**Files:** `tools/registry.json`, `tools/doctor.js`, `tools/checks/registry-schema-check.js`, `tools/test/doctor.test.js`.

**Red:** `node --test tools/test/doctor.test.js` before `tools/doctor.js` existed →
`MODULE_NOT_FOUND` / all 6 assertions failing (doctor.js not on disk).

**Green:** after implementing `doctor.js` → `node --test tools/test/doctor.test.js` →
`# tests 6 / # pass 6 / # fail 0`.

**Mutation checks (per Task 0.1 acceptance):**
- Remove a registered mechanism's trigger → doctor prints `dead wire — <id>: trigger missing (...)`, exits 1. (test 2)
- Add a file under a wiring root not claimed by any mechanism → doctor prints `orphan — <path>: ...`, exits 1. (test 3)
- Point every registered check at a passing state → doctor prints `checked N, found N green` + `mechanism count: N`, exits 0. (test 1)
- Mutate a check to always-pass, keep its trigger missing → dead-wire detection still fires (reads the filesystem directly, never trusts the check's exit code) → doctor exits 1. (test 5, the "silence != success" proof for this detector)
- Empty registry → doctor still prints `checked 0, found 0 green` explicitly rather than staying silent. (test 6)

**Full-suite regression:** `node --test tools/test/*.test.js` → `# tests 89 / # pass 89 / # fail 0` (83 pre-existing + 6 new).

**Live finding (feeds Task 0.2a):** running `node tools/doctor.js` against the real repo (registry seeded with only the bootstrap `registry-doctor` mechanism) reports `orphan — hooks/hooks.json: present under a wiring root, claimed by no mechanism`, exit 1. This is correct behavior, not a bug — `hooks/hooks.json` is a real undeclared wire in the old studio and is exactly the class of finding Task 0.2a's reality sweep exists to classify (migrate → gets a registry entry, or retire). Left unresolved here on purpose; Task 0.1's scope is the doctor engine, not the full seed (plan: "seed the registry with the mechanisms that already survive Phase 0.2").

**Cross-platform:** pure Node stdlib (`fs`, `path`, `child_process.execFileSync` spawning `node <script>`); no `flock`, no shell shebang exec, no symlink assumption — satisfies the B1 no-POSIX-only-primitive constraint.

---

## Task 0.2a — Reality sweep of the old studio + Law-5 baseline (2026-07-19)

**Files:** `docs/superpowers/absorption/2026-07-19-reality-sweep.md` (report) · `docs/superpowers/absorption/sweep-crosscheck.js` (one-shot cross-check, NOT a registered standing mechanism).

**Method:** six parallel read-only fleet agents (hooks / skills / setup scripts / playbooks / gates / git-hook wiring), every declared wire tested against the machine.

**Result:** 20 declared wires inventoried (12 live, 8 dead-or-duplicate), zero `unknown` disposition tags. `N_old_live = 12`, `N_old_declared = 20`, projected `N_new ≈ 17–21` → **the Law-5 projection FAILS under the live-only baseline** — surfaced as a Phase-0 finding for the Director per the plan's own instruction, recorded in `registry.json.law5Baseline`.

**Mutation check (per Task 0.2a acceptance):**
- Green: `node docs/superpowers/absorption/sweep-crosscheck.js` → `cross-checked 20 machine wires, all present in inventory`, exit 0.
- Red: removed the W10 row (`githooks:pre-commit`) from a scratch copy of the report → `SWEEP CROSS-CHECK FAILED: 1 machine wire(s) absent from the inventory: githooks:pre-commit`, exit 1.
- Restored: original report → green again, exit 0.
- The checker also fails loudly if it derives zero wires from the machine (silence ≠ success on the derivation side).

---

## Task 1.1 — Migration-number reservation ledger + duplicate-number pre-commit gate (2026-07-19)

**Files:** `tools/migration-guard.js` · `tools/test/migration-guard.test.js` · duplicate-number gate wired into `tools/pre-commit`.

**Red:** `node --test tools/test/migration-guard.test.js` before implementation → 5/6 fail (the 6th passed vacuously — both invocations erroring identically; noted, and it went red-able once real behavior existed).

**Green:** after implementation → 6/6 pass.

**Mutation / acceptance (plan Check A, run against the REAL gate in a scratch git repo):**
- Stage `migrations/017_add_users.sql` + `migrations/017_add_orders.sql` → `tools/pre-commit` exits 1: `COMMIT BLOCKED — migration number 017 claimed by more than one file`.
- Unstage one → exits 0.
- Commit `017_add_users.sql`, then stage a NEW `017_sneaky.sql` → blocked against the already-committed neighbour too (staged-vs-tracked collision path).

**Full suite:** 95/95 (89 prior + 6 new).

## Task 1.2 — Concurrent-claim atomicity self-check (2026-07-19)

**Files:** `tools/test/reservation-race.test.js`.

**Green (atomic primitive in place):** 8 concurrent claimers → `race check: 8 claimers, 8 distinct sequential numbers — coordination held`.

**Mutation (the plan's exact prescription):** replaced the atomic `mkdirSync` claim loop with a naive read-check-write (`existsSync` → 30ms spin → `mkdirSync {recursive:true}`, which never throws EEXIST) → test FAILS: `expected 8 distinct numbers, got ["017","017","017","017","017","017","017","017"]` — the historical four-branches-claiming-017 failure reproduced in miniature, proving coordination (not luck) is why the numbers are distinct. Restored the atomic version → 96/96 green.

**B1 compliance:** no `flock` anywhere; the primitive is `fs.mkdirSync` (atomic on every Node platform). POSIX-only grep over `tools/` clean.

---

## Task 1.3 — `infra-check` invariant script (2026-07-19)

**Files:** `tools/infra-check.js` · `tools/test/infra-check.test.js` · wired to SessionStart (`hooks/hooks.json`) + `tools/pre-push` (new Node gate, cutover target for the bash pre-push wire).

**Red:** 7/7 tests failing before implementation. **Green:** 7/7 after.

**Acceptance mutations (each proven fail→revert→pass in the tests):**
- Preview env file pointing at the prod DB identifier → FAIL, file and identifier named; revert → pass.
- `CREATE TABLE` without `ENABLE ROW LEVEL SECURITY` in the migrations corpus → FAIL naming the table; add the ALTER → pass.
- Duplicate migration numbers → FAIL (reuses migration-guard's detector — one detector, two wires).
- `~/.pgpass` entry carrying a prod host → FAIL (M4 tool-default vector); remove → pass.
- MCP config resolving to a prod project ref → FAIL (M4); revert → pass.
- Clean configured state → `checked N invariants, all hold` (positive proof).
- **Cold install (m6):** zero config → `no infra configured — 0 of 6 invariant groups applicable (cold install)`, exit 0 — verified live on the engine repo itself.

**Honest limits (registered, not hidden):** the RLS group is a STATIC scan of the migrations corpus; live-DB RLS verification (enabled+forced on the running database) needs a connection and is a Release Engineer runbook step, not this offline tool. Cloudflare token *scope* is not offline-verifiable and is not claimed as checked.

**Doctor state after registration:** `checked 4, found 4 green · mechanism count: 4`, exit 0 — the `hooks/hooks.json` orphan from Task 0.1's live run is now claimed by the infra-check mechanism entry. Full suite 103/103.

---

## Task 1.4 — Skill-firing audit at session close (2026-07-19)

**Files:** `tools/skill-audit.js` (new, Node rebuild of the bash audit) · `tools/test/skill-audit.test.js` (also covers the previously-untested `log-skill.js`) · Stop-hook wire added in `hooks/hooks.json`.

**I-97's two defects, fixed:** (1) the audit only ran when the `/logout` ritual was followed — now a Stop-hook wire, firing regardless; (2) `(none)` read as success — an empty window and a missing non-negotiable are now loud `SKILL-AUDIT FLAG` lines with exit 1.

**Red:** 5/6 failing before `skill-audit.js` existed (the 6th — log-skill append — passed against the existing logger, which gained its first test coverage here). **Green:** 6/6.

**Acceptance (simulated session windows, per plan):** a build-shaped window that skipped `verification-before-completion` → flagged, exit 1; a window that fired it → clean positive proof (`audited N skill invocations`), exit 0; prior-session invocations correctly excluded by the boundary-marker window (yesterday's verification does not cover today).

**Report-only status:** dated exception preserved (2026-07-14 WARN precedent) — invocation presence is a proxy, so the wire warns and never blocks. Recorded in the registry note.

**Suite:** 109/109.

---

## Task 1.5 — Windows smoke prep + B1 POSIX-only recurrence guard (2026-07-19)

**Files:** `tools/checks/posix-only-check.js` (B1 guard, registered in the doctor) · `test/run-smoke.js` (cross-platform one-command smoke: discovers test files itself — no shell globbing, cmd.exe-safe — runs the suite + the guard).

**First live run caught a real violation:** `studio-session-init.js` spawns `bash` for the legacy vault self-heal. It is `!isWin`-fenced (never executes on Windows) and already condemned to die at Task 2.3's SessionStart consolidation → recorded as a **dated exception, printed loudly on every run** (fail-loud discipline: an exception is explicit and dated, never a silent allowlist).

**Mutation (plan acceptance):** seeded `execFileSync('bash', ...)` into `flavour.js` → guard goes red naming the file; reverted → `scanned 19 tool files, 0 violations, 1 dated exception`, exit 0.

**macOS smoke:** `node test/run-smoke.js` → `smoke: PASS (suite + posix-only guard)` (109 tests + guard). **The Windows RUN is PARKED** — no Windows substrate exists on this machine (Q7: default UTM VM, no OS downloaded autonomously per standing order). AWAITING OVERLORD: substrate choice/installation; the smoke is one command once a box exists.

**Doctor:** `checked 6, found 6 green · mechanism count: 6`.

---

## Tasks 2.1–2.3 — Consolidate-memory wire, CI gate, SessionStart consolidation (2026-07-19)

**Task 2.1:** `consolidate-memory` wired to a REAL trigger — scheduled task `weekly-memory-consolidation` (Sun 07:02 local), replacing the printed reminder that provably never ran anything. Prompt carries the no-lossy-distillation (#39) and kills-preserved rules inline. **Firing proof PENDING the first scheduled run** (due within hours of creation — created on a Sunday morning); the disable-the-wire half of the acceptance is trivially the scheduler's enabled flag. Free-tier note: weekly token consumption, flagged.

**Task 2.2 (Q2 default — local CI, zero remote minutes):** `tools/pre-push` is now the CI merge gate: full suite + posix-only guard (via `test/run-smoke.js`), then infra-check, all blocking. **Mutation:** appended a failing test → `smoke: FAIL` → `PUSH BLOCKED — CI suite ... failed`; reverted → all gates green. **No deploy step exists in the gate** (grep-verifiable; LAUNCH law — certify ≠ authorise; the repo holds zero deploy capability).

**Task 2.3:** `studio-session-init.js` rewritten pure-Node as the single SessionStart wire absorbing session-init + HANDOFF-staleness (handoff-age.sh) + retro-count nudges, with a heartbeat beacon written every run and `tools/checks/heartbeat-check.js` registered in the doctor (missing-beacon = explicit cold line while the plugin is uninstalled; stale beacon = blocking once any beacon exists). **Red→green:** 4 new tests (stale HANDOFF → nudge / fresh → silent / retro count / no-bash assertion); the Task 1.5 dated posix exception is now DEAD — exception list empty again, guard fully clean. The engine-side Sunday printed reminder was deleted with the rewrite (its replacement — the 2.1 cron — exists first; movers after detectors).

**Doctor:** `checked 9, found 9 green · mechanism count: 9`. Suite 113/113.

---

## Tasks 2.4 + 2.5 — Dispatch-brief lint + retro-wire; expand/contract gate (2026-07-19)

**Task 2.4:** `methodology/subagent-brief-template.md` rebuilt to the ratified 4-part contract (Objective / Output format / Tool guidance / Explicit boundaries) + hard 5-worker ceiling + decompose-by-owned-resource + the Non-Blocking Law Q/A/defaults section with `Rounds: N`. `tools/template-lint.js` enforces it. **Red→green:** 4/5 tests failing pre-implementation → 5/5. Acceptance: missing Explicit-boundaries → fail named; missing Rounds → fail; `Rounds: 4` fixture → **blocks the launch AND auto-files a retro entry** in the vault retro-log (M1 wire — append-only, idempotent by run-id, verified non-duplicating on a second run); no `--vault` → nothing files (red→green both ways).

**Task 2.5:** `tools/expand-contract-check.js` — destructive op (DROP COLUMN/TABLE, RENAME) on table T requires a prior additive migration touching T; same-file additive does not count (the single-migration disease). Wired into the pre-commit composite on staged migration dirs. **Discipline note, honestly:** impl was written before the tests ran red (a TDD slip); the red half was then proven by mutation — neutering the DESTRUCTIVE pattern made the block-tests fail (gate goes silent = tests catch it), restore → 4/4. Acceptance: bare DROP COLUMN blocked; expand→contract split passes; DROP TABLE with/without prior CREATE both behave.

**Doctor:** `checked 11, found 11 green · mechanism count: 11`. Suite 122/122.

---

## Tasks 2.6 + 2.7 — State contract + conformance; postmortem format + flag (2026-07-19)

**Task 2.6:** `schemas/state-contract.json` v1 (tracked-object/body state, transport-agnostic, additive-only within a major) · `methodology/interaction-platform.md` (First Playable as the first gate; LBE location/earnings tests as milestones 6–7 with thresholds honestly TBD-by-first-test; tiered cut lists as kill-preservation run forward) · `tools/checks/schema-conformance-check.js`. **Mutation:** declared `contract-field: objects.position` (divergent name) in the consumer doc → `SCHEMA CONFORMANCE FAILED` naming it; removed → `checked 4 declared fields, all conform to v1`. No hardware spend anywhere (G3 anti-scope).

**Task 2.7:** `methodology/postmortem-format.md` (one dated paragraph: What/Why/Fix/Corrective action/Status) · `tools/checks/postmortem-lint.js` wired to session close (Stop hook) and doctor-runnable · two retroactive postmortems FILED V-side as the format seed (017 collision → corrective action Task 1.1; preview→prod near-miss → corrective action Task 1.3 — both corrective actions are tonight's proven mechanisms, so both file as `Status: filed`, honestly). **Mutation:** a `Status: open` fixture → `POSTMORTEM FLAG` exit 1; removed → `checked 2, all well-formed and closed`.

**Doctor:** 13 mechanisms green. **PHASE 2 COMPLETE.**

---

## Phase 3 — Kernel contract + two role births + local-auth gate (2026-07-19)

**Task 3.0:** `personas/KERNEL-CONTRACT.md` + `tools/kernel-lint.js`. Red→green 6/6 (missing section, thin-with-Voice, dead runbook link, unwired standing event, codename mention all fail; conforming thin AND rich kernels pass).

**Task 3.1 — Release Engineer born.** `personas/release-kernel.md` (thin, opus, standing on release-composed; kernel-lint conforms) · neutral skin · `/summon-release` command · SEVEN runbooks (compose incl. the ratified coupling taxonomy sweep with named owners + Ship-or-Remove; sequence; version; rollback; go-no-go; notes; infra-check operation). **2am-rollback acceptance, run for real with fresh cold subagents:** round 1–3 dead-ended on REAL gaps (undefined infra-check invocation, prose-only migration inverses, missing abort-check query, missing product-root path, external credentials) — each fed back into the compose contract as record-field REQUIREMENTS; round 4: **COMPLETES** cold from the runbook + record alone. **Mutation:** DB-state precondition stripped → fresh reader **DEAD-ENDS at the migration gate** (refuses to trust the record's historical claim over live state — exactly the designed failure). Transcripts in the session record.

**Task 3.2 — Security Engineer born.** `personas/security-kernel.md` (thin, opus, standing on release-composed + security-surface-change; conforms) · neutral skin · `/summon-security` · `security-certificate.md` runbook (ISSUED/WITHHELD, evidence per line, full re-check after remediation). **Self-test:** seeded prod-secret-in-preview → detector RED → certificate can go red; **mutation:** infra-check failure branch stubbed off → self-test fails loudly ("Issue NO certificates until fixed"); restored → green.

**Task 3.3 — Local-auth gate (V-side), built to completion-minus-the-human-step.** The sweep proved NO prior artifact existed despite the dry-run claim — built from zero: `setup/local-auth-gate.swift` (Tier 1 deviceOwnerAuthentication, 120s timeout fail-closed, exit-code-only contract) + `setup/local-auth-gate-selftest.sh` (3 checks PASS: parses, fail-closed convention, playbook wiring) + `/update-sot` step 1b (any non-zero = stop, never retry-loop). **LIVE dialog red→green (cancel=1, authenticate=0) AWAITS OVERLORD.** Tier 2 biometric parked (Q8). Codename skins (V): release + security both landed in the overlord flavour.

**Doctor:** 16 mechanisms green. **PHASE 3 COMPLETE (minus the parked human proof).**
