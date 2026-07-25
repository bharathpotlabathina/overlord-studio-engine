'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs'); const os = require('os'); const path = require('path');
const { execFileSync } = require('child_process');
const { check } = require('../reality-check.js');

function fixtureVault() {
  const v = fs.mkdtempSync(path.join(os.tmpdir(), 'rcheck-'));
  fs.mkdirSync(path.join(v, '_claude'), { recursive: true });
  fs.mkdirSync(path.join(v, 'docs'), { recursive: true });
  execFileSync('git', ['init', '-q', v]);
  fs.writeFileSync(path.join(v, 'docs', 'live.md'),
    'Live: `_claude/HANDOFF.md`. Dead: `setup/ghost.sh`. Asp: `sot/x.md`.\n' +
    'Cmd: `setup/tool.sh --flag`. Prose setup/unquoted.sh stays out.\n');
  fs.writeFileSync(path.join(v, 'docs', '2026-01-01-old.md'), 'Historic: `setup/gone-forever.sh`\n');
  fs.writeFileSync(path.join(v, '_claude', 'HANDOFF.md'), 'x\n');
  fs.writeFileSync(path.join(v, '_claude', 'reality-check-ignore.txt'), '# none\n');
  fs.writeFileSync(path.join(v, '_claude', 'reality-aspirational.txt'), 'sot/\n');
  fs.writeFileSync(path.join(v, 'setup') + '.md', ''); // ensure setup/ absent as dir
  execFileSync('git', ['-C', v, 'add', '-A']);
  return v;
}

test('classification: broken vs declared vs silent', () => {
  const r = check(fixtureVault());
  assert.ok(r.broken.includes('setup/ghost.sh'), 'dead ref reported broken');
  assert.ok(r.declared.includes('sot/x.md'), 'aspirational-registered ref routed to declared');
  assert.ok(!r.broken.includes('_claude/HANDOFF.md'), 'live ref not reported');
  assert.ok(!r.broken.some((x) => x.includes('unquoted')), 'unquoted prose skipped');
  assert.ok(!r.broken.includes('setup/gone-forever.sh'), 'date-stamped docs are records, not drift');
  assert.ok(r.broken.includes('setup/tool.sh --flag'), 'file token missing -> reported with full ref');
});

test('ignore register silences a broken ref', () => {
  const v = fixtureVault();
  fs.writeFileSync(path.join(v, '_claude', 'reality-check-ignore.txt'), '# real noise\nsetup/ghost.sh\n');
  execFileSync('git', ['-C', v, 'add', '-A']);
  const r = check(v);
  assert.ok(!r.broken.includes('setup/ghost.sh'));
  assert.ok(!r.declared.includes('setup/ghost.sh'));
});

test('_claude/archive/ excluded from scanning', () => {
  const v = fixtureVault();
  fs.mkdirSync(path.join(v, '_claude', 'archive'), { recursive: true });
  fs.writeFileSync(path.join(v, '_claude', 'archive', 'old.md'), 'Archived dead ref: `setup/archived-ghost.sh`\n');
  execFileSync('git', ['-C', v, 'add', '-A']);
  const r = check(v);
  assert.ok(!r.broken.includes('setup/archived-ghost.sh'));
});

test('clean vault reports none', () => {
  const v = fs.mkdtempSync(path.join(os.tmpdir(), 'rcheck-clean-'));
  fs.mkdirSync(path.join(v, '_claude'), { recursive: true });
  execFileSync('git', ['init', '-q', v]);
  fs.writeFileSync(path.join(v, '_claude', 'README.md'), 'x\n');
  fs.writeFileSync(path.join(v, 'README.md'), 'All good, `_claude/README.md` exists.\n');
  execFileSync('git', ['-C', v, 'add', '-A']);
  const r = check(v);
  assert.deepStrictEqual(r.broken, []);
  assert.deepStrictEqual(r.declared, []);
  assert.ok(r.lines.includes('BROKEN: none'), '"BROKEN: none" line rendered when nothing broken');
});

test('tracked-but-deleted .md (rm without git rm) does not crash check() or the CLI', () => {
  const v = fixtureVault();
  // routine uncommitted vault state: file removed from disk, still tracked/staged in git
  fs.unlinkSync(path.join(v, 'docs', 'live.md'));
  assert.doesNotThrow(() => check(v));
  const r = check(v);
  // the deleted file's refs (setup/ghost.sh, setup/tool.sh --flag) must not contribute
  assert.ok(!r.broken.includes('setup/ghost.sh'));
  assert.ok(!r.broken.includes('setup/tool.sh --flag'));
  assert.doesNotThrow(() => {
    execFileSync('node', [path.join(__dirname, '..', 'reality-check.js'), v], { encoding: 'utf8' });
  }, 'CLI must still exit 0 with a tracked-but-deleted file present');
});

test('CLI always exits 0, even with broken refs present', () => {
  const v = fixtureVault();
  const out = execFileSync('node', [path.join(__dirname, '..', 'reality-check.js'), v], { encoding: 'utf8' });
  assert.ok(out.includes('BROKEN'));
});
