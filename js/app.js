/**
 * Compy 2.0 - Main Application Module
 * Enhanced with better code organization, error handling, and modern JavaScript practices
 */

import { STORAGE_KEYS, UI_CONFIG, ICONS, DEFAULT_THEME } from './constants.js';
import { 
  $, $$, escapeHtml, highlightText, stringHash, downloadFile, 
  parseCSVLine, csvEscape, formatDate, focusElement, 
  getAllTags, filterItems, validateItem, debounce 
} from './utils.js';
import {
  initState, getState, subscribe, updateState, upsertItem,
  deleteItem, updateFilterTags, updateSearch, updateProfile,
  setEditingId, getBackups
} from './state.js';

/**
 * Main Application Class
 */
class CompyApp {
  constructor() {
    this.initialized = false;
    this.clipboard = null;
    this.notifications = null;
    this.modals = null;
    this.theme = null;
    this.search = null;
    this.cards = null;
    this.eventHandlers = new Map();
    
    // Bind methods to maintain context
    this.handleStateChange = this.handleStateChange.bind(this);
    this.handleKeyboardShortcuts = this.handleKeyboardShortcuts.bind(this);
    this.handleModalKeyboard = this.handleModalKeyboard.bind(this);
    this.adjustNavbarHeight = this.adjustNavbarHeight.bind(this);
  }

  /**
   * Initialize the application
   */
  async init() {
    if (this.initialized) return;

    try {
      // Initialize state management
      initState();
      
      // Initialize components
      this.initClipboard();
      this.initNotifications();
      this.initModals();
      this.initTheme();
      this.initSearch();
      this.initCards();
      this.initProfile();
      this.initExport();
      this.initImport();
      this.initBackups();
      this.initEventHandlers();
      
      // Subscribe to state changes
      subscribe(this.handleStateChange);
      
      // Setup keyboard shortcuts
      document.addEventListener('keydown', this.handleKeyboardShortcuts);
      document.addEventListener('keydown', this.handleModalKeyboard);
      
      // Setup responsive navbar
      this.setupResponsiveNavbar();
      
      this.initialized = true;
      console.log('Compy 2.0 initialized successfully');
      
    } catch (error) {
      console.error('Failed to initialize Compy 2.0:', error);
      this.showNotification('Failed to initialize application', 'error');
    }
  }

  /**
   * Handle state changes
   */
  handleStateChange(state) {
    this.renderCards(state);
    this.renderProfile(state);
    this.renderFilterBadge(state);
    this.updateSearchInput(state);
  }

  /**
   * Initialize clipboard functionality
   */
  initClipboard() {
    this.clipboard = {
      /**
       * Copy text to clipboard
       */
      copy: async (text) => {
        try {
          await navigator.clipboard.writeText(text);
          this.showNotification('Copied to clipboard');
        } catch (error) {
          console.warn('Modern clipboard API failed, using fallback:', error);
          this.fallbackCopy(text);
        }
      }
    };
  }

