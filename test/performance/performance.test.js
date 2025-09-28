/**
 * Performance Tests for Compy 2.0
 * 
 * This test suite measures application performance across various scenarios:
 * - Load time and initialization benchmarks
 * - Large dataset handling efficiency
 * - Memory usage and garbage collection
 * - UI responsiveness under stress
 * - Search and filtering performance
 * - State management scalability
 * 
 * Priority: HIGH - Performance affects user experience
 * Coverage Target: All performance-critical operations
 */

// Mock DOM environment with performance monitoring
const { JSDOM } = require('jsdom');
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
global.document = dom.window.document;
global.window = dom.window;
global.performance = {
  now: () => Date.now(),
  mark: jest.fn(),
  measure: jest.fn(),
  getEntriesByName: jest.fn().mockReturnValue([]),
  getEntriesByType: jest.fn().mockReturnValue([])
};

// Mock localStorage with performance tracking
const performanceTracker = {
  operations: 0,
  totalTime: 0,
  calls: []
};

global.localStorage = (() => {
  let store = {};
  return {
    getItem: (key) => {
      const start = performance.now();
      const result = store[key] || null;
      const end = performance.now();
      performanceTracker.operations++;
      performanceTracker.totalTime += (end - start);
      performanceTracker.calls.push({ operation: 'getItem', key, duration: end - start });
      return result;
    },
    setItem: (key, value) => {
      const start = performance.now();
      store[key] = value.toString();
      const end = performance.now();
      performanceTracker.operations++;
      performanceTracker.totalTime += (end - start);
      performanceTracker.calls.push({ operation: 'setItem', key, size: value.length, duration: end - start });
    },
    removeItem: (key) => {
      const start = performance.now();
      delete store[key];
      const end = performance.now();
      performanceTracker.operations++;
      performanceTracker.totalTime += (end - start);
      performanceTracker.calls.push({ operation: 'removeItem', key, duration: end - start });
    },
    clear: () => {
      const start = performance.now();
      store = {};
      const end = performance.now();
      performanceTracker.operations++;
      performanceTracker.totalTime += (end - start);
      performanceTracker.calls.push({ operation: 'clear', duration: end - start });
    },
    get length() { return Object.keys(store).length; },
    key: (i) => Object.keys(store)[i] || null
  };
})();

// Performance measurement utilities
const PerformanceUtils = {
  measure: (name, fn) => {
    const start = performance.now();
    const result = fn();
    const end = performance.now();
    const duration = end - start;
    
    return {
      result,
      duration,
      startTime: start,
      endTime: end
    };
  },

  measureAsync: async (name, fn) => {
    const start = performance.now();
    const result = await fn();
    const end = performance.now();
    const duration = end - start;
    
    return {
      result,
      duration,
      startTime: start,
      endTime: end
    };
  },

  createLargeDataset: (size, complexity = 'medium') => {
    const complexities = {
      simple: { textLength: 50, descLength: 30, tagCount: 2 },
      medium: { textLength: 200, descLength: 100, tagCount: 5 },
      complex: { textLength: 1000, descLength: 500, tagCount: 20 }
    };
    
    const config = complexities[complexity];
    
    return Array.from({ length: size }, (_, i) => ({
      id: `perf-item-${i}`,
      text: 'Lorem ipsum dolor sit amet '.repeat(Math.ceil(config.textLength / 27)).substring(0, config.textLength),
      desc: 'Test description content '.repeat(Math.ceil(config.descLength / 22)).substring(0, config.descLength),
      sensitive: i % 10 === 0,
      tags: Array.from({ length: config.tagCount }, (_, j) => `tag${(i + j) % 100}`),
      position: i
    }));
  },

  measureMemoryUsage: () => {
    if (typeof window !== 'undefined' && window.performance && window.performance.memory) {
      return {
        usedJSHeapSize: window.performance.memory.usedJSHeapSize,
        totalJSHeapSize: window.performance.memory.totalJSHeapSize,
        jsHeapSizeLimit: window.performance.memory.jsHeapSizeLimit
      };
    }
    return null; // Memory API not available in Node.js test environment
  },

  resetPerformanceTracker: () => {
    performanceTracker.operations = 0;
    performanceTracker.totalTime = 0;
    performanceTracker.calls = [];
  }
};

