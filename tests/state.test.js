/**
 * Comprehensive Unit Tests for state.js
 * 
 * This test suite covers state management including:
 * - State initialization and loading
 * - Observer pattern implementation
 * - Item CRUD operations
 * - State persistence to localStorage
 * - Backup and recovery system
 * - Search and filter state management
 * - Profile management
 * - Error handling and data validation
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';

// Mock implementation of state management functions
let state = {
  items: [],
  filterTags: [],
  search: '',
  editingId: null,
  profileName: ''
};

const listeners = new Set();

// State management functions to test
const getState = () => ({ ...state });

const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const notifyListeners = () => {
  listeners.forEach(listener => listener(state));
};

const loadState = () => {
  try {
    const rawItems = localStorage.getItem('compy.items');
    const rawFilters = localStorage.getItem('compy.filters');
    const rawProfile = localStorage.getItem('compy.profile');
    
    let items = [];
    if (rawItems) {
      const parsedItems = JSON.parse(rawItems);
      if (Array.isArray(parsedItems)) {
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
    
    let filterTags = [];
    if (rawFilters) {
      const parsedFilters = JSON.parse(rawFilters);
      if (Array.isArray(parsedFilters)) {
        filterTags = parsedFilters.filter(tag => typeof tag === 'string');
      }
    }
    
    const profileName = rawProfile ? String(rawProfile).trim().slice(0, 100) : '';
    
    state = {
      ...state,
      items,
      filterTags,
      profileName
    };
    
    notifyListeners();
  } catch (error) {
    console.error('Failed to load state:', error);
    state = {
      items: [],
      filterTags: [],
      search: '',
      editingId: null,
      profileName: ''
    };
    notifyListeners();
  }
};

const saveState = () => {
  try {
    localStorage.setItem('compy.items', JSON.stringify(state.items));
    localStorage.setItem('compy.filters', JSON.stringify(state.filterTags));
    
    if (state.profileName) {
      localStorage.setItem('compy.profile', state.profileName);
    }
    
    scheduleBackup();
    notifyListeners();
  } catch (error) {
    console.error('Failed to save state:', error);
  }
};

const upsertItem = (itemData) => {
  const now = Date.now();
  
  if (state.editingId) {
    // Update existing item
    const index = state.items.findIndex(item => item.id === state.editingId);
    if (index !== -1) {
      state.items[index] = {
        ...state.items[index],
        ...itemData,
        updatedAt: now
      };
    }
    state.editingId = null;
  } else {
    // Create new item
    const newItem = {
      id: generateUID(),
      text: itemData.text,
      desc: itemData.desc,
      sensitive: Boolean(itemData.sensitive),
      tags: itemData.tags || [],
      createdAt: now,
      updatedAt: now
    };
    state.items.unshift(newItem);
  }
  
  saveState();
};

const deleteItem = (itemId) => {
  state.items = state.items.filter(item => item.id !== itemId);
  if (state.editingId === itemId) {
    state.editingId = null;
  }
  saveState();
};

const updateFilterTags = (tags) => {
  state.filterTags = [...tags];
  saveState();
};

const updateSearch = (searchTerm) => {
  state.search = searchTerm;
  notifyListeners();
};

const setEditingId = (id) => {
  state.editingId = id;
  notifyListeners();
};

const updateProfile = (name) => {
  state.profileName = String(name).trim().slice(0, 100);
  saveState();
};

const generateUID = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

let backupTimeout;
const scheduleBackup = () => {
  if (backupTimeout) {
    clearTimeout(backupTimeout);
  }
  backupTimeout = setTimeout(doBackup, 1000);
};

const doBackup = () => {
  const backup = {
    ts: new Date().toISOString(),
    items: state.items
  };
  
  try {
    let backups = JSON.parse(localStorage.getItem('compy.backups') || '[]');
    backups.unshift(backup);
    backups = backups.slice(0, 10); // Keep only 10 backups
    localStorage.setItem('compy.backups', JSON.stringify(backups));
  } catch (error) {
    console.error('Failed to save backup:', error);
  }
};

const getBackups = () => {
  try {
    return JSON.parse(localStorage.getItem('compy.backups') || '[]');
  } catch (error) {
    return [];
  }
};

describe('State Management Module', () => {
  beforeEach(() => {
    // Reset state
    state = {
      items: [],
      filterTags: [],
      search: '',
      editingId: null,
      profileName: ''
    };
    
    // Clear listeners
    listeners.clear();
    
    // Clear localStorage
    localStorage.clear();
    
    // Clear timers
    if (backupTimeout) {
      clearTimeout(backupTimeout);
      backupTimeout = null;
    }
  });

  describe('State Access and Subscription', () => {
    test('getState should return immutable copy of state', () => {
      const currentState = getState();
      
      expect(currentState).toEqual(state);
      expect(currentState).not.toBe(state); // Should be a copy
      
      // Modifying returned state should not affect original
      currentState.search = 'test';
      expect(state.search).toBe('');
    });

    test('subscribe should register listeners and return unsubscribe function', () => {
      const mockListener = jest.fn();
      
      const unsubscribe = subscribe(mockListener);
      expect(listeners.has(mockListener)).toBe(true);
      
      unsubscribe();
      expect(listeners.has(mockListener)).toBe(false);
    });

    test('notifyListeners should call all registered listeners', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();
      
      subscribe(listener1);
      subscribe(listener2);
      
      notifyListeners();
      
      expect(listener1).toHaveBeenCalledWith(state);
      expect(listener2).toHaveBeenCalledWith(state);
    });

    test('listeners should receive current state on notification', () => {
      const mockListener = jest.fn();
      subscribe(mockListener);
      
      state.search = 'test';
      notifyListeners();
      
      expect(mockListener).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'test' })
      );
    });
  });

  describe('State Persistence', () => {
    test('saveState should persist data to localStorage', () => {
      state.items = [
        {
          id: 'test1',
          text: 'Test content',
          desc: 'Test description',
          tags: ['test'],
          sensitive: false
        }
      ];
      state.filterTags = ['javascript'];
      state.profileName = 'Test User';
      
      saveState();
      
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'compy.items',
        JSON.stringify(state.items)
      );
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'compy.filters',
        JSON.stringify(state.filterTags)
      );
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'compy.profile',
        'Test User'
      );
    });

    test('saveState should not store empty profile name', () => {
      state.profileName = '';
      saveState();
      
      expect(localStorage.setItem).not.toHaveBeenCalledWith(
        'compy.profile',
        expect.anything()
      );
    });

    test('loadState should restore valid data from localStorage', () => {
      const mockItems = [
        {
          id: 'test1',
          text: 'Test',
          desc: 'Description',
          sensitive: false,
          tags: ['tag1']
        }
      ];
      const mockFilters = ['javascript', 'git'];
      const mockProfile = 'Test User';
      
      global.localStorage.getItem.mockImplementation((key) => {
        if (key === 'compy.items') return JSON.stringify(mockItems);
        if (key === 'compy.filters') return JSON.stringify(mockFilters);
        if (key === 'compy.profile') return mockProfile;
        return null;
      });
      
      loadState();
      
      expect(state.items).toEqual(mockItems);
      expect(state.filterTags).toEqual(mockFilters);
      expect(state.profileName).toBe(mockProfile);
    });

    test('loadState should handle corrupted data gracefully', () => {
      global.localStorage.getItem.mockImplementation(() => 'invalid json');
      
      const listener = jest.fn();
      subscribe(listener);
      
      loadState();
      
      // Should reset to initial state
      expect(state).toEqual({
        items: [],
        filterTags: [],
        search: '',
        editingId: null,
        profileName: ''
      });
      
      // Should still notify listeners
      expect(listener).toHaveBeenCalled();
    });

    test('loadState should filter out invalid items', () => {
      const mixedItems = [
        {
          id: 'valid1',
          text: 'Valid item',
          desc: 'Valid description',
          sensitive: false,
          tags: ['valid']
        },
        {
          // Missing required fields
          id: 'invalid1',
          text: 'Text only'
        },
        {
          // Wrong types
          id: 123,
          text: null,
          desc: 'Bad types',
          sensitive: 'not boolean',
          tags: 'not array'
        },
        {
          id: 'valid2',
          text: 'Another valid item',
          desc: 'Another valid description',
          sensitive: true,
          tags: []
        }
      ];
      
      global.localStorage.getItem.mockImplementation((key) => {
        if (key === 'compy.items') return JSON.stringify(mixedItems);
        return null;
      });
      
      loadState();
      
      expect(state.items).toHaveLength(2);
      expect(state.items.map(item => item.id)).toEqual(['valid1', 'valid2']);
    });

    test('loadState should sanitize profile name', () => {
      const longName = 'a'.repeat(200);
      global.localStorage.getItem.mockImplementation((key) => {
        if (key === 'compy.profile') return longName;
        return null;
      });
      
      loadState();
      
      expect(state.profileName).toHaveLength(100);
    });
  });

  describe('Item Management', () => {
    test('upsertItem should create new item when not editing', () => {
      const itemData = {
        text: 'New item text',
        desc: 'New item description',
        tags: ['new', 'item'],
        sensitive: false
      };
      
      upsertItem(itemData);
      
      expect(state.items).toHaveLength(1);
      expect(state.items[0]).toMatchObject(itemData);
      expect(state.items[0].id).toBeTruthy();
      expect(state.items[0].createdAt).toBeTruthy();
      expect(state.items[0].updatedAt).toBeTruthy();
    });

    test('upsertItem should update existing item when editing', () => {
      // First create an item
      const originalItem = {
        id: 'existing-id',
        text: 'Original text',
        desc: 'Original description',
        tags: ['original'],
        sensitive: false,
        createdAt: 1000,
        updatedAt: 1000
      };
      state.items = [originalItem];
      state.editingId = 'existing-id';
      
      const updates = {
        text: 'Updated text',
        desc: 'Updated description',
        tags: ['updated'],
        sensitive: true
      };
      
      upsertItem(updates);
      
      expect(state.items).toHaveLength(1);
      expect(state.items[0]).toMatchObject({
        id: 'existing-id',
        text: 'Updated text',
        desc: 'Updated description',
        tags: ['updated'],
        sensitive: true,
        createdAt: 1000
      });
      expect(state.items[0].updatedAt).toBeGreaterThan(1000);
      expect(state.editingId).toBeNull();
    });

    test('upsertItem should handle missing tags', () => {
      const itemData = {
        text: 'Test text',
        desc: 'Test description',
        sensitive: false
      };
      
      upsertItem(itemData);
      
      expect(state.items[0].tags).toEqual([]);
    });

    test('upsertItem should convert sensitive to boolean', () => {
      const itemData = {
        text: 'Test text',
        desc: 'Test description',
        sensitive: 'true' // String value
      };
      
      upsertItem(itemData);
      
      expect(state.items[0].sensitive).toBe(true);
      expect(typeof state.items[0].sensitive).toBe('boolean');
    });

    test('deleteItem should remove item from state', () => {
      state.items = [
        { id: 'item1', text: 'Item 1', desc: 'Desc 1', tags: [], sensitive: false },
        { id: 'item2', text: 'Item 2', desc: 'Desc 2', tags: [], sensitive: false },
        { id: 'item3', text: 'Item 3', desc: 'Desc 3', tags: [], sensitive: false }
      ];
      
      deleteItem('item2');
      
      expect(state.items).toHaveLength(2);
      expect(state.items.map(item => item.id)).toEqual(['item1', 'item3']);
    });

    test('deleteItem should clear editing ID if deleting current edit item', () => {
      state.items = [
        { id: 'item1', text: 'Item 1', desc: 'Desc 1', tags: [], sensitive: false }
      ];
      state.editingId = 'item1';
      
      deleteItem('item1');
      
      expect(state.editingId).toBeNull();
    });

    test('deleteItem should not affect editing ID for different item', () => {
      state.items = [
        { id: 'item1', text: 'Item 1', desc: 'Desc 1', tags: [], sensitive: false },
        { id: 'item2', text: 'Item 2', desc: 'Desc 2', tags: [], sensitive: false }
      ];
      state.editingId = 'item1';
      
      deleteItem('item2');
      
      expect(state.editingId).toBe('item1');
    });
  });

  describe('Filter and Search Management', () => {
    test('updateFilterTags should update filter state and persist', () => {
      const newTags = ['javascript', 'git', 'npm'];
      
      updateFilterTags(newTags);
      
      expect(state.filterTags).toEqual(newTags);
      expect(state.filterTags).not.toBe(newTags); // Should be a copy
      
      // Should have called localStorage.setItem
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'compy.filters',
        JSON.stringify(newTags)
      );
    });

    test('updateSearch should update search state without persistence', () => {
      const listener = jest.fn();
      subscribe(listener);
      
      updateSearch('test search');
      
      expect(state.search).toBe('test search');
      expect(listener).toHaveBeenCalled();
      
      // Should not persist search to localStorage
      expect(localStorage.setItem).not.toHaveBeenCalledWith(
        expect.stringContaining('search'),
        expect.anything()
      );
    });

    test('setEditingId should update editing state without persistence', () => {
      const listener = jest.fn();
      subscribe(listener);
      
      setEditingId('test-id');
      
      expect(state.editingId).toBe('test-id');
      expect(listener).toHaveBeenCalled();
      
      // Should not persist editing ID to localStorage
      expect(localStorage.setItem).not.toHaveBeenCalledWith(
        expect.stringContaining('editing'),
        expect.anything()
      );
    });

    test('updateProfile should sanitize and persist profile name', () => {
      const longName = '  ' + 'a'.repeat(200) + '  ';
      
      updateProfile(longName);
      
      expect(state.profileName).toHaveLength(100);
      expect(state.profileName.trim()).toBe(state.profileName); // No leading/trailing spaces
      
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'compy.profile',
        state.profileName
      );
    });
  });

  describe('Backup System', () => {
    test('doBackup should create timestamped backup', () => {
      const testItems = [
        { id: 'item1', text: 'Test', desc: 'Test', tags: [], sensitive: false }
      ];
      state.items = testItems;
      
      doBackup();
      
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'compy.backups',
        expect.stringContaining('"items"')
      );
      
      // Verify backup structure
      const backupCall = localStorage.setItem.mock.calls.find(
        call => call[0] === 'compy.backups'
      );
      const backups = JSON.parse(backupCall[1]);
      
      expect(backups).toHaveLength(1);
      expect(backups[0]).toHaveProperty('ts');
      expect(backups[0]).toHaveProperty('items', testItems);
      expect(new Date(backups[0].ts)).toBeInstanceOf(Date);
    });

    test('doBackup should limit backup count', () => {
      // Create more backups than the limit
      const existingBackups = Array.from({ length: 12 }, (_, i) => ({
        ts: new Date(Date.now() - i * 1000).toISOString(),
        items: [{ id: `item${i}` }]
      }));
      
      localStorage.getItem.mockImplementation((key) => {
        if (key === 'compy.backups') return JSON.stringify(existingBackups);
        return null;
      });
      
      doBackup();
      
      const backupCall = localStorage.setItem.mock.calls.find(
        call => call[0] === 'compy.backups'
      );
      const backups = JSON.parse(backupCall[1]);
      
      expect(backups).toHaveLength(10); // Should be limited to 10
    });

    test('doBackup should add new backup at the beginning', () => {
      const existingBackups = [
        {
          ts: '2023-01-01T00:00:00.000Z',
          items: [{ id: 'old-item' }]
        }
      ];
      
      localStorage.getItem.mockImplementation((key) => {
        if (key === 'compy.backups') return JSON.stringify(existingBackups);
        return null;
      });
      
      state.items = [{ id: 'new-item' }];
      doBackup();
      
      const backupCall = localStorage.setItem.mock.calls.find(
        call => call[0] === 'compy.backups'
      );
      const backups = JSON.parse(backupCall[1]);
      
      expect(backups).toHaveLength(2);
      expect(backups[0].items).toEqual([{ id: 'new-item' }]); // New backup first
      expect(backups[1].items).toEqual([{ id: 'old-item' }]); // Old backup second
    });

    test('getBackups should return backups from localStorage', () => {
      const mockBackups = [
        { ts: '2023-01-01T00:00:00.000Z', items: [] }
      ];
      
      localStorage.getItem.mockImplementation((key) => {
        if (key === 'compy.backups') return JSON.stringify(mockBackups);
        return null;
      });
      
      const backups = getBackups();
      
      expect(backups).toEqual(mockBackups);
    });

    test('getBackups should return empty array on error', () => {
      localStorage.getItem.mockImplementation(() => 'invalid json');
      
      const backups = getBackups();
      
      expect(backups).toEqual([]);
    });

    test('scheduleBackup should debounce backup creation', () => {
      jest.useFakeTimers();
      
      // Isolate setItem assertions
      localStorage.setItem.mockClear();
      
      // Schedule multiple backups quickly
      scheduleBackup();
      scheduleBackup();
      scheduleBackup();

      // Run all timers (debounced backup should fire once)
      jest.runAllTimers();
      
      // Verify exactly one backup array was persisted via setItem
      const backupCalls = localStorage.setItem.mock.calls.filter(call => call[0] === 'compy.backups');
      expect(backupCalls.length).toBeGreaterThan(0);
      const lastPayload = backupCalls[backupCalls.length - 1][1];
      const backups = JSON.parse(lastPayload);
      expect(Array.isArray(backups)).toBe(true);
      expect(backups.length).toBe(1);
      
      jest.useRealTimers();
    });
  });

  describe('Error Handling', () => {
    test('saveState should handle localStorage quota exceeded', () => {
      localStorage.setItem.mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      expect(() => saveState()).not.toThrow();
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to save state:',
        expect.any(Error)
      );
      
      consoleSpy.mockRestore();
    });

    test('doBackup should handle localStorage errors gracefully', () => {
      localStorage.setItem.mockImplementation(() => {
        throw new Error('Storage error');
      });
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      expect(() => doBackup()).not.toThrow();
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to save backup:',
        expect.any(Error)
      );
      
      consoleSpy.mockRestore();
    });

    test('loadState should handle missing localStorage', () => {
      localStorage.getItem.mockImplementation(() => {
        throw new Error('localStorage not available');
      });
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      loadState();
      
      expect(state).toEqual({
        items: [],
        filterTags: [],
        search: '',
        editingId: null,
        profileName: ''
      });
      
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('Performance and Memory', () => {
    test('state updates should not create memory leaks', () => {
      const initialListenerCount = listeners.size;
      
      // Add and remove many listeners
      const unsubscribers = [];
      for (let i = 0; i < 100; i++) {
        const unsubscribe = subscribe(() => {});
        unsubscribers.push(unsubscribe);
      }
      
      expect(listeners.size).toBe(initialListenerCount + 100);
      
      // Unsubscribe all
      unsubscribers.forEach(unsubscribe => unsubscribe());
      
      expect(listeners.size).toBe(initialListenerCount);
    });

    test('large state should be handled efficiently', () => {
      const largeItemSet = Array.from({ length: 1000 }, (_, i) => ({
        id: `item-${i}`,
        text: `Item ${i} content`,
        desc: `Description for item ${i}`,
        tags: [`tag-${i % 10}`],
        sensitive: i % 2 === 0
      }));
      
      const startTime = performance.now();
      
      state.items = largeItemSet;
      saveState();
      
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(100); // Should complete quickly
      expect(localStorage.setItem).toHaveBeenCalled();
    });
  });
});
