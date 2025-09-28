/**
 * Drag and Drop Manager Component for Card Reordering
 * 
 * This component handles the initialization and management of SortableJS
 * for snippet cards, providing smooth drag-and-drop reordering functionality
 * with visual feedback and proper state management integration.
 * 
 * Features:
 * - Touch and mouse support for all devices
 * - Smooth animations during drag operations
 * - Visual feedback with ghost elements and drop zones
 * - Integration with state management for persistence
 * - Accessibility support with keyboard navigation fallback
 * 
 * @fileoverview Drag and drop functionality for snippet cards
 * @version 2.0
 * @author Bheb Developer
 * @since 2025
 */

import { reorderItems } from '../state.js?v=2.0.2';
import { Logger } from '../utils.js?v=2.0.2';

/**
 * @typedef {Object} DragDropOptions
 * @property {HTMLElement} container - The container element for draggable cards
 * @property {Function} onReorder - Callback function when items are reordered
 * @property {Function} [onStart] - Optional callback when drag starts
 * @property {Function} [onEnd] - Optional callback when drag ends
 * @property {boolean} [disabled=false] - Whether drag and drop is initially disabled
 * @property {number} [animationDuration=150] - Animation duration in milliseconds
 */

/**
 * Create and initialize drag and drop functionality for card reordering
 * 
 * This factory function creates a drag and drop manager that handles
 * SortableJS initialization, event handling, and state synchronization.
 * 
 * @param {DragDropOptions} options - Configuration options
 * @returns {Object} Drag and drop manager instance
 */
