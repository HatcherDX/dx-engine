/**
 * @fileoverview Branch management composable for Git operations.
 *
 * @description
 * Provides comprehensive branch management functionality including loading,
 * filtering, searching, and switching Git branches. Follows Vue 3 Composition
 * API best practices with reactive state management and TypeScript support.
 *
 * @example
 * ```typescript
 * const branchManager = useBranchManager()
 * await branchManager.loadBranches('/path/to/project')
 * branchManager.filterBranches('feature')
 * ```
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import { ref, computed, type Ref, type ComputedRef } from 'vue'
import { useGitIntegration } from './useGitIntegration'
import { useBranchSwitch } from './useBranchSwitch'
import { useGitErrorModal } from './useGitErrorModal'
import type { GitStatusFile } from '@hatcherdx/git-genius'

/**
 * Branch information structure.
 *
 * @remarks
 * Contains metadata about a Git branch including name, last commit,
 * and update timestamp for display in the UI.
 *
 * @public
 * @since 1.0.0
 */
export interface BranchInfo {
  /**
   * Branch name as returned from Git.
   */
  name: string

  /**
   * Description of the last commit or branch status.
   */
  lastCommit: string

  /**
   * Timestamp of the last update to this branch.
   */
  lastUpdate: Date
}

/**
 * Branch manager composable return type.
 *
 * @public
 * @since 1.0.0
 */
export interface BranchManager {
  // State
  branches: Ref<BranchInfo[]>
  selectedBranch: Ref<BranchInfo | null>
  isLoading: Ref<boolean>
  isSwitching: Ref<boolean>
  searchQuery: Ref<string>
  debouncedSearchQuery: Ref<string>

  // Computed
  filteredBranches: ComputedRef<BranchInfo[]>

  // Methods
  loadBranches: (projectPath: string | undefined) => Promise<void>
  selectBranch: (branch: BranchInfo, projectPath: string) => Promise<void>
  filterBranches: (query: string) => void
  clearSearch: () => void
  formatDate: (date: Date) => string
}

/**
 * Branch management composable for Git operations.
 *
 * @remarks
 * Provides reactive state and methods for managing Git branches,
 * including loading, filtering, searching, and switching operations.
 * Integrates with Git error handling and branch switch modals.
 *
 * @returns Branch manager interface with state and methods
 *
 * @example
 * ```typescript
 * const {
 *   branches,
 *   filteredBranches,
 *   loadBranches,
 *   selectBranch
 * } = useBranchManager()
 *
 * await loadBranches('/path/to/project')
 * ```
 *
 * @public
 * @since 1.0.0
 */
