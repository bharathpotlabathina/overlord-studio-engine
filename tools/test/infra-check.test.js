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
