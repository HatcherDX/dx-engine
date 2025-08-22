/**
 * @fileoverview Timeline event management composable for Git Timeline mode.
 *
 * @description
 * Provides a centralized event system for communication between TimelineSidebar
 * and GitTimelineView components without tight coupling.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import { ref } from 'vue'

/**
 * File selection context type.
 *
 * @public
 */
export type FileSelectionContext = 'changes' | 'history'

/**
 * Event payload for file selection.
 *
 * @public
 */
export interface FileSelectionEvent {
  filePath: string
  context: FileSelectionContext
  timestamp: number
}

/**
 * Event payload for commit selection.
 *
 * @public
 */
export interface CommitSelectionEvent {
  commitHash: string
  commitIndex: number
  timestamp: number
}

// Global reactive state for timeline events
const selectedFile = ref<string>('')
const selectedFileContext = ref<FileSelectionContext>('changes')
const selectedCommitHash = ref<string>('')
const selectedCommitIndex = ref<number>(0)

/**
 * Timeline events composable for managing communication between components.
 *
 * @returns Timeline event management functions and reactive state
 *
 * @example
 * ```typescript
 * // In TimelineSidebar.vue
 * const { selectFile, selectCommit } = useTimelineEvents()
 *
 * const handleFileClick = (filePath: string) => {
 *   selectFile(filePath)
 * }
 *
 * // In GitTimelineView.vue
 * const { selectedFile, selectedCommitHash, onFileSelected } = useTimelineEvents()
 *
 * onFileSelected((filePath) => {
 *   // Handle file selection
 *   loadDiffForFile(filePath)
 * })
 * ```
 *
 * @public
 */
export function useTimelineEvents() {
  /**
   * Select a file and notify listeners.
   *
   * @param filePath - Path of the selected file
   * @param context - Context of the selection (changes or history)
   */
  const selectFile = (
    filePath: string,
    context: FileSelectionContext = 'changes'
  ): void => {
    selectedFile.value = filePath
    selectedFileContext.value = context
    console.log(
      '[Timeline Events] File selected:',
      filePath,
      'in context:',
      context
    )
  }

  /**
   * Select a commit and notify listeners.
   *
   * @param commitHash - Hash of the selected commit
   * @param commitIndex - Index of the commit in the history
   */
  const selectCommit = (commitHash: string, commitIndex: number): void => {
    selectedCommitHash.value = commitHash
    selectedCommitIndex.value = commitIndex
    console.log(
      '[Timeline Events] Commit selected:',
      commitHash,
      'at index',
      commitIndex
    )
  }

  /**
   * Get current selections.
   */
  const getCurrentSelections = () => {
    return {
      file: selectedFile.value,
      fileContext: selectedFileContext.value,
      commitHash: selectedCommitHash.value,
      commitIndex: selectedCommitIndex.value,
    }
  }

  /**
   * Reset all selections.
   */
  const resetSelections = (): void => {
    selectedFile.value = ''
    selectedFileContext.value = 'changes'
    selectedCommitHash.value = ''
    selectedCommitIndex.value = 0
  }

  return {
    // Reactive state
    selectedFile: selectedFile,
    selectedFileContext: selectedFileContext,
    selectedCommitHash: selectedCommitHash,
    selectedCommitIndex: selectedCommitIndex,

    // Actions
    selectFile,
    selectCommit,
    getCurrentSelections,
    resetSelections,
  }
}
