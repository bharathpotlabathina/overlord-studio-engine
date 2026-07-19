#!/usr/bin/env node
// Task 3.0 — kernel structural lint against personas/KERNEL-CONTRACT.md.
// The loader name-test proves a kernel resolves; this proves it CONFORMS:
// frontmatter, required sections, thin/rich rules, live runbook links,
// standing-events wired in prose, no codenames outside flavour files.
'use strict';
const fs = require('fs');
const path = require('path');

const REQUIRED_SECTIONS = ['Identity', 'Chain of Command', 'Behavioural Rules', 'Event Wiring'];

function lint(file, repoRoot) {
  const text = fs.readFileSync(file, 'utf8');
  const errors = [];

  const fm = text.match(/^---\n([\s\S]*?)\n---/);
  let weight = null;
  let standingEvents = [];
  if (!fm) {
    errors.push('missing YAML frontmatter (role / weight / model / standing-events)');
  } else {
    for (const key of ['role', 'weight', 'model', 'standing-events']) {
      if (!new RegExp(`^${key}:`, 'm').test(fm[1])) errors.push(`frontmatter missing "${key}"`);
    }
    weight = (fm[1].match(/^weight:\s*(\w+)/m) || [])[1] || null;
    if (weight && !['rich', 'thin'].includes(weight)) errors.push(`weight must be rich|thin, got "${weight}"`);
    const se = fm[1].match(/^standing-events:\s*\[([^\]]*)\]/m);
    if (se) standingEvents = se[1].split(',').map((s) => s.trim()).filter(Boolean);
  }

  for (const s of REQUIRED_SECTIONS) {
    if (!new RegExp(`^##\\s+${s}\\s*$`, 'm').test(text)) errors.push(`missing required section: ## ${s}`);
  }

  const hasVoice = /^##\s+Voice\s*$/m.test(text);
  const runbookSection = /^##\s+Runbooks\s*$/m.test(text);
  if (weight === 'thin') {
    if (hasVoice) errors.push('thin kernel carries rich-only section ## Voice (persona depth belongs in the flavour skin)');
    if (!runbookSection) errors.push('thin kernel missing ## Runbooks linkage block (the docs ARE the role)');
  }
  if (runbookSection) {
    const links = [...text.matchAll(/^- runbook:\s*(\S+)/gm)].map((m) => m[1]);
    if (weight === 'thin' && links.length === 0) errors.push('## Runbooks has no "- runbook:" entries');
    for (const l of links) {
      if (!fs.existsSync(path.join(repoRoot, l))) errors.push(`runbook link dead: ${l}`);
    }
  }

  const wiring = (text.match(/^##\s+Event Wiring\s*$([\s\S]*?)(^##\s|\s*$(?![\s\S]))/m) || [])[1] || '';
  for (const ev of standingEvents) {
    if (!wiring.includes(ev)) errors.push(`standing event "${ev}" declared in frontmatter but absent from ## Event Wiring`);
  }

  if (/codename/i.test(text)) errors.push('kernel mentions a codename — names live only in flavour files');

  return { errors, weight };
}

if (require.main === module) {
  const file = process.argv[2];
  if (!file) { console.log('usage: kernel-lint.js <kernel.md> [...more]'); process.exit(2); }
  const repoRoot = process.cwd();
  let failed = false;
  for (const f of process.argv.slice(2)) {
    const { errors, weight } = lint(f, repoRoot);
    if (errors.length) {
      failed = true;
      console.log(`KERNEL LINT FAILED — ${path.basename(f)}:`);
      errors.forEach((e) => console.log('  ' + e));
    } else {
      console.log(`kernel-lint: ${path.basename(f)} conforms (${weight})`);
    }
  }
  process.exit(failed ? 1 : 0);
}
module.exports = { lint };
