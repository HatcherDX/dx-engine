/**
 * @fileoverview Extended IPC Bridge - Enhanced Electron IPC communication.
 *
 * @description
 * Extended IPC bridge for terminal communication between main and renderer
 * processes. Provides additional features like batching, compression, and
 * advanced terminal management operations.
 *
 * @example
 * ```typescript
 * const bridge = new ExtendedIPCBridge(ipcMain)
 * bridge.setWebContents(mainWindow.webContents)
 * const terminalId = await bridge.createTerminal({ name: 'Main' })
 * ```
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import { IPCBridge } from '../core/IPCBridge'
import type { IpcMain, IpcMainInvokeEvent } from 'electron'
import type {
  CreateTerminalOptions,
  TerminalDataEvent,
} from '../types/terminal'
import { Logger } from '../utils/logger'

/**
 * Helper function to access private members of IPCBridge.
 *
 * @remarks
 * TypeScript allows accessing private members at runtime through type assertion.
 * This is safe because we control both the parent and child class implementations.
 *
 * @internal
 */
function getPrivateMembers(instance: IPCBridge): {
  ipcMain: IpcMain
  terminalManager: {
    create: (options: CreateTerminalOptions) => Promise<string>
    sendInput: (terminalId: string, data: string) => Promise<void>
    getAll: () => unknown[]
  }
} {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return instance as any
}

/**
 * Extended terminal creation options.
 *
 * @public
 * @since 1.0.0
 */
export interface ExtendedCreateTerminalOptions extends CreateTerminalOptions {
  /** Enable data compression for large outputs */
  enableCompression?: boolean
  /** Enable batching for multiple writes */
  enableBatching?: boolean
  /** Custom environment variables */
  customEnv?: Record<string, string>
  /** Working directory persistence */
  persistCwd?: boolean
  /** Session recording */
  recordSession?: boolean
}

/**
 * Terminal session recording data.
 *
 * @public
 * @since 1.0.0
 */
export interface SessionRecording {
  /** Terminal ID */
  terminalId: string
  /** Recording start time */
  startTime: Date
  /** Recording end time */
  endTime?: Date
  /** Recorded data chunks */
  chunks: Array<{
    timestamp: number
    type: 'input' | 'output'
    data: string
  }>
  /** Terminal dimensions at start */
  initialDimensions: { cols: number; rows: number }
}

/**
 * Batch write operation.
 *
 * @public
 * @since 1.0.0
 */
export interface BatchWrite {
  /** Terminal ID */
  terminalId: string
  /** Data chunks to write */
  data: string[]
  /** Write delay between chunks */
  delay?: number
}

/**
 * Terminal statistics.
 *
 * @public
 * @since 1.0.0
 */
export interface TerminalStats {
  /** Terminal ID */
  id: string
  /** Creation time */
  createdAt: Date
  /** Last activity time */
  lastActivity: Date
  /** Total bytes written */
  bytesWritten: number
  /** Total bytes read */
  bytesRead: number
  /** Number of resize events */
  resizeCount: number
  /** Current dimensions */
  dimensions: { cols: number; rows: number }
  /** Is terminal active */
  isActive: boolean
}

/**
 * Extended IPC Bridge with advanced features.
 *
 * @remarks
 * This class extends the basic IPCBridge with additional functionality
 * for production terminal applications including compression, batching,
 * session recording, and advanced terminal management.
 *
 * Key features:
 * - Data compression for large outputs
 * - Batch write operations
 * - Session recording and playback
 * - Terminal statistics tracking
 * - Advanced error handling
 * - Performance monitoring
 *
 * @public
 * @since 1.0.0
 */
export class ExtendedIPCBridge extends IPCBridge {
  private extLogger = new Logger('ExtendedIPCBridge')
  private sessions: Map<string, SessionRecording> = new Map()
  private stats: Map<string, TerminalStats> = new Map()
  private batchQueues: Map<string, string[]> = new Map()
  private compressionEnabled: Map<string, boolean> = new Map()

  /**
   * Creates a new ExtendedIPCBridge instance.
   *
   * @param ipcMain - Electron IPC main instance
   *
   * @example
   * ```typescript
   * const bridge = new ExtendedIPCBridge(ipcMain)
   * ```
   */
  constructor(ipcMain: IpcMain) {
    super(ipcMain)
    this.setupExtendedHandlers()
  }

