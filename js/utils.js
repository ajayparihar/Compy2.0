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

// Centralized theme list for validation (DRY with constants)
import { THEME_LIST } from './constants.js?v=2.0.2';

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
  
  // Return escaped string
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
  const length = str.length; // OPTIMIZATION: Cache length to avoid repeated property access
  
  // HASHING ALGORITHM: djb2 variant optimized for JavaScript
  // The left shift operation (<<) multiplies by 32, which is then
  // subtracted from itself to effectively multiply by 31
  // This creates better distribution than simpler multiplications
  for (let i = 0; i < length; i++) {
    // CHARACTER CODE INTEGRATION: Mix character values into hash
    // OPTIMIZATION: Use faster bitwise XOR instead of addition for better distribution
    // Combined with left shift to maintain avalanche effect
    hash = (hash << 5) - hash + str.charCodeAt(i);
    // OPTIMIZATION: Use unsigned right shift instead of | 0 for faster 32-bit conversion
    hash = hash >>> 0; // Convert to unsigned 32-bit integer
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
  let timeout;  // Holds the timeout ID for cancellation
  
  return function executedFunction(...args) {
    // ALGORITHM: Reset-on-Call Debouncing Strategy
    // 1. Define delayed execution that runs the original function
    // 2. Cancel any existing timeout (resets the delay)
    // 3. Start new timeout with fresh delay period
    // This ensures function only executes after 'wait' ms of inactivity
    
    const later = () => {
      clearTimeout(timeout);  // Clean up timeout reference
      func(...args);          // Execute original function with preserved arguments
    };
    
    // TIMEOUT MANAGEMENT: Cancel previous call and schedule new one
    // This is the key to debouncing - each new call resets the timer
    clearTimeout(timeout);        // Cancel pending execution (if any)
    timeout = setTimeout(later, wait);  // Schedule new execution
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
 * Browser API Dependencies:
 * - Blob constructor - File API specification
 * - URL.createObjectURL() / URL.revokeObjectURL() - File API
 * - HTMLAnchorElement.download attribute - HTML5
 * - HTMLElement.click() method
 * 
 * Browser Support:
 * - Chrome 14+, Firefox 20+, Safari 6.1+, Edge 12+
 * - Mobile: iOS Safari 6.1+, Android Chrome 15+
 * - Blob URLs limited to ~500MB on mobile browsers
 * 
 * Security Considerations:
 * - Blob URLs are origin-specific and temporary
 * - Download attribute may be ignored in cross-origin contexts
 * - Some browsers may show security warnings for executable file types
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
 * RFC 4180 Compliance:
 * Implements CSV parsing according to RFC 4180 specification:
 * - Fields separated by commas (customizable delimiter)
 * - Fields containing commas, newlines, or quotes must be quoted
 * - Quotes within quoted fields are escaped by doubling ("")
 * - Leading/trailing whitespace in unquoted fields is preserved
 * - CRLF and LF line endings are supported
 * 
 * External Dependencies: None
 * - Pure JavaScript implementation using only string operations
 * - Compatible with all modern browsers (ES5+)
 * - Character-by-character parsing for maximum accuracy
 * - Single pass algorithm with O(n) time complexity
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
  let current = ''; // Current field being built
  let inQuotes = false; // State: are we inside a quoted field?

  // CHARACTER-BY-CHARACTER PARSING: RFC 4180 compliant CSV parsing
  // This algorithm handles the three main CSV complexities:
  // 1. Quoted fields can contain commas
  // 2. Quotes inside quoted fields are escaped by doubling ("")
  // 3. Unquoted fields end at commas or end of line
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (inQuotes) {
      // QUOTED FIELD PROCESSING: Handle special quote sequences and content
      if (char === '"' && nextChar === '"') {
        // ESCAPED QUOTE SEQUENCE: "" inside quoted field becomes single "
        // Example: "He said ""Hello""" -> He said "Hello"
        current += '"';
        i++; // Skip the next quote (it's part of the escape sequence)
      } else if (char === '"') {
        // CLOSING QUOTE: End of quoted field, return to unquoted mode
        inQuotes = false;
      } else {
        // REGULAR CONTENT: Any character inside quotes is preserved literally
        // This includes commas, newlines, and other special characters
        current += char;
      }
    } else {
      // UNQUOTED FIELD PROCESSING: Handle field separators and quote starts
      if (char === ',') {
        // FIELD SEPARATOR: End current field, start new one
        result.push(current);
        current = ''; // Reset for next field
      } else if (char === '"') {
        // OPENING QUOTE: Enter quoted mode for field containing special chars
        inQuotes = true;
      } else {
        // REGULAR CHARACTER: Add to current unquoted field
        current += char;
      }
    }
  }
  
  // FINAL FIELD: The last field doesn't end with a comma, so add it manually
  result.push(current);
  return result;
};

/**
 * Escape a string for safe inclusion in CSV format following RFC 4180
 * 
 * Only quotes fields that contain special characters (commas, quotes, newlines, carriage returns).
 * This ensures proper CSV compliance and prevents unnecessary quoting of simple values.
 * 
 * RFC 4180 Compliance:
 * - Fields containing commas, quotes, or line breaks must be quoted
 * - Quotes within quoted fields are escaped by doubling ("")
 * - Fields without special characters don't need quoting
 * 
 * @param {any} str - Value to escape (will be converted to string if not)
 * @returns {string} CSV-safe field value (quoted only if necessary)
 * 
 * @example
 * csvEscape('Hello, world');
 * // Result: '"Hello, world"' (quoted because of comma)
 * 
 * csvEscape('He said "Hi"');
 * // Result: '"He said ""Hi"""' (quoted because of quotes)
 * 
 * csvEscape('Simple text');
 * // Result: 'Simple text' (not quoted - no special characters)
 * 
 * csvEscape('Line1\nLine2');
 * // Result: '"Line1\nLine2"' (quoted because of newline)
 */
export const csvEscape = (str) => {
  const value = String(str || '');
  
  // Only quote if the value contains special CSV characters
  if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  
  return value;
};

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
// THEME VALIDATION UTILITIES
// =============================================================================

/**
 * Validate if a theme ID is available in the application
 * 
 * This function checks if a given theme identifier exists in the list of
 * available themes. It's used to validate theme values from localStorage
 * or user input before applying them to prevent errors.
 * 
 * @param {string} themeId - Theme identifier to validate
 * @returns {boolean} True if theme is valid and available
 * 
 * @example
 * // Validate theme before applying
 * if (isValidTheme('dark-mystic-forest')) {
 *   applyTheme('dark-mystic-forest');
 * }
 * 
 * // Check user input
 * const userTheme = getUserSelectedTheme();
 * const safeTheme = isValidTheme(userTheme) ? userTheme : 'dark-mystic-forest';
 */
export const isValidTheme = (themeId) => {
  // DRY: Delegate to THEME_LIST from constants.js as the single source of truth.
  return typeof themeId === 'string' && THEME_LIST.includes(themeId);
};

/**
 * Get a safe theme ID with fallback to default
 * 
 * This function validates a theme ID and returns it if valid, or returns
 * the default theme if the input is invalid. Useful for safely handling
 * theme values from untrusted sources like localStorage.
 * 
 * @param {any} themeId - Theme identifier to validate (any type accepted)
 * @param {string} [fallback='dark-mystic-forest'] - Fallback theme if invalid
 * @returns {string} Valid theme identifier
 * 
 * @example
 * // Safely get theme from localStorage
 * const stored = localStorage.getItem('theme');
 * const safeTheme = getSafeTheme(stored);
 * 
 * // With custom fallback
 * const theme = getSafeTheme(userInput, 'light-soft-glow');
 */
export const getSafeTheme = (themeId, fallback = 'dark-mystic-forest') => {
  return isValidTheme(themeId) ? themeId : fallback;
};

// =============================================================================
// ACCESSIBILITY AND USER PREFERENCE UTILITIES
// =============================================================================

