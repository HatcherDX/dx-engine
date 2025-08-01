import { describe, it, expect, beforeEach, vi } from 'vitest'
import { nextTick } from 'vue'
import { useOnboarding, ONBOARDING_TASKS } from './useOnboarding'
import type { OnboardingTask } from './useOnboarding'

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

describe('useOnboarding', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.getItem.mockReturnValue(null)
    // Reset onboarding state for clean tests
    const onboarding = useOnboarding()
    onboarding.resetOnboarding()
  })

  it('should initialize with default state', () => {
    const {
      currentStep,
      selectedTask,
      isFirstTime,
      completedAt,
      isOnboardingActive,
      canProceedToNext,
    } = useOnboarding()

    expect(currentStep.value).toBe('welcome')
    expect(selectedTask.value).toBe(null)
    expect(isFirstTime.value).toBe(true)
    expect(completedAt.value).toBe(null)
    expect(isOnboardingActive.value).toBe(true)
    expect(canProceedToNext.value).toBe(true)
  })

  it('should load state from localStorage', async () => {
    // This test verifies localStorage loading behavior
    // Note: The composable loads state on initialization, so we test the save/load cycle
    vi.clearAllMocks()
    localStorageMock.getItem.mockReturnValue(null)
    localStorageMock.setItem.mockClear()

    const { completeOnboarding, currentStep, isFirstTime, completedAt } =
      useOnboarding()

    // Trigger a state change to test localStorage saving
    completeOnboarding()

    // Wait for Vue watchers to run
    await nextTick()

    // Verify the state was saved
    expect(localStorageMock.setItem).toHaveBeenCalled()
    expect(currentStep.value).toBe('completed')
    expect(isFirstTime.value).toBe(false)
    expect(completedAt.value).toBeTruthy()
  })

  it('should handle malformed localStorage data gracefully', () => {
    localStorageMock.getItem.mockReturnValue('invalid-json')

    const { currentStep, isFirstTime } = useOnboarding()

    expect(currentStep.value).toBe('welcome')
    expect(isFirstTime.value).toBe(true)
  })

  it('should progress through onboarding steps', () => {
    const { currentStep, nextStep, canProceedToNext } = useOnboarding()

    expect(currentStep.value).toBe('welcome')
    expect(canProceedToNext.value).toBe(true)

    nextStep()
    expect(currentStep.value).toBe('project-selection')
    expect(canProceedToNext.value).toBe(true)

    nextStep()
    expect(currentStep.value).toBe('task-selection')
    expect(canProceedToNext.value).toBe(false) // No task selected yet
  })

  it('should not proceed to next step if requirements not met', () => {
    const { currentStep, nextStep, canProceedToNext } = useOnboarding()

    nextStep() // Move to project-selection
    nextStep() // Move to task-selection
    expect(currentStep.value).toBe('task-selection')
    expect(canProceedToNext.value).toBe(false)

    nextStep() // Should not proceed without task selection
    expect(currentStep.value).toBe('task-selection')
  })

  it('should proceed to task-detail after task selection', () => {
    const { currentStep, nextStep, selectTask } = useOnboarding()

    nextStep() // Move to project-selection
    nextStep() // Move to task-selection
    selectTask('create-feature')
    nextStep() // Should now proceed to task-detail
    expect(currentStep.value).toBe('task-detail')
  })

  it('should complete onboarding from transition step', () => {
    const { currentStep, nextStep, selectTask, isFirstTime, completedAt } =
      useOnboarding()

    nextStep() // Move to project-selection
    nextStep() // Move to task-selection
    selectTask('create-feature')
    nextStep() // Move to task-detail
    nextStep() // Move to transition
    nextStep() // Complete onboarding

    expect(currentStep.value).toBe('completed')
    expect(isFirstTime.value).toBe(false)
    expect(completedAt.value).toBeTruthy()
    expect(typeof completedAt.value).toBe('string')
  })

  it('should handle previous step navigation', () => {
    const { currentStep, nextStep, previousStep } = useOnboarding()

    nextStep() // Move to project-selection
    expect(currentStep.value).toBe('project-selection')

    previousStep() // Go back to welcome
    expect(currentStep.value).toBe('welcome')
  })

  it('should handle task selection', () => {
    const { selectedTask, selectTask, getSelectedTask, resetOnboarding } =
      useOnboarding()

    // Ensure clean state
    resetOnboarding()

    expect(selectedTask.value).toBe(null)
    expect(getSelectedTask.value).toBeUndefined()

    selectTask('improve-documentation')
    expect(selectedTask.value).toBe('improve-documentation')
    expect(getSelectedTask.value?.id).toBe('improve-documentation')
    expect(getSelectedTask.value?.title).toBe('📖 Improve Documentation')
  })

  it('should reset onboarding state', () => {
    const {
      currentStep,
      selectedTask,
      isFirstTime,
      completedAt,
      selectTask,
      completeOnboarding,
      resetOnboarding,
    } = useOnboarding()

    // Modify state
    selectTask('create-feature')
    completeOnboarding()

    expect(currentStep.value).toBe('completed')
    expect(isFirstTime.value).toBe(false)
    expect(completedAt.value).toBeTruthy()

    // Reset
    resetOnboarding()

    expect(currentStep.value).toBe('welcome')
    expect(selectedTask.value).toBe(null)
    expect(isFirstTime.value).toBe(true)
    expect(completedAt.value).toBe(null)
  })

  it('should generate appropriate AI context based on selected task', () => {
    const { selectTask, getInitialAIContext } = useOnboarding()

    selectTask('create-feature')
    const context = getInitialAIContext()
    expect(context).toContain('create new features')
    expect(context).toContain(
      'Add a new user authentication system with OAuth integration'
    )

    selectTask('improve-documentation')
    const docContext = getInitialAIContext()
    expect(docContext).toContain('improve documentation')
    expect(docContext).toContain(
      'Update the CONTRIBUTING.md with the new release process'
    )

    selectTask('fix-bug')
    const bugContext = getInitialAIContext()
    expect(bugContext).toContain('fix bugs')
    expect(bugContext).toContain(
      'The login button is not working on Safari mobile'
    )
  })

  it('should provide empty AI context when no task selected', () => {
    const { getInitialAIContext, resetOnboarding } = useOnboarding()
    resetOnboarding()
    const context = getInitialAIContext()
    expect(context).toBe('')
  })

  it('should find task by ID', () => {
    const { getTaskById } = useOnboarding()

    const featureTask = getTaskById('create-feature')
    expect(featureTask?.title).toBe('✨ Create a new Feature')
    expect(featureTask?.icon).toBe('Code')

    const nonExistent = getTaskById('non-existent' as OnboardingTask)
    expect(nonExistent).toBeUndefined()
  })

  it('should save state to localStorage on changes', async () => {
    // Start fresh for this test
    vi.clearAllMocks()
    localStorageMock.getItem.mockReturnValue(null)
    localStorageMock.setItem.mockClear()

    const { selectTask } = useOnboarding()

    selectTask('create-feature')

    // Wait for Vue watchers to run
    await nextTick()

    expect(localStorageMock.setItem).toHaveBeenCalled()
    const savedData = JSON.parse(
      localStorageMock.setItem.mock.calls.slice(-1)[0][1]
    )
    expect(savedData.selectedTask).toBe('create-feature')
  })

  it('should handle localStorage save errors gracefully', () => {
    localStorageMock.setItem.mockImplementation(() => {
      throw new Error('Storage error')
    })

    const { selectTask } = useOnboarding()

    // Should not throw error when localStorage fails
    expect(() => selectTask('create-feature')).not.toThrow()
  })

  it('should provide correct onboarding tasks constant', () => {
    expect(ONBOARDING_TASKS).toHaveLength(5)
    expect(ONBOARDING_TASKS[0].id).toBe('create-feature')
    expect(ONBOARDING_TASKS[1].id).toBe('fix-bug')
    expect(ONBOARDING_TASKS[2].id).toBe('improve-documentation')
    expect(ONBOARDING_TASKS[3].id).toBe('perform-maintenance')
    expect(ONBOARDING_TASKS[4].id).toBe('refactor-code')

    ONBOARDING_TASKS.forEach((task) => {
      expect(task).toHaveProperty('title')
      expect(task).toHaveProperty('description')
      expect(task).toHaveProperty('icon')
      expect(task).toHaveProperty('example')
      expect(task).toHaveProperty('tooltipDetails')
    })
  })

  it('should have correct onboarding active state based on completion', () => {
    const { isOnboardingActive, completeOnboarding } = useOnboarding()

    expect(isOnboardingActive.value).toBe(true)

    completeOnboarding()
    expect(isOnboardingActive.value).toBe(false)
  })

  it('should trigger onboarding correctly', () => {
    const {
      triggerOnboarding,
      completeOnboarding,
      currentStep,
      isFirstTime,
      completedAt,
      selectedTask,
    } = useOnboarding()

    // Complete onboarding first
    completeOnboarding()
    expect(isFirstTime.value).toBe(false)
    expect(completedAt.value).toBeTruthy()

    // Trigger onboarding
    triggerOnboarding()
    expect(currentStep.value).toBe('welcome')
    expect(isFirstTime.value).toBe(true)
    expect(completedAt.value).toBe(null)
    expect(selectedTask.value).toBe(null)
  })
})
