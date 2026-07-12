#!/usr/bin/env node
// Flavour pointer operations. Fail-open: never leave the pointer invalid.
// Port of flavour.sh. Vault from --vault <path>, else $VAULT, else <scriptdir>/..
'use strict';
const fs = require('fs');
const path = require('path');

function resolveVault(argv) {
  const i = argv.indexOf('--vault');
  if (i !== -1 && argv[i + 1]) return argv[i + 1];
  if (process.env.VAULT) return process.env.VAULT;
  return path.resolve(__dirname, '..');
}

// Reject path separators / traversal / reserved prefix — the name feeds path
// building in resolve(), so this is a security boundary, not just validation.
function validName(n) {
  if (!n) return false;
  if (n.startsWith('_')) return false;
  if (n.startsWith('.')) return false;
  if (n.includes('/') || n.includes('\\')) return false;
  return true;
}

// Pure helpers usable by require()rs (studio-rules-inject) — no process.exit.
function ops(VAULT) {
  const F = path.join(VAULT, '_claude', 'flavours');
  const PTR = path.join(F, 'active');
  const isDir = (p) => { try { return fs.statSync(p).isDirectory(); } catch { return false; } };
  const current = () => {
    let v = '';
    try { v = fs.readFileSync(PTR, 'utf8').replace(/\s+/g, ''); } catch { /* none */ }
    return v || 'none';
  };
  const resolve = () => {
    const c = current();
    if (c === 'none' || !validName(c) || !isDir(path.join(F, c))) return path.join(F, '_neutral');
    return path.join(F, c);
  };
  return { F, PTR, isDir, current, resolve };
}

function main() {
  const argv = process.argv.slice(2).filter((a, idx, arr) =>
    !(a === '--vault' || arr[idx - 1] === '--vault'));
  const VAULT = resolveVault(process.argv.slice(2));
  const { F, PTR, isDir, current, resolve } = ops(VAULT);

  const list = () => {
    let entries;
    try { entries = fs.readdirSync(F, { withFileTypes: true }); } catch { return []; }
    return entries
      .filter((e) => e.isDirectory() && !e.name.startsWith('_'))
      .map((e) => e.name).sort();
  };
  const write = (s) => { fs.mkdirSync(F, { recursive: true }); fs.writeFileSync(PTR, s + '\n'); };

  const use = (n) => {
    if (!validName(n)) { console.log(`Invalid Flavour name: ${n}`); return 1; }
    if (!isDir(path.join(F, n))) {
      console.log(`No such Flavour: ${n}`); console.log('Available:');
      list().forEach((x) => console.log(x)); return 1;
    }
    write(n); console.log(`active → ${n} (takes effect next session, once the loader is active)`); return 0;
  };
  const off = () => { write('none'); console.log('active → none (neutral, next session)'); return 0; };
  const rename = (oldN, newN) => {
    if (!validName(oldN)) { console.log(`Invalid name: ${oldN}`); return 1; }
    if (!validName(newN)) { console.log(`Invalid name: ${newN}`); return 1; }
    if (!isDir(path.join(F, oldN))) { console.log(`No such Flavour: ${oldN}`); return 1; }
    if (fs.existsSync(path.join(F, newN))) { console.log(`Target exists: ${newN}`); return 1; }
    try { fs.renameSync(path.join(F, oldN), path.join(F, newN)); }
    catch { console.log(`rename failed: ${oldN} → ${newN}`); return 1; }
    if (current() === oldN) write(newN);
    console.log(`renamed ${oldN} → ${newN}`); return 0;
  };

  const cmd = argv[0] || 'current';
  let code = 0;
  switch (cmd) {
    case 'list': list().forEach((x) => console.log(x)); break;
    case 'current': console.log(current()); break;
    case 'resolve': console.log(resolve()); break;
    case 'use':
      if (!argv[1]) { console.error('name required'); code = 2; break; }
      code = use(argv[1]); break;
    case 'off': code = off(); break;
    case 'rename':
      if (!argv[1] || !argv[2]) { console.error('old and new name required'); code = 2; break; }
      code = rename(argv[1], argv[2]); break;
    default:
      console.log('usage: flavour.js list|current|resolve|use <name>|off|rename <old> <new>');
      code = 2;
  }
  process.exit(code);
}

module.exports = { ops, validName };
if (require.main === module) main();
