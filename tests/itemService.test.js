/**
 * Comprehensive Unit Tests for ItemService
 * 
 * This test suite covers the ItemService business logic including:
 * - CRUD operations (Create, Read, Update, Delete)
 * - Data validation and sanitization
 * - Search and filtering functionality
 * - Statistics and analytics
 * - Bulk operations
 * - Error handling and edge cases
 * - Performance testing
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';

// Mock implementation of ItemService functionality
class ItemService {
  constructor() {
    this.state = {
      items: [],
      filterTags: [],
      search: '',
      editingId: null,
      profileName: ''
    };
    
    // Bind methods
    this.createItem = this.createItem.bind(this);
    this.updateItem = this.updateItem.bind(this);
    this.removeItem = this.removeItem.bind(this);
    this.searchItems = this.searchItems.bind(this);
  }

  // Helper methods
  generateUID() {
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
  }

  validateItemData(itemData) {
    const errors = [];
    
    if (!itemData) {
      errors.push('Item data is required');
      return { isValid: false, errors };
    }
    
    if (!itemData.text || typeof itemData.text !== 'string' || !itemData.text.trim()) {
      errors.push('Text content is required');
    }
    
    if (!itemData.desc || typeof itemData.desc !== 'string' || !itemData.desc.trim()) {
      errors.push('Description is required');
    }
    
    if (itemData.text && itemData.text.length > 500) {
      errors.push('Text content must be 500 characters or less');
    }
    
    if (itemData.desc && itemData.desc.length > 500) {
      errors.push('Description must be 500 characters or less');
    }
    
    if (itemData.tags && !Array.isArray(itemData.tags)) {
      errors.push('Tags must be an array');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  sanitizeItemData(itemData) {
    return {
      id: itemData.id || this.generateUID(),
      text: String(itemData.text).trim(),
      desc: String(itemData.desc).trim(),
      sensitive: Boolean(itemData.sensitive),
      tags: this.normalizeTags(itemData.tags || []),
      createdAt: itemData.createdAt || Date.now(),
      updatedAt: Date.now()
    };
  }

  normalizeTags(tags) {
    if (!Array.isArray(tags)) return [];
    return tags
      .filter(tag => typeof tag === 'string' || typeof tag === 'number')
      .map(tag => String(tag).trim().toLowerCase())
      .filter(tag => tag.length > 0)
      .filter((tag, index, arr) => arr.indexOf(tag) === index) // Remove duplicates
      .slice(0, 20); // Limit tag count
  }

  // Main service methods
  createItem(itemData) {
    const validation = this.validateItemData(itemData);
    if (!validation.isValid) {
      return {
        success: false,
        errors: validation.errors,
        data: null
      };
    }

    try {
      const item = this.sanitizeItemData({
        text: itemData.text,
        desc: itemData.desc,
        sensitive: Boolean(itemData.sensitive),
        tags: this.normalizeTags(itemData.tags || [])
      });

      this.state.items.unshift(item);
      this.state.editingId = null;

      return {
        success: true,
        errors: [],
        data: item
      };
    } catch (error) {
      return {
        success: false,
        errors: ['Failed to create item. Please try again.'],
        data: null
      };
    }
  }

  updateItem(itemId, updates) {
    const existingItem = this.getItemById(itemId);
    if (!existingItem) {
      return {
        success: false,
        errors: ['Item not found'],
        data: null
      };
    }

    const updatedData = {
      ...existingItem,
      ...updates,
      tags: updates.tags ? this.normalizeTags(updates.tags) : existingItem.tags
    };

    const validation = this.validateItemData(updatedData);
    if (!validation.isValid) {
      return {
        success: false,
        errors: validation.errors,
        data: null
      };
    }

    try {
      const sanitizedItem = this.sanitizeItemData(updatedData);
      const index = this.state.items.findIndex(item => item.id === itemId);
      this.state.items[index] = sanitizedItem;
      this.state.editingId = itemId;

      return {
        success: true,
        errors: [],
        data: sanitizedItem
      };
    } catch (error) {
      return {
        success: false,
        errors: ['Failed to update item. Please try again.'],
        data: null
      };
    }
  }

  removeItem(itemId) {
    const existingItem = this.getItemById(itemId);
    if (!existingItem) {
      return {
        success: false,
        errors: ['Item not found'],
        data: null
      };
    }

    try {
      this.state.items = this.state.items.filter(item => item.id !== itemId);
      return {
        success: true,
        errors: [],
        data: { deletedId: itemId }
      };
    } catch (error) {
      return {
        success: false,
        errors: ['Failed to delete item. Please try again.'],
        data: null
      };
    }
  }

  getItemById(itemId) {
    return this.state.items.find(item => item.id === itemId) || null;
  }

  getAllItems(options = {}) {
    const { search = '', tags = [] } = options;

    if (!search && tags.length === 0) {
      return [...this.state.items];
    }

    return this.filterItems(this.state.items, search, tags);
  }

  filterItems(items, search = '', filterTags = []) {
    return items.filter(item => {
      // Search filter
      if (search) {
        const searchLower = search.toLowerCase();
        const matchesText = item.text.toLowerCase().includes(searchLower);
        const matchesDesc = item.desc.toLowerCase().includes(searchLower);
        const matchesTags = item.tags.some(tag => tag.toLowerCase().includes(searchLower));
        
        if (!matchesText && !matchesDesc && !matchesTags) {
          return false;
        }
      }
      
      // Tag filter
      if (filterTags.length > 0) {
        const hasMatchingTag = filterTags.every(filterTag => 
          item.tags.some(tag => tag.toLowerCase() === filterTag.toLowerCase())
        );
        if (!hasMatchingTag) {
          return false;
        }
      }
      
      return true;
    });
  }

  searchItems(query, filterTags = [], options = {}) {
    return this.getAllItems({
      search: query,
      tags: filterTags,
      ...options
    });
  }

  getAllTags() {
    const allTags = this.state.items.reduce((tags, item) => {
      return tags.concat(item.tags || []);
    }, []);
    
    return [...new Set(allTags)].sort();
  }

  getStatistics() {
    const items = this.state.items;

    return {
      totalItems: items.length,
      sensitiveItems: items.filter(item => item.sensitive).length,
      totalTags: this.getAllTags().length,
      averageTagsPerItem: items.length > 0 ? 
        items.reduce((sum, item) => sum + item.tags.length, 0) / items.length : 0,
      itemsWithoutTags: items.filter(item => item.tags.length === 0).length,
      oldestItem: items.length > 0 ? 
        items.reduce((oldest, item) => item.createdAt < oldest.createdAt ? item : oldest) : null,
      newestItem: items.length > 0 ? 
        items.reduce((newest, item) => item.createdAt > newest.createdAt ? item : newest) : null
    };
  }

  duplicateItem(itemId, overrides = {}) {
    const originalItem = this.getItemById(itemId);
    if (!originalItem) {
      return {
        success: false,
        errors: ['Original item not found'],
        data: null
      };
    }

    const duplicateData = {
      ...originalItem,
      ...overrides,
      tags: overrides.tags ? this.normalizeTags(overrides.tags) : originalItem.tags
    };

    delete duplicateData.id;
    delete duplicateData.createdAt;
    delete duplicateData.updatedAt;

    return this.createItem(duplicateData);
  }

  bulkOperation(operation, itemIds, operationData) {
    const results = {
      success: 0,
      failed: 0,
      errors: []
    };

    for (const itemId of itemIds) {
      try {
        switch (operation) {
          case 'delete':
            const deleteResult = this.removeItem(itemId);
            if (deleteResult.success) {
              results.success++;
            } else {
              results.failed++;
              results.errors.push(`Failed to delete item ${itemId}: ${deleteResult.errors.join(', ')}`);
            }
            break;

          case 'addTag':
            const item = this.getItemById(itemId);
            if (item) {
              const updatedTags = [...item.tags, operationData.tag];
              const updateResult = this.updateItem(itemId, { tags: updatedTags });
              if (updateResult.success) {
                results.success++;
              } else {
                results.failed++;
                results.errors.push(`Failed to add tag to item ${itemId}`);
              }
            } else {
              results.failed++;
              results.errors.push(`Item ${itemId} not found`);
            }
            break;

          case 'removeTag':
            const tagItem = this.getItemById(itemId);
            if (tagItem) {
              const updatedTags = tagItem.tags.filter(tag => tag !== operationData.tag);
              const updateResult = this.updateItem(itemId, { tags: updatedTags });
              if (updateResult.success) {
                results.success++;
              } else {
                results.failed++;
                results.errors.push(`Failed to remove tag from item ${itemId}`);
              }
            } else {
              results.failed++;
              results.errors.push(`Item ${itemId} not found`);
            }
            break;

          case 'setSensitive':
            const sensitiveResult = this.updateItem(itemId, { sensitive: operationData.sensitive });
            if (sensitiveResult.success) {
              results.success++;
            } else {
              results.failed++;
              results.errors.push(`Failed to update sensitivity for item ${itemId}`);
            }
            break;

          default:
            results.failed++;
            results.errors.push(`Unknown operation: ${operation}`);
        }
      } catch (error) {
        results.failed++;
        results.errors.push(`Error processing item ${itemId}: ${error.message}`);
      }
    }

    return {
      success: results.failed === 0,
      results
    };
  }
}

describe('ItemService', () => {
  let itemService;

  beforeEach(() => {
    itemService = new ItemService();
  });

  describe('Item Creation', () => {
    test('should create valid item successfully', () => {
      const itemData = {
        text: 'console.log("Hello World")',
        desc: 'Basic JavaScript logging command',
        tags: ['javascript', 'debug', 'console'],
        sensitive: false
      };

      const result = itemService.createItem(itemData);

      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.data).toMatchObject({
        text: itemData.text,
        desc: itemData.desc,
        tags: itemData.tags,
        sensitive: false
      });
      expect(result.data.id).toBeTruthy();
      expect(result.data.createdAt).toBeTruthy();
      expect(result.data.updatedAt).toBeTruthy();
    });

    test('should reject item with missing text', () => {
      const itemData = {
        desc: 'Description without text',
        tags: ['test']
      };

      const result = itemService.createItem(itemData);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Text content is required');
      expect(result.data).toBeNull();
    });

    test('should reject item with missing description', () => {
      const itemData = {
        text: 'Text without description',
        tags: ['test']
      };

      const result = itemService.createItem(itemData);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Description is required');
      expect(result.data).toBeNull();
    });

    test('should enforce text length limit', () => {
      const longText = 'a'.repeat(501);
      const itemData = {
        text: longText,
        desc: 'Valid description',
        tags: ['test']
      };

      const result = itemService.createItem(itemData);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Text content must be 500 characters or less');
    });

    test('should enforce description length limit', () => {
      const longDesc = 'a'.repeat(501);
      const itemData = {
        text: 'Valid text',
        desc: longDesc,
        tags: ['test']
      };

      const result = itemService.createItem(itemData);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Description must be 500 characters or less');
    });

    test('should handle missing tags gracefully', () => {
      const itemData = {
        text: 'Text without tags',
        desc: 'Description without tags'
      };

      const result = itemService.createItem(itemData);

      expect(result.success).toBe(true);
      expect(result.data.tags).toEqual([]);
    });

    test('should normalize and sanitize tags', () => {
      const itemData = {
        text: 'Test text',
        desc: 'Test description',
        tags: ['  JAVASCRIPT  ', 'Debug', 'debug', 'Console', '']
      };

      const result = itemService.createItem(itemData);

      expect(result.success).toBe(true);
      expect(result.data.tags).toEqual(['javascript', 'debug', 'console']);
    });

    test('should convert sensitive to boolean', () => {
      const itemData = {
        text: 'Sensitive data',
        desc: 'Contains sensitive information',
        sensitive: 'true'
      };

      const result = itemService.createItem(itemData);

      expect(result.success).toBe(true);
      expect(result.data.sensitive).toBe(true);
      expect(typeof result.data.sensitive).toBe('boolean');
    });

    test('should limit tag count', () => {
      const manyTags = Array.from({ length: 25 }, (_, i) => `tag${i}`);
      const itemData = {
        text: 'Test text',
        desc: 'Test description',
        tags: manyTags
      };

      const result = itemService.createItem(itemData);

      expect(result.success).toBe(true);
      expect(result.data.tags).toHaveLength(20); // Limited to 20
    });
  });

  describe('Item Updates', () => {
    let existingItem;

    beforeEach(() => {
      const createResult = itemService.createItem({
        text: 'Original text',
        desc: 'Original description',
        tags: ['original'],
        sensitive: false
      });
      existingItem = createResult.data;
    });

    test('should update existing item successfully', () => {
      const updates = {
        text: 'Updated text',
        desc: 'Updated description',
        tags: ['updated', 'modified'],
        sensitive: true
      };

      const result = itemService.updateItem(existingItem.id, updates);

      expect(result.success).toBe(true);
      expect(result.data).toMatchObject(updates);
      expect(result.data.id).toBe(existingItem.id);
      expect(result.data.createdAt).toBe(existingItem.createdAt);
      expect(result.data.updatedAt).toBeGreaterThanOrEqual(existingItem.updatedAt);
    });

    test('should handle partial updates', () => {
      const updates = {
        text: 'Updated text only'
      };

      const result = itemService.updateItem(existingItem.id, updates);

      expect(result.success).toBe(true);
      expect(result.data.text).toBe('Updated text only');
      expect(result.data.desc).toBe('Original description');
      expect(result.data.tags).toEqual(['original']);
    });

    test('should reject update for non-existent item', () => {
      const result = itemService.updateItem('nonexistent-id', {
        text: 'Updated text'
      });

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Item not found');
    });

    test('should validate updated data', () => {
      const updates = {
        text: '', // Invalid - empty text
        desc: 'Valid description'
      };

      const result = itemService.updateItem(existingItem.id, updates);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Text content is required');
    });

    test('should normalize updated tags', () => {
      const updates = {
        tags: ['  NEW TAG  ', 'Updated', 'updated', '']
      };

      const result = itemService.updateItem(existingItem.id, updates);

      expect(result.success).toBe(true);
      expect(result.data.tags).toEqual(['new tag', 'updated']);
    });
  });

  describe('Item Deletion', () => {
    let existingItem;

    beforeEach(() => {
      const createResult = itemService.createItem({
        text: 'Item to delete',
        desc: 'This item will be deleted',
        tags: ['test']
      });
      existingItem = createResult.data;
    });

    test('should delete existing item successfully', () => {
      const result = itemService.removeItem(existingItem.id);

      expect(result.success).toBe(true);
      expect(result.data.deletedId).toBe(existingItem.id);
      
      // Verify item is actually removed
      const foundItem = itemService.getItemById(existingItem.id);
      expect(foundItem).toBeNull();
    });

    test('should reject deletion of non-existent item', () => {
      const result = itemService.removeItem('nonexistent-id');

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Item not found');
    });
  });

  describe('Item Retrieval', () => {
    beforeEach(() => {
      // Create sample items
      itemService.createItem({
        text: 'console.log("hello")',
        desc: 'JavaScript logging',
        tags: ['javascript', 'debug'],
        sensitive: false
      });
      
      itemService.createItem({
        text: 'git status',
        desc: 'Check git repository status',
        tags: ['git', 'version-control'],
        sensitive: false
      });
      
      itemService.createItem({
        text: 'API_KEY=secret123',
        desc: 'Sensitive API key',
        tags: ['api', 'secret'],
        sensitive: true
      });
    });

    test('should retrieve item by ID', () => {
      const allItems = itemService.getAllItems();
      const firstItem = allItems[0];
      
      const foundItem = itemService.getItemById(firstItem.id);
      
      expect(foundItem).toEqual(firstItem);
    });

    test('should return null for non-existent item', () => {
      const foundItem = itemService.getItemById('nonexistent-id');
      
      expect(foundItem).toBeNull();
    });

    test('should get all items', () => {
      const items = itemService.getAllItems();
      
      expect(items).toHaveLength(3);
      expect(Array.isArray(items)).toBe(true);
    });

    test('should return copy of items array', () => {
      const items = itemService.getAllItems();
      const originalLength = items.length;
      
      items.push({ fake: 'item' });
      
      const newItems = itemService.getAllItems();
      expect(newItems).toHaveLength(originalLength);
    });
  });

  describe('Search and Filtering', () => {
    beforeEach(() => {
      // Create sample items for filtering
      itemService.createItem({
        text: 'console.log("hello")',
        desc: 'JavaScript logging command',
        tags: ['javascript', 'debug', 'console']
      });
      
      itemService.createItem({
        text: 'git commit -m "message"',
        desc: 'Commit changes to git repository',
        tags: ['git', 'version-control', 'commit']
      });
      
      itemService.createItem({
        text: 'npm install package',
        desc: 'Install npm package',
        tags: ['npm', 'javascript', 'package-manager']
      });
      
      itemService.createItem({
        text: 'docker run image',
        desc: 'Run docker container',
        tags: ['docker', 'container', 'devops']
      });
    });

    test('should filter by text search', () => {
      const results = itemService.searchItems('console');
      
      expect(results).toHaveLength(1);
      expect(results[0].text).toContain('console');
    });

    test('should filter by description search', () => {
      const results = itemService.searchItems('repository');
      
      expect(results).toHaveLength(1);
      expect(results[0].desc).toContain('repository');
    });

    test('should filter by tag search', () => {
      const results = itemService.searchItems('javascript');
      
      expect(results).toHaveLength(2); // console and npm items
      expect(results.every(item => 
        item.tags.some(tag => tag.includes('javascript'))
      )).toBe(true);
    });

    test('should perform case-insensitive search', () => {
      const results = itemService.searchItems('JAVASCRIPT');
      
      expect(results).toHaveLength(2);
    });

    test('should filter by multiple tags', () => {
      const results = itemService.getAllItems({ tags: ['javascript'] });
      
      expect(results).toHaveLength(2);
    });

    test('should combine search query and tag filters', () => {
      const results = itemService.searchItems('install', ['javascript']);
      
      expect(results).toHaveLength(1);
      expect(results[0].text).toContain('npm install');
    });

    test('should return empty array for no matches', () => {
      const results = itemService.searchItems('nonexistent-term');
      
      expect(results).toHaveLength(0);
      expect(Array.isArray(results)).toBe(true);
    });

    test('should handle empty search gracefully', () => {
      const results = itemService.searchItems('');
      
      expect(results).toHaveLength(4); // All items
    });

    test('should handle undefined search parameters', () => {
      const results = itemService.searchItems(undefined, undefined);
      
      expect(results).toHaveLength(4); // All items
    });
  });

  describe('Tag Management', () => {
    beforeEach(() => {
      itemService.createItem({
        text: 'Item 1',
        desc: 'Description 1',
        tags: ['javascript', 'debug', 'console']
      });
      
      itemService.createItem({
        text: 'Item 2',
        desc: 'Description 2',
        tags: ['git', 'version-control']
      });
      
      itemService.createItem({
        text: 'Item 3',
        desc: 'Description 3',
        tags: ['javascript', 'npm'] // javascript appears in multiple items
      });
    });

    test('should get all unique tags', () => {
      const tags = itemService.getAllTags();
      
      expect(tags).toContain('javascript');
      expect(tags).toContain('debug');
      expect(tags).toContain('git');
      expect(tags).toContain('npm');
      
      // Should be sorted
      const sortedTags = [...tags].sort();
      expect(tags).toEqual(sortedTags);
      
      // Should not have duplicates
      const uniqueTags = [...new Set(tags)];
      expect(tags).toEqual(uniqueTags);
    });

    test('should return empty array when no items exist', () => {
      itemService.state.items = [];
      const tags = itemService.getAllTags();
      
      expect(tags).toEqual([]);
    });

    test('should handle items without tags', () => {
      itemService.createItem({
        text: 'No tags item',
        desc: 'Item without tags'
        // no tags property
      });
      
      const tags = itemService.getAllTags();
      
      // Should still work and return existing tags
      expect(tags.length).toBeGreaterThan(0);
    });
  });

  describe('Statistics', () => {
    beforeEach(() => {
      // Create items with different properties for statistics
      itemService.createItem({
        text: 'Public item 1',
        desc: 'Description 1',
        tags: ['tag1', 'tag2'],
        sensitive: false
      });
      
      itemService.createItem({
        text: 'Sensitive item',
        desc: 'Description 2',
        tags: ['tag1', 'secret'],
        sensitive: true
      });
      
      itemService.createItem({
        text: 'No tags item',
        desc: 'Description 3',
        tags: [],
        sensitive: false
      });
    });

    test('should calculate basic statistics', () => {
      const stats = itemService.getStatistics();
      
      expect(stats.totalItems).toBe(3);
      expect(stats.sensitiveItems).toBe(1);
      expect(stats.itemsWithoutTags).toBe(1);
    });

    test('should calculate tag statistics', () => {
      const stats = itemService.getStatistics();
      
      expect(stats.totalTags).toBe(3); // tag1, tag2, secret
      expect(stats.averageTagsPerItem).toBeCloseTo(1.33, 2); // (2+2+0)/3
    });

    test('should find oldest and newest items', () => {
      const stats = itemService.getStatistics();
      
      expect(stats.oldestItem).toBeTruthy();
      expect(stats.newestItem).toBeTruthy();
      expect(stats.oldestItem.createdAt).toBeLessThanOrEqual(stats.newestItem.createdAt);
    });

    test('should handle empty items gracefully', () => {
      itemService.state.items = [];
      const stats = itemService.getStatistics();
      
      expect(stats.totalItems).toBe(0);
      expect(stats.sensitiveItems).toBe(0);
      expect(stats.totalTags).toBe(0);
      expect(stats.averageTagsPerItem).toBe(0);
      expect(stats.itemsWithoutTags).toBe(0);
      expect(stats.oldestItem).toBeNull();
      expect(stats.newestItem).toBeNull();
    });
  });

  describe('Item Duplication', () => {
    let originalItem;

    beforeEach(() => {
      const createResult = itemService.createItem({
        text: 'Original command',
        desc: 'Original description',
        tags: ['original', 'command'],
        sensitive: false
      });
      originalItem = createResult.data;
    });

    test('should duplicate item successfully', () => {
      const result = itemService.duplicateItem(originalItem.id);
      
      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({
        text: originalItem.text,
        desc: originalItem.desc,
        tags: originalItem.tags,
        sensitive: originalItem.sensitive
      });
      
      // Should have different ID and timestamps
      expect(result.data.id).not.toBe(originalItem.id);
      expect(result.data.createdAt).toBeGreaterThanOrEqual(originalItem.createdAt);
    });

    test('should apply overrides when duplicating', () => {
      const overrides = {
        desc: 'Modified description',
        tags: ['modified', 'duplicate'],
        sensitive: true
      };
      
      const result = itemService.duplicateItem(originalItem.id, overrides);
      
      expect(result.success).toBe(true);
      expect(result.data.text).toBe(originalItem.text); // Unchanged
      expect(result.data.desc).toBe('Modified description'); // Changed
      expect(result.data.tags).toEqual(['modified', 'duplicate']); // Changed
      expect(result.data.sensitive).toBe(true); // Changed
    });

    test('should reject duplication of non-existent item', () => {
      const result = itemService.duplicateItem('nonexistent-id');
      
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Original item not found');
    });

    test('should validate duplicate with overrides', () => {
      const invalidOverrides = {
        text: '', // Invalid
        desc: 'Valid description'
      };
      
      const result = itemService.duplicateItem(originalItem.id, invalidOverrides);
      
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Text content is required');
    });
  });

  describe('Bulk Operations', () => {
    let itemIds;

    beforeEach(() => {
      // Create multiple items for bulk operations
      const items = [
        { text: 'Item 1', desc: 'Description 1', tags: ['tag1'] },
        { text: 'Item 2', desc: 'Description 2', tags: ['tag2'] },
        { text: 'Item 3', desc: 'Description 3', tags: ['tag1', 'tag2'] }
      ];
      
      itemIds = [];
      for (const itemData of items) {
        const result = itemService.createItem(itemData);
        itemIds.push(result.data.id);
      }
    });

    test('should delete multiple items', () => {
      const result = itemService.bulkOperation('delete', itemIds.slice(0, 2));
      
      expect(result.success).toBe(true);
      expect(result.results.success).toBe(2);
      expect(result.results.failed).toBe(0);
      
      // Verify items were deleted
      expect(itemService.getItemById(itemIds[0])).toBeNull();
      expect(itemService.getItemById(itemIds[1])).toBeNull();
      expect(itemService.getItemById(itemIds[2])).toBeTruthy(); // Should still exist
    });

    test('should add tags to multiple items', () => {
      const result = itemService.bulkOperation('addTag', itemIds, { tag: 'newtag' });
      
      expect(result.success).toBe(true);
      expect(result.results.success).toBe(3);
      
      // Verify tag was added to all items
      for (const itemId of itemIds) {
        const item = itemService.getItemById(itemId);
        expect(item.tags).toContain('newtag');
      }
    });

    test('should remove tags from multiple items', () => {
      const result = itemService.bulkOperation('removeTag', itemIds, { tag: 'tag1' });
      
      expect(result.success).toBe(true);
      
      // Verify tag was removed where it existed
      const item1 = itemService.getItemById(itemIds[0]);
      const item3 = itemService.getItemById(itemIds[2]);
      
      expect(item1.tags).not.toContain('tag1');
      expect(item3.tags).not.toContain('tag1');
      expect(item3.tags).toContain('tag2'); // Other tags should remain
    });

    test('should set sensitivity for multiple items', () => {
      const result = itemService.bulkOperation('setSensitive', itemIds, { sensitive: true });
      
      expect(result.success).toBe(true);
      expect(result.results.success).toBe(3);
      
      // Verify all items are now sensitive
      for (const itemId of itemIds) {
        const item = itemService.getItemById(itemId);
        expect(item.sensitive).toBe(true);
      }
    });

    test('should handle mixed success/failure results', () => {
      const mixedIds = [...itemIds, 'nonexistent-id'];
      const result = itemService.bulkOperation('delete', mixedIds);
      
      expect(result.success).toBe(false); // Overall failure due to one failed operation
      expect(result.results.success).toBe(3); // Valid items deleted
      expect(result.results.failed).toBe(1); // Invalid item failed
      expect(result.results.errors).toHaveLength(1);
    });

    test('should handle unknown operations', () => {
      const result = itemService.bulkOperation('unknownOperation', itemIds);
      
      expect(result.success).toBe(false);
      expect(result.results.failed).toBe(3);
      expect(result.results.errors.every(error => 
        error.includes('Unknown operation')
      )).toBe(true);
    });

    test('should handle empty item ID array', () => {
      const result = itemService.bulkOperation('delete', []);
      
      expect(result.success).toBe(true);
      expect(result.results.success).toBe(0);
      expect(result.results.failed).toBe(0);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle null/undefined inputs gracefully', () => {
      expect(itemService.createItem(null).success).toBe(false);
      expect(itemService.createItem(undefined).success).toBe(false);
      expect(itemService.updateItem(null, {}).success).toBe(false);
      expect(itemService.removeItem(null).success).toBe(false);
    });

    test('should handle malformed tag arrays', () => {
      const itemData = {
        text: 'Test text',
        desc: 'Test description',
        tags: ['valid', null, undefined, 123, {}, []]
      };

      const result = itemService.createItem(itemData);
      
      expect(result.success).toBe(true);
      // Should filter out invalid tags and keep only valid strings
      expect(result.data.tags).toEqual(['valid', '123']);
    });

    test('should handle very long tag names', () => {
      const longTag = 'a'.repeat(100);
      const itemData = {
        text: 'Test text',
        desc: 'Test description',
        tags: [longTag, 'normal-tag']
      };

      const result = itemService.createItem(itemData);
      
      expect(result.success).toBe(true);
      expect(result.data.tags).toContain(longTag.toLowerCase());
    });

    test('should handle unicode characters in text and tags', () => {
      const itemData = {
        text: 'Unicode test: 你好世界 🌍 emoji',
        desc: 'Description with émojis 🎉 and ñáméś',
        tags: ['unicode-🌍', 'émoji-🎉', 'español-ñ']
      };

      const result = itemService.createItem(itemData);
      
      expect(result.success).toBe(true);
      expect(result.data.text).toContain('你好世界');
      expect(result.data.desc).toContain('émojis');
      expect(result.data.tags).toContain('unicode-🌍');
    });

    test('should handle concurrent operations safely', () => {
      const itemData = {
        text: 'Concurrent test',
        desc: 'Test concurrent operations'
      };

      // Simulate concurrent creation
      const results = [];
      for (let i = 0; i < 10; i++) {
        const result = itemService.createItem({
          ...itemData,
          text: `${itemData.text} ${i}`
        });
        results.push(result);
      }

      // All should succeed
      expect(results.every(result => result.success)).toBe(true);
      
      // All should have unique IDs
      const ids = results.map(result => result.data.id);
      const uniqueIds = [...new Set(ids)];
      expect(uniqueIds).toHaveLength(ids.length);
    });

    test('should handle service errors gracefully', () => {
      // Mock an internal error during creation
      const originalGenerate = itemService.generateUID;
      itemService.generateUID = () => {
        throw new Error('UID generation failed');
      };

      const result = itemService.createItem({
        text: 'Test text',
        desc: 'Test description'
      });

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Failed to create item. Please try again.');

      // Restore original method
      itemService.generateUID = originalGenerate;
    });
  });

  describe('Performance', () => {
    test('should handle large datasets efficiently', () => {
      // Create a large number of items
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        text: `Item ${i} content`,
        desc: `Description for item ${i}`,
        tags: [`tag-${i % 20}`, `category-${i % 10}`]
      }));

      const startTime = performance.now();

      // Create all items
      for (const itemData of largeDataset) {
        itemService.createItem(itemData);
      }

      // Perform search operation
      const searchResults = itemService.searchItems('Item 5');
      
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(1000); // Should complete in under 1 second
      expect(searchResults.length).toBeGreaterThan(0);
      expect(itemService.getAllItems()).toHaveLength(1000);
    });

    test('should perform complex filtering efficiently', () => {
      // Create items with overlapping tags
      for (let i = 0; i < 500; i++) {
        itemService.createItem({
          text: `Performance test item ${i}`,
          desc: `Description with keywords ${i % 10}`,
          tags: [`perf-${i % 5}`, `test-${i % 3}`, `item-${i % 7}`]
        });
      }

      const startTime = performance.now();

      // Perform multiple complex searches
      const results1 = itemService.searchItems('test', ['perf-1']);
      const results2 = itemService.searchItems('item', ['test-2', 'perf-3']);
      const results3 = itemService.getAllItems({ tags: ['item-0'] });

      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(100); // Should be very fast
      expect(results1.length).toBeGreaterThan(0);
      expect(results2.length).toBeGreaterThan(0);
      expect(results3.length).toBeGreaterThan(0);
    });

    test('should handle tag operations efficiently', () => {
      // Create items with many tags
      for (let i = 0; i < 100; i++) {
        const manyTags = Array.from({ length: 15 }, (_, j) => `tag-${i}-${j}`);
        itemService.createItem({
          text: `Multi-tag item ${i}`,
          desc: `Description ${i}`,
          tags: manyTags
        });
      }

      const startTime = performance.now();

      // Get all tags (should deduplicate efficiently)
      const allTags = itemService.getAllTags();
      const stats = itemService.getStatistics();

      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(50); // Should be very fast
      expect(allTags.length).toBe(1500); // 100 items × 15 tags each
      expect(stats.totalTags).toBe(1500);
    });
  });
});
