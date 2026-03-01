const { app, BrowserWindow, ipcMain, screen } = require('electron');
const path = require('path');

let win;

function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  win = new BrowserWindow({
    width:     Math.min(1360, width),
    height:    Math.min(860, height),
    minWidth:  900,
    minHeight: 600,
    frame:     false,           // custom title bar
    transparent: false,
    backgroundColor: '#EFEDE8',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.loadFile('index.html');

  win.once('ready-to-show', () => win.show());

  // Notify renderer whenever maximize state changes
  win.on('maximize',   () => win.webContents.send('win-maximized', true));
  win.on('unmaximize', () => win.webContents.send('win-maximized', false));
  win.on('restore',    () => win.webContents.send('win-maximized', false));
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => app.quit());

// ── IPC: window controls ──────────────────────────────────
ipcMain.on('win-minimize', () => win?.minimize());

ipcMain.on('win-maximize', () => {
  if (!win) return;
  win.isMaximized() ? win.unmaximize() : win.maximize();
});

ipcMain.on('win-close', () => win?.close());

ipcMain.handle('win-is-maximized', () => win?.isMaximized() ?? false);
