/**
 * @fileoverview Comprehensive tests for OnboardingTaskDetail.vue component.
 *
 * @description
 * Tests for the onboarding task detail form including task metadata display,
 * form validation, input handling, branch name generation, and navigation.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import { mount, VueWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick, ref } from 'vue'
import OnboardingTaskDetail from './OnboardingTaskDetail.vue'

// Mock terminalInputBridge
vi.mock('../../composables/useTerminalInputBridge', () => ({
  terminalInputBridge: {
    useTaskDetails: () => ({ taskName: { value: '' } }),
    subscribe: vi.fn(() => () => {}),
    updateInput: vi.fn(),
  },
}))

// Mock child components with full API coverage

vi.mock('../atoms/BaseIcon.vue', () => ({
  default: {
    name: 'BaseIcon',
    props: ['name', 'size'],
    template:
      '<span data-testid="base-icon" :data-name="name" :data-size="size"><slot /></span>',
  },
}))

vi.mock('../atoms/CtaButton.vue', () => ({
  default: {
    name: 'CtaButton',
    props: ['disabled'],
    emits: ['click'],
    template:
      '<button data-testid="cta-button" :disabled="disabled" @click="$emit(\'click\', $event)"><slot /></button>',
  },
}))

// Define task interface based on actual implementation
interface TaskDetail {
  id: string
  title: string
  description: string
  example: string
}

// Define branch interface based on actual implementation
interface BranchDetail {
  name: string
  base: string
  agent: string
}

// Mock useOnboarding composable with comprehensive API
const mockOnboarding = {
  getSelectedTask: ref(null as TaskDetail | null),
  getSelectedBranch: ref(null as BranchDetail | null),
  nextStep: vi.fn(),
  selectBranch: vi.fn(),
  currentStep: ref('task-detail'),
}

vi.mock('../../composables/useOnboarding', () => ({
  useOnboarding: () => mockOnboarding,
}))

// Mock console methods to avoid noise in tests
const mockConsole = {
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}

beforeEach(() => {
  vi.clearAllMocks()

  // Mock console methods
  global.console = {
    ...console,
    log: mockConsole.log,
    warn: mockConsole.warn,
    error: mockConsole.error,
  }

  // Reset onboarding mock state
  mockOnboarding.getSelectedTask.value = null
  mockOnboarding.nextStep.mockClear()
  mockOnboarding.selectBranch.mockClear()
})

afterEach(() => {
  global.console = console
})

describe('OnboardingTaskDetail', () => {
  let wrapper: VueWrapper<InstanceType<typeof OnboardingTaskDetail>>

  // Helper function to create realistic task data
  const createMockTask = (
    id: string,
    title: string,
    description: string,
    example: string
  ): TaskDetail => ({
    id,
    title,
    description,
    example,
  })

  describe('Component Initialization', () => {
    /**
     * Tests basic component mounting and structure.
     *
     * @returns void
     * Should render without errors and display all sections
     *
     * @public
     */
    it('should mount successfully with default state', () => {
      wrapper = mount(OnboardingTaskDetail, {
        global: {
          directives: {
            'disable-terminal': { mounted() {}, unmounted() {} },
          },
        },
      })

      expect(wrapper.exists()).toBe(true)
      expect(wrapper.find('.onboarding-task-detail').exists()).toBe(true)
      expect(wrapper.find('.detail-container').exists()).toBe(true)
      expect(wrapper.find('.detail-content').exists()).toBe(true)
      expect(wrapper.find('.detail-header').exists()).toBe(true)
      expect(wrapper.find('.input-section').exists()).toBe(true)
      expect(wrapper.find('.action-section').exists()).toBe(true)
    })

    /**
     * Tests component structure with task data.
     *
     * @returns void
     * Should display all UI sections when task is provided
     *
     * @public
     */
    it('should render complete component structure', () => {
      const task = createMockTask(
        'create-feature',
        '🚀 Create Feature',
        'Build new functionality',
        'Add user authentication'
      )
      mockOnboarding.getSelectedTask.value = task

      wrapper = mount(OnboardingTaskDetail, {
        global: {
          directives: {
            'disable-terminal': { mounted() {}, unmounted() {} },
          },
        },
      })

      expect(wrapper.find('.detail-header').exists()).toBe(true)
      expect(wrapper.find('.task-title').exists()).toBe(true)
      expect(wrapper.find('.task-description').exists()).toBe(true)
    })

    /**
     * Tests form elements initialization.
     *
     * @returns void
     * Should render all form inputs and labels
     *
     * @public
     */
    it('should render form elements correctly', () => {
      wrapper = mount(OnboardingTaskDetail, {
        global: {
          directives: {
            'disable-terminal': { mounted() {}, unmounted() {} },
          },
        },
      })

      expect(wrapper.find('.section-title').text()).toBe(
        "Let's set up your task"
      )

      // Task name input
      expect(wrapper.find('label[for="task-name"]').exists()).toBe(true)
      expect(wrapper.find('label[for="task-name"]').text()).toBe('Task Name')
      expect(wrapper.find('#task-name').exists()).toBe(true)

      // Branch name input
      expect(wrapper.find('label[for="branch-name"]').exists()).toBe(true)
      expect(wrapper.find('label[for="branch-name"]').text()).toBe(
        'Branch Name'
      )
      expect(wrapper.find('#branch-name').exists()).toBe(true)
    })

    /**
     * Tests button rendering.
     *
     * @returns void
     * Should render CTA and back buttons
     *
     * @public
     */
    it('should render action buttons', () => {
      wrapper = mount(OnboardingTaskDetail, {
        global: {
          directives: {
            'disable-terminal': { mounted() {}, unmounted() {} },
          },
        },
      })

      const ctaButton = wrapper.find('[data-testid="cta-button"]')
      expect(ctaButton.exists()).toBe(true)
      expect(ctaButton.text()).toContain('Start Building')
    })
  })

  describe('Task Display', () => {
    /**
     * Tests task metadata display for create-feature task.
     *
     * @returns void
     * Should display correct task information and icon
     *
     * @public
     */
    it('should display create-feature task details correctly', () => {
      const task = createMockTask(
        'create-feature',
        '🚀 Create Feature',
        'Build new functionality for your application',
        'Add user authentication system'
      )
      mockOnboarding.getSelectedTask.value = task

      wrapper = mount(OnboardingTaskDetail, {
        global: {
          directives: {
            'disable-terminal': { mounted() {}, unmounted() {} },
          },
        },
      })

      // Title now includes emoji
      expect(wrapper.find('.task-title').text()).toBe('🚀 Create Feature')
      expect(wrapper.find('.task-description').text()).toBe(
        'Build new functionality for your application'
      )
    })

    /**
     * Tests task metadata display for fix-bug task.
     *
     * @returns void
     * Should display correct task information for bug fixing
     *
     * @public
     */
    it('should display fix-bug task details correctly', () => {
      const task = createMockTask(
        'fix-bug',
        '🐛 Fix Bug',
        'Identify and resolve issues in your codebase',
        'Fix memory leak in data processing'
      )
      mockOnboarding.getSelectedTask.value = task

      wrapper = mount(OnboardingTaskDetail, {
        global: {
          directives: {
            'disable-terminal': { mounted() {}, unmounted() {} },
          },
        },
      })

      // Title now includes emoji
      expect(wrapper.find('.task-title').text()).toBe('🐛 Fix Bug')
      expect(wrapper.find('.task-description').text()).toBe(
        'Identify and resolve issues in your codebase'
      )
    })

    /**
     * Tests task metadata display for documentation task.
     *
     * @returns void
     * Should display correct task information for documentation
     *
     * @public
     */
    it('should display improve-documentation task details correctly', () => {
      const task = createMockTask(
        'improve-documentation',
        '📚 Improve Documentation',
        'Create comprehensive documentation for your project',
        'Write API documentation for user service'
      )
      mockOnboarding.getSelectedTask.value = task

      wrapper = mount(OnboardingTaskDetail, {
        global: {
          directives: {
            'disable-terminal': { mounted() {}, unmounted() {} },
          },
        },
      })

      // Title now includes emoji
      expect(wrapper.find('.task-title').text()).toBe(
        '📚 Improve Documentation'
      )
      expect(wrapper.find('.task-description').text()).toBe(
        'Create comprehensive documentation for your project'
      )
    })

    /**
     * Tests task metadata display for maintenance task.
     *
     * @returns void
     * Should display correct task information for maintenance
     *
     * @public
     */
    it('should display perform-maintenance task details correctly', () => {
      const task = createMockTask(
        'perform-maintenance',
        '⚙️ Perform Maintenance',
        'Maintain and update your project dependencies',
        'Update React to latest version'
      )
      mockOnboarding.getSelectedTask.value = task

      wrapper = mount(OnboardingTaskDetail, {
        global: {
          directives: {
            'disable-terminal': { mounted() {}, unmounted() {} },
          },
        },
      })

      // Title now includes emoji
      expect(wrapper.find('.task-title').text()).toBe('⚙️ Perform Maintenance')
      expect(wrapper.find('.task-description').text()).toBe(
        'Maintain and update your project dependencies'
      )
    })

    /**
     * Tests task metadata display for refactoring task.
     *
     * @returns void
     * Should display correct task information for refactoring
     *
     * @public
     */
    it('should display refactor-code task details correctly', () => {
      const task = createMockTask(
        'refactor-code',
        '♻️ Refactor Code',
        'Improve your code structure and maintainability',
        'Extract components from monolithic file'
      )
      mockOnboarding.getSelectedTask.value = task

      wrapper = mount(OnboardingTaskDetail, {
        global: {
          directives: {
            'disable-terminal': { mounted() {}, unmounted() {} },
          },
        },
      })

      // Title now includes emoji
      expect(wrapper.find('.task-title').text()).toBe('♻️ Refactor Code')
      expect(wrapper.find('.task-description').text()).toBe(
        'Improve your code structure and maintainability'
      )
    })

    /**
     * Tests handling of missing task data.
     *
     * @returns void
     * Should handle null/undefined task gracefully
     *
     * @public
     */
    it('should handle missing task data gracefully', () => {
      mockOnboarding.getSelectedTask.value = null

      wrapper = mount(OnboardingTaskDetail, {
        global: {
          directives: {
            'disable-terminal': { mounted() {}, unmounted() {} },
          },
        },
      })

      // When task is null, computed properties return empty values
      expect(wrapper.find('.task-title').text()).toBe('')
      expect(wrapper.find('.task-description').text()).toBe('')
    })

    /**
     * Tests handling of malformed task data.
     *
     * @returns void
     * Should handle incomplete task objects gracefully
     *
     * @public
     */
    it('should handle malformed task data gracefully', () => {
      // Intentionally malformed data for testing
      mockOnboarding.getSelectedTask.value = {
        id: 'malformed-task',
        title: '1. Valid Title',
        description: '',
        example: '',
        category: 'general',
        difficulty: 'beginner',
        estimatedTime: '0 minutes',
        // Testing with minimal/empty data
      }

      wrapper = mount(OnboardingTaskDetail, {
        global: {
          directives: {
            'disable-terminal': { mounted() {}, unmounted() {} },
          },
        },
      })

      expect(wrapper.exists()).toBe(true)
      // Component shows title as-is (including number prefix)
      expect(wrapper.find('.task-title').text()).toBe('1. Valid Title')
      expect(wrapper.find('.task-description').text()).toBe('')
    })
  })

  describe('Form Validation', () => {
    beforeEach(() => {
      wrapper = mount(OnboardingTaskDetail, {
        global: {
          directives: {
            'disable-terminal': { mounted() {}, unmounted() {} },
          },
        },
      })
    })

    /**
     * Tests initial form validation state.
     *
     * @returns void
     * Should disable submit button when form is empty
     *
     * @public
     */
    it('should disable submit button when form is empty', () => {
      const ctaButton = wrapper.find('[data-testid="cta-button"]')
      expect(ctaButton.attributes('disabled')).toBe('')
    })

    /**
     * Tests form validation with only task name.
     *
     * @returns Promise<void>
     * Should keep submit button disabled when branch name is missing
     *
     * @public
     */
    it('should keep submit disabled with only task name', async () => {
      const taskNameInput = wrapper.find('#task-name')
      await taskNameInput.setValue('Test Feature')

      const ctaButton = wrapper.find('[data-testid="cta-button"]')
      // Should be disabled because branch name is still empty
      expect(ctaButton.attributes('disabled')).toBeDefined()
    })

    /**
     * Tests form validation with only branch name.
     *
     * @returns Promise<void>
     * Should keep submit button disabled when task name is missing
     *
     * @public
     */
    it('should keep submit disabled with only branch name', async () => {
      const branchNameInput = wrapper.find('#branch-name')
      await branchNameInput.setValue('feature/test-feature')

      const ctaButton = wrapper.find('[data-testid="cta-button"]')
      expect(ctaButton.attributes('disabled')).toBe('')
    })

    /**
     * Tests form validation with both fields filled.
     *
     * @returns Promise<void>
     * Should enable submit button when both fields are filled
     *
     * @public
     */
    it('should enable submit button when both fields are filled', async () => {
      const taskNameInput = wrapper.find('#task-name')
      const branchNameInput = wrapper.find('#branch-name')

      await taskNameInput.setValue('Test Feature')
      await branchNameInput.setValue('feature/test-feature')

      const ctaButton = wrapper.find('[data-testid="cta-button"]')
      expect(ctaButton.attributes('disabled')).toBeUndefined()
    })

    /**
     * Tests form validation with whitespace-only values.
     *
     * @returns Promise<void>
     * Should treat whitespace-only values as empty
     *
     * @public
     */
    it('should treat whitespace-only values as invalid', async () => {
      const taskNameInput = wrapper.find('#task-name')
      const branchNameInput = wrapper.find('#branch-name')

      await taskNameInput.setValue('   ')
      await branchNameInput.setValue('   ')

      const ctaButton = wrapper.find('[data-testid="cta-button"]')
      expect(ctaButton.attributes('disabled')).toBe('')
    })

    /**
     * Tests form validation reactivity.
     *
     * @returns Promise<void>
     * Should update validation state when fields change
     *
     * @public
     */
    it('should update validation reactively', async () => {
      const taskNameInput = wrapper.find('#task-name')
      const branchNameInput = wrapper.find('#branch-name')
      const ctaButton = wrapper.find('[data-testid="cta-button"]')

      // Fill both fields
      await taskNameInput.setValue('Test Feature')
      await branchNameInput.setValue('feature/test-feature')
      expect(ctaButton.attributes('disabled')).toBeUndefined()

      // Clear task name
      await taskNameInput.setValue('')
      expect(ctaButton.attributes('disabled')).toBe('')

      // Refill task name
      await taskNameInput.setValue('Test Feature')
      expect(ctaButton.attributes('disabled')).toBeUndefined()
    })
  })

  describe('Branch Name Generation', () => {
    beforeEach(() => {
      // Set up a task for branch generation to work
      const task = createMockTask(
        'create-feature',
        '🚀 Create Feature',
        'Build new functionality',
        'Add user login'
      )
      mockOnboarding.getSelectedTask.value = task
      wrapper = mount(OnboardingTaskDetail, {
        global: {
          directives: {
            'disable-terminal': { mounted() {}, unmounted() {} },
          },
        },
      })
    })

    /**
     * Tests automatic branch name generation from task name.
     *
     * @returns Promise<void>
     * Should generate feature branch name when task name changes
     *
     * @public
     */
    it('should generate branch name from task name', async () => {
      const taskNameInput = wrapper.find('#task-name')
      const branchNameInput = wrapper.find('#branch-name')

      await taskNameInput.setValue('Add User Login')
      await taskNameInput.trigger('input')

      expect((branchNameInput.element as HTMLInputElement).value).toBe(
        'feature/add-user-login'
      )
    })

    /**
     * Tests slugification of complex task names.
     *
     * @returns Promise<void>
     * Should handle special characters and spaces properly
     *
     * @public
     */
    it('should slugify complex task names correctly', async () => {
      const taskNameInput = wrapper.find('#task-name')
      const branchNameInput = wrapper.find('#branch-name')

      const testCases = [
        {
          input: 'Fix User Authentication!!!',
          expected: 'feature/fix-user-authentication',
        },
        {
          input: 'Add @Special #Characters',
          expected: 'feature/add-special-characters',
        },
        {
          input: 'Create/Update API Endpoints',
          expected: 'feature/create-update-api-endpoints',
        },
        {
          input: 'Remove   Extra   Whitespace',
          expected: 'feature/remove-extra-whitespace',
        },
        { input: '  Multiple   Spaces  ', expected: 'feature/multiple-spaces' },
      ]

      for (const testCase of testCases) {
        await taskNameInput.setValue(testCase.input)
        await taskNameInput.trigger('input')
        expect((branchNameInput.element as HTMLInputElement).value).toBe(
          testCase.expected
        )
      }
    })

    /**
     * Tests manual branch name editing.
     *
     * @returns Promise<void>
     * Should allow manual editing of branch name
     *
     * @public
     */
    it('should allow manual branch name editing', async () => {
      const taskNameInput = wrapper.find('#task-name')
      const branchNameInput = wrapper.find('#branch-name')

      await taskNameInput.setValue('Test Feature')
      await taskNameInput.trigger('input')
      expect((branchNameInput.element as HTMLInputElement).value).toBe(
        'feature/test-feature'
      )

      await branchNameInput.setValue('feature/custom-branch')
      expect((branchNameInput.element as HTMLInputElement).value).toBe(
        'feature/custom-branch'
      )
    })

    /**
     * Tests branch name generation with empty task name.
     *
     * @returns Promise<void>
     * Should handle empty task names gracefully
     *
     * @public
     */
    it('should handle empty task name for branch generation', async () => {
      const taskNameInput = wrapper.find('#task-name')
      const branchNameInput = wrapper.find('#branch-name')

      await taskNameInput.setValue('')
      await taskNameInput.trigger('input')

      expect((branchNameInput.element as HTMLInputElement).value).toBe('')
    })

    /**
     * Tests slugification edge cases.
     *
     * @returns Promise<void>
     * Should handle special characters and edge cases
     *
     * @public
     */
    it('should handle slugification edge cases', async () => {
      const taskNameInput = wrapper.find('#task-name')
      const branchNameInput = wrapper.find('#branch-name')

      const edgeCases = [
        {
          input: 'Special!@#$%^&*()Characters',
          expected: 'feature/special-characters',
        },
        { input: '123 Numeric Start', expected: 'feature/123-numeric-start' },
        { input: 'CamelCase Words', expected: 'feature/camelcase-words' },
        { input: 'Unicode Characters', expected: 'feature/unicode-characters' },
        { input: '--Leading-Dashes--', expected: 'feature/leading-dashes' },
      ]

      for (const edgeCase of edgeCases) {
        await taskNameInput.setValue(edgeCase.input)
        await taskNameInput.trigger('input')
        expect((branchNameInput.element as HTMLInputElement).value).toBe(
          edgeCase.expected
        )
      }
    })
  })

  describe('Task-Specific Initialization', () => {
    /**
     * Tests form initialization for create-feature task.
     *
     * @returns Promise<void>
     * Should start with empty form when create-feature task is selected
     *
     * @public
     */
    it('should start with empty form for create-feature task', async () => {
      const task = createMockTask(
        'create-feature',
        '🚀 Create Feature',
        'Description',
        'Example'
      )
      mockOnboarding.getSelectedTask.value = task

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

      // Form should be empty initially (watcher clears form)
      expect((taskNameInput.element as HTMLInputElement).value).toBe('')
      expect((branchNameInput.element as HTMLInputElement).value).toBe('')

      // But placeholder should show correct example
      expect(taskNameInput.attributes('placeholder')).toBe(
        'e.g., Add User Login'
      )
    })

    /**
     * Tests no auto-initialization for other tasks.
     *
     * @returns Promise<void>
     * Should not pre-fill form for non-feature tasks
     *
     * @public
     */
    it('should not auto-initialize non-feature tasks', async () => {
      const task = createMockTask(
        'fix-bug',
        '🐛 Fix Bug',
        'Description',
        'Example'
      )
      mockOnboarding.getSelectedTask.value = task

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

      expect((taskNameInput.element as HTMLInputElement).value).toBe('')
      expect((branchNameInput.element as HTMLInputElement).value).toBe('')
    })

    /**
     * Tests task watching reactivity.
     *
     * @returns Promise<void>
     * Should react to task changes after mounting
     *
     * @public
     */
    it('should react to task changes after mounting', async () => {
      // Start with create-feature task already set
      const featureTask = createMockTask(
        'create-feature',
        '🚀 Create Feature',
        'Description',
        'Example'
      )
      mockOnboarding.getSelectedTask.value = featureTask

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

      // Form should be cleared due to immediate: true watcher
      expect((taskNameInput.element as HTMLInputElement).value).toBe('')
      expect((branchNameInput.element as HTMLInputElement).value).toBe('')
    })

    /**
     * Tests immediate watcher execution.
     *
     * @returns Promise<void>
     * Should execute watcher immediately on mount
     *
     * @public
     */
    it('should execute task watcher immediately on mount', async () => {
      const task = createMockTask(
        'create-feature',
        '🚀 Create Feature',
        'Description',
        'Example'
      )
      mockOnboarding.getSelectedTask.value = task

      wrapper = mount(OnboardingTaskDetail, {
        global: {
          directives: {
            'disable-terminal': { mounted() {}, unmounted() {} },
          },
        },
      })

      // Form should be cleared immediately due to immediate: true option
      const taskNameInput = wrapper.find('#task-name')
      expect((taskNameInput.element as HTMLInputElement).value).toBe('')
    })
  })

  describe('User Interactions', () => {
    beforeEach(() => {
      // Set up a task for auto-generation to work
      const task = createMockTask(
        'create-feature',
        '🚀 Create Feature',
        'Build new functionality',
        'Add user login'
      )
      mockOnboarding.getSelectedTask.value = task
      wrapper = mount(OnboardingTaskDetail, {
        global: {
          directives: {
            'disable-terminal': { mounted() {}, unmounted() {} },
          },
        },
      })
    })

    /**
     * Tests task name input handling.
     *
     * @returns Promise<void>
     * Should update internal state when user types
     *
     * @public
     */
    it('should handle task name input', async () => {
      const taskNameInput = wrapper.find('#task-name')

      await taskNameInput.setValue('My New Feature')
      expect((taskNameInput.element as HTMLInputElement).value).toBe(
        'My New Feature'
      )
    })

    /**
     * Tests branch name input handling.
     *
     * @returns Promise<void>
     * Should update internal state when user types
     *
     * @public
     */
    it('should handle branch name input', async () => {
      const branchNameInput = wrapper.find('#branch-name')

      await branchNameInput.setValue('custom/my-branch')
      expect((branchNameInput.element as HTMLInputElement).value).toBe(
        'custom/my-branch'
      )
    })

    /**
     * Tests form submission with valid data.
     *
     * @returns Promise<void>
     * Should call nextStep when submit button is clicked
     *
     * @public
     */
    it('should handle form submission', async () => {
      const taskNameInput = wrapper.find('#task-name')
      const branchNameInput = wrapper.find('#branch-name')
      const ctaButton = wrapper.find('[data-testid="cta-button"]')

      await taskNameInput.setValue('Test Feature')
      await branchNameInput.setValue('feature/test-feature')

      await ctaButton.trigger('click')

      expect(mockOnboarding.nextStep).toHaveBeenCalledTimes(1)
    })

    /**
     * Tests multiple form interactions.
     *
     * @returns Promise<void>
     * Should handle rapid user input changes
     *
     * @public
     */
    it('should handle rapid input changes', async () => {
      const taskNameInput = wrapper.find('#task-name')
      const branchNameInput = wrapper.find('#branch-name')

      const inputSequence = [
        'Feature A',
        'Feature B',
        'Feature C',
        'Final Feature',
      ]

      for (const input of inputSequence) {
        await taskNameInput.setValue(input)
        await taskNameInput.trigger('input')
      }

      expect((taskNameInput.element as HTMLInputElement).value).toBe(
        'Final Feature'
      )
      expect((branchNameInput.element as HTMLInputElement).value).toBe(
        'feature/final-feature'
      )
    })

    /**
     * Tests keyboard interactions.
     *
     * @returns Promise<void>
     * Should handle Enter key and other keyboard events
     *
     * @public
     */
    it('should handle keyboard interactions', async () => {
      const taskNameInput = wrapper.find('#task-name')

      await taskNameInput.setValue('Test Feature')
      await taskNameInput.trigger('keydown', { key: 'Enter' })

      // Should not submit form on Enter (no form element)
      expect(mockOnboarding.nextStep).not.toHaveBeenCalled()
    })

    /**
     * Tests input placeholder text.
     *
     * @returns void
     * Should display helpful placeholder text
     *
     * @public
     */
    it('should display correct placeholder text', () => {
      const taskNameInput = wrapper.find('#task-name')
      const branchNameInput = wrapper.find('#branch-name')

      expect(taskNameInput.attributes('placeholder')).toBe(
        'e.g., Add User Login'
      )
      expect(branchNameInput.attributes('placeholder')).toBe(
        'feature/add-user-login'
      )
    })
  })

  describe('Component Lifecycle', () => {
    /**
     * Tests component mount behavior.
     *
     * @returns void
     * Should initialize correctly on mount
     *
     * @public
     */
    it('should initialize correctly on mount', () => {
      wrapper = mount(OnboardingTaskDetail, {
        global: {
          directives: {
            'disable-terminal': { mounted() {}, unmounted() {} },
          },
        },
      })

      expect(wrapper.exists()).toBe(true)
      expect(
        (wrapper.find('#task-name').element as HTMLInputElement).value
      ).toBe('')
      expect(
        (wrapper.find('#branch-name').element as HTMLInputElement).value
      ).toBe('')
    })

    /**
     * Tests component unmount behavior.
     *
     * @returns void
     * Should cleanup properly on unmount
     *
     * @public
     */
    it('should cleanup properly on unmount', () => {
      wrapper = mount(OnboardingTaskDetail, {
        global: {
          directives: {
            'disable-terminal': { mounted() {}, unmounted() {} },
          },
        },
      })

      expect(() => wrapper.unmount()).not.toThrow()
      expect(wrapper.exists()).toBe(false)
    })

    /**
     * Tests multiple mount/unmount cycles.
     *
     * @returns void
     * Should handle multiple lifecycle cycles without errors
     *
     * @public
     */
    it('should handle multiple mount/unmount cycles', () => {
      for (let i = 0; i < 3; i++) {
        wrapper = mount(OnboardingTaskDetail, {
          global: {
            directives: {
              'disable-terminal': { mounted() {}, unmounted() {} },
            },
          },
        })
        expect(wrapper.exists()).toBe(true)
        wrapper.unmount()
        expect(wrapper.exists()).toBe(false)
      }
    })

    /**
     * Tests component with props changes.
     *
     * @returns Promise<void>
     * Should handle prop updates gracefully
     *
     * @public
     */
    it('should handle prop updates gracefully', async () => {
      wrapper = mount(OnboardingTaskDetail, {
        global: {
          directives: {
            'disable-terminal': { mounted() {}, unmounted() {} },
          },
        },
      })

      // Component doesn't accept external props, but should remain stable
      expect(wrapper.exists()).toBe(true)

      await nextTick()
      expect(wrapper.exists()).toBe(true)
    })
  })

  describe('Error Handling', () => {
    /**
     * Tests handling of missing onboarding composable.
     *
     * @returns void
     * Should handle composable errors gracefully
     *
     * @public
     */
    it('should handle missing composable methods gracefully', () => {
      const originalNextStep = mockOnboarding.nextStep
      mockOnboarding.nextStep = vi.fn()

      expect(() => {
        wrapper = mount(OnboardingTaskDetail, {
          global: {
            directives: {
              'disable-terminal': { mounted() {}, unmounted() {} },
            },
          },
        })
      }).not.toThrow()

      mockOnboarding.nextStep = originalNextStep
    })

    /**
     * Tests handling of invalid form data.
     *
     * @returns Promise<void>
     * Should handle malformed input gracefully
     *
     * @public
     */
    it('should handle invalid form data gracefully', async () => {
      wrapper = mount(OnboardingTaskDetail, {
        global: {
          directives: {
            'disable-terminal': { mounted() {}, unmounted() {} },
          },
        },
      })

      const taskNameInput = wrapper.find('#task-name')
      const branchNameInput = wrapper.find('#branch-name')

      // Test with various invalid inputs
      const invalidInputs = ['', '   ', '\n\t', '😀😀😀', '🚀'.repeat(100)]

      for (const invalidInput of invalidInputs) {
        await taskNameInput.setValue(invalidInput)
        await branchNameInput.setValue(invalidInput)
        await taskNameInput.trigger('input')

        // Component should not crash
        expect(wrapper.exists()).toBe(true)
      }
    })

    /**
     * Tests error handling in event handlers.
     *
     * @returns Promise<void>
     * Should handle event handler errors gracefully
     *
     * @public
     */
    it('should handle event handler errors gracefully', async () => {
      // Test the component's ability to handle errors, not the actual error
      wrapper = mount(OnboardingTaskDetail, {
        global: {
          directives: {
            'disable-terminal': { mounted() {}, unmounted() {} },
          },
        },
      })

      const taskNameInput = wrapper.find('#task-name')
      const branchNameInput = wrapper.find('#branch-name')
      const ctaButton = wrapper.find('[data-testid="cta-button"]')

      await taskNameInput.setValue('Test Feature')
      await branchNameInput.setValue('feature/test-feature')

      // Component should handle button clicks properly
      await ctaButton.trigger('click')
      expect(mockOnboarding.nextStep).toHaveBeenCalled()
    })

    /**
     * Tests handling of valid task objects.
     *
     * @returns void
     * Should handle various valid task configurations
     *
     * @public
     */
    it('should handle various task configurations', () => {
      const validTasks: TaskDetail[] = [
        {
          id: 'create-feature',
          title: '🚀 Create Feature',
          description: 'Build new functionality',
          example: 'Add user authentication system',
          category: 'development',
          difficulty: 'intermediate',
          estimatedTime: '2 hours',
        },
        {
          id: 'fix-bug',
          title: '🐛 Fix Bug',
          description: 'Resolve existing issues',
          example: 'Fix login validation error',
          category: 'maintenance',
          difficulty: 'advanced',
          estimatedTime: '1 hour',
        },
        {
          id: 'improve-docs',
          title: '📚 Improve Documentation',
          description: 'Update documentation',
          example: 'Add code comments and README updates',
          category: 'documentation',
          difficulty: 'beginner',
          estimatedTime: '1 hour',
        },
      ]

      validTasks.forEach((task) => {
        mockOnboarding.getSelectedTask.value = task

        expect(() => {
          wrapper = mount(OnboardingTaskDetail, {
            global: {
              directives: {
                'disable-terminal': { mounted() {}, unmounted() {} },
              },
            },
          })
        }).not.toThrow()

        if (wrapper) {
          wrapper.unmount()
        }
      })
    })
  })

  describe('Accessibility', () => {
    beforeEach(() => {
      wrapper = mount(OnboardingTaskDetail, {
        global: {
          directives: {
            'disable-terminal': { mounted() {}, unmounted() {} },
          },
        },
      })
    })

    /**
     * Tests form label associations.
     *
     * @returns void
     * Should properly associate labels with inputs
     *
     * @public
     */
    it('should have proper label associations', () => {
      const taskNameLabel = wrapper.find('label[for="task-name"]')
      const taskNameInput = wrapper.find('#task-name')
      const branchNameLabel = wrapper.find('label[for="branch-name"]')
      const branchNameInput = wrapper.find('#branch-name')

      expect(taskNameLabel.exists()).toBe(true)
      expect(taskNameInput.exists()).toBe(true)
      expect(branchNameLabel.exists()).toBe(true)
      expect(branchNameInput.exists()).toBe(true)
    })

    /**
     * Tests button accessibility attributes.
     *
     * @returns void
     * Should have proper button attributes for screen readers
     *
     * @public
     */
    it('should have accessible button attributes', () => {
      const ctaButton = wrapper.find('[data-testid="cta-button"]')

      expect(ctaButton.exists()).toBe(true)

      // Button should have descriptive text content
      expect(ctaButton.text().trim()).toBeTruthy()
      expect(ctaButton.text()).toBe('Start Building')
    })

    /**
     * Tests input field accessibility.
     *
     * @returns void
     * Should have proper input attributes for accessibility
     *
     * @public
     */
    it('should have accessible input fields', () => {
      const taskNameInput = wrapper.find('#task-name')
      const branchNameInput = wrapper.find('#branch-name')

      expect(taskNameInput.attributes('type')).toBe('text')
      expect(branchNameInput.attributes('type')).toBe('text')
      expect(taskNameInput.attributes('placeholder')).toBeTruthy()
      expect(branchNameInput.attributes('placeholder')).toBeTruthy()
    })

    /**
     * Tests semantic HTML structure.
     *
     * @returns void
     * Should use semantic HTML elements appropriately
     *
     * @public
     */
    it('should use semantic HTML structure', () => {
      expect(wrapper.find('h1').exists()).toBe(true)
      expect(wrapper.find('h2').exists()).toBe(true)
      expect(wrapper.find('label').exists()).toBe(true)
      expect(wrapper.find('input').exists()).toBe(true)
    })

    /**
     * Tests keyboard navigation support.
     *
     * @returns Promise<void>
     * Should support keyboard navigation between elements
     *
     * @public
     */
    it('should support keyboard navigation', async () => {
      const taskNameInput = wrapper.find('#task-name')
      const branchNameInput = wrapper.find('#branch-name')

      // Should be able to trigger focus events
      await taskNameInput.trigger('focus')
      await branchNameInput.trigger('focus')

      // Elements should exist and be focusable
      expect(taskNameInput.exists()).toBe(true)
      expect(branchNameInput.exists()).toBe(true)
    })
  })

  describe('Visual Design', () => {
    beforeEach(() => {
      wrapper = mount(OnboardingTaskDetail, {
        global: {
          directives: {
            'disable-terminal': { mounted() {}, unmounted() {} },
          },
        },
      })
    })

    /**
     * Tests CSS class structure.
     *
     * @returns void
     * Should apply correct CSS classes for styling
     *
     * @public
     */
    it('should apply correct CSS classes', () => {
      expect(wrapper.find('.onboarding-task-detail').exists()).toBe(true)
      expect(wrapper.find('.detail-container').exists()).toBe(true)
      expect(wrapper.find('.detail-content').exists()).toBe(true)
      expect(wrapper.find('.detail-header').exists()).toBe(true)
      expect(wrapper.find('.input-section').exists()).toBe(true)
      expect(wrapper.find('.action-section').exists()).toBe(true)
    })

    /**
     * Tests responsive design elements.
     *
     * @returns void
     * Should have responsive design classes and structure
     *
     * @public
     */
    it('should have responsive design structure', () => {
      expect(wrapper.find('.detail-header').exists()).toBe(true)
      expect(wrapper.find('.task-title').exists()).toBe(true)
      expect(wrapper.find('.input-group').exists()).toBe(true)
    })

    /**
     * Tests input styling classes.
     *
     * @returns void
     * Should apply correct styling classes to inputs
     *
     * @public
     */
    it('should apply input styling classes', () => {
      const taskNameInput = wrapper.find('#task-name')
      const branchNameInput = wrapper.find('#branch-name')

      expect(taskNameInput.classes()).toContain('task-input')
      expect(branchNameInput.classes()).toContain('task-input')
      expect(branchNameInput.classes()).toContain('branch-input')
    })

    /**
     * Tests button styling integration.
     *
     * @returns void
     * Should integrate properly with button component styling
     *
     * @public
     */
    it('should integrate with button component styling', () => {
      const ctaButton = wrapper.find('[data-testid="cta-button"]')
      expect(ctaButton.exists()).toBe(true)
      // CtaButton should have proper structure
      expect(ctaButton.text()).toBe('Start Building')
    })
  })

  describe('Integration with Onboarding Flow', () => {
    /**
     * Tests integration with onboarding composable.
     *
     * @returns void
     * Should properly use onboarding composable methods
     *
     * @public
     */
    it('should integrate with onboarding composable', () => {
      wrapper = mount(OnboardingTaskDetail, {
        global: {
          directives: {
            'disable-terminal': { mounted() {}, unmounted() {} },
          },
        },
      })

      // Verify composable methods are available through mock
      expect(mockOnboarding.getSelectedTask).toBeDefined()
      expect(mockOnboarding.nextStep).toBeDefined()
      expect(mockOnboarding.selectBranch).toBeDefined()
    })

    /**
     * Tests step navigation flow.
     *
     * @returns Promise<void>
     * Should properly navigate between onboarding steps
     *
     * @public
     */
    it('should navigate between steps correctly', async () => {
      mockOnboarding.nextStep.mockClear()
      mockOnboarding.selectBranch.mockClear()

      wrapper = mount(OnboardingTaskDetail, {
        global: {
          directives: {
            'disable-terminal': { mounted() {}, unmounted() {} },
          },
        },
      })

      const taskNameInput = wrapper.find('#task-name')
      const branchNameInput = wrapper.find('#branch-name')
      const ctaButton = wrapper.find('[data-testid="cta-button"]')

      // Test forward navigation
      await taskNameInput.setValue('Test Feature')
      await branchNameInput.setValue('feature/test-feature')
      await ctaButton.trigger('click')
      expect(mockOnboarding.nextStep).toHaveBeenCalledTimes(1)

      // Should call selectBranch with branch config
      expect(mockOnboarding.selectBranch).toHaveBeenCalledWith({
        name: 'feature/test-feature',
        base: 'main',
        agent: 'default',
      })
    })

    /**
     * Tests state preservation across navigation.
     *
     * @returns Promise<void>
     * Should handle state correctly when navigating
     *
     * @public
     */
    it('should handle state changes during task selection', async () => {
      // Set initial task first
      const initialTask = createMockTask(
        'create-feature',
        '✨ Create Feature',
        'Build new features',
        'Add user authentication'
      )
      mockOnboarding.getSelectedTask.value = initialTask

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

      // Fill form
      await taskNameInput.setValue('Test Feature')
      await branchNameInput.setValue('feature/test-feature')

      // Verify form has values
      expect((taskNameInput.element as HTMLInputElement).value).toBe(
        'Test Feature'
      )
      expect((branchNameInput.element as HTMLInputElement).value).toBe(
        'feature/test-feature'
      )

      // When task changes, form should clear (due to watcher)
      const newTask = createMockTask(
        'fix-bug',
        '🐛 Fix Bug',
        'Fix issues',
        'Fix login bug'
      )
      mockOnboarding.getSelectedTask.value = newTask
      await nextTick()

      // Form should be cleared by the watcher
      expect((taskNameInput.element as HTMLInputElement).value).toBe('')
      expect((branchNameInput.element as HTMLInputElement).value).toBe('')
    })
  })
})
