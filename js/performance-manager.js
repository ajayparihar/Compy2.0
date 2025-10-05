/**
 * Performance Manager for Expandable Cards
 * 
 * This module detects device capabilities and automatically optimizes
 * blur effects and animations for better performance.
 * 
 * @fileoverview Performance optimization utilities
 * @version 1.0
 * @author Performance Optimization
 */

export class PerformanceManager {
  constructor(options = {}) {
    this.options = {
      autoDetect: true,
      fallbackMode: 'reduced', // 'reduced', 'disabled', 'normal'
      debugMode: false,
      ...options
    };
    
    this.performanceLevel = 'unknown';
    this.isLowPerformance = false;
    this.measurements = {};
    
    if (this.options.autoDetect) {
      this.detectPerformanceLevel();
      this.applyOptimizations();
    }
  }
  
  /**
   * Detect device performance capabilities
   */
  detectPerformanceLevel() {
    const checks = {
      // Hardware checks
      cores: navigator.hardwareConcurrency || 2,
      memory: navigator.deviceMemory || 2,
      
      // Device type checks
      isMobile: /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
      isIOS: /iPhone|iPad|iPod/i.test(navigator.userAgent),
      
      // Browser checks
      supportsBackdropFilter: CSS.supports('backdrop-filter', 'blur(1px)'),
      supportsWillChange: CSS.supports('will-change', 'transform'),
      
      // Performance API checks
      hasPerformanceAPI: 'performance' in window,
      hasObserver: 'PerformanceObserver' in window,
      
      // Connection check (if available)
      connectionSpeed: this.getConnectionSpeed()
    };
    
    // Calculate performance score (0-100)
    let score = 50; // Base score
    
    // CPU cores impact
    if (checks.cores >= 8) score += 20;
    else if (checks.cores >= 4) score += 10;
    else if (checks.cores <= 2) score -= 15;
    
    // Memory impact
    if (checks.memory >= 8) score += 15;
    else if (checks.memory >= 4) score += 5;
    else if (checks.memory <= 2) score -= 20;
    
    // Device type impact
    if (checks.isMobile) score -= 15;
    if (checks.isIOS && !this.isNewDevice()) score -= 10;
    
    // Browser support impact
    if (!checks.supportsBackdropFilter) score -= 25;
    if (!checks.supportsWillChange) score -= 10;
    
    // Connection speed impact
    if (checks.connectionSpeed === 'slow') score -= 10;
    
    // Set performance level
    if (score >= 75) {
      this.performanceLevel = 'high';
    } else if (score >= 50) {
      this.performanceLevel = 'medium';
    } else {
      this.performanceLevel = 'low';
    }
    
    this.isLowPerformance = this.performanceLevel === 'low';
    
    if (this.options.debugMode) {
      console.log('Performance Detection Results:', {
        score,
        level: this.performanceLevel,
        checks,
        isLowPerformance: this.isLowPerformance
      });
    }
  }
  
  /**
   * Get connection speed estimate
   */
  getConnectionSpeed() {
    const connection = navigator.connection || 
                      navigator.mozConnection || 
                      navigator.webkitConnection;
    
    if (!connection) return 'unknown';
    
    const effectiveType = connection.effectiveType;
    if (effectiveType === 'slow-2g' || effectiveType === '2g') {
      return 'slow';
    } else if (effectiveType === '3g') {
      return 'medium';
    } else {
      return 'fast';
    }
  }
  
  /**
   * Check if iOS device is relatively new
   */
  isNewDevice() {
    const ua = navigator.userAgent;
    if (/iPhone/.test(ua)) {
      const match = ua.match(/iPhone OS (\d+)_/);
      const version = match ? parseInt(match[1]) : 0;
      return version >= 13; // iOS 13+ generally have better performance
    }
    return true; // Assume newer for non-iPhone iOS devices
  }
  
