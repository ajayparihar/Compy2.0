/**
 * Clipboard Management Component for Compy 2.0
 * 
 * This module provides a robust clipboard management system that handles
 * copying text to the system clipboard with fallback support for older browsers.
 * It encapsulates all clipboard-related functionality in a single, reusable component.
 * 
 * Features:
 * - Modern Clipboard API with execCommand fallback
 * - Automatic error handling and user feedback
 * - Cross-browser compatibility
 * - Integration with notification system
 * 
 * @fileoverview Clipboard management component with fallback support
 * @version 2.0
 * @author Bheb Developer
 * @since 2025
 */

/**
 * ClipboardManager handles all clipboard operations with robust fallback support
 * 
 * This class provides a unified interface for copying text to the clipboard,
 * automatically falling back to older methods when the modern Clipboard API
 * is unavailable. It integrates with the notification system to provide
 * user feedback on clipboard operations.
 * 
 * @class ClipboardManager
 * @example
 * const clipboardManager = new ClipboardManager(notificationManager);
 * 
 * // Copy text to clipboard
 * await clipboardManager.copy('Hello, World!');
 * 
 * // The manager will automatically show success/error notifications
 */
export class ClipboardManager {
  /**
   * Initialize the clipboard manager
   * 
   * @param {Object} notificationManager - Notification manager instance for user feedback
   */
  constructor(notificationManager) {
    this.notifications = notificationManager;
    
    // Check clipboard API availability
    this.hasClipboardAPI = navigator.clipboard && 
                          typeof navigator.clipboard.writeText === 'function';
    
    // Bind methods to maintain context
    this.copy = this.copy.bind(this);
    this.fallbackCopy = this.fallbackCopy.bind(this);
  }

  /**
   * Copy text to the system clipboard with automatic fallback
   * 
   * This method attempts to use the modern Clipboard API first, falling back
   * to the legacy execCommand approach if the modern API is unavailable or fails.
   * User feedback is provided through the notification system.
   * 
   * Browser API Dependencies:
   * Primary: Clipboard API (navigator.clipboard.writeText)
   * - Chrome 66+, Firefox 63+, Safari 13.1+
   * - Requires HTTPS or localhost context for security
   * - Limited to user gesture events in most browsers
   * - May show permission prompts for large text
   * 
   * Fallback: document.execCommand('copy')
   * - Deprecated but widely supported in older browsers
   * - Works in HTTP contexts unlike Clipboard API
   * - Requires temporary DOM manipulation (textarea element)
   * 
   * Security Considerations:
   * - Clipboard access is limited to active tabs for privacy
   * - Cross-origin restrictions apply
   * - Some browsers require user interaction for clipboard access
   * 
   * @param {string} text - Text to copy to clipboard
   * @returns {Promise<boolean>} Promise resolving to true if successful
   * 
   * @example
   * // Basic usage
   * const success = await clipboardManager.copy('console.log("Hello")');
   * 
   * // With error handling
   * try {
   *   await clipboardManager.copy(snippetText);
   *   console.log('Copy successful');
   * } catch (error) {
   *   console.error('Copy failed:', error);
   * }
   */
  async copy(text) {
    if (!text) {
      this.notifications.show('Nothing to copy', 'error');
      return false;
    }

    try {
      if (this.hasClipboardAPI) {
        // Use modern Clipboard API
        await navigator.clipboard.writeText(text);
        this.notifications.show('Copied to clipboard');
        return true;
      } else {
        // Fall back to legacy method
        return this.fallbackCopy(text);
      }
    } catch (error) {
      console.warn('Modern clipboard API failed, trying fallback:', error);
      // Attempt fallback even if modern API exists but failed
      return this.fallbackCopy(text);
    }
  }

