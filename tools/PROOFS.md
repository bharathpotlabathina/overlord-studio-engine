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
