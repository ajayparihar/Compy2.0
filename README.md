# Compy 2.0 — Offline‑first Clipboard & Snippet Manager (Web)

Compy 2.0 is a lightweight, single‑page web app to save, organize, search, and quickly copy reusable text. It runs entirely in your browser with no backend — perfect for commands, credentials (with optional masking), canned responses, and templates.

- 100% client‑side: no accounts, no servers
- Works offline and can be installed as a PWA
- Local, private storage with easy import/export and optional auto‑backup

---

## Why use Compy
- Instant copy: click a card
- Tagging + fast search to find snippets quickly
- JSON/CSV import and export for backup/migration
- Optional profile label shown in the header
- Offline‑first by design; simple to run locally

## Key features
- Add/edit snippets with description, tags, and Sensitive masking (masked in UI, copies real text)
- One‑click copy with accessible snackbar confirmation
- Powerful search and tag filters; reorder with drag‑and‑drop (SortableJS)
- Import/Export JSON and CSV (deduplication and replace‑all options)
- Auto‑backups: in‑browser snapshots with rotation; optional file‑system backups on supported browsers

---

## Live demo / Getting the app
- Hosted: https://ajayparihar.github.io/Compy2.0/
- Local: open index.html in your browser, or run a static server (see Quick start)

Note on offline/PWA: When served over HTTPS or localhost, a service worker (sw.js) is registered to cache assets. Opening via file:// works fully with localStorage, but there’s no service worker.

## Quick start (local)
Option A — Open the file directly:
1) Clone or download this repository
2) Open index.html in a modern browser

Option B — Use a local web server:
1) Use any local web server like Python's `python -m http.server 3000` or similar
2) Open http://localhost:3000/index.html in your browser

---

## How to use (short manual)
1) Add a snippet
   - Click Add, enter Text and Description (required), optional Tags, and whether it’s Sensitive.
2) Copy quickly
   - Click a card or press Enter when focused. A snackbar confirms the copy.
3) Organize with tags and search
   - Filter by tags, search by text/description, and reorder by dragging cards.
4) Import / Export
   - JSON (recommended) and CSV supported.
   - If you already have data, you’ll be prompted to Add to existing or Replace all. Duplicates are skipped.
   - JSON shape (new format): { "profileName": string, "items": Item[] }
5) Backups
   - In‑browser snapshots are created automatically and rotated (keeps up to 10).
   - Optional file‑system backups (Choose Folder) use the File System Access API (Chrome/Edge and compatible). You stay in control — files are written only to the folder you pick.
6) Personalize
   - Pick from 26+ accessible themes with previews and categories. Your choice is saved locally.

### Keyboard shortcuts
- Search focus: / or Ctrl+F
- Copy selected card: Enter
- Tags input: Enter to add • Backspace to remove last tag when empty

---

## Data & privacy
- Storage: Browser localStorage under keys: compy.items, compy.theme, compy.profile, compy.backups, compy.filters
- Scope: Data stays on your device; exports create files you control
- Sensitive items: Masked on cards when marked Sensitive; copying still copies the real text
- Backups: Automatic in‑browser snapshots; optional file‑system backups when you explicitly choose a folder

---

## Import / Export reference
JSON (recommended):

```json
{
  "profileName": "Work",
  "items": [
    { "text": "ssh user@server", "desc": "SSH to prod", "sensitive": false, "tags": ["ssh", "prod"] },
    { "text": "API-KEY-123", "desc": "Service key", "sensitive": true, "tags": ["api", "secret"] }
  ]
}
```

Backward‑compatible (older JSON export):

```json
[
  { "text": "ssh user@server", "desc": "SSH to prod", "sensitive": false, "tags": ["ssh", "prod"] }
]
```

CSV:
- Optional header block for profile name
- Columns: text, desc, sensitive (0/1 or true/false), tags (pipe‑separated)

```csv
profileName
Work

text,desc,sensitive,tags
"ssh user@server","SSH to prod",0,"ssh|prod"
"API-KEY-123","Service key",1,"api|secret"
```

---

## Troubleshooting
- Clipboard blocked? Some browsers require user interaction; try clicking the card or using HTTPS/localhost.
- Import errors? Validate CSV columns (text, desc) or JSON structure.
- Backups not writing to a folder? File System Access API is required (Chrome/Edge); choose the folder again if permission expired.

---

## Development
Tech overview:
- Vanilla JavaScript (ES Modules), HTML, CSS
- SortableJS for drag‑and‑drop
- Service Worker (sw.js) for caching when served over HTTPS/localhost
- Optional file‑system backups via the File System Access API
- No build tools required - just open index.html in a browser

Browser support:
- Modern browsers (Chrome, Edge, Firefox, Safari). Some features (e.g., file‑system backups) require Chrome/Edge.

Accessibility:
- Theme palette designed for contrast; keyboard navigation, ARIA, and live regions are implemented throughout the UI.

---

## Links
- Website: https://ajayparihar.github.io/Compy2.0/
- Source: https://github.com/ajayparihar/Compy2.0
- Issues: https://github.com/ajayparihar/Compy2.0/issues
- Author: Bheb Developer — bhebdeveloper@gmail.com (GitHub: https://github.com/ajayparihar)

## License
MIT © 2025 Bheb Developer — see LICENSE for full text.
