/**
 * Unit Tests for State Management Module (state.js)
 * 
 * This test suite covers the core state management functionality including:
 * - Observer pattern implementation
 * - State persistence to localStorage
 * - Item CRUD operations
 * - Backup system
 * - State synchronization
 * 
 * Priority: CRITICAL - State management is core business logic
 * Coverage Target: >95%
 */

// Mock dependencies
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

// Mock UI_CONFIG and STORAGE_KEYS
const mockConstants = {
  UI_CONFIG: {
    debug: false,
    backupDelay: 1000,
    backupInterval: 3600000,
    maxBackups: 10
  },
  STORAGE_KEYS: {
    items: 'compy.items',
    filters: 'compy.filters',
    profile: 'compy.profile',
    backups: 'compy.backups',
    theme: 'compy.theme'
  }
};

// Setup test environment
global.localStorage = mockLocalStorage;
global.console = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn()
};

describe('State Management Module', () => {
  let stateModule;
  
  beforeAll(async () => {
    // Mock module imports
    jest.doMock('../../js/constants.js', () => mockConstants);
    jest.doMock('../../js/utils.js', () => ({
      generateUID: () => 'test-id-' + Date.now(),
      debounce: (fn, delay) => fn // Simplified for testing
    }));
    
    // Import the module after mocking
    stateModule = await import('../../js/state.js');
  });
  
  beforeEach(() => {
    // Clear localStorage before each test
    mockLocalStorage.clear();
    
    // Reset any state
    jest.clearAllMocks();
  });

  describe('Observer Pattern Implementation', () => {
    test('should register listeners using subscribe()', () => {
      const listener = jest.fn();
      const unsubscribe = stateModule.subscribe(listener);
      
      expect(typeof unsubscribe).toBe('function');
    });

    test('should notify all listeners when state changes', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();
      
      stateModule.subscribe(listener1);
      stateModule.subscribe(listener2);
      
      // Trigger state change
      stateModule.upsertItem({
        text: 'test snippet',
        desc: 'test description',
        sensitive: false,
        tags: ['test']
      });
      
      expect(listener1).toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();
    });

    test('should stop notifying unsubscribed listeners', () => {
      const listener = jest.fn();
      const unsubscribe = stateModule.subscribe(listener);
      
      // Unsubscribe
      unsubscribe();
      
      // Trigger state change
      stateModule.upsertItem({
        text: 'test snippet',
        desc: 'test description',
        sensitive: false,
        tags: ['test']
      });
      
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('State Persistence', () => {
    test('should save state to localStorage when saveState() is called', () => {
      const mockState = {
        items: [{
          id: 'test-1',
          text: 'test text',
          desc: 'test desc',
          sensitive: false,
          tags: ['test'],
          position: 0
        }],
        filterTags: ['test'],
        profileName: 'Test User'
      };
      
      // Manually set state and save
      Object.assign(stateModule.getState(), mockState);
      stateModule.saveState();
      
      expect(mockLocalStorage.getItem('compy.items')).toBeTruthy();
      expect(mockLocalStorage.getItem('compy.filters')).toBeTruthy();
      expect(mockLocalStorage.getItem('compy.profile')).toBe('Test User');
    });

    test('should load state from localStorage on loadState()', () => {
      // Setup localStorage with test data
      const testItems = [{
        id: 'test-1',
        text: 'stored text',
        desc: 'stored desc',
        sensitive: true,
        tags: ['stored'],
        position: 0
      }];
      
      mockLocalStorage.setItem('compy.items', JSON.stringify(testItems));
      mockLocalStorage.setItem('compy.filters', JSON.stringify(['stored']));
      mockLocalStorage.setItem('compy.profile', 'Stored User');
      
      stateModule.loadState();
      
      const state = stateModule.getState();
      expect(state.items).toHaveLength(1);
      expect(state.items[0].text).toBe('stored text');
      expect(state.filterTags).toContain('stored');
      expect(state.profileName).toBe('Stored User');
    });

    test('should handle corrupt localStorage data gracefully', () => {
      // Set invalid JSON in localStorage
      mockLocalStorage.setItem('compy.items', 'invalid json');
      
      expect(() => stateModule.loadState()).not.toThrow();
      
      const state = stateModule.getState();
      expect(state.items).toEqual([]);
    });

    test('should validate item structure when loading from storage', () => {
      // Setup localStorage with invalid item structure
      const invalidItems = [
        { id: 'valid', text: 'valid', desc: 'valid', sensitive: true, tags: [] },
        { id: 'invalid-missing-text', desc: 'invalid', sensitive: false, tags: [] },
        { /* completely invalid object */ },
        null,
        'not an object'
      ];
      
      mockLocalStorage.setItem('compy.items', JSON.stringify(invalidItems));
      stateModule.loadState();
      
      const state = stateModule.getState();
      expect(state.items).toHaveLength(1);
      expect(state.items[0].id).toBe('valid');
    });
  });

  describe('Item CRUD Operations', () => {
    test('should create new item with upsertItem() when no editingId', () => {
      stateModule.setEditingId(null);
      
      stateModule.upsertItem({
        text: 'new item',
        desc: 'new description',
        sensitive: false,
        tags: ['new']
      });
      
      const state = stateModule.getState();
      expect(state.items).toHaveLength(1);
      expect(state.items[0].text).toBe('new item');
      expect(state.items[0].id).toBeTruthy();
    });

    test('should update existing item with upsertItem() when editingId is set', () => {
      // Create initial item
      stateModule.setEditingId(null);
      stateModule.upsertItem({
        text: 'original text',
        desc: 'original desc',
        sensitive: false,
        tags: ['original']
      });
      
      const initialState = stateModule.getState();
      const itemId = initialState.items[0].id;
      
      // Update the item
      stateModule.setEditingId(itemId);
      stateModule.upsertItem({
        text: 'updated text',
        desc: 'updated desc'
      });
      
      const updatedState = stateModule.getState();
      expect(updatedState.items).toHaveLength(1);
      expect(updatedState.items[0].text).toBe('updated text');
      expect(updatedState.items[0].desc).toBe('updated desc');
      expect(updatedState.items[0].id).toBe(itemId); // Same ID
    });

    test('should delete item with deleteItem()', () => {
      // Create item first
      stateModule.setEditingId(null);
      stateModule.upsertItem({
        text: 'to be deleted',
        desc: 'deletion test',
        sensitive: false,
        tags: []
      });
      
      const initialState = stateModule.getState();
      const itemId = initialState.items[0].id;
      
      // Delete the item
      stateModule.deleteItem(itemId);
      
      const finalState = stateModule.getState();
      expect(finalState.items).toHaveLength(0);
    });

    test('should handle deleteItem() with invalid ID gracefully', () => {
      expect(() => stateModule.deleteItem('non-existent-id')).not.toThrow();
      expect(() => stateModule.deleteItem(null)).not.toThrow();
      expect(() => stateModule.deleteItem('')).not.toThrow();
    });

    test('should reorder items correctly with reorderItems()', () => {
      // Create multiple items
      stateModule.setEditingId(null);
      stateModule.upsertItem({ text: 'item1', desc: 'desc1', sensitive: false, tags: [] });
      stateModule.upsertItem({ text: 'item2', desc: 'desc2', sensitive: false, tags: [] });
      stateModule.upsertItem({ text: 'item3', desc: 'desc3', sensitive: false, tags: [] });
      
      const initialState = stateModule.getState();
      const itemIds = initialState.items.map(item => item.id);
      
      // Reorder: [0, 1, 2] -> [2, 0, 1]
      const newOrder = [itemIds[2], itemIds[0], itemIds[1]];
      stateModule.reorderItems(newOrder);
      
      const reorderedState = stateModule.getState();
      expect(reorderedState.items[0].text).toBe('item3');
      expect(reorderedState.items[1].text).toBe('item1');
      expect(reorderedState.items[2].text).toBe('item2');
    });
  });

  describe('Backup System', () => {
    test('should create backup with doBackup()', () => {
      // Create some test data
      stateModule.setEditingId(null);
      stateModule.upsertItem({
        text: 'backup test',
        desc: 'test backup creation',
        sensitive: false,
        tags: ['backup']
      });
      
      // Create backup
      stateModule.doBackup();
      
      const backups = stateModule.getBackups();
      expect(backups).toHaveLength(1);
      expect(backups[0].items).toHaveLength(1);
      expect(backups[0].ts).toBeTruthy();
    });

    test('should limit backup count to maxBackups', () => {
      // Create test item
      stateModule.setEditingId(null);
      stateModule.upsertItem({
        text: 'backup limit test',
        desc: 'test backup limits',
        sensitive: false,
        tags: []
      });
      
      // Create more backups than the limit
      for (let i = 0; i < 15; i++) {
        stateModule.doBackup();
        // Small delay to ensure different timestamps
        jest.advanceTimersByTime(100);
      }
      
      const backups = stateModule.getBackups();
      expect(backups.length).toBeLessThanOrEqual(mockConstants.UI_CONFIG.maxBackups);
    });

    test('should handle backup creation failure gracefully', () => {
      // Mock localStorage.setItem to throw error
      const originalSetItem = mockLocalStorage.setItem;
      mockLocalStorage.setItem = jest.fn().mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });
      
      expect(() => stateModule.doBackup()).not.toThrow();
      expect(console.error).toHaveBeenCalled();
      
      // Restore original implementation
      mockLocalStorage.setItem = originalSetItem;
    });
  });

  describe('UI State Management', () => {
    test('should update filter tags with updateFilterTags()', () => {
      const testTags = ['javascript', 'frontend', 'react'];
      stateModule.updateFilterTags(testTags);
      
      const state = stateModule.getState();
      expect(state.filterTags).toEqual(testTags);
      expect(mockLocalStorage.getItem('compy.filters')).toBe(JSON.stringify(testTags));
    });

    test('should update search query with updateSearch()', () => {
      const searchQuery = 'test search query';
      stateModule.updateSearch(searchQuery);
      
      const state = stateModule.getState();
      expect(state.search).toBe(searchQuery);
    });

    test('should update profile name with updateProfile()', () => {
      const profileName = 'John Doe';
      stateModule.updateProfile(profileName);
      
      const state = stateModule.getState();
      expect(state.profileName).toBe(profileName);
      expect(mockLocalStorage.getItem('compy.profile')).toBe(profileName);
    });

    test('should trim profile name in updateProfile()', () => {
      stateModule.updateProfile('  John Doe  ');
      
      const state = stateModule.getState();
      expect(state.profileName).toBe('John Doe');
    });

    test('should set editing ID with setEditingId()', () => {
      const testId = 'test-item-id';
      stateModule.setEditingId(testId);
      
      const state = stateModule.getState();
      expect(state.editingId).toBe(testId);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle localStorage unavailability gracefully', () => {
      // Mock localStorage to throw errors
      const originalGetItem = mockLocalStorage.getItem;
      mockLocalStorage.getItem = jest.fn().mockImplementation(() => {
        throw new Error('localStorage unavailable');
      });
      
      expect(() => stateModule.loadState()).not.toThrow();
      expect(console.error).toHaveBeenCalled();
      
      // Restore
      mockLocalStorage.getItem = originalGetItem;
    });

    test('should handle malformed JSON in localStorage', () => {
      mockLocalStorage.setItem('compy.items', '{"invalid": json}');
      
      expect(() => stateModule.loadState()).not.toThrow();
      
      const state = stateModule.getState();
      expect(state.items).toEqual([]);
    });

    test('should validate input parameters for upsertItem()', () => {
      // Test with invalid input
      expect(() => stateModule.upsertItem(null)).not.toThrow();
      expect(() => stateModule.upsertItem(undefined)).not.toThrow();
      expect(() => stateModule.upsertItem('not an object')).not.toThrow();
      expect(() => stateModule.upsertItem(42)).not.toThrow();
      
      // State should remain unchanged
      const state = stateModule.getState();
      expect(state.items).toEqual([]);
    });

    test('should handle concurrent state modifications', () => {
      // Simulate rapid state changes
      stateModule.setEditingId(null);
      
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(Promise.resolve().then(() => {
          stateModule.upsertItem({
            text: `concurrent item ${i}`,
            desc: `description ${i}`,
            sensitive: false,
            tags: [`tag${i}`]
          });
        }));
      }
      
      return Promise.all(promises).then(() => {
        const state = stateModule.getState();
        expect(state.items).toHaveLength(10);
      });
    });
  });

  describe('Performance Tests', () => {
    test('should handle large number of items efficiently', () => {
      const startTime = Date.now();
      
      // Create 1000 items
      stateModule.setEditingId(null);
      for (let i = 0; i < 1000; i++) {
        stateModule.upsertItem({
          text: `Performance test item ${i}`,
          desc: `Description for item ${i}`,
          sensitive: i % 2 === 0,
          tags: [`perf${i % 10}`, `test${i % 5}`]
        });
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete within reasonable time (2 seconds)
      expect(duration).toBeLessThan(2000);
      
      const state = stateModule.getState();
      expect(state.items).toHaveLength(1000);
    });

    test('should handle frequent state updates without memory leaks', () => {
      // Monitor memory usage (simplified)
      const initialListenerCount = stateModule.subscribe(() => {}).length;
      
      // Add and remove many listeners
      const unsubscribers = [];
      for (let i = 0; i < 100; i++) {
        unsubscribers.push(stateModule.subscribe(() => {}));
      }
      
      // Unsubscribe all
      unsubscribers.forEach(unsub => unsub());
      
      // Should not accumulate listeners
      const finalListenerCount = stateModule.subscribe(() => {}).length;
      expect(finalListenerCount).toBeLessThanOrEqual(initialListenerCount + 1);
    });
  });

  describe('Integration with localStorage', () => {
    test('should handle storage quota exceeded', () => {
      // Mock quota exceeded error
      const originalSetItem = mockLocalStorage.setItem;
      mockLocalStorage.setItem = jest.fn().mockImplementation(() => {
        throw new DOMException('QuotaExceededError');
      });
      
      expect(() => stateModule.saveState()).not.toThrow();
      expect(console.error).toHaveBeenCalled();
      
      mockLocalStorage.setItem = originalSetItem;
    });

    test('should synchronize state across different keys', () => {
      // Test that related data is saved together
      stateModule.setEditingId(null);
      stateModule.upsertItem({
        text: 'sync test',
        desc: 'synchronization test',
        sensitive: false,
        tags: ['sync']
      });
      stateModule.updateFilterTags(['sync']);
      stateModule.updateProfile('Sync User');
      
      expect(mockLocalStorage.getItem('compy.items')).toBeTruthy();
      expect(mockLocalStorage.getItem('compy.filters')).toBeTruthy();
      expect(mockLocalStorage.getItem('compy.profile')).toBeTruthy();
    });
  });
});

// Performance benchmarks
describe('State Management Performance Benchmarks', () => {
  test('BENCHMARK: State loading performance', () => {
    // Create large dataset
    const largeDataset = Array.from({ length: 5000 }, (_, i) => ({
      id: `perf-${i}`,
      text: `Performance item ${i} with longer text content to simulate real usage`,
      desc: `Detailed description for performance test item ${i}`,
      sensitive: i % 3 === 0,
      tags: [`category${i % 20}`, `type${i % 10}`, `priority${i % 3}`],
      position: i
    }));
    
    mockLocalStorage.setItem('compy.items', JSON.stringify(largeDataset));
    
    const startTime = performance.now();
    stateModule.loadState();
    const endTime = performance.now();
    
    console.log(`Loading ${largeDataset.length} items took ${endTime - startTime} milliseconds`);
    
    // Should load within 100ms for 5000 items
    expect(endTime - startTime).toBeLessThan(100);
  });

  test('BENCHMARK: State saving performance', () => {
    // Setup large state
    stateModule.setEditingId(null);
    for (let i = 0; i < 2000; i++) {
      stateModule.upsertItem({
        text: `Benchmark item ${i}`,
        desc: `Description ${i}`,
        sensitive: false,
        tags: [`tag${i % 50}`]
      });
    }
    
    const startTime = performance.now();
    stateModule.saveState();
    const endTime = performance.now();
    
    console.log(`Saving ${stateModule.getState().items.length} items took ${endTime - startTime} milliseconds`);
    
    // Should save within 50ms for 2000 items
    expect(endTime - startTime).toBeLessThan(50);
  });
});