#!/usr/bin/env node
// Task 1.3 (Stage 3 Phase 1) — infra-check: live-state invariant boundary patrol.
// The airgap-grade prod rule's standing check: no dev/preview context may reach a
// production identifier. Config-driven (infra-check.json at the repo root names the
// prod identifiers and where to look). Invariant groups, each applicable only when
// its inputs exist on this machine:
//   env      — preview/dev env files must not contain a prod identifier
//   rls      — every CREATE TABLE in the migrations corpus has a matching
//              ENABLE ROW LEVEL SECURITY (static scan; the live-DB half is the
//              Release Engineer's operational runbook step, not this tool)
//   dupes    — no duplicate migration numbers (reuses migration-guard)
//   pgpass   — ~/.pgpass carries no prod host (M4 tool-default vector)
//   mcp      — MCP config files carry no prod project ref (M4)
//   vercel   — .vercel/project.json is not linked to a prod project id (M4)
// Cold install (m6): zero infra configured -> explicit N/A line, exit 0. Never an
// error on missing config, never a hollow "all green" implying prod was verified.
// ponytail: static-file checks only — anything needing a live connection is a
// runbook step; this tool must be safe to run cold, offline, unattended.
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { check: dupeCheck } = require('./migration-guard.js');

const GROUPS = ['env', 'rls', 'dupes', 'pgpass', 'mcp', 'vercel'];
const GROUP_COUNT = GROUPS.length;

// A count of invariants is not a statement of coverage. "checked 3 invariants, all hold"
// reads identically whether three groups passed and three had nothing to look at — which
// is how the product repo read as a full pass while env/mcp/vercel were never opened
// (2026-07-27). Every terminal line now names the groups that had no inputs.
function coverage(applicable, root) {
  const na = GROUPS.filter((g) => !applicable.has(g));
  if (!na.length) return '';
  let s = `${applicable.size} of ${GROUP_COUNT} groups applicable; not applicable (no inputs here): ${na.join(', ')}`;
  // A linked worktree has .git as a file, not a directory. The gitignored groups
  // (.env*, .mcp.json, .vercel/) are never checked out into one, so their silence there
  // is a coverage hole rather than a clean repo — say so instead of implying the latter.
  const dotgit = path.join(root, '.git');
  if (fs.existsSync(dotgit) && fs.statSync(dotgit).isFile()) {
    s += ' — running in a git worktree; gitignored infra files live in the main checkout, re-run there for real coverage';
  }
  return s;
}

