'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { parseTranscript, listSessions, summarizeEntry } = require('../src/engine/sessions');

describe('sessions', () => {
  it('skips corrupt lines and reads header', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ccide-'));
    const file = path.join(dir, 'sess.jsonl');
    fs.writeFileSync(file, [
      JSON.stringify({ id: 's1', cwd: '/tmp/proj', createdAt: '2026-01-01' }),
      '{bad',
      JSON.stringify({ role: 'user', text: 'hello' }),
      JSON.stringify({ role: 'assistant', text: 'hi' })
    ].join('\n'));
    const p = parseTranscript(file);
    assert.equal(p.header.id, 's1');
    assert.equal(p.entries.length, 2);
    assert.equal(summarizeEntry(p.entries[0]).role, 'user');
  });

  it('lists sessions for matching cwd only', () => {
    const home = fs.mkdtempSync(path.join(os.tmpdir(), 'cchome-'));
    const proj = path.join(home, 'projects', 'slug');
    fs.mkdirSync(proj, { recursive: true });
    const ws = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-'));
    fs.writeFileSync(path.join(proj, 'aaa.jsonl'), JSON.stringify({ id: 'aaa', cwd: ws }) + '\n' + JSON.stringify({ role: 'user', text: 'n' }) + '\n');
    fs.writeFileSync(path.join(proj, 'bbb.jsonl'), JSON.stringify({ id: 'bbb', cwd: '/other' }) + '\n');
    const list = listSessions(ws, home);
    assert.equal(list.length, 1);
    assert.equal(list[0].id, 'aaa');
    const before = fs.readFileSync(path.join(proj, 'aaa.jsonl'), 'utf8');
    listSessions(ws, home);
    const after = fs.readFileSync(path.join(proj, 'aaa.jsonl'), 'utf8');
    assert.equal(before, after);
  });
});
