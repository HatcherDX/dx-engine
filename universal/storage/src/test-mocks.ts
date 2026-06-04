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

// CRITICAL: vi.mock() MUST be at module top-level, not inside conditionals
// The conditional check happens inside the factory function
vi.mock('better-sqlite3', () => {
  // Check if we should mock at factory execution time
  const shouldMockSQLite =
    process.env.VITEST_USE_REAL_SQLITE !== 'true' &&
    (!!process.env.CI ||
      !!process.env.GITHUB_ACTIONS ||
      process.env.VITEST_MOCK_SQLITE === 'true')

  if (!shouldMockSQLite) {
    // Return actual module if mocking is disabled
    return vi.importActual('better-sqlite3')
  }

  console.warn('[MOCK] Using better-sqlite3 mock for CI/CD environment')

  /**
   * In-memory storage structure matching SQLite schema
   *
   * @remarks
   * Maps composite keys (namespace:key) to full row data.
   * Each Database instance gets its own Map for proper test isolation.
   *
   * @since 1.0.0
   */
  type StorageRow = {
    id: number
    namespace: string
    key: string
    value: string
    metadata: string
    created_at: number
    updated_at: number
    access_count: number
  }

  // Global storage map that gets cleared on each new Database instance
  const globalStorage = new Map<string, Map<string, StorageRow>>()

  let dbCounter = 0

  /**
   * Extracts parameter value from args array (positional or named)
   *
   * @param args - Statement arguments
   * @param index - Positional index
   * @param names - Named parameter keys to try
   * @returns Parameter value or undefined
   *
   * @since 1.0.0
   */
  const getParam = (
    args: unknown[],
    index: number,
    names: string[]
  ): unknown => {
    // Try positional first
    if (args.length > index && typeof args[index] !== 'object') {
      return args[index]
    }

    // Try named parameters
    if (args.length === 1 && typeof args[0] === 'object' && args[0] !== null) {
      const params = args[0] as Record<string, unknown>
      for (const name of names) {
        if (name in params) return params[name]
      }
    }

    return undefined
  }

  // Create the mock database object inline - no vi.hoisted, no shared state
  const createMockDatabase = () => {
    // Each database instance gets its own isolated storage
    const dbId = `db_${dbCounter++}`
    const mockStorage = new Map<string, StorageRow>()
    globalStorage.set(dbId, mockStorage)
    let idCounter = 1

    /**
     * Processes WHERE clause conditions for filtering
     *
     * @param row - Data row to test
     * @param args - Query parameters
     * @returns True if row matches conditions
     *
     * @since 1.0.0
     */
    const _matchesConditions = (row: StorageRow, args: unknown[]): boolean => {
      // Extract namespace from positional args (first param usually)
      if (args.length > 0 && typeof args[0] === 'string') {
        return row.namespace === args[0]
      }
      return true
    }

    return {
      exec: (sql: string) => {
        // Handle DELETE FROM storage (clear all data)
        if (sql.includes('DELETE FROM storage')) {
          const size = mockStorage.size
          mockStorage.clear()
          return { changes: size }
        }
        return { changes: 0 }
      },
      prepare: (sql: string) => {
        // Return a NEW object for each prepare() call
        return {
          run: (...args: unknown[]) => {
            // Handle INSERT OR REPLACE with positional params
            if (sql.includes('INSERT OR REPLACE')) {
              const id = getParam(args, 0, ['id', '$id'])
              const namespace = getParam(args, 1, ['namespace', '$namespace'])
              const key = getParam(args, 2, ['key', '$key'])
              const value = getParam(args, 3, ['value', '$value'])
              const metadata = getParam(args, 4, ['metadata', '$metadata'])
              const created_at = getParam(args, 5, [
                'created_at',
                '$created_at',
              ])
              const updated_at = getParam(args, 6, [
                'updated_at',
                '$updated_at',
              ])
              const access_count = getParam(args, 7, [
                'access_count',
                '$access_count',
              ])

              const compositeKey = `${namespace}:${key}`
              mockStorage.set(compositeKey, {
                id: (id as number) || idCounter++,
                namespace: namespace as string,
                key: key as string,
                value: value as string,
                metadata: metadata as string,
                created_at: created_at as number,
                updated_at: updated_at as number,
                access_count: (access_count as number) || 1,
              })
              return { changes: 1, lastInsertRowid: id as number }
            }

            // Handle DELETE FROM storage (clear all) - prepared statement
            if (sql.includes('DELETE FROM storage') && !sql.includes('WHERE')) {
              const size = mockStorage.size
              mockStorage.clear()
              return { changes: size }
            }

            // Handle DELETE with WHERE clause
            if (sql.includes('DELETE') && sql.includes('WHERE')) {
              const namespace = getParam(args, 0, ['namespace', '$namespace'])
              const key = getParam(args, 1, ['key', '$key'])
              const compositeKey = `${namespace}:${key}`

              if (mockStorage.has(compositeKey)) {
                mockStorage.delete(compositeKey)
                return { changes: 1 }
              }
              return { changes: 0 }
            }

            // Handle UPDATE for access_count
            if (sql.includes('UPDATE') && sql.includes('access_count')) {
              const namespace = getParam(args, 0, ['namespace', '$namespace'])
              const key = getParam(args, 1, ['key', '$key'])
              const compositeKey = `${namespace}:${key}`

              if (mockStorage.has(compositeKey)) {
                const existing = mockStorage.get(compositeKey)!
                mockStorage.set(compositeKey, {
                  ...existing,
                  access_count: existing.access_count + 1,
                })
                return { changes: 1 }
              }
              return { changes: 0 }
            }

            return { changes: 0 }
          },

          get: (...args: unknown[]) => {
            // Handle COUNT(*) with json_extract (for SQLiteQueryBuilder.count())
            if (sql.includes('COUNT(*)') && sql.includes('json_extract')) {
              const namespace = args[0] as string
              const conditionValues = args.slice(1)

              // Extract field names from SQL
              const fieldMatches = sql.match(/\$\.(\w+)/g) || []
              const fieldNames = fieldMatches.map((f) => f.substring(2))

              let count = 0
              for (const row of mockStorage.values()) {
                // Filter by namespace
                if (namespace && row.namespace !== namespace) continue

                // Parse JSON and check conditions
                const parsedValue = JSON.parse(row.value)
                let matches = true

                for (
                  let i = 0;
                  i < Math.min(fieldNames.length, conditionValues.length);
                  i++
                ) {
                  const fieldName = fieldNames[i]
                  const expectedValue = conditionValues[i]
                  const actualValue = parsedValue[fieldName]

                  if (actualValue !== expectedValue) {
                    matches = false
                    break
                  }
                }

                if (matches) count++
              }

              return { count }
            }

            // Handle getSize() with COUNT(*) + SUM(LENGTH)
            if (
              (sql.includes('COUNT(*)') || sql.includes('count')) &&
              sql.includes('SUM') &&
              sql.includes('length')
            ) {
              let totalSize = 0
              let metadataSize = 0
              let count = 0
              for (const row of mockStorage.values()) {
                totalSize += row.value.length
                metadataSize += row.metadata.length
                count++
              }
              return {
                count,
                total_size: totalSize,
                metadata_size: metadataSize,
              }
            }

            // Handle getSize() - just SUM without COUNT
            if (sql.includes('SUM') && sql.includes('length')) {
              let totalSize = 0
              let metadataSize = 0
              for (const row of mockStorage.values()) {
                totalSize += row.value.length
                metadataSize += row.metadata.length
              }
              return { total_size: totalSize, metadata_size: metadataSize }
            }

            // Handle MAX(length(value)) for largest item
            if (sql.includes('MAX') && sql.includes('length')) {
              let maxSize = 0
              for (const row of mockStorage.values()) {
                maxSize = Math.max(maxSize, row.value.length)
              }
              return { max_size: maxSize }
            }

            // Handle MIN(created_at) for oldest item
            if (sql.includes('MIN') && sql.includes('created_at')) {
              let minTime = Date.now()
              for (const row of mockStorage.values()) {
                minTime = Math.min(minTime, row.created_at)
              }
              return { oldest: minTime }
            }

            // Handle DISTINCT namespace for getStats
            if (sql.includes('DISTINCT') && sql.includes('namespace')) {
              const namespaces = new Set<string>()
              for (const row of mockStorage.values()) {
                namespaces.add(row.namespace)
              }
              // Return first namespace (real query would return all in all())
              return namespaces.size > 0
                ? { namespace: Array.from(namespaces)[0] }
                : null
            }

            // Handle COUNT(*) with LIKE pattern for count(prefix)
            if (sql.includes('COUNT(*)') && sql.includes('LIKE')) {
              let count = 0
              const pattern = getParam(args, 0, ['pattern', '$pattern'])
              const patternStr = pattern as string

              for (const row of mockStorage.values()) {
                const compositeKey = `${row.namespace}:${row.key}`
                // Convert SQL LIKE pattern (%) to regex
                if (patternStr === '%') {
                  count++
                } else if (patternStr.endsWith('%')) {
                  const prefix = patternStr.slice(0, -1)
                  if (compositeKey.startsWith(prefix)) {
                    count++
                  }
                } else if (compositeKey === patternStr) {
                  count++
                }
              }
              return { count }
            }

            // Handle COUNT(*) queries (without LIKE)
            if (sql.includes('COUNT(*)')) {
              let count = 0
              const namespace = getParam(args, 0, ['namespace', '$namespace'])

              for (const row of mockStorage.values()) {
                if (!namespace || row.namespace === namespace) {
                  count++
                }
              }
              return { count }
            }

            // Handle SELECT by namespace and key
            if (sql.includes('SELECT') && !sql.includes('COUNT')) {
              const namespace = getParam(args, 0, ['namespace', '$namespace'])
              const key = getParam(args, 1, ['key', '$key'])
              const compositeKey = `${namespace}:${key}`

              if (mockStorage.has(compositeKey)) {
                const row = mockStorage.get(compositeKey)!
                // Return only value and metadata (matching SQL SELECT columns)
                return {
                  value: row.value,
                  metadata: row.metadata,
                }
              }
            }

            return null
          },

          all: (...args: unknown[]) => {
            if (!sql.includes('SELECT')) return []

            // Handle SQLiteQueryBuilder queries with json_extract (for execute())
            if (sql.includes('json_extract')) {
              // Extract the JSON path and operator from SQL
              // SQL format: WHERE namespace = ? AND (json_extract(value, '$.field') = ?)
              const results: Array<{
                value: string
                metadata: string
              }> = []

              // First param is namespace (if WHERE namespace = ?)
              const namespace = args[0] as string
              // Remaining params are for json_extract conditions
              const conditionValues = args.slice(1)

              // Extract all field names from SQL
              const fieldMatches = sql.match(/\$\.(\w+)/g) || []
              const fieldNames = fieldMatches.map((f) => f.substring(2))

              for (const row of mockStorage.values()) {
                // Filter by namespace first
                if (namespace && row.namespace !== namespace) continue

                // Parse the JSON value
                const parsedValue = JSON.parse(row.value)

                // Check each condition (field:value pair)
                let matches = true
                for (
                  let i = 0;
                  i < Math.min(fieldNames.length, conditionValues.length);
                  i++
                ) {
                  const fieldName = fieldNames[i]
                  const expectedValue = conditionValues[i]
                  const actualValue = parsedValue[fieldName]

                  if (actualValue !== expectedValue) {
                    matches = false
                    break
                  }
                }

                if (matches) {
                  results.push({
                    value: row.value,
                    metadata: row.metadata,
                  })
                }
              }

              return results
            }

            // Handle batch SELECT for getMany() - SELECT namespace, key, value, metadata WHERE (namespace, key) IN (VALUES ...)
            if (sql.includes('IN (VALUES')) {
              const results: Array<{
                namespace: string
                key: string
                value: string
                metadata: string
              }> = []

              // Args are in pairs: namespace1, key1, namespace2, key2, ...
              for (let i = 0; i < args.length; i += 2) {
                const namespace = args[i] as string
                const key = args[i + 1] as string
                const compositeKey = `${namespace}:${key}`

                if (mockStorage.has(compositeKey)) {
                  const row = mockStorage.get(compositeKey)!
                  results.push({
                    namespace: row.namespace,
                    key: row.key,
                    value: row.value,
                    metadata: row.metadata,
                  })
                }
              }

              return results
            }

            // Handle DISTINCT namespace for getStats
            if (sql.includes('DISTINCT') && sql.includes('namespace')) {
              const namespaces = new Set<string>()
              for (const row of mockStorage.values()) {
                namespaces.add(row.namespace)
              }
              return Array.from(namespaces).map((ns) => ({ namespace: ns }))
            }

            // Handle list() query - SELECT key WHERE namespace LIKE ?
            if (sql.includes('SELECT key') && sql.includes('LIKE')) {
              const pattern = getParam(args, 0, ['pattern', '$pattern'])
              const patternStr = pattern as string
              const results: Array<{ key: string }> = []

              for (const row of mockStorage.values()) {
                // Convert SQL LIKE pattern (%) to match
                if (patternStr === '%') {
                  results.push({ key: `${row.namespace}:${row.key}` })
                } else if (patternStr.endsWith('%')) {
                  const prefix = patternStr.slice(0, -1)
                  if (row.namespace.startsWith(prefix)) {
                    results.push({ key: `${row.namespace}:${row.key}` })
                  }
                } else if (row.namespace === patternStr) {
                  results.push({ key: `${row.namespace}:${row.key}` })
                }
              }

              return results
            }

            const results: typeof mockStorage extends Map<string, infer R>
              ? R[]
              : never[] = []
            const namespace = getParam(args, 0, ['namespace', '$namespace'])
            const prefix = getParam(args, 1, ['prefix', '$prefix'])

            for (const row of mockStorage.values()) {
              // Filter by namespace if provided
              if (namespace && row.namespace !== namespace) continue

              // Filter by key prefix if provided
              if (prefix && !row.key.startsWith(prefix as string)) continue

              results.push(row)
            }

            // Handle LIMIT 1 for first()
            if (sql.includes('LIMIT 1') && results.length > 0) {
              return [results[0]]
            }

            return results
          },

          iterate: () => [],
        }
      },
      pragma: (pragmaStatement: string) => {
        if (pragmaStatement.includes('journal_mode')) return 'wal'
        if (pragmaStatement.includes('cache_size')) return 16000
        if (pragmaStatement.includes('foreign_keys')) return 1
        return null
      },

      /**
       * Creates a transaction function that executes all operations atomically
       *
       * @param fn - Transaction function to wrap
       * @returns Wrapped function that executes transaction
       *
       * @remarks
       * In mock, transactions execute immediately without rollback support.
       * Real SQLite transactions are ACID-compliant.
       *
       * @since 1.0.0
       */
      transaction: (fn: (...args: unknown[]) => unknown) => {
        return (...args: unknown[]) => {
          // In real SQLite, transactions are ACID-compliant with rollback support
          // Mock executes immediately without rollback
          return fn(...args)
        }
      },

      function: () => {},
      aggregate: () => {},
      backup: async () => ({}),
      close: () => {
        // Mock cleanup - in real SQLite closes file handle
      },
      readonly: false,
      inTransaction: false,
      open: true,
      name: ':memory:',
      memory: true,
    }
  }

  // Constructor that returns a fresh mock for each instantiation
  const DatabaseConstructor = function (this: unknown) {
    return createMockDatabase()
  }

  return {
    default: DatabaseConstructor,
  }
})

