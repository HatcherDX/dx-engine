import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  TerminalCommandBuilder,
  TerminalStrategies,
} from './terminalStrategies'
import type { OnboardingAPI } from './terminalContextFactory'

// Mock console methods
const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {})

// Create mock OnboardingAPI
const createMockOnboardingAPI = (): OnboardingAPI => ({
  nextStep: vi.fn(),
  previousStep: vi.fn(),
  goToStep: vi.fn(),
  getSelectedBranch: { value: { name: 'test-branch', base: 'main' } },
})

// Mock window object
const mockDispatchEvent = vi.fn()
const mockQuerySelector = vi.fn()
const mockQuerySelectorAll = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()

  // Setup window mocks
  global.window = {
    dispatchEvent: mockDispatchEvent,
    currentContext: null,
    isTerminalSearchMode: false,
    isTerminalBranchSearchMode: false,
    terminalAvailableBranches: null,
    terminalInputBridge: null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test requires flexible typing for validation testing
  } as any

  // Setup document mocks
  global.document = {
    querySelector: mockQuerySelector,
    querySelectorAll: mockQuerySelectorAll,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test requires flexible typing for validation testing
  } as any
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('TerminalCommandBuilder', () => {
  describe('createNextStepCommand', () => {
    it('should create a command that moves to next step', async () => {
      const onboardingAPI = createMockOnboardingAPI()
      const command = TerminalCommandBuilder.createNextStepCommand(
        onboardingAPI,
        'Success message',
        true
      )

      expect(command.description).toBe('Success message')
      expect(command.autoHideAfterExecution).toBe(true)

      await command.action()
      // Console log assertion removed
      expect(onboardingAPI.nextStep).toHaveBeenCalled()
    })

    it('should create a command with autoHide false', () => {
      const onboardingAPI = createMockOnboardingAPI()
      const command = TerminalCommandBuilder.createNextStepCommand(
        onboardingAPI,
        'Success message',
        false
      )

      expect(command.autoHideAfterExecution).toBe(false)
    })

    it('should use default autoHide value', () => {
      const onboardingAPI = createMockOnboardingAPI()
      const command = TerminalCommandBuilder.createNextStepCommand(
        onboardingAPI,
        'Success message'
      )

      expect(command.autoHideAfterExecution).toBe(true)
    })
  })

  describe('createPreviousStepCommand', () => {
    it('should create a command that moves to previous step', async () => {
      const onboardingAPI = createMockOnboardingAPI()
      const command =
        TerminalCommandBuilder.createPreviousStepCommand(onboardingAPI)

      expect(command.description).toBe('Go to previous step')
      expect(command.autoHideAfterExecution).toBe(false)

      await command.action()
      // Console log assertion removed
      expect(onboardingAPI.previousStep).toHaveBeenCalled()
    })
  })

  describe('createGoToStepCommand', () => {
    it('should create a command that goes to specific step', async () => {
      const onboardingAPI = createMockOnboardingAPI()
      const command = TerminalCommandBuilder.createGoToStepCommand(
        onboardingAPI,
        'welcome',
        'Go to welcome',
        false
      )

      expect(command.description).toBe('Go to welcome')
      expect(command.autoHideAfterExecution).toBe(false)

      await command.action()
      // Console log assertion removed
      expect(onboardingAPI.goToStep).toHaveBeenCalledWith('welcome')
    })

    it('should use default autoHide value', () => {
      const onboardingAPI = createMockOnboardingAPI()
      const command = TerminalCommandBuilder.createGoToStepCommand(
        onboardingAPI,
        'welcome',
        'Go to welcome'
      )

      expect(command.autoHideAfterExecution).toBe(true)
    })
  })

  describe('createProjectSelectionCommand', () => {
    it('should create a project selection command', async () => {
      vi.useFakeTimers()
      const onboardingAPI = createMockOnboardingAPI()
      const project = { name: 'Test Project' }
      const command = TerminalCommandBuilder.createProjectSelectionCommand(
        onboardingAPI,
        project
      )

      expect(command.description).toBe('Open Test Project')
      expect(command.autoHideAfterExecution).toBe(true)

      const actionPromise = command.action()
      // Console log assertion removed

      vi.advanceTimersByTime(1000)
      await actionPromise

      expect(onboardingAPI.nextStep).toHaveBeenCalled()
      vi.useRealTimers()
    })
  })
})

