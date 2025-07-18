#!/usr/bin/env node

import { ApiPromise, WsProvider } from '@polkadot/api'
import { program } from 'commander'
import fs from 'fs'

class TPSMonitor {
  constructor() {
    this.api = null
    this.startTime = Date.now()
    this.totalBlocks = 0
    this.totalTransactions = 0
    this.ourTransactions = 0
    this.targetAddresses = []
    this.blockTimes = []
    this.csvData = []
    this.unsubscribe = null
  }

  async initialize(nodeUrl, targetAddresses = []) {
    console.log('🔧 [INIT] Starting TPS Monitor initialization...')
    console.log(`🔧 [INIT] Connecting to node: ${nodeUrl}`)
    
    // Connect to node via WebSocket
    const provider = new WsProvider(nodeUrl)
    console.log('🔧 [INIT] Creating WsProvider...')
    
    this.api = await ApiPromise.create({ provider })
    console.log('✅ [INIT] Node connection established')
    
    // Configure tracked addresses
    this.targetAddresses = targetAddresses
    console.log(`📊 [INIT] Monitoring configuration:`)
    
    if (targetAddresses.length > 0) {
      console.log(`🎯 [INIT] Tracking ONLY addresses: ${targetAddresses.length} total`)
      targetAddresses.forEach((addr, i) => {
        console.log(`   ${i + 1}. ${addr}`)
      })
    } else {
      console.log(`🌍 [INIT] Tracking ALL balance transfer transactions`)
    }
    
    console.log('🔧 [INIT] Initializing block monitoring...')
    console.log('🎯 [INIT] Will count only balance transfer transactions')
    console.log('📈 [INIT] TPS = transaction count / block time')
    console.log('💡 [INIT] Press Ctrl+C to stop')
    console.log('✅ [INIT] Initialization completed! Starting monitoring...')
  }

  isOurAddress(address) {
    if (this.targetAddresses.length === 0) return false
    return this.targetAddresses.includes(address.toString())
  }

  analyzeExtrinsics(extrinsics) {
    let totalBalanceTransfers = 0
    let ourBalanceTransfers = 0
    
    console.log(`🔍 [ANALYZE] Analyzing ${extrinsics.length} extrinsics in block...`)
    
    for (const ext of extrinsics) {
      // Check this is NOT a system inherent transaction
      if (ext.method && ext.method.section && ext.method.method) {
        const section = ext.method.section
        const method = ext.method.method
        
        // Skip system inherent transactions
        const isSystemInherent = 
          section === 'timestamp' ||
          section === 'parachainSystem' ||
          section === 'paraInherent' ||
          section === 'authorInherent'
        
        if (isSystemInherent) {
          console.log(`⏭️  [ANALYZE] Skipping system: ${section}.${method}`)
          continue
        }
        
        // ✅ Count balance transfers (transfer, transferAllowDeath, transferKeepAlive)
        if (section === 'balances' && (method === 'transfer' || method === 'transferAllowDeath' || method === 'transferKeepAlive')) {
          totalBalanceTransfers++
          console.log(`💸 [ANALYZE] Found balances.${method} #${totalBalanceTransfers}`)
          
          // Check if this is our transaction
          if (ext.signer && this.isOurAddress(ext.signer)) {
            ourBalanceTransfers++
            console.log(`🎯 [ANALYZE] This is OUR transaction! (from ${ext.signer.toString().slice(0, 8)}...)`)
          } else if (ext.signer) {
            console.log(`👤 [ANALYZE] External transaction (from ${ext.signer.toString().slice(0, 8)}...)`)
          }
        } else {
          // Log other transaction types for debugging
          console.log(`🔍 [ANALYZE] Other transaction: ${section}.${method} (ignoring)`)
        }
      }
    }
    
    console.log(`📊 [ANALYZE] Result: ${totalBalanceTransfers} balance transfers, ${ourBalanceTransfers} ours`)
    return { 
      totalUserTx: totalBalanceTransfers,  // rename for clarity
      ourTx: ourBalanceTransfers 
    }
  }

