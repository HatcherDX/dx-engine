/**
 * @fileoverview Git Command Logger implementing Causa-Efecto pattern.
 *
 * @description
 * Wrapper system for git-genius operations that provides complete traceability
 * by logging both command execution (causa) and results (efecto).
 * Integrates with SystemLogger to route events to Timeline terminal.
 *
 * @example
 * ```typescript
 * const gitLogger = new GitCommandLogger(gitRunner)
 *
 * // This will log both command and result:
 * // [CMD] git-genius.status()
 * // [GIT] Status updated: 3 files modified, 1 staged
 * const status = await gitLogger.status()
 * ```
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import type { GitCommit, GitStatus } from '../types/commands'
import type { SystemLogger } from './SystemLogger'
import { systemLogger } from './SystemLogger'

/**
 * Git operation result types for structured logging.
 *
 * @public
 */
export interface GitOperationResult {
  /** Success status */
  success: boolean
  /** Human-readable result message */
  message: string
  /** Raw operation data */
  data?: unknown
  /** Error information (if operation failed) */
  error?: Error
  /** Operation execution time in milliseconds */
  executionTime?: number
}

/**
 * Git operation context for enhanced logging.
 *
 * @public
 */
export interface GitOperationContext {
  /** Git command being executed */
  command?: string
  /** Working directory */
  cwd?: string
  /** Additional metadata */
  metadata?: Record<string, unknown>
}

/**
 * GitCommandLogger - Causa-Efecto logging wrapper for git operations.
 *
 * @remarks
 * This class implements the Causa-Efecto (Cause-Effect) pattern by:
 * 1. Logging command execution BEFORE operation (Causa)
 * 2. Executing the actual git operation
 * 3. Logging human-readable result AFTER operation (Efecto)
 *
 * All events are automatically routed to the Timeline terminal for
 * complete git activity visibility.
 *
 * @example
 * ```typescript
 * // Direct usage
 * const gitLogger = new GitCommandLogger()
 *
 * // Wrap any git operation
 * const result = await gitLogger.wrapGitOperation(
 *   'status',
 *   () => gitRunner.getStatus(),
 *   []
 * )
 *
 * // Or use convenience methods
 * await gitLogger.loggedOperation('commit',
 *   () => gitRunner.commit(message),
 *   [message]
 * )
 * ```
 *
 * @public
 */
export class GitCommandLogger {
  private logger: SystemLogger
  private operationCounter = 0

  /**
   * Create GitCommandLogger instance.
   *
   * @param logger - SystemLogger instance (optional, uses default)
   *
   * @public
   */
  constructor(logger?: SystemLogger) {
    this.logger = logger || systemLogger
  }

  /**
   * Wrap any git operation with Causa-Efecto logging.
   *
   * @param operationName - Name of git operation (e.g., 'status', 'commit')
   * @param operation - Async function that performs the git operation
   * @param args - Arguments passed to the operation (for logging)
   * @param context - Additional operation context
   * @returns Promise resolving to GitOperationResult
   *
   * @throws {Error} Re-throws original operation errors after logging
   *
   * @example
   * ```typescript
   * const result = await gitLogger.wrapGitOperation(
   *   'status',
   *   () => gitRunner.getStatus(),
   *   [],
   *   { cwd: '/project/path' }
   * )
   *
   * if (result.success) {
   *   console.log('Git status:', result.data)
   * }
   * ```
   *
   * @public
   */
  public async wrapGitOperation<T>(
    operationName: string,
    operation: () => Promise<T>,
    args?: unknown[],
    context?: GitOperationContext
  ): Promise<GitOperationResult & { data?: T }> {
    this.operationCounter++
    const startTime = Date.now()
    const operationId = `git-${this.operationCounter.toString().padStart(4, '0')}`

    try {
      // Log CAUSA (command execution)
      this.logger.logCommand(`git-genius.${operationName}`, args, 'timeline')

      // Execute the actual git operation
      const result = await operation()
      const executionTime = Date.now() - startTime

      // Determine human-readable message based on operation and result
      const message = this.formatSuccessMessage(
        operationName,
        result,
        executionTime
      )

      // Log EFECTO (successful result)
      this.logger.logResult('GIT', message, 'timeline', {
        operationId,
        executionTime,
        context,
        resultType: typeof result,
      })

      return {
        success: true,
        message,
        data: result,
        executionTime,
      }
    } catch (error) {
      const executionTime = Date.now() - startTime
      const errorMessage = this.formatErrorMessage(
        operationName,
        error as Error
      )

      // Log EFECTO (error result)
      this.logger.logResult('ERROR', errorMessage, 'timeline', {
        operationId,
        executionTime,
        context,
        error:
          error instanceof Error
            ? {
                name: error.name,
                message: error.message,
                stack: error.stack,
              }
            : String(error),
      })

      return {
        success: false,
        message: errorMessage,
        error: error as Error,
        executionTime,
      }
    }
  }

