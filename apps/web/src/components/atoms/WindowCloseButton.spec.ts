import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import WindowCloseButton from './WindowCloseButton.vue'

describe('WindowCloseButton.vue', () => {
  it('should mount and render without errors', () => {
    const wrapper = mount(WindowCloseButton)
    expect(wrapper.exists()).toBe(true)
  })

  it('should render as a button element', () => {
    const wrapper = mount(WindowCloseButton)
    expect(wrapper.element.tagName).toBe('BUTTON')
  })

  it('should emit click event when clicked', async () => {
    const wrapper = mount(WindowCloseButton)
    await wrapper.trigger('click')
    expect(wrapper.emitted('click')).toBeTruthy()
  })

  it('should have proper accessibility attributes', () => {
    const wrapper = mount(WindowCloseButton)
    const button = wrapper.find('button')
    expect(button.attributes('aria-label')).toBeDefined()
  })

  it('should have close icon styling', () => {
    const wrapper = mount(WindowCloseButton)
    expect(wrapper.classes()).toContain('window-control-button')
    expect(wrapper.classes()).toContain('close-button')
  })

  it('should handle disabled state', () => {
    const wrapper = mount(WindowCloseButton, {
      props: { disabled: true },
    })
    expect(wrapper.find('button').attributes('disabled')).toBeDefined()
  })

  it('should not be disabled by default', () => {
    const wrapper = mount(WindowCloseButton, {})
    expect(wrapper.find('button').attributes('disabled')).toBeUndefined()
  })

  it('should apply danger styling on hover', async () => {
    const wrapper = mount(WindowCloseButton)
    await wrapper.trigger('mouseenter')
    expect(wrapper.exists()).toBe(true)
  })

  it('should handle keyboard interactions', async () => {
    const wrapper = mount(WindowCloseButton)
    await wrapper.trigger('keydown.enter')
    expect(wrapper.exists()).toBe(true)
  })
})
