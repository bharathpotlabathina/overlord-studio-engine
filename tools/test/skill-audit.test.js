'use strict';
// Task 1.4 (Stage 3 Phase 1) — skill-firing audit, fixing I-97's two defects:
// (1) the audit only ran when the /logout ritual was followed (honor-system prose) —
//     now a Stop-hook wire; (2) "(none)" read as success — absence is now a loud flag.
// Acceptance: a session window missing verification-before-completion -> flagged, exit 1;
// a window containing it -> clean, exit 0. Report-only stays the dated exception
// (2026-07-14 WARN precedent): the wire warns, it cannot and does not block.
const { test } = require('node:test');
const assert = require('node:assert');
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const AUDIT = path.join(__dirname, '..', 'skill-audit.js');
const LOGGER = path.join(__dirname, '..', 'log-skill.js');

function newVault(logLines) {
  const v = fs.mkdtempSync(path.join(os.tmpdir(), 'skaudit-'));
  fs.mkdirSync(path.join(v, '_claude'), { recursive: true });
  if (logLines !== null) {
    fs.writeFileSync(path.join(v, '_claude', 'skill-invocations.log'), logLines.join('\n') + (logLines.length ? '\n' : ''));
  }
  return v;
}

function runAudit(vault) {
  try {
    const out = execFileSync('node', [AUDIT, vault], { encoding: 'utf8' });
    return { code: 0, out: out.trim() };
  } catch (e) {
    return { code: e.status, out: (e.stdout || '').toString().trim() };
  }
}

test('window with verification-before-completion -> clean, positive proof, exit 0', () => {
  const v = newVault([
    '2026-07-19T01:00:00 | logout',
    '2026-07-19T02:00:00 | superpowers:test-driven-development',
    '2026-07-19T02:30:00 | superpowers:verification-before-completion',
  ]);
  const r = runAudit(v);
  assert.strictEqual(r.code, 0);
  assert.match(r.out, /audited 2 skill invocations this session/);
  assert.match(r.out, /\[x\] verification-before-completion/);
});

test('build-shaped window missing verification-before-completion -> loud flag, exit 1', () => {
  const v = newVault([
    '2026-07-19T01:00:00 | logout',
    '2026-07-19T02:00:00 | superpowers:test-driven-development',
  ]);
  const r = runAudit(v);
  assert.strictEqual(r.code, 1);
  assert.match(r.out, /SKILL-AUDIT FLAG/);
  assert.match(r.out, /verification-before-completion — not fired/);
});

test('empty session window -> "(none)" is a flag, not success (exit 1)', () => {
  const v = newVault(['2026-07-19T01:00:00 | logout']);
  const r = runAudit(v);
  assert.strictEqual(r.code, 1);
  assert.match(r.out, /\(none\)/);
});

test('window starts after the LAST boundary marker (prior-session skills excluded)', () => {
  const v = newVault([
    '2026-07-18T02:00:00 | superpowers:verification-before-completion',
    '2026-07-19T01:00:00 | logout',
    '2026-07-19T02:00:00 | superpowers:brainstorming',
  ]);
  const r = runAudit(v);
  assert.strictEqual(r.code, 1); // yesterday's verification does not cover today
  assert.match(r.out, /verification-before-completion — not fired/);
});

test('no log file at all -> explicit nothing-to-report, exit 0 (cold install)', () => {
  const v = newVault(null);
  const r = runAudit(v);
  assert.strictEqual(r.code, 0);
  assert.match(r.out, /no invocation log/);
});

test('log-skill.js appends an ISO-stamped line from hook stdin', () => {
  const v = newVault([]);
  execFileSync('node', [LOGGER, v], {
    input: JSON.stringify({ tool_input: { skill: 'superpowers:brainstorming' } }),
    encoding: 'utf8',
  });
  const log = fs.readFileSync(path.join(v, '_claude', 'skill-invocations.log'), 'utf8').trim();
  assert.match(log, /^\d{4}-\d{2}-\d{2}T[\d:]+.* \| superpowers:brainstorming$/);
});
