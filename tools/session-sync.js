#!/usr/bin/env node
// Stop-hook auto-sync: commit the vault and push — ONLY if the vault opts in.
// Runs AFTER session-log-backstop (separate hook entry, ordered before this one).
//
// OPT-IN, DEFAULT OFF (2026-07-15). This fires on every Stop, inside YOUR repo. An
// unrequested `git add .` + commit + push on someone else's repository is not a
// feature, it is a surprise: it can publish a half-finished thought, a secret no
// scanner has caught yet, or a file you never meant to track — to a remote you
// cannot un-publish from. So it does nothing until the vault says otherwise.
//
// Enable in <vault>/_claude/.studio-config:
//   autosync=off      default — do nothing; commit by hand
//   autosync=commit   stage + commit locally, never push (recoverable)
//   autosync=on       stage + commit + push (only for a vault you own)
//
// Never blocks: every failure is surfaced, never fatal.
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

function git(cwd, args) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

// Read `key=value` from _claude/.studio-config (one per line, # comments allowed).
// Missing file, unreadable file, or missing key => null, i.e. the safe default.
// Never throws: a config problem must not break the Stop hook.
function config(vault, key) {
  try {
    const raw = fs.readFileSync(path.join(vault, '_claude/.studio-config'), 'utf8');
    for (const line of raw.split('\n')) {
      const s = line.trim();
      if (!s || s.startsWith('#')) continue;
      const i = s.indexOf('=');
      if (i < 0) continue;
      if (s.slice(0, i).trim() === key) return s.slice(i + 1).trim().toLowerCase();
    }
  } catch { /* no config, or unreadable — fall through to the default */ }
  return null;
}

function main() {
  const VAULT = process.argv[2];
  if (!VAULT) { process.stderr.write('vault_path invalid — skipping auto-sync\n'); return; }
  try { git(VAULT, ['rev-parse', '--git-dir']); }
  catch { process.stderr.write('vault_path invalid — skipping auto-sync\n'); return; }

  // The gate. Anything that is not an explicit opt-in means off — including a
  // typo. A misspelled value must fail closed, never open.
  const mode = config(VAULT, 'autosync') || 'off';
  if (mode !== 'commit' && mode !== 'on') return;

  try { git(VAULT, ['add', '.']); } catch { /* nothing to add */ }

  let staged = true;
  try { git(VAULT, ['diff', '--cached', '--quiet']); staged = false; } // exit 0 => nothing staged
  catch { staged = true; }
  if (!staged) { process.stdout.write('Nothing to commit.\n'); return; }

  try { git(VAULT, ['commit', '-m', 'Session update - auto commit']); }
  catch (e) { process.stderr.write('COMMIT FAILED — ' + (e.stderr || e.message) + '\n'); return; }

  if (mode !== 'on') { process.stdout.write('Committed locally (autosync=commit — not pushed).\n'); return; }

  try { git(VAULT, ['push']); }
  catch { process.stderr.write('PUSH FAILED — committed locally, not synced to remote\n'); }
}

main();
