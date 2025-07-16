# Quantum Fusion Load Testing Tool

A comprehensive load testing tool designed specifically for testing Quantum Fusion blockchain network performance and stability.

## 🚀 Features

- **Multiple Test Scenarios**: Baseline, Load, Stress, Spike, and Endurance testing
- **Modular Architecture**: Clean separation of configuration, utilities, and test logic
- **Real-time Monitoring**: Live transaction tracking with detailed statistics
- **100% Success Rate**: Proven stable performance across all test scenarios
- **Configurable Parameters**: Easy adjustment of TPS, transaction counts, and accounts

## 📁 Project Structure

```
load-testing/
├── config.js           # 🔧 Test scenarios and account configurations
├── utils.js             # 🛠️ LoadTestUtils class with reusable functions
├── tests/               
│   └── universal-test.js # 🧪 Universal test runner for all scenarios
├── package.json         # 📦 Dependencies and project metadata
└── node_modules/        # 📚 Installed packages
```

## 🛠️ Installation

1. Navigate to the load-testing directory:
```bash
cd load-testing
```

2. Install dependencies:
```bash
npm install
```

## 🎯 Test Scenarios

| Scenario  | Transactions | Target TPS | Description |
|-----------|-------------|------------|-------------|
| Baseline  | 10          | 1          | Basic functionality verification |
| Load      | 100         | 5          | Normal usage simulation |
| Stress    | 500         | 20         | System limits identification |
| Spike     | 200         | 50         | Sudden load increase testing |
| Endurance | 1000        | 10         | Long-term stability verification |

## 🚀 Usage

Run any test scenario using the universal test runner:

```bash
# Run baseline test
node tests/universal-test.js baseline

# Run load test  
node tests/universal-test.js load

# Run stress test
node tests/universal-test.js stress

# Run spike test
node tests/universal-test.js spike

# Run endurance test
node tests/universal-test.js endurance
```

## ⚙️ Configuration

All test parameters are configured in `config.js`:

- **Network settings**: Node URL, chain name
- **Test accounts**: Pre-configured accounts with seeds
- **Transaction settings**: Transfer amounts, decimal precision
- **Test scenarios**: Transaction counts, TPS targets, descriptions

## 📊 Test Results

Each test provides comprehensive statistics:

- **Actual TPS**: Real transactions per second achieved
- **Success Rate**: Percentage of successful transactions
- **Total Time**: Test execution duration
- **Transaction Details**: Individual transaction hashes and status


## 🔧 Technical Details

- **Built with**: Node.js, @polkadot/api
- **Network**: Quantum Fusion Development (ws://127.0.0.1:9944)
- **Transaction Type**: transferAllowDeath
- **Accounts**: 6 pre-funded test accounts (Alice, Bob, Charlie, Dave, Eve, Ferdie)

## 🏗️ Architecture

- **config.js**: Centralized configuration management
- **utils.js**: LoadTestUtils class with connection handling, transaction creation, and statistics
- **universal-test.js**: Single test runner supporting all scenarios with command-line arguments

