(function (global) {
  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function render(md) {
    const src = String(md || '');
    const parts = [];
    const re = /```([\w+-]*)\n([\s\S]*?)```/g;
    let last = 0;
    let m;
    while ((m = re.exec(src))) {
      parts.push({ t: 'text', v: src.slice(last, m.index) });
      parts.push({ t: 'code', lang: m[1], v: m[2] });
      last = m.index + m[0].length;
    }
    parts.push({ t: 'text', v: src.slice(last) });
    return parts.map((p) => {
      if (p.t === 'code') {
        return `<pre><code data-lang="${escapeHtml(p.lang)}">${escapeHtml(p.v)}</code></pre>`;
      }
      let t = escapeHtml(p.v);
      t = t.replace(/`([^`]+)`/g, '<code>$1</code>');
      t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
      t = t.replace(/\*([^*]+)\*/g, '<em>$1</em>');
      t = t.replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');
      t = t.replace(/^### (.*)$/gm, '<h3>$1</h3>');
      t = t.replace(/^## (.*)$/gm, '<h2>$1</h2>');
      t = t.replace(/^# (.*)$/gm, '<h1>$1</h1>');
      t = t.replace(/^- (.*)$/gm, '<li>$1</li>');
      t = t.split(/\n{2,}/).map((block) => {
        if (block.startsWith('<h') || block.startsWith('<pre') || block.startsWith('<li')) return block;
        return `<p>${block.replace(/\n/g, '<br>')}</p>`;
      }).join('');
      return t;
    }).join('');
  }

  global.MD = { render, escapeHtml };
})(window);