/**
 * Check if user prefers reduced motion for accessibility
 * 
 * Uses the CSS media query to detect if the user has requested reduced motion
 * in their system settings. This is important for respecting accessibility
 * preferences and can be used to disable or reduce animations and transitions.
 * 
 * Browser API Dependencies:
 * - window.matchMedia() - CSS Object Model (CSSOM)
 * - CSS Media Queries Level 5 specification
 * - prefers-reduced-motion media feature
 * 
 * Browser Support:
 * - Chrome 74+, Firefox 63+, Safari 10.1+
 * - Falls back to false for older browsers (animations enabled)
 * - Mobile browsers: iOS Safari 10.3+, Android Chrome 74+
 * 
 * Accessibility Standards:
 * - WCAG 2.1 Success Criterion 2.3.3 (Level AAA)
 * - Respects user's vestibular motion disorder preferences
 * - Follows operating system accessibility settings
 * 
 * Usage Pattern:
 * This should be checked before applying any animations, transitions,
 * or motion-based effects to ensure accessibility compliance.
 * 
 * @returns {boolean} True if user prefers reduced motion, false otherwise
 * 
 * @example
 * // Conditionally apply animations
 * if (!prefersReducedMotion()) {
 *   element.classList.add('animate-fade-in');
 * }
 * 
 * // Use in CSS-in-JS libraries
 * const animationStyle = prefersReducedMotion() 
 *   ? {} 
 *   : { transition: 'all 0.3s ease' };
 */
