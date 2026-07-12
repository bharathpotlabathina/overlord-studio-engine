'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const SCRIPT = path.join(__dirname, '..', 'deploy-guard.js');

function newVault() {
  const v = fs.mkdtempSync(path.join(os.tmpdir(), 'guard-'));
  fs.mkdirSync(path.join(v, '_claude'), { recursive: true });
  return v;
}
function run(vault, input) {
  try {
    execFileSync('node', [SCRIPT, vault], { input, encoding: 'utf8' });
    return { code: 0 };
  } catch (e) {
    return { code: e.status, err: (e.stderr || '').toString() };
  }
}
const payload = (cmd) => JSON.stringify({ tool_input: { command: cmd } });

test('blocks git push to production with no ack (exit 2)', () => {
  const v = newVault();
  const r = run(v, payload('git push origin production'));
  assert.strictEqual(r.code, 2);
  assert.match(r.err, /BLOCKED/);
});

test('allows and consumes ack when present', () => {
  const v = newVault();
  const ack = path.join(v, '_claude', '.deploy-ack');
  fs.writeFileSync(ack, '');
  const r = run(v, payload('git push origin production'));
  assert.strictEqual(r.code, 0);
  assert.strictEqual(fs.existsSync(ack), false); // consumed
});

test('allows a non-matching command', () => {
  const v = newVault();
  assert.strictEqual(run(v, payload('git push origin main')).code, 0);
  assert.strictEqual(run(v, payload('ls -la')).code, 0);
});

test('fail-closed: malformed JSON containing the pattern still blocks', () => {
  const v = newVault();
  const r = run(v, 'this is not json but has git push production in it');
  assert.strictEqual(r.code, 2);
});
