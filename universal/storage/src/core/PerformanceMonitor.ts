/**
 * @fileoverview Performance monitoring for storage operations
 *
 * @description
 * Provides observability and performance metrics collection for storage adapters.
 * Tracks operation durations, cache hits, compression ratios, and other metrics.
 *
 * @example
 * ```typescript
 * const monitor = new DefaultPerformanceMonitor()
 * monitor.record({
 *   operation: 'get',
 *   duration: 10,
 *   cacheHit: true
 * })
 * ```
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

/**
 * Performance metrics for storage operations
 *
 * @remarks
 * Contains detailed metrics about individual storage operations
 * for monitoring and analysis.
 *
 * @public
 */
export interface PerformanceMetrics {
  /**
   * The operation being measured
   */
  operation: string

  /**
   * Duration of the operation in milliseconds
   */
  duration: number

  /**
   * Size of data in bytes (if applicable)
   */
  size?: number

  /**
   * Whether the operation hit the cache
   */
  cacheHit?: boolean

  /**
   * Whether data was compressed
   */
  compressed?: boolean

  /**
   * Whether data was encrypted
   */
  encrypted?: boolean

  /**
   * Storage key involved (optional for privacy)
   */
  key?: string

  /**
   * Whether the operation succeeded
   */
  success?: boolean

  /**
   * Error message if operation failed
   */
  error?: string

  /**
   * Timestamp when the operation occurred
   */
  timestamp?: number

  /**
   * Additional custom tags
   */
  tags?: Record<string, string | number | boolean>
}

/**
 * Interface for performance monitoring
 *
 * @remarks
 * Defines the contract for collecting and retrieving performance metrics.
 *
 * @public
 */
export interface PerformanceMonitor {
  /**
   * Records a performance metric
   *
   * @param metrics - The metrics to record
   */
  record(metrics: PerformanceMetrics): void

  /**
   * Gets all recorded metrics
   *
   * @returns Array of performance metrics
   */
  getMetrics(): PerformanceMetrics[]

  /**
   * Gets metrics for a specific operation
   *
   * @param operation - The operation to filter by
   * @returns Array of matching metrics
   */
  getMetricsByOperation(operation: string): PerformanceMetrics[]

  /**
   * Gets summary statistics
   *
   * @returns Summary of performance metrics
   */
  getSummary(): PerformanceSummary

  /**
   * Clears all recorded metrics
   */
  clear(): void

  /**
   * Exports metrics for external processing
   *
   * @returns Metrics in exportable format
   */
  export(): string
}

/**
 * Summary statistics for performance metrics
 *
 * @public
 */
export interface PerformanceSummary {
  /**
   * Total number of operations
   */
  totalOperations: number

  /**
   * Average operation duration
   */
  averageDuration: number

  /**
   * Minimum operation duration
   */
  minDuration: number

  /**
   * Maximum operation duration
   */
  maxDuration: number

  /**
   * Cache hit rate (percentage)
   */
  cacheHitRate: number

  /**
   * Compression rate (percentage)
   */
  compressionRate: number

  /**
   * Encryption rate (percentage)
   */
  encryptionRate: number

  /**
   * Success rate (percentage)
   */
  successRate: number

  /**
   * Operations per second
   */
  operationsPerSecond: number

  /**
   * Average data size in bytes
   */
  averageSize: number

  /**
   * Breakdown by operation type
   */
  operationBreakdown: Record<string, OperationStats>
}

/**
 * Statistics for a specific operation type
 *
 * @public
 */
export interface OperationStats {
  count: number
  averageDuration: number
  minDuration: number
  maxDuration: number
  successRate: number
  cacheHitRate: number
}

/**
 * Default implementation of performance monitor
 *
 * @remarks
 * Provides in-memory metrics storage with automatic cleanup
 * and statistical analysis.
 *
 * @example
 * ```typescript
 * const monitor = new DefaultPerformanceMonitor({
 *   maxMetrics: 10000,
 *   cleanupInterval: 60000
 * })
 * ```
 *
 * @public
 */
export class DefaultPerformanceMonitor implements PerformanceMonitor {
  private metrics: PerformanceMetrics[] = []
  private readonly maxMetrics: number
  private readonly cleanupInterval: number
  private cleanupTimer: NodeJS.Timeout | undefined
  private startTime = Date.now()

  /**
   * Creates a performance monitor
   *
   * @param options - Configuration options
   */
  constructor(
    options: {
      maxMetrics?: number
      cleanupInterval?: number
    } = {}
  ) {
    this.maxMetrics = options.maxMetrics || 10000
    this.cleanupInterval = options.cleanupInterval || 300000 // 5 minutes

    // Start periodic cleanup
    if (this.cleanupInterval > 0) {
      this.cleanupTimer = setInterval(
        () => this.cleanup(),
        this.cleanupInterval
      )
    }
  }

