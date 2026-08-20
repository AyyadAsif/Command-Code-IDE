(function (global) {
  let monacoReady = null;
  let editor = null;
  let fallback = null;
  let currentModel = null;
  const models = new Map();
  const fallbackBuffers = new Map();

  function monacoPath() {
    if (window.ccide) return '../../node_modules/monaco-editor/min/vs';
    return '/monaco/min/vs';
  }

  function loadMonaco() {
    if (monacoReady) return monacoReady;
    monacoReady = new Promise((resolve, reject) => {
      if (global.monaco) { resolve(global.monaco); return; }
      const script = document.createElement('script');
      script.src = monacoPath() + '/loader.js';
      script.onload = () => {
        global.require.config({ paths: { vs: monacoPath() } });
        global.require(['vs/editor/editor.main'], () => resolve(global.monaco));
      };
      script.onerror = () => reject(new Error('Monaco failed to load'));
      document.head.appendChild(script);
    });
    return monacoReady;
  }

  function themeName(appTheme) {
    if (appTheme === 'light') return 'vs';
    if (appTheme === 'retro') return 'cc-retro';
    if (appTheme === 'graphite') return 'cc-graphite';
    if (appTheme === 'futuristic') return 'cc-futuristic';
    return 'cc-midnight';
  }

  function defineThemes(monaco) {
    monaco.editor.defineTheme('cc-midnight', {
      base: 'vs-dark', inherit: true,
      rules: [],
      colors: { 'editor.background': '#0d1524', 'editor.foreground': '#e6edf7' }
    });
    monaco.editor.defineTheme('cc-futuristic', {
      base: 'vs-dark', inherit: true,
      rules: [],
      colors: { 'editor.background': '#081018', 'editor.foreground': '#e8f6ff' }
    });
    monaco.editor.defineTheme('cc-retro', {
      base: 'vs-dark', inherit: true,
      rules: [],
      colors: { 'editor.background': '#16100b', 'editor.foreground': '#f3e6c8' }
    });
    monaco.editor.defineTheme('cc-graphite', {
      base: 'vs-dark', inherit: true,
      rules: [],
      colors: { 'editor.background': '#18191d', 'editor.foreground': '#ececec' }
    });
  }

  function langFor(file) {
    const ext = (file.split('.').pop() || '').toLowerCase();
    const map = {
      js: 'javascript', mjs: 'javascript', cjs: 'javascript', ts: 'typescript', tsx: 'typescript', jsx: 'javascript',
      json: 'json', css: 'css', html: 'html', htm: 'html', md: 'markdown', py: 'python',
      rs: 'rust', go: 'go', java: 'java', kt: 'kotlin', c: 'c', h: 'c', cpp: 'cpp', cc: 'cpp',
      cs: 'csharp', rb: 'ruby', php: 'php', sh: 'shell', yml: 'yaml', yaml: 'yaml', xml: 'xml', sql: 'sql'
    };
    return map[ext] || 'plaintext';
  }

  function mountFallback(el) {
    el.innerHTML = '';
    fallback = document.createElement('textarea');
    fallback.style.cssText = 'width:100%;height:100%;border:0;resize:none;padding:12px;background:var(--editor-bg);color:var(--text);font-family:ui-monospace,Consolas,monospace;font-size:14px;outline:none;';
    fallback.addEventListener('input', () => {
      if (!currentModel) return;
      const rec = fallbackBuffers.get(currentModel);
      if (rec) {
        rec.dirty = fallback.value !== rec.original;
        API.emit('editor:dirty', { path: currentModel, dirty: rec.dirty });
      }
    });
    el.appendChild(fallback);
    return fallback;
  }

  async function mount(el, appTheme) {
    try {
      const monaco = await loadMonaco();
      defineThemes(monaco);
      editor = monaco.editor.create(el, {
        value: '',
        language: 'plaintext',
        theme: themeName(appTheme),
        automaticLayout: true,
        minimap: { enabled: false },
        fontSize: 14,
        tabSize: 2,
        wordWrap: 'on',
        scrollBeyondLastLine: false,
        renderLineHighlight: 'line',
        padding: { top: 8 }
      });
      return editor;
    } catch {
      return mountFallback(el);
    }
  }

  function openFile(path, text, appTheme) {
    currentModel = path;
    if (fallback) {
      let rec = fallbackBuffers.get(path);
      if (!rec) {
        rec = { original: text, dirty: false, value: text };
        fallbackBuffers.set(path, rec);
      } else if (!rec.dirty) {
        rec.value = text;
        rec.original = text;
      }
      fallback.value = rec.value || rec.original;
      return;
    }
    const monaco = global.monaco;
    if (!monaco || !editor) return;
    let rec = models.get(path);
    if (!rec) {
      const model = monaco.editor.createModel(text, langFor(path), monaco.Uri.file(path));
      rec = { model, original: text, dirty: false };
      models.set(path, rec);
      model.onDidChangeContent(() => {
        rec.dirty = model.getValue() !== rec.original;
        API.emit('editor:dirty', { path, dirty: rec.dirty });
      });
    } else if (!rec.dirty) {
      rec.model.setValue(text);
      rec.original = text;
    }
    editor.setModel(rec.model);
    monaco.editor.setTheme(themeName(appTheme));
  }

  function getValue() {
    if (fallback) return fallback.value;
    return editor ? editor.getValue() : '';
  }
  function getSelection() {
    if (fallback) {
      const s = fallback.selectionStart;
      const e = fallback.selectionEnd;
      if (s === e) return null;
      const text = fallback.value.slice(s, e);
      const startLine = fallback.value.slice(0, s).split('\n').length;
      const endLine = fallback.value.slice(0, e).split('\n').length;
      return { text, startLine, endLine };
    }
    if (!editor) return null;
    const sel = editor.getSelection();
    if (!sel || sel.isEmpty()) return null;
    const text = editor.getModel().getValueInRange(sel);
    return { text, startLine: sel.startLineNumber, endLine: sel.endLineNumber };
  }
  function markSaved(path, text) {
    const rec = models.get(path);
    if (rec) { rec.original = text; rec.dirty = false; }
    const f = fallbackBuffers.get(path);
    if (f) { f.original = text; f.value = text; f.dirty = false; }
  }
  function isDirty(path) {
    const rec = models.get(path);
    if (rec) return !!rec.dirty;
    const f = fallbackBuffers.get(path);
    return !!(f && f.dirty);
  }
  function applyExternal(path, text) {
    const rec = models.get(path);
    if (rec && editor) {
      if (rec.dirty) return { applied: false, dirty: true };
      rec.model.setValue(text);
      rec.original = text;
      return { applied: true, dirty: false };
    }
    const f = fallbackBuffers.get(path);
    if (f) {
      if (f.dirty) return { applied: false, dirty: true };
      f.value = text;
      f.original = text;
      if (currentModel === path && fallback) fallback.value = text;
      return { applied: true, dirty: false };
    }
    return { applied: false, dirty: false };
  }
  function setOptions(opts) {
    if (editor) {
      editor.updateOptions({
        fontSize: opts.fontSize,
        tabSize: opts.tabSize,
        wordWrap: opts.wordWrap ? 'on' : 'off',
        minimap: { enabled: !!opts.minimap }
      });
    }
    if (fallback && opts.fontSize) fallback.style.fontSize = opts.fontSize + 'px';
  }
  function setTheme(appTheme) {
    if (global.monaco) global.monaco.editor.setTheme(themeName(appTheme));
  }
  function gotoLine(n) {
    if (editor) {
      editor.revealLineInCenter(n);
      editor.setPosition({ lineNumber: n, column: 1 });
      editor.focus();
    }
  }
  function current() { return currentModel; }
  function close(path) {
    const rec = models.get(path);
    if (rec) { rec.model.dispose(); models.delete(path); }
    fallbackBuffers.delete(path);
    if (currentModel === path) currentModel = null;
  }

  global.Editor = {
    mount, openFile, getValue, getSelection, markSaved, isDirty, applyExternal,
    setOptions, setTheme, gotoLine, current, close, loadMonaco
  };
})(window);
