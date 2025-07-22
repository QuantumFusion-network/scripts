import { senderLogger } from '../shared/logger.js'

// Controls the rate of transaction sending
export class RateController {
  constructor() {
    this.rate = 1 // tx/sec
    this.intervalId = null
    this.isRunning = false
    this.sendCallback = null
    this.logger = senderLogger.child('RATE-CTRL')
  }

  // Set the sending rate
  setRate(rate) {
    if (rate <= 0) {
      throw new Error('Rate must be positive')
    }
    
    const oldRate = this.rate
    this.rate = rate
    
    this.logger.info('Rate changed', { 
      oldRate, 
      newRate: this.rate,
      isRunning: this.isRunning 
    })
    
    // If currently running, restart with new rate
    if (this.isRunning && this.sendCallback) {
      this.restart()
    }
    
    return this.rate
  }

  // Get current rate
  getRate() {
    return this.rate
  }

  // Get interval in milliseconds
  getInterval() {
    return 1000 / this.rate
  }

  // Start sending at specified rate
  start(sendCallback) {
    if (this.isRunning) {
      console.log('⚠️ [RATE] Already running!')
      return false
    }
    
    if (!sendCallback || typeof sendCallback !== 'function') {
      throw new Error('Send callback function required')
    }
    
    this.sendCallback = sendCallback
    this.isRunning = true
    
    const interval = this.getInterval()
    this.logger.info('Rate controller started', {
      rate: this.rate,
      intervalMs: interval
    })
    
    this.intervalId = setInterval(() => {
      if (this.sendCallback) {
        this.sendCallback()
      }
    }, interval)
    
    return true
  }

  // Stop sending
  stop() {
    if (!this.isRunning) {
      console.log('⚠️ [RATE] Not running')
      return false
    }
    
    this.isRunning = false
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
    
    console.log('🛑 [RATE] Sending stopped')
    return true
  }

  // Restart with current rate (useful when rate changes)
  restart() {
    if (this.isRunning && this.sendCallback) {
      this.logger.info('Restarting with new rate', { newRate: this.rate })
      this.stop()
      this.start(this.sendCallback)
    }
  }

  // Check if currently running
  isActive() {
    return this.isRunning
  }

  // Get status info
  getStatus() {
    return {
      rate: this.rate,
      interval: this.getInterval(),
      isRunning: this.isRunning
    }
  }
} 