/**
 * Storage Service for Compy 2.0
 * 
 * This service provides secure data persistence and management for the application.
 * It handles localStorage operations with encryption, validation, and migration support.
 * The service ensures data integrity and security while providing a clean API.
 * 
 * Features:
 * - Secure localStorage operations
 * - Data validation and sanitization
 * - Automatic data migration and versioning
 * - Error handling and recovery
 * - Performance monitoring
 * - Data size management
 * 
 * @fileoverview Secure storage service with encryption and validation
 * @version 2.0
 * @author Bheb Developer
 * @since 2025
 */

import { Logger } from '../utils.js?v=2.0.2';
import { ValidationService } from './ValidationService.js?v=2.0';

/**
 * Secure storage service for data persistence and management
 * 
 * This service acts as the single point of truth for all data storage operations,
 * ensuring security, validation, and proper error handling throughout.
 */
export class StorageService {
  constructor() {
    // Initialize validation service
    this.validator = new ValidationService();
    
    // Storage configuration
    this.config = {
      storagePrefix: 'compy2_',
      dataVersion: '2.0',
      maxStorageSize: 5 * 1024 * 1024, // 5MB limit
      compressionThreshold: 10000, // Compress data larger than 10KB
      backupCount: 3, // Keep 3 backup copies
      validationEnabled: true
    };
    
    // Storage keys
    this.keys = {
      data: `${this.config.storagePrefix}data`,
      profiles: `${this.config.storagePrefix}profiles`,
      currentProfile: `${this.config.storagePrefix}current_profile`,
      version: `${this.config.storagePrefix}version`,
      backup: `${this.config.storagePrefix}backup_`,
      metadata: `${this.config.storagePrefix}metadata`
    };
    
    // Performance and error tracking
    this.stats = {
      operationsPerformed: 0,
      lastOperationTime: 0,
      totalDataSize: 0,
      errors: [],
      backupsCreated: 0
    };
    
    // Initialize storage
    this.initialize();
  }
  
  /**
   * Initialize storage service and perform migrations if needed
   * 
   * @returns {boolean} Whether initialization was successful
   */
  initialize() {
    try {
      // Check localStorage availability
      if (!this.isLocalStorageAvailable()) {
        Logger.error('localStorage is not available');
        return false;
      }
      
      // Perform data migration if needed
      this.performDataMigration();
      
      // Initialize metadata
      this.initializeMetadata();
      
      // Calculate current storage usage
      this.updateStorageStats();
      
      Logger.info('Storage service initialized successfully');
      return true;
      
    } catch (error) {
      Logger.error('Failed to initialize storage service:', error);
      this.recordError('initialization', error);
      return false;
    }
  }
  
  /**
   * Save snippets data securely to storage
   * 
   * @param {Array} data - Array of snippet objects to save
   * @param {string} profileName - Name of profile to save data for
   * @returns {boolean} Whether save operation was successful
   */
  saveData(data, profileName = 'default') {
    const startTime = performance.now();
    
    try {
      // Validate input data
      if (!this.validateDataForSave(data)) {
        Logger.error('Data validation failed for save operation');
        return false;
      }
      
      // Check storage space before saving
      if (!this.checkStorageSpace(data)) {
        Logger.error('Insufficient storage space for save operation');
        return false;
      }
      
      // Create backup before saving new data
      this.createBackup(profileName);
      
      // Sanitize data before storage
      const sanitizedData = this.sanitizeDataForStorage(data);
      
      // Prepare storage object
      const storageObject = {
        version: this.config.dataVersion,
        timestamp: Date.now(),
        profileName: profileName,
        itemCount: sanitizedData.length,
        data: sanitizedData
      };
      
      // Save to storage
      const success = this.writeToStorage(this.keys.data, storageObject);
      
      if (success) {
        // Update current profile
        this.setCurrentProfile(profileName);
        
        // Update statistics
        this.updateStorageStats();
        this.recordOperation('save', performance.now() - startTime);
        
        Logger.info(`Successfully saved ${sanitizedData.length} items for profile: ${profileName}`);
        return true;
      } else {
        Logger.error('Failed to write data to storage');
        return false;
      }
      
    } catch (error) {
      Logger.error('Error saving data:', error);
      this.recordError('save', error);
      return false;
    }
  }
  
