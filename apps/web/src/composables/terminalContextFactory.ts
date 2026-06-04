/**
 * @fileoverview Terminal Context Factory for creating isolated terminal contexts per onboarding step.
 *
 * @description
 * Provides a factory pattern for creating step-specific terminal contexts that are isolated
 * and self-contained. Each context manages its own state, commands, and lifecycle.
 * Follows DRY principles by extracting common terminal behaviors into reusable functions.
 *
 * @example
 * ```typescript
 * const factory = new TerminalContextFactory()
 * const welcomeContext = factory.createContext('welcome', onboardingApi)
 * welcomeContext.activate()
 * ```
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import { reactive, type ComputedRef } from 'vue'
import type { OnboardingStep, ProjectInfo } from './useOnboarding'
import { TerminalStrategies, type TerminalStrategy } from './terminalStrategies'

/**
 * Represents a single line in the terminal display.
 *
 * @interface TerminalLine
 * @public
 */
export interface TerminalLine {
  /** Unique identifier for the line (for TransitionGroup keys) */
  id: string
  /** The text content of the line */
  text: string
  /** Whether this line is being typed (for animation) */
  isTyping: boolean
  /** Type of line for styling purposes */
  type: 'system' | 'prompt' | 'input' | 'error' | 'success'
  /** Timestamp when the line was added (for animation ordering) */
  timestamp: number
}

/**
 * Command definition for terminal context.
 *
 * @interface TerminalCommand
 * @public
 */
export interface TerminalCommand {
  /** Function to execute when command is invoked */
  action: () => void | Promise<void>
  /** Human-readable description of the command */
  description: string
  /** Whether this command should auto-hide terminal after execution */
  autoHideAfterExecution?: boolean
}

/**
 * State interface for a single terminal context.
 *
 * @interface TerminalContextState
 * @public
 */
export interface TerminalContextState {
  /** Unique identifier for this context */
  id: string
  /** The onboarding step this context belongs to */
  step: OnboardingStep
  /** Whether this context is currently active */
  isActive: boolean
  /** Array of terminal lines to display */
  lines: TerminalLine[]
  /** Current input being typed by user */
  currentInput: string
  /** Cursor position within the current input (0 = start, length = end) */
  cursorPosition: number
  /** Whether terminal is waiting for user input */
  isWaitingForInput: boolean
  /** Command history for arrow key navigation */
  commandHistory: string[]
  /** Current position in command history */
  historyIndex: number
  /** Whether terminal is currently typing a line */
  isTypingLine: boolean
  /** Whether this context should auto-hide after successful command */
  shouldAutoHide: boolean
}

/**
 * Recent project information structure.
 *
 * @interface RecentProject
 * @public
 */
export interface RecentProject {
  id: string
  name: string
  path: string
  lastOpened: Date
  metadata?: {
    gitRemote?: string
    framework?: string
    packageManager?: string
    icon?: string
  }
}

/**
 * Git branch information.
 *
 * @interface BranchInfo
 * @public
 */
export interface BranchInfo {
  name: string
  current: boolean
}

/**
 * API interface for onboarding operations.
 *
 * @interface OnboardingAPI
 * @public
 */
export interface OnboardingAPI {
  nextStep: () => void
  previousStep: () => void
  goToStep: (step: OnboardingStep) => void
  recentProjects: ComputedRef<ProjectInfo[]>
  getSelectedBranch?: ComputedRef<BranchInfo | null>
}

/**
 * Interface for a terminal context instance.
 *
 * @interface TerminalContext
 * @public
 */
export interface TerminalContext {
  /** Access to context state */
  readonly state: TerminalContextState
  /** Available commands for this context */
  readonly commands: Record<string, TerminalCommand>
  /** Activation messages to show when context starts */
  readonly activationMessages: string[]

  /**
   * Activates this terminal context.
   * Clears previous state and shows activation messages.
   */
  activate(): void

  /**
   * Deactivates this terminal context.
   * Cleans up state and prepares for disposal.
   */
  deactivate(): void

