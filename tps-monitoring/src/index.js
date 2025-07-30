#!/usr/bin/env node

import { Command } from 'commander'
import { TPSMonitor } from './modules/TPSMonitor.js'

// CLI interface
const program = new Command()
program
  .name('simple-tps-monitor')
  .description('Simple TPS measurement and load testing tool')
  .version('1.0.0')
  .option('-n, --node <url>', 'Node websocket URL', 'ws://localhost:9944')
  .option('-t, --tps <number>', 'Target TPS to generate (0 = monitor only)', '10')
  .action(async (options) => {
    options.tps = parseInt(options.tps)
    
    const monitor = new TPSMonitor()
    await monitor.start(options)
  })

program.parse() 