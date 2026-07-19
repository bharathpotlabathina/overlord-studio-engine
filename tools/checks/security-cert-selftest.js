#!/usr/bin/env node
// Task 3.2 self-test (Law 4): the security certificate's core detector must be
// able to go red. Seeds a fixture product where a prod secret/identifier is
// reachable from preview, runs infra-check against it, and asserts RED. If the
// seeded exposure passes, the certificate process is theatre — exit 1 loudly.
'use strict';
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const INFRA = path.join(__dirname, '..', 'infra-check.js');

const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'certtest-'));
fs.writeFileSync(path.join(fixture, 'infra-check.json'), JSON.stringify({
  prodIdentifiers: ['db.seededprod.supabase.co', 'sk_live_SEEDED'],
  envFiles: ['.env.preview'],
}));
fs.writeFileSync(path.join(fixture, '.env.preview'),
  'DATABASE_URL=postgres://db.seededprod.supabase.co/main\nSTRIPE_KEY=sk_live_SEEDED\n');

let red = false;
let out = '';
try {
  out = execFileSync('node', [INFRA], { cwd: fixture, encoding: 'utf8' });
} catch (e) {
  red = true;
  out = (e.stdout || '').toString();
}

if (!red) {
  console.log('SECURITY CERT SELF-TEST FAILED — the seeded prod-secret-in-preview exposure PASSED the detector. Issue NO certificates until this is fixed.');
  console.log(out.trim());
  process.exit(1);
}
console.log('security-cert self-test: seeded exposure correctly detected RED — the certificate can go red.');
console.log('  ' + out.trim().split('\n').join('\n  '));
