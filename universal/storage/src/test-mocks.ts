/**
 * @fileoverview Mock setup for native dependencies in CI/CD environments
 *
 * @description
 * This file contains mock implementations for native dependencies that fail
 * to compile in CI/CD environments like GitHub Actions. The mocks are applied
 * conditionally based on environment variables.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 */

import { vi } from 'vitest'

// Check if we're in CI or if native bindings should be mocked
// SQLiteAdapter tests set VITEST_USE_REAL_SQLITE=true to use real implementations
// GitHub Actions sets CI=true as a string, and GITHUB_ACTIONS is also set
const isCI = !!process.env.CI || !!process.env.GITHUB_ACTIONS
const forceUseMock = process.env.VITEST_MOCK_SQLITE === 'true'
const useRealSQLite = process.env.VITEST_USE_REAL_SQLITE === 'true'

// Use vi.hoisted to ensure these mocks are available during module resolution
const mocks = vi.hoisted(() => {
  const isCI = !!process.env.CI || !!process.env.GITHUB_ACTIONS
  const forceUseMock = process.env.VITEST_MOCK_SQLITE === 'true'
  const useRealSQLite = process.env.VITEST_USE_REAL_SQLITE === 'true'

  if (!useRealSQLite && (isCI || forceUseMock)) {
    console.warn(
      '[HOISTED MOCK] Environment detected, preparing native dependency mocks'
    )

    // Create in-memory storage for the mock
    const mockStorage = new Map<string, unknown>()
    let idCounter = 1

    return {
      betterSqlite3Mock: {
        exec: vi.fn().mockImplementation(() => {
          // Handle CREATE TABLE and other DDL statements
          return { changes: 0 }
        }),
        prepare: vi.fn().mockImplementation((sql: string) => {
          return {
            run: vi
              .fn()
              .mockImplementation((params: Record<string, unknown>) => {
                // Handle INSERT/UPDATE/DELETE
                if (sql.includes('INSERT')) {
                  const key =
                    params?.key || params?.$key || `key_${idCounter++}`
                  const value = params?.value || params?.$value || '{}'
                  mockStorage.set(key, value)
                  return { changes: 1, lastInsertRowid: idCounter }
                }
                if (sql.includes('UPDATE')) {
                  const key = params?.key || params?.$key
                  if (key && mockStorage.has(key)) {
                    const value = params?.value || params?.$value || '{}'
                    mockStorage.set(key, value)
                    return { changes: 1 }
                  }
                  return { changes: 0 }
                }
                if (sql.includes('DELETE')) {
                  const key = params?.key || params?.$key
                  if (key && mockStorage.has(key)) {
                    mockStorage.delete(key)
                    return { changes: 1 }
                  }
                  return { changes: 0 }
                }
                return { changes: 1, lastInsertRowid: idCounter++ }
              }),
            get: vi
              .fn()
              .mockImplementation((params: Record<string, unknown>) => {
                // Handle SELECT ... LIMIT 1
                if (sql.includes('SELECT') && sql.includes('storage_data')) {
                  const key = params?.key || params?.$key
                  if (key && mockStorage.has(key)) {
                    return {
                      key,
                      value: mockStorage.get(key),
                      namespace: 'default',
                      created_at: Date.now(),
                      updated_at: Date.now(),
                    }
                  }
                }
                if (sql.includes('COUNT')) {
                  return { count: mockStorage.size }
                }
                return null
              }),
            all: vi
              .fn()
              .mockImplementation((params: Record<string, unknown>) => {
                // Handle SELECT multiple rows
                if (sql.includes('SELECT') && sql.includes('storage_data')) {
                  const results: unknown[] = []
                  for (const [key, value] of mockStorage.entries()) {
                    // Apply basic filtering
                    if (sql.includes('WHERE') && params?.prefix) {
                      if (!key.startsWith(params.prefix)) continue
                    }
                    results.push({
                      key,
                      value,
                      namespace: 'default',
                      created_at: Date.now(),
                      updated_at: Date.now(),
                    })
                  }
                  return results
                }
                return []
              }),
            iterate: vi.fn().mockReturnValue([]),
          }
        }),
        pragma: vi.fn().mockImplementation((pragmaStatement: string) => {
          // Mock common pragma statements
          if (pragmaStatement.includes('journal_mode')) {
            return 'wal'
          }
          if (pragmaStatement.includes('cache_size')) {
            return 16000
          }
          if (pragmaStatement.includes('foreign_keys')) {
            return 1
          }
          return null
        }),
        transaction: vi.fn().mockImplementation((fn: () => unknown) => {
          return function (this: unknown, ...args: unknown[]) {
            return (fn as (...args: unknown[]) => unknown).apply(this, args)
          }
        }),
        function: vi.fn(),
        aggregate: vi.fn(),
        backup: vi.fn().mockResolvedValue({}),
        close: vi.fn(),
        readonly: false,
        inTransaction: false,
        open: true,
        name: ':memory:',
        memory: true,
      },
      argon2Mock: {
        hash: vi
          .fn()
          .mockImplementation(async (passphrase: string, options?: unknown) => {
            const crypto = await import('crypto')
            // Extract salt from options if provided
            const opts = options as Record<string, unknown>
            const salt = (opts?.salt as Buffer) || Buffer.from('default-salt')
            // Return a 32-byte buffer that varies based on passphrase and salt
            return crypto
              .createHash('sha256')
              .update(passphrase)
              .update(salt)
              .digest()
          }),
        verify: vi
          .fn()
          .mockImplementation(
            async (hash: string | Buffer, passphrase: string) => {
              const crypto = await import('crypto')
              // Need to use same salt as when hashing
              const salt = Buffer.from('default-salt')
              const expectedHash = crypto
                .createHash('sha256')
                .update(passphrase)
                .update(salt)
                .digest()
              const hashBuffer = Buffer.isBuffer(hash)
                ? hash
                : Buffer.from(hash, 'hex')
              return hashBuffer.equals(expectedHash)
            }
          ),
        argon2id: 2,
        argon2i: 1,
        argon2d: 0,
      },
      lz4Mock: {
        encode: vi.fn((data) => Buffer.from(`lz4:${data.toString()}`)),
        decode: vi.fn((data) =>
          Buffer.from(data.toString().replace('lz4:', ''))
        ),
      },
      brotliMock: {
        compress: vi.fn((data) => Buffer.from(`brotli:${data.toString()}`)),
        decompress: vi.fn((data) =>
          Buffer.from(data.toString().replace('brotli:', ''))
        ),
      },
    }
  }

  return {}
})

