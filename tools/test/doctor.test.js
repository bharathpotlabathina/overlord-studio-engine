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

// HOME is isolated to a nonexistent dir so resolveVault()'s settings.json fallback
// can never leak the real machine's configured vault into a test run (this repo's
// own ~/.claude/settings.json points at a real vault_path) — tests stay hermetic.
function run(root, ...args) {
  try {
    const out = execFileSync('node', [SCRIPT, ...args], {
      env: { ...process.env, STUDIO_ROOT: root, HOME: '/nonexistent-doctor-test-home' }, encoding: 'utf8',
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

// --- install staleness (2026-07-19 incident: marketplace refreshed, install didn't
// follow, hooks ran a version behind the pushed engine — local-only gauge, no network).

function newPluginsDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'plugins-'));
}

function writePluginManifest(dir, name, version) {
  fs.mkdirSync(path.join(dir, '.claude-plugin'), { recursive: true });
  fs.writeFileSync(path.join(dir, '.claude-plugin', 'plugin.json'), JSON.stringify({ name, version }));
}

function newCacheInstall(pluginsDir, mkt, name, version) {
  const root = path.join(pluginsDir, 'cache', mkt, name, version);
  fs.mkdirSync(path.join(root, 'hooks'), { recursive: true });
  fs.mkdirSync(path.join(root, 'tools', 'checks'), { recursive: true });
  writePluginManifest(root, name, version);
  writeRegistry(root, []);
  return root;
}

function runWithPlugins(root, pluginsDir) {
  try {
    const out = execFileSync('node', [SCRIPT], {
      env: { ...process.env, STUDIO_ROOT: root, STUDIO_PLUGINS_DIR: pluginsDir, HOME: '/nonexistent-doctor-test-home' }, encoding: 'utf8',
    });
    return { code: 0, out: out.trim() };
  } catch (e) {
    return { code: e.status, out: (e.stdout || '').toString().trim(), err: (e.stderr || '').toString() };
  }
}

test('marketplace install matching the marketplace clone -> install current, stays green', () => {
  const pluginsDir = newPluginsDir();
  const root = newCacheInstall(pluginsDir, 'acme', 'acme-engine', '1.0.0');
  writePluginManifest(path.join(pluginsDir, 'marketplaces', 'acme'), 'acme-engine', '1.0.0');
  const r = runWithPlugins(root, pluginsDir);
  assert.strictEqual(r.code, 0);
  assert.match(r.out, /install-staleness: current/);
});

test('marketplace clone ahead of the install -> STALE, named update command, blocks exit 0', () => {
  const pluginsDir = newPluginsDir();
  const root = newCacheInstall(pluginsDir, 'acme', 'acme-engine', '1.0.0');
  writePluginManifest(path.join(pluginsDir, 'marketplaces', 'acme'), 'acme-engine', '1.0.1');
  const r = runWithPlugins(root, pluginsDir);
  assert.notStrictEqual(r.code, 0);
  assert.match(r.out, /STALE INSTALL/);
  assert.match(r.out, /1\.0\.0/);
  assert.match(r.out, /1\.0\.1/);
  assert.match(r.out, /claude plugin update acme-engine@acme/);
});

test('root outside the plugins cache (dev checkout) -> explicit N/A, stays green', () => {
  const pluginsDir = newPluginsDir();
  const root = newRoot();
  writeRegistry(root, []);
  const r = runWithPlugins(root, pluginsDir);
  assert.strictEqual(r.code, 0);
  assert.match(r.out, /install-staleness: N\/A/);
});

// --- active plan profile row (v0.2.0 M1: doctor surfaces resolveProfile's answer,
// green informational — pro and max are both valid, a profile can never be red).

test('doctor reports the active plan profile', () => {
  const root = newRoot();
  writeRegistry(root, []);
  const r = run(root);
  assert.strictEqual(r.code, 0);
  assert.match(r.out, /profile: (pro|max)/);
});

// --- reality-check row (v0.2.0 M3: informational, report-only law — this row can
// never turn the run red, same shape as the profile row above).

test('doctor reports reality-check broken count against a resolved vault, and it never fails the run', () => {
  const root = newRoot();
  writeRegistry(root, []);
  const vault = fs.mkdtempSync(path.join(os.tmpdir(), 'doctor-vault-'));
  const r = run(root, vault);
  assert.strictEqual(r.code, 0);
  assert.match(r.out, /reality-check: \d+ broken/);
});

test('no vault resolves -> reality-check row says so explicitly, still never fails the run', () => {
  const root = newRoot();
  writeRegistry(root, []);
  const r = run(root); // no vault arg, HOME isolated -> resolveVault() finds nothing
  assert.strictEqual(r.code, 0);
  assert.match(r.out, /reality-check: no vault configured \(skipped\)/);
});

// CRITICAL fixup: a reality-check register that exists as a DIRECTORY (plausible user
// slip) must not crash the whole doctor run — mirrors the profile row's try/catch survival.
test('reality-check register as a directory (in the vault) does not crash the doctor run', () => {
  const root = newRoot();
  writeRegistry(root, []);
  const vault = fs.mkdtempSync(path.join(os.tmpdir(), 'doctor-vault-'));
  fs.mkdirSync(path.join(vault, '_claude', 'reality-check-ignore.txt'), { recursive: true });
  const r = run(root, vault);
  assert.strictEqual(r.code, 0);
  assert.match(r.out, /reality-check: \d+ broken/);
  assert.match(r.out, /checked 0, found 0 green/);
});

// --- defect 1: doctor CLI must self-anchor to the engine's own location, never the
// invoking process's cwd-git-toplevel. A user running `node tools/doctor.js` (or a
// wired hook) from inside an unrelated git repo (e.g. their vault) must get normal
// output against the ENGINE's registry, not an ENOENT crash from a foreign cwd.
test('CLI does not crash when invoked from a non-engine git cwd (defect 1)', () => {
  const foreignRepo = fs.mkdtempSync(path.join(os.tmpdir(), 'foreign-git-'));
  execFileSync('git', ['init', '-q'], { cwd: foreignRepo });
  const env = { ...process.env, HOME: '/nonexistent-doctor-test-home' };
  delete env.STUDIO_ROOT; // must NOT rely on STUDIO_ROOT — self-anchor without it
  let result;
  try {
    result = { code: 0, out: execFileSync('node', [SCRIPT], { cwd: foreignRepo, encoding: 'utf8', env }).toString() };
  } catch (e) {
    result = { code: e.status, out: (e.stdout || '').toString(), err: (e.stderr || '').toString() };
  }
  assert.ok(!/ENOENT/.test(result.err || ''), `must not crash on the foreign repo's missing tools/registry.json: ${result.err}`);
  assert.match(result.out, /mechanism count: \d+/);
});

// --- defect 2: the reality-check row must target the RESOLVED VAULT, never the engine
// root — the engine's own docs can reference vault-only paths that are never "broken".
test('reality-check row targets the resolved vault, not the engine root (defect 2)', () => {
  const root = newRoot();
  writeRegistry(root, []);
  execFileSync('git', ['init', '-q'], { cwd: root });
  fs.writeFileSync(path.join(root, 'BROKEN.md'), 'Ref: `_claude/does-not-exist.md`\n');
  execFileSync('git', ['-C', root, 'add', '-A']);

  const vault = fs.mkdtempSync(path.join(os.tmpdir(), 'doctor-vault-'));
  fs.mkdirSync(path.join(vault, '_claude'), { recursive: true });
  execFileSync('git', ['init', '-q'], { cwd: vault });
  fs.writeFileSync(path.join(vault, '_claude', 'README.md'), 'x\n');
  fs.writeFileSync(path.join(vault, 'README.md'), 'All good, `_claude/README.md` exists.\n');
  execFileSync('git', ['-C', vault, 'add', '-A']);

  const r = run(root, vault);
  assert.strictEqual(r.code, 0);
  assert.match(r.out, /reality-check: 0 broken/); // not the engine root's broken ref
});
