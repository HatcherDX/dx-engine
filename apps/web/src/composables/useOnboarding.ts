import { ref, computed, watch } from 'vue'
import { useTaskManager } from './useTaskManager'

export type OnboardingStep =
  | 'welcome'
  | 'project-selection'
  | 'task-selector'
  | 'task-selection'
  | 'branch-creation'
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

export interface ProjectInfo {
  path: string
  packageJson: string
  name: string
  version: string
  description: string
  scripts: Record<string, string>
  dependencies: Record<string, string>
  devDependencies: Record<string, string>
  // Optional fields for storage compatibility
  framework?: string
  packageManager?: string
}

export interface OnboardingTaskOption {
  id: OnboardingTask
  title: string
  description: string
  icon: string
  example: string
  tooltipDetails: string
}

export interface BranchConfig {
  name: string
  base: string
  agent: string
}

// Available onboarding tasks
export const ONBOARDING_TASKS: OnboardingTaskOption[] = [
  {
    id: 'create-feature',
    title: 'Create a new Feature',
    description: 'Build a new functionality, enhancement, or component.',
    icon: 'Plus',
    example: 'Add User Login',
    tooltipDetails:
      'The starting point for creative work that adds direct value to your users.',
  },
  {
    id: 'fix-bug',
    title: 'Fix a Bug',
    description: 'Resolve an existing issue, error, or incorrect behavior.',
    icon: 'Bug',
    example: 'The login button is not working on Safari mobile',
    tooltipDetails:
      'This isolates the fix in its own branch, making it easier to review and ensuring new features are not mixed with the solution.',
  },
  {
    id: 'improve-documentation',
    title: 'Improve Documentation',
    description: 'Add or refine comments, READMEs, and documentation.',
    icon: 'BookOpen',
    example: 'Update the CONTRIBUTING.md with the new release process',
    tooltipDetails:
      "This keeps your code history clean and separates documentation improvements from changes to the application's logic.",
  },
  {
    id: 'perform-maintenance',
    title: 'Perform Maintenance',
    description: 'Update dependencies or other non-production code tasks.',
    icon: 'Settings',
    example: 'Upgrade Vite to the latest version',
    tooltipDetails:
      'This is for project "housekeeping" and tasks necessary for the health of the repository that do not directly affect features.',
  },
  {
    id: 'refactor-code',
    title: 'Refactor Code',
    description:
      "Improve your code's internal structure without changing its external behavior.",
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
  selectedProject: ProjectInfo | null
  selectedBranch: BranchConfig | null
  completedAt: string | null
  isCreatingNewTask: boolean
}

// Global state
// Start with completed (IDE view) by default - will check for workspace on load
const state = ref<OnboardingState>({
  isFirstTime: false,
  currentStep: 'completed', // Start with IDE view by default
  selectedTask: null,
  selectedProject: null,
  selectedBranch: null,
  completedAt: null,
  isCreatingNewTask: false,
})

// Track if we're currently checking for workspace
const isCheckingWorkspace = ref(true)

// Load initial state from localStorage and check workspace
// Integrates with secure storage system
const loadInitialState = async (): Promise<void> => {
  isCheckingWorkspace.value = true

  // Add minimum loading time to prevent flash
  const minLoadTime = new Promise((resolve) => setTimeout(resolve, 400))

  try {
    // Check if localStorage is available (may not be in tests)
    if (typeof localStorage === 'undefined') {
      console.log(
        '[Onboarding] localStorage not available, using default state'
      )
      return
    }

    // Check for existing workspace in secure storage
    if (window.storageAPI) {
      try {
        const workspace = await window.storageAPI.getWorkspace()
        if (workspace && workspace.project) {
          console.log('[Onboarding] Existing workspace found, keeping IDE view')
          // Already defaulted to completed state, just update completedAt
          state.value.completedAt = new Date().toISOString()
          return
        } else {
          console.log('[Onboarding] No workspace found, activating onboarding')
          // No workspace, activate onboarding
          state.value = {
            isFirstTime: true,
            currentStep: 'welcome',
            selectedTask: null,
            selectedProject: null,
            selectedBranch: null,
            completedAt: null,
            isCreatingNewTask: false,
          }
        }
      } catch (err) {
        console.warn('[Onboarding] Failed to check workspace:', err)
        // On error, activate onboarding to be safe
        state.value.currentStep = 'welcome'
        state.value.isFirstTime = true
      }
    } else {
      // No storage API, activate onboarding
      console.log('[Onboarding] No storage API, activating onboarding')
      state.value.currentStep = 'welcome'
      state.value.isFirstTime = true
    }

    const stored = localStorage.getItem(STORAGE_KEY)

    // In development mode, optionally force onboarding with query param
    // COMMENTED OUT: Let's respect the persistent state even in development
    // const isDevelopment = import.meta.env.DEV
    const urlParams =
      typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search)
        : new URLSearchParams()
    const forceOnboarding = urlParams.get('forceOnboarding') === 'true'

    if (forceOnboarding) {
      console.log('[Onboarding] Force onboarding via query param')
      state.value = {
        isFirstTime: true,
        currentStep: 'welcome',
        selectedTask: null,
        selectedProject: null,
        selectedBranch: null,
        completedAt: null,
        isCreatingNewTask: false,
      }
      return
    }

    if (stored) {
      const parsed = JSON.parse(stored) as OnboardingState
      state.value = {
        isFirstTime: parsed.isFirstTime ?? true,
        // If onboarding was completed, don't show it again
        currentStep: parsed.completedAt ? 'completed' : 'welcome',
        selectedTask: null, // Always reset task selection on app start
        selectedProject: null, // Always reset project selection on app start
        selectedBranch: null, // Always reset branch selection on app start
        completedAt: parsed.completedAt ?? null,
        isCreatingNewTask: false, // Always reset on app start
      }
    }
  } catch (error) {
    console.warn('Failed to load onboarding state from localStorage:', error)
    // For now, always start fresh with onboarding
    console.log('[Onboarding] Starting fresh onboarding flow')
  } finally {
    // Ensure minimum loading time has passed
    await minLoadTime
    isCheckingWorkspace.value = false
  }
}

