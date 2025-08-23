/**
 * Unit Tests for Confirmation Modal Utility
 * 
 * These tests verify the Promise-based API, content injection, accessibility features,
 * and integration with the modal management system.
 */

import { ConfirmationManager } from '../js/components/confirmation.js';

// Mock modal manager for testing
class MockModalManager {
  constructor() {
    this.openCalls = [];
    this.closeCalls = [];
    this.isOpenState = {};
  }

  open(selector, options) {
    this.openCalls.push({ selector, options });
    this.isOpenState[selector] = true;
    return true;
  }

  close(selector) {
    this.closeCalls.push({ selector });
    this.isOpenState[selector] = false;
    return true;
  }

  isOpen(selector) {
    return !!this.isOpenState[selector];
  }

  reset() {
    this.openCalls = [];
    this.closeCalls = [];
    this.isOpenState = {};
  }
}

// Mock DOM elements for testing
function setupMockDOM() {
  // Create mock modal element
  const modal = document.createElement('div');
  modal.id = 'confirmModal';
  modal.setAttribute('aria-hidden', 'true');

  // Create modal content structure
  const content = document.createElement('div');
  content.className = 'modal-content';

  const header = document.createElement('div');
  header.className = 'modal-header';

  const title = document.createElement('h3');
  title.id = 'confirmModalTitle';
  title.textContent = 'Default Title';

  const closeBtn = document.createElement('button');
  closeBtn.className = 'icon-btn';
  closeBtn.setAttribute('data-close-modal', '');
  closeBtn.textContent = '✕';

  header.appendChild(title);
  header.appendChild(closeBtn);

  const body = document.createElement('div');
  body.className = 'modal-body';

  const message = document.createElement('p');
  message.id = 'confirmModalMessage';
  message.textContent = 'Default message';

  body.appendChild(message);

  const footer = document.createElement('div');
  footer.className = 'modal-footer';

  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'secondary-btn';
  cancelBtn.setAttribute('data-close-modal', '');
  cancelBtn.textContent = 'Cancel';

  const confirmBtn = document.createElement('button');
  confirmBtn.id = 'confirmModalAction';
  confirmBtn.className = 'primary-btn';
  confirmBtn.setAttribute('data-primary', 'true');
  confirmBtn.textContent = 'Confirm';

  footer.appendChild(cancelBtn);
  footer.appendChild(confirmBtn);

  content.appendChild(header);
  content.appendChild(body);
  content.appendChild(footer);
  modal.appendChild(content);

  document.body.appendChild(modal);

  return { modal, title, message, cancelBtn, confirmBtn, closeBtn };
}

// Clean up DOM after tests
function cleanupMockDOM() {
  const modal = document.getElementById('confirmModal');
  if (modal) {
    modal.remove();
  }
}

