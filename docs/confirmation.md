# Confirmation Modal Documentation

The confirmation modal utility provides a modern, accessible, and theme-aware dialog system for confirming user actions in Compy 2.0. It uses a Promise-based API for clean async/await usage and integrates seamlessly with the existing modal management system.

## Features

- 🎯 **Promise-based API** - Clean async/await patterns
- 🎨 **Theme-aware** - Automatically adapts to all 6 themes
- ♿ **Accessible** - Full WCAG 2.1 AA compliance
- ⌨️ **Keyboard navigation** - ESC, Enter, Tab support
- 🔧 **Highly configurable** - Custom titles, messages, buttons
- 🎭 **Multiple variants** - Danger, primary, warning styles
- 🔒 **Secure** - HTML escaping with line break support

## Quick Start

```javascript
import { ConfirmationManager } from './js/components/confirmation.js';

// Initialize with modal manager
const confirmationManager = new ConfirmationManager(modalManager);

// Basic usage
const confirmed = await confirmationManager.show({
  title: 'Delete Item',
  message: 'Are you sure you want to delete this item?',
  confirmText: 'Delete',
  variant: 'danger'
});

if (confirmed) {
  // User confirmed - proceed with action
  deleteItem(id);
}
```

## API Reference

### ConfirmationManager.show(options)

Shows a confirmation dialog and returns a Promise that resolves to `true` if confirmed, `false` if cancelled.

#### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `title` | string | `'Confirm Action'` | Modal title text |
| `message` | string | `'Are you sure you want to proceed?'` | Confirmation message (supports line breaks with `\n`) |
| `confirmText` | string | `'Confirm'` | Text for the confirm button |
| `cancelText` | string | `'Cancel'` | Text for the cancel button |
| `variant` | string | `'primary'` | Button style variant: `'danger'`, `'primary'`, `'warning'` |
| `icon` | string | `null` | Optional icon (emoji or HTML) |
| `allowHtml` | boolean | `false` | Allow HTML in message (use with caution) |

#### Returns

`Promise<boolean>` - Resolves to `true` if user confirms, `false` if cancelled or dismissed.

## Usage Examples

### Delete Confirmation (Current Implementation)

```javascript
const confirmed = await confirmationManager.show({
  title: 'Delete Snippet',
  message: `Delete "${truncatedText}"?\n\nThis action cannot be undone.`,
  confirmText: 'Delete',
  cancelText: 'Cancel',
  variant: 'danger'
});

if (confirmed) {
  deleteItem(itemId);
  showNotification('Snippet deleted');
}
```

### Logout Confirmation

```javascript
const confirmed = await confirmationManager.show({
  title: 'Sign Out',
  message: 'Are you sure you want to sign out?\n\nAny unsaved changes will be lost.',
  confirmText: 'Sign Out',
  cancelText: 'Stay Signed In',
  variant: 'warning',
  icon: '👋'
});

if (confirmed) {
  logout();
  redirectToLogin();
}
```

### Import Overwrite Confirmation

```javascript
const confirmed = await confirmationManager.show({
  title: 'Import Data',
  message: `This will import ${itemCount} items and may overwrite existing data.\n\nDo you want to continue?`,
  confirmText: 'Import',
  cancelText: 'Cancel',
  variant: 'primary'
});

if (confirmed) {
  importData(fileData);
  showNotification(`Imported ${itemCount} items`);
}
```

### Clear Filters Confirmation

```javascript
const confirmed = await confirmationManager.show({
  title: 'Clear All Filters',
  message: 'This will remove all active filters and show all snippets.',
  confirmText: 'Clear Filters',
  cancelText: 'Keep Filters',
  variant: 'primary'
});

if (confirmed) {
  clearAllFilters();
  showNotification('Filters cleared');
}
```

### Data Loss Warning

