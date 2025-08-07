/**
 * Terminal instance configuration
 */
export interface TerminalConfig {
  id: string
  name?: string
  shell?: string
  cwd?: string
  env?: Record<string, string>
  cols?: number
  rows?: number
}

/**
 * Terminal instance state
 */
export interface TerminalState {
  id: string
  name: string
  isActive: boolean
  isRunning: boolean
  pid?: number
  exitCode?: number
  createdAt: Date
  lastActivity: Date
}

/**
 * Terminal data event
 */
export interface TerminalDataEvent {
  id: string
  data: string
  timestamp: Date
}

/**
 * Terminal lifecycle events
 */
export interface TerminalLifecycleEvent {
  id: string
  event: 'created' | 'started' | 'exited' | 'error'
  data?: unknown
  timestamp: Date
}

/**
 * Terminal resize configuration
 */
export interface TerminalResize {
  id: string
  cols: number
  rows: number
}

/**
 * Terminal options for creation
 */
export interface CreateTerminalOptions {
  name?: string
  shell?: string
  cwd?: string
  env?: Record<string, string>
  cols?: number
  rows?: number
}