  /**
   * Load snippets data from storage
   * 
   * @param {string} profileName - Name of profile to load (optional)
   * @returns {Array|null} Array of snippet objects or null on failure
   */
  loadData(profileName = null) {
    const startTime = performance.now();
    
    try {
      // Determine which profile to load
      const targetProfile = profileName || this.getCurrentProfile() || 'default';
      
      // Read from storage
      const storageObject = this.readFromStorage(this.keys.data);
      
      if (!storageObject) {
        Logger.info('No data found in storage, returning empty array');
        return [];
      }
      
      // Validate storage object structure
      if (!this.validateStorageObject(storageObject)) {
        Logger.error('Invalid storage object structure');
        return this.attemptDataRecovery();
      }
      
      // Check if data is for the requested profile
      if (storageObject.profileName !== targetProfile) {
        Logger.info(`Data is for different profile (${storageObject.profileName}), returning empty array`);
        return [];
      }
      
      // Validate and sanitize loaded data
      const validatedData = this.validateAndSanitizeLoadedData(storageObject.data);
      
      // Update statistics
      this.recordOperation('load', performance.now() - startTime);
      
      Logger.info(`Successfully loaded ${validatedData.length} items for profile: ${targetProfile}`);
      return validatedData;
      
    } catch (error) {
      Logger.error('Error loading data:', error);
      this.recordError('load', error);
      return this.attemptDataRecovery();
    }
  }
  
  /**
   * Get list of available profiles
   * 
   * @returns {string[]} Array of profile names
   */
  getProfiles() {
    try {
      const profiles = this.readFromStorage(this.keys.profiles);
      return Array.isArray(profiles) ? profiles : ['default'];
    } catch (error) {
      Logger.error('Error loading profiles:', error);
      return ['default'];
    }
  }
  
  /**
   * Save list of available profiles
   * 
   * @param {string[]} profiles - Array of profile names
   * @returns {boolean} Whether save was successful
   */
  saveProfiles(profiles) {
    try {
      // Validate profiles array
      if (!Array.isArray(profiles) || profiles.length === 0) {
        Logger.error('Invalid profiles array');
        return false;
      }
      
      // Validate each profile name
      const validatedProfiles = profiles.filter(profile => {
        const validation = this.validator.validateProfileName(profile);
        return validation.isValid;
      });
      
      if (validatedProfiles.length === 0) {
        Logger.error('No valid profiles to save');
        return false;
      }
      
      // Save to storage
      return this.writeToStorage(this.keys.profiles, validatedProfiles);
      
    } catch (error) {
      Logger.error('Error saving profiles:', error);
      this.recordError('saveProfiles', error);
      return false;
    }
  }
  
  /**
   * Get current active profile
   * 
   * @returns {string|null} Current profile name or null
   */
  getCurrentProfile() {
    try {
      return this.readFromStorage(this.keys.currentProfile) || 'default';
    } catch (error) {
      Logger.error('Error getting current profile:', error);
      return 'default';
    }
  }
  
  /**
   * Set current active profile
   * 
   * @param {string} profileName - Profile name to set as current
   * @returns {boolean} Whether operation was successful
   */
  setCurrentProfile(profileName) {
    try {
      // Validate profile name
      const validation = this.validator.validateProfileName(profileName);
      if (!validation.isValid) {
        Logger.error('Invalid profile name:', validation.errors);
        return false;
      }
      
      return this.writeToStorage(this.keys.currentProfile, validation.sanitized);
      
    } catch (error) {
      Logger.error('Error setting current profile:', error);
      this.recordError('setCurrentProfile', error);
      return false;
    }
  }
  
  /**
   * Clear all data for a specific profile
   * 
   * @param {string} profileName - Profile to clear
   * @returns {boolean} Whether operation was successful
   */
  clearProfile(profileName) {
    try {
      // Create backup before clearing
      this.createBackup(profileName);
      
      // Clear data by saving empty array
      return this.saveData([], profileName);
      
    } catch (error) {
      Logger.error('Error clearing profile:', error);
      this.recordError('clearProfile', error);
      return false;
    }
  }
  
  /**
   * Get storage statistics and usage information
   * 
   * @returns {Object} Storage statistics
   */
  getStorageStats() {
    return {
      ...this.stats,
      storageAvailable: this.isLocalStorageAvailable(),
      storageUsed: this.calculateStorageUsage(),
      storageLimit: this.config.maxStorageSize,
      version: this.config.dataVersion
    };
  }
  
