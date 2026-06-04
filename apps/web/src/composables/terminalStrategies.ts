/**
 * @fileoverview Terminal strategies for step-specific behaviors and commands.
 *
 * @description
 * Implements the Strategy pattern for terminal contexts, providing step-specific
 * commands, behaviors, and messages. Each strategy defines how the terminal
 * should behave for a particular onboarding step, following DRY principles.
 *
 * @example
 * ```typescript
 * const strategy = TerminalStrategies.getStrategy('welcome', onboardingAPI)
 * const context = new BaseTerminalContext(step, onboardingAPI, strategy.commands, strategy.messages)
 * ```
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import type { OnboardingStep } from './useOnboarding'
import type {
  TerminalCommand,
  OnboardingAPI,
  TerminalContext,
} from './terminalContextFactory'

/**
 * Vue element with internal component reference.
 *
 * @internal
 */
interface VueElement extends Element {
  __vueParentComponent?: {
    emit: (event: string, ...args: unknown[]) => void
    props?: {
      branches?: Array<{ name: string; current: boolean }>
      [key: string]: unknown
    }
  }
}

/**
 * Project metadata for project selection.
 *
 * @public
 */
interface ProjectMetadata {
  name: string
  path?: string
  [key: string]: unknown
}

/**
 * Interface for terminal strategy configuration.
 *
 * @interface TerminalStrategy
 * @public
 */
export interface TerminalStrategy {
  /** Commands available for this step */
  commands: Record<string, TerminalCommand>
  /** Activation messages to show when terminal starts */
  messages: string[] | (() => string[])
  /** Whether this strategy should auto-activate terminal */
  autoActivate: boolean
  /** Whether this strategy allows manual activation */
  allowManualActivation: boolean
  /** Custom behavior for character input handling */
  handleCharacterInput?: (char: string, context: TerminalContext) => boolean
  /** Custom behavior for command execution */
  preCommandExecution?: (command: string, context: TerminalContext) => boolean
}

/**
 * Utility class for creating common terminal commands.
 *
 * @class TerminalCommandBuilder
 * @public
 */
export class TerminalCommandBuilder {
  /**
   * Creates a navigation command that moves to the next step.
   *
   * @param onboardingAPI - API for onboarding operations
   * @param successMessage - Message to show on success
   * @param autoHide - Whether to auto-hide terminal after execution
   * @returns TerminalCommand for navigation
   * @public
   */
  static createNextStepCommand(
    onboardingAPI: OnboardingAPI,
    successMessage: string,
    autoHide: boolean = true
  ): TerminalCommand {
    return {
      action: async () => {
        console.log('[TerminalCommand] Moving to next step')
        onboardingAPI.nextStep()
      },
      description: successMessage,
      autoHideAfterExecution: autoHide,
    }
  }

  /**
   * Creates a navigation command that moves to the previous step.
   *
   * @param onboardingAPI - API for onboarding operations
   * @returns TerminalCommand for backward navigation
   * @public
   */
  static createPreviousStepCommand(
    onboardingAPI: OnboardingAPI
  ): TerminalCommand {
    return {
      action: async () => {
        console.log('[TerminalCommand] Moving to previous step')
        onboardingAPI.previousStep()
        // Terminal stays visible after navigation
      },
      description: 'Go to previous step',
      autoHideAfterExecution: false, // Keep terminal visible
    }
  }

  /**
   * Creates a navigation command that goes to a specific step.
   *
   * @param onboardingAPI - API for onboarding operations
   * @param targetStep - Step to navigate to
   * @param description - Description of the command
   * @param autoHide - Whether to auto-hide terminal after execution
   * @returns TerminalCommand for specific step navigation
   * @public
   */
  static createGoToStepCommand(
    onboardingAPI: OnboardingAPI,
    targetStep: OnboardingStep,
    description: string,
    autoHide: boolean = true
  ): TerminalCommand {
    return {
      action: async () => {
        console.log(`[TerminalCommand] Going to step: ${targetStep}`)
        onboardingAPI.goToStep(targetStep)
      },
      description,
      autoHideAfterExecution: autoHide,
    }
  }

