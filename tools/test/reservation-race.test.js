'use strict';
// Task 1.2 (Stage 3 Phase 1) — concurrent-claim atomicity self-check (Check B).
// Spawns concurrent claimers against one migrations/RESERVED ledger and asserts
// every returned number is distinct and the set is sequential — proving the
// atomic-create primitive (mkdirSync, O_EXCL semantics) is why collisions can't
// happen, not luck. Mutation proof (transcript in tools/PROOFS.md): swapping the
// atomic create for a naive read-check-write makes this test collide and fail.
const { test } = require('node:test');
const assert = require('node:assert');
const { execFile } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const SCRIPT = path.join(__dirname, '..', 'migration-guard.js');
const CLAIMERS = 8;

function claimAsync(cwd) {
  return new Promise((resolve, reject) => {
    execFile('node', [SCRIPT, 'claim', '--dir', 'migrations'], { cwd, encoding: 'utf8' },
      (err, stdout) => (err ? reject(err) : resolve(stdout.trim())));
  });
}

test(`race: ${CLAIMERS} concurrent claimers get distinct sequential numbers`, async () => {
  const r = fs.mkdtempSync(path.join(os.tmpdir(), 'migrace-'));
  fs.mkdirSync(path.join(r, 'migrations'), { recursive: true });
  fs.writeFileSync(path.join(r, 'migrations', '016_seed.sql'), '--');

  const results = await Promise.all(Array.from({ length: CLAIMERS }, () => claimAsync(r)));
  const nums = results.map((s) => parseInt(s, 10)).sort((a, b) => a - b);

  const distinct = new Set(nums);
  assert.strictEqual(distinct.size, CLAIMERS,
    `expected ${CLAIMERS} distinct numbers, got ${JSON.stringify(results)}`);
  for (let i = 0; i < nums.length; i++) {
    assert.strictEqual(nums[i], 17 + i,
      `expected sequential run starting at 017, got ${JSON.stringify(nums)}`);
  }
  console.log(`race check: ${CLAIMERS} claimers, ${distinct.size} distinct sequential numbers — coordination held`);
});
