import { ApiConnector } from './api-connector.js'
import { BlockAnalyzer } from './block-analyzer.js'
import { TPSCalculator } from './tps-calculator.js'
import { StatisticsReporter } from './statistics-reporter.js'
import { CSVExporter } from './csv-exporter.js'
import { Utils } from './utils.js'

export class TPSMonitor {
  constructor() {
    this.apiConnector = new ApiConnector()
    this.blockAnalyzer = new BlockAnalyzer()
    this.tpsCalculator = new TPSCalculator()
    this.statsReporter = new StatisticsReporter()
    this.csvExporter = new CSVExporter()
    
    // Связываем репортер с анализатором для логирования
    this.blockAnalyzer.setReporter(this.statsReporter)
    
    this.startTime = Date.now()
    this.totalBlocks = 0
    this.totalTransactions = 0
    this.ourTransactions = 0
    this.unsubscribe = null
  }

  async initialize(nodeUrl, targetAddresses = []) {
    // Connect to blockchain
    await this.apiConnector.connect(nodeUrl)
    
    // Configure block analyzer
    this.blockAnalyzer.setTargetAddresses(targetAddresses)
    
    // Log initialization
    this.statsReporter.logInitialization(nodeUrl, targetAddresses)
    
    return true
  }

  async processNewBlock(blockHash) {
    const startTime = Date.now()
    
    try {
      // Get block data
      const blockData = await this.apiConnector.getBlock(blockHash)
      const { block, number: blockNumber } = blockData
      
      // Log block processing start
      this.statsReporter.logBlockProcessing(blockHash, blockNumber, block.extrinsics.length)
      
      // Analyze transactions in the block
      const { totalUserTx, ourTx } = this.blockAnalyzer.analyzeExtrinsics(block.extrinsics)
      
      // Update timing for TPS calculations
      const currentTime = Date.now()
      this.tpsCalculator.addBlockTime(currentTime)
      
      // Update overall statistics
      this.totalBlocks++
      this.totalTransactions += totalUserTx
      this.ourTransactions += ourTx
      
      // Log current stats
      this.statsReporter.logBlockStats(this.totalBlocks, this.totalTransactions, this.ourTransactions)
      
      // Calculate metrics
      const avgBlockTime = this.tpsCalculator.calculateAverageBlockTime()
      const metrics = this.tpsCalculator.calculateMetrics(totalUserTx, ourTx, avgBlockTime)
      
      // Log TPS calculations
      if (avgBlockTime <= 0) {
        console.log(`⚠️  [BLOCK] No block time measurements, TPS = 0`)
      }
      
      // Add data to CSV
      this.csvExporter.addRecord(blockNumber, totalUserTx, ourTx, metrics.instantTPS, metrics.ourTPS)
      
      // Log block completion
      const blockProcessTime = Date.now() - startTime
      this.statsReporter.logBlockCompletion(
        blockNumber, 
        totalUserTx, 
        ourTx, 
        metrics, 
        blockProcessTime, 
        this.csvExporter.getRecordsCount()
      )
      
      // Show statistics every 10 blocks (reuse already calculated avgBlockTime for efficiency)
      if (this.totalBlocks % 10 === 0) {
        console.log(`\n📊 [BLOCK] Every 10 blocks - showing statistics:`)
        this.showStats(avgBlockTime)  // Pass pre-calculated value to avoid duplicate computation
      }
      
    } catch (error) {
      const blockProcessTime = Date.now() - startTime
      console.error(`❌ [BLOCK] ERROR processing block!`)
      console.error(`   🆔 Hash: ${Utils.formatBlockHash(blockHash)}`)
      console.error(`   📋 Error: ${error.message}`)
      console.error(`   ⏱️  Time until error: ${blockProcessTime}ms`)
    }
  }

  async startMonitoring() {
    this.unsubscribe = await this.apiConnector.subscribeNewHeads((header) => {
      this.processNewBlock(header.hash)
    })
  }

  showStats(preCalculatedAvgBlockTime = null) {
    const stats = this.tpsCalculator.calculateOverallStats(
      this.totalBlocks, 
      this.totalTransactions, 
      this.ourTransactions, 
      this.startTime
    )
    
    // Use pre-calculated value if provided to avoid duplicate computation
    if (preCalculatedAvgBlockTime !== null) {
      stats.avgBlockTime = preCalculatedAvgBlockTime
    }
    
    this.statsReporter.showOverallStats(
      stats,
      this.totalBlocks,
      this.totalTransactions,
      this.ourTransactions,
      this.csvExporter.getRecordsCount()
    )
  }

  cleanup() {
    if (this.unsubscribe) {
      this.unsubscribe()
    }
    
    this.apiConnector.disconnect()
    this.statsReporter.logShutdown()
    this.showStats()
  }

  exportToCSV(filename) {
    return this.csvExporter.exportToCSV(filename)
  }

  autoExport(filename) {
    return this.csvExporter.autoExport(filename)
  }
} 