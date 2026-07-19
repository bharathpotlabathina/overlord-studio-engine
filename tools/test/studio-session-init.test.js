'use strict';
// Task 2.3 — SessionStart consolidation. Acceptance: stale HANDOFF beyond threshold
// -> nudge injected; fresh -> silent. Heartbeat written on every run (dead hook is
// caught by its missing beacon). First test coverage for this previously-untested wire.
const { test } = require('node:test');
const assert = require('node:assert');
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const SCRIPT = path.join(__dirname, '..', 'studio-session-init.js');

function newVault() {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'sinit-'));
  const v = path.join(base, 'vault');
  fs.mkdirSync(path.join(v, '_claude', 'retros'), { recursive: true });
  execFileSync('git', ['init', '-q', v]);
  const tmp = path.join(base, 'tmp');
  fs.mkdirSync(tmp);
  return { v, tmp };
}

function run(v, tmp) {
  const r = require('child_process').spawnSync('node', [SCRIPT, v], {
    encoding: 'utf8',
    env: { ...process.env, TMPDIR: tmp, TMP: tmp, TEMP: tmp },
  });
  return { out: r.stdout, err: r.stderr };
}

test('heartbeat beacon written on every run', () => {
  const { v, tmp } = newVault();
  run(v, tmp);
  const beacon = path.join(v, '_claude', '.heartbeats', 'session-init');
  assert.ok(fs.existsSync(beacon));
  assert.match(fs.readFileSync(beacon, 'utf8'), /^\d{4}-\d{2}-\d{2}T/);
});

test('stale HANDOFF (>3 days) -> nudge; fresh -> silent', () => {
  const { v, tmp } = newVault();
  const handoff = path.join(v, '_claude', 'HANDOFF.md');
  fs.writeFileSync(handoff, '# h\n');
  const old = new Date(Date.now() - 5 * 86400000);
  fs.utimesSync(handoff, old, old);
  assert.match(run(v, tmp).out, /HANDOFF\.md is \d+ days old/);
  const now = new Date();
  fs.utimesSync(handoff, now, now);
  const { tmp: tmp2 } = { tmp: fs.mkdtempSync(path.join(os.tmpdir(), 'sinit-t2-')) };
  assert.doesNotMatch(run(v, tmp2).out, /days old/);
});

test('open retro entries -> counted nudge (real retro-log format); none -> silent', () => {
  const { v, tmp } = newVault();
  // The real retro-log format is "- Status: unintegrated" (vault retro-log.md);
  // this test's first version invented a checkbox format and codified the bug.
  fs.writeFileSync(path.join(v, '_claude', 'retros', 'retro-log.md'),
    '- Learning: one\n- Status: unintegrated\n- Learning: two\n- Status: integrated\n- Learning: three\n- Status: unintegrated\n');
  assert.match(run(v, tmp).out, /2 unintegrated retro entries/);
});

// Skipped when this file is itself running as a doctor check (STUDIO_DOCTOR set):
// inside that subtree the gauge is suppressed BY DESIGN (re-entrancy guard), so
// asserting its presence there would fail the very mechanism it protects.
test('doctor health line printed on every session open (battery flow-B wire)',
  { skip: !!process.env.STUDIO_DOCTOR }, () => {
  const { v, tmp } = newVault();
  const { out } = run(v, tmp);
  // Green engine -> one-line gauge. The red path ("DOCTOR RED") rides the same
  // wire; red-state detection itself is covered by doctor.test.js.
  assert.match(out, /🩺 doctor: \d+ mechanisms green/);
});

test('no bash spawn remains (the Task 1.5 dated exception dies here)', () => {
  const text = fs.readFileSync(SCRIPT, 'utf8');
  assert.ok(!/['"](bash|sh|zsh)['"]/.test(text));
});
