/**
 * Terminal Buffer Manager - VSCode Style Performance Optimization
 * Handles data chunking, buffering, and flow control for high-throughput terminals
 * Prevents UI blocking with large data streams and optimizes memory usage
 */

import { EventEmitter } from 'node:events'

interface BufferChunk {
  data: string
  timestamp: number
  sequenceId: number
  size: number
}

interface BufferMetrics {
  totalChunks: number
  totalBytes: number
  droppedChunks: number
  avgChunkSize: number
  maxBufferSize: number
  currentBufferSize: number
  processingLatency: number
}

interface BufferConfig {
  maxBufferSize: number // Maximum buffer size in bytes
  chunkSize: number // Preferred chunk size for processing
  maxChunksPerFlush: number // Maximum chunks to process per flush
  flushInterval: number // Interval for buffer flushing (ms)
  dropThreshold: number // Threshold to start dropping old chunks
  compressionEnabled: boolean // Enable data compression for large buffers
}

export class TerminalBufferManager extends EventEmitter {
  private buffer: BufferChunk[] = []
  private sequenceCounter = 0
  private flushTimer: NodeJS.Timeout | null = null
  private isProcessing = false
  private metrics: BufferMetrics
  private config: BufferConfig

  // Performance monitoring
  private lastFlushTime = 0
  private processingTimes: number[] = []

  constructor(terminalId: string, config: Partial<BufferConfig> = {}) {
    super()

    this.config = {
      maxBufferSize: 10 * 1024 * 1024, // 10MB default
      chunkSize: 64 * 1024, // 64KB chunks
      maxChunksPerFlush: 50, // Process up to 50 chunks per flush
      flushInterval: 16, // 60fps = ~16ms intervals
      dropThreshold: 0.8, // Drop when 80% full
      compressionEnabled: true,
      ...config,
    }

    this.metrics = {
      totalChunks: 0,
      totalBytes: 0,
      droppedChunks: 0,
      avgChunkSize: 0,
      maxBufferSize: this.config.maxBufferSize,
      currentBufferSize: 0,
      processingLatency: 0,
    }

    this.startFlushTimer()
    console.log(
      `[Buffer Manager] Initialized for terminal with config:`,
      this.config
    )
  }

  /**
   * Add data to buffer with chunking support
   */
  addData(data: string): void {
    const timestamp = Date.now()
    const dataSize = Buffer.byteLength(data, 'utf8')

    // Check if we need to drop old chunks due to memory pressure
    if (this.shouldDropOldChunks()) {
      this.dropOldChunks()
    }

    // Split large data into manageable chunks
    if (dataSize > this.config.chunkSize) {
      this.splitIntoChunks(data, timestamp)
    } else {
      this.addChunk(data, timestamp, dataSize)
    }

    // Trigger immediate flush for urgent data (interactive commands)
    if (this.isUrgentData(data)) {
      this.flushBuffer(true)
    }
  }

  /**
   * Split large data into smaller chunks for processing
   */
  private splitIntoChunks(data: string, timestamp: number): void {
    const chunkSize = this.config.chunkSize
    let offset = 0

    while (offset < data.length) {
      const chunk = data.slice(offset, offset + chunkSize)
      const size = Buffer.byteLength(chunk, 'utf8')
      this.addChunk(chunk, timestamp, size)
      offset += chunkSize
    }
  }

  /**
   * Add individual chunk to buffer
   */
  private addChunk(data: string, timestamp: number, size: number): void {
    const chunk: BufferChunk = {
      data,
      timestamp,
      sequenceId: this.sequenceCounter++,
      size,
    }

    this.buffer.push(chunk)
    this.metrics.totalChunks++
    this.metrics.totalBytes += size
    this.metrics.currentBufferSize += size
    this.updateAverageChunkSize()
  }

  /**
   * Check if data is urgent and needs immediate processing
   */
  private isUrgentData(data: string): boolean {
    // Interactive sequences that should be processed immediately
    const urgentPatterns = [
      '\x1b[', // ANSI escape sequences
      '\r', // Carriage returns
      '\n', // Newlines in small chunks
      '\x07', // Bell character
      '\x1b]0;', // Title changes
    ]

    return (
      urgentPatterns.some((pattern) => data.includes(pattern)) &&
      data.length < 100
    )
  }

  /**
   * Check if we should drop old chunks due to memory pressure
   */
  private shouldDropOldChunks(): boolean {
    const utilizationRatio =
      this.metrics.currentBufferSize / this.config.maxBufferSize
    return utilizationRatio > this.config.dropThreshold
  }

  /**
   * Drop old chunks to free memory
   */
  private dropOldChunks(): void {
    const dropCount = Math.floor(this.buffer.length * 0.3) // Drop 30% of oldest chunks
    const droppedChunks = this.buffer.splice(0, dropCount)

    let droppedBytes = 0
    droppedChunks.forEach((chunk) => {
      droppedBytes += chunk.size
    })

    this.metrics.currentBufferSize -= droppedBytes
    this.metrics.droppedChunks += dropCount

    console.warn(
      `[Buffer Manager] Dropped ${dropCount} chunks (${droppedBytes} bytes) due to memory pressure`
    )

    this.emit('chunksDropped', {
      droppedCount: dropCount,
      droppedBytes,
      remainingChunks: this.buffer.length,
    })
  }

