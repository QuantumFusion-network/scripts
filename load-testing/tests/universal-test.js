const CONFIG = require('../config')
const LoadTestUtils = require('../utils')

async function runUniversalTest(scenarioName) {
  if (!scenarioName) {
    console.error('❌ Usage: node universal-test.js <scenario>')
    console.log('📋 Available scenarios:', Object.keys(CONFIG.scenarios).join(', '))
    process.exit(1)
  }

  const scenario = CONFIG.scenarios[scenarioName]
  if (!scenario) {
    console.error(`❌ Scenario "${scenarioName}" not found in config`)
    console.log('📋 Available scenarios:', Object.keys(CONFIG.scenarios).join(', '))
    process.exit(1)
  }

  console.log(`🚀 Starting ${scenario.description}`)
  console.log(`📊 Parameters: ${scenario.transactionsCount} transactions at ${scenario.tps} TPS\n`)
  
  const utils = new LoadTestUtils(CONFIG)
  
  try {
    // Initialize
    await utils.connect()
    await utils.prepareAccounts()
    await utils.checkBalances()
    
    // Test parameters
    const interval = 1000 / scenario.tps // ms between transactions
    let successful = 0
    let failed = 0
    
    console.log(`🔥 Starting ${scenarioName} test: ${scenario.transactionsCount} transactions at ${scenario.tps} TPS\n`)
    
    const startTime = Date.now()
    
    // Send transactions
    for (let i = 0; i < scenario.transactionsCount; i++) {
      try {
        const sender = utils.accounts[i % utils.accounts.length]
        const receiver = utils.accounts[(i + 1) % utils.accounts.length]
        
        const hash = await utils.sendTransaction(sender, receiver, CONFIG.transferAmount)
        successful++
        
        console.log(`✅ [${i + 1}/${scenario.transactionsCount}] ${sender.meta.name} → ${receiver.meta.name} | Hash: ${hash.toHex()}`)
        
      } catch (error) {
        failed++
        console.log(`❌ [${i + 1}/${scenario.transactionsCount}] Error: ${error.message}`)
      }

      // Wait before next transaction (except for last one)
      if (i < scenario.transactionsCount - 1) {
        await new Promise(resolve => setTimeout(resolve, interval))
      }
    }
    
    const endTime = Date.now()
    const results = utils.formatResults(startTime, endTime, successful, failed, scenario.transactionsCount)
    utils.printResults(`${scenarioName.toUpperCase()} Test`, results)
    
    return results
    
  } catch (error) {
    console.error('❌ Test failed:', error.message)
    throw error
  } finally {
    await utils.disconnect()
  }
}

// Run if called directly
if (require.main === module) {
  const scenarioName = process.argv[2]
  runUniversalTest(scenarioName)
    .then(() => process.exit(0))
    .catch(() => process.exit(1))
}

module.exports = runUniversalTest 