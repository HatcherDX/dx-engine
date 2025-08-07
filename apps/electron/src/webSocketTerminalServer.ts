/**
 * WebSocket Terminal Server - Web Mode Fallback
 * Provides VSCode-style terminal via WebSocket for web development mode
 * Same API as Electron mode for seamless switching
 */

import express, { Request, Response, NextFunction } from 'express'
import expressWs from 'express-ws'
import { EventEmitter } from 'node:events'
import * as http from 'node:http'
import {
  createTerminal,
  TerminalStrategy,
  type ITerminal,
} from './terminalStrategy'

// WebSocket type (basic interface)
interface WebSocketLike {
  send: (data: string) => void
  close: () => void
  on: (event: string, callback: (...args: unknown[]) => void) => void
  readyState: number
  OPEN: number
  CLOSED: number
  CONNECTING: number
  CLOSING: number
}

interface WebSocketTerminalSession {
  id: string
  terminal: ITerminal
  strategy: TerminalStrategy
  ws: WebSocketLike
  createdAt: Date
  lastActivity: Date
}

interface TerminalWebSocketMessage {
  type:
    | 'create'
    | 'write'
    | 'resize'
    | 'kill'
    | 'list'
    | 'data'
    | 'connected'
    | 'created'
    | 'exit'
    | 'error'
  terminalId?: string
  data?: unknown
  timestamp: number
}

export class WebSocketTerminalServer extends EventEmitter {
  private app: express.Application
  private server: http.Server | null = null
  private sessions = new Map<string, WebSocketTerminalSession>()
  private port: number
  private isRunning = false

  constructor(port: number = 3001) {
    super()
    this.port = port
    this.setupExpress()
  }