function loadConfig(root) {
  const p = path.join(root, 'infra-check.json');
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function containsProdId(text, prodIds) {
  return prodIds.find((id) => text.includes(id));
}

// The "lockdown form": RLS enabled dynamically inside a DO block — EXECUTE
// format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t) driven by FOREACH
// over an array of table names. A literal-only scan reads that as absent (4 false
// positives on the first product run, live-disproven 2026-07-20). Names are harvested
// only from arrays in the *same* block as the dynamic ENABLE, so a table listed in
// some unrelated block's array is not silently counted as covered.
function lockdownCovered(corpus) {
  const covered = new Set();
  for (const [block] of corpus.matchAll(/\bDO\s+(\$\w*\$)[\s\S]*?END\s*\1/gi)) {
    if (!/format\(\s*'ALTER TABLE[^']*%I[^']*ENABLE ROW LEVEL SECURITY/i.test(block)) continue;
    for (const arr of block.matchAll(/ARRAY\s*\[([^\]]*)\]/gi)) {
      for (const n of arr[1].matchAll(/'(\w+)'/g)) covered.add(n[1].toLowerCase());
    }
  }
  return covered;
}

function main() {
  const root = process.cwd();
  const cfg = loadConfig(root);
  if (!cfg || !Array.isArray(cfg.prodIdentifiers) || cfg.prodIdentifiers.length === 0) {
    console.log(`no infra configured — 0 of ${GROUP_COUNT} invariant groups applicable (cold install)`);
    return 0;
  }
  const prodIds = cfg.prodIdentifiers;
  const failures = [];
  const applicable = new Set();
  let checked = 0;

  // env group
  for (const f of cfg.envFiles || []) {
    const p = path.join(root, f);
    if (!fs.existsSync(p)) continue;
    checked += 1;
    applicable.add('env');
    const hit = containsProdId(fs.readFileSync(p, 'utf8'), prodIds);
    if (hit) failures.push(`${f}: contains prod identifier "${hit}" — preview/dev must never point at prod`);
  }

  // rls + dupes groups (per migrations dir)
  for (const dir of cfg.migrationsDirs || []) {
    const abs = path.join(root, dir);
    if (!fs.existsSync(abs)) continue;
    const sqlFiles = fs.readdirSync(abs).filter((f) => f.endsWith('.sql'));
    const corpus = sqlFiles.map((f) => fs.readFileSync(path.join(abs, f), 'utf8')).join('\n');
    checked += 1;
    applicable.add('rls');
    const created = [...corpus.matchAll(/CREATE TABLE (?:IF NOT EXISTS )?"?([\w.]+)"?/gi)].map((m) => m[1]);
    const covered = lockdownCovered(corpus);
    for (const t of created) {
      const bare = t.split('.').pop();
      const rls = new RegExp(`ALTER TABLE (?:IF EXISTS )?"?(?:[\\w]+\\.)?${bare}"? ENABLE ROW LEVEL SECURITY`, 'i');
      if (!rls.test(corpus) && !covered.has(bare.toLowerCase())) failures.push(`${dir}: table "${t}" created without ENABLE ROW LEVEL SECURITY`);
    }
    checked += 1;
    applicable.add('dupes');
    // dupeCheck prints its own findings; capture via return code only.
    const origLog = console.log;
    let dupeOut = '';
    console.log = (s) => { dupeOut += s + '\n'; };
    const dupeCode = dupeCheck(abs);
    console.log = origLog;
    if (dupeCode !== 0) failures.push(`${dir}: ${dupeOut.trim().replace(/\n/g, ' · ')}`);
  }

  // pgpass group (M4)
  if (cfg.pgpass) {
    const p = path.join(os.homedir(), '.pgpass');
    if (fs.existsSync(p)) {
      checked += 1;
      applicable.add('pgpass');
      const hit = containsProdId(fs.readFileSync(p, 'utf8'), prodIds);
      if (hit) failures.push(`~/.pgpass: carries prod host "${hit}" — a dev-context tool default reaching prod (M4)`);
    }
  }

  // mcp group (M4)
  for (const f of cfg.mcpConfigs || []) {
    const p = path.isAbsolute(f) ? f : path.join(root, f);
    if (!fs.existsSync(p)) continue;
    checked += 1;
    applicable.add('mcp');
    const hit = containsProdId(fs.readFileSync(p, 'utf8'), prodIds);
    if (hit) failures.push(`${f}: MCP config resolves to prod identifier "${hit}" (M4)`);
  }

  // vercel group (M4). Both link formats: project.json for a plain `vercel link`,
  // repo.json when the directory is linked through its git remote. Only project.json was
  // ever read, so a repo.json-linked checkout had this group silently inert (2026-07-27).
  for (const name of ['project.json', 'repo.json']) {
    const p = path.join(root, '.vercel', name);
    if (!fs.existsSync(p)) continue;
    checked += 1;
    applicable.add('vercel');
    const hit = containsProdId(fs.readFileSync(p, 'utf8'), prodIds);
    if (hit) failures.push(`.vercel/${name}: linked to prod project "${hit}" (M4)`);
  }

  if (checked === 0) {
    console.log(`no infra configured — 0 of ${GROUP_COUNT} invariant groups applicable (cold install)`);
    return 0;
  }
  const cov = coverage(applicable, root);
  if (failures.length) {
    console.log(`INFRA-CHECK FAILED — ${failures.length} invariant violation(s):`);
    failures.forEach((f) => console.log('  ' + f));
    if (cov) console.log(cov);
    return 1;
  }
  console.log(`checked ${checked} invariant${checked === 1 ? '' : 's'}, all hold${cov ? ' — ' + cov : ''}`);
  return 0;
}

if (require.main === module) process.exit(main());
module.exports = { main };
