/**
 * Item Service for Compy 2.0
 * 
 * This module provides a service layer for all item-related operations, including
 * CRUD operations, validation, filtering, and business logic. It acts as an
 * abstraction layer between the UI components and the state management system.
 * 
 * Features:
 * - Complete CRUD operations for items
 * - Data validation and sanitization
 * - Advanced filtering and searching
 * - Import/export functionality
 * - Business logic encapsulation
 * 
 * @fileoverview Service layer for item management operations
 * @version 2.0
 * @author Bheb Developer
 * @since 2025
 */

import { 
  upsertItem, 
  deleteItem, 
  getState, 
  setEditingId 
} from '../state.js';
import { 
  validateItem, 
  filterItems, 
  getAllTags, 
  parseCSVLine, 
  csvEscape 
} from '../utils.js';
import { generateUID } from '../utils.js';

/**
 * ItemService handles all item-related business operations
 * 
 * This class encapsulates the business logic for managing snippet items,
 * providing a clean API for UI components while maintaining separation
 * of concerns from state management.
 * 
 * @class ItemService
 * @example
 * const itemService = new ItemService();
 * 
 * // Create new item
 * const result = itemService.createItem({
 *   text: 'console.log("Hello World")',
 *   desc: 'Basic logging command',
 *   tags: ['javascript', 'debug']
 * });
 * 
 * // Search and filter items
 * const filtered = itemService.searchItems('console', ['javascript']);
 */
export class ItemService {
  /**
   * Initialize the item service
   */
  constructor() {
    // Bind methods to maintain context
    this.createItem = this.createItem.bind(this);
    this.updateItem = this.updateItem.bind(this);
    this.removeItem = this.removeItem.bind(this);
    this.searchItems = this.searchItems.bind(this);
  }

  /**
   * Create a new item
   * 
   * Validates the item data, assigns a unique ID, and saves it to state.
   * Returns the result of the operation including any validation errors.
   * 
   * @param {Object} itemData - Item data to create
   * @param {string} itemData.text - Snippet content
   * @param {string} itemData.desc - Snippet description
   * @param {boolean} [itemData.sensitive=false] - Whether snippet is sensitive
   * @param {string[]} [itemData.tags=[]] - Array of tags
   * @returns {Object} Operation result with success flag and data/errors
   * 
   * @example
   * const result = itemService.createItem({
   *   text: 'git status',
   *   desc: 'Check git repository status',
   *   tags: ['git', 'version-control']
   * });
   * 
   * if (result.success) {
   *   console.log('Item created:', result.data.id);
   * } else {
   *   console.error('Validation errors:', result.errors);
   * }
   */
  createItem(itemData) {
    // Validate the input data
    const validation = this.validateItemData(itemData);
    if (!validation.isValid) {
      return {
        success: false,
        errors: validation.errors,
        data: null
      };
    }

    // Create the item object
    const item = this.sanitizeItemData({
      text: itemData.text,
      desc: itemData.desc,
      sensitive: Boolean(itemData.sensitive),
      tags: this.normalizeTags(itemData.tags || [])
    });

    try {
      // Clear editing state and create new item
      setEditingId(null);
      upsertItem(item);

      return {
        success: true,
        errors: [],
        data: item
      };
    } catch (error) {
      console.error('Failed to create item:', error);
      return {
        success: false,
        errors: ['Failed to create item. Please try again.'],
        data: null
      };
    }
  }

  /**
   * Update an existing item
   * 
   * Finds the item by ID, validates the updated data, and saves changes.
   * Preserves existing data for fields not provided in the update.
   * 
   * @param {string} itemId - ID of the item to update
   * @param {Object} updates - Partial item data to update
   * @returns {Object} Operation result with success flag and data/errors
   * 
   * @example
   * const result = itemService.updateItem('abc123', {
   *   desc: 'Updated description',
   *   tags: ['git', 'cli', 'status']
   * });
   */
  updateItem(itemId, updates) {
    // Find the existing item
    const existingItem = this.getItemById(itemId);
    if (!existingItem) {
      return {
        success: false,
        errors: ['Item not found'],
        data: null
      };
    }

    // Merge updates with existing data
    const updatedData = {
      ...existingItem,
      ...updates,
      tags: updates.tags ? this.normalizeTags(updates.tags) : existingItem.tags
    };

    // Validate the updated data
    const validation = this.validateItemData(updatedData);
    if (!validation.isValid) {
      return {
        success: false,
        errors: validation.errors,
        data: null
      };
    }

    try {
      // Set editing ID and update the item
      setEditingId(itemId);
      const sanitizedItem = this.sanitizeItemData(updatedData);
      upsertItem(sanitizedItem);

      return {
        success: true,
        errors: [],
        data: sanitizedItem
      };
    } catch (error) {
      console.error('Failed to update item:', error);
      return {
        success: false,
        errors: ['Failed to update item. Please try again.'],
        data: null
      };
    }
  }