  calculateTPS(transactionCount, measuredBlockTime) {
    // 🎯 Universal TPS calculation:
    // Use measured block times for any Substrate network
    // TPS = transactions_in_block / block_time_in_seconds
    
    if (!measuredBlockTime || measuredBlockTime <= 0) {
      console.log(`⚠️  [TPS] No valid block time measurements (${measuredBlockTime}ms)`)
      console.log(`🔍 [TPS] Skipping TPS calculation - need real block time data`)
      return 0
    }
    
    const blockTimeInSeconds = measuredBlockTime / 1000  // convert to seconds
    const tps = transactionCount / blockTimeInSeconds
    
    console.log(`📊 [TPS] Universal calculation: ${transactionCount} tx / ${blockTimeInSeconds.toFixed(3)}s = ${tps.toFixed(2)} TPS`)
    console.log(`⏱️  [TPS] Based on MEASURED block time: ${measuredBlockTime}ms`)
    
    return tps
  }

  calculateAverageBlockTime() {
    if (this.blockTimes.length < 2) return 0
    
    const intervals = []
    for (let i = 1; i < this.blockTimes.length; i++) {
      intervals.push(this.blockTimes[i] - this.blockTimes[i - 1])
    }
    
    return intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length
  }

  formatBlockStats(blockNumber, totalTx, ourTx, avgBlockTime) {
    let instantTPS = 0
    let ourTPS = 0
    
    if (avgBlockTime > 0) {
      instantTPS = this.calculateTPS(totalTx, avgBlockTime)
      ourTPS = this.calculateTPS(ourTx, avgBlockTime)
    }
    
    const tpsInfo = avgBlockTime > 0 
      ? `TPS: ${instantTPS.toFixed(1)} (${ourTPS.toFixed(1)} ours)`
      : `TPS: waiting for measurements...`
    
    return `🧱 Block #${blockNumber} | Total TX: ${totalTx} | Our TX: ${ourTx} | ${tpsInfo}`
  }

  async processNewBlock(blockHash) {
    const startTime = Date.now()
    console.log(`\n🧱 [BLOCK] Starting new block processing...`)
    console.log(`🆔 [BLOCK] Hash: ${blockHash.toString().slice(0, 16)}...`)
    
    try {
      // Get block data and number in parallel
      console.log(`🔄 [BLOCK] Loading block data...`)
      const [block, blockNumber] = await Promise.all([
        this.api.rpc.chain.getBlock(blockHash),
        this.api.rpc.chain.getHeader(blockHash).then(header => header.number.toNumber())
      ])
      
      console.log(`📋 [BLOCK] Block #${blockNumber} loaded`)
      console.log(`📦 [BLOCK] Extrinsics in block: ${block.block.extrinsics.length}`)
      
      // Analyze transactions in the block
      const extrinsics = block.block.extrinsics
      const { totalUserTx, ourTx } = this.analyzeExtrinsics(extrinsics)
      
      // Update timestamps for average block time calculation
      const currentTime = Date.now()
      this.blockTimes.push(currentTime)
      
      // Keep only last 100 blocks for average calculation
      if (this.blockTimes.length > 100) {
        const removed = this.blockTimes.shift()
        console.log(`🗑️  [BLOCK] Removed old timestamp (keeping last 100)`)
      }
      
      // Update overall statistics
      this.totalBlocks++
      this.totalTransactions += totalUserTx
      this.ourTransactions += ourTx
      
      console.log(`📊 [BLOCK] Updated statistics:`)
      console.log(`   🧱 Total blocks: ${this.totalBlocks}`)
      console.log(`   💸 Total balances.transfer: ${this.totalTransactions}`)
      console.log(`   🎯 Our transactions: ${this.ourTransactions}`)
      
      // Calculate average block time
      const avgBlockTime = this.calculateAverageBlockTime()
      console.log(`⏱️  [BLOCK] Average block time: ${(avgBlockTime / 1000).toFixed(2)}s`)
      
      // Log block results
      const blockProcessTime = Date.now() - startTime
      console.log(this.formatBlockStats(blockNumber, totalUserTx, ourTx, avgBlockTime))
      console.log(`⚡ [BLOCK] Block processed in ${blockProcessTime}ms`)
      
      // Add data to CSV only if we have block time measurements
      let instantTPS = 0
      let ourTPS = 0
      
      if (avgBlockTime > 0) {
        instantTPS = this.calculateTPS(totalUserTx, avgBlockTime)
        ourTPS = this.calculateTPS(ourTx, avgBlockTime)
      } else {
        console.log(`⚠️  [BLOCK] No block time measurements, TPS = 0`)
      }
      
      this.csvData.push({
        block: blockNumber,
        timestamp: new Date().toISOString(),
        total_transactions: totalUserTx,
        our_transactions: ourTx,
        total_tps: instantTPS.toFixed(2),
        our_tps: ourTPS.toFixed(2)
      })
      
      console.log(`💾 [BLOCK] Data added to CSV (total records: ${this.csvData.length})`)
      
      // Show statistics every 10 blocks
      if (this.totalBlocks % 10 === 0) {
        console.log(`\n📊 [BLOCK] Every 10 blocks - showing statistics:`)
        this.showStats()
      }
      
    } catch (error) {
      const blockProcessTime = Date.now() - startTime
      console.error(`❌ [BLOCK] ERROR processing block!`)
      console.error(`   🆔 Hash: ${blockHash.toString().slice(0, 16)}...`)
      console.error(`   📋 Error: ${error.message}`)
      console.error(`   ⏱️  Time until error: ${blockProcessTime}ms`)
    }
  }

