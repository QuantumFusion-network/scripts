import blessed from 'blessed';
import { BaseComponent } from './base-component.js';

/**
 * Active Senders Table Component
 * Displays table of active transaction senders with their status and metrics
 */
export class ActiveSendersTableComponent extends BaseComponent {
  constructor(options = {}) {
    super({ name: 'ActiveSendersTable', ...options });
    
    this.data = {
      senders: [],
      columns: ['Account', 'Target', 'Rate', 'Success', 'Nonce', 'Status'],
      maxRows: 10
    };
  }

  /**
   * Create blessed widget for active senders table
   */
  createWidget(screen, layout) {
    this.widget = blessed.box({
      parent: screen,
      top: '15%',
      left: 0,
      width: '100%',
      height: '20%',
      border: { type: 'line', fg: 'green' },
      title: ' Active Senders ',
      tags: true,
      content: this.formatTable(),
      style: {
        border: { fg: 'green' },
        title: { fg: 'white', bold: true }
      }
    });

    return this.widget;
  }

  /**
   * Format table content with headers and data
   */
  formatTable() {
    const { columns, senders } = this.data;
    
    // Create header row
    let content = `{center}${this.formatRow(columns)}{/center}\n`;
    content += `${'─'.repeat(80)}\n`;
    
    // Add sender rows
    if (senders.length === 0) {
      content += `{center}{yellow-fg}No active senders{/yellow-fg}{/center}\n`;
    } else {
      senders.forEach(sender => {
        content += this.formatSenderRow(sender) + '\n';
      });
    }
    
    return content;
  }

  /**
   * Format a header row
   */
  formatRow(cells) {
    return cells.map(cell => cell.padEnd(12)).join('│ ');
  }

  /**
   * Format a sender data row
   */
  formatSenderRow(sender) {
    const statusColor = this.getStatusColor(sender.status);
    const successColor = this.getSuccessColor(sender.successRate);
    
    return [
      sender.account.padEnd(12),
      sender.target.padEnd(12),
      `${sender.rate} TPS`.padEnd(12),
      `${successColor}${sender.successRate}%{/}`.padEnd(12),
      `#${sender.nonce}`.padEnd(12),
      `${statusColor}${sender.status}{/}`.padEnd(12)
    ].join('│ ');
  }

  /**
   * Get color for status indicator
   */
  getStatusColor(status) {
    switch (status.toLowerCase()) {
      case 'running':
        return '{green-fg}✅ ';
      case 'stopped':
        return '{red-fg}❌ ';
      case 'connecting':
        return '{yellow-fg}⏳ ';
      case 'error':
        return '{red-fg}⚠️ ';
      default:
        return '{white-fg}';
    }
  }

  /**
   * Get color for success rate
   */
  getSuccessColor(rate) {
    if (rate >= 95) return '{green-fg}';
    if (rate >= 80) return '{yellow-fg}';
    return '{red-fg}';
  }

  /**
   * Update senders data
   */
  updateSenders(senders) {
    this.data.senders = senders.slice(0, this.data.maxRows);
    this.updateContent();
  }

  /**
   * Add a single sender
   */
  addSender(sender) {
    this.data.senders.push(sender);
    if (this.data.senders.length > this.data.maxRows) {
      this.data.senders.shift();
    }
    this.updateContent();
  }

  /**
   * Remove a sender by account name
   */
  removeSender(accountName) {
    this.data.senders = this.data.senders.filter(s => s.account !== accountName);
    this.updateContent();
  }

  /**
   * Update sender status
   */
  updateSenderStatus(accountName, status) {
    const sender = this.data.senders.find(s => s.account === accountName);
    if (sender) {
      sender.status = status;
      this.updateContent();
    }
  }

  /**
   * Update sender metrics
   */
  updateSenderMetrics(accountName, metrics) {
    const sender = this.data.senders.find(s => s.account === accountName);
    if (sender) {
      Object.assign(sender, metrics);
      this.updateContent();
    }
  }

  /**
   * Update widget content
   */
  updateContent() {
    if (this.widget) {
      this.widget.setContent(this.formatTable());
      this.widget.screen.render();
    }
  }

  /**
   * Set test data for demonstration
   */
  setTestData() {
    const testSenders = [
      {
        account: 'Alice',
        target: 'Bob',
        rate: 100,
        successRate: 98.5,
        nonce: 1247,
        status: 'Running'
      },
      {
        account: 'Bob',
        target: 'Charlie',
        rate: 95,
        successRate: 97.2,
        nonce: 1138,
        status: 'Running'
      },
      {
        account: 'Charlie',
        target: 'Dave',
        rate: 87,
        successRate: 89.1,
        nonce: 1029,
        status: 'Error'
      },
      {
        account: 'Dave',
        target: 'Alice',
        rate: 0,
        successRate: 0.0,
        nonce: 0,
        status: 'Stopped'
      }
    ];
    
    this.updateSenders(testSenders);
  }

  /**
   * Start periodic updates
   */
  startUpdates(interval = 2000) {
    this.updateInterval = setInterval(() => {
      // Simulate dynamic updates
      if (this.data.senders.length > 0) {
        this.data.senders.forEach(sender => {
          if (sender.status === 'Running') {
            sender.nonce += Math.floor(Math.random() * 3) + 1;
            sender.successRate = Math.max(85, Math.min(100, sender.successRate + (Math.random() - 0.5) * 2));
          }
        });
        this.updateContent();
      }
    }, interval);
  }

  /**
   * Clean up component
   */
  destroy() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    
    if (this.widget) {
      this.widget.destroy();
    }
  }
} 