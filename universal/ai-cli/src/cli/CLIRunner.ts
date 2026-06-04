/**
 * @fileoverview Generic CLI command executor.
 *
 * @description
 * Provides a generic interface for executing CLI commands with support for
 * synchronous execution, streaming output, and proper error handling.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import { spawn } from 'node:child_process'
import { createInterface } from 'node:readline'
import type { CLIOptions, CLIResult } from '../core/types'

/**
 * Generic CLI command executor.
 *
 * @remarks
 * This class provides methods for executing CLI commands both synchronously
 * (waiting for full output) and asynchronously (streaming line by line).
 * Used by all AI providers to interact with their respective CLIs.
 *
 * @example
 * ```typescript
 * const runner = new CLIRunner()
 *
 * // Synchronous execution
 * const result = await runner.execute('echo', ['Hello, World!'])
 * console.log(result.stdout) // "Hello, World!\n"
 *
 * // Streaming execution
 * for await (const line of runner.streamExecute('claude', ['-p', 'test'])) {
 *   console.log(line)
 * }
 * ```
 *
 * @public
 */
export class CLIRunner {
  /**
   * Execute CLI command and wait for complete output.
   *
   * @param command - Command to execute
   * @param args - Command arguments
   * @param options - Execution options
   * @returns Promise resolving to command result
   *
   * @remarks
   * This method waits for the command to complete and returns
   * the full stdout, stderr, and exit code.
   *
   * @example
   * ```typescript
   * const result = await runner.execute('git', ['status'])
   * if (result.exitCode === 0) {
   *   console.log('Success:', result.stdout)
   * }
   * ```
   *
   * @public
   */
  async execute(
    command: string,
    args: string[],
    options: CLIOptions = {}
  ): Promise<CLIResult> {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        cwd: options.cwd || process.cwd(),
        env: { ...process.env, ...options.env },
        shell: false,
      })

      let stdout = ''
      let stderr = ''
      let timeoutId: NodeJS.Timeout | undefined

      // Set timeout if specified
      if (options.timeout) {
        timeoutId = setTimeout(() => {
          child.kill('SIGTERM')
          reject(new Error(`Command timed out after ${options.timeout}ms`))
        }, options.timeout)
      }

      // Write input to stdin if provided
      if (options.input) {
        child.stdin.write(options.input)
        child.stdin.end()
      }

      // Collect stdout
      child.stdout.on('data', (data: Buffer) => {
        stdout += data.toString()
      })

      // Collect stderr
      child.stderr.on('data', (data: Buffer) => {
        stderr += data.toString()
      })

      // Handle completion
      child.on('close', (exitCode: number | null) => {
        if (timeoutId) {
          clearTimeout(timeoutId)
        }

        resolve({
          stdout,
          stderr,
          exitCode: exitCode || 0,
        })
      })

      // Handle errors
      child.on('error', (error: Error) => {
        if (timeoutId) {
          clearTimeout(timeoutId)
        }
        reject(error)
      })
    })
  }

  /**
   * Stream CLI output line by line in real-time.
   *
   * @param command - Command to execute
   * @param args - Command arguments
   * @param options - Execution options
   * @returns Async generator yielding output lines
   *
   * @remarks
   * This method streams output from the CLI as it's generated,
   * yielding complete lines. Useful for processing streaming
   * responses from AI CLIs.
   *
   * @example
   * ```typescript
   * for await (const line of runner.streamExecute('claude', [...args])) {
   *   const data = JSON.parse(line)
   *   console.log(data)
   * }
   * ```
   *
   * @public
   */
  async *streamExecute(
    command: string,
    args: string[],
    options: CLIOptions = {}
  ): AsyncGenerator<string> {
    const child = spawn(command, args, {
      cwd: options.cwd || process.cwd(),
      env: { ...process.env, ...options.env },
      shell: false,
    })

    // Write input to stdin if provided
    if (options.input) {
      child.stdin.write(options.input)
      child.stdin.end()
    }

    // Create readline interface for line-by-line reading
    const reader = createInterface({
      input: child.stdout,
      crlfDelay: Infinity, // Treat \r\n as single line break
    })

    // Also collect stderr for error reporting
    let stderrOutput = ''
    child.stderr.on('data', (data: Buffer) => {
      const text = data.toString()
      stderrOutput += text
      console.error('[CLIRunner] stderr:', text.trim())
    })

    // Yield lines as they arrive
    try {
      for await (const line of reader) {
        yield line
      }
    } catch (error) {
      // If there was stderr output, include it in the error
      if (stderrOutput) {
        throw new Error(
          `CLI execution failed: ${error instanceof Error ? error.message : 'Unknown error'}\nStderr: ${stderrOutput}`
        )
      }
      throw error
    }

    // Wait for process to exit
    await new Promise<void>((resolve, reject) => {
      child.on('close', (exitCode: number | null) => {
        if (exitCode !== 0) {
          reject(
            new Error(
              `Command exited with code ${exitCode}${stderrOutput ? `\nStderr: ${stderrOutput}` : ''}`
            )
          )
        } else {
          resolve()
        }
      })

      child.on('error', reject)
    })
  }
}