  /**
   * Fallback clipboard copy method
   */
  fallbackCopy(text) {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'absolute';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.select();
      
      const success = document.execCommand('copy');
      document.body.removeChild(textarea);
      
      if (success) {
        this.showNotification('Copied to clipboard');
      } else {
        this.showNotification('Copy failed - please try manually', 'error');
      }
    } catch (error) {
      console.error('Fallback copy also failed:', error);
      this.showNotification('Copy not supported - please copy manually', 'error');
    }
  }

  /**
   * Initialize notification system
   */
  initNotifications() {
    const snackbar = $('#snackbar');
    
    this.notifications = {
      show: (message, type = 'info', duration = UI_CONFIG.snackbarDuration) => {
        snackbar.textContent = message;
        snackbar.className = `snackbar ${type}`;
        snackbar.classList.add('show');
        
        setTimeout(() => {
          snackbar.classList.remove('show');
        }, duration);
      }
    };
  }

  /**
   * Show notification
   */
  showNotification(message, type = 'info') {
    this.notifications.show(message, type);
  }

  /**
   * Initialize modal system
   */
  initModals() {
    this.modals = {
      open: (selector) => {
        const modal = $(selector);
        if (modal) {
          modal.setAttribute('aria-hidden', 'false');
          // Focus first focusable element or close button
          const focusTarget = modal.querySelector('[data-close-modal]') || 
                             modal.querySelector('input, textarea, button');
          focusElement(focusTarget, 100);
        }
      },
      
      close: (selector) => {
        const modal = $(selector);
        if (modal) {
          modal.setAttribute('aria-hidden', 'true');
        }
      }
    };

    // Setup close handlers for all modals
    $$('[data-close-modal]').forEach(button => {
      button.addEventListener('click', (e) => {
        const modal = e.target.closest('.modal');
        if (modal) {
          this.modals.close(`#${modal.id}`);
        }
      });
    });
  }

  /**
   * Initialize theme system
   */
  initTheme() {
    const themeSelect = $('#themeSelect');
    
    this.theme = {
      apply: (themeName) => {
        document.documentElement.setAttribute('data-theme', themeName);
        localStorage.setItem(STORAGE_KEYS.theme, themeName);
        themeSelect.value = themeName;
        
        // Add transition class for smooth theme switching
        document.documentElement.classList.add('theme-switching');
        setTimeout(() => {
          document.documentElement.classList.remove('theme-switching');
        }, 300);
      },
      
      load: () => {
        const savedTheme = localStorage.getItem(STORAGE_KEYS.theme) || DEFAULT_THEME;
        this.theme.apply(savedTheme);
      }
    };

    // Load saved theme
    this.theme.load();

    // Handle theme changes
    themeSelect.addEventListener('change', (e) => {
      this.theme.apply(e.target.value);
    });
  }

  /**
   * Initialize search functionality
   */
  initSearch() {
    const searchInput = $('#searchInput');
    const searchClear = $('#searchClear');
    
    this.search = {
      focus: () => {
        searchInput.focus();
      },
      
      clear: () => {
        searchInput.value = '';
        updateSearch('');
      }
    };

    // Handle search input
    searchInput.addEventListener('input', debounce((e) => {
      updateSearch(e.target.value);
    }, 150));

    // Handle clear button
    searchClear.addEventListener('click', this.search.clear);
  }

  /**
   * Update search input from state
   */
  updateSearchInput(state) {
    const searchInput = $('#searchInput');
    if (searchInput.value !== state.search) {
      searchInput.value = state.search;
    }
  }

  /**
   * Initialize card rendering system
   */
  initCards() {
    const cardsContainer = $('#cards');
    
    this.cards = {
      render: (items, search = '') => {
        this.renderCards({ items, search });
      },
      
      showSkeleton: () => {
        cardsContainer.innerHTML = '';
        const skeletonCount = Math.min(UI_CONFIG.skeletonCount, 6);
        
        for (let i = 0; i < skeletonCount; i++) {
          const skeleton = document.createElement('div');
          skeleton.className = 'skel-card skeleton';
          skeleton.setAttribute('aria-hidden', 'true');
          cardsContainer.appendChild(skeleton);
        }
      }
    };

    // Handle add button
    $('#addBtn').addEventListener('click', () => this.openItemModal());
  }

  /**
   * Render cards based on current state
   */
  renderCards(state) {
    const container = $('#cards');
    const filteredItems = filterItems(state.items, state.search, state.filterTags);
    
    // Use animation frame for smooth rendering
    requestAnimationFrame(() => {
      container.innerHTML = '';
      
      // Handle empty states
      if (state.items.length === 0) {
        this.renderEmptyState(container, 'welcome');
        return;
      }
      
      if (filteredItems.length === 0) {
        this.renderEmptyState(container, 'no-results', { 
          hasSearch: !!state.search?.trim(),
          hasFilters: state.filterTags.length > 0
        });
        return;
      }

      // Remove empty state class
      container.classList.remove('empty-state');
      
      // Render cards
      filteredItems.forEach(item => {
        container.appendChild(this.createCardElement(item, state.search));
      });
    });
  }

  /**
   * Create a card element
   */
  createCardElement(item, searchQuery = '') {
    const card = document.createElement('article');
    card.className = 'card';
    card.tabIndex = 0;
    
    const displayText = item.sensitive ? '••••••••••' : escapeHtml(item.text);
    const highlightedText = highlightText(displayText, searchQuery);
    const highlightedDesc = highlightText(escapeHtml(item.desc), searchQuery);
    
    card.innerHTML = `
      <div class="actions" aria-label="Card actions">
        <button class="icon-btn" data-act="edit" title="Edit snippet" aria-label="Edit snippet">
          ${ICONS.edit}
        </button>
        <button class="icon-btn" data-act="delete" title="Delete snippet" aria-label="Delete snippet">
          ${ICONS.delete}
        </button>
        <button class="icon-btn" data-act="copy" title="Copy to clipboard" aria-label="Copy to clipboard">
          ${ICONS.copy}
        </button>
      </div>
      <div class="title">${highlightedText}</div>
      <div class="desc">${highlightedDesc}</div>
      <div class="tags">${this.renderTags(item.tags, searchQuery)}</div>
    `;

    // Setup event handlers
    this.setupCardEventHandlers(card, item);
    
    return card;
  }

  /**
   * Setup event handlers for a card
   */
  setupCardEventHandlers(card, item) {
    // Click to copy (but not on action buttons)
    card.addEventListener('click', (e) => {
      if (!e.target.closest('.actions')) {
        this.clipboard.copy(item.text);
      }
    });

    // Keyboard support
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.clipboard.copy(item.text);
      }
    });

    // Action buttons
    card.querySelector('[data-act="edit"]').addEventListener('click', () => 
      this.openItemModal(item.id)
    );
    
    card.querySelector('[data-act="delete"]').addEventListener('click', () => 
      this.deleteItem(item.id)
    );
    
    card.querySelector('[data-act="copy"]').addEventListener('click', () => 
      this.clipboard.copy(item.text)
    );
  }

  /**
   * Render tags for a card
   */
  renderTags(tags = [], searchQuery = '') {
    const maxVisible = UI_CONFIG.maxVisibleTags;
    const visibleTags = tags.slice(0, maxVisible);
    const extraCount = tags.length - visibleTags.length;
    
    let html = visibleTags.map(tag => {
      const highlighted = highlightText(escapeHtml(tag), searchQuery);
      const hue = Math.abs(stringHash(tag)) % 360;
      return `<span class="chip" style="--hue: ${hue}">${highlighted}</span>`;
    }).join('');
    
    if (extraCount > 0) {
      html += `<span class="more" data-more-tags title="Show all ${tags.length} tags">+${extraCount} more</span>`;
    }
    
    return html;
  }

  /**
   * Render empty states
   */
  renderEmptyState(container, type, options = {}) {
    container.classList.add('empty-state');
    
    let content = '';
    
    switch (type) {
      case 'welcome':
        content = this.getWelcomeEmptyState();
        break;
      case 'no-results':
        content = this.getNoResultsEmptyState(options);
        break;
    }
    
    container.innerHTML = content;
    this.setupEmptyStateHandlers();
  }

  /**
   * Get welcome empty state HTML
   */
  getWelcomeEmptyState() {
    return `
      <section class="empty">
        <div class="empty-card">
          <div class="hero-icon">📋</div>
          <h1>Welcome to Compy 2.0</h1>
          <p class="lead">Your personal clipboard for commands, snippets, credentials, and frequently used text.</p>
          <div class="empty-actions">
            <button id="emptyAddBtn" class="primary-btn">Add your first snippet</button>
            <button id="emptyImportBtn" class="secondary-btn">Import JSON/CSV</button>
          </div>
          <div class="divider"></div>
          <ul class="empty-tips">
            <li><strong>Search fast</strong> with Ctrl+F or /</li>
            <li><strong>Organize</strong> with tags and filters</li>
            <li><strong>Personalize</strong> with themes and your profile name</li>
          </ul>
        </div>
      </section>
    `;
  }

  /**
   * Get no results empty state HTML
   */
  getNoResultsEmptyState({ hasSearch, hasFilters }) {
    let details = '';
    if (hasSearch && hasFilters) {
      details = 'No items match your search and selected filters.';
    } else if (hasSearch) {
      details = 'No items match your search.';
    } else if (hasFilters) {
      details = 'No items match the selected filters.';
    }

    const searchButton = hasSearch ? 
      '<button id="clearSearchBtn" class="secondary-btn">Clear search</button>' : '';
    const filtersButton = hasFilters ? 
      '<button id="clearFiltersBtn" class="secondary-btn">Clear filters</button>' : '';

    return `
      <section class="empty">
        <div class="empty-card">
          <div class="hero-icon">🔎</div>
          <h2>No results found</h2>
          <p class="lead">${details}</p>
          <div class="empty-actions">
            ${searchButton}
            ${filtersButton}
          </div>
        </div>
      </section>
    `;
  }

  /**
   * Setup empty state event handlers
   */
  setupEmptyStateHandlers() {
    $('#emptyAddBtn')?.addEventListener('click', () => this.openItemModal());
    $('#emptyImportBtn')?.addEventListener('click', () => $('#importFile').click());
    $('#clearSearchBtn')?.addEventListener('click', () => {
      updateSearch('');
      this.search.clear();
    });
    $('#clearFiltersBtn')?.addEventListener('click', () => {
      updateFilterTags([]);
    });
  }

  /**
   * Open item modal for adding or editing
   */
  openItemModal(itemId = null) {
    setEditingId(itemId);
    const state = getState();
    const item = itemId ? state.items.find(i => i.id === itemId) : {
      text: '',
      desc: '',
      sensitive: false,
      tags: []
    };

    // Update modal title
    $('#itemModalTitle').textContent = itemId ? 'Edit Snippet' : 'Add Snippet';

    // Populate form
    $('#itemText').value = item.text;
    $('#itemDesc').value = item.desc;
    $('#itemSensitive').checked = item.sensitive;
    this.setTagChips(item.tags);

    this.modals.open('#itemModal');
    focusElement($('#itemText'), 100);
  }

  /**
   * Delete an item
   */
  deleteItem(itemId) {
    deleteItem(itemId);
    this.showNotification('Snippet deleted');
  }

  /**
   * Initialize profile functionality
   */
  initProfile() {
    $('#profileEditBtn').addEventListener('click', () => {
      const state = getState();
      $('#profileNameInput').value = state.profileName;
      this.modals.open('#profileModal');
      focusElement($('#profileNameInput'), 100);
    });

    $('#profileSaveBtn').addEventListener('click', () => {
      const name = $('#profileNameInput').value.trim();
      updateProfile(name);
      this.modals.close('#profileModal');
      this.showNotification('Profile updated');
    });

    // Handle Enter key in profile input
    $('#profileNameInput').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        $('#profileSaveBtn').click();
      }
    });
  }

  /**
   * Render profile display
   */
  renderProfile(state) {
    const display = $('#profileDisplay');
    display.textContent = state.profileName ? 
      `· ${state.profileName}'s Compy` : '';
  }

  /**
   * Initialize and render filter badge
   */
  renderFilterBadge(state) {
    const badge = $('#filterBadge');
    const count = state.filterTags.length;
    
    if (count > 0) {
      badge.textContent = count;
      badge.hidden = false;
    } else {
      badge.hidden = true;
    }
  }

  /**
   * Initialize export functionality
   */
  initExport() {
    // Export menu handling
    const exportBtn = $('#exportMenuBtn');
    const exportMenu = $('#exportMenu');
    
    exportBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      exportMenu.classList.toggle('open');
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('#exportMenu')) {
        exportMenu.classList.remove('open');
      }
    });

    // Export handlers
    exportMenu.addEventListener('click', (e) => {
      const button = e.target.closest('button');
      if (!button) return;

      exportMenu.classList.remove('open');
      const exportType = button.dataset.export;
      
      if (exportType === 'json') {
        this.exportJSON();
      } else if (exportType === 'csv') {
        this.exportCSV();
      } else if (button.id === 'backupsBtn') {
        this.openBackupsModal();
      }
    });
  }

  /**
   * Export data as JSON
   */
  exportJSON() {
    const state = getState();
    const payload = {
      profileName: state.profileName || '',
      items: state.items
    };
    
    downloadFile(
      'compy-export.json',
      JSON.stringify(payload, null, 2),
      'application/json'
    );
    
    this.showNotification('JSON export downloaded');
  }

  /**
   * Export data as CSV
   */
  exportCSV() {
    const state = getState();
    const rows = [
      ['profileName'],
      [csvEscape(state.profileName || '')],
      [''],
      ['text', 'desc', 'sensitive', 'tags'],
      ...state.items.map(item => [
        csvEscape(item.text),
        csvEscape(item.desc),
        item.sensitive ? '1' : '0',
        csvEscape(item.tags.join('|'))
      ])
    ];
    
    const csv = rows.map(row => row.join(',')).join('\n');
    
    downloadFile('compy-export.csv', csv, 'text/csv');
    this.showNotification('CSV export downloaded');
  }

  /**
   * Initialize import functionality
   */
  initImport() {
    const importFile = $('#importFile');
    
    importFile.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        
        if (file.name.endsWith('.json')) {
          this.importJSON(text);
        } else if (file.name.endsWith('.csv')) {
          this.importCSV(text);
        } else {
          this.showNotification('Unsupported file format', 'error');
        }
      } catch (error) {
        console.error('Import failed:', error);
        this.showNotification('Import failed', 'error');
      } finally {
        importFile.value = ''; // Clear file input
      }
    });
  }

  /**
   * Import JSON data
   */
  importJSON(jsonText) {
    try {
      const parsed = JSON.parse(jsonText);
      let items = [];
      
      if (Array.isArray(parsed)) {
        // Legacy format: array of items
        items = parsed;
      } else if (parsed && typeof parsed === 'object' && Array.isArray(parsed.items)) {
        // New format with profile
        items = parsed.items;
        
        if (typeof parsed.profileName === 'string' && parsed.profileName.trim()) {
          updateProfile(parsed.profileName.trim());
        }
      } else {
        throw new Error('Invalid JSON format');
      }

      let importCount = 0;
      for (const item of items) {
        if (this.addImportedItem(item)) {
          importCount++;
        }
      }

      this.showNotification(`Imported ${importCount} items`);
      
    } catch (error) {
      console.error('JSON import failed:', error);
      this.showNotification('Invalid JSON file', 'error');
    }
  }

  /**
   * Import CSV data
   */
  importCSV(csvText) {
    try {
      const lines = csvText.split(/\r?\n/).filter(line => line.trim());
      if (!lines.length) {
        throw new Error('Empty CSV file');
      }

      // Parse first line (could be profile metadata or headers)
      const firstLine = parseCSVLine(lines[0].replace(/^\uFEFF/, '')); // Remove BOM
      let headerIndex = 0;
      
      // Check for profile metadata
      if (firstLine.length === 1 && firstLine[0].toLowerCase() === 'profilename') {
        const profileLine = lines[1];
        if (profileLine) {
          const profileData = parseCSVLine(profileLine);
          const profileName = (profileData[0] || '').trim();
          if (profileName) {
            updateProfile(profileName);
          }
        }
        headerIndex = 2; // Skip to actual headers
      }

      // Parse headers
      const headerLine = lines[headerIndex];
      if (!headerLine) throw new Error('No headers found');
      
      const headers = parseCSVLine(headerLine).map(h => h.toLowerCase().trim());
      const textIndex = headers.indexOf('text');
      const descIndex = headers.indexOf('desc');
      const sensitiveIndex = headers.indexOf('sensitive');
      const tagsIndex = headers.indexOf('tags');

      if (textIndex === -1 || descIndex === -1) {
        throw new Error('Required columns missing (text, desc)');
      }

      let importCount = 0;
      for (let i = headerIndex + 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const values = parseCSVLine(line);
        const item = {
          text: (values[textIndex] || '').trim(),
          desc: (values[descIndex] || '').trim(),
          sensitive: sensitiveIndex >= 0 ? 
            ['1', 'true'].includes((values[sensitiveIndex] || '').toLowerCase()) : false,
          tags: tagsIndex >= 0 ? 
            (values[tagsIndex] || '').split('|').map(t => t.trim()).filter(Boolean) : []
        };

        if (this.addImportedItem(item)) {
          importCount++;
        }
      }

      this.showNotification(`Imported ${importCount} items`);
      
    } catch (error) {
      console.error('CSV import failed:', error);
      this.showNotification('Invalid CSV file', 'error');
    }
  }

  /**
   * Add an imported item
   */
  addImportedItem(itemData) {
    const validation = validateItem(itemData);
    if (!validation.isValid) {
      console.warn('Skipping invalid item:', validation.errors);
      return false;
    }

    upsertItem({
      text: itemData.text,
      desc: itemData.desc,
      sensitive: !!itemData.sensitive,
      tags: Array.isArray(itemData.tags) ? itemData.tags : []
    });

    return true;
  }

  /**
   * Initialize backup functionality
   */
  initBackups() {
    // Handled in export menu
  }

  /**
   * Open backups modal
   */
  openBackupsModal() {
    const backups = getBackups();
    const list = $('#backupsList');
    list.innerHTML = '';

    if (backups.length === 0) {
      list.innerHTML = '<div class="empty-note">No backups available</div>';
    } else {
      backups.forEach(backup => {
        const button = document.createElement('button');
        const date = formatDate(backup.ts);
        button.textContent = `${date} (${backup.items.length} items)`;
        button.addEventListener('click', () => {
          const filename = `compy-backup-${backup.ts.replace(/[:.]/g, '-')}.json`;
          downloadFile(filename, JSON.stringify(backup.items, null, 2), 'application/json');
        });
        list.appendChild(button);
      });
    }

    this.modals.open('#backupsModal');
  }

  /**
   * Initialize all event handlers
   */
  initEventHandlers() {
    // Brand click - refresh page
    $('#brand').addEventListener('click', () => location.reload());

    // About button
    $('#aboutBtn').addEventListener('click', () => this.modals.open('#aboutModal'));

    // Filter button
    $('#filterBtn').addEventListener('click', () => this.openFilterModal());

    // Item form submission
    $('#saveItemBtn').addEventListener('click', () => this.saveItem());
    $('#itemForm').addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveItem();
    });

    // Clear field buttons
    $$('[data-clear]').forEach(button => {
      button.addEventListener('click', () => {
        const target = $(button.getAttribute('data-clear'));
        if (target) {
          target.value = '';
          target.focus();
        }
      });
    });

    // Tag input handling
    this.initTagInput();

    // More tags modal
    document.addEventListener('click', (e) => {
      const moreButton = e.target.closest('[data-more-tags]');
      if (moreButton) {
        this.showMoreTags(moreButton);
      }
    });
  }

  /**
   * Initialize tag input functionality
   */
  initTagInput() {
    const tagEntry = $('#tagEntry');
    
    tagEntry.addEventListener('keydown', (e) => {
      const value = e.target.value.trim();
      
      if (e.key === 'Enter' && value) {
        e.preventDefault();
        this.addTagChip(value);
        e.target.value = '';
      } else if (e.key === 'Backspace' && !e.target.value) {
        // Remove last tag chip
        const chips = $$('#tagChips .chip');
        const lastChip = chips[chips.length - 1];
        lastChip?.remove();
      }
    });
  }

  /**
   * Set tag chips
   */
  setTagChips(tags) {
    const container = $('#tagChips');
    container.innerHTML = '';
    tags.forEach(tag => this.addTagChip(tag));
  }

  /**
   * Add a tag chip
   */
  addTagChip(tagText) {
    const normalizedTag = tagText.trim();
    if (!normalizedTag) return;

    // Check for duplicates
    const existing = $$('#tagChips .chip').some(chip => 
      chip.dataset.value === normalizedTag
    );
    if (existing) return;

    const chip = document.createElement('span');
    chip.className = 'chip';
    chip.dataset.value = normalizedTag;
    
    const hue = Math.abs(stringHash(normalizedTag)) % 360;
    chip.style.setProperty('--hue', hue);
    
    chip.innerHTML = `
      ${escapeHtml(normalizedTag)} 
      <span class="x" title="Remove tag" aria-label="Remove ${normalizedTag} tag">×</span>
    `;
    
    // Handle removal
    chip.querySelector('.x').addEventListener('click', () => {
      chip.remove();
    });

    $('#tagChips').appendChild(chip);
  }

  /**
   * Get tags from chips
   */
  getTagsFromChips() {
    return $$('#tagChips .chip').map(chip => chip.dataset.value);
  }

  /**
   * Save item from form
   */
  saveItem() {
    const text = $('#itemText').value.trim();
    const desc = $('#itemDesc').value.trim();
    const sensitive = $('#itemSensitive').checked;
    const tags = this.getTagsFromChips();

    const validation = validateItem({ text, desc });
    if (!validation.isValid) {
      this.showNotification(validation.errors[0], 'error');
      return;
    }

    upsertItem({ text, desc, sensitive, tags });
    this.modals.close('#itemModal');
    this.showNotification('Snippet saved');
  }

  /**
   * Open filter modal
   */
  openFilterModal() {
    const state = getState();
    this.renderFilterList(getAllTags(state.items), state.filterTags);
    this.modals.open('#filterModal');
    focusElement($('#filterTagSearch'), 100);
  }

  /**
   * Render filter list
   */
  renderFilterList(allTags, selectedTags, searchQuery = '') {
    const list = $('#filterTagList');
    list.innerHTML = '';

    const filteredTags = searchQuery ? 
      allTags.filter(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())) : 
      allTags;

    if (filteredTags.length === 0) {
      const message = allTags.length === 0 ? 
        'No tags yet. Add tags to items to filter by them.' :
        `No tags match "${escapeHtml(searchQuery)}".`;
      list.innerHTML = `<div class="empty-note">${message}</div>`;
      return;
    }

    filteredTags.forEach(tag => {
      const id = `filter-tag-${tag}`;
      const isSelected = selectedTags.includes(tag);
      
      const label = document.createElement('label');
      label.className = 'list-row';
      label.htmlFor = id;
      
      label.innerHTML = `
        <input 
          id="${id}" 
          type="checkbox" 
          value="${escapeHtml(tag)}"
          ${isSelected ? 'checked' : ''}
        />
        <span>${escapeHtml(tag)}</span>
      `;
      
      list.appendChild(label);
    });
  }

  /**
   * Show more tags modal
   */
  showMoreTags(moreButton) {
    const card = moreButton.closest('.card');
    const cards = Array.from($('#cards').children);
    const cardIndex = cards.indexOf(card);
    const state = getState();
    const filteredItems = filterItems(state.items, state.search, state.filterTags);
    const item = filteredItems[cardIndex];
    
    if (!item) return;

    const list = $('#allTagsList');
    list.innerHTML = '';
    
    item.tags.forEach(tag => {
      const chip = document.createElement('span');
      chip.className = 'chip';
      const hue = Math.abs(stringHash(tag)) % 360;
      chip.style.setProperty('--hue', hue);
      chip.textContent = tag;
      list.appendChild(chip);
    });

    this.modals.open('#moreTagsModal');
  }

  /**
   * Handle keyboard shortcuts
   */
  handleKeyboardShortcuts(e) {
    // Search shortcuts
    if ((e.ctrlKey && e.key.toLowerCase() === 'f') || e.key === '/') {
      e.preventDefault();
      this.search.focus();
      return;
    }

    // Add item shortcut
    if (e.ctrlKey && e.key.toLowerCase() === 'n') {
      e.preventDefault();
      this.openItemModal();
      return;
    }
  }

  /**
   * Handle modal keyboard shortcuts
   */
  handleModalKeyboard(e) {
    if (e.key === 'Escape') {
      // Close any open modal
      const openModal = $('[aria-hidden="false"].modal');
      if (openModal) {
        this.modals.close(`#${openModal.id}`);
      }
    }
  }

  /**
   * Setup responsive navbar
   */
  setupResponsiveNavbar() {
    const adjustHeight = () => {
      const navbar = $('.navbar');
      if (!navbar) return;
      
      const height = navbar.getBoundingClientRect().height;
      document.documentElement.style.setProperty('--nav-h', `${height}px`);
    };

    // Adjust on load and resize
    adjustHeight();
    window.addEventListener('resize', adjustHeight);
    window.addEventListener('load', adjustHeight);
  }

  /**
   * Cleanup resources (for potential future use)
   */
  destroy() {
    // Remove event listeners
    this.eventHandlers.forEach((handler, element) => {
      element.removeEventListener(handler.event, handler.func);
    });
    
    this.eventHandlers.clear();
    this.initialized = false;
  }
}

// Initialize and export the app
let appInstance = null;

/**
 * Initialize the Compy application
 */
export const initializeApp = async () => {
  if (appInstance) return appInstance;
  
  appInstance = new CompyApp();
  await appInstance.init();
  return appInstance;
};

/**
 * Get the current app instance
 */
export const getApp = () => appInstance;
