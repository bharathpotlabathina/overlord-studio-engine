#!/usr/bin/env node
// Task 2.4 — dispatch-brief lint + the M1 retro-wire.
// Enforces the 4-part contract + pre-flight Q/A section on a brief file. A Rounds
// count > 3 means the run was under-scoped (Non-Blocking Law benchmark): the lint
// BLOCKS the launch and — when given --vault — appends a retro-log entry naming
// the scoping failure (append-only, idempotent by run-id, CAP-027 organ).
'use strict';
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const REQUIRED = [
  'Objective',
  'Output format',
  'Tool guidance',
  'Explicit boundaries',
  'Questions / answers / defaults',
];
const MAX_ROUNDS = 3;

function main() {
  const argv = process.argv.slice(2);
  const vi = argv.indexOf('--vault');
  const vault = vi === -1 ? null : argv.splice(vi, 2)[1];
  const briefPath = argv[0];
  if (!briefPath) { console.log('usage: template-lint.js <brief.md> [--vault <path>]'); return 2; }
  const text = fs.readFileSync(briefPath, 'utf8');

  const missing = REQUIRED.filter((s) => !new RegExp(`^##\\s+${s.replace(/[/]/g, '\\/')}\\s*$`, 'mi').test(text));
  if (missing.length) {
    console.log('BRIEF LINT FAILED — missing required section(s):');
    missing.forEach((s) => console.log(`  ## ${s}`));
    return 1;
  }

  const roundsMatch = text.match(/^Rounds:\s*(\d+)/m);
  if (!roundsMatch) {
    console.log('BRIEF LINT FAILED — no "Rounds: N" line in the Questions / answers / defaults section (the pre-flight loop must record its round count).');
    return 1;
  }
  const rounds = parseInt(roundsMatch[1], 10);
  if (rounds > MAX_ROUNDS) {
    console.log(`BRIEF LINT FAILED — pre-flight took ${rounds} rounds (benchmark: ≤${MAX_ROUNDS}). The run is under-scoped: split it, don't launch it.`);
    if (vault) {
      const runId = crypto.createHash('sha256').update(briefPath + '\n' + text).digest('hex').slice(0, 12);
      const logPath = path.join(vault, '_claude', 'retros', 'retro-log.md');
      const log = fs.existsSync(logPath) ? fs.readFileSync(logPath, 'utf8') : '';
      if (!log.includes(`run-id: ${runId}`)) {
        const entry = [
          '',
          `## ${new Date().toISOString().slice(0, 10)} · dispatch pre-flight benchmark trip · template-lint (run-id: ${runId})`,
          `- Learning: scoping failure — pre-flight interrogation ran ${rounds} rounds (>${MAX_ROUNDS}) for brief ${path.basename(briefPath)}; the run was under-scoped and must be split.`,
          '- Target: pipeline',
          '- Status: unintegrated',
          '',
        ].join('\n');
        fs.appendFileSync(logPath, entry);
        console.log(`retro entry auto-filed (run-id: ${runId}).`);
      } else {
        console.log(`retro entry already filed for this brief (run-id: ${runId}) — idempotent, not duplicated.`);
      }
    }
    return 1;
  }

  console.log(`checked ${REQUIRED.length} required sections, all present; pre-flight rounds: ${rounds} (within benchmark).`);
  return 0;
}

process.exit(main());
