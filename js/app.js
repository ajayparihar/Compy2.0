/**
 * Compy 2.0 - Main Application Module
 * Enhanced with better code organization, error handling, and modern JavaScript practices
 */

import { STORAGE_KEYS, UI_CONFIG, ICONS, DEFAULT_THEME } from './constants.js';
import { 
  $, $$, escapeHtml, highlightText, stringHash, downloadFile, 
  parseCSVLine, csvEscape, formatDate, focusElement, 
  getAllTags, filterItems, validateItem, debounce 
} from './utils.js';
import {
  initState, getState, subscribe, upsertItem,
  deleteItem, updateFilterTags, updateSearch, updateProfile,
  setEditingId, getBackups
} from './state.js';
import { createConfirmationManager, setGlobalConfirm } from './components/confirmation.js';
import { createModalManager } from './components/modals.js';
import { createTagAutocomplete } from './components/tagAutocomplete.js';

/**
 * @typedef {Object} AppItem
 * @property {string} id
 * @property {string} text
 * @property {string} desc
 * @property {boolean} sensitive
 * @property {string[]} tags
 */
/**
 * @typedef {Object} AppState
 * @property {AppItem[]} items
 * @property {string[]} filterTags
 * @property {string} search
 * @property {string|null} editingId
 * @property {string} profileName
 */
/**
 * @typedef {Object} EmptyStateOptions
 * @property {boolean} hasSearch
 * @property {boolean} hasFilters
 */

/**
 * Main Application Class
 *
 * Orchestrates UI initialization, state subscriptions, event handlers, and import/export flows
 * for the Compy application. This class does not own application data; it delegates persistence
 * to the state module and reads configuration from constants.
 *
 * External dependencies:
 * - Web Clipboard API (navigator.clipboard) with an execCommand fallback for older browsers
 * - localStorage (via state and theme helpers) for persistence
 * - requestAnimationFrame for smooth rendering
 */
class CompyApp {
  /**
   * Construct a new CompyApp instance.
   * Binds handlers to maintain context when used as event listeners.
   */
  constructor() {
    this.initialized = false;
    this.clipboard = null;
    this.notifications = null;
    this.modalManager = null;
    this.confirmationManager = null;
    this.theme = null;
    this.search = null;
    this.cards = null;
    this.tagAutocomplete = null;
    
    // Filter modal transient state and handler guard
    this.filterState = null; // { allTags: string[], selectedTags: string[], query: string }
    this.filterHandlersBound = false;
    
    // Bind methods to maintain context
    this.handleStateChange = this.handleStateChange.bind(this);
    this.handleKeyboardShortcuts = this.handleKeyboardShortcuts.bind(this);
    this.handleModalKeyboard = this.handleModalKeyboard.bind(this);
    this.removeItem = this.removeItem.bind(this);
    this.setupMobileNavigation = this.setupMobileNavigation.bind(this);
    this.setupResponsiveNavbar = this.setupResponsiveNavbar.bind(this);
  }

  /**
   * Initialize the application UI and services.
   *
   * Responsibilities:
   * - Load state and theme from storage
   * - Initialize core components (clipboard, notifications, modals, search, cards, profile)
   * - Subscribe to state changes and wire global keyboard handlers
   * - Measure responsive navbar height
   *
   * Errors are surfaced to the user via a non-blocking notification.
   * @returns {Promise<void>}
   */
  async init() {
    if (this.initialized) return;

    try {
      // Initialize components first
      this.initClipboard();
      this.initNotifications();
      this.initModals();
      this.initTheme();
      this.initSearch();
      this.initCards();
      this.initProfile();
      this.initExport();
      this.initImport();
      this.initEventHandlers();
      
      // Subscribe to state changes before initializing state
      subscribe(this.handleStateChange);
      
      // Initialize state management (this will trigger initial render)
      initState();
      
      // Setup keyboard shortcuts
      document.addEventListener('keydown', this.handleKeyboardShortcuts);
      
      // Setup responsive navbar
      this.setupResponsiveNavbar();
      
      // Setup mobile navigation menu
      this.setupMobileNavigation();
      
      this.initialized = true;
      console.log('Compy 2.0 initialized successfully');
      
    } catch (error) {
      console.error('Failed to initialize Compy 2.0:', error);
      this.showNotification('Failed to initialize application', 'error');
    }
  }

  /**
   * React to state changes by updating dependent UI regions.
   * @param {Object} state - Immutable snapshot of the current application state
   */
  handleStateChange(state) {
    this.renderCards(state);
    this.renderProfile(state);
    this.renderFilterBadge(state);
    this.updateSearchInput(state);
  }

  /**
   * Initialize clipboard functionality with fallback support
   * 
   * Creates a clipboard management object with intelligent fallback handling.
   * The modern Clipboard API is preferred for better security and user experience,
   * but falls back to execCommand for broader browser compatibility.
   * 
   * Clipboard Security:
   * - Modern browsers require secure context (HTTPS or localhost)
   * - User interaction is required for clipboard access
   * - Some browsers require explicit permissions
   * 
   * Performance Optimization:
   * - Checks API availability once during initialization
   * - Avoids repeated feature detection on each copy operation
   */
  initClipboard() {
    // Pre-check clipboard API availability for performance
    const hasClipboardAPI = navigator.clipboard && 
                          typeof navigator.clipboard.writeText === 'function';
    
    this.clipboard = {
      copy: async (text) => {
        // Input validation - prevent empty or invalid copy operations
        if (!text || typeof text !== 'string') {
          console.warn('Clipboard copy attempted with invalid text:', text);
          return false;
        }
        
        try {
          if (hasClipboardAPI) {
            // Use modern Clipboard API for better security and UX
            await navigator.clipboard.writeText(text);
            this.showNotification('Copied to clipboard', 'success');
            return true;
          } else {
            // Fall back to legacy method for older browsers
            return this.fallbackCopy(text);
          }
        } catch (error) {
          // Modern API failed - try fallback as last resort
          console.warn('Modern clipboard API failed, trying fallback:', error);
          return this.fallbackCopy(text);
        }
      }
    };
  }