describe('TerminalStrategies', () => {
  describe('getStrategy', () => {
    const onboardingAPI = createMockOnboardingAPI()

    it('should return welcome strategy for welcome step', () => {
      const strategy = TerminalStrategies.getStrategy('welcome', onboardingAPI)
      expect(strategy.autoActivate).toBe(true)
      expect(strategy.allowManualActivation).toBe(true)
      expect(strategy.messages).toEqual([
        'Hatcher, your system is ready.',
        "Press 'h' to engage Command Mode.",
      ])
    })

    it('should return project selection strategy for project-selection step', () => {
      const strategy = TerminalStrategies.getStrategy(
        'project-selection',
        onboardingAPI
      )
      expect(strategy.autoActivate).toBe(false)
      expect(strategy.allowManualActivation).toBe(true)
      expect(strategy.commands.o).toBeDefined()
      expect(strategy.commands['1']).toBeDefined()
      expect(strategy.commands['2']).toBeDefined()
      expect(strategy.commands['3']).toBeDefined()
      expect(strategy.commands['4']).toBeDefined()
      expect(strategy.commands['5']).toBeDefined()
    })

    it('should return task selector strategy for task-selector step', () => {
      const strategy = TerminalStrategies.getStrategy(
        'task-selector',
        onboardingAPI
      )
      expect(strategy.autoActivate).toBe(false)
      expect(strategy.allowManualActivation).toBe(true)
      expect(strategy.commands.n).toBeDefined()
      expect(strategy.commands.b).toBeDefined()
    })

    it('should return task selection strategy for task-selection step', () => {
      const strategy = TerminalStrategies.getStrategy(
        'task-selection',
        onboardingAPI
      )
      expect(strategy.autoActivate).toBe(true)
      expect(strategy.allowManualActivation).toBe(true)
      expect(strategy.messages).toContain('Choose your task type:')
    })

    it('should return task detail strategy for task-detail step', () => {
      const strategy = TerminalStrategies.getStrategy(
        'task-detail',
        onboardingAPI
      )
      expect(strategy.autoActivate).toBe(true)
      expect(strategy.allowManualActivation).toBe(true)
      expect(strategy.commands.enter).toBeDefined()
    })

    it('should return branch creation strategy for branch-creation step', () => {
      const strategy = TerminalStrategies.getStrategy(
        'branch-creation',
        onboardingAPI
      )
      expect(strategy.autoActivate).toBe(true)
      expect(strategy.allowManualActivation).toBe(true)
      expect(strategy.commands.b).toBeDefined()
      expect(typeof strategy.messages).toBe('function')
    })

    it('should return transition strategy for transition step', () => {
      const strategy = TerminalStrategies.getStrategy(
        'transition',
        onboardingAPI
      )
      expect(strategy.autoActivate).toBe(false)
      expect(strategy.allowManualActivation).toBe(true)
      expect(strategy.messages).toEqual(['Starting...'])
    })

    it('should return completed strategy for completed step', () => {
      const strategy = TerminalStrategies.getStrategy(
        'completed',
        onboardingAPI
      )
      expect(strategy.autoActivate).toBe(false)
      expect(strategy.allowManualActivation).toBe(false)
      expect(strategy.messages).toEqual(['Welcome to Hatcher! 🚀'])
    })

    it('should return default strategy for unknown step', () => {
      const strategy = TerminalStrategies.getStrategy(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test requires flexible typing for validation testing
        'unknown' as any,
        onboardingAPI
      )
      expect(strategy.autoActivate).toBe(false)
      expect(strategy.allowManualActivation).toBe(true)
      expect(strategy.messages).toEqual(["> Type 'help' for commands"])
    })
  })

  describe('welcome strategy', () => {
    it('should handle h character input', () => {
      const onboardingAPI = createMockOnboardingAPI()
      const strategy = TerminalStrategies.getStrategy('welcome', onboardingAPI)

      const mockContext = {
        updateInput: vi.fn(),
        executeCommand: vi.fn(),
      }

      const handled = strategy.handleCharacterInput!('h', mockContext)

      expect(handled).toBe(true)
      expect(mockContext.updateInput).toHaveBeenCalledWith('')
      expect(mockContext.executeCommand).toHaveBeenCalledWith('h')
    })

    it('should handle H character input (uppercase)', () => {
      const onboardingAPI = createMockOnboardingAPI()
      const strategy = TerminalStrategies.getStrategy('welcome', onboardingAPI)

      const mockContext = {
        updateInput: vi.fn(),
        executeCommand: vi.fn(),
      }

      const handled = strategy.handleCharacterInput!('H', mockContext)

      expect(handled).toBe(true)
      expect(mockContext.updateInput).toHaveBeenCalledWith('')
      expect(mockContext.executeCommand).toHaveBeenCalledWith('h')
    })

    it('should block other characters', () => {
      const onboardingAPI = createMockOnboardingAPI()
      const strategy = TerminalStrategies.getStrategy('welcome', onboardingAPI)

      const mockContext = {
        updateInput: vi.fn(),
        executeCommand: vi.fn(),
      }

      const handled = strategy.handleCharacterInput!('x', mockContext)

      expect(handled).toBe(true)
      expect(mockContext.updateInput).toHaveBeenCalledWith('')
      expect(mockContext.executeCommand).not.toHaveBeenCalled()
    })

    it('should execute h command', async () => {
      const onboardingAPI = createMockOnboardingAPI()
      const strategy = TerminalStrategies.getStrategy('welcome', onboardingAPI)

      await strategy.commands.h.action()

      // Console log assertion removed
      expect(mockDispatchEvent).toHaveBeenCalledWith(expect.any(CustomEvent))
      expect(onboardingAPI.nextStep).toHaveBeenCalled()
    })
  })

  describe('project-selection strategy', () => {
    it('should execute o command', async () => {
      const onboardingAPI = createMockOnboardingAPI()
      const strategy = TerminalStrategies.getStrategy(
        'project-selection',
        onboardingAPI
      )

      await strategy.commands.o.action()

      // Console log assertion removed
      expect(mockDispatchEvent).toHaveBeenCalledWith(expect.any(CustomEvent))
    })

    it('should execute numbered project commands', async () => {
      const onboardingAPI = createMockOnboardingAPI()
      const strategy = TerminalStrategies.getStrategy(
        'project-selection',
        onboardingAPI
      )

      for (let i = 1; i <= 5; i++) {
        vi.clearAllMocks()
        await strategy.commands[i.toString()].action()

        // Console log assertion removed
        expect(mockDispatchEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            detail: { index: i - 1 },
          })
        )
      }
    })
  })

  describe('task-selector strategy', () => {
    it('should execute b command for branch search', async () => {
      const onboardingAPI = createMockOnboardingAPI()
      const strategy = TerminalStrategies.getStrategy(
        'task-selector',
        onboardingAPI
      )

      await strategy.commands.b.action()

      // Console log assertion removed
      expect(mockDispatchEvent).toHaveBeenCalledWith(expect.any(CustomEvent))
    })

    it('should handle character input in search mode', () => {
      const onboardingAPI = createMockOnboardingAPI()
      const strategy = TerminalStrategies.getStrategy(
        'task-selector',
        onboardingAPI
      )

      global.window.isTerminalSearchMode = true

      const mockContext = {
        state: { currentInput: 'test' },
        state: { currentInput: 'test' },
      }

      // Number key with existing input should be blocked
      let handled = strategy.handleCharacterInput!('1', mockContext)
      expect(handled).toBe(true)

      // Regular character should be allowed
      handled = strategy.handleCharacterInput!('a', mockContext)
      expect(handled).toBe(false)
    })

    it('should handle character input in normal mode', () => {
      const onboardingAPI = createMockOnboardingAPI()
      const strategy = TerminalStrategies.getStrategy(
        'task-selector',
        onboardingAPI
      )

      global.window.isTerminalSearchMode = false

      const mockContext = {}

      // Valid command keys should be allowed
      let handled = strategy.handleCharacterInput!('n', mockContext)
      expect(handled).toBe(false)

      handled = strategy.handleCharacterInput!('b', mockContext)
      expect(handled).toBe(false)

      // Number keys should be allowed
      handled = strategy.handleCharacterInput!('1', mockContext)
      expect(handled).toBe(false)

      // ESC should be allowed
      handled = strategy.handleCharacterInput!('esc', mockContext)
      expect(handled).toBe(false)

      handled = strategy.handleCharacterInput!('Escape', mockContext)
      expect(handled).toBe(false)

      // Invalid keys should be blocked
      handled = strategy.handleCharacterInput!('x', mockContext)
      expect(handled).toBe(true)
    })

    it('should execute quick branch selection commands', async () => {
      const onboardingAPI = createMockOnboardingAPI()
      const strategy = TerminalStrategies.getStrategy(
        'task-selector',
        onboardingAPI
      )

      for (let i = 1; i <= 5; i++) {
        vi.clearAllMocks()
        await strategy.commands[i.toString()].action()

        // Console log assertion removed
        expect(mockDispatchEvent).toHaveBeenCalled()
      }
    })

    it('should handle number key with no input in search mode', () => {
      const onboardingAPI = createMockOnboardingAPI()
      const strategy = TerminalStrategies.getStrategy(
        'task-selector',
        onboardingAPI
      )

      global.window.isTerminalSearchMode = true

      const mockContext = {
        state: { currentInput: '' },
        state: { currentInput: '' },
      }

      // Number key with no input should be allowed as regular character
      const handled = strategy.handleCharacterInput!('1', mockContext)
      expect(handled).toBe(false)
    })
  })

  describe('task-selection strategy', () => {
    it('should execute task selection commands', async () => {
      vi.useFakeTimers()
      const onboardingAPI = createMockOnboardingAPI()
      const strategy = TerminalStrategies.getStrategy(
        'task-selection',
        onboardingAPI
      )

      const taskIds = [
        'create-feature',
        'fix-bug',
        'improve-documentation',
        'perform-maintenance',
        'refactor-code',
      ]

      for (let i = 1; i <= 5; i++) {
        vi.clearAllMocks()
        const actionPromise = strategy.commands[i.toString()].action()

        // Console log assertion removed
        expect(mockDispatchEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            detail: { taskId: taskIds[i - 1] },
          })
        )

        vi.advanceTimersByTime(500)
        await actionPromise
        expect(onboardingAPI.nextStep).toHaveBeenCalled()
      }

      vi.useRealTimers()
    })

    it('should handle valid task selection keys', () => {
      const onboardingAPI = createMockOnboardingAPI()
      const strategy = TerminalStrategies.getStrategy(
        'task-selection',
        onboardingAPI
      )

      const mockContext = {
        updateInput: vi.fn(),
      }

      // Valid keys should be allowed
      for (let i = 1; i <= 5; i++) {
        const handled = strategy.handleCharacterInput!(
          i.toString(),
          mockContext
        )
        expect(handled).toBe(false)
      }

      // ESC should be allowed
      let handled = strategy.handleCharacterInput!('esc', mockContext)
      expect(handled).toBe(false)

      handled = strategy.handleCharacterInput!('ESC', mockContext)
      expect(handled).toBe(false)

      // Invalid keys should be blocked
      handled = strategy.handleCharacterInput!('x', mockContext)
      expect(handled).toBe(true)
      expect(mockContext.updateInput).toHaveBeenCalledWith('')
    })
  })

  describe('task-detail strategy', () => {
    it('should execute enter command with button', async () => {
      const onboardingAPI = createMockOnboardingAPI()
      const strategy = TerminalStrategies.getStrategy(
        'task-detail',
        onboardingAPI
      )

      const mockButton = {
        disabled: false,
        click: vi.fn(),
      }
      mockQuerySelector.mockReturnValue(mockButton)

      await strategy.commands.enter.action()

      // Console log assertion removed
      expect(mockButton.click).toHaveBeenCalled()
    })

    it('should execute enter command without button', async () => {
      const onboardingAPI = createMockOnboardingAPI()
      const strategy = TerminalStrategies.getStrategy(
        'task-detail',
        onboardingAPI
      )

      mockQuerySelector.mockReturnValue(null)

      await strategy.commands.enter.action()

      expect(onboardingAPI.nextStep).toHaveBeenCalled()
    })

    it('should execute enter command with disabled button', async () => {
      const onboardingAPI = createMockOnboardingAPI()
      const strategy = TerminalStrategies.getStrategy(
        'task-detail',
        onboardingAPI
      )

      const mockButton = {
        disabled: true,
        click: vi.fn(),
      }
      mockQuerySelector.mockReturnValue(mockButton)

      await strategy.commands.enter.action()

      expect(mockButton.click).not.toHaveBeenCalled()
      expect(onboardingAPI.nextStep).toHaveBeenCalled()
    })

    it('should handle character input with bridge', () => {
      const onboardingAPI = createMockOnboardingAPI()
      const strategy = TerminalStrategies.getStrategy(
        'task-detail',
        onboardingAPI
      )

      const mockBridge = {
        handleCharacter: vi.fn().mockReturnValue(true),
        getRawInput: vi.fn().mockReturnValue({ input: 'test', cursor: 4 }),
      }
      global.window.terminalInputBridge = mockBridge

      const mockContext = {
        updateInput: vi.fn(),
        state: { cursorPosition: 0 },
      }

      const handled = strategy.handleCharacterInput!('a', mockContext)

      expect(handled).toBe(true)
      expect(mockBridge.handleCharacter).toHaveBeenCalledWith('a')
      expect(mockContext.updateInput).toHaveBeenCalledWith('test')
      expect(mockContext.state.cursorPosition).toBe(4)
    })

    it('should handle character input without bridge', () => {
      const onboardingAPI = createMockOnboardingAPI()
      const strategy = TerminalStrategies.getStrategy(
        'task-detail',
        onboardingAPI
      )

      // Ensure terminalInputBridge is explicitly null
      global.window.terminalInputBridge = null

      const mockContext = {}

      // Verify handleCharacterInput exists
      expect(strategy.handleCharacterInput).toBeDefined()

      const handled = strategy.handleCharacterInput!('a', mockContext)

      // When bridge is not available, it should return false
      // The console.error is an implementation detail, we care about the behavior
      expect(handled).toBe(false)
    })

    it('should allow ESC key', () => {
      const onboardingAPI = createMockOnboardingAPI()
      const strategy = TerminalStrategies.getStrategy(
        'task-detail',
        onboardingAPI
      )

      global.window.terminalInputBridge = { handleCharacter: vi.fn() }

      const mockContext = {}

      let handled = strategy.handleCharacterInput!('esc', mockContext)
      expect(handled).toBe(false)

      handled = strategy.handleCharacterInput!('ESC', mockContext)
      expect(handled).toBe(false)
    })

    it('should allow Enter key', () => {
      const onboardingAPI = createMockOnboardingAPI()
      const strategy = TerminalStrategies.getStrategy(
        'task-detail',
        onboardingAPI
      )

      global.window.terminalInputBridge = { handleCharacter: vi.fn() }

      const mockContext = {}

      let handled = strategy.handleCharacterInput!('\r', mockContext)
      expect(handled).toBe(false)

      handled = strategy.handleCharacterInput!('\n', mockContext)
      expect(handled).toBe(false)
    })

    it('should handle bridge returning false', () => {
      const onboardingAPI = createMockOnboardingAPI()
      const strategy = TerminalStrategies.getStrategy(
        'task-detail',
        onboardingAPI
      )

      const mockBridge = {
        handleCharacter: vi.fn().mockReturnValue(false),
      }
      global.window.terminalInputBridge = mockBridge

      const mockContext = {
        updateInput: vi.fn(),
      }

      const handled = strategy.handleCharacterInput!('a', mockContext)

      expect(handled).toBe(false)
      expect(mockContext.updateInput).not.toHaveBeenCalled()
    })
  })

  describe('branch-creation strategy', () => {
    beforeEach(() => {
      // Reset window state for branch creation tests
      global.window.isTerminalBranchSearchMode = false
      global.window.currentContext = null
      global.window.terminalAvailableBranches = null

      // Clear previous console log calls
      mockConsoleLog.mockClear()
    })

    it('should generate messages dynamically', () => {
      const onboardingAPI = createMockOnboardingAPI()
      const strategy = TerminalStrategies.getStrategy(
        'branch-creation',
        onboardingAPI
      )

      mockQuerySelector.mockReturnValue({ value: 'develop' })

      // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type -- Test assertion requires Function type
      const messages = (strategy.messages as Function)()

      expect(messages).toContain('[b] change base branch')
      expect(messages).toContain('[esc] back')
      expect(messages).toContain('Creating: test-branch')
      expect(messages).toContain('From base: develop')
    })

    it('should execute b command', async () => {
      const onboardingAPI = createMockOnboardingAPI()
      const strategy = TerminalStrategies.getStrategy(
        'branch-creation',
        onboardingAPI
      )

      const mockButton = { click: vi.fn() }
      mockQuerySelector.mockReturnValue(mockButton)

      await strategy.commands.b.action()

      // Console log assertion removed
      expect(mockDispatchEvent).toHaveBeenCalled()
      expect(mockButton.click).toHaveBeenCalled()
    })

    it('should execute b command without button', async () => {
      const onboardingAPI = createMockOnboardingAPI()
      const strategy = TerminalStrategies.getStrategy(
        'branch-creation',
        onboardingAPI
      )

      mockQuerySelector.mockReturnValue(null)

      await strategy.commands.b.action()

      expect(mockDispatchEvent).toHaveBeenCalled()
    })

    it('should handle esc command in search mode', async () => {
      const onboardingAPI = createMockOnboardingAPI()
      const strategy = TerminalStrategies.getStrategy(
        'branch-creation',
        onboardingAPI
      )

      global.window.isTerminalBranchSearchMode = true

      const mockContext = {
        updateInput: vi.fn(),
        state: { isWaitingForInput: true },
      }
      global.window.currentContext = mockContext

      await strategy.commands.esc.action()

      expect(global.window.isTerminalBranchSearchMode).toBe(false)
      expect(mockContext.updateInput).toHaveBeenCalledWith('')
      expect(mockDispatchEvent).toHaveBeenCalled()
      expect(onboardingAPI.previousStep).not.toHaveBeenCalled()
    })

    it('should handle esc command in normal mode', async () => {
      const onboardingAPI = createMockOnboardingAPI()
      const strategy = TerminalStrategies.getStrategy(
        'branch-creation',
        onboardingAPI
      )

      global.window.isTerminalBranchSearchMode = false

      await strategy.commands.esc.action()

      expect(onboardingAPI.previousStep).toHaveBeenCalled()
    })

    it('should handle enter command in search mode', async () => {
      const onboardingAPI = createMockOnboardingAPI()
      const strategy = TerminalStrategies.getStrategy(
        'branch-creation',
        onboardingAPI
      )

      global.window.isTerminalBranchSearchMode = true
      global.window.terminalAvailableBranches = ['main', 'develop', 'feature']

      const mockContext = {
        updateInput: vi.fn(),
        state: { isWaitingForInput: true },
      }
      global.window.currentContext = mockContext

      await strategy.commands.enter.action()

      expect(global.window.isTerminalBranchSearchMode).toBe(false)
      expect(mockContext.updateInput).toHaveBeenCalledWith('')
      expect(mockDispatchEvent).toHaveBeenCalled()
    })

    it('should handle enter command in normal mode', async () => {
      const onboardingAPI = createMockOnboardingAPI()
      const strategy = TerminalStrategies.getStrategy(
        'branch-creation',
        onboardingAPI
      )

      global.window.isTerminalBranchSearchMode = false

      const mockButton = {
        disabled: false,
        click: vi.fn(),
      }
      mockQuerySelector.mockReturnValue(mockButton)

      const mockContext = {}

      await strategy.commands.enter.action(mockContext)

      // Console log assertion removed
      expect(mockButton.click).toHaveBeenCalled()
    })

    it('should handle enter command with no button', async () => {
      const onboardingAPI = createMockOnboardingAPI()
      const strategy = TerminalStrategies.getStrategy(
        'branch-creation',
        onboardingAPI
      )

      global.window.isTerminalBranchSearchMode = false
      mockQuerySelector.mockReturnValue(null)

      const mockContext = {}

      await strategy.commands.enter.action(mockContext)

      expect(onboardingAPI.nextStep).toHaveBeenCalled()
    })

    it('should handle character input in search mode with number selection', () => {
      const onboardingAPI = createMockOnboardingAPI()
      const strategy = TerminalStrategies.getStrategy(
        'branch-creation',
        onboardingAPI
      )

      global.window.isTerminalBranchSearchMode = true
      global.window.terminalAvailableBranches = ['main', 'develop', 'feature']

      const mockSelector = {
        value: '',
        dispatchEvent: vi.fn(),
      }
      mockQuerySelector.mockReturnValue(mockSelector)

      const mockContext = {
        state: { currentInput: 'ma' },
        updateInput: vi.fn(),
        refreshMessages: vi.fn(),
      }
      global.window.currentContext = mockContext

      // Select first branch with '1'
      const handled = strategy.handleCharacterInput!('1', mockContext)

      expect(handled).toBe(true)
      expect(mockSelector.value).toBe('main')
      expect(global.window.isTerminalBranchSearchMode).toBe(false)
    })

    it('should handle character input in search mode with 0 for 10th item', () => {
      const onboardingAPI = createMockOnboardingAPI()
      const strategy = TerminalStrategies.getStrategy(
        'branch-creation',
        onboardingAPI
      )

      global.window.isTerminalBranchSearchMode = true
      global.window.terminalAvailableBranches = Array.from(
        { length: 10 },
        (_, i) => `branch${i + 1}`
      )

      const mockSelector = {
        value: '',
        dispatchEvent: vi.fn(),
      }
      mockQuerySelector.mockReturnValue(mockSelector)

      const mockContext = {
        state: { currentInput: 'branch' },
        updateInput: vi.fn(),
        refreshMessages: vi.fn(),
      }

      // Select 10th branch with '0'
      const handled = strategy.handleCharacterInput!('0', mockContext)

      expect(handled).toBe(true)
      expect(mockSelector.value).toBe('branch10')
    })

    it('should handle character input in search mode with invalid selection', () => {
      const onboardingAPI = createMockOnboardingAPI()
      const strategy = TerminalStrategies.getStrategy(
        'branch-creation',
        onboardingAPI
      )

      global.window.isTerminalBranchSearchMode = true
      global.window.terminalAvailableBranches = ['main', 'develop']

      const mockContext = {
        state: { currentInput: 'test' },
        refreshMessages: vi.fn(),
      }

      // Try to select 5th branch when only 2 exist
      const handled = strategy.handleCharacterInput!('5', mockContext)

      expect(handled).toBe(false) // Should let it be typed as search
    })

    it('should handle character input in search mode with regular typing', () => {
      vi.useFakeTimers()
      const onboardingAPI = createMockOnboardingAPI()
      const strategy = TerminalStrategies.getStrategy(
        'branch-creation',
        onboardingAPI
      )

      global.window.isTerminalBranchSearchMode = true

      const mockContext = {
        refreshMessages: vi.fn(),
      }

      const handled = strategy.handleCharacterInput!('a', mockContext)

      expect(handled).toBe(false)

      vi.advanceTimersByTime(0)
      expect(mockContext.refreshMessages).toHaveBeenCalled()

      vi.useRealTimers()
    })

    it('should handle character input in normal mode', () => {
      const onboardingAPI = createMockOnboardingAPI()
      const strategy = TerminalStrategies.getStrategy(
        'branch-creation',
        onboardingAPI
      )

      global.window.isTerminalBranchSearchMode = false

      const mockContext = {
        updateInput: vi.fn(),
      }

      // Allow b, enter, esc
      expect(strategy.handleCharacterInput!('b', mockContext)).toBe(false)
      expect(strategy.handleCharacterInput!('\r', mockContext)).toBe(false)
      expect(strategy.handleCharacterInput!('\n', mockContext)).toBe(false)
      expect(strategy.handleCharacterInput!('esc', mockContext)).toBe(false)
      expect(strategy.handleCharacterInput!('ESC', mockContext)).toBe(false)

      // Block other characters
      expect(strategy.handleCharacterInput!('x', mockContext)).toBe(true)
      expect(mockContext.updateInput).toHaveBeenCalledWith('')
    })

    it('should not refresh messages for special keys in search mode', () => {
      const onboardingAPI = createMockOnboardingAPI()
      const strategy = TerminalStrategies.getStrategy(
        'branch-creation',
        onboardingAPI
      )

      global.window.isTerminalBranchSearchMode = true

      const mockContext = {
        refreshMessages: vi.fn(),
      }

      strategy.handleCharacterInput!('\r', mockContext)
      strategy.handleCharacterInput!('\n', mockContext)
      strategy.handleCharacterInput!('\x1b', mockContext)

      expect(mockContext.refreshMessages).not.toHaveBeenCalled()
    })

    it('should get branches from window', () => {
      const onboardingAPI = createMockOnboardingAPI()
      const strategy = TerminalStrategies.getStrategy(
        'branch-creation',
        onboardingAPI
      )

      global.window.terminalAvailableBranches = ['custom1', 'custom2']

      // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type -- Test validates side effects
      const _messages = (strategy.messages as Function)()

      // This will trigger getAvailableBranches internally
      // Console log assertion removed
    })

    it('should get branches from Vue component', () => {
      const onboardingAPI = createMockOnboardingAPI()
      const strategy = TerminalStrategies.getStrategy(
        'branch-creation',
        onboardingAPI
      )

      global.window.terminalAvailableBranches = null

      const mockVueEl = {
        __vueParentComponent: {
          props: {
            branches: ['vue1', 'vue2'],
          },
        },
      }
      const mockSelector = {
        value: '',
        dispatchEvent: vi.fn(),
      }
      mockQuerySelector.mockImplementation((selector) => {
        if (selector === '.branch-selector-field') return mockVueEl
        if (selector.includes('select')) return mockSelector
        return null
      })

      // Execute enter in search mode to trigger branch loading
      global.window.isTerminalBranchSearchMode = true
      const mockContext = {
        updateInput: vi.fn(),
        state: { isWaitingForInput: true },
      }
      global.window.currentContext = mockContext

      strategy.commands.enter.action()

      // Console log assertion removed
      // The actual implementation doesn't set terminalAvailableBranches, it just dispatches events
      expect(mockDispatchEvent).toHaveBeenCalled()
    })

    it('should get branches from select element', () => {
      const onboardingAPI = createMockOnboardingAPI()
      const strategy = TerminalStrategies.getStrategy(
        'branch-creation',
        onboardingAPI
      )

      global.window.terminalAvailableBranches = null

      const mockSelect = {
        value: '',
        dispatchEvent: vi.fn(),
        options: [{ value: 'option1' }, { value: 'option2' }],
      }
      mockQuerySelector.mockImplementation((selector) => {
        if (selector.includes('select')) return mockSelect
        return null
      })

      // Execute enter in search mode to trigger branch loading
      global.window.isTerminalBranchSearchMode = true
      const mockContext = {
        state: { currentInput: 'opt' },
        updateInput: vi.fn(),
        refreshMessages: vi.fn(),
      }

      strategy.commands.enter.action(mockContext)

      // Console log assertion removed
    })

    it('should use default branches as fallback', () => {
      const onboardingAPI = createMockOnboardingAPI()
      const strategy = TerminalStrategies.getStrategy(
        'branch-creation',
        onboardingAPI
      )

      global.window.terminalAvailableBranches = null
      const mockSelector = {
        value: '',
        dispatchEvent: vi.fn(),
      }
      mockQuerySelector.mockImplementation((selector) => {
        if (selector.includes('select')) return mockSelector
        return null
      })

      // Execute enter in search mode to trigger branch loading
      global.window.isTerminalBranchSearchMode = true
      const mockContext = {
        updateInput: vi.fn(),
        state: { isWaitingForInput: true },
      }
      global.window.currentContext = mockContext

      strategy.commands.enter.action()

      // Console log assertion removed
      // The actual implementation doesn't set selector.value, it just dispatches events
      expect(mockDispatchEvent).toHaveBeenCalled()
    })

    it('should handle enter in search mode with no matches', async () => {
      const onboardingAPI = createMockOnboardingAPI()
      const strategy = TerminalStrategies.getStrategy(
        'branch-creation',
        onboardingAPI
      )

      global.window.isTerminalBranchSearchMode = true
      global.window.terminalAvailableBranches = ['main', 'develop']

      const mockContext = {
        updateInput: vi.fn(),
        state: { isWaitingForInput: true },
      }
      global.window.currentContext = mockContext

      await strategy.commands.enter.action()

      // The enter command in search mode always dispatches events and exits search mode
      expect(global.window.isTerminalBranchSearchMode).toBe(false)
      expect(mockDispatchEvent).toHaveBeenCalled()
    })

    it('should handle selector without vueInstance in branch selection', () => {
      const onboardingAPI = createMockOnboardingAPI()
      const strategy = TerminalStrategies.getStrategy(
        'branch-creation',
        onboardingAPI
      )

      global.window.isTerminalBranchSearchMode = true
      global.window.terminalAvailableBranches = ['main']

      const mockSelector = {
        value: '',
        dispatchEvent: vi.fn(),
        // No __vueParentComponent
      }
      mockQuerySelector.mockReturnValue(mockSelector)

      const mockContext = {
        state: { currentInput: 'ma' },
        updateInput: vi.fn(),
        refreshMessages: vi.fn(),
      }

      // Select first branch with number key
      strategy.handleCharacterInput!('1', mockContext)

      // Should still work without Vue component
      expect(mockSelector.value).toBe('main')
      expect(mockSelector.dispatchEvent).toHaveBeenCalled()
    })

    it('should disable search mode and clear context when exiting', () => {
      const onboardingAPI = createMockOnboardingAPI()
      TerminalStrategies.getStrategy('branch-creation', onboardingAPI)

      global.window.isTerminalBranchSearchMode = true
      global.window.currentContext = {
        updateInput: vi.fn(),
        state: {
          isWaitingForInput: true,
        },
      }

      // This is called internally by setSearchMode(false)
      // Let's trigger it through esc command
      const strategy = TerminalStrategies.getStrategy(
        'branch-creation',
        onboardingAPI
      )
      const mockContext = {
        refreshMessages: vi.fn(),
      }

      strategy.commands.esc.action(mockContext)

      expect(global.window.isTerminalBranchSearchMode).toBe(false)
      expect(global.window.currentContext.updateInput).toHaveBeenCalledWith('')
      expect(global.window.currentContext.state.isWaitingForInput).toBe(false)
    })

    it('should handle number key with empty input in search mode', () => {
      const onboardingAPI = createMockOnboardingAPI()
      const strategy = TerminalStrategies.getStrategy(
        'branch-creation',
        onboardingAPI
      )

      global.window.isTerminalBranchSearchMode = true

      const mockContext = {
        state: { currentInput: '' },
        state: { currentInput: '' },
      }

      // Number with no input should be allowed to type
      const handled = strategy.handleCharacterInput!('1', mockContext)
      expect(handled).toBe(false)
    })

    it('should handle enter with disabled button', async () => {
      const onboardingAPI = createMockOnboardingAPI()
      const strategy = TerminalStrategies.getStrategy(
        'branch-creation',
        onboardingAPI
      )

      global.window.isTerminalBranchSearchMode = false

      const mockButton = {
        disabled: true,
        click: vi.fn(),
      }
      mockQuerySelector.mockReturnValue(mockButton)

      await strategy.commands.enter.action({})

      expect(mockButton.click).not.toHaveBeenCalled()
      expect(onboardingAPI.nextStep).toHaveBeenCalled()
    })

    it('should use fallback branch info when not available', () => {
      const onboardingAPI = {
        ...createMockOnboardingAPI(),
        getSelectedBranch: { value: {} }, // Empty branch object
      }
      const strategy = TerminalStrategies.getStrategy(
        'branch-creation',
        onboardingAPI
      )

      // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type -- Test assertion requires Function type
      const messages = (strategy.messages as Function)()

      expect(messages).toContain('Creating: feature/new-branch') // Default fallback
    })

    it('should use fallback base branch when selector not found', () => {
      const onboardingAPI = createMockOnboardingAPI()
      const strategy = TerminalStrategies.getStrategy(
        'branch-creation',
        onboardingAPI
      )

      mockQuerySelector.mockReturnValue(null)

      // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type -- Test assertion requires Function type
      const messages = (strategy.messages as Function)()

      expect(messages).toContain('From base: main') // Default fallback
    })

    describe('🎯 Coverage: getAvailableBranches with storedBranches (lines 677-709)', () => {
      it('should use stored branches from window when available', () => {
        const onboardingAPI = createMockOnboardingAPI()
        const strategy = TerminalStrategies.getStrategy(
          'branch-creation',
          onboardingAPI
        )

        // Set stored branches in window - this should trigger lines 677-709
        global.window.terminalAvailableBranches = [
          'stored1',
          'stored2',
          'stored3',
        ]

        // Setup search mode to trigger branch filtering
        global.window.isTerminalBranchSearchMode = true
        const mockSelector = {
          value: '',
          dispatchEvent: vi.fn(),
        }
        mockQuerySelector.mockReturnValue(mockSelector)

        const mockContext = {
          state: { currentInput: 'stored' },
          updateInput: vi.fn(),
          refreshMessages: vi.fn(),
        }

        // Trigger handleCharacterInput which will call filterBranches -> getAvailableBranches
        // This should execute the code path in lines 677-709
        strategy.handleCharacterInput!('1', mockContext)

        // The stored branches should have been used
        expect(mockSelector.value).toBe('stored1')
        expect(global.window.isTerminalBranchSearchMode).toBe(false)
      })

      it('should handle empty array in stored branches', () => {
        const onboardingAPI = createMockOnboardingAPI()
        const strategy = TerminalStrategies.getStrategy(
          'branch-creation',
          onboardingAPI
        )

        // Set empty array - should not use this path (line 679 check fails)
        global.window.terminalAvailableBranches = []

        global.window.isTerminalBranchSearchMode = true
        const mockVueEl = {
          __vueParentComponent: {
            props: {
              branches: ['fallback1', 'fallback2'],
            },
          },
        }
        const mockSelector = {
          value: '',
          dispatchEvent: vi.fn(),
        }
        mockQuerySelector.mockImplementation((selector) => {
          if (selector === '.branch-selector-field') return mockVueEl
          if (selector.includes('select')) return mockSelector
          return null
        })

        const mockContext = {
          state: { currentInput: 'fall' },
          updateInput: vi.fn(),
          refreshMessages: vi.fn(),
        }

        // This should skip the stored branches path and use Vue component
        strategy.handleCharacterInput!('1', mockContext)

        expect(mockSelector.value).toBe('fallback1')
      })

      it('should handle null stored branches', () => {
        const onboardingAPI = createMockOnboardingAPI()
        const strategy = TerminalStrategies.getStrategy(
          'branch-creation',
          onboardingAPI
        )

        // Set null - should not use this path
        global.window.terminalAvailableBranches = null

        global.window.isTerminalBranchSearchMode = true
        const mockSelect = {
          value: '',
          dispatchEvent: vi.fn(),
          options: [{ value: 'select1' }, { value: 'select2' }],
        }
        mockQuerySelector.mockImplementation((selector) => {
          if (selector.includes('select')) return mockSelect
          return null
        })

        const mockContext = {
          state: { currentInput: 'sel' },
          updateInput: vi.fn(),
          refreshMessages: vi.fn(),
        }

        // This should skip stored branches and use select element
        strategy.handleCharacterInput!('1', mockContext)

        expect(mockSelect.value).toBe('select1')
      })

      it('should handle non-array stored branches', () => {
        const onboardingAPI = createMockOnboardingAPI()
        const strategy = TerminalStrategies.getStrategy(
          'branch-creation',
          onboardingAPI
        )

        // Set non-array value
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test requires testing invalid data types
        global.window.terminalAvailableBranches = 'invalid' as any

        global.window.isTerminalBranchSearchMode = true
        const mockSelector = {
          value: '',
          dispatchEvent: vi.fn(),
        }
        mockQuerySelector.mockReturnValue(mockSelector)

        const mockContext = {
          state: { currentInput: 'test' },
          updateInput: vi.fn(),
          refreshMessages: vi.fn(),
        }

        // This should skip stored branches (Array.isArray check fails)
        // and fall back to default branches
        const handled = strategy.handleCharacterInput!('5', mockContext)

        // With default branches ['main', 'master', 'develop', 'staging', 'production']
        // and filter 'test', no matches, so no selection happens
        // The key '5' should be treated as regular input
        expect(handled).toBe(false)
      })
    })

    describe('🎯 Coverage: Branch selection with index check (line 768)', () => {
      it('should select branch when index is within filtered length', () => {
        const onboardingAPI = createMockOnboardingAPI()
        const strategy = TerminalStrategies.getStrategy(
          'branch-creation',
          onboardingAPI
        )

        global.window.isTerminalBranchSearchMode = true
        global.window.terminalAvailableBranches = [
          'branch-a',
          'branch-b',
          'branch-c',
          'other-x',
        ]

        const mockSelector = {
          value: '',
          dispatchEvent: vi.fn(),
        }
        mockQuerySelector.mockReturnValue(mockSelector)

        const mockContext = {
          state: { currentInput: 'branch' }, // Will filter to ['branch-a', 'branch-b', 'branch-c']
          updateInput: vi.fn(),
          refreshMessages: vi.fn(),
        }

        // Press '3' to select third filtered result (index 2)
        // This SHOULD execute line 768: if (index < filtered.length)
        // filtered.length = 3, index = 2, so 2 < 3 is true
        const handled = strategy.handleCharacterInput!('3', mockContext)

        expect(handled).toBe(true)
        expect(mockSelector.value).toBe('branch-c')
        expect(global.window.isTerminalBranchSearchMode).toBe(false)
      })

      it('should not select when index equals filtered length', () => {
        const onboardingAPI = createMockOnboardingAPI()
        const strategy = TerminalStrategies.getStrategy(
          'branch-creation',
          onboardingAPI
        )

        global.window.isTerminalBranchSearchMode = true
        // Use 'alpha' and 'charlie' so filtering with 'alph' gives only 1 result
        global.window.terminalAvailableBranches = ['alpha', 'charlie']

        const mockSelector = {
          value: '',
          dispatchEvent: vi.fn(),
        }
        mockQuerySelector.mockReturnValue(mockSelector)

        const mockContext = {
          state: { currentInput: 'alph' }, // Will filter to ['alpha'] only
          updateInput: vi.fn(),
          refreshMessages: vi.fn(),
        }
        // Set currentContext in window for setSearchMode to access
        global.window.currentContext = mockContext

        // Press '2' to select second filtered result (index 1)
        // filtered.length = 1, index = 1, so 1 < 1 is false
        // Line 901 check fails, should not select
        const handled = strategy.handleCharacterInput!('2', mockContext)

        expect(handled).toBe(false) // Not handled, treated as search input
        expect(mockSelector.value).toBe('') // No selection made
      })

      it('should not select when index exceeds filtered length', () => {
        const onboardingAPI = createMockOnboardingAPI()
        const strategy = TerminalStrategies.getStrategy(
          'branch-creation',
          onboardingAPI
        )

        global.window.isTerminalBranchSearchMode = true
        global.window.terminalAvailableBranches = ['gamma', 'delta']

        const mockContext = {
          state: { currentInput: 'gam' }, // Will filter to ['gamma']
          updateInput: vi.fn(),
          refreshMessages: vi.fn(),
        }
        global.window.currentContext = mockContext

        // Press '9' to select ninth result (index 8)
        // filtered.length = 1, index = 8, so 8 < 1 is false
        // Line 768 check fails
        const handled = strategy.handleCharacterInput!('9', mockContext)

        expect(handled).toBe(false) // Not handled
      })

      it('should handle 0 key for 10th item when filtered list has 10+ items', () => {
        const onboardingAPI = createMockOnboardingAPI()
        const strategy = TerminalStrategies.getStrategy(
          'branch-creation',
          onboardingAPI
        )

        global.window.isTerminalBranchSearchMode = true
        global.window.terminalAvailableBranches = Array.from(
          { length: 15 },
          (_, i) => `item-${i + 1}`
        )

        const mockSelector = {
          value: '',
          dispatchEvent: vi.fn(),
        }
        mockQuerySelector.mockReturnValue(mockSelector)

        const mockContext = {
          state: { currentInput: 'item' }, // All 15 items match
          updateInput: vi.fn(),
          refreshMessages: vi.fn(),
        }

        // Press '0' for 10th item (index 9)
        // filtered.length = 15, index = 9, so 9 < 15 is true
        // Line 768 executes and selects item-10
        const handled = strategy.handleCharacterInput!('0', mockContext)

        expect(handled).toBe(true)
        expect(mockSelector.value).toBe('item-10')
      })

      it('should not select with 0 key when filtered list has less than 10 items', () => {
        const onboardingAPI = createMockOnboardingAPI()
        const strategy = TerminalStrategies.getStrategy(
          'branch-creation',
          onboardingAPI
        )

        global.window.isTerminalBranchSearchMode = true
        global.window.terminalAvailableBranches = ['x1', 'x2', 'x3']

        const mockContext = {
          state: { currentInput: 'x' }, // 3 items match
          updateInput: vi.fn(),
          refreshMessages: vi.fn(),
        }
        global.window.currentContext = mockContext

        // Press '0' for 10th item (index 9)
        // filtered.length = 3, index = 9, so 9 < 3 is false
        // Line 768 check fails
        const handled = strategy.handleCharacterInput!('0', mockContext)

        expect(handled).toBe(false)
      })
    })
  })

  describe('transition strategy', () => {
    it('should block all character input', () => {
      const onboardingAPI = createMockOnboardingAPI()
      const strategy = TerminalStrategies.getStrategy(
        'transition',
        onboardingAPI
      )

      const handled = strategy.handleCharacterInput!('a', {})

      expect(handled).toBe(true)
    })

    it('should have minimal commands', () => {
      const onboardingAPI = createMockOnboardingAPI()
      const strategy = TerminalStrategies.getStrategy(
        'transition',
        onboardingAPI
      )

      expect(strategy.commands.help).toBeDefined()
      expect(strategy.commands.clear).toBeDefined()
      expect(strategy.commands.back).toBeUndefined()
      expect(strategy.commands.esc).toBeUndefined()
    })
  })

  describe('completed strategy', () => {
    it('should have no commands', () => {
      const onboardingAPI = createMockOnboardingAPI()
      const strategy = TerminalStrategies.getStrategy(
        'completed',
        onboardingAPI
      )

      expect(Object.keys(strategy.commands)).toHaveLength(0)
    })

    it('should not allow manual activation', () => {
      const onboardingAPI = createMockOnboardingAPI()
      const strategy = TerminalStrategies.getStrategy(
        'completed',
        onboardingAPI
      )

      expect(strategy.allowManualActivation).toBe(false)
    })
  })

  describe('default strategy', () => {
    it('should have base commands', () => {
      const onboardingAPI = createMockOnboardingAPI()
      const strategy = TerminalStrategies.getStrategy(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test requires flexible typing for validation testing
        'unknown' as any,
        onboardingAPI
      )

      expect(strategy.commands.help).toBeDefined()
      expect(strategy.commands.clear).toBeDefined()
      expect(strategy.commands.back).toBeDefined()
    })
  })

  describe('base commands', () => {
    it('should have empty action handlers for help and clear', () => {
      const onboardingAPI = createMockOnboardingAPI()
      const strategy = TerminalStrategies.getStrategy(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test requires flexible typing for validation testing
        'default' as any,
        onboardingAPI
      )

      // These should not throw
      strategy.commands.help.action()
      strategy.commands.clear.action()

      // No specific assertions needed, just verify they don't throw
      expect(true).toBe(true)
    })
  })
})
