/**
 * Main Entry Point for Compy 2.0 Application - Refactored Version
 * 
 * This module serves as the primary bootstrap file that initializes the entire
 * Compy 2.0 application using the new modular architecture. It demonstrates
 * the improved initialization process with better error handling, logging,
 * and component management.
 * 
 * Key Improvements in Refactored Version:
 * - Modular component architecture with dependency injection
 * - Better error handling and user feedback
 * - Centralized component management through factory pattern
 * - Improved logging and debugging capabilities
 * - Easier testing and maintenance
 * 
 * @fileoverview Refactored entry point with modular architecture
 * @version 2.0
 * @author Bheb Developer
 * @since 2025
 */

// Import the original initialization function
import { initializeApp } from './app.js';
// import { initializeRefactoredApp } from './app-refactored.js'; // Commented out - file doesn't exist

/**
 * Configuration for application initialization
 * 
 * Set USE_REFACTORED_VERSION to true to use the new modular architecture,
 * or false to use the original monolithic version for comparison.
 */
const CONFIG = {
  USE_REFACTORED_VERSION: false,  // Set to false to use original version (refactored version not available)
  ENABLE_PERFORMANCE_MONITORING: true,
  ENABLE_DEBUG_LOGGING: true
};

/**
 * Enhanced Application Bootstrap Process
 * 
 * The initialization process now includes:
 * - Feature detection and browser compatibility checks
 * - Performance monitoring setup
 * - Selection between original and refactored architectures
 * - Enhanced error handling and user feedback
 * - Development vs production mode detection
 */
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🌟 Starting Compy 2.0 initialization...');
  
  // Performance monitoring
  const startTime = CONFIG.ENABLE_PERFORMANCE_MONITORING ? performance.now() : 0;
  
  try {
    // Feature detection
    if (!checkBrowserCompatibility()) {
      showCompatibilityWarning();
      return;
    }
    
    // Initialize the application based on configuration
    let app;
    if (CONFIG.USE_REFACTORED_VERSION) {
      console.log('🚀 Using refactored modular architecture');
      app = await initializeRefactoredApp();
    } else {
      console.log('⚡ Using original monolithic architecture');
      app = await initializeApp();
    }
    
    // Performance reporting
    if (CONFIG.ENABLE_PERFORMANCE_MONITORING) {
      const endTime = performance.now();
      const initTime = Math.round(endTime - startTime);
      console.log(`⚡ Application initialized in ${initTime}ms`);
      
      // Report performance metrics
      reportPerformanceMetrics(initTime);
    }
    
    // Setup development helpers
    if (CONFIG.ENABLE_DEBUG_LOGGING) {
      setupDebugHelpers(app);
    }
    
    console.log('✅ Compy 2.0 startup completed successfully!');
    
  } catch (error) {
    console.error('❌ Failed to initialize Compy 2.0:', error);
    handleInitializationFailure(error);
  }
});

/**
 * Check browser compatibility for required features
 * 
 * @returns {boolean} True if browser is compatible
 */
function checkBrowserCompatibility() {
  const requiredFeatures = [
    'localStorage' in window,
    'addEventListener' in document,
    'querySelector' in document,
    'JSON' in window,
    'Promise' in window
  ];
  
  const isCompatible = requiredFeatures.every(feature => feature);
  
  if (CONFIG.ENABLE_DEBUG_LOGGING) {
    console.log('🔍 Browser compatibility check:', {
      compatible: isCompatible,
      features: {
        localStorage: 'localStorage' in window,
        eventListeners: 'addEventListener' in document,
        querySelector: 'querySelector' in document,
        JSON: 'JSON' in window,
        promises: 'Promise' in window,
        modules: 'import' in document.createElement('script')
      }
    });
  }
  
  return isCompatible;
}

/**
 * Show compatibility warning for unsupported browsers
 */
function showCompatibilityWarning() {
  const message = 'Your browser is not fully compatible with Compy 2.0. Please update to a modern browser for the best experience.';
  
  // Try to show a user-friendly warning
  try {
    const warningDiv = document.createElement('div');
    warningDiv.style.cssText = `
      position: fixed;
      top: 20px;
      left: 20px;
      right: 20px;
      background: #ff4444;
      color: white;
      padding: 15px;
      border-radius: 5px;
      z-index: 10000;
      font-family: Arial, sans-serif;
      text-align: center;
    `;
    warningDiv.textContent = message;
    document.body.appendChild(warningDiv);
  } catch (error) {
    // Fallback to alert if DOM manipulation fails
    alert(message);
  }
  
  console.warn('⚠️ Browser compatibility issue detected');
}

