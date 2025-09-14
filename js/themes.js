/**
 * Comprehensive Theme Definitions for Compy 2.0
 * 
 * This module contains structured theme definitions with metadata, accessibility ratings,
 * and comprehensive color palettes for all 26 themes (6 existing + 20 new).
 * 
 * @fileoverview Complete theme system with accessibility-first design
 * @version 2.0
 * @author Bheb Developer
 * @since 2025
 */

/**
 * Theme Categories
 */
export const THEME_CATEGORIES = {
  DARK: 'dark',
  LIGHT: 'light',
  HIGH_CONTRAST: 'high-contrast',
  PROFESSIONAL: 'professional',
  CREATIVE: 'creative'
};

/**
 * Accessibility Levels
 */
export const ACCESSIBILITY_LEVELS = {
  AA: 'AA',       // WCAG 2.1 AA compliant (4.5:1 contrast)
  AAA: 'AAA',     // WCAG 2.1 AAA compliant (7:1 contrast)
  HIGH: 'HIGH'    // Enhanced contrast for visual impairments
};

/**
 * Theme Use Cases
 */
export const USE_CASES = {
  GENERAL: 'General use',
  NIGHT_MODE: 'Night work',
  LONG_READING: 'Extended reading',
  ACCESSIBILITY: 'Accessibility focused',
  PROFESSIONAL: 'Professional environments',
  CREATIVE: 'Creative work',
  CODING: 'Code development',
  LOW_LIGHT: 'Low light conditions',
  HIGH_LIGHT: 'Bright environments'
};

/**
 * Complete Theme Definitions
 * Each theme includes metadata, accessibility rating, and comprehensive color palette
 */
