import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { nextTick } from 'vue'
import type { OnboardingTask, ProjectInfo, BranchConfig } from './useOnboarding'

// Create mock functions that can be controlled per test
const mockOpenProject = vi.fn()

// Mock useTaskManager at module level
vi.mock('./useTaskManager', () => ({
  useTaskManager: vi.fn(() => ({
    openProject: mockOpenProject,
  })),
}))

// Mock ProjectInfo for testing
const mockProjectInfo: ProjectInfo = {
  path: '/path/to/project',
  packageJson: '{"name": "test-project", "version": "1.0.0"}',
  name: 'test-project',
  version: '1.0.0',
  description: 'A test project for onboarding',
  scripts: { build: 'vite build', dev: 'vite dev' },
  dependencies: { vue: '^3.0.0' },
  devDependencies: { vite: '^4.0.0' },
  framework: 'Vue',
  packageManager: 'npm',
}

// Mock BranchConfig
const mockBranchConfig: BranchConfig = {
  name: 'feature/test-branch',
  base: 'main',
  agent: 'test-agent',
}

// Mock localStorage for this test file
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
}

// Mock window APIs
const mockWindowAPIs = {
  storageAPI: {
    getWorkspace: vi.fn(),
  },
  electronAPI: {
    sendMessage: vi.fn(),
  },
  location: {
    search: '',
  },
}

