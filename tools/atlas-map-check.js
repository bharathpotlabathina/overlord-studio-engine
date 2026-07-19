#!/usr/bin/env node
// Validates and diffs the studio Atlas capability map against its own declared
// schema. Node port of atlas-map-check.py — same CLI, exit codes, report format.
'use strict';
const fs = require('fs');
const path = require('path');

const VALID_STATES = ['Raw', 'Discussed', 'Designed', 'Ready', 'Built', 'Live', 'Graveyard', 'Gated', 'Blocked'];
const VALID_REL_TYPES = ['Requires', 'Enables', 'Feeds', 'Blocks'];
const VALID_PROVENANCE = ['Confirmed', 'Inferred', 'Proposed'];
const FUTURE_ICEBOX_PILLARS = ['PIL-001', 'PIL-002', 'PIL-005', 'PIL-006', 'PIL-007'];
const HOLDING_PILLARS = ['PIL-003']; // Future — sole holding pillar (Icebox/PIL-004 merged into Future 2026-07-12)
const GRAVEYARD_PILLAR = 'PIL-008';
const NON_FUNCTIONAL_PILLARS = [...HOLDING_PILLARS, GRAVEYARD_PILLAR];
const ID_PATTERNS = {
  capabilities: /^CAP-\d{3}$/,
  relationships: /^REL-\d{3}$/,
  flows: /^FLW-\d{3}$/,
};

const has = (set, v) => set.includes(v);
// Python str() as embedded in an f-string (scalars).
function pyStr(v) {
  if (v === null || v === undefined) return 'None';
  if (v === true) return 'True';
  if (v === false) return 'False';
  return String(v);
}
// Python repr() for elements inside list/tuple rendering.
function pyRepr(v) {
  if (v === null || v === undefined) return 'None';
  if (v === true) return 'True';
  if (v === false) return 'False';
  if (typeof v === 'string') return `'${v}'`;
  return String(v);
}
const pyList = (arr) => '[' + arr.map(pyRepr).join(', ') + ']';
const pyTuple = (arr) => '(' + arr.map(pyRepr).join(', ') + (arr.length === 1 ? ',' : '') + ')';
const sortedList = (arr) => pyList([...arr].sort());
const deepEq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const arr = (x) => (Array.isArray(x) ? x : []);

function loadMap(p) {
  let text;
  try { text = fs.readFileSync(p, 'utf8'); }
  catch (e) { return [null, [['ERROR', 'V1', '-', `cannot read file: ${e.message}`]]]; }
  try { return [JSON.parse(text), []]; }
  catch (e) { return [null, [['ERROR', 'V1', '-', `invalid JSON: ${e.message}`]]]; }
}

function checkShape(data) {
  const errors = [];
  const required = {
    _schema: 'object', meta: 'object', capabilities: 'array',
    relationships: 'array', flows: 'array', pillars: 'array',
  };
  for (const [key, expected] of Object.entries(required)) {
    if (!(key in data)) { errors.push(['ERROR', 'V2', '-', `missing top-level key: ${key}`]); continue; }
    const v = data[key];
    const ok = expected === 'array' ? Array.isArray(v)
      : (typeof v === 'object' && v !== null && !Array.isArray(v));
    if (!ok) {
      const got = Array.isArray(v) ? 'list' : v === null ? 'NoneType' : typeof v === 'object' ? 'dict' : typeof v;
      const want = expected === 'array' ? 'list' : 'dict';
      errors.push(['ERROR', 'V2', '-', `${key} must be ${want}, got ${got}`]);
    }
  }
  return errors;
}

function checkIdIntegrity(data) {
  const errors = [];
  for (const [objType, pattern] of Object.entries(ID_PATTERNS)) {
    const seen = new Map();
    for (const obj of arr(data[objType])) {
      const oid = obj.id || '';
      seen.set(oid, (seen.get(oid) || 0) + 1);
      if (!pattern.test(oid)) {
        errors.push(['ERROR', 'V3', oid || '-', `id does not match ${objType.slice(0, -1)} pattern ${pattern.source}`]);
      }
    }
    for (const [oid, count] of seen) {
      if (count > 1) errors.push(['ERROR', 'V3', oid, `duplicate id (${count} occurrences)`]);
    }
  }
  return errors;
}

