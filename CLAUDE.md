# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm start          # Launch the Electron app
npm run build      # Build Windows 64-bit NSIS installer (outputs to dist/)
```

There are no lint, test, or type-check commands — this project has no TypeScript, ESLint, or test framework.

## Architecture

**Scrumly** is a frameless Electron desktop app (Windows 64-bit target) for personal Kanban/Scrum board management. The entire UI and application logic is contained in a single file:

- `main.js` — Electron main process. Creates a frameless `BrowserWindow`, handles IPC for window controls (minimize/maximize/close), enforces min size 900×600.
- `preload.js` — Context bridge exposing `window.winAPI` (minimize, maximize, close, isMaximized, onMaximized) to the renderer safely.
- `index.html` — The entire renderer: all CSS (custom properties design system), HTML structure, and JavaScript in one file. No build step; served directly.

### State and Data

Global state is a single object `S` (in `index.html`) with this shape:

```js
{
  boards: [{ id, name, columns: [{ id, name, color }], cards: [{ id, col, title, desc, priority, tags }] }],
  activeId: string
}
```

State is persisted to `localStorage` under the key `scrumly_v2` on every mutation. The `render()` function does a full DOM re-render on each state change. There is no virtual DOM or reactive framework.

### UI Structure

The layout has three main regions:
1. **Custom title bar** (36px) — logo, app name, and custom window controls
2. **Sidebar** (218px) — board list and "New Board" button
3. **Main area** — board header, columns (with cards), and an "Add Column" button

Two modal overlays exist: a **card editor** (title, description, priority, tags) and a **name prompt** (for renaming boards/columns).

### Drag and Drop

Card drag-and-drop between columns is implemented with native HTML5 drag events. A `drag` object in global state tracks the active card and source column.

### Default Board Setup

New boards are created with five default columns: Backlog, To Do, In Progress, In Review, Done. If no saved state exists on startup, demo data is loaded.
