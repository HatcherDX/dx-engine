/**
 * @fileoverview Test setup for CI environment with mocked Git operations.
 *
 * @description
 * Setup file that ensures simple-git is mocked before any tests run.
 * This allows tests to execute in CI environments without requiring
 * actual Git operations or repository access.
 *
 * CRITICAL: This file is loaded as setupFiles in vitest.ci.config.ts.
 * DO NOT import from 'vitest' here (vi, afterEach, etc.) as it causes
 * "Vitest failed to access its internal state" errors in CI environments.
 *
 * With globals: true enabled in vitest.ci.config.ts, all vitest utilities
 * (vi, describe, it, expect, afterEach, etc.) are available globally.
 *
 * @remarks
 * This setup forces mocking of simple-git to ensure tests can run in
 * any CI environment regardless of Git availability or configuration.
 *
 * @example
 * ```typescript
 * // Automatically loaded by vitest.ci.config.ts
 * // All simple-git imports will return mocked implementations
 * import simpleGit from 'simple-git' // Returns mock
 * ```
 *
 * @see https://vitest.dev/config/#globals
 * @see https://vitest.dev/config/#setupfiles
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @internal
 */

// Access vi from global context (available via globals: true)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const vi = (globalThis as any).vi

// Force CI environment
process.env.CI = 'true'
process.env.VITEST_MOCK_GIT = 'true'

console.log('🛡️ Git CI Setup: Forcing mock environment for Git operations')

// Mock simple-git before any imports
vi.mock('simple-git', () => {
  const createMockGit = (): Record<string, unknown> => {
    const mockGit: Record<string, unknown> = {
      clone: vi.fn().mockResolvedValue(undefined),
      checkout: vi.fn().mockResolvedValue(undefined),
      pull: vi.fn().mockResolvedValue({ files: [], summary: {} }),
      push: vi.fn().mockResolvedValue({ pushed: [] }),
      commit: vi.fn().mockResolvedValue({ commit: 'abc123' }),
      add: vi.fn().mockResolvedValue(undefined),
      status: vi.fn().mockResolvedValue({
        current: 'main',
        tracking: 'origin/main',
        files: [],
        ahead: 0,
        behind: 0,
        created: [],
        deleted: [],
        modified: [],
        renamed: [],
        conflicted: [],
        staged: [],
      }),
      branch: vi.fn().mockResolvedValue({
        all: ['main', 'develop'],
        current: 'main',
        branches: {},
      }),
      log: vi.fn().mockResolvedValue({
        all: [],
        latest: null,
        total: 0,
      }),
      diff: vi.fn().mockResolvedValue(''),
      show: vi.fn().mockResolvedValue(''),
      revparse: vi.fn().mockResolvedValue('abc123'),
      raw: vi.fn().mockResolvedValue(''),
      init: vi.fn().mockResolvedValue(undefined),
    }

    // Add self-referencing methods
    mockGit.cwd = vi.fn().mockReturnValue(mockGit)
    mockGit.env = vi.fn().mockReturnValue(mockGit)
    mockGit.outputHandler = vi.fn().mockReturnValue(mockGit)

    return mockGit
  }

  const mockGit = createMockGit()

  return {
    default: vi.fn(() => mockGit),
    simpleGit: vi.fn(() => mockGit),
  }
})

console.log('✅ Git CI Setup: simple-git mocked successfully')
