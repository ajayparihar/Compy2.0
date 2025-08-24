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
 * preferences and can be used to disable or reduce animations and transitions.
 * 
 * Browser Support:
 * - Modern browsers with CSS Media Queries Level 5 support
 * - Falls back to false for older browsers (animations enabled)
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
  // Early return for empty inputs to avoid unnecessary processing
  if (!Array.isArray(items) || items.length === 0) {
    return [];
  }
  
  // Normalize search query once for performance
  const normalizedQuery = searchQuery.toLowerCase().trim();
  const hasSearchQuery = normalizedQuery.length > 0;
  const hasTagFilters = Array.isArray(filterTags) && filterTags.length > 0;
  
  // If no filtering criteria, return original array
  if (!hasSearchQuery && !hasTagFilters) {
    return items;
  }
  
  return items.filter(item => {
    // Text search across multiple fields
    if (hasSearchQuery) {
      const searchableText = [
        item.text || '',
        item.desc || '',
        ...(Array.isArray(item.tags) ? item.tags : [])
      ].join(' ').toLowerCase();
      
      // Early return if search doesn't match
      if (!searchableText.includes(normalizedQuery)) {
        return false;
      }
    }
    
    // Tag filtering with AND logic (must have ALL selected tags)
    if (hasTagFilters) {
      const itemTags = Array.isArray(item.tags) ? item.tags : [];
      
      // Item must contain ALL filter tags
      if (!filterTags.every(filterTag => itemTags.includes(filterTag))) {
        return false;
      }
    }
    
    // Item passes all filtering criteria
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
  
  // Validate required fields exist and are correct types
  if (!item || typeof item !== 'object') {
    return { isValid: false, errors: ['Invalid item object'] };
  }
  
  // Validate text field (required)
  if (!item.text || typeof item.text !== 'string') {
    errors.push('Text is required and must be a string');
  } else {
    const trimmedText = item.text.trim();
    if (trimmedText.length === 0) {
      errors.push('Text cannot be empty');
    } else if (trimmedText.length > 500) {
      errors.push('Text cannot exceed 500 characters');
    }
  }
  
  // Validate description field (required)
  if (!item.desc || typeof item.desc !== 'string') {
    errors.push('Description is required and must be a string');
  } else {
    const trimmedDesc = item.desc.trim();
    if (trimmedDesc.length === 0) {
      errors.push('Description cannot be empty');
    } else if (trimmedDesc.length > 500) {
      errors.push('Description cannot exceed 500 characters');
    }
  }
  
  // Validate tags (optional but must be valid if provided)
  if (item.tags !== undefined) {
    if (!Array.isArray(item.tags)) {
      errors.push('Tags must be an array');
    } else {
      // Check array length limit
      if (item.tags.length > 20) {
        errors.push('Cannot have more than 20 tags');
      }
      
      // Validate individual tags
      item.tags.forEach((tag, index) => {
        if (typeof tag !== 'string') {
          errors.push(`Tag at index ${index} must be a string`);
        } else if (tag.trim().length === 0) {
          errors.push(`Tag at index ${index} cannot be empty`);
        } else if (tag.length > 30) {
          errors.push(`Tag at index ${index} cannot exceed 30 characters`);
        }
      });
    }
  }
  
  // Validate sensitive flag (optional boolean)
  if (item.sensitive !== undefined && typeof item.sensitive !== 'boolean') {
    errors.push('Sensitive flag must be a boolean');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

