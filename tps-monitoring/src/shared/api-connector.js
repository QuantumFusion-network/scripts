import { ApiPromise, WsProvider } from '@polkadot/api'
import { apiLogger } from './logger.js'

export class ApiConnector {
  constructor() {
    this.api = null
    this.provider = null
    this.logger = apiLogger
  }

  async connect(nodeUrl) {
    this.logger.info('🔧 [API] Starting connection...')
    this.logger.info(`🔧 [API] Connecting to node: ${nodeUrl}`)
    
    this.provider = new WsProvider(nodeUrl)
    this.logger.info('🔧 [API] Creating WsProvider...')
    
    this.api = await ApiPromise.create({ provider: this.provider })
    this.logger.info('✅ [API] Node connection established')
    
    return this.api
  }

  // Get the API instance
  getApi() {
    if (!this.api) {
      throw new Error('API not connected. Call connect() first.')
    }
    return this.api
  }

  async getBlock(blockHash) {
    if (!this.api) {
      throw new Error('API not connected. Call connect() first.')
    }
    
    const [block, header] = await Promise.all([
      this.api.rpc.chain.getBlock(blockHash),
      this.api.rpc.chain.getHeader(blockHash)
    ])
    
    return {
      block: block.block,
      number: header.number.toNumber(),
      hash: blockHash
    }
  }

  async subscribeNewHeads(callback) {
    if (!this.api) {
      throw new Error('API not connected. Call connect() first.')
    }
    
    return await this.api.rpc.chain.subscribeNewHeads(callback)
  }

  disconnect() {
    if (this.provider) {
      this.provider.disconnect()
      this.logger.info('🔌 [API] Disconnected')
    }
  }
} 