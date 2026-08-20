'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');

function isWin() {
  return process.platform === 'win32';
}

function existsFile(p) {
  try {
    return fs.existsSync(p) && fs.statSync(p).isFile();
  } catch {
    return false;
  }
}

function which(cmd) {
  const finder = isWin() ? 'where' : 'which';
  const r = spawnSync(finder, [cmd], { encoding: 'utf8', timeout: 8000, windowsHide: true });
  if (r.status !== 0) return [];
  return String(r.stdout || '')
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((p) => {
      const base = path.basename(p).toLowerCase();
      // Never treat the Windows command interpreter as Command Code.
      if (base === 'cmd.exe' || base === 'cmd') return false;
      return true;
    });
}

function npmGlobalBin() {
  const r = spawnSync(isWin() ? 'npm.cmd' : 'npm', ['bin', '-g'], {
    encoding: 'utf8',
    timeout: 10000,
    windowsHide: true,
    shell: isWin()
  });
  if (r.status !== 0) return null;
  return String(r.stdout || '').trim() || null;
}

function candidateNames() {
  if (isWin()) return ['command-code.cmd', 'command-code.exe', 'cmdc.cmd', 'cmdc.exe', 'commandcode.cmd'];
  return ['command-code', 'cmdc', 'commandcode', 'cmd'];
}

function lookInDir(dir) {
  if (!dir) return [];
  const out = [];
  for (const name of candidateNames()) {
    const p = path.join(dir, name);
    if (existsFile(p)) out.push(p);
  }
  return out;
}

function extraSearchDirs() {
  const home = os.homedir();
  const dirs = [];
  if (isWin()) {
    const appdata = process.env.APPDATA || path.join(home, 'AppData', 'Roaming');
    dirs.push(path.join(appdata, 'npm'));
    dirs.push(path.join(home, 'AppData', 'Roaming', 'npm'));
  } else {
    dirs.push('/usr/local/bin', '/usr/bin', path.join(home, '.npm-global', 'bin'));
    dirs.push(path.join(home, '.local', 'bin'));
  }
  const npmBin = npmGlobalBin();
  if (npmBin) dirs.push(npmBin);
  return dirs;
}

function detectInstallation(explicitPath) {
  const tried = [];
  const envBin = process.env.COMMAND_CODE_BIN || process.env.COMMANDCODE_BIN;
  const ordered = [];
  if (explicitPath) ordered.push(explicitPath);
  if (envBin) ordered.push(envBin);

  for (const name of isWin() ? ['command-code', 'cmdc', 'commandcode'] : ['command-code', 'cmdc', 'commandcode', 'cmd']) {
    for (const p of which(name)) ordered.push(p);
  }
  for (const dir of extraSearchDirs()) {
    for (const p of lookInDir(dir)) ordered.push(p);
  }

  const seen = new Set();
  for (const p of ordered) {
    if (!p || seen.has(p)) continue;
    seen.add(p);
    tried.push(p);
    if (existsFile(p) || whichLooksRunnable(p)) {
      return { ok: true, path: p, tried };
    }
  }
  return { ok: false, path: null, tried };
}

function whichLooksRunnable(p) {
  try {
    fs.accessSync(p, fs.constants.X_OK);
    return true;
  } catch {
    return existsFile(p);
  }
}

function getVersion(bin) {
  if (!bin) return { ok: false, version: null, raw: '' };
  const r = spawnSync(bin, ['--version'], {
    encoding: 'utf8',
    timeout: 15000,
    windowsHide: true,
    shell: isWin() && /\.cmd$/i.test(bin)
  });
  const raw = String(r.stdout || r.stderr || '').trim();
  const m = raw.match(/(\d+\.\d+\.\d+[\w.-]*)/);
  return { ok: r.status === 0, version: m ? m[1] : raw.split('\n')[0] || null, raw, status: r.status };
}

function getHelp(bin) {
  if (!bin) return '';
  const r = spawnSync(bin, ['--help'], {
    encoding: 'utf8',
    timeout: 15000,
    windowsHide: true,
    shell: isWin() && /\.cmd$/i.test(bin)
  });
  return String(r.stdout || '') + String(r.stderr || '');
}

function getCapabilities(bin) {
  const help = getHelp(bin);
  const has = (flag) => help.includes(flag);
  return {
    print: has('--print') || has('-p'),
    outputFormatJson: /output-format/.test(help) && /json/.test(help),
    resume: has('--resume'),
    continue: has('--continue'),
    forkSession: has('--fork-session'),
    listModels: has('--list-models'),
    permissionMode: has('--permission-mode'),
    autoAccept: has('--auto-accept'),
    plan: has('--plan'),
    yolo: has('--yolo'),
    trust: has('--trust'),
    skipOnboarding: has('--skip-onboarding'),
    modelFlag: has('--model'),
    addDir: has('--add-dir'),
    verbose: has('--verbose'),
    statusJson: true,
    rawHelp: help.slice(0, 8000)
  };
}

module.exports = {
  detectInstallation,
  getVersion,
  getHelp,
  getCapabilities,
  which,
  isWin,
  candidateNames
};
