export class TransactionSender {
  constructor(api, keyring) {
    this.api = api
    this.keyring = keyring
    this.alice = null
    this.isRunning = false
    this.txCount = 0
  }

  initialize() {
    this.alice = this.keyring.addFromUri('//Alice')
    console.log('👤 Using Alice account:', this.alice.address.substring(0, 20) + '...')
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
        await transfer.signAndSend(this.alice)
        this.txCount++
        
        if (this.txCount % 10 === 0) {
          console.log(`📤 Sent ${this.txCount} transactions`)
        }
      } catch (error) {
        console.error('❌ Transfer failed:', error.message)
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
  }

  getTxCount() {
    return this.txCount
  }
} 