/**
 * Terminal Performance Monitor - VSCode Style Performance Tracking
 * Monitors terminal performance, memory usage, and provides optimization recommendations
 * Helps detect performance bottlenecks and memory leaks in terminal system
 */

import { EventEmitter } from 'node:events'
import type { TerminalInterface } from './terminalStrategy'

interface TerminalPerformanceMetrics {
  terminalId: string
  strategy: string
  bufferHealth: {
    status: 'healthy' | 'warning' | 'critical'
    utilizationPercent: number
    averageLatency: number
    droppedChunksPercent: number
  }
  bufferMetrics: {
    totalChunks: number
    totalBytes: number
    droppedChunks: number
    avgChunkSize: number
    maxBufferSize: number
    currentBufferSize: number
    processingLatency: number
  }
  systemMetrics: {
    memoryUsage: NodeJS.MemoryUsage
    cpuUsage: NodeJS.CpuUsage
    pid?: number
    isRunning: boolean
  }
  timestamp: number
}

interface PerformanceAlert {
  terminalId: string
  type: 'memory' | 'latency' | 'buffer' | 'cpu'
  severity: 'low' | 'medium' | 'high'
  message: string
  recommendation: string
  timestamp: number
}

interface GlobalPerformanceStats {
  totalTerminals: number
  activeTerminals: number
  totalMemoryUsage: number
  averageLatency: number
  alertCount: number
  healthyTerminals: number
  warningTerminals: number
  criticalTerminals: number
}

export class TerminalPerformanceMonitor extends EventEmitter {
  private terminals = new Map<string, TerminalInterface>()
  private metrics = new Map<string, TerminalPerformanceMetrics[]>()
  private alerts = new Map<string, PerformanceAlert[]>()
  private monitorInterval: NodeJS.Timeout | null = null
  private isMonitoring = false

  // Configuration
  private config = {
    monitoringInterval: 5000, // 5 seconds
    maxMetricsHistory: 100, // Keep last 100 samples per terminal
    maxAlertsHistory: 50, // Keep last 50 alerts per terminal
    thresholds: {
      memoryWarning: 50 * 1024 * 1024, // 50MB
      memoryCritical: 100 * 1024 * 1024, // 100MB
      latencyWarning: 50, // 50ms
      latencyCritical: 100, // 100ms
      bufferUtilizationWarning: 70, // 70%
      bufferUtilizationCritical: 85, // 85%
      droppedChunksWarning: 1, // 1%
      droppedChunksCritical: 5, // 5%
    },
  }

  constructor() {
    super()
    console.log(
      '[Performance Monitor] Initialized with configuration:',
      this.config
    )
  }

  /**
   * Register a terminal for monitoring
   */
  registerTerminal(
    terminalId: string,
    terminal: TerminalInterface,
    strategy: string
  ): void {
    this.terminals.set(terminalId, terminal)
    this.metrics.set(terminalId, [])
    this.alerts.set(terminalId, [])

    console.log(
      `[Performance Monitor] Registered terminal ${terminalId} with strategy ${strategy}`
    )

    // Start monitoring if not already started
    if (!this.isMonitoring) {
      this.startMonitoring()
    }
  }

  /**
   * Unregister a terminal from monitoring
   */
  unregisterTerminal(terminalId: string): void {
    this.terminals.delete(terminalId)
    this.metrics.delete(terminalId)
    this.alerts.delete(terminalId)

    console.log(`[Performance Monitor] Unregistered terminal ${terminalId}`)

    // Stop monitoring if no terminals left
    if (this.terminals.size === 0) {
      this.stopMonitoring()
    }
  }

  /**
   * Start performance monitoring
   */
  startMonitoring(): void {
    if (this.isMonitoring) {
      return
    }

    this.isMonitoring = true
    this.monitorInterval = setInterval(() => {
      this.collectMetrics()
    }, this.config.monitoringInterval)

    console.log('[Performance Monitor] Started monitoring')
    this.emit('monitoringStarted')
  }

