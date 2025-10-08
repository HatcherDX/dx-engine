/**
 * @fileoverview Smart pipeline integration for automatic actions triggering.
 *
 * @description
 * Integrates file watching with the quantum actions pipeline to provide
 * intelligent automatic triggering based on file changes. Analyzes file
 * changes to determine when the actions pipeline should run, avoiding
 * unnecessary executions while ensuring code quality is maintained.
 *
 * @example
 * ```typescript
 * const { enableSmartPipeline, disableSmartPipeline } = useSmartPipeline()
 *
 * // Enable automatic pipeline triggering
 * enableSmartPipeline()
 * ```
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import { ref, readonly, watch } from 'vue'
import { useFileWatcher, type FileChangeEvent } from './useFileWatcher'
import { useQuantumActions } from './useQuantumActions'
import { useProjectContext } from './useProjectContext'

/**
 * Configuration for smart pipeline triggering.
 */
interface SmartPipelineConfig {
  /**
   * Debounce time in milliseconds before triggering pipeline after file changes.
   * @defaultValue 2000
   */
  debounceMs?: number

  /**
   * Whether to automatically trigger on source file changes.
   * @defaultValue true
   */
  triggerOnSourceChanges?: boolean

  /**
   * Whether to automatically trigger on config file changes.
   * @defaultValue true
   */
  triggerOnConfigChanges?: boolean

  /**
   * File patterns to exclude from triggering (in addition to default exclusions).
   * @defaultValue []
   */
  excludePatterns?: string[]
}

/**
 * Default configuration for smart pipeline.
 */
const DEFAULT_CONFIG: Required<SmartPipelineConfig> = {
  debounceMs: 2000,
  triggerOnSourceChanges: true,
  triggerOnConfigChanges: true,
  excludePatterns: [],
}

/**
 * Composable for intelligent pipeline triggering based on file changes.
 *
 * @remarks
 * Provides a smart integration layer between the file watcher and actions pipeline.
 * Includes debouncing to avoid triggering too frequently, intelligent filtering
 * to only trigger on relevant changes, and configuration options for different
 * development workflows.
 *
 * @param config - Configuration options for smart pipeline behavior
 * @returns Object containing smart pipeline controls and state
 *
 * @public
 */
