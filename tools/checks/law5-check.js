#!/usr/bin/env node
// Task 6.2 — Law-5 hard gate: N_new (registered wires) vs N_old (0.2a baseline),
// identical counting unit both sides (one trigger->check pair), no consolidation
// games. Prints BOTH baseline readings; passes ONLY under the strict (live-only)
// baseline. The binding definition is PARKED with the Director — until ruled, the
// conservative reading governs and an overage prints loudly and blocks (park,
// never fudge). Disposition closure (declared = migrated + retired, zero unknown)
// is also asserted here — honestly PENDING until cutover completes.
'use strict';
const fs = require('fs');
const path = require('path');

const reg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'registry.json'), 'utf8'));
const N_new = reg.mechanisms.length;
const base = reg.law5Baseline || {};
const live = base.N_old_live;
const declared = base.N_old_declared;

console.log(`Law-5 count: N_new = ${N_new} registered wires (unit: one trigger->check pair)`);
console.log(`  vs N_old_live = ${live} (live wires only) -> ${N_new < live ? 'PASS' : 'FAIL'}`);
console.log(`  vs N_old_declared = ${declared} (incl. dead/duplicate declarations) -> ${N_new < declared ? 'PASS' : 'FAIL'}`);
console.log('  disposition closure (declared = migrated + retired, zero unknown): PENDING CUTOVER — old wires W01-W11 still live vault-side; engine replacements are test-green, not live-green.');

if (N_new < live) {
  console.log('Law 5 HOLDS under both baselines.');
  process.exit(0);
}
console.log(`Law-5 OVERAGE under the live-only baseline (${N_new} >= ${live}) — surfaced at Phase 0, still true at reconciliation. Which baseline binds is the Director's parked ruling; the count is not fudged either way. Phase close BLOCKS here until ruled.`);
process.exit(1);
