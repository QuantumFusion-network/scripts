import blessed from 'blessed';
import { BaseComponent } from './base-component.js';

/**
 * Event Log Component
 * Displays real-time event logs with color-coded levels
 */
export class EventLogComponent extends BaseComponent {
  constructor(options = {}) {
    super({ name: 'EventLog', ...options });
    
    this.data = {
      logs: [],
      maxLogs: 50,
      logLevels: ['ERROR', 'WARN', 'INFO', 'DEBUG', 'TRACE'],
      filters: {
        level: null, // null = show all
        source: null
      }
    };

    // Memory usage logging every 5 seconds
    this.memoryLogInterval = setInterval(() => {
      const mem = process.memoryUsage();
      const rss = (mem.rss / 1024 / 1024).toFixed(1);
      const heap = (mem.heapUsed / 1024 / 1024).toFixed(1);
      console.log(`[MEM] rss: ${rss} MB, heap: ${heap} MB`);
    }, 5000);
  }

  /**
   * Create blessed log widget
   */
  createWidget(screen, layout) {
    this.widget = blessed.log({
      parent: screen,
      top: '65%',
      left: 0,
      width: '100%',
      height: '35%',
      border: { type: 'line', fg: 'red' },
      label: ' Event Log ',
      tags: true,
      scrollable: true,
      scrollbar: {
        ch: ' ',
        track: {
          bg: 'cyan'
        },
        style: {
          bg: 'blue'
        }
      },
      padding: {
        top: 0,
        bottom: 0,
        left: 1,
        right: 1
      },
      style: {
        border: { fg: 'red' },
        label: { fg: 'white', bold: true }
      }
    });

    return this.widget;
  }

