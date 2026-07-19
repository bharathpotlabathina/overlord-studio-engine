'use strict';
// Flags gate — no dist push with an open flag (corrective action, postmortem
// 2026-07-20-stale-docs-shipped: a sweep flagged a needed rewrite, nothing
// carried the flag, three versions shipped stale docs).
//
// Ledger grammar (FLAGS.md, one flag per line; anything else is prose):
//   OPEN: <what must land before the next dist push>
//   RESOLVED YYYY-MM-DD: <what landed>
//   WAIVED YYYY-MM-DD (Director): <what was waived, by name>
// Only the Director waives. Missing ledger is red — a gate that passes when
// its input vanishes is silent failure.
//
// Usage: node tools/checks/flags-check.js [path/to/FLAGS.md]
const fs = require('fs');
const path = require('path');

const ledger = process.argv[2] || path.join(__dirname, '..', '..', 'FLAGS.md');

if (!fs.existsSync(ledger)) {
  console.log(`FLAGS RED — ledger missing at ${ledger}; the gate has no input. Restore FLAGS.md.`);
  process.exit(1);
}

const lines = fs.readFileSync(ledger, 'utf8').split('\n');
const open = lines.filter((l) => /^OPEN:/.test(l));
const closed = lines.filter((l) => /^(RESOLVED \d{4}-\d{2}-\d{2}:|WAIVED \d{4}-\d{2}-\d{2} \(Director\):)/.test(l));

if (open.length) {
  console.log(`FLAGS RED — ${open.length} open flag(s) block the push:`);
  for (const l of open) console.log(`  ${l}`);
  console.log('Resolve (RESOLVED YYYY-MM-DD:) or Director-waive (WAIVED YYYY-MM-DD (Director):) before pushing.');
  process.exit(1);
}

const n = open.length + closed.length;
console.log(`flags ledger: ${n} entr${n === 1 ? 'y' : 'ies'}, 0 open`);
