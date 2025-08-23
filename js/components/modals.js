/**
 * Modal Management Component for Compy 2.0
 * 
 * This module provides a comprehensive modal dialog management system that handles
 * opening, closing, and managing modal dialogs throughout the application. It includes
 * accessibility features, keyboard navigation, and focus management.
 * 
 * Features:
 * - Automatic focus management and restoration
 * - Keyboard navigation (Escape to close, Tab trapping)
 * - Accessibility support with ARIA attributes
 * - Stack management for nested modals
 * - Background click to close functionality
 * - Animation and transition support
 * 
 * @fileoverview Modal dialog management with accessibility features
 * @version 2.0
 * @author Bheb Developer
 * @since 2025
 */

import { $, $$, focusElement } from '../utils.js';

/**
 * ModalManager handles all modal dialog operations with accessibility support
 * 
 * This class manages the lifecycle of modal dialogs, ensuring proper focus
 * management, keyboard navigation, and accessibility compliance. It maintains
 * a stack of open modals and handles nested modal scenarios.
 * 
 * @class ModalManager
 * @example
 * const modalManager = new ModalManager();
 * 
 * // Open a modal
 * modalManager.open('#confirmModal');
 * 
 * // Close current modal
 * modalManager.close();
 * 
 * // Close specific modal
 * modalManager.close('#confirmModal');
 */
export class ModalManager {
  /**
   * Initialize the modal manager
   * 
   * @param {Object} [options={}] - Configuration options
   * @param {boolean} [options.closeOnBackdropClick=true] - Close modal when backdrop is clicked
   * @param {boolean} [options.closeOnEscape=true] - Close modal when Escape key is pressed
   * @param {number} [options.focusDelay=100] - Delay before focusing elements in milliseconds
   * @param {string} [options.activeClass='modal-open'] - CSS class applied to body when modal is open
   */
  constructor(options = {}) {
    // Merge options with defaults
    this.options = {
      closeOnBackdropClick: true,
      closeOnEscape: true,
      focusDelay: 100,
      activeClass: 'modal-open',
      ...options
    };

    // Initialize state
    this.modalStack = [];                    // Stack of open modals
    this.previousFocus = null;              // Element that had focus before modal opened
    this.focusableSelectors = this.getFocusableSelectors();
    
    // Bind methods to maintain context
    this.open = this.open.bind(this);
    this.close = this.close.bind(this);
    this.handleKeyboard = this.handleKeyboard.bind(this);
    this.handleBackdropClick = this.handleBackdropClick.bind(this);
    this.trapFocus = this.trapFocus.bind(this);
    
    // Initialize event listeners
    this.initializeEventListeners();
  }

  /**
   * Get CSS selectors for focusable elements
   * 
   * @returns {string} CSS selector string for focusable elements
   * @private
   */
  getFocusableSelectors() {
    return [
      'button:not([disabled])',
      '[href]:not([disabled])',
      'input:not([disabled]):not([type="hidden"])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"]):not([disabled])',
      'details:not([disabled])',
      'summary:not([disabled])'
    ].join(', ');
  }

  /**
   * Initialize global event listeners
   * 
   * Sets up keyboard and click event listeners that handle modal interactions
   * throughout the application.
   * 
   * @private
   */
  initializeEventListeners() {
    // Global keyboard handler
    document.addEventListener('keydown', this.handleKeyboard);
    
    // Setup click handlers for modal close buttons
    this.setupCloseHandlers();
  }

  /**
   * Setup click handlers for modal close buttons
   * 
   * Automatically wires up any elements with [data-close-modal] attribute
   * to close their parent modal when clicked.
   * 
   * @private
   */
  setupCloseHandlers() {
    $$('[data-close-modal]').forEach(button => {
      button.addEventListener('click', (e) => {
        e.preventDefault();
        
        // Find the closest modal to this button
        const modal = e.target.closest('.modal');
        if (modal) {
          this.close(`#${modal.id}`);
        }
      });
    });
  }

  /**
   * Open a modal dialog
   * 
   * This method opens the specified modal, manages focus, adds it to the modal
   * stack, and sets up proper accessibility attributes.
   * 
   * @param {string} selector - CSS selector for the modal element
   * @param {Object} [options={}] - Options for opening the modal
   * @param {boolean} [options.restoreFocus=true] - Whether to restore focus when modal closes
   * @param {string} [options.initialFocus] - CSS selector for element to focus initially
   * 
   * @example
   * // Basic modal opening
   * modalManager.open('#settingsModal');
   * 
   * // Open with specific initial focus
   * modalManager.open('#confirmModal', {
   *   initialFocus: '[data-action="confirm"]'
   * });
   * 
   * // Open without focus restoration
   * modalManager.open('#infoModal', { restoreFocus: false });
   */
  open(selector, options = {}) {
    const modal = $(selector);
    if (!modal) {
      console.warn(`Modal not found: ${selector}`);
      return false;
    }

    // Merge options
    const config = {
      restoreFocus: true,
      initialFocus: null,
      ...options
    };

    // Store previous focus if this is the first modal
    if (this.modalStack.length === 0) {
      this.previousFocus = document.activeElement;
    }

    // Add modal to stack
    const modalInfo = {
      element: modal,
      selector,
      config,
      timestamp: Date.now()
    };
    this.modalStack.push(modalInfo);

    // Show the modal
    this.showModal(modal, config);
    
    return true;
  }