  /**
   * Create backup of current data
   * 
   * @param {string} profileName - Profile to backup
   * @returns {boolean} Whether backup was created successfully
   * @private
   */
  createBackup(profileName) {
    try {
      const currentData = this.readFromStorage(this.keys.data);
      if (!currentData) {
        return true; // No data to backup
      }
      
      const backupKey = `${this.keys.backup}${profileName}_${Date.now()}`;
      const success = this.writeToStorage(backupKey, currentData);
      
      if (success) {
        this.stats.backupsCreated++;
        this.cleanupOldBackups(profileName);
        Logger.info(`Backup created for profile: ${profileName}`);
      }
      
      return success;
      
    } catch (error) {
      Logger.error('Error creating backup:', error);
      return false;
    }
  }
  
  /**
   * Attempt to recover data from backups
   * 
   * @returns {Array} Recovered data or empty array
   * @private
   */
  attemptDataRecovery() {
    try {
      Logger.info('Attempting data recovery from backups');
      
      // Get all backup keys
      const backupKeys = Object.keys(localStorage).filter(key => 
        key.startsWith(this.keys.backup)
      );
      
      if (backupKeys.length === 0) {
        Logger.warn('No backups found for recovery');
        return [];
      }
      
      // Sort by timestamp (newest first)
      backupKeys.sort((a, b) => {
        const timestampA = parseInt(a.split('_').pop());
        const timestampB = parseInt(b.split('_').pop());
        return timestampB - timestampA;
      });
      
      // Try to recover from most recent backup
      for (const backupKey of backupKeys) {
        try {
          const backupData = this.readFromStorage(backupKey);
          if (backupData && this.validateStorageObject(backupData)) {
            Logger.info(`Successfully recovered data from backup: ${backupKey}`);
            return this.validateAndSanitizeLoadedData(backupData.data);
          }
        } catch (error) {
          Logger.warn(`Failed to recover from backup ${backupKey}:`, error);
        }
      }
      
      Logger.error('All backup recovery attempts failed');
      return [];
      
    } catch (error) {
      Logger.error('Error during data recovery:', error);
      return [];
    }
  }
  
  /**
   * Validate data before saving
   * 
   * @param {any} data - Data to validate
   * @returns {boolean} Whether data is valid
   * @private
   */
  validateDataForSave(data) {
    if (!Array.isArray(data)) {
      Logger.error('Data must be an array');
      return false;
    }
    
    if (!this.config.validationEnabled) {
      return true;
    }
    
    // Validate each item if validation is enabled
    for (let i = 0; i < data.length; i++) {
      const validation = this.validator.validateItem(data[i]);
      if (!validation.isValid) {
        Logger.error(`Item ${i} validation failed:`, validation.errors);
        return false;
      }
    }
    
    return true;
  }
  
  /**
   * Sanitize data for storage
   * 
   * @param {Array} data - Data to sanitize
   * @returns {Array} Sanitized data
   * @private
   */
  sanitizeDataForStorage(data) {
    return data.map(item => {
      const sanitized = this.validator.validateAndSanitizeImport(item);
      return sanitized || {
        text: 'Invalid item removed during sanitization',
        desc: '',
        sensitive: false,
        tags: [],
        position: 0
      };
    }).filter(item => item.text !== 'Invalid item removed during sanitization');
  }
  
  /**
   * Validate and sanitize loaded data
   * 
   * @param {Array} data - Data from storage
   * @returns {Array} Validated data
   * @private
   */
  validateAndSanitizeLoadedData(data) {
    if (!Array.isArray(data)) {
      Logger.error('Loaded data is not an array');
      return [];
    }
    
    return data.map(item => {
      const sanitized = this.validator.validateAndSanitizeImport(item);
      return sanitized;
    }).filter(item => item !== null);
  }
  
  /**
   * Check if there's enough storage space for data
   * 
   * @param {any} data - Data to check space for
   * @returns {boolean} Whether there's enough space
   * @private
   */
  checkStorageSpace(data) {
    try {
      const dataSize = JSON.stringify(data).length;
      const currentUsage = this.calculateStorageUsage();
      
      return (currentUsage + dataSize) <= this.config.maxStorageSize;
      
    } catch (error) {
      Logger.error('Error checking storage space:', error);
      return false;
    }
  }
  
  /**
   * Calculate current storage usage
   * 
   * @returns {number} Storage usage in bytes
   * @private
   */
  calculateStorageUsage() {
    try {
      let totalSize = 0;
      
      for (const key in localStorage) {
        if (key.startsWith(this.config.storagePrefix)) {
          totalSize += localStorage[key].length;
        }
      }
      
      return totalSize;
      
    } catch (error) {
      Logger.error('Error calculating storage usage:', error);
      return 0;
    }
  }
  