  /**
   * Start the buffer flush timer
   */
  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flushBuffer(false)
    }, this.config.flushInterval)
  }

  /**
   * Flush buffer to terminal with flow control
   */
  private async flushBuffer(urgent: boolean = false): Promise<void> {
    if (this.isProcessing && !urgent) {
      return // Avoid concurrent processing
    }

    if (this.buffer.length === 0) {
      return // Nothing to process
    }

    this.isProcessing = true
    const flushStartTime = Date.now()

    try {
      // Determine how many chunks to process
      const chunksToProcess = urgent
        ? this.buffer.length
        : Math.min(this.buffer.length, this.config.maxChunksPerFlush)

      const chunks = this.buffer.splice(0, chunksToProcess)

      // Combine chunks into efficient batches
      const batches = this.createOptimalBatches(chunks)

      // Process each batch
      for (const batch of batches) {
        await this.processBatch(batch)
      }

      // Update buffer size
      chunks.forEach((chunk) => {
        this.metrics.currentBufferSize -= chunk.size
      })

      // Update performance metrics
      const processingTime = Date.now() - flushStartTime
      this.updateProcessingMetrics(processingTime)
    } catch (error) {
      console.error('[Buffer Manager] Error during buffer flush:', error)
      this.emit('flushError', error)
    } finally {
      this.isProcessing = false
    }
  }

  /**
   * Create optimal batches from chunks for processing
   */
  private createOptimalBatches(chunks: BufferChunk[]): string[] {
    const batches: string[] = []
    let currentBatch = ''
    let currentBatchSize = 0
    const maxBatchSize = this.config.chunkSize

    for (const chunk of chunks) {
      // If adding this chunk would exceed batch size, start new batch
      if (currentBatchSize + chunk.size > maxBatchSize && currentBatch) {
        batches.push(currentBatch)
        currentBatch = chunk.data
        currentBatchSize = chunk.size
      } else {
        currentBatch += chunk.data
        currentBatchSize += chunk.size
      }
    }

    // Add final batch
    if (currentBatch) {
      batches.push(currentBatch)
    }

    return batches
  }

  /**
   * Process a batch of data
   */
  private async processBatch(batchData: string): Promise<void> {
    return new Promise((resolve) => {
      // Use nextTick to avoid blocking the event loop
      process.nextTick(() => {
        this.emit('dataReady', batchData)
        resolve()
      })
    })
  }

  /**
   * Update processing performance metrics
   */
  private updateProcessingMetrics(processingTime: number): void {
    this.processingTimes.push(processingTime)

    // Keep only recent measurements (last 100)
    if (this.processingTimes.length > 100) {
      this.processingTimes.shift()
    }

    // Calculate average latency
    this.metrics.processingLatency =
      this.processingTimes.reduce((sum, time) => sum + time, 0) /
      this.processingTimes.length
  }

  /**
   * Update average chunk size metric
   */
  private updateAverageChunkSize(): void {
    if (this.metrics.totalChunks > 0) {
      this.metrics.avgChunkSize =
        this.metrics.totalBytes / this.metrics.totalChunks
    }
  }

  /**
   * Get current buffer metrics
   */
  getMetrics(): BufferMetrics {
    return { ...this.metrics }
  }

  /**
   * Get buffer health status
   */
  getHealthStatus(): {
    status: 'healthy' | 'warning' | 'critical'
    utilizationPercent: number
    averageLatency: number
    droppedChunksPercent: number
  } {
    const utilizationPercent =
      (this.metrics.currentBufferSize / this.config.maxBufferSize) * 100
    const droppedChunksPercent =
      (this.metrics.droppedChunks / Math.max(this.metrics.totalChunks, 1)) * 100

    let status: 'healthy' | 'warning' | 'critical' = 'healthy'

    if (
      utilizationPercent > 80 ||
      droppedChunksPercent > 5 ||
      this.metrics.processingLatency > 50
    ) {
      status = 'critical'
    } else if (
      utilizationPercent > 60 ||
      droppedChunksPercent > 1 ||
      this.metrics.processingLatency > 20
    ) {
      status = 'warning'
    }

    return {
      status,
      utilizationPercent,
      averageLatency: this.metrics.processingLatency,
      droppedChunksPercent,
    }
  }

  /**
   * Clear buffer and reset metrics
   */
  clear(): void {
    this.buffer = []
    this.sequenceCounter = 0
    this.metrics.currentBufferSize = 0
    console.log('[Buffer Manager] Buffer cleared')
  }

  /**
   * Pause buffer processing
   */
  pause(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer)
      this.flushTimer = null
    }
    console.log('[Buffer Manager] Buffer processing paused')
  }

  /**
   * Resume buffer processing
   */
  resume(): void {
    if (!this.flushTimer) {
      this.startFlushTimer()
    }
    console.log('[Buffer Manager] Buffer processing resumed')
  }

  /**
   * Update buffer configuration dynamically
   */
  updateConfig(newConfig: Partial<BufferConfig>): void {
    this.config = { ...this.config, ...newConfig }
    this.metrics.maxBufferSize = this.config.maxBufferSize

    // Restart timer with new interval if changed
    if (newConfig.flushInterval && this.flushTimer) {
      this.pause()
      this.resume()
    }

    console.log('[Buffer Manager] Configuration updated:', newConfig)
  }

  /**
   * Cleanup and destroy buffer manager
   */
  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer)
      this.flushTimer = null
    }

    this.clear()
    this.removeAllListeners()
    console.log('[Buffer Manager] Destroyed')
  }
}
