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
  fs.writeFileSync(path.join(vault, 'CLAUDE.md'), '@_claude/memory/active_context.md\nCUSTOM\n');
  execFileSync('node', [SETUP, 'scaffold', vault]);
  assert.match(fs.readFileSync(path.join(vault, 'CLAUDE.md'), 'utf8'), /CUSTOM/); // not overwritten
});

test('wire-hooks points a repo core.hooksPath at the plugin tools dir', () => {
  const vault = path.join(tmp(), 'v');
  execFileSync('node', [SETUP, 'scaffold', vault]);
  execFileSync('node', [SETUP, 'wire-hooks', vault]);
  const hp = execFileSync('git', ['-C', vault, 'config', 'core.hooksPath'], { encoding: 'utf8' }).trim();
  assert.strictEqual(hp, path.join(__dirname, '..'));
});