function checkStateEnum(data) {
  const errors = [];
  for (const cap of arr(data.capabilities)) {
    if (!has(VALID_STATES, cap.state)) {
      errors.push(['ERROR', 'V4', cap.id || '-', `state '${pyStr(cap.state)}' not in locked enum ${sortedList(VALID_STATES)}`]);
    }
  }
  return errors;
}

function checkConditionalFields(data) {
  const errors = [];
  const capIds = new Set(arr(data.capabilities).map((c) => c.id));
  const pillarByCap = {};
  for (const pillar of arr(data.pillars)) {
    for (const group of arr(pillar.groups)) {
      for (const cid of arr(group.capabilities)) pillarByCap[cid] = pillar.id;
    }
  }
  for (const cap of arr(data.capabilities)) {
    const cid = cap.id || '-';
    const state = cap.state;
    const pid = pillarByCap[cid];
    const hasTp = 'target_pillar' in cap;
    const inHolding = has(HOLDING_PILLARS, pid);
    if (hasTp && !inHolding) {
      errors.push(['ERROR', 'V5', cid, `target_pillar "${cap.target_pillar}" present but not grouped under a holding pillar ${sortedList(HOLDING_PILLARS)}`]);
    }
    if (hasTp && !has(FUTURE_ICEBOX_PILLARS, cap.target_pillar)) {
      errors.push(['ERROR', 'V5', cid, `target_pillar "${cap.target_pillar}" not in allowed set ${sortedList(FUTURE_ICEBOX_PILLARS)}`]);
    }
    if (inHolding && !hasTp) {
      errors.push(['ERROR', 'V5', cid, `grouped under holding pillar ${pid} but target_pillar is missing`]);
    }
    if ('replaced_by' in cap) {
      if (state !== 'Graveyard') {
        errors.push(['ERROR', 'V5', cid, `replaced_by present but state is "${pyStr(state)}" (allowed only on Graveyard)`]);
      }
      if (!capIds.has(cap.replaced_by)) {
        errors.push(['ERROR', 'V5', cid, `replaced_by "${cap.replaced_by}" does not exist in capabilities`]);
      }
    }
  }
  return errors;
}

function checkRelationships(data) {
  const errors = [];
  const capIds = new Set(arr(data.capabilities).map((c) => c.id));
  const seen = new Map();
  for (const rel of arr(data.relationships)) {
    const rid = rel.id || '-';
    const { type: rtype, source, target } = rel;
    if (!has(VALID_REL_TYPES, rtype)) {
      errors.push(['ERROR', 'V6', rid, `type '${pyStr(rtype)}' not in locked set ${sortedList(VALID_REL_TYPES)}`]);
    }
    if (!capIds.has(source)) errors.push(['ERROR', 'V6', rid, `source "${pyStr(source)}" does not exist in capabilities`]);
    if (!capIds.has(target)) errors.push(['ERROR', 'V6', rid, `target "${pyStr(target)}" does not exist in capabilities`]);
    if (source === target && source !== undefined && source !== null) {
      errors.push(['WARNING', 'V6', rid, `self-loop: source and target are both ${source}`]);
    }
    const key = JSON.stringify([source ?? null, target ?? null, rtype ?? null]);
    seen.set(key, (seen.get(key) || 0) + 1);
  }
  for (const [key, count] of seen) {
    if (count > 1) {
      const t = JSON.parse(key);
      errors.push(['WARNING', 'V6', '-', `duplicate relationship triple ${pyTuple(t)} (${count} occurrences)`]);
    }
  }
  return errors;
}

function checkFlows(data) {
  const errors = [];
  const capIds = new Set(arr(data.capabilities).map((c) => c.id));
  for (const flow of arr(data.flows)) {
    const fid = flow.id || '-';
    arr(flow.steps).forEach((step, i) => {
      const cid = step.capability_id;
      if (!capIds.has(cid)) errors.push(['ERROR', 'V7', fid, `step ${i} capability_id '${pyStr(cid)}' does not exist in capabilities`]);
    });
  }
  return errors;
}

