/**
 * Mobile Navigation Component for Compy 2.0
 * 
 * This module provides a reusable mobile navigation drawer system with
 * full accessibility support, state management, and event handling.
 * 
 * Features:
 * - ARIA-compliant hamburger menu and drawer
 * - Backdrop overlay with click-to-close
 * - Keyboard navigation (Escape to close)
 * - Multiple close triggers for better UX
 * - CSS transition integration
 * 
 * @fileoverview Reusable mobile navigation drawer component
 * @version 2.0
 * @author Bheb Developer
 * @since 2025
 */

import { $ } from '../utils.js?v=2.0.2';

/**
 * MobileNavigationManager handles mobile drawer navigation functionality
 * 
 * This class encapsulates all mobile navigation logic including state management,
 * event handling, and accessibility features in a reusable component.
 * 
 * @class MobileNavigationManager
 * @example
 * const mobileNav = new MobileNavigationManager({
 *   toggleSelector: '#navToggle',
 *   drawerSelector: '#navActions',
 *   backdropSelector: '#navBackdrop'
 * });
 * mobileNav.init();
 */
export class MobileNavigationManager {
  /**
   * Initialize the mobile navigation manager
   * 
   * @param {Object} options - Configuration options
   * @param {string} options.toggleSelector - CSS selector for toggle button
   * @param {string} options.drawerSelector - CSS selector for navigation drawer
   * @param {string} [options.backdropSelector] - CSS selector for backdrop overlay
   * @param {number} [options.closeDelay=100] - Delay before closing after action
   */
  constructor(options = {}) {
    this.options = {
      closeDelay: 100,
      ...options
    };
    
    // State
    this.isInitialized = false;
    
    // Bind methods to maintain context
    this.init = this.init.bind(this);
    this.destroy = this.destroy.bind(this);
    this.toggle = this.toggle.bind(this);
    this.open = this.open.bind(this);
    this.close = this.close.bind(this);
    this.handleToggleClick = this.handleToggleClick.bind(this);
    this.handleBackdropClick = this.handleBackdropClick.bind(this);
    this.handleDocumentClick = this.handleDocumentClick.bind(this);
    this.handleNavItemClick = this.handleNavItemClick.bind(this);
    this.handleKeydown = this.handleKeydown.bind(this);
  }
  
  /**
   * Initialize the mobile navigation system
   * 
   * Sets up all event listeners and validates required elements exist.
   * 
   * @returns {boolean} True if initialization succeeded
   */
  init() {
    if (this.isInitialized) return true;
    
    // Get DOM elements
    this.toggleElement = $(this.options.toggleSelector);
    this.drawerElement = $(this.options.drawerSelector);
    this.backdropElement = this.options.backdropSelector ? $(this.options.backdropSelector) : null;
    
    // Validate required elements
    if (!this.toggleElement || !this.drawerElement) {
      console.warn('Mobile navigation elements not found:', {
        toggle: !!this.toggleElement,
        drawer: !!this.drawerElement
      });
      return false;
    }
    
    // Setup event listeners
    this.attachEventListeners();
    
    this.isInitialized = true;
    return true;
  }
  
  /**
   * Attach all necessary event listeners
   * 
   * @private
   */
  attachEventListeners() {
    // Toggle button click
    this.toggleElement.addEventListener('click', this.handleToggleClick);
    
    // Backdrop click to close
    if (this.backdropElement) {
      this.backdropElement.addEventListener('click', this.handleBackdropClick);
    }
    
    // Document click to close when clicking outside
    document.addEventListener('click', this.handleDocumentClick);
    
    // Navigation item clicks
    this.drawerElement.addEventListener('click', this.handleNavItemClick);
    
    // Keyboard navigation
    document.addEventListener('keydown', this.handleKeydown);
  }
  
  /**
   * Remove all event listeners
   * 
   * @private
   */
  removeEventListeners() {
    if (this.toggleElement) {
      this.toggleElement.removeEventListener('click', this.handleToggleClick);
    }
    
    if (this.backdropElement) {
      this.backdropElement.removeEventListener('click', this.handleBackdropClick);
    }
    
    document.removeEventListener('click', this.handleDocumentClick);
    
    if (this.drawerElement) {
      this.drawerElement.removeEventListener('click', this.handleNavItemClick);
    }
    
    document.removeEventListener('keydown', this.handleKeydown);
  }
  
