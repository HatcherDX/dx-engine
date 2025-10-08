/**
 * @fileoverview Terminal Easter Egg composable for onboarding keyboard navigation.
 *
 * @description
 * Provides a terminal-like interface for power users to navigate the onboarding
 * process using keyboard commands. Each step has its own isolated terminal context
 * that appears and disappears as needed, following DRY principles.
 *
 * @example
 * ```typescript
 * const {
 *   terminalState,
 *   isVisible,
 *   initializeTerminal,
 *   executeCommand
 * } = useTerminalEasterEgg()
 * ```
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import { computed, ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useOnboarding, type OnboardingStep } from './useOnboarding'
import {
  TerminalContextFactory,
  type TerminalContext,
  type OnboardingAPI,
} from './terminalContextFactory'
import { TerminalStrategies } from './terminalStrategies'

// Global state for terminal manager
const globalTerminalManager = {
  factory: new TerminalContextFactory(),
  currentContext: ref<TerminalContext | null>(null),
  isVisible: ref(false),
  hasBeenActivated: ref(
    // Persist activation state in sessionStorage
    typeof window !== 'undefined' &&
      window.sessionStorage?.getItem('terminalActivated') === 'true'
  ),
  hasExclusiveFocus: ref(false), // Track if terminal has exclusive focus
  terminalElement: ref<HTMLElement | null>(null), // Reference to terminal DOM element
}

// Global visibility watcher removed - handled in composable instead to avoid conflicts

/**
 * Composable function for terminal Easter Egg functionality.
 *
 * @returns Object containing terminal state and control functions
 * @public
 */
