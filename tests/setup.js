/**
 * Jest Test Setup File
 * 
 * This file runs before each test to set up the testing environment.
 * It provides global mocks, DOM setup, and common test utilities.
 */

import { jest, beforeEach, afterEach } from '@jest/globals';

// Mock localStorage with proper implementation
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: jest.fn((key) => store[key] || null),
    setItem: jest.fn((key, value) => { store[key] = value.toString(); }),
    removeItem: jest.fn((key) => { delete store[key]; }),
    clear: jest.fn(() => { store = {}; })
  };
})();

// Mock sessionStorage with proper implementation
const sessionStorageMock = (() => {
  let store = {};
  return {
    getItem: jest.fn((key) => store[key] || null),
    setItem: jest.fn((key, value) => { store[key] = value.toString(); }),
    removeItem: jest.fn((key) => { delete store[key]; }),
    clear: jest.fn(() => { store = {}; })
  };
})();

// Properly assign to global with defineProperty to ensure Jest can spy
Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true
});

Object.defineProperty(global, 'sessionStorage', {
  value: sessionStorageMock,
  writable: true
});

// Mock navigator.clipboard
global.navigator.clipboard = {
  writeText: jest.fn().mockResolvedValue(),
  readText: jest.fn().mockResolvedValue('mocked text'),
};

// Mock performance API
global.performance.now = jest.fn(() => Date.now());
global.performance.memory = {
  usedJSHeapSize: 1000000,
  totalJSHeapSize: 2000000,
  jsHeapSizeLimit: 4000000,
};

// Mock requestAnimationFrame
global.requestAnimationFrame = jest.fn((cb) => setTimeout(cb, 16));
global.cancelAnimationFrame = jest.fn((id) => clearTimeout(id));

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock execCommand for clipboard fallback
document.execCommand = jest.fn().mockReturnValue(true);

// Setup DOM for tests
beforeEach(() => {
  // Reset DOM
  document.body.innerHTML = '';
  document.head.innerHTML = '';
  
  // Clear localStorage mocks
  localStorageMock.getItem.mockClear();
  localStorageMock.setItem.mockClear();
  localStorageMock.removeItem.mockClear();
  localStorageMock.clear.mockClear();
  
  // Clear sessionStorage mocks
  sessionStorageMock.getItem.mockClear();
  sessionStorageMock.setItem.mockClear();
  sessionStorageMock.removeItem.mockClear();
  sessionStorageMock.clear.mockClear();
  
  // Clear clipboard mocks
  global.navigator.clipboard.writeText.mockClear();
  global.navigator.clipboard.readText.mockClear();
  
  // Reset execCommand mock
  document.execCommand.mockClear();
  document.execCommand.mockReturnValue(true);
  
  // Reset console methods to avoid test pollution
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

// Cleanup after each test
afterEach(() => {
  // Restore console methods
  jest.restoreAllMocks();
});

// Global test utilities
global.createMockElement = (tag, attributes = {}) => {
  const element = document.createElement(tag);
  Object.assign(element, attributes);
  return element;
};

global.createMockEvent = (type, properties = {}) => {
  const event = new Event(type);
  Object.assign(event, properties);
  return event;
};

// Mock fetch for potential future API tests
global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  status: 200,
  json: jest.fn().mockResolvedValue({}),
  text: jest.fn().mockResolvedValue(''),
});
