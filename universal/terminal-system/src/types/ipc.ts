/**
 * IPC channel names for terminal communication
 */
export const IPC_CHANNELS = {
  // Main -> Renderer
  TERMINAL_CREATED: 'terminal-created',
  TERMINAL_DATA: 'terminal-data',
  TERMINAL_EXIT: 'terminal-exit',
  TERMINAL_ERROR: 'terminal-error',

  // Renderer -> Main
  CREATE_TERMINAL: 'create-terminal',
  TERMINAL_INPUT: 'terminal-input',
  CLOSE_TERMINAL: 'close-terminal',
  RESIZE_TERMINAL: 'resize-terminal',
  LIST_TERMINALS: 'list-terminals',
} as const

/**
 * IPC message for creating a terminal
 */
export interface CreateTerminalMessage {
  name?: string
  shell?: string
  cwd?: string
  env?: Record<string, string>
  cols?: number
  rows?: number
}

/**
 * IPC message for terminal input
 */
export interface TerminalInputMessage {
  id: string
  data: string
}

/**
 * IPC message for terminal resize
 */
export interface TerminalResizeMessage {
  id: string
  cols: number
  rows: number
}

/**
 * IPC message for terminal creation response
 */
export interface TerminalCreatedMessage {
  id: string
  name: string
  pid: number
}

/**
 * IPC message for terminal data output
 */
export interface TerminalDataMessage {
  id: string
  data: string
}

/**
 * IPC message for terminal exit
 */
export interface TerminalExitMessage {
  id: string
  exitCode: number
}

/**
 * IPC message for terminal error
 */
export interface TerminalErrorMessage {
  id: string
  error: string
}
