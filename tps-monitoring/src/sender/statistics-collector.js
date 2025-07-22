// Collects and reports sending statistics
export class StatisticsCollector {
  constructor() {
    this.stats = {
      sent: 0,
      failed: 0,
      startTime: null
    }
  }

  // Start collecting statistics
  start() {
    this.stats.startTime = Date.now()
    this.stats.sent = 0
    this.stats.failed = 0
    console.log(`⏰ [STATS] Start time: ${new Date().toISOString()}`)
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
    
    console.log('\n📊 [STATS] === SENDING STATISTICS ===')
    console.log(`⏱️  [STATS] Runtime: ${stats.runtime.toFixed(1)}s`)
    console.log(`📤 [STATS] Sent successfully: ${stats.sent}`)
    console.log(`❌ [STATS] Errors: ${stats.failed}`)
    console.log(`📈 [STATS] Total attempts: ${stats.total}`)
    console.log(`✅ [STATS] Success rate: ${stats.successRate.toFixed(1)}%`)
    console.log(`📈 [STATS] Actual frequency: ${stats.actualRate.toFixed(2)} tx/sec`)
    
    if (targetRate) {
      console.log(`📊 [STATS] Target frequency: ${targetRate} tx/sec`)
      
      if (stats.runtime > 0) {
        const expectedTx = stats.runtime * targetRate
        const efficiency = this.calculateEfficiency(targetRate)
        console.log(`🎯 [STATS] Expected to send: ${expectedTx.toFixed(0)}`)
        console.log(`⚡ [STATS] Efficiency: ${efficiency.toFixed(1)}%`)
      }
    }
    
    if (currentNonce !== null) {
      console.log(`🔢 [STATS] Current nonce: ${currentNonce}`)
    }
    
    console.log('==========================================\n')
  }

  // Reset statistics
  reset() {
    this.stats = {
      sent: 0,
      failed: 0,
      startTime: null
    }
    console.log('🔄 [STATS] Statistics reset')
  }
} 