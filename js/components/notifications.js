/**
 * Notification Management Component for Compy 2.0
 * 
 * This module provides a comprehensive notification system for user feedback
 * throughout the application. It handles success messages, error alerts, 
 * and informational notifications with customizable duration and styling.
 * 
 * Features:
 * - Multiple notification types (info, success, error, warning)
 * - Configurable display duration
 * - Queue management for multiple notifications
 * - Automatic cleanup and memory management
 * - Accessibility support with ARIA attributes
 * 
 * @fileoverview User notification system with queue management
 * @version 2.0
 * @author Bheb Developer
 * @since 2025
 */

import { UI_CONFIG } from '../constants.js';
import { $ } from '../utils.js';

/**
 * NotificationManager handles all user notifications and feedback
 * 
 * This class manages the display of transient messages to users, including
 * success confirmations, error alerts, and informational messages. It provides
 * a consistent interface for user feedback throughout the application.
 * 
 * @class NotificationManager
 * @example
 * const notificationManager = new NotificationManager();
 * 
 * // Show success message
 * notificationManager.show('Item saved successfully', 'success');
 * 
 * // Show error message
 * notificationManager.show('Failed to save item', 'error');
 * 
 * // Show with custom duration
 * notificationManager.show('Processing...', 'info', 5000);
 */
export class NotificationManager {
  /**
   * Initialize the notification manager
   * 
   * @param {Object} [options={}] - Configuration options
   * @param {number} [options.defaultDuration] - Default display duration in milliseconds
   * @param {string} [options.containerSelector='#snackbar'] - CSS selector for notification container
   */
  constructor(options = {}) {
    // Merge options with defaults
    this.options = {
      defaultDuration: UI_CONFIG.snackbarDuration,
      containerSelector: '#snackbar',
      ...options
    };

    // Initialize state
    this.queue = [];                  // Queue of pending notifications
    this.currentNotification = null;  // Currently displayed notification
    this.timeoutId = null;           // Timeout for current notification
    
    // Get or create notification container
    this.container = this.initializeContainer();
    
    // Bind methods to maintain context
    this.show = this.show.bind(this);
    this.hide = this.hide.bind(this);
    this.processQueue = this.processQueue.bind(this);
  }

  /**
   * Initialize or find the notification container element
   * 
   * @returns {HTMLElement} The notification container element
   * @private
   */
  initializeContainer() {
    let container = $(this.options.containerSelector);
    
    if (!container) {
      // Create container if it doesn't exist
      container = this.createContainer();
    }
    
    return container;
  }

  /**
   * Create a notification container element with proper styling and accessibility
   * 
   * @returns {HTMLElement} Newly created notification container
   * @private
   */
  createContainer() {
    const container = document.createElement('div');
    container.id = this.options.containerSelector.replace('#', '');
    container.className = 'snackbar';
    container.setAttribute('role', 'alert');
    container.setAttribute('aria-live', 'polite');
    container.setAttribute('aria-atomic', 'true');
    
    // Add to document body
    document.body.appendChild(container);
    
    return container;
  }

  /**
   * Show a notification message
   * 
   * This method displays a notification to the user. If another notification
   * is currently displayed, the new one is queued and shown when the current
   * one finishes.
   * 
   * @param {string} message - Message text to display
   * @param {string} [type='info'] - Notification type: 'info', 'success', 'error', 'warning'
   * @param {number} [duration] - Display duration in milliseconds (uses default if not specified)
   * 
   * @example
   * // Basic info notification
   * notificationManager.show('Data updated');
   * 
   * // Success notification
   * notificationManager.show('File saved successfully', 'success');
   * 
   * // Error with longer duration
   * notificationManager.show('Network error occurred', 'error', 5000);
   */
  show(message, type = 'info', duration = this.options.defaultDuration) {
    if (!message) return;

    // Create notification object
    const notification = {
      id: this.generateNotificationId(),
      message: String(message).trim(),
      type: this.validateType(type),
      duration: Math.max(1000, Number(duration) || this.options.defaultDuration),
      timestamp: Date.now()
    };

    // Add to queue
    this.queue.push(notification);

    // Process queue if no notification is currently shown
    if (!this.currentNotification) {
      this.processQueue();
    }
  }

  /**
   * Process the notification queue
   * 
   * Displays the next notification in the queue if any exist.
   * This method is called automatically when new notifications are added
   * or when the current notification finishes.
   * 
   * @private
   */
  processQueue() {
    // Return if already showing a notification or queue is empty
    if (this.currentNotification || this.queue.length === 0) {
      return;
    }

    // Get next notification from queue
    const notification = this.queue.shift();
    this.displayNotification(notification);
  }

  /**
   * Display a single notification
   * 
   * @param {Object} notification - Notification object to display
   * @private
   */
  displayNotification(notification) {
    this.currentNotification = notification;

    // Update container content and styling
    this.updateContainer(notification);

    // Show the notification
    this.container.classList.add('show');

    // Set timer to hide after duration
    this.timeoutId = setTimeout(() => {
      this.hide();
    }, notification.duration);
  }

  /**
   * Update container with notification content and styling
   * 
   * @param {Object} notification - Notification to display
   * @private
   */
  updateContainer(notification) {
    // Set text content
    this.container.textContent = notification.message;

    // Update CSS classes for styling
    this.container.className = `snackbar ${notification.type}`;

    // Update accessibility attributes
    this.container.setAttribute('data-notification-id', notification.id);
    this.container.setAttribute('data-notification-type', notification.type);
  }

