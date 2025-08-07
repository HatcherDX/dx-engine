// Terminal and Command Types
interface TerminalOptions {
  name?: string
  cwd?: string
  shell?: string
  args?: string[]
}

interface Terminal {
  id: string
  name: string
  pid: number
  cwd?: string
  shell?: string
  isActive?: boolean
}

interface CommandOptions {
  cwd?: string
  env?: Record<string, string>
  timeout?: number
  shell?: boolean
}

interface CommandResult {
  stdout: string
  stderr: string
  exitCode: number
  signal?: string
}

// Git Types
interface GitStatusResult {
  branch: string
  ahead: number
  behind: number
  staged: string[]
  modified: string[]
  untracked: string[]
  conflicted: string[]
}

interface GitCommit {
  hash: string
  message: string
  author: string
  date: string
  files?: string[]
}

interface GitOptions {
  cwd?: string
  remote?: string
  branch?: string
}

// Task Types
interface TaskOptions {
  cwd?: string
  env?: Record<string, string>
  timeout?: number
}

interface Task {
  id: string
  command: string
  status: 'running' | 'completed' | 'failed' | 'cancelled'
  startTime: string
  endTime?: string
  exitCode?: number
  pid?: number
}

interface TaskStats {
  total: number
  running: number
  completed: number
  failed: number
  cancelled: number
}

export interface RenderMessage {
  /** Get username by ID */
  getUsernameById: (userID: number) => string
  /** Get system information */
  getOsInfo: () => string
  /** Window control functions */
  minimizeWindow: () => void
  maximizeWindow: () => void
  closeWindow: () => void
  /** Get window state */
  isWindowMaximized: () => boolean

  // Terminal management IPC
  /** Create terminal */
  'terminal-create': (
    options?: TerminalOptions
  ) => Promise<{ id: string; name: string; pid: number }>
  /** Close terminal */
  'terminal-close': (terminalId: string) => Promise<boolean>
  /** Send input to terminal */
  'terminal-input': (data: { id: string; data: string }) => void
  /** Resize terminal */
  'terminal-resize': (data: { id: string; cols: number; rows: number }) => void
  /** Get all terminals */
  'terminal-list': () => Promise<Terminal[]>
  /** Get terminal by ID */
  'terminal-get': (terminalId: string) => Promise<Terminal | null>

  // Command API IPC - Central API for DX Engine
  /** Execute command synchronously */
  'command-execute': (
    command: string,
    options?: CommandOptions
  ) => Promise<CommandResult>
  /** Execute command with streaming */
  'command-stream': (
    command: string,
    options?: CommandOptions
  ) => Promise<string>
  /** Cancel command execution */
  'command-cancel': (executionId: string) => Promise<boolean>

  // Git API IPC (for Timeline mode)
  /** Get git status */
  'git-status': (options?: GitOptions) => Promise<GitStatusResult>
  /** Get git log */
  'git-log': (count?: number, options?: GitOptions) => Promise<GitCommit[]>
  /** Git add files */
  'git-add': (files: string[], options?: GitOptions) => Promise<CommandResult>
  /** Git commit */
  'git-commit': (
    message: string,
    options?: GitOptions
  ) => Promise<CommandResult>
  /** Git push */
  'git-push': (options?: GitOptions) => Promise<CommandResult>
  /** Git pull */
  'git-pull': (options?: GitOptions) => Promise<CommandResult>
  /** Git quick commit */
  'git-quick-commit': (
    message: string,
    options?: GitOptions
  ) => Promise<CommandResult>

  // Task API IPC (for Background Tasks)
  /** Run background task */
  'task-run-background': (
    command: string,
    options?: TaskOptions
  ) => Promise<string>
  /** Get all tasks */
  'task-get-all': () => Promise<Task[]>
  /** Get task by ID */
  'task-get': (taskId: string) => Promise<Task | null>
  /** Cancel task */
  'task-cancel': (taskId: string) => Promise<boolean>
  /** Get task statistics */
  'task-get-stats': () => Promise<TaskStats>
  /** Clear completed tasks */
  'task-clear-completed': () => Promise<boolean>
}