  /**
   * Toggle navigation drawer state
   */
  toggle() {
    const isExpanded = this.toggleElement.getAttribute('aria-expanded') === 'true';
    
    if (isExpanded) {
      this.close();
    } else {
      this.open();
    }
  }
  
  /**
   * Open the navigation drawer
   */
  open() {
    // Update ARIA states for accessibility
    this.toggleElement.setAttribute('aria-expanded', 'true');
    this.drawerElement.setAttribute('aria-hidden', 'false');
    
    if (this.backdropElement) {
      this.backdropElement.setAttribute('aria-hidden', 'false');
    }
    
    // Add CSS classes for transitions
    this.drawerElement.classList.add('open');
    if (this.backdropElement) {
      this.backdropElement.classList.add('open');
    }
  }
  
  /**
   * Close the navigation drawer
   */
  close() {
    // Update ARIA states
    this.toggleElement.setAttribute('aria-expanded', 'false');
    this.drawerElement.setAttribute('aria-hidden', 'true');
    
    if (this.backdropElement) {
      this.backdropElement.setAttribute('aria-hidden', 'true');
    }
    
    // Remove CSS classes
    this.drawerElement.classList.remove('open');
    if (this.backdropElement) {
      this.backdropElement.classList.remove('open');
    }
  }
  
  /**
   * Check if navigation drawer is currently open
   * 
   * @returns {boolean} True if drawer is open
   */
  isOpen() {
    return this.toggleElement?.getAttribute('aria-expanded') === 'true';
  }
  
  /**
   * Handle toggle button click
   * 
   * @param {Event} e - Click event
   * @private
   */
  handleToggleClick(e) {
    e.preventDefault();
    e.stopPropagation();
    this.toggle();
  }
  
  /**
   * Handle backdrop click to close drawer
   * 
   * @private
   */
  handleBackdropClick() {
    this.close();
  }
  
  /**
   * Handle document click to close drawer when clicking outside
   * 
   * @param {Event} e - Click event
   * @private
   */
  handleDocumentClick(e) {
    if (!this.isOpen()) return;
    
    const isNavContent = e.target.closest(this.options.drawerSelector);
    const isToggleButton = e.target.closest(this.options.toggleSelector);
    
    // Close if click is outside navigation area
    if (!isNavContent && !isToggleButton) {
      this.close();
    }
  }
  
  /**
   * Handle navigation item clicks
   * 
   * @param {Event} e - Click event
   * @private
   */
  handleNavItemClick(e) {
    const isButton = e.target.closest('button');
    
    if (isButton && this.isOpen()) {
      // Add small delay to allow action to complete before closing
      setTimeout(() => this.close(), this.options.closeDelay);
    }
  }
  
  /**
   * Handle keyboard navigation (Escape to close)
   * 
   * @param {KeyboardEvent} e - Keyboard event
   * @private
   */
  handleKeydown(e) {
    if (e.key === 'Escape' && this.isOpen()) {
      this.close();
    }
  }
  
  /**
   * Clean up resources and remove event listeners
   */
  destroy() {
    if (!this.isInitialized) return;
    
    this.removeEventListeners();
    
    // Clear references
    this.toggleElement = null;
    this.drawerElement = null;
    this.backdropElement = null;
    
    this.isInitialized = false;
  }
}

/**
 * Factory function to create a mobile navigation manager instance
 * 
 * @param {Object} options - Configuration options
 * @returns {MobileNavigationManager} Configured navigation manager
 * 
 * @example
 * import { createMobileNavigationManager } from './mobileNavigation.js';
 * 
 * const mobileNav = createMobileNavigationManager({
 *   toggleSelector: '#hamburger',
 *   drawerSelector: '#sidebar',
 *   backdropSelector: '#overlay'
 * });
 * mobileNav.init();
 */
export const createMobileNavigationManager = (options = {}) => {
  return new MobileNavigationManager(options);
};