  async startMonitoring() {
    this.unsubscribe = await this.api.rpc.chain.subscribeNewHeads((header) => {
      this.processNewBlock(header.hash)
    })
  }

  showStats() {
    const runtime = (Date.now() - this.startTime) / 1000
    const avgBlockTime = this.calculateAverageBlockTime()
    
    // Calculate average TPS using MEASURED data
    let avgTotalTPS = 0
    let avgOurTPS = 0
    
    if (this.totalBlocks > 0 && avgBlockTime > 0) {
      avgTotalTPS = this.calculateTPS(this.totalTransactions / this.totalBlocks, avgBlockTime)
      avgOurTPS = this.calculateTPS(this.ourTransactions / this.totalBlocks, avgBlockTime)
    }
    
    // Additional statistics
    const blocksPerSecond = runtime > 0 ? this.totalBlocks / runtime : 0
    const transactionsPerSecond = runtime > 0 ? this.totalTransactions / runtime : 0
    const ourTransactionsPerSecond = runtime > 0 ? this.ourTransactions / runtime : 0
    
    console.log(`\n📊 [STATS] === TPS MONITORING STATISTICS ===`)
    console.log(`⏱️  [STATS] Runtime: ${runtime.toFixed(1)}s`)
    console.log(`🧱 [STATS] Processed blocks: ${this.totalBlocks}`)
    console.log(`📈 [STATS] Block rate: ${blocksPerSecond.toFixed(3)} blocks/sec`)
    console.log(`⏱️  [STATS] Average block time: ${(avgBlockTime / 1000).toFixed(2)}s`)
    console.log(``)
    console.log(`💸 [STATS] === BALANCE TRANSFERS ===`)
    console.log(`⚡ [STATS] Total found: ${this.totalTransactions}`)
    console.log(`🎯 [STATS] Our transactions: ${this.ourTransactions}`)
    console.log(`📊 [STATS] Our percentage: ${this.totalTransactions > 0 ? ((this.ourTransactions / this.totalTransactions) * 100).toFixed(1) : 0}%`)
    console.log(``)
    console.log(`📈 [STATS] === TPS (correct calculation) ===`)
    console.log(`📊 [STATS] Average TPS (all): ${avgTotalTPS.toFixed(2)}`)
    console.log(`🎯 [STATS] Average TPS (ours): ${avgOurTPS.toFixed(2)}`)
    console.log(`📈 [STATS] Actual flow (all): ${transactionsPerSecond.toFixed(2)} tx/sec`)
    console.log(`🎯 [STATS] Actual flow (ours): ${ourTransactionsPerSecond.toFixed(2)} tx/sec`)
    console.log(``)
    console.log(`💾 [STATS] CSV records: ${this.csvData.length}`)
    console.log(`===============================================`)
  }

  exportToCSV(filename = 'tps_stats.csv') {
    if (this.csvData.length === 0) {
      console.log('⚠️  No data to export')
      return
    }
    
    const headers = 'block,timestamp,total_transactions,our_transactions,total_tps,our_tps\n'
    const rows = this.csvData.map(row => 
      `${row.block},${row.timestamp},${row.total_transactions},${row.our_transactions},${row.total_tps},${row.our_tps}`
    ).join('\n')
    
    const csvContent = headers + rows
    
    try {
      fs.writeFileSync(filename, csvContent)
      console.log(`📁 Data exported to ${filename}`)
    } catch (error) {
      console.error('❌ Export error:', error.message)
    }
  }

  cleanup() {
    if (this.unsubscribe) {
      this.unsubscribe()
    }
    
    console.log('\n🛑 Received stop signal...')
    console.log('\n🏁 === FINAL STATISTICS ===')
    this.showStats()
  }
}

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
      if (monitor.csvData.length > 0) {
        const filename = options.output || `tps_stats_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.csv`
        monitor.exportToCSV(filename)
      }
      
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