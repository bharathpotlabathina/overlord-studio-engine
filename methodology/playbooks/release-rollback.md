# Runbook — Rollback (the 2am test)

Owner: Release Engineer. This runbook must be executable COLD — no context, no
memory, 2am — from this page alone. It is exercised on staging BEFORE every
go/no-go (a rollback never yet run is a rumor, not a plan).

## Preconditions — verify BEFORE touching anything
1. **DB state check (do not skip):** confirm which migrations the target
   environment has actually applied — `SELECT version FROM schema_migrations
   ORDER BY version DESC LIMIT 5;` (or the product's ledger table named in its
   composition record). Write the list down. A rollback against an assumed DB
   state is how a bad night becomes a data-loss night.
2. Confirm the release tag being rolled back FROM and the tag being rolled back
   TO (both are in the composition record, §version).
3. Confirm you are on the intended environment (staging vs prod) — read the env
   identifier out loud from the deploy target, not from memory. Run the boundary
   patrol from the product repo root: `node tools/infra-check.js` (in the studio
   engine checkout named by the composition record) — green = exit 0 with a
   `checked N invariants, all hold` (or explicit cold) line. Any red line = stop.

## Rollback, in order
4. **Code first:** repoint the deploy target at the previous release tag
   (provider dashboard → promote previous deployment; this is a human act behind
   provider auth — the studio machine holds no deploy capability, by law).
5. **Then migrations, only if step 1 showed the contract migrations applied:**
   run the LITERAL inverse commands from the composition record's rollback
   column, newest first (the record carries runnable SQL/commands, never prose —
   compose rejects a record without them). Expand-only releases roll back with
   NO migration action (additive surface is harmless to leave — that is why
   expand/contract exists).
6. **Verify:** run the composition record's verify lines for the PREVIOUS
   version; confirm the app serves and the previous version string reports.
7. **Record:** timestamp, what rolled back, why, DB state before/after — one
   paragraph, filed per `postmortem-format.md` (a rollback IS an incident).

## Abort criteria
Before running any step-5 inverse, run its paired **abort-check query from the
composition record** (a literal query; compose rejects records without one per
destructive inverse). Rows returned > 0 means the inverse would destroy data
written since deploy: STOP at code-only rollback and page the Studio Director —
data reconciliation is a decision, not a runbook step.

## Recording (step 7 format, inline for 2am completeness)
One dated paragraph: `What:` / `Why:` / `Fix:` / `Corrective action:` /
`Status: filed|open` — full spec in `postmortem-format.md`.