describe('ConfirmationManager', () => {
  let mockModalManager;
  let confirmationManager;
  let mockElements;

  beforeEach(() => {
    mockModalManager = new MockModalManager();
    mockElements = setupMockDOM();
    confirmationManager = new ConfirmationManager(mockModalManager);
  });

  afterEach(() => {
    cleanupMockDOM();
    mockModalManager.reset();
  });

  describe('Constructor', () => {
    test('should initialize with modal manager', () => {
      expect(confirmationManager.modalManager).toBe(mockModalManager);
      expect(confirmationManager.modalSelector).toBe('#confirmModal');
      expect(confirmationManager.currentResolver).toBeNull();
    });

    test('should bind methods correctly', () => {
      expect(typeof confirmationManager.show).toBe('function');
      expect(typeof confirmationManager.handleConfirm).toBe('function');
      expect(typeof confirmationManager.handleCancel).toBe('function');
    });
  });

  describe('show() method', () => {
    test('should return a Promise', () => {
      const result = confirmationManager.show();
      expect(result).toBeInstanceOf(Promise);
      
      // Clean up the promise to avoid hanging tests
      confirmationManager.handleCancel();
    });

    test('should use default options', async () => {
      const promise = confirmationManager.show();
      
      expect(mockElements.title.textContent).toBe('Confirm Action');
      expect(mockElements.message.innerHTML).toBe('Are you sure you want to proceed?');
      expect(mockElements.confirmBtn.textContent).toBe('Confirm');

      confirmationManager.handleCancel();
      await promise;
    });

    test('should apply custom options', async () => {
      const promise = confirmationManager.show({
        title: 'Delete Item',
        message: 'This will delete the item permanently.',
        confirmText: 'Delete',
        cancelText: 'Keep',
        variant: 'danger'
      });

      expect(mockElements.title.textContent).toBe('Delete Item');
      expect(mockElements.message.innerHTML).toBe('This will delete the item permanently.');
      expect(mockElements.confirmBtn.textContent).toBe('Delete');

      confirmationManager.handleCancel();
      await promise;
    });

    test('should handle line breaks in messages', async () => {
      const promise = confirmationManager.show({
        message: 'First line\n\nSecond line'
      });

      expect(mockElements.message.innerHTML).toBe('First line<br><br>Second line');

      confirmationManager.handleCancel();
      await promise;
    });

    test('should escape HTML in messages by default', async () => {
      const promise = confirmationManager.show({
        message: 'Delete <script>alert("XSS")</script> item?'
      });

      expect(mockElements.message.innerHTML).toBe('Delete &lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt; item?');

      confirmationManager.handleCancel();
      await promise;
    });

    test('should allow HTML when allowHtml is true', async () => {
      const promise = confirmationManager.show({
        message: '<strong>Important:</strong> This action is irreversible.',
        allowHtml: true
      });

      expect(mockElements.message.innerHTML).toBe('<strong>Important:</strong> This action is irreversible.');

      confirmationManager.handleCancel();
      await promise;
    });

    test('should open modal with correct options', async () => {
      const promise = confirmationManager.show();

      expect(mockModalManager.openCalls).toHaveLength(1);
      expect(mockModalManager.openCalls[0].selector).toBe('#confirmModal');
      expect(mockModalManager.openCalls[0].options.initialFocus).toBe('#confirmModalAction');
      expect(mockModalManager.openCalls[0].options.restoreFocus).toBe(true);

      confirmationManager.handleCancel();
      await promise;
    });

    test('should apply button variants correctly', async () => {
      const promise = confirmationManager.show({
        variant: 'danger'
      });

      expect(mockElements.confirmBtn.classList.contains('modal-danger-btn')).toBe(true);
      expect(mockElements.confirmBtn.classList.contains('primary-btn')).toBe(false);

      confirmationManager.handleCancel();
      await promise;
    });

    test('should update ARIA attributes', async () => {
      const promise = confirmationManager.show({
        title: 'Custom Title',
        message: 'Custom message'
      });

      expect(mockElements.modal.getAttribute('aria-labelledby')).toBe('confirmModalTitle');
      expect(mockElements.modal.getAttribute('aria-describedby')).toBe('confirmModalMessage');
      expect(mockElements.confirmBtn.getAttribute('aria-describedby')).toBe('confirmModalMessage');

      confirmationManager.handleCancel();
      await promise;
    });
  });

  describe('Promise resolution', () => {
    test('should resolve true when confirmed', async () => {
      const promise = confirmationManager.show();
      
      // Simulate confirm button click
      setTimeout(() => {
        confirmationManager.handleConfirm();
      }, 10);

      const result = await promise;
      expect(result).toBe(true);
    });

    test('should resolve false when cancelled', async () => {
      const promise = confirmationManager.show();
      
      // Simulate cancel button click  
      setTimeout(() => {
        confirmationManager.handleCancel();
      }, 10);

      const result = await promise;
      expect(result).toBe(false);
    });

    test('should resolve false when closed', async () => {
      const promise = confirmationManager.show();
      
      // Simulate close button click
      setTimeout(() => {
        confirmationManager.handleCancel();
      }, 10);

      const result = await promise;
      expect(result).toBe(false);
    });

    test('should close modal when confirmed', async () => {
      const promise = confirmationManager.show();
      
      setTimeout(() => {
        confirmationManager.handleConfirm();
      }, 10);

      await promise;
      
      expect(mockModalManager.closeCalls).toHaveLength(1);
      expect(mockModalManager.closeCalls[0].selector).toBe('#confirmModal');
    });

    test('should handle multiple pending confirmations', async () => {
      // Start first confirmation
      const promise1 = confirmationManager.show({ message: 'First confirmation' });
      
      // Start second confirmation - should resolve first one as false
      const promise2 = confirmationManager.show({ message: 'Second confirmation' });
      
      // Confirm the second one
      setTimeout(() => {
        confirmationManager.handleConfirm();
      }, 10);
      
      const [result1, result2] = await Promise.all([promise1, promise2]);
      
      expect(result1).toBe(false); // First one auto-cancelled
      expect(result2).toBe(true);  // Second one confirmed
    });
  });

  describe('Keyboard handling', () => {
    beforeEach(() => {
      // Mock isOpen to return true for keyboard tests
      mockModalManager.isOpen = jest.fn().mockReturnValue(true);
    });

    test('should handle Enter key to confirm', () => {
      const promise = confirmationManager.show();
      
      // Mock document.activeElement to not have data-close-modal
      const mockActiveElement = { hasAttribute: jest.fn().mockReturnValue(false) };
      Object.defineProperty(document, 'activeElement', {
        value: mockActiveElement,
        configurable: true
      });

      // Create and dispatch Enter key event
      const enterEvent = new KeyboardEvent('keydown', {
        key: 'Enter',
        bubbles: true,
        cancelable: true
      });
      
      const preventDefaultSpy = jest.spyOn(enterEvent, 'preventDefault');
      
      // Trigger keyboard handler
      confirmationManager.handleKeyboard(enterEvent);
      
      expect(preventDefaultSpy).toHaveBeenCalled();
      
      // Clean up
      confirmationManager.handleCancel();
    });

    test('should not confirm on Enter when focus is on cancel button', () => {
      const promise = confirmationManager.show();
      
      // Mock document.activeElement to have data-close-modal
      const mockActiveElement = { hasAttribute: jest.fn().mockReturnValue(true) };
      Object.defineProperty(document, 'activeElement', {
        value: mockActiveElement,
        configurable: true
      });

      const enterEvent = new KeyboardEvent('keydown', {
        key: 'Enter',
        bubbles: true,
        cancelable: true
      });
      
      const preventDefaultSpy = jest.spyOn(enterEvent, 'preventDefault');
      
      confirmationManager.handleKeyboard(enterEvent);
      
      expect(preventDefaultSpy).not.toHaveBeenCalled();
      
      // Clean up
      confirmationManager.handleCancel();
    });

    test('should ignore keyboard events when modal is not open', () => {
      mockModalManager.isOpen = jest.fn().mockReturnValue(false);
      
      const enterEvent = new KeyboardEvent('keydown', {
        key: 'Enter',
        bubbles: true,
        cancelable: true
      });
      
      const preventDefaultSpy = jest.spyOn(enterEvent, 'preventDefault');
      
      confirmationManager.handleKeyboard(enterEvent);
      
      expect(preventDefaultSpy).not.toHaveBeenCalled();
    });
  });

  describe('Variant handling', () => {
    test('should apply danger variant', async () => {
      const promise = confirmationManager.show({ variant: 'danger' });
      
      expect(mockElements.confirmBtn.classList.contains('modal-danger-btn')).toBe(true);
      expect(mockElements.confirmBtn.classList.contains('primary-btn')).toBe(false);
      expect(mockElements.confirmBtn.classList.contains('warning-btn')).toBe(false);
      
      confirmationManager.handleCancel();
      await promise;
    });

    test('should apply warning variant', async () => {
      const promise = confirmationManager.show({ variant: 'warning' });
      
      expect(mockElements.confirmBtn.classList.contains('warning-btn')).toBe(true);
      expect(mockElements.confirmBtn.classList.contains('modal-danger-btn')).toBe(false);
      expect(mockElements.confirmBtn.classList.contains('primary-btn')).toBe(false);
      
      confirmationManager.handleCancel();
      await promise;
    });

    test('should apply primary variant by default', async () => {
      const promise = confirmationManager.show({ variant: 'primary' });
      
      expect(mockElements.confirmBtn.classList.contains('primary-btn')).toBe(true);
      expect(mockElements.confirmBtn.classList.contains('modal-danger-btn')).toBe(false);
      expect(mockElements.confirmBtn.classList.contains('warning-btn')).toBe(false);
      
      confirmationManager.handleCancel();
      await promise;
    });

    test('should default to primary for invalid variants', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      const promise = confirmationManager.show({ variant: 'invalid' });
      
      expect(consoleSpy).toHaveBeenCalledWith('Invalid confirmation variant: invalid. Using \'primary\'.');
      expect(mockElements.confirmBtn.classList.contains('primary-btn')).toBe(true);
      
      confirmationManager.handleCancel();
      await promise;
      
      consoleSpy.mockRestore();
    });
  });

  describe('Error handling', () => {
    test('should throw error if modal not found', () => {
      cleanupMockDOM(); // Remove modal from DOM
      
      expect(() => {
        confirmationManager.show();
      }).toThrow('Confirmation modal not found in DOM');
    });

    test('should handle missing title element gracefully', async () => {
      mockElements.title.remove();
      
      const promise = confirmationManager.show({ title: 'Custom Title' });
      
      // Should not throw error
      expect(() => {
        confirmationManager.handleCancel();
      }).not.toThrow();
      
      await promise;
    });

    test('should handle missing message element gracefully', async () => {
      mockElements.message.remove();
      
      const promise = confirmationManager.show({ message: 'Custom message' });
      
      expect(() => {
        confirmationManager.handleCancel();
      }).not.toThrow();
      
      await promise;
    });
  });

  describe('Cleanup and destruction', () => {
    test('should resolve pending promise on destroy', async () => {
      const promise = confirmationManager.show();
      
      confirmationManager.destroy();
      
      const result = await promise;
      expect(result).toBe(false);
    });

    test('should clean up event listeners on destroy', () => {
      const removeEventListenerSpy = jest.spyOn(document, 'removeEventListener');
      
      confirmationManager.destroy();
      
      expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', confirmationManager.handleKeyboard);
      
      removeEventListenerSpy.mockRestore();
    });
  });
});

