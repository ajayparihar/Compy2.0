/**
 * Highlight Service for Compy 2.0
 * 
 * This service provides secure text highlighting functionality using DOM manipulation
 * instead of innerHTML to prevent XSS vulnerabilities. It efficiently searches and
 * highlights text while maintaining performance and security standards.
 * 
 * Features:
 * - Secure DOM-based highlighting (no innerHTML)
 * - Case-insensitive search with optional regex support
 * - Performance-optimized with batch operations
 * - Text normalization and whitespace handling
 * - XSS prevention through safe element creation
 * 
 * @fileoverview Secure text highlighting service
 * @version 2.0
 * @author Bheb Developer
 * @since 2025
 */

import { Logger } from '../utils.js?v=2.0.2';

/**
 * Secure text highlighting service using safe DOM manipulation
 * 
 * This service replaces unsafe innerHTML highlighting with secure DOM operations,
 * preventing XSS attacks while providing efficient search highlighting.
 */
export class HighlightService {
  constructor() {
    // Default highlighting configuration
    this.config = {
      highlightClass: 'highlight-match',
      caseSensitive: false,
      wholeWords: false,
      maxHighlights: 1000, // Performance limit
      escapeRegex: true
    };
    
    // Performance tracking
    this.stats = {
      highlightsCreated: 0,
      operationsExecuted: 0,
      lastExecutionTime: 0
    };
  }
  
  /**
   * Highlight search terms in target elements securely
   * 
   * @param {string} searchTerm - Term to search for and highlight
   * @param {Element[]} targetElements - Elements to search within
   * @param {Object} options - Highlighting options
   * @param {string} options.highlightClass - CSS class for highlights
   * @param {boolean} options.caseSensitive - Whether search is case sensitive
   * @param {boolean} options.wholeWords - Whether to match whole words only
   * @param {number} options.maxHighlights - Maximum highlights to create
   * @returns {number} Number of highlights created
   */
  highlightText(searchTerm, targetElements, options = {}) {
    const startTime = performance.now();
    
    try {
      // Validate inputs
      if (!this.validateInputs(searchTerm, targetElements)) {
        return 0;
      }
      
      // Merge configuration
      const config = { ...this.config, ...options };
      
      // Prepare search pattern
      const searchPattern = this.createSearchPattern(searchTerm, config);
      if (!searchPattern) {
        Logger.warn('Invalid search pattern created');
        return 0;
      }
      
      let totalHighlights = 0;
      
      // Process each target element
      for (const element of targetElements) {
        if (totalHighlights >= config.maxHighlights) {
          Logger.warn('Maximum highlight limit reached');
          break;
        }
        
        const highlightsInElement = this.highlightInElement(
          element, 
          searchPattern, 
          config,
          config.maxHighlights - totalHighlights
        );
        
        totalHighlights += highlightsInElement;
      }
      
      // Update statistics
      this.updateStats(totalHighlights, performance.now() - startTime);
      
      Logger.info(`Created ${totalHighlights} highlights for term: "${searchTerm}"`);
      return totalHighlights;
      
    } catch (error) {
      Logger.error('Highlighting error:', error);
      return 0;
    }
  }
  
  /**
   * Remove all highlights from target elements
   * 
   * @param {Element[]} targetElements - Elements to remove highlights from
   * @param {string} highlightClass - CSS class of highlights to remove
   * @returns {number} Number of highlights removed
   */
  removeHighlights(targetElements, highlightClass = this.config.highlightClass) {
    try {
      let removedCount = 0;
      
      for (const element of targetElements) {
        const highlights = element.querySelectorAll(`.${highlightClass}`);
        removedCount += highlights.length;
        
        // Remove highlights by replacing with text content
        highlights.forEach(highlight => {
          const textNode = document.createTextNode(highlight.textContent);
          highlight.parentNode.replaceChild(textNode, highlight);
        });
        
        // Normalize text nodes after removal
        this.normalizeTextNodes(element);
      }
      
      Logger.info(`Removed ${removedCount} highlights`);
      return removedCount;
      
    } catch (error) {
      Logger.error('Error removing highlights:', error);
      return 0;
    }
  }
  
