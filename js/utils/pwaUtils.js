/**
 * PWA Utilities for Compy 2.0
 * 
 * This module provides utilities specifically for Progressive Web App (PWA) functionality,
 * including theme synchronization, storage management, and cross-context communication.
 * 
 * Key Features:
 * - PWA detection (standalone mode vs browser)
 * - Cross-context theme synchronization
 * - Storage isolation handling
 * - Manifest theme color updates
 * - Better PWA theme persistence
 * 
 * @fileoverview PWA utilities for theme and storage management
 * @version 2.0
 * @author Bheb Developer
 * @since 2025
 */

import { Logger } from '../utils.js?v=2.0.3';
import { STORAGE_KEYS, DEFAULT_THEME } from '../constants.js?v=2.0.3';
import { THEME_DEFINITIONS } from '../themes.js?v=2.0.3';

/**
 * PWA Theme Manager for handling theme persistence across browser/PWA contexts
 */
export class PWAThemeManager {
  constructor() {
    this.isPWA = this.detectPWAMode();
    this.storageKeys = {
      theme: STORAGE_KEYS.theme,
      pwaTheme: 'compy.pwa.theme', // Separate key for PWA context
      themeSync: 'compy.theme.sync', // For cross-context synchronization
      lastSync: 'compy.theme.lastSync'
    };
    
    this.syncInterval = null;
    this.listeners = new Set();
    
    if (this.isPWA) {
      Logger.info('PWA mode detected - initializing enhanced theme management');
      this.initPWAThemeHandling();
    }
  }
  
  /**
   * Detect if the app is running in PWA (standalone) mode
   * @returns {boolean} True if running as PWA
   */
  detectPWAMode() {
    // Check if running in standalone mode (PWA)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    
    // Check if launched from home screen (iOS/Android)
    const isHomescreenApp = window.navigator.standalone === true;
    
    // Check user agent for PWA indicators
    const hasMinimalUI = window.matchMedia('(display-mode: minimal-ui)').matches;
    
    return isStandalone || isHomescreenApp || hasMinimalUI;
  }
  
