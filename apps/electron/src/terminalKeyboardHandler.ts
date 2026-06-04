/**
 * @fileoverview Terminal keyboard handler for Electron main process.
 *
 * @description
 * Manages terminal Easter Egg keyboard shortcuts using Electron's native APIs.
 * Uses before-input-event for better control and no interference with system shortcuts.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import { BrowserWindow, WebContents } from 'electron'

/**
 * Available onboarding steps for terminal navigation.
 *
 * @public
 */
type OnboardingStep =
  | 'welcome'
  | 'project-selection'
  | 'task-selector'
  | 'task-selection'
  | 'branch-creation'
  | 'task-detail'
  | 'transition'
  | 'completed'

/**
 * Interface for terminal keyboard handler configuration.
 *
 * @interface TerminalKeyboardConfig
 * @public
 */
interface TerminalKeyboardConfig {
  /** Whether the terminal has been activated by the user */
  hasBeenActivated: boolean
  /** Current onboarding step */
  currentStep: OnboardingStep
  /** Whether the terminal is currently visible */
  isVisible: boolean
}

/**
 * Terminal keyboard handler class for managing shortcuts in main process.
 *
 * @class TerminalKeyboardHandler
 * @public
 */
export class TerminalKeyboardHandler {
  private config: TerminalKeyboardConfig = {
    hasBeenActivated: false,
    currentStep: 'welcome',
    isVisible: false,
  }

  private isEasterEggActuallyVisible = false // Track actual UI visibility

  private webContents: WebContents | null = null
  private lastKeyTime = 0
  private lastKey = ''
  private readonly KEY_DEBOUNCE_MS = 100 // Increased debounce time
  private keyEventTracker = new Map<string, number>() // Track keys with timestamps
  private pendingTimeouts: Set<NodeJS.Timeout> = new Set() // Track pending timeouts
  private isInitialized = false // Track initialization state
  private _persistentHandler?: (
    event: Electron.Event,
    input: Electron.Input
  ) => void // Persistent keyboard event handler reference
  private _lastDebugKey?: string // Track last debug key to prevent duplicates

  /**
   * Initializes the terminal keyboard handler.
   *
   * @param window - The BrowserWindow to attach keyboard handling to
   * @public
   */
  initialize(window: BrowserWindow): void {
    // Only initialize once - maintain persistent listener
    if (this.isInitialized) {
      // Update webContents reference if it changed
      if (this.webContents !== window.webContents) {
        this.webContents = window.webContents
      }
      return
    }

    this.webContents = window.webContents
    this.isInitialized = true
    this.setupPersistentKeyboardHandling()
  }

  /**
   * Clears all pending timeouts to prevent stale commands.
   *
   * @private
   */
  private clearPendingTimeouts(): void {
    if (this.pendingTimeouts.size > 0) {
      this.pendingTimeouts.forEach((timeout) => clearTimeout(timeout))
      this.pendingTimeouts.clear()
    }
  }

  /**
   * Updates the current onboarding step.
   *
   * @param step - The new onboarding step
   * @public
   */
  updateStep(step: OnboardingStep): void {
    // Clear any pending timeouts before changing step
    this.clearPendingTimeouts()

    this.config.currentStep = step

    // Handle terminal visibility based on step changes
    this.handleStepChange(step)
  }

  /**
   * Updates terminal visibility state.
   *
   * @param isVisible - Whether the terminal is visible
   * @public
   */
  updateVisibility(isVisible: boolean): void {
    this.config.isVisible = isVisible
    // When terminal is hidden via UI interaction, also clear the activation flag
    // This prevents automatic reactivation in subsequent steps
    if (!isVisible) {
      this.config.hasBeenActivated = false
      console.log(
        `[TerminalKeyboardHandler] Visibility: ${isVisible}, cleared hasBeenActivated flag`
      )
    } else {
      console.log(`[TerminalKeyboardHandler] Visibility: ${isVisible}`)
    }
  }

  /**
   * Updates the actual easter egg UI visibility state.
   *
   * @param isActuallyVisible - Whether the terminal easter egg UI is actually visible on screen
   * @public
   */
  updateEasterEggVisibility(isActuallyVisible: boolean): void {
    this.isEasterEggActuallyVisible = isActuallyVisible
    console.log(
      `[TerminalKeyboardHandler] Easter Egg UI Visibility updated: ${isActuallyVisible}, step: ${this.config.currentStep}`
    )
  }

