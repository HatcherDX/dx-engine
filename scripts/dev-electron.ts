#!/usr/bin/env tsx
/**
 * @fileoverview Development script to run web server and Electron together
 *
 * @description
 * Orchestrates the startup of both web development server and Electron app:
 * - Starts web server first and waits for it to be ready
 * - Launches Electron once web server is available
 * - Filters out harmless DevTools console errors
 * - Handles graceful shutdown of both processes
 * - Ensures proper cleanup on exit
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import { spawn, ChildProcess } from 'child_process'
import { join } from 'path'

// Types
export interface DevElectronConfig {
  webServerDelay?: number
  platform?: NodeJS.Platform
  stdio?: 'pipe' | 'inherit' | 'ignore'
  cwd?: string
}

export interface DevElectronState {
  webServerReady: boolean
  webServer: ChildProcess | null
  electronApp: ChildProcess | null
}

// State management
export const state: DevElectronState = {
  webServerReady: false,
  webServer: null,
  electronApp: null,
}

/**
 * Checks if output should be filtered based on known harmless errors
 *
 * @param output - The output string to check
 * @returns True if output should be shown, false if it should be filtered
 *
 * @example
 * ```typescript
 * const output = "Request Autofill.enable failed"
 * console.log(shouldShowOutput(output)) // false
 * ```
 */
export function shouldShowOutput(output: string): boolean {
  const filtersToIgnore = [
    'Request Autofill.enable failed',
    'Request Autofill.setAddresses failed',
    "Unexpected token 'H'",
    'HTTP/1.1 4',
    'is not valid JSON',
    'chrome-devtools-frontend.appspot.com',
  ]

  return !filtersToIgnore.some((filter) => output.includes(filter))
}

/**
 * Starts the Electron application
 *
 * @param config - Configuration options
 * @returns The spawned Electron process
 *
 * @throws {Error} When Electron fails to start
 *
 * @example
 * ```typescript
 * const electronProcess = startElectron({
 *   platform: 'darwin',
 *   stdio: 'pipe'
 * })
 * ```
 */
export function startElectron(
  config: DevElectronConfig = {}
): ChildProcess | null {
  if (!state.webServerReady) {
    console.log('⏳ Waiting for web server to be ready...')
    return null
  }

  console.log('⚡ Starting Electron...')
  const isWin = (config.platform || process.platform) === 'win32'

  const electronApp = spawn(
    'pnpm',
    ['--filter', '@hatcherdx/dx-engine-electron', 'dev'],
    {
      stdio: config.stdio || 'pipe',
      cwd: config.cwd || process.cwd(),
      shell: isWin,
    }
  )

  state.electronApp = electronApp

  // Filter Electron output to remove harmless DevTools errors
  electronApp.stdout?.on('data', (data) => {
    const output = data.toString()
    if (shouldShowOutput(output)) {
      process.stdout.write(output)
    }
  })

  electronApp.stderr?.on('data', (data) => {
    const output = data.toString()
    if (shouldShowOutput(output)) {
      process.stderr.write(output)
    }
  })

  electronApp.on('error', (error) => {
    console.error('❌ Failed to start Electron:', error.message)
  })

  electronApp.on('exit', (code) => {
    console.log(`🏁 Electron exited with code ${code}`)
    // Kill web server when Electron exits
    if (state.webServer) {
      state.webServer.kill('SIGTERM')
    }
    process.exit(code || 0)
  })

  return electronApp
}

/**
 * Starts the web development server
 *
 * @param config - Configuration options
 * @returns The spawned web server process
 *
 * @example
 * ```typescript
 * const webServer = startWebServer({
 *   platform: 'darwin',
 *   stdio: 'pipe'
 * })
 * ```
 */
export function startWebServer(config: DevElectronConfig = {}): ChildProcess {
  console.log('📱 Starting web server...')
  const isWin = (config.platform || process.platform) === 'win32'

  const webServer = spawn(
    'pnpm',
    ['--filter', '@hatcherdx/dx-engine-web', 'dev'],
    {
      stdio: config.stdio || 'pipe',
      cwd: config.cwd || process.cwd(),
      shell: isWin,
    }
  )

  state.webServer = webServer

  webServer.stdout?.on('data', (data) => {
    const output = data.toString()
    console.log(`[Web] ${output}`)

    // Check if web server is ready
    if (output.includes('Local:') && output.includes('localhost')) {
      state.webServerReady = true
      console.log('✅ Web server is ready!')

      // Start Electron after web server is ready
      const delay = config.webServerDelay ?? 2000
      setTimeout(() => startElectron(config), delay)
    }
  })

  webServer.stderr?.on('data', (data) => {
    console.error(`[Web Error] ${data}`)
  })

  // Handle web server exit
  webServer.on('exit', (code) => {
    if (code !== 0) {
      console.error(`❌ Web server exited with code ${code}`)
      process.exit(code || 1)
    }
  })

  return webServer
}

/**
 * Handles graceful shutdown of both processes
 *
 * @param signal - The signal received
 *
 * @example
 * ```typescript
 * handleShutdown('SIGINT')
 * ```
 */
export function handleShutdown(signal: string): void {
  console.log(`\n⏹️  Shutting down development environment (${signal})...`)
  if (state.webServer) {
    state.webServer.kill('SIGTERM')
  }
  if (state.electronApp) {
    state.electronApp.kill('SIGTERM')
  }
  process.exit(0)
}

/**
 * Main function to orchestrate the development environment
 *
 * @param config - Configuration options
 *
 * @example
 * ```typescript
 * main({ webServerDelay: 3000 })
 * ```
 */
export function main(config: DevElectronConfig = {}): void {
  console.log('🚀 Starting Hatcher DX Engine (Electron + Web)...')

  // Start web development server
  startWebServer(config)

  // Handle graceful shutdown
  process.on('SIGINT', () => handleShutdown('SIGINT'))
  process.on('SIGTERM', () => handleShutdown('SIGTERM'))
}

// Run the main function only if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}
