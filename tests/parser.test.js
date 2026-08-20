'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { parseLine, normalizeEvent, mapExit, parseStderrSessionId } = require('../src/engine/parser');

describe('parser', () => {
  it('parses documented tool_running event', () => {
    const line = JSON.stringify({
      type: 'event',
      event: { type: 'tool_running', toolCallId: 'abc', toolName: 'read_file', description: 'auth.ts' }
    });
    const p = parseLine(line);
    assert.equal(p.kind, 'event');
    const n = normalizeEvent(p);
    assert.equal(n.type, 'ToolStarted');
    assert.equal(n.toolName, 'read_file');
    assert.equal(n.toolCallId, 'abc');
  });

  it('parses documented result line', () => {
    const line = JSON.stringify({
      type: 'result',
      subtype: 'success',
      sessionId: '9f4e1c0a-1111',
      stopReason: 'end_turn',
      usage: { in: 1, out: 2 },
      durationMs: 12,
      finalText: 'hello'
    });
    const n = normalizeEvent(parseLine(line));
    assert.equal(n.type, 'TaskCompleted');
    assert.equal(n.finalText, 'hello');
    assert.equal(n.sessionId, '9f4e1c0a-1111');
  });

  it('treats unknown event types as UnknownEvent, never invents tools', () => {
    const n = normalizeEvent(parseLine(JSON.stringify({ type: 'event', event: { type: 'future_thing' } })));
    assert.equal(n.type, 'UnknownEvent');
    assert.equal(n.eventType, 'future_thing');
  });

  it('skips malformed json as log text', () => {
    const p = parseLine('{not json');
    assert.equal(p.kind, 'text');
  });

  it('maps exit codes', () => {
    assert.equal(mapExit(0).id, 'ok');
    assert.equal(mapExit(3).id, 'auth');
    assert.equal(mapExit(130).id, 'cancelled');
  });

  it('parses session id from stderr verbose', () => {
    assert.equal(parseStderrSessionId('session: 9f4e1c0a-deadbeef'), '9f4e1c0a-deadbeef');
  });

  it('error result without sessionId is valid', () => {
    const n = normalizeEvent(parseLine(JSON.stringify({ type: 'result', subtype: 'error', error: 'auth', finalText: '' })));
    assert.equal(n.type, 'EngineError');
    assert.equal(n.sessionId, null);
  });
});
