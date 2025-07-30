export class BlockMonitor {
  constructor() {
    this.blockTimes = []
    this.txCounts = []
    this.startTime = Date.now()
  }

  startMonitoring(api) {
    console.log('📊 Monitoring TPS...')
    
    api.derive.chain.subscribeNewHeads(async (header) => {
      const blockNumber = header.number.toNumber()
      const now = Date.now()
      
      // Get block details
      const blockHash = header.hash
      const block = await api.rpc.chain.getBlock(blockHash)
      const txCount = block.block.extrinsics.length
      
      // Store block data
      this.blockTimes.push(now)
      this.txCounts.push(txCount)
      
      // Keep only last 10 blocks for average
      if (this.blockTimes.length > 10) {
        this.blockTimes.shift()
        this.txCounts.shift()
      }
      
      // Calculate and display TPS
      const avgTPS = this.calculateTPS()
      const runtime = Math.floor((now - this.startTime) / 1000)
      
      console.log(`Block #${blockNumber}: ${txCount} txs, ${avgTPS.toFixed(1)} TPS (${runtime}s runtime)`)
    })
  }

  calculateTPS() {
    if (this.blockTimes.length <= 1) return 0
    
    const timeSpan = (this.blockTimes[this.blockTimes.length - 1] - this.blockTimes[0]) / 1000
    const totalTx = this.txCounts.reduce((sum, count) => sum + count, 0)
    
    return totalTx / timeSpan
  }

  getStats() {
    return {
      blockCount: this.blockTimes.length,
      totalTx: this.txCounts.reduce((sum, count) => sum + count, 0),
      avgTPS: this.calculateTPS(),
      runtime: Math.floor((Date.now() - this.startTime) / 1000)
    }
  }
} 