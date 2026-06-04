/**
 * @fileoverview Terminal Backpressure Manager for XTerm.js write operations.
 *
 * @description
 * Manages write operations to XTerm.js terminals with backpressure control to prevent
 * overwhelming the terminal with data. Uses a queue-based system with memory management
 * and chunk-based writing for optimal performance and stability.
 *
 * Based on Context7 best practices for XTerm.js callback patterns.
 *
 * @example
 * ```typescript
 * const manager = new TerminalBackpressureManager()
 * await manager.writeWithBackpressure(terminal, largeData)
 * ```
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import type { Terminal } from 'xterm'

/**
 * Configuration options for backpressure manager.
 *
 * @public
 * @since 1.0.0
 */
export interface BackpressureOptions {
  /** Size of chunks for large data writes in bytes */
  chunkSize?: number
  /** Maximum queue size before dropping old data */
  maxQueueSize?: number
  /** Maximum data size per write operation in bytes */
  maxDataSize?: number
  /** Delay between chunk writes in milliseconds */
  writeDelay?: number
  /** Enable debug logging */
  debug?: boolean
}

/**
 * Manages backpressure for terminal write operations.
 *
 * @remarks
 * This class implements a queue-based system for managing write operations to XTerm.js
 * terminals. It chunks large data, manages memory usage, and uses XTerm.js callbacks
 * for proper synchronization.
 *
 * Key features:
 * - Queue-based write management
 * - Automatic data chunking for large writes
 * - Memory usage monitoring
 * - Error recovery mechanisms
 * - Debug logging support
 *
 * @public
 * @since 1.0.0
 */
export class TerminalBackpressureManager {
  private writeQueue: string[] = []
  private isWriting = false
  private readonly CHUNK_SIZE: number
  private readonly WRITE_DELAY: number
  private MAX_QUEUE_SIZE: number
  private readonly MAX_DATA_SIZE: number
  private readonly DEBUG: boolean
  private totalMemoryUsage = 0

  /**
   * Creates a new TerminalBackpressureManager instance.
   *
   * @param options - Configuration options for backpressure management
   *
   * @example
   * ```typescript
   * const manager = new TerminalBackpressureManager({
   *   chunkSize: 1024,
   *   maxQueueSize: 100,
   *   debug: true
   * })
   * ```
   */
  constructor(options: BackpressureOptions = {}) {
    this.CHUNK_SIZE = options.chunkSize ?? 512 // 512-byte chunks for stability
    this.WRITE_DELAY = options.writeDelay ?? 0 // No artificial delay by default
    this.MAX_QUEUE_SIZE = options.maxQueueSize ?? 100 // Context7 recommended limit
    this.MAX_DATA_SIZE = options.maxDataSize ?? 1024 * 1024 // 1MB max per write
    this.DEBUG = options.debug ?? false
  }

