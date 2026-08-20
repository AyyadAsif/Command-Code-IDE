'use strict';

const { app, BrowserWindow, ipcMain, dialog, Menu, shell } = require('electron');
const path = require('path');
const { createServices } = require('./services');

let win;
const services = createServices();

function createWindow() {
  win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 960,
    minHeight: 640,
    backgroundColor: '#0b1220',
    title: 'Command Code IDE',
    icon: path.join(__dirname, '../../assets/icon.png'),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  services.runtime.broadcast = (event, data) => {
    if (win && !win.isDestroyed()) win.webContents.send(event, data);
  };

  win.loadFile(path.join(__dirname, '../renderer/index.html'));
  win.on('closed', () => { win = null; });
}

function buildMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        { label: 'Open Folder…', accelerator: 'CmdOrCtrl+O', click: () => openFolder() },
        { label: 'Save', accelerator: 'CmdOrCtrl+S', click: () => win && win.webContents.send('menu', { action: 'save' }) },
        { type: 'separator' },
        { label: 'Exit', role: 'quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' }, { role: 'redo' }, { type: 'separator' },
        { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { label: 'Command Palette', accelerator: 'CmdOrCtrl+Shift+P', click: () => win && win.webContents.send('menu', { action: 'palette' }) },
        { label: 'Quick Open', accelerator: 'CmdOrCtrl+P', click: () => win && win.webContents.send('menu', { action: 'quickOpen' }) },
        { type: 'separator' },
        { role: 'toggleDevTools' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Command Code',
      submenu: [
        { label: 'New Chat', click: () => win && win.webContents.send('menu', { action: 'newChat' }) },
        { label: 'Restart Engine', click: () => win && win.webContents.send('menu', { action: 'restart' }) },
        { type: 'separator' },
        { label: 'Open Logs Folder', click: () => shell.openPath(require('./logger').logsDir()) }
      ]
    },
    {
      label: 'Help',
      submenu: [
        { label: 'Command Code Docs', click: () => shell.openExternal('https://commandcode.ai/docs') },
        { label: 'Open Logs Folder', click: () => shell.openPath(require('./logger').logsDir()) }
      ]
    }
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

async function openFolder() {
  const res = await dialog.showOpenDialog(win, { properties: ['openDirectory'] });
  if (!res.canceled && res.filePaths[0]) {
    win.webContents.send('menu', { action: 'openFolder', path: res.filePaths[0] });
  }
}

app.whenReady().then(() => {
  buildMenu();
  createWindow();
  services.detect();
});

app.on('window-all-closed', () => {
  services.stopWatch();
  services.adapter.cancelAll();
  app.quit();
});

ipcMain.handle('ccide', async (_e, { channel, payload }) => {
  if (channel === 'dialog:openFolder') {
    const res = await dialog.showOpenDialog(win, { properties: ['openDirectory'] });
    if (res.canceled) return null;
    return res.filePaths[0];
  }
  const map = await services.handlers();
  const fn = map[channel];
  if (!fn) throw new Error(`Unknown channel ${channel}`);
  return fn(payload || {});
});
