'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

function commandCodeHome() {
  return process.env.COMMANDCODE_HOME || path.join(os.homedir(), '.commandcode');
}

function normalizePath(p) {
  try {
    return fs.realpathSync(p);
  } catch {
    return path.resolve(p);
  }
}

function pathsEqual(a, b) {
  const na = normalizePath(a).replace(/\\/g, '/').replace(/\/$/, '').toLowerCase();
  const nb = normalizePath(b).replace(/\\/g, '/').replace(/\/$/, '').toLowerCase();
  return na === nb;
}

function readJsonSilent(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function parseTranscript(filePath, { maxEntries = 4000 } = {}) {
  let text;
  try {
    text = fs.readFileSync(filePath, 'utf8');
  } catch (err) {
    return { ok: false, error: err.message, header: null, entries: [] };
  }
  const lines = text.split(/\n/);
  let header = null;
  const entries = [];
  for (const line of lines) {
    if (!line.trim()) continue;
    let obj;
    try {
      obj = JSON.parse(line);
    } catch {
      continue; // torn/corrupt lines skipped — official durability rule
    }
    if (!header) {
      header = obj;
      continue;
    }
    entries.push(obj);
    if (entries.length >= maxEntries) break;
  }
  return { ok: true, header, entries, path: filePath };
}

function summarizeEntry(obj) {
  if (!obj || typeof obj !== 'object') return null;

  // Current Command Code transcripts wrap chat turns in a `message` entry:
  // { type: "message", message: { role, content } }. Older releases stored
  // role/content directly. Normalize both without depending on private fields.
  const message = obj.message && typeof obj.message === 'object' ? obj.message : obj;
  const role = message.role || obj.role || obj.type || obj.kind;
  if (role === 'user') {
    return { role: 'user', text: String(extractText(message) || ''), rawType: obj.type || role };
  }
  if (role === 'assistant') {
    return { role: 'assistant', text: String(extractText(message) || ''), rawType: obj.type || role };
  }

  const tool = message.toolName || message.tool_name || obj.toolName || obj.tool_name;
  if (tool || role === 'tool' || role === 'tool_result') {
    return {
      role: 'tool',
      toolName: tool || 'tool',
      description: message.description || obj.description || message.summary || obj.summary || '',
      rawType: obj.type || role || 'tool'
    };
  }
  const text = extractText(message) || extractText(obj);
  if (text) return { role: 'entry', text: String(text), rawType: obj.type || 'entry' };
  return { role: 'entry', text: '', rawType: obj.type || 'entry', opaque: true };
}

function extractText(obj) {
  if (typeof obj.text === 'string') return obj.text;
  if (typeof obj.content === 'string') return obj.content;
  if (Array.isArray(obj.content)) {
    return obj.content.map((p) => (typeof p === 'string' ? p : p && (p.text || p.content) || '')).join('');
  }
  if (obj.message && typeof obj.message === 'object') return extractText(obj.message);
  return '';
}

function sessionIdFromFile(file) {
  return path.basename(file, '.jsonl');
}

function listSessionFiles(home = commandCodeHome()) {
  const root = path.join(home, 'projects');
  const out = [];
  if (!fs.existsSync(root)) return out;
  let projects = [];
  try {
    projects = fs.readdirSync(root, { withFileTypes: true }).filter((d) => d.isDirectory());
  } catch {
    return out;
  }
  for (const proj of projects) {
    const dir = path.join(root, proj.name);
    let files = [];
    try {
      files = fs.readdirSync(dir).filter((f) => f.endsWith('.jsonl') && !f.includes('.checkpoints') && !f.includes('.prompts'));
    } catch {
      continue;
    }
    for (const f of files) {
      out.push(path.join(dir, f));
    }
  }
  return out;
}

function listSessions(workspacePath, home = commandCodeHome()) {
  const files = listSessionFiles(home);
  const items = [];
  for (const file of files) {
    const st = fs.statSync(file);
    const parsed = parseTranscript(file, { maxEntries: 80 });
    const header = parsed.header || {};
    const id = header.id || header.sessionId || header.session_id || sessionIdFromFile(file);
    const cwd = header.cwd || header.workingDirectory || header.workdir || header.workspace || null;
    const meta = readJsonSilent(file.replace(/\.jsonl$/, '.meta.json')) || {};
    const title = meta.title || meta.name || header.name || header.title || null;
    const model = meta.model || header.model || null;
    const parent = meta.parentSessionId || meta.parentSession || header.parentSession || null;
    if (workspacePath && cwd && !pathsEqual(cwd, workspacePath)) {
      // Keep if slug folder might still belong — only filter when cwd is present and differs.
      continue;
    }
    const preview = firstUserText(parsed.entries);
    items.push({
      id,
      path: file,
      title: title || preview || id.slice(0, 8),
      model,
      parentSessionId: parent,
      cwd,
      mtime: st.mtimeMs,
      created: header.createdAt || header.created || header.timestamp || null,
      entryCount: parsed.entries.length
    });
  }
  items.sort((a, b) => b.mtime - a.mtime);
  return items;
}

function firstUserText(entries) {
  for (const e of entries) {
    const s = summarizeEntry(e);
    if (s && s.role === 'user' && s.text) return s.text.slice(0, 80);
  }
  return '';
}

function getSessionMessages(filePath) {
  const parsed = parseTranscript(filePath);
  if (!parsed.ok) return parsed;
  return {
    ok: true,
    header: parsed.header,
    messages: parsed.entries.map(summarizeEntry).filter(Boolean),
    path: filePath
  };
}

function listCustomCommands(workspacePath, home = commandCodeHome()) {
  const dirs = [];
  if (workspacePath) dirs.push({ dir: path.join(workspacePath, '.commandcode', 'commands'), scope: 'project' });
  dirs.push({ dir: path.join(home, 'commands'), scope: 'user' });
  const out = [];
  for (const { dir, scope } of dirs) {
    walkMd(dir, '', (rel, full) => {
      const name = path.basename(rel, '.md');
      let body = '';
      try {
        body = fs.readFileSync(full, 'utf8');
      } catch {
        return;
      }
      const desc = firstMeaningfulLine(body);
      out.push({ name, scope, path: full, description: desc });
    });
  }
  return out;
}

function walkMd(dir, prefix, visit) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    const rel = prefix ? `${prefix}/${e.name}` : e.name;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walkMd(full, rel, visit);
    else if (e.isFile() && e.name.endsWith('.md')) visit(rel, full);
  }
}

