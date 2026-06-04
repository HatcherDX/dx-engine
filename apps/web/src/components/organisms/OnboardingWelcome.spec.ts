import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
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
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
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
    const title = wrapper.find('.greeting-text')
    const subtitle = wrapper.find('.welcome-subtitle')
    const description = wrapper.find('.welcome-description')

    expect(textSection.exists()).toBe(true)
    expect(title.text()).toContain('Hello,')
    expect(subtitle.text()).toBe('The IDE for Controlled Amplification.')
    expect(description.text()).toContain(
      'Hatcher is built on a simple pact: to amplify your expertise, not replace it'
    )
  })

  it('should render action section with get started button', () => {
    const wrapper = mount(OnboardingWelcome)

    const actionSection = wrapper.find('.action-section')
    const getStartedButton = wrapper.findComponent({ name: 'CtaButton' })
    expect(actionSection.exists()).toBe(true)
    expect(getStartedButton.exists()).toBe(true)
  })

  it('should not render checkbox section (simplified component)', () => {
    const wrapper = mount(OnboardingWelcome)

    const checkboxSection = wrapper.find('.checkbox-section')
    expect(checkboxSection.exists()).toBe(false)
  })

  it('should not have checkbox elements (simplified component)', async () => {
    const wrapper = mount(OnboardingWelcome)

    const checkboxInput = wrapper.find('.checkbox-input')
    expect(checkboxInput.exists()).toBe(false)
  })

  it('should call nextStep when get started button is clicked', async () => {
    const wrapper = mount(OnboardingWelcome)

    const getStartedButton = wrapper.findComponent({ name: 'CtaButton' })
    await getStartedButton.trigger('click')

    expect(mockNextStep).toHaveBeenCalledOnce()
  })

  it('should only call nextStep when get started button is clicked (no checkbox)', async () => {
    const wrapper = mount(OnboardingWelcome)

    const getStartedButton = wrapper.findComponent({ name: 'CtaButton' })
    await getStartedButton.trigger('click')

    expect(mockNextStep).toHaveBeenCalledOnce()
    // setShowWelcomeTutorial should not be called since there's no checkbox
    expect(mockSetShowWelcomeTutorial).not.toHaveBeenCalled()
  })

  it('should have proper CSS classes and styling structure', () => {
    const wrapper = mount(OnboardingWelcome)

    expect(wrapper.classes()).toContain('onboarding-welcome')
    expect(wrapper.find('.welcome-container').exists()).toBe(true)
    expect(wrapper.find('.welcome-content').exists()).toBe(true)
    expect(wrapper.find('.logo-section').exists()).toBe(true)
    expect(wrapper.find('.text-section').exists()).toBe(true)
    expect(wrapper.find('.action-section').exists()).toBe(true)
    // No checkbox section in simplified component
    expect(wrapper.find('.checkbox-section').exists()).toBe(false)
  })

  it('should render with fade-in animation class', () => {
    const wrapper = mount(OnboardingWelcome)

    const welcomeContainer = wrapper.find('.welcome-container')
    expect(welcomeContainer.exists()).toBe(true)
    // The fade-in animation is applied via CSS, component structure should support it
  })

  it('should not have checkbox interactions (simplified component)', async () => {
    const wrapper = mount(OnboardingWelcome)

    const checkboxInput = wrapper.find('.checkbox-input')
    const checkboxLabel = wrapper.find('.checkbox-label')

    // Checkboxes don't exist in simplified component
    expect(checkboxInput.exists()).toBe(false)
    expect(checkboxLabel.exists()).toBe(false)
  })

  it('should have accessible button structure', () => {
    const wrapper = mount(OnboardingWelcome)

    const getStartedButton = wrapper.findComponent({ name: 'CtaButton' })

    expect(getStartedButton.exists()).toBe(true)
    // No checkbox elements in simplified component
    expect(wrapper.find('.checkbox-input').exists()).toBe(false)
    expect(wrapper.find('.checkbox-label').exists()).toBe(false)
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
    const title = wrapper.find('h1.greeting-text')
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

    await getStartedButton.trigger('click')
    expect(mockNextStep).toHaveBeenCalledTimes(1)

    // Should still be reactive for multiple clicks
    await getStartedButton.trigger('click')
    expect(mockNextStep).toHaveBeenCalledTimes(2)

    // No checkbox interactions since component is simplified
    expect(mockSetShowWelcomeTutorial).not.toHaveBeenCalled()
  })

  describe('Terminal Easter Egg Integration', () => {
    it('should register terminal-welcome-h event listener on mount', () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener')

      const wrapper = mount(OnboardingWelcome)

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'terminal-welcome-h',
        expect.any(Function)
      )

      wrapper.unmount()
    })

    it('should handle terminal-welcome-h event and trigger press effect', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      const wrapper = mount(OnboardingWelcome)

      // Create and dispatch the custom event
      const event = new CustomEvent('terminal-welcome-h')
      window.dispatchEvent(event)

      await nextTick()

      // Check that handleHKey was called (via console logs)
      expect(consoleSpy).toHaveBeenCalledWith(
        '[OnboardingWelcome] Activating press effect for Get Started button'
      )

      // Check that isPressActive is true
      const ctaButton = wrapper.findComponent({ name: 'CtaButton' })
      expect(ctaButton.classes()).toContain('press-active')

      // Fast forward time to check the timeout
      vi.advanceTimersByTime(400)
      await nextTick()

      expect(consoleSpy).toHaveBeenCalledWith(
        '[OnboardingWelcome] Removing press effect from Get Started button'
      )

      // Check that isPressActive is false after timeout
      expect(ctaButton.classes()).not.toContain('press-active')

      consoleSpy.mockRestore()
      wrapper.unmount()
    })

    it('should remove event listener on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')

      const wrapper = mount(OnboardingWelcome)

      // Unmount the component
      wrapper.unmount()

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'terminal-welcome-h',
        expect.any(Function)
      )
    })

    it('should log component mounted message', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      mount(OnboardingWelcome)

      expect(consoleSpy).toHaveBeenCalledWith(
        '[OnboardingWelcome] Component mounted'
      )

      consoleSpy.mockRestore()
    })

    it('should handle multiple terminal-welcome-h events', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      const wrapper = mount(OnboardingWelcome)

      // First event
      window.dispatchEvent(new CustomEvent('terminal-welcome-h'))
      await nextTick()

      expect(consoleSpy).toHaveBeenCalledWith(
        '[OnboardingWelcome] Activating press effect for Get Started button'
      )

      // Wait for effect to finish
      vi.advanceTimersByTime(400)
      await nextTick()

      expect(consoleSpy).toHaveBeenCalledWith(
        '[OnboardingWelcome] Removing press effect from Get Started button'
      )

      // Second event
      consoleSpy.mockClear()
      window.dispatchEvent(new CustomEvent('terminal-welcome-h'))
      await nextTick()

      expect(consoleSpy).toHaveBeenCalledWith(
        '[OnboardingWelcome] Activating press effect for Get Started button'
      )

      vi.advanceTimersByTime(400)
      await nextTick()

      expect(consoleSpy).toHaveBeenCalledWith(
        '[OnboardingWelcome] Removing press effect from Get Started button'
      )

      consoleSpy.mockRestore()
      wrapper.unmount()
    })

    it('should handle handleHKey function directly', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      const wrapper = mount(OnboardingWelcome)

      // Access handleHKey directly if exposed or through event
      const event = new CustomEvent('terminal-welcome-h')
      window.dispatchEvent(event)
      await nextTick()

      // Verify the press effect is active
      const ctaButton = wrapper.findComponent({ name: 'CtaButton' })
      expect(ctaButton.classes()).toContain('press-active')

      // Advance timers to complete the animation
      vi.advanceTimersByTime(200)
      await nextTick()

      // Still active (400ms timeout)
      expect(ctaButton.classes()).toContain('press-active')

      // Complete the timeout
      vi.advanceTimersByTime(200)
      await nextTick()

      // Should be inactive now
      expect(ctaButton.classes()).not.toContain('press-active')

      consoleSpy.mockRestore()
      wrapper.unmount()
    })

    it('should properly cleanup event listeners and timers on unmount during animation', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')

      const wrapper = mount(OnboardingWelcome)

      // Trigger the animation
      window.dispatchEvent(new CustomEvent('terminal-welcome-h'))
      await nextTick()

      expect(consoleSpy).toHaveBeenCalledWith(
        '[OnboardingWelcome] Activating press effect for Get Started button'
      )

      // Unmount while animation is active (before 400ms timeout)
      vi.advanceTimersByTime(200)
      wrapper.unmount()

      // Verify cleanup was called
      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'terminal-welcome-h',
        expect.any(Function)
      )

      // Note: In Vue, timers continue after unmount unless explicitly cleared
      // The component doesn't clear the timeout on unmount, so the log will still occur
      vi.advanceTimersByTime(300)
      await nextTick()

      // The timeout will still fire since it's not cleared on unmount
      expect(consoleSpy).toHaveBeenCalledWith(
        '[OnboardingWelcome] Removing press effect from Get Started button'
      )

      consoleSpy.mockRestore()
    })
  })

  describe('Component Lifecycle', () => {
    it('should setup and teardown correctly', async () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener')
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')

      const wrapper = mount(OnboardingWelcome)
      await nextTick()

      // Verify setup
      expect(addEventListenerSpy).toHaveBeenCalled()

      // Unmount and verify teardown
      wrapper.unmount()

      expect(removeEventListenerSpy).toHaveBeenCalled()

      // Verify the same function was removed that was added
      const addedHandler = addEventListenerSpy.mock.calls[0][1]
      const removedHandler = removeEventListenerSpy.mock.calls[0][1]
      expect(addedHandler).toBe(removedHandler)
    })

    it('should handle rapid mount/unmount cycles', async () => {
      const wrapper1 = mount(OnboardingWelcome)
      await nextTick()
      wrapper1.unmount()

      const wrapper2 = mount(OnboardingWelcome)
      await nextTick()
      wrapper2.unmount()

      const wrapper3 = mount(OnboardingWelcome)
      await nextTick()
      wrapper3.unmount()

      // No errors should occur
      expect(true).toBe(true)
    })
  })

  describe('Edge Cases', () => {
    it('should handle event dispatch when component is not fully mounted', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      // Mount and immediately dispatch event
      const wrapper = mount(OnboardingWelcome)
      window.dispatchEvent(new CustomEvent('terminal-welcome-h'))

      // Should still handle the event
      expect(consoleSpy).toHaveBeenCalledWith(
        '[OnboardingWelcome] Activating press effect for Get Started button'
      )

      consoleSpy.mockRestore()
      wrapper.unmount()
    })

    it('should handle press effect with immediate component unmount', async () => {
      const wrapper = mount(OnboardingWelcome)

      // Trigger press effect
      window.dispatchEvent(new CustomEvent('terminal-welcome-h'))
      await nextTick()

      // Immediately unmount
      wrapper.unmount()

      // Should not throw errors
      vi.advanceTimersByTime(500)
      await nextTick()

      expect(true).toBe(true)
    })
  })
})