  /**
   * Fallback clipboard copy method using execCommand for older browser compatibility
   * 
   * This method is used when the modern Clipboard API fails or is unavailable.
   * It creates a temporary textarea, selects the content, and uses the deprecated
   * but widely-supported execCommand('copy') to copy text to clipboard.
   * 
   * @param {string} text - Text to copy to clipboard
   */
  fallbackCopy(text) {
    // Create temporary textarea element for text selection
    // Using textarea instead of input to handle multi-line text properly
    const textarea = document.createElement('textarea');
    textarea.value = text;
    
    // Position element off-screen to avoid visual disruption
    // Using fixed positioning to avoid layout shifts
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    textarea.style.top = '0'; // Add top positioning for better accessibility
    textarea.setAttribute('readonly', ''); // Prevent mobile keyboard popup
    
    // Add to DOM temporarily - required for selection to work
    document.body.appendChild(textarea);
    
    try {
      // Select all text in the textarea
      textarea.select();
      
      // For mobile Safari compatibility, ensure the selection is proper
      textarea.setSelectionRange(0, 99999);
      
      // Attempt to copy using the legacy API
      const success = document.execCommand('copy');
      
      // Provide user feedback based on operation success
      this.showNotification(
        success ? 'Copied to clipboard' : 'Copy failed - please try manually selecting and copying',
        success ? 'info' : 'error'
      );
      
      return success;
      
    } catch (error) {
      console.error('Fallback copy failed:', error);
      this.showNotification('Copy failed - please try manually', 'error');
      return false;
    } finally {
      // Always clean up the temporary element, even if copy failed
      document.body.removeChild(textarea);
    }
  }

  /**
   * Initialize ephemeral notification system (snackbar).
   * Uses UI_CONFIG.snackbarDuration for auto-dismiss timing.
   */
  initNotifications() {
    const snackbar = $('#snackbar');
    
    this.notifications = {
      show: (message, type = 'info', duration = UI_CONFIG.snackbarDuration) => {
        snackbar.textContent = message;
        snackbar.className = `snackbar ${type}`;
        snackbar.classList.add('show');
        
        setTimeout(() => {
          snackbar.classList.remove('show');
        }, duration);
      }
    };
  }

  /**
   * Show a transient snackbar message.
   * @param {string} message - Message to display
   * @param {'info'|'error'} [type='info'] - Visual style of the snackbar
   */
  showNotification(message, type = 'info') {
    this.notifications.show(message, type);
  }

  /**
   * Initialize modal helpers and close-button behaviors.
   * Relies on [data-close-modal] attributes inside .modal elements.
   */
  initModals() {
    // Initialize accessible modal manager with focus handling
    this.modalManager = createModalManager({
      closeOnBackdropClick: true,
      closeOnEscape: true,
      focusDelay: 100
    });

    // Initialize confirmation manager with modal manager
    this.confirmationManager = createConfirmationManager(this.modalManager);

    // Set global confirm function for easy access
    setGlobalConfirm((options) => this.confirmationManager.show(options));
  }

  /**
   * Initialize theme switching and persistence.
   * Persists user choice in localStorage and applies a short CSS transition class
   * to avoid abrupt theme changes.
   */
  initTheme() {
    const themeSelect = $('#themeSelect');
    
    this.theme = {
      apply: (themeName) => {
        document.documentElement.setAttribute('data-theme', themeName);
        localStorage.setItem(STORAGE_KEYS.theme, themeName);
        themeSelect.value = themeName;
        
        // Add transition class for smooth theme switching
        document.documentElement.classList.add('theme-switching');
        setTimeout(() => {
          document.documentElement.classList.remove('theme-switching');
        }, 300);
      },
      
      load: () => {
        const savedTheme = localStorage.getItem(STORAGE_KEYS.theme) || DEFAULT_THEME;
        this.theme.apply(savedTheme);
      }
    };

    // Load saved theme
    this.theme.load();

    // Handle theme changes
    themeSelect.addEventListener('change', (e) => {
      this.theme.apply(e.target.value);
    });
  }

  /**
   * Initialize search input, clear button, and debounced state updates.
   */
  initSearch() {
    const searchInput = $('#searchInput');
    const searchClear = $('#searchClear');
    
    this.search = {
      focus: () => {
        searchInput.focus();
      },
      
      clear: () => {
        searchInput.value = '';
        updateSearch('');
      }
    };

    // Handle search input
    searchInput.addEventListener('input', debounce((e) => {
      updateSearch(e.target.value);
    }, 150));

    // Handle clear button
    searchClear.addEventListener('click', this.search.clear);
  }

  /**
   * Keep the search input value in sync with state without causing extra input events.
   * @param {Object} state - Current application state
   */
  updateSearchInput(state) {
    const searchInput = $('#searchInput');
    if (searchInput.value !== state.search) {
      searchInput.value = state.search;
    }
  }

  /**
   * Initialize card rendering helpers and the Add button handler.
   */
  initCards() {
    const cardsContainer = $('#cards');
    
    this.cards = {
      render: (items, search = '') => {
        this.renderCards({ items, search });
      },
      
      showSkeleton: () => {
        cardsContainer.innerHTML = '';
        const skeletonCount = Math.min(UI_CONFIG.skeletonCount, 6);
        
        for (let i = 0; i < skeletonCount; i++) {
          const skeleton = document.createElement('div');
          skeleton.className = 'skel-card skeleton';
          skeleton.setAttribute('aria-hidden', 'true');
          cardsContainer.appendChild(skeleton);
        }
      }
    };

    // Handle add button
    $('#addBtn').addEventListener('click', () => this.openItemModal());
    
    // Handle floating action button (FAB) for mobile
    $('#fabAdd')?.addEventListener('click', () => this.openItemModal());
  }

