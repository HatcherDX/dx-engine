/**
 * @fileoverview Smart file watching system integrating file watcher with pipeline manager.
 *
 * @description
 * Combines the file watcher with the intelligent pipeline manager to create a system
 * that watches files and makes smart decisions about when to execute pipelines.
 * This replaces immediate pipeline execution with intelligent coordination.
 *
 * @example
 * ```typescript
 * const smartWatcher = useSmartFileWatching()
 * await smartWatcher.startSmartWatching('/path/to/project')
 *
 * // Pipeline will be executed intelligently based on system state
 * ```
 *
 * @author Hatcher DX Team
 * @since 2.0.0
 * @public
 */

import { onUnmounted, ref, computed, readonly } from 'vue'
import { useFileWatcher } from './useFileWatcher'
import {
  usePipelineManager,
  createDefaultStateDetectors,
} from './usePipelineManager'
import { useOnboarding } from './useOnboarding'
import { useChatSidebar } from './useChatSidebar'

// Module-level cleanup handler storage
let fileChangeCleanup: (() => void) | null = null

/**
 * Smart file watching composable that integrates file monitoring with intelligent pipeline execution.
 *
 * @remarks
 * This composable solves the EMFILE error issue by preventing automatic pipeline execution
 * on every file change. Instead, it uses intelligent state detection to determine when
 * pipelines should actually be executed.
 *
 * The system:
 * 1. Monitors file changes via the file watcher
 * 2. Groups signals using the pipeline manager's coalescence
 * 3. Detects system states (onboarding, AI processing, building, etc.)
 * 4. Makes intelligent decisions about pipeline execution
 * 5. Executes pipelines only when appropriate
 *
 * @returns Smart file watching interface
 *
 * @example
 * ```typescript
 * const smartWatcher = useSmartFileWatching()
 *
 * // Start smart watching
 * await smartWatcher.startSmartWatching(projectPath)
 *
 * // Monitor execution decisions
 * watchEffect(() => {
 *   if (smartWatcher.shouldExecutePipeline.value) {
 *     console.log('Smart system decided to execute pipeline')
 *   }
 * })
 * ```
 *
 * @public
 * @since 2.0.0
 */
