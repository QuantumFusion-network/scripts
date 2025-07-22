import { Utils } from '../shared/utils.js'

export class StatisticsReporter {
  formatBlockStats(blockNumber, totalTx, ourTx, avgBlockTime, instantTPS, ourTPS) {
    const tpsInfo = avgBlockTime > 0 
      ? `TPS: ${instantTPS.toFixed(1)} (${ourTPS.toFixed(1)} ours)`
      : `TPS: waiting for measurements...`
    
    return `🧱 Block #${blockNumber} | Total TX: ${totalTx} | Our TX: ${ourTx} | ${tpsInfo}`
  }

  logBlockProcessing(blockHash, blockNumber, extrinsicsCount) {
    console.log(`\n🧱 [BLOCK] Starting new block processing...`)
    console.log(`🆔 [BLOCK] Hash: ${Utils.formatBlockHash(blockHash)}`)
    console.log(`📋 [BLOCK] Block #${blockNumber} loaded`)
    console.log(`📦 [BLOCK] Extrinsics in block: ${extrinsicsCount}`)
  }

  logBlockStats(totalBlocks, totalTransactions, ourTransactions) {
    console.log(`📊 [BLOCK] Updated statistics:`)
    console.log(`   🧱 Total blocks: ${totalBlocks}`)
    console.log(`   💸 Total balances.transfer: ${totalTransactions}`)
    console.log(`   🎯 Our transactions: ${ourTransactions}`)
  }

  logBlockCompletion(blockNumber, totalTx, ourTx, metrics, processTime, csvRecordsCount) {
    console.log(`⏱️  [BLOCK] Average block time: ${Utils.formatTime(metrics.avgBlockTime)}s`)
    console.log(this.formatBlockStats(blockNumber, totalTx, ourTx, metrics.avgBlockTime, metrics.instantTPS, metrics.ourTPS))
    console.log(`⚡ [BLOCK] Block processed in ${processTime}ms`)
    console.log(`💾 [BLOCK] Data added to CSV (total records: ${csvRecordsCount})`)
  }

  showOverallStats(stats, totalBlocks, totalTransactions, ourTransactions, csvRecordsCount) {
    const ourPercentage = Utils.calculatePercentage(ourTransactions, totalTransactions)
    
    console.log(`\n📊 [STATS] === TPS MONITORING STATISTICS ===`)
    console.log(`⏱️  [STATS] Runtime: ${stats.runtime.toFixed(1)}s`)
    console.log(`🧱 [STATS] Processed blocks: ${totalBlocks}`)
    console.log(`📈 [STATS] Block rate: ${stats.blocksPerSecond} blocks/sec`)
    console.log(`⏱️  [STATS] Average block time: ${Utils.formatTime(stats.avgBlockTime)}s`)
    console.log(``)
    console.log(`💸 [STATS] === BALANCE TRANSFERS ===`)
    console.log(`⚡ [STATS] Total found: ${totalTransactions}`)
    console.log(`🎯 [STATS] Our transactions: ${ourTransactions}`)
    console.log(`📊 [STATS] Our percentage: ${ourPercentage}%`)
    console.log(``)
    console.log(`📈 [STATS] === TPS (correct calculation) ===`)
    console.log(`📊 [STATS] Average TPS (all): ${stats.avgTotalTPS}`)
    console.log(`🎯 [STATS] Average TPS (ours): ${stats.avgOurTPS}`)
    console.log(`📈 [STATS] Actual flow (all): ${stats.transactionsPerSecond} tx/sec`)
    console.log(`🎯 [STATS] Actual flow (ours): ${stats.ourTransactionsPerSecond} tx/sec`)
    console.log(``)
    console.log(`💾 [STATS] CSV records: ${csvRecordsCount}`)
    console.log(`===============================================`)
  }

  logInitialization(nodeUrl, targetAddresses) {
    console.log('🔧 [INIT] Starting TPS Monitor initialization...')
    console.log(`🔧 [INIT] Connecting to node: ${nodeUrl}`)
    console.log('✅ [INIT] Node connection established')
    
    console.log(`📊 [INIT] Monitoring configuration:`)
    
    if (targetAddresses.length > 0) {
      console.log(`🎯 [INIT] Tracking ONLY addresses: ${targetAddresses.length} total`)
      Utils.logAddressList(targetAddresses, 'INIT')
    } else {
      console.log(`🌍 [INIT] Tracking ALL balance transfer transactions`)
    }
    
    console.log('🔧 [INIT] Initializing block monitoring...')
    console.log('🎯 [INIT] Will count only balance transfer transactions')
    console.log('📈 [INIT] TPS = transaction count / block time')
    console.log('💡 [INIT] Press Ctrl+C to stop')
    console.log('✅ [INIT] Initialization completed! Starting monitoring...')
  }

  // Новый метод для логирования анализа блока
  logBlockAnalysis(extrinsicsCount, totalBalanceTransfers, ourBalanceTransfers) {
    const successRate = Utils.calculatePercentage(ourBalanceTransfers, totalBalanceTransfers)
    
    console.log(`🔍 [ANALYZE] === BLOCK ANALYSIS START ===`)
    console.log(`🔍 [ANALYZE] Total extrinsics in block: ${extrinsicsCount}`)
    console.log(`🔍 [ANALYZE] Looking for balance transfers from our addresses...`)
    console.log(`📊 [ANALYZE] === BLOCK ANALYSIS RESULT ===`)
    console.log(`📊 [ANALYZE] Total balance transfers: ${totalBalanceTransfers}`)
    console.log(`📊 [ANALYZE] Our balance transfers: ${ourBalanceTransfers}`)
    console.log(`📊 [ANALYZE] Success rate: ${successRate}%`)
  }

  // Новый метод для логирования найденного адреса
  logAddressMatch(address, isOur, transactionNumber = null) {
    const formattedAddress = Utils.formatAddress(address)
    
    if (isOur) {
      const txInfo = transactionNumber ? ` #${transactionNumber}` : ''
      console.log(`🎯 [ADDRESS] ✅ MATCH: ${formattedAddress} is OUR address${txInfo}`)
    } else {
      console.log(`👤 [ADDRESS] ❌ External: ${formattedAddress} (not in our list)`)
    }
  }

  logShutdown() {
    console.log('\n🛑 Received stop signal...')
    console.log('\n🏁 === FINAL STATISTICS ===')
  }
} 