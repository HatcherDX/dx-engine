/**
 * @fileoverview Compression service types and interfaces
 *
 * @description
 * Type definitions for the compression service including configuration,
 * result types, and error handling for high-performance data compression.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

/**
 * Supported compression algorithms
 *
 * @remarks
 * - `auto`: Automatically select optimal algorithm based on data size
 * - `lz4`: Fast compression, lower ratio (good for <10KB data)
 * - `brotli`: Better compression ratio, slower (good for >10KB data)
 * - `deflate`: Standard zlib compression (fallback)
 * - `none`: No compression applied
 *
 * @public
 */
export type CompressionAlgorithm =
  | 'auto'
  | 'gzip'
  | 'lz4'
  | 'brotli'
  | 'deflate'
  | 'none'

/**
 * Compression configuration options
 *
 * @example
 * ```typescript
 * const config: CompressionConfig = {
 *   enabled: true,
 *   algorithm: 'auto',
 *   level: 6,
 *   minSize: 1024
 * }
 * ```
 *
 * @public
 */
export interface CompressionConfig {
  /**
   * Whether compression is enabled
   * @defaultValue false
   */
  enabled: boolean

  /**
   * Compression algorithm to use
   * @defaultValue 'auto'
   */
  algorithm?: CompressionAlgorithm

  /**
   * Compression level (1-9, higher = better compression but slower)
   * @defaultValue 6
   */
  level?: number

  /**
   * Minimum data size to trigger compression (bytes)
   * @defaultValue 1024
   */
  minSize?: number
}

/**
 * Result of compression operation
 *
 * @remarks
 * Contains the compressed data along with metadata about the compression
 * operation including the algorithm used and compression ratio achieved.
 *
 * @public
 */
export interface CompressionResult {
  /**
   * Compressed data buffer (or original string/buffer if compression was skipped)
   */
  data: Buffer | string

  /**
   * Whether compression was actually applied
   */
  compressed: boolean

  /**
   * Algorithm used for compression
   */
  algorithm: CompressionAlgorithm

  /**
   * Original data size in bytes
   */
  originalSize: number

  /**
   * Compression ratio (compressed size / original size)
   * @remarks
   * Lower values indicate better compression. Value of 1.0 means no compression.
   */
  compressionRatio: number
}

/**
 * Compression error codes for programmatic error handling
 *
 * @public
 */
export const CompressionErrorCode = {
  /**
   * General compression operation failed
   */
  COMPRESSION_FAILED: 'COMPRESSION_FAILED',

  /**
   * General decompression operation failed
   */
  DECOMPRESSION_FAILED: 'DECOMPRESSION_FAILED',

  /**
   * Requested compression algorithm is not supported
   */
  UNSUPPORTED_ALGORITHM: 'UNSUPPORTED_ALGORITHM',

  /**
   * Invalid configuration provided
   */
  INVALID_CONFIG: 'INVALID_CONFIG',

  /**
   * Data corruption detected during decompression
   */
  DATA_CORRUPTION: 'DATA_CORRUPTION',
} as const

/**
 * Type for compression error codes
 *
 * @public
 */
export type CompressionErrorCode =
  (typeof CompressionErrorCode)[keyof typeof CompressionErrorCode]

/**
 * Compression-specific error class interface
 *
 * @remarks
 * This interface defines the structure for compression errors.
 * The actual implementation is provided by the CompressionService module.
 *
 * @public
 */
export interface CompressionErrorInterface extends Error {
  /**
   * Specific error code for programmatic handling
   */
  readonly code: string

  /**
   * Original error that caused this compression error
   */
  readonly cause?: Error
}