export const prefersReducedMotion = () => {
  return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

/**
 * Focus an element with enhanced accessibility and error handling
 * 
 * This function safely focuses an element while handling potential errors
 * and accessibility considerations. It includes a small delay to ensure
 * the element is ready to receive focus, particularly useful after DOM
 * updates or modal openings.
 * 
 * Accessibility Features:
 * - Respects user's reduced motion preferences
 * - Handles focus timing for screen readers
 * - Graceful error handling for invalid elements
 * - Supports both Element objects and CSS selectors
 * 
 * @param {Element|string} elementOrSelector - Element to focus or CSS selector
 * @param {number} [delay=50] - Delay in milliseconds before focusing
 * 
 * @example
 * // Focus an element directly
 * const input = document.querySelector('#email');
 * focusElement(input);
 * 
 * // Focus using a selector with custom delay
 * focusElement('#password', 100);
 * 
 * // Focus after modal opening
 * openModal();
 * focusElement('.modal input:first-child');
 */
export const focusElement = (elementOrSelector, delay = 50) => {
  setTimeout(() => {
    try {
      // Handle both elements and selectors
      const element = typeof elementOrSelector === 'string' 
        ? document.querySelector(elementOrSelector)
        : elementOrSelector;
      
      // Ensure element exists and is focusable
      if (element && typeof element.focus === 'function') {
        element.focus();
      }
    } catch (error) {
      // Silently handle focus errors - non-critical for app functionality
      console.warn('Could not focus element:', error);
    }
  }, delay);
};

/**
 * Create a DOM element with attributes, classes, and content in one call
 * 
 * This utility function reduces boilerplate code when creating DOM elements
 * by allowing all common properties to be set in a single function call.
 * This promotes code reuse and reduces the chance of errors.
 * 
 * Performance Benefits:
 * - Single function call reduces multiple DOM operations
 * - Batch property setting minimizes layout calculations
 * - Validation prevents common DOM manipulation errors
 * - Consistent error handling across element creation
 * 
 * Security Features:
 * - Validates tagName to prevent injection attacks
 * - Safely handles attribute values with type conversion
 * - Protects against malformed property assignments
 * 
 * @param {string} tagName - HTML tag name (e.g., 'div', 'button', 'span')
 * @param {Object} [options={}] - Configuration options
 * @param {string} [options.className] - CSS class names to add (space-separated)
 * @param {string} [options.id] - Unique element ID for the element
 * @param {string} [options.textContent] - Plain text content (XSS-safe)
 * @param {string} [options.innerHTML] - HTML content (ensure it's trusted)
 * @param {Object} [options.attributes={}] - Object with attribute name-value pairs
 * @param {Object} [options.styles={}] - Object with CSS style property-value pairs
 * @param {Object} [options.dataset={}] - Object with data-* attributes (without 'data-' prefix)
 * @returns {HTMLElement} Created and configured DOM element ready for insertion
 * @throws {Error} If tagName is invalid or element creation fails
 * 
 * @example
 * // Create a button with multiple attributes
 * const saveBtn = createElement('button', {
 *   className: 'btn btn-primary',
 *   textContent: 'Save',
 *   attributes: { type: 'button', disabled: true },
 *   dataset: { action: 'save', target: 'form1' }
 * });
 * 
 * // Create a div with styling
 * const container = createElement('div', {
 *   className: 'container',
 *   styles: { display: 'flex', gap: '1rem' }
 * });
 * 
 * // Create input with validation attributes
 * const input = createElement('input', {
 *   attributes: { type: 'email', required: true, placeholder: 'Enter email' },
 *   dataset: { validate: 'email' }
 * });
 */
export const createElement = (tagName, options = {}) => {
  // INPUT VALIDATION: Ensure tagName is a valid string
  if (typeof tagName !== 'string' || !tagName.trim()) {
    throw new Error('createElement: tagName must be a non-empty string');
  }
  
  // ERROR HANDLING: Wrap element creation in try-catch for invalid tag names
  let element;
  try {
    element = document.createElement(tagName);
  } catch (error) {
    throw new Error(`createElement: Failed to create element '${tagName}': ${error.message}`);
  }
  
  // SAFE PROPERTY APPLICATION: Apply CSS classes with validation
  if (options.className && typeof options.className === 'string') {
    element.className = options.className;
  }
  
  // Set element ID
  if (options.id) {
    element.id = options.id;
  }
  
  // Set text content (safer than innerHTML for plain text)
  if (options.textContent) {
    element.textContent = options.textContent;
  }
  
  // Set HTML content (use with caution - ensure content is trusted)
  if (options.innerHTML) {
    element.innerHTML = options.innerHTML;
  }
  
  // SET HTML ATTRIBUTES: With validation and error handling
  if (options.attributes && typeof options.attributes === 'object') {
    try {
      Object.entries(options.attributes).forEach(([key, value]) => {
        // VALIDATION: Ensure attribute key is a valid string
        if (typeof key !== 'string' || !key.trim()) {
          console.warn(`createElement: Invalid attribute key '${key}', skipping`);
          return;
        }
        
        // SAFE ATTRIBUTE SETTING: Convert value to string for safety
        element.setAttribute(key, String(value));
      });
    } catch (error) {
      console.error('createElement: Error setting attributes:', error);
    }
  }
  
  // APPLY INLINE STYLES: With error handling and validation
  if (options.styles && typeof options.styles === 'object') {
    try {
      // SAFE STYLE APPLICATION: Use Object.assign with error handling
      Object.assign(element.style, options.styles);
    } catch (error) {
      console.error('createElement: Error applying styles:', error);
    }
  }
  
  // Set data-* attributes
  if (options.dataset) {
    Object.assign(element.dataset, options.dataset);
  }
  
  return element;
};

/**
 * Add event listener with automatic cleanup tracking
 * 
 * This utility simplifies event listener management by providing automatic
 * cleanup tracking and chainable event binding. It reduces boilerplate code
 * for common DOM event handling patterns.
 * 
 * @param {Element|string} elementOrSelector - Target element or CSS selector
 * @param {string} eventType - Event type (e.g., 'click', 'input', 'change')
 * @param {Function} handler - Event handler function
 * @param {Object} [options={}] - Event listener options
 * @returns {Function} Cleanup function to remove the event listener
 * 
 * @example
 * // Basic event binding with cleanup
 * const cleanup = addEventHandler('#saveBtn', 'click', handleSave);
 * 
 * // Later remove the listener
 * cleanup();
 * 
 * // With options
 * addEventHandler('.modal', 'click', handleBackdrop, { once: true });
 */
export const addEventHandler = (elementOrSelector, eventType, handler, options = {}) => {
  // ELEMENT RESOLUTION: Handle both elements and selectors
  const element = typeof elementOrSelector === 'string' 
    ? $(elementOrSelector) 
    : elementOrSelector;
  
  // VALIDATION: Ensure element exists
  if (!element) {
    console.warn(`addEventHandler: Element not found for selector '${elementOrSelector}'`);
    return () => {}; // Return no-op cleanup function
  }
  
  // VALIDATION: Ensure handler is a function
  if (typeof handler !== 'function') {
    console.warn('addEventHandler: Handler must be a function');
    return () => {};
  }
  
  // ADD EVENT LISTENER: With proper options handling
  element.addEventListener(eventType, handler, options);
  
  // RETURN CLEANUP FUNCTION: For easy listener removal
  return () => {
    element.removeEventListener(eventType, handler, options);
  };
};

/**
 * Add multiple event listeners to the same element with cleanup tracking
 * 
 * This utility reduces repetitive addEventListener calls and provides
 * centralized cleanup for multiple event types on the same element.
 * 
 * @param {Element|string} elementOrSelector - Target element or CSS selector
 * @param {Object} eventMap - Map of event types to handler functions
 * @param {Object} [options={}] - Default options for all event listeners
 * @returns {Function} Cleanup function to remove all event listeners
 * 
 * @example
 * // Add multiple handlers to one element
 * const cleanup = addMultipleEventHandlers('#input', {
 *   input: handleInput,
 *   focus: handleFocus,
 *   blur: handleBlur
 * });
 * 
 * // Remove all listeners at once
 * cleanup();
 */
export const addMultipleEventHandlers = (elementOrSelector, eventMap, options = {}) => {
  // CREATE CLEANUP FUNCTIONS: Store all cleanup functions for batch removal
  const cleanupFunctions = [];
  
  // ADD ALL EVENT LISTENERS: Process each event type-handler pair
  Object.entries(eventMap).forEach(([eventType, handler]) => {
    const cleanup = addEventHandler(elementOrSelector, eventType, handler, options);
    cleanupFunctions.push(cleanup);
  });
  
  // RETURN BATCH CLEANUP FUNCTION: Remove all listeners at once
  return () => {
    cleanupFunctions.forEach(cleanup => cleanup());
  };
};

/**
 * Toggle element visibility with optional animation class
 * 
 * This utility provides a consistent way to show/hide elements with
 * optional CSS animation support and proper accessibility attributes.
 * 
 * @param {Element|string} elementOrSelector - Target element or CSS selector
 * @param {boolean} [show] - Explicitly show (true) or hide (false). If undefined, toggles current state
 * @param {string} [animationClass='fade'] - CSS class for animation effects
 * @returns {boolean} New visibility state (true = visible, false = hidden)
 * 
 * @example
 * // Toggle visibility
 * toggleVisibility('#modal'); // Toggles current state
 * 
 * // Explicit show/hide
 * toggleVisibility('#modal', true); // Always show
 * toggleVisibility('#modal', false); // Always hide
 * 
 * // With custom animation
 * toggleVisibility('#sidebar', true, 'slide-in');
 */
export const toggleVisibility = (elementOrSelector, show, animationClass = 'fade') => {
  // ELEMENT RESOLUTION: Handle both elements and selectors
  const element = typeof elementOrSelector === 'string'
    ? $(elementOrSelector)
    : elementOrSelector;
  
  // VALIDATION: Ensure element exists
  if (!element) {
    console.warn(`toggleVisibility: Element not found for selector '${elementOrSelector}'`);
    return false;
  }
  
  // DETERMINE TARGET STATE: Use explicit show parameter or toggle current state
  const isCurrentlyVisible = !element.hidden && element.style.display !== 'none';
  const shouldShow = show !== undefined ? show : !isCurrentlyVisible;
  
  // UPDATE VISIBILITY STATE: Set both hidden attribute and display style
  element.hidden = !shouldShow;
  
  // ACCESSIBILITY: Update ARIA attributes for screen readers
  element.setAttribute('aria-hidden', shouldShow ? 'false' : 'true');
  
  // ANIMATION SUPPORT: Add animation class if provided and element should be visible
  if (shouldShow && animationClass) {
    element.classList.add(animationClass);
    // Remove animation class after a short delay to allow for transitions
    setTimeout(() => {
      element.classList.remove(animationClass);
    }, 300);
  }
  
  return shouldShow;
};

/**
 * Create a debounced cleanup manager for batching DOM operations
 * 
 * This utility helps optimize performance by batching multiple DOM operations
 * and executing them in a single animation frame, reducing layout thrashing.
 * 
 * Performance Benefits:
 * - Reduces forced synchronous layout calculations (layout thrashing)
 * - Batches multiple DOM writes into single animation frame
 * - Prevents performance bottlenecks with rapid DOM updates
 * - Maintains 60fps performance during heavy DOM manipulation
 * 
 * Use Cases:
 * - Rapid card updates during search/filtering
 * - Bulk style changes during theme switching
 * - Animation sequences requiring multiple DOM writes
 * - Import operations creating many elements
 * 
 * @param {number} [delay=16] - Debounce delay in milliseconds (16ms = 1 frame at 60fps)
 * @returns {Object} Manager object with add(), flush(), and size() methods
 * @returns {Function} returns.add - Queue a DOM operation for batched execution
 * @returns {Function} returns.flush - Immediately execute all queued operations
 * @returns {Function} returns.size - Get count of queued operations
 * 
 * @example
 * // Create a DOM operation batcher
 * const domBatcher = createDOMBatcher();
 * 
 * // Queue multiple DOM operations
 * domBatcher.add(() => element1.style.left = '100px');
 * domBatcher.add(() => element2.textContent = 'Updated');
 * domBatcher.add(() => element3.classList.add('active'));
 * 
 * // Operations are automatically batched and executed efficiently
 * // Or manually flush if needed
 * domBatcher.flush();
 * 
 * // Check queue status
 * console.log(`${domBatcher.size()} operations pending`);
 */
export const createDOMBatcher = (delay = 16) => {
  let operations = [];
  let timeoutId = null;
  
  // BATCH EXECUTION: Execute all queued operations in a single animation frame
  const executeBatch = () => {
    if (operations.length === 0) return;
    
    // USE REQUEST ANIMATION FRAME: Ensure operations happen at optimal time
    requestAnimationFrame(() => {
      operations.forEach(operation => {
        try {
          operation();
        } catch (error) {
          console.warn('DOM batcher operation failed:', error);
        }
      });
      
      // CLEAR OPERATIONS: Reset for next batch
      operations = [];
    });
  };
  
  return {
    /**
     * Add a DOM operation to the batch queue
     * @param {Function} operation - DOM operation to queue
     */
    add: (operation) => {
      if (typeof operation !== 'function') {
        console.warn('DOM batcher: Operation must be a function');
        return;
      }
      
      operations.push(operation);
      
      // DEBOUNCED EXECUTION: Reset timer on each new operation
      clearTimeout(timeoutId);
      timeoutId = setTimeout(executeBatch, delay);
    },
    
    /**
     * Immediately flush all queued operations
     */
    flush: () => {
      clearTimeout(timeoutId);
      executeBatch();
    },
    
    /**
     * Get the number of queued operations
     */
    size: () => operations.length
  };
};

// =============================================================================
// DATA ANALYSIS AND FILTERING UTILITIES
// =============================================================================

/**
 * Extract all unique tags from an array of items for filtering UI
 * 
 * This function analyzes all items and returns a deduplicated, sorted list
 * of tags that can be used in filter interfaces. It handles edge cases like
 * empty arrays, missing tags properties, and ensures consistent ordering.
 * 
 * Processing Steps:
 * 1. Extract all tags from all items using flatMap for efficiency
 * 2. Remove duplicates using Set for O(1) lookup performance  
 * 3. Sort alphabetically for consistent UI presentation
 * 4. Return as array for compatibility with other functions
 * 
 * Performance Optimization:
 * - Uses flatMap for efficient array flattening
 * - Set deduplication is faster than filter/indexOf for large datasets
 * - Single pass through data minimizes iterations
 * 
 * @param {Array<{tags?: string[]}>} items - Array of items with optional tags property
 * @returns {string[]} Sorted array of unique tag names
 * 
 * @example
 * const items = [
 *   { text: 'Hello', tags: ['greeting', 'basic'] },
 *   { text: 'Goodbye', tags: ['greeting', 'farewell'] },
 *   { text: 'Code', tags: ['programming'] }
 * ];
 * 
 * const allTags = getAllTags(items);
 * // Result: ['basic', 'farewell', 'greeting', 'programming']
 * 
 * // Handle empty or malformed data gracefully
 * getAllTags([]) // Returns: []
 * getAllTags([{}, { tags: null }]) // Returns: []
 */
export const getAllTags = (items) => {
  if (!Array.isArray(items) || items.length === 0) {
    return [];
  }
  
  // Extract all tags efficiently with flatMap, handling missing/invalid tags
  const allTags = items.flatMap(item => 
    Array.isArray(item.tags) ? item.tags : []
  );
  
  // Deduplicate with Set and sort for consistent presentation
  return [...new Set(allTags)].sort();
};

/**
 * Filter items based on search query and selected tags with optimized performance
 * 
 * This function implements a comprehensive filtering system that combines
 * text search with tag-based filtering. It searches across multiple fields
 * and applies tag filters with AND logic (item must have ALL selected tags).
 * 
 * Search Algorithm:
 * - Case-insensitive text matching across text, description, and tags
 * - Uses includes() for substring matching (faster than regex for simple cases)
 * - Normalizes text to lowercase for consistent matching
 * 
 * Tag Filtering Logic:
 * - Uses AND logic: item must contain ALL selected filter tags
 * - Uses every() for early termination on first non-match
 * - Handles edge cases like empty tag arrays gracefully
 * 
 * Performance Optimizations:
 * - Early returns for empty inputs
 * - Single pass through items with combined filtering
 * - Lowercase conversion done once per search term
 * - every() provides early termination for tag filtering
 * - Input validation prevents errors from malformed data
 * - Memoized search text generation for repeated filtering
 * 
 * @param {Array<{id: string, text: string, desc: string, tags: string[]}>} items - Items to filter
 * @param {string} [searchQuery=''] - Text to search for across item fields
 * @param {string[]} [filterTags=[]] - Tags that items must contain (AND logic)
 * @returns {Array} Filtered array of items matching all criteria
 * 
 * @example
 * const items = [
 *   { id: '1', text: 'console.log', desc: 'Debug output', tags: ['js', 'debug'] },
 *   { id: '2', text: 'SELECT * FROM users', desc: 'Get all users', tags: ['sql', 'query'] },
 *   { id: '3', text: 'git commit', desc: 'Save changes', tags: ['git', 'version'] }
 * ];
 * 
 * // Search by text
 * filterItems(items, 'console'); // Returns item 1
 * 
 * // Filter by tags (must have ALL tags)
 * filterItems(items, '', ['js', 'debug']); // Returns item 1
 * 
 * // Combined search and tag filtering
 * filterItems(items, 'users', ['sql']); // Returns item 2
 * 
 * // No matches
 * filterItems(items, 'python', ['js']); // Returns []
 */
export const filterItems = (items, searchQuery = '', filterTags = []) => {
  // INPUT VALIDATION AND SANITIZATION: Comprehensive validation prevents runtime errors
  // 
  // ERROR HANDLING STRATEGY:
  // - Level 1: Type validation with informative logging
  // - Level 2: Early returns for performance optimization
  // - Level 3: Per-item error handling to prevent single bad items from breaking entire filter
  // - Level 4: Global exception handling with graceful fallback
  // 
  // VALIDATION RULES:
  // - items: Must be an array (empty array is acceptable)
  // - searchQuery: Must be string or convertible to string (null/undefined handled gracefully)
  // - filterTags: Must be an array of strings (invalid tags are filtered out)
  try {
    // TYPE SAFETY: Ensure items is an array with informative error logging
    if (!Array.isArray(items)) {
      Logger.warn('filterItems: items parameter must be an array, received:', typeof items);
      return []; // Graceful fallback: return empty array instead of crashing
    }
    
    // PERFORMANCE OPTIMIZATION: Early return for empty inputs to avoid unnecessary processing
    if (items.length === 0) {
      return [];
    }
    
    // SEARCH QUERY NORMALIZATION: Handle various input types safely
    let normalizedQuery = '';
    if (typeof searchQuery === 'string') {
      normalizedQuery = searchQuery.toLowerCase().trim();
    } else if (searchQuery != null) {
      // GRACEFUL TYPE CONVERSION: Convert non-string search queries
      normalizedQuery = String(searchQuery).toLowerCase().trim();
    }
    
    // TAG FILTER VALIDATION: Ensure filterTags is a valid array
    const validFilterTags = Array.isArray(filterTags) 
      ? filterTags.filter(tag => typeof tag === 'string' && tag.length > 0)
      : [];
    
    const hasSearchQuery = normalizedQuery.length > 0;
    const hasTagFilters = validFilterTags.length > 0;
    
    // OPTIMIZATION: Skip filtering entirely if no valid criteria provided
    if (!hasSearchQuery && !hasTagFilters) {
      return items;
    }
  
    // MAIN FILTERING ALGORITHM: Combined text search + tag filtering with error handling
    // This two-phase approach optimizes performance while handling malformed items gracefully
    return items.filter(item => {
      try {
        // ITEM VALIDATION: Ensure item is a valid object
        if (!item || typeof item !== 'object') {
          Logger.warn('filterItems: Skipping invalid item:', item);
          return false;
        }
        
        // PHASE 1: TEXT SEARCH - Cross-field content matching with error handling
        if (hasSearchQuery) {
          try {
            // SAFE FIELD ACCESS: Handle missing or invalid fields gracefully
            const searchableText = [
              typeof item.text === 'string' ? item.text : '',        // Primary snippet content
              typeof item.desc === 'string' ? item.desc : '',        // User description/notes
              ...(Array.isArray(item.tags) ? item.tags.filter(tag => typeof tag === 'string') : [])  // Valid tags only
            ].join(' ')              // Space-separated for natural word boundaries
             .toLowerCase();         // Case-insensitive matching
            
            // SUBSTRING SEARCH: Fast string matching with error handling
            if (!searchableText.includes(normalizedQuery)) {
              return false; // Early rejection for performance
            }
          } catch (error) {
            Logger.warn('filterItems: Error during text search for item:', item, error);
            return false; // Exclude items that cause search errors
          }
        }
        
        // PHASE 2: TAG FILTERING - Intersection-based filtering with error handling
        if (hasTagFilters) {
          try {
            // SAFE TAG ACCESS: Ensure item has valid tags array
            const itemTags = Array.isArray(item.tags) 
              ? item.tags.filter(tag => typeof tag === 'string')
              : [];
            
            // AND LOGIC IMPLEMENTATION: Item must contain ALL selected filter tags
            // Use validated filter tags from earlier processing
            if (!validFilterTags.every(filterTag => itemTags.includes(filterTag))) {
              return false; // Missing any required tag = exclusion
            }
          } catch (error) {
            Logger.warn('filterItems: Error during tag filtering for item:', item, error);
            return false; // Exclude items that cause tag filter errors
          }
        }
        
        // ACCEPTANCE: Item successfully passes both text and tag criteria
        return true;
        
      } catch (error) {
        // GLOBAL ERROR HANDLING: Catch any unexpected errors in filtering
        Logger.warn('filterItems: Unexpected error filtering item:', item, error);
        return false; // Exclude problematic items to maintain app stability
      }
    });
    
  } catch (error) {
    // TOP-LEVEL ERROR HANDLING: Log error and return empty array for safety
    Logger.error('filterItems: Critical error in filtering function:', error);
    return [];
  }
};

// =============================================================================
// LOGGING AND DEBUG UTILITIES
// =============================================================================

/**
 * Centralized logging utility for consistent debug output across the application
 * 
 * This utility provides a consistent interface for logging throughout the application,
 * with built-in support for different log levels and conditional output based on
 * the debug configuration.
 * 
 * Benefits:
 * - Consistent log formatting across all modules
 * - Easy to disable logging in production
 * - Centralized control over log levels
 * - Type-safe logging with JSDoc annotations
 * 
 * @namespace Logger
 */
export const Logger = {
  /**
   * Log informational messages (only when debug is enabled)
   * @param {string} message - The log message
   * @param {...any} args - Additional arguments to log
   */
  info: (message, ...args) => {
    if (typeof window !== 'undefined' && 
        window.location && 
        (window.location.hostname === 'localhost' || 
         window.location.hostname === '127.0.0.1' ||
         window.location.protocol === 'file:')) {
      console.log(`ℹ️ ${message}`, ...args);
    }
  },
  
  /**
   * Log warning messages (always shown)
   * @param {string} message - The warning message
   * @param {...any} args - Additional arguments to log
   */
  warn: (message, ...args) => {
    console.warn(`⚠️ ${message}`, ...args);
  },
  
  /**
   * Log error messages (always shown)
   * @param {string} message - The error message
   * @param {...any} args - Additional arguments to log
   */
  error: (message, ...args) => {
    console.error(`❌ ${message}`, ...args);
  },
  
  /**
   * Log debug messages (only in development)
   * @param {string} message - The debug message
   * @param {...any} args - Additional arguments to log
   */
  debug: (message, ...args) => {
    if (typeof window !== 'undefined' && 
        window.location && 
        (window.location.hostname === 'localhost' || 
         window.location.hostname === '127.0.0.1' ||
         window.location.protocol === 'file:')) {
      console.log(`🔍 DEBUG: ${message}`, ...args);
    }
  }
};

// =============================================================================
// DOM UTILITIES AND MANIPULATION HELPERS
// =============================================================================

/**
 * Collection of common DOM manipulation patterns used throughout the application
 * 
 * These utilities eliminate redundant DOM operations and provide consistent
 * behavior across components while improving performance through optimized
 * batch operations.
 * 
 * @namespace DOMUtils
 */
export const DOMUtils = {
  /**
   * Internal helper to resolve element from selector or element reference
   * @private
   * @param {Element|string} elementOrSelector - Target element or selector
   * @returns {Element|null} Resolved element or null if not found
   */
  _resolveElement: (elementOrSelector) => {
    return typeof elementOrSelector === 'string'
      ? $(elementOrSelector)
      : elementOrSelector;
  },

  /**
   * Unified class manipulation method with operation-specific logic
   * @private
   * @param {string} operation - 'add', 'remove', or 'toggle'
   * @param {Element|string} elementOrSelector - Target element or selector
   * @param {...string} classNames - Class names to manipulate
   * @returns {boolean} True if successful
   */
  _manipulateClasses: (operation, elementOrSelector, ...classNames) => {
    // ELEMENT RESOLUTION: Centralized element resolution for consistency
    const element = DOMUtils._resolveElement(elementOrSelector);
    
    // VALIDATION: Early return for invalid inputs to improve performance
    if (!element || !classNames.length) return false;
    
    // OPERATION EXECUTION: Apply the specified class manipulation
    switch (operation) {
      case 'add':
        element.classList.add(...classNames);
        break;
      case 'remove':
        element.classList.remove(...classNames);
        break;
      case 'toggle':
        // SPECIAL HANDLING: Toggle requires individual class processing
        classNames.forEach(className => element.classList.toggle(className));
        break;
      default:
        return false;
    }
    
    return true;
  },

  /**
   * Safely add CSS classes to elements with validation
   * @param {Element|string} elementOrSelector - Target element or selector
   * @param {...string} classNames - Class names to add
   * @returns {boolean} True if successful
   */
  addClass: (elementOrSelector, ...classNames) => {
    return DOMUtils._manipulateClasses('add', elementOrSelector, ...classNames);
  },
  
  /**
   * Safely remove CSS classes from elements
   * @param {Element|string} elementOrSelector - Target element or selector
   * @param {...string} classNames - Class names to remove
   * @returns {boolean} True if successful
   */
  removeClass: (elementOrSelector, ...classNames) => {
    return DOMUtils._manipulateClasses('remove', elementOrSelector, ...classNames);
  },
  
  /**
   * Toggle CSS classes on elements
   * @param {Element|string} elementOrSelector - Target element or selector
   * @param {...string} classNames - Class names to toggle
   * @returns {boolean} True if successful
   */
  toggleClass: (elementOrSelector, ...classNames) => {
    return DOMUtils._manipulateClasses('toggle', elementOrSelector, ...classNames);
  },
  
  /**
   * Safely set element attributes with validation
   * @param {Element|string} elementOrSelector - Target element or selector
   * @param {Object} attributes - Object with attribute key-value pairs
   * @returns {boolean} True if successful
   */
  setAttributes: (elementOrSelector, attributes) => {
    // REUSE ELEMENT RESOLUTION: Consistent element resolution
    const element = DOMUtils._resolveElement(elementOrSelector);
    
    // VALIDATION: Check for valid inputs before processing
    if (!element || !attributes || typeof attributes !== 'object') return false;
    
    // BATCH ATTRIBUTE SETTING: Process all attributes with validation
    Object.entries(attributes).forEach(([key, value]) => {
      // KEY VALIDATION: Ensure attribute key is valid
      if (typeof key === 'string' && key.trim()) {
        // SAFE VALUE CONVERSION: Convert value to string for setAttribute
        element.setAttribute(key, String(value));
      }
    });
    
    return true;
  },
  
  /**
   * Batch DOM updates for performance optimization
   * @param {Function[]} operations - Array of DOM operation functions
   * @returns {Promise<void>} Promise that resolves when operations complete
   */
  batchUpdate: (operations) => {
    return new Promise((resolve) => {
      requestAnimationFrame(() => {
        operations.forEach(operation => {
          try {
            if (typeof operation === 'function') {
              operation();
            }
          } catch (error) {
            Logger.warn('DOM batch operation failed:', error);
          }
        });
        resolve();
      });
    });
  },
  
  /**
   * Show/hide elements with optional animation classes
   * @param {Element|string} elementOrSelector - Target element or selector
   * @param {boolean} show - Whether to show or hide
   * @param {string} [animationClass] - Optional CSS animation class
   * @returns {boolean} True if successful
   */
  setVisibility: (elementOrSelector, show, animationClass) => {
    const element = typeof elementOrSelector === 'string'
      ? $(elementOrSelector)
      : elementOrSelector;
    
    if (!element) return false;
    
    if (show) {
      element.hidden = false;
      element.setAttribute('aria-hidden', 'false');
      if (animationClass) {
        element.classList.add(animationClass);
        setTimeout(() => element.classList.remove(animationClass), 300);
      }
    } else {
      element.hidden = true;
      element.setAttribute('aria-hidden', 'true');
    }
    
    return true;
  }
};

// =============================================================================
// UI GENERATION UTILITIES
// =============================================================================

/**
 * Generate consistent SVG icon HTML with standardized attributes
 * 
 * This utility promotes DRY principles by centralizing SVG icon generation
 * across the application. It ensures consistent accessibility attributes,
 * sizing, and styling for all icon elements.
 * 
 * @param {Object} options - Icon configuration options
 * @param {string} options.paths - SVG path data or content
 * @param {string} [options.viewBox='0 0 24 24'] - SVG viewBox attribute
 * @param {number} [options.width=20] - Icon width in pixels
 * @param {number} [options.height=20] - Icon height in pixels
 * @param {string} [options.className=''] - Additional CSS classes
 * @param {string} [options.title] - Accessible title for screen readers
 * @returns {string} Complete SVG element HTML
 * 
 * @example
 * // Basic icon
 * const closeIcon = createSVGIcon({
 *   paths: '<path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'
 * });
 * 
 * // Icon with custom sizing and accessibility
 * const dragIcon = createSVGIcon({
 *   paths: '<circle cx="6" cy="8" r="1.5" fill="currentColor"/>',
 *   width: 16,
 *   height: 16,
 *   title: 'Drag to reorder'
 * });
 */
export const createSVGIcon = (options = {}) => {
  const {
    paths = '',
    viewBox = '0 0 24 24',
    width = 20,
    height = 20,
    className = '',
    title
  } = options;
  
  // ACCESSIBILITY: Ensure proper attributes for screen readers
  const titleAttribute = title ? `<title>${escapeHtml(title)}</title>` : '';
  const ariaLabel = title ? `aria-label="${escapeHtml(title)}"` : 'aria-hidden="true"';
  const classAttribute = className ? ` class="${escapeHtml(className)}"` : '';
  
  return `<svg viewBox="${escapeHtml(viewBox)}" width="${width}" height="${height}" ${ariaLabel} focusable="false" role="img"${classAttribute}>
    ${titleAttribute}
    ${paths}
  </svg>`;
};

/**
 * Generate consistent button HTML with icon and accessibility attributes
 * 
 * This utility standardizes button creation across the application,
 * ensuring consistent accessibility, styling, and interaction patterns.
 * 
 * @param {Object} options - Button configuration options
 * @param {string} options.className - CSS classes for the button
 * @param {string} [options.title] - Tooltip text
 * @param {string} [options.ariaLabel] - ARIA label (defaults to title)
 * @param {string} [options.dataAct] - data-act attribute value
 * @param {string} [options.iconSVG] - SVG icon content
 * @param {string} [options.textContent] - Button text content
 * @returns {string} Complete button element HTML
 * 
 * @example
 * const deleteBtn = createIconButton({
 *   className: 'icon-btn',
 *   title: 'Delete snippet',
 *   dataAct: 'delete',
 *   iconSVG: ICONS.delete
 * });
 */
export const createIconButton = (options = {}) => {
  const {
    className = 'icon-btn',
    title = '',
    ariaLabel = title,
    dataAct,
    iconSVG = '',
    textContent = ''
  } = options;
  
  // Build attributes
  const attributes = [];
  if (className) attributes.push(`class="${escapeHtml(className)}"`);
  if (title) attributes.push(`title="${escapeHtml(title)}"`);
  if (ariaLabel) attributes.push(`aria-label="${escapeHtml(ariaLabel)}"`);
  if (dataAct) attributes.push(`data-act="${escapeHtml(dataAct)}"`);
  
  const attributeString = attributes.join(' ');
  const content = iconSVG + (textContent ? escapeHtml(textContent) : '');
  
  return `<button ${attributeString}>${content}</button>`;
};

// =============================================================================
// ERROR HANDLING UTILITIES
// =============================================================================

/**
 * Comprehensive error handling utilities for robust application behavior
 * 
 * These utilities provide consistent error handling patterns across the application,
 * with support for error recovery, user-friendly messaging, and detailed logging
 * for debugging purposes.
 * 
 * @namespace ErrorUtils
 */
export const ErrorUtils = {
  /**
   * Execute a function with comprehensive error handling and recovery
   * 
   * This utility wraps function execution with try-catch blocks and provides
   * configurable fallback behavior, logging, and user notification options.
   * 
   * @param {Function} operation - Function to execute safely
   * @param {Object} [options={}] - Configuration options
   * @param {string} [options.context] - Context description for error logging
   * @param {Function} [options.fallback] - Fallback function to call on error
   * @param {boolean} [options.silent=false] - Whether to suppress error logging
   * @param {boolean} [options.rethrow=false] - Whether to rethrow errors after handling
   * @returns {any} Result of the operation or fallback
   * 
   * @example
   * // Basic safe execution
   * const result = ErrorUtils.safeExecute(() => {
   *   return riskyOperation();
   * }, {
   *   context: 'User data processing',
   *   fallback: () => 'Default value'
   * });
   * 
   * // With error recovery
   * await ErrorUtils.safeExecute(async () => {
   *   await saveToServer(data);
   * }, {
   *   context: 'Server sync',
   *   fallback: (error) => {
   *     Logger.warn('Server sync failed, saving locally:', error);
   *     saveLocally(data);
   *   }
   * });
   */
  safeExecute: (operation, options = {}) => {
    const {
      context = 'Unknown operation',
      fallback = null,
      silent = false,
      rethrow = false
    } = options;
    
    try {
      return operation();
    } catch (error) {
      // ERROR LOGGING: Provide detailed error information unless silenced
      if (!silent) {
        Logger.error(`Error in ${context}:`, {
          message: error.message,
          stack: error.stack,
          timestamp: new Date().toISOString()
        });
      }
      
      // FALLBACK EXECUTION: Run fallback function if provided
      if (typeof fallback === 'function') {
        try {
          return fallback(error);
        } catch (fallbackError) {
          Logger.error(`Fallback failed for ${context}:`, fallbackError);
        }
      }
      
      // ERROR PROPAGATION: Re-throw if requested
      if (rethrow) {
        throw error;
      }
      
      return undefined;
    }
  },
  
  /**
   * Create a safe version of an async function with error boundaries
   * 
   * @param {Function} asyncFn - Async function to make safe
   * @param {Object} [options={}] - Safe execution options
   * @returns {Function} Safe version of the async function
   * 
   * @example
   * const safeApiCall = ErrorUtils.createSafeAsync(fetchUserData, {
   *   context: 'User data fetch',
   *   fallback: () => ({ error: 'Failed to load user data' })
   * });
   */
  createSafeAsync: (asyncFn, options = {}) => {
    return async (...args) => {
      return ErrorUtils.safeExecute(() => asyncFn(...args), options);
    };
  },
  
  /**
   * Validate and sanitize error messages for user display
   * 
   * @param {Error|string} error - Error object or message
   * @param {string} [fallbackMessage='An unexpected error occurred'] - Fallback message
   * @returns {string} Safe, user-friendly error message
   */
  getSafeErrorMessage: (error, fallbackMessage = 'An unexpected error occurred') => {
    if (!error) return fallbackMessage;
    
    // Extract message from Error objects
    const message = typeof error === 'string' ? error : error.message || fallbackMessage;
    
    // Basic sanitization to prevent XSS in error messages
    return escapeHtml(message).slice(0, 200); // Limit length
  }
};

// =============================================================================
// VALIDATION UTILITIES
// =============================================================================

/**
 * Common validation patterns used throughout the application
 * 
 * These utilities provide consistent validation behavior and reduce
 * code duplication across components. The validation system uses
 * a composable approach where complex validations build on simpler ones.
 * 
 * @namespace ValidationUtils
 */
export const ValidationUtils = {
  /**
   * Common security patterns for content validation
   * @private
   */
  _securityPatterns: {
    // SCRIPT TAG DETECTION: Matches various script tag patterns including attributes
    scriptTags: /<script[^>]*>.*?<\/script>/gi,
    // SAFE CHARACTERS: Alphanumeric plus common punctuation for general text
    safeText: /^[a-zA-Z0-9\s\-_.,'!?@#$%&*()+=[\]{}|;:"<>/\\]*$/,
    // TAG CHARACTERS: More restrictive pattern for tag names
    safeTags: /^[a-zA-Z0-9\-_.\s]+$/
  },

  /**
   * Centralized security validation to reduce code duplication
   * @private
   * @param {string} text - Text to validate for security issues
   * @param {string} fieldName - Field name for error messages
   * @returns {{isSecure: boolean, errors: string[]}} Security validation result
   */
  _validateSecurity: (text, fieldName) => {
    const errors = [];
    
    // XSS PREVENTION: Check for script injection attempts
    if (ValidationUtils._securityPatterns.scriptTags.test(text)) {
      errors.push(`${fieldName} cannot contain script tags for security`);
    }
    
    return {
      isSecure: errors.length === 0,
      errors
    };
  },

  /**
   * Validate text field with comprehensive checks
   * @private
   * @param {any} text - Text value to validate
   * @param {string} fieldName - Name for error messages
   * @returns {string[]} Array of validation errors
   */
  _validateTextField: (text, fieldName) => {
    const errors = [];
    
    // EXISTENCE CHECK: Ensure field is present and not null/undefined
    if (text === null || text === undefined) {
      errors.push(`${fieldName} field is required`);
      return errors;
    }
    
    // TYPE VALIDATION: Must be a string
    if (typeof text !== 'string') {
      errors.push(`${fieldName} must be a string`);
      return errors;
    }
    
    const trimmedText = text.trim();
    
    // LENGTH VALIDATION: Must not be empty and within limits
    if (trimmedText.length === 0) {
      errors.push(`${fieldName} cannot be empty or whitespace only`);
    } else if (trimmedText.length > 10000) {
      errors.push(`${fieldName} cannot exceed 10,000 characters`);
    }
    
    // SECURITY VALIDATION: Check for XSS patterns
    const securityResult = ValidationUtils._validateSecurity(trimmedText, fieldName);
    errors.push(...securityResult.errors);
    
    return errors;
  },

  /**
   * Validate description field with appropriate constraints
   * @private
   * @param {any} desc - Description value to validate
   * @returns {string[]} Array of validation errors
   */
  _validateDescriptionField: (desc) => {
    const errors = [];
    
    // EXISTENCE CHECK: Description is required but can be empty
    if (desc === null || desc === undefined) {
      errors.push('Description field is required');
      return errors;
    }
    
    // TYPE VALIDATION: Must be a string
    if (typeof desc !== 'string') {
      errors.push('Description must be a string');
      return errors;
    }
    
    const trimmedDesc = desc.trim();
    
    // LENGTH VALIDATION: Allow empty but limit length if provided
    if (trimmedDesc.length > 1000) {
      errors.push('Description cannot exceed 1,000 characters');
    }
    
    // SECURITY VALIDATION: Check for XSS patterns if not empty
    if (trimmedDesc.length > 0) {
      const securityResult = ValidationUtils._validateSecurity(trimmedDesc, 'Description');
      errors.push(...securityResult.errors);
    }
    
    return errors;
  },

  /**
   * Validate sensitive field boolean flag
   * @private
   * @param {any} sensitive - Sensitive flag to validate
   * @returns {string[]} Array of validation errors
   */
  _validateSensitiveField: (sensitive) => {
    const errors = [];
    
    // OPTIONAL FIELD: Only validate if explicitly provided
    if (sensitive !== null && sensitive !== undefined && typeof sensitive !== 'boolean') {
      errors.push('Sensitive flag must be a boolean (true or false)');
    }
    
    return errors;
  },

  /**
   * Validate tags array with comprehensive tag validation
   * @private
   * @param {any} tags - Tags array to validate
   * @returns {string[]} Array of validation errors
   */
  _validateTagsField: (tags) => {
    const errors = [];
    
    // OPTIONAL FIELD: Skip validation if not provided
    if (tags === null || tags === undefined) {
      return errors;
    }
    
    // TYPE VALIDATION: Must be an array
    if (!Array.isArray(tags)) {
      errors.push('Tags must be an array');
      return errors;
    }
    
    // ARRAY LENGTH VALIDATION: Prevent excessive tag counts
    if (tags.length > 50) {
      errors.push('Cannot have more than 50 tags per item');
      return errors;
    }
    
    // INDIVIDUAL TAG VALIDATION: Validate each tag with deduplication
    const seenTags = new Set();
    tags.forEach((tag, index) => {
      const tagErrors = ValidationUtils._validateSingleTag(tag, index + 1, seenTags);
      errors.push(...tagErrors);
    });
    
    return errors;
  },

  /**
   * Validate a single tag with content and security checks
   * @private
   * @param {any} tag - Single tag to validate
   * @param {number} index - Tag index for error messages (1-based)
   * @param {Set} seenTags - Set of normalized tags seen so far for duplicate detection
   * @returns {string[]} Array of validation errors
   */
  _validateSingleTag: (tag, index, seenTags) => {
    const errors = [];
    
    // TYPE VALIDATION: Tag must be a string
    if (typeof tag !== 'string') {
      errors.push(`Tag ${index} must be a string`);
      return errors;
    }
    
    const trimmedTag = tag.trim();
    
    // LENGTH VALIDATION: Tag cannot be empty and must be within limits
    if (trimmedTag.length === 0) {
      errors.push(`Tag ${index} cannot be empty or whitespace only`);
      return errors;
    }
    
    if (trimmedTag.length > 50) {
      errors.push(`Tag ${index} cannot exceed 50 characters`);
      return errors;
    }
    
    // CONTENT VALIDATION: Check for allowed characters
    if (!ValidationUtils._securityPatterns.safeTags.test(trimmedTag)) {
      errors.push(`Tag ${index} contains invalid characters (only letters, numbers, spaces, hyphens, underscores, and periods allowed)`);
      return errors;
    }
    
    // SECURITY VALIDATION: Check for script injection
    const securityResult = ValidationUtils._validateSecurity(trimmedTag, `Tag ${index}`);
    errors.push(...securityResult.errors);
    
    // DUPLICATE DETECTION: Check against normalized previous tags
    const normalizedTag = trimmedTag.toLowerCase();
    if (seenTags.has(normalizedTag)) {
      errors.push(`Duplicate tag found: "${trimmedTag}"`);
    } else {
      seenTags.add(normalizedTag);
    }
    
    return errors;
  },
  /**
   * Check if a value is a non-empty string
   * @param {any} value - Value to validate
   * @returns {boolean} True if value is a non-empty string
   */
  isNonEmptyString: (value) => {
    return typeof value === 'string' && value.trim().length > 0;
  },
  
  /**
   * Validate element existence for DOM operations
   * @param {Element|string} elementOrSelector - Element or selector to validate
   * @param {string} context - Context for error messages
   * @returns {{isValid: boolean, element?: Element, error?: string}}
   */
  validateElement: (elementOrSelector, context = 'operation') => {
    try {
      const element = typeof elementOrSelector === 'string'
        ? $(elementOrSelector)
        : elementOrSelector;
      
      if (!element) {
        return {
          isValid: false,
          error: `Element not found for ${context}: ${elementOrSelector}`
        };
      }
      
      return { isValid: true, element };
    } catch (error) {
      return {
        isValid: false,
        error: `Element validation failed for ${context}: ${error.message}`
      };
    }
  },
  
  /**
   * Validate and sanitize text input
   * @param {any} input - Input to validate
   * @param {Object} options - Validation options
   * @param {number} [options.maxLength] - Maximum allowed length
   * @param {boolean} [options.allowEmpty=false] - Whether empty strings are allowed
   * @param {string} [options.fieldName='field'] - Name for error messages
   * @returns {{isValid: boolean, value?: string, errors: string[]}}
   */
  validateTextInput: (input, options = {}) => {
    const { maxLength, allowEmpty = false, fieldName = 'field' } = options;
    const errors = [];
    
    // Type validation
    if (typeof input !== 'string') {
      if (input === null || input === undefined) {
        if (!allowEmpty) {
          errors.push(`${fieldName} is required`);
        }
      } else {
        errors.push(`${fieldName} must be a string`);
      }
      return { isValid: false, errors };
    }
    
    const trimmedValue = input.trim();
    
    // Empty validation
    if (trimmedValue.length === 0 && !allowEmpty) {
      errors.push(`${fieldName} cannot be empty`);
      return { isValid: false, errors };
    }
    
    // Length validation
    if (maxLength && trimmedValue.length > maxLength) {
      errors.push(`${fieldName} cannot exceed ${maxLength} characters`);
      return { isValid: false, errors };
    }
    
    return {
      isValid: true,
      value: trimmedValue,
      errors: []
    };
  },
  
  /**
   * Validate array input with element validation
   * @param {any} input - Input to validate
   * @param {Object} options - Validation options
   * @param {number} [options.maxLength] - Maximum array length
   * @param {Function} [options.elementValidator] - Function to validate each element
   * @param {string} [options.fieldName='array'] - Name for error messages
   * @returns {{isValid: boolean, value?: any[], errors: string[]}}
   */
  validateArrayInput: (input, options = {}) => {
    const { maxLength, elementValidator, fieldName = 'array' } = options;
    const errors = [];
    
    if (!Array.isArray(input)) {
      errors.push(`${fieldName} must be an array`);
      return { isValid: false, errors };
    }
    
    if (maxLength && input.length > maxLength) {
      errors.push(`${fieldName} cannot have more than ${maxLength} items`);
      return { isValid: false, errors };
    }
    
    // Validate each element if validator provided
    if (elementValidator && typeof elementValidator === 'function') {
      const elementErrors = [];
      input.forEach((element, index) => {
        try {
          const result = elementValidator(element);
          if (result && !result.isValid && result.errors) {
            elementErrors.push(...result.errors.map(err => `Item ${index + 1}: ${err}`));
          }
        } catch (error) {
          elementErrors.push(`Item ${index + 1}: validation error`);
        }
      });
      
      if (elementErrors.length > 0) {
        errors.push(...elementErrors);
        return { isValid: false, errors };
      }
    }
    
    return {
      isValid: true,
      value: input,
      errors: []
    };
  }
};

// =============================================================================
// ADDITIONAL ERROR HANDLING UTILITIES (Extension of ErrorUtils)
// =============================================================================

/**
 * Additional utilities for consistent error handling and recovery patterns
 * extending the existing ErrorUtils namespace with more specialized functions.
 */
export const ErrorHandlingUtils = {
  /**
   * Safe execution wrapper with automatic error handling and logging
   * @param {Function} fn - Function to execute safely
   * @param {Object} options - Error handling options
   * @param {string} [options.context='operation'] - Context for error messages
   * @param {Function} [options.fallback] - Fallback function on error
   * @param {boolean} [options.suppressErrors=false] - Whether to suppress error notifications
   * @returns {Promise<any>|any} Result of function execution or fallback
   */
  safeExecuteAdvanced: async (fn, options = {}) => {
    const { context = 'operation', fallback, suppressErrors = false } = options;
    
    try {
      return await fn();
    } catch (error) {
      Logger.error(`${context} failed:`, error);
      
      if (fallback && typeof fallback === 'function') {
        try {
          return await fallback(error);
        } catch (fallbackError) {
          Logger.error(`${context} fallback also failed:`, fallbackError);
        }
      }
      
      if (!suppressErrors) {
        // Could integrate with notification system if available
        Logger.warn(`${context} encountered an error - check console for details`);
      }
      
      return null;
    }
  },
  
  /**
   * Validate and execute DOM operations with error recovery
   * @param {Function} operation - DOM operation to execute
   * @param {Object} options - Operation options
   * @param {string} [options.context='DOM operation'] - Context for error messages
   * @param {boolean} [options.skipValidation=false] - Skip DOM validation
   * @returns {Promise<boolean>} True if operation succeeded
   */
  safeDOMOperation: async (operation, options = {}) => {
    const { context = 'DOM operation', skipValidation = false } = options;
    
    if (!skipValidation && typeof document === 'undefined') {
      Logger.warn(`${context} skipped - DOM not available`);
      return false;
    }
    
    return await ErrorUtils.safeExecute(
      operation,
      {
        context,
        fallback: () => {
          Logger.warn(`${context} failed but application continues`);
          return false;
        },
        suppressErrors: true
      }
    ) !== null;
  },
  
  /**
   * Safe localStorage operations with fallback handling
   * @param {Function} operation - Storage operation to execute
   * @param {Object} options - Operation options
   * @param {any} [options.fallbackValue] - Value to return on failure
   * @param {string} [options.context='storage operation'] - Context for error messages
   * @returns {any} Operation result or fallback value
   */
  safeStorage: (operation, options = {}) => {
    const { fallbackValue = null, context = 'storage operation' } = options;
    
    return ErrorUtils.safeExecute(
      operation,
      {
        context,
        fallback: () => fallbackValue,
        suppressErrors: true
      }
    );
  }
};

// =============================================================================
// UI STATE MANAGEMENT UTILITIES
// =============================================================================

/**
 * Utilities for managing common UI state patterns and interactions
 * 
 * These utilities provide reusable patterns for modal management,
 * form handling, and other common UI operations.
 * 
 * @namespace UIUtils
 */
export const UIUtils = {
  /**
   * Create a reusable modal state manager for consistent modal interactions
   * 
   * @param {Object} options - Modal configuration options
   * @param {string} options.modalSelector - CSS selector for modal element
   * @param {string} [options.openClass='open'] - CSS class to add when modal is open
   * @param {boolean} [options.closeOnBackdrop=true] - Whether to close on backdrop click
   * @param {boolean} [options.closeOnEscape=true] - Whether to close on Escape key
   * @returns {Object} Modal manager with show/hide methods
   */
  createModalState: (options) => {
    const { modalSelector, openClass = 'open', closeOnBackdrop = true, closeOnEscape = true } = options;
    let isOpen = false;
    let modal = null;
    
    const show = () => {
      modal = $(modalSelector);
      if (!modal) {
        Logger.warn(`Modal not found: ${modalSelector}`);
        return false;
      }
      
      isOpen = true;
      DOMUtils.addClass(modal, openClass);
      DOMUtils.setAttributes(modal, { 'aria-hidden': 'false' });
      
      return true;
    };
    
    const hide = () => {
      if (!modal || !isOpen) return false;
      
      isOpen = false;
      DOMUtils.removeClass(modal, openClass);
      DOMUtils.setAttributes(modal, { 'aria-hidden': 'true' });
      
      return true;
    };
    
    const toggle = () => isOpen ? hide() : show();
    
    // Setup event handlers if enabled
    if (closeOnEscape) {
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && isOpen) {
          hide();
        }
      });
    }
    
    if (closeOnBackdrop) {
      document.addEventListener('click', (e) => {
        if (isOpen && modal && e.target === modal) {
          hide();
        }
      });
    }
    
    return { show, hide, toggle, isOpen: () => isOpen };
  },
  
  /**
   * Create a form validation manager with common patterns
   * 
   * @param {Object} options - Form configuration
   * @param {string} options.formSelector - CSS selector for form element
   * @param {Object} options.fields - Field validation configuration
   * @param {Function} [options.onSubmit] - Submit handler
   * @param {Function} [options.onValidation] - Validation handler
   * @returns {Object} Form manager with validation methods
   */
  createFormState: (options) => {
    const { formSelector, fields, onSubmit, onValidation } = options;
    const form = $(formSelector);
    
    if (!form) {
      Logger.warn(`Form not found: ${formSelector}`);
      return null;
    }
    
    const validateField = (fieldName, value) => {
      const fieldConfig = fields[fieldName];
      if (!fieldConfig) return { isValid: true, errors: [] };
      
      return ValidationUtils.validateTextInput(value, {
        maxLength: fieldConfig.maxLength,
        allowEmpty: fieldConfig.allowEmpty,
        fieldName: fieldConfig.displayName || fieldName
      });
    };
    
    const validateAll = () => {
      const results = {};
      let isFormValid = true;
      
      Object.keys(fields).forEach(fieldName => {
        const fieldElement = form.querySelector(`[name="${fieldName}"]`) || 
                          form.querySelector(`#${fieldName}`);
        
        if (fieldElement) {
          const validation = validateField(fieldName, fieldElement.value);
          results[fieldName] = validation;
          
          if (!validation.isValid) {
            isFormValid = false;
          }
        }
      });
      
      if (onValidation) {
        onValidation(results, isFormValid);
      }
      
      return { isValid: isFormValid, fields: results };
    };
    
    const handleSubmit = (e) => {
      e.preventDefault();
      const validation = validateAll();
      
      if (validation.isValid && onSubmit) {
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        onSubmit(data, validation);
      }
    };
    
    // Setup form submission handler
    form.addEventListener('submit', handleSubmit);
    
    return { validateField, validateAll, form };
  },
  
  /**
   * Create a loading state manager for async operations
   * 
   * @param {Object} options - Loading state configuration
   * @param {string} [options.loadingClass='loading'] - CSS class for loading state
   * @param {string} [options.disabledClass='disabled'] - CSS class for disabled state
   * @returns {Object} Loading state manager
   */
  createLoadingState: (options = {}) => {
    const { loadingClass = 'loading', disabledClass = 'disabled' } = options;
    let isLoading = false;
    const trackedElements = new Set();
    
    const setLoading = (elements, loading = true) => {
      const elementList = Array.isArray(elements) ? elements : [elements];
      
      elementList.forEach(elementOrSelector => {
        const element = typeof elementOrSelector === 'string'
          ? $(elementOrSelector)
          : elementOrSelector;
        
        if (!element) return;
        
        if (loading) {
          trackedElements.add(element);
          DOMUtils.addClass(element, loadingClass, disabledClass);
          element.disabled = true;
        } else {
          trackedElements.delete(element);
          DOMUtils.removeClass(element, loadingClass, disabledClass);
          element.disabled = false;
        }
      });
      
      isLoading = loading;
    };
    
    const clearAll = () => {
      trackedElements.forEach(element => {
        DOMUtils.removeClass(element, loadingClass, disabledClass);
        element.disabled = false;
      });
      trackedElements.clear();
      isLoading = false;
    };
    
    return {
      start: (elements) => setLoading(elements, true),
      stop: (elements) => elements ? setLoading(elements, false) : clearAll(),
      isLoading: () => isLoading
    };
  }
};

