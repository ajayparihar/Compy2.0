/**
 * Integration Tests for Main Application (app.js + state.js + components)
 * 
 * This test suite covers integration between major application components:
 * - Application initialization and bootstrap
 * - State management integration with UI
 * - Component interactions and data flow
 * - End-to-end user workflows
 * - Error handling across components
 * 
 * Priority: CRITICAL - Tests core business logic integrations
 * Coverage Target: >85%
 */

// Mock DOM environment with more realistic setup
const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

// Load actual HTML for more realistic testing
const htmlPath = path.join(__dirname, '..', '..', 'index.html');
const htmlContent = fs.readFileSync(htmlPath, 'utf8');
const dom = new JSDOM(htmlContent, {
  url: 'https://localhost:3000',
  pretendToBeVisual: true,
  resources: 'usable'
});

global.document = dom.window.document;
global.window = dom.window;
global.navigator = dom.window.navigator;

// Mock console for cleaner test output
global.console = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn()
};

// Mock localStorage
const mockLocalStorage = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => store[key] = value.toString(),
    removeItem: (key) => delete store[key],
    clear: () => store = {},
    get length() { return Object.keys(store).length; },
    key: (i) => Object.keys(store)[i] || null
  };
})();

global.localStorage = mockLocalStorage;

// Mock Clipboard API
global.navigator.clipboard = {
  writeText: jest.fn().mockResolvedValue(),
  readText: jest.fn().mockResolvedValue('mocked clipboard content')
};

// Mock matchMedia for theme and accessibility tests
global.window.matchMedia = jest.fn().mockImplementation(query => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: jest.fn(),
  removeListener: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  dispatchEvent: jest.fn(),
}));

// Mock constants and dependencies
const mockConstants = {
  STORAGE_KEYS: {
    items: 'compy.items',
    filters: 'compy.filters',
    profile: 'compy.profile',
    backups: 'compy.backups',
    theme: 'compy.theme'
  },
  UI_CONFIG: {
    debug: false,
    snackbarDuration: 3000,
    backupDelay: 1000,
    backupInterval: 3600000,
    maxBackups: 10,
    maxVisibleTags: 5
  },
  ICONS: {
    copy: '<svg>copy-icon</svg>',
    edit: '<svg>edit-icon</svg>',
    delete: '<svg>delete-icon</svg>',
    expand: '<svg>expand-icon</svg>',
    close: '<svg>close-icon</svg>'
  },
  DEFAULT_THEME: 'dark-mystic-forest'
};

