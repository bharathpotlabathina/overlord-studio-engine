#!/usr/bin/env node
// Task 2.7 — postmortem format lint + open-status flag, run at session close (and
// by the doctor). Scans the vault's _claude/postmortems/ dir: every file must carry
// the five required lines; a Status: open entry is flagged loudly (a corrective
// action not yet proven is a standing debt, not a filed-and-forgotten paragraph).
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');

const REQUIRED = [/^What:/m, /^Why:/m, /^Fix:/m, /^Corrective action:/m, /^Status:\s*(filed|open)/m];
const VAULT = process.env.VAULT || path.join(os.homedir(), 'Documents', 'overlord-vault');
const dir = process.argv[2] || path.join(VAULT, '_claude', 'postmortems');

if (!fs.existsSync(dir)) {
  console.log('postmortems: no directory yet — 0 checked (cold).');
  process.exit(0);
}
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.md'));
const problems = [];
let open = 0;
for (const f of files) {
  const text = fs.readFileSync(path.join(dir, f), 'utf8');
  const missing = REQUIRED.filter((re) => !re.test(text));
  if (missing.length) problems.push(`${f}: missing ${missing.length} required line(s) — format is What/Why/Fix/Corrective action/Status`);
  if (/^Status:\s*open/m.test(text)) { open += 1; problems.push(`${f}: Status: open — corrective action not yet proven`); }
}
if (problems.length) {
  console.log(`POSTMORTEM FLAG — ${problems.length} issue(s) across ${files.length} filed:`);
  problems.forEach((p) => console.log('  ' + p));
  process.exit(1);
}
console.log(`postmortems: checked ${files.length}, all well-formed and closed (0 open)`);