  /**
   * Executes a command if it exists for this context.
   *
   * @param command - Command to execute
   */
  executeCommand(command: string): void

  /**
   * Adds a line to the terminal display.
   *
   * @param text - Text to add
   * @param type - Type of line for styling
   */
  addLine(text: string, type?: TerminalLine['type']): void

  /**
   * Clears all terminal lines.
   */
  clear(): void

  /**
   * Shows help information for this context.
   */
  showHelp(): void

  /**
   * Handles keyboard commands (Arrow keys, Enter, Escape, etc.).
   *
   * @param command - The keyboard command
   */
  handleKeyboardCommand(command: string): void

  /**
   * Handles character input from user.
   *
   * @param char - The character input
   */
  handleCharacterInput(char: string): void

  /**
   * Updates the current input value.
   *
   * @param input - New input value
   */
  updateInput(input: string): void

  /**
   * Updates terminal messages dynamically.
   *
   * @param messages - New messages to display
   * @param preserveInput - Whether to preserve current input state
   */
  updateMessages(messages: string[], preserveInput?: boolean): void

  /**
   * Forces a refresh of the terminal messages.
   *
   * @param preserveInput - Whether to preserve current input state
   */
  refreshMessages(preserveInput?: boolean): void

  /**
   * Disposes of this context and cleans up resources.
   */
  dispose(): void
}

/**
 * Base implementation of TerminalContext with common functionality.
 *
 * @class BaseTerminalContext
 * @public
 */
export class BaseTerminalContext implements TerminalContext {
  private _state: TerminalContextState
  private _commands: Record<string, TerminalCommand>
  private _activationMessages: string[]
  // OnboardingAPI reference for terminal strategies (stored but intentionally unused in base class)
  private _onboardingAPI: OnboardingAPI
  private _strategy: TerminalStrategy
  private _isLoadingMessages: boolean = false
  // Track last command execution to prevent rapid duplicates
  private _lastCommandTime = 0
  private _lastCommand = ''
  // Track if messages have been loaded for this context
  private _messagesLoaded = false
  // Track if projects are currently being loaded to prevent duplicates
  private _isLoadingProjects = false

  /**
   * Creates a new BaseTerminalContext.
   *
   * @param step - The onboarding step
   * @param onboardingAPI - API for onboarding operations
   * @param strategy - Terminal strategy for this step
   */
  constructor(
    step: OnboardingStep,
    onboardingAPI: OnboardingAPI,
    strategy: TerminalStrategy
  ) {
    this._state = reactive({
      id: `terminal-${step}-${Date.now()}`,
      step,
      isActive: false,
      lines: [],
      currentInput: '',
      cursorPosition: 0,
      isWaitingForInput: true, // Always show cursor
      commandHistory: [],
      historyIndex: -1,
      isTypingLine: false,
      shouldAutoHide: false,
    })

    // Store API reference for potential future strategy use
    this._onboardingAPI = onboardingAPI
    void this._onboardingAPI // Explicitly mark as intentionally unused in base
    this._strategy = strategy
    this._commands = strategy.commands
    // Handle both static and dynamic messages
    this._activationMessages =
      typeof strategy.messages === 'function'
        ? strategy.messages()
        : strategy.messages

    console.log(`[TerminalContext] Created context for step: ${step}`)
  }

  get state(): TerminalContextState {
    // Return the reactive state directly for proper reactivity
    // The state is already protected by being private
    return this._state
  }

  get commands(): Record<string, TerminalCommand> {
    return this._commands
  }

  get activationMessages(): string[] {
    return this._activationMessages
  }

