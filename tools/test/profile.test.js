'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs'); const os = require('os'); const path = require('path');
const { resolveProfile, bindTier } = require('../profile.js');

function vaultWith(cfgLines) {
  const v = fs.mkdtempSync(path.join(os.tmpdir(), 'prof-'));
  fs.mkdirSync(path.join(v, '_claude'), { recursive: true });
  if (cfgLines !== null) fs.writeFileSync(path.join(v, '_claude', '.studio-config'), cfgLines.join('\n') + '\n');
  return v;
}

test('profile=max read from config', () => {
  assert.strictEqual(resolveProfile(vaultWith(['autosync=off', 'profile=max'])), 'max');
});
test('absent key, absent file, unknown value -> pro (distribution default)', () => {
  assert.strictEqual(resolveProfile(vaultWith(['autosync=off'])), 'pro');
  assert.strictEqual(resolveProfile(vaultWith(null)), 'pro');
  assert.strictEqual(resolveProfile(vaultWith(['profile=plaid'])), 'pro');
});
test('max bindings are the 2026-07-19 rulings verbatim', () => {
  assert.strictEqual(bindTier('deep', 'max'), 'opus');
  assert.strictEqual(bindTier('top', 'max'), 'fable');
  assert.strictEqual(bindTier('standard', 'max'), 'sonnet');
});
test('pro collapses deep and top to sonnet; lower tiers unchanged', () => {
  assert.strictEqual(bindTier('deep', 'pro'), 'sonnet');
  assert.strictEqual(bindTier('top', 'pro'), 'sonnet');
  assert.strictEqual(bindTier('cheap', 'pro'), 'haiku');
});
test('unknown tier throws', () => {
  assert.throws(() => bindTier('galactic', 'pro'), /unknown tier/);
});
