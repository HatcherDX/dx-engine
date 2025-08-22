/**
 * @fileoverview Vue composable for System and Timeline terminals integration.
 *
 * @description
 * Vue composable that provides reactive integration between the system terminal
 * infrastructure and Vue.js components. Manages read-only terminals for
 * System and Timeline logging with real-time updates and state management.
 *
 * @example
 * ```vue
 * <script setup>
 * import { useSystemTerminals } from '@/composables/useSystemTerminals'
 *
 * const {
 *   systemTerminal,
 *   timelineTerminal,
 *   activeTerminal,
 *   initializeTerminals,
 *   setActiveTerminal
 * } = useSystemTerminals()
 *
 * // Initialize terminals on component mount
 * await initializeTerminals()
 * </script>
 * ```
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import type {
  ReadOnlyTerminalLine,
  ReadOnlyTerminalState,
  TerminalOutputEvent,
} from '@hatcherdx/terminal-system'
import { onMounted, onUnmounted, reactive, ref, type Ref } from 'vue'

/**
 * Configuration interface for useSystemTerminals composable.
 *
 * @description
 * Allows dependency injection and configuration of the composable behavior.
 * Supports both testing scenarios and production environments.
 *
 * @public
 * @since 1.0.0
 */
export interface UseSystemTerminalsConfig {
  /** Whether to auto-initialize terminals on mount */
  autoInit?: boolean
  /** Custom electron API implementation for testing */
  electronAPI?: SystemTerminalElectronAPI
  /** Custom window object for testing */
  windowObject?: Pick<Window, 'electronAPI'>
  /** Custom environment detection override */
  isElectronOverride?: boolean
  /** Custom console implementation for testing */
  console?: Pick<Console, 'log' | 'warn' | 'error' | 'info'>
}

/**
 * Environment detection interface for dependency injection.
 *
 * @description
 * Abstracts environment detection logic to make it testable.
 * Allows mocking of browser vs Electron environment detection.
 *
 * @public
 * @since 1.0.0
 */
export interface EnvironmentDetector {
  /** Check if running in Electron environment */
  isElectron(): boolean
  /** Get electron API if available */
  getElectronAPI(): SystemTerminalElectronAPI | undefined
  /** Get window object for environment checks */
  getWindow(): Pick<Window, 'electronAPI'> | undefined
}

/**
 * Default environment detector implementation.
 *
 * @description
 * Production implementation that checks actual browser/Electron environment.
 * Can be replaced with test implementation for testing scenarios.
 *
 * @private
 */
class DefaultEnvironmentDetector implements EnvironmentDetector {
  isElectron(): boolean {
    return typeof window !== 'undefined' && !!window.electronAPI
  }

  getElectronAPI(): SystemTerminalElectronAPI | undefined {
    return (window as unknown as { electronAPI?: SystemTerminalElectronAPI })
      ?.electronAPI
  }

  getWindow(): Pick<Window, 'electronAPI'> | undefined {
    return typeof window !== 'undefined' ? window : undefined
  }
}

