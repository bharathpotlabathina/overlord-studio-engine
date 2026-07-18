# Reality Sweep — the old studio, tested against the machine (Task 0.2a)

**Date:** 2026-07-19 · **Method:** six parallel read-only fleet agents, one per mechanism class (Claude-Code hooks · skills/commands · setup scripts · playbooks/docs · gates · raw git-hook wiring). Every declared wire was TESTED against the machine (file existence at resolved paths, live invocation where side-effect-free, git-config truth, content diffs) — never assumed from prose. No file was modified by the sweep.

**Verdict in one line:** the live studio runs entirely on the vault-side bash/python scripts wired through `~/.claude/settings.json` and the shared `.githooks` directory; the engine's entire tool set is real, tested, and **structurally inert** (the plugin is not installed anywhere), and three of its ports are behavior changes, not like-for-like.

---

## A. Canonical wire inventory (automated wires only — the Law-5 counting unit)

One row = one declared trigger→check pair. `source-key` is machine-derived and re-verified by `sweep-crosscheck.js` (below). Dispositions are **provisional** (0.2a); each `migrate` closes only when its replacement is red→green (0.2b, asserted at Task 6.2); each `retire` closes at Task 6.1.

### Live wires (fire today — verified)

| id | source-key | trigger | check/script | disposition | migration target / note |
|---|---|---|---|---|---|
| W01 | settings:UserPromptSubmit:studio-session-init.sh | UserPromptSubmit (daily flag) | vault `setup/studio-session-init.sh` (git pull, self-heal, handoff-age, retro-count, SOT drift) | migrate | → SessionStart consolidation (Task 2.3). NOTE: engine port targets SessionStart, not UserPromptSubmit — an event-type change, not a pure port |
| W02 | settings:UserPromptSubmit:studio-env-check.sh | UserPromptSubmit | vault `setup/studio-env-check.sh` | migrate | no engine port exists yet — fold into Task 2.3 consolidation |
| W03 | settings:UserPromptSubmit:plugin-update-check.sh | UserPromptSubmit | vault `setup/plugin-update-check.sh` | migrate | no engine port exists yet — fold into Task 2.3 |
| W04 | settings:Stop:inline | Stop | inline unconditional git add/commit/push | migrate | → engine `session-sync.js` — **behavior change: opt-in, default OFF.** Cutover without setting `autosync=on` silently kills vault auto-sync. Explicit call needed |
| W05 | settings:SessionEnd:session-log-backstop.sh | SessionEnd | vault `setup/session-log-backstop.sh` | migrate | engine port wired to Stop, not SessionEnd — event-type divergence to resolve |
| W06 | settings:SessionEnd:repo-status-guard.sh | SessionEnd | vault `setup/repo-status-guard.sh` | migrate | no engine port exists yet |
| W07 | settings:PostToolUse:inline | PostToolUse (Skill) | inline python appender → `skill-invocations.log` | migrate | → Task 1.4 skill-audit rebuild (log-skill.js + close-audit half) |
| W08 | settings:PreToolUse:deploy-guard.sh | PreToolUse (Bash) | vault `setup/deploy-guard.sh` | migrate | live-verified (blocked a sweep agent's own test in-session). Engine port `deploy-guard.js` **lacks the `--no-verify` block (I-54)** — close before cutover |
| W09 | settings:SessionStart:compact-reinject.sh | SessionStart (compact) | vault `setup/compact-reinject.sh` | migrate | no engine port exists yet |
| W10 | githooks:pre-commit | git pre-commit (shared `core.hooksPath`, all studio repos) | vault `.githooks/pre-commit` (bash: size, secrets, atlas-map via `setup/atlas-map-check.py`, plan-needs-spec, verification WARN, I-55 provenance) | migrate | live-verified by 5 real scratch-repo commits. Engine Node port **lacks the I-55 provenance check** — close before cutover |
| W11 | githooks:pre-push | git pre-push (shared, fires only on dist-repo remotes) | vault `.githooks/pre-push` (preflight launch board + dist-leak-scan) | migrate | untested-live (a real dist push is the trigger); dependencies verified present. `dist-leak-scan.js` mishandles `--help` (treats it as a filename) — minor, fix before leaning on it |
| W12 | settings:statusLine | statusline render | `~/.claude/studio-statusline.sh` | retire (provisional) | display-only, not a check; not load-bearing. Re-addable as config if missed |

### Declared-but-dead wires (exist on disk, fire never — verified)

| id | source-key | where declared | why dead | disposition |
|---|---|---|---|---|
| W13 | enginehooks:SessionStart:studio-rules-inject.js | engine `hooks/hooks.json` | **plugin not installed** — `${CLAUDE_PLUGIN_ROOT}` resolves nowhere; not in `enabledPlugins`, not in any marketplace | migrate (this IS the cutover target; I-84 collapses the vault/engine duplicate to one wire) |
| W14 | enginehooks:SessionStart:studio-session-init.js | engine `hooks/hooks.json` | same | migrate (target of W01) |
| W15 | enginehooks:Stop:session-log-backstop.js | engine `hooks/hooks.json` | same | migrate (target of W05) |
| W16 | enginehooks:Stop:session-sync.js | engine `hooks/hooks.json` | same | migrate (target of W04) |
| W17 | enginehooks:PostToolUse:log-skill.js | engine `hooks/hooks.json` | same | migrate (target of W07; rebuilt in Task 1.4) |
| W18 | enginehooks:PreToolUse:deploy-guard.js | engine `hooks/hooks.json` | same | migrate (target of W08, after the `--no-verify` gap closes) |
| W19 | enginegit:pre-push | engine `.git/hooks/pre-push` (literal, old-style) | `core.hooksPath` is set on the repo, so git never consults `.git/hooks/` — superseded by W11, which is a strict superset | retire |
| W20 | studiovault:post-commit | `studio-vault/.githooks/post-commit` | hooksPath never set on that repo; repo itself is an abandoned pre-vault iteration (no remote, stale since 2026-06-11) | retire (with the whole repo's status flagged to the Director) |

**Not wires (correctly excluded from the count):** all 21 vault playbook-commands + 18 engine plugin-commands (verified working end-to-end, zero unknowns — but they are ritual/prose mechanisms, DOCUMENTS under the Task 0.1 rule) · `skill-audit.sh` (invoked by the `/logout` playbook, honor-system prose — the exact degradation class Task 1.4 fixes) · `atlas-map-check.py` and `preflight.js` (sub-checks of W10/W11, same trigger) · `handoff-age.sh`/`retro-count.sh` (sub-checks of W01) · meera/owner subagents · the new `registry-doctor` (Stage-3 wire, counts in N_new).

---

## B. N_old — the Law-5 baseline, and a definitional finding for the Director

**Counting unit (Task 0.1, B2):** one mechanism = one registered trigger→check pair. Same unit both sides, no switch permitted.

- **N_old (live wires): 12** — W01–W12.
- **Declared surface including dead/duplicate declarations: 20** — W01–W20 (of which 6 are vault↔engine DUPLICATE declarations of the same mechanism, and 2 are corpses).

**⚠️ FINDING (surfaced now, per the plan's own instruction):** the projected arithmetic below shows **`N_new ≥ N_old` under the live-only baseline**. The Law-5 gate only closes comfortably if N_old counts the 8 dead/duplicate declarations — i.e., the count "goes down" mostly by deleting corpses and collapsing duplicate declarations, while **live machinery grows** (~12 → ~18). Which baseline binds is the Director's call, parked in HANDOFF → the Director's pending-decision queue. The sweep does not fudge either number.

### Projected arithmetic (B2)

Planned wire additions (from the plan's own list, consolidated where a task explicitly folds into an existing trigger): registry-doctor (1) · infra-check@session-start (1; its pre-push firing rides W11's trigger) · consolidate-memory cron (1) · event→role wires (4: release-composed, spec-lands, feature-starts, client-feedback) · local-auth gate (1, V-side) · retro-wire 4th-round auto-file (1) · template-lint/kernel-lint/expand-contract/schema-conformance (0–4: foldable into the pre-commit composite check; counted 0 if folded, per the one-trigger-one-blocking-check rule) · CI gate (0: = local pre-push, Q2 default). **New: ~9–13.**

Planned removals/consolidations: W12 retired (−1) · W01+W02+W03 → one SessionStart wire (−2) · W19, W20 corpses (−2, only in the 20-count) · W13–W18 duplicates collapse into their live counterparts at cutover (−6, only in the 20-count) · W06 possibly absorbed into session-sync (−1, uncertain).

**Projected N_new ≈ 17–21.**
- vs N_old = 12 (live-only): **FAILS Law 5** (17–21 ≥ 12).
- vs N_old = 20 (all declared): passes narrowly at the low end (17 < 20), fails at the high end.

Either way this is not the comfortable margin the plan assumed — the honest statement is that Studio 2.0 as planned adds live standing machinery (detectors the old studio never had: doctor, infra-check, event wires) and removes declarations. The tractor's "delete beats instrument" and the plan's rigor additions are in real tension here; the resolution is the Director's, not the fleet's.

---

## C. The five load-bearing sweep findings (the "invisible to doc-checking" class)

1. **The engine plugin is not installed.** All six `hooks/hooks.json` wires are inert by construction; nothing on this machine loads them. Everything live is vault-side bash via `~/.claude/settings.json` (hand-written by `studio-setup.sh`). Reading hooks.json alone looks complete and correct — nothing fires. (This is the documented two-track state from 2026-07-15, but the sweep confirms zero engine mechanisms have ever run in production.)
2. **The engine's `tools/pre-commit` header claim is false.** "Installed via `git config core.hooksPath`" — no repo anywhere points at it. All 6 studio repos + 4 worktrees share the vault's `.githooks` bash pair. The Node port also silently LACKS the I-55 map-provenance check the live bash version enforces; `deploy-guard.js` likewise lacks the live version's `--no-verify` block. **Porting as-is would silently weaken two gates.**
3. **Task 3.3's local-auth helper has no artifact on disk.** HANDOFF and the plan describe the macOS LocalAuthentication dialog as "dry-run validated this session (exit 0)" — an exhaustive search (LocalAuthentication, deviceOwnerAuthentication, LAContext, osascript auth helpers, *.swift) finds **no file anywhere** in either repo. Either the dry-run was a one-off never saved, or the claim is aspirational-recorded-as-done. Task 3.3 has zero prior art to build on; flagged to the Director.
4. **Doc drift runs in BOTH directions.** Engine behind vault: `doc-protocol.md` + `wiki-schema.md` still present the killed CAP-018 wiki as live (vault's copy was fixed; engine's never patched). Vault behind engine: vault `flavour.md` still says the loader "ships in Plan 2" (live since 2026-07-15); vault `flavour-setup` skill says "8 roles" (engine correctly says 9). Plus one doc-vs-itself: `studio-brief.md`'s pipeline section contradicts its own roster section 30 lines up.
5. **A fresh `/tmp` prod-push clone bypasses every gate.** `core.hooksPath` is per-repo local config; the ephemeral client-site push clone gets none of the studio gates on re-clone. Distinct from Task 1.3's infra-check; needs either a hooked clone step or an explicit acceptance.

Confirmed-zero baselines (honest absences, not bugs): no infra-check-class invariant exists anywhere yet (Task 1.3 builds from nothing) · no migration-number ledger exists (Task 1.1 builds from nothing) · `/login` retirement stands confirmed (its auto-half already lives in W01; the ritual half is the part that dies).

**Documents settled by the sweep:** `studio-brief.md` "What's Missing" — 6 of 9 items resolved, 2 partial, 1 still-true-by-design (details in the playbooks agent record; brief needs a rewrite pass, not patches) · `STUDIO-ROLE-AUDIT-BRIEF.md` and the 2026-05-30 invoker audit brief → retire-as-historical (kills preserved) · `wiki-schema.md` → retire · engine `studio-pipeline.md` → migrate-with-rewrite (no Release stage yet) · engine `handbook.md`, `subagent-brief-template.md`, both repos' summon/session playbooks → migrate-as-is (all verified current). Naming drift at cutover: the vault's short source-of-truth command name vs the engine's `/update-source-of-truth` — alias or rename before muscle memory 404s. `retro-integrate` was never ported to the engine — port or park explicitly. The `atlas@overlord-studio` installed plugin is one commit stale vs the live hand-symlink (still shows the dead Ice Box pillar) — reconcile or retire the plugin entry.

---

## D. Cross-check (the sweep's own Law-4 mutation check)

`sweep-crosscheck.js` (beside this file; one-shot, NOT a registered standing mechanism — the sweep runs once by design) re-derives every wire source-key from the machine (`~/.claude/settings.json` hooks + statusLine, vault `.githooks/`, engine `hooks/hooks.json`, engine `.git/hooks` non-samples, studio-vault leftovers) and asserts each appears in this report's inventory. Deleting any wire row makes it go red; output is positive proof (`cross-checked N machine wires, all present in inventory`). Proof transcript in `tools/PROOFS.md`.
