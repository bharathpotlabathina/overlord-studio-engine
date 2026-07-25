#!/usr/bin/env node
// Task 1.4 (Stage 3 Phase 1) — skill-firing audit at session close. Node rebuild of
// the bash audit, fixing I-97's two defects: (1) it only ran when the /logout ritual
// was followed — this is now a Stop-hook wire, firing whether or not anyone remembers;
// (2) "(none)" read as success — an empty window and a missing non-negotiable are now
// loud flags with exit 1. REPORT-ONLY by design (dated exception, 2026-07-14 WARN
// precedent): invocation presence is a proxy for compliance, so this warns, never
// blocks; a real verification gate is a separate future mechanism.
// Session window = lines after the most recent login/logout boundary marker
// (max of the two — a session's /login does not always log a marker).
// ponytail: with no markers at all it audits the whole log — degrades sensibly.
'use strict';
const fs = require('fs');
const path = require('path');
const { resolveVault } = require('./platform.js');

const NON_NEGOTIABLE = ['verification-before-completion'];
const ADVISORY = ['brainstorming', 'systematic-debugging'];

function audit(vault) {
  const logPath = path.join(vault, '_claude', 'skill-invocations.log');
  if (!fs.existsSync(logPath)) {
    return { code: 0, lines: ['skill-audit: no invocation log yet — nothing to report.'] };
  }
  const raw = fs.readFileSync(logPath, 'utf8').split('\n').filter(Boolean);
  let start = 0;
  raw.forEach((line, i) => {
    // A marker on the log's FINAL line is the current closing ritual's own entry (the
    // /logout skill logs before this audit runs) — it must not become the boundary, or
    // the window empties at exactly the moment the audit matters (I-97 defect 1).
    if (i === raw.length - 1) return;
    if (/\| *(login|logout)$/.test(line)) start = i + 1;
  });
  const skills = raw.slice(start)
    .map((l) => l.replace(/^[^|]*\| */, '').trim())
    .filter((s) => s && s !== 'login' && s !== 'logout');

  const lines = [];
  let flagged = false;

  lines.push(`audited ${skills.length} skill invocation${skills.length === 1 ? '' : 's'} this session`);
  if (skills.length === 0) {
    flagged = true;
    lines.push('SKILL-AUDIT FLAG — (none): zero skills fired this session. An empty audit is a finding, not a pass.');
  } else {
    const counts = new Map();
    for (const s of skills) counts.set(s, (counts.get(s) || 0) + 1);
    for (const [s, n] of [...counts.entries()].sort((a, b) => b[1] - a[1])) lines.push(`  ${n}x ${s}`);
  }

  lines.push('Non-negotiable skills (presence only — whether each was required is the human\'s judgment):');
  for (const s of NON_NEGOTIABLE) {
    if (skills.some((k) => k.includes(s))) {
      lines.push(`  [x] ${s}`);
    } else {
      flagged = true;
      lines.push(`  SKILL-AUDIT FLAG — [ ] ${s} — not fired this session (report-only: warns, never blocks)`);
    }
  }
  for (const s of ADVISORY) {
    lines.push(skills.some((k) => k.includes(s)) ? `  [x] ${s}` : `  [ ] ${s} — not fired (advisory)`);
  }

  return { code: flagged ? 1 : 0, lines };
}

if (require.main === module) {
  const vault = resolveVault(process.argv[2]);
  if (!vault) { console.log('usage: skill-audit.js <vault-path>'); process.exit(2); }
  const { code, lines } = audit(vault);
  console.log(lines.join('\n'));
  process.exit(code);
}

module.exports = { audit };
