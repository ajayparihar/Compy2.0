/**
 * Compy 2.0 - Main Entry Point
 * Simple initialization without complex scaffolding
 */

import { initializeApp } from './app.js';

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
  try {
    console.log('Starting Compy 2.0...');
    await initializeApp();
    console.log('Compy 2.0 started successfully!');
  } catch (error) {
    console.error('Failed to initialize Compy 2.0:', error);
    
    // Show simple error message
    const errorMsg = 'Failed to start Compy 2.0. Please refresh the page or clear browser data if the problem persists.';
    
    if (confirm(`${errorMsg}\n\nWould you like to refresh now?`)) {
      location.reload();
    }
  }
});
