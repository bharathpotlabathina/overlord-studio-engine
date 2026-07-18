'use strict';
// Task 0.1 (Stage 3 Phase 0) — studio doctor + wiring registry birth certificate.
// Acceptance per docs/superpowers/plans/2026-07-19-stage-3-studio-2.0-plan.md Task 0.1:
//  - dead wire: a registered mechanism whose trigger file is missing -> reported, named.
//  - orphan: a file under a wiring root that no registered mechanism claims as its trigger -> reported, named.
//  - all triggers present + all checks pass -> "checked N, found N green" + the mechanism count.
//  - dead-wire detection must not be foolable by a check script mutated to always-pass
//    (silence != success: the detector reads the filesystem, never trusts the check's exit code alone).
const { test } = require('node:test');
const assert = require('node:assert');
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const SCRIPT = path.join(__dirname, '..', 'doctor.js');

function newRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'doctor-'));
  fs.mkdirSync(path.join(root, 'hooks'), { recursive: true });
  fs.mkdirSync(path.join(root, 'tools', 'checks'), { recursive: true });
  return root;
}

function writePassingCheck(root, name) {
  const p = path.join(root, 'tools', 'checks', name);
  fs.writeFileSync(p, '#!/usr/bin/env node\nprocess.exit(0);\n');
  return path.join('tools', 'checks', name);
}

function writeFailingCheck(root, name) {
  const p = path.join(root, 'tools', 'checks', name);
  fs.writeFileSync(p, "#!/usr/bin/env node\nconsole.log('invariant broken');\nprocess.exit(1);\n");
  return path.join('tools', 'checks', name);
}

function writeTrigger(root, relPath) {
  const p = path.join(root, relPath);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, '// wire\n');
}

function writeRegistry(root, mechanisms, wiringRoots) {
  fs.writeFileSync(
    path.join(root, 'tools', 'registry.json'),
    JSON.stringify({ wiringRoots: wiringRoots || ['hooks'], mechanisms, documents: [] }, null, 2)
  );
}

function run(root, ...args) {
  try {
    const out = execFileSync('node', [SCRIPT, ...args], {
      env: { ...process.env, STUDIO_ROOT: root }, encoding: 'utf8',
    });
    return { code: 0, out: out.trim() };
  } catch (e) {
    return { code: e.status, out: (e.stdout || '').toString().trim(), err: (e.stderr || '').toString() };
  }
}

test('all triggers present + all checks pass -> checked N, found N green + count', () => {
  const root = newRoot();
  writeTrigger(root, 'hooks/a.js');
  const check = writePassingCheck(root, 'a-check.js');
  writeRegistry(root, [
    { id: 'mech-a', trigger: 'hooks/a.js', check, lastVerified: '2026-07-19', home: 'E' },
  ]);
  const r = run(root);
  assert.strictEqual(r.code, 0);
  assert.match(r.out, /checked 1, found 1 green/);
  assert.match(r.out, /mechanism count: 1/);
});

test('missing trigger file -> dead wire, named, blocks exit 0', () => {
  const root = newRoot();
  const check = writePassingCheck(root, 'a-check.js');
  // trigger never written -> dead wire
  writeRegistry(root, [
    { id: 'mech-a', trigger: 'hooks/a.js', check, lastVerified: '2026-07-19', home: 'E' },
  ]);
  const r = run(root);
  assert.notStrictEqual(r.code, 0);
  assert.match(r.out, /dead wire/);
  assert.match(r.out, /mech-a/);
});

test('unregistered file under a wiring root -> orphan, named, blocks exit 0', () => {
  const root = newRoot();
  writeTrigger(root, 'hooks/a.js');
  writeTrigger(root, 'hooks/b.js'); // never claimed by any mechanism
  const check = writePassingCheck(root, 'a-check.js');
  writeRegistry(root, [
    { id: 'mech-a', trigger: 'hooks/a.js', check, lastVerified: '2026-07-19', home: 'E' },
  ]);
  const r = run(root);
  assert.notStrictEqual(r.code, 0);
  assert.match(r.out, /orphan/);
  assert.match(r.out, /hooks[\\/]b\.js/);
});

test('a failing check is reported, named, and blocks exit 0', () => {
  const root = newRoot();
  writeTrigger(root, 'hooks/a.js');
  const check = writeFailingCheck(root, 'a-check.js');
  writeRegistry(root, [
    { id: 'mech-a', trigger: 'hooks/a.js', check, lastVerified: '2026-07-19', home: 'E' },
  ]);
  const r = run(root);
  assert.notStrictEqual(r.code, 0);
  assert.match(r.out, /mech-a/);
  assert.match(r.out, /invariant broken/);
});

test('dead-wire detection cannot be fooled by a check mutated to always-pass (silence != success)', () => {
  const root = newRoot();
  const check = writePassingCheck(root, 'a-check.js'); // check always exits 0
  // trigger missing -> must still be a dead wire regardless of the check's exit code
  writeRegistry(root, [
    { id: 'mech-a', trigger: 'hooks/a.js', check, lastVerified: '2026-07-19', home: 'E' },
  ]);
  const r = run(root);
  assert.notStrictEqual(r.code, 0);
  assert.match(r.out, /dead wire/);
});

test('empty registry still runs and reports zero mechanisms explicitly (silence != success)', () => {
  const root = newRoot();
  writeRegistry(root, []);
  const r = run(root);
  assert.strictEqual(r.code, 0);
  assert.match(r.out, /checked 0, found 0 green/);
  assert.match(r.out, /mechanism count: 0/);
});
