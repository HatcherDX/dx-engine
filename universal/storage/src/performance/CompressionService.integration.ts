/**
 * @fileoverview Integration tests for CompressionService with real algorithms
 *
 * @description
 * Integration tests that verify CompressionService works correctly with real
 * compression algorithms (gzip, lz4, brotli). These tests validate actual
 * compression performance, ratios, and cross-platform compatibility.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { CompressionService } from './CompressionService'
import type { CompressionConfig } from '../types/compression'

// Import integration test utilities (NO MOCKS)
import '../test-setup-real'

// Helper function to properly deserialize JSON with Buffer support
function deserializeWithBuffers<T>(jsonString: string): T {
  return JSON.parse(jsonString, (key, value) => {
    // Convert serialized Buffer objects back to real Buffers
    if (
      value &&
      typeof value === 'object' &&
      value.type === 'Buffer' &&
      Array.isArray(value.data)
    ) {
      return Buffer.from(value.data)
    }
    return value
  })
}

describe('CompressionService Integration', () => {
  let compressionService: CompressionService

  describe('real gzip compression', () => {
    beforeEach(() => {
      const config: CompressionConfig = {
        enabled: true,
        algorithm: 'gzip',
        level: 6,
        minSize: 100,
      }
      compressionService = new CompressionService(config)
    })

    it('should compress and decompress data using real gzip', async () => {
      const testData = {
        text: 'This is a test string that should compress well with gzip because it has repetitive patterns. '.repeat(
          50
        ),
        nested: {
          array: Array.from({ length: 100 }, (_, i) => `item-${i}`),
          object: { prop1: 'value1', prop2: 'value2' },
        },
        timestamp: Date.now(),
      }

      const originalSize = JSON.stringify(testData).length

      const serialized = JSON.stringify(testData)
      const compressed = await compressionService.compress(serialized)

      // Verify compression metadata
      expect(compressed.compressed).toBe(true)
      expect(compressed.algorithm).toBe('gzip')
      expect(compressed.originalSize).toBe(originalSize)
      expect(compressed.data.length).toBeLessThan(originalSize) // Should be smaller

      const decompressed = await compressionService.decompress(
        compressed.data as Buffer,
        compressed.algorithm
      )
      const parsedDecompressed = JSON.parse(decompressed)
      expect(parsedDecompressed).toEqual(testData)
    })

    it('should achieve good compression ratios on repetitive data', async () => {
      const repetitiveData = {
        pattern: 'ABCD'.repeat(1000), // Highly compressible
        numbers: Array.from({ length: 1000 }, () => 12345),
        text: 'Lorem ipsum dolor sit amet, '.repeat(200),
      }

      const originalSize = JSON.stringify(repetitiveData).length
      const serialized = JSON.stringify(repetitiveData)
      const compressed = await compressionService.compress(serialized)

      const compressionRatio = compressed.data.length / originalSize

      // Should achieve at least 50% compression on repetitive data
      expect(compressionRatio).toBeLessThan(0.5)
      expect(compressed.compressed).toBe(true)

      // Verify decompression
      const decompressed = await compressionService.decompress(
        compressed.data as Buffer,
        compressed.algorithm
      )
      const parsedDecompressed = JSON.parse(decompressed)
      expect(parsedDecompressed).toEqual(repetitiveData)
    })

    it('should handle large data compression with real gzip', async () => {
      // Create ~1MB of data
      const largeData = {
        id: 'large-data-test',
        content: 'Large data content with some repetitive patterns. '.repeat(
          20000
        ),
        metadata: {
          size: 'large',
          created: Date.now(),
          tags: Array.from({ length: 1000 }, (_, i) => `tag-${i % 10}`), // Repetitive tags
        },
      }

      const originalSize = JSON.stringify(largeData).length
      expect(originalSize).toBeGreaterThan(1000000) // Should be > 1MB

      const startTime = Date.now()
      const serialized = JSON.stringify(largeData)
      const compressed = await compressionService.compress(serialized)
      const compressTime = Date.now() - startTime

      const decompressStartTime = Date.now()
      const decompressed = await compressionService.decompress(
        compressed.data as Buffer,
        compressed.algorithm
      )
      const parsedDecompressed = JSON.parse(decompressed)
      const decompressTime = Date.now() - decompressStartTime

      // Verify compression worked
      expect(compressed.compressed).toBe(true)
      expect(compressed.data.length).toBeLessThan(originalSize)
      expect(parsedDecompressed).toEqual(largeData)

      // Performance should be reasonable
      expect(compressTime).toBeLessThan(5000) // 5 seconds for 1MB
      expect(decompressTime).toBeLessThan(1000) // 1 second for decompression

      console.log(
        `Gzip compression: ${originalSize} -> ${compressed.data.length} bytes (${((compressed.data.length / originalSize) * 100).toFixed(1)}%)`
      )
    })
  })

  describe('real lz4 compression', () => {
    beforeEach(() => {
      const config: CompressionConfig = {
        enabled: true,
        algorithm: 'lz4',
        minSize: 100,
      }
      compressionService = new CompressionService(config)
    })

    it('should compress and decompress data using real lz4', async () => {
      const testData = {
        fastCompress:
          'LZ4 is optimized for speed rather than compression ratio. '.repeat(
            30
          ),
        binary: Buffer.from(
          [0x00, 0xff, 0xaa, 0x55].map((b) => Array(100).fill(b)).flat()
        ),
        mixed: {
          strings: Array.from({ length: 50 }, (_, i) => `fast-item-${i % 5}`),
          numbers: Array.from({ length: 100 }, () =>
            Math.floor(Math.random() * 1000)
          ),
        },
      }

      const serialized = JSON.stringify(testData)
      const compressed = await compressionService.compress(serialized)

      expect(compressed.compressed).toBe(true)
      expect(compressed.algorithm).toBe('lz4')

      const decompressed = await compressionService.decompress(
        compressed.data as Buffer,
        compressed.algorithm
      )
      const parsedDecompressed = deserializeWithBuffers(decompressed)
      expect(parsedDecompressed).toEqual(testData)
    })

    it('should prioritize speed over compression ratio', async () => {
      const speedTestData = {
        content: 'Speed test data with moderate repetition. '.repeat(500),
        timestamp: Date.now(),
      }

      const iterations = 10
      const startTime = Date.now()

      for (let i = 0; i < iterations; i++) {
        const serialized = JSON.stringify(speedTestData)
        const compressed = await compressionService.compress(serialized)
        await compressionService.decompress(
          compressed.data as Buffer,
          compressed.algorithm
        )
      }

      const totalTime = Date.now() - startTime
      const avgTime = totalTime / iterations

      // LZ4 should be very fast
      expect(avgTime).toBeLessThan(100) // Less than 100ms per compress/decompress cycle

      console.log(
        `LZ4 average time: ${avgTime.toFixed(1)}ms per compress/decompress cycle`
      )
    })
  })

  describe('real brotli compression', () => {
    beforeEach(() => {
      const config: CompressionConfig = {
        enabled: true,
        algorithm: 'brotli',
        level: 6,
        minSize: 100,
      }
      compressionService = new CompressionService(config)
    })

    it('should compress and decompress data using real brotli', async () => {
      const testData = {
        text: 'Brotli compression algorithm provides excellent compression ratios especially for text data. '.repeat(
          100
        ),
        structured: {
          json: Array.from({ length: 100 }, (_, i) => ({
            id: i,
            name: `User ${i}`,
            email: `user${i}@example.com`,
            active: i % 2 === 0,
          })),
        },
      }

      const serialized = JSON.stringify(testData)
      const compressed = await compressionService.compress(serialized)

      expect(compressed.compressed).toBe(true)
      expect(compressed.algorithm).toBe('brotli')

      const decompressed = await compressionService.decompress(
        compressed.data as Buffer,
        compressed.algorithm
      )
      const parsedDecompressed = JSON.parse(decompressed)
      expect(parsedDecompressed).toEqual(testData)
    })

    it('should achieve excellent compression ratios', async () => {
      const textHeavyData = {
        documentation: `
          Brotli is a generic-purpose lossless compression algorithm that compresses data 
          using a combination of a modern variant of the LZ77 algorithm, Huffman coding 
          and 2nd order context modeling, with a compression ratio comparable to the best 
          currently available general-purpose compression methods. It is similar in speed 
          with deflate but offers more dense compression.
        `.repeat(50),
        code: `
          function compress(data) {
            return brotli.compress(JSON.stringify(data));
          }
          
          function decompress(compressed) {
            return JSON.parse(brotli.decompress(compressed));
          }
        `.repeat(30),
        config: JSON.stringify({
          compression: {
            enabled: true,
            algorithm: 'brotli',
            quality: 11,
            windowBits: 22,
          },
        }).repeat(20),
      }

      const originalSize = JSON.stringify(textHeavyData).length
      const serialized = JSON.stringify(textHeavyData)
      const compressed = await compressionService.compress(serialized)

      const compressionRatio = compressed.data.length / originalSize

      // Brotli should achieve excellent compression on text
      expect(compressionRatio).toBeLessThan(0.3) // Less than 30% of original
      expect(compressed.compressed).toBe(true)

      console.log(
        `Brotli compression: ${originalSize} -> ${compressed.data.length} bytes (${(compressionRatio * 100).toFixed(1)}%)`
      )

      const decompressed = await compressionService.decompress(
        compressed.data as Buffer,
        compressed.algorithm
      )
      const parsedDecompressed = JSON.parse(decompressed)
      expect(parsedDecompressed).toEqual(textHeavyData)
    })
  })

  describe('algorithm comparison and auto-selection', () => {
    it('should compare compression algorithms on real data', async () => {
      const testData = {
        text: 'Comparative test data with mixed content types including repetitive patterns and random elements. '.repeat(
          200
        ),
        numbers: Array.from({ length: 1000 }, () =>
          Math.floor(Math.random() * 100)
        ),
        structured: Array.from({ length: 100 }, (_, i) => ({
          id: i,
          category: `cat-${i % 10}`,
          data: `data-${i}`.repeat(5),
        })),
      }

      const algorithms: Array<{ name: string; config: CompressionConfig }> = [
        {
          name: 'gzip',
          config: { enabled: true, algorithm: 'gzip', level: 6, minSize: 100 },
        },
        {
          name: 'lz4',
          config: { enabled: true, algorithm: 'lz4', minSize: 100 },
        },
        {
          name: 'brotli',
          config: {
            enabled: true,
            algorithm: 'brotli',
            level: 6,
            minSize: 100,
          },
        },
      ]

      const originalSize = JSON.stringify(testData).length
      const results = []

      for (const { name, config } of algorithms) {
        const service = new CompressionService(config)

        const startTime = performance.now()
        const serialized = JSON.stringify(testData)
        const compressed = await service.compress(serialized)
        const compressTime = Math.max(0.1, performance.now() - startTime) // Ensure minimum 0.1ms

        const decompressStart = performance.now()
        const decompressed = await service.decompress(
          compressed.data as Buffer,
          compressed.algorithm
        )
        const parsedDecompressed = deserializeWithBuffers(decompressed)
        const decompressTime = Math.max(
          0.1,
          performance.now() - decompressStart
        ) // Ensure minimum 0.1ms

        expect(parsedDecompressed).toEqual(testData) // Verify correctness

        results.push({
          algorithm: name,
          originalSize,
          compressedSize: compressed.data.length,
          ratio: compressed.data.length / originalSize,
          compressTime,
          decompressTime,
        })
      }

      // Log results for comparison
      console.log('\nCompression Algorithm Comparison:')
      console.log(
        'Algorithm | Original | Compressed | Ratio  | Compress Time | Decompress Time'
      )
      console.log(
        '----------|----------|------------|--------|---------------|----------------'
      )

      for (const result of results) {
        console.log(
          `${result.algorithm.padEnd(9)} | ${result.originalSize.toString().padEnd(8)} | ${result.compressedSize.toString().padEnd(10)} | ${(result.ratio * 100).toFixed(1).padEnd(5)}% | ${result.compressTime.toString().padEnd(13)}ms | ${result.decompressTime.toString().padEnd(14)}ms`
        )
      }

      // Verify all algorithms produced valid results
      expect(results).toHaveLength(3)
      expect(results.every((r) => r.compressedSize < r.originalSize)).toBe(true)
      expect(results.every((r) => r.compressTime > 0)).toBe(true)
      expect(results.every((r) => r.decompressTime > 0)).toBe(true)
    })

    it('should handle auto algorithm selection based on data characteristics', async () => {
      const autoConfig: CompressionConfig = {
        enabled: true,
        algorithm: 'auto',
        minSize: 100,
      }

      const autoService = new CompressionService(autoConfig)

      // Test different data types
      const testCases = [
        {
          name: 'repetitive text',
          data: { content: 'ABCDEFGH'.repeat(1000) },
        },
        {
          name: 'random data',
          data: {
            content: Array.from({ length: 5000 }, () =>
              Math.random().toString(36)
            ).join(''),
          },
        },
        {
          name: 'structured JSON',
          data: {
            users: Array.from({ length: 200 }, (_, i) => ({
              id: i,
              name: `User ${i}`,
              email: `user${i}@example.com`,
            })),
          },
        },
      ]

      for (const testCase of testCases) {
        const serialized = JSON.stringify(testCase.data)
        const compressed = await autoService.compress(serialized)
        const decompressed = await autoService.decompress(
          compressed.data as Buffer,
          compressed.algorithm
        )
        const parsedDecompressed = deserializeWithBuffers(decompressed)

        expect(compressed.compressed).toBe(true)
        expect(['gzip', 'lz4', 'brotli']).toContain(compressed.algorithm)
        expect(parsedDecompressed).toEqual(testCase.data)

        console.log(
          `Auto-selected ${compressed.algorithm} for ${testCase.name}`
        )
      }
    })
  })
})