```javascript
const confirmed = await confirmationManager.show({
  title: 'Unsaved Changes',
  message: 'You have unsaved changes that will be lost.\n\nDo you want to continue without saving?',
  confirmText: 'Discard Changes',
  cancelText: 'Keep Editing',
  variant: 'danger',
  icon: '⚠️'
});

if (confirmed) {
  discardChanges();
  navigateAway();
}
```

### Account Deletion (High Stakes)

```javascript
const confirmed = await confirmationManager.show({
  title: 'Delete Account',
  message: 'This will permanently delete your account and all associated data.\n\nThis action cannot be undone and your data cannot be recovered.',
  confirmText: 'Delete Account',
  cancelText: 'Keep Account',
  variant: 'danger',
  icon: '🚫'
});

if (confirmed) {
  deleteAccount();
  redirectToHomepage();
}
```

## Advanced Usage

### Custom HTML Content

```javascript
// Use with caution - ensure content is sanitized
const confirmed = await confirmationManager.show({
  title: 'Update Available',
  message: '<strong>Version 2.1</strong> is available.<br>Would you like to update now?',
  confirmText: 'Update Now',
  cancelText: 'Later',
  variant: 'primary',
  allowHtml: true
});
```

### Error Handling

```javascript
try {
  const confirmed = await confirmationManager.show({
    title: 'Risky Operation',
    message: 'This operation might fail. Continue?',
    confirmText: 'Try Anyway',
    variant: 'warning'
  });

  if (confirmed) {
    await performRiskyOperation();
  }
} catch (error) {
  console.error('Confirmation dialog error:', error);
  // Handle error gracefully
}
```

### Conditional Confirmations

```javascript
// Only show confirmation for important data
const requiresConfirmation = item.isImportant || item.hasChildren;

if (requiresConfirmation) {
  const confirmed = await confirmationManager.show({
    title: 'Delete Important Item',
    message: `"${item.name}" contains important data.\n\nAre you sure?`,
    confirmText: 'Delete',
    variant: 'danger'
  });

  if (!confirmed) return;
}

deleteItem(item.id);
```

## Accessibility Features

The confirmation modal includes comprehensive accessibility support:

- **Focus Management**: Automatic focus on confirm button, focus trapping within modal
- **Keyboard Navigation**: ESC to close, Enter to confirm, Tab cycling
- **Screen Reader Support**: Proper ARIA labels and announcements
- **Visual Indicators**: Clear button styling and hover states
- **High Contrast**: Theme-aware colors with proper contrast ratios

### ARIA Attributes

```html
<div id="confirmModal" 
     role="dialog" 
     aria-modal="true"
     aria-labelledby="confirmModalTitle"
     aria-describedby="confirmModalMessage">
  <!-- Modal content -->
</div>
```

## Theme Compatibility

The confirmation modal automatically adapts to all available themes:

### Dark Themes
- **Mystic Forest**: Green primary colors
- **Crimson Night**: Red accent colors  
- **Royal Elegance**: Purple primary colors

### Light Themes
- **Sunrise**: Orange primary colors
- **Soft Glow**: Blue primary colors
- **Floral Breeze**: Green primary colors

All themes maintain:
- Proper contrast ratios (WCAG AA compliant)
- Consistent danger button styling (red across all themes)
- Theme-appropriate hover and focus states
- Adaptive border and shadow styling

## Integration with Existing Code

### Using with Modal Manager

```javascript
// Initialize confirmation manager
const confirmationManager = new ConfirmationManager(this.modals);

// Set global confirm function for easy access
setGlobalConfirm((options) => confirmationManager.show(options));

// Use anywhere in the app
const confirmed = await confirm({
  title: 'Confirm Action',
  message: 'Are you sure?',
  variant: 'danger'
});
```

### Event Handler Integration

```javascript
// In event handlers
button.addEventListener('click', async (e) => {
  const confirmed = await confirmationManager.show({
    title: 'Delete Item',
    message: 'This cannot be undone.',
    confirmText: 'Delete',
    variant: 'danger'
  });

  if (confirmed) {
    handleDelete(e.target.dataset.id);
  }
});
```

## Best Practices

### 1. Use Appropriate Variants

