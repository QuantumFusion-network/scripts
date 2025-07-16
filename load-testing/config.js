// Common configuration for all load tests
const CONFIG = {
  // Network settings
  nodeUrl: 'ws://127.0.0.1:9944',
  
  // Test accounts with names
  accounts: [
    { seed: '//Alice', name: 'Alice' },
    { seed: '//Bob', name: 'Bob' },
    { seed: '//Charlie', name: 'Charlie' },
    { seed: '//Dave', name: 'Dave' },
    { seed: '//Eve', name: 'Eve' },
    { seed: '//Ferdie', name: 'Ferdie' }
  ],
  
  // Transaction settings
  transferAmount: '1000000000000', // 1 token (12 decimals)
  
  // Test scenarios
  scenarios: {
    baseline: {
      transactionsCount: 10,
      tps: 1,
      description: 'Baseline test - verify basic functionality'
    },
    load: {
      transactionsCount: 100,
      tps: 5,
      description: 'Load test - normal usage simulation'
    },
    stress: {
      transactionsCount: 500,
      tps: 20,
      description: 'Stress test - find system limits'
    },
    spike: {
      transactionsCount: 200,
      tps: 50,
      description: 'Spike test - sudden load increase'
    },
    endurance: {
      transactionsCount: 1000,
      tps: 10,
      description: 'Endurance test - long-term stability'
    }
  }
}

module.exports = CONFIG 