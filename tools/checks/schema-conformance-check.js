#!/usr/bin/env node
// Task 2.6 — state-contract conformance. Consumer docs declare the fields they
// consume via `contract-field: <dotted-name>` lines; every declared field must
// exist in schemas/state-contract.json. A divergent name fails (Law 4).
'use strict';
const fs = require('fs');
const path = require('path');

const schema = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'schemas', 'state-contract.json'), 'utf8'));
const known = new Set(Object.keys(schema.fields));

const files = process.argv.slice(2);
if (files.length === 0) {
  console.log(`schema-conformance: no consumer docs passed — schema v${schema.version} loads, ${known.size} fields defined. (Pass consumer .md files to verify their contract-field declarations.)`);
  process.exit(0);
}
let declared = 0;
const bad = [];
for (const f of files) {
  const text = fs.readFileSync(f, 'utf8');
  for (const m of text.matchAll(/^contract-field:\s*([\w.:-]+)/gm)) {
    declared += 1;
    if (!known.has(m[1])) bad.push(`${path.basename(f)}: "${m[1]}" is not a schema field (v${schema.version})`);
  }
}
if (bad.length) {
  console.log('SCHEMA CONFORMANCE FAILED:');
  bad.forEach((b) => console.log('  ' + b));
  process.exit(1);
}
console.log(`schema-conformance: checked ${declared} declared field${declared === 1 ? '' : 's'} across ${files.length} doc(s), all conform to v${schema.version}`);
