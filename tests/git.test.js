'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { parsePorcelain } = require('../src/main/git');

describe('git', () => {
  it('parses porcelain statuses', () => {
    const files = parsePorcelain(' M src/a.ts\nA  src/b.ts\n?? c.md\n D gone.ts\n');
    const by = Object.fromEntries(files.map((f) => [f.path, f.status]));
    assert.equal(by['src/a.ts'], 'modified');
    assert.equal(by['src/b.ts'], 'added');
    assert.equal(by['c.md'], 'untracked');
    assert.equal(by['gone.ts'], 'deleted');
  });
});
