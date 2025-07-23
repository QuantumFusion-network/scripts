import blessed from 'blessed';
import { NetworkStatusComponent } from './components/network-status.js';
import { TPSMetricsComponent } from './components/tps-metrics.js';
import { ControlPanelComponent } from './components/control-panel.js';
import { ActiveSendersTableComponent } from './components/active-senders-table.js';
import { TPSSimpleGraphComponent } from './components/tps-graph-simple.js';
import { EventLogComponent } from './components/event-log.js';
import { KeyboardHandlerComponent } from './components/keyboard-handler.js';
import { MainLayout } from './layouts/main-layout.js';

/**
 * Simple test script for TUI components
 */
async function testComponents() {
  console.log('🧪 Testing TUI Components...');
  
  // Create blessed screen
  const screen = blessed.screen({
    smartCSR: true,
    title: 'TUI Components Test',
    terminal: 'xterm-256color'
  });

  // Create layout
  const layout = new MainLayout();
  layout.initialize(screen);

  // Create components
  const networkStatus = new NetworkStatusComponent();
  const tpsMetrics = new TPSMetricsComponent();
  const controlPanel = new ControlPanelComponent({
    onStartTest: () => console.log('🚀 Test started!'),
    onStopTest: () => console.log('🛑 Test stopped!'),
    onExportReport: () => console.log('📄 Report exported!')
  });
  const activeSenders = new ActiveSendersTableComponent();
  const tpsGraph = new TPSSimpleGraphComponent();
  const eventLog = new EventLogComponent();
  const keyboardHandler = new KeyboardHandlerComponent();

  // Create widgets
  networkStatus.createWidget(screen, layout);
  tpsMetrics.createWidget(screen, layout);
  controlPanel.createWidget(screen, layout);
  activeSenders.createWidget(screen, layout);
  tpsGraph.createWidget(screen, layout);
  eventLog.createWidget(screen, layout);

  // Initialize keyboard handler
  keyboardHandler.initialize(screen, {
    networkStatus,
    tpsMetrics,
    controlPanel,
    activeSenders,
    tpsGraph,
    eventLog
  });

  // Test network status updates
  networkStatus.setConnectionStatus(true, 'ws://localhost:9944');
  networkStatus.setBlockInfo(12345, 6000);

  // Test TPS metrics updates
  tpsMetrics.setCurrentTPS(287.5);
  tpsMetrics.setPeakTPS(312.0);
  tpsMetrics.setAverageTPS(245.2);

  // Start periodic updates
  networkStatus.startUpdates(2000);
  tpsMetrics.startUpdates(1000);

  // Test control panel functionality
  setTimeout(() => {
    controlPanel.setTestRunning(true);
    console.log('✅ Control panel: Test running state set');
  }, 3000);

  setTimeout(() => {
    controlPanel.enableExport();
    console.log('✅ Control panel: Export enabled');
  }, 5000);

  // Test active senders table
  setTimeout(() => {
    activeSenders.setTestData();
    console.log('✅ Active senders: Test data loaded');
  }, 2000);

  setTimeout(() => {
    activeSenders.startUpdates(3000);
    console.log('✅ Active senders: Dynamic updates started');
  }, 4000);

  // Test TPS graph
  setTimeout(() => {
    tpsGraph.setTestData();
    console.log('✅ TPS graph: Test data loaded');
  }, 1000);

  setTimeout(() => {
    tpsGraph.startUpdates(5000);
    console.log('✅ TPS graph: Real-time updates started');
  }, 3000);

  // Test event log
  setTimeout(() => {
    eventLog.setTestData();
    console.log('✅ Event log: Test data loaded');
  }, 2000);

  setTimeout(() => {
    eventLog.startSimulation(4000);
    console.log('✅ Event log: Simulation started');
  }, 6000);

  // Handle exit (keyboard handler will handle 'q' key)
  screen.key(['escape', 'C-c'], function(ch, key) {
    console.log('👋 Exiting test...');
    networkStatus.destroy();
    tpsMetrics.destroy();
    controlPanel.destroy();
    activeSenders.destroy();
    tpsGraph.destroy();
    eventLog.destroy();
    keyboardHandler.destroy();
    process.exit(0);
  });

  // Show instructions
  console.log('📋 Test running... Press q, ESC, or Ctrl+C to exit');
  console.log('🔄 Components will update automatically');
  
  // Render screen
  screen.render();
}

// Run test if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testComponents().catch(console.error);
}

export { testComponents };