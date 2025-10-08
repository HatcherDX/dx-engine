/**
 * @fileoverview Pipeline Manager with intelligent state detection and execution coordination.
 *
 * @description
 * Replaces automatic pipeline execution with an intelligent system that understands
 * application state and makes informed decisions about when to execute pipelines.
 * Prevents the EMFILE errors caused by immediate execution on every file change.
 *
 * @example
 * ```typescript
 * const manager = usePipelineManager()
 * manager.registerStateDetector('onboarding', onboardingDetector)
 * manager.handleFileChange({ type: 'source', path: 'src/main.ts' })
 * ```
 *
 * @author Hatcher DX Team
 * @since 2.0.0
 * @public
 */

import { ref, computed, reactive, onUnmounted, readonly } from 'vue'

/**
 * Represents different system states that affect pipeline execution decisions.
 *
 * @public
 */
export type SystemState =
  | 'idle' // System is idle, ready for execution
  | 'onboarding' // User is in onboarding flow
  | 'ai-processing' // AI is currently processing
  | 'building' // Build process is running
  | 'git-operation' // Git operation in progress
  | 'branch-switching' // Branch switch in progress

/**
 * File change signal from the file watcher system.
 *
 * @public
 */
export interface FileChangeSignal {
  type: 'git' | 'config' | 'source' | 'build' | 'dependency' | 'other'
  path: string
  changeType: 'add' | 'change' | 'unlink' | 'addDir' | 'unlinkDir'
  timestamp: number
}

/**
 * Configuration for pipeline execution decisions.
 *
 * @public
 */
export interface PipelineConfig {
  /** Debounce time in ms to group rapid changes */
  debounceMs: number
  /** Maximum signals to batch before forced execution */
  maxBatchSize: number
  /** States that block pipeline execution */
  blockingStates: SystemState[]
  /** File types that trigger immediate execution */
  immediateExecutionTypes: string[]
}

/**
 * State detector function that determines if a particular state is active.
 *
 * @param signals - Recent file change signals
 * @returns Promise resolving to true if the state is active
 *
 * @public
 */
export type StateDetector = (signals: FileChangeSignal[]) => Promise<boolean>

/**
 * Default configuration for the pipeline manager.
 *
 * @internal
 */
const DEFAULT_CONFIG: PipelineConfig = {
  debounceMs: 2000, // Wait 2 seconds for more changes
  maxBatchSize: 20, // Force execution after 20 changes
  blockingStates: [
    'onboarding',
    'ai-processing',
    'building',
    'git-operation',
    'branch-switching',
  ],
  immediateExecutionTypes: ['config'], // Config changes need immediate attention
}

/**
 * Pipeline Manager composable for intelligent pipeline execution coordination.
 *
 * @remarks
 * This system replaces automatic pipeline execution with intelligent decision making.
 * It understands application state and groups file changes into meaningful batches
 * before deciding whether to execute the pipeline.
 *
 * The system prevents EMFILE errors by not immediately executing on every change,
 * instead using debouncing, batching, and state awareness.
 *
 * @returns Pipeline manager interface
 *
 * @example
 * ```typescript
 * // In a component or composable
 * const manager = usePipelineManager()
 *
 * // Register state detectors
 * manager.registerStateDetector('onboarding', async () => {
 *   return useOnboarding().isActive.value
 * })
 *
 * // Handle file changes
 * onMounted(() => {
 *   window.electronAPI.on('file-change-event', manager.handleFileChange)
 * })
 *
 * // Monitor execution decisions
 * watchEffect(() => {
 *   if (manager.shouldExecute.value) {
 *     executeQuantumPipeline(manager.pendingSignals.value)
 *     manager.clearPendingSignals()
 *   }
 * })
 * ```
 *
 * @public
 * @since 2.0.0
 */
