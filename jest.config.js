/**
 * Jest Configuration for Compy 2.0
 * 
 * Comprehensive Jest setup for all test suites with proper mocking,
 * coverage reporting, and performance optimization.
 */

module.exports = {
  // Test environment
  testEnvironment: 'node',
  
  // Root directories for tests and source code
  rootDir: './',
  testMatch: [
    '<rootDir>/test/**/*.test.js',
    '<rootDir>/test/**/*.spec.js'
  ],
  
  // Module paths
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/js/$1',
    '^@test/(.*)$': '<rootDir>/test/$1'
  },
  
  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/test/setup/simple.setup.js'
  ],
  
  // Coverage configuration
  collectCoverage: false, // Enable via --coverage flag
  coverageDirectory: '<rootDir>/test/coverage',
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'json',
    'lcov'
  ],
  
  // Files to collect coverage from
  collectCoverageFrom: [
    'js/**/*.js',
    '!js/vendor/**',
    '!js/lib/**',
    '!**/*.min.js',
    '!**/node_modules/**',
    '!**/test/**'
  ],
  
  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 85,
      lines: 90,
      statements: 90
    },
    // Critical files require higher coverage
    './js/state.js': {
      branches: 90,
      functions: 95,
      lines: 95,
      statements: 95
    },
    './js/utils.js': {
      branches: 90,
      functions: 95,
      lines: 95,
      statements: 95
    },
    './js/app.js': {
      branches: 85,
      functions: 90,
      lines: 90,
      statements: 90
    }
  },
  
  // Module file extensions
  moduleFileExtensions: [
    'js',
    'json',
    'html'
  ],
  
  // Transform files
  transform: {
    '^.+\\.js$': 'babel-jest'
  },
  
  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/',
    '\\.cache'
  ],
  
  
  // Global test timeout
  testTimeout: 30000,
  
  // Verbose output
  verbose: true,
  
  // Clear mocks between tests
  clearMocks: true,
  restoreMocks: true,
  
  // Error handling
  errorOnDeprecated: true,
  
  // Parallel test execution
  maxWorkers: '50%',
  
  // Test result processor
  reporters: [
    'default',
    [
      'jest-html-reporters',
      {
        publicPath: './test/reports',
        filename: 'test-report.html',
        expand: true,
        hideIcon: false,
        pageTitle: 'Compy 2.0 Test Report'
      }
    ]
  ],
  
  // Global variables available in tests
  globals: {
    'process.env.NODE_ENV': 'test',
    'TEST_ENVIRONMENT': true
  },
  
  // Simplified configuration without projects
  testTimeout: 30000
};