function checkPillarCoverage(data) {
  const errors = [];
  const capIds = new Set(arr(data.capabilities).map((c) => c.id));
  const capsById = {};
  for (const c of arr(data.capabilities)) capsById[c.id] = c;
  const grouped = new Map();
  const pillarByCap = new Map();
  for (const pillar of arr(data.pillars)) {
    const pid = pillar.id || '-';
    for (const group of arr(pillar.groups)) {
      for (const cid of arr(group.capabilities)) {
        grouped.set(cid, (grouped.get(cid) || 0) + 1);
        pillarByCap.set(cid, pid);
        if (!capIds.has(cid)) errors.push(['ERROR', 'V8', cid, `pillar group references nonexistent capability (in pillar ${pid})`]);
      }
    }
  }
  for (const cid of capIds) {
    const count = grouped.get(cid) || 0;
    if (count === 0) errors.push(['ERROR', 'V8', cid, 'not grouped under any pillar']);
    else if (count > 1) errors.push(['ERROR', 'V8', cid, `grouped under ${count} pillars (must be exactly one)`]);
  }
  for (const [cid, pid] of pillarByCap) {
    const cap = capsById[cid];
    if (cap === undefined) continue;
    const state = cap.state;
    if (state === 'Live' && has(NON_FUNCTIONAL_PILLARS, pid)) {
      errors.push(['ERROR', 'V8', cid, `state is Live but grouped under ${pid} (Live requires a functional pillar)`]);
    }
    if (pid === GRAVEYARD_PILLAR && state !== 'Graveyard') {
      errors.push(['ERROR', 'V8', cid, `grouped under Graveyard pillar ${pid} but state is "${pyStr(state)}" (must be Graveyard)`]);
    }
    if (pid !== GRAVEYARD_PILLAR && state === 'Graveyard') {
      errors.push(['ERROR', 'V8', cid, `state is Graveyard but grouped under ${pid}, expected ${GRAVEYARD_PILLAR}`]);
    }
  }
  return errors;
}

function checkConfidence(data) {
  const errors = [];
  for (const objType of ['capabilities', 'relationships', 'flows']) {
    for (const obj of arr(data[objType])) {
      const oid = obj.id || '-';
      const conf = obj.confidence;
      if (typeof conf !== 'object' || conf === null || Array.isArray(conf)) {
        errors.push(['ERROR', 'V9', oid, 'missing or malformed confidence block']);
        continue;
      }
      const score = conf.score;
      const provenance = conf.provenance;
      const numeric = typeof score === 'number' && !Number.isNaN(score);
      if (!numeric || !(score >= 0.0 && score <= 1.0)) {
        errors.push(['ERROR', 'V9', oid, `confidence.score '${pyStr(score)}' not a number in [0.0, 1.0]`]);
      }
      if (!has(VALID_PROVENANCE, provenance)) {
        errors.push(['ERROR', 'V9', oid, `confidence.provenance '${pyStr(provenance)}' not in ${sortedList(VALID_PROVENANCE)}`]);
      } else if (numeric) {
        if (provenance === 'Confirmed' && score < 0.5) {
          errors.push(['WARNING', 'V9', oid, `score ${pyStr(score)} is low for provenance "Confirmed"`]);
        }
      }
    }
  }
  return errors;
}

const CHECKS = [checkShape, checkIdIntegrity, checkStateEnum, checkConditionalFields,
  checkRelationships, checkFlows, checkPillarCoverage, checkConfidence];

function printReport(errors, nCaps, nRels, nFlows) {
  const nErrors = errors.filter((e) => e[0] === 'ERROR').length;
  const nWarnings = errors.filter((e) => e[0] === 'WARNING').length;
  for (const [severity, checkId, objId, message] of errors) {
    console.log(`${severity} ${checkId} ${objId}: ${message}`);
  }
  const status = nErrors ? 'FAIL' : 'PASS';
  console.log(`${status} — ${nErrors} errors, ${nWarnings} warnings (${nCaps} capabilities, ${nRels} relationships, ${nFlows} flows checked)`);
}

