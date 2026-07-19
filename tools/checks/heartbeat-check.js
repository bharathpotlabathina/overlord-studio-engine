#!/usr/bin/env node
// Heartbeat recency check (Task 2.3) — a dead hook is caught by its missing/stale
// beacon, not by silence. Cold-tolerant BY STATED FACT, not leniency: until the
// plugin is installed somewhere, no hook can beat, so a missing beacons dir prints
// an explicit cold line and exits 0. Once ANY beacon exists, staleness blocks.
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');

const STALE_DAYS = 8; // one missed weekly cadence + slack
const VAULT = process.env.VAULT || path.join(os.homedir(), 'Documents', 'overlord-vault');
const dir = path.join(VAULT, '_claude', '.heartbeats');

if (!fs.existsSync(dir) || fs.readdirSync(dir).length === 0) {
  console.log('heartbeats: none recorded — hooks not installed yet (cold; plugin install pending). 0 beacons checked.');
  process.exit(0);
}
let stale = 0;
const beacons = fs.readdirSync(dir);
for (const b of beacons) {
  const ageDays = (Date.now() - fs.statSync(path.join(dir, b)).mtimeMs) / 86400000;
  if (ageDays > STALE_DAYS) {
    stale += 1;
    console.log(`DEAD HOOK — beacon "${b}" last beat ${Math.floor(ageDays)} days ago (threshold ${STALE_DAYS})`);
  }
}
if (stale) process.exit(1);
console.log(`heartbeats: checked ${beacons.length} beacon${beacons.length === 1 ? '' : 's'}, all fresh`);
