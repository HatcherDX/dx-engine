import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import PlayButton from './PlayButton.vue'
import BaseIcon from './BaseIcon.vue'

// Mock BaseIcon component
vi.mock('./BaseIcon.vue', () => ({
  default: {
    name: 'BaseIcon',
    props: ['name', 'size'],
    template:
      '<div data-testid="base-icon" :data-name="name" :data-size="size"></div>',
  },
}))

describe('PlayButton', () => {
  it('should render with default state (not playing)', () => {
    const wrapper = mount(PlayButton)

    expect(wrapper.exists()).toBe(true)
    expect(wrapper.element.tagName).toBe('BUTTON')
    expect(wrapper.classes()).toContain('play-button')
    expect(wrapper.classes()).not.toContain('is-playing')
  })

  it('should have correct aria-label and title when not playing', () => {
    const wrapper = mount(PlayButton)

    expect(wrapper.attributes('aria-label')).toBe('Play')
    expect(wrapper.attributes('title')).toBe('Start execution')
  })

  it('should render Play icon when not playing', () => {
    const wrapper = mount(PlayButton)
    const icon = wrapper.findComponent(BaseIcon)

    expect(icon.exists()).toBe(true)
    expect(icon.props('name')).toBe('Play')
    expect(icon.props('size')).toBe('sm')
  })

  it('should emit play event and change state when clicked', async () => {
    const wrapper = mount(PlayButton)

    await wrapper.trigger('click')

    expect(wrapper.emitted('play')).toHaveLength(1)
    expect(wrapper.vm.isPlaying).toBe(true)
    expect(wrapper.classes()).toContain('is-playing')
  })

  it('should have correct aria-label and title when playing', async () => {
    const wrapper = mount(PlayButton)

    await wrapper.trigger('click') // Start playing

    expect(wrapper.attributes('aria-label')).toBe('Stop')
    expect(wrapper.attributes('title')).toBe('Stop execution')
  })

  it('should render Square icon when playing', async () => {
    const wrapper = mount(PlayButton)

    await wrapper.trigger('click') // Start playing

    const icon = wrapper.findComponent(BaseIcon)
    expect(icon.props('name')).toBe('Square')
  })

  it('should emit stop event and change state when clicked while playing', async () => {
    const wrapper = mount(PlayButton)

    // First click to start playing
    await wrapper.trigger('click')
    expect(wrapper.emitted('play')).toHaveLength(1)

    // Second click to stop playing
    await wrapper.trigger('click')
    expect(wrapper.emitted('stop')).toHaveLength(1)
    expect(wrapper.vm.isPlaying).toBe(false)
    expect(wrapper.classes()).not.toContain('is-playing')
  })

  it('should not emit events when disabled', async () => {
    const wrapper = mount(PlayButton, {
      props: {
        disabled: true,
      },
    })

    await wrapper.trigger('click')

    expect(wrapper.emitted('play')).toBeFalsy()
    expect(wrapper.vm.isPlaying).toBe(false)
  })

  it('should handle click method directly', () => {
    const wrapper = mount(PlayButton)

    wrapper.vm.handleClick()

    expect(wrapper.emitted('play')).toHaveLength(1)
    expect(wrapper.vm.isPlaying).toBe(true)
  })

  it('should not handle click when disabled via method', () => {
    const wrapper = mount(PlayButton, {
      props: {
        disabled: true,
      },
    })

    wrapper.vm.handleClick()

    expect(wrapper.emitted('play')).toBeFalsy()
    expect(wrapper.vm.isPlaying).toBe(false)
  })

  it('should toggle state correctly through multiple clicks', async () => {
    const wrapper = mount(PlayButton)

    // Initially not playing
    expect(wrapper.vm.isPlaying).toBe(false)

    // Click to play
    await wrapper.trigger('click')
    expect(wrapper.vm.isPlaying).toBe(true)
    expect(wrapper.emitted('play')).toHaveLength(1)

    // Click to stop
    await wrapper.trigger('click')
    expect(wrapper.vm.isPlaying).toBe(false)
    expect(wrapper.emitted('stop')).toHaveLength(1)

    // Click to play again
    await wrapper.trigger('click')
    expect(wrapper.vm.isPlaying).toBe(true)
    expect(wrapper.emitted('play')).toHaveLength(2)
  })

  it('should have correct default props', () => {
    const wrapper = mount(PlayButton)

    expect(wrapper.props('disabled')).toBe(false)
  })

  it('should render with custom disabled prop', () => {
    const wrapper = mount(PlayButton, {
      props: {
        disabled: true,
      },
    })

    expect(wrapper.props('disabled')).toBe(true)
  })

  it('should maintain state after disabled prop changes', async () => {
    const wrapper = mount(PlayButton)

    // Start playing
    await wrapper.trigger('click')
    expect(wrapper.vm.isPlaying).toBe(true)

    // Disable the button
    await wrapper.setProps({ disabled: true })
    expect(wrapper.vm.isPlaying).toBe(true) // State should remain

    // Enable the button again
    await wrapper.setProps({ disabled: false })
    expect(wrapper.vm.isPlaying).toBe(true) // State should still be maintained
  })

  it('should handle rapid clicking correctly', async () => {
    const wrapper = mount(PlayButton)

    // Simulate rapid clicking
    await wrapper.trigger('click')
    await wrapper.trigger('click')
    await wrapper.trigger('click')
    await wrapper.trigger('click')

    expect(wrapper.emitted('play')).toHaveLength(2)
    expect(wrapper.emitted('stop')).toHaveLength(2)
    expect(wrapper.vm.isPlaying).toBe(false) // Should end in stopped state
  })
})