describe('useOnboarding', () => {
  beforeEach(async () => {
    // Reset all mocks
    vi.clearAllMocks()
    vi.clearAllTimers()

    // Reset modules to clear singleton state
    vi.resetModules()

    // Mock openProject for each test
    mockOpenProject.mockResolvedValue(undefined)

    // Set up mocks
    Object.defineProperty(global, 'localStorage', {
      value: localStorageMock,
      writable: true,
      configurable: true,
    })

    Object.defineProperty(global, 'window', {
      value: {
        ...mockWindowAPIs,
        location: { search: '' },
      },
      writable: true,
      configurable: true,
    })

    // Reset localStorage mock
    localStorageMock.getItem.mockReturnValue(null)
    localStorageMock.setItem.mockClear()
    localStorageMock.removeItem.mockClear()

    // Reset window mocks
    mockWindowAPIs.storageAPI.getWorkspace.mockResolvedValue(null)
    mockWindowAPIs.electronAPI.sendMessage.mockClear()
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.clearAllMocks()
  })

  describe('initialization', () => {
    it('should initialize with default state when no localStorage or workspace', async () => {
      // Import after mocks are set
      const { useOnboarding } = await import('./useOnboarding')
      const onboarding = useOnboarding()

      // Wait for async initialization
      await new Promise((resolve) => setTimeout(resolve, 500))

      expect(onboarding.currentStep.value).toBe('welcome')
      expect(onboarding.selectedTask.value).toBe(null)
      expect(onboarding.selectedProject.value).toBe(null)
      expect(onboarding.isFirstTime.value).toBe(true)
    })

    it('should load state from localStorage when available', async () => {
      const storedState = {
        isFirstTime: false,
        completedAt: '2024-01-01T00:00:00Z',
        currentStep: 'completed',
        selectedTask: null,
        selectedProject: null,
        selectedBranch: null,
      }

      localStorageMock.getItem.mockReturnValue(JSON.stringify(storedState))

      const { useOnboarding } = await import('./useOnboarding')
      const onboarding = useOnboarding()
      await new Promise((resolve) => setTimeout(resolve, 500))

      expect(onboarding.currentStep.value).toBe('completed')
      expect(onboarding.completedAt.value).toBe('2024-01-01T00:00:00Z')
    })

    it('should activate onboarding when forceOnboarding query param is set', async () => {
      window.location.search = '?forceOnboarding=true'

      const { useOnboarding } = await import('./useOnboarding')
      const onboarding = useOnboarding()
      await new Promise((resolve) => setTimeout(resolve, 500))

      expect(onboarding.currentStep.value).toBe('welcome')
      expect(onboarding.isFirstTime.value).toBe(true)
    })

    it('should handle localStorage errors gracefully', async () => {
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('localStorage error')
      })

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const { useOnboarding } = await import('./useOnboarding')

      const _onboarding = useOnboarding()
      await new Promise((resolve) => setTimeout(resolve, 500))

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to load onboarding state'),
        expect.any(Error)
      )
      consoleSpy.mockRestore()
    })

    it('should handle missing localStorage gracefully', async () => {
      Object.defineProperty(global, 'localStorage', {
        value: undefined,
        writable: true,
        configurable: true,
      })

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      const { useOnboarding } = await import('./useOnboarding')

      const _onboarding = useOnboarding()
      await new Promise((resolve) => setTimeout(resolve, 500))

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('localStorage not available')
      )
      consoleSpy.mockRestore()
    })

    it('should keep IDE view when existing workspace found', async () => {
      mockWindowAPIs.storageAPI.getWorkspace.mockResolvedValue({
        project: mockProjectInfo,
      })

      const { useOnboarding } = await import('./useOnboarding')
      const onboarding = useOnboarding()
      await new Promise((resolve) => setTimeout(resolve, 500))

      expect(onboarding.currentStep.value).toBe('completed')
      expect(onboarding.completedAt.value).toBeTruthy()
    })

    it('should handle storageAPI errors gracefully', async () => {
      mockWindowAPIs.storageAPI.getWorkspace.mockRejectedValue(
        new Error('Storage error')
      )

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const { useOnboarding } = await import('./useOnboarding')
      const onboarding = useOnboarding()
      await new Promise((resolve) => setTimeout(resolve, 500))

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to check workspace'),
        expect.any(Error)
      )
      expect(onboarding.currentStep.value).toBe('welcome')
      consoleSpy.mockRestore()
    })

    it('should activate onboarding when no storage API available', async () => {
      window.storageAPI = undefined

      const { useOnboarding } = await import('./useOnboarding')
      const onboarding = useOnboarding()
      await new Promise((resolve) => setTimeout(resolve, 500))

      expect(onboarding.currentStep.value).toBe('welcome')
      expect(onboarding.isFirstTime.value).toBe(true)
    })
  })

  describe('step navigation', () => {
    it('should navigate through all steps correctly', async () => {
      const { useOnboarding, ONBOARDING_TASKS: _ONBOARDING_TASKS } =
        await import('./useOnboarding')
      const onboarding = useOnboarding()

      // Wait for initialization then reset
      await new Promise((resolve) => setTimeout(resolve, 500))
      onboarding.resetOnboarding()
      await nextTick()

      // Welcome -> Project Selection
      expect(onboarding.currentStep.value).toBe('welcome')
      onboarding.nextStep()
      expect(onboarding.currentStep.value).toBe('project-selection')

      // Project Selection -> Task Selector (requires project)
      onboarding.selectProject(mockProjectInfo)
      onboarding.nextStep()
      expect(onboarding.currentStep.value).toBe('task-selector')

      // Task Selector -> Task Selection (creating new task)
      onboarding.nextStep()
      expect(onboarding.currentStep.value).toBe('task-selection')
      expect(onboarding.isCreatingNewTask.value).toBe(true)

      // Task Selection -> Task Detail (requires task)
      onboarding.selectTask('create-feature')
      onboarding.nextStep()
      expect(onboarding.currentStep.value).toBe('task-detail')

      // Task Detail -> Branch Creation
      onboarding.nextStep()
      expect(onboarding.currentStep.value).toBe('branch-creation')

      // Branch Creation -> Transition
      onboarding.selectBranch(mockBranchConfig)
      onboarding.nextStep()
      expect(onboarding.currentStep.value).toBe('transition')

      // Transition -> Complete
      await onboarding.completeOnboarding()
      expect(onboarding.currentStep.value).toBe('completed')
    })

    it('should handle existing branch workflow', async () => {
      const { useOnboarding } = await import('./useOnboarding')
      const onboarding = useOnboarding()

      // Wait for initialization then reset
      await new Promise((resolve) => setTimeout(resolve, 500))
      onboarding.resetOnboarding()

      onboarding.nextStep() // to project-selection
      onboarding.selectProject(mockProjectInfo)
      onboarding.nextStep() // to task-selector

      // Select existing branch instead of creating new task
      onboarding.selectBranch(mockBranchConfig)
      onboarding.nextStep()

      expect(onboarding.currentStep.value).toBe('transition')
      expect(onboarding.isCreatingNewTask.value).toBe(false)
    })

    it('should navigate backwards correctly', async () => {
      const { useOnboarding } = await import('./useOnboarding')
      const onboarding = useOnboarding()

      // Wait for initialization then reset
      await new Promise((resolve) => setTimeout(resolve, 500))
      onboarding.resetOnboarding()

      // Go forward
      onboarding.nextStep() // to project-selection
      onboarding.selectProject(mockProjectInfo)
      onboarding.nextStep() // to task-selector
      onboarding.nextStep() // to task-selection
      onboarding.selectTask('create-feature')
      onboarding.nextStep() // to task-detail
      onboarding.nextStep() // to branch-creation
      onboarding.selectBranch(mockBranchConfig)
      onboarding.nextStep() // to transition

      // Go backward
      onboarding.previousStep()
      expect(onboarding.currentStep.value).toBe('branch-creation')

      onboarding.previousStep()
      expect(onboarding.currentStep.value).toBe('task-detail')

      onboarding.previousStep()
      expect(onboarding.currentStep.value).toBe('task-selection')

      onboarding.previousStep()
      expect(onboarding.currentStep.value).toBe('task-selector')
      expect(onboarding.selectedTask.value).toBe(null)

      onboarding.previousStep()
      expect(onboarding.currentStep.value).toBe('project-selection')

      onboarding.previousStep()
      expect(onboarding.currentStep.value).toBe('welcome')
    })

    it('should not proceed when canProceedToNext is false', async () => {
      const { useOnboarding } = await import('./useOnboarding')
      const onboarding = useOnboarding()

      // Wait for initialization then reset
      await new Promise((resolve) => setTimeout(resolve, 500))
      onboarding.resetOnboarding()

      // Go to project-selection
      onboarding.nextStep()
      expect(onboarding.currentStep.value).toBe('project-selection')

      // Try to proceed without selecting project
      expect(onboarding.canProceedToNext.value).toBe(false)
      onboarding.nextStep()
      expect(onboarding.currentStep.value).toBe('project-selection') // Should not move
    })

    it('should handle goToStep navigation', async () => {
      const { useOnboarding } = await import('./useOnboarding')
      const onboarding = useOnboarding()

      // Wait for initialization then reset
      await new Promise((resolve) => setTimeout(resolve, 500))
      onboarding.resetOnboarding()

      // Navigate forward first
      onboarding.nextStep() // to project-selection
      onboarding.selectProject(mockProjectInfo)
      onboarding.nextStep() // to task-selector
      onboarding.nextStep() // to task-selection
      onboarding.selectTask('create-feature')
      onboarding.nextStep() // to task-detail

      // Go back to earlier step
      onboarding.goToStep('project-selection')
      expect(onboarding.currentStep.value).toBe('project-selection')

      // Data after this step should be cleared
      expect(onboarding.selectedTask.value).toBe(null)
      expect(onboarding.isCreatingNewTask.value).toBe(false)

      // Cannot go forward to a step we haven't reached
      onboarding.goToStep('branch-creation')
      expect(onboarding.currentStep.value).toBe('project-selection') // Should not move
    })
  })

  describe('data selection', () => {
    it('should select and get task correctly', async () => {
      const { useOnboarding } = await import('./useOnboarding')
      const onboarding = useOnboarding()

      // Wait for initialization
      await new Promise((resolve) => setTimeout(resolve, 500))

      onboarding.selectTask('create-feature')
      expect(onboarding.selectedTask.value).toBe('create-feature')
      expect(onboarding.isCreatingNewTask.value).toBe(true)

      const selectedTaskOption = onboarding.getSelectedTask.value
      expect(selectedTaskOption?.id).toBe('create-feature')
      expect(selectedTaskOption?.title).toBe('Create a new Feature')
    })

    it('should select project correctly', async () => {
      const { useOnboarding } = await import('./useOnboarding')
      const onboarding = useOnboarding()

      // Wait for initialization
      await new Promise((resolve) => setTimeout(resolve, 500))

      onboarding.selectProject(mockProjectInfo)
      expect(onboarding.selectedProject.value).toEqual(mockProjectInfo)
    })

    it('should select branch correctly', async () => {
      const { useOnboarding } = await import('./useOnboarding')
      const onboarding = useOnboarding()

      // Wait for initialization
      await new Promise((resolve) => setTimeout(resolve, 500))

      onboarding.selectBranch(mockBranchConfig)
      expect(onboarding.selectedBranch.value).toEqual(mockBranchConfig)
      expect(onboarding.isCreatingNewTask.value).toBe(false)
    })

    it('should get task by ID correctly', async () => {
      const { useOnboarding } = await import('./useOnboarding')
      const onboarding = useOnboarding()

      // Wait for initialization
      await new Promise((resolve) => setTimeout(resolve, 500))

      const task = onboarding.getTaskById('fix-bug')
      expect(task?.id).toBe('fix-bug')
      expect(task?.title).toBe('Fix a Bug')

      const notFound = onboarding.getTaskById('non-existent' as OnboardingTask)
      expect(notFound).toBeUndefined()
    })
  })

  describe('completion and reset', () => {
    it('should complete onboarding with task and save workspace', async () => {
      mockOpenProject.mockResolvedValue(undefined)

      const { useOnboarding } = await import('./useOnboarding')
      const onboarding = useOnboarding()

      // Wait for initialization
      await new Promise((resolve) => setTimeout(resolve, 500))
      onboarding.selectProject(mockProjectInfo)
      onboarding.selectTask('fix-bug')
      onboarding.selectBranch(mockBranchConfig)

      await onboarding.completeOnboarding()

      expect(mockOpenProject).toHaveBeenCalledWith(
        expect.objectContaining({
          path: mockProjectInfo.path,
          name: mockProjectInfo.name,
        }),
        expect.objectContaining({
          branchName: mockBranchConfig.name,
          taskType: 'bug',
        })
      )

      expect(onboarding.currentStep.value).toBe('completed')
      expect(onboarding.completedAt.value).toBeTruthy()
      expect(onboarding.isFirstTime.value).toBe(false)
    })

    it('should handle different task types in completion', async () => {
      mockOpenProject.mockResolvedValue(undefined)

      const { useOnboarding } = await import('./useOnboarding')
      const onboarding = useOnboarding()

      // Wait for initialization
      await new Promise((resolve) => setTimeout(resolve, 500))

      const testCases = [
        { task: 'create-feature', expectedType: 'feature' },
        { task: 'improve-documentation', expectedType: 'docs' },
        { task: 'perform-maintenance', expectedType: 'maintenance' },
        { task: 'refactor-code', expectedType: 'refactor' },
      ]

      for (const { task, expectedType } of testCases) {
        mockOpenProject.mockClear()
        onboarding.resetOnboarding()
        onboarding.selectProject(mockProjectInfo)
        onboarding.selectTask(task as OnboardingTask)
        onboarding.selectBranch(mockBranchConfig)

        await onboarding.completeOnboarding()

        expect(mockOpenProject).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            taskType: expectedType,
          })
        )
      }
    })

    it('should handle completion errors gracefully', async () => {
      mockOpenProject.mockRejectedValue(new Error('Save failed'))

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const { useOnboarding } = await import('./useOnboarding')
      const onboarding = useOnboarding()

      // Wait for initialization
      await new Promise((resolve) => setTimeout(resolve, 500))
      onboarding.selectProject(mockProjectInfo)
      onboarding.selectTask('create-feature')
      onboarding.selectBranch(mockBranchConfig)

      await onboarding.completeOnboarding()

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to save workspace'),
        expect.any(Error)
      )

      // Should still complete onboarding despite error
      expect(onboarding.currentStep.value).toBe('completed')
      consoleSpy.mockRestore()
    })

    it('should reset onboarding correctly', async () => {
      const { useOnboarding } = await import('./useOnboarding')
      const onboarding = useOnboarding()

      // Wait for initialization
      await new Promise((resolve) => setTimeout(resolve, 500))

      // Set some state
      onboarding.selectProject(mockProjectInfo)
      onboarding.selectTask('create-feature')
      onboarding.selectBranch(mockBranchConfig)

      // Reset
      onboarding.resetOnboarding()

      expect(onboarding.currentStep.value).toBe('welcome')
      expect(onboarding.selectedTask.value).toBe(null)
      expect(onboarding.selectedProject.value).toBe(null)
      expect(onboarding.selectedBranch.value).toBe(null)
      expect(onboarding.isFirstTime.value).toBe(true)
      expect(onboarding.completedAt.value).toBe(null)
      expect(onboarding.isCreatingNewTask.value).toBe(false)
    })

    it('should trigger onboarding correctly', async () => {
      const { useOnboarding } = await import('./useOnboarding')
      const onboarding = useOnboarding()

      // Wait for initialization
      await new Promise((resolve) => setTimeout(resolve, 500))

      // Complete first
      onboarding.currentStep.value = 'completed'

      // Trigger
      onboarding.triggerOnboarding()

      expect(onboarding.currentStep.value).toBe('welcome')
      expect(onboarding.isFirstTime.value).toBe(true)
    })

    it('should clear localStorage correctly', async () => {
      const { useOnboarding } = await import('./useOnboarding')
      const onboarding = useOnboarding()

      // Wait for initialization
      await new Promise((resolve) => setTimeout(resolve, 500))

      onboarding.clearOnboardingStorage()

      expect(localStorageMock.removeItem).toHaveBeenCalledWith(
        'hatcher-onboarding'
      )
      expect(onboarding.currentStep.value).toBe('welcome')
    })

    it('should handle localStorage removal errors', async () => {
      localStorageMock.removeItem.mockImplementation(() => {
        throw new Error('Remove failed')
      })

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const { useOnboarding } = await import('./useOnboarding')
      const onboarding = useOnboarding()

      // Wait for initialization
      await new Promise((resolve) => setTimeout(resolve, 500))
      onboarding.clearOnboardingStorage()

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to clear onboarding localStorage'),
        expect.any(Error)
      )
      consoleSpy.mockRestore()
    })
  })

  describe('computed properties', () => {
    it('should compute isOnboardingActive correctly', async () => {
      const { useOnboarding } = await import('./useOnboarding')
      const onboarding = useOnboarding()

      // Wait for initialization
      await new Promise((resolve) => setTimeout(resolve, 500))

      // The onboarding should start in 'welcome' state since no workspace is found
      expect(onboarding.currentStep.value).toBe('welcome')
      expect(onboarding.isOnboardingActive.value).toBe(true)

      // Test: completed step should not be active
      await onboarding.completeOnboarding()
      await nextTick()
      expect(onboarding.currentStep.value).toBe('completed')
      expect(onboarding.isOnboardingActive.value).toBe(false)

      // Test: resetting should make it active again
      onboarding.resetOnboarding()
      await nextTick()
      expect(onboarding.currentStep.value).toBe('welcome')
      expect(onboarding.isOnboardingActive.value).toBe(true)

      // Test: transition step should also be active
      onboarding.currentStep.value = 'transition'
      await nextTick()
      expect(onboarding.isOnboardingActive.value).toBe(true)
    })

    it('should compute canProceedToNext for all steps', async () => {
      const { useOnboarding } = await import('./useOnboarding')
      const onboarding = useOnboarding()

      // Wait for initialization then reset
      await new Promise((resolve) => setTimeout(resolve, 500))
      onboarding.resetOnboarding()

      // Welcome
      expect(onboarding.canProceedToNext.value).toBe(true)

      // Project Selection (needs project)
      onboarding.nextStep()
      expect(onboarding.canProceedToNext.value).toBe(false)
      onboarding.selectProject(mockProjectInfo)
      expect(onboarding.canProceedToNext.value).toBe(true)

      // Task Selector
      onboarding.nextStep()
      expect(onboarding.canProceedToNext.value).toBe(true)

      // Task Selection (needs task)
      onboarding.nextStep()
      expect(onboarding.canProceedToNext.value).toBe(false)
      onboarding.selectTask('create-feature')
      expect(onboarding.canProceedToNext.value).toBe(true)

      // Task Detail
      onboarding.nextStep()
      expect(onboarding.canProceedToNext.value).toBe(true)

      // Branch Creation
      onboarding.nextStep()
      expect(onboarding.canProceedToNext.value).toBe(true)

      // Transition
      onboarding.nextStep()
      expect(onboarding.canProceedToNext.value).toBe(true)
    })

    it('should compute showWelcomeTutorial correctly', async () => {
      const { useOnboarding } = await import('./useOnboarding')
      const onboarding = useOnboarding()

      // Wait for initialization
      await new Promise((resolve) => setTimeout(resolve, 500))

      onboarding.resetOnboarding()
      expect(onboarding.showWelcomeTutorial.value).toBe(true)

      onboarding.nextStep()
      expect(onboarding.showWelcomeTutorial.value).toBe(false)
    })

    it('should compute recent projects', async () => {
      const { useOnboarding } = await import('./useOnboarding')
      const onboarding = useOnboarding()

      // Wait for initialization
      await new Promise((resolve) => setTimeout(resolve, 500))

      const projects = onboarding.recentProjects.value
      expect(projects.length).toBeGreaterThan(0)
      expect(projects[0]).toHaveProperty('name')
      expect(projects[0]).toHaveProperty('path')
    })
  })

  describe('AI context', () => {
    it('should generate correct AI context for all task types', async () => {
      const { useOnboarding } = await import('./useOnboarding')
      const onboarding = useOnboarding()

      // Wait for initialization
      await new Promise((resolve) => setTimeout(resolve, 500))

      const testCases = [
        {
          task: 'create-feature',
          expectedText: 'create new features',
        },
        {
          task: 'fix-bug',
          expectedText: 'fix bugs',
        },
        {
          task: 'improve-documentation',
          expectedText: 'improve documentation',
        },
        {
          task: 'perform-maintenance',
          expectedText: 'maintenance tasks',
        },
        {
          task: 'refactor-code',
          expectedText: 'refactor code',
        },
      ]

      for (const { task, expectedText } of testCases) {
        onboarding.selectTask(task as OnboardingTask)
        const context = onboarding.getInitialAIContext()
        expect(context).toContain(expectedText)
      }
    })

    it('should return empty context when no task selected', async () => {
      const { useOnboarding } = await import('./useOnboarding')
      const onboarding = useOnboarding()

      // Wait for initialization
      await new Promise((resolve) => setTimeout(resolve, 500))

      const context = onboarding.getInitialAIContext()
      expect(context).toBe('')
    })
  })

  describe('state persistence', () => {
    it('should save state to localStorage on changes', async () => {
      const { useOnboarding } = await import('./useOnboarding')
      const onboarding = useOnboarding()

      // Wait for initialization
      await new Promise((resolve) => setTimeout(resolve, 500))

      onboarding.selectProject(mockProjectInfo)
      await nextTick()

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'hatcher-onboarding',
        expect.stringContaining('"selectedProject"')
      )
    })

    it('should handle localStorage save errors gracefully', async () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('Save failed')
      })

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const { useOnboarding } = await import('./useOnboarding')
      const onboarding = useOnboarding()

      // Wait for initialization
      await new Promise((resolve) => setTimeout(resolve, 500))
      onboarding.selectTask('create-feature')
      await nextTick()

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to save onboarding state'),
        expect.any(Error)
      )
      consoleSpy.mockRestore()
    })

    it('should not save when localStorage is not available', async () => {
      Object.defineProperty(global, 'localStorage', {
        value: undefined,
        writable: true,
        configurable: true,
      })

      const { useOnboarding } = await import('./useOnboarding')
      const onboarding = useOnboarding()

      // Wait for initialization
      await new Promise((resolve) => setTimeout(resolve, 500))
      onboarding.selectTask('create-feature')
      await nextTick()

      // Should not throw
      expect(true).toBe(true)
    })
  })

  describe('electron integration', () => {
    it.skip('should send step changes to Electron', async () => {
      // Skip: This functionality was removed from useOnboarding
      // The step change notification to Electron is no longer implemented
      const { useOnboarding } = await import('./useOnboarding')
      const onboarding = useOnboarding()

      // Wait for initialization then reset
      await new Promise((resolve) => setTimeout(resolve, 500))
      onboarding.resetOnboarding()

      await nextTick()

      expect(mockWindowAPIs.electronAPI.sendMessage).toHaveBeenCalledWith(
        'terminal-step-change',
        'welcome'
      )

      onboarding.nextStep()
      await nextTick()

      expect(mockWindowAPIs.electronAPI.sendMessage).toHaveBeenCalledWith(
        'terminal-step-change',
        'project-selection'
      )
    })

    it('should handle missing electronAPI gracefully', async () => {
      window.electronAPI = undefined

      const { useOnboarding } = await import('./useOnboarding')
      const onboarding = useOnboarding()

      // Wait for initialization
      await new Promise((resolve) => setTimeout(resolve, 500))
      onboarding.nextStep()

      // Should not throw
      await nextTick()
      expect(true).toBe(true)
    })
  })

  describe('clearStepsAfter', () => {
    it('should clear data correctly based on step index', async () => {
      const { useOnboarding } = await import('./useOnboarding')
      const onboarding = useOnboarding()

      // Wait for initialization
      await new Promise((resolve) => setTimeout(resolve, 500))

      // Set all data
      onboarding.selectProject(mockProjectInfo)
      onboarding.selectTask('create-feature')
      onboarding.selectBranch(mockBranchConfig)
      onboarding.isCreatingNewTask.value = true

      // Go to branch-creation step
      onboarding.goToStep('welcome')
      onboarding.nextStep() // project-selection
      onboarding.nextStep() // task-selector
      onboarding.nextStep() // task-selection
      onboarding.nextStep() // task-detail
      onboarding.nextStep() // branch-creation

      // Go back to task-selector
      onboarding.goToStep('task-selector')

      // Task and branch should be cleared
      expect(onboarding.selectedTask.value).toBe(null)
      expect(onboarding.selectedBranch.value).toBe(null)
      expect(onboarding.isCreatingNewTask.value).toBe(false)

      // Project should remain
      expect(onboarding.selectedProject.value).toEqual(mockProjectInfo)
    })
  })

  describe('constants', () => {
    it('should export ONBOARDING_TASKS correctly', async () => {
      const { useOnboarding, ONBOARDING_TASKS } = await import(
        './useOnboarding'
      )
      const onboarding = useOnboarding()

      // Wait for initialization
      await new Promise((resolve) => setTimeout(resolve, 500))

      expect(onboarding.ONBOARDING_TASKS).toEqual(ONBOARDING_TASKS)
      expect(onboarding.ONBOARDING_TASKS.length).toBe(5)
    })
  })

  describe('isCheckingWorkspace', () => {
    it('should track workspace checking state', async () => {
      const { useOnboarding } = await import('./useOnboarding')
      const onboarding = useOnboarding()

      // Initially should be false after initialization
      await new Promise((resolve) => setTimeout(resolve, 500))
      expect(onboarding.isCheckingWorkspace.value).toBe(false)
    })
  })

  describe('edge cases', () => {
    it('should handle completing without project or branch', async () => {
      const { useOnboarding } = await import('./useOnboarding')
      const onboarding = useOnboarding()

      // Wait for initialization
      await new Promise((resolve) => setTimeout(resolve, 500))

      await onboarding.completeOnboarding()

      expect(onboarding.currentStep.value).toBe('completed')
      expect(onboarding.completedAt.value).toBeTruthy()
    })

    it('should handle window undefined in non-browser environment', async () => {
      const originalWindow = global.window

      // @ts-expect-error -- Testing missing window scenario
      delete global.window

      const { useOnboarding } = await import('./useOnboarding')
      const onboarding = useOnboarding()

      // Should not crash on nextStep
      onboarding.nextStep()

      // Should not throw
      expect(true).toBe(true)

      // Restore window
      global.window = originalWindow
    })
  })
})
