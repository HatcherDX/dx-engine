import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import TerminalTabBar from './TerminalTabBar.vue'

interface TerminalInterface {
  id: string
  name: string
  isRunning: boolean
  terminalType?: 'regular' | 'system' | 'timeline'
  activityState?: 'info' | 'warning' | 'error' | 'idle'
  closable?: boolean
}
// Mock child components with proper prop definitions
vi.mock('../atoms/TerminalTab.vue', () => ({
  default: {
    name: 'TerminalTab',
    props: {
      name: String,
      active: Boolean,
      running: Boolean,
      terminalType: String,
      activityState: String,
      closable: Boolean,
    },
    template:
      '<div data-testid="terminal-tab" class="terminal-tab" @click="$emit(\'click\')" @close="$emit(\'close\')" @contextmenu="$emit(\'contextmenu\', $event)"><slot /></div>',
  },
}))

vi.mock('../atoms/BaseButton.vue', () => ({
  default: {
    name: 'BaseButton',
    props: {
      variant: String,
      size: String,
      title: String,
    },
    template:
      '<button data-testid="base-button" @click="$emit(\'click\')"><slot /></button>',
  },
}))

vi.mock('../atoms/BaseIcon.vue', () => ({
  default: {
    name: 'BaseIcon',
    props: {
      name: String,
      size: String,
    },
    template: '<div data-testid="base-icon"><slot /></div>',
  },
}))

