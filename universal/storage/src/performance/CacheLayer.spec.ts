/**
 * @fileoverview Comprehensive tests for CacheLayer functionality
 *
 * @description
 * Complete test coverage for the high-performance LRU cache layer including
 * TTL expiration, memory management, statistics tracking, and edge cases.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CacheLayer, type CacheConfig } from './CacheLayer'

describe('CacheLayer', () => {
  let cache: CacheLayer<unknown>

  beforeEach(() => {
    // Use fake timers for TTL testing
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.restoreAllMocks()
  })

  describe('initialization', () => {
    it('should initialize with default configuration', () => {
      cache = new CacheLayer()
      expect(cache).toBeDefined()
      expect(cache.size()).toBe(0)

      const stats = cache.getStats()
      expect(stats.maxSize).toBe(1000)
      expect(stats.maxMemory).toBe(100 * 1024 * 1024)
    })

    it('should initialize with custom configuration', () => {
      const config: CacheConfig = {
        maxSize: 500,
        maxMemory: 50 * 1024 * 1024,
        ttl: 600000,
        enableStats: false,
      }

      cache = new CacheLayer(config)
      const stats = cache.getStats()

      expect(stats.maxSize).toBe(500)
      expect(stats.maxMemory).toBe(50 * 1024 * 1024)
    })

    it('should start cleanup timer on initialization', () => {
      const setIntervalSpy = vi.spyOn(global, 'setInterval')
      cache = new CacheLayer()
      expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 60000)
    })
  })

  describe('basic operations', () => {
    beforeEach(() => {
      cache = new CacheLayer({ maxSize: 10, ttl: 5000 })
    })

    it('should set and get values', () => {
      cache.set('key1', 'value1')
      expect(cache.get('key1')).toBe('value1')
    })

    it('should handle null and undefined keys in set', () => {
      cache.set(null as unknown as string, 'value')
      cache.set(undefined as unknown as string, 'value')
      expect(cache.size()).toBe(0)
    })

    it('should handle null and undefined keys in get', () => {
      expect(cache.get(null as unknown as string)).toBeUndefined()
      expect(cache.get(undefined as unknown as string)).toBeUndefined()
    })

    it('should return undefined for non-existent keys', () => {
      expect(cache.get('nonexistent')).toBeUndefined()
    })

    it('should update existing values', () => {
      cache.set('key1', 'value1')
      cache.set('key1', 'updated')
      expect(cache.get('key1')).toBe('updated')
      expect(cache.size()).toBe(1)
    })

    it('should delete values', () => {
      cache.set('key1', 'value1')
      expect(cache.delete('key1')).toBe(true)
      expect(cache.get('key1')).toBeUndefined()
      expect(cache.delete('key1')).toBe(false)
    })

    it('should clear all values', async () => {
      cache.set('key1', 'value1')
      cache.set('key2', 'value2')
      await cache.clear()
      expect(cache.size()).toBe(0)
      expect(cache.get('key1')).toBeUndefined()
    })

    it('should check if key exists', () => {
      cache.set('key1', 'value1')
      expect(cache.has('key1')).toBe(true)
      expect(cache.has('nonexistent')).toBe(false)
    })

    it('should get all keys', () => {
      cache.set('key1', 'value1')
      cache.set('key2', 'value2')
      const keys = cache.keys()
      expect(keys).toEqual(['key1', 'key2'])
    })

    it('should get current size', () => {
      expect(cache.size()).toBe(0)
      cache.set('key1', 'value1')
      expect(cache.size()).toBe(1)
    })
  })

  describe('LRU eviction', () => {
    beforeEach(() => {
      cache = new CacheLayer({ maxSize: 3 })
    })

    it('should evict least recently used items when maxSize is exceeded', () => {
      cache.set('key1', 'value1')
      cache.set('key2', 'value2')
      cache.set('key3', 'value3')
      cache.set('key4', 'value4')

      expect(cache.has('key1')).toBe(false) // evicted
      expect(cache.has('key2')).toBe(true)
      expect(cache.has('key3')).toBe(true)
      expect(cache.has('key4')).toBe(true)
    })

    it('should update LRU order on get', () => {
      cache.set('key1', 'value1')
      cache.set('key2', 'value2')
      cache.set('key3', 'value3')

      // Access key1 to make it recently used
      cache.get('key1')

      cache.set('key4', 'value4')

      expect(cache.has('key1')).toBe(true) // not evicted
      expect(cache.has('key2')).toBe(false) // evicted
    })
  })

  describe('memory-based eviction', () => {
    it('should evict items when memory limit is exceeded', () => {
      cache = new CacheLayer({
        maxSize: 100,
        maxMemory: 100, // Very small memory limit
      })

      // Add items that will exceed memory limit
      cache.set('key1', 'x'.repeat(40))
      cache.set('key2', 'x'.repeat(40))
      cache.set('key3', 'x'.repeat(40))

      // Some items should be evicted due to memory limit
      const stats = cache.getStats()
      expect(stats.memoryUsage).toBeLessThanOrEqual(100)
      expect(stats.evictions).toBeGreaterThan(0)
    })

    it('should handle eviction when no items can be evicted', () => {
      cache = new CacheLayer({ maxSize: 1 })
      cache.set('key1', 'value1')

      // This should replace the existing item
      cache.set('key1', 'value2')
      expect(cache.size()).toBe(1)
    })
  })

  describe('TTL expiration', () => {
    beforeEach(() => {
      cache = new CacheLayer({ ttl: 1000 }) // 1 second TTL
    })

    it('should expire items after TTL', () => {
      cache.set('key1', 'value1')
      expect(cache.get('key1')).toBe('value1')

      vi.advanceTimersByTime(1001)

      expect(cache.get('key1')).toBeUndefined()
    })

    it('should not expire items before TTL', () => {
      cache.set('key1', 'value1')

      vi.advanceTimersByTime(999)

      expect(cache.get('key1')).toBe('value1')
    })

    it('should handle custom TTL per item', () => {
      cache.setWithTTL('key1', 'value1', 2000)
      cache.set('key2', 'value2') // Uses default TTL

      vi.advanceTimersByTime(1500)

      expect(cache.get('key1')).toBe('value1') // custom TTL not expired
      expect(cache.get('key2')).toBeUndefined() // default TTL expired
    })

    it('should handle zero TTL', () => {
      cache.setWithTTL('key1', 'value1', 0)
      expect(cache.get('key1')).toBeUndefined()
    })

    it('should handle negative TTL', () => {
      cache.setWithTTL('key1', 'value1', -1000)
      expect(cache.get('key1')).toBeUndefined()
    })

    it('should expire items in has() check', () => {
      cache.set('key1', 'value1')
      vi.advanceTimersByTime(1001)
      expect(cache.has('key1')).toBe(false)
    })

    it('should clean up expired items during get', () => {
      cache.set('key1', 'value1')
      cache.set('key2', 'value2')

      vi.advanceTimersByTime(1001)

      // This get should trigger cleanup
      cache.get('key1')

      expect(cache.size()).toBe(0)
    })

    it('should handle null/undefined keys in setWithTTL', () => {
      cache.setWithTTL(null as unknown as string, 'value', 1000)
      cache.setWithTTL(undefined as unknown as string, 'value', 1000)
      expect(cache.size()).toBe(0)
    })
  })

  describe('manual cleanup', () => {
    it('should manually cleanup expired items', () => {
      cache = new CacheLayer({ ttl: 1000 })

      cache.set('key1', 'value1')
      cache.set('key2', 'value2')

      vi.advanceTimersByTime(1001)

      const removed = cache.cleanup()
      expect(removed).toBe(2)
      expect(cache.size()).toBe(0)
    })

    it('should run periodic cleanup', () => {
      cache = new CacheLayer({ ttl: 1000 })
      const cleanupSpy = vi.spyOn(cache, 'cleanup')

      cache.set('key1', 'value1')

      // Advance time to trigger interval
      vi.advanceTimersByTime(60000)

      expect(cleanupSpy).toHaveBeenCalled()
    })

    it('should not remove unexpired items during cleanup', () => {
      cache = new CacheLayer({ ttl: 10000 })

      cache.set('key1', 'value1')

      vi.advanceTimersByTime(5000)

      const removed = cache.cleanup()
      expect(removed).toBe(0)
      expect(cache.has('key1')).toBe(true)
    })
  })

  describe('batch operations', () => {
    beforeEach(() => {
      cache = new CacheLayer()
    })

    it('should set multiple values with setBatch', () => {
      const items = new Map([
        ['key1', 'value1'],
        ['key2', 'value2'],
        ['key3', 'value3'],
      ])

      cache.setBatch(items)

      expect(cache.get('key1')).toBe('value1')
      expect(cache.get('key2')).toBe('value2')
      expect(cache.get('key3')).toBe('value3')
    })

    it('should get multiple values with getBatch', () => {
      cache.set('key1', 'value1')
      cache.set('key2', 'value2')

      const results = cache.getBatch(['key1', 'key2', 'key3'])

      expect(results.get('key1')).toBe('value1')
      expect(results.get('key2')).toBe('value2')
      expect(results.get('key3')).toBeUndefined()
    })

    it('should warmup cache with multiple items', async () => {
      const items = new Map([
        ['key1', 'value1'],
        ['key2', 'value2'],
      ])

      await cache.warmup(items)

      expect(cache.get('key1')).toBe('value1')
      expect(cache.get('key2')).toBe('value2')
    })
  })

  describe('statistics', () => {
    beforeEach(() => {
      cache = new CacheLayer({ maxSize: 3, enableStats: true })
    })

    it('should track hits and misses', () => {
      cache.set('key1', 'value1')

      cache.get('key1') // hit
      cache.get('key2') // miss

      const stats = cache.getStats()
      expect(stats.hits).toBe(1)
      expect(stats.misses).toBe(1)
      expect(stats.hitRatio).toBe(0.5)
    })

    it('should calculate hit ratio correctly', () => {
      cache.set('key1', 'value1')

      cache.get('key1') // hit
      cache.get('key1') // hit
      cache.get('key2') // miss

      const stats = cache.getStats()
      expect(stats.hitRatio).toBeCloseTo(0.667, 2)
    })

    it('should handle zero total requests', () => {
      const stats = cache.getStats()
      expect(stats.hitRatio).toBe(0)
    })

    it('should track evictions', () => {
      cache.set('key1', 'value1')
      cache.set('key2', 'value2')
      cache.set('key3', 'value3')
      cache.set('key4', 'value4') // causes eviction

      const stats = cache.getStats()
      expect(stats.evictions).toBe(1)
    })

    it('should track expirations', () => {
      const cacheWithTTL = new CacheLayer({ ttl: 1000 })
      cacheWithTTL.set('key1', 'value1')

      vi.advanceTimersByTime(1001)
      cacheWithTTL.get('key1') // triggers expiration

      const stats = cacheWithTTL.getStats()
      expect(stats.expirations).toBeGreaterThan(0)
    })

    it('should track size and memory usage', () => {
      cache.set('key1', { data: 'value1' })
      cache.set('key2', { data: 'value2' })

      const stats = cache.getStats()
      expect(stats.size).toBe(2)
      expect(stats.memoryUsage).toBeGreaterThan(0)
    })

    it('should reset statistics', () => {
      cache.set('key1', 'value1')
      cache.get('key1')
      cache.get('nonexistent')

      cache.resetStats()

      const stats = cache.getStats()
      expect(stats.hits).toBe(0)
      expect(stats.misses).toBe(0)
      expect(stats.evictions).toBe(0)
      expect(stats.expirations).toBe(0)
    })

    it('should not track stats when disabled', () => {
      const cacheNoStats = new CacheLayer({ enableStats: false })
      cacheNoStats.set('key1', 'value1')
      cacheNoStats.get('key1')
      cacheNoStats.get('nonexistent')

      const stats = cacheNoStats.getStats()
      expect(stats.hits).toBe(0)
      expect(stats.misses).toBe(0)
    })
  })

  describe('size estimation', () => {
    beforeEach(() => {
      cache = new CacheLayer()
    })

    it('should estimate size for JSON-serializable objects', () => {
      const obj = { key: 'value', nested: { deep: true } }
      cache.set('key1', obj)

      const stats = cache.getStats()
      expect(stats.memoryUsage).toBeGreaterThan(0)
    })

    it('should handle non-serializable objects', () => {
      interface CircularRef {
        key: string
        self?: CircularRef
      }
      const circular: CircularRef = { key: 'value' }
      circular.self = circular

      cache.set('key1', circular)

      const stats = cache.getStats()
      expect(stats.memoryUsage).toBe(1024) // default fallback
    })

    it('should update memory usage on delete', () => {
      cache.set('key1', 'value1')
      const statsBeforeDelete = cache.getStats()
      const memoryBefore = statsBeforeDelete.memoryUsage

      cache.delete('key1')
      const statsAfterDelete = cache.getStats()

      expect(statsAfterDelete.memoryUsage).toBeLessThan(memoryBefore)
    })
  })

  describe('access tracking', () => {
    it('should update access metadata on get', () => {
      cache = new CacheLayer()
      cache.set('key1', 'value1')

      // Advance time to test access tracking
      vi.advanceTimersByTime(100)

      cache.get('key1')
      cache.get('key1')

      // Access count should be tracked
      const stats = cache.getStats()
      expect(stats.hits).toBe(2)
    })

    it('should update LRU order on access', () => {
      cache = new CacheLayer({ maxSize: 2 })

      cache.set('key1', 'value1')
      cache.set('key2', 'value2')

      // Access key1 to update its position
      cache.get('key1')

      // Add key3, should evict key2 (least recently used)
      cache.set('key3', 'value3')

      expect(cache.has('key1')).toBe(true)
      expect(cache.has('key2')).toBe(false)
      expect(cache.has('key3')).toBe(true)
    })
  })

  describe('edge cases', () => {
    it('should handle empty string keys', () => {
      cache = new CacheLayer()
      cache.set('', 'value')
      expect(cache.get('')).toBe('value')
    })

    it('should handle various data types', () => {
      cache = new CacheLayer()

      const testData = [
        ['string', 'test'],
        ['number', 123],
        ['boolean', true],
        ['null', null],
        ['undefined', undefined],
        ['array', [1, 2, 3]],
        ['object', { key: 'value' }],
        ['date', new Date()],
      ]

      testData.forEach(([key, value]) => {
        cache.set(key as string, value)
        expect(cache.get(key as string)).toEqual(value)
      })
    })

    it('should handle replacing existing entry with setWithTTL', () => {
      cache = new CacheLayer()

      cache.set('key1', 'value1')
      cache.setWithTTL('key1', 'value2', 5000)

      expect(cache.get('key1')).toBe('value2')
      expect(cache.size()).toBe(1)
    })

    it('should clear stats correctly on clear', async () => {
      cache = new CacheLayer()

      cache.set('key1', 'value1')
      cache.set('key2', 'value2')

      await cache.clear()

      const stats = cache.getStats()
      expect(stats.size).toBe(0)
      expect(stats.memoryUsage).toBe(0)
    })

    it('should handle concurrent cleanup and access', () => {
      cache = new CacheLayer({ ttl: 1000 })

      cache.set('key1', 'value1')
      cache.set('key2', 'value2')

      vi.advanceTimersByTime(1001)

      // Trigger cleanup during access
      cache.get('key1')

      expect(cache.size()).toBe(0)
      const stats = cache.getStats()
      expect(stats.expirations).toBeGreaterThan(0)
    })
  })

  describe('cleanup during operations', () => {
    it('should increment expirations during cleanup in get', () => {
      cache = new CacheLayer({ ttl: 100 })

      cache.set('key1', 'value1')
      cache.set('key2', 'value2')

      vi.advanceTimersByTime(101)

      // This should trigger cleanup of expired items
      cache.get('key1')

      const stats = cache.getStats()
      expect(stats.expirations).toBeGreaterThan(0)
    })

    it('should track expirations in has() method', () => {
      cache = new CacheLayer({ ttl: 100 })

      cache.set('key1', 'value1')

      vi.advanceTimersByTime(101)

      const exists = cache.has('key1')

      expect(exists).toBe(false)
      const stats = cache.getStats()
      expect(stats.expirations).toBe(1)
    })
  })

  describe('eviction edge cases', () => {
    it('should handle eviction when accessOrder is empty', () => {
      cache = new CacheLayer({ maxSize: 1 })

      // Manually clear accessOrder to simulate edge case
      cache.set('key1', 'value1')
      interface CacheWithAccessOrder {
        accessOrder: Set<string>
      }
      const accessOrder = (cache as unknown as CacheWithAccessOrder).accessOrder
      accessOrder.clear()

      // This should not throw
      cache.set('key2', 'value2')
      expect(cache.size()).toBeGreaterThan(0)
    })

    it('should continue evicting until under memory limit', () => {
      cache = new CacheLayer({
        maxSize: 10,
        maxMemory: 50,
      })

      // Add multiple items that exceed memory
      for (let i = 0; i < 5; i++) {
        cache.set(`key${i}`, 'x'.repeat(20))
      }

      const stats = cache.getStats()
      expect(stats.memoryUsage).toBeLessThanOrEqual(50)
      expect(stats.evictions).toBeGreaterThan(0)
    })

    it('should handle break condition in size-based eviction', () => {
      cache = new CacheLayer({ maxSize: 1 })

      // Set up initial items - this will fill the cache
      cache.set('key1', 'value1')

      // Mock accessOrder.values() to simulate an edge case
      interface CacheWithAccessOrder {
        accessOrder: {
          values: () => IterableIterator<string>
        }
      }
      const accessOrder = (cache as unknown as CacheWithAccessOrder).accessOrder
      const originalValues = accessOrder.values.bind(accessOrder)

      // Make values() return an iterator that returns undefined on first next() call
      accessOrder.values = function () {
        return {
          next: function () {
            // Return undefined value to trigger the break condition
            return { done: false, value: undefined }
          },
        }
      }

      // This should trigger eviction but hit the break immediately
      cache.set('key2', 'value2')

      // Restore original values method for size check
      accessOrder.values = originalValues

      // Cache should still have items (the break prevented eviction)
      expect(cache.size()).toBeGreaterThan(1)
    })

    it('should handle break condition in memory-based eviction', () => {
      cache = new CacheLayer({ maxSize: 10, maxMemory: 100 })

      // Add items
      cache.set('key1', 'x'.repeat(30))
      cache.set('key2', 'x'.repeat(30))

      // Mock accessOrder to return undefined after first iteration
      interface CacheWithAccessOrder {
        accessOrder: {
          values: () => IterableIterator<string>
        }
      }
      const accessOrder = (cache as unknown as CacheWithAccessOrder).accessOrder
      const originalValues = accessOrder.values.bind(accessOrder)
      let callCount = 0

      accessOrder.values = function () {
        const iterator = originalValues()
        const originalNext = iterator.next.bind(iterator)
        iterator.next = function () {
          callCount++
          if (callCount > 1) {
            return { done: true, value: undefined }
          }
          return originalNext()
        }
        return iterator
      }

      // Add another item that triggers memory eviction
      cache.set('key3', 'x'.repeat(50))

      // Should have at least one item after partial eviction
      expect(cache.size()).toBeGreaterThan(0)
      const stats = cache.getStats()
      expect(stats.evictions).toBeGreaterThan(0)
    })
  })
})