export const THEME_DEFINITIONS = {
  // === EXISTING THEMES (IMPROVED) ===
  'dark-mystic-forest': {
    name: 'Mystic Forest',
    category: THEME_CATEGORIES.DARK,
    accessibility: ACCESSIBILITY_LEVELS.AA,
    useCase: USE_CASES.GENERAL,
    description: 'Cool, nature-inspired dark theme with enhanced green accents',
    colors: {
      bg: '#0a0d10',
      surface: '#1a2026',
      primary: '#4ade80',
      text: '#f1f5f9',
      textMuted: '#b4c6ef'
    }
  },

  'dark-crimson-night': {
    name: 'Crimson Night',
    category: THEME_CATEGORIES.DARK,
    accessibility: ACCESSIBILITY_LEVELS.AA,
    useCase: USE_CASES.NIGHT_MODE,
    description: 'Warm, dramatic dark theme with red accents for evening use',
    colors: {
      bg: '#0f0a0a',
      surface: '#1f1214',
      primary: '#f87171',
      text: '#fef2f2',
      textMuted: '#fda4af'
    }
  },

  'dark-royal-elegance': {
    name: 'Royal Elegance',
    category: THEME_CATEGORIES.DARK,
    accessibility: ACCESSIBILITY_LEVELS.AA,
    useCase: USE_CASES.PROFESSIONAL,
    description: 'Sophisticated dark theme with purple accents for professional use',
    colors: {
      bg: '#0c0a14',
      surface: '#1e1b3a',
      primary: '#a78bfa',
      text: '#f3f4f6',
      textMuted: '#d8b4fe'
    }
  },

  'light-sunrise': {
    name: 'Sunrise',
    category: THEME_CATEGORIES.LIGHT,
    accessibility: ACCESSIBILITY_LEVELS.AA,
    useCase: USE_CASES.GENERAL,
    description: 'Warm, energizing light theme with orange accents',
    colors: {
      bg: '#fef7ed',
      surface: '#ffffff',
      primary: '#c2410c',
      text: '#0c0a09',
      textMuted: '#57534e'
    }
  },

  'light-soft-glow': {
    name: 'Soft Glow',
    category: THEME_CATEGORIES.LIGHT,
    accessibility: ACCESSIBILITY_LEVELS.AA,
    useCase: USE_CASES.LONG_READING,
    description: 'Gentle, easy-on-the-eyes light theme with blue accents',
    colors: {
      bg: '#f8fafc',
      surface: '#ffffff',
      primary: '#2563eb',
      text: '#0f172a',
      textMuted: '#475569'
    }
  },

  'light-floral-breeze': {
    name: 'Floral Breeze',
    category: THEME_CATEGORIES.LIGHT,
    accessibility: ACCESSIBILITY_LEVELS.AA,
    useCase: USE_CASES.GENERAL,
    description: 'Fresh, natural light theme with green accents',
    colors: {
      bg: '#f0fdf4',
      surface: '#ffffff',
      primary: '#14532d',
      text: '#052e16',
      textMuted: '#374151'
    }
  },

  // === NEW DARK THEMES ===
  'dark-dracula': {
    name: 'Dracula',
    category: THEME_CATEGORIES.DARK,
    accessibility: ACCESSIBILITY_LEVELS.AA,
    useCase: USE_CASES.CODING,
    description: 'Popular dark theme inspired by the Dracula color scheme',
    colors: {
      bg: '#282a36',
      surface: '#383a59',
      primary: '#ff79c6',
      text: '#f8f8f2',
      textMuted: '#bd93f9'
    }
  },

  'dark-solarized': {
    name: 'Solarized Dark',
    category: THEME_CATEGORIES.DARK,
    accessibility: ACCESSIBILITY_LEVELS.AA,
    useCase: USE_CASES.LONG_READING,
    description: 'Scientifically calibrated dark theme for reduced eye strain',
    colors: {
      bg: '#002b36',
      surface: '#073642',
      primary: '#36c5b5',
      text: '#a3b5b8',
      textMuted: '#93a1a1'
    }
  },

  'dark-midnight-blue': {
    name: 'Midnight Blue',
    category: THEME_CATEGORIES.DARK,
    accessibility: ACCESSIBILITY_LEVELS.AA,
    useCase: USE_CASES.NIGHT_MODE,
    description: 'Deep blue theme perfect for late-night work sessions',
    colors: {
      bg: '#0f1419',
      surface: '#1e2330',
      primary: '#39bae6',
      text: '#d4d4d8',
      textMuted: '#a1a1aa'
    }
  },

  'dark-night-owl': {
    name: 'Night Owl',
    category: THEME_CATEGORIES.DARK,
    accessibility: ACCESSIBILITY_LEVELS.AA,
    useCase: USE_CASES.CODING,
    description: 'Developer-favorite theme optimized for code readability',
    colors: {
      bg: '#011627',
      surface: '#1e2040',
      primary: '#82aaff',
      text: '#d6deeb',
      textMuted: '#adbac7'
    }
  },

  'dark-monokai': {
    name: 'Monokai',
    category: THEME_CATEGORIES.DARK,
    accessibility: ACCESSIBILITY_LEVELS.AA,
    useCase: USE_CASES.CODING,
    description: 'Classic coding theme with vibrant accent colors',
    colors: {
      bg: '#272822',
      surface: '#3e3d32',
      primary: '#a6e22e',
      text: '#f8f8f2',
      textMuted: '#cfcfc2'
    }
  },

  'dark-deep-ocean': {
    name: 'Deep Ocean',
    category: THEME_CATEGORIES.DARK,
    accessibility: ACCESSIBILITY_LEVELS.AA,
    useCase: USE_CASES.LOW_LIGHT,
    description: 'Calming deep blue theme inspired by ocean depths',
    colors: {
      bg: '#0a0e1a',
      surface: '#1a1f2e',
      primary: '#4dd0e1',
      text: '#e1e5e9',
      textMuted: '#b3bcc8'
    }
  },

  'dark-high-contrast': {
    name: 'Dark High Contrast',
    category: THEME_CATEGORIES.HIGH_CONTRAST,
    accessibility: ACCESSIBILITY_LEVELS.HIGH,
    useCase: USE_CASES.ACCESSIBILITY,
    description: 'Maximum contrast dark theme for visual accessibility',
    colors: {
      bg: '#000000',
      surface: '#1a1a1a',
      primary: '#00ff00',
      text: '#ffffff',
      textMuted: '#cccccc'
    }
  },

  'dark-professional': {
    name: 'Professional Dark',
    category: THEME_CATEGORIES.PROFESSIONAL,
    accessibility: ACCESSIBILITY_LEVELS.AA,
    useCase: USE_CASES.PROFESSIONAL,
    description: 'Clean, distraction-free dark theme for professional environments',
    colors: {
      bg: '#121212',
      surface: '#1e1e1e',
      primary: '#14a085',
      text: '#e0e0e0',
      textMuted: '#b0b0b0'
    }
  },

  'dark-gruvbox': {
    name: 'Gruvbox Dark',
    category: THEME_CATEGORIES.DARK,
    accessibility: ACCESSIBILITY_LEVELS.AA,
    useCase: USE_CASES.CODING,
    description: 'Retro groove with warm, earthy tones',
    colors: {
      bg: '#282828',
      surface: '#3c3836',
      primary: '#fabd2f',
      text: '#ebdbb2',
      textMuted: '#bdae93'
    }
  },

  'dark-material': {
    name: 'Material Dark',
    category: THEME_CATEGORIES.DARK,
    accessibility: ACCESSIBILITY_LEVELS.AA,
    useCase: USE_CASES.GENERAL,
    description: 'Google Material Design inspired dark theme',
    colors: {
      bg: '#303030',
      surface: '#424242',
      primary: '#03dac6',
      text: '#ffffff',
      textMuted: '#b3b3b3'
    }
  },

  // === NEW LIGHT THEMES ===
  'light-solarized': {
    name: 'Solarized Light',
    category: THEME_CATEGORIES.LIGHT,
    accessibility: ACCESSIBILITY_LEVELS.AA,
    useCase: USE_CASES.LONG_READING,
    description: 'Scientifically calibrated light theme for optimal readability',
    colors: {
      bg: '#fdf6e3',
      surface: '#eee8d5',
      primary: '#1c5f96',
      text: '#2f3c42',
      textMuted: '#4a5c63'
    }
  },

  'light-high-contrast': {
    name: 'Light High Contrast',
    category: THEME_CATEGORIES.HIGH_CONTRAST,
    accessibility: ACCESSIBILITY_LEVELS.HIGH,
    useCase: USE_CASES.ACCESSIBILITY,
    description: 'Maximum contrast light theme for visual accessibility',
    colors: {
      bg: '#ffffff',
      surface: '#f5f5f5',
      primary: '#0000ff',
      text: '#000000',
      textMuted: '#333333'
    }
  },

  'light-professional': {
    name: 'Professional Light',
    category: THEME_CATEGORIES.PROFESSIONAL,
    accessibility: ACCESSIBILITY_LEVELS.AA,
    useCase: USE_CASES.PROFESSIONAL,
    description: 'Clean, minimal light theme for business environments',
    colors: {
      bg: '#fafafa',
      surface: '#ffffff',
      primary: '#1565c0',
      text: '#212121',
      textMuted: '#616161'
    }
  },

  'light-pastel-mint': {
    name: 'Pastel Mint',
    category: THEME_CATEGORIES.CREATIVE,
    accessibility: ACCESSIBILITY_LEVELS.AA,
    useCase: USE_CASES.CREATIVE,
    description: 'Soft, refreshing theme with mint and pastel accents',
    colors: {
      bg: '#f0fff4',
      surface: '#ffffff',
      primary: '#0a6b64',
      text: '#2f4f4f',
      textMuted: '#696969'
    }
  },

  'light-earth-tones': {
    name: 'Earth Tones',
    category: THEME_CATEGORIES.LIGHT,
    accessibility: ACCESSIBILITY_LEVELS.AA,
    useCase: USE_CASES.GENERAL,
    description: 'Natural, grounding theme with warm earth colors',
    colors: {
      bg: '#f5f5dc',
      surface: '#ffffff',
      primary: '#8b4513',
      text: '#2f1b14',
      textMuted: '#5d4037'
    }
  },

  'light-oceanic': {
    name: 'Oceanic Light',
    category: THEME_CATEGORIES.LIGHT,
    accessibility: ACCESSIBILITY_LEVELS.AA,
    useCase: USE_CASES.GENERAL,
    description: 'Fresh, airy theme inspired by ocean and sky',
    colors: {
      bg: '#f0f8ff',
      surface: '#ffffff',
      primary: '#2e5984',
      text: '#191970',
      textMuted: '#483d8b'
    }
  },

  'light-vanilla-cream': {
    name: 'Vanilla Cream',
    category: THEME_CATEGORIES.LIGHT,
    accessibility: ACCESSIBILITY_LEVELS.AA,
    useCase: USE_CASES.LONG_READING,
    description: 'Warm, comfortable theme with vanilla and cream tones',
    colors: {
      bg: '#fffef7',
      surface: '#ffffff',
      primary: '#a0520d',
      text: '#2f2f2f',
      textMuted: '#5a5a5a'
    }
  },

  'light-nordic': {
    name: 'Nordic Light',
    category: THEME_CATEGORIES.LIGHT,
    accessibility: ACCESSIBILITY_LEVELS.AA,
    useCase: USE_CASES.PROFESSIONAL,
    description: 'Clean, minimalist theme inspired by Nordic design',
    colors: {
      bg: '#fafbfc',
      surface: '#ffffff',
      primary: '#3e5a7a',
      text: '#2e3440',
      textMuted: '#4c566a'
    }
  },

  'light-material': {
    name: 'Material Light',
    category: THEME_CATEGORIES.LIGHT,
    accessibility: ACCESSIBILITY_LEVELS.AA,
    useCase: USE_CASES.GENERAL,
    description: 'Google Material Design inspired light theme',
    colors: {
      bg: '#fafafa',
      surface: '#ffffff',
      primary: '#6200ee',
      text: '#000000',
      textMuted: '#495057'
    }
  },

  'light-warm-beige': {
    name: 'Warm Beige',
    category: THEME_CATEGORIES.LIGHT,
    accessibility: ACCESSIBILITY_LEVELS.AA,
    useCase: USE_CASES.LONG_READING,
    description: 'Gentle, warm theme perfect for extended reading sessions',
    colors: {
      bg: '#faf6f0',
      surface: '#ffffff',
      primary: '#8b6508',
      text: '#2d2d2d',
      textMuted: '#5c5c5c'
    }
  }
};