if (!useRealSQLite && (isCI || forceUseMock)) {
  // Mock better-sqlite3 using hoisted mocks
  vi.mock('better-sqlite3', () => {
    console.warn('[MOCK] Using better-sqlite3 mock for CI/CD environment')

    if (mocks.betterSqlite3Mock) {
      return {
        default: vi.fn().mockImplementation(() => mocks.betterSqlite3Mock),
      }
    }

    // Fallback if hoisted mocks aren't available - create in-memory storage
    const fallbackStorage = new Map<string, unknown>()
    let fallbackIdCounter = 1

    const mockDatabase = {
      exec: vi.fn().mockReturnValue({ changes: 0 }),
      prepare: vi.fn().mockImplementation((sql: string) => ({
        run: vi.fn().mockImplementation((params: Record<string, unknown>) => {
          if (sql.includes('INSERT')) {
            const key =
              params?.key || params?.$key || `key_${fallbackIdCounter++}`
            const value = params?.value || params?.$value || '{}'
            fallbackStorage.set(key, value)
            return { changes: 1, lastInsertRowid: fallbackIdCounter }
          }
          if (sql.includes('UPDATE')) {
            const key = params?.key || params?.$key
            if (key && fallbackStorage.has(key)) {
              fallbackStorage.set(key, params?.value || params?.$value || '{}')
              return { changes: 1 }
            }
            return { changes: 0 }
          }
          if (sql.includes('DELETE')) {
            const key = params?.key || params?.$key
            if (key) {
              const deleted = fallbackStorage.delete(key)
              return { changes: deleted ? 1 : 0 }
            }
            if (sql.includes('DELETE FROM storage_data')) {
              const size = fallbackStorage.size
              fallbackStorage.clear()
              return { changes: size }
            }
            return { changes: 0 }
          }
          return { changes: 1, lastInsertRowid: fallbackIdCounter++ }
        }),
        get: vi.fn().mockImplementation((params: Record<string, unknown>) => {
          if (sql.includes('COUNT')) {
            return { count: fallbackStorage.size }
          }
          const key = params?.key || params?.$key
          if (key && fallbackStorage.has(key)) {
            return {
              key,
              value: fallbackStorage.get(key),
              namespace: 'default',
              created_at: Date.now(),
              updated_at: Date.now(),
            }
          }
          return null
        }),
        all: vi.fn().mockImplementation(() => {
          const results: unknown[] = []
          for (const [key, value] of fallbackStorage.entries()) {
            results.push({
              key,
              value,
              namespace: 'default',
              created_at: Date.now(),
              updated_at: Date.now(),
            })
          }
          return results
        }),
        iterate: vi.fn().mockReturnValue([]),
      })),
      pragma: vi.fn().mockReturnValue(null),
      transaction: vi.fn().mockImplementation((fn: () => unknown) => fn),
      function: vi.fn(),
      aggregate: vi.fn(),
      backup: vi.fn().mockResolvedValue({}),
      close: vi.fn(),
      readonly: false,
      inTransaction: false,
      open: true,
      name: ':memory:',
      memory: true,
    }

    return {
      default: vi.fn().mockImplementation(() => mockDatabase),
    }
  })

  // Mock argon2 using hoisted mocks
  vi.mock('argon2', () => {
    console.warn('[MOCK] Using argon2 mock for CI/CD environment')

    if (mocks.argon2Mock) {
      return mocks.argon2Mock
    }

    // Fallback implementation
    return {
      hash: vi
        .fn()
        .mockImplementation(async (passphrase: string, options?: unknown) => {
          const crypto = await import('crypto')
          // Extract salt from options if provided
          const opts = options as Record<string, unknown>
          const salt = (opts?.salt as Buffer) || Buffer.from('default-salt')
          // Return a 32-byte buffer that varies based on passphrase and salt
          return crypto
            .createHash('sha256')
            .update(passphrase)
            .update(salt)
            .digest()
        }),
      verify: vi
        .fn()
        .mockImplementation(
          async (hash: string | Buffer, passphrase: string) => {
            const crypto = await import('crypto')
            const salt = Buffer.from('default-salt')
            const expectedHash = crypto
              .createHash('sha256')
              .update(passphrase)
              .update(salt)
              .digest()
            const hashBuffer = Buffer.isBuffer(hash)
              ? hash
              : Buffer.from(hash, 'hex')
            return hashBuffer.equals(expectedHash)
          }
        ),
      argon2id: 2,
      argon2i: 1,
      argon2d: 0,
    }
  })

  // Mock lz4 using hoisted mocks
  vi.mock('lz4', () => {
    if (mocks.lz4Mock) {
      return mocks.lz4Mock
    }

    return {
      encode: vi.fn((data) => Buffer.from(`lz4:${data.toString()}`)),
      decode: vi.fn((data) => Buffer.from(data.toString().replace('lz4:', ''))),
    }
  })

  // Mock brotli using hoisted mocks
  vi.mock('brotli', () => {
    if (mocks.brotliMock) {
      return mocks.brotliMock
    }

    return {
      compress: vi.fn((data) => Buffer.from(`brotli:${data.toString()}`)),
      decompress: vi.fn((data) =>
        Buffer.from(data.toString().replace('brotli:', ''))
      ),
    }
  })
}
