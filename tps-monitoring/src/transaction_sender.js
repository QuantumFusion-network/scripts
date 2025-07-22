#!/usr/bin/env node

import { program } from 'commander'
import { TransactionSender } from './sender/index.js'

// Main function
const main = async () => {
  program
    .name('transaction_sender')
    .description('Transaction sender for TPS measurement')
    .version('1.0.0')
    .requiredOption('-n, --node <url>', 'Node URL (e.g.: ws://localhost:9944)')
    .requiredOption('-s, --sender <seed>', 'Sender seed phrase')
    .option('-r, --recipient <seed>', 'Recipient seed phrase (default = sender)')
    .option('--rate <number>', 'Sending rate (tx/sec)', '1')
    .option('--amount <number>', 'Transfer amount', '1000000')
    .option('--auto', 'Automatic mode (no interactivity)')
  
  program.parse()
  const options = program.opts()
  
  try {
    const sender = new TransactionSender()
    
    await sender.initialize(
      options.node,
      options.sender,
      options.recipient,
      parseInt(options.amount),
      parseFloat(options.rate)
    )
    
    if (options.auto) {
      await sender.startAutoMode()
    } else {
      sender.startInteractiveMode()
    }
    
  } catch (error) {
    console.error('💥 Critical error:', error.message)
    process.exit(1)
  }
}

// Run the program
main().catch(console.error) 