  /**
   * Stop performance monitoring
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) {
      return
    }

    this.isMonitoring = false
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval)
      this.monitorInterval = null
    }

    console.log('[Performance Monitor] Stopped monitoring')
    this.emit('monitoringStopped')
  }

  /**
   * Collect performance metrics for all terminals
   */
  private async collectMetrics(): Promise<void> {
    const timestamp = Date.now()

    for (const [terminalId, terminal] of this.terminals) {
      try {
        const metrics = await this.collectTerminalMetrics(
          terminalId,
          terminal,
          timestamp
        )
        this.storeMetrics(terminalId, metrics)
        this.analyzeMetrics(terminalId, metrics)
      } catch (error) {
        console.error(
          `[Performance Monitor] Error collecting metrics for ${terminalId}:`,
          error
        )
      }
    }

    // Emit global performance update
    this.emit('performanceUpdate', this.getGlobalStats())
  }

  /**
   * Collect metrics for a specific terminal
   */
  private async collectTerminalMetrics(
    terminalId: string,
    terminal: TerminalInterface,
    timestamp: number
  ): Promise<TerminalPerformanceMetrics> {
    // Get buffer metrics (if available)
    let bufferHealth: {
      status: 'healthy' | 'warning' | 'critical'
      utilizationPercent: number
      averageLatency: number
      droppedChunksPercent: number
    } = {
      status: 'healthy',
      utilizationPercent: 0,
      averageLatency: 0,
      droppedChunksPercent: 0,
    }
    let bufferMetrics: {
      totalChunks: number
      totalBytes: number
      droppedChunks: number
      avgChunkSize: number
      maxBufferSize: number
      currentBufferSize: number
      processingLatency: number
    } = {
      totalChunks: 0,
      totalBytes: 0,
      droppedChunks: 0,
      avgChunkSize: 0,
      maxBufferSize: 0,
      currentBufferSize: 0,
      processingLatency: 0,
    }

    // Use type assertion with proper interface checking
    const terminalWithBuffer = terminal as TerminalInterface & {
      getBufferHealth?: () => typeof bufferHealth
      getBufferMetrics?: () => typeof bufferMetrics
    }

    if (typeof terminalWithBuffer.getBufferHealth === 'function') {
      bufferHealth = terminalWithBuffer.getBufferHealth()
    }
    if (typeof terminalWithBuffer.getBufferMetrics === 'function') {
      bufferMetrics = terminalWithBuffer.getBufferMetrics()
    }

    // Get system metrics
    const memoryUsage = process.memoryUsage()
    const cpuUsage = process.cpuUsage()

    return {
      terminalId,
      strategy: this.getTerminalStrategy(terminalId),
      bufferHealth,
      bufferMetrics,
      systemMetrics: {
        memoryUsage,
        cpuUsage,
        pid: terminal.pid,
        isRunning: terminal.isRunning,
      },
      timestamp,
    }
  }

  /**
   * Get terminal strategy from terminal instance
   */
  private getTerminalStrategy(terminalId: string): string {
    const terminal = this.terminals.get(terminalId)
    if (!terminal) return 'unknown'

    // Use class name to determine strategy
    const className = terminal.constructor.name
    if (className.includes('NodePty')) return 'node-pty'
    if (className.includes('Subprocess')) return 'subprocess'
    return 'unknown'
  }

  /**
   * Store metrics with history management
   */
  private storeMetrics(
    terminalId: string,
    metrics: TerminalPerformanceMetrics
  ): void {
    const terminalMetrics = this.metrics.get(terminalId) || []
    terminalMetrics.push(metrics)

    // Keep only recent metrics
    if (terminalMetrics.length > this.config.maxMetricsHistory) {
      terminalMetrics.shift()
    }

    this.metrics.set(terminalId, terminalMetrics)
  }

