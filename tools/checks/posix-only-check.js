#!/usr/bin/env node
// B1 recurrence guard (Stage 3 Task 1.5 / Global constraints) — grep-able pre-ship
// check: no POSIX-only primitive in any tools/ mechanism. Patterns are call-shaped
// (quoted names, invocations, shebangs) so prose comments like "never flock" don't trip.
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

// Dated exceptions (fail-loud discipline: report-only is an explicit, dated,
// reasoned exception — never a silent allowlist). Each is printed on every run.
const EXCEPTIONS = [
  // (2026-07-19: studio-session-init.js's legacy bash call was the one exception;
  // it died at Task 2.3's pure-Node rewrite, same day. List kept for the next one.)
];

const PATTERNS = [
  { re: /\bflock\(|['"]flock['"]/, why: 'flock — POSIX-only, no Node equivalent, absent on the Windows vet target' },
  { re: /(execFileSync|execFile|spawnSync|spawn|execSync|exec)\(\s*['"](bash|sh|zsh)['"]/, why: 'shell interpreter spawn — not on a cold Windows box' },
  { re: /^#!\/bin\/(ba)?sh/m, why: 'shell shebang in a tools/ mechanism — must be a node script' },
];

function codeFiles(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory() && e.name !== 'test') out.push(...codeFiles(full));
    else if (e.isFile() && (e.name.endsWith('.js') || e.name === 'pre-commit' || e.name === 'pre-push')) out.push(full);
  }
  return out;
}

const files = codeFiles(ROOT);
const hits = [];
const excepted = [];
for (const f of files) {
  const rel = path.relative(ROOT, f);
  const text = fs.readFileSync(f, 'utf8');
  for (const { re, why } of PATTERNS) {
    if (!re.test(text)) continue;
    const ex = EXCEPTIONS.find((e) => e.file === rel);
    if (ex) excepted.push(`${rel}: ${ex.reason} (dated ${ex.dated})`);
    else hits.push(`${rel}: ${why}`);
  }
}
for (const e of excepted) console.log(`POSIX-ONLY EXCEPTION (dated, dies with its task): ${e}`);
if (hits.length) {
  console.log('POSIX-ONLY PRIMITIVE FOUND (B1 violation):');
  hits.forEach((h) => console.log('  ' + h));
  process.exit(1);
}
console.log(`posix-only check: scanned ${files.length} tool files, 0 violations, ${excepted.length} dated exception${excepted.length === 1 ? '' : 's'}`);
