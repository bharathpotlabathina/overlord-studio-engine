#!/usr/bin/env node
// SessionStart consolidation (Task 2.3) — one wire absorbing the old studio's three
// UserPromptSubmit scripts (session-init, env-check-ish staleness, plugin nudges):
// git pull + Node self-heal + sot/ read-only assertion + HANDOFF-staleness nudge +
// unintegrated-retro nudge + timestamped heartbeat (a dead hook is caught by its
// missing/stale beacon, not by silence). Runs once per calendar day; heartbeat
// writes EVERY run. Pure Node — the legacy bash self-heal call is gone (its posix
// exception dies with this rewrite). The printed Sunday memory reminder is gone
// too: consolidate-memory is wired to a real scheduled trigger now (Task 2.1).
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { tmpFlag, walk, isWritable, dateStamp, localHM, resolveVault } = require('./platform.js');

const HANDOFF_STALE_DAYS = 3;

function heartbeat(vault) {
  try {
    const dir = path.join(vault, '_claude', '.heartbeats');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'session-init'), new Date().toISOString() + '\n');
  } catch { /* heartbeat must never block a session */ }
}

function main() {
  const VAULT = resolveVault(process.argv[2]) || path.join(process.env.HOME || '', 'Documents', 'studio-vault');
  if (!fs.existsSync(VAULT)) { process.stderr.write(`vault path not found: ${VAULT}\n`); process.exit(1); }

  heartbeat(VAULT);

  // Doctor gauge — EVERY session open, before the once-a-day gate: health is a
  // gauge, not a nudge, and a session that opens blind to a red is how the
  // target-tier battery's flow B failed (2026-07-19: a diligent cold operator
  // committed on an unhealthy machine because nothing told it to check).
  // Loud on red, loud on crash — the one forbidden outcome is silence.
  // Re-entrancy: when the doctor itself is running this flow as a check
  // (STUDIO_DOCTOR set), skip the gauge — doctor→check→doctor is a fork bomb.
  if (!process.env.STUDIO_DOCTOR) try {
    const { runDoctor } = require('./doctor.js');
    const { ok, lines } = runDoctor(path.resolve(__dirname, '..'));
    if (ok) {
      const n = (lines.join('\n').match(/checked (\d+)/) || [])[1] || '?';
      console.log(`🩺 doctor: ${n} mechanisms green`);
    } else {
      console.log('🩺 DOCTOR RED — the machine is NOT healthy:');
      lines.forEach((l) => console.log('   ' + l));
      console.log('   Do not proceed with studio work until this is resolved or the Director rules.');
    }
  } catch (e) {
    console.log('🩺 DOCTOR CRASHED — treat as RED: ' + (e.message || e).toString().slice(0, 120));
  }

  const flag = tmpFlag(`studio-session-init-${dateStamp()}`);
  if (fs.existsSync(flag)) return;

  // Pull latest — only mark the day done once it succeeds, so a failed pull
  // (offline, auth, conflict) retries next session instead of false success.
  try {
    execFileSync('git', ['pull', '--quiet'], { cwd: VAULT, stdio: 'ignore' });
    fs.writeFileSync(flag, '');
  } catch {
    process.stderr.write('⚠️  git pull failed — vault may be stale (will retry next session)\n');
  }

  // Self-heal (idempotent, pure Node): scaffold missing vault dirs via studio-setup.
  try {
    const setup = require('./studio-setup.js');
    if (typeof setup.scaffold === 'function') setup.scaffold(VAULT);
  } catch { /* a broken self-heal must not block the session; doctor catches drift */ }

  // Assert sot/ docs are read-only (was: find -path "*/sot/*.md" -perm -0200).
  const projects = path.join(VAULT, 'Projects');
  const writableSot = walk(projects, (p) =>
    p.includes(`${path.sep}sot${path.sep}`) && p.endsWith('.md') && isWritable(p));
  if (writableSot.length) {
    console.log('⚠️  Source-of-truth drift: writable sot/ files detected — run chmod 444 (Windows: attrib +R):');
    writableSot.forEach((p) => console.log(p));
  }

  // HANDOFF staleness nudge (absorbed from handoff-age.sh).
  const handoff = path.join(VAULT, '_claude', 'HANDOFF.md');
  if (fs.existsSync(handoff)) {
    const ageDays = (Date.now() - fs.statSync(handoff).mtimeMs) / 86400000;
    if (ageDays > HANDOFF_STALE_DAYS) {
      console.log(`⚠️  HANDOFF.md is ${Math.floor(ageDays)} days old — the restore card may be stale; update it before relying on it.`);
    }
  }

  // Unintegrated-retro nudge (absorbed from retro-count.sh).
  const retroLog = path.join(VAULT, '_claude', 'retros', 'retro-log.md');
  if (fs.existsSync(retroLog)) {
    const open = fs.readFileSync(retroLog, 'utf8').split('\n').filter((l) => /^- Status: unintegrated/.test(l)).length;
    if (open > 0) console.log(`📋 ${open} unintegrated retro entr${open === 1 ? 'y' : 'ies'} — /retro-integrate when convenient.`);
  }

  console.log(`Vault synced — ${localHM()}`);
}

main();