export function useTerminalEasterEgg() {
  const { currentStep, nextStep, previousStep, goToStep, recentProjects } =
    useOnboarding()

  // Create onboarding API for terminal contexts
  const onboardingAPI: OnboardingAPI = {
    nextStep,
    previousStep,
    goToStep,
    recentProjects,
  }

  // Use global terminal manager
  const {
    factory,
    currentContext,
    isVisible,
    hasBeenActivated,
    hasExclusiveFocus,
    terminalElement,
  } = globalTerminalManager

  /**
   * Computed property to check if terminal should be visible.
   * Only show on larger screens to maintain responsive design.
   *
   * @returns {boolean} Whether terminal should be displayed
   * @public
   */
  const isVisibleComputed = computed(() => {
    const windowWidth = window?.innerWidth || 0
    const windowCheck = typeof window === 'undefined' || windowWidth > 768

    // Simplify: just check isVisible and window size
    // The context activation is handled separately
    const result = isVisible.value && windowCheck

    if (isVisible.value) {
      console.log('[Terminal] Visibility computed:', {
        windowWidth,
        windowCheck,
        isVisible: isVisible.value,
        contextActive: currentContext.value?.state?.isActive,
        result,
      })
    }

    return result
  })

  /**
   * Gets or creates a terminal context for the specified step.
   *
   * @param step - The onboarding step
   * @returns Terminal context for the step
   * @private
   */
  function getOrCreateContext(step: OnboardingStep): TerminalContext {
    // Create or get cached context
    return factory.createContext(step, onboardingAPI)
  }

  /**
   * Activates exclusive focus mode for the terminal.
   * When activated, only the terminal can receive keyboard input.
   *
   * @private
   */
  function activateExclusiveFocus(): void {
    hasExclusiveFocus.value = true

    // Focus the terminal element if it exists
    if (terminalElement.value) {
      nextTick(() => {
        // Create a focusable element within the terminal for focus management
        const focusTarget = terminalElement.value?.querySelector(
          '.terminal-focus-target'
        ) as HTMLElement
        if (focusTarget) {
          focusTarget.focus()
        }
      })
    }

    console.log('[Terminal] Exclusive focus activated')
  }

  /**
   * Deactivates exclusive focus mode.
   * Allows other UI elements to receive input again.
   *
   * @public
   */
  function deactivateExclusiveFocus(): void {
    hasExclusiveFocus.value = false
    console.log('[Terminal] Exclusive focus deactivated')
  }

  /**
   * Deactivates exclusive focus and hides the terminal.
   * Used when user clicks on interactive elements.
   *
   * @public
   */
  function deactivateAndHide(): void {
    hasExclusiveFocus.value = false
    isVisible.value = false
    console.log('[Terminal] Exclusive focus deactivated and terminal hidden')
  }

  /**
   * Sets the terminal DOM element reference.
   *
   * @param element - The terminal DOM element
   * @public
   */
  function setTerminalElement(element: HTMLElement | null): void {
    terminalElement.value = element
  }

  /**
   * Activates terminal for the current step.
   *
   * @private
   */
  function activateCurrentStepTerminal(): void {
    const strategy = TerminalStrategies.getStrategy(
      currentStep.value,
      onboardingAPI
    )

    // Check if this step should activate terminal
    // Only activate if:
    // 1. Step has auto-activate enabled (welcome only), OR
    // 2. User has manually activated terminal with 'h' AND step allows it
    if (!strategy.autoActivate && !hasBeenActivated.value) {
      console.log(
        `[Terminal] Skipping activation for ${currentStep.value} - not auto-activate and user hasn't pressed 'h'`
      )
      return
    }

    const context = getOrCreateContext(currentStep.value)

    // Deactivate previous context
    if (currentContext.value && currentContext.value !== context) {
      currentContext.value.deactivate()
    }

    // Activate new context
    currentContext.value = context
    context.activate()
    isVisible.value = true

    // Activate exclusive focus when terminal becomes visible
    // This ensures click detection works properly for UI interaction
    nextTick(() => {
      if (currentStep.value !== 'welcome') {
        activateExclusiveFocus()
      }
    })

    // Explicitly update main process visibility when activating
    if (window.electronAPI && window.electronAPI.terminalEasterEgg) {
      try {
        window.electronAPI.terminalEasterEgg.updateUIVisibility(true)
        console.log(
          '[Terminal] Explicitly notified main process of visibility: true'
        )
      } catch (error) {
        console.warn(
          '[Terminal] Failed to update visibility on activation:',
          error
        )
        window.electronAPI.terminalEasterEgg.visibilityChange(true)
      }
    }

    // Only activate exclusive focus if user has manually activated terminal
    // This prevents blocking system shortcuts before user interaction
    if (hasBeenActivated.value) {
      // Delay exclusive focus to ensure terminal is fully rendered
      nextTick(() => {
        activateExclusiveFocus()
      })
    }

    // Expose context globally for components to access
    if (typeof window !== 'undefined') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Global window extension for context access across components
      ;(window as any).currentContext = context
    }

    console.log(`[Terminal] Activated context for step: ${currentStep.value}`, {
      isVisible: isVisible.value,
      hasLines: context.state.lines.length > 0,
      linesCount: context.state.lines.length,
      contextActive: context.state.isActive,
    })

    // Always activate exclusive focus when terminal becomes visible
    // This ensures click detection works properly
    nextTick(() => {
      activateExclusiveFocus()
    })
  }

  /**
   * Deactivates the current terminal context.
   *
   * @private
   */
  function deactivateTerminal(): void {
    if (currentContext.value) {
      currentContext.value.deactivate()
      currentContext.value = null
    }
    isVisible.value = false

    // Explicitly update main process visibility when deactivating
    if (window.electronAPI && window.electronAPI.terminalEasterEgg) {
      try {
        window.electronAPI.terminalEasterEgg.updateUIVisibility(false)
        console.log(
          '[Terminal] Explicitly notified main process of visibility: false'
        )
      } catch (error) {
        console.warn(
          '[Terminal] Failed to update visibility on deactivation:',
          error
        )
        window.electronAPI.terminalEasterEgg.visibilityChange(false)
      }
    }

    // Deactivate exclusive focus when terminal is hidden
    deactivateExclusiveFocus()

    // Clean up global reference
    if (typeof window !== 'undefined') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Global window extension cleanup for context reference
      ;(window as any).currentContext = null
    }

    console.log('[Terminal] Deactivated terminal')
  }

  /**
   * Executes a command if it exists for the current context.
   *
   * @param command - Command to execute
   * @public
   */
  function executeCommand(command: string): void {
    if (!currentContext.value) {
      console.warn('[Terminal] No active context to execute command')
      return
    }

    currentContext.value.executeCommand(command)
  }

  /**
   * Clears all terminal lines.
   *
   * @public
   */
  function clearTerminal(): void {
    currentContext.value?.clear()
  }

  /**
   * Shows help information for the current context.
   *
   * @public
   */
  function showHelp(): void {
    currentContext.value?.showHelp()
  }

  /**
   * Handles keyboard commands from main process.
   *
   * @param command - The command received from main process
   * @private
   */
  function handleCommandFromMain(command: string): void {
    // Terminal must be visible to process commands
    if (!isVisible.value) {
      return
    }

    // If we're in search mode, dispatch keyboard event for the component
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Global window extension for search mode state
    if ((window as any).isTerminalSearchMode) {
      // Map special commands to key names
      const keyMap: Record<string, string> = {
        Escape: 'Escape',
        Backspace: 'Backspace',
        Enter: 'Enter',
        ArrowUp: 'ArrowUp',
        ArrowDown: 'ArrowDown',
        ArrowLeft: 'ArrowLeft',
        ArrowRight: 'ArrowRight',
        Delete: 'Delete',
      }

      const key = keyMap[command] || command

      // For editing keys, also execute them on the terminal context
      if (
        command === 'Backspace' ||
        command === 'Delete' ||
        command === 'ArrowLeft' ||
        command === 'ArrowRight'
      ) {
        currentContext.value?.handleKeyboardCommand(command)
      }

      const keyEvent = new KeyboardEvent('keydown', {
        key: key,
        code:
          key === 'Escape'
            ? 'Escape'
            : key === 'Backspace'
              ? 'Backspace'
              : key === 'Enter'
                ? 'Enter'
                : `Key${key.toUpperCase()}`,
        bubbles: true,
        cancelable: true,
      })
      console.log(
        '[Terminal] In search mode, dispatching keyboard command:',
        command
      )
      window.dispatchEvent(keyEvent)
      return
    }

    if (command === 'Escape') {
      if (currentStep.value === 'welcome') {
        // In welcome: just hide terminal
        deactivateTerminal()
        // Notify main process of visibility change
        if (window.electronAPI && window.electronAPI.terminalEasterEgg) {
          window.electronAPI.terminalEasterEgg.visibilityChange(false)
        }
      } else {
        // In other steps: go back but keep terminal visible if activated
        previousStep()
        // Terminal visibility will be maintained by step change watcher
        // Don't notify main process of visibility change since terminal stays visible
      }
      return
    }

    // Delegate to current context
    currentContext.value?.handleKeyboardCommand(command)
  }

  /**
   * Handles character input from main process.
   *
   * @param char - The character received from main process
   * @private
   */
  function handleInputFromMain(char: string): void {
    // Special case: Allow project-selection and task-selector commands even when terminal is hidden
    // This allows keyboard shortcuts to work in the UI
    const isProjectSelection = currentStep.value === 'project-selection'
    const isTaskSelector = currentStep.value === 'task-selector'
    const allowHiddenCommands = isProjectSelection || isTaskSelector

    // Terminal must be visible to process input, except for project-selection and task-selector
    if (!isVisible.value && !allowHiddenCommands) {
      return
    }

    // For project-selection or task-selector, if terminal is hidden, activate it when a command is used
    if (allowHiddenCommands && !isVisible.value) {
      console.log(
        `[Terminal] Activating terminal for ${currentStep.value} command`
      )
      // Activate the terminal to show the command being executed
      activateCurrentStepTerminal()
      // Mark as manually activated since user is using keyboard commands
      hasBeenActivated.value = true
    }

    // Skip 'b' character if we're in task-selector and NOT in search mode yet
    // This means the 'b' is meant to trigger search mode, not be typed
    if (char.toLowerCase() === 'b' && currentStep.value === 'task-selector') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Global window extension for search mode state
      const isInSearchMode = (window as any).isTerminalSearchMode
      if (!isInSearchMode) {
        // The 'b' will trigger search mode via terminal context, don't process as input
        console.log('[Terminal] Processing "b" as command to enter search mode')
        // Let it fall through to handleCharacterInput which will trigger search mode
        currentContext.value?.handleCharacterInput(char)
        return
      }
      // If already in search mode and within 200ms of entering, skip the duplicate 'b'
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Global window extension for search mode timing
      const searchModeEnteredTime = (window as any).searchModeEnteredTime || 0
      const timeSinceSearchMode = Date.now() - searchModeEnteredTime
      if (timeSinceSearchMode < 200) {
        console.log(
          '[Terminal] Skipping duplicate "b" character after entering search mode'
        )
        return
      }
    }

    // If we're in search mode (task-selector step), let terminal handle it normally
    // The standardized input handler will preserve cursor position and state
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Global window extension for search mode state
    if ((window as any).isTerminalSearchMode) {
      // Let the terminal context handle the character normally
      // The input handler in terminalContextFactory will manage state properly
      currentContext.value?.handleCharacterInput(char)

      // Also dispatch a synthetic keyboard event for the component to sync its state
      // Use setTimeout to ensure terminal processes it first
      setTimeout(() => {
        const keyEvent = new KeyboardEvent('keydown', {
          key: char,
          code: `Key${char.toUpperCase()}`,
          bubbles: true,
          cancelable: true,
        })
        console.log('[Terminal] In search mode, dispatching sync event:', char)
        window.dispatchEvent(keyEvent)
      }, 0)
      return
    }

    console.log('[Terminal] Processing input from main:', char)
    // Delegate to current context
    currentContext.value?.handleCharacterInput(char)
  }

  /**
   * Initializes the terminal Easter Egg system.
   *
   * @public
   */
  function initializeTerminal(): void {
    // Don't set hasBeenActivated here - only when user presses 'h'
    activateCurrentStepTerminal()

    console.log('[Terminal] Terminal initialized')
  }

  // Store handler references for cleanup
  let handleManualActivation: (() => void) | null = null
  let handleDeactivateFromUI: (() => void) | null = null
  let handleEnterSearch: ((event: CustomEvent) => void) | null = null
  let handleClearSearch: ((event: CustomEvent) => void) | null = null

  // Lifecycle hooks
  onMounted(() => {
    console.log(
      '[Terminal] Mounted with context system, current step:',
      currentStep.value
    )
    // Initial visibility is sent by the watcher with immediate: true

    // CRITICAL FIX: Always check for existing context and reactivate if terminal was previously activated
    // This ensures contexts work properly when navigating back
    if (hasBeenActivated.value) {
      console.log(
        `[Terminal] Terminal was previously activated, checking for context for step: ${currentStep.value}`
      )

      // Get or create context for current step
      const context = factory.getCachedContext(currentStep.value)

      if (context) {
        console.log(
          `[Terminal] Found cached context for ${currentStep.value}, isActive: ${context.state.isActive}`
        )

        // Deactivate any current context first
        if (currentContext.value && currentContext.value !== context) {
          currentContext.value.deactivate()
        }

        // Always reactivate the context
        context.activate()
        currentContext.value = context

        // Ensure visibility is true
        isVisible.value = true

        // Explicitly notify main process of visibility
        if (window.electronAPI && window.electronAPI.terminalEasterEgg) {
          console.log(
            '[Terminal] Explicitly updating main process visibility to true'
          )
          window.electronAPI.terminalEasterEgg.visibilityChange(true)
        }

        // Ensure exclusive focus is restored after terminal is visible
        nextTick(() => {
          if (currentStep.value !== 'welcome') {
            activateExclusiveFocus()
          }
        })

        console.log(
          `[Terminal] Reactivated context for step: ${currentStep.value}, isActive: ${context.state.isActive}`
        )
      } else if (currentStep.value !== 'completed') {
        // Create new context if none exists and not in completed state
        console.log(
          `[Terminal] No cached context found for ${currentStep.value}, creating new one`
        )
        const newContext = getOrCreateContext(currentStep.value)

        // Deactivate previous context
        if (currentContext.value) {
          currentContext.value.deactivate()
        }

        currentContext.value = newContext
        newContext.activate()
        isVisible.value = true

        // Notify main process
        if (window.electronAPI && window.electronAPI.terminalEasterEgg) {
          window.electronAPI.terminalEasterEgg.visibilityChange(true)
        }

        // Activate exclusive focus
        nextTick(() => {
          if (currentStep.value !== 'welcome') {
            activateExclusiveFocus()
          }
        })
      }
    }

    // Listen for manual activation event from welcome step
    handleManualActivation = () => {
      console.log('[Terminal] User manually activated terminal with h command')
      hasBeenActivated.value = true
      // Persist activation state
      if (typeof window !== 'undefined' && window.sessionStorage) {
        window.sessionStorage.setItem('terminalActivated', 'true')
      }
      // Activate exclusive focus when manually activated with 'h'
      // Add a small delay to ensure terminal is fully rendered
      setTimeout(() => {
        activateExclusiveFocus()
      }, 100)
    }
    window.addEventListener(
      'terminal-manually-activated',
      handleManualActivation
    )

    // Listen for deactivation from UI (any interactive element clicked)
    handleDeactivateFromUI = () => {
      console.log(
        '[Terminal] Deactivating terminal from UI interaction (interactive element clicked)'
      )
      hasBeenActivated.value = false
      // Set a flag to prevent auto-showing in next step
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Global window extension for UI deactivation flag
      ;(window as any).__terminalDeactivatedViaUI = true
      deactivateTerminal()

      // CRITICAL: Notify main process that terminal was deactivated via UI
      // This prevents terminal from reappearing in the next step
      if (window.electronAPI && window.electronAPI.terminalEasterEgg) {
        console.log('[Terminal] Notifying main process of UI deactivation')
        // Send a special visibility update to indicate UI deactivation
        // The main process should interpret visibility:false with this timing as UI deactivation
        try {
          window.electronAPI.terminalEasterEgg.visibilityChange(false)
          // Note: clearActivation method doesn't exist on terminalEasterEgg API
          // The visibility change is sufficient to notify main process
        } catch (error) {
          console.warn(
            '[Terminal] Could not notify main process of UI deactivation:',
            error
          )
        }
      }

      // Clear the terminal activation flag from sessionStorage
      if (typeof window !== 'undefined' && window.sessionStorage) {
        window.sessionStorage.removeItem('terminalActivated')
      }
    }
    window.addEventListener(
      'terminal-deactivate-from-ui',
      handleDeactivateFromUI
    )

    // Listen for branch search mode events
    handleEnterSearch = (event: CustomEvent) => {
      if (event.detail?.step === 'branch-creation') {
        console.log('[Terminal] Entering branch search mode')
        // Clear current input and refresh messages
        if (currentContext.value) {
          currentContext.value.updateInput('')
          // Force refresh messages using the public API
          currentContext.value.refreshMessages(false)
        }
      }
    }
    window.addEventListener(
      'terminal-enter-search',
      handleEnterSearch as EventListener
    )

    handleClearSearch = (event: CustomEvent) => {
      if (event.detail?.step === 'branch-creation') {
        console.log('[Terminal] Clearing branch search mode')
        // Clear the search query
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Global window extension for branch search query state
        ;(window as any).terminalBranchSearchQuery = ''
        // Clear input and refresh messages
        if (currentContext.value) {
          currentContext.value.updateInput('')
          // Force refresh messages using the public API
          currentContext.value.refreshMessages(false)
        }
      }
    }
    window.addEventListener(
      'terminal-clear-search',
      handleClearSearch as EventListener
    )

    // Verify IPC is available
    if (!(window.electronAPI && window.electronAPI.terminalEasterEgg)) {
      console.warn(
        '[Terminal] terminalEasterEgg API not available - terminal will not function'
      )
      return
    }

    // Delay initial activation to ensure everything is properly initialized
    setTimeout(() => {
      // Check if current step should auto-activate
      const strategy = TerminalStrategies.getStrategy(
        currentStep.value,
        onboardingAPI
      )

      if (strategy.autoActivate && currentStep.value === 'welcome') {
        console.log('[Terminal] Auto-activating terminal for welcome step')
        // Don't set hasBeenActivated here - only when user manually activates with 'h'
        activateCurrentStepTerminal()
      } else if (hasBeenActivated.value && strategy.allowManualActivation) {
        console.log(
          `[Terminal] Terminal was previously activated - restoring for step: ${currentStep.value}`
        )
        activateCurrentStepTerminal()
      }
    }, 100)

    // Auto-activation is now handled properly by step change logic and main process events

    // Setup IPC listeners for terminal events from main process
    // CRITICAL: Use global flag to ensure listeners are only registered once
    // This prevents duplicate events when multiple components use this composable
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Global window extension for listener registration tracking
    const globalWindow = window as any

    // Check if listeners are already registered
    if (globalWindow._terminalListenersRegistered) {
      console.log(
        '[Terminal] IPC listeners already registered by another instance, skipping to prevent duplicates'
      )
      // Don't register listeners again, but continue with other setup
    } else if (
      typeof window !== 'undefined' &&
      window.electronAPI &&
      window.electronAPI.terminalEasterEgg
    ) {
      console.log(
        '[Terminal] Registering IPC event listeners (first time only)'
      )
      globalWindow._terminalListenersRegistered = true
      // Listen for terminal activation from main process
      window.electronAPI.terminalEasterEgg.onActivate((data) => {
        console.log('[Terminal] Received activate from main:', data)
        // Only activate if we're not already active
        if (!isVisible.value) {
          // Don't set hasBeenActivated here - only when user presses 'h'
          activateCurrentStepTerminal()
        }
      })

      // Listen for terminal show events
      window.electronAPI.terminalEasterEgg.onShow((data) => {
        console.log('[Terminal] Received terminal-show event from main:', data)

        // Check if terminal was deactivated via UI interaction
        // If so, don't auto-show it in the next step
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Global window extension for UI deactivation flag check
        if ((window as any).__terminalDeactivatedViaUI) {
          console.log(
            '[Terminal] Ignoring show event - terminal was deactivated via UI'
          )
          // Clear the flag for potential manual reactivation later
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Global window extension cleanup for UI deactivation flag
          delete (window as any).__terminalDeactivatedViaUI
          return
        }

        // Check if terminal is already visible to prevent duplicate activation
        if (!isVisible.value) {
          console.log('[Terminal] Activating terminal for current step...')
          activateCurrentStepTerminal()
          console.log('[Terminal] Terminal activation complete')
        } else {
          console.log(
            '[Terminal] Terminal already visible, skipping activation'
          )
        }
      })

      // Listen for terminal hide events
      window.electronAPI.terminalEasterEgg.onHide(() => {
        console.log('[Terminal] Received hide from main')
        deactivateTerminal()
      })

      // Listen for keyboard commands from main process
      window.electronAPI.terminalEasterEgg.onCommand((data) => {
        console.log('[Terminal] Received command from main:', data)
        handleCommandFromMain(data.command)
      })

      // Listen for character input from main process
      window.electronAPI.terminalEasterEgg.onInput((data) => {
        console.log('[Terminal] DEBUG: Received input from main:', {
          char: data.char,
          step: data.step,
          receivedAt: Date.now(),
          listenerRegisteredBy: 'singleton-instance',
        })

        // Track received messages to detect duplicates
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Global window extension for message deduplication tracking
        if (!(window as any)._receivedMessages) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Global window extension for message deduplication tracking
          ;(window as any)._receivedMessages = new Set()
        }

        // Use sendId from data if provided (for testing), otherwise generate timestamp-based ID
        const messageId =
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Message may include optional sendId field for testing
          (data as any).sendId || `${data.char}-${data.step}-${Date.now()}`

        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Global window extension for message deduplication check
        if ((window as any)._receivedMessages.has(messageId)) {
          console.warn(
            '[Terminal] WARNING: Duplicate message received:',
            messageId
          )
          return
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Global window extension for message deduplication tracking
        ;(window as any)._receivedMessages.add(messageId)

        // Clean up old entries (keep last 100)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Global window extension for message deduplication size check
        if ((window as any)._receivedMessages.size > 100) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Global window extension for message deduplication cleanup
          const entries = Array.from((window as any)._receivedMessages)
          entries.slice(0, entries.length - 100).forEach((id) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Global window extension for message deduplication cleanup
            ;(window as any)._receivedMessages.delete(id)
          })
        }

        handleInputFromMain(data.char)
      })

      // Notify main process of current step
      window.electronAPI.terminalEasterEgg.stepChange(currentStep.value)
    }
  })

  onUnmounted(() => {
    // Don't dispose contexts or clear cache - we want to preserve state
    // IMPORTANT: Don't deactivate contexts on unmount - they should stay active
    // The context lifecycle is managed by step changes, not component mounting
    // if (currentContext.value) {
    //   currentContext.value.deactivate()
    // }
    // DON'T call factory.clearCache() - we want to keep contexts alive

    // During step transitions, preserve visibility state
    // Only set visibility to false if the entire app is being destroyed
    console.log(
      '[Terminal] Component unmounting - UI visibility preserved during step transitions'
    )

    // Remove manual activation listener
    if (handleManualActivation) {
      window.removeEventListener(
        'terminal-manually-activated',
        handleManualActivation
      )
    }

    // Remove deactivation listener
    if (handleDeactivateFromUI) {
      window.removeEventListener(
        'terminal-deactivate-from-ui',
        handleDeactivateFromUI
      )
    }

    // Remove search mode listeners
    if (handleEnterSearch) {
      window.removeEventListener(
        'terminal-enter-search',
        handleEnterSearch as EventListener
      )
    }
    if (handleClearSearch) {
      window.removeEventListener(
        'terminal-clear-search',
        handleClearSearch as EventListener
      )
    }

    // Don't remove IPC listeners - they should persist
    // if (
    //   typeof window !== 'undefined' &&
    //   window.electronAPI &&
    //   window.electronAPI.terminalEasterEgg
    // ) {
    //   window.electronAPI.terminalEasterEgg.removeAllListeners()
    // }

    console.log('[Terminal] Component unmounted - contexts preserved for reuse')
  })

  // Debounce timer for visibility updates
  let visibilityUpdateTimer: NodeJS.Timeout | null = null

  // Watch isVisible and notify main process of easter egg visibility with debouncing
  watch(
    isVisible,
    (newValue) => {
      console.log(
        `[Terminal] Easter Egg visibility changed to: ${newValue}, step: ${currentStep.value}`
      )

      // Clear any pending visibility update
      if (visibilityUpdateTimer) {
        clearTimeout(visibilityUpdateTimer)
      }

      // Debounce visibility updates to prevent rapid state changes
      visibilityUpdateTimer = setTimeout(() => {
        // Notify main process of actual UI visibility
        if (window.electronAPI && window.electronAPI.terminalEasterEgg) {
          // Always try to call the function if the API exists
          try {
            window.electronAPI.terminalEasterEgg.updateUIVisibility(newValue)
            console.log(
              `[Terminal] UI visibility updated in main process: ${newValue} (debounced)`
            )
          } catch (error) {
            console.warn('[Terminal] Failed to update UI visibility:', error)
            // Fallback to visibilityChange if updateUIVisibility fails
            window.electronAPI.terminalEasterEgg.visibilityChange(newValue)
          }
        } else {
          console.log('[Terminal] terminalEasterEgg API not available')
        }
      }, 100) // 100ms debounce
    },
    { immediate: true } // Send initial value immediately
  )

  // Watch for step changes and update terminal context
  watch(currentStep, (newStep, oldStep) => {
    // Skip initial watch trigger on mount (when oldStep is undefined)
    if (!oldStep) {
      console.log(
        `[Terminal] Initial step detected: ${newStep} (skipping watch logic)`
      )
      return
    }

    console.log(`[Terminal] Step change: ${oldStep} -> ${newStep}`)

    // Notify main process of step change
    if (window.electronAPI && window.electronAPI.terminalEasterEgg) {
      console.log('[Terminal] Sending step change to main process:', newStep)
      window.electronAPI.terminalEasterEgg.stepChange(newStep)
      console.log('[Terminal] Step change sent successfully')
    } else {
      console.warn('[Terminal] Cannot send step change - API not available')
    }

    // Don't clear cache - keep contexts to preserve terminal history
    // Only clear if explicitly needed for specific steps
    // if (oldStep) {
    //   factory.removeFromCache(oldStep)
    // }

    // Handle terminal context for new step
    const strategy = TerminalStrategies.getStrategy(newStep, onboardingAPI)

    // Check if terminal should activate based on strategy
    if (strategy.autoActivate && newStep === 'welcome') {
      // Auto-activate only for welcome step
      console.log(`[Terminal] Auto-activating terminal in ${newStep}`)
      activateCurrentStepTerminal()
    } else if (hasBeenActivated.value && strategy.allowManualActivation) {
      // Show terminal in subsequent steps if user activated it with 'h'
      console.log(
        `[Terminal] Restoring terminal in ${newStep} (user activated with 'h')`
      )
      // Always activate the terminal when switching steps if it was previously activated
      const context = getOrCreateContext(newStep)
      if (currentContext.value !== context) {
        if (currentContext.value) {
          currentContext.value.deactivate()
        }
        currentContext.value = context
        context.activate()
        // Ensure visibility
        if (!isVisible.value) {
          isVisible.value = true
        }
        // Activate exclusive focus when terminal becomes visible for step changes
        nextTick(() => {
          if (newStep !== 'welcome') {
            activateExclusiveFocus()
          }
        })
      }
    } else {
      // Hide terminal if not manually activated or not welcome
      if (isVisible.value) {
        console.log(
          `[Terminal] Hiding terminal for ${newStep} (user hasn't pressed 'h')`
        )
        deactivateTerminal()
      }
    }
  })

  // Computed terminal state for backward compatibility
  const terminalState = computed(() => {
    if (!currentContext.value) {
      return {
        lines: [] as Array<{
          id: string
          text: string
          isTyping: boolean
          type: 'system' | 'prompt' | 'input' | 'error' | 'success'
        }>,
        currentInput: '',
        cursorPosition: 0,
        isTypingLine: false,
        isWaitingForInput: true, // Always show cursor
        currentStep: currentStep.value,
        commandHistory: [] as string[],
        historyIndex: -1,
      }
    }

    // Get the state directly - no need to copy since we want reactivity
    const state = currentContext.value.state

    // Force reactivity by accessing the length to ensure Vue tracks changes
    const linesLength = state.lines.length

    // Log for debugging
    if (linesLength > 0) {
      console.log(
        '[Terminal] Terminal state computed with',
        linesLength,
        'lines'
      )
    }

    return {
      lines: state.lines, // Return reference directly for proper reactivity
      currentInput: state.currentInput,
      cursorPosition: state.cursorPosition, // Include cursor position for proper movement
      isTypingLine: state.isTypingLine,
      isWaitingForInput: state.isWaitingForInput,
      currentStep: state.step,
      commandHistory: state.commandHistory, // Return reference directly
      historyIndex: state.historyIndex,
    }
  })

  return {
    terminalState,
    isVisible: isVisibleComputed,
    hasExclusiveFocus,
    initializeTerminal,
    executeCommand,
    clearTerminal,
    showHelp,
    setTerminalElement,
    activateExclusiveFocus,
    deactivateExclusiveFocus,
    deactivateAndHide,
  }
}