  /**
   * Creates a project selection command.
   *
   * @param onboardingAPI - API for onboarding operations
   * @param project - Project to select
   * @returns TerminalCommand for project selection
   * @public
   */
  static createProjectSelectionCommand(
    onboardingAPI: OnboardingAPI,
    project: ProjectMetadata
  ): TerminalCommand {
    return {
      action: async () => {
        console.log(`[TerminalCommand] Selecting project: ${project.name}`)
        // Add project selection logic here
        setTimeout(() => {
          onboardingAPI.nextStep()
        }, 1000)
      },
      description: `Open ${project.name}`,
      autoHideAfterExecution: true,
    }
  }
}

/**
 * Collection of terminal strategies for each onboarding step.
 *
 * @class TerminalStrategies
 * @public
 */
export class TerminalStrategies {
  /**
   * Gets the terminal strategy for a specific onboarding step.
   *
   * @param step - The onboarding step
   * @param onboardingAPI - API for onboarding operations
   * @returns Terminal strategy for the step
   * @public
   */
  static getStrategy(
    step: OnboardingStep,
    onboardingAPI: OnboardingAPI
  ): TerminalStrategy {
    switch (step) {
      case 'welcome':
        return this.getWelcomeStrategy(onboardingAPI)

      case 'project-selection':
        return this.getProjectSelectionStrategy(onboardingAPI)

      case 'task-selector':
        return this.getTaskSelectorStrategy(onboardingAPI)

      case 'task-selection':
        return this.getTaskSelectionStrategy(onboardingAPI)

      case 'task-detail':
        return this.getTaskDetailStrategy(onboardingAPI)

      case 'branch-creation':
        return this.getBranchCreationStrategy(onboardingAPI)

      case 'transition':
        return this.getTransitionStrategy(onboardingAPI)

      case 'completed':
        return this.getCompletedStrategy(onboardingAPI)

      default:
        return this.getDefaultStrategy(onboardingAPI)
    }
  }

  /**
   * Gets the base commands available in all terminal contexts.
   *
   * @param onboardingAPI - API for onboarding operations
   * @returns Base commands
   * @private
   */
  private static getBaseCommands(
    onboardingAPI: OnboardingAPI
  ): Record<string, TerminalCommand> {
    return {
      help: {
        action: () => {
          // This will be handled by the context's showHelp method
        },
        description: 'Show available commands',
      },
      clear: {
        action: () => {
          // This will be handled by the context's clear method
        },
        description: 'Clear terminal screen',
      },
      back: TerminalCommandBuilder.createPreviousStepCommand(onboardingAPI),
    }
  }

  /**
   * Terminal strategy for the welcome step.
   *
   * @param onboardingAPI - API for onboarding operations
   * @returns Welcome strategy
   * @private
   */
  private static getWelcomeStrategy(
    onboardingAPI: OnboardingAPI
  ): TerminalStrategy {
    const baseCommands = this.getBaseCommands(onboardingAPI)
    // Remove 'back' command from welcome step
    delete baseCommands.back

    return {
      commands: {
        ...baseCommands,
        h: {
          action: async () => {
            console.log('[TerminalCommand] Moving to next step from welcome')
            // Emit event for visual feedback and to mark terminal as manually activated
            window.dispatchEvent(new CustomEvent('terminal-welcome-h'))
            // Mark that the user has manually activated the terminal
            window.dispatchEvent(new CustomEvent('terminal-manually-activated'))
            // Move to next step
            onboardingAPI.nextStep()
          },
          description: 'Activate Command Mode and continue',
          autoHideAfterExecution: false, // Keep terminal visible for next step
        },
      },
      messages: [
        'Hatcher, your system is ready.',
        "Press 'h' to engage Command Mode.",
      ],
      autoActivate: true, // Terminal should show immediately on welcome to display instructions
      allowManualActivation: true,
      handleCharacterInput: (char: string, context: TerminalContext) => {
        // Only allow 'h' character in welcome step
        if (char.toLowerCase() === 'h') {
          // Don't show 'h' in input, execute command directly
          context.updateInput('') // Keep input empty
          context.executeCommand('h')
          return true
        } else {
          // Clear any invalid input immediately
          context.updateInput('')
          return true // Return true to indicate we handled the character
        }
      },
    }
  }

