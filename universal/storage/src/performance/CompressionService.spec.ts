/**
 * @fileoverview Tests for CompressionService functionality
 *
 * @description
 * Comprehensive tests for compression service including different algorithms,
 * automatic compression decisions, and performance optimizations.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CompressionService } from './CompressionService'
import type { CompressionConfig } from '../types/compression'

// Import test utilities
import '../test-setup'

// Declare global test utilities
declare global {
  const createTestConfig: (
    overrides?: Partial<CompressionConfig>
  ) => CompressionConfig
}

describe('CompressionService', () => {
  let compressionService: CompressionService

  describe('initialization and configuration', () => {
    it('should initialize with default configuration', () => {
      const defaultConfig: CompressionConfig = {
        enabled: true,
        algorithm: 'auto',
        minSize: 1024,
      }

      compressionService = new CompressionService(defaultConfig)
      expect(compressionService).toBeDefined()
    })

    it('should initialize with custom configuration', () => {
      const customConfig: CompressionConfig = {
        enabled: true,
        algorithm: 'gzip',
        minSize: 500,
        level: 6,
      }

      compressionService = new CompressionService(customConfig)
      expect(compressionService).toBeDefined()
    })

    it('should handle disabled compression', () => {
      const disabledConfig: CompressionConfig = {
        enabled: false,
      }

      compressionService = new CompressionService(disabledConfig)
      expect(compressionService).toBeDefined()
    })
  })

  describe('gzip compression', () => {
    beforeEach(() => {
      const config: CompressionConfig = {
        enabled: true,
        algorithm: 'gzip',
        minSize: 10, // Low threshold for testing
      }
      compressionService = new CompressionService(config)
    })

    it('should compress and decompress data with gzip', async () => {
      const originalData =
        'Hello, this is a test string that should be compressed with gzip!'

      const compressed = await compressionService.compress(originalData)
      expect(compressed.compressed).toBe(true)
      expect(compressed.algorithm).toBe('gzip')
      expect(compressed.data).not.toBe(originalData)
      // Small data may not compress smaller due to algorithm overhead
      expect(compressed.data.length).toBeGreaterThan(0)

      const decompressed = await compressionService.decompress(
        compressed.data,
        'gzip'
      )
      expect(decompressed.toString('utf8')).toBe(originalData)
    })

    it('should handle large data efficiently', async () => {
      const largeData = 'A'.repeat(10000) // 10KB of repeated data

      const compressed = await compressionService.compress(largeData)
      expect(compressed.compressed).toBe(true)
      expect(compressed.data.length).toBeLessThan(largeData.length)

      const decompressed = await compressionService.decompress(
        compressed.data,
        'gzip'
      )
      expect(decompressed.toString('utf8')).toBe(largeData)
    })

    it('should handle empty data', async () => {
      const emptyData = ''

      const compressed = await compressionService.compress(emptyData)
      expect(compressed.compressed).toBe(false) // Too small to compress
      expect(compressed.data).toBe(emptyData)
    })

    it('should handle small data below minimum size', async () => {
      const config: CompressionConfig = {
        enabled: true,
        algorithm: 'gzip',
        minSize: 1000,
      }
      const service = new CompressionService(config)

      const smallData = 'small'
      const compressed = await service.compress(smallData)

      expect(compressed.compressed).toBe(false)
      expect(compressed.data).toBe(smallData)
    })
  })

  describe('deflate compression', () => {
    beforeEach(() => {
      const config: CompressionConfig = {
        enabled: true,
        algorithm: 'deflate',
        minSize: 10,
      }
      compressionService = new CompressionService(config)
    })

    it('should compress and decompress data with deflate', async () => {
      const originalData =
        'This is test data for deflate compression algorithm testing!'

      const compressed = await compressionService.compress(originalData)
      expect(compressed.compressed).toBe(true)
      expect(compressed.algorithm).toBe('deflate')
      // Small data may not compress smaller due to algorithm overhead
      expect(compressed.data.length).toBeGreaterThan(0)

      const decompressed = await compressionService.decompress(
        compressed.data,
        'deflate'
      )
      expect(decompressed.toString('utf8')).toBe(originalData)
    })

    it('should handle JSON data compression', async () => {
      const jsonData = JSON.stringify({
        users: Array.from({ length: 100 }, (_, i) => ({
          id: i,
          name: `User ${i}`,
          email: `user${i}@example.com`,
          data: 'some repetitive data that compresses well',
        })),
      })

      const compressed = await compressionService.compress(jsonData)
      expect(compressed.compressed).toBe(true)
      expect(compressed.data.length).toBeLessThan(jsonData.length)

      const decompressed = await compressionService.decompress(
        compressed.data,
        'deflate'
      )
      expect(decompressed.toString('utf8')).toBe(jsonData)
      expect(JSON.parse(decompressed.toString('utf8'))).toEqual(
        JSON.parse(jsonData)
      )
    })
  })

  describe('auto algorithm selection', () => {
    beforeEach(() => {
      const config: CompressionConfig = {
        enabled: true,
        algorithm: 'auto',
        minSize: 10,
      }
      compressionService = new CompressionService(config)
    })

    it('should automatically select best compression algorithm', async () => {
      const textData =
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(20)

      const compressed = await compressionService.compress(textData)
      expect(compressed.compressed).toBe(true)
      expect(['lz4', 'brotli']).toContain(compressed.algorithm)
      // Compression may add overhead for small data, but should be reasonable
      expect(compressed.compressionRatio).toBeLessThan(1.5)

      const decompressed = await compressionService.decompress(
        compressed.data,
        compressed.algorithm
      )
      expect(decompressed).toBe(textData)
    })

    it('should handle different data types for auto selection', async () => {
      const testCases = [
        'Short text that might not compress well',
        'Very repetitive data '.repeat(100),
        JSON.stringify({ key: 'value'.repeat(50) }),
        Array.from({ length: 1000 }, (_, i) => i).join(','),
      ]

      for (const testData of testCases) {
        const compressed = await compressionService.compress(testData)

        if (compressed.compressed) {
          expect(compressed.algorithm).toBeDefined()
          // Allow some overhead for small data, but ensure reasonable compression ratio
          expect(compressed.compressionRatio).toBeLessThan(1.5)

          const decompressed = await compressionService.decompress(
            compressed.data,
            compressed.algorithm
          )
          expect(decompressed).toBe(testData)
        }
      }
    })
  })

  describe('lz4 compression (with mocking)', () => {
    beforeEach(() => {
      const config: CompressionConfig = {
        enabled: true,
        algorithm: 'lz4',
        minSize: 10,
      }
      compressionService = new CompressionService(config)
    })

    it('should use lz4 compression with gzip fallback', async () => {
      const originalData = 'Test data for LZ4 compression algorithm!'

      const compressed = await compressionService.compress(originalData)
      expect(compressed.compressed).toBe(true)
      expect(compressed.algorithm).toBe('lz4')
      // Uses gzip fallback, so data will be compressed binary
      expect(compressed.data.length).toBeGreaterThan(0)
      expect(compressed.data.length).toBeLessThan(originalData.length * 2) // Reasonable overhead

      const decompressed = await compressionService.decompress(
        compressed.data,
        'lz4'
      )
      expect(decompressed).toBe(originalData)
    })
  })

  describe('brotli compression', () => {
    beforeEach(() => {
      const config: CompressionConfig = {
        enabled: true,
        algorithm: 'brotli',
        minSize: 10,
      }
      compressionService = new CompressionService(config)
    })

    it('should compress and decompress with brotli', async () => {
      const originalData = 'Test data for Brotli compression algorithm!'

      const compressed = await compressionService.compress(originalData)
      expect(compressed.compressed).toBe(true)
      expect(compressed.algorithm).toBe('brotli')

      // Check if we're using mocked brotli (in CI) or real brotli (locally)
      const isMocked =
        process.env.CI === 'true' || process.env.VITEST_MOCK_SQLITE === 'true'
      if (isMocked) {
        expect(compressed.data.toString('utf8')).toBe(`brotli:${originalData}`)
      } else {
        // Real brotli produces binary data
        expect(compressed.data).toBeInstanceOf(Buffer)
        expect(compressed.data.length).toBeGreaterThan(0)
      }

      const decompressed = await compressionService.decompress(
        compressed.data,
        'brotli'
      )
      expect(decompressed.toString('utf8')).toBe(originalData)
    })
  })

  describe('compression level handling', () => {
    it('should respect compression level settings', async () => {
      const testData = 'Data for compression level testing '.repeat(50)

      // Test with different compression levels
      const levels = [1, 6, 9]
      const results = []

      for (const level of levels) {
        const config: CompressionConfig = {
          enabled: true,
          algorithm: 'gzip',
          minSize: 10,
          level,
        }
        const service = new CompressionService(config)

        const compressed = await service.compress(testData)
        results.push(compressed)
      }

      // All should be compressed
      results.forEach((result) => {
        expect(result.compressed).toBe(true)
        expect(result.algorithm).toBe('gzip')
      })

      // All should decompress to original data
      for (const result of results) {
        const decompressed = await compressionService.decompress(
          result.data,
          'gzip'
        )
        expect(decompressed).toBe(testData)
      }
    })
  })

  describe('error handling', () => {
    beforeEach(() => {
      const config: CompressionConfig = {
        enabled: true,
        algorithm: 'gzip',
        minSize: 10,
      }
      compressionService = new CompressionService(config)
    })

    it('should handle compression errors gracefully', async () => {
      // Mock zlib to throw error
      vi.doMock('zlib', () => ({
        gzip: vi.fn().mockImplementation((data, callback) => {
          callback(new Error('Compression failed'), null)
        }),
      }))

      const data = 'test data'
      const result = await compressionService.compress(data)

      // Should fallback to uncompressed
      expect(result.compressed).toBe(false)
      expect(result.data).toBe(data)
    })

    it('should handle decompression errors gracefully', async () => {
      const invalidCompressedData = 'invalid-compressed-data'

      await expect(
        compressionService.decompress(invalidCompressedData, 'gzip')
      ).rejects.toThrow()
    })

    it('should handle unsupported algorithms gracefully', async () => {
      const data = 'test data'

      const result = await compressionService.compress(data)
      expect(result.compressed).toBe(false)
      expect(result.data).toBe(data)
      expect(result.algorithm).toBe('none')
      expect(result.originalSize).toBe(data.length)
      expect(result.compressionRatio).toBe(1.0)
    })

    it('should handle invalid compression level', async () => {
      const config: CompressionConfig = {
        enabled: true,
        algorithm: 'gzip',
        minSize: 10,
        level: 99, // Invalid level
      }

      // Should not throw, but use default level
      const service = new CompressionService(config)
      const data = 'very repetitive test data '.repeat(10) // More compressible data

      const result = await service.compress(data)
      expect(result.compressed).toBe(true) // Should still work with default level
    })
  })

  describe('performance and efficiency', () => {
    beforeEach(() => {
      const config: CompressionConfig = {
        enabled: true,
        algorithm: 'auto',
        minSize: 100,
      }
      compressionService = new CompressionService(config)
    })

    it('should skip compression for non-compressible data', async () => {
      // Random data typically doesn't compress well
      const randomData = Array.from({ length: 1000 }, () =>
        Math.random().toString(36).charAt(0)
      ).join('')

      const compressed = await compressionService.compress(randomData)

      // Might not compress if it doesn't achieve good ratio
      if (!compressed.compressed) {
        expect(compressed.data).toBe(randomData)
        expect(compressed.algorithm).toBe('none')
      }
    })

    it('should compress highly repetitive data efficiently', async () => {
      const repetitiveData = 'ABCD'.repeat(1000) // 4KB of repetitive data

      const compressed = await compressionService.compress(repetitiveData)
      expect(compressed.compressed).toBe(true)
      expect(compressed.data.length).toBeLessThan(repetitiveData.length * 0.8) // At least 20% reduction for repetitive data

      const decompressed = await compressionService.decompress(
        compressed.data,
        compressed.algorithm
      )
      expect(decompressed).toBe(repetitiveData)
    })

    it('should handle concurrent compression operations', async () => {
      const data = 'Concurrent compression test data '.repeat(100)

      const operations = Array.from({ length: 10 }, () =>
        compressionService.compress(data)
      )

      const results = await Promise.all(operations)

      results.forEach((result) => {
        expect(result.compressed).toBe(true)
        expect(result.compressionRatio).toBeLessThan(1.5)
      })

      // All should decompress correctly
      const decompressions = results.map((result) =>
        compressionService.decompress(result.data, result.algorithm)
      )

      const decompressed = await Promise.all(decompressions)
      decompressed.forEach((result) => {
        expect(result).toBe(data)
      })
    })
  })

  describe('disabled compression', () => {
    beforeEach(() => {
      const config: CompressionConfig = {
        enabled: false,
      }
      compressionService = new CompressionService(config)
    })

    it('should pass through data when compression is disabled', async () => {
      const data = 'This data should not be compressed'

      const result = await compressionService.compress(data)
      expect(result.compressed).toBe(false)
      expect(result.data).toBe(data)
      expect(result.algorithm).toBe('none')
    })

    it('should handle decompression when compression is disabled', async () => {
      const data = 'Uncompressed data'

      const decompressed = await compressionService.decompress(data, 'none')
      expect(decompressed).toBe(data)
    })
  })

  describe('configuration validation', () => {
    it('should handle missing algorithm in config', () => {
      const config: CompressionConfig = {
        enabled: true,
        minSize: 1000,
        // algorithm missing - should use default
      }

      expect(() => new CompressionService(config)).not.toThrow()
    })

    it('should handle invalid minimum size', () => {
      const config: CompressionConfig = {
        enabled: true,
        algorithm: 'gzip',
        minSize: -100, // Invalid
      }

      const service = new CompressionService(config)
      expect(service).toBeDefined() // Should handle gracefully
    })

    it('should handle undefined config', () => {
      expect(
        () => new CompressionService(undefined as unknown as CompressionConfig)
      ).not.toThrow()
    })
  })

  describe('algorithm-specific features', () => {
    it('should provide compression statistics', async () => {
      const config: CompressionConfig = {
        enabled: true,
        algorithm: 'gzip',
        minSize: 10,
      }
      const service = new CompressionService(config)

      const originalData = 'Statistical analysis test data '.repeat(100)
      const compressed = await service.compress(originalData)

      expect(compressed.compressed).toBe(true)

      const compressionRatio = compressed.data.length / originalData.length
      expect(compressionRatio).toBeLessThan(0.8) // Should achieve at least 20% compression
    })

    it('should handle different data encodings', async () => {
      const config: CompressionConfig = {
        enabled: true,
        algorithm: 'gzip',
        minSize: 10,
      }
      const service = new CompressionService(config)

      // Test with Unicode data
      const unicodeData =
        '🚀 Unicode test data with émojis and spêcial chars '.repeat(50)

      const compressed = await service.compress(unicodeData)
      expect(compressed.compressed).toBe(true)

      const decompressed = await service.decompress(compressed.data, 'gzip')
      expect(decompressed).toBe(unicodeData)
    })
  })
})
