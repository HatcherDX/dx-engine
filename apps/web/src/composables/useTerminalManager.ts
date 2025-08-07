/**
 * Terminal Manager Composable - VSCode Style Terminal Management
 *
 * Provides comprehensive terminal management functionality for both Electron and Web environments.
 * Automatically detects the runtime environment and uses appropriate communication methods
 * (IPC for Electron, WebSocket for Web). Manages terminal lifecycle, state, and provides
 * a unified interface for terminal operations.
 *
 * @remarks
 * This composable is part of the {@link https://github.com/hatcherdx/dx-engine | DX Engine} terminal system.
 * It follows Vue 3 Composition API patterns and provides reactive state management for terminals.
 *
 * The manager supports:
 * - Auto-detection of Electron vs Web environments
 * - Multi-terminal management with active terminal tracking
 * - Real-time terminal state synchronization
 * - Error handling and recovery mechanisms
 * - Event-driven architecture for terminal lifecycle events
 *
 * @example
 * Basic usage in a component:
 * ```typescript
 * import { useTerminalManager } from './useTerminalManager'
 *
 * export default defineComponent({
 *   setup() {
 *     const {
 *       terminals,
 *       activeTerminalId,
 *       createTerminal,
 *       closeTerminal,
 *       setActiveTerminal
 *     } = useTerminalManager()
 *
 *     // Create a new terminal
 *     const handleCreateTerminal = async () => {
 *       try {
 *         const terminal = await createTerminal({ name: 'New Terminal' })
 *         console.log('Created terminal:', terminal.id)
 *       } catch (error) {
 *         console.error('Failed to create terminal:', error)
 *       }
 *     }
 *
 *     return {
 *       terminals,
 *       activeTerminalId,
 *       handleCreateTerminal
 *     }
 *   }
 * })
 * ```
 *
 * @example
 * Advanced usage with custom options:
 * ```typescript
 * const { createTerminal } = useTerminalManager()
 *
 * // Create terminal with custom shell and working directory
 * const customTerminal = await createTerminal({
 *   name: 'Development Terminal',
 *   shell: '/bin/zsh',
 *   cwd: '/project/root',
 *   env: { NODE_ENV: 'development' },
 *   cols: 120,
 *   rows: 30
 * })
 * ```
 *
 * @public
 */

import { computed, ref } from 'vue'
import { useTerminalModeDetector } from './useTerminalModeDetector'

/**
 * Represents the complete state of a terminal instance.
 *
 * @remarks
 * This interface defines all properties that track a terminal's lifecycle,
 * from creation to termination. The state is reactive and updates automatically
 * as terminal conditions change.
 *
 * @public
 */
interface TerminalState {
  /** Unique identifier for the terminal instance */
  id: string

  /** Human-readable name for the terminal (displayed in UI) */
  name: string

  /** Whether the terminal process is currently running */
  isRunning: boolean

  /** Whether this terminal is the currently active/focused one */
  isActive: boolean

  /** Process ID of the terminal (undefined for failed terminals) */
  pid?: number

  /** Shell program being used (e.g., '/bin/bash', '/bin/zsh') */
  shell?: string

  /** Current working directory of the terminal */
  cwd?: string

  /** Timestamp when the terminal was created */
  createdAt: Date

  /** Timestamp of the last activity/interaction */
  lastActivity: Date

  /** Exit code when terminal terminates (undefined if still running) */
  exitCode?: number
}

/**
 * Configuration options for creating a new terminal instance.
 *
 * @remarks
 * All properties are optional and will fall back to sensible defaults
 * if not provided. The terminal manager will auto-detect appropriate
 * values based on the runtime environment.
 *
 * @public
 */
interface CreateTerminalOptions {
  /** Custom name for the terminal (defaults to 'Terminal N') */
  name?: string

  /** Shell program to use (defaults to system default) */
  shell?: string

  /** Working directory to start in (defaults to user home or project root) */
  cwd?: string

  /** Environment variables to set for the terminal session */
  env?: Record<string, string>

  /** Terminal width in columns (defaults to 80) */
  cols?: number

