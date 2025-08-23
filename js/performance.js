/**
 * Performance Optimization Utilities for Compy 2.0
 * 
 * This module provides a comprehensive set of performance optimization tools
 * designed to improve the user experience of the Compy 2.0 application. These
 * utilities help reduce memory usage, improve scroll performance, and manage
 * DOM operations efficiently.
 * 
 * Key Features:
 * - Lazy loading with Intersection Observer API
 * - Virtual scrolling for large lists
 * - Animation frame-based task scheduling
 * - DOM operation batching to prevent layout thrashing
 * - Event delegation for memory efficiency
 * - Resource preloading and caching
 * 
 * @fileoverview Advanced performance optimization utilities
 * @version 2.0
 * @author Bheb Developer
 * @since 2025
 */

// =============================================================================
// LAZY LOADING UTILITIES
// =============================================================================

/**
 * Lazy Loading Implementation using Intersection Observer
 * 
 * This class provides efficient lazy loading functionality for images, content,
 * or any custom loading operations. It uses the modern Intersection Observer API
 * to detect when elements come into view, providing better performance than
 * traditional scroll-based lazy loading.
 * 
 * Features:
 * - Configurable root margin and thresholds
 * - Support for both image lazy loading and custom load functions
 * - Memory efficient using WeakSet for loaded elements tracking
 * - Automatic cleanup after loading
 * 
 * Use Cases:
 * - Lazy loading images in large lists
 * - Deferring expensive DOM operations until needed
 * - Progressive content loading as user scrolls
 * - Reducing initial page load time
 * 
 * @class LazyLoader
 * @example
 * // Basic image lazy loading
 * const loader = new LazyLoader();
 * document.querySelectorAll('img[data-src]').forEach(img => {
 *   loader.observe(img);
 * });
 * 
 * // Custom loading with callback
 * const loader = new LazyLoader({ rootMargin: '100px' });
 * loader.observe(element, (el) => {
 *   // Custom loading logic
 *   el.innerHTML = generateExpensiveContent();
 * });
 */
export class LazyLoader {
  /**
   * Initialize the lazy loader with configuration options
   * 
   * @param {Object} [options={}] - Configuration options
   * @param {string} [options.rootMargin='50px'] - Margin around root for intersection
   * @param {number} [options.threshold=0.1] - Percentage of element visibility to trigger loading
   * @param {Element} [options.root=null] - Root element for intersection (null = viewport)
   */
  constructor(options = {}) {
    // Merge user options with sensible defaults
    this.options = {
      rootMargin: '50px',    // Load elements 50px before they become visible
      threshold: 0.1,        // Trigger when 10% of element is visible
      ...options
    };
    
    // Create Intersection Observer with bound callback
    this.observer = new IntersectionObserver(
      this.handleIntersection.bind(this), 
      this.options
    );
    
    // Track loaded elements to prevent duplicate loading
    // WeakSet automatically handles garbage collection
    this.loadedElements = new WeakSet();
  }

  /**
   * Handle intersection events from the observer
   * 
   * This callback is triggered whenever observed elements enter or leave
   * the intersection threshold. It only processes elements that are entering
   * the viewport and haven't been loaded yet.
   * 
   * @param {IntersectionObserverEntry[]} entries - Array of intersection entries
   * @private
   */
  handleIntersection(entries) {
    entries.forEach(entry => {
      // Only process elements entering the viewport that haven't been loaded
      if (entry.isIntersecting && !this.loadedElements.has(entry.target)) {
        // Trigger the loading process
        this.loadElement(entry.target);
        
        // Mark element as loaded to prevent duplicate loading
        this.loadedElements.add(entry.target);
        
        // Stop observing this element (cleanup)
        this.observer.unobserve(entry.target);
      }
    });
  }

  /**
   * Load an element using either custom function or default image loading
   * 
   * This method supports two loading mechanisms:
   * 1. Custom loading function attached to the element
   * 2. Default image loading using data-src attribute
   * 
   * @param {Element} element - Element to load
   * @private
   */
  loadElement(element) {
    // Check for custom loading function first
    const loadFn = element._lazyLoadFn;
    if (loadFn) {
      // Execute custom loading function
      loadFn(element);
    } else if (element.dataset.src) {
      // Default image loading: move data-src to src
      element.src = element.dataset.src;
      element.removeAttribute('data-src');
    }
  }

