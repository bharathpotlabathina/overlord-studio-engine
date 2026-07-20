'use strict';
// Preflight leak-scan wiring (2026-07-20 incident): the board's leak-scan line
// passed the repo DIRECTORY as a file argument for its whole life — the scanner
// read nothing, printed clean, and every board ever read carried a hollow green
// on that row. These tests pin the wiring with stub scanners honoring the real
// CLI contract (--repo <dir> is repo mode; anything else must never pass), so
// no private term ever needs to appear in this public repo to prove the gate.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { checkLeakScan } = require('../preflight.js');

function stub(body) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'leakstub-'));
  const p = path.join(d, 'scanner.js');
  fs.writeFileSync(p, body);
  return { p, d };
}

test('leak scan invokes the scanner in repo mode — dir-as-file-arg is the hollow green', () => {
  // Stub passes ONLY when called as `--repo <dir>` — the shape the real scanner
  // scans anything under. Any other invocation exits 1 loudly.
  const { p, d } = stub(
    'if (process.argv[2] !== "--repo") { console.error("scanner invoked without --repo — reads nothing, hollow green"); process.exit(1); }\n' +
    'process.exit(0);\n');
  assert.strictEqual(checkLeakScan(p, d), true, 'preflight must call the scanner with --repo');
});

test('a scanner red is a board HOLD, never green', () => {
  const { p, d } = stub('console.error("DIST LEAK BLOCKED — stub"); process.exit(1);\n');
  assert.strictEqual(checkLeakScan(p, d), false);
});

test('scanner missing on this machine is SKIP (null), not green', () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'leakstub-'));
  assert.strictEqual(checkLeakScan(path.join(d, 'nope.js'), d), null);
});
