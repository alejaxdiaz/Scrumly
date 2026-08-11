# Scrumly

A personal Kanban / Scrum board desktop app built with Electron. Frameless, dark-themed, zero-dependency renderer — no bundler, no framework.

---

## Download

**[→ Download the latest installer from Releases](../../releases/latest)**

Windows x64 (NSIS installer) and macOS (DMG, Apple Silicon + Intel). Your board data is never sent anywhere; everything is stored locally.

---

## Features

- **Multiple boards** — create, rename, and delete boards from the sidebar
- **Columns** — fully customizable; each column has a color-coded pip and an inline-editable name (click to rename, Enter or blur to save)
- **Cards** — title, description, priority (low / medium / high), comma-separated tags, and links
- **Links on cards** — paste any URL and it renders as a clickable chip. Discord, GitHub, and Figma links get service-specific icons. Clicking opens the native app if installed, otherwise falls back to the browser
- **Drag & drop** — move cards between columns or reorder within a column; a blue indicator line shows exactly where the card will land
- **Priority sort** — each column defaults to sorting cards high → medium → low automatically
- **Deadlines (ETA)** — optional date per card (in the card editor and Quick Add), shown as a colored chip on the card (Today / Tomorrow / upcoming / overdue). Cards due *today* are pinned to the top of their column automatically
- **Custom ordering** — dragging a card to a specific position locks that column into custom order; a "sort by priority" button appears on hover to reset it
- **Progress bar** — completion percentage (cards in "Done" columns vs total)
- **Colored tags** — each tag is consistently hashed to a hue so the same tag always gets the same color
- **Persistent state** — everything saved to `localStorage` on every mutation; survives restarts
- **Custom title bar** — native minimize / maximize / close with Windows 11 close-button behavior
- **Dark theme** — warm-black palette (`#111110`) with a blue accent (`#5470F5`)
- **Quick Add popup** — global shortcut opens a floating card-creation window from any app, on any screen

---

## Quick Add

Press **`Ctrl + Numpad 0`** from anywhere (macOS: **`⌘ + Shift + Space`** — Macs have no numpad) — even while Discord, a browser, or any other app is in focus — to open the Quick Add popup.

The popup lets you pick a board and column, then fill in all card fields (title, description, priority, tags, links) without switching away from what you're doing. The card is added to Scrumly immediately on save.

The popup stays open when you click away (so you can grab a Discord link or look something up), and only closes when you explicitly save or dismiss it.

