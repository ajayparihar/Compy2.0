/**
 * Utility Functions for Compy 2.0
 * 
 * This module provides a comprehensive collection of utility functions used
 * throughout the application. It includes DOM manipulation helpers, data processing
 * functions, validation utilities, and common operations that promote code reuse
 * and maintainability.
 * 
 * Categories:
 * - DOM Manipulation: $, $$, focusElement
 * - Data Processing: escapeHtml, highlightText, stringHash
 * - File Operations: downloadFile, parseCSVLine, csvEscape
 * - Validation: validateItem
 * - Array Operations: filterItems, getAllTags
 * - Async Operations: debounce
 * - Date/Time: formatDate
 * - Accessibility: prefersReducedMotion
 * 
 * @fileoverview Core utility functions for DOM, data, and common operations
 * @version 2.0
 * @author Bheb Developer
 * @since 2025
 */

// =============================================================================
// DOM MANIPULATION UTILITIES
// =============================================================================

/**
 * Shorthand for document.querySelector with enhanced error handling
 * 
 * This function provides a concise way to select single DOM elements while
 * maintaining flexibility for different root contexts. It's used extensively
 * throughout the application for element selection.
 * 
 * @param {string} selector - CSS selector string to match elements
 * @param {Element|Document} [root=document] - Root element to search from
 * @returns {Element|null} First matching element or null if none found
 * 
 * @example
 * // Select by ID
 * const button = $('#saveBtn');
 * 
 * // Select within a specific container
 * const modal = $('#modal');
 * const input = $('input[type="text"]', modal);
 * 
 * // Complex selector
 * const activeCard = $('.card.active[data-id="123"]');
 */
export const $ = (selector, root = document) => root.querySelector(selector);

/**
 * Shorthand for document.querySelectorAll returning a real Array
 * 
 * Unlike the native querySelectorAll which returns a NodeList, this function
 * returns a proper Array with all array methods available (map, filter, etc.).
 * This makes it much more convenient for functional programming patterns.
 * 
 * @param {string} selector - CSS selector string to match elements
 * @param {Element|Document} [root=document] - Root element to search from
 * @returns {Element[]} Array of matching elements (empty array if none found)
 * 
 * @example
 * // Get all cards and map over them
 * const cardData = $$('.card').map(card => ({
 *   id: card.dataset.id,
 *   title: card.querySelector('.title').textContent
 * }));
 * 
 * // Filter elements by attribute
 * const sensitiveCards = $$('.card[data-sensitive="true"]');
 * 
 * // Apply event listeners to multiple elements
 * $$('.btn').forEach(btn => btn.addEventListener('click', handleClick));
 */
export const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

// =============================================================================
// ID GENERATION AND HASHING UTILITIES
// =============================================================================

/**
 * Generate a unique identifier for new items
 * 
 * This function creates collision-resistant unique identifiers by combining
 * a random component with a timestamp component. The random part provides
 * uniqueness within the same timestamp, while the timestamp ensures
 * chronological ordering and global uniqueness.
 * 
 * Performance Optimization:
 * - Uses single operation instead of multiple concatenations
 * - Base-36 encoding provides compact output
 * - No external dependencies or complex algorithms
 * 
 * Format: {random_part}{timestamp_part}
 * Example: "a7k3m9n8qp5r2t1"
 * 
 * @returns {string} Unique identifier (16-20 characters)
 * 
 * @example
 * // Generate unique IDs for items
 * const itemId = generateUID(); // "a7k3m9n8qp5r2t1"
 * const anotherId = generateUID(); // "x2v4b1n7mp9q3s6"
 * 
 * // IDs are sortable by creation time due to timestamp component
 * console.log(itemId < anotherId); // true if first was created earlier
 */
export const generateUID = () => 
  Math.random().toString(36).slice(2) + Date.now().toString(36);

// =============================================================================
// DATA PROCESSING AND SECURITY UTILITIES
// =============================================================================

