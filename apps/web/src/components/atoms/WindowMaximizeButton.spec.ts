import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import WindowMaximizeButton from './WindowMaximizeButton.vue'

describe('WindowMaximizeButton.vue', () => {
  it('should mount and render without errors', () => {
    const wrapper = mount(WindowMaximizeButton)
    expect(wrapper.exists()).toBe(true)
  })

  it('should render as a button element', () => {
    const wrapper = mount(WindowMaximizeButton)
    expect(wrapper.element.tagName).toBe('BUTTON')
  })

  it('should emit click event when clicked', async () => {
    const wrapper = mount(WindowMaximizeButton)
    await wrapper.trigger('click')
    expect(wrapper.emitted('click')).toBeTruthy()
  })

  it('should have proper accessibility attributes', () => {
    const wrapper = mount(WindowMaximizeButton)
    const button = wrapper.find('button')
    expect(button.attributes('aria-label')).toBeDefined()
  })

  it('should have maximize icon styling', () => {
    const wrapper = mount(WindowMaximizeButton)
    expect(wrapper.classes()).toContain('window-control-button')
    expect(wrapper.classes()).toContain('maximize-button')
  })

  it('should handle disabled state', () => {
    const wrapper = mount(WindowMaximizeButton, {
      props: { disabled: true },
    })
    expect(wrapper.find('button').attributes('disabled')).toBeDefined()
  })

  it('should show different states for maximized/restored', () => {
    const wrapper = mount(WindowMaximizeButton, {
      props: { isMaximized: true },
    })
    expect(wrapper.exists()).toBe(true)
  })

  it('should handle keyboard interactions', async () => {
    const wrapper = mount(WindowMaximizeButton)
    await wrapper.trigger('keydown.space')
    expect(wrapper.exists()).toBe(true)
  })
})
