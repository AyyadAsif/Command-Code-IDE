'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('child_process');
const path = require('path');
const readline = require('readline');
const { parseLine, normalizeEvent } = require('../src/engine/parser');

describe('mock stream', () => {
  it('emits only real events from the mock CLI', async () => {
    const child = spawn(process.execPath, [path.join(__dirname, 'fixtures', 'mock-cmdc.js'), '-p', '--output-format', 'json', 'hello'], {
      stdio: ['ignore', 'pipe', 'pipe']
    });
    const events = [];
    const rl = readline.createInterface({ input: child.stdout });
    rl.on('line', (line) => {
      events.push(normalizeEvent(parseLine(line)));
    });
    const code = await new Promise((resolve) => child.on('close', resolve));
    assert.equal(code, 0);
    assert.equal(events[0].type, 'ToolStarted');
    assert.equal(events[0].toolName, 'read_file');
    const done = events.find((e) => e.type === 'TaskCompleted');
    assert.ok(done);
    assert.equal(done.finalText, 'Project has a README.');
    assert.ok(!events.some((e) => e && e.invented));
  });
});