  /**
   * Render the visible list of cards from state.
   * Uses requestAnimationFrame to batch DOM work for smooth updates.
   * @param {Object} state - Current application state
   */
  renderCards(state) {
    const container = $('#cards');
    const filteredItems = filterItems(state.items, state.search, state.filterTags);
    
    // Use animation frame for smooth rendering
    requestAnimationFrame(() => {
      container.innerHTML = '';
      
      // Handle empty states
      if (state.items.length === 0) {
        this.renderEmptyState(container, 'welcome');
        return;
      }
      
      if (filteredItems.length === 0) {
        this.renderEmptyState(container, 'no-results', { 
          hasSearch: !!state.search?.trim(),
          hasFilters: state.filterTags.length > 0
        });
        return;
      }

      // Remove empty state class
      container.classList.remove('empty-state');
      
      // Render cards
      filteredItems.forEach(item => {
        container.appendChild(this.createCardElement(item, state.search));
      });
    });
  }

  /**
   * Create a DOM element representing a single item card.
   * Respects the 'sensitive' flag by masking the title.
   * @param {Object} item - Item with text, desc, sensitive, tags
   * @param {string} [searchQuery=''] - Current search query for highlighting
   * @returns {HTMLElement}
   */
  createCardElement(item, searchQuery = '') {
    const card = document.createElement('article');
    card.className = 'card';
    card.tabIndex = 0;
    
    const displayText = item.sensitive ? '••••••••••' : escapeHtml(item.text);
    const highlightedText = highlightText(displayText, searchQuery);
    const highlightedDesc = highlightText(escapeHtml(item.desc), searchQuery);
    
    card.innerHTML = `
      <div class="actions" aria-label="Card actions">
        <button class="icon-btn" data-act="edit" title="Edit snippet" aria-label="Edit snippet">
          ${ICONS.edit}
        </button>
        <button class="icon-btn" data-act="delete" title="Delete snippet" aria-label="Delete snippet">
          ${ICONS.delete}
        </button>
        <button class="icon-btn" data-act="copy" title="Copy to clipboard" aria-label="Copy to clipboard">
          ${ICONS.copy}
        </button>
      </div>
      <div class="title">${highlightedText}</div>
      <div class="desc">${highlightedDesc}</div>
      <div class="tags">${this.renderTags(item.tags, searchQuery)}</div>
    `;

    // Setup event handlers
    this.setupCardEventHandlers(card, item);
    
    return card;
  }

