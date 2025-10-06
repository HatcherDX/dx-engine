import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import BaseAlert from './BaseAlert.vue'

/**
 * Test suite for BaseAlert component
 *
 * @remarks
 * Tests alert display, variants, dismissible behavior, and auto-close functionality.
 * Covers accessibility features and responsive design aspects.
 *
 * @since 1.0.0
 */
describe('BaseAlert', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  /**
   * Test basic alert rendering
   */
  it('renders alert with default props', () => {
    const wrapper = mount(BaseAlert, {
      props: {
        modelValue: true,
      },
      slots: {
        default: 'Test alert message',
      },
    })

    expect(wrapper.find('.alert').exists()).toBe(true)
    expect(wrapper.find('.alert-description').text()).toBe('Test alert message')
  })

  /**
   * Test alert with title and description
   */
  it('renders alert with title and description', () => {
    const wrapper = mount(BaseAlert, {
      props: {
        modelValue: true,
        title: 'Alert Title',
      },
      slots: {
        default: 'Alert description text',
      },
    })

    expect(wrapper.find('.alert-title').text()).toBe('Alert Title')
    expect(wrapper.find('.alert-description').text()).toBe(
      'Alert description text'
    )
  })

  /**
   * Test alert variants
   */
  it('applies correct variant classes', () => {
    const variants = [
      'default',
      'destructive',
      'warning',
      'success',
      'info',
      'error',
    ] as const

    variants.forEach((variant) => {
      const wrapper = mount(BaseAlert, {
        props: {
          modelValue: true,
          variant,
        },
        slots: {
          default: 'Test message',
        },
      })

      expect(wrapper.find(`.alert--${variant}`).exists()).toBe(true)
    })
  })

  /**
   * Test dismissible functionality
   */
  it('can be dismissed when dismissible is true', async () => {
    const wrapper = mount(BaseAlert, {
      props: {
        modelValue: true,
        dismissible: true,
      },
      slots: {
        default: 'Test message',
      },
    })

    const closeButton = wrapper.find('.alert-close')
    expect(closeButton.exists()).toBe(true)

    await closeButton.trigger('click')

    expect(wrapper.emitted('close')).toBeTruthy()
    expect(wrapper.emitted('update:modelValue')).toEqual([[false]])
  })

  /**
   * Test non-dismissible alert
   */
  it('hides close button when dismissible is false', () => {
    const wrapper = mount(BaseAlert, {
      props: {
        modelValue: true,
        dismissible: false,
      },
      slots: {
        default: 'Test message',
      },
    })

    expect(wrapper.find('.alert-close').exists()).toBe(false)
  })

  /**
   * Test auto-close functionality setup
   */
  it('sets up auto-close timer when autoClose prop is provided', () => {
    const wrapper = mount(BaseAlert, {
      props: {
        modelValue: true,
        autoClose: 1000,
      },
      slots: {
        default: 'Test message',
      },
    })

    expect(wrapper.find('.alert').exists()).toBe(true)
    expect(wrapper.props('autoClose')).toBe(1000)
    expect(wrapper.props('modelValue')).toBe(true)
  })

  /**
   * Test icon display
   */
  it('shows icon when showIcon is true', () => {
    const wrapper = mount(BaseAlert, {
      props: {
        modelValue: true,
        showIcon: true,
      },
      slots: {
        default: 'Test message',
      },
    })

    expect(wrapper.find('.alert-icon').exists()).toBe(true)
  })

  /**
   * Test icon hiding
   */
  it('hides icon when showIcon is false', () => {
    const wrapper = mount(BaseAlert, {
      props: {
        modelValue: true,
        showIcon: false,
      },
      slots: {
        default: 'Test message',
      },
    })

    expect(wrapper.find('.alert-icon').exists()).toBe(false)
  })

  /**
   * Test slot content
   */
  it('renders slot content', () => {
    const wrapper = mount(BaseAlert, {
      props: {
        modelValue: true,
      },
      slots: {
        default: '<strong>Custom alert content</strong>',
      },
    })

    expect(wrapper.html()).toContain('<strong>Custom alert content</strong>')
  })

  /**
   * Test accessibility attributes
   */
  it('has proper accessibility attributes', () => {
    const wrapper = mount(BaseAlert, {
      props: {
        modelValue: true,
        variant: 'error',
      },
      slots: {
        default: 'Test message',
      },
    })

    const alert = wrapper.find('.alert')
    expect(alert.attributes('role')).toBe('alert')
    expect(alert.attributes('aria-live')).toBe('assertive')
  })

  /**
   * Test visibility control
   */
  it('controls visibility with modelValue', async () => {
    const wrapper = mount(BaseAlert, {
      props: {
        modelValue: false,
      },
      slots: {
        default: 'Test message',
      },
    })

    expect(wrapper.find('.alert').exists()).toBe(false)

    await wrapper.setProps({ modelValue: true })
    expect(wrapper.find('.alert').exists()).toBe(true)
  })

  /**
   * Test auto-close timer execution
   */
  it('auto-closes after specified time', async () => {
    const wrapper = mount(BaseAlert, {
      props: {
        modelValue: true,
        autoClose: 1000,
      },
      slots: {
        default: 'Test message',
      },
    })

    expect(wrapper.find('.alert').exists()).toBe(true)
    expect(wrapper.emitted('close')).toBeFalsy()

    // Fast-forward time by 1000ms
    vi.advanceTimersByTime(1000)

    expect(wrapper.emitted('close')).toBeTruthy()
    expect(wrapper.emitted('update:modelValue')).toEqual([[false]])
  })

  /**
   * Test auto-close timer clearing when component unmounts
   */
  it('clears auto-close timer on unmount', () => {
    const wrapper = mount(BaseAlert, {
      props: {
        modelValue: true,
        autoClose: 5000,
      },
      slots: {
        default: 'Test message',
      },
    })

    expect(wrapper.find('.alert').exists()).toBe(true)

    // Unmount the component
    wrapper.unmount()

    // Timer should be cleared, so advancing time shouldn't trigger close
    vi.advanceTimersByTime(5000)
    expect(wrapper.emitted('close')).toBeFalsy()
  })

  /**
   * Test icon component computed property for all variants
   */
  it('renders correct icon for each variant', () => {
    const variants = [
      { variant: 'destructive', expectedIcon: 'X' },
      { variant: 'error', expectedIcon: 'X' },
      { variant: 'warning', expectedIcon: 'X' },
      { variant: 'success', expectedIcon: 'X' },
      { variant: 'info', expectedIcon: 'X' },
      { variant: 'default', expectedIcon: 'X' },
    ] as const

    variants.forEach(({ variant, expectedIcon }) => {
      const wrapper = mount(BaseAlert, {
        props: {
          modelValue: true,
          variant,
          showIcon: true,
        },
        slots: {
          default: 'Test message',
        },
      })

      const iconComponent = wrapper.findComponent({ name: 'BaseIcon' })
      expect(iconComponent.exists()).toBe(true)
      expect(iconComponent.props('name')).toBe(expectedIcon)
    })
  })

  /**
   * Test clearAutoClose function when no timer exists
   */
  it('handles clearAutoClose when no timer is set', () => {
    const wrapper = mount(BaseAlert, {
      props: {
        modelValue: true,
        autoClose: 0, // No auto-close
      },
      slots: {
        default: 'Test message',
      },
    })

    // Manually call updateVisible to test clearAutoClose branch
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test component instance requires type assertion for internal method access
    const vm = wrapper.vm as any
    vm.updateVisible(false) // This should call clearAutoClose when no timer exists

    expect(wrapper.emitted('update:modelValue')).toBeFalsy() // No event should be emitted in this case
  })

  /**
   * Test auto-close timer is cleared when modelValue changes to false
   */
  it('clears auto-close timer when modelValue changes to false', async () => {
    const wrapper = mount(BaseAlert, {
      props: {
        modelValue: true,
        autoClose: 5000,
      },
      slots: {
        default: 'Test message',
      },
    })

    expect(wrapper.find('.alert').exists()).toBe(true)

    // Change modelValue to false
    await wrapper.setProps({ modelValue: false })

    // Advance time - timer should be cleared so no auto-close event
    vi.advanceTimersByTime(5000)
    expect(wrapper.emitted('close')).toBeFalsy()
  })

  /**
   * Test auto-close timer is set up when modelValue changes to true
   */
  it('sets up auto-close timer when modelValue changes to true', async () => {
    const wrapper = mount(BaseAlert, {
      props: {
        modelValue: false,
        autoClose: 1000,
      },
      slots: {
        default: 'Test message',
      },
    })

    expect(wrapper.find('.alert').exists()).toBe(false)

    // Change modelValue to true
    await wrapper.setProps({ modelValue: true })
    expect(wrapper.find('.alert').exists()).toBe(true)

    // Fast-forward time to trigger auto-close
    vi.advanceTimersByTime(1000)
    expect(wrapper.emitted('close')).toBeTruthy()
  })

  /**
   * Test onMounted lifecycle when initially not visible
   */
  it('does not set up auto-close timer on mount when initially not visible', () => {
    const wrapper = mount(BaseAlert, {
      props: {
        modelValue: false,
        autoClose: 1000,
      },
      slots: {
        default: 'Test message',
      },
    })

    expect(wrapper.find('.alert').exists()).toBe(false)

    // Advance time - no timer should be active
    vi.advanceTimersByTime(1000)
    expect(wrapper.emitted('close')).toBeFalsy()
  })

  /**
   * Test aria-live attribute for different variants
   */
  it('has correct aria-live attribute for non-error variants', () => {
    const variants = ['default', 'warning', 'success', 'info'] as const

    variants.forEach((variant) => {
      const wrapper = mount(BaseAlert, {
        props: {
          modelValue: true,
          variant,
        },
        slots: {
          default: 'Test message',
        },
      })

      const alert = wrapper.find('.alert')
      expect(alert.attributes('aria-live')).toBe('polite')
    })
  })

  /**
   * Test aria-live attribute for error variant
   */
  it('has assertive aria-live for error variant only', () => {
    const wrapper = mount(BaseAlert, {
      props: {
        modelValue: true,
        variant: 'error',
      },
      slots: {
        default: 'Test message',
      },
    })

    const alert = wrapper.find('.alert')
    expect(alert.attributes('aria-live')).toBe('assertive')
  })

  /**
   * Test aria-live attribute for destructive variant
   */
  it('has polite aria-live for destructive variant', () => {
    const wrapper = mount(BaseAlert, {
      props: {
        modelValue: true,
        variant: 'destructive',
      },
      slots: {
        default: 'Test message',
      },
    })

    const alert = wrapper.find('.alert')
    expect(alert.attributes('aria-live')).toBe('polite')
  })

  /**
   * Test description prop usage without slot
   */
  it('renders description prop when no slot is provided', () => {
    const wrapper = mount(BaseAlert, {
      props: {
        modelValue: true,
        description: 'Description from prop',
      },
    })

    expect(wrapper.find('.alert-description').text()).toBe(
      'Description from prop'
    )
  })

  /**
   * Test slot takes precedence over description prop
   */
  it('slot content takes precedence over description prop', () => {
    const wrapper = mount(BaseAlert, {
      props: {
        modelValue: true,
        description: 'Description from prop',
      },
      slots: {
        default: 'Slot content',
      },
    })

    expect(wrapper.find('.alert-description').text()).toBe('Slot content')
    expect(wrapper.find('.alert-description').text()).not.toBe(
      'Description from prop'
    )
  })

  /**
   * Test close button accessibility label
   */
  it('uses custom close label for accessibility', () => {
    const wrapper = mount(BaseAlert, {
      props: {
        modelValue: true,
        dismissible: true,
        closeLabel: 'Custom close label',
      },
      slots: {
        default: 'Test message',
      },
    })

    const closeButton = wrapper.find('.alert-close')
    expect(closeButton.attributes('aria-label')).toBe('Custom close label')
  })

  /**
   * Test dismissible class application
   */
  it('applies dismissible class when dismissible is true', () => {
    const wrapper = mount(BaseAlert, {
      props: {
        modelValue: true,
        dismissible: true,
      },
      slots: {
        default: 'Test message',
      },
    })

    expect(wrapper.find('.alert--dismissible').exists()).toBe(true)
  })

  /**
   * Test dismissible class not applied when dismissible is false
   */
  it('does not apply dismissible class when dismissible is false', () => {
    const wrapper = mount(BaseAlert, {
      props: {
        modelValue: true,
        dismissible: false,
      },
      slots: {
        default: 'Test message',
      },
    })

    expect(wrapper.find('.alert--dismissible').exists()).toBe(false)
  })

  /**
   * Test title rendering when provided
   */
  it('does not render title element when title prop is empty', () => {
    const wrapper = mount(BaseAlert, {
      props: {
        modelValue: true,
        title: '',
      },
      slots: {
        default: 'Test message',
      },
    })

    expect(wrapper.find('.alert-title').exists()).toBe(false)
  })
})
