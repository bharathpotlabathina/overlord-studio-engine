#!/usr/bin/env node
// Session-log backstop (approach C): guarantees the session log never silently dies.
// Runs at session close (Stop hook), BEFORE the git add/commit/push step.
// If the session produced real work (tracked mods OR new untracked files) AND
// _claude/session-log.md was NOT modified this session -> append ONE dated stub.
// Fail open: any git oddity must never block the commit — on doubt, do nothing.
// Port of session-log-backstop.sh.
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { dateStamp, resolveVault } = require('./platform.js');

function git(cwd, args) {
  return execFileSync('git', args, { cwd, encoding: 'utf8' });
}

function main() {
  const VAULT = resolveVault(process.argv[2]) || path.join(process.env.HOME || '', 'Documents', 'studio-vault');
  const LOG = path.join(VAULT, '_claude', 'session-log.md');
  try {
    // Whole-repo dirty check. --porcelain lists untracked (??) by default.
    const work = git(VAULT, ['status', '--porcelain']).trim();
    if (!work) return; // clean = empty session
    // Was the session log touched this session?
    const logTouched = git(VAULT, ['status', '--porcelain', '--', LOG]).trim();
    if (logTouched) return; // /logout already wrote its rich line
    if (!fs.existsSync(LOG)) return;
    const line = `${dateStamp()} · studio · none · (auto: session ended without /logout summary)`;
    // Ensure the stub lands on its own line even without a trailing newline.
    const cur = fs.readFileSync(LOG);
    const prefix = cur.length && cur[cur.length - 1] !== 0x0a ? '\n' : '';
    fs.appendFileSync(LOG, prefix + line + '\n');
  } catch { /* fail open */ }
}

main();
