/**
 * Application Constants and Configuration
 * 
 * This module centralizes all configuration values, storage keys, UI settings,
 * and other constants used throughout the Compy 2.0 application. This approach
 * provides several benefits:
 * 
 * - Single source of truth for configuration
 * - Easy maintenance and updates
 * - Consistent naming conventions
 * - Clear documentation of all settings
 * - Type safety through JSDoc annotations
 * 
 * @fileoverview Central configuration and constants module
 * @version 2.0
 * @author Bheb Developer
 * @since 2025
 */

/**
 * LocalStorage Keys Configuration
 * 
 * These keys are used to store application data in the browser's localStorage.
 * Each key is namespaced with 'compy.' to avoid conflicts with other applications.
 * 
 * ⚠️ IMPORTANT: Changing these values will break backward compatibility with
 * existing user data. If you must change them, implement a migration strategy.
 * 
 * Storage Strategy:
 * - All keys use a consistent 'compy.' prefix for namespacing
 * - Items are stored as JSON arrays for efficient serialization
 * - User preferences are stored separately for faster access
 * - Backups use automatic rotation to prevent storage bloat
 * 
 * Security Considerations:
 * - No sensitive data is stored in localStorage (client-side only)
 * - All data is validated before storage to prevent corruption
 * - Backup system provides data recovery options
 * 
 * @constant {Object} STORAGE_KEYS
 * @property {string} items - Key for storing snippet items array (primary data)
 * @property {string} theme - Key for storing selected theme preference
 * @property {string} profile - Key for storing user profile information
 * @property {string} backups - Key for storing automatic backup snapshots
 * @property {string} filters - Key for storing active filter preferences
 */
export const STORAGE_KEYS = {
  /** Main application data: array of snippet items with full content */
  items: 'compy.items',
  
  /** User's selected theme preference (string identifier) */
  theme: 'compy.theme',
  
  /** User profile settings including display name and preferences */
  profile: 'compy.profile',
  
  /** Automatic backup snapshots for data recovery and version history */
  backups: 'compy.backups',
  
  /** Active filter tags and search preferences for session persistence */
  filters: 'compy.filters',
};

/**
 * User Interface Configuration
 * 
 * These settings control various UI behaviors, limits, and timing throughout
 * the application. They are tuned for optimal user experience and performance.
 * 
 * @constant {Object} UI_CONFIG
 * @property {number} maxVisibleTags - Maximum tag chips shown on cards before "more" indicator
 * @property {number} maxBackups - Maximum number of backup snapshots to retain
 * @property {number} backupInterval - Interval between automatic backups (milliseconds)
 * @property {number} backupDelay - Debounce delay for backup creation after changes
 * @property {number} snackbarDuration - How long success/error messages are shown
 * @property {number} maxTextLength - Maximum characters allowed in snippet content
 * @property {number} maxDescLength - Maximum characters allowed in snippet description
 * @property {number} maxNameLength - Maximum characters allowed in profile name
 * @property {number} skeletonCount - Number of skeleton cards shown during loading
 */
export const UI_CONFIG = {
  /** Maximum tag chips visible on cards before showing "+N more" */
  maxVisibleTags: 5,
  
  /** Maximum backup snapshots to keep (older ones are auto-deleted) */
  maxBackups: 10,
  
  /** Automatic backup interval: 1 hour (3,600,000 milliseconds) */
  backupInterval: 60 * 60 * 1000,
  
  /** Debounce delay for backup creation after user changes (200ms) */
  backupDelay: 200,
  
  /** Duration to show snackbar notifications (1500ms = 1.5 seconds) */
  snackbarDuration: 1500,
  
  /** Maximum characters allowed in snippet text content */
  maxTextLength: 500,
  
  /** Maximum characters allowed in snippet description */
  maxDescLength: 500,
  
  /** Maximum characters allowed in user profile name */
  maxNameLength: 80,
  
  /** Number of skeleton loading cards to show while rendering */
  skeletonCount: 6,

  /** When true, enables development logging in modules that respect this flag */
  debug: false,
};