  /**
   * Hide the current notification
   * 
   * This method hides the currently displayed notification and processes
   * the next one in the queue if available.
   * 
   * @example
   * // Manually hide current notification
   * notificationManager.hide();
   */
  hide() {
    if (!this.currentNotification) return;

    // Clear timeout
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }

    // Hide notification
    this.container.classList.remove('show');

    // Clear current notification
    this.currentNotification = null;

    // Process next notification in queue after a brief delay
    setTimeout(() => {
      this.processQueue();
    }, 300); // Allow time for hide animation
  }

  /**
   * Clear all pending notifications
   * 
   * Removes all notifications from the queue and hides the current one.
   * Useful for cleaning up when navigating away or resetting the application state.
   * 
   * @example
   * // Clear all notifications when changing pages
   * notificationManager.clear();
   */
  clear() {
    // Clear queue
    this.queue = [];

    // Hide current notification
    this.hide();
  }

  /**
   * Show multiple notifications in sequence
   * 
   * @param {Array} notifications - Array of notification objects
   * @param {number} [delayBetween=0] - Delay between notifications in milliseconds
   * 
   * @example
   * // Show multiple related notifications
   * notificationManager.showMultiple([
   *   { message: 'Starting backup...', type: 'info' },
   *   { message: 'Backup completed', type: 'success', duration: 3000 }
   * ], 500);
   */
  showMultiple(notifications, delayBetween = 0) {
    if (!Array.isArray(notifications)) return;

    notifications.forEach((notification, index) => {
      const delay = index * delayBetween;
      setTimeout(() => {
        this.show(
          notification.message,
          notification.type || 'info',
          notification.duration
        );
      }, delay);
    });
  }

  /**
   * Generate unique notification ID
   * 
   * @returns {string} Unique notification identifier
   * @private
   */
  generateNotificationId() {
    return `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Validate and normalize notification type
   * 
   * @param {string} type - Notification type to validate
   * @returns {string} Valid notification type
   * @private
   */
  validateType(type) {
    const validTypes = ['info', 'success', 'error', 'warning'];
    return validTypes.includes(type) ? type : 'info';
  }

  /**
   * Get current notification information
   * 
   * @returns {Object|null} Current notification object or null if none active
   * 
   * @example
   * const current = notificationManager.getCurrentNotification();
   * if (current) {
   *   console.log('Current notification:', current.message, current.type);
   * }
   */
  getCurrentNotification() {
    return this.currentNotification;
  }

  /**
   * Get queue status information
   * 
   * @returns {Object} Queue status with count and pending notifications
   * 
   * @example
   * const status = notificationManager.getQueueStatus();
   * console.log(`${status.count} notifications pending`);
   */
  getQueueStatus() {
    return {
      count: this.queue.length,
      hasActive: Boolean(this.currentNotification),
      queue: [...this.queue] // Return copy to prevent external modification
    };
  }

  /**
   * Update configuration options
   * 
   * @param {Object} newOptions - New configuration options to merge
   * 
   * @example
   * // Change default duration
   * notificationManager.updateOptions({ defaultDuration: 3000 });
   */
  updateOptions(newOptions) {
    this.options = { ...this.options, ...newOptions };
  }

  /**
   * Destroy the notification manager and clean up resources
   * 
   * Call this method when the notification manager is no longer needed
   * to prevent memory leaks and clean up DOM elements.
   */
  destroy() {
    // Clear all notifications and timeouts
    this.clear();

    // Remove container from DOM if we created it
    if (this.container && this.container.id === this.options.containerSelector.replace('#', '')) {
      this.container.remove();
    }

    // Clear references
    this.container = null;
    this.currentNotification = null;
    this.queue = [];
  }
}

/**
 * Factory function to create a notification manager instance
 * 
 * @param {Object} [options={}] - Configuration options
 * @returns {NotificationManager} Configured notification manager instance
 * 
 * @example
 * import { createNotificationManager } from './notifications.js';
 * 
 * const notificationManager = createNotificationManager({
 *   defaultDuration: 2000,
 *   containerSelector: '#notifications'
 * });
 */
export const createNotificationManager = (options = {}) => {
  return new NotificationManager(options);
};

/**
 * Convenience functions for common notification types
 */

/**
 * Show success notification
 * 
 * @param {NotificationManager} manager - Notification manager instance
 * @param {string} message - Success message
 * @param {number} [duration] - Display duration
 */
export const showSuccess = (manager, message, duration) => {
  manager.show(message, 'success', duration);
};

/**
 * Show error notification
 * 
 * @param {NotificationManager} manager - Notification manager instance
 * @param {string} message - Error message
 * @param {number} [duration] - Display duration
 */
export const showError = (manager, message, duration) => {
  manager.show(message, 'error', duration);
};

/**
 * Show info notification
 * 
 * @param {NotificationManager} manager - Notification manager instance
 * @param {string} message - Info message
 * @param {number} [duration] - Display duration
 */
export const showInfo = (manager, message, duration) => {
  manager.show(message, 'info', duration);
};

/**
 * Show warning notification
 * 
 * @param {NotificationManager} manager - Notification manager instance
 * @param {string} message - Warning message
 * @param {number} [duration] - Display duration
 */
export const showWarning = (manager, message, duration) => {
  manager.show(message, 'warning', duration);
};
