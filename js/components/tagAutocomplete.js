/**
 * Tag Autocomplete Component for Compy 2.0
 * 
 * This component provides autocomplete functionality for tag input fields,
 * showing suggestions based on existing tags in the system. It includes
 * keyboard navigation, mouse interaction, and filtering capabilities.
 * 
 * Features:
 * - Case-insensitive filtering with startsWith prioritization
 * - Keyboard navigation (Up/Down, Enter, Escape)
 * - Mouse hover and click support
 * - Deduplication of already applied tags
 * - Theme-aware styling
 * - Accessibility support
 * 
 * @fileoverview Tag autocomplete functionality with dropdown suggestions
 * @version 1.0
 * @author Compy Team
 * @since 2025
 */

import { $, $$, escapeHtml, getAllTags, debounce } from '../utils.js';
import { getState } from '../state.js';

/**
 * TagAutocomplete manages tag input with autocomplete dropdown functionality
 * 
 * This class handles the display and interaction of tag suggestions, providing
 * a smooth user experience for adding tags with autocomplete functionality.
 * 
 * @class TagAutocomplete
 * @example
 * const autocomplete = new TagAutocomplete('#tagEntry', {
 *   onTagSelect: (tag) => console.log('Selected:', tag),
 *   getExistingTags: () => ['javascript', 'python', 'git']
 * });
 */
export class TagAutocomplete {
  /**
   * Initialize the tag autocomplete component
   * 
   * @param {string} inputSelector - CSS selector for the input element
   * @param {Object} options - Configuration options
   * @param {Function} options.onTagSelect - Callback when a tag is selected
   * @param {Function} options.getExistingTags - Function to get current tags on the item
   * @param {number} [options.maxSuggestions=8] - Maximum number of suggestions to show
   * @param {number} [options.minChars=1] - Minimum characters before showing suggestions
   * @param {number} [options.debounceMs=150] - Debounce delay for input events
   */
  constructor(inputSelector, options = {}) {
    this.inputElement = $(inputSelector);
    if (!this.inputElement) {
      throw new Error(`Tag autocomplete input not found: ${inputSelector}`);
    }

    // Configuration options
    this.options = {
      onTagSelect: () => {},
      getExistingTags: () => [],
      maxSuggestions: 8,
      minChars: 1,
      debounceMs: 150,
      ...options
    };

    // State
    this.isVisible = false;
    this.suggestions = [];
    this.selectedIndex = -1;
    this.dropdownElement = null;

    // Bind methods
    this.handleInput = this.handleInput.bind(this);
    this.handleKeydown = this.handleKeydown.bind(this);
    this.handleDocumentClick = this.handleDocumentClick.bind(this);
    this.show = this.show.bind(this);
    this.hide = this.hide.bind(this);
    this.selectSuggestion = this.selectSuggestion.bind(this);

    // Create debounced input handler
    this.debouncedHandleInput = debounce(this.handleInput, this.options.debounceMs);

    // Initialize
    this.init();
  }

  /**
   * Initialize the autocomplete functionality
   * @private
   */
  init() {
    this.createDropdown();
    this.attachEventListeners();
  }

  /**
   * Create the dropdown element for suggestions
   * @private
   */
  createDropdown() {
    this.dropdownElement = document.createElement('div');
    this.dropdownElement.className = 'tag-autocomplete-dropdown';
    this.dropdownElement.setAttribute('role', 'listbox');
    this.dropdownElement.setAttribute('aria-label', 'Tag suggestions');
    this.dropdownElement.style.display = 'none';

    // Position dropdown relative to input
    const inputContainer = this.inputElement.closest('.tags-input') || this.inputElement.parentElement;
    inputContainer.style.position = 'relative';
    inputContainer.appendChild(this.dropdownElement);
  }

  /**
   * Attach event listeners
   * @private
   */
  attachEventListeners() {
    this.inputElement.addEventListener('input', this.debouncedHandleInput);
    this.inputElement.addEventListener('keydown', this.handleKeydown);
    this.inputElement.addEventListener('focus', this.debouncedHandleInput);
    document.addEventListener('click', this.handleDocumentClick);
  }

  /**
   * Remove event listeners and cleanup
   */
  destroy() {
    this.inputElement.removeEventListener('input', this.debouncedHandleInput);
    this.inputElement.removeEventListener('keydown', this.handleKeydown);
    this.inputElement.removeEventListener('focus', this.debouncedHandleInput);
    document.removeEventListener('click', this.handleDocumentClick);
    
    if (this.dropdownElement) {
      this.dropdownElement.remove();
    }
  }

  /**
   * Handle input events and update suggestions
   * @param {Event} e - Input event
   * @private
   */
  handleInput(e) {
    const query = e.target.value.trim().toLowerCase();
    
    if (query.length < this.options.minChars) {
      this.hide();
      return;
    }

    const suggestions = this.getSuggestions(query);
    this.updateSuggestions(suggestions);
    
    if (suggestions.length > 0) {
      this.show();
    } else {
      this.hide();
    }
  }

  /**
   * Handle keyboard navigation and selection
   * @param {KeyboardEvent} e - Keyboard event
   * @private
   */
  handleKeydown(e) {
    if (!this.isVisible || this.suggestions.length === 0) {
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        this.selectNext();
        break;
      case 'ArrowUp':
        e.preventDefault();
        this.selectPrevious();
        break;
      case 'Enter':
        if (this.selectedIndex >= 0) {
          e.preventDefault();
          this.selectSuggestion(this.selectedIndex);
        }
        break;
      case 'Escape':
        e.preventDefault();
        this.hide();
        break;
      case 'Tab':
        // Allow tab to move to next element, hide dropdown
        this.hide();
        break;
    }
  }