// Electron IPC API interface for system terminals
interface SystemTerminalElectronAPI {
  systemTerminal: {
    initialize: (options?: {
      projectType?: string
      projectName?: string
      projectPath?: string
      packageManager?: string
    }) => Promise<{
      success: boolean
      message?: string
      error?: string
      data?: {
        systemTerminal: ReadOnlyTerminalState
        timelineTerminal: ReadOnlyTerminalState
      }
    }>

    log: (request: {
      level: 'info' | 'warn' | 'error'
      message: string
      terminal?: 'system' | 'timeline'
      context?: Record<string, unknown>
    }) => Promise<{ success: boolean; error?: string }>

    gitOperation: (request: {
      operation: string
      args?: unknown[]
      context?: Record<string, unknown>
    }) => Promise<{
      success: boolean
      message?: string
      executionTime?: number
      error?: string
    }>

    getTerminal: (terminalType: 'system' | 'timeline') => Promise<{
      success: boolean
      data?: ReadOnlyTerminalState
      error?: string
    }>

    listTerminals: () => Promise<{
      success: boolean
      data?: ReadOnlyTerminalState[]
      error?: string
    }>

    setActive: (terminalType: 'system' | 'timeline') => Promise<{
      success: boolean
      error?: string
    }>

    clear: (terminalType: 'system' | 'timeline') => Promise<{
      success: boolean
      error?: string
    }>

    getLines: (
      terminalType: 'system' | 'timeline',
      options?: {
        limit?: number
        type?: ReadOnlyTerminalLine['type']
        since?: string
      }
    ) => Promise<{
      success: boolean
      data?: ReadOnlyTerminalLine[]
      error?: string
    }>

    updateConfig: (
      terminalType: 'system' | 'timeline',
      config: {
        autoScroll?: boolean
        maxLines?: number
      }
    ) => Promise<{ success: boolean; error?: string }>

    // Event listeners
    onEvent: (
      callback: (data: {
        event: unknown
        terminal: 'system' | 'timeline'
      }) => void
    ) => void
    onOutput: (callback: (event: TerminalOutputEvent) => void) => void
    onActivated: (
      callback: (data: {
        terminalId: string
        terminalType: 'system' | 'timeline'
      }) => void
    ) => void
    onCleared: (
      callback: (data: {
        terminalId: string
        terminalType: 'system' | 'timeline'
      }) => void
    ) => void
  }
}

/**
 * Create environment detector with optional config override.
 *
 * @param config - Configuration object with environment overrides
 * @returns Environment detector instance
 *
 * @private
 */
function createEnvironmentDetector(
  config?: UseSystemTerminalsConfig
): EnvironmentDetector {
  if (
    config?.isElectronOverride !== undefined ||
    config?.electronAPI ||
    config?.windowObject
  ) {
    // Return test environment detector with overrides
    return {
      isElectron: () =>
        config.isElectronOverride ?? (config.electronAPI ? true : false),
      getElectronAPI: () => config.electronAPI,
      getWindow: () => config.windowObject,
    }
  }

  // Return production environment detector
  return new DefaultEnvironmentDetector()
}

/**
 * System terminal reactive state interface.
 *
 * @public
 */
export interface SystemTerminalState {
  /** Terminal configuration and metadata */
  terminal: ReadOnlyTerminalState | null
  /** Terminal output lines */
  lines: ReadOnlyTerminalLine[]
  /** Whether terminal is currently active/visible */
  isActive: boolean
  /** Terminal initialization status */
  isReady: boolean
  /** Last activity timestamp */
  lastActivity: Date | null
  /** Auto-scroll enabled */
  autoScroll: boolean
}

/**
 * System terminals composable return type.
 *
 * @public
 */
export interface UseSystemTerminalsReturn {
  /** System terminal state (IDE lifecycle events) */
  systemTerminal: SystemTerminalState
  /** Timeline terminal state (Git operations) */
  timelineTerminal: SystemTerminalState
  /** Currently active terminal */
  activeTerminal: Ref<'system' | 'timeline' | null>
  /** Whether terminals are initialized */
  isInitialized: Ref<boolean>
  /** Initialization error if any */
  initError: Ref<string | null>

  // Actions
  /** Initialize system terminals */
  initializeTerminals: () => Promise<void>
  /** Set active terminal */
  setActiveTerminal: (terminalType: 'system' | 'timeline' | null) => void
  /** Get filtered terminal lines */
  getFilteredLines: (
    terminalType: 'system' | 'timeline',
    filter?: {
      type?: ReadOnlyTerminalLine['type']
      since?: Date
      limit?: number
    }
  ) => Promise<ReadOnlyTerminalLine[]>

  // System logger access
  /** Log info message to System terminal */
  logInfo: (message: string, context?: Record<string, unknown>) => void
  /** Log warning message */
  logWarn: (message: string, context?: Record<string, unknown>) => void
  /** Log error message */
  logError: (message: string, context?: Record<string, unknown>) => void
  /** Log git command with Causa-Efecto pattern */
  logGitOperation: <T>(
    operation: string,
    gitFunction: () => Promise<T>,
    args?: unknown[]
  ) => Promise<T>
}