  /**
   * Setup Express app with WebSocket support
   */
  private setupExpress(): void {
    this.app = express()
    expressWs(this.app)

    // Enable CORS for development
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      res.header('Access-Control-Allow-Origin', '*')
      res.header(
        'Access-Control-Allow-Methods',
        'GET, POST, PUT, DELETE, OPTIONS'
      )
      res.header(
        'Access-Control-Allow-Headers',
        'Origin, X-Requested-With, Content-Type, Accept, Authorization'
      )
      if (req.method === 'OPTIONS') {
        res.sendStatus(200)
      } else {
        next()
      }
    })

    // Health check endpoint
    this.app.get('/health', (req: Request, res: Response) => {
      res.json({
        status: 'healthy',
        sessionsActive: this.sessions.size,
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
      })
    })

    // Terminal sessions info endpoint
    this.app.get('/terminals', (req: Request, res: Response) => {
      const sessions = Array.from(this.sessions.values()).map((session) => ({
        id: session.id,
        strategy: session.strategy,
        createdAt: session.createdAt,
        lastActivity: session.lastActivity,
        pid: session.terminal.pid,
        isRunning: session.terminal.isRunning,
      }))

      res.json({ sessions })
    })

    // WebSocket terminal endpoint
    this.app.ws('/terminal', (ws: WebSocketLike) => {
      this.handleWebSocketConnection(ws)
    })
  }

  /**
   * Handle new WebSocket connection
   */
  private handleWebSocketConnection(ws: WebSocketLike): void {
    const sessionId = this.generateSessionId()

    // Setup connection handlers
    ws.on('message', (message: string) => {
      this.handleWebSocketMessage(sessionId, ws, message)
    })

    ws.on('close', () => {
      this.handleWebSocketDisconnection(sessionId)
    })

    ws.on('error', (error: Error) => {
      console.error(
        `[WebSocket Terminal] Connection error ${sessionId}:`,
        error
      )
      this.handleWebSocketDisconnection(sessionId)
    })

    // Send welcome message
    this.sendWebSocketMessage(ws, {
      type: 'connected',
      data: { sessionId },
      timestamp: Date.now(),
    })
  }

  /**
   * Handle WebSocket message
   */
  private async handleWebSocketMessage(
    sessionId: string,
    ws: WebSocketLike,
    message: string
  ): Promise<void> {
    try {
      const data = JSON.parse(message) as TerminalWebSocketMessage

      switch (data.type) {
        case 'create':
          await this.handleCreateTerminal(sessionId, ws, data)
          break

        case 'write':
          this.handleWriteToTerminal(sessionId, data)
          break

        case 'resize':
          this.handleResizeTerminal(sessionId, data)
          break

        case 'kill':
          this.handleKillTerminal(sessionId, data)
          break

        case 'list':
          this.handleListTerminals(sessionId, ws)
          break

        default:
          console.warn(
            `[WebSocket Terminal] Unknown message type: ${data.type}`
          )
      }
    } catch (error) {
      console.error(
        `[WebSocket Terminal] Error processing message from ${sessionId}:`,
        error
      )
      this.sendWebSocketMessage(ws, {
        type: 'error',
        data: {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        timestamp: Date.now(),
      })
    }
  }

  /**
   * Handle create terminal request
   */
  private async handleCreateTerminal(
    sessionId: string,
    ws: WebSocketLike,
    data: TerminalWebSocketMessage
  ): Promise<void> {
    try {
      const terminalId = data.terminalId || this.generateTerminalId()

      console.log(
        `[WebSocket Terminal] Creating terminal ${terminalId} for session ${sessionId}`
      )

      // Create terminal using hybrid strategy
      const result = await createTerminal(terminalId, {
        shell: data.data?.shell,
        cwd: data.data?.cwd,
        env: data.data?.env,
        cols: data.data?.cols || 80,
        rows: data.data?.rows || 24,
      })

      // Setup terminal event handlers
      result.terminal.on('data', (terminalData: string) => {
        this.sendWebSocketMessage(ws, {
          type: 'data',
          terminalId,
          data: terminalData,
          timestamp: Date.now(),
        })
      })

      result.terminal.on('exit', (exitCode: number, signal?: string) => {
        console.log(
          `[WebSocket Terminal] Terminal ${terminalId} exited with code ${exitCode}`
        )
        this.sendWebSocketMessage(ws, {
          type: 'exit',
          terminalId,
          data: { exitCode, signal },
          timestamp: Date.now(),
        })
        this.sessions.delete(terminalId)
      })

      result.terminal.on('error', (error: Error) => {
        console.error(
          `[WebSocket Terminal] Terminal ${terminalId} error:`,
          error
        )
        this.sendWebSocketMessage(ws, {
          type: 'error',
          terminalId,
          data: { error: error.message },
          timestamp: Date.now(),
        })
      })

      // Spawn the terminal
      result.terminal.spawn()

      // Store session
      this.sessions.set(terminalId, {
        id: terminalId,
        terminal: result.terminal,
        strategy: result.strategy,
        ws,
        createdAt: new Date(),
        lastActivity: new Date(),
      })

      // Send success response
      this.sendWebSocketMessage(ws, {
        type: 'created',
        terminalId,
        data: {
          strategy: result.strategy,
          fallbackReason: result.fallbackReason,
          pid: result.terminal.pid,
        },
        timestamp: Date.now(),
      })
    } catch (error) {
      console.error(`[WebSocket Terminal] Failed to create terminal:`, error)
      this.sendWebSocketMessage(ws, {
        type: 'error',
        data: {
          error:
            error instanceof Error
              ? error.message
              : 'Failed to create terminal',
        },
        timestamp: Date.now(),
      })
    }
  }

  /**
   * Handle write to terminal
   */
  private handleWriteToTerminal(
    sessionId: string,
    data: TerminalWebSocketMessage
  ): void {
    const session = this.sessions.get(data.terminalId!)
    if (!session) {
      console.warn(
        `[WebSocket Terminal] Terminal ${data.terminalId} not found for write`
      )
      return
    }

    session.terminal.write(data.data)
    session.lastActivity = new Date()
  }

  /**
   * Handle resize terminal
   */
  private handleResizeTerminal(
    sessionId: string,
    data: TerminalWebSocketMessage
  ): void {
    const session = this.sessions.get(data.terminalId!)
    if (!session) {
      console.warn(
        `[WebSocket Terminal] Terminal ${data.terminalId} not found for resize`
      )
      return
    }

    session.terminal.resize(data.data.cols, data.data.rows)
    session.lastActivity = new Date()
  }

  /**
   * Handle kill terminal
   */
  private handleKillTerminal(
    sessionId: string,
    data: TerminalWebSocketMessage
  ): void {
    const session = this.sessions.get(data.terminalId!)
    if (!session) {
      console.warn(
        `[WebSocket Terminal] Terminal ${data.terminalId} not found for kill`
      )
      return
    }

    session.terminal.kill()
    this.sessions.delete(data.terminalId!)
  }

  /**
   * Handle list terminals
   */
  private handleListTerminals(sessionId: string, ws: WebSocketLike): void {
    const terminals = Array.from(this.sessions.values()).map((session) => ({
      id: session.id,
      strategy: session.strategy,
      pid: session.terminal.pid,
      isRunning: session.terminal.isRunning,
      createdAt: session.createdAt,
      lastActivity: session.lastActivity,
    }))

    this.sendWebSocketMessage(ws, {
      type: 'list',
      data: { terminals },
      timestamp: Date.now(),
    })
  }

  /**
   * Handle WebSocket disconnection
   */
  private handleWebSocketDisconnection(): void {
    // Find and cleanup terminals for this session
    for (const [terminalId, session] of this.sessions) {
      if (session.ws === undefined || session.ws.readyState !== 1) {
        session.terminal.kill()
        this.sessions.delete(terminalId)
      }
    }
  }

  /**
   * Send message via WebSocket
   */
  private sendWebSocketMessage(
    ws: WebSocketLike,
    message: TerminalWebSocketMessage
  ): void {
    if (ws.readyState === 1) {
      // WebSocket.OPEN
      ws.send(JSON.stringify(message))
    }
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Generate unique terminal ID
   */
  private generateTerminalId(): string {
    return `terminal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Start WebSocket server
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.warn('[WebSocket Terminal] Server already running')
      return
    }

    return new Promise((resolve, reject) => {
      this.server = this.app.listen(this.port, () => {
        this.isRunning = true
        console.log(`[WebSocket Terminal] Server started on port ${this.port}`)
        console.log(
          `[WebSocket Terminal] WebSocket endpoint: ws://localhost:${this.port}/terminal`
        )
        console.log(
          `[WebSocket Terminal] Health check: http://localhost:${this.port}/health`
        )
        this.emit('started')
        resolve()
      })

      this.server.on('error', (error: Error) => {
        console.error('[WebSocket Terminal] Server error:', error)
        reject(error)
      })
    })
  }

  /**
   * Stop WebSocket server
   */
  async stop(): Promise<void> {
    if (!this.isRunning || !this.server) {
      console.warn('[WebSocket Terminal] Server not running')
      return
    }

    // Clean up all sessions
    for (const [, session] of this.sessions) {
      session.terminal.kill()
    }
    this.sessions.clear()

    return new Promise((resolve) => {
      this.server!.close(() => {
        this.isRunning = false
        console.log('[WebSocket Terminal] Server stopped')
        this.emit('stopped')
        resolve()
      })
    })
  }

  /**
   * Get server status
   */
  getStatus(): {
    running: boolean
    port: number
    sessions: number
    uptime: number
  } {
    return {
      running: this.isRunning,
      port: this.port,
      sessions: this.sessions.size,
      uptime: process.uptime(),
    }
  }
}

// Export singleton for global usage
export const webSocketTerminalServer = new WebSocketTerminalServer()
