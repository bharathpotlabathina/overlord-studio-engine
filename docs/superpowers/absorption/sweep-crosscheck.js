#!/usr/bin/env node
// One-shot cross-check for the 2026-07-19 reality sweep (Task 0.2a Law-4 mutation check).
// NOT a registered standing mechanism — the sweep runs once as a pre-migration audit.
// Re-derives every automated-wire source-key from the machine and asserts each appears
// in the sweep report's inventory. Deleting a wire row from the report turns this red.
// ponytail: HQ-machine paths by design — this audits THIS machine, it never ships to a vet.
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');

const REPORT = process.argv[2] || path.join(__dirname, '2026-07-19-reality-sweep.md');
const VAULT = process.env.VAULT || path.join(os.homedir(), 'Documents', 'overlord-vault');
const ENGINE = path.join(__dirname, '..', '..', '..');

function fail(msg) { console.log(`SWEEP CROSS-CHECK FAILED: ${msg}`); process.exit(1); }

const keys = [];

// 1. ~/.claude/settings.json lifecycle hooks + statusLine
const settingsPath = path.join(os.homedir(), '.claude', 'settings.json');
if (fs.existsSync(settingsPath)) {
  const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
  for (const [event, matchers] of Object.entries(settings.hooks || {})) {
    for (const m of matchers) {
      for (const h of m.hooks || []) {
        const cmd = h.command || '';
        const script = (cmd.match(/([\w.-]+\.(?:sh|js|py))/) || [])[1];
        keys.push(`settings:${event}:${script || 'inline'}`);
      }
    }
  }
  if (settings.statusLine) keys.push('settings:statusLine');
}

// 2. vault shared .githooks (the live git gates)
const githooksDir = path.join(VAULT, '.githooks');
if (fs.existsSync(githooksDir)) {
  for (const f of fs.readdirSync(githooksDir)) keys.push(`githooks:${f}`);
}

// 3. engine hooks/hooks.json declared (inert) wires
const engineHooks = path.join(ENGINE, 'hooks', 'hooks.json');
if (fs.existsSync(engineHooks)) {
  const decl = JSON.parse(fs.readFileSync(engineHooks, 'utf8'));
  for (const [event, matchers] of Object.entries(decl.hooks || {})) {
    for (const m of matchers) {
      for (const h of m.hooks || []) {
        const script = (h.args || []).map((a) => path.basename(a)).find((a) => a.endsWith('.js'));
        keys.push(`enginehooks:${event}:${script || 'inline'}`);
      }
    }
  }
}

// 4. engine literal .git/hooks real (non-sample) hooks
const engineGitHooks = path.join(ENGINE, '.git', 'hooks');
if (fs.existsSync(engineGitHooks)) {
  for (const f of fs.readdirSync(engineGitHooks)) {
    if (!f.endsWith('.sample')) keys.push(`enginegit:${f}`);
  }
}

// 5. abandoned studio-vault leftovers
const svHooks = path.join(os.homedir(), 'Documents', 'studio-vault', '.githooks');
if (fs.existsSync(svHooks)) {
  for (const f of fs.readdirSync(svHooks)) keys.push(`studiovault:${f}`);
}

if (keys.length === 0) fail('derived zero wires from the machine — the derivation itself is broken (silence != success)');

const report = fs.readFileSync(REPORT, 'utf8');
const missing = keys.filter((k) => !report.includes(k));
if (missing.length) {
  fail(`${missing.length} machine wire(s) absent from the inventory:\n  ` + missing.join('\n  '));
}
console.log(`cross-checked ${keys.length} machine wires, all present in inventory`);
