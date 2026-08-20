'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { buildPrompt, mapSlashToEngine } = require('../src/engine/context');

describe('context', () => {
  it('only includes chips that are enabled', () => {
    const built = buildPrompt({
      text: 'fix this',
      includeActive: true,
      includeSelection: false,
      activeFile: { relpath: 'src/auth.ts' },
      selection: { text: 'nope', relpath: 'src/auth.ts', startLine: 1, endLine: 4 },
      mentions: [{ relpath: 'src/a.ts' }]
    });
    assert.match(built.prompt, /@src\/auth\.ts/);
    assert.match(built.prompt, /@src\/a\.ts/);
    assert.doesNotMatch(built.prompt, /Selected lines/);
    assert.equal(built.sent.activeFile, 'src/auth.ts');
    assert.equal(built.sent.selection, null);
  });

  it('maps /clear to new session rather than a fake local wipe only', () => {
    assert.equal(mapSlashToEngine('/clear').kind, 'new-session');
    assert.equal(mapSlashToEngine('/init').kind, 'prompt');
    assert.equal(mapSlashToEngine('/init').prompt, '/init');
  });
});
