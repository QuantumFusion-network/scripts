import { senderLogger } from '../shared/logger.js'

// Collects and reports sending statistics
export class StatisticsCollector {
  constructor() {
    this.stats = {
      sent: 0,
      failed: 0,
      startTime: null
    }
    this.logger = senderLogger.child('STATS-COLLECTOR')
  }

  // Start collecting statistics
  start() {
    this.stats.startTime = Date.now()
    this.stats.sent = 0
    this.stats.failed = 0
    this.logger.info('Statistics collection started', {
      startTime: new Date().toISOString()
    })
  }

  // Record successful transaction
  recordSuccess() {
    this.stats.sent++
  }

  // Record failed transaction
  recordFailure() {
    this.stats.failed++
  }

  // Get current statistics
  getStats() {
    const runtime = this.getRuntime()
    const actualRate = runtime > 0 ? this.stats.sent / runtime : 0
    const total = this.stats.sent + this.stats.failed
    const successRate = total > 0 ? (this.stats.sent / total) * 100 : 0

    return {
      sent: this.stats.sent,
      failed: this.stats.failed,
      total,
      runtime,
      actualRate,
      successRate
    }
  }

  // Get runtime in seconds
  getRuntime() {
    return this.stats.startTime ? (Date.now() - this.stats.startTime) / 1000 : 0
  }

  // Calculate efficiency compared to target rate
  calculateEfficiency(targetRate) {
    const runtime = this.getRuntime()
    if (runtime <= 0) return 0
    
    const expectedTx = runtime * targetRate
    return expectedTx > 0 ? (this.stats.sent / expectedTx) * 100 : 0
  }

  // Show detailed statistics
  showStats(targetRate = null, currentNonce = null) {
    const stats = this.getStats()
    
    const logData = {
      runtime: stats.runtime,
      sent: stats.sent,
      failed: stats.failed,
      total: stats.total,
      successRate: stats.successRate,
      actualRate: stats.actualRate
    }
    
    if (targetRate) {
      logData.targetRate = targetRate
      if (stats.runtime > 0) {
        const expectedTx = stats.runtime * targetRate
        const efficiency = this.calculateEfficiency(targetRate)
        logData.expectedTx = expectedTx
        logData.efficiency = efficiency
      }
    }
    
    if (currentNonce !== null) {
      logData.currentNonce = currentNonce
    }
    
    this.logger.info('=== SENDING STATISTICS ===', logData)
  }

  // Reset statistics
  reset() {
    this.stats = {
      sent: 0,
      failed: 0,
      startTime: null
    }
    this.logger.info('Statistics reset')
  }
} 