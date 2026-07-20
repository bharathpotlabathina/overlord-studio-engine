#!/usr/bin/env node
// PREFLIGHT — the launch board, read before any push to a distribution repo.
//
// Why this exists: the recurring defect in this codebase has never been bad code.
// It is THE LAST WIRE NEVER CONNECTED — something built, that reports as done and
// behaves as absent. A config file nothing reads. A hook pointing at a deleted
// file. A tool with no test. A scaffolder still seeding a thing that was retired.
// Each survives review because nothing contradicts it: an unwired mechanism is
// silent, not wrong.
//
// So this checks CONNECTEDNESS, not correctness. The test suite proves the parts
// work; preflight asks whether they are plugged into anything.
//
// PASSING IS NOT GO. Passing earns the right to ask for GO. A human reads the
// board and says the words. Exit 1 means do not ask.
//
// Usage: node tools/preflight.js
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const rows = [];
const record = (name, ok, detail) => { rows.push({ name, ok, detail }); return ok; };

function sh(cmd, args, opts) {
  return execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...opts });
}

// 1. Every hook points at a file that exists. A hook whose target is gone fails
//    silently at runtime — the session just quietly stops doing the thing.
function checkHooks() {
  const p = path.join(ROOT, 'hooks/hooks.json');
  if (!fs.existsSync(p)) return record('hooks → targets exist', false, 'hooks/hooks.json missing');
  const raw = fs.readFileSync(p, 'utf8');
  const missing = [];
  let n = 0;
  for (const m of raw.matchAll(/\$\{CLAUDE_PLUGIN_ROOT\}\/([A-Za-z0-9_./-]+)/g)) {
    n++;
    if (!fs.existsSync(path.join(ROOT, m[1]))) missing.push(m[1]);
  }
  return record('hooks → targets exist', missing.length === 0,
    missing.length ? `DEAD: ${missing.join(', ')}` : `${n} hook targets resolve`);
}

// 2. Every tool is INVOKED by something. This is a wiring check, and it replaced
//    "every tool has a test" — which was coverage wearing a wiring badge. A test
//    proves a part works; it says nothing about whether the part is plugged in.
//    On this board's first run the coverage check produced noise (three trivial
//    tools) while THIS check caught the real thing: preflight itself, invoked by
//    nothing. A gate nobody calls is the disease, not the cure.
function checkToolsInvoked() {
  const tools = fs.readdirSync(path.join(ROOT, 'tools')).filter(f => f.endsWith('.js'));

  // Read every candidate caller, keyed by file, so a tool's OWN file can be excluded.
  // This mattered: the first version counted a tool's `// Usage: node tools/x.js`
  // comment as a call, so any tool that mentioned itself cleared itself — and
  // preflight was the first to do it. A gate that self-certifies is the disease.
  const files = new Map();
  const readAll = (dir) => {
    if (!fs.existsSync(dir)) return;
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) { if (e.name !== 'test') readAll(p); }
      else { try { files.set(p, fs.readFileSync(p, 'utf8')); } catch { /* binary */ } }
    }
  };
  ['hooks', 'commands', 'skills', 'methodology', 'tools'].forEach(d => readAll(path.join(ROOT, d)));

  // preflight is invoked by the PUSH GATE, which lives in the operator's vault and
  // deliberately does not ship here (it would publish an absolute private path into
  // a public repo). So its caller is out of scope for this scan, by design — not
  // missing. Exempted with that reason stated, never silently.
  const EXEMPT = new Map([['preflight.js', 'invoked by the vault push-gate, outside this repo by design']]);

  const dead = [];
  for (const t of tools) {
    if (EXEMPT.has(t)) continue;
    const own = path.join(ROOT, 'tools', t);
    let called = false;
    for (const [f, body] of files) {
      if (f === own) continue;              // a tool cannot invoke itself
      if (body.includes(t)) { called = true; break; }
    }
    if (!called) dead.push(t);
  }
  const note = `${tools.length} tools, all reachable (${EXEMPT.size} exempt: ${[...EXEMPT.keys()].join(', ')})`;
  return record('tools → each is invoked', dead.length === 0,
    dead.length ? `DEAD (nothing calls them): ${dead.join(', ')}` : note);
}

