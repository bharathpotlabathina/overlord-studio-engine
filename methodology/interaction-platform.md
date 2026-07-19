# Interaction Platform — milestones, cut lists, shared state contract

Vocabulary + schema only (Task 2.6; no hardware spend — G3 anti-scope). Engine
choices (Godot-for-small-cabinets, depth-sensor vendor) remain spikes, not verdicts.

## Milestone ladder

1. **First Playable** — the platform's FIRST gate: one tracked object, one
   interaction, zero-instruction play (a stranger plays without being told how).
   Smaller than any tech-demo phase; nothing else gates before it.
2. Vertical slice — one complete experience at target quality.
3. Alpha — feature-complete, content-incomplete.
4. Beta — content-complete, tuning only.
5. Gold — shippable build.
6. **Location test** (LBE) — the build earns in a real venue; instrumentation on
   (session length, replay rate, walk-away points). Thresholds are
   **TBD-by-first-test** — no imported numbers exist (the trade body stopped
   publishing 2018; one search-surfaced stat was checked and found fabricated).
7. **Earnings test** (LBE) — sustained revenue at a venue over weeks; the
   commercial-model decision (sale+service vs rev-share) unparks HERE, with data.

## Tiered cut lists (kill-preservation run forward)

Declared at project start, before pressure exists:
- **must-cut** — first to go when the schedule slips; losing them changes nothing core.
- **negotiable** — cut only with a dated reasoning note.
- **never-cut** — cutting one means the project is no longer itself; a never-cut in
  danger is a stop-and-rethink event, not a crunch event.
Cuts are annotated in place, never scrubbed (kills preserved).

## Shared state contract

`schemas/state-contract.json` (v1) — tracked-object/body state generalised from
ball-state. Consumers (game logic, renderer, telemetry, actuation) declare consumed
fields in their product docs as `contract-field: <dotted-name>` lines;
`tools/checks/schema-conformance-check.js` fails any divergent name. Additive-only
within a major version — the wire format gets expand/contract too.

Declared consumers of v1 (this doc is itself lint-checked):

contract-field: ts
contract-field: objects.id
contract-field: objects.pos
contract-field: objects.conf
