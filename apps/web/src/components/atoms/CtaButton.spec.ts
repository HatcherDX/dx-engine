import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import CtaButton from './CtaButton.vue'

// Mock child components
vi.mock('./BaseButton.vue', () => ({
  default: {
    name: 'BaseButton',
    template: `
      <button 
        class="base-button" 
        :class="$props.class"
        :variant="$props.variant"
        :size="$props.size"
        :disabled="$props.disabled"
        @click="$emit('click', $event)"
      >
        <slot />
      </button>
    `,
    props: ['variant', 'size', 'class', 'disabled'],
    emits: ['click'],
  },
}))

vi.mock('./BaseIcon.vue', () => ({
  default: {
    name: 'BaseIcon',
    template: '<span class="base-icon" />',
    props: ['name', 'size'],
  },
}))

describe('CtaButton.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should mount and render without errors', () => {
    const wrapper = mount(CtaButton)
    expect(wrapper.exists()).toBe(true)
  })

  it('should render BaseButton with correct props', () => {
    const wrapper = mount(CtaButton)
    const baseButton = wrapper.findComponent({ name: 'BaseButton' })

    expect(baseButton.exists()).toBe(true)
    expect(baseButton.props('variant')).toBe('primary')
    expect(baseButton.props('size')).toBe('md')
    expect(baseButton.classes()).toContain('cta-button')
    expect(baseButton.classes()).toContain('cta-button-active')
  })

  it('should render BaseIcon with correct props', () => {
    const wrapper = mount(CtaButton)
    const baseIcon = wrapper.findComponent({ name: 'BaseIcon' })

    expect(baseIcon.exists()).toBe(true)
    expect(baseIcon.props('name')).toBe('ArrowRight')
    expect(baseIcon.props('size')).toBe('sm')
  })

  it('should pass disabled prop to BaseButton', () => {
    const wrapper = mount(CtaButton, {
      props: {
        disabled: true,
      },
    })

    const baseButton = wrapper.findComponent({ name: 'BaseButton' })
    expect(baseButton.props('disabled')).toBe(true)
  })

  it('should default disabled to false', () => {
    const wrapper = mount(CtaButton)
    const baseButton = wrapper.findComponent({ name: 'BaseButton' })

    expect(baseButton.props('disabled')).toBe(false)
  })

  it('should emit click event when BaseButton is clicked', async () => {
    const wrapper = mount(CtaButton)
    const baseButton = wrapper.findComponent({ name: 'BaseButton' })

    const mockEvent = new MouseEvent('click')
    await baseButton.vm.$emit('click', mockEvent)

    expect(wrapper.emitted('click')).toBeTruthy()
    expect(wrapper.emitted('click')?.[0]).toEqual([mockEvent])
  })

  it('should render slot content', () => {
    const slotContent = 'Get Started'
    const wrapper = mount(CtaButton, {
      slots: {
        default: slotContent,
      },
    })

    expect(wrapper.text()).toContain(slotContent)
  })

  it('should have correct CSS classes', () => {
    const wrapper = mount(CtaButton)
    const baseButton = wrapper.findComponent({ name: 'BaseButton' })

    expect(baseButton.classes()).toContain('cta-button')
    expect(baseButton.classes()).toContain('cta-button-active')
  })

  it('should handle disabled state correctly', () => {
    const wrapper = mount(CtaButton, {
      props: {
        disabled: true,
      },
    })

    const baseButton = wrapper.findComponent({ name: 'BaseButton' })
    expect(baseButton.props('disabled')).toBe(true)
  })

  it('should handle enabled state correctly', () => {
    const wrapper = mount(CtaButton, {
      props: {
        disabled: false,
      },
    })

    const baseButton = wrapper.findComponent({ name: 'BaseButton' })
    expect(baseButton.props('disabled')).toBe(false)
  })

  it('should have correct component structure', () => {
    const wrapper = mount(CtaButton)

    // Should have BaseButton wrapper
    const baseButton = wrapper.findComponent({ name: 'BaseButton' })
    expect(baseButton.exists()).toBe(true)

    // Should have BaseIcon inside
    const baseIcon = wrapper.findComponent({ name: 'BaseIcon' })
    expect(baseIcon.exists()).toBe(true)
  })

  it('should pass through click events with event object', async () => {
    const wrapper = mount(CtaButton)
    const baseButton = wrapper.findComponent({ name: 'BaseButton' })

    const mockClickEvent = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
    })

    await baseButton.vm.$emit('click', mockClickEvent)

    expect(wrapper.emitted('click')).toBeTruthy()
    expect(wrapper.emitted('click')?.[0]).toEqual([mockClickEvent])
  })

  it('should render with all required props set correctly', () => {
    const wrapper = mount(CtaButton, {
      props: {
        disabled: false,
      },
    })

    const baseButton = wrapper.findComponent({ name: 'BaseButton' })
    const baseIcon = wrapper.findComponent({ name: 'BaseIcon' })

    // Check BaseButton props
    expect(baseButton.props('variant')).toBe('primary')
    expect(baseButton.props('size')).toBe('md')
    expect(baseButton.props('disabled')).toBe(false)
    expect(baseButton.classes()).toContain('cta-button')
    expect(baseButton.classes()).toContain('cta-button-active')

    // Check BaseIcon props
    expect(baseIcon.props('name')).toBe('ArrowRight')
    expect(baseIcon.props('size')).toBe('sm')
  })

  it('should support custom slot content with HTML', () => {
    const wrapper = mount(CtaButton, {
      slots: {
        default: '<span class="custom-content">Custom Button Text</span>',
      },
    })

    expect(wrapper.html()).toContain('Custom Button Text')
    expect(wrapper.find('.custom-content').exists()).toBe(true)
  })

  it('should maintain consistent component interface', () => {
    const wrapper = mount(CtaButton)

    // Component should be a Vue component
    expect(wrapper.vm).toBeTruthy()

    // Should have the correct component name structure
    expect(wrapper.findComponent({ name: 'BaseButton' }).exists()).toBe(true)
    expect(wrapper.findComponent({ name: 'BaseIcon' }).exists()).toBe(true)
  })
})
