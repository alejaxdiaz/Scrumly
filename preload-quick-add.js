const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('quickAddAPI', {
  close:        ()       => ipcRenderer.send('quick-add-close'),
  saveCard:     (data)   => ipcRenderer.send('quick-add-card', data),
  onBoardsData: (cb)     => ipcRenderer.on('boards-data', (_, raw) => cb(raw)),
  onShortcut:   (cb)     => ipcRenderer.on('shortcut',    (_, acc) => cb(acc)),
});
