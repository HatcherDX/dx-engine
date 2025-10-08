/**
 * @fileoverview Standardized terminal input handling composable.
 *
 * @description
 * Provides a reusable, standardized terminal input handling system that can be used
 * across all terminal input scenarios. Manages cursor position, character insertion/deletion,
 * arrow key navigation, and input state preservation during refreshes.
 *
 * @example
 * ```typescript
 * const inputHandler = useTerminalInput({
 *   onInputChange: (input) => console.log('Input changed:', input),
 *   onEnter: () => console.log('Enter pressed')
 * })
 *
 * inputHandler.handleCharacter('a')
 * inputHandler.handleKeyboard('ArrowLeft')
 * ```
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import { ref, type Ref } from 'vue'

/**
 * Options for terminal input handler.
 *
 * @interface TerminalInputOptions
 * @public
 * @since 1.0.0
 */
export interface TerminalInputOptions {
  /** Callback when input changes */
  onInputChange?: (input: string, cursorPosition: number) => void
  /** Callback when Enter is pressed */
  onEnter?: (input: string) => void
  /** Callback when Escape is pressed */
  onEscape?: () => void
  /** Initial input value */
  initialValue?: string
  /** Initial cursor position */
  initialCursor?: number
  /** Whether to allow multi-line input */
  allowMultiline?: boolean
  /** Custom key handler for specific keys */
  customKeyHandler?: (key: string) => boolean
}

/**
 * Terminal input handler interface.
 *
 * @interface TerminalInputHandler
 * @public
 * @since 1.0.0
 */
export interface TerminalInputHandler {
  /** Current input value */
  input: Ref<string>
  /** Current cursor position */
  cursorPosition: Ref<number>
  /** Command history for arrow key navigation */
  history: Ref<string[]>
  /** Current position in command history */
  historyIndex: Ref<number>

  /** Handle character input */
  handleCharacter: (char: string) => boolean
  /** Handle keyboard command (special keys) */
  handleKeyboard: (command: string) => boolean
  /** Set input value and cursor position */
  setInput: (input: string, cursor?: number) => void
  /** Clear input and reset cursor */
  clear: () => void
  /** Add to command history */
  addToHistory: (command: string) => void
  /** Get formatted input with cursor marker for display */
  getDisplayInput: () => { beforeCursor: string; afterCursor: string }
}

/**
 * Creates a standardized terminal input handler.
 *
 * @remarks
 * This composable provides a reusable input handling system that manages cursor position,
 * character insertion/deletion, arrow key navigation, and command history. It can be used
 * across all terminal input scenarios for consistent behavior.
 *
 * @param options - Configuration options for the input handler
 * @returns Terminal input handler with state and methods
 *
 * @example
 * ```typescript
 * const handler = useTerminalInput({
 *   onInputChange: (input) => {
 *     searchQuery.value = input
 *     updateSearchResults()
 *   },
 *   onEnter: (input) => {
 *     executeCommand(input)
 *   }
 * })
 *
 * // Handle character input
 * handler.handleCharacter('h')
 *
 * // Handle special keys
 * handler.handleKeyboard('ArrowLeft')
 * handler.handleKeyboard('Backspace')
 * ```
 *
 * @public
 * @since 1.0.0
 */
