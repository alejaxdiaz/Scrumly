const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('winAPI', {
  minimize:      ()         => ipcRenderer.send('win-minimize'),
  maximize:      ()         => ipcRenderer.send('win-maximize'),
  close:         ()         => ipcRenderer.send('win-close'),
  isMaximized:   ()         => ipcRenderer.invoke('win-is-maximized'),
  onMaximized:   (callback) => ipcRenderer.on('win-maximized', (_, val) => callback(val)),
});
