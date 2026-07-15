'use strict';
// session-sync runs on EVERY Stop, inside the user's own git repo, and can push to
// their remote. It shipped untested. These tests exist to hold one line: it must do
// NOTHING unless the vault explicitly opted in — and a typo must fail closed.
const { test } = require('node:test');
const assert = require('node:assert');
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const SYNC = path.join(__dirname, '..', 'session-sync.js');

function git(cwd, args) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

// A vault with a real remote, so a push would actually land if the gate leaked.
function vaultWithRemote(configBody) {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'sync-'));
  const remote = path.join(base, 'remote.git');
  const vault = path.join(base, 'vault');
  fs.mkdirSync(vault, { recursive: true });
  git(base, ['init', '--bare', 'remote.git']);
  git(vault, ['init']);
  git(vault, ['config', 'user.email', 't@t.t']);
  git(vault, ['config', 'user.name', 'T']);
  git(vault, ['config', 'commit.gpgsign', 'false']);
  fs.writeFileSync(path.join(vault, 'seed.txt'), 'seed\n');
  git(vault, ['add', '.']);
  git(vault, ['commit', '-m', 'seed']);
  git(vault, ['remote', 'add', 'origin', remote]);
  git(vault, ['push', '-u', 'origin', 'HEAD:refs/heads/main']);
  if (configBody !== null) {
    fs.mkdirSync(path.join(vault, '_claude'), { recursive: true });
    fs.writeFileSync(path.join(vault, '_claude/.studio-config'), configBody);
    // Commit it: otherwise the config is itself an untracked change, the tree is
    // never clean, and the "nothing to commit" case can't be tested at all.
    git(vault, ['add', '.']);
    git(vault, ['commit', '-m', 'config']);
    git(vault, ['push', 'origin', 'HEAD:refs/heads/main']);
  }
  return { base, vault, remote };
}

const count = (d) => git(d, ['rev-list', '--count', 'HEAD']).trim();
const remoteCount = (r) => git(r, ['rev-list', '--count', 'refs/heads/main']).trim();

function dirty(vault) { fs.writeFileSync(path.join(vault, 'new.txt'), 'unreviewed\n'); }
function run(vault) { return execFileSync('node', [SYNC, vault], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); }

test('THE GATE: no config at all => does nothing (a fresh vault is never touched)', () => {
  const { vault, remote } = vaultWithRemote(null);
  const before = count(vault), rbefore = remoteCount(remote);
  dirty(vault);
  run(vault);
  assert.strictEqual(count(vault), before, 'committed without opt-in');
  assert.strictEqual(remoteCount(remote), rbefore, 'PUSHED without opt-in');
  assert.ok(fs.existsSync(path.join(vault, 'new.txt')), 'file should still be there, just uncommitted');
});

test('THE GATE: autosync=off => does nothing', () => {
  const { vault, remote } = vaultWithRemote('personas=on\nautosync=off\n');
  const before = count(vault), rbefore = remoteCount(remote);
  dirty(vault);
  run(vault);
  assert.strictEqual(count(vault), before);
  assert.strictEqual(remoteCount(remote), rbefore);
});

test('a typo FAILS CLOSED (autosync=yes is not opt-in)', () => {
  const { vault, remote } = vaultWithRemote('autosync=yes\n');
  const before = count(vault), rbefore = remoteCount(remote);
  dirty(vault);
  run(vault);
  assert.strictEqual(count(vault), before, 'a typo must not enable syncing');
  assert.strictEqual(remoteCount(remote), rbefore);
});

test('autosync=commit => commits locally but NEVER pushes', () => {
  const { vault, remote } = vaultWithRemote('autosync=commit\n');
  const before = Number(count(vault)), rbefore = remoteCount(remote);
  dirty(vault);
  run(vault);
  assert.strictEqual(Number(count(vault)), before + 1, 'should have committed');
  assert.strictEqual(remoteCount(remote), rbefore, 'must NOT push on autosync=commit');
});

test('autosync=on => commits and pushes', () => {
  const { vault, remote } = vaultWithRemote('autosync=on\n');
  const before = Number(count(vault)), rbefore = Number(remoteCount(remote));
  dirty(vault);
  run(vault);
  assert.strictEqual(Number(count(vault)), before + 1);
  assert.strictEqual(Number(remoteCount(remote)), rbefore + 1, 'should have pushed');
});

test('config parsing: comments, blank lines, spacing, case', () => {
  const { vault } = vaultWithRemote('# a comment\n\n  autosync =  ON  \npersonas=on\n');
  const before = Number(count(vault));
  dirty(vault);
  run(vault);
  assert.strictEqual(Number(count(vault)), before + 1, 'should tolerate spacing/case/comments');
});

test('opted in but nothing to commit => no empty commit', () => {
  const { vault } = vaultWithRemote('autosync=on\n');
  const before = count(vault);
  const out = run(vault); // clean tree
  assert.strictEqual(count(vault), before);
  assert.match(out, /Nothing to commit/);
});

test('never throws on a non-repo or missing path (the Stop hook must not break)', () => {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'sync-'));
  assert.doesNotThrow(() => execFileSync('node', [SYNC, base], { stdio: ['ignore', 'pipe', 'pipe'] }));
  assert.doesNotThrow(() => execFileSync('node', [SYNC], { stdio: ['ignore', 'pipe', 'pipe'] }));
});
