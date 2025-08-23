/**
 * Application State Management Module for Compy 2.0
 * 
 * This module implements a centralized state management system using the
 * observer pattern for reactive updates. It provides a single source of truth
 * for all application data and ensures consistent state synchronization across
 * UI components.
 * 
 * Key Features:
 * - Immutable state updates with automatic persistence
 * - Observer pattern for reactive UI updates
 * - Automatic localStorage synchronization
 * - Debounced backup system for data recovery
 * - Type-safe interfaces with JSDoc annotations
 * - Memory-efficient listener management with Set
 * 
 * Architecture:
 * - State is kept in a single object with immutable updates
 * - Changes trigger notifications to registered listeners
 * - Persistence to localStorage happens automatically
 * - Backups are created on a schedule with debouncing
 * 
 * @fileoverview Centralized state management with persistence and reactivity
 * @version 2.0
 * @author Bheb Developer
 * @since 2025
 */

// Import necessary utilities and configuration
import { STORAGE_KEYS, UI_CONFIG } from './constants.js';
import { generateUID, debounce } from './utils.js';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

/**
 * Represents a single snippet item in the application
 * 
 * @typedef {Object} AppItem
 * @property {string} id - Unique identifier for the item
 * @property {string} text - The main snippet content
 * @property {string} desc - Human-readable description of the snippet
 * @property {boolean} sensitive - Whether the snippet contains sensitive data (masked in UI)
 * @property {string[]} tags - Array of category/organization tags
 */

/**
 * Complete application state structure
 * 
 * @typedef {Object} AppState
 * @property {AppItem[]} items - All snippet items in the application
 * @property {string[]} filterTags - Currently active filter tags
 * @property {string} search - Current search query string
 * @property {string|null} editingId - ID of item being edited (null if none)
 * @property {string} profileName - User's display name for personalization
 */

/**
 * Callback function for state change notifications
 * 
 * @callback StateListener
 * @param {AppState} state - Latest immutable state snapshot
 * @returns {void}
 */

// =============================================================================
// STATE INITIALIZATION
// =============================================================================

/**
 * Default/initial state structure
 * 
 * This represents a clean slate when the application starts for the first time
 * or when state needs to be reset. All properties have sensible defaults.
 * 
 * @constant {AppState} initialState
 */
const initialState = {
  items: [],           // No snippets initially
  filterTags: [],      // No active filters
  search: '',          // Empty search query
  editingId: null,     // No item being edited
  profileName: '',     // No profile name set
};

/**
 * Current application state
 * 
 * This is the single source of truth for all application data. It should only
 * be modified through the exported functions to ensure consistency and trigger
 * proper notifications.
 * 
 * @type {AppState}
 */
let state = { ...initialState };

/**
 * Set of registered state change listeners
 * 
 * Using Set for efficient listener management - provides O(1) add/remove
 * operations and automatic deduplication of listener functions.
 * 
 * @type {Set<StateListener>}
 */
const listeners = new Set();

// =============================================================================
// OBSERVER PATTERN IMPLEMENTATION
// =============================================================================

/**
 * Subscribe to state changes using the observer pattern
 * 
 * Registers a callback function that will be invoked whenever the application
 * state changes. This enables reactive UI updates and decoupled architecture.
 * 
 * @param {StateListener} listener - Callback invoked with the latest state on changes
 * @returns {() => void} Unsubscribe function to remove the listener
 * 
 * @example
 * // Subscribe to state changes
 * const unsubscribe = subscribe((newState) => {
 *   console.log('State updated:', newState);
 *   updateUI(newState);
 * });
 * 
 * // Later, unsubscribe to prevent memory leaks
 * unsubscribe();
 */
export const subscribe = (listener) => {
  listeners.add(listener);
  
  // Return unsubscribe function for cleanup
  return () => {
    listeners.delete(listener);
  };
};

/**
 * Notify all registered listeners of state changes
 * 
 * This function is called internally whenever the state is modified.
 * It iterates through all registered listeners and calls each one with
 * the current state snapshot.
 * 
 * Performance Note: Uses forEach for optimal iteration over Set.
 * 
 * @private
 */
const notifyListeners = () => {
  listeners.forEach(listener => listener(state));
};

// =============================================================================
// STATE PERSISTENCE AND LOADING
// =============================================================================

