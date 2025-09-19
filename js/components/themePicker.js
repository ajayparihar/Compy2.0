/**
 * Enhanced Theme Picker Component
 * 
 * Provides a comprehensive interface for selecting and previewing themes with:
 * - Live theme previews
 * - Search and filtering
 * - Accessibility indicators
 * - Smooth transitions
 * - Category organization
 * 
 * @fileoverview Theme picker with accessibility-first design
 * @version 2.0
 * @since 2025
 */

import { THEME_DEFINITIONS, THEME_CATEGORIES, ACCESSIBILITY_LEVELS } from '../themes.js';
import { UI_CONFIG } from '../constants.js';

/**
 * Create and manage the enhanced theme picker component
 */
export function createThemePicker(modalManager, themeManager) {
  const state = {
    searchQuery: '',
    activeCategory: 'all',
    filteredThemes: getAllThemes()
  };

  /**
   * Get all theme entries as array
   */
  function getAllThemes() {
    return Object.entries(THEME_DEFINITIONS).map(([id, theme]) => ({
      id,
      ...theme
    }));
  }

  /**
   * Initialize the theme picker
   */
  function init() {
    const themePickerBtn = document.getElementById('themePickerBtn');
    const modal = document.getElementById('themePickerModal');
    
    if (!themePickerBtn || !modal) {
      console.warn('Theme picker elements not found');
      return;
    }

    // Set up event listeners
    setupEventListeners();
    
    // Render initial theme grid
    renderThemes();
    
    // Update circular theme indicator
    updateThemeIndicator();
    
    if (UI_CONFIG.debug) console.log('Theme picker initialized with', Object.keys(THEME_DEFINITIONS).length, 'themes');
  }

  /**
   * Set up all event listeners
   */
  function setupEventListeners() {
    // Open theme picker
    document.getElementById('themePickerBtn')?.addEventListener('click', openThemePicker);
    
    // Search functionality
    const searchInput = document.getElementById('themeSearch');
    searchInput?.addEventListener('input', handleSearch);
    
    // Clear search
    document.getElementById('themeSearchClear')?.addEventListener('click', clearSearch);
    
    // Category filters
    document.querySelectorAll('.theme-filter').forEach(filter => {
      filter.addEventListener('click', handleCategoryFilter);
    });
    
    // Modal close handling
    document.getElementById('themePickerModal')?.addEventListener('close', handleModalClose);
  }

  /**
   * Open the theme picker modal
   */
  function openThemePicker() {
    renderThemes();
    
    modalManager.open('#themePickerModal', { 
      initialFocus: '#themeSearch',
      onClose: handleModalClose
    });
  }

  /**
   * Handle modal close
   */
  function handleModalClose() {
    // Reset search and filters
    state.searchQuery = '';
    state.activeCategory = 'all';
    const searchInput = document.getElementById('themeSearch');
    if (searchInput) searchInput.value = '';
    
    // Reset filter buttons
    document.querySelectorAll('.theme-filter').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.category === 'all');
      btn.setAttribute('aria-pressed', btn.dataset.category === 'all' ? 'true' : 'false');
    });
    
    renderThemes();
  }

  /**
   * Handle search input
   */
  function handleSearch(event) {
    state.searchQuery = event.target.value.toLowerCase().trim();
    filterAndRenderThemes();
    
    // Show/hide clear button
    const clearBtn = document.getElementById('themeSearchClear');
    if (clearBtn) {
      clearBtn.style.display = state.searchQuery ? 'block' : 'none';
    }
  }

  /**
   * Clear search
   */
  function clearSearch() {
    state.searchQuery = '';
    const searchInput = document.getElementById('themeSearch');
    if (searchInput) searchInput.value = '';
    
    const clearBtn = document.getElementById('themeSearchClear');
    if (clearBtn) clearBtn.style.display = 'none';
    
    filterAndRenderThemes();
    searchInput?.focus();
  }

  /**
   * Handle category filter selection
   */
  function handleCategoryFilter(event) {
    const category = event.target.dataset.category;
    
    // Update filter button states
    document.querySelectorAll('.theme-filter').forEach(btn => {
      const isActive = btn.dataset.category === category;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
    
    state.activeCategory = category;
    filterAndRenderThemes();
  }

  /**
   * Filter themes based on search and category
   */
  function filterAndRenderThemes() {
    const allThemes = getAllThemes();
    
    state.filteredThemes = allThemes.filter(theme => {
      // Search filter
      if (state.searchQuery) {
        const searchMatch = theme.name.toLowerCase().includes(state.searchQuery) ||
                           theme.description.toLowerCase().includes(state.searchQuery) ||
                           theme.useCase.toLowerCase().includes(state.searchQuery);
        
        if (!searchMatch) return false;
      }
      
      // Category filter
      if (state.activeCategory !== 'all') {
        switch (state.activeCategory) {
          case 'dark':
            return theme.category === THEME_CATEGORIES.DARK;
          case 'light':
            return theme.category === THEME_CATEGORIES.LIGHT;
          case 'high-contrast':
            return theme.accessibility === ACCESSIBILITY_LEVELS.HIGH ||
                   theme.category === THEME_CATEGORIES.HIGH_CONTRAST;
          case 'professional':
            return theme.category === THEME_CATEGORIES.PROFESSIONAL ||
                   theme.useCase.toLowerCase().includes('professional');
          default:
            return true;
        }
      }
      
      return true;
    });
    
    renderThemes();
  }

  /**
   * Render the themes grid
   */
  function renderThemes() {
    const grid = document.getElementById('themesGrid');
    if (!grid) return;

    if (state.filteredThemes.length === 0) {
      grid.innerHTML = `
        <div class="empty-note">
          <p>No themes found matching your criteria.</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = state.filteredThemes.map(theme => createThemeCard(theme)).join('');
    
    // Add click listeners to theme cards
    grid.querySelectorAll('.theme-card').forEach(card => {
      card.addEventListener('click', () => applyTheme(card.dataset.themeId));
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          applyTheme(card.dataset.themeId);
        }
      });
    });
  }

  /**
   * Create HTML for a theme card
   */
  function createThemeCard(theme) {
    const isCurrent = theme.id === getCurrentThemeId();
    
    return `
      <div 
        class="theme-card ${isCurrent ? 'current' : ''}" 
        data-theme-id="${theme.id}"
        role="button"
        tabindex="0"
        aria-describedby="theme-desc-${theme.id}">
        
        <div class="theme-card-header">
          <h5 class="theme-name">${theme.name}</h5>
          <div class="theme-badges">
            ${theme.accessibility === ACCESSIBILITY_LEVELS.HIGH ? 
              '<span class="theme-badge high-contrast">HIGH</span>' : 
              '<span class="theme-badge accessibility">AA</span>'
            }
            ${isCurrent ? '<span class="theme-badge current">CURRENT</span>' : ''}
          </div>
        </div>
        
        <p class="theme-description" id="theme-desc-${theme.id}">
          ${theme.description}
        </p>
        
        <div class="theme-preview">
          <div class="color-swatch" style="background-color: ${theme.colors.bg}"></div>
          <div class="color-swatch" style="background-color: ${theme.colors.surface}"></div>
          <div class="color-swatch" style="background-color: ${theme.colors.primary}"></div>
          <div class="color-swatch" style="background-color: ${theme.colors.text}"></div>
          <div class="color-swatch" style="background-color: ${theme.colors.textMuted}"></div>
        </div>
        
        <div class="theme-use-case">${theme.useCase}</div>
      </div>
    `;
  }

  /**
   * Apply theme immediately and close modal
   */
  function applyTheme(themeId) {
    if (!themeId || !THEME_DEFINITIONS[themeId]) {
      showNotification('Invalid theme selected', 'error');
      return;
    }
    
    try {
      themeManager.apply(themeId);
      modalManager.close('#themePickerModal');
      showNotification(`Applied theme: ${THEME_DEFINITIONS[themeId].name}`, 'success');
    } catch (error) {
      console.error('Failed to apply theme:', error);
      showNotification('Failed to apply theme', 'error');
    }
  }

  /**
   * Update circular theme indicator with current theme colors
   */
  function updateThemeIndicator() {
    const currentThemeId = getCurrentThemeId();
    const currentTheme = THEME_DEFINITIONS[currentThemeId];
    
    if (!currentTheme) return;
    
    // Update the color segments in the circular indicator
    const primarySegment = document.querySelector('.color-segment[data-color="primary"]');
    const surfaceSegment = document.querySelector('.color-segment[data-color="surface"]');
    const textSegment = document.querySelector('.color-segment[data-color="text"]');
    const bgSegment = document.querySelector('.color-segment[data-color="bg"]');
    
    if (primarySegment) {
      primarySegment.style.backgroundColor = currentTheme.colors.primary;
    }
    if (surfaceSegment) {
      surfaceSegment.style.backgroundColor = currentTheme.colors.surface;
    }
    if (textSegment) {
      textSegment.style.backgroundColor = currentTheme.colors.text;
    }
    if (bgSegment) {
      bgSegment.style.backgroundColor = currentTheme.colors.bg;
    }
    
    // Update button title with current theme name for accessibility
    const themePickerBtn = document.getElementById('themePickerBtn');
    if (themePickerBtn) {
      themePickerBtn.title = `Choose theme (Current: ${currentTheme.name})`;
      themePickerBtn.setAttribute('aria-label', `Open theme picker (Current theme: ${currentTheme.name})`);
    }
  }

  /**
   * Get current theme ID from DOM
   */
  function getCurrentThemeId() {
    return document.documentElement.getAttribute('data-theme') || 'dark-mystic-forest';
  }

  /**
   * Show notification (assumed to be available globally)
   */
  function showNotification(message, type = 'info') {
    // This should be connected to the main app's notification system
    if (window.app && window.app.showNotification) {
      window.app.showNotification(message, type);
    } else {
      console.log(`Notification (${type}): ${message}`);
    }
  }

  /**
   * Update theme indicator and refresh cards
   */
  function updateSelectedTheme(themeId) {
    updateThemeIndicator();
    
    // Refresh theme cards to show current theme
    if (document.getElementById('themePickerModal')?.getAttribute('aria-hidden') === 'false') {
      renderThemes();
    }
  }

  // Public API
  return {
    init,
    updateSelectedTheme,
    updateThemeIndicator
  };
}