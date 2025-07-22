import readline from 'readline'

// Handles interactive command line interface
export class CLIInterface {
  constructor(transactionSender) {
    this.sender = transactionSender
    this.rl = null
  }

  // Start interactive mode
  start() {
    console.log('\n🎮 Interactive mode started!')
    console.log('Available commands:')
    console.log('  start - start sending')
    console.log('  stop - stop sending')
    console.log('  stats - show statistics')
    console.log('  <number> - change frequency (e.g., 5 for 5 tx/sec)')
    console.log('  exit - quit')
    console.log('')
    
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: 'TPS> '
    })
    
    this.rl.prompt()
    
    this.rl.on('line', (input) => {
      this.handleCommand(input.trim().toLowerCase())
      this.rl.prompt()
    })
    
    // Handle Ctrl+C
    this.rl.on('SIGINT', () => {
      this.handleExit()
    })
  }

  // Handle user commands
  handleCommand(command) {
    try {
      if (command === 'start') {
        this.sender.start()
      } else if (command === 'stop') {
        this.sender.stop()
      } else if (command === 'stats') {
        this.sender.showStats()
      } else if (command === 'exit' || command === 'quit') {
        this.handleExit()
      } else if (!isNaN(command) && Number(command) > 0) {
        const newRate = Number(command)
        this.sender.changeRate(newRate)
      } else if (command === '') {
        // Empty command, just prompt again
        return
      } else {
        console.log('❌ Unknown command. Available: start, stop, stats, <number>, exit')
      }
    } catch (error) {
      console.error(`❌ Command error: ${error.message}`)
    }
  }

  // Handle exit
  handleExit() {
    console.log('\n🛑 Shutting down...')
    this.sender.stop()
    console.log('👋 Goodbye!')
    
    if (this.rl) {
      this.rl.close()
    }
    
    process.exit(0)
  }

  // Stop CLI interface
  stop() {
    if (this.rl) {
      this.rl.close()
      this.rl = null
    }
  }
} 