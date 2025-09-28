/**
 * Security Test Setup for Compy 2.0
 */

require('./jest.setup.js');

global.securityTestUtils = {
  // Generate various attack payloads
  generateAttackPayloads: () => ({
    xss: [
      '<script>alert("XSS")</script>',
      '"><script>alert("XSS")</script>',
      'javascript:alert("XSS")',
      '<img src="x" onerror="alert(\'XSS\')">',
      '<svg onload="alert(\'XSS\')">',
      '${alert("XSS")}'
    ],
    injection: [
      "'; DROP TABLE users; --",
      '" OR "1"="1',
      '${7*7}',
      '{{7*7}}',
      '<%= 7*7 %>'
    ],
    pathTraversal: [
      '../../../etc/passwd',
      '..\\..\\..\\windows\\system32\\drivers\\etc\\hosts',
      '/etc/passwd',
      '\\etc\\passwd'
    ],
    prototype: [
      '{"__proto__": {"isAdmin": true}}',
      'constructor.prototype.isAdmin = true',
      '__proto__.isAdmin = true'
    ]
  }),
  
  // Test input sanitization
  testInputSanitization: (sanitizeFunction, input, shouldBlock = true) => {
    const result = sanitizeFunction(input);
    
    if (shouldBlock) {
      expect(result).not.toContain('<script>');
      expect(result).not.toContain('javascript:');
      expect(result).not.toContain('onload');
      expect(result).not.toContain('onerror');
    }
    
    return result;
  }
};

console.log('🧪 Security test setup completed');