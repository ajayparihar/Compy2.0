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
   * Legacy clipboard copy method using execCommand
   * 
   * This method provides clipboard functionality for older browsers or
   * contexts where the modern Clipboard API is not available. It creates
   * a temporary textarea element to hold the text and uses document.execCommand
   * to copy it.
   * 
   * @param {string} text - Text to copy using legacy method
   * @returns {boolean} True if copy was successful
   * 
   * @private
   */
  fallbackCopy(text) {
    try {
      // Create temporary textarea for the copy operation
      const textarea = this.createTempTextarea(text);
      
      // Add to DOM, select, and copy
      document.body.appendChild(textarea);
      textarea.select();
      textarea.setSelectionRange(0, 99999); // For mobile devices
      
      // Attempt to copy using execCommand
      const successful = document.execCommand('copy');
      
      // Clean up temporary element
      document.body.removeChild(textarea);
      
      if (successful) {
        this.notifications.show('Copied to clipboard');
        return true;
      } else {
        this.notifications.show('Copy failed - please try manually', 'error');
        return false;
      }
    } catch (error) {
      console.error('Fallback copy also failed:', error);
      this.notifications.show('Copy not supported - please copy manually', 'error');
      return false;
    }
  }

  /**
   * Create a temporary textarea element for fallback copying
   * 
   * The textarea is positioned off-screen to avoid visual disruption
   * while still being selectable for the copy operation.
   * 
   * @param {string} text - Text to place in textarea
   * @returns {HTMLTextAreaElement} Configured textarea element
   * 
   * @private
   */
  createTempTextarea(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    
    // Style to keep it invisible but accessible
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    textarea.style.top = '-9999px';
    textarea.style.opacity = '0';
    textarea.style.pointerEvents = 'none';
    textarea.style.zIndex = '-1';
    
    // Ensure it's focusable for selection
    textarea.setAttribute('readonly', '');
    textarea.setAttribute('aria-hidden', 'true');
    
    return textarea;
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