  /**
   * Remove an item by ID
   * 
   * @param {string} itemId - ID of the item to remove
   * @returns {Object} Operation result with success flag
   * 
   * @example
   * const result = itemService.removeItem('abc123');
   * if (result.success) {
   *   console.log('Item deleted successfully');
   * }
   */
  removeItem(itemId) {
    // Verify item exists
    const existingItem = this.getItemById(itemId);
    if (!existingItem) {
      return {
        success: false,
        errors: ['Item not found'],
        data: null
      };
    }

    try {
      deleteItem(itemId);
      return {
        success: true,
        errors: [],
        data: { deletedId: itemId }
      };
    } catch (error) {
      console.error('Failed to delete item:', error);
      return {
        success: false,
        errors: ['Failed to delete item. Please try again.'],
        data: null
      };
    }
  }

  /**
   * Get an item by its ID
   * 
   * @param {string} itemId - ID of the item to retrieve
   * @returns {Object|null} Item object or null if not found
   * 
   * @example
   * const item = itemService.getItemById('abc123');
   * if (item) {
   *   console.log('Found item:', item.text);
   * }
   */
  getItemById(itemId) {
    const state = getState();
    return state.items.find(item => item.id === itemId) || null;
  }

  /**
   * Get all items with optional filtering and searching
   * 
   * @param {Object} [options={}] - Filtering options
   * @param {string} [options.search=''] - Search query
   * @param {string[]} [options.tags=[]] - Tags to filter by
   * @param {boolean} [options.caseSensitive=false] - Whether search should be case sensitive
   * @returns {Array} Array of filtered items
   * 
   * @example
   * // Get all items
   * const allItems = itemService.getAllItems();
   * 
   * // Get items matching search
   * const searchResults = itemService.getAllItems({ search: 'git' });
   * 
   * // Get items with specific tags
   * const gitItems = itemService.getAllItems({ tags: ['git'] });
   */
  getAllItems(options = {}) {
    const state = getState();
    const { search = '', tags = [] } = options;

    if (!search && tags.length === 0) {
      return [...state.items]; // Return copy
    }

    return filterItems(state.items, search, tags);
  }

  /**
   * Search items using advanced criteria
   * 
   * @param {string} query - Search query
   * @param {string[]} [filterTags=[]] - Tags to filter by
   * @param {Object} [options={}] - Additional search options
   * @returns {Array} Array of matching items
   * 
   * @example
   * // Simple search
   * const results = itemService.searchItems('console.log');
   * 
   * // Search with tag filtering
   * const results = itemService.searchItems('debug', ['javascript']);
   */
  searchItems(query, filterTags = [], options = {}) {
    return this.getAllItems({
      search: query,
      tags: filterTags,
      ...options
    });
  }

  /**
   * Get all unique tags from items
   * 
   * @returns {string[]} Sorted array of unique tag names
   * 
   * @example
   * const tags = itemService.getAllTags();
   * console.log('Available tags:', tags);
   */
  getAllTags() {
    const state = getState();
    return getAllTags(state.items);
  }

  /**
   * Get statistics about items
   * 
   * @returns {Object} Statistics object
   * 
   * @example
   * const stats = itemService.getStatistics();
   * console.log(`Total items: ${stats.totalItems}`);
   * console.log(`Sensitive items: ${stats.sensitiveItems}`);
   */
  getStatistics() {
    const state = getState();
    const items = state.items;

    return {
      totalItems: items.length,
      sensitiveItems: items.filter(item => item.sensitive).length,
      totalTags: this.getAllTags().length,
      averageTagsPerItem: items.length > 0 ? 
        items.reduce((sum, item) => sum + item.tags.length, 0) / items.length : 0,
      itemsWithoutTags: items.filter(item => item.tags.length === 0).length,
      oldestItem: items.length > 0 ? 
        items.reduce((oldest, item) => item.id < oldest.id ? item : oldest) : null,
      newestItem: items.length > 0 ? 
        items.reduce((newest, item) => item.id > newest.id ? item : newest) : null
    };
  }

  /**
   * Duplicate an existing item
   * 
   * Creates a copy of an item with a new ID and optional modifications.
   * 
   * @param {string} itemId - ID of the item to duplicate
   * @param {Object} [overrides={}] - Properties to override in the duplicate
   * @returns {Object} Operation result with success flag and data/errors
   * 
   * @example
   * const result = itemService.duplicateItem('abc123', {
   *   desc: 'Copy of original command'
   * });
   */
  duplicateItem(itemId, overrides = {}) {
    const originalItem = this.getItemById(itemId);
    if (!originalItem) {
      return {
        success: false,
        errors: ['Original item not found'],
        data: null
      };
    }

    // Create duplicate data
    const duplicateData = {
      ...originalItem,
      ...overrides,
      // Ensure tags are properly normalized if provided
      tags: overrides.tags ? this.normalizeTags(overrides.tags) : originalItem.tags
    };

    // Remove ID so a new one will be generated
    delete duplicateData.id;

    return this.createItem(duplicateData);
  }

