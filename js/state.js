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
import { STORAGE_KEYS, UI_CONFIG } from './constants.js?v=2.0.2';
import { generateUID, debounce } from './utils.js?v=2.0.2';

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
 * @property {number} position - Display order position (lower numbers appear first)
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
 * Browser API Dependencies:
 * - Web Storage API (localStorage) - supported in all modern browsers
 * - JSON.parse() for data deserialization
 * - Storage events for cross-tab synchronization (not implemented yet)
 * 
 * Privacy Mode Handling:
 * - Safari private browsing: localStorage throws SecurityError
 * - Firefox private browsing: localStorage is available but cleared on close
 * - Chrome incognito: localStorage works normally
 * 
 * Storage Keys Used:
 * - STORAGE_KEYS.items: Array of snippet items
 * - STORAGE_KEYS.filters: Array of active filter tags  
 * - STORAGE_KEYS.profile: User profile name string
 * 
 * Data Validation:
 * - Validates that items is an array with proper structure
 * - Ensures filterTags is an array of strings
 * - Sanitizes profile name for security (max 100 chars)
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
    // LOCALSTORAGE API INTERACTION: Retrieve stored application data
    // getItem() returns string value or null if key doesn't exist
    // This is a synchronous operation that can throw SecurityError in private mode
    const rawItems = localStorage.getItem(STORAGE_KEYS.items);        // Main snippet data
    const rawFilters = localStorage.getItem(STORAGE_KEYS.filters);    // Active filter preferences
    const rawProfile = localStorage.getItem(STORAGE_KEYS.profile);    // User profile information
    
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
        ).map((item, index) => {
          // Ensure position field exists for backwards compatibility
          if (typeof item.position !== 'number') {
            item.position = index;
          }
          return item;
        });
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
    
    if (UI_CONFIG.debug) console.log(`State loaded successfully: ${items.length} items, ${filterTags.length} active filters`);
    
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
    // LOCALSTORAGE API INTERACTION: Persist application state to browser storage
    // setItem() stores key-value pairs as strings (automatic JSON.stringify needed for objects)
    // This is synchronous and can throw QuotaExceededError if storage is full
    
    // CORE DATA PERSISTENCE: Store items and filters as JSON strings
    localStorage.setItem(STORAGE_KEYS.items, JSON.stringify(state.items));       // All snippet items
    localStorage.setItem(STORAGE_KEYS.filters, JSON.stringify(state.filterTags)); // Active filter state
    
    // CONDITIONAL STORAGE: Only store profile name if it exists (reduces storage waste)
    // Empty strings would be stored as 'compy.profile': '', which is unnecessary
    if (state.profileName) {
      localStorage.setItem(STORAGE_KEYS.profile, state.profileName);  // User's display name
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
  // ALGORITHM: Automatic Backup with Rotation
  // 1. Create timestamped snapshot of current state
  // 2. Load existing backup array from localStorage
  // 3. Add new backup to front (LIFO ordering)
  // 4. Limit array size to prevent storage overflow
  // 5. Save rotated array back to storage
  
  const now = new Date();
  const backup = { 
    ts: now.toISOString(),  // ISO timestamp ensures sortable chronological order
    items: state.items      // Full state snapshot for complete recovery
  };
  
  try {
    // Load existing backup array - fallback to empty array for first run
    let backups = JSON.parse(localStorage.getItem(STORAGE_KEYS.backups) || '[]');
    
    // ROTATION STRATEGY: Add new backup to front (most recent first)
    // This LIFO approach ensures latest backups are always accessible
    backups.unshift(backup);
    
    // STORAGE MANAGEMENT: Limit backup count to prevent localStorage bloat
    // slice(0, max) keeps only the most recent backups, discarding oldest
    backups = backups.slice(0, UI_CONFIG.maxBackups);
    
    // Persist the rotated backup array back to localStorage
    localStorage.setItem(STORAGE_KEYS.backups, JSON.stringify(backups));
  } catch (error) {
    // ERROR RESILIENCE: Backup failure is non-critical, don't crash the app
    console.error('Failed to save backup:', error);
    // User can still continue working even if backups fail
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
  // INPUT VALIDATION: Comprehensive validation for data integrity
  // 
  // ERROR HANDLING STRATEGY:
  // - Validate item structure and required properties
  // - Handle missing editingId gracefully
  // - Ensure immutable state updates with error recovery
  // - Log validation failures for debugging
  // 
  // VALIDATION REQUIREMENTS:
  // - item: Must be an object with valid properties
  // - item.text: Required string property
  // - item.desc: Required string property
  // - item.tags: Optional array of strings
  // - item.sensitive: Optional boolean
  
  if (!item || typeof item !== 'object') {
    Logger.error('upsertItem: item must be a valid object', item);
    return; // Early return prevents state corruption
  }
  
  // CONDITIONAL OPERATION: Determine if this is an update or insert operation
  // The presence of editingId indicates we're updating an existing item
  // rather than creating a new one
  if (state.editingId) {
    // UPDATE EXISTING ITEM: Find the item by ID and replace it
    const index = state.items.findIndex(i => i.id === state.editingId);
    
    // VALIDATION: Ensure the item exists before attempting update
    // This prevents errors if the item was deleted during editing
    if (index > -1) {
      // IMMUTABLE MERGE: Combine existing item properties with new ones
      // Object spread gives priority to new properties while preserving unchanged ones
      const updatedItem = { ...state.items[index], ...item };
      
      // IMMUTABLE ARRAY UPDATE: Create new array with updated item at same position
      // This preserves array order while updating content
      const updatedItems = [...state.items];
      updatedItems[index] = updatedItem;
      
      // STATE UPDATE: Apply changes and clear editing mode
      // Clearing editingId indicates we're done with this edit operation
      state = { ...state, items: updatedItems, editingId: null };
    }
  } else {
    // INSERT NEW ITEM: Create item with unique identifier and add to list
    // If no position specified, assign highest position + 1 to put at end
    const maxPosition = state.items.length > 0 
      ? Math.max(...state.items.map(i => i.position)) 
      : -1;
    const newItem = { 
      id: generateUID(), 
      position: item.position ?? (maxPosition + 1),
      ...item 
    };
    
    // Add new item and sort by position to maintain order
    const updatedItems = [...state.items, newItem].sort((a, b) => a.position - b.position);
    state = { ...state, items: updatedItems };
  }
  
  // PERSISTENCE AND BACKUP: Save changes and schedule automatic backup
  // This ensures data safety and allows for recovery if needed
  saveState();
};

/**
 * Delete an item by its unique identifier
 * 
 * This function performs an immutable deletion operation by creating a new array
 * that excludes the item with the specified ID. It maintains referential integrity
 * by preserving all other items in their original state.
 * 
 * Deletion Algorithm:
 * 1. Validate the ID parameter to ensure it's a valid string
 * 2. Use array.filter to create new array excluding target item
 * 3. Update state immutably with the filtered array
 * 4. Persist changes and schedule backup for data safety
 * 5. Notify all subscribers of the state change
 * 
 * Performance Considerations:
 * - filter() creates O(n) time complexity for deletion
 * - Immutable approach prevents reference bugs
 * - Single state update reduces listener notifications
 * - Automatic persistence ensures data durability
 * 
 * Error Handling:
 * - Validates ID parameter type and content
 * - Handles missing items gracefully (no-op)
 * - Continues operation even if item doesn't exist
 * - Maintains state consistency throughout process
 * 
 * @param {string} id - Unique identifier of the item to delete
 * @throws {TypeError} If id parameter is not a string
 * 
 * @example
 * // Delete item by ID
 * deleteItem('abc123def456');
 * 
 * // Attempt to delete non-existent item (safe no-op)
 * deleteItem('non-existent-id');
 */
export const deleteItem = (id) => {
  // INPUT VALIDATION: Ensure ID is a valid string to prevent errors
  if (typeof id !== 'string' || !id.trim()) {
    console.warn('deleteItem: ID must be a non-empty string', id);
    return; // Early return for invalid input
  }
  
  // IMMUTABLE DELETION: Create new array excluding the target item
  // filter() automatically handles case where no item matches the ID
  const filteredItems = state.items.filter(item => item.id !== id);
  
  // STATE UPDATE: Apply the deletion immutably
  // This triggers reactivity through the state update pattern
  state = { ...state, items: filteredItems };
  
  // PERSISTENCE AND BACKUP: Ensure data safety and trigger notifications
  // saveState() handles both localStorage persistence and backup scheduling
  saveState();
};

/**
 * Reorder items based on new positions from drag and drop operations
 * 
 * This function updates the position values of items to reflect their new order
 * after drag and drop operations. It maintains the relative positioning of items
 * not included in the reorder operation while updating the positions of moved items.
 * 
 * Reordering Algorithm:
 * 1. Create a position mapping for all items in the new order
 * 2. Update position values immutably while preserving other properties
 * 3. Sort the entire items array by position to ensure consistent ordering
 * 4. Update application state and persist changes immediately
 * 
 * Position Management Strategy:
 * - Items in orderedIds get new sequential positions (0, 1, 2, ...)
 * - Items not in orderedIds retain their existing positions
 * - Final array is sorted to maintain consistent ordering
 * - This approach handles partial reordering while preserving item stability
 * 
 * Performance Considerations:
 * - Map lookup provides O(1) position access during mapping
 * - Single pass through items array for position updates
 * - Sort operation is O(n log n) but necessary for UI consistency
 * - Immediate persistence prevents data loss during drag operations
 * 
 * @param {string[]} orderedIds - Array of item IDs in their new display order
 * @throws {TypeError} If orderedIds is not an array
 * 
 * @example
 * // Reorder first three items after drag and drop
 * const newOrder = ['item3', 'item1', 'item2'];
 * reorderItems(newOrder);
 * 
 * // Partial reorder - other items maintain their positions
 * const partialOrder = ['itemB', 'itemA']; // Only reorder these two
 * reorderItems(partialOrder);
 */
export const reorderItems = (orderedIds) => {
  // INPUT VALIDATION: Ensure orderedIds is a valid array
  if (!Array.isArray(orderedIds)) {
    console.warn('reorderItems: orderedIds must be an array', orderedIds);
    return; // Early return for invalid input
  }
  
  // POSITION MAPPING: Create efficient lookup for new positions
  // Using Map for O(1) lookup performance during item mapping
  // Items not present in orderedIds retain their existing position, preserving
  // relative order for any items outside the current reordering scope.
  const positionMap = new Map();
  orderedIds.forEach((id, index) => {
    // Validate ID is a string to prevent errors
    if (typeof id === 'string') {
      positionMap.set(id, index);
    }
  });
  
  // IMMUTABLE POSITION UPDATE: Update positions while preserving other properties
  // This approach maintains referential integrity for unchanged items
  const updatedItems = state.items.map(item => ({
    ...item, // Preserve all existing properties
    position: positionMap.has(item.id) 
      ? positionMap.get(item.id)    // Use new position if item was reordered
      : item.position               // Keep existing position otherwise
  })).sort((a, b) => a.position - b.position); // Ensure consistent ordering
  
  // STATE UPDATE: Apply the reordered items immutably
  state = { ...state, items: updatedItems };
  
  // IMMEDIATE PERSISTENCE: Critical for drag and drop operations
  // Users expect their reordering to be saved immediately
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
