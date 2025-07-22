import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ProcessManager {
  constructor() {
    this.processes = new Map();
    this.eventHandlers = new Map();
  }

  async initialize() {
    console.log('⚙️ Initializing Process Manager...');
  }

  async startMonitor(options = {}) {
    const processId = 'monitor';
    
    if (this.processes.has(processId)) {
      throw new Error(`Monitor process already running`);
    }

    const args = [
      path.join(__dirname, '../tps_monitor.js'),
      '--node', options.node || 'ws://localhost:9944',
      '--output', path.join(__dirname, '../logs/monitor.log')
    ];

    if (options.addresses) {
      args.push('--addresses', options.addresses);
    }

    const child = spawn('node', args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: path.join(__dirname, '..')
    });

    this.processes.set(processId, {
      process: child,
      type: 'monitor',
      status: 'starting',
      startTime: Date.now(),
      stats: {
        uptime: 0,
        restarts: 0
      }
    });

    this.setupProcessHandlers(processId, child);
    
    return processId;
  }

  async startSender(senderName, options = {}) {
    const processId = `sender-${senderName.toLowerCase()}`;
    
    if (this.processes.has(processId)) {
      throw new Error(`Sender ${senderName} already running`);
    }

    const args = [
      path.join(__dirname, '../transaction_sender.js'),
      '--node', options.node || 'ws://localhost:9944',
      '--sender', senderName,
      '--recipient', options.recipient || 'Bob',
      '--rate', options.rate || '50'
    ];

    if (options.duration) {
      args.push('--duration', options.duration);
    }

    const child = spawn('node', args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: path.join(__dirname, '..')
    });

    this.processes.set(processId, {
      process: child,
      type: 'sender',
      senderName,
      status: 'starting',
      startTime: Date.now(),
      stats: {
        uptime: 0,
        restarts: 0,
        rate: options.rate || 50,
        sent: 0,
        success: 0,
        errors: 0
      }
    });

    this.setupProcessHandlers(processId, child);
    
    return processId;
  }

  setupProcessHandlers(processId, child) {
    const processInfo = this.processes.get(processId);

    child.on('spawn', () => {
      processInfo.status = 'running';
      this.emit('processStarted', { processId, ...processInfo });
    });

    child.on('exit', (code, signal) => {
      processInfo.status = code === 0 ? 'completed' : 'failed';
      processInfo.exitCode = code;
      processInfo.signal = signal;
      this.emit('processExited', { processId, code, signal, ...processInfo });
      
      // Remove from active processes
      this.processes.delete(processId);
    });

    child.on('error', (error) => {
      processInfo.status = 'error';
      processInfo.error = error.message;
      this.emit('processError', { processId, error: error.message, ...processInfo });
    });

    // Capture stdout and stderr
    child.stdout.on('data', (data) => {
      this.emit('processOutput', { 
        processId, 
        type: 'stdout', 
        data: data.toString(),
        ...processInfo 
      });
    });

    child.stderr.on('data', (data) => {
      this.emit('processOutput', { 
        processId, 
        type: 'stderr', 
        data: data.toString(),
        ...processInfo 
      });
    });
  }

  async stopProcess(processId) {
    const processInfo = this.processes.get(processId);
    if (!processInfo) {
      return false;
    }

    const { process: child } = processInfo;
    
    // Graceful shutdown
    child.kill('SIGTERM');
    
    // Force kill after timeout
    setTimeout(() => {
      if (!child.killed) {
        child.kill('SIGKILL');
      }
    }, 5000);

    return true;
  }

  async stopAll() {
    console.log('🛑 Stopping all processes...');
    
    const stopPromises = Array.from(this.processes.keys()).map(
      processId => this.stopProcess(processId)
    );
    
    await Promise.all(stopPromises);
    
    // Wait for all processes to exit
    while (this.processes.size > 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  getProcessInfo(processId) {
    const processInfo = this.processes.get(processId);
    if (!processInfo) return null;

    return {
      ...processInfo,
      uptime: Date.now() - processInfo.startTime
    };
  }

  getAllProcesses() {
    const result = {};
    for (const [processId, processInfo] of this.processes.entries()) {
      result[processId] = {
        ...processInfo,
        uptime: Date.now() - processInfo.startTime
      };
    }
    return result;
  }

  // Event emitter functionality
  on(event, handler) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event).push(handler);
  }

  emit(event, data) {
    const handlers = this.eventHandlers.get(event) || [];
    handlers.forEach(handler => {
      try {
        handler(data);
      } catch (error) {
        console.error(`Error in event handler for ${event}:`, error);
      }
    });
  }
}

export default ProcessManager; 