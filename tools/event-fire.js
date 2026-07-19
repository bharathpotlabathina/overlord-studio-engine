#!/usr/bin/env node
// Task 4.3 — event firer. `node tools/event-fire.js <event>` looks up the wired
// actions in tools/events.json, RUNS every check-wire, and EMITS the summon-wires
// (role + runbook) for the session lead to act on. Firing, not bookkeeping (M7):
// a wire removed from the table fires nothing — the tests assert that both ways.
// Silence != success: fired counts print always; an unknown event fails loudly.
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

function fire(event, root, tablePath) {
  const table = JSON.parse(fs.readFileSync(tablePath, 'utf8')).events;
  if (!table[event]) {
    return { code: 2, lines: [`EVENT-FIRE ERROR — unknown event "${event}". Known: ${Object.keys(table).join(', ')}`] };
  }
  const lines = [];
  let failed = false;
  let checks = 0;
  let summons = 0;
  for (const wire of table[event]) {
    if (wire.kind === 'check') {
      checks += 1;
      try {
        const out = execFileSync('node', [path.join(root, wire.run)], { cwd: root, encoding: 'utf8' });
        lines.push(`check ${wire.id}: GREEN — ${out.trim().split('\n')[0]}`);
      } catch (e) {
        failed = true;
        lines.push(`check ${wire.id}: RED — ${((e.stdout || '') + '').trim().split('\n')[0] || 'exited non-zero'}`);
      }
    } else if (wire.kind === 'summon') {
      summons += 1;
      lines.push(`SUMMON ${wire.role} — runbook ${wire.runbook} (${wire.why})`);
    }
  }
  lines.push(`event "${event}": fired ${checks} check(s) + ${summons} summon(s)`);
  return { code: failed ? 1 : 0, lines };
}

if (require.main === module) {
  const root = path.join(__dirname, '..');
  const { code, lines } = fire(process.argv[2] || '', root, process.env.EVENTS_TABLE || path.join(__dirname, 'events.json'));
  console.log(lines.join('\n'));
  process.exit(code);
}
module.exports = { fire };
