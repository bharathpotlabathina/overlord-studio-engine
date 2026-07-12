#!/usr/bin/env node
// Runs once per calendar day on first prompt. Replaces the manual /login ritual:
// git pull + setup self-heal + source-of-truth drift check. Port of studio-session-init.sh.
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { tmpFlag, walk, isWritable, dateStamp, localHM, isoWeek, isWin } = require('./platform.js');

function main() {
  const VAULT = process.argv[2] || path.join(process.env.HOME || '', 'Documents', 'studio-vault');

  const flag = tmpFlag(`studio-session-init-${dateStamp()}`);
  if (fs.existsSync(flag)) return;

  if (!fs.existsSync(VAULT)) { process.stderr.write(`vault path not found: ${VAULT}\n`); process.exit(1); }

  // Pull latest — only mark the day done once it succeeds, so a failed pull
  // (offline, auth, conflict) retries next session instead of false success.
  try {
    execFileSync('git', ['pull', '--quiet'], { cwd: VAULT, stdio: 'ignore' });
    fs.writeFileSync(flag, '');
  } catch {
    process.stderr.write('⚠️  git pull failed — vault may be stale (will retry next session)\n');
  }

  // Self-heal (idempotent) — only if this vault carries a setup script. The vault's
  // setup is a shell script (vault-side concern); on Windows the plugin's own
  // first-run wiring is the /studio-setup skill, not this legacy shell path.
  const vaultSetup = path.join(VAULT, 'setup', 'studio-setup.sh');
  if (fs.existsSync(vaultSetup) && !isWin) {
    try { process.stdout.write(execFileSync('bash', [vaultSetup], { cwd: VAULT, encoding: 'utf8' })); }
    catch (e) { process.stdout.write((e.stdout || '').toString()); }
  }

  // Assert sot/ docs are read-only (was: find -path "*/sot/*.md" -perm -0200).
  const projects = path.join(VAULT, 'Projects');
  const writableSot = walk(projects, (p) =>
    p.includes(`${path.sep}sot${path.sep}`) && p.endsWith('.md') && isWritable(p));
  if (writableSot.length) {
    console.log('⚠️  Source-of-truth drift: writable sot/ files detected — run chmod 444 (Windows: attrib +R):');
    writableSot.forEach((p) => console.log(p));
  }

  console.log(`Vault synced — ${localHM()}`);

  // Weekly memory consolidation reminder (Sundays).
  const weekFlag = tmpFlag(`studio-memory-consolidate-${new Date().getFullYear()}-${isoWeek()}`);
  if (!fs.existsSync(weekFlag) && new Date().getDay() === 0) {
    fs.writeFileSync(weekFlag, '');
    console.log('📋 Weekly: consider consolidating MEMORY.md to clear drift.');
  }
}

main();
