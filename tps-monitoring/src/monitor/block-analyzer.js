import { Utils } from '../shared/utils.js'
import { monitorLogger } from '../shared/logger.js'

// Class for analyzing blocks and extrinsics (transactions) in blockchain
// Main task: extract balance transfers and count them
export class BlockAnalyzer {
  // Constructor accepts list of addresses we're tracking
  constructor(targetAddresses = []) {
    this.targetAddresses = targetAddresses
    this.reporter = null  // Will be set externally
    this.logger = monitorLogger.child('BLOCK-ANALYZER')
  }

  // Set reporter for logging
  setReporter(reporter) {
    this.reporter = reporter
  }

  // Method to update list of tracked addresses
  setTargetAddresses(addresses) {
    this.targetAddresses = addresses
    
    this.logger.info('🔄 Updated target addresses', {
      addressCount: addresses.length,
      trackingMode: addresses.length > 0 ? 'specific_addresses' : 'all_transactions'
    })
    
    if (addresses.length > 0) {
      Utils.logAddressList(addresses, 'ANALYZER', this.logger)
    }
  }

  // Check if address belongs to our tracked addresses
  // If list is empty - consider NOT tracking (only general count)
  isOurAddress(address) {
    if (this.targetAddresses.length === 0) {
      return false  // If list is empty - don't consider address as "ours"
    }
    
    // Convert address to string for comparison
    const addressStr = address.toString()
    
    // Check exact match with each of our addresses
    const isOur = this.targetAddresses.some(targetAddr => targetAddr === addressStr)
    
    return isOur
  }

  // Determine if extrinsic is a balance transfer
  // We're only interested in these transaction types for TPS calculation
  isBalanceTransfer(extrinsic) {
    if (!extrinsic.method || !extrinsic.method.section || !extrinsic.method.method) {
      return false
    }

    const section = extrinsic.method.section
    const method = extrinsic.method.method

    // Check: 'balances' section and transfer methods
    return section === 'balances' && 
           (method === 'transfer' || method === 'transferAllowDeath' || method === 'transferKeepAlive')
  }

  // Check if extrinsic is a system transaction
  // System transactions (inherents) are not considered user transactions
  // They are created automatically by the network to maintain blockchain operation
  isSystemInherent(extrinsic) {
    if (!extrinsic.method || !extrinsic.method.section) {
      return false
    }

    const section = extrinsic.method.section
    
    // List of system sections to exclude from counting
    return section === 'timestamp' ||
           section === 'parachainSystem' ||
           section === 'paraInherent' ||
           section === 'authorInherent'
  }

  // Extract sender address from extrinsic
  // Consider different ways of storing signer
  extractSignerAddress(extrinsic) {
    // Check different places where sender address might be stored
    if (extrinsic.signer) {
      return extrinsic.signer.toString()
    }
    
    if (extrinsic.signature && extrinsic.signature.signer) {
      return extrinsic.signature.signer.toString()
    }
    
    // If extrinsic is signed, try to extract address from signature
    if (extrinsic.isSigned && extrinsic.signature) {
      try {
        const signer = extrinsic.signature.signer
        if (signer) {
          return signer.toString()
        }
      } catch (error) {
        this.logger.warn('⚠️ Could not extract signer from signature', {
          error: error.message
        })
      }
    }
    
    return null
  }

  // Main analysis method: go through all extrinsics in block
  // Count total balance transfers and our transactions separately
  analyzeExtrinsics(extrinsics) {
    let totalBalanceTransfers = 0  // Total number of transfers in block
    let ourBalanceTransfers = 0    // Number of our transfers
    let systemTransactions = 0
    let otherTransactions = 0
    
    this.logger.debug('🔍 Starting block analysis', {
      totalExtrinsics: extrinsics.length,
      targetAddressesCount: this.targetAddresses.length
    })
    
    // Go through each extrinsic (transaction) in block
    for (const ext of extrinsics) {
      // Skip system transactions (they are not from users)
      if (this.isSystemInherent(ext)) {
        systemTransactions++
        this.logger.trace('⏭️ Skipping system transaction', {
          section: ext.method.section,
          method: ext.method.method
        })
        continue
      }
      
      // Check if this is a balance transfer
      if (this.isBalanceTransfer(ext)) {
        totalBalanceTransfers++
        const method = ext.method.method
        
        // Extract sender address
        const signerAddress = this.extractSignerAddress(ext)
        
        if (signerAddress) {
          // Check if this is our transaction (by sender address)
          const isOur = this.isOurAddress(signerAddress)
          
          if (isOur) {
            ourBalanceTransfers++
            this.logger.info('🎯 Found OUR balance transfer', {
              transactionNumber: ourBalanceTransfers,
              senderAddress: Utils.formatAddress(signerAddress),
              method
            })
          } else {
            this.logger.debug('👤 External balance transfer', {
              senderAddress: Utils.formatAddress(signerAddress),
              method
            })
          }
        } else {
          this.logger.warn('⚠️ Could not extract signer address from balance transfer')
        }
      } else {
        // Count other transaction types
        otherTransactions++
        this.logger.trace('🔍 Other transaction type', {
          section: ext.method?.section || 'unknown',
          method: ext.method?.method || 'unknown'
        })
      }
    }
    
    // Log final analysis results
    this.logger.info('📊 Block analysis completed', {
      totalExtrinsics: extrinsics.length,
      systemTransactions,
      totalBalanceTransfers,
      ourBalanceTransfers,
      otherTransactions,
      successRate: Utils.calculatePercentage(ourBalanceTransfers, totalBalanceTransfers)
    })
    
    // Also send to reporter for backwards compatibility (will be removed later)
    if (this.reporter) {
      this.reporter.logBlockAnalysis(extrinsics.length, totalBalanceTransfers, ourBalanceTransfers)
    }
    
    // Return analysis results for further use
    return { 
      totalUserTx: totalBalanceTransfers,  // Total number of user transactions
      ourTx: ourBalanceTransfers           // Number of our transactions
    }
  }
} 