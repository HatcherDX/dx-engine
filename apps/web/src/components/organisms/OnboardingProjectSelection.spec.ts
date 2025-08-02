import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import OnboardingProjectSelection from './OnboardingProjectSelection.vue'

// Mock composables
const mockNextStep = vi.fn()
const mockPreviousStep = vi.fn()
const mockTruncatePath = vi.fn()

vi.mock('../../composables/useOnboarding', () => ({
  useOnboarding: () => ({
    nextStep: mockNextStep,
    previousStep: mockPreviousStep,
  }),
}))

vi.mock('../../composables/useSmartTruncation', () => ({
  useSmartTruncation: () => ({
    truncatePath: mockTruncatePath,
  }),
}))

// Mock child components
vi.mock('../atoms/BaseButton.vue', () => ({
  default: {
    name: 'BaseButton',
    template: `
      <button 
        class="base-button" 
        :class="$props.class"
        :variant="$props.variant"
        :size="$props.size"
        :disabled="$props.disabled"
        @click="$emit('click')"
      >
        <slot />
      </button>
    `,
    props: ['variant', 'size', 'class', 'disabled'],
    emits: ['click'],
  },
}))

vi.mock('../atoms/BaseIcon.vue', () => ({
  default: {
    name: 'BaseIcon',
    template: '<span class="base-icon" />',
    props: ['name', 'size', 'class'],
  },
}))

vi.mock('../atoms/BaseLogo.vue', () => ({
  default: {
    name: 'BaseLogo',
    template: '<div class="base-logo" />',
    props: ['size', 'variant'],
  },
}))

