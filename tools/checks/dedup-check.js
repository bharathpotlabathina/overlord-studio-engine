#!/usr/bin/env node
// Task 5.1 (M6) — verbatim-duplication check between the engine's generic core
// (methodology/ + personas/) and the vault's private overlay docs. The overlay is
// reference-only: it may POINT at engine facts, never restate them. This catches
// VERBATIM duplication only; paraphrase drift is a registered human-judgment check
// (itemized blindness — no grep can know two prose passages state the same fact).
// Cold-tolerant: no vault on this machine -> explicit cold line, exit 0.
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');

const ENGINE = path.join(__dirname, '..', '..');
const VAULT = process.env.VAULT || path.join(os.homedir(), 'Documents', 'overlord-vault');
const OVERLAY = ['overlord-codex/overlord-codex.md', '_claude/studio-brief.md', 'CLAUDE.md'];
const MIN_LEN = 100; // long prose lines only — headings/boilerplate stay noise-free

function lines(file) {
  return fs.readFileSync(file, 'utf8').split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length >= MIN_LEN && !l.startsWith('|') && !l.startsWith('```'));
}

function engineCorpus() {
  const out = new Map(); // line -> file
  const dirs = [path.join(ENGINE, 'methodology'), path.join(ENGINE, 'personas')];
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, e.name);
      if (e.isDirectory()) walk(full);
      else if (e.name.endsWith('.md')) for (const l of lines(full)) out.set(l, path.relative(ENGINE, full));
    }
  };
  dirs.forEach(walk);
  return out;
}

if (!fs.existsSync(VAULT)) {
  console.log('dedup-check: no vault on this machine — 0 overlay files checked (cold install).');
  process.exit(0);
}
const corpus = engineCorpus();
const dupes = [];
let checked = 0;
for (const rel of OVERLAY) {
  const p = path.join(VAULT, rel);
  if (!fs.existsSync(p)) continue;
  checked += 1;
  for (const l of lines(p)) {
    if (corpus.has(l)) dupes.push(`${rel} ↔ ${corpus.get(l)}: "${l.slice(0, 70)}..."`);
  }
}
if (dupes.length) {
  console.log(`DEDUP VIOLATION — ${dupes.length} verbatim line(s) live in BOTH the engine core and the vault overlay (one home per fact):`);
  dupes.forEach((d) => console.log('  ' + d));
  process.exit(1);
}
console.log(`dedup-check: ${checked} overlay file(s) against ${corpus.size} engine core lines — no verbatim duplication. (Paraphrase drift = human-judgment check, by design.)`);
