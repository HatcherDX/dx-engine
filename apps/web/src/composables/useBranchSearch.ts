/**
 * @fileoverview Composable for branch search functionality with terminal integration.
 *
 * @description
 * Provides reusable branch search functionality with terminal integration,
 * keyboard handling, and message formatting. Can be used across different
 * components that need branch search capabilities.
 *
 * @example
 * ```typescript
 * const branchSearch = useBranchSearch({
 *   searchTitle: 'Search for base branch',
 *   cancelText: 'Cancel base branch search'
 * })
 * ```
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import {
  ref,
  onMounted,
  onUnmounted,
  type Ref,
  type ComputedRef,
  unref,
} from 'vue'
import { useTerminalEasterEgg } from './useTerminalEasterEgg'
import type { BranchInfo } from './useBranchManager'

/**
 * Options for configuring the branch search composable.
 *
 * @public
 * @since 1.0.0
 */
export interface BranchSearchOptions {
  /** Title text for search mode */
  searchTitle?: string
  /** Cancel text for escape action (can be reactive) */
  cancelText?: string | Ref<string> | ComputedRef<string>
  /** Create new option text */
  createNewText?: string
  /** Search option text */
  searchOptionText?: string
  /** Back option text */
  backText?: string
  /** Whether to show branch shortcuts in normal mode */
  showBranchShortcuts?: boolean
  /** Maximum number of branches to show with shortcuts */
  maxBranchShortcuts?: number
  /** Current branch to filter out from options */
  currentBranch?: Ref<string>
}

/**
 * Branch search composable return type.
 *
 * @public
 * @since 1.0.0
 */
export interface BranchSearch {
  // State
  isSearchMode: Ref<boolean>

  // Methods
  updateMessages: (
    branches: BranchInfo[],
    isLoading: boolean,
    searchQuery: string,
    filteredBranches: BranchInfo[]
  ) => void
  enterSearchMode: () => void
  exitSearchMode: () => void
  handleKeyPress: (
    event: KeyboardEvent,
    searchQuery: Ref<string>,
    branches: BranchInfo[],
    onSearchUpdate: (query: string) => void,
    onBranchSelect: (index: number) => void
  ) => void
  selectBranchByIndex: (
    index: number,
    branches: BranchInfo[],
    filteredBranches: BranchInfo[],
    onSelect: (branch: BranchInfo) => void
  ) => void
  waitForContext: () => Promise<void>
  cleanup: () => void
}

/**
 * Creates a branch search composable with terminal integration.
 *
 * @param options - Configuration options for the branch search
 * @returns Branch search interface with state and methods
 *
 * @remarks
 * This composable provides reusable branch search functionality that can be
 * configured for different use cases (task selector, base branch selection, etc.).
 * It handles terminal integration, keyboard events, and message formatting.
 *
 * @example
 * ```typescript
 * // For task selector
 * const branchSearch = useBranchSearch({
 *   searchTitle: 'Search for branches:',
 *   cancelText: 'Cancel search',
 *   createNewText: '[n] Create new task',
 *   searchOptionText: '[b] Search branch'
 * })
 *
 * // For base branch selection
 * const branchSearch = useBranchSearch({
 *   searchTitle: 'Search for base branch:',
 *   cancelText: 'Cancel base branch search',
 *   showBranchShortcuts: false
 * })
 * ```
 *
 * @public
 * @since 1.0.0
 */
