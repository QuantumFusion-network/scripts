// === TRANSACTION SENDER CLASS ===
// Handles sending transactions to blockchain with proper nonce management
export class TransactionSender {
  constructor(api, keyring) {
    this.api = api                    // Blockchain API connection
    this.keyring = keyring           // Keyring for account management
    this.alice = null                // Alice account (sender)
    this.isRunning = false           // Flag to control transaction sending
    this.txCount = 0                 // Counter of sent transactions
    this.nonce = null                // Current nonce for transactions
  }

  // === SETUP ALICE ACCOUNT ===
  // Get Alice account and initial nonce from blockchain
  async initialize() {
    // Create Alice account from seed
    this.alice = this.keyring.addFromUri('//Alice')
    
    // Get current nonce from blockchain (starting point)
    this.nonce = await this.api.rpc.system.accountNextIndex(this.alice.address)
    
    console.log('👤 Using Alice account:', this.alice.address.substring(0, 20) + '...')
    console.log(`🔢 Starting nonce: ${this.nonce.toNumber()}`)
  }

  // === START SENDING TRANSACTIONS ===
  // Send transactions at specified TPS rate
  async startSending(tpsTarget = 10) {
    console.log(`🔄 Starting to send ${tpsTarget} TPS (Alice → Alice transfers)`)
    
    // Set running flag and reset counter
    this.isRunning = true
    this.txCount = 0
    
    // Calculate delay between transactions (milliseconds)
    const intervalMs = 1000 / tpsTarget
    
    // === RECURSIVE TRANSACTION SENDING FUNCTION ===
    const sendTx = async () => {
      // Stop if not running
      if (!this.isRunning) return
      
      try {
        // === CREATE AND SEND TRANSACTION ===
        // Create balance transfer: Alice -> Alice (1 unit)
        const transfer = this.api.tx.balances.transferKeepAlive(this.alice.address, 1)
        
        // Send transaction with current nonce
        await transfer.signAndSend(this.alice, { nonce: this.nonce })
        
        // === UPDATE COUNTERS ===
        this.nonce++     // Increment nonce for next transaction
        this.txCount++   // Count sent transactions
        
        // Log progress every 10 transactions
        if (this.txCount % 10 === 0) {
          console.log(`📤 Sent ${this.txCount} transactions (nonce: ${this.getCurrentNonce()})`)
        }
        
      } catch (error) {
        console.error('❌ Transfer failed:', error.message)
        
        // === NONCE ERROR RECOVERY ===
        // If nonce error occurs, get fresh nonce from blockchain
        if (error.message.includes('nonce') || error.message.includes('outdated')) {
          try {
            this.nonce = await this.api.rpc.system.accountNextIndex(this.alice.address)
            console.log(`🔄 Updated nonce to: ${this.getCurrentNonce()}`)
          } catch (nonceError) {
            console.error('❌ Failed to update nonce:', nonceError.message)
          }
        }
      }
      
      // === SCHEDULE NEXT TRANSACTION ===
      // Wait specified interval then send next transaction
      if (this.isRunning) {
        setTimeout(sendTx, intervalMs)
      }
    }
    
    // Start the transaction sending loop
    sendTx()
  }

  // === STOP SENDING ===
  // Stop transaction sending and show final stats
  stop() {
    this.isRunning = false
    console.log(`📤 Stopped sending. Total sent: ${this.txCount} transactions`)
    console.log(`🔢 Final nonce: ${this.getCurrentNonce() || 'N/A'}`)
  }

  // === GET TRANSACTION COUNT ===
  getTxCount() {
    return this.txCount
  }

  // === GET CURRENT NONCE ===
  // Handle both BigNumber and regular number types
  getCurrentNonce() {
    if (!this.nonce) return null
    // Convert BigNumber to regular number if needed
    return typeof this.nonce.toNumber === 'function' ? this.nonce.toNumber() : this.nonce
  }
} 