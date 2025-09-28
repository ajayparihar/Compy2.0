/**
 * Unit Test Setup for Compy 2.0
 * 
 * Additional setup specifically for unit tests
 */

// Import global setup
require('./jest.setup.js');

// Unit test specific configuration
beforeEach(() => {
  // Ensure clean state for unit tests
  global.testUtils.cleanup();
  
  // Mock any external dependencies that unit tests shouldn't use
  jest.clearAllMocks();
});

// Unit test utilities
global.unitTestUtils = {
  // Mock module imports
  mockModule: (modulePath, implementation = {}) => {
    jest.doMock(modulePath, () => implementation);
  },
  
  // Spy on module functions
  spyOnModule: (module, functionName) => {
    return jest.spyOn(module, functionName);
  },
  
  // Test isolated functions
  testFunction: (fn, inputs, expectedOutputs) => {
    inputs.forEach((input, index) => {
      expect(fn(input)).toEqual(expectedOutputs[index]);
    });
  }
};

console.log('🧪 Unit test setup completed');