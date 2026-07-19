'use strict';
// Task 3.0 acceptance: a kernel missing a required section (or a thin kernel
// carrying a rich-only section, or a dead runbook link) -> lint fails; a
// conforming kernel -> passes.
const { test } = require('node:test');
const assert = require('node:assert');
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const LINT = path.join(__dirname, '..', 'kernel-lint.js');

const THIN = `---
role: release
weight: thin
model: opus
standing-events: [release-composed]
---
# Release Engineer — Kernel
## Identity
Owns every environment; gates production only.
## Chain of Command
Studio Director -> Orchestrator -> flat bench. Gate on the go/no-go artifact.
## Behavioural Rules
- Certify, never authorise.
## Event Wiring
- release-composed: run the composition sweep and the gate.
## Runbooks
- runbook: methodology/playbooks/EXISTING.md
`;

function setup(kernelText, opts = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'klint-'));
  fs.mkdirSync(path.join(root, 'personas'), { recursive: true });
  fs.mkdirSync(path.join(root, 'methodology', 'playbooks'), { recursive: true });
  if (!opts.skipRunbook) fs.writeFileSync(path.join(root, 'methodology', 'playbooks', 'EXISTING.md'), '# rb\n');
  const p = path.join(root, 'personas', 'x-kernel.md');
  fs.writeFileSync(p, kernelText);
  return { root, p };
}

function run(root, p) {
  try {
    return { code: 0, out: execFileSync('node', [LINT, p], { encoding: 'utf8', cwd: root }).trim() };
  } catch (e) {
    return { code: e.status, out: (e.stdout || '').toString().trim() };
  }
}

test('conforming thin kernel passes with positive proof', () => {
  const { root, p } = setup(THIN);
  const r = run(root, p);
  assert.strictEqual(r.code, 0);
  assert.match(r.out, /kernel-lint: .* conforms \(thin\)/);
});

test('missing required section (Event Wiring) -> fail, named', () => {
  const { root, p } = setup(THIN.replace(/## Event Wiring[\s\S]*?## Runbooks/, '## Runbooks'));
  const r = run(root, p);
  assert.notStrictEqual(r.code, 0);
  assert.match(r.out, /Event Wiring/);
});

test('thin kernel carrying rich-only Voice section -> fail', () => {
  const { root, p } = setup(THIN + '## Voice\nBrooding.\n');
  const r = run(root, p);
  assert.notStrictEqual(r.code, 0);
  assert.match(r.out, /Voice/);
});

test('thin kernel without Runbooks -> fail; dead runbook path -> fail', () => {
  const noRb = setup(THIN.replace(/## Runbooks[\s\S]*$/, ''));
  assert.notStrictEqual(run(noRb.root, noRb.p).code, 0);
  const deadRb = setup(THIN, { skipRunbook: true });
  const r = run(deadRb.root, deadRb.p);
  assert.notStrictEqual(r.code, 0);
  assert.match(r.out, /EXISTING\.md/);
});

test('standing-event in frontmatter absent from Event Wiring -> fail', () => {
  const { root, p } = setup(THIN.replace('- release-composed: run the composition sweep and the gate.', '- (none)'));
  const r = run(root, p);
  assert.notStrictEqual(r.code, 0);
  assert.match(r.out, /release-composed/);
});

test('codename mention -> fail; rich kernel with Voice -> pass', () => {
  const bad = setup(THIN.replace('Owns every environment', 'Codename Omniknight owns every environment'));
  assert.notStrictEqual(run(bad.root, bad.p).code, 0);
  const rich = setup(THIN.replace('weight: thin', 'weight: rich').replace(/## Runbooks[\s\S]*$/, '## Voice\nCalm, three steps ahead.\n'));
  const r = run(rich.root, rich.p);
  assert.strictEqual(r.code, 0);
  assert.match(r.out, /conforms \(rich\)/);
});
