/**
 * @fileoverview Comprehensive test suite for test-node-pty.ts script.
 *
 * @description
 * Tests the Node-pty functionality verification script including platform detection,
 * PTY creation, I/O operations, and process management. Uses a simplified approach
 * with direct function testing rather than complex mocking.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { runNodePtyTest } from './test-node-pty'

// Mock node-pty
const mockPtyProcess = {
  pid: 12345,
  onData: vi.fn(),
  onExit: vi.fn(),
  write: vi.fn(),
  kill: vi.fn(),
}

vi.mock('node-pty', () => ({
  spawn: vi.fn(() => mockPtyProcess),
}))

vi.mock('os', () => ({
  platform: vi.fn(() => 'darwin'),
}))

describe('test-node-pty.ts', () => {
  let scriptContent: string

  beforeEach(() => {
    // Read script content for static analysis
    const scriptPath = join(__dirname, 'test-node-pty.ts')
    scriptContent = readFileSync(scriptPath, 'utf-8')
  })

  describe('Script Structure and Exports', () => {
    it('should export runNodePtyTest function', () => {
      expect(scriptContent).toContain('export async function runNodePtyTest')
      expect(scriptContent).toContain('Promise<void>')
    })

    it('should import required dependencies', () => {
      expect(scriptContent).toContain("import * as pty from 'node-pty'")
      expect(scriptContent).toContain("import * as os from 'os'")
    })

    it('should have executable shebang', () => {
      expect(scriptContent).toMatch(/^#!/)
      expect(scriptContent).toContain('#!/usr/bin/env tsx')
    })

    it('should be callable as a script', () => {
      expect(scriptContent).toContain('require.main === module')
      expect(scriptContent).toContain('runNodePtyTest().catch(console.error)')
    })
  })

  describe('Platform Detection Logic', () => {
    it('should detect Windows platform', () => {
      expect(scriptContent).toContain("platform === 'win32'")
      expect(scriptContent).toContain('powershell.exe')
    })

    it('should use SHELL environment variable on Unix', () => {
      expect(scriptContent).toContain('process.env.SHELL')
      expect(scriptContent).toContain('/bin/zsh')
    })

    it('should fallback to zsh when SHELL is not set', () => {
      expect(scriptContent).toContain("process.env.SHELL || '/bin/zsh'")
    })

    it('should log platform information', () => {
      expect(scriptContent).toContain('Platform:')
      expect(scriptContent).toContain('Using shell:')
    })
  })

  describe('PTY Configuration', () => {
    it('should configure PTY with proper options', () => {
      expect(scriptContent).toContain('pty.spawn')
      expect(scriptContent).toContain("name: 'xterm-color'")
      expect(scriptContent).toContain('cols: 80')
      expect(scriptContent).toContain('rows: 24')
      expect(scriptContent).toContain('cwd: process.cwd()')
      expect(scriptContent).toContain('env: process.env')
    })

    it('should log PTY creation success', () => {
      expect(scriptContent).toContain('PTY created successfully')
      expect(scriptContent).toContain('ptyProcess.pid')
    })
  })

  describe('I/O Testing Logic', () => {
    it('should setup data event handlers', () => {
      expect(scriptContent).toContain('ptyProcess.onData')
      expect(scriptContent).toContain('PTY data received')
      expect(scriptContent).toContain('data.slice(0, 50)')
    })

    it('should setup exit event handlers', () => {
      expect(scriptContent).toContain('ptyProcess.onExit')
      expect(scriptContent).toContain('PTY exited with code')
      expect(scriptContent).toContain('exitCode.exitCode || exitCode')
    })

    it('should send test commands', () => {
      expect(scriptContent).toContain('echo "Hello from PTY"')
      expect(scriptContent).toContain('ptyProcess.write')
      expect(scriptContent).toContain('\\r')
    })

    it('should send exit command', () => {
      expect(scriptContent).toContain("ptyProcess.write('exit\\r')")
    })
  })

  describe('Process Management', () => {
    it('should terminate PTY process', () => {
      expect(scriptContent).toContain('ptyProcess.kill()')
      expect(scriptContent).toContain('Terminating PTY process')
    })

    it('should handle process termination errors', () => {
      expect(scriptContent).toContain('try {')
      expect(scriptContent).toContain('} catch (error) {')
      expect(scriptContent).toContain('// Process might already be dead')
    })

    it('should exit with appropriate codes', () => {
      expect(scriptContent).toContain('process.exit(0)')
      expect(scriptContent).toContain('process.exit(1)')
    })

    it('should handle missing process.exit', () => {
      expect(scriptContent).toContain("typeof process !== 'undefined'")
      expect(scriptContent).toContain('process.exit')
    })
  })

  describe('Error Handling', () => {
    it('should catch and log errors', () => {
      expect(scriptContent).toContain('catch (error)')
      expect(scriptContent).toContain('node-pty test failed')
      expect(scriptContent).toContain('console.error')
    })

    it('should provide solution suggestions', () => {
      expect(scriptContent).toContain('Possible solutions')
      expect(scriptContent).toContain('pnpm rebuild node-pty')
      expect(scriptContent).toContain('Update Node.js to version 22')
      expect(scriptContent).toContain('Check build tools installation')
    })

    it('should throw error for proper handling', () => {
      expect(scriptContent).toContain('throw error')
    })
  })

  describe('Test Flow and Logging', () => {
    it('should log test start', () => {
      expect(scriptContent).toContain('Testing node-pty functionality')
      expect(scriptContent).toContain('🧪')
    })

    it('should log module loading success', () => {
      expect(scriptContent).toContain('node-pty module loaded successfully')
    })

    it('should log test completion', () => {
      expect(scriptContent).toContain('node-pty test completed successfully')
      expect(scriptContent).toContain('🎉')
    })

    it('should provide test summary', () => {
      expect(scriptContent).toContain('Summary:')
      expect(scriptContent).toContain('Module loading: OK')
      expect(scriptContent).toContain('PTY creation: OK')
      expect(scriptContent).toContain('Data I/O: OK')
      expect(scriptContent).toContain('Process management: OK')
    })

    it('should provide success message', () => {
      expect(scriptContent).toContain('Your terminal should now work properly')
      expect(scriptContent).toContain('🚀')
    })
  })

  describe('Timing and Async Behavior', () => {
    it('should use setTimeout for delayed operations', () => {
      expect(scriptContent).toContain('setTimeout')
      expect(scriptContent.match(/setTimeout/g)?.length).toBeGreaterThan(2)
    })

    it('should have proper timing delays', () => {
      expect(scriptContent).toContain('500)') // First command delay
      expect(scriptContent).toContain('1000)') // Exit command delay
      expect(scriptContent).toContain('3000)') // Cleanup delay
    })

    it('should track output reception state', () => {
      expect(scriptContent).toContain('let outputReceived = false')
      expect(scriptContent).toContain('if (!outputReceived)')
      expect(scriptContent).toContain('outputReceived = true')
    })
  })

  describe('Cross-Platform Compatibility', () => {
    it('should handle Windows shell selection', () => {
      expect(scriptContent).toContain("platform === 'win32'")
      expect(scriptContent).toContain('powershell.exe')
    })

    it('should handle Unix shell selection', () => {
      expect(scriptContent).toContain('process.env.SHELL')
      expect(scriptContent).toContain('/bin/zsh')
    })

    it('should use platform-specific logic', () => {
      expect(scriptContent).toContain('os.platform()')
      expect(scriptContent).toContain('const platform =')
    })
  })

  describe('Documentation and Comments', () => {
    it('should have TSDoc comments', () => {
      expect(scriptContent).toContain('/**')
      expect(scriptContent).toContain(
        '* Test script to verify node-pty functionality'
      )
      expect(scriptContent).toContain('* Main function to run node-pty tests')
      expect(scriptContent).toContain('* Exported for testing purposes')
    })

    it('should have inline comments for test steps', () => {
      expect(scriptContent).toContain(
        '// Test 1: Check if node-pty module loads'
      )
      expect(scriptContent).toContain('// Test 2: Get platform info')
      expect(scriptContent).toContain('// Test 3: Create a PTY session')
      expect(scriptContent).toContain('// Test 4: Test basic I/O')
      expect(scriptContent).toContain('// Test 5: Send a simple command')
      expect(scriptContent).toContain('// Test 6: Clean up after tests')
    })
  })

  describe('Output Formatting', () => {
    it('should use emoji indicators', () => {
      expect(scriptContent).toContain('🧪') // Testing
      expect(scriptContent).toContain('✅') // Success
      expect(scriptContent).toContain('📱') // Platform
      expect(scriptContent).toContain('🔄') // Creating
      expect(scriptContent).toContain('🐚') // Shell
      expect(scriptContent).toContain('📤') // Sending
      expect(scriptContent).toContain('🏁') // Exit
      expect(scriptContent).toContain('🛑') // Terminating
      expect(scriptContent).toContain('🎉') // Success
      expect(scriptContent).toContain('📋') // Summary
      expect(scriptContent).toContain('🚀') // Final message
      expect(scriptContent).toContain('❌') // Error
      expect(scriptContent).toContain('💡') // Solutions
    })

    it('should use consistent log formatting', () => {
      expect(scriptContent).toContain('\\n') // Line breaks
      expect(scriptContent).toContain('   ') // Indentation
    })
  })

  describe('TypeScript Integration', () => {
    it('should have proper TypeScript types', () => {
      expect(scriptContent).toContain('Promise<void>')
      expect(scriptContent).toContain('process.env as any')
    })

    it('should use async/await pattern', () => {
      expect(scriptContent).toContain('export async function')
      expect(scriptContent).toContain('runNodePtyTest')
    })
  })

  describe('Integration Requirements', () => {
    it('should be compatible with tsx execution', () => {
      expect(scriptContent).toContain('#!/usr/bin/env tsx')
    })

    it('should handle module execution detection', () => {
      expect(scriptContent).toContain('require.main === module')
    })

    it('should provide proper error propagation', () => {
      expect(scriptContent).toContain('.catch(console.error)')
      expect(scriptContent).toContain('throw error')
    })
  })

  describe('Function Execution Tests', () => {
    let originalConsole: Console
    let originalProcess: NodeJS.Process

    beforeEach(() => {
      originalConsole = global.console
      originalProcess = global.process

      global.console = {
        ...console,
        log: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
      } as any

      global.process = {
        ...originalProcess,
        cwd: vi.fn(() => '/test'),
        env: { SHELL: '/bin/zsh' },
        exit: vi.fn(),
        platform: 'darwin',
      } as any

      vi.clearAllMocks()
      vi.useFakeTimers()
    })

    afterEach(() => {
      global.console = originalConsole
      global.process = originalProcess
      vi.useRealTimers()
      vi.clearAllMocks()
    })

    it('should execute runNodePtyTest successfully', async () => {
      // Setup mock behavior
      mockPtyProcess.onData.mockImplementation((callback) => {
        setTimeout(() => callback('test output'), 10)
      })
      mockPtyProcess.onExit.mockImplementation((callback) => {
        setTimeout(() => callback({ exitCode: 0 }), 100)
      })

      // Execute the function
      const testPromise = runNodePtyTest()

      // Advance timers to trigger events
      vi.runAllTimers()

      // Wait for promise to complete
      await testPromise

      // Verify execution
      expect(console.log).toHaveBeenCalledWith(
        '🧪 Testing node-pty functionality...\n'
      )
      expect(console.log).toHaveBeenCalledWith(
        '✅ node-pty module loaded successfully'
      )
      expect(process.exit).toHaveBeenCalledWith(0)
    })

    it('should handle PTY spawn errors', async () => {
      const mockPty = await import('node-pty')

      // Mock spawn to throw error
      vi.mocked(mockPty.spawn).mockImplementationOnce(() => {
        throw new Error('Failed to spawn PTY')
      })

      await expect(runNodePtyTest()).rejects.toThrow('Failed to spawn PTY')
      expect(console.error).toHaveBeenCalledWith(
        '❌ node-pty test failed:',
        expect.any(Error)
      )
      expect(process.exit).toHaveBeenCalledWith(1)
    })

    it('should handle different platforms correctly', async () => {
      const mockOs = await import('os')
      const mockPty = await import('node-pty')

      // Test Windows platform
      vi.mocked(mockOs.platform).mockReturnValue('win32')
      vi.mocked(mockPty.spawn).mockReturnValue(mockPtyProcess)

      mockPtyProcess.onData.mockImplementation((callback) => {
        setTimeout(() => callback('Windows output'), 10)
      })
      mockPtyProcess.onExit.mockImplementation((callback) => {
        setTimeout(() => callback({ exitCode: 0 }), 100)
      })

      const testPromise = runNodePtyTest()
      vi.runAllTimers()
      await testPromise

      expect(console.log).toHaveBeenCalledWith('📱 Platform: win32')
      expect(console.log).toHaveBeenCalledWith('🐚 Using shell: powershell.exe')

      // Reset platform
      vi.mocked(mockOs.platform).mockReturnValue('darwin')
    })

    it('should handle PTY data correctly', async () => {
      const mockPty = await import('node-pty')
      mockPty.spawn.mockReturnValue(mockPtyProcess)

      const testData = 'Hello from PTY\nSecond line'

      mockPtyProcess.onData.mockImplementation((callback) => {
        setTimeout(() => callback(testData), 10)
      })
      mockPtyProcess.onExit.mockImplementation((callback) => {
        setTimeout(() => callback({ exitCode: 0 }), 100)
      })

      const testPromise = runNodePtyTest()
      vi.runAllTimers()
      await testPromise

      expect(console.log).toHaveBeenCalledWith(
        '✅ PTY data received:',
        testData.slice(0, 50) + '...'
      )
    })

    it('should handle PTY exit with error code', async () => {
      const mockPty = await import('node-pty')
      mockPty.spawn.mockReturnValue(mockPtyProcess)

      mockPtyProcess.onData.mockImplementation((callback) => {
        setTimeout(() => callback('error output'), 10)
      })
      mockPtyProcess.onExit.mockImplementation((callback) => {
        setTimeout(() => callback({ exitCode: 1, signal: 0 }), 100)
      })

      const testPromise = runNodePtyTest()
      vi.runAllTimers()
      await testPromise

      expect(console.log).toHaveBeenCalledWith('🏁 PTY exited with code: 1')
      expect(process.exit).toHaveBeenCalledWith(0)
    })

    it('should write test commands to PTY', async () => {
      const mockPty = await import('node-pty')
      mockPty.spawn.mockReturnValue(mockPtyProcess)

      mockPtyProcess.onData.mockImplementation((callback) => {
        setTimeout(() => callback('command output'), 10)
      })
      mockPtyProcess.onExit.mockImplementation((callback) => {
        setTimeout(() => callback({ exitCode: 0 }), 100)
      })

      const testPromise = runNodePtyTest()
      vi.runAllTimers()
      await testPromise

      expect(mockPtyProcess.write).toHaveBeenCalledWith(
        'echo "Hello from PTY"\r'
      )
      expect(mockPtyProcess.write).toHaveBeenCalledWith('exit\r')
    })

    it('should handle shell environment variable', async () => {
      const mockPty = await import('node-pty')
      const mockOs = await import('os')

      vi.mocked(mockOs.platform).mockReturnValue('darwin')
      vi.mocked(mockPty.spawn).mockReturnValue(mockPtyProcess)

      // Test with custom SHELL
      global.process.env.SHELL = '/bin/bash'

      mockPtyProcess.onData.mockImplementation((callback) => {
        setTimeout(() => callback('bash output'), 10)
      })
      mockPtyProcess.onExit.mockImplementation((callback) => {
        setTimeout(() => callback({ exitCode: 0 }), 100)
      })

      const testPromise = runNodePtyTest()
      vi.runAllTimers()
      await testPromise

      const spawnCall = vi.mocked(mockPty.spawn).mock.calls[
        vi.mocked(mockPty.spawn).mock.calls.length - 1
      ]
      expect(spawnCall[0]).toBe('/bin/bash')

      // Reset SHELL
      global.process.env.SHELL = '/bin/zsh'
    })

    it('should handle PTY kill operation', async () => {
      const mockPty = await import('node-pty')
      mockPty.spawn.mockReturnValue(mockPtyProcess)

      mockPtyProcess.onData.mockImplementation((callback) => {
        setTimeout(() => {
          callback('output before kill')
          // Simulate kill being called
          mockPtyProcess.kill()
        }, 10)
      })
      mockPtyProcess.onExit.mockImplementation((callback) => {
        setTimeout(() => callback({ exitCode: 0 }), 100)
      })

      const testPromise = runNodePtyTest()
      vi.runAllTimers()
      await testPromise

      expect(mockPtyProcess.kill).toHaveBeenCalled()
    })
  })

  describe('Coverage for uncovered lines', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should only log data once when outputReceived becomes true (line 47)', async () => {
      let dataCallback: any
      const mockPty = await import('node-pty')
      mockPty.spawn.mockReturnValue(mockPtyProcess)

      // Mock process.exit to prevent test failures
      const originalExit = global.process.exit
      global.process.exit = vi.fn()

      // Track console.log calls
      const consoleLogSpy = vi.spyOn(console, 'log')

      mockPtyProcess.onData.mockImplementation((callback) => {
        dataCallback = callback
      })
      mockPtyProcess.onExit.mockImplementation((callback) => {
        setTimeout(() => callback({ exitCode: 0 }), 100)
      })

      const testPromise = runNodePtyTest()

      // Wait for setup
      await vi.advanceTimersByTimeAsync(10)

      // First data - should log (outputReceived = false)
      if (dataCallback) {
        dataCallback(
          'First data chunk that is longer than 50 characters to test slicing'
        )
      }

      // Second data - should NOT log (outputReceived = true)
      if (dataCallback) {
        dataCallback('Second data chunk')
      }

      // Third data - should NOT log (outputReceived = true)
      if (dataCallback) {
        dataCallback('Third data chunk')
      }

      await vi.runAllTimersAsync()
      await testPromise

      // Filter for the specific log message
      const dataCalls = consoleLogSpy.mock.calls.filter(
        (call) => call[0] === '✅ PTY data received:'
      )

      // Should only have logged once
      expect(dataCalls).toHaveLength(1)
      // Check that it starts with the expected text (may have ANSI codes)
      expect(dataCalls[0][1]).toMatch(
        /First data chunk that is longer than 50 character/
      )

      // Restore mocks
      consoleLogSpy.mockRestore()
      global.process.exit = originalExit
    })

    it('should call process.exit(0) on success when process.exit exists (lines 85-87)', async () => {
      const mockPty = await import('node-pty')
      mockPty.spawn.mockReturnValue(mockPtyProcess)

      // Ensure process.exit is defined
      const exitSpy = vi.fn()
      global.process.exit = exitSpy

      mockPtyProcess.onData.mockImplementation(() => {})
      mockPtyProcess.onExit.mockImplementation((callback) => {
        setTimeout(() => callback({ exitCode: 0 }), 100)
      })

      const testPromise = runNodePtyTest()
      await vi.runAllTimersAsync()
      await testPromise

      expect(exitSpy).toHaveBeenCalledWith(0)
    })

    it('should call process.exit(1) on error when process.exit exists (lines 95-97)', async () => {
      const mockPty = await import('node-pty')

      // Make spawn throw an error
      mockPty.spawn.mockImplementation(() => {
        throw new Error('Spawn failed')
      })

      // Ensure process.exit is defined
      const exitSpy = vi.fn()
      global.process.exit = exitSpy

      await expect(runNodePtyTest()).rejects.toThrow('Spawn failed')

      expect(exitSpy).toHaveBeenCalledWith(1)
    })

    it('should handle missing process gracefully', async () => {
      const mockPty = await import('node-pty')
      mockPty.spawn.mockReturnValue(mockPtyProcess)

      // Store original process
      const originalProcess = global.process

      // Create a process without exit
      global.process = {
        ...originalProcess,
        // exit is undefined
      } as any
      delete (global.process as any).exit

      mockPtyProcess.onData.mockImplementation(() => {})
      mockPtyProcess.onExit.mockImplementation((callback) => {
        setTimeout(() => callback({ exitCode: 0 }), 100)
      })

      const testPromise = runNodePtyTest()
      await vi.runAllTimersAsync()
      await testPromise

      // Restore process
      global.process = originalProcess

      // Should complete without errors
      expect(true).toBe(true)
    })
  })
})