/**
 * Load application state from localStorage and hydrate the state object
 * 
 * This function attempts to restore the application state from browser storage.
 * It gracefully handles missing or corrupted data by falling back to defaults.
 * Includes data validation to ensure loaded state meets expected structure.
 * 
 * Storage Keys Used:
 * - STORAGE_KEYS.items: Array of snippet items
 * - STORAGE_KEYS.filters: Array of active filter tags
 * - STORAGE_KEYS.profile: User profile name string
 * 
 * Data Validation:
 * - Validates that items is an array with proper structure
 * - Ensures filterTags is an array of strings
 * - Sanitizes profile name for security
 * 
 * Error Handling:
 * If localStorage is unavailable or contains invalid JSON, the function
 * logs the error and resets to the initial state to prevent app crashes.
 * 
 * @example
 * // Load state on app startup
 * loadState();
 */
export const loadState = () => {
  try {
    // Attempt to parse stored data with fallbacks and validation
    const rawItems = localStorage.getItem(STORAGE_KEYS.items);
    const rawFilters = localStorage.getItem(STORAGE_KEYS.filters);
    const rawProfile = localStorage.getItem(STORAGE_KEYS.profile);
    
    // Parse and validate items with structure checking
    let items = [];
    if (rawItems) {
      const parsedItems = JSON.parse(rawItems);
      if (Array.isArray(parsedItems)) {
        // Validate item structure and filter out invalid items
        items = parsedItems.filter(item => 
          item && 
          typeof item.id === 'string' &&
          typeof item.text === 'string' &&
          typeof item.desc === 'string' &&
          typeof item.sensitive === 'boolean' &&
          Array.isArray(item.tags)
        );
      }
    }
    
    // Parse and validate filter tags
    let filterTags = [];
    if (rawFilters) {
      const parsedFilters = JSON.parse(rawFilters);
      if (Array.isArray(parsedFilters)) {
        // Ensure all filter tags are strings
        filterTags = parsedFilters.filter(tag => typeof tag === 'string');
      }
    }
    
    // Sanitize profile name
    const profileName = rawProfile ? String(rawProfile).trim().slice(0, 100) : '';
    
    // Update state immutably with validated data
    state = {
      ...state,
      items,
      filterTags,
      profileName
    };
    
    console.log(`State loaded successfully: ${items.length} items, ${filterTags.length} active filters`);
    
    // Notify subscribers of the loaded state
    notifyListeners();
    
  } catch (error) {
    console.error('Failed to load state from localStorage:', error);
    
    // Reset to clean state on error to prevent corruption
    state = { ...initialState };
    
    // Still notify listeners so UI can render empty state
    notifyListeners();
  }
};

/**
 * Save current application state to localStorage with automatic backup scheduling
 * 
 * This function persists the current state to browser storage and schedules
 * a backup for data recovery. It's called automatically after state mutations.
 * 
 * Persistence Strategy:
 * - Items and filters are stored as JSON strings
 * - Profile name is stored as a plain string
 * - Empty profile names are not stored (to keep storage clean)
 * 
 * Side Effects:
 * - Schedules a debounced backup creation
 * - Notifies all state listeners
 * 
 * Error Handling:
 * Storage errors are logged but don't throw to prevent app crashes.
 * This allows the app to continue working even if storage is full.
 * 
 * @example
 * // Save state after modifying items
 * state.items.push(newItem);
 * saveState();
 */
export const saveState = () => {
  try {
    // Persist core application data
    localStorage.setItem(STORAGE_KEYS.items, JSON.stringify(state.items));
    localStorage.setItem(STORAGE_KEYS.filters, JSON.stringify(state.filterTags));
    
    // Only store profile name if it's not empty (keeps storage clean)
    if (state.profileName) {
      localStorage.setItem(STORAGE_KEYS.profile, state.profileName);
    }
    
    // Schedule backup creation (debounced for performance)
    scheduleBackup();
    
    // Notify listeners that state has been persisted
    notifyListeners();
  } catch (error) {
    console.error('Failed to save state to localStorage:', error);
    // Continue execution - app can work without persistence
  }
};

// =============================================================================
// BACKUP AND RECOVERY SYSTEM
// =============================================================================

/**
 * Debounced backup scheduler to prevent excessive backup creation
 * 
 * Uses debounce utility to delay backup creation until after a period of
 * inactivity. This prevents creating too many backups during rapid changes.
 * 
 * @private
 */
const scheduleBackup = debounce(() => {
  doBackup();
}, UI_CONFIG.backupDelay);

