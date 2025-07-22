import { Utils } from '../shared/utils.js'
import { monitorLogger } from '../shared/logger.js'

export class TPSCalculator {
  constructor() {
    this.blockTimes = []
    this.logger = monitorLogger.child('TPS-CALC')
  }

  addBlockTime(timestamp) {
    this.blockTimes.push(timestamp)
    
    // Keep only last 100 blocks for average calculation
    if (this.blockTimes.length > 100) {
      this.blockTimes.shift()
      this.logger.debug('🗑️ Removed old timestamp (keeping last 100)', { 
        bufferSize: this.blockTimes.length 
      })
    }
  }

  calculateAverageBlockTime() {
    if (this.blockTimes.length < 2) return 0
    
    const intervals = []
    for (let i = 1; i < this.blockTimes.length; i++) {
      intervals.push(this.blockTimes[i] - this.blockTimes[i - 1])
    }
    
    return intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length
  }

  calculateTPS(transactionCount, measuredBlockTime) {
    // Universal TPS calculation:
    // Use measured block times for any Substrate network
    // TPS = transactions_in_block / block_time_in_seconds
    
    if (!measuredBlockTime || measuredBlockTime <= 0) {
      this.logger.warn('⚠️ No valid block time measurements - skipping TPS calculation', {
        measuredBlockTime,
        transactionCount
      })
      return 0
    }
    
    const blockTimeInSeconds = measuredBlockTime / 1000  // convert to seconds
    const tps = Utils.safeDivision(transactionCount, blockTimeInSeconds)
    
    this.logger.info('📊 TPS calculation completed', {
      transactionCount,
      blockTimeSeconds: blockTimeInSeconds,
      blockTimeMs: measuredBlockTime,
      calculatedTPS: tps
    })
    
    return tps
  }

  calculateMetrics(totalTx, ourTx, avgBlockTime) {
    let instantTPS = 0
    let ourTPS = 0
    
    if (avgBlockTime > 0) {
      instantTPS = this.calculateTPS(totalTx, avgBlockTime)
      ourTPS = this.calculateTPS(ourTx, avgBlockTime)
    }
    
    return {
      instantTPS: Utils.formatNumber(instantTPS),
      ourTPS: Utils.formatNumber(ourTPS),
      avgBlockTime
    }
  }

  calculateOverallStats(totalBlocks, totalTransactions, ourTransactions, startTime) {
    const runtime = (Date.now() - startTime) / 1000
    const avgBlockTime = this.calculateAverageBlockTime()
    
    // Calculate average TPS using MEASURED data
    let avgTotalTPS = 0
    let avgOurTPS = 0
    
    if (totalBlocks > 0 && avgBlockTime > 0) {
      avgTotalTPS = this.calculateTPS(totalTransactions / totalBlocks, avgBlockTime)
      avgOurTPS = this.calculateTPS(ourTransactions / totalBlocks, avgBlockTime)
    }
    
    // Additional statistics
    const blocksPerSecond = Utils.safeDivision(totalBlocks, runtime)
    const transactionsPerSecond = Utils.safeDivision(totalTransactions, runtime)
    const ourTransactionsPerSecond = Utils.safeDivision(ourTransactions, runtime)
    
    return {
      runtime,
      avgBlockTime,
      avgTotalTPS: Utils.formatNumber(avgTotalTPS),
      avgOurTPS: Utils.formatNumber(avgOurTPS),
      blocksPerSecond: Utils.formatNumber(blocksPerSecond, 3),
      transactionsPerSecond: Utils.formatNumber(transactionsPerSecond),
      ourTransactionsPerSecond: Utils.formatNumber(ourTransactionsPerSecond)
    }
  }
} 