/**
 * SVG Icon Library and Destructive Symbols
 * 
 * Inline SVG icons and standardized Unicode symbols used throughout the application. 
 * These icons are embedded directly in the JavaScript to avoid additional HTTP requests 
 * and ensure they are always available, even offline.
 * 
 * Benefits of inline SVG:
 * - No additional network requests
 * - Inherits color from CSS (currentColor)
 * - Scalable and crisp at any size
 * - Accessible with proper aria-hidden attributes
 * - Works consistently across all browsers
 * 
 * Destructive Action Standards:
 * - Close/Cancel: ✕ (U+2715) for modal close, cancel actions
 * - Remove/Clear: ✕ (U+2715) for field clearing, tag removal
 * - Delete: SVG trash icon for permanent deletion actions
 * 
 * @constant {Object} ICONS
 * @property {string} edit - Pencil/edit icon for modifying snippets
 * @property {string} delete - Trash can icon for deleting snippets
 * @property {string} copy - Clipboard icon for copying snippet content
 * @property {string} expand - Expand/fullscreen icon for expanding cards
 * @property {string} close - Standardized close symbol for consistent destructive actions
 * @property {string} remove - Standardized remove symbol for tag/field clearing
 */
export const ICONS = {
  /** Edit/pencil icon - Used for snippet modification actions */
  edit: `<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false" role="img">
    <path fill="none" stroke="currentColor" stroke-width="2" d="M3 21h4l11.5-11.5a2.121 2.121 0 0 0-3-3L4 18v3z"/>
    <path fill="none" stroke="currentColor" stroke-width="2" d="M14 6l4 4"/>
  </svg>`,
  
  /** Delete/trash icon - Used for snippet removal actions */
  delete: `<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false" role="img">
    <path fill="none" stroke="currentColor" stroke-width="2" d="M3 6h18"/>
    <path fill="none" stroke="currentColor" stroke-width="2" d="M8 6V4h8v2"/>
    <path fill="none" stroke="currentColor" stroke-width="2" d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
    <path fill="none" stroke="currentColor" stroke-width="2" d="M10 11v6M14 11v6"/>
  </svg>`,
  
  /** Copy/clipboard icon - Used for copying snippet content to clipboard */
  copy: `<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false" role="img">
    <rect x="9" y="9" width="11" height="11" rx="2" ry="2" fill="none" stroke="currentColor" stroke-width="2"/>
    <rect x="4" y="4" width="11" height="11" rx="2" ry="2" fill="none" stroke="currentColor" stroke-width="2"/>
  </svg>`,
  
  /** Expand/fullscreen icon - Used for expanding cards or entering fullscreen mode */
  expand: `<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false" role="img">
    <path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="m21 21-6-6m6 6v-4.8m0 4.8h-4.8"/>
    <path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M3 16.2V21m0 0h4.8M3 21l6-6"/>
    <path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M21 7.8V3m0 0h-4.8M21 3l-6 6"/>
    <path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M3 7.8V3m0 0h4.8M3 3l6 6"/>
  </svg>`,
  
  /** Standardized close symbol - Used for modal close buttons and cancel actions */
  close: '✕',
  
  /** Standardized remove symbol - Used for tag removal and field clearing */
  remove: '✕',
  
  /** Collapse icon - Used for collapsing expanded cards */
  collapse: `<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false" role="img">
    <path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M4 14h4v4M20 10h-4V6"/>
    <path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="m20 6-6 6M4 18l6-6"/>
  </svg>`,
  
  /** Drag handle icon - Used for reordering cards */
  dragHandle: `<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false" role="img">
    <circle cx="6" cy="8" r="1.5" fill="currentColor"/>
    <circle cx="12" cy="8" r="1.5" fill="currentColor"/>
    <circle cx="18" cy="8" r="1.5" fill="currentColor"/>
    <circle cx="6" cy="16" r="1.5" fill="currentColor"/>
    <circle cx="12" cy="16" r="1.5" fill="currentColor"/>
    <circle cx="18" cy="16" r="1.5" fill="currentColor"/>
  </svg>`
};

/**
 * SVG Icon Path Data for Secure DOM Generation
 * 
 * These path strings are used by the secure DOM icon generation methods
 * to avoid repeating complex SVG markup throughout the codebase.
 * 
 * @constant {Object} ICON_PATHS
 */
