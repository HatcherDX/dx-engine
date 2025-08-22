/**
 * @fileoverview Tests for SQLiteAdapter storage functionality
 *
 * @description
 * Comprehensive tests for SQLite-based storage adapter including basic operations,
 * batch operations, query functionality, and database management features.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { SQLiteAdapter } from './SQLiteAdapter'
import type { StorageConfig } from '../types/storage'
import { existsSync, unlinkSync } from 'fs'
import { join } from 'path'

// Import test utilities
import '../test-setup'

// Declare global test utilities
declare global {
  const createTestConfig: (overrides?: Partial<StorageConfig>) => StorageConfig
  const createSecureTestConfig: (
    overrides?: Partial<StorageConfig>
  ) => StorageConfig
}

describe('SQLiteAdapter', () => {
  let adapter: SQLiteAdapter
  let config: StorageConfig
  let testDbPath: string

  beforeEach(async () => {
    testDbPath = join(__dirname, '../test-data/test-sqlite.db')
    config = createTestConfig({
      type: 'sqlite',
      path: testDbPath,
    })
    adapter = new SQLiteAdapter(config)
  })

  afterEach(async () => {
    await adapter.close()
    // Clean up test database
    if (existsSync(testDbPath)) {
      try {
        unlinkSync(testDbPath)
      } catch {
        // Ignore cleanup errors
      }
    }
  })

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      await adapter.initialize()
      expect(adapter.type).toBe('sqlite')
    })

    it('should create database file', async () => {
      await adapter.initialize()
      expect(existsSync(testDbPath)).toBe(true)
    })

    it('should create directory if it does not exist', async () => {
      const deepPath = join(__dirname, '../test-data/deep/nested/test.db')
      const deepConfig = createTestConfig({
        type: 'sqlite',
        path: deepPath,
      })
      const deepAdapter = new SQLiteAdapter(deepConfig)

      await deepAdapter.initialize()
      expect(existsSync(deepPath)).toBe(true)

      await deepAdapter.close()
      unlinkSync(deepPath)
    })

    it('should handle initialization errors gracefully', async () => {
      // Create adapter with invalid path
      const invalidConfig = createTestConfig({
        type: 'sqlite',
        path: '/invalid/path/that/cannot/be/created.db',
      })
      const invalidAdapter = new SQLiteAdapter(invalidConfig)

      await expect(invalidAdapter.initialize()).rejects.toThrow()
    })

    it('should not reinitialize if already initialized', async () => {
      await adapter.initialize()
      const initSpy = vi.spyOn(
        adapter as unknown as { initializeAdapter: () => Promise<void> },
        'initializeAdapter'
      )

      await adapter.initialize()
      expect(initSpy).not.toHaveBeenCalled()
    })
  })

  describe('basic operations', () => {
    beforeEach(async () => {
      await adapter.initialize()
    })

    it('should store and retrieve data', async () => {
      const testData = { name: 'John', age: 30, city: 'New York' }

      await adapter.set('user:1', testData)
      const retrieved = await adapter.get('user:1')

      expect(retrieved).toEqual(testData)
    })

    it('should return null for non-existent keys', async () => {
      const result = await adapter.get('nonexistent-key')
      expect(result).toBeNull()
    })

    it('should check key existence', async () => {
      await adapter.set('test-key', 'test-value')

      expect(await adapter.has('test-key')).toBe(true)
      expect(await adapter.has('nonexistent-key')).toBe(false)
    })

    it('should delete data', async () => {
      await adapter.set('delete-me', 'value')
      expect(await adapter.has('delete-me')).toBe(true)

      await adapter.delete('delete-me')
      expect(await adapter.has('delete-me')).toBe(false)
    })

    it('should clear all data', async () => {
      await adapter.set('key1', 'value1')
      await adapter.set('key2', 'value2')
      await adapter.set('key3', 'value3')

      expect(await adapter.count()).toBe(3)

      await adapter.clear()
      expect(await adapter.count()).toBe(0)
    })
  })

  describe('list and count operations', () => {
    beforeEach(async () => {
      await adapter.initialize()
      await adapter.set('users:1', { name: 'Alice' })
      await adapter.set('users:2', { name: 'Bob' })
      await adapter.set('posts:1', { title: 'Hello' })
    })

    it('should list all keys', async () => {
      const keys = await adapter.list()
      expect(keys).toHaveLength(3)
      expect(keys).toContain('1')
      expect(keys).toContain('2')
      expect(keys).toContain('1')
    })

    it('should list keys with prefix filter', async () => {
      const userKeys = await adapter.list('users')
      expect(userKeys).toHaveLength(2)
    })

    it('should count all items', async () => {
      const count = await adapter.count()
      expect(count).toBe(3)
    })

    it('should count items with prefix filter', async () => {
      const userCount = await adapter.count('users')
      expect(userCount).toBe(2)
    })
  })

  describe('batch operations', () => {
    beforeEach(async () => {
      await adapter.initialize()
    })

    it('should handle batch get operations', async () => {
      const data1 = { name: 'User 1' }
      const data2 = { name: 'User 2' }
      const data3 = { name: 'User 3' }

      await adapter.set('batch:1', data1)
      await adapter.set('batch:2', data2)
      await adapter.set('batch:3', data3)

      const results = await adapter.getMany([
        'batch:1',
        'batch:2',
        'batch:3',
        'nonexistent',
      ])

      expect(results.size).toBe(4)
      expect(results.get('batch:1')).toEqual(data1)
      expect(results.get('batch:2')).toEqual(data2)
      expect(results.get('batch:3')).toEqual(data3)
      expect(results.get('nonexistent')).toBeNull()
    })

    it('should handle batch set operations', async () => {
      const items = new Map([
        ['batch-set:1', { name: 'Item 1' }],
        ['batch-set:2', { name: 'Item 2' }],
        ['batch-set:3', { name: 'Item 3' }],
      ])

      await adapter.setMany(items)

      for (const [key, value] of items) {
        const retrieved = await adapter.get(key)
        expect(retrieved).toEqual(value)
      }
    })

    it('should handle empty batch operations', async () => {
      const emptyResults = await adapter.getMany([])
      expect(emptyResults.size).toBe(0)

      await adapter.setMany(new Map())
      // Should not throw
    })
  })

  describe('data types and serialization', () => {
    beforeEach(async () => {
      await adapter.initialize()
    })

    it('should handle various data types', async () => {
      const testCases = [
        ['string', 'Hello World'],
        ['number', 42],
        ['boolean', true],
        ['null', null],
        ['object', { key: 'value', nested: { deep: true } }],
        ['array', [1, 2, 3, 'four', { five: 5 }]],
        ['date', new Date('2023-01-01').toISOString()],
      ]

      for (const [key, value] of testCases) {
        await adapter.set(key, value)
        const retrieved = await adapter.get(key)
        expect(retrieved).toEqual(value)
      }
    })
  })

  describe('query functionality', () => {
    beforeEach(async () => {
      await adapter.initialize()
      // Add some test data for querying
      await adapter.set('users:1', { name: 'Alice', age: 25, role: 'admin' })
      await adapter.set('users:2', { name: 'Bob', age: 30, role: 'user' })
      await adapter.set('users:3', { name: 'Charlie', age: 35, role: 'admin' })
    })

    it('should create query builder instance', async () => {
      const query = adapter.query('users')
      expect(query).toBeDefined()
      expect(typeof query.where).toBe('function')
      expect(typeof query.execute).toBe('function')
    })

    it('should execute simple queries', async () => {
      const results = await adapter
        .query()
        .where('role', '=', 'admin')
        .execute()

      expect(results.data).toHaveLength(2)
      expect(results.data.every((user) => user.role === 'admin')).toBe(true)
    })

    it('should handle whereIn queries', async () => {
      const query = adapter.query()
      query.whereIn('name', ['Alice', 'Charlie'])
      const results = await query.execute()

      expect(results.data).toHaveLength(2)
    })

    it('should handle whereBetween queries', async () => {
      const query = adapter.query()
      query.whereBetween('age', 25, 32)
      const results = await query.execute()

      expect(results.data).toHaveLength(2)
    })

    it('should handle complex queries with multiple conditions', async () => {
      const query = adapter.query()
      query.where('role', '=', 'admin').where('age', '>', 25)

      const results = await query.execute()
      expect(results.data).toHaveLength(1)
      expect(results.data[0].name).toBe('Charlie')
    })

    it('should support ordering', async () => {
      const query = adapter.query()
      query.orderBy('age', 'desc')

      const results = await query.execute()
      expect(results.data[0].age).toBe(35)
      expect(results.data[2].age).toBe(25)
    })

    it('should support limiting results', async () => {
      const query = adapter.query()
      query.limit(2)

      const results = await query.execute()
      expect(results.data).toHaveLength(2)
    })

    it('should support counting queries', async () => {
      const query = adapter.query()
      query.where('role', '=', 'admin')

      const count = await query.count()
      expect(count).toBe(2)
    })

    it('should support first() query', async () => {
      const query = adapter.query()
      query.where('name', '=', 'Alice')

      const result = await query.first()
      expect(result).toBeDefined()
      expect(result.name).toBe('Alice')
    })

    it('should support exists() query', async () => {
      const query1 = adapter.query()
      query1.where('name', '=', 'Alice')
      expect(await query1.exists()).toBe(true)

      const query2 = adapter.query()
      query2.where('name', '=', 'NonExistent')
      expect(await query2.exists()).toBe(false)
    })
  })

  describe('full-text search', () => {
    beforeEach(async () => {
      await adapter.initialize()
      await adapter.set('posts:1', {
        title: 'Introduction to TypeScript',
        content: 'TypeScript is great',
      })
      await adapter.set('posts:2', {
        title: 'Advanced JavaScript',
        content: 'JavaScript patterns and techniques',
      })
      await adapter.set('posts:3', {
        title: 'React Hooks Guide',
        content: 'Modern React development',
      })
    })

    it('should perform full-text search', async () => {
      const results = await adapter.search('TypeScript')
      expect(results.length).toBeGreaterThan(0)
      expect(
        results.some((result) => result.title.includes('TypeScript'))
      ).toBe(true)
    })

    it('should search within namespace', async () => {
      const results = await adapter.search('JavaScript', 'posts')
      expect(results.length).toBeGreaterThan(0)
    })

    it('should limit search results', async () => {
      const results = await adapter.search('React', undefined, 1)
      expect(results.length).toBeLessThanOrEqual(1)
    })

    it('should handle empty search results', async () => {
      const results = await adapter.search('NonExistentTerm')
      expect(results).toEqual([])
    })
  })

  describe('size calculation', () => {
    beforeEach(async () => {
      await adapter.initialize()
    })

    it('should calculate storage size', async () => {
      const initialSize = await adapter.getSize()

      await adapter.set('size-test', { data: 'test'.repeat(100) })

      const newSize = await adapter.getSize()
      expect(newSize).toBeGreaterThan(initialSize)
    })

    it('should return zero size for empty database', async () => {
      await adapter.clear()
      const size = await adapter.getSize()
      expect(size).toBe(0)
    })
  })

  describe('database statistics and monitoring', () => {
    beforeEach(async () => {
      await adapter.initialize()
      await adapter.set('stat:1', { data: 'small' })
      await adapter.set('stat:2', { data: 'large'.repeat(1000) })
    })

    it('should provide database statistics', async () => {
      const stats = await adapter.getStats()

      expect(stats).toHaveProperty('totalItems')
      expect(stats).toHaveProperty('totalSize')
      expect(stats).toHaveProperty('largestItem')
      expect(stats).toHaveProperty('namespaces')
      expect(stats).toHaveProperty('indexes')

      expect(stats.totalItems).toBeGreaterThan(0)
      expect(stats.totalSize).toBeGreaterThan(0)
      expect(Array.isArray(stats.namespaces)).toBe(true)
      expect(Array.isArray(stats.indexes)).toBe(true)
    })

    it('should track largest item', async () => {
      const stats = await adapter.getStats()
      expect(stats.largestItem).toBeGreaterThan(0)
    })

    it('should track oldest item', async () => {
      const stats = await adapter.getStats()
      expect(stats.oldestItem).toBeGreaterThan(0)
    })
  })

  describe('database maintenance', () => {
    beforeEach(async () => {
      await adapter.initialize()
      await adapter.set('maintenance:1', { data: 'test1' })
      await adapter.set('maintenance:2', { data: 'test2' })
    })

    it('should vacuum database', async () => {
      await expect(adapter.vacuum()).resolves.not.toThrow()
    })

    it('should analyze database', async () => {
      await expect(adapter.analyze()).resolves.not.toThrow()
    })
  })

  describe('key parsing and validation', () => {
    beforeEach(async () => {
      await adapter.initialize()
    })

    it('should handle namespaced keys', async () => {
      await adapter.set('users:123', { name: 'Test User' })
      const result = await adapter.get('users:123')
      expect(result).toEqual({ name: 'Test User' })
    })

    it('should handle keys without namespace', async () => {
      await adapter.set('simple-key', { data: 'simple' })
      const result = await adapter.get('simple-key')
      expect(result).toEqual({ data: 'simple' })
    })

    it('should reject invalid keys', async () => {
      // Test with empty key
      await expect(adapter.set('', 'value')).rejects.toThrow()

      // Test with very long key
      const longKey = 'x'.repeat(300)
      await expect(adapter.set(longKey, 'value')).rejects.toThrow()

      // Test with non-string key
      await expect(
        adapter.set(null as unknown as string, 'value')
      ).rejects.toThrow()
    })
  })

  describe('concurrent access and safety', () => {
    beforeEach(async () => {
      await adapter.initialize()
    })

    it('should handle concurrent operations safely', async () => {
      const operations = []

      // Create multiple concurrent set operations
      for (let i = 0; i < 10; i++) {
        operations.push(adapter.set(`concurrent:${i}`, { value: i }))
      }

      await Promise.all(operations)

      // Verify all data was written correctly
      for (let i = 0; i < 10; i++) {
        const result = await adapter.get(`concurrent:${i}`)
        expect(result).toEqual({ value: i })
      }
    })

    it('should handle concurrent reads', async () => {
      await adapter.set('read-test', { data: 'concurrent-read' })

      const readOperations = []
      for (let i = 0; i < 5; i++) {
        readOperations.push(adapter.get('read-test'))
      }

      const results = await Promise.all(readOperations)
      results.forEach((result) => {
        expect(result).toEqual({ data: 'concurrent-read' })
      })
    })
  })

  describe('error handling', () => {
    it('should handle operations on uninitialized adapter', async () => {
      const uninitializedAdapter = new SQLiteAdapter(config)

      await expect(uninitializedAdapter.get('test')).rejects.toThrow(
        'Storage adapter not initialized'
      )
      await expect(uninitializedAdapter.set('test', 'value')).rejects.toThrow(
        'Storage adapter not initialized'
      )
      await expect(uninitializedAdapter.delete('test')).rejects.toThrow(
        'Storage adapter not initialized'
      )
    })

    it('should handle operations after close', async () => {
      await adapter.initialize()
      await adapter.set('test', 'value')
      await adapter.close()

      expect(await adapter.get('test')).toBeNull()
      expect(await adapter.getSize()).toBe(0)
      expect(await adapter.count()).toBe(0)
    })
  })

  describe('encryption and compression integration', () => {
    it('should work with encryption enabled', async () => {
      const encryptedConfig = createTestConfig({
        type: 'sqlite',
        path: join(__dirname, '../test-data/test-encrypted.db'),
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
      })
      const encryptedAdapter = new SQLiteAdapter(encryptedConfig)

      await encryptedAdapter.initialize()

      const testData = { secret: 'encrypted-data', value: 42 }
      await encryptedAdapter.set('encrypted:test', testData)
      const retrieved = await encryptedAdapter.get('encrypted:test')

      expect(retrieved).toEqual(testData)

      await encryptedAdapter.close()
    })
  })

  describe('cleanup and resource management', () => {
    it('should close adapter and cleanup resources', async () => {
      await adapter.initialize()
      await adapter.set('cleanup-test', 'value')

      await adapter.close()

      // After close, operations should not work
      expect(await adapter.get('cleanup-test')).toBeNull()
    })

    it('should handle multiple close calls gracefully', async () => {
      await adapter.initialize()

      await adapter.close()
      await adapter.close() // Should not throw
    })
  })
})
