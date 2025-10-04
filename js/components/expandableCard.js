/**
 * Expandable Card Component for Compy 2.0
 * 
 * This module provides an expandable card component that can expand from a fixed
 * size to a centered modal-like view with smooth transitions and animations.
 * The component includes accessibility features and keyboard navigation.
 * 
 * Features:
 * - Smooth expand/collapse animations with CSS transforms
 * - Backdrop click to close functionality
 * - Keyboard navigation (Escape to close, Space/Enter to expand)
 * - Focus management and restoration
 * - Accessibility support with ARIA attributes
 * - Touch-friendly interactions
 * - Integration with existing theme system
 * 
 * @fileoverview Expandable card component with modal-like expansion
 * @version 2.0
 * @author Bheb Developer
 * @since 2025
 */

import { $, $$, focusElement } from '../utils.js?v=2.0.3';

/**
 * ExpandableCardManager handles expandable card operations with accessibility support
 * 
 * This class manages the lifecycle of expandable cards, ensuring proper focus
 * management, keyboard navigation, and smooth animations. It handles multiple
 * cards and prevents conflicts between expanded states.
 * 
 * @class ExpandableCardManager
 * @example
 * const cardManager = createExpandableCardManager();
 * cardManager.init();
 * 
 * // Programmatically expand a card
 * cardManager.expand('#myCard');
 * 
 * // Programmatically collapse current card
 * cardManager.collapse();
 */
export class ExpandableCardManager {
  /**
   * Initialize the expandable card manager
   * 
   * @param {Object} [options={}] - Configuration options
   * @param {boolean} [options.closeOnBackdropClick=true] - Close card when backdrop is clicked
   * @param {boolean} [options.closeOnEscape=true] - Close card when Escape key is pressed
   * @param {number} [options.animationDuration=300] - Animation duration in milliseconds
   * @param {string} [options.expandedClass='expanded'] - CSS class applied when card is expanded
   */
  constructor(options = {}) {
    // Merge options with defaults
    this.options = {
      closeOnBackdropClick: true,
      closeOnEscape: true,
      animationDuration: 300,
      expandedClass: 'expanded',
      expandingClass: 'expanding',
      backdropClass: 'expandable-card-backdrop',
      ...options
    };

    // Initialize state
    this.expandedCard = null;               // Currently expanded card
    this.previousFocus = null;              // Element that had focus before expansion
    this.backdrop = null;                   // Backdrop element
    this.isAnimating = false;               // Animation state lock
    
    // Bind methods to maintain context
    this.init = this.init.bind(this);
    this.expand = this.expand.bind(this);
    this.collapse = this.collapse.bind(this);
    this.toggle = this.toggle.bind(this);
    this.handleKeyboard = this.handleKeyboard.bind(this);
    this.handleBackdropClick = this.handleBackdropClick.bind(this);
    this.handleExpandTrigger = this.handleExpandTrigger.bind(this);
    this.handleCloseTrigger = this.handleCloseTrigger.bind(this);
  }

  /**
   * Initialize the expandable card system
   * 
   * Sets up event listeners and finds all expandable cards in the DOM.
   * Should be called after DOM content is loaded.
   * 
   * @public
   */
  init() {
    // Find and setup all expandable cards
    this.setupCards();
    
    // Setup global event listeners
    this.setupGlobalListeners();
    
    // Setup backdrop
    this.setupBackdrop();
    
    console.debug('ExpandableCardManager initialized');
  }

  /**
   * Setup all expandable cards found in the DOM
   * 
   * @private
   */
  setupCards() {
    const cards = $$('.expandable-card');
    
    cards.forEach((card, index) => {
      // Ensure each card has a unique ID
      if (!card.id) {
        card.id = `expandable-card-${index + 1}`;
      }
      
      // Setup card-specific event listeners
      this.setupCardListeners(card);
      
      // Initialize card state
      this.initializeCardState(card);
    });
    
    console.debug(`Setup ${cards.length} expandable card(s)`);
  }

