// Cross-platform helpers — the single home for every process.platform branch.
// Node stdlib only. Used by every ported tool script.
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');

const isWin = process.platform === 'win32';

// Link a directory cross-platform. On Windows use a junction (no admin rights
// needed, unlike a symlink); elsewhere a normal dir symlink. Idempotent:
// - already a link  -> leave it, report where it points
// - a real dir      -> back it up to <link>.bak, then link
// target must resolve to an absolute path (junctions require it).
function linkDir(target, linkPath) {
  const abs = path.resolve(target);
  fs.mkdirSync(path.dirname(linkPath), { recursive: true });
  const st = fs.lstatSync(linkPath, { throwIfNoEntry: false });
  if (st && st.isSymbolicLink()) {
    return { status: 'exists', to: fs.readlinkSync(linkPath) };
  }
  if (st && st.isDirectory()) {
    fs.renameSync(linkPath, linkPath + '.bak');
    fs.symlinkSync(abs, linkPath, isWin ? 'junction' : 'dir');
    return { status: 'backed-up', to: abs, backup: linkPath + '.bak' };
  }
  fs.symlinkSync(abs, linkPath, isWin ? 'junction' : 'dir');
  return { status: 'created', to: abs };
}

// Source-of-truth read-only lock. On Windows fs.chmod only toggles the read-only attribute
// (the 0o200 write bit is what matters), which is exactly the intent.
function makeReadOnly(p) { fs.chmodSync(p, 0o444); }
function makeWritable(p) { fs.chmodSync(p, 0o644); }
function isWritable(p) {
  try { return (fs.statSync(p).mode & 0o200) !== 0; }
  catch { return false; }
}

// Recursive file walk (replaces `find`). Returns absolute paths of files for
// which filterFn(absPath) is truthy. Missing root -> [].
function walk(dir, filterFn = () => true) {
  const out = [];
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
  catch { return out; }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(full, filterFn));
    else if (e.isFile() && filterFn(full)) out.push(full);
  }
  return out;
}

// Per-day / per-run flag files (replaces /tmp/<name>).
function tmpFlag(name) { return path.join(os.tmpdir(), name); }

// Read all of stdin (for hooks that receive JSON on stdin).
function readStdin() {
  return new Promise((resolve) => {
    let data = '';
    if (process.stdin.isTTY) { resolve(''); return; }
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (c) => { data += c; });
    process.stdin.on('end', () => resolve(data));
    process.stdin.on('error', () => resolve(data));
  });
}

// UTC stamps matching `date -u +%Y-%m-%d` and `date -u +%Y-%m-%dT%H:%M:%S`.
function dateStamp(d = new Date()) { return d.toISOString().slice(0, 10); }
function isoStamp(d = new Date()) { return d.toISOString().slice(0, 19); }

// Local HH:MM matching `date +%H:%M` (session-init's "Vault synced — HH:MM").
function localHM(d = new Date()) {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// ISO week number (matches `date +%W`-ish for the weekly consolidation flag;
// exact GNU %W parity isn't needed — it only keys a once-a-week reminder).
function isoWeek(d = new Date()) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return Math.ceil(((t - yearStart) / 86400000 + 1) / 7);
}

module.exports = {
  isWin, linkDir, makeReadOnly, makeWritable, isWritable,
  walk, tmpFlag, readStdin, dateStamp, isoStamp, localHM, isoWeek,
};
