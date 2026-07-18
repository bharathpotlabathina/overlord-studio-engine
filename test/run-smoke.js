#!/usr/bin/env node
// Windows/macOS/Linux smoke runner (Task 1.5 prep) — one command, no shell globbing
// (cmd.exe expands nothing), no POSIX assumptions: discovers tools/test/*.test.js
// itself and hands the explicit list to node --test. Exit code = suite result.
// The Windows RUN is parked (no substrate on this machine; §Q7) — this script is
// the prepared smoke; on any box: `node test/run-smoke.js`.
'use strict';
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const testDir = path.join(__dirname, '..', 'tools', 'test');
const files = fs.readdirSync(testDir).filter((f) => f.endsWith('.test.js')).map((f) => path.join(testDir, f));
if (files.length === 0) { console.log('smoke: found 0 test files — that is a failure, not a pass'); process.exit(1); }

console.log(`smoke: platform=${process.platform} node=${process.version} — running ${files.length} test files`);
const suite = spawnSync(process.execPath, ['--test', ...files], { stdio: 'inherit' });

const posix = spawnSync(process.execPath, [path.join(__dirname, '..', 'tools', 'checks', 'posix-only-check.js')], { stdio: 'inherit' });

const ok = suite.status === 0 && posix.status === 0;
console.log(ok ? 'smoke: PASS (suite + posix-only guard)' : 'smoke: FAIL');
process.exit(ok ? 0 : 1);
