/**
 * Component Factory and Registry for Compy 2.0
 * 
 * This module provides a centralized system for creating, managing, and
 * coordinating application components. It implements the factory pattern
 * to create component instances and maintains a registry for lifecycle
 * management and inter-component communication.
 * 
 * Features:
 * - Component factory with dependency injection
 * - Component lifecycle management
 * - Service locator pattern for component access
 * - Event-driven inter-component communication
 * - Automatic dependency resolution
 * - Component cleanup and memory management
 * 
 * @fileoverview Central component factory and registry system
 * @version 2.0
 * @author Bheb Developer
 * @since 2025
 */

import { ClipboardManager } from '../components/clipboard.js';
import { NotificationManager } from '../components/notifications.js';
import { ModalManager } from '../components/modals.js';
import { itemService } from '../services/itemService.js';

/**
 * ComponentFactory creates and manages application components
 * 
 * This class implements the factory pattern for component creation,
 * handles dependency injection, and maintains a registry of active
 * components for lifecycle management.
 * 
 * @class ComponentFactory
 * @example
 * const factory = new ComponentFactory();
 * 
 * // Create components with automatic dependency resolution
 * const components = factory.createComponents([
 *   'notifications',
 *   'clipboard', 
 *   'modals'
 * ]);
 * 
 * // Access components
 * const clipboardManager = factory.get('clipboard');
 */
export class ComponentFactory {
  /**
   * Initialize the component factory
   * 
   * @param {Object} [options={}] - Factory configuration options
   * @param {boolean} [options.autoCleanup=true] - Automatically cleanup components on page unload
   * @param {boolean} [options.enableEvents=true] - Enable inter-component event system
   */
  constructor(options = {}) {
    // Factory configuration
    this.options = {
      autoCleanup: true,
      enableEvents: true,
      ...options
    };

    // Component registry
    this.components = new Map();           // Active component instances
    this.componentDefinitions = new Map(); // Component configuration and factory functions
    this.dependencyGraph = new Map();      // Component dependency relationships
    this.eventEmitter = null;             // Inter-component event system

    // Lifecycle state
    this.isInitialized = false;
    this.isDestroyed = false;

    // Bind methods
    this.create = this.create.bind(this);
    this.get = this.get.bind(this);
    this.destroy = this.destroy.bind(this);

    // Initialize the factory
    this.init();
  }

  /**
   * Initialize the component factory
   * 
   * Sets up component definitions, event system, and automatic cleanup.
   * 
   * @private
   */
  init() {
    if (this.isInitialized) return;

    // Setup event system if enabled
    if (this.options.enableEvents) {
      this.setupEventSystem();
    }

    // Register core component definitions
    this.registerCoreComponents();

    // Setup automatic cleanup
    if (this.options.autoCleanup) {
      this.setupAutoCleanup();
    }

    this.isInitialized = true;
  }

  /**
   * Setup inter-component event system
   * 
   * Creates a simple event emitter for component communication.
   * 
   * @private
   */
  setupEventSystem() {
    this.eventEmitter = {
      listeners: new Map(),
      
      on(event, callback) {
        if (!this.listeners.has(event)) {
          this.listeners.set(event, new Set());
        }
        this.listeners.get(event).add(callback);
      },
      
      off(event, callback) {
        const callbacks = this.listeners.get(event);
        if (callbacks) {
          callbacks.delete(callback);
        }
      },
      
      emit(event, data) {
        const callbacks = this.listeners.get(event);
        if (callbacks) {
          callbacks.forEach(callback => {
            try {
              callback(data);
            } catch (error) {
              console.error(`Event handler error for ${event}:`, error);
            }
          });
        }
      }
    };
  }

