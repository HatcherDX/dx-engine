/**
 * @fileoverview Base command runner for executing shell commands with comprehensive management.
 *
 * @description
 * CommandRunner provides a robust foundation for executing shell commands with features including
 * event-driven execution, timeout handling, streaming output, process cancellation, and comprehensive
 * logging. It serves as the base class for specialized command runners like GitRunner and TaskRunner.
 *
 * @example
 * ```typescript
 * const runner = new CommandRunner()
 *
 * // Execute a command and wait for completion
 * const result = await runner.execute('ls -la', { cwd: '/home/user' })
 * if (result.success) {
 *   console.log('Output:', result.stdout)
 * }
 *
 * // Stream a long-running command
 * const executionId = await runner.stream('npm install')
 * runner.on('command-output', (id, output) => {
 *   if (id === executionId) console.log(output)
 * })
 * ```
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import { spawn } from 'node:child_process'
import { v4 as uuidv4 } from 'uuid'
import { EventEmitter } from '../core/EventEmitter'
import { Logger } from '../utils/logger'
import type {
  CommandOptions,
  CommandResult,
  CommandEvents,
  CommandRunner as CommandRunnerInterface,
} from '../types/commands'

/**
 * Base command runner that provides shell command execution with event-driven architecture.
 *
 * @remarks
 * This class extends {@link EventEmitter} to provide real-time command execution events.
 * It manages multiple concurrent command executions, tracks their state, and provides
 * methods for cancellation and status monitoring. All executions are logged for debugging.
 *
 * @public
 */