  /**
   * Setup event listeners for a specific card
   * 
   * @param {HTMLElement} card - The card element to setup
   * @private
   */
  setupCardListeners(card) {
    // Expand trigger button
    const expandTrigger = card.querySelector('.expand-trigger');
    if (expandTrigger) {
      expandTrigger.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.handleExpandTrigger(card);
      });
    }

    // Close trigger button
    const closeTrigger = card.querySelector('.close-btn');
    if (closeTrigger) {
      closeTrigger.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.handleCloseTrigger(card);
      });
    }

    // Collapse trigger button (for data-act="collapse")
    const collapseTrigger = card.querySelector('[data-act="collapse"]');
    if (collapseTrigger) {
      collapseTrigger.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.handleCloseTrigger(card);
      });
    }

    // Card click (only when not expanded)
    card.addEventListener('click', (e) => {
      // Don't expand if clicking on buttons or interactive elements
      if (e.target.closest('button, a, input, select, textarea')) {
        return;
      }
      
      // Only expand if not already expanded
      if (!card.classList.contains(this.options.expandedClass)) {
        this.handleExpandTrigger(card);
      }
    });

    // Keyboard support for card
    card.addEventListener('keydown', (e) => {
      if (e.target === card) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (card.classList.contains(this.options.expandedClass)) {
            this.collapse();
          } else {
            this.expand(card);
          }
        }
      }
    });
  }

  /**
   * Initialize the state of a card element
   * 
   * @param {HTMLElement} card - Card element to initialize
   * @private
   */
  initializeCardState(card) {
    // Store original position for grid-based cards
    const isGridCard = card.classList.contains('card') && card.closest('.cards');
    if (isGridCard) {
      // Store original position and size for restoration
      const rect = card.getBoundingClientRect();
      const computedStyle = window.getComputedStyle(card);
      
      card.dataset.originalPosition = JSON.stringify({
        position: computedStyle.position,
        top: computedStyle.top,
        left: computedStyle.left,
        width: computedStyle.width,
        height: computedStyle.height,
        transform: computedStyle.transform
      });
    }

    // Don't make grid cards focusable via tabindex - they handle their own focus
    if (!isGridCard && !card.hasAttribute('tabindex')) {
      card.setAttribute('tabindex', '0');
    }

    // Set initial ARIA attributes for standalone cards only
    if (!isGridCard) {
      card.setAttribute('aria-expanded', 'false');
      card.setAttribute('role', 'button');
      card.setAttribute('aria-label', card.getAttribute('aria-label') || 'Expandable card. Press Enter or Space to expand.');
    }

    // Ensure details are hidden initially
    const details = card.querySelector('.card-details');
    if (details) {
      details.hidden = true;
    }

    // Ensure close button is hidden initially
    const closeBtn = card.querySelector('.close-btn');
    if (closeBtn) {
      closeBtn.hidden = true;
    }

    // Ensure collapse button is hidden initially and expand button is shown
    // Note: CSS handles visibility via opacity/pointer-events, not hidden attribute
    const expandBtn = card.querySelector('[data-act="expand"]');
    const collapseBtn = card.querySelector('[data-act="collapse"]');
    if (expandBtn) {
      expandBtn.classList.remove('card-action-hidden');
    }
    if (collapseBtn) {
      collapseBtn.classList.add('card-action-hidden');
    }
  }

  /**
   * Setup global event listeners
   * 
   * @private
   */
  setupGlobalListeners() {
    // Global keyboard handler
    document.addEventListener('keydown', this.handleKeyboard);
  }

  /**
   * Setup or find the backdrop element
   * 
   * @private
   */
  setupBackdrop() {
    this.backdrop = $('.expandable-card-backdrop');
    
    if (this.backdrop) {
      // Setup backdrop click handler
      this.backdrop.addEventListener('click', this.handleBackdropClick);
    } else {
      console.warn('Expandable card backdrop not found');
    }
  }

  /**
   * Handle expand trigger activation
   * 
   * @param {HTMLElement} card - Card to expand
   * @private
   */
  handleExpandTrigger(card) {
    if (this.isAnimating) return;
    this.expand(card);
  }

  /**
   * Handle close trigger activation
   * 
   * @param {HTMLElement} card - Card to close
   * @private
   */
  handleCloseTrigger(card) {
    if (this.isAnimating) return;
    this.collapse();
  }

  /**
   * Handle keyboard events
   * 
   * @param {KeyboardEvent} e - Keyboard event
   * @private
   */
  handleKeyboard(e) {
    // Only handle events when a card is expanded
    if (!this.expandedCard) return;

    if (e.key === 'Escape' && this.options.closeOnEscape) {
      e.preventDefault();
      this.collapse();
    }
  }

  /**
   * Handle backdrop clicks
   * 
   * @param {MouseEvent} e - Click event
   * @private
   */
  handleBackdropClick(e) {
    if (e.target === this.backdrop && this.options.closeOnBackdropClick) {
      this.collapse();
    }
  }

  /**
   * Expand a card to full view
   * 
   * @param {HTMLElement|string} cardOrSelector - Card element or CSS selector
   * @public
   */
  async expand(cardOrSelector) {
    if (this.isAnimating) return false;

    const card = typeof cardOrSelector === 'string' ? $(cardOrSelector) : cardOrSelector;
    if (!card) {
      console.warn('Card not found for expansion');
      return false;
    }

    // If another card is already expanded, collapse it first
    if (this.expandedCard && this.expandedCard !== card) {
      await this.collapse();
    }

    this.isAnimating = true;
    this.expandedCard = card;
    
    // Store previous focus
    this.previousFocus = document.activeElement;

    try {
      // Prevent body scrolling when card is expanded
      document.body.classList.add('modal-open');
      
      // Show backdrop
      if (this.backdrop) {
        this.backdrop.hidden = false;
        this.backdrop.classList.add('show');
      }

      // Add expanding class for animation
      card.classList.add(this.options.expandingClass);
      
      // Update ARIA attributes
      card.setAttribute('aria-expanded', 'true');
      card.setAttribute('aria-label', 'Expanded card. Press Escape to close.');

      // Show detailed content
      const details = card.querySelector('.card-details');
      if (details) {
        details.hidden = false;
      }

      // Show close button
      const closeBtn = card.querySelector('.close-btn');
      if (closeBtn) {
        closeBtn.hidden = false;
      }

      // Show collapse button and hide expand button
      const expandBtn = card.querySelector('[data-act="expand"]');
      const collapseBtn = card.querySelector('[data-act="collapse"]');
      if (expandBtn) {
        expandBtn.classList.add('card-action-hidden');
      }
      if (collapseBtn) {
        collapseBtn.classList.remove('card-action-hidden');
      }

      // Apply expanded state after a small delay for animation
      await this.delay(50);
      
      card.classList.add(this.options.expandedClass);
      card.classList.remove(this.options.expandingClass);

      // Focus the close button for accessibility
      const closeBtnToFocus = card.querySelector('.close-btn');
      if (closeBtnToFocus) {
        setTimeout(() => {
          focusElement(closeBtnToFocus);
        }, this.options.animationDuration);
      }

      console.debug('Card expanded:', card.id);
      
      // Dispatch custom event
      card.dispatchEvent(new CustomEvent('cardExpanded', {
        detail: { card }
      }));

    } catch (error) {
      console.error('Error expanding card:', error);
    } finally {
      this.isAnimating = false;
    }

    return true;
  }

  /**
   * Collapse the currently expanded card
   * 
   * @public
   */
  async collapse() {
    if (this.isAnimating || !this.expandedCard) return false;

    this.isAnimating = true;
    const card = this.expandedCard;

    try {
      // Remove expanded state
      card.classList.remove(this.options.expandedClass);
      
      // Update ARIA attributes
      card.setAttribute('aria-expanded', 'false');
      card.setAttribute('aria-label', 'Expandable card. Press Enter or Space to expand.');

      // Hide backdrop
      if (this.backdrop) {
        this.backdrop.classList.remove('show');
      }
      
      // Restore body scrolling when card is collapsed
      document.body.classList.remove('modal-open');

      // Wait for animation to complete
      await this.delay(this.options.animationDuration);

      // Hide detailed content
      const details = card.querySelector('.card-details');
      if (details) {
        details.hidden = true;
      }

      // Hide close button
      const closeBtn = card.querySelector('.close-btn');
      if (closeBtn) {
        closeBtn.hidden = true;
      }

      // Hide collapse button and show expand button
      const expandBtn = card.querySelector('[data-act="expand"]');
      const collapseBtn = card.querySelector('[data-act="collapse"]');
      if (expandBtn) {
        expandBtn.classList.remove('card-action-hidden');
      }
      if (collapseBtn) {
        collapseBtn.classList.add('card-action-hidden');
      }

      // Hide backdrop completely
      if (this.backdrop) {
        this.backdrop.hidden = true;
      }

      // Restore focus
      if (this.previousFocus && typeof this.previousFocus.focus === 'function') {
        try {
          this.previousFocus.focus();
        } catch (e) {
          // Focus restoration failed, focus the card itself
          card.focus();
        }
      }

      console.debug('Card collapsed:', card.id);
      
      // Dispatch custom event
      card.dispatchEvent(new CustomEvent('cardCollapsed', {
        detail: { card }
      }));

    } catch (error) {
      console.error('Error collapsing card:', error);
    } finally {
      this.expandedCard = null;
      this.previousFocus = null;
      this.isAnimating = false;
    }

    return true;
  }

  /**
   * Toggle the expansion state of a card
   * 
   * @param {HTMLElement|string} cardOrSelector - Card element or CSS selector
   * @public
   */
  toggle(cardOrSelector) {
    const card = typeof cardOrSelector === 'string' ? $(cardOrSelector) : cardOrSelector;
    if (!card) return false;

    if (card.classList.contains(this.options.expandedClass)) {
      return this.collapse();
    } else {
      return this.expand(card);
    }
  }

  /**
   * Check if a card is currently expanded
   * 
   * @param {HTMLElement|string} [cardOrSelector] - Card to check, or current expanded card if omitted
   * @returns {boolean} True if the card is expanded
   * @public
   */
  isExpanded(cardOrSelector = null) {
    if (!cardOrSelector) {
      return !!this.expandedCard;
    }
    
    const card = typeof cardOrSelector === 'string' ? $(cardOrSelector) : cardOrSelector;
    return card && card === this.expandedCard;
  }

  /**
   * Get the currently expanded card
   * 
   * @returns {HTMLElement|null} Currently expanded card or null
   * @public
   */
  getCurrentExpandedCard() {
    return this.expandedCard;
  }

  /**
   * Utility method to create a delay promise
   * 
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise} Promise that resolves after the delay
   * @private
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Destroy the expandable card manager and clean up
   * 
   * @public
   */
  destroy() {
    // Collapse any expanded card
    if (this.expandedCard) {
      this.collapse();
    }

    // Remove global listeners
    document.removeEventListener('keydown', this.handleKeyboard);
    
    // Clean up backdrop
    if (this.backdrop) {
      this.backdrop.removeEventListener('click', this.handleBackdropClick);
    }

    // Clear state
    this.expandedCard = null;
    this.previousFocus = null;
    this.backdrop = null;

    console.debug('ExpandableCardManager destroyed');
  }
}

/**
 * Create and initialize an expandable card manager instance
 * 
 * @param {Object} [options={}] - Configuration options
 * @returns {ExpandableCardManager} Initialized expandable card manager
 * @public
 */
export function createExpandableCardManager(options = {}) {
  const manager = new ExpandableCardManager(options);
  return manager;
}

/**
 * Default export for easy importing
 */
export default { ExpandableCardManager, createExpandableCardManager };