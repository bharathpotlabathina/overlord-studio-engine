'use strict';
// Task 1.3 (Stage 3 Phase 1) — infra-check live-state invariants.
// Acceptance per plan: preview env pointing at prod DB -> fail; RLS-less table -> fail;
// pgpass/MCP tool-default pointing at prod -> fail (M4 vector); revert each -> pass.
// Cold install (m6): zero infra configured -> explicit N/A line, exit 0 — never an
// error on missing config, never a hollow "all green".
const { test } = require('node:test');
const assert = require('node:assert');
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const SCRIPT = path.join(__dirname, '..', 'infra-check.js');

function newRepo(config) {
  const r = fs.mkdtempSync(path.join(os.tmpdir(), 'infra-'));
  const home = path.join(r, 'home');
  fs.mkdirSync(home, { recursive: true });
  if (config) fs.writeFileSync(path.join(r, 'infra-check.json'), JSON.stringify(config, null, 2));
  return { r, home };
}

function run(cwd, home) {
  try {
    const out = execFileSync('node', [SCRIPT], {
      cwd, encoding: 'utf8',
      env: { ...process.env, HOME: home, USERPROFILE: home },
    });
    return { code: 0, out: out.trim() };
  } catch (e) {
    return { code: e.status, out: (e.stdout || '').toString().trim() };
  }
}

const PROD = 'db.prodref1234.supabase.co';
const BASE = {
  prodIdentifiers: [PROD, 'prodref1234'],
  envFiles: ['.env', '.env.preview'],
  migrationsDirs: ['migrations'],
  pgpass: true,
  mcpConfigs: ['.mcp.json'],
};

test('cold install: no config anywhere -> explicit N/A line, exit 0', () => {
  const { r, home } = newRepo(null);
  const res = run(r, home);
  assert.strictEqual(res.code, 0);
  assert.match(res.out, /no infra configured — 0 of \d+ invariant groups applicable \(cold install\)/);
});

test('clean configured state -> positive proof, all hold', () => {
  const { r, home } = newRepo(BASE);
  fs.writeFileSync(path.join(r, '.env.preview'), 'DATABASE_URL=postgres://db.devref.supabase.co/dev\n');
  fs.mkdirSync(path.join(r, 'migrations'));
  fs.writeFileSync(path.join(r, 'migrations', '001_a.sql'),
    'CREATE TABLE users (id int);\nALTER TABLE users ENABLE ROW LEVEL SECURITY;\n');
  const res = run(r, home);
  assert.strictEqual(res.code, 0);
  assert.match(res.out, /checked \d+ invariants?, all hold/);
});

test('preview env var pointing at the prod DB -> fail, named; revert -> pass', () => {
  const { r, home } = newRepo(BASE);
  fs.writeFileSync(path.join(r, '.env.preview'), `DATABASE_URL=postgres://${PROD}/main\n`);
  const bad = run(r, home);
  assert.notStrictEqual(bad.code, 0);
  assert.match(bad.out, /\.env\.preview/);
  assert.match(bad.out, /prodref1234/);
  fs.writeFileSync(path.join(r, '.env.preview'), 'DATABASE_URL=postgres://db.devref.supabase.co/dev\n');
  assert.strictEqual(run(r, home).code, 0);
});

test('RLS: CREATE TABLE without ENABLE ROW LEVEL SECURITY -> fail; add it -> pass', () => {
  const { r, home } = newRepo(BASE);
  fs.mkdirSync(path.join(r, 'migrations'));
  fs.writeFileSync(path.join(r, 'migrations', '001_a.sql'), 'CREATE TABLE orders (id int);\n');
  const bad = run(r, home);
  assert.notStrictEqual(bad.code, 0);
  assert.match(bad.out, /orders/i);
  fs.appendFileSync(path.join(r, 'migrations', '001_a.sql'), 'ALTER TABLE orders ENABLE ROW LEVEL SECURITY;\n');
  assert.strictEqual(run(r, home).code, 0);
});

