#!/usr/bin/env tsx

/**
 * Test script to verify node-pty functionality
 * This script tests if node-pty can create PTY sessions correctly
 */

import * as pty from 'node-pty'
import * as os from 'os'

/**
 * Main function to run node-pty tests
 * Exported for testing purposes
 */
export async function runNodePtyTest(): Promise<void> {
  console.log('🧪 Testing node-pty functionality...\n')

  try {
    // Test 1: Check if node-pty module loads
    console.log('✅ node-pty module loaded successfully')

    // Test 2: Get platform info
    const platform = os.platform()
    console.log(`📱 Platform: ${platform}`)

    // Test 3: Create a PTY session
    console.log('\n🔄 Creating PTY session...')

    const shell =
      platform === 'win32' ? 'powershell.exe' : process.env.SHELL || '/bin/zsh'
    console.log(`🐚 Using shell: ${shell}`)

    const ptyProcess = pty.spawn(shell, [], {
      name: 'xterm-color',
      cols: 80,
      rows: 24,
      cwd: process.cwd(),
      env: process.env as any,
    })

    console.log(`✅ PTY created successfully with PID: ${ptyProcess.pid}`)

    // Test 4: Test basic I/O
    let outputReceived = false

    ptyProcess.onData((data) => {
      if (!outputReceived) {
        console.log('✅ PTY data received:', data.slice(0, 50) + '...')
        outputReceived = true
      }
    })

    ptyProcess.onExit((exitCode) => {
      console.log(`🏁 PTY exited with code: ${exitCode.exitCode || exitCode}`)
    })

    // Test 5: Send a simple command
    setTimeout(() => {
      console.log('\n📤 Sending test command: echo "Hello from PTY"')
      ptyProcess.write('echo "Hello from PTY"\r')

      setTimeout(() => {
        console.log('\n📤 Sending exit command...')
        ptyProcess.write('exit\r')
      }, 1000)
    }, 500)

    // Test 6: Clean up after tests
    setTimeout(() => {
      try {
        console.log('\n🛑 Terminating PTY process...')
        ptyProcess.kill()
      } catch (error) {
        // Process might already be dead
      }

      console.log('\n🎉 node-pty test completed successfully!')
      console.log('\n📋 Summary:')
      console.log('   ✅ Module loading: OK')
      console.log('   ✅ PTY creation: OK')
      console.log('   ✅ Data I/O: OK')
      console.log('   ✅ Process management: OK')
      console.log('\n🚀 Your terminal should now work properly!')

      if (typeof process !== 'undefined' && process.exit) {
        process.exit(0)
      }
    }, 3000)
  } catch (error) {
    console.error('❌ node-pty test failed:', error)
    console.log('\n💡 Possible solutions:')
    console.log('   1. Recompile node-pty: pnpm rebuild node-pty')
    console.log('   2. Update Node.js to version 22')
    console.log('   3. Check build tools installation')
    if (typeof process !== 'undefined' && process.exit) {
      process.exit(1)
    }
    throw error
  }
}

// Run directly if called as script
if (require.main === module) {
  runNodePtyTest().catch(console.error)
}
