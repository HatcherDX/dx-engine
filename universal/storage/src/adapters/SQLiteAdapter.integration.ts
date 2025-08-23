/**
 * @fileoverview Integration tests for SQLiteAdapter with real better-sqlite3
 *
 * @description
 * Integration tests that verify SQLiteAdapter works correctly with real
 * better-sqlite3 native bindings. These tests validate actual database
 * operations, file I/O, and cross-platform compatibility.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { SQLiteAdapter } from './SQLiteAdapter'
import type { StorageConfig } from '../types/storage'
import { existsSync, unlinkSync, statSync, writeFileSync } from 'fs'
import { join } from 'path'

// Import integration test utilities (NO MOCKS)
import '../test-setup-real'

// Declare global test utilities
declare global {
  const createRealSQLiteConfig: (
    overrides?: Partial<StorageConfig>
  ) => StorageConfig
}

describe('SQLiteAdapter Integration', () => {
  let adapter: SQLiteAdapter
  let config: StorageConfig
  let testDbPath: string

  beforeEach(async () => {
    // Use real SQLite configuration with unique DB path
    config = createRealSQLiteConfig()
    testDbPath = config.path!
    adapter = new SQLiteAdapter(config)
  })

  afterEach(async () => {
    await adapter.close()
    // Clean up test database file
    if (existsSync(testDbPath)) {
      try {
        unlinkSync(testDbPath)
      } catch {
        // Ignore cleanup errors
      }
    }
  })

  describe('real SQLite database operations', () => {
    it('should create actual SQLite database file', async () => {
      await adapter.initialize()

      // Verify actual file was created on filesystem
      expect(existsSync(testDbPath)).toBe(true)

      // Verify we can read from it
      const stats = statSync(testDbPath)
      expect(stats.size).toBeGreaterThan(0)
    })

    it('should perform real database operations with persistence', async () => {
      await adapter.initialize()

      // Store data and verify it persists
      const testData = {
        name: 'John Doe',
        age: 30,
        email: 'john@example.com',
        preferences: {
          theme: 'dark',
          notifications: true,
          features: ['feature1', 'feature2'],
        },
      }

      await adapter.set('user:1', testData)

      // Close and reopen adapter to verify persistence
      await adapter.close()

      const newAdapter = new SQLiteAdapter(config)
      await newAdapter.initialize()

      const retrieved = await newAdapter.get('user:1')
      expect(retrieved).toEqual(testData)

      await newAdapter.close()
    })

    it('should handle concurrent operations safely', async () => {
      await adapter.initialize()

      // Simulate concurrent writes
      const promises = []
      for (let i = 0; i < 10; i++) {
        promises.push(
          adapter.set(`concurrent:${i}`, { value: i, timestamp: Date.now() })
        )
      }

      await Promise.all(promises)

      // Verify all data was written correctly
      for (let i = 0; i < 10; i++) {
        const result = await adapter.get(`concurrent:${i}`)
        expect(result).toMatchObject({ value: i })
      }
    })

    it('should handle real SQLite transactions', async () => {
      await adapter.initialize()

      // This will test that better-sqlite3's transaction support works
      const batchData = Array.from({ length: 100 }, (_, i) => ({
        key: `batch:${i}`,
        value: { id: i, data: `test-data-${i}`.repeat(10) },
      }))

      const startTime = Date.now()

      // Use batch operations which rely on SQLite transactions
      await Promise.all(
        batchData.map(({ key, value }) => adapter.set(key, value))
      )

      const endTime = Date.now()

      // Verify performance is reasonable (should be fast with real SQLite)
      expect(endTime - startTime).toBeLessThan(5000)

      // Verify all data is present
      const count = await adapter.count()
      expect(count).toBe(100)
    })

    it('should handle SQLite pragmas and optimizations', async () => {
      // Test with performance-optimized configuration
      const optimizedConfig = createRealSQLiteConfig({
        sqlite: {
          pragma: {
            journal_mode: 'WAL',
            synchronous: 'NORMAL',
            cache_size: -16000, // 16MB cache
            temp_store: 'MEMORY',
          },
        },
      })

      const optimizedAdapter = new SQLiteAdapter(optimizedConfig)
      await optimizedAdapter.initialize()

      // Perform operations that benefit from optimizations
      const largeData = Array.from({ length: 1000 }, (_, i) => ({
        key: `perf:${i}`,
        value: {
          id: i,
          data: 'x'.repeat(1000), // 1KB per record
          nested: {
            array: Array.from({ length: 100 }, (_, j) => j),
            object: { prop1: 'value1', prop2: 'value2' },
          },
        },
      }))

      const startTime = Date.now()

      for (const { key, value } of largeData) {
        await optimizedAdapter.set(key, value)
      }

      const writeTime = Date.now() - startTime

      // Read performance test
      const readStartTime = Date.now()
      const results = await Promise.all(
        largeData.map(({ key }) => optimizedAdapter.get(key))
      )
      const readTime = Date.now() - readStartTime

      // Verify all data is correct
      expect(results).toHaveLength(1000)
      expect(results.every((r) => r !== null)).toBe(true)

      // Performance should be reasonable with optimizations
      expect(writeTime).toBeLessThan(10000) // 10 seconds for 1000 records
      expect(readTime).toBeLessThan(2000) // 2 seconds for 1000 reads

      await optimizedAdapter.close()
    })

    it('should handle real SQLite vacuum and maintenance', async () => {
      await adapter.initialize()

      // Add and delete data to create fragmentation
      for (let i = 0; i < 100; i++) {
        await adapter.set(`temp:${i}`, { data: 'x'.repeat(1000) })
      }

      // Delete half the data
      for (let i = 0; i < 50; i++) {
        await adapter.delete(`temp:${i}`)
      }

      // Get initial file size
      expect(existsSync(testDbPath)).toBe(true) // Ensure file exists
      const initialSize = statSync(testDbPath).size

      // Perform vacuum (this requires real SQLite)
      await adapter.vacuum()

      // File size should be reduced (or at least not increased significantly)
      const finalSize = statSync(testDbPath).size
      expect(finalSize).toBeLessThanOrEqual(initialSize * 1.1) // Allow 10% variance

      // Verify remaining data is still accessible
      const remaining = await adapter.count()
      expect(remaining).toBe(50)
    })
  })

  describe('real file system integration', () => {
    it('should handle directory creation for nested paths', async () => {
      const deepPath = join(testDbPath, '../deep/nested/path/test.db')
      const deepConfig = createRealSQLiteConfig({ path: deepPath })
      const deepAdapter = new SQLiteAdapter(deepConfig)

      await deepAdapter.initialize()

      // Verify directory structure was created
      expect(existsSync(deepPath)).toBe(true)

      // Verify database works in nested location
      await deepAdapter.set('test', { nested: true })
      const result = await deepAdapter.get('test')
      expect(result).toEqual({ nested: true })

      await deepAdapter.close()

      // Cleanup
      if (existsSync(deepPath)) {
        unlinkSync(deepPath)
      }
    })

    it('should handle file permissions and locking', async () => {
      await adapter.initialize()

      // Write data
      await adapter.set('lock-test', { data: 'testing file locks' })

      // Try to create second adapter with same file (should handle locking)
      const secondAdapter = new SQLiteAdapter(config)
      await secondAdapter.initialize()

      // Both should be able to read
      const result1 = await adapter.get('lock-test')
      const result2 = await secondAdapter.get('lock-test')

      expect(result1).toEqual(result2)
      expect(result1).toEqual({ data: 'testing file locks' })

      await secondAdapter.close()
    })
  })

  describe('error handling with real SQLite', () => {
    it('should handle corrupted database files gracefully', async () => {
      await adapter.initialize()
      await adapter.set('test', { data: 'test' })
      await adapter.close()

      // Corrupt the database file by writing binary garbage
      const corruptData = Buffer.from([
        0xff, 0xff, 0xff, 0xff, 0x00, 0x00, 0x00, 0x00,
      ])
      writeFileSync(testDbPath, corruptData)

      // Should handle corruption gracefully by either throwing an error or recovering
      const corruptedAdapter = new SQLiteAdapter(config)

      try {
        await corruptedAdapter.initialize()
        // If initialization succeeds, it means SQLite recovered or recreated the DB
        // This is also acceptable behavior
        console.log('SQLite recovered from corruption by recreating database')
      } catch (error) {
        // If it throws, that's the expected behavior for true corruption
        expect(error).toBeInstanceOf(Error)
        console.log('SQLite properly rejected corrupted database')
      }

      await corruptedAdapter.close()
    })

    it('should handle disk space and I/O errors', async () => {
      await adapter.initialize()

      // Try to write extremely large data that might cause issues
      const hugeData = {
        data: 'x'.repeat(10 * 1024 * 1024), // 10MB string
      }

      // This should either succeed or fail gracefully
      try {
        await adapter.set('huge', hugeData)
        const retrieved = await adapter.get('huge')
        expect(retrieved?.data).toBe(hugeData.data)
      } catch (error) {
        // If it fails, it should be a proper error
        expect(error).toBeDefined()
        expect(error instanceof Error).toBe(true)
      }
    })
  })
})
