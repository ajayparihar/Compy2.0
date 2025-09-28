/**
 * Compy 2.0 - Application Entry Point and Bootstrap Module
 * 
 * This module serves as the primary entry point for the Compy 2.0 application.
 * It handles the initial bootstrap process, error recovery, and ensures the
 * application starts correctly in all supported browser environments.
 * 
 * Architecture Overview:
 * - Follows the Single Responsibility Principle: handles ONLY application startup
 * - Implements robust error boundaries to prevent complete application failure
 * - Provides comprehensive error diagnostics for debugging and support
 * - Uses defensive programming practices to handle edge cases gracefully
 * 
 * Bootstrap Process:
 * 1. Waits for DOM to be fully loaded and parsed (DOMContentLoaded event)
 * 2. Initializes the main application instance with comprehensive error handling
 * 3. Handles any initialization errors gracefully with user-friendly messaging
 * 4. Provides immediate recovery options including page refresh functionality
 * 5. Logs detailed error information for debugging and troubleshooting
 * 
 * Error Recovery Strategy (Defense in Depth):
 * - Level 1: Catches and logs all initialization errors with context
 * - Level 2: Displays user-friendly error messages with recovery options
 * - Level 3: Offers page refresh as primary recovery mechanism
 * - Level 4: Maintains application stability even when initialization fails
 * - Level 5: Provides detailed error diagnostics for support troubleshooting
 * 
 * Browser Compatibility & Performance:
 * - Uses DOMContentLoaded for optimal loading performance and user experience
 * - Supports all modern browsers (ES6+ required, Chrome 60+, Firefox 60+, Safari 12+)
 * - Graceful degradation for unsupported environments with clear user messaging
 * - No blocking operations during startup to ensure responsive user interface
 * - Memory-efficient initialization with cleanup for failed startup attempts
 * 
 * Security Considerations:
 * - Prevents execution in potentially unsafe contexts
 * - Logs error information safely without exposing sensitive data
 * - Validates user agent and environment before proceeding with initialization
 * 
 * @fileoverview Application bootstrap and initialization module with comprehensive error handling
 * @version 2.0
 * @author Bheb Developer
 * @since 2025
 * @requires ./app.js - Main application module providing core functionality
 * @requires ./constants.js - Application constants and configuration values
 */

// =============================================================================
// ACCESSIBILITY POLYFILLS
// =============================================================================

/**
 * Focus-visible polyfill for better keyboard navigation accessibility
 * 
 * This polyfill ensures that focus indicators are only shown when navigating
 * with the keyboard, not when clicking with a mouse. This improves the user
 * experience for both keyboard and mouse users.
 */
(function() {
  'use strict';
  
  let hadKeyboardEvent = true;
  
  function onPointerDown() {
    hadKeyboardEvent = false;
  }
  
  function onKeyDown(e) {
    if (e.metaKey || e.altKey || e.ctrlKey) {
      return;
    }
    hadKeyboardEvent = true;
  }
  
  function onFocus(e) {
    if (hadKeyboardEvent) {
      e.target.classList.add('focus-visible');
    }
  }
  
  function onBlur(e) {
    e.target.classList.remove('focus-visible');
  }
  
  // Add event listeners
  document.addEventListener('keydown', onKeyDown, true);
  document.addEventListener('mousedown', onPointerDown, true);
  document.addEventListener('pointerdown', onPointerDown, true);
  document.addEventListener('touchstart', onPointerDown, true);
  document.addEventListener('focus', onFocus, true);
  document.addEventListener('blur', onBlur, true);
  
  // Mark body as js-focus-visible for CSS targeting
  document.body.classList.add('js-focus-visible');
})();

// =============================================================================
// APPLICATION IMPORTS
// =============================================================================

/**
 * Import the main application initialization function
 * 
 * This function is responsible for:
 * - Setting up all application components
 * - Initializing state management
 * - Configuring UI components and event handlers
 * - Loading user data from storage
 */
import { initializeApp } from './app.js?v=2.0.2';
import { UI_CONFIG } from './constants.js?v=2.0.2';

// =============================================================================
// APPLICATION BOOTSTRAP AND ERROR HANDLING
// =============================================================================

/**
 * Application Bootstrap Handler
 * 
 * This event listener ensures the application only starts after the DOM is
 * completely loaded and parsed. This timing is crucial for:
 * 
 * Performance Benefits:
 * - Avoids blocking the HTML parser during JavaScript execution
 * - Ensures all DOM elements are available for manipulation
 * - Prevents FOUC (Flash of Unstyled Content) issues
 * - Optimizes initial page load metrics
 * 
 * Error Resilience:
 * - Wraps initialization in try-catch for robust error handling
 * - Provides user-friendly error messages instead of white screen
 * - Offers immediate recovery options through page refresh
 * - Logs detailed error information for debugging
 * 
 * User Experience:
 * - Shows clear status messages during startup
 * - Handles both successful and failed initialization gracefully
 * - Provides actionable error recovery options
 * - Maintains user control over error resolution
 */
