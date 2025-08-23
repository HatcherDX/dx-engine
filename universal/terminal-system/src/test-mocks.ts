/**
 * @fileoverview Conditional mocking for terminal-system native dependencies.
 *
 * @description
 * Provides conditional mocking of node-pty and other native dependencies
 * based on environment variables. Allows the same test suite to run with
 * either real or mocked implementations.
 *
 * @remarks
 * This module checks environment variables to determine whether to use
 * real native modules or mocks. In CI or when VITEST_MOCK_PTY is set,
 * all native dependencies are mocked. Otherwise, real implementations are used.
 *
 * @example
 * ```typescript
 * // Import at the top of test files that need conditional mocking
 * import './test-mocks'
 *
 * // Then use modules normally
 * import { spawn } from 'node-pty' // Will be real or mocked based on env
 * ```
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @internal
 */

import { vi } from 'vitest'

// Check if we should mock PTY (CI environment or explicit flag)
const shouldMockPty = !!process.env.CI || !!process.env.VITEST_MOCK_PTY

if (shouldMockPty) {
  console.log(
    '🔄 Terminal Mocks: Applying conditional mocks for native dependencies'
  )

  // Use vi.hoisted to ensure mocks are applied before module resolution
  const ptyMocks = vi.hoisted(() => {
    const mockPtyProcess = {
      pid: 12345,
      onData: vi.fn((callback: (data: string) => void) => {
        // Simulate some output for tests
        setTimeout(() => callback('mock output\\r\\n'), 10)
        return mockPtyProcess
      }),
      onExit: vi.fn(
        (callback: (e: { exitCode: number; signal?: number }) => void) => {
          // Simulate process exit after some time
          setTimeout(() => callback({ exitCode: 0 }), 100)
          return mockPtyProcess
        }
      ),
      write: vi.fn((data: string) => {
        console.log(`Mock PTY write: ${data}`)
      }),
      resize: vi.fn((cols: number, rows: number) => {
        console.log(`Mock PTY resize: ${cols}x${rows}`)
      }),
      kill: vi.fn((signal?: string) => {
        console.log(`Mock PTY kill: ${signal || 'SIGTERM'}`)
      }),
      pause: vi.fn(),
      resume: vi.fn(),
      process: '',
    }

    return {
      spawn: vi.fn((command: string, args: string[]) => {
        console.log(`Mock PTY spawn: ${command} ${args.join(' ')}`)
        // Store the command for reference
        mockPtyProcess.process = command
        return mockPtyProcess
      }),
      mockPtyProcess,
    }
  })

  // Apply the mock
  vi.mock('node-pty', () => ({
    spawn: ptyMocks.spawn,
    IPty: ptyMocks.mockPtyProcess,
  }))

  console.log('✅ Terminal Mocks: node-pty mocked successfully')
} else {
  console.log('🔧 Terminal Mocks: Using real node-pty implementation')
}

// Export for test access if needed
export const isMocked = shouldMockPty
