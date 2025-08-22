/**
 * @fileoverview Test setup and global configuration for storage module
 *
 * @description
 * Global test setup including mocks, utilities, and configuration
 * for testing the storage system components.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 */

// Import types for proper typing FIRST
import type { StorageConfig } from './types/storage'
import { beforeEach, afterEach, vi } from 'vitest'
import { unlinkSync, existsSync } from 'fs'
import { join } from 'path'

// Use Vitest's global namespace for test utilities
declare module 'vitest' {
  export interface GlobalSetupContext {
    TEST_DB_PATH: string
    createTestConfig: (overrides?: Partial<StorageConfig>) => StorageConfig
    createSecureTestConfig: (
      overrides?: Partial<StorageConfig>
    ) => StorageConfig
  }
}

// Also add to global for direct access
declare global {
  const TEST_DB_PATH: string
  const createTestConfig: (overrides?: Partial<StorageConfig>) => StorageConfig
  const createSecureTestConfig: (
    overrides?: Partial<StorageConfig>
  ) => StorageConfig
}

// Create test utility functions
const TEST_DB_PATH = join(__dirname, '../test-data/test.db')

const createTestConfig = (
  overrides: Partial<StorageConfig> = {}
): StorageConfig => ({
  type: 'memory',
  encryption: { enabled: false },
  compression: { enabled: false },
  ...overrides,
})

const createSecureTestConfig = (
  overrides: Partial<StorageConfig> = {}
): StorageConfig => ({
  type: 'memory',
  encryption: {
    enabled: true,
    passphrase: 'test-passphrase-for-secure-testing',
    algorithm: 'aes-256-gcm',
  },
  compression: {
    enabled: true,
    algorithm: 'auto',
    minSize: 100,
  },
  ...overrides,
})

// Assign to global object for test access
Object.assign(globalThis, {
  TEST_DB_PATH,
  createTestConfig,
  createSecureTestConfig,
})

// Also use stubGlobal as backup
vi.stubGlobal('TEST_DB_PATH', TEST_DB_PATH)
vi.stubGlobal('createTestConfig', createTestConfig)
vi.stubGlobal('createSecureTestConfig', createSecureTestConfig)

// Mock console.log to reduce test noise
const originalConsoleLog = console.log
beforeEach(() => {
  console.log = vi.fn()
})

afterEach(() => {
  console.log = originalConsoleLog
})

// Cleanup test databases
afterEach(() => {
  const testDbPaths = [
    TEST_DB_PATH,
    join(__dirname, '../test-data/test-memory.db'),
    join(__dirname, '../test-data/test-encryption.db'),
    join(__dirname, '../test-data/test-migration.db'),
  ]

  for (const path of testDbPaths) {
    if (existsSync(path)) {
      try {
        unlinkSync(path)
      } catch {
        // Ignore cleanup errors
      }
    }
  }
})

// Mock native compression libraries for testing
vi.mock('lz4', () => ({
  encode: vi.fn((data) => Buffer.from(`lz4:${data.toString()}`)),
  decode: vi.fn((data) => Buffer.from(data.toString().replace('lz4:', ''))),
}))

vi.mock('brotli', () => ({
  compress: vi.fn((data) => Buffer.from(`brotli:${data.toString()}`)),
  decompress: vi.fn((data) =>
    Buffer.from(data.toString().replace('brotli:', ''))
  ),
}))

// Mock better-sqlite3 for CI/CD environments where native bindings aren't available
// Check if we're in CI or if better-sqlite3 bindings are unavailable
const isCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true'
const forceUseMock = process.env.VITEST_MOCK_SQLITE === 'true'

if (isCI || forceUseMock) {
  vi.mock('better-sqlite3', () => {
    console.warn('[TEST] Using better-sqlite3 mock for CI/CD environment')

    // In-memory storage for the mock database
    const mockStorage = new Map<string, unknown>()

    const mockDatabase = {
      exec: vi.fn().mockImplementation((sql: string) => {
        // Mock basic table creation
        if (sql.includes('CREATE TABLE')) {
          return { changes: 0 }
        }
        return { changes: 0 }
      }),
      prepare: vi.fn().mockImplementation((sql: string) => {
        return {
          run: vi.fn().mockImplementation((...params: unknown[]) => {
            const key = `${sql}:${JSON.stringify(params)}`
            mockStorage.set(key, params)
            return { changes: 1, lastInsertRowid: Date.now() }
          }),
          get: vi.fn().mockImplementation(() => {
            // Simple mock for SELECT queries
            if (sql.includes('SELECT') && sql.includes('migrations')) {
              return { version: 1 }
            }
            return null
          }),
          all: vi.fn().mockReturnValue([]),
          iterate: vi.fn().mockReturnValue([]),
        }
      }),
      close: vi.fn(),
      readonly: false,
      inTransaction: false,
    }

    return {
      default: vi.fn().mockImplementation(() => mockDatabase),
    }
  })
} else {
  // In local development, try to use the real better-sqlite3
  vi.mock('better-sqlite3', async (importOriginal) => {
    try {
      const actual = await importOriginal()
      return actual
    } catch {
      console.warn(
        '[TEST] better-sqlite3 bindings unavailable, falling back to mock'
      )

      const mockDatabase = {
        exec: vi.fn(),
        prepare: vi.fn().mockReturnValue({
          run: vi.fn().mockReturnValue({ changes: 1, lastInsertRowid: 1 }),
          get: vi.fn().mockReturnValue(null),
          all: vi.fn().mockReturnValue([]),
          iterate: vi.fn().mockReturnValue([]),
        }),
        close: vi.fn(),
        readonly: false,
        inTransaction: false,
      }

      return {
        default: vi.fn().mockImplementation(() => mockDatabase),
      }
    }
  })
}
