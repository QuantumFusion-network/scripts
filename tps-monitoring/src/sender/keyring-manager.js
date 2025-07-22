import { Keyring } from '@polkadot/api'

// Manages keypairs and addresses for transaction sending
export class KeyringManager {
  constructor() {
    this.keyring = new Keyring({ type: 'sr25519' })
    this.senderKeyPair = null
    this.recipientAddress = null
  }

  // Initialize sender and recipient from seeds
  initialize(senderSeed, recipientSeed = null) {
    console.log('🔧 [KEYRING] Creating keyring and key pairs...')
    
    // Create sender keypair
    this.senderKeyPair = this.keyring.addFromUri(senderSeed)
    console.log(`✅ [KEYRING] Sender created: ${this.senderKeyPair.address}`)
    
    // Define recipient address (if not specified - send to self)
    this.recipientAddress = recipientSeed 
      ? this.keyring.addFromUri(recipientSeed).address 
      : this.senderKeyPair.address
    
    if (recipientSeed) {
      console.log(`✅ [KEYRING] Recipient created: ${this.recipientAddress}`)
    } else {
      console.log(`✅ [KEYRING] Recipient = sender (self transfer): ${this.recipientAddress}`)
    }
    
    return {
      senderAddress: this.senderKeyPair.address,
      recipientAddress: this.recipientAddress
    }
  }

  // Get sender keypair for signing
  getSenderKeyPair() {
    if (!this.senderKeyPair) {
      throw new Error('Sender keypair not initialized')
    }
    return this.senderKeyPair
  }

  // Get recipient address
  getRecipientAddress() {
    if (!this.recipientAddress) {
      throw new Error('Recipient address not initialized')
    }
    return this.recipientAddress
  }

  // Get sender address
  getSenderAddress() {
    if (!this.senderKeyPair) {
      throw new Error('Sender keypair not initialized')
    }
    return this.senderKeyPair.address
  }
} 