  /**
   * Apply performance optimizations based on detected level
   */
  applyOptimizations() {
    const body = document.body;
    
    // Remove any existing performance classes
    body.classList.remove('performance-mode', 'reduced-motion', 'high-performance');
    
    switch (this.performanceLevel) {
      case 'high':
        body.classList.add('high-performance');
        this.enableHighPerformanceMode();
        break;
        
      case 'medium':
        this.enableMediumPerformanceMode();
        break;
        
      case 'low':
        body.classList.add('performance-mode');
        this.enableLowPerformanceMode();
        break;
    }
    
    // Also check for user preferences
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      body.classList.add('reduced-motion');
      this.disableAnimations();
    }
  }
  
  /**
   * Enable high performance mode with full effects
   */
  enableHighPerformanceMode() {
    // Allow all effects, potentially enable enhanced features
    this.updateCSSVariables({
      '--modal-bg-blur': '4px',
      '--modal-backdrop-blur': '12px',
      '--expandable-backdrop-blur': '2px'
    });
  }
  
  /**
   * Enable medium performance mode with reduced effects
   */
  enableMediumPerformanceMode() {
    // Reduce blur intensity but keep effects
    this.updateCSSVariables({
      '--modal-bg-blur': '2px',
      '--modal-backdrop-blur': '6px',
      '--expandable-backdrop-blur': '1px'
    });
  }
  
  /**
   * Enable low performance mode with minimal effects
   */
  enableLowPerformanceMode() {
    // Minimize or disable effects
    this.updateCSSVariables({
      '--modal-bg-blur': '0px',
      '--modal-backdrop-blur': '0px',
      '--expandable-backdrop-blur': '0px'
    });
    
    // Add performance optimizations
    this.addPerformanceStyles();
  }
  
  /**
   * Disable animations for reduced motion
   */
  disableAnimations() {
    this.addGlobalStyle(`
      .reduced-motion *,
      .reduced-motion *:before,
      .reduced-motion *:after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
      }
    `);
  }
  
  /**
   * Update CSS custom properties
   */
  updateCSSVariables(variables) {
    const root = document.documentElement;
    Object.entries(variables).forEach(([property, value]) => {
      root.style.setProperty(property, value);
    });
  }
  
  /**
   * Add performance optimization styles
   */
  addPerformanceStyles() {
    this.addGlobalStyle(`
      /* Performance mode optimizations */
      .performance-mode .expandable-card-backdrop {
        backdrop-filter: none !important;
        -webkit-backdrop-filter: none !important;
        background: rgba(0, 0, 0, 0.7) !important;
        transition: opacity 120ms ease !important;
      }
      
      .performance-mode body.modal-open .navbar,
      .performance-mode body.modal-open main,
      .performance-mode body.modal-open #main,
      .performance-mode body.modal-open .cards,
      .performance-mode body.modal-open .fab-add,
      .performance-mode body.modal-open .nav-backdrop {
        filter: none !important;
        -webkit-filter: none !important;
        transition: none !important;
      }
      
      .performance-mode .expandable-card.expanded {
        transition: all 200ms ease !important;
      }
      
      .performance-mode .modal-content {
        backdrop-filter: none !important;
        -webkit-backdrop-filter: none !important;
      }
    `);
  }
  
  /**
   * Add global style to document
   */
  addGlobalStyle(css) {
    const style = document.createElement('style');
    style.textContent = css;
    style.setAttribute('data-performance-manager', '');
    document.head.appendChild(style);
  }
  
  /**
   * Measure animation performance
   */
  measureAnimationPerformance(animationName, callback) {
    if (!('performance' in window)) return;
    
    const startTime = performance.now();
    
    // Execute the animation/operation
    if (callback) callback();
    
    // Measure after next frame
    requestAnimationFrame(() => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      this.measurements[animationName] = {
        duration,
        timestamp: Date.now(),
        performanceLevel: this.performanceLevel
      };
      
      if (this.options.debugMode) {
        console.log(`Animation "${animationName}" took ${duration.toFixed(2)}ms`);
      }
      
      // Auto-adjust if performance is poor
      if (duration > 500) { // More than 500ms indicates poor performance
        this.handlePoorPerformance(animationName);
      }
    });
  }
  
  /**
   * Handle poor performance detection
   */
  handlePoorPerformance(animationName) {
    console.warn(`Poor performance detected for ${animationName}. Enabling performance mode.`);
    
    if (!document.body.classList.contains('performance-mode')) {
      document.body.classList.add('performance-mode');
      this.enableLowPerformanceMode();
    }
  }
  
  /**
   * Get current performance status
   */
  getStatus() {
    return {
      level: this.performanceLevel,
      isLowPerformance: this.isLowPerformance,
      measurements: this.measurements,
      optimizationsApplied: document.body.classList.contains('performance-mode')
    };
  }
  
  /**
   * Manually override performance mode
   */
  setPerformanceMode(mode) {
    this.performanceLevel = mode;
    this.isLowPerformance = mode === 'low';
    this.applyOptimizations();
  }
  
  /**
   * Clean up performance manager
   */
  destroy() {
    // Remove added styles
    const styles = document.querySelectorAll('style[data-performance-manager]');
    styles.forEach(style => style.remove());
    
    // Remove performance classes
    document.body.classList.remove('performance-mode', 'reduced-motion', 'high-performance');
  }
}

/**
 * Quick setup function for immediate use
 */
export function initPerformanceOptimization(options = {}) {
  const manager = new PerformanceManager(options);
  
  // Make it globally accessible for debugging
  if (options.debugMode) {
    window.performanceManager = manager;
  }
  
  return manager;
}

/**
 * Immediate performance fix for blur issues
 * Call this as soon as possible in your app initialization
 */
export function quickPerformanceFix() {
  // Detect basic performance indicators
  const isLowPerformance = (
    (navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4) ||
    (navigator.deviceMemory && navigator.deviceMemory < 4) ||
    /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    !CSS.supports('backdrop-filter', 'blur(1px)')
  );
  
  if (isLowPerformance) {
    document.body.classList.add('performance-mode');
    console.log('Applied quick performance fix for low-end device');
  }
  
  // Handle reduced motion preference
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.body.classList.add('reduced-motion');
  }
}

// Auto-initialize if script is loaded directly
if (typeof window !== 'undefined' && !window.skipAutoPerformanceInit) {
  // Apply quick fix immediately
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => quickPerformanceFix());
  } else {
    quickPerformanceFix();
  }
}