export const ICON_PATHS = {
  /** Edit/pencil icon paths */
  edit: `<path fill="none" stroke="currentColor" stroke-width="2" d="M3 21h4l11.5-11.5a2.121 2.121 0 0 0-3-3L4 18v3z"/><path fill="none" stroke="currentColor" stroke-width="2" d="M14 6l4 4"/>`,
  
  /** Delete/trash icon paths */
  delete: `<path fill="none" stroke="currentColor" stroke-width="2" d="M3 6h18"/><path fill="none" stroke="currentColor" stroke-width="2" d="M8 6V4h8v2"/><path fill="none" stroke="currentColor" stroke-width="2" d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path fill="none" stroke="currentColor" stroke-width="2" d="M10 11v6M14 11v6"/>`,
  
  /** Copy/clipboard icon paths */
  copy: `<rect x="9" y="9" width="11" height="11" rx="2" ry="2" fill="none" stroke="currentColor" stroke-width="2"/><rect x="4" y="4" width="11" height="11" rx="2" ry="2" fill="none" stroke="currentColor" stroke-width="2"/>`,
  
  /** Expand/fullscreen icon paths */
  expand: `<path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="m21 21-6-6m6 6v-4.8m0 4.8h-4.8"/><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M3 16.2V21m0 0h4.8M3 21l6-6"/><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M21 7.8V3m0 0h-4.8M21 3l-6 6"/><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M3 7.8V3m0 0h4.8M3 3l6 6"/>`,
  
  /** Collapse icon paths */
  collapse: `<path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M4 14h4v4M20 10h-4V6"/><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="m20 6-6 6M4 18l6-6"/>`,
  
  /** Drag handle icon paths */
  dragHandle: `<circle cx="6" cy="8" r="1.5" fill="currentColor"/><circle cx="12" cy="8" r="1.5" fill="currentColor"/><circle cx="18" cy="8" r="1.5" fill="currentColor"/><circle cx="6" cy="16" r="1.5" fill="currentColor"/><circle cx="12" cy="16" r="1.5" fill="currentColor"/><circle cx="18" cy="16" r="1.5" fill="currentColor"/>`
};


/**
 * Available Theme Options
 * 
 * Complete list of all 26 theme identifiers that can be applied via the data-theme attribute
 * on the document element. Each theme corresponds to a CSS section that defines the visual 
 * appearance of the application with accessibility-first design.
 * 
 * Theme Naming Convention:
 * - Format: "{mode}-{name}"
 * - Modes: 'dark' or 'light'
 * - Names: descriptive, kebab-case identifiers
 * 
 * All themes meet WCAG 2.1 AA accessibility standards (4.5:1 contrast ratio)
 * High contrast themes exceed AAA standards (7:1+ contrast ratio)
 * 
 * @constant {string[]} THEME_LIST
 */
export const THEME_LIST = [
  // === EXISTING THEMES (IMPROVED) ===
  /** Default dark theme with nature-inspired green accents */
  'dark-mystic-forest',
  /** Warm dark theme with red accents for evening use */
  'dark-crimson-night', 
  /** Sophisticated dark theme with purple accents */
  'dark-royal-elegance',
  /** Energizing light theme with orange accents */
  'light-sunrise',
  /** Gentle light theme optimized for extended reading */
  'light-soft-glow',
  /** Fresh light theme with natural green accents */
  'light-floral-breeze',
  
  // === NEW DARK THEMES ===
  /** Popular coding theme with vibrant purple and pink */
  'dark-dracula',
  /** Scientifically calibrated theme for reduced eye strain */
  'dark-solarized',
  /** Deep blue theme perfect for late-night work */
  'dark-midnight-blue',
  /** Developer favorite optimized for code readability */
  'dark-night-owl',
  /** Classic coding theme with green highlights */
  'dark-monokai',
  /** Calming ocean-inspired blue theme */
  'dark-deep-ocean',
  /** Maximum contrast for visual accessibility */
  'dark-high-contrast',
  /** Clean, distraction-free professional theme */
  'dark-professional',
  /** Retro theme with warm, earthy tones */
  'dark-gruvbox',
  /** Google Material Design inspired theme */
  'dark-material',
  
  // === NEW LIGHT THEMES ===
  /** Scientifically calibrated light theme for optimal readability */
  'light-solarized',
  /** Maximum contrast light theme for accessibility */
  'light-high-contrast',
  /** Minimal theme for business environments */
  'light-professional',
  /** Soft, creative theme with mint accents */
  'light-pastel-mint',
  /** Natural theme with warm earth colors */
  'light-earth-tones',
  /** Fresh theme inspired by ocean and sky */
  'light-oceanic',
  /** Comfortable theme with vanilla and cream tones */
  'light-vanilla-cream',
  /** Clean minimalist Nordic-inspired theme */
  'light-nordic',
  /** Google Material Design light theme */
  'light-material',
  /** Gentle warm theme for extended reading */
  'light-warm-beige'
];

/**
 * Default Theme Selection
 * 
 * The theme that is applied when:
 * - User visits the application for the first time
 * - No theme preference is stored in localStorage
 * - The stored theme preference is invalid/corrupted
 * 
 * This theme should provide the best default experience and represent
 * the primary visual identity of the application.
 * 
 * @constant {string} DEFAULT_THEME
 */
export const DEFAULT_THEME = 'dark-mystic-forest';