  /**
   * Terminal strategy for the project selection step.
   *
   * @param onboardingAPI - API for onboarding operations
   * @returns Project selection strategy
   * @private
   */
  private static getProjectSelectionStrategy(
    onboardingAPI: OnboardingAPI
  ): TerminalStrategy {
    const baseCommands = this.getBaseCommands(onboardingAPI)

    const commands: Record<string, TerminalCommand> = {
      ...baseCommands,
      o: {
        action: async () => {
          console.log('[Terminal] Triggering open project command...')
          // Emit custom event for the component to handle
          window.dispatchEvent(new CustomEvent('terminal-open-project'))
        },
        description: 'Open project',
        autoHideAfterExecution: false,
      },
      esc: TerminalCommandBuilder.createPreviousStepCommand(onboardingAPI),
    }

    // Add recent project commands (1, 2, 3, 4, 5) - these will be populated dynamically
    for (let i = 1; i <= 5; i++) {
      commands[i.toString()] = {
        action: async () => {
          console.log(`[Terminal] Triggering recent project ${i} selection...`)
          // Emit custom event for the component to handle
          window.dispatchEvent(
            new CustomEvent('terminal-select-project', {
              detail: { index: i - 1 },
            })
          )
        },
        description: `Recent project ${i}`,
        autoHideAfterExecution: true,
      }
    }

    // Messages will be loaded dynamically by the component - no static messages
    const messages: string[] = []

    return {
      commands,
      messages,
      autoActivate: false, // Only show if user activated terminal in welcome
      allowManualActivation: true,
    }
  }

  /**
   * Terminal strategy for the task selector step.
   *
   * @param onboardingAPI - API for onboarding operations
   * @returns Task selector strategy
   * @private
   */
  private static getTaskSelectorStrategy(
    onboardingAPI: OnboardingAPI
  ): TerminalStrategy {
    const baseCommands = this.getBaseCommands(onboardingAPI)

    const commands: Record<string, TerminalCommand> = {
      ...baseCommands,
      n: TerminalCommandBuilder.createNextStepCommand(
        onboardingAPI,
        'Create new task',
        true
      ),
      b: {
        action: async () => {
          console.log('[Terminal] Entering branch selection mode...')
          // Emit custom event for the component to handle branch selection
          window.dispatchEvent(new CustomEvent('terminal-enter-branch-search'))
        },
        description: 'Search branch',
        autoHideAfterExecution: false,
      },
      esc: TerminalCommandBuilder.createPreviousStepCommand(onboardingAPI),
    }

    // Add quick access to first 5 branches (will be populated dynamically by context)
    for (let i = 1; i <= 5; i++) {
      commands[i.toString()] = {
        action: async () => {
          console.log(`[TerminalStrategies] Quick selecting branch ${i}...`)
          console.log(
            `[TerminalStrategies] Dispatching terminal-select-branch event with index: ${i - 1}`
          )
          // Emit custom event for the component to handle
          const event = new CustomEvent('terminal-select-branch', {
            detail: { index: i - 1 },
          })
          window.dispatchEvent(event)
          console.log(`[TerminalStrategies] Event dispatched successfully`)
        },
        description: `Quick select branch ${i}`,
        autoHideAfterExecution: true,
      }
    }

    // Default messages - will be updated dynamically by the component
    const messages: string[] = [
      '[n] Create new task',
      '[b] Search branch',
      '[esc] Back',
    ]

    return {
      commands,
      messages,
      autoActivate: false,
      allowManualActivation: true,
      // Custom character handler for search mode
      handleCharacterInput: (char: string, context: TerminalContext) => {
        // Check if we're in search mode via a global flag
        if (
          (window as unknown as { isTerminalSearchMode?: boolean })
            .isTerminalSearchMode
        ) {
          // Get current input from context for number key selection
          const currentInput =
            context?.state?.currentInput || context?.state?.currentInput || ''

          // Check if it's a number key for quick selection (1-9, 0 for 10th)
          // Only when there's already some search text
          if (char >= '0' && char <= '9' && currentInput.length > 0) {
            // We'll let the component handle number selection via the keyboard event
            // But don't add the number to the input
            return true // Block the number from being added to input
          }

          // For all other characters in search mode, let the terminal handle them normally
          // This includes regular typing, backspace, delete, arrows, etc.
          // The standardized input handler in terminalContextFactory will manage the input
          return false
        }

        // In normal mode (not in search), only allow valid command keys
        const validKeys = ['n', 'b', '1', '2', '3', '4', '5']

        // Check if it's a valid command key
        if (validKeys.includes(char)) {
          // Let the default handler process valid keys as commands
          return false
        }

        // ESC and other special keys come as strings and should be processed as commands
        if (char === 'esc' || char === 'Escape') {
          // Let the default handler process the esc command
          return false
        }

        // Block all other characters when not in search mode
        return true
      },
    }
  }

