import { senderLogger } from '../shared/logger.js'

// Manages nonce for transactions
export class NonceManager {
  constructor(api) {
    this.api = api
    this.currentNonce = null
    this.senderAddress = null
    this.logger = senderLogger.child('NONCE-MGR')
  }

  // Initialize nonce for given sender address
  async initialize(senderAddress) {
    this.senderAddress = senderAddress
    this.logger.info('Getting current nonce from chain', { senderAddress })
    
    this.currentNonce = await this.getCurrentNonce()
    this.logger.info('Nonce initialized', { 
      senderAddress, 
      startingNonce: this.currentNonce 
    })
    
    return this.currentNonce
  }

  // Get current nonce from chain
  async getCurrentNonce() {
    if (!this.senderAddress) {
      throw new Error('Sender address not set')
    }
    
    const nonce = await this.api.rpc.system.accountNextIndex(this.senderAddress)
    return nonce.toNumber()
  }

  // Get next nonce for transaction
  getNextNonce() {
    if (this.currentNonce === null) {
      throw new Error('Nonce not initialized')
    }
    
    const nonce = this.currentNonce
    this.currentNonce++
    return nonce
  }

  // Reset nonce (in case of errors)
  async resetNonce() {
    if (!this.senderAddress) {
      throw new Error('Sender address not set')
    }
    
    this.logger.warn('Resetting nonce from chain', { senderAddress: this.senderAddress })
    this.currentNonce = await this.getCurrentNonce()
    this.logger.info('Nonce reset completed', { 
      senderAddress: this.senderAddress, 
      newNonce: this.currentNonce 
    })
    return this.currentNonce
  }

  // Get current nonce value without incrementing
  getCurrentNonceValue() {
    return this.currentNonce
  }
} 