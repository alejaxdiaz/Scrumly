const { app, BrowserWindow, ipcMain, screen, shell, globalShortcut } = require('electron');
const path = require('path');
const fs   = require('fs');

let win;
let quickAddWin = null;

// ── Single-instance lock ───────────────────────────────────
const gotLock = app.requestSingleInstanceLock();

if (!gotLock) {
  // A second instance tried to launch — quit immediately so the
  // existing instance keeps sole control of the LevelDB lock.
  app.quit();
} else {
  // Forward second-instance activations to the running window.
  app.on('second-instance', () => {
    if (!win) return;
    if (win.isMinimized()) win.restore();
    win.show();
    win.focus();
  });
}

const QA_W = 430;
const QA_H = 590;

// ── Settings ──────────────────────────────────────────────
const settingsPath = path.join(app.getPath('userData'), 'scrumly-settings.json');

function loadSettings() {
  try { return JSON.parse(fs.readFileSync(settingsPath, 'utf8')); } catch(_) {}
  return { quickAddShortcut: 'Control+num0' };
}

function saveSettings(s) {
  try { fs.writeFileSync(settingsPath, JSON.stringify(s)); } catch(_) {}
}

let settings = loadSettings();

// ── Quick-add window ──────────────────────────────────────
function createQuickAddWindow() {
  return new Promise(resolve => {
    quickAddWin = new BrowserWindow({
      width:  QA_W,
      height: QA_H,
      frame:           false,
      transparent:     false,
      backgroundColor: '#111110',
      alwaysOnTop:     true,
      resizable:       false,
      show:            false,
      skipTaskbar:     true,
      webPreferences: {
        preload: path.join(__dirname, 'preload-quick-add.js'),
        contextIsolation: true,
        nodeIntegration:  false,
      },
    });

    quickAddWin.loadFile('quick-add.html');
    quickAddWin.once('ready-to-show', resolve);
    quickAddWin.on('closed', () => { quickAddWin = null; });
    // No blur-to-hide: user may switch to Discord/browser to copy a link
  });
}

async function openQuickAdd() {
  if (!win) return;

  // Re-create only if somehow destroyed (e.g. user closed via task manager)
  if (!quickAddWin || quickAddWin.isDestroyed()) {
    await createQuickAddWindow();
  }

  // Pull live state from the main window
  let boardsData;
  try {
    boardsData = await win.webContents.executeJavaScript('JSON.stringify(S)');
  } catch(_) { return; }

  // Center on whichever display the cursor is on
  const pt = screen.getCursorScreenPoint();
  const { workArea } = screen.getDisplayNearestPoint(pt);
  quickAddWin.setBounds({
    x:      Math.round(workArea.x + (workArea.width  - QA_W) / 2),
    y:      Math.round(workArea.y + (workArea.height - QA_H) / 2),
    width:  QA_W,
    height: QA_H,
  });

  quickAddWin.webContents.send('boards-data', boardsData);
  quickAddWin.webContents.send('shortcut',    settings.quickAddShortcut);
  quickAddWin.show();
  quickAddWin.focus();
}

// ── Shortcut management ───────────────────────────────────
function registerShortcut(accelerator) {
  globalShortcut.unregisterAll();
  if (!accelerator) return false;
  try { return globalShortcut.register(accelerator, openQuickAdd); }
  catch(_) { return false; }
}

// ── Main window ───────────────────────────────────────────
function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  win = new BrowserWindow({
    width:     Math.min(1360, width),
    height:    Math.min(860, height),
    minWidth:  900,
    minHeight: 600,
    frame:     false,
    transparent: false,
    backgroundColor: '#111110',
    icon:      path.join(__dirname, 'assets', 'scrumly_icon.ico'),
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.loadFile('index.html');
  win.once('ready-to-show', () => win.show());

  win.on('maximize',   () => win.webContents.send('win-maximized', true));
  win.on('unmaximize', () => win.webContents.send('win-maximized', false));
  win.on('restore',    () => win.webContents.send('win-maximized', false));
}

app.whenReady().then(async () => {
  settings = loadSettings();
  createWindow();
  // Pre-create hidden so the first shortcut press is instant
  await createQuickAddWindow();
  registerShortcut(settings.quickAddShortcut);
});

app.on('window-all-closed', () => {
  globalShortcut.unregisterAll();
  app.quit();
});

// ── IPC: window controls ──────────────────────────────────
ipcMain.on('win-minimize', () => win?.minimize());

ipcMain.on('win-maximize', () => {
  if (!win) return;
  win.isMaximized() ? win.unmaximize() : win.maximize();
});

ipcMain.on('win-close', () => {
  if (quickAddWin && !quickAddWin.isDestroyed()) quickAddWin.destroy();
  win?.close();
});

ipcMain.handle('win-is-maximized', () => win?.isMaximized() ?? false);

// Maps an HTTPS URL to its native app protocol equivalent, if one exists.
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
    const appName = app.getApplicationNameForProtocol(result.protocol);
    if (appName) {
      try { await shell.openExternal(result.appUrl); return; } catch (_) {}
    }
  }
  shell.openExternal(url).catch(() => {});
});

// ── IPC: quick-add ────────────────────────────────────────
ipcMain.on('quick-add-card', (_, cardData) => {
  if (win) win.webContents.send('add-card-from-popup', cardData);
  if (quickAddWin && !quickAddWin.isDestroyed()) quickAddWin.hide();
});

ipcMain.on('quick-add-close', () => {
  if (quickAddWin && !quickAddWin.isDestroyed()) quickAddWin.hide();
});

ipcMain.handle('get-quick-add-shortcut', () => settings.quickAddShortcut);

ipcMain.handle('set-quick-add-shortcut', (_, accelerator) => {
  const ok = registerShortcut(accelerator);
  if (ok) {
    settings.quickAddShortcut = accelerator;
    saveSettings(settings);
    // Notify quick-add window of the new shortcut label (if open)
    if (quickAddWin && !quickAddWin.isDestroyed()) {
      quickAddWin.webContents.send('shortcut', accelerator);
    }
  }
  return ok;
});