  /**
   * Log a git operation with automatic result formatting.
   *
   * @param operationName - Name of git operation
   * @param operation - Async function that performs the operation
   * @param args - Operation arguments
   * @param successMessageFormatter - Custom success message formatter
   * @returns Promise resolving to operation result
   *
   * @example
   * ```typescript
   * const status = await gitLogger.loggedOperation(
   *   'status',
   *   () => gitRunner.getStatus(),
   *   [],
   *   (result) => `Repository status: ${result.modified.length} modified files`
   * )
   * ```
   *
   * @public
   */
  public async loggedOperation<T>(
    operationName: string,
    operation: () => Promise<T>,
    args?: unknown[],
    successMessageFormatter?: (result: T) => string
  ): Promise<T> {
    const result = await this.wrapGitOperation(operationName, operation, args)

    if (!result.success) {
      throw result.error || new Error(result.message)
    }

    // Apply custom message formatting if provided
    if (successMessageFormatter && result.data !== undefined) {
      const customMessage = successMessageFormatter(result.data)
      this.logger.logResult('GIT', customMessage, 'timeline', {
        customFormatted: true,
        originalMessage: result.message,
      })
    }

    return result.data!
  }

  /**
   * Log a simple git command execution without return value.
   *
   * @param operationName - Name of git operation
   * @param command - Git command being executed
   * @param args - Command arguments
   * @returns Promise resolving when logging is complete
   *
   * @example
   * ```typescript
   * await gitLogger.logGitCommand('add', 'git add .', ['.'])
   * ```
   *
   * @public
   */
  public async logGitCommand(
    operationName: string,
    command: string,
    args?: unknown[]
  ): Promise<void> {
    // Log command execution
    this.logger.logCommand(`git.${operationName}`, args, 'timeline')

    // Log the actual git command being run
    this.logger.logResult('GIT', `Executing: ${command}`, 'timeline', {
      command,
      args,
      type: 'command-execution',
    })
  }

  /**
   * Log git operation start and return a completion logger.
   *
   * @param operationName - Name of git operation
   * @param args - Operation arguments
   * @returns Completion logger function
   *
   * @example
   * ```typescript
   * const complete = gitLogger.startGitOperation('clone', [repoUrl])
   *
   * try {
   *   const result = await performCloneOperation()
   *   complete.success('Repository cloned successfully')
   *   return result
   * } catch (error) {
   *   complete.error('Clone operation failed', error)
   *   throw error
   * }
   * ```
   *
   * @public
   */
  public startGitOperation(
    operationName: string,
    args?: unknown[]
  ): {
    success: (message: string, context?: Record<string, unknown>) => void
    error: (message: string, error?: Error) => void
  } {
    const startTime = Date.now()

    // Log operation start
    this.logger.logCommand(`git-genius.${operationName}`, args, 'timeline')

    return {
      success: (message: string, context?: Record<string, unknown>) => {
        const executionTime = Date.now() - startTime
        this.logger.logResult('GIT', message, 'timeline', {
          ...context,
          executionTime,
          operationName,
        })
      },

      error: (message: string, error?: Error) => {
        const executionTime = Date.now() - startTime
        this.logger.logResult('ERROR', message, 'timeline', {
          operationName,
          executionTime,
          error: error
            ? {
                name: error.name,
                message: error.message,
                stack: error.stack,
              }
            : undefined,
        })
      },
    }
  }