  /**
   * Show a modal element with proper setup
   * 
   * @param {HTMLElement} modal - Modal element to show
   * @param {Object} config - Configuration options
   * @private
   */
  showModal(modal, config) {
    // Set accessibility attributes
    modal.setAttribute('aria-hidden', 'false');
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    
    // Add body class for styling
    document.body.classList.add(this.options.activeClass);
    
    // Setup backdrop click handler
    if (this.options.closeOnBackdropClick) {
      modal.addEventListener('click', this.handleBackdropClick);
    }
    
    // Focus management
    this.setupModalFocus(modal, config);
    
    // Setup focus trapping
    modal.addEventListener('keydown', this.trapFocus);
  }

  /**
   * Setup focus management for the modal
   * 
   * @param {HTMLElement} modal - Modal element
   * @param {Object} config - Configuration options
   * @private
   */
  setupModalFocus(modal, config) {
    let focusTarget;

    if (config.initialFocus) {
      // Use specified initial focus element
      focusTarget = modal.querySelector(config.initialFocus);
    }

    if (!focusTarget) {
      // Try to find a suitable focus target
      focusTarget = this.findInitialFocusTarget(modal);
    }

    // Focus the target element
    focusElement(focusTarget, this.options.focusDelay);
  }

  /**
   * Find an appropriate initial focus target within the modal
   * 
   * @param {HTMLElement} modal - Modal element to search within
   * @returns {HTMLElement|null} Element to focus or null if none found
   * @private
   */
  findInitialFocusTarget(modal) {
    // Priority order for focus targets
    const priorities = [
      '[data-close-modal]',           // Close buttons
      'button[data-primary]',         // Primary action buttons
      'input:not([type="hidden"])',   // Input fields
      'textarea',                     // Text areas
      'button',                       // Any button
      '[tabindex="0"]'               // Explicitly focusable elements
    ];

    for (const selector of priorities) {
      const target = modal.querySelector(selector);
      if (target && this.isVisible(target)) {
        return target;
      }
    }

    return null;
  }

  /**
   * Check if an element is visible
   * 
   * @param {HTMLElement} element - Element to check
   * @returns {boolean} True if element is visible
   * @private
   */
  isVisible(element) {
    const style = window.getComputedStyle(element);
    return style.display !== 'none' && 
           style.visibility !== 'hidden' && 
           style.opacity !== '0';
  }

  /**
   * Close a modal dialog
   * 
   * Closes the specified modal or the topmost modal if no selector is provided.
   * Handles focus restoration and cleanup.
   * 
   * @param {string} [selector] - CSS selector for specific modal to close
   * @returns {boolean} True if a modal was closed
   * 
   * @example
   * // Close topmost modal
   * modalManager.close();
   * 
   * // Close specific modal
   * modalManager.close('#settingsModal');
   */
  close(selector = null) {
    if (this.modalStack.length === 0) {
      return false;
    }

    let modalInfo;
    let stackIndex;

    if (selector) {
      // Find specific modal in stack
      stackIndex = this.modalStack.findIndex(info => info.selector === selector);
      if (stackIndex === -1) {
        return false;
      }
      modalInfo = this.modalStack[stackIndex];
    } else {
      // Close topmost modal
      stackIndex = this.modalStack.length - 1;
      modalInfo = this.modalStack[stackIndex];
    }

    // Remove from stack first
    this.modalStack.splice(stackIndex, 1);
    
    // Handle focus restoration BEFORE hiding modal to avoid ARIA issues
    this.handleFocusRestoration(modalInfo);
    
    // Small delay to ensure focus is moved before hiding modal
    setTimeout(() => {
      this.hideModal(modalInfo.element);
    }, 10);
    
    // Update body class if no modals remain
    if (this.modalStack.length === 0) {
      document.body.classList.remove(this.options.activeClass);
    }
    
    return true;
  }

  /**
   * Hide a modal element and clean up
   * 
   * @param {HTMLElement} modal - Modal element to hide
   * @private
   */
  hideModal(modal) {
    // Check if modal still has focused descendant and blur it first
    if (modal.contains(document.activeElement)) {
      document.activeElement.blur();
    }
    
    // Set accessibility attributes
    modal.setAttribute('aria-hidden', 'true');
    modal.removeAttribute('role');
    modal.removeAttribute('aria-modal');
    
    // Remove event listeners
    modal.removeEventListener('click', this.handleBackdropClick);
    modal.removeEventListener('keydown', this.trapFocus);
  }