  /** Terminal height in rows (defaults to 24) */
  rows?: number
}

/**
 * Response structure from terminal creation operations.
 *
 * @remarks
 * This interface represents the standardized response format from both
 * Electron IPC and WebSocket terminal creation requests. The response
 * includes success status and either terminal data or error information.
 *
 * @internal
 */
interface TerminalCreateResponse {
  /** Whether the terminal creation was successful */
  success: boolean

  /** Terminal information when creation succeeds */
  data?: {
    /** Unique identifier assigned to the new terminal */
    id: string

    /** Name of the created terminal */
    name: string

    /** Process ID of the terminal */
    pid: number

    /** Shell program being used */
    shell: string

    /** Working directory of the terminal */
    cwd: string
  }

  /** Error message when creation fails */
  error?: string
}

/**
 * Backend terminal data structure from terminal-list response
 */
interface BackendTerminal {
  id: string
  pid: number
  shell: string
  cwd: string
  strategy?: string
  backend?: string
  capabilities?: unknown
}

/**
 * Terminal list response structure
 */
interface TerminalListResponse {
  success: boolean
  data?: BackendTerminal[]
}

/**
 * Global reactive state for all terminal instances.
 *
 * @remarks
 * This ref contains the complete list of all terminal instances managed
 * by the terminal manager. It's reactive and automatically updates the UI
 * when terminals are created, modified, or destroyed.
 *
 * @internal
 */
const terminals = ref<TerminalState[]>([])

/**
 * Global counter for generating unique terminal names.
 *
 * @remarks
 * Used to generate default names like 'Terminal 1', 'Terminal 2', etc.
 * when no custom name is provided during terminal creation.
 *
 * @internal
 */
const terminalCounter = ref(0)

/**
 * Terminal Manager Composable
 *
 * Provides a comprehensive interface for managing terminal instances in both
 * Electron and Web environments. Automatically detects the runtime context
 * and uses appropriate communication mechanisms.
 *
 * @returns An object containing reactive terminal state and management functions
 *
 * @throws {Error} When terminal server is not available in Web mode
 * @throws {Error} When terminal creation fails due to system limitations
 * @throws {Error} When Electron API is not available for required operations
 *
 * @example
 * ```typescript
 * const {
 *   terminals,
 *   activeTerminalId,
 *   activeTerminal,
 *   runningCount,
 *   createTerminal,
 *   closeTerminal,
 *   setActiveTerminal,
 *   getTerminal,
 *   listTerminals,
 *   clearAllTerminals
 * } = useTerminalManager()
 * ```
 *
 * @public
 */