  /**
   * Format success message for git operations.
   *
   * @param operationName - Git operation name
   * @param result - Operation result data
   * @param executionTime - Execution time in milliseconds
   * @returns Formatted human-readable message
   *
   * @private
   */
  private formatSuccessMessage(
    operationName: string,
    result: unknown,
    executionTime: number
  ): string {
    const timeStr =
      executionTime > 1000
        ? `${(executionTime / 1000).toFixed(1)}s`
        : `${executionTime}ms`

    switch (operationName.toLowerCase()) {
      case 'status':
        if (typeof result === 'object' && result !== null) {
          const status = result as GitStatus
          const modifiedCount = status.modified?.length || 0
          const stagedCount = status.staged?.length || 0
          const untrackedCount = status.untracked?.length || 0

          if (modifiedCount + stagedCount + untrackedCount === 0) {
            return `Repository clean - no changes detected (${timeStr})`
          }

          const parts = []
          if (modifiedCount > 0) parts.push(`${modifiedCount} modified`)
          if (stagedCount > 0) parts.push(`${stagedCount} staged`)
          if (untrackedCount > 0) parts.push(`${untrackedCount} untracked`)

          return `Status updated: ${parts.join(', ')} (${timeStr})`
        }
        return `Repository status updated (${timeStr})`

      case 'commit':
        if (typeof result === 'object' && result !== null) {
          const commit = result as GitCommit
          const hash = commit.hash || 'unknown'
          const shortHash = hash.substring(0, 7)
          return `Commit created: ${shortHash} (${timeStr})`
        }
        return `Commit created successfully (${timeStr})`

      case 'push':
        return `Changes pushed to remote repository (${timeStr})`

      case 'pull':
        return `Changes pulled from remote repository (${timeStr})`

      case 'checkout':
      case 'switch':
        if (typeof result === 'string') {
          return `Switched to branch '${result}' (${timeStr})`
        }
        return `Branch switch completed (${timeStr})`

      case 'clone':
        return `Repository cloned successfully (${timeStr})`

      case 'add':
        if (Array.isArray(result)) {
          return `${result.length} files staged for commit (${timeStr})`
        }
        return `Files staged for commit (${timeStr})`

      case 'branch':
        if (Array.isArray(result)) {
          return `Found ${result.length} branches (${timeStr})`
        }
        return `Branch operation completed (${timeStr})`

      case 'log':
        if (Array.isArray(result)) {
          return `Retrieved ${result.length} commits from history (${timeStr})`
        }
        return `Commit history retrieved (${timeStr})`

      default:
        return `Git ${operationName} completed successfully (${timeStr})`
    }
  }

  /**
   * Format error message for git operations.
   *
   * @param operationName - Git operation name
   * @param error - Error that occurred
   * @returns Formatted error message
   *
   * @private
   */
  private formatErrorMessage(operationName: string, error: Error): string {
    const baseMessage = `Git ${operationName} failed`

    // Extract meaningful error information
    const errorMessage = error.message.toLowerCase()

    if (errorMessage.includes('not a git repository')) {
      return `${baseMessage}: not a Git repository`
    }

    if (errorMessage.includes('nothing to commit')) {
      return `${baseMessage}: nothing to commit, working tree clean`
    }

    if (errorMessage.includes('permission denied')) {
      return `${baseMessage}: permission denied`
    }

    if (
      errorMessage.includes('network') ||
      errorMessage.includes('connection')
    ) {
      return `${baseMessage}: network connection error`
    }

    if (errorMessage.includes('authentication')) {
      return `${baseMessage}: authentication required`
    }

    // Return generic error message with first line of error
    const firstLine = error.message.split('\n')[0]
    return `${baseMessage}: ${firstLine}`
  }
}

/**
 * Default git command logger instance for convenience.
 *
 * @example
 * ```typescript
 * import { gitCommandLogger } from './GitCommandLogger'
 *
 * const status = await gitCommandLogger.wrapGitOperation(
 *   'status',
 *   () => gitRunner.getStatus()
 * )
 * ```
 *
 * @public
 */
export const gitCommandLogger = new GitCommandLogger()
