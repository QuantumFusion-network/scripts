import blessed from 'blessed'
import { NetworkStatusComponent } from './components/network-status.js'
import { TPSMetricsComponent } from './components/tps-metrics.js'
import { ControlPanelComponent } from './components/control-panel.js'
import { ActiveSendersTableComponent } from './components/active-senders-table.js'
import { TPSGraphComponent } from './components/tps-graph.js'
import { EventLogComponent } from './components/event-log.js'
import { KeyboardHandlerComponent } from './components/keyboard-handler.js'
import { MainLayout } from './layouts/main-layout.js'
import { ApiConnector } from '../shared/api-connector.js'
import { LogTPSReader } from './log-tps-reader.js'

class TUIDashboard {
  constructor(options) {
    this.processManager = options.processManager
    this.logAggregator = options.logAggregator
    this.reportGenerator = options.reportGenerator
    this.screen = null
    this.layout = null
    this.widgets = {}
    this.isRunning = false
    this.apiConnector = new ApiConnector()
    this.lastBlockTime = null
    this.updateInterval = null
    this.logTPSReader = null
  }

  async start(options) {
    console.log('🎨 Starting TUI Dashboard...')
    // Phase 6: Full TUI implementation
    await this.initializeFullTUI(options)
  }

  showSimpleStatus(options) {
    console.log('\n' + '='.repeat(60));
    console.log('🖥️  TPS ORCHESTRATOR DASHBOARD (Phase 1)');
    console.log('='.repeat(60));
    console.log(`📡 Node: ${options.node || 'ws://localhost:9944'}`);
    console.log(`📊 Scenario: ${options.scenario || 'light'}`);
    console.log(`⏱️  Duration: ${options.duration || '300'}s`);
    console.log(`📈 Base Rate: ${options.rate || '50'} TPS`);
    console.log(`👥 Senders: ${options.senders || '3'}`);
    console.log('='.repeat(60));
    console.log('📝 Status: Foundation ready - TUI will be implemented in Phase 5');
    console.log('💡 Next: Phase 2 - Code Audit & Migration Safety');
    console.log('='.repeat(60));
    
    // Keep process alive for demonstration
    console.log('\n⌨️  Press Ctrl+C to exit\n');
  }

  async initializeFullTUI(options) {
    this.screen = blessed.screen({
      smartCSR: true,
      title: 'QuantumFusion TPS Stress Test Dashboard',
      terminal: 'xterm-256color',
      fullUnicode: true,
      dockBorders: true,
      debug: false,   // ✅ Disable blessed debug (removes "Focused" noise)
      log: false      // ✅ Disable blessed internal log
    })

    // Create layout
    this.layout = new MainLayout()
    this.layout.initialize(this.screen)

    // Create components
    this.widgets.networkStatus = new NetworkStatusComponent()
    this.widgets.tpsMetrics = new TPSMetricsComponent()
    
    // Create LogTPSReader for real TPS data
    this.logTPSReader = new LogTPSReader({
      updateInterval: 1000,
      onDataUpdate: (tpsData) => {
        // Update TPSMetrics component with real data
        this.widgets.tpsMetrics.setCurrentTPS(tpsData.currentTPS)
        this.widgets.tpsMetrics.setPeakTPS(tpsData.peakTPS) 
        this.widgets.tpsMetrics.setAverageTPS(tpsData.averageTPS)
        this.screen.render()
      }
    })
    this.widgets.controlPanel = new ControlPanelComponent({
      onStartTest: async () => {
        this.widgets.eventLog.addLog('INFO', 'Starting light stress test scenario...', 'Dashboard')
        this.widgets.controlPanel.setTestRunning(true)
        
        try {
          const success = await this.processManager.startTest({
            node: 'ws://localhost:9944'
          })
          if (success) {
            this.widgets.eventLog.addLog('INFO', 'Stress test started successfully', 'Dashboard')
          } else {
            this.widgets.controlPanel.setTestRunning(false)
            this.widgets.eventLog.addLog('ERROR', 'Failed to start stress test', 'Dashboard')
          }
        } catch (error) {
          this.widgets.controlPanel.setTestRunning(false)
          this.widgets.eventLog.addLog('ERROR', `Test start error: ${error.message}`, 'Dashboard')
        }
        this.screen.render()
      },
      onStopTest: async () => {
        this.widgets.eventLog.addLog('INFO', 'Stopping all test processes...', 'Dashboard')
        
        try {
          const stopped = await this.processManager.stopAll()
          this.widgets.controlPanel.setTestRunning(false)
          this.widgets.eventLog.addLog('INFO', `Stopped ${stopped} processes`, 'Dashboard')
        } catch (error) {
          this.widgets.eventLog.addLog('ERROR', `Stop error: ${error.message}`, 'Dashboard')
        }
        this.screen.render()
      },
      onExportReport: () => {
        console.log('📄 Export report (disabled)')
        this.widgets.eventLog.addLog('INFO', 'Export report feature coming soon...', 'Dashboard')
      }
    })
    this.widgets.activeSenders = new ActiveSendersTableComponent()
    this.widgets.tpsGraph = new TPSGraphComponent()
    this.widgets.eventLog = new EventLogComponent()
    this.widgets.keyboardHandler = new KeyboardHandlerComponent()

    // Create widgets
    this.widgets.networkStatus.createWidget(this.screen, this.layout)
    this.widgets.tpsMetrics.createWidget(this.screen, this.layout)
    this.widgets.controlPanel.createWidget(this.screen, this.layout)
    this.widgets.activeSenders.createWidget(this.screen, this.layout)
    this.widgets.tpsGraph.createWidget(this.screen, this.layout)
    this.widgets.eventLog.createWidget(this.screen, this.layout)

    // Initialize KeyboardHandler
    this.widgets.keyboardHandler.initialize(this.screen, {
      networkStatus: this.widgets.networkStatus,
      tpsMetrics: this.widgets.tpsMetrics,
      controlPanel: this.widgets.controlPanel,
      activeSenders: this.widgets.activeSenders,
      tpsGraph: this.widgets.tpsGraph,
      eventLog: this.widgets.eventLog
    })

    // Connect to node and subscribe to new blocks
    await this.connectAndSubscribe(options.node || 'ws://localhost:9944')

    // Set up keyboard handlers for exit
    this.setupKeyboardHandlers()

    // Start periodic updates for all components
    this.startPeriodicUpdates()

    // Render screen
    this.screen.render()
    this.isRunning = true
  }

