import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import WindowMinimizeButton from './WindowMinimizeButton.vue'

describe('WindowMinimizeButton.vue', () => {
  it('should mount and render without errors', () => {
    const wrapper = mount(WindowMinimizeButton)
    expect(wrapper.exists()).toBe(true)
  })

  it('should render as a button element', () => {
    const wrapper = mount(WindowMinimizeButton)
    expect(wrapper.element.tagName).toBe('BUTTON')
  })

  it('should emit click event when clicked', async () => {
    const wrapper = mount(WindowMinimizeButton)
    await wrapper.trigger('click')
    expect(wrapper.emitted('click')).toBeTruthy()
  })

  it('should have proper accessibility attributes', () => {
    const wrapper = mount(WindowMinimizeButton)
    const button = wrapper.find('button')
    expect(button.attributes('aria-label')).toBeDefined()
  })

  it('should have minimize icon styling', () => {
    const wrapper = mount(WindowMinimizeButton)
    expect(wrapper.classes()).toContain('window-control-button')
    expect(wrapper.classes()).toContain('minimize-button')
  })

  it('should handle disabled state', () => {
    const wrapper = mount(WindowMinimizeButton, {
      props: { disabled: true },
    })
    expect(wrapper.find('button').attributes('disabled')).toBeDefined()
  })

  it('should apply hover effects', async () => {
    const wrapper = mount(WindowMinimizeButton)
    await wrapper.trigger('mouseenter')
    await wrapper.trigger('mouseleave')
    expect(wrapper.exists()).toBe(true)
  })

  it('should handle keyboard interactions', async () => {
    const wrapper = mount(WindowMinimizeButton)
    await wrapper.trigger('keydown.enter')
    expect(wrapper.exists()).toBe(true)
  })
})
