# Scrumly

A personal Kanban / Scrum board desktop app built with Electron. Frameless, dark-themed, zero-dependency renderer — no bundler, no framework.

---

## Download

**[→ Download the latest installer from Releases](../../releases/latest)**

Windows x64 — one-click NSIS installer, no admin rights required. Your board data is never sent anywhere; everything is stored locally.

---

## Features

- **Multiple boards** — create, rename, and delete boards from the sidebar
- **Columns** — fully customizable; each column has a color-coded pip and an editable name
- **Cards** — title, description, priority (low / medium / high), comma-separated tags, and links
- **Links on cards** — paste any URL and it renders as a clickable chip. Discord, GitHub, and Figma links get service-specific icons. Clicking opens the native app if installed, otherwise falls back to the browser
- **Drag & drop** — move cards between columns with HTML5 drag events
- **Progress bar** — completion percentage (cards in "Done" columns vs total)
- **Colored tags** — each tag is consistently hashed to a hue so the same tag always gets the same color
- **Persistent state** — everything saved to `localStorage` on every mutation; survives restarts
- **Custom title bar** — native minimize / maximize / close with Windows 11 close-button behavior
- **Dark theme** — warm-black palette (`#111110`) with a blue accent (`#5470F5`)

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

# 4. Build the Windows installer (outputs to dist/)
npm run build
```

The app runs directly from source — `index.html` is served as-is by Electron. The installer is produced by electron-builder and requires `assets/icon.ico` to be present.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Shell | [Electron](https://electronjs.org) 28 |
| Renderer | Vanilla HTML + CSS + JS (no framework) |
| Fonts | Bricolage Grotesque · DM Sans via Google Fonts |
| Packaging | electron-builder 24 · Windows x64 NSIS installer |
| Persistence | `localStorage` (`scrumly_v2` key) |

---

## File Structure

```
scrumly/
├── main.js        — Electron main process
├── preload.js     — Context bridge (window.winAPI)
├── index.html     — Entire renderer: CSS + HTML + JavaScript
├── package.json
└── assets/
    └── icon.ico   — App icon (required for builds)
```

---

## Architecture

### Main Process (`main.js`)

- Creates a frameless `BrowserWindow` (min 900×600, default up to 1360×860)
- Handles IPC for window controls: `win-minimize`, `win-maximize`, `win-close`, `win-is-maximized`
- Handles `shell-open-url` IPC: converts `https://` URLs to native protocol URLs when the app is installed, falls back to the browser

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

Exposes `window.winAPI` to the renderer via `contextBridge`:

```js
window.winAPI.minimize()
window.winAPI.maximize()        // toggles maximize/restore
window.winAPI.close()
window.winAPI.isMaximized()     // → Promise<boolean>
window.winAPI.onMaximized(cb)   // subscribe to maximize state changes
window.winAPI.openURL(url)      // open a URL (app or browser)
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
      columns: [{ id, name, color }],
      cards:   [{ id, col, title, desc, priority, tags, links }]
    }
  ],
  activeId: string
}
```

Persisted to `localStorage` under `scrumly_v2` on every mutation. On first launch a sample "Website Redesign" demo board is loaded.

**Render cycle:** every mutation calls `render()` → `renderSidebar()` + `renderMain()` + `save()`. Full DOM re-render, no virtual DOM.

---

## Keyboard Shortcuts

| Key | Context | Action |
|---|---|---|
| `Enter` | Card title field | Save card |
| `Enter` | Link URL field | Add link |
| `Enter` | Name modal input | Confirm |
| `Escape` | Card modal | Close without saving |
| `Escape` | Name modal | Cancel |

---

## Design Tokens

All colors, radii, and shadows are CSS custom properties on `:root` in `index.html`:

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

- Storage key: `localStorage.scrumly_v2`
- All data stays on your machine — no accounts, no sync, no telemetry
- No migrations exist. If the schema changes in a future version, clearing `scrumly_v2` from DevTools resets to the demo board