/**
 * Report performance metrics
 * 
 * @param {number} initTime - Initialization time in milliseconds
 */
function reportPerformanceMetrics(initTime) {
  const metrics = {
    initializationTime: initTime,
    memoryUsage: performance.memory ? {
      used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
      total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
      limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024)
    } : null,
    timestamp: new Date().toISOString()
  };
  
  console.log('📊 Performance Metrics:', metrics);
  
  // In a production environment, you might send these metrics to a monitoring service
  // Example: analytics.track('app_initialized', metrics);
}

/**
 * Setup development helpers and debugging tools
 * 
 * @param {*} app - Application instance
 */
function setupDebugHelpers(app) {
  // Make app instance globally available for debugging
  window.compyApp = app;
  
  // Add helpful console commands
  window.compyDebug = {
    getStatus: () => {
      if (typeof app.getStatus === 'function') {
        return app.getStatus();
      }
      return { message: 'Status not available for this app version' };
    },
    
    getComponents: () => {
      if (CONFIG.USE_REFACTORED_VERSION && app.components) {
        return Array.from(app.components.keys());
      }
      return ['Components not available in this version'];
    },
    
    testNotification: (message = 'Test notification', type = 'info') => {
      if (CONFIG.USE_REFACTORED_VERSION) {
        const notifications = app.getComponent('notifications');
        if (notifications) {
          notifications.show(message, type);
          return 'Notification sent';
        }
      }
      return 'Notifications not available';
    }
  };
  
  console.log('🛠️ Debug helpers available:', Object.keys(window.compyDebug));
  console.log('💡 Try: compyDebug.getStatus(), compyDebug.testNotification()');
}

/**
 * Handle initialization failure with enhanced user feedback and error recovery
 * 
 * Provides comprehensive error handling with multiple fallback options,
 * detailed error reporting, and user-friendly recovery mechanisms.
 * 
 * Error Recovery Strategy:
 * 1. Attempt to show user-friendly modal with recovery options
 * 2. Fall back to basic alert if DOM manipulation fails
 * 3. Provide detailed logging for debugging
 * 4. Offer multiple recovery paths (refresh, clear data, etc.)
 * 
 * @param {Error} error - The initialization error
 */
function handleInitializationFailure(error) {
  const errorMessage = 'Failed to initialize Compy 2.0. This might be due to corrupted data or browser issues.';
  
  // Determine error category for better user guidance
  const errorCategory = categorizeError(error);
  
  // Try to show enhanced user-friendly error interface
  try {
    const errorDiv = createErrorModal(errorMessage, errorCategory);
    document.body.appendChild(errorDiv);
    
    // Add keyboard support for accessibility
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        location.reload();
      } else if (e.key === 'Escape') {
        errorDiv.remove();
      }
    });
    
  } catch (domError) {
    // Enhanced fallback with multiple options
    console.error('Could not show error UI:', domError);
    const fallbackMessage = `${errorMessage}\n\nOptions:\n1. Refresh the page\n2. Clear browser data if problem persists`;
    
    if (confirm(`${fallbackMessage}\n\nWould you like to refresh now?`)) {
      location.reload();
    }
  }
  
  // Enhanced error logging with more context
  logDetailedError(error, errorCategory);
}

/**
 * Create an enhanced error modal with recovery options
 * 
 * @param {string} message - Primary error message
 * @param {string} category - Error category for specific guidance
 * @returns {HTMLElement} Error modal element
 * @private
 */
