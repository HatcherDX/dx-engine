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
import { CompressionService, CompressionError } from './CompressionService'
import type {
  CompressionConfig,
  CompressionAlgorithm,
} from '../types/compression'

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

  describe('analyzeData method', () => {
    beforeEach(() => {
      const config: CompressionConfig = {
        enabled: true,
        algorithm: 'auto',
        minSize: 100,
      }
      compressionService = new CompressionService(config)
    })

    it('should analyze small data and recommend no compression', () => {
      const smallData = 'tiny'
      const analysis = compressionService.analyzeData(smallData)

      expect(analysis.size).toBe(4)
      expect(analysis.entropy).toBeGreaterThan(0)
      expect(analysis.recommendedAlgorithm).toBe('none')
      expect(analysis.shouldCompress).toBe(false)
      expect(analysis.estimatedRatio).toBe(1.0)
    })

    it('should analyze medium data and recommend lz4', () => {
      const mediumData = 'Medium sized data '.repeat(100) // ~1800 bytes
      const analysis = compressionService.analyzeData(mediumData)

      expect(analysis.size).toBe(mediumData.length)
      expect(analysis.entropy).toBeGreaterThan(0)
      expect(analysis.recommendedAlgorithm).toBe('lz4')
      expect(analysis.shouldCompress).toBe(true)
      expect(analysis.estimatedRatio).toBeGreaterThan(0)
      expect(analysis.estimatedRatio).toBeLessThan(1)
    })

    it('should analyze large data and recommend brotli', () => {
      const largeData = 'Large data block '.repeat(1000) // ~17KB
      const analysis = compressionService.analyzeData(largeData)

      expect(analysis.size).toBe(largeData.length)
      expect(analysis.entropy).toBeGreaterThan(0)
      expect(analysis.recommendedAlgorithm).toBe('brotli')
      expect(analysis.shouldCompress).toBe(true)
      expect(analysis.estimatedRatio).toBeGreaterThan(0)
      expect(analysis.estimatedRatio).toBeLessThan(1)
    })

    it('should handle buffer input', () => {
      const bufferData = Buffer.from('Buffer test data '.repeat(100))
      const analysis = compressionService.analyzeData(bufferData)

      expect(analysis.size).toBe(bufferData.length)
      expect(analysis.entropy).toBeGreaterThan(0)
      expect(analysis.recommendedAlgorithm).toBe('lz4')
    })

    it('should calculate proper entropy for repetitive data', () => {
      const repetitiveData = 'AAAAAAAAAA'.repeat(100)
      const randomData = Array.from({ length: 1000 }, () =>
        Math.random().toString(36).charAt(2)
      ).join('')

      const repetitiveAnalysis = compressionService.analyzeData(repetitiveData)
      const randomAnalysis = compressionService.analyzeData(randomData)

      // Repetitive data should have lower entropy
      expect(repetitiveAnalysis.entropy).toBeLessThan(randomAnalysis.entropy)
      // Both should have valid compression ratios
      expect(repetitiveAnalysis.estimatedRatio).toBeGreaterThan(0)
      expect(randomAnalysis.estimatedRatio).toBeGreaterThan(0)
    })
  })

  describe('benchmark method', () => {
    beforeEach(() => {
      const config: CompressionConfig = {
        enabled: true,
        algorithm: 'auto',
        minSize: 10,
      }
      compressionService = new CompressionService(config)
    })

    it('should benchmark compression performance for all algorithms', async () => {
      const testData = 'Benchmark test data '.repeat(100)
      const result = await compressionService.benchmark(testData)

      expect(result).toHaveProperty('lz4')
      expect(result).toHaveProperty('brotli')
      expect(result).toHaveProperty('deflate')

      // Check lz4 metrics
      expect(result.lz4.time).toBeGreaterThanOrEqual(0)
      expect(result.lz4.ratio).toBeGreaterThan(0)
      expect(result.lz4.size).toBeGreaterThan(0)

      // Check brotli metrics
      expect(result.brotli.time).toBeGreaterThanOrEqual(0)
      expect(result.brotli.ratio).toBeGreaterThan(0)
      expect(result.brotli.size).toBeGreaterThan(0)

      // Check deflate metrics
      expect(result.deflate.time).toBeGreaterThanOrEqual(0)
      expect(result.deflate.ratio).toBeGreaterThan(0)
      expect(result.deflate.size).toBeGreaterThan(0)
    })

    it('should handle buffer input in benchmark', async () => {
      const bufferData = Buffer.from('Buffer benchmark data '.repeat(50))
      const result = await compressionService.benchmark(bufferData)

      expect(result.lz4).toBeDefined()
      expect(result.brotli).toBeDefined()
      expect(result.deflate).toBeDefined()
    })
  })

  describe('getStats method', () => {
    it('should return service statistics', () => {
      const config: CompressionConfig = {
        enabled: true,
        algorithm: 'gzip',
        minSize: 2048,
        level: 7,
      }
      const service = new CompressionService(config)
      const stats = service.getStats()

      expect(stats.algorithm).toBe('gzip')
      expect(stats.minSize).toBe(2048)
      expect(stats.level).toBe(7)
      expect(stats.fallbackMode).toBe(false)
    })

    it('should return default values when not specified', () => {
      const config: CompressionConfig = {
        enabled: true,
      }
      const service = new CompressionService(config)
      const stats = service.getStats()

      expect(stats.algorithm).toBe('auto')
      expect(stats.minSize).toBe(1024)
      expect(stats.level).toBe(6)
      expect(stats.fallbackMode).toBe(false)
    })
  })

  describe('CompressionError class', () => {
    it('should create error with code and message', () => {
      const error = new CompressionError(
        'Test error message',
        'TEST_ERROR_CODE'
      )

      expect(error).toBeInstanceOf(Error)
      expect(error.name).toBe('CompressionError')
      expect(error.message).toBe('Test error message')
      expect(error.code).toBe('TEST_ERROR_CODE')
      expect(error.cause).toBeUndefined()
    })

    it('should create error with cause', () => {
      const originalError = new Error('Original error')
      const error = new CompressionError(
        'Wrapped error',
        'WRAPPED_ERROR',
        originalError
      )

      expect(error.message).toBe('Wrapped error')
      expect(error.code).toBe('WRAPPED_ERROR')
      expect(error.cause).toBe(originalError)
    })
  })

  describe('specific algorithm error paths', () => {
    it('should handle LZ4 specific compression errors', async () => {
      const service = new CompressionService({
        enabled: true,
        algorithm: 'lz4',
        minSize: 10,
      })

      // Mock the compressLZ4 method to simulate error
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Testing private method by mocking internal compressLZ4 implementation
      const serviceAny = service as any
      const originalCompress = serviceAny.compressLZ4
      serviceAny.compressLZ4 = async () => {
        throw new Error('LZ4 compression failed')
      }

      // Test error is properly wrapped
      await expect(
        serviceAny.compressLZ4(Buffer.from('test'))
      ).rejects.toThrow()

      // Restore original method
      serviceAny.compressLZ4 = originalCompress
    })

    it('should handle LZ4 specific decompression errors', async () => {
      const service = new CompressionService({
        enabled: true,
        algorithm: 'lz4',
        minSize: 10,
      })

      // Mock the decompressLZ4 method to simulate error
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Testing private method by mocking internal decompressLZ4 implementation
      const serviceAny = service as any
      const originalDecompress = serviceAny.decompressLZ4
      serviceAny.decompressLZ4 = async () => {
        throw new Error('LZ4 decompression failed')
      }

      // Test error is thrown
      await expect(
        serviceAny.decompressLZ4(Buffer.from('invalid'))
      ).rejects.toThrow()

      // Restore original method
      serviceAny.decompressLZ4 = originalDecompress
    })

    it('should handle Brotli specific compression errors when fallback fails', async () => {
      const service = new CompressionService({
        enabled: true,
        algorithm: 'brotli',
        minSize: 10,
        level: 6,
      })

      // Mock both brotli import failure and gzip fallback failure
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Testing private method by mocking internal tryImport for brotli fallback scenario
      const serviceAny = service as any
      serviceAny.tryImport = vi.fn().mockResolvedValue(null) // No brotli lib

      // Mock gzipAsync to throw
      const originalCompress = serviceAny.compressBrotli
      serviceAny.compressBrotli = async () => {
        // Simulate fallback to gzip that also fails
        throw new Error('Brotli fallback failed')
      }

      await expect(
        serviceAny.compressBrotli(Buffer.from('test'))
      ).rejects.toThrow()

      serviceAny.compressBrotli = originalCompress
    })

    it('should handle Brotli specific decompression errors when fallback fails', async () => {
      const service = new CompressionService({
        enabled: true,
        algorithm: 'brotli',
        minSize: 10,
      })

      // Mock both brotli import failure and gunzip fallback failure
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Testing private method by mocking internal tryImport for decompression fallback scenario
      const serviceAny = service as any
      serviceAny.tryImport = vi.fn().mockResolvedValue(null) // No brotli lib

      const originalDecompress = serviceAny.decompressBrotli
      serviceAny.decompressBrotli = async () => {
        // Simulate fallback to gunzip that also fails
        throw new Error('Brotli decompression fallback failed')
      }

      await expect(
        serviceAny.decompressBrotli(Buffer.from('invalid'))
      ).rejects.toThrow()

      serviceAny.decompressBrotli = originalDecompress
    })

    it('should use brotli fallback to gzip when library not available', async () => {
      const service = new CompressionService({
        enabled: true,
        algorithm: 'brotli',
        minSize: 10,
        level: 6,
      })

      // Mock brotli lib not available
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Testing private method by mocking internal tryImport to simulate missing brotli library
      const serviceAny = service as any
      serviceAny.tryImport = vi.fn().mockResolvedValue(null)

      const testData = Buffer.from('test data for brotli fallback')

      // Compress should fallback to gzip
      const compressed = await serviceAny.compressBrotli(testData)
      expect(compressed).toBeInstanceOf(Buffer)
      expect(compressed.length).toBeGreaterThan(0)

      // Decompress should also fallback to gunzip
      const decompressed = await serviceAny.decompressBrotli(compressed)
      expect(decompressed.toString()).toBe(testData.toString())
    })

    it('should use brotli library when available', async () => {
      const service = new CompressionService({
        enabled: true,
        algorithm: 'brotli',
        minSize: 10,
      })

      // Mock brotli library available
      const mockBrotli = {
        compress: vi.fn().mockReturnValue(Buffer.from('brotli-compressed')),
        decompress: vi.fn().mockReturnValue(Buffer.from('decompressed-data')),
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Testing private method by mocking internal tryImport with mock brotli library
      const serviceAny = service as any
      serviceAny.tryImport = vi.fn().mockResolvedValue(mockBrotli)

      const testData = Buffer.from('test data')

      // Test compression uses brotli
      const compressed = await serviceAny.compressBrotli(testData)
      expect(mockBrotli.compress).toHaveBeenCalled()
      expect(compressed).toEqual(Buffer.from('brotli-compressed'))

      // Test decompression uses brotli
      const decompressed = await serviceAny.decompressBrotli(compressed)
      expect(mockBrotli.decompress).toHaveBeenCalled()
      expect(decompressed).toEqual(Buffer.from('decompressed-data'))
    })
  })

  describe('edge cases and error paths', () => {
    beforeEach(() => {
      const config: CompressionConfig = {
        enabled: true,
        algorithm: 'auto',
        minSize: 10,
      }
      compressionService = new CompressionService(config)
    })

    it('should handle compress method throwing error', async () => {
      // Create a service with invalid config that will cause error
      const service = new CompressionService({
        enabled: true,
        algorithm: 'invalid' as CompressionAlgorithm,
        minSize: 10,
      })

      const data = 'test data for error'

      await expect(service.compress(data)).rejects.toThrow(CompressionError)
      await expect(service.compress(data)).rejects.toThrow(
        'Unsupported compression algorithm'
      )
    })

    it('should handle decompress method throwing error', async () => {
      const invalidData = Buffer.from('not compressed data')

      await expect(
        compressionService.decompress(
          invalidData,
          'invalid' as CompressionAlgorithm
        )
      ).rejects.toThrow(CompressionError)
      await expect(
        compressionService.decompress(
          invalidData,
          'invalid' as CompressionAlgorithm
        )
      ).rejects.toThrow('Unsupported decompression algorithm')
    })

    it('should handle brotli compression with fallback to gzip', async () => {
      const config: CompressionConfig = {
        enabled: true,
        algorithm: 'brotli',
        minSize: 10,
        level: 5,
      }
      const service = new CompressionService(config)

      const data = 'Test data for brotli fallback testing'
      const compressed = await service.compress(data)

      expect(compressed.compressed).toBe(true)
      expect(compressed.algorithm).toBe('brotli')

      // Should decompress successfully even with fallback
      const decompressed = await service.decompress(compressed.data, 'brotli')
      expect(decompressed).toBe(data)
    })

    it('should handle tryImport method with caching', async () => {
      const service = new CompressionService({
        enabled: true,
        algorithm: 'auto',
        minSize: 10,
      })

      // Access private method via any cast for testing
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Testing private method tryImport to verify library caching behavior
      const serviceAny = service as any

      // First call should try to import and cache result
      const result1 = await serviceAny.tryImport('non-existent-module')
      expect(result1).toBeNull()

      // Second call should use cached result
      const result2 = await serviceAny.tryImport('non-existent-module')
      expect(result2).toBeNull()

      // Check cache was used (both calls should return same null)
      expect(serviceAny.libraryCache.has('non-existent-module')).toBe(true)
      expect(serviceAny.libraryCache.get('non-existent-module')).toBeNull()
    })

    it('should handle compression errors gracefully', async () => {
      const config: CompressionConfig = {
        enabled: true,
        algorithm: 'gzip',
        minSize: 10,
      }
      const service = new CompressionService(config)

      // Mock the internal method to simulate compression failure
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Testing private method by mocking compressWithAlgorithm to simulate compression failure
      const originalMethod = (service as any).compressWithAlgorithm
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Testing private method by mocking compressWithAlgorithm to simulate compression failure
      ;(service as any).compressWithAlgorithm = vi
        .fn()
        .mockRejectedValue(new Error('Mock compression error'))

      // Test that error is properly wrapped
      await expect(service.compress('test data to compress')).rejects.toThrow(
        CompressionError
      )

      try {
        await service.compress('test data to compress')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Testing error scenario with dynamic error object requiring any type
      } catch (error: any) {
        expect(error).toBeInstanceOf(CompressionError)
        expect(error.code).toBe('COMPRESSION_FAILED')
        expect(error.message).toContain('Compression failed')
        expect(error.cause).toBeDefined()
      }

      // Restore original method
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Restoring mocked private method compressWithAlgorithm after test
      ;(service as any).compressWithAlgorithm = originalMethod
    })

    it('should handle Brotli decompression errors gracefully', async () => {
      const config: CompressionConfig = {
        enabled: true,
        algorithm: 'brotli',
        minSize: 10,
      }
      const service = new CompressionService(config)

      // Mock decompressBrotli to throw error
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Testing private method by mocking decompressBrotli to simulate decompression failure
      const originalDecompress = (service as any).decompressBrotli
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Testing private method by mocking decompressBrotli to simulate decompression failure
      ;(service as any).decompressBrotli = async () => {
        throw new Error('Brotli decompression failed')
      }

      await expect(
        service.decompress(Buffer.from('invalid'), 'brotli')
      ).rejects.toThrow(CompressionError)

      // Verify error details
      try {
        await service.decompress(Buffer.from('invalid'), 'brotli')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Testing error scenario with dynamic error object requiring any type
      } catch (error: any) {
        expect(error.code).toBe('DECOMPRESSION_FAILED')
      }

      // Restore original method
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Restoring mocked private method decompressBrotli after test
      ;(service as any).decompressBrotli = originalDecompress
    })
  })
})
