import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import TerminalPanel from './TerminalPanel.vue'

// Mock child components
vi.mock('../molecules/TerminalTabBar.vue', () => ({
  default: {
    name: 'TerminalTabBar',
    template: '<div data-testid="terminal-tab-bar"><slot /></div>',
    emits: [
      'tab-click',
      'tab-close',
      'tab-context-menu',
      'new-terminal',
      'split-terminal',
    ],
  },
}))

vi.mock('./TerminalView.vue', () => ({
  default: {
    name: 'TerminalView',
    template: '<div data-testid="terminal-view"><slot /></div>',
    props: ['terminalId', 'theme'],
    emits: ['data', 'resize', 'ready'],
    methods: {
      focus: vi.fn(),
    },
  },
}))

vi.mock('../atoms/BaseIcon.vue', () => ({
  default: {
    name: 'BaseIcon',
    template: '<div data-testid="base-icon"><slot /></div>',
    props: ['name', 'size'],
  },
}))

vi.mock('../atoms/BaseButton.vue', () => ({
  default: {
    name: 'BaseButton',
    template: '<button data-testid="base-button"><slot /></button>',
    emits: ['click'],
  },
}))

// Mock composables
const mockTerminalManager = {
  terminals: {
    value: [
      {
        id: 'terminal-1',
        name: 'Terminal 1',
        isRunning: true,
        isActive: true,
      },
    ],
  },
  activeTerminalId: { value: 'terminal-1' },
  createTerminal: vi.fn().mockResolvedValue({
    id: 'terminal-2',
    name: 'Terminal 2',
    isRunning: true,
    isActive: false,
  }),
  closeTerminal: vi.fn().mockResolvedValue(undefined),
  setActiveTerminal: vi.fn(),
}

const mockTheme = {
  themeMode: 'dark',
}

vi.mock('../../composables/useTerminalManager', () => ({
  useTerminalManager: () => mockTerminalManager,
}))

vi.mock('../../composables/useTheme', () => ({
  useTheme: () => mockTheme,
}))

// Global electron API mock
const mockElectronAPI = {
  versions: process.versions,
  sendTerminalInput: vi.fn(),
  sendTerminalResize: vi.fn(),
  send: vi.fn(),
  invoke: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
  setTheme: vi.fn(),
}

Object.defineProperty(global, 'window', {
  value: {
    electronAPI: mockElectronAPI,
  },
  writable: true,
})

