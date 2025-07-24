import blessed from 'blessed';
import { BaseComponent } from './base-component.js';

/**
 * Keyboard Handler Component
 * Manages global keyboard shortcuts and navigation
 */
export class KeyboardHandlerComponent extends BaseComponent {
  constructor(options = {}) {
    super({ name: 'KeyboardHandler', ...options });
    
    this.shortcuts = new Map();
    this.focusManager = null;
    this.helpMode = false;
    
    // Default shortcuts
    this.setupDefaultShortcuts();
  }

  /**
   * Setup default keyboard shortcuts
   */
  setupDefaultShortcuts() {
    this.addShortcut('q', 'Quit application', () => {
      console.log('👋 Quitting...');
      process.exit(0);
    });

    this.addShortcut('escape', 'Exit current mode', () => {
      this.exitHelpMode();
    });

    this.addShortcut('h', 'Show help', () => {
      this.toggleHelpMode();
    });

    this.addShortcut('s', 'Start/Stop test', () => {
      this.triggerAction('toggleTest');
    });

    this.addShortcut('r', 'Export report', () => {
      this.triggerAction('exportReport');
    });

    this.addShortcut('c', 'Clear logs', () => {
      this.triggerAction('clearLogs');
    });

    this.addShortcut('f', 'Toggle filters', () => {
      this.triggerAction('toggleFilters');
    });

    this.addShortcut('tab', 'Next component', () => {
      this.nextComponent();
    });

    this.addShortcut('S-tab', 'Previous component', () => {
      this.previousComponent();
    });

    // Arrow keys for navigation
    this.addShortcut('up', 'Navigate up', () => {
      this.navigate('up');
    });

    this.addShortcut('down', 'Navigate down', () => {
      this.navigate('down');
    });

    this.addShortcut('left', 'Navigate left', () => {
      this.navigate('left');
    });

    this.addShortcut('right', 'Navigate right', () => {
      this.navigate('right');
    });
  }

  /**
   * Initialize keyboard handler with screen
   */
  initialize(screen, components = {}) {
    this.screen = screen;
    this.components = components;
    
    // Setup focus manager
    this.setupFocusManager();
    
    // Bind all shortcuts to screen
    this.bindShortcuts();
    
    // Create help overlay
    this.createHelpOverlay();
  }

  /**
   * Setup focus management
   */
  setupFocusManager() {
    this.focusableComponents = [
      'networkStatus',
      'tpsMetrics', 
      'controlPanel',
      'activeSenders',
      'tpsGraph',
      'eventLog'
    ];
    
    this.currentFocusIndex = 0;
  }

  /**
   * Add a keyboard shortcut
   */
  addShortcut(key, description, action) {
    this.shortcuts.set(key, {
      description,
      action
    });
  }

  /**
   * Remove a keyboard shortcut
   */
  removeShortcut(key) {
    this.shortcuts.delete(key);
  }

  /**
   * Bind all shortcuts to screen
   */
  bindShortcuts() {
    if (!this.screen) return;

    // Bind each shortcut
    for (const [key, shortcut] of this.shortcuts) {
      this.screen.key(key, (ch, key) => {
        if (this.helpMode && key !== 'h' && key !== 'escape') {
          return; // Only allow help and escape in help mode
        }
        
        try {
          shortcut.action(ch, key);
        } catch (error) {
          console.log(`❌ Error executing shortcut ${key}:`, error.message);
        }
      });
    }
  }

  /**
   * Create help overlay
   */
  createHelpOverlay() {
    this.helpOverlay = blessed.box({
      parent: this.screen,
      top: 'center',
      left: 'center',
      width: '80%',
      height: '80%',
      border: { type: 'line', fg: 'cyan' },
      title: ' Keyboard Shortcuts ',
      tags: true,
      content: this.formatHelpContent(),
      style: {
        border: { fg: 'cyan' },
        title: { fg: 'white', bold: true }
      },
      hidden: true
    });
  }