  /**
   * Update highlighting configuration
   * 
   * @param {Object} newConfig - Configuration updates
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    Logger.info('Highlight configuration updated:', this.config);
  }
  
  /**
   * Get current highlighting statistics
   * 
   * @returns {Object} Performance and usage statistics
   */
  getStats() {
    return { ...this.stats };
  }
  
  /**
   * Reset highlighting statistics
   */
  resetStats() {
    this.stats = {
      highlightsCreated: 0,
      operationsExecuted: 0,
      lastExecutionTime: 0
    };
  }
  
  /**
   * Validate highlighting inputs for security and correctness
   * 
   * @param {string} searchTerm - Search term to validate
   * @param {Element[]} targetElements - Elements to validate
   * @returns {boolean} Whether inputs are valid
   * @private
   */
  validateInputs(searchTerm, targetElements) {
    // Validate search term
    if (!searchTerm || typeof searchTerm !== 'string') {
      Logger.warn('Invalid search term provided');
      return false;
    }
    
    // Security check - prevent malicious patterns
    if (this.containsMaliciousPattern(searchTerm)) {
      Logger.warn('Malicious pattern detected in search term');
      return false;
    }
    
    // Validate target elements
    if (!Array.isArray(targetElements) || targetElements.length === 0) {
      Logger.warn('No valid target elements provided');
      return false;
    }
    
    // Ensure all targets are DOM elements
    if (!targetElements.every(element => element instanceof Element)) {
      Logger.warn('Invalid target elements - must be DOM Elements');
      return false;
    }
    
    return true;
  }
  
  /**
   * Check for malicious patterns in search terms
   * 
   * @param {string} term - Search term to check
   * @returns {boolean} Whether term contains malicious patterns
   * @private
   */
  containsMaliciousPattern(term) {
    // Check for script injection patterns
    const maliciousPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+=/i,
      /<iframe/i,
      /<object/i,
      /data:text\/html/i
    ];
    