```javascript
// For destructive actions
variant: 'danger'

// For important but safe actions  
variant: 'primary'

// For potentially problematic actions
variant: 'warning'
```

### 2. Clear and Concise Messages

```javascript
// Good: Clear and specific
message: 'Delete "Project Alpha"?\n\nThis action cannot be undone.'

// Avoid: Vague or technical
message: 'Are you sure you want to perform this operation on the selected entity?'
```

### 3. Meaningful Button Labels

```javascript
// Good: Action-specific labels
confirmText: 'Delete Project'
cancelText: 'Keep Project'

// Avoid: Generic labels for important actions
confirmText: 'OK'
cancelText: 'Cancel'
```

### 4. Line Breaks for Readability

```javascript
// Use \n for natural line breaks
message: 'This will delete all your data.\n\nThis action cannot be undone.'
```

### 5. Icons for Context

```javascript
// Add visual context with appropriate emojis
icon: '🗑️' // for delete actions
icon: '⚠️'  // for warnings  
icon: '📤' // for export actions
icon: '👋' // for logout
```

## Security Considerations

### HTML Escaping

By default, all user content is HTML-escaped to prevent XSS attacks:

```javascript
// Safe: Content is automatically escaped
message: `Delete "${userInput}"?` // XSS-safe even if userInput contains HTML

// Only use allowHtml: true with trusted content
message: '<strong>System Message</strong>',
allowHtml: true // Use with caution
```

### Input Validation

Always validate data before showing in confirmations:

```javascript
const safeTitle = item.title?.trim() || 'this item';
const truncatedTitle = safeTitle.length > 50 ? safeTitle.substring(0, 50) + '...' : safeTitle;

const confirmed = await confirmationManager.show({
  title: 'Delete Item',
  message: `Delete "${truncatedTitle}"?`,
  variant: 'danger'
});
```

## Troubleshooting

### Common Issues

**Modal doesn't appear:**
- Ensure ConfirmationManager is initialized with a valid modal manager
- Check that `#confirmModal` element exists in the DOM
- Verify no JavaScript errors in console

**Focus issues:**
- Confirm button should have `data-primary="true"` attribute
- Modal manager should handle focus trapping automatically
- Check for conflicting focus management code

**Styling problems:**
- Ensure CSS variables are properly defined for current theme
- Check that modal CSS is loaded after theme CSS
- Verify no conflicting CSS rules override modal styles

**Promise never resolves:**
- Ensure modal is properly closed when user takes action
- Check that event handlers are correctly wired
- Look for uncaught JavaScript errors

### Debug Mode

```javascript
// Enable debug logging
const confirmationManager = new ConfirmationManager(modalManager);

// Override methods for debugging
const originalShow = confirmationManager.show;
confirmationManager.show = function(options) {
  console.log('Showing confirmation with options:', options);
  return originalShow.call(this, options);
};
```

## Migration Guide

### From Simple `confirm()`

```javascript
// Old: Browser confirm
if (confirm('Delete this item?')) {
  deleteItem(id);
}

// New: Confirmation modal
const confirmed = await confirmationManager.show({
  title: 'Delete Item',
  message: 'Delete this item?',
  confirmText: 'Delete',
  variant: 'danger'
});

if (confirmed) {
  deleteItem(id);
}
```

### From Custom Modal Code

```javascript
// Old: Custom modal management
showCustomModal();
document.getElementById('confirmBtn').onclick = () => {
  deleteItem(id);
  hideCustomModal();
};

// New: Confirmation manager
const confirmed = await confirmationManager.show({
  title: 'Delete Item',
  message: 'Are you sure?',
  confirmText: 'Delete',
  variant: 'danger'
});

if (confirmed) {
  deleteItem(id);
}
```

## License

This confirmation modal utility is part of Compy 2.0 and follows the same license terms.

---

**Last Updated**: January 2025  
**Version**: 2.0  
**Compatibility**: All modern browsers supporting ES6+ and CSS custom properties