function createErrorModal(message, category) {
  const errorDiv = document.createElement('div');
  errorDiv.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: #ff4444;
    color: white;
    padding: 30px;
    border-radius: 12px;
    z-index: 10000;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    text-align: center;
    max-width: 450px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.3);
    backdrop-filter: blur(10px);
  `;
  
  const categoryMessage = getCategorySpecificMessage(category);
  
  errorDiv.innerHTML = `
    <div style="font-size: 48px; margin-bottom: 15px;">⚠️</div>
    <h3 style="margin: 0 0 15px 0; font-size: 20px;">Initialization Error</h3>
    <p style="margin: 0 0 15px 0; line-height: 1.4;">${message}</p>
    ${categoryMessage ? `<p style="margin: 0 0 20px 0; font-size: 14px; opacity: 0.9;">${categoryMessage}</p>` : ''}
    <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
      <button onclick="location.reload()" style="
        background: white;
        color: #ff4444;
        border: none;
        padding: 12px 24px;
        border-radius: 8px;
        cursor: pointer;
        font-weight: 600;
        font-size: 14px;
        transition: all 0.2s;
      " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
        🔄 Refresh Page
      </button>
      <button onclick="clearStorageAndReload()" style="
        background: rgba(255,255,255,0.2);
        color: white;
        border: 1px solid rgba(255,255,255,0.3);
        padding: 12px 24px;
        border-radius: 8px;
        cursor: pointer;
        font-weight: 500;
        font-size: 14px;
        transition: all 0.2s;
      " onmouseover="this.style.background='rgba(255,255,255,0.3)'" onmouseout="this.style.background='rgba(255,255,255,0.2)'">
        🗑️ Clear Data & Refresh
      </button>
    </div>
    <p style="margin: 20px 0 0 0; font-size: 12px; opacity: 0.7;">Press Enter to refresh or Escape to close</p>
  `;
  
  // Add the clearStorageAndReload function to window temporarily
  window.clearStorageAndReload = () => {
    try {
      // Clear localStorage data that might be corrupted
      localStorage.removeItem('compy.items');
      localStorage.removeItem('compy.filters');
      localStorage.removeItem('compy.profile');
      localStorage.removeItem('compy.theme');
      localStorage.removeItem('compy.backups');
      
      // Clear sessionStorage as well
      sessionStorage.clear();
      
      // Reload the page
      location.reload();
    } catch (clearError) {
      console.error('Failed to clear storage:', clearError);
      // Just reload if clearing fails
      location.reload();
    }
  };
  
  return errorDiv;
}

/**
 * Categorize the error for better user guidance
 * 
 * @param {Error} error - The error to categorize
 * @returns {string} Error category
 * @private
 */
function categorizeError(error) {
  const message = error.message.toLowerCase();
  const stack = error.stack?.toLowerCase() || '';
  
  if (message.includes('localstorage') || message.includes('quota') || stack.includes('storage')) {
    return 'storage';
  }
  
  if (message.includes('network') || message.includes('fetch') || message.includes('load')) {
    return 'network';
  }
  
  if (message.includes('script') || message.includes('module') || stack.includes('import')) {
    return 'script';
  }
  
  if (message.includes('permission') || message.includes('blocked')) {
    return 'permission';
  }
  
  return 'general';
}

/**
 * Get category-specific guidance message
 * 
 * @param {string} category - Error category
 * @returns {string} Category-specific message
 * @private
 */
function getCategorySpecificMessage(category) {
  const messages = {
    storage: 'This might be caused by corrupted browser data. Try clearing data to fix the issue.',
    network: 'This appears to be a network-related issue. Check your connection and try refreshing.',
    script: 'There was a problem loading the application scripts. A refresh should resolve this.',
    permission: 'The browser blocked some required functionality. Check browser settings and refresh.',
    general: 'An unexpected error occurred during startup. A refresh usually resolves this issue.'
  };
  
  return messages[category] || messages.general;
}

/**
 * Log detailed error information for debugging
 * 
 * @param {Error} error - The error to log
 * @param {string} category - Error category
 * @private
 */
function logDetailedError(error, category) {
  const errorDetails = {
    // Basic error information
    message: error.message,
    stack: error.stack,
    category,
    
    // Timing information
    timestamp: new Date().toISOString(),
    
    // Browser environment
    userAgent: navigator.userAgent,
    language: navigator.language,
    platform: navigator.platform,
    
    // Page context
    url: window.location.href,
    referrer: document.referrer,
    
    // Storage availability
    localStorageAvailable: isStorageAvailable('localStorage'),
    sessionStorageAvailable: isStorageAvailable('sessionStorage'),
    
    // Memory information (if available)
    memory: performance.memory ? {
      used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
      total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
      limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024)
    } : null
  };
  
  console.error('🚨 Compy 2.0 Initialization Failure:', errorDetails);
  
  // Group related console entries
  console.group('Error Analysis');
  console.error('Category:', category);
  console.error('Browser Support:', {
    modules: 'import' in document.createElement('script'),
    promises: 'Promise' in window,
    localStorage: isStorageAvailable('localStorage'),
    clipboard: 'clipboard' in navigator
  });
  console.groupEnd();
}

/**
 * Check if a storage type is available and functional
 * 
 * @param {string} type - Storage type ('localStorage' or 'sessionStorage')
 * @returns {boolean} True if storage is available
 * @private
 */
function isStorageAvailable(type) {
  try {
    const storage = window[type];
    const testKey = '__test__';
    storage.setItem(testKey, 'test');
    storage.removeItem(testKey);
    return true;
  } catch (e) {
    return false;
  }
}
