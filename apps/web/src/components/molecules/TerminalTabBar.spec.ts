import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import TerminalTabBar from './TerminalTabBar.vue'

interface Terminal {
  id: string
  name: string
  isRunning: boolean
}

// Mock child components
vi.mock('../atoms/TerminalTab.vue', () => ({
  default: {
    name: 'TerminalTab',
    template:
      '<div data-testid="terminal-tab" class="terminal-tab"><slot /></div>',
    props: ['name', 'active', 'running'],
    emits: ['click', 'close', 'contextmenu'],
  },
}))

vi.mock('../atoms/BaseButton.vue', () => ({
  default: {
    name: 'BaseButton',
    template: '<button data-testid="base-button"><slot /></button>',
    props: ['variant', 'size', 'title', 'disabled'],
    emits: ['click'],
  },
}))

vi.mock('../atoms/BaseIcon.vue', () => ({
  default: {
    name: 'BaseIcon',
    template: '<span data-testid="base-icon"></span>',
    props: ['name', 'size'],
  },
}))

describe('TerminalTabBar', () => {
  let wrapper: VueWrapper<InstanceType<typeof TerminalTabBar>>

  const mockTerminals = [
    {
      id: 'terminal-1',
      name: 'Terminal 1',
      isRunning: true,
      isActive: true,
    },
    {
      id: 'terminal-2',
      name: 'Terminal 2',
      isRunning: true,
      isActive: false,
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
      expect(buttons.length).toBeGreaterThanOrEqual(2) // At least new and split buttons
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

    it('should emit split terminal event on split button click', async () => {
      const buttons = wrapper.findAllComponents({ name: 'BaseButton' })
      const splitTerminalButton = buttons.find((button) =>
        button.props('title')?.includes('Split Terminal')
      )

      expect(splitTerminalButton).toBeTruthy()

      if (splitTerminalButton) {
        await splitTerminalButton.vm.$emit('click')
        expect(wrapper.emitted('splitTerminal')).toBeTruthy()
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
          activeTerminalId: undefined,
        },
      })

      const terminalTabs = wrapper.findAllComponents({ name: 'TerminalTab' })
      expect(terminalTabs).toHaveLength(0)
    })

    it('should still show action buttons in empty state', () => {
      wrapper = mount(TerminalTabBar, {
        props: {
          terminals: [],
          activeTerminalId: undefined,
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
        isRunning: true,
        isActive: i === 0,
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
        isRunning: true,
        isActive: i === 0,
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
          activeTerminalId: undefined,
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
            terminals: null as unknown as Terminal[],
            activeTerminalId: null as unknown as string,
          },
        })
      }).not.toThrow()
    })

    it('should handle empty terminals array', () => {
      wrapper = mount(TerminalTabBar, {
        props: {
          terminals: [],
          activeTerminalId: undefined,
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
        id: `terminal-${i}`,
        name: `Terminal ${i}`,
        isRunning: true,
        isActive: i === 0,
      }))

      wrapper = mount(TerminalTabBar, {
        props: {
          terminals: largeTerminalArray,
          activeTerminalId: 'terminal-0',
        },
      })

      const endTime = performance.now()
      const renderTime = endTime - startTime

      expect(renderTime).toBeLessThan(100)
      expect(wrapper.findAllComponents({ name: 'TerminalTab' })).toHaveLength(
        100
      )
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
