'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { listCustomCommands } = require('../src/engine/sessions');

describe('slash discovery', () => {
  it('finds project and user command markdown files', () => {
    const home = fs.mkdtempSync(path.join(os.tmpdir(), 'home-'));
    const ws = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-'));
    fs.mkdirSync(path.join(ws, '.commandcode', 'commands'), { recursive: true });
    fs.mkdirSync(path.join(home, 'commands'), { recursive: true });
    fs.writeFileSync(path.join(ws, '.commandcode', 'commands', 'test.md'), 'Generate tests');
    fs.writeFileSync(path.join(home, 'commands', 'understand.md'), 'Onboard me');
    const cmds = listCustomCommands(ws, home);
    assert.ok(cmds.some((c) => c.name === 'test' && c.scope === 'project'));
    assert.ok(cmds.some((c) => c.name === 'understand' && c.scope === 'user'));
  });
});
