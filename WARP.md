# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

Compy 2.0 is a lightweight, offline-first clipboard and snippet manager web application. It's a vanilla JavaScript single-page application that runs entirely client-side with no backend dependencies. All data is stored locally in the browser's localStorage.

### Core Functionality
- Store and manage reusable text snippets (commands, credentials, templates)
- Tag-based organization and filtering system
- One-click copy functionality with visual feedback
- Import/export in JSON and CSV formats
- Automatic backup system with 10 recent snapshots
- Multiple themes (3 dark, 3 light variants)
- Sensitive data masking in the UI
- Offline-first design with no server dependencies

## Development Environment

### Prerequisites
- Modern web browser (for testing)
- HTTP server for local development (optional, can run as file:// protocol)
- Text editor with JavaScript/CSS/HTML support

### Local Development
```bash
# Serve locally (recommended for clipboard API functionality)
python -m http.server 8000
# OR
npx serve .
# OR
php -S localhost:8000

# Then visit http://localhost:8000
```

### Testing
```bash
# No formal test suite - manual testing in browser
# Test in multiple browsers for compatibility
# Test clipboard functionality (requires HTTPS or localhost)
# Test import/export with sample data
```

## Code Architecture

### File Structure
```
├── index.html          # Main HTML structure with all UI components
├── css/
│   └── compy.css      # Complete styling with theme system
├── js/
│   └── compy.js       # All JavaScript functionality (vanilla JS)
├── favicon_io/        # Favicon assets
└── README.md          # User documentation
```

### Key Architectural Patterns

#### Single-File Architecture
- **HTML**: Complete UI structure with all modals inline
- **CSS**: Theme-based design system using CSS custom properties
- **JavaScript**: Vanilla JS with IIFE module pattern, no framework dependencies

#### State Management
```javascript
// Global state object
state = {
    items: [],      // Main data: {id, text, desc, sensitive, tags}
    filterTags: [], // Active filter tags
    search: '',     // Current search query
    editingId: null,// Currently editing item ID
    profileName: '' // User's profile name
}
```

#### Storage System
```javascript
// localStorage keys
STORAGE_KEYS = {
    items: 'compy.items',
    theme: 'compy.theme', 
    profile: 'compy.profile',
    backups: 'compy.backups',
    filters: 'compy.filters'
}
```

#### Theme System
- CSS custom properties for theming
- 6 built-in themes (3 dark, 3 light)
- Theme switching via `data-theme` attribute on `<html>`
- Automatic light theme border adjustments for better contrast

#### Data Model
```javascript
// Item structure
{
    id: string,        // Unique identifier
    text: string,      // The actual content to copy
    desc: string,      // Description/label
    sensitive: boolean,// Whether to mask in UI
    tags: string[]     // Array of tag strings
}
```

## Development Guidelines

### Code Style
- Vanilla JavaScript (ES6+) with IIFE pattern
- Minimal DOM utility functions (`$`, `$$`)
- Event delegation for dynamic content
- CSS custom properties for theming
- Semantic HTML with accessibility attributes

### Key Functions to Understand
- `renderCards()` - Main UI rendering function
- `filteredAndSearchedItems()` - Data filtering logic
- `upsertItem()` - Create/update item logic
- `saveState()` / `loadState()` - localStorage persistence
- `importJSON()` / `importCSV()` - Data import handlers

### Modal System
- All modals defined inline in HTML
- Controlled via `aria-hidden` attribute
- Event listeners bound at initialization
- Focus management for accessibility

### Search and Filter
- Real-time search across text, description, and tags
- Tag-based filtering with multi-select
- Combined search + filter functionality
- Filter badge shows active filter count

## Common Development Tasks

### Adding New Themes
1. Add CSS custom property definitions in `compy.css`
2. Add `<option>` to theme select in `index.html`
3. Follow naming convention: `{dark|light}-{name}`

### Modifying Data Structure
1. Update the `addImportedItem()` function for new fields
2. Update export functions (`exportJSON()`, `exportCSV()`)
3. Update import functions to handle new fields
4. Update `renderCard()` if UI changes needed

### Adding New Import/Export Formats
1. Add handler function following existing patterns
2. Update file input `accept` attribute if needed
3. Add menu option in export dropdown
4. Test with sample data

## Important Implementation Notes

### Clipboard API
- Uses modern `navigator.clipboard.writeText()` with fallback
- Fallback uses `document.execCommand('copy')` for older browsers
- Requires HTTPS or localhost for modern API to work

### Data Persistence
- All data stored in browser localStorage
- Automatic backup every change (debounced) + hourly
- Keeps 10 most recent backups automatically
- Data persists across browser sessions but not across browsers/devices

### Accessibility Features
- Keyboard navigation (Tab, Enter, arrow keys)
- ARIA attributes for screen readers
- Focus management in modals
- Semantic HTML structure

### Performance Considerations
- No virtual DOM - direct DOM manipulation
- Debounced backup creation (200ms)
- Efficient filtering using native array methods
- CSS transitions for smooth interactions

## Deployment

### Static Hosting
The application is designed for static hosting and can be deployed to:
- GitHub Pages (current deployment at https://ajayparihar.github.io/Compy2.0/)
- Netlify
- Vercel
- Any static file server

### No Build Process Required
- Pure vanilla JavaScript, CSS, and HTML
- No bundling or compilation needed
- All assets are self-contained
- Works offline after initial load

## Browser Compatibility
- Modern browsers (Chrome, Firefox, Safari, Edge)
- Clipboard API requires HTTPS (or localhost)
- localStorage support required
- ES6+ JavaScript features used
