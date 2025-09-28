/**
 * End-to-End Test Setup for Compy 2.0
 */

require('./jest.setup.js');

global.e2eTestUtils = {
  // Simulate full application lifecycle
  simulateFullAppLifecycle: async () => {
    // This would typically start the app, run user scenarios, and clean up
    return {
      started: true,
      interactions: [],
      completed: true
    };
  },
  
  // Simulate user interactions with timing
  simulateUserInteractionsWithTiming: async (interactions) => {
    const results = [];
    
    for (const interaction of interactions) {
      await new Promise(resolve => setTimeout(resolve, interaction.delay || 100));
      const result = await interaction.action();
      results.push(result);
    }
    
    return results;
  }
};

console.log('🧪 E2E test setup completed');