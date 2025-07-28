#!/usr/bin/env node

import { Command } from 'commander'
import { ApiPromise, WsProvider } from '@polkadot/api'
import { Keyring } from '@polkadot/keyring'
import { cryptoWaitReady } from '@polkadot/util-crypto'

class SimpleTPSMonitor {
  constructor() {
    this.api = null
    this.keyring = null
    this.alice = null
    this.isRunning = false
    this.blockTimes = []
    this.txCounts = []
    this.startTime = Date.now()
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
    this.alice = this.keyring.addFromUri('//Alice')
    
    console.log('✅ Connected to blockchain')
    console.log('👤 Using Alice account:', this.alice.address.substring(0, 20) + '...')
  }

  async startSendingTransactions(tpsTarget = 10) {
    console.log(`🔄 Starting to send ${tpsTarget} TPS (Alice → Alice transfers)`)
    
    const intervalMs = 1000 / tpsTarget
    let txCount = 0
    
    const sendTx = async () => {
      if (!this.isRunning) return
      
      try {
        // Simple transfer Alice -> Alice (1 unit)
        const transfer = this.api.tx.balances.transferKeepAlive(this.alice.address, 1)
        await transfer.signAndSend(this.alice)
        txCount++
        
        if (txCount % 10 === 0) {
          console.log(`📤 Sent ${txCount} transactions`)
        }
      } catch (error) {
        console.error('❌ Transfer failed:', error.message)
      }
      
      // Schedule next transaction
      if (this.isRunning) {
        setTimeout(sendTx, intervalMs)
      }
    }
    
    // Start sending
    sendTx()
  }

  startMonitoring() {
    console.log('📊 Monitoring TPS...')
    
    this.api.derive.chain.subscribeNewHeads(async (header) => {
      const blockNumber = header.number.toNumber()
      const now = Date.now()
      
      // Get block details
      const blockHash = header.hash
      const block = await this.api.rpc.chain.getBlock(blockHash)
      const txCount = block.block.extrinsics.length
      
      // Calculate block time
      this.blockTimes.push(now)
      this.txCounts.push(txCount)
      
      // Keep only last 10 blocks for average
      if (this.blockTimes.length > 10) {
        this.blockTimes.shift()
        this.txCounts.shift()
      }
      
      // Calculate TPS
      let avgTPS = 0
      if (this.blockTimes.length > 1) {
        const timeSpan = (this.blockTimes[this.blockTimes.length - 1] - this.blockTimes[0]) / 1000
        const totalTx = this.txCounts.reduce((sum, count) => sum + count, 0)
        avgTPS = totalTx / timeSpan
      }
      
      // Console output
      const runtime = Math.floor((now - this.startTime) / 1000)
      console.log(`Block #${blockNumber}: ${txCount} txs, ${avgTPS.toFixed(1)} TPS (${runtime}s runtime)`)
    })
  }

  async start(options) {
    await this.initialize(options.node)
    
    this.isRunning = true
    
    // Start monitoring blocks
    this.startMonitoring()
    
    // Start sending transactions if tps > 0
    if (options.tps > 0) {
      await this.startSendingTransactions(options.tps)
    }
    
    console.log('\n⌨️  Press Ctrl+C to stop\n')
    
    // Handle shutdown
    process.on('SIGINT', () => {
      console.log('\n👋 Stopping TPS Monitor...')
      this.isRunning = false
      process.exit(0)
    })
  }
}

// CLI
const program = new Command()
program
  .name('simple-tps-monitor')
  .description('Simple TPS measurement and load testing tool')
  .version('1.0.0')
  .option('-n, --node <url>', 'Node websocket URL', 'ws://localhost:9944')
  .option('-t, --tps <number>', 'Target TPS to generate (0 = monitor only)', '10')
  .action(async (options) => {
    options.tps = parseInt(options.tps)
    
    const monitor = new SimpleTPSMonitor()
    await monitor.start(options)
  })

program.parse() 