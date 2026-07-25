'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const SETUP = path.join(__dirname, '..', 'studio-setup.js');
const CHECKER = path.join(__dirname, '..', 'atlas-map-check.js');

function tmp() { return fs.mkdtempSync(path.join(os.tmpdir(), 'setup-')); }

test('scaffold produces a map that validates, and is idempotent', () => {
  const base = tmp();
  const vault = path.join(base, 'my-vault');
  execFileSync('node', [SETUP, 'scaffold', vault], { encoding: 'utf8' });

  // Core files exist
  for (const f of ['_claude/memory/MEMORY.md', '_claude/studio-atlas-map.json',
    '_claude/flavours/_neutral', '_claude/flavours/active', 'CLAUDE.md']) {
    assert.ok(fs.existsSync(path.join(vault, f)), `missing ${f}`);
  }
  // Scaffolded map passes validation cold (so /logout runs clean)
  const map = path.join(vault, '_claude/studio-atlas-map.json');
  execFileSync('node', [CHECKER, 'validate', map]); // throws on non-zero exit
  // active pointer seeded to none
  assert.strictEqual(fs.readFileSync(path.join(vault, '_claude/flavours/active'), 'utf8').trim(), 'none');

  // Idempotent: second run doesn't throw and doesn't clobber
  fs.writeFileSync(path.join(vault, 'CLAUDE.md'), 'CUSTOM\n');
  execFileSync('node', [SETUP, 'scaffold', vault]);
  assert.match(fs.readFileSync(path.join(vault, 'CLAUDE.md'), 'utf8'), /CUSTOM/); // not overwritten
});

// A new vault must not inherit the studio's own retired mistake: an ever-growing
// context file @-imported into every session. It reached 16,537 tokens — 81% of the
// per-session cost — before it was killed. These assertions are the tripwire.
test('scaffold NEVER seeds an @-import, and never creates active_context', () => {
  const vault = path.join(tmp(), 'v');
  execFileSync('node', [SETUP, 'scaffold', vault]);

  const claude = fs.readFileSync(path.join(vault, 'CLAUDE.md'), 'utf8');
  assert.doesNotMatch(claude, /^@/m, 'CLAUDE.md must not @-import anything — it is loaded every session');
  assert.doesNotMatch(claude, /active_context/, 'active_context must not be referenced');
  assert.ok(!fs.existsSync(path.join(vault, '_claude/memory/active_context.md')),
    'active_context.md must not be scaffolded — it is retired');

  // Its replacement is the fixed-size restore card.
  assert.ok(fs.existsSync(path.join(vault, '_claude/HANDOFF.md')), 'HANDOFF.md (restore card) must be scaffolded');
  assert.match(claude, /HANDOFF/, 'CLAUDE.md should point at the restore card');
});

test('scaffold defaults autosync to OFF — a fresh vault never auto-pushes', () => {
  const vault = path.join(tmp(), 'v');
  execFileSync('node', [SETUP, 'scaffold', vault]);
  const cfg = fs.readFileSync(path.join(vault, '_claude/.studio-config'), 'utf8');
  assert.match(cfg, /^autosync=off$/m, 'autosync must default to off in a scaffolded vault');
  assert.doesNotMatch(cfg, /^autosync=on$/m);
});

test('scaffold defaults profile to pro — the safe default plan tier', () => {
  const vault = path.join(tmp(), 'v');
  execFileSync('node', [SETUP, 'scaffold', vault]);
  const cfg = fs.readFileSync(path.join(vault, '_claude/.studio-config'), 'utf8');
  assert.match(cfg, /^profile=pro$/m, 'profile must default to pro in a scaffolded vault');
  assert.doesNotMatch(cfg, /^profile=max$/m);
});

// --- reality-check registers (v0.2.0 M3: scaffold seeds the two vault-homed
// registers from the plugin's .default.txt files, idempotent like the rest of scaffold).

test('scaffold seeds the reality-check registers', () => {
  const vault = path.join(tmp(), 'v');
  execFileSync('node', [SETUP, 'scaffold', vault]);
  assert.ok(fs.existsSync(path.join(vault, '_claude/reality-check-ignore.txt')));
  assert.ok(fs.existsSync(path.join(vault, '_claude/reality-aspirational.txt')));

  // Idempotent: don't clobber a vault's own edits.
  fs.writeFileSync(path.join(vault, '_claude/reality-check-ignore.txt'), 'CUSTOM\n');
  execFileSync('node', [SETUP, 'scaffold', vault]);
  assert.match(fs.readFileSync(path.join(vault, '_claude/reality-check-ignore.txt'), 'utf8'), /CUSTOM/);
});

test('wire-hooks points a repo core.hooksPath at the plugin tools dir', () => {
  const vault = path.join(tmp(), 'v');
  execFileSync('node', [SETUP, 'scaffold', vault]);
  execFileSync('node', [SETUP, 'wire-hooks', vault]);
  const hp = execFileSync('git', ['-C', vault, 'config', 'core.hooksPath'], { encoding: 'utf8' }).trim();
  assert.strictEqual(hp, path.join(__dirname, '..'));
});
