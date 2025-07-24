import blessed from 'blessed';
import { BaseComponent } from './base-component.js';

/**
 * Control Panel Component
 * Provides interactive controls for starting/stopping tests and exporting reports
 */
export class ControlPanelComponent extends BaseComponent {
  constructor(options = {}) {
    super({ name: 'ControlPanel', ...options });
    
    this.state = {
      isTestRunning: false,
      canStart: true,
      canStop: false,
      canExport: false  // Export disabled per plan
    };
    
    this.buttons = {};
    this.onStartTest = options.onStartTest || (() => {});
    this.onStopTest = options.onStopTest || (() => {});
    this.onExportReport = options.onExportReport || (() => {});
  }

  /**
   * Create blessed widget for control panel
   */
  createWidget(screen, layout) {
    this.widget = blessed.box({
      parent: screen,
      top: 0,
      left: '50%',
      width: '50%',
      height: '20%',
      border: { 
        type: 'line', 
        fg: 'white' 
      },
      label: ' Control Panel ',
      padding: {
        top: 0,
        bottom: 1,
        left: 1,
        right: 1
      },
      style: {
        border: { fg: 'white' },
        label: { fg: 'white', bold: true }
      },
      scrollable: false,
      alwaysScroll: false
    })

    this.createButtons()
    return this.widget
  }

  /**
   * Create interactive buttons
   */
  createButtons() {
    // Start Test Button
    this.buttons.start = blessed.button({
      parent: this.widget,
      top: 1,
      left: 1,
      width: 12,
      height: 3,
      content: '{center}Start Test{/center}\n{center}(Light){/center}',
      tags: true,
      focusable: true,
      keys: true,
      mouse: true,
      style: {
        bg: 'green',
        fg: 'white',
        bold: true,
        focus: {
          bg: 'bright-green',
          fg: 'black'
        }
      },
      border: { type: 'line', fg: 'green' }
    })

    // Stop All Button
    this.buttons.stop = blessed.button({
      parent: this.widget,
      top: 1,
      left: 15,
      width: 12,
      height: 3,
      content: '{center}Stop All{/center}\n{center}(Processes){/center}',
      tags: true,
      focusable: true,
      keys: true,
      mouse: true,
      style: {
        bg: 'red',
        fg: 'white',
        bold: true,
        focus: {
          bg: 'bright-red',
          fg: 'black'
        }
      },
      border: { type: 'line', fg: 'red' }
    })

    // Export Report Button (Disabled)
    this.buttons.export = blessed.button({
      parent: this.widget,
      top: 1,
      left: 29,
      width: 15,
      height: 3,
      content: '{center}Export Report{/center}\n{center}(Coming Soon){/center}',
      tags: true,
      focusable: false,  // Disabled - не может получить focus
      keys: false,
      mouse: false,
      style: {
        bg: 'gray',
        fg: 'black',
        bold: false
      },
      border: { type: 'line', fg: 'gray' }
    })

    this.setupButtonEvents()
    this.setupKeyboardNavigation()
    this.updateButtonStates()
  }

  /**
   * Setup keyboard navigation between buttons
   */
  setupKeyboardNavigation() {
    // Tab navigation between buttons
    this.buttons.start.key(['tab'], () => {
      this.buttons.stop.focus()
    })

    this.buttons.stop.key(['tab'], () => {
      this.buttons.start.focus()  // Skip disabled export button
    })

    // Arrow key navigation
    this.buttons.start.key(['right'], () => {
      this.buttons.stop.focus()
    })

    this.buttons.stop.key(['left'], () => {
      this.buttons.start.focus()
    })

    this.buttons.stop.key(['right'], () => {
      this.buttons.start.focus()  // Cycle back
    })

    // Enter/Space to activate buttons
    this.buttons.start.key(['enter', 'space'], () => {
      this.buttons.start.press()
    })

    this.buttons.stop.key(['enter', 'space'], () => {
      this.buttons.stop.press()
    })

    // Set initial focus on start button
    setTimeout(() => {
      this.buttons.start.focus()
    }, 100)
  }

  /**
   * Setup button click events
   */
  setupButtonEvents() {
    this.buttons.start.on('press', () => {
      if (this.state.canStart) {
        this.onStartTest();
        this.setState({ isTestRunning: true });
      }
    });

    this.buttons.stop.on('press', () => {
      if (this.state.canStop) {
        this.onStopTest();
        this.setState({ isTestRunning: false });
      }
    });

    this.buttons.export.on('press', () => {
      if (this.state.canExport) {
        this.onExportReport();
      }
    });
  }

  /**
   * Update button states based on current state
   */
  updateButtonStates() {
    // Start button
    if (this.state.canStart && !this.state.isTestRunning) {
      this.buttons.start.style.bg = 'green';
      this.buttons.start.style.fg = 'white';
      this.buttons.start.style.bold = true;
      this.buttons.start.content = '{center}Start Test{/center}\n{center}(Light){/center}';
    } else {
      this.buttons.start.style.bg = 'gray';
      this.buttons.start.style.fg = 'black';
      this.buttons.start.style.bold = false;
      this.buttons.start.content = '{center}Start Test{/center}\n{center}(Running...){/center}';
    }

    // Stop button
    if (this.state.canStop && this.state.isTestRunning) {
      this.buttons.stop.style.bg = 'red';
      this.buttons.stop.style.fg = 'white';
      this.buttons.stop.style.bold = true;
      this.buttons.stop.content = '{center}Stop All{/center}\n{center}(Active){/center}';
    } else {
      this.buttons.stop.style.bg = 'gray';
      this.buttons.stop.style.fg = 'black';
      this.buttons.stop.style.bold = false;
      this.buttons.stop.content = '{center}Stop All{/center}\n{center}(No Processes){/center}';
    }

    // Export button (always disabled for now)
    this.buttons.export.style.bg = 'gray';
    this.buttons.export.style.fg = 'black';
    this.buttons.export.style.bold = false;
    this.buttons.export.content = '{center}Export Report{/center}\n{center}(Coming Soon){/center}';

    this.widget.screen.render();
  }

  /**
   * Set component state and update UI
   */
  setState(newState) {
    this.state = { ...this.state, ...newState };
    this.updateButtonStates();
  }

  /**
   * Set test running state
   */
  setTestRunning(isRunning) {
    this.setState({
      isTestRunning: isRunning,
      canStart: !isRunning,
      canStop: isRunning
    });
  }

  /**
   * Enable export functionality
   */
  enableExport() {
    this.setState({ canExport: true });
  }

  /**
   * Disable export functionality
   */
  disableExport() {
    this.setState({ canExport: false });
  }

  /**
   * Clean up component
   */
  destroy() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    
    if (this.widget) {
      this.widget.destroy();
    }
  }
} 