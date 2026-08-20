'use strict';

function buildPrompt({ text, mentions = [], activeFile, selection, includeActive, includeSelection }) {
  const parts = [];
  const sent = { mentions: [], activeFile: null, selection: null };

  if (includeActive && activeFile && (activeFile.path || activeFile.relpath)) {
    const rel = activeFile.relpath || activeFile.path;
    parts.push(`@${rel}`);
    sent.activeFile = rel;
  }
  if (includeSelection && selection && selection.text && selection.path) {
    const rel = selection.relpath || selection.path;
    parts.push(
      `Selected lines ${selection.startLine}-${selection.endLine} from ${rel}:\n\`\`\`\n${selection.text}\n\`\`\``
    );
    sent.selection = {
      path: rel,
      startLine: selection.startLine,
      endLine: selection.endLine,
      lines: selection.endLine - selection.startLine + 1
    };
  }
  for (const m of mentions) {
    if (!m) continue;
    const rel = m.relpath || m.path || m;
    parts.push(`@${rel}`);
    sent.mentions.push(rel);
  }
  parts.push(String(text || ''));
  return { prompt: parts.filter(Boolean).join('\n\n'), sent };
}

function mapSlashToEngine(input, { permissionMode } = {}) {
  const raw = String(input || '');
  const m = raw.match(/^\/([^\s]+)(?:\s+([\s\S]*))?$/);
  if (!m) return { kind: 'prompt', prompt: raw };
  const cmd = m[1];
  const rest = (m[2] || '').trim();
  if (cmd === 'clear' || cmd === 'new') return { kind: 'new-session' };
  if (cmd === 'fork') return { kind: 'fork', name: rest || undefined };
  if (cmd === 'mode:plan' || (cmd === 'mode' && rest === 'plan') || (cmd === 'plan' && !rest)) {
    return { kind: 'set-mode', mode: 'plan', prompt: rest ? `/plan ${rest}` : null };
  }
  if (cmd === 'mode:auto-accept' || (cmd === 'mode' && rest === 'auto-accept')) {
    return { kind: 'set-mode', mode: 'auto-accept' };
  }
  if (cmd === 'mode:default' || (cmd === 'mode' && rest === 'default')) {
    return { kind: 'set-mode', mode: 'default' };
  }
  if (cmd === 'model' && rest) return { kind: 'set-model', model: rest };
  // Everything else is forwarded as the real prompt so Command Code handles it.
  return { kind: 'prompt', prompt: raw, slash: cmd, permissionMode };
}

module.exports = { buildPrompt, mapSlashToEngine };
