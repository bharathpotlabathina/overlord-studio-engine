#!/usr/bin/env node
// Task 6.2 — Law-5 hard gate: N_new (registered wires) vs the 0.2a baseline,
// identical counting unit both sides (one trigger->check pair), no consolidation
// games. RULED 2026-07-19 (Director, hybrid — decision of record: vault
// _claude/memory/studio_decisions.md): the DECLARED baseline (20) binds for the
// Stage-3 transition gate (the 8 dead/duplicate declarations were real debt the
// absorption phase inventoried); at cutover the then-live count freezes into
// registry law5Baseline.frozenLiveBaseline and becomes the ceiling — from that
// day the count may only shrink. Disposition closure (declared = migrated +
// retired, zero unknown) is also asserted here — honestly PENDING until cutover.
'use strict';
const fs = require('fs');
const path = require('path');

const reg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'registry.json'), 'utf8'));
const N_new = reg.mechanisms.length;
const base = reg.law5Baseline || {};
const live = base.N_old_live;
const declared = base.N_old_declared;
const frozen = base.frozenLiveBaseline;

console.log(`Law-5 count: N_new = ${N_new} registered wires (unit: one trigger->check pair)`);

if (frozen == null) {
  // Transition mode (pre-cutover): declared binds, per the 2026-07-19 ruling.
  console.log(`  transition gate (BINDING, ruled 2026-07-19) vs N_old_declared = ${declared} -> ${N_new < declared ? 'PASS' : 'FAIL'}`);
  console.log(`  live-only reading (informational, not binding) vs N_old_live = ${live} -> ${N_new < live ? 'PASS' : 'FAIL'}`);
  console.log('  disposition closure (declared = migrated + retired, zero unknown): PENDING CUTOVER — old wires W01-W11 still live vault-side; engine replacements are test-green, not live-green.');
  if (N_new < declared) {
    console.log('Law 5 HOLDS under the ruled transition baseline. At cutover, freeze the live count into law5Baseline.frozenLiveBaseline — it becomes the ceiling.');
    process.exit(0);
  }
  console.log(`Law-5 OVERAGE: N_new ${N_new} >= declared baseline ${declared} — the count grew past even the ruled transition baseline. Park, never fudge.`);
  process.exit(1);
}

// Post-cutover: the frozen live baseline is the ceiling; the count may only shrink.
console.log(`  post-cutover ceiling (frozen at cutover) = ${frozen} -> ${N_new <= frozen ? 'PASS' : 'FAIL'}`);
if (N_new <= frozen) {
  console.log('Law 5 HOLDS under the frozen live baseline.');
  process.exit(0);
}
console.log(`Law-5 OVERAGE: N_new ${N_new} > frozen baseline ${frozen} — machinery grew post-cutover. Park, never fudge.`);
process.exit(1);
