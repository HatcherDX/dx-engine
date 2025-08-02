import { ref, computed, watch } from 'vue'

export type OnboardingStep =
  | 'welcome'
  | 'project-selection'
  | 'task-selection'
  | 'task-detail'
  | 'transition'
  | 'completed'

export type OnboardingTask =
  | 'create-feature'
  | 'fix-bug'
  | 'improve-documentation'
  | 'perform-maintenance'
  | 'refactor-code'
  | null

export interface OnboardingTaskOption {
  id: OnboardingTask
  title: string
  description: string
  icon: string
  example: string
  tooltipDetails: string
}

// Available onboarding tasks
export const ONBOARDING_TASKS: OnboardingTaskOption[] = [
  {
    id: 'create-feature',
    title: '✨ Create a new Feature',
    description:
      'Recommended for building new functionalities, enhancements, or refactoring existing code.',
    icon: 'Code',
    example: 'Add a new user authentication system with OAuth integration',
    tooltipDetails:
      'The starting point for creative work that adds direct value to your users.',
  },
  {
    id: 'fix-bug',
    title: '🐞 Fix a Bug',
    description:
      'Recommended for resolving an existing issue, error, or incorrect behavior in your codebase.',
    icon: 'Terminal',
    example: 'The login button is not working on Safari mobile',
    tooltipDetails:
      'This isolates the fix in its own branch, making it easier to review and ensuring new features are not mixed with the solution.',
  },
  {
    id: 'improve-documentation',
    title: '📖 Improve Documentation',
    description:
      'Recommended for adding or refining comments, READMEs, or other documentation files.',
    icon: 'Eye',
    example: 'Update the CONTRIBUTING.md with the new release process',
    tooltipDetails:
      "This keeps your code history clean and separates documentation improvements from changes to the application's logic.",
  },
  {
    id: 'perform-maintenance',
    title: '🧹 Perform Maintenance',
    description:
      "Recommended for routine tasks that don't modify production code, like updating dependencies.",
    icon: 'Terminal',
    example: 'Upgrade Vite to the latest version',
    tooltipDetails:
      'This is for project "housekeeping" and tasks necessary for the health of the repository that do not directly affect features.',
  },
  {
    id: 'refactor-code',
    title: '♻️ Refactor Code',
    description:
      'Recommended for improving the internal structure or quality of existing code without changing its external behavior.',
    icon: 'Code',
    example: 'Extract the user authentication logic into a composable',
    tooltipDetails:
      'This does not add new features or fix bugs, but it makes the code more readable, efficient, and easier to maintain.',
  },
]

const STORAGE_KEY = 'hatcher-onboarding'

interface OnboardingState {
  isFirstTime: boolean
  currentStep: OnboardingStep
  selectedTask: OnboardingTask
  completedAt: string | null
  showWelcomeTutorial: boolean
}

// Global state
const state = ref<OnboardingState>({
  isFirstTime: true,
  currentStep: 'welcome',
  selectedTask: null,
  completedAt: null,
  showWelcomeTutorial: true,
})

// Load initial state from localStorage
const loadInitialState = (): void => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored) as OnboardingState
      const showWelcomeTutorial = parsed.showWelcomeTutorial ?? true
      state.value = {
        isFirstTime: parsed.isFirstTime ?? true,
        // Always start with welcome step unless user disabled the tutorial
        currentStep: showWelcomeTutorial ? 'welcome' : 'completed',
        selectedTask: null, // Always reset task selection on app start
        completedAt: showWelcomeTutorial ? null : (parsed.completedAt ?? null),
        showWelcomeTutorial,
      }
    }
  } catch (error) {
    console.warn('Failed to load onboarding state from localStorage:', error)
  }
}

// Save state to localStorage
const saveState = (): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.value))
  } catch (error) {
    console.warn('Failed to save onboarding state to localStorage:', error)
  }
}

// Initialize state on first import
loadInitialState()

// Watch for state changes and persist
watch(state, saveState, { deep: true })