function firstMeaningfulLine(body) {
  const lines = String(body).split(/\n/);
  for (const line of lines) {
    const t = line.trim();
    if (!t || t.startsWith('---') || t.startsWith('#')) continue;
    return t.slice(0, 80);
  }
  return '';
}

function listPlans(home = commandCodeHome()) {
  const dir = path.join(home, 'plans');
  let files = [];
  try {
    files = fs.readdirSync(dir).filter((f) => f.endsWith('.md'));
  } catch {
    return [];
  }
  return files.map((f) => {
    const full = path.join(dir, f);
    let st;
    try { st = fs.statSync(full); } catch { st = { mtimeMs: 0 }; }
    return { name: f.replace(/\.md$/, ''), path: full, mtime: st.mtimeMs };
  }).sort((a, b) => b.mtime - a.mtime);
}

function readConfig(home = commandCodeHome()) {
  return readJsonSilent(path.join(home, 'config.json')) || {};
}

function listCheckpoints(sessionFile) {
  const file = sessionFile.replace(/\.jsonl$/, '.checkpoints.jsonl');
  if (!fs.existsSync(file)) return [];
  const text = fs.readFileSync(file, 'utf8');
  const rows = [];
  for (const line of text.split(/\n/)) {
    if (!line.trim()) continue;
    try { rows.push(JSON.parse(line)); } catch { /* skip */ }
  }
  return rows;
}

module.exports = {
  commandCodeHome,
  parseTranscript,
  summarizeEntry,
  listSessions,
  listSessionFiles,
  getSessionMessages,
  listCustomCommands,
  listPlans,
  readConfig,
  listCheckpoints,
  pathsEqual
};
