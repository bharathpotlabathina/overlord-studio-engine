'use strict';
// Task 4.3 (M7) — firing tests, not bookkeeping. Simulate each ratified event ->
// assert the wired checks RUN and the wired roles are summoned; remove a wire ->
// the event fires nothing for that role; a ratified event missing from the table
// entirely -> the coverage check goes red.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { fire } = require('../event-fire.js');

const ROOT = path.join(__dirname, '..', '..');
const TABLE = path.join(ROOT, 'tools', 'events.json');
const RATIFIED = ['release-composed', 'spec-lands', 'feature-build-starts', 'client-feedback'];

test('release-composed: checks actually RUN and roles are summoned', () => {
  const r = fire('release-composed', ROOT, TABLE);
  const out = r.lines.join('\n');
  assert.match(out, /check infra-check-gate: GREEN/);
  assert.match(out, /check security-detector: GREEN — security-cert self-test: seeded exposure correctly detected RED/);
  assert.match(out, /SUMMON qa — runbook methodology\/playbooks\/qa-release-pass\.md/);
  assert.match(out, /SUMMON security/);
  assert.match(out, /SUMMON release/);
  assert.match(out, /fired 2 check\(s\) \+ 3 summon\(s\)/);
});

test('every ratified standing event fires at least one wire', () => {
  for (const ev of RATIFIED) {
    const r = fire(ev, ROOT, TABLE);
    assert.notStrictEqual(r.code, 2, `${ev} unknown`);
    assert.match(r.lines.join('\n'), /fired \d+ check\(s\) \+ [1-9]\d* summon\(s\)|fired [1-9]/, `${ev} fired nothing`);
  }
});

test('MUTATION: removing the qa wire -> release-composed no longer summons qa', () => {
  const table = JSON.parse(fs.readFileSync(TABLE, 'utf8'));
  table.events['release-composed'] = table.events['release-composed'].filter((w) => w.role !== 'qa');
  const mutated = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'evt-')), 'events.json');
  fs.writeFileSync(mutated, JSON.stringify(table));
  const r = fire('release-composed', ROOT, mutated);
  const out = r.lines.join('\n');
  assert.doesNotMatch(out, /SUMMON qa/);
  assert.match(out, /SUMMON security/); // others untouched
});

test('MUTATION: a ratified event deleted from the table -> loud unknown-event error', () => {
  const table = JSON.parse(fs.readFileSync(TABLE, 'utf8'));
  delete table.events['spec-lands'];
  const mutated = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'evt-')), 'events.json');
  fs.writeFileSync(mutated, JSON.stringify(table));
  const r = fire('spec-lands', ROOT, mutated);
  assert.strictEqual(r.code, 2);
  assert.match(r.lines.join('\n'), /unknown event/);
});

test('every summon wire points at a file that exists (dead runbook = dead wire)', () => {
  const table = JSON.parse(fs.readFileSync(TABLE, 'utf8'));
  for (const [ev, wires] of Object.entries(table.events)) {
    for (const w of wires) {
      const target = w.kind === 'check' ? w.run : w.runbook;
      assert.ok(fs.existsSync(path.join(ROOT, target)), `${ev}: dead wire target ${target}`);
    }
  }
});