export function usePipelineManager(config: Partial<PipelineConfig> = {}) {
  const finalConfig: PipelineConfig = { ...DEFAULT_CONFIG, ...config }

  // Reactive state
  const currentState = ref<SystemState>('idle')
  const pendingSignals = ref<FileChangeSignal[]>([])
  const lastExecutionTime = ref<number>(0)
  const stateDetectors = new Map<SystemState, StateDetector>()

  // Debounce timer
  let debounceTimer: NodeJS.Timeout | null = null

  /**
   * Statistics and metrics for debugging and monitoring.
   *
   * @internal
   */
  const stats = reactive({
    totalSignalsReceived: 0,
    totalExecutions: 0,
    totalDebounces: 0,
    totalBlocked: 0,
    averageBatchSize: 0,
  })

  /**
   * Computed property indicating whether pipeline should execute now.
   *
   * @returns True if conditions are met for pipeline execution
   */
  const shouldExecute = computed(() => {
    const hasSignals = pendingSignals.value.length > 0
    const notBlocked = !finalConfig.blockingStates.includes(currentState.value)
    const hasImmediate = pendingSignals.value.some((signal) =>
      finalConfig.immediateExecutionTypes.includes(signal.type)
    )
    const reachedBatchLimit =
      pendingSignals.value.length >= finalConfig.maxBatchSize

    return hasSignals && notBlocked && (hasImmediate || reachedBatchLimit)
  })

  /**
   * Registers a state detector for a specific system state.
   *
   * @param state - The system state to detect
   * @param detector - Function that detects if the state is active
   *
   * @example
   * ```typescript
   * manager.registerStateDetector('building', async () => {
   *   return buildProcess.isRunning()
   * })
   * ```
   */
  const registerStateDetector = (
    state: SystemState,
    detector: StateDetector
  ): void => {
    stateDetectors.set(state, detector)
  }

  /**
   * Detects current system state by running all registered detectors.
   *
   * @returns Promise resolving to the detected system state
   *
   * @internal
   */
  const detectCurrentState = async (): Promise<SystemState> => {
    for (const [state, detector] of stateDetectors.entries()) {
      try {
        const isActive = await detector(pendingSignals.value)
        if (isActive) {
          return state
        }
      } catch (error) {
        console.warn(
          `[PipelineManager] State detector for ${state} failed:`,
          error
        )
      }
    }

    return 'idle'
  }

  /**
   * Handles incoming file change signals from the file watcher.
   *
   * @param signal - The file change signal to process
   *
   * @example
   * ```typescript
   * window.electronAPI.on('file-change-event', manager.handleFileChange)
   * ```
   *
   * @public
   */
  const handleFileChange = async (signal: FileChangeSignal): Promise<void> => {
    console.log(
      `[PipelineManager] 📄 Received signal: ${signal.type} - ${signal.path}`
    )

    // Update statistics
    stats.totalSignalsReceived++

    // Add signal to pending queue
    pendingSignals.value.push(signal)

    // Update current state
    currentState.value = await detectCurrentState()

    // Clear existing debounce timer
    if (debounceTimer) {
      clearTimeout(debounceTimer)
      debounceTimer = null
    }

    // Check if we should execute immediately
    if (shouldExecute.value) {
      console.log(
        `[PipelineManager] ⚡ Immediate execution triggered by ${signal.type}`
      )
      executeIfReady()
      return
    }

    // Check if execution is blocked
    if (finalConfig.blockingStates.includes(currentState.value)) {
      console.log(
        `[PipelineManager] 🚫 Execution blocked by state: ${currentState.value}`
      )
      stats.totalBlocked++
      return
    }

    // Set up debounce timer for batch execution
    stats.totalDebounces++
    debounceTimer = setTimeout(() => {
      console.log(
        `[PipelineManager] ⏰ Debounce timeout reached, checking execution`
      )
      executeIfReady()
    }, finalConfig.debounceMs)
  }

  /**
   * Executes pipeline if conditions are met and updates statistics.
   *
   * @internal
   */
  const executeIfReady = async (): Promise<void> => {
    // Re-check state before execution
    currentState.value = await detectCurrentState()

    if (shouldExecute.value) {
      console.log(
        `[PipelineManager] 🚀 Executing pipeline with ${pendingSignals.value.length} signals`
      )

      // Update statistics
      stats.totalExecutions++
      stats.averageBatchSize = Math.round(
        (stats.averageBatchSize * (stats.totalExecutions - 1) +
          pendingSignals.value.length) /
          stats.totalExecutions
      )
      lastExecutionTime.value = Date.now()

      // Note: Actual execution is handled by the consumer through shouldExecute computed
      // This allows the component to decide HOW to execute while the manager decides WHEN
    } else {
      console.log(
        `[PipelineManager] ⏸️ Execution deferred (state: ${currentState.value})`
      )
    }
  }

  /**
   * Clears all pending signals after successful execution.
   *
   * @remarks
   * Should be called by the consumer after successfully executing the pipeline.
   *
   * @example
   * ```typescript
   * if (manager.shouldExecute.value) {
   *   await executeQuantumPipeline()
   *   manager.clearPendingSignals()
   * }
   * ```
   *
   * @public
   */
  const clearPendingSignals = (): void => {
    pendingSignals.value = []
    if (debounceTimer) {
      clearTimeout(debounceTimer)
      debounceTimer = null
    }
  }

  /**
   * Forces immediate pipeline execution regardless of current state.
   *
   * @remarks
   * Should be used sparingly, only for critical changes that must be processed immediately.
   *
   * @example
   * ```typescript
   * // Force execution after critical config change
   * await manager.forceExecution()
   * ```
   *
   * @public
   */
  const forceExecution = async (): Promise<void> => {
    console.log(`[PipelineManager] 🔥 Force execution requested`)
    currentState.value = 'idle' // Override blocking state
    executeIfReady()
  }

  /**
   * Gets current pipeline manager statistics for debugging.
   *
   * @returns Current statistics object
   *
   * @public
   */
  const getStats = () => ({ ...stats })

  /**
   * Resets all statistics to zero.
   *
   * @public
   */
  const resetStats = (): void => {
    stats.totalSignalsReceived = 0
    stats.totalExecutions = 0
    stats.totalDebounces = 0
    stats.totalBlocked = 0
    stats.averageBatchSize = 0
  }

  // Cleanup on unmount
  onUnmounted(() => {
    if (debounceTimer) {
      clearTimeout(debounceTimer)
    }
  })

  return {
    // State
    currentState: readonly(currentState),
    pendingSignals: readonly(pendingSignals),
    lastExecutionTime: readonly(lastExecutionTime),
    shouldExecute,

    // Methods
    registerStateDetector,
    handleFileChange,
    clearPendingSignals,
    forceExecution,

    // Utilities
    getStats,
    resetStats,
  }
}

