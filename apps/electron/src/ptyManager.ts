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
  private isDestroyed = false
  private terminals = new Map<string, RemoteTerminalProxy>()

  constructor() {
    super()
    this.initializePtyHost().catch((error) => {
      console.error('[PTY Manager] Initialization failed:', error)
      this.emit('error', error)
    })
  }

  private async initializePtyHost(): Promise<void> {
    try {
      // Look for ptyHost.cjs in multiple locations
      const possiblePaths = [
        join(__dirname, '..', 'dist-vite', 'ptyHost.cjs'), // Production build location
        join(__dirname, 'ptyHost.cjs'), // Same directory
        join(__dirname, '..', 'src', 'ptyHost.cjs'), // Source directory
      ]

      const fs = require('fs')
      let ptyHostPath = ''

      for (const path of possiblePaths) {
        if (fs.existsSync(path)) {
          ptyHostPath = path
          break
        }
      }

      if (!ptyHostPath) {
        console.error(
          `[PTY Manager] PTY Host file not found in any of: ${possiblePaths.join(', ')}`
        )
        // In test environments, don't throw - just emit error and return
        if (process.env.NODE_ENV === 'test' || process.env.VITEST === 'true') {
          this.emit(
            'error',
            new Error('PTY Host not available in test environment')
          )
          return
        }
        throw new Error(
          `PTY Host file not found in any of: ${possiblePaths.join(', ')}`
        )
      }

      console.log(
        '[PTY Manager] Attempting to start PTY Host from:',
        ptyHostPath
      )
      console.log('[PTY Manager] Current __dirname:', __dirname)
      console.log('[PTY Manager] Process type:', process.type)
      console.log(
        '[PTY Manager] ELECTRON_RUN_AS_NODE:',
        process.env.ELECTRON_RUN_AS_NODE
      )

      // Fork PTY Host - CRITICAL: Run as Node.js, not Electron
      // FIXED: Ensure ELECTRON_RUN_AS_NODE is set to prevent PTY Host from exiting
      const ptyHostEnv = {
        ...process.env,
        ELECTRON_RUN_AS_NODE: '1', // CRITICAL: Force to run as Node.js
        NODE_ENV: process.env.NODE_ENV || 'development',
      }

      console.log('[PTY Manager] Fork environment prepared:', {
        ELECTRON_RUN_AS_NODE: ptyHostEnv.ELECTRON_RUN_AS_NODE,
        NODE_ENV: ptyHostEnv.NODE_ENV,
      })

      this.ptyHost = fork(ptyHostPath, [], {
        env: ptyHostEnv,
        silent: false,
        stdio: ['ignore', 'pipe', 'pipe', 'ipc'], // Ignore stdin to prevent premature exit
      })

      if (!this.ptyHost || !this.ptyHost.pid) {
        throw new Error('Failed to spawn PTY Host process')
      }

      this.setupPtyHostHandlers()
      this.isInitialized = true

      console.log(
        `[PTY Manager] PTY Host started successfully with PID: ${this.ptyHost.pid}`
      )
      this.emit('ready')
    } catch (error) {
      console.error('[PTY Manager] Failed to start PTY Host:', error)
      this.emit('error', error)
    }
  }

  private setupPtyHostHandlers(): void {
    if (!this.ptyHost) return

    console.log('[PTY Manager] Setting up PTY Host event handlers...')

    this.ptyHost.on('message', (message: PtyHostMessage) => {
      console.log('[PTY Manager] Received message from PTY Host:', {
        type: message.type,
        id: message.id,
      })
      this.handlePtyHostMessage(message)
    })

    this.ptyHost.on('error', (error: Error) => {
      // Handle EPIPE errors gracefully - they occur when child process exits
      if (error.code === 'EPIPE') {
        console.log('[PTY Manager] PTY Host disconnected (EPIPE)')
        return
      }
      console.error('[PTY Manager] PTY Host error:', error)
      this.emit('error', error)
    })

    this.ptyHost.on('exit', (code: number, signal: string) => {
      console.log(
        `[PTY Manager] PTY Host exited with code ${code}, signal ${signal}`
      )
      this.ptyHost = null
      this.isInitialized = false

      // Restart PTY Host if it crashed unexpectedly (unless destroyed)
      if (!this.isDestroyed && code !== 0 && code !== null) {
        console.log(
          '[PTY Manager] Restarting PTY Host after unexpected exit...'
        )
        setTimeout(() => this.initializePtyHost(), 1000)
      }
    })

    this.ptyHost.on('disconnect', () => {
      console.log('[PTY Manager] PTY Host disconnected')
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
        console.log('[PTY Manager] Data message received from PTY Host:', {
          id: message.id,
          dataLength: (message.data as string)?.length,
          first50: (message.data as string)?.substring(0, 50),
        })
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

    try {
      this.ptyHost.send(message)
    } catch (error) {
      // Handle EPIPE and other IPC errors gracefully
      if (error instanceof Error && error.code === 'EPIPE') {
        console.log('[PTY Manager] Cannot send message - PTY Host disconnected')
        this.ptyHost = null
        this.isInitialized = false
        throw new Error('PTY Host disconnected')
      }
      throw error
    }
  }

  async createTerminal(
    options: PtyCreateOptions = {}
  ): Promise<PtyTerminalInfo> {
    const id = uuidv4()
    console.log(
      '[PTY Manager] Creating terminal with ID:',
      id,
      'options:',
      options
    )

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, {
        resolve: resolve as (value: unknown) => void,
        reject,
      })

      try {
        console.log('[PTY Manager] Sending create message to PTY Host...')
        this.sendMessageToPtyHost({
          type: 'create',
          id,
          options,
        })
        console.log('[PTY Manager] Create message sent successfully')
      } catch (error) {
        console.error('[PTY Manager] Failed to send create message:', error)
        this.pendingRequests.delete(id)
        reject(error)
      }
    })
  }

  writeToTerminal(id: string, data: string): void {
    console.log('[PTY Manager] 📝 writeToTerminal called:', {
      terminalId: id,
      data: data,
      dataLength: data?.length,
      charCode: data?.charCodeAt(0),
      timestamp: new Date().toISOString(),
    })

    try {
      console.log('[PTY Manager] 📤 Sending write message to PTY Host...')
      this.sendMessageToPtyHost({
        type: 'write',
        id,
        data,
      })
      console.log('[PTY Manager] ✅ Write message sent to PTY Host')
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
    // Mark as destroyed to prevent restart
    this.isDestroyed = true

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