  /**
   * Sets up persistent keyboard event handling that stays active throughout onboarding.
   *
   * @private
   */
  private setupPersistentKeyboardHandling(): void {
    if (!this.webContents) return

    console.log(
      '[TerminalKeyboardHandler] Setting up PERSISTENT keyboard handling'
    )

    // Check for existing listeners
    const existingCount = this.webContents.listenerCount('before-input-event')
    if (existingCount > 0) {
      this.webContents.removeAllListeners('before-input-event')
    }

    // Also remove any existing input-event listeners for arrow keys
    const inputEventCount = this.webContents.listenerCount('input-event')
    if (inputEventCount > 0) {
      this.webContents.removeAllListeners('input-event')
    }

    // Create handlers for both event types
    const handleBeforeInputEvent = (
      event: Electron.Event,
      input: Electron.Input
    ) => {
      // IMMEDIATE ARROW KEY HANDLING - BEFORE ANYTHING ELSE
      // This ensures arrow keys are always sent to renderer in task-detail
      // BUT ONLY when easter egg is actually visible
      if (
        input.type === 'keyDown' &&
        ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(
          input.key
        ) &&
        this.isEasterEggActuallyVisible &&
        this.config.currentStep === 'task-detail'
      ) {
        event.preventDefault()
        this.webContents?.send('terminal-command', {
          command: input.key,
          step: this.config.currentStep,
        })
        return // STOP HERE - arrow key handled
      }

      // Allow Electron system shortcuts to pass through
      const isSystemShortcut =
        (input.control || input.meta) &&
        [
          'r',
          'q',
          'w',
          'i',
          'a',
          'x',
          'c',
          'v',
          'z',
          'y',
          'n',
          't',
          's',
        ].includes(input.key.toLowerCase())

      if (isSystemShortcut) {
        return // Let Electron handle system shortcuts
      }

      this.handleKeyboardInput(event, input)
    }

    // Store the handler reference but DON'T remove it on cleanup
    this._persistentHandler = handleBeforeInputEvent

    this.webContents.on('before-input-event', handleBeforeInputEvent)

    // EXPERIMENTAL: Try using DOM keydown events from renderer instead
    // Since before-input-event doesn't capture arrow keys, let's add a fallback
    // that listens for IPC messages from the renderer
    console.log(
      `[TerminalKeyboardHandler] Setting up renderer keyboard event handling`
    )

    // We'll add the IPC listener in setupRendererKeyboardHandling method

    // DEBUG: Test that handler is actually registered
    console.log(
      `[TerminalKeyboardHandler] DEBUG: Handler function created and registered`
    )
    // Listener is now registered
  }

