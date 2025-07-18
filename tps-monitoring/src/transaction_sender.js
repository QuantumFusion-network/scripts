#!/usr/bin/env node

import { ApiPromise, WsProvider, Keyring } from '@polkadot/api'
import { program } from 'commander'
import readline from 'readline'

class TransactionSender {
  constructor() {
    this.api = null
    this.senderKeyPair = null
    this.recipientAddress = null
    this.amount = 1000000
    this.rate = 1
    this.isRunning = false
    this.intervalId = null
    this.currentNonce = null
    this.stats = {
      sent: 0,
      failed: 0,
      startTime: null
    }
  }

  async initialize(nodeUrl, senderSeed, recipientSeed, amount, rate) {
    console.log('🔧 [INIT] Starting TransactionSender initialization...')
    console.log(`🔧 [INIT] Connecting to node: ${nodeUrl}`)
    
    // Connect to node via WebSocket
    const provider = new WsProvider(nodeUrl)
    console.log('🔧 [INIT] Creating WsProvider...')
    
    this.api = await ApiPromise.create({ provider })
    console.log('✅ [INIT] Node connection established')
    
    // Simple check that balances pallet is available
    if (!this.api.tx.balances) {
      throw new Error('Balances pallet not available!')
    }
    
    // Create key pairs for sender and recipient
    console.log('🔧 [INIT] Creating keyring and key pairs...')
    const keyring = new Keyring({ type: 'sr25519' })
    this.senderKeyPair = keyring.addFromUri(senderSeed)
    console.log(`✅ [INIT] Sender created: ${this.senderKeyPair.address}`)
    
    // Define recipient address (if not specified - send to self)
    this.recipientAddress = recipientSeed 
      ? keyring.addFromUri(recipientSeed).address 
      : this.senderKeyPair.address
    
    if (recipientSeed) {
      console.log(`✅ [INIT] Recipient created: ${this.recipientAddress}`)
    } else {
      console.log(`✅ [INIT] Recipient = sender (self transfer): ${this.recipientAddress}`)
    }
    
    this.amount = amount
    this.rate = rate
    console.log(`💰 [INIT] Transfer amount: ${this.amount} (in smallest units)`)
    console.log(`📊 [INIT] Sending frequency: ${this.rate} tx/sec`)
    
    // Get current nonce for sender
    console.log('🔧 [INIT] Getting current nonce...')
    this.currentNonce = await this.getCurrentNonce()
    console.log(`🔢 [INIT] Starting nonce: ${this.currentNonce}`)
    
    console.log('✅ [INIT] Initialization completed successfully!')
    console.log('📋 [INIT] === CONNECTION PARAMETERS ===')
    console.log(`👤 Sender: ${this.senderKeyPair.address}`)
    console.log(`🎯 Recipient: ${this.recipientAddress}`)
    console.log(`💰 Amount: ${this.amount}`)
    console.log(`📊 Frequency: ${this.rate} tx/sec`)
    console.log(`🔢 Nonce: ${this.currentNonce}`)
    console.log('=========================================')
  }

  async getCurrentNonce() {
    const nonce = await this.api.rpc.system.accountNextIndex(this.senderKeyPair.address)
    return nonce.toNumber()
  }



  async createTransaction() {
    // Select available transfer method
    if (this.api.tx.balances.transfer) {
      return this.api.tx.balances.transfer(this.recipientAddress, this.amount)
    } else if (this.api.tx.balances.transferAllowDeath) {
      return this.api.tx.balances.transferAllowDeath(this.recipientAddress, this.amount)
    } else if (this.api.tx.balances.transferKeepAlive) {
      return this.api.tx.balances.transferKeepAlive(this.recipientAddress, this.amount)
    } else {
      throw new Error('No transfer methods available in balances pallet!')
    }
  }

  async sendSingleTransaction() {
    const startTime = Date.now()
    
    try {
      // Create and send transaction
      const tx = await this.createTransaction()
      const hash = await tx.signAndSend(this.senderKeyPair, { nonce: this.currentNonce })
      
      // Update statistics
      this.stats.sent++
      const usedNonce = this.currentNonce
      this.currentNonce++
      const duration = Date.now() - startTime
      
      // 🧹 Clean log: one line per transaction
      console.log(`🚀 [SEND] TX #${this.stats.sent}: nonce ${usedNonce} → ${hash.toString().slice(0, 10)}... (${duration}ms)`)
      
    } catch (error) {
      this.stats.failed++
      const duration = Date.now() - startTime
      
      console.error(`❌ [SEND] TX #${this.stats.sent + 1} FAILED: nonce ${this.currentNonce}, ${error.message} (${duration}ms)`)
      
      // Don't increment nonce on error
    }
  }

