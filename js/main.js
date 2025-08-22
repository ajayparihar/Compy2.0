// Entry point for Compy 2.0 UI bootstrap
// Defers initialization until DOM content is loaded to ensure elements are available
import { initializeApp } from './app.js';

document.addEventListener('DOMContentLoaded', () => {
  initializeApp();
});
