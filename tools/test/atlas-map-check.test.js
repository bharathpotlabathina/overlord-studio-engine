'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const SCRIPT = path.join(__dirname, '..', 'atlas-map-check.js');

function validMap() {
  return {
    _schema: { version: '3.0', notes: { state: 'locked 9-value enum' } },
    meta: { product: 'Test' },
    capabilities: [
      { id: 'CAP-001', name: 'Vault', description: 'd', purpose: 'p', state: 'Live', tags: ['infrastructure'],
        confidence: { score: 0.98, provenance: 'Confirmed', source: 's' } },
      { id: 'CAP-002', name: 'Wiki', description: 'd', purpose: 'p', state: 'Discussed', tags: ['knowledge'], target_pillar: 'PIL-001',
        confidence: { score: 0.8, provenance: 'Confirmed', source: 's' } },
    ],
    relationships: [
      { id: 'REL-001', source: 'CAP-002', target: 'CAP-001', type: 'Requires', label: 'l',
        confidence: { score: 0.9, provenance: 'Inferred', source: 's' } },
    ],
    flows: [
      { id: 'FLW-001', name: 'Flow', description: 'd', steps: [{ capability_id: 'CAP-001', label: 'l' }],
        confidence: { score: 0.9, provenance: 'Confirmed', source: 's' } },
    ],
    pillars: [
      { id: 'PIL-001', name: 'Foundation', type: 'Foundation', color: '#000', description: 'd',
        groups: [{ id: 'GRP-001', label: 'g', capabilities: ['CAP-001'] }] },
      { id: 'PIL-003', name: 'Future', type: 'Future', color: '#000', description: 'd',
        groups: [{ id: 'GRP-002', label: 'g', capabilities: ['CAP-002'] }] },
    ],
  };
}
const clone = (x) => JSON.parse(JSON.stringify(x));
function tmpdir() { return fs.mkdtempSync(path.join(os.tmpdir(), 'atlas-')); }
function writeMap(dir, data, name = 'map.json') {
  const p = path.join(dir, name); fs.writeFileSync(p, JSON.stringify(data)); return p;
}
function runValidate(p, strict) {
  const args = [SCRIPT, 'validate', p]; if (strict) args.push('--strict');
  return run(args);
}
function runDiff(a, b) { return run([SCRIPT, 'diff', a, b]); }
function run(args, env) {
  try { const out = execFileSync('node', args, { encoding: 'utf8', env: env || process.env }); return { code: 0, out }; }
  catch (e) { return { code: e.status, out: (e.stdout || '').toString(), err: (e.stderr || '').toString() }; }
}