  /**
   * Format help content
   */
  formatHelpContent() {
    let content = '{center}{bold}TPS Stress Test Dashboard - Keyboard Shortcuts{/bold}{/center}\n\n';
    
    // Group shortcuts by category
    const categories = {
      'Navigation': ['tab', 'S-tab', 'up', 'down', 'left', 'right'],
      'Control': ['s', 'r', 'c', 'f'],
      'System': ['q', 'h', 'escape']
    };

    for (const [category, keys] of Object.entries(categories)) {
      content += `{bold}${category}:{/bold}\n`;
      
      for (const key of keys) {
        const shortcut = this.shortcuts.get(key);
        if (shortcut) {
          const keyDisplay = key === 'S-tab' ? 'Shift+Tab' : key.toUpperCase();
          content += `  {cyan-fg}${keyDisplay.padEnd(12)}{/} - ${shortcut.description}\n`;
        }
      }
      content += '\n';
    }

    content += '{center}{yellow-fg}Press ESC or h to close help{/yellow-fg}{/center}';
    
    return content;
  }

  /**
   * Toggle help mode
   */
  toggleHelpMode() {
    this.helpMode = !this.helpMode;
    
    if (this.helpMode) {
      this.showHelp();
    } else {
      this.hideHelp();
    }
  }

  /**
   * Show help overlay
   */
  showHelp() {
    if (this.helpOverlay) {
      this.helpOverlay.show();
      this.helpOverlay.focus();
      this.screen.render();
    }
  }

  /**
   * Hide help overlay
   */
  hideHelp() {
    if (this.helpOverlay) {
      this.helpOverlay.hide();
      this.screen.render();
    }
  }

  /**
   * Exit help mode
   */
  exitHelpMode() {
    if (this.helpMode) {
      this.helpMode = false;
      this.hideHelp();
    }
  }

  /**
   * Trigger action (for communication with other components)
   */
  triggerAction(action, data = null) {
    if (this.actionHandlers && this.actionHandlers[action]) {
      this.actionHandlers[action](data);
    } else {
      console.log(`ℹ️  Action '${action}' not handled`);
    }
  }

  /**
   * Register action handler
   */
  registerActionHandler(action, handler) {
    if (!this.actionHandlers) {
      this.actionHandlers = {};
    }
    this.actionHandlers[action] = handler;
  }

  /**
   * Navigate to next component
   */
  nextComponent() {
    if (this.focusableComponents.length === 0) return;
    
    this.currentFocusIndex = (this.currentFocusIndex + 1) % this.focusableComponents.length;
    this.focusComponent(this.focusableComponents[this.currentFocusIndex]);
  }

  /**
   * Navigate to previous component
   */
  previousComponent() {
    if (this.focusableComponents.length === 0) return;
    
    this.currentFocusIndex = this.currentFocusIndex === 0 
      ? this.focusableComponents.length - 1 
      : this.currentFocusIndex - 1;
    this.focusComponent(this.focusableComponents[this.currentFocusIndex]);
  }

  /**
   * Focus specific component
   */
  focusComponent(componentName) {
    const component = this.components[componentName];
    if (component && component.widget) {
      component.widget.focus();
      // Убрал console.log чтобы убрать "Focused" логи с экрана
    }
  }

  /**
   * Navigate in specified direction
   */
  navigate(direction) {
    // This could be enhanced with more sophisticated navigation logic
    console.log(`🧭 Navigation: ${direction}`);
    
    // Simple navigation based on direction
    switch (direction) {
      case 'up':
        this.previousComponent();
        break;
      case 'down':
        this.nextComponent();
        break;
      case 'left':
        // Could implement horizontal navigation
        break;
      case 'right':
        // Could implement horizontal navigation
        break;
    }
  }

  /**
   * Get current shortcuts
   */
  getShortcuts() {
    const result = {};
    for (const [key, shortcut] of this.shortcuts) {
      result[key] = shortcut.description;
    }
    return result;
  }

  /**
   * Update help content
   */
  updateHelp() {
    if (this.helpOverlay) {
      this.helpOverlay.setContent(this.formatHelpContent());
      this.screen.render();
    }
  }

  /**
   * Clean up component
   */
  destroy() {
    if (this.helpOverlay) {
      this.helpOverlay.destroy();
    }
    
    if (this.screen) {
      // Remove all key bindings
      for (const key of this.shortcuts.keys()) {
        this.screen.unkey(key);
      }
    }
  }
} 