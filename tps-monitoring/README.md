# 🚀 Simple TPS Monitor: Substrate TPS Measurement Tool

A simple tool for measuring real TPS (transactions per second) in Polkadot/Substrate blockchains with modular architecture.

## 🎯 Features

- ✅ **Accurate TPS measurement** - analyzes blocks, not sending speed
- ✅ **Real balance transactions** - uses transferKeepAlive
- ✅ **Automatic nonce management** - proper handling of multiple transactions
- ✅ **Continuous monitoring** - tracks blocks in real-time
- ✅ **Configurable load** - --tps parameter for controlling sending frequency
- ✅ **Monitor-only mode** - --tps 0 for analysis without load generation
- ✅ **Simple CLI interface** - one command to run
- ✅ **Graceful shutdown** - proper termination with Ctrl+C
- ✅ **Modular architecture** - clean separation of concerns

## 📦 Installation

```bash
# Clone the repository
git clone https://github.com/your-username/tps-monitoring.git
cd tps-monitoring

# Install dependencies
npm install
```

## 🔧 Requirements

- Node.js >= 16.0.0
- Access to Polkadot/Substrate node via WebSocket
- Alice account with balance for testing

## 🏗️ How It Works - Modular Architecture

### Project Structure
```
tps-monitoring/
├── src/
│   ├── index.js                    # CLI entry point
│   ├── modules/
│   │   ├── TPSMonitor.js          # Main coordinator
│   │   ├── TransactionSender.js   # Transaction generation
│   │   └── BlockMonitor.js        # Block monitoring & TPS calculation
│   └── simple-monitor.js          # Legacy monolithic version
```

### System Flow

#### 1. **Entry Point (index.js)**
```javascript
// Parse CLI arguments and create TPSMonitor instance
const monitor = new TPSMonitor()
await monitor.start(options)
```

**What happens:**
- Parses command line arguments (`--node`, `--tps`)
- Creates TPSMonitor instance
- Starts the monitoring system

#### 2. **Main Coordinator (TPSMonitor.js)**
```javascript
// Initialize blockchain connection and components
await this.initialize(options.node)
this.blockMonitor.startMonitoring(this.api)
if (options.tps > 0) {
  await this.transactionSender.startSending(options.tps)
}
```

**What happens:**
- Connects to blockchain via WebSocket
- Initializes cryptography and keyring
- Creates TransactionSender and BlockMonitor instances
- Starts both monitoring and transaction sending (if enabled)
- Handles graceful shutdown on Ctrl+C

#### 3. **Transaction Sender (TransactionSender.js)**
```javascript
// Send transactions at specified TPS rate
const intervalMs = 1000 / tpsTarget
const sendTx = async () => {
  const transfer = this.api.tx.balances.transferKeepAlive(this.alice.address, 1)
  await transfer.signAndSend(this.alice)
  setTimeout(sendTx, intervalMs)
}
```

**What happens:**
- Creates Alice test account
- Sends `transferKeepAlive` transactions to self
- Maintains specified TPS rate using `setTimeout`
- Logs progress every 10 transactions
- Can be stopped gracefully

#### 4. **Block Monitor (BlockMonitor.js)**
```javascript
// Subscribe to new blocks and calculate TPS
api.derive.chain.subscribeNewHeads(async (header) => {
  const block = await api.rpc.chain.getBlock(header.hash)
  const txCount = block.block.extrinsics.length
  
  // Store data and calculate TPS
  this.blockTimes.push(now)
  this.txCounts.push(txCount)
  const avgTPS = this.calculateTPS()
})
```

**What happens:**
- Subscribes to new blocks via WebSocket
- Extracts transaction count from each block
- Maintains sliding window of last 10 blocks
- Calculates real-time TPS: `total_transactions / time_span`
- Displays statistics for each block

### Component Interaction

```
┌─────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   index.js  │───▶│  TPSMonitor.js  │───▶│TransactionSender│
│   (CLI)     │    │  (Coordinator)  │    │     .js         │
└─────────────┘    └─────────────────┘    └─────────────────┘
                          │                        │
                          ▼                        │
                   ┌─────────────────┐             │
                   │ BlockMonitor.js │◀────────────┘
                   │ (TPS Calculator)│   (API shared)
                   └─────────────────┘
```

### Key Benefits of Modular Design

#### **Separation of Concerns**
- **TransactionSender**: Only handles transaction generation
- **BlockMonitor**: Only handles block monitoring and TPS calculation
- **TPSMonitor**: Only handles coordination and lifecycle
- **index.js**: Only handles CLI interface

#### **Testability**
```javascript
// Test components independently
const sender = new TransactionSender(api, keyring)
await sender.startSending(5)

const monitor = new BlockMonitor()
monitor.startMonitoring(api)
```

#### **Reusability**
- TransactionSender can be used in other load testing tools
- BlockMonitor can be extended for other blockchain metrics
- TPSMonitor can be adapted for different blockchain networks

#### **Maintainability**
- Easy to find and fix bugs in specific components
- Simple to add new features (e.g., different transaction types)
- Clear interfaces between components

## 🚀 Usage

### Basic Command

