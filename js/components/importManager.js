/**
 * Import Manager Component for Compy 2.0
 * 
 * This component encapsulates all import-related functionality including
 * user prompts, data validation, duplicate detection, and result reporting.
 * It provides a consistent interface for importing data from various sources.
 * 
 * Features:
 * - Import options dialog (Add/Replace/Cancel)
 * - Duplicate detection across imports
 * - Standardized result reporting
 * - Profile management during import
 * 
 * @fileoverview Import management component with user interaction
 * @version 2.0
 * @author Bheb Developer
 * @since 2025
 */

/**
 * ImportManager handles all import operations with consistent user experience
 * 
 * This class provides a unified interface for importing data from JSON/CSV sources,
 * managing user choices about existing data, and providing standardized feedback.
 * 
 * @class ImportManager
 * @example
 * const importManager = new ImportManager(modalManager, notificationManager);
 * 
 * const result = await importManager.handleImport({
 *   items: [...],
 *   profileName: 'John Doe'
 * }, 'JSON');
 */
export class ImportManager {
  /**
   * Initialize the import manager
   * 
   * @param {Object} modalManager - Modal manager for user dialogs
   * @param {Object} notificationManager - Notification manager for feedback
   * @param {Object} stateManager - State management functions
   */
  constructor(modalManager, notificationManager, stateManager) {
    this.modalManager = modalManager;
    this.notifications = notificationManager;
    this.state = stateManager;
    
    // Bind methods to maintain context
    this.handleImport = this.handleImport.bind(this);
    this.promptImportOptions = this.promptImportOptions.bind(this);
    this.buildDedupeSet = this.buildDedupeSet.bind(this);
  }

  /**
   * Handle complete import process with user interaction
   * 
   * @param {Object} importData - Data to import
   * @param {Array} importData.items - Items to import
   * @param {string} [importData.profileName] - Profile name from import
   * @param {string} source - Source description (e.g., 'JSON', 'CSV')
   * @returns {Promise<Object>} Import result with success/failure counts
   */
  async handleImport(importData, source) {
    try {
      // Check for existing data and get user decision
      const decision = await this.getImportDecision(importData.items.length, source);
      if (decision.cancelled) {
        return { cancelled: true };
      }

      // Prepare for import
      const dedupeSet = this.prepareImport(decision.shouldClearExisting, importData.profileName);

      // Process and validate items
      const result = this.processImportItems(importData.items, dedupeSet);

      // Show results to user
      this.showImportResult(result.importCount, result.skippedCount);

      return {
        cancelled: false,
        importCount: result.importCount,
        skippedCount: result.skippedCount
      };
    } catch (error) {
      console.error(`${source} import failed:`, error);
      this.notifications.show(`${source} import failed: ${error.message}`, 'error');
      return { cancelled: true, error: error.message };
    }
  }

  /**
   * Get user decision about how to handle existing data
   * 
   * @param {number} itemCount - Number of items to import
   * @param {string} source - Source description
   * @returns {Promise<Object>} User decision
   * @private
   */
  async getImportDecision(itemCount, source) {
    const currentState = this.state.getState();
    const hasExistingData = currentState.items.length > 0 || currentState.profileName;

    if (hasExistingData) {
      const decision = await this.promptImportOptions(
        currentState.items.length,
        currentState.profileName || 'Not set',
        itemCount,
        source
      );

      return {
        cancelled: decision === 'cancel',
        shouldClearExisting: decision === 'replace'
      };
    }

    return { cancelled: false, shouldClearExisting: false };
  }

  /**
   * Prepare for import by clearing data and setting profile if needed
   * 
   * @param {boolean} shouldClearExisting - Whether to clear existing data
   * @param {string|null} profileName - Profile name to apply
   * @returns {Set<string>} Deduplication set
   * @private
   */
  prepareImport(shouldClearExisting, profileName) {
    const currentState = this.state.getState();

    // Build deduplication set before clearing
    const dedupeSet = this.buildDedupeSet(currentState, shouldClearExisting);

    // Clear existing data if requested
    if (shouldClearExisting) {
      this.clearAllData();
    }

    // Apply profile name if provided
    if (profileName && profileName.trim()) {
      this.state.updateProfile(profileName.trim());
    }

    return dedupeSet;
  }

