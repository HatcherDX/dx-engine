/**
 * PTY Manager - Main Process Interface
 * Manages communication with PTY Host Process
 * VSCode-style architecture with process isolation
 */

import { ChildProcess, fork } from 'node:child_process'
import { EventEmitter } from 'node:events'
import { join } from 'node:path'
import { v4 as uuidv4 } from 'uuid'
import { terminalPerformanceMonitor } from './terminalPerformanceMonitor'

interface PtyCreateOptions {
  shell?: string
  cwd?: string
  env?: Record<string, string>
  cols?: number
  rows?: number
}

interface PtyTerminalInfo {
  id: string
  shell: string
  cwd: string
  pid: number
  strategy?: string
  backend?: string
  capabilities?: {
    backend: string
    supportsResize: boolean
    supportsColors: boolean
    supportsInteractivity: boolean
    supportsHistory: boolean
    reliability: 'high' | 'medium' | 'low'
  }
}

interface PtyHostMessage {
  type: 'created' | 'data' | 'exit' | 'error' | 'list' | 'killed'
  id?: string
  requestId?: string
  data?: unknown
  error?: string
  terminals?: PtyTerminalInfo[]
  [key: string]: unknown // Allow additional properties
}

interface PtyHostOutgoingMessage {
  type: 'create' | 'write' | 'resize' | 'kill' | 'list'
  id?: string
  options?: PtyCreateOptions
  data?: string
  cols?: number
  rows?: number
}

// Create a proxy class to represent remote terminals for monitoring
export class RemoteTerminalProxy {
  constructor(
    public id: string,
    public pid: number,
    public strategy: string,
    private manager: PtyManager
  ) {}

  get isRunning(): boolean {
    return true // We assume PTY host terminals are running unless explicitly told otherwise
  }
}

interface PendingRequest<T = unknown> {
  resolve: (value: T) => void
  reject: (reason?: unknown) => void
}

export class PtyManager extends EventEmitter {
  private ptyHost: ChildProcess | null = null
  private pendingRequests = new Map<string, PendingRequest<unknown>>()
  private isInitialized = false
  private terminals = new Map<string, RemoteTerminalProxy>()

  constructor() {
    super()
    this.initializePtyHost()
  }

  private async initializePtyHost(): Promise<void> {
    try {
      const ptyHostPath = join(__dirname, 'ptyHost.cjs') // Compiled version

      // Fork PTY Host with ELECTRON_RUN_AS_NODE
      this.ptyHost = fork(ptyHostPath, [], {
        env: {
          ...process.env,
          ELECTRON_RUN_AS_NODE: '1',
        },
        silent: false,
      })

      this.setupPtyHostHandlers()
      this.isInitialized = true

      console.log(
        `[PTY Manager] PTY Host started with PID: ${this.ptyHost?.pid || 'unknown'}`
      )
      this.emit('ready')
    } catch (error) {
      console.error('[PTY Manager] Failed to start PTY Host:', error)
      this.emit('error', error)
    }
  }

  private setupPtyHostHandlers(): void {
    if (!this.ptyHost) return

    this.ptyHost.on('message', (message: PtyHostMessage) => {
      this.handlePtyHostMessage(message)
    })

    this.ptyHost.on('error', (error: Error) => {
      console.error('[PTY Manager] PTY Host error:', error)
      this.emit('error', error)
    })

    this.ptyHost.on('exit', (code: number, signal: string) => {
      console.log(
        `[PTY Manager] PTY Host exited with code ${code}, signal ${signal}`
      )
      this.ptyHost = null
      this.isInitialized = false

      // Restart PTY Host if it crashed unexpectedly
      if (code !== 0) {
        setTimeout(() => this.initializePtyHost(), 1000)
      }
    })

    this.ptyHost.on('disconnect', () => {
      this.ptyHost = null
      this.isInitialized = false
    })
  }

  private handlePtyHostMessage(message: PtyHostMessage): void {
    switch (message.type) {
      case 'created':
        this.handleTerminalCreated(message)
        break
      case 'data':
        this.emit('terminal-data', message.id, message.data)
        break
      case 'exit':
        // Clean up monitoring when terminal exits
        if (message.id) {
          terminalPerformanceMonitor.unregisterTerminal(message.id)
          this.terminals.delete(message.id)
          this.emit(
            'terminal-exit',
            message.id,
            message.exitCode,
            message.signal
          )
        }
        break
      case 'killed':
        // Clean up monitoring when terminal is killed
        if (message.id) {
          terminalPerformanceMonitor.unregisterTerminal(message.id)
          this.terminals.delete(message.id)
          this.emit('terminal-killed', message.id)
        }
        break
      case 'list':
        this.handleTerminalList(message)
        break
      case 'error':
        this.handleError(message)
        break
      default:
        console.warn(
          '[PTY Manager] Unknown message type from PTY Host:',
          message.type
        )
    }
  }