/**
 * useSystemTerminals - Vue composable for system terminal integration.
 *
 * @remarks
 * This composable provides reactive integration between Vue.js components
 * and the system terminal infrastructure. It handles:
 *
 * - Read-only terminal initialization and management
 * - Real-time terminal output updates via event listeners
 * - Terminal state synchronization with Vue reactivity
 * - System and git logging integration
 * - Terminal UI interaction (switching, scrolling, clearing)
 * - Auto-initialization when project context changes
 *
 * The composable is designed to work in both Electron and browser environments,
 * with graceful fallbacks and error handling.
 *
 * @example
 * ```vue
 * <template>
 *   <div class="system-terminals">
 *     <div class="terminal-tabs">
 *       <button
 *         :class="{ active: activeTerminal === 'system' }"
 *         @click="setActiveTerminal('system')"
 *       >
 *         System ({{ systemTerminal.lines.length }})
 *       </button>
 *       <button
 *         :class="{ active: activeTerminal === 'timeline' }"
 *         @click="setActiveTerminal('timeline')"
 *       >
 *         Timeline ({{ timelineTerminal.lines.length }})
 *       </button>
 *     </div>
 *
 *     <div v-if="activeTerminal === 'system'" class="terminal-output">
 *       <div
 *         v-for="line in systemTerminal.lines"
 *         :key="line.id"
 *         :class="['terminal-line', `line-${line.type.toLowerCase()}`]"
 *       >
 *         {{ line.content }}
 *       </div>
 *     </div>
 *
 *     <div v-if="activeTerminal === 'timeline'" class="terminal-output">
 *       <div
 *         v-for="line in timelineTerminal.lines"
 *         :key="line.id"
 *         :class="['terminal-line', `line-${line.type.toLowerCase()}`]"
 *       >
 *         {{ line.content }}
 *       </div>
 *     </div>
 *   </div>
 * </template>
 *
 * <script setup>
 * import { useSystemTerminals } from '@/composables/useSystemTerminals'
 *
 * const {
 *   systemTerminal,
 *   timelineTerminal,
 *   activeTerminal,
 *   isInitialized,
 *   initializeTerminals,
 *   setActiveTerminal,
 *   logInfo
 * } = useSystemTerminals()
 *
 * onMounted(async () => {
 *   await initializeTerminals()
 *   logInfo('System terminals UI initialized')
 * })
 * </script>
 * ```
 *
 * @returns System terminals reactive state and actions
 *
 * @public
 */