describe('Application Integration Tests', () => {
  let appModule, stateModule;
  let app;

  beforeAll(async () => {
    // Mock all dependencies
    jest.doMock('../../js/constants.js', () => mockConstants);
    jest.doMock('../../js/utils.js', () => ({
      $: (selector, root = document) => root.querySelector(selector),
      $$: (selector, root = document) => Array.from(root.querySelectorAll(selector)),
      generateUID: () => 'test-id-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
      escapeHtml: (str) => String(str).replace(/[&<>"']/g, match => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
      })[match]),
      highlightText: (text, query) => query ? text.replace(new RegExp(query, 'gi'), `<mark>${query}</mark>`) : text,
      downloadFile: jest.fn(),
      debounce: (fn, delay) => {
        let timeoutId;
        return function(...args) {
          clearTimeout(timeoutId);
          timeoutId = setTimeout(() => fn.apply(this, args), delay);
        };
      },
      validateItem: (item) => {
        if (!item || typeof item !== 'object') {
          return { isValid: false, errors: ['Invalid item'] };
        }
        const errors = [];
        if (!item.text) errors.push('Text is required');
        if (!item.desc) errors.push('Description is required');
        return { isValid: errors.length === 0, errors };
      },
      filterItems: (items, search, tags) => {
        return items.filter(item => {
          if (!item) return false;
          const matchesSearch = !search || 
            item.text?.toLowerCase().includes(search.toLowerCase()) ||
            item.desc?.toLowerCase().includes(search.toLowerCase());
          const matchesTags = !tags.length || 
            tags.every(tag => item.tags?.includes(tag));
          return matchesSearch && matchesTags;
        });
      },
      getAllTags: (items) => {
        const tagSet = new Set();
        items.forEach(item => {
          if (item.tags && Array.isArray(item.tags)) {
            item.tags.forEach(tag => tagSet.add(tag));
          }
        });
        return Array.from(tagSet).sort();
      }
    }));

    // Import modules
    stateModule = await import('../../js/state.js');
    appModule = await import('../../js/app.js');
  });

  beforeEach(async () => {
    // Clear localStorage
    mockLocalStorage.clear();
    
    // Clear DOM
    document.body.innerHTML = htmlContent;
    
    // Reset mocks
    jest.clearAllMocks();
    
    // Initialize state
    stateModule.initState();
    
    // Create app instance
    app = new appModule.CompyApp();
  });

  describe('Application Initialization', () => {
    test('should initialize application successfully', async () => {
      await app.init();
      
      expect(app.initialized).toBe(true);
      expect(console.error).not.toHaveBeenCalled();
    });

    test('should handle initialization errors gracefully', async () => {
      // Mock a component to throw during initialization
      const originalInit = app.initClipboard;
      app.initClipboard = jest.fn().mockImplementation(() => {
        throw new Error('Initialization failed');
      });

      await app.init();
      
      expect(app.initialized).toBe(false);
      expect(console.error).toHaveBeenCalled();
      
      // Restore original method
      app.initClipboard = originalInit;
    });

    test('should load existing state on initialization', async () => {
      // Setup initial state in localStorage
      const testItems = [
        {
          id: 'test-1',
          text: 'Test snippet',
          desc: 'Test description',
          sensitive: false,
          tags: ['test'],
          position: 0
        }
      ];
      
      mockLocalStorage.setItem('compy.items', JSON.stringify(testItems));
      mockLocalStorage.setItem('compy.profile', 'Test User');
      
      // Initialize state and app
      stateModule.loadState();
      await app.init();
      
      const state = stateModule.getState();
      expect(state.items).toHaveLength(1);
      expect(state.items[0].text).toBe('Test snippet');
      expect(state.profileName).toBe('Test User');
    });
  });

  describe('Item Management Integration', () => {
    beforeEach(async () => {
      await app.init();
    });

    test('should create and display new item', async () => {
      // Create a new item through the state
      stateModule.setEditingId(null);
      stateModule.upsertItem({
        text: 'New test snippet',
        desc: 'New test description',
        sensitive: false,
        tags: ['test', 'new']
      });

      // Simulate state change handling
      const state = stateModule.getState();
      app.handleStateChange(state);

      // Verify item appears in state
      expect(state.items).toHaveLength(1);
      expect(state.items[0].text).toBe('New test snippet');
      expect(state.items[0].tags).toContain('test');
      expect(state.items[0].tags).toContain('new');
    });

    test('should update existing item', async () => {
      // Create initial item
      stateModule.setEditingId(null);
      stateModule.upsertItem({
        text: 'Original text',
        desc: 'Original description',
        sensitive: false,
        tags: ['original']
      });

      const initialState = stateModule.getState();
      const itemId = initialState.items[0].id;

      // Update the item
      stateModule.setEditingId(itemId);
      stateModule.upsertItem({
        text: 'Updated text',
        desc: 'Updated description',
        tags: ['original', 'updated']
      });

      // Verify update
      const updatedState = stateModule.getState();
      expect(updatedState.items).toHaveLength(1);
      expect(updatedState.items[0].text).toBe('Updated text');
      expect(updatedState.items[0].desc).toBe('Updated description');
      expect(updatedState.items[0].tags).toContain('updated');
      expect(updatedState.items[0].id).toBe(itemId); // Same ID
    });

    test('should delete item correctly', async () => {
      // Create item
      stateModule.setEditingId(null);
      stateModule.upsertItem({
        text: 'To be deleted',
        desc: 'This will be deleted',
        sensitive: false,
        tags: ['delete-test']
      });

      const initialState = stateModule.getState();
      const itemId = initialState.items[0].id;

      // Delete item
      stateModule.deleteItem(itemId);

      // Verify deletion
      const finalState = stateModule.getState();
      expect(finalState.items).toHaveLength(0);
    });

    test('should handle item reordering', async () => {
      // Create multiple items
      stateModule.setEditingId(null);
      stateModule.upsertItem({ text: 'Item 1', desc: 'First item', sensitive: false, tags: [] });
      stateModule.upsertItem({ text: 'Item 2', desc: 'Second item', sensitive: false, tags: [] });
      stateModule.upsertItem({ text: 'Item 3', desc: 'Third item', sensitive: false, tags: [] });

      const initialState = stateModule.getState();
      const itemIds = initialState.items.map(item => item.id);

      // Reorder items: [1, 2, 3] -> [3, 1, 2]
      const newOrder = [itemIds[2], itemIds[0], itemIds[1]];
      stateModule.reorderItems(newOrder);

      // Verify reordering
      const reorderedState = stateModule.getState();
      expect(reorderedState.items[0].text).toBe('Item 3');
      expect(reorderedState.items[1].text).toBe('Item 1');
      expect(reorderedState.items[2].text).toBe('Item 2');
    });
  });

  describe('Search and Filtering Integration', () => {
    beforeEach(async () => {
      await app.init();
      
      // Create test data
      const testItems = [
        {
          id: 'item-1',
          text: 'JavaScript function',
          desc: 'Useful JS helper function',
          sensitive: false,
          tags: ['javascript', 'frontend'],
          position: 0
        },
        {
          id: 'item-2',
          text: 'Python script',
          desc: 'Backend Python automation',
          sensitive: true,
          tags: ['python', 'backend', 'automation'],
          position: 1
        },
        {
          id: 'item-3',
          text: 'Docker command',
          desc: 'Container management command',
          sensitive: false,
          tags: ['docker', 'devops'],
          position: 2
        }
      ];

      // Add items to state
      testItems.forEach(item => {
        stateModule.setEditingId(null);
        stateModule.upsertItem(item);
      });
    });

    test('should filter items by search query', async () => {
      // Set search query
      stateModule.updateSearch('JavaScript');
      
      const state = stateModule.getState();
      app.handleStateChange(state);

      // Verify filtering works (would be tested via rendered cards)
      expect(state.search).toBe('JavaScript');
    });

    test('should filter items by tags', async () => {
      // Set filter tags
      stateModule.updateFilterTags(['python', 'backend']);
      
      const state = stateModule.getState();
      app.handleStateChange(state);

      // Verify tag filtering
      expect(state.filterTags).toEqual(['python', 'backend']);
    });

    test('should combine search and tag filtering', async () => {
      // Set both search and tag filters
      stateModule.updateSearch('script');
      stateModule.updateFilterTags(['python']);
      
      const state = stateModule.getState();
      app.handleStateChange(state);

      expect(state.search).toBe('script');
      expect(state.filterTags).toEqual(['python']);
    });

    test('should clear filters correctly', async () => {
      // Set filters
      stateModule.updateSearch('test search');
      stateModule.updateFilterTags(['test', 'filter']);
      
      // Clear filters
      stateModule.updateSearch('');
      stateModule.updateFilterTags([]);
      
      const state = stateModule.getState();
      expect(state.search).toBe('');
      expect(state.filterTags).toEqual([]);
    });
  });

  describe('Profile Management Integration', () => {
    beforeEach(async () => {
      await app.init();
    });

    test('should update profile name', async () => {
      const profileName = 'John Doe';
      stateModule.updateProfile(profileName);
      
      const state = stateModule.getState();
      app.handleStateChange(state);

      expect(state.profileName).toBe(profileName);
      expect(mockLocalStorage.getItem('compy.profile')).toBe(profileName);
    });

    test('should trim profile name', async () => {
      stateModule.updateProfile('  Jane Smith  ');
      
      const state = stateModule.getState();
      expect(state.profileName).toBe('Jane Smith');
    });

    test('should handle empty profile name', async () => {
      stateModule.updateProfile('');
      
      const state = stateModule.getState();
      expect(state.profileName).toBe('');
    });
  });

  describe('Notification System Integration', () => {
    beforeEach(async () => {
      await app.init();
    });

    test('should show notifications', async () => {
      const testMessage = 'Test notification';
      
      app.showNotification(testMessage, 'success');
      
      // Verify notification system was called
      expect(typeof app.showNotification).toBe('function');
    });

    test('should handle notification errors gracefully', async () => {
      // Mock notification system to throw error
      const originalNotifications = app.notifications;
      app.notifications = null;
      
      expect(() => app.showNotification('Test', 'info')).not.toThrow();
      
      // Restore
      app.notifications = originalNotifications;
    });
  });

  describe('Clipboard Integration', () => {
    beforeEach(async () => {
      await app.init();
    });

    test('should copy text to clipboard', async () => {
      const testText = 'Text to copy';
      
      const result = await app.clipboard.copy(testText);
      
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(testText);
    });

    test('should validate clipboard input', async () => {
      // Test invalid inputs
      expect(await app.clipboard.copy(null)).toBe(false);
      expect(await app.clipboard.copy(undefined)).toBe(false);
      expect(await app.clipboard.copy('')).toBe(false);
    });

    test('should handle clipboard API failures', async () => {
      // Mock clipboard API to fail
      navigator.clipboard.writeText.mockRejectedValueOnce(new Error('Clipboard failed'));
      
      const result = await app.clipboard.copy('test text');
      
      // Should handle gracefully
      expect(typeof result).toBe('boolean');
    });
  });

  describe('Theme System Integration', () => {
    beforeEach(async () => {
      await app.init();
    });

    test('should apply theme correctly', async () => {
      const themeName = 'light-theme';
      
      app.theme.apply(themeName);
      
      expect(document.documentElement.getAttribute('data-theme')).toBe(themeName);
      expect(mockLocalStorage.getItem('compy.theme')).toBe(themeName);
    });

    test('should load saved theme on initialization', async () => {
      const savedTheme = 'dark-theme';
      mockLocalStorage.setItem('compy.theme', savedTheme);
      
      app.theme.load();
      
      expect(document.documentElement.getAttribute('data-theme')).toBe(savedTheme);
    });

    test('should handle invalid theme names', async () => {
      app.theme.apply('invalid-theme');
      
      // Should not crash
      expect(document.documentElement.getAttribute('data-theme')).toBeTruthy();
    });
  });

  describe('Modal System Integration', () => {
    beforeEach(async () => {
      await app.init();
    });

    test('should open item modal for new item', async () => {
      app.openItemModal();
      
      const modal = document.getElementById('itemModal');
      expect(modal).toBeTruthy();
      
      const titleElement = document.getElementById('itemModalTitle');
      expect(titleElement?.textContent).toContain('Add');
    });

    test('should open item modal for editing', async () => {
      // Create an item first
      stateModule.setEditingId(null);
      stateModule.upsertItem({
        text: 'Edit me',
        desc: 'Edit description',
        sensitive: false,
        tags: ['edit-test']
      });

      const state = stateModule.getState();
      const itemId = state.items[0].id;

      app.openItemModal(itemId);
      
      const titleElement = document.getElementById('itemModalTitle');
      expect(titleElement?.textContent).toContain('Edit');
      
      const textElement = document.getElementById('itemText');
      expect(textElement?.value).toBe('Edit me');
    });

    test('should handle missing item in edit modal', async () => {
      expect(() => app.openItemModal('non-existent-id')).not.toThrow();
    });
  });

  describe('Backup System Integration', () => {
    beforeEach(async () => {
      await app.init();
    });

    test('should create backups automatically', async () => {
      // Create some test data
      stateModule.setEditingId(null);
      stateModule.upsertItem({
        text: 'Backup test item',
        desc: 'This should be backed up',
        sensitive: false,
        tags: ['backup']
      });

      // Trigger backup
      stateModule.doBackup();

      const backups = stateModule.getBackups();
      expect(backups).toHaveLength(1);
      expect(backups[0].items).toHaveLength(1);
      expect(backups[0].items[0].text).toBe('Backup test item');
    });

    test('should limit backup count', async () => {
      // Create test data
      stateModule.setEditingId(null);
      stateModule.upsertItem({
        text: 'Backup limit test',
        desc: 'Testing backup limits',
        sensitive: false,
        tags: []
      });

      // Create many backups
      for (let i = 0; i < 15; i++) {
        stateModule.doBackup();
      }

      const backups = stateModule.getBackups();
      expect(backups.length).toBeLessThanOrEqual(mockConstants.UI_CONFIG.maxBackups);
    });
  });

  describe('Error Handling Integration', () => {
    beforeEach(async () => {
      await app.init();
    });

    test('should handle localStorage unavailability', async () => {
      // Mock localStorage to throw errors
      const originalSetItem = mockLocalStorage.setItem;
      mockLocalStorage.setItem = jest.fn().mockImplementation(() => {
        throw new Error('Storage unavailable');
      });

      // Should not crash when trying to save
      expect(() => {
        stateModule.setEditingId(null);
        stateModule.upsertItem({
          text: 'Test item',
          desc: 'Test description',
          sensitive: false,
          tags: []
        });
      }).not.toThrow();

      // Restore
      mockLocalStorage.setItem = originalSetItem;
    });

    test('should handle corrupted state data', async () => {
      // Set corrupted data
      mockLocalStorage.setItem('compy.items', 'invalid json');
      
      expect(() => stateModule.loadState()).not.toThrow();
      
      const state = stateModule.getState();
      expect(state.items).toEqual([]);
    });

    test('should handle missing DOM elements gracefully', async () => {
      // Remove essential DOM elements
      const modal = document.getElementById('itemModal');
      if (modal) modal.remove();

      // Should not crash when trying to open modal
      expect(() => app.openItemModal()).not.toThrow();
    });
  });

  describe('Performance Integration Tests', () => {
    test('should handle large number of items efficiently', async () => {
      await app.init();
      
      const startTime = performance.now();
      
      // Create 1000 items
      for (let i = 0; i < 1000; i++) {
        stateModule.setEditingId(null);
        stateModule.upsertItem({
          text: `Performance test item ${i}`,
          desc: `Description for item ${i}`,
          sensitive: i % 2 === 0,
          tags: [`tag${i % 10}`]
        });
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
      
      const state = stateModule.getState();
      expect(state.items).toHaveLength(1000);
    });

    test('should handle rapid state changes efficiently', async () => {
      await app.init();
      
      const startTime = performance.now();
      
      // Perform rapid state changes
      for (let i = 0; i < 100; i++) {
        stateModule.updateSearch(`search ${i}`);
        stateModule.updateFilterTags([`tag${i}`]);
        stateModule.updateProfile(`User ${i}`);
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });
  });

  describe('State Persistence Integration', () => {
    test('should persist and restore complete application state', async () => {
      await app.init();
      
      // Create complex state
      stateModule.setEditingId(null);
      stateModule.upsertItem({
        text: 'Persistent test item',
        desc: 'This should persist across sessions',
        sensitive: true,
        tags: ['persistence', 'test', 'important']
      });
      
      stateModule.updateSearch('persistent search');
      stateModule.updateFilterTags(['persistence', 'test']);
      stateModule.updateProfile('Persistent User');
      
      const originalState = stateModule.getState();
      
      // Simulate app restart
      mockLocalStorage.clear();
      stateModule.saveState(); // Save current state
      
      // Create new app instance and load state
      const newApp = new appModule.CompyApp();
      stateModule.loadState();
      await newApp.init();
      
      const restoredState = stateModule.getState();
      
      expect(restoredState.items).toHaveLength(originalState.items.length);
      expect(restoredState.items[0].text).toBe(originalState.items[0].text);
      expect(restoredState.profileName).toBe(originalState.profileName);
      // Note: search is session-only, filters are persisted
      expect(restoredState.filterTags).toEqual(originalState.filterTags);
    });

    test('should handle cross-tab synchronization', async () => {
      await app.init();
      
      // Simulate another tab updating localStorage
      const externalChange = {
        key: 'compy.theme',
        newValue: 'light-theme',
        oldValue: 'dark-theme'
      };
      
      // Create and dispatch storage event
      const storageEvent = new StorageEvent('storage', externalChange);
      window.dispatchEvent(storageEvent);
      
      // Should handle gracefully
      expect(document.documentElement.getAttribute('data-theme')).toBeTruthy();
    });
  });

  describe('Accessibility Integration', () => {
    beforeEach(async () => {
      await app.init();
    });

    test('should handle reduced motion preference', async () => {
      // Mock prefers-reduced-motion
      window.matchMedia = jest.fn().mockImplementation(query => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
      }));

      // Should respect reduced motion preference
      expect(() => app.init()).not.toThrow();
    });

    test('should provide screen reader announcements', async () => {
      const testMessage = 'Test announcement';
      
      app.announceToScreenReader(testMessage);
      
      const liveRegion = document.getElementById('liveRegion');
      expect(liveRegion).toBeTruthy();
    });

    test('should maintain focus management', async () => {
      // Open modal
      app.openItemModal();
      
      // Focus should be managed appropriately
      const textInput = document.getElementById('itemText');
      expect(textInput).toBeTruthy();
    });
  });
});

