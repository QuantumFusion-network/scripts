#!/usr/bin/env node

import { program } from 'commander'
import { TransactionSender } from './sender/index.js'

// Helper function to convert short names to seed phrases
const convertToSeed = (name) => {
  if (!name) return null
  
  // If already a seed phrase (starts with //), return as is
  if (name.startsWith('//')) return name
  
  // Convert common names to test seeds
  const testAccounts = {
    'alice': '//Alice',
    'bob': '//Bob', 
    'charlie': '//Charlie',
    'dave': '//Dave',
    'eve': '//Eve',
    'ferdie': '//Ferdie'
  }
  
  const lowerName = name.toLowerCase()
  return testAccounts[lowerName] || `//${name}`
}

// Main function
const main = async () => {
  program
    .name('transaction_sender')
    .description('Transaction sender for TPS measurement')
    .version('1.0.0')
    .option('-n, --node <url>', 'Node URL', 'ws://localhost:9944')
    .option('-s, --sender <name>', 'Sender (Alice, Bob, Charlie, etc.)', 'Alice')
    .option('-r, --recipient <name>', 'Recipient (default = sender)')
    .option('--rate <number>', 'Sending rate (tx/sec)', '1')
    .option('--amount <number>', 'Transfer amount', '1000000')
    .option('--auto', 'Automatic mode (no interactivity)')
  
  program.parse()
  const options = program.opts()
  
  try {
    const sender = new TransactionSender()
    
    // Convert names to seed phrases
    const senderSeed = convertToSeed(options.sender)
    const recipientSeed = convertToSeed(options.recipient)
    
    await sender.initialize(
      options.node,
      senderSeed,
      recipientSeed,
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