```bash
# Run with load generation (10 TPS by default)
node src/index.js

# Connect to custom node
node src/index.js --node ws://your-node:9944

# Set target TPS
node src/index.js --tps 50

# Monitor only without load generation
node src/index.js --tps 0

# Full example
node src/index.js \
  --node ws://localhost:9944 \
  --tps 25
```

### CLI Parameters

- `-n, --node <url>` - Node WebSocket URL (default: ws://localhost:9944)
- `-t, --tps <number>` - Target TPS to generate (0 = monitor only, default: 10)

### NPM Scripts

```bash
# Run with default parameters
npm start
```

## 📊 How it works

### 1. Blockchain Connection
- Initializes cryptography
- Connects to node via WebSocket
- Creates Alice account for testing

### 2. Load Generation (if --tps > 0)
- Sends Alice → Alice transactions at specified frequency
- Uses `transferKeepAlive` for safe transfers
- Automatically manages nonce for each transaction
- Shows progress every 10 transactions

### 3. TPS Monitoring
- Subscribes to new blocks
- Counts transactions in each block
- Calculates average TPS over last 10 blocks
- Shows statistics in real-time

### 4. Statistics Output
```
Block #1234: 8 txs, 13.3 TPS (45s runtime)
```
Where:
- `#1234` - block number
- `8 txs` - number of transactions in block
- `13.3 TPS` - average TPS over last 10 blocks
- `45s runtime` - program runtime

## 🏃‍♂️ Usage Examples

### Node Performance Testing

```bash
# Start with low load
node src/index.js --tps 5

# Gradually increase load
node src/index.js --tps 10
node src/index.js --tps 20
node src/index.js --tps 50
```

### Monitoring Existing Network

```bash
# Monitor TPS without generating load
node src/index.js --tps 0 --node ws://mainnet-node:9944
```

### Local Testing

```bash
# Test local node
node src/index.js --node ws://localhost:9944 --tps 15
```

## 🔍 Differences from Legacy Script

### ❌ Problems in original script:
1. **Wrong transaction type**: `system.remark` instead of `balances.transfer`
2. **Automatic nonce**: led to transaction rejections
3. **Sending speed measurement**: instead of real TPS
4. **One-time execution**: send batch and exit

### ✅ Fixes in Simple TPS Monitor:
1. **Balance transfers** - real money transfers
2. **Automatic nonce** - proper handling of multiple transactions
3. **Block reading** - real TPS measurement
4. **Continuous operation** - configurable sending frequency
5. **Block monitoring** - real-time analysis
6. **Modular architecture** - clean separation of concerns

## 🛠️ Troubleshooting

### Transactions not going through:
- Check Alice account balance
- Ensure node is accessible and running
- Verify node URL is correct

### Low TPS:
- Try reducing sending frequency (--tps)
- Check node load
- Ensure node doesn't limit TPS

### Connection errors:
- Check node accessibility
- Ensure correct WebSocket URL is used
- Check network settings

### Common Error Messages:
- `Priority is too low`: Transaction pool is full, reduce TPS
- `Transaction is outdated`: Nonce issue, restart the tool
- `Connection failed`: Check node URL and network

## 📈 Load Testing Recommendations

```bash
# 1. Start with monitoring without load
node src/index.js --tps 0

# 2. Add minimal load
node src/index.js --tps 1

# 3. Gradually increase load
node src/index.js --tps 5
node src/index.js --tps 10
node src/index.js --tps 20

# 4. Find maximum load
node src/index.js --tps 50
node src/index.js --tps 100
```

## 🎯 Result

Simple TPS Monitor provides:
- ✅ **Accurate TPS measurement** - based on blockchain data
- ✅ **Proper transaction sending** - with nonce increment
- ✅ **Real load** - balance transfers, not just messages
- ✅ **Configuration flexibility** - --tps parameter for load control
- ✅ **Ease of use** - single file, one command launch
- ✅ **Modular design** - clean architecture, easy to extend

**Result:** Reliable and accurate tool for measuring Polkadot/Substrate network performance.

## 📋 Requirements for Testing

### Node Setup
- Running Substrate/Polkadot node
- WebSocket endpoint available (default: ws://localhost:9944)
- Node configured for development/testing

### Account Setup
- Alice account with sufficient balance
- Account should be able to send transactions
- Recommended: Use development node with pre-funded accounts

## 🔧 Development

### Dependencies
- `@polkadot/api` - Polkadot/Substrate API
- `@polkadot/util-crypto` - Cryptographic utilities
- `commander` - CLI argument parsing

### Architecture Benefits

#### **Single Responsibility Principle (SRP)**
- Each class has one responsibility
- Easier to understand and maintain

#### **Testability**
```javascript
// Can test components separately
const sender = new TransactionSender(api, keyring)
await sender.startSending(5)

const monitor = new BlockMonitor()
monitor.startMonitoring(api)
```

#### **Reusability**
- TransactionSender can be used in other projects
- BlockMonitor can be extended for other metrics

#### **Extensibility**
- Easy to add new transaction types
- Can add new metrics to BlockMonitor

## 📄 License

This project is unlicensed. All rights reserved.

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

---

**Note:** This tool is designed for testing and development purposes. Use responsibly and ensure you have proper permissions for the target network.