  /**
   * Terminal strategy for the task selection step.
   *
   * @param onboardingAPI - API for onboarding operations
   * @returns Task selection strategy
   * @private
   */
  private static getTaskSelectionStrategy(
    onboardingAPI: OnboardingAPI
  ): TerminalStrategy {
    const baseCommands = this.getBaseCommands(onboardingAPI)

    const taskCommands: Record<string, TerminalCommand> = {
      esc: TerminalCommandBuilder.createPreviousStepCommand(onboardingAPI),
    }
    const taskOptions = [
      { key: '1', name: 'Create a new Feature', id: 'create-feature' },
      { key: '2', name: 'Fix a Bug', id: 'fix-bug' },
      { key: '3', name: 'Improve Documentation', id: 'improve-documentation' },
      { key: '4', name: 'Perform Maintenance', id: 'perform-maintenance' },
      { key: '5', name: 'Refactor Code', id: 'refactor-code' },
    ]

    taskOptions.forEach((task) => {
      taskCommands[task.key] = {
        action: async () => {
          console.log(`[Terminal] Selected: ${task.name}`)
          // Dispatch event to select the task in the UI using the correct task ID
          window.dispatchEvent(
            new CustomEvent('terminal-select-task', {
              detail: { taskId: task.id },
            })
          )
          setTimeout(() => {
            onboardingAPI.nextStep()
          }, 500)
        },
        description: task.name,
        autoHideAfterExecution: true,
      }
    })

    // Create messages with each task option on its own line
    const messages = [
      'Choose your task type:',
      '[1] Create a new feature',
      '[2] Fix a bug',
      '[3] Improve documentation',
      '[4] Perform maintenance',
      '[5] Refactor code',
      '[esc] Back',
    ]

    return {
      commands: {
        ...baseCommands,
        ...taskCommands,
      },
      messages,
      autoActivate: true, // Auto-activate terminal for task selection
      allowManualActivation: true,
      // Custom character handler to only allow valid task selection keys
      handleCharacterInput: (char: string, context: TerminalContext) => {
        const validKeys = ['1', '2', '3', '4', '5']

        // Check if it's a valid task selection key
        if (validKeys.includes(char)) {
          // Let the default handler process valid keys
          return false
        }

        // ESC comes as 'esc' string and should be processed as a command
        if (char.toLowerCase() === 'esc') {
          // Let the default handler process the esc command
          return false
        }

        // For any other character, discard it and clear input
        context.updateInput('')
        return true // Indicate we handled the character (by discarding it)
      },
    }
  }

