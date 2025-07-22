import fs from 'fs'
import { monitorLogger } from '../shared/logger.js'

export class CSVExporter {
  constructor() {
    this.csvData = []
    this.logger = monitorLogger.child('CSV-EXPORT')
  }

  addRecord(blockNumber, totalTransactions, ourTransactions, instantTPS, ourTPS) {
    this.csvData.push({
      block: blockNumber,
      timestamp: new Date().toISOString(),
      total_transactions: totalTransactions,
      our_transactions: ourTransactions,
      total_tps: instantTPS.toFixed(2),
      our_tps: ourTPS.toFixed(2)
    })
  }

  getRecordsCount() {
    return this.csvData.length
  }

  generateDefaultFilename() {
    return `src/csv-report/tps_stats_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.csv`
  }

  exportToCSV(filename = 'tps_stats.csv') {
    if (this.csvData.length === 0) {
      this.logger.warn('⚠️ No data to export', { filename })
      return false
    }
    
    const headers = 'block,timestamp,total_transactions,our_transactions,total_tps,our_tps\n'
    const rows = this.csvData.map(row => 
      `${row.block},${row.timestamp},${row.total_transactions},${row.our_transactions},${row.total_tps},${row.our_tps}`
    ).join('\n')
    
    const csvContent = headers + rows
    
    try {
      fs.writeFileSync(filename, csvContent)
      this.logger.info('📁 Data exported successfully', {
        filename,
        recordCount: this.csvData.length,
        fileSize: csvContent.length
      })
      return true
    } catch (error) {
      this.logger.error('❌ Export error', {
        filename,
        error: error.message,
        recordCount: this.csvData.length
      })
      return false
    }
  }

  autoExport(filename) {
    if (this.csvData.length > 0) {
      const exportFilename = filename || this.generateDefaultFilename()
      return this.exportToCSV(exportFilename)
    }
    return false
  }

  clear() {
    this.csvData = []
  }
} 