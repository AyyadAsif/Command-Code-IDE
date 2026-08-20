'use strict';

const { spawnSync } = require('child_process');

function git(cwd, args) {
  const r = spawnSync('git', args, {
    cwd,
    encoding: 'utf8',
    timeout: 12000,
    windowsHide: true
  });
  return r;
}

function parsePorcelain(text) {
  const files = [];
  for (const line of String(text || '').split(/\n/)) {
    if (line.length < 4) continue;
    const x = line[0];
    const y = line[1];
    let p = line.slice(3);
    let orig = null;
    if (p.includes(' -> ')) {
      const parts = p.split(' -> ');
      orig = parts[0];
      p = parts[1];
    }
    let status = 'modified';
    if (x === '?' || y === '?') status = 'untracked';
    else if (x === 'A' || y === 'A') status = 'added';
    else if (x === 'D' || y === 'D') status = 'deleted';
    else if (x === 'R' || y === 'R') status = 'renamed';
    else if (x === 'M' || y === 'M') status = 'modified';
    files.push({ path: p.replace(/\\/g, '/'), status, orig, xy: x + y });
  }
  return files;
}

function status(cwd) {
  const r = git(cwd, ['status', '--porcelain=v1', '-b']);
  if (r.status !== 0 && !(r.stdout || '').trim()) {
    return { ok: false, git: false, files: [], branch: null };
  }
  const lines = String(r.stdout || '').split(/\n/);
  let branch = null;
  const body = [];
  for (const line of lines) {
    if (line.startsWith('## ')) {
      branch = line.slice(3).split('...')[0].trim();
    } else if (line.trim()) body.push(line);
  }
  return { ok: true, git: true, branch, files: parsePorcelain(body.join('\n')) };
}

function diff(cwd, file) {
  const args = file ? ['diff', '--', file] : ['diff'];
  const r = git(cwd, args);
  const unstaged = r.stdout || '';
  let extra = '';
  if (file) {
    const u = git(cwd, ['diff', '--cached', '--', file]);
    extra = u.stdout || '';
  }
  return { ok: r.status === 0 || r.status === 1, text: unstaged + extra };
}

module.exports = { status, diff, parsePorcelain };
