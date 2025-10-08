/**
 * @fileoverview File watching composable for monitoring project file changes via Electron IPC.
 *
 * @description
 * Provides an event-driven file watching system using Electron's main process
 * with Chokidar to monitor project files for changes. Replaces timer-based polling
 * with efficient file system events. Integrates with git branch detection,
 * file tree updates, and actions pipeline triggering.
 *
 * @example
 * ```typescript
 * const {
 *   startWatching,
 *   stopWatching,
 *   onFileChange,
 *   isWatching
 * } = useFileWatcher()
 *
 * // Start watching current project
 * startWatching('/path/to/project')
 *
 * // Listen for file changes
 * onFileChange('git', () => {
 *   console.log('Git files changed - update branch info')
 * })
 * ```
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import { ref, readonly, onUnmounted, type Ref } from 'vue'

/**
 * File change event types for categorizing different kinds of changes.
 */
export type FileChangeEventType =
  | 'git' // Git-related files (.git/, .gitignore, etc.)
  | 'config' // Configuration files (package.json, tsconfig.json, etc.)
  | 'source' // Source code files (.ts, .vue, .js, etc.)
  | 'build' // Build output and temporary files
  | 'dependency' // node_modules, lockfiles
  | 'other' // All other files

/**
 * File change event data passed to event listeners.
 */
export interface FileChangeEvent {
  /**
   * Type of file change event.
   */
  type: FileChangeEventType

  /**
   * Full path to the changed file.
   */
  path: string

  /**
   * Type of change that occurred.
   */
  changeType: 'add' | 'change' | 'unlink' | 'addDir' | 'unlinkDir'

  /**
   * Timestamp when the change was detected.
   */
  timestamp: number
}

/**
 * Event listener function type for file change events.
 */
export type FileChangeListener = (event: FileChangeEvent) => void

/**
 * Composable for managing file system watching with event-driven updates via Electron IPC.
 *
 * @remarks
 * Uses Electron's main process with Chokidar for efficient file watching.
 * Categorizes file changes into different types to allow selective responses.
 * Includes debouncing to prevent rapid-fire events and optimize performance.
 *
 * @returns Object containing file watching controls and state
 *
 * @public
 */
