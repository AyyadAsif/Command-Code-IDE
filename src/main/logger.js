'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

function logsDir() {
  const base = process.env.COMMAND_CODE_IDE_LOGS || path.join(os.homedir(), '.commandcode-ide', 'logs');
  fs.mkdirSync(base, { recursive: true });
  return base;
}

function redact(line) {
  return String(line)
    .replace(/(api[_-]?key|token|password|secret|authorization)\s*[:=]\s*\S+/gi, '$1=[redacted]')
    .replace(/Bearer\s+\S+/gi, 'Bearer [redacted]');
}

class Logger {
  constructor() {
    this.dir = logsDir();
    this.file = path.join(this.dir, 'ide.log');
    this.lines = [];
  }

  write(level, msg, extra) {
    const rec = {
      ts: new Date().toISOString(),
      level,
      msg: redact(msg),
      extra: extra ? redact(typeof extra === 'string' ? extra : JSON.stringify(extra).slice(0, 2000)) : undefined
    };
    const line = JSON.stringify(rec);
    this.lines.push(rec);
    if (this.lines.length > 2000) this.lines = this.lines.slice(-1000);
    try {
      fs.appendFileSync(this.file, line + '\n');
      rotate(this.file);
    } catch { /* ignore */ }
    return rec;
  }

  info(msg, extra) { return this.write('info', msg, extra); }
  warn(msg, extra) { return this.write('warn', msg, extra); }
  error(msg, extra) { return this.write('error', msg, extra); }
}

function rotate(file) {
  try {
    const st = fs.statSync(file);
    if (st.size < 2_000_000) return;
    const bak = file + '.1';
    if (fs.existsSync(bak)) fs.unlinkSync(bak);
    fs.renameSync(file, bak);
  } catch { /* */ }
}

module.exports = { Logger, logsDir, redact };