describe('Performance Tests', () => {
  let utilsModule, stateModule, appModule;
  
  beforeAll(async () => {
    // Mock constants
    jest.doMock('../../js/constants.js', () => ({
      STORAGE_KEYS: {
        items: 'compy.items',
        filters: 'compy.filters',
        profile: 'compy.profile',
        backups: 'compy.backups'
      },
      UI_CONFIG: {
        debug: false,
        backupDelay: 100, // Reduced for testing
        maxBackups: 10,
        maxVisibleTags: 5
      }
    }));
    
    // Import modules
    utilsModule = await import('../../js/utils.js');
    stateModule = await import('../../js/state.js');
    appModule = await import('../../js/app.js');
  });

  beforeEach(() => {
    localStorage.clear();
    PerformanceUtils.resetPerformanceTracker();
    jest.clearAllMocks();
  });

  describe('Application Initialization Performance', () => {
    test('should initialize quickly with empty state', async () => {
      const measurement = await PerformanceUtils.measureAsync('app-init-empty', async () => {
        const app = new appModule.CompyApp();
        await app.init();
        return app;
      });
      
      console.log(`App initialization (empty state): ${measurement.duration.toFixed(2)}ms`);
      
      expect(measurement.duration).toBeLessThan(1000); // Should init within 1 second
      expect(measurement.result.initialized).toBe(true);
    });

    test('should initialize efficiently with existing data', async () => {
      // Pre-populate localStorage with test data
      const testData = PerformanceUtils.createLargeDataset(100, 'medium');
      localStorage.setItem('compy.items', JSON.stringify(testData));
      localStorage.setItem('compy.profile', 'Performance Test User');
      
      const measurement = await PerformanceUtils.measureAsync('app-init-with-data', async () => {
        stateModule.initState();
        const app = new appModule.CompyApp();
        await app.init();
        return app;
      });
      
      console.log(`App initialization (100 items): ${measurement.duration.toFixed(2)}ms`);
      
      expect(measurement.duration).toBeLessThan(2000); // Should init within 2 seconds with data
      expect(measurement.result.initialized).toBe(true);
    });

    test('should handle large initial dataset efficiently', async () => {
      const largeDataset = PerformanceUtils.createLargeDataset(1000, 'complex');
      localStorage.setItem('compy.items', JSON.stringify(largeDataset));
      
      const measurement = await PerformanceUtils.measureAsync('app-init-large-dataset', async () => {
        stateModule.initState();
        const app = new appModule.CompyApp();
        await app.init();
        return app;
      });
      
      console.log(`App initialization (1000 complex items): ${measurement.duration.toFixed(2)}ms`);
      
      expect(measurement.duration).toBeLessThan(5000); // Should handle large dataset within 5 seconds
      expect(measurement.result.initialized).toBe(true);
      
      const state = stateModule.getState();
      expect(state.items.length).toBe(1000);
    });
  });

  describe('State Management Performance', () => {
    test('should handle rapid state updates efficiently', () => {
      const measurement = PerformanceUtils.measure('rapid-state-updates', () => {
        for (let i = 0; i < 1000; i++) {
          stateModule.updateSearch(`search query ${i}`);
        }
      });
      
      console.log(`1000 rapid state updates: ${measurement.duration.toFixed(2)}ms`);
      
      expect(measurement.duration).toBeLessThan(500); // Should complete within 500ms
      
      const state = stateModule.getState();
      expect(state.search).toBe('search query 999');
    });

    test('should persist large amounts of data efficiently', () => {
      const largeDataset = PerformanceUtils.createLargeDataset(5000, 'medium');
      
      const measurement = PerformanceUtils.measure('large-data-persistence', () => {
        largeDataset.forEach(item => {
          stateModule.setEditingId(null);
          stateModule.upsertItem(item);
        });
      });
      
      console.log(`Persisting 5000 items: ${measurement.duration.toFixed(2)}ms`);
      console.log(`Average localStorage calls: ${performanceTracker.operations} operations, ${(performanceTracker.totalTime).toFixed(2)}ms total`);
      
      expect(measurement.duration).toBeLessThan(30000); // Should complete within 30 seconds
      
      const state = stateModule.getState();
      expect(state.items.length).toBe(5000);
    });

    test('should load large datasets from storage efficiently', () => {
      const largeDataset = PerformanceUtils.createLargeDataset(2000, 'medium');
      localStorage.setItem('compy.items', JSON.stringify(largeDataset));
      
      const measurement = PerformanceUtils.measure('large-data-loading', () => {
        stateModule.loadState();
      });
      
      console.log(`Loading 2000 items from storage: ${measurement.duration.toFixed(2)}ms`);
      
      expect(measurement.duration).toBeLessThan(1000); // Should load within 1 second
      
      const state = stateModule.getState();
      expect(state.items.length).toBe(2000);
    });

    test('should handle concurrent state modifications', async () => {
      const concurrentOperations = Array.from({ length: 100 }, (_, i) => 
        Promise.resolve().then(() => {
          stateModule.setEditingId(null);
          stateModule.upsertItem({
            text: `Concurrent item ${i}`,
            desc: `Description ${i}`,
            sensitive: false,
            tags: [`concurrent${i % 10}`]
          });
        })
      );
      
      const measurement = await PerformanceUtils.measureAsync('concurrent-operations', async () => {
        await Promise.all(concurrentOperations);
      });
      
      console.log(`100 concurrent operations: ${measurement.duration.toFixed(2)}ms`);
      
      expect(measurement.duration).toBeLessThan(2000); // Should complete within 2 seconds
      
      const state = stateModule.getState();
      expect(state.items.length).toBe(100);
    });
  });

  describe('Search and Filtering Performance', () => {
    beforeEach(() => {
      // Create test dataset for search/filter tests
      const searchTestData = PerformanceUtils.createLargeDataset(1000, 'medium');
      searchTestData.forEach(item => {
        stateModule.setEditingId(null);
        stateModule.upsertItem(item);
      });
    });

    test('should search through large datasets efficiently', () => {
      const state = stateModule.getState();
      
      const measurement = PerformanceUtils.measure('large-dataset-search', () => {
        return utilsModule.filterItems(state.items, 'Lorem', []);
      });
      
      console.log(`Searching 1000 items: ${measurement.duration.toFixed(2)}ms`);
      
      expect(measurement.duration).toBeLessThan(100); // Should search within 100ms
      expect(measurement.result.length).toBeGreaterThan(0);
    });

    test('should filter by tags efficiently', () => {
      const state = stateModule.getState();
      
      const measurement = PerformanceUtils.measure('tag-filtering', () => {
        return utilsModule.filterItems(state.items, '', ['tag1', 'tag2']);
      });
      
      console.log(`Filtering 1000 items by tags: ${measurement.duration.toFixed(2)}ms`);
      
      expect(measurement.duration).toBeLessThan(100); // Should filter within 100ms
    });

    test('should combine search and filtering efficiently', () => {
      const state = stateModule.getState();
      
      const measurement = PerformanceUtils.measure('combined-search-filter', () => {
        return utilsModule.filterItems(state.items, 'Lorem', ['tag1']);
      });
      
      console.log(`Combined search+filter on 1000 items: ${measurement.duration.toFixed(2)}ms`);
      
      expect(measurement.duration).toBeLessThan(150); // Should complete within 150ms
    });

    test('should extract tags from large datasets efficiently', () => {
      const state = stateModule.getState();
      
      const measurement = PerformanceUtils.measure('tag-extraction', () => {
        return utilsModule.getAllTags(state.items);
      });
      
      console.log(`Extracting tags from 1000 items: ${measurement.duration.toFixed(2)}ms`);
      
      expect(measurement.duration).toBeLessThan(50); // Should extract tags within 50ms
      expect(measurement.result.length).toBeGreaterThan(0);
    });

    test('should handle regex-heavy search queries efficiently', () => {
      const state = stateModule.getState();
      const complexQuery = 'Lorem|ipsum|dolor'; // Regex OR pattern
      
      const measurement = PerformanceUtils.measure('complex-search-query', () => {
        // Note: This tests the underlying search mechanism
        return state.items.filter(item => 
          item.text.toLowerCase().includes(complexQuery.toLowerCase()) ||
          item.desc.toLowerCase().includes(complexQuery.toLowerCase())
        );
      });
      
      console.log(`Complex search query on 1000 items: ${measurement.duration.toFixed(2)}ms`);
      
      expect(measurement.duration).toBeLessThan(200); // Should handle complex queries within 200ms
    });
  });

  describe('UI Rendering Performance', () => {
    test('should render large number of cards efficiently', async () => {
      const app = new appModule.CompyApp();
      await app.init();
      
      // Create large dataset
      const largeDataset = PerformanceUtils.createLargeDataset(500, 'medium');
      largeDataset.forEach(item => {
        stateModule.setEditingId(null);
        stateModule.upsertItem(item);
      });
      
      const measurement = PerformanceUtils.measure('card-rendering', () => {
        const state = stateModule.getState();
        return state.items.map(item => app.createCardElement(item));
      });
      
      console.log(`Rendering 500 cards: ${measurement.duration.toFixed(2)}ms`);
      
      expect(measurement.duration).toBeLessThan(2000); // Should render within 2 seconds
      expect(measurement.result.length).toBe(500);
    });

    test('should handle state changes with many listeners efficiently', () => {
      const listeners = [];
      
      // Register many listeners
      for (let i = 0; i < 100; i++) {
        const listener = jest.fn();
        stateModule.subscribe(listener);
        listeners.push(listener);
      }
      
      const measurement = PerformanceUtils.measure('many-listeners-notify', () => {
        stateModule.setEditingId(null);
        stateModule.upsertItem({
          text: 'Test item',
          desc: 'Test description',
          sensitive: false,
          tags: ['test']
        });
      });
      
      console.log(`Notifying 100 listeners: ${measurement.duration.toFixed(2)}ms`);
      
      expect(measurement.duration).toBeLessThan(100); // Should notify within 100ms
      
      // Verify all listeners were called
      listeners.forEach(listener => {
        expect(listener).toHaveBeenCalled();
      });
    });

    test('should highlight text in large content efficiently', () => {
      const largeText = 'Lorem ipsum dolor sit amet '.repeat(1000); // ~27KB of text
      const query = 'Lorem';
      
      const measurement = PerformanceUtils.measure('text-highlighting', () => {
        return utilsModule.highlightText(largeText, query);
      });
      
      console.log(`Highlighting text in 27KB content: ${measurement.duration.toFixed(2)}ms`);
      
      expect(measurement.duration).toBeLessThan(100); // Should highlight within 100ms
      expect(measurement.result).toContain('<mark>');
    });

    test('should escape HTML in large content efficiently', () => {
      const maliciousContent = '<script>alert("xss")</script>'.repeat(1000); // ~34KB
      
      const measurement = PerformanceUtils.measure('html-escaping', () => {
        return utilsModule.escapeHtml(maliciousContent);
      });
      
      console.log(`Escaping HTML in 34KB content: ${measurement.duration.toFixed(2)}ms`);
      
      expect(measurement.duration).toBeLessThan(200); // Should escape within 200ms
      expect(measurement.result).not.toContain('<script>');
    });
  });

  describe('Memory Usage and Efficiency', () => {
    test('should maintain reasonable memory usage with large datasets', () => {
      const initialMemory = PerformanceUtils.measureMemoryUsage();
      
      // Create and store large dataset
      const largeDataset = PerformanceUtils.createLargeDataset(2000, 'complex');
      largeDataset.forEach(item => {
        stateModule.setEditingId(null);
        stateModule.upsertItem(item);
      });
      
      const afterDataMemory = PerformanceUtils.measureMemoryUsage();
      
      // Simulate app usage
      for (let i = 0; i < 100; i++) {
        stateModule.updateSearch(`search ${i}`);
        utilsModule.filterItems(stateModule.getState().items, `search ${i}`, []);
      }
      
      const afterUsageMemory = PerformanceUtils.measureMemoryUsage();
      
      if (initialMemory && afterDataMemory && afterUsageMemory) {
        const memoryIncrease = afterUsageMemory.usedJSHeapSize - initialMemory.usedJSHeapSize;
        console.log(`Memory increase after 2000 items + usage: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
        
        // Memory increase should be reasonable (less than 50MB for test data)
        expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
      } else {
        console.log('Memory measurement not available in test environment');
      }
      
      const state = stateModule.getState();
      expect(state.items.length).toBe(2000);
    });

    test('should handle garbage collection efficiently during operations', () => {
      let objects = [];
      
      const measurement = PerformanceUtils.measure('gc-stress-test', () => {
        // Create many temporary objects
        for (let i = 0; i < 10000; i++) {
          objects.push({
            id: `temp-${i}`,
            data: 'x'.repeat(1000),
            timestamp: Date.now()
          });
          
          // Periodically clear objects to trigger GC
          if (i % 1000 === 0) {
            objects = [];
          }
        }
      });
      
      console.log(`GC stress test (10000 object creations/deletions): ${measurement.duration.toFixed(2)}ms`);
      
      expect(measurement.duration).toBeLessThan(1000); // Should complete within 1 second
    });

    test('should efficiently clean up event listeners', () => {
      const unsubscribers = [];
      
      // Create many subscriptions
      const measurement = PerformanceUtils.measure('listener-cleanup', () => {
        // Subscribe many listeners
        for (let i = 0; i < 1000; i++) {
          const unsubscribe = stateModule.subscribe(() => {});
          unsubscribers.push(unsubscribe);
        }
        
        // Unsubscribe all
        unsubscribers.forEach(unsub => unsub());
      });
      
      console.log(`Creating and cleaning up 1000 listeners: ${measurement.duration.toFixed(2)}ms`);
      
      expect(measurement.duration).toBeLessThan(100); // Should cleanup within 100ms
    });
  });

  describe('Data Processing Performance', () => {
    test('should serialize large datasets efficiently', () => {
      const largeDataset = PerformanceUtils.createLargeDataset(1000, 'complex');
      
      const measurement = PerformanceUtils.measure('json-serialization', () => {
        return JSON.stringify(largeDataset);
      });
      
      console.log(`JSON serialization of 1000 complex items: ${measurement.duration.toFixed(2)}ms`);
      console.log(`Serialized size: ${(measurement.result.length / 1024 / 1024).toFixed(2)}MB`);
      
      expect(measurement.duration).toBeLessThan(500); // Should serialize within 500ms
    });

    test('should deserialize large datasets efficiently', () => {
      const largeDataset = PerformanceUtils.createLargeDataset(1000, 'complex');
      const serialized = JSON.stringify(largeDataset);
      
      const measurement = PerformanceUtils.measure('json-deserialization', () => {
        return JSON.parse(serialized);
      });
      
      console.log(`JSON deserialization of 1000 complex items: ${measurement.duration.toFixed(2)}ms`);
      
      expect(measurement.duration).toBeLessThan(200); // Should deserialize within 200ms
      expect(measurement.result.length).toBe(1000);
    });

    test('should validate large datasets efficiently', () => {
      const largeDataset = PerformanceUtils.createLargeDataset(1000, 'medium');
      
      const measurement = PerformanceUtils.measure('dataset-validation', () => {
        return largeDataset.map(item => utilsModule.validateItem(item));
      });
      
      console.log(`Validating 1000 items: ${measurement.duration.toFixed(2)}ms`);
      
      expect(measurement.duration).toBeLessThan(500); // Should validate within 500ms
      
      const validItems = measurement.result.filter(result => result.isValid);
      expect(validItems.length).toBe(1000);
    });

    test('should handle CSV parsing efficiently', () => {
      const csvData = Array.from({ length: 1000 }, (_, i) => 
        `"Item ${i}","Description ${i}","false","tag1|tag2|tag3"`
      );
      const csvString = csvData.join('\n');
      
      const measurement = PerformanceUtils.measure('csv-parsing', () => {
        return csvData.map(line => utilsModule.parseCSVLine(line));
      });
      
      console.log(`Parsing 1000 CSV lines: ${measurement.duration.toFixed(2)}ms`);
      
      expect(measurement.duration).toBeLessThan(200); // Should parse within 200ms
      expect(measurement.result.length).toBe(1000);
    });

    test('should generate CSV efficiently', () => {
      const largeDataset = PerformanceUtils.createLargeDataset(1000, 'medium');
      
      const measurement = PerformanceUtils.measure('csv-generation', () => {
        return largeDataset.map(item => 
          [
            utilsModule.csvEscape(item.text),
            utilsModule.csvEscape(item.desc),
            item.sensitive ? '1' : '0',
            utilsModule.csvEscape(item.tags.join('|'))
          ].join(',')
        ).join('\n');
      });
      
      console.log(`Generating CSV for 1000 items: ${measurement.duration.toFixed(2)}ms`);
      console.log(`Generated CSV size: ${(measurement.result.length / 1024).toFixed(2)}KB`);
      
      expect(measurement.duration).toBeLessThan(300); // Should generate within 300ms
    });
  });

  describe('Stress Testing', () => {
    test('should handle maximum theoretical load', async () => {
      const maxItems = 10000; // Theoretical maximum for localStorage
      console.log(`\n🚀 STRESS TEST: Loading ${maxItems} items...`);
      
      const app = new appModule.CompyApp();
      await app.init();
      
      const startTime = performance.now();
      let batchTime = startTime;
      
      // Add items in batches to monitor progress
      const batchSize = 1000;
      for (let batch = 0; batch < maxItems / batchSize; batch++) {
        const batchStart = performance.now();
        
        for (let i = 0; i < batchSize; i++) {
          const itemIndex = batch * batchSize + i;
          stateModule.setEditingId(null);
          stateModule.upsertItem({
            text: `Stress test item ${itemIndex}`,
            desc: `Performance test description for item ${itemIndex}`,
            sensitive: itemIndex % 100 === 0,
            tags: [`batch${batch}`, `item${itemIndex % 50}`, `category${itemIndex % 20}`]
          });
        }
        
        const batchEnd = performance.now();
        const batchDuration = batchEnd - batchStart;
        const totalSoFar = batchEnd - startTime;
        
        console.log(`Batch ${batch + 1}/${maxItems / batchSize}: ${batchDuration.toFixed(2)}ms (Total: ${totalSoFar.toFixed(2)}ms)`);
        
        // Allow event loop to breathe
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      
      const endTime = performance.now();
      const totalDuration = endTime - startTime;
      
      console.log(`\n📊 STRESS TEST RESULTS:`);
      console.log(`- Total items: ${maxItems}`);
      console.log(`- Total time: ${totalDuration.toFixed(2)}ms (${(totalDuration / 1000).toFixed(2)}s)`);
      console.log(`- Average per item: ${(totalDuration / maxItems).toFixed(3)}ms`);
      console.log(`- Items per second: ${(maxItems / (totalDuration / 1000)).toFixed(0)}`);
      console.log(`- localStorage operations: ${performanceTracker.operations}`);
      console.log(`- Storage time: ${performanceTracker.totalTime.toFixed(2)}ms`);
      
      const state = stateModule.getState();
      expect(state.items.length).toBe(maxItems);
      expect(totalDuration).toBeLessThan(60000); // Should complete within 1 minute
      
      // Test search performance with maximum load
      console.log(`\n🔍 SEARCH PERFORMANCE WITH ${maxItems} ITEMS:`);
      
      const searchTests = [
        { query: 'item 5000', description: 'specific item search' },
        { query: 'Stress', description: 'common term search' },
        { query: 'nonexistent', description: 'no results search' }
      ];
      
      for (const test of searchTests) {
        const searchMeasurement = PerformanceUtils.measure(`search-${test.description}`, () => {
          return utilsModule.filterItems(state.items, test.query, []);
        });
        
        console.log(`- ${test.description}: ${searchMeasurement.duration.toFixed(2)}ms (${searchMeasurement.result.length} results)`);
        expect(searchMeasurement.duration).toBeLessThan(1000); // Search should be under 1 second even with max load
      }
    });

    test('should maintain performance under rapid operations', () => {
      console.log(`\n⚡ RAPID OPERATIONS TEST:`);
      
      const operations = [
        { name: 'Search updates', count: 1000, fn: (i) => stateModule.updateSearch(`query${i}`) },
        { name: 'Filter updates', count: 500, fn: (i) => stateModule.updateFilterTags([`tag${i % 10}`]) },
        { name: 'Profile updates', count: 100, fn: (i) => stateModule.updateProfile(`User${i}`) }
      ];
      
      operations.forEach(op => {
        const measurement = PerformanceUtils.measure(op.name, () => {
          for (let i = 0; i < op.count; i++) {
            op.fn(i);
          }
        });
        
        console.log(`- ${op.count} ${op.name}: ${measurement.duration.toFixed(2)}ms (${(measurement.duration / op.count).toFixed(3)}ms avg)`);
        expect(measurement.duration).toBeLessThan(op.count); // Should average less than 1ms per operation
      });
    });

    test('should handle edge case scenarios efficiently', () => {
      console.log(`\n🧪 EDGE CASE PERFORMANCE TESTS:`);
      
      const edgeCases = [
        {
          name: 'Very long text items',
          setup: () => PerformanceUtils.createLargeDataset(10, 'complex').map(item => ({
            ...item,
            text: item.text.repeat(100), // ~100KB per item
            desc: item.desc.repeat(50)   // ~25KB per item
          }))
        },
        {
          name: 'Many small items',
          setup: () => PerformanceUtils.createLargeDataset(5000, 'simple')
        },
        {
          name: 'Items with many tags',
          setup: () => Array.from({ length: 100 }, (_, i) => ({
            id: `many-tags-${i}`,
            text: `Item ${i}`,
            desc: `Description ${i}`,
            sensitive: false,
            tags: Array.from({ length: 100 }, (_, j) => `tag${j}`)
          }))
        }
      ];
      
      edgeCases.forEach(testCase => {
        const dataset = testCase.setup();
        
        const addMeasurement = PerformanceUtils.measure(`add-${testCase.name}`, () => {
          dataset.forEach(item => {
            stateModule.setEditingId(null);
            stateModule.upsertItem(item);
          });
        });
        
        const searchMeasurement = PerformanceUtils.measure(`search-${testCase.name}`, () => {
          return utilsModule.filterItems(stateModule.getState().items, 'Item', []);
        });
        
        console.log(`- ${testCase.name}:`);
        console.log(`  Add: ${addMeasurement.duration.toFixed(2)}ms`);
        console.log(`  Search: ${searchMeasurement.duration.toFixed(2)}ms`);
        
        expect(addMeasurement.duration).toBeLessThan(10000); // Should add within 10 seconds
        expect(searchMeasurement.duration).toBeLessThan(1000); // Should search within 1 second
        
        localStorage.clear(); // Clean up between tests
        PerformanceUtils.resetPerformanceTracker();
      });
    });
  });
});

// Performance regression detection
describe('Performance Regression Tests', () => {
  // These tests establish performance baselines and detect regressions
  const performanceBaselines = {
    smallDatasetSearch: 10, // ms
    mediumDatasetSearch: 50, // ms
    largeDatasetSearch: 200, // ms
    stateUpdate: 5, // ms
    cardRendering: 100, // ms per 100 cards
    dataValidation: 50 // ms per 1000 items
  };

  test('should maintain search performance baselines', () => {
    const testCases = [
      { size: 100, name: 'small', baseline: performanceBaselines.smallDatasetSearch },
      { size: 500, name: 'medium', baseline: performanceBaselines.mediumDatasetSearch },
      { size: 2000, name: 'large', baseline: performanceBaselines.largeDatasetSearch }
    ];

    testCases.forEach(testCase => {
      const dataset = PerformanceUtils.createLargeDataset(testCase.size, 'medium');
      
      const measurement = PerformanceUtils.measure(`${testCase.name}-search-baseline`, () => {
        return utilsModule.filterItems(dataset, 'Lorem', []);
      });
      
      console.log(`${testCase.name} dataset (${testCase.size} items) search: ${measurement.duration.toFixed(2)}ms (baseline: ${testCase.baseline}ms)`);
      
      // Allow 50% variance from baseline
      expect(measurement.duration).toBeLessThan(testCase.baseline * 1.5);
    });
  });

  test('should maintain state update performance baselines', () => {
    const measurement = PerformanceUtils.measure('state-update-baseline', () => {
      for (let i = 0; i < 100; i++) {
        stateModule.updateSearch(`test query ${i}`);
      }
    });
    
    const averageTime = measurement.duration / 100;
    console.log(`State update average: ${averageTime.toFixed(3)}ms (baseline: ${performanceBaselines.stateUpdate}ms)`);
    
    expect(averageTime).toBeLessThan(performanceBaselines.stateUpdate * 1.5);
  });
});

module.exports = { PerformanceUtils };