// Command system types for unified API
export interface CommandOptions {
  cwd?: string
  env?: Record<string, string>
  timeout?: number
  shell?: string
}

export interface CommandResult {
  success: boolean
  exitCode: number
  stdout: string
  stderr: string
  duration: number
  command: string
}

export interface CommandProgress {
  stage?: string
  progress?: number
  percentage?: number
  message: string
  current?: number
  total?: number
}

// Git-specific command types
export interface GitCommandOptions extends CommandOptions {
  repository?: string
  branch?: string
  remote?: string
}

export interface GitStatus {
  branch: string
  ahead: number
  behind: number
  modified: string[]
  staged: string[]
  untracked: string[]
  conflicted: string[]
}

export interface GitCommit {
  hash: string
  author: string
  date: string
  message: string
  files: string[]
}

// Task-specific command types
export interface TaskCommandOptions extends CommandOptions {
  background?: boolean
  priority?: 'low' | 'normal' | 'high'
  category?: 'build' | 'test' | 'deploy' | 'analysis' | 'other'
}

export interface BackgroundTask {
  id: string
  command: string
  status: 'running' | 'completed' | 'failed' | 'cancelled'
  startTime: Date
  endTime?: Date
  progress?: CommandProgress
  result?: CommandResult
}

// Command runner event types - Record<string, unknown[]> for EventMap compatibility
export interface CommandEvents extends Record<string, unknown[]> {
  'command-start': [string, string] // id, command
  'command-progress': [string, CommandProgress] // id, progress
  'command-output': [string, string, 'stdout' | 'stderr'] // id, data, stream
  'command-complete': [string, CommandResult] // id, result
  'command-error': [string, Error] // id, error
}

// API method signatures
export interface CommandRunner {
  execute(command: string, options?: CommandOptions): Promise<CommandResult>
  stream(command: string, options?: CommandOptions): Promise<string> // returns execution ID
  cancel(executionId: string): Promise<boolean>
  getStatus(executionId: string): Promise<CommandResult | null>
}

export interface GitRunner extends CommandRunner {
  status(options?: GitCommandOptions): Promise<GitStatus>
  log(count?: number, options?: GitCommandOptions): Promise<GitCommit[]>
  add(files: string[], options?: GitCommandOptions): Promise<CommandResult>
  commit(message: string, options?: GitCommandOptions): Promise<CommandResult>
  push(options?: GitCommandOptions): Promise<CommandResult>
  pull(options?: GitCommandOptions): Promise<CommandResult>
  branch(options?: GitCommandOptions): Promise<string[]>
  checkout(branch: string, options?: GitCommandOptions): Promise<CommandResult>
  quickCommit(
    message: string,
    options?: GitCommandOptions
  ): Promise<CommandResult>
}

export interface TaskRunner extends CommandRunner {
  runBackground(command: string, options?: TaskCommandOptions): Promise<string> // returns task ID
  getTasks(): Promise<BackgroundTask[]>
  getTask(taskId: string): Promise<BackgroundTask | null>
  cancelTask(taskId: string): Promise<boolean>
  clearCompleted(): Promise<void>
  getTaskStats(): Promise<{
    total: number
    running: number
    completed: number
    failed: number
    cancelled: number
  }>
}