  /**
   * Register core component definitions
   * 
   * Defines how to create each type of component and their dependencies.
   * 
   * @private
   */
  registerCoreComponents() {
    // NotificationManager - no dependencies
    this.registerComponent('notifications', {
      factory: (deps) => new NotificationManager(),
      dependencies: [],
      singleton: true
    });

    // ClipboardManager - depends on notifications
    this.registerComponent('clipboard', {
      factory: (deps) => new ClipboardManager(deps.notifications),
      dependencies: ['notifications'],
      singleton: true
    });

    // ModalManager - no dependencies
    this.registerComponent('modals', {
      factory: (deps) => new ModalManager(),
      dependencies: [],
      singleton: true
    });

    // ItemService - singleton service
    this.registerComponent('itemService', {
      factory: () => itemService,
      dependencies: [],
      singleton: true
    });

    // ThemeManager - placeholder for future implementation
    this.registerComponent('theme', {
      factory: (deps) => this.createThemeManager(deps),
      dependencies: [],
      singleton: true
    });

    // SearchManager - placeholder for future implementation
    this.registerComponent('search', {
      factory: (deps) => this.createSearchManager(deps),
      dependencies: ['itemService'],
      singleton: true
    });
  }

  /**
   * Register a component definition
   * 
   * @param {string} name - Component name
   * @param {Object} definition - Component definition
   * @param {Function} definition.factory - Factory function to create component
   * @param {string[]} [definition.dependencies=[]] - Array of dependency component names
   * @param {boolean} [definition.singleton=true] - Whether component should be a singleton
   * @param {Function} [definition.cleanup] - Optional cleanup function
   * 
   * @example
   * factory.registerComponent('customComponent', {
   *   factory: (deps) => new CustomComponent(deps.notifications),
   *   dependencies: ['notifications'],
   *   singleton: true,
   *   cleanup: (instance) => instance.destroy()
   * });
   */
  registerComponent(name, definition) {
    // Validate definition
    if (!definition.factory || typeof definition.factory !== 'function') {
      throw new Error(`Component ${name} must have a factory function`);
    }

    // Set defaults
    const componentDef = {
      dependencies: [],
      singleton: true,
      cleanup: null,
      ...definition
    };

    this.componentDefinitions.set(name, componentDef);

    // Update dependency graph
    if (componentDef.dependencies.length > 0) {
      this.dependencyGraph.set(name, componentDef.dependencies);
    }
  }

  /**
   * Create a component instance with comprehensive error handling
   * 
   * Creates the specified component and all its dependencies in the correct order.
   * Includes robust error handling, dependency validation, and lifecycle management.
   * Returns the created component instance.
   * 
   * Enhanced Features:
   * - Comprehensive input validation and error handling
   * - Dependency cycle detection and prevention
   * - Component creation performance monitoring
   * - Graceful failure recovery with detailed error context
   * - Memory leak prevention through proper cleanup
   * 
   * @param {string} componentName - Name of the component to create
   * @returns {*} Created component instance
   * @throws {Error} When component cannot be created or dependencies are invalid
   * 
   * @example
   * try {
   *   const clipboardManager = factory.create('clipboard');
   *   await clipboardManager.copy('Hello World');
   * } catch (error) {
   *   console.error('Component creation failed:', error.message);
   * }
   */
  create(componentName) {
    // Validate factory state
    if (this.isDestroyed) {
      throw new Error(`Cannot create components: factory has been destroyed`);
    }

    // Validate input parameters
    if (!componentName || typeof componentName !== 'string') {
      throw new Error(`Invalid component name: expected string, got ${typeof componentName}`);
    }

    // Check if component definition exists
    const definition = this.componentDefinitions.get(componentName);
    if (!definition) {
      const availableComponents = Array.from(this.componentDefinitions.keys());
      throw new Error(`Unknown component: "${componentName}". Available components: [${availableComponents.join(', ')}]`);
    }

    // Return existing singleton if available
    if (definition.singleton && this.components.has(componentName)) {
      return this.components.get(componentName);
    }

    const startTime = performance.now();
    
    try {
      // Resolve dependencies with cycle detection
      const dependencies = this.resolveDependencies(componentName);

      // Create the component with error context
      let instance;
      try {
        instance = definition.factory(dependencies);
      } catch (error) {
        throw new Error(`Component factory failed for "${componentName}": ${error.message}`);
      }

      // Validate created instance
      if (!instance) {
        throw new Error(`Component factory for "${componentName}" returned null or undefined`);
      }

      // Register the component if it's a singleton
      if (definition.singleton) {
        this.components.set(componentName, instance);
      }

      // Performance monitoring
      const creationTime = performance.now() - startTime;
      if (creationTime > 100) { // Log slow component creation
        console.warn(`Slow component creation: "${componentName}" took ${creationTime.toFixed(2)}ms`);
      }

      // Emit creation event with detailed context
      if (this.eventEmitter) {
        this.eventEmitter.emit('component:created', { 
          name: componentName, 
          instance,
          creationTime,
          dependencyCount: definition.dependencies.length
        });
      }

      return instance;
      
    } catch (error) {
      // Enhanced error reporting with context
      const errorContext = {
        component: componentName,
        dependencies: definition.dependencies,
        singleton: definition.singleton,
        factoryType: typeof definition.factory,
        activeComponents: this.components.size
      };
      
      console.error('Component creation failed:', error.message, errorContext);
      
      // Emit error event for monitoring
      if (this.eventEmitter) {
        this.eventEmitter.emit('component:error', {
          name: componentName,
          error,
          context: errorContext
        });
      }
      
      // Re-throw with enhanced context
      throw error;
    }
  }

