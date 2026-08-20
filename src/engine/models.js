'use strict';

function parseModelList(text) {
  const lines = String(text || '').split(/\r?\n/);
  const models = [];
  const seen = new Set();
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (/^available|^models|^id\b|^name\b|^-+$|^#/i.test(trimmed)) continue;
    // Prefer tokens that look like model ids: provider/name or kebab with digits
    const tokens = trimmed.split(/[,\t ]+/).map((t) => t.replace(/[,"'`]/g, '')).filter(Boolean);
    let id = null;
    for (const t of tokens) {
      if (/^[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+$/.test(t)) { id = t; break; }
      if (/^[a-z0-9]+[-][a-z0-9.-]+$/i.test(t) && t.length > 4) { id = t; break; }
    }
    if (!id && /^[a-zA-Z0-9._/-]+$/.test(tokens[0] || '') && tokens[0].length > 2) id = tokens[0];
    if (!id || seen.has(id)) continue;
    seen.add(id);
    models.push({ id, label: prettyLabel(id), raw: trimmed });
  }
  return models;
}

function prettyLabel(id) {
  const tail = String(id).split('/').pop();
  return tail.replace(/[-_]/g, ' ');
}

module.exports = { parseModelList, prettyLabel };
