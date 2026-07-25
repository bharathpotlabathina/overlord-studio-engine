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
const os = require('os');
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

// Install-staleness gauge (2026-07-19 incident: marketplace clone refreshed but the
// installed plugin didn't follow — hooks ran a version behind the pushed engine).
// Local-only by design: two file reads, no network, safe cold/offline/unattended.
// The network half (is GitHub ahead of the clone?) is the push ritual's job
// (tools/push.js). Doctor built-in, not a registered mechanism — the Law-5 ceiling
// (frozen at 19, may only shrink) rules out a new wire; like dead-wire and orphan
// detection, this is part of what the doctor IS.
function installStaleness(root, pluginsDir) {
  const read = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
  const rel = path.relative(pluginsDir, root);
  const seg = rel.split(path.sep);
  if (rel.startsWith('..') || path.isAbsolute(rel) || seg[0] !== 'cache' || seg.length < 4) {
    return { stale: false, line: 'install-staleness: N/A (not a marketplace install)' };
  }
  const mkt = seg[1];
  try {
    const installed = read(path.join(root, '.claude-plugin', 'plugin.json'));
    const clone = read(path.join(pluginsDir, 'marketplaces', mkt, '.claude-plugin', 'plugin.json'));
    if (clone.name !== installed.name) {
      return { stale: false, line: 'install-staleness: N/A (marketplace manifest names a different plugin)' };
    }
    if (clone.version === installed.version) {
      return { stale: false, line: `install-staleness: current (v${installed.version} = marketplace v${clone.version})` };
    }
    return {
      stale: true,
      line: `STALE INSTALL — running v${installed.version}, marketplace clone has v${clone.version}: run \`claude plugin update ${installed.name}@${mkt}\` (restart applies it)`,
    };
  } catch {
    return { stale: false, line: 'install-staleness: N/A (manifests unreadable)' };
  }
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

  const pluginsDir = process.env.STUDIO_PLUGINS_DIR || path.join(os.homedir(), '.claude', 'plugins');
  const staleness = installStaleness(root, pluginsDir);
  if (staleness.stale) ok = false;
  lines.push(staleness.line);

  // Active plan profile (v0.2.0 M1) — informational only: pro and max are both
  // valid states, so this row can never turn the run red. Built-in like
  // install-staleness above, not a registered mechanism (Law-5 ceiling).
  const { resolveProfile } = require('./profile.js');
  lines.push(`profile: ${resolveProfile(root)}`);

  // reality-check row (v0.2.0 M3) — informational only, same law as profile above:
  // report-only forever, this row can never turn the run red.
  const { check: realityCheck } = require('./reality-check.js');
  lines.push(`reality-check: ${realityCheck(root).broken.length} broken`);

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
