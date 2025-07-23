import blessed from 'blessed';

/**
 * Base class for all TUI components
 * Provides common functionality for blessed widgets
 */
export class BaseComponent {
  constructor(options = {}) {
    this.name = options.name || 'BaseComponent';
    this.widget = null;
    this.isVisible = true;
    this.updateInterval = null;
    this.eventHandlers = new Map();
  }

  /**
   * Initialize the component widget
   * Must be implemented by subclasses
   */
  createWidget(screen, layout) {
    throw new Error('createWidget() must be implemented by subclass');
  }

  /**
   * Update component data
   * Must be implemented by subclasses
   */
  update(data) {
    throw new Error('update() must be implemented by subclass');
  }

  /**
   * Show the component
   */
  show() {
    if (this.widget) {
      this.widget.show();
      this.isVisible = true;
    }
  }

  /**
   * Hide the component
   */
  hide() {
    if (this.widget) {
      this.widget.hide();
      this.isVisible = false;
    }
  }

  /**
   * Set component position and size
   */
  setPosition(top, left, width, height) {
    if (this.widget) {
      this.widget.top = top;
      this.widget.left = left;
      this.widget.width = width;
      this.widget.height = height;
    }
  }

  /**
   * Add event handler
   */
  on(event, handler) {
    if (this.widget) {
      this.widget.on(event, handler);
      this.eventHandlers.set(event, handler);
    }
  }

  /**
   * Remove event handler
   */
  off(event) {
    if (this.widget && this.eventHandlers.has(event)) {
      this.widget.removeListener(event, this.eventHandlers.get(event));
      this.eventHandlers.delete(event);
    }
  }

  /**
   * Start periodic updates
   */
  startUpdates(interval = 1000) {
    this.stopUpdates();
    this.updateInterval = setInterval(() => {
      this.periodicUpdate();
    }, interval);
  }

  /**
   * Stop periodic updates
   */
  stopUpdates() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  /**
   * Periodic update hook
   * Can be overridden by subclasses
   */
  periodicUpdate() {
    // Default implementation - do nothing
  }

  /**
   * Clean up component resources
   */
  destroy() {
    this.stopUpdates();
    
    // Remove all event handlers
    for (const [event] of this.eventHandlers) {
      this.off(event);
    }
    
    if (this.widget) {
      this.widget.destroy();
      this.widget = null;
    }
  }

  /**
   * Get component info for debugging
   */
  getInfo() {
    return {
      name: this.name,
      isVisible: this.isVisible,
      hasWidget: !!this.widget,
      hasUpdates: !!this.updateInterval
    };
  }
} 