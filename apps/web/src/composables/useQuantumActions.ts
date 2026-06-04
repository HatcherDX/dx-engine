/**
 * @fileoverview Composable for managing Hatcher Actions quantum pipeline state.
 *
 * @description
 * Provides reactive state management and execution logic for the quantum
 * actions pipeline. Handles parallel/sequential execution, status tracking,
 * and real-time updates for the futuristic pipeline interface.
 *
 * @example
 * ```typescript
 * const {
 *   actions,
 *   isRunning,
 *   executeActions,
 *   resetPipeline
 * } = useQuantumActions()
 * ```
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import { computed, reactive } from 'vue'
import { parse as parseYAML } from 'yaml'
import { ActionScheduler } from '@hatcherdx/hatcher-actions'
import type {
  ActionDefinition,
  ActionResult,
  ExecutionContext,
} from '@hatcherdx/hatcher-actions'

export type QuantumStatus =
  | 'pending'
  | 'initializing'
  | 'running'
  | 'success'
  | 'failed'
  | 'skipped'

/**
 * Actions configuration from .hatcher/actions.yaml
 *
 * @internal
 */
interface ActionsConfig {
  version: string
  project: string
  groups: Record<string, string[]>
  actions: Record<
    string,
    {
      name: string
      description: string
      command: string
      icon: string
      dependencies: string[]
      parallel: boolean
      estimatedDuration: number
    }
  >
  settings: {
    failFast: boolean
    maxParallel: number
    timeout: number
    retries: number
  }
}

/**
 * Interface for quantum action log entries.
 *
 * @public
 * @since 1.0.0
 */
export interface QuantumLog {
  timestamp: string
  level: 'info' | 'warning' | 'critical'
  message: string
}

/**
 * Interface for quantum action configuration.
 *
 * @public
 * @since 1.0.0
 */
export interface QuantumAction {
  id: string
  designation: string
  operation: string
  actionIcon: string
  status: QuantumStatus
  canRunParallel: boolean
  dependencies: string[]
  progress: number
  energyLevel: number
  quantumStability: number
  dataFlow?: string
  quantumThreads?: number
  estimatedDuration: number // in milliseconds
  logs: QuantumLog[]
  startTime?: Date
  endTime?: Date
  command?: string // Shell command to execute
  description?: string // Action description
}

/**
 * Composable state instance.
 */
const quantumState = reactive({
  actions: [] as QuantumAction[],
  isExecuting: false,
  currentWave: 0, // Current wave of parallel execution
  executionStartTime: null as Date | null,
})

/**
 * Composable for managing quantum actions pipeline.
 *
 * @returns Object with reactive state and control methods
 *
 * @public
 * @since 1.0.0
 */