  private handleTerminalCreated(message: PtyHostMessage): void {
    if (!message.id) {
      console.error('[PTY Manager] Terminal created message missing id')
      return
    }

    const request = this.pendingRequests.get(message.id)
    if (request) {
      // Create terminal proxy for monitoring
      const terminalProxy = new RemoteTerminalProxy(
        message.id,
        (message.pid as number) || 0,
        (message.strategy as string) || 'hybrid',
        this
      )

      // Store terminal proxy
      this.terminals.set(message.id, terminalProxy)

      // Register with performance monitor
      terminalPerformanceMonitor.registerTerminal(
        message.id,
        terminalProxy as unknown as Parameters<
          typeof terminalPerformanceMonitor.registerTerminal
        >[1],
        (message.strategy as string) || 'hybrid'
      )

      request.resolve({
        id: message.id,
        shell: (message.shell as string) || '',
        cwd: (message.cwd as string) || '',
        pid: (message.pid as number) || 0,
        strategy: message.strategy as string,
        backend: message.backend as string,
        capabilities: message.capabilities as PtyTerminalInfo['capabilities'],
      })
      this.pendingRequests.delete(message.id)
    }
  }

  private handleTerminalList(message: PtyHostMessage): void {
    if (!message.requestId) {
      console.error('[PTY Manager] Terminal list message missing requestId')
      return
    }

    const request = this.pendingRequests.get(message.requestId)
    if (request) {
      request.resolve(message.terminals || [])
      this.pendingRequests.delete(message.requestId)
    }
  }

  private handleError(message: PtyHostMessage): void {
    if (!message.id) {
      console.error('[PTY Manager] Error message missing id:', message.error)
      return
    }

    const request = this.pendingRequests.get(message.id)
    if (request) {
      request.reject(new Error(message.error || 'Unknown error'))
      this.pendingRequests.delete(message.id)
    } else {
      console.error(
        '[PTY Manager] Unhandled error from PTY Host:',
        message.error
      )
    }
  }

  private sendMessageToPtyHost(message: PtyHostOutgoingMessage): void {
    if (!this.ptyHost || !this.isInitialized) {
      throw new Error('PTY Host not initialized')
    }

    this.ptyHost.send(message)
  }

  async createTerminal(
    options: PtyCreateOptions = {}
  ): Promise<PtyTerminalInfo> {
    const id = uuidv4()

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, {
        resolve: resolve as (value: unknown) => void,
        reject,
      })

      try {
        this.sendMessageToPtyHost({
          type: 'create',
          id,
          options,
        })
      } catch (error) {
        this.pendingRequests.delete(id)
        reject(error)
      }
    })
  }

  writeToTerminal(id: string, data: string): void {
    try {
      this.sendMessageToPtyHost({
        type: 'write',
        id,
        data,
      })
    } catch (error) {
      console.error(`[PTY Manager] Failed to write to terminal ${id}:`, error)
    }
  }

  resizeTerminal(id: string, cols: number, rows: number): void {
    try {
      this.sendMessageToPtyHost({
        type: 'resize',
        id,
        cols,
        rows,
      })
    } catch (error) {
      console.error(`[PTY Manager] Failed to resize terminal ${id}:`, error)
    }
  }

  killTerminal(id: string): void {
    try {
      // Unregister from performance monitor
      terminalPerformanceMonitor.unregisterTerminal(id)

      // Remove from local registry
      this.terminals.delete(id)

      this.sendMessageToPtyHost({
        type: 'kill',
        id,
      })
    } catch (error) {
      console.error(`[PTY Manager] Failed to kill terminal ${id}:`, error)
    }
  }

  async listTerminals(): Promise<PtyTerminalInfo[]> {
    const requestId = uuidv4()

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(requestId, {
        resolve: resolve as (value: unknown) => void,
        reject,
      })

      try {
        this.sendMessageToPtyHost({
          type: 'list',
          id: requestId,
        })
      } catch (error) {
        this.pendingRequests.delete(requestId)
        reject(error)
      }
    })
  }

  /**
   * Get performance metrics for all terminals
   */
  getPerformanceMetrics() {
    return terminalPerformanceMonitor.getGlobalStats()
  }

  /**
   * Get performance metrics for a specific terminal
   */
  getTerminalPerformanceMetrics(terminalId: string, limit?: number) {
    return terminalPerformanceMonitor.getTerminalMetrics(terminalId, limit)
  }

  /**
   * Get performance alerts for a specific terminal
   */
  getTerminalAlerts(terminalId: string, limit?: number) {
    return terminalPerformanceMonitor.getTerminalAlerts(terminalId, limit)
  }

  /**
   * Export all performance data
   */
  exportPerformanceData() {
    return terminalPerformanceMonitor.exportData()
  }

  destroy(): void {
    // Clean up all terminals from performance monitor
    for (const terminalId of this.terminals.keys()) {
      terminalPerformanceMonitor.unregisterTerminal(terminalId)
    }
    this.terminals.clear()

    // Clear pending requests
    for (const [, request] of this.pendingRequests) {
      request.reject(new Error('PTY Manager destroyed'))
    }
    this.pendingRequests.clear()

    // Kill PTY Host process
    if (this.ptyHost) {
      this.ptyHost.kill('SIGTERM')
      this.ptyHost = null
    }

    this.isInitialized = false
    this.removeAllListeners()
  }
}
