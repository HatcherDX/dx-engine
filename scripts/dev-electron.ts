#!/usr/bin/env tsx
/**
 * Development script to run web server and Electron together
 */

import { spawn } from 'child_process'
import { join } from 'path'

console.log('🚀 Starting Hatcher DX Engine (Electron + Web)...')

const isWin = process.platform === 'win32'

// Start web development server
console.log('📱 Starting web server...')
const webServer = spawn(
  'pnpm',
  ['--filter', '@hatcherdx/dx-engine-web', 'dev'],
  {
    stdio: 'pipe',
    cwd: process.cwd(),
    shell: isWin,
  }
)

let webServerReady = false

webServer.stdout?.on('data', (data) => {
  const output = data.toString()
  console.log(`[Web] ${output}`)

  // Check if web server is ready
  if (output.includes('Local:') && output.includes('localhost')) {
    webServerReady = true
    console.log('✅ Web server is ready!')

    // Start Electron after web server is ready
    setTimeout(startElectron, 2000) // Wait 2 seconds to ensure server is fully ready
  }
})

webServer.stderr?.on('data', (data) => {
  console.error(`[Web Error] ${data}`)
})

function startElectron() {
  if (!webServerReady) {
    console.log('⏳ Waiting for web server to be ready...')
    return
  }

  console.log('⚡ Starting Electron...')
  const electronApp = spawn(
    'pnpm',
    ['--filter', '@hatcherdx/dx-engine-electron', 'dev'],
    {
      stdio: 'inherit',
      cwd: process.cwd(),
      shell: isWin,
    }
  )

  electronApp.on('error', (error) => {
    console.error('❌ Failed to start Electron:', error.message)
  })

  electronApp.on('exit', (code) => {
    console.log(`🏁 Electron exited with code ${code}`)
    // Kill web server when Electron exits
    webServer.kill('SIGTERM')
    process.exit(code || 0)
  })
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n⏹️  Shutting down development environment...')
  webServer.kill('SIGTERM')
  process.exit(0)
})

process.on('SIGTERM', () => {
  console.log('\n⏹️  Shutting down development environment...')
  webServer.kill('SIGTERM')
  process.exit(0)
})

// Handle web server exit
webServer.on('exit', (code) => {
  if (code !== 0) {
    console.error(`❌ Web server exited with code ${code}`)
    process.exit(code || 1)
  }
})