  /**
   * Add a log entry
   */
  addLog(level, message, source = 'System', timestamp = null) {
    const time = timestamp || new Date().toLocaleTimeString('en-US', { 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    const logEntry = {
      timestamp: time,
      level: level.toUpperCase(),
      message,
      source,
      raw: `[${time}] ${level.toUpperCase()} ${source}: ${message}`
    };

    this.data.logs.push(logEntry);

    // Remove old logs if exceeding max
    if (this.data.logs.length > this.data.maxLogs) {
      this.data.logs.shift();
    }

    // Apply filters and display
    this.displayLogs();
  }

  /**
   * Add error log
   */
  error(message, source = 'System') {
    this.addLog('ERROR', message, source);
  }

  /**
   * Add warning log
   */
  warn(message, source = 'System') {
    this.addLog('WARN', message, source);
  }

  /**
   * Add info log
   */
  info(message, source = 'System') {
    this.addLog('INFO', message, source);
  }

  /**
   * Add debug log
   */
  debug(message, source = 'System') {
    this.addLog('DEBUG', message, source);
  }

  /**
   * Add trace log
   */
  trace(message, source = 'System') {
    this.addLog('TRACE', message, source);
  }

  /**
   * Display filtered logs
   */
  displayLogs() {
    if (!this.widget) return;

    // Always clear widget before adding logs
    this.widget.setContent('');

    // Filter logs
    const filteredLogs = this.data.logs.filter(log => {
      if (this.data.filters.level && log.level !== this.data.filters.level) {
        return false;
      }
      if (this.data.filters.source && log.source !== this.data.filters.source) {
        return false;
      }
      return true;
    });

    // Add filtered logs to widget
    filteredLogs.forEach(log => {
      const colorTag = this.getLevelColor(log.level);
      const formattedLog = `${colorTag}[${log.timestamp}] ${log.level} ${log.source}: ${log.message}{/}`;
      this.widget.log(formattedLog);
    });

    this.widget.screen.render();
  }

  /**
   * Get color for log level
   */
  getLevelColor(level) {
    switch (level.toUpperCase()) {
      case 'ERROR':
        return '{red-fg}';
      case 'WARN':
        return '{yellow-fg}';
      case 'INFO':
        return '{white-fg}';
      case 'DEBUG':
        return '{cyan-fg}';
      case 'TRACE':
        return '{gray-fg}';
      default:
        return '{white-fg}';
    }
  }

  /**
   * Set log level filter
   */
  setLevelFilter(level) {
    this.data.filters.level = level;
    this.displayLogs();
  }

  /**
   * Set source filter
   */
  setSourceFilter(source) {
    this.data.filters.source = source;
    this.displayLogs();
  }

  /**
   * Clear all filters
   */
  clearFilters() {
    this.data.filters.level = null;
    this.data.filters.source = null;
    this.displayLogs();
  }

  /**
   * Clear all logs
   */
  clearLogs() {
    this.data.logs = [];
    if (this.widget) {
      this.widget.setContent('');
      this.widget.screen.render();
    }
  }

  /**
   * Get log statistics
   */
  getLogStats() {
    const stats = {
      total: this.data.logs.length,
      byLevel: {},
      bySource: {}
    };

    this.data.logs.forEach(log => {
      // Count by level
      stats.byLevel[log.level] = (stats.byLevel[log.level] || 0) + 1;
      
      // Count by source
      stats.bySource[log.source] = (stats.bySource[log.source] || 0) + 1;
    });

    return stats;
  }

  /**
   * Set test data for demonstration
   */
  setTestData() {
    this.clearLogs();
    
    const testLogs = [
      { level: 'INFO', message: 'TPS Stress Test Dashboard started', source: 'Dashboard' },
      { level: 'INFO', message: 'Connected to node ws://localhost:9944', source: 'Network' },
      { level: 'INFO', message: 'Block #12,847: 23 txs processed, 287 TPS', source: 'Monitor' },
      { level: 'WARN', message: 'Charlie: nonce gap detected, retrying with nonce #1,030', source: 'Sender' },
      { level: 'INFO', message: 'Peak TPS reached: 312', source: 'Monitor' },
      { level: 'ERROR', message: 'Dave: connection lost, attempting reconnect...', source: 'Network' },
      { level: 'INFO', message: 'Alice→Bob transfer successful, nonce #1,247', source: 'Sender' },
      { level: 'DEBUG', message: 'Rate controller adjusted to 95 TPS', source: 'Controller' },
      { level: 'INFO', message: 'Exporting test report to CSV', source: 'Reporter' },
      { level: 'TRACE', message: 'Memory usage: 45.2 MB', source: 'System' }
    ];

    testLogs.forEach((log, index) => {
      setTimeout(() => {
        this.addLog(log.level, log.message, log.source);
      }, index * 1000);
    });
  }

  /**
   * Start simulated log generation
   */
  startSimulation(interval = 3000) {
    this.simulationInterval = setInterval(() => {
      const levels = ['INFO', 'WARN', 'ERROR', 'DEBUG'];
      const sources = ['Monitor', 'Sender', 'Network', 'System'];
      const messages = [
        'Block processed successfully',
        'Transaction sent',
        'Connection stable',
        'Memory usage normal',
        'Rate adjustment applied',
        'Nonce updated',
        'Statistics collected',
        'Report generated'
      ];

      const randomLevel = levels[Math.floor(Math.random() * levels.length)];
      const randomSource = sources[Math.floor(Math.random() * sources.length)];
      const randomMessage = messages[Math.floor(Math.random() * messages.length)];

      this.addLog(randomLevel, randomMessage, randomSource);
    }, interval);
  }

  /**
   * Stop simulation
   */
  stopSimulation() {
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
      this.simulationInterval = null;
    }
  }

  /**
   * Clean up component
   */
  destroy() {
    if (this.memoryLogInterval) {
      clearInterval(this.memoryLogInterval);
      this.memoryLogInterval = null;
    }
    this.stopSimulation();
    
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    
    if (this.widget) {
      this.widget.destroy();
    }
  }
} 