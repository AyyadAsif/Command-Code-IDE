'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('./ws-lite');
const { createServices } = require('./services');

const PORT = Number(process.env.PORT || 4173);
const HOST = '0.0.0.0';
const ROOT = path.join(__dirname, '..');
const REPO = path.join(__dirname, '../..');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.map': 'application/json'
};

function send(res, code, body, headers) {
  res.writeHead(code, { 'Cache-Control': 'no-store', ...(headers || {}) });
  res.end(body);
}

function safeJoin(base, reqPath) {
  const decoded = decodeURIComponent((reqPath || '/').split('?')[0]);
  const full = path.normalize(path.join(base, decoded.replace(/^\/+/, '')));
  if (!full.startsWith(base)) return null;
  return full;
}

const services = createServices();
const wss = new WebSocketServer();

services.runtime.broadcast = (event, data) => {
  wss.broadcast(JSON.stringify({ event, data }));
};

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (url.pathname === '/api' && req.method === 'POST') {
      let raw = '';
      req.on('data', (c) => { raw += c; if (raw.length > 8_000_000) req.destroy(); });
      req.on('end', async () => {
        try {
          const { channel, payload } = JSON.parse(raw || '{}');
          if (channel === 'dialog:openFolder') {
            send(res, 200, JSON.stringify({ path: process.env.WORKSPACE || null }), { 'Content-Type': 'application/json' });
            return;
          }
          const map = await services.handlers();
          const fn = map[channel];
          if (!fn) {
            send(res, 404, JSON.stringify({ error: channel }), { 'Content-Type': 'application/json' });
            return;
          }
          const result = await fn(payload || {});
          send(res, 200, JSON.stringify(result ?? null), { 'Content-Type': 'application/json' });
        } catch (err) {
          send(res, 500, JSON.stringify({ error: err.message }), { 'Content-Type': 'application/json' });
        }
      });
      return;
    }

    let filePath = null;
    if (url.pathname === '/' || url.pathname === '/index.html') {
      filePath = path.join(ROOT, 'renderer', 'index.html');
    } else if (url.pathname.startsWith('/monaco/')) {
      filePath = safeJoin(path.join(REPO, 'node_modules', 'monaco-editor'), url.pathname.slice('/monaco'.length));
    } else if (url.pathname.startsWith('/assets/')) {
      filePath = safeJoin(path.join(REPO, 'assets'), url.pathname.slice('/assets'.length));
    } else {
      filePath = safeJoin(path.join(ROOT, 'renderer'), url.pathname);
    }
    if (!filePath || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      send(res, 404, 'Not found');
      return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    fs.createReadStream(filePath).pipe(res);
  } catch (err) {
    send(res, 500, err.message);
  }
});

server.on('upgrade', (req, socket, head) => wss.handleUpgrade(req, socket, head));

server.listen(PORT, HOST, () => {
  services.detect();
  console.log(`Command Code IDE preview on http://0.0.0.0:${PORT}`);
});
