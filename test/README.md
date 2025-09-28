# 🧪 Compy 2.0 Testing Suite

This directory contains a comprehensive testing infrastructure for Compy 2.0, designed to ensure code quality, performance, and security through automated testing.

## 📋 Test Suite Overview

Our testing strategy covers five key areas:

### 1. **Unit Tests** (`/unit/`)
- **Purpose**: Test individual functions and modules in isolation
- **Coverage Target**: ≥95% for critical modules
- **Files**: 
  - `state.test.js` - State management functions
  - `utils.test.js` - Utility functions
- **Runtime**: ~10 seconds

### 2. **Integration Tests** (`/integration/`)
- **Purpose**: Test component interactions and workflows
- **Coverage Target**: ≥90% of integration points
- **Files**:
  - `app.integration.test.js` - Full app integration scenarios
- **Runtime**: ~30 seconds

### 3. **End-to-End Tests** (`/e2e/`)
- **Purpose**: Test complete user workflows and scenarios
- **Coverage**: Critical user journeys
- **Files**:
  - `e2e.test.js` - User workflow testing
- **Runtime**: ~60 seconds

### 4. **Security Tests** (`/security/`)
- **Purpose**: Validate security measures and vulnerability prevention
- **Coverage**: XSS, injection, data validation
- **Files**:
  - `security.test.js` - Security vulnerability tests
- **Runtime**: ~30 seconds

### 5. **Performance Tests** (`/performance/`)
- **Purpose**: Benchmark performance and detect regressions
- **Coverage**: Speed, memory, scalability
- **Files**:
  - `performance.test.js` - Performance benchmarks
- **Runtime**: ~5 minutes (includes stress tests)

## 🚀 Quick Start

### Prerequisites
```bash
# Install dependencies
npm install

# Or if you prefer yarn
yarn install
```

### Running Tests

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:unit
npm run test:integration
npm run test:e2e
npm run test:security
npm run test:performance

# Run with coverage
npm run test:coverage

# Watch mode for development
npm run test:watch
```

### Advanced Usage

```bash
# Run tests in CI mode
npm run test:ci

# Debug tests
npm run test:debug

# Generate detailed reports
node test/test-runner.js --verbose --coverage
```

## 📊 Test Configuration

### Jest Configuration
- **Environment**: jsdom (simulates browser)
- **Coverage Thresholds**: 
  - Global: 90% lines, 85% functions, 80% branches
  - Critical files: 95% coverage required
- **Timeout**: 30s default, 5min for performance tests

### Environment Setup
Each test suite has dedicated setup files in `/setup/`:
- `jest.setup.js` - Global test environment
- `unit.setup.js` - Unit test specific setup
- `integration.setup.js` - Integration test helpers
- `e2e.setup.js` - End-to-end test utilities
- `security.setup.js` - Security testing tools
- `performance.setup.js` - Performance measurement utilities

## 🎯 Test Writing Guidelines

### Unit Tests
```javascript
// Example unit test
describe('utils - escapeHtml', () => {
  test('should escape HTML special characters', () => {
    const input = '<script>alert("xss")</script>';
    const result = escapeHtml(input);
    expect(result).not.toContain('<script>');
    expect(result).toContain('&lt;script&gt;');
  });
});
```

### Integration Tests
```javascript
// Example integration test
describe('App Integration', () => {
  test('should handle complete item creation workflow', async () => {
    const app = new CompyApp();
    await app.init();
    
    // Simulate user actions
    const item = await app.createItem({ text: 'Test', desc: 'Description' });
    expect(item.id).toBeDefined();
    
    // Verify state changes
    const state = getState();
    expect(state.items).toContainEqual(expect.objectContaining({ text: 'Test' }));
  });
});
```

### Performance Tests
```javascript
// Example performance test
describe('Performance', () => {
  test('should search large datasets efficiently', () => {
    const largeDataset = createLargeDataset(1000);
    
    const measurement = measurePerformance('search', () => {
      return filterItems(largeDataset, 'query', []);
    });
    
    expect(measurement.duration).toBeLessThan(100); // 100ms threshold
  });
});
```

## 📈 Coverage Requirements

### Global Targets
- **Lines**: 90%
- **Functions**: 85%
- **Branches**: 80%
- **Statements**: 90%

### File-Specific Targets
- `state.js`: 95% (critical business logic)
- `utils.js`: 95% (shared utilities)
- `app.js`: 90% (main application)

### Coverage Reports
Generated in `/coverage/` with multiple formats:
- HTML: Interactive coverage explorer
- JSON: Machine-readable coverage data
- LCOV: For CI/CD integration
- Text: Console output summary

## 🔐 Security Testing

### XSS Prevention
```javascript
test('should prevent XSS in user input', () => {
  const maliciousInput = '<script>alert("xss")</script>';
  const sanitized = sanitizeInput(maliciousInput);
  expect(sanitized).not.toContain('<script>');
});
```

### Input Validation
- Test boundary conditions
- Validate data type enforcement
- Check for prototype pollution
- Verify path traversal prevention

## ⚡ Performance Benchmarks

### Current Baselines
- **App Initialization**: <1000ms
- **Search (1000 items)**: <100ms
- **State Update**: <5ms
- **Card Rendering (100 items)**: <200ms
- **Memory Usage**: <50MB increase

### Stress Testing
- **Maximum Items**: 10,000 items
- **Concurrent Operations**: 1,000 operations
- **Memory Stress**: 100 GC cycles

## 🛠️ Test Infrastructure

### Test Runner (`test-runner.js`)
- Orchestrates all test suites
- Provides unified reporting
- Handles test prioritization
- Supports parallel execution

### Report Generator (`test-report-generator.js`)
Generates comprehensive reports:
- **HTML Report**: Interactive dashboard
- **JSON Report**: Machine-readable data
- **Markdown Report**: Documentation-friendly
- **Executive Summary**: High-level overview

### Utilities
- **DOM Simulation**: JSDOM environment
- **Mock Services**: localStorage, clipboard, etc.
- **Test Helpers**: Data generation, assertions
- **Performance Tools**: Benchmarking utilities

## 📊 Continuous Integration

### CI Configuration
```yaml
# Example GitHub Actions
- name: Run Tests
  run: npm run test:ci
  