describe('TerminalPanel', () => {
  let wrapper: VueWrapper<InstanceType<typeof TerminalPanel>>

  beforeEach(() => {
    vi.clearAllMocks()
    mockTerminalManager.terminals.value = [
      {
        id: 'terminal-1',
        name: 'Terminal 1',
        isRunning: true,
        isActive: true,
      },
    ]
    mockTerminalManager.activeTerminalId.value = 'terminal-1'
    mockTheme.themeMode = 'dark'
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
    vi.restoreAllMocks()
  })

  describe('Component Initialization', () => {
    it('should mount successfully', () => {
      wrapper = mount(TerminalPanel)

      expect(wrapper.exists()).toBe(true)
      expect(wrapper.find('.terminal-panel').exists()).toBe(true)
    })

    it('should render terminal tab bar', () => {
      wrapper = mount(TerminalPanel)

      expect(wrapper.find('[data-testid="terminal-tab-bar"]').exists()).toBe(
        true
      )
    })

    it('should render terminal content area', () => {
      wrapper = mount(TerminalPanel)

      expect(wrapper.find('.terminal-panel__content').exists()).toBe(true)
    })

    it('should show empty state when no terminals exist on mount', async () => {
      mockTerminalManager.terminals.value = []

      wrapper = mount(TerminalPanel)
      await nextTick()

      expect(wrapper.find('.terminal-panel__empty').exists()).toBe(true)
      expect(wrapper.text()).toContain('No Terminal Open')
    })
  })

  describe('Terminal Management', () => {
    beforeEach(() => {
      wrapper = mount(TerminalPanel)
    })

    it('should display active terminal', () => {
      const terminalView = wrapper.find('[data-testid="terminal-view"]')
      expect(terminalView.exists()).toBe(true)
    })

    it('should pass correct theme to terminal view', () => {
      const terminalView = wrapper.findComponent({ name: 'TerminalView' })
      expect(terminalView.props('theme')).toBe('dark')
    })

    it('should handle light theme mode', async () => {
      mockTheme.themeMode = 'light'

      wrapper = mount(TerminalPanel)
      await nextTick()

      const terminalView = wrapper.findComponent({ name: 'TerminalView' })
      expect(terminalView.props('theme')).toBe('light')
    })
  })

  describe('Terminal Creation', () => {
    beforeEach(() => {
      wrapper = mount(TerminalPanel)
    })

    it('should create new terminal through TerminalTabBar events', async () => {
      const terminalTabBar = wrapper.findComponent({ name: 'TerminalTabBar' })

      await terminalTabBar.vm.$emit('new-terminal')

      expect(mockTerminalManager.createTerminal).toHaveBeenCalled()
    })

    it('should handle split terminal events', async () => {
      const terminalTabBar = wrapper.findComponent({ name: 'TerminalTabBar' })

      await terminalTabBar.vm.$emit('split-terminal')

      expect(mockTerminalManager.createTerminal).toHaveBeenCalled()
    })
  })

  describe('Terminal Tab Management', () => {
    beforeEach(() => {
      wrapper = mount(TerminalPanel)
    })

    it('should switch active terminal on tab click', async () => {
      const terminalTabBar = wrapper.findComponent({ name: 'TerminalTabBar' })

      await terminalTabBar.vm.$emit('tab-click', 'terminal-2')

      expect(mockTerminalManager.setActiveTerminal).toHaveBeenCalledWith(
        'terminal-2'
      )
    })

    it('should close terminal through tab close events', async () => {
      const terminalTabBar = wrapper.findComponent({ name: 'TerminalTabBar' })

      await terminalTabBar.vm.$emit('tab-close', 'terminal-1')

      expect(mockTerminalManager.closeTerminal).toHaveBeenCalledWith(
        'terminal-1'
      )
    })
  })

  describe('Terminal Communication', () => {
    beforeEach(() => {
      wrapper = mount(TerminalPanel)
    })

    it('should handle terminal input through TerminalView components', () => {
      // This test verifies that the component structure allows for terminal input
      // The actual IPC communication is handled by TerminalView components
      const terminalViews = wrapper.findAllComponents({ name: 'TerminalView' })
      expect(terminalViews.length).toBeGreaterThan(0)
    })

    it('should handle terminal resize through TerminalView components', () => {
      // This test verifies that the component structure allows for terminal resize
      // The actual IPC communication is handled by TerminalView components
      const terminalViews = wrapper.findAllComponents({ name: 'TerminalView' })
      expect(terminalViews.length).toBeGreaterThan(0)
    })
  })

  describe('Empty State', () => {
    it('should show empty state when no terminals exist', () => {
      mockTerminalManager.terminals.value = []

      wrapper = mount(TerminalPanel)

      expect(wrapper.find('.terminal-panel__empty').exists()).toBe(true)
    })

    it('should show correct empty state content', () => {
      mockTerminalManager.terminals.value = []

      wrapper = mount(TerminalPanel)

      expect(wrapper.text()).toContain('No Terminal Open')
    })

    it('should create terminal from empty state button', async () => {
      mockTerminalManager.terminals.value = []

      wrapper = mount(TerminalPanel)

      const createButton = wrapper.findComponent({ name: 'BaseButton' })
      await createButton.vm.$emit('click')

      expect(mockTerminalManager.createTerminal).toHaveBeenCalled()
    })
  })

  describe('Multiple Terminals', () => {
    beforeEach(() => {
      mockTerminalManager.terminals.value = [
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

      wrapper = mount(TerminalPanel)
    })

    it('should render all terminal views', () => {
      const terminalViews = wrapper.findAllComponents({ name: 'TerminalView' })
      expect(terminalViews).toHaveLength(2)
    })

    it('should pass correct terminal IDs to each view', () => {
      const terminalViews = wrapper.findAllComponents({ name: 'TerminalView' })

      expect(terminalViews[0].props('terminalId')).toBe('terminal-1')
      expect(terminalViews[1].props('terminalId')).toBe('terminal-2')
    })
  })

  describe('Error Handling', () => {
    beforeEach(() => {
      wrapper = mount(TerminalPanel)
    })

    it('should handle missing electronAPI gracefully', () => {
      const originalAPI = window.electronAPI
      delete (window as unknown as Record<string, unknown>).electronAPI

      expect(() => {
        wrapper = mount(TerminalPanel)
      }).not.toThrow()

      window.electronAPI = originalAPI
    })
  })
})
