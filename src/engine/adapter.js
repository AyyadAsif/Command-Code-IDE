'use strict';

const { detectInstallation, getVersion, getCapabilities } = require('./discover');
const { buildPrintArgs, assertSafeOptions } = require('./argv');
const { spawnCommandCode, runOnce } = require('./process');
const { parseModelList } = require('./models');
const {
  commandCodeHome,
  listSessions,
  getSessionMessages,
  listCustomCommands,
  listPlans,
  readConfig,
  listCheckpoints
} = require('./sessions');

class CommandCodeAdapter {
  constructor() {
    this.bin = null;
    this.version = null;
    this.capabilities = null;
    this.runs = new Map();
    this.allowYolo = false;
  }

  detectInstallation(explicit) {
    const d = detectInstallation(explicit);
    this.bin = d.path;
    return d;
  }

  getVersion() {
    const v = getVersion(this.bin);
    this.version = v.version;
    return v;
  }

  getCapabilities() {
    this.capabilities = getCapabilities(this.bin);
    return this.capabilities;
  }

  async getStatus(cwd) {
    if (!this.bin) return { ok: false, error: 'Command Code is not installed' };
    const r = await runOnce({ bin: this.bin, args: ['status', '--json'], cwd, timeoutMs: 20000 });
    if (r.stdout.trim()) {
      try {
        return { ok: true, status: JSON.parse(r.stdout.trim().split('\n')[0]), raw: r };
      } catch {
        return { ok: r.ok, status: { text: r.stdout.trim() }, raw: r };
      }
    }
    return { ok: r.ok, status: { text: (r.stdout || r.stderr || '').trim() }, raw: r };
  }

  async whoami(cwd) {
    if (!this.bin) return { ok: false };
    return runOnce({ bin: this.bin, args: ['whoami'], cwd, timeoutMs: 15000 });
  }

  async listModels(cwd) {
    if (!this.bin) return [];
    const r = await runOnce({ bin: this.bin, args: ['--list-models'], cwd, timeoutMs: 25000 });
    return parseModelList(r.stdout || r.stderr || '');
  }

  async info(cwd) {
    if (!this.bin) return { ok: false };
    return runOnce({ bin: this.bin, args: ['info', '--text'], cwd, timeoutMs: 20000 });
  }

  async cli(args, cwd, timeoutMs = 30000) {
    if (!this.bin) return { ok: false, error: 'missing cli' };
    return runOnce({ bin: this.bin, args, cwd, timeoutMs });
  }

  getSessions(workspace) {
    return listSessions(workspace, commandCodeHome());
  }

  getSessionMessages(filePath) {
    return getSessionMessages(filePath);
  }

  getCustomCommands(workspace) {
    return listCustomCommands(workspace, commandCodeHome());
  }

  getPlans() {
    return listPlans(commandCodeHome());
  }

  getConfig() {
    return readConfig(commandCodeHome());
  }

  getCheckpoints(sessionFile) {
    return listCheckpoints(sessionFile);
  }

  sendPrompt({ cwd, prompt, resumeId, fork, continueLatest, model, permissionMode, name, addDirs, effort, verbose, onEvent, onLog, onClose }) {
    if (!this.bin) {
      const err = { type: 'EngineError', error: 'Command Code executable not found' };
      if (onEvent) onEvent(err);
      if (onClose) onClose({ code: 1, mapped: { id: 'error', message: err.error } });
      return { id: 'none', cancel() {} };
    }
    const options = {
      prompt,
      resumeId,
      fork,
      continueLatest,
      model,
      permissionMode,
      name,
      addDirs,
      effort,
      verbose,
      yolo: this.allowYolo && permissionMode === 'bypass',
      allowYolo: this.allowYolo,
      trust: true
    };
    assertSafeOptions(options);
    const args = buildPrintArgs(options);
    const run = spawnCommandCode({
      bin: this.bin,
      args,
      cwd,
      onEvent,
      onLog,
      onClose: (info) => {
        this.runs.delete(run.id);
        if (onClose) onClose(info);
      }
    });
    this.runs.set(run.id, run);
    return run;
  }

  cancel(runId) {
    if (runId) {
      const r = this.runs.get(runId);
      if (r) r.cancel();
      return;
    }
    for (const r of this.runs.values()) r.cancel();
  }

  cancelAll() {
    this.cancel();
  }
}

module.exports = { CommandCodeAdapter };
