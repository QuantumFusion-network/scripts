#!/usr/bin/env node

import { program } from 'commander'
import { TPSMonitor } from './monitor/index.js'

// Main function
const main = async () => {
  program
    .name('tps_monitor')
    .description('TPS monitor for blockchain')
    .version('1.0.0')
    .requiredOption('-n, --node <url>', 'Node URL (e.g.: ws://localhost:9944)')
    .option('-a, --addresses <addresses>', 'Addresses to track (comma-separated)')
    .option('-o, --output <filename>', 'CSV export file', 'tps_stats.csv')
  
  program.parse()
  const options = program.opts()
  
  try {
    const monitor = new TPSMonitor()
    
    // Parse addresses
    const targetAddresses = options.addresses 
      ? options.addresses.split(',').map(addr => addr.trim())
      : []
    
    await monitor.initialize(options.node, targetAddresses)
    
    if (targetAddresses.length > 0) {
      console.log(`🎯 Monitoring specific addresses`)
    } else {
      console.log('🎯 Monitoring all transactions')
    }
    
    await monitor.startMonitoring()
    
    // Handle termination signals
    const cleanup = () => {
      monitor.cleanup()
      
      // Auto-export on exit
      monitor.autoExport(options.output)
      
      process.exit(0)
    }
    
    process.on('SIGINT', cleanup)
    process.on('SIGTERM', cleanup)
    
  } catch (error) {
    console.error('💥 Critical error:', error.message)
    process.exit(1)
  }
}

// Run the program
main().catch(console.error) 