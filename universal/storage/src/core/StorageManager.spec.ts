/**
 * @fileoverview Tests for StorageManager core functionality
 *
 * @description
 * Comprehensive tests for the main storage manager including
 * initialization, adapter selection, namespacing, and migration integration.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { StorageManager } from './StorageManager'
import type { StorageConfig } from '../types/storage'

// Import test utilities
import '../test-setup'

// Declare global test utilities
declare global {
  const createTestConfig: (overrides?: Partial<StorageConfig>) => StorageConfig
  const createSecureTestConfig: (
    overrides?: Partial<StorageConfig>
  ) => StorageConfig
}

describe('StorageManager', () => {
  let storage: StorageManager
  let config: StorageConfig

  beforeEach(() => {
    vi.clearAllMocks()
    config = createTestConfig()
    storage = new StorageManager(config)
  })

  describe('initialization', () => {
    it('should initialize with memory adapter', async () => {
      await expect(storage.initialize()).resolves.not.toThrow()
      expect(storage.underlyingAdapter.type).toBe('memory')
    })

    // SKIP: SQLite integration test requires native bindings compiled for Electron's Node.js v23.x
    // (MODULE_VERSION 133), but tests run on system Node.js v22.x (MODULE_VERSION 127).
    // This test is always skipped - use SQLiteAdapter.spec.ts for full SQLite testing in Electron environment.
    it.skip('should initialize with sqlite adapter', async () => {
      const sqliteConfig: StorageConfig = {
        type: 'sqlite',
        path: ':memory:',
        encryption: { enabled: false },
        compression: { enabled: false },
      }

      const sqliteStorage = new StorageManager(sqliteConfig)
      await expect(sqliteStorage.initialize()).resolves.not.toThrow()
      expect(sqliteStorage.underlyingAdapter.type).toBe('sqlite')
      await sqliteStorage.close()
    })

    it('should run migrations during initialization', async () => {
      const migrationSpy = vi.fn().mockResolvedValue([])
      storage.addMigration({
        version: '1.0.0',
        description: 'Test migration',
        up: migrationSpy,
      })

      await storage.initialize()
      expect(migrationSpy).toHaveBeenCalledWith(storage.underlyingAdapter)
    })

    it('should initialize vault when encryption is enabled', async () => {
      const secureConfig = createSecureTestConfig()
      const secureStorage = new StorageManager(secureConfig)

      await secureStorage.initialize()
      expect(() => secureStorage.vaultStorage).not.toThrow()
    })

    it('should handle initialization errors gracefully', async () => {
      const failConfig = createTestConfig()
      const failStorage = new StorageManager(failConfig)

      // Mock the adapter's initialize to fail
      const mockAdapter = {
        initialize: vi.fn().mockRejectedValue(new Error('Adapter init failed')),
        type: 'memory',
      }

      // Replace the adapter promise with a failing one
      interface StorageWithAdapter {
        adapterPromise: Promise<unknown>
      }
      ;(failStorage as unknown as StorageWithAdapter).adapterPromise =
        Promise.resolve(mockAdapter)

      await expect(failStorage.initialize()).rejects.toThrow(
        'Failed to initialize storage'
      )
    })
  })

  describe('basic operations', () => {
    beforeEach(async () => {
      await storage.initialize()
    })

    it('should store and retrieve data', async () => {
      const testData = { id: 1, name: 'Test User' }

      await storage.set('user:1', testData)
      const retrieved = await storage.get('user:1')

      expect(retrieved).toEqual(testData)
    })

    it('should return null for non-existent keys', async () => {
      const result = await storage.get('non-existent')
      expect(result).toBeNull()
    })

    it('should delete data', async () => {
      await storage.set('test', 'value')
      expect(await storage.has('test')).toBe(true)

      await storage.delete('test')
      expect(await storage.has('test')).toBe(false)
    })

    it('should clear all data', async () => {
      await storage.set('key1', 'value1')
      await storage.set('key2', 'value2')

      await storage.clear()

      expect(await storage.has('key1')).toBe(false)
      expect(await storage.has('key2')).toBe(false)
    })

    it('should count items with prefix', async () => {
      // Clear any existing data first
      await storage.clear()

      await storage.set('user:1', { name: 'Alice' })
      await storage.set('user:2', { name: 'Bob' })
      await storage.set('config:theme', 'dark')

      const userCount = await storage.count('user')
      expect(userCount).toBe(2)

      const totalCount = await storage.count()
      expect(totalCount).toBe(3)
    })

    it('should get storage size', async () => {
      await storage.set('key1', 'value1')
      await storage.set('key2', 'value2')

      const size = await storage.getSize()
      expect(size).toBeGreaterThan(0)
    })

    it('should list keys with and without prefix', async () => {
      await storage.clear()
      await storage.set('user:1', { name: 'Alice' })
      await storage.set('user:2', { name: 'Bob' })
      await storage.set('config:theme', 'dark')

      // List with prefix
      const userKeys = await storage.list('user')
      expect(userKeys).toContain('user:1')
      expect(userKeys).toContain('user:2')
      expect(userKeys).not.toContain('config:theme')

      // List all keys
      const allKeys = await storage.list()
      expect(allKeys).toContain('user:1')
      expect(allKeys).toContain('user:2')
      expect(allKeys).toContain('config:theme')
    })
  })

  describe('batch operations', () => {
    beforeEach(async () => {
      await storage.initialize()
    })

    it('should handle batch get operations', async () => {
      const testData = new Map([
        ['user:1', { id: 1, name: 'Alice' }],
        ['user:2', { id: 2, name: 'Bob' }],
        ['user:3', { id: 3, name: 'Charlie' }],
      ])

      await storage.setMany(testData)
      const results = await storage.getMany(['user:1', 'user:3', 'user:999'])

      expect(results.get('user:1')).toEqual({ id: 1, name: 'Alice' })
      expect(results.get('user:3')).toEqual({ id: 3, name: 'Charlie' })
      expect(results.has('user:999')).toBe(false)
    })

    it('should handle batch set operations', async () => {
      const batchData = new Map([
        ['item:1', { value: 'one' }],
        ['item:2', { value: 'two' }],
        ['item:3', { value: 'three' }],
      ])

      await storage.setMany(batchData)

      for (const [key, expectedValue] of batchData) {
        const retrievedValue = await storage.get(key)
        expect(retrievedValue).toEqual(expectedValue)
      }
    })
  })

  describe('namespacing', () => {
    beforeEach(async () => {
      await storage.initialize()
    })

    it('should create namespaced storage instances', () => {
      const userNamespace = storage.namespace('users')
      const configNamespace = storage.namespace('config')

      expect(userNamespace.namespace).toBe('users')
      expect(configNamespace.namespace).toBe('config')
    })

    it('should reuse existing namespace instances', () => {
      const ns1 = storage.namespace('users')
      const ns2 = storage.namespace('users')

      expect(ns1).toBe(ns2) // Should be the same instance
    })

    it('should isolate data between namespaces', async () => {
      const userNamespace = storage.namespace('users')
      const configNamespace = storage.namespace('config')

      await userNamespace.set('theme', 'dark')
      await configNamespace.set('theme', 'light')

      expect(await userNamespace.get('theme')).toBe('dark')
      expect(await configNamespace.get('theme')).toBe('light')
    })

    it('should list keys within namespace', async () => {
      const userNamespace = storage.namespace('users')

      await userNamespace.set('user1', { name: 'Alice' })
      await userNamespace.set('user2', { name: 'Bob' })
      await storage.set('global', 'value') // Outside namespace

      const keys = await userNamespace.list()
      expect(keys).toContain('user1')
      expect(keys).toContain('user2')
      expect(keys).not.toContain('global')
    })

    it('should clear only namespace data', async () => {
      const userNamespace = storage.namespace('users')
      const configNamespace = storage.namespace('config')

      await userNamespace.set('user1', { name: 'Alice' })
      await userNamespace.set('user2', { name: 'Bob' })
      await configNamespace.set('theme', 'dark')

      await userNamespace.clear()

      // User namespace should be empty
      expect(await userNamespace.count()).toBe(0)
      expect(await userNamespace.list()).toHaveLength(0)

      // Config namespace should still have data
      expect(await configNamespace.get('theme')).toBe('dark')
    })

    it('should handle namespace delete operations', async () => {
      const ns = storage.namespace('test')

      await ns.set('key1', 'value1')
      expect(await ns.get('key1')).toBe('value1')

      await ns.delete('key1')
      expect(await ns.get('key1')).toBeNull()
    })

    it('should properly handle originalKey method for non-namespaced keys', async () => {
      const ns = storage.namespace('test')
      await ns.set('mykey', 'value')

      // List should return keys without namespace prefix
      const keys = await ns.list()
      expect(keys).toContain('mykey')
      expect(keys).not.toContain('test:mykey')
    })
  })

  describe('query builder', () => {
    beforeEach(async () => {
      await storage.initialize()
    })

    it('should create query builder instance', () => {
      const queryBuilder = storage.query()
      expect(queryBuilder).toBeDefined()
      expect(typeof queryBuilder.collection).toBe('function')
      expect(typeof queryBuilder.where).toBe('function')
      expect(typeof queryBuilder.execute).toBe('function')
    })

    it('should build and execute simple queries', async () => {
      // Setup test data
      await storage.set('users:1', { id: 1, name: 'Alice', age: 25 })
      await storage.set('users:2', { id: 2, name: 'Bob', age: 30 })
      await storage.set('users:3', { id: 3, name: 'Charlie', age: 20 })

      const result = await storage
        .query()
        .collection('users')
        .where('age', '>', 22)
        .execute()

      expect(result.data).toHaveLength(2)
      expect(result.total).toBe(2)
    })
  })

  describe('configuration', () => {
    it('should provide read-only configuration access', () => {
      const config = storage.configuration
      expect(config).toEqual(
        expect.objectContaining({
          type: 'memory',
        })
      )

      // Should be read-only (shallow)
      expect(config).not.toBe(storage.configuration)
    })
  })

  describe('error handling', () => {
    it('should throw error for unsupported adapter types', async () => {
      const invalidConfig = {
        type: 'unsupported' as 'sqlite', // Type assertion to bypass TypeScript checking for test
        encryption: { enabled: false },
        compression: { enabled: false },
      }

      // Test that initialization properly throws for unsupported adapter types
      const invalidStorage = new StorageManager(invalidConfig)

      // The error is thrown during initialization when adapter creation fails
      await expect(invalidStorage.initialize()).rejects.toThrow(
        'Unsupported storage type'
      )
    })

    it('should throw error for dexie adapter (not implemented)', async () => {
      const dexieConfig = {
        type: 'dexie' as const,
        encryption: { enabled: false },
        compression: { enabled: false },
      }

      const dexieStorage = new StorageManager(dexieConfig)
      await expect(dexieStorage.initialize()).rejects.toThrow(
        'Dexie adapter not implemented yet'
      )
    })

    it('should throw error for custom adapter without instance', async () => {
      const customConfig = {
        type: 'custom' as const,
        encryption: { enabled: false },
        compression: { enabled: false },
      }

      const customStorage = new StorageManager(customConfig)
      await expect(customStorage.initialize()).rejects.toThrow(
        'Custom adapter type requires providing adapter instance'
      )
    })

    it('should throw error when accessing vault without encryption', async () => {
      await storage.initialize()
      expect(() => storage.vaultStorage).toThrow('Vault not available')
    })

    it('should throw errors when operations are called before initialization', async () => {
      const uninitStorage = new StorageManager(config)

      expect(() => uninitStorage.get('key')).toThrow('Storage not initialized')
      expect(() => uninitStorage.set('key', 'value')).toThrow(
        'Storage not initialized'
      )
      expect(() => uninitStorage.delete('key')).toThrow(
        'Storage not initialized'
      )
      expect(() => uninitStorage.clear()).toThrow('Storage not initialized')
      expect(() => uninitStorage.getMany(['key'])).toThrow(
        'Storage not initialized'
      )
      expect(() => uninitStorage.setMany(new Map())).toThrow(
        'Storage not initialized'
      )
      expect(() => uninitStorage.list()).toThrow('Storage not initialized')
      expect(() => uninitStorage.count()).toThrow('Storage not initialized')
      expect(() => uninitStorage.has('key')).toThrow('Storage not initialized')
      expect(() => uninitStorage.getSize()).toThrow('Storage not initialized')
      expect(() => uninitStorage.namespace('test')).toThrow(
        'Storage not initialized'
      )
      expect(() => uninitStorage.underlyingAdapter).toThrow(
        'Storage not initialized'
      )
      expect(() => uninitStorage.query()).toThrow('Storage not initialized')
    })

    it('should throw when migration operations are called before initialization', () => {
      const uninitStorage = new StorageManager(config)

      expect(() => uninitStorage.getMigrationHistory()).toThrow(
        'Cannot get migration history before storage is initialized'
      )

      expect(() => uninitStorage.getPendingMigrations()).toThrow(
        'Cannot get pending migrations before storage is initialized'
      )

      expect(() => uninitStorage.rollback('1.0.0')).toThrow(
        'Cannot rollback before storage is initialized'
      )
    })

    it('should handle failed migrations during initialization', async () => {
      const failingMigration = {
        version: '1.0.0',
        description: 'Failing migration',
        up: vi.fn().mockRejectedValue(new Error('Migration failed')),
      }

      storage.addMigration(failingMigration)

      await expect(storage.initialize()).rejects.toThrow(
        'Failed to initialize storage'
      )
    })
  })

  describe('migration management', () => {
    beforeEach(async () => {
      await storage.initialize()
    })

    it('should add and track migrations', () => {
      const migration = {
        version: '1.1.0',
        description: 'Test migration',
        up: vi.fn().mockResolvedValue(undefined),
      }

      expect(() => storage.addMigration(migration)).not.toThrow()
    })

    it('should add migrations before initialization', async () => {
      const uninitStorage = new StorageManager(config)
      const migration = {
        version: '1.2.0',
        description: 'Pre-init migration',
        up: vi.fn().mockResolvedValue(undefined),
      }

      // Add migration before initialization
      expect(() => uninitStorage.addMigration(migration)).not.toThrow()

      // Initialize and verify migration was applied
      await uninitStorage.initialize()
      expect(migration.up).toHaveBeenCalled()
    })

    it('should get migration history', async () => {
      const history = await storage.getMigrationHistory()
      expect(Array.isArray(history)).toBe(true)
    })

    it('should get pending migrations', async () => {
      const pending = await storage.getPendingMigrations()
      expect(Array.isArray(pending)).toBe(true)
    })

    it('should handle rollback', async () => {
      const migration = {
        version: '2.0.0',
        description: 'Test migration with rollback',
        up: vi.fn().mockResolvedValue(undefined),
        down: vi.fn().mockResolvedValue(undefined),
      }

      storage.addMigration(migration)
      const results = await storage.rollback('1.0.0')

      expect(Array.isArray(results)).toBe(true)
    })
  })

  describe('adapter lifecycle', () => {
    it('should close adapter and cleanup resources', async () => {
      await storage.initialize()
      await expect(storage.close()).resolves.not.toThrow()
    })

    it('should handle close when adapter is not initialized', async () => {
      const uninitStorage = new StorageManager(config)
      await expect(uninitStorage.close()).resolves.not.toThrow()
    })

    it('should handle close when adapter exists', async () => {
      await storage.initialize()

      // Create namespace to test cleanup
      const ns1 = storage.namespace('test')
      expect(ns1).toBeDefined()

      // Close should clean up namespaces
      await storage.close()

      // After close, a new namespace should be created
      // (since adapter still exists but namespaces were cleared)
      await storage.initialize() // Re-initialize for the test
      const ns2 = storage.namespace('test')

      // Should be a different instance since namespaces were cleared
      expect(ns2).toBeDefined()
      expect(ns1).not.toBe(ns2)
    })
  })
})
