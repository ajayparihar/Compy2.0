## Compy 2.0 – Simple Clipboard & Snippet Manager (Web)

### What it is
Compy is a lightweight, single‑page web app to collect and quickly copy reusable text:
- Commands and shell snippets
- API keys or credentials (with optional masking)
- Frequently used messages and templates

Everything runs client‑side in your browser. Your data is stored locally via localStorage—no servers, no accounts.

### Why use it
- Instant copy: click a card or press Enter to copy
- Organize with tags and search fast
- Import/export JSON or CSV for easy backup/migration
- Themes and a profile label to personalize
- Works offline; no build step, no backend

### Key features
- Add/edit items with description, tags, and "Sensitive" masking
- Quick search and tag filters
- One‑click copy with a snackbar confirmation
- JSON/CSV import and export
- Auto‑backups (keeps recent snapshots locally)
- Multiple color themes (dark and light)
- Optional profile name displayed in the header

---

### Usage
- Web (hosted): https://ajayparihar.github.io/Compy2.0/
- Local: open index.html directly in your browser, or serve the folder with any static server.
- Offline: Compy is fully client-side and works offline. When served over HTTPS or localhost, a service worker (/sw.js) is registered to cache assets. When opened as a file://, there is no service worker, but all functionality still works via localStorage.

#### Script options (choose one)
Default (recommended, widest compatibility):
```html
<script src="js/compy.js" defer></script>
```

ES modules variant (optional, modern browsers):
```html
<script type="module" src="js/main.js"></script>
<!-- Optionally keep a fallback for legacy browsers -->
<script src="js/compy.js" defer nomodule></script>
```

### Data & privacy
- Storage: Browser localStorage under keys like compy.items, compy.theme, compy.profile, compy.backups, compy.filters.
- Scope: Data stays on your device; exporting creates files you control.
- Sensitive items: Card text is masked in the UI when marked Sensitive; copying still copies the real text.

### Keyboard shortcuts
- Search focus: Press / (slash) or Ctrl+F
- Copy: Select a card and press Enter
- Tags input: Enter to add; Backspace to remove last chip when empty

### Themes
- Built-in: dark-mystic-forest, dark-crimson-night, dark-royal-elegance, light-sunrise, light-soft-glow, light-floral-breeze
- Change from the header dropdown; your pick is saved to localStorage (compy.theme).

### Import/Export formats
- JSON
  - New format: { profileName: string, items: Item[] }
  - Backward‑compatible: plain array of items

Example (JSON, recommended):

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

- CSV
  - Optional first block for profile name
  - Columns: text, desc, sensitive (0/1 or true/false), tags (pipe‑separated)

Example (CSV):

```csv
profileName
Work

text,desc,sensitive,tags
"ssh user@server","SSH to prod",0,"ssh|prod"
"API-KEY-123","Service key",1,"api|secret"
```

### Backups & client‑side storage
- All data is local to your browser (no server). Keys used:
  - compy.items, compy.profile, compy.theme, compy.filters, compy.backups
- Auto‑backup behavior:
  - On every change, a quick snapshot is saved (debounced).
  - Additionally, an hourly backup runs automatically.
  - The app keeps the 10 most recent snapshots in compy.backups.
- You can view/download backups from the Backups option in the UI.
- Important: Clearing site data, using incognito, switching browsers/devices, or some browser cleanups can remove localStorage. Regularly export JSON/CSV to keep your own copies.

### Tips
- Use tags to group environments (prod|staging|dev) or topics (git|docker|ssh)
- Keep descriptions concise so search stays effective
- Export regularly if the data is important to you

### Troubleshooting
- Clipboard blocked? Some browsers require user interaction; try clicking the card or using HTTPS/local files.
- Import errors? Ensure required columns (text, desc) exist in CSV, or valid JSON structure.

### Links
- Website: https://ajayparihar.github.io/Compy2.0/
- Source: https://github.com/ajayparihar/Compy2.0
- Issues: https://github.com/ajayparihar/Compy2.0/issues
- Author: Bheb Developer — bhebdeveloper@gmail.com (GitHub: https://github.com/ajayparihar)

### License
MIT — see LICENSE for full text.