export function useTerminalManager() {
  /**
   * Initialize terminal mode detector for environment-specific communication.
   *
   * @remarks
   * The mode detector automatically determines whether we're running in
   * Electron (IPC) or Web (WebSocket) mode and provides unified communication.
   */
  const modeDetector = useTerminalModeDetector()

  /**
   * Computed property that returns the ID of the currently active terminal.
   *
   * @remarks
   * Returns `undefined` if no terminal is currently active. The active terminal
   * is the one that receives keyboard input and is highlighted in the UI.
   *
   * @returns The ID of the active terminal, or `undefined` if none is active
   */
  const activeTerminalId = computed(() => {
    return terminals.value.find((t) => t.isActive)?.id
  })

  /**
   * Computed property that returns the complete state of the currently active terminal.
   *
   * @remarks
   * Provides direct access to the full `TerminalState` object of the active terminal,
   * including all properties like name, process ID, shell, etc.
   *
   * @returns The active terminal's complete state, or `undefined` if none is active
   */
  const activeTerminal = computed(() => {
    return terminals.value.find((t) => t.isActive)
  })

  /**
   * Computed property that returns the count of currently running terminals.
   *
   * @remarks
   * This count excludes terminated or failed terminals. Useful for displaying
   * statistics in the UI or determining if any terminals are active.
   *
   * @returns The number of terminals with `isRunning: true`
   */
  const runningCount = computed(() => {
    return terminals.value.filter((t) => t.isRunning).length
  })

  /**
   * Creates a new terminal instance with the specified options.
   *
   * @param options - Configuration options for the new terminal
   * @returns Promise that resolves to the created terminal's state
   *
   * @throws {Error} When terminal server is unavailable in Web mode
   * @throws {Error} When terminal creation fails due to system constraints
   * @throws {Error} When invalid options are provided
   *
   * @remarks
   * This function automatically detects the runtime environment and uses the
   * appropriate communication method (IPC for Electron, WebSocket for Web).
   *
   * The created terminal will be automatically added to the terminals list.
   * If this is the first terminal, it will be set as the active terminal.
   *
   * In case of failure, a failed terminal state is still added to the list
   * for UI feedback purposes, and the original error is re-thrown.
   *
   * @example
   * Create a terminal with default options:
   * ```typescript
   * const terminal = await createTerminal()
   * console.log('Created:', terminal.name) // "Terminal 1"
   * ```
   *
   * @example
   * Create a terminal with custom configuration:
   * ```typescript
   * const terminal = await createTerminal({
   *   name: 'Development Shell',
   *   shell: '/bin/zsh',
   *   cwd: '/project/src',
   *   env: { NODE_ENV: 'development' }
   * })
   * ```
   *
   * @public
   */
  const createTerminal = async (
    options: CreateTerminalOptions = {}
  ): Promise<TerminalState> => {
    terminalCounter.value++
    const name = options.name || `Terminal ${terminalCounter.value}`

    try {
      // Auto-detect mode and use appropriate communication method
      let response: TerminalCreateResponse

      if (modeDetector.isElectronMode.value && window.electronAPI) {
        // Electron mode - use IPC
        response = (await window.electronAPI.invoke('terminal-create', {
          name,
          shell: options.shell,
          cwd: options.cwd,
          env: options.env,
          cols: options.cols || 80,
          rows: options.rows || 24,
        })) as TerminalCreateResponse
      } else {
        // Web mode - check if connected

        if (!modeDetector.isConnected.value) {
          throw new Error(
            'Terminal server not available. Please run in Electron mode or ensure WebSocket terminal server is running on port 3001.'
          )
        }

        // WebSocket connection available - use it
        response = (await modeDetector.sendMessage('create', {
          terminalId: `terminal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          shell: options.shell,
          cwd: options.cwd,
          env: options.env,
          cols: options.cols || 80,
          rows: options.rows || 24,
        })) as TerminalCreateResponse

        // Transform WebSocket response to match expected format
        if (response && !('success' in response)) {
          const wsResponse = response as unknown as {
            terminalId?: string
            pid?: number
            shell?: string
            cwd?: string
          }
          response = {
            success: true,
            data: {
              id: wsResponse.terminalId || `terminal-${Date.now()}`,
              name,
              pid: wsResponse.pid || 0,
              shell: wsResponse.shell || options.shell || 'bash',
              cwd: wsResponse.cwd || options.cwd || process.cwd(),
            },
          }
        }
      }

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to create terminal')
      }

      const terminal: TerminalState = {
        id: response.data.id,
        name: response.data.name || name,
        isRunning: true,
        isActive: terminals.value.length === 0, // First terminal is active
        pid: response.data.pid,
        shell: response.data.shell,
        cwd: response.data.cwd,
        createdAt: new Date(),
        lastActivity: new Date(),
      }

      // Add to terminals list
      terminals.value.push(terminal)

      // Set as active if it's the first terminal
      if (terminals.value.length === 1) {
        setActiveTerminal(terminal.id)
      }

      return terminal
    } catch (error) {
      console.error('[Terminal Manager] Failed to create terminal:', error)

      // Create a failed terminal state for UI feedback
      const failedTerminal: TerminalState = {
        id: `failed-${Date.now()}`,
        name: `${name} (Failed)`,
        isRunning: false,
        isActive: false,
        createdAt: new Date(),
        lastActivity: new Date(),
        exitCode: -1,
      }

      terminals.value.push(failedTerminal)
      throw error
    }
  }

  /**
   * Closes an existing terminal and removes it from the managed terminals list.
   *
   * @param terminalId - The unique identifier of the terminal to close
   * @returns Promise that resolves when the terminal is successfully closed
   *
   * @throws {Error} When Electron API is not available
   * @throws {Error} When the terminal closure operation fails
   * @throws {Error} When the specified terminal ID is not found
   *
   * @remarks
   * This function performs the following operations:
   * 1. Sends a close request to the terminal backend
   * 2. Removes the terminal from the local state
   * 3. If the closed terminal was active, automatically activates another terminal
   * 4. Updates the UI to reflect the change
   *
   * The function ensures proper cleanup and state management even if the
   * backend operation fails.
   *
   * @example
   * Close a specific terminal:
   * ```typescript
   * try {
   *   await closeTerminal('terminal-123')
   *   console.log('Terminal closed successfully')
   * } catch (error) {
   *   console.error('Failed to close terminal:', error)
   * }
   * ```
   *
   * @public
   */
  const closeTerminal = async (terminalId: string): Promise<void> => {
    try {
      if (!window.electronAPI) {
        throw new Error('Electron API not available')
      }

      const response = (await window.electronAPI.invoke(
        'terminal-close',
        terminalId
      )) as { success: boolean; error?: string }

      if (!response.success) {
        throw new Error(response.error || 'Failed to close terminal')
      }

      // Remove from terminals list
      const terminalIndex = terminals.value.findIndex(
        (t) => t.id === terminalId
      )
      if (terminalIndex !== -1) {
        const wasActive = terminals.value[terminalIndex].isActive
        terminals.value.splice(terminalIndex, 1)

        // If the closed terminal was active, activate another one
        if (wasActive && terminals.value.length > 0) {
          setActiveTerminal(terminals.value[0].id)
        }
      }
    } catch (error) {
      console.error('[Terminal Manager] Failed to close terminal:', error)
      throw error
    }
  }

  /**
   * Sets the specified terminal as the active (focused) terminal.
   *
   * @param terminalId - The unique identifier of the terminal to activate
   * @returns void
   *
   * @remarks
   * This function updates the `isActive` flag for all terminals, ensuring
   * only one terminal is active at a time. It also updates the `lastActivity`
   * timestamp for the newly activated terminal.
   *
   * The active terminal receives keyboard input and is typically highlighted
   * in the user interface. If the specified terminal ID doesn't exist,
   * no terminal will be marked as active.
   *
   * @example
   * Activate a specific terminal:
   * ```typescript
   * setActiveTerminal('terminal-456')
   *
   * // Check which terminal is now active
   * console.log('Active terminal:', activeTerminalId.value)
   * ```
   *
   * @public
   */
  const setActiveTerminal = (terminalId: string): void => {
    terminals.value.forEach((terminal) => {
      terminal.isActive = terminal.id === terminalId
      if (terminal.isActive) {
        terminal.lastActivity = new Date()
      }
    })
  }

  /**
   * Retrieves the state of a specific terminal by its ID.
   *
   * @param terminalId - The unique identifier of the terminal to retrieve
   * @returns The terminal's complete state, or `undefined` if not found
   *
   * @remarks
   * This is a synchronous operation that searches the local terminal state.
   * It does not communicate with the backend and only reflects the locally
   * cached terminal information.
   *
   * @example
   * Get terminal information:
   * ```typescript
   * const terminal = getTerminal('terminal-123')
   * if (terminal) {
   *   console.log('Terminal name:', terminal.name)
   *   console.log('Is running:', terminal.isRunning)
   * } else {
   *   console.log('Terminal not found')
   * }
   * ```
   *
   * @public
   */
  const getTerminal = (terminalId: string): TerminalState | undefined => {
    return terminals.value.find((t) => t.id === terminalId)
  }

  /**
   * Retrieves and synchronizes the complete list of terminal instances.
   *
   * @returns Promise that resolves to an array of all terminal states
   *
   * @throws {Error} When backend communication fails (error is logged but not thrown)
   *
   * @remarks
   * This function attempts to synchronize local terminal state with the backend
   * when running in Electron mode. It updates existing terminal information
   * with fresh data from the backend (PID, shell, working directory, etc.).
   *
   * In Web mode or when backend communication fails, it returns the local
   * terminal state without synchronization.
   *
   * The function is designed to be resilient - it will always return a valid
   * array even if backend operations fail.
   *
   * @example
   * Get all terminals with fresh backend data:
   * ```typescript
   * const allTerminals = await listTerminals()
   * console.log(`Found ${allTerminals.length} terminals`)
   *
   * allTerminals.forEach(terminal => {
   *   console.log(`${terminal.name}: ${terminal.isRunning ? 'running' : 'stopped'}`)
   * })
   * ```
   *
   * @public
   */
  const listTerminals = async (): Promise<TerminalState[]> => {
    try {
      if (!window.electronAPI) {
        return terminals.value
      }

      const response = (await window.electronAPI.invoke(
        'terminal-list'
      )) as TerminalListResponse

      if (response.success && response.data) {
        // Update our local state with backend data
        response.data.forEach((backendTerminal: BackendTerminal) => {
          const existingTerminal = terminals.value.find(
            (t) => t.id === backendTerminal.id
          )
          if (existingTerminal) {
            existingTerminal.pid = backendTerminal.pid
            existingTerminal.shell = backendTerminal.shell
            existingTerminal.cwd = backendTerminal.cwd
            existingTerminal.isRunning = true
            existingTerminal.lastActivity = new Date()
          }
        })
      }

      return terminals.value
    } catch (error) {
      console.error('[Terminal Manager] Failed to list terminals:', error)
      return terminals.value
    }
  }

  /**
   * Clears all terminals from the local state and resets the counter.
   *
   * @returns void
   *
   * @remarks
   * This is a local operation only - it does not communicate with the backend
   * to actually terminate running terminal processes. It's primarily used for
   * testing, debugging, or UI reset scenarios.
   *
   * After calling this function:
   * - The terminals array will be empty
   * - The terminal counter will be reset to 0
   * - No terminal will be marked as active
   *
   * @example
   * Clear all terminals:
   * ```typescript
   * clearAllTerminals()
   * console.log('Terminals cleared:', terminals.value.length) // 0
   * ```
   *
   * @public
   */
  const clearAllTerminals = (): void => {
    terminals.value = []
    terminalCounter.value = 0
  }

  /**
   * Sets up event handlers for terminal lifecycle events from the backend.
   *
   * @returns void
   *
   * @remarks
   * This function registers event listeners for terminal-related events when
   * running in Electron mode. It handles:
   *
   * - `terminal-exit`: When a terminal process exits normally
   * - `terminal-killed`: When a terminal process is forcefully terminated
   *
   * The handlers update the local terminal state to reflect the backend changes,
   * ensuring the UI stays synchronized with actual terminal status.
   *
   * This function is called automatically during composable initialization
   * and does nothing when not in Electron mode.
   *
   * @internal
   */
  const setupEventHandlers = (): void => {
    if (!window.electronAPI) return

    // Handle terminal exit events
    window.electronAPI.on('terminal-exit', (data: unknown) => {
      const exitData = data as { id: string; exitCode: number }
      const terminal = terminals.value.find((t) => t.id === exitData.id)
      if (terminal) {
        terminal.isRunning = false
        terminal.exitCode = exitData.exitCode
        terminal.lastActivity = new Date()
      }
    })

    // Handle terminal killed events
    window.electronAPI.on('terminal-killed', (data: unknown) => {
      const killedData = data as { id: string }
      const terminal = terminals.value.find((t) => t.id === killedData.id)
      if (terminal) {
        terminal.isRunning = false
        terminal.exitCode = -1
        terminal.lastActivity = new Date()
      }
    })
  }

  // Initialize event handlers
  setupEventHandlers()

  return {
    // State
    terminals: computed(() => terminals.value),
    activeTerminalId,
    activeTerminal,
    runningCount,

    // Actions
    createTerminal,
    closeTerminal,
    setActiveTerminal,
    getTerminal,
    listTerminals,
    clearAllTerminals,
  }
}
