/**
 * @fileoverview Comprehensive tests for useSmartPipeline composable.
 *
 * @description
 * Achieves 100% code coverage for the smart pipeline integration composable
 * by testing all functions, branches, and edge cases.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref } from 'vue'
import { flushPromises } from '@vue/test-utils'
import type { FileChangeEvent } from './useFileWatcher'

// Create mock refs that will persist across tests
const mockIsWatching = ref(false)
const mockIsRunning = ref(false)
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test mock project allows flexible structure for different test scenarios
const mockOpenedProject = ref<any>(null)
const mockIsProjectLoaded = ref(false)

// Mock implementations
const mockStartWatching = vi.fn()
const mockOnFileChange = vi.fn()
const mockExecuteActions = vi.fn()

// Mock the modules
vi.mock('./useFileWatcher', () => ({
  useFileWatcher: () => ({
    startWatching: mockStartWatching,
    onFileChange: mockOnFileChange,
    isWatching: mockIsWatching,
  }),
}))

vi.mock('./useQuantumActions', () => ({
  useQuantumActions: () => ({
    executeActions: mockExecuteActions,
    isRunning: mockIsRunning,
  }),
}))

vi.mock('./useProjectContext', () => ({
  useProjectContext: () => ({
    openedProject: mockOpenedProject,
    isProjectLoaded: mockIsProjectLoaded,
  }),
}))

describe('useSmartPipeline', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test spy tracks console.log calls with flexible parameters
  let consoleLogSpy: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test spy tracks console.warn calls with flexible parameters
  let consoleWarnSpy: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test spy tracks console.error calls with flexible parameters
  let consoleErrorSpy: any

  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks()
    vi.useFakeTimers()

    // Reset mock refs
    mockIsWatching.value = false
    mockIsRunning.value = false
    mockOpenedProject.value = null
    mockIsProjectLoaded.value = false

    // Reset mock implementations
    mockStartWatching.mockResolvedValue(undefined)
    mockExecuteActions.mockResolvedValue(undefined)
    mockOnFileChange.mockImplementation(() => {})

    // Spy on console methods
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  describe('Initialization', () => {
    it('should initialize with default configuration', async () => {
      // Import the composable (needs to be done after mocks are set up)
      const { useSmartPipeline } = await import('./useSmartPipeline')
      const pipeline = useSmartPipeline()

      expect(pipeline.isEnabled.value).toBe(false)
      expect(pipeline.pendingChanges.value).toEqual([])
      expect(pipeline.isWatching.value).toBe(false)
    })

    it('should accept custom configuration', async () => {
      const { useSmartPipeline } = await import('./useSmartPipeline')
      const pipeline = useSmartPipeline({
        debounceMs: 5000,
        triggerOnSourceChanges: false,
        triggerOnConfigChanges: false,
        excludePatterns: ['*.test.js'],
      })

      const status = pipeline.getSmartPipelineStatus()

      expect(status.config.debounceMs).toBe(5000)
      expect(status.config.triggerOnSourceChanges).toBe(false)
      expect(status.config.triggerOnConfigChanges).toBe(false)
      expect(status.config.excludePatterns).toEqual(['*.test.js'])
    })
  })

  describe('enableSmartPipeline', () => {
    it('should throw error when no project is loaded', async () => {
      const { useSmartPipeline } = await import('./useSmartPipeline')
      const pipeline = useSmartPipeline()

      await expect(pipeline.enableSmartPipeline()).rejects.toThrow(
        'No project loaded - cannot enable smart pipeline'
      )
    })

    it('should enable smart pipeline when project is loaded', async () => {
      // Set up project context
      mockIsProjectLoaded.value = true
      mockOpenedProject.value = { rootPath: '/test/path' }

      const { useSmartPipeline } = await import('./useSmartPipeline')
      const pipeline = useSmartPipeline()

      await pipeline.enableSmartPipeline()

      expect(pipeline.isEnabled.value).toBe(true)
      expect(mockStartWatching).toHaveBeenCalledWith('/test/path')
      expect(mockOnFileChange).toHaveBeenCalledTimes(2)
      expect(mockOnFileChange).toHaveBeenCalledWith(
        'source',
        expect.any(Function)
      )
      expect(mockOnFileChange).toHaveBeenCalledWith(
        'config',
        expect.any(Function)
      )
    })

    it('should warn when already enabled', async () => {
      mockIsProjectLoaded.value = true
      mockOpenedProject.value = { rootPath: '/test/path' }

      const { useSmartPipeline } = await import('./useSmartPipeline')
      const pipeline = useSmartPipeline()

      await pipeline.enableSmartPipeline()
      consoleWarnSpy.mockClear()
      await pipeline.enableSmartPipeline() // Second call

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[SmartPipeline] Already enabled'
      )
    })

    it('should not start watcher if already watching', async () => {
      mockIsProjectLoaded.value = true
      mockOpenedProject.value = { rootPath: '/test/path' }
      mockIsWatching.value = true // Already watching

      const { useSmartPipeline } = await import('./useSmartPipeline')
      const pipeline = useSmartPipeline()

      await pipeline.enableSmartPipeline()

      expect(mockStartWatching).not.toHaveBeenCalled()
      expect(pipeline.isEnabled.value).toBe(true)
    })

    it('should handle errors during enabling', async () => {
      mockIsProjectLoaded.value = true
      mockOpenedProject.value = { rootPath: '/test/path' }
      mockStartWatching.mockRejectedValue(new Error('Watcher error'))

      const { useSmartPipeline } = await import('./useSmartPipeline')
      const pipeline = useSmartPipeline()

      await expect(pipeline.enableSmartPipeline()).rejects.toThrow(
        'Watcher error'
      )
      expect(consoleErrorSpy).toHaveBeenCalled()
    })
  })

  describe('disableSmartPipeline', () => {
    it('should disable smart pipeline when enabled', async () => {
      mockIsProjectLoaded.value = true
      mockOpenedProject.value = { rootPath: '/test/path' }

      const { useSmartPipeline } = await import('./useSmartPipeline')
      const pipeline = useSmartPipeline()

      await pipeline.enableSmartPipeline()
      pipeline.disableSmartPipeline()

      expect(pipeline.isEnabled.value).toBe(false)
      expect(pipeline.pendingChanges.value).toEqual([])
    })

    it('should warn when already disabled', async () => {
      const { useSmartPipeline } = await import('./useSmartPipeline')
      const pipeline = useSmartPipeline()

      pipeline.disableSmartPipeline()

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[SmartPipeline] Already disabled'
      )
    })

    it('should clear debounce timer when disabling', async () => {
      mockIsProjectLoaded.value = true
      mockOpenedProject.value = { rootPath: '/test/path' }

      // Capture file change handlers
      // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type -- Test mock requires Function type
      const handlers: Record<string, Function> = {}
      // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type -- Test mock requires Function type
      mockOnFileChange.mockImplementation((type: string, handler: Function) => {
        handlers[type] = handler
      })

      const { useSmartPipeline } = await import('./useSmartPipeline')
      const pipeline = useSmartPipeline()

      await pipeline.enableSmartPipeline()

      // Trigger a file change to start debounce timer
      const event: FileChangeEvent = {
        type: 'source',
        path: '/test.js',
        changeType: 'change',
      }
      handlers.source(event)

      // Disable before debounce completes
      pipeline.disableSmartPipeline()

      expect(pipeline.isEnabled.value).toBe(false)
      expect(pipeline.pendingChanges.value).toEqual([])
    })
  })

  describe('triggerPipelineManually', () => {
    it('should trigger pipeline manually', async () => {
      const { useSmartPipeline } = await import('./useSmartPipeline')
      const pipeline = useSmartPipeline()

      await pipeline.triggerPipelineManually()

      expect(mockExecuteActions).toHaveBeenCalled()
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[SmartPipeline] Manual pipeline trigger'
      )
    })

    it('should warn when pipeline is already running', async () => {
      mockIsRunning.value = true

      const { useSmartPipeline } = await import('./useSmartPipeline')
      const pipeline = useSmartPipeline()

      await pipeline.triggerPipelineManually()

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[SmartPipeline] Pipeline already running'
      )
      expect(mockExecuteActions).not.toHaveBeenCalled()
    })

    it('should handle errors during manual execution', async () => {
      mockExecuteActions.mockRejectedValue(new Error('Execution error'))

      const { useSmartPipeline } = await import('./useSmartPipeline')
      const pipeline = useSmartPipeline()

      await expect(pipeline.triggerPipelineManually()).rejects.toThrow(
        'Execution error'
      )
      expect(consoleErrorSpy).toHaveBeenCalled()
    })
  })

  describe('File change handling', () => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type -- Test captures file change handlers with various event structures
    let handlers: Record<string, Function> = {}

    beforeEach(() => {
      handlers = {}
      // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type -- Test mock file change handler accepts flexible event types
      mockOnFileChange.mockImplementation((type: string, handler: Function) => {
        handlers[type] = handler
      })
      mockIsProjectLoaded.value = true
      mockOpenedProject.value = { rootPath: '/test/path' }
    })

    it('should trigger pipeline on source file change', async () => {
      const { useSmartPipeline } = await import('./useSmartPipeline')
      const pipeline = useSmartPipeline({ debounceMs: 100 })

      await pipeline.enableSmartPipeline()

      // Trigger source file change
      const event: FileChangeEvent = {
        type: 'source',
        path: '/src/test.js',
        changeType: 'change',
      }
      handlers.source(event)

      // Wait for debounce
      vi.advanceTimersByTime(150)
      await flushPromises()

      expect(mockExecuteActions).toHaveBeenCalled()
    })

    it('should ignore file deletions', async () => {
      const { useSmartPipeline } = await import('./useSmartPipeline')
      const pipeline = useSmartPipeline({ debounceMs: 100 })

      await pipeline.enableSmartPipeline()

      // Trigger file deletion
      const event: FileChangeEvent = {
        type: 'source',
        path: '/src/test.js',
        changeType: 'unlink',
      }
      handlers.source(event)

      // Wait for debounce
      vi.advanceTimersByTime(150)
      await flushPromises()

      expect(mockExecuteActions).not.toHaveBeenCalled()
    })

    it('should ignore directory deletions', async () => {
      const { useSmartPipeline } = await import('./useSmartPipeline')
      const pipeline = useSmartPipeline({ debounceMs: 100 })

      await pipeline.enableSmartPipeline()

      // Trigger directory deletion
      const event: FileChangeEvent = {
        type: 'source',
        path: '/src/components',
        changeType: 'unlinkDir',
      }
      handlers.source(event)

      // Wait for debounce
      vi.advanceTimersByTime(150)
      await flushPromises()

      expect(mockExecuteActions).not.toHaveBeenCalled()
    })

    it('should not trigger when disabled for source changes', async () => {
      const { useSmartPipeline } = await import('./useSmartPipeline')
      const pipeline = useSmartPipeline({
        debounceMs: 100,
        triggerOnSourceChanges: false,
      })

      await pipeline.enableSmartPipeline()

      // Trigger source file change
      const event: FileChangeEvent = {
        type: 'source',
        path: '/src/test.js',
        changeType: 'change',
      }
      handlers.source(event)

      // Wait for debounce
      vi.advanceTimersByTime(150)
      await flushPromises()

      expect(mockExecuteActions).not.toHaveBeenCalled()
    })

    it('should not trigger when disabled for config changes', async () => {
      const { useSmartPipeline } = await import('./useSmartPipeline')
      const pipeline = useSmartPipeline({
        debounceMs: 100,
        triggerOnConfigChanges: false,
      })

      await pipeline.enableSmartPipeline()

      // Trigger config file change
      const event: FileChangeEvent = {
        type: 'config',
        path: '/package.json',
        changeType: 'change',
      }
      handlers.config(event)

      // Wait for debounce
      vi.advanceTimersByTime(150)
      await flushPromises()

      expect(mockExecuteActions).not.toHaveBeenCalled()
    })

    it('should ignore non-source/config file types', async () => {
      const { useSmartPipeline } = await import('./useSmartPipeline')
      const pipeline = useSmartPipeline({ debounceMs: 100 })

      await pipeline.enableSmartPipeline()

      // Trigger other file type change
      const event: FileChangeEvent = {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test uses non-standard file type to verify filtering logic
        type: 'other' as any,
        path: '/test.txt',
        changeType: 'change',
      }
      handlers.source(event)

      // Wait for debounce
      vi.advanceTimersByTime(150)
      await flushPromises()

      expect(mockExecuteActions).not.toHaveBeenCalled()
    })

    it('should exclude files matching custom patterns', async () => {
      const { useSmartPipeline } = await import('./useSmartPipeline')
      const pipeline = useSmartPipeline({
        debounceMs: 100,
        excludePatterns: ['*.test.js'],
      })

      await pipeline.enableSmartPipeline()

      // Trigger test file change
      const event: FileChangeEvent = {
        type: 'source',
        path: '/src/component.test.js',
        changeType: 'change',
      }
      handlers.source(event)

      // Wait for debounce
      vi.advanceTimersByTime(150)
      await flushPromises()

      expect(mockExecuteActions).not.toHaveBeenCalled()
    })

    it('should exclude default exclusion patterns', async () => {
      const { useSmartPipeline } = await import('./useSmartPipeline')
      const pipeline = useSmartPipeline({ debounceMs: 100 })

      await pipeline.enableSmartPipeline()

      const excludedPaths = [
        '/README.md',
        '/data.json',
        '/app.log',
        '/temp.tmp',
        '/docs/guide.md',
        '/readme.txt',
        '/CHANGELOG.md',
        '/coverage/index.html',
        '/dist/app.js',
        '/build/main.js',
        '/src/test.spec.js',
        '/src/app.test.ts',
      ]

      for (const path of excludedPaths) {
        const event: FileChangeEvent = {
          type: 'source',
          path,
          changeType: 'change',
        }
        handlers.source(event)
      }

      // Wait for debounce
      vi.advanceTimersByTime(150)
      await flushPromises()

      expect(mockExecuteActions).not.toHaveBeenCalled()
    })

    it('should debounce multiple rapid file changes', async () => {
      const { useSmartPipeline } = await import('./useSmartPipeline')
      const pipeline = useSmartPipeline({ debounceMs: 500 })

      await pipeline.enableSmartPipeline()

      // Trigger multiple rapid changes
      handlers.source({
        type: 'source',
        path: '/src/file1.js',
        changeType: 'change',
      })

      vi.advanceTimersByTime(100)

      handlers.source({
        type: 'source',
        path: '/src/file2.js',
        changeType: 'change',
      })

      vi.advanceTimersByTime(100)

      handlers.source({
        type: 'source',
        path: '/src/file3.js',
        changeType: 'change',
      })

      // Wait for debounce to complete
      vi.advanceTimersByTime(500)
      await flushPromises()

      // Should only execute once after debounce
      expect(mockExecuteActions).toHaveBeenCalledTimes(1)
      expect(pipeline.pendingChanges.value).toEqual([])
    })

    it('should not trigger if already running', async () => {
      mockIsRunning.value = true

      const { useSmartPipeline } = await import('./useSmartPipeline')
      const pipeline = useSmartPipeline({ debounceMs: 100 })

      await pipeline.enableSmartPipeline()

      // Trigger file change
      const event: FileChangeEvent = {
        type: 'source',
        path: '/src/test.js',
        changeType: 'change',
      }
      handlers.source(event)

      // Wait for debounce
      vi.advanceTimersByTime(150)
      await flushPromises()

      expect(mockExecuteActions).not.toHaveBeenCalled()
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[SmartPipeline] Pipeline already running, skipping trigger'
      )
    })

    it('should handle errors during pipeline execution', async () => {
      mockExecuteActions.mockRejectedValue(new Error('Pipeline error'))

      const { useSmartPipeline } = await import('./useSmartPipeline')
      const pipeline = useSmartPipeline({ debounceMs: 100 })

      await pipeline.enableSmartPipeline()

      // Trigger file change
      const event: FileChangeEvent = {
        type: 'source',
        path: '/src/test.js',
        changeType: 'change',
      }
      handlers.source(event)

      // Wait for debounce
      vi.advanceTimersByTime(150)
      await flushPromises()

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[SmartPipeline] Failed to execute actions pipeline:',
        expect.any(Error)
      )
    })

    it('should not handle changes when disabled', async () => {
      const { useSmartPipeline } = await import('./useSmartPipeline')
      const pipeline = useSmartPipeline({ debounceMs: 100 })

      await pipeline.enableSmartPipeline()
      pipeline.disableSmartPipeline()

      // Trigger file change after disabling
      const event: FileChangeEvent = {
        type: 'source',
        path: '/src/test.js',
        changeType: 'change',
      }
      handlers.source(event)

      // Wait for debounce
      vi.advanceTimersByTime(150)
      await flushPromises()

      // Should not do anything since it's disabled
      expect(pipeline.pendingChanges.value).toEqual([])
    })

    it('should track pending changes without duplicates', async () => {
      const { useSmartPipeline } = await import('./useSmartPipeline')
      const pipeline = useSmartPipeline({ debounceMs: 500 })

      await pipeline.enableSmartPipeline()

      // Trigger same file multiple times
      handlers.source({
        type: 'source',
        path: '/src/test.js',
        changeType: 'change',
      })

      handlers.source({
        type: 'source',
        path: '/src/test.js',
        changeType: 'change',
      })

      handlers.source({
        type: 'source',
        path: '/src/other.js',
        changeType: 'change',
      })

      // Check pending changes before debounce completes
      expect(pipeline.pendingChanges.value).toEqual([
        '/src/test.js',
        '/src/other.js',
      ])

      // Wait for debounce
      vi.advanceTimersByTime(600)
      await flushPromises()

      // Pending changes should be cleared after execution
      expect(pipeline.pendingChanges.value).toEqual([])
    })
  })

  describe('getSmartPipelineStatus', () => {
    it('should return current pipeline status', async () => {
      mockIsProjectLoaded.value = true
      mockOpenedProject.value = { rootPath: '/test/path' }
      mockIsWatching.value = true

      const { useSmartPipeline } = await import('./useSmartPipeline')
      const pipeline = useSmartPipeline({ debounceMs: 3000 })

      await pipeline.enableSmartPipeline()

      const status = pipeline.getSmartPipelineStatus()

      expect(status.isEnabled).toBe(true)
      expect(status.isWatching).toBe(true)
      expect(status.pendingChanges).toEqual([])
      expect(status.lastTriggeredTime).toBe(0)
      expect(status.config.debounceMs).toBe(3000)
    })
  })

  describe('Watch effect for project loading', () => {
    it('should log when project loads', async () => {
      const { useSmartPipeline } = await import('./useSmartPipeline')
      useSmartPipeline()

      // Clear initial logs
      consoleLogSpy.mockClear()

      // Simulate project loading
      mockIsProjectLoaded.value = true
      mockOpenedProject.value = { rootPath: '/test/path' }

      await flushPromises()

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[SmartPipeline] Project loaded, smart pipeline available'
      )
    })
  })
})
