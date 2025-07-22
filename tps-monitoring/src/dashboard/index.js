#!/usr/bin/env node

import { Command } from 'commander';
import TUIDashboard from './tui-dashboard.js';
import ProcessManager from './process-manager.js';
import LogAggregator from './log-aggregator.js';
import ReportGenerator from './report-generator.js';

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