function runValidate(p, strict) {
  let [data, errors] = loadMap(p);
  if (data === null) { printReport(errors, 0, 0, 0); return 2; }
  if (typeof data !== 'object' || Array.isArray(data)) {
    printReport([['ERROR', 'V2', '-', 'top-level JSON value must be an object']], 0, 0, 0);
    return 1;
  }
  for (const check of CHECKS) errors = errors.concat(check(data));
  if (strict) errors = errors.map(([sev, cid, oid, msg]) => [sev === 'WARNING' ? 'ERROR' : sev, cid, oid, msg]);
  const nCaps = Array.isArray(data.capabilities) ? data.capabilities.length : 0;
  const nRels = Array.isArray(data.relationships) ? data.relationships.length : 0;
  const nFlows = Array.isArray(data.flows) ? data.flows.length : 0;
  printReport(errors, nCaps, nRels, nFlows);
  return errors.some((e) => e[0] === 'ERROR') ? 1 : 0;
}

function loadForDiff(p) {
  const [data, errors] = loadMap(p);
  if (data === null) { printReport(errors, 0, 0, 0); return null; }
  return data;
}

function runPhases(p) {
  const data = loadForDiff(p);
  if (data === null) return 2;
  const phases = new Map();
  for (const cap of arr(data.capabilities)) {
    for (const tag of arr(cap.tags)) {
      if (typeof tag === 'string' && tag.startsWith('phase-')) {
        if (!phases.has(tag)) phases.set(tag, []);
        phases.get(tag).push(cap);
      }
    }
  }
  if (phases.size === 0) { console.log('no phase tags in map'); return 0; }
  for (const phase of [...phases.keys()].sort()) {
    const caps = phases.get(phase);
    // I-95 fix (2026-07-19): Graveyard excluded from the denominator (a killed
    // item is not pending work) but shown — kills preserved, never hidden.
    const active = caps.filter((c) => c.state !== 'Graveyard');
    const graveyard = caps.length - active.length;
    const live = active.filter((c) => c.state === 'Live').length;
    const inFlight = active.filter((c) => ['Designed', 'Ready', 'Built'].includes(c.state));
    let line = `${phase}: ${live}/${active.length} Live`;
    if (graveyard) line += ` (+${graveyard} retired)`;
    if (inFlight.length) {
      line += ' — in flight: ' + inFlight.map((c) => `${c.id || '?'} ${c.state || '?'}`).join(', ');
    }
    console.log(line);
  }
  return 0;
}

