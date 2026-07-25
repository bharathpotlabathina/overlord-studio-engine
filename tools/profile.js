#!/usr/bin/env node
// v0.2.0 M1 — tier->model resolution per plan profile. The named reader of the
// `profile=` key in _claude/.studio-config (a key exists because its reader does).
// pro (default): deep/top collapse to Sonnet — the audience has only Sonnet;
// max: the Director's 2026-07-19 bindings, verbatim. Tiers are the one vocabulary.
'use strict';
const fs = require('fs');
const path = require('path');

const TABLES = {
  max: { local: 'local', cheap: 'haiku', standard: 'sonnet', deep: 'opus', top: 'fable' },
  pro: { local: 'local', cheap: 'haiku', standard: 'sonnet', deep: 'sonnet', top: 'sonnet' },
};

function resolveProfile(vaultPath) {
  try {
    const cfg = fs.readFileSync(path.join(vaultPath, '_claude', '.studio-config'), 'utf8');
    const m = cfg.match(/^profile=(\S+)$/m);
    if (m && TABLES[m[1]]) return m[1];
  } catch { /* absent config -> default */ }
  return 'pro';
}

function bindTier(tier, profile) {
  const table = TABLES[profile] || TABLES.pro;
  if (!(tier in table)) throw new Error(`unknown tier: ${tier}`);
  return table[tier];
}

if (require.main === module) {
  const vault = process.argv[2] || process.cwd();
  const p = resolveProfile(vault);
  console.log(JSON.stringify({ profile: p, bindings: TABLES[p] }));
}

module.exports = { resolveProfile, bindTier, TABLES };