// Mock argon2 - MUST be at module top-level
vi.mock('argon2', () => {
  const shouldMockSQLite =
    process.env.VITEST_USE_REAL_SQLITE !== 'true' &&
    (!!process.env.CI ||
      !!process.env.GITHUB_ACTIONS ||
      process.env.VITEST_MOCK_SQLITE === 'true')

  if (!shouldMockSQLite) {
    return vi.importActual('argon2')
  }

  console.warn('[MOCK] Using argon2 mock for CI/CD environment')

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
      .mockImplementation(async (hash: string | Buffer, passphrase: string) => {
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
      }),
    argon2id: 2,
    argon2i: 1,
    argon2d: 0,
  }
})

// Mock lz4 - MUST be at module top-level
vi.mock('lz4', () => {
  const shouldMockSQLite =
    process.env.VITEST_USE_REAL_SQLITE !== 'true' &&
    (!!process.env.CI ||
      !!process.env.GITHUB_ACTIONS ||
      process.env.VITEST_MOCK_SQLITE === 'true')

  if (!shouldMockSQLite) {
    return vi.importActual('lz4')
  }

  return {
    encode: vi.fn((data) => Buffer.from(`lz4:${data.toString()}`)),
    decode: vi.fn((data) => Buffer.from(data.toString().replace('lz4:', ''))),
  }
})

// Mock brotli - MUST be at module top-level
vi.mock('brotli', () => {
  const shouldMockSQLite =
    process.env.VITEST_USE_REAL_SQLITE !== 'true' &&
    (!!process.env.CI ||
      !!process.env.GITHUB_ACTIONS ||
      process.env.VITEST_MOCK_SQLITE === 'true')

  if (!shouldMockSQLite) {
    return vi.importActual('brotli')
  }

  return {
    compress: vi.fn((data) => Buffer.from(`brotli:${data.toString()}`)),
    decompress: vi.fn((data) =>
      Buffer.from(data.toString().replace('brotli:', ''))
    ),
  }
})