  /**
   * Handle focus restoration when modal closes
   * 
   * @param {Object} modalInfo - Information about the closing modal
   * @private
   */
  handleFocusRestoration(modalInfo) {
    if (modalInfo.config.restoreFocus) {
      if (this.modalStack.length === 0) {
        // Last modal - restore original focus
        focusElement(this.previousFocus, this.options.focusDelay);
        this.previousFocus = null;
      } else {
        // Focus the previous modal in stack
        const previousModal = this.modalStack[this.modalStack.length - 1];
        const focusTarget = this.findInitialFocusTarget(previousModal.element);
        focusElement(focusTarget, this.options.focusDelay);
      }
    }
  }

  /**
   * Close all open modals
   * 
   * Closes all modals in the stack, useful for cleanup or navigation.
   * 
   * @example
   * // Close all modals when navigating away
   * modalManager.closeAll();
   */
  closeAll() {
    while (this.modalStack.length > 0) {
      this.close();
    }
  }

  /**
   * Handle keyboard events for modal interaction
   * 
   * @param {KeyboardEvent} e - Keyboard event
   * @private
   */
  handleKeyboard(e) {
    if (this.modalStack.length === 0) return;

    // Handle Escape key
    if (e.key === 'Escape' && this.options.closeOnEscape) {
      e.preventDefault();
      this.close();
    }
  }

  /**
   * Handle backdrop clicks to close modal
   * 
   * @param {MouseEvent} e - Click event
   * @private
   */
  handleBackdropClick(e) {
    // Only close if click was on the modal backdrop itself, not on modal content
    if (e.target === e.currentTarget) {
      this.close();
    }
  }

  /**
   * Trap focus within the modal
   * 
   * @param {KeyboardEvent} e - Keyboard event
   * @private
   */
  trapFocus(e) {
    if (e.key !== 'Tab') return;

    const modal = e.currentTarget;
    const focusableElements = modal.querySelectorAll(this.focusableSelectors);
    const focusableArray = Array.from(focusableElements).filter(el => this.isVisible(el));

    if (focusableArray.length === 0) return;

    const firstElement = focusableArray[0];
    const lastElement = focusableArray[focusableArray.length - 1];

    if (e.shiftKey) {
      // Shift + Tab: moving backwards
      if (document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      }
    } else {
      // Tab: moving forwards
      if (document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    }
  }

  /**
   * Get information about currently open modals
   * 
   * @returns {Object} Modal stack information
   * 
   * @example
   * const info = modalManager.getModalInfo();
   * console.log(`${info.count} modals open`);
   * console.log('Current modal:', info.current?.selector);
   */
  getModalInfo() {
    return {
      count: this.modalStack.length,
      current: this.modalStack[this.modalStack.length - 1] || null,
      stack: [...this.modalStack] // Return copy
    };
  }

  /**
   * Check if a specific modal is open
   * 
   * @param {string} selector - CSS selector for the modal
   * @returns {boolean} True if the modal is open
   * 
   * @example
   * if (modalManager.isOpen('#settingsModal')) {
   *   console.log('Settings modal is open');
   * }
   */
  isOpen(selector) {
    return this.modalStack.some(info => info.selector === selector);
  }

  /**
   * Check if any modal is open
   * 
   * @returns {boolean} True if any modal is open
   * 
   * @example
   * if (modalManager.hasOpenModals()) {
   *   console.log('At least one modal is open');
   * }
   */
  hasOpenModals() {
    return this.modalStack.length > 0;
  }

  /**
   * Update configuration options
   * 
   * @param {Object} newOptions - New options to merge
   * 
   * @example
   * // Disable backdrop click to close
   * modalManager.updateOptions({ closeOnBackdropClick: false });
   */
  updateOptions(newOptions) {
    this.options = { ...this.options, ...newOptions };
  }

  /**
   * Destroy the modal manager and clean up resources
   * 
   * Removes all event listeners and closes any open modals.
   */
  destroy() {
    // Close all modals
    this.closeAll();
    
    // Remove global event listeners
    document.removeEventListener('keydown', this.handleKeyboard);
    
    // Clear references
    this.modalStack = [];
    this.previousFocus = null;
  }
}

/**
 * Factory function to create a modal manager instance
 * 
 * @param {Object} [options={}] - Configuration options
 * @returns {ModalManager} Configured modal manager instance
 * 
 * @example
 * import { createModalManager } from './modals.js';
 * 
 * const modalManager = createModalManager({
 *   closeOnBackdropClick: false,
 *   focusDelay: 200
 * });
 */
export const createModalManager = (options = {}) => {
  return new ModalManager(options);
};
