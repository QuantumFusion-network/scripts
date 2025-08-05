// === MAIN TPS MONITOR CLASS ===
// Coordinates transaction sending and block monitoring
import { ApiPromise, WsProvider } from '@polkadot/api'
import { Keyring } from '@polkadot/keyring'
import { cryptoWaitReady } from '@polkadot/util-crypto'
import { TransactionSender } from './TransactionSender.js'
import { BlockMonitor } from './BlockMonitor.js'

export class TPSMonitor {
  constructor() {
    this.api = null               // Blockchain API connection
    this.keyring = null           // Account keyring
    this.transactionSender = null // Component for sending transactions
    this.blockMonitor = null      // Component for monitoring blocks
    this.isRunning = false        // Overall running status
  }

  // === SETUP BLOCKCHAIN CONNECTION ===
  // Connect to node and initialize all components
  async initialize(nodeUrl) {
    console.log('🚀 Starting Simple TPS Monitor...')
    console.log('📡 Connecting to:', nodeUrl)
    
    // === INITIALIZE CRYPTO ===
    // Wait for cryptographic functions to be ready
    await cryptoWaitReady()
    
    // === CONNECT TO BLOCKCHAIN NODE ===
    // Create WebSocket connection to blockchain
    const provider = new WsProvider(nodeUrl)
    this.api = await ApiPromise.create({ provider })
    
    // === SETUP ACCOUNT MANAGEMENT ===
    // Create keyring for managing accounts
    this.keyring = new Keyring({ type: 'sr25519' })
    
    // === INITIALIZE COMPONENTS ===
    // Create transaction sender and block monitor
    this.transactionSender = new TransactionSender(this.api, this.keyring)
    this.blockMonitor = new BlockMonitor()
    
    // === SETUP TRANSACTION SENDER ===
    // Initialize Alice account and get starting nonce
    await this.transactionSender.initialize()
    
    console.log('✅ Connected to blockchain')
  }

  // === START MONITORING ===
  // Start both block monitoring and transaction sending
  async start(options) {
    // Connect to blockchain first
    await this.initialize(options.node)
    
    this.isRunning = true
    
    // === START BLOCK MONITORING ===
    // Begin monitoring new blocks for TPS calculation
    this.blockMonitor.startMonitoring(this.api)
    
    // === START TRANSACTION SENDING (IF REQUESTED) ===
    // Only send transactions if TPS > 0
    if (options.tps > 0) {
      await this.transactionSender.startSending(options.tps)
    }
    
    console.log('\n⌨️  Press Ctrl+C to stop\n')
    
    // === SETUP GRACEFUL SHUTDOWN ===
    // Handle Ctrl+C to stop cleanly
    process.on('SIGINT', () => {
      this.stop()
    })
  }

  // === STOP MONITORING ===
  // Stop all components and show final statistics
  stop() {
    console.log('\n👋 Stopping TPS Monitor...')
    this.isRunning = false
    
    // === STOP TRANSACTION SENDING ===
    if (this.transactionSender) {
      this.transactionSender.stop()
    }
    
    // === DISPLAY FINAL STATISTICS ===
    if (this.blockMonitor) {
      const stats = this.blockMonitor.getStats()
      console.log(`\n📊 Final Stats:`)
      console.log(`   Blocks monitored: ${stats.blockCount}`)
      console.log(`   Total transactions: ${stats.totalTx}`)
      console.log(`   Average TPS: ${stats.avgTPS.toFixed(1)}`)
      console.log(`   Runtime: ${stats.runtime}s`)
    }
    
    // Exit the program
    process.exit(0)
  }

  // === GET CURRENT STATISTICS ===
  // Return current monitoring stats
  getStats() {
    if (!this.blockMonitor) return null
    
    // Get block monitoring stats
    const stats = this.blockMonitor.getStats()
    
    // Add transaction sending stats if available
    if (this.transactionSender) {
      stats.sentTx = this.transactionSender.getTxCount()
    }
    
    return stats
  }
} 