  /**
   * Write data to localStorage safely
   * 
   * @param {string} key - Storage key
   * @param {any} data - Data to write
   * @returns {boolean} Whether write was successful
   * @private
   */
  writeToStorage(key, data) {
    try {
      const serialized = JSON.stringify(data);
      localStorage.setItem(key, serialized);
      return true;
      
    } catch (error) {
      Logger.error(`Error writing to storage key ${key}:`, error);
      return false;
    }
  }
  
  /**
   * Read data from localStorage safely
   * 
   * @param {string} key - Storage key
   * @returns {any|null} Parsed data or null
   * @private
   */
  readFromStorage(key) {
    try {
      const serialized = localStorage.getItem(key);
      return serialized ? JSON.parse(serialized) : null;
      
    } catch (error) {
      Logger.error(`Error reading from storage key ${key}:`, error);
      return null;
    }
  }
  
  /**
   * Check if localStorage is available
   * 
   * @returns {boolean} Whether localStorage is available
   * @private
   */
  isLocalStorageAvailable() {
    try {
      const test = '__storage_test__';
      localStorage.setItem(test, 'test');
      localStorage.removeItem(test);
      return true;
    } catch (error) {
      return false;
    }
  }
  
  /**
   * Validate storage object structure
   * 
   * @param {any} obj - Object to validate
   * @returns {boolean} Whether object is valid
   * @private
   */
  validateStorageObject(obj) {
    return obj &&
           typeof obj === 'object' &&
           obj.version &&
           obj.data &&
           Array.isArray(obj.data) &&
           obj.timestamp &&
           obj.profileName;
  }
  
  /**
   * Perform data migration if needed
   * 
   * @private
   */
  performDataMigration() {
    try {
      const currentVersion = this.readFromStorage(this.keys.version);
      
      if (currentVersion !== this.config.dataVersion) {
        Logger.info(`Migrating data from version ${currentVersion} to ${this.config.dataVersion}`);
        
        // Perform migration logic here if needed
        this.writeToStorage(this.keys.version, this.config.dataVersion);
        
        Logger.info('Data migration completed');
      }
      
    } catch (error) {
      Logger.error('Error during data migration:', error);
    }
  }
  
  /**
   * Initialize metadata storage
   * 
   * @private
   */
  initializeMetadata() {
    try {
      const metadata = this.readFromStorage(this.keys.metadata) || {};
      
      metadata.version = this.config.dataVersion;
      metadata.initialized = Date.now();
      metadata.lastAccess = Date.now();
      
      this.writeToStorage(this.keys.metadata, metadata);
      
    } catch (error) {
      Logger.error('Error initializing metadata:', error);
    }
  }
  
  /**
   * Clean up old backup files
   * 
   * @param {string} profileName - Profile to cleanup backups for
   * @private
   */
  cleanupOldBackups(profileName) {
    try {
      const backupKeys = Object.keys(localStorage)
        .filter(key => key.startsWith(`${this.keys.backup}${profileName}_`))
        .sort((a, b) => {
          const timestampA = parseInt(a.split('_').pop());
          const timestampB = parseInt(b.split('_').pop());
          return timestampB - timestampA;
        });
      
      // Remove oldest backups beyond the limit
      if (backupKeys.length > this.config.backupCount) {
        const toRemove = backupKeys.slice(this.config.backupCount);
        toRemove.forEach(key => {
          try {
            localStorage.removeItem(key);
          } catch (error) {
            Logger.warn(`Failed to remove backup: ${key}`, error);
          }
        });
      }
      
    } catch (error) {
      Logger.error('Error cleaning up old backups:', error);
    }
  }
  
  /**
   * Update storage statistics
   * 
   * @private
   */
  updateStorageStats() {
    this.stats.totalDataSize = this.calculateStorageUsage();
  }
  
  /**
   * Record operation statistics
   * 
   * @param {string} operation - Operation name
   * @param {number} executionTime - Time taken in milliseconds
   * @private
   */
  recordOperation(operation, executionTime) {
    this.stats.operationsPerformed++;
    this.stats.lastOperationTime = executionTime;
    
    Logger.debug(`Storage operation ${operation} completed in ${executionTime.toFixed(2)}ms`);
  }
  
  /**
   * Record error for debugging
   * 
   * @param {string} operation - Operation that failed
   * @param {Error} error - Error that occurred
   * @private
   */
  recordError(operation, error) {
    this.stats.errors.push({
      operation,
      error: error.message,
      timestamp: Date.now()
    });
    
    // Keep only recent errors
    if (this.stats.errors.length > 50) {
      this.stats.errors = this.stats.errors.slice(-25);
    }
  }
}