function vaultRoot() {
  return process.env.ATLAS_VAULT || path.resolve(__dirname, '..');
}
function localDateISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function runProposeFlip(args) {
  const vault = vaultRoot();
  const staging = path.join(vault, '_claude', 'atlas-staging');
  const live = path.join(vault, '_claude', 'studio-atlas-map.json');
  let stagedFiles = [];
  try { stagedFiles = fs.readdirSync(staging).filter((f) => f.endsWith('.proposed.json')).sort(); } catch { /* none */ }
  const base = stagedFiles.length ? path.join(staging, stagedFiles[stagedFiles.length - 1]) : live;
  const baseName = path.basename(base);
  const [data, errors] = loadMap(base);
  if (data === null) { printReport(errors, 0, 0, 0); return 2; }

  const caps = {};
  for (const c of arr(data.capabilities)) caps[c.id] = c;
  const cap = caps[args.cap_id];
  if (cap === undefined) { console.log(`ERROR: ${args.cap_id} not found in ${baseName}`); return 1; }
  if (!has(VALID_STATES, args.new_state)) {
    console.log(`ERROR: state '${args.new_state}' not in locked enum ${sortedList(VALID_STATES)}`); return 1;
  }
  const oldState = cap.state;

  const groups = {};
  let cur = null;
  for (const pil of arr(data.pillars)) {
    for (const g of arr(pil.groups)) {
      groups[g.id] = [pil.id, g];
      if (arr(g.capabilities).includes(args.cap_id)) cur = [pil.id, g];
    }
  }
  let curPid = cur ? cur[0] : null;
  const needsMove =
    (args.new_state === 'Live' && has(NON_FUNCTIONAL_PILLARS, curPid)) ||
    (args.new_state === 'Graveyard' && curPid !== GRAVEYARD_PILLAR);

  if (needsMove && !args.group) {
    const want = args.new_state === 'Live'
      ? 'a functional-pillar group (not the Future/Graveyard pillars)'
      : `a group under ${GRAVEYARD_PILLAR}`;
    const gl = Object.keys(groups).sort().map((gid) => `${gid} (${groups[gid][0]})`).join(', ');
    console.log(`ERROR: this flip moves ${args.cap_id} between pillars — --group required (${want}). Groups: ${gl}`);
    return 1;
  }
  if (args.group && !needsMove) {
    console.log('ERROR: --group given but this flip needs no pillar move (regrouping is /atlas-map-review business, not a flip)');
    return 1;
  }
  if (needsMove) {
    if (!(args.group in groups)) { console.log(`ERROR: group '${args.group}' does not exist`); return 1; }
    const gp = groups[args.group][0];
    if (args.new_state === 'Live' && has(NON_FUNCTIONAL_PILLARS, gp)) {
      console.log(`ERROR: entering Live — --group must be a functional pillar, ${args.group} is under ${gp}`); return 1;
    }
    if (args.new_state === 'Graveyard' && gp !== GRAVEYARD_PILLAR) {
      console.log(`ERROR: entering Graveyard — --group must be under ${GRAVEYARD_PILLAR}, ${args.group} is under ${gp}`); return 1;
    }
    if (cur) {
      const list = cur[1].capabilities;
      const idx = list.indexOf(args.cap_id);
      if (idx !== -1) list.splice(idx, 1);
    }
    groups[args.group][1].capabilities = arr(groups[args.group][1].capabilities);
    groups[args.group][1].capabilities.push(args.cap_id);
    curPid = gp;
  }

  cap.state = args.new_state;
  const inHolding = has(HOLDING_PILLARS, curPid);
  if (!inHolding) delete cap.target_pillar;
  if (inHolding && !(args.target_pillar || 'target_pillar' in cap)) {
    console.log(`ERROR: ${args.cap_id} is grouped under holding pillar ${curPid} — requires --target-pillar (V5)`); return 1;
  }
  if (inHolding && args.target_pillar) cap.target_pillar = args.target_pillar;
  if (args.new_state === 'Graveyard') {
    if (args.replaced_by) cap.replaced_by = args.replaced_by;
    if (!('replaced_by' in cap)) { console.log('ERROR: flipping to Graveyard requires --replaced-by (V5)'); return 1; }
  } else {
    delete cap.replaced_by;
  }

  const stamp = localDateISO();
  if (args.note) {
    if (typeof cap.confidence !== 'object' || cap.confidence === null) {
      cap.confidence = { score: 0.9, provenance: 'Confirmed', source: '' };
    }
    const conf = cap.confidence;
    conf.source = ((conf.source || '') + ` | ${stamp}: ${args.note}`).replace(/^[ |]+/, '');
  }

  let resultErrors = [];
  for (const check of CHECKS) resultErrors = resultErrors.concat(check(data));
  if (resultErrors.some((e) => e[0] === 'ERROR')) {
    printReport(resultErrors, arr(data.capabilities).length, arr(data.relationships).length, arr(data.flows).length);
    console.log('REFUSED — staging unchanged');
    return 1;
  }

  const out = path.join(staging, `${stamp}-studio-map.proposed.json`);
  fs.mkdirSync(staging, { recursive: true });
  fs.writeFileSync(out, JSON.stringify(data, null, 1));
  if (path.resolve(base) !== path.resolve(live) && path.resolve(base) !== path.resolve(out)) {
    try { fs.rmSync(base); } catch { /* ignore */ }
  }
  console.log(`staged: ${args.cap_id} ${pyStr(oldState)} -> ${args.new_state} [base: ${baseName}]`);
  return 0;
}

function indexBy(items, keyFn) {
  const m = {};
  for (const item of items) m[keyFn(item)] = item;
  return m;
}

