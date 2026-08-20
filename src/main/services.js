'use strict';

const path = require('path');
const fs = require('fs');
const os = require('os');
const { spawn } = require('child_process');
const { CommandCodeAdapter } = require('../engine/adapter');
const { buildPrompt, mapSlashToEngine } = require('../engine/context');
const fsService = require('./fs-service');
const git = require('./git');
const store = require('./store');
const { Logger, logsDir } = require('./logger');
const { isWin } = require('../engine/discover');

function createServices() {
  const log = new Logger();
  const adapter = new CommandCodeAdapter();
  let state = store.load();
  adapter.allowYolo = !!state.engine.allowYolo;

  const runtime = {
    workspace: state.lastWorkspace || null,
    sessions: [],
    activeSessionId: state.lastSessionId || null,
    models: [],
    engineStatus: 'disconnected',
    currentRun: null,
    snapshots: new Map(),
    watchers: [],
    broadcast: () => {}
  };

  function persist() {
    state.lastWorkspace = runtime.workspace;
    state.lastSessionId = runtime.activeSessionId;
    store.save(state);
  }

  function detect() {
    const d = adapter.detectInstallation(state.engine.extraBin || undefined);
    if (!d.ok) {
      runtime.engineStatus = 'missing';
      return { ...d, version: null, capabilities: null };
    }
    const version = adapter.getVersion();
    const capabilities = adapter.getCapabilities();
    runtime.engineStatus = capabilities.outputFormatJson ? 'ready' : 'incompatible';
    log.info('detected', { path: d.path, version: version.version, status: runtime.engineStatus });
    return { ...d, version: version.version, capabilities, status: runtime.engineStatus };
  }

  async function refreshModels() {
    if (!adapter.bin || !runtime.workspace) {
      runtime.models = [];
      return runtime.models;
    }
    try {
      runtime.models = await adapter.listModels(runtime.workspace);
    } catch (err) {
      log.warn('listModels failed', err.message);
      runtime.models = [];
    }
    return runtime.models;
  }

  function refreshSessions() {
    if (!runtime.workspace) {
      runtime.sessions = [];
      return [];
    }
    runtime.sessions = adapter.getSessions(runtime.workspace).map((s) => ({
      ...s,
      title: state.sessionAliases[s.id] || s.title
    }));
    return runtime.sessions;
  }

  function openWorkspace(folder) {
    if (!folder || !fs.existsSync(folder)) throw new Error('Folder not found');
    runtime.workspace = path.resolve(folder);
    store.touchRecent(state, runtime.workspace);
    persist();
    refreshSessions();
    startWatch();
    runtime.engineStatus = adapter.bin ? 'ready' : 'missing';
    return { workspace: runtime.workspace };
  }

  function startWatch() {
    stopWatch();
    if (!runtime.workspace) return;
    try {
      const w = fs.watch(runtime.workspace, { recursive: true }, (_ev, filename) => {
        if (!filename) return;
        const n = String(filename).replace(/\\/g, '/');
        if (n.includes('node_modules') || n.includes('.git/')) return;
        runtime.broadcast('fs:change', { filename: n });
      });
      runtime.watchers.push(w);
    } catch (err) {
      log.warn('watch failed', err.message);
    }
  }

  function stopWatch() {
    for (const w of runtime.watchers) {
      try { w.close(); } catch { /* */ }
    }
    runtime.watchers = [];
  }

  function snapshotFile(relOrAbs) {
    if (!runtime.workspace) return;
    const full = path.isAbsolute(relOrAbs) ? relOrAbs : path.join(runtime.workspace, relOrAbs);
    try {
      if (!fsService.isInside(runtime.workspace, full)) return;
      const st = fs.statSync(full);
      if (!st.isFile() || st.size > 1_500_000) return;
      runtime.snapshots.set(full, fs.readFileSync(full, 'utf8'));
    } catch { /* */ }
  }

  function composeAndSend({ text, mentions, activeFile, selection, includeActive, includeSelection, sessionId, fork, model, permissionMode }) {
    if (!runtime.workspace) throw new Error('Open a folder first');
    if (runtime.currentRun) throw new Error('Command Code is already working. Stop it first.');

    const mapped = mapSlashToEngine(text, { permissionMode });
    if (mapped.kind === 'new-session') {
      runtime.activeSessionId = null;
      persist();
      return { kind: 'new-session' };
    }
    if (mapped.kind === 'set-mode') {
      state.engine.permissionMode = mapped.mode;
      persist();
      if (!mapped.prompt) return { kind: 'set-mode', mode: mapped.mode };
      text = mapped.prompt;
    }
    if (mapped.kind === 'set-model') {
      return { kind: 'set-model', model: mapped.model };
    }
    if (mapped.kind === 'fork') fork = true;

    const built = buildPrompt({
      text: mapped.kind === 'prompt' ? mapped.prompt : text,
      mentions,
      activeFile,
      selection,
      includeActive,
      includeSelection
    });

    const mode = permissionMode || state.engine.permissionMode || 'auto-accept';
    const runModel = model || undefined;
    const resumeId = fork ? (sessionId || runtime.activeSessionId) : (sessionId || runtime.activeSessionId);

    runtime.engineStatus = 'working';
    runtime.broadcast('engine:status', { status: 'working' });

    const run = adapter.sendPrompt({
      cwd: runtime.workspace,
      prompt: built.prompt,
      resumeId: resumeId || undefined,
      fork: !!fork,
      model: runModel,
      permissionMode: mode === 'bypass' ? 'bypass' : mode,
      verbose: !!state.engine.verbose,
      effort: state.engine.effort || undefined,
      onEvent: (ev) => {
        if (ev.sessionId) {
          runtime.activeSessionId = ev.sessionId;
          persist();
        }
        if (ev.type === 'TaskCompleted' && ev.sessionId) {
          runtime.activeSessionId = ev.sessionId;
          persist();
        }
        runtime.broadcast('agent:event', ev);
      },
      onLog: (line) => runtime.broadcast('agent:log', line),
      onClose: (info) => {
        runtime.currentRun = null;
        if (info.result && info.result.sessionId) {
          runtime.activeSessionId = info.result.sessionId;
          persist();
        }
        runtime.engineStatus = adapter.bin ? 'ready' : 'missing';
        if (info.mapped && info.mapped.id === 'cancelled') runtime.engineStatus = 'ready';
        if (info.code && info.code !== 0 && info.code !== 130) runtime.engineStatus = 'error';
        refreshSessions();
        runtime.broadcast('agent:done', {
          code: info.code,
          mapped: info.mapped,
          sessionId: (info.result && info.result.sessionId) || runtime.activeSessionId,
          result: info.result
        });
        runtime.broadcast('engine:status', { status: runtime.engineStatus });
      }
    });
    runtime.currentRun = run;
    return { kind: 'started', runId: run.id, sent: built.sent, prompt: built.prompt, resumeId: resumeId || null, fork: !!fork };
  }

  function cancel() {
    if (runtime.currentRun) runtime.currentRun.cancel();
    adapter.cancelAll();
  }

  function runLogin() {
    if (!adapter.bin) throw new Error('Command Code is not installed');
    const bin = adapter.bin;
    if (isWin()) {
      spawn('cmd.exe', ['/c', 'start', 'Command Code Login', bin, 'login'], { detached: true, stdio: 'ignore', windowsHide: false });
    } else {
      const term = process.env.TERMINAL || 'xterm';
      try {
        spawn(term, ['-e', bin, 'login'], { detached: true, stdio: 'ignore' }).unref();
      } catch {
        spawn(bin, ['login'], { detached: true, stdio: 'inherit' }).unref();
      }
    }
    return { ok: true };
  }

  async function handlers() {
    return {
      'app:state': async () => ({
        workspace: runtime.workspace,
        engineStatus: runtime.engineStatus,
        activeSessionId: runtime.activeSessionId,
        settings: state,
        bin: adapter.bin,
        version: adapter.version,
        capabilities: adapter.capabilities,
        busy: !!runtime.currentRun
      }),
      'engine:detect': async () => detect(),
      'engine:status': async () => {
        const st = await adapter.getStatus(runtime.workspace || os.homedir());
        const me = await adapter.whoami(runtime.workspace || os.homedir());
        return { ...st, whoami: me.stdout && me.stdout.trim() };
      },
      'engine:models': async () => refreshModels(),
      'engine:restart': async () => {
        cancel();
        return detect();
      },
      'engine:cli': async (args) => adapter.cli(args.args || args, runtime.workspace || os.homedir(), args.timeoutMs),
      'engine:login': async () => runLogin(),
      'engine:logout': async () => adapter.cli(['logout'], runtime.workspace || os.homedir()),
      'engine:update-check': async () => adapter.cli(['update', '--check-only'], runtime.workspace || os.homedir()),
      'workspace:open': async ({ path: p }) => openWorkspace(p),
      'workspace:tree': async () => runtime.workspace ? fsService.listTree(runtime.workspace) : [],
      'workspace:searchFiles': async ({ query }) => runtime.workspace ? fsService.searchFiles(runtime.workspace, query) : [],
      'workspace:grep': async ({ query }) => runtime.workspace ? fsService.grep(runtime.workspace, query) : [],
      'file:read': async ({ path: p }) => fsService.readFileSafe(runtime.workspace, p),
      'file:write': async ({ path: p, text }) => fsService.writeFileSafe(runtime.workspace, p, text),
      'file:create': async ({ path: p }) => fsService.createFile(runtime.workspace, p),
      'file:mkdir': async ({ path: p }) => fsService.createDir(runtime.workspace, p),
      'file:rename': async ({ from, to }) => fsService.renameSafe(runtime.workspace, from, to),
      'file:delete': async ({ path: p }) => fsService.deleteSafe(runtime.workspace, p),
      'git:status': async () => runtime.workspace ? git.status(runtime.workspace) : { git: false, files: [] },
      'git:diff': async ({ path: p }) => runtime.workspace ? git.diff(runtime.workspace, p) : { text: '' },
      'sessions:list': async () => refreshSessions(),
      'sessions:messages': async ({ path: p, id }) => {
        const s = runtime.sessions.find((x) => x.id === id) || adapter.getSessions(runtime.workspace).find((x) => x.id === id);
        const file = p || (s && s.path);
        if (!file) return { ok: false, messages: [] };
        return adapter.getSessionMessages(file);
      },
      'sessions:select': async ({ id }) => {
        runtime.activeSessionId = id || null;
        persist();
        return { id: runtime.activeSessionId };
      },
      'sessions:alias': async ({ id, title }) => {
        if (id) state.sessionAliases[id] = title;
        persist();
        return { ok: true };
      },
      'sessions:new': async () => {
        runtime.activeSessionId = null;
        persist();
        return { ok: true };
      },
      'agent:send': async (payload) => composeAndSend(payload),
      'agent:cancel': async () => { cancel(); return { ok: true }; },
      'context:preview': async (payload) => buildPrompt(payload),
      'slash:list': async () => adapter.getCustomCommands(runtime.workspace),
      'plans:list': async () => adapter.getPlans(),
      'cc:config': async () => adapter.getConfig(),
      'settings:get': async () => state,
      'settings:set': async (patch) => {
        state = { ...state, ...patch, editor: { ...state.editor, ...(patch.editor || {}) }, chat: { ...state.chat, ...(patch.chat || {}) }, engine: { ...state.engine, ...(patch.engine || {}) }, layout: { ...state.layout, ...(patch.layout || {}) } };
        adapter.allowYolo = !!state.engine.allowYolo;
        persist();
        return state;
      },
      'logs:dir': async () => logsDir(),
      'logs:recent': async () => log.lines.slice(-200),
      'shell:run': async ({ command }) => {
        if (!runtime.workspace) throw new Error('No workspace');
        const r = require('child_process').spawnSync(command, {
          cwd: runtime.workspace,
          encoding: 'utf8',
          timeout: 30000,
          shell: true,
          windowsHide: true
        });
        return { code: r.status, stdout: r.stdout || '', stderr: r.stderr || '' };
      },
      'reveal': async ({ path: p }) => {
        if (isWin()) spawn('explorer.exe', ['/select,', p], { detached: true, stdio: 'ignore' });
        else spawn('xdg-open', [path.dirname(p)], { detached: true, stdio: 'ignore' });
        return { ok: true };
      },
      'open-external': async ({ path: p }) => {
        try {
          const { shell } = require('electron');
          if (shell && shell.openPath) {
            await shell.openPath(p);
            return { ok: true };
          }
        } catch { /* preview mode */ }
        spawn(isWin() ? 'explorer.exe' : 'xdg-open', [p], { detached: true, stdio: 'ignore' });
        return { ok: true };
      }
    };
  }

  return {
    log,
    adapter,
    runtime,
    detect,
    persist,
    handlers,
    stopWatch,
    getState: () => state
  };
}

module.exports = { createServices };