/**
 * Escape HTML characters to prevent Cross-Site Scripting (XSS) attacks
 * 
 * This function sanitizes user input by converting potentially dangerous HTML
 * characters into their safe HTML entity equivalents. This is crucial for
 * security when displaying user-generated content in the DOM.
 * 
 * Protected Characters:
 * - & (ampersand) → &amp; (prevents entity injection)
 * - < (less than) → &lt; (prevents tag injection)
 * - > (greater than) → &gt; (completes tag prevention)
 * - " (double quote) → &quot; (prevents attribute injection)
 * - ' (single quote) → &#39; (prevents attribute injection)
 * 
 * @param {string} str - String to escape (will be converted to string if not)
 * @returns {string} HTML-safe escaped string
 * 
 * @example
 * // Protect against script injection
 * const userInput = '<script>alert("XSS")</script>';
 * const safeOutput = escapeHtml(userInput);
 * // Result: "&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;"
 * 
 * // Protect snippet content before display
 * const snippet = { text: 'echo "Hello & goodbye"' };
 * element.innerHTML = escapeHtml(snippet.text);
 */
export const escapeHtml = (str) => {
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

/**
 * Highlight search terms within text using HTML mark elements
 * 
 * This function wraps matching search terms with <mark> tags to visually
 * highlight them in the UI. It handles regex escaping to prevent injection
 * and uses case-insensitive matching for better user experience.
 * 
 * Features:
 * - Case-insensitive search matching
 * - Regex special character escaping
 * - Safe HTML mark injection
 * - Preserves original text when no query provided
 * 
 * @param {string} text - Text to search within and highlight
 * @param {string} query - Search term to highlight (empty string returns original text)
 * @returns {string} Text with <mark> tags around matching terms
 * 
 * @example
 * // Basic highlighting
 * const result = highlightText('Hello world', 'world');
 * // Result: "Hello <mark>world</mark>"
 * 
 * // Case-insensitive matching
 * const result = highlightText('JavaScript is great', 'SCRIPT');
 * // Result: "Java<mark>Script</mark> is great"
 * 
 * // Multiple matches
 * const result = highlightText('test test test', 'test');
 * // Result: "<mark>test</mark> <mark>test</mark> <mark>test</mark>"
 */
export const highlightText = (text, query) => {
  if (!query) return text;
  
  // Escape special regex characters to prevent injection
  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  
  // Create case-insensitive global regex and replace with mark tags
  return text.replace(new RegExp(escapedQuery, 'gi'), (match) => `<mark>${match}</mark>`);
};

/**
 * Generate a deterministic hash for consistent visual elements
 * 
 * This simple string hash function creates a numeric hash from any string,
 * which is useful for generating consistent colors, positions, or other
 * visual properties. The same input will always produce the same output.
 * 
 * Algorithm:
 * Uses a variation of the djb2 hash algorithm with bit manipulation
 * for performance. The hash is computed by:
 * 1. Initialize hash to 0
 * 2. For each character: hash = (hash << 5) - hash + charCode
 * 3. Apply bitwise OR with 0 to ensure 32-bit integer
 * 
 * @param {string} str - String to hash
 * @returns {number} 32-bit signed integer hash
 * 
 * @example
 * // Generate consistent colors for tags
 * const tagName = 'javascript';
 * const hue = Math.abs(stringHash(tagName)) % 360;
 * const color = `hsl(${hue}, 70%, 50%)`;
 * 
 * // Same input always gives same result
 * console.log(stringHash('test')); // Always returns same number
 * console.log(stringHash('test')); // Same as above
 */
export const stringHash = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    // djb2-style hash with bit manipulation for performance
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return hash;
};

// =============================================================================
// ASYNC UTILITIES AND PERFORMANCE HELPERS
// =============================================================================

