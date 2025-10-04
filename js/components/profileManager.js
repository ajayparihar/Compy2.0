/**
 * Profile Manager Component for Compy 2.0
 * 
 * This component handles user profile management including display name settings
 * and auto backup configuration. It provides a unified interface for both
 * profile information and backup settings.
 * 
 * Features:
 * - User profile name editing with validation
 * - Auto backup configuration and status display
 * - Backup location selection using File System Access API
 * - Manual backup triggering and backup reset functionality
 * - Real-time status updates and notifications
 * 
 * @fileoverview Profile management component with backup integration
 * @version 2.0
 * @author Bheb Developer
 * @since 2025
 */

import { Logger } from '../utils.js?v=2.0.3';
import { STORAGE_KEYS, UI_CONFIG } from '../constants.js?v=2.0.3';
import { backupService } from '../services/BackupService.js?v=2.0.3';

/**
 * Create and manage the profile settings component
 */
export function createProfileManager(modalManager, notificationManager) {
  
  // Component state
  const state = {
    isInitialized: false,
    currentProfileName: '',
    backupStatus: null
  };

  /**
   * Initialize the profile manager
   */
  function init() {
    try {
      setupEventListeners();
      loadCurrentProfile();
      initializeBackupUI();
      
      state.isInitialized = true;
      Logger.info('Profile manager initialized successfully');
      
    } catch (error) {
      Logger.error('Failed to initialize profile manager:', error);
    }
  }

  /**
   * Set up all event listeners for profile management
   * @private
   */
  function setupEventListeners() {
    // Profile edit button - open modal
    const profileEditBtn = document.getElementById('profileEditBtn');
    if (profileEditBtn) {
      profileEditBtn.addEventListener('click', openProfileModal);
    }

    // Profile form submission
    const profileForm = document.getElementById('profileForm');
    if (profileForm) {
      profileForm.addEventListener('submit', handleProfileSave);
    }

    // Remove backup toggle - simplified approach

    // Backup location selection
    const selectBackupLocationBtn = document.getElementById('selectBackupLocationBtn');
    if (selectBackupLocationBtn) {
      selectBackupLocationBtn.addEventListener('click', handleBackupLocationSelect);
    }

    // Removed manual backup and reset handlers - simplified approach

    // Clear field handlers
    document.querySelectorAll('[data-clear]').forEach(button => {
      button.addEventListener('click', handleClearField);
    });
  }

  /**
   * Load current profile information
   * @private
   */
  function loadCurrentProfile() {
    try {
      const profileData = localStorage.getItem(STORAGE_KEYS.profile);
      let profile = {};
      
      if (profileData) {
        try {
          // Try to parse as JSON first
          profile = JSON.parse(profileData);
          
          // Ensure we have a clean name string
          if (profile && typeof profile === 'object' && profile.name) {
            profile.name = String(profile.name).trim();
          }
        } catch (parseError) {
          // If JSON parsing fails, treat as legacy string format
          if (typeof profileData === 'string' && profileData.trim()) {
            const cleanName = profileData.trim();
            // Check if it looks like corrupted JSON
            if (cleanName.includes('{') || cleanName.includes('}')) {
              localStorage.removeItem(STORAGE_KEYS.profile);
              profile = {};
            } else {
              profile = { name: cleanName };
              // Migrate to new format
              localStorage.setItem(STORAGE_KEYS.profile, JSON.stringify(profile));
            }
          }
        }
      }
      
      state.currentProfileName = (profile.name || '').trim();
      updateProfileDisplay();
      
    } catch (error) {
      Logger.warn('Failed to load current profile:', error);
      state.currentProfileName = '';
      // Clear corrupted data on error
      try {
        localStorage.removeItem(STORAGE_KEYS.profile);
      } catch (e) { /* ignore */ }
    }
  }

  /**
   * Update the profile display in the header
   * @private
   */
  function updateProfileDisplay() {
    const profileDisplay = document.getElementById('profileDisplay');
    
    if (profileDisplay) {
      if (state.currentProfileName) {
        profileDisplay.textContent = `- ${state.currentProfileName}'s Compy`;
        profileDisplay.style.display = 'inline';
      } else {
        profileDisplay.style.display = 'none';
      }
    }
  }

  /**
   * Initialize backup UI components
   * @private
   */
  async function initializeBackupUI() {
    try {
      const backupStatus = backupService.getBackupStatus();
      
      if (backupStatus.isSupported) {
        await updateBackupStatus();
      } else {
        showBackupNotSupported();
      }
      
    } catch (error) {
      Logger.error('Failed to initialize backup UI:', error);
    }
  }


  /**
   * Show backup not supported UI
   * @private
   */
  function showBackupNotSupported() {
    const statusText = document.getElementById('backupStatusText');
    if (statusText) {
      statusText.innerHTML = 'Auto backup requires a modern browser with <a href="https://developer.mozilla.org/en-US/docs/Web/API/File_System_Access_API" target="_blank" rel="noopener">File System Access API</a> support';
    }
  }


  /**
   * Update backup status display
   * @private
   */
  async function updateBackupStatus() {
    try {
      const status = backupService.getBackupStatus();
      state.backupStatus = status;

      // Update location display
      const backupLocationText = document.getElementById('backupLocationText');
      const backupStatusText = document.getElementById('backupStatusText');
      
      if (backupLocationText) {
        const dirInfo = backupService.getDirectoryInfo();
        if (dirInfo.hasPermission) {
          backupLocationText.textContent = dirInfo.name;
          if (backupStatusText) {
            backupStatusText.textContent = `Automatic backup is active - JSON files will be saved to "${dirInfo.name}" folder when data changes`;
          }
        } else {
          backupLocationText.textContent = dirInfo.displayText;
          if (backupStatusText) {
            backupStatusText.textContent = 'Choose a folder to enable automatic backup';
          }
        }
      }

    } catch (error) {
      Logger.error('Failed to update backup status:', error);
    }
  }

  /**
   * Open the profile modal
   * @private
   */
  function openProfileModal() {
    // Load current values into form
    const profileNameInput = document.getElementById('profileNameInput');
    if (profileNameInput) {
      profileNameInput.value = state.currentProfileName;
    }

    // Update backup status
    updateBackupStatus();

    // Open modal
    modalManager.open('#profileModal', {
      initialFocus: '#profileNameInput',
      onClose: (modalInfo) => {
        console.log('=== PROFILE MODAL CLOSE START ===');
        console.log('Modal info:', modalInfo);
        console.log('Body classes before:', Array.from(document.body.classList));
        console.log('Body overflow before:', window.getComputedStyle(document.body).overflow);
        
        // IMMEDIATE: Add force-scrolling class
        document.body.classList.add('force-scrolling');
        console.log('Added force-scrolling class');
        
        // Remove modal-open class immediately
        document.body.classList.remove('modal-open');
        console.log('Removed modal-open class');
        console.log('Body classes after changes:', Array.from(document.body.classList));
        
        // Clean up after very short delay
        setTimeout(() => {
          console.log('Cleanup timeout executing...');
          document.body.classList.remove('force-scrolling');
          document.body.style.overflow = '';
          document.documentElement.style.overflow = '';
          
          console.log('Final body classes:', Array.from(document.body.classList));
          console.log('Final body overflow:', window.getComputedStyle(document.body).overflow);
          console.log('=== PROFILE MODAL CLOSE END ===');
        }, 50);
      }
    });
  }

  /**
   * Handle profile form submission
   * @private
   */
  async function handleProfileSave(event) {
    event.preventDefault();

    try {
      const profileNameInput = document.getElementById('profileNameInput');
      const newName = profileNameInput?.value?.trim() || '';

      // Validate name length
      if (newName.length > UI_CONFIG.maxNameLength) {
        notificationManager.show(`Name too long. Maximum ${UI_CONFIG.maxNameLength} characters.`, 'error');
        return;
      }

      // Save profile
      const profile = { name: newName };
      localStorage.setItem(STORAGE_KEYS.profile, JSON.stringify(profile));
      
      state.currentProfileName = newName;
      updateProfileDisplay();

      // Close modal
      modalManager.close('#profileModal');
      
      // IMMEDIATE scrolling fix - force with CSS class
      document.body.classList.add('force-scrolling');
      document.body.classList.remove('modal-open', 'no-scroll');
      
      // Clean up force class after a moment
      setTimeout(() => {
        document.body.classList.remove('force-scrolling');
        document.body.style.overflow = '';
        console.log('Profile modal scrolling restored');
      }, 200);

      // Show success notification
      notificationManager.show('Profile updated successfully', 'success');

      Logger.info('Profile updated:', { name: newName });

    } catch (error) {
      Logger.error('Failed to save profile:', error);
      notificationManager.show('Failed to save profile', 'error');
    }
  }


  /**
   * Handle backup location selection
   * @private
   */
  async function handleBackupLocationSelect() {
    try {
      const success = await backupService.selectBackupDirectory();
      
      if (success) {
        await updateBackupStatus();
        
        const backupStatus = backupService.getBackupStatus();
        const message = `Backup location set to "${backupStatus.directoryPath}". JSON files will now be automatically saved when data changes.`;
        notificationManager.show(message, 'success');
        return true;
      } else {
        notificationManager.show('Backup location selection cancelled', 'info');
        return false;
      }

    } catch (error) {
      Logger.error('Failed to select backup location:', error);
      
      // Provide more helpful error messages
      let errorMessage = 'Failed to select backup location';
      if (error.message.includes('not supported')) {
        errorMessage = 'Your browser doesn\'t support automatic folder selection. Try using Chrome, Edge, or Opera.';
      } else if (error.message.includes('write')) {
        errorMessage = 'Cannot write to the selected folder. Please choose a different location.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      notificationManager.show(errorMessage, 'error');
      return false;
    }
  }


  /**
   * Handle clear field button clicks
   * @private
   */
  function handleClearField(event) {
    const targetSelector = event.currentTarget.getAttribute('data-clear');
    const targetInput = document.querySelector(targetSelector);
    
    if (targetInput) {
      targetInput.value = '';
      targetInput.focus();
    }
  }

  /**
   * Show confirmation dialog
   * @private
   */
  async function showConfirmation(options) {
    return new Promise((resolve) => {
      if (window.confirm && typeof window.confirm === 'function') {
        // Use global confirm function if available
        window.confirm(options).then(resolve).catch(() => resolve(false));
      } else {
        // Fallback to browser confirm
        resolve(confirm(options.message));
      }
    });
  }

  /**
   * Get backup service for external access
   */
  function getBackupService() {
    return backupService;
  }

  /**
   * Update backup status from external components
   */
  async function refreshBackupStatus() {
    await updateBackupStatus();
  }

  // Public API
  return {
    init,
    getBackupService,
    refreshBackupStatus,
    openProfileModal
  };
}