# Scrumly

A personal Kanban board desktop app built with Electron. Dark-themed, zero-dependency, no framework.

---

## Download

**[Download the latest release](../../releases/latest)**

| Platform | Format |
|---|---|
| Windows x64 | [Scrumly Setup 1.0.0.exe](../../releases/download/v1.1.0/Scrumly-Setup-1.0.0.exe) |
| macOS (Apple Silicon + Intel) | [Scrumly-1.0.0.dmg](../../releases/download/v1.1.0/Scrumly-1.0.0.dmg) |

All data stays on your machine. No accounts, no sync, no telemetry.

---

## Features

### Boards & Columns
- **Multiple boards** — create, rename, and delete from the sidebar
- **Custom columns** — add, rename, delete; each has a color-coded pip
- **Drag & drop** — move cards between columns or reorder within a column
- **Priority sort** — columns auto-sort high → medium → low by default
- **Custom ordering** — drag a card to a specific position to lock order; a sort button appears on hover to reset

### Cards
- **Title, description, priority** (low / medium / high), **tags**, and **links**
- **Colored tags** — same tag always gets the same color
- **Links** — paste any URL; Discord, GitHub, Figma, Notion, Linear, and Slack get service-specific icons and open natively when possible
- **Deadlines (ETA)** — optional date per card, shown as a colored chip (Today / Tomorrow / upcoming / overdue); cards due today are pinned to the top

### Archive
- **Per-board archives** with two categories: **Completed** and **Later**
- **Archive a card** — hover any card, click the archive icon, and choose where to move it
- **Archive All** — Done columns show an "Archive All" button on hover to archive everything at once
- **Archive panel** — click the Archive button in the board header to browse, restore, or permanently delete archived cards
- **Restore** — sends the card back to its original column automatically

### Quick Add
- **Global shortcut** — press **Ctrl + Numpad 0** (macOS: **Cmd + Shift + Space**) from any app to open a floating card creator
- Pick a board and column, fill in all fields, save — the card appears instantly
- **Configurable shortcut** — click Quick Add in the sidebar → Rebind

### Other
- **Progress bar** — shows completion percentage per board
- **Persistent state** — saved to localStorage on every change
- **Custom title bar** — frameless window with native controls
- **Dark theme** — warm-black palette with blue accent

---

## Keyboard Shortcuts

| Key | Context | Action |
|---|---|---|
| `Ctrl + Numpad 0` / `Cmd + Shift + Space` | Global | Open Quick Add |
| `Enter` | Card title / Name input | Confirm |
| `Escape` | Any modal / popup | Close |
| Click column name | Column header | Rename inline |
| Sort icon (hover) | Custom-ordered column | Reset to priority sort |

---

## Build Locally

**Prerequisites:** [Node.js](https://nodejs.org) LTS + npm

```bash
git clone https://github.com/alejaxdiaz/Scrumly.git
cd Scrumly
npm install
npm start            # Run in dev mode
npm run build:win    # Windows x64 installer
npm run build:mac    # macOS DMG (arm64 + x64)
```

The app runs directly from source — `index.html` is served as-is by Electron.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Shell | [Electron](https://electronjs.org) 28 |
| Renderer | Vanilla HTML + CSS + JS |
| Fonts | Bricolage Grotesque · DM Sans (Google Fonts) |
| Packaging | electron-builder 24 |
| CI/CD | GitHub Actions — builds Windows and macOS on tag push |

---

## File Structure

```
Scrumly/
├── main.js               — Electron main process
├── preload.js            — Context bridge for main window
├── preload-quick-add.js  — Context bridge for Quick Add popup
├── index.html            — Entire renderer (CSS + HTML + JS)
├── quick-add.html        — Quick Add popup
├── package.json
├── .github/workflows/
│   └── release.yml       — CI: builds + GitHub Release on tag push
└── assets/
    ├── scrumly_icon.ico  — Windows icon
    └── scrumly_icon.png  — macOS icon
```

---

## Releasing

Releases are automated via GitHub Actions. Push a tag to build and publish both installers:

```bash
git tag v1.1.0
git push origin v1.1.0
```

This triggers the workflow at `.github/workflows/release.yml`, which builds the Windows `.exe` and macOS `.dmg` and creates a GitHub Release with both files attached.

---

## Data & Privacy

- Board data: `localStorage` (`scrumly_v2` key) — stays on your machine
- Settings: `%AppData%\Scrumly\scrumly-settings.json` (Windows) or `~/Library/Application Support/Scrumly/scrumly-settings.json` (macOS)
- No accounts, no sync, no telemetry
