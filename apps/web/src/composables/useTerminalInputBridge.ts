/**
 * @fileoverview Centralized terminal input bridge for DRY terminal-UI communication.
 *
 * @description
 * Provides a single source of truth for terminal input that can be shared
 * between the terminal context and UI components. This eliminates duplicate
 * input handling logic and ensures consistent behavior across all terminal steps.
 *
 * @example
 * ```typescript
 * const bridge = useTerminalInputBridge()
 *
 * // In terminal strategy
 * bridge.updateInput('task name | branch name')
 *
 * // In UI component
 * const { taskName, branchName } = bridge.useTaskDetails()
 * ```
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import { ref, computed, readonly } from 'vue'
import type { Ref } from 'vue'

/**
 * Task details structure for terminal input.
 *
 * @remarks
 * Represents the parsed task and branch names from terminal input.
 *
 * @public
 * @since 1.0.0
 */
export interface TaskDetails {
  /** Task name entered by user */
  taskName: string
  /** Branch name (null for auto-generation) */
  branchName: string | null
}

/**
 * Terminal input bridge state.
 *
 * @remarks
 * Internal state management for the terminal input bridge.
 *
 * @internal
 * @since 1.0.0
 */
interface TerminalInputState {
  /** Raw terminal input string */
  rawInput: string
  /** Cursor position in the input */
  cursorPosition: number
  /** Parsed task details */
  taskDetails: TaskDetails
}

// Global singleton state
const state: Ref<TerminalInputState> = ref<TerminalInputState>({
  rawInput: '',
  cursorPosition: 0,
  taskDetails: {
    taskName: '',
    branchName: null,
  },
})

// Event listeners for UI updates
const listeners = new Set<(details: TaskDetails) => void>()

/**
 * Parse raw input into task details.
 *
 * @remarks
 * Splits input by pipe character to extract task and branch names.
 *
 * @param input - Raw terminal input
 * @returns Parsed task details
 *
 * @example
 * ```typescript
 * parseTaskDetails('Fix bug | bugfix/issue-123')
 * // Returns: { taskName: 'Fix bug', branchName: 'bugfix/issue-123' }
 * ```
 *
 * @internal
 * @since 1.0.0
 */
function parseTaskDetails(input: string): TaskDetails {
  const pipeIndex = input.indexOf('|')

  if (pipeIndex === -1) {
    // No pipe - task name only
    return {
      taskName: input.trim(),
      branchName: null,
    }
  }

  // Has pipe - split into task and branch
  const taskPart = input.substring(0, pipeIndex).trim()
  const branchPart = input.substring(pipeIndex + 1).trim()

  return {
    taskName: taskPart,
    branchName: branchPart || null, // Empty after pipe = auto-generate
  }
}

/**
 * Notify all listeners of task details update.
 *
 * @remarks
 * Broadcasts the current task details to all registered listeners.
 *
 * @internal
 * @since 1.0.0
 */
function notifyListeners(): void {
  listeners.forEach((listener) => {
    listener(state.value.taskDetails)
  })
}

/**
 * Terminal input bridge composable.
 *
 * @remarks
 * Provides centralized management of terminal input for task details.
 * This composable acts as a bridge between terminal contexts and UI components.
 *
 * @returns Terminal input bridge API
 *
 * @example
 * ```typescript
 * const bridge = useTerminalInputBridge()
 *
 * // Update from terminal
 * bridge.updateInput('My task | my-branch')
 *
 * // Read in component
 * const details = bridge.getTaskDetails()
 * console.log(details.taskName) // 'My task'
 * ```
 *
 * @public
 * @since 1.0.0
 */
