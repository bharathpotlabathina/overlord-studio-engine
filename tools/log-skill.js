#!/usr/bin/env node
// PostToolUse(Skill): append "ISO | <skill>" to the vault's skill-invocations.log.
// Port of the hooks.json inline sed/date one-liner. Never throws.
'use strict';
const fs = require('fs');
const path = require('path');
const { readStdin, isoStamp, resolveVault } = require('./platform.js');

async function main() {
  try {
    const VAULT = resolveVault(process.argv[2]);
    if (!VAULT) return;
    const input = await readStdin();
    let skill = '?';
    try { skill = JSON.parse(input)?.tool_input?.skill || '?'; } catch { /* keep ? */ }
    const logPath = path.join(VAULT, '_claude', 'skill-invocations.log');
    fs.appendFileSync(logPath, `${isoStamp()} | ${skill}\n`);
  } catch { /* never block the tool */ }
}

main();
