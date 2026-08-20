'use strict';

const { PERMISSION_MODES } = require('../shared/constants');

function buildPrintArgs(options = {}) {
  const args = ['-p', '--output-format', 'json', '--skip-onboarding'];
  if (options.trust !== false) args.push('--trust');
  if (options.verbose) args.push('--verbose');
  if (options.name) args.push('-n', String(options.name));
  if (options.model) args.push('-m', String(options.model));
  if (options.effort) args.push('--effort', String(options.effort));
  if (options.maxTurns) args.push('--max-turns', String(options.maxTurns));

  const mode = options.permissionMode || 'auto-accept';
  if (options.yolo) {
    args.push('--yolo');
  } else if (mode === 'plan') {
    args.push('--permission-mode', 'plan');
  } else if (mode === 'auto-accept') {
    args.push('--auto-accept');
  } else if (mode === 'dont-ask') {
    args.push('--permission-mode', 'dont-ask');
  } else if (mode === 'default') {
    args.push('--permission-mode', 'default');
  } else if (PERMISSION_MODES.includes(mode)) {
    args.push('--permission-mode', mode);
  } else {
    args.push('--auto-accept');
  }

  if (Array.isArray(options.addDirs)) {
    for (const d of options.addDirs) {
      if (d) args.push('--add-dir', d);
    }
  }

  if (options.fork && (options.resumeId || options.continueLatest)) {
    args.push('--fork-session');
  }
  if (options.resumeId) {
    args.push('--resume', String(options.resumeId));
  } else if (options.continueLatest) {
    args.push('--continue');
  }
  if (options.sessionPath) {
    args.push('--session', String(options.sessionPath));
  }

  const prompt = options.prompt == null ? '' : String(options.prompt);
  args.push(prompt);
  return args;
}

function assertSafeOptions(options = {}) {
  if (options.yolo && !options.allowYolo) {
    throw new Error('Bypass (--yolo) is disabled. Enable it in Settings → Security.');
  }
}

module.exports = { buildPrintArgs, assertSafeOptions };