**Changing the shortcut:** click the **Quick Add** button at the bottom of the sidebar → **Rebind** → press any key combination. The new shortcut is saved to the platform user-data dir (`%AppData%\Scrumly\` on Windows, `~/Library/Application Support/Scrumly/` on macOS) as `scrumly-settings.json` and persists across restarts.

---

## Build Locally

**Prerequisites:** [Node.js](https://nodejs.org) (LTS) + npm

```bash
# 1. Clone the repo
git clone https://github.com/YOUR_USERNAME/scrumly.git
cd scrumly

# 2. Install dependencies
npm install

# 3. Run in development (no build step needed)
npm start

# 4. Build an installer for your current platform (outputs to dist/)
npm run build

# Or build for a specific platform
npm run build:win   # Windows x64 NSIS installer
npm run build:mac   # macOS DMG (arm64 + x64)
```

The app runs directly from source — `index.html` is served as-is by Electron. Installers are produced by electron-builder; Windows builds require `assets/scrumly_icon.ico`, macOS builds derive `.icns` from `assets/scrumly_icon.png` automatically.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Shell | [Electron](https://electronjs.org) 28 |
| Renderer | Vanilla HTML + CSS + JS (no framework) |
| Fonts | Bricolage Grotesque · DM Sans via Google Fonts |
| Packaging | electron-builder 24 · NSIS (Windows x64) · DMG (macOS arm64 + x64) |
| Persistence | `localStorage` (`scrumly_v2` key) · settings in platform user-data dir |

---

## File Structure

```
scrumly/
├── main.js              — Electron main process, global shortcut, quick-add window
├── preload.js           — Context bridge (window.winAPI) for the main window
├── preload-quick-add.js — Context bridge (window.quickAddAPI) for the popup
├── index.html           — Entire renderer: CSS + HTML + JavaScript
├── quick-add.html       — Quick Add popup: board/column select + card form
├── package.json
└── assets/
    ├── scrumly_icon.ico  — Windows icon (required for Windows builds)
    └── scrumly_icon.png  — macOS/Dock icon, 1024×1024 (required for macOS builds)
```

---

## Architecture

### Main Process (`main.js`)

- Creates a frameless `BrowserWindow` (min 900×600, default up to 1360×860)
- Creates a hidden quick-add `BrowserWindow` at startup (pre-loaded so the first shortcut press is instant)
- Registers a global keyboard shortcut (`Control+num0` by default) via Electron's `globalShortcut`
- Reads live board state from the main window via `webContents.executeJavaScript` and forwards it to the popup on each open
- Receives new cards from the popup and forwards them to the main window via IPC
- Persists the configured shortcut to `%AppData%\Scrumly\scrumly-settings.json`
- Handles `shell-open-url` IPC: converts `https://` URLs to native protocol URLs when the app is installed, falls back to the browser

**IPC channels:**

| Channel | Direction | Description |
|---|---|---|
| `win-minimize/maximize/close` | renderer → main | Window controls |
| `win-is-maximized` | renderer ↔ main | Maximize state query |
| `win-maximized` | main → renderer | Maximize state push |
| `shell-open-url` | renderer → main | Open URL in app or browser |
| `quick-add-card` | popup → main → renderer | Add card from popup |
| `quick-add-close` | popup → main | Hide popup |
| `get-quick-add-shortcut` | renderer ↔ main | Read current shortcut |
| `set-quick-add-shortcut` | renderer → main | Register new shortcut |
| `add-card-from-popup` | main → renderer | Deliver card to main window |
| `boards-data` | main → popup | Fresh state on each open |
| `shortcut` | main → popup | Current shortcut label |

**Native protocol mapping:**

| URL domain | Opens as |
|---|---|
| `discord.com`, `discord.gg` | `discord://…` |
| `figma.com` | `figma://…` |
| `notion.so`, `notion.site` | `notion://…` |
| `linear.app` | `linear://…` |
| `slack.com` | `slack://…` |
| Everything else | Browser |

### Preload (`preload.js`)

Exposes `window.winAPI` to the main renderer via `contextBridge`:

```js
window.winAPI.minimize()
window.winAPI.maximize()          // toggles maximize/restore
window.winAPI.close()
window.winAPI.isMaximized()       // → Promise<boolean>
window.winAPI.onMaximized(cb)     // subscribe to maximize state changes
window.winAPI.openURL(url)        // open a URL (app or browser)
window.winAPI.onAddCard(cb)       // receive cards from the quick-add popup
window.winAPI.getShortcut()       // → Promise<string> current accelerator
window.winAPI.setShortcut(acc)    // → Promise<boolean> register new shortcut
```

### Quick-Add Preload (`preload-quick-add.js`)

Exposes `window.quickAddAPI` to the popup renderer:

```js
window.quickAddAPI.close()           // hide the popup
window.quickAddAPI.saveCard(data)    // send card to main process
window.quickAddAPI.onBoardsData(cb)  // receive boards state on each open
window.quickAddAPI.onShortcut(cb)    // receive shortcut label updates
```

### Renderer (`index.html`)

Everything in one file: design tokens, CSS, HTML skeleton, and all application logic.

**State shape:**

```js
S = {
  boards: [
    {
      id: string,
      name: string,
      columns: [{ id, name, color, sortMode? }],  // sortMode: 'custom' | absent (defaults to priority sort)
      cards:   [{ id, col, title, desc, priority, tags, links, deadline? }]  // deadline: 'YYYY-MM-DD' or null
    }
  ],
  activeId: string
}
```

Persisted to `localStorage` under `scrumly_v2` on every mutation. On first launch a set of demo boards is loaded.

**Render cycle:** every mutation calls `render()` → `renderSidebar()` + `renderMain()` + `save()`. Full DOM re-render, no virtual DOM. Columns without `sortMode: 'custom'` have their cards sorted high → medium → low at render time (cards whose deadline is today are pinned above everything else); custom-ordered columns render cards in their stored array order.

---

## Keyboard Shortcuts

| Key | Context | Action |
|---|---|---|
| `Ctrl + Numpad 0` / `⌘ + Shift + Space` (macOS) | Global (any app) | Open Quick Add popup |
| `Enter` | Card title field | Save card |
| `Enter` | Link URL field | Add link |
| `Enter` | Name modal input | Confirm |
| `Escape` | Card modal | Close without saving |
| `Escape` | Name modal | Cancel |
| `Escape` | Quick Add popup | Close popup |
| Click column name | Column header | Rename inline (blur or Enter to save) |
| Sort icon (hover) | Custom-ordered column | Reset column to priority sort |

The global shortcut is configurable — click **Quick Add** in the sidebar and press **Rebind**.

---

## Design Tokens

All colors, radii, and shadows are CSS custom properties on `:root` in `index.html` (and mirrored in `quick-add.html`):

| Token | Value | Role |
|---|---|---|
| `--bg` | `#111110` | App background |
| `--sidebar-bg` | `#141412` | Sidebar background |
| `--card-bg` | `#1E1E1C` | Card surface |
| `--surface` | `#1A1A18` | Modal surface |
| `--accent` | `#5470F5` | Primary blue |
| `--p-low` | `#22C55E` | Low priority green |
| `--p-med` | `#F59E0B` | Medium priority amber |
| `--p-high` | `#EF4444` | High priority red |

---

## Data & Privacy

- Board data: `localStorage.scrumly_v2` (stays on your machine)
- Settings: platform user-data dir (`%AppData%\Scrumly\scrumly-settings.json` on Windows, `~/Library/Application Support/Scrumly/scrumly-settings.json` on macOS)
- No accounts, no sync, no telemetry
- No migrations exist. If the schema changes in a future version, clearing `scrumly_v2` from DevTools resets to the demo boards