  /**
   * Handle clicks outside dropdown to close it
   * @param {Event} e - Click event
   * @private
   */
  handleDocumentClick(e) {
    if (this.isVisible && !this.dropdownElement.contains(e.target) && e.target !== this.inputElement) {
      this.hide();
    }
  }

  /**
   * Get filtered suggestions based on query
   * @param {string} query - Search query
   * @returns {string[]} Array of matching tag suggestions
   * @private
   */
  getSuggestions(query) {
    const state = getState();
    const allTags = getAllTags(state.items);
    const existingTags = this.options.getExistingTags();
    
    // Filter out tags already applied to the current item
    const availableTags = allTags.filter(tag => 
      !existingTags.includes(tag)
    );

    // Filter and sort suggestions
    const filtered = availableTags.filter(tag => 
      tag.toLowerCase().includes(query)
    );

    // Prioritize startsWith matches over substring matches
    const startsWithMatches = filtered.filter(tag => 
      tag.toLowerCase().startsWith(query)
    );
    const substringMatches = filtered.filter(tag => 
      !tag.toLowerCase().startsWith(query)
    );

    // Combine and limit results
    const combined = [...startsWithMatches, ...substringMatches];
    return combined.slice(0, this.options.maxSuggestions);
  }

  /**
   * Update the dropdown with new suggestions
   * @param {string[]} suggestions - Array of tag suggestions
   * @private
   */
  updateSuggestions(suggestions) {
    this.suggestions = suggestions;
    this.selectedIndex = -1;
    
    this.dropdownElement.innerHTML = '';
    
    if (suggestions.length === 0) {
      return;
    }

    suggestions.forEach((tag, index) => {
      const option = document.createElement('div');
      option.className = 'tag-autocomplete-option';
      option.setAttribute('role', 'option');
      option.setAttribute('aria-selected', 'false');
      option.textContent = tag;
      option.dataset.index = index;
      
      // Add click handler
      option.addEventListener('click', () => this.selectSuggestion(index));
      
      // Add hover handler
      option.addEventListener('mouseenter', () => this.setSelectedIndex(index));
      
      this.dropdownElement.appendChild(option);
    });
  }

  /**
   * Show the suggestions dropdown
   * @private
   */
  show() {
    if (this.isVisible || this.suggestions.length === 0) {
      return;
    }
    
    this.isVisible = true;
    this.dropdownElement.style.display = 'block';
    this.dropdownElement.setAttribute('aria-hidden', 'false');
  }

  /**
   * Hide the suggestions dropdown
   * @private
   */
  hide() {
    if (!this.isVisible) {
      return;
    }
    
    this.isVisible = false;
    this.selectedIndex = -1;
    this.dropdownElement.style.display = 'none';
    this.dropdownElement.setAttribute('aria-hidden', 'true');
    this.updateSelectedAppearance();
  }

  /**
   * Select next suggestion in the list
   * @private
   */
  selectNext() {
    if (this.suggestions.length === 0) return;
    
    this.setSelectedIndex((this.selectedIndex + 1) % this.suggestions.length);
  }

  /**
   * Select previous suggestion in the list
   * @private
   */
  selectPrevious() {
    if (this.suggestions.length === 0) return;
    
    const newIndex = this.selectedIndex <= 0 ? 
      this.suggestions.length - 1 : 
      this.selectedIndex - 1;
    
    this.setSelectedIndex(newIndex);
  }

  /**
   * Set the selected index and update appearance
   * @param {number} index - Index to select
   * @private
   */
  setSelectedIndex(index) {
    this.selectedIndex = index;
    this.updateSelectedAppearance();
  }

  /**
   * Update visual appearance of selected option
   * @private
   */
  updateSelectedAppearance() {
    const options = this.dropdownElement.querySelectorAll('.tag-autocomplete-option');
    
    options.forEach((option, index) => {
      const isSelected = index === this.selectedIndex;
      option.classList.toggle('selected', isSelected);
      option.setAttribute('aria-selected', isSelected.toString());
    });
  }

  /**
   * Select a suggestion by index
   * @param {number} index - Index of suggestion to select
   * @private
   */
  selectSuggestion(index) {
    if (index < 0 || index >= this.suggestions.length) {
      return;
    }
    
    const selectedTag = this.suggestions[index];
    this.options.onTagSelect(selectedTag);
    
    // Clear input and hide dropdown
    this.inputElement.value = '';
    this.hide();
    
    // Focus back to input for continued typing
    this.inputElement.focus();
  }

  /**
   * Programmatically trigger suggestions update
   */
  refresh() {
    if (this.inputElement.value.trim()) {
      this.handleInput({ target: this.inputElement });
    }
  }

  /**
   * Check if dropdown is currently visible
   * @returns {boolean} True if dropdown is visible
   */
  isDropdownVisible() {
    return this.isVisible;
  }
}

/**
 * Factory function to create a tag autocomplete instance
 * 
 * @param {string} inputSelector - CSS selector for the input element
 * @param {Object} options - Configuration options
 * @returns {TagAutocomplete} Configured autocomplete instance
 * 
 * @example
 * import { createTagAutocomplete } from './tagAutocomplete.js';
 * 
 * const autocomplete = createTagAutocomplete('#tagEntry', {
 *   onTagSelect: (tag) => addTagChip(tag),
 *   getExistingTags: () => getTagsFromChips()
 * });
 */
export const createTagAutocomplete = (inputSelector, options = {}) => {
  return new TagAutocomplete(inputSelector, options);
};
