/**
 * Compy 2.0 - Main Application Module
 * Enhanced with better code organization, error handling, and modern JavaScript practices
 */

import { STORAGE_KEYS, UI_CONFIG, ICONS, DEFAULT_THEME } from './constants.js?v=2.0.2';
import { 
  $, $$, escapeHtml, highlightText, stringHash, downloadFile, 
  parseCSVLine, csvEscape, formatDate, 
  getAllTags, filterItems, validateItem, debounce, 
  addEventHandler, toggleVisibility, isValidTheme, getSafeTheme,
  Logger, DOMUtils, ValidationUtils, ErrorUtils
} from './utils.js?v=2.0.2';
import {
  initState, getState, subscribe, upsertItem,
  deleteItem, updateFilterTags, updateSearch, updateProfile,
  setEditingId, getBackups
} from './state.js?v=2.0.2';
import { createConfirmationManager, setGlobalConfirm } from './components/confirmation.js?v=2.0.2';
import { createModalManager } from './components/modals.js?v=2.0.2';
import { createTagAutocomplete } from './components/tagAutocomplete.js?v=2.0.2';
import { createMobileNavigationManager } from './components/mobileNavigation.js?v=2.0.2';
import { createThemePicker } from './components/themePicker.js?v=2.0.2';
import { createClipboardManager } from './components/clipboard.js?v=2.0.2';
import { createExpandableCardManager } from './components/expandableCard.js?v=2.0.2';

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
   * Main Application Class - Enhanced with Comprehensive Error Handling
   *
   * Orchestrates UI initialization, state subscriptions, event handlers, and import/export flows
   * for the Compy application. This class does not own application data; it delegates persistence
   * to the state module and reads configuration from constants.
   *
   * Architecture Improvements:
   * - Modular clipboard functionality with focused methods
   * - Enhanced error handling with graceful degradation
   * - Optimized DOM manipulation utilities
   * - Comprehensive input validation throughout
   * - Performance-optimized event handling
   *
   * External Dependencies:
   * - Web Clipboard API (navigator.clipboard) with execCommand fallback
   * - localStorage for data persistence (with error recovery)
   * - requestAnimationFrame for smooth UI updates
   * - Modern ES6+ features (async/await, destructuring, modules)
   *
   * Browser Compatibility:
   * - Supports all modern browsers (Chrome 60+, Firefox 60+, Safari 12+, Edge 79+)
   * - Graceful degradation for older browsers where possible
   * - Progressive enhancement for advanced features
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
    this.mobileNavigation = null;
    this.themePicker = null;
    this.expandableCardManager = null;
    
    // Manual scroll restoration across refreshes
    this.initialScrollY = 0;     // saved scroll position from previous session load (sessionStorage)
    this.scrollRestored = false; // whether we've already restored scroll after first render
    
    // Filter modal transient state and handler guard
    this.filterState = null; // { allTags: string[], selectedTags: string[], query: string }
    this.filterHandlersBound = false;
    
    // Card selection state for keyboard navigation
    this.selectedCardIndex = -1;
    this.cardElements = [];
    this.visibleItems = [];
    
    // Bind methods to maintain context
    this.handleStateChange = this.handleStateChange.bind(this);
    this.handleKeyboardShortcuts = this.handleKeyboardShortcuts.bind(this);
    this.handleModalKeyboard = this.handleModalKeyboard.bind(this);
    this.removeItem = this.removeItem.bind(this);
    this.setupMobileNavigation = this.setupMobileNavigation.bind(this);
    this.setupResponsiveNavbar = this.setupResponsiveNavbar.bind(this);
    
    // Card navigation methods
    this.selectCard = this.selectCard.bind(this);
    this.selectNextCard = this.selectNextCard.bind(this);
    this.selectPreviousCard = this.selectPreviousCard.bind(this);
    this.selectCardUp = this.selectCardUp.bind(this);
    this.selectCardDown = this.selectCardDown.bind(this);
    this.selectCardLeft = this.selectCardLeft.bind(this);
    this.selectCardRight = this.selectCardRight.bind(this);
    this.clearCardSelection = this.clearCardSelection.bind(this);
    this.handleCardKeyboardShortcuts = this.handleCardKeyboardShortcuts.bind(this);
    this.calculateGridColumns = this.calculateGridColumns.bind(this);
  }

  /**
   * Initialize core application components in proper order
   * @private
   */
  initCoreComponents() {
    this.initClipboard();
    this.initNotifications();
    this.initModals();
    this.initTheme();
    this.initSearch();
    this.initCards();
    this.initExpandableCards();
  }

  /**
   * Initialize user interface components
   * @private
   */
  initUIComponents() {
    this.initProfile();
    this.initExport();
    this.initImport();
    this.initEventHandlers();
  }

  /**
   * Initialize state management and event listeners
   * @private
   */
  initStateAndEvents() {
    // Subscribe to state changes before initializing state
    subscribe(this.handleStateChange);
    
    // Initialize state management (this will trigger initial render)
    initState();
    
    // Setup keyboard shortcuts
    document.addEventListener('keydown', this.handleKeyboardShortcuts);
    
    // Setup mobile navigation menu
    this.setupMobileNavigation();
  }

  /**
   * Setup global application access for components
   * @private
   */
  setupGlobalAccess() {
    if (typeof window !== 'undefined') {
      window.app = {
        showNotification: this.showNotification.bind(this),
        removeCardsByText: this.removeCardsByText.bind(this),
        instance: this
      };
    }
  }

  /**
   * Initialize the application UI and services.
   *
   * Main initialization method that coordinates all subsystem startup
   * in the correct order for optimal performance and user experience.
   *
   * @returns {Promise<void>}
   */
  async init() {
    if (this.initialized) return;

    try {
      // Initialize foundational systems
      this.initScrollPersistence();
      this.setupResponsiveNavbar();
      
      // Initialize core application components
      this.initCoreComponents();
      
      // Initialize user interface components
      this.initUIComponents();
      
      // Initialize state management and event handling
      this.initStateAndEvents();
      
      // Setup global access for components
      this.setupGlobalAccess();
      
      this.initialized = true;
      Logger.info('Compy 2.0 initialized successfully');
      
    } catch (error) {
      Logger.error('Failed to initialize Compy 2.0:', error);
      this.showNotification('Failed to initialize application', 'error');
    }
  }

  /**
   * Initialize manual scroll persistence/restoration across refreshes.
   * - Reads saved scrollY from sessionStorage
   * - Saves current scrollY on beforeunload/pagehide
   * - Temporarily disables entry animations to prevent perceived jumps
   */
  initScrollPersistence() {
    try {
      const saved = sessionStorage.getItem('compy.scrollY');
      this.initialScrollY = saved ? parseInt(saved, 10) || 0 : 0;
    } catch (e) {
      this.initialScrollY = 0;
    }

    const saveScroll = () => {
      try {
        const y = window.scrollY || document.documentElement.scrollTop || 0;
        sessionStorage.setItem('compy.scrollY', String(y));
      } catch (e) {}
    };
    window.addEventListener('beforeunload', saveScroll);
    window.addEventListener('pagehide', saveScroll);

    // Disable entry animation during first render to avoid any jank
    document.documentElement.classList.add('disable-entry-anim');
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
   * Initialize clipboard functionality using the reusable ClipboardManager
   * 
   * Creates a simplified clipboard interface using the dedicated ClipboardManager
   * component, eliminating duplicate code and improving maintainability.
   */
  initClipboard() {
    // Create notification adapter for the ClipboardManager
    const notificationAdapter = {
      show: (message, type = 'info') => {
        // Map manager-specific messaging to maintain consistency
        if (message === 'Copy not supported - please copy manually') {
          message = 'Copy failed - please try manually';
        }
        this.showNotification(message, type);
      }
    };

    // Initialize clipboard manager with validation wrapper
    const manager = createClipboardManager(notificationAdapter);
    this.clipboard = {
      copy: async (text) => {
        if (!this.validateClipboardInput(text)) {
          return false;
        }
        return manager.copy(text);
      }
    };
  }
  
  
  /**
   * Validate clipboard input before processing
   * 
   * @param {any} text - Text to validate
   * @returns {boolean} True if input is valid
   * @private
   */
  validateClipboardInput(text) {
    if (!text || typeof text !== 'string') {
      Logger.warn('Clipboard copy attempted with invalid text:', text);
      return false;
    }
    
    if (text.length === 0) {
      Logger.warn('Clipboard copy attempted with empty text');
      return false;
    }
    
    return true;
  }
  
  

  
  
  

  /**
   * Initialize ephemeral notification system (snackbar).
   * Uses UI_CONFIG.snackbarDuration for auto-dismiss timing.
   * Handles rapid successive notifications properly.
   */
  initNotifications() {
    const snackbar = $('#snackbar');
    let currentTimeoutId = null;
    
    this.notifications = {
      show: (message, type = 'info', duration = UI_CONFIG.snackbarDuration) => {
        // RAPID NOTIFICATION HANDLING: Clear existing timeout to prevent queue conflicts
        // Without this check, rapid successive notifications would create multiple
        // timeouts, causing unpredictable hide/show behavior
        if (currentTimeoutId) {
          clearTimeout(currentTimeoutId);
          currentTimeoutId = null;
        }
        
        // CONTENT UPDATE: Replace both message and styling atomically
        // Using className instead of classList.add ensures clean state
        // without accumulating previous type classes
        snackbar.textContent = message;
        snackbar.className = `snackbar ${type}`;
        
        // ANIMATION RESET: Force browser reflow to ensure CSS transitions work properly
        // This prevents animation conflicts when showing new notification immediately
        // after hiding the previous one. The offsetHeight access triggers layout.
        snackbar.offsetHeight;
        
        // VISIBILITY CONTROL: Add show class to trigger CSS animation
        snackbar.classList.add('show');
        
        // AUTO-HIDE TIMER: Schedule notification dismissal after specified duration
        // Store timeout ID to allow cancellation for rapid notifications
        currentTimeoutId = setTimeout(() => {
          snackbar.classList.remove('show');
          currentTimeoutId = null; // Clean up reference for next notification
        }, duration);
      },
      
      // Method to manually clear/hide current notification
      hide: () => {
        if (currentTimeoutId) {
          clearTimeout(currentTimeoutId);
          currentTimeoutId = null;
        }
        snackbar.classList.remove('show');
      }
    };
  }

  /**
   * Show a transient snackbar message.
   * @param {string} message - Message to display
   * @param {'info'|'success'|'warning'|'error'} [type='info'] - Visual style of the snackbar
   */
  showNotification(message, type = 'info') {
    try {
      if (!this.notifications || typeof this.notifications.show !== 'function') {
        Logger.warn('Notifications unavailable; skipping message', { message, type });
        return;
      }
      this.notifications.show(message, type);
    } catch (err) {
      Logger.warn('Notification error; skipping message', err);
    }
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
   * Initialize enhanced theme system with picker modal.
   * Persists user choice in localStorage and applies smooth transitions.
   */
  initTheme() {
    // Enhanced theme manager with smooth transitions
    this.theme = {
      apply: (themeName) => {
        try {
          // Validate theme name
          if (!themeName || typeof themeName !== 'string') {
            throw new Error('Invalid theme name provided');
          }
          
          // Apply theme to DOM
          document.documentElement.setAttribute('data-theme', themeName);
          document.documentElement.setAttribute('data-theme-source', 'js');
          
          // Persist to localStorage with error handling
          try {
            localStorage.setItem(STORAGE_KEYS.theme, themeName);
          } catch (storageError) {
            Logger.warn('Failed to save theme to localStorage:', storageError);
            // Continue without storage - theme will still work for current session
          }
          
          // Add transition class for smooth theme switching
          document.documentElement.classList.add('theme-switching');
          setTimeout(() => {
            document.documentElement.classList.remove('theme-switching');
          }, 300);
          
          // Update theme picker if available
          if (this.themePicker && this.themePicker.updateSelectedTheme) {
            this.themePicker.updateSelectedTheme(themeName);
          }
          
          Logger.debug('Theme applied successfully:', themeName);
        } catch (error) {
          Logger.error('Failed to apply theme:', error);
          this.showNotification('Failed to apply theme', 'error');
          
          // Try to recover with default theme
          try {
            document.documentElement.setAttribute('data-theme', DEFAULT_THEME);
            document.documentElement.setAttribute('data-theme-source', 'fallback');
          } catch (fallbackError) {
            Logger.error('Failed to apply fallback theme:', fallbackError);
          }
        }
      },
      
      load: () => {
        try {
          // Check if theme was already applied by HTML head script
          const themeSource = document.documentElement.getAttribute('data-theme-source');
          const currentTheme = document.documentElement.getAttribute('data-theme');
          
          if (themeSource === 'html' || themeSource === 'html-fallback') {
            // Theme already applied by HTML, just sync with our state
            Logger.debug('Theme already applied by HTML:', currentTheme);
            return;
          }
          
          // No theme applied yet, load from storage
          let savedTheme = DEFAULT_THEME;
          try {
            const stored = localStorage.getItem(STORAGE_KEYS.theme);
            if (stored && typeof stored === 'string') {
              savedTheme = stored;
            }
          } catch (storageError) {
            Logger.warn('Failed to read theme from localStorage:', storageError);
            // Continue with default theme
          }
          
          this.theme.apply(savedTheme);
        } catch (error) {
          Logger.error('Failed to load theme:', error);
          // Apply default theme as last resort
          try {
            document.documentElement.setAttribute('data-theme', DEFAULT_THEME);
            document.documentElement.setAttribute('data-theme-source', 'error-fallback');
          } catch (fallbackError) {
            Logger.error('Critical theme system failure:', fallbackError);
          }
        }
      },
      
      getCurrentTheme: () => {
        return document.documentElement.getAttribute('data-theme') || DEFAULT_THEME;
      }
    };

    // Load saved theme (respecting HTML head application)
    this.theme.load();
    
    // Initialize enhanced theme picker
    try {
      this.themePicker = createThemePicker(this.modalManager, this.theme);
      this.themePicker.init();
    } catch (error) {
      Logger.warn('Failed to initialize theme picker:', error);
      // Fallback to basic theme functionality
    }
    
    // Setup cross-tab synchronization
    this.setupThemeSync();
  }

  /**
   * Setup cross-tab theme synchronization using storage events
   * 
   * Listens for localStorage changes in other tabs and applies theme changes
   * automatically to keep all tabs synchronized.
   */
  setupThemeSync() {
    // Listen for storage events from other tabs
    window.addEventListener('storage', (event) => {
      // Only handle theme changes
      if (event.key === STORAGE_KEYS.theme && event.newValue !== event.oldValue) {
        const newTheme = event.newValue;
        
        // Validate the new theme
        if (newTheme && typeof newTheme === 'string') {
          const currentTheme = document.documentElement.getAttribute('data-theme');
          
          // Only apply if different from current theme
          if (newTheme !== currentTheme) {
            document.documentElement.setAttribute('data-theme', newTheme);
            document.documentElement.setAttribute('data-theme-source', 'sync');
            
            // Update theme picker if available
            if (this.themePicker && this.themePicker.updateSelectedTheme) {
              this.themePicker.updateSelectedTheme(newTheme);
            }
            
            Logger.debug('Theme synchronized from other tab:', newTheme);
          }
        }
      }
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
   * Initialize expandable card functionality.
   * Creates and initializes the expandable card manager for interactive card expansion.
   */
  initExpandableCards() {
    try {
      // Create expandable card manager
      this.expandableCardManager = createExpandableCardManager({
        closeOnBackdropClick: true,
        closeOnEscape: true,
        animationDuration: 300
      });

      // Initialize the manager
      this.expandableCardManager.init();

      Logger.info('Expandable card manager initialized');
    } catch (error) {
      Logger.error('Failed to initialize expandable cards:', error);
      // Don't fail the entire app if expandable cards fail
    }
  }

  /**
   * Render the visible list of cards from state.
   * Uses requestAnimationFrame to batch DOM work for smooth updates.
   * 
   * Rendering Algorithm:
   * 1. Filter items based on search query and active tags
   * 2. Determine appropriate empty state (welcome vs no-results)
   * 3. Use requestAnimationFrame for smooth, non-blocking DOM updates
   * 4. Create card elements with event delegation for performance
   * 5. Apply search highlighting and accessibility attributes
   * 
   * Performance Features:
   * - Batched DOM updates prevent layout thrashing
   * - Minimal DOM queries through efficient selectors
   * - Event delegation reduces memory usage
   * - Conditional rendering avoids unnecessary work
   * 
   * @param {Object} state - Current application state
   */
  renderCards(state) {
    const container = $('#cards');
    const filteredItems = filterItems(state.items, state.search, state.filterTags);
    
    // Preserve scroll position during re-render
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    
    // Use animation frame for smooth rendering
    requestAnimationFrame(() => {
      container.innerHTML = '';

      // Render empties consistently
      if (this.renderEmptyIfNeeded(container, state, filteredItems)) {
        return;
      }

      // Remove empty state class and build list
      container.classList.remove('empty-state');
      this.buildCardList(container, filteredItems, state.search);

      // Ensure selection is valid and restore it visually if needed
      this.ensureSelectionWithinBounds();

      // Restore scroll position and entry animations
      this.postRenderScrollRestore(scrollTop);
    });
  }

  /**
   * Check and render empty states. Returns true if an empty state was rendered.
   * @param {HTMLElement} container
   * @param {Object} state
   * @param {Array} filteredItems
   * @returns {boolean}
   */
  renderEmptyIfNeeded(container, state, filteredItems) {
    // Handle welcome state
    if (state.items.length === 0) {
      this.renderEmptyState(container, 'welcome');
      return true;
    }
    // Handle no-results state
    if (filteredItems.length === 0) {
      this.renderEmptyState(container, 'no-results', {
        hasSearch: !!state.search?.trim(),
        hasFilters: state.filterTags.length > 0
      });
      return true;
    }
    return false;
  }

  /**
   * Build and append card elements for the provided items and track them.
   * @param {HTMLElement} container
   * @param {Array} items
   * @param {string} searchQuery
   */
  buildCardList(container, items, searchQuery) {
    // Update tracking arrays for keyboard navigation
    this.visibleItems = [...items];
    this.cardElements = [];

    // Apply few-cards class for compact layout when there are 6 or fewer cards
    if (items.length <= 6) {
      container.classList.add('few-cards');
    } else {
      container.classList.remove('few-cards');
    }

    // Render cards and track elements
    items.forEach((item, index) => {
      const cardElement = this.createCardElement(item, searchQuery, index);
      container.appendChild(cardElement);
      this.cardElements.push(cardElement);
    });
  }

  /**
   * Ensure current selection index is valid and update the visual state.
   */
  ensureSelectionWithinBounds() {
    if (this.cardElements.length === 0 || this.selectedCardIndex >= this.cardElements.length) {
      this.clearCardSelection();
    } else if (this.selectedCardIndex >= 0 && this.selectedCardIndex < this.cardElements.length) {
      this.updateCardSelection();
    }
  }

  /**
   * Restore scroll position and entry animations after render.
   * @param {number} prevScrollTop
   */
  postRenderScrollRestore(prevScrollTop) {
    // Restore scroll position. On the very first render after a refresh, restore
    // from the previously saved position (manual restoration). Thereafter, just
    // preserve the current scroll across re-renders.
    requestAnimationFrame(() => {
      if (!this.scrollRestored && this.initialScrollY > 0) {
        window.scrollTo({ top: this.initialScrollY, behavior: 'auto' });
        this.scrollRestored = true;
        // Re-enable entry animations after initial stabilization
        document.documentElement.classList.remove('disable-entry-anim');
      } else {
        const currentScrollTop = window.scrollY || document.documentElement.scrollTop;
        if (Math.abs(currentScrollTop - prevScrollTop) > 2) {
          window.scrollTo({ top: prevScrollTop, behavior: 'auto' });
        }
      }
    });
  }

  /**
   * Create a DOM element representing a single item card.
   * Respects the 'sensitive' flag by masking the title.
   * @param {Object} item - Item with text, desc, sensitive, tags
   * @param {string} [searchQuery=''] - Current search query for highlighting
   * @param {number} [index] - Index of the card for keyboard navigation
   * @returns {HTMLElement}
   */
  createCardElement(item, searchQuery = '', index = -1) {
    const card = document.createElement('article');
    card.className = 'card expandable-card';
    card.id = `card-${item.id}`;
    card.dataset.cardId = item.id;
    
    // Add data attribute for keyboard navigation
    if (index >= 0) {
      card.dataset.cardIndex = index;
    }
    
    const displayText = item.sensitive ? '••••••••••' : escapeHtml(item.text);
    const highlightedText = highlightText(displayText, searchQuery);
    const highlightedDesc = highlightText(escapeHtml(item.desc), searchQuery);
    
    // Original card structure - keep it simple!
    card.innerHTML = `
      <div class="expandable-card-content">
        <div class="title">${highlightedText}</div>
        <div class="desc">${highlightedDesc}</div>
        <div class="tags">${this.renderTags(item.tags, searchQuery)}</div>
        
        <!-- Expanded view shows full content without truncation -->
        <div class="card-details">
          <div class="details-content">
            <div class="expanded-title">${highlightedText}</div>
            <div class="expanded-desc">${highlightedDesc}</div>
            ${item.tags.length > 0 ? `<div class="expanded-tags">${this.renderTags(item.tags, searchQuery)}</div>` : ''}
          </div>
        </div>
      </div>
      
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
        <button class="icon-btn expand-trigger" data-act="expand" title="Expand card" aria-label="Expand card">
          ${ICONS.expand}
        </button>
      </div>
      
      <button class="close-btn" title="Close expanded view" aria-label="Close expanded view">
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </button>
    `;

    // Setup event handlers
    this.setupCardEventHandlers(card, item);
    
    return card;
  }

  /**
   * Wire click/keyboard handlers for a card's interactions.
   * Click on card selects it and copies content unless an action button was clicked.
   * @param {HTMLElement} card - Card element
   * @param {Object} item - Item backing the card
   */
  setupCardEventHandlers(card, item) {
    // Click to select card and copy (but not on action buttons)
    card.addEventListener('click', (e) => {
      if (!e.target.closest('.actions')) {
        // Select the clicked card (suppress notification for clicks)
        const cardIndex = parseInt(card.dataset.cardIndex);
        if (!isNaN(cardIndex)) {
          this.selectCard(cardIndex, false);
        }
        
        // Copy the content
        this.clipboard.copy(item.text);
      }
    });

    // Action buttons - use event delegation for all buttons
    card.addEventListener('click', (e) => {
      const button = e.target.closest('[data-act]');
      if (button) {
        e.stopPropagation();
        const action = button.dataset.act;
        
        switch (action) {
          case 'edit':
            this.openItemModal(item.id);
            break;
          case 'delete':
            this.removeItem(item.id);
            break;
          case 'copy':
            this.clipboard.copy(item.text);
            break;
          case 'expand':
            if (this.expandableCardManager) {
              this.expandableCardManager.expand(card);
            }
            break;
        }
        return;
      }
      
      // Handle close button
      const closeBtn = e.target.closest('.close-btn');
      if (closeBtn) {
        e.stopPropagation();
        if (this.expandableCardManager) {
          this.expandableCardManager.collapse();
        }
      }
    });
  }

  /**
   * Render tag chips for a card with deterministic hues and optional highlighting.
   * Limits visible chips to UI_CONFIG.maxVisibleTags and shows a '+N more' affordance.
   * 
   * Tag Rendering Algorithm:
   * 1. Slice array to respect max visible limit for performance
   * 2. Generate deterministic colors using string hashing
   * 3. Apply search highlighting while preserving tag colors
   * 4. Add 'more tags' indicator when list is truncated
   * 5. Return safe HTML string ready for innerHTML injection
   * 
   * Color Generation:
   * - Uses stringHash() for consistent colors across renders
   * - Modulo 360 maps hash to HSL hue value
   * - Same tag always gets same color
   * - Provides visual consistency and user recognition
   * 
   * @param {string[]} [tags=[]] - Array of tag strings to render
   * @param {string} [searchQuery=''] - Search term for highlighting
   * @returns {string} HTML string with styled tag chips
   */
  renderTags(tags = [], searchQuery = '') {
    // PERFORMANCE OPTIMIZATION: Limit visible tags to prevent DOM bloat
    // Only render the first N tags, with a "more" indicator for overflow
    const maxVisible = UI_CONFIG.maxVisibleTags;
    const visibleTags = tags.slice(0, maxVisible);
    const extraCount = tags.length - visibleTags.length;
    
    // TAG CHIP GENERATION: Create styled HTML for each visible tag
    let html = visibleTags.map(tag => {
      // SECURITY: Escape HTML to prevent XSS, then apply search highlighting
      const highlighted = highlightText(escapeHtml(tag), searchQuery);
      
      // COLOR CONSISTENCY: Generate deterministic hue from tag name hash
      // Same tag always gets same color across renders and sessions
      const hue = Math.abs(stringHash(tag)) % 360;
      
      // CSS CUSTOM PROPERTY: Use --hue for dynamic styling in CSS
      return `<span class="chip" style="--hue: ${hue}">${highlighted}</span>`;
    }).join('');
    
    // OVERFLOW INDICATOR: Show count of hidden tags when list is truncated
    // Provides user feedback about hidden content
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
    // CONDITIONAL MESSAGE GENERATION: Create contextual user guidance
    // Different combinations of search/filter states need different messaging
    let details = '';
    if (hasSearch && hasFilters) {
      // COMPOUND FILTERING: Both search and tag filters are active
      details = 'No items match your search and selected filters.';
    } else if (hasSearch) {
      // TEXT SEARCH ONLY: User has typed in search box
      details = 'No items match your search.';
    } else if (hasFilters) {
      // TAG FILTERING ONLY: User has selected filter tags
      details = 'No items match the selected filters.';
    }

    // CONDITIONAL ACTION BUTTONS: Only show relevant clearing options
    // Avoids UI clutter by hiding irrelevant actions
    const searchButton = hasSearch ? 
      '<button id="clearSearchBtn" class="secondary-btn">Clear search</button>' : '';
    const filtersButton = hasFilters ? 
      '<button id="clearFiltersBtn" class="secondary-btn">Clear filters</button>' : '';

    // TEMPLATE INTERPOLATION: Inject dynamic content into static HTML structure
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
   * Uses optimized batch event binding for better performance.
   */
  setupEmptyStateHandlers() {
    // BATCH EVENT HANDLERS: Group related handlers for efficiency
    const handlers = {
      '#emptyAddBtn': () => this.openItemModal(),
      '#emptyImportBtn': () => $('#importFile').click(),
      '#clearSearchBtn': () => this.search.clear(),
      '#clearFiltersBtn': () => updateFilterTags([])
    };
    
    // OPTIMIZED BATCH BINDING: Query and bind all handlers in single pass
    Object.entries(handlers).forEach(([selector, handler]) => {
      addEventHandler(selector, 'click', handler);
    });
  }

  /**
   * Open the item modal for adding a new item or editing an existing one.
   * 
   * Error Handling:
   * - Validates item ID exists when editing
   * - Handles missing DOM elements gracefully
   * - Provides fallback values for corrupted item data
   * - Shows user-friendly error messages for failures
   * 
   * @param {string|null} [itemId=null] - ID of the item to edit; null for a new item
   */
  openItemModal(itemId = null) {
    try {
      // Input Validation: Ensure itemId is valid when provided
      if (itemId && typeof itemId !== 'string') {
        Logger.warn('Invalid itemId provided to openItemModal:', itemId);
        this.showNotification('Invalid item ID', 'error');
        return;
      }

      setEditingId(itemId);
      const state = getState();
      
      // Item Resolution: Find existing item or create new one with validation
      let item;
      if (itemId) {
        item = state.items.find(i => i.id === itemId);
        
        // Validation: Ensure item exists when editing
        if (!item) {
          Logger.error(`Item with ID '${itemId}' not found`);
          this.showNotification('Item not found', 'error');
          return;
        }
      } else {
        // Default values for new item
        item = {
          text: '',
          desc: '',
          sensitive: false,
          tags: []
        };
      }

      // DOM Element Validation: Ensure required elements exist
      const titleElement = $('#itemModalTitle');
      const textElement = $('#itemText');
      const descElement = $('#itemDesc');
      const sensitiveElement = $('#itemSensitive');
      
      if (!titleElement || !textElement || !descElement || !sensitiveElement) {
        Logger.error('Required modal elements not found');
        this.showNotification('Modal initialization failed', 'error');
        return;
      }

      // Safe Data Population: Use fallback values for corrupted data
      titleElement.textContent = itemId ? 'Edit Snippet' : 'Add Snippet';
      textElement.value = item.text || '';
      descElement.value = item.desc || '';
      sensitiveElement.checked = !!item.sensitive;
      
      // Tag Chip Population: Handle invalid tag arrays gracefully
      const tags = Array.isArray(item.tags) ? item.tags : [];
      this.setTagChips(tags);

      // Modal Opening: Handle modal manager failures
      if (!this.modalManager) {
        Logger.error('Modal manager not initialized');
        this.showNotification('Modal system unavailable', 'error');
        return;
      }

      this.modalManager.open('#itemModal', { initialFocus: '#itemText' });
      
    } catch (error) {
      // Global Error Handler: Catch any unexpected errors
      Logger.error('Failed to open item modal:', error);
      this.showNotification('Failed to open edit form', 'error');
    }
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
   * 
   * Input Validation:
   * - Profile name length limits (100 characters max)
   * - Special character restrictions for security
   * - XSS prevention through sanitization
   * - Empty value handling
   */
  initProfile() {
    // Profile Edit Button: Open modal with current profile data
    addEventHandler('#profileEditBtn', 'click', () => {
      try {
        const state = getState();
        const profileInput = $('#profileNameInput');
        
        if (!profileInput) {
          Logger.error('Profile input element not found');
          this.showNotification('Profile editor unavailable', 'error');
          return;
        }
        
        profileInput.value = state.profileName || '';
        this.modalManager.open('#profileModal', { initialFocus: '#profileNameInput' });
      } catch (error) {
        Logger.error('Failed to open profile editor:', error);
        this.showNotification('Failed to open profile editor', 'error');
      }
    });

    // Profile Save Button: Validate and save profile name
    addEventHandler('#profileSaveBtn', 'click', () => {
      this.saveProfileWithValidation();
    });

    // KEYBOARD SHORTCUT: Handle Enter key for quick save
    addEventHandler('#profileNameInput', 'keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.saveProfileWithValidation();
      }
    });
  }

  /**
   * Validate and save profile name with comprehensive input validation
   * 
   * Validation Rules:
   * - Length: 0-100 characters
   * - Content: Letters, numbers, spaces, basic punctuation only
   * - Security: XSS prevention and sanitization
   * 
   * @private
   */
  saveProfileWithValidation() {
    try {
      const validation = ValidationUtils.validateElement('#profileNameInput', 'profile save');
      if (!validation.isValid) {
        Logger.error(validation.error);
        this.showNotification('Profile save failed: Input not found', 'error');
        return;
      }

      const profileInput = validation.element;
      const rawName = profileInput.value || '';
      
      // Use centralized validation utility
      const textValidation = ValidationUtils.validateTextInput(rawName, {
        maxLength: 100,
        allowEmpty: true,
        fieldName: 'Profile name'
      });
      
      if (!textValidation.isValid) {
        this.showNotification(textValidation.errors[0], 'error');
        return;
      }
      
      const trimmedName = textValidation.value || '';
      
      // Additional content validation for profile names
      const safePattern = /^[a-zA-Z0-9\s\-_.,']*$/;
      if (trimmedName.length > 0 && !safePattern.test(trimmedName)) {
        this.showNotification('Profile name contains invalid characters', 'error');
        return;
      }

      // XSS Prevention: Additional sanitization check
      const hasHtmlTags = /<[^>]*>/g.test(trimmedName);
      if (hasHtmlTags) {
        this.showNotification('Profile name cannot contain HTML tags', 'error');
        return;
      }

      // Update Profile: Apply the validated name
      updateProfile(trimmedName);
      this.modalManager.close('#profileModal');
      
      // User Feedback: Provide appropriate success message
      const message = trimmedName 
        ? `Profile updated to "${trimmedName}"`
        : 'Profile name cleared';
      this.showNotification(message, 'success');
      
    } catch (error) {
      Logger.error('Profile save failed:', error);
      this.showNotification('Failed to save profile', 'error');
    }
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
   * Uses optimized visibility toggling utility.
   * @param {Object} state
   */
  renderFilterBadge(state) {
    const badge = $('#filterBadge');
    const count = state.filterTags.length;
    const shouldShow = count > 0;
    
    // OPTIMIZED VISIBILITY: Use utility function for consistent behavior
    if (shouldShow) {
      badge.textContent = count;
    }
    toggleVisibility(badge, shouldShow);
  }

  /**
   * Initialize export menu interactions (JSON, CSV, backups).
   */
  initExport() {
    // Export menu handling
    const exportBtn = $('#exportMenuBtn');
    const exportMenu = $('#exportMenu');

    // Guard against missing DOM
    if (!exportBtn || !exportMenu) {
      Logger.warn('Export UI not found; skipping export handlers');
      return;
    }
    
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
   * Validate export state and prepare export data
   * 
   * @returns {{isValid: boolean, payload?: Object, error?: string}} Validation result
   * @private
   */
  prepareJSONExportData() {
    const state = getState();
    
    // State validation
    if (!state || typeof state !== 'object') {
      return {
        isValid: false,
        error: 'Invalid application state for export'
      };
    }
    
    // Data validation and cleanup
    const items = Array.isArray(state.items) ? state.items : [];
    const validItems = items.filter(item => item && typeof item === 'object' && item.id);
    
    // User confirmation for empty exports using consistent confirmation system
    if (validItems.length === 0) {
      // This will be handled by the async calling function since we can't await here
      return { isValid: false, error: 'No items to export', requiresConfirmation: true };
    }
    
    // Build export payload
    const payload = {
      profileName: (state.profileName || '').trim(),
      items: validItems
    };
    
    return { isValid: true, payload };
  }
  
  /**
   * Serialize export data to JSON string
   * 
   * @param {Object} payload - Data to serialize
   * @returns {{success: boolean, jsonString?: string, error?: string}} Serialization result
   * @private
   */
  serializeExportData(payload) {
    try {
      const jsonString = JSON.stringify(payload, null, 2);
      return { success: true, jsonString };
    } catch (serializationError) {
      Logger.error('JSON serialization failed:', serializationError);
      return {
        success: false,
        error: 'Unable to serialize data - check for circular references or invalid data types'
      };
    }
  }
  
  /**
   * Handle JSON file download with error recovery
   * 
   * @param {string} jsonString - Serialized JSON data
   * @param {number} itemCount - Number of items being exported
   * @returns {{success: boolean, error?: string}} Download result
   * @private
   */
  downloadJSONFile(jsonString, itemCount) {
    try {
      downloadFile('compy-export.json', jsonString, 'application/json');
      return { success: true };
    } catch (downloadError) {
      Logger.error('Download failed:', downloadError);
      return {
        success: false,
        error: 'Download failed - check browser permissions and storage space'
      };
    }
  }
  
  /**
   * Export the current state as a JSON file.
   * 
   * This method coordinates the entire JSON export process through focused helper methods,
   * providing comprehensive error handling and user feedback at each step.
   */
  exportJSON() {
    return ErrorUtils.safeExecute(async () => {
      // Prepare and validate export data
      const preparation = this.prepareJSONExportData();
      if (!preparation.isValid) {
        // Handle empty export confirmation
        if (preparation.requiresConfirmation) {
          const confirmed = await this.confirmationManager.show({
            title: 'Export Empty File',
            message: 'No snippets to export. Export empty file anyway?',
            confirmText: 'Export Empty',
            cancelText: 'Cancel',
            variant: 'warning'
          });
          
          if (!confirmed) {
            return; // User cancelled
          }
          
          // User confirmed, create empty payload
          const state = getState();
          preparation.isValid = true;
          preparation.payload = {
            profileName: (state.profileName || '').trim(),
            items: []
          };
        } else {
          if (preparation.error && !preparation.error.includes('cancelled')) {
            this.showNotification(`Export failed: ${preparation.error}`, 'error');
          }
          return;
        }
      }
      
      // Serialize data to JSON
      const serialization = this.serializeExportData(preparation.payload);
      if (!serialization.success) {
        this.showNotification(`Export failed: ${serialization.error}`, 'error');
        return;
      }
      
      // Download the file
      const download = this.downloadJSONFile(serialization.jsonString, preparation.payload.items.length);
      if (!download.success) {
        this.showNotification(`Export failed: ${download.error}`, 'error');
        return;
      }
      
      // Success feedback
      this.showNotification(
        `JSON export downloaded (${preparation.payload.items.length} items)`,
        'success'
      );
      
    }, {
      context: 'JSON export',
      fallback: (error) => {
        Logger.error('JSON export failed:', error);
        this.showNotification('Export failed: Unexpected error', 'error');
      }
    });
  }

  /**
   * Generate CSV rows from application state
   * 
   * @returns {{success: boolean, rows?: Array[], itemCount?: number, error?: string}} Generation result
   * @private
   */
  generateCSVRows() {
    const state = getState();
    
    if (!state || typeof state !== 'object') {
      return {
        success: false,
        error: 'Invalid application state for CSV export'
      };
    }
    
    const items = Array.isArray(state.items) ? state.items : [];
    const validItems = items.filter(item => item && typeof item === 'object' && item.id);
    
    try {
      const rows = [
        // Metadata section
        ['profileName'],
        [csvEscape(state.profileName || '')],
        [''], // Empty row separator
        
        // Data headers
        ['text', 'desc', 'sensitive', 'tags'],
        
        // Data rows
        ...validItems.map(item => [
          csvEscape(item.text || ''),
          csvEscape(item.desc || ''),
          item.sensitive ? '1' : '0',
          csvEscape(Array.isArray(item.tags) ? item.tags.join('|') : '')
        ])
      ];
      
      return {
        success: true,
        rows,
        itemCount: validItems.length
      };
    } catch (error) {
      Logger.error('CSV row generation failed:', error);
      return {
        success: false,
        error: 'Failed to generate CSV data - check for invalid characters in data'
      };
    }
  }
  
  /**
   * Convert CSV rows to CSV string format
   * 
   * @param {Array[]} rows - CSV rows to convert
   * @returns {{success: boolean, csv?: string, error?: string}} Conversion result
   * @private
   */
  convertRowsToCSV(rows) {
    try {
      const csv = rows.map(row => row.join(',')).join('\n');
      return { success: true, csv };
    } catch (error) {
      Logger.error('CSV conversion failed:', error);
      return {
        success: false,
        error: 'Failed to convert data to CSV format'
      };
    }
  }
  
  /**
   * Export the current state as a CSV file.
   * 
   * This method provides structured CSV export with comprehensive error handling
   * and includes metadata section for profile information.
   */
  exportCSV() {
    return ErrorUtils.safeExecute(async () => {
      // Generate CSV rows from state
      const rowGeneration = this.generateCSVRows();
      if (!rowGeneration.success) {
        this.showNotification(`CSV export failed: ${rowGeneration.error}`, 'error');
        return;
      }
      
      // Convert rows to CSV string
      const csvConversion = this.convertRowsToCSV(rowGeneration.rows);
      if (!csvConversion.success) {
        this.showNotification(`CSV export failed: ${csvConversion.error}`, 'error');
        return;
      }
      
      // Download the file
      try {
        downloadFile('compy-export.csv', csvConversion.csv, 'text/csv');
        this.showNotification(
          `CSV export downloaded (${rowGeneration.itemCount} items)`,
          'success'
        );
      } catch (downloadError) {
        Logger.error('CSV download failed:', downloadError);
        this.showNotification('CSV export failed: Download error', 'error');
      }
      
    }, {
      context: 'CSV export',
      fallback: (error) => {
        Logger.error('CSV export failed:', error);
        this.showNotification('CSV export failed: Unexpected error', 'error');
      }
    });
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

  // ===== Import helpers (behavior-preserving refactor) =====
  /**
   * Prompt the user for an import option when existing data is present, including
   * a final destructive confirmation for Replace All. Shows identical notifications
   * as the original flows.
   * @param {number} existingCount
   * @param {string} existingProfile
   * @param {number} importingCount
   * @param {string} importingProfile
   * @returns {Promise<{ option: 'cancel'|'add'|'replace', shouldClearExisting: boolean }>}
   */
  async promptImportOption(existingCount, existingProfile, importingCount, importingProfile) {
    // Ask user how to handle import
    const importOption = await this.showImportOptionsDialog({
      existingCount,
      existingProfile: existingProfile || 'Not set',
      importingCount,
      importingProfile: importingProfile || 'Not set'
    });

    if (importOption === 'cancel') {
      this.showNotification('Import cancelled', 'info');
      return { option: 'cancel', shouldClearExisting: false };
    }

    if (importOption === 'replace') {
      // Final confirmation guard before destructive replace
      const confirmed = await this.confirmationManager.show({
        title: 'Replace All Data',
        message: `This will delete ${existingCount} existing snippets and reset your profile ("${existingProfile || 'Not set'}"). This cannot be undone.\n\nProceed with replace?`,
        confirmText: 'Replace All',
        cancelText: 'Cancel',
        variant: 'danger'
      });
      if (!confirmed) {
        this.showNotification('Replace cancelled', 'info');
        return { option: 'cancel', shouldClearExisting: false };
      }
      return { option: 'replace', shouldClearExisting: true };
    }

    // Default to add
    return { option: 'add', shouldClearExisting: false };
  }

  /**
   * Create a styled tag chip element with consistent coloring
   * 
   * @param {string} tag - Tag text content
   * @param {Object} [options={}] - Chip configuration options
   * @param {boolean} [options.removable=false] - Whether chip includes remove button
   * @param {Function} [options.onRemove] - Callback when remove button is clicked
   * @returns {HTMLElement} Configured chip element
   */
  createTagChip(tag, options = {}) {
    const { removable = false, onRemove } = options;
    
    const chip = document.createElement('span');
    chip.className = 'chip';
    
    // Apply consistent hue-based coloring
    const hue = Math.abs(stringHash(tag)) % 360;
    chip.style.setProperty('--hue', hue);
    
    if (removable) {
      chip.dataset.value = tag;
      chip.innerHTML = `
        ${escapeHtml(tag)} 
        <span class="x" title="Remove tag" aria-label="Remove ${tag} tag">×</span>
      `;
      
      // Handle removal if callback provided
      if (onRemove) {
        chip.querySelector('.x').addEventListener('click', () => onRemove(chip, tag));
      }
    } else {
      chip.textContent = tag;
    }
    
    return chip;
  }

  /**
   * Show import result notification with standardized formatting
   * 
   * @param {number} importCount - Number of successfully imported items
   * @param {number} skippedCount - Number of skipped items (duplicates/invalid)
   */
  showImportResult(importCount, skippedCount) {
    const message = skippedCount > 0 
      ? `Imported ${importCount} items (${skippedCount} skipped as duplicates or invalid)`
      : `Imported ${importCount} items`;
    
    this.showNotification(message, importCount > 0 ? 'success' : 'info');
  }

  /**
   * Generate a duplicate-detection signature for an item.
   * Duplicate criteria: same text + desc + sensitive flag (tags ignored).
   * @param {{text?:string, desc?:string, sensitive?:boolean}} i
   * @returns {string}
   */
  generateItemSignature(i) {
    return `${(i.text || '').trim()}||${(i.desc || '').trim()}||${i.sensitive ? '1' : '0'}`;
  }

  /**
   * Build a dedupe set from current state items unless we are replacing all.
   * @param {ReturnType<typeof getState>} currentState
   * @param {boolean} shouldClearExisting
   * @returns {Set<string>}
   */
  buildDedupeSetFromState(currentState, shouldClearExisting) {
    if (shouldClearExisting) return new Set();
    const items = (currentState.items || []);
    return new Set(items.map(i => this.generateItemSignature(i)));
  }

  /**
   * Update profile name if a non-empty value is provided.
   * @param {string} profileName
   */
  updateProfileIfProvided(profileName) {
    const name = (profileName || '').trim();
    if (name) updateProfile(name);
  }

  /**
   * Parse JSON import data and extract items and profile information
   * 
   * @param {string} jsonText - Raw JSON string to parse
   * @returns {{items: Array, profileName: string}} Parsed import data
   * @throws {Error} If JSON format is invalid
   * @private
   */
  parseJSONImportData(jsonText) {
    const parsed = JSON.parse(jsonText);
    let items = [];
    let profileName = '';
    
    if (Array.isArray(parsed)) {
      // Legacy format: array of items
      items = parsed;
    } else if (parsed && typeof parsed === 'object' && Array.isArray(parsed.items)) {
      // New format with profile
      items = parsed.items;
      profileName = (parsed.profileName || '').trim();
    } else {
      throw new Error('Invalid JSON format - expected array or object with items property');
    }
    
    return { items, profileName };
  }
  
  /**
   * Handle import decision when existing data is present
   * 
   * @param {Array} importItems - Items to be imported
   * @param {string} importProfile - Profile name to be imported
   * @returns {Promise<{shouldContinue: boolean, shouldClearExisting: boolean}>}
   * @private
   */
  async handleImportDecision(importItems, importProfile) {
    const currentState = getState();
    const hasExistingData = currentState.items.length > 0 || currentState.profileName;

    if (!hasExistingData) {
      return { shouldContinue: true, shouldClearExisting: false };
    }
    
    const decision = await this.promptImportOption(
      currentState.items.length,
      currentState.profileName || 'Not set',
      importItems.length,
      importProfile || 'Not set'
    );
    
    if (decision.option === 'cancel') {
      return { shouldContinue: false, shouldClearExisting: false };
    }
    
    return {
      shouldContinue: true,
      shouldClearExisting: decision.shouldClearExisting
    };
  }
  
  /**
   * Process import items and handle deduplication
   * 
   * @param {Array} items - Items to import
   * @param {Set<string>} dedupeSet - Set for duplicate detection
   * @returns {{importCount: number, skippedCount: number}} Import results
   * @private
   */
  processImportItems(items, dedupeSet) {
    let importCount = 0;
    let skippedCount = 0;
    
    for (const item of items) {
      if (this.addImportedItem(item, dedupeSet)) {
        importCount++;
      } else {
        skippedCount++;
      }
    }
    
    return { importCount, skippedCount };
  }
  
  /**
   * Import items from a JSON payload.
   * Accepts both legacy array-only exports and the newer object format containing { items, profileName }.
   * @param {string} jsonText - Raw JSON string
   */
  async importJSON(jsonText) {
    return await ErrorUtils.safeExecute(async () => {
      // Parse JSON data into structured format
      const { items, profileName } = this.parseJSONImportData(jsonText);
      
      // Handle user decision about existing data
      const { shouldContinue, shouldClearExisting } = await this.handleImportDecision(items, profileName);
      if (!shouldContinue) return;
      
      // Prepare for import based on user decision
      const currentState = getState();
      const dedupeSet = this.buildDedupeSetFromState(currentState, shouldClearExisting);
      
      if (shouldClearExisting) {
        this.clearAllData();
      }
      
      // Update profile if provided
      this.updateProfileIfProvided(profileName);
      
      // Process all items and track results
      const { importCount, skippedCount } = this.processImportItems(items, dedupeSet);
      
      // Show results to user
      this.showImportResult(importCount, skippedCount);
      
    }, {
      context: 'JSON import',
      fallback: (error) => {
        Logger.error('JSON import failed:', error);
        this.showNotification('Invalid JSON file', 'error');
      }
    });
  }

  /**
   * Parse CSV metadata and headers to extract profile information and column mapping
   * 
   * @param {string[]} lines - CSV lines array
   * @returns {Object} Parsed CSV structure with profile, headers, and mapping
   * @private
   */
  parseCSVStructure(lines) {
    if (!lines.length) {
      throw new Error('Empty CSV file');
    }

    // Remove BOM (Byte Order Mark) from first line if present
    const firstLine = parseCSVLine(lines[0].replace(/^\uFEFF/, ''));
    let headerIndex = 0;
    let profileName = null;
    
    // Check for profile metadata block
    if (firstLine.length === 1 && firstLine[0].toLowerCase() === 'profilename') {
      if (UI_CONFIG.debug) console.log('Detected profile metadata in CSV');
      
      // Extract profile name from next line
      if (lines[1]) {
        const profileData = parseCSVLine(lines[1]);
        profileName = (profileData[0] || '').trim() || null;
      }
      
      headerIndex = 2; // Data headers start after metadata block
    }

    // Parse column headers
    const headerLine = lines[headerIndex];
    if (!headerLine) {
      throw new Error('No headers found after metadata parsing');
    }
    
    const headers = parseCSVLine(headerLine).map(h => h.toLowerCase().trim());
    const columnMapping = {
      text: headers.indexOf('text'),
      desc: headers.indexOf('desc'),
      sensitive: headers.indexOf('sensitive'),
      tags: headers.indexOf('tags')
    };

    // Validate required columns
    if (columnMapping.text === -1 || columnMapping.desc === -1) {
      throw new Error('Required columns missing: text and desc columns are mandatory');
    }
    
    const dataLines = lines.slice(headerIndex + 1).filter(line => line.trim());
    
    return {
      profileName,
      columnMapping,
      dataLines,
      itemCount: dataLines.length
    };
  }

  /**
   * Parse a single CSV data row into an item object
   * 
   * @param {string} line - CSV data line
   * @param {Object} columnMapping - Column index mapping
   * @returns {Object} Parsed item data
   * @private
   */
  parseCSVDataRow(line, columnMapping) {
    const values = parseCSVLine(line);
    
    return {
      text: (values[columnMapping.text] || '').trim(),
      desc: (values[columnMapping.desc] || '').trim(),
      sensitive: columnMapping.sensitive >= 0 ? 
        ['1', 'true'].includes((values[columnMapping.sensitive] || '').toLowerCase()) : false,
      tags: columnMapping.tags >= 0 ? 
        (values[columnMapping.tags] || '')
          .split('|')
          .map(t => t.trim())
          .filter(Boolean)
        : []
    };
  }

  /**
   * Handle import options when existing data is present
   * 
   * @param {number} itemCount - Number of items to import
   * @param {string} source - Source description for import
   * @returns {Object} Import decision with cancelled and shouldClearExisting flags
   * @private
   */
  async handleImportOptions(itemCount, source) {
    const currentState = getState();
    const hasExistingData = currentState.items.length > 0 || currentState.profileName;
    
    if (hasExistingData) {
      const decision = await this.promptImportOption(
        currentState.items.length,
        currentState.profileName || 'Not set',
        itemCount,
        source
      );
      
      return {
        cancelled: decision.option === 'cancel',
        shouldClearExisting: decision.shouldClearExisting
      };
    }
    
    return { cancelled: false, shouldClearExisting: false };
  }

  /**
   * Prepare for import by setting up deduplication and applying profile
   * 
   * @param {boolean} shouldClearExisting - Whether to clear existing data
   * @param {string|null} profileName - Profile name to apply
   * @returns {Set<string>} Deduplication set for import
   * @private
   */
  prepareImport(shouldClearExisting, profileName) {
    const currentState = getState();
    
    // Clear existing data if requested
    if (shouldClearExisting) {
      this.clearAllData();
    }
    
    // Apply profile name if provided
    if (profileName) {
      this.updateProfileIfProvided(profileName);
    }
    
    // Build deduplication set
    return this.buildDedupeSetFromState(currentState, shouldClearExisting);
  }

  /**
   * Process CSV data rows and import valid items
   * 
   * @param {string[]} dataLines - Array of CSV data lines
   * @param {Object} columnMapping - Column index mapping
   * @param {Set<string>} dedupeSet - Deduplication set
   * @returns {Object} Import results with counts
   * @private
   */
  processCSVDataRows(dataLines, columnMapping, dedupeSet) {
    let importCount = 0;
    let skippedCount = 0;
    
    for (let i = 0; i < dataLines.length; i++) {
      try {
        const itemData = this.parseCSVDataRow(dataLines[i], columnMapping);
        
        if (this.addImportedItem(itemData, dedupeSet)) {
          importCount++;
        } else {
          skippedCount++;
          console.warn(`Skipped duplicate or invalid item on line ${i + 1}:`, itemData);
        }
      } catch (lineError) {
        skippedCount++;
        console.warn(`Failed to parse line ${i + 1}:`, lineError.message);
      }
    }
    
    return { importCount, skippedCount };
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
   * Performance Considerations:
   * - Single pass through lines minimizes iterations
   * - Early validation prevents processing invalid data
   * - Efficient string operations for large files
   * - Memory-conscious parsing for mobile devices
   * 
   * @param {string} csvText - Raw CSV string from uploaded file
   */
  async importCSV(csvText) {
    try {
      // Parse CSV structure and extract metadata
      const lines = csvText.split(/\r?\n/).filter(line => line.trim());
      const csvStructure = this.parseCSVStructure(lines);
      
      // Handle import options with existing data
      const importDecision = await this.handleImportOptions(
        csvStructure.itemCount,
        'From CSV'
      );
      if (importDecision.cancelled) return;
      
      // Prepare for import
      const dedupeSet = this.prepareImport(importDecision.shouldClearExisting, csvStructure.profileName);
      
      // Process data rows and import items
      const result = this.processCSVDataRows(csvStructure.dataLines, csvStructure.columnMapping, dedupeSet);
      
      // Show results to user
      this.showImportResult(result.importCount, result.skippedCount);
      
      if (result.importCount === 0 && result.skippedCount > 0) {
        console.error('No valid items found in CSV. Check format and required fields.');
      }
      
    } catch (error) {
      console.error('CSV import failed:', error);
      this.showNotification(`CSV import failed: ${error.message}`, 'error');
    }
  }

  /**
   * Validate and insert an imported item into state.
   * @param {Object} itemData - Candidate item
   * @returns {boolean} True if item was accepted
   */
  addImportedItem(itemData, dedupeSet = undefined) {
    // Validate first
    const validation = validateItem(itemData);
    if (!validation.isValid) {
      console.warn('Skipping invalid item:', validation.errors);
      return false;
    }

    // Build a simple signature for duplicate detection based on primary fields
    // Duplicate criteria: same text + desc + sensitive flag (tags are ignored for matching)
    const text = (itemData.text || '').trim();
    const desc = (itemData.desc || '').trim();
    const sensitiveSig = itemData.sensitive ? '1' : '0';
    const signature = `${text}||${desc}||${sensitiveSig}`;

    if (dedupeSet && dedupeSet.has(signature)) {
      // Duplicate of existing or previously imported item
      return false;
    }

    upsertItem({
      text,
      desc,
      sensitive: !!itemData.sensitive,
      tags: Array.isArray(itemData.tags) ? itemData.tags : []
    });

    if (dedupeSet) dedupeSet.add(signature);
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
   * Show a custom three-option dialog for import operations.
   * @param {Object} options - Dialog configuration
   * @param {number} options.existingCount - Number of existing items
   * @param {string} options.existingProfile - Current profile name
   * @param {number} options.importingCount - Number of items to import
   * @param {string} options.importingProfile - Profile from import
   * @returns {Promise<'cancel'|'add'|'replace'>} - User's choice
   */
  async showImportOptionsDialog({ existingCount, existingProfile, importingCount, importingProfile }) {
    return new Promise((resolve) => {
      // Remove any previous instance to avoid duplicates
      const prior = document.getElementById('importOptionsModal');
      if (prior) prior.remove();

      const modal = document.createElement('div');
      modal.className = 'modal';
      modal.id = 'importOptionsModal';
      modal.setAttribute('aria-hidden', 'true');
      modal.innerHTML = `
        <div class="modal-content small import-options-modal" role="dialog" aria-labelledby="importOptionsTitle" aria-describedby="importOptionsDesc">
          <div class="modal-header">
            <h3 id="importOptionsTitle">Import Options</h3>
            <button class="icon-btn" data-close-modal aria-label="Close dialog" title="Close dialog">
              <span aria-hidden="true">✕</span>
            </button>
          </div>
          <div class="modal-body">
            <div class="import-comparison">
              <div class="import-section">
                <h3>📂 Existing Data</h3>
                <p><strong>${existingCount} snippets</strong></p>
                <p>Profile: ${existingProfile}</p>
              </div>
              <div class="import-section">
                <h3>📥 Importing</h3>
                <p><strong>${importingCount} snippets</strong></p>
                <p>Profile: ${importingProfile}</p>
              </div>
            </div>
            <p id="importOptionsDesc" class="import-message">How would you like to handle the import?</p>
          </div>
          <div class="modal-footer">
            <button id="importCancel" class="secondary-btn" data-close-modal>Cancel</button>
            <div class="end-actions">
              <button id="importAdd" class="primary-btn" data-primary="true">Add to Existing</button>
              <button id="importReplace" class="modal-danger-btn">Replace All</button>
            </div>
          </div>
        </div>
      `;

      // Add temporary styles scoped to this modal content
      const style = document.createElement('style');
      style.textContent = `
        .import-options-modal { max-width: 540px; text-align: center; }
        .import-comparison { display: flex; gap: 1rem; margin: 0.75rem 0 1.25rem; text-align: left; }
        .import-section { flex: 1; padding: 0.75rem; border: 1px solid var(--border); border-radius: 8px; background: var(--card-bg); }
        .import-section h3 { margin: 0 0 0.5rem 0; color: var(--text); font-size: 1rem; }
        .import-section p { margin: 0.25rem 0; color: var(--text-secondary); }
        .import-message { margin: 0.5rem 0 0; color: var(--text); font-weight: 500; }
        @media (max-width: 600px) { .import-comparison { flex-direction: column; gap: 0.75rem; } }
      `;
      document.head.appendChild(style);

      // Add modal to DOM before opening with modal manager
      document.body.appendChild(modal);

      let settled = false;
      const cleanup = () => {
        if (settled) return;
        settled = true;
        // Remove listeners first
        document.removeEventListener('keydown', onKeydown);
        modal.removeEventListener('click', onBackdropClick);
        // Remove style and element
        if (style.parentNode) style.parentNode.removeChild(style);
        if (modal.parentNode) modal.parentNode.removeChild(modal);
      };

      const finalize = (choice) => {
        // Close via modal manager (idempotent) then cleanup and resolve
        this.modalManager.close('#importOptionsModal');
        cleanup();
        resolve(choice);
      };

      // Close on ESC while open -> treat as cancel
      const onKeydown = (e) => {
        if (e.key === 'Escape' && this.modalManager.isOpen('#importOptionsModal')) {
          finalize('cancel');
        }
      };
      document.addEventListener('keydown', onKeydown);

      // Backdrop click -> cancel
      const onBackdropClick = (e) => {
        if (e.target === modal) {
          finalize('cancel');
        }
      };
      modal.addEventListener('click', onBackdropClick);

      // Wire button handlers
      modal.querySelector('#importCancel').addEventListener('click', () => finalize('cancel'));
      modal.querySelector('#importAdd').addEventListener('click', () => finalize('add'));
      modal.querySelector('#importReplace').addEventListener('click', () => finalize('replace'));
      // Header close (X) should behave like cancel
      const headerCloseBtn = modal.querySelector('.modal-header [data-close-modal]');
      if (headerCloseBtn) headerCloseBtn.addEventListener('click', () => finalize('cancel'));

      // Open with modal manager for focus trap and ARIA attributes
      this.modalManager.open('#importOptionsModal', { initialFocus: '#importAdd', restoreFocus: true });
    });
  }

  /**
   * Clear all existing data (items and profile).
   * Used when user chooses "Replace All" during import.
   */
  clearAllData() {
    // Clear all items by setting empty array
    const currentState = getState();
    
    // Remove all items one by one
    currentState.items.forEach(item => {
      deleteItem(item.id);
    });
    
    // Clear profile
    updateProfile('');
    
    // Clear any active filters and search
    updateFilterTags([]);
    updateSearch('');
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

    // Create removable chip using reusable utility
    const chip = this.createTagChip(normalizedTag, {
      removable: true,
      onRemove: (chipElement) => chipElement.remove()
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
      const chip = this.createTagChip(tag);
      list.appendChild(chip);
    });

    this.modalManager.open('#moreTagsModal');
  }

  /**
   * Global keyboard shortcuts for search and new-item creation.
   * @param {KeyboardEvent} e
   */
  handleKeyboardShortcuts(e) {
    // Don't handle shortcuts if modal is open or input is focused
    if (this.modalManager?.hasOpenModals() || 
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) {
      return;
    }
    
    // Handle card-specific shortcuts first
    if (this.handleCardKeyboardShortcuts(e)) {
      return;
    }
    
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
    
    // Card navigation shortcuts
    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        this.selectCardUp();
        break;
      case 'ArrowDown':
        e.preventDefault();
        this.selectCardDown();
        break;
      case 'ArrowLeft':
        e.preventDefault();
        this.selectCardLeft();
        break;
      case 'ArrowRight':
        e.preventDefault();
        this.selectCardRight();
        break;
      case 'Escape':
        this.clearCardSelection();
        break;
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
      const currentNavHeight = document.documentElement.style.getPropertyValue('--nav-h');
      const newNavHeight = `${height}px`;
      
      // Only update if there's a significant change to prevent micro-shifts
      if (currentNavHeight !== newNavHeight) {
        document.documentElement.style.setProperty('--nav-h', newNavHeight);
        
        // Preserve scroll position during layout adjustments
        const scrollTop = window.scrollY || document.documentElement.scrollTop;
        requestAnimationFrame(() => {
          // If we haven't restored the initial scroll yet and we have a saved
          // position, skip interfering here. The main render will handle it.
          if (!this.scrollRestored && this.initialScrollY > 0) {
            return;
          }
          if (Math.abs(window.scrollY - scrollTop) < 5) {
            // Use instant behavior to prevent any animated upward scroll
            window.scrollTo({ top: scrollTop, behavior: 'auto' });
          }
        });
      }
    };

    // Set initial height immediately - use fallback if navbar not ready
    const navbar = $('.navbar');
    if (navbar) {
      adjustHeight();
    } else {
      // Fallback height if navbar isn't ready yet
      document.documentElement.style.setProperty('--nav-h', '64px');
    }
    
    // Adjust on resize and load (but with debouncing)
    let resizeTimeout;
    const debouncedAdjust = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(adjustHeight, 16); // ~1 frame delay
    };
    
    window.addEventListener('resize', debouncedAdjust);
    window.addEventListener('load', adjustHeight);
  }

  /**
   * Initialize mobile navigation menu functionality using reusable component.
   * 
   * ARCHITECTURAL IMPROVEMENT:
   * Replaced inline navigation logic with reusable MobileNavigationManager component.
   * This improves code maintainability, testability, and reusability across projects.
   */
  setupMobileNavigation() {
    // COMPONENT-BASED ARCHITECTURE: Use dedicated navigation manager
    this.mobileNavigation = createMobileNavigationManager({
      toggleSelector: '#navToggle',
      drawerSelector: '#navActions',
      backdropSelector: '#navBackdrop',
      closeDelay: 100
    });
    
    // Initialize the mobile navigation component
    const success = this.mobileNavigation.init();
    
    if (!success) {
      console.warn('Failed to initialize mobile navigation');
      this.mobileNavigation = null;
    }
  }
  
  /**
   * Handle keyboard shortcuts that work on selected cards or globally
   * @param {KeyboardEvent} e
   * @returns {boolean} True if the event was handled
   */
  handleCardKeyboardShortcuts(e) {
    const key = e.key.toLowerCase();
    const selectedItem = this.getSelectedItem();
    
    switch (key) {
      case 'd':
        // Delete selected card or show general shortcut help
        if (selectedItem) {
          e.preventDefault();
          this.removeItem(selectedItem.id);
          return true;
        }
        break;
        
      case 'c':
        // Copy selected card
        if (selectedItem) {
          e.preventDefault();
          this.clipboard.copy(selectedItem.text);
          return true;
        }
        break;
        
      case 'f':
        // Open filter modal
        e.preventDefault();
        this.openFilterModal();
        return true;
        
      case 'i':
        // Import file
        e.preventDefault();
        $('#importFile').click();
        return true;
        
      case 'e':
        // Export menu (show export menu)
        e.preventDefault();
        const exportBtn = $('#exportMenuBtn');
        exportBtn?.click();
        return true;
        
      case 'p':
        // Profile modal
        e.preventDefault();
        const state = getState();
        $('#profileNameInput').value = state.profileName;
        this.modalManager.open('#profileModal', { initialFocus: '#profileNameInput' });
        return true;
        
      case 'a':
        // About modal
        e.preventDefault();
        this.modalManager.open('#aboutModal');
        return true;
        
      case 'enter':
        // Edit selected card or add new item
        e.preventDefault();
        if (selectedItem) {
          this.openItemModal(selectedItem.id);
        } else {
          this.openItemModal();
        }
        return true;
    }
    
    return false;
  }
  
  /**
   * Select a card by index
   * @param {number} index - Index of card to select
   * @param {boolean} showNotification - Whether to show the help notification
   */
  /**
   * Select a card by index and optionally show a one-time help notification.
   * Also scrolls the selected card into view to keep it centered for context.
   *
   * Note: This only changes the visual selection state; it does not copy or edit.
   *
   * @param {number} index - Zero-based index of the card to select.
   * @param {boolean} [showNotification=true] - Whether to show the help toast on first selection.
   * @returns {void}
   */
  selectCard(index, showNotification = true) {
    if (index < 0 || index >= this.cardElements.length) {
      return;
    }
    
    const wasFirstSelection = this.selectedCardIndex === -1;
    this.selectedCardIndex = index;
    this.updateCardSelection();
    
    // Show helpful notification on first card selection (only if enabled)
    if (wasFirstSelection && showNotification) {
      this.showNotification('💡 Use ↑↓←→ arrows to navigate, C=copy, D=delete, Enter=edit, F=filter');
    }
    
    // Scroll card into view if needed
    const selectedCard = this.cardElements[index];
    if (selectedCard) {
      selectedCard.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
  }
  
  
  
  /**
   * Clear any active card selection and update the visual state.
   *
   * @returns {void}
   */
  clearCardSelection() {
    this.selectedCardIndex = -1;
    this.updateCardSelection();
  }
  
  /**
   * Update the DOM to reflect the current selection.
   * Removes the 'selected' class from all cards, then applies it to the active one.
   *
   * @returns {void}
   */
  updateCardSelection() {
    // Remove selection class from all cards using optimized DOM batch operation
    DOMUtils.batchUpdate([
      () => this.cardElements.forEach(card => DOMUtils.removeClass(card, 'selected')),
      () => {
        if (this.selectedCardIndex >= 0 && this.selectedCardIndex < this.cardElements.length) {
          DOMUtils.addClass(this.cardElements[this.selectedCardIndex], 'selected');
        }
      }
    ]);
  }
  
  /**
   * Get the currently selected item data from the visible (filtered) collection.
   *
   * @returns {AppItem|null} The selected item's data, or null if nothing is selected.
   */
  getSelectedItem() {
    if (this.selectedCardIndex >= 0 && this.selectedCardIndex < this.visibleItems.length) {
      return this.visibleItems[this.selectedCardIndex];
    }
    return null;
  }
  
  // === Grid navigation helpers (pure, behavior-preserving) ===
  /**
   * Check if two top positions are approximately the same row within threshold.
   * @param {number} a
   * @param {number} b
   * @param {number} [threshold=25]
   * @returns {boolean}
   */
  isApproximatelySameRow(a, b, threshold = 25) {
    return Math.abs(a - b) < threshold;
  }

  /**
   * Count how many cards are in the first row, using top-position thresholding.
   * @param {HTMLElement[]} cards
   * @param {number} [threshold=25]
   * @returns {number}
   */
  countColumnsInFirstRow(cards, threshold = 25) {
    if (!cards || cards.length < 2) return 1;
    const firstTop = cards[0].getBoundingClientRect().top;
    let count = 1;
    for (let i = 1; i < cards.length; i++) {
      const top = cards[i].getBoundingClientRect().top;
      if (Math.abs(top - firstTop) < threshold) {
        count++;
      } else {
        break;
      }
    }
    return count;
  }

  /**
   * Compute target index when moving up by one row, with wrapping.
   * @param {number} currentIndex
   * @param {number} columns
   * @param {number} total
   * @returns {number}
   */
  wrapIndexUp(currentIndex, columns, total) {
    // ATTEMPT NORMAL UP MOVEMENT: Try moving up one row
    const newIndex = currentIndex - columns;
    if (newIndex >= 0) return newIndex; // Normal case: stay in bounds
    
    // WRAP TO BOTTOM: Can't move up, so wrap to bottom row
    const column = currentIndex % columns; // Preserve column position
    const totalRows = Math.ceil(total / columns); // Calculate total rows needed
    
    // CALCULATE WRAP POSITION: Go to same column in last row
    let wrapIndex = (totalRows - 1) * columns + column;
    
    // BOUNDARY CHECK: Ensure we don't exceed total items
    // (Last row might be incomplete)
    if (wrapIndex >= total) wrapIndex = total - 1;
    
    return wrapIndex;
  }

  /**
   * Compute target index when moving down by one row, with wrapping.
   * @param {number} currentIndex
   * @param {number} columns
   * @param {number} total
   * @returns {number}
   */
  wrapIndexDown(currentIndex, columns, total) {
    const newIndex = currentIndex + columns;
    if (newIndex < total) return newIndex;
    const column = currentIndex % columns;
    return column;
  }

  /**
   * Compute target index when moving left within the same row, with wrapping.
   * @param {number} currentIndex
   * @param {number} columns
   * @param {number} total
   * @returns {number}
   */
  indexLeft(currentIndex, columns, total) {
    if (currentIndex % columns === 0) {
      const row = Math.floor(currentIndex / columns);
      const rightmostInRow = Math.min((row + 1) * columns - 1, total - 1);
      return rightmostInRow;
    }
    return currentIndex - 1;
  }

  /**
   * Compute next linear index moving right across all cards, wrapping to 0.
   * @param {number} currentIndex
   * @param {number} total
   * @returns {number}
   */
  indexRightLinear(currentIndex, total) {
    if (currentIndex < 0) return 0;
    const next = currentIndex + 1;
    return next < total ? next : 0;
  }

  /**
   * Calculate the number of columns currently rendered in the grid of cards.
   *
   * Rationale: When using CSS grid with auto-fill/auto-fit, computed styles do not
   * reliably reflect how many columns are actually in the first row. We therefore
   * infer the column count by sampling the DOMRects of the first few cards and
   * comparing their top positions within a small threshold.
   *
   * Implementation notes:
   * - A 25px vertical threshold is used to account for sub-pixel rounding and
   *   small browser/layout differences when cards are close to the same row.
   * - Only position sampling and integer counters are used; no DOM writes occur.
   * - Console output was intentionally left in place previously for debugging; this
   *   method now documents the behavior clearly to minimize future guesswork.
   *
   * @returns {number} Number of columns detected (>= 1)
   */
  calculateGridColumns() {
    if (this.cardElements.length === 0) return 1;
    
    // For a single card we definitively have one column.
    if (this.cardElements.length < 2) return 1;
    
    const firstTop = this.cardElements[0].getBoundingClientRect().top;
    const secondTop = this.cardElements[1].getBoundingClientRect().top;
    
    if (this.isApproximatelySameRow(firstTop, secondTop)) {
      return this.countColumnsInFirstRow(this.cardElements);
    }
    
    return 1;
  }
  
  /**
   * Move the selection up by one row in the grid (wraps to bottom if needed).
   *
   * @returns {void}
   */
  selectCardUp() {
    if (this.cardElements.length === 0) return;
    const columns = this.calculateGridColumns();
    const currentIndex = this.selectedCardIndex === -1 ? 0 : this.selectedCardIndex;
    const target = this.wrapIndexUp(currentIndex, columns, this.cardElements.length);
    this.selectCard(target);
  }
  
  /**
   * Move the selection down by one row in the grid (wraps to top if needed).
   *
   * @returns {void}
   */
  selectCardDown() {
    if (this.cardElements.length === 0) return;
    const columns = this.calculateGridColumns();
    const currentIndex = this.selectedCardIndex === -1 ? -1 : this.selectedCardIndex;
    if (currentIndex === -1) { this.selectCard(0); return; }
    const target = this.wrapIndexDown(currentIndex, columns, this.cardElements.length);
    this.selectCard(target);
  }
  
  /**
   * Move the selection left by one column (wraps to the rightmost column in the row).
   *
   * @returns {void}
   */
  selectCardLeft() {
    if (this.cardElements.length === 0) return;
    const columns = this.calculateGridColumns();
    const currentIndex = this.selectedCardIndex === -1 ? 0 : this.selectedCardIndex;
    const target = this.indexLeft(currentIndex, columns, this.cardElements.length);
    this.selectCard(target);
  }
  
  /**
   * Move the selection right linearly through all cards (wraps to first at end).
   *
   * @returns {void}
   */
  selectCardRight() {
    if (this.cardElements.length === 0) return;
    const currentIndex = this.selectedCardIndex === -1 ? -1 : this.selectedCardIndex;
    if (UI_CONFIG.debug) console.log('→ Right navigation (linear): index', currentIndex, '/', this.cardElements.length);
    const target = this.indexRightLinear(currentIndex, this.cardElements.length);
    this.selectCard(target);
  }
  
  /**
   * Legacy method for backward compatibility - maps to selectCardDown
   */
  selectNextCard() {
    this.selectCardDown();
  }
  
  /**
   * Legacy method for backward compatibility - maps to selectCardUp
   */
  selectPreviousCard() {
    this.selectCardUp();
  }
  
  /**
   * Utility method to remove cards by text content (for console use)
   * @param {string} searchText - Text to search for in card titles/descriptions
   */
  removeCardsByText(searchText) {
    const state = getState();
    const itemsToRemove = state.items.filter(item => 
      item.text.toLowerCase().includes(searchText.toLowerCase()) ||
      item.desc.toLowerCase().includes(searchText.toLowerCase())
    );
    
    if (itemsToRemove.length === 0) {
      console.log(`No cards found containing "${searchText}"`);
      return;
    }
    
    console.log(`Found ${itemsToRemove.length} card(s) containing "${searchText}":`);
    itemsToRemove.forEach((item, index) => {
      console.log(`${index + 1}. "${item.text}" - "${item.desc}"`);
    });
    
    // Remove all matching items
    itemsToRemove.forEach(item => {
      deleteItem(item.id);
      console.log(`Removed: "${item.text}"`);
    });
    
    this.showNotification(`Removed ${itemsToRemove.length} card(s) containing "${searchText}"`);
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