  /**
   * Handles keyboard input events.
   *
   * @param event - The keyboard event
   * @param input - Input details from before-input-event
   * @private
   */
  private handleKeyboardInput(
    event: Electron.Event,
    input: Electron.Input
  ): void {
    // CRITICAL FIX: Don't process any keyboard events after onboarding is completed
    // This prevents the Easter Egg handler from interfering with regular terminal usage
    if (this.config.currentStep === 'completed') {
      return // Exit early - onboarding is done, don't process any keys
    }

    const { key, control, meta, type } = input

    // Only handle keyDown events, ignore keyUp and other types
    if (type !== 'keyDown') {
      // Prevent default for all non-keyDown events when easter egg is actually visible
      if (this.isEasterEggActuallyVisible) {
        event.preventDefault()
      }
      return
    }

    // Debug logging for task-detail step
    if (this.config.currentStep === 'task-detail') {
      console.log(
        `[TerminalKeyboardHandler] task-detail: key="${key}", isEasterEggActuallyVisible=${this.isEasterEggActuallyVisible}, isVisible=${this.config.isVisible}, hasBeenActivated=${this.config.hasBeenActivated}`
      )
    }

    // Debug: Check if this is a duplicate call
    const debugKey = `debug-${key}-${Date.now()}`
    if (this._lastDebugKey === debugKey) {
      return
    }
    this._lastDebugKey = debugKey

    // Handle 'h' key in welcome step
    if (
      key.toLowerCase() === 'h' &&
      this.config.currentStep === 'welcome' &&
      !control &&
      !meta
    ) {
      event.preventDefault()

      // Debounce the 'h' key as well to prevent multiple triggers
      const now = Date.now()
      const keyId = `h-${this.config.currentStep}`
      const lastTime = this.keyEventTracker.get(keyId) || 0

      if (now - lastTime < this.KEY_DEBOUNCE_MS) {
        return
      }

      this.keyEventTracker.set(keyId, now)

      if (!this.config.hasBeenActivated) {
        // First time activation - show terminal and send 'h' command
        this.activateTerminal()
        // Send 'h' command after activation with current step captured
        const currentStep = this.config.currentStep // Capture current step
        const timeout = setTimeout(() => {
          // Remove this timeout from tracking
          this.pendingTimeouts.delete(timeout)
          // Only send if still in welcome step (double-check)
          if (
            this.config.currentStep === 'welcome' &&
            currentStep === 'welcome'
          ) {
            this.webContents?.send('terminal-input', {
              char: 'h',
              step: 'welcome',
            })
          }
        }, 100)
        // Track this timeout
        this.pendingTimeouts.add(timeout)
      } else if (this.config.isVisible) {
        // Terminal already visible and activated - just send the 'h' command
        this.webContents?.send('terminal-input', {
          char: 'h',
          step: this.config.currentStep,
        })
      }
      return
    }

    // SPECIAL HANDLING FOR ARROW KEYS IN TASK-DETAIL
    // Arrow keys need special handling because they're navigation commands
    // BUT ONLY when easter egg is actually visible
    if (
      [
        'ArrowLeft',
        'ArrowRight',
        'ArrowUp',
        'ArrowDown',
        'Home',
        'End',
      ].includes(key) &&
      this.isEasterEggActuallyVisible &&
      this.config.currentStep === 'task-detail'
    ) {
      event.preventDefault()
      console.log(
        `[TerminalKeyboardHandler] Sending arrow/navigation key directly: "${key}" for step: ${this.config.currentStep}`
      )

      // Send arrow keys as terminal-command (not terminal-input)
      this.webContents?.send('terminal-command', {
        command: key,
        step: this.config.currentStep,
      })
      return
    }

    // Special handling for project-selection - allow keyboard shortcuts even when terminal is hidden
    if (this.config.currentStep === 'project-selection') {
      // Project selection shortcuts: o (open), 1-5 (recent projects), esc (back)
      const projectSelectionKeys = ['o', '1', '2', '3', '4', '5', 'Escape']
      const isProjectSelectionKey =
        projectSelectionKeys.includes(key) ||
        (key.length === 1 && projectSelectionKeys.includes(key.toLowerCase()))

      if (isProjectSelectionKey) {
        console.log(
          `[TerminalKeyboardHandler] Project selection shortcut: "${key}" (terminal visible: ${this.isEasterEggActuallyVisible})`
        )
        // Always handle project selection shortcuts
        this.handleTerminalCommands(event, input)
        return
      }
    }

    // Special handling for task-selector - allow keyboard shortcuts even when terminal is hidden
    if (this.config.currentStep === 'task-selector') {
      // Task selector shortcuts: n (new task), b (branch search), 1-5 (recent branches), esc (back)
      const taskSelectorKeys = ['n', 'b', '1', '2', '3', '4', '5', 'Escape']
      const isTaskSelectorKey =
        taskSelectorKeys.includes(key) ||
        (key.length === 1 && taskSelectorKeys.includes(key.toLowerCase()))

      if (isTaskSelectorKey) {
        console.log(
          `[TerminalKeyboardHandler] Task selector shortcut: "${key}" (terminal visible: ${this.isEasterEggActuallyVisible})`
        )
        // Always handle task selector shortcuts
        this.handleTerminalCommands(event, input)
        return
      }
    }

    // For task-detail step, allow ALL input to flow through to terminal
    // The terminal strategy will handle updating the UI via the bridge
    // CRITICAL FIX: Ensure ALL keyboard input (including normal characters)
    // is sent to terminal in task-detail step so user can type task names
    if (
      this.config.currentStep === 'task-detail' &&
      this.isEasterEggActuallyVisible
    ) {
      console.log(
        `[TerminalKeyboardHandler] Task-detail step - processing all input through terminal: "${key}"`
      )
      this.handleTerminalCommands(event, input)
      return // IMPORTANT: Return to prevent duplicate calls to handleTerminalCommands
    } else if (this.isEasterEggActuallyVisible) {
      // For other steps, handle terminal commands normally when visible
      console.log(
        `[TerminalKeyboardHandler] Calling handleTerminalCommands for key: "${key}" - Easter Egg is visible`
      )
      this.handleTerminalCommands(event, input)
    } else {
      console.log(
        `[TerminalKeyboardHandler] NOT calling handleTerminalCommands - Easter Egg not visible on screen for key: "${key}"`
      )
    }
  }