export function useOnboarding() {
  // Computed properties
  const isOnboardingActive = computed(
    () =>
      state.value.currentStep !== 'completed' && state.value.showWelcomeTutorial
  )

  const canProceedToNext = computed(() => {
    switch (state.value.currentStep) {
      case 'welcome':
        return true
      case 'project-selection':
        return true
      case 'task-selection':
        return state.value.selectedTask !== null
      case 'task-detail':
        return true
      case 'transition':
        return true
      default:
        return false
    }
  })

  // Methods
  const triggerOnboarding = (): void => {
    state.value.isFirstTime = true
    state.value.currentStep = 'welcome'
    state.value.selectedTask = null
    state.value.completedAt = null
  }

  const nextStep = (): void => {
    if (!canProceedToNext.value) return

    switch (state.value.currentStep) {
      case 'welcome':
        state.value.currentStep = 'project-selection'
        break
      case 'project-selection':
        state.value.currentStep = 'task-selection'
        break
      case 'task-selection':
        if (state.value.selectedTask) {
          state.value.currentStep = 'task-detail'
        }
        break
      case 'task-detail':
        state.value.currentStep = 'transition'
        break
      case 'transition':
        completeOnboarding()
        break
    }
  }

  const previousStep = (): void => {
    switch (state.value.currentStep) {
      case 'project-selection':
        state.value.currentStep = 'welcome'
        break
      case 'task-selection':
        state.value.currentStep = 'project-selection'
        break
      case 'task-detail':
        state.value.currentStep = 'task-selection'
        break
      case 'transition':
        state.value.currentStep = 'task-detail'
        break
    }
  }

  const selectTask = (taskId: OnboardingTask): void => {
    state.value.selectedTask = taskId
  }

  const completeOnboarding = (): void => {
    state.value.currentStep = 'completed'
    state.value.completedAt = new Date().toISOString()
    state.value.isFirstTime = false
  }

  const resetOnboarding = (): void => {
    state.value.isFirstTime = true
    state.value.currentStep = 'welcome'
    state.value.selectedTask = null
    state.value.completedAt = null
    state.value.showWelcomeTutorial = true
  }

  const setShowWelcomeTutorial = (show: boolean): void => {
    state.value.showWelcomeTutorial = show
  }

  const getTaskById = (
    id: OnboardingTask
  ): OnboardingTaskOption | undefined => {
    return ONBOARDING_TASKS.find((task) => task.id === id)
  }

  const getSelectedTask = computed((): OnboardingTaskOption | undefined => {
    return state.value.selectedTask
      ? getTaskById(state.value.selectedTask)
      : undefined
  })

  // Generate initial AI context based on selected task
  const getInitialAIContext = (): string => {
    const task = getSelectedTask.value
    if (!task) return ''

    switch (task.id) {
      case 'create-feature':
        return `Welcome! I see you're ready to create new features. I can help you design, implement, and enhance functionalities in your application. Try asking me something like: "${task.example}"`
      case 'fix-bug':
        return `Welcome! I see you want to fix bugs. I can help you debug issues, identify root causes, and implement solutions. Try asking me: "${task.example}"`
      case 'improve-documentation':
        return `Welcome! I see you want to improve documentation. I can help you write clear docs, API references, code comments, and user guides. Try: "${task.example}"`
      case 'perform-maintenance':
        return `Welcome! I see you're focusing on maintenance tasks. I can help you update dependencies, configure CI/CD, and maintain project health. Try: "${task.example}"`
      case 'refactor-code':
        return `Welcome! I see you want to refactor code. I can help you improve code structure, optimize performance, and enhance maintainability. Try: "${task.example}"`
      default:
        return 'Welcome to Hatcher! How can I help you with your development workflow today?'
    }
  }

  return {
    // State
    currentStep: computed(() => state.value.currentStep),
    selectedTask: computed(() => state.value.selectedTask),
    isFirstTime: computed(() => state.value.isFirstTime),
    completedAt: computed(() => state.value.completedAt),
    showWelcomeTutorial: computed(() => state.value.showWelcomeTutorial),

    // Computed
    isOnboardingActive,
    canProceedToNext,
    getSelectedTask,

    // Actions
    triggerOnboarding,
    nextStep,
    previousStep,
    selectTask,
    completeOnboarding,
    resetOnboarding,
    setShowWelcomeTutorial,
    getTaskById,
    getInitialAIContext,

    // Constants
    ONBOARDING_TASKS,
  }
}
