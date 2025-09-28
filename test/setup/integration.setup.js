/**
 * Integration Test Setup for Compy 2.0
 * 
 * Additional setup specifically for integration tests
 */

require('./jest.setup.js');

// Integration test utilities
global.integrationTestUtils = {
  // Set up app with initial state
  setupAppWithState: (initialState = {}) => {
    const defaultState = {
      items: [],
      search: '',
      filterTags: [],
      profile: 'Test User',
      editingId: null,
      theme: 'default',
      ...initialState
    };
    
    // Store in localStorage to simulate real app state
    localStorage.setItem('compy.items', JSON.stringify(defaultState.items));
    localStorage.setItem('compy.profile', defaultState.profile);
    localStorage.setItem('compy.theme', defaultState.theme);
    
    return defaultState;
  },
  
  // Simulate complete user workflows
  simulateUserWorkflow: async (steps) => {
    const results = [];
    
    for (const step of steps) {
      const result = await step();
      results.push(result);
    }
    
    return results;
  },
  
  // Wait for DOM changes
  waitForDOMChange: async (selector, timeout = 5000) => {
    return global.testUtils.waitFor(() => {
      const element = document.querySelector(selector);
      return element !== null;
    }, timeout);
  }
};

console.log('🧪 Integration test setup completed');