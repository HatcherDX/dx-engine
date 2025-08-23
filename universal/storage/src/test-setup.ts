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

// Import test mocks for native dependencies (must be first for proper hoisting)
// Note: Mocks are conditionally applied based on CI environment or VITEST_MOCK_SQLITE env var
import './test-mocks'

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

// NOTE: Native dependency mocking is now handled in test-mocks.ts to ensure proper hoisting