  /**
   * Analyze metrics and generate alerts
   */
  private analyzeMetrics(
    terminalId: string,
    metrics: TerminalPerformanceMetrics
  ): void {
    const alerts: PerformanceAlert[] = []

    // Check memory usage
    const heapUsed = metrics.systemMetrics.memoryUsage.heapUsed
    if (heapUsed > this.config.thresholds.memoryCritical) {
      alerts.push({
        terminalId,
        type: 'memory',
        severity: 'high',
        message: `High memory usage: ${Math.round(heapUsed / 1024 / 1024)}MB`,
        recommendation:
          'Consider reducing buffer size or closing unused terminals',
        timestamp: metrics.timestamp,
      })
    } else if (heapUsed > this.config.thresholds.memoryWarning) {
      alerts.push({
        terminalId,
        type: 'memory',
        severity: 'medium',
        message: `Elevated memory usage: ${Math.round(heapUsed / 1024 / 1024)}MB`,
        recommendation: 'Monitor memory usage and consider optimization',
        timestamp: metrics.timestamp,
      })
    }

    // Check buffer latency
    if (
      metrics.bufferHealth.averageLatency >
      this.config.thresholds.latencyCritical
    ) {
      alerts.push({
        terminalId,
        type: 'latency',
        severity: 'high',
        message: `High buffer latency: ${metrics.bufferHealth.averageLatency}ms`,
        recommendation:
          'Reduce flush interval or increase chunk processing rate',
        timestamp: metrics.timestamp,
      })
    } else if (
      metrics.bufferHealth.averageLatency >
      this.config.thresholds.latencyWarning
    ) {
      alerts.push({
        terminalId,
        type: 'latency',
        severity: 'medium',
        message: `Elevated buffer latency: ${metrics.bufferHealth.averageLatency}ms`,
        recommendation: 'Consider buffer optimization',
        timestamp: metrics.timestamp,
      })
    }

    // Check buffer utilization
    if (
      metrics.bufferHealth.utilizationPercent >
      this.config.thresholds.bufferUtilizationCritical
    ) {
      alerts.push({
        terminalId,
        type: 'buffer',
        severity: 'high',
        message: `Buffer critically full: ${metrics.bufferHealth.utilizationPercent}%`,
        recommendation: 'Increase buffer size or improve processing speed',
        timestamp: metrics.timestamp,
      })
    } else if (
      metrics.bufferHealth.utilizationPercent >
      this.config.thresholds.bufferUtilizationWarning
    ) {
      alerts.push({
        terminalId,
        type: 'buffer',
        severity: 'medium',
        message: `Buffer utilization high: ${metrics.bufferHealth.utilizationPercent}%`,
        recommendation: 'Monitor buffer usage',
        timestamp: metrics.timestamp,
      })
    }

    // Check dropped chunks
    if (
      metrics.bufferHealth.droppedChunksPercent >
      this.config.thresholds.droppedChunksCritical
    ) {
      alerts.push({
        terminalId,
        type: 'buffer',
        severity: 'high',
        message: `High data loss: ${metrics.bufferHealth.droppedChunksPercent}% chunks dropped`,
        recommendation: 'Increase buffer size or optimize processing pipeline',
        timestamp: metrics.timestamp,
      })
    } else if (
      metrics.bufferHealth.droppedChunksPercent >
      this.config.thresholds.droppedChunksWarning
    ) {
      alerts.push({
        terminalId,
        type: 'buffer',
        severity: 'medium',
        message: `Data loss detected: ${metrics.bufferHealth.droppedChunksPercent}% chunks dropped`,
        recommendation: 'Monitor and consider buffer optimization',
        timestamp: metrics.timestamp,
      })
    }

    // Store and emit alerts
    if (alerts.length > 0) {
      this.storeAlerts(terminalId, alerts)
      alerts.forEach((alert) => this.emit('alert', alert))
    }
  }