function runDiff(currentPath, proposedPath) {
  const current = loadForDiff(currentPath);
  const proposed = loadForDiff(proposedPath);
  if (current === null || proposed === null) return 2;

  const curCaps = indexBy(arr(current.capabilities), (c) => c.id);
  const propCaps = indexBy(arr(proposed.capabilities), (c) => c.id);
  const curSet = new Set(Object.keys(curCaps));
  const propSet = new Set(Object.keys(propCaps));
  const added = [...propSet].filter((x) => !curSet.has(x)).sort();
  const removed = [...curSet].filter((x) => !propSet.has(x)).sort();
  const common = [...curSet].filter((x) => propSet.has(x)).sort();

  const stateChanges = [], fieldChanges = [], metadataChanges = [];
  for (const cid of common) {
    const c = curCaps[cid], p = propCaps[cid];
    if (c.state !== p.state) stateChanges.push([cid, c.state, p.state]);
    const changed = ['name', 'description', 'purpose', 'tags', 'target_pillar', 'replaced_by', 'confidence']
      .filter((k) => !deepEq(c[k], p[k]));
    if (changed.length === 1 && changed[0] === 'confidence') metadataChanges.push([cid, changed]);
    else if (changed.length) fieldChanges.push([cid, changed]);
  }
  const renames = [];
  for (const rId of removed) for (const aId of added) {
    if (curCaps[rId].name === propCaps[aId].name) renames.push([rId, aId, curCaps[rId].name]);
  }

  console.log('=== Capabilities ===');
  console.log(`Added (${added.length}):`);
  for (const cid of added) console.log(`  + ${cid} "${propCaps[cid].name}" state=${pyStr(propCaps[cid].state)}`);
  console.log(`Removed (${removed.length}):`);
  for (const cid of removed) console.log(`  - ${cid} "${curCaps[cid].name}"`);
  console.log(`State changes (${stateChanges.length}):`);
  for (const [cid, o, n] of stateChanges) console.log(`  ~ ${cid}: ${pyStr(o)} -> ${pyStr(n)}`);
  console.log(`Field changes (${fieldChanges.length}):`);
  for (const [cid, fields] of fieldChanges) console.log(`  ~ ${cid}: ${fields.join(', ')}`);
  console.log(`Metadata-only changes (${metadataChanges.length}):`);
  for (const [cid, fields] of metadataChanges) console.log(`  ~ ${cid}: ${fields.join(', ')}`);
  console.log(`Possible renames (${renames.length}):`);
  for (const [rId, aId, name] of renames) console.log(`  ? ${rId} -> ${aId} — same capability "${name}"?`);

  const relKey = (r) => JSON.stringify([r.source, r.target, r.type]);
  const curRels = indexBy(arr(current.relationships), relKey);
  const propRels = indexBy(arr(proposed.relationships), relKey);
  const curRelSet = new Set(Object.keys(curRels)), propRelSet = new Set(Object.keys(propRels));
  const relAdded = [...propRelSet].filter((k) => !curRelSet.has(k)).sort();
  const relRemoved = [...curRelSet].filter((k) => !propRelSet.has(k)).sort();
  const relCommon = [...curRelSet].filter((k) => propRelSet.has(k)).sort();
  const relMetaChanged = relCommon.filter((k) =>
    curRels[k].label !== propRels[k].label || !deepEq(curRels[k].confidence, propRels[k].confidence));

  const unkey = (k) => JSON.parse(k);
  console.log('\n=== Relationships ===');
  console.log(`Added (${relAdded.length}):`);
  for (const k of relAdded) { const t = unkey(k); console.log(`  + ${t[0]} -${t[2]}-> ${t[1]}`); }
  console.log(`Removed (${relRemoved.length}):`);
  for (const k of relRemoved) { const t = unkey(k); console.log(`  - ${t[0]} -${t[2]}-> ${t[1]}`); }
  console.log(`Metadata changed (${relMetaChanged.length}):`);
  for (const k of relMetaChanged) {
    const t = unkey(k); const changed = [];
    if (curRels[k].label !== propRels[k].label) changed.push(`label: "${curRels[k].label}" -> "${propRels[k].label}"`);
    if (!deepEq(curRels[k].confidence, propRels[k].confidence)) changed.push('confidence');
    console.log(`  ~ ${t[0]} -${t[2]}-> ${t[1]}: ${changed.join(', ')}`);
  }

  const curFlows = indexBy(arr(current.flows), (f) => f.name);
  const propFlows = indexBy(arr(proposed.flows), (f) => f.name);
  const curFlowSet = new Set(Object.keys(curFlows)), propFlowSet = new Set(Object.keys(propFlows));
  const flowAdded = [...propFlowSet].filter((n) => !curFlowSet.has(n)).sort();
  const flowRemoved = [...curFlowSet].filter((n) => !propFlowSet.has(n)).sort();
  const flowCommon = [...curFlowSet].filter((n) => propFlowSet.has(n)).sort();
  const flowChanged = flowCommon.filter((n) => !deepEq(curFlows[n].steps, propFlows[n].steps));
  const flowMetaChanged = flowCommon.filter((n) =>
    deepEq(curFlows[n].steps, propFlows[n].steps) && !deepEq(curFlows[n].confidence, propFlows[n].confidence));

  console.log('\n=== Flows ===');
  console.log(`Added (${flowAdded.length}): ${flowAdded.length ? flowAdded.join(', ') : '(none)'}`);
  console.log(`Removed (${flowRemoved.length}): ${flowRemoved.length ? flowRemoved.join(', ') : '(none)'}`);
  console.log(`Step sequence changed (${flowChanged.length}):`);
  for (const name of flowChanged) {
    console.log(`  ~ ${name}:`);
    console.log(`      before: ${pyList(arr(curFlows[name].steps).map((s) => s.capability_id))}`);
    console.log(`      after:  ${pyList(arr(propFlows[name].steps).map((s) => s.capability_id))}`);
  }
  console.log(`Metadata changed (${flowMetaChanged.length}):`);
  for (const name of flowMetaChanged) console.log(`  ~ ${name}: confidence`);

  const curGroups = {}, propGroups = {};
  for (const pillar of arr(current.pillars)) for (const group of arr(pillar.groups)) for (const cid of arr(group.capabilities)) curGroups[cid] = [pillar.id, group.id];
  for (const pillar of arr(proposed.pillars)) for (const group of arr(pillar.groups)) for (const cid of arr(group.capabilities)) propGroups[cid] = [pillar.id, group.id];
  const moved = [];
  for (const cid of Object.keys(curGroups)) {
    if (cid in propGroups && !deepEq(curGroups[cid], propGroups[cid])) moved.push([cid, curGroups[cid], propGroups[cid]]);
  }
  console.log(`\n=== Pillar-grouping moves (${moved.length}) ===`);
  for (const [cid, o, n] of moved) console.log(`  ~ ${cid}: ${pyTuple(o)} -> ${pyTuple(n)}`);

  return 0;
}

