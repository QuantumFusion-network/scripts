import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Универсальная система логирования для замены console.log
export class Logger {
  constructor(moduleName = 'APP') {
    this.moduleName = moduleName;
    this.winston = this.createWinstonLogger();
  }

  // Создание Winston logger с файлами и консолью
  createWinstonLogger() {
    const logsDir = path.join(__dirname, '..', 'logs');
    
    return winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: { module: this.moduleName },
      transports: [
        // Ошибки в отдельный файл
        new winston.transports.File({
          filename: path.join(logsDir, 'errors.log'),
          level: 'error',
          maxsize: 5242880, // 5MB
          maxFiles: 5
        }),
        
        // Все логи в общий файл
        new winston.transports.File({
          filename: path.join(logsDir, 'combined.log'),
          maxsize: 5242880, // 5MB
          maxFiles: 5
        }),

        // Отдельный файл для каждого модуля
        new winston.transports.File({
          filename: path.join(logsDir, `${this.moduleName.toLowerCase()}.log`),
          maxsize: 5242880, // 5MB
          maxFiles: 3
        })
      ]
    });
  }

  // Добавляем консольный вывод с красивым форматированием
  addConsoleOutput() {
    this.winston.add(new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp({ format: 'HH:mm:ss' }),
        winston.format.printf(({ timestamp, level, message, module, ...meta }) => {
          const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
          return `${timestamp} [${module}] ${level}: ${message}${metaStr}`;
        })
      )
    }));
    return this;
  }

  // Основные методы логирования (замена console.log)
  info(message, meta = {}) {
    this.winston.info(message, meta);
  }

  error(message, meta = {}) {
    this.winston.error(message, meta);
  }

  warn(message, meta = {}) {
    this.winston.warn(message, meta);
  }

  debug(message, meta = {}) {
    this.winston.debug(message, meta);
  }

  trace(message, meta = {}) {
    this.winston.silly(message, meta);
  }

  // Совместимость с console.log - ГЛАВНАЯ ФИЧА для миграции
  log(message, ...args) {
    const fullMessage = args.length > 0 
      ? `${message} ${args.join(' ')}`
      : message;
    this.winston.info(fullMessage);
  }

  // Методы для специфических контекстов
  logBlock(blockNumber, message, meta = {}) {
    this.info(message, { blockNumber, ...meta });
  }

  logTransaction(txHash, message, meta = {}) {
    this.info(message, { txHash, ...meta });
  }

  logAPI(endpoint, message, meta = {}) {
    this.info(message, { endpoint, ...meta });
  }

  logStats(statsType, message, meta = {}) {
    this.info(message, { statsType, ...meta });
  }

  // Специальные методы для нашего контекста
  logInit(message, config = {}) {
    this.info(`🔧 [INIT] ${message}`, { config });
  }

  logConnection(url, status) {
    this.info(`🔗 [CONNECTION] ${status}: ${url}`);
  }

  logProcess(processName, status, meta = {}) {
    this.info(`⚙️ [PROCESS] ${processName}: ${status}`, meta);
  }

  // Метод для создания дочерних логгеров
  child(childName) {
    return new Logger(`${this.moduleName}-${childName}`);
  }

  // Получить winston instance для продвинутого использования
  getWinston() {
    return this.winston;
  }
}

// Фабричные методы для создания логгеров
export const createLogger = (moduleName, withConsole = true) => {
  const logger = new Logger(moduleName);
  if (withConsole) {
    logger.addConsoleOutput();
  }
  return logger;
};

// Готовые логгеры для основных модулей
export const monitorLogger = createLogger('MONITOR');
export const senderLogger = createLogger('SENDER');
export const dashboardLogger = createLogger('DASHBOARD');
export const apiLogger = createLogger('API', false); // Без console output для TUI

// Экспорт по умолчанию
export default Logger; 