// ---- Validate ----
test('valid map passes', () => {
  const r = runValidate(writeMap(tmpdir(), validMap()));
  assert.strictEqual(r.code, 0); assert.match(r.out, /PASS/);
});
test('invalid JSON fails with V1', () => {
  const d = tmpdir(); const p = path.join(d, 'map.json'); fs.writeFileSync(p, '{not valid json');
  const r = runValidate(p); assert.ok([1, 2].includes(r.code)); assert.match(r.out, /V1/);
});
test('missing file exits 2', () => {
  const r = runValidate('/tmp/does-not-exist-atlas-map.json'); assert.strictEqual(r.code, 2);
});
test('duplicate id fails V3', () => {
  const d = validMap(); d.capabilities.push(clone(d.capabilities[0]));
  const r = runValidate(writeMap(tmpdir(), d));
  assert.strictEqual(r.code, 1); assert.match(r.out, /V3/); assert.match(r.out, /duplicate/);
});
test('bad state fails V4', () => {
  const d = validMap(); d.capabilities[0].state = 'NotARealState';
  const r = runValidate(writeMap(tmpdir(), d)); assert.strictEqual(r.code, 1); assert.match(r.out, /V4/);
});
test('target_pillar without holding pillar fails V5', () => {
  const d = validMap(); d.capabilities[0].target_pillar = 'PIL-002';
  const r = runValidate(writeMap(tmpdir(), d));
  assert.strictEqual(r.code, 1); assert.match(r.out, /V5/); assert.match(r.out, /CAP-001/);
});
test('target_pillar PIL-003 fails V5', () => {
  const d = validMap(); d.capabilities[1].target_pillar = 'PIL-003';
  const r = runValidate(writeMap(tmpdir(), d)); assert.strictEqual(r.code, 1); assert.match(r.out, /V5/);
});
test('holding pillar without target_pillar fails V5', () => {
  const d = validMap(); delete d.capabilities[1].target_pillar;
  const r = runValidate(writeMap(tmpdir(), d));
  assert.strictEqual(r.code, 1); assert.match(r.out, /V5/); assert.match(r.out, /CAP-002/);
});
test('Live in holding pillar fails V8', () => {
  const d = validMap(); d.capabilities[1].state = 'Live';
  const r = runValidate(writeMap(tmpdir(), d));
  assert.strictEqual(r.code, 1); assert.match(r.out, /V8/); assert.match(r.out, /functional pillar/);
});
test('Graveyard state outside graveyard pillar fails V8', () => {
  const d = validMap(); d.capabilities[0].state = 'Graveyard'; d.capabilities[0].replaced_by = 'CAP-002';
  const r = runValidate(writeMap(tmpdir(), d));
  assert.strictEqual(r.code, 1); assert.match(r.out, /V8/); assert.match(r.out, /PIL-008/);
});
test('graveyard pillar requires graveyard state fails V8', () => {
  const d = validMap();
  d.pillars.push({ id: 'PIL-008', name: 'Graveyard', type: 'Graveyard', color: '#000', description: 'd',
    groups: [{ id: 'GRP-003', label: 'g', capabilities: ['CAP-001'] }] });
  d.pillars[0].groups[0].capabilities = [];
  const r = runValidate(writeMap(tmpdir(), d));
  assert.strictEqual(r.code, 1); assert.match(r.out, /V8/); assert.match(r.out, /must be Graveyard/);
});
test('dangling relationship target fails V6', () => {
  const d = validMap(); d.relationships[0].target = 'CAP-999';
  const r = runValidate(writeMap(tmpdir(), d));
  assert.strictEqual(r.code, 1); assert.match(r.out, /V6/); assert.match(r.out, /CAP-999/);
});
test('bad relationship type fails V6', () => {
  const d = validMap(); d.relationships[0].type = 'Blocks-ish';
  const r = runValidate(writeMap(tmpdir(), d)); assert.strictEqual(r.code, 1); assert.match(r.out, /V6/);
});
test('dangling flow step fails V7', () => {
  const d = validMap(); d.flows[0].steps[0].capability_id = 'CAP-999';
  const r = runValidate(writeMap(tmpdir(), d)); assert.strictEqual(r.code, 1); assert.match(r.out, /V7/);
});
test('ungrouped capability fails V8', () => {
  const d = validMap(); d.pillars[0].groups[0].capabilities = [];
  const r = runValidate(writeMap(tmpdir(), d));
  assert.strictEqual(r.code, 1); assert.match(r.out, /V8/); assert.match(r.out, /not grouped/);
});
test('double-grouped capability fails V8', () => {
  const d = validMap(); d.pillars[1].groups[0].capabilities.push('CAP-001');
  const r = runValidate(writeMap(tmpdir(), d)); assert.strictEqual(r.code, 1); assert.match(r.out, /V8/);
});
test('bad confidence score fails V9', () => {
  const d = validMap(); d.capabilities[0].confidence.score = 1.5;
  const r = runValidate(writeMap(tmpdir(), d)); assert.strictEqual(r.code, 1); assert.match(r.out, /V9/);
});
test('bad provenance fails V9', () => {
  const d = validMap(); d.capabilities[0].confidence.provenance = 'Guessed';
  const r = runValidate(writeMap(tmpdir(), d)); assert.strictEqual(r.code, 1); assert.match(r.out, /V9/);
});
test('low confirmed score is warning not error', () => {
  const d = validMap(); d.capabilities[0].confidence.score = 0.3;
  const r = runValidate(writeMap(tmpdir(), d)); assert.strictEqual(r.code, 0); assert.match(r.out, /WARNING/);
});
test('strict promotes warning to error', () => {
  const d = validMap(); d.capabilities[0].confidence.score = 0.3;
  const r = runValidate(writeMap(tmpdir(), d), true); assert.strictEqual(r.code, 1);
});

