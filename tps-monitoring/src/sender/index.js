import { ApiConnector } from '../shared/api-connector.js'
import { KeyringManager } from './keyring-manager.js'
import { TransactionBuilder } from './transaction-builder.js'
import { NonceManager } from './nonce-manager.js'
import { RateController } from './rate-controller.js'
import { StatisticsCollector } from './statistics-collector.js'
import { CLIInterface } from './cli-interface.js'
import { senderLogger } from '../shared/logger.js'

// Main coordinator for transaction sending
export class TransactionSender {
  constructor() {
    this.apiConnector = new ApiConnector()
    this.keyringManager = new KeyringManager()
    this.transactionBuilder = null // Will be created after API connection
    this.nonceManager = null // Will be created after API connection
    this.rateController = new RateController()
    this.statisticsCollector = new StatisticsCollector()
    this.cliInterface = new CLIInterface(this)
    this.logger = senderLogger.child('TX-SENDER')
    
    this.amount = 1000000
    this.isInitialized = false
  }

  // Initialize all components
  async initialize(nodeUrl, senderSeed, recipientSeed, amount, rate) {
    this.logger.info('Starting TransactionSender initialization', { nodeUrl })
    
    // Connect to API
    await this.apiConnector.connect(nodeUrl)
    
    // Create components that need API
    this.transactionBuilder = new TransactionBuilder(this.apiConnector.getApi())
    this.nonceManager = new NonceManager(this.apiConnector.getApi())
    
    // Validate balances pallet
    this.transactionBuilder.validateBalancesPallet()
    
    // Initialize keyring
    const addresses = this.keyringManager.initialize(senderSeed, recipientSeed)
    
    // Initialize nonce
    await this.nonceManager.initialize(addresses.senderAddress)
    
    // Set amount and rate
    this.amount = amount
    this.rateController.setRate(rate)
    
    this.isInitialized = true
    
    this.logger.info('TransactionSender initialization completed', {
      senderAddress: addresses.senderAddress,
      recipientAddress: addresses.recipientAddress,
      amount: this.amount,
      rate: this.rateController.getRate(),
      startingNonce: this.nonceManager.getCurrentNonceValue()
    })
  }

  // Send a single transaction
  async sendSingleTransaction() {
    if (!this.isInitialized) {
      throw new Error('TransactionSender not initialized')
    }
    
    const startTime = Date.now()
    
    try {
      // Create transaction
      const tx = await this.transactionBuilder.createBalanceTransfer(
        this.keyringManager.getRecipientAddress(),
        this.amount
      )
      
      // Get nonce and send
      const nonce = this.nonceManager.getNextNonce()
      const hash = await tx.signAndSend(this.keyringManager.getSenderKeyPair(), { nonce })
      
      // Record success
      this.statisticsCollector.recordSuccess()
      const duration = Date.now() - startTime
      const txCount = this.statisticsCollector.getStats().sent
      
      this.logger.info('Transaction sent successfully', {
        txNumber: txCount,
        nonce,
        txHash: hash.toString().slice(0, 10) + '...',
        duration
      })
      
    } catch (error) {
      this.statisticsCollector.recordFailure()
      const duration = Date.now() - startTime
      const totalAttempts = this.statisticsCollector.getStats().total
      
      this.logger.error('Transaction failed', {
        txNumber: totalAttempts,
        error: error.message,
        duration
      })
    }
  }

  // Start sending transactions
  async start() {
    if (!this.isInitialized) {
      throw new Error('TransactionSender not initialized')
    }
    
    if (this.rateController.isActive()) {
      this.logger.warn('Sending already started')
      return false
    }
    
    this.logger.info('Starting transaction sending', {
      rate: this.rateController.getRate(),
      interval: this.rateController.getInterval(),
      transactionType: 'balances.transfer',
      amount: this.amount
    })
    
    this.statisticsCollector.start()
    
    // Start rate controller with callback
    this.rateController.start(() => {
      this.sendSingleTransaction()
    })
    
    this.logger.info('Transaction sending started successfully')
    
    return true
  }

  // Stop sending transactions
  stop() {
    const wasStopped = this.rateController.stop()
    if (wasStopped) {
      this.showStats()
    }
    return wasStopped
  }

  // Change sending rate
  changeRate(newRate) {
    try {
      this.rateController.setRate(newRate)
      return true
    } catch (error) {
      this.logger.error('Rate change error', { 
        newRate, 
        error: error.message 
      })
      return false
    }
  }

  // Show statistics
  showStats() {
    this.statisticsCollector.showStats(
      this.rateController.getRate(),
      this.nonceManager.getCurrentNonceValue()
    )
  }

  // Start interactive mode
  startInteractiveMode() {
    this.cliInterface.start()
  }

  // Start automatic mode
  async startAutoMode() {
    this.logger.info('Starting automatic mode')
    
    await this.start()
    
    // Show stats every 10 seconds
    const statsInterval = setInterval(() => {
      if (this.rateController.isActive()) {
        this.showStats()
      }
    }, 10000)
    
    // Handle termination signals
    const cleanup = () => {
      clearInterval(statsInterval)
      this.stop()
      this.apiConnector.disconnect()
      this.logger.info('Received stop signal - shutting down')
      process.exit(0)
    }
    
    process.on('SIGINT', cleanup)
    process.on('SIGTERM', cleanup)
  }

  // Cleanup resources
  cleanup() {
    this.rateController.stop()
    this.cliInterface.stop()
    this.apiConnector.disconnect()
  }
} 