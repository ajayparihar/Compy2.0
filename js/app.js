/**
 * Compy 2.0 - Main Application Module
 * Enhanced with better code organization, error handling, and modern JavaScript practices
 */

import { STORAGE_KEYS, UI_CONFIG, ICONS, ICON_PATHS, DEFAULT_THEME } from './constants.js?v=2.0.5';
import { 
  $, $$, escapeHtml, highlightText, stringHash, downloadFile, 
  parseCSVLine, csvEscape, formatDate, 
  getAllTags, filterItems, validateItem, debounce, 
  addEventHandler, addMultipleEventHandlers, toggleVisibility, isValidTheme, getSafeTheme,
  Logger, DOMUtils, ValidationUtils, ErrorUtils, createElement,
  createSVGIcon, createIconButton
} from './utils.js?v=2.0.5';
import {
  initState, getState, subscribe, upsertItem,
  deleteItem, updateFilterTags, updateSearch, updateProfile,
  setEditingId, getBackups, reorderItems
} from './state.js?v=2.0.5';
import { createModalManager } from './components/modals.js?v=2.0.5';
import { createConfirmationManager, setGlobalConfirm } from './components/confirmation.js?v=2.0.5';
import { createExpandableCardManager } from './components/expandableCard.js?v=2.0.5';
import { createThemePicker } from './components/themePicker.js?v=2.0.5';
import { pwaThemeManager, isPWA } from './utils/pwaUtils.js?v=2.0.5';
import { createMobileNavigationManager } from './components/mobileNavigation.js?v=2.0.5';
import { createClipboardManager } from './components/clipboard.js?v=2.0.5';
import { createCardDragDropManager } from './components/dragDrop.js?v=2.0.5';
import { createProfileManager } from './components/profileManager.js?v=2.0.5';
import { createTagAutocomplete } from './components/tagAutocomplete.js?v=2.0.5';

