/**
 * Simple Jest Setup for Basic Testing
 * 
 * This is a minimal setup to get tests running initially
 */

// Add polyfills for Node.js compatibility
global.TextEncoder = require('util').TextEncoder;
global.TextDecoder = require('util').TextDecoder;

// Basic DOM globals for testing
global.document = {
  createElement: jest.fn(() => ({
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    setAttribute: jest.fn(),
    getAttribute: jest.fn(),
    classList: {
      add: jest.fn(),
      remove: jest.fn(),
      contains: jest.fn(() => false)
    },
    style: {},
    textContent: '',
    innerHTML: ''
  })),
  querySelector: jest.fn(),
  querySelectorAll: jest.fn(() => []),
  getElementById: jest.fn(),
  body: {
    innerHTML: '',
    appendChild: jest.fn(),
    removeChild: jest.fn()
  }
};

// Create a proper localStorage mock
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => { store[key] = value.toString(); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { store = {}; },
    get length() { return Object.keys(store).length; },
    key: (index) => Object.keys(store)[index] || null
  };
})();

global.window = {
  localStorage: localStorageMock,
  location: {
    href: 'http://localhost:3000',
    reload: jest.fn()
  },
  addEventListener: jest.fn(),
  removeEventListener: jest.fn()
};

global.localStorage = localStorageMock;

// Performance API mock with incrementing timestamps
let performanceNowCounter = 0;
global.performance = {
  now: () => Date.now() + (performanceNowCounter++),
  mark: jest.fn(),
  measure: jest.fn(),
  getEntriesByName: jest.fn(() => []),
  getEntriesByType: jest.fn(() => [])
};

// Test utilities
global.testUtils = {
  createTestItem: (overrides = {}) => ({
    id: `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    text: 'Test snippet content',
    desc: 'Test description',
    sensitive: false,
    tags: ['test'],
    position: 0,
    ...overrides
  }),

  cleanup: () => {
    jest.clearAllMocks();
    localStorage.clear();
  }
};

// Basic beforeEach cleanup
beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
});

console.log('🧪 Simple Jest setup completed - Basic test environment ready');