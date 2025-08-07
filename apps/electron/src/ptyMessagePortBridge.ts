/**
 * @fileoverview PTY MessagePort Bridge for High-Performance Terminal Communication.
 *
 * @description
 * Provides MessagePort-based communication between renderer processes and PTY host
 * processes, eliminating the main process bottleneck for terminal data flow.
 * Uses Electron's MessagePort API for direct, high-throughput communication.
 *
 * @example
 * ```typescript
 * const bridge = new PtyMessagePortBridge('terminal-1')
 * await bridge.initialize()
 * bridge.on('data', (data) => console.log('Terminal output:', data))
 * await bridge.write('echo hello\n')
 * ```
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import { MessageChannelMain, MessagePortMain } from 'electron'
import { EventEmitter } from 'node:events'

/**
 * Request structure for terminal MessagePort communication.
 *
 * @remarks
 * Used for all terminal operations including creation, data writing,
 * resizing, and termination commands sent over MessagePort channels.
 *
 * @public
 * @since 1.0.0
 */
interface TerminalMessagePortRequest {
  /**
   * Type of terminal operation to perform.
   * @public
   */
  type: 'create' | 'write' | 'resize' | 'kill' | 'list' | 'data'

  /**
   * Unique identifier for the terminal session.
   * @public
   */
  terminalId: string

  /**
   * Operation-specific data payload.
   * @public
   */
  data?: {
    /** Text to write to terminal */
    text?: string
    /** Terminal columns for resize operations */
    cols?: number
    /** Terminal rows for resize operations */
    rows?: number
    /** Terminal creation options */
    options?: {
      name?: string
      cwd?: string
      shell?: string
      env?: Record<string, string>
    }
  }

  /**
   * Request timestamp for latency tracking.
   * @public
   */
  timestamp?: number

  /**
   * Unique request identifier for response correlation.
   * @public
   */
  requestId?: string
}

/**
 * Response structure for terminal MessagePort communication.
 *
 * @remarks
 * Contains operation results, terminal data, or error information
 * sent back from PTY host processes to renderer processes.
 *
 * @public
 * @since 1.0.0
 */
interface TerminalMessagePortResponse {
  /**
   * Whether the operation completed successfully.
   * @public
   */
  success: boolean

  /**
   * Response data payload.
   * @public
   */
  data?: {
    /** Terminal ID for created terminals */
    id?: string
    /** Terminal display name */
    name?: string
    /** Process ID of the terminal */
    pid?: number
    /** Terminal output data */
    output?: string
    /** List of available terminals */
    terminals?: Array<{
      id: string
      name: string
      pid: number
      isActive: boolean
    }>
  }

  /**
   * Error message if operation failed.
   * @public
   */
  error?: string

  /**
   * Response timestamp.
   * @public
   */
  timestamp?: number

  /**
   * Correlation ID matching the request.
   * @public
   */
  requestId?: string
}

/**
 * Connection status and performance metrics.
 *
 * @remarks
 * Provides real-time information about MessagePort connection health,
 * performance statistics, and operational metrics.
 *
 * @public
 * @since 1.0.0
 */
interface ConnectionStatus {
  /**
   * Whether the MessagePort connection is active.
   * @public
   */
  connected: boolean

  /**
   * Number of reconnection attempts made.
   * @public
   */
  reconnectAttempts: number

  /**
   * Number of messages waiting in queue.
   * @public
   */
  queuedMessages: number

  /**
   * Performance metrics for the connection.
   * @public
   */
  performance: {
    /** Total messages sent through the channel */
    messageCount: number
    /** Average message latency in milliseconds */
    avgLatency: number
    /** Maximum recorded latency in milliseconds */
    maxLatency: number
    /** Number of active MessagePort channels */
    channelsActive: number
  }
}

/**
 * High-performance MessagePort bridge for PTY terminal communication.
 *
 * @remarks
 * This class establishes direct MessagePort channels between renderer processes
 * and PTY host processes, bypassing the main process for terminal data transfer.
 * This architecture significantly reduces latency and improves throughput for
 * terminal operations.
 *
 * The bridge handles connection management, message queuing during disconnections,
 * automatic reconnection with exponential backoff, and performance monitoring.
 *
 * @example
 * Basic usage:
 * ```typescript
 * const bridge = new PtyMessagePortBridge('my-terminal')
 * await bridge.initialize()
 *
 * bridge.on('data', (data) => {
 *   console.log('Terminal output:', data)
 * })
 *
 * bridge.on('error', (error) => {
 *   console.error('Bridge error:', error)
 * })
 *
 * await bridge.createTerminal({ shell: '/bin/bash' })
 * await bridge.write('echo "Hello World"\n')
 * ```
 *
 * @example
 * Advanced usage with reconnection:
 * ```typescript
 * const bridge = new PtyMessagePortBridge('advanced-terminal')
 *
 * bridge.on('disconnected', () => {
 *   console.log('Connection lost, will attempt reconnection')
 * })
 *
 * bridge.on('reconnected', () => {
 *   console.log('Connection restored')
 * })
 *
 * const status = bridge.getConnectionStatus()
 * console.log(`Connected: ${status.connected}, Queue: ${status.queuedMessages}`)
 * ```
 *
 * @public
 * @since 1.0.0
 */