export function useSmartPipeline(config: SmartPipelineConfig = {}) {
  // Merge config with defaults
  const finalConfig = { ...DEFAULT_CONFIG, ...config }

  // State
  const isEnabled = ref(false)
  const lastTriggeredTime = ref<number>(0)
  const pendingChanges = ref<string[]>([])

  // Dependencies
  const { startWatching, onFileChange, isWatching } = useFileWatcher()
  const { executeActions, isRunning } = useQuantumActions()
  const { openedProject, isProjectLoaded } = useProjectContext()

  // Debounce timer
  let debounceTimer: NodeJS.Timeout | null = null

  /**
   * Determines if a file change should trigger the pipeline.
   *
   * @param event - The file change event to analyze
   * @returns True if the change should trigger the pipeline
   *
   * @internal
   */
  const shouldTriggerPipeline = (event: FileChangeEvent): boolean => {
    const { type, path, changeType } = event

    // Ignore deletions for now (focus on additions and modifications)
    if (changeType === 'unlink' || changeType === 'unlinkDir') {
      return false
    }

    // Check type-based triggers
    if (type === 'source' && !finalConfig.triggerOnSourceChanges) {
      return false
    }

    if (type === 'config' && !finalConfig.triggerOnConfigChanges) {
      return false
    }

    // Only trigger on source and config changes
    if (type !== 'source' && type !== 'config') {
      return false
    }

    // Check exclusion patterns
    const pathLower = path.toLowerCase()
    const shouldExclude = finalConfig.excludePatterns.some((pattern) => {
      const regex = new RegExp(pattern.replace(/\*/g, '.*'), 'i')
      return regex.test(pathLower)
    })

    if (shouldExclude) {
      return false
    }

    // Default exclusions for files that don't need pipeline runs
    const defaultExclusions = [
      /\.md$/i, // Markdown files
      /\.json$/i, // JSON files (some config, but often data)
      /\.log$/i, // Log files
      /\.tmp$/i, // Temporary files
      /\/docs?\//i, // Documentation directories
      /\/readme/i, // README files
      /\/changelog/i, // Changelog files
      /\/coverage\//i, // Coverage reports
      /\/dist\//i, // Build output
      /\/build\//i, // Build output
      /\.spec\./i, // Don't trigger on test file changes for now
      /\.test\./i, // Don't trigger on test file changes for now
    ]

    if (defaultExclusions.some((regex) => regex.test(pathLower))) {
      return false
    }

    return true
  }

  /**
   * Executes the pipeline with smart triggering logic.
   *
   * @internal
   */
  const triggerPipelineDebounced = (): void => {
    // Clear existing timer
    if (debounceTimer) {
      clearTimeout(debounceTimer)
    }

    // Set new debounced execution
    debounceTimer = setTimeout(async () => {
      // Don't trigger if already running
      if (isRunning.value) {
        console.log(
          '[SmartPipeline] Pipeline already running, skipping trigger'
        )
        return
      }

      // Don't trigger too frequently
      const now = Date.now()
      const timeSinceLastTrigger = now - lastTriggeredTime.value
      if (timeSinceLastTrigger < finalConfig.debounceMs) {
        console.log('[SmartPipeline] Too soon since last trigger, skipping')
        return
      }

      console.log(
        '[SmartPipeline] Triggering actions pipeline due to file changes:',
        pendingChanges.value
      )

      try {
        await executeActions()
        lastTriggeredTime.value = now
        pendingChanges.value = []
      } catch (error) {
        console.error(
          '[SmartPipeline] Failed to execute actions pipeline:',
          error
        )
      }
    }, finalConfig.debounceMs)
  }

  /**
   * Handles file change events and determines if pipeline should be triggered.
   *
   * @param event - The file change event
   *
   * @internal
   */
  const handleFileChange = (event: FileChangeEvent): void => {
    if (!isEnabled.value) return

    if (shouldTriggerPipeline(event)) {
      // Track pending changes
      if (!pendingChanges.value.includes(event.path)) {
        pendingChanges.value.push(event.path)
      }

      console.log(
        '[SmartPipeline] File change detected:',
        event.path,
        'Type:',
        event.type
      )

      // Trigger debounced execution
      triggerPipelineDebounced()
    }
  }

  /**
   * Enables smart pipeline triggering.
   *
   * @returns Promise that resolves when smart pipeline is successfully enabled
   *
   * @example
   * ```typescript
   * await enableSmartPipeline()
   * ```
   *
   * @public
   */
  const enableSmartPipeline = async (): Promise<void> => {
    if (isEnabled.value) {
      console.warn('[SmartPipeline] Already enabled')
      return
    }

    // Ensure we have a project loaded
    if (!isProjectLoaded.value || !openedProject.value) {
      throw new Error('No project loaded - cannot enable smart pipeline')
    }

    try {
      // Start file watcher if not already watching
      if (!isWatching.value) {
        await startWatching(openedProject.value.rootPath)
      }

      // Set up event listeners
      onFileChange('source', handleFileChange)
      onFileChange('config', handleFileChange)

      isEnabled.value = true
      console.log(
        '[SmartPipeline] Smart pipeline enabled for:',
        openedProject.value.rootPath
      )
    } catch (error) {
      console.error('[SmartPipeline] Failed to enable smart pipeline:', error)
      throw error
    }
  }

  /**
   * Disables smart pipeline triggering.
   *
   * @example
   * ```typescript
   * disableSmartPipeline()
   * ```
   *
   * @public
   */
  const disableSmartPipeline = (): void => {
    if (!isEnabled.value) {
      console.warn('[SmartPipeline] Already disabled')
      return
    }

    // Clear debounce timer
    if (debounceTimer) {
      clearTimeout(debounceTimer)
      debounceTimer = null
    }

    // Clear pending changes
    pendingChanges.value = []

    isEnabled.value = false
    console.log('[SmartPipeline] Smart pipeline disabled')
  }

  /**
   * Manually triggers the pipeline (bypassing smart logic).
   *
   * @returns Promise that resolves when pipeline execution completes
   *
   * @example
   * ```typescript
   * await triggerPipelineManually()
   * ```
   *
   * @public
   */
  const triggerPipelineManually = async (): Promise<void> => {
    if (isRunning.value) {
      console.warn('[SmartPipeline] Pipeline already running')
      return
    }

    console.log('[SmartPipeline] Manual pipeline trigger')

    try {
      await executeActions()
      lastTriggeredTime.value = Date.now()
    } catch (error) {
      console.error('[SmartPipeline] Manual pipeline execution failed:', error)
      throw error
    }
  }

  /**
   * Gets the current status of smart pipeline.
   *
   * @returns Object with current smart pipeline state
   *
   * @public
   */
  const getSmartPipelineStatus = () => ({
    isEnabled: isEnabled.value,
    isWatching: isWatching.value,
    pendingChanges: [...pendingChanges.value],
    lastTriggeredTime: lastTriggeredTime.value,
    config: finalConfig,
  })

  // Auto-enable when project loads (if user wants this behavior)
  watch(
    [isProjectLoaded, openedProject],
    async ([loaded, project]) => {
      if (loaded && project && !isEnabled.value) {
        // Auto-enable can be controlled via config or user preference
        // For now, we'll leave it manual to avoid surprising users
        console.log('[SmartPipeline] Project loaded, smart pipeline available')
      }
    },
    { immediate: true }
  )

  return {
    // State
    isEnabled: readonly(isEnabled),
    isWatching,
    pendingChanges: readonly(pendingChanges),

    // Methods
    enableSmartPipeline,
    disableSmartPipeline,
    triggerPipelineManually,
    getSmartPipelineStatus,
  }
}