export function useSystemTerminals(
  config: UseSystemTerminalsConfig = {}
): UseSystemTerminalsReturn {
  // Create environment detector with config overrides
  const envDetector = createEnvironmentDetector(config)

  // Get dependencies from config or use defaults
  const isElectron = envDetector.isElectron()
  const electronAPI = envDetector.getElectronAPI()
  const consoleImpl = config.console ?? console
  const autoInit = config.autoInit ?? true

  // Reactive state
  const systemTerminal = reactive<SystemTerminalState>({
    terminal: null,
    lines: [],
    isActive: false,
    isReady: true,
    lastActivity: null,
    autoScroll: true,
  })

  const timelineTerminal = reactive<SystemTerminalState>({
    terminal: null,
    lines: [],
    isActive: false,
    isReady: true,
    lastActivity: null,
    autoScroll: true,
  })

  const activeTerminal = ref<'system' | 'timeline' | null>(null)
  const isInitialized = ref(false)
  const initError = ref<string | null>(null)

  // Event listener cleanup functions
  const eventListenerCleanups: (() => void)[] = []

  /**
   * Initialize system terminals using Electron IPC.
   */
  const initializeTerminals = async (): Promise<void> => {
    if (isInitialized.value) {
      return
    }

    try {
      initError.value = null

      if (!isElectron || !electronAPI?.systemTerminal) {
        // Fallback for non-Electron environments
        consoleImpl.warn(
          '[useSystemTerminals] Running in non-Electron environment, using mock data'
        )

        // Initialize with mock terminals
        systemTerminal.terminal = {
          id: 'system',
          name: 'Terminal [System]',
          type: 'system',
          isActive: true,
          createdAt: new Date(),
          lastActivity: new Date(),
          lines: [
            {
              id: 'init-1',
              content: `${new Date().toISOString().replace('T', ' ').substring(0, 23)} [INFO] Terminal [System] ready - monitoring IDE lifecycle events`,
              type: 'INFO',
              timestamp: new Date(),
            },
          ],
          autoScroll: true,
          maxLines: 500,
          status: 'ready',
        }

        timelineTerminal.terminal = {
          id: 'timeline',
          name: 'Terminal [Timeline]',
          type: 'timeline',
          isActive: false,
          createdAt: new Date(),
          lastActivity: new Date(),
          lines: [
            {
              id: 'init-2',
              content: `${new Date().toISOString().replace('T', ' ').substring(0, 23)} [INFO] Terminal [Timeline] ready - monitoring Git activity with complete traceability`,
              type: 'INFO',
              timestamp: new Date(),
            },
          ],
          autoScroll: true,
          maxLines: 1000,
          status: 'ready',
        }

        systemTerminal.lines = [...(systemTerminal.terminal.lines || [])]
        systemTerminal.isReady = true
        systemTerminal.isActive = false

        timelineTerminal.lines = [...(timelineTerminal.terminal.lines || [])]
        timelineTerminal.isReady = true
        timelineTerminal.isActive = false

        activeTerminal.value = null
        isInitialized.value = true
        return
      }

      // Initialize system terminals via IPC
      const result = await electronAPI.systemTerminal.initialize()

      if (!result.success) {
        throw new Error(result.error || 'Failed to initialize system terminals')
      }

      if (!result.data?.systemTerminal || !result.data?.timelineTerminal) {
        throw new Error('System terminals not returned from initialization')
      }

      // Update reactive state with IPC data
      systemTerminal.terminal = result.data.systemTerminal
      systemTerminal.lines = [...(result.data.systemTerminal.lines || [])]
      systemTerminal.isReady = true
      systemTerminal.isActive = result.data.systemTerminal.isActive

      timelineTerminal.terminal = result.data.timelineTerminal
      timelineTerminal.lines = [...(result.data.timelineTerminal.lines || [])]
      timelineTerminal.isReady = true
      timelineTerminal.isActive = result.data.timelineTerminal.isActive

      // Set initial active terminal based on IPC response
      if (result.data.systemTerminal.isActive) {
        activeTerminal.value = 'system'
      } else if (result.data.timelineTerminal.isActive) {
        activeTerminal.value = 'timeline'
      } else {
        // No terminal active by default - will be activated when needed
        activeTerminal.value = null
        systemTerminal.isActive = false
        timelineTerminal.isActive = false
      }

      // Setup IPC event listeners
      setupIPCEventListeners()

      isInitialized.value = true

      // Log successful initialization via IPC
      await logInfo('System terminals Vue integration initialized')
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      initError.value = errorMessage
      consoleImpl.error('[useSystemTerminals] Initialization failed:', error)
    }
  }

  /**
   * Setup IPC event listeners for terminal updates.
   *
   * @private
   */
  const setupIPCEventListeners = (): void => {
    if (!isElectron || !electronAPI?.systemTerminal) return

    // Listen for terminal output events
    const onOutput = (event: TerminalOutputEvent) => {
      if (event.terminal === 'system') {
        // Update system terminal lines
        if (systemTerminal.terminal) {
          systemTerminal.terminal.lines.push(event.line)
          systemTerminal.lines = [...systemTerminal.terminal.lines]
          systemTerminal.lastActivity = event.timestamp

          // Enforce line limits
          if (
            systemTerminal.terminal.lines.length >
            systemTerminal.terminal.maxLines
          ) {
            systemTerminal.terminal.lines.shift()
            systemTerminal.lines = [...systemTerminal.terminal.lines]
          }
        }
      } else if (event.terminal === 'timeline') {
        // Update timeline terminal lines
        if (timelineTerminal.terminal) {
          timelineTerminal.terminal.lines.push(event.line)
          timelineTerminal.lines = [...timelineTerminal.terminal.lines]
          timelineTerminal.lastActivity = event.timestamp

          // Enforce line limits
          if (
            timelineTerminal.terminal.lines.length >
            timelineTerminal.terminal.maxLines
          ) {
            timelineTerminal.terminal.lines.shift()
            timelineTerminal.lines = [...timelineTerminal.terminal.lines]
          }
        }
      }
    }

    // Listen for terminal activation
    const onActivated = (data: {
      terminalId: string
      terminalType: 'system' | 'timeline'
    }) => {
      if (data.terminalType === 'system') {
        systemTerminal.isActive = true
        timelineTerminal.isActive = false
        activeTerminal.value = 'system'
      } else if (data.terminalType === 'timeline') {
        systemTerminal.isActive = false
        timelineTerminal.isActive = true
        activeTerminal.value = 'timeline'
      }
    }

    // Listen for terminal clearing
    const onCleared = (data: {
      terminalId: string
      terminalType: 'system' | 'timeline'
    }) => {
      if (data.terminalType === 'system') {
        systemTerminal.lines = []
        if (systemTerminal.terminal) {
          systemTerminal.terminal.lines = []
        }
      } else if (data.terminalType === 'timeline') {
        timelineTerminal.lines = []
        if (timelineTerminal.terminal) {
          timelineTerminal.terminal.lines = []
        }
      }
    }

    // Register event listeners
    electronAPI.systemTerminal.onOutput(onOutput)
    electronAPI.systemTerminal.onActivated(onActivated)
    electronAPI.systemTerminal.onCleared(onCleared)

    // Store cleanup functions
    eventListenerCleanups.push(() => {
      // Note: In a real implementation, we'd need proper cleanup
      // For now, we'll assume the IPC events are handled by Electron
    })
  }

  /**
   * Set active terminal via IPC.
   */
  const setActiveTerminal = async (
    terminalType: 'system' | 'timeline' | null
  ): Promise<void> => {
    // Auto-initialize if not initialized yet
    if (!isInitialized.value) {
      await initializeTerminals()
    }

    if (!isElectron || !electronAPI?.systemTerminal) {
      // Mock implementation for non-Electron environments
      consoleImpl.log(
        '[useSystemTerminals] Setting activeTerminal to:',
        terminalType
      )
      activeTerminal.value = terminalType
      systemTerminal.isActive = terminalType === 'system'
      systemTerminal.isReady =
        terminalType === 'system' || systemTerminal.isReady
      timelineTerminal.isActive = terminalType === 'timeline'
      timelineTerminal.isReady =
        terminalType === 'timeline' || timelineTerminal.isReady
      consoleImpl.log(
        '[useSystemTerminals] activeTerminal is now:',
        activeTerminal.value
      )
      return
    }

    // Handle null case (deactivate all system terminals)
    if (terminalType === null) {
      activeTerminal.value = null
      systemTerminal.isActive = false
      timelineTerminal.isActive = false
      return
    }

    try {
      const result = await electronAPI.systemTerminal.setActive(terminalType)
      if (result.success) {
        activeTerminal.value = terminalType
      } else {
        consoleImpl.error(
          '[useSystemTerminals] Failed to set active terminal:',
          result.error
        )
      }
    } catch (error) {
      consoleImpl.error(
        '[useSystemTerminals] Error setting active terminal:',
        error
      )
    }
  }

  /**
   * Get filtered terminal lines via IPC.
   */
  const getFilteredLines = async (
    terminalType: 'system' | 'timeline',
    filter?: {
      type?: ReadOnlyTerminalLine['type']
      since?: Date
      limit?: number
    }
  ): Promise<ReadOnlyTerminalLine[]> => {
    if (!isInitialized.value) return []

    if (!isElectron || !electronAPI?.systemTerminal) {
      // Mock implementation for non-Electron environments
      const terminal =
        terminalType === 'system' ? systemTerminal : timelineTerminal
      let lines = [...terminal.lines]

      if (filter?.type) {
        lines = lines.filter((line) => line.type === filter.type)
      }

      if (filter?.since) {
        lines = lines.filter((line) => line.timestamp >= filter.since!)
      }

      if (filter?.limit && filter.limit > 0) {
        lines = lines.slice(-filter.limit)
      }

      return lines
    }

    try {
      const result = await electronAPI.systemTerminal.getLines(terminalType, {
        ...filter,
        since: filter?.since?.toISOString(),
      })

      if (result.success && result.data) {
        return result.data
      } else {
        consoleImpl.error(
          '[useSystemTerminals] Failed to get terminal lines:',
          result.error
        )
        return []
      }
    } catch (error) {
      consoleImpl.error(
        '[useSystemTerminals] Error getting terminal lines:',
        error
      )
      return []
    }
  }

  /**
   * Log info message to System terminal via IPC.
   */
  const logInfo = async (
    message: string,
    context?: Record<string, unknown>
  ): Promise<void> => {
    if (!isElectron || !electronAPI?.systemTerminal) {
      consoleImpl.info(`[System] ${message}`, context)
      return
    }

    try {
      await electronAPI.systemTerminal.log({
        level: 'info',
        message,
        terminal: 'system',
        context,
      })
    } catch (error) {
      consoleImpl.error('[useSystemTerminals] Error logging info:', error)
    }
  }

  /**
   * Log warning message via IPC.
   */
  const logWarn = async (
    message: string,
    context?: Record<string, unknown>
  ): Promise<void> => {
    if (!isElectron || !electronAPI?.systemTerminal) {
      consoleImpl.warn(`[System] ${message}`, context)
      return
    }

    try {
      await electronAPI.systemTerminal.log({
        level: 'warn',
        message,
        terminal: 'system',
        context,
      })
    } catch (error) {
      consoleImpl.error('[useSystemTerminals] Error logging warning:', error)
    }
  }

  /**
   * Log error message via IPC.
   */
  const logError = async (
    message: string,
    context?: Record<string, unknown>
  ): Promise<void> => {
    if (!isElectron || !electronAPI?.systemTerminal) {
      consoleImpl.error(`[System] ${message}`, context)
      return
    }

    try {
      await electronAPI.systemTerminal.log({
        level: 'error',
        message,
        terminal: 'system',
        context,
      })
    } catch (error) {
      consoleImpl.error('[useSystemTerminals] Error logging error:', error)
    }
  }

  /**
   * Log git operation with Causa-Efecto pattern via IPC.
   */
  const logGitOperation = async <T>(
    operation: string,
    gitFunction: () => Promise<T>,
    args?: unknown[]
  ): Promise<T> => {
    if (!isElectron || !electronAPI?.systemTerminal) {
      // Fallback: execute without logging
      consoleImpl.info(`[Git] ${operation}`, args)
      const result = await gitFunction()
      consoleImpl.info(`[Git] ${operation} completed`)
      return result
    }

    try {
      // Log git operation via IPC (will handle Causa-Efecto logging)
      await electronAPI.systemTerminal.gitOperation({
        operation,
        args,
        context: { timestamp: new Date().toISOString() },
      })

      // Execute the actual git function
      const result = await gitFunction()

      return result
    } catch (error) {
      consoleImpl.error('[useSystemTerminals] Git operation failed:', error)
      throw error
    }
  }

  // Auto-initialize when composable is used (configurable)
  onMounted(() => {
    if (autoInit) {
      // Auto-initialize terminals (can be called multiple times safely)
      initializeTerminals().catch((error) => {
        consoleImpl.warn(
          '[useSystemTerminals] Auto-initialization failed:',
          error
        )
      })
    }
  })

  // Cleanup on unmount
  onUnmounted(() => {
    // Cleanup IPC event listeners
    eventListenerCleanups.forEach((cleanup) => cleanup())
    eventListenerCleanups.length = 0
  })

  return {
    // State
    systemTerminal,
    timelineTerminal,
    activeTerminal,
    isInitialized,
    initError,

    // Actions
    initializeTerminals,
    setActiveTerminal,
    getFilteredLines,

    // Logging
    logInfo,
    logWarn,
    logError,
    logGitOperation,
  }
}
