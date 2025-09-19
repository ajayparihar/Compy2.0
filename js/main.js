/**
 * Compy 2.0 - Application Entry Point and Bootstrap Module
 * 
 * This module serves as the primary entry point for the Compy 2.0 application.
 * It handles the initial bootstrap process, error recovery, and ensures the
 * application starts correctly in all supported browser environments.
 * 
 * Bootstrap Process:
 * 1. Waits for DOM to be fully loaded and parsed
 * 2. Initializes the main application instance
 * 3. Handles any initialization errors gracefully
 * 4. Provides user-friendly error recovery options
 * 
 * Error Recovery Strategy:
 * - Catches and logs all initialization errors
 * - Displays user-friendly error messages with recovery options
 * - Offers page refresh as primary recovery mechanism
 * - Maintains application stability even when initialization fails
 * 
 * Browser Compatibility:
 * - Uses DOMContentLoaded for optimal loading performance
 * - Supports all modern browsers (ES6+ required)
 * - Graceful degradation for unsupported environments
 * 
 * @fileoverview Application bootstrap and initialization module
 * @version 2.0
 * @author Bheb Developer
 * @since 2025
 * @requires ./app.js - Main application module
 */

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
