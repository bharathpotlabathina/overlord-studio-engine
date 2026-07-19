# Runbook — Run a build lane

Owner: Full-Stack Web Developer (and any builder a `feature-build-starts` dispatch
routes to). Trigger: `feature-build-starts` fires and the feature's platform is
yours, or the Studio Director/Orchestrator commissions a build directly. Reads cold
— follow it start to finish, do not skip steps because the build feels small.

1. **Branch trunk-based, short-lived.** Cut the branch off trunk when the build
   starts. It lives one build, not one sprint — merge same-day once green. A branch
   still open tomorrow is a signal something was scoped too big; split it rather
   than let it age.
2. **Decompose by owned resource, not by problem type.** One file / module / table
   = one writer. If the build needs more than one hand, split the work at resource
   boundaries (per `{{PLUGIN}}/methodology/subagent-brief-template.md`), never by
   "front-end half / back-end half" on the same file. Two writers on one resource is
   how collisions happen — the resource boundary IS the task boundary.
3. **Reserve migration numbers before writing any migration.** Claim the number
   first, write the file second:
   ```
   node tools/migration-guard.js claim --dir <migrations-dir> --name <migration_name>
   ```
   Re-claiming with the same `--name` is idempotent — safe to re-run. Never
   hand-pick the next number by inspecting the directory; that's the race the
   ledger exists to close.
4. **TDD: red → implement → green.** Write the failing test first, then the
   minimum implementation that turns it green. No implementation commit without a
   preceding test commit (or a same-commit test) that failed against the pre-change
   code.
5. **Expand/contract for any destructive migration.** A `DROP COLUMN` / `DROP
   TABLE` / `RENAME` on a table needs an earlier-numbered additive migration
   (`CREATE TABLE` / `ADD COLUMN`) on that same table before it — same-file
   additive doesn't count. Verify with:
   ```
   node tools/expand-contract-check.js <migrations-dir>
   ```
   A destructive step with no prior expand does not ship in this build; split it
   into an expand step now and a contract step in a later release.
6. **Verify before any DONE report.** Run `verification-before-completion` — tests
   green, migration ledger clean (`migration-guard.js check`), expand/contract
   clean, the actual feature exercised end-to-end (not just unit-tested). A DONE
   claim without evidence is not a DONE claim.
7. **File the completion report.** Every build lane closes with:
   - **Commits** — the list, each tied to the resource it touched.
   - **Test evidence** — what ran, what passed, pasted output or a link to it (not
     "tests pass" asserted from memory).
   - **Concerns** — anything flagged during the build that didn't block it: edge
     cases, follow-up work, scope questions surfaced but not resolved.

   This report is the handoff artifact into the QA Handoff Brief
   (`{{PLUGIN}}/personas/dev-web-kernel.md` → Relationships) — QA does not begin
   without it.