  /**
   * Terminal strategy for the task detail step.
   *
   * @param onboardingAPI - API for onboarding operations
   * @returns Task detail strategy
   * @private
   */
  private static getTaskDetailStrategy(
    onboardingAPI: OnboardingAPI
  ): TerminalStrategy {
    return {
      commands: {
        ...this.getBaseCommands(onboardingAPI),
        esc: TerminalCommandBuilder.createPreviousStepCommand(onboardingAPI),
        enter: {
          action: async () => {
            console.log(
              '[TerminalCommand] Saving branch details and moving to next step'
            )

            // Trigger the save action by simulating a click on the Start Building button
            // This ensures the branch configuration is saved properly
            const startBuildingButton = document.querySelector(
              '.onboarding-task-detail .action-section button'
            ) as HTMLButtonElement
            if (startBuildingButton && !startBuildingButton.disabled) {
              startBuildingButton.click()
            } else {
              // Fallback: just proceed to next step if button not found or disabled
              onboardingAPI.nextStep()
            }
          },
          description: 'Continue with task details',
          autoHideAfterExecution: true,
        },
      },
      messages: [
        '[esc] back',
        '',
        'Task name [| branch name], [enter] confirm',
      ],
      autoActivate: true, // Show terminal automatically in task-detail step
      allowManualActivation: true,
      handleCharacterInput: (char: string, context: TerminalContext) => {
        // Import the bridge (dynamic import to avoid circular dependencies)
        const bridge = window.terminalInputBridge
        if (!bridge) {
          console.error('[Terminal] Input bridge not available')
          return false
        }

        // Allow ESC to be processed normally as a command
        if (char.toLowerCase() === 'esc') {
          return false
        }

        // Allow Enter to be processed normally as a command
        if (char === '\r' || char === '\n') {
          return false
        }

        // Let the bridge handle the character
        const handled = bridge.handleCharacter(char)

        if (handled) {
          // Get updated state from bridge
          const { input: newInput, cursor: newCursor } = bridge.getRawInput()

          // Update the context state to match bridge state
          context.updateInput(newInput)
          // Note: cursorPosition is part of the state, but updateInput should handle it
          if ('state' in context && context.state) {
            ;(context.state as { cursorPosition?: number }).cursorPosition =
              newCursor
          }

          // The bridge will notify UI components automatically
          console.log(
            '[Terminal] Input updated via bridge:',
            newInput,
            'cursor:',
            newCursor
          )
        }

        // Return whether we handled the character
        return handled
      },
    }
  }