  /**
   * Start observing an element for lazy loading
   * 
   * @param {Element} element - Element to observe
   * @param {Function} [loadFn=null] - Optional custom loading function
   * 
   * @example
   * // Observe image with data-src
   * loader.observe(imgElement);
   * 
   * // Observe with custom loading function
   * loader.observe(element, (el) => {
   *   el.innerHTML = '<p>Content loaded!</p>';
   * });
   */
  observe(element, loadFn = null) {
    // Attach custom loading function if provided
    if (loadFn) {
      element._lazyLoadFn = loadFn;
    }
    
    // Start observing the element
    this.observer.observe(element);
  }

  /**
   * Stop observing a specific element
   * 
   * @param {Element} element - Element to stop observing
   */
  unobserve(element) {
    this.observer.unobserve(element);
  }

  /**
   * Disconnect the observer and clean up resources
   * 
   * Call this when the lazy loader is no longer needed to prevent
   * memory leaks and free up resources.
   */
  disconnect() {
    this.observer.disconnect();
    this.loadedElements = new WeakSet();
  }
}

// =============================================================================
// VIRTUAL SCROLLING UTILITIES
// =============================================================================

/**
 * Virtual Scrolling Implementation for Large Lists
 * 
 * Virtual scrolling is a technique for handling very large lists efficiently
 * by only rendering the items that are currently visible in the viewport.
 * This dramatically reduces DOM nodes and improves performance for lists
 * with thousands of items.
 * 
 * How it works:
 * 1. Calculate which items should be visible based on scroll position
 * 2. Render only visible items plus a small buffer
 * 3. Position items absolutely to maintain scroll appearance
 * 4. Update rendered items as user scrolls
 * 
 * Performance Benefits:
 * - Constant rendering performance regardless of list size
 * - Reduced memory usage (fewer DOM nodes)
 * - Smooth scrolling even with 10,000+ items
 * - Better browser responsiveness
 * 
 * @class VirtualScroller
 * @example
 * const scroller = new VirtualScroller(container, {
 *   itemHeight: 80,
 *   bufferSize: 10
 * });
 * 
 * scroller.setItems(largeItemArray, (item, index) => {
 *   const div = document.createElement('div');
 *   div.textContent = item.name;
 *   return div;
 * });
 */
export class VirtualScroller {
  /**
   * Initialize virtual scroller
   * 
   * @param {Element} container - Container element for the virtual list
   * @param {Object} [options={}] - Configuration options
   * @param {number} [options.itemHeight=100] - Fixed height of each item in pixels
   * @param {number} [options.bufferSize=5] - Number of extra items to render outside viewport
   */
  constructor(container, options = {}) {
    this.container = container;
    this.options = {
      itemHeight: 100,      // Fixed height per item (required for calculations)
      bufferSize: 5,        // Extra items to render for smooth scrolling
      ...options
    };
    
    // Initialize state
    this.items = [];           // Data items to virtualize
    this.visibleItems = [];    // Currently rendered items
    this.scrollTop = 0;        // Current scroll position
    this.containerHeight = 0;  // Container viewport height
    
    this.init();
  }

  /**
   * Initialize the virtual scroller setup
   * 
   * Sets up the container styling, creates viewport element,
   * and attaches necessary event listeners.
   * 
   * @private
   */
  init() {
    // Setup container for virtual scrolling
    this.container.style.position = 'relative';
    this.container.style.overflow = 'auto';
    
    // Create viewport element for rendered items
    this.viewport = document.createElement('div');
    this.viewport.style.position = 'absolute';
    this.viewport.style.top = '0';
    this.viewport.style.left = '0';
    this.viewport.style.right = '0';
    this.container.appendChild(this.viewport);
    
    // Attach scroll listener for viewport updates
    this.container.addEventListener('scroll', this.handleScroll.bind(this));
    
    // Setup resize observer if available (for responsive layouts)
    if (window.ResizeObserver) {
      this.resizeObserver = new ResizeObserver(this.handleResize.bind(this));
      this.resizeObserver.observe(this.container);
    }
  }

  /**
   * Handle scroll events to update visible items
   * 
   * @private
   */
  handleScroll() {
    this.scrollTop = this.container.scrollTop;
    this.render();
  }

