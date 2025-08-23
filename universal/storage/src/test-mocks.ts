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
const isCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true'
const forceUseMock = process.env.VITEST_MOCK_SQLITE === 'true'

// Use vi.hoisted to ensure these mocks are available during module resolution
const mocks = vi.hoisted(() => {
  const isCI =
    process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true'
  const forceUseMock = process.env.VITEST_MOCK_SQLITE === 'true'

  if (isCI || forceUseMock) {
    console.warn(
      '[HOISTED MOCK] Environment detected, preparing native dependency mocks'
    )

    return {
      betterSqlite3Mock: {
        exec: vi.fn().mockImplementation((sql: string) => {
          if (sql.includes('CREATE TABLE')) {
            return { changes: 0 }
          }
          return { changes: 0 }
        }),
        prepare: vi.fn().mockImplementation((sql: string) => {
          return {
            run: vi.fn().mockImplementation(() => {
              return { changes: 1, lastInsertRowid: Date.now() }
            }),
            get: vi.fn().mockImplementation(() => {
              if (sql.includes('SELECT') && sql.includes('migrations')) {
                return { version: 1 }
              }
              return null
            }),
            all: vi.fn().mockReturnValue([]),
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
        hash: vi.fn().mockImplementation(async (passphrase: string) => {
          const crypto = await import('crypto')
          return crypto.createHash('sha256').update(passphrase).digest()
        }),
        verify: vi
          .fn()
          .mockImplementation(
            async (hash: string | Buffer, passphrase: string) => {
              const crypto = await import('crypto')
              const expectedHash = crypto
                .createHash('sha256')
                .update(passphrase)
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

if (isCI || forceUseMock) {
  // Mock better-sqlite3 using hoisted mocks
  vi.mock('better-sqlite3', () => {
    console.warn('[MOCK] Using better-sqlite3 mock for CI/CD environment')

    if (mocks.betterSqlite3Mock) {
      return {
        default: vi.fn().mockImplementation(() => mocks.betterSqlite3Mock),
      }
    }

    // Fallback if hoisted mocks aren't available
    const mockDatabase = {
      exec: vi.fn().mockReturnValue({ changes: 0 }),
      prepare: vi.fn().mockReturnValue({
        run: vi
          .fn()
          .mockReturnValue({ changes: 1, lastInsertRowid: Date.now() }),
        get: vi.fn().mockReturnValue(null),
        all: vi.fn().mockReturnValue([]),
        iterate: vi.fn().mockReturnValue([]),
      }),
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
      hash: vi.fn().mockResolvedValue(Buffer.from('mocked-hash', 'hex')),
      verify: vi.fn().mockResolvedValue(true),
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
