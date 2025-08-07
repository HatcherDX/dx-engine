// Result type for command operations
interface CommandResult {
  stdout: string
  stderr: string
  exitCode: number
  signal?: string
}

// Task result type
interface TaskResult {
  output: string
  exitCode: number
  duration: number
}

export interface MainMessage {
  /** New user joined */
  newUserJoin: (userID: number) => string
  /** Platform simulation event from Development menu */
  'simulate-platform': (platform: 'macos' | 'windows' | 'linux') => void

  // Terminal system events
  /** Terminal created */
  'terminal-created': (data: { id: string; name: string; pid: number }) => void
  /** Terminal closed */
  'terminal-closed': (data: { id: string }) => void
  /** Terminal data output */
  'terminal-data': (data: { id: string; data: string }) => void
  /** Terminal exit */
  'terminal-exit': (data: { id: string; exitCode: number }) => void
  /** Terminal error */
  'terminal-error': (data: { id: string; error: string }) => void

  // Command system events
  /** Command started */
  'command-start': (data: { id: string; command: string }) => void
  /** Command output */
  'command-output': (data: {
    id: string
    data: string
    stream: 'stdout' | 'stderr'
  }) => void
  /** Command completed */
  'command-complete': (data: { id: string; result: CommandResult }) => void
  /** Command error */
  'command-error': (data: { id: string; error: string }) => void

  // Task system events
  /** Task started */
  'task-start': (data: { id: string; command: string }) => void
  /** Task output */
  'task-output': (data: {
    id: string
    data: string
    stream: 'stdout' | 'stderr'
  }) => void
  /** Task completed */
  'task-complete': (data: { id: string; result: TaskResult }) => void
}