  /**
   * Process import items with validation and duplicate detection
   * 
   * @param {Array} items - Items to import
   * @param {Set<string>} dedupeSet - Deduplication set
   * @returns {Object} Import results
   * @private
   */
  processImportItems(items, dedupeSet) {
    let importCount = 0;
    let skippedCount = 0;

    for (const item of items) {
      if (this.addImportedItem(item, dedupeSet)) {
        importCount++;
      } else {
        skippedCount++;
      }
    }

    return { importCount, skippedCount };
  }

  /**
   * Validate and add an imported item to the state
   * 
   * @param {Object} itemData - Item data to import
   * @param {Set<string>} dedupeSet - Deduplication set
   * @returns {boolean} True if item was added successfully
   * @private
   */
  addImportedItem(itemData, dedupeSet) {
    // Validate item structure and content
    const validation = this.state.validateItem(itemData);
    if (!validation.isValid) {
      console.warn('Skipping invalid item:', validation.errors);
      return false;
    }

    // Generate signature for duplicate detection
    const signature = this.generateItemSignature(itemData);
    if (dedupeSet.has(signature)) {
      console.warn('Skipping duplicate item:', itemData);
      return false;
    }

    // Add item to state
    this.state.upsertItem({
      text: (itemData.text || '').trim(),
      desc: (itemData.desc || '').trim(),
      sensitive: !!itemData.sensitive,
      tags: Array.isArray(itemData.tags) ? itemData.tags : []
    });

    dedupeSet.add(signature);
    return true;
  }

  /**
   * Generate a unique signature for duplicate detection
   * 
   * @param {Object} item - Item to generate signature for
   * @returns {string} Unique signature
   * @private
   */
  generateItemSignature(item) {
    const text = (item.text || '').trim();
    const desc = (item.desc || '').trim();
    const sensitive = item.sensitive ? '1' : '0';
    return `${text}||${desc}||${sensitive}`;
  }

  /**
   * Build deduplication set from existing state
   * 
   * @param {Object} currentState - Current application state
   * @param {boolean} shouldClearExisting - Whether existing data will be cleared
   * @returns {Set<string>} Deduplication set
   * @private
   */
  buildDedupeSet(currentState, shouldClearExisting) {
    if (shouldClearExisting) {
      return new Set();
    }

    const items = currentState.items || [];
    return new Set(items.map(item => this.generateItemSignature(item)));
  }

  /**
   * Clear all existing data (items, profile, filters, search)
   * 
   * @private
   */
  clearAllData() {
    const currentState = this.state.getState();

    // Remove all items
    currentState.items.forEach(item => {
      this.state.deleteItem(item.id);
    });

    // Clear profile and UI state
    this.state.updateProfile('');
    this.state.updateFilterTags([]);
    this.state.updateSearch('');
  }

  /**
   * Show standardized import result notification
   * 
   * @param {number} importCount - Number of items imported
   * @param {number} skippedCount - Number of items skipped
   * @private
   */
  showImportResult(importCount, skippedCount) {
    const message = skippedCount > 0
      ? `Imported ${importCount} items (${skippedCount} skipped as duplicates or invalid)`
      : `Imported ${importCount} items`;

    this.notifications.show(message, importCount > 0 ? 'success' : 'info');
  }

