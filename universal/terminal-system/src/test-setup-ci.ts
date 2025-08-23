/**
 * @fileoverview Test setup for CI environment with mocked dependencies.
 *
 * @description
 * Setup file that ensures all native dependencies are mocked before
 * any tests run. This allows tests to execute in CI environments
 * without requiring native module compilation.
 *
 * @remarks
 * This setup forces mocking of node-pty and other native dependencies
 * to ensure tests can run in any CI environment regardless of platform
 * or native module availability.
 *
 * @example
 * ```typescript
 * // Automatically loaded by vitest.ci.config.ts
 * // All node-pty imports will return mocked implementations
 * import { spawn } from 'node-pty' // Returns mock
 * ```
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @internal
 */

import { vi } from 'vitest'

// Force CI environment
process.env.CI = 'true'
process.env.VITEST_MOCK_PTY = 'true'

console.log(
  '🛡️ Terminal CI Setup: Forcing mock environment for native dependencies'
)

// Mock node-pty before any imports
vi.mock('node-pty', () => {
  const mockPtyProcess = {
    pid: 12345,
    onData: vi.fn(),
    onExit: vi.fn(),
    write: vi.fn(),
    resize: vi.fn(),
    kill: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
  }

  return {
    spawn: vi.fn(() => mockPtyProcess),
    IPty: mockPtyProcess,
  }
})

// Import base test setup after mocks are configured
import './test-setup'

console.log('✅ Terminal CI Setup: Mocks applied successfully')
