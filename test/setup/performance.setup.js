/**
 * Performance Test Setup for Compy 2.0
 */

require('./jest.setup.js');

global.performanceTestUtils = {
  // Benchmark functions
  benchmark: (name, fn, iterations = 1000) => {
    const times = [];
    
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      fn();
      const end = performance.now();
      times.push(end - start);
    }
    
    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    
    return {
      name,
      iterations,
      averageTime: avgTime,
      minTime,
      maxTime,
      totalTime: times.reduce((a, b) => a + b, 0)
    };
  },
  
  // Memory usage tracking (mock for Node.js environment)
  trackMemoryUsage: (fn) => {
    const startMemory = process.memoryUsage();
    const result = fn();
    const endMemory = process.memoryUsage();
    
    return {
      result,
      memoryDelta: {
        heapUsed: endMemory.heapUsed - startMemory.heapUsed,
        heapTotal: endMemory.heapTotal - startMemory.heapTotal,
        external: endMemory.external - startMemory.external
      }
    };
  },
  
  // Performance baselines
  baselines: {
    searchTime: 100, // ms for 1000 items
    renderTime: 50,  // ms for 100 cards
    stateUpdateTime: 5 // ms per update
  }
};

console.log('🧪 Performance test setup completed');