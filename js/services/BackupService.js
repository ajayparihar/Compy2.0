/**
 * Backup Service for Compy 2.0
 * 
 * This service provides automatic backup functionality to a user-selected local directory.
 * It handles backup configuration, automatic backup triggers, and file system operations
 * using the File System Access API.
 * 
 * Features:
 * - User-selectable backup location using directory picker
 * - Automatic backup on data changes with debouncing
 * - Backup file naming with timestamps
 * - Backup enable/disable toggle
 * - Backup status monitoring
 * - Cross-tab synchronization of backup settings
 * 
 * @fileoverview Automatic backup service with File System Access API integration
 * @version 2.0
 * @author Bheb Developer
 * @since 2025
 */

import { Logger } from '../utils.js?v=2.0.2';
import { STORAGE_KEYS, UI_CONFIG } from '../constants.js?v=2.0.2';

/**
 * Backup service class for handling automatic backups to local directory
 */
export class BackupService {
  constructor() {
    // Configuration
    this.config = {
      storageKey: 'compy.autoBackup',
      debounceDelay: 2000, // 2 seconds delay after last change
      maxBackups: 10, // Keep last 10 backups
      backupFilePrefix: 'compy-backup-',
      backupFileExtension: '.json'
    };
    
    // Service state
    this.isEnabled = false;
    this.backupDirectoryHandle = null;
    this.backupTimeout = null;
    this.lastBackupTime = null;
    this.backupCount = 0;
    
    // File System Access API support detection
    this.isFileSystemApiSupported = 'showDirectoryPicker' in window;
    
    // Initialize service
    this.initialize();
  }
  
  /**
   * Initialize the backup service
   * @private
   */
  async initialize() {
    try {
      // Load saved configuration
      await this.loadConfiguration();
      
      Logger.info('Backup service initialized', {
        enabled: this.isEnabled,
        fsApiSupported: this.isFileSystemApiSupported
      });
      
    } catch (error) {
      Logger.error('Failed to initialize backup service:', error);
    }
  }
  
  /**
   * Check if File System Access API is supported
   * @returns {boolean} Whether the API is supported
   */
  isSupported() {
    return this.isFileSystemApiSupported;
  }
  
  /**
   * Load backup configuration from storage
   * @private
   */
  async loadConfiguration() {
    try {
      const savedConfig = localStorage.getItem(this.config.storageKey);
      
      if (savedConfig) {
        const config = JSON.parse(savedConfig);
        
        this.isEnabled = config.enabled || false;
        this.lastBackupTime = config.lastBackupTime || null;
        this.backupCount = config.backupCount || 0;
        
        // Try to restore directory handle if available
        if (config.directoryHandle && this.isFileSystemApiSupported) {
          // Note: Directory handles cannot be fully restored across sessions
          // User will need to re-select the directory
          Logger.debug('Backup directory will need to be re-selected');
        }
      }
      
    } catch (error) {
      Logger.warn('Failed to load backup configuration:', error);
    }
  }
  
  /**
   * Save backup configuration to storage
   * @private
   */
  async saveConfiguration() {
    try {
      const config = {
        enabled: this.isEnabled,
        lastBackupTime: this.lastBackupTime,
        backupCount: this.backupCount,
        directoryPath: this.getDirectoryPath()
      };
      
      localStorage.setItem(this.config.storageKey, JSON.stringify(config));
      
    } catch (error) {
      Logger.error('Failed to save backup configuration:', error);
    }
  }
  
  /**
   * Prompt user to select backup directory
   * @returns {Promise<boolean>} Whether directory was selected successfully
   */
  async selectBackupDirectory() {
    if (!this.isFileSystemApiSupported) {
      throw new Error('File System Access API is not supported in this browser');
    }
    
    try {
      // Show directory picker
      const directoryHandle = await window.showDirectoryPicker({
        id: 'compy-backup-directory',
        mode: 'readwrite',
        startIn: 'documents'
      });
      
      // Test write access by creating a temporary file
      await this.testDirectoryAccess(directoryHandle);
      
      this.backupDirectoryHandle = directoryHandle;
      this.isEnabled = true; // Auto-enable backup when folder is selected
      await this.saveConfiguration();
      
      Logger.info('Backup directory selected successfully:', this.getDirectoryPath());
      return true;
      
    } catch (error) {
      if (error.name === 'AbortError') {
        Logger.info('Directory selection cancelled by user');
      } else {
        Logger.error('Failed to select backup directory:', error);
      }
      return false;
    }
  }
  
