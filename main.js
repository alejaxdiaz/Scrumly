const { app, BrowserWindow, ipcMain, screen, shell } = require('electron');
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
    backgroundColor: '#111110',
    icon:      path.join(__dirname, 'assets', 'icon.ico'),
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

// Maps an HTTPS URL to its native app protocol equivalent, if one exists.
// Returns { appUrl, protocol } or null if no app mapping is known.
function toAppUrl(url) {
  try {
    const u = new URL(url);
    const h = u.hostname.replace('www.', '');

    if (h === 'discord.com' || h === 'discordapp.com')
      return { appUrl: 'discord://discord.com' + u.pathname + u.search, protocol: 'discord://' };

    if (h === 'discord.gg')
      return { appUrl: 'discord://discord.com/invite' + u.pathname, protocol: 'discord://' };

    if (h === 'figma.com')
      return { appUrl: 'figma://' + h + u.pathname + u.search, protocol: 'figma://' };

    if (h === 'notion.so' || h === 'notion.site')
      return { appUrl: 'notion://' + u.pathname.replace(/^\//, ''), protocol: 'notion://' };

    if (h === 'linear.app')
      return { appUrl: 'linear://' + h + u.pathname, protocol: 'linear://' };

    if (h === 'slack.com')
      return { appUrl: url.replace('https://', 'slack://'), protocol: 'slack://' };

  } catch (_) {}
  return null;
}

ipcMain.on('shell-open-url', async (_, url) => {
  const result = toAppUrl(url);
  if (result) {
    // Check if the app is actually installed before trying its protocol.
    // app.getApplicationNameForProtocol returns '' when nothing handles it,
    // avoiding the "Windows can't open this" error dialog.
    const appName = app.getApplicationNameForProtocol(result.protocol);
    if (appName) {
      try {
        await shell.openExternal(result.appUrl);
        return;
      } catch (_) { /* app installed but open failed — fall through */ }
    }
  }
  // Fallback: open the original https:// URL in the default browser
  shell.openExternal(url).catch(() => {});
});
