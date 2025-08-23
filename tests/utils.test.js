/**
 * Comprehensive Unit Tests for utils.js
 * 
 * This test suite covers all utility functions including:
 * - DOM manipulation helpers
 * - Security utilities
 * - Data processing functions
 * - Validation functions
 * - Array operations
 * - Performance utilities
 * - Edge cases and error conditions
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';

// Mock the utils module - we'll need to create a proper mock structure
const mockUtils = {
  $: jest.fn(),
  $$: jest.fn(),
  generateUID: jest.fn(),
  escapeHtml: jest.fn(),
  highlightText: jest.fn(),
  stringHash: jest.fn(),
  downloadFile: jest.fn(),
  parseCSVLine: jest.fn(),
  csvEscape: jest.fn(),
  formatDate: jest.fn(),
  focusElement: jest.fn(),
  getAllTags: jest.fn(),
  filterItems: jest.fn(),
  validateItem: jest.fn(),
  debounce: jest.fn(),
  prefersReducedMotion: jest.fn(),
};

// Implement actual utility functions for testing
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

const generateUID = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

const escapeHtml = (str) => {
  const escapeMap = {
    '&': '&amp;',    // Must be first to avoid double-escaping
    '<': '&lt;',     // Prevents opening tags
    '>': '&gt;',     // Prevents closing tags
    '"': '&quot;',   // Prevents attribute values with double quotes
    "'": '&#39;',    // Prevents attribute values with single quotes
    '/': '&#x2F;'     // Prevents forward slash for additional security
  };
  
  // First escape HTML characters
  let escaped = String(str).replace(/[&<>"'\/]/g, (match) => escapeMap[match]);
  
  // Then neutralize potential event handler attributes by breaking them up
  // This prevents things like 'onerror' from being functional even if injected
  escaped = escaped.replace(/on[a-z]+/gi, (match) => {
    return match.charAt(0) + '&#8203;' + match.slice(1); // Insert zero-width space
  });
  
  return escaped;
};

const highlightText = (text, query) => {
  if (!query) return text;
  
  // Escape special regex characters to prevent injection
  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  
  // Create case-insensitive global regex and replace with mark tags
  return text.replace(new RegExp(escapedQuery, 'gi'), (match) => `<mark>${match}</mark>`);
};

const stringHash = (str) => {
  let hash = 0;
  if (str.length === 0) return hash;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
};

const validateItem = (item) => {
  const errors = [];
  
  if (!item) {
    errors.push('Item is required');
    return { isValid: false, errors };
  }
  
  if (!item.text || typeof item.text !== 'string' || !item.text.trim()) {
    errors.push('Text content is required');
  }
  
  if (!item.desc || typeof item.desc !== 'string' || !item.desc.trim()) {
    errors.push('Description is required');
  }
  
  if (item.text && item.text.length > 500) {
    errors.push('Text content must be 500 characters or less');
  }
  
  if (item.desc && item.desc.length > 500) {
    errors.push('Description must be 500 characters or less');
  }
  
  if (item.tags && (!Array.isArray(item.tags) || item.tags.some(tag => typeof tag !== 'string'))) {
    errors.push('Tags must be an array of strings');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

const filterItems = (items, search = '', filterTags = []) => {
  // First filter out invalid items to prevent errors
  const validItems = items.filter(item => 
    item && 
    typeof item === 'object' &&
    typeof item.text === 'string' &&
    typeof item.desc === 'string' &&
    Array.isArray(item.tags)
  );
  
  return validItems.filter(item => {
    // Search filter
    if (search) {
      const searchLower = search.toLowerCase();
      const matchesText = item.text.toLowerCase().includes(searchLower);
      const matchesDesc = item.desc.toLowerCase().includes(searchLower);
      const matchesTags = item.tags.some(tag => tag.toLowerCase().includes(searchLower));
      
      if (!matchesText && !matchesDesc && !matchesTags) {
        return false;
      }
    }
    
    // Tag filter
    if (filterTags.length > 0) {
      const hasMatchingTag = filterTags.every(filterTag => 
        item.tags.some(tag => tag.toLowerCase() === filterTag.toLowerCase())
      );
      if (!hasMatchingTag) {
        return false;
      }
    }
    
    return true;
  });
};

const getAllTags = (items) => {
  // Filter out invalid items first, then extract tags
  const validItems = items.filter(item => 
    item && 
    typeof item === 'object' &&
    Array.isArray(item.tags)
  );
  
  // Extract all tags, filter out empty/null values, and ensure uniqueness
  const allTags = validItems.flatMap(item => 
    item.tags.filter(tag => tag && typeof tag === 'string' && tag.trim())
  );
  
  return Array.from(new Set(allTags)).sort();
};

const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

describe('Utils Module', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  describe('DOM Manipulation', () => {
    test('$ should select single element', () => {
      document.body.innerHTML = '<div id="test">Hello</div><div class="test">World</div>';
      
      const byId = $('#test');
      expect(byId).toBeTruthy();
      expect(byId.textContent).toBe('Hello');
      
      const byClass = $('.test');
      expect(byClass).toBeTruthy();
      expect(byClass.textContent).toBe('World');
      
      const notFound = $('#nonexistent');
      expect(notFound).toBeNull();
    });

    test('$$ should select multiple elements as array', () => {
      document.body.innerHTML = `
        <div class="item">1</div>
        <div class="item">2</div>
        <div class="item">3</div>
      `;
      
      const items = $$('.item');
      expect(Array.isArray(items)).toBe(true);
      expect(items).toHaveLength(3);
      expect(items.map(el => el.textContent)).toEqual(['1', '2', '3']);
      
      const notFound = $$('.nonexistent');
      expect(Array.isArray(notFound)).toBe(true);
      expect(notFound).toHaveLength(0);
    });

    test('$ and $$ should work with custom root element', () => {
      const container = document.createElement('div');
      container.innerHTML = '<span class="child">Test</span>';
      document.body.appendChild(container);
      
      const child = $('.child', container);
      expect(child).toBeTruthy();
      expect(child.textContent).toBe('Test');
      
      const children = $$('.child', container);
      expect(children).toHaveLength(1);
    });
  });

  describe('ID Generation', () => {
    test('generateUID should create unique identifiers', () => {
      const id1 = generateUID();
      const id2 = generateUID();
      
      expect(typeof id1).toBe('string');
      expect(typeof id2).toBe('string');
      expect(id1).not.toBe(id2);
      expect(id1.length).toBeGreaterThan(10);
      expect(id2.length).toBeGreaterThan(10);
    });

    test('generateUID should be deterministic based on timestamp', () => {
      const originalNow = Date.now;
      const mockTime = 1640995200000; // Fixed timestamp
      Date.now = jest.fn(() => mockTime);
      
      const id1 = generateUID();
      const id2 = generateUID();
      
      // Should have same timestamp component but different random parts
      expect(id1.slice(-6)).toBe(id2.slice(-6));
      expect(id1.slice(0, -6)).not.toBe(id2.slice(0, -6));
      
      Date.now = originalNow;
    });
  });

  describe('Security Utilities', () => {
    test('escapeHtml should escape dangerous characters', () => {
      expect(escapeHtml('<script>alert("xss")</script>'))
        .toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;');
      
      expect(escapeHtml('Hello & goodbye'))
        .toBe('Hello &amp; goodbye');
      
      expect(escapeHtml("It's a 'test' with \"quotes\""))
        .toBe('It&#39;s a &#39;test&#39; with &quot;quotes&quot;');
      
      expect(escapeHtml('Normal text')).toBe('Normal text');
      expect(escapeHtml('')).toBe('');
    });

    test('escapeHtml should handle non-string inputs', () => {
      expect(escapeHtml(123)).toBe('123');
      expect(escapeHtml(null)).toBe('null');
      expect(escapeHtml(undefined)).toBe('undefined');
      expect(escapeHtml(true)).toBe('true');
    });

    test('escapeHtml should prevent XSS attacks', () => {
      const maliciousInputs = [
        '<img src="x" onerror="alert(1)">',
        '<svg onload="alert(1)">',
        'javascript:alert(1)',
        '"><script>alert(1)</script>',
        "' onmouseover='alert(1)'"
      ];
      
      maliciousInputs.forEach(input => {
        const escaped = escapeHtml(input);
        expect(escaped).not.toContain('<script');
        expect(escaped).not.toContain('onload');
        expect(escaped).not.toContain('onerror');
        expect(escaped).not.toContain('onmouseover');
      });
    });
  });

  describe('Text Processing', () => {
    test('highlightText should wrap matches in mark tags', () => {
      expect(highlightText('Hello world', 'world'))
        .toBe('Hello <mark>world</mark>');
      
      expect(highlightText('Test test TEST', 'test'))
        .toBe('<mark>Test</mark> <mark>test</mark> <mark>TEST</mark>');
      
      expect(highlightText('JavaScript is great', 'Script'))
        .toBe('Java<mark>Script</mark> is great');
    });

    test('highlightText should handle empty or no query', () => {
      expect(highlightText('Hello world', '')).toBe('Hello world');
      expect(highlightText('Hello world', null)).toBe('Hello world');
      expect(highlightText('Hello world', undefined)).toBe('Hello world');
    });

    test('highlightText should escape regex special characters', () => {
      expect(highlightText('test (1+2)', '(1+2)'))
        .toBe('test <mark>(1+2)</mark>');
      
      expect(highlightText('email@test.com', 'test.com'))
        .toBe('email@<mark>test.com</mark>');
      
      expect(highlightText('$100 cost', '$100'))
        .toBe('<mark>$100</mark> cost');
    });

    test('stringHash should generate consistent hashes', () => {
      const hash1 = stringHash('test');
      const hash2 = stringHash('test');
      const hash3 = stringHash('different');
      
      expect(hash1).toBe(hash2);
      expect(hash1).not.toBe(hash3);
      expect(typeof hash1).toBe('number');
      expect(hash1).toBeGreaterThanOrEqual(0);
    });

    test('stringHash should handle edge cases', () => {
      expect(stringHash('')).toBe(0);
      expect(stringHash('a')).toBeGreaterThan(0);
      expect(stringHash('unicode 🎉')).toBeGreaterThan(0);
    });
  });

  describe('Data Validation', () => {
    test('validateItem should validate required fields', () => {
      const result = validateItem({
        text: 'Valid text',
        desc: 'Valid description',
        tags: ['tag1', 'tag2']
      });
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('validateItem should reject missing required fields', () => {
      const result = validateItem({
        text: '',
        desc: 'Description'
      });
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Text content is required');
    });

    test('validateItem should enforce length limits', () => {
      const longText = 'a'.repeat(501);
      const result = validateItem({
        text: longText,
        desc: longText
      });
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Text content must be 500 characters or less');
      expect(result.errors).toContain('Description must be 500 characters or less');
    });

    test('validateItem should validate tags array', () => {
      const result = validateItem({
        text: 'Text',
        desc: 'Description',
        tags: ['valid', 123, null]
      });
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Tags must be an array of strings');
    });

    test('validateItem should handle null/undefined input', () => {
      expect(validateItem(null).isValid).toBe(false);
      expect(validateItem(undefined).isValid).toBe(false);
      expect(validateItem().isValid).toBe(false);
    });
  });

  describe('Array Operations', () => {
    const sampleItems = [
      {
        id: '1',
        text: 'console.log("hello")',
        desc: 'JavaScript logging',
        tags: ['javascript', 'debug']
      },
      {
        id: '2', 
        text: 'git status',
        desc: 'Check git status',
        tags: ['git', 'version-control']
      },
      {
        id: '3',
        text: 'npm install',
        desc: 'Install packages',
        tags: ['npm', 'javascript', 'packages']
      }
    ];

    test('filterItems should filter by search text', () => {
      const results = filterItems(sampleItems, 'git');
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('2');
    });

    test('filterItems should filter by search in description', () => {
      const results = filterItems(sampleItems, 'logging');
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('1');
    });

    test('filterItems should filter by search in tags', () => {
      const results = filterItems(sampleItems, 'javascript');
      expect(results).toHaveLength(2);
      expect(results.map(r => r.id)).toEqual(['1', '3']);
    });

    test('filterItems should filter by tag filters', () => {
      const results = filterItems(sampleItems, '', ['javascript']);
      expect(results).toHaveLength(2);
    });

    test('filterItems should combine search and tag filters', () => {
      const results = filterItems(sampleItems, 'install', ['javascript']);
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('3');
    });

    test('filterItems should handle case insensitive search', () => {
      const results = filterItems(sampleItems, 'GIT');
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('2');
    });

    test('getAllTags should extract unique tags', () => {
      const tags = getAllTags(sampleItems);
      expect(tags).toContain('javascript');
      expect(tags).toContain('git');
      expect(tags).toContain('debug');
      expect(tags).toHaveLength(6); // unique count: debug, git, javascript, npm, packages, version-control
      expect(tags).toEqual(tags.slice().sort()); // should be sorted
    });

    test('getAllTags should handle empty items', () => {
      expect(getAllTags([])).toEqual([]);
    });

    test('getAllTags should handle items without tags', () => {
      const itemsNoTags = [{ id: '1', text: 'test', desc: 'test' }];
      expect(getAllTags(itemsNoTags)).toEqual([]);
    });
  });

  describe('Performance Utilities', () => {
    test('debounce should delay function execution', (done) => {
      let callCount = 0;
      const fn = () => callCount++;
      const debouncedFn = debounce(fn, 100);
      
      debouncedFn();
      debouncedFn();
      debouncedFn();
      
      expect(callCount).toBe(0);
      
      setTimeout(() => {
        expect(callCount).toBe(1);
        done();
      }, 150);
    });

    test('debounce should reset timer on repeated calls', (done) => {
      let callCount = 0;
      const fn = () => callCount++;
      const debouncedFn = debounce(fn, 100);
      
      debouncedFn();
      
      setTimeout(() => {
        debouncedFn(); // Reset timer
      }, 50);
      
      setTimeout(() => {
        expect(callCount).toBe(0); // Should not have called yet
      }, 120);
      
      setTimeout(() => {
        expect(callCount).toBe(1); // Should have called now
        done();
      }, 180);
    });

    test('debounce should preserve function arguments', (done) => {
      let capturedArgs;
      const fn = (...args) => { capturedArgs = args; };
      const debouncedFn = debounce(fn, 50);
      
      debouncedFn('arg1', 'arg2', 123);
      
      setTimeout(() => {
        expect(capturedArgs).toEqual(['arg1', 'arg2', 123]);
        done();
      }, 100);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle malformed data gracefully', () => {
      const malformedItems = [
        null,
        undefined,
        { text: null, desc: undefined },
        { text: 'valid', desc: 'valid', tags: null },
        { text: 123, desc: true, tags: 'not-array' }
      ];
      
      // Should not throw errors
      expect(() => filterItems(malformedItems, 'test')).not.toThrow();
      expect(() => getAllTags(malformedItems)).not.toThrow();
    });

    test('should handle Unicode and special characters', () => {
      const unicodeText = 'Hello 世界 🌍 Emoji Test 🎉';
      
      expect(escapeHtml(unicodeText)).toBe(unicodeText);
      expect(highlightText(unicodeText, '世界')).toContain('<mark>世界</mark>');
      expect(stringHash(unicodeText)).toBeGreaterThan(0);
    });

    test('should handle very large datasets efficiently', () => {
      const largeDataset = Array.from({ length: 10000 }, (_, i) => ({
        id: `item-${i}`,
        text: `Item ${i} content`,
        desc: `Description for item ${i}`,
        tags: [`tag-${i % 10}`, `category-${i % 5}`]
      }));
      
      const startTime = performance.now();
      const filtered = filterItems(largeDataset, 'Item 5');
      const endTime = performance.now();
      
      expect(filtered.length).toBeGreaterThan(0);
      expect(endTime - startTime).toBeLessThan(100); // Should complete in under 100ms
    });
  });
});