test('duplicate migration numbers -> fail', () => {
  const { r, home } = newRepo(BASE);
  fs.mkdirSync(path.join(r, 'migrations'));
  fs.writeFileSync(path.join(r, 'migrations', '017_a.sql'), '--');
  fs.writeFileSync(path.join(r, 'migrations', '017_b.sql'), '--');
  const bad = run(r, home);
  assert.notStrictEqual(bad.code, 0);
  assert.match(bad.out, /017/);
});

test('M4 tool-default vector: ~/.pgpass entry with a prod host -> fail; remove -> pass', () => {
  const { r, home } = newRepo(BASE);
  fs.writeFileSync(path.join(home, '.pgpass'), `${PROD}:5432:main:user:pw\n`);
  const bad = run(r, home);
  assert.notStrictEqual(bad.code, 0);
  assert.match(bad.out, /\.pgpass/);
  fs.writeFileSync(path.join(home, '.pgpass'), 'db.devref.supabase.co:5432:dev:user:pw\n');
  assert.strictEqual(run(r, home).code, 0);
});

test('M4 tool-default vector: MCP config carrying a prod project ref -> fail; revert -> pass', () => {
  const { r, home } = newRepo(BASE);
  fs.writeFileSync(path.join(r, '.mcp.json'),
    JSON.stringify({ mcpServers: { supabase: { url: 'https://mcp.supabase.com/prodref1234' } } }));
  const bad = run(r, home);
  assert.notStrictEqual(bad.code, 0);
  assert.match(bad.out, /\.mcp\.json/);
  fs.writeFileSync(path.join(r, '.mcp.json'),
    JSON.stringify({ mcpServers: { supabase: { url: 'https://mcp.supabase.com/devref' } } }));
  assert.strictEqual(run(r, home).code, 0);
});

// Coverage reporting (2026-07-27): a bare "checked N invariants, all hold" cannot be
// told apart from a run where half the groups had no inputs to look at. On the product
// repo that read as a full pass while env/mcp/vercel were never opened — the gitignored
// groups are absent from every git worktree, and this studio works out of worktrees.
// The count is not the coverage; the output must name what it did not check.
function notApplicable(out) {
  const m = out.match(/not applicable \(no inputs here\): ([^—\n]*)/);
  return m ? m[1].trim().split(/,\s*/) : [];
}

// A configured repo whose only inputs are the migrations dir and ~/.pgpass.
function partialRepo() {
  const { r, home } = newRepo(BASE);
  fs.mkdirSync(path.join(r, 'migrations'));
  fs.writeFileSync(path.join(r, 'migrations', '001_a.sql'),
    'CREATE TABLE users (id int);\nALTER TABLE users ENABLE ROW LEVEL SECURITY;\n');
  fs.writeFileSync(path.join(home, '.pgpass'), 'db.devref.supabase.co:5432:dev:user:pw\n');
  return { r, home };
}

test('groups with no inputs are named, not silently folded into a green count', () => {
  const { r, home } = partialRepo();
  const res = run(r, home);
  assert.strictEqual(res.code, 0, res.out);
  assert.match(res.out, /checked \d+ invariants?, all hold/);
  assert.deepStrictEqual(notApplicable(res.out).sort(), ['env', 'mcp', 'vercel']);
});

test('a failing board also reports what it did not check', () => {
  const { r, home } = partialRepo();
  fs.writeFileSync(path.join(r, 'migrations', '002_b.sql'), 'CREATE TABLE orders (id int);\n');
  const bad = run(r, home);
  assert.notStrictEqual(bad.code, 0);
  assert.deepStrictEqual(notApplicable(bad.out).sort(), ['env', 'mcp', 'vercel']);
});

test('every group applicable -> no not-applicable clause at all', () => {
  const { r, home } = partialRepo();
  fs.writeFileSync(path.join(r, '.env'), 'DATABASE_URL=postgres://db.devref.supabase.co/dev\n');
  fs.writeFileSync(path.join(r, '.mcp.json'), JSON.stringify({ mcpServers: {} }));
  fs.mkdirSync(path.join(r, '.vercel'));
  fs.writeFileSync(path.join(r, '.vercel', 'project.json'), JSON.stringify({ projectId: 'prj_dev' }));
  const res = run(r, home);
  assert.strictEqual(res.code, 0, res.out);
  assert.doesNotMatch(res.out, /not applicable/);
});

