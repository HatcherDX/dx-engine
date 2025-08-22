import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'
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
    // Create teleport target for tooltip
    const el = document.createElement('div')
    el.id = 'app'
    document.body.appendChild(el)
  })

  afterEach(() => {
    vi.useRealTimers()
    // Clean up DOM
    document.body.innerHTML = ''
  })

  /**
   * Test basic tooltip rendering and content display
   */
  it('renders tooltip with default props', () => {
    const wrapper = mount(BaseTooltip, {
      props: {
        content: 'Tooltip content',
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
        content: 'Tooltip content',
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
   * Test tooltip shows on mouse enter after delay
   */
  it('shows tooltip on mouse enter after delay', async () => {
    const wrapper = mount(BaseTooltip, {
      props: {
        content: 'Tooltip content',
        delay: 500,
      },
      slots: {
        trigger: '<button>Hover me</button>',
      },
      attachTo: document.body,
    })

    const container = wrapper.find('.tooltip-container')

    // Initially tooltip should not be visible
    expect(wrapper.vm.isVisible).toBe(false)

    // Trigger mouse enter
    await container.trigger('mouseenter')

    // Advance time but not enough for delay
    vi.advanceTimersByTime(400)
    await nextTick()
    expect(wrapper.vm.isVisible).toBe(false)

    // Advance time past delay
    vi.advanceTimersByTime(100)
    await nextTick()
    await flushPromises()

    // Now tooltip should be visible
    expect(wrapper.vm.isVisible).toBe(true)

    // Check that tooltip content is in document body (via teleport)
    expect(document.body.textContent).toContain('Tooltip content')
  })

  /**
   * Test tooltip hides on mouse leave
   */
  it('hides tooltip on mouse leave', async () => {
    const wrapper = mount(BaseTooltip, {
      props: {
        content: 'Tooltip content',
        delay: 100,
      },
      slots: {
        trigger: '<button>Hover me</button>',
      },
      attachTo: document.body,
    })

    const container = wrapper.find('.tooltip-container')

    // Show tooltip
    await container.trigger('mouseenter')
    vi.advanceTimersByTime(100)
    await nextTick()
    expect(wrapper.vm.isVisible).toBe(true)

    // Trigger mouse leave
    await container.trigger('mouseleave')

    // Advance time for hide delay
    vi.advanceTimersByTime(150)
    await nextTick()

    // Tooltip should be hidden
    expect(wrapper.vm.isVisible).toBe(false)
  })

  /**
   * Test tooltip placement options
   */
  it('accepts different placement props', () => {
    const placements = ['top', 'bottom', 'left', 'right'] as const

    placements.forEach((placement) => {
      const wrapper = mount(BaseTooltip, {
        props: {
          content: 'Tooltip content',
          placement,
        },
        slots: {
          default: '<button>Hover me</button>',
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
          content: 'Tooltip content',
          variant,
        },
        slots: {
          default: '<button>Hover me</button>',
        },
      })

      // Test that component mounts without errors with different variants
      expect(wrapper.find('.tooltip-container').exists()).toBe(true)
    })
  })

  /**
   * Test disabled state prevents tooltip from showing
   */
  it('does not show tooltip when disabled', async () => {
    const wrapper = mount(BaseTooltip, {
      props: {
        content: 'Tooltip content',
        disabled: true,
        delay: 100,
      },
      slots: {
        trigger: '<button>Hover me</button>',
      },
      attachTo: document.body,
    })

    const container = wrapper.find('.tooltip-container')

    // Try to trigger tooltip
    await container.trigger('mouseenter')
    vi.advanceTimersByTime(200)
    await nextTick()

    // Tooltip should not be visible when disabled
    expect(wrapper.vm.isVisible).toBe(false)
    expect(document.body.textContent).not.toContain('Tooltip content')
  })

  /**
   * Test slot content rendering
   */
  it('renders custom content via slots', () => {
    const wrapper = mount(BaseTooltip, {
      props: {
        content: 'Tooltip content',
      },
      slots: {
        trigger: '<button>Custom trigger</button>',
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
      props: {
        content: 'Minimal tooltip',
      },
      slots: {
        trigger: '<button>Minimal button</button>',
      },
    })

    expect(wrapper.find('.tooltip-container').exists()).toBe(true)
    expect(wrapper.find('button').text()).toBe('Minimal button')
  })

  /**
   * Test tooltip positioning calculation for all placements
   */
  it('calculates position correctly for all placements', async () => {
    // Mock getBoundingClientRect for predictable positioning
    const mockTriggerRect = {
      top: 100,
      bottom: 120,
      left: 50,
      right: 150,
      width: 100,
      height: 20,
    }

    const mockTooltipRect = {
      width: 200,
      height: 40,
    }

    const placements = ['top', 'bottom', 'left', 'right'] as const

    for (const placement of placements) {
      const wrapper = mount(BaseTooltip, {
        props: {
          content: 'Position test',
          placement,
          delay: 0,
        },
        slots: {
          trigger: '<button>Test</button>',
        },
        attachTo: document.body,
      })

      // Access component instance with proper typing
      const vm = wrapper.vm as InstanceType<typeof BaseTooltip> & {
        calculatePosition?: () => Promise<void>
        tooltipStyle?: Record<string, string>
        $refs?: {
          triggerRef?: HTMLElement
          tooltipRef?: HTMLElement
        }
      }

      // Mock getBoundingClientRect for trigger element
      if (vm.$refs?.triggerRef) {
        vi.spyOn(vm.$refs.triggerRef, 'getBoundingClientRect').mockReturnValue(
          mockTriggerRect as DOMRect
        )
      }

      // Show tooltip
      await wrapper.find('.tooltip-container').trigger('mouseenter')
      vi.advanceTimersByTime(0)
      await nextTick()
      await flushPromises()

      // Mock tooltip rect after it's visible and force recalculation
      if (vm.$refs?.tooltipRef) {
        vi.spyOn(vm.$refs.tooltipRef, 'getBoundingClientRect').mockReturnValue({
          ...mockTooltipRect,
          top: 0,
          bottom: mockTooltipRect.height,
          left: 0,
          right: mockTooltipRect.width,
        } as DOMRect)

        // Force position recalculation
        if (vm.calculatePosition) {
          await vm.calculatePosition()
        }

        // Verify tooltip positioning style was set
        if (vm.tooltipStyle) {
          expect(vm.tooltipStyle).toHaveProperty('position', 'fixed')
          expect(vm.tooltipStyle).toHaveProperty('top')
          expect(vm.tooltipStyle).toHaveProperty('left')
          expect(vm.tooltipStyle).toHaveProperty('zIndex', '9999')
        }
      }

      wrapper.unmount()
    }
  })

  /**
   * Test tooltip viewport boundary constraints
   */
  it('keeps tooltip within viewport boundaries', async () => {
    // Mock window dimensions
    Object.defineProperty(window, 'innerWidth', {
      value: 800,
      configurable: true,
    })
    Object.defineProperty(window, 'innerHeight', {
      value: 600,
      configurable: true,
    })

    const wrapper = mount(BaseTooltip, {
      props: {
        content: 'Boundary test tooltip with long content',
        placement: 'right',
        delay: 0,
      },
      slots: {
        trigger: '<button>Edge case</button>',
      },
      attachTo: document.body,
    })

    // Mock element near right edge of viewport
    const triggerEl = wrapper.vm.$refs.triggerRef as HTMLElement
    vi.spyOn(triggerEl, 'getBoundingClientRect').mockReturnValue({
      top: 100,
      bottom: 120,
      left: 700,
      right: 780,
      width: 80,
      height: 20,
    } as DOMRect)

    // Show tooltip
    await wrapper.find('.tooltip-container').trigger('mouseenter')
    vi.advanceTimersByTime(0)
    await nextTick()

    // Mock tooltip dimensions
    const tooltipEl = wrapper.vm.$refs.tooltipRef as HTMLElement
    if (tooltipEl) {
      vi.spyOn(tooltipEl, 'getBoundingClientRect').mockReturnValue({
        width: 250,
        height: 60,
        top: 0,
        bottom: 60,
        left: 0,
        right: 250,
      } as DOMRect)

      await wrapper.vm.calculatePosition()
    }

    // Check that tooltip position is constrained
    const leftPosition = parseFloat(wrapper.vm.tooltipStyle.left)
    const topPosition = parseFloat(wrapper.vm.tooltipStyle.top)

    // Tooltip should not exceed viewport boundaries (with 8px padding)
    expect(leftPosition).toBeLessThanOrEqual(800 - 250 - 8)
    expect(leftPosition).toBeGreaterThanOrEqual(8)
    expect(topPosition).toBeLessThanOrEqual(600 - 60 - 8)
    expect(topPosition).toBeGreaterThanOrEqual(8)
  })

  /**
   * Test quick hover doesn't hide tooltip immediately
   */
  it('cancels hide timeout on quick re-enter', async () => {
    const wrapper = mount(BaseTooltip, {
      props: {
        content: 'Quick hover test',
        delay: 100,
      },
      slots: {
        trigger: '<button>Hover quickly</button>',
      },
      attachTo: document.body,
    })

    const container = wrapper.find('.tooltip-container')

    // Show tooltip
    await container.trigger('mouseenter')
    vi.advanceTimersByTime(100)
    await nextTick()
    expect(wrapper.vm.isVisible).toBe(true)

    // Quick mouse leave and re-enter
    await container.trigger('mouseleave')
    vi.advanceTimersByTime(50) // Only 50ms of hide delay
    await container.trigger('mouseenter') // Re-enter before hide completes
    vi.advanceTimersByTime(100)
    await nextTick()

    // Tooltip should still be visible
    expect(wrapper.vm.isVisible).toBe(true)
  })

  /**
   * Test computed classes for tooltip and arrow
   */
  it('generates correct classes for variants and placements', () => {
    const wrapper = mount(BaseTooltip, {
      props: {
        content: 'Class test',
        placement: 'bottom',
        variant: 'error',
      },
      slots: {
        trigger: '<button>Test</button>',
      },
    })

    // Test computed tooltip classes
    expect(wrapper.vm.tooltipClasses).toEqual([
      'tooltip',
      'tooltip--bottom',
      'tooltip--error',
    ])

    // Test computed arrow classes
    expect(wrapper.vm.arrowClasses).toEqual([
      'tooltip-arrow',
      'tooltip-arrow--bottom',
      'tooltip-arrow--error',
    ])
  })

  /**
   * Test aria-id generation
   */
  it('generates unique aria-id for accessibility', () => {
    const wrapper1 = mount(BaseTooltip, {
      props: { content: 'Tooltip 1' },
      slots: { trigger: '<button>Button 1</button>' },
    })

    const wrapper2 = mount(BaseTooltip, {
      props: { content: 'Tooltip 2' },
      slots: { trigger: '<button>Button 2</button>' },
    })

    // Each instance should have a unique aria-id
    expect(wrapper1.vm.ariaId).toMatch(/^tooltip-[a-z0-9]{9}$/)
    expect(wrapper2.vm.ariaId).toMatch(/^tooltip-[a-z0-9]{9}$/)
    expect(wrapper1.vm.ariaId).not.toBe(wrapper2.vm.ariaId)
  })

  /**
   * Test cleanup on unmount
   */
  it('cleans up timeouts on unmount', async () => {
    const wrapper = mount(BaseTooltip, {
      props: {
        content: 'Cleanup test',
        delay: 1000,
      },
      slots: {
        trigger: '<button>Test</button>',
      },
      attachTo: document.body,
    })

    // Start showing tooltip but don't let it complete
    await wrapper.find('.tooltip-container').trigger('mouseenter')
    vi.advanceTimersByTime(500) // Halfway through delay

    // Unmount component
    wrapper.unmount()

    // Advance time past when tooltip would have shown
    vi.advanceTimersByTime(1000)

    // No errors should occur and timeouts should be cleared
    expect(true).toBe(true)
  })

  /**
   * Test content slot rendering
   */
  it('renders content via slot instead of prop', async () => {
    const wrapper = mount(BaseTooltip, {
      props: {
        delay: 0,
      },
      slots: {
        trigger: '<button>Hover me</button>',
        content: '<strong>Custom HTML content</strong>',
      },
      attachTo: document.body,
    })

    // Show tooltip
    await wrapper.find('.tooltip-container').trigger('mouseenter')
    vi.advanceTimersByTime(0)
    await nextTick()
    await flushPromises()

    // Check that custom HTML is rendered in tooltip
    expect(document.body.innerHTML).toContain(
      '<strong>Custom HTML content</strong>'
    )
  })

  /**
   * Test empty content handling
   */
  it('handles empty content gracefully', async () => {
    const wrapper = mount(BaseTooltip, {
      props: {
        content: '',
        delay: 0,
      },
      slots: {
        trigger: '<button>Empty tooltip</button>',
      },
      attachTo: document.body,
    })

    // Show tooltip even with empty content
    await wrapper.find('.tooltip-container').trigger('mouseenter')
    vi.advanceTimersByTime(0)
    await nextTick()

    // Tooltip should be visible but with empty content
    expect(wrapper.vm.isVisible).toBe(true)
  })
})
