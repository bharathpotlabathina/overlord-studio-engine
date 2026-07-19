#!/usr/bin/env node
// studio doctor — Task 0.1 (Stage 3 Phase 0, Law 4/5).
// Reads tools/registry.json: the studio's declared load-bearing surface.
// Not in the registry with a passing check = does not exist; nothing may depend on it.
//
// A "mechanism" is one registered trigger->check pair. Reports, loudly, on every run:
//   - dead wires   (registered mechanism whose trigger file is missing)
//   - orphans      (a file under a wiring root that no mechanism claims as its trigger)
//   - failed checks (registered check script exits non-zero)
//   - "checked N, found M green" + the live mechanism count (silence != success)
// STUDIO_DOCTOR is a RESERVED env name: the doctor sets it on its check subtree
// so doctor-calling flows (session-init's gauge) no-op instead of recursing.
// Exporting it ambiently in a shell suppresses the session health gauge — don't.
// Dead-wire detection reads the filesystem directly and never trusts a check's exit
// code, so a check mutated to always-pass cannot hide a missing trigger.
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

function repoRoot() {
  if (process.env.STUDIO_ROOT) return process.env.STUDIO_ROOT;
  try {
    return execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
  } catch {
    return process.cwd();
  }
}

function listFiles(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listFiles(full));
    else out.push(full);
  }
  return out;
}

function runDoctor(root) {
  const registryPath = path.join(root, 'tools', 'registry.json');
  const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
  const mechanisms = registry.mechanisms || [];
  const wiringRoots = registry.wiringRoots || [];

  const lines = [];
  let ok = true;
  let greenCount = 0;
  const claimedTriggers = new Set(mechanisms.map((m) => path.normalize(m.trigger)));

  for (const m of mechanisms) {
    const triggerAbs = path.join(root, m.trigger);
    if (!fs.existsSync(triggerAbs)) {
      ok = false;
      lines.push(`dead wire — ${m.id}: trigger missing (${m.trigger})`);
      continue;
    }
    const checkAbs = path.join(root, m.check);
    try {
      // STUDIO_DOCTOR marks the whole check subtree: any flow that would call
      // the doctor again (e.g. session-init's health gauge) no-ops instead of
      // recursing — doctor→check→doctor is a fork bomb otherwise.
      execFileSync('node', [checkAbs], { cwd: root, encoding: 'utf8', env: { ...process.env, STUDIO_DOCTOR: '1' } });
      greenCount += 1;
    } catch (e) {
      ok = false;
      const detail = ((e.stdout || '') + (e.stderr || '')).toString().trim();
      lines.push(`failed check — ${m.id}: ${detail || 'check exited non-zero'}`);
    }
  }

  for (const wr of wiringRoots) {
    for (const abs of listFiles(path.join(root, wr))) {
      const rel = path.normalize(path.relative(root, abs));
      if (!claimedTriggers.has(rel)) {
        ok = false;
        lines.push(`orphan — ${rel}: present under a wiring root, claimed by no mechanism`);
      }
    }
  }

  lines.push(`checked ${mechanisms.length}, found ${greenCount} green`);
  lines.push(`mechanism count: ${mechanisms.length}`);
  return { ok, lines };
}

if (require.main === module) {
  const root = repoRoot();
  const { ok, lines } = runDoctor(root);
  console.log(lines.join('\n'));
  process.exit(ok ? 0 : 1);
}

module.exports = { runDoctor };
