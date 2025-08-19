/**
 * Application state management module
 */
import { STORAGE_KEYS, UI_CONFIG } from './constants.js';
import { generateUID, debounce } from './utils.js';

// Initial state object
const initialState = {
  items: [],
  filterTags: [],
  search: '',
  editingId: null,
  profileName: '',
};

// The main state object
let state = { ...initialState };

// Listeners for state changes
const listeners = new Set();

/**
 * Subscribe to state changes
 * @param {Function} listener - Callback function to run on state change
 * @returns {Function} Unsubscribe function
 */
export const subscribe = (listener) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/**
 * Notify all listeners of state change
 */
const notifyListeners = () => {
  listeners.forEach(listener => listener(state));
};

/**
 * Load state from localStorage
 */
export const loadState = () => {
  try {
    const items = JSON.parse(localStorage.getItem(STORAGE_KEYS.items) || '[]');
    const filterTags = JSON.parse(localStorage.getItem(STORAGE_KEYS.filters) || '[]');
    const profileName = localStorage.getItem(STORAGE_KEYS.profile) || '';
    
    state = {
      ...state,
      items,
      filterTags,
      profileName
    };
    
    notifyListeners();
  } catch (error) {
    console.error('Failed to load state from localStorage:', error);
    // Reset to default state on error
    state = { ...initialState };
  }
};

/**
 * Save current state to localStorage
 */
export const saveState = () => {
  try {
    localStorage.setItem(STORAGE_KEYS.items, JSON.stringify(state.items));
    localStorage.setItem(STORAGE_KEYS.filters, JSON.stringify(state.filterTags));
    
    if (state.profileName) {
      localStorage.setItem(STORAGE_KEYS.profile, state.profileName);
    }
    
    scheduleBackup();
    notifyListeners();
  } catch (error) {
    console.error('Failed to save state to localStorage:', error);
  }
};

// Debounced backup function
let backupTimer = null;
const scheduleBackup = debounce(() => {
  doBackup();
}, UI_CONFIG.backupDelay);

/**
 * Create a backup of the current state
 */
export const doBackup = () => {
  const now = new Date();
  const backup = { 
    ts: now.toISOString(), 
    items: state.items 
  };
  
  try {
    let backups = JSON.parse(localStorage.getItem(STORAGE_KEYS.backups) || '[]');
    backups.unshift(backup);
    backups = backups.slice(0, UI_CONFIG.maxBackups);
    localStorage.setItem(STORAGE_KEYS.backups, JSON.stringify(backups));
  } catch (error) {
    console.error('Failed to save backup:', error);
  }
};

/**
 * Get current application state
 * @returns {Object} Current state
 */
export const getState = () => ({ ...state });

/**
 * Update state with partial changes
 * @param {Object} changes - Partial state changes
 */
export const updateState = (changes) => {
  state = { ...state, ...changes };
  notifyListeners();
};

/**
 * Add a new item or update an existing one
 * @param {Object} item - Item data 
 */
export const upsertItem = (item) => {
  if (state.editingId) {
    // Update existing item
    const index = state.items.findIndex(i => i.id === state.editingId);
    if (index > -1) {
      const updatedItem = { ...state.items[index], ...item };
      const updatedItems = [...state.items];
      updatedItems[index] = updatedItem;
      state = { ...state, items: updatedItems, editingId: null };
    }
  } else {
    // Add new item
    const newItem = { id: generateUID(), ...item };
    state = { ...state, items: [newItem, ...state.items] };
  }
  
  saveState();
};

/**
 * Delete an item by ID
 * @param {string} id - Item ID to delete
 */
export const deleteItem = (id) => {
  state = { ...state, items: state.items.filter(item => item.id !== id) };
  saveState();
};

/**
 * Update filter tags
 * @param {string[]} tags - New filter tags
 */
export const updateFilterTags = (tags) => {
  state = { ...state, filterTags: tags };
  localStorage.setItem(STORAGE_KEYS.filters, JSON.stringify(tags));
  notifyListeners();
};

/**
 * Update search query
 * @param {string} query - Search query
 */
export const updateSearch = (query) => {
  state = { ...state, search: query };
  notifyListeners();
};

/**
 * Update profile name
 * @param {string} name - Profile name
 */
export const updateProfile = (name) => {
  const trimmedName = (name || '').trim();
  state = { ...state, profileName: trimmedName };
  localStorage.setItem(STORAGE_KEYS.profile, trimmedName);
  notifyListeners();
};

/**
 * Set the editing item ID
 * @param {string|null} id - Item ID or null
 */
export const setEditingId = (id) => {
  state = { ...state, editingId: id };
  notifyListeners();
};

/**
 * Get the current backup files
 * @returns {Array} Array of backup objects
 */
export const getBackups = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.backups) || '[]');
  } catch (error) {
    console.error('Failed to get backups:', error);
    return [];
  }
};

// Setup automatic backup interval
export const setupBackupInterval = () => {
  setInterval(doBackup, UI_CONFIG.backupInterval);
};

// Initialize the module
export const initState = () => {
  loadState();
  setupBackupInterval();
};