  /**
   * Records a performance metric
   *
   * @param metric - The metric to record
   */
  record(metric: PerformanceMetrics): void {
    this.metrics.push({
      ...metric,
      timestamp: metric.timestamp || Date.now(),
    })

    // Immediate cleanup if over limit
    if (this.metrics.length > this.maxMetrics) {
      this.cleanup()
    }
  }

  /**
   * Gets all recorded metrics
   *
   * @returns Array of performance metrics
   */
  getMetrics(): PerformanceMetrics[] {
    return [...this.metrics]
  }

  /**
   * Gets metrics for a specific operation
   *
   * @param operation - The operation to filter by
   * @returns Array of matching metrics
   */
  getMetricsByOperation(operation: string): PerformanceMetrics[] {
    return this.metrics.filter((m) => m.operation === operation)
  }

  /**
   * Gets summary statistics
   *
   * @returns Summary of performance metrics
   */
  getSummary(): PerformanceSummary {
    if (this.metrics.length === 0) {
      return this.getEmptySummary()
    }

    const durations = this.metrics.map((m) => m.duration)
    const sizes = this.metrics
      .filter((m) => m.size !== undefined)
      .map((m) => m.size!)
    const cacheHits = this.metrics.filter((m) => m.cacheHit === true).length
    const compressed = this.metrics.filter((m) => m.compressed === true).length
    const encrypted = this.metrics.filter((m) => m.encrypted === true).length
    const successful = this.metrics.filter((m) => m.success !== false).length

    const operationBreakdown = this.getOperationBreakdown()
    const timeRange = (Date.now() - this.startTime) / 1000 // seconds

    return {
      totalOperations: this.metrics.length,
      averageDuration: this.average(durations),
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
      cacheHitRate: (cacheHits / this.metrics.length) * 100,
      compressionRate: (compressed / this.metrics.length) * 100,
      encryptionRate: (encrypted / this.metrics.length) * 100,
      successRate: (successful / this.metrics.length) * 100,
      operationsPerSecond: this.metrics.length / timeRange,
      averageSize: sizes.length > 0 ? this.average(sizes) : 0,
      operationBreakdown,
    }
  }

  /**
   * Clears all recorded metrics
   */
  clear(): void {
    this.metrics = []
    this.startTime = Date.now()
  }

  /**
   * Exports metrics in JSON format
   *
   * @returns JSON string of metrics
   */
  export(): string {
    return JSON.stringify(
      {
        metrics: this.metrics,
        summary: this.getSummary(),
        exportedAt: new Date().toISOString(),
      },
      null,
      2
    )
  }

  /**
   * Stops the monitor and cleans up resources
   */
  dispose(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
    }
    this.cleanupTimer = undefined
    this.clear()
  }

  private cleanup(): void {
    // Keep only the most recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics)
    }

    // Remove metrics older than 1 hour
    const oneHourAgo = Date.now() - 3600000
    this.metrics = this.metrics.filter((m) => (m.timestamp || 0) > oneHourAgo)
  }

  private average(numbers: number[]): number {
    if (numbers.length === 0) return 0
    return numbers.reduce((a, b) => a + b, 0) / numbers.length
  }

  private getOperationBreakdown(): Record<string, OperationStats> {
    const breakdown: Record<string, OperationStats> = {}

    // Group metrics by operation
    const grouped = this.metrics.reduce(
      (acc, metric) => {
        if (!acc[metric.operation]) {
          acc[metric.operation] = []
        }
        acc[metric.operation].push(metric)
        return acc
      },
      {} as Record<string, PerformanceMetrics[]>
    )

    // Calculate stats for each operation
    for (const [operation, metrics] of Object.entries(grouped)) {
      const durations = metrics.map((m) => m.duration)
      const cacheHits = metrics.filter((m) => m.cacheHit === true).length
      const successful = metrics.filter((m) => m.success !== false).length

      breakdown[operation] = {
        count: metrics.length,
        averageDuration: this.average(durations),
        minDuration: Math.min(...durations),
        maxDuration: Math.max(...durations),
        successRate: (successful / metrics.length) * 100,
        cacheHitRate: (cacheHits / metrics.length) * 100,
      }
    }

    return breakdown
  }

  private getEmptySummary(): PerformanceSummary {
    return {
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
    }
  }
}

/**
 * Null performance monitor that discards metrics
 *
 * @remarks
 * Useful for testing or when monitoring is disabled.
 *
 * @public
 */
export class NullPerformanceMonitor implements PerformanceMonitor {
  record(_: PerformanceMetrics): void {
    // No-op
  }

  getMetrics(): PerformanceMetrics[] {
    return []
  }

  getMetricsByOperation(_: string): PerformanceMetrics[] {
    return []
  }

  getSummary(): PerformanceSummary {
    return {
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
    }
  }

  clear(): void {
    // No-op
  }

  export(): string {
    return '{}'
  }
}
