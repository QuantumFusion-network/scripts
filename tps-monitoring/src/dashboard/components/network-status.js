import blessed from 'blessed';
import { BaseComponent } from './base-component.js';

/**
 * Network Status Component
 * Displays network connection status, current block, and block time
 */
export class NetworkStatusComponent extends BaseComponent {
  constructor(options = {}) {
    super({ name: 'NetworkStatus', ...options });
    
    this.data = {
      isConnected: false,
      blockNumber: 0,
      blockTime: 0,
      nodeUrl: '',
      lastUpdate: null
    };
  }

  /**
   * Create blessed widget for network status
   */
  createWidget(screen, layout) {
    this.widget = blessed.box({
      parent: screen,
      top: 0,
      left: 0,
      width: '25%',
      height: '15%',
      border: { type: 'line', fg: 'blue' },
      title: ' Network Status ',
      tags: true,
      content: this.formatContent(),
      style: {
        border: { fg: 'blue' },
        title: { fg: 'white', bold: true }
      }
    });

    return this.widget;
  }

  /**
   * Update component with new data
   */
  update(data) {
    this.data = { ...this.data, ...data };
    this.data.lastUpdate = new Date();
    
    if (this.widget) {
      this.widget.setContent(this.formatContent());
      this.widget.screen.render();
    }
  }

  /**
   * Format content for display
   */
  formatContent() {
    const { isConnected, blockNumber, blockTime, nodeUrl } = this.data;
    
    const statusIcon = isConnected ? '{green-fg}✅{/green-fg}' : '{red-fg}❌{/red-fg}';
    const statusText = isConnected ? 'Connected' : 'Disconnected';
    const blockTimeFormatted = blockTime > 0 ? `${(blockTime / 1000).toFixed(1)}s` : 'N/A';
    
    return [
      `{bold}Node:{/bold} ${statusIcon} ${statusText}`,
      `{bold}Block:{/bold} #${blockNumber.toLocaleString()}`,
      `{bold}Time:{/bold} ${blockTimeFormatted}`,
      `{bold}URL:{/bold} ${nodeUrl || 'Not set'}`
    ].join('\n');
  }

  /**
   * Set connection status
   */
  setConnectionStatus(isConnected, nodeUrl = '') {
    this.update({
      isConnected,
      nodeUrl: nodeUrl || this.data.nodeUrl
    });
  }

  /**
   * Set block information
   */
  setBlockInfo(blockNumber, blockTime) {
    this.update({
      blockNumber: blockNumber || this.data.blockNumber,
      blockTime: blockTime || this.data.blockTime
    });
  }

  /**
   * Get current data
   */
  getData() {
    return { ...this.data };
  }

  /**
   * Periodic update hook
   */
  periodicUpdate() {
    // Update timestamp for "last seen" functionality
    if (this.data.lastUpdate) {
      const now = new Date();
      const timeSinceUpdate = now - this.data.lastUpdate;
      
      // If no updates for more than 30 seconds, mark as stale
      if (timeSinceUpdate > 30000 && this.data.isConnected) {
        this.update({
          isConnected: false,
          nodeUrl: this.data.nodeUrl + ' (stale)'
        });
      }
    }
  }
} 