/**
 * Get all theme identifiers
 */
export const getAllThemeIds = () => Object.keys(THEME_DEFINITIONS);

/**
 * Get themes by category
 */
export const getThemesByCategory = (category) => {
  return Object.entries(THEME_DEFINITIONS)
    .filter(([_, theme]) => theme.category === category)
    .reduce((acc, [id, theme]) => ({ ...acc, [id]: theme }), {});
};

/**
 * Get themes by accessibility level
 */
export const getThemesByAccessibility = (level) => {
  return Object.entries(THEME_DEFINITIONS)
    .filter(([_, theme]) => theme.accessibility === level)
    .reduce((acc, [id, theme]) => ({ ...acc, [id]: theme }), {});
};

/**
 * Get theme metadata by ID
 */
export const getThemeMetadata = (themeId) => {
  return THEME_DEFINITIONS[themeId] || null;
};

/**
 * Check if a theme ID is valid
 */
export const isValidThemeId = (themeId) => {
  return themeId in THEME_DEFINITIONS;
};

/**
 * Get recommended themes for specific use cases
 */
export const getRecommendedThemes = (useCase) => {
  return Object.entries(THEME_DEFINITIONS)
    .filter(([_, theme]) => theme.useCase === useCase)
    .map(([id, theme]) => ({ id, ...theme }));
};