  async start() {
    if (this.isRunning) {
      console.log('⚠️ [START] Sending already started!')
      return
    }
    
    console.log(`\n🚀 [START] Starting transaction sending...`)
    console.log(`📊 [START] Frequency: ${this.rate} tx/sec`)
    console.log(`⏱️ [START] Interval between transactions: ${(1000 / this.rate).toFixed(0)}ms`)
    console.log(`🎯 [START] Transaction type: balances.transfer`)
    console.log(`💰 [START] Transfer amount: ${this.amount}`)
    console.log('💡 [START] Available commands: "stop", "stats", number to change frequency')
    
    this.isRunning = true
    this.stats.startTime = Date.now()
    console.log(`⏰ [START] Start time: ${new Date().toISOString()}`)
    
    const interval = 1000 / this.rate
    console.log(`🔄 [START] Setting interval: ${interval}ms`)
    
    this.intervalId = setInterval(() => {
      this.sendSingleTransaction()
    }, interval)
    
    console.log(`✅ [START] Transaction sending started!`)
    console.log(`📊 [START] Statistics will update in real time`)
  }

  stop() {
    if (!this.isRunning) {
      console.log('⚠️  Sending not started')
      return
    }
    
    this.isRunning = false
    clearInterval(this.intervalId)
    this.intervalId = null
    
    console.log('🛑 Sending stopped')
    this.showStats()
  }

  changeRate(newRate) {
    if (newRate <= 0) {
      console.log('❌ Rate must be positive')
      return
    }
    
    this.rate = newRate
    console.log(`📊 Rate changed to ${this.rate} tx/sec`)
    
    if (this.isRunning) {
      // Restart with new rate
      clearInterval(this.intervalId)
      const interval = 1000 / this.rate
      this.intervalId = setInterval(() => {
        this.sendSingleTransaction()
      }, interval)
    }
  }

  showStats() {
    const runtime = this.stats.startTime ? (Date.now() - this.stats.startTime) / 1000 : 0
    const actualRate = runtime > 0 ? this.stats.sent / runtime : 0
    const successRate = (this.stats.sent + this.stats.failed) > 0 
      ? (this.stats.sent / (this.stats.sent + this.stats.failed)) * 100 
      : 0
    
    console.log('\n📊 [STATS] === SENDING STATISTICS ===')
    console.log(`⏱️  [STATS] Runtime: ${runtime.toFixed(1)}s`)
    console.log(`🎯 [STATS] Status: ${this.isRunning ? '🟢 Running' : '🔴 Stopped'}`)
    console.log(`📤 [STATS] Sent successfully: ${this.stats.sent}`)
    console.log(`❌ [STATS] Errors: ${this.stats.failed}`)
    console.log(`📈 [STATS] Total attempts: ${this.stats.sent + this.stats.failed}`)
    console.log(`✅ [STATS] Success rate: ${successRate.toFixed(1)}%`)
    console.log(`📊 [STATS] Target frequency: ${this.rate} tx/sec`)
    console.log(`📈 [STATS] Actual frequency: ${actualRate.toFixed(2)} tx/sec`)
    console.log(`🔢 [STATS] Current nonce: ${this.currentNonce}`)
    
    if (runtime > 0) {
      const expectedTx = runtime * this.rate
      const efficiency = (this.stats.sent / expectedTx) * 100
      console.log(`🎯 [STATS] Expected to send: ${expectedTx.toFixed(0)}`)
      console.log(`⚡ [STATS] Efficiency: ${efficiency.toFixed(1)}%`)
    }
    
    console.log('==========================================\n')
  }

  startInteractiveMode() {
    console.log('\n🎮 Interactive mode started!')
    console.log('Available commands:')
    console.log('  start - start sending')
    console.log('  stop - stop sending')
    console.log('  stats - show statistics')
    console.log('  <number> - change frequency (e.g., 5 for 5 tx/sec)')
    console.log('  exit - quit')
    console.log('')
    
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: 'TPS> '
    })
    
    rl.prompt()
    
    rl.on('line', (input) => {
      const command = input.trim().toLowerCase()
      
      if (command === 'start') {
        this.start()
      } else if (command === 'stop') {
        this.stop()
      } else if (command === 'stats') {
        this.showStats()
      } else if (command === 'exit' || command === 'quit') {
        this.stop()
        console.log('👋 Goodbye!')
        process.exit(0)
      } else if (!isNaN(command) && Number(command) > 0) {
        this.changeRate(Number(command))
      } else {
        console.log('❌ Unknown command. Available: start, stop, stats, <number>, exit')
      }
      
      rl.prompt()
    })
    
    // Handle Ctrl+C
    rl.on('SIGINT', () => {
      this.stop()
      console.log('\n👋 Goodbye!')
      process.exit(0)
    })
  }

  async startAutoMode() {
    console.log('🤖 Automatic mode')
    console.log('💡 Press Ctrl+C to stop')
    
    await this.start()
    
    // Show stats every 10 seconds
    const statsInterval = setInterval(() => {
      if (this.isRunning) {
        this.showStats()
      }
    }, 10000)
    
    // Handle termination signals
    const cleanup = () => {
      clearInterval(statsInterval)
      this.stop()
      console.log('\n🛑 Received stop signal...')
      process.exit(0)
    }
    
    process.on('SIGINT', cleanup)
    process.on('SIGTERM', cleanup)
  }
}

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