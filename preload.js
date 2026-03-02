const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('winAPI', {
  minimize:      ()         => ipcRenderer.send('win-minimize'),
  maximize:      ()         => ipcRenderer.send('win-maximize'),
  close:         ()         => ipcRenderer.send('win-close'),
  isMaximized:   ()         => ipcRenderer.invoke('win-is-maximized'),
  onMaximized:   (callback) => ipcRenderer.on('win-maximized', (_, val) => callback(val)),
  openURL:       (url)      => ipcRenderer.send('shell-open-url', url),
  // Quick-add / settings
  onAddCard:     (callback) => ipcRenderer.on('add-card-from-popup', (_, data) => callback(data)),
  getShortcut:   ()         => ipcRenderer.invoke('get-quick-add-shortcut'),
  setShortcut:   (acc)      => ipcRenderer.invoke('set-quick-add-shortcut', acc),
});