  /**
   * Handle container resize events
   * 
   * @private
   */
  handleResize() {
    this.containerHeight = this.container.clientHeight;
    this.render();
  }

  /**
   * Set the items and render function for virtual scrolling
   * 
   * @param {Array} items - Array of data items to virtualize
   * @param {Function} renderFn - Function to render each item (item, index) => Element
   * 
   * @example
   * scroller.setItems(users, (user, index) => {
   *   const div = document.createElement('div');
   *   div.innerHTML = `<h3>${user.name}</h3><p>${user.email}</p>`;
   *   return div;
   * });
   */
  setItems(items, renderFn) {
    this.items = items;
    this.renderItem = renderFn;
    
    // Update container total height based on item count
    const totalHeight = items.length * this.options.itemHeight;
    this.container.style.height = `${totalHeight}px`;
    
    // Initial render
    this.render();
  }

  /**
   * Render the currently visible items
   * 
   * Calculates which items should be visible based on scroll position
   * and renders them in the correct positions.
   * 
   * @private
   */
  render() {
    const { itemHeight, bufferSize } = this.options;
    const containerHeight = this.containerHeight || this.container.clientHeight;
    
    // Calculate visible range with buffer
    const startIndex = Math.max(0, 
      Math.floor(this.scrollTop / itemHeight) - bufferSize
    );
    const endIndex = Math.min(this.items.length - 1, 
      Math.floor((this.scrollTop + containerHeight) / itemHeight) + bufferSize
    );

    // Clear viewport
    this.viewport.innerHTML = '';
    
    // Render visible items with absolute positioning
    for (let i = startIndex; i <= endIndex; i++) {
      const item = this.items[i];
      const element = this.renderItem(item, i);
      
      // Position element absolutely based on item index
      element.style.position = 'absolute';
      element.style.top = `${i * itemHeight}px`;
      element.style.height = `${itemHeight}px`;
      element.style.width = '100%';
      
      this.viewport.appendChild(element);
    }
  }

  /**
   * Clean up and destroy the virtual scroller
   * 
   * Removes event listeners and cleans up resources.
   */
  destroy() {
    // Remove event listeners
    this.container.removeEventListener('scroll', this.handleScroll.bind(this));
    
    // Disconnect resize observer
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    
    // Remove viewport element
    this.viewport.remove();
  }
}

// =============================================================================
// TASK SCHEDULING AND ANIMATION FRAME UTILITIES
// =============================================================================

/**
 * Request Animation Frame-based Task Scheduler
 * 
 * This scheduler manages task execution using requestAnimationFrame to ensure
 * smooth performance and maintain 60fps frame rates. It's perfect for breaking
 * down heavy operations into smaller chunks that don't block the main thread.
 * 
 * Features:
 * - Priority-based task ordering
 * - Time-sliced execution (16ms budget per frame)
 * - Automatic frame scheduling
 * - Error handling for individual tasks
 * 
 * Use Cases:
 * - Breaking down large data processing operations
 * - Rendering large lists without blocking UI
 * - Smooth animations and transitions
 * - Background processing tasks
 * 
 * @class TaskScheduler
 * @example
 * const scheduler = new TaskScheduler();
 * 
 * // Schedule high-priority task
 * scheduler.schedule(() => {
 *   updateCriticalUI();
 * }, 10);
 * 
 * // Schedule normal priority task
 * scheduler.schedule(() => {
 *   processBackgroundData();
 * }, 0);
 */
export class TaskScheduler {
  /**
   * Initialize task scheduler
   */
  constructor() {
    this.tasks = [];        // Queue of pending tasks
    this.isRunning = false; // Flag to prevent multiple execution loops
  }

  /**
   * Schedule a task to run in upcoming animation frames
   * 
   * Tasks are sorted by priority (higher numbers run first) and executed
   * in time-sliced chunks to maintain smooth frame rates.
   * 
   * @param {Function} task - Function to execute
   * @param {number} [priority=0] - Task priority (higher = more urgent)
   * 
   * @example
   * // High priority UI update
   * scheduler.schedule(() => updateUI(), 10);
   * 
   * // Background processing
   * scheduler.schedule(() => processData(), 1);
   */
  schedule(task, priority = 0) {
    // Add task to queue with priority
    this.tasks.push({ task, priority });
    
    // Sort by priority (descending - higher priorities first)
    this.tasks.sort((a, b) => b.priority - a.priority);
    
    // Start processing if not already running
    if (!this.isRunning) {
      this.start();
    }
  }

