import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import OnboardingTaskSelection from './OnboardingTaskSelection.vue'

// Create mock refs for the composable
const mockSelectedTask = ref<string | null>(null)
const mockNextStep = vi.fn()
const mockPreviousStep = vi.fn()
const mockSelectTask = vi.fn()

vi.mock('../../composables/useOnboarding', () => ({
  useOnboarding: () => ({
    selectedTask: mockSelectedTask,
    nextStep: mockNextStep,
    previousStep: mockPreviousStep,
    selectTask: mockSelectTask,
    ONBOARDING_TASKS: [
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
    ],
  }),
}))

// Mock child components
vi.mock('../atoms/BaseButton.vue', () => ({
  default: {
    name: 'BaseButton',
    template:
      '<button class="base-button back-button" :disabled="$props.disabled" @click="$emit(\'click\')"><slot /></button>',
    props: ['variant', 'size', 'class', 'disabled'],
    emits: ['click'],
  },
}))

vi.mock('../atoms/BaseIcon.vue', () => ({
  default: {
    name: 'BaseIcon',
    template: '<span class="base-icon back-icon" />',
    props: ['name', 'size', 'class'],
  },
}))

vi.mock('../molecules/OnboardingTaskCard.vue', () => ({
  default: {
    name: 'OnboardingTaskCard',
    template:
      '<div class="task-card" :class="{ selected: $props.isSelected }" @select="$emit(\'select\', $props.task.id)"><slot /></div>',
    props: ['task', 'isSelected'],
    emits: ['select'],
  },
}))

describe('OnboardingTaskSelection.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSelectedTask.value = null
  })

  it('should mount and render without errors', () => {
    const wrapper = mount(OnboardingTaskSelection)
    expect(wrapper.exists()).toBe(true)
  })

  it('should render selection container with correct structure', () => {
    const wrapper = mount(OnboardingTaskSelection)

    const selectionContainer = wrapper.find('.selection-container')
    const selectionContent = wrapper.find('.selection-content')

    expect(selectionContainer.exists()).toBe(true)
    expect(selectionContent.exists()).toBe(true)
  })

  it('should render header section with title and subtitle', () => {
    const wrapper = mount(OnboardingTaskSelection)

    const header = wrapper.find('.selection-header')
    const title = wrapper.find('.selection-title')
    const subtitle = wrapper.find('.selection-subtitle')

    expect(header.exists()).toBe(true)
    expect(title.text()).toBe('Choose Your First Task')
    expect(subtitle.text()).toBe(
      'What type of work are you planning to do? This helps Hatcher provide the most relevant assistance for your workflow.'
    )
  })

  it('should render task cards grid with all onboarding tasks', () => {
    const wrapper = mount(OnboardingTaskSelection)

    const tasksGrid = wrapper.find('.tasks-grid')
    const taskCards = wrapper.findAllComponents({ name: 'OnboardingTaskCard' })

    expect(tasksGrid.exists()).toBe(true)
    expect(taskCards).toHaveLength(5) // Now we have 5 tasks

    // Verify each task card has correct props
    expect(taskCards[0].props('task').id).toBe('create-feature')
    expect(taskCards[1].props('task').id).toBe('fix-bug')
    expect(taskCards[2].props('task').id).toBe('improve-documentation')
    expect(taskCards[3].props('task').id).toBe('perform-maintenance')
    expect(taskCards[4].props('task').id).toBe('refactor-code')
  })

  it('should render navigation section with back button', () => {
    const wrapper = mount(OnboardingTaskSelection)

    const navigationSection = wrapper.find('.navigation-section')
    const backButton = wrapper.find('.back-button')

    expect(navigationSection.exists()).toBe(true)
    expect(backButton.exists()).toBe(true)

    const backButtonComponent = wrapper.findComponent({ name: 'BaseButton' })
    expect(backButtonComponent.props('variant')).toBe('ghost')
    expect(backButtonComponent.text()).toBe('Projects')
  })

  it('should handle task selection and navigate to next step', async () => {
    const wrapper = mount(OnboardingTaskSelection)

    const taskCard = wrapper.findComponent({ name: 'OnboardingTaskCard' })
    await taskCard.vm.$emit('select', 'create-feature')

    expect(mockSelectTask).toHaveBeenCalledWith('create-feature')
    expect(mockNextStep).toHaveBeenCalledOnce()
  })

  it('should call previousStep when back button is clicked', async () => {
    const wrapper = mount(OnboardingTaskSelection)

    const backButton = wrapper.findComponent({ name: 'BaseButton' })
    await backButton.trigger('click')

    expect(mockPreviousStep).toHaveBeenCalledOnce()
  })

  it('should pass correct isSelected prop to task cards', async () => {
    mockSelectedTask.value = 'improve-documentation'

    const wrapper = mount(OnboardingTaskSelection)

    const taskCards = wrapper.findAllComponents({ name: 'OnboardingTaskCard' })

    expect(taskCards[0].props('isSelected')).toBe(false) // create-feature
    expect(taskCards[1].props('isSelected')).toBe(false) // fix-bug
    expect(taskCards[2].props('isSelected')).toBe(true) // improve-documentation
    expect(taskCards[3].props('isSelected')).toBe(false) // perform-maintenance
    expect(taskCards[4].props('isSelected')).toBe(false) // refactor-code
  })

  it('should handle multiple task selections correctly', async () => {
    const wrapper = mount(OnboardingTaskSelection)

    const taskCards = wrapper.findAllComponents({ name: 'OnboardingTaskCard' })

    // Select first task
    await taskCards[0].vm.$emit('select', 'create-feature')
    expect(mockSelectTask).toHaveBeenCalledWith('create-feature')
    expect(mockNextStep).toHaveBeenCalledTimes(1)

    // Select second task
    await taskCards[1].vm.$emit('select', 'fix-bug')
    expect(mockSelectTask).toHaveBeenCalledWith('fix-bug')
    expect(mockNextStep).toHaveBeenCalledTimes(2)

    expect(mockSelectTask).toHaveBeenCalledTimes(2)
  })

  it('should render back icon with correct class', () => {
    const wrapper = mount(OnboardingTaskSelection)

    const backIcon = wrapper.find('.back-icon')
    expect(backIcon.exists()).toBe(true)
    expect(backIcon.classes()).toContain('back-icon')
  })

  it('should have proper semantic structure', () => {
    const wrapper = mount(OnboardingTaskSelection)

    // Check for proper heading structure
    const title = wrapper.find('h1.selection-title')
    expect(title.exists()).toBe(true)

    // Check for proper paragraph structure
    const subtitle = wrapper.find('p.selection-subtitle')
    expect(subtitle.exists()).toBe(true)

    // Check for proper section structure
    const header = wrapper.find('.selection-header')
    const grid = wrapper.find('.tasks-grid')
    const navigation = wrapper.find('.navigation-section')

    expect(header.exists()).toBe(true)
    expect(grid.exists()).toBe(true)
    expect(navigation.exists()).toBe(true)
  })

  it('should maintain proper CSS class structure', () => {
    const wrapper = mount(OnboardingTaskSelection)

    expect(wrapper.classes()).toContain('onboarding-task-selection')
    expect(wrapper.find('.selection-container').exists()).toBe(true)
    expect(wrapper.find('.selection-content').exists()).toBe(true)
    expect(wrapper.find('.tasks-grid').exists()).toBe(true)
    expect(wrapper.find('.navigation-section').exists()).toBe(true)
  })
})
