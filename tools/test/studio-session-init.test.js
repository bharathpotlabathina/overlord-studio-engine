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

function run(v, tmp, { gauge = false } = {}) {
  // Default suppresses the doctor gauge (STUDIO_DOCTOR=1): only the flow-B test
  // asserts it, and every gauge run costs a full doctor (~2s × 5 tests otherwise).
  const r = require('child_process').spawnSync('node', [SCRIPT, v], {
    encoding: 'utf8',
    env: { ...process.env, TMPDIR: tmp, TMP: tmp, TEMP: tmp, STUDIO_DOCTOR: gauge ? '' : '1' },
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

test('open retro entries -> counted DIRECTIVE (real retro-log format); none -> silent', () => {
  const { v, tmp } = newVault();
  // The real retro-log format is "- Status: unintegrated" (vault retro-log.md);
  // this test's first version invented a checkbox format and codified the bug.
  fs.writeFileSync(path.join(v, '_claude', 'retros', 'retro-log.md'),
    '- Learning: one\n- Status: unintegrated\n- Learning: two\n- Status: integrated\n- Learning: three\n- Status: unintegrated\n');
  const out = run(v, tmp).out;
  assert.match(out, /SELF-IMPROVEMENT: 2 unintegrated retro entries/);
  assert.match(out, /run \/retro-integrate as your FIRST action this session/);
});

test('no unintegrated retro entries -> nudge absent', () => {
  const { v, tmp } = newVault();
  fs.writeFileSync(path.join(v, '_claude', 'retros', 'retro-log.md'),
    '- Learning: one\n- Status: integrated\n');
  assert.doesNotMatch(run(v, tmp).out, /unintegrated retro/);
});

// headroom learn --apply (CAP-039 Task 2). Real-CLI output verified 2026-09-07
// against installed headroom 0.27.0 (source: cli/learn.py) — a single-project
// run (our exact invocation: no --project/--all flag, cwd = VAULT) prints
// "  Recommendations: N" on the analysis-succeeded path, never the assumed
// "N recommendation(s)" phrasing (that only appears in the --all summary line).
// An unregistered/empty project prints "No claude project data found for..."
// and exits 0 — that's the real "nothing to learn" case, not a thrown error.
function fakeHeadroom(tmp, script) {
  const bin = path.join(tmp, 'fakebin');
  fs.mkdirSync(bin, { recursive: true });
  const p = path.join(bin, 'headroom');
  fs.writeFileSync(p, `#!/bin/sh\n${script}\n`);
  fs.chmodSync(p, 0o755);
  return bin;
}

function runWithPath(v, tmp, extraPathDir) {
  const env = {
    ...process.env, TMPDIR: tmp, TMP: tmp, TEMP: tmp, STUDIO_DOCTOR: '1',
    // No extra dir -> PATH must be genuinely empty, not process.env.PATH, or
    // this "headroom absent" test silently runs the real installed headroom.
    // process.execPath (not the bare 'node' string) is required here since
    // spawnSync would otherwise need PATH to resolve the node binary itself.
    PATH: extraPathDir ? `${extraPathDir}:${process.env.PATH}` : '',
  };
  const r = require('child_process').spawnSync(process.execPath, [SCRIPT, v], { encoding: 'utf8', env });
  return { out: r.stdout, err: r.stderr, status: r.status };
}

test('headroom present, finds recommendations -> confirmation line printed', () => {
  const { v, tmp } = newVault();
  const bin = fakeHeadroom(tmp, 'echo "  Recommendations: 3"');
  const out = runWithPath(v, tmp, bin).out;
  assert.match(out, /🧠 headroom learn found 3 recommendation\(s\) — run 'headroom learn --apply' by hand to write them\./);
});

test('STUDIO_HEADROOM_RAN already set -> headroom never invoked (recursion guard, CAP-039 review fix)', () => {
  const { v, tmp } = newVault();
  const marker = path.join(tmp, 'headroom-was-called');
  const bin = fakeHeadroom(tmp, `touch "${marker}"; echo "  Recommendations: 3"`);
  const env = {
    ...process.env, TMPDIR: tmp, TMP: tmp, TEMP: tmp, STUDIO_DOCTOR: '1',
    STUDIO_HEADROOM_RAN: '1', PATH: `${bin}:${process.env.PATH}`,
  };
  const r = require('child_process').spawnSync(process.execPath, [SCRIPT, v], { encoding: 'utf8', env });
  assert.doesNotMatch(r.stdout, /headroom learn found/);
  assert.ok(!fs.existsSync(marker), 'headroom binary ran despite STUDIO_HEADROOM_RAN already set — recursion guard failed');
});

test('headroom present, nothing to learn -> no confirmation line', () => {
  const { v, tmp } = newVault();
  const bin = fakeHeadroom(tmp, 'echo "No claude project data found for /tmp/x"');
  const out = runWithPath(v, tmp, bin).out;
  assert.doesNotMatch(out, /headroom learn found/);
});

test('headroom not on PATH -> silent skip, session still completes', () => {
  const { v, tmp } = newVault();
  // Output/status alone don't prove PATH-absence — a real installed headroom
  // run against this unregistered temp vault also prints nothing and exits 0
  // (verified by hand: "No claude project data found" -> status 0), so this
  // test would fake-pass on any machine with headroom actually installed
  // unless we also prove no real subprocess ran. The timed window is the
  // WHOLE script (node startup, git pull, fs walk, headroom ENOENT) — not
  // just headroom — so the bound is intentionally generous (2s) to avoid
  // flaking on a loaded/CI machine. A real headroom invocation (python
  // startup alone) measures 500ms+ on this machine; a real `git`+`headroom`
  // pair pushes well past 2s. If PATH here silently fell back to
  // process.env.PATH, this bound would still fail — the margin exists to
  // absorb whole-script variance, not to make the check toothless.
  const start = Date.now();
  const r = runWithPath(v, tmp, null);
  const elapsed = Date.now() - start;
  assert.doesNotMatch(r.out, /headroom/);
  assert.strictEqual(r.status, 0);
  assert.ok(elapsed < 2000, `expected no real headroom subprocess (<2s whole-script), took ${elapsed}ms — a real binary likely ran`);
});

test('headroom present but exits non-zero -> silent skip, session still completes', () => {
  const { v, tmp } = newVault();
  const bin = fakeHeadroom(tmp, 'echo "boom" >&2; exit 1');
  const r = runWithPath(v, tmp, bin);
  assert.doesNotMatch(r.out, /headroom learn found/);
  assert.strictEqual(r.status, 0);
});

// Skipped when this file is itself running as a doctor check (STUDIO_DOCTOR set):
// inside that subtree the gauge is suppressed BY DESIGN (re-entrancy guard), so
// asserting its presence there would fail the very mechanism it protects.
test('doctor health line printed on every session open (battery flow-B wire)',
  { skip: !!process.env.STUDIO_DOCTOR }, () => {
  const { v, tmp } = newVault();
  const { out } = run(v, tmp, { gauge: true });
  // Flow-B's acceptance is that the gauge fires every open, loud in both
  // states — not that the engine is green. Green -> one-line gauge; red
  // (e.g. Task 13, 2026-07-25: registry grew past the frozen Law-5 ceiling
  // pending the Director's baseline ruling at composition) -> the RED banner.
  // Either is the wire working; silence is the only failure this test guards.
  assert.match(out, /🩺 doctor: \d+ mechanisms green|🩺 DOCTOR RED — the machine is NOT healthy:/);
});

test('no bash spawn remains (the Task 1.5 dated exception dies here)', () => {
  const text = fs.readFileSync(SCRIPT, 'utf8');
  assert.ok(!/['"](bash|sh|zsh)['"]/.test(text));
});
