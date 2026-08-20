'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { buildPrintArgs, assertSafeOptions } = require('../src/engine/argv');

describe('argv builder', () => {
  it('always uses print + json + skip onboarding', () => {
    const a = buildPrintArgs({ prompt: 'hi', permissionMode: 'auto-accept' });
    assert.ok(a.includes('-p'));
    assert.ok(a.includes('--output-format'));
    assert.ok(a.includes('json'));
    assert.ok(a.includes('--skip-onboarding'));
    assert.equal(a[a.length - 1], 'hi');
  });

  it('never adds yolo by default', () => {
    const a = buildPrintArgs({ prompt: 'x' });
    assert.ok(!a.includes('--yolo'));
    assert.ok(a.includes('--auto-accept'));
  });

  it('maps plan and resume/fork', () => {
    const a = buildPrintArgs({ prompt: 'x', permissionMode: 'plan', resumeId: 'abc', fork: true });
    assert.ok(a.includes('--permission-mode'));
    assert.ok(a.includes('plan'));
    assert.ok(a.includes('--resume'));
    assert.ok(a.includes('abc'));
    assert.ok(a.includes('--fork-session'));
  });

  it('passes model as -m', () => {
    const a = buildPrintArgs({ prompt: 'x', model: 'kimi-k2.5' });
    assert.ok(a.includes('-m'));
    assert.ok(a.includes('kimi-k2.5'));
  });

  it('blocks yolo unless allowYolo', () => {
    assert.throws(() => assertSafeOptions({ yolo: true, allowYolo: false }));
    assert.doesNotThrow(() => assertSafeOptions({ yolo: true, allowYolo: true }));
  });
});