export class PtyMessagePortBridge extends EventEmitter<{
  /** Emitted when terminal data is received */
  data: [string]
  /** Emitted when connection is established */
  connected: []
  /** Emitted when connection is lost */
  disconnected: []
  /** Emitted when an error occurs */
  error: [Error]
  /** Emitted when cleanup is completed */
  cleanup: []
  /** Emitted when maximum reconnection attempts are reached */
  maxReconnectAttemptsReached: []
  /** Emitted when a response is received from PTY host */
  response: [TerminalMessagePortResponse]
}> {
  private readonly channelId: string
  private isConnected = false
  private reconnectAttempts = 0
  private readonly maxReconnectAttempts = 5
  private messageQueue: TerminalMessagePortRequest[] = []
  private rendererPort: MessagePortMain | null = null
  private ptyHostPort: MessagePortMain | null = null
  private performanceMetrics = {
    messageCount: 0,
    totalLatency: 0,
    maxLatency: 0,
    channelsActive: 0,
  }

  /**
   * Creates a new PTY MessagePort bridge instance.
   *
   * @param channelId - Unique identifier for this terminal channel
   *
   * @example
   * ```typescript
   * const bridge = new PtyMessagePortBridge('terminal-session-1')
   * ```
   *
   * @public
   */
  constructor(channelId: string) {
    super()
    this.channelId = channelId
  }

  /**
   * Initialize the MessagePort bridge connection.
   *
   * @returns Promise that resolves when connection is established
   *
   * @throws {@link Error}
   * Thrown when MessagePort creation or connection setup fails
   *
   * @example
   * ```typescript
   * const bridge = new PtyMessagePortBridge('terminal-1')
   * await bridge.initialize()
   * console.log('Bridge ready for communication')
   * ```
   *
   * @public
   */
  async initialize(): Promise<void> {
    return this.setupConnection()
  }

  /**
   * Create a new terminal session.
   *
   * @param options - Terminal creation options
   * @returns Promise that resolves when terminal is created
   *
   * @throws {@link Error}
   * Thrown when terminal creation fails
   *
   * @example
   * ```typescript
   * await bridge.createTerminal({
   *   shell: '/bin/bash',
   *   cwd: '/home/user',
   *   env: { PATH: '/usr/bin' }
   * })
   * ```
   *
   * @public
   */
  async createTerminal(options?: {
    name?: string
    cwd?: string
    shell?: string
    env?: Record<string, string>
  }): Promise<void> {
    const request: TerminalMessagePortRequest = {
      type: 'create',
      terminalId: this.channelId,
      data: { options },
      timestamp: Date.now(),
      requestId: `create-${this.channelId}-${Date.now()}`,
    }

    return this.sendRequest(request)
  }

  /**
   * Write data to the terminal.
   *
   * @param data - Text data to write to terminal
   * @returns Promise that resolves when data is sent
   *
   * @throws {@link Error}
   * Thrown when write operation fails
   *
   * @example
   * ```typescript
   * await bridge.write('ls -la\n')
   * await bridge.write('cd /home/user\n')
   * ```
   *
   * @public
   */
  async write(data: string): Promise<void> {
    const request: TerminalMessagePortRequest = {
      type: 'write',
      terminalId: this.channelId,
      data: { text: data },
      timestamp: Date.now(),
      requestId: `write-${this.channelId}-${Date.now()}`,
    }

    return this.sendRequest(request)
  }

  /**
   * Resize the terminal dimensions.
   *
   * @param cols - Number of columns
   * @param rows - Number of rows
   * @returns Promise that resolves when resize is applied
   *
   * @throws {@link Error}
   * Thrown when resize operation fails
   *
   * @example
   * ```typescript
   * await bridge.resize(120, 30)
   * ```
   *
   * @public
   */
  async resize(cols: number, rows: number): Promise<void> {
    const request: TerminalMessagePortRequest = {
      type: 'resize',
      terminalId: this.channelId,
      data: { cols, rows },
      timestamp: Date.now(),
      requestId: `resize-${this.channelId}-${Date.now()}`,
    }

    return this.sendRequest(request)
  }

  /**
   * Kill the terminal session.
   *
   * @returns Promise that resolves when terminal is terminated
   *
   * @throws {@link Error}
   * Thrown when kill operation fails
   *
   * @example
   * ```typescript
   * await bridge.kill()
   * ```
   *
   * @public
   */
  async kill(): Promise<void> {
    const request: TerminalMessagePortRequest = {
      type: 'kill',
      terminalId: this.channelId,
      timestamp: Date.now(),
      requestId: `kill-${this.channelId}-${Date.now()}`,
    }

    return this.sendRequest(request)
  }

  /**
   * Setup MessagePort connection with PTY Host.
   *
   * @returns Promise that resolves when connection is established
   *
   * @throws {@link Error}
   * Thrown when MessagePort creation or setup fails
   *
   * @private
   */
  private async setupConnection(): Promise<void> {
    try {
      console.log(`[PTY MessagePort] Setting up connection: ${this.channelId}`)

      // Create MessageChannel for direct communication
      const channel = new MessageChannelMain()
      const { port1, port2 } = channel

      // port1 = renderer side, port2 = ptyHost side
      this.rendererPort = port1
      this.ptyHostPort = port2

      this.setupRendererPort(port1)
      this.setupPtyHostPort(port2)

      this.isConnected = true
      this.reconnectAttempts = 0
      this.performanceMetrics.channelsActive++

      // Process any queued messages
      this.processMessageQueue()

      console.log(`[PTY MessagePort] Connection established: ${this.channelId}`)
      this.emit('connected')
    } catch (error) {
      console.error('[PTY MessagePort] Failed to setup connection:', error)
      this.handleConnectionError(
        error instanceof Error ? error : new Error(String(error))
      )
      throw error
    }
  }

  /**
   * Setup renderer-side MessagePort for incoming requests.
   *
   * @param port - MessagePort for renderer communication
   *
   * @private
   */
  private setupRendererPort(port: MessagePortMain): void {
    port.start()

    // Handle messages from renderer
    port.on('message', (event) => {
      const request = event.data as TerminalMessagePortRequest
      this.handleRendererMessage(request)
    })

    port.on('close', () => {
      console.warn('[PTY MessagePort] Renderer port closed')
      this.handleDisconnection()
    })

    // Port is ready for communication
    console.log(`[PTY MessagePort] Renderer port ready: ${this.channelId}`)
  }

  /**
   * Setup PTY Host-side MessagePort for responses and data.
   *
   * @param port - MessagePort for PTY host communication
   *
   * @private
   */
  private setupPtyHostPort(port: MessagePortMain): void {
    port.start()

    // Handle responses from PTY Host
    port.on('message', (event) => {
      const response = event.data as TerminalMessagePortResponse
      this.handlePtyHostResponse(response)
    })

    port.on('close', () => {
      console.warn('[PTY MessagePort] PTY Host port closed')
      this.handleDisconnection()
    })

    console.log(`[PTY MessagePort] PTY Host port ready: ${this.channelId}`)
  }

  /**
   * Send a request through the MessagePort bridge.
   *
   * @param request - Request to send to PTY host
   * @returns Promise that resolves when request is sent
   *
   * @throws {@link Error}
   * Thrown when connection is not available or send fails
   *
   * @private
   */
  private async sendRequest(
    request: TerminalMessagePortRequest
  ): Promise<void> {
    if (!this.isConnected || !this.ptyHostPort) {
      console.warn(
        '[PTY MessagePort] Queuing message - not connected:',
        request.type
      )
      this.messageQueue.push(request)
      return Promise.reject(new Error('MessagePort not connected'))
    }

    try {
      this.ptyHostPort.postMessage(request)
      this.performanceMetrics.messageCount++
      console.log(
        `[PTY MessagePort] Sent request: ${request.type} (${request.requestId})`
      )
    } catch (error) {
      console.error('[PTY MessagePort] Failed to send request:', error)
      throw error
    }
  }

  /**
   * Handle message received from renderer process.
   *
   * @param request - Request from renderer
   *
   * @private
   */
  private handleRendererMessage(request: TerminalMessagePortRequest): void {
    console.log(
      `[PTY MessagePort] Processing renderer request: ${request.type}`
    )

    // Forward to PTY Host
    this.sendRequest(request).catch((error) => {
      console.error('[PTY MessagePort] Failed to forward request:', error)
      this.emit('error', error)
    })
  }

  /**
   * Handle response received from PTY Host.
   *
   * @param response - Response from PTY host
   *
   * @private
   */
  private handlePtyHostResponse(response: TerminalMessagePortResponse): void {
    console.log(
      `[PTY MessagePort] Received PTY Host response: ${response.requestId}`
    )

    // Calculate latency if timestamps are available
    if (response.timestamp && response.requestId) {
      const latency = Date.now() - response.timestamp
      this.performanceMetrics.totalLatency += latency
      this.performanceMetrics.maxLatency = Math.max(
        this.performanceMetrics.maxLatency,
        latency
      )
    }

    // Handle terminal data output
    if (response.data?.output) {
      this.emit('data', response.data.output)
    }

    // Emit response for external handling
    this.emit('response', response)
  }

  /**
   * Process queued messages after reconnection.
   *
   * @private
   */
  private processMessageQueue(): void {
    if (this.messageQueue.length > 0) {
      console.log(
        `[PTY MessagePort] Processing ${this.messageQueue.length} queued messages`
      )

      const queue = [...this.messageQueue]
      this.messageQueue = []

      for (const request of queue) {
        this.sendRequest(request).catch((error) => {
          console.error(
            '[PTY MessagePort] Failed to process queued message:',
            error
          )
          this.emit('error', error)
        })
      }
    }
  }

  /**
   * Handle connection errors with automatic retry logic.
   *
   * @param error - The connection error that occurred
   *
   * @private
   */
  private handleConnectionError(error: Error): void {
    this.isConnected = false
    this.emit('error', error)

    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000)

      console.log(
        `[PTY MessagePort] Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`
      )

      setTimeout(() => {
        this.setupConnection().catch((retryError) => {
          console.error('[PTY MessagePort] Reconnection failed:', retryError)
        })
      }, delay)
    } else {
      console.error('[PTY MessagePort] Max reconnection attempts reached')
      this.emit('maxReconnectAttemptsReached')
    }
  }

  /**
   * Handle MessagePort disconnection.
   *
   * @private
   */
  private handleDisconnection(): void {
    this.isConnected = false
    this.performanceMetrics.channelsActive = Math.max(
      0,
      this.performanceMetrics.channelsActive - 1
    )
    this.emit('disconnected')

    // Attempt to reconnect
    this.handleConnectionError(new Error('MessagePort disconnected'))
  }

  /**
   * Get current connection status and performance metrics.
   *
   * @returns Connection status information
   *
   * @example
   * ```typescript
   * const status = bridge.getConnectionStatus()
   * console.log(`Connected: ${status.connected}`)
   * console.log(`Queue size: ${status.queuedMessages}`)
   * console.log(`Avg latency: ${status.performance.avgLatency}ms`)
   * ```
   *
   * @public
   */
  getConnectionStatus(): ConnectionStatus {
    return {
      connected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      queuedMessages: this.messageQueue.length,
      performance: {
        messageCount: this.performanceMetrics.messageCount,
        avgLatency:
          this.performanceMetrics.messageCount > 0
            ? this.performanceMetrics.totalLatency /
              this.performanceMetrics.messageCount
            : 0,
        maxLatency: this.performanceMetrics.maxLatency,
        channelsActive: this.performanceMetrics.channelsActive,
      },
    }
  }

  /**
   * Force reconnection of the MessagePort bridge.
   *
   * @example
   * ```typescript
   * bridge.reconnect()
   * ```
   *
   * @public
   */
  reconnect(): void {
    this.isConnected = false
    this.reconnectAttempts = 0
    this.setupConnection().catch((error) => {
      console.error('[PTY MessagePort] Manual reconnection failed:', error)
      this.emit('error', error)
    })
  }

  /**
   * Cleanup and close all MessagePort connections.
   *
   * @example
   * ```typescript
   * bridge.cleanup()
   * ```
   *
   * @public
   */
  cleanup(): void {
    this.isConnected = false
    this.messageQueue = []

    // Close MessagePorts
    if (this.rendererPort) {
      this.rendererPort.close()
      this.rendererPort = null
    }

    if (this.ptyHostPort) {
      this.ptyHostPort.close()
      this.ptyHostPort = null
    }

    this.performanceMetrics.channelsActive = 0
    this.emit('cleanup')
    console.log(`[PTY MessagePort] Bridge cleaned up: ${this.channelId}`)
  }
}

/**
 * Factory function to create PTY MessagePort bridges.
 *
 * @param channelId - Unique identifier for the terminal channel
 * @returns New PTY MessagePort bridge instance
 *
 * @example
 * ```typescript
 * const bridge = createPtyMessagePortBridge('terminal-session-1')
 * await bridge.initialize()
 * ```
 *
 * @public
 * @since 1.0.0
 */
export function createPtyMessagePortBridge(
  channelId: string
): PtyMessagePortBridge {
  return new PtyMessagePortBridge(channelId)
}
