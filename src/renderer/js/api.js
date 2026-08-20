(function (global) {
  const listeners = new Map();

  function on(event, cb) {
    if (!listeners.has(event)) listeners.set(event, new Set());
    listeners.get(event).add(cb);
    return () => listeners.get(event).delete(cb);
  }
  function emit(event, data) {
    const set = listeners.get(event);
    if (set) for (const cb of set) cb(data);
  }

  async function invoke(channel, payload) {
    if (global.ccide && global.ccide.invoke) {
      return global.ccide.invoke(channel, payload);
    }
    const res = await fetch('/api', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel, payload })
    });
    const text = await res.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = { error: text }; }
    if (!res.ok) throw new Error((data && data.error) || res.statusText);
    if (data && data.error && res.status >= 400) throw new Error(data.error);
    return data;
  }

  function connectWs() {
    if (global.ccide && global.ccide.on) {
      global.ccide.on('agent:event', (d) => emit('agent:event', d));
      global.ccide.on('agent:log', (d) => emit('agent:log', d));
      global.ccide.on('agent:done', (d) => emit('agent:done', d));
      global.ccide.on('engine:status', (d) => emit('engine:status', d));
      global.ccide.on('fs:change', (d) => emit('fs:change', d));
      global.ccide.on('menu', (d) => emit('menu', d));
      return;
    }
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    const ws = new WebSocket(`${proto}://${location.host}/`);
    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        emit(msg.event, msg.data);
      } catch { /* */ }
    };
  }

  global.API = { invoke, on, emit, connectWs };
})(window);
