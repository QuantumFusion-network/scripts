import blessed from 'blessed';
import contrib from 'blessed-contrib';
import { BaseComponent } from './base-component.js';

/**
 * TPS Graph Component
 * Displays real-time TPS data using blessed-contrib line chart
 */
export class TPSGraphComponent extends BaseComponent {
  constructor(options = {}) {
    super({ name: 'TPSGraph', ...options });
    
    this.data = {
      tpsHistory: [],
      timeHistory: [],
      maxDataPoints: 60, // 10 minutes at 10-second intervals
      maxTPS: 400,
      currentTPS: 0
    };
    
    this.chart = null;
  }

  /**
   * Create blessed-contrib line chart widget
   */
  createWidget(screen, layout) {
    try {
      // Create line chart using blessed-contrib
      this.chart = contrib.line({
        parent: screen,
        top: '35%',
        left: 0,
        width: '100%',
        height: '30%',
        border: { type: 'line', fg: 'yellow' },
        title: ' Live TPS Graph ',
        showLegend: true,
        legend: { width: 10 },
        xLabelPadding: 3,
        xPadding: 5,
        showNthLabel: 5,
        maxY: this.data.maxTPS,
        wholeNumbersOnly: false,
        style: {
          border: { fg: 'yellow' },
          title: { fg: 'white', bold: true }
        }
      });
    } catch (error) {
      console.log('⚠️  TPS Graph: blessed-contrib not available, using fallback');
      // Fallback to simple text display
      this.chart = blessed.box({
        parent: screen,
        top: '35%',
        left: 0,
        width: '100%',
        height: '30%',
        border: { type: 'line', fg: 'yellow' },
        title: ' Live TPS Graph (Fallback) ',
        content: 'TPS Graph: blessed-contrib not available\nUse: npm install blessed-contrib',
        style: {
          border: { fg: 'yellow' },
          title: { fg: 'white', bold: true }
        }
      });
    }

    // Initialize with empty data
    this.updateChart();
    
    return this.chart;
  }

  /**
   * Update chart with current data
   */
  updateChart() {
    if (!this.chart || this.data.tpsHistory.length === 0) {
      return;
    }

    // Check if this is blessed-contrib chart or fallback
    if (this.chart.setData) {
      const x = this.data.timeHistory;
      const y = this.data.tpsHistory;

      this.chart.setData([{
        title: 'TPS',
        x: x,
        y: y,
        style: {
          line: 'yellow',
          text: 'yellow'
        }
      }]);
    } else {
      // Fallback: update text content
      const current = this.data.currentTPS;
      const peak = this.getPeakTPS();
      const average = this.getAverageTPS();
      
      this.chart.setContent(
        `Current TPS: ${current}\n` +
        `Peak TPS: ${peak}\n` +
        `Average TPS: ${average}\n` +
        `Data points: ${this.data.tpsHistory.length}`
      );
    }
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

    // Auto-adjust max Y if needed
    const maxTPS = Math.max(...this.data.tpsHistory);
    if (maxTPS > this.data.maxTPS * 0.8) {
      this.data.maxTPS = Math.ceil(maxTPS * 1.2);
      if (this.chart) {
        this.chart.options.maxY = this.data.maxTPS;
      }
    }

    this.updateChart();
  }

  /**
   * Set test data for demonstration
   */
  setTestData() {
    const now = new Date();
    const testData = [];
    
    // Generate 30 data points over the last 5 minutes
    for (let i = 30; i >= 0; i--) {
      const time = new Date(now.getTime() - i * 10000); // 10 second intervals
      const tps = 200 + Math.sin(i * 0.3) * 100 + (Math.random() - 0.5) * 50;
      
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
  startUpdates(interval = 10000) { // 10 second updates
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
   * Clear all data
   */
  clearData() {
    this.data.tpsHistory = [];
    this.data.timeHistory = [];
    this.updateChart();
  }

  /**
   * Set custom data points
   */
  setData(tpsArray, timeArray) {
    if (tpsArray.length !== timeArray.length) {
      throw new Error('TPS and time arrays must have the same length');
    }

    this.data.tpsHistory = [...tpsArray];
    this.data.timeHistory = [...timeArray];
    this.updateChart();
  }

  /**
   * Get chart data for export
   */
  getData() {
    return {
      tps: [...this.data.tpsHistory],
      time: [...this.data.timeHistory],
      current: this.data.currentTPS,
      peak: this.getPeakTPS(),
      average: this.getAverageTPS()
    };
  }

  /**
   * Clean up component
   */
  destroy() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    
    if (this.chart) {
      this.chart.destroy();
    }
  }
} 