  /**
   * Activates this terminal context.
   *
   * @public
   */
  activate(): void {
    console.log(
      `[TerminalContext] Activating context for step: ${this._state.step}`
    )

    // If already active, just ensure we're in the right state
    if (this._state.isActive) {
      console.log(
        `[TerminalContext] Context already active, ensuring clean state`
      )
      // Clear input and ensure waiting for input
      this._state.currentInput = ''
      this._state.cursorPosition = 0
      this._state.isWaitingForInput = true
      return
    }

    // If currently loading, don't start another load
    if (this._isLoadingMessages) {
      console.log(`[TerminalContext] Already loading messages, skipping`)
      return
    }

    this._state.isActive = true

    // Check if messages have already been loaded for this context
    // For project-selection, always reload to get fresh project list
    if (this._state.step === 'project-selection') {
      console.log(
        `[TerminalContext] Project selection step - forcing reload for fresh data`
      )
      this._messagesLoaded = false
      this._state.lines = []
    } else if (this._messagesLoaded && this._state.lines.length > 0) {
      console.log(
        `[TerminalContext] Messages already loaded with ${this._state.lines.length} lines, reusing existing content`
      )

      // For task-detail step, restore input from bridge instead of clearing
      if (this._state.step === 'task-detail') {
        const bridge = window.terminalInputBridge
        if (bridge) {
          const { input, cursor } = bridge.getRawInput()
          this._state.currentInput = input
          this._state.cursorPosition = cursor
          console.log(
            '[TerminalContext] Restored input from bridge (cached context):',
            input
          )
        } else {
          this._state.currentInput = ''
        }
      } else {
        // Clear input for other steps
        this._state.currentInput = ''
      }

      this._state.isWaitingForInput = true
      return
    }

    // If messages were loaded but lines are empty, reload them
    if (this._messagesLoaded && this._state.lines.length === 0) {
      console.log(
        `[TerminalContext] Messages were loaded but lines are empty, reloading...`
      )
      this._messagesLoaded = false
    }

    // First time activation - load messages
    this._isLoadingMessages = true

    // Clear for fresh start on first activation
    console.log(`[TerminalContext] First activation - loading fresh messages`)
    this.clear()

    // For project-selection step, dynamically load recent projects for messages
    if (this._state.step === 'project-selection') {
      this.loadProjectSelectionMessages().finally(() => {
        this._isLoadingMessages = false
        this._messagesLoaded = true
      })
    } else if (this._state.step === 'task-selector') {
      // For task-selector, show default messages initially
      // The component will update them dynamically once branches are loaded
      // Clear any accumulated input
      this._state.currentInput = ''
      this._state.cursorPosition = 0
      this._activationMessages.forEach((message) => {
        this.addLine(message, 'system')
      })
      this._isLoadingMessages = false
      this._messagesLoaded = true
      // Always show input prompt with cursor
      this._state.isWaitingForInput = true
      console.log(
        '[TerminalContext] Task-selector activated with default messages and cleared input'
      )
    } else {
      // For branch-creation, refresh messages to get latest branch name
      if (
        this._state.step === 'branch-creation' &&
        typeof this._strategy.messages === 'function'
      ) {
        this._activationMessages = this._strategy.messages()
      }

      // Add activation messages for other steps
      this._activationMessages.forEach((message) => {
        this.addLine(message, 'system')
      })
      this._isLoadingMessages = false
      this._messagesLoaded = true
    }

    // For task-detail step, restore input from bridge
    if (this._state.step === 'task-detail') {
      const bridge = window.terminalInputBridge
      if (bridge) {
        const { input, cursor } = bridge.getRawInput()
        this._state.currentInput = input
        this._state.cursorPosition = cursor
        console.log('[TerminalContext] Restored input from bridge:', input)
      } else {
        this._state.currentInput = ''
      }
    } else {
      // Clear input for other steps
      this._state.currentInput = ''
    }

    // Clear command history
    this._state.commandHistory = []
    this._state.historyIndex = -1
    this._state.isWaitingForInput = true
  }