// ---- Diff ----
test('added capability shown', () => {
  const cur = validMap(); const prop = validMap();
  prop.capabilities.push({ id: 'CAP-003', name: 'New Thing', description: 'd', purpose: 'p', state: 'Designed', tags: [], target_pillar: 'PIL-001',
    confidence: { score: 0.7, provenance: 'Proposed', source: 's' } });
  prop.pillars[0].groups[0].capabilities.push('CAP-003');
  const d = tmpdir(); const r = runDiff(writeMap(d, cur), writeMap(d, prop, 'proposed.json'));
  assert.strictEqual(r.code, 0); assert.match(r.out, /CAP-003/); assert.match(r.out, /Added \(1\)/);
});
test('removed capability shown', () => {
  const cur = validMap(); const prop = validMap();
  prop.capabilities = prop.capabilities.filter((c) => c.id !== 'CAP-002');
  prop.pillars = prop.pillars.filter((p) => p.id !== 'PIL-003'); prop.relationships = [];
  const d = tmpdir(); const r = runDiff(writeMap(d, cur), writeMap(d, prop, 'proposed.json'));
  assert.strictEqual(r.code, 0); assert.match(r.out, /CAP-002/); assert.match(r.out, /Removed \(1\)/);
});
test('state change shown separately from metadata', () => {
  const cur = validMap(); const prop = validMap();
  prop.capabilities[1].state = 'Live'; delete prop.capabilities[1].target_pillar;
  prop.pillars = prop.pillars.filter((p) => p.id !== 'PIL-003');
  prop.pillars[0].groups[0].capabilities.push('CAP-002');
  const d = tmpdir(); const r = runDiff(writeMap(d, cur), writeMap(d, prop, 'proposed.json'));
  assert.strictEqual(r.code, 0); assert.match(r.out, /State changes \(1\)/); assert.match(r.out, /Discussed -> Live/);
});
test('rename candidate detected', () => {
  const cur = validMap(); const prop = validMap();
  prop.capabilities[0].id = 'CAP-099'; prop.relationships[0].target = 'CAP-099';
  prop.pillars[0].groups[0].capabilities = ['CAP-099'];
  const d = tmpdir(); const r = runDiff(writeMap(d, cur), writeMap(d, prop, 'proposed.json'));
  assert.strictEqual(r.code, 0); assert.match(r.out, /Possible renames \(1\)/); assert.match(r.out, /CAP-001 -> CAP-099/);
});
test('relationship added and removed shown', () => {
  const cur = validMap(); const prop = validMap();
  prop.relationships = [{ id: 'REL-002', source: 'CAP-001', target: 'CAP-002', type: 'Enables', label: 'new',
    confidence: { score: 0.9, provenance: 'Inferred', source: 's' } }];
  const d = tmpdir(); const r = runDiff(writeMap(d, cur), writeMap(d, prop, 'proposed.json'));
  assert.strictEqual(r.code, 0); assert.match(r.out, /=== Relationships ===/);
  const rel = r.out.split('=== Relationships ===')[1];
  assert.match(rel, /Added \(1\)/); assert.match(rel, /Removed \(1\)/);
});
test('pillar grouping move shown', () => {
  const cur = validMap(); const prop = validMap();
  prop.pillars[1].groups[0].capabilities = [];
  prop.pillars[1].groups.push({ id: 'GRP-003', label: 'g2', capabilities: ['CAP-002'] });
  const d = tmpdir(); const r = runDiff(writeMap(d, cur), writeMap(d, prop, 'proposed.json'));
  assert.strictEqual(r.code, 0); assert.match(r.out, /Pillar-grouping moves \(1\)/);
});
test('diff exits 2 on missing file', () => {
  const d = tmpdir(); const r = runDiff(writeMap(d, validMap()), '/tmp/does-not-exist-proposed.json');
  assert.strictEqual(r.code, 2);
});
test('capability confidence-only change shown as metadata', () => {
  const cur = validMap(); const prop = validMap();
  prop.capabilities[0].confidence = { score: 0.55, provenance: 'Confirmed', source: 's' };
  const d = tmpdir(); const r = runDiff(writeMap(d, cur), writeMap(d, prop, 'proposed.json'));
  assert.strictEqual(r.code, 0);
  const caps = r.out.split('=== Capabilities ===')[1].split('=== Relationships ===')[0];
  assert.match(caps, /Metadata-only changes \(1\)/);
  assert.match(caps.split('Metadata-only changes')[1], /CAP-001/);
  assert.match(caps, /State changes \(0\)/);
});
test('phases reports per-phase status', () => {
  const d = validMap(); d.capabilities[0].tags.push('phase-1'); d.capabilities[1].tags.push('phase-1');
  const r = run([SCRIPT, 'phases', writeMap(tmpdir(), d)]);
  assert.strictEqual(r.code, 0); assert.match(r.out, /phase-1: 1\/2 Live/);
});
test('phases no tags says so', () => {
  const r = run([SCRIPT, 'phases', writeMap(tmpdir(), validMap())]);
  assert.strictEqual(r.code, 0); assert.match(r.out, /no phase tags/);
});
test('replaced_by change shown in diff', () => {
  const cur = validMap(); const prop = validMap();
  prop.capabilities[1].state = 'Graveyard'; delete prop.capabilities[1].target_pillar;
  prop.capabilities[1].replaced_by = 'CAP-001';
  prop.pillars = prop.pillars.filter((p) => p.id !== 'PIL-003');
  prop.pillars[0].groups[0].capabilities.push('CAP-002');
  const d = tmpdir(); const r = runDiff(writeMap(d, cur), writeMap(d, prop, 'proposed.json'));
  assert.strictEqual(r.code, 0); assert.match(r.out, /replaced_by/);
});
test('name change is field change not metadata', () => {
  const cur = validMap(); const prop = validMap(); prop.capabilities[0].name = 'Vault Renamed';
  const d = tmpdir(); const r = runDiff(writeMap(d, cur), writeMap(d, prop, 'proposed.json'));
  assert.strictEqual(r.code, 0);
  const caps = r.out.split('=== Capabilities ===')[1].split('=== Relationships ===')[0];
  assert.match(caps, /Field changes \(1\)/); assert.match(caps, /Metadata-only changes \(0\)/);
});
test('relationship confidence-only change shown as metadata', () => {
  const cur = validMap(); const prop = validMap();
  prop.relationships[0].confidence = { score: 0.3, provenance: 'Inferred', source: 's' };
  const d = tmpdir(); const r = runDiff(writeMap(d, cur), writeMap(d, prop, 'proposed.json'));
  assert.strictEqual(r.code, 0);
  const rels = r.out.split('=== Relationships ===')[1].split('=== Flows ===')[0];
  assert.match(rels, /Metadata changed \(1\)/); assert.doesNotMatch(r.out, /Label changed/);
});
test('flow confidence-only change shown as metadata', () => {
  const cur = validMap(); const prop = validMap();
  prop.flows[0].confidence = { score: 0.4, provenance: 'Inferred', source: 's' };
  const d = tmpdir(); const r = runDiff(writeMap(d, cur), writeMap(d, prop, 'proposed.json'));
  assert.strictEqual(r.code, 0);
  const flows = r.out.split('=== Flows ===')[1];
  assert.match(flows, /Metadata changed \(1\)/); assert.match(flows, /Step sequence changed \(0\)/);
});

