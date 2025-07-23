/**
 * Main layout system for TUI dashboard
 * Manages component positioning and responsive grid
 */
export class MainLayout {
  constructor(options = {}) {
    this.screen = null;
    this.components = new Map();
    this.grid = {
      rows: 12,
      cols: 12,
      spacing: 1
    };
    this.theme = {
      colors: {
        primary: 'blue',
        secondary: 'cyan',
        success: 'green',
        warning: 'yellow',
        error: 'red',
        info: 'white'
      },
      borders: {
        type: 'line',
        fg: 'blue'
      }
    };
  }

  /**
   * Initialize layout with blessed screen
   */
  initialize(screen) {
    this.screen = screen;
    
    // Handle screen resize
    this.screen.on('resize', () => {
      this.handleResize();
    });
  }

  /**
   * Add component to layout
   */
  addComponent(name, component, position) {
    this.components.set(name, {
      component,
      position: {
        top: position.top || 0,
        left: position.left || 0,
        width: position.width || 12,
        height: position.height || 1
      }
    });
  }

  /**
   * Remove component from layout
   */
  removeComponent(name) {
    const componentData = this.components.get(name);
    if (componentData) {
      componentData.component.destroy();
      this.components.delete(name);
    }
  }

  /**
   * Update component position
   */
  updateComponentPosition(name, newPosition) {
    const componentData = this.components.get(name);
    if (componentData) {
      componentData.position = { ...componentData.position, ...newPosition };
      this.applyPosition(componentData.component, componentData.position);
    }
  }

  /**
   * Apply position to component
   */
  applyPosition(component, position) {
    if (component && component.setPosition) {
      component.setPosition(
        position.top,
        position.left,
        position.width,
        position.height
      );
    }
  }

  /**
   * Handle screen resize
   */
  handleResize() {
    // Reapply all component positions
    for (const [name, componentData] of this.components) {
      this.applyPosition(componentData.component, componentData.position);
    }
  }

  /**
   * Get predefined layout positions
   */
  getLayoutPositions() {
    return {
      // Top row - Network Status, TPS Metrics, Control Panel
      networkStatus: { top: 0, left: 0, width: 4, height: 3 },
      tpsMetrics: { top: 0, left: 4, width: 4, height: 3 },
      controlPanel: { top: 0, left: 8, width: 4, height: 3 },
      
      // Middle - Active Senders Table
      activeSenders: { top: 3, left: 0, width: 12, height: 4 },
      
      // Center - TPS Graph
      tpsGraph: { top: 7, left: 0, width: 12, height: 6 },
      
      // Bottom - Event Log
      eventLog: { top: 13, left: 0, width: 12, height: 4 },
      
      // Bottom - Keyboard Help
      keyboardHelp: { top: 17, left: 0, width: 12, height: 1 }
    };
  }

  /**
   * Create standard dashboard layout
   */
  createStandardLayout() {
    const positions = this.getLayoutPositions();
    
    return {
      // Top row components
      networkStatus: {
        ...positions.networkStatus,
        border: { type: 'line', fg: this.theme.colors.primary },
        title: ' Network Status '
      },
      tpsMetrics: {
        ...positions.tpsMetrics,
        border: { type: 'line', fg: this.theme.colors.secondary },
        title: ' TPS Metrics '
      },
      controlPanel: {
        ...positions.controlPanel,
        border: { type: 'line', fg: this.theme.colors.info },
        title: ' Control Panel '
      },
      
      // Middle components
      activeSenders: {
        ...positions.activeSenders,
        border: { type: 'line', fg: this.theme.colors.success },
        title: ' Active Senders '
      },
      
      // Center components
      tpsGraph: {
        ...positions.tpsGraph,
        border: { type: 'line', fg: this.theme.colors.warning },
        title: ' Live TPS Graph '
      },
      
      // Bottom components
      eventLog: {
        ...positions.eventLog,
        border: { type: 'line', fg: this.theme.colors.error },
        title: ' Event Log '
      },
      keyboardHelp: {
        ...positions.keyboardHelp,
        border: { type: 'line', fg: this.theme.colors.info },
        title: ' Keyboard Controls '
      }
    };
  }

  /**
   * Get theme colors
   */
  getTheme() {
    return this.theme;
  }

  /**
   * Update theme
   */
  updateTheme(newTheme) {
    this.theme = { ...this.theme, ...newTheme };
  }

  /**
   * Get all components
   */
  getComponents() {
    return this.components;
  }

  /**
   * Get component by name
   */
  getComponent(name) {
    const componentData = this.components.get(name);
    return componentData ? componentData.component : null;
  }

  /**
   * Show all components
   */
  showAll() {
    for (const [name, componentData] of this.components) {
      componentData.component.show();
    }
  }

  /**
   * Hide all components
   */
  hideAll() {
    for (const [name, componentData] of this.components) {
      componentData.component.hide();
    }
  }

  /**
   * Destroy layout and all components
   */
  destroy() {
    for (const [name, componentData] of this.components) {
      componentData.component.destroy();
    }
    this.components.clear();
  }
} 