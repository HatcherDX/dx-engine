/**
 * @fileoverview Tests for MemoryAdapter storage functionality
 *
 * @description
 * Tests for in-memory storage adapter including basic operations,
 * batch operations, and memory management features.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { MemoryAdapter } from './MemoryAdapter'
import type { StorageConfig } from '../types/storage'

// Import test utilities
import '../test-setup'

// Declare global test utilities
declare global {
  const createTestConfig: (overrides?: Partial<StorageConfig>) => StorageConfig
}

describe('MemoryAdapter', () => {
  let adapter: MemoryAdapter
  let config: StorageConfig

  beforeEach(async () => {
    config = createTestConfig({ type: 'memory' })
    adapter = new MemoryAdapter(config)
    await adapter.initialize()
  })

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      const newAdapter = new MemoryAdapter(config)
      await expect(newAdapter.initialize()).resolves.not.toThrow()
      expect(newAdapter.type).toBe('memory')
    })
  })

  describe('basic operations', () => {
    it('should store and retrieve data', async () => {
      const testData = { id: 1, name: 'Test' }

      await adapter.set('test-key', testData)
      const retrieved = await adapter.get('test-key')

      expect(retrieved).toEqual(testData)
    })

    it('should return null for non-existent keys', async () => {
      const result = await adapter.get('non-existent')
      expect(result).toBeNull()
    })

    it('should check key existence', async () => {
      await adapter.set('exists', 'value')

      expect(await adapter.has('exists')).toBe(true)
      expect(await adapter.has('does-not-exist')).toBe(false)
    })

    it('should delete data', async () => {
      await adapter.set('to-delete', 'value')
      expect(await adapter.has('to-delete')).toBe(true)

      await adapter.delete('to-delete')
      expect(await adapter.has('to-delete')).toBe(false)
    })

    it('should clear all data', async () => {
      await adapter.set('key1', 'value1')
      await adapter.set('key2', 'value2')

      await adapter.clear()

      expect(await adapter.has('key1')).toBe(false)
      expect(await adapter.has('key2')).toBe(false)
    })
  })

  describe('list and count operations', () => {
    beforeEach(async () => {
      await adapter.set('user:1', { name: 'Alice' })
      await adapter.set('user:2', { name: 'Bob' })
      await adapter.set('config:theme', 'dark')
      await adapter.set('config:lang', 'en')
    })

    it('should list all keys', async () => {
      const keys = await adapter.list()

      expect(keys).toContain('user:1')
      expect(keys).toContain('user:2')
      expect(keys).toContain('config:theme')
      expect(keys).toContain('config:lang')
      expect(keys).toHaveLength(4)
    })

    it('should list keys with prefix filter', async () => {
      const userKeys = await adapter.list('user:')
      const configKeys = await adapter.list('config:')

      expect(userKeys).toEqual(['user:1', 'user:2'])
      expect(configKeys).toEqual(['config:theme', 'config:lang'])
    })

    it('should count all items', async () => {
      const total = await adapter.count()
      expect(total).toBe(4)
    })

    it('should count items with prefix filter', async () => {
      const userCount = await adapter.count('user:')
      const configCount = await adapter.count('config:')

      expect(userCount).toBe(2)
      expect(configCount).toBe(2)
    })
  })

  describe('batch operations', () => {
    it('should handle batch get operations', async () => {
      // Setup test data
      await adapter.set('item:1', { value: 'one' })
      await adapter.set('item:2', { value: 'two' })
      await adapter.set('item:3', { value: 'three' })

      const results = await adapter.getMany(['item:1', 'item:3', 'item:999'])

      expect(results.get('item:1')).toEqual({ value: 'one' })
      expect(results.get('item:3')).toEqual({ value: 'three' })
      expect(results.has('item:999')).toBe(false)
    })

    it('should handle batch set operations', async () => {
      const batchData = new Map([
        ['batch:1', { data: 'first' }],
        ['batch:2', { data: 'second' }],
        ['batch:3', { data: 'third' }],
      ])

      await adapter.setMany(batchData)

      // Verify all items were stored
      for (const [key, expectedValue] of batchData) {
        const retrieved = await adapter.get(key)
        expect(retrieved).toEqual(expectedValue)
      }
    })
  })

  describe('size calculation', () => {
    it('should calculate estimated storage size', async () => {
      const initialSize = await adapter.getSize()
      expect(initialSize).toBe(0)

      await adapter.set('test', { data: 'test data' })
      const newSize = await adapter.getSize()
      expect(newSize).toBeGreaterThan(0)
    })

    it('should include metadata in size calculation', async () => {
      await adapter.set('key1', 'small')
      const size1 = await adapter.getSize()

      await adapter.set('key2', { large: 'data'.repeat(1000) })
      const size2 = await adapter.getSize()

      expect(size2).toBeGreaterThan(size1)
    })
  })

  describe('statistics and monitoring', () => {
    it('should provide storage statistics', async () => {
      await adapter.set('test1', 'small data')
      await adapter.set('test2', 'large data'.repeat(100))

      const stats = adapter.getStats()

      expect(stats.itemCount).toBe(2)
      expect(stats.largestItem).toBeTruthy()
      expect(stats.estimatedSize).toBe(0) // Calculated by getSize()
    })

    it('should track oldest item', async () => {
      await adapter.set('first', 'data')

      // Small delay to ensure different timestamps
      await new Promise((resolve) => setTimeout(resolve, 10))

      await adapter.set('second', 'data')

      const stats = adapter.getStats()
      expect(stats.oldestItem).toBe('first')
    })
  })

  describe('key validation', () => {
    it('should reject invalid keys', async () => {
      await expect(adapter.set('', 'value')).rejects.toThrow('non-empty string')
      await expect(adapter.set('x'.repeat(300), 'value')).rejects.toThrow(
        'cannot exceed 250'
      )
    })

    it('should accept valid keys', async () => {
      const validKeys = [
        'simple',
        'with:colons',
        'with-dashes',
        'with_underscores',
        'with.dots',
        'namespace:entity:id',
        'x'.repeat(250), // Max length
      ]

      for (const key of validKeys) {
        await expect(adapter.set(key, 'value')).resolves.not.toThrow()
      }
    })
  })

  describe('memory management', () => {
    it('should handle large number of items', async () => {
      const itemCount = 1000

      // Store many items
      for (let i = 0; i < itemCount; i++) {
        await adapter.set(`item:${i}`, { index: i, data: `data-${i}` })
      }

      expect(await adapter.count()).toBe(itemCount)
      expect(await adapter.getSize()).toBeGreaterThan(0)
    })

    it('should clean up on close', async () => {
      await adapter.set('test', 'data')
      expect(await adapter.has('test')).toBe(true)

      await adapter.close()

      // Memory should be cleared
      expect(adapter.getStats().itemCount).toBe(0)
    })
  })

  describe('data types', () => {
    it('should handle various data types', async () => {
      const testCases = [
        ['string', 'simple string'],
        ['number', 42],
        ['boolean', true],
        ['array', [1, 2, 3, 'mixed']],
        ['object', { nested: { data: 'value' } }],
        ['null', null],
        ['date', new Date().toISOString()],
      ]

      for (const [type, value] of testCases) {
        await adapter.set(`test:${type}`, value)
        const retrieved = await adapter.get(`test:${type}`)
        expect(retrieved).toEqual(value)
      }
    })
  })

  describe('concurrent access', () => {
    it('should handle concurrent operations', async () => {
      const operations = []

      // Concurrent writes
      for (let i = 0; i < 10; i++) {
        operations.push(adapter.set(`concurrent:${i}`, { value: i }))
      }

      await Promise.all(operations)

      // Verify all writes succeeded
      const count = await adapter.count('concurrent:')
      expect(count).toBe(10)
    })

    it('should handle concurrent reads', async () => {
      await adapter.set('shared', { data: 'shared value' })

      // Concurrent reads
      const reads = Array(10)
        .fill(0)
        .map(() => adapter.get('shared'))
      const results = await Promise.all(reads)

      // All reads should succeed with same value
      results.forEach((result) => {
        expect(result).toEqual({ data: 'shared value' })
      })
    })
  })
})
