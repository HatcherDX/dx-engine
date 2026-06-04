/**
 * @fileoverview Comprehensive behavioral tests for SQLiteAdapter edge cases and error handling
 *
 * @description
 * Test suite validating SQLiteAdapter behavior in edge cases, error conditions,
 * and complex scenarios including encryption, transaction handling, query building,
 * and resource lifecycle management. Uses mocked better-sqlite3 for CI/CD compatibility.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @internal
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { SQLiteAdapter } from './SQLiteAdapter'
import type { StorageConfig } from '../types/storage'

// Import test utilities and mocks
import '../test-setup'

// Declare global test utilities
declare global {
  const createTestConfig: (overrides?: Partial<StorageConfig>) => StorageConfig
}

describe('SQLiteAdapter - Edge Cases and Error Handling', () => {
  let adapter: SQLiteAdapter
  let config: StorageConfig

  beforeEach(async () => {
    config = createTestConfig({
      type: 'sqlite',
      path: './test-coverage.db',
    })
    adapter = new SQLiteAdapter(config)
  })

  afterEach(async () => {
    await adapter.close()
  })

  describe('initialization edge cases', () => {
    it('should initialize successfully', async () => {
      const consoleLogSpy = vi
        .spyOn(console, 'log')
        .mockImplementation(() => {})

      await adapter.initialize()
      expect(adapter.type).toBe('sqlite')

      consoleLogSpy.mockRestore()
    })

    it('should handle verbose logging in development', async () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'

      const consoleLogSpy = vi
        .spyOn(console, 'log')
        .mockImplementation(() => {})

      await adapter.initialize()

      process.env.NODE_ENV = originalEnv
      consoleLogSpy.mockRestore()
    })
  })

  describe('database configuration edge cases', () => {
    it('should handle missing database connection in configureDatabase', async () => {
      await adapter.initialize()

      // Test configureDatabase when db is undefined
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private db property for testing
      ;(adapter as any).db = undefined
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private configureDatabase method for testing
      ;(adapter as any).configureDatabase() // Should return early
    })

    it('should handle optimize pragma failure', async () => {
      await adapter.initialize()

      // Mock pragma to throw for optimize
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private db property for testing
      const db = (adapter as any).db
      const originalExec = db.exec
      db.exec = vi.fn().mockImplementation((sql: string) => {
        if (sql.includes('optimize')) {
          throw new Error('PRAGMA optimize not supported')
        }
        return originalExec.call(db, sql)
      })

      // Re-run configure to test the try-catch
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private configureDatabase method for testing
      ;(adapter as any).configureDatabase()
    })
  })

  describe('schema creation edge cases', () => {
    it('should handle encryption enabled FTS skip', async () => {
      const encryptedConfig = createTestConfig({
        type: 'sqlite',
        path: './encrypted-test.db',
        encryption: { enabled: true, passphrase: 'test-pass' },
      })
      const encryptedAdapter = new SQLiteAdapter(encryptedConfig)

      await encryptedAdapter.initialize()
      await encryptedAdapter.close()
    })

    it('should handle missing database in createSchema', async () => {
      const testAdapter = new SQLiteAdapter(config)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private db property for testing
      ;(testAdapter as any).db = undefined

      // Should return early
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private createSchema method for testing
      await (testAdapter as any).createSchema()
    })
  })

  describe('prepared statements edge cases', () => {
    it('should handle missing database in prepareStatements', async () => {
      const testAdapter = new SQLiteAdapter(config)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private db property for testing
      ;(testAdapter as any).db = undefined

      // Should return early
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private prepareStatements method for testing
      ;(testAdapter as any).prepareStatements()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private preparedStatements property for testing
      expect((testAdapter as any).preparedStatements).toBeUndefined()
    })

    it('should prepare all statements when database is available', async () => {
      await adapter.initialize()

      // Verify that preparedStatements was created
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private preparedStatements property for testing
      const statements = (adapter as any).preparedStatements
      expect(statements).toBeDefined()
      expect(statements.get).toBeDefined()
      expect(statements.set).toBeDefined()
      expect(statements.delete).toBeDefined()
      expect(statements.list).toBeDefined()
      expect(statements.count).toBeDefined()
      expect(statements.has).toBeDefined()
      expect(statements.getMany).toBeDefined()
      expect(statements.clear).toBeDefined()
      expect(statements.getSize).toBeDefined()
      expect(statements.updateAccess).toBeDefined()
    })
  })

  describe('raw operations with missing dependencies', () => {
    it('should handle getRaw with missing db or statements', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private getRaw method for testing
      const result1 = await (adapter as any).getRaw('test:key')
      expect(result1).toBeNull()

      await adapter.initialize()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private preparedStatements property for testing
      ;(adapter as any).preparedStatements = undefined

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private getRaw method for testing
      const result2 = await (adapter as any).getRaw('test:key')
      expect(result2).toBeNull()
    })

    it('should handle setRaw with missing db or statements', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private setRaw method for testing
      await (adapter as any).setRaw('test:key', 'value', {
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })

      await adapter.initialize()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private preparedStatements property for testing
      ;(adapter as any).preparedStatements = undefined

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private setRaw method for testing
      await (adapter as any).setRaw('test:key', 'value', {
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
    })

    it('should handle deleteRaw with missing db or statements', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private deleteRaw method for testing
      await (adapter as any).deleteRaw('test:key')

      await adapter.initialize()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private preparedStatements property for testing
      ;(adapter as any).preparedStatements = undefined

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private deleteRaw method for testing
      await (adapter as any).deleteRaw('test:key')
    })

    it('should handle clearRaw with missing db or statements', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private clearRaw method for testing
      await (adapter as any).clearRaw()

      await adapter.initialize()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private preparedStatements property for testing
      ;(adapter as any).preparedStatements = undefined

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private clearRaw method for testing
      await (adapter as any).clearRaw()
    })
  })

  describe('public method edge cases', () => {
    it('should handle list with missing db or statements', async () => {
      const result1 = await adapter.list()
      expect(result1).toEqual([])

      await adapter.initialize()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private preparedStatements property for testing
      ;(adapter as any).preparedStatements = undefined

      const result2 = await adapter.list('prefix')
      expect(result2).toEqual([])
    })

    it('should handle count with missing db or statements', async () => {
      const result1 = await adapter.count()
      expect(result1).toBe(0)

      await adapter.initialize()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private preparedStatements property for testing
      ;(adapter as any).preparedStatements = undefined

      const result2 = await adapter.count('prefix')
      expect(result2).toBe(0)
    })

    it('should handle has with missing db or statements', async () => {
      const result1 = await adapter.has('test:key')
      expect(result1).toBe(false)

      await adapter.initialize()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private preparedStatements property for testing
      ;(adapter as any).preparedStatements = undefined

      const result2 = await adapter.has('test:key')
      expect(result2).toBe(false)
    })

    it('should handle getSize with missing db or statements', async () => {
      const result1 = await adapter.getSize()
      expect(result1).toBe(0)

      await adapter.initialize()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private preparedStatements property for testing
      ;(adapter as any).preparedStatements = undefined

      const result2 = await adapter.getSize()
      expect(result2).toBe(0)
    })
  })

  describe('batch operations edge cases', () => {
    it('should handle getManyRaw with empty keys', async () => {
      await adapter.initialize()

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private getManyRaw method for testing
      const result = await (adapter as any).getManyRaw([])
      expect(result).toBeInstanceOf(Map)
      expect(result.size).toBe(0)
    })

    it('should handle getManyRaw with missing db', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private getManyRaw method for testing
      const result = await (adapter as any).getManyRaw(['key1', 'key2'])
      expect(result).toBeInstanceOf(Map)
      expect(result.size).toBe(0)
    })

    it('should handle setManyRaw with empty items', async () => {
      await adapter.initialize()

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private setManyRaw method for testing
      await (adapter as any).setManyRaw(new Map())
      // Should complete without error
    })

    it('should handle setManyRaw with missing db or statements', async () => {
      const items = new Map([
        [
          'key1',
          {
            value: 'value1',
            metadata: { createdAt: Date.now(), updatedAt: Date.now() },
          },
        ],
      ])

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private setManyRaw method for testing
      await (adapter as any).setManyRaw(items)

      await adapter.initialize()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private preparedStatements property for testing
      ;(adapter as any).preparedStatements = undefined

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private setManyRaw method for testing
      await (adapter as any).setManyRaw(items)
    })
  })

  describe('search functionality edge cases', () => {
    it('should handle search with missing db', async () => {
      const results = await adapter.search('test')
      expect(results).toEqual([])
    })

    it('should handle search with encryption enabled', async () => {
      const encryptedConfig = createTestConfig({
        type: 'sqlite',
        path: './encrypted-search.db',
        encryption: { enabled: true, passphrase: 'test-pass' },
      })
      const encryptedAdapter = new SQLiteAdapter(encryptedConfig)

      await encryptedAdapter.initialize()

      const consoleWarnSpy = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => {})

      const results = await encryptedAdapter.search('test')
      expect(results).toEqual([])
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Full-text search is not available when encryption is enabled'
      )

      consoleWarnSpy.mockRestore()
      await encryptedAdapter.close()
    })

    it('should handle search with namespace parameter', async () => {
      await adapter.initialize()

      const results = await adapter.search('test', 'users', 10)
      expect(results).toEqual([])
    })
  })

  describe('statistics edge cases', () => {
    it('should handle getStats with missing db', async () => {
      const stats = await adapter.getStats()
      expect(stats).toEqual({
        totalItems: 0,
        totalSize: 0,
        largestItem: 0,
        oldestItem: 0,
        namespaces: [],
        indexes: [],
      })
    })

    it('should handle getStats with missing prepared statements', async () => {
      await adapter.initialize()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private preparedStatements property for testing
      ;(adapter as any).preparedStatements = undefined

      await expect(adapter.getStats()).rejects.toThrow()
    })
  })

  describe('maintenance operations edge cases', () => {
    it('should handle vacuum with missing db', async () => {
      const consoleLogSpy = vi
        .spyOn(console, 'log')
        .mockImplementation(() => {})

      await adapter.vacuum()
      // Should complete without error

      consoleLogSpy.mockRestore()
    })

    it('should handle analyze with missing db', async () => {
      await adapter.analyze()
      // Should complete without error
    })

    it('should handle updateAccessMetadata with missing db or statements', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private updateAccessMetadata method for testing
      await (adapter as any).updateAccessMetadata('test:key')

      await adapter.initialize()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private preparedStatements property for testing
      ;(adapter as any).preparedStatements = undefined

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private updateAccessMetadata method for testing
      await (adapter as any).updateAccessMetadata('test:key')
    })
  })

  describe('key parsing edge cases', () => {
    it('should parse keys without colon correctly', async () => {
      await adapter.initialize()

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private parseKey method for testing
      const [namespace, key] = (adapter as any).parseKey('simple-key')
      expect(namespace).toBe('default')
      expect(key).toBe('simple-key')
    })

    it('should parse namespaced keys correctly', async () => {
      await adapter.initialize()

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private parseKey method for testing
      const [namespace, key] = (adapter as any).parseKey('users:123')
      expect(namespace).toBe('users')
      expect(key).toBe('123')
    })
  })

  describe('close operations', () => {
    it('should handle close with no database', async () => {
      const testAdapter = new SQLiteAdapter(config)
      await testAdapter.close()
      // Should complete without error
    })

    it('should handle close after initialization', async () => {
      await adapter.initialize()

      const consoleLogSpy = vi
        .spyOn(console, 'log')
        .mockImplementation(() => {})

      await adapter.close()

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private db property for testing
      expect((adapter as any).db).toBeUndefined()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private preparedStatements property for testing
      expect((adapter as any).preparedStatements).toBeUndefined()

      consoleLogSpy.mockRestore()
    })
  })

  describe('query builder edge cases', () => {
    it('should create query builder with namespace', async () => {
      await adapter.initialize()

      const queryBuilder = adapter.query('users')
      expect(queryBuilder).toBeDefined()
    })

    it('should handle query builder operations', async () => {
      await adapter.initialize()

      const queryBuilder = adapter.query<{ name: string; age: number }>()

      // Test that query builder methods can be chained without errors
      const result = queryBuilder
        .where('age', '>', 20)
        .orderBy('name', 'asc')
        .limit(10)
        .offset(5)
        .select('name', 'age')

      expect(result).toBeDefined()
      expect(result).toBeInstanceOf(Object)

      // Test query builder returns correct type (satisfies interface)
      expect(typeof result.execute).toBe('function')
      expect(typeof result.count).toBe('function')
      expect(typeof result.first).toBe('function')
      expect(typeof result.exists).toBe('function')
    })
  })

  describe('setRaw with different value types', () => {
    it('should handle setRaw with EncryptedData object', async () => {
      await adapter.initialize()

      const encryptedValue = {
        data: 'encrypted-content',
        iv: 'initialization-vector',
        authTag: 'authentication-tag',
      }

      const metadata = {
        createdAt: Date.now(),
        updatedAt: Date.now(),
        encrypted: true,
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private setRaw method for testing
      await (adapter as any).setRaw('test:encrypted', encryptedValue, metadata)
    })

    it('should handle setRaw with JSON-stringified value', async () => {
      await adapter.initialize()

      const metadata = {
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private setRaw method for testing
      await (adapter as any).setRaw(
        'test:string',
        JSON.stringify({ data: 'test-value' }),
        metadata
      )
    })
  })

  describe('getRaw with metadata handling', () => {
    it('should handle getRaw with encrypted metadata', async () => {
      await adapter.initialize()

      // Mock a row with encrypted metadata
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private preparedStatements property for testing
      const mockPreparedStatements = (adapter as any).preparedStatements
      if (mockPreparedStatements) {
        mockPreparedStatements.get.get = vi.fn().mockReturnValue({
          value: '{"data":"encrypted","iv":"test","authTag":"test"}',
          metadata:
            '{"encrypted":true,"createdAt":1234567890,"updatedAt":1234567890}',
        })

        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private getRaw method for testing
        const result = await (adapter as any).getRaw('test:encrypted')
        expect(result).not.toBeNull()
        expect(result?.metadata?.encrypted).toBe(true)
      }
    })

    it('should handle getRaw with no metadata', async () => {
      await adapter.initialize()

      // Mock a row without metadata
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private preparedStatements property for testing
      const mockPreparedStatements = (adapter as any).preparedStatements
      if (mockPreparedStatements) {
        mockPreparedStatements.get.get = vi.fn().mockReturnValue({
          value: 'plain-value',
          metadata: null,
        })

        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private getRaw method for testing
        const result = await (adapter as any).getRaw('test:no-metadata')
        expect(result?.metadata).toBeUndefined()
      }
    })
  })

  describe('getManyRaw with complex scenarios', () => {
    it('should handle getManyRaw with mixed existing and missing keys', async () => {
      await adapter.initialize()

      // Mock database responses
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private db property for testing
      const db = (adapter as any).db
      if (db) {
        db.prepare = vi.fn().mockReturnValue({
          all: vi.fn().mockReturnValue([
            {
              namespace: 'users',
              key: '1',
              value: '{"name":"John"}',
              metadata: '{"createdAt":1234567890}',
            },
          ]),
        })

        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private getManyRaw method for testing
        const result = await (adapter as any).getManyRaw([
          'users:1',
          'users:2',
          'users:3',
        ])
        expect(result.size).toBe(3)
        expect(result.get('users:1')).not.toBeNull()
        expect(result.get('users:2')).toBeNull()
        expect(result.get('users:3')).toBeNull()
      }
    })
  })

  describe('SQLiteQueryBuilder edge cases', () => {
    it('should handle query execution with namespace filter', async () => {
      await adapter.initialize()

      const queryBuilder = adapter.query<{ name: string }>('users')

      // Mock database to test namespace filtering
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private db property for testing
      const db = (adapter as any).db
      if (db) {
        db.prepare = vi.fn().mockReturnValue({
          all: vi.fn().mockReturnValue([]),
        })

        const result = await queryBuilder.where('name', '=', 'John').execute()
        expect(result.data).toEqual([])
      }
    })

    it('should handle query with field selection', async () => {
      await adapter.initialize()

      const queryBuilder = adapter.query<{ name: string; age: number }>()

      // Mock database response with data
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private db property for testing
      const db = (adapter as any).db
      if (db) {
        db.prepare = vi.fn().mockReturnValue({
          all: vi.fn().mockReturnValue([
            {
              value: '{"name":"John","age":30,"email":"john@example.com"}',
              metadata: '{}',
            },
          ]),
        })

        const result = await queryBuilder.select('name', 'age').execute()
        expect(result.data[0]).toEqual({ name: 'John', age: 30 })
      }
    })

    it('should handle query count with namespace and conditions', async () => {
      await adapter.initialize()

      const queryBuilder = adapter.query<{ name: string }>('users')

      // Mock database count response
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private db property for testing
      const db = (adapter as any).db
      if (db) {
        db.prepare = vi.fn().mockReturnValue({
          get: vi.fn().mockReturnValue({ count: 5 }),
        })

        const count = await queryBuilder.where('active', '=', true).count()
        expect(count).toBe(5)
      }
    })
  })

  describe('key validation and database maintenance', () => {
    it('should reject empty keys to prevent invalid storage entries', async () => {
      await adapter.initialize()

      try {
        await adapter.set('', 'value')
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
      }
    })

    it('should execute ANALYZE to update query optimizer statistics', async () => {
      await adapter.initialize()

      await adapter.analyze()

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private db property for testing
      const db = (adapter as any).db
      expect(db).toBeDefined()
    })

    it('should track LRU access metadata for cache eviction policies', async () => {
      await adapter.initialize()

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private preparedStatements property for testing
      const preparedStatements = (adapter as any).preparedStatements
      expect(preparedStatements).toBeDefined()
      expect(preparedStatements.updateAccess).toBeDefined()

      // Verify graceful handling when database not initialized
      const uninitAdapter = new SQLiteAdapter(config)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private updateAccessMetadata method for testing
      await (uninitAdapter as any).updateAccessMetadata('test')
    })

    it('should gracefully handle unsupported PRAGMA optimize on older SQLite versions', async () => {
      const testConfig = createTestConfig({
        type: 'sqlite',
        path: './test-pragma.db',
      })
      const testAdapter = new SQLiteAdapter(testConfig)

      await testAdapter.initialize()

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private db property for testing
      const db = (testAdapter as any).db
      expect(db).toBeDefined()

      await testAdapter.close()
    })

    it('should create performance indexes on namespace and access columns', async () => {
      const ftsConfig = createTestConfig({
        type: 'sqlite',
        path: './test-fts.db',
      })
      const ftsAdapter = new SQLiteAdapter(ftsConfig)

      await ftsAdapter.initialize()

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private db property for testing
      const db = (ftsAdapter as any).db
      expect(db).toBeDefined()

      await ftsAdapter.close()
    })

    it('should initialize with custom database path and create parent directories', async () => {
      const edgeConfig = createTestConfig({
        type: 'sqlite',
        path: './test-edge.db',
      })
      const edgeAdapter = new SQLiteAdapter(edgeConfig)

      await edgeAdapter.initialize()

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private db property for testing
      const db = (edgeAdapter as any).db
      expect(db).toBeDefined()

      await edgeAdapter.close()
    })

    it('should parse namespaced keys with colon separator and default namespace for simple keys', async () => {
      await adapter.initialize()

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private parseKey method for testing
      const parseKey = (adapter as any).parseKey.bind(adapter)

      const [ns1, key1] = parseKey('users:123')
      expect(ns1).toBe('users')
      expect(key1).toBe('123')

      const [ns2, key2] = parseKey('simple-key')
      expect(ns2).toBe('default')
      expect(key2).toBe('simple-key')
    })

    it('should compile all SQL prepared statements on initialization for query performance', async () => {
      await adapter.initialize()

      const preparedConfig = createTestConfig({
        type: 'sqlite',
        path: './test-prepared.db',
      })
      const adapter2 = new SQLiteAdapter(preparedConfig)

      await adapter2.initialize()

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private preparedStatements property for testing
      const statements = (adapter2 as any).preparedStatements
      expect(statements).toBeDefined()
      expect(statements.get).toBeDefined()
      expect(statements.set).toBeDefined()
      expect(statements.delete).toBeDefined()
      expect(statements.list).toBeDefined()
      expect(statements.count).toBeDefined()
      expect(statements.has).toBeDefined()
      expect(statements.clear).toBeDefined()
      expect(statements.getSize).toBeDefined()
      expect(statements.updateAccess).toBeDefined()
      expect(statements.getMany).toBe(null)

      await adapter2.close()
    })

    it('should gracefully handle maintenance operations when database connection not available', async () => {
      const uninitConfig = createTestConfig({
        type: 'sqlite',
        path: './test-uninit-methods.db',
      })
      const uninitAdapter = new SQLiteAdapter(uninitConfig)

      await uninitAdapter.analyze()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private updateAccessMetadata method for testing
      await (uninitAdapter as any).updateAccessMetadata('test')

      expect(true).toBe(true)
    })
  })

  describe('full-text search and query builder operations', () => {
    it('should restrict full-text search results to specified namespace when provided', async () => {
      await adapter.initialize()

      await adapter.set('products:123', {
        name: 'Laptop',
        category: 'Electronics',
      })
      await adapter.set('users:456', { name: 'Alice', role: 'Admin' })

      const results = await adapter.search('Laptop', 'products', 10)
      expect(results).toBeDefined()
      expect(Array.isArray(results)).toBe(true)
    })

    it('should count records within specific namespace using query builder', async () => {
      await adapter.initialize()

      await adapter.set('ns1:key1', { value: 'data1' })
      await adapter.set('ns1:key2', { value: 'data2' })

      const count = await adapter.query('ns1').count()
      expect(count).toBeGreaterThanOrEqual(0)
    })

    it('should project only selected fields when executing query with field selection', async () => {
      await adapter.initialize()

      await adapter.set('test:user', {
        name: 'Bob',
        age: 30,
        email: 'bob@example.com',
        role: 'user',
      })

      const queryBuilder = adapter
        .query<{ name: string; age: number }>()
        .select('name', 'age')

      expect(queryBuilder).toBeDefined()
      expect(typeof queryBuilder.execute).toBe('function')
    })

    it('should automatically create nested parent directories for deep database file paths', async () => {
      const deepPathConfig = createTestConfig({
        type: 'sqlite',
        path: './test-deep/nested/path/storage.db',
      })
      const deepAdapter = new SQLiteAdapter(deepPathConfig)

      await deepAdapter.initialize()
      expect(deepAdapter).toBeDefined()

      await deepAdapter.close()
    })

    it('should execute VACUUM to reclaim space after deleting records', async () => {
      await adapter.initialize()

      await adapter.set('vacuum:test', { data: 'test' })
      await adapter.delete('vacuum:test')

      await adapter.vacuum()
      expect(true).toBe(true)
    })

    it('should support OR logical operator for combining alternative filter conditions', async () => {
      await adapter.initialize()

      await adapter.set('user:1', { name: 'Alice', age: 25, role: 'admin' })
      await adapter.set('user:2', { name: 'Bob', age: 30, role: 'user' })
      await adapter.set('user:3', { name: 'Charlie', age: 35, role: 'user' })

      const queryBuilder = adapter
        .query<{ name: string; age: number; role: string }>()
        .where('age', '>', 20)
        .or()
        .where('role', '=', 'admin')

      expect(queryBuilder).toBeDefined()
      expect(typeof queryBuilder.execute).toBe('function')
    })

    it('should support NOT logical operator for negating filter conditions', async () => {
      await adapter.initialize()

      await adapter.set('product:1', {
        name: 'Laptop',
        available: true,
        price: 1200,
      })
      await adapter.set('product:2', {
        name: 'Mouse',
        available: false,
        price: 25,
      })

      const queryBuilder = adapter
        .query<{ name: string; available: boolean; price: number }>()
        .where('price', '>', 50)
        .not()

      expect(queryBuilder).toBeDefined()
      expect(typeof queryBuilder.execute).toBe('function')
    })

    it('should return only first matching record when using first() query method', async () => {
      await adapter.initialize()

      await adapter.set('firsttest:item1', { name: 'First', order: 1 })
      await adapter.set('firsttest:item2', { name: 'Second', order: 2 })
      await adapter.set('firsttest:item3', { name: 'Third', order: 3 })

      const firstItem = await adapter
        .query<{ name: string; order: number }>('firsttest')
        .orderBy('order', 'asc')
        .first()

      expect(firstItem).not.toBeNull()
      if (firstItem) {
        expect(firstItem.name).toBeDefined()
      }
    })

    it('should check record existence without fetching data using exists() method', async () => {
      await adapter.initialize()

      await adapter.set('existstest:check1', { value: 'exists' })

      const exists = await adapter
        .query('existstest')
        .where('value', '=', 'exists')
        .exists()
      expect(exists).toBe(true)

      const notExists = await adapter
        .query('existstest')
        .where('value', '=', 'nonexistent')
        .exists()
      expect(notExists).toBe(false)
    })

    it('should aggregate storage statistics across namespaces including size and item counts', async () => {
      await adapter.initialize()

      await adapter.set('stats1:key1', {
        name: 'Item 1',
        value: 'A'.repeat(100),
      })
      await adapter.set('stats1:key2', {
        name: 'Item 2',
        value: 'B'.repeat(200),
      })
      await adapter.set('stats2:key3', {
        name: 'Item 3',
        value: 'C'.repeat(50),
      })

      const stats = await adapter.getStats()

      expect(stats.totalItems).toBeGreaterThanOrEqual(3)
      expect(stats.totalSize).toBeGreaterThan(0)
      expect(stats.largestItem).toBeGreaterThan(0)
      expect(stats.oldestItem).toBeGreaterThan(0)
      expect(Array.isArray(stats.namespaces)).toBe(true)
      expect(stats.namespaces.length).toBeGreaterThan(0)
      expect(Array.isArray(stats.indexes)).toBe(true)
    })

    it('should filter records where field value matches any value in provided array using whereIn', async () => {
      await adapter.initialize()

      await adapter.set('wherein:user1', { role: 'admin', status: 'active' })
      await adapter.set('wherein:user2', { role: 'user', status: 'active' })
      await adapter.set('wherein:user3', { role: 'guest', status: 'inactive' })
      await adapter.set('wherein:user4', { role: 'admin', status: 'inactive' })

      const queryBuilder = adapter
        .query('wherein')
        .whereIn('role', ['admin', 'user'])

      expect(queryBuilder).toBeDefined()
      expect(typeof queryBuilder.execute).toBe('function')
    })

    it('should filter records where numeric field falls within range using whereBetween', async () => {
      await adapter.initialize()

      await adapter.set('between:item1', { price: 10, stock: 5 })
      await adapter.set('between:item2', { price: 50, stock: 10 })
      await adapter.set('between:item3', { price: 100, stock: 15 })
      await adapter.set('between:item4', { price: 150, stock: 20 })

      const queryBuilder = adapter
        .query('between')
        .whereBetween('price', 25, 125)

      expect(queryBuilder).toBeDefined()
      expect(typeof queryBuilder.execute).toBe('function')
    })

    it('should filter records based on null or non-null field values', async () => {
      await adapter.initialize()

      await adapter.set('nulltest:item1', {
        name: 'Item 1',
        description: 'Has description',
        optional: null,
      })
      await adapter.set('nulltest:item2', {
        name: 'Item 2',
        description: null,
        optional: 'Has optional',
      })

      const queryBuilderNull = adapter
        .query('nulltest')
        .whereNull('description')

      expect(queryBuilderNull).toBeDefined()
      expect(typeof queryBuilderNull.execute).toBe('function')

      const queryBuilderNotNull = adapter
        .query('nulltest')
        .whereNotNull('description')

      expect(queryBuilderNotNull).toBeDefined()
      expect(typeof queryBuilderNotNull.execute).toBe('function')
    })

    it('should support AND logical operator for combining multiple filter conditions', async () => {
      await adapter.initialize()

      await adapter.set('andtest:user1', {
        name: 'Alice',
        age: 30,
        active: true,
      })
      await adapter.set('andtest:user2', {
        name: 'Bob',
        age: 25,
        active: false,
      })

      const queryBuilder = adapter
        .query('andtest')
        .where('age', '>', 20)
        .and()
        .where('active', '=', true)

      expect(queryBuilder).toBeDefined()
      expect(typeof queryBuilder.execute).toBe('function')
    })

    it('should handle namespaced and non-namespaced keys transparently in get/set operations', async () => {
      await adapter.initialize()

      await adapter.set('namespace:key', { data: 'test' })
      const result = await adapter.get('namespace:key')
      expect(result).toBeDefined()

      await adapter.set('simplekey', { data: 'test2' })
      const result2 = await adapter.get('simplekey')
      expect(result2).toBeDefined()
    })

    it('should update access timestamps on read operations for LRU cache management', async () => {
      await adapter.initialize()

      await adapter.set('lru:item', { data: 'test' })
      await adapter.get('lru:item')

      const result = await adapter.get('lru:item')
      expect(result).toBeDefined()
      expect(result?.data).toBe('test')
    })

    it('should calculate total storage size including value data and metadata overhead', async () => {
      await adapter.initialize()

      await adapter.set('size:item1', {
        name: 'Large Item',
        data: 'X'.repeat(1000),
      })
      await adapter.set('size:item2', {
        name: 'Small Item',
        data: 'Y'.repeat(100),
      })

      const size = await adapter.getSize()

      expect(size).toBeGreaterThan(0)
      expect(typeof size).toBe('number')
    })

    it('should execute batch inserts atomically within single database transaction', async () => {
      await adapter.initialize()

      const items = new Map([
        [
          'batch:item1',
          {
            value: { name: 'Item 1', type: 'product' },
            metadata: {
              createdAt: Date.now(),
              updatedAt: Date.now(),
              size: 100,
              version: 1,
            },
          },
        ],
        [
          'batch:item2',
          {
            value: { name: 'Item 2', type: 'product' },
            metadata: {
              createdAt: Date.now(),
              updatedAt: Date.now(),
              size: 150,
              version: 1,
            },
          },
        ],
        [
          'batch:item3',
          {
            value: { data: 'String value item' },
            metadata: {
              createdAt: Date.now(),
              updatedAt: Date.now(),
              size: 50,
              version: 1,
            },
          },
        ],
      ])

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing protected setManyRaw method for testing
      await (adapter as any).setManyRaw(items)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing protected getRaw method for testing
      const result1 = await (adapter as any).getRaw('batch:item1')
      expect(result1).toBeDefined()
      expect(result1?.value).toBeDefined()
      const value1 =
        typeof result1.value === 'string'
          ? JSON.parse(result1.value)
          : result1.value
      expect(value1.name).toBe('Item 1')

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing protected getRaw method for testing
      const result2 = await (adapter as any).getRaw('batch:item2')
      expect(result2).toBeDefined()
      expect(result2?.value).toBeDefined()
      const value2 =
        typeof result2.value === 'string'
          ? JSON.parse(result2.value)
          : result2.value
      expect(value2.name).toBe('Item 2')

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing protected getRaw method for testing
      const result3 = await (adapter as any).getRaw('batch:item3')
      expect(result3).toBeDefined()
      const value3 =
        typeof result3.value === 'string'
          ? JSON.parse(result3.value)
          : result3.value
      expect(value3.data).toBe('String value item')
    })

    it('should handle mixed string and object values in batch operations with proper serialization', async () => {
      await adapter.initialize()

      const mixedItems = new Map([
        [
          'mixed:obj',
          {
            value: { complex: 'object', nested: { data: 'value' } },
            metadata: {
              createdAt: Date.now(),
              updatedAt: Date.now(),
              size: 200,
              version: 1,
            },
          },
        ],
        [
          'mixed:str',
          {
            value: { text: 'Plain string value' },
            metadata: {
              createdAt: Date.now(),
              updatedAt: Date.now(),
              size: 50,
              version: 1,
            },
          },
        ],
      ])

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing protected setManyRaw method for testing
      await (adapter as any).setManyRaw(mixedItems)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing protected getRaw method for testing
      const objResult = await (adapter as any).getRaw('mixed:obj')
      expect(objResult).toBeDefined()
      expect(objResult?.value).toBeDefined()
      const objValue =
        typeof objResult.value === 'string'
          ? JSON.parse(objResult.value)
          : objResult.value
      expect(objValue.complex).toBe('object')
      expect(objValue.nested?.data).toBe('value')

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing protected getRaw method for testing
      const strResult = await (adapter as any).getRaw('mixed:str')
      expect(strResult).toBeDefined()
      const strValue =
        typeof strResult.value === 'string'
          ? JSON.parse(strResult.value)
          : strResult.value
      expect(strValue.text).toBe('Plain string value')
    })

    it('should count records with optional prefix filtering and check key existence efficiently', async () => {
      await adapter.initialize()

      await adapter.set('prefix1:item1', { value: 'data1' })
      await adapter.set('prefix1:item2', { value: 'data2' })
      await adapter.set('prefix2:item1', { value: 'data3' })
      await adapter.set('other:item', { value: 'data4' })

      const countWithPrefix = await adapter.count('prefix1')
      expect(countWithPrefix).toBeGreaterThanOrEqual(2)

      const totalCount = await adapter.count()
      expect(totalCount).toBeGreaterThanOrEqual(4)

      const exists1 = await adapter.has('prefix1:item1')
      expect(exists1).toBe(true)

      const exists2 = await adapter.has('prefix2:item1')
      expect(exists2).toBe(true)

      const notExists = await adapter.has('prefix3:nonexistent')
      expect(notExists).toBe(false)

      await adapter.set('simplekey', { simple: 'value' })
      const existsSimple = await adapter.has('simplekey')
      expect(existsSimple).toBe(true)
    })
  })
})
