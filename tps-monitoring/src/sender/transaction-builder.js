// Builds different types of transactions
export class TransactionBuilder {
  constructor(api) {
    this.api = api
  }

  // Create a balance transfer transaction
  async createBalanceTransfer(recipientAddress, amount) {
    // Select available transfer method in order of preference
    if (this.api.tx.balances.transfer) {
      return this.api.tx.balances.transfer(recipientAddress, amount)
    } else if (this.api.tx.balances.transferAllowDeath) {
      return this.api.tx.balances.transferAllowDeath(recipientAddress, amount)
    } else if (this.api.tx.balances.transferKeepAlive) {
      return this.api.tx.balances.transferKeepAlive(recipientAddress, amount)
    } else {
      throw new Error('No transfer methods available in balances pallet!')
    }
  }

  // Get available transfer methods for debugging
  getAvailableTransferMethods() {
    const methods = []
    if (this.api.tx.balances.transfer) methods.push('transfer')
    if (this.api.tx.balances.transferAllowDeath) methods.push('transferAllowDeath')
    if (this.api.tx.balances.transferKeepAlive) methods.push('transferKeepAlive')
    return methods
  }

  // Validate that balances pallet is available
  validateBalancesPallet() {
    if (!this.api.tx.balances) {
      throw new Error('Balances pallet not available!')
    }
    
    const availableMethods = this.getAvailableTransferMethods()
    if (availableMethods.length === 0) {
      throw new Error('No transfer methods available in balances pallet!')
    }
    
    console.log(`✅ [BUILDER] Available transfer methods: ${availableMethods.join(', ')}`)
    return true
  }
} 