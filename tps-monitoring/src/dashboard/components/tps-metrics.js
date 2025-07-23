import blessed from 'blessed';
import { BaseComponent } from './base-component.js';

/**
 * TPS Metrics Component
 * Displays current TPS, peak TPS, and average TPS with progress bars
 */
export class TPSMetricsComponent extends BaseComponent {
  constructor(options = {}) {
    super({ name: 'TPSMetrics', ...options });
    
    this.data = {
      currentTPS: 0,
      peakTPS: 0,
      averageTPS: 0,
      maxTPS: 400, // Maximum TPS for progress bar scaling
      lastUpdate: null
    };
  }

  /**
   * Create blessed widget for TPS metrics
   */
  createWidget(screen, layout) {
    this.widget = blessed.box({
      parent: screen,
      top: 0,
      left: '25%',
      width: '25%',
      height: '20%',
      border: { 
        type: 'line', 
        fg: 'cyan' 
      },
      label: ' TPS Metrics ',
      tags: true,
      content: this.formatContent(),
      padding: {
        top: 0,
        bottom: 1,
        left: 1,
        right: 1
      },
      style: {
        border: { fg: 'cyan' },
        label: { fg: 'white', bold: true }
      },
      scrollable: false,
      alwaysScroll: false
    })

    return this.widget
  }

  /**
   * Update component with new data
   */
  update(data) {
    this.data = { ...this.data, ...data };
    this.data.lastUpdate = new Date();
    
    // Update peak TPS if current is higher
    if (this.data.currentTPS > this.data.peakTPS) {
      this.data.peakTPS = this.data.currentTPS;
    }
    
    if (this.widget) {
      this.widget.setContent(this.formatContent());
      this.widget.screen.render();
    }
  }

  /**
   * Format content for display
   */
  formatContent() {
    const { currentTPS, peakTPS, averageTPS, maxTPS } = this.data;
    
    const currentBar = this.createProgressBar(currentTPS, maxTPS, 'green');
    const peakBar = this.createProgressBar(peakTPS, maxTPS, 'yellow');
    const averageBar = this.createProgressBar(averageTPS, maxTPS, 'blue');
    
    return [
      `{bold}Current:{/bold} ${currentBar} ${currentTPS.toFixed(1)} TPS`,
      `{bold}Peak:   {/bold} ${peakBar} ${peakTPS.toFixed(1)} TPS`,
      `{bold}Average:{/bold} ${averageBar} ${averageTPS.toFixed(1)} TPS`
    ].join('\n');
  }

  /**
   * Create ASCII progress bar
   */
  createProgressBar(value, max, color) {
    const barWidth = 10;
    const filled = Math.round((value / max) * barWidth);
    const empty = barWidth - filled;
    
    const filledChar = '█';
    const emptyChar = '░';
    
    const filledPart = filledChar.repeat(filled);
    const emptyPart = emptyChar.repeat(empty);
    
    return `{${color}-fg}${filledPart}{/}${emptyPart}`;
  }

  /**
   * Set current TPS
   */
  setCurrentTPS(tps) {
    this.update({ currentTPS: tps });
  }

  /**
   * Set peak TPS
   */
  setPeakTPS(tps) {
    this.update({ peakTPS: tps });
  }

  /**
   * Set average TPS
   */
  setAverageTPS(tps) {
    this.update({ averageTPS: tps });
  }

  /**
   * Set maximum TPS for scaling
   */
  setMaxTPS(maxTPS) {
    this.update({ maxTPS });
  }

  /**
   * Reset peak TPS
   */
  resetPeakTPS() {
    this.update({ peakTPS: 0 });
  }

  /**
   * Get current data
   */
  getData() {
    return { ...this.data };
  }

  /**
   * Get TPS statistics
   */
  getTPSStats() {
    return {
      current: this.data.currentTPS,
      peak: this.data.peakTPS,
      average: this.data.averageTPS,
      max: this.data.maxTPS
    };
  }

  /**
   * Periodic update hook
   */
  periodicUpdate() {
    // Could implement auto-scaling of maxTPS based on peak values
    if (this.data.peakTPS > this.data.maxTPS * 0.8) {
      this.setMaxTPS(Math.ceil(this.data.peakTPS * 1.2));
    }
  }
} 