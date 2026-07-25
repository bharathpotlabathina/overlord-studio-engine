#!/usr/bin/env node
// I-96 port — reality-check: docs vs. the machine. REPORT-ONLY, always exit 0.
// Node port of the vault's setup/reality-check.sh (read there for full drift-class
// rationale). Scope deliberately narrow: only BACKTICK-QUOTED, vault-rooted path refs
// in tracked markdown (`_claude/...`, `docs/...`, `setup/...`, `Projects/...`, `sot/...`,
// `sessions/...`, `wiki/...`). Prose mentions and external refs are out of scope by design.
//
// Two registers, two report sections — vault-homed so users maintain them themselves:
//   _claude/reality-check-ignore.txt   -> real noise, silenced
//   _claude/reality-aspirational.txt   -> declared-not-yet-built, own section, never BROKEN
//
// ponytail: report-only forever (precedent: skill-audit, verification-evidence) — a
// block would false-positive on honest work-in-progress. Judgment stays human.
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { resolveVault } = require('./platform.js');

const REF_RE = /`(_claude|docs|setup|Projects|sot|sessions|wiki)\/[A-Za-z0-9 ._/-]*`/g;
// Living docs only: date-stamped files (specs, plans, retros, postmortems) are HISTORY —
// they reference paths as they were, and that is a record, not drift.
const DATED_PATH_RE = /(^|\/)\d{4}-\d{2}-\d{2}/;

function loadRegister(file) {
  let content;
  // register path may exist but not be a readable file (directory, permissions, etc.
  // — a plausible user slip); same guard shape as profile.js's config read. Single
  // guard here covers every caller (doctor, CLI) rather than wrapping each call site.
  try { content = fs.readFileSync(file, 'utf8'); } catch { return []; }
  return content.split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'));
}

// prefix-or-exact match, one pattern per line (shell glob semantics: `pat` or `pat`*)
function inRegister(patterns, ref) {
  return patterns.some((pat) => ref === pat || ref.startsWith(pat));
}

function check(vaultPath) {
  const ignore = loadRegister(path.join(vaultPath, '_claude', 'reality-check-ignore.txt'));
  const aspirational = loadRegister(path.join(vaultPath, '_claude', 'reality-aspirational.txt'));

  let files = [];
  try {
    files = execFileSync('git', ['-C', vaultPath, 'ls-files', '*.md'], { encoding: 'utf8' })
      .split('\n').filter(Boolean);
  } catch { /* not a git repo, or no tracked files — refs stays empty */ }
  files = files.filter((f) => !f.startsWith('_claude/archive/') && !DATED_PATH_RE.test(f));

  const refs = new Set();
  for (const f of files) {
    let content;
    // tracked-but-deleted files (routine uncommitted vault state: `rm` without `git rm`)
    // throw ENOENT here; the bash source tolerates this via `xargs grep ... 2>/dev/null` —
    // skip unreadable files rather than crash the report-only tool.
    try { content = fs.readFileSync(path.join(vaultPath, f), 'utf8'); }
    catch { continue; }
    for (const m of content.matchAll(REF_RE)) {
      refs.add(m[0].slice(1, -1).replace(/ +$/, ''));
    }
  }

  const broken = [];
  const declared = [];
  for (const ref of [...refs].sort()) {
    if (inRegister(ignore, ref)) continue;
    // a ref like `setup/tool.sh --flag` is a command example: existence-check the
    // first whitespace token only, but report the FULL ref when broken.
    const fileToken = ref.split(' ')[0];
    if (fs.existsSync(path.join(vaultPath, fileToken))) continue;
    if (inRegister(aspirational, ref)) declared.push(ref);
    else broken.push(ref);
  }

  const lines = ['reality-check — backtick-quoted vault paths in tracked docs, verified against disk:'];
  lines.push('');
  if (broken.length) {
    lines.push('BROKEN (doc references a path that does not exist — fix the doc or restore the path):');
    for (const r of broken) lines.push(`  ${r}`);
  } else {
    lines.push('BROKEN: none');
  }
  if (declared.length) {
    lines.push('');
    lines.push('DECLARED, NOT YET INSTANTIATED (aspirational by decision — informational):');
    for (const r of declared) lines.push(`  ${r}`);
  }

  return { broken, declared, lines };
}

if (require.main === module) {
  const vault = resolveVault(process.argv[2]);
  if (!vault) {
    console.log(`reality-check: vault not found at ${process.argv[2] || '(none given)'}`);
    process.exit(0);
  }
  console.log(check(vault).lines.join('\n'));
  process.exit(0);
}

module.exports = { check };
