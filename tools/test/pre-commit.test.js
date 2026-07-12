'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const HOOK = path.join(__dirname, '..', 'pre-commit');

function newRepo() {
  const v = fs.mkdtempSync(path.join(os.tmpdir(), 'precommit-'));
  execFileSync('git', ['init', '-q'], { cwd: v });
  execFileSync('git', ['config', 'user.email', 't@t'], { cwd: v });
  execFileSync('git', ['config', 'user.name', 't'], { cwd: v });
  execFileSync('git', ['config', 'core.hooksPath', path.dirname(HOOK)], { cwd: v });
  return v;
}
// Run the hook directly (as git would) with cwd at repo root.
function runHook(cwd) {
  try { execFileSync('node', [HOOK], { cwd, encoding: 'utf8' }); return { code: 0 }; }
  catch (e) { return { code: e.status, out: (e.stdout || '').toString() }; }
}

test('clean commit passes', () => {
  const v = newRepo();
  fs.writeFileSync(path.join(v, 'a.txt'), 'hello');
  execFileSync('git', ['add', 'a.txt'], { cwd: v });
  assert.strictEqual(runHook(v).code, 0);
});

test('blocks a staged private key', () => {
  const v = newRepo();
  fs.writeFileSync(path.join(v, 'key.pem'), '-----BEGIN RSA PRIVATE KEY-----\nabc\n-----END RSA PRIVATE KEY-----\n');
  execFileSync('git', ['add', 'key.pem'], { cwd: v });
  const r = runHook(v);
  assert.strictEqual(r.code, 1); assert.match(r.out, /secret/i);
});

test('blocks a raw .env but allows .env.example', () => {
  const v = newRepo();
  fs.writeFileSync(path.join(v, '.env'), 'SECRET=1\n');
  execFileSync('git', ['add', '.env'], { cwd: v });
  assert.strictEqual(runHook(v).code, 1);

  const v2 = newRepo();
  fs.writeFileSync(path.join(v2, '.env.example'), 'SECRET=\n');
  execFileSync('git', ['add', '.env.example'], { cwd: v2 });
  assert.strictEqual(runHook(v2).code, 0);
});

test('blocks a file over 10MB', () => {
  const v = newRepo();
  fs.writeFileSync(path.join(v, 'big.bin'), Buffer.alloc(11 * 1024 * 1024));
  execFileSync('git', ['add', 'big.bin'], { cwd: v });
  const r = runHook(v);
  assert.strictEqual(r.code, 1); assert.match(r.out, /10MB/);
});

test('blocks an invalid staged studio-atlas-map.json', () => {
  const v = newRepo();
  fs.mkdirSync(path.join(v, '_claude'), { recursive: true });
  fs.writeFileSync(path.join(v, '_claude', 'studio-atlas-map.json'), '{"broken": true}');
  execFileSync('git', ['add', '_claude/studio-atlas-map.json'], { cwd: v });
  const r = runHook(v);
  assert.strictEqual(r.code, 1); assert.match(r.out, /validation|BLOCKED/i);
});