  /**
   * Activates the terminal Easter Egg.
   *
   * @private
   */
  private activateTerminal(): void {
    this.config.hasBeenActivated = true
    this.config.isVisible = true

    console.log('[TerminalKeyboardHandler] Terminal activated with "h" key')
    console.log(
      `[TerminalKeyboardHandler] State after activation: hasBeenActivated=${this.config.hasBeenActivated}, isVisible=${this.config.isVisible}`
    )

    // Send activation event to renderer
    this.webContents?.send('terminal-activate', {
      step: this.config.currentStep,
      hasBeenActivated: this.config.hasBeenActivated,
    })
  }

  /**
   * Handles terminal-specific commands.
   *
   * @param event - The keyboard event
   * @param input - Input details
   * @private
   */
  private handleTerminalCommands(
    event: Electron.Event,
    input: Electron.Input
  ): void {
    const { key, control, meta } = input

    // DEBUG: Log when this method is called
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(key)) {
      console.log(
        `[TerminalKeyboardHandler] DEBUG: handleTerminalCommands called for arrow key: "${key}"`
      )
    }

    // Ignore modified keys for terminal commands
    if (control || meta) return

    // Handle navigation keys immediately without debouncing
    // Arrow keys, Home, End need to be responsive for cursor movement
    // BUT ONLY when the easter egg is actually visible!
    if (
      [
        'ArrowUp',
        'ArrowDown',
        'ArrowLeft',
        'ArrowRight',
        'Home',
        'End',
        'Delete',
      ].includes(key)
    ) {
      // Only prevent default and handle if easter egg is actually visible
      if (this.isEasterEggActuallyVisible) {
        event.preventDefault()
        console.log(
          `[TerminalKeyboardHandler] Sending navigation command: "${key}" for step: ${this.config.currentStep}`
        )
        this.webContents?.send('terminal-command', {
          command: key,
          step: this.config.currentStep,
        })
      }
      return
    }

    // Enhanced duplicate key prevention with per-key tracking (for non-navigation keys)
    const now = Date.now()
    const keyId = `${key}-${this.config.currentStep}` // Track key per step
    const lastTime = this.keyEventTracker.get(keyId) || 0

    if (now - lastTime < this.KEY_DEBOUNCE_MS) {
      console.log(
        `[TerminalKeyboardHandler] Ignoring duplicate key: "${key}" in step "${this.config.currentStep}" (${now - lastTime}ms since last)`
      )
      event.preventDefault()
      return
    }

    // Update key tracking
    this.keyEventTracker.set(keyId, now)

    // Clean up old entries to prevent memory leak
    if (this.keyEventTracker.size > 20) {
      const cutoff = now - 1000 // Remove entries older than 1 second
      for (const [k, t] of this.keyEventTracker.entries()) {
        if (t < cutoff) {
          this.keyEventTracker.delete(k)
        }
      }
    }

