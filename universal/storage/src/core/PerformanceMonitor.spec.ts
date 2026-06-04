/**
 * @fileoverview Tests for performance monitoring implementations
 *
 * @description
 * Comprehensive test suite for performance monitoring of storage operations
 * including metrics collection, statistical analysis, and cleanup operations.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import {
  DefaultPerformanceMonitor,
  NullPerformanceMonitor,
  type PerformanceMetrics,
  type PerformanceSummary,
} from './PerformanceMonitor'

describe('PerformanceMonitor', () => {
  describe('DefaultPerformanceMonitor', () => {
    let monitor: DefaultPerformanceMonitor

    beforeEach(() => {
      vi.useFakeTimers()
      monitor = new DefaultPerformanceMonitor()
    })

    afterEach(() => {
      monitor.dispose()
      vi.useRealTimers()
    })

    describe('constructor', () => {
      it('should create monitor with default options', () => {
        const defaultMonitor = new DefaultPerformanceMonitor()
        expect(defaultMonitor).toBeDefined()
        expect(defaultMonitor.getMetrics()).toEqual([])
        defaultMonitor.dispose()
      })

      it('should create monitor with custom options', () => {
        const customMonitor = new DefaultPerformanceMonitor({
          maxMetrics: 100,
          cleanupInterval: 1000,
        })
        expect(customMonitor).toBeDefined()
        customMonitor.dispose()
      })

      it('should treat 0 cleanup interval as default', () => {
        const zeroIntervalMonitor = new DefaultPerformanceMonitor({
          cleanupInterval: 0,
          maxMetrics: 100,
        })
        expect(zeroIntervalMonitor).toBeDefined()

        // Due to || operator, 0 becomes 300000 (default)
        expect(zeroIntervalMonitor['cleanupInterval']).toBe(300000)

        // Timer should be created with default interval
        expect(zeroIntervalMonitor['cleanupTimer']).toBeDefined()

        zeroIntervalMonitor.dispose()
      })

      it('should not start cleanup timer with negative interval', () => {
        const negativeIntervalMonitor = new DefaultPerformanceMonitor({
          cleanupInterval: -1000,
        })
        expect(negativeIntervalMonitor).toBeDefined()
        // Negative values don't pass the > 0 check
        expect(negativeIntervalMonitor['cleanupInterval']).toBe(-1000)
        expect(negativeIntervalMonitor['cleanupTimer']).toBeUndefined()
        negativeIntervalMonitor.dispose()
      })

      it('should start cleanup timer with positive interval', () => {
        const timerMonitor = new DefaultPerformanceMonitor({
          cleanupInterval: 5000,
        })
        expect(timerMonitor).toBeDefined()
        timerMonitor.dispose()
      })
    })

    describe('record', () => {
      it('should record a basic metric', () => {
        const metric: PerformanceMetrics = {
          operation: 'get',
          duration: 10,
        }

        monitor.record(metric)
        const metrics = monitor.getMetrics()

        expect(metrics).toHaveLength(1)
        expect(metrics[0].operation).toBe('get')
        expect(metrics[0].duration).toBe(10)
        expect(metrics[0].timestamp).toBeDefined()
      })

      it('should record metric with all fields', () => {
        const metric: PerformanceMetrics = {
          operation: 'set',
          duration: 15,
          size: 1024,
          cacheHit: true,
          compressed: true,
          encrypted: true,
          key: 'test-key',
          success: true,
          error: undefined,
          timestamp: 1234567890,
          tags: { region: 'us-west', tier: 'premium' },
        }

        monitor.record(metric)
        const metrics = monitor.getMetrics()

        expect(metrics).toHaveLength(1)
        expect(metrics[0]).toEqual(metric)
      })

      it('should add timestamp if not provided', () => {
        const metric: PerformanceMetrics = {
          operation: 'delete',
          duration: 5,
        }

        const now = Date.now()
        monitor.record(metric)
        const metrics = monitor.getMetrics()

        expect(metrics[0].timestamp).toBeGreaterThanOrEqual(now)
        expect(metrics[0].timestamp).toBeLessThanOrEqual(Date.now())
      })

      it('should trigger cleanup when exceeding max metrics', () => {
        const smallMonitor = new DefaultPerformanceMonitor({
          maxMetrics: 3,
          cleanupInterval: 0,
        })

        // Add 4 metrics
        for (let i = 0; i < 4; i++) {
          smallMonitor.record({
            operation: `op${i}`,
            duration: i,
            timestamp: Date.now() + i,
          })
        }

        // Should have triggered cleanup and kept only the most recent 3
        const metrics = smallMonitor.getMetrics()
        expect(metrics).toHaveLength(3)
        expect(metrics[0].operation).toBe('op1')
        expect(metrics[2].operation).toBe('op3')

        smallMonitor.dispose()
      })
    })

    describe('getMetrics', () => {
      it('should return empty array when no metrics', () => {
        expect(monitor.getMetrics()).toEqual([])
      })

      it('should return copy of metrics array', () => {
        monitor.record({ operation: 'get', duration: 10 })
        const metrics1 = monitor.getMetrics()
        const metrics2 = monitor.getMetrics()

        expect(metrics1).not.toBe(metrics2) // Different array instances
        expect(metrics1).toEqual(metrics2) // Same content
      })

      it('should return all recorded metrics', () => {
        monitor.record({ operation: 'get', duration: 10 })
        monitor.record({ operation: 'set', duration: 20 })
        monitor.record({ operation: 'delete', duration: 5 })

        const metrics = monitor.getMetrics()
        expect(metrics).toHaveLength(3)
        expect(metrics.map((m) => m.operation)).toEqual([
          'get',
          'set',
          'delete',
        ])
      })
    })

    describe('getMetricsByOperation', () => {
      beforeEach(() => {
        monitor.record({ operation: 'get', duration: 10 })
        monitor.record({ operation: 'set', duration: 20 })
        monitor.record({ operation: 'get', duration: 15 })
        monitor.record({ operation: 'delete', duration: 5 })
        monitor.record({ operation: 'set', duration: 25 })
      })

      it('should filter metrics by operation', () => {
        const getMetrics = monitor.getMetricsByOperation('get')
        expect(getMetrics).toHaveLength(2)
        expect(getMetrics.every((m) => m.operation === 'get')).toBe(true)

        const setMetrics = monitor.getMetricsByOperation('set')
        expect(setMetrics).toHaveLength(2)
        expect(setMetrics.every((m) => m.operation === 'set')).toBe(true)
      })

      it('should return empty array for non-existent operation', () => {
        const metrics = monitor.getMetricsByOperation('update')
        expect(metrics).toEqual([])
      })

      it('should return single metric for unique operation', () => {
        const metrics = monitor.getMetricsByOperation('delete')
        expect(metrics).toHaveLength(1)
        expect(metrics[0].operation).toBe('delete')
        expect(metrics[0].duration).toBe(5)
      })
    })

    describe('getSummary', () => {
      it('should return empty summary when no metrics', () => {
        const summary = monitor.getSummary()

        expect(summary).toEqual({
          totalOperations: 0,
          averageDuration: 0,
          minDuration: 0,
          maxDuration: 0,
          cacheHitRate: 0,
          compressionRate: 0,
          encryptionRate: 0,
          successRate: 0,
          operationsPerSecond: 0,
          averageSize: 0,
          operationBreakdown: {},
        })
      })

      it('should calculate basic statistics', () => {
        monitor.record({ operation: 'get', duration: 10 })
        monitor.record({ operation: 'get', duration: 20 })
        monitor.record({ operation: 'set', duration: 15 })

        const summary = monitor.getSummary()

        expect(summary.totalOperations).toBe(3)
        expect(summary.averageDuration).toBe(15)
        expect(summary.minDuration).toBe(10)
        expect(summary.maxDuration).toBe(20)
      })

      it('should calculate cache hit rate', () => {
        monitor.record({ operation: 'get', duration: 10, cacheHit: true })
        monitor.record({ operation: 'get', duration: 20, cacheHit: false })
        monitor.record({ operation: 'get', duration: 15, cacheHit: true })
        monitor.record({ operation: 'get', duration: 25 }) // undefined treated as false

        const summary = monitor.getSummary()
        expect(summary.cacheHitRate).toBe(50) // 2 out of 4
      })

      it('should calculate compression rate', () => {
        monitor.record({ operation: 'set', duration: 10, compressed: true })
        monitor.record({ operation: 'set', duration: 20, compressed: false })
        monitor.record({ operation: 'set', duration: 15, compressed: true })

        const summary = monitor.getSummary()
        expect(summary.compressionRate).toBeCloseTo(66.67, 1)
      })

      it('should calculate encryption rate', () => {
        monitor.record({ operation: 'set', duration: 10, encrypted: true })
        monitor.record({ operation: 'set', duration: 20, encrypted: true })
        monitor.record({ operation: 'set', duration: 15, encrypted: false })
        monitor.record({ operation: 'set', duration: 25 })

        const summary = monitor.getSummary()
        expect(summary.encryptionRate).toBe(50) // 2 out of 4
      })

      it('should calculate success rate', () => {
        monitor.record({ operation: 'get', duration: 10, success: true })
        monitor.record({ operation: 'get', duration: 20, success: false })
        monitor.record({ operation: 'get', duration: 15, success: true })
        monitor.record({ operation: 'get', duration: 25 }) // undefined treated as success

        const summary = monitor.getSummary()
        expect(summary.successRate).toBe(75) // 3 out of 4
      })

      it('should calculate average size', () => {
        monitor.record({ operation: 'set', duration: 10, size: 100 })
        monitor.record({ operation: 'set', duration: 20, size: 200 })
        monitor.record({ operation: 'set', duration: 15, size: 150 })
        monitor.record({ operation: 'get', duration: 5 }) // no size

        const summary = monitor.getSummary()
        expect(summary.averageSize).toBe(150) // average of 100, 200, 150
      })

      it('should handle no sizes gracefully', () => {
        monitor.record({ operation: 'get', duration: 10 })
        monitor.record({ operation: 'get', duration: 20 })

        const summary = monitor.getSummary()
        expect(summary.averageSize).toBe(0)
      })

      it('should calculate operations per second', () => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Used to establish test baseline time
        const startTime = Date.now()

        // Record metrics over a simulated time period
        monitor.record({ operation: 'get', duration: 10 })

        // Advance time by 2 seconds
        vi.advanceTimersByTime(2000)

        monitor.record({ operation: 'get', duration: 20 })
        monitor.record({ operation: 'get', duration: 15 })

        const summary = monitor.getSummary()
        // 3 operations in ~2 seconds
        expect(summary.operationsPerSecond).toBeGreaterThan(0)
        expect(summary.operationsPerSecond).toBeLessThanOrEqual(3)
      })

      it('should calculate operation breakdown', () => {
        // Get operations
        monitor.record({
          operation: 'get',
          duration: 10,
          cacheHit: true,
          success: true,
        })
        monitor.record({
          operation: 'get',
          duration: 20,
          cacheHit: false,
          success: true,
        })
        monitor.record({
          operation: 'get',
          duration: 30,
          cacheHit: true,
          success: false,
        })

        // Set operations
        monitor.record({
          operation: 'set',
          duration: 15,
          cacheHit: false,
          success: true,
        })
        monitor.record({
          operation: 'set',
          duration: 25,
          cacheHit: false,
          success: true,
        })

        // Delete operation
        monitor.record({ operation: 'delete', duration: 5, success: true })

        const summary = monitor.getSummary()
        const breakdown = summary.operationBreakdown

        expect(Object.keys(breakdown)).toEqual(['get', 'set', 'delete'])

        // Check 'get' stats
        expect(breakdown.get).toEqual({
          count: 3,
          averageDuration: 20,
          minDuration: 10,
          maxDuration: 30,
          successRate: expect.any(Number),
          cacheHitRate: expect.any(Number),
        })
        expect(breakdown.get.successRate).toBeCloseTo(66.67, 1)
        expect(breakdown.get.cacheHitRate).toBeCloseTo(66.67, 1)

        // Check 'set' stats
        expect(breakdown.set).toEqual({
          count: 2,
          averageDuration: 20,
          minDuration: 15,
          maxDuration: 25,
          successRate: 100,
          cacheHitRate: 0,
        })

        // Check 'delete' stats
        expect(breakdown.delete).toEqual({
          count: 1,
          averageDuration: 5,
          minDuration: 5,
          maxDuration: 5,
          successRate: 100,
          cacheHitRate: 0,
        })
      })

      it('should handle mixed success values in operation breakdown', () => {
        monitor.record({ operation: 'get', duration: 10 }) // undefined = success
        monitor.record({ operation: 'get', duration: 20, success: true })
        monitor.record({ operation: 'get', duration: 30, success: false })

        const summary = monitor.getSummary()
        expect(summary.operationBreakdown.get.successRate).toBeCloseTo(66.67, 1)
      })
    })

    describe('clear', () => {
      it('should clear all metrics', () => {
        monitor.record({ operation: 'get', duration: 10 })
        monitor.record({ operation: 'set', duration: 20 })
        expect(monitor.getMetrics()).toHaveLength(2)

        monitor.clear()
        expect(monitor.getMetrics()).toEqual([])
      })

      it('should reset start time', () => {
        monitor.record({ operation: 'get', duration: 10 })

        const summary1 = monitor.getSummary()
        // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Used for verifying operations per second calculation changes after clear
        const opsPerSec1 = summary1.operationsPerSecond

        monitor.clear()
        vi.advanceTimersByTime(1000)

        monitor.record({ operation: 'get', duration: 10 })
        const summary2 = monitor.getSummary()

        // After clear, the operations per second should be recalculated
        expect(summary2.operationsPerSecond).toBeGreaterThan(0)
      })
    })

    describe('export', () => {
      it('should export empty data', () => {
        const exported = monitor.export()
        const parsed = JSON.parse(exported)

        expect(parsed).toHaveProperty('metrics')
        expect(parsed).toHaveProperty('summary')
        expect(parsed).toHaveProperty('exportedAt')
        expect(parsed.metrics).toEqual([])
        expect(parsed.summary.totalOperations).toBe(0)
      })

      it('should export metrics and summary', () => {
        monitor.record({ operation: 'get', duration: 10, cacheHit: true })
        monitor.record({ operation: 'set', duration: 20, size: 1024 })

        const exported = monitor.export()
        const parsed = JSON.parse(exported)

        expect(parsed.metrics).toHaveLength(2)
        expect(parsed.summary.totalOperations).toBe(2)
        expect(parsed.summary.averageDuration).toBe(15)
        expect(parsed.exportedAt).toMatch(
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/
        )
      })

      it('should export with proper formatting', () => {
        monitor.record({ operation: 'test', duration: 10 })

        const exported = monitor.export()
        // Should be properly formatted JSON with indentation
        expect(exported).toContain('\n')
        expect(exported).toContain('  ')

        // Should be valid JSON
        expect(() => JSON.parse(exported)).not.toThrow()
      })
    })

    describe('dispose', () => {
      it('should clear metrics on dispose', () => {
        monitor.record({ operation: 'get', duration: 10 })
        expect(monitor.getMetrics()).toHaveLength(1)

        monitor.dispose()
        expect(monitor.getMetrics()).toEqual([])
      })

      it('should stop cleanup timer', () => {
        const timerMonitor = new DefaultPerformanceMonitor({
          cleanupInterval: 1000,
        })

        const clearIntervalSpy = vi.spyOn(global, 'clearInterval')
        timerMonitor.dispose()

        expect(clearIntervalSpy).toHaveBeenCalled()
      })

      it('should handle multiple dispose calls', () => {
        monitor.dispose()
        expect(() => monitor.dispose()).not.toThrow()
      })

      it('should handle dispose when no timer exists', () => {
        const noTimerMonitor = new DefaultPerformanceMonitor({
          cleanupInterval: 0,
        })
        expect(() => noTimerMonitor.dispose()).not.toThrow()
      })
    })

    describe('cleanup', () => {
      it('should trigger periodic cleanup', () => {
        const cleanupMonitor = new DefaultPerformanceMonitor({
          maxMetrics: 100,
          cleanupInterval: 1000,
        })

        // Add old metrics (more than 1 hour old)
        const oldTime = Date.now() - 3700000 // 1 hour + 100 seconds ago
        for (let i = 0; i < 5; i++) {
          cleanupMonitor.record({
            operation: `old-${i}`,
            duration: 10,
            timestamp: oldTime,
          })
        }

        // Add recent metrics
        for (let i = 0; i < 5; i++) {
          cleanupMonitor.record({
            operation: `recent-${i}`,
            duration: 10,
            timestamp: Date.now(),
          })
        }

        expect(cleanupMonitor.getMetrics()).toHaveLength(10)

        // Trigger cleanup by advancing time
        vi.advanceTimersByTime(1000)

        // Old metrics should be removed
        const remaining = cleanupMonitor.getMetrics()
        expect(remaining).toHaveLength(5)
        expect(remaining.every((m) => m.operation.startsWith('recent'))).toBe(
          true
        )

        cleanupMonitor.dispose()
      })

      it('should trigger cleanup via timer callback', () => {
        // Test the actual timer callback execution
        const cleanupMonitor = new DefaultPerformanceMonitor({
          maxMetrics: 100,
          cleanupInterval: 500,
        })

        // Add old metrics with timestamp
        const oldTime = Date.now() - 3700000
        for (let i = 0; i < 3; i++) {
          cleanupMonitor.record({
            operation: `old-${i}`,
            duration: 10,
            timestamp: oldTime,
          })
        }

        // Add a metric with undefined timestamp that becomes old after setting
        const oldMetric: PerformanceMetrics = {
          operation: 'old-undefined',
          duration: 5,
        }
        // Manually set it to old to test the filter's handling of undefined
        cleanupMonitor['metrics'].push({
          ...oldMetric,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Intentionally testing undefined timestamp handling in cleanup logic
          timestamp: undefined as any, // Force undefined to test (m.timestamp || 0) logic
        })

        // Add recent metrics
        for (let i = 0; i < 2; i++) {
          cleanupMonitor.record({
            operation: `recent-${i}`,
            duration: 10,
            // No timestamp - will default to Date.now()
          })
        }

        expect(cleanupMonitor.getMetrics()).toHaveLength(6)

        // Advance timer to trigger cleanup
        vi.advanceTimersByTime(500)

        // Old metrics should be removed, recent metrics should remain
        const remaining = cleanupMonitor.getMetrics()
        expect(remaining).toHaveLength(2)
        expect(remaining.every((m) => m.operation.startsWith('recent'))).toBe(
          true
        )

        cleanupMonitor.dispose()
      })

      it('should keep only maxMetrics when exceeding limit', () => {
        const limitMonitor = new DefaultPerformanceMonitor({
          maxMetrics: 5,
          cleanupInterval: 1000,
        })

        // Add 10 metrics
        for (let i = 0; i < 10; i++) {
          limitMonitor.record({
            operation: `op-${i}`,
            duration: 10,
            timestamp: Date.now() + i, // Ensure order
          })
        }

        // Trigger cleanup
        vi.advanceTimersByTime(1000)

        const metrics = limitMonitor.getMetrics()
        expect(metrics).toHaveLength(5)
        // Should keep the most recent 5
        expect(metrics[0].operation).toBe('op-5')
        expect(metrics[4].operation).toBe('op-9')

        limitMonitor.dispose()
      })

      it('should handle cleanup with no metrics', () => {
        const emptyMonitor = new DefaultPerformanceMonitor({
          cleanupInterval: 1000,
        })

        expect(() => vi.advanceTimersByTime(1000)).not.toThrow()
        expect(emptyMonitor.getMetrics()).toEqual([])

        emptyMonitor.dispose()
      })

      it('should cleanup on immediate overflow', () => {
        const smallMonitor = new DefaultPerformanceMonitor({
          maxMetrics: 2,
          cleanupInterval: 0, // No periodic cleanup
        })

        // Add metrics that trigger immediate cleanup
        smallMonitor.record({ operation: 'op1', duration: 10 })
        smallMonitor.record({ operation: 'op2', duration: 20 })
        smallMonitor.record({ operation: 'op3', duration: 30 }) // Triggers cleanup

        const metrics = smallMonitor.getMetrics()
        expect(metrics).toHaveLength(2)
        // Should keep most recent
        expect(metrics[0].operation).toBe('op2')
        expect(metrics[1].operation).toBe('op3')

        smallMonitor.dispose()
      })
    })

    describe('edge cases', () => {
      it('should handle metrics with zero duration', () => {
        monitor.record({ operation: 'instant', duration: 0 })
        const summary = monitor.getSummary()
        expect(summary.averageDuration).toBe(0)
        expect(summary.minDuration).toBe(0)
        expect(summary.maxDuration).toBe(0)
      })

      it('should handle empty average calculation', () => {
        // Test the edge case where averageSize is calculated with no size data
        monitor.record({ operation: 'no-size-1', duration: 10 })
        monitor.record({ operation: 'no-size-2', duration: 20 })

        const summary = monitor.getSummary()
        expect(summary.averageSize).toBe(0) // Should return 0 for empty array
      })

      it('should handle average of empty array', () => {
        // Directly test the private average method for coverage
        const testMonitor = new DefaultPerformanceMonitor()

        // Access private average method for testing
        const average = testMonitor['average'].bind(testMonitor)

        // Test empty array case
        expect(average([])).toBe(0)

        // Also test normal cases
        expect(average([10])).toBe(10)
        expect(average([10, 20, 30])).toBe(20)

        testMonitor.dispose()
      })

      it('should handle negative durations gracefully', () => {
        monitor.record({ operation: 'weird', duration: -10 })
        const metrics = monitor.getMetrics()
        expect(metrics[0].duration).toBe(-10)
      })

      it('should handle very large numbers', () => {
        const largeSize = Number.MAX_SAFE_INTEGER
        monitor.record({ operation: 'huge', duration: 1000, size: largeSize })

        const summary = monitor.getSummary()
        expect(summary.averageSize).toBe(largeSize)
      })

      it('should handle concurrent operations', () => {
        const operations = ['get', 'set', 'delete', 'update', 'list']
        const promises = operations.map((op, i) => {
          return Promise.resolve(
            monitor.record({
              operation: op,
              duration: (i + 1) * 10,
            })
          )
        })

        return Promise.all(promises).then(() => {
          expect(monitor.getMetrics()).toHaveLength(5)
        })
      })

      it('should maintain data integrity with rapid operations', () => {
        for (let i = 0; i < 100; i++) {
          monitor.record({
            operation: i % 2 === 0 ? 'even' : 'odd',
            duration: i,
            success: i % 3 !== 0,
            cacheHit: i % 4 === 0,
          })
        }

        const metrics = monitor.getMetrics()
        expect(metrics).toHaveLength(100)

        const summary = monitor.getSummary()
        expect(summary.totalOperations).toBe(100)
        expect(summary.operationBreakdown).toHaveProperty('even')
        expect(summary.operationBreakdown).toHaveProperty('odd')
        expect(summary.operationBreakdown.even.count).toBe(50)
        expect(summary.operationBreakdown.odd.count).toBe(50)
      })
    })
  })

  describe('NullPerformanceMonitor', () => {
    let monitor: NullPerformanceMonitor

    beforeEach(() => {
      monitor = new NullPerformanceMonitor()
    })

    it('should discard recorded metrics', () => {
      monitor.record({ operation: 'test', duration: 100 })
      expect(monitor.getMetrics()).toEqual([])
    })

    it('should return empty metrics array', () => {
      expect(monitor.getMetrics()).toEqual([])
    })

    it('should return empty array for operation metrics', () => {
      monitor.record({ operation: 'get', duration: 10 })
      expect(monitor.getMetricsByOperation('get')).toEqual([])
      expect(monitor.getMetricsByOperation('any')).toEqual([])
    })

    it('should return zero summary', () => {
      monitor.record({ operation: 'test', duration: 100 })
      const summary = monitor.getSummary()

      expect(summary).toEqual({
        totalOperations: 0,
        averageDuration: 0,
        minDuration: 0,
        maxDuration: 0,
        cacheHitRate: 0,
        compressionRate: 0,
        encryptionRate: 0,
        successRate: 0,
        operationsPerSecond: 0,
        averageSize: 0,
        operationBreakdown: {},
      })
    })

    it('should handle clear as no-op', () => {
      monitor.record({ operation: 'test', duration: 100 })
      monitor.clear()
      expect(monitor.getMetrics()).toEqual([])
    })

    it('should export empty object', () => {
      monitor.record({ operation: 'test', duration: 100 })
      expect(monitor.export()).toBe('{}')
    })

    it('should handle multiple operations without effect', () => {
      for (let i = 0; i < 100; i++) {
        monitor.record({
          operation: `op-${i}`,
          duration: i,
          size: i * 100,
          cacheHit: i % 2 === 0,
          success: true,
        })
      }

      expect(monitor.getMetrics()).toEqual([])
      expect(monitor.getSummary().totalOperations).toBe(0)
      expect(monitor.export()).toBe('{}')
    })
  })

  describe('Performance metrics types', () => {
    it('should accept all valid metric properties', () => {
      const metric: PerformanceMetrics = {
        operation: 'complex',
        duration: 100,
        size: 2048,
        cacheHit: true,
        compressed: false,
        encrypted: true,
        key: 'user:123',
        success: true,
        error: 'none',
        timestamp: Date.now(),
        tags: {
          region: 'us-east-1',
          tier: 'premium',
          version: 2,
          beta: true,
        },
      }

      const monitor = new DefaultPerformanceMonitor()
      monitor.record(metric)
      const recorded = monitor.getMetrics()[0]

      expect(recorded).toEqual(metric)
      monitor.dispose()
    })

    it('should handle minimal metric', () => {
      const metric: PerformanceMetrics = {
        operation: 'minimal',
        duration: 5,
      }

      const monitor = new DefaultPerformanceMonitor()
      monitor.record(metric)
      expect(monitor.getMetrics()[0].operation).toBe('minimal')
      monitor.dispose()
    })
  })

  describe('Performance summary types', () => {
    it('should generate complete summary structure', () => {
      const monitor = new DefaultPerformanceMonitor()

      // Add diverse metrics
      monitor.record({
        operation: 'read',
        duration: 10,
        cacheHit: true,
        success: true,
        size: 100,
      })
      monitor.record({
        operation: 'read',
        duration: 20,
        cacheHit: false,
        success: true,
        size: 200,
      })
      monitor.record({
        operation: 'write',
        duration: 30,
        compressed: true,
        encrypted: true,
        success: true,
      })
      monitor.record({
        operation: 'write',
        duration: 40,
        compressed: false,
        encrypted: false,
        success: false,
      })
      monitor.record({ operation: 'delete', duration: 5, success: true })

      const summary: PerformanceSummary = monitor.getSummary()

      // Verify all fields are present
      expect(summary).toHaveProperty('totalOperations')
      expect(summary).toHaveProperty('averageDuration')
      expect(summary).toHaveProperty('minDuration')
      expect(summary).toHaveProperty('maxDuration')
      expect(summary).toHaveProperty('cacheHitRate')
      expect(summary).toHaveProperty('compressionRate')
      expect(summary).toHaveProperty('encryptionRate')
      expect(summary).toHaveProperty('successRate')
      expect(summary).toHaveProperty('operationsPerSecond')
      expect(summary).toHaveProperty('averageSize')
      expect(summary).toHaveProperty('operationBreakdown')

      // Verify operation breakdown structure
      expect(summary.operationBreakdown).toHaveProperty('read')
      expect(summary.operationBreakdown).toHaveProperty('write')
      expect(summary.operationBreakdown).toHaveProperty('delete')

      const readStats = summary.operationBreakdown.read
      expect(readStats).toHaveProperty('count')
      expect(readStats).toHaveProperty('averageDuration')
      expect(readStats).toHaveProperty('minDuration')
      expect(readStats).toHaveProperty('maxDuration')
      expect(readStats).toHaveProperty('successRate')
      expect(readStats).toHaveProperty('cacheHitRate')

      monitor.dispose()
    })
  })
})