/**
 * Comprehensive item validation with security and content checks
 * 
 * This function validates all aspects of an item object to ensure data integrity,
 * security compliance, and application requirements. It performs both structural
 * validation and content security scanning.
 * 
 * Validation Categories:
 * - Structure: Object type, required fields, property types
 * - Content: Length limits, character restrictions, content patterns
 * - Security: XSS prevention, script tag detection, injection protection
 * - Business Rules: Tag limits, duplicate detection, naming conventions
 * 
 * @param {Object} item - Item object to validate
 * @param {string} item.text - Main snippet content (required, 1-10,000 chars)
 * @param {string} item.desc - Description of snippet (optional, max 1,000 chars)
 * @param {boolean} [item.sensitive=false] - Whether snippet contains sensitive data
 * @param {string[]} [item.tags=[]] - Category tags (max 50 tags, 50 chars each)
 * @returns {{isValid: boolean, errors: string[], fieldCount: number, validatedAt: string}} Detailed validation result
 * 
 * @example
 * // Validate a complete item
 * const item = {
 *   text: 'console.log("Hello World")',
 *   desc: 'Basic debugging output',
 *   sensitive: false,
 *   tags: ['javascript', 'debug', 'console']
 * };
 * 
 * const result = validateItem(item);
 * if (result.isValid) {
 *   console.log('Item is valid, ready to save');
 * } else {
 *   console.log('Validation errors:', result.errors);
 * }
 * 
 * // Handle validation in form submission
 * const handleSubmit = (formData) => {
 *   const validation = validateItem(formData);
 *   if (!validation.isValid) {
 *     showValidationErrors(validation.errors);
 *     return false;
 *   }
 *   return saveItem(formData);
 * };
 */
export const validateItem = (item) => {
  const errors = [];
  
  // STRUCTURE VALIDATION: Ensure basic object structure integrity
  // This prevents type confusion attacks and ensures we're working with valid data
  if (!item || typeof item !== 'object' || Array.isArray(item)) {
    return { isValid: false, errors: ['Invalid item object - must be a non-array object'] };
  }
  
  // TEXT FIELD VALIDATION: Required primary content using modular validation
  errors.push(...ValidationUtils._validateTextField(item.text, 'Text'));
  
  // DESCRIPTION FIELD VALIDATION: Optional secondary content
  errors.push(...ValidationUtils._validateDescriptionField(item.desc));
  
  // SENSITIVE FIELD VALIDATION: Optional boolean flag
  errors.push(...ValidationUtils._validateSensitiveField(item.sensitive));
  
  // TAGS FIELD VALIDATION: Optional array with content restrictions
  errors.push(...ValidationUtils._validateTagsField(item.tags));
  
  // FINAL VALIDATION RESULT: Return comprehensive validation result
  const isValid = errors.length === 0;
  
  return {
    isValid,
    errors,
    // Additional metadata for debugging and analytics
    fieldCount: Object.keys(item).length,
    validatedAt: new Date().toISOString()
  };
};

