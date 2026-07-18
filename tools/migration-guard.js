#!/usr/bin/env node
// Task 1.1 (Stage 3 Phase 1) — migration-number reservation ledger + duplicate gate.
// Makes the four-branches-claiming-017 collision impossible by construction:
//   claim  — reserve the next number BEFORE work, via atomic directory create
//            (fs.mkdirSync is atomic on every platform Node supports; EEXIST = lost
//            the race, try the next number). Never flock: POSIX-only, no Node
//            equivalent, does not exist on the Windows vet target (B1).
//   check  — deterministic duplicate-leading-number scan, wired into pre-commit.
// Idempotent: re-claiming with the same --name returns the existing reservation.
// ponytail: one global number sequence per migrations dir — per-lane sequences only
// if same-repo parallel lanes ever become real (RUN-MANIFEST unpark trigger).
'use strict';
const fs = require('fs');
const path = require('path');

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--dir') args.dir = argv[++i];
    else if (argv[i] === '--name') args.name = argv[++i];
    else args._.push(argv[i]);
  }
  return args;
}

function migrationNumber(basename) {
  const m = basename.match(/^(\d+)/);
  return m ? m[1] : null;
}

function listMigrationFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isFile() && migrationNumber(e.name) !== null)
    .map((e) => e.name);
}

function listReserved(dir) {
  const resDir = path.join(dir, 'RESERVED');
  if (!fs.existsSync(resDir)) return [];
  return fs.readdirSync(resDir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && /^\d+$/.test(e.name.split('_')[0]))
    .map((e) => e.name);
}

function pad(n, width) {
  return String(n).padStart(width, '0');
}

function claim(dir, name) {
  const resDir = path.join(dir, 'RESERVED');
  fs.mkdirSync(resDir, { recursive: true });

  // Idempotent re-claim: a reservation dir carrying this name already exists.
  if (name) {
    for (const r of fs.readdirSync(resDir)) {
      const marker = path.join(resDir, r, 'name');
      if (fs.existsSync(marker) && fs.readFileSync(marker, 'utf8').trim() === name) {
        return r.split('_')[0];
      }
    }
  }

  const used = [
    ...listMigrationFiles(dir).map((f) => parseInt(migrationNumber(f), 10)),
    ...listReserved(dir).map((r) => parseInt(r, 10)),
  ];
  const width = Math.max(3, ...listMigrationFiles(dir).map((f) => migrationNumber(f).length));
  let next = used.length ? Math.max(...used) + 1 : 1;

  // Atomic claim loop: mkdirSync without recursive throws EEXIST if another
  // claimer got there first — lost the race, advance and retry.
  for (;;) {
    const num = pad(next, width);
    try {
      fs.mkdirSync(path.join(resDir, num));
      if (name) fs.writeFileSync(path.join(resDir, num, 'name'), name + '\n');
      return num;
    } catch (e) {
      if (e.code !== 'EEXIST') throw e;
      next += 1;
    }
  }
}

function check(dir) {
  const files = listMigrationFiles(dir);
  const byNumber = new Map();
  for (const f of files) {
    const n = migrationNumber(f);
    if (!byNumber.has(n)) byNumber.set(n, []);
    byNumber.get(n).push(f);
  }
  const dupes = [...byNumber.entries()].filter(([, fs_]) => fs_.length > 1);
  if (dupes.length) {
    console.log('MIGRATION NUMBER COLLISION:');
    for (const [n, fs_] of dupes) console.log(`  ${n}: ${fs_.join(', ')}`);
    return 1;
  }
  console.log(`checked ${files.length} migration file${files.length === 1 ? '' : 's'}, no duplicate numbers`);
  return 0;
}

if (require.main === module) {
  const [cmd, ...rest] = process.argv.slice(2);
  const args = parseArgs(rest);
  const dir = path.resolve(args.dir || 'migrations');
  if (cmd === 'claim') {
    console.log(claim(dir, args.name));
  } else if (cmd === 'check') {
    process.exit(check(dir));
  } else {
    console.log('usage: migration-guard.js <claim|check> [--dir migrations] [--name migration_name]');
    process.exit(2);
  }
}

module.exports = { claim, check, migrationNumber };