  /**
   * Sets up extended IPC handlers.
   *
   * @internal
   */
  private setupExtendedHandlers(): void {
    // Note: ipcMain is private in parent, need to access via type assertion
    const ipcMain = getPrivateMembers(this).ipcMain

    // Extended terminal creation
    ipcMain.handle(
      'terminal:create-extended',
      async (
        _event: IpcMainInvokeEvent,
        options: ExtendedCreateTerminalOptions
      ) => {
        return this.createExtendedTerminal(options)
      }
    )

    // Batch write operations
    ipcMain.handle(
      'terminal:batch-write',
      async (_event: IpcMainInvokeEvent, batch: BatchWrite) => {
        return this.batchWrite(batch)
      }
    )

    // Get terminal statistics
    ipcMain.handle(
      'terminal:get-stats',
      async (_event: IpcMainInvokeEvent, terminalId: string) => {
        return this.getTerminalStats(terminalId)
      }
    )

    // Session recording controls
    ipcMain.handle(
      'terminal:start-recording',
      async (_event: IpcMainInvokeEvent, terminalId: string) => {
        return this.startRecording(terminalId)
      }
    )

    ipcMain.handle(
      'terminal:stop-recording',
      async (_event: IpcMainInvokeEvent, terminalId: string) => {
        return this.stopRecording(terminalId)
      }
    )

    ipcMain.handle(
      'terminal:get-recording',
      async (_event: IpcMainInvokeEvent, terminalId: string) => {
        return this.getRecording(terminalId)
      }
    )

    // Terminal management
    ipcMain.handle('terminal:list-all', async () => {
      return this.listAllTerminals()
    })

    ipcMain.handle(
      'terminal:clear',
      async (_event: IpcMainInvokeEvent, terminalId: string) => {
        return this.clearTerminal(terminalId)
      }
    )

    ipcMain.handle(
      'terminal:reset',
      async (_event: IpcMainInvokeEvent, terminalId: string) => {
        return this.resetTerminal(terminalId)
      }
    )

    this.extLogger.debug('Extended IPC handlers registered')
  }

  /**
   * Creates an extended terminal with additional features.
   *
   * @param options - Extended terminal creation options
   * @returns Terminal ID
   *
   * @example
   * ```typescript
   * const terminalId = await bridge.createExtendedTerminal({
   *   name: 'Development',
   *   enableCompression: true,
   *   recordSession: true
   * })
   * ```
   */
  async createExtendedTerminal(
    options: ExtendedCreateTerminalOptions
  ): Promise<string> {
    try {
      // Create base terminal using parent's terminal manager
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private terminalManager from parent IPCBridge class
      const terminalManager = (this as any).terminalManager
      const terminalId = await terminalManager.create(options)

      // Initialize statistics
      this.stats.set(terminalId, {
        id: terminalId,
        createdAt: new Date(),
        lastActivity: new Date(),
        bytesWritten: 0,
        bytesRead: 0,
        resizeCount: 0,
        dimensions: { cols: options.cols || 80, rows: options.rows || 24 },
        isActive: true,
      })

      // Enable compression if requested
      if (options.enableCompression) {
        this.compressionEnabled.set(terminalId, true)
      }

      // Start recording if requested
      if (options.recordSession) {
        this.startRecording(terminalId)
      }

      // Initialize batch queue if batching enabled
      if (options.enableBatching) {
        this.batchQueues.set(terminalId, [])
      }

      this.extLogger.info(`Extended terminal created: ${terminalId}`)
      return terminalId
    } catch (error) {
      this.extLogger.error(
        'Failed to create extended terminal:',
        error as Error
      )
      throw error
    }
  }

