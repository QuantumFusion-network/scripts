export class TransactionSender {
  constructor(api, keyring) {
    this.api = api
    this.keyring = keyring
    this.alice = null
    this.isRunning = false
    this.txCount = 0
    this.nonce = null // Add nonce tracking
  }

  async initialize() {
    this.alice = this.keyring.addFromUri('//Alice')
    // Get current nonce for the account
    this.nonce = await this.api.rpc.system.accountNextIndex(this.alice.address)
    console.log('👤 Using Alice account:', this.alice.address.substring(0, 20) + '...')
    console.log(`🔢 Starting nonce: ${this.nonce.toNumber()}`)
  }

  async startSending(tpsTarget = 10) {
    console.log(`🔄 Starting to send ${tpsTarget} TPS (Alice → Alice transfers)`)
    
    this.isRunning = true
    this.txCount = 0
    
    const intervalMs = 1000 / tpsTarget
    
    const sendTx = async () => {
      if (!this.isRunning) return
      
      try {
        // Simple transfer Alice -> Alice (1 unit)
        const transfer = this.api.tx.balances.transferKeepAlive(this.alice.address, 1)
        // Use proper nonce management as documented
        await transfer.signAndSend(this.alice, { nonce: this.nonce })
        this.nonce++ // Increment nonce for next transaction
        this.txCount++
        
        if (this.txCount % 10 === 0) {
          console.log(`📤 Sent ${this.txCount} transactions (nonce: ${this.getCurrentNonce()})`)
        }
      } catch (error) {
        console.error('❌ Transfer failed:', error.message)
        // If nonce error, try to get current nonce from network
        if (error.message.includes('nonce') || error.message.includes('outdated')) {
          try {
            this.nonce = await this.api.rpc.system.accountNextIndex(this.alice.address)
            console.log(`🔄 Updated nonce to: ${this.getCurrentNonce()}`)
          } catch (nonceError) {
            console.error('❌ Failed to update nonce:', nonceError.message)
          }
        }
      }
      
      // Schedule next transaction
      if (this.isRunning) {
        setTimeout(sendTx, intervalMs)
      }
    }
    
    // Start sending
    sendTx()
  }

  stop() {
    this.isRunning = false
    console.log(`📤 Stopped sending. Total sent: ${this.txCount} transactions`)
    console.log(`🔢 Final nonce: ${this.getCurrentNonce() || 'N/A'}`)
  }

  getTxCount() {
    return this.txCount
  }

  getCurrentNonce() {
    if (!this.nonce) return null
    // Handle both BN (BigNumber) and regular number types
    return typeof this.nonce.toNumber === 'function' ? this.nonce.toNumber() : this.nonce
  }
} 