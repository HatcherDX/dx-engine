/**
 * Terminal Strategy - Enhanced with @hatcherdx/terminal-system
 * Now uses the consolidated terminal system with automatic backend detection
 */

import {
  BackendDetector,
  EnhancedTerminalFactory,
  type BackendProcess,
  type TerminalCapabilities,
} from '@hatcherdx/terminal-system'
import { EventEmitter } from 'node:events'

interface TerminalOptions {
  shell?: string
  cwd?: string
  env?: Record<string, string>
  cols?: number
  rows?: number
}

export interface TerminalInterface extends EventEmitter {
  spawn(): void
  write(data: string): void
  resize(cols: number, rows: number): void
  kill(): void
  readonly pid: number | undefined
  readonly isRunning: boolean
}

export enum TerminalStrategy {
  NODE_PTY = 'node-pty',
  CONPTY = 'conpty',
  WINPTY = 'winpty',
  SUBPROCESS = 'subprocess',
}

export interface TerminalCreateResult {
  terminal: TerminalInterface
  strategy: TerminalStrategy
  capabilities: TerminalCapabilities
  fallbackReason?: string
}

/**
 * Enhanced terminal implementation using @hatcherdx/terminal-system
 */
class EnhancedTerminalWrapper
  extends EventEmitter
  implements TerminalInterface
{
  private process: BackendProcess | null = null
  private _isRunning = false

  constructor(
    private id: string,
    private backendProcess: BackendProcess,
    private capabilities: TerminalCapabilities
  ) {
    super()
    this.process = backendProcess
    this.setupEventHandlers()
  }

  private setupEventHandlers(): void {
    if (!this.process) return

    this.process.on('data', (data: string) => {
      this.emit('data', data)
    })

    this.process.on('exit', ({ exitCode }: { exitCode: number }) => {
      this._isRunning = false
      this.emit('exit', exitCode)
    })

    this.process.on('error', (error: Error) => {
      this._isRunning = false
      this.emit('error', error)
    })
  }

  spawn(): void {
    this._isRunning = true
    // Process is already spawned by the factory
    this.emit('spawn')
  }

  write(data: string): void {
    if (this.process && this._isRunning) {
      this.process.write(data)
    }
  }

  resize(cols: number, rows: number): void {
    if (this.process && this.capabilities.supportsResize) {
      this.process.resize?.(cols, rows)
    }
  }

  kill(): void {
    if (this.process) {
      this.process.kill()
      this._isRunning = false
    }
  }

  get pid(): number | undefined {
    return this.process?.pid
  }

  get isRunning(): boolean {
    return this._isRunning
  }
}

class TerminalStrategyManager {
  private static instance: TerminalStrategyManager
  private cachedCapabilities: TerminalCapabilities | null = null

  static getInstance(): TerminalStrategyManager {
    if (!TerminalStrategyManager.instance) {
      TerminalStrategyManager.instance = new TerminalStrategyManager()
    }
    return TerminalStrategyManager.instance
  }

  async detectBestStrategy(): Promise<TerminalCapabilities> {
    if (this.cachedCapabilities) {
      return this.cachedCapabilities
    }

    console.log('[Enhanced Terminal Strategy] Detecting best backend...')

    this.cachedCapabilities = await BackendDetector.detectBestBackend()

    console.log(
      `[Enhanced Terminal Strategy] Selected: ${this.cachedCapabilities.backend}`
    )
    console.log(
      `[Enhanced Terminal Strategy] Capabilities: ${BackendDetector.getCapabilitiesDescription(this.cachedCapabilities)}`
    )

    return this.cachedCapabilities
  }

  async createTerminal(
    id: string,
    options: TerminalOptions = {}
  ): Promise<TerminalCreateResult> {
    try {
      console.log(`[Enhanced Terminal Strategy] Creating terminal ${id}...`)

      // Use the enhanced terminal factory to create the best available terminal
      const result = await EnhancedTerminalFactory.createTerminal({
        shell: options.shell,
        cwd: options.cwd || process.cwd(),
        env: options.env,
        cols: options.cols || 80,
        rows: options.rows || 24,
      })

      console.log(
        `[Enhanced Terminal Strategy] Created terminal ${id} with ${result.capabilities.backend} backend`
      )

      // Wrap the backend process in our TerminalInterface interface
      const terminal = new EnhancedTerminalWrapper(
        id,
        result.process,
        result.capabilities
      )

      // Map backend to strategy enum for backward compatibility
      let strategy: TerminalStrategy
      switch (result.capabilities.backend) {
        case 'node-pty':
          strategy = TerminalStrategy.NODE_PTY
          break
        case 'conpty':
          strategy = TerminalStrategy.CONPTY
          break
        case 'winpty':
          strategy = TerminalStrategy.WINPTY
          break
        case 'subprocess':
          strategy = TerminalStrategy.SUBPROCESS
          break
        default:
          strategy = TerminalStrategy.SUBPROCESS
      }

      return {
        terminal,
        strategy,
        capabilities: result.capabilities,
        fallbackReason:
          result.capabilities.reliability !== 'high'
            ? `Using ${result.capabilities.backend} backend (${result.capabilities.reliability} reliability)`
            : undefined,
      }
    } catch (error) {
      console.error(
        `[Enhanced Terminal Strategy] Failed to create terminal ${id}:`,
        error
      )
      throw error
    }
  }

  getActiveStrategy(): TerminalStrategy | null {
    if (!this.cachedCapabilities) {
      return null
    }

    switch (this.cachedCapabilities.backend) {
      case 'node-pty':
        return TerminalStrategy.NODE_PTY
      case 'conpty':
        return TerminalStrategy.CONPTY
      case 'winpty':
        return TerminalStrategy.WINPTY
      case 'subprocess':
        return TerminalStrategy.SUBPROCESS
      default:
        return TerminalStrategy.SUBPROCESS
    }
  }

  getCapabilities(): TerminalCapabilities | null {
    return this.cachedCapabilities
  }

  getFallbackReason(): string | null {
    if (!this.cachedCapabilities) {
      return null
    }

    return this.cachedCapabilities.reliability !== 'high'
      ? `Using ${this.cachedCapabilities.backend} backend (${this.cachedCapabilities.reliability} reliability)`
      : null
  }

  // Force refresh of backend detection (useful for testing or if system changes)
  async refreshStrategy(): Promise<TerminalCapabilities> {
    console.log('[Enhanced Terminal Strategy] Refreshing backend detection...')
    this.cachedCapabilities = null
    return this.detectBestStrategy()
  }

  // Test all available backends
  async testAllBackends(): Promise<
    Record<string, { available: boolean; error?: string }>
  > {
    console.log(
      '[Enhanced Terminal Strategy] Testing all available backends...'
    )
    return EnhancedTerminalFactory.testAllBackends()
  }
}

// Export singleton instance
export const terminalStrategy = TerminalStrategyManager.getInstance()

// Export factory function for easy usage
export async function createTerminal(
  id: string,
  options: TerminalOptions = {}
): Promise<TerminalCreateResult> {
  return terminalStrategy.createTerminal(id, options)
}