  /**
   * Legacy clipboard copy method using execCommand with enhanced error handling
   * 
   * This method provides clipboard functionality for older browsers or contexts where 
   * the modern Clipboard API is not available. It creates a temporary textarea element 
   * to hold the text and uses the deprecated but widely-supported document.execCommand 
   * to perform the copy operation.
   * 
   * Implementation Details:
   * - Creates invisible textarea element positioned off-screen
   * - Handles mobile device selection limitations with setSelectionRange
   * - Provides comprehensive cleanup to prevent DOM pollution
   * - Uses defensive programming to handle various failure modes
   * 
   * Browser Compatibility:
   * - Works in browsers that don't support Clipboard API (IE, older Safari)
   * - Functions in HTTP contexts where Clipboard API is restricted
   * - Handles mobile browsers with limited text selection capabilities
   * - Graceful fallback when execCommand is disabled or unavailable
   * 
   * Security Considerations:
   * - Temporary element is created with minimal privileges (readonly)
   * - Element is immediately removed after use to prevent memory leaks
   * - No persistent DOM modifications or security vulnerabilities
   * 
   * @param {string} text - Text to copy using legacy method
   * @returns {boolean} True if copy was successful, false otherwise
   * 
   * @private
   */
  fallbackCopy(text) {
    // VALIDATION: Ensure we have valid text to copy
    if (!text || typeof text !== 'string') {
      this.notifications.show('Invalid text for clipboard operation', 'error');
      return false;
    }

    let textarea = null;
    
    try {
      // ELEMENT CREATION: Create temporary textarea for copy operation
      textarea = this.createTempTextarea(text);
      
      // DOM INSERTION: Add element to document for selection
      // Element must be in the DOM for execCommand to work properly
      document.body.appendChild(textarea);
      
      // FOCUS AND SELECTION: Prepare textarea for copy operation
      textarea.focus(); // Focus is required for selection in some browsers
      textarea.select(); // Select all text in the textarea
      
      // MOBILE COMPATIBILITY: Ensure selection works on mobile devices
      // Mobile browsers often have different selection behavior
      textarea.setSelectionRange(0, text.length);
      
      // COPY OPERATION: Attempt to copy selected text using execCommand
      // This is a synchronous operation that returns boolean success status
      const copySuccessful = document.execCommand('copy');
      
      if (copySuccessful) {
        // SUCCESS: Notify user and return success status
        this.notifications.show('Copied to clipboard');
        return true;
      } else {
        // EXECCOMMAND FAILURE: Command failed for unknown reason
        this.notifications.show('Copy failed - please try manually', 'error');
        return false;
      }
      
    } catch (error) {
      // EXCEPTION HANDLING: Handle any unexpected errors during copy process
      console.error('Fallback copy encountered error:', {
        error: error.message,
        stack: error.stack,
        textLength: text ? text.length : 0,
        hasTextarea: !!textarea
      });
      
      // USER FEEDBACK: Provide clear guidance for manual copying
      this.notifications.show('Copy not supported - please copy manually', 'error');
      return false;
      
    } finally {
      // CLEANUP: Always remove temporary element to prevent DOM pollution
      // This runs regardless of success or failure to ensure no memory leaks
      if (textarea && textarea.parentNode) {
        try {
          document.body.removeChild(textarea);
        } catch (cleanupError) {
          // Log cleanup issues but don't throw - cleanup failures shouldn't affect UX
          console.warn('Failed to clean up clipboard textarea:', cleanupError);
        }
      }
    }
  }

  /**
   * Create a temporary textarea element for fallback copying with enhanced configuration
   * 
   * This method creates a properly configured textarea element that's invisible to users
   * but still functional for text selection and copying. The element is carefully styled
   * to avoid any visual disruption while maintaining accessibility for screen readers.
   * 
   * Positioning Strategy:
   * - Uses fixed positioning to remove from document flow
   * - Places element far off-screen (-9999px) to ensure invisibility
   * - Uses opacity and pointer-events to prevent interaction
   * - Sets negative z-index to ensure element stays behind all content
   * 
   * Accessibility Considerations:
   * - Marked as aria-hidden since it's a temporary utility element
   * - Set to readonly to prevent accidental text modification
   * - Maintains focusability required for text selection APIs
   * 
   * Cross-browser Compatibility:
   * - Works consistently across all modern browsers
   * - Handles mobile browsers with different selection behaviors
   * - Avoids browser-specific styling quirks and limitations
   * 
   * @param {string} text - Text content to place in textarea
   * @returns {HTMLTextAreaElement} Properly configured textarea element ready for use
   * 
   * @private
   */
  createTempTextarea(text) {
    // ELEMENT CREATION: Create textarea with proper type validation
    const textarea = document.createElement('textarea');
    textarea.value = String(text); // Ensure text is always a string
    
    // POSITIONING: Make element invisible but functional for copy operations
    // Using fixed positioning ensures element doesn't affect page layout
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';      // Far off-screen horizontally  
    textarea.style.top = '-9999px';       // Far off-screen vertically
    textarea.style.width = '1px';         // Minimal width to avoid layout issues
    textarea.style.height = '1px';        // Minimal height to avoid layout issues
    
    // VISIBILITY: Additional layers of invisibility for comprehensive hiding
    textarea.style.opacity = '0';         // Transparent to prevent visual flash
    textarea.style.pointerEvents = 'none'; // Prevent mouse interaction
    textarea.style.zIndex = '-9999';      // Behind all other elements
    textarea.style.border = 'none';       // Remove default border
    textarea.style.outline = 'none';      // Remove focus outline
    textarea.style.background = 'transparent'; // Transparent background
    
    // FUNCTIONALITY: Configure element for proper copy operation behavior
    textarea.setAttribute('readonly', '');     // Prevent text modification
    textarea.setAttribute('aria-hidden', 'true'); // Hide from screen readers
    textarea.setAttribute('tabindex', '-1');   // Remove from tab navigation
    
    // PERFORMANCE: Disable features not needed for copy operation
    textarea.setAttribute('autocomplete', 'off'); // Disable autocomplete
    textarea.setAttribute('spellcheck', 'false'); // Disable spellcheck
    
    return textarea;
  }