/**
 * Create a timestamped backup snapshot for data recovery
 * 
 * Backups are essential for user data safety. They provide a way to recover
 * from accidental deletions or data corruption. Backups are automatically
 * rotated to prevent unlimited storage growth.
 * 
 * Backup Structure:
 * - ts: ISO timestamp string for sorting and display
 * - items: Complete snapshot of all snippet items
 * 
 * Storage Management:
 * - New backups are added to the beginning of the array
 * - Only the most recent UI_CONFIG.maxBackups are kept
 * - Older backups are automatically removed
 * 
 * @example
 * // Manually create a backup
 * doBackup();
 */
export const doBackup = () => {
  const now = new Date();
  const backup = { 
    ts: now.toISOString(),  // Sortable timestamp
    items: state.items      // Complete data snapshot
  };
  
  try {
    // Load existing backups with fallback to empty array
    let backups = JSON.parse(localStorage.getItem(STORAGE_KEYS.backups) || '[]');
    
    // Add new backup at the beginning (most recent first)
    backups.unshift(backup);
    
    // Limit backup count to prevent storage bloat
    backups = backups.slice(0, UI_CONFIG.maxBackups);
    
    // Persist updated backup list
    localStorage.setItem(STORAGE_KEYS.backups, JSON.stringify(backups));
  } catch (error) {
    console.error('Failed to save backup:', error);
    // Backup failure shouldn't crash the app
  }
};

// =============================================================================
// STATE ACCESS AND MANIPULATION
// =============================================================================

/**
 * Get current application state as an immutable snapshot
 * 
 * Returns a shallow copy of the current state to prevent accidental mutations.
 * This is the recommended way to access state from UI components.
 * 
 * @returns {AppState} Immutable copy of current state
 * 
 * @example
 * const currentState = getState();
 * console.log('Current items:', currentState.items.length);
 * 
 * // This won't affect the actual state (safe)
 * currentState.search = 'test';
 */
export const getState = () => ({ ...state });


// =============================================================================
// ITEM MANAGEMENT OPERATIONS
// =============================================================================

/**
 * Add a new item or update an existing one (upsert operation)
 * 
 * This function handles both creating new snippet items and updating existing ones.
 * The behavior is determined by checking the `state.editingId` property:
 * - If editingId is set: Update the existing item with that ID
 * - If editingId is null: Create a new item and add it to the beginning of the list
 * 
 * Immutability:
 * All operations preserve immutability by creating new objects and arrays
 * rather than modifying existing ones.
 * 
 * @param {Partial<AppItem>} item - Item data (without ID for new items)
 * @param {string} [item.text] - Snippet text content
 * @param {string} [item.desc] - Snippet description
 * @param {boolean} [item.sensitive] - Whether snippet is sensitive
 * @param {string[]} [item.tags] - Array of tags
 * 
 * @example
 * // Create new item
 * setEditingId(null);
 * upsertItem({
 *   text: 'console.log("Hello World")',
 *   desc: 'Basic console output',
 *   sensitive: false,
 *   tags: ['javascript', 'debug']
 * });
 * 
 * // Update existing item
 * setEditingId('existing-item-id');
 * upsertItem({
 *   desc: 'Updated description'
 * });
 */
export const upsertItem = (item) => {
  if (state.editingId) {
    // Update existing item by ID
    const index = state.items.findIndex(i => i.id === state.editingId);
    
    if (index > -1) {
      // Merge new properties with existing item
      const updatedItem = { ...state.items[index], ...item };
      
      // Create new items array with the updated item
      const updatedItems = [...state.items];
      updatedItems[index] = updatedItem;
      
      // Update state and clear editing ID
      state = { ...state, items: updatedItems, editingId: null };
    }
  } else {
    // Create new item with unique ID
    const newItem = { id: generateUID(), ...item };
    
    // Add to beginning of list (most recent first)
    state = { ...state, items: [newItem, ...state.items] };
  }
  
  // Persist changes and trigger backups
  saveState();
};

/**
 * Delete an item by its unique identifier
 * 
 * Removes the specified item from the items array and persists the change.
 * Uses array.filter for immutable deletion.
 * 
 * @param {string} id - Unique ID of the item to delete
 * 
 * @example
 * // Delete item by ID
 * deleteItem('abc123def456');
 */
export const deleteItem = (id) => {
  // Filter out the item with matching ID (immutable deletion)
  state = { ...state, items: state.items.filter(item => item.id !== id) };
  
  // Persist changes and trigger backups
  saveState();
};

// =============================================================================
// UI STATE MANAGEMENT
// =============================================================================