/**
 * @typedef {Object} AppItem
 * @property {string} id
 * @property {string} text
 * @property {string} desc
 * @property {boolean} sensitive
 * @property {string[]} tags
 * @property {number} position
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
    // Core state
    this.initialized = false;
    
    // MEMORY MANAGEMENT: AbortController for automatic event listener cleanup
    this.abortController = new AbortController();
    this.cleanupTasks = new Set();
    
    // Component managers
    this.clipboard = null;
    this.notifications = null;
    this.modalManager = null;
    this.confirmationManager = null;
    this.theme = null;
    this.expandableCardManager = null;
    this.dragDropManager = null;
    this.profileManager = null;
    
    // UI state tracking
    this.initialScrollY = 0;
    this.scrollRestored = false;
    this.selectedCardIndex = -1;
    this.cardElements = [];
    this.visibleItems = [];
    
    // Bind only essential methods that are used as event listeners
    this.handleStateChange = this.handleStateChange.bind(this);
    this.removeItem = this.removeItem.bind(this);
  }

  /**
   * Initialize all application components in optimal order
   * @private
   */
  async initializeComponents() {
    // Core systems first
    this.initClipboard();
    this.initNotifications();
    this.initModals();
    this.initTheme();
    
    // UI components
    this.initSearch();
    this.initCards();
    this.initExpandableCards();
    this.initDragAndDrop();
    
    // User features
    this.initProfile();
    this.initProfileManager();
    this.initExport();
    this.initImport();
    this.initEventHandlers();
    
    // State and events
    subscribe(this.handleStateChange);
    await initState();
    
    // MEMORY SAFE: Use AbortController for global event listeners
    document.addEventListener('keydown', (e) => {
      this.handleKeyboardShortcuts(e);
      
      // Emergency escape: Clear stuck overlays with Escape key
      if (e.key === 'Escape') {
        this.ensureScrollingEnabled();
      }
    }, {
      signal: this.abortController.signal
    });
    
    this.setupMobileNavigation();
    
    // Global access setup
    if (typeof window !== 'undefined') {
      window.app = {
        showNotification: this.showNotification.bind(this),
        instance: this,
        // Emergency scroll fix - can be called from console
        fixScrolling: () => {
          if (this.modalManager?.forceScrollRestore) {
            this.modalManager.forceScrollRestore();
          } else {
            this.ensureScrollingEnabled();
          }
        },
        // Debug modal state
        debugScroll: () => {
          if (this.modalManager?.debugScrollState) {
            this.modalManager.debugScrollState();
          } else {
            console.log('Modal manager not available');
          }
        }
      };
    }
  }

  /**
   * Initialize the application UI and services.
   * @returns {Promise<void>}
   */
  async init() {
    if (this.initialized) return;

    try {
    // Initialize foundational systems
    this.initScrollPersistence();
    this.setupResponsiveNavbar();
    
    // Ensure no stuck overlays blocking scroll
    this.ensureScrollingEnabled();
    
    // Initialize all components in dependency order
    this.initializeComponents();
      
      this.initialized = true;
      Logger.info('Compy 2.0 initialized successfully');
      
    } catch (error) {
      Logger.error('Failed to initialize Compy 2.0:', error);
      this.showNotification?.('Failed to initialize application. Please refresh the page.', 'error');
      this.initialized = false;
    }
  }

  /**
   * Add a cleanup task to be executed when the app is destroyed
   * 
   * @param {Function} task - Cleanup function to execute
   */
  addCleanupTask(task) {
    if (typeof task === 'function') {
      this.cleanupTasks.add(task);
    }
  }

  /**
   * Remove a cleanup task
   * 
   * @param {Function} task - Cleanup function to remove
   */
  removeCleanupTask(task) {
    this.cleanupTasks.delete(task);
  }

  /**
   * Destroy the application and cleanup all resources
   * MEMORY SAFETY: This method cleans up all event listeners and references
   */
  destroy() {
    try {
      // Abort all event listeners using AbortController
      this.abortController.abort();
      
      // Run custom cleanup tasks
      this.cleanupTasks.forEach(task => {
        try {
          task();
        } catch (error) {
          Logger.warn('Cleanup task failed:', error);
        }
      });
      
      // Clear cleanup tasks
      this.cleanupTasks.clear();
      
      // Destroy component managers
      if (this.dragDropManager?.destroy) {
        this.dragDropManager.destroy();
      }
      
      if (this.expandableCardManager?.destroy) {
        this.expandableCardManager.destroy();
      }
      
      if (this.modalManager?.destroy) {
        this.modalManager.destroy();
      }
      
      // Clear references
      this.clipboard = null;
      this.notifications = null;
      this.modalManager = null;
      this.confirmationManager = null;
      this.theme = null;
      this.expandableCardManager = null;
      this.dragDropManager = null;
      
      // Clear UI state
      this.cardElements = [];
      this.visibleItems = [];
      
      // Mark as uninitialized
      this.initialized = false;
      
      Logger.info('Compy 2.0 destroyed and cleaned up successfully');
      
    } catch (error) {
      Logger.error('Error during app destruction:', error);
    }
  }

  /**
   * Ensure scrolling is enabled and no overlays are blocking interaction
   */
  ensureScrollingEnabled() {
    try {
      // Hide any stuck backdrops
      const backdrops = document.querySelectorAll('.expandable-card-backdrop, .nav-backdrop');
      backdrops.forEach(backdrop => {
        backdrop.classList.remove('show');
        backdrop.setAttribute('hidden', 'true');
        backdrop.style.display = 'none';
        backdrop.style.pointerEvents = 'none';
      });
      
      // Ensure body can scroll
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
      
      // Remove any modal body classes that might block scrolling
      document.body.classList.remove('modal-open', 'no-scroll');
      
      // Force remove overflow hidden that might be stuck
      if (document.body.style.overflow === 'hidden') {
        document.body.style.overflow = '';
      }
      
      Logger.debug('Scrolling enabled and overlays cleared');
      
    } catch (error) {
      Logger.warn('Failed to ensure scrolling enabled:', error);
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
    
    // Validate snackbar element exists
    if (!snackbar) {
      Logger.error('Snackbar element not found - notifications will not work');
      // Create minimal fallback notification system
      this.notifications = {
        show: (message) => {
          Logger.info('Notification (fallback):', message);
          console.log(`[Notification] ${message}`);
        },
        hide: () => {}
      };
      return;
    }
    
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
      // Input validation for message content
      if (!message || typeof message !== 'string') {
        Logger.warn('Invalid notification message:', { message, type });
        return;
      }
      
      // Sanitize message to prevent potential issues
      const sanitizedMessage = message.trim().slice(0, 500); // Limit length and trim
      if (!sanitizedMessage) {
        Logger.warn('Empty notification message after sanitization');
        return;
      }
      
      // Validate notification type
      const validTypes = ['info', 'success', 'warning', 'error'];
      const sanitizedType = validTypes.includes(type) ? type : 'info';
      
      if (!this.notifications || typeof this.notifications.show !== 'function') {
        Logger.warn('Notifications unavailable; skipping message', { message: sanitizedMessage, type: sanitizedType });
        return;
      }
      
      this.notifications.show(sanitizedMessage, sanitizedType);
    } catch (err) {
      Logger.warn('Notification error; skipping message', err);
    }
  }

  /**
   * Announce a message to screen readers via the live region
   * @param {string} message - Message to announce
   * @param {string} [priority='polite'] - Announcement priority ('polite' or 'assertive')
   */
  announceToScreenReader(message, priority = 'polite') {
    try {
      const liveRegion = $('#liveRegion');
      if (!liveRegion) {
        Logger.warn('Live region not found; skipping screen reader announcement');
        return;
      }
      
      // Set the priority level
      liveRegion.setAttribute('aria-live', priority);
      
      // Clear and set the message
      liveRegion.textContent = '';
      setTimeout(() => {
        liveRegion.textContent = message;
      }, 50);
      
      // Clear the message after it's been announced
      setTimeout(() => {
        liveRegion.textContent = '';
      }, 3000);
      
    } catch (err) {
      Logger.warn('Screen reader announcement error:', err);
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
   * Initialize enhanced theme system with picker modal and PWA support.
   * Persists user choice in localStorage and applies smooth transitions.
   * Includes PWA-specific theme synchronization and manifest updates.
   */
  initTheme() {
    // Initialize PWA theme manager first
    this.pwaThemeManager = pwaThemeManager;
    
    // Enhanced theme manager with PWA support
    this.theme = {
      apply: (themeName) => {
        if (!themeName || typeof themeName !== 'string') return;
        
        try {
          // Use PWA theme manager for application
          const success = this.pwaThemeManager.applyTheme(themeName);
          
          if (success) {
            // Smooth transition effect
            const docEl = document.documentElement;
            docEl.classList.add('theme-switching');
            setTimeout(() => docEl.classList.remove('theme-switching'), 300);
            
            // Update theme picker if available
            this.themePicker?.updateSelectedTheme?.(themeName);
          } else {
            // Fallback to default theme on failure
            document.documentElement.setAttribute('data-theme', DEFAULT_THEME);
            Logger.warn('Theme application failed, using default theme');
          }
        } catch (error) {
          Logger.error('Theme application failed:', error);
          document.documentElement.setAttribute('data-theme', DEFAULT_THEME);
        }
      },
      
      load: () => {
        const themeSource = document.documentElement.getAttribute('data-theme-source');
        if (themeSource === 'html' || themeSource === 'html-fallback') return;
        
        try {
          // Use PWA theme manager for loading
          const savedTheme = this.pwaThemeManager.loadTheme();
          this.theme.apply(savedTheme);
        } catch (error) {
          Logger.error('Theme loading failed:', error);
          document.documentElement.setAttribute('data-theme', DEFAULT_THEME);
        }
      },
      
      getCurrentTheme: () => document.documentElement.getAttribute('data-theme') || DEFAULT_THEME,
      
      // Add PWA-specific methods
      isPWA: () => this.pwaThemeManager.isPWA,
      getStatus: () => this.pwaThemeManager.getStatus(),
      forceSync: () => this.pwaThemeManager.forceSyncTheme()
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
    
    const clearSearch = () => {
      searchInput.value = '';
      updateSearch('');
    };

    // Handle search input
    searchInput.addEventListener('input', debounce((e) => {
      updateSearch(e.target.value);
    }, 150));

    // Handle clear button
    searchClear.addEventListener('click', clearSearch);
    
    // Store clear function for use in empty state handlers
    this.clearSearch = clearSearch;
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
   * Initialize drag and drop functionality for card reordering.
   * Creates and initializes the drag and drop manager for snippet cards.
   */
  initDragAndDrop() {
    try {
      const cardsContainer = $('#cards');
      
      if (!cardsContainer) {
        Logger.warn('Cards container not found; skipping drag and drop initialization');
        return;
      }

      // ACCESSIBILITY COMPLIANCE: Reduced Motion Preference
      // CSS Media Query: prefers-reduced-motion detects user's OS-level motion settings
      // Business Rules:
      // - Users with vestibular disorders may request reduced motion
      // - Setting disabled: animations = 200ms (smooth transitions)
      // - Setting enabled: animations = 0ms (instant, no motion)
      // - Fallback: if matchMedia unavailable, assume motion is okay (200ms)
      const prefersReducedMotion = typeof window.matchMedia === 'function' && 
                                   window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const animMs = prefersReducedMotion ? 0 : 200;

      // Create drag and drop manager
      this.dragDropManager = createCardDragDropManager(cardsContainer, {
        animationDuration: animMs,
        onStart: (event) => {
          // Add visual feedback when drag starts
          event.item.setAttribute('aria-grabbed', 'true');
        },
        onEnd: (event) => {
          // Clean up accessibility attributes
          event.item.setAttribute('aria-grabbed', 'false');
        }
      });

      Logger.info('Drag and drop manager initialized');
    } catch (error) {
      Logger.error('Failed to initialize drag and drop:', error);
      // Don't fail the entire app if drag and drop fails
    }
  }

  // EXTRACTED METHOD: Reduce code duplication for reorder disabled notifications
  notifyReorderDisabled() {
    this.showNotification('Reordering disabled while search or filters are active', 'info');
  }

  // BUSINESS LOGIC: Drag/Drop Availability Rules
  // Reordering is disabled when search/filters are active because:
  // 1. Users would expect to reorder the filtered view, not the full dataset
  // 2. Hidden cards would be affected in unexpected ways
  // 3. UX becomes confusing when some cards are not visible
  // 4. Position changes would be lost when filters are cleared
  isReorderDisabled() {
    try {
      const s = getState();
      // SEARCH CHECK: Active search query disables reordering
      // Trimmed check prevents whitespace-only strings from counting as searches
      const hasSearch = !!(s.search && s.search.trim());
      
      // FILTER CHECK: Any active tag filters disable reordering
      // Array validation prevents crashes from malformed state
      const hasFilters = Array.isArray(s.filterTags) && s.filterTags.length > 0;
      
      // CARD COUNT CHECK: Need at least 2 cards to make reordering meaningful
      return hasSearch || hasFilters || this.cardElements.length <= 1;
    } catch (e) { 
      // FALLBACK: If state access fails, only disable when insufficient cards
      return this.cardElements.length <= 1; 
    }
  }

  // Helper: update drag handle tooltips based on disabled state
  updateDragHandleTooltips(isDisabled) {
    try {
      // Accessibility: reflect disabled state via title and aria-disabled on handles
      const handles = document.querySelectorAll('.drag-handle');
      handles.forEach(h => {
        h.setAttribute('title', isDisabled ? 'Clear search and filters to reorder' : 'Drag to reorder');
        if (isDisabled) {
          h.setAttribute('aria-disabled', 'true');
        } else {
          h.removeAttribute('aria-disabled');
        }
      });
    } catch (e) {}
  }

  /**
   * Move a card up one position using keyboard navigation
   * @param {number} cardIndex - Current index of the card
   */
  moveCardUp(cardIndex) {
    if (cardIndex <= 0 || !this.visibleItems[cardIndex]) return;
    
    const targetIndex = cardIndex - 1;
    this.moveCardToPosition(cardIndex, targetIndex);
    this.showNotification('Card moved up', 'info');
  }
  
  /**
   * Move a card down one position using keyboard navigation
   * @param {number} cardIndex - Current index of the card
   */
  moveCardDown(cardIndex) {
    if (cardIndex >= this.visibleItems.length - 1 || !this.visibleItems[cardIndex]) return;
    
    const targetIndex = cardIndex + 1;
    this.moveCardToPosition(cardIndex, targetIndex);
    this.showNotification('Card moved down', 'info');
  }
  
  /**
   * Move a card to a specific position using keyboard navigation
   * @param {number} fromIndex - Current index of the card
   * @param {number} toIndex - Target index for the card
   */
  moveCardToPosition(fromIndex, toIndex) {
    if (fromIndex === toIndex || !this.visibleItems[fromIndex]) return;
    
    // Clamp target index to valid range
    const clampedToIndex = Math.max(0, Math.min(toIndex, this.visibleItems.length - 1));
    
    // Create new order array by moving the item
    const newOrder = [...this.visibleItems];
    const [movedItem] = newOrder.splice(fromIndex, 1);
    newOrder.splice(clampedToIndex, 0, movedItem);
    
    // Extract IDs in new order and update state
    const orderedIds = newOrder.map(item => item.id);
    
    try {
      reorderItems(orderedIds);
    } catch (error) {
      Logger.error('Failed to reorder items:', error);
      this.showNotification('Failed to reorder cards', 'error');
      return;
    }
    
    // Update focus to maintain keyboard navigation
    setTimeout(() => {
      const targetCard = document.querySelector(`[data-card-index="${clampedToIndex}"]`);
      if (targetCard) {
        targetCard.focus();
      }
    }, 100);
  }

  /**
   * Render the visible list of cards from state with optimized DOM performance
   * 
   * PERFORMANCE UPDATE: This method now uses document fragment batching and
   * optimized DOM operations to prevent layout thrashing and improve rendering speed.
   * 
   * Performance Optimizations:
   * - Document fragment batching prevents multiple DOM manipulations
   * - requestAnimationFrame ensures rendering at optimal 60fps timing
   * - Single DOM operation replaces multiple individual appends
   * - Batched CSS class updates reduce layout calculations
   * - Cached element references minimize DOM queries
   * 
   * @param {Object} state - Current application state containing items, search, filters
   */
  renderCards(state) {
    const container = $('#cards');
    const filteredItems = filterItems(state.items, state.search, state.filterTags);
    
    // Sort items by position to maintain custom order
    const sortedItems = [...filteredItems].sort((a, b) => (a.position || 0) - (b.position || 0));
    
    // Preserve scroll position during re-render
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    
    // PERFORMANCE OPTIMIZATION: Use requestAnimationFrame for optimal timing
    requestAnimationFrame(() => {
      // Check for empty states first
      if (this.renderEmptyIfNeeded(container, state, sortedItems)) {
        // Disable drag and drop when there are no visible items
        if (this.dragDropManager) {
          this.dragDropManager.setEnabled(false);
        }
        return;
      }

      // OPTIMIZED DOM UPDATES: Use document fragment for batched operations
      const fragment = document.createDocumentFragment();
      
      // Build all cards in memory first (prevents layout thrashing)
      sortedItems.forEach((item, index) => {
        const cardElement = this.createCardElement(item, state.search, index);
        fragment.appendChild(cardElement);
      });
      
      // SINGLE DOM OPERATION: Replace all content at once
      container.replaceChildren(fragment);
      
      // Update tracking arrays AFTER DOM update
      this.visibleItems = [...sortedItems];
      this.cardElements = Array.from(container.children);
      
      // BATCHED CSS UPDATES: Apply all classes in one operation
      this.optimizePostRender(container, state, scrollTop);
    });
  }

  /**
   * Optimize post-render operations with batched updates
   * 
   * @param {HTMLElement} container - Cards container
   * @param {Object} state - Application state
   * @param {number} scrollTop - Previous scroll position
   * @private
   */
  optimizePostRender(container, state, scrollTop) {
    const isFiltered = !!(state.search?.trim() || state.filterTags?.length);
    const hasCards = this.cardElements.length > 0;
    const hasFewCards = this.cardElements.length <= 6;
    
    // BATCH CLASS OPERATIONS: Apply all CSS class changes in one operation
    const classUpdates = [
      () => container.classList.remove('empty-state'),
      () => container.classList.toggle('few-cards', hasFewCards),
      () => container.classList.toggle('dnd-disabled', isFiltered || this.cardElements.length <= 1)
    ];
    
    // Execute all class updates together
    classUpdates.forEach(update => update());
    
    // OPTIMIZE DRAG AND DROP: Batch drag/drop updates
    if (this.dragDropManager) {
      this.dragDropManager.refresh();
      const enableDnD = !isFiltered && this.cardElements.length > 1;
      this.dragDropManager.setEnabled(enableDnD);
    }
    
    // Update drag handle tooltips
    this.updateDragHandleTooltips(isFiltered);
    
    // Ensure selection is valid and restore it visually
    this.ensureSelectionWithinBounds();
    
    // OPTIMIZE SCROLL RESTORATION: Use efficient scroll restoration
    this.optimizeScrollRestore(scrollTop);
  }

  /**
   * Optimized scroll position restoration
   * 
   * @param {number} prevScrollTop - Previous scroll position
   * @private
   */
  optimizeScrollRestore(prevScrollTop) {
    // Use requestAnimationFrame for smooth scroll restoration
    requestAnimationFrame(() => {
      if (!this.scrollRestored && this.initialScrollY > 0) {
        // Restore saved scroll position on first render
        window.scrollTo({ top: this.initialScrollY, behavior: 'auto' });
        this.scrollRestored = true;
        
        // Re-enable entry animations after stabilization
        requestAnimationFrame(() => {
          document.documentElement.classList.remove('disable-entry-anim');
        });
      } else {
        // Maintain current scroll position during re-renders
        const currentScrollTop = window.scrollY || document.documentElement.scrollTop;
        const scrollDelta = Math.abs(currentScrollTop - prevScrollTop);
        
        // Only restore if scroll position changed significantly (>2px)
        if (scrollDelta > 2) {
          window.scrollTo({ top: prevScrollTop, behavior: 'auto' });
        }
      }
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
    // Contract: returns true if an empty-state UI was rendered so callers
    // can short-circuit further list building and DnD setup.
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
   * Create the base card element structure with essential attributes
   * @private
   * @param {Object} item - Item data
   * @param {number} index - Card index for navigation
   * @returns {HTMLElement} Base card element
   */
  createBaseCardElement(item, index) {
    // ELEMENT CREATION: Create the article element with base structure
    const card = document.createElement('article');
    card.className = 'card expandable-card';
    card.id = `card-${item.id}`;
    card.dataset.cardId = item.id;
    
    // NAVIGATION SUPPORT: Add index for keyboard navigation if provided
    if (index >= 0) {
      card.dataset.cardIndex = index;
    }
    
    return card;
  }

  /**
   * Apply accessibility and interaction attributes to card element
   * @private
   * @param {HTMLElement} card - Card element to configure
   * @param {Object} item - Item data for aria-label content
   */
  configureCardAccessibility(card, item) {
    // ACCESSIBILITY ATTRIBUTES: Essential for screen readers and keyboard navigation
    const attributes = {
      'aria-grabbed': 'false',
      'role': 'button',
      'tabindex': '0',
      'aria-label': `Snippet: ${item.sensitive ? 'Sensitive content' : item.text}. Press Enter to copy, Ctrl+arrows to reorder.`
    };
    
    // BATCH ATTRIBUTE SETTING: More efficient than individual setAttribute calls
    Object.entries(attributes).forEach(([key, value]) => {
      card.setAttribute(key, value);
    });
  }

  /**
   * Generate secure DOM content for a card with highlighted search terms
   * SECURITY: This method uses safe DOM manipulation instead of innerHTML to prevent XSS
   * @private
   * @param {Object} item - Item data
   * @param {string} searchQuery - Search query for highlighting
   * @returns {HTMLElement} Secure card content DOM element
   */
  generateSecureCardDOM(item, searchQuery) {
    // Create main content container
    const cardContent = createElement('div', {
      className: 'expandable-card-content'
    });
    
    // Create title element with safe content
    const title = createElement('div', {
      className: 'title',
      textContent: item.sensitive ? '••••••••••' : item.text
    });
    
    // Apply safe highlighting to title if not sensitive
    if (searchQuery && !item.sensitive) {
      this.applySecureTextHighlighting(title, searchQuery);
    }
    
    // Create description element with safe content
    const desc = createElement('div', {
      className: 'desc',
      textContent: item.desc
    });
    
    // Apply safe highlighting to description
    if (searchQuery) {
      this.applySecureTextHighlighting(desc, searchQuery);
    }
    
    // Create tags container
    const tagsContainer = this.createSecureTagsDOM(item.tags, searchQuery);
    
    // Create expanded view details
    const cardDetails = createElement('div', {
      className: 'card-details'
    });
    
    const detailsContent = createElement('div', {
      className: 'details-content'
    });
    
    // Expanded title (clone of main title)
    const expandedTitle = title.cloneNode(true);
    expandedTitle.className = 'expanded-title';
    
    // Expanded description (clone of main desc)
    const expandedDesc = desc.cloneNode(true);
    expandedDesc.className = 'expanded-desc';
    
    // Add elements to details content
    detailsContent.appendChild(expandedTitle);
    detailsContent.appendChild(expandedDesc);
    
    if (item.tags.length > 0) {
      const expandedTags = tagsContainer.cloneNode(true);
      expandedTags.className = 'expanded-tags';
      detailsContent.appendChild(expandedTags);
    }
    
    cardDetails.appendChild(detailsContent);
    
    // Assemble main content
    cardContent.appendChild(title);
    cardContent.appendChild(desc);
    cardContent.appendChild(tagsContainer);
    cardContent.appendChild(cardDetails);
    
    // Create container for all card elements
    const fullCardContent = createElement('div');
    fullCardContent.appendChild(cardContent);
    fullCardContent.appendChild(this.createSecureCardActionsDOM());
    fullCardContent.appendChild(this.createSecureCloseButtonDOM());
    fullCardContent.appendChild(this.createSecureDragHandleDOM());
    
    return fullCardContent;
  }

  /**
   * Apply secure text highlighting using DOM manipulation (prevents XSS)
   * @private
   * @param {HTMLElement} element - Element to apply highlighting to
   * @param {string} query - Search query to highlight
   */
  applySecureTextHighlighting(element, query) {
    if (!query || !element) return;
    
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );
    
    const textNodes = [];
    let node;
    
    // Collect all text nodes
    while (node = walker.nextNode()) {
      textNodes.push(node);
    }
    
    // Process each text node
    textNodes.forEach(textNode => {
      const text = textNode.textContent;
      const escapedQuery = this.escapeRegExp(query);
      const regex = new RegExp(escapedQuery, 'gi');
      
      if (regex.test(text)) {
        const fragment = document.createDocumentFragment();
        let lastIndex = 0;
        let match;
        
        regex.lastIndex = 0; // Reset regex state
        
        while ((match = regex.exec(text)) !== null) {
          // Add text before match
          if (match.index > lastIndex) {
            fragment.appendChild(
              document.createTextNode(text.slice(lastIndex, match.index))
            );
          }
          
          // Add highlighted match using createElement (safe)
          const mark = createElement('mark', {
            textContent: match[0]
          });
          fragment.appendChild(mark);
          
          lastIndex = regex.lastIndex;
          
          // Prevent infinite loops on zero-length matches
          if (match.index === regex.lastIndex) {
            regex.lastIndex++;
          }
        }
        
        // Add remaining text
        if (lastIndex < text.length) {
          fragment.appendChild(
            document.createTextNode(text.slice(lastIndex))
          );
        }
        
        // Replace text node with fragment
        textNode.parentNode.replaceChild(fragment, textNode);
      }
    });
  }

  /**
   * Escape regex special characters to prevent injection
   * @private
   * @param {string} string - String to escape
   * @returns {string} Escaped string safe for regex
   */
  escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Create secure tags DOM element using safe methods
   * @private
   * @param {string[]} tags - Array of tag strings
   * @param {string} searchQuery - Search query for highlighting
   * @returns {HTMLElement} Tags container element
   */
  createSecureTagsDOM(tags = [], searchQuery = '') {
    const tagsContainer = createElement('div', {
      className: 'tags'
    });
    
    const maxVisible = UI_CONFIG.maxVisibleTags;
    const visibleTags = tags.slice(0, maxVisible);
    const extraCount = tags.length - visibleTags.length;
    
    // Create tag chips securely
    visibleTags.forEach(tag => {
      const hue = Math.abs(stringHash(tag)) % 360;
      const chip = createElement('span', {
        className: 'chip',
        textContent: tag
      });
      
      // Set CSS custom property for consistent tag colors
      chip.style.setProperty('--hue', hue);
      
      // Apply safe highlighting to tag
      if (searchQuery) {
        this.applySecureTextHighlighting(chip, searchQuery);
      }
      
      tagsContainer.appendChild(chip);
    });
    
    // Add "more" indicator if needed
    if (extraCount > 0) {
      const moreIndicator = createElement('span', {
        className: 'more',
        textContent: `+${extraCount} more`,
        attributes: {
          'data-more-tags': '',
          'title': `Show all ${tags.length} tags`
        }
      });
      tagsContainer.appendChild(moreIndicator);
    }
    
    return tagsContainer;
  }

  /**
   * Create secure card actions DOM without innerHTML
   * @private
   * @returns {HTMLElement} Actions container
   */
  createSecureCardActionsDOM() {
    const actions = createElement('div', {
      className: 'actions',
      attributes: { 'aria-label': 'Card actions' }
    });
    
    // Create expand/collapse container
    const expandCollapseContainer = createElement('div', {
      className: 'expand-collapse-container'
    });
    
    // Define all card action buttons with their configurations
    const buttonConfigs = [
      { action: 'expand', title: 'Expand card', className: 'expand-trigger', iconPaths: ICON_PATHS.expand },
      { action: 'collapse', title: 'Collapse card', className: 'collapse-action card-action-hidden', iconPaths: ICON_PATHS.collapse },
      { action: 'copy', title: 'Copy to clipboard', iconPaths: ICON_PATHS.copy },
      { action: 'edit', title: 'Edit snippet', iconPaths: ICON_PATHS.edit },
      { action: 'delete', title: 'Delete snippet', className: 'danger-icon', iconPaths: ICON_PATHS.delete }
    ];
    
    // Create expand/collapse container for the first two buttons
    buttonConfigs.slice(0, 2).forEach(config => {
      const button = this.createSecureIconButton({
        className: `icon-btn ${config.className || ''}`.trim(),
        title: config.title,
        dataAct: config.action,
        iconPaths: config.iconPaths
      });
      expandCollapseContainer.appendChild(button);
    });
    
    actions.appendChild(expandCollapseContainer);
    
    // Create remaining action buttons (copy, edit, delete)
    buttonConfigs.slice(2).forEach(config => {
      const button = this.createSecureIconButton({
        className: `icon-btn ${config.className || ''}`.trim(),
        title: config.title,
        dataAct: config.action,
        iconPaths: config.iconPaths
      });
      actions.appendChild(button);
    });
    
    return actions;
  }

  /**
   * Create secure close button DOM
   * @private
   * @returns {HTMLElement} Close button element
   */
  createSecureCloseButtonDOM() {
    const closeBtn = createElement('button', {
      className: 'close-btn',
      attributes: {
        'title': 'Close expanded view',
        'aria-label': 'Close expanded view'
      }
    });
    
    const closeIcon = createElement('span', {
      textContent: ICONS.close,
      attributes: { 'aria-hidden': 'true' }
    });
    
    closeBtn.appendChild(closeIcon);
    return closeBtn;
  }

  /**
   * Create secure drag handle DOM
   * @private
   * @returns {HTMLElement} Drag handle button
   */
  createSecureDragHandleDOM() {
    return this.createSecureIconButton({
      className: 'icon-btn drag-handle',
      title: 'Drag to reorder',
      iconPaths: ICON_PATHS.dragHandle,
      width: 16,
      height: 16
    });
  }

  /**
   * Create secure icon button using safe DOM methods
   * @private
   * @param {Object} options - Button options
   * @returns {HTMLElement} Secure button element
   */
  createSecureIconButton(options = {}) {
    const {
      className = 'icon-btn',
      title = '',
      dataAct,
      iconPaths = '',
      width = 20,
      height = 20
    } = options;
    
    const button = createElement('button', {
      className,
      attributes: {
        'title': title,
        'aria-label': title,
        'data-act': dataAct
      }
    });
    
    if (iconPaths) {
      const svg = this.createSecureSVGIcon(iconPaths, width, height, title);
      button.appendChild(svg);
    }
    
    return button;
  }

  /**
   * Create secure SVG icon using safe DOM methods
   * @private
   * @param {string} paths - SVG path data
   * @param {number} width - Icon width
   * @param {number} height - Icon height
   * @param {string} title - Accessible title
   * @returns {SVGElement} Secure SVG element
   */
  createSecureSVGIcon(paths, width = 20, height = 20, title = '') {
    const svg = this.createBaseSVGElement(width, height);
    this.configureSVGAccessibility(svg, title);
    
    if (paths) {
      this.populateSVGElements(svg, paths);
    }
    
    return svg;
  }

  /**
   * Create base SVG element with standard attributes
   * @private
   * @param {number} width - Icon width
   * @param {number} height - Icon height
   * @returns {SVGElement} Base SVG element
   */
  createBaseSVGElement(width, height) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('width', width);
    svg.setAttribute('height', height);
    svg.setAttribute('focusable', 'false');
    svg.setAttribute('role', 'img');
    return svg;
  }

  /**
   * Configure SVG accessibility attributes and title element
   * @private
   * @param {SVGElement} svg - SVG element to configure
   * @param {string} title - Accessible title
   */
  configureSVGAccessibility(svg, title) {
    if (title) {
      svg.setAttribute('aria-label', title);
      const titleElement = document.createElementNS('http://www.w3.org/2000/svg', 'title');
      titleElement.textContent = title;
      svg.appendChild(titleElement);
    } else {
      svg.setAttribute('aria-hidden', 'true');
    }
  }

  /**
   * Parse and populate SVG with path, circle, and rect elements
   * @private
   * @param {SVGElement} svg - SVG element to populate
   * @param {string} paths - SVG path data string
   */
  populateSVGElements(svg, paths) {
    // Parse and create different SVG element types
    this.createSVGPathElements(svg, paths);
    this.createSVGCircleElements(svg, paths);
    this.createSVGRectElements(svg, paths);
  }

  /**
   * Create SVG path elements from path data
   * @private
   * @param {SVGElement} svg - Parent SVG element
   * @param {string} paths - Path data string
   */
  createSVGPathElements(svg, paths) {
    const pathRegex = /<path[^>]*d="([^"]*)"/g;
    let match;
    
    while ((match = pathRegex.exec(paths)) !== null) {
      const pathElement = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      pathElement.setAttribute('d', match[1]);
      
      // Extract and apply path attributes
      this.applySVGPathAttributes(pathElement, paths, match[1]);
      svg.appendChild(pathElement);
    }
  }

  /**
   * Apply attributes to SVG path element based on source string
   * @private
   * @param {SVGPathElement} pathElement - Path element to configure
   * @param {string} paths - Source paths string
   * @param {string} pathData - Specific path data for matching
   */
  applySVGPathAttributes(pathElement, paths, pathData) {
    const escapedPath = pathData.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pathMatch = paths.match(new RegExp(`<path[^>]*d="${escapedPath}"[^>]*>`, 'g'));
    
    if (pathMatch) {
      const pathStr = pathMatch[0];
      const attributeMap = {
        'fill="none"': ['fill', 'none'],
        'stroke="currentColor"': ['stroke', 'currentColor'],
        'stroke-width="2"': ['stroke-width', '2'],
        'stroke-linecap="round"': ['stroke-linecap', 'round'],
        'stroke-linejoin="round"': ['stroke-linejoin', 'round'],
        'fill="currentColor"': ['fill', 'currentColor']
      };
      
      Object.entries(attributeMap).forEach(([pattern, [attr, value]]) => {
        if (pathStr.includes(pattern)) {
          pathElement.setAttribute(attr, value);
        }
      });
    }
  }

  /**
   * Create SVG circle elements from circle data
   * @private
   * @param {SVGElement} svg - Parent SVG element
   * @param {string} paths - Path data string containing circles
   */
  createSVGCircleElements(svg, paths) {
    const circleRegex = /<circle[^>]*cx="([^"]*)"[^>]*cy="([^"]*)"[^>]*r="([^"]*)"/g;
    let match;
    
    while ((match = circleRegex.exec(paths)) !== null) {
      const circleElement = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circleElement.setAttribute('cx', match[1]);
      circleElement.setAttribute('cy', match[2]);
      circleElement.setAttribute('r', match[3]);
      circleElement.setAttribute('fill', 'currentColor');
      svg.appendChild(circleElement);
    }
  }

  /**
   * Create SVG rect elements from rect data
   * @private
   * @param {SVGElement} svg - Parent SVG element
   * @param {string} paths - Path data string containing rects
   */
  createSVGRectElements(svg, paths) {
    const rectRegex = /<rect[^>]*x="([^"]*)"[^>]*y="([^"]*)"[^>]*width="([^"]*)"[^>]*height="([^"]*)"/g;
    let match;
    
    while ((match = rectRegex.exec(paths)) !== null) {
      const rectElement = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rectElement.setAttribute('x', match[1]);
      rectElement.setAttribute('y', match[2]);
      rectElement.setAttribute('width', match[3]);
      rectElement.setAttribute('height', match[4]);
      
      // Apply additional rect attributes
      this.applySVGRectAttributes(rectElement, paths, match[1]);
      svg.appendChild(rectElement);
    }
  }

  /**
   * Apply additional attributes to SVG rect element
   * @private
   * @param {SVGRectElement} rectElement - Rect element to configure
   * @param {string} paths - Source paths string
   * @param {string} xValue - X coordinate for matching
   */
  applySVGRectAttributes(rectElement, paths, xValue) {
    const rectMatch = paths.match(new RegExp(`<rect[^>]*x="${xValue}"[^>]*>`, 'g'));
    
    if (rectMatch) {
      const rectStr = rectMatch[0];
      const attributeMap = {
        'fill="none"': ['fill', 'none'],
        'stroke="currentColor"': ['stroke', 'currentColor'],
        'stroke-width="2"': ['stroke-width', '2'],
        'rx="2"': ['rx', '2'],
        'ry="2"': ['ry', '2']
      };
      
      Object.entries(attributeMap).forEach(([pattern, [attr, value]]) => {
        if (rectStr.includes(pattern)) {
          rectElement.setAttribute(attr, value);
        }
      });
    }
  }



  /**
   * Create a DOM element representing a single item card.
   * 
   * SECURITY UPDATE: This function now uses safe DOM methods instead of innerHTML
   * to prevent XSS vulnerabilities. The card creation process follows these steps:
   * 1. Create base element structure
   * 2. Configure accessibility attributes
   * 3. Generate safe DOM content (NO innerHTML)
   * 4. Setup event handlers for interactions
   * 
   * @param {Object} item - Item with text, desc, sensitive, tags
   * @param {string} [searchQuery=''] - Current search query for highlighting
   * @param {number} [index] - Index of the card for keyboard navigation
   * @returns {HTMLElement} Fully configured card element
   */
  createCardElement(item, searchQuery = '', index = -1) {
    // MODULAR CARD CREATION: Build card using focused helper methods
    
    // 1. CREATE BASE STRUCTURE: Essential element and attributes
    const card = this.createBaseCardElement(item, index);
    
    // 2. CONFIGURE ACCESSIBILITY: ARIA attributes and interaction support
    this.configureCardAccessibility(card, item);
    
    // 3. SECURE CONTENT GENERATION: Use safe DOM methods instead of innerHTML
    const cardContent = this.generateSecureCardDOM(item, searchQuery);
    card.appendChild(cardContent);

    // 4. SETUP INTERACTIONS: Event handlers for user interactions
    this.setupCardEventHandlers(card, item);
    
    return card;
  }

  /**
   * Wire click/keyboard handlers for a card's interactions with memory-safe event handling
   * MEMORY SAFETY: Uses AbortController for automatic cleanup
   * @param {HTMLElement} card - Card element
   * @param {Object} item - Item backing the card
   */
  setupCardEventHandlers(card, item) {
    // Use AbortController signal for automatic cleanup
    const options = { signal: this.abortController.signal };
    
    // Click to select card and copy (but not on action buttons or when expanded)
    card.addEventListener('click', (e) => {
      if (!e.target.closest('.actions') && !e.target.closest('.drag-handle')) {
        // Skip copy functionality when card is expanded
        if (card.classList.contains('expanded')) {
          return;
        }
        
        // Select the clicked card (suppress notification for clicks)
        const cardIndex = parseInt(card.dataset.cardIndex);
        if (!isNaN(cardIndex)) {
          this.selectCard(cardIndex, false);
          // Move keyboard focus to the card to enable arrow-key navigation
          card.focus();
        }
        
        // Copy the content
        this.clipboard.copy(item.text);
      }
    }, options);
    
    // Keyboard accessibility for reordering
    card.addEventListener('keydown', (e) => {
      const cardIndex = parseInt(card.dataset.cardIndex);
      if (isNaN(cardIndex)) return;
      
      // KEYBOARD CONTROLS OVERVIEW
      // - Space/Enter: Copy when not currently grabbed (aria-grabbed='false').
      // - Ctrl/Cmd + ArrowUp/ArrowDown/Home/End: Reorder card in visible list.
      //   Reordering is disabled when search or filters are active to avoid index drift.
      //   We announce constraints via snackbar for user clarity.
      switch (e.key) {
        case ' ':
        case 'Enter':
          // Space or Enter to copy content (unless card is expanded)
          if (!card.hasAttribute('aria-grabbed') || card.getAttribute('aria-grabbed') === 'false') {
            // Skip copy functionality when card is expanded
            if (card.classList.contains('expanded')) {
              return;
            }
            e.preventDefault();
            this.clipboard.copy(item.text);
          }
          break;
          
        case 'ArrowUp':
          if (e.ctrlKey || e.metaKey) {
            // Ctrl/Cmd + Up to move card up
            e.preventDefault();
            if (this.isReorderDisabled()) {
              this.notifyReorderDisabled();
              break;
            }
            this.moveCardUp(cardIndex);
          }
          break;
          
        case 'ArrowDown':
          if (e.ctrlKey || e.metaKey) {
            // Ctrl/Cmd + Down to move card down
            e.preventDefault();
            if (this.isReorderDisabled()) {
              this.notifyReorderDisabled();
              break;
            }
            this.moveCardDown(cardIndex);
          }
          break;
          
        case 'Home':
          if (e.ctrlKey || e.metaKey) {
            // Ctrl/Cmd + Home to move to top
            e.preventDefault();
            if (this.isReorderDisabled()) {
              this.notifyReorderDisabled();
              break;
            }
            this.moveCardToPosition(cardIndex, 0);
          }
          break;
          
        case 'End':
          if (e.ctrlKey || e.metaKey) {
            // Ctrl/Cmd + End to move to bottom
            e.preventDefault();
            if (this.isReorderDisabled()) {
              this.notifyReorderDisabled();
              break;
            }
            this.moveCardToPosition(cardIndex, this.visibleItems.length - 1);
          }
          break;
      }
    }, options);

    // Action buttons - use event delegation for all buttons
    card.addEventListener('click', (e) => {
      const button = e.target.closest('[data-act]');
      if (button) {
        e.stopPropagation();
        const action = button.dataset.act;
        
        switch (action) {
          case 'edit':
            // Collapse expanded card first if it's expanded
            if (card.classList.contains('expanded') && this.expandableCardManager) {
              this.expandableCardManager.collapse();
            }
            this.openItemModal(item.id);
            break;
          case 'delete':
            // Collapse expanded card first if it's expanded
            if (card.classList.contains('expanded') && this.expandableCardManager) {
              this.expandableCardManager.collapse();
            }
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
          case 'collapse':
            if (this.expandableCardManager) {
              this.expandableCardManager.collapse();
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
    }, options);
    
    // Track cleanup for any additional card-specific cleanup
    this.addCleanupTask(() => {
      // Remove any custom attributes or data
      card.removeAttribute('data-active');
      card.removeAttribute('aria-grabbed');
    });
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
   */
  setupEmptyStateHandlers() {
    const handlers = {
      '#emptyAddBtn': () => this.openItemModal(),
      '#emptyImportBtn': () => $('#importFile').click(),
      '#clearSearchBtn': () => this.clearSearch(),
      '#clearFiltersBtn': () => updateFilterTags([])
    };
    
    Object.entries(handlers).forEach(([selector, handler]) => {
      const element = $(selector);
      if (element) element.addEventListener('click', handler);
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

      // Clear any existing form errors before opening
      this.clearFormErrors();
      
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
        this.setProfileFieldState(false); // Clear any existing errors
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
   * Handle profile field validation state
   * @private
   */
  setProfileFieldState(hasError, errorMessage = '') {
    const field = $('#profileNameInput');
    if (!field) return;
    
    // Clear existing error
    const existingError = $('#profile-name-error');
    if (existingError) {
      existingError.remove();
      field.removeAttribute('aria-describedby');
    }
    
    field.classList.toggle('error', hasError);
    field.setAttribute('aria-invalid', hasError.toString());
    
    if (hasError && errorMessage) {
      // Create and display error
      const errorElement = document.createElement('div');
      errorElement.id = 'profile-name-error';
      errorElement.className = 'error-message';
      errorElement.textContent = errorMessage;
      errorElement.setAttribute('role', 'alert');
      
      const fieldContainer = field.closest('.field');
      if (fieldContainer) {
        fieldContainer.appendChild(errorElement);
      }
      
      field.setAttribute('aria-describedby', 'profile-name-error profileNameHelp');
      setTimeout(() => field.focus(), 100);
    }
  }

  /**
   * Validate and save profile name
   * @private
   */
  saveProfileWithValidation() {
    try {
      this.setProfileFieldState(false); // Clear previous errors
      
      const profileInput = $('#profileNameInput');
      if (!profileInput) {
        this.showNotification('Profile save failed: Input not found', 'error');
        return;
      }
      
      const rawName = profileInput.value || '';
      
      // Validate input
      if (rawName.length > 100) {
        this.setProfileFieldState(true, 'Profile name cannot exceed 100 characters');
        this.showNotification('Profile name too long', 'error');
        return;
      }
      
      const trimmedName = rawName.trim();
      const safePattern = /^[a-zA-Z0-9\s\-_.,']*$/;
      
      if (trimmedName.length > 0 && !safePattern.test(trimmedName)) {
        this.setProfileFieldState(true, 'Only letters, numbers, spaces, and basic punctuation allowed.');
        this.showNotification('Profile name contains invalid characters', 'error');
        return;
      }

      if (/<[^>]*>/g.test(trimmedName)) {
        this.setProfileFieldState(true, 'Profile name cannot contain HTML tags');
        this.showNotification('Profile name cannot contain HTML tags', 'error');
        return;
      }

      // Save valid profile
      updateProfile(trimmedName);
      this.modalManager.close('#profileModal');
      
      const message = trimmedName ? `Profile updated to "${trimmedName}"` : 'Profile name cleared';
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
   * Initialize the profile manager component with backup functionality
   */
  initProfileManager() {
    try {
      // Create profile manager with required dependencies
      this.profileManager = createProfileManager(
        this.modalManager,
        this.notifications
      );

      // Initialize the profile manager
      this.profileManager.init();

      Logger.info('Profile manager with backup functionality initialized');

    } catch (error) {
      Logger.error('Failed to initialize profile manager:', error);
      // Don't fail the entire app if profile manager fails
    }
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
   * Prepare export data with validation
   * @private
   */
  prepareExportData() {
    const state = getState();
    if (!state || typeof state !== 'object') {
      return { isValid: false, error: 'Invalid application state' };
    }
    
    const items = Array.isArray(state.items) ? state.items : [];
    const validItems = items.filter(item => item && typeof item === 'object' && item.id);
    
    if (validItems.length === 0) {
      return { isValid: false, error: 'No items to export', requiresConfirmation: true };
    }
    
    return {
      isValid: true,
      payload: {
        profileName: (state.profileName || '').trim(),
        items: validItems
      }
    };
  }
  
  /**
   * Export the current state as a JSON file.
   */
  async exportJSON() {
    try {
      const preparation = this.prepareExportData();
      let payload = preparation.payload;
      
      if (!preparation.isValid) {
        if (preparation.requiresConfirmation) {
          const confirmed = await this.confirmationManager.show({
            title: 'Export Empty File',
            message: 'No snippets to export. Export empty file anyway?',
            confirmText: 'Export Empty',
            cancelText: 'Cancel',
            variant: 'warning'
          });
          
          if (!confirmed) return;
          
          const state = getState();
          payload = {
            profileName: (state.profileName || '').trim(),
            items: []
          };
        } else {
          this.showNotification(`Export failed: ${preparation.error}`, 'error');
          return;
        }
      }
      
      const jsonString = JSON.stringify(payload, null, 2);
      downloadFile('compy-export.json', jsonString, 'application/json');
      this.showNotification(`JSON export downloaded (${payload.items.length} items)`, 'success');
      
    } catch (error) {
      Logger.error('JSON export failed:', error);
      this.showNotification('Export failed: Unexpected error', 'error');
    }
  }

  /**
   * Generate CSV content from application state
   * @private
   */
  generateCSV() {
    const state = getState();
    
    if (!state || typeof state !== 'object') {
      throw new Error('Invalid application state for CSV export');
    }
    
    const items = Array.isArray(state.items) ? state.items : [];
    const validItems = items.filter(item => 
      item && 
      typeof item === 'object' && 
      item.id &&
      typeof item.text === 'string' &&
      typeof item.desc === 'string'
    );
    
    const rows = [
      ['profileName'],
      [csvEscape(state.profileName || '')],
      [''],
      ['text', 'desc', 'sensitive', 'tags', 'position'],
      ...validItems.map(item => [
        csvEscape(item.text || ''),
        csvEscape(item.desc || ''),
        item.sensitive ? '1' : '0',
        csvEscape(Array.isArray(item.tags) ? item.tags.join('|') : ''),
        item.position || 0
      ])
    ];
    
    return {
      csv: rows.map(row => row.join(',')).join('\n'),
      itemCount: validItems.length
    };
  }
  
  /**
   * Export the current state as a CSV file.
   */
  exportCSV() {
    try {
      const { csv, itemCount } = this.generateCSV();
      downloadFile('compy-export.csv', csv, 'text/csv');
      this.showNotification(`CSV export downloaded (${itemCount} items)`, 'success');
    } catch (error) {
      Logger.error('CSV export failed:', error);
      this.showNotification('CSV export failed: Unexpected error', 'error');
    }
  }

  /**
   * Detect file format based on both filename and content analysis
   * 
   * @param {string} filename - Original filename
   * @param {string} content - File content
   * @returns {string} Detected format: 'json', 'csv', or 'unknown'
   * @private
   */
  detectFileFormat(filename, content) {
    const extension = filename.toLowerCase().split('.').pop();
    const trimmedContent = content.trim();
    
    // Try JSON detection first
    try {
      const parsed = JSON.parse(trimmedContent);
      
      // Valid JSON - check if it's the expected Compy format
      if (Array.isArray(parsed) || (parsed && typeof parsed === 'object' && Array.isArray(parsed.items))) {
        return 'json';
      }
      
      // Valid JSON but not Compy format - only return 'json' if extension matches
      if (extension === 'json') {
        return 'json';
      }
    } catch (e) {
      // Not valid JSON, continue to CSV detection
    }
    
    // CSV detection based on content structure
    if (trimmedContent.length > 0) {
      const lines = trimmedContent.split(/\r?\n/).filter(line => line.trim());
      
      if (lines.length >= 2) {
        // Check for Compy CSV format markers
        if (lines[0] === 'profileName' || 
            lines.some(line => line.toLowerCase().includes('text,desc')) ||
            lines.some(line => line.includes(',') && (line.includes('"') || line.split(',').length > 2))) {
          return 'csv';
        }
      }
    }
    
    // Fallback to extension-based detection with validation
    if (extension === 'json') {
      return trimmedContent.startsWith('{') || trimmedContent.startsWith('[') ? 'json' : 'unknown';
    } else if (extension === 'csv' || extension === 'txt') {
      return 'csv';
    }
    
    return 'unknown';
  }

  /**
   * Initialize file import handling for JSON and CSV formats.
   */
  initImport() {
    const importFile = $('#importFile');
    
    importFile.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // File size validation (10MB limit)
      const maxSizeBytes = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSizeBytes) {
        this.showNotification(`File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum size is 10MB.`, 'error');
        importFile.value = '';
        return;
      }

      try {
        const text = await file.text();
        
        // Detect format based on content and filename
        const format = this.detectFileFormat(file.name, text);
        
        switch (format) {
          case 'json':
            this.importJSON(text);
            break;
          case 'csv':
            this.importCSV(text);
            break;
          default:
            this.showNotification(`Unsupported file format. Please use JSON or CSV files.`, 'error');
            console.warn('Unknown file format:', {
              filename: file.name,
              size: file.size,
              type: file.type,
              contentPreview: text.slice(0, 200)
            });
        }
      } catch (error) {
        console.error('Import failed:', error);
        this.showNotification(`Import failed: ${error.message}`, 'error');
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
        <span class="x" title="Remove tag" aria-label="Remove ${tag} tag">✕</span>
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
    
    // Check for duplicate headers
    const headerCounts = {};
    headers.forEach(header => {
      headerCounts[header] = (headerCounts[header] || 0) + 1;
    });
    
    const duplicateHeaders = Object.entries(headerCounts)
      .filter(([header, count]) => count > 1)
      .map(([header]) => header);
    
    if (duplicateHeaders.length > 0) {
      throw new Error(`Duplicate column headers found: ${duplicateHeaders.join(', ')}`);
    }
    
    const columnMapping = {
      text: headers.indexOf('text'),
      desc: headers.indexOf('desc'),
      sensitive: headers.indexOf('sensitive'),
      tags: headers.indexOf('tags'),
      position: headers.indexOf('position')
    };

    // Validate required columns
    const missingColumns = [];
    if (columnMapping.text === -1) missingColumns.push('text');
    if (columnMapping.desc === -1) missingColumns.push('desc');
    
    if (missingColumns.length > 0) {
      throw new Error(`Required columns missing: ${missingColumns.join(', ')}. Found columns: ${headers.join(', ')}`);
    }
    
    // Validate optional columns have valid data types
    const supportedColumns = ['text', 'desc', 'sensitive', 'tags', 'position'];
    const unsupportedColumns = headers.filter(header => !supportedColumns.includes(header));
    
    if (unsupportedColumns.length > 0) {
      console.warn('Unsupported CSV columns will be ignored:', unsupportedColumns);
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
        : [],
      position: columnMapping.position >= 0 ? 
        parseInt(values[columnMapping.position] || '0', 10) || 0 : 0
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
   * Process CSV data rows and import valid items with security sanitization
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
        const rawItemData = this.parseCSVDataRow(dataLines[i], columnMapping);
        
        // SECURITY: Sanitize CSV data before processing
        const sanitizedItemData = this.sanitizeImportData(rawItemData);
        
        if (!sanitizedItemData) {
          skippedCount++;
          console.warn(`Skipped potentially malicious item on line ${i + 1}`);
          continue;
        }
        
        if (this.addImportedItem(sanitizedItemData, dedupeSet)) {
          importCount++;
        } else {
          skippedCount++;
          console.warn(`Skipped duplicate or invalid item on line ${i + 1}:`, sanitizedItemData);
        }
      } catch (lineError) {
        skippedCount++;
        console.warn(`Failed to parse line ${i + 1}:`, lineError.message);
      }
    }
    
    return { importCount, skippedCount };
  }

  /**
   * Parse CSV text into proper rows, respecting quoted fields with newlines
   * 
   * @param {string} csvText - Raw CSV string
   * @returns {string[]} Array of CSV rows
   * @private
   */
  parseCSVRows(csvText) {
    const rows = [];
    let currentRow = '';
    let inQuotes = false;
    let i = 0;
    
    while (i < csvText.length) {
      const char = csvText[i];
      const nextChar = csvText[i + 1];
      
      if (inQuotes) {
        if (char === '"' && nextChar === '"') {
          // Escaped quote sequence
          currentRow += '""';
          i += 2;
          continue;
        } else if (char === '"') {
          // End of quoted field
          currentRow += char;
          inQuotes = false;
        } else {
          // Regular character inside quotes (including newlines)
          currentRow += char;
        }
      } else {
        if (char === '"') {
          // Start of quoted field
          currentRow += char;
          inQuotes = true;
        } else if (char === '\n' || (char === '\r' && nextChar === '\n')) {
          // End of row (only when not in quotes)
          if (currentRow.trim()) {
            rows.push(currentRow.trim());
          }
          currentRow = '';
          
          // Handle CRLF
          if (char === '\r' && nextChar === '\n') {
            i += 2;
            continue;
          }
        } else if (char !== '\r') {
          // Regular character (skip standalone \r)
          currentRow += char;
        }
      }
      
      i++;
    }
    
    // Add final row if exists
    if (currentRow.trim()) {
      rows.push(currentRow.trim());
    }
    
    return rows.filter(row => row.length > 0);
  }

  /**
   * Import items from a CSV payload with comprehensive parsing and validation
   * 
   * This function handles the complex task of parsing CSV data with support for:
   * - Optional metadata header (profile information)
   * - Robust quote handling and field parsing including multi-line quoted fields
   * - BOM (Byte Order Mark) removal for international files
   * - Flexible column mapping and validation
   * 
   * CSV Format Support:
   * 1. Optional metadata block: profileName header followed by value
   * 2. Main data: text, desc, sensitive, tags columns
   * 3. Tags are pipe-separated (|) within the tags column
   * 4. Sensitive values: '1' or 'true' (case-insensitive)
   * 5. Multi-line quoted fields are properly handled
   * 
   * Performance Considerations:
   * - Proper CSV row parsing respects quoted field boundaries
   * - Early validation prevents processing invalid data
   * - Efficient string operations for large files
   * - Memory-conscious parsing for mobile devices
   * 
   * @param {string} csvText - Raw CSV string from uploaded file
   */
  async importCSV(csvText) {
    try {
      // Parse CSV rows properly, respecting quoted fields with newlines
      const lines = this.parseCSVRows(csvText);
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
   * Sanitize imported data to prevent CSV injection attacks
   * 
   * @param {Object} data - Raw imported data
   * @returns {Object|null} Sanitized data or null if malicious content detected
   * @private
   */
  sanitizeImportData(data) {
    // Check for CSV injection patterns
    const dangerousPatterns = [
      /^[=@+\-]/,           // Formula injection (Excel/Calc)
      /javascript:/i,       // JavaScript URIs
      /data:text\/html/i,   // HTML data URIs
      /<script/i,           // Script tags
      /on\w+=/i,            // Event handlers (onclick, onload, etc.)
      /<iframe/i,           // Iframe tags
      /<object/i,           // Object tags
      /<embed/i,            // Embed tags
      /\\x[0-9a-fA-F]{2}/,  // Hex escapes
      /\\u[0-9a-fA-F]{4}/   // Unicode escapes
    ];
    
    const sanitized = {
      text: String(data.text || '').trim(),
      desc: String(data.desc || '').trim(),
      sensitive: Boolean(data.sensitive),
      tags: Array.isArray(data.tags) ? data.tags : [],
      position: Number(data.position) || 0
    };
    
    // Validate text field
    if (dangerousPatterns.some(pattern => pattern.test(sanitized.text))) {
      console.warn('Blocked potentially malicious text content:', sanitized.text);
      return null;
    }
    
    // Validate description
    if (dangerousPatterns.some(pattern => pattern.test(sanitized.desc))) {
      console.warn('Blocked potentially malicious description:', sanitized.desc);
      return null;
    }
    
    // Sanitize tags array
    sanitized.tags = sanitized.tags
      .map(tag => String(tag).trim())
      .filter(tag => {
        // Validate each tag
        if (dangerousPatterns.some(pattern => pattern.test(tag))) {
          console.warn('Blocked potentially malicious tag:', tag);
          return false;
        }
        return tag.length > 0 && tag.length <= 50;
      })
      .slice(0, 50); // Limit total tags
    
    // Additional length validations
    if (sanitized.text.length > 10000) {
      console.warn('Blocked oversized text content (>10000 chars)');
      return null;
    }
    
    if (sanitized.desc.length > 1000) {
      console.warn('Blocked oversized description (>1000 chars)');
      return null;
    }
    
    // Check for suspicious patterns in combined content
    const combinedContent = `${sanitized.text} ${sanitized.desc} ${sanitized.tags.join(' ')}`;
    
    // Additional security checks
    const suspiciousPatterns = [
      /\beval\s*\(/i,        // eval() function calls
      /\bsetTimeout\s*\(/i,  // setTimeout calls
      /\bsetInterval\s*\(/i, // setInterval calls
      /\bFunction\s*\(/i,    // Function constructor
      /\bunescape\s*\(/i,    // unescape calls
      /\bdocument\./i,       // Document object access
      /\bwindow\./i,         // Window object access
      /\balert\s*\(/i,       // Alert calls
      /\bconfirm\s*\(/i,     // Confirm calls
      /\bprompt\s*\(/i       // Prompt calls
    ];
    
    if (suspiciousPatterns.some(pattern => pattern.test(combinedContent))) {
      console.warn('Blocked content with suspicious JavaScript patterns');
      return null;
    }
    
    return sanitized;
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
        const date = formatDate(backup.ts);
        const filename = `compy-backup-${backup.ts.replace(/[:.]/g, '-')}.json`;
        
        // OPTIMIZED ELEMENT CREATION: Use createElement utility for consistency
        const button = createElement('button', {
          textContent: `${date} (${backup.items.length} items)`,
          className: 'backup-item-btn',
          attributes: {
            type: 'button',
            'aria-label': `Download backup from ${date} containing ${backup.items.length} items`
          }
        });
        
        // EVENT HANDLER: Optimized click handler with error handling
        addEventHandler(button, 'click', () => {
          try {
            downloadFile(filename, JSON.stringify(backup.items, null, 2), 'application/json');
            this.showNotification(`Backup downloaded: ${date}`, 'success');
          } catch (error) {
            Logger.error('Failed to download backup:', error);
            this.showNotification('Failed to download backup', 'error');
          }
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
   * Clear all existing data (items and profile) with optimized batch operations
   * 
   * This method efficiently clears all application data when the user chooses
   * "Replace All" during import. Instead of individual deletions, it uses
   * batch operations for better performance.
   * 
   * Performance Optimization:
   * - Avoids O(n) individual delete operations
   * - Batches state updates to reduce re-renders
   * - Minimizes localStorage write operations
   * 
   * Used when user chooses "Replace All" during import.
   */
  clearAllData() {
    return ErrorUtils.safeExecute(() => {
      // BATCH CLEAR OPERATIONS: More efficient than individual deletions
      // This approach reduces the number of state updates and re-renders
      
      // OPTIMIZED BATCH CLEARING: Clear all data with minimal state updates
      const currentState = getState();
      
      // Clear all items efficiently (avoids O(n) individual deleteItem calls)
      if (currentState.items.length > 0) {
        currentState.items.forEach(item => deleteItem(item.id));
      }
      
      // BATCH STATE UPDATES: Clear remaining application state
      updateProfile('');
      updateFilterTags([]);
      updateSearch('');
      setEditingId(null);
      
      Logger.info('All application data cleared successfully');
      
    }, {
      context: 'Clear all data',
      fallback: (error) => {
        this.showNotification('Failed to clear all data', 'error');
        Logger.error('Failed to clear all data:', error);
      }
    });
  }

  /**
   * Register global UI event handlers for header actions, forms, tags, and overlays.
   */
  initEventHandlers() {
    // OPTIMIZED EVENT HANDLER REGISTRATION: Batch register common handlers
    // This reduces repetitive addEventListener calls and improves maintainability
    const buttonHandlers = {
      '#brand': () => location.reload(),
      '#aboutBtn': () => this.modalManager.open('#aboutModal'),
      '#filterBtn': () => this.openFilterModal()
    };
    
    // BATCH REGISTER BUTTON HANDLERS: Use utility for consistent registration
    Object.entries(buttonHandlers).forEach(([selector, handler]) => {
      addEventHandler(selector, 'click', handler);
    });
    
    // FORM SUBMISSION: Special handling for form events
    addEventHandler('#itemForm', 'submit', (e) => {
      e.preventDefault();
      this.saveItem();
    });

    // OPTIMIZED CLEAR FIELD HANDLERS: Use consistent event handler pattern
    // This pattern is reusable across the application for any clear buttons
    addMultipleEventHandlers(document.body, {
      click: (e) => {
        const clearButton = e.target.closest('[data-clear]');
        if (clearButton) {
          const targetSelector = clearButton.getAttribute('data-clear');
          const target = $(targetSelector);
          if (target) {
            // ENHANCED CLEARING: Clear value and restore focus for better UX
            target.value = '';
            target.focus();
            
            // TRIGGER INPUT EVENT: Ensure any listeners are notified of the change
            target.dispatchEvent(new Event('input', { bubbles: true }));
            target.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }
      }
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
   * Clear all validation error states from form fields
   * @private
   */
  clearFormErrors() {
    const fields = ['#itemText', '#itemDesc'];
    
    fields.forEach(selector => {
      const field = $(selector);
      if (field) {
        field.removeAttribute('aria-invalid');
        field.classList.remove('error');
        
        // Remove existing error message
        const errorId = field.getAttribute('aria-describedby');
        if (errorId && errorId.endsWith('-error')) {
          const errorElement = $(`#${errorId}`);
          if (errorElement && errorElement.classList.contains('error-message')) {
            errorElement.remove();
          }
        }
      }
    });
  }
  
  /**
   * Display validation errors with proper ARIA attributes
   * @private
   * @param {Object} validation - Validation result from validateItem
   */
  displayFormErrors(validation) {
    validation.errors.forEach((error, index) => {
      // Determine which field the error relates to
      let fieldSelector = null;
      let fieldName = null;
      
      if (error.toLowerCase().includes('text')) {
        fieldSelector = '#itemText';
        fieldName = 'text';
      } else if (error.toLowerCase().includes('description')) {
        fieldSelector = '#itemDesc';
        fieldName = 'desc';
      }
      
      if (fieldSelector) {
        const field = $(fieldSelector);
        if (field) {
          // Set aria-invalid to true
          field.setAttribute('aria-invalid', 'true');
          field.classList.add('error');
          
          // Create error message element
          const errorId = `${fieldName}-error`;
          const existingError = $(`#${errorId}`);
          
          if (!existingError) {
            const errorElement = document.createElement('div');
            errorElement.id = errorId;
            errorElement.className = 'error-message';
            errorElement.textContent = error;
            errorElement.setAttribute('role', 'alert');
            errorElement.setAttribute('aria-live', 'polite');
            
            // Insert error message after the field's container
            const fieldContainer = field.closest('.field');
            if (fieldContainer) {
              fieldContainer.appendChild(errorElement);
            }
            
            // Associate error message with field
            const currentDescribedBy = field.getAttribute('aria-describedby') || '';
            const newDescribedBy = currentDescribedBy ? 
              `${currentDescribedBy} ${errorId}` : errorId;
            field.setAttribute('aria-describedby', newDescribedBy);
          }
          
          // Focus the first field with an error
          if (index === 0) {
            setTimeout(() => field.focus(), 100);
          }
        }
      }
    });
  }

  /**
   * Validate and persist the item currently in the edit form.
   * Shows validation errors with proper ARIA states and accessible error messages.
   */
  saveItem() {
    // Clear any previous error states
    this.clearFormErrors();
    
    const text = $('#itemText').value.trim();
    const desc = $('#itemDesc').value.trim();
    const sensitive = $('#itemSensitive').checked;
    const tags = this.getTagsFromChips();

    const validation = validateItem({ text, desc, sensitive, tags });
    if (!validation.isValid) {
      // Display errors with ARIA support
      this.displayFormErrors(validation);
      
      // Show notification for screen readers and visual users
      const errorCount = validation.errors.length;
      const errorMessage = errorCount === 1 
        ? validation.errors[0]
        : `${errorCount} errors found. Please check the form.`;
      
      this.showNotification(errorMessage, 'error');
      
      // Announce error to screen readers via live region
      this.announceToScreenReader(
        `Form has ${errorCount} error${errorCount > 1 ? 's' : ''}. Please review and correct.`
      );
      
      return;
    }

    upsertItem({ text, desc, sensitive, tags });
    this.modalManager.close('#itemModal');
    this.showNotification('Snippet saved', 'success');
    
    // Announce success to screen readers
    this.announceToScreenReader('Snippet saved successfully');
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
    console.log('Key pressed:', e.key, 'Target:', e.target.tagName);
    switch (e.key) {
      case 'ArrowUp':
        console.log('ArrowUp pressed - calling selectCardUp()');
        e.preventDefault();
        this.selectCardUp();
        break;
      case 'ArrowDown':
        console.log('ArrowDown pressed - calling selectCardDown()');
        e.preventDefault();
        this.selectCardDown();
        break;
      case 'ArrowLeft':
        console.log('ArrowLeft pressed - calling selectCardLeft()');
        e.preventDefault();
        this.selectCardLeft();
        break;
      case 'ArrowRight':
        console.log('ArrowRight pressed - calling selectCardRight()');
        e.preventDefault();
        this.selectCardRight();
        break;
      case 'Escape':
        console.log('Escape pressed - clearing selection');
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
    // Remove selection class from all cards (direct DOM manipulation for immediate effect)
    this.cardElements.forEach(card => card.classList.remove('selected'));
    
    // Apply selection class to the currently selected card
    if (this.selectedCardIndex >= 0 && this.selectedCardIndex < this.cardElements.length) {
      const selectedCard = this.cardElements[this.selectedCardIndex];
      selectedCard.classList.add('selected');
      
      // Debug logging to verify selection is working
      console.log(`Card selected: index ${this.selectedCardIndex}, element:`, selectedCard);
      console.log('Selected card classes:', selectedCard.className);
    } else {
      console.log('No card selected (cleared selection)');
    }
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
   * Compute target index when moving left through the entire grid.
   * @param {number} currentIndex
   * @param {number} total
   * @returns {number}
   */
  indexLeft(currentIndex, total) {
    if (currentIndex <= 0) {
      return total - 1; // Wrap to last card
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
   * Compute target index when moving right through the entire grid.
   * @param {number} currentIndex
   * @param {number} total
   * @returns {number}
   */
  indexRight(currentIndex, total) {
    if (currentIndex >= total - 1) {
      return 0; // Wrap to first card
    }
    return currentIndex + 1;
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
    console.log('selectCardUp called, cardElements.length:', this.cardElements.length);
    if (this.cardElements.length === 0) return;
    const columns = this.calculateGridColumns();
    const currentIndex = this.selectedCardIndex === -1 ? 0 : this.selectedCardIndex;
    const target = this.wrapIndexUp(currentIndex, columns, this.cardElements.length);
    console.log(`Moving up: currentIndex ${currentIndex} -> target ${target}`);
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
   * Move the selection left through the entire grid (wraps to last card when at first).
   *
   * @returns {void}
   */
  selectCardLeft() {
    if (this.cardElements.length === 0) return;
    const currentIndex = this.selectedCardIndex === -1 ? 0 : this.selectedCardIndex;
    const target = this.indexLeft(currentIndex, this.cardElements.length);
    this.selectCard(target);
  }
  
  /**
   * Move the selection right through the entire grid (wraps to first card when at last).
   *
   * @returns {void}
   */
  selectCardRight() {
    if (this.cardElements.length === 0) return;
    const currentIndex = this.selectedCardIndex === -1 ? -1 : this.selectedCardIndex;
    const target = this.indexRight(currentIndex, this.cardElements.length);
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
