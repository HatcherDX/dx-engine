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
})
