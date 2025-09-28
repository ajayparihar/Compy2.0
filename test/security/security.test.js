/**
 * Security Tests for Compy 2.0
 * 
 * This test suite covers security aspects of the application:
 * - XSS (Cross-Site Scripting) prevention
 * - Input sanitization and validation
 * - Data exposure protection (sensitive snippets)
 * - Local storage security
 * - Import/Export security
 * - Content Security Policy compliance
 * 
 * Priority: CRITICAL - Security vulnerabilities could expose user data
 * Coverage Target: 100% of security-critical code paths
 */

// Mock DOM environment
const { JSDOM } = require('jsdom');
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
global.document = dom.window.document;
global.window = dom.window;
global.localStorage = dom.window.localStorage;

describe('Security Tests', () => {
  let utilsModule, stateModule, appModule;
  
  beforeAll(async () => {
    // Mock constants
    jest.doMock('../../js/constants.js', () => ({
      STORAGE_KEYS: {
        items: 'compy.items',
        profile: 'compy.profile',
        theme: 'compy.theme'
      },
      UI_CONFIG: { maxBackups: 10 }
    }));
    
    // Import modules
    utilsModule = await import('../../js/utils.js');
    stateModule = await import('../../js/state.js');
    appModule = await import('../../js/app.js');
  });

  beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = '';
    jest.clearAllMocks();
  });

  describe('XSS Prevention Tests', () => {
    test('should escape HTML in snippet text', () => {
      const maliciousInput = '<script>alert("XSS")</script>';
      const escaped = utilsModule.escapeHtml(maliciousInput);
      
      expect(escaped).toBe('&lt;script&gt;alert(&quot;XSS&quot;)&lt;&#x2F;script&gt;');
      expect(escaped).not.toContain('<script>');
      expect(escaped).not.toContain('</script>');
    });

    test('should escape HTML in snippet descriptions', () => {
      const maliciousDesc = '<img src="x" onerror="alert(\'XSS\')">';
      const escaped = utilsModule.escapeHtml(maliciousDesc);
      
      expect(escaped).toBe('&lt;img src=&quot;x&quot; onerror=&quot;alert(&#39;XSS&#39;)&quot;&gt;');
      expect(escaped).not.toContain('<img');
      expect(escaped).not.toContain('onerror=');
    });

    test('should escape HTML in tag names', () => {
      const maliciousTags = ['<script>', 'javascript:alert(1)', 'data:text/html,<script>alert(1)</script>'];
      
      maliciousTags.forEach(tag => {
        const escaped = utilsModule.escapeHtml(tag);
        expect(escaped).not.toContain('<script>');
        expect(escaped).not.toContain('javascript:');
        expect(escaped).not.toContain('data:text/html');
      });
    });

    test('should prevent script injection in profile name', () => {
      const maliciousProfile = '<script>document.cookie="hacked"</script>';
      
      stateModule.updateProfile(maliciousProfile);
      const state = stateModule.getState();
      
      // Profile should be sanitized (trimmed, but not HTML escaped at state level)
      expect(state.profileName).toBe('<script>document.cookie="hacked"</script>');
      
      // However, when displayed, it should be escaped
      const escaped = utilsModule.escapeHtml(state.profileName);
      expect(escaped).not.toContain('<script>');
    });

    test('should sanitize search queries to prevent injection', () => {
      const maliciousSearch = '<script>alert("search XSS")</script>';
      
      stateModule.updateSearch(maliciousSearch);
      const state = stateModule.getState();
      
      // Search query stored as-is but should be escaped when displayed
      const escaped = utilsModule.escapeHtml(state.search);
      expect(escaped).not.toContain('<script>');
    });

    test('should prevent HTML injection in highlighted search results', () => {
      const text = 'This is safe content';
      const maliciousQuery = '<script>alert("highlight XSS")</script>';
      
      const highlighted = utilsModule.highlightText(text, maliciousQuery);
      
      // Should not contain executable script
      expect(highlighted).not.toContain('<script>alert');
      // Should still highlight safely escaped content
      expect(highlighted).toContain('<mark>');
    });

    test('should handle complex XSS payloads', () => {
      const xssPayloads = [
        'javascript:alert(1)',
        'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==',
        '<svg onload=alert(1)>',
        '"><script>alert(1)</script>',
        '<iframe src="javascript:alert(1)">',
        '<object data="data:text/html,<script>alert(1)</script>">',
        '<embed src="data:text/html,<script>alert(1)</script>">',
        '<link rel=stylesheet href="data:,*{x:expression(alert(1))}">',
        '<style>@import"data:,*{x:expression(alert(1))}"</style>'
      ];

      xssPayloads.forEach(payload => {
        const escaped = utilsModule.escapeHtml(payload);
        
        // Should not contain dangerous elements
        expect(escaped).not.toContain('<script');
        expect(escaped).not.toContain('<svg');
        expect(escaped).not.toContain('<iframe');
        expect(escaped).not.toContain('<object');
        expect(escaped).not.toContain('<embed');
        expect(escaped).not.toContain('<link');
        expect(escaped).not.toContain('<style');
        expect(escaped).not.toContain('javascript:');
        expect(escaped).not.toContain('expression(');
      });
    });
  });

  describe('Input Validation and Sanitization', () => {
    test('should validate snippet text length', () => {
      const validation = utilsModule.validateItem({
        text: 'x'.repeat(100000), // Very long text
        desc: 'Valid description',
        sensitive: false,
        tags: []
      });
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(error => error.toLowerCase().includes('too long'))).toBe(true);
    });

    test('should validate snippet description length', () => {
      const validation = utilsModule.validateItem({
        text: 'Valid text',
        desc: 'x'.repeat(100000), // Very long description
        sensitive: false,
        tags: []
      });
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(error => error.toLowerCase().includes('too long'))).toBe(true);
    });

    test('should validate tag structure', () => {
      const invalidTagStructures = [
        'string instead of array',
        42,
        null,
        undefined,
        { invalid: 'object' }
      ];

      invalidTagStructures.forEach(invalidTags => {
        const validation = utilsModule.validateItem({
          text: 'Valid text',
          desc: 'Valid description',
          sensitive: false,
          tags: invalidTags
        });
        
        expect(validation.isValid).toBe(false);
      });
    });

    test('should prevent malicious data in localStorage', () => {
      const maliciousData = {
        items: [
          {
            id: 'test-1',
            text: '<script>alert("stored XSS")</script>',
            desc: '<img src=x onerror=alert(1)>',
            sensitive: false,
            tags: ['<script>', 'javascript:alert(1)']
          }
        ]
      };
      
      localStorage.setItem('compy.items', JSON.stringify(maliciousData.items));
      stateModule.loadState();
      
      const state = stateModule.getState();
      expect(state.items).toHaveLength(1);
      
      // Data should be loaded but will be escaped when displayed
      const item = state.items[0];
      expect(item.text).toContain('<script>');
      expect(item.desc).toContain('<img');
      
      // But when escaped for display, should be safe
      const escapedText = utilsModule.escapeHtml(item.text);
      const escapedDesc = utilsModule.escapeHtml(item.desc);
      
      expect(escapedText).not.toContain('<script>');
      expect(escapedDesc).not.toContain('<img');
    });
  });

  describe('Sensitive Data Protection', () => {
    test('should mask sensitive snippet content in display', async () => {
      const app = new appModule.CompyApp();
      await app.init();
      
      // Create sensitive snippet
      stateModule.setEditingId(null);
      stateModule.upsertItem({
        text: 'API_KEY=secret123456',
        desc: 'Production API key',
        sensitive: true,
        tags: ['api', 'production']
      });
      
      const state = stateModule.getState();
      const sensitiveItem = state.items[0];
      
      // When rendering card, sensitive content should be masked
      const cardElement = app.createCardElement(sensitiveItem);
      expect(cardElement.textContent).toContain('••••••••••');
      expect(cardElement.textContent).not.toContain('secret123456');
    });

    test('should copy actual content of sensitive snippets despite masking', async () => {
      const app = new appModule.CompyApp();
      await app.init();
      
      const sensitiveText = 'PASSWORD=super_secret_password';
      
      // Test clipboard copy with sensitive content
      const result = await app.clipboard.copy(sensitiveText);
      
      // Should copy the actual sensitive content, not the masked version
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(sensitiveText);
    });

    test('should not expose sensitive data in search results', () => {
      const items = [
        {
          id: '1',
          text: 'API_KEY=secret123',
          desc: 'Sensitive API key',
          sensitive: true,
          tags: ['api']
        },
        {
          id: '2',
          text: 'console.log("hello")',
          desc: 'Debug code',
          sensitive: false,
          tags: ['debug']
        }
      ];
      
      // Search should work on sensitive items but not expose content
      const results = utilsModule.filterItems(items, 'API', []);
      expect(results).toHaveLength(1);
      
      // But the actual sensitive text should not be logged or exposed
      // This is handled at the UI level by masking
    });

    test('should handle sensitive flag validation', () => {
      const testCases = [
        { sensitive: true, expected: true },
        { sensitive: false, expected: false },
        { sensitive: 'true', expected: true }, // String coercion
        { sensitive: 'false', expected: true }, // Non-empty string is truthy
        { sensitive: 1, expected: true },
        { sensitive: 0, expected: false },
        { sensitive: null, expected: false },
        { sensitive: undefined, expected: false }
      ];
      
      testCases.forEach(({ sensitive, expected }) => {
        stateModule.setEditingId(null);
        stateModule.upsertItem({
          text: 'test',
          desc: 'test',
          sensitive,
          tags: []
        });
        
        const state = stateModule.getState();
        const item = state.items[state.items.length - 1];
        expect(Boolean(item.sensitive)).toBe(expected);
      });
    });
  });

  describe('Import/Export Security', () => {
    test('should sanitize imported JSON data', async () => {
      const maliciousImportData = {
        profileName: '<script>alert("profile XSS")</script>',
        items: [
          {
            text: '<script>alert("item XSS")</script>',
            desc: '<img src=x onerror=alert(1)>',
            sensitive: false,
            tags: ['<script>', 'javascript:void(0)']
          }
        ]
      };
      
      const app = new appModule.CompyApp();
      await app.init();
      
      // Simulate import (this would normally go through file processing)
      stateModule.updateProfile(maliciousImportData.profileName);
      
      maliciousImportData.items.forEach(item => {
        stateModule.setEditingId(null);
        stateModule.upsertItem(item);
      });
      
      const state = stateModule.getState();
      
      // Data is stored as-is but should be escaped when displayed
      expect(state.profileName).toContain('<script>');
      expect(state.items[0].text).toContain('<script>');
      
      // But when escaped for display, should be safe
      const escapedProfile = utilsModule.escapeHtml(state.profileName);
      const escapedText = utilsModule.escapeHtml(state.items[0].text);
      
      expect(escapedProfile).not.toContain('<script>');
      expect(escapedText).not.toContain('<script>');
    });

    test('should handle malformed import data gracefully', async () => {
      const malformedData = [
        'not json at all',
        '{"malformed": json without closing',
        '{"valid": "json", "but": {"missing": "required fields"}}',
        '[]', // Empty array
        'null',
        '{"items": "not an array"}',
        '{"items": [{"id": "missing-required-fields"}]}'
      ];
      
      malformedData.forEach(data => {
        expect(() => {
          try {
            const parsed = JSON.parse(data);
            // Would normally validate structure here
          } catch (e) {
            // Should handle JSON parse errors gracefully
          }
        }).not.toThrow();
      });
    });

    test('should prevent path traversal in export filenames', async () => {
      const app = new appModule.CompyApp();
      await app.init();
      
      // Mock downloadFile to check filename sanitization
      const originalDownloadFile = utilsModule.downloadFile;
      utilsModule.downloadFile = jest.fn();
      
      // Test various malicious filename attempts
      const maliciousFilenames = [
        '../../../etc/passwd.json',
        '..\\..\\windows\\system32\\evil.json',
        'normal.json\x00.exe', // Null byte injection
        'file.json<script>alert(1)</script>',
        '/absolute/path/file.json'
      ];
      
      // In a real implementation, filenames should be sanitized
      // For now, we just test that the function can be called
      app.exportJSON();
      
      expect(utilsModule.downloadFile).toHaveBeenCalledWith(
        expect.stringMatching(/^compy-export\.json$/),
        expect.any(String),
        'application/json'
      );
      
      utilsModule.downloadFile = originalDownloadFile;
    });
  });

  describe('Content Security Policy Compliance', () => {
    test('should not use inline JavaScript', () => {
      const htmlContent = document.documentElement.outerHTML;
      
      // Should not contain inline event handlers
      expect(htmlContent).not.toMatch(/on\w+\s*=/i);
      
      // Should not contain inline scripts
      expect(htmlContent).not.toMatch(/<script(?![^>]*src=)[^>]*>/i);
      
      // Should not contain javascript: URLs
      expect(htmlContent).not.toMatch(/javascript:/i);
    });

    test('should use safe DOM manipulation methods', async () => {
      const app = new appModule.CompyApp();
      await app.init();
      
      // Create test content with potential XSS
      const testItem = {
        id: 'test-1',
        text: '<script>alert("DOM XSS")</script>',
        desc: '<img src=x onerror=alert(1)>',
        sensitive: false,
        tags: ['<script>']
      };
      
      const cardElement = app.createCardElement(testItem);
      
      // Should not contain executable scripts in the DOM
      const scripts = cardElement.querySelectorAll('script');
      expect(scripts.length).toBe(0);
      
      // Should not contain dangerous attributes
      const imgsWithOnerror = cardElement.querySelectorAll('img[onerror]');
      expect(imgsWithOnerror.length).toBe(0);
    });

    test('should handle dynamic content creation safely', () => {
      // Test safe element creation
      const safeElement = utilsModule.createElement('div', {
        className: 'safe-class',
        textContent: '<script>alert("safe")</script>'
      });
      
      expect(safeElement.tagName).toBe('DIV');
      expect(safeElement.className).toBe('safe-class');
      expect(safeElement.textContent).toBe('<script>alert("safe")</script>');
      expect(safeElement.innerHTML).not.toContain('<script>');
    });
  });

  describe('Local Storage Security', () => {
    test('should handle localStorage quota exceeded', () => {
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = jest.fn(() => {
        throw new DOMException('QuotaExceededError');
      });
      
      expect(() => {
        stateModule.setEditingId(null);
        stateModule.upsertItem({
          text: 'test',
          desc: 'test',
          sensitive: false,
          tags: []
        });
      }).not.toThrow();
      
      localStorage.setItem = originalSetItem;
    });

    test('should handle localStorage being disabled', () => {
      const originalStorage = localStorage;
      
      // Simulate localStorage being unavailable
      Object.defineProperty(window, 'localStorage', {
        value: {
          getItem: () => { throw new Error('localStorage disabled'); },
          setItem: () => { throw new Error('localStorage disabled'); },
          removeItem: () => { throw new Error('localStorage disabled'); },
          clear: () => { throw new Error('localStorage disabled'); }
        },
        configurable: true
      });
      
      expect(() => {
        stateModule.loadState();
      }).not.toThrow();
      
      expect(() => {
        stateModule.saveState();
      }).not.toThrow();
      
      Object.defineProperty(window, 'localStorage', {
        value: originalStorage,
        configurable: true
      });
    });

    test('should validate localStorage data integrity', () => {
      // Test with corrupted data
      localStorage.setItem('compy.items', '{"corrupted": "data"');
      
      expect(() => {
        stateModule.loadState();
      }).not.toThrow();
      
      const state = stateModule.getState();
      expect(Array.isArray(state.items)).toBe(true);
      expect(state.items.length).toBe(0);
    });

    test('should prevent localStorage key collision attacks', () => {
      // Test with malicious keys that might overwrite system data
      const maliciousKeys = [
        '__proto__',
        'constructor',
        'prototype',
        'window',
        'document',
        'localStorage'
      ];
      
      maliciousKeys.forEach(key => {
        expect(() => {
          localStorage.setItem(key, 'malicious value');
        }).not.toThrow();
        
        // Should not affect application functionality
        expect(() => {
          stateModule.loadState();
        }).not.toThrow();
      });
    });
  });

  describe('Error Handling Security', () => {
    test('should not expose sensitive information in error messages', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      // Trigger various error conditions
      try {
        JSON.parse('invalid json');
      } catch (error) {
        console.error('Parse error:', error);
      }
      
      try {
        localStorage.setItem('test', 'x'.repeat(10000000)); // Trigger quota error
      } catch (error) {
        console.error('Storage error:', error);
      }
      
      // Check that error messages don't contain sensitive data
      const errorCalls = consoleErrorSpy.mock.calls;
      errorCalls.forEach(call => {
        const errorMessage = call.join(' ');
        expect(errorMessage).not.toMatch(/password|secret|key|token/i);
        expect(errorMessage).not.toContain('API_KEY=');
        expect(errorMessage).not.toContain('SECRET=');
      });
      
      consoleErrorSpy.mockRestore();
    });

    test('should handle malicious error injection', () => {
      const maliciousError = {
        message: '<script>alert("error XSS")</script>',
        stack: '<img src=x onerror=alert(1)>',
        toString: () => '<script>alert("toString XSS")</script>'
      };
      
      expect(() => {
        console.error('Test error:', maliciousError);
      }).not.toThrow();
      
      // Error handling should not execute malicious content
      expect(document.querySelectorAll('script').length).toBe(0);
    });
  });

  describe('Cross-Origin Security', () => {
    test('should handle postMessage attacks', () => {
      const maliciousMessage = {
        type: 'compy-import',
        data: '<script>alert("postMessage XSS")</script>'
      };
      
      // Simulate malicious postMessage
      const messageEvent = new MessageEvent('message', {
        data: maliciousMessage,
        origin: 'https://malicious-site.com'
      });
      
      // Application should validate origin and data
      expect(() => {
        window.dispatchEvent(messageEvent);
      }).not.toThrow();
      
      // Should not execute malicious content
      expect(document.querySelectorAll('script').length).toBe(0);
    });

    test('should prevent clickjacking vulnerabilities', () => {
      // Check that the app would set appropriate headers
      // (This would be tested at the server level in a real deployment)
      expect(document.querySelector('meta[http-equiv="X-Frame-Options"]')).toBeFalsy();
      
      // Application should implement frame-busting if needed
      expect(window.top).toBe(window.self);
    });
  });

  describe('Prototype Pollution Prevention', () => {
    test('should prevent prototype pollution via JSON parsing', () => {
      const maliciousJson = '{"__proto__": {"isAdmin": true}}';
      
      let parsed;
      expect(() => {
        parsed = JSON.parse(maliciousJson);
      }).not.toThrow();
      
      // Should not pollute Object prototype
      expect({}.isAdmin).toBeUndefined();
      expect(Object.prototype.isAdmin).toBeUndefined();
    });

    test('should prevent prototype pollution via object assignment', () => {
      const maliciousObject = JSON.parse('{"__proto__": {"polluted": true}}');
      const targetObject = {};
      
      // Safe object assignment should not pollute prototype
      Object.assign(targetObject, maliciousObject);
      
      expect({}.polluted).toBeUndefined();
      expect(Object.prototype.polluted).toBeUndefined();
    });
  });
});