    switch (key) {
      case 'Escape':
        event.preventDefault()
        // Send Escape as a command, not as character input
        console.log(
          `[TerminalKeyboardHandler] ESC pressed in step: ${this.config.currentStep}`
        )
        this.webContents?.send('terminal-command', {
          command: 'Escape',
          step: this.config.currentStep,
        })
        break

      case 'Enter':
      case 'Backspace':
        event.preventDefault()
        this.webContents?.send('terminal-command', {
          command: key,
          step: this.config.currentStep,
        })
        break

      default:
        // Handle single character commands
        if (key.length === 1) {
          event.preventDefault()

          // Apply the same debouncing for regular characters
          const charKeyId = `char-${key}-${this.config.currentStep}`
          const charLastTime = this.keyEventTracker.get(charKeyId) || 0

          if (now - charLastTime < this.KEY_DEBOUNCE_MS) {
            console.log(
              `[TerminalKeyboardHandler] DEBUG: Ignoring duplicate character: "${key}" (${now - charLastTime}ms since last, debounce: ${this.KEY_DEBOUNCE_MS}ms)`
            )
            console.log(
              `[TerminalKeyboardHandler] DEBUG: Key tracker has ${this.keyEventTracker.size} entries`
            )
            return
          }

          this.keyEventTracker.set(charKeyId, now)

          this.webContents?.send('terminal-input', {
            char: key,
            step: this.config.currentStep,
          })
        }
        break
    }
  }

  /**
   * Hides the terminal.
   *
   * @private
   */
  private hideTerminal(): void {
    this.config.isVisible = false
    this.webContents?.send('terminal-hide')
  }

  /**
   * Handles step changes and terminal visibility logic.
   * Updated to work with the new context-based terminal system.
   *
   * @param newStep - The new step
   * @private
   */
  private handleStepChange(newStep: OnboardingStep): void {
    // Handle step-specific visibility logic
    switch (newStep) {
      case 'welcome':
        if (this.config.hasBeenActivated) {
          // Terminal was previously activated, ALWAYS show it when returning to welcome
          this.config.isVisible = true
          this.webContents?.send('terminal-show', {
            step: newStep,
            hasBeenActivated: this.config.hasBeenActivated,
          })
        } else {
          // First time in welcome, hide terminal (requires manual activation)
          this.config.isVisible = false
          this.webContents?.send('terminal-hide')
        }
        break

      case 'completed':
        // Always hide terminal in completed state
        this.config.isVisible = false
        this.isEasterEggActuallyVisible = false // Reset Easter Egg visibility
        this.config.hasBeenActivated = false // Reset activation state
        this.webContents?.send('terminal-hide')
        console.log(
          '[TerminalKeyboardHandler] Onboarding completed - Easter Egg disabled'
        )
        break

      default: {
        // Check if this step has auto-activation enabled
        const stepsWithAutoActivation = [
          'project-selection',
          'task-selector',
          'task-selection',
          'task-detail',
          'branch-creation',
          'transition',
        ]
        const shouldAutoActivate = stepsWithAutoActivation.includes(newStep)

        console.log(`[TerminalKeyboardHandler] Handling step: ${newStep}`)
        console.log(
          `[TerminalKeyboardHandler] Should auto-activate: ${shouldAutoActivate}`
        )
        console.log(
          `[TerminalKeyboardHandler] Has been activated before: ${this.config.hasBeenActivated}`
        )

        if (this.config.hasBeenActivated || shouldAutoActivate) {
          // Auto-show terminal if previously activated OR step has auto-activation
          this.config.isVisible = true
          console.log(`[TerminalKeyboardHandler] Setting isVisible to true`)
          console.log(
            `[TerminalKeyboardHandler] Sending terminal-show event to renderer`
          )

          this.webContents?.send('terminal-show', {
            step: newStep,
            hasBeenActivated: this.config.hasBeenActivated,
          })

          if (shouldAutoActivate && !this.config.hasBeenActivated) {
            // Mark as activated if auto-activating for the first time
            this.config.hasBeenActivated = true
          }
        } else if (this.config.isVisible) {
          // Just update step for visible terminal
          this.webContents?.send('terminal-step-change', {
            step: newStep,
          })
        }
        break
      }
    }

    // Always send step change notification for context switching
    this.webContents?.send('terminal-step-change', {
      step: newStep,
    })
  }

  /**
   * Cleanup method - only clears state, keeps listener active.
   *
   * @public
   */
  cleanup(): void {
    // Clear all pending timeouts
    this.clearPendingTimeouts()

    // DON'T remove the persistent listener - it stays active
    console.log(
      '[TerminalKeyboardHandler] Cleanup called but keeping persistent listener active'
    )

    // Only clear tracking state
    this.keyEventTracker.clear()
    this.lastKey = ''
    this.lastKeyTime = 0
    // Keep isInitialized true and webContents reference
    console.log(
      '[TerminalKeyboardHandler] State cleared, listener remains active'
    )
  }
}

// Export singleton instance
export const terminalKeyboardHandler = new TerminalKeyboardHandler()
