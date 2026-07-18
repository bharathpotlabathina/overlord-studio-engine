#!/usr/bin/env node
// Check for the "registry" mechanism itself: tools/registry.json parses and every
// mechanism entry carries the required trigger->check pair fields (Task 0.1 schema).
'use strict';
const fs = require('fs');
const path = require('path');

const REQUIRED = ['id', 'trigger', 'check', 'lastVerified', 'home'];

function main() {
  const root = process.cwd();
  const registryPath = path.join(root, 'tools', 'registry.json');
  const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
  if (!Array.isArray(registry.mechanisms)) throw new Error('registry.mechanisms must be an array');
  if (!Array.isArray(registry.documents)) throw new Error('registry.documents must be an array');
  for (const m of registry.mechanisms) {
    for (const key of REQUIRED) {
      if (!m[key]) throw new Error(`mechanism ${m.id || '(unnamed)'} missing required field: ${key}`);
    }
  }
  console.log(`registry schema valid — ${registry.mechanisms.length} mechanisms, ${registry.documents.length} documents`);
}

try {
  main();
} catch (e) {
  console.log(`registry schema invalid: ${e.message}`);
  process.exit(1);
}