  /**
   * Create multiple components
   * 
   * Creates multiple components in dependency order and returns a map
   * of component names to instances.
   * 
   * @param {string[]} componentNames - Array of component names to create
   * @returns {Map<string, *>} Map of component names to instances
   * 
   * @example
   * const components = factory.createComponents(['notifications', 'clipboard', 'modals']);
   * const clipboardManager = components.get('clipboard');
   */
  createComponents(componentNames) {
    const created = new Map();

    // Sort by dependency order
    const sortedNames = this.topologicalSort(componentNames);

    for (const name of sortedNames) {
      const instance = this.create(name);
      created.set(name, instance);
    }

    return created;
  }

  /**
   * Get a component instance
   * 
   * Returns an existing component instance or creates it if it doesn't exist
   * (for singletons only).
   * 
   * @param {string} componentName - Name of the component to retrieve
   * @returns {*|null} Component instance or null if not found
   * 
   * @example
   * const notifications = factory.get('notifications');
   * notifications.show('Hello World', 'success');
   */
  get(componentName) {
    const existing = this.components.get(componentName);
    if (existing) {
      return existing;
    }

    // Auto-create singleton components
    const definition = this.componentDefinitions.get(componentName);
    if (definition && definition.singleton) {
      return this.create(componentName);
    }

    return null;
  }

  /**
   * Check if a component exists
   * 
   * @param {string} componentName - Component name to check
   * @returns {boolean} True if component is registered
   */
  has(componentName) {
    return this.components.has(componentName);
  }

  /**
   * Resolve dependencies for a component
   * 
   * Creates all required dependencies and returns them as an object.
   * 
   * @param {string} componentName - Component name
   * @returns {Object} Object with dependency instances
   * @private
   */
  resolveDependencies(componentName) {
    const definition = this.componentDefinitions.get(componentName);
    if (!definition || !definition.dependencies.length) {
      return {};
    }

    const dependencies = {};

    for (const depName of definition.dependencies) {
      // Check for circular dependencies
      if (this.hasCircularDependency(componentName, depName)) {
        throw new Error(`Circular dependency detected: ${componentName} -> ${depName}`);
      }

      // Create or get dependency
      dependencies[depName] = this.create(depName);
    }

    return dependencies;
  }

  /**
   * Check for circular dependencies
   * 
   * @param {string} from - Source component
   * @param {string} to - Target dependency
   * @param {Set} [visited] - Visited components (for recursion)
   * @returns {boolean} True if circular dependency exists
   * @private
   */
  hasCircularDependency(from, to, visited = new Set()) {
    if (visited.has(from)) {
      return from === to;
    }

    visited.add(from);
    const deps = this.dependencyGraph.get(to);
    
    if (deps) {
      for (const dep of deps) {
        if (this.hasCircularDependency(from, dep, visited)) {
          return true;
        }
      }
    }

    visited.delete(from);
    return false;
  }

