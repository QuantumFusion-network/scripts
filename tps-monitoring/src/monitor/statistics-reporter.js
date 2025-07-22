import { Utils } from '../shared/utils.js'
import { monitorLogger } from '../shared/logger.js'

export class StatisticsReporter {
  constructor() {
    this.logger = monitorLogger.child('STATS-REPORTER')
  }

  formatBlockStats(blockNumber, totalTx, ourTx, avgBlockTime, instantTPS, ourTPS) {
    const tpsInfo = avgBlockTime > 0 
      ? `TPS: ${instantTPS.toFixed(1)} (${ourTPS.toFixed(1)} ours)`
      : `TPS: waiting for measurements...`
    
    return `🧱 Block #${blockNumber} | Total TX: ${totalTx} | Our TX: ${ourTx} | ${tpsInfo}`
  }

  logBlockProcessing(blockHash, blockNumber, extrinsicsCount) {
    this.logger.info('🧱 Starting new block processing', {
      blockHash: Utils.formatBlockHash(blockHash),
      blockNumber,
      extrinsicsCount
    })
  }

  logBlockStats(totalBlocks, totalTransactions, ourTransactions) {
    this.logger.info('📊 Updated block statistics', {
      totalBlocks,
      totalTransactions,
      ourTransactions
    })
  }

  logBlockCompletion(blockNumber, totalTx, ourTx, metrics, processTime, csvRecordsCount) {
    this.logger.info('⚡ Block processing completed', {
      blockNumber,
      totalTx,
      ourTx,
      avgBlockTime: metrics.avgBlockTime,
      instantTPS: metrics.instantTPS,
      ourTPS: metrics.ourTPS,
      processTime,
      csvRecordsCount
    })
  }

  showOverallStats(stats, totalBlocks, totalTransactions, ourTransactions, csvRecordsCount) {
    const ourPercentage = Utils.calculatePercentage(ourTransactions, totalTransactions)
    
    this.logger.info('📊 === TPS MONITORING STATISTICS ===', {
      runtime: stats.runtime,
      totalBlocks,
      blocksPerSecond: stats.blocksPerSecond,
      avgBlockTime: stats.avgBlockTime,
      totalTransactions,
      ourTransactions,
      ourPercentage,
      avgTotalTPS: stats.avgTotalTPS,
      avgOurTPS: stats.avgOurTPS,
      transactionsPerSecond: stats.transactionsPerSecond,
      ourTransactionsPerSecond: stats.ourTransactionsPerSecond,
      csvRecordsCount
    })
  }

  logInitialization(nodeUrl, targetAddresses) {
    this.logger.info('🔧 Starting TPS Monitor initialization', {
      nodeUrl,
      targetAddressesCount: targetAddresses.length,
      trackingMode: targetAddresses.length > 0 ? 'specific_addresses' : 'all_transactions'
    })
    
    if (targetAddresses.length > 0) {
      Utils.logAddressList(targetAddresses, 'INIT', this.logger)
    }
    
    this.logger.info('✅ TPS Monitor initialization completed', {
      monitoringTarget: 'balance_transfer_transactions',
      calculationMethod: 'transaction_count / block_time'
    })
  }

  // Новый метод для логирования анализа блока
  logBlockAnalysis(extrinsicsCount, totalBalanceTransfers, ourBalanceTransfers) {
    const successRate = Utils.calculatePercentage(ourBalanceTransfers, totalBalanceTransfers)
    
    this.logger.info('🔍 Block analysis completed', {
      extrinsicsCount,
      totalBalanceTransfers,
      ourBalanceTransfers,
      successRate
    })
  }

  // Новый метод для логирования найденного адреса
  logAddressMatch(address, isOur, transactionNumber = null) {
    const formattedAddress = Utils.formatAddress(address)
    
    this.logger.debug('Address match result', {
      address: formattedAddress,
      isOur,
      transactionNumber
    })
  }

  logShutdown() {
    this.logger.info('🛑 Received stop signal - preparing final statistics')
  }
} 