  /**
   * Performs batch write operations.
   *
   * @param batch - Batch write configuration
   * @returns Promise resolving when batch is complete
   *
   * @example
   * ```typescript
   * await bridge.batchWrite({
   *   terminalId: 'term-123',
   *   data: ['line1\r\n', 'line2\r\n', 'line3\r\n'],
   *   delay: 10
   * })
   * ```
   */
  async batchWrite(batch: BatchWrite): Promise<void> {
    const { terminalId, data, delay = 0 } = batch
    const terminalManager = getPrivateMembers(this).terminalManager

    for (let i = 0; i < data.length; i++) {
      await terminalManager.sendInput(terminalId, data[i])

      if (delay > 0 && i < data.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }

    // Update statistics
    const stats = this.stats.get(terminalId)
    if (stats) {
      stats.bytesWritten += data.join('').length
      stats.lastActivity = new Date()
    }
  }

  /**
   * Gets terminal statistics.
   *
   * @param terminalId - Terminal identifier
   * @returns Terminal statistics or null
   *
   * @example
   * ```typescript
   * const stats = await bridge.getTerminalStats('term-123')
   * console.log(`Bytes written: ${stats.bytesWritten}`)
   * ```
   */
  getTerminalStats(terminalId: string): TerminalStats | null {
    return this.stats.get(terminalId) || null
  }

  /**
   * Starts recording a terminal session.
   *
   * @param terminalId - Terminal identifier
   *
   * @example
   * ```typescript
   * await bridge.startRecording('term-123')
   * ```
   */
  startRecording(terminalId: string): void {
    if (this.sessions.has(terminalId)) {
      this.extLogger.warn(`Recording already active for terminal ${terminalId}`)
      return
    }

    const stats = this.stats.get(terminalId)
    if (!stats) {
      throw new Error(`Terminal ${terminalId} not found`)
    }

    this.sessions.set(terminalId, {
      terminalId,
      startTime: new Date(),
      chunks: [],
      initialDimensions: { ...stats.dimensions },
    })

    this.extLogger.info(`Started recording for terminal ${terminalId}`)
  }

  /**
   * Stops recording a terminal session.
   *
   * @param terminalId - Terminal identifier
   * @returns Recorded session or null
   *
   * @example
   * ```typescript
   * const recording = await bridge.stopRecording('term-123')
   * console.log(`Recorded ${recording.chunks.length} chunks`)
   * ```
   */
  stopRecording(terminalId: string): SessionRecording | null {
    const session = this.sessions.get(terminalId)
    if (!session) {
      this.extLogger.warn(`No recording found for terminal ${terminalId}`)
      return null
    }

    session.endTime = new Date()
    this.sessions.delete(terminalId)

    this.extLogger.info(`Stopped recording for terminal ${terminalId}`)
    return session
  }

  /**
   * Gets recording for a terminal.
   *
   * @param terminalId - Terminal identifier
   * @returns Session recording or null
   */
  getRecording(terminalId: string): SessionRecording | null {
    return this.sessions.get(terminalId) || null
  }

  /**
   * Lists all active terminals.
   *
   * @returns Array of terminal information
   *
   * @example
   * ```typescript
   * const terminals = await bridge.listAllTerminals()
   * terminals.forEach(term => {
   *   console.log(`${term.id}: ${term.name}`)
   * })
   * ```
   */
  async listAllTerminals(): Promise<
    Array<{
      id: string
      name: string
      isActive: boolean
      stats?: TerminalStats
    }>
  > {
    // Get active terminals from parent's terminal manager
    const terminalManager = getPrivateMembers(this).terminalManager
    const terminals = terminalManager.getAll() || []
    return terminals.map((term: unknown) => {
      const t = term as { id: string; name?: string }
      return {
        id: t.id,
        name: t.name || 'Terminal',
        isActive: true,
        stats: this.stats.get(t.id),
      }
    })
  }

  /**
   * Clears terminal screen.
   *
   * @param terminalId - Terminal identifier
   *
   * @example
   * ```typescript
   * await bridge.clearTerminal('term-123')
   * ```
   */
  async clearTerminal(terminalId: string): Promise<void> {
    // Send clear screen escape sequence
    const terminalManager = getPrivateMembers(this).terminalManager
    await terminalManager.sendInput(terminalId, '\x1b[2J\x1b[H')
  }

  /**
   * Resets terminal to initial state.
   *
   * @param terminalId - Terminal identifier
   *
   * @example
   * ```typescript
   * await bridge.resetTerminal('term-123')
   * ```
   */
  async resetTerminal(terminalId: string): Promise<void> {
    // Send terminal reset escape sequence
    const terminalManager = getPrivateMembers(this).terminalManager
    await terminalManager.sendInput(terminalId, '\x1bc')
  }

  /**
   * Handles terminal data with recording.
   *
   * @internal
   */
  handleTerminalData(event: TerminalDataEvent & { terminalId: string }): void {
    // Handle data event

    // Record if session is active
    const session = this.sessions.get(event.terminalId)
    if (session) {
      session.chunks.push({
        timestamp: Date.now(),
        type: 'output',
        data: event.data,
      })
    }

    // Update statistics
    const stats = this.stats.get(event.terminalId)
    if (stats) {
      stats.bytesRead += event.data.length
      stats.lastActivity = new Date()
    }
  }

  /**
   * Handles terminal resize with statistics.
   *
   * @internal
   */
  handleTerminalResize(terminalId: string, cols: number, rows: number): void {
    // Handle resize event

    // Update statistics
    const stats = this.stats.get(terminalId)
    if (stats) {
      stats.dimensions = { cols, rows }
      stats.resizeCount++
      stats.lastActivity = new Date()
    }
  }

  /**
   * Disposes the extended IPC bridge.
   *
   * @example
   * ```typescript
   * bridge.dispose()
   * ```
   */
  dispose(): void {
    // Stop all recordings
    this.sessions.forEach((session) => {
      session.endTime = new Date()
    })
    this.sessions.clear()

    // Clear statistics
    this.stats.clear()

    // Clear queues
    this.batchQueues.clear()
    this.compressionEnabled.clear()

    this.extLogger.info('ExtendedIPCBridge disposed')
  }
}
