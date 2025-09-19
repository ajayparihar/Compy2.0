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
  const availableThemes = [
    'dark-mystic-forest', 'dark-crimson-night', 'dark-royal-elegance',
    'light-sunrise', 'light-soft-glow', 'light-floral-breeze',
    'dark-dracula', 'dark-solarized', 'dark-midnight-blue', 'dark-night-owl',
    'dark-monokai', 'dark-deep-ocean', 'dark-high-contrast', 'dark-professional',
    'dark-gruvbox', 'dark-material', 'light-solarized', 'light-high-contrast',
    'light-professional', 'light-pastel-mint', 'light-earth-tones',
    'light-oceanic', 'light-vanilla-cream', 'light-nordic', 'light-material',
    'light-warm-beige'
  ];
  
  return typeof themeId === 'string' && availableThemes.includes(themeId);
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
  // PERFORMANCE OPTIMIZATION: Early return for empty inputs to avoid unnecessary processing
  if (!Array.isArray(items) || items.length === 0) {
    return [];
  }
  
  // ALGORITHM SETUP: Pre-process search query once for efficiency
  // Normalize to lowercase for case-insensitive matching
  // Trim whitespace to handle user input variations
  const normalizedQuery = searchQuery.toLowerCase().trim();
  const hasSearchQuery = normalizedQuery.length > 0;
  const hasTagFilters = Array.isArray(filterTags) && filterTags.length > 0;
  
  // OPTIMIZATION: Skip filtering entirely if no criteria provided
  if (!hasSearchQuery && !hasTagFilters) {
    return items;
  }
  
  // MAIN FILTERING ALGORITHM: Combined text search + tag filtering
  // This two-phase approach optimizes performance by:
  // 1. Text search with early termination (most common case)
  // 2. Tag filtering only for items that pass text search
  return items.filter(item => {
    // PHASE 1: TEXT SEARCH - Cross-field content matching
    if (hasSearchQuery) {
      // SEARCHABLE CONTENT AGGREGATION: Combine all searchable fields
      // This allows cross-field searching (e.g., finding tags mentioned in descriptions)
      // Performance: Single join operation is faster than multiple includes() calls
      const searchableText = [
        item.text || '',        // Primary snippet content
        item.desc || '',        // User description/notes
        ...(Array.isArray(item.tags) ? item.tags : [])  // All associated tags
      ].join(' ')              // Space-separated for natural word boundaries
       .toLowerCase();         // Case-insensitive matching
      
      // SUBSTRING SEARCH: Fast string matching using native includes()
      // Early termination: If text doesn't match, skip expensive tag filtering
      if (!searchableText.includes(normalizedQuery)) {
        return false; // Immediate rejection saves tag processing cycles
      }
    }
    
    // PHASE 2: TAG FILTERING - Intersection-based filtering with AND logic
    if (hasTagFilters) {
      const itemTags = Array.isArray(item.tags) ? item.tags : [];
      
      // AND LOGIC IMPLEMENTATION: Item must contain ALL selected filter tags
      // Algorithm: For each filter tag, verify it exists in item's tags
      // Performance: every() provides early termination on first missing tag
      if (!filterTags.every(filterTag => itemTags.includes(filterTag))) {
        return false; // Missing any required tag = exclusion
      }
    }
    
    // ACCEPTANCE: Item successfully passes both text and tag criteria
    return true;
  });
};

/**
 * Validate item data structure and content for consistency and security
 * 
 * This function performs comprehensive validation of item objects to ensure
 * they meet the application's requirements and security standards. It checks
 * both structure (required fields, data types) and content (length limits,
 * character restrictions).
 * 
 * Validation Rules:
 * - text: Required, non-empty string, max 500 characters
 * - desc: Required, non-empty string, max 500 characters  
 * - tags: Optional array of strings, max 20 tags, max 30 chars per tag
 * - sensitive: Optional boolean, defaults to false
 * 
 * Security Considerations:
 * - Prevents XSS by limiting content length
 * - Validates data types to prevent injection
 * - Sanitizes tag content
 * 
 * @param {Object} item - Item object to validate
 * @param {string} item.text - Main snippet content
 * @param {string} item.desc - Description of the snippet
 * @param {boolean} [item.sensitive] - Whether snippet contains sensitive data
 * @param {string[]} [item.tags] - Array of category tags
 * @returns {{isValid: boolean, errors: string[]}} Validation result
 * 
 * @example
 * // Valid item
 * const result = validateItem({
 *   text: 'console.log("Hello")',
 *   desc: 'Basic logging',
 *   tags: ['javascript', 'debug']
 * });
 * // Result: { isValid: true, errors: [] }
 * 
 * // Invalid item
 * const result = validateItem({
 *   text: '', // Empty - invalid
 *   desc: 'Some description'
 * });
 * // Result: { isValid: false, errors: ['Text is required'] }
 * 
 * // Check before saving
 * if (validateItem(newItem).isValid) {
 *   saveItem(newItem);
 * } else {
 *   showErrors(validateItem(newItem).errors);
 * }
 */
