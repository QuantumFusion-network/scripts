import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { Utils } from '../shared/utils.js'

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
    this.statsLogPath = null // Will be set in initialize()
    this.tpsCalcLogPath = null // Will be set in initialize()
    
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
   * Initialize log file paths (must be called before start)
   */
  async initialize() {
    console.log('🔍 LogTPSReader: Starting initialization...')
    
    // Find latest log files dynamically
    this.statsLogPath = await Utils.getLatestLogFile('monitor-stats-reporter')
    this.tpsCalcLogPath = await Utils.getLatestLogFile('monitor-tps-calc')
    
    console.log('🔍 LogTPSReader: Found files:', {
      statsLogPath: this.statsLogPath,
      tpsCalcLogPath: this.tpsCalcLogPath
    })
    
    if (!this.statsLogPath) {
      console.warn('⚠️ No monitor-stats-reporter log files found')
    } else {
      console.log(`📊 Using stats log: ${path.basename(this.statsLogPath)}`)
    }
    
    if (!this.tpsCalcLogPath) {
      console.warn('⚠️ No monitor-tps-calc log files found')
    } else {
      console.log(`📊 Using TPS calc log: ${path.basename(this.tpsCalcLogPath)}`)
    }
  }

  /**
   * Запуск чтения логов
   */
  async start() {
    console.log('📊 Starting LogTPSReader...')
    
    // Initialize log file paths first
    await this.initialize()
    
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
    if (!this.statsLogPath) {
      console.warn('⚠️ No stats log file available, skipping position initialization')
      this.lastFilePosition = 0
      return
    }
    
    try {
      const stats = await fs.stat(this.statsLogPath)
      console.log('🔍 LogTPSReader: File size:', stats.size, 'bytes')
      
      // При первом запуске читаем весь файл, чтобы получить актуальные данные
      // Вместо чтения только последних 10KB
      this.lastFilePosition = 0
      console.log('🔍 LogTPSReader: Starting from beginning of file (position 0)')
      
    } catch (error) {
      console.warn('⚠️ Stats log file not found, starting from beginning')
      this.lastFilePosition = 0
    }
  }

  /**
   * Чтение последних TPS данных из логов
   */
  async readLatestTPS() {
    if (!this.isRunning) return
    
    if (!this.statsLogPath) {
      // No log file available, skip reading
      return
    }

    try {
      console.log('📊 LogTPSReader: Reading from stats log:', this.statsLogPath)
      // Читаем новые данные из monitor-stats-reporter.log
      const newStatsData = await this.readNewLogEntries(this.statsLogPath)
      
      if (newStatsData.length > 0) {
        console.log('📊 LogTPSReader: Found', newStatsData.length, 'new entries in stats log.')
        // Обрабатываем каждую новую запись
        for (const entry of newStatsData) {
          this.processStatsEntry(entry)
        }
        
        // Уведомляем компоненты об обновлении
        this.onDataUpdate(this.tpsData)
      } else {
        console.log('📊 LogTPSReader: No new entries found in stats log.')
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
      console.log('🔍 LogTPSReader: Reading from logPath:', logPath)
      const stats = await fs.stat(logPath)
      console.log('🔍 LogTPSReader: File stats:', { size: stats.size, lastPosition: this.lastFilePosition })
      
      // Если файл не изменился, возвращаем пустой массив
      if (stats.size <= this.lastFilePosition) {
        console.log('🔍 LogTPSReader: File unchanged, no new data')
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
      
      console.log('🔍 LogTPSReader: Parsed', lines.length, 'lines from file')
      
      const entries = []
      for (const line of lines) {
        try {
          const entry = JSON.parse(line)
          entries.push(entry)
        } catch (parseError) {
          // Игнорируем неполные строки (файл может быть записан частично)
          console.log('🔍 LogTPSReader: Parse error on line:', line.substring(0, 50) + '...')
        }
      }
      
      console.log('🔍 LogTPSReader: Successfully parsed', entries.length, 'entries')
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
    console.log('🔍 LogTPSReader: Processing entry:', {
      message: entry.message,
      instantTPS: entry.instantTPS,
      ourTPS: entry.ourTPS,
      avgOurTPS: entry.avgOurTPS
    })
    
    // Ищем записи с TPS данными
    if (entry.message && entry.message.includes('Block processing completed')) {
      // Запись типа: "⚡ Block processing completed"
      console.log('🔍 LogTPSReader: Found block processing entry')
      this.updateTPSFromBlockProcessing(entry)
    } else if (entry.message && entry.message.includes('TPS MONITORING STATISTICS')) {
      // Запись типа: "📊 === TPS MONITORING STATISTICS ==="
      console.log('🔍 LogTPSReader: Found TPS statistics entry')
      this.updateTPSFromStatistics(entry)
    } else {
      console.log('🔍 LogTPSReader: Entry not processed (no TPS data)')
    }
  }

  /**
   * Обновление TPS из записи обработки блока
   */
  updateTPSFromBlockProcessing(entry) {
    console.log('🔍 LogTPSReader: Block processing data:', {
      instantTPS: entry.instantTPS,
      ourTPS: entry.ourTPS,
      blockNumber: entry.blockNumber,
      avgBlockTime: entry.avgBlockTime
    })
    
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
    
    console.log('🔍 LogTPSReader: Updated TPS data:', {
      currentTPS: this.tpsData.currentTPS,
      peakTPS: this.tpsData.peakTPS,
      averageTPS: this.tpsData.averageTPS
    })
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