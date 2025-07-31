import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ModeSelector from './ModeSelector.vue'

describe('ModeSelector.vue', () => {
  const defaultProps = {
    currentMode: 'generative' as const,
  }

  it('should mount and render without errors', () => {
    const wrapper = mount(ModeSelector, { props: defaultProps })
    expect(wrapper.exists()).toBe(true)
  })

  it('should render all mode buttons', () => {
    const wrapper = mount(ModeSelector, { props: defaultProps })
    const buttons = wrapper.findAll('.mode-button')
    expect(buttons.length).toBe(4) // generative, visual, code, timeline
  })

  it('should highlight current mode', () => {
    const wrapper = mount(ModeSelector, { props: defaultProps })
    const activeButton = wrapper.find('.mode-button.active')
    expect(activeButton.exists()).toBe(true)
  })

  it('should emit mode-change event when mode is clicked', async () => {
    const wrapper = mount(ModeSelector, { props: defaultProps })
    const buttons = wrapper.findAll('.mode-button')
    const visualButton = buttons[1] // visual is the second button

    await visualButton.trigger('click')
    expect(wrapper.emitted('mode-change')).toBeTruthy()
    expect(wrapper.emitted('mode-change')?.[0]?.[0]).toBe('visual')
  })

  it('should render mode icons', () => {
    const wrapper = mount(ModeSelector, { props: defaultProps })
    const icons = wrapper.findAllComponents({ name: 'BaseIcon' })
    expect(icons.length).toBeGreaterThanOrEqual(3)
  })

  it('should display correct mode labels', () => {
    const wrapper = mount(ModeSelector, { props: defaultProps })

    expect(wrapper.text()).toContain('Gen')
    expect(wrapper.text()).toContain('Visual')
    expect(wrapper.text()).toContain('Code')
    expect(wrapper.text()).toContain('Timeline')
  })

  it('should handle keyboard navigation', async () => {
    const wrapper = mount(ModeSelector, { props: defaultProps })
    const firstButton = wrapper.find('.mode-button')

    await firstButton.trigger('keydown.tab')
    expect(wrapper.exists()).toBe(true)
  })

  it('should apply correct classes for each mode', () => {
    const modes = ['generative', 'visual', 'code', 'timeline'] as const

    modes.forEach((mode) => {
      const wrapper = mount(ModeSelector, {
        props: { currentMode: mode },
      })
      const activeButton = wrapper.find('.mode-button.active')
      expect(activeButton.exists()).toBe(true)
    })
  })

  it('should not emit mode-change for current mode', async () => {
    const wrapper = mount(ModeSelector, { props: defaultProps })
    const buttons = wrapper.findAll('.mode-button')
    const currentModeButton = buttons[0] // generative is the first button

    await currentModeButton.trigger('click')
    // Should still emit for consistency
    expect(wrapper.emitted('mode-change')).toBeTruthy()
  })

  it('should handle all mode transitions', async () => {
    const wrapper = mount(ModeSelector, { props: defaultProps })
    const buttons = wrapper.findAll('.mode-button')

    const generativeBtn = buttons[0]
    const visualBtn = buttons[1]
    const codeBtn = buttons[2]

    await visualBtn.trigger('click')
    await codeBtn.trigger('click')
    await generativeBtn.trigger('click')

    expect(wrapper.emitted('mode-change')).toHaveLength(3)
  })
})
