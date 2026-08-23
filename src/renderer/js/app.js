(function () {
  const $ = (id) => document.getElementById(id);
  const state = {
    settings: null,
    workspace: null,
    tree: [],
    git: { files: [] },
    sessions: [],
    models: [],
    selectedModel: '',
    modelsExpanded: false,
    expandedDirs: new Set(),
    treeInitialized: false,
    markdownPreview: false,
    openTabs: [],
    activeTab: null,
    messages: [],
    busy: false,
    engineStatus: 'disconnected',
    includeActive: true,
    includeSelection: true,
    mentions: [],
    draft: '',
    slash: [],
    builtin: [],
    logLines: [],
    suggest: [],
    suggestIdx: 0
  };

  const BUILTIN = [
    ['clear', 'New session'], ['init', 'Initialize AGENTS.md'], ['memory', 'Memory'],
    ['compact', 'Compact'], ['plan', 'Plan mode'], ['mode:auto-accept', 'Auto-accept'],
    ['model', 'Switch model'], ['effort', 'Effort'], ['skills', 'Skills'],
    ['mcp', 'MCP'], ['taste', 'Taste'], ['goal', 'Goal'], ['review', 'Review PR'],
    ['status', 'Status'], ['usage', 'Usage'], ['help', 'Help']
  ];

  function applyTheme(name) {
    document.documentElement.dataset.theme = name || 'midnight';
    Editor.setTheme(name);
  }

  function setStatus(text, cls) {
    $('statusText').textContent = text;
    $('dot').className = 'dot ' + (cls || '');
    $('enginePill').textContent = text;
    $('enginePill').className = 'pill ' + (cls === 'working' ? 'working' : cls === 'error' ? 'error' : '');
  }

  async function boot() {
    API.connectWs();
    API.on('agent:event', onAgentEvent);
    API.on('agent:log', onAgentLog);
    API.on('agent:done', onAgentDone);
    API.on('engine:status', (d) => {
      state.engineStatus = d.status;
      paintEngine();
    });
    API.on('fs:change', onFsChange);
    API.on('menu', onMenu);
    API.on('editor:dirty', () => renderTabs());

    const app = await API.invoke('app:state');
    state.settings = app.settings;
    state.workspace = app.workspace;
    state.engineStatus = app.engineStatus;
    state.busy = app.busy;
    applyTheme(state.settings.theme);
    $('modeBtn').textContent = state.settings.engine.permissionMode;
    $('permText').textContent = 'mode ' + state.settings.engine.permissionMode;

    await Editor.mount($('editor'), state.settings.theme);
    Editor.setOptions(state.settings.editor);

    const det = await API.invoke('engine:detect');
    paintSetup(det);
    state.engineStatus = det.status || (det.ok ? 'ready' : 'missing');
    if (state.workspace && det.ok) {
      hideWelcome();
      await loadWorkspace(state.workspace);
    } else {
      paintRecent();
      $('welcome').classList.remove('hidden');
    }

    bind();
    paintEngine();
  }

  function paintSetup(det) {
    const box = $('setupBox');
    if (det && det.ok) {
      box.innerHTML = `Command Code <strong>${MD.escapeHtml(det.version || '')}</strong> at <code>${MD.escapeHtml(det.path)}</code>` +
        (det.status === 'incompatible' ? '<br>This version may lack JSON output. Update Command Code.' : '');
    } else {
      box.innerHTML = `Command Code was not found on PATH. Install with <code>npm i -g command-code</code>, then click Detect. Native Windows uses <code>cmdc</code>.`;
    }
  }

  function paintRecent() {
    const rec = (state.settings && state.settings.recentProjects) || [];
    $('recent').innerHTML = rec.map((p) => `<button data-path="${MD.escapeHtml(p.path)}">${MD.escapeHtml(p.name)}<br><span class="usage">${MD.escapeHtml(p.path)}</span></button>`).join('');
    $('recent').querySelectorAll('button').forEach((b) => b.onclick = () => openFolder(b.dataset.path));
  }

  function hideWelcome() { $('welcome').classList.add('hidden'); }

  function paintEngine() {
    const map = {
      ready: ['Command Code Ready', 'ready'],
      working: ['Working…', 'working'],
      missing: ['Command Code missing', 'missing'],
      incompatible: ['Unsupported CLI', 'error'],
      error: ['Error', 'error'],
      disconnected: ['Disconnected', 'missing']
    };
    const x = map[state.engineStatus] || [state.engineStatus, ''];
    setStatus(x[0], x[1]);
    $('stopBtn').classList.toggle('hidden', !state.busy);
    $('sendBtn').disabled = state.busy;
  }

  async function openFolder(p) {
    let folder = p;
    if (!folder) folder = await API.invoke('dialog:openFolder');
    if (!folder) folder = window.prompt('Workspace folder path');
    if (!folder) return;
    if (typeof folder === 'object' && folder.path) folder = folder.path;
    await API.invoke('workspace:open', { path: folder });
    state.workspace = folder;
    state.treeInitialized = false;
    state.expandedDirs.clear();
    window._sessionId = null;
    state.messages = [];
    renderMessages();
    hideWelcome();
    await loadWorkspace(folder);
  }

  async function loadWorkspace(folder) {
    $('wsLabel').textContent = folder;
    await Promise.all([refreshTree(), refreshGit(), refreshSessions(), refreshModels(), refreshSlash()]);
    const app = await API.invoke('app:state');
    state.settings = app.settings;
    if (app.activeSessionId && state.sessions.some((s) => s.id === app.activeSessionId)) {
      await openSession(app.activeSessionId);
    } else {
      window._sessionId = null;
      renderSessions();
    }
  }

  async function refreshTree() {
    state.tree = await API.invoke('workspace:tree');
    if (!state.treeInitialized) {
      // Start with the project's top-level folders open and nested folders
      // collapsed, like a normal IDE explorer.
      state.tree.filter((x) => x.type === 'dir' && !x.rel.includes('/')).forEach((x) => state.expandedDirs.add(x.rel));
      state.treeInitialized = true;
    }
    renderTree();
  }
  async function refreshGit() {
    state.git = await API.invoke('git:status');
    $('gitText').textContent = state.git.git ? (state.git.branch || 'git') + ' · ' + state.git.files.length + ' changes' : '';
    renderTree();
  }
  async function refreshSessions() {
    state.sessions = await API.invoke('sessions:list');
    renderSessions();
  }
  async function refreshModels() {
    state.models = await API.invoke('engine:models');
    renderModelMenu();
  }

  function renderModelMenu() {
    const menu = $('modelMenu');
    const shown = state.modelsExpanded ? state.models : state.models.slice(0, 5);
    const selected = state.models.find((m) => m.id === state.selectedModel);
    $('modelLabel').textContent = selected ? (selected.label || selected.id) : 'Default model';
    menu.innerHTML = `<button class="model-option ${!state.selectedModel ? 'selected' : ''}" data-model=""><span>Default model</span><small>Command Code preference</small></button>` +
      shown.map((m) => `<button class="model-option ${m.id === state.selectedModel ? 'selected' : ''}" data-model="${encodeURIComponent(m.id)}"><span>${MD.escapeHtml(m.label || m.id)}</span><small>${MD.escapeHtml(m.id)}</small></button>`).join('') +
      (!state.modelsExpanded && state.models.length > 5 ? `<button class="model-more" data-more="1">More models… <span>${state.models.length - 5}</span></button>` : '') +
      (state.modelsExpanded && state.models.length > 5 ? `<button class="model-more" data-more="1">Show top models</button>` : '') +
      (!state.models.length ? `<div class="model-empty">No models returned by cmdc --list-models</div>` : '');
    menu.querySelectorAll('[data-model]').forEach((n) => n.onclick = () => {
      state.selectedModel = decodeURIComponent(n.dataset.model || '');
      menu.classList.add('hidden');
      renderModelMenu();
    });
    const more = menu.querySelector('[data-more]');
    if (more) more.onclick = () => { state.modelsExpanded = !state.modelsExpanded; renderModelMenu(); menu.classList.remove('hidden'); };
  }
  async function refreshSlash() {
    state.slash = await API.invoke('slash:list');
  }

  function gitStatusFor(rel) {
    const f = (state.git.files || []).find((x) => x.path === rel || x.path.endsWith('/' + rel) || rel.endsWith(x.path));
    return f ? f.status : null;
  }

  function fileIcon(name) {
    const ext = (name.split('.').pop() || '').toLowerCase();
    if (['js', 'jsx', 'mjs'].includes(ext)) return '<span class="fi js">JS</span>';
    if (['ts', 'tsx'].includes(ext)) return '<span class="fi ts">TS</span>';
    if (ext === 'md') return '<span class="fi md">M</span>';
    if (['json', 'yml', 'yaml'].includes(ext)) return '<span class="fi cfg">{}</span>';
    if (['cpp', 'cc', 'c', 'h', 'hpp'].includes(ext)) return '<span class="fi cpp">C</span>';
    return '<span class="fi">·</span>';
  }

  function renderTree() {
    const el = $('tree');
    const gitClass = { modified: 'git-m', added: 'git-a', deleted: 'git-d', untracked: 'git-u', renamed: 'git-m' };
    const visible = state.tree.filter((item) => {
      const parts = item.rel.split('/');
      for (let i = 1; i < parts.length; i++) {
        if (!state.expandedDirs.has(parts.slice(0, i).join('/'))) return false;
      }
      return true;
    });
    el.innerHTML = visible.map((item) => {
      const depth = item.rel.split('/').length - 1;
      const gs = item.type === 'file' ? gitStatusFor(item.rel) : null;
      const open = item.type === 'dir' && state.expandedDirs.has(item.rel);
      const ico = item.type === 'dir' ? (open ? '⌄' : '›') : fileIcon(item.name);
      const active = state.activeTab === item.path ? 'active' : '';
      return `<div class="item ${active} ${gs ? gitClass[gs] : ''}" style="--d:${depth}" data-path="${encodeURIComponent(item.path)}" data-rel="${encodeURIComponent(item.rel)}" data-type="${item.type}" draggable="${item.type === 'file'}">
        <span class="ico ${item.type}">${ico}</span><span class="item-name">${MD.escapeHtml(item.name)}</span>
      </div>`;
    }).join('');
    el.querySelectorAll('.item').forEach((n) => {
      n.onclick = () => {
        const rel = decodeURIComponent(n.dataset.rel);
        if (n.dataset.type === 'dir') {
          if (state.expandedDirs.has(rel)) state.expandedDirs.delete(rel); else state.expandedDirs.add(rel);
          renderTree();
        } else openEditor(decodeURIComponent(n.dataset.path), rel);
      };
      n.oncontextmenu = (e) => { e.preventDefault(); fileMenu(e, n); };
    });
  }

  function fileMenu(e, n) {
    const path = decodeURIComponent(n.dataset.path);
    const rel = decodeURIComponent(n.dataset.rel);
    const ctx = $('ctx');
    ctx.style.left = e.clientX + 'px';
    ctx.style.top = e.clientY + 'px';
    ctx.classList.remove('hidden');
    ctx.innerHTML = [
      ['Open', () => openEditor(path, rel)],
      ['Ask Command Code about this file', () => { state.mentions.push({ path, relpath: rel }); renderChips(); $('prompt').focus(); }],
      ['New File', async () => {
        const name = window.prompt('File name relative to workspace');
        if (!name) return;
        const full = joinWs(name);
        await API.invoke('file:create', { path: full });
        await refreshTree();
      }],
      ['New Folder', async () => {
        const name = window.prompt('Folder name');
        if (!name) return;
        await API.invoke('file:mkdir', { path: joinWs(name) });
        await refreshTree();
      }],
      ['Rename', async () => {
        const name = window.prompt('New path', rel);
        if (!name) return;
        await API.invoke('file:rename', { from: path, to: joinWs(name) });
        await refreshTree();
      }],
      ['Delete', async () => {
        if (!window.confirm('Delete ' + rel + '?')) return;
        await API.invoke('file:delete', { path });
        await refreshTree();
      }],
      ['Copy Path', () => navigator.clipboard.writeText(path)],
      ['Copy Relative Path', () => navigator.clipboard.writeText(rel)],
      ['Reveal', () => API.invoke('reveal', { path })],
      ['Open diff', () => showDiff(rel)]
    ].map(([label], i) => `<button data-i="${i}">${label}</button>`).join('');
    const actions = [
      () => openEditor(path, rel),
      () => { state.mentions.push({ path, relpath: rel }); renderChips(); },
      null, null, null, null, null, null, null, () => showDiff(rel)
    ];
    ctx.querySelectorAll('button').forEach((b) => {
      b.onclick = async () => {
        ctx.classList.add('hidden');
        const i = Number(b.dataset.i);
        const fns = ctx._fns;
        if (fns[i]) await fns[i]();
      };
    });
    ctx._fns = [
      () => openEditor(path, rel),
      () => { state.mentions.push({ path, relpath: rel }); renderChips(); $('prompt').focus(); },
      async () => { const name = window.prompt('New file relative path'); if (!name) return; await API.invoke('file:create', { path: joinWs(name) }); await refreshTree(); },
      async () => { const name = window.prompt('New folder'); if (!name) return; await API.invoke('file:mkdir', { path: joinWs(name) }); await refreshTree(); },
      async () => { const name = window.prompt('New path', rel); if (!name) return; await API.invoke('file:rename', { from: path, to: joinWs(name) }); await refreshTree(); },
      async () => { if (!window.confirm('Delete ' + rel + '?')) return; await API.invoke('file:delete', { path }); await refreshTree(); },
      () => navigator.clipboard.writeText(path),
      () => navigator.clipboard.writeText(rel),
      () => API.invoke('reveal', { path }),
      () => showDiff(rel)
    ];
  }

  function joinWs(rel) {
    const sep = state.workspace.includes('\\') ? '\\' : '/';
    return state.workspace.replace(/[\\/]$/, '') + sep + rel.replace(/^[/\\]/, '');
  }

  async function openEditor(path, rel) {
    const res = await API.invoke('file:read', { path });
    if (!res.ok) { window.alert(res.error || 'Cannot open'); return; }
    if (!state.openTabs.find((t) => t.path === path)) {
      state.openTabs.push({ path, rel: rel || path, dirty: false });
    }
    state.activeTab = path;
    $('editor').classList.remove('hidden');
    $('diffView').classList.add('hidden');
    $('editorEmpty').classList.add('hidden');
    Editor.openFile(path, res.text, state.settings.theme);
    const isMarkdown = /\.md$/i.test(rel || path);
    $('mdPreviewBtn').classList.toggle('hidden', !isMarkdown);
    if (!isMarkdown) state.markdownPreview = false;
    paintMarkdownPreview();
    renderTabs();
    renderTree();
    renderChips();
  }

  function paintMarkdownPreview() {
    const preview = $('markdownPreview');
    const active = state.openTabs.find((t) => t.path === state.activeTab);
    const show = !!(state.markdownPreview && active && /\.md$/i.test(active.rel));
    preview.classList.toggle('hidden', !show);
    $('editor').classList.toggle('hidden', show);
    $('mdPreviewBtn').textContent = show ? 'Edit' : 'Preview';
    if (show) preview.innerHTML = `<div class="md-document">${MD.render(Editor.getValue())}</div>`;
  }

  function renderTabs() {
    $('tabs').innerHTML = state.openTabs.map((t) => {
      const dirty = Editor.isDirty(t.path);
      return `<div draggable="true" class="tab ${t.path === state.activeTab ? 'active' : ''} ${dirty ? 'dirty' : ''}" data-path="${encodeURIComponent(t.path)}">
        <span>${MD.escapeHtml(t.rel.split(/[\\/]/).pop())}</span>
        <span class="x" data-close="1">×</span>
      </div>`;
    }).join('');
    $('tabs').querySelectorAll('.tab').forEach((n) => {
      n.onclick = (e) => {
        const p = decodeURIComponent(n.dataset.path);
        if (e.target.dataset.close) {
          if (Editor.isDirty(p) && !window.confirm('Close unsaved file?')) return;
          Editor.close(p);
          state.openTabs = state.openTabs.filter((t) => t.path !== p);
          state.activeTab = state.openTabs.length ? state.openTabs[state.openTabs.length - 1].path : null;
          if (state.activeTab) {
            const t = state.openTabs.find((x) => x.path === state.activeTab);
            openEditor(t.path, t.rel);
          }
          renderTabs();
          return;
        }
        const t = state.openTabs.find((x) => x.path === p);
        openEditor(t.path, t.rel);
      };
      n.ondragstart = (e) => e.dataTransfer.setData('application/x-cc-tab', decodeURIComponent(n.dataset.path));
      n.ondragover = (e) => { e.preventDefault(); n.classList.add('drag-over'); };
      n.ondragleave = () => n.classList.remove('drag-over');
      n.ondrop = (e) => {
        e.preventDefault();
        n.classList.remove('drag-over');
        const from = e.dataTransfer.getData('application/x-cc-tab');
        const to = decodeURIComponent(n.dataset.path);
        if (!from || from === to) return;
        const fromIndex = state.openTabs.findIndex((x) => x.path === from);
        const toIndex = state.openTabs.findIndex((x) => x.path === to);
        if (fromIndex < 0 || toIndex < 0) return;
        const moved = state.openTabs.splice(fromIndex, 1)[0];
        state.openTabs.splice(toIndex, 0, moved);
        renderTabs();
      };
    });
  }

  async function saveActive() {
    const p = Editor.current();
    if (!p) return;
    const text = Editor.getValue();
    await API.invoke('file:write', { path: p, text });
    Editor.markSaved(p, text);
    renderTabs();
  }

  async function showDiff(rel) {
    const d = await API.invoke('git:diff', { path: rel });
    $('editor').classList.add('hidden');
    $('diffView').classList.remove('hidden');
    const html = MD.escapeHtml(d.text || 'No diff').split('\n').map((line) => {
      if (line.startsWith('+') && !line.startsWith('+++')) return `<div class="add">${line}</div>`;
      if (line.startsWith('-') && !line.startsWith('---')) return `<div class="del">${line}</div>`;
      return `<div>${line}</div>`;
    }).join('');
    $('diffView').innerHTML = html || 'No changes';
  }

  function renderSessions() {
    const q = $('sessionSearch').value.toLowerCase();
    const list = state.sessions.filter((s) => !q || (s.title || '').toLowerCase().includes(q) || s.id.includes(q));
    $('sessionList').innerHTML = list.map((s) => {
      const active = s.id === (window._sessionId || '') ? 'active' : '';
      const t = new Date(s.mtime).toLocaleString();
      return `<div class="session-row ${active}" data-id="${MD.escapeHtml(s.id)}">
        <span>${MD.escapeHtml(s.title || s.id.slice(0, 8))}</span>
        <span class="meta">${MD.escapeHtml((s.model || '') + ' ' + t)}</span>
      </div>`;
    }).join('') || `<div class="session-row"><span class="usage">No sessions in this workspace yet</span></div>`;
    $('sessionList').querySelectorAll('.session-row[data-id]').forEach((n) => {
      n.onclick = () => openSession(n.dataset.id);
      n.oncontextmenu = (e) => {
        e.preventDefault();
        const name = window.prompt('Local display name');
        if (name) API.invoke('sessions:alias', { id: n.dataset.id, title: name }).then(refreshSessions);
      };
    });
  }

  async function openSession(id) {
    window._sessionId = id;
    await API.invoke('sessions:select', { id });
    const data = await API.invoke('sessions:messages', { id });
    state.messages = [];
    if (data && data.messages) {
      for (const m of data.messages) {
        if (m.role === 'user') state.messages.push({ role: 'user', text: m.text });
        else if (m.role === 'assistant') state.messages.push({ role: 'assistant', text: m.text, tools: [] });
        else if (m.role === 'tool') {
          const last = state.messages[state.messages.length - 1];
          const tool = { name: m.toolName, description: m.description, open: false };
          if (last && last.role === 'assistant') last.tools = (last.tools || []).concat([tool]);
          else state.messages.push({ role: 'assistant', text: '', tools: [tool] });
        }
      }
    }
    renderMessages();
    renderSessions();
  }

  function renderMessages() {
    const el = $('messages');
    if (!state.messages.length) {
      el.innerHTML = `<div class="chat-empty"><div class="chat-mark">⌁</div><strong>Build with Command Code</strong><span>Ask a question, make a change, or resume a conversation.</span></div>`;
      return;
    }
    el.innerHTML = state.messages.map((m) => {
      if (m.role === 'user') {
        return `<div class="msg user"><div class="who">You</div><div class="bubble">${MD.render(m.text)}${m.hint ? `<div class="ctx-hint">${MD.escapeHtml(m.hint)}</div>` : ''}</div></div>`;
      }
      const tools = (m.tools || []).map((t) => {
        const label = prettyTool(t);
        return `<details class="tool-card" ${t.open ? 'open' : ''}><summary>${MD.escapeHtml(label)}</summary><div class="body">${MD.escapeHtml(t.detail || t.description || '')}</div></details>`;
      }).join('');
      return `<div class="msg assistant"><div class="who">Command Code</div><div class="bubble">${tools}${MD.render(m.text || (state.busy ? '…' : ''))}</div></div>`;
    }).join('');
    el.scrollTop = el.scrollHeight;
  }

  function prettyTool(t) {
    const n = (t.name || 'tool').toLowerCase();
    const d = t.description || '';
    if (n.includes('read')) return '▸ Read  ' + d;
    if (n.includes('edit') || n.includes('write')) return '▸ Edit  ' + d;
    if (n.includes('shell') || n.includes('bash') || n === 'run_command') return '▸ Shell  ' + d;
    if (n.includes('search') || n.includes('grep') || n.includes('glob')) return '▸ Search  ' + d;
    return '▸ ' + (t.name || 'tool') + (d ? '  ' + d : '');
  }

  function renderChips() {
    const chips = [];
    const tab = state.openTabs.find((t) => t.path === state.activeTab);
    if (tab && state.includeActive) chips.push({ k: 'file', label: tab.rel.split(/[\\/]/).pop() });
    const sel = Editor.getSelection();
    if (sel && state.includeSelection) chips.push({ k: 'sel', label: `${sel.endLine - sel.startLine + 1} lines selected` });
    state.mentions.forEach((m, i) => chips.push({ k: 'm', i, label: '@' + (m.relpath || m.path) }));
    $('chips').innerHTML = chips.map((c) => `<span class="chip">${MD.escapeHtml(c.label)}<button data-k="${c.k}" data-i="${c.i || 0}">×</button></span>`).join('');
    $('chips').querySelectorAll('button').forEach((b) => {
      b.onclick = () => {
        if (b.dataset.k === 'file') state.includeActive = false;
        if (b.dataset.k === 'sel') state.includeSelection = false;
        if (b.dataset.k === 'm') state.mentions.splice(Number(b.dataset.i), 1);
        renderChips();
      };
    });
    $('contextHint').textContent = tab ? `In ${tab.rel.split(/[\\/]/).pop()}` : '';
  }

  function currentAssistant() {
    let last = state.messages[state.messages.length - 1];
    if (!last || last.role !== 'assistant') {
      last = { role: 'assistant', text: '', tools: [] };
      state.messages.push(last);
    }
    return last;
  }

  function onAgentEvent(ev) {
    if (!ev) return;
    if (ev.sessionId) window._sessionId = ev.sessionId;
    const a = currentAssistant();
    if (ev.type === 'ToolStarted' || ev.type === 'ToolOutput' || ev.type === 'ToolCompleted' || ev.type === 'UnknownEvent') {
      const name = ev.toolName || (ev.payload && ev.payload.toolName) || ev.eventType || 'tool';
      const description = ev.description || '';
      const existing = a.tools.find((t) => ev.toolCallId && t.id === ev.toolCallId);
      if (existing) {
        existing.description = description || existing.description;
        existing.detail = (existing.detail || '') + (ev.payload ? '\n' + JSON.stringify(ev.payload).slice(0, 2000) : '');
      } else {
        a.tools.push({ id: ev.toolCallId, name, description, detail: '', open: false });
      }
      $('busyText').textContent = prettyTool({ name, description });
    } else if (ev.type === 'MessageChunk') {
      a.text += ev.text || '';
    } else if (ev.type === 'TaskCompleted') {
      if (ev.finalText) a.text = ev.finalText;
      if (ev.sessionId) window._sessionId = ev.sessionId;
    } else if (ev.type === 'EngineError') {
      a.text += (a.text ? '\n\n' : '') + (ev.error || 'Engine error');
    } else if (ev.type === 'LogText' && ev.text) {
      onAgentLog({ stream: 'stdout', line: ev.text });
    }
    renderMessages();
  }

  function onAgentLog(line) {
    const s = `[${line.stream}] ${line.line}`;
    state.logLines.push(s);
    if (state.logLines.length > 2000) state.logLines = state.logLines.slice(-1000);
    $('outputLog').textContent = state.logLines.slice(-400).join('\n');
  }

  async function onAgentDone(info) {
    state.busy = false;
    state.engineStatus = info.mapped && info.mapped.id === 'ok' ? 'ready' : (info.code === 130 ? 'ready' : 'error');
    const a = currentAssistant();
    if (info.result && info.result.finalText) a.text = info.result.finalText;
    if (info.mapped && info.mapped.id !== 'ok' && info.mapped.id !== 'cancelled') {
      const diagnostic = info.error || info.mapped.message;
      a.text += (a.text ? '\n\n' : '') + `Command Code reported an error:\n\n${diagnostic}`;
    }
    if (info.sessionId) window._sessionId = info.sessionId;
    $('busyText').textContent = '';
    paintEngine();
    renderMessages();
    await refreshSessions();
    await refreshTree();
    await refreshGit();
    await reloadOpenFiles();
  }

  async function reloadOpenFiles() {
    for (const t of state.openTabs) {
      const res = await API.invoke('file:read', { path: t.path });
      if (res.ok) {
        const r = Editor.applyExternal(t.path, res.text);
        if (r.dirty) {
          /* keep user unsaved buffer */
        }
      }
    }
    renderTabs();
  }

  async function onFsChange() {
    clearTimeout(onFsChange._t);
    onFsChange._t = setTimeout(async () => {
      await refreshTree();
      await refreshGit();
      await reloadOpenFiles();
    }, 250);
  }

  async function send() {
    const text = $('prompt').value;
    if (!text.trim() || state.busy) return;
    const tab = state.openTabs.find((t) => t.path === state.activeTab);
    const sel = Editor.getSelection();
    const payload = {
      text,
      mentions: state.mentions.slice(),
      activeFile: tab ? { path: tab.path, relpath: tab.rel } : null,
      selection: sel && tab ? { ...sel, path: tab.path, relpath: tab.rel } : null,
      includeActive: !!(state.includeActive && tab),
      includeSelection: !!(state.includeSelection && sel),
      sessionId: window._sessionId || null,
      model: state.selectedModel || undefined,
      permissionMode: state.settings.engine.permissionMode
    };
    const hintParts = [];
    if (payload.includeActive) hintParts.push('file ' + tab.rel);
    if (payload.includeSelection) hintParts.push(`${sel.endLine - sel.startLine + 1} lines selected`);
    state.messages.push({ role: 'user', text, hint: hintParts.join(' · ') });
    state.messages.push({ role: 'assistant', text: '', tools: [] });
    $('prompt').value = '';
    state.mentions = [];
    persistDraft('');
    renderChips();
    renderMessages();
    // Mark busy before IPC so a fast CLI failure/result cannot race ahead of
    // the invoke response and leave the composer stuck in a working state.
    state.busy = true;
    state.engineStatus = 'working';
    paintEngine();
    try {
      const res = await API.invoke('agent:send', payload);
      if (res.kind === 'new-session') {
        state.busy = false;
        state.engineStatus = 'ready';
        paintEngine();
        window._sessionId = null;
        state.messages = [];
        renderMessages();
        await API.invoke('sessions:new');
        return;
      }
      if (res.kind === 'set-mode') {
        state.busy = false;
        state.engineStatus = 'ready';
        paintEngine();
        state.settings.engine.permissionMode = res.mode;
        $('modeBtn').textContent = res.mode;
        $('permText').textContent = 'mode ' + res.mode;
        state.messages.pop();
        state.messages.pop();
        renderMessages();
        return;
      }
      if (res.kind === 'set-model') {
        state.busy = false;
        state.engineStatus = 'ready';
        paintEngine();
        state.selectedModel = res.model; renderModelMenu();
        state.messages.pop();
        state.messages.pop();
        renderMessages();
        return;
      }
    } catch (err) {
      state.busy = false;
      state.engineStatus = 'error';
      paintEngine();
      currentAssistant().text = err.message;
      renderMessages();
    }
  }

  async function newChat() {
    window._sessionId = null;
    await API.invoke('sessions:new');
    state.messages = [];
    renderMessages();
    renderSessions();
    $('prompt').focus();
  }

  async function forkChat() {
    if (!window._sessionId) return;
    const text = $('prompt').value.trim() || 'Continue from this fork.';
    $('prompt').value = text;
    const tab = state.openTabs.find((t) => t.path === state.activeTab);
    state.messages.push({ role: 'user', text });
    state.messages.push({ role: 'assistant', text: '', tools: [] });
    renderMessages();
    state.busy = true;
    paintEngine();
    await API.invoke('agent:send', {
      text,
      sessionId: window._sessionId,
      fork: true,
      model: state.selectedModel || undefined,
      permissionMode: state.settings.engine.permissionMode,
      mentions: [],
      includeActive: false,
      includeSelection: false
    });
    $('prompt').value = '';
  }

  function persistDraft(v) {
    API.invoke('settings:set', { drafts: { ...(state.settings.drafts || {}), [state.workspace || '']: v } });
  }

  function cycleMode() {
    const order = ['default', 'auto-accept', 'plan'];
    const cur = state.settings.engine.permissionMode;
    const next = order[(Math.max(0, order.indexOf(cur)) + 1) % order.length];
    state.settings.engine.permissionMode = next;
    API.invoke('settings:set', { engine: { ...state.settings.engine, permissionMode: next } });
    $('modeBtn').textContent = next;
    $('permText').textContent = 'mode ' + next;
  }

  function bind() {
    $('openFolderBtn').onclick = () => openFolder();
    $('refreshEngineBtn').onclick = async () => {
      const d = await API.invoke('engine:detect');
      paintSetup(d);
      state.engineStatus = d.status || (d.ok ? 'ready' : 'missing');
      paintEngine();
    };
    $('modelSelect').onclick = (e) => { e.stopPropagation(); $('modelMenu').classList.toggle('hidden'); };
    $('mdPreviewBtn').onclick = () => { state.markdownPreview = !state.markdownPreview; paintMarkdownPreview(); };
    $('toggleSessions').onclick = () => {
      $('sessionArea').classList.toggle('hidden');
      $('toggleSessions').textContent = $('sessionArea').classList.contains('hidden') ? '⌄' : '⌃';
    };
    $('sendBtn').onclick = send;
    $('stopBtn').onclick = () => API.invoke('agent:cancel');
    $('newChatBtn').onclick = newChat;
    $('forkBtn').onclick = forkChat;
    $('prompt').addEventListener('keydown', onPromptKey);
    $('prompt').addEventListener('input', onPromptInput);
    $('sessionSearch').oninput = renderSessions;
    $('settingsBtn').onclick = openSettings;
    $('closeSettings').onclick = () => $('settingsModal').classList.add('hidden');
    $('saveSettings').onclick = saveSettings;
    $('openLogs').onclick = () => API.invoke('logs:dir').then((d) => API.invoke('open-external', { path: d }));
    $('loginBtn').onclick = () => API.invoke('engine:login');
    $('paletteBtn').onclick = () => openPalette();
    $('modeBtn').onclick = cycleMode;
    $('toggleExplorer').onclick = () => $('workspace').classList.toggle('no-explorer');
    $('toggleChat').onclick = () => $('workspace').classList.toggle('no-chat');
    $('toggleOutput').onclick = () => $('outputDrawer').classList.toggle('hidden');
    $('toggleTerm').onclick = () => $('terminalDrawer').classList.toggle('hidden');
    $('closeOutput').onclick = () => $('outputDrawer').classList.add('hidden');
    $('closeTerm').onclick = () => $('terminalDrawer').classList.add('hidden');
    $('closeProblems').onclick = () => $('problemsDrawer').classList.add('hidden');
    $('refreshTreeBtn').onclick = refreshTree;
    $('newFileBtn').onclick = async () => {
      const name = window.prompt('New file relative path');
      if (!name) return;
      await API.invoke('file:create', { path: joinWs(name) });
      await refreshTree();
    };
    $('termIn').addEventListener('keydown', async (e) => {
      if (e.key !== 'Enter') return;
      const command = e.target.value;
      e.target.value = '';
      const r = await API.invoke('shell:run', { command });
      $('termOut').textContent += `\n$ ${command}\n${r.stdout || ''}${r.stderr || ''}`;
      $('termOut').scrollTop = $('termOut').scrollHeight;
    });
    document.addEventListener('click', (e) => {
      if (!e.target.closest('#ctx')) $('ctx').classList.add('hidden');
      if (!e.target.closest('#modelPicker')) $('modelMenu').classList.add('hidden');
    });
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'p') { e.preventDefault(); openPalette(); }
      else if (e.ctrlKey && e.key.toLowerCase() === 'p' && !e.shiftKey) { e.preventDefault(); openQuickOpen(); }
      else if (e.ctrlKey && e.key.toLowerCase() === 's') { e.preventDefault(); saveActive(); }
      else if (e.ctrlKey && e.key.toLowerCase() === 'o') { e.preventDefault(); openFolder(); }
      else if (e.key === 'F1') { e.preventDefault(); openPalette(); }
      else if (e.key === 'Escape') {
        $('palette').classList.add('hidden');
        if (state.busy) API.invoke('agent:cancel');
      } else if (e.shiftKey && e.key === 'Tab' && document.activeElement === $('prompt')) {
        e.preventDefault();
        cycleMode();
      }
    });
    $('prompt').addEventListener('drop', (e) => {
      e.preventDefault();
      const rel = e.dataTransfer.getData('text/plain');
      if (rel) { state.mentions.push({ relpath: rel, path: joinWs(rel) }); renderChips(); }
    });
    $('tree').addEventListener('dragstart', (e) => {
      const item = e.target.closest('.item');
      if (item) e.dataTransfer.setData('text/plain', decodeURIComponent(item.dataset.rel));
    });
  }

  function onPromptKey(e) {
    const box = $('suggest');
    if (!box.classList.contains('hidden') && state.suggest.length) {
      if (e.key === 'ArrowDown') { e.preventDefault(); state.suggestIdx = (state.suggestIdx + 1) % state.suggest.length; paintSuggest(); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); state.suggestIdx = (state.suggestIdx - 1 + state.suggest.length) % state.suggest.length; paintSuggest(); return; }
      if (e.key === 'Tab' || e.key === 'Enter') {
        e.preventDefault();
        applySuggest(state.suggest[state.suggestIdx]);
        return;
      }
      if (e.key === 'Escape') { box.classList.add('hidden'); return; }
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  function onPromptInput() {
    const v = $('prompt').value;
    persistDraft(v);
    if (v.startsWith('/')) {
      const q = v.slice(1).toLowerCase();
      const custom = (state.slash || []).map((c) => ({ kind: 'slash', name: c.name, desc: c.description + ' (' + c.scope + ')' }));
      const builtin = BUILTIN.map((b) => ({ kind: 'slash', name: b[0], desc: b[1] }));
      state.suggest = builtin.concat(custom).filter((x) => x.name.startsWith(q) || x.name.includes(q) || x.desc.toLowerCase().includes(q)).slice(0, 12);
      state.suggestIdx = 0;
      paintSuggest();
    } else if (/(^|\s)@([^\s]*)$/.test(v)) {
      const q = v.match(/@([^\s]*)$/)[1].toLowerCase();
      state.suggest = state.tree.filter((t) => t.type === 'file' && t.rel.toLowerCase().includes(q)).slice(0, 12)
        .map((t) => ({ kind: 'file', name: t.rel, desc: 'file' }));
      state.suggestIdx = 0;
      paintSuggest();
    } else {
      $('suggest').classList.add('hidden');
    }
  }

  function paintSuggest() {
    const box = $('suggest');
    if (!state.suggest.length) { box.classList.add('hidden'); return; }
    box.classList.remove('hidden');
    box.innerHTML = state.suggest.map((s, i) => `<div class="row ${i === state.suggestIdx ? 'active' : ''}" data-i="${i}"><span>/${MD.escapeHtml(s.name)}</span><span class="usage">${MD.escapeHtml(s.desc)}</span></div>`).join('');
    box.querySelectorAll('.row').forEach((n) => n.onclick = () => applySuggest(state.suggest[Number(n.dataset.i)]));
  }

  function applySuggest(s) {
    if (!s) return;
    if (s.kind === 'slash') $('prompt').value = '/' + s.name + ' ';
    if (s.kind === 'file') $('prompt').value = $('prompt').value.replace(/@([^\s]*)$/, '@' + s.name + ' ');
    $('suggest').classList.add('hidden');
    $('prompt').focus();
  }

  function openSettings() {
    const s = state.settings;
    $('setTheme').value = s.theme;
    $('setFont').value = s.editor.fontSize;
    $('setTab').value = s.editor.tabSize;
    $('setWrap').checked = s.editor.wordWrap;
    $('setMinimap').checked = s.editor.minimap;
    $('setAutosave').checked = s.editor.autosave;
    $('setCompact').checked = s.chat.compactTools;
    $('setPerm').value = s.engine.permissionMode;
    $('setYolo').checked = s.engine.allowYolo;
    $('setVerbose').checked = s.engine.verbose;
    $('setBin').value = s.engine.extraBin || '';
    $('setEffort').value = s.engine.effort || '';
    API.invoke('engine:detect').then((d) => {
      $('engineInfo').textContent = d.ok ? `CLI ${d.version} — ${d.path}` : 'Command Code not detected';
    });
    $('settingsModal').classList.remove('hidden');
  }

  async function saveSettings() {
    const engine = {
      ...state.settings.engine,
      permissionMode: $('setPerm').value,
      allowYolo: $('setYolo').checked,
      verbose: $('setVerbose').checked,
      extraBin: $('setBin').value,
      effort: $('setEffort').value
    };
    if (engine.permissionMode === 'bypass' && !engine.allowYolo) {
      window.alert('Enable “Allow bypass” before selecting bypass.');
      return;
    }
    const patch = {
      theme: $('setTheme').value,
      editor: {
        fontSize: Number($('setFont').value),
        tabSize: Number($('setTab').value),
        wordWrap: $('setWrap').checked,
        minimap: $('setMinimap').checked,
        autosave: $('setAutosave').checked
      },
      chat: { ...state.settings.chat, compactTools: $('setCompact').checked },
      engine
    };
    state.settings = await API.invoke('settings:set', patch);
    applyTheme(state.settings.theme);
    Editor.setOptions(state.settings.editor);
    $('modeBtn').textContent = engine.permissionMode;
    $('permText').textContent = 'mode ' + engine.permissionMode;
    $('settingsModal').classList.add('hidden');
  }

  const PALETTE = [
    { id: 'open', label: 'Open Folder', run: () => openFolder() },
    { id: 'newchat', label: 'New Chat', run: newChat },
    { id: 'fork', label: 'Fork Chat', run: forkChat },
    { id: 'save', label: 'Save File', run: saveActive },
    { id: 'theme-m', label: 'Theme: Midnight', run: () => setTheme('midnight') },
    { id: 'theme-f', label: 'Theme: Futuristic', run: () => setTheme('futuristic') },
    { id: 'theme-r', label: 'Theme: Retro', run: () => setTheme('retro') },
    { id: 'theme-g', label: 'Theme: Graphite', run: () => setTheme('graphite') },
    { id: 'theme-l', label: 'Theme: Light', run: () => setTheme('light') },
    { id: 'mode-p', label: 'Permission: plan', run: () => setPerm('plan') },
    { id: 'mode-a', label: 'Permission: auto-accept', run: () => setPerm('auto-accept') },
    { id: 'mode-d', label: 'Permission: default', run: () => setPerm('default') },
    { id: 'restart', label: 'Restart Engine', run: () => API.invoke('engine:restart').then(paintSetup) },
    { id: 'login', label: 'Command Code: Login', run: () => API.invoke('engine:login') },
    { id: 'logout', label: 'Command Code: Logout', run: () => API.invoke('engine:logout') },
    { id: 'skills', label: 'Command Code: Skills', run: () => fillCmd('/skills') },
    { id: 'mcp', label: 'Command Code: MCP', run: () => fillCmd('/mcp') },
    { id: 'memory', label: 'Command Code: Memory', run: () => fillCmd('/memory') },
    { id: 'agents', label: 'Command Code: Agents', run: () => fillCmd('/agents') },
    { id: 'taste', label: 'Command Code: Taste', run: () => fillCmd('/taste') },
    { id: 'init', label: 'Command Code: Init', run: () => fillCmd('/init') },
    { id: 'goal', label: 'Command Code: Set Goal', run: () => fillCmd('/goal ') },
    { id: 'rewind', label: 'Command Code: Rewind (forwarded)', run: () => fillCmd('/rewind') },
    { id: 'logs', label: 'Open Logs Folder', run: () => API.invoke('logs:dir').then((d) => API.invoke('open-external', { path: d })) },
    { id: 'settings', label: 'Open Settings', run: openSettings }
  ];

  function fillCmd(s) { $('prompt').value = s; $('prompt').focus(); }
  function setTheme(t) {
    state.settings.theme = t;
    API.invoke('settings:set', { theme: t });
    applyTheme(t);
  }
  function setPerm(m) {
    state.settings.engine.permissionMode = m;
    API.invoke('settings:set', { engine: { ...state.settings.engine, permissionMode: m } });
    $('modeBtn').textContent = m;
    $('permText').textContent = 'mode ' + m;
  }

  function openPalette(items) {
    const list = items || PALETTE;
    $('palette').classList.remove('hidden');
    $('paletteInput').value = '';
    $('paletteInput').focus();
    let idx = 0;
    function render(q) {
      const f = list.filter((x) => x.label.toLowerCase().includes((q || '').toLowerCase()));
      $('paletteList').innerHTML = f.map((x, i) => `<div class="row ${i === idx ? 'active' : ''}" data-id="${x.id}">${MD.escapeHtml(x.label)}</div>`).join('');
      $('paletteList').querySelectorAll('.row').forEach((n) => n.onclick = () => run(n.dataset.id, f));
      return f;
    }
    let filtered = render('');
    $('paletteInput').oninput = () => { idx = 0; filtered = render($('paletteInput').value); };
    $('paletteInput').onkeydown = (e) => {
      if (e.key === 'ArrowDown') { idx = Math.min(idx + 1, filtered.length - 1); render($('paletteInput').value); e.preventDefault(); }
      if (e.key === 'ArrowUp') { idx = Math.max(idx - 1, 0); render($('paletteInput').value); e.preventDefault(); }
      if (e.key === 'Enter') { e.preventDefault(); run(filtered[idx] && filtered[idx].id, filtered); }
      if (e.key === 'Escape') $('palette').classList.add('hidden');
    };
    function run(id, f) {
      const item = (f || list).find((x) => x.id === id);
      $('palette').classList.add('hidden');
      if (item) item.run();
    }
  }

  function openQuickOpen() {
    const items = state.tree.filter((t) => t.type === 'file').map((t) => ({
      id: t.path,
      label: t.rel,
      run: () => openEditor(t.path, t.rel)
    }));
    openPalette(items);
  }

  function onMenu(msg) {
    if (msg.action === 'save') saveActive();
    if (msg.action === 'palette') openPalette();
    if (msg.action === 'quickOpen') openQuickOpen();
    if (msg.action === 'newChat') newChat();
    if (msg.action === 'restart') API.invoke('engine:restart').then(paintSetup);
    if (msg.action === 'openFolder' && msg.path) openFolder(msg.path);
  }

  setInterval(() => {
    if (state.settings && state.settings.editor.autosave && Editor.current() && Editor.isDirty(Editor.current())) saveActive();
  }, 5000);

  boot().catch((err) => {
    setStatus(err.message, 'error');
    console.error(err);
  });
})();