  /**
   * Wire click/keyboard handlers for a card's interactions.
   * Click on card copies content unless an action button was clicked.
   * @param {HTMLElement} card - Card element
   * @param {Object} item - Item backing the card
   */
  setupCardEventHandlers(card, item) {
    // Click to copy (but not on action buttons)
    card.addEventListener('click', (e) => {
      if (!e.target.closest('.actions')) {
        this.clipboard.copy(item.text);
      }
    });

    // Keyboard support
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.clipboard.copy(item.text);
      }
    });

    // Action buttons
    card.querySelector('[data-act="edit"]').addEventListener('click', () => 
      this.openItemModal(item.id)
    );
    
    card.querySelector('[data-act="delete"]').addEventListener('click', () => 
      this.removeItem(item.id)
    );
    
    card.querySelector('[data-act="copy"]').addEventListener('click', () => 
      this.clipboard.copy(item.text)
    );
  }

  /**
   * Render tag chips for a card with deterministic hues and optional highlighting.
   * Limits visible chips to UI_CONFIG.maxVisibleTags and shows a '+N more' affordance.
   * @param {string[]} [tags=[]]
   * @param {string} [searchQuery='']
   * @returns {string} HTML string
   */
  renderTags(tags = [], searchQuery = '') {
    const maxVisible = UI_CONFIG.maxVisibleTags;
    const visibleTags = tags.slice(0, maxVisible);
    const extraCount = tags.length - visibleTags.length;
    
    let html = visibleTags.map(tag => {
      const highlighted = highlightText(escapeHtml(tag), searchQuery);
      const hue = Math.abs(stringHash(tag)) % 360;
      return `<span class="chip" style="--hue: ${hue}">${highlighted}</span>`;
    }).join('');
    
    if (extraCount > 0) {
      html += `<span class="more" data-more-tags title="Show all ${tags.length} tags">+${extraCount} more</span>`;
    }
    
    return html;
  }

  /**
   * Render contextual empty state UI (welcome or no-results) into container.
   * @param {HTMLElement} container - Target container
   * @param {'welcome'|'no-results'} type - Empty state variant
   * @param {Object} [options]
   */
  renderEmptyState(container, type, options = {}) {
    container.classList.add('empty-state');
    
    let content = '';
    
    switch (type) {
      case 'welcome':
        content = this.getWelcomeEmptyState();
        break;
      case 'no-results':
        content = this.getNoResultsEmptyState(options);
        break;
    }
    
    container.innerHTML = content;
    this.setupEmptyStateHandlers();
  }

  /**
   * Generate HTML for the initial welcome empty state.
   * @returns {string}
   */
  getWelcomeEmptyState() {
    return `
      <section class="empty">
        <div class="empty-card">
          <div class="hero-icon">📋</div>
          <h1>Welcome to Compy 2.0</h1>
          <p class="lead">Your personal clipboard for commands, snippets, credentials, and frequently used text.</p>
          <div class="empty-actions">
            <button id="emptyAddBtn" class="primary-btn">Add your first snippet</button>
            <button id="emptyImportBtn" class="secondary-btn">Import JSON/CSV</button>
          </div>
          <div class="divider"></div>
          <ul class="empty-tips">
            <li><strong>Search fast</strong> with Ctrl+F or /</li>
            <li><strong>Organize</strong> with tags and filters</li>
            <li><strong>Personalize</strong> with themes and your profile name</li>
          </ul>
        </div>
      </section>
    `;
  }

  /**
   * Generate HTML for the 'no results' empty state.
   * @param {{hasSearch: boolean, hasFilters: boolean}} param0 - Flags indicating current UI filters
   * @returns {string}
   */
  getNoResultsEmptyState({ hasSearch, hasFilters }) {
    let details = '';
    if (hasSearch && hasFilters) {
      details = 'No items match your search and selected filters.';
    } else if (hasSearch) {
      details = 'No items match your search.';
    } else if (hasFilters) {
      details = 'No items match the selected filters.';
    }

    const searchButton = hasSearch ? 
      '<button id="clearSearchBtn" class="secondary-btn">Clear search</button>' : '';
    const filtersButton = hasFilters ? 
      '<button id="clearFiltersBtn" class="secondary-btn">Clear filters</button>' : '';

    return `
      <section class="empty">
        <div class="empty-card">
          <div class="hero-icon">🔎</div>
          <h2>No results found</h2>
          <p class="lead">${details}</p>
          <div class="empty-actions">
            ${searchButton}
            ${filtersButton}
          </div>
        </div>
      </section>
    `;
  }

  /**
   * Attach event handlers for buttons rendered inside empty state UIs.
   */
  setupEmptyStateHandlers() {
    $('#emptyAddBtn')?.addEventListener('click', () => this.openItemModal());
    $('#emptyImportBtn')?.addEventListener('click', () => $('#importFile').click());
    $('#clearSearchBtn')?.addEventListener('click', () => {
      this.search.clear();
    });
    $('#clearFiltersBtn')?.addEventListener('click', () => {
      updateFilterTags([]);
    });
  }

  /**
   * Open the item modal for adding a new item or editing an existing one.
   * @param {string|null} [itemId=null] - ID of the item to edit; null for a new item
   */
  openItemModal(itemId = null) {
    setEditingId(itemId);
    const state = getState();
    const item = itemId ? state.items.find(i => i.id === itemId) : {
      text: '',
      desc: '',
      sensitive: false,
      tags: []
    };

    // Update modal title
    $('#itemModalTitle').textContent = itemId ? 'Edit Snippet' : 'Add Snippet';

    // Populate form
    $('#itemText').value = item.text;
    $('#itemDesc').value = item.desc;
    $('#itemSensitive').checked = item.sensitive;
    this.setTagChips(item.tags);

    this.modalManager.open('#itemModal', { initialFocus: '#itemText' });
  }

  /**
   * Show confirmation dialog and delete an item by ID if confirmed.
   * @param {string} itemId
   */
  async removeItem(itemId) {
    // Get the item details for the confirmation message
    const state = getState();
    const item = state.items.find(i => i.id === itemId);
    
    if (!item) {
      this.showNotification('Item not found', 'error');
      return;
    }
    
    // Show confirmation dialog
    const displayText = item.desc || item.text || 'this snippet';
    const truncatedText = displayText.length > 50 ? displayText.substring(0, 50) + '...' : displayText;
    
    const confirmed = await this.confirmationManager.show({
      title: 'Delete Snippet',
      message: `Delete "${truncatedText}"?\n\nThis action cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      variant: 'danger'
    });
    
    if (confirmed) {
      deleteItem(itemId);
      this.showNotification('Snippet deleted');
    }
  }

  /**
   * Initialize profile editing modal and related event handlers.
   */
  initProfile() {
    $('#profileEditBtn').addEventListener('click', () => {
      const state = getState();
      $('#profileNameInput').value = state.profileName;
      this.modalManager.open('#profileModal', { initialFocus: '#profileNameInput' });
    });

    $('#profileSaveBtn').addEventListener('click', () => {
      const name = $('#profileNameInput').value.trim();
      updateProfile(name);
      this.modalManager.close('#profileModal');
      this.showNotification('Profile updated');
    });

    // Handle Enter key in profile input
    $('#profileNameInput').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        $('#profileSaveBtn').click();
      }
    });
  }

  /**
   * Render the profile name indicator next to the app title.
   * @param {Object} state
   */
  renderProfile(state) {
    const display = $('#profileDisplay');
    display.textContent = state.profileName ? 
      `· ${state.profileName}'s Compy` : '';
  }

  /**
   * Update the filter count badge visibility and text.
   * @param {Object} state
   */
  renderFilterBadge(state) {
    const badge = $('#filterBadge');
    const count = state.filterTags.length;
    
    if (count > 0) {
      badge.textContent = count;
      badge.hidden = false;
    } else {
      badge.hidden = true;
    }
  }

  /**
   * Initialize export menu interactions (JSON, CSV, backups).
   */
  initExport() {
    // Export menu handling
    const exportBtn = $('#exportMenuBtn');
    const exportMenu = $('#exportMenu');
    
    exportBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      exportMenu.classList.toggle('open');
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('#exportMenu')) {
        exportMenu.classList.remove('open');
      }
    });

    // Export handlers
    exportMenu.addEventListener('click', (e) => {
      const button = e.target.closest('button');
      if (!button) return;

      exportMenu.classList.remove('open');
      const exportType = button.dataset.export;
      
      if (exportType === 'json') {
        this.exportJSON();
      } else if (exportType === 'csv') {
        this.exportCSV();
      } else if (button.id === 'backupsBtn') {
        this.openBackupsModal();
      }
    });
  }

  /**
   * Export the current state as a JSON file.
   * Uses a helper to trigger a safe, temporary download link.
   */
  exportJSON() {
    const state = getState();
    const payload = {
      profileName: state.profileName || '',
      items: state.items
    };
    
    downloadFile(
      'compy-export.json',
      JSON.stringify(payload, null, 2),
      'application/json'
    );
    
    this.showNotification('JSON export downloaded');
  }

  /**
   * Export the current state as a CSV file.
   * Includes an optional metadata section for profileName.
   */
  exportCSV() {
    const state = getState();
    const rows = [
      ['profileName'],
      [csvEscape(state.profileName || '')],
      [''],
      ['text', 'desc', 'sensitive', 'tags'],
      ...state.items.map(item => [
        csvEscape(item.text),
        csvEscape(item.desc),
        item.sensitive ? '1' : '0',
        csvEscape(item.tags.join('|'))
      ])
    ];
    
    const csv = rows.map(row => row.join(',')).join('\n');
    
    downloadFile('compy-export.csv', csv, 'text/csv');
    this.showNotification('CSV export downloaded');
  }

  /**
   * Initialize file import handling for JSON and CSV formats.
   */
  initImport() {
    const importFile = $('#importFile');
    
    importFile.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        
        if (file.name.endsWith('.json')) {
          this.importJSON(text);
        } else if (file.name.endsWith('.csv')) {
          this.importCSV(text);
        } else {
          this.showNotification('Unsupported file format', 'error');
        }
      } catch (error) {
        console.error('Import failed:', error);
        this.showNotification('Import failed', 'error');
      } finally {
        importFile.value = ''; // Clear file input
      }
    });
  }

  /**
   * Import items from a JSON payload.
   * Accepts both legacy array-only exports and the newer object format containing { items, profileName }.
   * @param {string} jsonText - Raw JSON string
   */
  importJSON(jsonText) {
    try {
      const parsed = JSON.parse(jsonText);
      let items = [];
      
      if (Array.isArray(parsed)) {
        // Legacy format: array of items
        items = parsed;
      } else if (parsed && typeof parsed === 'object' && Array.isArray(parsed.items)) {
        // New format with profile
        items = parsed.items;
        
        if (typeof parsed.profileName === 'string' && parsed.profileName.trim()) {
          updateProfile(parsed.profileName.trim());
        }
      } else {
        throw new Error('Invalid JSON format');
      }

      let importCount = 0;
      for (const item of items) {
        if (this.addImportedItem(item)) {
          importCount++;
        }
      }

      this.showNotification(`Imported ${importCount} items`);
      
    } catch (error) {
      console.error('JSON import failed:', error);
      this.showNotification('Invalid JSON file', 'error');
    }
  }

  /**
   * Import items from a CSV payload with comprehensive parsing and validation
   * 
   * This function handles the complex task of parsing CSV data with support for:
   * - Optional metadata header (profile information)
   * - Robust quote handling and field parsing
   * - BOM (Byte Order Mark) removal for international files
   * - Flexible column mapping and validation
   * 
   * CSV Format Support:
   * 1. Optional metadata block: profileName header followed by value
   * 2. Main data: text, desc, sensitive, tags columns
   * 3. Tags are pipe-separated (|) within the tags column
   * 4. Sensitive values: '1' or 'true' (case-insensitive)
   * 
   * @param {string} csvText - Raw CSV string from uploaded file
   */
  importCSV(csvText) {
    try {
      // Split into lines and filter out empty lines
      // Handle both Windows (\r\n) and Unix (\n) line endings
      const lines = csvText.split(/\r?\n/).filter(line => line.trim());
      if (!lines.length) {
        throw new Error('Empty CSV file');
      }

      // Parse the first line to detect format
      // Remove BOM (Byte Order Mark) that may be present in UTF-8 files from Excel
      const firstLine = parseCSVLine(lines[0].replace(/^\uFEFF/, ''));
      let headerIndex = 0; // Track where the actual data headers start
      
      // PHASE 1: Check for optional profile metadata block
      // Format: single column 'profileName' followed by data line
      if (firstLine.length === 1 && firstLine[0].toLowerCase() === 'profilename') {
        console.log('Detected profile metadata in CSV');
        
        // Extract profile name from the next line
        const profileLine = lines[1];
        if (profileLine) {
          const profileData = parseCSVLine(profileLine);
          const profileName = (profileData[0] || '').trim();
          
          // Update profile if valid name provided
          if (profileName) {
            console.log('Importing profile name:', profileName);
            updateProfile(profileName);
          }
        }
        
        // Skip metadata block - actual headers start at line 3 (index 2)
        headerIndex = 2;
      }

      // PHASE 2: Parse column headers and create mapping
      const headerLine = lines[headerIndex];
      if (!headerLine) {
        throw new Error('No headers found after metadata parsing');
      }
      
      // Normalize headers to lowercase for case-insensitive matching
      const headers = parseCSVLine(headerLine).map(h => h.toLowerCase().trim());
      
      // Create column index mapping for required and optional fields
      const columnMapping = {
        text: headers.indexOf('text'),
        desc: headers.indexOf('desc'),
        sensitive: headers.indexOf('sensitive'),
        tags: headers.indexOf('tags')
      };

      // Validate required columns are present
      if (columnMapping.text === -1 || columnMapping.desc === -1) {
        throw new Error('Required columns missing: text and desc columns are mandatory');
      }
      
      console.log('CSV column mapping:', columnMapping);

      // PHASE 3: Process data rows
      let importCount = 0;
      let skippedCount = 0;
      
      // Process each data line (starting after headers)
      for (let i = headerIndex + 1; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Skip empty lines (common in CSV exports)
        if (!line) {
          continue;
        }

        try {
          // Parse the line into field values
          const values = parseCSVLine(line);
          
          // PHASE 3A: Extract and validate core fields
          const itemData = {
            text: (values[columnMapping.text] || '').trim(),
            desc: (values[columnMapping.desc] || '').trim(),
            
            // PHASE 3B: Parse sensitive flag with flexible boolean handling
            // Accepts: '1', 'true', 'TRUE', 'True' etc.
            sensitive: columnMapping.sensitive >= 0 ? 
              ['1', 'true'].includes((values[columnMapping.sensitive] || '').toLowerCase()) : false,
            
            // PHASE 3C: Parse tags with pipe separator
            // Format: "tag1|tag2|tag3" -> ['tag1', 'tag2', 'tag3']
            tags: columnMapping.tags >= 0 ? 
              (values[columnMapping.tags] || '')
                .split('|') // Split on pipe separator
                .map(t => t.trim()) // Trim whitespace from each tag
                .filter(Boolean) // Remove empty tags
              : []
          };

          // PHASE 3D: Validate and import the item
          if (this.addImportedItem(itemData)) {
            importCount++;
          } else {
            skippedCount++;
            console.warn(`Skipped invalid item on line ${i + 1}:`, itemData);
          }
          
        } catch (lineError) {
          // Handle parsing errors for individual lines gracefully
          skippedCount++;
          console.warn(`Failed to parse line ${i + 1}:`, lineError.message);
        }
      }

      // Provide detailed feedback to user
      const message = skippedCount > 0 
        ? `Imported ${importCount} items (${skippedCount} skipped due to validation errors)`
        : `Imported ${importCount} items`;
      
      this.showNotification(message, importCount > 0 ? 'success' : 'info');
      
      if (importCount === 0 && skippedCount > 0) {
        console.error('No valid items found in CSV. Check format and required fields.');
      }
      
    } catch (error) {
      // Handle critical parsing errors
      console.error('CSV import failed:', error);
      this.showNotification(
        `CSV import failed: ${error.message}`, 
        'error'
      );
    }
  }

  /**
   * Validate and insert an imported item into state.
   * @param {Object} itemData - Candidate item
   * @returns {boolean} True if item was accepted
   */
  addImportedItem(itemData) {
    const validation = validateItem(itemData);
    if (!validation.isValid) {
      console.warn('Skipping invalid item:', validation.errors);
      return false;
    }

    upsertItem({
      text: itemData.text,
      desc: itemData.desc,
      sensitive: !!itemData.sensitive,
      tags: Array.isArray(itemData.tags) ? itemData.tags : []
    });

    return true;
  }


  /**
   * Open the backups modal listing auto-saved snapshots with download actions.
   */
  openBackupsModal() {
    const backups = getBackups();
    const list = $('#backupsList');
    list.innerHTML = '';

    if (backups.length === 0) {
      list.innerHTML = '<div class="empty-note">No backups available</div>';
    } else {
      backups.forEach(backup => {
        const button = document.createElement('button');
        const date = formatDate(backup.ts);
        button.textContent = `${date} (${backup.items.length} items)`;
        button.addEventListener('click', () => {
          const filename = `compy-backup-${backup.ts.replace(/[:.]/g, '-')}.json`;
          downloadFile(filename, JSON.stringify(backup.items, null, 2), 'application/json');
        });
        list.appendChild(button);
      });
    }

    this.modalManager.open('#backupsModal');
  }

  /**
   * Register global UI event handlers for header actions, forms, tags, and overlays.
   */
  initEventHandlers() {
    // Brand click - refresh page
    $('#brand').addEventListener('click', () => location.reload());

    // About button
    $('#aboutBtn').addEventListener('click', () => this.modalManager.open('#aboutModal'));

    // Filter button
    $('#filterBtn').addEventListener('click', () => this.openFilterModal());

    // Item form submission
    $('#itemForm').addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveItem();
    });

    // Clear field buttons
    $$('[data-clear]').forEach(button => {
      button.addEventListener('click', () => {
        const target = $(button.getAttribute('data-clear'));
        if (target) {
          target.value = '';
          target.focus();
        }
      });
    });

    // Tag input handling
    this.initTagInput();

    // More tags modal
    document.addEventListener('click', (e) => {
      const moreButton = e.target.closest('[data-more-tags]');
      if (moreButton) {
        this.showMoreTags(moreButton);
      }
    });
  }

  /**
   * Initialize tag entry behaviors with autocomplete support.
   * Includes Enter to add, Backspace to remove last, and autocomplete suggestions.
   */
  initTagInput() {
    const tagEntry = $('#tagEntry');
    
    // Initialize tag autocomplete
    this.tagAutocomplete = createTagAutocomplete('#tagEntry', {
      onTagSelect: (tag) => {
        this.addTagChip(tag);
        // Refresh autocomplete suggestions after adding tag
        setTimeout(() => {
          if (this.tagAutocomplete) {
            this.tagAutocomplete.refresh();
          }
        }, 50);
      },
      getExistingTags: () => this.getTagsFromChips(),
      maxSuggestions: 8,
      minChars: 1,
      debounceMs: 150
    });
    
    tagEntry.addEventListener('keydown', (e) => {
      const value = e.target.value.trim();
      
      // Handle Enter key - only add tag if no autocomplete suggestion is selected
      if (e.key === 'Enter' && value) {
        // Check if autocomplete dropdown is visible and has a selection
        if (this.tagAutocomplete && this.tagAutocomplete.isDropdownVisible()) {
          // Let autocomplete handle the Enter key
          return;
        }
        
        // No autocomplete suggestion selected, add the typed value
        e.preventDefault();
        this.addTagChip(value);
        e.target.value = '';
        
        // Refresh autocomplete after adding tag
        setTimeout(() => {
          if (this.tagAutocomplete) {
            this.tagAutocomplete.refresh();
          }
        }, 50);
      } else if (e.key === 'Backspace' && !e.target.value) {
        // Remove last tag chip
        const chips = $$('#tagChips .chip');
        const lastChip = chips[chips.length - 1];
        if (lastChip) {
          lastChip.remove();
          // Refresh autocomplete after removing tag
          setTimeout(() => {
            if (this.tagAutocomplete) {
              this.tagAutocomplete.refresh();
            }
          }, 50);
        }
      }
    });
  }

  /**
   * Render a set of tag chips into the edit form.
   * @param {string[]} tags
   */
  setTagChips(tags) {
    const container = $('#tagChips');
    container.innerHTML = '';
    tags.forEach(tag => this.addTagChip(tag));
  }

  /**
   * Append a single tag chip if it is non-empty and not a duplicate.
   * @param {string} tagText
   */
  addTagChip(tagText) {
    const normalizedTag = tagText.trim();
    if (!normalizedTag) return;

    // Check for duplicates
    const existing = $$('#tagChips .chip').some(chip => 
      chip.dataset.value === normalizedTag
    );
    if (existing) return;

    const chip = document.createElement('span');
    chip.className = 'chip';
    chip.dataset.value = normalizedTag;
    
    const hue = Math.abs(stringHash(normalizedTag)) % 360;
    chip.style.setProperty('--hue', hue);
    
    chip.innerHTML = `
      ${escapeHtml(normalizedTag)} 
      <span class="x" title="Remove tag" aria-label="Remove ${normalizedTag} tag">×</span>
    `;
    
    // Handle removal
    chip.querySelector('.x').addEventListener('click', () => {
      chip.remove();
    });

    $('#tagChips').appendChild(chip);
  }

  /**
   * Collect tag values from the currently rendered chips.
   * @returns {string[]}
   */
  getTagsFromChips() {
    return $$('#tagChips .chip').map(chip => chip.dataset.value);
  }

  /**
   * Validate and persist the item currently in the edit form.
   * Shows a notification on success or the first validation error.
   */
  saveItem() {
    const text = $('#itemText').value.trim();
    const desc = $('#itemDesc').value.trim();
    const sensitive = $('#itemSensitive').checked;
    const tags = this.getTagsFromChips();

    const validation = validateItem({ text, desc });
    if (!validation.isValid) {
      this.showNotification(validation.errors[0], 'error');
      return;
    }

    upsertItem({ text, desc, sensitive, tags });
    this.modalManager.close('#itemModal');
    this.showNotification('Snippet saved');
  }

  /**
   * Open the filter modal populated with the deduplicated tag list.
   */
  openFilterModal() {
    const state = getState();
    const allTags = getAllTags(state.items);

    // Initialize transient filter modal state
    this.filterState = {
      allTags,
      selectedTags: [...state.filterTags],
      query: ''
    };

    // Reset search input and render initial list
    const searchInput = $('#filterTagSearch');
    if (searchInput) searchInput.value = '';
    this.renderFilterList(this.filterState.allTags, this.filterState.selectedTags, this.filterState.query);

    // Ensure handlers are attached once
    this.ensureFilterModalHandlers();

    // Open modal with focus on search
    this.modalManager.open('#filterModal', { initialFocus: '#filterTagSearch' });
  }

  /**
   * Render the filterable tag checklist inside the modal.
   * @param {string[]} allTags - All tags across items (unique, sorted)
   * @param {string[]} selectedTags - Currently selected filter tags
   * @param {string} [searchQuery=''] - Filter query for the list itself
   */
  renderFilterList(allTags, selectedTags, searchQuery = '') {
    const list = $('#filterTagList');
    list.innerHTML = '';

    const filteredTags = searchQuery ? 
      allTags.filter(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())) : 
      allTags;

    if (filteredTags.length === 0) {
      const message = allTags.length === 0 ? 
        'No tags yet. Add tags to items to filter by them.' :
        `No tags match "${escapeHtml(searchQuery)}".`;
      list.innerHTML = `<div class="empty-note">${message}</div>`;
      return;
    }

    filteredTags.forEach(tag => {
      // Stable, safe ID for label/input pairing (handles spaces/special chars)
      const slug = tag.toLowerCase().replace(/[^a-z0-9\-_]+/g, '-').slice(0, 24);
      const id = `filter-tag-${slug}-${Math.abs(stringHash(tag))}`;
      const isSelected = selectedTags.includes(tag);
      
      const label = document.createElement('label');
      label.className = 'list-row';
      label.htmlFor = id;
      
      label.innerHTML = `
        <input 
          id="${id}" 
          type="checkbox" 
          value="${escapeHtml(tag)}"
          ${isSelected ? 'checked' : ''}
        />
        <span>${highlightText(escapeHtml(tag), searchQuery)}</span>
      `;
      
      list.appendChild(label);
    });
  }

  /**
   * Ensure filter modal handlers are attached only once.
   * Wires up search within filter, checkbox selection, and apply/clear actions.
   */
  ensureFilterModalHandlers() {
    if (this.filterHandlersBound) return;

    const list = $('#filterTagList');
    const searchInput = $('#filterTagSearch');
    const applyBtn = $('#applyFilterBtn');
    const clearBtn = $('#clearFilterBtn');
    const clearSearchBtn = document.querySelector('button[data-clear="#filterTagSearch"]');

    // Event delegation for checkbox changes (preserves handlers across re-renders)
    list.addEventListener('change', (e) => {
      const cb = e.target?.closest('input[type="checkbox"]');
      if (!cb) return;
      const tag = cb.value;
      if (!this.filterState) return;
      const { selectedTags } = this.filterState;
      const idx = selectedTags.indexOf(tag);
      if (cb.checked) {
        if (idx === -1) selectedTags.push(tag);
      } else if (idx > -1) {
        selectedTags.splice(idx, 1);
      }
    });

    // Debounced search within tags list
    const onSearchInput = debounce((e) => {
      if (!this.filterState) return;
      this.filterState.query = e.target.value;
      this.renderFilterList(this.filterState.allTags, this.filterState.selectedTags, this.filterState.query);
    }, 120);
    searchInput.addEventListener('input', onSearchInput);

    // When the clear button for the search input is clicked, also re-render
    clearSearchBtn?.addEventListener('click', () => {
      if (!this.filterState) return;
      this.filterState.query = '';
      // Let the global clear handler wipe the input; we just re-render
      this.renderFilterList(this.filterState.allTags, this.filterState.selectedTags, '');
    });

    // Apply selected filters to state and close modal
    applyBtn.addEventListener('click', () => {
      if (!this.filterState) return;
      updateFilterTags([...this.filterState.selectedTags]);
      this.modalManager.close('#filterModal');
    });

    // Clear filters (keep modal open) and re-render list to reflect unselected state
    clearBtn.addEventListener('click', () => {
      if (!this.filterState) return;
      this.filterState.selectedTags = [];
      updateFilterTags([]);
      this.renderFilterList(this.filterState.allTags, this.filterState.selectedTags, this.filterState.query || '');
    });

    this.filterHandlersBound = true;
  }

  /**
   * Open a modal to display all tags for a specific card when '+N more' is clicked.
   * @param {HTMLElement} moreButton - The '+N more' button element inside a card
   */
  showMoreTags(moreButton) {
    const card = moreButton.closest('.card');
    const cards = Array.from($('#cards').children);
    const cardIndex = cards.indexOf(card);
    const state = getState();
    const filteredItems = filterItems(state.items, state.search, state.filterTags);
    const item = filteredItems[cardIndex];
    
    if (!item) return;

    const list = $('#allTagsList');
    list.innerHTML = '';
    
    item.tags.forEach(tag => {
      const chip = document.createElement('span');
      chip.className = 'chip';
      const hue = Math.abs(stringHash(tag)) % 360;
      chip.style.setProperty('--hue', hue);
      chip.textContent = tag;
      list.appendChild(chip);
    });

    this.modalManager.open('#moreTagsModal');
  }

  /**
   * Global keyboard shortcuts for search and new-item creation.
   * @param {KeyboardEvent} e
   */
  handleKeyboardShortcuts(e) {
    // Search shortcuts
    if ((e.ctrlKey && e.key.toLowerCase() === 'f') || e.key === '/') {
      e.preventDefault();
      this.search.focus();
      return;
    }

    // Add item shortcut
    if (e.ctrlKey && e.key.toLowerCase() === 'n') {
      e.preventDefault();
      this.openItemModal();
      return;
    }
  }

  /**
   * Close any open modal on Escape to align with common accessibility patterns.
   * @param {KeyboardEvent} e
   */
  handleModalKeyboard(e) {
    if (e.key === 'Escape' && this.modalManager && this.modalManager.hasOpenModals && this.modalManager.hasOpenModals()) {
      // Close the topmost modal using the modal manager
      this.modalManager.close();
    }
  }

  /**
   * Measure the navbar height and expose it as a CSS custom property (--nav-h).
   * Keeps layout spacing correct across resizes.
   */
  setupResponsiveNavbar() {
    const adjustHeight = () => {
      const navbar = $('.navbar');
      if (!navbar) return;
      
      const height = navbar.getBoundingClientRect().height;
      document.documentElement.style.setProperty('--nav-h', `${height}px`);
    };

    // Adjust on load and resize
    adjustHeight();
    window.addEventListener('resize', adjustHeight);
    window.addEventListener('load', adjustHeight);
  }

  /**
   * Initialize mobile navigation menu functionality.
   * Sets up the hamburger menu button to toggle the navigation drawer.
   */
  setupMobileNavigation() {
    const navToggle = $('#navToggle');
    const navActions = $('#navActions');
    const navBackdrop = $('#navBackdrop');
    
    if (!navToggle || !navActions) {
      console.warn('Mobile navigation elements not found');
      return;
    }

    // Toggle navigation drawer
    const toggleNav = () => {
      const isExpanded = navToggle.getAttribute('aria-expanded') === 'true';
      const newState = !isExpanded;
      
      // Update toggle button state
      navToggle.setAttribute('aria-expanded', newState.toString());
      
      // Update drawer visibility
      navActions.setAttribute('aria-hidden', (!newState).toString());
      
      // Update backdrop visibility if it exists
      if (navBackdrop) {
        navBackdrop.setAttribute('aria-hidden', (!newState).toString());
      }
      
      // Add/remove open class for CSS transitions
      if (newState) {
        navActions.classList.add('open');
        if (navBackdrop) navBackdrop.classList.add('open');
      } else {
        navActions.classList.remove('open');
        if (navBackdrop) navBackdrop.classList.remove('open');
      }
    };

    // Close navigation drawer
    const closeNav = () => {
      navToggle.setAttribute('aria-expanded', 'false');
      navActions.setAttribute('aria-hidden', 'true');
      navActions.classList.remove('open');
      
      if (navBackdrop) {
        navBackdrop.setAttribute('aria-hidden', 'true');
        navBackdrop.classList.remove('open');
      }
    };

    // Handle hamburger menu click
    navToggle.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleNav();
    });

    // Handle backdrop click to close drawer
    if (navBackdrop) {
      navBackdrop.addEventListener('click', () => {
        closeNav();
      });
    }

    // Close drawer when clicking outside or on navigation items
    document.addEventListener('click', (e) => {
      const isNavContent = e.target.closest('#navActions');
      const isNavToggle = e.target.closest('#navToggle');
      
      if (!isNavContent && !isNavToggle && navToggle.getAttribute('aria-expanded') === 'true') {
        closeNav();
      }
    });

    // Close drawer when navigation items are clicked
    navActions.addEventListener('click', (e) => {
      const isButton = e.target.closest('button');
      if (isButton && navToggle.getAttribute('aria-expanded') === 'true') {
        // Add small delay to allow action to complete before closing
        setTimeout(() => closeNav(), 100);
      }
    });

    // Handle Escape key to close drawer
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && navToggle.getAttribute('aria-expanded') === 'true') {
        closeNav();
      }
    });
  }

}

// Initialize and export the app
let appInstance = null;

/**
 * Initialize the Compy application singleton and return the instance.
 * @returns {Promise<CompyApp>} Resolved app instance
 */
export const initializeApp = async () => {
  if (appInstance) return appInstance;
  
  appInstance = new CompyApp();
  await appInstance.init();
  return appInstance;
};

/**
 * Get the current app instance if initialized.
 * @returns {CompyApp|null}
 */
export const getApp = () => appInstance;
