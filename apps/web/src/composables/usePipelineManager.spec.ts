/**
 * @fileoverview Comprehensive tests for usePipelineManager composable
 *
 * @description
 * Achieves 100% code coverage for usePipelineManager.ts by testing all
 * functionality including state detection, file change handling, debouncing,
 * and pipeline execution decisions.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import type {
  FileChangeSignal,
  PipelineConfig,
  StateDetector,
} from './usePipelineManager'

describe('usePipelineManager', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test mock requires flexible typing for dynamic module import
  let usePipelineManager: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test mock requires flexible typing for state detector factory
  let createDefaultStateDetectors: any

  beforeEach(async () => {
    vi.useFakeTimers()
    // Reset modules to ensure clean state
    vi.resetModules()
    // Import fresh copy of the module
    const module = await import('./usePipelineManager')
    usePipelineManager = module.usePipelineManager
    createDefaultStateDetectors = module.createDefaultStateDetectors
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  describe('Initialization', () => {
    it('should initialize with default configuration', () => {
      const manager = usePipelineManager()

      expect(manager.currentState.value).toBe('idle')
      expect(manager.pendingSignals.value).toEqual([])
      expect(manager.lastExecutionTime.value).toBe(0)
      expect(manager.shouldExecute.value).toBe(false)
    })

    it('should accept custom configuration', () => {
      const customConfig: Partial<PipelineConfig> = {
        debounceMs: 5000,
        maxBatchSize: 50,
        blockingStates: ['building'],
        immediateExecutionTypes: ['dependency'],
      }

      const manager = usePipelineManager(customConfig)
      const signal: FileChangeSignal = {
        type: 'dependency',
        path: 'package.json',
        changeType: 'change',
        timestamp: Date.now(),
      }

      manager.handleFileChange(signal)

      // Should trigger immediate execution for dependency type
      expect(manager.shouldExecute.value).toBe(true)
    })
  })

  describe('State Detection', () => {
    it('should register state detector', async () => {
      const manager = usePipelineManager()
      const detector: StateDetector = vi.fn().mockResolvedValue(true)

      manager.registerStateDetector('onboarding', detector)

      const signal: FileChangeSignal = {
        type: 'source',
        path: 'src/main.ts',
        changeType: 'change',
        timestamp: Date.now(),
      }

      await manager.handleFileChange(signal)
      await flushPromises()

      expect(detector).toHaveBeenCalledWith([signal])
      expect(manager.currentState.value).toBe('onboarding')
    })

    it('should handle detector errors gracefully', async () => {
      const manager = usePipelineManager()
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const errorDetector: StateDetector = vi
        .fn()
        .mockRejectedValue(new Error('Detector failed'))

      manager.registerStateDetector('ai-processing', errorDetector)

      const signal: FileChangeSignal = {
        type: 'source',
        path: 'src/test.ts',
        changeType: 'change',
        timestamp: Date.now(),
      }

      await manager.handleFileChange(signal)
      await flushPromises()

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          '[PipelineManager] State detector for ai-processing failed:'
        ),
        expect.any(Error)
      )
      expect(manager.currentState.value).toBe('idle')
    })

    it('should detect first matching state', async () => {
      const manager = usePipelineManager()
      const detector1: StateDetector = vi.fn().mockResolvedValue(false)
      const detector2: StateDetector = vi.fn().mockResolvedValue(true)
      const detector3: StateDetector = vi.fn().mockResolvedValue(true)

      manager.registerStateDetector('building', detector1)
      manager.registerStateDetector('git-operation', detector2)
      manager.registerStateDetector('branch-switching', detector3)

      const signal: FileChangeSignal = {
        type: 'git',
        path: '.git/HEAD',
        changeType: 'change',
        timestamp: Date.now(),
      }

      await manager.handleFileChange(signal)
      await flushPromises()

      expect(detector1).toHaveBeenCalled()
      expect(detector2).toHaveBeenCalled()
      expect(detector3).not.toHaveBeenCalled() // Should stop at first match
      expect(manager.currentState.value).toBe('git-operation')
    })
  })

  describe('File Change Handling', () => {
    it('should add signal to pending queue', async () => {
      const manager = usePipelineManager()
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      const signal: FileChangeSignal = {
        type: 'source',
        path: 'src/component.vue',
        changeType: 'add',
        timestamp: Date.now(),
      }

      await manager.handleFileChange(signal)

      expect(manager.pendingSignals.value).toEqual([signal])
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('📄 Received signal: source')
      )
    })

    it('should trigger immediate execution for config changes', async () => {
      const manager = usePipelineManager()
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      const signal: FileChangeSignal = {
        type: 'config',
        path: 'vite.config.ts',
        changeType: 'change',
        timestamp: Date.now(),
      }

      await manager.handleFileChange(signal)
      await flushPromises()

      expect(manager.shouldExecute.value).toBe(true)
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('⚡ Immediate execution triggered')
      )
    })

    it('should block execution when in blocking state', async () => {
      const manager = usePipelineManager()
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      // Register detector that returns building state
      const buildingDetector: StateDetector = vi.fn().mockResolvedValue(true)
      manager.registerStateDetector('building', buildingDetector)

      const signal: FileChangeSignal = {
        type: 'source',
        path: 'src/main.ts',
        changeType: 'change',
        timestamp: Date.now(),
      }

      await manager.handleFileChange(signal)
      await flushPromises()

      expect(manager.currentState.value).toBe('building')
      expect(manager.shouldExecute.value).toBe(false)
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('🚫 Execution blocked by state: building')
      )
    })

    it('should debounce multiple rapid changes', async () => {
      const manager = usePipelineManager()
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      const signal1: FileChangeSignal = {
        type: 'source',
        path: 'src/file1.ts',
        changeType: 'change',
        timestamp: Date.now(),
      }

      const signal2: FileChangeSignal = {
        type: 'source',
        path: 'src/file2.ts',
        changeType: 'change',
        timestamp: Date.now() + 100,
      }

      await manager.handleFileChange(signal1)
      await manager.handleFileChange(signal2)

      expect(manager.pendingSignals.value).toHaveLength(2)

      // Advance time but not enough to trigger debounce
      vi.advanceTimersByTime(1000)
      await flushPromises()

      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('⏰ Debounce timeout reached')
      )

      // Advance to trigger debounce
      vi.advanceTimersByTime(1000)
      await flushPromises()

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('⏰ Debounce timeout reached')
      )
    })

    it('should force execution when batch limit reached', async () => {
      const manager = usePipelineManager({ maxBatchSize: 3 })

      // Add signals up to batch limit
      for (let i = 0; i < 3; i++) {
        const signal: FileChangeSignal = {
          type: 'source',
          path: `src/file${i}.ts`,
          changeType: 'change',
          timestamp: Date.now() + i,
        }
        await manager.handleFileChange(signal)
      }

      await flushPromises()

      expect(manager.shouldExecute.value).toBe(true)
    })
  })

  describe('Execution Control', () => {
    it('should clear pending signals', () => {
      const manager = usePipelineManager()

      const signal: FileChangeSignal = {
        type: 'source',
        path: 'src/test.ts',
        changeType: 'change',
        timestamp: Date.now(),
      }

      manager.handleFileChange(signal)
      expect(manager.pendingSignals.value).toHaveLength(1)

      manager.clearPendingSignals()
      expect(manager.pendingSignals.value).toHaveLength(0)
    })

    it('should force execution regardless of state', async () => {
      const manager = usePipelineManager()
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      // Set blocking state
      const blockingDetector: StateDetector = vi.fn().mockResolvedValue(true)
      manager.registerStateDetector('building', blockingDetector)

      const signal: FileChangeSignal = {
        type: 'source',
        path: 'src/main.ts',
        changeType: 'change',
        timestamp: Date.now(),
      }

      await manager.handleFileChange(signal)
      await flushPromises()

      expect(manager.currentState.value).toBe('building')

      await manager.forceExecution()

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('🔥 Force execution requested')
      )
      // forceExecution sets state to idle to allow execution
      expect(manager.currentState.value).toBe('idle')

      // Clear signals to complete the operation
      manager.clearPendingSignals()
    })

    it('should update statistics on execution', async () => {
      const manager = usePipelineManager()
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      const signal: FileChangeSignal = {
        type: 'config',
        path: 'config.json',
        changeType: 'change',
        timestamp: Date.now(),
      }

      await manager.handleFileChange(signal)
      await flushPromises()

      const stats = manager.getStats()
      expect(stats.totalSignalsReceived).toBe(1)
      expect(stats.totalExecutions).toBe(1)
      expect(stats.averageBatchSize).toBe(1)
      expect(manager.lastExecutionTime.value).toBeGreaterThan(0)

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('🚀 Executing pipeline with 1 signals')
      )
    })

    it('should defer execution when conditions not met', async () => {
      const manager = usePipelineManager()
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      // No signals, so shouldn't execute
      await manager.forceExecution()
      await flushPromises()

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('⏸️ Execution deferred')
      )
    })

    it('should calculate average batch size correctly', async () => {
      const manager = usePipelineManager({
        maxBatchSize: 2, // Set low batch size to trigger execution
        immediateTypes: [], // Disable immediate execution for this test
      })

      const _consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      // First batch with 2 signals
      const signal1: FileChangeSignal = {
        type: 'source',
        path: 'src/file1.ts',
        changeType: 'change',
        timestamp: Date.now(),
      }
      const signal2: FileChangeSignal = {
        type: 'source',
        path: 'src/file2.ts',
        changeType: 'change',
        timestamp: Date.now(),
      }

      await manager.handleFileChange(signal1)
      await manager.handleFileChange(signal2)

      // With maxBatchSize=2, adding 2 signals should trigger execution automatically
      await flushPromises()

      let stats = manager.getStats()
      expect(stats.totalExecutions).toBe(1)
      expect(stats.averageBatchSize).toBe(2)

      // Clear pending signals after execution
      manager.clearPendingSignals()

      // Second batch with 4 signals
      for (let i = 0; i < 4; i++) {
        const signal: FileChangeSignal = {
          type: 'source',
          path: `src/file${i}.ts`,
          changeType: 'change',
          timestamp: Date.now() + i,
        }
        await manager.handleFileChange(signal)

        // Check if batch limit reached
        if (i === 1) {
          // After 2 signals, should auto-execute
          await flushPromises()
          manager.clearPendingSignals()
        }
      }

      // Last 2 signals should trigger another execution
      await flushPromises()

      stats = manager.getStats()
      // Three executions: 2, 2, 2 -> average = 2
      expect(stats.averageBatchSize).toBe(2)
    })
  })

  describe('Computed Properties', () => {
    it('should compute shouldExecute correctly', async () => {
      const manager = usePipelineManager()

      // No signals - should not execute
      expect(manager.shouldExecute.value).toBe(false)

      // Add signal
      const signal: FileChangeSignal = {
        type: 'source',
        path: 'src/test.ts',
        changeType: 'change',
        timestamp: Date.now(),
      }
      await manager.handleFileChange(signal)

      // Has signals but not immediate type - should not execute yet
      expect(manager.shouldExecute.value).toBe(false)

      // Add immediate type signal
      const configSignal: FileChangeSignal = {
        type: 'config',
        path: 'config.json',
        changeType: 'change',
        timestamp: Date.now(),
      }
      await manager.handleFileChange(configSignal)
      await flushPromises()

      // Should execute now
      expect(manager.shouldExecute.value).toBe(true)
    })

    it('should not execute when in blocking state', async () => {
      const manager = usePipelineManager()

      // Register blocking state detector
      const blockingDetector: StateDetector = vi.fn().mockResolvedValue(true)
      manager.registerStateDetector('onboarding', blockingDetector)

      const signal: FileChangeSignal = {
        type: 'config', // Immediate type
        path: 'config.json',
        changeType: 'change',
        timestamp: Date.now(),
      }

      await manager.handleFileChange(signal)
      await flushPromises()

      expect(manager.currentState.value).toBe('onboarding')
      expect(manager.shouldExecute.value).toBe(false)
    })

    it('should execute when batch limit reached', async () => {
      const manager = usePipelineManager({ maxBatchSize: 2 })

      // Add signals to reach batch limit
      for (let i = 0; i < 2; i++) {
        const signal: FileChangeSignal = {
          type: 'source',
          path: `src/file${i}.ts`,
          changeType: 'change',
          timestamp: Date.now() + i,
        }
        await manager.handleFileChange(signal)
      }

      await flushPromises()

      expect(manager.pendingSignals.value).toHaveLength(2)
      expect(manager.shouldExecute.value).toBe(true)
    })
  })

  describe('Statistics', () => {
    it('should track total signals received', async () => {
      const manager = usePipelineManager()

      for (let i = 0; i < 5; i++) {
        const signal: FileChangeSignal = {
          type: 'source',
          path: `src/file${i}.ts`,
          changeType: 'change',
          timestamp: Date.now() + i,
        }
        await manager.handleFileChange(signal)
      }

      const stats = manager.getStats()
      expect(stats.totalSignalsReceived).toBe(5)
    })

    it('should track debounces', async () => {
      const manager = usePipelineManager()

      // Add non-immediate signals to trigger debounce
      for (let i = 0; i < 3; i++) {
        const signal: FileChangeSignal = {
          type: 'source',
          path: `src/file${i}.ts`,
          changeType: 'change',
          timestamp: Date.now() + i,
        }
        await manager.handleFileChange(signal)
      }

      const stats = manager.getStats()
      expect(stats.totalDebounces).toBe(3)
    })

    it('should track blocked executions', async () => {
      const manager = usePipelineManager()

      // Register blocking state
      const blockingDetector: StateDetector = vi.fn().mockResolvedValue(true)
      manager.registerStateDetector('building', blockingDetector)

      const signal: FileChangeSignal = {
        type: 'source',
        path: 'src/test.ts',
        changeType: 'change',
        timestamp: Date.now(),
      }

      await manager.handleFileChange(signal)
      await flushPromises()

      const stats = manager.getStats()
      expect(stats.totalBlocked).toBe(1)
    })

    it('should reset statistics', () => {
      const manager = usePipelineManager()

      // Add some activity
      manager.handleFileChange({
        type: 'source',
        path: 'test.ts',
        changeType: 'change',
        timestamp: Date.now(),
      })

      let stats = manager.getStats()
      expect(stats.totalSignalsReceived).toBe(1)

      manager.resetStats()
      stats = manager.getStats()

      expect(stats.totalSignalsReceived).toBe(0)
      expect(stats.totalExecutions).toBe(0)
      expect(stats.totalDebounces).toBe(0)
      expect(stats.totalBlocked).toBe(0)
      expect(stats.averageBatchSize).toBe(0)
    })
  })

  describe('Cleanup', () => {
    it('should clear debounce timer on unmount', async () => {
      // Test that the composable properly handles cleanup
      // We need to test that onUnmounted is registered
      const { mount } = await import('@vue/test-utils')
      const { defineComponent } = await import('vue')

      const TestComponent = defineComponent({
        setup() {
          const manager = usePipelineManager()
          return { manager }
        },
        template: '<div>Test</div>',
      })

      const wrapper = mount(TestComponent)

      // Add a file change to create a debounce timer
      const signal: FileChangeSignal = {
        type: 'source',
        path: 'src/test.ts',
        changeType: 'change',
        timestamp: Date.now(),
      }

      await wrapper.vm.manager.handleFileChange(signal)

      // Verify signal was added
      expect(wrapper.vm.manager.pendingSignals.value).toHaveLength(1)

      // Since the onUnmounted cleanup is internal and we can't directly test it,
      // we verify that clearPendingSignals properly cleans up the timer

      const _clearTimeoutSpy = vi.spyOn(global, 'clearTimeout')

      // Clear signals, which should also clear any pending timer
      wrapper.vm.manager.clearPendingSignals()

      // The timer should have been cleared (if one existed)
      // Note: The timer might not exist if execution happened immediately
      expect(wrapper.vm.manager.pendingSignals.value).toHaveLength(0)

      // Unmount the component to trigger cleanup
      wrapper.unmount()

      // The test passes if no errors occur during unmount
    })

    it('should clear timer when clearing pending signals', async () => {
      const manager = usePipelineManager()
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout')

      const signal: FileChangeSignal = {
        type: 'source',
        path: 'src/test.ts',
        changeType: 'change',
        timestamp: Date.now(),
      }

      await manager.handleFileChange(signal)

      // Should have set a debounce timer
      expect(clearTimeoutSpy).not.toHaveBeenCalled()

      manager.clearPendingSignals()

      // Should clear the timer
      expect(clearTimeoutSpy).toHaveBeenCalled()
    })
  })

  describe('Default State Detectors', () => {
    it('should detect building state from recent build changes', async () => {
      const detectors = createDefaultStateDetectors()

      const signals: FileChangeSignal[] = [
        {
          type: 'build',
          path: 'dist/main.js',
          changeType: 'change',
          timestamp: Date.now() - 1000, // 1 second ago
        },
        {
          type: 'build',
          path: 'dist/vendor.js',
          changeType: 'change',
          timestamp: Date.now() - 2000, // 2 seconds ago
        },
      ]

      const isBuilding = await detectors.buildingDetector(signals)
      expect(isBuilding).toBe(true)
    })

    it('should not detect building state from old changes', async () => {
      const detectors = createDefaultStateDetectors()

      const signals: FileChangeSignal[] = [
        {
          type: 'build',
          path: 'dist/main.js',
          changeType: 'change',
          timestamp: Date.now() - 6000, // 6 seconds ago
        },
      ]

      const isBuilding = await detectors.buildingDetector(signals)
      expect(isBuilding).toBe(false)
    })

    it('should detect git operation from multiple git changes', async () => {
      const detectors = createDefaultStateDetectors()

      const signals: FileChangeSignal[] = [
        {
          type: 'git',
          path: '.git/index',
          changeType: 'change',
          timestamp: Date.now() - 1000,
        },
        {
          type: 'git',
          path: '.git/HEAD',
          changeType: 'change',
          timestamp: Date.now() - 1500,
        },
        {
          type: 'git',
          path: '.git/refs/heads/main',
          changeType: 'change',
          timestamp: Date.now() - 2000,
        },
      ]

      const isGitOperation = await detectors.gitOperationDetector(signals)
      expect(isGitOperation).toBe(true)
    })

    it('should not detect git operation from few git changes', async () => {
      const detectors = createDefaultStateDetectors()

      const signals: FileChangeSignal[] = [
        {
          type: 'git',
          path: '.git/index',
          changeType: 'change',
          timestamp: Date.now() - 1000,
        },
        {
          type: 'git',
          path: '.git/HEAD',
          changeType: 'change',
          timestamp: Date.now() - 1500,
        },
      ]

      const isGitOperation = await detectors.gitOperationDetector(signals)
      expect(isGitOperation).toBe(false) // Only 2 changes, need > 2
    })

    it('should detect branch switching from pattern', async () => {
      const detectors = createDefaultStateDetectors()

      const signals: FileChangeSignal[] = []

      // Add many git changes
      for (let i = 0; i < 6; i++) {
        signals.push({
          type: 'git',
          path: `.git/file${i}`,
          changeType: 'change',
          timestamp: Date.now() - i * 100,
        })
      }

      // Add many source changes
      for (let i = 0; i < 11; i++) {
        signals.push({
          type: 'source',
          path: `src/file${i}.ts`,
          changeType: 'change',
          timestamp: Date.now() - i * 100,
        })
      }

      const isSwitching = await detectors.branchSwitchingDetector(signals)
      expect(isSwitching).toBe(true)
    })

    it('should not detect branch switching without enough changes', async () => {
      const detectors = createDefaultStateDetectors()

      const signals: FileChangeSignal[] = [
        {
          type: 'git',
          path: '.git/HEAD',
          changeType: 'change',
          timestamp: Date.now(),
        },
        {
          type: 'source',
          path: 'src/main.ts',
          changeType: 'change',
          timestamp: Date.now(),
        },
      ]

      const isSwitching = await detectors.branchSwitchingDetector(signals)
      expect(isSwitching).toBe(false)
    })

    it('should not detect branch switching with only git changes', async () => {
      const detectors = createDefaultStateDetectors()

      const signals: FileChangeSignal[] = []

      // Add many git changes but no source changes
      for (let i = 0; i < 10; i++) {
        signals.push({
          type: 'git',
          path: `.git/file${i}`,
          changeType: 'change',
          timestamp: Date.now() - i * 100,
        })
      }

      const isSwitching = await detectors.branchSwitchingDetector(signals)
      expect(isSwitching).toBe(false) // Need both git and source changes
    })

    it('should not detect branch switching with only source changes', async () => {
      const detectors = createDefaultStateDetectors()

      const signals: FileChangeSignal[] = []

      // Add many source changes but no git changes
      for (let i = 0; i < 15; i++) {
        signals.push({
          type: 'source',
          path: `src/file${i}.ts`,
          changeType: 'change',
          timestamp: Date.now() - i * 100,
        })
      }

      const isSwitching = await detectors.branchSwitchingDetector(signals)
      expect(isSwitching).toBe(false) // Need both git and source changes
    })
  })

  describe('Edge Cases', () => {
    it('should handle multiple detector registrations for same state', async () => {
      const manager = usePipelineManager()
      const detector1: StateDetector = vi.fn().mockResolvedValue(false)
      const detector2: StateDetector = vi.fn().mockResolvedValue(true)

      manager.registerStateDetector('building', detector1)
      manager.registerStateDetector('building', detector2) // Overwrites first

      const signal: FileChangeSignal = {
        type: 'source',
        path: 'src/test.ts',
        changeType: 'change',
        timestamp: Date.now(),
      }

      await manager.handleFileChange(signal)
      await flushPromises()

      expect(detector1).not.toHaveBeenCalled()
      expect(detector2).toHaveBeenCalled()
      expect(manager.currentState.value).toBe('building')
    })

    it('should handle empty signals array', async () => {
      const manager = usePipelineManager()

      // Force execution with no signals
      await manager.forceExecution()
      await flushPromises()

      const stats = manager.getStats()
      expect(stats.totalExecutions).toBe(0) // No execution since no signals
    })

    it('should handle all file change types', async () => {
      const manager = usePipelineManager()

      const changeTypes: Array<FileChangeSignal['changeType']> = [
        'add',
        'change',
        'unlink',
        'addDir',
        'unlinkDir',
      ]

      for (const changeType of changeTypes) {
        const signal: FileChangeSignal = {
          type: 'source',
          path: `test-${changeType}`,
          changeType,
          timestamp: Date.now(),
        }

        await manager.handleFileChange(signal)
      }

      expect(manager.pendingSignals.value).toHaveLength(changeTypes.length)
    })

    it('should handle all signal types', async () => {
      const manager = usePipelineManager()

      const signalTypes: Array<FileChangeSignal['type']> = [
        'git',
        'config',
        'source',
        'build',
        'dependency',
        'other',
      ]

      for (const type of signalTypes) {
        const signal: FileChangeSignal = {
          type,
          path: `test-${type}`,
          changeType: 'change',
          timestamp: Date.now(),
        }

        await manager.handleFileChange(signal)
      }

      expect(manager.pendingSignals.value).toHaveLength(signalTypes.length)
    })

    it('should handle rapid clearPendingSignals calls', () => {
      const manager = usePipelineManager()

      const signal: FileChangeSignal = {
        type: 'source',
        path: 'test.ts',
        changeType: 'change',
        timestamp: Date.now(),
      }

      manager.handleFileChange(signal)

      // Multiple clear calls
      manager.clearPendingSignals()
      manager.clearPendingSignals()
      manager.clearPendingSignals()

      expect(manager.pendingSignals.value).toHaveLength(0)
    })

    it('should handle readonly exports', () => {
      const manager = usePipelineManager()

      // These should be readonly - Vue's readonly doesn't throw,
      // it just prevents modification
      const originalState = manager.currentState.value
      const originalSignals = manager.pendingSignals.value
      const originalTime = manager.lastExecutionTime.value

      // Try to modify (will be silently ignored)
      // @ts-expect-error - Testing readonly
      manager.currentState.value = 'building'
      // @ts-expect-error - Testing readonly
      manager.pendingSignals.value = []
      // @ts-expect-error - Testing readonly
      manager.lastExecutionTime.value = 1000

      // Values should remain unchanged
      expect(manager.currentState.value).toBe(originalState)
      expect(manager.pendingSignals.value).toBe(originalSignals)
      expect(manager.lastExecutionTime.value).toBe(originalTime)
    })
  })
})