export const createDragDropManager = (options = {}) => {
  const {
    container,
    onReorder,
    onStart,
    onEnd,
    disabled = false,
    animationDuration = 150
  } = options;

  // Validate required options
  if (!container || !(container instanceof HTMLElement)) {
    throw new Error('DragDropManager requires a valid container element');
  }

  if (!onReorder || typeof onReorder !== 'function') {
    throw new Error('DragDropManager requires a valid onReorder callback');
  }

  // Internal state
  let sortableInstance = null;
  let isInitialized = false;
  let dragStartElement = null;
  let prevUserSelect = '';
  let prevWebkitUserSelect = '';

  /**
   * Initialize SortableJS on the container
   * 
   * Sets up SortableJS with optimized configuration for card reordering.
   * Includes touch support, visual feedback, and proper event handling.
   * 
   * @private
   */
  const initializeSortable = () => {
    if (!window.Sortable) {
      Logger.error('SortableJS not loaded. Please ensure the library is available.');
      throw new Error('SortableJS not available');
    }

    // Helper: announce messages to live region for assistive tech
    const announce = (message) => {
      try {
        const live = document.getElementById('liveRegion');
        if (!live) return;
        // Clear first to retrigger announcement
        live.textContent = '';
        setTimeout(() => { live.textContent = message; }, 10);
      } catch (e) {}
    };

    try {
      const prefersReducedMotion = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const effectiveAnimation = prefersReducedMotion ? 0 : animationDuration;

      // Helper: clear any active drop indicators
      const clearIndicators = () => {
        try {
          container.querySelectorAll('.card[data-drop-indicator]')
            .forEach(el => el.removeAttribute('data-drop-indicator'));
        } catch (e) {}
      };

      sortableInstance = new Sortable(container, {
        // Basic configuration
        animation: effectiveAnimation,
        disabled: disabled,
        draggable: '.card',

        // Swap when ~45% overlap to balance stability and responsiveness
        swapThreshold: 0.45,
        // Disable inverted swapping for more predictable grid behavior
        invertSwap: false,

        // Drag handle and filter
        handle: '.drag-handle',
        // Allow dragging from the drag-handle (even though it's a button); filter out other buttons
        filter: '.actions, .expand-trigger, .close-btn, button:not(.drag-handle)',
        preventOnFilter: true,

        // Scrolling behavior during drag (moderate)
        scroll: true,
        scrollSensitivity: 24,
        scrollSpeed: 10,
        
        // Visual feedback
        ghostClass: 'card-ghost',
        chosenClass: 'card-chosen',
        dragClass: 'card-drag',
        
        // Touch support for mobile devices
        touchStartThreshold: 3,
        forceFallback: false,
        fallbackOnBody: true,
        fallbackTolerance: 5,
        delayOnTouchOnly: true,
        delay: 120,
        easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
        
        // Accessibility
        setData: (dataTransfer, dragEl) => {
          const cardId = dragEl.dataset.cardId;
          const itemText = dragEl.querySelector('.title')?.textContent || '';
          dataTransfer.setData('text/plain', `Moving snippet: ${itemText}`);
          dataTransfer.effectAllowed = 'move';
        },

        // Event handlers
        onStart: (event) => {
          dragStartElement = event.item;
          clearIndicators();
          
          // Add visual feedback to container
          container.classList.add('cards-dragging');
          
          // Disable text selection during drag (store previous styles to restore later)
          prevUserSelect = document.body.style.userSelect;
          prevWebkitUserSelect = document.body.style.webkitUserSelect;
          document.body.style.userSelect = 'none';
          document.body.style.webkitUserSelect = 'none';
          
          // Call custom onStart callback
          if (onStart) {
            try {
              onStart(event);
            } catch (error) {
              Logger.error('Error in drag start callback:', error);
            }
          }
          
          Logger.debug('Drag started for card:', event.item.dataset.cardId);
        },

        onEnd: (event) => {
          // Clean up any drop indicators
          clearIndicators();
          
          // Clean up visual feedback
          container.classList.remove('cards-dragging');
          document.body.style.userSelect = prevUserSelect || '';
          document.body.style.webkitUserSelect = prevWebkitUserSelect || '';
          
          dragStartElement = null;
          
          // Handle reordering if position changed
          const { oldIndex, newIndex } = event;
          if (oldIndex !== newIndex) {
            handleReorder(event);
            // Announce new position to assistive technologies
            try {
              const total = container.querySelectorAll('[data-card-id]').length;
              const title = event.item.querySelector('.title')?.textContent?.trim() || 'snippet';
              const msg = `Moved ${title} to position ${Number(newIndex) + 1} of ${total}`;
              announce(msg);
            } catch (e) {}
          }
          
          // Call custom onEnd callback
          if (onEnd) {
            try {
              onEnd(event);
            } catch (error) {
              Logger.error('Error in drag end callback:', error);
            }
          }
          
          Logger.debug('Drag ended. Old index:', oldIndex, 'New index:', newIndex);
        },

        // Visual drop indicator (non-blocking)
        onMove: (evt) => {
          try {
            clearIndicators();
            const rel = evt.related;
            if (rel && rel.classList && rel.classList.contains('card')) {
              rel.setAttribute('data-drop-indicator', evt.willInsertAfter ? 'after' : 'before');
            }
          } catch (e) {}
          return true; // do not block Sortable's default behavior
        }
      });

      isInitialized = true;
      Logger.info('Drag and drop manager initialized successfully');

    } catch (error) {
      Logger.error('Failed to initialize SortableJS:', error);
      throw error;
    }
  };

  /**
   * Handle reordering after a successful drag and drop operation
   * 
   * Extracts the new order from the DOM and calls the state management
   * function to persist the changes.
   * 
   * @param {Event} event - SortableJS end event
   * @private
   */
  const handleReorder = (event) => {
    try {
      // Get the new order of card IDs
      const cardElements = container.querySelectorAll('[data-card-id]');
      const orderedIds = Array.from(cardElements).map(el => el.dataset.cardId);
      
      if (orderedIds.length === 0) {
        Logger.warn('No cards found for reordering');
        return;
      }

      // Call the reorder callback
      onReorder(orderedIds);
      
      Logger.debug('Cards reordered:', orderedIds);

    } catch (error) {
      Logger.error('Error handling reorder:', error);
      
      // Try to revert the DOM change if state update failed
      if (event && event.item && event.from) {
        try {
          if (event.oldIndex < event.from.children.length) {
            event.from.insertBefore(event.item, event.from.children[event.oldIndex]);
          } else {
            event.from.appendChild(event.item);
          }
        } catch (revertError) {
          Logger.error('Failed to revert drag operation:', revertError);
        }
      }
    }
  };

  /**
   * Enable or disable drag and drop functionality
   * 
   * @param {boolean} enable - Whether to enable drag and drop
   */
  const setEnabled = (enable) => {
    if (sortableInstance) {
      sortableInstance.option('disabled', !enable);
      Logger.debug('Drag and drop', enable ? 'enabled' : 'disabled');
    }
  };

  /**
   * Update animation duration
   * 
   * @param {number} duration - New animation duration in milliseconds
   */
  const setAnimationDuration = (duration) => {
    if (sortableInstance && typeof duration === 'number' && duration >= 0) {
      const prefersReducedMotion = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const effective = prefersReducedMotion ? 0 : duration;
      sortableInstance.option('animation', effective);
      Logger.debug('Animation duration updated to', effective + 'ms');
    }
  };

  /**
   * Refresh the sortable instance when DOM structure changes
   * 
   * This should be called after cards are added, removed, or the DOM
   * structure changes significantly.
   */
  const refresh = () => {
    if (sortableInstance) {
      // SortableJS doesn't have a direct refresh method, but we can
      // re-initialize if needed or just update the elements
      Logger.debug('Refreshing drag and drop manager');
    }
  };

  /**
   * Destroy the sortable instance and clean up resources
   */
  const destroy = () => {
    if (sortableInstance) {
      try {
        sortableInstance.destroy();
        sortableInstance = null;
        isInitialized = false;
        
        // Clean up any remaining visual states
        container.classList.remove('cards-dragging');
        document.body.style.userSelect = '';
        document.body.style.webkitUserSelect = '';
        
        Logger.debug('Drag and drop manager destroyed');
      } catch (error) {
        Logger.error('Error destroying drag and drop manager:', error);
      }
    }
  };

  /**
   * Get current state information
   * 
   * @returns {Object} Current state of the drag and drop manager
   */
  const getState = () => ({
    isInitialized,
    isEnabled: sortableInstance ? !sortableInstance.option('disabled') : false,
    animationDuration: sortableInstance ? sortableInstance.option('animation') : animationDuration,
    cardCount: container.querySelectorAll('[data-card-id]').length
  });

  // Auto-initialize if SortableJS is already available
  if (window.Sortable) {
    initializeSortable();
  } else {
    // Wait for SortableJS to load
    const checkSortable = () => {
      if (window.Sortable) {
        initializeSortable();
      } else {
        setTimeout(checkSortable, 100);
      }
    };
    checkSortable();
  }

  // Return public API
  return {
    // State management
    setEnabled,
    setAnimationDuration,
    getState,
    
    // Lifecycle
    refresh,
    destroy,
    
    // Properties
    get isInitialized() { return isInitialized; },
    get container() { return container; }
  };
};

/**
 * Factory function to create a drag and drop manager integrated with app state
 * 
 * This is a convenience function that creates a drag and drop manager
 * with automatic state management integration.
 * 
 * @param {HTMLElement} container - The container element for draggable cards
 * @param {Object} [options={}] - Additional options
 * @returns {Object} Configured drag and drop manager
 */
export const createCardDragDropManager = (container, options = {}) => {
  return createDragDropManager({
    container,
    onReorder: (orderedIds) => {
      // Integrate with app state management
      reorderItems(orderedIds);
    },
    ...options
  });
};