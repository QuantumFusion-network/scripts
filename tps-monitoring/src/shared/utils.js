// Universal utilities for formatting and calculations

export class Utils {
  // Address formatting (short/full format)
  static formatAddress(address, shortFormat = true) {
    const addrStr = address.toString()
    return shortFormat
      ? `${addrStr.slice(0, 12)}...${addrStr.slice(-8)}`
      : addrStr
  }

  // Percentage calculation rounded to 1 decimal place
  static calculatePercentage(part, total) {
    return total > 0 ? ((part / total) * 100).toFixed(1) : '0'
  }

  // Time formatting from milliseconds to seconds
  static formatTime(milliseconds) {
    return (milliseconds / 1000).toFixed(2)
  }

  // Rounding a number to the specified number of decimals
  static formatNumber(number, decimals = 2) {
    return parseFloat(Number(number).toFixed(decimals))
  }

  // Logging a list of addresses to the console
  static logAddressList(addresses, prefix = 'ADDRESSES', logger = null) {
    const message = `🎯 [${prefix}] ${addresses.length} total:`
    const addressList = addresses.map((addr, i) => `   ${i + 1}. ${this.formatAddress(addr)}`).join('\n')
    
    if (logger) {
      logger.info(message)
      logger.info(addressList)
    } else {
      // Fallback to console for backwards compatibility
      console.log(message)
      addresses.forEach((addr, i) => {
        console.log(`   ${i + 1}. ${this.formatAddress(addr)}`)
      })
    }
  }

  // Block hash formatting (short format)
  static formatBlockHash(hash) {
    return hash.toString().slice(0, 16) + '...'
  }

  // Check that the number is greater than 0 before division
  static safeDivision(numerator, denominator) {
    return denominator > 0 ? numerator / denominator : 0
  }

  // Find the latest log file in a series (for Winston rotated logs)
  static async getLatestLogFile(baseName, logsDir = null) {
    const fs = await import('fs/promises')
    const path = await import('path')
    
    // Default logs directory if not provided
    if (!logsDir) {
      const { fileURLToPath } = await import('url')
      const __filename = fileURLToPath(import.meta.url)
      const __dirname = path.dirname(__filename)
      logsDir = path.join(__dirname, '..', 'logs')
    }
    
    // Check files in order: baseName.log, baseName1.log, baseName2.log, etc.
    let latestFile = null
    let counter = 0
    
    while (true) {
      const fileName = counter === 0 ? `${baseName}.log` : `${baseName}${counter}.log`
      const filePath = path.join(logsDir, fileName)
      
      try {
        await fs.access(filePath)
        latestFile = filePath
        counter++
      } catch {
        // File doesn't exist, stop searching
        break
      }
    }
    
    return latestFile
  }
} 