  /**
   * Test directory access by creating and deleting a test file
   * @param {FileSystemDirectoryHandle} directoryHandle - Directory to test
   * @private
   */
  async testDirectoryAccess(directoryHandle) {
    const testFileName = '.compy-test-access';
    
    try {
      // Create test file
      const fileHandle = await directoryHandle.getFileHandle(testFileName, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write('test');
      await writable.close();
      
      // Delete test file
      await directoryHandle.removeEntry(testFileName);
      
    } catch (error) {
      throw new Error('Cannot write to selected directory. Please choose a different location.');
    }
  }
  
  /**
   * Get the current backup directory path (display name)
   * @returns {string} Directory path or empty string
   */
  getDirectoryPath() {
    return this.backupDirectoryHandle?.name || '';
  }

  /**
   * Get backup directory information for display
   * @returns {Object} Directory information
   */
  getDirectoryInfo() {
    if (!this.backupDirectoryHandle) {
      return {
        name: '',
        displayText: 'No folder selected',
        hasPermission: false
      };
    }

    const name = this.backupDirectoryHandle.name;
    return {
      name: name,
      displayText: `"${name}" folder`,
      hasPermission: true,
      fullDescription: `Backups are saved to the "${name}" folder you selected`
    };
  }
  
  /**
   * Check if backup is currently configured and enabled
   * @returns {boolean} Whether auto backup is active
   */
  isBackupActive() {
    return this.backupDirectoryHandle !== null;
  }
  
  /**
   * Enable or disable auto backup
   * @param {boolean} enabled - Whether to enable auto backup
   */
  async setEnabled(enabled) {
    this.isEnabled = enabled;
    await this.saveConfiguration();
    
    Logger.info(`Auto backup ${enabled ? 'enabled' : 'disabled'}`);
  }
  
  /**
   * Trigger an automatic backup with debouncing
   * This is called when data changes are detected
   */
  triggerAutoBackup() {
    if (!this.isBackupActive()) {
      return;
    }
    
    // Clear existing timeout to debounce rapid changes
    if (this.backupTimeout) {
      clearTimeout(this.backupTimeout);
    }
    
    // Schedule backup after debounce delay
    this.backupTimeout = setTimeout(async () => {
      try {
        await this.performBackup();
      } catch (error) {
        Logger.error('Auto backup failed:', error);
        // Could show notification to user about backup failure
        if (window.app && window.app.showNotification) {
          window.app.showNotification('Backup failed. Please check backup settings.', 'error');
        }
      }
    }, this.config.debounceDelay);
    
    Logger.debug('Auto backup scheduled');
  }
  
  /**
   * Perform the actual backup operation
   * @returns {Promise<boolean>} Whether backup was successful
   * @private
   */
  async performBackup() {
    if (!this.backupDirectoryHandle) {
      throw new Error('No backup directory selected');
    }
    
    try {
      // Get current data from storage
      const data = this.getCurrentData();
      
      // Generate backup filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `${this.config.backupFilePrefix}${timestamp}${this.config.backupFileExtension}`;
      
      // Create backup file
      const fileHandle = await this.backupDirectoryHandle.getFileHandle(filename, { create: true });
      const writable = await fileHandle.createWritable();
      
      // Write backup data
      const backupContent = JSON.stringify(data, null, 2);
      await writable.write(backupContent);
      await writable.close();
      
      // Update backup statistics
      this.lastBackupTime = Date.now();
      this.backupCount++;
      await this.saveConfiguration();
      
      // Clean up old backups
      await this.cleanupOldBackups();
      
      Logger.info(`Backup created successfully: ${filename}`);
      
      // Show success notification
      if (window.app && window.app.showNotification) {
        window.app.showNotification('Backup saved successfully', 'success');
      }
      
      return true;
      
    } catch (error) {
      Logger.error('Backup operation failed:', error);
      throw error;
    }
  }
  
  /**
   * Get current application data for backup
   * @returns {Object} Current data to backup
   * @private
   */
  getCurrentData() {
    try {
      // Get items from localStorage
      const items = JSON.parse(localStorage.getItem(STORAGE_KEYS.items) || '[]');
      
      // Get profile information with fallback for legacy format
      let profile = {};
      const profileData = localStorage.getItem(STORAGE_KEYS.profile);
      
      if (profileData) {
        try {
          profile = JSON.parse(profileData);
        } catch (parseError) {
          // Handle legacy string format
          if (typeof profileData === 'string' && profileData.trim()) {
            profile = { name: profileData.trim() };
          }
        }
      }
      
      // Create backup object
      return {
        version: '2.0',
        timestamp: new Date().toISOString(),
        itemCount: items.length,
        profile: profile,
        items: items
      };
      
    } catch (error) {
      Logger.error('Failed to get current data for backup:', error);
      return {
        version: '2.0',
        timestamp: new Date().toISOString(),
        itemCount: 0,
        items: [],
        error: 'Failed to read current data'
      };
    }
  }
  
  /**
   * Clean up old backup files, keeping only the most recent ones
   * @private
   */
  async cleanupOldBackups() {
    if (!this.backupDirectoryHandle) {
      return;
    }
    
    try {
      const backupFiles = [];
      
      // Collect all backup files
      for await (const [name, handle] of this.backupDirectoryHandle.entries()) {
        if (name.startsWith(this.config.backupFilePrefix) && 
            name.endsWith(this.config.backupFileExtension) &&
            handle.kind === 'file') {
          backupFiles.push({ name, handle });
        }
      }
      
      // Sort by filename (which includes timestamp)
      backupFiles.sort((a, b) => b.name.localeCompare(a.name));
      
      // Remove old backups beyond the limit
      if (backupFiles.length > this.config.maxBackups) {
        const filesToDelete = backupFiles.slice(this.config.maxBackups);
        
        for (const file of filesToDelete) {
          try {
            await this.backupDirectoryHandle.removeEntry(file.name);
            Logger.debug(`Removed old backup: ${file.name}`);
          } catch (error) {
            Logger.warn(`Failed to remove old backup ${file.name}:`, error);
          }
        }
      }
      
    } catch (error) {
      Logger.warn('Failed to cleanup old backups:', error);
    }
  }
  
  /**
   * Get backup status information
   * @returns {Object} Backup status details
   */
  getBackupStatus() {
    return {
      isSupported: this.isFileSystemApiSupported,
      isEnabled: this.isEnabled,
      isActive: this.isBackupActive(),
      directoryPath: this.getDirectoryPath(),
      lastBackupTime: this.lastBackupTime,
      backupCount: this.backupCount
    };
  }
  
  /**
   * Reset backup configuration
   */
  async resetBackupConfig() {
    this.isEnabled = false;
    this.backupDirectoryHandle = null;
    this.lastBackupTime = null;
    this.backupCount = 0;
    
    if (this.backupTimeout) {
      clearTimeout(this.backupTimeout);
      this.backupTimeout = null;
    }
    
    try {
      localStorage.removeItem(this.config.storageKey);
    } catch (error) {
      Logger.warn('Failed to remove backup configuration:', error);
    }
    
    Logger.info('Backup configuration reset');
  }
  
  /**
   * Perform a manual backup (bypassing debounce)
   * @returns {Promise<boolean>} Whether backup was successful
   */
  async performManualBackup() {
    if (!this.isBackupActive()) {
      throw new Error('Backup is not configured or enabled');
    }
    
    return await this.performBackup();
  }
}

// Export singleton instance
export const backupService = new BackupService();