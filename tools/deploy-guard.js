#!/usr/bin/env node
// Deploy-guard reflex: block `git push` to a branch named production unless a one-shot
// ack exists. Reads PreToolUse JSON on stdin; exit 2 blocks with stderr message.
// Port of deploy-guard.sh — fails CLOSED: if JSON won't parse, scan the raw payload
// so the dangerous pattern is still caught instead of silently allowed through.
'use strict';
const fs = require('fs');
const path = require('path');
const { readStdin, resolveVault } = require('./platform.js');

async function main() {
  const VAULT = resolveVault(process.argv[2]) || path.join(process.env.HOME || '', 'Documents', 'studio-vault');
  const input = await readStdin();

  let cmd = '';
  try { cmd = JSON.parse(input)?.tool_input?.command || ''; } catch { /* fail closed below */ }
  if (!cmd) cmd = input; // fail-closed: scan raw payload

  // Mirror the shell glob *git push*production* : both substrings present.
  if (/git push/.test(cmd) && /production/.test(cmd)) {
    const ack = path.join(VAULT, '_claude', '.deploy-ack');
    if (fs.existsSync(ack)) { fs.rmSync(ack, { force: true }); process.exit(0); }
    process.stderr.write(
      'BLOCKED — push to a production branch is a per-event Director sign-off (2026-06-19). ' +
      'On explicit sign-off this session, write the ack: touch _claude/.deploy-ack — then retry. ' +
      'The guard never writes it.\n');
    process.exit(2);
  }
  process.exit(0);
}

main();