// Integration tests
describe('ConfirmationManager Integration', () => {
  let confirmationManager;
  let mockElements;

  beforeEach(() => {
    mockElements = setupMockDOM();
    
    // Create a real modal manager mock that handles events
    const modalManager = {
      open: jest.fn().mockReturnValue(true),
      close: jest.fn().mockReturnValue(true),
      isOpen: jest.fn().mockReturnValue(true)
    };
    
    confirmationManager = new ConfirmationManager(modalManager);
  });

  afterEach(() => {
    cleanupMockDOM();
  });

  test('should work with actual DOM events', async () => {
    const promise = confirmationManager.show({
      title: 'Test Confirmation',
      message: 'Are you sure?',
      variant: 'danger'
    });

    // Simulate user clicking confirm button
    setTimeout(() => {
      mockElements.confirmBtn.click();
    }, 10);

    const result = await promise;
    expect(result).toBe(true);
  });

  test('should work with cancel button click', async () => {
    const promise = confirmationManager.show();

    // Simulate user clicking cancel button  
    setTimeout(() => {
      mockElements.cancelBtn.click();
    }, 10);

    const result = await promise;
    expect(result).toBe(false);
  });

  test('should work with close button click', async () => {
    const promise = confirmationManager.show();

    // Simulate user clicking close (X) button
    setTimeout(() => {
      mockElements.closeBtn.click();
    }, 10);

    const result = await promise;
    expect(result).toBe(false);
  });
});

