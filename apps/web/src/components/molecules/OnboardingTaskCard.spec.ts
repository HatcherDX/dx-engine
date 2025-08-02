import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import OnboardingTaskCard from './OnboardingTaskCard.vue'
import type { OnboardingTaskOption } from '../../composables/useOnboarding'

// Mock child components
vi.mock('../atoms/BaseIcon.vue', () => ({
  default: {
    name: 'BaseIcon',
    template: '<span class="base-icon" />',
    props: ['name', 'size', 'class'],
  },
}))

vi.mock('../atoms/BaseButton.vue', () => ({
  default: {
    name: 'BaseButton',
    template:
      '<button class="base-button" @click="$emit(\'click\')"><slot /></button>',
    props: ['variant', 'size', 'class'],
    emits: ['click'],
  },
}))

const mockTask: OnboardingTaskOption = {
  id: 'create-feature',
  title: '✨ Create a new Feature',
  description:
    'Recommended for building new functionalities, enhancements, or refactoring existing code.',
  icon: 'Code',
  example: 'Add a new user authentication system with OAuth integration',
  tooltipDetails:
    'The starting point for creative work that adds direct value to your users.',
}

describe('OnboardingTaskCard.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })
  it('should mount and render without errors', () => {
    const wrapper = mount(OnboardingTaskCard, {
      props: {
        task: mockTask,
      },
    })
    expect(wrapper.exists()).toBe(true)
  })

  it('should render task card with correct structure', () => {
    const wrapper = mount(OnboardingTaskCard, {
      props: {
        task: mockTask,
      },
    })

    expect(wrapper.find('.task-card').exists()).toBe(true)
    expect(wrapper.find('.card-header').exists()).toBe(true)
    expect(wrapper.find('.card-content').exists()).toBe(true)
    expect(wrapper.find('.card-arrow').exists()).toBe(true)
  })

  it('should render task emoji with correct content', () => {
    const wrapper = mount(OnboardingTaskCard, {
      props: {
        task: mockTask,
      },
    })

    const taskEmoji = wrapper.find('.task-emoji')
    const arrowIcon = wrapper.findComponent({ name: 'BaseIcon' })

    expect(taskEmoji.exists()).toBe(true)
    expect(taskEmoji.text()).toBe('✨') // First emoji from title
    expect(arrowIcon.props('name')).toBe('ArrowRight')
    expect(arrowIcon.props('size')).toBe('sm')
  })

  it('should render clickable state when not selected', () => {
    const wrapper = mount(OnboardingTaskCard, {
      props: {
        task: mockTask,
      },
    })

    const taskCard = wrapper.find('.task-card')
    expect(taskCard.classes()).toContain('task-clickable')
    expect(taskCard.classes()).not.toContain('task-selected')
  })

  it('should show selected state when isSelected is true', () => {
    const wrapper = mount(OnboardingTaskCard, {
      props: {
        task: mockTask,
        isSelected: true,
      },
    })

    const taskCard = wrapper.find('.task-card')
    expect(taskCard.classes()).toContain('task-selected')
    expect(taskCard.classes()).not.toContain('task-clickable')
  })

  it('should render task content correctly', () => {
    const wrapper = mount(OnboardingTaskCard, {
      props: {
        task: mockTask,
      },
    })

    const title = wrapper.find('.task-title')
    const description = wrapper.find('.task-description')

    expect(title.text()).toBe('Create a new Feature') // Emoji removed from title display
    expect(description.text()).toBe(
      'Recommended for building new functionalities, enhancements, or refactoring existing code.'
    )
  })

  it('should show tooltip on hover', async () => {
    const wrapper = mount(OnboardingTaskCard, {
      props: {
        task: mockTask,
      },
    })

    // Initially tooltip should not be visible
    expect(wrapper.find('.tooltip').exists()).toBe(false)

    // Trigger mouseenter
    await wrapper.find('.task-card').trigger('mouseenter')

    // Tooltip should now be visible
    expect(wrapper.find('.tooltip').exists()).toBe(true)
    expect(wrapper.find('.tooltip-details').text()).toBe(
      mockTask.tooltipDetails
    )
    expect(wrapper.find('.tooltip-example').text()).toContain(mockTask.example)
  })

  it('should emit select event when card is clicked', async () => {
    const wrapper = mount(OnboardingTaskCard, {
      props: {
        task: mockTask,
        isSelected: false,
      },
    })

    await wrapper.find('.task-card').trigger('click')

    expect(wrapper.emitted('select')).toBeTruthy()
    expect(wrapper.emitted('select')?.[0]).toEqual(['create-feature'])
  })

  it('should emit select event even when already selected', async () => {
    const wrapper = mount(OnboardingTaskCard, {
      props: {
        task: mockTask,
        isSelected: true,
      },
    })

    await wrapper.find('.task-card').trigger('click')

    expect(wrapper.emitted('select')).toBeTruthy()
    expect(wrapper.emitted('select')?.[0]).toEqual(['create-feature'])
  })

  it('should handle keyboard navigation', async () => {
    const wrapper = mount(OnboardingTaskCard, {
      props: {
        task: mockTask,
        isSelected: false,
      },
    })

    const taskCard = wrapper.find('.task-card')

    expect(taskCard.attributes('tabindex')).toBe('0')
    expect(taskCard.attributes('role')).toBe('button')

    // Test Enter key
    await taskCard.trigger('keydown.enter')
    expect(wrapper.emitted('select')).toBeTruthy()

    // Clear previous emissions for space test
    vi.clearAllMocks()

    // Test Space key
    await taskCard.trigger('keydown.space')
    expect(wrapper.emitted('select')).toBeTruthy()
  })

  it('should render with different task data', () => {
    const differentTask: OnboardingTaskOption = {
      id: 'improve-documentation',
      title: '📖 Improve Documentation',
      description:
        'Recommended for adding or refining comments, READMEs, or other documentation files.',
      icon: 'Eye',
      example: 'Update the CONTRIBUTING.md with the new release process',
      tooltipDetails:
        "This keeps your code history clean and separates documentation improvements from changes to the application's logic.",
    }

    const wrapper = mount(OnboardingTaskCard, {
      props: {
        task: differentTask,
      },
    })

    const title = wrapper.find('.task-title')
    const description = wrapper.find('.task-description')
    const emoji = wrapper.find('.task-emoji')

    expect(title.text()).toBe('Improve Documentation') // Emoji removed from title
    expect(description.text()).toBe(
      'Recommended for adding or refining comments, READMEs, or other documentation files.'
    )
    expect(emoji.text()).toBe('📖')
  })

  it('should have proper accessibility attributes', () => {
    const wrapper = mount(OnboardingTaskCard, {
      props: {
        task: mockTask,
      },
    })

    const taskCard = wrapper.find('.task-card')

    expect(taskCard.attributes('role')).toBe('button')
    expect(taskCard.attributes('tabindex')).toBe('0')
  })

  it('should apply correct CSS classes based on state', () => {
    const unselectedWrapper = mount(OnboardingTaskCard, {
      props: {
        task: mockTask,
        isSelected: false,
      },
    })

    const selectedWrapper = mount(OnboardingTaskCard, {
      props: {
        task: mockTask,
        isSelected: true,
      },
    })

    const unselectedCard = unselectedWrapper.find('.task-card')
    const selectedCard = selectedWrapper.find('.task-card')

    expect(unselectedCard.classes()).toContain('task-clickable')
    expect(unselectedCard.classes()).not.toContain('task-selected')

    expect(selectedCard.classes()).toContain('task-selected')
    expect(selectedCard.classes()).not.toContain('task-clickable')
  })

  it('should handle missing props gracefully', () => {
    const wrapper = mount(OnboardingTaskCard, {
      props: {
        task: mockTask,
        // isSelected defaults to false
      },
    })

    expect(wrapper.exists()).toBe(true)
    expect(wrapper.find('.task-card').classes()).toContain('task-clickable')
  })

  it('should hide tooltip on mouse leave', async () => {
    const wrapper = mount(OnboardingTaskCard, {
      props: {
        task: mockTask,
      },
    })

    // Show tooltip first
    await wrapper.find('.task-card').trigger('mouseenter')
    expect(wrapper.find('.tooltip').exists()).toBe(true)

    // Hide tooltip
    await wrapper.find('.task-card').trigger('mouseleave')
    expect(wrapper.find('.tooltip').exists()).toBe(false)
  })
})