// ---- propose-flip ----
function vaultWithMap(map) {
  const v = tmpdir(); fs.mkdirSync(path.join(v, '_claude', 'atlas-staging'), { recursive: true });
  fs.writeFileSync(path.join(v, '_claude', 'studio-atlas-map.json'), JSON.stringify(map || validMap()));
  return v;
}
function runFlip(vault, ...args) {
  return run([SCRIPT, 'propose-flip', ...args], { ...process.env, ATLAS_VAULT: vault });
}
function staged(vault) {
  const dir = path.join(vault, '_claude', 'atlas-staging');
  return fs.readdirSync(dir).filter((f) => f.endsWith('.proposed.json')).sort();
}
function stagedData(vault) {
  const files = staged(vault);
  return JSON.parse(fs.readFileSync(path.join(vault, '_claude', 'atlas-staging', files[0]), 'utf8'));
}

test('lifecycle advance needs no group', () => {
  const v = vaultWithMap(); const r = runFlip(v, 'CAP-002', 'Ready');
  assert.strictEqual(r.code, 0, r.out + r.err); assert.match(r.out, /staged: CAP-002 Discussed -> Ready/);
  const cap = stagedData(v).capabilities.find((c) => c.id === 'CAP-002');
  assert.strictEqual(cap.state, 'Ready'); assert.strictEqual(cap.target_pillar, 'PIL-001');
});
test('flip to Live requires group', () => {
  const v = vaultWithMap(); const r = runFlip(v, 'CAP-002', 'Live');
  assert.strictEqual(r.code, 1); assert.match(r.out, /--group/); assert.deepStrictEqual(staged(v), []);
});
test('flip to Live with group', () => {
  const v = vaultWithMap(); const r = runFlip(v, 'CAP-002', 'Live', '--group', 'GRP-001', '--note', 'sprint done');
  assert.strictEqual(r.code, 0, r.out + r.err); assert.match(r.out, /staged: CAP-002 Discussed -> Live/);
  const cap = stagedData(v).capabilities.find((c) => c.id === 'CAP-002');
  assert.strictEqual(cap.state, 'Live'); assert.ok(!('target_pillar' in cap));
  assert.match(cap.confidence.source, /sprint done/);
});
test('flip to Live group must be functional', () => {
  const v = vaultWithMap(); const r = runFlip(v, 'CAP-002', 'Live', '--group', 'GRP-002');
  assert.strictEqual(r.code, 1); assert.match(r.out, /functional/); assert.deepStrictEqual(staged(v), []);
});
test('regroup without forced move refused', () => {
  const v = vaultWithMap(); const r = runFlip(v, 'CAP-002', 'Ready', '--group', 'GRP-001');
  assert.strictEqual(r.code, 1); assert.match(r.out, /regrouping is \/atlas-map-review business/); assert.deepStrictEqual(staged(v), []);
});
test('chaining keeps one staged file', () => {
  const v = vaultWithMap();
  const m = validMap(); m.capabilities.find((c) => c.id === 'CAP-002').tags.push('chained-marker');
  fs.writeFileSync(path.join(v, '_claude', 'atlas-staging', '2020-01-01-studio-map.proposed.json'), JSON.stringify(m));
  const r = runFlip(v, 'CAP-002', 'Ready');
  assert.strictEqual(r.code, 0, r.out + r.err);
  const files = staged(v); assert.strictEqual(files.length, 1);
  assert.notStrictEqual(files[0], '2020-01-01-studio-map.proposed.json');
  const cap = stagedData(v).capabilities.find((c) => c.id === 'CAP-002');
  assert.ok(cap.tags.includes('chained-marker'));
});
test('flip to Graveyard requires replaced-by and group', () => {
  const v = vaultWithMap();
  assert.strictEqual(runFlip(v, 'CAP-001', 'Graveyard').code, 1);
  const r2 = runFlip(v, 'CAP-001', 'Graveyard', '--replaced-by', 'CAP-002');
  assert.strictEqual(r2.code, 1); assert.match(r2.out, /--group/); assert.deepStrictEqual(staged(v), []);
});
test('flip to Graveyard needs new pillar first', () => {
  const v = vaultWithMap();
  const r = runFlip(v, 'CAP-001', 'Graveyard', '--replaced-by', 'CAP-002', '--group', 'GRP-999');
  assert.strictEqual(r.code, 1); assert.match(r.out, /does not exist/); assert.deepStrictEqual(staged(v), []);
});
test('holding pillar cap missing target_pillar refused', () => {
  const m = validMap(); delete m.capabilities[1].target_pillar; const v = vaultWithMap(m);
  const r = runFlip(v, 'CAP-002', 'Ready');
  assert.strictEqual(r.code, 1); assert.match(r.out, /--target-pillar/);
  const r2 = runFlip(v, 'CAP-002', 'Ready', '--target-pillar', 'PIL-002');
  assert.strictEqual(r2.code, 0, r2.out + r2.err);
});
test('invalid result refused', () => {
  const v = vaultWithMap(); const r = runFlip(v, 'CAP-002', 'Ready', '--target-pillar', 'PIL-003');
  assert.strictEqual(r.code, 1); assert.match(r.out, /V5/); assert.deepStrictEqual(staged(v), []);
});
test('unknown cap refused', () => {
  const v = vaultWithMap(); const r = runFlip(v, 'CAP-099', 'Live');
  assert.strictEqual(r.code, 1); assert.deepStrictEqual(staged(v), []);
});

// I-95 (Stage 3 Task 5.3): Graveyard'd caps must not inflate phase progress.
test('phases: Graveyard excluded from denominator, shown as retired', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'i95-'));
  const map = path.join(dir, 'map.json');
  fs.writeFileSync(map, JSON.stringify({
    meta: { corrected: [] }, pillars: [], flows: [],
    capabilities: [
      { id: 'CAP-001', state: 'Live', tags: ['phase-1'] },
      { id: 'CAP-002', state: 'Live', tags: ['phase-1'] },
      { id: 'CAP-003', state: 'Graveyard', tags: ['phase-1'] },
    ],
    relationships: [],
  }));
  const r = run([SCRIPT, 'phases', map]);
  assert.match(r.out, /phase-1: 2\/2 Live \(\+1 retired\)/);
});
