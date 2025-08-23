/**
 * @fileoverview Test setup for integration tests with real dependencies
 *
 * @description
 * Test setup for integration tests that use real native dependencies
 * (better-sqlite3, argon2, etc.) without mocks. This ensures we test
 * actual functionality across different platforms and Node.js versions.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 */

import type { StorageConfig } from './types/storage'
import { beforeEach, afterEach, vi } from 'vitest'
import { unlinkSync, existsSync, mkdirSync, readdirSync } from 'fs'
import { join } from 'path'

// Use Vitest's global namespace for test utilities
declare module 'vitest' {
  export interface GlobalSetupContext {
    TEST_DB_PATH: string
    TEST_INTEGRATION_DIR: string
    createTestConfig: (overrides?: Partial<StorageConfig>) => StorageConfig
    createSecureTestConfig: (
      overrides?: Partial<StorageConfig>
    ) => StorageConfig
    createRealSQLiteConfig: (
      overrides?: Partial<StorageConfig>
    ) => StorageConfig
  }
}

// Also add to global for direct access
declare global {
  const TEST_DB_PATH: string
  const TEST_INTEGRATION_DIR: string
  const createTestConfig: (overrides?: Partial<StorageConfig>) => StorageConfig
  const createSecureTestConfig: (
    overrides?: Partial<StorageConfig>
  ) => StorageConfig
  const createRealSQLiteConfig: (
    overrides?: Partial<StorageConfig>
  ) => StorageConfig
}

// Create test utility functions for integration tests
const TEST_INTEGRATION_DIR = join(__dirname, '../test-integration-data')
const TEST_DB_PATH = join(TEST_INTEGRATION_DIR, 'integration-test.db')

// Ensure test directory exists
if (!existsSync(TEST_INTEGRATION_DIR)) {
  mkdirSync(TEST_INTEGRATION_DIR, { recursive: true })
}

/**
 * Create test configuration for memory-based tests
 */
const createTestConfig = (
  overrides: Partial<StorageConfig> = {}
): StorageConfig => ({
  type: 'memory',
  encryption: { enabled: false },
  compression: { enabled: false },
  ...overrides,
})

/**
 * Create test configuration with real encryption (argon2)
 */
const createSecureTestConfig = (
  overrides: Partial<StorageConfig> = {}
): StorageConfig => ({
  type: 'memory',
  encryption: {
    enabled: true,
    passphrase: 'integration-test-passphrase-for-real-argon2-testing',
    algorithm: 'aes-256-gcm',
  },
  compression: {
    enabled: true,
    algorithm: 'auto',
    minSize: 100,
  },
  ...overrides,
})

/**
 * Create test configuration with real SQLite database
 */
const createRealSQLiteConfig = (
  overrides: Partial<StorageConfig> = {}
): StorageConfig => {
  // Generate unique DB path for each test to avoid conflicts
  const uniqueDbPath = join(
    TEST_INTEGRATION_DIR,
    `sqlite-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.db`
  )

  return {
    type: 'sqlite',
    path: uniqueDbPath,
    encryption: { enabled: false },
    compression: { enabled: false },
    ...overrides,
  }
}

// Assign to global object for test access
Object.assign(globalThis, {
  TEST_DB_PATH,
  TEST_INTEGRATION_DIR,
  createTestConfig,
  createSecureTestConfig,
  createRealSQLiteConfig,
})

// Also use stubGlobal as backup
vi.stubGlobal('TEST_DB_PATH', TEST_DB_PATH)
vi.stubGlobal('TEST_INTEGRATION_DIR', TEST_INTEGRATION_DIR)
vi.stubGlobal('createTestConfig', createTestConfig)
vi.stubGlobal('createSecureTestConfig', createSecureTestConfig)
vi.stubGlobal('createRealSQLiteConfig', createRealSQLiteConfig)

// Mock console.log to reduce test noise but keep warnings/errors
const originalConsoleLog = console.log
beforeEach(() => {
  console.log = vi.fn()
})

afterEach(() => {
  console.log = originalConsoleLog
})

// Aggressive cleanup of test databases and files
afterEach(() => {
  const testDbPaths = [
    TEST_DB_PATH,
    join(TEST_INTEGRATION_DIR, 'integration-test-memory.db'),
    join(TEST_INTEGRATION_DIR, 'integration-test-encryption.db'),
    join(TEST_INTEGRATION_DIR, 'integration-test-migration.db'),
  ]

  // Clean up all files in test integration directory
  if (existsSync(TEST_INTEGRATION_DIR)) {
    try {
      const files = readdirSync(TEST_INTEGRATION_DIR)

      for (const file of files) {
        if (
          file.endsWith('.db') ||
          file.endsWith('.db-journal') ||
          file.endsWith('.db-shm') ||
          file.endsWith('.db-wal')
        ) {
          const filePath = join(TEST_INTEGRATION_DIR, file)
          try {
            unlinkSync(filePath)
          } catch {
            // Ignore cleanup errors in integration tests
          }
        }
      }
    } catch {
      // Ignore directory read errors
    }
  }

  // Also clean up specific test database paths
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

// NOTE: Integration tests use REAL native dependencies - no mocking here!
console.warn(
  '[INTEGRATION SETUP] Using real native dependencies (better-sqlite3, argon2, etc.)'
)
