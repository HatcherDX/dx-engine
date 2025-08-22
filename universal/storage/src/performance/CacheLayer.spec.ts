/**
 * @fileoverview Tests for CacheLayer functionality
 *
 * @description
 * Comprehensive tests for in-memory caching layer including LRU eviction,
 * TTL expiration, cache statistics, and performance optimizations.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CacheLayer } from './CacheLayer'
import type { CacheConfig } from '../types/storage'

// Import test utilities
import '../test-setup'

// Mock setTimeout and Date.now for TTL testing
vi.useFakeTimers()

describe('CacheLayer', () => {
  let cache: CacheLayer
  let config: Required<CacheConfig>

  beforeEach(() => {
    config = {
      maxSize: 100,
      ttl: 60000, // 1 minute
      strategy: 'lru',
    }
    cache = new CacheLayer(config)
  })

  afterEach(() => {
    vi.clearAllTimers()
  })

  describe('initialization and configuration', () => {
    it('should initialize with default configuration', () => {
      const defaultCache = new CacheLayer({})
      expect(defaultCache).toBeDefined()
    })

    it('should initialize with custom configuration', () => {
      const customConfig: CacheConfig = {
        maxSize: 50,
        ttl: 30000,
        strategy: 'lfu',
      }

      const customCache = new CacheLayer(customConfig)
      expect(customCache).toBeDefined()
    })

    it('should handle invalid configuration gracefully', () => {
      const invalidConfig: CacheConfig = {
        maxSize: -1,
        ttl: -1000,
      }

      expect(() => new CacheLayer(invalidConfig)).not.toThrow()
    })
  })

  describe('basic cache operations', () => {
    it('should set and get values', async () => {
      const key = 'test-key'
      const value = { data: 'test-value', id: 123 }

      await cache.set(key, value)
      const retrieved = await cache.get(key)

      expect(retrieved).toEqual(value)
    })

    it('should return undefined for non-existent keys', async () => {
      const result = await cache.get('nonexistent-key')
      expect(result).toBeUndefined()
    })

    it('should check if key exists', () => {
      cache.set('exists-key', 'value')

      expect(cache.has('exists-key')).toBe(true)
      expect(cache.has('nonexistent-key')).toBe(false)
    })

    it('should delete values', () => {
      cache.set('delete-me', 'value')
      expect(cache.has('delete-me')).toBe(true)

      cache.delete('delete-me')
      expect(cache.has('delete-me')).toBe(false)
    })

    it('should clear all values', () => {
      cache.set('key1', 'value1')
      cache.set('key2', 'value2')
      cache.set('key3', 'value3')

      expect(cache.size()).toBe(3)

      cache.clear()
      expect(cache.size()).toBe(0)
    })
  })

  describe('data types and serialization', () => {
    it('should handle various data types', () => {
      const testCases = [
        ['string', 'Hello World'],
        ['number', 42],
        ['boolean-true', true],
        ['boolean-false', false],
        ['null', null],
        ['undefined', undefined],
        ['object', { key: 'value', nested: { deep: true } }],
        ['array', [1, 2, 3, 'four', { five: 5 }]],
        ['date', new Date('2023-01-01')],
      ]

      testCases.forEach(([key, value]) => {
        cache.set(key, value)
        const retrieved = cache.get(key)
        expect(retrieved).toEqual(value)
      })
    })

    it('should handle large objects', () => {
      const largeObject = {
        id: 1,
        data: Array.from({ length: 1000 }, (_, i) => ({
          index: i,
          value: `item-${i}`,
          metadata: { created: new Date(), active: i % 2 === 0 },
        })),
      }

      cache.set('large-object', largeObject)
      const retrieved = cache.get('large-object')

      expect(retrieved).toEqual(largeObject)
    })
  })

  describe('LRU (Least Recently Used) eviction', () => {
    beforeEach(() => {
      config.maxSize = 3
      config.strategy = 'lru'
      cache = new CacheLayer(config)
    })

    it('should evict least recently used items when cache is full', () => {
      cache.set('key1', 'value1')
      cache.set('key2', 'value2')
      cache.set('key3', 'value3')

      expect(cache.size()).toBe(3)

      // Add fourth item, should evict key1 (least recently used)
      cache.set('key4', 'value4')

      expect(cache.size()).toBe(3)
      expect(cache.has('key1')).toBe(false)
      expect(cache.has('key2')).toBe(true)
      expect(cache.has('key3')).toBe(true)
      expect(cache.has('key4')).toBe(true)
    })

    it('should update access order on get operations', () => {
      cache.set('key1', 'value1')
      cache.set('key2', 'value2')
      cache.set('key3', 'value3')

      // Access key1 to make it most recently used
      cache.get('key1')

      // Add fourth item, should evict key2 (now least recently used)
      cache.set('key4', 'value4')

      expect(cache.has('key1')).toBe(true) // Should not be evicted
      expect(cache.has('key2')).toBe(false) // Should be evicted
      expect(cache.has('key3')).toBe(true)
      expect(cache.has('key4')).toBe(true)
    })

    it('should update access order on set operations for existing keys', () => {
      cache.set('key1', 'value1')
      cache.set('key2', 'value2')
      cache.set('key3', 'value3')

      // Update key1 to make it most recently used
      cache.set('key1', 'updated-value1')

      // Add fourth item, should evict key2 (least recently used)
      cache.set('key4', 'value4')

      expect(cache.has('key1')).toBe(true)
      expect(cache.get('key1')).toBe('updated-value1')
      expect(cache.has('key2')).toBe(false)
      expect(cache.has('key3')).toBe(true)
      expect(cache.has('key4')).toBe(true)
    })
  })

  describe('LFU (Least Frequently Used) eviction', () => {
    beforeEach(() => {
      config.maxSize = 3
      config.strategy = 'lfu'
      cache = new CacheLayer(config)
    })

    it('should evict least frequently used items when cache is full', () => {
      cache.set('key1', 'value1')
      cache.set('key2', 'value2')
      cache.set('key3', 'value3')

      // Access key2 and key3 multiple times
      cache.get('key2')
      cache.get('key2')
      cache.get('key3')

      // Add fourth item, should evict key1 (least frequently used)
      cache.set('key4', 'value4')

      expect(cache.has('key1')).toBe(false)
      expect(cache.has('key2')).toBe(true)
      expect(cache.has('key3')).toBe(true)
      expect(cache.has('key4')).toBe(true)
    })

    it('should update frequency count on each access', () => {
      cache.set('key1', 'value1')
      cache.set('key2', 'value2')
      cache.set('key3', 'value3')

      // Access key1 many times to make it most frequently used
      for (let i = 0; i < 10; i++) {
        cache.get('key1')
      }

      // Add fourth item, should evict key2 or key3 (less frequently used)
      cache.set('key4', 'value4')

      expect(cache.has('key1')).toBe(true) // Should not be evicted
    })
  })

  describe('TTL (Time To Live) expiration', () => {
    beforeEach(() => {
      config.ttl = 1000 // 1 second
      cache = new CacheLayer(config)
    })

    it('should expire items after TTL', () => {
      cache.set('ttl-test', 'value')
      expect(cache.get('ttl-test')).toBe('value')

      // Advance time beyond TTL
      vi.advanceTimersByTime(1500)

      expect(cache.get('ttl-test')).toBeUndefined()
      expect(cache.has('ttl-test')).toBe(false)
    })

    it('should not expire items before TTL', () => {
      cache.set('ttl-test', 'value')

      // Advance time but not beyond TTL
      vi.advanceTimersByTime(500)

      expect(cache.get('ttl-test')).toBe('value')
      expect(cache.has('ttl-test')).toBe(true)
    })

    it('should handle mixed TTL scenarios', () => {
      cache.set('key1', 'value1')

      vi.advanceTimersByTime(600) // 0.6 seconds

      cache.set('key2', 'value2')

      vi.advanceTimersByTime(600) // Total 1.2 seconds

      // key1 should be expired, key2 should still exist
      expect(cache.get('key1')).toBeUndefined()
      expect(cache.get('key2')).toBe('value2')
    })

    it('should clean up expired items automatically', () => {
      cache.set('expire1', 'value1')
      cache.set('expire2', 'value2')

      expect(cache.size()).toBe(2)

      vi.advanceTimersByTime(1500)

      // Access cache to trigger cleanup
      cache.get('expire1')

      expect(cache.size()).toBe(0)
    })

    it('should handle custom TTL per item', () => {
      // Set with custom TTL
      cache.setWithTTL('custom-ttl', 'value', 2000) // 2 seconds
      cache.set('default-ttl', 'value') // Uses default TTL (1 second)

      vi.advanceTimersByTime(1500)

      expect(cache.get('custom-ttl')).toBe('value') // Should still exist
      expect(cache.get('default-ttl')).toBeUndefined() // Should be expired

      vi.advanceTimersByTime(1000) // Total 2.5 seconds

      expect(cache.get('custom-ttl')).toBeUndefined() // Now should be expired
    })
  })

  describe('cache statistics', () => {
    it('should track cache hits and misses', () => {
      cache.set('key1', 'value1')

      // Hit
      cache.get('key1')

      // Miss
      cache.get('nonexistent')

      const stats = cache.getStats()
      expect(stats.hits).toBe(1)
      expect(stats.misses).toBe(1)
      expect(stats.hitRatio).toBeCloseTo(0.5)
    })

    it('should track cache size and capacity', () => {
      cache.set('key1', 'value1')
      cache.set('key2', 'value2')

      const stats = cache.getStats()
      expect(stats.size).toBe(2)
      expect(stats.maxSize).toBe(config.maxSize)
    })

    it('should track evictions', () => {
      config.maxSize = 2
      cache = new CacheLayer(config)

      cache.set('key1', 'value1')
      cache.set('key2', 'value2')
      cache.set('key3', 'value3') // Should cause eviction

      const stats = cache.getStats()
      expect(stats.evictions).toBe(1)
    })

    it('should reset statistics', () => {
      cache.set('key1', 'value1')
      cache.get('key1')
      cache.get('nonexistent')

      let stats = cache.getStats()
      expect(stats.hits).toBeGreaterThan(0)
      expect(stats.misses).toBeGreaterThan(0)

      cache.resetStats()

      stats = cache.getStats()
      expect(stats.hits).toBe(0)
      expect(stats.misses).toBe(0)
      expect(stats.evictions).toBe(0)
    })
  })

  describe('memory management and performance', () => {
    it('should efficiently handle large number of items', () => {
      const largeConfig = { ...config, maxSize: 10000 }
      const largeCache = new CacheLayer(largeConfig)

      // Add many items
      for (let i = 0; i < 5000; i++) {
        largeCache.set(`key-${i}`, { value: i, data: `data-${i}` })
      }

      expect(largeCache.size()).toBe(5000)

      // Access random items to test performance
      const startTime = performance.now()
      for (let i = 0; i < 100; i++) {
        const randomKey = `key-${Math.floor(Math.random() * 5000)}`
        largeCache.get(randomKey)
      }
      const endTime = performance.now()

      // Should complete quickly (within 100ms for 100 operations)
      expect(endTime - startTime).toBeLessThan(100)
    })

    it('should handle concurrent operations safely', async () => {
      const operations = []

      // Create multiple concurrent set operations
      for (let i = 0; i < 100; i++) {
        operations.push(
          Promise.resolve(cache.set(`concurrent-${i}`, { value: i }))
        )
      }

      await Promise.all(operations)

      // Verify all data was cached correctly
      for (let i = 0; i < 100; i++) {
        const result = cache.get(`concurrent-${i}`)
        expect(result).toEqual({ value: i })
      }
    })

    it('should maintain performance under eviction pressure', () => {
      config.maxSize = 100
      cache = new CacheLayer(config)

      // Add items beyond capacity to trigger evictions
      const startTime = performance.now()
      for (let i = 0; i < 500; i++) {
        cache.set(`pressure-${i}`, { value: i, data: 'x'.repeat(100) })
      }
      const endTime = performance.now()

      expect(cache.size()).toBe(100) // Should maintain max size
      expect(endTime - startTime).toBeLessThan(1000) // Should complete within 1 second

      const stats = cache.getStats()
      expect(stats.evictions).toBe(400) // Should have evicted excess items
    })
  })

  describe('edge cases and error handling', () => {
    it('should handle null and undefined keys', () => {
      expect(() => cache.set(null as unknown as string, 'value')).not.toThrow()
      expect(() =>
        cache.set(undefined as unknown as string, 'value')
      ).not.toThrow()

      expect(cache.get(null as unknown as string)).toBeUndefined()
      expect(cache.get(undefined as unknown as string)).toBeUndefined()
    })

    it('should handle very long keys', () => {
      const longKey = 'x'.repeat(10000)
      const value = 'long-key-value'

      cache.set(longKey, value)
      expect(cache.get(longKey)).toBe(value)
    })

    it('should handle circular references in objects', () => {
      const obj: Record<string, unknown> = { name: 'test' }
      obj.self = obj // Circular reference

      // Should not throw during caching
      expect(() => cache.set('circular', obj)).not.toThrow()

      const retrieved = cache.get('circular')
      expect(retrieved).toBeDefined()
      expect(retrieved.name).toBe('test')
    })

    it('should handle zero and negative TTL', () => {
      cache.setWithTTL('zero-ttl', 'value', 0)
      cache.setWithTTL('negative-ttl', 'value', -1000)

      // Items with zero or negative TTL should be immediately expired
      expect(cache.get('zero-ttl')).toBeUndefined()
      expect(cache.get('negative-ttl')).toBeUndefined()
    })

    it('should handle cache overflow gracefully', () => {
      config.maxSize = 1
      cache = new CacheLayer(config)

      // Add multiple items rapidly
      for (let i = 0; i < 10; i++) {
        cache.set(`overflow-${i}`, `value-${i}`)
      }

      // Should maintain size limit
      expect(cache.size()).toBe(1)

      // Should have the last item (depending on eviction strategy)
      expect(cache.has('overflow-9')).toBe(true)
    })
  })

  describe('custom TTL and expiration policies', () => {
    it('should support different TTL values for different items', () => {
      cache.setWithTTL('short', 'value1', 500) // 0.5 seconds
      cache.setWithTTL('medium', 'value2', 1000) // 1 second
      cache.setWithTTL('long', 'value3', 2000) // 2 seconds

      vi.advanceTimersByTime(600)

      expect(cache.get('short')).toBeUndefined()
      expect(cache.get('medium')).toBe('value2')
      expect(cache.get('long')).toBe('value3')

      vi.advanceTimersByTime(600) // Total 1.2 seconds

      expect(cache.get('medium')).toBeUndefined()
      expect(cache.get('long')).toBe('value3')

      vi.advanceTimersByTime(1000) // Total 2.2 seconds

      expect(cache.get('long')).toBeUndefined()
    })

    it('should handle TTL updates on existing items', () => {
      cache.setWithTTL('update-ttl', 'original', 1000)

      vi.advanceTimersByTime(500)

      // Update with new TTL
      cache.setWithTTL('update-ttl', 'updated', 1000)

      vi.advanceTimersByTime(700) // Total 1.2 seconds from start, 0.7 from update

      // Should still exist because TTL was reset
      expect(cache.get('update-ttl')).toBe('updated')

      vi.advanceTimersByTime(500) // 0.5 more seconds

      // Now should be expired
      expect(cache.get('update-ttl')).toBeUndefined()
    })
  })

  describe('cache warming and preloading', () => {
    it('should support batch operations for cache warming', () => {
      const batchData = new Map([
        ['warm1', { data: 'value1' }],
        ['warm2', { data: 'value2' }],
        ['warm3', { data: 'value3' }],
      ])

      cache.setBatch(batchData)

      for (const [key, value] of batchData) {
        expect(cache.get(key)).toEqual(value)
      }

      expect(cache.size()).toBe(3)
    })

    it('should support batch retrieval', () => {
      cache.set('batch1', 'value1')
      cache.set('batch2', 'value2')
      cache.set('batch3', 'value3')

      const keys = ['batch1', 'batch2', 'batch3', 'nonexistent']
      const results = cache.getBatch(keys)

      expect(results.get('batch1')).toBe('value1')
      expect(results.get('batch2')).toBe('value2')
      expect(results.get('batch3')).toBe('value3')
      expect(results.get('nonexistent')).toBeUndefined()
      expect(results.size).toBe(4)
    })
  })
})
