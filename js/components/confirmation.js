/**
 * Confirmation Modal Utility for Compy 2.0
 * 
 * This module provides a reusable confirmation dialog system that integrates
 * with the existing modal management system and theme support. It returns a
 * Promise that resolves based on the user's choice.
 * 
 * Features:
 * - Promise-based API for clean async/await usage
 * - Dynamic content injection (title, message, button labels)
 * - Theme-aware styling using CSS custom properties
 * - Accessibility support with proper focus management
 * - Multiple confirmation variants (danger, primary, warning)
 * - Keyboard support (Enter to confirm, Escape to cancel)
 * 
 * @fileoverview Reusable confirmation dialog utility
 * @version 2.0
 * @author Bheb Developer
 * @since 2025
 */

import { $, escapeHtml } from '../utils.js';

/**
 * @typedef {Object} ConfirmationOptions
 * @property {string} title - Modal title
 * @property {string} message - Confirmation message (can include HTML)
 * @property {string} [confirmText='Confirm'] - Text for confirm button
 * @property {string} [cancelText='Cancel'] - Text for cancel button
 * @property {'danger'|'primary'|'warning'} [variant='primary'] - Button variant
 * @property {string} [icon] - Optional icon for the modal (emoji or HTML)
 * @property {boolean} [allowHtml=false] - Allow HTML in message (sanitize if needed)
 */

/**
 * Confirmation modal manager with Promise-based API
 * 
 * This class manages a single confirmation modal instance and provides
 * methods to show confirmation dialogs with customizable content and styling.
 * It integrates with the existing ModalManager for proper modal behavior.
 */
export class ConfirmationManager {
  /**
   * Initialize the confirmation manager
   * 
   * @param {Object} modalManager - The application's modal manager instance
   */
  constructor(modalManager) {
    this.modalManager = modalManager;
    this.currentResolver = null;
    this.modalSelector = '#confirmModal';
    
    // Bind methods
    this.show = this.show.bind(this);
    this.handleConfirm = this.handleConfirm.bind(this);
    this.handleCancel = this.handleCancel.bind(this);
    this.handleKeyboard = this.handleKeyboard.bind(this);
    
    // Initialize event listeners
    this.initializeEventListeners();
  }
  