  /**
   * Writes data to terminal with backpressure management.
   *
   * @param terminal - XTerm.js terminal instance
   * @param data - Data to write to the terminal
   * @returns Promise that resolves when write is complete or queued
   *
   * @throws {@link Error}
   * Thrown when data size exceeds maximum allowed size
   *
   * @example
   * ```typescript
   * try {
   *   await manager.writeWithBackpressure(terminal, largeOutput)
   *   console.log('Data written successfully')
   * } catch (error) {
   *   console.error('Write failed:', error)
   * }
   * ```
   */
  async writeWithBackpressure(terminal: Terminal, data: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      // Validate data size
      if (data.length > this.MAX_DATA_SIZE) {
        const error = new Error(
          `Data size ${data.length} exceeds maximum ${this.MAX_DATA_SIZE}`
        )
        if (this.DEBUG) {
          console.error(
            '[BackpressureManager] Size validation failed:',
            error.message
          )
        }
        reject(error)
        return
      }

      // Manage queue size to prevent memory overflow
      if (this.writeQueue.length >= this.MAX_QUEUE_SIZE) {
        if (this.DEBUG) {
          console.warn('[BackpressureManager] Queue full, dropping oldest data')
        }
        this.writeQueue.shift()
        this.updateMemoryUsage()
      }

      // Queue if already writing
      if (this.isWriting) {
        this.writeQueue.push(data)
        this.updateMemoryUsage()
        resolve() // Resolve immediately, queuing is handled internally
        return
      }

      // Start writing immediately
      this.startWriting(terminal, data, resolve)
    })
  }

  /**
   * Updates internal memory usage tracking.
   *
   * @internal
   */
  private updateMemoryUsage(): void {
    this.totalMemoryUsage = this.writeQueue.reduce(
      (sum, item) => sum + item.length,
      0
    )
  }

  /**
   * Starts writing data to terminal.
   *
   * @param terminal - XTerm.js terminal instance
   * @param data - Data to write
   * @param onComplete - Callback when write completes
   *
   * @internal
   */
  private startWriting(
    terminal: Terminal,
    data: string,
    onComplete: () => void
  ): void {
    this.isWriting = true

    try {
      // Chunk large data for better performance
      if (data.length > this.CHUNK_SIZE) {
        this.writeDataInChunks(terminal, data, onComplete)
      } else {
        // Write small data directly with callback
        if (terminal && typeof terminal.write === 'function') {
          if (this.DEBUG) {
            console.log('[BackpressureManager] Writing data:', {
              length: data.length,
              preview: data.substring(0, 50),
            })
          }
          terminal.write(data, () => {
            if (this.DEBUG) {
              console.log('[BackpressureManager] Write completed')
            }
            this.isWriting = false
            this.processQueueNext(terminal)
            onComplete()
          })
        } else {
          this.isWriting = false
          this.processQueueNext(terminal)
          onComplete()
        }
      }
    } catch (error) {
      if (this.DEBUG) {
        console.error('[BackpressureManager] Write error:', error)
      }
      this.isWriting = false
      // Clear queue on error to prevent stuck state
      this.writeQueue = []
      onComplete()
    }
  }

  /**
   * Writes data in chunks to prevent overwhelming the terminal.
   *
   * @param terminal - XTerm.js terminal instance
   * @param data - Data to write
   * @param onComplete - Callback when all chunks are written
   *
   * @internal
   */
  private writeDataInChunks(
    terminal: Terminal,
    data: string,
    onComplete: () => void
  ): void {
    const chunks: string[] = []
    for (let i = 0; i < data.length; i += this.CHUNK_SIZE) {
      chunks.push(data.substring(i, i + this.CHUNK_SIZE))
    }

    let chunkIndex = 0

    const writeNextChunk = (): void => {
      if (chunkIndex >= chunks.length) {
        // All chunks written
        this.isWriting = false
        this.processQueueNext(terminal)
        onComplete()
        return
      }

      const currentChunk = chunks[chunkIndex]
      chunkIndex++

      // Use XTerm.js callback for synchronization
      if (terminal && typeof terminal.write === 'function') {
        terminal.write(currentChunk, () => {
          // Schedule next chunk write
          if (this.WRITE_DELAY > 0) {
            setTimeout(writeNextChunk, this.WRITE_DELAY)
          } else {
            // Next tick for better performance
            setTimeout(writeNextChunk, 0)
          }
        })
      } else {
        // Continue without writing if terminal unavailable
        setTimeout(writeNextChunk, this.WRITE_DELAY)
      }
    }

    writeNextChunk()
  }

  /**
   * Processes next item in the write queue.
   *
   * @param terminal - XTerm.js terminal instance
   *
   * @internal
   */
  private processQueueNext(terminal: Terminal): void {
    if (this.writeQueue.length > 0) {
      const nextData = this.writeQueue.shift()!
      this.updateMemoryUsage()
      // Process immediately without creating new Promise
      this.startWriting(terminal, nextData, () => {
        // Queue item processed
      })
    }
  }

  /**
   * Clears all queued data and resets state.
   *
   * @example
   * ```typescript
   * manager.clear()
   * console.log('Queue cleared')
   * ```
   */
  clear(): void {
    this.writeQueue = []
    this.isWriting = false
    this.totalMemoryUsage = 0
  }

  /**
   * Gets current queue size.
   *
   * @returns Number of items in the write queue
   *
   * @example
   * ```typescript
   * const queueSize = manager.getQueueSize()
   * if (queueSize > 50) {
   *   console.warn('Large queue detected')
   * }
   * ```
   */
  getQueueSize(): number {
    return this.writeQueue.length
  }

  /**
   * Gets current memory usage in bytes.
   *
   * @returns Total memory used by queued data in bytes
   */
  getMemoryUsage(): number {
    return this.totalMemoryUsage
  }

  /**
   * Gets current memory usage in megabytes.
   *
   * @returns Total memory used by queued data in MB
   */
  getMemoryUsageMB(): number {
    return this.totalMemoryUsage / (1024 * 1024)
  }

  /**
   * Checks if manager is currently writing data.
   *
   * @returns True if actively writing, false otherwise
   */
  isCurrentlyWriting(): boolean {
    return this.isWriting
  }

  /**
   * Checks if memory usage is within healthy limits.
   *
   * @returns True if memory usage is healthy, false if approaching limits
   *
   * @example
   * ```typescript
   * if (!manager.isMemoryHealthy()) {
   *   console.warn('Memory usage approaching limits')
   *   manager.clear()
   * }
   * ```
   */
  isMemoryHealthy(): boolean {
    return (
      this.writeQueue.length < this.MAX_QUEUE_SIZE * 0.8 &&
      this.totalMemoryUsage < this.MAX_DATA_SIZE * 0.5
    )
  }

  /**
   * Sets maximum queue size.
   *
   * @param size - New maximum queue size
   */
  setMaxQueueSize(size: number): void {
    this.MAX_QUEUE_SIZE = size
  }
}