// Save state to localStorage
// TODO: Integrate with new storage system
const saveState = (): void => {
  try {
    // Check if localStorage is available (may not be in tests)
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.value))
    }
  } catch (error) {
    console.warn('Failed to save onboarding state to localStorage:', error)
  }
}

// Initialize state on first import
// Make initialization happen asynchronously to avoid blocking
if (typeof window !== 'undefined') {
  // Initialize immediately
  loadInitialState().catch((err) => {
    console.error('[Onboarding] Failed to initialize state:', err)
    isCheckingWorkspace.value = false
  })
}

// Watch for state changes and persist
// TODO: Re-enable when storage system is integrated
watch(state, saveState, { deep: true })

// Watch for step changes and notify Electron
watch(
  () => state.value.currentStep,
  (newStep) => {
    console.log('[Onboarding] Step changed to:', newStep)
    // Send step change to Electron for keyboard handler
    if (
      typeof window !== 'undefined' &&
      window.electronAPI?.terminalEasterEgg
    ) {
      window.electronAPI.terminalEasterEgg.stepChange(newStep)
      console.log('[Onboarding] Sent step change to Electron:', newStep)
    }
  },
  { immediate: true } // Send initial step
)

export function useOnboarding() {
  // Computed properties
  const isOnboardingActive = computed(() => {
    // Always show onboarding until explicitly completed in this session
    // TODO: Integrate with storage system for persistence
    return state.value.currentStep !== 'completed'
  })

  const canProceedToNext = computed(() => {
    switch (state.value.currentStep) {
      case 'welcome':
        return true
      case 'project-selection':
        return state.value.selectedProject !== null
      case 'task-selector':
        return true // Can always proceed (either select existing or create new)
      case 'task-selection':
        return state.value.selectedTask !== null
      case 'branch-creation':
        return true // Branch creation has defaults, so always can proceed
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
    state.value.selectedProject = null
    state.value.selectedBranch = null
    state.value.completedAt = null
  }

  const nextStep = (): void => {
    if (!canProceedToNext.value) return

    switch (state.value.currentStep) {
      case 'welcome':
        state.value.currentStep = 'project-selection'
        break
      case 'project-selection':
        if (state.value.selectedProject) {
          state.value.currentStep = 'task-selector'
        }
        break
      case 'task-selector':
        // If user selected a branch (existing workflow), skip to transition
        if (state.value.selectedBranch) {
          state.value.isCreatingNewTask = false
          state.value.currentStep = 'transition'
        } else {
          // User wants to create new task - set flag and go to task selection
          state.value.isCreatingNewTask = true
          state.value.currentStep = 'task-selection'
        }
        break
      case 'task-selection':
        if (state.value.selectedTask) {
          state.value.currentStep = 'task-detail'
        }
        break
      case 'task-detail':
        state.value.currentStep = 'branch-creation'
        break
      case 'branch-creation':
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
      case 'task-selector':
        state.value.currentStep = 'project-selection'
        // Clear task selection when going back from task-selector
        state.value.selectedTask = null
        state.value.isCreatingNewTask = false
        state.value.selectedBranch = null
        break
      case 'task-selection':
        state.value.currentStep = 'task-selector'
        // Clear task selection when going back from task-selection
        state.value.selectedTask = null
        state.value.isCreatingNewTask = false
        break
      case 'task-detail':
        state.value.currentStep = 'task-selection'
        break
      case 'branch-creation':
        state.value.currentStep = 'task-detail'
        break
      case 'transition':
        state.value.currentStep = 'branch-creation'
        break
    }
  }

  const selectTask = (taskId: OnboardingTask): void => {
    state.value.selectedTask = taskId
    // When selecting a task, we're in new task creation mode
    state.value.isCreatingNewTask = true
  }

  const selectProject = (project: ProjectInfo): void => {
    state.value.selectedProject = project
  }

  const selectBranch = (branch: BranchConfig): void => {
    state.value.selectedBranch = branch
    // When selecting an existing branch, we're not creating a new task
    state.value.isCreatingNewTask = false
  }

  const completeOnboarding = async (): Promise<void> => {
    // Save workspace state if we have a project and task
    if (state.value.selectedProject && state.value.selectedBranch) {
      const taskManager = useTaskManager()

      try {
        // Map onboarding task type to storage task type
        let taskType: 'feature' | 'bug' | 'docs' | 'maintenance' | 'refactor' =
          'feature'

        switch (state.value.selectedTask) {
          case 'create-feature':
            taskType = 'feature'
            break
          case 'fix-bug':
            taskType = 'bug'
            break
          case 'improve-documentation':
            taskType = 'docs'
            break
          case 'perform-maintenance':
            taskType = 'maintenance'
            break
          case 'refactor-code':
            taskType = 'refactor'
            break
        }

        // Open project with initial task
        await taskManager.openProject(
          {
            path: state.value.selectedProject.path,
            name: state.value.selectedProject.name,
            metadata: {
              framework: state.value.selectedProject.framework,
              packageManager: state.value.selectedProject.packageManager,
            },
          },
          {
            branchName: state.value.selectedBranch.name,
            taskType,
          }
        )

        console.log('[Onboarding] Workspace saved with project and task')
      } catch (error) {
        console.error('[Onboarding] Failed to save workspace:', error)
        // Continue with onboarding completion even if storage fails
      }
    }

    state.value.currentStep = 'completed'
    state.value.completedAt = new Date().toISOString()
    state.value.isFirstTime = false
  }

  const resetOnboarding = (): void => {
    state.value.isFirstTime = true
    state.value.currentStep = 'welcome'
    state.value.selectedTask = null
    state.value.selectedProject = null
    state.value.selectedBranch = null
    state.value.completedAt = null
    state.value.isCreatingNewTask = false
  }

  const clearOnboardingStorage = (): void => {
    try {
      localStorage.removeItem(STORAGE_KEY)
      console.log('[Onboarding] Cleared localStorage storage')
      // Reset the in-memory state as well
      resetOnboarding()
      console.log('[Onboarding] Reset state to welcome')
    } catch (error) {
      console.error('Failed to clear onboarding localStorage:', error)
    }
  }

  /**
   * Clears data from steps after the specified step index.
   *
   * @param targetStepIndex - Index of the step to preserve (and before)
   * @remarks
   * This function implements intelligent state management for backward navigation,
   * preserving data up to the target step and clearing subsequent step data.
   *
   * @public
   * @since 1.0.0
   */
  const clearStepsAfter = (targetStepIndex: number): void => {
    const stepOrder: OnboardingStep[] = [
      'welcome',
      'project-selection',
      'task-selector',
      'task-selection',
      'task-detail',
      'branch-creation',
      'transition',
    ]

    // Clear branch data if going back before branch-creation step
    const branchCreationIndex = stepOrder.indexOf('branch-creation')
    if (targetStepIndex < branchCreationIndex) {
      state.value.selectedBranch = null
    }

    // Clear task data if going back before task-selection step
    const taskSelectionIndex = stepOrder.indexOf('task-selection')
    if (targetStepIndex < taskSelectionIndex) {
      state.value.selectedTask = null
      state.value.isCreatingNewTask = false
    }

    // Clear task creation state if going back before task-selector step
    const taskSelectorIndex = stepOrder.indexOf('task-selector')
    if (targetStepIndex < taskSelectorIndex) {
      state.value.isCreatingNewTask = false
    }

    // Clear project data if going back before project-selection step
    const projectSelectionIndex = stepOrder.indexOf('project-selection')
    if (targetStepIndex < projectSelectionIndex) {
      state.value.selectedProject = null
    }
  }

  const goToStep = (stepId: OnboardingStep): void => {
    // Define the step order
    const stepOrder: OnboardingStep[] = [
      'welcome',
      'project-selection',
      'task-selector',
      'task-selection',
      'task-detail',
      'branch-creation',
      'transition',
    ]

    const currentIndex = stepOrder.indexOf(state.value.currentStep)
    const targetIndex = stepOrder.indexOf(stepId)

    // Only allow navigation to previous steps or the current step
    if (targetIndex >= 0 && targetIndex <= currentIndex) {
      // If navigating backward, clear data from subsequent steps
      if (targetIndex < currentIndex) {
        clearStepsAfter(targetIndex)
      }

      state.value.currentStep = stepId
    }
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

  const getSelectedBranch = computed((): BranchConfig | null => {
    return state.value.selectedBranch
  })

  const showWelcomeTutorial = computed((): boolean => {
    return state.value.currentStep === 'welcome'
  })

  // Mock recent projects for terminal Easter Egg
  // TODO: Replace with actual recent projects from storage system
  const recentProjects = computed((): ProjectInfo[] => {
    return [
      {
        path: '/Users/dev/my-awesome-app',
        packageJson: '{}',
        name: 'my-awesome-app',
        version: '1.0.0',
        description: 'An awesome React application',
        scripts: {},
        dependencies: {},
        devDependencies: {},
        framework: 'React',
        packageManager: 'npm',
      },
      {
        path: '/Users/dev/vue-dashboard',
        packageJson: '{}',
        name: 'vue-dashboard',
        version: '2.1.0',
        description: 'Vue.js dashboard application',
        scripts: {},
        dependencies: {},
        devDependencies: {},
        framework: 'Vue',
        packageManager: 'pnpm',
      },
      {
        path: '/Users/dev/api-server',
        packageJson: '{}',
        name: 'api-server',
        version: '0.5.2',
        description: 'Express.js REST API server',
        scripts: {},
        dependencies: {},
        devDependencies: {},
        framework: 'Node.js',
        packageManager: 'yarn',
      },
    ]
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
    selectedProject: computed(() => state.value.selectedProject),
    selectedBranch: computed(() => state.value.selectedBranch),
    isFirstTime: computed(() => state.value.isFirstTime),
    completedAt: computed(() => state.value.completedAt),
    isCreatingNewTask: computed(() => state.value.isCreatingNewTask),
    isCheckingWorkspace: computed(() => isCheckingWorkspace.value),

    // Computed
    isOnboardingActive,
    canProceedToNext,
    getSelectedTask,
    getSelectedBranch,
    showWelcomeTutorial,
    recentProjects,

    // Actions
    triggerOnboarding,
    nextStep,
    previousStep,
    goToStep,
    selectTask,
    selectProject,
    selectBranch,
    completeOnboarding,
    resetOnboarding,
    clearOnboardingStorage,
    getTaskById,
    getInitialAIContext,

    // Constants
    ONBOARDING_TASKS,
  }
}
