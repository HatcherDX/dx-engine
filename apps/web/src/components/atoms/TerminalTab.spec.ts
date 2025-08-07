import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import TerminalTab from './TerminalTab.vue'

describe('TerminalTab', () => {
  it('renders terminal name', () => {
    const wrapper = mount(TerminalTab, {
      props: {
        name: 'Test Terminal',
      },
    })

    expect(wrapper.text()).toContain('Test Terminal')
  })

  it('shows running indicator when running', () => {
    const wrapper = mount(TerminalTab, {
      props: {
        name: 'Test Terminal',
        running: true,
      },
    })

    expect(wrapper.find('.terminal-tab--running').exists()).toBe(true)
  })

  it('shows stopped indicator when not running', () => {
    const wrapper = mount(TerminalTab, {
      props: {
        name: 'Test Terminal',
        running: false,
      },
    })

    expect(wrapper.find('.terminal-tab--stopped').exists()).toBe(true)
  })

  it('applies active class when active', () => {
    const wrapper = mount(TerminalTab, {
      props: {
        name: 'Test Terminal',
        active: true,
      },
    })

    expect(wrapper.find('.terminal-tab--active').exists()).toBe(true)
  })

  it('applies inactive class when not active', () => {
    const wrapper = mount(TerminalTab, {
      props: {
        name: 'Test Terminal',
        active: false,
      },
    })

    expect(wrapper.find('.terminal-tab--inactive').exists()).toBe(true)
  })

  it('emits click event when clicked', async () => {
    const wrapper = mount(TerminalTab, {
      props: {
        name: 'Test Terminal',
      },
    })

    await wrapper.trigger('click')
    expect(wrapper.emitted('click')).toHaveLength(1)
  })

  it('emits close event when close button clicked', async () => {
    const wrapper = mount(TerminalTab, {
      props: {
        name: 'Test Terminal',
        closable: true,
      },
    })

    const closeButton = wrapper.find('.terminal-tab__close')
    expect(closeButton.exists()).toBe(true)

    await closeButton.trigger('click')
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('does not show close button when not closable', () => {
    const wrapper = mount(TerminalTab, {
      props: {
        name: 'Test Terminal',
        closable: false,
      },
    })

    expect(wrapper.find('.terminal-tab__close').exists()).toBe(false)
  })

  it('emits contextmenu event when right-clicked', async () => {
    const wrapper = mount(TerminalTab, {
      props: {
        name: 'Test Terminal',
      },
    })

    await wrapper.trigger('contextmenu')
    expect(wrapper.emitted('contextmenu')).toHaveLength(1)
  })
})