  /**
   * Bulk operations for multiple items
   * 
   * @param {string} operation - Operation type: 'delete', 'addTag', 'removeTag', 'setSensitive'
   * @param {string[]} itemIds - Array of item IDs to operate on
   * @param {*} [operationData] - Additional data for the operation
   * @returns {Object} Operation result with success/failure counts
   * 
   * @example
   * // Delete multiple items
   * const result = itemService.bulkOperation('delete', ['id1', 'id2', 'id3']);
   * 
   * // Add tag to multiple items
   * const result = itemService.bulkOperation('addTag', ['id1', 'id2'], 'important');
   */
  bulkOperation(operation, itemIds, operationData) {
    const results = {
      success: 0,
      failed: 0,
      errors: []
    };

    for (const itemId of itemIds) {
      try {
        let operationResult;

        switch (operation) {
          case 'delete':
            operationResult = this.removeItem(itemId);
            break;
          
          case 'addTag':
            operationResult = this.addTagToItem(itemId, operationData);
            break;
          
          case 'removeTag':
            operationResult = this.removeTagFromItem(itemId, operationData);
            break;
          
          case 'setSensitive':
            operationResult = this.updateItem(itemId, { sensitive: operationData });
            break;
          
          default:
            throw new Error(`Unknown operation: ${operation}`);
        }

        if (operationResult.success) {
          results.success++;
        } else {
          results.failed++;
          results.errors.push(`Item ${itemId}: ${operationResult.errors.join(', ')}`);
        }
      } catch (error) {
        results.failed++;
        results.errors.push(`Item ${itemId}: ${error.message}`);
      }
    }

    return results;
  }

  /**
   * Add a tag to an existing item
   * 
   * @param {string} itemId - ID of the item
   * @param {string} tag - Tag to add
   * @returns {Object} Operation result
   * 
   * @private
   */
  addTagToItem(itemId, tag) {
    const item = this.getItemById(itemId);
    if (!item) {
      return { success: false, errors: ['Item not found'] };
    }

    const normalizedTag = this.normalizeTag(tag);
    if (!normalizedTag || item.tags.includes(normalizedTag)) {
      return { success: true, errors: [] }; // Already exists or invalid
    }

    const updatedTags = [...item.tags, normalizedTag];
    return this.updateItem(itemId, { tags: updatedTags });
  }

  /**
   * Remove a tag from an existing item
   * 
   * @param {string} itemId - ID of the item
   * @param {string} tag - Tag to remove
   * @returns {Object} Operation result
   * 
   * @private
   */
  removeTagFromItem(itemId, tag) {
    const item = this.getItemById(itemId);
    if (!item) {
      return { success: false, errors: ['Item not found'] };
    }

    const updatedTags = item.tags.filter(t => t !== tag);
    return this.updateItem(itemId, { tags: updatedTags });
  }

  /**
   * Validate item data
   * 
   * @param {Object} itemData - Item data to validate
   * @returns {Object} Validation result
   * 
   * @private
   */
  validateItemData(itemData) {
    return validateItem(itemData);
  }

  /**
   * Sanitize item data for safe storage
   * 
   * @param {Object} itemData - Raw item data
   * @returns {Object} Sanitized item data
   * 
   * @private
   */
  sanitizeItemData(itemData) {
    return {
      text: String(itemData.text || '').trim(),
      desc: String(itemData.desc || '').trim(),
      sensitive: Boolean(itemData.sensitive),
      tags: this.normalizeTags(itemData.tags || [])
    };
  }

  /**
   * Normalize array of tags
   * 
   * @param {string[]} tags - Raw tags array
   * @returns {string[]} Normalized tags array
   * 
   * @private
   */
  normalizeTags(tags) {
    if (!Array.isArray(tags)) return [];

    return tags
      .map(tag => this.normalizeTag(tag))
      .filter(Boolean)
      .filter((tag, index, arr) => arr.indexOf(tag) === index); // Remove duplicates
  }

  /**
   * Normalize a single tag
   * 
   * @param {string} tag - Raw tag string
   * @returns {string} Normalized tag or empty string if invalid
   * 
   * @private
   */
  normalizeTag(tag) {
    if (typeof tag !== 'string') return '';
    
    return tag
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\-_]/g, '') // Allow only alphanumeric, hyphens, underscores
      .substring(0, 50); // Limit length
  }
}

/**
 * Factory function to create an item service instance
 * 
 * @returns {ItemService} Configured item service instance
 * 
 * @example
 * import { createItemService } from './itemService.js';
 * 
 * const itemService = createItemService();
 */
export const createItemService = () => {
  return new ItemService();
};

// Export singleton instance for convenience
export const itemService = new ItemService();
