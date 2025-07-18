# 🚀 TPS-Real: Substrate TPS Measurement Tool

A tool for measuring real TPS (transactions per second) in Polkadot/Substrate blockchains with QuantumFusion support.

## 🎯 Features

- ✅ **QuantumFusion support** - works with transferAllowDeath and other modern Substrate runtimes
- ✅ **Correct TPS measurement** - analyzes blocks, not sending speed
- ✅ **Universal balance transfers** - supports transfer, transferAllowDeath, transferKeepAlive
- ✅ **Optimized logging** - clean output with essential information only
- ✅ **Manual nonce management** - supports multiple transactions
- ✅ **Interactive CLI** - change frequency in real time
- ✅ **Multiple instances** - distributed load from different accounts
- ✅ **Real-time monitoring** - separate program for measuring actual TPS
- ✅ **Data export** - save statistics to CSV

## 📦 Installation

```bash
# Clone the repository
git clone <repository-url>
cd tps-real

# Install dependencies
npm install
```

## 🔧 Requirements

- Node.js >= 16.0.0
- Access to Polkadot/Substrate node via WebSocket
- Accounts with balance for testing

## 🚀 Usage

### 1. Transaction Sender

Program for generating load:

```bash
# Interactive mode (transfers to self)
node src/transaction_sender.js -n ws://localhost:9944 -s "//Alice"

# Transfers between accounts
node src/transaction_sender.js -n ws://localhost:9944 -s "//Alice" -r "//Bob"

# Automatic mode with parameters
node src/transaction_sender.js \
  -n ws://localhost:9944 \
  -s "//Alice" \
  -r "//Bob" \
  --rate 10 \
  --amount 1000000 \
  --auto
```

#### Parameters:
- `-n, --node <url>` - Node URL (required)
- `-s, --sender <seed>` - Sender seed phrase (required)
- `-r, --recipient <seed>` - Recipient seed phrase (default = sender)
- `--rate <number>` - Sending frequency tx/sec (default: 1)
- `--amount <number>` - Transfer amount (default: 1000000)
- `--auto` - Automatic mode without interactivity

#### Interactive commands:
- `start` - start sending transactions
- `stop` - stop sending
- `stats` - show statistics
- `<number>` - change frequency (example: `5` for 5 tx/sec)
- `exit` - exit the program

### 2. TPS Monitoring

Program for measuring real TPS:

```bash
# Monitor all transactions
node src/tps_monitor.js -n ws://localhost:9944

# Monitor specific addresses with CSV export
node src/tps_monitor.js \
  -n ws://localhost:9944 \
  -a "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY,5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty" \
  -o tps_data.csv
```

#### Parameters:
- `-n, --node <url>` - Node URL (required)
- `-o, --output <file>` - File to save CSV data
- `-a, --addresses <addresses>` - Tracked addresses (comma-separated)

## 🏃‍♂️ Complete Testing Example

### Step 1: Start monitoring
```bash
# Terminal 1 - TPS monitoring
node src/tps_monitor.js -n ws://localhost:9944 -o results.csv
```

### Step 2: Start senders
```bash
# Terminal 2 - Alice sends to herself
node src/transaction_sender.js -n ws://localhost:9944 -s "//Alice" --rate 5 --auto

# Terminal 3 - Bob sends to Charlie
node src/transaction_sender.js -n ws://localhost:9944 -s "//Bob" -r "//Charlie" --rate 3 --auto

# Terminal 4 - Charlie sends to Alice
node src/transaction_sender.js -n ws://localhost:9944 -s "//Charlie" -r "//Alice" --rate 2 --auto
```

### Step 3: Analyze results
The monitor will show:
- Real TPS in the network
- Number of our vs all transactions
- Block statistics
- Data will be saved to `results.csv`

## 📊 Result Interpretation

### TPS calculation:
```
TPS = (transactions in block) × 10 blocks/sec
```

### Example monitor output:
```
🧱 Block #1234 | Total TX: 8 | Our TX: 5 | TPS: 80 (50 ours)
```

This means:
- 8 transactions got into the block
- 5 of them are our test transactions
- Theoretical maximum: 80 TPS
- Our contribution: 50 TPS

## 🔍 Differences from Original Script

### ❌ Errors in original:
1. **Wrong transaction type**: `system.remark` → `balances.transfer`
2. **Automatic nonce**: led to transaction rejections
3. **Measuring sending speed**: instead of real TPS
4. **One-time execution**: sending batch and terminating

### ✅ Fixes:
1. **Balance transfer** - real money transfers
2. **Manual nonce** - correct handling of multiple transactions
3. **Block reading** - measuring real TPS
4. **Continuous operation** - configurable sending frequency
5. **Block monitoring** - separate program for analysis

## 🛠️ Troubleshooting

### Transactions don't go through:
- Check account balance
- Verify seed phrases are correct
- Check node connection

### Low TPS:
- Try reducing sending frequency
- Run multiple instances with different accounts
- Check node load

### Nonce errors:
- Restart sender (nonce will be recalculated)
- Use different accounts for parallel instances

## 📈 Gradual Load Increase

```bash
# Start with low load
node src/transaction_sender.js -n ws://localhost:9944 -s "//Alice" --rate 1

# In interactive mode, gradually increase:
# 1 → 5 → 10 → 20 → 50...
# Until you find the bottleneck
```