export function useBranchSearch(
  options: BranchSearchOptions = {}
): BranchSearch {
  // Merge with defaults
  const config = {
    searchTitle: 'Search for branches:',
    cancelText: 'Cancel search',
    createNewText: '[n] Create new task',
    searchOptionText: '[b] Search branch',
    backText: '[esc] Back',
    showBranchShortcuts: true,
    maxBranchShortcuts: 5,
    ...options,
  }

  // Get terminal easter egg integration
  const { initializeTerminal } = useTerminalEasterEgg()

  // Search mode state
  const isSearchMode = ref(false)

  // Store the animation timer ID
  let loaderAnimationTimer: ReturnType<typeof setTimeout> | null = null

  // Track when search mode was entered to prevent key carryover
  let searchModeEnteredTime = 0

  /**
   * Updates terminal messages based on current state.
   *
   * @param branches - All available branches
   * @param isLoading - Whether branches are currently loading
   * @param searchQuery - Current search query
   * @param filteredBranches - Filtered branches based on search
   *
   * @public
   * @since 1.0.0
   */
  function updateMessages(
    branches: BranchInfo[],
    isLoading: boolean,
    _searchQuery: string,
    filteredBranches: BranchInfo[]
  ): void {
    // Check if terminal context is available
    if (!window.currentContext) {
      console.log('[BranchSearch] No terminal context available')
      return
    }

    console.log(
      '[BranchSearch] Updating messages with',
      branches.length,
      'branches, loading:',
      isLoading,
      'filtered:',
      filteredBranches.length
    )

    const messages: string[] = []

    if (isSearchMode.value) {
      // Search mode messages
      messages.push(`[esc] ${unref(config.cancelText)}`)
      messages.push('')
      messages.push(config.searchTitle)

      // Always use the terminal's current input as the source of truth
      const terminalInput = window.currentContext?.state?.currentInput || ''

      if (terminalInput) {
        // Filter branches based on current terminal input
        const query = terminalInput.toLowerCase()

        // Separate branches into name matches and description-only matches
        const nameMatches: BranchInfo[] = []
        const descriptionOnlyMatches: BranchInfo[] = []

        branches.forEach((branch) => {
          // Skip the current branch if it's configured
          if (
            config.currentBranch &&
            branch.name === unref(config.currentBranch)
          ) {
            return
          }

          const nameMatch = branch.name.toLowerCase().includes(query)
          const commitMatch = branch.lastCommit.toLowerCase().includes(query)

          if (nameMatch) {
            nameMatches.push(branch)
          } else if (commitMatch) {
            descriptionOnlyMatches.push(branch)
          }
        })

        // Combine results: name matches first, then description matches
        const filtered = [...nameMatches, ...descriptionOnlyMatches]

        if (filtered.length > 0) {
          // Show up to 10 filtered results with numbers (1-9, 0 for 10th)
          filtered.slice(0, 10).forEach((branch, index) => {
            const key = index === 9 ? '0' : `${index + 1}`

            // Check if match is in name or description
            const nameMatch = branch.name.toLowerCase().includes(query)
            const commitMatch = branch.lastCommit.toLowerCase().includes(query)

            if (!nameMatch && commitMatch) {
              // Match is in commit message - show context with bold highlighting
              const commitLower = branch.lastCommit.toLowerCase()
              const matchIndex = commitLower.indexOf(query)

              // Extract context around the match
              const contextStart = Math.max(0, matchIndex - 10)
              const contextEnd = Math.min(
                branch.lastCommit.length,
                matchIndex + query.length + 20
              )

              // Get the context parts
              const beforeMatch = branch.lastCommit.substring(
                contextStart,
                matchIndex
              )
              const matchText = branch.lastCommit.substring(
                matchIndex,
                matchIndex + query.length
              )
              const afterMatch = branch.lastCommit.substring(
                matchIndex + query.length,
                contextEnd
              )

              // Build context with bold match
              let context = ''
              if (contextStart > 0) context += '...'
              context += beforeMatch
              context += `**${matchText}**`
              context += afterMatch
              if (contextEnd < branch.lastCommit.length) context += '...'

              messages.push(`[${key}] ${branch.name} | ${context}`)
            } else {
              // Match is in branch name - highlight the match
              if (nameMatch) {
                const nameLower = branch.name.toLowerCase()
                const matchIndex = nameLower.indexOf(query)

                // Split the name into parts around the match
                const beforeMatch = branch.name.substring(0, matchIndex)
                const matchText = branch.name.substring(
                  matchIndex,
                  matchIndex + query.length
                )
                const afterMatch = branch.name.substring(
                  matchIndex + query.length
                )

                // Build name with bold match
                const highlightedName = `${beforeMatch}**${matchText}**${afterMatch}`
                messages.push(`[${key}] ${highlightedName}`)
              } else {
                messages.push(`[${key}] ${branch.name}`)
              }
            }
          })
          if (filtered.length > 10) {
            messages.push(`    ... and ${filtered.length - 10} more branches`)
          }
        } else {
          messages.push('No matches found')
        }
      } else {
        // When no query yet, show help text
        messages.push('Start typing to search...')
      }
    } else {
      // Normal mode messages
      if (config.createNewText) {
        messages.push(config.createNewText)
      }
      if (config.searchOptionText) {
        messages.push(config.searchOptionText)
      }
      if (config.showBranchShortcuts === false) {
        // For branch creation step, show special commands
        messages.push('[b] Change base branch')
      }
      messages.push(config.backText)
      messages.push('')

      // Only show branches list if showBranchShortcuts is true (for task selector)
      // For branch creation step (showBranchShortcuts === false), don't show branches in normal mode
      if (config.showBranchShortcuts) {
        if (branches.length > 0 || isLoading) {
          if (isLoading) {
            // Show static loader message
            messages.push(`Branches: ⠋ Loading...`)
          } else if (branches.length > 0) {
            // Show branches header with count
            messages.push(`Branches (${branches.length} available):`)

            // Show branches with shortcuts
            const maxShortcuts = Math.min(
              config.maxBranchShortcuts,
              branches.length
            )
            if (branches.length <= maxShortcuts) {
              branches.forEach((branch, index) => {
                messages.push(`[${index + 1}] ${branch.name}`)
              })
            } else {
              branches.slice(0, maxShortcuts).forEach((branch, index) => {
                messages.push(`[${index + 1}] ${branch.name}`)
              })
              messages.push(
                `    ... and ${branches.length - maxShortcuts} more branches`
              )
            }
          }
        } else {
          messages.push('Branches: None available')
        }
      } else {
        // For branch creation step, just show the confirm message
        messages.push('Press [enter] to confirm branch creation')
      }
    }

    // Update terminal context messages, preserving input in search mode
    window.currentContext.updateMessages(messages, isSearchMode.value)

    // Handle loader animation separately to prevent flickering
    if (isLoading && !isSearchMode.value) {
      // Clear any existing timer
      if (loaderAnimationTimer) {
        clearTimeout(loaderAnimationTimer)
      }

      // Only update the loader character, not the entire message list
      const animateLoader = () => {
        if (!isLoading || !window.currentContext) return

        const loaderChars = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
        const loaderIndex = Math.floor(Date.now() / 100) % loaderChars.length
        const loaderLine = `Branches: ${loaderChars[loaderIndex]} Loading...`

        // Find the line with the loader (after the empty line)
        const loaderLineIndex = config.createNewText ? 4 : 3
        if (
          window.currentContext.state &&
          window.currentContext.state.lines &&
          window.currentContext.state.lines[loaderLineIndex]
        ) {
          window.currentContext.state.lines[loaderLineIndex].text = loaderLine
        }

        // Schedule next animation frame
        loaderAnimationTimer = setTimeout(animateLoader, 100)
      }

      // Start animation after a short delay
      loaderAnimationTimer = setTimeout(animateLoader, 50)
    } else {
      // Clear animation timer when not loading
      if (loaderAnimationTimer) {
        clearTimeout(loaderAnimationTimer)
        loaderAnimationTimer = null
      }
    }
  }

  /**
   * Enters search mode for branch filtering.
   *
   * @public
   * @since 1.0.0
   */
  function enterSearchMode(): void {
    console.log('[BranchSearch] Entering search mode')
    isSearchMode.value = true
    searchModeEnteredTime = Date.now()

    // Set global flag to prevent terminal from processing input
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Global window extension for terminal search mode coordination
    ;(window as any).isTerminalSearchMode = true
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Global window extension for search mode timestamp tracking
    ;(window as any).searchModeEnteredTime = searchModeEnteredTime

    // Clear the terminal input and show cursor when entering search mode
    if (window.currentContext) {
      window.currentContext.updateInput('')
      // Enable waiting for input to show the cursor
      if (window.currentContext.state) {
        window.currentContext.state.isWaitingForInput = true
      }
    }
  }

  /**
   * Exits search mode.
   *
   * @public
   * @since 1.0.0
   */
  function exitSearchMode(): void {
    console.log('[BranchSearch] Exiting search mode')
    isSearchMode.value = false

    // Clear global flag
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Global window extension cleanup for terminal search mode
    ;(window as any).isTerminalSearchMode = false

    // Clear the terminal input and hide cursor when exiting search mode
    if (window.currentContext) {
      window.currentContext.updateInput('')
      // Disable waiting for input to hide the cursor
      if (window.currentContext.state) {
        window.currentContext.state.isWaitingForInput = false
      }
    }
  }

  /**
   * Handles keyboard input for terminal integration.
   *
   * @param event - Keyboard event
   * @param searchQuery - Current search query ref
   * @param branches - All available branches
   * @param onSearchUpdate - Callback for search updates
   * @param onBranchSelect - Callback for branch selection
   *
   * @public
   * @since 1.0.0
   */
  function handleKeyPress(
    event: KeyboardEvent,
    searchQuery: Ref<string>,
    branches: BranchInfo[],
    onSearchUpdate: (query: string) => void,
    onBranchSelect: (index: number) => void
  ): void {
    // Allow system shortcuts to pass through
    if (event.metaKey || event.ctrlKey) {
      return
    }

    if (isSearchMode.value) {
      // Only prevent default for keys we handle
      const handledKeys = [
        'Escape',
        'Enter',
        'Backspace',
        'Delete',
        'ArrowLeft',
        'ArrowRight',
        '0',
        '1',
        '2',
        '3',
        '4',
        '5',
        '6',
        '7',
        '8',
        '9',
      ]

      if (event.key.length === 1 || handledKeys.includes(event.key)) {
        event.preventDefault()
        event.stopPropagation()
      }

      console.log('[BranchSearch] Processing key in search mode:', event.key)

      // Handle search input
      if (event.key === 'Escape') {
        searchQuery.value = ''
        exitSearchMode()
        onSearchUpdate('')
      } else if (event.key === 'Enter') {
        onBranchSelect(0) // Select first result
      } else if (event.key >= '1' && event.key <= '9') {
        const index = parseInt(event.key) - 1
        onBranchSelect(index)
      } else if (event.key === '0') {
        onBranchSelect(9) // 0 selects the 10th result
      } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey) {
        // Character input - let terminal IPC handle it
        console.log('[BranchSearch] Character key:', event.key)

        // Sync with terminal after it processes
        requestAnimationFrame(() => {
          const terminalInput = window.currentContext?.state?.currentInput || ''
          if (searchQuery.value !== terminalInput) {
            searchQuery.value = terminalInput
            console.log(
              '[BranchSearch] Updated search query:',
              searchQuery.value
            )
            onSearchUpdate(searchQuery.value)

            // Re-generate search mode messages
            if (window.currentContext) {
              const query = searchQuery.value.toLowerCase()
              const filtered = branches.filter(
                (b) =>
                  b.name.toLowerCase().includes(query) ||
                  b.lastCommit.toLowerCase().includes(query)
              )

              updateMessages(branches, false, searchQuery.value, filtered)
            }
          }
        })
      } else if (
        event.key === 'Backspace' ||
        event.key === 'Delete' ||
        event.key === 'ArrowLeft' ||
        event.key === 'ArrowRight'
      ) {
        // Edit/navigation keys - let terminal IPC handle them
        console.log('[BranchSearch] Edit/navigation key:', event.key)

        // For arrow keys, no need to update search
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
          return
        }

        // For Backspace/Delete, sync after terminal processes
        requestAnimationFrame(() => {
          const terminalInput = window.currentContext?.state?.currentInput || ''
          if (searchQuery.value !== terminalInput) {
            searchQuery.value = terminalInput
            console.log('[BranchSearch] Updated after edit:', searchQuery.value)
            onSearchUpdate(searchQuery.value)

            // Update messages
            if (window.currentContext) {
              const query = searchQuery.value.toLowerCase()
              const filtered = branches.filter(
                (b) =>
                  b.name.toLowerCase().includes(query) ||
                  b.lastCommit.toLowerCase().includes(query)
              )

              updateMessages(branches, false, searchQuery.value, filtered)
            }
          }
        })
      }
    }
    // In normal mode, let terminal handle all keys
  }

  /**
   * Selects a branch by index from the appropriate list.
   *
   * @param index - Index of branch to select
   * @param branches - All branches
   * @param filteredBranches - Filtered branches (used in search mode)
   * @param onSelect - Callback to handle selection
   *
   * @public
   * @since 1.0.0
   */
  function selectBranchByIndex(
    index: number,
    branches: BranchInfo[],
    filteredBranches: BranchInfo[],
    onSelect: (branch: BranchInfo) => void
  ): void {
    const branchList = isSearchMode.value ? filteredBranches : branches

    if (branchList[index]) {
      const branch = branchList[index]
      console.log(`[BranchSearch] Selected branch: ${branch.name}`)
      onSelect(branch)
    }
  }

  /**
   * Waits for terminal context to be available.
   *
   * @param attempts - Number of attempts (internal use)
   * @returns Promise that resolves when context is ready
   *
   * @public
   * @since 1.0.0
   */
  function waitForContext(attempts = 0): Promise<void> {
    return new Promise((resolve) => {
      if (window.currentContext) {
        console.log('[BranchSearch] Terminal context ready')
        resolve()
      } else if (attempts < 10) {
        console.log('[BranchSearch] Waiting for context...', attempts)
        setTimeout(() => {
          waitForContext(attempts + 1).then(resolve)
        }, 100)
      } else {
        console.warn('[BranchSearch] Context not available after 10 attempts')
        resolve()
      }
    })
  }

  /**
   * Cleans up terminal state and event listeners.
   *
   * @public
   * @since 1.0.0
   */
  function cleanup(): void {
    // Clear global flag
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Global window extension cleanup for terminal search mode
    ;(window as any).isTerminalSearchMode = false
    isSearchMode.value = false

    // Clear any pending loader animation
    if (loaderAnimationTimer) {
      clearTimeout(loaderAnimationTimer)
      loaderAnimationTimer = null
    }
  }

  // Initialize terminal on mount
  onMounted(() => {
    initializeTerminal()
  })

  // Cleanup on unmount
  onUnmounted(() => {
    cleanup()
  })

  return {
    // State
    isSearchMode,

    // Methods
    updateMessages,
    enterSearchMode,
    exitSearchMode,
    handleKeyPress,
    selectBranchByIndex,
    waitForContext,
    cleanup,
  }
}
