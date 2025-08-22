#!/usr/bin/env tsx
/**
 * @fileoverview Development watch script for dx-engine
 *
 * @description
 * Orchestrates development environment with turbo:
 * - Starts all apps in development mode
 * - Supports watch mode with hot reload
 * - Runs packages in parallel for performance
 * - Handles graceful shutdown signals
 * - Provides clear console feedback
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import { spawn, ChildProcess } from 'child_process'
import { join } from 'path'

// Types
export interface WatchConfig {
  watch?: boolean
  parallel?: boolean
  stdio?: 'inherit' | 'pipe' | 'ignore'
  cwd?: string
  shell?: boolean
  argv?: string[]
}

export interface WatchState {
  turboProcess: ChildProcess | null
  isWatchMode: boolean
}

// State management
export const state: WatchState = {
  turboProcess: null,
  isWatchMode: false,
}

/**
 * Builds turbo command arguments based on configuration
 *
 * @param config - Watch configuration options
 * @returns Array of command arguments for turbo
 *
 * @example
 * ```typescript
 * const args = buildTurboArgs({ watch: true, parallel: true })
 * console.log(args) // ['run', 'dev', '--parallel', '--watch']
 * ```
 */
export function buildTurboArgs(config: WatchConfig = {}): string[] {
  const args = ['run', 'dev']

  if (config.parallel !== false) {
    args.push('--parallel')
  }

  if (config.watch) {
    args.push('--watch')
  }

  return args
}

/**
 * Determines if watch mode is enabled from command line arguments
 *
 * @param argv - Command line arguments array
 * @returns True if watch mode is enabled
 *
 * @example
 * ```typescript
 * const watchEnabled = isWatchMode(['node', 'script.ts', '--watch'])
 * console.log(watchEnabled) // true
 * ```
 */
export function isWatchMode(argv: string[] = process.argv): boolean {
  return argv.includes('--watch')
}

/**
 * Starts the turbo development process
 *
 * @param config - Watch configuration options
 * @returns The spawned turbo process
 *
 * @throws {Error} When turbo fails to start
 *
 * @example
 * ```typescript
 * const turbo = startTurbo({ watch: true, parallel: true })
 * turbo.on('exit', (code) => console.log(`Exited with ${code}`))
 * ```
 */
export function startTurbo(config: WatchConfig = {}): ChildProcess {
  const turboArgs = buildTurboArgs(config)

  console.log('🚀 Starting DX Engine development environment...')

  if (config.watch) {
    console.log('👀 Watch mode enabled')
    state.isWatchMode = true
  }

  const turbo = spawn('turbo', turboArgs, {
    stdio: config.stdio || 'inherit',
    cwd: config.cwd || process.cwd(),
    shell: config.shell !== false,
  })

  state.turboProcess = turbo

  turbo.on('error', (error) => {
    console.error('❌ Failed to start turbo:', error.message)
    process.exit(1)
  })

  turbo.on('exit', (code) => {
    console.log(`🏁 Turbo exited with code ${code}`)
    process.exit(code || 0)
  })

  return turbo
}

/**
 * Handles graceful shutdown of the turbo process
 *
 * @param signal - The signal received (SIGINT or SIGTERM)
 *
 * @example
 * ```typescript
 * handleShutdown('SIGINT')
 * ```
 */
export function handleShutdown(signal: NodeJS.Signals): void {
  console.log(`\n⏹️  Shutting down development environment (${signal})...`)

  if (state.turboProcess) {
    state.turboProcess.kill(signal)
  }
}

/**
 * Registers process signal handlers for graceful shutdown
 *
 * @example
 * ```typescript
 * registerSignalHandlers()
 * ```
 */
export function registerSignalHandlers(): void {
  process.on('SIGINT', () => handleShutdown('SIGINT'))
  process.on('SIGTERM', () => handleShutdown('SIGTERM'))
}

/**
 * Main function to orchestrate the watch script
 *
 * @param config - Watch configuration options
 *
 * @example
 * ```typescript
 * main({ watch: true })
 * ```
 */
export function main(config: WatchConfig = {}): void {
  // Merge config with command line arguments
  const finalConfig: WatchConfig = {
    ...config,
    watch: config.watch ?? isWatchMode(config.argv),
    parallel: config.parallel ?? true,
  }

  // Start turbo with configuration
  startTurbo(finalConfig)

  // Register signal handlers
  registerSignalHandlers()
}

// Run the main function only if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}
