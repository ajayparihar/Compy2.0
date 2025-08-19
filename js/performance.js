/**
 * Performance optimization utilities
 * Includes lazy loading, virtual scrolling, and other performance enhancements
 */

/**
 * Intersection Observer for lazy loading elements
 */
export class LazyLoader {
  constructor(options = {}) {
    this.options = {
      rootMargin: '50px',
      threshold: 0.1,
      ...options
    };
    
    this.observer = new IntersectionObserver(this.handleIntersection.bind(this), this.options);
    this.loadedElements = new WeakSet();
  }

  /**
   * Handle intersection events
   */
  handleIntersection(entries) {
    entries.forEach(entry => {
      if (entry.isIntersecting && !this.loadedElements.has(entry.target)) {
        this.loadElement(entry.target);
        this.loadedElements.add(entry.target);
        this.observer.unobserve(entry.target);
      }
    });
  }

  /**
   * Load an element (trigger custom load function or data-src)
   */
  loadElement(element) {
    const loadFn = element._lazyLoadFn;
    if (loadFn) {
      loadFn(element);
    } else if (element.dataset.src) {
      element.src = element.dataset.src;
      element.removeAttribute('data-src');
    }
  }

  /**
   * Observe element for lazy loading
   */
  observe(element, loadFn = null) {
    if (loadFn) {
      element._lazyLoadFn = loadFn;
    }
    this.observer.observe(element);
  }

  /**
   * Stop observing element
   */
  unobserve(element) {
    this.observer.unobserve(element);
  }

  /**
   * Disconnect observer
   */
  disconnect() {
    this.observer.disconnect();
    this.loadedElements = new WeakSet();
  }
}

/**
 * Virtual scrolling implementation for large lists
 */
export class VirtualScroller {
  constructor(container, options = {}) {
    this.container = container;
    this.options = {
      itemHeight: 100,
      bufferSize: 5,
      ...options
    };
    
    this.items = [];
    this.visibleItems = [];
    this.scrollTop = 0;
    this.containerHeight = 0;
    
    this.init();
  }

  /**
   * Initialize virtual scroller
   */
  init() {
    this.container.style.position = 'relative';
    this.container.style.overflow = 'auto';
    
    // Create viewport element
    this.viewport = document.createElement('div');
    this.viewport.style.position = 'absolute';
    this.viewport.style.top = '0';
    this.viewport.style.left = '0';
    this.viewport.style.right = '0';
    this.container.appendChild(this.viewport);
    
    // Add scroll listener
    this.container.addEventListener('scroll', this.handleScroll.bind(this));
    
    // Observe container resize
    if (window.ResizeObserver) {
      this.resizeObserver = new ResizeObserver(this.handleResize.bind(this));
      this.resizeObserver.observe(this.container);
    }
  }

  /**
   * Handle scroll events
   */
  handleScroll() {
    this.scrollTop = this.container.scrollTop;
    this.render();
  }

  /**
   * Handle container resize
   */
  handleResize() {
    this.containerHeight = this.container.clientHeight;
    this.render();
  }

  /**
   * Set items to display
   */
  setItems(items, renderFn) {
    this.items = items;
    this.renderItem = renderFn;
    
    // Update total height
    const totalHeight = items.length * this.options.itemHeight;
    this.container.style.height = `${totalHeight}px`;
    
    this.render();
  }

  /**
   * Render visible items
   */
  render() {
    const { itemHeight, bufferSize } = this.options;
    const containerHeight = this.containerHeight || this.container.clientHeight;
    
    const startIndex = Math.max(0, 
      Math.floor(this.scrollTop / itemHeight) - bufferSize
    );
    const endIndex = Math.min(this.items.length - 1, 
      Math.floor((this.scrollTop + containerHeight) / itemHeight) + bufferSize
    );

    // Clear viewport
    this.viewport.innerHTML = '';
    
    // Render visible items
    for (let i = startIndex; i <= endIndex; i++) {
      const item = this.items[i];
      const element = this.renderItem(item, i);
      
      element.style.position = 'absolute';
      element.style.top = `${i * itemHeight}px`;
      element.style.height = `${itemHeight}px`;
      element.style.width = '100%';
      
      this.viewport.appendChild(element);
    }
  }

  /**
   * Destroy virtual scroller
   */
  destroy() {
    this.container.removeEventListener('scroll', this.handleScroll.bind(this));
    
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    
    this.viewport.remove();
  }
}

/**
 * Request Animation Frame scheduler for smooth operations
 */
export class TaskScheduler {
  constructor() {
    this.tasks = [];
    this.isRunning = false;
  }

  /**
   * Schedule a task to run in the next animation frame
   */
  schedule(task, priority = 0) {
    this.tasks.push({ task, priority });
    this.tasks.sort((a, b) => b.priority - a.priority);
    
    if (!this.isRunning) {
      this.start();
    }
  }

