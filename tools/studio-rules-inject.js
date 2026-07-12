#!/usr/bin/env node
// Emitted into SessionStart additionalContext. Replaces the vault CLAUDE.md's job
// (studio rules + active_context data-load + default persona), launch-dir-independent.
// Degrades gracefully if vault_path isn't configured. Port of studio-rules-inject.sh.
'use strict';
const fs = require('fs');
const path = require('path');
const { ops } = require('./flavour.js');

const VAULT = process.env.CLAUDE_PLUGIN_OPTION_VAULT_PATH || '';
const PLUGIN = process.env.CLAUDE_PLUGIN_ROOT || path.resolve(__dirname, '..');

const RULES = `# Studio Context

You are working inside a structured creative/technical studio environment,
run by the studio director (addressed by an honorific — see the persona block below).
Full constitution: ${PLUGIN}/methodology/handbook.md

## Non-Negotiable Rules (every session, every role)
1. verification-before-completion before every commit, handoff, or phase transition. No exceptions.
2. brainstorming before any plan is written — even if the solution feels obvious.
3. systematic-debugging at the start of any debug session — not after 20 minutes of ad-hoc attempts.
4. Phase-specific skills (writing-plans, code-review, subagent-driven-development, test-driven-development) per the handbook Superpowers Skill Firing map.
5. Token counts in raw numbers only — never as context-window percentages.
6. QA findings must be verified against actual code/data/CSS before reporting.
7. source-of-truth writes require explicit director approval — only via /update-source-of-truth.

## If no role is summoned
- Read active_context (below) before starting work.
- Read the handbook before any structural or cross-project decision.

## Studio roles
orchestrator (strategy) · systems (planning) · dev-web (build) · ux · visual · qa · hardware (firmware) · mobile (app) · behavioral.
Summon via /summon-<role> (e.g. /summon-orchestrator, /summon-systems, /summon-qa, /summon-ux, /summon-visual, /summon-dev-web, /summon-hardware, /summon-mobile, /summon-behavioral).`;

function readIf(p) { try { return fs.readFileSync(p, 'utf8'); } catch { return null; } }

function main() {
  const out = [];
  out.push(RULES, '');
  out.push('## Current active work (active_context.md)');
  const ctx = VAULT ? readIf(path.join(VAULT, '_claude', 'memory', 'active_context.md')) : null;
  out.push(ctx !== null ? ctx.replace(/\n$/, '') : '(no active_context.md yet — run /studio-setup)');

  const flav = ops(VAULT || PLUGIN).resolve();
  out.push('');
  out.push('## Your persona this session — the Orchestrator (Flavour-named), always-on');
  const skin = readIf(path.join(flav, 'orchestrator-skin.md'));
  if (skin) out.push(skin.replace(/\n$/, ''));
  const flavMd = readIf(path.join(flav, 'flavour.md')) || '';
  const m = flavMd.match(/^honorific:\s*(.*)$/m);
  const hon = m ? m[1].trim() : 'Director';
  out.push(`Address the user as: ${hon}. Reverence is always on (engine); only names/honorific/mood/language are Flavour.`);

  process.stdout.write(out.join('\n') + '\n');
}

if (process.argv.includes('--selftest')) {
  const s = RULES;
  const need = ['verification-before-completion', 'brainstorming before any plan',
    'systematic-debugging', 'Token counts in raw numbers', 'source-of-truth writes require',
    '## Studio roles', '/summon-orchestrator'];
  for (const n of need) { if (!s.includes(n)) { console.error('MISSING:', n); process.exit(1); } }
  console.log('selftest ok');
} else {
  main();
}
