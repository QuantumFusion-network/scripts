import { ApiConnector } from '../shared/api-connector.js'
import { KeyringManager } from './keyring-manager.js'
import { TransactionBuilder } from './transaction-builder.js'
import { NonceManager } from './nonce-manager.js'
import { RateController } from './rate-controller.js'
import { StatisticsCollector } from './statistics-collector.js'
import { CLIInterface } from './cli-interface.js'

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
    
    this.amount = 1000000
    this.isInitialized = false
  }

  // Initialize all components
  async initialize(nodeUrl, senderSeed, recipientSeed, amount, rate) {
    console.log('🔧 [INIT] Starting TransactionSender initialization...')
    console.log(`🔧 [INIT] Connecting to node: ${nodeUrl}`)
    
    // Connect to API
    await this.apiConnector.connect(nodeUrl)
    console.log('✅ [INIT] Node connection established')
    
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
    
    console.log(`💰 [INIT] Transfer amount: ${this.amount} (in smallest units)`)
    console.log(`📊 [INIT] Sending frequency: ${this.rateController.getRate()} tx/sec`)
    
    this.isInitialized = true
    
    console.log('✅ [INIT] Initialization completed successfully!')
    console.log('📋 [INIT] === CONNECTION PARAMETERS ===')
    console.log(`👤 Sender: ${addresses.senderAddress}`)
    console.log(`🎯 Recipient: ${addresses.recipientAddress}`)
    console.log(`💰 Amount: ${this.amount}`)
    console.log(`📊 Frequency: ${this.rateController.getRate()} tx/sec`)
    console.log(`🔢 Nonce: ${this.nonceManager.getCurrentNonceValue()}`)
    console.log('=========================================')
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
      
      console.log(`🚀 [SEND] TX #${txCount}: nonce ${nonce} → ${hash.toString().slice(0, 10)}... (${duration}ms)`)
      
    } catch (error) {
      this.statisticsCollector.recordFailure()
      const duration = Date.now() - startTime
      const totalAttempts = this.statisticsCollector.getStats().total
      
      console.error(`❌ [SEND] TX #${totalAttempts} FAILED: ${error.message} (${duration}ms)`)
    }
  }

  // Start sending transactions
  async start() {
    if (!this.isInitialized) {
      throw new Error('TransactionSender not initialized')
    }
    
    if (this.rateController.isActive()) {
      console.log('⚠️ [START] Sending already started!')
      return false
    }
    
    console.log(`\n🚀 [START] Starting transaction sending...`)
    console.log(`📊 [START] Frequency: ${this.rateController.getRate()} tx/sec`)
    console.log(`⏱️ [START] Interval between transactions: ${this.rateController.getInterval().toFixed(0)}ms`)
    console.log(`🎯 [START] Transaction type: balances.transfer`)
    console.log(`💰 [START] Transfer amount: ${this.amount}`)
    console.log('💡 [START] Available commands: "stop", "stats", number to change frequency')
    
    this.statisticsCollector.start()
    
    // Start rate controller with callback
    this.rateController.start(() => {
      this.sendSingleTransaction()
    })
    
    console.log(`✅ [START] Transaction sending started!`)
    console.log(`📊 [START] Statistics will update in real time`)
    
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
      console.error(`❌ Rate change error: ${error.message}`)
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
    console.log('🤖 Automatic mode')
    console.log('💡 Press Ctrl+C to stop')
    
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
      console.log('\n🛑 Received stop signal...')
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