- name: Upload Coverage
  uses: codecov/codecov-action@v1
  with:
    file: ./test/coverage/lcov.info
```

### Quality Gates
- All tests must pass
- Coverage thresholds must be met
- No critical security issues
- Performance within baselines

## 🎯 Test Maintenance

### Adding New Tests
1. Choose appropriate test type (unit/integration/e2e)
2. Follow naming conventions: `feature.test.js`
3. Include setup/teardown as needed
4. Update coverage targets if needed

### Updating Tests
- Keep tests in sync with code changes
- Update mocks when APIs change
- Revise performance baselines quarterly
- Review security tests for new threats

### Debugging Tests
```bash
# Debug specific test
npm run test:debug -- --testNamePattern="specific test name"

# Run with verbose output
npm test -- --verbose

# Run single file
npm test -- state.test.js
```

## 📝 Best Practices

### Test Structure
1. **Arrange**: Set up test data and mocks
2. **Act**: Execute the code under test
3. **Assert**: Verify the expected outcome

### Naming Conventions
- Test files: `*.test.js`
- Describe blocks: Feature or module name
- Test cases: "should [expected behavior]"

### Mock Strategy
- Mock external dependencies
- Use real implementations for unit under test
- Prefer spies over stubs when possible

### Performance Testing
- Run performance tests in isolation
- Use consistent test environments
- Monitor trends over time
- Set realistic baselines

## 🚨 Troubleshooting

### Common Issues

#### Tests Timing Out
```bash
# Increase timeout
jest --testTimeout=60000
```

#### Memory Issues
```bash
# Run tests sequentially
jest --runInBand
```

#### Coverage Issues
```bash
# Generate detailed coverage
npm run test:coverage -- --verbose
```

### Environment Problems
- Ensure Node.js ≥16.0.0
- Clear Jest cache: `jest --clearCache`
- Check for port conflicts
- Verify mock configurations

## 📞 Support

### Getting Help
1. Check this README
2. Review test examples
3. Consult Jest documentation
4. Create an issue for bugs

### Contributing
1. Follow existing patterns
2. Add tests for new features
3. Maintain coverage standards
4. Update documentation

---

## 🏆 Quality Metrics

The testing suite ensures:
- ✅ **High Coverage**: >90% code coverage
- ✅ **Fast Execution**: Most tests complete in seconds
- ✅ **Security Validation**: XSS and injection prevention
- ✅ **Performance Monitoring**: Continuous benchmarking
- ✅ **Maintainability**: Clear structure and documentation

**Last Updated**: Generated automatically with each test run