  /**
   * Load and display project selection messages with real project names.
   *
   * @private
   */
  private async loadProjectSelectionMessages(): Promise<void> {
    // Prevent concurrent loads
    if (this._isLoadingProjects) {
      console.log(
        '[TerminalContext] Already loading projects, skipping duplicate load'
      )
      return
    }

    this._isLoadingProjects = true

    console.log(
      '[TerminalContext] Loading project selection messages - should only happen once per activation'
    )

    try {
      // Add initial messages with staggered animation
      const messages = ['[o] Open project', '[esc] Back', '', 'Select project:']

      for (const [index, message] of messages.entries()) {
        setTimeout(() => {
          this.addLine(message, 'system')
        }, index * 20) // 20ms delay between lines - much faster
      }

      // Load real projects from storage
      if (window?.storageAPI?.getRecentProjects) {
        try {
          const projects = await window.storageAPI.getRecentProjects()
          console.log('[TerminalContext] Loaded projects:', projects)

          // Add project commands (1-4) with staggered animation
          projects.slice(0, 4).forEach((project, index) => {
            const number = index + 1
            // Use project name or fallback to path if name is not available
            const displayName =
              project.name ||
              project.path?.split('/').pop() ||
              `Project ${number}`
            console.log(
              `[TerminalContext] Adding project ${number}: ${displayName}`
            )

            // Stagger project line animations
            setTimeout(
              () => {
                this.addLine(`[${number}] ${displayName}`, 'system')
              },
              (messages.length + index) * 20
            ) // 20ms delay - much faster
          })

          // No need to add [esc] Back here since it's already at the top
        } catch (error) {
          console.error(
            '[TerminalContext] Failed to load projects for messages:',
            error
          )
          setTimeout(() => {
            this.addLine('[1-4] Recent projects (unavailable)', 'system')
          }, messages.length * 20) // 20ms delay - much faster
        }
      } else {
        setTimeout(() => {
          this.addLine('[1-4] Recent projects (loading...)', 'system')
        }, messages.length * 20) // 20ms delay - much faster
      }
    } finally {
      // Clear loading flag after all messages are scheduled
      setTimeout(() => {
        this._isLoadingProjects = false
      }, 200) // Reduced from 1000ms to 200ms
    }
  }

  /**
   * Deactivates this terminal context.
   *
   * @public
   */
  deactivate(): void {
    console.log(
      `[TerminalContext] Deactivating context for step: ${this._state.step}`
    )

    this._state.isActive = false
    this._state.isWaitingForInput = true // Keep cursor visible even when deactivated
    this._state.currentInput = ''
    this._isLoadingMessages = false
    // Keep lines and messages cached for smooth reactivation
    // Don't clear anything - maintain state for when we come back
    console.log(
      '[TerminalContext] Context deactivated but state preserved for reactivation'
    )
  }

  /**
   * Executes a command if it exists for this context.
   *
   * @param command - Command to execute
   * @public
   */
  executeCommand(command: string): void {
    if (this._state.isTypingLine || !this._state.isActive) return

    // Prevent duplicate command execution within 100ms
    const now = Date.now()
    if (command === this._lastCommand && now - this._lastCommandTime < 100) {
      console.log(
        '[TerminalContext] Ignoring duplicate command within 100ms:',
        command
      )
      return
    }

    this._lastCommand = command
    this._lastCommandTime = now

    const normalizedCommand = command.toLowerCase().trim()

    // Add to history if not empty
    if (command.trim() && !this._state.commandHistory.includes(command)) {
      this._state.commandHistory.unshift(command)
      if (this._state.commandHistory.length > 20) {
        this._state.commandHistory = this._state.commandHistory.slice(0, 20)
      }
    }
    this._state.historyIndex = -1

    // Don't show command input for single-character navigation commands to keep terminal clean
    const silentCommands = [
      'h',
      'back',
      'esc',
      'enter',
      '1',
      '2',
      '3',
      '4',
      '5',
      'o',
      'n',
      'b',
    ]
    const shouldShowCommand = !silentCommands.includes(normalizedCommand)

    if (shouldShowCommand) {
      this.addLine(`$ ${command}`, 'input')
    }

    // Debug logging
    console.log(
      `[TerminalContext] Executing command: "${command}" in step: "${this._state.step}"`
    )
    console.log(
      '[TerminalContext] Available commands:',
      Object.keys(this._commands)
    )
    console.log(
      '[TerminalContext] Looking for command:',
      normalizedCommand,
      'exists?',
      normalizedCommand in this._commands
    )

    // Execute command
    const commandDef = this._commands[normalizedCommand]

    if (commandDef) {
      console.log(
        '[TerminalContext] Found command definition, executing action...'
      )
      // Execute the command
      const result = commandDef.action()

      // Handle async commands
      if (result instanceof Promise) {
        result.catch((error) => {
          console.error(`[TerminalContext] Command "${command}" failed:`, error)
          this.addLine(`> Error executing command: ${error.message}`, 'error')
        })
      }

      // Auto-hide if specified
      if (commandDef.autoHideAfterExecution) {
        this._state.shouldAutoHide = true
        setTimeout(() => {
          this.deactivate()
        }, 500) // Reduced delay for faster response
      }
    } else {
      this.addLine(
        `> Command '${command}' not found. Type 'help' for available commands.`,
        'error'
      )
    }

    this._state.currentInput = ''
  }

