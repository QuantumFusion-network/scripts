import blessed from 'blessed';
import { BaseComponent } from './base-component.js';

/**
 * TPS Graph Component (Simple Version)
 * Displays TPS data as text-based visualization without blessed-contrib
 */
export class TPSSimpleGraphComponent extends BaseComponent {
  constructor(options = {}) {
    super({ name: 'TPSSimpleGraph', ...options });
    
    this.data = {
      tpsHistory: [],
      timeHistory: [],
      maxDataPoints: 20, // Show last 20 data points
      maxTPS: 400,
      currentTPS: 0
    };
  }

  /**
   * Create simple text-based graph widget
   */
  createWidget(screen, layout) {
    this.widget = blessed.box({
      parent: screen,
      top: '40%',
      left: 0,
      width: '100%',
      height: '25%',
      border: { type: 'line', fg: 'yellow' },
      label: ' Live TPS Graph (Simple) ',
      tags: true,
      content: this.formatGraph(),
      padding: {
        top: 0,
        bottom: 1,
        left: 1,
        right: 1
      },
      style: {
        border: { fg: 'yellow' },
        label: { fg: 'white', bold: true }
      },
      scrollable: false,
      alwaysScroll: false
    })

    return this.widget
  }

  /**
   * Format simple ASCII graph
   */
  formatGraph() {
    if (this.data.tpsHistory.length === 0) {
      return '{center}{yellow-fg}No TPS data available{/yellow-fg}{/center}';
    }

    const { tpsHistory, timeHistory } = this.data;
    const maxTPS = Math.max(...tpsHistory, this.data.maxTPS);
    const height = 8; // Graph height in characters
    
    let content = '';
    
    // Header with metrics
    const current = this.data.currentTPS;
    const peak = this.getPeakTPS();
    const average = this.getAverageTPS();
    
    content += `{center}Current: {green-fg}${current}{/} TPS | Peak: {yellow-fg}${peak}{/} TPS | Avg: {cyan-fg}${average}{/} TPS{/center}\n`;
    content += `${'─'.repeat(80)}\n`;
    
    // ASCII graph
    for (let i = height; i >= 0; i--) {
      const threshold = (maxTPS / height) * i;
      const line = tpsHistory.map(tps => {
        if (tps >= threshold) {
          return '█';
        } else if (tps >= threshold * 0.8) {
          return '▄';
        } else if (tps >= threshold * 0.6) {
          return '▂';
        } else {
          return ' ';
        }
      }).join('');
      
      content += `${Math.round(threshold).toString().padStart(4)}┤ ${line}\n`;
    }
    
    // X-axis labels
    content += `    └${'─'.repeat(tpsHistory.length)}\n`;
    
    // Time labels (show every 5th label)
    const timeLabels = timeHistory.map((time, index) => 
      index % 5 === 0 ? time.slice(-5) : '   '
    ).join('');
    content += `     ${timeLabels}\n`;
    
    return content;
  }

  /**
   * Add new TPS data point
   */
  addDataPoint(tps, timestamp = null) {
    const time = timestamp || new Date().toLocaleTimeString('en-US', { 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    this.data.tpsHistory.push(tps);
    this.data.timeHistory.push(time);
    this.data.currentTPS = tps;

    // Remove old data points if exceeding max
    if (this.data.tpsHistory.length > this.data.maxDataPoints) {
      this.data.tpsHistory.shift();
      this.data.timeHistory.shift();
    }

    this.updateContent();
  }

  /**
   * Set test data for demonstration
   */
  setTestData() {
    const now = new Date();
    const testData = [];
    
    // Generate 20 data points
    for (let i = 20; i >= 0; i--) {
      const time = new Date(now.getTime() - i * 5000); // 5 second intervals
      const tps = 200 + Math.sin(i * 0.5) * 100 + (Math.random() - 0.5) * 50;
      
      testData.push({
        time: time.toLocaleTimeString('en-US', { 
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        }),
        tps: Math.max(0, Math.round(tps))
      });
    }

    // Clear existing data
    this.data.tpsHistory = [];
    this.data.timeHistory = [];

    // Add test data
    testData.forEach(point => {
      this.addDataPoint(point.tps, point.time);
    });
  }

  /**
   * Start real-time updates
   */
  startUpdates(interval = 5000) { // 5 second updates
    this.updateInterval = setInterval(() => {
      // Generate realistic TPS data
      const baseTPS = 250;
      const variation = Math.sin(Date.now() * 0.001) * 100;
      const noise = (Math.random() - 0.5) * 50;
      const newTPS = Math.max(0, Math.round(baseTPS + variation + noise));
      
      this.addDataPoint(newTPS);
    }, interval);
  }

  /**
   * Get current TPS value
   */
  getCurrentTPS() {
    return this.data.currentTPS;
  }

  /**
   * Get peak TPS from history
   */
  getPeakTPS() {
    return this.data.tpsHistory.length > 0 ? Math.max(...this.data.tpsHistory) : 0;
  }

  /**
   * Get average TPS from history
   */
  getAverageTPS() {
    if (this.data.tpsHistory.length === 0) return 0;
    const sum = this.data.tpsHistory.reduce((a, b) => a + b, 0);
    return Math.round(sum / this.data.tpsHistory.length);
  }

  /**
   * Update widget content
   */
  updateContent() {
    if (this.widget) {
      this.widget.setContent(this.formatGraph());
      this.widget.screen.render();
    }
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