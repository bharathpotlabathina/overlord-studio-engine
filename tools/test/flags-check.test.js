'use strict';
// Flags gate — the open-flags check on the preflight board (postmortem
// 2026-07-20-stale-docs-shipped corrective action): a sweep/absorption flag of
// the needs-rewrite class lands in FLAGS.md; any OPEN line blocks a dist push
// until resolved or Director-waived. Missing ledger = red (a gate that passes
// when its input vanishes is silent failure).
const { test } = require('node:test');
const assert = require('node:assert');
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const SCRIPT = path.join(__dirname, '..', 'checks', 'flags-check.js');

function run(ledgerPath) {
  try {
    const out = execFileSync('node', [SCRIPT, ledgerPath], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    return { code: 0, out };
  } catch (e) {
    return { code: e.status, out: (e.stdout || '') + (e.stderr || '') };
  }
}

function writeLedger(lines) {
  const p = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'flags-')), 'FLAGS.md');
  fs.writeFileSync(p, lines.join('\n') + '\n');
  return p;
}

test('an OPEN flag blocks: exit 1 and the flag text is named', () => {
  const p = writeLedger([
    '# Flags ledger',
    'OPEN: engine studio-pipeline.md needs the Release-stage rewrite',
    'RESOLVED 2026-07-20: README /login self-heal line corrected',
  ]);
  const r = run(p);
  assert.strictEqual(r.code, 1);
  assert.match(r.out, /FLAGS RED/);
  assert.match(r.out, /Release-stage rewrite/);
});

test('resolved and waived flags only: exit 0 with positive proof counts', () => {
  const p = writeLedger([
    '# Flags ledger',
    'Prose and headers are ignored by the gate.',
    'RESOLVED 2026-07-20: engine studio-pipeline.md ship-tail rewrite landed',
    'WAIVED 2026-07-19 (Director): statusline wire retired, re-addable as config',
  ]);
  const r = run(p);
  assert.strictEqual(r.code, 0);
  assert.match(r.out, /flags ledger: 2 entr(y|ies), 0 open/);
});

test('missing ledger is red, never silent', () => {
  const r = run(path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'flags-')), 'FLAGS.md'));
  assert.strictEqual(r.code, 1);
  assert.match(r.out, /FLAGS RED/);
  assert.match(r.out, /missing/i);
});

test('repo FLAGS.md exists and passes the gate (ships clean)', () => {
  const repoLedger = path.join(__dirname, '..', '..', 'FLAGS.md');
  assert.ok(fs.existsSync(repoLedger), 'FLAGS.md must exist at the repo root');
  const r = run(repoLedger);
  assert.strictEqual(r.code, 0, 'repo ledger must have no open flags at push time:\n' + r.out);
});