  /**
   * Adds a line to the terminal display.
   *
   * @param text - Text to add
   * @param type - Type of line for styling
   * @public
   */
  addLine(text: string, type: TerminalLine['type'] = 'system'): void {
    this._state.lines.push({
      id: `line-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      text,
      isTyping: false,
      type,
      timestamp: Date.now(),
    })

    // Auto-scroll after adding line with slight delay for animation
    setTimeout(() => {
      // Scroll to bottom if terminal body exists
      if (typeof window !== 'undefined') {
        const terminalBody = document.querySelector(
          '.terminal-body'
        ) as HTMLElement
        if (terminalBody) {
          terminalBody.scrollTop = terminalBody.scrollHeight
        }
      }
    }, 100)
  }

  /**
   * Clears all terminal lines.
   *
   * @public
   */
  clear(): void {
    this._state.lines = []
  }

  /**
   * Shows help information for this context.
   *
   * @public
   */
  showHelp(): void {
    this.addLine('Available commands:', 'system')

    Object.entries(this._commands).forEach(([key, command]) => {
      this.addLine(`[${key}] ${command.description}`, 'system')
    })

    this.addLine('Use arrow keys to navigate command history', 'system')
  }

  /**
   * Handles keyboard commands (Arrow keys, Enter, Escape, etc.).
   *
   * @param command - The keyboard command
   * @public
   */
  handleKeyboardCommand(command: string): void {
    if (!this._state.isActive) return

    console.log('[TerminalContext] Received keyboard command:', command)
    switch (command) {
      case 'ArrowUp':
        if (this._state.historyIndex < this._state.commandHistory.length - 1) {
          this._state.historyIndex++
          this._state.currentInput =
            this._state.commandHistory[this._state.historyIndex] || ''
          this._state.cursorPosition = this._state.currentInput.length
        }
        break

      case 'ArrowDown':
        if (this._state.historyIndex > 0) {
          this._state.historyIndex--
          this._state.currentInput =
            this._state.commandHistory[this._state.historyIndex] || ''
          this._state.cursorPosition = this._state.currentInput.length
        } else if (this._state.historyIndex === 0) {
          this._state.historyIndex = -1
          this._state.currentInput = ''
          this._state.cursorPosition = 0
        }
        break

      case 'ArrowLeft':
        // For task-detail step, let the bridge handle cursor movement
        if (this._state.step === 'task-detail') {
          const bridge = window.terminalInputBridge
          if (bridge) {
            const handled = bridge.handleCharacter('ArrowLeft')
            if (handled) {
              const { cursor: newCursor } = bridge.getRawInput()
              this._state.cursorPosition = newCursor
            }
          }
        } else {
          // Normal arrow handling for other steps
          if (this._state.cursorPosition > 0) {
            this._state.cursorPosition--
          }
        }
        break

      case 'ArrowRight':
        // For task-detail step, let the bridge handle cursor movement
        if (this._state.step === 'task-detail') {
          const bridge = window.terminalInputBridge
          if (bridge) {
            const handled = bridge.handleCharacter('ArrowRight')
            if (handled) {
              const { cursor: newCursor } = bridge.getRawInput()
              this._state.cursorPosition = newCursor
            }
          }
        } else {
          // Normal arrow handling for other steps
          if (this._state.cursorPosition < this._state.currentInput.length) {
            this._state.cursorPosition++
          }
        }
        break

      case 'Home':
        // For task-detail step, let the bridge handle cursor movement
        if (this._state.step === 'task-detail') {
          const bridge = window.terminalInputBridge
          if (bridge) {
            const handled = bridge.handleCharacter('Home')
            if (handled) {
              const { cursor: newCursor } = bridge.getRawInput()
              this._state.cursorPosition = newCursor
            }
          }
        } else {
          this._state.cursorPosition = 0
        }
        break

      case 'End':
        // For task-detail step, let the bridge handle cursor movement
        if (this._state.step === 'task-detail') {
          const bridge = window.terminalInputBridge
          if (bridge) {
            const handled = bridge.handleCharacter('End')
            if (handled) {
              const { cursor: newCursor } = bridge.getRawInput()
              this._state.cursorPosition = newCursor
            }
          }
        } else {
          this._state.cursorPosition = this._state.currentInput.length
        }
        break

      case 'Enter':
        // Special handling for task-detail step
        if (this._state.step === 'task-detail') {
          // In task-detail, Enter should proceed to next step if input is valid
          // The actual validation and navigation is handled by the Enter command
          this.executeCommand('Enter')
        } else {
          // Normal behavior for other steps
          if (this._state.currentInput.trim()) {
            this.executeCommand(this._state.currentInput.trim())
          } else {
            // Handle empty Enter - some contexts may have specific behavior
            this.executeCommand('Enter')
          }
        }
        break

      case 'Backspace':
        // For task-detail step, let the bridge handle backspace
        if (this._state.step === 'task-detail') {
          // Import the bridge
          const bridge = window.terminalInputBridge
          if (bridge) {
            // Let the bridge handle backspace
            const handled = bridge.handleCharacter('Backspace')
            if (handled) {
              // Get updated state from bridge
              const { input: newInput, cursor: newCursor } =
                bridge.getRawInput()
              // Update our internal state to match bridge
              this._state.currentInput = newInput
              this._state.cursorPosition = newCursor
            }
          }
        } else {
          // Normal backspace handling for other steps
          if (this._state.cursorPosition > 0) {
            // Remove character before cursor
            this._state.currentInput =
              this._state.currentInput.slice(
                0,
                this._state.cursorPosition - 1
              ) + this._state.currentInput.slice(this._state.cursorPosition)
            this._state.cursorPosition--
          }
        }
        break

      case 'Delete':
        // For task-detail step, let the bridge handle delete
        if (this._state.step === 'task-detail') {
          // Import the bridge
          const bridge = window.terminalInputBridge
          if (bridge) {
            // Let the bridge handle delete
            const handled = bridge.handleCharacter('Delete')
            if (handled) {
              // Get updated state from bridge
              const { input: newInput, cursor: newCursor } =
                bridge.getRawInput()
              // Update our internal state to match bridge
              this._state.currentInput = newInput
              this._state.cursorPosition = newCursor
            }
          }
        } else {
          // Normal delete handling for other steps
          if (this._state.cursorPosition < this._state.currentInput.length) {
            // Remove character at cursor
            this._state.currentInput =
              this._state.currentInput.slice(0, this._state.cursorPosition) +
              this._state.currentInput.slice(this._state.cursorPosition + 1)
          }
        }
        break

      case 'Escape':
        // Handle ESC key - execute the 'esc' command
        console.log('[TerminalContext] ESC key pressed, executing esc command')
        // Clear any input to prevent it from showing in the next context
        this._state.currentInput = ''
        this._state.cursorPosition = 0
        this.executeCommand('esc')
        break
    }
  }

  /**
   * Handles character input from user.
   *
   * @param char - The character input
   * @public
   */
  handleCharacterInput(char: string): void {
    if (!this._state.isActive) {
      console.log('[TerminalContext] Ignoring input - context not active')
      return
    }

    console.log(
      `[TerminalContext] handleCharacterInput: "${char}" in step ${this._state.step}`
    )

    // Check if we're in search mode - if so, always add to input, never execute commands
    const isInSearchMode = window.isTerminalSearchMode
    if (isInSearchMode) {
      console.log(
        '[TerminalContext] In search mode - adding character to input'
      )
      // In search mode, always add characters to input, never execute commands
      this._state.currentInput =
        this._state.currentInput.slice(0, this._state.cursorPosition) +
        char +
        this._state.currentInput.slice(this._state.cursorPosition)
      this._state.cursorPosition++
      return
    }

    // Use strategy-specific character handling if available
    if (this._strategy.handleCharacterInput) {
      const handled = this._strategy.handleCharacterInput(char, this)
      if (handled) {
        console.log('[TerminalContext] Character handled by strategy')
        return
      }
    }

    // Default character handling
    // For single-character commands, don't add to input, just execute
    const commands = this._commands
    const lowerChar = char.toLowerCase()

    console.log(`[TerminalContext] Checking for command: "${lowerChar}"`)
    console.log('[TerminalContext] Available commands:', Object.keys(commands))

    if (commands[lowerChar]) {
      console.log(`[TerminalContext] Executing command: "${lowerChar}"`)
      // Clear input and execute immediately for instant response
      this._state.currentInput = ''
      this._state.cursorPosition = 0
      this.executeCommand(lowerChar)
    } else {
      console.log(
        `[TerminalContext] No command found for: "${lowerChar}", adding to input`
      )
      // Only add to input if it's not a command
      // Insert character at cursor position
      this._state.currentInput =
        this._state.currentInput.slice(0, this._state.cursorPosition) +
        char +
        this._state.currentInput.slice(this._state.cursorPosition)
      this._state.cursorPosition++
    }
  }

  /**
   * Updates the current input value.
   *
   * @param input - New input value
   * @public
   */
  updateInput(input: string): void {
    this._state.currentInput = input
    this._state.cursorPosition = input.length
  }

  /**
   * Updates terminal messages dynamically.
   *
   * @param messages - New messages to display
   * @param preserveInput - Whether to preserve current input state
   * @public
   */
  updateMessages(messages: string[], preserveInput: boolean = false): void {
    console.log(
      `[TerminalContext] Updating messages for step: ${this._state.step}`,
      messages,
      'preserveInput:',
      preserveInput
    )

    // For task-selector, clear any invalid accumulated input unless in search mode
    if (this._state.step === 'task-selector' && !preserveInput) {
      const isInSearchMode = window.isTerminalSearchMode
      if (!isInSearchMode && this._state.currentInput) {
        console.log(
          '[TerminalContext] Clearing invalid input in task-selector:',
          this._state.currentInput
        )
        this._state.currentInput = ''
        this._state.cursorPosition = 0
      }
    }

    // Save input state if preserving
    const savedInput = preserveInput ? this._state.currentInput : ''
    const savedCursor = preserveInput ? this._state.cursorPosition : 0

    // Smart update: only update lines that actually changed
    const currentLines = this._state.lines.map((line) => line.text)
    const hasChanges =
      messages.length !== currentLines.length ||
      messages.some((msg, i) => msg !== currentLines[i])

    // Only update if there are actual changes
    if (hasChanges) {
      // Clear existing lines
      this._state.lines = []

      // Add new messages without delay for instant update
      messages.forEach((message) => {
        this._state.lines.push({
          id: `line-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          text: message,
          type: 'system',
          isTyping: false,
          timestamp: Date.now(),
        })
      })
    }

    // Mark messages as loaded to prevent re-loading
    this._messagesLoaded = true

    // Restore input state if preserving
    if (preserveInput) {
      this._state.currentInput = savedInput
      this._state.cursorPosition = savedCursor
    } else {
      // Always keep input prompt active to show cursor
      this._state.isWaitingForInput = true
      if (this._state.step === 'task-selector') {
        this._state.currentInput = ''
      }
    }
  }

  /**
   * Forces a refresh of the terminal messages.
   * Useful when underlying data has changed.
   *
   * @param preserveInput - Whether to preserve current input state
   * @public
   */
  refreshMessages(preserveInput: boolean = false): void {
    console.log(
      `[TerminalContext] Forcing refresh of messages for step: ${this._state.step}`,
      'preserveInput:',
      preserveInput
    )

    // Save input state if preserving
    const savedInput = preserveInput ? this._state.currentInput : ''
    const savedCursor = preserveInput ? this._state.cursorPosition : 0

    this._messagesLoaded = false
    this.clear()

    if (this._state.isActive) {
      // Re-activate to load fresh messages
      this._state.isActive = false
      this.activate()

      // Restore input state if preserving
      if (preserveInput) {
        this._state.currentInput = savedInput
        this._state.cursorPosition = savedCursor
      }
    }
  }

  /**
   * Disposes of this context and cleans up resources.
   *
   * @public
   */
  dispose(): void {
    console.log(
      `[TerminalContext] Disposing context for step: ${this._state.step}`
    )
    this.deactivate()
    this.clear()
    this._messagesLoaded = false
  }
}