  /**
   * Sort components by dependency order (topological sort)
   * 
   * @param {string[]} componentNames - Component names to sort
   * @returns {string[]} Sorted component names
   * @private
   */
  topologicalSort(componentNames) {
    const result = [];
    const visited = new Set();
    const visiting = new Set();

    const visit = (name) => {
      if (visiting.has(name)) {
        throw new Error(`Circular dependency detected involving: ${name}`);
      }
      if (visited.has(name)) {
        return;
      }

      visiting.add(name);
      
      const deps = this.dependencyGraph.get(name);
      if (deps) {
        for (const dep of deps) {
          if (componentNames.includes(dep)) {
            visit(dep);
          }
        }
      }

      visiting.delete(name);
      visited.add(name);
      result.push(name);
    };

    for (const name of componentNames) {
      visit(name);
    }

    return result;
  }

  /**
   * Setup automatic cleanup on page unload
   * 
   * @private
   */
  setupAutoCleanup() {
    window.addEventListener('beforeunload', () => {
      this.destroy();
    });

    // Also cleanup on page hide (for mobile browsers)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.cleanup();
      }
    });
  }

  /**
   * Cleanup components without destroying the factory
   * 
   * Calls cleanup functions for all components but keeps the factory
   * ready for creating new components.
   */
  cleanup() {
    for (const [name, instance] of this.components) {
      this.cleanupComponent(name, instance);
    }
  }

  /**
   * Cleanup a specific component
   * 
   * @param {string} name - Component name
   * @param {*} instance - Component instance
   * @private
   */
  cleanupComponent(name, instance) {
    try {
      const definition = this.componentDefinitions.get(name);
      
      if (definition && definition.cleanup) {
        definition.cleanup(instance);
      } else if (instance && typeof instance.destroy === 'function') {
        instance.destroy();
      } else if (instance && typeof instance.cleanup === 'function') {
        instance.cleanup();
      }

      // Emit cleanup event
      if (this.eventEmitter) {
        this.eventEmitter.emit('component:cleaned', { name, instance });
      }
    } catch (error) {
      console.error(`Error cleaning up component ${name}:`, error);
    }
  }

  /**
   * Destroy the factory and all components
   * 
   * Performs complete cleanup and makes the factory unusable.
   * This is typically called when the application shuts down.
   */
  destroy() {
    if (this.isDestroyed) return;

    // Cleanup all components
    this.cleanup();
    
    // Clear registries
    this.components.clear();
    this.dependencyGraph.clear();

    // Cleanup event system
    if (this.eventEmitter) {
      this.eventEmitter.listeners.clear();
      this.eventEmitter = null;
    }

    this.isDestroyed = true;
  }

  /**
   * Get factory status and statistics
   * 
   * @returns {Object} Factory status information
   * 
   * @example
   * const status = factory.getStatus();
   * console.log(`${status.activeComponents} components active`);
   */
  getStatus() {
    return {
      initialized: this.isInitialized,
      destroyed: this.isDestroyed,
      activeComponents: this.components.size,
      registeredComponents: this.componentDefinitions.size,
      componentNames: Array.from(this.components.keys())
    };
  }

  /**
   * Placeholder factory for ThemeManager (to be implemented)
   * 
   * @private
   */
  createThemeManager() {
    // Placeholder - return a simple theme manager
    return {
      apply: (theme) => console.log('Theme applied:', theme),
      current: 'dark-mystic-forest'
    };
  }

  /**
   * Placeholder factory for SearchManager (to be implemented)
   * 
   * @private
   */
  createSearchManager(deps) {
    // Placeholder - return a simple search manager
    return {
      search: (query) => deps.itemService.searchItems(query),
      focus: () => console.log('Search focused')
    };
  }
}

/**
 * Global component factory instance
 * 
 * Provides a singleton factory instance for the entire application.
 * This is the recommended way to access components throughout the app.
 */
export const componentFactory = new ComponentFactory();

/**
 * Factory function to create a new component factory
 * 
 * @param {Object} [options={}] - Factory configuration options
 * @returns {ComponentFactory} New component factory instance
 * 
 * @example
 * import { createComponentFactory } from './componentFactory.js';
 * 
 * const factory = createComponentFactory({
 *   autoCleanup: false,
 *   enableEvents: false
 * });
 */
export const createComponentFactory = (options = {}) => {
  return new ComponentFactory(options);
};