export class CommandRunner
  extends EventEmitter<CommandEvents>
  implements CommandRunnerInterface
{
  /** Map of active command executions indexed by execution ID */
  private executions = new Map<string, CommandExecution>()

  /** Logger instance for command execution events */
  protected logger = new Logger('CommandRunner')

  /**
   * Executes a shell command and waits for its completion.
   *
   * @remarks
   * This method spawns a child process to execute the command and returns a Promise
   * that resolves when the command completes. It emits events throughout the execution
   * lifecycle and handles timeouts, errors, and cleanup automatically.
   *
   * @param command - The shell command to execute
   * @param options - Configuration options for command execution
   * @returns Promise resolving to {@link CommandResult} with execution details
   *
   * @throws Does not throw but returns failed CommandResult on error
   *
   * @example
   * ```typescript
   * // Simple command execution
   * const result = await runner.execute('echo "Hello World"')
   * console.log(result.stdout) // "Hello World"
   *
   * // Command with options
   * const result = await runner.execute('pwd', {
   *   cwd: '/home/user',
   *   timeout: 5000
   * })
   * ```
   *
   * @fires CommandEvents#command-start When command execution begins
   * @fires CommandEvents#command-output When command produces output
   * @fires CommandEvents#command-complete When command completes successfully
   * @fires CommandEvents#command-error When command fails or times out
   *
   * @public
   */
  async execute(
    command: string,
    options: CommandOptions = {}
  ): Promise<CommandResult> {
    const executionId = uuidv4()
    const startTime = Date.now()

    this.logger.info(`Executing command: ${command}`)
    this.emit('command-start', executionId, command)

    try {
      const result = await this.runCommand(command, options, executionId)
      const duration = Date.now() - startTime

      const commandResult: CommandResult = {
        ...result,
        duration,
        command,
      }

      this.emit('command-complete', executionId, commandResult)
      this.executions.delete(executionId)

      return commandResult
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error))
      this.logger.error('Command execution failed:', errorObj)
      this.emit('command-error', executionId, errorObj)
      this.executions.delete(executionId)

      return {
        success: false,
        exitCode: -1,
        stdout: '',
        stderr: (error as Error).message,
        duration: Date.now() - startTime,
        command,
      }
    }
  }

  async stream(command: string, options: CommandOptions = {}): Promise<string> {
    const executionId = uuidv4()
    this.logger.info(`Streaming command: ${command}`)

    // Start command in background and return execution ID immediately
    this.runCommandStream(command, options, executionId).catch((error) => {
      this.logger.error('Streamed command failed:', error)
      this.emit(
        'command-error',
        executionId,
        error instanceof Error ? error : new Error(String(error))
      )
    })

    return executionId
  }

  async cancel(executionId: string): Promise<boolean> {
    const execution = this.executions.get(executionId)
    if (!execution) {
      return false
    }

    try {
      execution.process.kill('SIGTERM')
      this.executions.delete(executionId)
      this.logger.info(`Command ${executionId} cancelled`)
      return true
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error))
      this.logger.error(`Failed to cancel command ${executionId}:`, errorObj)
      return false
    }
  }

  async getStatus(executionId: string): Promise<CommandResult | null> {
    const execution = this.executions.get(executionId)
    if (!execution) {
      return null
    }

    return {
      success: execution.exitCode === 0,
      exitCode: execution.exitCode ?? -1,
      stdout: execution.stdout,
      stderr: execution.stderr,
      duration: Date.now() - execution.startTime,
      command: execution.command,
    }
  }

  private async runCommand(
    command: string,
    options: CommandOptions,
    executionId: string
  ): Promise<Omit<CommandResult, 'duration' | 'command'>> {
    return new Promise((resolve, reject) => {
      const { shell = process.platform === 'win32' ? 'cmd' : 'bash' } = options
      const args =
        process.platform === 'win32' ? ['/c', command] : ['-c', command]

      const childProcess = spawn(shell, args, {
        cwd: options.cwd || process.cwd(),
        env: { ...process.env, ...options.env },
        stdio: 'pipe',
      })

      const execution: CommandExecution = {
        process: childProcess,
        command,
        startTime: Date.now(),
        stdout: '',
        stderr: '',
        exitCode: null,
      }

      this.executions.set(executionId, execution)

      childProcess.stdout?.on('data', (data: Buffer) => {
        const output = data.toString()
        execution.stdout += output
        this.emit('command-output', executionId, output, 'stdout')
      })

      childProcess.stderr?.on('data', (data: Buffer) => {
        const output = data.toString()
        execution.stderr += output
        this.emit('command-output', executionId, output, 'stderr')
      })

      childProcess.on('close', (code) => {
        execution.exitCode = code ?? -1
        resolve({
          success: code === 0,
          exitCode: code ?? -1,
          stdout: execution.stdout,
          stderr: execution.stderr,
        })
      })

      childProcess.on('error', (error) => {
        reject(error)
      })

      // Handle timeout
      if (options.timeout) {
        setTimeout(() => {
          if (this.executions.has(executionId)) {
            childProcess.kill('SIGTERM')
            reject(new Error(`Command timed out after ${options.timeout}ms`))
          }
        }, options.timeout)
      }
    })
  }

  private async runCommandStream(
    command: string,
    options: CommandOptions,
    executionId: string
  ): Promise<void> {
    const { shell = process.platform === 'win32' ? 'cmd' : 'bash' } = options
    const args =
      process.platform === 'win32' ? ['/c', command] : ['-c', command]

    const childProcess = spawn(shell, args, {
      cwd: options.cwd || process.cwd(),
      env: { ...process.env, ...options.env },
      stdio: 'pipe',
    })

    const execution: CommandExecution = {
      process: childProcess,
      command,
      startTime: Date.now(),
      stdout: '',
      stderr: '',
      exitCode: null,
    }

    this.executions.set(executionId, execution)
    this.emit('command-start', executionId, command)

    childProcess.stdout?.on('data', (data: Buffer) => {
      const output = data.toString()
      execution.stdout += output
      this.emit('command-output', executionId, output, 'stdout')
    })

    childProcess.stderr?.on('data', (data: Buffer) => {
      const output = data.toString()
      execution.stderr += output
      this.emit('command-output', executionId, output, 'stderr')
    })

    childProcess.on('close', (code) => {
      execution.exitCode = code ?? -1
      const result: CommandResult = {
        success: code === 0,
        exitCode: code ?? -1,
        stdout: execution.stdout,
        stderr: execution.stderr,
        duration: Date.now() - execution.startTime,
        command,
      }
      this.emit('command-complete', executionId, result)
      this.executions.delete(executionId)
    })

    childProcess.on('error', (error) => {
      this.emit('command-error', executionId, error)
      this.executions.delete(executionId)
    })
  }

  // Cleanup method
  cleanup(): void {
    for (const [executionId, execution] of this.executions) {
      try {
        execution.process.kill('SIGTERM')
      } catch (error) {
        this.logger.error(
          `Failed to kill process ${executionId}:`,
          error instanceof Error ? error : new Error(String(error))
        )
      }
    }
    this.executions.clear()
  }
}

interface CommandExecution {
  process: ReturnType<typeof spawn>
  command: string
  startTime: number
  stdout: string
  stderr: string
  exitCode: number | null
}