/**
 * Factory for creating step-specific terminal contexts.
 *
 * @class TerminalContextFactory
 * @public
 */
export class TerminalContextFactory {
  private contextCache = new Map<OnboardingStep, TerminalContext>()

  /**
   * Creates a terminal context for the specified onboarding step.
   *
   * @param step - The onboarding step
   * @param onboardingAPI - API for onboarding operations
   * @returns A terminal context for the step
   * @public
   */
  createContext(
    step: OnboardingStep,
    onboardingAPI: OnboardingAPI
  ): TerminalContext {
    // Return cached context if available
    if (this.contextCache.has(step)) {
      const cachedContext = this.contextCache.get(step)!
      console.log(
        `[TerminalContextFactory] Returning cached context for step: ${step}`
      )
      return cachedContext
    }

    // Create new context based on step
    const context = this.createStepSpecificContext(step, onboardingAPI)

    // Cache the context
    this.contextCache.set(step, context)

    console.log(
      `[TerminalContextFactory] Created new context for step: ${step}`
    )
    return context
  }

  /**
   * Gets a cached context if it exists.
   *
   * @param step - The onboarding step
   * @returns The cached context or undefined if not found
   * @public
   */
  getCachedContext(step: OnboardingStep): TerminalContext | undefined {
    return this.contextCache.get(step)
  }

  /**
   * Clears the context cache and disposes all contexts.
   *
   * @public
   */
  clearCache(): void {
    console.log('[TerminalContextFactory] Clearing context cache')

    this.contextCache.forEach((context) => {
      context.dispose()
    })

    this.contextCache.clear()
  }

  /**
   * Removes a specific context from cache.
   *
   * @param step - The step to remove from cache
   * @public
   */
  removeFromCache(step: OnboardingStep): void {
    const context = this.contextCache.get(step)
    if (context) {
      context.dispose()
      this.contextCache.delete(step)
      console.log(
        `[TerminalContextFactory] Removed context for step: ${step} from cache`
      )
    }
  }

  /**
   * Creates step-specific terminal context with appropriate commands and messages.
   *
   * @param step - The onboarding step
   * @param onboardingAPI - API for onboarding operations
   * @returns A configured terminal context
   * @private
   */
  private createStepSpecificContext(
    step: OnboardingStep,
    onboardingAPI: OnboardingAPI
  ): TerminalContext {
    const strategy = TerminalStrategies.getStrategy(step, onboardingAPI)
    return new BaseTerminalContext(step, onboardingAPI, strategy)
  }
}