  /**
   * Store alerts with history management
   */
  private storeAlerts(terminalId: string, newAlerts: PerformanceAlert[]): void {
    const terminalAlerts = this.alerts.get(terminalId) || []
    terminalAlerts.push(...newAlerts)

    // Keep only recent alerts
    if (terminalAlerts.length > this.config.maxAlertsHistory) {
      terminalAlerts.splice(
        0,
        terminalAlerts.length - this.config.maxAlertsHistory
      )
    }

    this.alerts.set(terminalId, terminalAlerts)
  }

  /**
   * Get global performance statistics
   */
  getGlobalStats(): GlobalPerformanceStats {
    const stats: GlobalPerformanceStats = {
      totalTerminals: this.terminals.size,
      activeTerminals: 0,
      totalMemoryUsage: 0,
      averageLatency: 0,
      alertCount: 0,
      healthyTerminals: 0,
      warningTerminals: 0,
      criticalTerminals: 0,
    }

    let totalLatency = 0
    let latencyCount = 0

    for (const [terminalId, terminal] of this.terminals) {
      if (terminal.isRunning) {
        stats.activeTerminals++
      }

      const recentMetrics = this.metrics.get(terminalId)?.slice(-1)[0]
      if (recentMetrics) {
        stats.totalMemoryUsage +=
          recentMetrics.systemMetrics.memoryUsage.heapUsed
        totalLatency += recentMetrics.bufferHealth.averageLatency
        latencyCount++

        // Count health status
        switch (recentMetrics.bufferHealth.status) {
          case 'healthy':
            stats.healthyTerminals++
            break
          case 'warning':
            stats.warningTerminals++
            break
          case 'critical':
            stats.criticalTerminals++
            break
        }
      }

      const terminalAlerts = this.alerts.get(terminalId) || []
      stats.alertCount += terminalAlerts.length
    }

    if (latencyCount > 0) {
      stats.averageLatency = totalLatency / latencyCount
    }

    return stats
  }

  /**
   * Get metrics for a specific terminal
   */
  getTerminalMetrics(
    terminalId: string,
    limit: number = 10
  ): TerminalPerformanceMetrics[] {
    const metrics = this.metrics.get(terminalId) || []
    return metrics.slice(-limit)
  }

  /**
   * Get alerts for a specific terminal
   */
  getTerminalAlerts(
    terminalId: string,
    limit: number = 10
  ): PerformanceAlert[] {
    const alerts = this.alerts.get(terminalId) || []
    return alerts.slice(-limit)
  }

  /**
   * Clear metrics and alerts for a terminal
   */
  clearTerminalData(terminalId: string): void {
    this.metrics.set(terminalId, [])
    this.alerts.set(terminalId, [])
    console.log(`[Performance Monitor] Cleared data for terminal ${terminalId}`)
  }

  /**
   * Update monitoring configuration
   */
  updateConfig(newConfig: Partial<typeof this.config>): void {
    this.config = { ...this.config, ...newConfig }

    // Restart monitoring with new interval if changed
    if (newConfig.monitoringInterval && this.isMonitoring) {
      this.stopMonitoring()
      this.startMonitoring()
    }

    console.log('[Performance Monitor] Configuration updated:', newConfig)
  }

  /**
   * Export performance data for analysis
   */
  exportData(): {
    terminals: string[]
    metrics: Record<string, TerminalPerformanceMetrics[]>
    alerts: Record<string, PerformanceAlert[]>
    globalStats: GlobalPerformanceStats
  } {
    const data = {
      terminals: Array.from(this.terminals.keys()),
      metrics: Object.fromEntries(this.metrics),
      alerts: Object.fromEntries(this.alerts),
      globalStats: this.getGlobalStats(),
    }

    return data
  }

  /**
   * Cleanup and destroy monitor
   */
  destroy(): void {
    this.stopMonitoring()
    this.terminals.clear()
    this.metrics.clear()
    this.alerts.clear()
    this.removeAllListeners()
    console.log('[Performance Monitor] Destroyed')
  }
}

// Export singleton instance
export const terminalPerformanceMonitor = new TerminalPerformanceMonitor()
