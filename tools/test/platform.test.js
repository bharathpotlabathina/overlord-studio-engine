'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const P = require('../platform.js');

function tmp() { return fs.mkdtempSync(path.join(os.tmpdir(), 'plat-')); }

test('linkDir creates a working link and is idempotent', () => {
  const d = tmp();
  const target = path.join(d, 'real'); fs.mkdirSync(target);
  fs.writeFileSync(path.join(target, 'f.txt'), 'hi');
  const link = path.join(d, 'link');
  const r1 = P.linkDir(target, link);
  assert.strictEqual(r1.status, 'created');
  assert.strictEqual(fs.readFileSync(path.join(link, 'f.txt'), 'utf8'), 'hi');
  const r2 = P.linkDir(target, link);
  assert.strictEqual(r2.status, 'exists'); // idempotent
});

test('linkDir backs up a real directory before linking', () => {
  const d = tmp();
  const target = path.join(d, 'real'); fs.mkdirSync(target);
  const link = path.join(d, 'link'); fs.mkdirSync(link);
  fs.writeFileSync(path.join(link, 'old.txt'), 'x');
  const r = P.linkDir(target, link);
  assert.strictEqual(r.status, 'backed-up');
  assert.ok(fs.existsSync(link + '.bak/old.txt'));
});

test('isWritable flips with makeReadOnly / makeWritable', () => {
  const d = tmp();
  const f = path.join(d, 'f'); fs.writeFileSync(f, 'x');
  P.makeReadOnly(f);
  assert.strictEqual(P.isWritable(f), false);
  P.makeWritable(f);
  assert.strictEqual(P.isWritable(f), true);
});

test('walk finds nested files with a filter', () => {
  const d = tmp();
  fs.mkdirSync(path.join(d, 'a', 'b'), { recursive: true });
  fs.writeFileSync(path.join(d, 'a', 'b', 'keep.md'), '');
  fs.writeFileSync(path.join(d, 'a', 'skip.txt'), '');
  const md = P.walk(d, (p) => p.endsWith('.md'));
  assert.strictEqual(md.length, 1);
  assert.ok(md[0].endsWith('keep.md'));
});

test('tmpFlag is under os.tmpdir', () => {
  assert.ok(P.tmpFlag('x').startsWith(os.tmpdir()));
});

test('date stamps match expected shapes', () => {
  assert.match(P.dateStamp(), /^\d{4}-\d{2}-\d{2}$/);
  assert.match(P.isoStamp(), /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/);
  assert.match(P.localHM(), /^\d{2}:\d{2}$/);
});

test('resolveVault: valid arg wins', () => {
  const d = tmp();
  assert.strictEqual(P.resolveVault(d, '/nonexistent-settings'), d);
});

test('resolveVault: unsubstituted ${...} literal falls through to env', () => {
  const d = tmp();
  process.env.CLAUDE_PLUGIN_OPTION_VAULT_PATH = d;
  try {
    assert.strictEqual(P.resolveVault('${CLAUDE_PLUGIN_OPTION_VAULT_PATH}', '/nonexistent-settings'), d);
  } finally { delete process.env.CLAUDE_PLUGIN_OPTION_VAULT_PATH; }
});

test('resolveVault: falls back to settings pluginConfigs under any marketplace-suffixed id', () => {
  const d = tmp();
  const vault = path.join(d, 'vault'); fs.mkdirSync(vault);
  const settings = path.join(d, 'settings.json');
  // desktop sideloads plugins as <name>@inline — options must resolve regardless of suffix
  fs.writeFileSync(settings, JSON.stringify({
    pluginConfigs: { 'overlord-studio-engine@inline': { options: { vault_path: vault } } },
  }));
  assert.strictEqual(P.resolveVault(undefined, settings), vault);
});

test('resolveVault: nothing found -> null', () => {
  assert.strictEqual(P.resolveVault('/no/such/dir', '/nonexistent-settings'), null);
});