  /**
   * Setup event listeners for the confirmation modal
   * @private
   */
  initializeEventListeners() {
    // Confirm button click
    const confirmBtn = $('#confirmModalAction');
    if (confirmBtn) {
      confirmBtn.addEventListener('click', this.handleConfirm);
    }
    
    // Cancel button and close button clicks (handled by data-close-modal)
    const modal = $(this.modalSelector);
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target.hasAttribute('data-close-modal')) {
          this.handleCancel();
        }
      });
    }
    
    // Global keyboard handler for Enter key on confirm modal
    document.addEventListener('keydown', this.handleKeyboard);
  }
  
  /**
   * Handle keyboard shortcuts in confirmation modal
   * @param {KeyboardEvent} e - Keyboard event
   * @private
   */
  handleKeyboard(e) {
    // Only handle if confirmation modal is open
    if (!this.modalManager.isOpen(this.modalSelector)) {
      return;
    }
    
    // Handle Enter key to confirm (but not if focus is on cancel button)
    if (e.key === 'Enter' && document.activeElement?.hasAttribute('data-close-modal') === false) {
      e.preventDefault();
      this.handleConfirm();
    }
  }
  
  /**
   * Show a confirmation dialog
   * 
   * @param {ConfirmationOptions} options - Configuration options
   * @returns {Promise<boolean>} Promise that resolves to true if confirmed, false if cancelled
   * 
   * @example
   * const confirmed = await confirmationManager.show({
   *   title: 'Delete Item',
   *   message: 'Are you sure you want to delete this item? This action cannot be undone.',
   *   confirmText: 'Delete',
   *   cancelText: 'Cancel',
   *   variant: 'danger',
   *   icon: '🗑️'
   * });
   * 
   * if (confirmed) {
   *   // User confirmed - proceed with deletion
   *   deleteItem();
   * }
   */
  async show(options = {}) {
    // Resolve any pending confirmation first
    if (this.currentResolver) {
      this.currentResolver(false);
      this.currentResolver = null;
    }
    
    // Set default options
    const config = {
      title: 'Confirm Action',
      message: 'Are you sure you want to proceed?',
      confirmText: 'Confirm',
      cancelText: 'Cancel',
      variant: 'primary',
      icon: null,
      allowHtml: false,
      ...options
    };
    
    // Validate variant
    const validVariants = ['danger', 'primary', 'warning'];
    if (!validVariants.includes(config.variant)) {
      console.warn(`Invalid confirmation variant: ${config.variant}. Using 'primary'.`);
      config.variant = 'primary';
    }
    
    // Update modal content
    this.updateModalContent(config);
    
    // Create and return promise
    return new Promise((resolve) => {
      this.currentResolver = resolve;
      
      // Open the modal with proper focus
      this.modalManager.open(this.modalSelector, {
        initialFocus: '#confirmModalAction',
        restoreFocus: true
      });
    });
  }
  
  /**
   * Update the modal content with the provided configuration
   * @param {ConfirmationOptions} config - Configuration object
   * @private
   */
  updateModalContent(config) {
    const modal = $(this.modalSelector);
    if (!modal) {
      throw new Error('Confirmation modal not found in DOM');
    }
    
    // Update title
    const titleElement = $('#confirmModalTitle');
    if (titleElement) {
      titleElement.textContent = config.title;
    }
    
    // Update message
    const messageElement = $('#confirmModalMessage');
    if (messageElement) {
      // Clear any existing content first
      messageElement.innerHTML = '';
      
      if (config.allowHtml) {
        messageElement.innerHTML = config.message;
      } else {
        // Escape HTML for security, then convert line breaks to HTML for better formatting
        const escapedMessage = escapeHtml(config.message);
        const messageWithBreaks = escapedMessage.replace(/\n/g, '<br>');
        messageElement.innerHTML = messageWithBreaks;
      }
      
      // Add icon if provided
      if (config.icon) {
        const iconSpan = document.createElement('span');
        iconSpan.className = 'confirmation-icon';
        iconSpan.setAttribute('aria-hidden', 'true');
        iconSpan.innerHTML = config.icon;
        messageElement.insertBefore(iconSpan, messageElement.firstChild);
        messageElement.insertBefore(document.createTextNode(' '), messageElement.childNodes[1]);
      }
    }
    
    // Update buttons
    const confirmButton = $('#confirmModalAction');
    const cancelButton = modal.querySelector('.modal-footer .secondary-btn[data-close-modal]');
    
    if (confirmButton) {
      confirmButton.textContent = config.confirmText;
      
      // Apply variant styling
      this.applyButtonVariant(confirmButton, config.variant);
      
      // Update aria-label
      confirmButton.setAttribute('aria-label', `${config.confirmText} - ${config.title.toLowerCase()}`);
      
      // Add data-primary for focus management (ensure it's always present)
      confirmButton.setAttribute('data-primary', 'true');
      
      // Ensure proper aria-describedby relationship
      confirmButton.setAttribute('aria-describedby', 'confirmModalMessage');
    }
    
    if (cancelButton) {
      cancelButton.textContent = config.cancelText;
      cancelButton.setAttribute('aria-label', `${config.cancelText} - ${config.title.toLowerCase()}`);
    }
    
    // Update modal aria-labelledby
    modal.setAttribute('aria-labelledby', 'confirmModalTitle');
    modal.setAttribute('aria-describedby', 'confirmModalMessage');
  }
  
  /**
   * Apply variant styling to the confirm button
   * @param {HTMLElement} button - Button element
   * @param {string} variant - Variant type
   * @private
   */
  applyButtonVariant(button, variant) {
    // Remove all variant classes
    button.classList.remove('danger-btn', 'primary-btn', 'warning-btn', 'modal-danger-btn');
    
    // Add the appropriate variant class
    switch (variant) {
      case 'danger':
        button.classList.add('modal-danger-btn');
        break;
      case 'warning':
        button.classList.add('warning-btn');
        break;
      case 'primary':
      default:
        button.classList.add('primary-btn');
        break;
    }
  }
  
  /**
   * Handle confirm button click
   * @private
   */
  handleConfirm() {
    if (this.currentResolver) {
      this.currentResolver(true);
      this.currentResolver = null;
    }
    this.modalManager.close(this.modalSelector);
  }
  
  /**
   * Handle cancel/close actions
   * @private
   */
  handleCancel() {
    if (this.currentResolver) {
      this.currentResolver(false);
      this.currentResolver = null;
    }
    // Modal will be closed by the modal manager
  }
  
  /**
   * Clean up resources
   */
  destroy() {
    if (this.currentResolver) {
      this.currentResolver(false);
      this.currentResolver = null;
    }
    
    // Remove event listeners
    document.removeEventListener('keydown', this.handleKeyboard);
  }
}

/**
 * Factory function to create a confirmation manager instance
 * 
 * @param {Object} modalManager - Modal manager instance
 * @returns {ConfirmationManager} Configured confirmation manager
 */
export const createConfirmationManager = (modalManager) => {
  return new ConfirmationManager(modalManager);
};

/**
 * Convenience function for simple confirmations
 * This will be set by the application after initialization
 * @type {Function|null}
 */
export let confirm = null;

/**
 * Set the global confirm function
 * @param {Function} confirmFunction - The confirm function to use globally
 */
export const setGlobalConfirm = (confirmFunction) => {
  confirm = confirmFunction;
};
