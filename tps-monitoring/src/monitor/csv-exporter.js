import fs from 'fs'

export class CSVExporter {
  constructor() {
    this.csvData = []
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
    return `tps_stats_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.csv`
  }

  exportToCSV(filename = 'tps_stats.csv') {
    if (this.csvData.length === 0) {
      console.log('⚠️  No data to export')
      return false
    }
    
    const headers = 'block,timestamp,total_transactions,our_transactions,total_tps,our_tps\n'
    const rows = this.csvData.map(row => 
      `${row.block},${row.timestamp},${row.total_transactions},${row.our_transactions},${row.total_tps},${row.our_tps}`
    ).join('\n')
    
    const csvContent = headers + rows
    
    try {
      fs.writeFileSync(filename, csvContent)
      console.log(`📁 Data exported to ${filename}`)
      return true
    } catch (error) {
      console.error('❌ Export error:', error.message)
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