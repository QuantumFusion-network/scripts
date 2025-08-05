// === BLOCK MONITOR CLASS ===
// Monitors new blocks and calculates real TPS from blockchain data
export class BlockMonitor {
  constructor() {
    this.blockTimes = []     // Array of block timestamps
    this.txCounts = []       // Array of transaction counts per block
    this.startTime = Date.now()  // When monitoring started
  }

  // === START MONITORING BLOCKS ===
  // Subscribe to new blocks and calculate TPS
  startMonitoring(api) {
    console.log('📊 Monitoring TPS...')
    
    // === SUBSCRIBE TO NEW BLOCKS ===
    // This function runs every time a new block is created
    api.derive.chain.subscribeNewHeads(async (header) => {
      // === GET BLOCK INFORMATION ===
      const blockNumber = header.number.toNumber()
      const now = Date.now()
      
      // === FETCH BLOCK DETAILS ===
      // Get full block data including transactions
      const blockHash = header.hash
      const block = await api.rpc.chain.getBlock(blockHash)
      const txCount = block.block.extrinsics.length  // Count transactions in block
      
      // === STORE BLOCK DATA ===
      // Save timestamp and transaction count for this block
      this.blockTimes.push(now)
      this.txCounts.push(txCount)
      
      // === MAINTAIN SLIDING WINDOW ===
      // Keep only last 10 blocks for average calculation
      if (this.blockTimes.length > 10) {
        this.blockTimes.shift()  // Remove oldest time
        this.txCounts.shift()    // Remove oldest count
      }
      
      // === CALCULATE AND DISPLAY TPS ===
      const avgTPS = this.calculateTPS()
      const runtime = Math.floor((now - this.startTime) / 1000)
      
      // Log block information with current TPS
      console.log(`Block #${blockNumber}: ${txCount} txs, ${avgTPS.toFixed(1)} TPS (${runtime}s runtime)`)
    })
  }

  // === CALCULATE TPS FROM BLOCKS ===
  // Calculate transactions per second based on recent blocks
  calculateTPS() {
    // Need at least 2 blocks to calculate TPS
    if (this.blockTimes.length <= 1) return 0
    
    // === CALCULATE TIME SPAN ===
    // Time between first and last block in sliding window
    const timeSpan = (this.blockTimes[this.blockTimes.length - 1] - this.blockTimes[0]) / 1000
    
    // === COUNT TOTAL TRANSACTIONS ===
    // Sum all transactions in the sliding window
    const totalTx = this.txCounts.reduce((sum, count) => sum + count, 0)
    
    // === CALCULATE TPS ===
    // Total transactions divided by time span
    return totalTx / timeSpan
  }

  // === GET MONITORING STATISTICS ===
  // Return current statistics for display
  getStats() {
    return {
      blockCount: this.blockTimes.length,                           // Number of blocks monitored
      totalTx: this.txCounts.reduce((sum, count) => sum + count, 0), // Total transactions seen
      avgTPS: this.calculateTPS(),                                   // Current average TPS
      runtime: Math.floor((Date.now() - this.startTime) / 1000)     // Total runtime in seconds
    }
  }
} 