  /**
   * Start the task processing loop
   * 
   * @private
   */
  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.processTasks();
  }

  /**
   * Process tasks within animation frame budget
   * 
   * Uses time-slicing to execute as many tasks as possible within the
   * 16ms frame budget (to maintain 60fps). Continues in next frame if
   * more tasks remain.
   * 
   * @private
   */
  processTasks() {
    // Stop if no tasks remaining
    if (this.tasks.length === 0) {
      this.isRunning = false;
      return;
    }

    requestAnimationFrame(() => {
      const startTime = performance.now();
      const maxTime = 16; // 16ms budget for 60fps
      
      // Execute tasks until time budget is exhausted
      while (this.tasks.length > 0 && (performance.now() - startTime) < maxTime) {
        const { task } = this.tasks.shift();
        
        try {
          task();
        } catch (error) {
          console.error('TaskScheduler: Task execution failed:', error);
          // Continue with other tasks even if one fails
        }
      }
      
      // Continue processing in next frame if tasks remain
      this.processTasks();
    });
  }

  /**
   * Clear all scheduled tasks
   * 
   * Useful for cleanup or canceling pending operations.
   */
  clear() {
    this.tasks = [];
  }
}

// =============================================================================
// DOM BATCHING UTILITIES
// =============================================================================

/**
 * DOM Operation Batcher for Layout Thrashing Prevention
 * 
 * This utility prevents layout thrashing by batching DOM read and write
 * operations and executing them in the optimal order. All reads are performed
 * first, followed by all writes, within a single animation frame.
 * 
 * Layout Thrashing occurs when:
 * 1. Read DOM property (forces layout calculation)
 * 2. Write DOM property (invalidates layout)
 * 3. Read DOM property again (forces layout recalculation)
 * 
 * The batcher solves this by separating reads from writes.
 * 
 * @class DOMBatcher
 * @example
 * const batcher = new DOMBatcher();
 * 
 * // Schedule reads
 * batcher.read(() => {
 *   const height = element.offsetHeight;
 *   console.log('Height:', height);
 * });
 * 
 * // Schedule writes
 * batcher.write(() => {
 *   element.style.height = '200px';
 * });
 */
export class DOMBatcher {
  /**
   * Initialize DOM batcher
   */
  constructor() {
    this.reads = [];         // Queue of DOM read operations
    this.writes = [];        // Queue of DOM write operations
    this.scheduled = false;  // Flag to prevent duplicate scheduling
  }

  /**
   * Schedule a DOM read operation
   * 
   * Read operations access DOM properties that may trigger layout calculations.
   * Examples: offsetWidth, offsetHeight, getComputedStyle, getBoundingClientRect
   * 
   * @param {Function} fn - Function performing DOM reads
   * 
   * @example
   * batcher.read(() => {
   *   const rect = element.getBoundingClientRect();
   *   console.log('Element position:', rect.x, rect.y);
   * });
   */
  read(fn) {
    this.reads.push(fn);
    this.schedule();
  }

  /**
   * Schedule a DOM write operation
   * 
   * Write operations modify DOM properties that invalidate layout.
   * Examples: style.width, style.height, classList.add, innerHTML
   * 
   * @param {Function} fn - Function performing DOM writes
   * 
   * @example
   * batcher.write(() => {
   *   element.style.transform = 'translateX(100px)';
   *   element.classList.add('active');
   * });
   */
  write(fn) {
    this.writes.push(fn);
    this.schedule();
  }

  /**
   * Schedule batch processing for next animation frame
   * 
   * @private
   */
  schedule() {
    if (this.scheduled) return;
    
    this.scheduled = true;
    requestAnimationFrame(() => {
      this.flush();
    });
  }

  /**
   * Execute all batched operations in optimal order
   * 
   * Executes all reads first to get consistent measurements,
   * then all writes to apply changes efficiently.
   * 
   * @private
   */
  flush() {
    // Execute all reads first to avoid layout thrashing
    this.reads.forEach(read => {
      try {
        read();
      } catch (error) {
        console.error('DOMBatcher: Read operation failed:', error);
      }
    });

    // Then execute all writes
    this.writes.forEach(write => {
      try {
        write();
      } catch (error) {
        console.error('DOMBatcher: Write operation failed:', error);
      }
    });

    // Reset for next batch
    this.reads = [];
    this.writes = [];
    this.scheduled = false;
  }
}

