# Contributing to Compy 2.0

Thanks for your interest in improving Compy 2.0! This project is a lightweight, vanilla JS app with a focus on clarity, performance, and accessibility.

- Source code lives under `js/` with ES modules (except `js/compy.js`, a single-file variant).
- A cache-first Service Worker provides offline support (`sw.js`).

## Code style

- Modern JavaScript (ES2020+). Prefer `const`/`let`, arrow functions, and early returns.
- Keep functions small and cohesive. Reuse helpers in `js/utils.js` rather than re-implementing.
- UI work that reflows the DOM should batch updates via `requestAnimationFrame`.
- Do not mutate the DOM and state at the same time without intent; update state first, then render.
- Avoid global side effects at module top-level beyond necessary setup.

## Comments & documentation

We rely on JSDoc for API-level documentation and targeted inline comments for intent (the “why”).

- Use JSDoc for modules, classes, and exported functions: include `@param` types and `@returns` when applicable.
- Prefer explaining “why” and edge cases over restating “what” the code obviously does.
- Keep comments concise and close to the logic they clarify.
- Define and reuse typedefs for shared shapes:
  - `AppItem`, `AppState` (see `js/state.js`)
  - `StateListener` callback for state subscriptions
- When you introduce new event payloads or structured objects, add a `@typedef` (or `@callback`) and reference it from JSDoc.

## State management

Centralized in `js/state.js`:

- Do not write to `localStorage` directly from other modules; use the state APIs (`saveState`, `updateProfile`, etc.).
- Subscribe to changes with `subscribe(listener)`; the `listener` receives the latest immutable snapshot.
- Backups are debounced (see `UI_CONFIG.backupDelay`) and pruned to `UI_CONFIG.maxBackups`.

Shape:
- `AppItem`: `{ id, text, desc, sensitive, tags[] }`
- `AppState`: `{ items[], filterTags[], search, editingId, profileName }`

## UI orchestration

- `js/app.js` owns UI wiring: initialization, event handlers, import/export, modals, and rendering.
- Use `requestAnimationFrame` for list rendering to keep interactions smooth.
- Tag chips and card actions must stay keyboard-accessible; handle `Enter` and `Escape` thoughtfully.
- Theme switching applies `data-theme` on `<html>` and persists to `localStorage`.

## Import/Export

- JSON: `{ profileName, items }` (legacy exports were an array of items).
- CSV: Optional metadata block with a single `profileName` column, followed by item headers and rows.
- Keep `app.js` and `compy.js` behavior aligned for import/export changes.

## Service Worker

- Strategy: cache-first for static assets, runtime caching for same-origin GETs, offline fallback to `index.html`.
- When changing static assets or their paths, bump `CACHE_NAME` in `sw.js` to invalidate old caches.
- Do not cache cross-origin requests.

## Accessibility

- Respect ARIA attributes and maintain focus management for modals and drawers.
- Provide keyboard access for all actions (e.g., `Enter` to copy, `Esc` to close modals).

## Pull Request checklist

- [ ] JSDoc added/updated with accurate `@param`/`@returns` and relevant typedefs
- [ ] No unnecessary console noise; errors/warnings are actionable
- [ ] Manual sanity pass: add/edit/delete items, search/filter, import/export (JSON/CSV), backups modal, theme switch, keyboard shortcuts
- [ ] Service Worker cache name bumped if asset list changed
- [ ] No functional regressions introduced by documentation-only changes

## Commit messages

Use clear, imperative descriptions (or Conventional Commits). Examples:
- `docs: add JSDoc and intent comments to app initialization`
- `docs(state): document StateListener and backup lifecycle`