  /**
   * Start processing tasks
   */
  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.processTasks();
  }

  /**
   * Process tasks in animation frames
   */
  processTasks() {
    if (this.tasks.length === 0) {
      this.isRunning = false;
      return;
    }

    requestAnimationFrame(() => {
      const startTime = performance.now();
      const maxTime = 16; // Target 60fps
      
      while (this.tasks.length > 0 && (performance.now() - startTime) < maxTime) {
        const { task } = this.tasks.shift();
        try {
          task();
        } catch (error) {
          console.error('Task execution failed:', error);
        }
      }
      
      this.processTasks();
    });
  }

  /**
   * Clear all scheduled tasks
   */
  clear() {
    this.tasks = [];
  }
}

/**
 * Efficient DOM batch operations
 */
export class DOMBatcher {
  constructor() {
    this.reads = [];
    this.writes = [];
    this.scheduled = false;
  }

  /**
   * Schedule a DOM read operation
   */
  read(fn) {
    this.reads.push(fn);
    this.schedule();
  }

  /**
   * Schedule a DOM write operation
   */
  write(fn) {
    this.writes.push(fn);
    this.schedule();
  }

  /**
   * Schedule batch processing
   */
  schedule() {
    if (this.scheduled) return;
    
    this.scheduled = true;
    requestAnimationFrame(() => {
      this.flush();
    });
  }

  /**
   * Execute all batched operations
   */
  flush() {
    // Execute all reads first to avoid layout thrashing
    this.reads.forEach(read => {
      try {
        read();
      } catch (error) {
        console.error('DOM read failed:', error);
      }
    });

    // Then execute all writes
    this.writes.forEach(write => {
      try {
        write();
      } catch (error) {
        console.error('DOM write failed:', error);
      }
    });

    this.reads = [];
    this.writes = [];
    this.scheduled = false;
  }
}

/**
 * Memory efficient event delegation
 */
export class EventDelegator {
  constructor(root = document) {
    this.root = root;
    this.handlers = new Map();
  }

  /**
   * Add delegated event listener
   */
  on(eventType, selector, handler) {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Map());
      this.root.addEventListener(eventType, this.handleEvent.bind(this, eventType));
    }
    
    this.handlers.get(eventType).set(selector, handler);
  }

  /**
   * Remove delegated event listener
   */
  off(eventType, selector) {
    const eventHandlers = this.handlers.get(eventType);
    if (eventHandlers) {
      eventHandlers.delete(selector);
      
      if (eventHandlers.size === 0) {
        this.handlers.delete(eventType);
        this.root.removeEventListener(eventType, this.handleEvent.bind(this, eventType));
      }
    }
  }

  /**
   * Handle delegated events
   */
  handleEvent(eventType, event) {
    const eventHandlers = this.handlers.get(eventType);
    if (!eventHandlers) return;
    
    for (const [selector, handler] of eventHandlers) {
      const target = event.target.closest(selector);
      if (target) {
        handler(event, target);
      }
    }
  }

  /**
   * Destroy event delegator
   */
  destroy() {
    for (const eventType of this.handlers.keys()) {
      this.root.removeEventListener(eventType, this.handleEvent.bind(this, eventType));
    }
    this.handlers.clear();
  }
}

/**
 * Resource preloader for better performance
 */
export class ResourcePreloader {
  constructor() {
    this.cache = new Map();
    this.loading = new Set();
  }

  /**
   * Preload a resource
   */
  async preload(url, type = 'fetch') {
    if (this.cache.has(url)) {
      return this.cache.get(url);
    }

    if (this.loading.has(url)) {
      // Wait for existing load to complete
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

    this.loading.add(url);

    try {
      let resource;
      
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
      
      this.cache.set(url, resource);
      return resource;
      
    } finally {
      this.loading.delete(url);
    }
  }

  /**
   * Preload image
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
   * Preload JSON
   */
  async preloadJSON(url) {
    const response = await fetch(url);
    return response.json();
  }

  /**
   * Preload generic resource
   */
  async preloadGeneric(url) {
    return fetch(url);
  }

  /**
   * Get cached resource
   */
  get(url) {
    return this.cache.get(url);
  }

  /**
   * Clear cache
   */
  clear() {
    this.cache.clear();
    this.loading.clear();
  }
}

/**
 * Create global performance utilities instance
 */
export const createPerformanceUtils = () => ({
  lazyLoader: new LazyLoader(),
  taskScheduler: new TaskScheduler(),
  domBatcher: new DOMBatcher(),
  eventDelegator: new EventDelegator(),
  resourcePreloader: new ResourcePreloader()
});