/**
 * Update the active filter tags for snippet filtering
 * 
 * Sets the tags that are used to filter the visible snippets. Only items
 * that contain ALL of the specified tags will be shown in the UI.
 * 
 * Note: This function persists filters separately from other state to allow
 * for more granular control over when filters are saved.
 * 
 * @param {string[]} tags - Array of tag names to filter by
 * 
 * @example
 * // Filter by multiple tags
 * updateFilterTags(['javascript', 'frontend']);
 * 
 * // Clear all filters
 * updateFilterTags([]);
 */
export const updateFilterTags = (tags) => {
  state = { ...state, filterTags: tags };
  
  // Persist filters separately for immediate effect
  localStorage.setItem(STORAGE_KEYS.filters, JSON.stringify(tags));
  
  // Notify UI components to re-render
  notifyListeners();
};

/**
 * Update the current search query string
 * 
 * Sets the search term used for filtering snippets. The search is applied
 * across item text, descriptions, and tags.
 * 
 * @param {string} query - Search query string (case-insensitive)
 * 
 * @example
 * // Search for items containing "react"
 * updateSearch('react');
 * 
 * // Clear search
 * updateSearch('');
 */
export const updateSearch = (query) => {
  state = { ...state, search: query };
  
  // Search doesn't need persistence (session-only)
  notifyListeners();
};

/**
 * Update the user's profile name for personalization
 * 
 * Sets the display name shown in the UI. The name is trimmed to remove
 * leading/trailing whitespace.
 * 
 * @param {string} name - User's display name
 * 
 * @example
 * // Set user name
 * updateProfile('John Doe');
 * 
 * // Clear user name
 * updateProfile('');
 */
export const updateProfile = (name) => {
  const trimmedName = (name || '').trim();
  state = { ...state, profileName: trimmedName };
  
  // Persist profile immediately for cross-session consistency
  localStorage.setItem(STORAGE_KEYS.profile, trimmedName);
  
  // Notify UI to update profile display
  notifyListeners();
};

/**
 * Set the ID of the item currently being edited
 * 
 * This is used by the edit modal to determine whether to create a new item
 * or update an existing one when the form is submitted.
 * 
 * @param {string|null} id - Item ID to edit, or null for new item creation
 * 
 * @example
 * // Start editing existing item
 * setEditingId('abc123def456');
 * 
 * // Prepare for new item creation
 * setEditingId(null);
 */
export const setEditingId = (id) => {
  state = { ...state, editingId: id };
  
  // This is UI state only - no persistence needed
  notifyListeners();
};

// =============================================================================
// BACKUP MANAGEMENT
// =============================================================================

/**
 * Get the current list of backup snapshots
 * 
 * Retrieves all available backup snapshots from localStorage, sorted by
 * timestamp (most recent first). Used by the backups modal to display
 * available recovery options.
 * 
 * @returns {Array<{ts: string, items: AppItem[]}>} Array of backup objects
 * @returns {string} returns[].ts - ISO timestamp of the backup
 * @returns {AppItem[]} returns[].items - Snapshot of items at backup time
 * 
 * @example
 * // Get all backups for display
 * const backups = getBackups();
 * backups.forEach(backup => {
 *   console.log(`Backup from ${backup.ts}: ${backup.items.length} items`);
 * });
 */
export const getBackups = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.backups) || '[]');
  } catch (error) {
    console.error('Failed to get backups:', error);
    // Return empty array on error to prevent crashes
    return [];
  }
};

// =============================================================================
// INITIALIZATION AND LIFECYCLE
// =============================================================================

/**
 * Start the recurring backup timer for automatic data protection
 * 
 * Sets up an interval timer that creates backups at regular intervals
 * defined by UI_CONFIG.backupInterval. This provides automatic data
 * protection without user intervention.
 * 
 * Timer Management:
 * The timer runs continuously once started and doesn't need cleanup
 * since it's tied to the application lifecycle.
 * 
 * @example
 * // Start automatic backups (called during app initialization)
 * setupBackupInterval();
 */
export const setupBackupInterval = () => {
  setInterval(doBackup, UI_CONFIG.backupInterval);
};

/**
 * Initialize the state management system
 * 
 * This function should be called once during application startup to:
 * 1. Load existing data from localStorage
 * 2. Set up automatic backup intervals
 * 3. Prepare the state system for use
 * 
 * Call this before any other state operations to ensure the system
 * is properly initialized.
 * 
 * @example
 * // Initialize state system on app startup
 * initState();
 */
export const initState = () => {
  // Load persisted data from browser storage
  loadState();
  
  // Start automatic backup system
  setupBackupInterval();
};
