import { ref } from 'vue'

/**
 * CRITICAL: Validates that the project path is not the IDE directory.
 * This prevents the IDE from modifying its own source code.
 *
 * @param projectPath - The project path to validate
 * @throws Error if the path is the IDE directory
 * @critical Security validation - MUST be called before ANY Git operation
 */
function validateNotIDEDirectory(projectPath: string): void {
  if (!projectPath) {
    throw new Error(
      'CRITICAL: No project path provided. Git operations require an open project.'
    )
  }

  // List of paths that indicate the IDE directory
  const idePaths = [
    '/Users/chrissmejia/Sites/dx-engine',
    'dx-engine',
    'Sites/dx-engine',
  ]

  const normalizedPath = projectPath.replace(/\\/g, '/').toLowerCase()

  // Check if the project path matches any IDE path
  for (const idePath of idePaths) {
    const normalizedIdePath = idePath.toLowerCase()
    if (
      normalizedPath === normalizedIdePath ||
      normalizedPath.endsWith('/' + normalizedIdePath) ||
      normalizedPath.includes(normalizedIdePath + '/')
    ) {
      throw new Error(
        `CRITICAL SECURITY VIOLATION: Attempted to perform Git operations on IDE directory.\n` +
          `Project path: ${projectPath}\n` +
          `This operation has been blocked to prevent the IDE from modifying its own code.\n` +
          `Please open a different project to use Git features.`
      )
    }
  }

  console.log(
    `✅ [Branch Switch Safety] Path validated: ${projectPath} is NOT the IDE directory`
  )
}

/**
 * Branch switching operation data.
 *
 * @remarks
 * Contains all necessary information for handling branch switching
 * with uncommitted changes, following GitHub Desktop's UX pattern.
 *
 * @public
 * @since 1.2.0
 */
export interface BranchSwitchData {
  /**
   * Current branch name.
   */
  currentBranch: string

  /**
   * Target branch name to switch to.
   */
  targetBranch: string

  /**
   * List of files with uncommitted changes.
   */
  changedFiles: string[]

  /**
   * Project path for Git operations.
   */
  projectPath: string
}

/**
 * Branch switching operation result.
 *
 * @public
 * @since 1.2.0
 */
export interface BranchSwitchResult {
  /**
   * Whether the operation was successful.
   */
  success: boolean

  /**
   * Current branch after operation.
   */
  currentBranch: string

  /**
   * Error message if operation failed.
   */
  message?: string

  /**
   * Whether a stash was created.
   */
  stashCreated?: boolean

  /**
   * Stash reference if created.
   */
  stashRef?: string
}

/**
 * Stash entry information.
 *
 * @public
 * @since 1.2.0
 */
export interface StashEntry {
  /**
   * Stash reference (e.g., "stash@{0}").
   */
  ref: string

  /**
   * Stash message.
   */
  message: string

  /**
   * Branch where stash was created.
   */
  branch: string

  /**
   * Creation timestamp.
   */
  timestamp: Date

  /**
   * List of stashed files.
   */
  files: string[]
}

/**
 * Branch switch options type.
 *
 * @public
 * @since 1.2.0
 */
export type BranchSwitchOption = 'stash' | 'bring'

/**
 * Composable for managing branch switching with uncommitted changes.
 *
 * @remarks
 * Provides a comprehensive interface for handling branch switches
 * with uncommitted changes, including stashing and moving changes.
 * Follows GitHub Desktop's UX patterns for better user experience.
 *
 * @example
 * ```typescript
 * const {
 *   isModalVisible,
 *   currentSwitchData,
 *   showBranchSwitchOptions,
 *   executeBranchSwitch,
 *   closeBranchSwitchModal
 * } = useBranchSwitch()
 *
 * // Show options when attempting to switch with uncommitted changes
 * if (hasUncommittedChanges) {
 *   showBranchSwitchOptions({
 *     currentBranch: 'main',
 *     targetBranch: 'feature',
 *     changedFiles: ['src/file.ts'],
 *     projectPath: '/path/to/project'
 *   })
 * }
 * ```
 *
 * @returns Object containing modal state and control functions
 *
 * @public
 * @since 1.2.0
 */
