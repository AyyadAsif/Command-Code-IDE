'use strict';

const fs = require('fs');
const path = require('path');
const { DEFAULT_IGNORES } = require('../shared/constants');

function isInside(root, target) {
  const r = path.resolve(root);
  const t = path.resolve(target);
  const rel = path.relative(r, t);
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}

function assertInside(root, target) {
  if (!root) throw new Error('No workspace open');
  if (!isInside(root, target)) throw new Error('Path is outside the workspace');
}

function loadGitignore(root) {
  const extra = new Set();
  try {
    const text = fs.readFileSync(path.join(root, '.gitignore'), 'utf8');
    for (const line of text.split(/\n/)) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      extra.add(t.replace(/\/$/, '').replace(/^\//, ''));
    }
  } catch { /* none */ }
  return extra;
}

function shouldIgnore(name, gitignore) {
  if (DEFAULT_IGNORES.has(name)) return true;
  if (gitignore && gitignore.has(name)) return true;
  return false;
}

function listTree(root, { maxEntries = 4000 } = {}) {
  const gitignore = loadGitignore(root);
  const result = [];
  let count = 0;
  function walk(dir, rel) {
    if (count >= maxEntries) return;
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    entries.sort((a, b) => {
      if (a.isDirectory() && !b.isDirectory()) return -1;
      if (!a.isDirectory() && b.isDirectory()) return 1;
      return a.name.localeCompare(b.name);
    });
    for (const e of entries) {
      if (shouldIgnore(e.name, gitignore)) continue;
      if (e.name.startsWith('.') && e.name !== '.commandcode' && e.name !== '.gitignore') {
        // include hidden only one level for config; skip deep junk
        if (e.isDirectory() && e.name !== '.commandcode') continue;
      }
      const childRel = rel ? `${rel}/${e.name}` : e.name;
      const full = path.join(dir, e.name);
      count += 1;
      if (e.isDirectory()) {
        result.push({ type: 'dir', name: e.name, rel: childRel, path: full });
        walk(full, childRel);
      } else if (e.isFile()) {
        result.push({ type: 'file', name: e.name, rel: childRel, path: full });
      }
      if (count >= maxEntries) return;
    }
  }
  walk(root, '');
  return result;
}

function readFileSafe(root, target, { maxBytes = 2_000_000 } = {}) {
  assertInside(root, target);
  const st = fs.statSync(target);
  if (st.size > maxBytes) {
    return { ok: false, error: 'File is too large to open in the editor', size: st.size };
  }
  const buf = fs.readFileSync(target);
  const isBinary = buf.includes(0);
  if (isBinary) return { ok: false, error: 'Binary file', size: st.size };
  return { ok: true, text: buf.toString('utf8'), size: st.size, mtime: st.mtimeMs };
}

function writeFileSafe(root, target, text) {
  assertInside(root, target);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, text, 'utf8');
  return { ok: true };
}

function createFile(root, target) {
  assertInside(root, target);
  if (fs.existsSync(target)) throw new Error('Already exists');
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, '', 'utf8');
  return { ok: true };
}

function createDir(root, target) {
  assertInside(root, target);
  fs.mkdirSync(target, { recursive: true });
  return { ok: true };
}

function renameSafe(root, from, to) {
  assertInside(root, from);
  assertInside(root, to);
  fs.renameSync(from, to);
  return { ok: true };
}

function deleteSafe(root, target) {
  assertInside(root, target);
  const st = fs.lstatSync(target);
  if (st.isDirectory()) fs.rmSync(target, { recursive: true, force: false });
  else fs.unlinkSync(target);
  return { ok: true };
}

function searchFiles(root, query, { max = 80 } = {}) {
  const q = String(query || '').toLowerCase();
  if (!q) return [];
  const tree = listTree(root, { maxEntries: 8000 });
  const hits = [];
  for (const item of tree) {
    if (item.type !== 'file') continue;
    if (item.rel.toLowerCase().includes(q) || item.name.toLowerCase().includes(q)) {
      hits.push(item);
      if (hits.length >= max) break;
    }
  }
  return hits;
}

function grep(root, query, { max = 100 } = {}) {
  const q = String(query || '');
  if (!q || q.length < 2) return [];
  const tree = listTree(root, { maxEntries: 3000 });
  const hits = [];
  const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  for (const item of tree) {
    if (item.type !== 'file') continue;
    if (!/\.(js|ts|tsx|jsx|py|go|rs|java|kt|c|h|cpp|cs|md|json|yml|yaml|css|html|vue|rb|php|sh|txt)$/i.test(item.name)) continue;
    let text;
    try {
      const st = fs.statSync(item.path);
      if (st.size > 400000) continue;
      text = fs.readFileSync(item.path, 'utf8');
    } catch { continue; }
    const lines = text.split(/\n/);
    for (let i = 0; i < lines.length; i++) {
      if (re.test(lines[i])) {
        hits.push({ path: item.path, rel: item.rel, line: i + 1, preview: lines[i].slice(0, 200) });
        if (hits.length >= max) return hits;
      }
    }
  }
  return hits;
}

module.exports = {
  isInside,
  assertInside,
  listTree,
  readFileSafe,
  writeFileSafe,
  createFile,
  createDir,
  renameSafe,
  deleteSafe,
  searchFiles,
  grep
};