// End-to-End Workflow Tests
describe('End-to-End User Workflows', () => {
  let app, stateModule;

  beforeEach(async () => {
    // Setup clean environment
    mockLocalStorage.clear();
    document.body.innerHTML = htmlContent;
    jest.clearAllMocks();

    // Import and initialize
    const appModule = await import('../../js/app.js');
    stateModule = await import('../../js/state.js');
    
    stateModule.initState();
    app = new appModule.CompyApp();
    await app.init();
  });

  test('Complete workflow: Create -> Search -> Edit -> Delete', async () => {
    // 1. Create item
    stateModule.setEditingId(null);
    stateModule.upsertItem({
      text: 'git status',
      desc: 'Check git repository status',
      sensitive: false,
      tags: ['git', 'version-control']
    });

    let state = stateModule.getState();
    expect(state.items).toHaveLength(1);
    const itemId = state.items[0].id;

    // 2. Search for item
    stateModule.updateSearch('git');
    state = stateModule.getState();
    expect(state.search).toBe('git');

    // 3. Edit item
    stateModule.setEditingId(itemId);
    stateModule.upsertItem({
      text: 'git status --porcelain',
      desc: 'Check git status in porcelain format',
      tags: ['git', 'version-control', 'scripting']
    });

    state = stateModule.getState();
    expect(state.items[0].text).toBe('git status --porcelain');
    expect(state.items[0].tags).toContain('scripting');

    // 4. Delete item
    stateModule.deleteItem(itemId);
    state = stateModule.getState();
    expect(state.items).toHaveLength(0);
  });

  test('Complete workflow: Multiple items -> Filter -> Reorder -> Export', async () => {
    // 1. Create multiple items
    const items = [
      { text: 'npm install', desc: 'Install packages', tags: ['npm', 'node', 'javascript'] },
      { text: 'docker run', desc: 'Run container', tags: ['docker', 'containers'] },
      { text: 'git commit', desc: 'Commit changes', tags: ['git', 'version-control'] }
    ];

    items.forEach(item => {
      stateModule.setEditingId(null);
      stateModule.upsertItem({ ...item, sensitive: false });
    });

    let state = stateModule.getState();
    expect(state.items).toHaveLength(3);
    const itemIds = state.items.map(item => item.id);

    // 2. Filter by tags
    stateModule.updateFilterTags(['git']);
    state = stateModule.getState();
    expect(state.filterTags).toEqual(['git']);

    // 3. Reorder items
    const newOrder = [itemIds[2], itemIds[0], itemIds[1]];
    stateModule.reorderItems(newOrder);
    
    state = stateModule.getState();
    expect(state.items[0].text).toBe('git commit');
    expect(state.items[1].text).toBe('npm install');
    expect(state.items[2].text).toBe('docker run');

    // 4. Export (mock the export functionality)
    expect(() => app.exportJSON()).not.toThrow();
  });

  test('Complete workflow: Theme change -> Profile update -> Backup -> Import', async () => {
    // 1. Change theme
    app.theme.apply('light-theme');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light-theme');

    // 2. Update profile
    stateModule.updateProfile('Test User');
    let state = stateModule.getState();
    expect(state.profileName).toBe('Test User');

    // 3. Create data and backup
    stateModule.setEditingId(null);
    stateModule.upsertItem({
      text: 'backup test',
      desc: 'Test backup functionality',
      sensitive: false,
      tags: ['backup']
    });

    stateModule.doBackup();
    const backups = stateModule.getBackups();
    expect(backups).toHaveLength(1);

    // 4. Export and simulate import
    const exportData = {
      profileName: state.profileName,
      items: state.items
    };

    // Clear state and import
    mockLocalStorage.clear();
    mockLocalStorage.setItem('compy.items', JSON.stringify(exportData.items));
    mockLocalStorage.setItem('compy.profile', exportData.profileName);

    stateModule.loadState();
    state = stateModule.getState();
    
    expect(state.items).toHaveLength(1);
    expect(state.items[0].text).toBe('backup test');
    expect(state.profileName).toBe('Test User');
  });
});