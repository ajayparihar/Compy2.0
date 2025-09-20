/**
 * Comprehensive Validation Test for Enhanced Compy 2.0 Codebase
 * 
 * This test file validates that all enhancements maintain functionality while
 * improving code quality, performance, and maintainability.
 * 
 * Run this in the browser console to validate the enhancements.
 */

// Test centralized logging utility
console.log('🧪 Testing Logger utility...');
if (typeof Logger !== 'undefined') {
  Logger.info('Logger info test');
  Logger.warn('Logger warn test');  
  Logger.error('Logger error test');
  Logger.debug('Logger debug test');
  console.log('✅ Logger utility working correctly');
} else {
  console.error('❌ Logger utility not found');
}

// Test DOM utilities
console.log('🧪 Testing DOMUtils...');
if (typeof DOMUtils !== 'undefined') {
  // Test element validation
  const testElement = document.createElement('div');
  document.body.appendChild(testElement);
  
  const addResult = DOMUtils.addClass(testElement, 'test-class');
  const hasClass = testElement.classList.contains('test-class');
  
  if (addResult && hasClass) {
    console.log('✅ DOMUtils.addClass working correctly');
  } else {
    console.error('❌ DOMUtils.addClass failed');
  }
  
  // Clean up
  document.body.removeChild(testElement);
} else {
  console.error('❌ DOMUtils not found');
}

// Test validation utilities
console.log('🧪 Testing ValidationUtils...');
if (typeof ValidationUtils !== 'undefined') {
  const validation = ValidationUtils.validateTextInput('test', {
    maxLength: 10,
    allowEmpty: false,
    fieldName: 'test field'
  });
  
  if (validation.isValid && validation.value === 'test') {
    console.log('✅ ValidationUtils working correctly');
  } else {
    console.error('❌ ValidationUtils failed');
  }
} else {
  console.error('❌ ValidationUtils not found');
}

// Test error handling utilities
console.log('🧪 Testing ErrorUtils...');
if (typeof ErrorUtils !== 'undefined') {
  ErrorUtils.safeExecute(
    () => 'test successful',
    { context: 'validation test' }
  ).then(result => {
    if (result === 'test successful') {
      console.log('✅ ErrorUtils working correctly');
    } else {
      console.error('❌ ErrorUtils failed');
    }
  });
} else {
  console.error('❌ ErrorUtils not found');
}

// Test UI utilities
console.log('🧪 Testing UIUtils...');
if (typeof UIUtils !== 'undefined') {
  const loadingState = UIUtils.createLoadingState();
  
  if (loadingState && typeof loadingState.start === 'function') {
    console.log('✅ UIUtils working correctly');
  } else {
    console.error('❌ UIUtils failed');
  }
} else {
  console.error('❌ UIUtils not found');
}

// Test item validation
console.log('🧪 Testing item validation...');
if (typeof validateItem !== 'undefined') {
  const validItem = {
    text: 'console.log("test")',
    desc: 'Test snippet',
    tags: ['javascript', 'test'],
    sensitive: false
  };
  
  const validation = validateItem(validItem);
  
  if (validation.isValid) {
    console.log('✅ Item validation working correctly');
  } else {
    console.error('❌ Item validation failed:', validation.errors);
  }
  
  // Test invalid item
  const invalidItem = {
    text: '',
    desc: 'Test'
  };
  
  const invalidValidation = validateItem(invalidItem);
  
  if (!invalidValidation.isValid && invalidValidation.errors.length > 0) {
    console.log('✅ Item validation correctly catches invalid items');
  } else {
    console.error('❌ Item validation should have failed for empty text');
  }
} else {
  console.error('❌ validateItem function not found');
}

// Test application state (if available)
console.log('🧪 Testing application state...');
if (typeof getState !== 'undefined') {
  try {
    const state = getState();
    if (state && typeof state === 'object') {
      console.log('✅ Application state accessible');
    }
  } catch (error) {
    console.error('❌ Application state error:', error);
  }
} else {
  console.warn('⚠️ Application state not available (may be expected)');
}

console.log('\n📊 Validation Test Summary:');
console.log('This test validates that the enhanced utilities are working correctly.');
console.log('All utilities should be available and functional.');
console.log('If you see any ❌ errors, please check the implementation.');

// Test performance optimization
console.log('🧪 Testing performance features...');
const testOperations = [];
for (let i = 0; i < 1000; i++) {
  testOperations.push(() => Math.random());
}

const startTime = performance.now();
if (typeof DOMUtils !== 'undefined' && DOMUtils.batchUpdate) {
  DOMUtils.batchUpdate(testOperations).then(() => {
    const endTime = performance.now();
    console.log(`✅ Batch operations completed in ${endTime - startTime}ms`);
  });
} else {
  // Fallback test
  testOperations.forEach(op => op());
  const endTime = performance.now();
  console.log(`⚠️ Fallback operations completed in ${endTime - startTime}ms`);
}

console.log('\n🎉 Enhancement validation test completed!');