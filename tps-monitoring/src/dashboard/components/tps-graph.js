import blessed from 'blessed'
import { BaseComponent } from './base-component.js'

/**
 * TPS Graph Component
 * Displays TPS data as text-based ASCII visualization
 */
export class TPSGraphComponent extends BaseComponent {
  constructor(options = {}) {
    super({ name: 'TPSGraph', ...options })
    
    this.data = {
      tpsHistory: [],
      timeHistory: [],
      maxDataPoints: 20, // Show last 20 data points
      maxTPS: 400,
      currentTPS: 0
    }
  }

  /**
   * Create text-based graph widget
   */
  createWidget(screen, layout) {
    this.widget = blessed.box({
      parent: screen,
      top: '40%',
      left: 0,
      width: '100%',
      height: '25%',
      border: { type: 'line', fg: 'yellow' },
      label: ' Live TPS Graph ',
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
   * Format ASCII graph
   */
  formatGraph() {

    return '{center}{yellow-fg}TPS graph temporarily disabled for debugging.{/yellow-fg}{/center}'
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
    })

    this.data.tpsHistory.push(tps)
    this.data.timeHistory.push(time)
    this.data.currentTPS = tps

    // Remove old data points if exceeding max
    if (this.data.tpsHistory.length > this.data.maxDataPoints) {
      this.data.tpsHistory.shift()
      this.data.timeHistory.shift()
    }

    this.updateContent()
  }

  /**
   * Set test data for demonstration
   */
  setTestData() {
    const now = new Date()
    const testData = []
    
    // Generate 20 data points
    for (let i = 20; i >= 0; i--) {
      const time = new Date(now.getTime() - i * 5000) // 5 second intervals
      const tps = 200 + Math.sin(i * 0.5) * 100 + (Math.random() - 0.5) * 50
      
      testData.push({
        time: time.toLocaleTimeString('en-US', { 
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        }),
        tps: Math.max(0, Math.round(tps))
      })
    }

    // Clear existing data
    this.data.tpsHistory = []
    this.data.timeHistory = []

    // Add test data
    testData.forEach(point => {
      this.addDataPoint(point.tps, point.time)
    })
  }

  /**
   * Start real-time updates
   */
  startUpdates(interval = 5000) { // 5 second updates
    this.updateInterval = setInterval(() => {
      // Generate realistic TPS data
      const baseTPS = 250
      const variation = Math.sin(Date.now() * 0.001) * 100
      const noise = (Math.random() - 0.5) * 50
      const newTPS = Math.max(0, Math.round(baseTPS + variation + noise))
      
      this.addDataPoint(newTPS)
    }, interval)
  }

  /**
   * Get current TPS value
   */
  getCurrentTPS() {
    return this.data.currentTPS
  }

  /**
   * Get peak TPS from history
   */
  getPeakTPS() {
    return this.data.tpsHistory.length > 0 ? Math.max(...this.data.tpsHistory) : 0
  }

  /**
   * Get average TPS from history
   */
  getAverageTPS() {
    if (this.data.tpsHistory.length === 0) return 0
    const sum = this.data.tpsHistory.reduce((a, b) => a + b, 0)
    return Math.round(sum / this.data.tpsHistory.length)
  }

  /**
   * Update widget content
   */
  updateContent() {
    if (this.widget) {
      this.widget.setContent(this.formatGraph())
      this.widget.screen.render()
    }
  }

  /**
   * Clean up component
   */
  destroy() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval)
    }
    
    if (this.widget) {
      this.widget.destroy()
    }
  }
} 