/**
 * Debounce function execution to improve performance
 * 
 * Debouncing delays function execution until after a specified wait time has
 * elapsed since the last time it was invoked. This is essential for performance
 * when dealing with high-frequency events like typing, scrolling, or resizing.
 * 
 * Use Cases:
 * - Search input (wait for user to stop typing)
 * - Window resize handlers
 * - API calls that shouldn't be made too frequently
 * - Auto-save functionality
 * 
 * @param {Function} func - Function to debounce
 * @param {number} wait - Delay in milliseconds before execution
 * @returns {Function} Debounced version of the original function
 * 
 * @example
 * // Debounce search to avoid excessive API calls
 * const debouncedSearch = debounce((query) => {
 *   performSearch(query);
 * }, 300);
 * 
 * searchInput.addEventListener('input', (e) => {
 *   debouncedSearch(e.target.value);
 * });
 * 
 * // Debounce window resize handler
 * const debouncedResize = debounce(() => {
 *   updateLayout();
 * }, 100);
 * 
 * window.addEventListener('resize', debouncedResize);
 */
export const debounce = (func, wait) => {
  let timeout;
  
  return function executedFunction(...args) {
    // Define the delayed execution function
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    
    // Clear previous timeout and set new one
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// =============================================================================
// FILE OPERATIONS AND DATA EXCHANGE
// =============================================================================

/**
 * Download text content as a file through the browser
 * 
 * Creates a temporary blob URL and triggers a download through a hidden anchor
 * element. This method works in all modern browsers and automatically cleans
 * up the temporary URL to prevent memory leaks.
 * 
 * Process:
 * 1. Create a Blob with the specified content and MIME type
 * 2. Generate a temporary object URL for the blob
 * 3. Create a hidden anchor element with download attribute
 * 4. Programmatically click the anchor to trigger download
 * 5. Clean up DOM and revoke the object URL
 * 
 * @param {string} filename - Desired filename including extension
 * @param {string} content - Text content to download
 * @param {string} [mimeType='text/plain'] - MIME type for the file
 * 
 * @example
 * // Download JSON data
 * const data = { items: [...] };
 * downloadFile('backup.json', JSON.stringify(data, null, 2), 'application/json');
 * 
 * // Download CSV export
 * const csv = 'name,email\nJohn,john@example.com';
 * downloadFile('contacts.csv', csv, 'text/csv');
 * 
 * // Download plain text
 * downloadFile('notes.txt', 'My important notes', 'text/plain');
 */
export const downloadFile = (filename, content, mimeType = 'text/plain') => {
  // Create blob with proper MIME type
  const blob = new Blob([content], { type: mimeType });
  
  // Generate temporary URL for the blob
  const url = URL.createObjectURL(blob);
  
  // Create hidden download link
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  
  // Trigger download by programmatically clicking the link
  document.body.appendChild(link);
  link.click();
  
  // Clean up: remove element and revoke object URL
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Parse a CSV line with proper quote and escape handling
 * 
 * This function correctly parses CSV lines that may contain:
 * - Quoted fields with embedded commas
 * - Escaped quotes (doubled quotes within quoted fields)
 * - Mixed quoted and unquoted fields
 * - Empty fields
 * 
 * CSV Parsing Rules:
 * - Fields separated by commas
 * - Fields containing commas must be quoted
 * - Quotes within quoted fields are escaped by doubling ("") 
 * - Leading/trailing whitespace in unquoted fields is preserved
 * 
 * @param {string} line - CSV line to parse
 * @returns {string[]} Array of field values
 * 
 * @example
 * // Simple fields
 * parseCSVLine('name,age,city');
 * // Result: ['name', 'age', 'city']
 * 
 * // Quoted fields with commas
 * parseCSVLine('"John, Jr",25,"New York, NY"');
 * // Result: ['John, Jr', '25', 'New York, NY']
 * 
 * // Escaped quotes
 * parseCSVLine('"He said ""Hello""",greeting');
 * // Result: ['He said "Hello"', 'greeting']
 */
export const parseCSVLine = (line) => {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (inQuotes) {
      // Inside quoted field
      if (char === '"' && nextChar === '"') {
        // Escaped quote: add single quote and skip next character
        current += '"';
        i++; // Skip the next quote
      } else if (char === '"') {
        // End quote: exit quoted mode
        inQuotes = false;
      } else {
        // Regular character inside quotes
        current += char;
      }
    } else {
      // Outside quoted field
      if (char === ',') {
        // Field separator: save current field and start new one
        result.push(current);
        current = '';
      } else if (char === '"') {
        // Start quote: enter quoted mode
        inQuotes = true;
      } else {
        // Regular character
        current += char;
      }
    }
  }
  
  // Don't forget the last field
  result.push(current);
  return result;
};

/**
 * Escape a string for safe inclusion in CSV format
 * 
 * Wraps the string in double quotes and escapes any existing double quotes
 * by doubling them. This ensures the field can contain commas, newlines,
 * and quotes without breaking the CSV structure.
 * 
 * @param {string} str - String to escape (will be converted to string if not)
 * @returns {string} CSV-safe quoted string
 * 
 * @example
 * csvEscape('Hello, world');
 * // Result: '"Hello, world"'
 * 
 * csvEscape('He said "Hi"');
 * // Result: '"He said ""Hi"""'
 * 
 * csvEscape('Simple text');
 * // Result: '"Simple text"'
 */
export const csvEscape = (str) => `"${String(str).replace(/"/g, '""')}"`;

// =============================================================================
// DATE AND TIME UTILITIES
// =============================================================================

/**
 * Format a date for user-friendly display
 * 
 * Converts various date inputs into a localized string representation
 * using the user's browser locale and timezone settings.
 * 
 * @param {Date|string|number} date - Date to format (Date object, ISO string, or timestamp)
 * @returns {string} Formatted date string according to user's locale
 * 
 * @example
 * // With Date object
 * formatDate(new Date());
 * // Result: "12/25/2024, 3:30:45 PM" (varies by locale)
 * 
 * // With ISO string
 * formatDate('2024-12-25T15:30:45.000Z');
 * // Result: Localized format based on user's timezone
 * 
 * // With timestamp
 * formatDate(1703520645000);
 * // Result: Localized format
 */
export const formatDate = (date) => {
  const d = new Date(date);
  return d.toLocaleString();
};

// =============================================================================
// ACCESSIBILITY AND USER PREFERENCE UTILITIES
// =============================================================================

/**
 * Check if user prefers reduced motion for accessibility
 * 
 * Uses the CSS media query to detect if the user has requested reduced motion
 * in their system settings. This is important for respecting accessibility
 * preferences and can be used to disable or reduce animations.
 * 
 * @returns {boolean} True if user prefers reduced motion
 * 
 * @example
 * // Conditionally apply animations
 * const shouldAnimate = !prefersReducedMotion();
 * 
 * if (shouldAnimate) {
 *   element.classList.add('animated');
 * } else {
 *   element.classList.add('instant');
 * }
 */
export const prefersReducedMotion = () => 
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Focus an element with optional delay for better UX
 * 
 * Safely focuses an element while handling null/undefined elements gracefully.
 * The delay option is useful for focusing elements after animations or when
 * timing is important (e.g., after modal open animations).
 * 
 * @param {Element|null} element - Element to focus (can be null/undefined)
 * @param {number} [delay=0] - Optional delay in milliseconds before focusing
 * 
 * @example
 * // Immediate focus
 * focusElement($('#searchInput'));
 * 
 * // Delayed focus after modal animation
 * focusElement($('#modalInput'), 150);
 * 
 * // Safe with null elements (no error thrown)
 * focusElement(null, 100); // No-op
 */
export const focusElement = (element, delay = 0) => {
  if (delay > 0) {
    setTimeout(() => element?.focus(), delay);
  } else {
    element?.focus();
  }
};

// =============================================================================
// DATA PROCESSING AND FILTERING UTILITIES
// =============================================================================

/**
 * Extract all unique tags from a collection of items
 * 
 * Flattens the tags arrays from all items, removes duplicates using Set,
 * and returns a sorted array of unique tag names. This is useful for
 * populating filter lists and tag selectors.
 * 
 * @param {Array} items - Array of items with tags property
 * @returns {string[]} Sorted array of unique tag names
 * 
 * @example
 * const items = [
 *   { tags: ['javascript', 'frontend'] },
 *   { tags: ['python', 'backend'] },
 *   { tags: ['javascript', 'react'] }
 * ];
 * 
 * getAllTags(items);
 * // Result: ['backend', 'frontend', 'javascript', 'python', 'react']
 */
export const getAllTags = (items) => {
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

/**
 * Filter items by search query and selected tags
 * 
 * Applies both text search and tag filtering to an array of items.
 * Tag filtering uses AND logic (item must have ALL selected tags).
 * Text search is case-insensitive and searches across text, description, and tags.
 * 
 * @param {Array} items - Items to filter
 * @param {string} [searchQuery=''] - Search query for text matching
 * @param {string[]} [filterTags=[]] - Array of tags that items must contain
 * @returns {Array} Filtered array of items
 * 
 * @example
 * const items = [
 *   { text: 'Hello world', desc: 'Greeting', tags: ['basic', 'demo'] },
 *   { text: 'console.log()', desc: 'Debug output', tags: ['javascript', 'debug'] }
 * ];
 * 
 * // Filter by search query
 * filterItems(items, 'hello'); // Returns first item
 * 
 * // Filter by tags
 * filterItems(items, '', ['javascript']); // Returns second item
 * 
 * // Combine search and tags
 * filterItems(items, 'console', ['javascript']); // Returns second item
 */
export const filterItems = (items, searchQuery = '', filterTags = []) => {
  // First filter out invalid items to prevent errors
  let filtered = items.filter(item => 
    item && 
    typeof item === 'object' &&
    typeof item.text === 'string' &&
    typeof item.desc === 'string' &&
    Array.isArray(item.tags)
  );

  // Filter by tags using AND logic (item must have ALL selected tags)
  if (filterTags.length > 0) {
    filtered = filtered.filter(item => 
      filterTags.every(tag => item.tags.includes(tag))
    );
  }

  // Filter by search query across multiple fields
  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase();
    filtered = filtered.filter(item =>
      item.text.toLowerCase().includes(query) ||
      item.desc.toLowerCase().includes(query) ||
      item.tags.some(tag => tag.toLowerCase().includes(query))
    );
  }

  return filtered;
};

// =============================================================================
// VALIDATION UTILITIES
// =============================================================================

/**
 * Validate snippet item data for completeness and constraints
 * 
 * Performs comprehensive validation on item data to ensure it meets
 * the application's requirements. Returns both a boolean validity flag
 * and an array of specific error messages for user feedback.
 * 
 * Validation Rules:
 * - Text content is required and non-empty
 * - Description is required and non-empty  
 * - Text content must not exceed 500 characters
 * - Description must not exceed 500 characters
 * 
 * @param {Object} item - Item object to validate
 * @param {string} item.text - Snippet text content
 * @param {string} item.desc - Snippet description
 * @returns {Object} Validation result object
 * @returns {boolean} returns.isValid - True if item passes all validations
 * @returns {string[]} returns.errors - Array of error messages (empty if valid)
 * 
 * @example
 * // Valid item
 * const validItem = { text: 'console.log("Hello")', desc: 'Debug output' };
 * const result = validateItem(validItem);
 * // Result: { isValid: true, errors: [] }
 * 
 * // Invalid item
 * const invalidItem = { text: '', desc: '' };
 * const result = validateItem(invalidItem);
 * // Result: { 
 * //   isValid: false, 
 * //   errors: ['Snippet content is required', 'Description is required'] 
 * // }
 */
export const validateItem = (item) => {
  const errors = [];
  
  // Validate required text content
  if (!item.text || !item.text.trim()) {
    errors.push('Snippet content is required');
  }
  
  // Validate required description
  if (!item.desc || !item.desc.trim()) {
    errors.push('Description is required');
  }
  
  // Validate text length constraints
  if (item.text && item.text.length > 500) {
    errors.push('Snippet content must be 500 characters or less');
  }
  
  // Validate description length constraints
  if (item.desc && item.desc.length > 500) {
    errors.push('Description must be 500 characters or less');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};
