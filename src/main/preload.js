'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('ccide', {
  invoke: (channel, payload) => ipcRenderer.invoke('ccide', { channel, payload }),
  on: (event, cb) => {
    const listener = (_e, data) => cb(data);
    ipcRenderer.on(event, listener);
    return () => ipcRenderer.removeListener(event, listener);
  }
});
