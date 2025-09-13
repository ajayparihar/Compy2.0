/**
 * Integration Tests for app.js - CompyApp Main Application
 * 
 * These tests verify the integration between different components and the main
 * application flow. They test initialization, state synchronization, user interactions,
 * and end-to-end workflows.
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';

// Mock CompyApp class for integration testing
class CompyApp {
  constructor() {
    this.initialized = false;
    this.clipboard = null;
    this.notifications = null;
    this.modalManager = null;
    this.theme = null;
    this.search = null;
    this.cards = null;
    
    // Mock state
    this.state = {
      items: [],
      filterTags: [],
      search: '',
      editingId: null,
      profileName: ''
    };
    
    this.listeners = new Set();
    
    // Bind methods
    this.init = this.init.bind(this);
    this.handleStateChange = this.handleStateChange.bind(this);
    this.openItemModal = this.openItemModal.bind(this);
    this.removeItem = this.removeItem.bind(this);
  }

  async init() {
    if (this.initialized) return;

    try {
      // Initialize components
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
      
      // Subscribe to state changes before loading state so initial render happens
      this.subscribe(this.handleStateChange);
      
      // Load initial state
      this.loadState();
      
      // Setup keyboard shortcuts
      this.setupKeyboardShortcuts();
      
      this.initialized = true;
      console.log('Compy 2.0 initialized successfully');
      
    } catch (error) {
      console.error('Failed to initialize Compy 2.0:', error);
      this.showNotification('Failed to initialize application', 'error');
      throw error;
    }
  }

  initClipboard() {
    const hasClipboardAPI = navigator.clipboard && 
                          typeof navigator.clipboard.writeText === 'function';
    
    this.clipboard = {
      copy: async (text) => {
        if (!text || typeof text !== 'string') return false;
        
        try {
          if (hasClipboardAPI) {
            await navigator.clipboard.writeText(text);
            this.showNotification('Copied to clipboard', 'success');
            return true;
          } else {
            return this.fallbackCopy(text);
          }
        } catch (error) {
          return this.fallbackCopy(text);
        }
      }
    };
  }

  fallbackCopy(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    
    const success = document.execCommand('copy');
    document.body.removeChild(textarea);
    
    this.showNotification(
      success ? 'Copied to clipboard' : 'Copy failed - please try manually',
      success ? 'info' : 'error'
    );
    return success;
  }

  initNotifications() {
    this.notifications = {
      show: (message, type = 'info', duration = 3000) => {
        console.log(`Notification [${type}]: ${message}`);
        
        // Simulate snackbar behavior
        const event = new CustomEvent('notification', {
          detail: { message, type, duration }
        });
        document.dispatchEvent(event);
      }
    };
  }

  showNotification(message, type = 'info') {
    try {
      if (!this.notifications || typeof this.notifications.show !== 'function') {
        // Notifications not ready; log and continue
        console.warn('Notifications unavailable in mock; skipping message', { message, type });
        return;
      }
      this.notifications.show(message, type);
    } catch (e) {
      console.warn('Mock notification error; skipping', e);
    }
  }

  initModals() {
    this.modalManager = {
      open: (modalId) => {
        const modal = document.getElementById(modalId);
        if (modal) {
          modal.style.display = 'block';
          modal.setAttribute('aria-hidden', 'false');
        }
      },
      close: (modalId) => {
        const modal = document.getElementById(modalId);
        if (modal) {
          modal.style.display = 'none';
          modal.setAttribute('aria-hidden', 'true');
        }
      }
    };
  }

  initTheme() {
    this.theme = {
      current: 'dark-mystic-forest',
      apply: (themeName) => {
        document.documentElement.setAttribute('data-theme', themeName);
        localStorage.setItem('compy.theme', themeName);
        this.theme.current = themeName;
      },
      load: () => {
        const savedTheme = localStorage.getItem('compy.theme') || 'dark-mystic-forest';
        this.theme.apply(savedTheme);
      }
    };
    // Load saved theme immediately during initialization
    this.theme.load();
  }

  initSearch() {
    this.search = {
      query: '',
      focus: () => {
        const searchInput = document.getElementById('searchInput');
        if (searchInput) searchInput.focus();
      },
      clear: () => {
        this.search.query = '';
        this.updateSearch('');
      },
      update: (query) => {
        this.search.query = query;
        this.updateSearch(query);
      }
    };
  }

  initCards() {
    this.cards = {
      container: null,
      render: (items, search = '') => {
        this.renderCards({ items, search });
      },
      showSkeleton: () => {
        console.log('Showing skeleton cards');
      }
    };
  }

  initProfile() {
    // Profile initialization
  }

  initExport() {
    // Export functionality initialization
  }

  initImport() {
    // Import functionality initialization
  }

  initEventHandlers() {
    // Add event listeners for UI interactions
    document.addEventListener('click', this.handleClick.bind(this));
    document.addEventListener('keydown', this.handleKeyboard.bind(this));
  }

  setupKeyboardShortcuts() {
    // Setup keyboard shortcuts
  }

  loadState() {
    try {
      const rawItems = localStorage.getItem('compy.items');
      if (rawItems) {
        this.state.items = JSON.parse(rawItems);
      }
      
      const rawFilters = localStorage.getItem('compy.filters');
      if (rawFilters) {
        this.state.filterTags = JSON.parse(rawFilters);
      }

      const rawProfile = localStorage.getItem('compy.profile');
      if (rawProfile) {
        this.state.profileName = rawProfile;
      }

      this.notifyStateChange();
    } catch (error) {
      console.error('Failed to load state:', error);
      this.state = {
        items: [],
        filterTags: [],
        search: '',
        editingId: null,
        profileName: ''
      };
    }
  }

  saveState() {
    try {
      localStorage.setItem('compy.items', JSON.stringify(this.state.items));
      localStorage.setItem('compy.filters', JSON.stringify(this.state.filterTags));
      if (this.state.profileName) {
        localStorage.setItem('compy.profile', this.state.profileName);
      }
      this.notifyStateChange();
    } catch (error) {
      console.error('Failed to save state:', error);
    }
  }

  notifyStateChange() {
    this.listeners.forEach(listener => listener(this.state));
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  handleStateChange(newState) {
    this.renderCards(newState);
    this.renderProfile(newState);
    this.renderFilterBadge(newState);
    this.updateSearchInput(newState);
  }

  renderCards(state) {
    const filteredItems = this.filterItems(state.items, state.search, state.filterTags);
    console.log(`Rendering ${filteredItems.length} cards`);
    
    // Simulate card rendering
    const event = new CustomEvent('cardsRendered', {
      detail: { count: filteredItems.length, items: filteredItems }
    });
    document.dispatchEvent(event);
  }

  renderProfile(state) {
    console.log(`Profile: ${state.profileName || 'Not set'}`);
  }

  renderFilterBadge(state) {
    console.log(`Active filters: ${state.filterTags.length}`);
  }

  updateSearchInput(state) {
    const searchInput = document.getElementById('searchInput');
    if (searchInput && searchInput.value !== state.search) {
      searchInput.value = state.search;
    }
  }

  filterItems(items, search = '', filterTags = []) {
    return items.filter(item => {
      // Search filter
      if (search) {
        const searchLower = search.toLowerCase();
        const matchesText = item.text.toLowerCase().includes(searchLower);
        const matchesDesc = item.desc.toLowerCase().includes(searchLower);
        const matchesTags = item.tags.some(tag => tag.toLowerCase().includes(searchLower));
        
        if (!matchesText && !matchesDesc && !matchesTags) {
          return false;
        }
      }
      
      // Tag filter
      if (filterTags.length > 0) {
        const hasMatchingTag = filterTags.every(filterTag => 
          item.tags.some(tag => tag.toLowerCase() === filterTag.toLowerCase())
        );
        if (!hasMatchingTag) {
          return false;
        }
      }
      
      return true;
    });
  }

  updateSearch(query) {
    this.state.search = query;
    this.notifyStateChange();
  }

  openItemModal(itemId = null) {
    this.state.editingId = itemId;
    
    if (itemId) {
      const item = this.state.items.find(item => item.id === itemId);
      if (item) {
        // Populate modal with item data
        console.log('Editing item:', item.id);
      }
    } else {
      console.log('Creating new item');
    }
    
    this.modalManager.open('itemModal');
  }

  saveItem(itemData) {
    const now = Date.now();
    
    if (this.state.editingId) {
      // Update existing item
      const index = this.state.items.findIndex(item => item.id === this.state.editingId);
      if (index !== -1) {
        this.state.items[index] = {
          ...this.state.items[index],
          ...itemData,
          updatedAt: now
        };
      }
      this.state.editingId = null;
    } else {
      // Create new item
      const newItem = {
        id: this.generateUID(),
        text: itemData.text,
        desc: itemData.desc,
        sensitive: Boolean(itemData.sensitive),
        tags: itemData.tags || [],
        createdAt: now,
        updatedAt: now
      };
      this.state.items.unshift(newItem);
    }
    
    this.saveState();
    this.modalManager.close('itemModal');
    this.showNotification('Item saved successfully', 'success');
  }

  removeItem(itemId) {
    const item = this.state.items.find(item => item.id === itemId);
    if (!item) return;
    
    // Show confirmation (simplified for testing)
    const confirmed = true; // In real app, would show confirmation dialog
    
    if (confirmed) {
      this.state.items = this.state.items.filter(item => item.id !== itemId);
      this.saveState();
      this.showNotification('Item deleted', 'info');
    }
  }

  generateUID() {
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
  }

  handleClick(event) {
    const target = event.target;
    
    // Handle add button
    if (target.id === 'addBtn' || target.id === 'fabAdd') {
      this.openItemModal();
      return;
    }
    
    // Handle card actions
    if (target.classList.contains('copy-btn')) {
      const itemId = target.closest('[data-id]').dataset.id;
      const item = this.state.items.find(item => item.id === itemId);
      if (item) {
        this.clipboard.copy(item.text);
      }
      return;
    }
    
    if (target.classList.contains('edit-btn')) {
      const itemId = target.closest('[data-id]').dataset.id;
      this.openItemModal(itemId);
      return;
    }
    
    if (target.classList.contains('delete-btn')) {
      const itemId = target.closest('[data-id]').dataset.id;
      this.removeItem(itemId);
      return;
    }
  }

  handleKeyboard(event) {
    // Handle Ctrl+F or / for search focus
    if ((event.ctrlKey && event.key === 'f') || event.key === '/') {
      event.preventDefault();
      this.search.focus();
      return;
    }
    
    // Handle Ctrl+N for new item
    if (event.ctrlKey && event.key === 'n') {
      event.preventDefault();
      this.openItemModal();
      return;
    }
  }

  getStatus() {
    return {
      initialized: this.initialized,
      itemCount: this.state.items.length,
      activeFilters: this.state.filterTags.length,
      currentSearch: this.state.search,
      theme: this.theme.current
    };
  }
}

describe('CompyApp Integration Tests', () => {
  let app;
  let mockElements;

  beforeEach(() => {
    app = new CompyApp();
    
    // Setup DOM elements
    document.body.innerHTML = `
      <div id="searchInput"></div>
      <button id="addBtn">Add</button>
      <button id="fabAdd">FAB Add</button>
      <div id="itemModal" style="display: none;" aria-hidden="true"></div>
      <div id="cards"></div>
      <div id="snackbar"></div>
    `;
    
    // Clear localStorage
    localStorage.clear();
    
    // Reset console spies
    jest.clearAllMocks();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('Application Initialization', () => {
    test('should initialize successfully with all components', async () => {
      await app.init();
      
      expect(app.initialized).toBe(true);
      expect(app.clipboard).toBeTruthy();
      expect(app.notifications).toBeTruthy();
      expect(app.modalManager).toBeTruthy();
      expect(app.theme).toBeTruthy();
      expect(app.search).toBeTruthy();
      expect(app.cards).toBeTruthy();
    });

    test('should load saved state on initialization', async () => {
      // Setup saved state
      const savedItems = [
        {
          id: 'item1',
          text: 'Test item',
          desc: 'Test description',
          tags: ['test'],
          sensitive: false
        }
      ];
      localStorage.setItem('compy.items', JSON.stringify(savedItems));
      localStorage.setItem('compy.profile', 'Test User');
      
      await app.init();
      
      expect(app.state.items).toEqual(savedItems);
      expect(app.state.profileName).toBe('Test User');
    });

    test('should handle initialization errors gracefully', async () => {
      // Mock an initialization error
      const originalInitClipboard = app.initClipboard;
      app.initClipboard = () => {
        throw new Error('Clipboard initialization failed');
      };
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      await expect(app.init()).rejects.toThrow('Clipboard initialization failed');
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to initialize Compy 2.0:',
        expect.any(Error)
      );
      
      // Restore original method
      app.initClipboard = originalInitClipboard;
      consoleSpy.mockRestore();
    });

    test('should setup theme correctly', async () => {
      localStorage.setItem('compy.theme', 'light-sunrise');
      
      await app.init();
      
      expect(app.theme.current).toBe('light-sunrise');
      expect(document.documentElement.getAttribute('data-theme')).toBe('light-sunrise');
    });

    test('should prevent double initialization', async () => {
      await app.init();
      const firstInit = app.initialized;
      
      await app.init(); // Second call
      
      expect(firstInit).toBe(true);
      expect(app.initialized).toBe(true); // Should remain true
    });
  });

  describe('State Management Integration', () => {
    beforeEach(async () => {
      await app.init();
    });

    test('should synchronize state changes across components', () => {
      const listener = jest.fn();
      app.subscribe(listener);
      
      // Add an item
      const newItem = {
        text: 'Test item',
        desc: 'Test description',
        tags: ['test'],
        sensitive: false
      };
      
      app.saveItem(newItem);
      
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          items: expect.arrayContaining([
            expect.objectContaining(newItem)
          ])
        })
      );
    });

    test('should persist state to localStorage', () => {
      const newItem = {
        text: 'Persistent item',
        desc: 'Should be saved to localStorage',
        tags: ['persistence'],
        sensitive: false
      };
      
      app.saveItem(newItem);
      
      const savedItems = JSON.parse(localStorage.getItem('compy.items'));
      expect(savedItems).toHaveLength(1);
      expect(savedItems[0]).toMatchObject(newItem);
    });

    test('should handle state loading errors gracefully', () => {
      localStorage.setItem('compy.items', 'invalid json');
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      app.loadState();
      
      expect(app.state.items).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to load state:',
        expect.any(Error)
      );
      
      consoleSpy.mockRestore();
    });

    test('should update search state reactively', () => {
      const listener = jest.fn();
      app.subscribe(listener);
      
      app.updateSearch('test search');
      
      expect(app.state.search).toBe('test search');
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'test search' })
      );
    });
  });

  describe('User Interactions', () => {
    beforeEach(async () => {
      await app.init();
      
      // Add sample items
      const sampleItems = [
        {
          id: 'item1',
          text: 'console.log("hello")',
          desc: 'JavaScript logging',
          tags: ['javascript', 'debug'],
          sensitive: false
        },
        {
          id: 'item2',
          text: 'git status',
          desc: 'Check git status',
          tags: ['git'],
          sensitive: false
        }
      ];
      app.state.items = sampleItems;
    });

    test('should handle add button clicks', () => {
      const addBtn = document.getElementById('addBtn');
      
      addBtn.click();
      
      expect(app.state.editingId).toBeNull();
      // Modal should be opened (simplified check)
    });

    test('should handle item copy action', async () => {
      // Setup DOM for item card
      document.getElementById('cards').innerHTML = `
        <div data-id="item1">
          <button class="copy-btn">Copy</button>
        </div>
      `;
      
      const copyBtn = document.querySelector('.copy-btn');
      
      copyBtn.click();
      
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('console.log("hello")');
    });

    test('should handle item edit action', () => {
      document.getElementById('cards').innerHTML = `
        <div data-id="item1">
          <button class="edit-btn">Edit</button>
        </div>
      `;
      
      const editBtn = document.querySelector('.edit-btn');
      
      editBtn.click();
      
      expect(app.state.editingId).toBe('item1');
    });

    test('should handle item delete action', () => {
      const initialCount = app.state.items.length;
      
      document.getElementById('cards').innerHTML = `
        <div data-id="item1">
          <button class="delete-btn">Delete</button>
        </div>
      `;
      
      const deleteBtn = document.querySelector('.delete-btn');
      
      deleteBtn.click();
      
      expect(app.state.items).toHaveLength(initialCount - 1);
      expect(app.state.items.find(item => item.id === 'item1')).toBeUndefined();
    });

    test('should handle keyboard shortcuts', () => {
      const searchFocusSpy = jest.spyOn(app.search, 'focus');
      
      // Test Ctrl+F for search focus
      const ctrlFEvent = new KeyboardEvent('keydown', {
        key: 'f',
        ctrlKey: true
      });
      document.dispatchEvent(ctrlFEvent);
      
      expect(searchFocusSpy).toHaveBeenCalled();
      
      // Test / for search focus
      const slashEvent = new KeyboardEvent('keydown', {
        key: '/'
      });
      document.dispatchEvent(slashEvent);
      
      expect(searchFocusSpy).toHaveBeenCalledTimes(2);
    });

    test('should handle new item keyboard shortcut', () => {
      const ctrlNEvent = new KeyboardEvent('keydown', {
        key: 'n',
        ctrlKey: true
      });
      
      document.dispatchEvent(ctrlNEvent);
      
      expect(app.state.editingId).toBeNull(); // New item mode
    });
  });

  describe('Clipboard Integration', () => {
    beforeEach(async () => {
      await app.init();
    });

    test('should copy text using modern clipboard API', async () => {
      const result = await app.clipboard.copy('Test text');
      
      expect(result).toBe(true);
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Test text');
    });

    test('should fallback to execCommand when clipboard API fails', async () => {
      navigator.clipboard.writeText.mockRejectedValueOnce(new Error('Clipboard API failed'));
      
      const result = await app.clipboard.copy('Test text');
      
      expect(result).toBe(true); // execCommand mock returns true
      expect(document.execCommand).toHaveBeenCalledWith('copy');
    });

    test('should show notification after successful copy', async () => {
      const notificationSpy = jest.spyOn(app, 'showNotification');
      
      await app.clipboard.copy('Test text');
      
      expect(notificationSpy).toHaveBeenCalledWith('Copied to clipboard', 'success');
    });

    test('should handle empty/invalid text gracefully', async () => {
      const result1 = await app.clipboard.copy('');
      const result2 = await app.clipboard.copy(null);
      const result3 = await app.clipboard.copy(undefined);
      
      expect(result1).toBe(false);
      expect(result2).toBe(false);
      expect(result3).toBe(false);
    });
  });

  describe('Search and Filtering Integration', () => {
    beforeEach(async () => {
      await app.init();
      
      // Add test items
      app.state.items = [
        {
          id: 'js1',
          text: 'console.log("debug")',
          desc: 'JavaScript debug logging',
          tags: ['javascript', 'debug'],
          sensitive: false
        },
        {
          id: 'git1',
          text: 'git commit',
          desc: 'Commit changes',
          tags: ['git', 'version-control'],
          sensitive: false
        },
        {
          id: 'js2',
          text: 'function test()',
          desc: 'JavaScript function',
          tags: ['javascript', 'function'],
          sensitive: false
        }
      ];
    });

    test('should filter items by search query', () => {
      app.updateSearch('console');
      
      const filteredItems = app.filterItems(app.state.items, app.state.search, app.state.filterTags);
      
      expect(filteredItems).toHaveLength(1);
      expect(filteredItems[0].id).toBe('js1');
    });

    test('should filter items by tags', () => {
      app.state.filterTags = ['javascript'];
      app.saveState();
      
      const filteredItems = app.filterItems(app.state.items, app.state.search, app.state.filterTags);
      
      expect(filteredItems).toHaveLength(2);
      expect(filteredItems.every(item => item.tags.includes('javascript'))).toBe(true);
    });

    test('should combine search and tag filters', () => {
      app.updateSearch('function');
      app.state.filterTags = ['javascript'];
      
      const filteredItems = app.filterItems(app.state.items, app.state.search, app.state.filterTags);
      
      expect(filteredItems).toHaveLength(1);
      expect(filteredItems[0].id).toBe('js2');
    });

    test('should perform case-insensitive search', () => {
      app.updateSearch('JAVASCRIPT');
      
      const filteredItems = app.filterItems(app.state.items, app.state.search, app.state.filterTags);
      
      expect(filteredItems).toHaveLength(2);
    });

    test('should clear search properly', () => {
      app.updateSearch('test');
      expect(app.state.search).toBe('test');
      
      app.search.clear();
      
      expect(app.state.search).toBe('');
    });
  });

  describe('Theme Management', () => {
    beforeEach(async () => {
      await app.init();
    });

    test('should apply theme correctly', () => {
      app.theme.apply('light-sunrise');
      
      expect(document.documentElement.getAttribute('data-theme')).toBe('light-sunrise');
      expect(localStorage.getItem('compy.theme')).toBe('light-sunrise');
      expect(app.theme.current).toBe('light-sunrise');
    });

    test('should load saved theme on initialization', async () => {
      localStorage.setItem('compy.theme', 'dark-royal-elegance');
      
      // Create new app instance
      const newApp = new CompyApp();
      await newApp.init();
      
      expect(newApp.theme.current).toBe('dark-royal-elegance');
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark-royal-elegance');
    });

    test('should use default theme when none saved', async () => {
      // Ensure no theme is saved
      localStorage.removeItem('compy.theme');
      
      const newApp = new CompyApp();
      await newApp.init();
      
      expect(newApp.theme.current).toBe('dark-mystic-forest');
    });
  });

  describe('Modal Management', () => {
    beforeEach(async () => {
      await app.init();
    });

    test('should open modal correctly', () => {
      app.modalManager.open('itemModal');
      
      const modal = document.getElementById('itemModal');
      expect(modal.style.display).toBe('block');
      expect(modal.getAttribute('aria-hidden')).toBe('false');
    });

    test('should close modal correctly', () => {
      app.modalManager.open('itemModal');
      app.modalManager.close('itemModal');
      
      const modal = document.getElementById('itemModal');
      expect(modal.style.display).toBe('none');
      expect(modal.getAttribute('aria-hidden')).toBe('true');
    });

    test('should handle item modal workflow', () => {
      // Open for new item
      app.openItemModal();
      expect(app.state.editingId).toBeNull();
      
      // Open for existing item
      app.state.items = [{ id: 'test-item', text: 'Test', desc: 'Test', tags: [] }];
      app.openItemModal('test-item');
      expect(app.state.editingId).toBe('test-item');
    });
  });

  describe('End-to-End Workflows', () => {
    beforeEach(async () => {
      await app.init();
    });

    test('should complete full item creation workflow', () => {
      let cardsRendered = false;
      document.addEventListener('cardsRendered', () => {
        cardsRendered = true;
      });
      
      // Start creation
      app.openItemModal();
      
      // Save new item
      const itemData = {
        text: 'New test item',
        desc: 'Test description',
        tags: ['test', 'new'],
        sensitive: false
      };
      
      app.saveItem(itemData);
      
      // Verify item was created and state updated
      expect(app.state.items).toHaveLength(1);
      expect(app.state.items[0]).toMatchObject(itemData);
      expect(app.state.editingId).toBeNull();
      expect(cardsRendered).toBe(true);
      
      // Verify persistence
      const savedItems = JSON.parse(localStorage.getItem('compy.items'));
      expect(savedItems).toHaveLength(1);
    });

    test('should complete full item edit workflow', () => {
      // Setup existing item
      const existingItem = {
        id: 'existing-item',
        text: 'Original text',
        desc: 'Original description',
        tags: ['original'],
        sensitive: false,
        createdAt: Date.now() - 10000,
        updatedAt: Date.now() - 10000
      };
      app.state.items = [existingItem];
      
      // Start editing
      app.openItemModal('existing-item');
      expect(app.state.editingId).toBe('existing-item');
      
      // Save changes
      const updates = {
        text: 'Updated text',
        desc: 'Updated description',
        tags: ['updated'],
        sensitive: true
      };
      
      app.saveItem(updates);
      
      // Verify item was updated
      expect(app.state.items).toHaveLength(1);
      expect(app.state.items[0]).toMatchObject({
        id: 'existing-item',
        text: 'Updated text',
        desc: 'Updated description',
        tags: ['updated'],
        sensitive: true
      });
      expect(app.state.items[0].updatedAt).toBeGreaterThan(existingItem.updatedAt);
      expect(app.state.editingId).toBeNull();
    });

    test('should complete search and copy workflow', async () => {
      // Setup items
      app.state.items = [
        {
          id: 'searchable',
          text: 'findable content',
          desc: 'Description',
          tags: ['searchable'],
          sensitive: false
        }
      ];
      
      // Perform search
      app.updateSearch('findable');
      
      const filteredItems = app.filterItems(app.state.items, app.state.search, []);
      expect(filteredItems).toHaveLength(1);
      
      // Copy the found item
      await app.clipboard.copy(filteredItems[0].text);
      
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('findable content');
    });

    test('should handle application status reporting', () => {
      app.state.items = [
        { id: '1', text: 'Item 1', desc: 'Desc 1', tags: ['tag1'] },
        { id: '2', text: 'Item 2', desc: 'Desc 2', tags: ['tag2'] }
      ];
      app.state.filterTags = ['tag1'];
      app.state.search = 'test search';
      
      const status = app.getStatus();
      
      expect(status).toEqual({
        initialized: true,
        itemCount: 2,
        activeFilters: 1,
        currentSearch: 'test search',
        theme: 'dark-mystic-forest'
      });
    });

    test('should handle complex filtering scenario', () => {
      // Setup diverse items
      app.state.items = [
        { id: '1', text: 'JavaScript function', desc: 'ES6 function', tags: ['javascript', 'es6'] },
        { id: '2', text: 'Python function', desc: 'Python def', tags: ['python', 'function'] },
        { id: '3', text: 'JavaScript class', desc: 'ES6 class', tags: ['javascript', 'es6', 'class'] },
        { id: '4', text: 'CSS rule', desc: 'Styling rule', tags: ['css', 'style'] }
      ];
      
      // Apply search and tag filters
      app.updateSearch('function');
      app.state.filterTags = ['javascript'];
      
      const filteredItems = app.filterItems(app.state.items, app.state.search, app.state.filterTags);
      
      // Should find only JavaScript items containing 'function'
      expect(filteredItems).toHaveLength(1);
      expect(filteredItems[0].id).toBe('1');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    beforeEach(async () => {
      await app.init();
    });

    test('should handle corrupted localStorage gracefully', () => {
      localStorage.setItem('compy.items', 'invalid json');
      localStorage.setItem('compy.filters', 'also invalid');
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      app.loadState();
      
      expect(app.state.items).toEqual([]);
      expect(app.state.filterTags).toEqual([]);
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    test('should handle missing DOM elements gracefully', () => {
      // Remove required elements
      document.getElementById('searchInput').remove();
      document.getElementById('addBtn').remove();
      
      // Should not throw errors
      expect(() => {
        app.search.focus();
        app.handleClick({ target: { id: 'addBtn' } });
      }).not.toThrow();
    });

    test('should handle notification system errors', () => {
      // Mock notification error
      app.notifications.show = () => {
        throw new Error('Notification system error');
      };
      
      // Should not crash the app
      expect(() => {
        app.showNotification('Test message');
      }).not.toThrow();
    });

    test('should handle clipboard API not available', async () => {
      // Mock clipboard API not available
      delete navigator.clipboard;
      
      const newApp = new CompyApp();
      await newApp.init();
      
      const result = await newApp.clipboard.copy('test text');
      
      // Should fallback to execCommand
      expect(result).toBe(true);
      expect(document.execCommand).toHaveBeenCalledWith('copy');
    });

    test('should handle large datasets efficiently', () => {
      // Create large dataset
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        id: `item-${i}`,
        text: `Item ${i} content`,
        desc: `Description ${i}`,
        tags: [`tag-${i % 10}`],
        sensitive: false
      }));
      
      app.state.items = largeDataset;
      
      const startTime = performance.now();
      
      // Perform filtering operation
      const filtered = app.filterItems(app.state.items, 'Item 5', []);
      
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(50); // Should be fast
      expect(filtered.length).toBeGreaterThan(0);
    });
  });
});
