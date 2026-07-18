'use strict';
// Task 1.1 (Stage 3 Phase 1) — migration-number reservation ledger + duplicate-number gate.
// Acceptance (plan Check A): two migration files sharing a number -> check MUST fail;
// revert one -> passes. Claim is atomic-create based (mkdirSync), never flock (B1).
const { test } = require('node:test');
const assert = require('node:assert');
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const SCRIPT = path.join(__dirname, '..', 'migration-guard.js');

function newRepo() {
  const r = fs.mkdtempSync(path.join(os.tmpdir(), 'migguard-'));
  fs.mkdirSync(path.join(r, 'migrations'), { recursive: true });
  return r;
}

function run(cwd, ...args) {
  try {
    const out = execFileSync('node', [SCRIPT, ...args], { cwd, encoding: 'utf8' });
    return { code: 0, out: out.trim() };
  } catch (e) {
    return { code: e.status, out: (e.stdout || '').toString().trim(), err: (e.stderr || '').toString() };
  }
}

test('claim: first claim on an empty ledger continues from existing files', () => {
  const r = newRepo();
  fs.writeFileSync(path.join(r, 'migrations', '016_seed.sql'), '--');
  const c = run(r, 'claim', '--dir', 'migrations');
  assert.strictEqual(c.code, 0);
  assert.match(c.out, /\b017\b/);
  assert.ok(fs.existsSync(path.join(r, 'migrations', 'RESERVED', '017')));
});

test('claim: sequential claims return distinct sequential numbers', () => {
  const r = newRepo();
  const a = run(r, 'claim', '--dir', 'migrations');
  const b = run(r, 'claim', '--dir', 'migrations');
  assert.strictEqual(a.code, 0);
  assert.strictEqual(b.code, 0);
  const na = parseInt(a.out.match(/(\d+)/)[1], 10);
  const nb = parseInt(b.out.match(/(\d+)/)[1], 10);
  assert.strictEqual(nb, na + 1);
});

test('claim: idempotent re-claim with same name reuses the reservation', () => {
  const r = newRepo();
  const a = run(r, 'claim', '--dir', 'migrations', '--name', 'add_users');
  const b = run(r, 'claim', '--dir', 'migrations', '--name', 'add_users');
  assert.strictEqual(a.out, b.out);
});

test('check (Check A): two files sharing 017 -> fail; remove one -> pass', () => {
  const r = newRepo();
  fs.writeFileSync(path.join(r, 'migrations', '017_add_users.sql'), '--');
  fs.writeFileSync(path.join(r, 'migrations', '017_add_orders.sql'), '--');
  const bad = run(r, 'check', '--dir', 'migrations');
  assert.notStrictEqual(bad.code, 0);
  assert.match(bad.out, /017/);
  fs.rmSync(path.join(r, 'migrations', '017_add_orders.sql'));
  const good = run(r, 'check', '--dir', 'migrations');
  assert.strictEqual(good.code, 0);
  assert.match(good.out, /checked 1 migration file/);
});

test('check: positive proof on clean state, explicit zero on empty dir (silence != success)', () => {
  const r = newRepo();
  const empty = run(r, 'check', '--dir', 'migrations');
  assert.strictEqual(empty.code, 0);
  assert.match(empty.out, /checked 0 migration files/);
  fs.writeFileSync(path.join(r, 'migrations', '001_a.sql'), '--');
  fs.writeFileSync(path.join(r, 'migrations', '002_b.sql'), '--');
  const clean = run(r, 'check', '--dir', 'migrations');
  assert.strictEqual(clean.code, 0);
  assert.match(clean.out, /checked 2 migration files, no duplicate numbers/);
});

test('check: RESERVED ledger entries are not counted as files but block a colliding new file claim', () => {
  const r = newRepo();
  fs.mkdirSync(path.join(r, 'migrations', 'RESERVED', '018'), { recursive: true });
  const c = run(r, 'claim', '--dir', 'migrations');
  assert.match(c.out, /\b019\b/);
});
