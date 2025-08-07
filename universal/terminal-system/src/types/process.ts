import type { IPty } from 'node-pty'
import type { TerminalCapabilities } from '../core/BackendDetector'
import type { BackendProcess } from '../core/TerminalBackend'

/**
 * Process information for a terminal
 */
export interface ProcessInfo {
  pid: number
  ppid?: number
  name: string
  cmd: string
  cwd: string
  env: Record<string, string>
  startTime: Date
}

/**
 * Terminal process wrapper
 */
export interface TerminalProcess {
  id: string
  pty: IPty | BackendProcess // Support both legacy IPty and new BackendProcess
  info: ProcessInfo
  state: 'starting' | 'running' | 'exited' | 'error'
  exitCode?: number
  error?: Error
  capabilities?: TerminalCapabilities // Track backend capabilities
}

/**
 * Process spawn options
 */
export interface ProcessSpawnOptions {
  shell?: string
  cwd?: string
  env?: Record<string, string>
  cols?: number
  rows?: number
  encoding?: BufferEncoding
}

/**
 * Process event data
 */
export interface ProcessEvent {
  type: 'data' | 'exit' | 'error'
  data?: string
  exitCode?: number
  error?: Error
  timestamp: Date
}
