# Runbook — Compose a release

Owner: Release Engineer. Trigger: a body of built work is nominated for release
(standing event `release-composed` starts at the END of this runbook).

1. **Inventory the candidate.** List every commit/branch/feature going in. Anything
   not listed does not ship. Record: feature name → commits → files → migrations.
2. **Ship-or-Remove sweep (hard rule).** Anything *decided against* is REMOVED from
   the codebase now — not flagged off, removed. Feature flags cover
   intended-but-incomplete only. If removals happen, staging is redone from the
   cleaned state before anything else proceeds (re-staging is the accepted cost).
   This is a human-judgment check: list each decided-against item and its removal
   commit in the composition record.
3. **Dependency / coupling sweep (composition-time, mandatory).** For every item,
   name its couplings under the ratified taxonomy — **contract-coupled** (API/schema
   consumers) · **data-coupled** (shared tables/rows) · **library-coupled** (shared
   code) · **family-coupled** (same product family expectations) · **infra-coupled**
   (env/DNS/provider settings). Every coupling gets a NAMED owner. An unnamed
   coupling is a compose blocker — unnamed couplings are where the silent-failure
   class lives. Cross-product couplings make this a **release set**: expand →
   partner releases → contract, each side rollback-able alone.
4. **Migration audit.** Numbers reserved via the ledger (`migration-guard.js claim`);
   `migration-guard.js check` clean; `expand-contract-check.js` clean.
5. **Sequence** the release per `release-sequence.md`; **version** it per
   `release-version.md`.
6. **Write the rollback plan** per `release-rollback.md` — a release without a
   written, staging-exercised rollback does not go to the gate.
7. **Draft release notes** per `release-notes.md`.
8. Emit the **composition record** (one doc: inventory, removals, couplings+owners,
   migrations, sequence, version, rollback ref, notes ref, **deploy timestamp field
   (filled at deploy) · the PRODUCT repo-root path and the engine-checkout path
   (infra-check runs from the product root) · the provider name + dashboard URL ·
   the staging DB connection command (e.g. `psql service=demoapp-staging`) · a
   rollback column of LITERAL runnable inverse commands, **each destructive
   inverse paired with a literal abort-check query** (what data written since
   deploy would it destroy — table + timestamp column spelled out) · staging
   verify lines fully self-contained incl. smoke credentials (staging is
   synthetic; no prod PII exists there by law) — a record missing any of these
   is a compose blocker (the 2am reader has only the record)**) → this event fires the
   standing wires: QA quality pass · Security Engineer certificate ·
   `infra-check-operation.md`.

Two lanes exist: **composed** (this runbook) and **hotfix** (ceremony-free: one fix,
one reviewer, `infra-check` still gates, postmortem filed after — see
`postmortem-format.md`; a hotfix skips composition, never the gate).