export function useTerminalInputBridge(): {
  updateInput: (input: string, cursorPos?: number) => void
  handleCharacter: (char: string) => boolean
  getTaskDetails: () => Readonly<TaskDetails>
  getRawInput: () => { input: string; cursor: number }
  subscribe: (listener: (details: TaskDetails) => void) => () => void
  clear: () => void
  useTaskDetails: () => {
    taskName: Ref<string>
    branchName: Ref<string | null>
  }
  state: Readonly<Ref<TerminalInputState>>
} {
  /**
   * Update the raw terminal input.
   *
   * @remarks
   * Updates the raw input, parses it, and notifies listeners.
   *
   * @param input - New raw input string
   * @param cursorPos - Optional cursor position
   *
   * @example
   * ```typescript
   * bridge.updateInput('Fix login bug | bugfix/login')
   * ```
   *
   * @public
   */
  function updateInput(input: string, cursorPos?: number): void {
    state.value.rawInput = input
    if (cursorPos !== undefined) {
      state.value.cursorPosition = cursorPos
    }

    // Parse and update task details
    state.value.taskDetails = parseTaskDetails(input)

    // Notify listeners
    notifyListeners()
  }

  /**
   * Handle character input for terminal.
   *
   * @remarks
   * Processes individual character input including special keys.
   *
   * @param char - Character to process
   * @returns Whether the character was handled
   *
   * @example
   * ```typescript
   * bridge.handleCharacter('a') // Adds 'a' at cursor
   * bridge.handleCharacter('Backspace') // Deletes before cursor
   * ```
   *
   * @public
   */
  function handleCharacter(char: string): boolean {
    const currentInput = state.value.rawInput
    const cursorPos = state.value.cursorPosition

    let newInput = currentInput
    let newCursor = cursorPos

    // Handle special characters
    if (char === 'Backspace' || char === '\b') {
      if (cursorPos > 0) {
        newInput =
          currentInput.slice(0, cursorPos - 1) + currentInput.slice(cursorPos)
        newCursor = cursorPos - 1
      }
    } else if (char === 'Delete') {
      if (cursorPos < currentInput.length) {
        newInput =
          currentInput.slice(0, cursorPos) + currentInput.slice(cursorPos + 1)
      }
    } else if (char === 'ArrowLeft') {
      if (cursorPos > 0) {
        newCursor = cursorPos - 1
      }
    } else if (char === 'ArrowRight') {
      if (cursorPos < currentInput.length) {
        newCursor = cursorPos + 1
      }
    } else if (char === 'Home') {
      newCursor = 0
    } else if (char === 'End') {
      newCursor = currentInput.length
    } else if (char.length === 1) {
      // Regular character
      newInput =
        currentInput.slice(0, cursorPos) + char + currentInput.slice(cursorPos)
      newCursor = cursorPos + 1
    } else {
      // Unknown character
      return false
    }

    // Update state
    updateInput(newInput, newCursor)
    return true
  }

  /**
   * Get current task details.
   *
   * @returns Current task details
   *
   * @example
   * ```typescript
   * const details = bridge.getTaskDetails()
   * console.log(details.taskName, details.branchName)
   * ```
   *
   * @public
   */
  function getTaskDetails(): Readonly<TaskDetails> {
    return readonly(state.value.taskDetails) as Readonly<TaskDetails>
  }

  /**
   * Get raw terminal input.
   *
   * @returns Current raw input and cursor position
   *
   * @example
   * ```typescript
   * const { input, cursor } = bridge.getRawInput()
   * ```
   *
   * @public
   */
  function getRawInput(): { input: string; cursor: number } {
    return {
      input: state.value.rawInput,
      cursor: state.value.cursorPosition,
    }
  }

  /**
   * Subscribe to task details updates.
   *
   * @param listener - Callback for updates
   * @returns Unsubscribe function
   *
   * @example
   * ```typescript
   * const unsubscribe = bridge.subscribe((details) => {
   *   console.log('Task updated:', details.taskName)
   * })
   *
   * // Later...
   * unsubscribe()
   * ```
   *
   * @public
   */
  function subscribe(listener: (details: TaskDetails) => void): () => void {
    listeners.add(listener)

    // Return unsubscribe function
    return () => {
      listeners.delete(listener)
    }
  }

  /**
   * Clear all input.
   *
   * @remarks
   * Resets the input state to empty.
   *
   * @example
   * ```typescript
   * bridge.clear()
   * ```
   *
   * @public
   */
  function clear(): void {
    updateInput('', 0)
  }

  /**
   * Use reactive task details in Vue component.
   *
   * @remarks
   * Returns reactive refs for use in Vue templates.
   *
   * @returns Reactive task details
   *
   * @example
   * ```typescript
   * const { taskName, branchName } = bridge.useTaskDetails()
   * // Use in template: {{ taskName }}
   * ```
   *
   * @public
   */
  function useTaskDetails(): {
    taskName: Ref<string>
    branchName: Ref<string | null>
  } {
    return {
      taskName: computed(() => state.value.taskDetails.taskName),
      branchName: computed(() => state.value.taskDetails.branchName),
    }
  }

  return {
    // Core methods
    updateInput,
    handleCharacter,
    getTaskDetails,
    getRawInput,
    subscribe,
    clear,

    // Vue integration
    useTaskDetails,

    // Direct state access (readonly)
    state: readonly(state),
  }
}

// Export singleton instance for global use
export const terminalInputBridge = useTerminalInputBridge()
