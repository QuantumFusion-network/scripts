import { ApiPromise, WsProvider } from '@polkadot/api'
import { Keyring } from '@polkadot/keyring'
import { cryptoWaitReady } from '@polkadot/util-crypto'
import { TransactionSender } from './TransactionSender.js'
import { BlockMonitor } from './BlockMonitor.js'

export class TPSMonitor {
  constructor() {
    this.api = null
    this.keyring = null
    this.transactionSender = null
    this.blockMonitor = null
    this.isRunning = false
  }

  async initialize(nodeUrl) {
    console.log('🚀 Starting Simple TPS Monitor...')
    console.log('📡 Connecting to:', nodeUrl)
    
    // Initialize crypto
    await cryptoWaitReady()
    
    // Connect to node
    const provider = new WsProvider(nodeUrl)
    this.api = await ApiPromise.create({ provider })
    
    // Setup keyring
    this.keyring = new Keyring({ type: 'sr25519' })
    
    // Initialize components
    this.transactionSender = new TransactionSender(this.api, this.keyring)
    this.blockMonitor = new BlockMonitor()
    
    // Setup transaction sender
    this.transactionSender.initialize()
    
    console.log('✅ Connected to blockchain')
  }

  async start(options) {
    await this.initialize(options.node)
    
    this.isRunning = true
    
    // Start monitoring blocks
    this.blockMonitor.startMonitoring(this.api)
    
    // Start sending transactions if tps > 0
    if (options.tps > 0) {
      await this.transactionSender.startSending(options.tps)
    }
    
    console.log('\n⌨️  Press Ctrl+C to stop\n')
    
    // Handle shutdown
    process.on('SIGINT', () => {
      this.stop()
    })
  }

  stop() {
    console.log('\n👋 Stopping TPS Monitor...')
    this.isRunning = false
    
    if (this.transactionSender) {
      this.transactionSender.stop()
    }
    
    // Display final stats
    if (this.blockMonitor) {
      const stats = this.blockMonitor.getStats()
      console.log(`\n📊 Final Stats:`)
      console.log(`   Blocks monitored: ${stats.blockCount}`)
      console.log(`   Total transactions: ${stats.totalTx}`)
      console.log(`   Average TPS: ${stats.avgTPS.toFixed(1)}`)
      console.log(`   Runtime: ${stats.runtime}s`)
    }
    
    process.exit(0)
  }

  getStats() {
    if (!this.blockMonitor) return null
    
    const stats = this.blockMonitor.getStats()
    if (this.transactionSender) {
      stats.sentTx = this.transactionSender.getTxCount()
    }
    
    return stats
  }
} 