  /**
   * Show import options dialog to user
   * 
   * @param {number} existingCount - Number of existing items
   * @param {string} existingProfile - Current profile name
   * @param {number} importingCount - Number of items to import
   * @param {string} importingSource - Source description
   * @returns {Promise<string>} User choice: 'add', 'replace', or 'cancel'
   */
  async promptImportOptions(existingCount, existingProfile, importingCount, importingSource) {
    return new Promise((resolve) => {
      // Remove any previous instance to avoid duplicates
      const prior = document.getElementById('importOptionsModal');
      if (prior) prior.remove();

      const modal = document.createElement('div');
      modal.className = 'modal';
      modal.id = 'importOptionsModal';
      modal.setAttribute('aria-hidden', 'true');
      modal.innerHTML = `
        <div class="modal-content small import-options-modal" role="dialog" aria-labelledby="importOptionsTitle" aria-describedby="importOptionsDesc">
          <div class="modal-header">
            <h3 id="importOptionsTitle">Import Options</h3>
            <button class="icon-btn" data-close-modal aria-label="Close dialog" title="Close dialog">
              <span aria-hidden="true">✕</span>
            </button>
          </div>
          <div class="modal-body">
            <div class="import-comparison">
              <div class="import-section">
                <h3>📂 Existing Data</h3>
                <p><strong>${existingCount} snippets</strong></p>
                <p>Profile: ${existingProfile}</p>
              </div>
              <div class="import-section">
                <h3>📥 Importing</h3>
                <p><strong>${importingCount} snippets</strong></p>
                <p>Source: ${importingSource}</p>
              </div>
            </div>
            <p id="importOptionsDesc" class="import-message">How would you like to handle the import?</p>
          </div>
          <div class="modal-footer">
            <button id="importCancel" class="secondary-btn" data-close-modal>Cancel</button>
            <div class="end-actions">
              <button id="importAdd" class="primary-btn" data-primary="true">Add to Existing</button>
              <button id="importReplace" class="modal-danger-btn">Replace All</button>
            </div>
          </div>
        </div>
      `;

      // Add temporary styles
      const style = document.createElement('style');
      style.textContent = `
        .import-options-modal { max-width: 540px; text-align: center; }
        .import-comparison { display: flex; gap: 1rem; margin: 0.75rem 0 1.25rem; text-align: left; }
        .import-section { flex: 1; padding: 0.75rem; border: 1px solid var(--border); border-radius: 8px; background: var(--card-bg); }
        .import-section h3 { margin: 0 0 0.5rem 0; color: var(--text); font-size: 1rem; }
        .import-section p { margin: 0.25rem 0; color: var(--text-secondary); }
        .import-message { margin: 0.5rem 0 0; color: var(--text); font-weight: 500; }
        @media (max-width: 600px) { .import-comparison { flex-direction: column; gap: 0.75rem; } }
      `;
      document.head.appendChild(style);

      document.body.appendChild(modal);

      let settled = false;
      const cleanup = () => {
        if (settled) return;
        settled = true;
        if (style.parentNode) style.parentNode.removeChild(style);
        if (modal.parentNode) modal.parentNode.removeChild(modal);
      };

      const finalize = (choice) => {
        this.modalManager.close('#importOptionsModal');
        cleanup();
        resolve(choice);
      };

      // Wire button handlers
      modal.querySelector('#importCancel').addEventListener('click', () => finalize('cancel'));
      modal.querySelector('#importAdd').addEventListener('click', () => finalize('add'));
      modal.querySelector('#importReplace').addEventListener('click', () => finalize('replace'));

      // Handle close button
      const headerCloseBtn = modal.querySelector('.modal-header [data-close-modal]');
      if (headerCloseBtn) {
        headerCloseBtn.addEventListener('click', () => finalize('cancel'));
      }

      // Handle backdrop click
      modal.addEventListener('click', (e) => {
        if (e.target === modal) finalize('cancel');
      });

      // Handle ESC key
      const onKeydown = (e) => {
        if (e.key === 'Escape' && this.modalManager.isOpen('#importOptionsModal')) {
          finalize('cancel');
        }
      };
      document.addEventListener('keydown', onKeydown);

      // Open with modal manager
      this.modalManager.open('#importOptionsModal', { 
        initialFocus: '#importAdd',
        restoreFocus: true
      });
    });
  }
}

/**
 * Create and configure an ImportManager instance
 * 
 * @param {Object} modalManager - Modal manager instance
 * @param {Object} notificationManager - Notification manager instance
 * @param {Object} stateManager - State management functions
 * @returns {ImportManager} Configured ImportManager instance
 */
export const createImportManager = (modalManager, notificationManager, stateManager) => {
  return new ImportManager(modalManager, notificationManager, stateManager);
};