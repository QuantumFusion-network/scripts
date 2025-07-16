const { ApiPromise, WsProvider } = require('@polkadot/api')
const { Keyring } = require('@polkadot/keyring')

class LoadTestUtils {
  constructor(config) {
    this.config = config
    this.api = null
    this.accounts = []
  }

  async connect() {
    console.log(`📡 Connecting to node: ${this.config.nodeUrl}`)
    const provider = new WsProvider(this.config.nodeUrl)
    this.api = await ApiPromise.create({ provider })
    
    console.log(`✅ Connected to node. Chain: ${await this.api.rpc.system.chain()}`)
    console.log(`⏱️  Block time: ${this.api.consts.timestamp.minimumPeriod.toNumber() * 2}ms`)
    
    return this.api
  }

  async prepareAccounts() {
    const keyring = new Keyring({ type: 'sr25519' })
    this.accounts = this.config.accounts.map(accountConfig => {
      const account = keyring.addFromUri(accountConfig.seed)
      account.meta.name = accountConfig.name
      return account
    })

    console.log(`👥 Accounts prepared: ${this.accounts.length}`)
    return this.accounts
  }

  async checkBalances() {
    console.log('\n💰 Account balances:')
    for (const account of this.accounts) {
      const { data: balance } = await this.api.query.system.account(account.address)
      console.log(`   ${account.meta.name}: ${balance.free.toHuman()}`)
    }
  }

  async sendTransaction(sender, receiver, amount) {
    const transfer = this.api.tx.balances.transferAllowDeath(receiver.address, amount)
    const hash = await transfer.signAndSend(sender)
    return hash
  }

  getRandomAccount() {
    return this.accounts[Math.floor(Math.random() * this.accounts.length)]
  }

  formatResults(startTime, endTime, successful, failed, total) {
    const totalTime = (endTime - startTime) / 1000
    const actualTPS = successful / totalTime
    const successRate = (successful / total) * 100

    return {
      totalTime: totalTime.toFixed(2),
      successful,
      failed,
      total,
      actualTPS: actualTPS.toFixed(2),
      successRate: successRate.toFixed(1)
    }
  }

  printResults(scenario, results) {
    console.log(`\n📊 ${scenario} Results:`)
    console.log(`⏱️  Total time: ${results.totalTime}s`)
    console.log(`📤 Transactions sent: ${results.total}`)
    console.log(`✅ Successful: ${results.successful}`)
    console.log(`❌ Failed: ${results.failed}`)
    console.log(`📈 Actual TPS: ${results.actualTPS}`)
    console.log(`📊 Success rate: ${results.successRate}%`)
  }

  async disconnect() {
    if (this.api) {
      await this.api.disconnect()
      console.log('🔌 Disconnected from node')
    }
  }
}

module.exports = LoadTestUtils 