// =============================================================================
// EVENT DELEGATION UTILITIES
// =============================================================================

/**
 * Memory Efficient Event Delegation System
 * 
 * Event delegation reduces memory usage by using a single event listener
 * on a parent element to handle events for multiple child elements.
 * This is especially beneficial for dynamic content where elements are
 * frequently added or removed.
 * 
 * Benefits:
 * - Reduced memory footprint (fewer event listeners)
 * - Works with dynamically added elements
 * - Better performance for large lists
 * - Automatic cleanup when elements are removed
 * 
 * @class EventDelegator
 * @example
 * const delegator = new EventDelegator(document.body);
 * 
 * // Handle clicks on any button
 * delegator.on('click', 'button.action', (event, element) => {
 *   console.log('Button clicked:', element.textContent);
 * });
 * 
 * // Handle hover on cards
 * delegator.on('mouseenter', '.card', (event, element) => {
 *   element.classList.add('hovered');
 * });
 */
export class EventDelegator {
  /**
   * Initialize event delegator
   * 
   * @param {Element} [root=document] - Root element for event delegation
   */
  constructor(root = document) {
    this.root = root;                    // Root element for delegation
    this.handlers = new Map();           // Map of event types to handlers
  }

  /**
   * Add delegated event listener
   * 
   * @param {string} eventType - Event type (e.g., 'click', 'mouseenter')
   * @param {string} selector - CSS selector for target elements
   * @param {Function} handler - Event handler function (event, target) => void
   * 
   * @example
   * // Handle clicks on delete buttons
   * delegator.on('click', '[data-action="delete"]', (event, button) => {
   *   const itemId = button.dataset.itemId;
   *   deleteItem(itemId);
   * });
   */
  on(eventType, selector, handler) {
    // Initialize event type map if needed
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Map());
      // Add single listener for this event type
      this.root.addEventListener(eventType, this.handleEvent.bind(this, eventType));
    }
    
    // Store handler for this selector
    this.handlers.get(eventType).set(selector, handler);
  }

  /**
   * Remove delegated event listener
   * 
   * @param {string} eventType - Event type to remove
   * @param {string} selector - CSS selector to stop handling
   */
  off(eventType, selector) {
    const eventHandlers = this.handlers.get(eventType);
    if (eventHandlers) {
      eventHandlers.delete(selector);
      
      // Remove event listener if no handlers remain
      if (eventHandlers.size === 0) {
        this.handlers.delete(eventType);
        this.root.removeEventListener(eventType, this.handleEvent.bind(this, eventType));
      }
    }
  }

  /**
   * Handle delegated events by matching selectors
   * 
   * @param {string} eventType - Type of event that occurred
   * @param {Event} event - Event object
   * @private
   */
  handleEvent(eventType, event) {
    const eventHandlers = this.handlers.get(eventType);
    if (!eventHandlers) return;
    
    // Check each registered selector against the event target
    for (const [selector, handler] of eventHandlers) {
      const target = event.target.closest(selector);
      if (target) {
        handler(event, target);
      }
    }
  }

  /**
   * Clean up and remove all event listeners
   */
  destroy() {
    for (const eventType of this.handlers.keys()) {
      this.root.removeEventListener(eventType, this.handleEvent.bind(this, eventType));
    }
    this.handlers.clear();
  }
}

// =============================================================================
// RESOURCE PRELOADING UTILITIES
// =============================================================================

/**
 * Resource Preloader with Intelligent Caching
 * 
 * This utility preloads and caches resources (images, JSON, etc.) to improve
 * perceived performance. It prevents duplicate requests and provides a simple
 * interface for resource management.
 * 
 * Features:
 * - Prevents duplicate requests for the same resource
 * - Supports different resource types (image, JSON, generic)
 * - Intelligent waiting for ongoing requests
 * - Memory-efficient caching with Map
 * 
 * @class ResourcePreloader
 * @example
 * const preloader = new ResourcePreloader();
 * 
 * // Preload images
 * await preloader.preload('/images/hero.jpg', 'image');
 * 
 * // Preload JSON data
 * const data = await preloader.preload('/api/config', 'json');
 * 
 * // Get cached resource
 * const cachedImage = preloader.get('/images/hero.jpg');
 */