// Performance tests
describe('ConfirmationManager Performance', () => {
  let mockModalManager;
  let confirmationManager;

  beforeEach(() => {
    mockModalManager = new MockModalManager();
    setupMockDOM();
    confirmationManager = new ConfirmationManager(mockModalManager);
  });

  afterEach(() => {
    cleanupMockDOM();
  });

  test('should handle rapid successive calls efficiently', async () => {
    const promises = [];
    const start = performance.now();

    // Create 100 rapid successive confirmations
    for (let i = 0; i < 100; i++) {
      promises.push(confirmationManager.show({ message: `Confirmation ${i}` }));
    }

    // Cancel all of them
    confirmationManager.handleCancel();

    // Wait for all to complete
    const results = await Promise.all(promises);

    const end = performance.now();
    const duration = end - start;

    // Should complete within reasonable time (adjust threshold as needed)
    expect(duration).toBeLessThan(100); // 100ms

    // Only the last one should be pending, others auto-cancelled
    expect(results.filter(r => r === false)).toHaveLength(100);
  });

  test('should not leak memory with repeated use', async () => {
    const initialMemory = performance.memory?.usedJSHeapSize || 0;

    // Perform many confirmation operations
    for (let i = 0; i < 50; i++) {
      const promise = confirmationManager.show({ message: `Test ${i}` });
      confirmationManager.handleConfirm();
      await promise;
    }

    const finalMemory = performance.memory?.usedJSHeapSize || 0;
    const memoryIncrease = finalMemory - initialMemory;

    // Memory increase should be minimal (less than 1MB)
    // This is a rough test - actual values will vary
    if (performance.memory) {
      expect(memoryIncrease).toBeLessThan(1000000); // 1MB
    }
  });
});