export function useFileWatcher() {
  // State
  const isWatching: Ref<boolean> = ref(false)
  const watchedPath: Ref<string | null> = ref(null)

  // Private state
  let currentWatcherId: string | null = null
  const eventListeners = new Map<FileChangeEventType, Set<FileChangeListener>>()
  const debounceTimers = new Map<string, NodeJS.Timeout>()

  /**
   * Emits a file change event to all registered listeners.
   *
   * @param event - The file change event to emit
   *
   * @internal
   */
  const emitFileChangeEvent = (event: FileChangeEvent): void => {
    const listeners = eventListeners.get(event.type)
    if (listeners) {
      listeners.forEach((listener) => {
        try {
          listener(event)
        } catch (error) {
          console.error('[FileWatcher] Error in event listener:', error)
        }
      })
    }
  }

  /**
   * Handles file change events from the Electron main process with debouncing.
   *
   * @param event - The file change event from main process
   *
   * @internal
   */
  const handleFileChangeFromMain = (event: FileChangeEvent): void => {
    // Clear existing debounce timer for this file
    const existingTimer = debounceTimers.get(event.path)
    if (existingTimer) {
      clearTimeout(existingTimer)
    }

    // Set new debounced event
    const timer = setTimeout(() => {
      emitFileChangeEvent(event)
      debounceTimers.delete(event.path)
    }, 150) // 150ms debounce

    debounceTimers.set(event.path, timer)
  }

  /**
   * Sets up IPC event listeners for file change events.
   *
   * @internal
   */
  const setupIPCListeners = (): void => {
    if (!window.electronAPI) {
      console.error(
        '[FileWatcher] ElectronAPI not available - not in Electron environment'
      )
      return
    }

    // Listen for batch file change events (new coalescence system)
    if (typeof window.electronAPI.on === 'function') {
      window.electronAPI.on('file-change-batch', (data: unknown) => {
        const batchData = data as {
          watcherId: string
          signals: FileChangeEvent[]
          timestamp: number
        }
        // Only log large batches to reduce console noise
        if (batchData.signals.length > 100) {
          console.log(
            `[FileWatcher] 📦 Received batch of ${batchData.signals.length} file changes`
          )
        }

        // Process each signal in the batch
        batchData.signals.forEach((signal) => {
          handleFileChangeFromMain(signal)
        })
      })
    }

    // Keep legacy single event support for backward compatibility
    if (typeof window.electronAPI.onFileChangeEvent === 'function') {
      window.electronAPI.onFileChangeEvent((event: FileChangeEvent) => {
        handleFileChangeFromMain(event)
      })
    } else if (typeof window.electronAPI.on === 'function') {
      // Use generic 'on' method for single events
      window.electronAPI.on('file-change-event', (event: unknown) => {
        handleFileChangeFromMain(event as FileChangeEvent)
      })
    } else {
      // Fallback: listen via message events
      window.addEventListener('message', (msg) => {
        if (msg.data.type === 'file-change-event') {
          handleFileChangeFromMain(msg.data.payload)
        } else if (msg.data.type === 'file-change-batch') {
          const data = msg.data.payload
          data.signals.forEach((signal: FileChangeEvent) => {
            handleFileChangeFromMain(signal)
          })
        }
      })
    }
  }

  /**
   * Starts watching a directory for file changes via Electron main process.
   *
   * @param projectPath - Absolute path to the project directory to watch
   * @returns Promise that resolves when watching is successfully started
   *
   * @throws {@link Error}
   * Thrown when watcher is already active or path is invalid
   *
   * @example
   * ```typescript
   * await startWatching('/Users/dev/my-project')
   * ```
   *
   * @public
   */
  const startWatching = async (projectPath: string): Promise<void> => {
    if (!window.electronAPI) {
      throw new Error('ElectronAPI not available - not in Electron environment')
    }

    if (isWatching.value) {
      console.warn('[FileWatcher] Already watching, stopping current watcher')
      await stopWatching()
    }

    try {
      console.log(
        '[FileWatcher] Starting file watcher via Electron IPC:',
        projectPath
      )

      // Set up IPC listeners if not already done
      setupIPCListeners()

      // Start file watching in the main process
      const result = (await window.electronAPI.invoke(
        'startFileWatching',
        projectPath
      )) as {
        success: boolean
        message: string
        watcherId?: string
      }

      if (!result.success) {
        throw new Error(result.message)
      }

      currentWatcherId = result.watcherId || null
      watchedPath.value = projectPath
      isWatching.value = true

      console.log('[FileWatcher] File watching started:', result.message)
    } catch (error) {
      console.error('[FileWatcher] Failed to start watching:', error)
      throw new Error(`Failed to start file watching: ${error}`)
    }
  }

  /**
   * Stops the current file watcher and cleans up resources.
   *
   * @example
   * ```typescript
   * stopWatching()
   * ```
   *
   * @public
   */
  const stopWatching = async (): Promise<void> => {
    if (!currentWatcherId) {
      return
    }

    try {
      if (window.electronAPI) {
        const result = (await window.electronAPI.invoke(
          'stopFileWatching',
          currentWatcherId
        )) as {
          success: boolean
          message: string
        }
        if (!result.success) {
          console.warn(
            '[FileWatcher] Failed to stop watcher in main process:',
            result.message
          )
        } else {
          console.log('[FileWatcher] File watching stopped:', result.message)
        }
      }
    } catch (error) {
      console.error('[FileWatcher] Error stopping file watcher:', error)
    }

    // Clear all debounce timers
    debounceTimers.forEach((timer) => clearTimeout(timer))
    debounceTimers.clear()

    currentWatcherId = null
    isWatching.value = false
    watchedPath.value = null
  }

  /**
   * Registers an event listener for specific types of file changes.
   *
   * @param eventType - Type of file change events to listen for
   * @param listener - Function to call when matching events occur
   * @returns Cleanup function to remove the listener
   *
   * @example
   * ```typescript
   * // Listen for git file changes
   * const unsubscribe = onFileChange('git', (event) => {
   *   console.log('Git file changed:', event.path)
   * })
   *
   * // Later, remove the listener
   * unsubscribe()
   * ```
   *
   * @public
   */
  const onFileChange = (
    eventType: FileChangeEventType,
    listener: FileChangeListener
  ): (() => void) => {
    if (!eventListeners.has(eventType)) {
      eventListeners.set(eventType, new Set())
    }

    eventListeners.get(eventType)!.add(listener)

    // Return cleanup function
    return () => {
      const listeners = eventListeners.get(eventType)
      if (listeners) {
        listeners.delete(listener)
      }
    }
  }

  /**
   * Gets the current watching status and path information.
   *
   * @returns Object with current watching state
   *
   * @public
   */
  const getWatchingStatus = () => ({
    isWatching: isWatching.value,
    watchedPath: watchedPath.value,
    watcherId: currentWatcherId,
    listenerCounts: Object.fromEntries(
      Array.from(eventListeners.entries()).map(([type, listeners]) => [
        type,
        listeners.size,
      ])
    ),
  })

  // Cleanup on unmount
  onUnmounted(async () => {
    await stopWatching()
  })

  return {
    // State
    isWatching: readonly(isWatching),
    watchedPath: readonly(watchedPath),

    // Methods
    startWatching,
    stopWatching,
    onFileChange,
    getWatchingStatus,
  }
}
