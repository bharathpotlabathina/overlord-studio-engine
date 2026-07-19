# Runbook — Sequence a release

Owner: Release Engineer.

1. Order of operations, always: **expand migrations → code deploy → contract
   migrations (later release)**. A single release never both adds and removes the
   same surface (`expand-contract-check.js` enforces the migration half).
2. For a **release set** (cross-product couplings from the compose sweep): expand
   in the provider product → release each consumer → contract in a LATER set.
   Each step must leave every product runnable if the next step never happens.
3. Staging first, always: the full sequence runs on staging end-to-end before the
   gate. Staging is seeded to prod-shaped synthetic volume (never prod data — the
   no-production-PII rule is absolute).
4. Write the sequence as a numbered list in the composition record, each step with:
   the command/action, the owner, the verify line (what proves the step held), and
   the abort path (which rollback step undoes it).
