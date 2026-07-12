#!/usr/bin/env node
// First-run wiring the plugin can't do declaratively: scaffold the vault, link
// memory into ~/.claude (junction on Windows, symlink elsewhere), and point git
// hooks at the plugin. Cross-platform port of the studio-setup skill's bash blocks.
// Subcommands: scaffold <vault> | link-memory <vault> | wire-hooks <vault> | all <vault>
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { linkDir } = require('./platform.js');

const PLUGIN = process.env.CLAUDE_PLUGIN_ROOT || path.resolve(__dirname, '..');
const EMPTY_MAP = '{"_schema":{"version":"3.0","atlas_version":"3.1.0"},"meta":{"product":"studio","generated":"","atlas_version":"3.1.0","author":"Atlas"},"capabilities":[],"relationships":[],"flows":[],"pillars":[]}\n';

function ensureFile(p, content) { if (!fs.existsSync(p)) fs.writeFileSync(p, content); }
function isGitRepo(dir) {
  try { execFileSync('git', ['-C', dir, 'rev-parse', '--git-dir'], { stdio: 'ignore' }); return true; }
  catch { return false; }
}

function scaffold(V) {
  for (const d of ['_claude/memory', '_claude/atlas-staging', '_claude/flavours', 'roles', 'Projects']) {
    fs.mkdirSync(path.join(V, d), { recursive: true });
  }
  ensureFile(path.join(V, '_claude/memory/MEMORY.md'), '# Memory Index\n');
  ensureFile(path.join(V, '_claude/memory/active_context.md'), '**Active project:** (none yet)\n');
  ensureFile(path.join(V, '_claude/studio-atlas-map.json'), EMPTY_MAP);
  for (const f of ['backlog.md', 'session-log.md', 'HANDOFF.md', 'studio-brief.md']) {
    ensureFile(path.join(V, '_claude', f), `# ${f.replace(/\.md$/, '')}\n`);
  }
  ensureFile(path.join(V, 'CLAUDE.md'), '@_claude/memory/active_context.md\n');
  ensureFile(path.join(V, '_claude/.studio-config'), 'personas=on\n');
  ensureFile(path.join(V, '_claude/repos.local'),
    `# This machine's git repos — one absolute path per line.\n${V}\n`);
  // Flavour scaffold: copy the _neutral fallback from the plugin, seed pointer to none.
  const neutralDst = path.join(V, '_claude/flavours/_neutral');
  if (!fs.existsSync(neutralDst)) fs.cpSync(path.join(PLUGIN, 'flavours/_neutral'), neutralDst, { recursive: true });
  ensureFile(path.join(V, '_claude/flavours/active'), 'none\n');
  if (!isGitRepo(V)) { try { execFileSync('git', ['-C', V, 'init'], { stdio: 'ignore' }); } catch { /* ignore */ } }
  console.log(`scaffolded vault at ${V}`);
}

// Claude Code keeps per-project memory at ~/.claude/projects/<encoded>/memory.
// Encoding: path separators and drive-colon -> '-'. (Windows encoding is a
// real-device sign-off item; POSIX matches Claude Code today.)
function encodePath(dir) { return dir.replace(/[/\\:]/g, '-'); }
function linkMemory(V) {
  const vaultMemory = path.join(V, '_claude', 'memory');
  fs.mkdirSync(vaultMemory, { recursive: true });
  for (const target of [V, path.dirname(V)]) {
    const link = path.join(os.homedir(), '.claude', 'projects', encodePath(target), 'memory');
    try {
      const r = linkDir(vaultMemory, link);
      if (r.status === 'exists') console.log(`symlink already present: ${link} -> ${r.to}`);
      else if (r.status === 'backed-up') console.log(`WARNING: ${link} was a real dir — backed up to ${r.backup}`);
      else console.log(`symlink created: ${link} -> ${r.to}`);
    } catch (e) { console.log(`link-memory skipped for ${link}: ${e.message}`); }
  }
}

function wireHooks(V) {
  const hooksDir = path.join(PLUGIN, 'tools');
  const wire = (repo) => {
    if (!isGitRepo(repo)) { console.log(`SKIP: ${repo} — not a git repo`); return; }
    let current = '';
    try { current = execFileSync('git', ['-C', repo, 'config', 'core.hooksPath'], { encoding: 'utf8' }).trim(); } catch { /* unset */ }
    if (current && current !== hooksDir) { console.log(`SKIP: ${repo} — core.hooksPath already '${current}'`); return; }
    execFileSync('git', ['-C', repo, 'config', 'core.hooksPath', hooksDir]);
    console.log(`OK: ${repo} -> ${hooksDir}`);
  };
  wire(V);
  const reposFile = path.join(V, '_claude', 'repos.local');
  if (fs.existsSync(reposFile)) {
    for (let line of fs.readFileSync(reposFile, 'utf8').split('\n')) {
      const p = line.replace(/#.*$/, '').trim();
      if (!p || p === V) continue;
      wire(p);
    }
  }
}

function main() {
  const [cmd, vault] = [process.argv[2], process.argv[3]];
  if (!cmd || !vault) {
    console.error('usage: studio-setup.js <scaffold|link-memory|wire-hooks|all> <vault_path>');
    process.exit(2);
  }
  const V = path.resolve(vault);
  if (cmd === 'scaffold') scaffold(V);
  else if (cmd === 'link-memory') linkMemory(V);
  else if (cmd === 'wire-hooks') wireHooks(V);
  else if (cmd === 'all') { scaffold(V); linkMemory(V); wireHooks(V); }
  else { console.error(`unknown subcommand: ${cmd}`); process.exit(2); }
}

if (require.main === module) main();
module.exports = { scaffold, linkMemory, wireHooks };
