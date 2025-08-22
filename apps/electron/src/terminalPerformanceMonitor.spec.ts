/**
 * @fileoverview Comprehensive tests for Terminal Performance Monitor functionality
 *
 * @description
 * Tests for the terminal performance monitoring system:
 * - Terminal registration and unregistration
 * - Performance metrics collection and analysis
 * - Alert generation and management
 * - Global statistics calculation
 * - Configuration updates and monitoring lifecycle
 * - Data export and cleanup functionality
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 */

import { EventEmitter } from 'node:events'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Mock modules with hoisted functions
const { mockProcess } = vi.hoisted(() => ({
  mockProcess: {
    memoryUsage: vi.fn(),
    cpuUsage: vi.fn(),
  },
}))

// Mock Node.js process functions
vi.mock('node:process', () => ({
  memoryUsage: mockProcess.memoryUsage,
  cpuUsage: mockProcess.cpuUsage,
}))

// Mock terminal interface
interface MockTerminalInterface {
  pid?: number
  isRunning: boolean
  getBufferHealth?: () => {
    status: 'healthy' | 'warning' | 'critical'
    utilizationPercent: number
    averageLatency: number
    droppedChunksPercent: number
  }
  getBufferMetrics?: () => {
    totalChunks: number
    totalBytes: number
    droppedChunks: number
    avgChunkSize: number
    maxBufferSize: number
    currentBufferSize: number
    processingLatency: number
  }
  constructor: { name: string }
}

