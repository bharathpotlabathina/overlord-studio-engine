'use strict';
// Task 2.4 — dispatch-brief template lint + the M1 retro-wire (wire, not prose).
// Acceptance: brief missing explicit-boundaries (or the Q/A/round-count section)
// -> lint fails. A 4-round fixture -> retro entry auto-files (append-only,
// idempotent by run-id); without the vault wire -> nothing files.
const { test } = require('node:test');
const assert = require('node:assert');
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const LINT = path.join(__dirname, '..', 'template-lint.js');

const FULL = `# brief
## Objective
Do the thing.
## Output format
A table.
## Tool guidance
Read x.js only.
## Explicit boundaries
Report only.
## Questions / answers / defaults
Rounds: 2
Q: scope? A: engine only
`;

function write(dir, content) {
  const p = path.join(dir, 'brief.md');
  fs.writeFileSync(p, content);
  return p;
}

function newVault() {
  const v = fs.mkdtempSync(path.join(os.tmpdir(), 'tlint-'));
  fs.mkdirSync(path.join(v, '_claude', 'retros'), { recursive: true });
  fs.writeFileSync(path.join(v, '_claude', 'retros', 'retro-log.md'), '# Retro Log\n');
  return v;
}

function run(args) {
  try {
    const out = execFileSync('node', [LINT, ...args], { encoding: 'utf8' });
    return { code: 0, out: out.trim() };
  } catch (e) {
    return { code: e.status, out: (e.stdout || '').toString().trim() };
  }
}

test('conforming brief passes with positive proof', () => {
  const p = write(fs.mkdtempSync(path.join(os.tmpdir(), 'tl-')), FULL);
  const r = run([p]);
  assert.strictEqual(r.code, 0);
  assert.match(r.out, /checked 5 required sections, all present/);
});

test('missing Explicit boundaries -> fail, named', () => {
  const p = write(fs.mkdtempSync(path.join(os.tmpdir(), 'tl-')),
    FULL.replace('## Explicit boundaries\nReport only.\n', ''));
  const r = run([p]);
  assert.notStrictEqual(r.code, 0);
  assert.match(r.out, /Explicit boundaries/);
});

test('missing Rounds line -> fail', () => {
  const p = write(fs.mkdtempSync(path.join(os.tmpdir(), 'tl-')), FULL.replace('Rounds: 2\n', ''));
  const r = run([p]);
  assert.notStrictEqual(r.code, 0);
  assert.match(r.out, /Rounds/);
});

test('Rounds > 3 with vault wire -> retro entry auto-files, idempotent by run-id', () => {
  const v = newVault();
  const p = write(fs.mkdtempSync(path.join(os.tmpdir(), 'tl-')), FULL.replace('Rounds: 2', 'Rounds: 4'));
  const r1 = run([p, '--vault', v]);
  assert.notStrictEqual(r1.code, 0); // >3 rounds = under-scoped, lint blocks the launch
  const log1 = fs.readFileSync(path.join(v, '_claude', 'retros', 'retro-log.md'), 'utf8');
  assert.match(log1, /scoping failure/i);
  assert.match(log1, /Status: unintegrated/);
  run([p, '--vault', v]); // second run, same brief
  const log2 = fs.readFileSync(path.join(v, '_claude', 'retros', 'retro-log.md'), 'utf8');
  assert.strictEqual(log2.match(/scoping failure/gi).length, 1, 'must not duplicate the entry');
});

test('Rounds > 3 WITHOUT the vault wire -> nothing files (red-green both ways)', () => {
  const v = newVault();
  const p = write(fs.mkdtempSync(path.join(os.tmpdir(), 'tl-')), FULL.replace('Rounds: 2', 'Rounds: 4'));
  run([p]); // no --vault: the wire is absent
  const log = fs.readFileSync(path.join(v, '_claude', 'retros', 'retro-log.md'), 'utf8');
  assert.doesNotMatch(log, /scoping failure/i);
});
