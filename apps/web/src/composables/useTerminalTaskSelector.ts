/**
 * @fileoverview Terminal integration composable for task selector.
 *
 * @description
 * Manages terminal-specific functionality for the task selector step,
 * including message updates, search mode management, and keyboard event
 * handling. Provides seamless integration between terminal and UI.
 *
 * @example
 * ```typescript
 * const terminalManager = useTerminalTaskSelector()
 * terminalManager.updateMessages(branches, isLoading)
 * terminalManager.enterSearchMode()
 * ```
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import { ref, onMounted, onUnmounted, type Ref } from 'vue'
import { useTerminalEasterEgg } from './useTerminalEasterEgg'
import type { BranchInfo } from './useBranchManager'

/**
 * Terminal task selector composable return type.
 *
 * @public
 * @since 1.0.0
 */
export interface TerminalTaskSelector {
  // State
  isTerminalSearchMode: Ref<boolean>

  // Methods
  updateMessages: (
    branches: BranchInfo[],
    isLoading: boolean,
    searchQuery: string,
    debouncedSearchQuery: string,
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
 * Terminal task selector composable for managing terminal integration.
 *
 * @remarks
 * Provides terminal-specific functionality for the task selector step,
 * coordinating between the terminal UI and branch selection operations.
 * Manages search mode, keyboard input, and message updates.
 *
 * @returns Terminal task selector interface with state and methods
 *
 * @example
 * ```typescript
 * const {
 *   isTerminalSearchMode,
 *   updateMessages,
 *   enterSearchMode,
 *   handleKeyPress
 * } = useTerminalTaskSelector()
 *
 * enterSearchMode()
 * updateMessages(branches, false, '', '', branches)
 * ```
 *
 * @public
 * @since 1.0.0
 */
export function useTerminalTaskSelector(): TerminalTaskSelector {
  // Get terminal easter egg integration
  const { terminalState, initializeTerminal } = useTerminalEasterEgg()

  // Terminal search mode state
  const isTerminalSearchMode = ref(false)

  // Store the animation timer ID
  let loaderAnimationTimer: ReturnType<typeof setTimeout> | null = null

  // Track when search mode was entered to prevent 'b' carryover
  let searchModeEnteredTime = 0

  /**
   * Updates terminal messages based on current state.
   *
   * @param branches - All available branches
   * @param isLoading - Whether branches are currently loading
   * @param searchQuery - Current search query
   * @param debouncedSearchQuery - Debounced search query
   * @param filteredBranches - Filtered branches based on search
   *
   * @example
   * ```typescript
   * updateMessages(branches, false, 'feat', 'feat', filteredBranches)
   * ```
   *
   * @public
   * @since 1.0.0
   */
  function updateMessages(branches: BranchInfo[], isLoading: boolean): void {
    // Check if terminal context is available
    if (!window.currentContext) {
      console.log('[TerminalTaskSelector] No terminal context available')
      return
    }

    console.log(
      '[TerminalTaskSelector] Updating messages with',
      branches.length,
      'branches, loading:',
      isLoading
    )

    const messages: string[] = []

    if (isTerminalSearchMode.value) {
      // Search mode messages - new order as requested
      messages.push('[esc] Cancel search')
      messages.push('')
      messages.push('Search for branches:')

      // Always use the terminal's current input as the source of truth
      const terminalInput = window.currentContext?.state?.currentInput || ''

      if (terminalInput) {
        // Filter branches based on current terminal input - search both name and commit message
        const query = terminalInput.toLowerCase()

        // Separate branches into name matches and description-only matches
        const nameMatches: BranchInfo[] = []
        const descriptionOnlyMatches: BranchInfo[] = []

        branches.forEach((branch) => {
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

              // Extract context around the match (max 40 chars total)
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
              context += `**${matchText}**` // Bold the matching text
              context += afterMatch
              if (contextEnd < branch.lastCommit.length) context += '...'

              // Format: [1] branch-name | ...context with **match**...
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
                // No match (shouldn't happen but just in case)
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
      // Normal mode messages - new order as requested
      messages.push('[n] Create new task')
      messages.push('[b] Search branch')
      messages.push('[esc] Back')
      messages.push('')

      if (branches.length > 0 || isLoading) {
        if (isLoading) {
          // Show static loader message - animation will be handled separately
          messages.push(`Branches: ⠋ Loading...`)
        } else if (branches.length > 0) {
          // Show branches header with count
          messages.push(`Branches (${branches.length} available):`)

          // Show first 5 branches with shortcuts
          if (branches.length <= 5) {
            branches.forEach((branch, index) => {
              messages.push(`[${index + 1}] ${branch.name}`)
            })
          } else {
            branches.slice(0, 5).forEach((branch, index) => {
              messages.push(`[${index + 1}] ${branch.name}`)
            })
            messages.push(`    ... and ${branches.length - 5} more branches`)
          }
        }
      } else {
        // No branches loaded yet and not loading
        messages.push('Branches: None available')
      }
    }

    // Update terminal context messages, preserving input in search mode
    window.currentContext.updateMessages(messages, isTerminalSearchMode.value)

    // Handle loader animation separately to prevent flickering
    if (isLoading) {
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

        // Only update the loader line (index 4 in normal mode - after the empty line)
        if (
          window.currentContext.state &&
          window.currentContext.state.lines?.[4]
        ) {
          window.currentContext.state.lines[4].text = loaderLine
        }

        // Schedule next animation frame
        loaderAnimationTimer = setTimeout(animateLoader, 100)
      }

      // Start animation after a short delay to ensure messages are loaded
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
   * Enters terminal search mode for branch filtering.
   *
   * @example
   * ```typescript
   * enterSearchMode()
   * // Terminal now accepts keyboard input for search
   * ```
   *
   * @public
   * @since 1.0.0
   */
  function enterSearchMode(): void {
    console.log('[TerminalTaskSelector] Entering search mode')
    isTerminalSearchMode.value = true
    searchModeEnteredTime = Date.now()

    // Set global flag to prevent terminal from processing input
    ;(
      window as unknown as {
        isTerminalSearchMode: boolean
        searchModeEnteredTime: number
      }
    ).isTerminalSearchMode = true
    ;(
      window as unknown as { searchModeEnteredTime: number }
    ).searchModeEnteredTime = searchModeEnteredTime

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
   * Exits terminal search mode.
   *
   * @example
   * ```typescript
   * exitSearchMode()
   * // Terminal returns to normal mode
   * ```
   *
   * @public
   * @since 1.0.0
   */
  function exitSearchMode(): void {
    console.log('[TerminalTaskSelector] Exiting search mode')
    isTerminalSearchMode.value = false

    // Clear global flag
    ;(
      window as unknown as { isTerminalSearchMode: boolean }
    ).isTerminalSearchMode = false

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
   * @example
   * ```typescript
   * window.addEventListener('keydown', (e) => {
   *   handleKeyPress(e, searchQuery, branches, updateSearch, selectBranch)
   * })
   * ```
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
    // Only handle keys when terminal is visible
    if (!terminalState.value.lines.length) return

    if (isTerminalSearchMode.value) {
      // In search mode, we handle all keyboard events
      // The terminal IPC has already processed the character

      console.log(
        '[TerminalTaskSelector] Processing key in search mode:',
        event.key
      )

      // Handle search input
      if (event.key === 'Escape') {
        searchQuery.value = '' // Clear the search query
        exitSearchMode()
        onSearchUpdate('')
      } else if (event.key === 'Enter') {
        onBranchSelect(0) // Select first result
      } else if (event.key >= '1' && event.key <= '9') {
        const index = parseInt(event.key) - 1
        onBranchSelect(index)
      } else if (event.key === '0') {
        // 0 selects the 10th result
        onBranchSelect(9)
      } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey) {
        // DO NOT manually add character - terminal already handles this via IPC
        // The character is already being sent from main process to terminal context
        console.log(
          '[TerminalTaskSelector] Character key pressed:',
          event.key,
          '- handled by terminal IPC'
        )

        // Use a single source of truth - read from terminal context after it processes
        // Use requestAnimationFrame for better sync timing
        requestAnimationFrame(() => {
          const terminalInput = window.currentContext?.state?.currentInput || ''
          if (searchQuery.value !== terminalInput) {
            searchQuery.value = terminalInput
            console.log(
              '[TerminalTaskSelector] Updated search query from terminal:',
              searchQuery.value
            )
            onSearchUpdate(searchQuery.value)

            // Re-generate search mode messages with current input
            if (window.currentContext) {
              updateMessages(branches, false)
            }
          }
        })
      } else if (
        event.key === 'Backspace' ||
        event.key === 'Delete' ||
        event.key === 'ArrowLeft' ||
        event.key === 'ArrowRight'
      ) {
        // DO NOT manually handle these keys - terminal already handles them via IPC
        console.log(
          '[TerminalTaskSelector] Edit/navigation key pressed:',
          event.key,
          '- handled by terminal IPC'
        )

        // For arrow keys, no need to update search
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
          return
        }

        // For Backspace/Delete, sync after terminal processes the key
        requestAnimationFrame(() => {
          const terminalInput = window.currentContext?.state?.currentInput || ''
          if (searchQuery.value !== terminalInput) {
            searchQuery.value = terminalInput
            console.log(
              '[TerminalTaskSelector] Updated after edit key:',
              searchQuery.value,
              'cursor:',
              window.currentContext?.state?.cursorPosition
            )
            onSearchUpdate(searchQuery.value)

            // Update messages directly without refreshing to stay in search mode
            if (window.currentContext) {
              updateMessages(branches, false)
            }
          }
        })
      }
    }
    // In normal mode, let terminal handle all keys including 'b'
    // The terminal strategy will dispatch 'terminal-enter-branch-search' event for 'b' key
  }

  /**
   * Selects a branch by index from the appropriate list.
   *
   * @param index - Index of branch to select
   * @param branches - All branches
   * @param filteredBranches - Filtered branches (used in search mode)
   * @param onSelect - Callback to handle selection
   *
   * @example
   * ```typescript
   * selectBranchByIndex(0, branches, filtered, (branch) => {
   *   console.log('Selected:', branch.name)
   * })
   * ```
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
    const branchList = isTerminalSearchMode.value ? filteredBranches : branches

    if (branchList[index]) {
      const branch = branchList[index]
      console.log(`[TerminalTaskSelector] Selected branch: ${branch.name}`)
      onSelect(branch)
    }
  }

  /**
   * Waits for terminal context to be available.
   *
   * @param attempts - Number of attempts (internal use)
   * @returns Promise that resolves when context is ready
   *
   * @example
   * ```typescript
   * await waitForContext()
   * // Terminal context is now available
   * ```
   *
   * @public
   * @since 1.0.0
   */
  function waitForContext(attempts = 0): Promise<void> {
    return new Promise((resolve) => {
      if (window.currentContext) {
        console.log('[TerminalTaskSelector] Terminal context ready')
        resolve()
      } else if (attempts < 10) {
        console.log('[TerminalTaskSelector] Waiting for context...', attempts)
        setTimeout(() => {
          waitForContext(attempts + 1).then(resolve)
        }, 100)
      } else {
        console.warn(
          '[TerminalTaskSelector] Context not available after 10 attempts'
        )
        resolve()
      }
    })
  }

  /**
   * Cleans up terminal state and event listeners.
   *
   * @example
   * ```typescript
   * onUnmounted(() => {
   *   cleanup()
   * })
   * ```
   *
   * @public
   * @since 1.0.0
   */
  function cleanup(): void {
    // Clear global flag
    ;(
      window as unknown as { isTerminalSearchMode: boolean }
    ).isTerminalSearchMode = false
    isTerminalSearchMode.value = false

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
    isTerminalSearchMode,

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
