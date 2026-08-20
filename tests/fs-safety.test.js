'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { assertInside, writeFileSafe } = require('../src/main/fs-service');

describe('fs safety', () => {
  it('rejects path traversal', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-'));
    assert.throws(() => assertInside(root, path.join(root, '..', 'outside.txt')));
    assert.throws(() => writeFileSafe(root, path.join(root, '..', 'outside.txt'), 'x'));
  });
});
