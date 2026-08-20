'use strict';

const { spawn } = require('child_process');
const readline = require('readline');
const { parseLine, normalizeEvent, mapExit, parseStderrSessionId } = require('./parser');
const { isWin } = require('./discover');

let seq = 1;

function spawnCommandCode({ bin, args, cwd, env, onEvent, onLog, onClose }) {
  const id = `run-${seq++}`;
  const useShell = isWin() && /\.cmd$/i.test(bin);
  const child = spawn(bin, args, {
    cwd,
    env: { ...process.env, ...(env || {}), FORCE_COLOR: '0', NO_COLOR: '1' },
    windowsHide: true,
    shell: useShell,
    stdio: ['ignore', 'pipe', 'pipe']
  });

  let stderrBuf = '';
  let closed = false;
  let resultEvent = null;

  const rl = readline.createInterface({ input: child.stdout });
  rl.on('line', (line) => {
    if (onLog) onLog({ stream: 'stdout', line });
    const parsed = parseLine(line);
    if (!parsed) return;
    const norm = normalizeEvent(parsed);
    if (parsed.kind === 'result') resultEvent = parsed;
    if (onEvent && norm) onEvent(norm);
  });

  child.stderr.on('data', (buf) => {
    const text = buf.toString('utf8');
    stderrBuf += text;
    for (const line of text.split(/\r?\n/)) {
      if (line && onLog) onLog({ stream: 'stderr', line });
    }
    const sid = parseStderrSessionId(text);
    if (sid && onEvent) onEvent({ type: 'SessionStarted', sessionId: sid, source: 'stderr' });
  });

  child.on('error', (err) => {
    if (onEvent) onEvent({ type: 'EngineError', error: err.message });
  });

  child.on('close', (code, signal) => {
    if (closed) return;
    closed = true;
    rl.close();
    const mapped = mapExit(code);
    if (onClose) {
      onClose({
        id,
        code,
        signal,
        mapped,
        stderr: stderrBuf,
        result: resultEvent
      });
    }
  });

  function cancel() {
    if (closed) return;
    try {
      if (isWin()) {
        spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' });
      } else {
        child.kill('SIGINT');
        setTimeout(() => {
          try { child.kill('SIGKILL'); } catch { /* gone */ }
        }, 1500);
      }
    } catch {
      try { child.kill('SIGKILL'); } catch { /* gone */ }
    }
  }

  return { id, child, cancel };
}

function runOnce({ bin, args, cwd, timeoutMs = 20000 }) {
  const useShell = isWin() && /\.cmd$/i.test(bin);
  return new Promise((resolve) => {
    const child = spawn(bin, args, {
      cwd,
      env: { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1' },
      windowsHide: true,
      shell: useShell,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    let stdout = '';
    let stderr = '';
    const t = setTimeout(() => {
      try { child.kill('SIGKILL'); } catch { /* */ }
    }, timeoutMs);
    child.stdout.on('data', (d) => { stdout += d.toString('utf8'); });
    child.stderr.on('data', (d) => { stderr += d.toString('utf8'); });
    child.on('error', (err) => {
      clearTimeout(t);
      resolve({ ok: false, error: err.message, stdout, stderr, code: -1 });
    });
    child.on('close', (code) => {
      clearTimeout(t);
      resolve({ ok: code === 0, code, stdout, stderr });
    });
  });
}

module.exports = { spawnCommandCode, runOnce };