export function useSmartFileWatching() {
  const fileWatcher = useFileWatcher()
  const pipelineManager = usePipelineManager({
    debounceMs: 3000, // Wait 3 seconds for more changes
    maxBatchSize: 15, // Execute after 15 changes max
    blockingStates: [
      'onboarding',
      'ai-processing',
      'building',
      'git-operation',
      'branch-switching',
    ],
    immediateExecutionTypes: ['config'], // Config changes need immediate attention
  })

  // External composables for state detection
  const onboarding = useOnboarding()
  const chatSidebar = useChatSidebar()

  // State
  const isSmartWatchingActive = ref(false)
  const lastPipelineExecution = ref<Date | null>(null)
  const executionStats = ref({
    totalExecutions: 0,
    totalSignalsProcessed: 0,
    averageSignalsPerExecution: 0,
  })

  /**
   * Computed property that determines if pipeline should be executed.
   * This is the main intelligence of the system.
   */
  const shouldExecutePipeline = computed(() => {
    return pipelineManager.shouldExecute.value && isSmartWatchingActive.value
  })

  /**
   * Registers all state detectors with the pipeline manager.
   *
   * @internal
   */
  const setupStateDetectors = (): void => {
    const defaultDetectors = createDefaultStateDetectors()

    // Register default detectors
    pipelineManager.registerStateDetector(
      'building',
      defaultDetectors.buildingDetector
    )
    pipelineManager.registerStateDetector(
      'git-operation',
      defaultDetectors.gitOperationDetector
    )
    pipelineManager.registerStateDetector(
      'branch-switching',
      defaultDetectors.branchSwitchingDetector
    )

    // Register custom detectors based on our composables
    pipelineManager.registerStateDetector('onboarding', async () => {
      return onboarding.isOnboardingActive.value
    })

    pipelineManager.registerStateDetector('ai-processing', async () => {
      // Check if chat sidebar is processing
      // Type assertion since isProcessing may not exist on chatSidebar
      const sidebar = chatSidebar as { isProcessing?: { value: boolean } }
      return sidebar.isProcessing?.value || false
    })

    console.log('[SmartFileWatching] ✅ State detectors registered')
  }

  /**
   * Sets up file change listeners that feed into the pipeline manager.
   *
   * @internal
   */
  const setupFileChangeHandlers = (): (() => void) => {
    // Listen for all file changes and feed them to the pipeline manager
    const unsubscribeGit = fileWatcher.onFileChange('git', (event) => {
      pipelineManager.handleFileChange({
        type: 'git',
        path: event.path,
        changeType: event.changeType,
        timestamp: event.timestamp,
      })
    })

    const unsubscribeConfig = fileWatcher.onFileChange('config', (event) => {
      pipelineManager.handleFileChange({
        type: 'config',
        path: event.path,
        changeType: event.changeType,
        timestamp: event.timestamp,
      })
    })

    const unsubscribeSource = fileWatcher.onFileChange('source', (event) => {
      pipelineManager.handleFileChange({
        type: 'source',
        path: event.path,
        changeType: event.changeType,
        timestamp: event.timestamp,
      })
    })

    const unsubscribeBuild = fileWatcher.onFileChange('build', (event) => {
      pipelineManager.handleFileChange({
        type: 'build',
        path: event.path,
        changeType: event.changeType,
        timestamp: event.timestamp,
      })
    })

    const unsubscribeDependency = fileWatcher.onFileChange(
      'dependency',
      (event) => {
        pipelineManager.handleFileChange({
          type: 'dependency',
          path: event.path,
          changeType: event.changeType,
          timestamp: event.timestamp,
        })
      }
    )

    const unsubscribeOther = fileWatcher.onFileChange('other', (event) => {
      pipelineManager.handleFileChange({
        type: 'other',
        path: event.path,
        changeType: event.changeType,
        timestamp: event.timestamp,
      })
    })

    // Store cleanup functions
    const cleanupFunctions = [
      unsubscribeGit,
      unsubscribeConfig,
      unsubscribeSource,
      unsubscribeBuild,
      unsubscribeDependency,
      unsubscribeOther,
    ]

    // Return cleanup function
    return () => {
      cleanupFunctions.forEach((cleanup) => cleanup())
    }
  }

  /**
   * Starts smart file watching for a project.
   *
   * @param projectPath - Absolute path to the project directory
   * @returns Promise that resolves when smart watching is active
   *
   * @example
   * ```typescript
   * await smartWatcher.startSmartWatching('/path/to/project')
   * console.log('Smart file watching active')
   * ```
   *
   * @public
   */
  const startSmartWatching = async (projectPath: string): Promise<void> => {
    console.log(
      '[SmartFileWatching] 🚀 Starting smart file watching for:',
      projectPath
    )

    try {
      // Setup state detectors first
      setupStateDetectors()

      // Setup file change handlers
      const cleanup = setupFileChangeHandlers()

      // Start file watching
      await fileWatcher.startWatching(projectPath)

      isSmartWatchingActive.value = true

      console.log(
        '[SmartFileWatching] ✅ Smart file watching started successfully'
      )

      // Store cleanup function for later use
      fileChangeCleanup = cleanup
    } catch (error) {
      console.error(
        '[SmartFileWatching] ❌ Failed to start smart watching:',
        error
      )
      isSmartWatchingActive.value = false
      throw error
    }
  }

  /**
   * Stops smart file watching and cleans up resources.
   *
   * @example
   * ```typescript
   * await smartWatcher.stopSmartWatching()
   * console.log('Smart watching stopped')
   * ```
   *
   * @public
   */
  const stopSmartWatching = async (): Promise<void> => {
    console.log('[SmartFileWatching] 🛑 Stopping smart file watching')

    try {
      // Call cleanup function if exists
      if (fileChangeCleanup) {
        fileChangeCleanup()
        fileChangeCleanup = null
      }

      // Stop file watching
      await fileWatcher.stopWatching()

      // Clear pipeline manager state
      pipelineManager.clearPendingSignals()

      isSmartWatchingActive.value = false

      console.log('[SmartFileWatching] ✅ Smart file watching stopped')
    } catch (error) {
      console.error(
        '[SmartFileWatching] ⚠️ Error stopping smart watching:',
        error
      )
    }
  }

  /**
   * Executes the pipeline with current pending signals and updates statistics.
   *
   * @remarks
   * This should be called by components when shouldExecutePipeline becomes true.
   * The method handles the actual pipeline execution and stat tracking.
   *
   * @param executeFunction - Function that performs the actual pipeline execution
   * @returns Promise that resolves when execution is complete
   *
   * @example
   * ```typescript
   * // In a component
   * watchEffect(async () => {
   *   if (smartWatcher.shouldExecutePipeline.value) {
   *     await smartWatcher.executePipeline(async (signals) => {
   *       // Your pipeline execution logic here
   *       await runQuantumPipeline(signals)
   *     })
   *   }
   * })
   * ```
   *
   * @public
   */
  const executePipeline = async (
    executeFunction: (
      signals: Array<{
        type: string
        path: string
        changeType: string
        timestamp: number
      }>
    ) => Promise<void>
  ): Promise<void> => {
    console.log('[SmartFileWatching] 🔥 Executing pipeline')

    try {
      const signals = [...pipelineManager.pendingSignals.value]

      // Execute the provided function with signals
      await executeFunction(signals)

      // Update statistics
      executionStats.value.totalExecutions++
      executionStats.value.totalSignalsProcessed += signals.length
      executionStats.value.averageSignalsPerExecution = Math.round(
        executionStats.value.totalSignalsProcessed /
          executionStats.value.totalExecutions
      )

      lastPipelineExecution.value = new Date()

      // Clear pending signals after successful execution
      pipelineManager.clearPendingSignals()

      console.log(
        `[SmartFileWatching] ✅ Pipeline executed with ${signals.length} signals`
      )
    } catch (error) {
      console.error('[SmartFileWatching] ❌ Pipeline execution failed:', error)
      throw error
    }
  }

  /**
   * Forces immediate pipeline execution regardless of current state.
   *
   * @param executeFunction - Function that performs the actual pipeline execution
   * @returns Promise that resolves when execution is complete
   *
   * @example
   * ```typescript
   * await smartWatcher.forceExecutePipeline(async (signals) => {
   *   await runQuantumPipeline(signals)
   * })
   * ```
   *
   * @public
   */
  const forceExecutePipeline = async (
    executeFunction: (
      signals: Array<{
        type: string
        path: string
        changeType: string
        timestamp: number
      }>
    ) => Promise<void>
  ): Promise<void> => {
    console.log('[SmartFileWatching] 🔥 Force executing pipeline')

    await pipelineManager.forceExecution()

    if (pipelineManager.pendingSignals.value.length > 0) {
      await executePipeline(executeFunction)
    } else {
      console.log('[SmartFileWatching] ⏸️ No signals to execute')
    }
  }

  /**
   * Gets comprehensive statistics about the smart watching system.
   *
   * @returns Object containing detailed statistics
   *
   * @public
   */
  const getDetailedStats = () => ({
    fileWatcher: fileWatcher.getWatchingStatus(),
    pipelineManager: pipelineManager.getStats(),
    execution: { ...executionStats.value },
    lastExecution: lastPipelineExecution.value,
    systemState: pipelineManager.currentState.value,
    pendingSignalsCount: pipelineManager.pendingSignals.value.length,
  })

  /**
   * Resets all statistics to initial state.
   *
   * @public
   */
  const resetStats = (): void => {
    pipelineManager.resetStats()
    executionStats.value = {
      totalExecutions: 0,
      totalSignalsProcessed: 0,
      averageSignalsPerExecution: 0,
    }
    lastPipelineExecution.value = null
  }

  // Cleanup on unmount
  onUnmounted(async () => {
    await stopSmartWatching()
  })

  return {
    // State
    isSmartWatchingActive: readonly(isSmartWatchingActive),
    shouldExecutePipeline,
    currentSystemState: pipelineManager.currentState,
    pendingSignals: pipelineManager.pendingSignals,
    lastPipelineExecution: readonly(lastPipelineExecution),

    // Core methods
    startSmartWatching,
    stopSmartWatching,
    executePipeline,
    forceExecutePipeline,

    // Utilities
    getDetailedStats,
    resetStats,

    // Direct access to underlying systems (for advanced usage)
    fileWatcher,
    pipelineManager,
  }
}
