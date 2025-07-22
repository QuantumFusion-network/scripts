import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class LogAggregator {
  constructor() {
    this.logBuffer = [];
    this.maxBufferSize = 1000;
    this.logFiles = new Map();
    this.eventHandlers = new Map();
    this.isRunning = false;
  }

  async initialize() {
    console.log('📝 Initializing Log Aggregator...');
    
    // Ensure logs directory exists
    const logsDir = path.join(__dirname, '../logs');
    try {
      await fs.mkdir(logsDir, { recursive: true });
    } catch (error) {
      // Directory already exists
    }

    this.isRunning = true;
    
    // Start periodic log flush
    this.flushInterval = setInterval(() => {
      this.flushLogs();
    }, 1000);
  }

  async addLog(source, level, message, data = {}) {
    if (!this.isRunning) return;

    const logEntry = {
      timestamp: new Date().toISOString(),
      source,
      level: level.toUpperCase(),
      message,
      data,
      id: Date.now() + Math.random()
    };

    // Add to buffer
    this.logBuffer.push(logEntry);
    
    // Trim buffer if too large
    if (this.logBuffer.length > this.maxBufferSize) {
      this.logBuffer = this.logBuffer.slice(-this.maxBufferSize);
    }

    // Write to appropriate log file
    await this.writeToFile(source, logEntry);
    
    // Emit event for TUI
    this.emit('newLog', logEntry);
  }

  async writeToFile(source, logEntry) {
    try {
      const logFileName = this.getLogFileName(source);
      const logLine = this.formatLogLine(logEntry);
      
      // Write to source-specific log
      await fs.appendFile(logFileName, logLine + '\n');
      
      // Write to aggregated log
      const aggregatedLogFile = path.join(__dirname, '../logs/aggregated.log');
      await fs.appendFile(aggregatedLogFile, logLine + '\n');
      
    } catch (error) {
      console.error('Failed to write log:', error);
    }
  }

  getLogFileName(source) {
    const logsDir = path.join(__dirname, '../logs');
    
    if (source === 'monitor') {
      return path.join(logsDir, 'monitor.log');
    } else if (source.startsWith('sender-')) {
      return path.join(logsDir, `${source}.log`);
    } else if (source === 'orchestrator') {
      return path.join(logsDir, 'orchestrator.log');
    } else {
      return path.join(logsDir, 'other.log');
    }
  }

  formatLogLine(logEntry) {
    const timestamp = new Date(logEntry.timestamp).toLocaleTimeString();
    const level = logEntry.level.padEnd(5);
    const source = logEntry.source.padEnd(12);
    
    let line = `[${timestamp}] ${level} ${source} ${logEntry.message}`;
    
    // Add data if present
    if (Object.keys(logEntry.data).length > 0) {
      line += ` | ${JSON.stringify(logEntry.data)}`;
    }
    
    return line;
  }

  async flushLogs() {
    // This method can be used for batch writing optimizations
    // Currently, we write immediately, but could buffer writes here
  }

  getRecentLogs(count = 50, filter = {}) {
    let logs = [...this.logBuffer];
    
    // Apply filters
    if (filter.source) {
      logs = logs.filter(log => log.source === filter.source);
    }
    
    if (filter.level) {
      logs = logs.filter(log => log.level === filter.level.toUpperCase());
    }
    
    if (filter.since) {
      const sinceTime = new Date(filter.since).getTime();
      logs = logs.filter(log => new Date(log.timestamp).getTime() >= sinceTime);
    }
    
    // Return most recent logs
    return logs.slice(-count);
  }

  getLogs(options = {}) {
    const {
      source,
      level,
      limit = 50,
      offset = 0
    } = options;

    let filteredLogs = [...this.logBuffer];

    if (source) {
      filteredLogs = filteredLogs.filter(log => log.source === source);
    }

    if (level) {
      filteredLogs = filteredLogs.filter(log => log.level === level.toUpperCase());
    }

    // Sort by timestamp (newest first)
    filteredLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Apply pagination
    return filteredLogs.slice(offset, offset + limit);
  }

  async parseProcessOutput(processData) {
    const { processId, type, data } = processData;
    
    // Parse different types of output
    const lines = data.split('\n').filter(line => line.trim());
    
    for (const line of lines) {
      let level = 'INFO';
      let message = line;
      let logData = {};

      // Try to parse structured logs
      if (line.includes('ERROR') || line.includes('❌')) {
        level = 'ERROR';
      } else if (line.includes('WARN') || line.includes('⚠️')) {
        level = 'WARN';
      } else if (line.includes('DEBUG') || line.includes('🔍')) {
        level = 'DEBUG';
      }

      // Extract metrics from monitor output
      if (processId === 'monitor' && line.includes('TPS:')) {
        const tpsMatch = line.match(/TPS:\s*(\d+\.?\d*)/);
        if (tpsMatch) {
          logData.tps = parseFloat(tpsMatch[1]);
        }
      }

      // Extract nonce info from sender output
      if (processId.startsWith('sender-') && line.includes('nonce')) {
        const nonceMatch = line.match(/nonce[:\s]+(\d+)/i);
        if (nonceMatch) {
          logData.nonce = parseInt(nonceMatch[1]);
        }
      }

      await this.addLog(processId, level, message.trim(), logData);
    }
  }

  async stop() {
    console.log('📝 Stopping Log Aggregator...');
    this.isRunning = false;
    
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    
    // Final flush
    await this.flushLogs();
  }

  // Event emitter functionality
  on(event, handler) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event).push(handler);
  }

  emit(event, data) {
    const handlers = this.eventHandlers.get(event) || [];
    handlers.forEach(handler => {
      try {
        handler(data);
      } catch (error) {
        console.error(`Error in log aggregator event handler for ${event}:`, error);
      }
    });
  }

  // Statistics
  getLogStats() {
    const stats = {
      total: this.logBuffer.length,
      byLevel: {},
      bySource: {},
      recentErrors: 0
    };

    const recentTime = Date.now() - (5 * 60 * 1000); // Last 5 minutes

    for (const log of this.logBuffer) {
      // Count by level
      stats.byLevel[log.level] = (stats.byLevel[log.level] || 0) + 1;
      
      // Count by source
      stats.bySource[log.source] = (stats.bySource[log.source] || 0) + 1;
      
      // Count recent errors
      if (log.level === 'ERROR' && new Date(log.timestamp).getTime() > recentTime) {
        stats.recentErrors++;
      }
    }

    return stats;
  }
}

export default LogAggregator; 