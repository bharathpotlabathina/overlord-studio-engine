'use strict';
// Task 2.5 acceptance: a bare DROP COLUMN -> block fires; split into
// expand -> contract -> passes.
const { test } = require('node:test');
const assert = require('node:assert');
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const SCRIPT = path.join(__dirname, '..', 'expand-contract-check.js');

function run(dir) {
  try {
    return { code: 0, out: execFileSync('node', [SCRIPT, dir], { encoding: 'utf8' }).trim() };
  } catch (e) {
    return { code: e.status, out: (e.stdout || '').toString().trim() };
  }
}

function newDir(files) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'expcon-'));
  for (const [name, sql] of Object.entries(files)) fs.writeFileSync(path.join(d, name), sql);
  return d;
}

test('bare DROP COLUMN with no prior expand -> blocked, named', () => {
  const d = newDir({ '001_contract.sql': 'ALTER TABLE users DROP COLUMN legacy_name;\n' });
  const r = run(d);
  assert.notStrictEqual(r.code, 0);
  assert.match(r.out, /users/);
  assert.match(r.out, /no prior additive migration/);
});

test('same-file add+drop does NOT count as expand (the single-migration disease)', () => {
  const d = newDir({
    '001_both.sql': 'ALTER TABLE users ADD COLUMN full_name text;\nALTER TABLE users DROP COLUMN legacy_name;\n',
  });
  assert.notStrictEqual(run(d).code, 0);
});

test('split expand -> contract passes', () => {
  const d = newDir({
    '001_create.sql': 'CREATE TABLE users (id int, legacy_name text);\n',
    '002_expand.sql': 'ALTER TABLE users ADD COLUMN full_name text;\n',
    '003_contract.sql': 'ALTER TABLE users DROP COLUMN legacy_name;\n',
  });
  const r = run(d);
  assert.strictEqual(r.code, 0);
  assert.match(r.out, /checked 3 migration files, expand\/contract shape holds/);
});

test('DROP TABLE with a prior CREATE passes; without -> blocked', () => {
  const good = newDir({
    '001_create.sql': 'CREATE TABLE temp_import (id int);\n',
    '002_drop.sql': 'DROP TABLE temp_import;\n',
  });
  assert.strictEqual(run(good).code, 0);
  const bad = newDir({ '001_drop.sql': 'DROP TABLE mystery;\n' });
  assert.notStrictEqual(run(bad).code, 0);
});
