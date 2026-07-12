'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const SCRIPT = path.join(__dirname, '..', 'flavour.js');

function newVault() {
  const v = fs.mkdtempSync(path.join(os.tmpdir(), 'flav-'));
  fs.mkdirSync(path.join(v, '_claude', 'flavours', '_neutral'), { recursive: true });
  fs.mkdirSync(path.join(v, '_claude', 'flavours', 'overlord'), { recursive: true });
  return v;
}
function run(vault, ...args) {
  try {
    const out = execFileSync('node', [SCRIPT, ...args], {
      env: { ...process.env, VAULT: vault }, encoding: 'utf8',
    });
    return { code: 0, out: out.trim() };
  } catch (e) {
    return { code: e.status, out: (e.stdout || '').toString().trim(), err: (e.stderr || '').toString() };
  }
}
function ptr(v) { return path.join(v, '_claude', 'flavours', 'active'); }

test('current is "none" when no pointer', () => {
  const v = newVault();
  assert.strictEqual(run(v, 'current').out, 'none');
});

test('resolve falls back to _neutral when none/invalid/missing', () => {
  const v = newVault();
  assert.ok(run(v, 'resolve').out.endsWith('/_neutral'));
  fs.writeFileSync(ptr(v), 'nope');            // points at a missing dir
  assert.ok(run(v, 'resolve').out.endsWith('/_neutral'));
  fs.writeFileSync(ptr(v), '   ');             // whitespace -> none
  assert.ok(run(v, 'resolve').out.endsWith('/_neutral'));
});

test('use activates a valid flavour; resolve follows it', () => {
  const v = newVault();
  assert.strictEqual(run(v, 'use', 'overlord').code, 0);
  assert.strictEqual(run(v, 'current').out, 'overlord');
  assert.ok(run(v, 'resolve').out.endsWith('/overlord'));
});

test('use rejects a missing flavour and lists', () => {
  const v = newVault();
  const r = run(v, 'use', 'ghost');
  assert.notStrictEqual(r.code, 0);
  assert.match(r.out + (r.err || ''), /No such Flavour/);
});

test('valid_name rejects traversal / reserved / separators', () => {
  const v = newVault();
  for (const bad of ['../evil', '_neutral', 'a/b', '.hidden', '']) {
    const r = run(v, 'use', bad);
    assert.notStrictEqual(r.code, 0, `should reject ${JSON.stringify(bad)}`);
  }
});

test('off sets pointer to none', () => {
  const v = newVault();
  run(v, 'use', 'overlord');
  run(v, 'off');
  assert.strictEqual(run(v, 'current').out, 'none');
  assert.ok(run(v, 'resolve').out.endsWith('/_neutral'));
});

test('rename keeps the active pointer in sync', () => {
  const v = newVault();
  run(v, 'use', 'overlord');
  assert.strictEqual(run(v, 'rename', 'overlord', 'sovereign').code, 0);
  assert.strictEqual(run(v, 'current').out, 'sovereign');
});

test('list shows non-underscore dirs sorted', () => {
  const v = newVault();
  assert.strictEqual(run(v, 'list').out, 'overlord');
});
