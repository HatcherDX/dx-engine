/**
 * @fileoverview Comprehensive test suite for TerminalTab component.
 *
 * @description
 * Tests all functionality of the TerminalTab component including
 * different terminal types, activity states, event handling, and styling.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import TerminalTab from './TerminalTab.vue'

describe('TerminalTab', () => {
  describe('🎯 Basic Rendering', () => {
    it('renders terminal name', () => {
      const wrapper = mount(TerminalTab, {
        props: {
          name: 'Test Terminal',
          active: false,
          running: false,
        },
      })

      expect(wrapper.text()).toContain('Test Terminal')
    })

    it('renders with default props', () => {
      const wrapper = mount(TerminalTab, {
        props: {
          name: 'Default Terminal',
        },
      })

      expect(wrapper.text()).toContain('Default Terminal')
      expect(wrapper.find('.terminal-tab__close').exists()).toBe(true) // closable: true by default
      expect(wrapper.find('.terminal-tab--running').exists()).toBe(true) // running: true by default
      expect(wrapper.find('.terminal-tab--inactive').exists()).toBe(true) // active: false by default
    })
  })

  describe('🎯 Regular Terminal States', () => {
    it('shows running indicator when running', () => {
      const wrapper = mount(TerminalTab, {
        props: {
          name: 'Test Terminal',
          active: false,
          running: true,
          terminalType: 'regular',
        },
      })

      expect(wrapper.find('.terminal-tab--running').exists()).toBe(true)
      // Test computed property coverage by accessing the component instance
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test component instance requires type assertion for internal method access
      const vm = wrapper.vm as any
      const iconClasses = vm.terminalIconClass
      expect(iconClasses[1]['terminal-tab__icon--running']).toBe(true)
    })

    it('shows stopped indicator when not running', () => {
      const wrapper = mount(TerminalTab, {
        props: {
          name: 'Test Terminal',
          active: false,
          running: false,
          terminalType: 'regular',
        },
      })

      expect(wrapper.find('.terminal-tab--stopped').exists()).toBe(true)
      // Test computed property coverage by accessing the component instance
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test component instance requires type assertion for internal method access
      const vm = wrapper.vm as any
      const iconClasses = vm.terminalIconClass
      expect(iconClasses[1]['terminal-tab__icon--stopped']).toBe(true)
    })

    it('applies active class when active', () => {
      const wrapper = mount(TerminalTab, {
        props: {
          name: 'Test Terminal',
          active: true,
          running: false,
        },
      })

      expect(wrapper.find('.terminal-tab--active').exists()).toBe(true)
    })

    it('applies inactive class when not active', () => {
      const wrapper = mount(TerminalTab, {
        props: {
          name: 'Test Terminal',
          active: false,
          running: false,
        },
      })

      expect(wrapper.find('.terminal-tab--inactive').exists()).toBe(true)
    })

    it('uses Terminal icon for regular terminals', () => {
      const wrapper = mount(TerminalTab, {
        props: {
          name: 'Regular Terminal',
          terminalType: 'regular',
        },
      })

      const terminalIcon = wrapper.findComponent({ name: 'BaseIcon' })
      expect(terminalIcon.props('name')).toBe('Terminal')
    })
  })

  describe('🎯 System Terminal Type', () => {
    it('renders system terminal with correct icon', () => {
      const wrapper = mount(TerminalTab, {
        props: {
          name: 'System Terminal',
          terminalType: 'system',
        },
      })

      expect(wrapper.find('.terminal-tab--system').exists()).toBe(true)
      const terminalIcon = wrapper.findComponent({ name: 'BaseIcon' })
      expect(terminalIcon.props('name')).toBe('Settings')
    })

    it('applies system terminal activity state - idle', () => {
      const wrapper = mount(TerminalTab, {
        props: {
          name: 'System Terminal',
          terminalType: 'system',
          activityState: 'idle',
        },
      })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test component instance requires type assertion for internal method access
      const vm = wrapper.vm as any
      const iconClasses = vm.terminalIconClass
      expect(iconClasses[1]['terminal-tab__icon--idle']).toBe(true)
    })

    it('applies system terminal activity state - info', () => {
      const wrapper = mount(TerminalTab, {
        props: {
          name: 'System Terminal',
          terminalType: 'system',
          activityState: 'info',
        },
      })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test component instance requires type assertion for internal method access
      const vm = wrapper.vm as any
      const iconClasses = vm.terminalIconClass
      expect(iconClasses[1]['terminal-tab__icon--info']).toBe(true)
    })

    it('applies system terminal activity state - warning', () => {
      const wrapper = mount(TerminalTab, {
        props: {
          name: 'System Terminal',
          terminalType: 'system',
          activityState: 'warning',
        },
      })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test component instance requires type assertion for internal method access
      const vm = wrapper.vm as any
      const iconClasses = vm.terminalIconClass
      expect(iconClasses[1]['terminal-tab__icon--warning']).toBe(true)
    })

    it('applies system terminal activity state - error', () => {
      const wrapper = mount(TerminalTab, {
        props: {
          name: 'System Terminal',
          terminalType: 'system',
          activityState: 'error',
        },
      })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test component instance requires type assertion for internal method access
      const vm = wrapper.vm as any
      const iconClasses = vm.terminalIconClass
      expect(iconClasses[1]['terminal-tab__icon--error']).toBe(true)
    })

    it('does not apply running state classes for system terminals', () => {
      const wrapper = mount(TerminalTab, {
        props: {
          name: 'System Terminal',
          terminalType: 'system',
          running: true,
        },
      })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test component instance requires type assertion for internal method access
      const vm = wrapper.vm as any
      const iconClasses = vm.terminalIconClass
      expect(iconClasses[1]['terminal-tab__icon--running']).toBe(false)
    })
  })

  describe('🎯 Timeline Terminal Type', () => {
    it('renders timeline terminal with correct icon', () => {
      const wrapper = mount(TerminalTab, {
        props: {
          name: 'Timeline Terminal',
          terminalType: 'timeline',
        },
      })

      expect(wrapper.find('.terminal-tab--system').exists()).toBe(true) // timeline is considered system
      const terminalIcon = wrapper.findComponent({ name: 'BaseIcon' })
      expect(terminalIcon.props('name')).toBe('Timeline')
    })

    it('applies timeline terminal activity states', () => {
      const wrapper = mount(TerminalTab, {
        props: {
          name: 'Timeline Terminal',
          terminalType: 'timeline',
          activityState: 'info',
        },
      })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test component instance requires type assertion for internal method access
      const vm = wrapper.vm as any
      const iconClasses = vm.terminalIconClass
      expect(iconClasses[1]['terminal-tab__icon--info']).toBe(true)
    })
  })

  describe('🎯 Event Handling', () => {
    it('emits click event when clicked', async () => {
      const wrapper = mount(TerminalTab, {
        props: {
          name: 'Test Terminal',
          active: false,
          running: false,
        },
      })

      await wrapper.trigger('click')
      expect(wrapper.emitted('click')).toHaveLength(1)
    })

    it('emits close event when close button clicked', async () => {
      const wrapper = mount(TerminalTab, {
        props: {
          name: 'Test Terminal',
          active: false,
          running: false,
        },
      })

      const closeButton = wrapper.find('.terminal-tab__close')
      expect(closeButton.exists()).toBe(true)

      await closeButton.trigger('click')
      expect(wrapper.emitted('close')).toHaveLength(1)
    })

    it('does not emit click event when close button is clicked (event.stop)', async () => {
      const wrapper = mount(TerminalTab, {
        props: {
          name: 'Test Terminal',
          active: false,
          running: false,
        },
      })

      const closeButton = wrapper.find('.terminal-tab__close')
      await closeButton.trigger('click')

      // Click event should not be emitted when close button is clicked
      expect(wrapper.emitted('click')).toBeUndefined()
      expect(wrapper.emitted('close')).toHaveLength(1)
    })

    it('emits contextmenu event with event object when right-clicked', async () => {
      const wrapper = mount(TerminalTab, {
        props: {
          name: 'Test Terminal',
          active: false,
          running: false,
        },
      })

      await wrapper.trigger('contextmenu')
      expect(wrapper.emitted('contextmenu')).toHaveLength(1)
      expect(wrapper.emitted('contextmenu')[0][0]).toBeInstanceOf(Event)
    })
  })

  describe('🎯 Closable Behavior', () => {
    it('shows close button when closable', () => {
      const wrapper = mount(TerminalTab, {
        props: {
          name: 'Test Terminal',
          closable: true,
        },
      })

      expect(wrapper.find('.terminal-tab__close').exists()).toBe(true)
    })

    it('does not show close button when not closable', () => {
      const wrapper = mount(TerminalTab, {
        props: {
          name: 'Test Terminal',
          active: false,
          running: false,
          closable: false,
        },
      })

      expect(wrapper.find('.terminal-tab__close').exists()).toBe(false)
    })
  })

  describe('🎯 Icon Class Combinations', () => {
    it('applies base icon class for all terminals', () => {
      const wrapper = mount(TerminalTab, {
        props: {
          name: 'Test Terminal',
        },
      })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test component instance requires type assertion for internal method access
      const vm = wrapper.vm as any
      const iconClasses = vm.terminalIconClass
      expect(iconClasses[0]).toBe('terminal-tab__icon') // Base class is at index 0
      expect(typeof iconClasses[1]).toBe('object') // Conditional classes are in object at index 1
    })

    it('applies running state for regular terminal when running', () => {
      const wrapper = mount(TerminalTab, {
        props: {
          name: 'Regular Terminal',
          terminalType: 'regular',
          running: true,
        },
      })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test component instance requires type assertion for internal method access
      const vm = wrapper.vm as any
      const iconClasses = vm.terminalIconClass
      expect(iconClasses[1]['terminal-tab__icon--running']).toBe(true)
      expect(iconClasses[1]['terminal-tab__icon--stopped']).toBe(false)
    })

    it('applies stopped state for regular terminal when not running', () => {
      const wrapper = mount(TerminalTab, {
        props: {
          name: 'Regular Terminal',
          terminalType: 'regular',
          running: false,
        },
      })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test component instance requires type assertion for internal method access
      const vm = wrapper.vm as any
      const iconClasses = vm.terminalIconClass
      expect(iconClasses[1]['terminal-tab__icon--stopped']).toBe(true)
      expect(iconClasses[1]['terminal-tab__icon--running']).toBe(false)
    })
  })

  describe('🎯 Edge Cases and Complex Scenarios', () => {
    it('handles system terminal with all states combination', () => {
      const wrapper = mount(TerminalTab, {
        props: {
          name: 'Complex System Terminal',
          terminalType: 'system',
          active: true,
          running: false,
          closable: false,
          activityState: 'error',
        },
      })

      expect(wrapper.find('.terminal-tab--system').exists()).toBe(true)
      expect(wrapper.find('.terminal-tab--active').exists()).toBe(true)
      expect(wrapper.find('.terminal-tab--stopped').exists()).toBe(true)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test component instance requires type assertion for internal method access
      const vm = wrapper.vm as any
      const iconClasses = vm.terminalIconClass
      expect(iconClasses[1]['terminal-tab__icon--error']).toBe(true)
      expect(wrapper.find('.terminal-tab__close').exists()).toBe(false)
    })

    it('handles timeline terminal with all states combination', () => {
      const wrapper = mount(TerminalTab, {
        props: {
          name: 'Complex Timeline Terminal',
          terminalType: 'timeline',
          active: false,
          running: true,
          closable: true,
          activityState: 'warning',
        },
      })

      expect(wrapper.find('.terminal-tab--system').exists()).toBe(true)
      expect(wrapper.find('.terminal-tab--inactive').exists()).toBe(true)
      expect(wrapper.find('.terminal-tab--running').exists()).toBe(true)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test component instance requires type assertion for internal method access
      const vm = wrapper.vm as any
      const iconClasses = vm.terminalIconClass
      expect(iconClasses[1]['terminal-tab__icon--warning']).toBe(true)
      expect(wrapper.find('.terminal-tab__close').exists()).toBe(true)
    })

    it('verifies isSystemTerminal computed property for system type', () => {
      const wrapper = mount(TerminalTab, {
        props: {
          name: 'System Terminal',
          terminalType: 'system',
        },
      })

      expect(wrapper.find('.terminal-tab--system').exists()).toBe(true)
    })

    it('verifies isSystemTerminal computed property for timeline type', () => {
      const wrapper = mount(TerminalTab, {
        props: {
          name: 'Timeline Terminal',
          terminalType: 'timeline',
        },
      })

      expect(wrapper.find('.terminal-tab--system').exists()).toBe(true)
    })

    it('verifies isSystemTerminal computed property for regular type', () => {
      const wrapper = mount(TerminalTab, {
        props: {
          name: 'Regular Terminal',
          terminalType: 'regular',
        },
      })

      expect(wrapper.find('.terminal-tab--system').exists()).toBe(false)
    })
  })
})