    return maliciousPatterns.some(pattern => pattern.test(term));
  }
  
  /**
   * Create search pattern based on configuration
   * 
   * @param {string} searchTerm - Term to create pattern for
   * @param {Object} config - Search configuration
   * @returns {RegExp|null} Search pattern or null if invalid
   * @private
   */
  createSearchPattern(searchTerm, config) {
    try {
      let pattern = searchTerm;
      
      // Escape regex special characters if needed
      if (config.escapeRegex) {
        pattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      }
      
      // Add word boundary if whole words only
      if (config.wholeWords) {
        pattern = `\\b${pattern}\\b`;
      }
      
      // Create regex with appropriate flags
      const flags = config.caseSensitive ? 'g' : 'gi';
      return new RegExp(pattern, flags);
      
    } catch (error) {
      Logger.error('Error creating search pattern:', error);
      return null;
    }
  }
  
  /**
   * Highlight matches within a single element
   * 
   * @param {Element} element - Element to search within
   * @param {RegExp} searchPattern - Pattern to search for
   * @param {Object} config - Highlighting configuration
   * @param {number} maxHighlights - Maximum highlights to create in this element
   * @returns {number} Number of highlights created
   * @private
   */
  highlightInElement(element, searchPattern, config, maxHighlights) {
    let highlightsCreated = 0;
    
    try {
      // Get all text nodes in the element
      const textNodes = this.getTextNodes(element);
      
      for (const textNode of textNodes) {
        if (highlightsCreated >= maxHighlights) {
          break;
        }
        
        const highlightsInNode = this.highlightInTextNode(
          textNode,
          searchPattern,
          config,
          maxHighlights - highlightsCreated
        );
        
        highlightsCreated += highlightsInNode;
      }
      
      return highlightsCreated;
      
    } catch (error) {
      Logger.error('Error highlighting in element:', error);
      return 0;
    }
  }
  
  /**
   * Highlight matches within a text node
   * 
   * @param {Text} textNode - Text node to process
   * @param {RegExp} searchPattern - Pattern to search for
   * @param {Object} config - Highlighting configuration
   * @param {number} maxHighlights - Maximum highlights to create in this node
   * @returns {number} Number of highlights created
   * @private
   */
  highlightInTextNode(textNode, searchPattern, config, maxHighlights) {
    const text = textNode.textContent;
    const matches = [...text.matchAll(searchPattern)];
    
    if (matches.length === 0) {
      return 0;
    }
    
    // Limit matches to prevent performance issues
    const limitedMatches = matches.slice(0, maxHighlights);
    
    // Process matches in reverse order to maintain indices
    const sortedMatches = limitedMatches.sort((a, b) => b.index - a.index);
    
    let highlightsCreated = 0;
    
    for (const match of sortedMatches) {
      try {
        this.createHighlightAtPosition(textNode, match.index, match[0].length, config);
        highlightsCreated++;
      } catch (error) {
        Logger.error('Error creating highlight:', error);
        break;
      }
    }
    
    return highlightsCreated;
  }
  
  /**
   * Create a highlight at a specific position in a text node
   * 
   * @param {Text} textNode - Text node to modify
   * @param {number} startIndex - Start position of highlight
   * @param {number} length - Length of text to highlight
   * @param {Object} config - Highlighting configuration
   * @private
   */
  createHighlightAtPosition(textNode, startIndex, length, config) {
    const parent = textNode.parentNode;
    const text = textNode.textContent;
    
    // Split text node into three parts
    const beforeText = text.substring(0, startIndex);
    const highlightText = text.substring(startIndex, startIndex + length);
    const afterText = text.substring(startIndex + length);
    
    // Create highlight element securely
    const highlightElement = document.createElement('mark');
    highlightElement.className = config.highlightClass;
    highlightElement.textContent = highlightText;
    
    // Create text nodes for before and after parts
    const beforeNode = beforeText ? document.createTextNode(beforeText) : null;
    const afterNode = afterText ? document.createTextNode(afterText) : null;
    
    // Replace original text node with new structure
    if (beforeNode) {
      parent.insertBefore(beforeNode, textNode);
    }
    
    parent.insertBefore(highlightElement, textNode);
    
    if (afterNode) {
      parent.insertBefore(afterNode, textNode);
      // Update textNode reference for potential next iteration
      textNode.textContent = afterText;
      textNode.parentNode.removeChild(textNode);
      return afterNode;
    } else {
      parent.removeChild(textNode);
      return null;
    }
  }
  
  /**
   * Get all text nodes within an element
   * 
   * @param {Element} element - Element to search
   * @returns {Text[]} Array of text nodes
   * @private
   */
  getTextNodes(element) {
    const textNodes = [];
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          // Skip text nodes inside existing highlights
          const parent = node.parentElement;
          if (parent && parent.classList.contains(this.config.highlightClass)) {
            return NodeFilter.FILTER_REJECT;
          }
          
          // Skip empty or whitespace-only nodes
          if (!node.textContent.trim()) {
            return NodeFilter.FILTER_REJECT;
          }
          
          return NodeFilter.FILTER_ACCEPT;
        }
      },
      false
    );
    
    let node;
    while ((node = walker.nextNode())) {
      textNodes.push(node);
    }
    
    return textNodes;
  }
  
  /**
   * Normalize text nodes in an element after highlight removal
   * 
   * @param {Element} element - Element to normalize
   * @private
   */
  normalizeTextNodes(element) {
    try {
      element.normalize();
    } catch (error) {
      Logger.error('Error normalizing text nodes:', error);
    }
  }
  
  /**
   * Update performance statistics
   * 
   * @param {number} highlightsCreated - Number of highlights created
   * @param {number} executionTime - Time taken in milliseconds
   * @private
   */
  updateStats(highlightsCreated, executionTime) {
    this.stats.highlightsCreated += highlightsCreated;
    this.stats.operationsExecuted += 1;
    this.stats.lastExecutionTime = executionTime;
  }
}