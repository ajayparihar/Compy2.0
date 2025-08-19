/**
 * Utility functions for DOM manipulation, data processing, and common operations
 */

/**
 * Shorthand for document.querySelector
 * @param {string} selector - CSS selector
 * @param {Element|Document} root - Root element to search from
 * @returns {Element|null}
 */
export const $ = (selector, root = document) => root.querySelector(selector);

/**
 * Shorthand for document.querySelectorAll returning an array
 * @param {string} selector - CSS selector
 * @param {Element|Document} root - Root element to search from
 * @returns {Element[]}
 */
export const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

/**
 * Generate a unique ID
 * @returns {string} Unique identifier
 */
export const generateUID = () => 
  Math.random().toString(36).slice(2) + Date.now().toString(36);

/**
 * Escape HTML characters to prevent XSS
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
export const escapeHtml = (str) => {
  const escapeMap = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  };
  return String(str).replace(/[&<>"']/g, (match) => escapeMap[match]);
};

/**
 * Highlight search terms in text with HTML marks
 * @param {string} text - Text to highlight
 * @param {string} query - Search query
 * @returns {string} Text with highlighted matches
 */
export const highlightText = (text, query) => {
  if (!query) return text;
  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return text.replace(new RegExp(escapedQuery, 'gi'), (match) => `<mark>${match}</mark>`);
};

/**
 * Simple string hash function for deterministic colors
 * @param {string} str - String to hash
 * @returns {number} Hash value
 */
export const stringHash = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return hash;
};

/**
 * Debounce function execution
 * @param {Function} func - Function to debounce
 * @param {number} wait - Delay in milliseconds
 * @returns {Function} Debounced function
 */
export const debounce = (func, wait) => {
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

/**
 * Download text as a file
 * @param {string} filename - Name of the file
 * @param {string} content - File content
 * @param {string} mimeType - MIME type of the file
 */
export const downloadFile = (filename, content, mimeType = 'text/plain') => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Parse CSV line with proper quote handling
 * @param {string} line - CSV line to parse
 * @returns {string[]} Array of field values
 */
export const parseCSVLine = (line) => {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        current += '"';
        i++; // Skip the next quote
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else {
      if (char === ',') {
        result.push(current);
        current = '';
      } else if (char === '"') {
        inQuotes = true;
      } else {
        current += char;
      }
    }
  }
  
  result.push(current);
  return result;
};

/**
 * Escape string for CSV format
 * @param {string} str - String to escape
 * @returns {string} CSV-escaped string
 */
export const csvEscape = (str) => `"${String(str).replace(/"/g, '""')}"`;

/**
 * Format date for display
 * @param {Date|string} date - Date to format
 * @returns {string} Formatted date string
 */
export const formatDate = (date) => {
  const d = new Date(date);
  return d.toLocaleString();
};

/**
 * Check if device prefers reduced motion
 * @returns {boolean}
 */
export const prefersReducedMotion = () => 
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Focus element with optional delay
 * @param {Element} element - Element to focus
 * @param {number} delay - Delay in milliseconds
 */
export const focusElement = (element, delay = 0) => {
  if (delay > 0) {
    setTimeout(() => element?.focus(), delay);
  } else {
    element?.focus();
  }
};

/**
 * Get all available tags from items
 * @param {Array} items - Array of items
 * @returns {string[]} Sorted unique tags
 */
export const getAllTags = (items) => 
  Array.from(new Set(items.flatMap(item => item.tags))).sort();

/**
 * Filter items by search query and tags
 * @param {Array} items - Items to filter
 * @param {string} searchQuery - Search query
 * @param {string[]} filterTags - Tags to filter by
 * @returns {Array} Filtered items
 */
export const filterItems = (items, searchQuery = '', filterTags = []) => {
  let filtered = items.slice();

  // Filter by tags (AND logic - item must have all filter tags)
  if (filterTags.length > 0) {
    filtered = filtered.filter(item => 
      filterTags.every(tag => item.tags.includes(tag))
    );
  }

  // Filter by search query
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

/**
 * Validate item data
 * @param {Object} item - Item to validate
 * @returns {Object} Validation result with isValid and errors
 */
export const validateItem = (item) => {
  const errors = [];
  
  if (!item.text || !item.text.trim()) {
    errors.push('Snippet content is required');
  }
  
  if (!item.desc || !item.desc.trim()) {
    errors.push('Description is required');
  }
  
  if (item.text && item.text.length > 500) {
    errors.push('Snippet content must be 500 characters or less');
  }
  
  if (item.desc && item.desc.length > 500) {
    errors.push('Description must be 500 characters or less');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};
