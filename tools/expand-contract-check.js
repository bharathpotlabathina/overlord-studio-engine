#!/usr/bin/env node
// Task 2.5 — expand/contract migration shape check.
// A destructive op (DROP COLUMN / DROP TABLE / RENAME) on table T is only legal
// when an EARLIER-numbered migration touched T additively (CREATE TABLE / ADD
// COLUMN) — the expand step. Destructive-with-no-prior-expand is the single-
// migration disease this flags. Same-file additives do not count as the expand.
// ponytail: static regex over SQL, table-name granularity — cross-release set
// sequencing (expand -> partner releases -> contract) is the Release Engineer's
// composition sweep, not statically checkable here.
'use strict';
const fs = require('fs');
const path = require('path');

const DESTRUCTIVE = /ALTER TABLE (?:IF EXISTS )?"?([\w.]+)"?[^;]*?(DROP COLUMN|RENAME)|DROP TABLE (?:IF EXISTS )?"?([\w.]+)"?|ALTER TABLE (?:IF EXISTS )?"?([\w.]+)"? RENAME/gi;
const additiveFor = (t) => new RegExp(`CREATE TABLE (?:IF NOT EXISTS )?"?(?:[\\w]+\\.)?${t}"?|ALTER TABLE (?:IF EXISTS )?"?(?:[\\w]+\\.)?${t}"?[^;]*?ADD COLUMN`, 'i');

function check(dir) {
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql') && /^\d+/.test(f)).sort();
  const failures = [];
  files.forEach((f, i) => {
    const sql = fs.readFileSync(path.join(dir, f), 'utf8');
    for (const m of sql.matchAll(DESTRUCTIVE)) {
      const table = (m[1] || m[3] || m[4] || '').split('.').pop();
      if (!table) continue;
      const priorExpand = files.slice(0, i).some((pf) =>
        additiveFor(table).test(fs.readFileSync(path.join(dir, pf), 'utf8')));
      if (!priorExpand) {
        failures.push(`${f}: destructive op on "${table}" with no prior additive migration — split into expand (earlier release) then contract`);
      }
    }
  });
  if (failures.length) {
    console.log('EXPAND/CONTRACT VIOLATION:');
    failures.forEach((x) => console.log('  ' + x));
    return 1;
  }
  console.log(`checked ${files.length} migration file${files.length === 1 ? '' : 's'}, expand/contract shape holds`);
  return 0;
}

if (require.main === module) {
  const dir = path.resolve(process.argv[2] || 'migrations');
  if (!fs.existsSync(dir)) { console.log(`no migrations dir at ${dir} — nothing to check`); process.exit(0); }
  process.exit(check(dir));
}
module.exports = { check };