export function useTerminalInput(
  options: TerminalInputOptions = {}
): TerminalInputHandler {
  const {
    onInputChange,
    onEnter,
    onEscape,
    initialValue = '',
    initialCursor = 0,
    allowMultiline = false,
    customKeyHandler,
  } = options

  // State
  const input = ref(initialValue)
  const cursorPosition = ref(initialCursor)
  const history = ref<string[]>([])
  const historyIndex = ref(-1)

  /**
   * Triggers input change callback with current state.
   *
   * @private
   */
  function triggerChange(): void {
    if (onInputChange) {
      onInputChange(input.value, cursorPosition.value)
    }
  }

  /**
   * Handles character input.
   *
   * @param char - Character to insert
   * @returns Whether the character was handled
   *
   * @public
   */
  function handleCharacter(char: string): boolean {
    // Check for custom key handler first
    if (customKeyHandler && customKeyHandler(char)) {
      return true
    }

    // Handle special characters
    if (char === '\r' || char === '\n') {
      if (!allowMultiline) {
        if (onEnter) {
          onEnter(input.value)
        }
        return true
      }
    }

    // Handle backspace
    if (char === '\b' || char === 'Backspace') {
      if (cursorPosition.value > 0) {
        input.value =
          input.value.slice(0, cursorPosition.value - 1) +
          input.value.slice(cursorPosition.value)
        cursorPosition.value--
        triggerChange()
      }
      return true
    }

    // Insert regular character at cursor position
    input.value =
      input.value.slice(0, cursorPosition.value) +
      char +
      input.value.slice(cursorPosition.value)
    cursorPosition.value++
    triggerChange()
    return true
  }

  /**
   * Handles keyboard commands (special keys).
   *
   * @param command - Keyboard command (e.g., 'ArrowLeft', 'Enter', 'Escape')
   * @returns Whether the command was handled
   *
   * @public
   */
  function handleKeyboard(command: string): boolean {
    // Check for custom key handler first
    if (customKeyHandler && customKeyHandler(command)) {
      return true
    }

    switch (command) {
      case 'ArrowLeft':
        if (cursorPosition.value > 0) {
          cursorPosition.value--
          triggerChange()
        }
        return true

      case 'ArrowRight':
        if (cursorPosition.value < input.value.length) {
          cursorPosition.value++
          triggerChange()
        }
        return true

      case 'ArrowUp':
        if (historyIndex.value < history.value.length - 1) {
          historyIndex.value++
          input.value = history.value[historyIndex.value] || ''
          cursorPosition.value = input.value.length
          triggerChange()
        }
        return true

      case 'ArrowDown':
        if (historyIndex.value > 0) {
          historyIndex.value--
          input.value = history.value[historyIndex.value] || ''
          cursorPosition.value = input.value.length
          triggerChange()
        } else if (historyIndex.value === 0) {
          historyIndex.value = -1
          input.value = ''
          cursorPosition.value = 0
          triggerChange()
        }
        return true

      case 'Home':
        cursorPosition.value = 0
        triggerChange()
        return true

      case 'End':
        cursorPosition.value = input.value.length
        triggerChange()
        return true

      case 'Enter':
        if (onEnter) {
          onEnter(input.value)
        }
        return true

      case 'Escape':
        if (onEscape) {
          onEscape()
        }
        return true

      case 'Backspace':
        if (cursorPosition.value > 0) {
          input.value =
            input.value.slice(0, cursorPosition.value - 1) +
            input.value.slice(cursorPosition.value)
          cursorPosition.value--
          triggerChange()
        }
        return true

      case 'Delete':
        if (cursorPosition.value < input.value.length) {
          input.value =
            input.value.slice(0, cursorPosition.value) +
            input.value.slice(cursorPosition.value + 1)
          triggerChange()
        }
        return true

      default:
        return false
    }
  }

  /**
   * Sets input value and optionally cursor position.
   *
   * @param newInput - New input value
   * @param cursor - Optional cursor position (defaults to end)
   *
   * @public
   */
  function setInput(newInput: string, cursor?: number): void {
    input.value = newInput
    cursorPosition.value = cursor ?? newInput.length
    triggerChange()
  }

  /**
   * Clears input and resets cursor.
   *
   * @public
   */
  function clear(): void {
    input.value = ''
    cursorPosition.value = 0
    historyIndex.value = -1
    triggerChange()
  }

  /**
   * Adds command to history.
   *
   * @param command - Command to add to history
   *
   * @public
   */
  function addToHistory(command: string): void {
    if (command.trim() && !history.value.includes(command)) {
      history.value.unshift(command)
      if (history.value.length > 20) {
        history.value = history.value.slice(0, 20)
      }
    }
    historyIndex.value = -1
  }

  /**
   * Gets formatted input split at cursor position for display.
   *
   * @returns Object with text before and after cursor
   *
   * @public
   */
  function getDisplayInput(): { beforeCursor: string; afterCursor: string } {
    return {
      beforeCursor: input.value.slice(0, cursorPosition.value),
      afterCursor: input.value.slice(cursorPosition.value),
    }
  }

  return {
    // State
    input,
    cursorPosition,
    history,
    historyIndex,

    // Methods
    handleCharacter,
    handleKeyboard,
    setInput,
    clear,
    addToHistory,
    getDisplayInput,
  }
}
