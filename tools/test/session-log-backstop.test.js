'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const SCRIPT = path.join(__dirname, '..', 'session-log-backstop.js');

function newRepo() {
  const v = fs.mkdtempSync(path.join(os.tmpdir(), 'backstop-'));
  execFileSync('git', ['init', '-q'], { cwd: v });
  execFileSync('git', ['config', 'user.email', 't@t'], { cwd: v });
  execFileSync('git', ['config', 'user.name', 't'], { cwd: v });
  fs.mkdirSync(path.join(v, '_claude'), { recursive: true });
  fs.writeFileSync(path.join(v, '_claude', 'session-log.md'), '# Session Log\n');
  execFileSync('git', ['add', '.'], { cwd: v });
  execFileSync('git', ['commit', '-qm', 'init'], { cwd: v });
  return v;
}
const log = (v) => path.join(v, '_claude', 'session-log.md');
const run = (v) => execFileSync('node', [SCRIPT, v], { encoding: 'utf8' });

test('clean tree -> no stub written', () => {
  const v = newRepo();
  const before = fs.readFileSync(log(v), 'utf8');
  run(v);
  assert.strictEqual(fs.readFileSync(log(v), 'utf8'), before);
});

test('dirty tree + untouched log -> exactly one stub appended', () => {
  const v = newRepo();
  fs.writeFileSync(path.join(v, 'newfile.txt'), 'work'); // untracked work
  run(v);
  const after = fs.readFileSync(log(v), 'utf8');
  const stubs = after.match(/auto: session ended without \/logout summary/g) || [];
  assert.strictEqual(stubs.length, 1);
  assert.match(after, /^\d{4}-\d{2}-\d{2} · studio · none · \(auto: session ended without \/logout summary\)$/m);
});

test('dirty tree + touched log -> no stub (logout already wrote)', () => {
  const v = newRepo();
  fs.appendFileSync(log(v), '2026-07-12 · real entry\n'); // log modified this session
  run(v);
  const stubs = (fs.readFileSync(log(v), 'utf8').match(/auto: session ended/g) || []);
  assert.strictEqual(stubs.length, 0);
});
