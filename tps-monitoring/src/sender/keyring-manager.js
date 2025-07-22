import { Keyring } from '@polkadot/api'
import { senderLogger } from '../shared/logger.js'

// Manages keypairs and addresses for transaction sending
export class KeyringManager {
  constructor() {
    this.keyring = new Keyring({ type: 'sr25519' })
    this.senderKeyPair = null
    this.recipientAddress = null
    this.logger = senderLogger.child('KEYRING-MGR')
  }

  // Initialize sender and recipient from seeds
  initialize(senderSeed, recipientSeed = null) {
    this.logger.info('Creating keyring and key pairs')
    
    // Create sender keypair
    this.senderKeyPair = this.keyring.addFromUri(senderSeed)
    this.logger.info('Sender keypair created', { 
      senderAddress: this.senderKeyPair.address 
    })
    
    // Define recipient address (if not specified - send to self)
    this.recipientAddress = recipientSeed 
      ? this.keyring.addFromUri(recipientSeed).address 
      : this.senderKeyPair.address
    
    const isSelfTransfer = !recipientSeed
    this.logger.info('Recipient configured', {
      recipientAddress: this.recipientAddress,
      isSelfTransfer
    })
    
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