function parseFlipArgs(rest) {
  const args = { cap_id: rest[0], new_state: rest[1], group: null, target_pillar: null, replaced_by: null, note: null };
  for (let i = 2; i < rest.length; i++) {
    const map = { '--group': 'group', '--target-pillar': 'target_pillar', '--replaced-by': 'replaced_by', '--note': 'note' };
    if (map[rest[i]]) { args[map[rest[i]]] = rest[i + 1]; i++; }
  }
  return args;
}

function main() {
  const argv = process.argv.slice(2);
  const command = argv[0];
  let code = 0;
  if (command === 'validate') {
    const strict = argv.includes('--strict');
    const mapPath = argv.slice(1).find((a) => !a.startsWith('--'));
    code = runValidate(mapPath, strict);
  } else if (command === 'diff') {
    code = runDiff(argv[1], argv[2]);
  } else if (command === 'phases') {
    code = runPhases(argv[1]);
  } else if (command === 'propose-flip') {
    code = runProposeFlip(parseFlipArgs(argv.slice(1)));
  } else {
    console.error('usage: atlas-map-check.js <validate|diff|phases|propose-flip> ...');
    code = 2;
  }
  process.exit(code);
}

if (require.main === module) main();
module.exports = { runValidate, runDiff, runPhases, runProposeFlip, CHECKS };
