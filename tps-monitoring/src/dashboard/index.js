#!/usr/bin/env node

import { Command } from 'commander';
import TUIDashboard from './tui-dashboard.js';
import ProcessManager from './process-manager.js';
import LogAggregator from './log-aggregator.js';
import ReportGenerator from './report-generator.js';
import fs from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'
import { dashboardLogger } from '../shared/logger.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Custom log rotation for debug logs
class DebugLogger {
  constructor() {
    this.logsDir = path.resolve(__dirname, '../logs')
    this.logPath = path.join(this.logsDir, 'debug.log')
    this.maxFileSize = 10 * 1024 * 1024 // 10MB
    this.maxFiles = 3
    
    // Ensure logs directory exists
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true })
    }
  }

  rotateIfNeeded() {
    try {
      if (!fs.existsSync(this.logPath)) return
      
      const stats = fs.statSync(this.logPath)
      if (stats.size < this.maxFileSize) return

      // Rotate files: debug2.log -> debug3.log, debug1.log -> debug2.log, debug.log -> debug1.log
      for (let i = this.maxFiles - 1; i >= 1; i--) {
        const oldFile = path.join(this.logsDir, `debug${i}.log`)
        const newFile = path.join(this.logsDir, `debug${i + 1}.log`)
        
        if (fs.existsSync(oldFile)) {
          if (i === this.maxFiles - 1) {
            fs.unlinkSync(oldFile) // Delete oldest file
          } else {
            fs.renameSync(oldFile, newFile)
          }
        }
      }
      
      // Move current log to debug1.log
      const debug1Path = path.join(this.logsDir, 'debug1.log')
      fs.renameSync(this.logPath, debug1Path)
      
    } catch (error) {
      // Silent error handling for rotation
    }
  }

  write(level, ...args) {
    this.rotateIfNeeded()
    
    const timestamp = new Date().toISOString()
    const message = `[${timestamp}] [${level}] ${args.map(String).join(' ')}\n`
    
    fs.appendFileSync(this.logPath, message)
  }
}

const debugLogger = new DebugLogger()

// Redefine console methods to use custom debug logger
console.log = function (...args) {
  debugLogger.write('LOG', ...args)
}
console.error = function (...args) {
  debugLogger.write('ERROR', ...args)
}
console.warn = function (...args) {
  debugLogger.write('WARN', ...args)
}

class Dashboard {
  constructor() {
    this.dashboard = null;
    this.processManager = new ProcessManager();
    this.logAggregator = new LogAggregator();
    this.reportGenerator = new ReportGenerator();
  }

  async start(options) {
    console.log('🚀 Starting TPS Stress Test Dashboard...');
    
    // Initialize components
    await this.processManager.initialize();
    await this.logAggregator.initialize();
    
    // Start TUI Dashboard
    this.dashboard = new TUIDashboard({
      processManager: this.processManager,
      logAggregator: this.logAggregator,
      reportGenerator: this.reportGenerator
    });
    
    await this.dashboard.start(options);
  }

  async stop() {
    console.log('🛑 Stopping orchestrator...');
    if (this.dashboard) {
      await this.dashboard.stop();
    }
    await this.processManager.stopAll();
    await this.logAggregator.stop();
  }
}

// CLI Interface
const program = new Command();

program
  .name('tps-orchestrator')
  .description('TUI Orchestrator for blockchain TPS stress testing')
  .version('1.0.0')
  .option('-n, --node <url>', 'Node URL', 'ws://localhost:9944')
  .option('-s, --scenario <type>', 'Test scenario: light, medium, heavy, extreme', 'light')
  .option('-d, --duration <seconds>', 'Test duration in seconds', '300')
  .option('-r, --rate <tps>', 'Base TPS rate per sender', '50')
  .option('--senders <count>', 'Number of concurrent senders', '3')
  .option('--quiet', 'Minimal logging mode')
  .option('--verbose', 'Detailed logging mode');

program.action(async (options) => {
  const dashboard = new Dashboard();
  
  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    await dashboard.stop();
    process.exit(0);
  });
  
  try {
    await dashboard.start(options);
  } catch (error) {
    console.error('❌ Dashboard failed:', error.message);
    process.exit(1);
  }
});

program.parse(); 