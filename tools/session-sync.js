#!/usr/bin/env node
// Stop-hook auto-sync: commit the vault and push. Runs AFTER session-log-backstop
// (separate hook entry, ordered before this one). Port of the hooks.json inline
// git pipeline. Never blocks: push failure is surfaced, not fatal.
'use strict';
const path = require('path');
const { execFileSync } = require('child_process');

function git(cwd, args) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

function main() {
  const VAULT = process.argv[2];
  if (!VAULT) { process.stderr.write('vault_path invalid — skipping auto-sync\n'); return; }
  try { git(VAULT, ['rev-parse', '--git-dir']); }
  catch { process.stderr.write('vault_path invalid — skipping auto-sync\n'); return; }

  try { git(VAULT, ['add', '.']); } catch { /* nothing to add */ }

  let staged = true;
  try { git(VAULT, ['diff', '--cached', '--quiet']); staged = false; } // exit 0 => nothing staged
  catch { staged = true; }
  if (!staged) { process.stdout.write('Nothing to commit.\n'); return; }

  try { git(VAULT, ['commit', '-m', 'Session update - auto commit']); }
  catch (e) { process.stderr.write('COMMIT FAILED — ' + (e.stderr || e.message) + '\n'); return; }

  try { git(VAULT, ['push']); }
  catch { process.stderr.write('PUSH FAILED — committed locally, not synced to remote\n'); }
}

main();