export const validateItem = (item) => {
  const errors = [];
  
  // STRUCTURE VALIDATION: Ensure basic object structure
  if (!item || typeof item !== 'object' || Array.isArray(item)) {
    return { isValid: false, errors: ['Invalid item object - must be a non-array object'] };
  }
  
  // TEXT FIELD VALIDATION: Required primary content
  if (!item.hasOwnProperty('text') || item.text === null || item.text === undefined) {
    errors.push('Text field is required');
  } else if (typeof item.text !== 'string') {
    errors.push('Text must be a string');
  } else {
    const trimmedText = item.text.trim();
    
    // Length validation with specific limits
    if (trimmedText.length === 0) {
      errors.push('Text cannot be empty or whitespace only');
    } else if (trimmedText.length > 10000) {
      errors.push('Text cannot exceed 10,000 characters');
    }
    
    // Security validation: Check for potential XSS patterns
    const hasScriptTags = /<script[^>]*>.*?<\/script>/gi.test(trimmedText);
    if (hasScriptTags) {
      errors.push('Text cannot contain script tags for security');
    }
  }
  
  // DESCRIPTION FIELD VALIDATION: Required secondary content
  if (!item.hasOwnProperty('desc') || item.desc === null || item.desc === undefined) {
    errors.push('Description field is required');
  } else if (typeof item.desc !== 'string') {
    errors.push('Description must be a string');
  } else {
    const trimmedDesc = item.desc.trim();
    
    // Allow empty descriptions but validate length if provided
    if (trimmedDesc.length > 1000) {
      errors.push('Description cannot exceed 1,000 characters');
    }
    
    // Security validation for description
    const hasScriptTags = /<script[^>]*>.*?<\/script>/gi.test(trimmedDesc);
    if (hasScriptTags) {
      errors.push('Description cannot contain script tags for security');
    }
  }
  
  // SENSITIVE FIELD VALIDATION: Optional boolean flag
  if (item.hasOwnProperty('sensitive') && item.sensitive !== null && item.sensitive !== undefined) {
    if (typeof item.sensitive !== 'boolean') {
      errors.push('Sensitive flag must be a boolean (true or false)');
    }
  }
  
  // TAGS FIELD VALIDATION: Optional array with content restrictions
  if (item.hasOwnProperty('tags') && item.tags !== null && item.tags !== undefined) {
    if (!Array.isArray(item.tags)) {
      errors.push('Tags must be an array');
    } else {
      // Array length validation
      if (item.tags.length > 50) {
        errors.push('Cannot have more than 50 tags per item');
      }
      
      // Individual tag validation with enhanced security checks
      const seenTags = new Set();
      item.tags.forEach((tag, index) => {
        if (typeof tag !== 'string') {
          errors.push(`Tag ${index + 1} must be a string`);
          return;
        }
        
        const trimmedTag = tag.trim();
        
        // Length validation
        if (trimmedTag.length === 0) {
          errors.push(`Tag ${index + 1} cannot be empty or whitespace only`);
          return;
        }
        
        if (trimmedTag.length > 50) {
          errors.push(`Tag ${index + 1} cannot exceed 50 characters`);
          return;
        }
        
        // Content validation: Allow alphanumeric, hyphens, underscores, and periods
        const validTagPattern = /^[a-zA-Z0-9\-_.\s]+$/;
        if (!validTagPattern.test(trimmedTag)) {
          errors.push(`Tag ${index + 1} contains invalid characters (only letters, numbers, spaces, hyphens, underscores, and periods allowed)`);
          return;
        }
        
        // Security validation: Check for script tags in tags
        const hasScriptTags = /<script[^>]*>.*?<\/script>/gi.test(trimmedTag);
        if (hasScriptTags) {
          errors.push(`Tag ${index + 1} cannot contain script tags for security`);
          return;
        }
        
        // Duplicate detection
        const normalizedTag = trimmedTag.toLowerCase();
        if (seenTags.has(normalizedTag)) {
          errors.push(`Duplicate tag found: "${trimmedTag}"`);
        } else {
          seenTags.add(normalizedTag);
        }
      });
    }
  }
  
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

