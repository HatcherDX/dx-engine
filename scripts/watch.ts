#!/usr/bin/env tsx
/**
 * Development watch script for dx-engine
 * Starts all apps in development mode with hot reload
 */

import { spawn } from 'child_process'
import { join } from 'path'

const isWatch = process.argv.includes('--watch')

console.log('🚀 Starting DX Engine development environment...')

if (isWatch) {
  console.log('👀 Watch mode enabled')
}

// Start turbo dev in parallel mode
const turboArgs = ['run', 'dev', '--parallel']
if (isWatch) {
  turboArgs.push('--watch')
}

const turbo = spawn('turbo', turboArgs, {
  stdio: 'inherit',
  cwd: process.cwd(),
  shell: true,
})

turbo.on('error', (error) => {
  console.error('❌ Failed to start turbo:', error.message)
  process.exit(1)
})

turbo.on('exit', (code) => {
  console.log(`🏁 Turbo exited with code ${code}`)
  process.exit(code || 0)
})

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n⏹️  Shutting down development environment...')
  turbo.kill('SIGINT')
})

process.on('SIGTERM', () => {
  console.log('\n⏹️  Shutting down development environment...')
  turbo.kill('SIGTERM')
})