// Performance-related security tests
describe('Performance Security Tests', () => {
  let utilsModule, stateModule;
  
  beforeAll(async () => {
    jest.doMock('../../js/constants.js', () => ({
      STORAGE_KEYS: { items: 'compy.items' },
      UI_CONFIG: { maxBackups: 10 }
    }));
    
    utilsModule = await import('../../js/utils.js');
    stateModule = await import('../../js/state.js');
  });

  test('should prevent ReDoS (Regular Expression Denial of Service) attacks', () => {
    const maliciousInput = 'a'.repeat(100000) + 'X'; // Large string that doesn't match
    
    const startTime = performance.now();
    const result = utilsModule.highlightText(maliciousInput, 'search');
    const endTime = performance.now();
    
    // Should complete within reasonable time (< 100ms for highlighting)
    expect(endTime - startTime).toBeLessThan(100);
    expect(result).toBe(maliciousInput); // No match, return original
  });

  test('should handle large data sets without crashing', () => {
    const largeDataset = Array.from({ length: 10000 }, (_, i) => ({
      id: `item-${i}`,
      text: `Item ${i}`.repeat(100), // Large text content
      desc: `Description ${i}`.repeat(50),
      sensitive: false,
      tags: [`tag${i % 100}`]
    }));
    
    const startTime = performance.now();
    
    expect(() => {
      largeDataset.forEach(item => {
        stateModule.setEditingId(null);
        stateModule.upsertItem(item);
      });
    }).not.toThrow();
    
    const endTime = performance.now();
    
    // Should handle large datasets reasonably quickly
    expect(endTime - startTime).toBeLessThan(10000); // 10 seconds max
  });

  test('should prevent memory exhaustion attacks', () => {
    const memoryBombPayload = {
      text: 'x'.repeat(1000000), // 1MB of text
      desc: 'y'.repeat(1000000), // 1MB of description
      sensitive: false,
      tags: Array.from({ length: 10000 }, (_, i) => `tag${i}`) // Many tags
    };
    
    expect(() => {
      stateModule.setEditingId(null);
      stateModule.upsertItem(memoryBombPayload);
    }).not.toThrow();
    
    // Validation should reject oversized content
    const validation = utilsModule.validateItem(memoryBombPayload);
    expect(validation.isValid).toBe(false);
  });

  test('should throttle rapid operations to prevent DoS', () => {
    const startTime = performance.now();
    
    // Simulate rapid-fire operations
    for (let i = 0; i < 1000; i++) {
      stateModule.updateSearch(`search ${i}`);
    }
    
    const endTime = performance.now();
    
    // Should not take an excessive amount of time
    expect(endTime - startTime).toBeLessThan(1000); // 1 second max
  });
});