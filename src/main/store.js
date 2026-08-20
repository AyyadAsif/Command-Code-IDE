'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

function storePath() {
  const dir = process.env.COMMAND_CODE_IDE_HOME || path.join(os.homedir(), '.commandcode-ide');
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, 'state.json');
}

const DEFAULTS = {
  theme: 'midnight',
  recentProjects: [],
  layout: { explorerWidth: 260, chatWidth: 380, explorer: true, chat: true, terminal: false, output: false },
  editor: { fontSize: 14, tabSize: 2, wordWrap: true, minimap: false, autosave: true },
  chat: { fontSize: 13, compactTools: true, showTechnical: false },
  engine: { permissionMode: 'auto-accept', effort: '', verbose: false, allowYolo: false, extraBin: '' },
  drafts: {},
  lastWorkspace: null,
  lastSessionId: null,
  sessionAliases: {},
  startup: 'welcome'
};

function load() {
  try {
    const raw = JSON.parse(fs.readFileSync(storePath(), 'utf8'));
    return { ...DEFAULTS, ...raw, editor: { ...DEFAULTS.editor, ...(raw.editor || {}) }, chat: { ...DEFAULTS.chat, ...(raw.chat || {}) }, engine: { ...DEFAULTS.engine, ...(raw.engine || {}) }, layout: { ...DEFAULTS.layout, ...(raw.layout || {}) } };
  } catch {
    return { ...DEFAULTS, editor: { ...DEFAULTS.editor }, chat: { ...DEFAULTS.chat }, engine: { ...DEFAULTS.engine }, layout: { ...DEFAULTS.layout }, recentProjects: [] };
  }
}

function save(state) {
  fs.writeFileSync(storePath(), JSON.stringify(state, null, 2), { mode: 0o600 });
}

function touchRecent(state, folder) {
  const name = path.basename(folder);
  const next = [{ path: folder, name, lastOpened: Date.now() }, ...state.recentProjects.filter((p) => p.path !== folder)].slice(0, 20);
  state.recentProjects = next;
  state.lastWorkspace = folder;
}

module.exports = { load, save, touchRecent, storePath, DEFAULTS };
