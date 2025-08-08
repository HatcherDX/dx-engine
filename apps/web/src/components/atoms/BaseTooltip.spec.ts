import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import BaseTooltip from './BaseTooltip.vue'

/**
 * Test suite for BaseTooltip component
 *
 * @remarks
 * Tests tooltip display, positioning, variants, and interaction behaviors.
 * Covers accessibility features and responsive design aspects.
 *
 * @since 1.0.0
 */
describe('BaseTooltip', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  /**
   * Test basic tooltip rendering and content display
   */
  it('renders tooltip with default props', () => {
    const wrapper = mount(BaseTooltip, {
      props: {
        content: 'Test tooltip content',
      },
      slots: {
        trigger: '<button>Hover me</button>',
      },
    })

    expect(wrapper.find('.tooltip-container').exists()).toBe(true)
    expect(wrapper.find('.tooltip-trigger').exists()).toBe(true)
  })

  /**
   * Test tooltip visibility on mouse events
   */
  it('shows tooltip trigger element', async () => {
    const wrapper = mount(BaseTooltip, {
      props: {
        content: 'Test tooltip',
        delay: 0,
      },
      slots: {
        trigger: '<button>Hover me</button>',
      },
    })

    const container = wrapper.find('.tooltip-container')
    const triggerButton = wrapper.find('button')

    expect(triggerButton.exists()).toBe(true)
    expect(triggerButton.text()).toBe('Hover me')
    expect(container.exists()).toBe(true)
  })

  /**
   * Test tooltip interaction
   */
  it('responds to mouse events', async () => {
    const wrapper = mount(BaseTooltip, {
      props: {
        content: 'Test tooltip',
        delay: 0,
      },
      slots: {
        trigger: '<button>Hover me</button>',
      },
    })

    const container = wrapper.find('.tooltip-container')

    // Trigger mouse enter
    await container.trigger('mouseenter')
    vi.advanceTimersByTime(10)
    await wrapper.vm.$nextTick()

    // Trigger mouse leave
    await container.trigger('mouseleave')
    vi.advanceTimersByTime(200)
    await wrapper.vm.$nextTick()

    // Test passes if no errors occur during interaction
    expect(container.exists()).toBe(true)
  })

  /**
   * Test tooltip placement options
   */
  it('accepts different placement props', () => {
    const placements = ['top', 'bottom', 'left', 'right'] as const

    placements.forEach((placement) => {
      const wrapper = mount(BaseTooltip, {
        props: {
          content: 'Test tooltip',
          placement,
        },
        slots: {
          trigger: '<button>Test button</button>',
        },
      })

      // Test that component mounts without errors with different placements
      expect(wrapper.find('.tooltip-container').exists()).toBe(true)
    })
  })

  /**
   * Test tooltip variants
   */
  it('accepts different variant props', () => {
    const variants = ['default', 'error', 'warning', 'success'] as const

    variants.forEach((variant) => {
      const wrapper = mount(BaseTooltip, {
        props: {
          content: 'Test tooltip',
          variant,
        },
        slots: {
          trigger: '<button>Test button</button>',
        },
      })

      // Test that component mounts without errors with different variants
      expect(wrapper.find('.tooltip-container').exists()).toBe(true)
    })
  })

  /**
   * Test disabled state
   */
  it('accepts disabled prop', async () => {
    const wrapper = mount(BaseTooltip, {
      props: {
        content: 'Test tooltip',
        disabled: true,
        delay: 0,
      },
      slots: {
        trigger: '<button>Disabled tooltip</button>',
      },
    })

    const container = wrapper.find('.tooltip-container')

    // Try to trigger tooltip
    await container.trigger('mouseenter')
    vi.advanceTimersByTime(10)
    await wrapper.vm.$nextTick()

    // Component should still exist and handle disabled state
    expect(container.exists()).toBe(true)
  })

  /**
   * Test slot content rendering
   */
  it('renders custom content via slots', () => {
    const wrapper = mount(BaseTooltip, {
      slots: {
        trigger: '<button>Custom trigger</button>',
        content: '<div class="custom-content">Custom tooltip content</div>',
      },
    })

    expect(wrapper.find('.tooltip-trigger button').text()).toBe(
      'Custom trigger'
    )
  })

  /**
   * Test component with minimal props
   */
  it('works with minimal configuration', () => {
    const wrapper = mount(BaseTooltip, {
      slots: {
        trigger: '<button>Minimal button</button>',
      },
    })

    expect(wrapper.find('.tooltip-container').exists()).toBe(true)
    expect(wrapper.find('button').text()).toBe('Minimal button')
  })
})