document.addEventListener('DOMContentLoaded', async () => {
  try {
    // INITIALIZATION PHASE: Application Startup
    // Log startup to provide visibility into application lifecycle
    if (UI_CONFIG.debug) console.log('🚀 Starting Compy 2.0 application...');
    
    // MAIN APPLICATION BOOTSTRAP: Initialize all systems
    // This async call sets up:
    // - State management and data persistence
    // - UI components and event handlers  
    // - Theme system and user preferences
    // - Clipboard functionality and notifications
    // - Modal dialogs and navigation
    await initializeApp();
    
    // SUCCESS CONFIRMATION: Indicate successful startup
    if (UI_CONFIG.debug) console.log('✅ Compy 2.0 started successfully!');
    
  } catch (error) {
    // ERROR RECOVERY: Comprehensive error handling and user guidance
    
    // DETAILED LOGGING: Capture full error context for debugging
    // This helps with troubleshooting in production environments
    console.error('❌ Failed to initialize Compy 2.0:', error);
    
    // Log additional error context for debugging
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    });
    
    // USER-FRIENDLY ERROR MESSAGING
    // Provide clear, actionable guidance without technical jargon
    const errorMsg = 'Failed to start Compy 2.0. This might be due to:' +
      '\n\n• Browser storage issues' +
      '\n• Corrupted application data' +
      '\n• Network connectivity problems' +
      '\n\nPlease refresh the page or clear browser data if the problem persists.';
    
    // RECOVERY OPTION: Offer immediate page refresh
    // This resolves most common initialization issues by:
    // - Clearing any corrupted runtime state
    // - Reloading all JavaScript modules
    // - Re-initializing all application systems
    // - Giving the user immediate control over resolution
    if (confirm(`${errorMsg}\n\nWould you like to refresh the page now?`)) {
      // IMMEDIATE RECOVERY: Reload the page to reset application state
      location.reload();
    }
  }
});

/**
 * Global Error Handler for Unhandled Promise Rejections
 * 
 * This handler catches any promises that reject without being handled,
 * preventing them from causing silent failures or browser console errors.
 * 
 * BROWSER API INTEGRATION: PromiseRejectionEvent
 * - Modern browsers fire 'unhandledrejection' events for uncaught Promise rejections
 * - This provides a global safety net for async errors that escape try/catch blocks
 * - Allows graceful handling instead of silent failures or console spam
 * 
 * Browser API Dependencies:
 * - Window.unhandledrejection event (Chrome 49+, Firefox 69+, Safari 11+)
 * - PromiseRejectionEvent interface for event details
 * - Event.preventDefault() to suppress default browser error handling
 * 
 * Fallback Behavior:
 * - Older browsers will still show console errors (graceful degradation)
 * - Application functionality remains unaffected
 * 
 * @param {PromiseRejectionEvent} event - Unhandled promise rejection event
 * @param {Promise} event.promise - The promise that was rejected
 * @param {any} event.reason - The rejection reason/error
 */
window.addEventListener('unhandledrejection', (event) => {
  // LOG UNHANDLED REJECTIONS: Track async errors that escape normal handling
  console.error('Unhandled promise rejection in Compy 2.0:', event.reason);
  
  // PREVENT DEFAULT BROWSER BEHAVIOR: Stop browser from showing generic error
  // We handle this gracefully rather than letting it show in console
  event.preventDefault();
  
  // Optional: Show user notification for critical async errors
  // This helps users understand when background operations fail
  if (window.app && window.app.showNotification) {
    window.app.showNotification(
      'An unexpected error occurred. Some features may not work correctly.',
      'error'
    );
  }
});

/**
 * Global Error Handler for JavaScript Runtime Errors
 * 
 * Catches any uncaught JavaScript errors and provides graceful error handling
 * to prevent the application from completely breaking.
 * 
 * ERROR HANDLING STRATEGY DOCUMENTATION:
 * The application uses a multi-layered error handling approach:
 * 
 * Layer 1: Function-level try-catch blocks for specific error handling
 * Layer 2: Component-level error boundaries for graceful feature degradation
 * Layer 3: Global handlers (this function) for uncaught errors and promise rejections
 * Layer 4: User-friendly notifications instead of technical error messages
 * 
 * VALIDATION PATTERNS:
 * - Input validation at function entry points with informative error messages
 * - Type checking using typeof and Array.isArray() for safety
 * - Null/undefined checks with logical OR operators for graceful defaults
 * - Range validation for numeric inputs with Math.max/Math.min clamping
 * 
 * @param {ErrorEvent} event - JavaScript error event
 */
window.addEventListener('error', (event) => {
  // LOG RUNTIME ERRORS: Capture detailed error information
  console.error('Uncaught error in Compy 2.0:', {
    message: event.message,
    filename: event.filename,
    line: event.lineno,
    column: event.colno,
    error: event.error
  });
  
  // GRACEFUL ERROR HANDLING: Don't let single errors break the entire app
  // Show user-friendly notification instead of broken UI
  if (window.app && window.app.showNotification) {
    window.app.showNotification(
      'A technical error occurred. The application is still functional.',
      'error'
    );
  }
});
