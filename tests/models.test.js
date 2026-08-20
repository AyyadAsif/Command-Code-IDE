'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { parseModelList } = require('../src/engine/models');

describe('models', () => {
  it('extracts ids from mixed list output', () => {
    const text = `Available models\n------------\ngoogle/gemini-3.7-flash\nclaude-sonnet-4-6\nkimi-k2.5 extra words\n`;
    const models = parseModelList(text);
    const ids = models.map((m) => m.id);
    assert.ok(ids.includes('google/gemini-3.7-flash'));
    assert.ok(ids.includes('claude-sonnet-4-6'));
  });
});
