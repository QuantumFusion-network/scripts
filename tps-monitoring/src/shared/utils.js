// Универсальные утилиты для форматирования и вычислений

export class Utils {
  // Форматирование адреса (короткий/полный формат)
  static formatAddress(address, shortFormat = true) {
    const addrStr = address.toString()
    return shortFormat
      ? `${addrStr.slice(0, 12)}...${addrStr.slice(-8)}`
      : addrStr
  }

  // Вычисление процента с округлением до 1 знака
  static calculatePercentage(part, total) {
    return total > 0 ? ((part / total) * 100).toFixed(1) : '0'
  }

  // Форматирование времени из миллисекунд в секунды
  static formatTime(milliseconds) {
    return (milliseconds / 1000).toFixed(2)
  }

  // Округление числа до указанного количества знаков
  static formatNumber(number, decimals = 2) {
    return parseFloat(Number(number).toFixed(decimals))
  }

  // Логирование списка адресов в консоль
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

  // Форматирование хеша блока (короткий формат)
  static formatBlockHash(hash) {
    return hash.toString().slice(0, 16) + '...'
  }

  // Проверка что число больше 0 перед делением
  static safeDivision(numerator, denominator) {
    return denominator > 0 ? numerator / denominator : 0
  }
} 