export function useQuantumActions() {
  /**
   * Computed property for checking if pipeline is currently running.
   */
  const isRunning = computed(() =>
    quantumState.actions.some(
      (action) =>
        action.status === 'running' || action.status === 'initializing'
    )
  )

  /**
   * Computed property for overall pipeline progress.
   */
  const overallProgress = computed(() => {
    const completedActions = quantumState.actions.filter(
      (action) => action.status === 'success' || action.status === 'failed'
    ).length

    return quantumState.actions.length > 0
      ? (completedActions / quantumState.actions.length) * 100
      : 0
  })

  /**
   * Computed property for pipeline status summary.
   */
  const pipelineStatus = computed(() => {
    if (!quantumState.actions.length) return 'idle'

    const hasRunning = quantumState.actions.some(
      (action) =>
        action.status === 'running' || action.status === 'initializing'
    )

    const hasFailed = quantumState.actions.some(
      (action) => action.status === 'failed'
    )
    const allCompleted = quantumState.actions.every(
      (action) =>
        action.status === 'success' ||
        action.status === 'failed' ||
        action.status === 'skipped'
    )

    if (hasRunning) return 'executing'
    if (hasFailed && allCompleted) return 'failed'
    if (allCompleted) return 'completed'
    return 'pending'
  })

  /**
   * Generate designation code for action
   *
   * @param actionId - Action identifier
   * @returns Designation code (e.g., "ALPHA-1X")
   *
   * @private
   */
  const generateDesignation = (actionId: string): string => {
    const prefixes = [
      'ALPHA',
      'BETA',
      'GAMMA',
      'DELTA',
      'EPSILON',
      'ZETA',
      'ETA',
      'THETA',
    ]
    const hash = actionId
      .split('')
      .reduce((acc, char) => acc + char.charCodeAt(0), 0)
    const prefix = prefixes[hash % prefixes.length]
    const number = (hash % 9) + 1
    const suffix = String.fromCharCode(65 + (hash % 26)) // A-Z
    return `${prefix}-${number}${suffix}`
  }

  /**
   * Load actions from .hatcher/actions.yaml configuration
   *
   * @param projectPath - Project root path
   * @param groupName - Optional group name (e.g., "pre-commit")
   * @returns Promise that resolves when loading completes
   *
   * @remarks
   * If config file doesn't exist or loading fails, falls back to default actions.
   *
   * @public
   * @since 2.0.0
   */
  const loadActionsFromConfig = async (
    projectPath: string,
    groupName?: string
  ): Promise<void> => {
    try {
      console.log('[QuantumActions] Loading actions from config...')

      // Load config via IPC
      const yamlContent = (await window.electronAPI.invoke(
        'actions:load-config',
        projectPath
      )) as string | null

      if (!yamlContent) {
        console.log('[QuantumActions] No config found, using defaults')
        initializeActions()
        return
      }

      // Parse YAML
      const config = parseYAML(yamlContent) as ActionsConfig

      // Determine which actions to load
      const actionIds = groupName
        ? config.groups[groupName] || Object.keys(config.actions)
        : Object.keys(config.actions)

      console.log(`[QuantumActions] Loading ${actionIds.length} actions`)

      // Convert to QuantumActions
      quantumState.actions = actionIds.map((id) => {
        const actionDef = config.actions[id]

        return {
          id,
          designation: generateDesignation(id),
          operation: actionDef.name,
          actionIcon: actionDef.icon,
          status: 'pending' as QuantumStatus,
          canRunParallel: actionDef.parallel,
          dependencies: actionDef.dependencies || [],
          progress: 0,
          energyLevel: Math.max(88, Math.random() * 12 + 88), // 88-100%
          quantumStability: Math.max(94, Math.random() * 6 + 94), // 94-100%
          dataFlow: `${(Math.random() * 3 + 1.5).toFixed(1)} GB/s`,
          quantumThreads: Math.floor(Math.random() * 12 + 4), // 4-16
          estimatedDuration: actionDef.estimatedDuration || 5000,
          logs: [],
          command: actionDef.command,
          description: actionDef.description,
        }
      })

      console.log('[QuantumActions] ✅ Actions loaded successfully')
    } catch (error) {
      console.error('[QuantumActions] Failed to load config:', error)
      console.log('[QuantumActions] Falling back to default actions')
      initializeActions()
    }
  }

  /**
   * Initializes the quantum actions pipeline with default actions.
   *
   * @remarks
   * This creates a realistic set of actions that would run in a local CI/CD environment.
   *
   * @public
   * @since 1.0.0
   */
  const initializeActions = (): void => {
    quantumState.actions = [
      {
        id: 'code-quality',
        designation: 'ALPHA-1X',
        operation: 'Code Quality',
        actionIcon: 'Code',
        status: 'pending',
        canRunParallel: false,
        dependencies: [],
        progress: 0,
        energyLevel: 100,
        quantumStability: 100,
        dataFlow: '2.4 GB/s',
        quantumThreads: 4,
        estimatedDuration: 3000,
        logs: [],
      },
      {
        id: 'type-check',
        designation: 'BETA-2Y',
        operation: 'TypeCheck',
        actionIcon: 'CheckSquare',
        status: 'pending',
        canRunParallel: true,
        dependencies: ['code-quality'],
        progress: 0,
        energyLevel: 95,
        quantumStability: 98,
        dataFlow: '1.8 GB/s',
        quantumThreads: 8,
        estimatedDuration: 4000,
        logs: [],
      },
      {
        id: 'format',
        designation: 'GAMMA-3Z',
        operation: 'Format',
        actionIcon: 'TestTube',
        status: 'pending',
        canRunParallel: true,
        dependencies: ['code-quality'],
        progress: 0,
        energyLevel: 88,
        quantumStability: 96,
        dataFlow: '3.2 GB/s',
        quantumThreads: 12,
        estimatedDuration: 6000,
        logs: [],
      },
      {
        id: 'unit-tests',
        designation: 'DELTA-4A',
        operation: 'Unit Tests',
        actionIcon: 'Hammer',
        status: 'pending',
        canRunParallel: false,
        dependencies: ['type-check', 'format'],
        progress: 0,
        energyLevel: 92,
        quantumStability: 94,
        dataFlow: '5.1 GB/s',
        quantumThreads: 16,
        estimatedDuration: 8000,
        logs: [],
      },
      {
        id: 'build',
        designation: 'EPSILON-5B',
        operation: 'Build',
        actionIcon: 'Shield',
        status: 'pending',
        canRunParallel: false,
        dependencies: ['unit-tests'],
        progress: 0,
        energyLevel: 90,
        quantumStability: 100,
        dataFlow: '1.6 GB/s',
        quantumThreads: 6,
        estimatedDuration: 5000,
        logs: [],
      },
    ]
  }

  /**
   * Adds a log entry to a specific action.
   *
   * @param actionId - ID of the action
   * @param level - Log level
   * @param message - Log message
   *
   * @public
   * @since 1.0.0
   */
  const addLog = (
    actionId: string,
    level: QuantumLog['level'],
    message: string
  ): void => {
    const action = quantumState.actions.find((a) => a.id === actionId)
    if (action) {
      action.logs.push({
        timestamp: new Date().toISOString(),
        level,
        message,
      })

      // Keep only last 10 logs per action
      if (action.logs.length > 10) {
        action.logs.shift()
      }
    }
  }

  /**
   * Converts QuantumAction to ActionDefinition for ActionScheduler.
   *
   * @param quantumAction - Quantum action to convert
   * @returns ActionDefinition compatible with ActionScheduler
   *
   * @private
   */
  const toActionDefinition = (
    quantumAction: QuantumAction
  ): ActionDefinition => {
    return {
      id: quantumAction.id,
      name: quantumAction.operation,
      description: quantumAction.description || quantumAction.operation,
      command: quantumAction.command || '',
      icon: quantumAction.actionIcon,
      dependencies: quantumAction.dependencies,
      parallel: quantumAction.canRunParallel,
      estimatedDuration: quantumAction.estimatedDuration,
    }
  }

  /**
   * Executes the quantum actions pipeline using ActionScheduler.
   *
   * @param projectPath - Optional project root path for command execution
   *
   * @remarks
   * Uses ActionScheduler with Directed DAG for robust dependency resolution
   * and automatic parallel execution. Replaces custom wave-based logic.
   *
   * @public
   * @since 2.0.0
   */
  const executeActions = async (projectPath?: string): Promise<void> => {
    if (quantumState.isExecuting) return

    quantumState.isExecuting = true
    quantumState.executionStartTime = new Date()
    quantumState.currentWave = 0

    try {
      // Convert QuantumActions to ActionDefinitions
      const actionDefinitions = quantumState.actions.map(toActionDefinition)

      // Create scheduler with Directed DAG
      const scheduler = new ActionScheduler(actionDefinitions, {
        failFast: true,
        maxParallel: 4,
        timeout: 300000,
        retries: 0,
      })

      // Create execution context
      const context: ExecutionContext = {
        projectPath: projectPath || process.cwd(),
        ipc: {
          invoke: window.electronAPI.invoke.bind(window.electronAPI),
        },

        // Callback when action starts
        onActionStart: (action: ActionDefinition) => {
          const qAction = quantumState.actions.find((a) => a.id === action.id)
          if (qAction) {
            qAction.status = 'initializing'
            qAction.startTime = new Date()
            addLog(
              qAction.id,
              'info',
              'Quantum initialization sequence started'
            )

            setTimeout(() => {
              qAction.status = 'running'
              addLog(
                qAction.id,
                'info',
                `Quantum lock established on ${qAction.designation}`
              )
              addLog(qAction.id, 'info', `Executing: ${action.command}`)
            }, 1000)
          }
          quantumState.currentWave++
        },

        // Callback when action completes
        onActionComplete: (action: ActionDefinition, result: ActionResult) => {
          const qAction = quantumState.actions.find((a) => a.id === action.id)
          if (qAction) {
            qAction.progress = 100
            qAction.endTime = new Date()

            if (result.status === 'success') {
              qAction.status = 'success'
              addLog(
                qAction.id,
                'info',
                `${qAction.operation} completed successfully`
              )
              addLog(qAction.id, 'info', 'Quantum signature verified')

              // Log stdout preview
              if (result.output) {
                const preview = result.output.trim().substring(0, 100)
                if (preview) {
                  addLog(qAction.id, 'info', `Output: ${preview}...`)
                }
              }
            } else if (result.status === 'failed') {
              qAction.status = 'failed'
              addLog(
                qAction.id,
                'critical',
                `${qAction.operation} failed (exit code: ${result.exitCode || 1})`
              )
              addLog(qAction.id, 'critical', 'Quantum instability detected')
              qAction.quantumStability = Math.max(
                0,
                qAction.quantumStability - 20
              )

              // Log stderr preview
              if (result.error) {
                const preview = result.error.trim().substring(0, 200)
                if (preview) {
                  addLog(qAction.id, 'critical', `Error: ${preview}`)
                }
              }
            } else if (result.status === 'skipped') {
              qAction.status = 'skipped'
              addLog(
                qAction.id,
                'warning',
                'Action skipped due to failed dependencies'
              )
            }
          }
        },

        // Callback for progress updates
        onActionProgress: (action: ActionDefinition, progress: number) => {
          const qAction = quantumState.actions.find((a) => a.id === action.id)
          if (qAction) {
            qAction.progress = progress
            qAction.energyLevel = Math.max(
              50,
              qAction.energyLevel - Math.random() * 2
            )
          }
        },
      }

      // Execute with ActionScheduler (Directed handles DAG resolution)
      await scheduler.execute(context)
    } catch (error) {
      console.error('[QuantumActions] Execution error:', error)
      // Mark all pending/running actions as failed
      quantumState.actions.forEach((action) => {
        if (action.status === 'pending' || action.status === 'running') {
          action.status = 'failed'
          addLog(
            action.id,
            'critical',
            `Execution interrupted: ${error instanceof Error ? error.message : 'Unknown error'}`
          )
        }
      })
    } finally {
      quantumState.isExecuting = false
    }
  }

  /**
   * Resets the entire pipeline to initial state.
   *
   * @public
   * @since 1.0.0
   */
  const resetPipeline = (): void => {
    quantumState.actions.forEach((action) => {
      action.status = 'pending'
      action.progress = 0
      action.energyLevel = Math.max(88, Math.random() * 12 + 88) // Random energy 88-100%
      action.quantumStability = Math.max(94, Math.random() * 6 + 94) // Random stability 94-100%
      action.logs = []
      action.startTime = undefined
      action.endTime = undefined
    })

    quantumState.isExecuting = false
    quantumState.currentWave = 0
    quantumState.executionStartTime = null
  }

  /**
   * Stops the current pipeline execution.
   *
   * @public
   * @since 1.0.0
   */
  const stopExecution = (): void => {
    quantumState.actions.forEach((action) => {
      if (action.status === 'running' || action.status === 'initializing') {
        action.status = 'failed'
        action.endTime = new Date()
        addLog(
          action.id,
          'critical',
          'Execution terminated by quantum override'
        )
      }
    })

    quantumState.isExecuting = false
  }

  // Initialize actions on first use
  if (quantumState.actions.length === 0) {
    initializeActions()
  }

  return {
    // Reactive state
    actions: computed(() => quantumState.actions),
    isRunning,
    overallProgress,
    pipelineStatus,
    currentWave: computed(() => quantumState.currentWave),

    // Methods
    executeActions,
    resetPipeline,
    stopExecution,
    addLog,

    // Utilities
    initializeActions,
    loadActionsFromConfig,
  }
}