/**
 * Creates default state detectors for common system states.
 *
 * @remarks
 * These detectors can be registered with the pipeline manager to automatically
 * detect various system states that should block or allow pipeline execution.
 *
 * @returns Object containing default state detector functions
 *
 * @example
 * ```typescript
 * const detectors = createDefaultStateDetectors()
 * manager.registerStateDetector('building', detectors.buildingDetector)
 * ```
 *
 * @public
 * @since 2.0.0
 */
export function createDefaultStateDetectors() {
  /**
   * Detects if a build process is currently running.
   *
   * @param signals - Recent file change signals
   * @returns Promise resolving to true if building
   */
  const buildingDetector: StateDetector = async (
    signals: FileChangeSignal[]
  ): Promise<boolean> => {
    // Look for recent build-related file changes
    const recentBuildChanges = signals.filter(
      (signal) =>
        signal.type === 'build' && Date.now() - signal.timestamp < 5000 // Within last 5 seconds
    )

    return recentBuildChanges.length > 0
  }

  /**
   * Detects if a Git operation is in progress.
   *
   * @param signals - Recent file change signals
   * @returns Promise resolving to true if git operation active
   */
  const gitOperationDetector: StateDetector = async (
    signals: FileChangeSignal[]
  ): Promise<boolean> => {
    // Look for recent git-related changes
    const recentGitChanges = signals.filter(
      (signal) => signal.type === 'git' && Date.now() - signal.timestamp < 3000 // Within last 3 seconds
    )

    return recentGitChanges.length > 2 // Multiple git changes indicate operation
  }

  /**
   * Detects if a branch switch is in progress.
   *
   * @param signals - Recent file change signals
   * @returns Promise resolving to true if branch switching
   */
  const branchSwitchingDetector: StateDetector = async (
    signals: FileChangeSignal[]
  ): Promise<boolean> => {
    // Look for patterns that indicate branch switching
    const gitChanges = signals.filter((signal) => signal.type === 'git')
    const sourceChanges = signals.filter((signal) => signal.type === 'source')

    // Branch switch typically involves many git changes followed by source changes
    return gitChanges.length > 5 && sourceChanges.length > 10
  }

  return {
    buildingDetector,
    gitOperationDetector,
    branchSwitchingDetector,
  }
}
