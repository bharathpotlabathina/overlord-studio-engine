'use strict';
// tools/push.js — maintainer push ritual (2026-07-19 incident closure): after a
// successful `git push`, the local marketplace clone + installed plugin must be
// brought forward in the same act, or the machine runs a version behind its own
// public repo. The spawn glue is trivial; the derivation of WHAT to run is the
// testable logic.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { updatePlan } = require('../push.js');

test('updatePlan derives both update commands from the plugin manifest name', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'push-'));
  fs.mkdirSync(path.join(root, '.claude-plugin'), { recursive: true });
  fs.writeFileSync(
    path.join(root, '.claude-plugin', 'plugin.json'),
    JSON.stringify({ name: 'acme-engine', version: '1.0.0' })
  );
  const plan = updatePlan(root);
  assert.deepStrictEqual(plan, [
    ['claude', ['plugin', 'marketplace', 'update', 'acme-engine']],
    ['claude', ['plugin', 'update', 'acme-engine@acme-engine']],
  ]);
});