export class ResourcePreloader {
  /**
   * Initialize resource preloader
   */
  constructor() {
    this.cache = new Map();      // Cache for loaded resources
    this.loading = new Set();    // Track currently loading resources
  }

  /**
   * Preload a resource and cache it
   * 
   * @param {string} url - Resource URL to preload
   * @param {string} [type='fetch'] - Resource type: 'image', 'json', or 'fetch'
   * @returns {Promise} Promise resolving to the loaded resource
   * 
   * @example
   * // Preload and cache an image
   * const image = await preloader.preload('/hero.jpg', 'image');
   * 
   * // Preload JSON configuration
   * const config = await preloader.preload('/config.json', 'json');
   */
  async preload(url, type = 'fetch') {
    // Return cached resource if available
    if (this.cache.has(url)) {
      return this.cache.get(url);
    }

    // Wait for existing load if in progress
    if (this.loading.has(url)) {
      return new Promise(resolve => {
        const check = () => {
          if (this.cache.has(url)) {
            resolve(this.cache.get(url));
          } else {
            setTimeout(check, 10);
          }
        };
        check();
      });
    }

    // Mark as loading to prevent duplicates
    this.loading.add(url);

    try {
      let resource;
      
      // Load resource based on type
      switch (type) {
        case 'image':
          resource = await this.preloadImage(url);
          break;
        case 'json':
          resource = await this.preloadJSON(url);
          break;
        default:
          resource = await this.preloadGeneric(url);
      }
      
      // Cache the loaded resource
      this.cache.set(url, resource);
      return resource;
      
    } finally {
      // Always cleanup loading flag
      this.loading.delete(url);
    }
  }

  /**
   * Preload an image resource
   * 
   * @param {string} url - Image URL
   * @returns {Promise<HTMLImageElement>} Promise resolving to loaded image
   * @private
   */
  preloadImage(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });
  }

  /**
   * Preload and parse JSON resource
   * 
   * @param {string} url - JSON URL
   * @returns {Promise<any>} Promise resolving to parsed JSON data
   * @private
   */
  async preloadJSON(url) {
    const response = await fetch(url);
    return response.json();
  }

  /**
   * Preload generic resource using fetch
   * 
   * @param {string} url - Resource URL
   * @returns {Promise<Response>} Promise resolving to fetch response
   * @private
   */
  async preloadGeneric(url) {
    return fetch(url);
  }

  /**
   * Get cached resource without loading
   * 
   * @param {string} url - Resource URL
   * @returns {any|undefined} Cached resource or undefined if not cached
   */
  get(url) {
    return this.cache.get(url);
  }

  /**
   * Clear all cached resources
   * 
   * Useful for memory management or cache invalidation.
   */
  clear() {
    this.cache.clear();
    this.loading.clear();
  }
}

// =============================================================================
// UTILITY FACTORY FUNCTION
// =============================================================================

/**
 * Create a collection of performance utilities
 * 
 * This factory function creates instances of all performance utilities
 * with sensible defaults, providing a convenient way to access all
 * performance tools in a single object.
 * 
 * @returns {Object} Object containing all performance utility instances
 * 
 * @example
 * const perf = createPerformanceUtils();
 * 
 * // Use lazy loader
 * perf.lazyLoader.observe(imageElement);
 * 
 * // Schedule tasks
 * perf.taskScheduler.schedule(() => processData(), 5);
 * 
 * // Batch DOM operations
 * perf.domBatcher.read(() => console.log(element.offsetWidth));
 * perf.domBatcher.write(() => element.style.width = '200px');
 * 
 * // Delegate events
 * perf.eventDelegator.on('click', '.button', handleClick);
 * 
 * // Preload resources
 * await perf.resourcePreloader.preload('/image.jpg', 'image');
 */
export const createPerformanceUtils = () => ({
  lazyLoader: new LazyLoader(),
  taskScheduler: new TaskScheduler(),
  domBatcher: new DOMBatcher(),
  eventDelegator: new EventDelegator(),
  resourcePreloader: new ResourcePreloader()
});
