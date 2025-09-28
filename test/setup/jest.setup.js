/**
 * Global Jest Setup for Compy 2.0 Tests
 * 
 * This file configures the global testing environment, mocks, and utilities
 * that are available across all test suites.
 */

// Add polyfills for Node.js v22
if (!global.TextEncoder) {
  global.TextEncoder = require('util').TextEncoder;
}
if (!global.TextDecoder) {
  global.TextDecoder = require('util').TextDecoder;
}

const { JSDOM } = require('jsdom');

// Set up DOM environment
const dom = new JSDOM(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Compy 2.0 Test Environment</title>
  <style>
    /* Basic styles for testing */
    .hidden { display: none; }
    .visible { display: block; }
    .card { padding: 10px; margin: 5px; }
    .sensitive { background: #ffe6e6; }
  </style>
</head>
<body>
  <div id="app">
    <div id="cards-container"></div>
    <div id="search-input"></div>
    <div id="profile-display"></div>
    <div class="modal-overlay" id="modal-overlay"></div>
  </div>
</body>
</html>`);

// Set up globals
global.document = dom.window.document;
global.window = dom.window;
global.navigator = dom.window.navigator;
global.HTMLElement = dom.window.HTMLElement;
global.Element = dom.window.Element;

// Mock performance API
global.performance = {
  now: jest.fn(() => Date.now()),
  mark: jest.fn(),
  measure: jest.fn(),
  getEntriesByName: jest.fn(() => []),
  getEntriesByType: jest.fn(() => []),
  memory: {
    usedJSHeapSize: 1000000,
    totalJSHeapSize: 2000000,
    jsHeapSizeLimit: 4000000
  }
};

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  
  return {
    getItem: jest.fn((key) => store[key] || null),
    setItem: jest.fn((key, value) => {
      store[key] = value.toString();
    }),
    removeItem: jest.fn((key) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: jest.fn((index) => Object.keys(store)[index] || null)
  };
})();

global.localStorage = localStorageMock;
global.sessionStorage = localStorageMock; // Use same mock for session storage

// Mock console methods for cleaner test output
const originalConsole = { ...console };
global.console = {
  ...originalConsole,
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
};

// Restore console for specific tests if needed
global.restoreConsole = () => {
  global.console = originalConsole;
};

// Mock timers
jest.useFakeTimers();

// Mock clipboard API
global.navigator.clipboard = {
  writeText: jest.fn(() => Promise.resolve()),
  readText: jest.fn(() => Promise.resolve('')),
  write: jest.fn(() => Promise.resolve()),
  read: jest.fn(() => Promise.resolve([]))
};

// Mock fetch for potential API calls
global.fetch = jest.fn(() =>
  Promise.resolve({
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
    ok: true,
    status: 200
  })
);

// Mock file system operations (for import/export tests)
global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
global.URL.revokeObjectURL = jest.fn();

// Mock drag and drop API
global.DataTransfer = function() {
  return {
    dropEffect: 'none',
    effectAllowed: 'uninitialized',
    files: [],
    items: [],
    types: [],
    clearData: jest.fn(),
    getData: jest.fn(() => ''),
    setData: jest.fn(),
    setDragImage: jest.fn()
  };
};

// Mock SortableJS if used
global.Sortable = {
  create: jest.fn(() => ({
    destroy: jest.fn(),
    option: jest.fn(),
    toArray: jest.fn(() => [])
  })),
  utils: {
    on: jest.fn(),
    off: jest.fn(),
    css: jest.fn(),
    find: jest.fn()
  }
};

// Test utilities available globally
global.testUtils = {
  // Create a mock DOM element
  createElement: (tag, attributes = {}, textContent = '') => {
    const element = document.createElement(tag);
    Object.assign(element, attributes);
    if (textContent) element.textContent = textContent;
    return element;
  },

  // Simulate user interactions
  simulateClick: (element) => {
    const event = new dom.window.MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      view: dom.window
    });
    element.dispatchEvent(event);
  },

  simulateKeydown: (element, key, options = {}) => {
    const event = new dom.window.KeyboardEvent('keydown', {
      key,
      bubbles: true,
      cancelable: true,
      ...options
    });
    element.dispatchEvent(event);
  },

  simulateInput: (element, value) => {
    element.value = value;
    const event = new dom.window.Event('input', {
      bubbles: true,
      cancelable: true
    });
    element.dispatchEvent(event);
  },

  // Wait for async operations
  waitFor: async (condition, timeout = 5000) => {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      if (await condition()) return;
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    throw new Error(`Condition not met within ${timeout}ms`);
  },

  // Create test data
  createTestItem: (overrides = {}) => ({
    id: `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    text: 'Test snippet content',
    desc: 'Test description',
    sensitive: false,
    tags: ['test'],
    position: 0,
    ...overrides
  }),

  createTestItems: (count = 5) => {
    return Array.from({ length: count }, (_, i) => 
      global.testUtils.createTestItem({
        text: `Test item ${i + 1}`,
        desc: `Description for item ${i + 1}`,
        tags: [`tag${i % 3}`, 'common'],
        position: i
      })
    );
  },

  // Mock state for testing
  mockState: {
    items: [],
    search: '',
    filterTags: [],
    profile: 'Test User',
    editingId: null,
    theme: 'default'
  },

  // Clean up after tests
  cleanup: () => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Reset localStorage
    localStorage.clear();
    
    // Reset DOM
    document.body.innerHTML = '<div id="app"><div id="cards-container"></div></div>';
    
    // Reset timers
    jest.clearAllTimers();
  },

  // Performance testing helpers
  measurePerformance: (name, fn) => {
    const start = performance.now();
    const result = fn();
    const end = performance.now();
    
    return {
      result,
      duration: end - start,
      name
    };
  },

  // Security testing helpers
  createMaliciousInput: (type = 'xss') => {
    const payloads = {
      xss: '<script>alert("XSS")</script>',
      html: '<img src="x" onerror="alert(1)">',
      sql: "'; DROP TABLE users; --",
      path: '../../../etc/passwd',
      prototype: '{"__proto__": {"isAdmin": true}}'
    };
    
    return payloads[type] || payloads.xss;
  }
};

// Setup for different test environments
beforeEach(() => {
  // Clear mocks but preserve structure
  jest.clearAllMocks();
  
  // Reset DOM to clean state
  document.body.innerHTML = `
    <div id="app">
      <div id="cards-container"></div>
      <input id="search-input" />
      <div id="profile-display"></div>
      <div class="modal-overlay" id="modal-overlay" style="display: none;"></div>
    </div>
  `;
  
  // Reset localStorage
  localStorage.clear();
  
  // Reset performance counters
  performance.now.mockClear();
});

afterEach(() => {
  // Clean up timers
  jest.runOnlyPendingTimers();
  
  // Clean up any remaining mocks
  global.testUtils.cleanup();
});

// Global error handler for unhandled promises
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Increase timeout for async operations
jest.setTimeout(30000);

console.log('🧪 Jest setup completed - Test environment ready');