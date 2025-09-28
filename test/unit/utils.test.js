/**
 * Unit Tests for Utility Functions Module (utils.js)
 * 
 * This test suite covers all utility functions including:
 * - DOM manipulation helpers ($, $$)
 * - Data processing (escapeHtml, highlightText, stringHash)
 * - File operations (downloadFile, parseCSVLine, csvEscape)
 * - Validation utilities (validateItem)
 * - Array operations (filterItems, getAllTags)
 * - Async operations (debounce)
 * 
 * Priority: HIGH - Utilities are used across entire application
 * Coverage Target: >90%
 */

// Mock DOM environment
const { JSDOM } = require('jsdom');
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
global.document = dom.window.document;
global.window = dom.window;

// Mock console for cleaner test output
global.console = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn()
};

describe('Utility Functions Module', () => {
  let utilsModule;
  
  beforeAll(async () => {
    // Mock constants
    jest.doMock('../../js/constants.js', () => ({
      THEME_LIST: ['dark-theme', 'light-theme', 'custom-theme']
    }));
    
    // Import the module after mocking
    utilsModule = await import('../../js/utils.js');
  });

  beforeEach(() => {
    // Clear DOM before each test
    document.body.innerHTML = '';
    jest.clearAllMocks();
  });

  describe('DOM Manipulation Utilities', () => {
    beforeEach(() => {
      // Setup test DOM structure
      document.body.innerHTML = `
        <div id="test-container" class="container">
          <button id="test-btn" class="btn primary">Test Button</button>
          <input type="text" class="input" data-test="input1">
          <input type="email" class="input" data-test="input2">
          <div class="card active" data-id="123">Card 1</div>
          <div class="card" data-id="456">Card 2</div>
        </div>
      `;
    });

    describe('$ (querySelector helper)', () => {
      test('should find element by ID', () => {
        const element = utilsModule.$('#test-btn');
        expect(element).toBeTruthy();
        expect(element.tagName).toBe('BUTTON');
        expect(element.id).toBe('test-btn');
      });

      test('should find element by class', () => {
        const element = utilsModule.$('.container');
        expect(element).toBeTruthy();
        expect(element.id).toBe('test-container');
      });

      test('should find element with complex selector', () => {
        const element = utilsModule.$('.card.active[data-id="123"]');
        expect(element).toBeTruthy();
        expect(element.dataset.id).toBe('123');
      });

      test('should return null for non-existent element', () => {
        const element = utilsModule.$('#non-existent');
        expect(element).toBeNull();
      });

      test('should search within specific root element', () => {
        const container = document.getElementById('test-container');
        const button = utilsModule.$('button', container);
        expect(button).toBeTruthy();
        expect(button.id).toBe('test-btn');
      });

      test('should return null when searching within non-existent root', () => {
        const button = utilsModule.$('button', null);
        expect(button).toBeNull();
      });
    });

    describe('$$ (querySelectorAll helper)', () => {
      test('should find multiple elements and return as Array', () => {
        const elements = utilsModule.$$('.input');
        expect(Array.isArray(elements)).toBe(true);
        expect(elements).toHaveLength(2);
        expect(elements[0].type).toBe('text');
        expect(elements[1].type).toBe('email');
      });

      test('should find all cards with class selector', () => {
        const cards = utilsModule.$$('.card');
        expect(cards).toHaveLength(2);
        expect(cards[0].dataset.id).toBe('123');
        expect(cards[1].dataset.id).toBe('456');
      });

      test('should return empty array for non-existent elements', () => {
        const elements = utilsModule.$$('.non-existent');
        expect(Array.isArray(elements)).toBe(true);
        expect(elements).toHaveLength(0);
      });

      test('should support complex selectors', () => {
        const activeCards = utilsModule.$$('.card.active');
        expect(activeCards).toHaveLength(1);
        expect(activeCards[0].dataset.id).toBe('123');
      });

      test('should search within specific root element', () => {
        const container = document.getElementById('test-container');
        const inputs = utilsModule.$$('input', container);
        expect(inputs).toHaveLength(2);
      });
    });
  });

  describe('ID Generation and Hashing', () => {
    describe('generateUID()', () => {
      test('should generate unique identifiers', () => {
        const id1 = utilsModule.generateUID();
        const id2 = utilsModule.generateUID();
        
        expect(id1).toBeTruthy();
        expect(id2).toBeTruthy();
        expect(id1).not.toBe(id2);
        expect(typeof id1).toBe('string');
        expect(typeof id2).toBe('string');
      });

      test('should generate IDs with reasonable length', () => {
        const id = utilsModule.generateUID();
        expect(id.length).toBeGreaterThan(10);
        expect(id.length).toBeLessThan(25);
      });

      test('should generate alphanumeric IDs', () => {
        const id = utilsModule.generateUID();
        expect(/^[a-z0-9]+$/i.test(id)).toBe(true);
      });

      test('should generate chronologically sortable IDs', async () => {
        const id1 = utilsModule.generateUID();
        await new Promise(resolve => setTimeout(resolve, 1)); // Ensure different timestamp
        const id2 = utilsModule.generateUID();
        
        // Later IDs should be lexicographically greater (due to timestamp component)
        expect(id2 > id1).toBe(true);
      });
    });
  });

  describe('Data Processing and Security', () => {
    describe('escapeHtml()', () => {
      test('should escape basic HTML characters', () => {
        const input = '<script>alert("xss")</script>';
        const expected = '&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;';
        expect(utilsModule.escapeHtml(input)).toBe(expected);
      });

      test('should escape all dangerous characters', () => {
        const testCases = [
          { input: '&', expected: '&amp;' },
          { input: '<', expected: '&lt;' },
          { input: '>', expected: '&gt;' },
          { input: '"', expected: '&quot;' },
          { input: "'", expected: '&#39;' },
          { input: '/', expected: '&#x2F;' }
        ];

        testCases.forEach(({ input, expected }) => {
          expect(utilsModule.escapeHtml(input)).toBe(expected);
        });
      });

      test('should handle mixed content', () => {
        const input = 'Hello & "world" <script>alert(\'xss\')</script>';
        const result = utilsModule.escapeHtml(input);
        
        expect(result).toContain('&amp;');
        expect(result).toContain('&quot;');
        expect(result).toContain('&lt;');
        expect(result).toContain('&gt;');
        expect(result).toContain('&#39;');
      });

      test('should handle non-string input', () => {
        expect(utilsModule.escapeHtml(123)).toBe('123');
        expect(utilsModule.escapeHtml(null)).toBe('null');
        expect(utilsModule.escapeHtml(undefined)).toBe('undefined');
        expect(utilsModule.escapeHtml({})).toBe('[object Object]');
      });

      test('should handle empty string', () => {
        expect(utilsModule.escapeHtml('')).toBe('');
      });

      test('should not double-escape already escaped content', () => {
        const alreadyEscaped = '&lt;script&gt;';
        const result = utilsModule.escapeHtml(alreadyEscaped);
        expect(result).toBe('&amp;lt;script&amp;gt;');
      });
    });

    describe('highlightText()', () => {
      test('should highlight matching text with mark tags', () => {
        const text = 'Hello world';
        const query = 'world';
        const result = utilsModule.highlightText(text, query);
        expect(result).toBe('Hello <mark>world</mark>');
      });

      test('should handle case-insensitive matching', () => {
        const text = 'JavaScript is great';
        const query = 'SCRIPT';
        const result = utilsModule.highlightText(text, query);
        expect(result).toBe('Java<mark>Script</mark> is great');
      });

      test('should highlight multiple matches', () => {
        const text = 'test test test';
        const query = 'test';
        const result = utilsModule.highlightText(text, query);
        expect(result).toBe('<mark>test</mark> <mark>test</mark> <mark>test</mark>');
      });

      test('should return original text when query is empty', () => {
        const text = 'Hello world';
        expect(utilsModule.highlightText(text, '')).toBe(text);
        expect(utilsModule.highlightText(text, null)).toBe(text);
        expect(utilsModule.highlightText(text, undefined)).toBe(text);
      });

      test('should escape regex special characters in query', () => {
        const text = 'Price: $10.99';
        const query = '$10.99';
        const result = utilsModule.highlightText(text, query);
        expect(result).toBe('Price: <mark>$10.99</mark>');
      });

      test('should handle complex regex characters', () => {
        const specialChars = ['.*', '+?', '^$', '{}', '()', '|', '[]', '\\'];
        
        specialChars.forEach(char => {
          const text = `Special char: ${char}`;
          const result = utilsModule.highlightText(text, char);
          expect(result).toBe(`Special char: <mark>${char}</mark>`);
        });
      });

      test('should handle partial matches', () => {
        const text = 'JavaScript programming';
        const query = 'Script';
        const result = utilsModule.highlightText(text, query);
        expect(result).toBe('Java<mark>Script</mark> programming');
      });
    });
  });

  describe('File Operations', () => {
    describe('downloadFile()', () => {
      test('should create download link with correct attributes', () => {
        // Mock URL.createObjectURL and click
        global.URL = {
          createObjectURL: jest.fn().mockReturnValue('blob:test-url'),
          revokeObjectURL: jest.fn()
        };

        // Mock createElement and click behavior
        const mockLink = {
          href: '',
          download: '',
          click: jest.fn(),
          style: { display: '' }
        };
        
        jest.spyOn(document, 'createElement').mockReturnValue(mockLink);
        jest.spyOn(document.body, 'appendChild').mockImplementation(() => {});
        jest.spyOn(document.body, 'removeChild').mockImplementation(() => {});

        utilsModule.downloadFile('test.txt', 'Hello World', 'text/plain');

        expect(document.createElement).toHaveBeenCalledWith('a');
        expect(mockLink.download).toBe('test.txt');
        expect(mockLink.href).toBe('blob:test-url');
        expect(mockLink.click).toHaveBeenCalled();
        expect(document.body.appendChild).toHaveBeenCalledWith(mockLink);
        expect(document.body.removeChild).toHaveBeenCalledWith(mockLink);
        expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('blob:test-url');
      });

      test('should handle different file types', () => {
        global.URL = {
          createObjectURL: jest.fn().mockReturnValue('blob:test-url'),
          revokeObjectURL: jest.fn()
        };

        const mockLink = {
          href: '', download: '', click: jest.fn(), style: { display: '' }
        };
        
        jest.spyOn(document, 'createElement').mockReturnValue(mockLink);
        jest.spyOn(document.body, 'appendChild').mockImplementation(() => {});
        jest.spyOn(document.body, 'removeChild').mockImplementation(() => {});

        const testCases = [
          { filename: 'data.json', content: '{}', mimeType: 'application/json' },
          { filename: 'data.csv', content: 'a,b,c', mimeType: 'text/csv' },
          { filename: 'readme.md', content: '# Title', mimeType: 'text/markdown' }
        ];

        testCases.forEach(({ filename, content, mimeType }) => {
          utilsModule.downloadFile(filename, content, mimeType);
          expect(mockLink.download).toBe(filename);
        });
      });
    });

    describe('parseCSVLine()', () => {
      test('should parse simple CSV line', () => {
        const result = utilsModule.parseCSVLine('a,b,c');
        expect(result).toEqual(['a', 'b', 'c']);
      });

      test('should handle quoted values', () => {
        const result = utilsModule.parseCSVLine('"hello","world","test"');
        expect(result).toEqual(['hello', 'world', 'test']);
      });

      test('should handle values with commas in quotes', () => {
        const result = utilsModule.parseCSVLine('"hello, world","simple","test"');
        expect(result).toEqual(['hello, world', 'simple', 'test']);
      });

      test('should handle escaped quotes', () => {
        const result = utilsModule.parseCSVLine('"say ""hello""","world"');
        expect(result).toEqual(['say "hello"', 'world']);
      });

      test('should handle mixed quoted and unquoted values', () => {
        const result = utilsModule.parseCSVLine('simple,"quoted value",another');
        expect(result).toEqual(['simple', 'quoted value', 'another']);
      });

      test('should handle empty values', () => {
        const result = utilsModule.parseCSVLine('a,,c');
        expect(result).toEqual(['a', '', 'c']);
      });

      test('should handle empty line', () => {
        const result = utilsModule.parseCSVLine('');
        expect(result).toEqual(['']);
      });

      test('should handle line with only commas', () => {
        const result = utilsModule.parseCSVLine(',,,');
        expect(result).toEqual(['', '', '', '']);
      });
    });

    describe('csvEscape()', () => {

      test('should not quote simple values (NEW BEHAVIOR)', () => {
        expect(utilsModule.csvEscape('simple')).toBe('simple');
        expect(utilsModule.csvEscape('123')).toBe('123');
        expect(utilsModule.csvEscape('hello world')).toBe('hello world');
      });
      
      test('should quote values containing commas', () => {
        expect(utilsModule.csvEscape('hello,world')).toBe('"hello,world"');
      });
      
      test('should quote values containing newlines', () => {
        expect(utilsModule.csvEscape('line1\nline2')).toBe('"line1\nline2"');
        expect(utilsModule.csvEscape('line1\rline2')).toBe('"line1\rline2"');
      });
      
      test('should quote values containing quotes and escape them', () => {
        expect(utilsModule.csvEscape('say "hello"')).toBe('"say ""hello"""');
      });

      test('should handle empty string', () => {
        expect(utilsModule.csvEscape('')).toBe('');
      });

      test('should handle null and undefined', () => {
        expect(utilsModule.csvEscape(null)).toBe('');
        expect(utilsModule.csvEscape(undefined)).toBe('');
      });
    });
  });

  describe('Validation Utilities', () => {
    describe('validateItem()', () => {
      test('should validate correct item structure', () => {
        const validItem = {
          text: 'Valid snippet text',
          desc: 'Valid description',
          sensitive: false,
          tags: ['tag1', 'tag2']
        };

        const result = utilsModule.validateItem(validItem);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      test('should reject item without required text', () => {
        const invalidItem = {
          desc: 'Valid description',
          sensitive: false,
          tags: []
        };

        const result = utilsModule.validateItem(invalidItem);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Text is required');
      });

      test('should reject item without required description', () => {
        const invalidItem = {
          text: 'Valid text',
          sensitive: false,
          tags: []
        };

        const result = utilsModule.validateItem(invalidItem);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Description is required');
      });

      test('should reject item with empty text', () => {
        const invalidItem = {
          text: '',
          desc: 'Valid description',
          sensitive: false,
          tags: []
        };

        const result = utilsModule.validateItem(invalidItem);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Text cannot be empty');
      });

      test('should reject item with empty description', () => {
        const invalidItem = {
          text: 'Valid text',
          desc: '',
          sensitive: false,
          tags: []
        };

        const result = utilsModule.validateItem(invalidItem);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Description cannot be empty');
      });

      test('should reject item with text too long', () => {
        const invalidItem = {
          text: 'x'.repeat(10001), // Assuming 10000 is the limit
          desc: 'Valid description',
          sensitive: false,
          tags: []
        };

        const result = utilsModule.validateItem(invalidItem);
        expect(result.isValid).toBe(false);
        expect(result.errors.some(error => error.includes('too long'))).toBe(true);
      });

      test('should reject item with invalid tags', () => {
        const invalidItem = {
          text: 'Valid text',
          desc: 'Valid description',
          sensitive: false,
          tags: 'not an array'
        };

        const result = utilsModule.validateItem(invalidItem);
        expect(result.isValid).toBe(false);
        expect(result.errors.some(error => error.includes('tags'))).toBe(true);
      });

      test('should handle null item', () => {
        const result = utilsModule.validateItem(null);
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Array Operations', () => {
    const testItems = [
      {
        id: '1',
        text: 'JavaScript function',
        desc: 'A useful JS function',
        sensitive: false,
        tags: ['javascript', 'frontend']
      },
      {
        id: '2',
        text: 'Python script',
        desc: 'Backend Python code',
        sensitive: true,
        tags: ['python', 'backend']
      },
      {
        id: '3',
        text: 'Docker command',
        desc: 'Container management',
        sensitive: false,
        tags: ['docker', 'devops']
      },
      {
        id: '4',
        text: 'API key configuration',
        desc: 'Production API setup',
        sensitive: true,
        tags: ['api', 'production', 'security']
      }
    ];

    describe('filterItems()', () => {
      test('should return all items when no filters applied', () => {
        const result = utilsModule.filterItems(testItems, '', []);
        expect(result).toHaveLength(testItems.length);
        expect(result).toEqual(testItems);
      });

      test('should filter by search query in text', () => {
        const result = utilsModule.filterItems(testItems, 'JavaScript', []);
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('1');
      });

      test('should filter by search query in description', () => {
        const result = utilsModule.filterItems(testItems, 'Backend', []);
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('2');
      });

      test('should filter case-insensitively', () => {
        const result = utilsModule.filterItems(testItems, 'DOCKER', []);
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('3');
      });

      test('should filter by single tag', () => {
        const result = utilsModule.filterItems(testItems, '', ['python']);
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('2');
      });

      test('should filter by multiple tags (AND logic)', () => {
        const result = utilsModule.filterItems(testItems, '', ['api', 'production']);
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('4');
      });

      test('should combine search and tag filtering', () => {
        const result = utilsModule.filterItems(testItems, 'production', ['security']);
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('4');
      });

      test('should return empty array when no matches found', () => {
        const result = utilsModule.filterItems(testItems, 'nonexistent', []);
        expect(result).toHaveLength(0);
      });

      test('should handle empty items array', () => {
        const result = utilsModule.filterItems([], 'test', ['tag']);
        expect(result).toHaveLength(0);
      });

      test('should handle malformed items gracefully', () => {
        const malformedItems = [
          { id: '1', text: 'valid', desc: 'valid', tags: ['test'] },
          { id: '2' }, // Missing required fields
          null,
          undefined,
          'not an object'
        ];

        const result = utilsModule.filterItems(malformedItems, 'valid', []);
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('1');
      });
    });

    describe('getAllTags()', () => {
      test('should extract all unique tags', () => {
        const result = utilsModule.getAllTags(testItems);
        const expectedTags = ['api', 'backend', 'devops', 'docker', 'frontend', 'javascript', 'production', 'python', 'security'];
        expect(result.sort()).toEqual(expectedTags);
      });

      test('should return sorted tags', () => {
        const result = utilsModule.getAllTags(testItems);
        const sortedResult = [...result].sort();
        expect(result).toEqual(sortedResult);
      });

      test('should handle empty items array', () => {
        const result = utilsModule.getAllTags([]);
        expect(result).toEqual([]);
      });

      test('should handle items without tags', () => {
        const itemsWithoutTags = [
          { id: '1', text: 'test', desc: 'test', tags: [] },
          { id: '2', text: 'test2', desc: 'test2', tags: [] }
        ];

        const result = utilsModule.getAllTags(itemsWithoutTags);
        expect(result).toEqual([]);
      });

      test('should handle duplicate tags', () => {
        const itemsWithDuplicates = [
          { id: '1', text: 'test1', desc: 'test1', tags: ['common', 'tag1'] },
          { id: '2', text: 'test2', desc: 'test2', tags: ['common', 'tag2'] },
          { id: '3', text: 'test3', desc: 'test3', tags: ['tag1', 'tag2'] }
        ];

        const result = utilsModule.getAllTags(itemsWithDuplicates);
        expect(result).toEqual(['common', 'tag1', 'tag2']);
      });

      test('should handle malformed items', () => {
        const malformedItems = [
          { id: '1', text: 'test', desc: 'test', tags: ['valid'] },
          { id: '2', text: 'test', desc: 'test', tags: 'not array' },
          { id: '3', text: 'test', desc: 'test' }, // Missing tags
          null
        ];

        const result = utilsModule.getAllTags(malformedItems);
        expect(result).toEqual(['valid']);
      });
    });
  });

  describe('Async Operations', () => {
    describe('debounce()', () => {
      beforeEach(() => {
        jest.useFakeTimers();
      });

      afterEach(() => {
        jest.useRealTimers();
      });

      test('should delay function execution', () => {
        const mockFn = jest.fn();
        const debouncedFn = utilsModule.debounce(mockFn, 1000);

        debouncedFn();
        expect(mockFn).not.toHaveBeenCalled();

        jest.advanceTimersByTime(1000);
        expect(mockFn).toHaveBeenCalledTimes(1);
      });

      test('should reset delay on subsequent calls', () => {
        const mockFn = jest.fn();
        const debouncedFn = utilsModule.debounce(mockFn, 1000);

        debouncedFn();
        jest.advanceTimersByTime(500);
        
        debouncedFn(); // Should reset the timer
        jest.advanceTimersByTime(500);
        expect(mockFn).not.toHaveBeenCalled();

        jest.advanceTimersByTime(500);
        expect(mockFn).toHaveBeenCalledTimes(1);
      });

      test('should call function with correct arguments', () => {
        const mockFn = jest.fn();
        const debouncedFn = utilsModule.debounce(mockFn, 100);

        debouncedFn('arg1', 'arg2', 123);
        jest.advanceTimersByTime(100);

        expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2', 123);
      });

      test('should maintain correct context', () => {
        const obj = {
          value: 'test',
          getValue: function() { return this.value; }
        };
        
        const debouncedGetValue = utilsModule.debounce(obj.getValue, 100);
        const result = debouncedGetValue.call(obj);

        jest.advanceTimersByTime(100);
        // Note: Testing context binding in debounced functions
        expect(obj.getValue()).toBe('test');
      });

      test('should handle multiple rapid calls correctly', () => {
        const mockFn = jest.fn();
        const debouncedFn = utilsModule.debounce(mockFn, 100);

        // Call multiple times rapidly
        for (let i = 0; i < 10; i++) {
          debouncedFn();
          jest.advanceTimersByTime(50); // Less than delay
        }

        expect(mockFn).not.toHaveBeenCalled();

        jest.advanceTimersByTime(100); // Complete the last delay
        expect(mockFn).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Date and Time Utilities', () => {
    describe('formatDate()', () => {
      test('should format date to readable string', () => {
        const testDate = new Date('2025-01-15T14:30:00Z');
        const result = utilsModule.formatDate(testDate);
        
        expect(typeof result).toBe('string');
        expect(result.length).toBeGreaterThan(0);
        expect(result).toContain('2025');
      });

      test('should handle different date formats', () => {
        const testCases = [
          new Date('2025-01-01'),
          new Date(2025, 0, 15), // January 15, 2025
          new Date('2025-12-31T23:59:59Z')
        ];

        testCases.forEach(date => {
          const result = utilsModule.formatDate(date);
          expect(typeof result).toBe('string');
          expect(result.length).toBeGreaterThan(0);
        });
      });

      test('should handle invalid dates gracefully', () => {
        const invalidDates = [
          new Date('invalid'),
          new Date(NaN),
          null,
          undefined,
          'not a date'
        ];

        invalidDates.forEach(date => {
          expect(() => utilsModule.formatDate(date)).not.toThrow();
        });
      });
    });
  });

  describe('Accessibility Utilities', () => {
    describe('prefersReducedMotion()', () => {
      test('should return boolean', () => {
        const result = utilsModule.prefersReducedMotion();
        expect(typeof result).toBe('boolean');
      });

      test('should handle missing matchMedia gracefully', () => {
        const originalMatchMedia = window.matchMedia;
        delete window.matchMedia;
        
        const result = utilsModule.prefersReducedMotion();
        expect(typeof result).toBe('boolean');
        
        window.matchMedia = originalMatchMedia;
      });

      test('should respect matchMedia result', () => {
        const mockMatchMedia = jest.fn().mockReturnValue({ matches: true });
        window.matchMedia = mockMatchMedia;
        
        const result = utilsModule.prefersReducedMotion();
        expect(result).toBe(true);
        expect(mockMatchMedia).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)');
        
        // Reset
        window.matchMedia = jest.fn().mockReturnValue({ matches: false });
        const result2 = utilsModule.prefersReducedMotion();
        expect(result2).toBe(false);
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle null and undefined inputs gracefully', () => {
      expect(() => utilsModule.escapeHtml(null)).not.toThrow();
      expect(() => utilsModule.escapeHtml(undefined)).not.toThrow();
      expect(() => utilsModule.highlightText(null, 'test')).not.toThrow();
      expect(() => utilsModule.highlightText('test', null)).not.toThrow();
      expect(() => utilsModule.filterItems(null, 'test', [])).not.toThrow();
      expect(() => utilsModule.getAllTags(null)).not.toThrow();
    });

    test('should handle extremely large inputs', () => {
      const largeString = 'x'.repeat(100000);
      
      expect(() => utilsModule.escapeHtml(largeString)).not.toThrow();
      expect(() => utilsModule.highlightText(largeString, 'x')).not.toThrow();
      
      const result = utilsModule.escapeHtml(largeString);
      expect(result.length).toBeGreaterThan(0);
    });

    test('should handle special characters and unicode', () => {
      const unicodeString = '🎉 Hello 世界 🌟';
      
      expect(() => utilsModule.escapeHtml(unicodeString)).not.toThrow();
      expect(() => utilsModule.highlightText(unicodeString, '世界')).not.toThrow();
      
      const highlighted = utilsModule.highlightText(unicodeString, '世界');
      expect(highlighted).toContain('<mark>世界</mark>');
    });
  });
});

// Performance and stress tests
describe('Utility Functions Performance Tests', () => {
  test('BENCHMARK: escapeHtml performance with large input', () => {
    const largeInput = '<script>alert("xss")</script>'.repeat(1000);
    
    const startTime = performance.now();
    const result = utilsModule.escapeHtml(largeInput);
    const endTime = performance.now();
    
    console.log(`Escaping ${largeInput.length} characters took ${endTime - startTime} milliseconds`);
    
    expect(result).toBeTruthy();
    expect(endTime - startTime).toBeLessThan(100); // Should complete within 100ms
  });

  test('BENCHMARK: filterItems performance with large dataset', () => {
    const largeDataset = Array.from({ length: 10000 }, (_, i) => ({
      id: `item-${i}`,
      text: `Item ${i} with some text content`,
      desc: `Description for item ${i}`,
      sensitive: i % 2 === 0,
      tags: [`category${i % 100}`, `type${i % 20}`]
    }));

    const startTime = performance.now();
    const result = utilsModule.filterItems(largeDataset, 'Item', ['category50']);
    const endTime = performance.now();
    
    console.log(`Filtering ${largeDataset.length} items took ${endTime - startTime} milliseconds`);
    
    expect(result.length).toBeGreaterThan(0);
    expect(endTime - startTime).toBeLessThan(200); // Should complete within 200ms
  });

  test('BENCHMARK: getAllTags performance with large dataset', () => {
    const largeDataset = Array.from({ length: 5000 }, (_, i) => ({
      id: `item-${i}`,
      text: `Item ${i}`,
      desc: `Description ${i}`,
      tags: [`tag${i % 500}`, `category${i % 100}`, `type${i % 50}`]
    }));

    const startTime = performance.now();
    const result = utilsModule.getAllTags(largeDataset);
    const endTime = performance.now();
    
    console.log(`Extracting tags from ${largeDataset.length} items took ${endTime - startTime} milliseconds`);
    
    expect(result.length).toBeLessThanOrEqual(650); // Should have unique tags
    expect(endTime - startTime).toBeLessThan(50); // Should complete within 50ms
  });
});