  /**
   * Terminal strategy for the branch creation step.
   *
   * @param onboardingAPI - API for onboarding operations
   * @returns Branch creation strategy
   * @private
   */
  private static getBranchCreationStrategy(
    onboardingAPI: OnboardingAPI
  ): TerminalStrategy {
    // Get the stored branch configuration
    const getBranchInfo = () => {
      const storedBranch = onboardingAPI.getSelectedBranch?.value as
        | { name?: string }
        | undefined
      return storedBranch?.name || 'feature/new-branch'
    }

    // Get available branches from the selector or use defaults
    const getAvailableBranches = () => {
      // First priority: get branches from window (set by OnboardingBranchCreation)
      const storedBranches = window.terminalAvailableBranches
      if (
        storedBranches &&
        Array.isArray(storedBranches) &&
        storedBranches.length > 0
      ) {
        console.log('[Terminal] Using branches from window:', storedBranches)
        return storedBranches
      }

      // Second priority: try to get from the BranchSelector Vue component
      const branchSelectorEl = document.querySelector('.branch-selector-field')
      if (branchSelectorEl) {
        const vueInstance = (branchSelectorEl as VueElement)
          .__vueParentComponent
        if (
          vueInstance &&
          vueInstance.props &&
          Array.isArray(vueInstance.props.branches)
        ) {
          console.log(
            '[Terminal] Found branches from Vue component:',
            vueInstance.props.branches
          )
          // Store for future use
          window.terminalAvailableBranches = vueInstance.props.branches
          return vueInstance.props.branches
        }
      }

      // Third priority: try to get from a select element
      const selector = document.querySelector(
        '.branch-selector select, .branch-creation-step select'
      ) as HTMLSelectElement

      if (selector && selector.options && selector.options.length > 0) {
        const branches = Array.from(selector.options).map((opt) => opt.value)
        console.log('[Terminal] Found branches from select element:', branches)
        return branches
      }

      // Default fallback - at least return common branch names
      console.log('[Terminal] Warning: Could not find branches, using defaults')
      return ['main', 'master', 'develop', 'staging', 'production']
    }

    // Get the current base branch from the UI
    const getBaseBranch = () => {
      const selector = document.querySelector(
        '.branch-creation-step select'
      ) as HTMLSelectElement
      return selector?.value || 'main'
    }

    // Check if in search mode
    const isInSearchMode = () => {
      return (window as unknown as { isTerminalBranchSearchMode?: boolean })
        .isTerminalBranchSearchMode
    }

    // Set search mode
    const setSearchMode = (enabled: boolean) => {
      // Set the global flag
      ;(
        window as unknown as { isTerminalBranchSearchMode?: boolean }
      ).isTerminalBranchSearchMode = enabled

      // If disabling search mode, also clear terminal state
      if (!enabled && window.currentContext) {
        window.currentContext.updateInput('')
        // Ensure cursor is hidden when not in search mode
        if (window.currentContext.state) {
          window.currentContext.state.isWaitingForInput = false
        }
      }
    }

    // Filter branches based on search
    const filterBranches = (query: string) => {
      const branches = getAvailableBranches()
      if (!query) return branches
      return branches.filter(
        (branch: string | { name: string; current: boolean }) => {
          const branchName = typeof branch === 'string' ? branch : branch.name
          return branchName.toLowerCase().includes(query.toLowerCase())
        }
      )
    }

    // Select a branch
    const selectBranch = (branchName: string) => {
      const selector = document.querySelector(
        '.branch-creation-step select'
      ) as HTMLSelectElement
      if (selector) {
        selector.value = branchName
        selector.dispatchEvent(new Event('change', { bubbles: true }))
        selector.dispatchEvent(new Event('input', { bubbles: true }))

        // Update the v-model binding
        const vueInstance = (selector as VueElement).__vueParentComponent
        if (vueInstance) {
          vueInstance.emit('update:modelValue', branchName)
        }
      }
    }

    return {
      commands: {
        ...this.getBaseCommands(onboardingAPI),
        esc: {
          action: async () => {
            // Check if we're in search mode FIRST
            const inSearchMode = isInSearchMode()

            if (inSearchMode) {
              // Exit search mode ONLY - don't go back
              setSearchMode(false)

              // Clear the search input event
              window.dispatchEvent(
                new CustomEvent('terminal-clear-search', {
                  detail: { step: 'branch-creation' },
                })
              )

              // Critical: return immediately to prevent any further action
              return
            }

            // Only go back if NOT in search mode
            if (!inSearchMode) {
              onboardingAPI.previousStep()
            }
          },
          description: 'Exit search / Back',
          autoHideAfterExecution: false,
        },
        enter: {
          action: async () => {
            // If in search mode, select the first filtered result
            if (isInSearchMode()) {
              // Dispatch selection event (will be handled by search component)
              window.dispatchEvent(
                new CustomEvent('terminal-select-first-result', {
                  detail: { step: 'branch-creation' },
                })
              )

              setSearchMode(false)

              window.dispatchEvent(
                new CustomEvent('terminal-clear-search', {
                  detail: { step: 'branch-creation' },
                })
              )
            } else {
              // Otherwise, create branch and continue
              console.log('[TerminalCommand] Creating branch and continuing')
              const createBranchButton = document.querySelector(
                '.branch-creation-step .action-section button'
              ) as HTMLButtonElement
              if (createBranchButton && !createBranchButton.disabled) {
                createBranchButton.click()
              } else {
                onboardingAPI.nextStep()
              }
            }
          },
          description: 'Select branch / Create and continue',
          autoHideAfterExecution: true,
        },
        b: {
          action: async () => {
            console.log('[Terminal] Triggering branch search mode')

            // Dispatch event to enter search mode
            window.dispatchEvent(
              new CustomEvent('terminal-enter-branch-search', {
                detail: { step: 'branch-creation' },
              })
            )

            // Also try clicking the UI button as fallback
            const branchSelectorButton = document.querySelector(
              '.branch-selector-button'
            ) as HTMLButtonElement

            if (branchSelectorButton) {
              branchSelectorButton.click()
            }
          },
          description: 'Change base branch',
          autoHideAfterExecution: false,
        },
      },
      messages: () => {
        const branchName = getBranchInfo()
        const baseBranch = getBaseBranch()

        // Simple messages since search is now handled by UI
        const messages = [
          '[b] change base branch',
          '[esc] back',
          '',
          `Creating: ${branchName}`,
          `From base: ${baseBranch}`,
          'Press [enter] to confirm branch creation',
        ]

        return messages
      },
      autoActivate: true, // Show terminal automatically in branch creation step
      allowManualActivation: true,
      // Custom character handler for search mode
      handleCharacterInput: (char: string, context: TerminalContext) => {
        if (isInSearchMode()) {
          // Store context in window for messages function to access
          if (context) {
            window.currentContext = context
          }

          // For number keys, check if they're for selection
          if (char >= '0' && char <= '9') {
            // Get current input AFTER this character would be added
            // But we need to check the current state to see if we have results
            const currentInput =
              context?.state?.currentInput || context?.state?.currentInput || ''

            // Only treat as selection if we already have search input and results
            if (currentInput.length > 0) {
              const filtered = filterBranches(currentInput)
              if (filtered.length > 0) {
                const index = char === '0' ? 9 : parseInt(char) - 1

                if (index < filtered.length) {
                  // Select the branch
                  const branch = filtered[index]
                  const branchName =
                    typeof branch === 'string' ? branch : branch.name
                  selectBranch(branchName)
                  setSearchMode(false)

                  // Clear input and refresh messages
                  if (context) {
                    context.updateInput('')
                    context.refreshMessages()
                  }

                  window.dispatchEvent(
                    new CustomEvent('terminal-clear-search', {
                      detail: { step: 'branch-creation' },
                    })
                  )
                  return true // Handled - don't add the number to input
                }
              }
            }
            // If no input yet or no valid selection, let the number be typed as search
          }

          // Schedule a message refresh after any character input
          // This ensures the filtered results are shown after typing
          if (context && char !== '\r' && char !== '\n' && char !== '\x1b') {
            setTimeout(() => {
              // Force refresh messages with the updated input
              context.refreshMessages()
            }, 0)
          }

          // Let the default handler process all characters in search mode
          // This includes regular typing, backspace, delete, enter, escape, etc.
          return false
        }

        // Normal mode - allow b, enter, and esc to be processed normally
        if (
          char === 'b' ||
          char.toLowerCase() === 'esc' ||
          char === '\r' ||
          char === '\n'
        ) {
          // Let default handler process these commands
          return false
        }

        // Block other characters in normal mode
        context.updateInput('')
        return true
      },
    }
  }

