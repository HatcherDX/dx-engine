import { ref } from 'vue'

/**
 * Git error information structure for modal display.
 *
 * @remarks
 * Standardized interface for displaying Git branch switching errors
 * with structured context and user-friendly solutions.
 *
 * @public
 * @since 1.0.0
 */
export interface GitError {
  /**
   * Whether the Git operation was successful.
   */
  success: boolean

  /**
   * Current branch name after operation attempt.
   */
  currentBranch: string

  /**
   * Human-readable error message.
   */
  message: string

  /**
   * Categorized error type for UI styling and handling.
   */
  errorType?: 'uncommitted_changes' | 'untracked_files' | 'both' | 'other'

  /**
   * List of modified files that are preventing the branch switch.
   */
  modifiedFiles?: string[]

  /**
   * List of untracked files that are preventing the branch switch.
   */
  untrackedFiles?: string[]

  /**
   * Suggested Git commands or actions to resolve the error.
   */
  suggestions?: string[]

  /**
   * Whether forcing the branch switch is possible (dangerous operation).
   */
  canForce?: boolean

  /**
   * Raw Git error output for debugging purposes.
   */
  rawError?: string
}

/**
 * Composable for managing Git error modal state and interactions.
 *
 * @remarks
 * Provides reactive state management for displaying Git branch switching errors
 * in a user-friendly modal interface. Handles modal visibility, error data,
 * and user actions like closing and forcing operations.
 *
 * @example
 * ```typescript
 * const {
 *   isModalVisible,
 *   currentError,
 *   showError,
 *   closeModal,
 *   handleForceSwitch
 * } = useGitErrorModal()
 *
 * // Show error when branch switch fails
 * const error = await switchBranch(projectPath, branchName)
 * if (!error.success) {
 *   showError(error)
 * }
 * ```
 *
 * @returns Object containing modal state and control functions
 *
 * @public
 * @since 1.0.0
 */
export function useGitErrorModal() {
  /**
   * Reactive state for modal visibility.
   */
  const isModalVisible = ref(false)

  /**
   * Current error being displayed in the modal.
   */
  const currentError = ref<GitError | null>(null)

  /**
   * Callback function for force switch operations.
   */
  const onForceSwitch = ref<(() => void) | null>(null)

  /**
   * Auto-close timeout ID.
   */
  const autoCloseTimeoutId = ref<number | null>(null)

  /**
   * Shows the Git error modal with specified error data.
   *
   * @param error - Git error information to display
   * @param forceSwitchCallback - Optional callback for force switch action
   *
   * @example
   * ```typescript
   * showError(gitError, () => {
   *   // Handle force switch logic
   *   console.log('Force switching branch...')
   * })
   * ```
   */
  function showError(
    error: GitError,
    forceSwitchCallback?: () => void,
    options?: { autoClose?: number; preventDuplicates?: boolean }
  ): void {
    // Prevent duplicate errors if enabled
    if (
      options?.preventDuplicates &&
      currentError.value?.message === error.message
    ) {
      return
    }

    currentError.value = error
    onForceSwitch.value = forceSwitchCallback || null
    isModalVisible.value = true

    // Auto-close if specified
    if (options?.autoClose) {
      setupAutoClose(options.autoClose)
    }
  }

  /**
   * Sets up auto-close functionality with debounced execution.
   *
   * @param delayMs - Delay in milliseconds before auto-close
   */
  const setupAutoClose = (delayMs: number) => {
    if (autoCloseTimeoutId.value) {
      clearTimeout(autoCloseTimeoutId.value)
    }

    autoCloseTimeoutId.value = window.setTimeout(() => {
      closeModal()
    }, delayMs)
  }

  /**
   * Closes the error modal and resets state.
   *
   * @remarks
   * Clears current error data and hides the modal.
   * Safe to call multiple times.
   */
  function closeModal(): void {
    // Clear any pending auto-close timeout
    if (autoCloseTimeoutId.value) {
      clearTimeout(autoCloseTimeoutId.value)
      autoCloseTimeoutId.value = null
    }

    isModalVisible.value = false
    currentError.value = null
    onForceSwitch.value = null
  }

  /**
   * Handles force switch user action.
   *
   * @remarks
   * Executes the force switch callback if provided, then closes the modal.
   * This is typically used for dangerous Git operations that override
   * safety checks.
   *
   * @example
   * ```typescript
   * // In component template
   * <GitErrorModal @force-switch="handleForceSwitch" />
   * ```
   */
  function handleForceSwitch(): void {
    if (onForceSwitch.value) {
      onForceSwitch.value()
    }
    closeModal()
  }

  /**
   * Determines if the current error allows force operations.
   *
   * @returns True if force switch is available for current error
   */
  function canForceSwitch(): boolean {
    return currentError.value?.canForce === true
  }

  /**
   * Gets formatted error summary for logging or debugging.
   *
   * @returns String summary of current error state
   */
  function getErrorSummary(): string {
    if (!currentError.value) return 'No error'

    const { errorType, modifiedFiles, untrackedFiles, message } =
      currentError.value
    const modifiedCount = modifiedFiles?.length || 0
    const untrackedCount = untrackedFiles?.length || 0
    const totalFiles = modifiedCount + untrackedCount

    return `Git Error (${errorType}): ${message} - ${totalFiles} files affected (${modifiedCount} modified, ${untrackedCount} untracked)`
  }

  return {
    // Reactive state
    isModalVisible,
    currentError,

    // Actions
    showError,
    closeModal,
    handleForceSwitch,

    // Computed/Utilities
    canForceSwitch,
    getErrorSummary,
  }
}

/**
 * Type alias for the return type of useGitErrorModal composable.
 *
 * @remarks
 * Useful for TypeScript inference in components that use this composable.
 *
 * @public
 * @since 1.0.0
 */
export type GitErrorModalComposable = ReturnType<typeof useGitErrorModal>
