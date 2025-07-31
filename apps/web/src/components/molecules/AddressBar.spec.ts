import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import AddressBar from './AddressBar.vue'

// Mock child components
vi.mock('../atoms/BaseIcon.vue', () => ({
  default: {
    name: 'BaseIcon',
    template: '<span>Icon</span>',
    props: ['name', 'size'],
  },
}))

vi.mock('../atoms/BaseButton.vue', () => ({
  default: {
    name: 'BaseButton',
    template: '<button><slot /></button>',
    props: ['variant', 'size', 'disabled', 'aria-label'],
  },
}))

vi.mock('./AdaptiveBreadcrumb.vue', () => ({
  default: {
    name: 'AdaptiveBreadcrumb',
    template: '<div>Breadcrumb</div>',
    props: ['current-mode'],
  },
}))

describe('AddressBar.vue', () => {
  const defaultProps = {
    value: '',
    currentMode: 'generative' as const,
    breadcrumbContext: {},
  }

  it('should mount and render without errors', () => {
    const wrapper = mount(AddressBar, { props: defaultProps })
    expect(wrapper.exists()).toBe(true)
  })

  it('should render input element', () => {
    const wrapper = mount(AddressBar, { props: defaultProps })
    const input = wrapper.find('input')
    expect(input.exists()).toBe(true)
  })

  it('should display correct placeholder for generative mode', () => {
    const wrapper = mount(AddressBar, { props: defaultProps })
    const input = wrapper.find('input')
    expect(input.attributes('placeholder')).toBe('Ask AI or enter command...')
  })

  it('should emit update:value event when input changes', async () => {
    const wrapper = mount(AddressBar, { props: defaultProps })
    const input = wrapper.find('input')

    await input.setValue('test value')
    expect(wrapper.emitted('update:value')).toBeTruthy()
    expect(wrapper.emitted('update:value')?.[0]?.[0]).toBe('test value')
  })

  it('should emit change event on blur', async () => {
    const wrapper = mount(AddressBar, { props: defaultProps })
    const input = wrapper.find('input')

    await input.trigger('blur')
    expect(wrapper.emitted('change')).toBeTruthy()
  })

  it('should emit enter event on Enter key press', async () => {
    const wrapper = mount(AddressBar, { props: defaultProps })
    const input = wrapper.find('input')

    await input.trigger('keydown', { key: 'Enter' })
    expect(wrapper.emitted('enter')).toBeTruthy()
  })

  it('should display current value', () => {
    const wrapper = mount(AddressBar, {
      props: { ...defaultProps, value: 'current value' },
    })
    const input = wrapper.find('input')
    expect(input.element.value).toBe('current value')
  })

  it('should handle different modes', () => {
    const modes = ['generative', 'visual', 'code'] as const

    modes.forEach((mode) => {
      const wrapper = mount(AddressBar, {
        props: { ...defaultProps, currentMode: mode },
      })
      expect(wrapper.exists()).toBe(true)
    })
  })

  it('should focus input when focus method is called', async () => {
    const wrapper = mount(AddressBar, { props: defaultProps })
    const input = wrapper.find('input')

    input.element.focus = vi.fn()
    wrapper.vm.focus()
    expect(input.element.focus).toHaveBeenCalled()
  })

  it('should handle escape key to blur', async () => {
    const wrapper = mount(AddressBar, { props: defaultProps })
    const input = wrapper.find('input')

    await input.trigger('keydown.escape')
    expect(wrapper.exists()).toBe(true)
  })
})
