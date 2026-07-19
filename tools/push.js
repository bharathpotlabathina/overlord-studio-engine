#!/usr/bin/env node
// Maintainer push ritual (2026-07-19 incident closure): `git push` alone leaves the
// maintainer's own installed copy of the engine a version behind the public repo —
// the marketplace clone and plugin cache only move when explicitly updated. This
// wrapper makes the update ride the push: the one event that creates the gap also
// closes it. Usage: node tools/push.js [git push args]. The pre-push git hook
// (preflight) still gates the push itself; this adds nothing before the push.
// A failed self-update AFTER a successful push IS the stale state — loud, exit 1
// (and the doctor's install-staleness gauge stays red until it's fixed).
'use strict';
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

function updatePlan(root) {
  const { name } = JSON.parse(fs.readFileSync(path.join(root, '.claude-plugin', 'plugin.json'), 'utf8'));
  // ponytail: marketplace name assumed == plugin name; parse known_marketplaces.json if that ever diverges
  return [
    ['claude', ['plugin', 'marketplace', 'update', name]],
    ['claude', ['plugin', 'update', `${name}@${name}`]],
  ];
}

function main() {
  const root = path.resolve(__dirname, '..');
  const push = spawnSync('git', ['push', ...process.argv.slice(2)], { cwd: root, stdio: 'inherit' });
  if (push.status !== 0) process.exit(push.status || 1);

  for (const [cmd, args] of updatePlan(root)) {
    const r = spawnSync(cmd, args, { stdio: 'inherit' });
    if (r.error && r.error.code === 'ENOENT') {
      // Contributor box without the CLI (or Windows resolving `claude.cmd`): the
      // push already succeeded and there is no local install to maintain — say so.
      console.log(`self-update skipped — \`${cmd}\` not found on this box; run manually: ${cmd} ${args.join(' ')}`);
      return;
    }
    if (r.status !== 0) {
      console.log(`SELF-UPDATE FAILED after a successful push — the local install is now STALE (doctor goes red until fixed). Re-run: ${cmd} ${args.join(' ')}`);
      process.exit(1);
    }
  }
  console.log('pushed + local install brought forward (marketplace refreshed, plugin updated — restart applies it)');
}

if (require.main === module) main();
module.exports = { updatePlan };
