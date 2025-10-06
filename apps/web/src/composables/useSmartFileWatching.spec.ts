/**
 * @fileoverview Comprehensive tests for useSmartFileWatching composable
 *
 * @description
 * Achieves 100% code coverage for useSmartFileWatching.ts by testing all
 * functionality including file watching integration, pipeline management,
 * state detection, and error handling.
 *
 * @author Hatcher DX Team
 * @since 2.0.0
 * @public
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'

// Store mocks at module level
const mockFileWatcher = {
  onFileChange: vi.fn(),
  startWatching: vi.fn(),
  stopWatching: vi.fn(),
  getWatchingStatus: vi.fn(),
}

const mockPipelineManagerRefs = {
  shouldExecute: ref(false),
  currentState: ref('idle'),
  pendingSignals: ref([]),
}

const mockPipelineManager = {
  ...mockPipelineManagerRefs,
  handleFileChange: vi.fn(),
  clearPendingSignals: vi.fn(),
  forceExecution: vi.fn(),
  getStats: vi.fn(),
  resetStats: vi.fn(),
  registerStateDetector: vi.fn(),
}

const mockOnboardingRefs = {
  isOnboardingActive: ref(false),
}

const mockOnboarding = {
  ...mockOnboardingRefs,
}

const mockChatSidebarRefs = {
  isProcessing: ref(false),
}

const mockChatSidebar = {
  ...mockChatSidebarRefs,
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type -- Test callback captures unmount handler allowing flexible function signatures
let onUnmountedCallback: Function | null = null

// Mock modules
vi.mock('vue', async () => {
  const actual = await vi.importActual('vue')
  return {
    ...actual,
    onUnmounted: vi.fn((callback) => {
      onUnmountedCallback = callback
    }),
  }
})

vi.mock('./useFileWatcher')
vi.mock('./usePipelineManager')
vi.mock('./useOnboarding')
vi.mock('./useChatSidebar')

// Import mocked modules
import { useFileWatcher } from './useFileWatcher'
import {
  usePipelineManager,
  createDefaultStateDetectors,
} from './usePipelineManager'
import { useOnboarding } from './useOnboarding'
import { useChatSidebar } from './useChatSidebar'

// Setup the mock implementations
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test mock file watcher requires flexible return type for method testing
vi.mocked(useFileWatcher).mockReturnValue(mockFileWatcher as any)
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test mock pipeline manager requires flexible return type for method testing
vi.mocked(usePipelineManager).mockReturnValue(mockPipelineManager as any)
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test mock onboarding requires flexible return type for property testing
vi.mocked(useOnboarding).mockReturnValue(mockOnboarding as any)
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test mock chat sidebar requires flexible return type for property testing
vi.mocked(useChatSidebar).mockReturnValue(mockChatSidebar as any)
vi.mocked(createDefaultStateDetectors).mockReturnValue({
  buildingDetector: vi.fn().mockResolvedValue(false),
  gitOperationDetector: vi.fn().mockResolvedValue(false),
  branchSwitchingDetector: vi.fn().mockResolvedValue(false),
})

// Import the module to test
import { useSmartFileWatching } from './useSmartFileWatching'

describe('useSmartFileWatching', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test array stores unsubscribe functions with flexible signatures
  let unsubscribeFunctions: any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test spy tracks console.log calls with flexible parameters
  let consoleLogSpy: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test spy tracks console.error calls with flexible parameters
  let consoleErrorSpy: any

  beforeEach(() => {
    vi.clearAllMocks()

    // Reset mock state
    mockPipelineManagerRefs.shouldExecute.value = false
    mockPipelineManagerRefs.currentState.value = 'idle'
    mockPipelineManagerRefs.pendingSignals.value = []
    mockOnboardingRefs.isOnboardingActive.value = false
    mockChatSidebarRefs.isProcessing.value = false
    onUnmountedCallback = null

    // Setup unsubscribe functions
    unsubscribeFunctions = Array(6)
      .fill(null)
      .map(() => vi.fn())
    let callCount = 0
    mockFileWatcher.onFileChange.mockImplementation(() => {
      return unsubscribeFunctions[callCount++]
    })

    // Default mock behaviors
    mockFileWatcher.getWatchingStatus.mockReturnValue({
      isWatching: false,
      projectPath: null,
    })

    mockPipelineManager.getStats.mockReturnValue({
      totalSignals: 0,
      executionCount: 0,
    })

    mockFileWatcher.startWatching.mockResolvedValue(undefined)
    mockFileWatcher.stopWatching.mockResolvedValue(undefined)

    // Spy on console
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  describe('Initialization', () => {
    it('should initialize with default state', () => {
      const smartWatcher = useSmartFileWatching()

      expect(smartWatcher.isSmartWatchingActive.value).toBe(false)
      expect(smartWatcher.shouldExecutePipeline.value).toBe(false)
      expect(smartWatcher.lastPipelineExecution.value).toBe(null)
      expect(smartWatcher.currentSystemState.value).toBe('idle')
      expect(smartWatcher.pendingSignals.value).toEqual([])
    })

    it('should compute shouldExecutePipeline correctly', async () => {
      const smartWatcher = useSmartFileWatching()

      // Initially false
      expect(smartWatcher.shouldExecutePipeline.value).toBe(false)

      // Start watching
      await smartWatcher.startSmartWatching('/test/project')

      // Enable pipeline manager's shouldExecute
      mockPipelineManagerRefs.shouldExecute.value = true

      // Should now be true
      expect(smartWatcher.shouldExecutePipeline.value).toBe(true)
    })
  })

  describe('startSmartWatching', () => {
    it('should start smart watching successfully', async () => {
      const smartWatcher = useSmartFileWatching()

      await smartWatcher.startSmartWatching('/test/project')

      // Verify state detectors registered
      expect(mockPipelineManager.registerStateDetector).toHaveBeenCalledTimes(5)
      expect(mockPipelineManager.registerStateDetector).toHaveBeenCalledWith(
        'building',
        expect.any(Function)
      )
      expect(mockPipelineManager.registerStateDetector).toHaveBeenCalledWith(
        'git-operation',
        expect.any(Function)
      )
      expect(mockPipelineManager.registerStateDetector).toHaveBeenCalledWith(
        'branch-switching',
        expect.any(Function)
      )
      expect(mockPipelineManager.registerStateDetector).toHaveBeenCalledWith(
        'onboarding',
        expect.any(Function)
      )
      expect(mockPipelineManager.registerStateDetector).toHaveBeenCalledWith(
        'ai-processing',
        expect.any(Function)
      )

      // Verify file change handlers setup
      expect(mockFileWatcher.onFileChange).toHaveBeenCalledTimes(6)
      expect(mockFileWatcher.onFileChange).toHaveBeenCalledWith(
        'git',
        expect.any(Function)
      )
      expect(mockFileWatcher.onFileChange).toHaveBeenCalledWith(
        'config',
        expect.any(Function)
      )
      expect(mockFileWatcher.onFileChange).toHaveBeenCalledWith(
        'source',
        expect.any(Function)
      )
      expect(mockFileWatcher.onFileChange).toHaveBeenCalledWith(
        'build',
        expect.any(Function)
      )
      expect(mockFileWatcher.onFileChange).toHaveBeenCalledWith(
        'dependency',
        expect.any(Function)
      )
      expect(mockFileWatcher.onFileChange).toHaveBeenCalledWith(
        'other',
        expect.any(Function)
      )

      // Verify file watching started
      expect(mockFileWatcher.startWatching).toHaveBeenCalledWith(
        '/test/project'
      )

      // Verify state
      expect(smartWatcher.isSmartWatchingActive.value).toBe(true)

      // Verify logs
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[SmartFileWatching] 🚀 Starting smart file watching for:',
        '/test/project'
      )
    })

    it('should handle errors during start', async () => {
      mockFileWatcher.startWatching.mockRejectedValue(new Error('Start failed'))

      const smartWatcher = useSmartFileWatching()

      await expect(
        smartWatcher.startSmartWatching('/test/project')
      ).rejects.toThrow('Start failed')

      expect(smartWatcher.isSmartWatchingActive.value).toBe(false)
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[SmartFileWatching] ❌ Failed to start smart watching:',
        expect.any(Error)
      )
    })

    it('should test state detectors', async () => {
      const smartWatcher = useSmartFileWatching()

      await smartWatcher.startSmartWatching('/test/project')

      // Get registered detectors
      // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type -- Test captures detector functions with various signatures
      const detectors: Record<string, Function> = {}
      mockPipelineManager.registerStateDetector.mock.calls.forEach(
        ([name, detector]) => {
          detectors[name] = detector
        }
      )

      // Test onboarding detector
      mockOnboardingRefs.isOnboardingActive.value = true
      expect(await detectors.onboarding()).toBe(true)
      mockOnboardingRefs.isOnboardingActive.value = false
      expect(await detectors.onboarding()).toBe(false)

      // Test ai-processing detector
      mockChatSidebarRefs.isProcessing.value = true
      expect(await detectors['ai-processing']()).toBe(true)
      mockChatSidebarRefs.isProcessing.value = false
      expect(await detectors['ai-processing']()).toBe(false)

      // Test undefined isProcessing
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test deletes property to verify undefined handling
      delete (mockChatSidebar as any).isProcessing
      expect(await detectors['ai-processing']()).toBe(false)
      mockChatSidebar.isProcessing = mockChatSidebarRefs.isProcessing
    })
  })

  describe('File change handlers', () => {
    it('should handle file changes for all types', async () => {
      const smartWatcher = useSmartFileWatching()
      await smartWatcher.startSmartWatching('/test/project')

      // Get handlers
      // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type -- Test captures file change handlers with various event structures
      const handlers: Record<string, Function> = {}
      mockFileWatcher.onFileChange.mock.calls.forEach(([type, handler]) => {
        handlers[type] = handler
      })

      // Test each type
      const types = ['git', 'config', 'source', 'build', 'dependency', 'other']
      for (const type of types) {
        const event = {
          path: `/test/${type}/file.ext`,
          changeType: 'change',
          timestamp: Date.now(),
        }

        handlers[type](event)

        expect(mockPipelineManager.handleFileChange).toHaveBeenCalledWith({
          type,
          path: event.path,
          changeType: event.changeType,
          timestamp: event.timestamp,
        })
      }
    })
  })

  describe('stopSmartWatching', () => {
    it('should stop smart watching and cleanup', async () => {
      const smartWatcher = useSmartFileWatching()
      await smartWatcher.startSmartWatching('/test/project')
      await smartWatcher.stopSmartWatching()

      // Verify cleanup
      unsubscribeFunctions.forEach((fn) => {
        expect(fn).toHaveBeenCalled()
      })

      expect(mockFileWatcher.stopWatching).toHaveBeenCalled()
      expect(mockPipelineManager.clearPendingSignals).toHaveBeenCalled()
      expect(smartWatcher.isSmartWatchingActive.value).toBe(false)

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[SmartFileWatching] 🛑 Stopping smart file watching'
      )
    })

    it('should handle stop without prior start', async () => {
      const smartWatcher = useSmartFileWatching()
      await smartWatcher.stopSmartWatching()

      expect(mockFileWatcher.stopWatching).toHaveBeenCalled()
      expect(mockPipelineManager.clearPendingSignals).toHaveBeenCalled()
    })

    it('should handle errors during stop', async () => {
      const smartWatcher = useSmartFileWatching()
      await smartWatcher.startSmartWatching('/test/project')

      mockFileWatcher.stopWatching.mockRejectedValue(new Error('Stop failed'))
      await smartWatcher.stopSmartWatching()

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[SmartFileWatching] ⚠️ Error stopping smart watching:',
        expect.any(Error)
      )
    })
  })

  describe('executePipeline', () => {
    it('should execute pipeline successfully', async () => {
      const smartWatcher = useSmartFileWatching()

      const signals = [
        {
          type: 'source',
          path: '/test.js',
          changeType: 'change',
          timestamp: 1000,
        },
        {
          type: 'config',
          path: '/config.json',
          changeType: 'change',
          timestamp: 2000,
        },
      ]
      mockPipelineManagerRefs.pendingSignals.value = signals

      const executeFunction = vi.fn().mockResolvedValue(undefined)
      await smartWatcher.executePipeline(executeFunction)

      expect(executeFunction).toHaveBeenCalledWith(signals)
      expect(mockPipelineManager.clearPendingSignals).toHaveBeenCalled()

      const stats = smartWatcher.getDetailedStats()
      expect(stats.execution.totalExecutions).toBe(1)
      expect(stats.execution.totalSignalsProcessed).toBe(2)
      expect(stats.execution.averageSignalsPerExecution).toBe(2)
      expect(smartWatcher.lastPipelineExecution.value).toBeInstanceOf(Date)
    })

    it('should handle pipeline execution errors', async () => {
      const smartWatcher = useSmartFileWatching()

      mockPipelineManagerRefs.pendingSignals.value = [
        {
          type: 'source',
          path: '/test.js',
          changeType: 'change',
          timestamp: 1000,
        },
      ]

      const executeFunction = vi
        .fn()
        .mockRejectedValue(new Error('Execution failed'))
      await expect(
        smartWatcher.executePipeline(executeFunction)
      ).rejects.toThrow('Execution failed')

      expect(mockPipelineManager.clearPendingSignals).not.toHaveBeenCalled()
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[SmartFileWatching] ❌ Pipeline execution failed:',
        expect.any(Error)
      )
    })

    it('should calculate average correctly over multiple executions', async () => {
      const smartWatcher = useSmartFileWatching()
      const executeFunction = vi.fn().mockResolvedValue(undefined)

      // First execution with 3 signals
      mockPipelineManagerRefs.pendingSignals.value = [
        {
          type: 'source',
          path: '/1.js',
          changeType: 'change',
          timestamp: 1000,
        },
        {
          type: 'source',
          path: '/2.js',
          changeType: 'change',
          timestamp: 2000,
        },
        {
          type: 'source',
          path: '/3.js',
          changeType: 'change',
          timestamp: 3000,
        },
      ]
      await smartWatcher.executePipeline(executeFunction)

      // Second execution with 1 signal
      mockPipelineManagerRefs.pendingSignals.value = [
        {
          type: 'config',
          path: '/config.json',
          changeType: 'change',
          timestamp: 4000,
        },
      ]
      await smartWatcher.executePipeline(executeFunction)

      const stats = smartWatcher.getDetailedStats()
      expect(stats.execution.totalExecutions).toBe(2)
      expect(stats.execution.totalSignalsProcessed).toBe(4)
      expect(stats.execution.averageSignalsPerExecution).toBe(2)
    })
  })

  describe('forceExecutePipeline', () => {
    it('should force execute with pending signals', async () => {
      const smartWatcher = useSmartFileWatching()

      const signals = [
        {
          type: 'source',
          path: '/test.js',
          changeType: 'change',
          timestamp: 1000,
        },
      ]
      mockPipelineManagerRefs.pendingSignals.value = signals

      const executeFunction = vi.fn().mockResolvedValue(undefined)
      await smartWatcher.forceExecutePipeline(executeFunction)

      expect(mockPipelineManager.forceExecution).toHaveBeenCalled()
      expect(executeFunction).toHaveBeenCalledWith(signals)
    })

    it('should handle force execute with no signals', async () => {
      const smartWatcher = useSmartFileWatching()

      mockPipelineManagerRefs.pendingSignals.value = []

      const executeFunction = vi.fn()
      await smartWatcher.forceExecutePipeline(executeFunction)

      expect(mockPipelineManager.forceExecution).toHaveBeenCalled()
      expect(executeFunction).not.toHaveBeenCalled()
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[SmartFileWatching] ⏸️ No signals to execute'
      )
    })
  })

  describe('getDetailedStats', () => {
    it('should return comprehensive statistics', () => {
      const smartWatcher = useSmartFileWatching()

      mockFileWatcher.getWatchingStatus.mockReturnValue({
        isWatching: true,
        projectPath: '/test/project',
      })

      mockPipelineManager.getStats.mockReturnValue({
        totalSignals: 10,
        executionCount: 3,
      })

      mockPipelineManagerRefs.currentState.value = 'processing'
      mockPipelineManagerRefs.pendingSignals.value = [
        {
          type: 'source',
          path: '/1.js',
          changeType: 'change',
          timestamp: 1000,
        },
        {
          type: 'config',
          path: '/2.json',
          changeType: 'change',
          timestamp: 2000,
        },
      ]

      const stats = smartWatcher.getDetailedStats()

      expect(stats).toEqual({
        fileWatcher: {
          isWatching: true,
          projectPath: '/test/project',
        },
        pipelineManager: {
          totalSignals: 10,
          executionCount: 3,
        },
        execution: {
          totalExecutions: 0,
          totalSignalsProcessed: 0,
          averageSignalsPerExecution: 0,
        },
        lastExecution: null,
        systemState: 'processing',
        pendingSignalsCount: 2,
      })
    })
  })

  describe('resetStats', () => {
    it('should reset all statistics', async () => {
      const smartWatcher = useSmartFileWatching()

      // Execute to generate stats
      mockPipelineManagerRefs.pendingSignals.value = [
        {
          type: 'source',
          path: '/test.js',
          changeType: 'change',
          timestamp: 1000,
        },
      ]
      await smartWatcher.executePipeline(vi.fn().mockResolvedValue(undefined))

      // Reset stats
      smartWatcher.resetStats()

      expect(mockPipelineManager.resetStats).toHaveBeenCalled()

      const stats = smartWatcher.getDetailedStats()
      expect(stats.execution.totalExecutions).toBe(0)
      expect(stats.execution.totalSignalsProcessed).toBe(0)
      expect(stats.execution.averageSignalsPerExecution).toBe(0)
      expect(smartWatcher.lastPipelineExecution.value).toBe(null)
    })
  })

  describe('onUnmounted cleanup', () => {
    it('should cleanup on unmount', async () => {
      const smartWatcher = useSmartFileWatching()
      await smartWatcher.startSmartWatching('/test/project')

      // Simulate unmount
      if (onUnmountedCallback) {
        await onUnmountedCallback()
      }

      expect(mockFileWatcher.stopWatching).toHaveBeenCalled()
      expect(mockPipelineManager.clearPendingSignals).toHaveBeenCalled()
    })
  })

  describe('Direct access', () => {
    it('should provide access to underlying systems', () => {
      const smartWatcher = useSmartFileWatching()

      expect(smartWatcher.fileWatcher).toBe(mockFileWatcher)
      expect(smartWatcher.pipelineManager).toBe(mockPipelineManager)
    })
  })
})