  /**
   * Terminal strategy for the transition step.
   *
   * @param onboardingAPI - API for onboarding operations
   * @returns Transition strategy
   * @private
   */
  private static getTransitionStrategy(
    onboardingAPI: OnboardingAPI
  ): TerminalStrategy {
    return {
      commands: {
        // Only include help and clear commands - no navigation or action commands
        help: this.getBaseCommands(onboardingAPI).help,
        clear: this.getBaseCommands(onboardingAPI).clear,
      },
      messages: ['Starting...'],
      autoActivate: false,
      allowManualActivation: true,
      // Block all input since this is a passive loading screen
      handleCharacterInput: () => {
        // Block all character input during transition
        return true
      },
    }
  }

  /**
   * Terminal strategy for the completed step.
   *
   * @param _onboardingAPI - API for onboarding operations (unused)
   * @returns Completed strategy
   * @private
   */
  private static getCompletedStrategy(
    _onboardingAPI: OnboardingAPI
  ): TerminalStrategy {
    return {
      commands: {
        // No commands available in completed state
      },
      messages: ['Welcome to Hatcher! 🚀'],
      autoActivate: false, // Terminal should not be visible in completed state
      allowManualActivation: false,
    }
  }

  /**
   * Default terminal strategy for unknown steps.
   *
   * @param onboardingAPI - API for onboarding operations
   * @returns Default strategy
   * @private
   */
  private static getDefaultStrategy(
    onboardingAPI: OnboardingAPI
  ): TerminalStrategy {
    return {
      commands: this.getBaseCommands(onboardingAPI),
      messages: ["> Type 'help' for commands"],
      autoActivate: false,
      allowManualActivation: true,
    }
  }
}