export function useBranchSwitch() {
  /**
   * Reactive state for modal visibility.
   */
  const isModalVisible = ref(false)

  /**
   * Current branch switch operation data.
   */
  const currentSwitchData = ref<BranchSwitchData | null>(null)

  /**
   * Available stashes for the current branch.
   */
  const currentBranchStashes = ref<StashEntry[]>([])

  /**
   * Loading state for operations.
   */
  const isOperationInProgress = ref(false)

  /**
   * Shows the branch switch options modal.
   *
   * @param switchData - Data for the branch switch operation
   *
   * @example
   * ```typescript
   * showBranchSwitchOptions({
   *   currentBranch: 'main',
   *   targetBranch: 'feature-branch',
   *   changedFiles: ['src/App.vue', 'src/types.ts'],
   *   projectPath: '/Users/user/project'
   * })
   * ```
   */
  function showBranchSwitchOptions(switchData: BranchSwitchData): void {
    try {
      // CRITICAL: Validate this is NOT the IDE directory before any operations
      validateNotIDEDirectory(switchData.projectPath)

      currentSwitchData.value = switchData
      isModalVisible.value = true

      // Load existing stashes for current branch
      loadBranchStashes(switchData.currentBranch, switchData.projectPath)
    } catch (error) {
      console.error('[Branch Switch] Security validation failed:', error)
      throw error
    }
  }

  /**
   * Closes the branch switch modal and resets state.
   */
  function closeBranchSwitchModal(): void {
    isModalVisible.value = false
    currentSwitchData.value = null
    currentBranchStashes.value = []
    isOperationInProgress.value = false
  }

  /**
   * Executes the branch switch operation based on user choice.
   *
   * @param option - The switching option chosen by the user
   * @returns Promise resolving to the operation result
   *
   * @example
   * ```typescript
   * // Stash changes and switch
   * const result = await executeBranchSwitch('stash')
   *
   * // Bring changes to new branch
   * const result = await executeBranchSwitch('bring')
   * ```
   */
  async function executeBranchSwitch(
    option: BranchSwitchOption
  ): Promise<BranchSwitchResult> {
    if (!currentSwitchData.value) {
      throw new Error('No switch data available')
    }

    isOperationInProgress.value = true

    try {
      const result = await performBranchSwitch(currentSwitchData.value, option)

      if (result.success) {
        closeBranchSwitchModal()
      }

      return result
    } finally {
      isOperationInProgress.value = false
    }
  }

  /**
   * Performs the actual branch switch operation via Electron API.
   *
   * @param switchData - Branch switch data
   * @param option - Switch option ('stash' or 'bring')
   * @returns Promise resolving to operation result
   *
   * @internal
   */
  async function performBranchSwitch(
    switchData: BranchSwitchData,
    option: BranchSwitchOption
  ): Promise<BranchSwitchResult> {
    try {
      if (option === 'stash') {
        return await stashAndSwitch(switchData)
      } else {
        return await bringChangesAndSwitch(switchData)
      }
    } catch (error) {
      return {
        success: false,
        currentBranch: switchData.currentBranch,
        message:
          error instanceof Error ? error.message : 'Unknown error occurred',
      }
    }
  }

  /**
   * Stashes changes and switches branch.
   *
   * @param switchData - Branch switch data
   * @returns Promise resolving to operation result
   *
   * @internal
   */
  async function stashAndSwitch(
    switchData: BranchSwitchData
  ): Promise<BranchSwitchResult> {
    // CRITICAL: Double-check validation before Git operations
    validateNotIDEDirectory(switchData.projectPath)

    const stashMessage = `Branch switch: from ${switchData.currentBranch} to ${switchData.targetBranch}`

    // Create stash
    const stashResult = await window.electronAPI.gitStash(
      switchData.projectPath,
      stashMessage
    )

    if (!stashResult.success) {
      return {
        success: false,
        currentBranch: switchData.currentBranch,
        message: `Failed to stash changes: ${stashResult.message}`,
      }
    }

    // Switch branch
    const switchResult = await window.electronAPI.gitCheckoutBranch(
      switchData.projectPath,
      switchData.targetBranch
    )

    if (!switchResult.success) {
      // If switch failed, try to restore stash
      await window.electronAPI.gitStashPop(
        switchData.projectPath,
        stashResult.stashRef!
      )

      return {
        success: false,
        currentBranch: switchData.currentBranch,
        message: `Failed to switch branch: ${switchResult.message}`,
      }
    }

    return {
      success: true,
      currentBranch: switchData.targetBranch,
      message: `Switched to ${switchData.targetBranch}. Changes stashed on ${switchData.currentBranch}.`,
      stashCreated: true,
      stashRef: stashResult.stashRef,
    }
  }

  /**
   * Attempts to bring changes to new branch.
   *
   * @param switchData - Branch switch data
   * @returns Promise resolving to operation result
   *
   * @internal
   */
  async function bringChangesAndSwitch(
    switchData: BranchSwitchData
  ): Promise<BranchSwitchResult> {
    // CRITICAL: Double-check validation before Git operations
    validateNotIDEDirectory(switchData.projectPath)

    // Since we have uncommitted changes (that's why this modal is shown),
    // we need to stash them first, then switch, then apply
    const tempStashMessage = `Temporary: bringing changes from ${switchData.currentBranch} to ${switchData.targetBranch}`

    const stashResult = await window.electronAPI.gitStash(
      switchData.projectPath,
      tempStashMessage
    )

    if (!stashResult.success) {
      return {
        success: false,
        currentBranch: switchData.currentBranch,
        message: `Failed to stash changes: ${stashResult.message}`,
      }
    }

    // Switch branch
    const switchResult = await window.electronAPI.gitCheckoutBranch(
      switchData.projectPath,
      switchData.targetBranch
    )

    if (!switchResult.success) {
      // Restore stash on original branch
      await window.electronAPI.gitStashPop(
        switchData.projectPath,
        stashResult.stashRef!
      )

      return {
        success: false,
        currentBranch: switchData.currentBranch,
        message: `Failed to switch branch: ${switchResult.message}`,
      }
    }

    // Apply stash to new branch
    const applyResult = await window.electronAPI.gitStashPop(
      switchData.projectPath,
      stashResult.stashRef!
    )

    if (!applyResult.success) {
      // Changes are safe in the stash, inform user
      return {
        success: false,
        currentBranch: switchData.targetBranch,
        message: `Switched to ${switchData.targetBranch}, but couldn't apply changes due to conflicts. Your changes are safely stored in stash@{0}. You can apply them manually with 'git stash pop'.`,
      }
    }

    return {
      success: true,
      currentBranch: switchData.targetBranch,
      message: `Switched to ${switchData.targetBranch} with changes applied.`,
    }
  }

  /**
   * Loads available stashes for a specific branch.
   *
   * @param branchName - Branch name
   * @param projectPath - Project path
   *
   * @internal
   */
  async function loadBranchStashes(
    branchName: string,
    projectPath: string
  ): Promise<void> {
    try {
      // CRITICAL: Validate before ANY Git operation
      validateNotIDEDirectory(projectPath)

      const stashes = await window.electronAPI.gitStashList(projectPath)

      // Filter stashes for the current branch
      currentBranchStashes.value = stashes.filter(
        (stash: StashEntry) => stash.branch === branchName
      )
    } catch (error) {
      console.warn('Failed to load stashes:', error)
      currentBranchStashes.value = []
    }
  }

  /**
   * Restores a stash to the working directory.
   *
   * @param stashRef - Stash reference to restore
   * @param projectPath - Project path
   * @returns Promise resolving to operation success
   *
   * @example
   * ```typescript
   * await restoreStash('stash@{0}', '/path/to/project')
   * ```
   */
  async function restoreStash(
    stashRef: string,
    projectPath: string
  ): Promise<boolean> {
    try {
      const result = await window.electronAPI.gitStashPop(projectPath, stashRef)

      if (result.success) {
        // Reload stashes after successful restoration
        const switchData = currentSwitchData.value
        if (switchData) {
          await loadBranchStashes(switchData.currentBranch, projectPath)
        }
      }

      return result.success
    } catch (error) {
      console.error('Failed to restore stash:', error)
      return false
    }
  }

  /**
   * Discards a stash permanently.
   *
   * @param stashRef - Stash reference to discard
   * @param projectPath - Project path
   * @returns Promise resolving to operation success
   *
   * @example
   * ```typescript
   * await discardStash('stash@{1}', '/path/to/project')
   * ```
   */
  async function discardStash(
    stashRef: string,
    projectPath: string
  ): Promise<boolean> {
    try {
      const result = await window.electronAPI.gitStashDrop(
        projectPath,
        stashRef
      )

      if (result.success) {
        // Reload stashes after successful discard
        const switchData = currentSwitchData.value
        if (switchData) {
          await loadBranchStashes(switchData.currentBranch, projectPath)
        }
      }

      return result.success
    } catch (error) {
      console.error('Failed to discard stash:', error)
      return false
    }
  }

  /**
   * Gets a preview of stash changes.
   *
   * @param stashRef - Stash reference
   * @param projectPath - Project path
   * @returns Promise resolving to stash diff data
   */
  async function getStashPreview(
    stashRef: string,
    projectPath: string
  ): Promise<string> {
    try {
      const result = await window.electronAPI.gitStashShow(
        projectPath,
        stashRef
      )
      return result.diff || ''
    } catch (error) {
      console.error('Failed to get stash preview:', error)
      return ''
    }
  }

  return {
    // State
    isModalVisible,
    currentSwitchData,
    currentBranchStashes,
    isOperationInProgress,

    // Actions
    showBranchSwitchOptions,
    closeBranchSwitchModal,
    executeBranchSwitch,

    // Stash management
    restoreStash,
    discardStash,
    getStashPreview,
    loadBranchStashes,
  }
}

/**
 * Type alias for the return type of useBranchSwitch composable.
 *
 * @remarks
 * Useful for TypeScript inference in components that use this composable.
 *
 * @public
 * @since 1.2.0
 */
export type BranchSwitchComposable = ReturnType<typeof useBranchSwitch>