  setupKeyboardHandlers() {
    // CRITICAL priority for exit - handle BEFORE all components
    process.on('SIGINT', () => {
      console.log('\n🛑 SIGINT received - force exit')
      this.stop()
      process.exit(0)
    })

    // Global keyboard handlers with maximum priority
    this.screen.key(['C-c'], (ch, key) => {
      console.log('\n👋 Ctrl+C pressed - shutting down...')
      this.stop()
      process.exit(0)
    })

    // Duplicate for reliability
    this.screen.key(['escape', 'q'], (ch, key) => {
      console.log('\n👋 Shutting down dashboard...')
      this.stop()
      process.exit(0)
    })

    // Help handler
    this.screen.key(['h'], (ch, key) => {
      this.widgets.eventLog.addLog('INFO', 'Keyboard shortcuts: q=quit, h=help, Tab=navigate, Ctrl+C=force exit', 'Dashboard')
      this.screen.render()
    })

    // Global navigation - exit button focus
    this.screen.key(['escape'], (ch, key) => {
      // Remove focus from buttons on Escape
      this.screen.realloc()
      this.screen.render()
    })
  }

  startPeriodicUpdates() {
    // Start LogTPSReader for reading real TPS data
    if (this.logTPSReader) {
      this.logTPSReader.start()
    }
    
    // Start updates for components (keeps event loop active)
    this.widgets.networkStatus.startUpdates(2000)
    // this.widgets.tpsMetrics.startUpdates(1000) // REMOVED: conflict with LogTPSReader
    this.widgets.eventLog.startUpdates(1500)
    this.widgets.activeSenders.startUpdates(3000)
    this.widgets.tpsGraph.startUpdates(5000)

    // УДАЛЕНО: общий update loop для render
    // this.updateInterval = setInterval(() => {
    //   if (this.isRunning) {
    //     this.screen.render()
    //   }
    // }, 500)
  }

  async connectAndSubscribe(nodeUrl) {
    // Intercept console.log during API initialization
    const originalConsoleLog = console.log
    const originalConsoleWarn = console.warn
    const originalConsoleError = console.error
    
    // Temporarily redirect console output to EventLog
    console.log = (...args) => {
      const message = args.join(' ')
      if (message.includes('API/INIT') || message.includes('chainHead_') || message.includes('chainSpec_')) {
        this.widgets.eventLog.addLog('DEBUG', message, 'API')
      } else {
        originalConsoleLog(...args)
      }
    }
    
    console.warn = (...args) => {
      const message = args.join(' ')
      this.widgets.eventLog.addLog('WARN', message, 'API')
    }
    
    console.error = (...args) => {
      const message = args.join(' ')  
      this.widgets.eventLog.addLog('ERROR', message, 'API')
    }
    
    try {
      await this.apiConnector.connect(nodeUrl)
      
      // Restore original console methods
      console.log = originalConsoleLog
      console.warn = originalConsoleWarn  
      console.error = originalConsoleError
      
      this.widgets.networkStatus.setConnectionStatus(true, nodeUrl)
      this.widgets.eventLog.addLog('INFO', `Connected to node: ${nodeUrl}`, 'Network')
      
      await this.apiConnector.subscribeNewHeads(async (header) => {
        const blockNumber = header.number.toNumber()
        const now = Date.now()
        let blockTime = 0
        if (this.lastBlockTime) {
          blockTime = now - this.lastBlockTime
        }
        this.lastBlockTime = now
        this.widgets.networkStatus.setBlockInfo(blockNumber, blockTime)
        this.widgets.eventLog.addLog('INFO', `Block #${blockNumber} processed`, 'Monitor')
        this.screen.render()
      })
    } catch (e) {
      // Restore console methods in case of error
      console.log = originalConsoleLog
      console.warn = originalConsoleWarn
      console.error = originalConsoleError
      
      this.widgets.networkStatus.setConnectionStatus(false, nodeUrl)
      this.widgets.eventLog.addLog('ERROR', `Connection failed: ${e.message}`, 'Network')
      this.screen.render()
    }
  }

  async stop() {
    console.log('🎨 Stopping TUI Dashboard...')
    this.isRunning = false
    
    // Stop LogTPSReader
    if (this.logTPSReader) {
      this.logTPSReader.stop()
    }
    
    // Stop all updates
    if (this.updateInterval) {
      clearInterval(this.updateInterval)
    }
    
    // Stop components
    Object.values(this.widgets).forEach(widget => {
      if (widget.destroy) {
        widget.destroy()
      }
    })
    
    // Disconnect from API
    if (this.apiConnector) {
      this.apiConnector.disconnect()
    }
    
    if (this.screen) {
      this.screen.destroy()
    }
  }
}

export default TUIDashboard 