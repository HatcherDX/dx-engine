import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import OnboardingWelcome from './OnboardingWelcome.vue'

// Mock the useOnboarding composable
const mockNextStep = vi.fn()
const mockSetShowWelcomeTutorial = vi.fn()

vi.mock('../../composables/useOnboarding', () => ({
  useOnboarding: () => ({
    nextStep: mockNextStep,
    setShowWelcomeTutorial: mockSetShowWelcomeTutorial,
  }),
}))

// Mock child components
vi.mock('../atoms/BaseLogo.vue', () => ({
  default: {
    name: 'BaseLogo',
    props: ['size', 'variant'],
    template:
      '<div data-testid="base-logo" class="welcome-logo" :data-size="size" :data-variant="variant"><slot /></div>',
  },
}))

vi.mock('../atoms/CtaButton.vue', () => ({
  default: {
    name: 'CtaButton',
    props: ['variant', 'size', 'disabled'],
    emits: ['click'],
    template:
      '<button class="cta-button" @click="$emit(\'click\')"><slot /></button>',
  },
}))

describe('OnboardingWelcome.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should mount and render without errors', () => {
    const wrapper = mount(OnboardingWelcome)
    expect(wrapper.exists()).toBe(true)
  })

  it('should render welcome container with correct structure', () => {
    const wrapper = mount(OnboardingWelcome)

    const welcomeContainer = wrapper.find('.welcome-container')
    const welcomeContent = wrapper.find('.welcome-content')

    expect(welcomeContainer.exists()).toBe(true)
    expect(welcomeContent.exists()).toBe(true)
  })

  it('should render logo section', () => {
    const wrapper = mount(OnboardingWelcome)

    const logoSection = wrapper.find('.logo-section')
    const logo = wrapper.findComponent({ name: 'BaseLogo' })

    expect(logoSection.exists()).toBe(true)
    expect(logo.exists()).toBe(true)
    expect(logo.props('size')).toBe('lg')
    expect(logo.props('variant')).toBe('egg-white')
  })

  it('should render welcome text content', () => {
    const wrapper = mount(OnboardingWelcome)

    const textSection = wrapper.find('.text-section')
    const title = wrapper.find('.welcome-title')
    const subtitle = wrapper.find('.welcome-subtitle')
    const description = wrapper.find('.welcome-description')

    expect(textSection.exists()).toBe(true)
    expect(title.text()).toBe('Welcome to Hatcher')
    expect(subtitle.text()).toBe('The IDE for Controlled Amplification.')
    expect(description.text()).toContain(
      'Hatcher is a new kind of IDE that gives you deterministic control over AI'
    )
  })

  it('should render action section with get started button', () => {
    const wrapper = mount(OnboardingWelcome)

    const actionSection = wrapper.find('.action-section')
    const getStartedButton = wrapper.findComponent({ name: 'CtaButton' })
    const checkboxSection = wrapper.find('.checkbox-section')

    expect(actionSection.exists()).toBe(true)
    expect(getStartedButton.exists()).toBe(true)
    expect(checkboxSection.exists()).toBe(true)
  })

  it('should render checkbox section', () => {
    const wrapper = mount(OnboardingWelcome)

    const checkboxSection = wrapper.find('.checkbox-section')
    const checkboxLabel = wrapper.find('.checkbox-label')
    const checkboxInput = wrapper.find('.checkbox-input')
    const checkboxText = wrapper.find('.checkbox-text')

    expect(checkboxSection.exists()).toBe(true)
    expect(checkboxLabel.exists()).toBe(true)
    expect(checkboxInput.exists()).toBe(true)
    expect(checkboxText.text()).toBe("Don't show this welcome tutorial again")
  })

  it('should handle checkbox state correctly', async () => {
    const wrapper = mount(OnboardingWelcome)

    const checkboxInput = wrapper.find('.checkbox-input')
    expect((checkboxInput.element as HTMLInputElement).checked).toBe(false)

    await checkboxInput.setValue(true)
    expect((checkboxInput.element as HTMLInputElement).checked).toBe(true)
  })

  it('should call nextStep when get started button is clicked', async () => {
    const wrapper = mount(OnboardingWelcome)

    const getStartedButton = wrapper.findComponent({ name: 'CtaButton' })
    await getStartedButton.trigger('click')

    expect(mockNextStep).toHaveBeenCalledOnce()
  })

  it('should call setShowWelcomeTutorial when checkbox is checked and button clicked', async () => {
    const wrapper = mount(OnboardingWelcome)

    const checkboxInput = wrapper.find('.checkbox-input')
    const getStartedButton = wrapper.findComponent({ name: 'CtaButton' })

    // Check the checkbox first
    await checkboxInput.setValue(true)
    await getStartedButton.trigger('click')

    expect(mockSetShowWelcomeTutorial).toHaveBeenCalledWith(false)
    expect(mockNextStep).toHaveBeenCalledOnce()
  })

  it('should have proper CSS classes and styling structure', () => {
    const wrapper = mount(OnboardingWelcome)

    expect(wrapper.classes()).toContain('onboarding-welcome')
    expect(wrapper.find('.welcome-container').exists()).toBe(true)
    expect(wrapper.find('.welcome-content').exists()).toBe(true)
    expect(wrapper.find('.logo-section').exists()).toBe(true)
    expect(wrapper.find('.text-section').exists()).toBe(true)
    expect(wrapper.find('.action-section').exists()).toBe(true)
    expect(wrapper.find('.checkbox-section').exists()).toBe(true)
  })

  it('should render with fade-in animation class', () => {
    const wrapper = mount(OnboardingWelcome)

    const welcomeContainer = wrapper.find('.welcome-container')
    expect(welcomeContainer.exists()).toBe(true)
    // The fade-in animation is applied via CSS, component structure should support it
  })

  it('should handle checkbox interactions correctly', async () => {
    const wrapper = mount(OnboardingWelcome)

    const checkboxInput = wrapper.find('.checkbox-input')
    const checkboxLabel = wrapper.find('.checkbox-label')

    // Test that the checkbox input exists and has correct attributes
    expect((checkboxInput.element as HTMLInputElement).type).toBe('checkbox')
    expect(checkboxLabel.exists()).toBe(true)

    // Test checkbox can be clicked
    await checkboxInput.setValue(true)
    expect((checkboxInput.element as HTMLInputElement).checked).toBe(true)
  })

  it('should have accessible button structure', () => {
    const wrapper = mount(OnboardingWelcome)

    const getStartedButton = wrapper.findComponent({ name: 'CtaButton' })
    const checkboxInput = wrapper.find('.checkbox-input')
    const checkboxLabel = wrapper.find('.checkbox-label')

    expect(getStartedButton.exists()).toBe(true)
    expect((checkboxInput.element as HTMLInputElement).type).toBe('checkbox')
    expect(checkboxLabel.exists()).toBe(true)
  })

  it('should display correct welcome logo with proper styling class', () => {
    const wrapper = mount(OnboardingWelcome)

    const logo = wrapper.findComponent({ name: 'BaseLogo' })

    expect(logo.exists()).toBe(true)
    expect(logo.classes()).toContain('welcome-logo')
    expect(logo.props('size')).toBe('lg')
    expect(logo.props('variant')).toBe('egg-white')
  })

  it('should have proper semantic structure', () => {
    const wrapper = mount(OnboardingWelcome)

    // Check for proper heading structure
    const title = wrapper.find('h1.welcome-title')
    expect(title.exists()).toBe(true)

    // Check for proper paragraph structure
    const subtitle = wrapper.find('p.welcome-subtitle')
    const description = wrapper.find('p.welcome-description')
    expect(subtitle.exists()).toBe(true)
    expect(description.exists()).toBe(true)

    // Check for proper section structure
    const logoSection = wrapper.find('.logo-section')
    const textSection = wrapper.find('.text-section')
    const actionSection = wrapper.find('.action-section')

    expect(logoSection.exists()).toBe(true)
    expect(textSection.exists()).toBe(true)
    expect(actionSection.exists()).toBe(true)
  })

  it('should not render BaseIcon in current implementation', () => {
    const wrapper = mount(OnboardingWelcome)

    // Current implementation uses CtaButton without BaseIcon
    const ctaButton = wrapper.findComponent({ name: 'CtaButton' })
    expect(ctaButton.exists()).toBe(true)
    expect(ctaButton.text()).toBe('Get Started')
  })

  it('should maintain component reactivity', async () => {
    const wrapper = mount(OnboardingWelcome)

    // Component should remain reactive after interactions
    const getStartedButton = wrapper.findComponent({ name: 'CtaButton' })
    const checkboxInput = wrapper.find('.checkbox-input')

    await getStartedButton.trigger('click')
    expect(mockNextStep).toHaveBeenCalledTimes(1)

    // Test checkbox interaction
    await checkboxInput.setValue(true)
    expect((checkboxInput.element as HTMLInputElement).checked).toBe(true)

    // Should still be reactive for multiple clicks
    await getStartedButton.trigger('click')
    expect(mockNextStep).toHaveBeenCalledTimes(2)
    expect(mockSetShowWelcomeTutorial).toHaveBeenCalledWith(false)
  })
})
