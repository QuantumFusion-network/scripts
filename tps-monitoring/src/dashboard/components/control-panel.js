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
      canExport: false
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
      width: '25%',
      height: '15%',
      border: { type: 'line', fg: 'white' },
      title: ' Control Panel ',
      style: {
        border: { fg: 'white' },
        title: { fg: 'white', bold: true }
      }
    });

    this.createButtons();
    return this.widget;
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
      width: 8,
      height: 1,
      content: ' START ',
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
    });

    // Stop Test Button
    this.buttons.stop = blessed.button({
      parent: this.widget,
      top: 1,
      left: 10,
      width: 8,
      height: 1,
      content: ' STOP ',
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
    });

    // Export Report Button
    this.buttons.export = blessed.button({
      parent: this.widget,
      top: 3,
      left: 1,
      width: 17,
      height: 1,
      content: ' EXPORT REPORT ',
      style: {
        bg: 'blue',
        fg: 'white',
        bold: true,
        focus: {
          bg: 'bright-blue',
          fg: 'black'
        }
      },
      border: { type: 'line', fg: 'blue' }
    });

    this.setupButtonEvents();
    this.updateButtonStates();
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
      this.buttons.start.content = ' START ';
    } else {
      this.buttons.start.style.bg = 'gray';
      this.buttons.start.style.fg = 'black';
      this.buttons.content = ' START ';
    }

    // Stop button
    if (this.state.canStop && this.state.isTestRunning) {
      this.buttons.stop.style.bg = 'red';
      this.buttons.stop.style.fg = 'white';
      this.buttons.stop.content = ' STOP ';
    } else {
      this.buttons.stop.style.bg = 'gray';
      this.buttons.stop.style.fg = 'black';
      this.buttons.stop.content = ' STOP ';
    }

    // Export button
    if (this.state.canExport) {
      this.buttons.export.style.bg = 'blue';
      this.buttons.export.style.fg = 'white';
      this.buttons.export.content = ' EXPORT REPORT ';
    } else {
      this.buttons.export.style.bg = 'gray';
      this.buttons.export.style.fg = 'black';
      this.buttons.export.content = ' EXPORT REPORT ';
    }

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