// The worktree trap that produced the whole finding: .env*, .mcp.json and .vercel/ are
// gitignored, so they exist only in the main checkout and never in a linked worktree.
test('running in a git worktree says where the missing infra files actually live', () => {
  const { r, home } = partialRepo();
  fs.writeFileSync(path.join(r, '.git'), 'gitdir: /elsewhere/.git/worktrees/wt\n');
  const res = run(r, home);
  assert.strictEqual(res.code, 0, res.out);
  assert.match(res.out, /worktree/i);
  assert.match(res.out, /main checkout/i);
});

test('a real (non-worktree) checkout gets no worktree clause', () => {
  const { r, home } = partialRepo();
  fs.mkdirSync(path.join(r, '.git'));
  const res = run(r, home);
  assert.strictEqual(res.code, 0, res.out);
  assert.doesNotMatch(res.out, /worktree/i);
});

// M4 tool-default vector, second filename: Vercel writes .vercel/repo.json (not
// project.json) when the directory is linked through a git remote. The product repo
// had exactly that — the prod project link sat unscanned for the group's whole life.
test('M4: .vercel/repo.json carrying a prod project id -> fail; scrub -> pass', () => {
  const { r, home } = newRepo(BASE);
  fs.mkdirSync(path.join(r, '.vercel'));
  const p = path.join(r, '.vercel', 'repo.json');
  fs.writeFileSync(p, JSON.stringify({ projects: [{ id: 'prodref1234', name: 'app' }] }));
  const bad = run(r, home);
  assert.notStrictEqual(bad.code, 0);
  assert.match(bad.out, /repo\.json/);
  fs.writeFileSync(p, JSON.stringify({ projects: [{ id: 'devref', name: 'app' }] }));
  assert.strictEqual(run(r, home).code, 0);
});

// The lockdown form: RLS enabled dynamically inside a DO
// block, FOREACH over an array of table names. Static scan read it as absent —
// 4 false positives on the first product run, all live-disproven 2026-07-20.
test('RLS: lockdown form (DO block, FOREACH over ARRAY, dynamic ENABLE) counts as enabled', () => {
  const { r, home } = newRepo(BASE);
  fs.mkdirSync(path.join(r, 'migrations'));
  fs.writeFileSync(path.join(r, 'migrations', '001_a.sql'),
    'CREATE TABLE touchpoints (id int);\nCREATE TABLE candidate_timeline (id int);\n');
  fs.writeFileSync(path.join(r, 'migrations', '002_lock.sql'), `
DO $$
DECLARE
  t text;
  pii_tables text[] := ARRAY['touchpoints', 'candidate_timeline'];
BEGIN
  FOREACH t IN ARRAY pii_tables LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
  END LOOP;
END $$;
`);
  const res = run(r, home);
  assert.strictEqual(res.code, 0, res.out);
});

test('RLS: a name in an ARRAY that never reaches a dynamic ENABLE is still a failure', () => {
  const { r, home } = newRepo(BASE);
  fs.mkdirSync(path.join(r, 'migrations'));
  fs.writeFileSync(path.join(r, 'migrations', '001_a.sql'), `
CREATE TABLE orders (id int);
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['orders'] LOOP
    EXECUTE format('ANALYZE public.%I;', t);
  END LOOP;
END $$;
`);
  const bad = run(r, home);
  assert.notStrictEqual(bad.code, 0);
  assert.match(bad.out, /orders/i);
});

test('RLS: an ARRAY in a different block than the dynamic ENABLE does not cover', () => {
  const { r, home } = newRepo(BASE);
  fs.mkdirSync(path.join(r, 'migrations'));
  fs.writeFileSync(path.join(r, 'migrations', '001_a.sql'), `
CREATE TABLE orders (id int);
CREATE TABLE users (id int);
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['users'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
  END LOOP;
END $$;
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['orders'] LOOP
    EXECUTE format('ANALYZE public.%I;', t);
  END LOOP;
END $$;
`);
  const bad = run(r, home);
  assert.notStrictEqual(bad.code, 0);
  assert.match(bad.out, /orders/i);
  assert.doesNotMatch(bad.out, /users/i);
});
