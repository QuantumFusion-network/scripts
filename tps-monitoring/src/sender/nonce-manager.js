// Manages nonce for transactions
export class NonceManager {
  constructor(api) {
    this.api = api
    this.currentNonce = null
    this.senderAddress = null
  }

  // Initialize nonce for given sender address
  async initialize(senderAddress) {
    this.senderAddress = senderAddress
    console.log('🔧 [NONCE] Getting current nonce...')
    
    this.currentNonce = await this.getCurrentNonce()
    console.log(`🔢 [NONCE] Starting nonce: ${this.currentNonce}`)
    
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
    
    console.log('🔄 [NONCE] Resetting nonce from chain...')
    this.currentNonce = await this.getCurrentNonce()
    console.log(`🔢 [NONCE] Reset to: ${this.currentNonce}`)
    return this.currentNonce
  }

  // Get current nonce value without incrementing
  getCurrentNonceValue() {
    return this.currentNonce
  }
} 