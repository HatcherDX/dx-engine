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
    config = createTestConfig()
    storage = new StorageManager(config)
  })

  describe('initialization', () => {
    it('should initialize with memory adapter', async () => {
      await expect(storage.initialize()).resolves.not.toThrow()
      expect(storage.underlyingAdapter.type).toBe('memory')
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

    it('should throw error when accessing vault without encryption', async () => {
      await storage.initialize()
      expect(() => storage.vaultStorage).toThrow('Vault not available')
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

    it('should get migration history', async () => {
      const history = await storage.getMigrationHistory()
      expect(Array.isArray(history)).toBe(true)
    })

    it('should get pending migrations', async () => {
      const pending = await storage.getPendingMigrations()
      expect(Array.isArray(pending)).toBe(true)
    })
  })

  describe('adapter lifecycle', () => {
    it('should close adapter and cleanup resources', async () => {
      await storage.initialize()
      await expect(storage.close()).resolves.not.toThrow()
    })
  })
})