describe('OnboardingProjectSelection.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockTruncatePath.mockImplementation((path, maxLength) => {
      return path.length > maxLength
        ? `${path.substring(0, maxLength)}...`
        : path
    })
  })

  it('should mount and render without errors', () => {
    const wrapper = mount(OnboardingProjectSelection)
    expect(wrapper.exists()).toBe(true)
  })

  it('should render main container structure', () => {
    const wrapper = mount(OnboardingProjectSelection)

    expect(wrapper.find('.onboarding-project-selection').exists()).toBe(true)
    expect(wrapper.find('.project-container').exists()).toBe(true)
    expect(wrapper.find('.project-content').exists()).toBe(true)
  })

  it('should render content grid with correct structure', () => {
    const wrapper = mount(OnboardingProjectSelection)

    expect(wrapper.find('.content-grid').exists()).toBe(true)
    expect(wrapper.find('.top-row').exists()).toBe(true)
    expect(wrapper.find('.bottom-row').exists()).toBe(true)
    expect(wrapper.find('.left-column').exists()).toBe(true)
    expect(wrapper.find('.right-column').exists()).toBe(true)
  })

  it('should render logo section', () => {
    const wrapper = mount(OnboardingProjectSelection)

    const logoSection = wrapper.find('.logo-section')
    expect(logoSection.exists()).toBe(true)

    const baseLogo = wrapper.findComponent({ name: 'BaseLogo' })
    expect(baseLogo.exists()).toBe(true)
    expect(baseLogo.props('size')).toBe('lg')
    expect(baseLogo.props('variant')).toBe('inline')
  })

  it('should render "Start a Project" section with action buttons', () => {
    const wrapper = mount(OnboardingProjectSelection)

    const actionsSection = wrapper.find('.actions-section')
    expect(actionsSection.exists()).toBe(true)

    const sectionTitle = actionsSection.find('.section-title')
    expect(sectionTitle.text()).toBe('Start a Project')

    const actionButtons = wrapper.findAll('.action-button')
    expect(actionButtons).toHaveLength(3)

    // Check first button (Open Project)
    expect(actionButtons[0].text()).toContain('📂 Open Project...')
    expect((actionButtons[0].element as HTMLButtonElement).disabled).toBeFalsy()

    // Check disabled buttons
    expect(actionButtons[1].text()).toContain('+ New Project')
    expect((actionButtons[1].element as HTMLButtonElement).disabled).toBe(true)

    expect(actionButtons[2].text()).toContain('🌐 Clone from Git...')
    expect((actionButtons[2].element as HTMLButtonElement).disabled).toBe(true)
  })

  it('should render recent projects section', () => {
    const wrapper = mount(OnboardingProjectSelection)

    const recentSection = wrapper.find('.recent-section')
    expect(recentSection.exists()).toBe(true)

    const sectionTitle = recentSection.find('.section-title')
    expect(sectionTitle.text()).toBe('Recent Projects')

    const projectItems = wrapper.findAll('.project-item')
    expect(projectItems).toHaveLength(4)

    // Check project names
    const projectNames = projectItems.map((item) =>
      item.find('.project-name').text()
    )
    expect(projectNames).toContain('E-commerce Dashboard')
    expect(projectNames).toContain('React Component Library')
    expect(projectNames).toContain('Mobile App Backend')
    expect(projectNames).toContain('Portfolio Website')
  })

  it('should render project items with correct structure', () => {
    const wrapper = mount(OnboardingProjectSelection)

    const firstProject = wrapper.find('.project-item')
    expect(firstProject.exists()).toBe(true)

    expect(firstProject.find('.project-left').exists()).toBe(true)
    expect(firstProject.find('.project-icon').exists()).toBe(true)
    expect(firstProject.find('.project-info').exists()).toBe(true)
    expect(firstProject.find('.project-name').exists()).toBe(true)
    expect(firstProject.find('.project-path').exists()).toBe(true)

    const arrowIcon = firstProject.findComponent({ name: 'BaseIcon' })
    expect(arrowIcon.exists()).toBe(true)
    expect(arrowIcon.props('name')).toBe('ArrowRight')
    expect(arrowIcon.props('size')).toBe('sm')
  })

  it('should render "Learn & Discover" section', () => {
    const wrapper = mount(OnboardingProjectSelection)

    const learnSection = wrapper.find('.learn-section')
    expect(learnSection.exists()).toBe(true)

    const sectionTitle = learnSection.find('.section-title')
    expect(sectionTitle.text()).toBe('Learn & Discover')

    const learnCards = wrapper.findAll('.learn-card')
    expect(learnCards).toHaveLength(3)

    // Check card titles
    const cardTitles = learnCards.map((card) => card.find('.card-title').text())
    expect(cardTitles).toContain('Getting Started Guide')
    expect(cardTitles).toContain('Video Tutorials')
    expect(cardTitles).toContain('Best Practices')
  })

  it('should render learn cards with correct structure', () => {
    const wrapper = mount(OnboardingProjectSelection)

    const firstCard = wrapper.find('.learn-card')
    expect(firstCard.exists()).toBe(true)
    expect(firstCard.classes()).toContain('disabled-card')

    expect(firstCard.find('.card-icon').exists()).toBe(true)
    expect(firstCard.find('.card-title').exists()).toBe(true)
    expect(firstCard.find('.card-description').exists()).toBe(true)

    expect(firstCard.find('.card-icon').text()).toBe('📚')
    expect(firstCard.find('.card-title').text()).toBe('Getting Started Guide')
    expect(firstCard.find('.card-description').text()).toBe(
      'Learn the basics of Controlled Amplification'
    )
  })

  it('should render navigation section with back button', () => {
    const wrapper = mount(OnboardingProjectSelection)

    const navigationSection = wrapper.find('.navigation-section')
    expect(navigationSection.exists()).toBe(true)

    const backButton = navigationSection.findComponent({ name: 'BaseButton' })
    expect(backButton.exists()).toBe(true)
    expect(backButton.props('variant')).toBe('ghost')
    expect(backButton.props('size')).toBe('md')
    expect(backButton.classes()).toContain('back-button')
    expect(backButton.text()).toContain('Welcome')

    const backIcon = backButton.findComponent({ name: 'BaseIcon' })
    expect(backIcon.exists()).toBe(true)
    expect(backIcon.props('name')).toBe('ArrowRight')
    // Note: back-icon class is added via component props, not directly on BaseIcon
    expect(backIcon.props('class')).toContain('back-icon')
  })

  it('should handle open project button click', async () => {
    const wrapper = mount(OnboardingProjectSelection)

    const openProjectButton = wrapper.findAll('.action-button')[0]
    await openProjectButton.trigger('click')

    expect(mockNextStep).toHaveBeenCalledOnce()
  })

  it('should handle project item click', async () => {
    const wrapper = mount(OnboardingProjectSelection)

    const firstProjectItem = wrapper.find('.project-item')
    await firstProjectItem.trigger('click')

    expect(mockNextStep).toHaveBeenCalledOnce()
  })

  it('should handle back button click', async () => {
    const wrapper = mount(OnboardingProjectSelection)

    const backButton = wrapper.find('.back-button')
    await backButton.trigger('click')

    expect(mockPreviousStep).toHaveBeenCalledOnce()
  })

  it('should call truncatePath for project paths', () => {
    mount(OnboardingProjectSelection)

    expect(mockTruncatePath).toHaveBeenCalledWith(
      '/Users/chris/Projects/ecommerce-dashboard',
      250
    )
    expect(mockTruncatePath).toHaveBeenCalledWith(
      '/Users/chris/Sites/ui-components',
      250
    )
    expect(mockTruncatePath).toHaveBeenCalledWith(
      '/Users/chris/Development/mobile-api',
      250
    )
    expect(mockTruncatePath).toHaveBeenCalledWith(
      '/Users/chris/Sites/portfolio-v2',
      250
    )
  })

  it('should have correct CSS classes for disabled elements', () => {
    const wrapper = mount(OnboardingProjectSelection)

    // Check disabled button wrappers
    const disabledWrappers = wrapper.findAll('.disabled-button-wrapper')
    expect(disabledWrappers).toHaveLength(2)

    disabledWrappers.forEach((wrapper) => {
      expect(wrapper.attributes('title')).toBe('Coming soon')
    })

    // Check disabled action buttons
    const disabledActions = wrapper.findAll('.disabled-action')
    expect(disabledActions).toHaveLength(2)

    // Check disabled cards
    const disabledCards = wrapper.findAll('.disabled-card')
    expect(disabledCards).toHaveLength(3)

    disabledCards.forEach((card) => {
      expect(card.attributes('title')).toBe('Coming soon')
    })
  })

  it('should handle multiple project item clicks', async () => {
    const wrapper = mount(OnboardingProjectSelection)

    const projectItems = wrapper.findAll('.project-item')

    // Click each project item
    for (const item of projectItems) {
      await item.trigger('click')
    }

    expect(mockNextStep).toHaveBeenCalledTimes(4)
  })

  it('should render all project icons correctly', () => {
    const wrapper = mount(OnboardingProjectSelection)

    const projectIcons = wrapper.findAll('.project-icon')
    expect(projectIcons).toHaveLength(4)

    projectIcons.forEach((icon) => {
      expect(icon.text()).toBe('📁')
    })
  })

  it('should render all learn card icons correctly', () => {
    const wrapper = mount(OnboardingProjectSelection)

    const cardIcons = wrapper.findAll('.card-icon')
    expect(cardIcons).toHaveLength(3)

    expect(cardIcons[0].text()).toBe('📚')
    expect(cardIcons[1].text()).toBe('🎥')
    expect(cardIcons[2].text()).toBe('🛠️')
  })

  it('should maintain component reactivity', async () => {
    const wrapper = mount(OnboardingProjectSelection)

    // Test that all interactive elements are responsive
    const openProjectButton = wrapper.findAll('.action-button')[0]
    const firstProjectItem = wrapper.find('.project-item')
    const backButton = wrapper.find('.back-button')

    await openProjectButton.trigger('click')
    await firstProjectItem.trigger('click')
    await backButton.trigger('click')

    expect(mockNextStep).toHaveBeenCalledTimes(2)
    expect(mockPreviousStep).toHaveBeenCalledTimes(1)
  })

  it('should have proper accessibility structure', () => {
    const wrapper = mount(OnboardingProjectSelection)

    // Check for proper heading structure
    const sectionTitles = wrapper.findAll('.section-title')
    expect(sectionTitles).toHaveLength(3)

    sectionTitles.forEach((title) => {
      expect(title.element.tagName).toBe('H2')
    })

    // Check for proper project name structure
    const projectNames = wrapper.findAll('.project-name')
    expect(projectNames).toHaveLength(4)

    projectNames.forEach((name) => {
      expect(name.element.tagName).toBe('H3')
    })

    // Check for proper card title structure
    const cardTitles = wrapper.findAll('.card-title')
    expect(cardTitles).toHaveLength(3)

    cardTitles.forEach((title) => {
      expect(title.element.tagName).toBe('H3')
    })
  })
})
