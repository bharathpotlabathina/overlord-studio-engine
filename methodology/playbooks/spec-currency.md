# Runbook — Spec currency check

Owner: Systems Planner. Standing on `spec-lands` (any spec or migration lands).
Enforced as a release-gate check — a section carrying open drift does not clear
`[PROVISIONAL]`/`[LOCKED]` and does not ship.

## Inputs
1. The spec file — the GDD / technical spec being asserted (e.g. `*-spec.md`).
2. The migrations directory for the same product — every migration file, in
   order. Migrations are the ledger; a schema dump or cached ERD is not a
   substitute, because it can be stale in the same way the spec can be.

If either input is missing, say so explicitly and stop. No assertion without
both sides present.

## Comparison steps
Read the migrations in numeric order and apply each rename/add/drop in
sequence — CURRENT means the end of that ledger, not any single migration in
it. Then walk the spec section by section against that end state:

1. **Entity names.** Every entity/table the spec names must match the name it
   holds after the LAST migration that touches it. A rename migration
   supersedes every earlier mention, including the spec's own.
2. **State machines.** Every status/state value and transition the spec
   documents must exist in the migration corpus (enums, check constraints,
   status columns) with the same value set — no state the spec claims that no
   migration defines, and no state a migration defines that the spec is
   silent on.
3. **Field names.** Every field the spec references by name must resolve to a
   live column after all migrations apply — a field the spec still calls `x`
   that a later migration renamed to `y` is drift, even if `x` was correct on
   the day the spec was written.
4. **Relationships / cardinality.** Foreign keys and join tables the spec
   describes must match what the migrations currently constrain.

## What counts as drift
- A name, field, or state the spec uses that a later migration superseded.
- A state or value the migrations define that the spec never mentions.
- A relationship the spec describes that no longer matches the live FK/join
  structure.

Cosmetic differences (comment wording, section order, formatting) are not
drift — do not report them.

**Reference failure (why this runbook exists):** a spec named the core entity
`placements`; the live database had been `engagements` since migration 008.
The drift survived because no event re-fired the spec's owner after the
rename landed. `spec-lands` closes that gap — every migration landing
re-triggers this check against every spec that names the tables it touched.

## Output
Emit exactly one line, every run, clean or not:

- Clean: `spec-currency: checked <spec> against <N> migrations — CURRENT`
- Drift: `spec-currency: checked <spec> against <N> migrations — DRIFT: <list>`
  — one item per drifted name/state/field, each naming the spec section, the
  stale term, and the migration (number + what it changed) that superseded it.

`<N>` is the count of migration files actually read, not the count expected —
a partial read is not a clean bill.

## Decision
- CURRENT → the checked sections are cleared to carry `[PROVISIONAL]`/`[LOCKED]`.
- DRIFT → every section naming a drifted term reverts to `[DRAFT]` until
  corrected. This blocks the release gate exactly like an unresolved QA issue
  — no partial re-check; after correction, re-run the full comparison, not
  just the drifted lines.