  /**
   * Validate text content for clipboard operations with comprehensive checks
   * 
   * Performs thorough validation of text content before attempting clipboard operations.
   * This prevents various edge cases and provides clear feedback for invalid inputs.
   * 
   * Validation Rules:
   * - Must be a non-empty string after trimming
   * - Must not exceed reasonable length limits (100KB)
   * - Must not contain only whitespace characters
   * - Must be a valid string type (not null, undefined, or other types)
   * 
   * @param {any} text - Text content to validate
   * @returns {{isValid: boolean, error?: string, processedText?: string}} Validation result
   * 
   * @private
   */
  validateClipboardText(text) {
    // TYPE VALIDATION: Ensure input is a string or can be converted to one
    if (text === null || text === undefined) {
      return {
        isValid: false,
        error: 'Text cannot be null or undefined'
      };
    }

    // CONVERT TO STRING: Handle non-string inputs safely
    let textString;
    try {
      textString = String(text);
    } catch (error) {
      return {
        isValid: false,
        error: 'Text cannot be converted to string'
      };
    }

    // LENGTH VALIDATION: Check for reasonable size limits
    const maxLength = 100000; // 100KB limit for clipboard operations
    if (textString.length > maxLength) {
      return {
        isValid: false,
        error: `Text is too long (${textString.length} characters, maximum ${maxLength})`
      };
    }

    // CONTENT VALIDATION: Ensure text has meaningful content
    const trimmedText = textString.trim();
    if (trimmedText.length === 0) {
      return {
        isValid: false,
        error: 'Text is empty or contains only whitespace'
      };
    }

    // SUCCESS: Text passes all validation checks
    return {
      isValid: true,
      processedText: textString // Return original text (not trimmed)
    };
  }

  /**
   * Check if clipboard functionality is available
   * 
   * @returns {boolean} True if either modern API or fallback is available
   */
  isSupported() {
    return this.hasClipboardAPI || this.isExecCommandSupported();
  }

  /**
   * Check if execCommand copy is supported
   * 
   * @returns {boolean} True if execCommand('copy') is supported
   * 
   * @private
   */
  isExecCommandSupported() {
    try {
      return document.queryCommandSupported && document.queryCommandSupported('copy');
    } catch (error) {
      return false;
    }
  }

  /**
   * Get clipboard capabilities information
   * 
   * @returns {Object} Object describing available clipboard features
   * 
   * @example
   * const capabilities = clipboardManager.getCapabilities();
   * console.log('Modern API:', capabilities.hasModernAPI);
   * console.log('Fallback:', capabilities.hasFallback);
   */
  getCapabilities() {
    return {
      hasModernAPI: this.hasClipboardAPI,
      hasFallback: this.isExecCommandSupported(),
      isSupported: this.isSupported()
    };
  }
}

/**
 * Factory function to create a clipboard manager instance
 * 
 * @param {Object} notificationManager - Notification manager for user feedback
 * @returns {ClipboardManager} Configured clipboard manager instance
 * 
 * @example
 * import { createClipboardManager } from './clipboard.js';
 * 
 * const clipboardManager = createClipboardManager(notificationManager);
 */
export const createClipboardManager = (notificationManager) => {
  return new ClipboardManager(notificationManager);
};