  /**
   * Initialize PWA-specific theme handling
   */
  initPWAThemeHandling() {
    // Sync theme on startup
    this.syncThemeFromBrowser();
    
    // Listen for storage events (cross-tab communication)
    window.addEventListener('storage', (event) => {
      if (event.key === this.storageKeys.themeSync) {
        this.handleThemeSync(event.newValue);
      }
    });
    
    // Set up periodic sync for PWA isolation
    this.setupPeriodicSync();
    
    // Handle visibility changes to sync when app becomes active
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.isPWA) {
        this.syncThemeFromBrowser();
      }
    });
  }
  
  /**
   * Apply theme with PWA-aware persistence
   * @param {string} themeId - Theme identifier to apply
   * @returns {boolean} Success status
   */
  applyTheme(themeId) {
    try {
      // Validate theme
      if (!themeId || !THEME_DEFINITIONS[themeId]) {
        Logger.error('Invalid theme ID for PWA application:', themeId);
        themeId = DEFAULT_THEME;
      }
      
      // Apply to DOM
      document.documentElement.setAttribute('data-theme', themeId);
      document.documentElement.setAttribute('data-theme-source', this.isPWA ? 'pwa' : 'browser');
      
      // Save to appropriate storage keys
      this.saveTheme(themeId);
      
      // Update manifest theme color
      this.updateManifestThemeColor(themeId);
      
      // Notify listeners
      this.notifyThemeChange(themeId);
      
      // Notify service worker of theme change
      this.notifyServiceWorker(themeId);
      
      Logger.info(`Theme applied in ${this.isPWA ? 'PWA' : 'browser'} mode:`, themeId);
      return true;
      
    } catch (error) {
      Logger.error('Failed to apply theme in PWA mode:', error);
      return false;
    }
  }
  
  /**
   * Save theme to all relevant storage locations
   * @param {string} themeId - Theme to save
   */
  saveTheme(themeId) {
    try {
      // Save to standard location
      localStorage.setItem(this.storageKeys.theme, themeId);
      
      // Save to PWA-specific location if in PWA mode
      if (this.isPWA) {
        localStorage.setItem(this.storageKeys.pwaTheme, themeId);
      }
      
      // Save sync marker with timestamp for cross-context sync
      const syncData = {
        theme: themeId,
        timestamp: Date.now(),
        context: this.isPWA ? 'pwa' : 'browser'
      };
      localStorage.setItem(this.storageKeys.themeSync, JSON.stringify(syncData));
      localStorage.setItem(this.storageKeys.lastSync, Date.now().toString());
      
    } catch (error) {
      Logger.error('Failed to save theme in PWA mode:', error);
    }
  }
  
  /**
   * Load theme with PWA-aware fallback handling
   * @returns {string} Theme identifier
   */
  loadTheme() {
    try {
      let theme = null;
      
      if (this.isPWA) {
        // In PWA mode, try PWA-specific storage first
        theme = localStorage.getItem(this.storageKeys.pwaTheme);
        
        // Fall back to standard storage
        if (!theme) {
          theme = localStorage.getItem(this.storageKeys.theme);
        }
        
        // Try to sync from browser context
        if (!theme) {
          theme = this.syncThemeFromBrowser();
        }
      } else {
        // In browser mode, use standard storage
        theme = localStorage.getItem(this.storageKeys.theme);
      }
      
      // Validate theme exists in definitions
      if (theme && THEME_DEFINITIONS[theme]) {
        return theme;
      }
      
      Logger.warn('No valid theme found, using default:', DEFAULT_THEME);
      return DEFAULT_THEME;
      
    } catch (error) {
      Logger.error('Failed to load theme in PWA mode:', error);
      return DEFAULT_THEME;
    }
  }
  
  /**
   * Sync theme from browser context (for PWA startup)
   * @returns {string|null} Synced theme or null
   */
  syncThemeFromBrowser() {
    try {
      const syncData = localStorage.getItem(this.storageKeys.themeSync);
      if (syncData) {
        const parsed = JSON.parse(syncData);
        if (parsed.theme && THEME_DEFINITIONS[parsed.theme]) {
          // Save to PWA storage
          localStorage.setItem(this.storageKeys.pwaTheme, parsed.theme);
          Logger.info('Theme synced from browser to PWA:', parsed.theme);
          return parsed.theme;
        }
      }
    } catch (error) {
      Logger.warn('Failed to sync theme from browser:', error);
    }
    
    return null;
  }
  
  /**
   * Handle theme sync events from other contexts
   * @param {string} syncDataString - Serialized sync data
   */
  handleThemeSync(syncDataString) {
    try {
      if (!syncDataString) return;
      
      const syncData = JSON.parse(syncDataString);
      const { theme, timestamp, context } = syncData;
      
      // Avoid syncing our own changes
      if (context === (this.isPWA ? 'pwa' : 'browser')) {
        return;
      }
      
      // Check if this is a newer change
      const lastSync = parseInt(localStorage.getItem(this.storageKeys.lastSync) || '0');
      if (timestamp <= lastSync) {
        return;
      }
      
      // Apply the synced theme
      if (theme && THEME_DEFINITIONS[theme]) {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        if (currentTheme !== theme) {
          this.applyTheme(theme);
          Logger.info('Theme synchronized from other context:', theme);
        }
      }
      
    } catch (error) {
      Logger.error('Failed to handle theme sync:', error);
    }
  }
  
  /**
   * Update manifest theme color dynamically
   * @param {string} themeId - Current theme ID
   */
  updateManifestThemeColor(themeId) {
    try {
      const themeData = THEME_DEFINITIONS[themeId];
      if (!themeData) return;
      
      // Update theme-color meta tag
      let themeColorMeta = document.querySelector('meta[name="theme-color"]');
      if (!themeColorMeta) {
        themeColorMeta = document.createElement('meta');
        themeColorMeta.name = 'theme-color';
        document.head.appendChild(themeColorMeta);
      }
      
      // Use primary color from theme
      themeColorMeta.content = themeData.colors.primary;
      
      // Update manifest dynamically if possible
      this.updateDynamicManifest(themeData);
      
    } catch (error) {
      Logger.error('Failed to update manifest theme color:', error);
    }
  }
  
  /**
   * Update manifest with current theme colors (if browser supports it)
   * @param {Object} themeData - Theme definition data
   */
  updateDynamicManifest(themeData) {
    try {
      // Check if we can update the manifest dynamically
      if (!navigator.serviceWorker || !themeData) return;
      
      // Create updated manifest object
      const manifestUpdate = {
        theme_color: themeData.colors.primary,
        background_color: themeData.colors.bg
      };
      
      // Store manifest update for service worker
      localStorage.setItem('compy.manifest.update', JSON.stringify(manifestUpdate));
      
      Logger.debug('Manifest update prepared for service worker:', manifestUpdate);
      
    } catch (error) {
      Logger.error('Failed to update dynamic manifest:', error);
    }
  }
  
  /**
   * Set up periodic theme synchronization for PWA isolation
   */
  setupPeriodicSync() {
    if (!this.isPWA) return;
    
    // Sync every 30 seconds when in PWA mode
    this.syncInterval = setInterval(() => {
      this.syncThemeFromBrowser();
    }, 30000);
    
    // Clean up on page unload
    window.addEventListener('beforeunload', () => {
      if (this.syncInterval) {
        clearInterval(this.syncInterval);
      }
    });
  }
  
  /**
   * Add theme change listener
   * @param {Function} listener - Callback for theme changes
   */
  addThemeListener(listener) {
    this.listeners.add(listener);
  }
  
  /**
   * Remove theme change listener
   * @param {Function} listener - Callback to remove
   */
  removeThemeListener(listener) {
    this.listeners.delete(listener);
  }
  
  /**
   * Notify all listeners of theme change
   * @param {string} themeId - New theme ID
   */
  notifyThemeChange(themeId) {
    this.listeners.forEach(listener => {
      try {
        listener(themeId);
      } catch (error) {
        Logger.error('Theme listener error:', error);
      }
    });
  }
  
  /**
   * Get current PWA status and theme info
   * @returns {Object} PWA status information
   */
  getStatus() {
    return {
      isPWA: this.isPWA,
      currentTheme: document.documentElement.getAttribute('data-theme'),
      themeSource: document.documentElement.getAttribute('data-theme-source'),
      hasSync: !!localStorage.getItem(this.storageKeys.themeSync),
      lastSync: localStorage.getItem(this.storageKeys.lastSync)
    };
  }
  
  /**
   * Force theme synchronization
   * @returns {boolean} Success status
   */
  forceSyncTheme() {
    try {
      const theme = this.syncThemeFromBrowser();
      if (theme) {
        this.applyTheme(theme);
        return true;
      }
      return false;
    } catch (error) {
      Logger.error('Failed to force sync theme:', error);
      return false;
    }
  }
  
  /**
   * Notify service worker of theme changes
   * @param {string} themeId - New theme ID
   */
  notifyServiceWorker(themeId) {
    if (!navigator.serviceWorker || !navigator.serviceWorker.controller) {
      return; // No service worker available
    }
    
    try {
      navigator.serviceWorker.controller.postMessage({
        type: 'CACHE_THEME_UPDATE',
        theme: themeId,
        timestamp: Date.now()
      });
      
      Logger.debug('Theme change notified to service worker:', themeId);
    } catch (error) {
      Logger.error('Failed to notify service worker of theme change:', error);
    }
  }
}

/**
 * Global PWA theme manager instance
 */
export const pwaThemeManager = new PWAThemeManager();

/**
 * Utility function to detect if app is running as PWA
 * @returns {boolean} True if PWA mode
 */
export const isPWA = () => {
  return pwaThemeManager.isPWA;
};

/**
 * Initialize PWA theme handling
 * @returns {PWAThemeManager} Theme manager instance
 */
export const initPWAThemes = () => {
  return pwaThemeManager;
};