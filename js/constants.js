/**
 * Application constants and configuration
 */

/**
 * LocalStorage keys used by the application.
 * Changing these values will break backward compatibility with existing data.
 */
export const STORAGE_KEYS = {
  items: 'compy.items',
  theme: 'compy.theme',
  profile: 'compy.profile',
  backups: 'compy.backups',
  filters: 'compy.filters',
};

/**
 * UI configuration knobs that affect behavior and limits across the app.
 */
export const UI_CONFIG = {
  maxVisibleTags: 5,
  maxBackups: 10,
  backupInterval: 60 * 60 * 1000, // 1 hour
  backupDelay: 200, // ms
  snackbarDuration: 1500, // ms
  maxTextLength: 500,
  maxDescLength: 500,
  maxNameLength: 80,
  skeletonCount: 6,
};

/**
 * Inline SVG icon markup used by action buttons.
 */
export const ICONS = {
  edit: `<svg viewBox="0 0 24 24" aria-hidden="true">
    <path fill="none" stroke="currentColor" stroke-width="2" d="M3 21h4l11.5-11.5a2.121 2.121 0 0 0-3-3L4 18v3z"/>
    <path fill="none" stroke="currentColor" stroke-width="2" d="M14 6l4 4"/>
  </svg>`,
  delete: `<svg viewBox="0 0 24 24" aria-hidden="true">
    <path fill="none" stroke="currentColor" stroke-width="2" d="M3 6h18"/>
    <path fill="none" stroke="currentColor" stroke-width="2" d="M8 6V4h8v2"/>
    <path fill="none" stroke="currentColor" stroke-width="2" d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
    <path fill="none" stroke="currentColor" stroke-width="2" d="M10 11v6M14 11v6"/>
  </svg>`,
  copy: `<svg viewBox="0 0 24 24" aria-hidden="true">
    <rect x="9" y="9" width="11" height="11" rx="2" ry="2" fill="none" stroke="currentColor" stroke-width="2"/>
    <rect x="4" y="4" width="11" height="11" rx="2" ry="2" fill="none" stroke="currentColor" stroke-width="2"/>
  </svg>`
};

/**
 * Keyboard shortcut mappings used by the UI (normalized lower-case).
 */
export const KEYBOARD_SHORTCUTS = {
  search: ['/', 'ctrl+f'],
  copy: ['Enter'],
  addTag: ['Enter'],
  removeTag: ['Backspace'],
  save: ['Enter'],
  cancel: ['Escape'],
};

/**
 * Available theme names that can be applied via data-theme.
 */
export const THEME_LIST = [
  'dark-mystic-forest',
  'dark-crimson-night', 
  'dark-royal-elegance',
  'light-sunrise',
  'light-soft-glow',
  'light-floral-breeze'
];

/** Default theme applied on first load if none is saved. */
export const DEFAULT_THEME = 'dark-mystic-forest';
