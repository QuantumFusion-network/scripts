import { Utils } from '../shared/utils.js'

// Class for analyzing blocks and extrinsics (transactions) in blockchain
// Main task: extract balance transfers and count them
export class BlockAnalyzer {
  // Constructor accepts list of addresses we're tracking
  constructor(targetAddresses = []) {
    this.targetAddresses = targetAddresses
    this.reporter = null  // Will be set externally
  }

  // Set reporter for logging
  setReporter(reporter) {
    this.reporter = reporter
  }

  // Method to update list of tracked addresses
  setTargetAddresses(addresses) {
    this.targetAddresses = addresses
    
    // Log only if reporter is available
    if (this.reporter) {
      console.log(`🔄 [ANALYZER] Updated target addresses: ${addresses.length} total`)
      if (addresses.length > 0) {
        Utils.logAddressList(addresses, 'ANALYZER')
      }
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
        console.log(`⚠️  [SIGNER] Could not extract signer: ${error.message}`)
      }
    }
    
    return null
  }

  // Main analysis method: go through all extrinsics in block
  // Count total balance transfers and our transactions separately
  analyzeExtrinsics(extrinsics) {
    let totalBalanceTransfers = 0  // Total number of transfers in block
    let ourBalanceTransfers = 0    // Number of our transfers
    
    // Go through each extrinsic (transaction) in block
    for (const ext of extrinsics) {
      // Skip system transactions (they are not from users)
      if (this.isSystemInherent(ext)) {
        const section = ext.method.section
        const method = ext.method.method
        console.log(`⏭️  [ANALYZE] Skipping system: ${section}.${method}`)
        continue
      }
      
      // Check if this is a balance transfer
      if (this.isBalanceTransfer(ext)) {
        totalBalanceTransfers++
        const method = ext.method.method
        console.log(`💸 [ANALYZE] Found balances.${method} #${totalBalanceTransfers}`)
        
        // Extract sender address
        const signerAddress = this.extractSignerAddress(ext)
        
        if (signerAddress) {
          // Check if this is our transaction (by sender address)
          const isOur = this.isOurAddress(signerAddress)
          
          if (isOur) {
            ourBalanceTransfers++
            console.log(`🎯 [ANALYZE] ✅ This is OUR transaction #${ourBalanceTransfers}! From: ${Utils.formatAddress(signerAddress)}`)
          } else {
            console.log(`👤 [ANALYZE] External transaction from: ${Utils.formatAddress(signerAddress)}`)
          }
        } else {
          console.log(`⚠️  [ANALYZE] Could not extract signer address from balance transfer`)
        }
      } else {
        // Log other transaction types for debugging (but don't count them)
        const section = ext.method?.section || 'unknown'
        const method = ext.method?.method || 'unknown'
        console.log(`🔍 [ANALYZE] Other transaction: ${section}.${method} (ignoring)`)
      }
    }
    
    // Log results through reporter (if available)
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