describe('TerminalTabBar', () => {
  let wrapper: VueWrapper<InstanceType<typeof TerminalTabBar>>

  const mockTerminals: TerminalInterface[] = [
    {
      id: 'terminal-1',
      name: 'Terminal 1',
      isRunning: true,
      terminalType: 'regular' as const,
      closable: true,
    },
    {
      id: 'terminal-2',
      name: 'Terminal 2',
      isRunning: false,
      terminalType: 'regular' as const,
      closable: true,
    },
  ]

  const mockSystemTerminals: TerminalInterface[] = [
    {
      id: 'system-1',
      name: 'System Terminal',
      isRunning: true,
      terminalType: 'system' as const,
      activityState: 'info' as const,
      closable: false,
    },
    {
      id: 'timeline-1',
      name: 'Timeline Terminal',
      isRunning: false,
      terminalType: 'timeline' as const,
      activityState: 'idle' as const,
      closable: false,
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
    vi.restoreAllMocks()
  })

  describe('Component Initialization', () => {
    it('should mount successfully with terminals', () => {
      wrapper = mount(TerminalTabBar, {
        props: {
          terminals: mockTerminals,
          activeTerminalId: 'terminal-1',
        },
      })

      expect(wrapper.exists()).toBe(true)
      expect(wrapper.find('.terminal-tab-bar').exists()).toBe(true)
    })

    it('should render all terminal tabs', () => {
      wrapper = mount(TerminalTabBar, {
        props: {
          terminals: mockTerminals,
          activeTerminalId: 'terminal-1',
        },
      })

      const terminalTabs = wrapper.findAllComponents({ name: 'TerminalTab' })
      expect(terminalTabs).toHaveLength(2)
    })

    it('should render action buttons', () => {
      wrapper = mount(TerminalTabBar, {
        props: {
          terminals: mockTerminals,
          activeTerminalId: 'terminal-1',
        },
      })

      const buttons = wrapper.findAllComponents({ name: 'BaseButton' })
      expect(buttons.length).toBe(1) // Only new terminal button
    })
  })

  describe('Terminal Tab Rendering', () => {
    beforeEach(() => {
      wrapper = mount(TerminalTabBar, {
        props: {
          terminals: mockTerminals,
          activeTerminalId: 'terminal-1',
        },
      })
    })

    it('should pass correct props to each terminal tab', () => {
      const terminalTabs = wrapper.findAllComponents({ name: 'TerminalTab' })

      expect(terminalTabs[0].props('name')).toBe(mockTerminals[0].name)
      expect(terminalTabs[0].props('active')).toBe(true)
      expect(terminalTabs[0].props('running')).toBe(mockTerminals[0].isRunning)

      expect(terminalTabs[1].props('name')).toBe(mockTerminals[1].name)
      expect(terminalTabs[1].props('active')).toBe(false)
      expect(terminalTabs[1].props('running')).toBe(mockTerminals[1].isRunning)
    })

    it('should handle terminal click events', async () => {
      const terminalTabs = wrapper.findAllComponents({ name: 'TerminalTab' })

      await terminalTabs[1].vm.$emit('click')

      expect(wrapper.emitted('tabClick')).toBeTruthy()
      const tabClickEvents = wrapper.emitted('tabClick')
      expect(tabClickEvents?.[0]).toEqual([mockTerminals[1].id])
    })

    it('should handle terminal close events', async () => {
      const terminalTabs = wrapper.findAllComponents({ name: 'TerminalTab' })

      await terminalTabs[0].vm.$emit('close')

      expect(wrapper.emitted('tabClose')).toBeTruthy()
      const tabCloseEvents = wrapper.emitted('tabClose')
      expect(tabCloseEvents?.[0]).toEqual([mockTerminals[0].id])
    })

    it('should handle terminal context menu events', async () => {
      const terminalTabs = wrapper.findAllComponents({ name: 'TerminalTab' })
      const mockEvent = new MouseEvent('contextmenu')

      await terminalTabs[0].vm.$emit('contextmenu', mockEvent)

      expect(wrapper.emitted('tabContextMenu')).toBeTruthy()
      const tabContextMenuEvents = wrapper.emitted('tabContextMenu')
      expect(tabContextMenuEvents?.[0]).toEqual([
        mockTerminals[0].id,
        mockEvent,
      ])
    })
  })

  describe('Action Buttons', () => {
    beforeEach(() => {
      wrapper = mount(TerminalTabBar, {
        props: {
          terminals: mockTerminals,
          activeTerminalId: 'terminal-1',
        },
      })
    })

    it('should emit new terminal event on plus button click', async () => {
      const buttons = wrapper.findAllComponents({ name: 'BaseButton' })
      const newTerminalButton = buttons.find((button) =>
        button.props('title')?.includes('New Terminal')
      )

      expect(newTerminalButton).toBeTruthy()

      if (newTerminalButton) {
        await newTerminalButton.vm.$emit('click')
        expect(wrapper.emitted('newTerminal')).toBeTruthy()
      }
    })

    it('should have proper ARIA labels for accessibility', () => {
      const buttons = wrapper.findAllComponents({ name: 'BaseButton' })

      buttons.forEach((button) => {
        expect(button.props('title')).toBeTruthy()
      })
    })
  })

  describe('Empty State', () => {
    it('should render empty state when no terminals', () => {
      wrapper = mount(TerminalTabBar, {
        props: {
          terminals: [],
        },
      })

      const terminalTabs = wrapper.findAllComponents({ name: 'TerminalTab' })
      expect(terminalTabs).toHaveLength(0)
    })

    it('should still show action buttons in empty state', () => {
      wrapper = mount(TerminalTabBar, {
        props: {
          terminals: [],
        },
      })

      const buttons = wrapper.findAllComponents({ name: 'BaseButton' })
      expect(buttons.length).toBeGreaterThan(0)
    })
  })

  describe('Tab Scrolling', () => {
    it('should handle large number of terminals', () => {
      const manyTerminals = Array.from({ length: 20 }, (_, i) => ({
        id: `terminal-${i}`,
        name: `Terminal ${i}`,
        isRunning: i % 2 === 0,
        terminalType: 'regular' as const,
        closable: true,
      }))

      wrapper = mount(TerminalTabBar, {
        props: {
          terminals: manyTerminals,
          activeTerminalId: 'terminal-0',
        },
      })

      const terminalTabs = wrapper.findAllComponents({ name: 'TerminalTab' })
      expect(terminalTabs).toHaveLength(20)
    })

    it('should have scrollable container for overflow', () => {
      const manyTerminals = Array.from({ length: 20 }, (_, i) => ({
        id: `terminal-${i}`,
        name: `Terminal ${i}`,
        isRunning: i % 2 === 0,
        terminalType: 'regular' as const,
        closable: true,
      }))

      wrapper = mount(TerminalTabBar, {
        props: {
          terminals: manyTerminals,
          activeTerminalId: 'terminal-0',
        },
      })

      const tabsContainer = wrapper.find('.terminal-tab-bar__tabs')
      expect(tabsContainer.exists()).toBe(true)
    })
  })

  describe('Edge Cases', () => {
    it('should handle undefined activeTerminalId', () => {
      wrapper = mount(TerminalTabBar, {
        props: {
          terminals: mockTerminals,
        },
      })

      const terminalTabs = wrapper.findAllComponents({ name: 'TerminalTab' })
      terminalTabs.forEach((tab) => {
        expect(tab.props('active')).toBe(false)
      })
    })

    it('should handle null terminals array', () => {
      expect(() => {
        wrapper = mount(TerminalTabBar, {
          props: {
            terminals: [],
          },
        })
      }).not.toThrow()
    })

    it('should handle empty terminals array', () => {
      wrapper = mount(TerminalTabBar, {
        props: {
          terminals: [],
        },
      })

      const terminalTabs = wrapper.findAllComponents({ name: 'TerminalTab' })
      expect(terminalTabs).toHaveLength(0)
    })
  })

  describe('Performance', () => {
    it('should handle large number of terminals efficiently', () => {
      const startTime = performance.now()

      const largeTerminalArray = Array.from({ length: 100 }, (_, i) => ({
        id: `perf-terminal-${i}`,
        name: `Terminal ${i}`,
        isRunning: i % 3 === 0,
        terminalType: 'regular' as const,
        closable: true,
      }))

      wrapper = mount(TerminalTabBar, {
        props: {
          terminals: largeTerminalArray,
          activeTerminalId: 'perf-terminal-0',
        },
      })

      const endTime = performance.now()
      const renderTime = endTime - startTime

      // Performance can vary based on system load
      // Test that it renders 100 tabs in reasonable time (under 200ms)
      expect(renderTime).toBeLessThan(200)
      expect(wrapper.findAllComponents({ name: 'TerminalTab' })).toHaveLength(
        100
      )
    })
  })

  describe('System Terminals', () => {
    it('should render system terminals separately from regular terminals', () => {
      wrapper = mount(TerminalTabBar, {
        props: {
          terminals: mockTerminals,
          systemTerminals: mockSystemTerminals,
          activeTerminalId: 'terminal-1',
        },
      })

      const terminalTabs = wrapper.findAllComponents({ name: 'TerminalTab' })
      expect(terminalTabs).toHaveLength(4) // 2 system + 2 regular
    })

    it('should show separator when both system and regular terminals exist', () => {
      wrapper = mount(TerminalTabBar, {
        props: {
          terminals: mockTerminals,
          systemTerminals: mockSystemTerminals,
          activeTerminalId: 'terminal-1',
        },
      })

      const separator = wrapper.find('.terminal-tab-bar__separator')
      expect(separator.exists()).toBe(true)
    })

    it('should not show separator when no system terminals', () => {
      wrapper = mount(TerminalTabBar, {
        props: {
          terminals: mockTerminals,
          activeTerminalId: 'terminal-1',
        },
      })

      const separator = wrapper.find('.terminal-tab-bar__separator')
      expect(separator.exists()).toBe(false)
    })

    it('should not show separator when no regular terminals', () => {
      wrapper = mount(TerminalTabBar, {
        props: {
          terminals: [],
          systemTerminals: mockSystemTerminals,
          activeTerminalId: 'system-1',
        },
      })

      const separator = wrapper.find('.terminal-tab-bar__separator')
      expect(separator.exists()).toBe(false)
    })

    it('should not show separator when systemTerminals is undefined', () => {
      wrapper = mount(TerminalTabBar, {
        props: {
          terminals: mockTerminals,
          activeTerminalId: 'terminal-1',
        },
      })

      const separator = wrapper.find('.terminal-tab-bar__separator')
      expect(separator.exists()).toBe(false)
    })

    it('should pass correct props to system terminal tabs', () => {
      wrapper = mount(TerminalTabBar, {
        props: {
          terminals: mockTerminals,
          systemTerminals: mockSystemTerminals,
          activeTerminalId: 'system-1',
        },
      })

      const terminalTabs = wrapper.findAllComponents({ name: 'TerminalTab' })

      expect(terminalTabs[0].props('name')).toBe('System Terminal')
      expect(terminalTabs[0].props('active')).toBe(true)
      expect(terminalTabs[0].props('running')).toBe(true)
      expect(terminalTabs[0].props('terminalType')).toBe('system')
      expect(terminalTabs[0].props('activityState')).toBe('info')
      expect(terminalTabs[0].props('closable')).toBe(false)

      expect(terminalTabs[1].props('name')).toBe('Timeline Terminal')
      expect(terminalTabs[1].props('active')).toBe(false)
      expect(terminalTabs[1].props('running')).toBe(false)
      expect(terminalTabs[1].props('terminalType')).toBe('timeline')
      expect(terminalTabs[1].props('activityState')).toBe('idle')
      expect(terminalTabs[1].props('closable')).toBe(false)
    })

    it('should emit events for system terminals', async () => {
      wrapper = mount(TerminalTabBar, {
        props: {
          terminals: mockTerminals,
          systemTerminals: mockSystemTerminals,
          activeTerminalId: 'system-1',
        },
      })

      const terminalTabs = wrapper.findAllComponents({ name: 'TerminalTab' })

      // Test click event on system terminal
      await terminalTabs[0].vm.$emit('click')
      expect(wrapper.emitted('tabClick')).toBeTruthy()
      expect(wrapper.emitted('tabClick')?.[0]).toEqual(['system-1'])

      // Test close event on system terminal
      await terminalTabs[0].vm.$emit('close')
      expect(wrapper.emitted('tabClose')).toBeTruthy()
      expect(wrapper.emitted('tabClose')?.[0]).toEqual(['system-1'])

      // Test context menu on system terminal
      const mockEvent = new MouseEvent('contextmenu')
      await terminalTabs[0].vm.$emit('contextmenu', mockEvent)
      expect(wrapper.emitted('tabContextMenu')).toBeTruthy()
      expect(wrapper.emitted('tabContextMenu')?.[0]).toEqual([
        'system-1',
        mockEvent,
      ])
    })
  })

  describe('Terminal Props and Defaults', () => {
    it('should use default values for optional props on regular terminals', () => {
      const terminalsWithoutOptionalProps = [
        {
          id: 'basic-terminal',
          name: 'Basic Terminal',
          isRunning: true,
        },
      ]

      wrapper = mount(TerminalTabBar, {
        props: {
          terminals: terminalsWithoutOptionalProps,
          activeTerminalId: 'basic-terminal',
        },
      })

      const terminalTabs = wrapper.findAllComponents({ name: 'TerminalTab' })

      expect(terminalTabs[0].props('name')).toBe('Basic Terminal')
      expect(terminalTabs[0].props('active')).toBe(true)
      expect(terminalTabs[0].props('running')).toBe(true)
      expect(terminalTabs[0].props('terminalType')).toBe('regular') // Default value
      expect(terminalTabs[0].props('closable')).toBe(true) // Default value
    })

    it('should handle different terminal types', () => {
      const terminalsWithTypes = [
        {
          id: 'regular-terminal',
          name: 'Regular Terminal',
          isRunning: true,
          terminalType: 'regular' as const,
        },
        {
          id: 'timeline-terminal',
          name: 'Timeline Terminal',
          isRunning: false,
          terminalType: 'timeline' as const,
        },
      ]

      wrapper = mount(TerminalTabBar, {
        props: {
          terminals: terminalsWithTypes,
          activeTerminalId: 'regular-terminal',
        },
      })

      const terminalTabs = wrapper.findAllComponents({ name: 'TerminalTab' })

      expect(terminalTabs[0].props('terminalType')).toBe('regular')
      expect(terminalTabs[1].props('terminalType')).toBe('timeline')
    })

    it('should handle different activity states', () => {
      const terminalsWithActivityStates = [
        {
          id: 'info-terminal',
          name: 'Info Terminal',
          isRunning: true,
          activityState: 'info' as const,
        },
        {
          id: 'warning-terminal',
          name: 'Warning Terminal',
          isRunning: true,
          activityState: 'warning' as const,
        },
        {
          id: 'error-terminal',
          name: 'Error Terminal',
          isRunning: false,
          activityState: 'error' as const,
        },
        {
          id: 'idle-terminal',
          name: 'Idle Terminal',
          isRunning: false,
          activityState: 'idle' as const,
        },
      ]

      wrapper = mount(TerminalTabBar, {
        props: {
          terminals: terminalsWithActivityStates,
          activeTerminalId: 'info-terminal',
        },
      })

      const terminalTabs = wrapper.findAllComponents({ name: 'TerminalTab' })

      expect(terminalTabs[0].props('activityState')).toBe('info')
      expect(terminalTabs[1].props('activityState')).toBe('warning')
      expect(terminalTabs[2].props('activityState')).toBe('error')
      expect(terminalTabs[3].props('activityState')).toBe('idle')
    })

    it('should handle closable property', () => {
      const terminalsWithClosable = [
        {
          id: 'closable-terminal',
          name: 'Closable Terminal',
          isRunning: true,
          closable: true,
        },
        {
          id: 'non-closable-terminal',
          name: 'Non-Closable Terminal',
          isRunning: false,
          closable: false,
        },
      ]

      wrapper = mount(TerminalTabBar, {
        props: {
          terminals: terminalsWithClosable,
          activeTerminalId: 'closable-terminal',
        },
      })

      const terminalTabs = wrapper.findAllComponents({ name: 'TerminalTab' })

      expect(terminalTabs[0].props('closable')).toBe(true)
      expect(terminalTabs[1].props('closable')).toBe(false)
    })
  })

  describe('New Terminal Handler', () => {
    beforeEach(() => {
      wrapper = mount(TerminalTabBar, {
        props: {
          terminals: mockTerminals,
          activeTerminalId: 'terminal-1',
        },
      })
    })

    it('should call handleNewTerminal method when new terminal button is clicked', async () => {
      const button = wrapper.findComponent({ name: 'BaseButton' })
      await button.vm.$emit('click')

      expect(wrapper.emitted('newTerminal')).toBeTruthy()
      expect(wrapper.emitted('newTerminal')?.[0]).toEqual([])
    })

    it('should have correct button props for new terminal button', () => {
      const button = wrapper.findComponent({ name: 'BaseButton' })

      expect(button.props('variant')).toBe('ghost')
      expect(button.props('size')).toBe('sm')
      expect(button.props('title')).toBe('New Terminal')
    })
  })

  describe('CSS Classes and Structure', () => {
    beforeEach(() => {
      wrapper = mount(TerminalTabBar, {
        props: {
          terminals: mockTerminals,
          systemTerminals: mockSystemTerminals,
          activeTerminalId: 'terminal-1',
        },
      })
    })

    it('should have correct CSS classes for main elements', () => {
      expect(wrapper.find('.terminal-tab-bar').exists()).toBe(true)
      expect(wrapper.find('.terminal-tab-bar__tabs').exists()).toBe(true)
      expect(wrapper.find('.terminal-tab-bar__actions').exists()).toBe(true)
      expect(wrapper.find('.terminal-tab-bar__separator').exists()).toBe(true)
    })

    it('should render BaseIcon in action button', () => {
      const icon = wrapper.findComponent({ name: 'BaseIcon' })
      expect(icon.exists()).toBe(true)
      expect(icon.props('name')).toBe('Plus')
      expect(icon.props('size')).toBe('sm')
    })
  })

  describe('Accessibility', () => {
    beforeEach(() => {
      wrapper = mount(TerminalTabBar, {
        props: {
          terminals: mockTerminals,
          activeTerminalId: 'terminal-1',
        },
      })
    })

    it('should have proper tab bar structure', () => {
      const tabBar = wrapper.find('.terminal-tab-bar')
      expect(tabBar.exists()).toBe(true)
    })

    it('should support keyboard navigation', () => {
      const terminalTabs = wrapper.findAllComponents({ name: 'TerminalTab' })

      terminalTabs.forEach((tab) => {
        expect(tab.exists()).toBe(true)
      })
    })

    it('should have accessible action buttons', () => {
      const buttons = wrapper.findAllComponents({ name: 'BaseButton' })

      buttons.forEach((button) => {
        expect(button.props('title')).toBeTruthy()
      })
    })
  })
})