export function useBranchManager(): BranchManager {
  // Get Git integration composables
  const { getGitBranches, switchBranch } = useGitIntegration()
  const branchSwitch = useBranchSwitch()
  const gitErrorModal = useGitErrorModal()

  // Reactive state
  const branches = ref<BranchInfo[]>([])
  const selectedBranch = ref<BranchInfo | null>(null)
  const isLoading = ref(false)
  const isSwitching = ref(false)
  const searchQuery = ref('')
  const debouncedSearchQuery = ref('')

  // Debounce timer reference
  let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null

  /**
   * Computed filtered branches based on search query.
   *
   * @remarks
   * Filters branches by name and commit message using the immediate
   * search query for instant feedback. Results are sorted by relevance:
   * exact matches first, then prefix matches, then contains matches.
   *
   * @returns Filtered and sorted array of branch information
   * @internal
   */
  const filteredBranches = computed(() => {
    // Use immediate searchQuery for faster feedback, not debounced
    if (!searchQuery.value) {
      return branches.value
    }

    const query = searchQuery.value.toLowerCase()

    // Filter branches that match the query
    const matches = branches.value.filter(
      (branch) =>
        branch.name.toLowerCase().includes(query) ||
        branch.lastCommit.toLowerCase().includes(query)
    )

    // Sort by relevance: exact match > starts with > contains
    return matches.sort((a, b) => {
      const aName = a.name.toLowerCase()
      const bName = b.name.toLowerCase()

      // Exact matches first
      const aExact = aName === query
      const bExact = bName === query
      if (aExact && !bExact) return -1
      if (!aExact && bExact) return 1

      // Then prefix matches
      const aPrefix = aName.startsWith(query)
      const bPrefix = bName.startsWith(query)
      if (aPrefix && !bPrefix) return -1
      if (!aPrefix && bPrefix) return 1

      // Finally alphabetical order
      return aName.localeCompare(bName)
    })
  })

  /**
   * Loads Git branches from the specified project path.
   *
   * @param projectPath - Path to the Git repository
   * @returns Promise that resolves when branches are loaded
   *
   * @example
   * ```typescript
   * await loadBranches('/home/user/project')
   * console.log(branches.value) // Array of BranchInfo
   * ```
   *
   * @public
   * @since 1.0.0
   */
  async function loadBranches(projectPath: string | undefined): Promise<void> {
    if (!projectPath) {
      console.log('[BranchManager] No project selected, using empty branches')
      branches.value = []
      isLoading.value = false
      return
    }

    isLoading.value = true

    try {
      console.log('[BranchManager] Loading Git branches from:', projectPath)
      const gitBranches = await getGitBranches(projectPath)

      const branchInfoList = gitBranches.all.map((branchName: string) => {
        // Generate random dates for demo purposes
        const randomDays = Math.floor(Math.random() * 30)
        const dateOffset = randomDays * 24 * 60 * 60 * 1000

        const branchInfo: BranchInfo = {
          name: branchName,
          lastCommit:
            branchName === gitBranches.current
              ? 'Current working branch'
              : 'Remote or local branch',
          lastUpdate: new Date(Date.now() - dateOffset),
        }
        return branchInfo
      })

      // Sort branches with current branch first
      branchInfoList.sort((a: BranchInfo, b: BranchInfo) => {
        if (a.name === gitBranches.current) return -1
        if (b.name === gitBranches.current) return 1
        return a.name.localeCompare(b.name)
      })

      branches.value = branchInfoList

      console.log('[BranchManager] Loaded branches:', {
        total: branchInfoList.length,
        current: gitBranches.current,
        branches: branchInfoList.map((b: BranchInfo) => b.name),
      })
    } catch (error) {
      console.error('[BranchManager] Failed to load Git branches:', error)
      branches.value = []
      console.log('[BranchManager] Using empty branches as fallback')
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Selects and switches to a branch.
   *
   * @param branch - Branch to switch to
   * @param projectPath - Path to the Git repository
   * @returns Promise that resolves when switch is complete
   *
   * @throws Error if project path is invalid or switch fails
   *
   * @example
   * ```typescript
   * const branch = branches.value[0]
   * await selectBranch(branch, '/path/to/project')
   * ```
   *
   * @public
   * @since 1.0.0
   */
  async function selectBranch(
    branch: BranchInfo,
    projectPath: string
  ): Promise<void> {
    selectedBranch.value = branch
    isSwitching.value = true

    console.log('[BranchManager] Selected branch:', branch.name)

    try {
      if (!projectPath) {
        throw new Error('No project path provided')
      }

      // Get current branch
      const branchesResult =
        await window.electronAPI.getGitBranches(projectPath)
      const currentBranch = branchesResult.current || 'main'

      // Check if already on this branch
      if (branch.name === currentBranch) {
        console.log('[BranchManager] Already on branch:', branch.name)
        return
      }

      // Check for uncommitted changes
      const statusResult = await window.electronAPI.getGitStatus(projectPath)

      if (!statusResult.isRepository) {
        throw new Error('Not a Git repository')
      }

      const hasUncommittedChanges = statusResult.totalFiles > 0

      if (hasUncommittedChanges) {
        console.log('[BranchManager] Found uncommitted changes, showing modal')
        const changedFiles = statusResult.files.map(
          (file: GitStatusFile) => file.path
        )

        branchSwitch.showBranchSwitchOptions({
          currentBranch,
          targetBranch: branch.name,
          changedFiles,
          projectPath,
        })
        return
      }

      // Direct switch if no uncommitted changes
      console.log('[BranchManager] Switching to branch:', branch.name)
      const switchResult = await switchBranch(projectPath, branch.name)

      if (!switchResult.success) {
        console.error('[BranchManager] Switch failed:', switchResult)
        gitErrorModal.showError({
          success: false,
          currentBranch,
          message: switchResult.message || 'Failed to switch branch',
          errorType: 'other',
        })
        selectedBranch.value = null
      } else {
        console.log('[BranchManager] Successfully switched to:', branch.name)
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error'
      console.error('[BranchManager] Error switching branch:', errorMessage)

      gitErrorModal.showError({
        success: false,
        currentBranch: '',
        message: errorMessage,
        errorType: 'other',
      })

      selectedBranch.value = null
    } finally {
      isSwitching.value = false
    }
  }

  /**
   * Filters branches with debouncing.
   *
   * @param query - Search query string
   *
   * @example
   * ```typescript
   * filterBranches('feature')
   * // After 150ms debounce, filteredBranches will update
   * ```
   *
   * @public
   * @since 1.0.0
   */
  function filterBranches(query: string): void {
    searchQuery.value = query

    // Clear existing timer
    if (searchDebounceTimer) {
      clearTimeout(searchDebounceTimer)
    }

    // Set new debounce timer
    searchDebounceTimer = setTimeout(() => {
      debouncedSearchQuery.value = query
      console.log('[BranchManager] Search query updated:', query)
    }, 150)
  }

  /**
   * Clears the search query and resets filtering.
   *
   * @example
   * ```typescript
   * clearSearch()
   * // branches.value === filteredBranches.value
   * ```
   *
   * @public
   * @since 1.0.0
   */
  function clearSearch(): void {
    searchQuery.value = ''
    debouncedSearchQuery.value = ''
    selectedBranch.value = null

    if (searchDebounceTimer) {
      clearTimeout(searchDebounceTimer)
      searchDebounceTimer = null
    }
  }

  /**
   * Formats a date for display.
   *
   * @param date - Date to format
   * @returns Human-readable date string
   *
   * @example
   * ```typescript
   * formatDate(new Date()) // "Just now"
   * formatDate(new Date(Date.now() - 86400000)) // "Yesterday"
   * ```
   *
   * @public
   * @since 1.0.0
   */
  function formatDate(date: Date): string {
    const now = new Date()
    const diffInHours = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    )

    if (diffInHours < 1) return 'Just now'
    if (diffInHours < 24) return `${diffInHours}h ago`
    if (diffInHours < 48) return 'Yesterday'

    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays < 7) return `${diffInDays}d ago`

    return date.toLocaleDateString()
  }

  return {
    // State
    branches,
    selectedBranch,
    isLoading,
    isSwitching,
    searchQuery,
    debouncedSearchQuery,

    // Computed
    filteredBranches,

    // Methods
    loadBranches,
    selectBranch,
    filterBranches,
    clearSearch,
    formatDate,
  }
}