describe('TerminalPerformanceMonitor', () => {
  let performanceMonitor: InstanceType<
    typeof import('./terminalPerformanceMonitor').TerminalPerformanceMonitor
  >
  let mockTerminal: MockTerminalInterface
  let originalConsoleLog: typeof console.log
  let originalConsoleError: typeof console.error

  beforeEach(async () => {
    // Store originals
    originalConsoleLog = console.log
    originalConsoleError = console.error

    // Mock console methods
    console.log = vi.fn()
    console.error = vi.fn()

    // Mock timers - use vi's fake timers instead of overriding globals
    vi.useFakeTimers()

    // Don't override global.setInterval/clearInterval when using fake timers
    // vi.useFakeTimers() already handles this

    // Setup default process mocks
    mockProcess.memoryUsage.mockReturnValue({
      rss: 50 * 1024 * 1024,
      heapTotal: 40 * 1024 * 1024,
      heapUsed: 30 * 1024 * 1024,
      external: 10 * 1024 * 1024,
      arrayBuffers: 5 * 1024 * 1024,
    })
    mockProcess.cpuUsage.mockReturnValue({
      user: 1000,
      system: 500,
    })

    // Override global process methods
    vi.spyOn(process, 'memoryUsage').mockImplementation(mockProcess.memoryUsage)
    vi.spyOn(process, 'cpuUsage').mockImplementation(mockProcess.cpuUsage)

    // Create mock terminal
    mockTerminal = {
      pid: 1234,
      isRunning: true,
      constructor: { name: 'NodePtyTerminal' },
      getBufferHealth: vi.fn().mockReturnValue({
        status: 'healthy',
        utilizationPercent: 45,
        averageLatency: 25,
        droppedChunksPercent: 0,
      }),
      getBufferMetrics: vi.fn().mockReturnValue({
        totalChunks: 100,
        totalBytes: 10240,
        droppedChunks: 0,
        avgChunkSize: 102.4,
        maxBufferSize: 65536,
        currentBufferSize: 5120,
        processingLatency: 15,
      }),
    }

    vi.clearAllMocks()
  })

  afterEach(() => {
    // Restore console methods
    console.log = originalConsoleLog
    console.error = originalConsoleError

    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  describe('Module Import and Class Instantiation', () => {
    it('should import and create TerminalPerformanceMonitor instance', async () => {
      const { TerminalPerformanceMonitor } = await import(
        './terminalPerformanceMonitor'
      )
      const monitor = new TerminalPerformanceMonitor()

      expect(monitor).toBeInstanceOf(TerminalPerformanceMonitor)
      expect(monitor).toBeInstanceOf(EventEmitter)
    })

    it('should create singleton instance', async () => {
      const { terminalPerformanceMonitor } = await import(
        './terminalPerformanceMonitor'
      )

      expect(terminalPerformanceMonitor).toBeDefined()
      expect(terminalPerformanceMonitor.constructor.name).toBe(
        'TerminalPerformanceMonitor'
      )
    })

    it('should initialize with default configuration', async () => {
      const { TerminalPerformanceMonitor } = await import(
        './terminalPerformanceMonitor'
      )
      new TerminalPerformanceMonitor()

      expect(console.log).toHaveBeenCalledWith(
        '[Performance Monitor] Initialized with configuration:',
        expect.objectContaining({
          monitoringInterval: 5000,
          maxMetricsHistory: 100,
          maxAlertsHistory: 50,
          thresholds: expect.objectContaining({
            memoryWarning: 50 * 1024 * 1024,
            memoryCritical: 100 * 1024 * 1024,
          }),
        })
      )
    })
  })

  describe('Terminal Registration and Management', () => {
    beforeEach(async () => {
      const { TerminalPerformanceMonitor } = await import(
        './terminalPerformanceMonitor'
      )
      performanceMonitor = new TerminalPerformanceMonitor()
      vi.clearAllMocks()
    })

    it('should register terminal successfully', () => {
      performanceMonitor.registerTerminal(
        'terminal-1',
        mockTerminal,
        'node-pty'
      )

      expect(console.log).toHaveBeenCalledWith(
        '[Performance Monitor] Registered terminal terminal-1 with strategy node-pty'
      )
      expect(console.log).toHaveBeenCalledWith(
        '[Performance Monitor] Started monitoring'
      )
    })

    it('should unregister terminal successfully', () => {
      performanceMonitor.registerTerminal(
        'terminal-1',
        mockTerminal,
        'node-pty'
      )
      vi.clearAllMocks()

      performanceMonitor.unregisterTerminal('terminal-1')

      expect(console.log).toHaveBeenCalledWith(
        '[Performance Monitor] Unregistered terminal terminal-1'
      )
      expect(console.log).toHaveBeenCalledWith(
        '[Performance Monitor] Stopped monitoring'
      )
    })

    it('should not start monitoring if already monitoring', () => {
      performanceMonitor.registerTerminal(
        'terminal-1',
        mockTerminal,
        'node-pty'
      )
      vi.clearAllMocks()

      performanceMonitor.startMonitoring()

      expect(console.log).not.toHaveBeenCalledWith(
        '[Performance Monitor] Started monitoring'
      )
    })

    it('should not stop monitoring if not monitoring', () => {
      performanceMonitor.stopMonitoring()

      expect(console.log).not.toHaveBeenCalledWith(
        '[Performance Monitor] Stopped monitoring'
      )
    })

    it('should handle multiple terminal registrations', () => {
      const mockTerminal2 = { ...mockTerminal, pid: 5678 }

      performanceMonitor.registerTerminal(
        'terminal-1',
        mockTerminal,
        'node-pty'
      )
      performanceMonitor.registerTerminal(
        'terminal-2',
        mockTerminal2,
        'subprocess'
      )

      expect(console.log).toHaveBeenCalledWith(
        '[Performance Monitor] Registered terminal terminal-1 with strategy node-pty'
      )
      expect(console.log).toHaveBeenCalledWith(
        '[Performance Monitor] Registered terminal terminal-2 with strategy subprocess'
      )
    })
  })

  describe('Performance Monitoring Lifecycle', () => {
    beforeEach(async () => {
      const { TerminalPerformanceMonitor } = await import(
        './terminalPerformanceMonitor'
      )
      performanceMonitor = new TerminalPerformanceMonitor()
      vi.clearAllMocks()
    })

    it('should start monitoring and emit event', () => {
      const startedSpy = vi.fn()
      performanceMonitor.on('monitoringStarted', startedSpy)

      performanceMonitor.startMonitoring()

      expect(vi.getTimerCount()).toBeGreaterThan(0)
      expect(startedSpy).toHaveBeenCalled()
    })

    it('should stop monitoring and emit event', () => {
      const stoppedSpy = vi.fn()
      performanceMonitor.on('monitoringStopped', stoppedSpy)

      performanceMonitor.startMonitoring()
      const timerCountBefore = vi.getTimerCount()
      performanceMonitor.stopMonitoring()

      expect(vi.getTimerCount()).toBeLessThan(timerCountBefore)
      expect(stoppedSpy).toHaveBeenCalled()
    })

    it('should collect metrics periodically', async () => {
      const updateSpy = vi.fn()
      performanceMonitor.on('performanceUpdate', updateSpy)

      performanceMonitor.registerTerminal(
        'terminal-1',
        mockTerminal,
        'node-pty'
      )

      // Advance timer to trigger metrics collection
      vi.advanceTimersByTime(5000)
      await vi.runOnlyPendingTimersAsync()

      expect(updateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          totalTerminals: 1,
          activeTerminals: 1,
        })
      )
    })
  })

  describe('Metrics Collection and Analysis', () => {
    beforeEach(async () => {
      const { TerminalPerformanceMonitor } = await import(
        './terminalPerformanceMonitor'
      )
      performanceMonitor = new TerminalPerformanceMonitor()
      performanceMonitor.registerTerminal(
        'terminal-1',
        mockTerminal,
        'node-pty'
      )
      vi.clearAllMocks()
    })

    it('should collect terminal metrics correctly', async () => {
      // Trigger metrics collection manually
      await performanceMonitor.collectMetrics()

      const metrics = performanceMonitor.getTerminalMetrics('terminal-1', 1)
      expect(metrics).toHaveLength(1)
      expect(metrics[0]).toMatchObject({
        terminalId: 'terminal-1',
        strategy: 'node-pty',
        bufferHealth: {
          status: 'healthy',
          utilizationPercent: 45,
          averageLatency: 25,
          droppedChunksPercent: 0,
        },
        systemMetrics: {
          memoryUsage: expect.objectContaining({
            heapUsed: 30 * 1024 * 1024,
          }),
          pid: 1234,
          isRunning: true,
        },
      })
    })

    it('should handle terminal without buffer methods', async () => {
      const simpleTerminal = {
        pid: 9999,
        isRunning: true,
        constructor: { name: 'SimpleTerminal' },
      }

      performanceMonitor.registerTerminal(
        'terminal-2',
        simpleTerminal,
        'simple'
      )
      await performanceMonitor.collectMetrics()

      const metrics = performanceMonitor.getTerminalMetrics('terminal-2', 1)
      expect(metrics).toHaveLength(1)
      expect(metrics[0].bufferHealth).toEqual({
        status: 'healthy',
        utilizationPercent: 0,
        averageLatency: 0,
        droppedChunksPercent: 0,
      })
    })

    it('should detect terminal strategy from constructor name', async () => {
      const subprocessTerminal = {
        ...mockTerminal,
        constructor: { name: 'SubprocessTerminal' },
      }

      performanceMonitor.registerTerminal(
        'terminal-subprocess',
        subprocessTerminal,
        'subprocess'
      )
      await performanceMonitor.collectMetrics()

      const metrics = performanceMonitor.getTerminalMetrics(
        'terminal-subprocess',
        1
      )
      expect(metrics[0].strategy).toBe('subprocess')
    })

    it('should handle metrics collection errors gracefully', async () => {
      // Mock terminal that throws error in getBufferHealth
      const errorTerminal = {
        ...mockTerminal,
        getBufferHealth: vi.fn().mockImplementation(() => {
          throw new Error('Buffer error')
        }),
      }

      performanceMonitor.registerTerminal(
        'error-terminal',
        errorTerminal,
        'error'
      )
      await performanceMonitor.collectMetrics()

      expect(console.error).toHaveBeenCalledWith(
        '[Performance Monitor] Error collecting metrics for error-terminal:',
        expect.any(Error)
      )
    })
  })

  describe('Alert Generation and Management', () => {
    beforeEach(async () => {
      const { TerminalPerformanceMonitor } = await import(
        './terminalPerformanceMonitor'
      )
      performanceMonitor = new TerminalPerformanceMonitor()
      vi.clearAllMocks()
    })

    it('should generate memory warning alert', async () => {
      const alertSpy = vi.fn()
      performanceMonitor.on('alert', alertSpy)

      // Set high memory usage
      mockProcess.memoryUsage.mockReturnValue({
        rss: 80 * 1024 * 1024,
        heapTotal: 70 * 1024 * 1024,
        heapUsed: 60 * 1024 * 1024, // Above warning threshold
        external: 10 * 1024 * 1024,
        arrayBuffers: 5 * 1024 * 1024,
      })

      performanceMonitor.registerTerminal(
        'terminal-1',
        mockTerminal,
        'node-pty'
      )
      await performanceMonitor.collectMetrics()

      expect(alertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          terminalId: 'terminal-1',
          type: 'memory',
          severity: 'medium',
          message: expect.stringContaining('Elevated memory usage'),
        })
      )
    })

    it('should generate critical memory alert', async () => {
      const alertSpy = vi.fn()
      performanceMonitor.on('alert', alertSpy)

      // Set critical memory usage
      mockProcess.memoryUsage.mockReturnValue({
        rss: 150 * 1024 * 1024,
        heapTotal: 140 * 1024 * 1024,
        heapUsed: 120 * 1024 * 1024, // Above critical threshold
        external: 10 * 1024 * 1024,
        arrayBuffers: 5 * 1024 * 1024,
      })

      performanceMonitor.registerTerminal(
        'terminal-1',
        mockTerminal,
        'node-pty'
      )
      await performanceMonitor.collectMetrics()

      expect(alertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          terminalId: 'terminal-1',
          type: 'memory',
          severity: 'high',
          message: expect.stringContaining('High memory usage'),
        })
      )
    })

    it('should generate latency warning alert', async () => {
      const alertSpy = vi.fn()
      performanceMonitor.on('alert', alertSpy)

      // Set high latency in mock terminal
      mockTerminal.getBufferHealth = vi.fn().mockReturnValue({
        status: 'warning',
        utilizationPercent: 45,
        averageLatency: 75, // Above warning threshold
        droppedChunksPercent: 0,
      })

      performanceMonitor.registerTerminal(
        'terminal-1',
        mockTerminal,
        'node-pty'
      )
      await performanceMonitor.collectMetrics()

      expect(alertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          terminalId: 'terminal-1',
          type: 'latency',
          severity: 'medium',
          message: expect.stringContaining('Elevated buffer latency'),
        })
      )
    })

    it('should generate buffer utilization alert', async () => {
      const alertSpy = vi.fn()
      performanceMonitor.on('alert', alertSpy)

      // Set high buffer utilization
      mockTerminal.getBufferHealth = vi.fn().mockReturnValue({
        status: 'warning',
        utilizationPercent: 90, // Above critical threshold
        averageLatency: 25,
        droppedChunksPercent: 0,
      })

      performanceMonitor.registerTerminal(
        'terminal-1',
        mockTerminal,
        'node-pty'
      )
      await performanceMonitor.collectMetrics()

      expect(alertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          terminalId: 'terminal-1',
          type: 'buffer',
          severity: 'high',
          message: expect.stringContaining('Buffer critically full'),
        })
      )
    })

    it('should generate dropped chunks alert', async () => {
      const alertSpy = vi.fn()
      performanceMonitor.on('alert', alertSpy)

      // Set high dropped chunks
      mockTerminal.getBufferHealth = vi.fn().mockReturnValue({
        status: 'critical',
        utilizationPercent: 45,
        averageLatency: 25,
        droppedChunksPercent: 6, // Above critical threshold
      })

      performanceMonitor.registerTerminal(
        'terminal-1',
        mockTerminal,
        'node-pty'
      )
      await performanceMonitor.collectMetrics()

      expect(alertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          terminalId: 'terminal-1',
          type: 'buffer',
          severity: 'high',
          message: expect.stringContaining('High data loss'),
        })
      )
    })

    it('should store and retrieve alerts correctly', async () => {
      // Generate an alert
      mockProcess.memoryUsage.mockReturnValue({
        rss: 80 * 1024 * 1024,
        heapTotal: 70 * 1024 * 1024,
        heapUsed: 60 * 1024 * 1024,
        external: 10 * 1024 * 1024,
        arrayBuffers: 5 * 1024 * 1024,
      })

      performanceMonitor.registerTerminal(
        'terminal-1',
        mockTerminal,
        'node-pty'
      )
      await performanceMonitor.collectMetrics()

      const alerts = performanceMonitor.getTerminalAlerts('terminal-1')
      expect(alerts).toHaveLength(1)
      expect(alerts[0]).toMatchObject({
        terminalId: 'terminal-1',
        type: 'memory',
        severity: 'medium',
      })
    })
  })

  describe('Global Statistics', () => {
    beforeEach(async () => {
      const { TerminalPerformanceMonitor } = await import(
        './terminalPerformanceMonitor'
      )
      performanceMonitor = new TerminalPerformanceMonitor()
      vi.clearAllMocks()
    })

    it('should calculate global statistics correctly', async () => {
      const terminal2 = { ...mockTerminal, pid: 5678, isRunning: false }

      performanceMonitor.registerTerminal(
        'terminal-1',
        mockTerminal,
        'node-pty'
      )
      performanceMonitor.registerTerminal('terminal-2', terminal2, 'subprocess')
      await performanceMonitor.collectMetrics()

      const stats = performanceMonitor.getGlobalStats()
      expect(stats).toMatchObject({
        totalTerminals: 2,
        activeTerminals: 1, // Only terminal-1 is running
        totalMemoryUsage: 60 * 1024 * 1024, // 30MB * 2 terminals
        averageLatency: 25,
        healthyTerminals: 2,
        warningTerminals: 0,
        criticalTerminals: 0,
      })
    })

    it('should handle empty statistics correctly', () => {
      const stats = performanceMonitor.getGlobalStats()
      expect(stats).toMatchObject({
        totalTerminals: 0,
        activeTerminals: 0,
        totalMemoryUsage: 0,
        averageLatency: 0,
        alertCount: 0,
        healthyTerminals: 0,
        warningTerminals: 0,
        criticalTerminals: 0,
      })
    })
  })

  describe('Configuration Management', () => {
    beforeEach(async () => {
      const { TerminalPerformanceMonitor } = await import(
        './terminalPerformanceMonitor'
      )
      performanceMonitor = new TerminalPerformanceMonitor()
      vi.clearAllMocks()
    })

    it('should update configuration correctly', () => {
      const newConfig = {
        monitoringInterval: 3000,
        maxMetricsHistory: 50,
        thresholds: {
          memoryWarning: 25 * 1024 * 1024,
        },
      }

      performanceMonitor.updateConfig(newConfig)

      expect(console.log).toHaveBeenCalledWith(
        '[Performance Monitor] Configuration updated:',
        newConfig
      )
    })

    it('should restart monitoring when interval changes', () => {
      performanceMonitor.startMonitoring()
      expect(vi.getTimerCount()).toBeGreaterThan(0)

      performanceMonitor.updateConfig({ monitoringInterval: 3000 })

      // Should have restarted monitoring with new interval
      expect(vi.getTimerCount()).toBeGreaterThan(0)
    })
  })

  describe('Data Management and Export', () => {
    beforeEach(async () => {
      const { TerminalPerformanceMonitor } = await import(
        './terminalPerformanceMonitor'
      )
      performanceMonitor = new TerminalPerformanceMonitor()
      vi.clearAllMocks()
    })

    it('should export data correctly', async () => {
      performanceMonitor.registerTerminal(
        'terminal-1',
        mockTerminal,
        'node-pty'
      )
      await performanceMonitor.collectMetrics()

      const exportData = performanceMonitor.exportData()
      expect(exportData).toMatchObject({
        terminals: ['terminal-1'],
        metrics: expect.objectContaining({
          'terminal-1': expect.arrayContaining([
            expect.objectContaining({
              terminalId: 'terminal-1',
              strategy: 'node-pty',
            }),
          ]),
        }),
        alerts: expect.any(Object),
        globalStats: expect.objectContaining({
          totalTerminals: 1,
        }),
      })
    })

    it('should clear terminal data correctly', async () => {
      performanceMonitor.registerTerminal(
        'terminal-1',
        mockTerminal,
        'node-pty'
      )
      await performanceMonitor.collectMetrics()

      performanceMonitor.clearTerminalData('terminal-1')

      expect(console.log).toHaveBeenCalledWith(
        '[Performance Monitor] Cleared data for terminal terminal-1'
      )

      const metrics = performanceMonitor.getTerminalMetrics('terminal-1')
      const alerts = performanceMonitor.getTerminalAlerts('terminal-1')
      expect(metrics).toHaveLength(0)
      expect(alerts).toHaveLength(0)
    })

    it('should limit metrics history correctly', async () => {
      performanceMonitor.registerTerminal(
        'terminal-1',
        mockTerminal,
        'node-pty'
      )

      // Collect more metrics than the limit
      for (let i = 0; i < 110; i++) {
        await performanceMonitor.collectMetrics()
      }

      const metrics = performanceMonitor.getTerminalMetrics('terminal-1', 200)
      expect(metrics.length).toBeLessThanOrEqual(100) // maxMetricsHistory
    })

    it('should limit alerts history correctly', async () => {
      // Set high memory to generate alerts
      mockProcess.memoryUsage.mockReturnValue({
        rss: 80 * 1024 * 1024,
        heapTotal: 70 * 1024 * 1024,
        heapUsed: 60 * 1024 * 1024,
        external: 10 * 1024 * 1024,
        arrayBuffers: 5 * 1024 * 1024,
      })

      performanceMonitor.registerTerminal(
        'terminal-1',
        mockTerminal,
        'node-pty'
      )

      // Generate many alerts
      for (let i = 0; i < 60; i++) {
        await performanceMonitor.collectMetrics()
      }

      const alerts = performanceMonitor.getTerminalAlerts('terminal-1', 100)
      expect(alerts.length).toBeLessThanOrEqual(50) // maxAlertsHistory
    })
  })

  describe('Cleanup and Destruction', () => {
    beforeEach(async () => {
      const { TerminalPerformanceMonitor } = await import(
        './terminalPerformanceMonitor'
      )
      performanceMonitor = new TerminalPerformanceMonitor()
      vi.clearAllMocks()
    })

    it('should destroy monitor correctly', () => {
      performanceMonitor.registerTerminal(
        'terminal-1',
        mockTerminal,
        'node-pty'
      )
      performanceMonitor.startMonitoring()

      const removeAllListenersSpy = vi.spyOn(
        performanceMonitor,
        'removeAllListeners'
      )

      performanceMonitor.destroy()

      expect(console.log).toHaveBeenCalledWith(
        '[Performance Monitor] Destroyed'
      )
      expect(removeAllListenersSpy).toHaveBeenCalled()
    })

    it('should handle destroy when not monitoring', () => {
      performanceMonitor.destroy()

      expect(console.log).toHaveBeenCalledWith(
        '[Performance Monitor] Destroyed'
      )
    })
  })

  describe('Error Handling and Edge Cases', () => {
    beforeEach(async () => {
      const { TerminalPerformanceMonitor } = await import(
        './terminalPerformanceMonitor'
      )
      performanceMonitor = new TerminalPerformanceMonitor()
      vi.clearAllMocks()
    })

    it('should handle metrics for unknown terminal strategy', async () => {
      const unknownTerminal = {
        ...mockTerminal,
        constructor: { name: 'UnknownTerminal' },
      }

      performanceMonitor.registerTerminal(
        'unknown-terminal',
        unknownTerminal,
        'unknown'
      )
      await performanceMonitor.collectMetrics()

      const metrics = performanceMonitor.getTerminalMetrics(
        'unknown-terminal',
        1
      )
      expect(metrics[0].strategy).toBe('unknown')
    })

    it('should handle process.memoryUsage() errors', async () => {
      mockProcess.memoryUsage.mockImplementation(() => {
        throw new Error('Memory usage error')
      })

      performanceMonitor.registerTerminal(
        'terminal-1',
        mockTerminal,
        'node-pty'
      )
      await performanceMonitor.collectMetrics()

      expect(console.error).toHaveBeenCalledWith(
        '[Performance Monitor] Error collecting metrics for terminal-1:',
        expect.any(Error)
      )
    })

    it('should handle process.cpuUsage() errors', async () => {
      mockProcess.cpuUsage.mockImplementation(() => {
        throw new Error('CPU usage error')
      })

      performanceMonitor.registerTerminal(
        'terminal-1',
        mockTerminal,
        'node-pty'
      )
      await performanceMonitor.collectMetrics()

      expect(console.error).toHaveBeenCalledWith(
        '[Performance Monitor] Error collecting metrics for terminal-1:',
        expect.any(Error)
      )
    })

    it('should handle terminal without required properties', async () => {
      const invalidTerminal = {
        constructor: { name: 'InvalidTerminal' },
        // Missing pid, isRunning properties
      } as MockTerminalInterface

      performanceMonitor.registerTerminal(
        'invalid-terminal',
        invalidTerminal,
        'invalid'
      )
      await performanceMonitor.collectMetrics()

      const metrics = performanceMonitor.getTerminalMetrics(
        'invalid-terminal',
        1
      )
      expect(metrics[0]).toMatchObject({
        terminalId: 'invalid-terminal',
        systemMetrics: {
          pid: undefined,
          isRunning: undefined,
        },
      })
    })

    it('should handle getTerminalMetrics with non-existent terminal', () => {
      const metrics = performanceMonitor.getTerminalMetrics('non-existent')
      expect(metrics).toEqual([])
    })

    it('should handle getTerminalAlerts with non-existent terminal', () => {
      const alerts = performanceMonitor.getTerminalAlerts('non-existent')
      expect(alerts).toEqual([])
    })

    it('should handle limit parameters correctly', async () => {
      performanceMonitor.registerTerminal(
        'terminal-1',
        mockTerminal,
        'node-pty'
      )

      // Collect some metrics
      for (let i = 0; i < 5; i++) {
        await performanceMonitor.collectMetrics()
      }

      const metrics = performanceMonitor.getTerminalMetrics('terminal-1', 3)
      expect(metrics).toHaveLength(3)

      const allMetrics = performanceMonitor.getTerminalMetrics('terminal-1')
      expect(allMetrics).toHaveLength(5)
    })
  })

  describe('Event Emission Testing', () => {
    beforeEach(async () => {
      const { TerminalPerformanceMonitor } = await import(
        './terminalPerformanceMonitor'
      )
      performanceMonitor = new TerminalPerformanceMonitor()
      vi.clearAllMocks()
    })

    it('should emit performanceUpdate events correctly', async () => {
      const updateSpy = vi.fn()
      performanceMonitor.on('performanceUpdate', updateSpy)

      performanceMonitor.registerTerminal(
        'terminal-1',
        mockTerminal,
        'node-pty'
      )
      await performanceMonitor.collectMetrics()

      expect(updateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          totalTerminals: 1,
          activeTerminals: 1,
        })
      )
    })

    it('should emit multiple alert events correctly', async () => {
      const alertSpy = vi.fn()
      performanceMonitor.on('alert', alertSpy)

      // Set conditions for multiple alerts
      mockProcess.memoryUsage.mockReturnValue({
        rss: 150 * 1024 * 1024,
        heapTotal: 140 * 1024 * 1024,
        heapUsed: 120 * 1024 * 1024, // High memory
        external: 10 * 1024 * 1024,
        arrayBuffers: 5 * 1024 * 1024,
      })

      mockTerminal.getBufferHealth = vi.fn().mockReturnValue({
        status: 'critical',
        utilizationPercent: 90, // High utilization
        averageLatency: 110, // High latency
        droppedChunksPercent: 6, // High drops
      })

      performanceMonitor.registerTerminal(
        'terminal-1',
        mockTerminal,
        'node-pty'
      )
      await performanceMonitor.collectMetrics()

      expect(alertSpy).toHaveBeenCalledTimes(4) // Memory, latency, buffer util, drops
    })
  })
})