// 3. The suite actually passes.
function checkSuite() {
  try {
    const out = sh('node', ['--test', ...fs.readdirSync(path.join(ROOT, 'tools/test'))
      .filter(f => f.endsWith('.test.js')).map(f => path.join(ROOT, 'tools/test', f))]);
    const pass = (out.match(/^# pass (\d+)/m) || [])[1];
    const fail = (out.match(/^# fail (\d+)/m) || [])[1];
    return record('suite → green', fail === '0', `${pass} pass / ${fail} fail`);
  } catch (e) {
    const out = (e.stdout || '') + (e.stderr || '');
    const fail = (out.match(/^# fail (\d+)/m) || ['', '?'])[1];
    return record('suite → green', false, `${fail} FAILING`);
  }
}

// 4. COLD INSTALL. Scaffold a vault the way a stranger would and inspect what they
//    actually get — not what the repo contains. This is the check that would have
//    caught the engine seeding an @-import of a context file the origin studio had
//    already retired: the repo was clean, the SCAFFOLDER was not.
function checkColdInstall() {
  const v = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'preflight-')), 'vault');
  try { sh('node', [path.join(ROOT, 'tools/studio-setup.js'), 'scaffold', v]); }
  catch (e) { return record('cold install → sane vault', false, 'scaffold threw: ' + (e.stderr || e.message).slice(0, 60)); }

  const problems = [];
  const claude = path.join(v, 'CLAUDE.md');
  if (!fs.existsSync(claude)) problems.push('no CLAUDE.md');
  else {
    const t = fs.readFileSync(claude, 'utf8');
    if (/^@/m.test(t)) problems.push('CLAUDE.md @-imports (every session pays for it, forever)');
    if (/active_context/.test(t)) problems.push('CLAUDE.md references retired active_context');
    const tok = Math.round(fs.statSync(claude).size / 4);
    if (tok > 500) problems.push(`Tier 0 is ~${tok} tok — a fresh vault should be tiny`);
  }
  if (fs.existsSync(path.join(v, '_claude/memory/active_context.md')))
    problems.push('scaffolds retired active_context.md');

  const cfg = path.join(v, '_claude/.studio-config');
  if (!fs.existsSync(cfg)) problems.push('no .studio-config');
  else if (!/^autosync=off$/m.test(fs.readFileSync(cfg, 'utf8')))
    problems.push('autosync does NOT default to off — a stranger would be auto-pushed');

  try { sh('node', [path.join(ROOT, 'tools/atlas-map-check.js'), 'validate', path.join(v, '_claude/studio-atlas-map.json')]); }
  catch { problems.push('scaffolded map fails validation'); }

  return record('cold install → sane vault', problems.length === 0,
    problems.length ? problems.join(' · ') : 'no @-import · autosync=off · map validates');
}

// 5. Every config key the scaffolder WRITES is read by something. This is the
//    canonical unwired shape: .studio-config was seeded with personas=on and read
//    by nothing for months — a config that configured nothing.
function checkConfigWired() {
  const setup = fs.readFileSync(path.join(ROOT, 'tools/studio-setup.js'), 'utf8');
  const seed = (setup.match(/const STUDIO_CONFIG_SEED = `([\s\S]*?)`;/) || [])[1] || '';
  const keys = [...seed.matchAll(/^([a-z_]+)=/gm)].map(m => m[1]);
  const body = fs.readdirSync(path.join(ROOT, 'tools'))
    .filter(f => f.endsWith('.js'))
    .map(f => fs.readFileSync(path.join(ROOT, 'tools', f), 'utf8')).join('\n');
  const dead = keys.filter(k => !new RegExp(`['"\`]${k}['"\`]`).test(body));
  return record('config keys → something reads them', dead.length === 0,
    dead.length ? `WRITE-ONLY: ${dead.join(', ')}` : `${keys.join(', ')} — all read`);
}

// 5b. FLAGS LEDGER — no open flags at push time. Added 2026-07-20 (postmortem:
//     the 2026-07-19 reality sweep flagged studio-pipeline.md "migrate-with-
//     rewrite"; the flag had no carrier and three versions shipped stale docs).
//     A sweep/absorption flag lands as an OPEN line in FLAGS.md; only a
//     RESOLVED or Director-WAIVED line clears it.
function checkFlags() {
  try { const out = sh('node', [path.join(ROOT, 'tools/checks/flags-check.js')]); return record('flags ledger → no open flags', true, out.trim()); }
  catch (e) { return record('flags ledger → no open flags', false, ((e.stdout || '') + (e.stderr || '')).trim().split('\n').slice(0, 2).join(' ')); }
}

// 6. Leak scan, if the vault's scanner is reachable. Distribution repos must not
//    carry private names, personas, or local-rig jargon. REPO MODE (--repo) is
//    load-bearing: for its whole life before 2026-07-20 this call passed the repo
//    directory as a FILE argument — the scanner read nothing and printed clean,
//    so every board ever read carried a hollow green on this row. This board's
//    own disease, on its own soil. preflight-leak.test.js pins the wiring.
function checkLeakScan(scanner, root) {
  scanner = scanner || path.join(os.homedir(), 'Documents/overlord-vault/setup/dist-leak-scan.js');
  root = root || ROOT;
  if (!fs.existsSync(scanner)) return record('leak scan', null, 'scanner not on this machine — run before push');
  try { sh('node', [scanner, '--repo', root]); return record('leak scan', true, 'clean'); }
  catch (e) { return record('leak scan', false, ((e.stdout || '') + (e.stderr || '')).trim().split('\n').slice(0, 2).join(' ')); }
}


// 7. PLAYBOOK REFERENCES RESOLVE IN A COLD VAULT. The board's blind spot, added
//    2026-07-15 after it passed a genuinely broken /login: the scaffolder had
//    stopped creating active_context.md while login.md still told the session to
//    read it. Removing a thing and leaving its READER is the same defect as
//    building a thing and leaving it unwired — a dangling reader is silent too.
//    Globs are skipped: `roles/x-domain-*.md` is legitimately optional.
function checkPlaybookRefs() {
  const v = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'preflight-refs-')), 'vault');
  try { sh('node', [path.join(ROOT, 'tools/studio-setup.js'), 'scaffold', v]); }
  catch { return record('playbooks → refs resolve cold', false, 'scaffold failed'); }

  const bad = [];
  const scan = (dir) => {
    if (!fs.existsSync(dir)) return;
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) { scan(p); continue; }
      if (!e.name.endsWith('.md')) continue;
      const body = fs.readFileSync(p, 'utf8');
      for (const m of body.matchAll(/\{\{VAULT\}\}\/([A-Za-z0-9_./*-]+)/g)) {
        const ref = m[1];
        if (ref.includes('*')) continue;                 // optional payload glob
        if (!fs.existsSync(path.join(v, ref)))
          bad.push(`${path.relative(ROOT, p)} → ${ref}`);
      }
    }
  };
  scan(path.join(ROOT, 'methodology'));
  scan(path.join(ROOT, 'commands'));
  const uniq = [...new Set(bad)];
  return record('playbooks → refs resolve cold', uniq.length === 0,
    uniq.length ? `DANGLING READER: ${uniq.slice(0, 3).join(' · ')}${uniq.length > 3 ? ` (+${uniq.length - 3})` : ''}`
                : 'every {{VAULT}} path a playbook names exists in a fresh vault');
}

// 8. Target-tier battery — the engine's value claim is "built at top tier, RUNS
//    at the distribution tier" (decision 2026-07-19; the model tier is a target
//    platform, same class as the Windows lesson). The claim is only real if cold
//    distribution-tier agents have actually driven the user-facing flows. The
//    board cannot prove those runs were honest — it proves a run is RECORDED
//    (file + Last-run date + verdict) and surfaces it for the human to judge
//    staleness against what changed since.
function checkTargetTier() {
  const p = path.join(ROOT, 'test/target-tier-battery.md');
  if (!fs.existsSync(p)) return record('target-tier battery → recorded', false, 'test/target-tier-battery.md missing — run the battery');
  const m = fs.readFileSync(p, 'utf8').match(/^Last run:\s*(\S+).*verdict:\s*(\S+)/mi);
  if (!m) return record('target-tier battery → recorded', false, 'no "Last run: <date> ... verdict: <v>" line');
  return record('target-tier battery → recorded', true, `${m[1]} verdict ${m[2]} — judge staleness on read`);
}

function main() {
  checkHooks(); checkToolsInvoked(); checkSuite();
  checkColdInstall(); checkConfigWired(); checkFlags(); checkPlaybookRefs(); checkLeakScan(); checkTargetTier();

  const w = Math.max(...rows.map(r => r.name.length));
  process.stdout.write('\n  PREFLIGHT — ' + path.basename(ROOT) + '\n');
  process.stdout.write('  ' + '─'.repeat(w + 46) + '\n');
  for (const r of rows) {
    const mark = r.ok === null ? 'SKIP' : r.ok ? ' GO ' : 'HOLD';
    process.stdout.write(`  [${mark}]  ${r.name.padEnd(w)}  ${r.detail}\n`);
  }
  process.stdout.write('  ' + '─'.repeat(w + 46) + '\n');

  const held = rows.filter(r => r.ok === false);
  if (held.length) {
    process.stdout.write(`\n  ✗ HOLD — ${held.length} system(s) not go. Do not ask for GO.\n\n`);
    process.exit(1);
  }
  process.stdout.write('\n  ✓ All systems nominal. This is NOT go —\n');
  process.stdout.write('    it is the right to ask. The Overlord says GO.\n\n');
}

if (require.main === module) main();
module.exports = { checkLeakScan };
