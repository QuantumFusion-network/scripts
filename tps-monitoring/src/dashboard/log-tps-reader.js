import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * LogTPSReader - читает TPS данные из существующих JSON логов
 * Реализация Шага 1 из roadmap: src/dashboard/log-tps-reader.js
 * 
 * Архитектура: логи → LogTPSReader → TPSMetrics → blessed.render()
 */
export class LogTPSReader {
  constructor(options = {}) {
    this.updateInterval = options.updateInterval || 1000 // 1 секунда
    this.statsLogPath = path.join(__dirname, '../logs/monitor-stats-reporter.log')
    this.tpsCalcLogPath = path.join(__dirname, '../logs/monitor-tps-calc.log')
    
    this.lastFilePosition = 0
    this.isRunning = false
    this.updateTimer = null
    
    // TPS данные для передачи в компоненты
    this.tpsData = {
      currentTPS: 0,
      peakTPS: 0,
      averageTPS: 0,
      instantTPS: 0,
      ourTPS: 0,
      totalTPS: 0,
      blockNumber: 0,
      avgBlockTime: 0,
      lastUpdate: null
    }
    
    // Callbacks для обновления компонентов
    this.onDataUpdate = options.onDataUpdate || (() => {})
  }

  /**
   * Запуск чтения логов
   */
  async start() {
    console.log('📊 Starting LogTPSReader...')
    this.isRunning = true
    
    // Найти последнюю позицию в файле при старте
    await this.initializeFilePosition()
    
    // Запустить периодическое чтение
    this.updateTimer = setInterval(() => {
      this.readLatestTPS()
    }, this.updateInterval)
    
    // Первое чтение сразу
    await this.readLatestTPS()
  }

  /**
   * Остановка чтения логов
   */
  stop() {
    console.log('📊 Stopping LogTPSReader...')
    this.isRunning = false
    
    if (this.updateTimer) {
      clearInterval(this.updateTimer)
      this.updateTimer = null
    }
  }

  /**
   * Инициализация позиции в файле (начинаем с конца)
   */
  async initializeFilePosition() {
    try {
      const stats = await fs.stat(this.statsLogPath)
      this.lastFilePosition = Math.max(0, stats.size - 10000) // Последние 10KB
    } catch (error) {
      console.warn('⚠️  Stats log file not found, starting from beginning')
      this.lastFilePosition = 0
    }
  }

  /**
   * Чтение последних TPS данных из логов
   */
  async readLatestTPS() {
    if (!this.isRunning) return

    try {
      // Читаем новые данные из monitor-stats-reporter.log
      const newStatsData = await this.readNewLogEntries(this.statsLogPath)
      
      if (newStatsData.length > 0) {
        // Обрабатываем каждую новую запись
        for (const entry of newStatsData) {
          this.processStatsEntry(entry)
        }
        
        // Уведомляем компоненты об обновлении
        this.onDataUpdate(this.tpsData)
      }
    } catch (error) {
      console.error('❌ Error reading TPS data:', error.message)
    }
  }

  /**
   * Чтение новых записей из лог файла
   */
  async readNewLogEntries(logPath) {
    try {
      const stats = await fs.stat(logPath)
      
      // Если файл не изменился, возвращаем пустой массив
      if (stats.size <= this.lastFilePosition) {
        return []
      }
      
      // Читаем только новую часть файла
      const fileHandle = await fs.open(logPath, 'r')
      const buffer = Buffer.alloc(stats.size - this.lastFilePosition)
      
      await fileHandle.read(buffer, 0, buffer.length, this.lastFilePosition)
      await fileHandle.close()
      
      // Обновляем позицию
      this.lastFilePosition = stats.size
      
      // Парсим JSON строки
      const newContent = buffer.toString('utf8')
      const lines = newContent.trim().split('\n').filter(line => line.trim())
      
      const entries = []
      for (const line of lines) {
        try {
          const entry = JSON.parse(line)
          entries.push(entry)
        } catch (parseError) {
          // Игнорируем неполные строки (файл может быть записан частично)
        }
      }
      
      return entries
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.error('❌ Error reading log file:', error.message)
      }
      return []
    }
  }

  /**
   * Обработка записи из monitor-stats-reporter.log
   */
  processStatsEntry(entry) {
    // Ищем записи с TPS данными
    if (entry.message && entry.message.includes('Block processing completed')) {
      // Запись типа: "⚡ Block processing completed"
      this.updateTPSFromBlockProcessing(entry)
    } else if (entry.message && entry.message.includes('TPS MONITORING STATISTICS')) {
      // Запись типа: "📊 === TPS MONITORING STATISTICS ==="
      this.updateTPSFromStatistics(entry)
    }
  }

  /**
   * Обновление TPS из записи обработки блока
   */
  updateTPSFromBlockProcessing(entry) {
    if (entry.instantTPS !== undefined) {
      this.tpsData.currentTPS = entry.instantTPS || 0
      this.tpsData.instantTPS = entry.instantTPS || 0
    }
    
    if (entry.ourTPS !== undefined) {
      this.tpsData.ourTPS = entry.ourTPS || 0
    }
    
    if (entry.blockNumber !== undefined) {
      this.tpsData.blockNumber = entry.blockNumber
    }
    
    if (entry.avgBlockTime !== undefined) {
      this.tpsData.avgBlockTime = entry.avgBlockTime
    }
    
    // Обновляем пиковый TPS
    if (this.tpsData.currentTPS > this.tpsData.peakTPS) {
      this.tpsData.peakTPS = this.tpsData.currentTPS
    }
    
    this.tpsData.lastUpdate = new Date()
  }

  /**
   * Обновление TPS из статистики мониторинга
   */
  updateTPSFromStatistics(entry) {
    if (entry.avgOurTPS !== undefined) {
      this.tpsData.averageTPS = entry.avgOurTPS || 0
    }
    
    if (entry.avgTotalTPS !== undefined) {
      this.tpsData.totalTPS = entry.avgTotalTPS || 0
    }
    
    if (entry.transactionsPerSecond !== undefined) {
      this.tpsData.currentTPS = entry.transactionsPerSecond || 0
    }
    
    // Обновляем пиковый TPS
    if (this.tpsData.currentTPS > this.tpsData.peakTPS) {
      this.tpsData.peakTPS = this.tpsData.currentTPS
    }
    
    this.tpsData.lastUpdate = new Date()
  }

  /**
   * Получить текущие TPS данные
   */
  getTPSData() {
    return { ...this.tpsData }
  }

  /**
   * Получить статистику для отладки
   */
  getDebugInfo() {
    return {
      isRunning: this.isRunning,
      lastFilePosition: this.lastFilePosition,
      lastUpdate: this.tpsData.lastUpdate,
      fileExists: this.checkFileExists()
    }
  }

  /**
   * Проверка существования файла логов
   */
  async checkFileExists() {
    try {
      await fs.access(this.statsLogPath)
      return true
    } catch {
      return false
    }
  }
} 