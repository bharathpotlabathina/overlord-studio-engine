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

// Tier 0: loaded on EVERY session, so it holds only what makes a session correct —
// identity and pointers, never status and never history. Deliberately carries no
// @-import: see the note in scaffold().
const CLAUDE_SEED = `# Studio

Your vault. Session state lives in \`_claude/HANDOFF.md\` — read it at session open.

**Keep this file small.** It is loaded on every session, so every line here is rent
you pay forever. Identity and pointers belong here; status, history, and anything
that only grows belong in a file that is read on demand.
`;

// Tier 1: the restore card. Fixed, small, overwritten at session close — never appended to.
const HANDOFF_SEED = `# Handoff

**Active:** (nothing yet)

**Next actions:**

**Pending decisions:**

> Rewritten at session close, read at session open. Keep it a card, not a log —
> if it is growing, the history belongs in \`_claude/session-log.md\`.
`;

// Retro log template (v0.2.0 M3): the format /retro-integrate and the session-init
// nudge both read. Header only — entries are appended by the studio, never seeded.
const RETRO_LOG_SEED = `# Retro Log

Sprint/phase-close learnings. Append-only, newest at bottom. Capture is open;
analysis + integration are the Orchestrator's authority (\`/retro-integrate\`).

Entry format:

    ## YYYY-MM-DD · <sprint / capability id> · <owner>
    - Signals: findings=<n> escalations=<n> rework=<n>   (sprint counts; \`?\` if unmeasured)
    - Learning: <insight, 1-2 lines>
    - Target: memory | kernel:<role> | sot-rule | pipeline | just-noted
    - Status: unintegrated
    - Claim: <only when Target is a durable change: one falsifiable line — what should stop
      happening if this integration works. Verified at a later drain; omit for just-noted.>

\`Target\` = where this eventually lands (\`just-noted\` = recorded, implies no change).
\`Status: unintegrated\` until the Orchestrator drains it via \`/retro-integrate\`.
\`Signals\`: the sprint's fitness numbers — review findings, escalations to a higher tier,
rework/reopened items. Three counts, one line, no dashboards; they are what \`Claim\`
verdicts get checked against. \`?\` is honest.

---
`;

// Vault-level switches, read by the tools. Defaults are the safe ones.
// KILLED 2026-07-15: `personas=on`. It was the CAP-025 persona-vs-role-generic
// toggle (2026-07-06) and the flavour system superseded it nine days later —
// `flavours/active` is the live switch, read by 2 tools; `personas` was read by
// ZERO, in the engine and in the origin vault. A flag written into every vault
// that switches nothing. Preflight's config check caught it. Do not re-add: if a
// toggle is needed, the flavour system already is one.
const STUDIO_CONFIG_SEED = `# autosync — the Stop hook's git behaviour, in THIS repo, on every turn.
#   off      do nothing (default). You commit by hand.
#   commit   stage + commit locally, never push. Recoverable.
#   on       stage + commit + push. Only for a vault you own.
# Anything else — including a typo — is treated as off.
autosync=off
# profile — which Claude plan runs this studio (read by tools/profile.js).
#   pro   (default, safe) deep/top tiers collapse to Sonnet.
#   max   unlocks Opus/Fable for the deep/top tiers.
# Anything else falls back to pro.
profile=pro
`;

function ensureFile(p, content) { if (!fs.existsSync(p)) fs.writeFileSync(p, content); }
function isGitRepo(dir) {
  try { execFileSync('git', ['-C', dir, 'rev-parse', '--git-dir'], { stdio: 'ignore' }); return true; }
  catch { return false; }
}

function scaffold(V) {
  for (const d of ['_claude/memory', '_claude/atlas-staging', '_claude/flavours', '_claude/retros', 'roles', 'Projects']) {
    fs.mkdirSync(path.join(V, d), { recursive: true });
  }
  ensureFile(path.join(V, '_claude/memory/MEMORY.md'), '# Memory Index\n');
  ensureFile(path.join(V, '_claude/retros/retro-log.md'), RETRO_LOG_SEED);
  ensureFile(path.join(V, '_claude/studio-atlas-map.json'), EMPTY_MAP);
  for (const f of ['backlog.md', 'session-log.md', 'studio-brief.md']) {
    ensureFile(path.join(V, '_claude', f), `# ${f.replace(/\.md$/, '')}\n`);
  }
  // The restore card: read at session open, written at session close. Small and
  // fixed-size by design — it holds where-you-were, not what-happened.
  ensureFile(path.join(V, '_claude/HANDOFF.md'), HANDOFF_SEED);

  // NO @-import here, deliberately (2026-07-15). This file used to seed
  // `@_claude/memory/active_context.md`, which pulled an ever-growing context
  // file into EVERY session's fixed cost. In the studio that originated this
  // engine that file reached 16,537 tokens — 81% of the per-session bill — and
  // was retired: it was a derived view masquerading as a source, so every fact
  // in it was owned somewhere else and drifted. A new vault must not inherit it.
  // Load context on demand; never auto-import a file that only grows.
  ensureFile(path.join(V, 'CLAUDE.md'), CLAUDE_SEED);

  ensureFile(path.join(V, '_claude/.studio-config'), STUDIO_CONFIG_SEED);
  ensureFile(path.join(V, '_claude/repos.local'),
    `# This machine's git repos — one absolute path per line.\n${V}\n`);
  // Flavour scaffold: copy the _neutral fallback from the plugin, seed pointer to none.
  const neutralDst = path.join(V, '_claude/flavours/_neutral');
  if (!fs.existsSync(neutralDst)) fs.cpSync(path.join(PLUGIN, 'flavours/_neutral'), neutralDst, { recursive: true });
  ensureFile(path.join(V, '_claude/flavours/active'), 'none\n');
  // reality-check registers: vault-homed so users maintain them themselves (tools/reality-check.js).
  ensureFile(path.join(V, '_claude/reality-check-ignore.txt'),
    fs.readFileSync(path.join(PLUGIN, 'tools/reality-check-ignore.default.txt'), 'utf8'));
  ensureFile(path.join(V, '_claude/reality-aspirational.txt'),
    fs.readFileSync(path.join(PLUGIN, 'tools/reality-aspirational.default.txt'), 'utf8'));
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
