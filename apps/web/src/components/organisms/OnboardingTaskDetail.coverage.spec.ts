/**
 * @fileoverview Comprehensive test coverage for OnboardingTaskDetail.vue component.
 *
 * @description
 * Complete test suite achieving 100% coverage for the onboarding task detail form
 * including all branches, functions, and statements.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import { mount, VueWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Use vi.hoisted to define mock functions
const { mockTerminalBridge, mockNextStep, mockSelectBranch } = vi.hoisted(
  () => {
    return {
      mockTerminalBridge: {
        useTaskDetails: vi.fn(() => ({
          taskName: { value: 'Initial Task Name' },
        })),
        subscribe: vi.fn(),
        updateInput: vi.fn(),
      },
      mockNextStep: vi.fn(),
      mockSelectBranch: vi.fn(),
    }
  }
)

vi.mock('../../composables/useTerminalInputBridge', () => ({
  terminalInputBridge: mockTerminalBridge,
}))

// Import Vue after mock definitions
import { nextTick, ref } from 'vue'
import OnboardingTaskDetail from './OnboardingTaskDetail.vue'

// Define interfaces
interface TaskDetail {
  id: string
  title: string
  description: string
  example: string
}

interface BranchDetail {
  name: string
  base: string
  agent: string
}

// Create refs after imports
const mockRefs = {
  getSelectedTask: ref(null as TaskDetail | null),
  getSelectedBranch: ref(null as BranchDetail | null),
  currentStep: ref('task-detail'),
}

// Create mockOnboarding object
const mockOnboarding = {
  getSelectedTask: mockRefs.getSelectedTask,
  getSelectedBranch: mockRefs.getSelectedBranch,
  nextStep: mockNextStep,
  selectBranch: mockSelectBranch,
  currentStep: mockRefs.currentStep,
}

// Mock validation utilities
vi.mock('../../utils/gitValidation', () => ({
  validateBranchName: vi.fn((name: string) => {
    if (!name) return { isValid: true }
    if (name.includes('invalid')) {
      return { isValid: false, error: 'Invalid branch name' }
    }
    return { isValid: true }
  }),
}))

// Mock child components
vi.mock('../atoms/CtaButton.vue', () => ({
  default: {
    name: 'CtaButton',
    props: ['disabled'],
    emits: ['click'],
    template:
      '<button data-testid="cta-button" :disabled="disabled" @click="$emit(\'click\', $event)"><slot /></button>',
  },
}))

vi.mock('../../composables/useOnboarding', () => ({
  useOnboarding: () => mockOnboarding,
}))

describe('OnboardingTaskDetail - 100% Coverage', () => {
  let wrapper: VueWrapper<InstanceType<typeof OnboardingTaskDetail>>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test requires flexible typing for validation testing
  let subscribeCallback: ((details: any) => void) | null = null

  beforeEach(() => {
    vi.clearAllMocks()

    // Reset mock state using refs
    mockRefs.getSelectedTask.value = null
    mockRefs.getSelectedBranch.value = null
    mockRefs.currentStep.value = 'task-detail'
    mockOnboarding.nextStep.mockClear()
    mockOnboarding.selectBranch.mockClear()

    // Reset terminal bridge mock
    mockTerminalBridge.useTaskDetails.mockReturnValue({
      taskName: { value: '' },
    })

    // Setup subscribe mock to capture callback
    mockTerminalBridge.subscribe.mockImplementation((callback) => {
      subscribeCallback = callback
      return () => {
        subscribeCallback = null
      }
    })
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
    subscribeCallback = null
  })

  describe('Component Mount with Existing Data', () => {
    it('should load existing branch data on mount', async () => {
      // Set up existing branch data
      mockRefs.getSelectedBranch.value = {
        name: 'feature/existing-feature',
        base: 'main',
        agent: 'default',
      }

      // Mock console.log to verify it's called
      const consoleSpy = vi.spyOn(console, 'log')

      wrapper = mount(OnboardingTaskDetail, {
        global: {
          directives: {
            'disable-terminal': { mounted() {}, unmounted() {} },
          },
        },
      })
      await nextTick()

      // Verify loadExistingData was called
      expect(consoleSpy).toHaveBeenCalledWith(
        '[TaskDetail] Loading existing branch data:',
        expect.objectContaining({
          name: 'feature/existing-feature',
        })
      )

      expect(consoleSpy).toHaveBeenCalledWith(
        '[TaskDetail] Loaded task name:',
        'Existing Feature'
      )

      // Check that form was populated with extracted data
      const taskNameInput = wrapper.find('#task-name')
      const branchNameInput = wrapper.find('#branch-name')

      expect((taskNameInput.element as HTMLInputElement).value).toBe(
        'Existing Feature'
      )
      expect((branchNameInput.element as HTMLInputElement).value).toBe(
        'feature/existing-feature'
      )

      consoleSpy.mockRestore()
    })
  })

  describe('Terminal Input Bridge Integration', () => {
    it('should handle bridge updates with task name only', async () => {
      wrapper = mount(OnboardingTaskDetail, {
        global: {
          directives: {
            'disable-terminal': { mounted() {}, unmounted() {} },
          },
        },
      })
      await nextTick()

      // Simulate bridge update with task name
      if (subscribeCallback) {
        subscribeCallback({
          taskName: 'New Task from Bridge',
          branchName: null, // null means auto-generate
        })
      }
      await nextTick()

      const taskNameInput = wrapper.find('#task-name')
      expect((taskNameInput.element as HTMLInputElement).value).toBe(
        'New Task from Bridge'
      )
    })

    it('should handle bridge updates with custom branch name', async () => {
      const task = {
        id: 'create-feature',
        title: 'Create Feature',
        description: 'Build new functionality',
        example: 'Add user login',
      }
      mockRefs.getSelectedTask.value = task

      wrapper = mount(OnboardingTaskDetail, {
        global: {
          directives: {
            'disable-terminal': { mounted() {}, unmounted() {} },
          },
        },
      })
      await nextTick()

      const consoleSpy = vi.spyOn(console, 'log')

      // Simulate bridge update with custom branch name
      if (subscribeCallback) {
        subscribeCallback({
          taskName: 'Task Name',
          branchName: 'custom-branch', // Custom branch without slash
        })
      }
      await nextTick()

      expect(consoleSpy).toHaveBeenCalledWith(
        '[TaskDetail] Bridge update:',
        expect.objectContaining({
          taskName: 'Task Name',
          branchName: 'custom-branch',
        })
      )

      const branchNameInput = wrapper.find('#branch-name')
      expect((branchNameInput.element as HTMLInputElement).value).toBe(
        'feature/custom-branch'
      )

      consoleSpy.mockRestore()
    })

    it('should handle bridge updates with full branch path', async () => {
      wrapper = mount(OnboardingTaskDetail, {
        global: {
          directives: {
            'disable-terminal': { mounted() {}, unmounted() {} },
          },
        },
      })
      await nextTick()

      // Simulate bridge update with full branch path
      if (subscribeCallback) {
        subscribeCallback({
          taskName: 'Task Name',
          branchName: 'bugfix/fix-issue-123', // Full path with prefix
        })
      }
      await nextTick()

      const branchNameInput = wrapper.find('#branch-name')
      expect((branchNameInput.element as HTMLInputElement).value).toBe(
        'bugfix/fix-issue-123'
      )
    })

    it('should handle bridge updates with empty branch name', async () => {
      wrapper = mount(OnboardingTaskDetail, {
        global: {
          directives: {
            'disable-terminal': { mounted() {}, unmounted() {} },
          },
        },
      })
      await nextTick()

      // Simulate bridge update with empty branch name
      if (subscribeCallback) {
        subscribeCallback({
          taskName: '',
          branchName: '', // Empty string means clear everything
        })
      }
      await nextTick()

      const taskNameInput = wrapper.find('#task-name')
      const branchNameInput = wrapper.find('#branch-name')

      expect((taskNameInput.element as HTMLInputElement).value).toBe('')
      expect((branchNameInput.element as HTMLInputElement).value).toBe('')
    })

    it('should skip sync to bridge when update comes from bridge', async () => {
      wrapper = mount(OnboardingTaskDetail, {
        global: {
          directives: {
            'disable-terminal': { mounted() {}, unmounted() {} },
          },
        },
      })
      await nextTick()

      const consoleSpy = vi.spyOn(console, 'log')

      // Simulate bridge update which sets isUpdatingFromBridge flag
      if (subscribeCallback) {
        subscribeCallback({
          taskName: 'Bridge Task',
          branchName: null,
        })
      }

      // Don't wait for nextTick yet - the flag is still true during this phase

      // Now try to change the task name while the flag is still true
      const taskNameInput = wrapper.find('#task-name')
      await taskNameInput.setValue('New Value')
      await taskNameInput.trigger('input')

      // The syncToBridge should be skipped
      expect(consoleSpy).toHaveBeenCalledWith(
        '[TaskDetail] Skipping sync to bridge - update came from bridge'
      )

      consoleSpy.mockRestore()
    })
  })

  describe('Task Watcher Behavior', () => {
    it('should clear form when task changes', async () => {
      const initialTask = {
        id: 'create-feature',
        title: 'Create Feature',
        description: 'Build new functionality',
        example: 'Add user login',
      }
      mockRefs.getSelectedTask.value = initialTask

      wrapper = mount(OnboardingTaskDetail, {
        global: {
          directives: {
            'disable-terminal': { mounted() {}, unmounted() {} },
          },
        },
      })
      await nextTick()

      const taskNameInput = wrapper.find('#task-name')
      const branchNameInput = wrapper.find('#branch-name')

      // Fill in some data
      await taskNameInput.setValue('My Feature')
      await branchNameInput.setValue('feature/my-feature')

      const consoleSpy = vi.spyOn(console, 'log')

      // Change task
      const newTask = {
        id: 'fix-bug',
        title: 'Fix Bug',
        description: 'Fix issues',
        example: 'Fix login bug',
      }
      mockRefs.getSelectedTask.value = newTask
      await nextTick()

      expect(consoleSpy).toHaveBeenCalledWith(
        '[TaskDetail] Task changed, clearing form'
      )

      // Form should be cleared
      expect((taskNameInput.element as HTMLInputElement).value).toBe('')
      expect((branchNameInput.element as HTMLInputElement).value).toBe('')

      consoleSpy.mockRestore()
    })

    it('should load existing data when task is set without previous task', async () => {
      // Start with no task
      mockRefs.getSelectedTask.value = null

      wrapper = mount(OnboardingTaskDetail, {
        global: {
          directives: {
            'disable-terminal': { mounted() {}, unmounted() {} },
          },
        },
      })
      await nextTick()

      const consoleSpy = vi.spyOn(console, 'log')

      // Set task for first time
      const task = {
        id: 'create-feature',
        title: 'Create Feature',
        description: 'Build new functionality',
        example: 'Add user login',
      }
      mockRefs.getSelectedTask.value = task
      await nextTick()

      expect(consoleSpy).toHaveBeenCalledWith(
        '[TaskDetail] Initial task load, checking for existing data'
      )

      consoleSpy.mockRestore()
    })

    it('should do nothing when task is null', async () => {
      const task = {
        id: 'create-feature',
        title: 'Create Feature',
        description: 'Build new functionality',
        example: 'Add user login',
      }
      mockRefs.getSelectedTask.value = task

      wrapper = mount(OnboardingTaskDetail, {
        global: {
          directives: {
            'disable-terminal': { mounted() {}, unmounted() {} },
          },
        },
      })
      await nextTick()

      // Set task to null
      mockRefs.getSelectedTask.value = null
      await nextTick()

      // Component should handle gracefully
      expect(wrapper.exists()).toBe(true)
    })
  })

  describe('Current Step Watcher', () => {
    it('should load existing data when navigating to task-detail step', async () => {
      mockRefs.currentStep.value = 'some-other-step'

      wrapper = mount(OnboardingTaskDetail, {
        global: {
          directives: {
            'disable-terminal': { mounted() {}, unmounted() {} },
          },
        },
      })
      await nextTick()

      const consoleSpy = vi.spyOn(console, 'log')

      // Navigate to task-detail step
      mockRefs.currentStep.value = 'task-detail'
      await nextTick()

      expect(consoleSpy).toHaveBeenCalledWith(
        '[TaskDetail] Navigated to task-detail step, loading existing data'
      )

      consoleSpy.mockRestore()
    })
  })

  describe('Branch Validation', () => {
    it('should validate branch names correctly', async () => {
      wrapper = mount(OnboardingTaskDetail, {
        global: {
          directives: {
            'disable-terminal': { mounted() {}, unmounted() {} },
          },
        },
      })
      await nextTick()

      const branchNameInput = wrapper.find('#branch-name')

      // Test invalid branch name
      await branchNameInput.setValue('invalid-branch-name')
      await branchNameInput.trigger('input')

      // Check for error message
      const errorMessage = wrapper.find('.error-message')
      expect(errorMessage.exists()).toBe(true)
      expect(errorMessage.text()).toBe('Invalid branch name')

      // Test valid branch name
      await branchNameInput.setValue('feature/valid-branch')
      await branchNameInput.trigger('input')

      // Error should be gone
      expect(wrapper.find('.error-message').exists()).toBe(false)
    })

    it('should clear validation error when branch name is empty', async () => {
      wrapper = mount(OnboardingTaskDetail, {
        global: {
          directives: {
            'disable-terminal': { mounted() {}, unmounted() {} },
          },
        },
      })
      await nextTick()

      const branchNameInput = wrapper.find('#branch-name')

      // Set invalid branch first
      await branchNameInput.setValue('invalid-branch')
      await branchNameInput.trigger('input')

      // Clear branch name
      await branchNameInput.setValue('')
      await branchNameInput.trigger('input')

      // Error should be cleared
      expect(wrapper.find('.error-message').exists()).toBe(false)
    })
  })

  describe('Branch Name Editability', () => {
    it('should make branch name editable on click', async () => {
      wrapper = mount(OnboardingTaskDetail, {
        global: {
          directives: {
            'disable-terminal': { mounted() {}, unmounted() {} },
          },
        },
      })
      await nextTick()

      const branchNameInput = wrapper.find('#branch-name')

      // Initially readonly
      expect(branchNameInput.attributes('readonly')).toBe('')

      // Click to make editable
      await branchNameInput.trigger('click')
      expect(branchNameInput.attributes('readonly')).toBeUndefined()

      // Blur to make readonly again
      await branchNameInput.trigger('blur')
      expect(branchNameInput.attributes('readonly')).toBe('')
    })
  })

  describe('Form Sync to Terminal Bridge', () => {
    it('should sync task name changes to bridge', async () => {
      wrapper = mount(OnboardingTaskDetail, {
        global: {
          directives: {
            'disable-terminal': { mounted() {}, unmounted() {} },
          },
        },
      })
      await nextTick()

      const taskNameInput = wrapper.find('#task-name')

      // Type in task name
      await taskNameInput.setValue('My New Feature')
      await taskNameInput.trigger('input')

      // Should call updateInput on bridge
      expect(mockTerminalBridge.updateInput).toHaveBeenCalledWith(
        'My New Feature',
        'My New Feature'.length
      )
    })

    it('should sync custom branch name to bridge', async () => {
      wrapper = mount(OnboardingTaskDetail, {
        global: {
          directives: {
            'disable-terminal': { mounted() {}, unmounted() {} },
          },
        },
      })
      await nextTick()

      const taskNameInput = wrapper.find('#task-name')
      const branchNameInput = wrapper.find('#branch-name')

      // Set task name
      await taskNameInput.setValue('My Feature')
      await taskNameInput.trigger('input')

      // Manually edit branch name (makes it custom)
      await branchNameInput.setValue('custom/my-custom-branch')
      await branchNameInput.trigger('input')

      // Should include branch slug in sync
      expect(mockTerminalBridge.updateInput).toHaveBeenLastCalledWith(
        'My Feature | my-custom-branch',
        'My Feature | my-custom-branch'.length
      )
    })
  })

  describe('Placeholder Handling', () => {
    it('should show correct placeholders for different task types', async () => {
      const taskTypes = [
        {
          id: 'create-feature',
          expectedTaskPlaceholder: 'e.g., Add User Login',
        },
        {
          id: 'fix-bug',
          expectedTaskPlaceholder: 'e.g., Fix Login Button on Safari',
        },
        {
          id: 'improve-documentation',
          expectedTaskPlaceholder: 'e.g., Update API Documentation',
        },
        {
          id: 'perform-maintenance',
          expectedTaskPlaceholder: 'e.g., Update Dependencies',
        },
        {
          id: 'refactor-code',
          expectedTaskPlaceholder: 'e.g., Extract Authentication Logic',
        },
        { id: 'unknown-task', expectedTaskPlaceholder: 'e.g., Your task name' },
      ]

      for (const { id, expectedTaskPlaceholder } of taskTypes) {
        mockRefs.getSelectedTask.value = {
          id,
          title: 'Test Task',
          description: 'Test Description',
          example: 'Test Example',
        }

        wrapper = mount(OnboardingTaskDetail, {
          global: {
            directives: {
              'disable-terminal': { mounted() {}, unmounted() {} },
            },
          },
        })
        await nextTick()

        const taskNameInput = wrapper.find('#task-name')
        expect(taskNameInput.attributes('placeholder')).toBe(
          expectedTaskPlaceholder
        )

        wrapper.unmount()
      }
    })

    it('should show placeholder when no task is selected', async () => {
      mockRefs.getSelectedTask.value = null

      wrapper = mount(OnboardingTaskDetail, {
        global: {
          directives: {
            'disable-terminal': { mounted() {}, unmounted() {} },
          },
        },
      })
      await nextTick()

      const taskNameInput = wrapper.find('#task-name')
      expect(taskNameInput.attributes('placeholder')).toBe(
        'e.g., Add User Login'
      )
    })
  })

  describe('Component Unmount', () => {
    it('should clean up bridge subscription on unmount', async () => {
      const unsubscribeFn = vi.fn()
      mockTerminalBridge.subscribe.mockReturnValue(unsubscribeFn)

      wrapper = mount(OnboardingTaskDetail, {
        global: {
          directives: {
            'disable-terminal': { mounted() {}, unmounted() {} },
          },
        },
      })
      await nextTick()

      // Unmount should call unsubscribe
      wrapper.unmount()
      expect(unsubscribeFn).toHaveBeenCalled()
    })

    it('should handle unmount when no unsubscribe function exists', async () => {
      mockTerminalBridge.subscribe.mockReturnValue(null)

      wrapper = mount(OnboardingTaskDetail, {
        global: {
          directives: {
            'disable-terminal': { mounted() {}, unmounted() {} },
          },
        },
      })
      await nextTick()

      // Should not throw on unmount
      expect(() => wrapper.unmount()).not.toThrow()
    })
  })

  describe('Start Building Handler', () => {
    it('should handle start building button click correctly', async () => {
      wrapper = mount(OnboardingTaskDetail, {
        global: {
          directives: {
            'disable-terminal': { mounted() {}, unmounted() {} },
          },
        },
      })
      await nextTick()

      // Set up form data
      const taskNameInput = wrapper.find('#task-name')
      await taskNameInput.setValue('Test Task')

      const branchNameInput = wrapper.find('#branch-name')
      await branchNameInput.setValue('feature/test-task')

      // Click the start building button
      const startButton = wrapper.find('[data-testid="cta-button"]')
      await startButton.trigger('click')

      // Verify selectBranch was called with correct params
      expect(mockSelectBranch).toHaveBeenCalledWith({
        name: 'feature/test-task',
        base: 'main',
        agent: 'default',
      })

      // Verify nextStep was called
      expect(mockNextStep).toHaveBeenCalled()
    })
  })

  describe('Edge Cases', () => {
    it('should handle task name clearing when task name is empty', async () => {
      const task = {
        id: 'create-feature',
        title: 'Create Feature',
        description: 'Build new functionality',
        example: 'Add user login',
      }
      mockRefs.getSelectedTask.value = task

      wrapper = mount(OnboardingTaskDetail, {
        global: {
          directives: {
            'disable-terminal': { mounted() {}, unmounted() {} },
          },
        },
      })
      await nextTick()

      const taskNameInput = wrapper.find('#task-name')
      const branchNameInput = wrapper.find('#branch-name')

      // Clear task name
      await taskNameInput.setValue('')
      await taskNameInput.trigger('input')

      // Branch name should also be cleared
      expect((branchNameInput.element as HTMLInputElement).value).toBe('')
    })

    it('should extract task name from different branch prefixes', async () => {
      const testCases = [
        { branch: 'feature/add-user-login', expected: 'Add User Login' },
        { branch: 'bugfix/fix-login-issue', expected: 'Fix Login Issue' },
        { branch: 'docs/update-readme', expected: 'Update Readme' },
        { branch: 'chore/update-deps', expected: 'Update Deps' },
        { branch: 'refactor/extract-logic', expected: 'Extract Logic' },
        { branch: 'invalid-format', expected: '' },
      ]

      for (const { branch, expected } of testCases) {
        mockRefs.getSelectedBranch.value = {
          name: branch,
          base: 'main',
          agent: 'default',
        }

        wrapper = mount(OnboardingTaskDetail, {
          global: {
            directives: {
              'disable-terminal': { mounted() {}, unmounted() {} },
            },
          },
        })
        await nextTick()

        const taskNameInput = wrapper.find('#task-name')
        expect((taskNameInput.element as HTMLInputElement).value).toBe(expected)

        wrapper.unmount()
      }
    })

    it('should handle mount phase properly with bridge task name', async () => {
      // Set initial bridge task name
      mockTerminalBridge.useTaskDetails.mockReturnValue({
        taskName: { value: 'Bridge Initial Task' },
      })

      const consoleSpy = vi.spyOn(console, 'log')

      wrapper = mount(OnboardingTaskDetail, {
        global: {
          directives: {
            'disable-terminal': { mounted() {}, unmounted() {} },
          },
        },
      })
      await nextTick()

      expect(consoleSpy).toHaveBeenCalledWith(
        '[TaskDetail] Component mounted, loading existing data'
      )

      // Task name should be from bridge
      const taskNameInput = wrapper.find('#task-name')
      expect((taskNameInput.element as HTMLInputElement).value).toBe(
        'Bridge Initial Task'
      )

      consoleSpy.mockRestore()
    })
  })
})
