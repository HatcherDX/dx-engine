/**
 * @fileoverview Tests for database migration manager
 *
 * @description
 * Comprehensive test suite for the MigrationManager class, covering
 * migration execution, rollback, dependency resolution, and history tracking.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MigrationManager, type Migration } from './MigrationManager'
import type { IStorageAdapter } from '../types/storage'

// Mock storage adapter
const createMockAdapter = (): IStorageAdapter => {
  const storage = new Map<string, unknown>()

  return {
    get: vi.fn(async (key: string) => storage.get(key)),
    set: vi.fn(async (key: string, value: unknown) => {
      storage.set(key, value)
    }),
    delete: vi.fn(async (key: string) => storage.delete(key)),
    has: vi.fn(async (key: string) => storage.has(key)),
    clear: vi.fn(async () => storage.clear()),
    keys: vi.fn(async () => Array.from(storage.keys())),
    values: vi.fn(async () => Array.from(storage.values())),
    entries: vi.fn(async () => Array.from(storage.entries())),
    size: vi.fn(async () => storage.size),
    query: vi.fn(),
    batch: vi.fn(),
    transaction: vi.fn(),
    watch: vi.fn(),
    unwatch: vi.fn(),
    close: vi.fn(),
  } as unknown as IStorageAdapter
}

describe('MigrationManager', () => {
  let adapter: IStorageAdapter
  let manager: MigrationManager

  beforeEach(() => {
    adapter = createMockAdapter()
    manager = new MigrationManager(adapter)
    vi.clearAllMocks()
  })

  describe('addMigration', () => {
    it('should add migration successfully', () => {
      const migration: Migration = {
        version: '1.0.0',
        description: 'Initial migration',
        up: vi.fn(),
      }

      manager.addMigration(migration)
      expect(() => manager.addMigration(migration)).toThrow(
        'Migration version 1.0.0 already exists'
      )
    })

    it('should prevent duplicate migration versions', () => {
      const migration1: Migration = {
        version: '1.0.0',
        description: 'First migration',
        up: vi.fn(),
      }

      const migration2: Migration = {
        version: '1.0.0',
        description: 'Duplicate migration',
        up: vi.fn(),
      }

      manager.addMigration(migration1)
      expect(() => manager.addMigration(migration2)).toThrow(
        'Migration version 1.0.0 already exists'
      )
    })

    it('should set reversible flag to true by default', () => {
      const migration: Migration = {
        version: '1.0.0',
        description: 'Test migration',
        up: vi.fn(),
        down: vi.fn(),
      }

      manager.addMigration(migration)
      // Migration should be internally marked as reversible
      expect(migration.reversible).toBeUndefined() // Original unchanged
    })

    it('should preserve explicit reversible flag', () => {
      const migration: Migration = {
        version: '1.0.0',
        description: 'Non-reversible migration',
        up: vi.fn(),
        reversible: false,
      }

      manager.addMigration(migration)
      expect(migration.reversible).toBe(false)
    })
  })

  describe('migrate', () => {
    it('should execute pending migrations in order', async () => {
      const upFn1 = vi.fn()
      const upFn2 = vi.fn()

      manager.addMigration({
        version: '1.0.0',
        description: 'First migration',
        up: upFn1,
      })

      manager.addMigration({
        version: '2.0.0',
        description: 'Second migration',
        up: upFn2,
      })

      const results = await manager.migrate()

      expect(results).toHaveLength(2)
      expect(results[0].version).toBe('1.0.0')
      expect(results[0].success).toBe(true)
      expect(results[1].version).toBe('2.0.0')
      expect(results[1].success).toBe(true)
      expect(upFn1).toHaveBeenCalledWith(adapter)
      expect(upFn2).toHaveBeenCalledWith(adapter)
    })

    it('should skip already applied migrations', async () => {
      const upFn = vi.fn()

      // Simulate existing migration history
      await adapter.set('__migrations__', [
        {
          version: '1.0.0',
          appliedAt: Date.now(),
          executionTime: 100,
          description: 'Already applied',
        },
      ])

      manager.addMigration({
        version: '1.0.0',
        description: 'Already applied',
        up: upFn,
      })

      manager.addMigration({
        version: '2.0.0',
        description: 'New migration',
        up: vi.fn(),
      })

      const results = await manager.migrate()

      expect(results).toHaveLength(1)
      expect(results[0].version).toBe('2.0.0')
      expect(upFn).not.toHaveBeenCalled()
    })

    it('should handle migration failures', async () => {
      const errorMessage = 'Migration failed'
      const upFn1 = vi.fn()
      const upFn2 = vi.fn().mockRejectedValue(new Error(errorMessage))
      const upFn3 = vi.fn()

      manager.addMigration({
        version: '1.0.0',
        description: 'Success migration',
        up: upFn1,
      })

      manager.addMigration({
        version: '2.0.0',
        description: 'Failing migration',
        up: upFn2,
      })

      manager.addMigration({
        version: '3.0.0',
        description: 'Should not run',
        up: upFn3,
      })

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation()
      const results = await manager.migrate()

      expect(results).toHaveLength(2)
      expect(results[0].success).toBe(true)
      expect(results[1].success).toBe(false)
      expect(results[1].error).toBe(errorMessage)
      expect(upFn3).not.toHaveBeenCalled()
      expect(consoleSpy).toHaveBeenCalledWith(
        'Migration 2.0.0 failed:',
        errorMessage
      )

      consoleSpy.mockRestore()
    })

    it('should save migration history after execution', async () => {
      manager.addMigration({
        version: '1.0.0',
        description: 'Test migration',
        up: vi.fn(),
      })

      await manager.migrate()

      expect(adapter.set).toHaveBeenCalledWith(
        '__migrations__',
        expect.arrayContaining([
          expect.objectContaining({
            version: '1.0.0',
            description: 'Test migration',
            appliedAt: expect.any(Number),
            executionTime: expect.any(Number),
          }),
        ])
      )
    })

    it('should track execution time', async () => {
      const delay = 50
      const upFn = vi.fn(async () => {
        await new Promise((resolve) => setTimeout(resolve, delay))
      })

      manager.addMigration({
        version: '1.0.0',
        description: 'Slow migration',
        up: upFn,
      })

      const results = await manager.migrate()

      expect(results[0].executionTime).toBeGreaterThanOrEqual(delay - 10)
      expect(results[0].executedAt).toBeGreaterThan(0)
    })
  })

  describe('dependency resolution', () => {
    it('should execute migrations in dependency order', async () => {
      const executionOrder: string[] = []

      manager.addMigration({
        version: '3.0.0',
        description: 'Third',
        dependencies: ['2.0.0'],
        up: async () => {
          executionOrder.push('3.0.0')
        },
      })

      manager.addMigration({
        version: '1.0.0',
        description: 'First',
        up: async () => {
          executionOrder.push('1.0.0')
        },
      })

      manager.addMigration({
        version: '2.0.0',
        description: 'Second',
        dependencies: ['1.0.0'],
        up: async () => {
          executionOrder.push('2.0.0')
        },
      })

      await manager.migrate()

      expect(executionOrder).toEqual(['1.0.0', '2.0.0', '3.0.0'])
    })

    it('should detect circular dependencies', async () => {
      manager.addMigration({
        version: '1.0.0',
        description: 'First',
        dependencies: ['2.0.0'],
        up: vi.fn(),
      })

      manager.addMigration({
        version: '2.0.0',
        description: 'Second',
        dependencies: ['1.0.0'],
        up: vi.fn(),
      })

      await expect(manager.migrate()).rejects.toThrow(
        'Circular dependency detected'
      )
    })

    it('should handle complex dependency chains', async () => {
      const executionOrder: string[] = []

      // Create a complex dependency graph
      manager.addMigration({
        version: '1.0.0',
        description: 'Base',
        up: async () => executionOrder.push('1.0.0'),
      })

      manager.addMigration({
        version: '2.0.0',
        description: 'Feature A',
        dependencies: ['1.0.0'],
        up: async () => executionOrder.push('2.0.0'),
      })

      manager.addMigration({
        version: '2.1.0',
        description: 'Feature B',
        dependencies: ['1.0.0'],
        up: async () => executionOrder.push('2.1.0'),
      })

      manager.addMigration({
        version: '3.0.0',
        description: 'Combined',
        dependencies: ['2.0.0', '2.1.0'],
        up: async () => executionOrder.push('3.0.0'),
      })

      await manager.migrate()

      // 1.0.0 must come first
      expect(executionOrder[0]).toBe('1.0.0')
      // 3.0.0 must come last
      expect(executionOrder[executionOrder.length - 1]).toBe('3.0.0')
      // 2.0.0 and 2.1.0 must come before 3.0.0
      const index2_0 = executionOrder.indexOf('2.0.0')
      const index2_1 = executionOrder.indexOf('2.1.0')
      const index3_0 = executionOrder.indexOf('3.0.0')
      expect(index2_0).toBeLessThan(index3_0)
      expect(index2_1).toBeLessThan(index3_0)
    })
  })

  describe('rollback', () => {
    beforeEach(async () => {
      // Set up some applied migrations
      await adapter.set('__migrations__', [
        {
          version: '1.0.0',
          appliedAt: Date.now() - 3000,
          executionTime: 100,
          description: 'First',
        },
        {
          version: '2.0.0',
          appliedAt: Date.now() - 2000,
          executionTime: 100,
          description: 'Second',
        },
        {
          version: '3.0.0',
          appliedAt: Date.now() - 1000,
          executionTime: 100,
          description: 'Third',
        },
      ])
    })

    it('should rollback to specified version', async () => {
      const downFn2 = vi.fn()
      const downFn3 = vi.fn()

      manager.addMigration({
        version: '1.0.0',
        description: 'First',
        up: vi.fn(),
        down: vi.fn(),
      })

      manager.addMigration({
        version: '2.0.0',
        description: 'Second',
        up: vi.fn(),
        down: downFn2,
      })

      manager.addMigration({
        version: '3.0.0',
        description: 'Third',
        up: vi.fn(),
        down: downFn3,
      })

      const results = await manager.rollback('1.0.0')

      expect(results).toHaveLength(2)
      expect(results[0].version).toBe('3.0.0')
      expect(results[1].version).toBe('2.0.0')
      expect(downFn3).toHaveBeenCalledWith(adapter)
      expect(downFn2).toHaveBeenCalledWith(adapter)
    })

    it('should throw error for non-reversible migrations', async () => {
      // Add all migrations referenced in history
      manager.addMigration({
        version: '1.0.0',
        description: 'First',
        up: vi.fn(),
        down: vi.fn(),
      })

      manager.addMigration({
        version: '2.0.0',
        description: 'Second',
        up: vi.fn(),
        down: vi.fn(),
      })

      manager.addMigration({
        version: '3.0.0',
        description: 'Non-reversible',
        up: vi.fn(),
        down: vi.fn(),
        reversible: false,
      })

      await expect(manager.rollback('1.0.0')).rejects.toThrow(
        'Cannot rollback migration 3.0.0: not reversible'
      )
    })

    it('should throw error for migrations without down function', async () => {
      // Add all migrations referenced in history
      manager.addMigration({
        version: '1.0.0',
        description: 'First',
        up: vi.fn(),
        down: vi.fn(),
      })

      manager.addMigration({
        version: '2.0.0',
        description: 'Second',
        up: vi.fn(),
        down: vi.fn(),
      })

      manager.addMigration({
        version: '3.0.0',
        description: 'No down function',
        up: vi.fn(),
        // No down function
      })

      await expect(manager.rollback('1.0.0')).rejects.toThrow(
        'Cannot rollback migration 3.0.0: not reversible'
      )
    })

    it('should handle rollback failures', async () => {
      const errorMessage = 'Rollback failed'
      const downFn = vi.fn().mockRejectedValue(new Error(errorMessage))

      // Add all migrations that are in history
      manager.addMigration({
        version: '1.0.0',
        description: 'First',
        up: vi.fn(),
        down: vi.fn(),
      })

      manager.addMigration({
        version: '2.0.0',
        description: 'Failing rollback',
        up: vi.fn(),
        down: downFn,
      })

      manager.addMigration({
        version: '3.0.0',
        description: 'Third',
        up: vi.fn(),
        down: vi.fn(),
      })

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation()
      const results = await manager.rollback('1.0.0')

      // Should rollback 3.0.0 successfully, then fail on 2.0.0
      expect(results).toHaveLength(2)
      expect(results[0].version).toBe('3.0.0')
      expect(results[0].success).toBe(true)
      expect(results[1].version).toBe('2.0.0')
      expect(results[1].success).toBe(false)
      expect(results[1].error).toBe(errorMessage)
      expect(consoleSpy).toHaveBeenCalledWith(
        'Rollback 2.0.0 failed:',
        errorMessage
      )

      consoleSpy.mockRestore()
    })

    it('should update history after successful rollback', async () => {
      manager.addMigration({
        version: '1.0.0',
        description: 'First',
        up: vi.fn(),
        down: vi.fn(),
      })

      manager.addMigration({
        version: '2.0.0',
        description: 'Second',
        up: vi.fn(),
        down: vi.fn(),
      })

      manager.addMigration({
        version: '3.0.0',
        description: 'Third',
        up: vi.fn(),
        down: vi.fn(),
      })

      await manager.rollback('1.0.0')

      const history = await manager.getHistory()
      expect(history).toHaveLength(1)
      expect(history[0].version).toBe('1.0.0')
    })
  })

  describe('version comparison', () => {
    it('should compare semantic versions correctly', () => {
      // Access private method through reflection for testing
      // @ts-expect-error - accessing private method for testing
      const compareVersions = manager.compareVersions.bind(manager)

      expect(compareVersions('1.0.0', '1.0.0')).toBe(0)
      expect(compareVersions('1.0.0', '2.0.0')).toBe(-1)
      expect(compareVersions('2.0.0', '1.0.0')).toBe(1)
      expect(compareVersions('1.0.0', '1.1.0')).toBe(-1)
      expect(compareVersions('1.1.0', '1.0.0')).toBe(1)
      expect(compareVersions('1.0.0', '1.0.1')).toBe(-1)
      expect(compareVersions('1.0.1', '1.0.0')).toBe(1)
    })

    it('should handle versions with different segment counts', () => {
      // @ts-expect-error - accessing private method for testing
      const compareVersions = manager.compareVersions.bind(manager)

      expect(compareVersions('1', '1.0.0')).toBe(0)
      expect(compareVersions('1.0', '1.0.0')).toBe(0)
      expect(compareVersions('1.0.0', '1')).toBe(0)
      expect(compareVersions('2', '1.9.9')).toBe(1)
      expect(compareVersions('1.9', '2.0')).toBe(-1)
    })
  })

  describe('getHistory', () => {
    it('should return migration history', async () => {
      const historyData = [
        {
          version: '1.0.0',
          appliedAt: Date.now(),
          executionTime: 100,
          description: 'Test migration',
        },
      ]

      await adapter.set('__migrations__', historyData)

      const history = await manager.getHistory()
      expect(history).toEqual(historyData)
    })

    it('should return empty array when no history exists', async () => {
      const history = await manager.getHistory()
      expect(history).toEqual([])
    })

    it('should return a copy of history array', async () => {
      const historyData = [
        {
          version: '1.0.0',
          appliedAt: Date.now(),
          executionTime: 100,
          description: 'Test',
        },
      ]

      await adapter.set('__migrations__', historyData)

      const history1 = await manager.getHistory()
      const history2 = await manager.getHistory()

      expect(history1).not.toBe(history2) // Different array instances
      expect(history1).toEqual(history2) // Same content
    })
  })

  describe('getPendingMigrations', () => {
    it('should return pending migration versions', async () => {
      await adapter.set('__migrations__', [
        {
          version: '1.0.0',
          appliedAt: Date.now(),
          executionTime: 100,
          description: 'Applied',
        },
      ])

      manager.addMigration({
        version: '1.0.0',
        description: 'Applied',
        up: vi.fn(),
      })

      manager.addMigration({
        version: '2.0.0',
        description: 'Pending',
        up: vi.fn(),
      })

      manager.addMigration({
        version: '3.0.0',
        description: 'Also pending',
        up: vi.fn(),
      })

      const pending = await manager.getPendingMigrations()
      expect(pending).toEqual(['2.0.0', '3.0.0'])
    })

    it('should return all migrations when none are applied', async () => {
      manager.addMigration({
        version: '1.0.0',
        description: 'First',
        up: vi.fn(),
      })

      manager.addMigration({
        version: '2.0.0',
        description: 'Second',
        up: vi.fn(),
      })

      const pending = await manager.getPendingMigrations()
      expect(pending).toEqual(['1.0.0', '2.0.0'])
    })

    it('should return empty array when all migrations are applied', async () => {
      await adapter.set('__migrations__', [
        {
          version: '1.0.0',
          appliedAt: Date.now(),
          executionTime: 100,
          description: 'Applied',
        },
      ])

      manager.addMigration({
        version: '1.0.0',
        description: 'Applied',
        up: vi.fn(),
      })

      const pending = await manager.getPendingMigrations()
      expect(pending).toEqual([])
    })
  })

  describe('error handling', () => {
    it('should handle storage errors gracefully', async () => {
      vi.mocked(adapter.get).mockRejectedValueOnce(new Error('Storage error'))

      // Should not throw, just start with empty history
      const history = await manager.getHistory()
      expect(history).toEqual([])
    })

    it('should handle non-Error objects in migration failures', async () => {
      manager.addMigration({
        version: '1.0.0',
        description: 'Throwing non-error',
        up: async () => {
          throw new Error('String error')
        },
      })

      const results = await manager.migrate()
      expect(results[0].success).toBe(false)
      expect(results[0].error).toBe('String error')
    })

    it('should handle non-Error objects in rollback failures', async () => {
      await adapter.set('__migrations__', [
        {
          version: '1.0.0',
          appliedAt: Date.now(),
          executionTime: 100,
          description: 'Test',
        },
      ])

      manager.addMigration({
        version: '1.0.0',
        description: 'Test',
        up: vi.fn(),
        down: async () => {
          throw new Error('String error')
        },
      })

      const results = await manager.rollback('0.0.0')
      expect(results[0].success).toBe(false)
      expect(results[0].error).toBe('String error')
    })
  })
})
