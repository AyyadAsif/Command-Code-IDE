'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { candidateNames, isWin } = require('../src/engine/discover');

describe('discover', () => {
  it('windows candidates never include cmd.exe', () => {
    const names = candidateNames();
    if (isWin()) {
      assert.ok(names.every((n) => n.toLowerCase() !== 'cmd' && n.toLowerCase() !== 'cmd.exe'));
      assert.ok(names.some((n) => n.startsWith('cmdc') || n.startsWith('command-code')));
    } else {
      assert.ok(names.includes('command-code'));
    }
  });
});
