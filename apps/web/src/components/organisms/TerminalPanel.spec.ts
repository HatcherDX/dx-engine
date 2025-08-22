import { mount, VueWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick, ref } from 'vue'
import TerminalPanel from './TerminalPanel.vue'

// Type definition for TerminalPanel component instance - NO ANY TYPES ALLOWED
interface TerminalPanelInstance extends InstanceType<typeof TerminalPanel> {
  setActiveTerminal: (terminalId: string | null) => void
  handleTabClick: (tabId: string) => void
  handleTabClose: (tabId: string) => void
  handleNewTerminal: () => void
  handleSplitTerminal: () => void
  clearTerminal: () => void
  toggleTerminalActivity: () => void
  isAnyTerminalActive: () => boolean
  selectAllTerminalText: () => void
  copyTerminalText: () => void
  pasteToTerminal: () => void
  focusTerminal: () => void
  blurTerminal: () => void
  pasteText: (text?: string) => void
  systemTerminalLines: Array<{ content: string; type: string }>
  expandedHeight: string
  currentTerminalView: string
  terminalViewRef: unknown
  systemTerminalViewRef: unknown
  [key: string]: unknown
}

// Mock child components
vi.mock('../molecules/TerminalTabBar.vue', () => ({
  default: {
    name: 'TerminalTabBar',
    props: ['tabs', 'activeTabId'],
    emits: [
      'tab-click',
      'tab-close',
      'tab-context-menu',
      'new-terminal',
      'split-terminal',
    ],
    template: '<div data-testid="terminal-tab-bar"><slot /></div>',
  },
}))

vi.mock('./TerminalView.vue', () => ({
  default: {
    name: 'TerminalView',
    props: ['terminalId', 'theme'],
    template:
      '<div data-testid="terminal-view" :data-terminal-id="terminalId"><slot /></div>',
  },
}))

vi.mock('./SystemTerminalView.vue', () => ({
  default: {
    name: 'SystemTerminalView',
    template:
      '<div data-testid="system-terminal-view" :data-active-terminal="activeTerminal">System terminal ready<div>IDE lifecycle events will appear here</div><div>Terminal [System] ready</div></div>',
    props: ['activeTerminal'],
  },
}))

vi.mock('../atoms/BaseIcon.vue', () => ({
  default: {
    name: 'BaseIcon',
    template: '<span data-testid="base-icon" :class="name"></span>',
    props: ['name', 'size'],
  },
}))

vi.mock('../atoms/BaseButton.vue', () => ({
  default: {
    name: 'BaseButton',
    template:
      '<button data-testid="base-button" @click="$emit(\'click\')"><slot /></button>',
    props: ['disabled'],
    emits: ['click'],
  },
}))

// Mock composables
const mockTerminalManager = {
  terminals: ref([
    {
      id: 'terminal-1',
      name: 'Terminal 1',
      cwd: '/test',
      isActive: true,
      isRunning: true,
    },
  ]),
  activeTerminalId: ref('terminal-1'),
  createTerminal: vi.fn(),
  closeTerminal: vi.fn(),
  switchToTerminal: vi.fn(),
  sendCommand: vi.fn(),
  setActiveTerminal: vi.fn(),
}

const mockTheme = {
  themeMode: 'dark',
  isDark: true,
  platform: 'macos',
}

const mockSystemTerminals = {
  systemTerminal: {
    lines: [
      { type: 'INFO', content: 'System ready', timestamp: Date.now() },
      { type: 'CMD', content: 'git status', timestamp: Date.now() },
    ],
    isReady: true,
  },
  timelineTerminal: {
    lines: [
      { type: 'GIT', content: 'Timeline ready', timestamp: Date.now() },
      { type: 'WARN', content: 'Test warning', timestamp: Date.now() },
    ],
    isReady: true,
  },
  activeTerminal: ref(null as string | null),
  logInfo: vi.fn(),
  clearSystemTerminal: vi.fn(),
  clearTimelineTerminal: vi.fn(),
  setActiveTerminal: vi.fn(),
}

vi.mock('../../composables/useTerminalManager', () => ({
  useTerminalManager: () => mockTerminalManager,
}))

vi.mock('../../composables/useTheme', () => ({
  useTheme: () => mockTheme,
}))

vi.mock('../../composables/useSystemTerminals', () => ({
  useSystemTerminals: () => mockSystemTerminals,
}))

// Global electron API mock
const mockElectronAPI = {
  terminal: {
    create: vi.fn(),
    send: vi.fn(),
    close: vi.fn(),
    onOutput: vi.fn(),
    onExit: vi.fn(),
  },
  send: vi.fn(),
  sendTerminalInput: vi.fn(),
  sendTerminalResize: vi.fn(),
}

Object.defineProperty(global, 'window', {
  value: {
    electronAPI: mockElectronAPI,
  },
  writable: true,
})

describe('TerminalPanel.vue', () => {
  let wrapper: VueWrapper<InstanceType<typeof TerminalPanel>>

  beforeEach(() => {
    vi.clearAllMocks()
    mockTerminalManager.terminals.value = [
      {
        id: 'terminal-1',
        name: 'Terminal 1',
        cwd: '/test',
        isActive: true,
        isRunning: true,
      },
    ]
    mockTerminalManager.activeTerminalId.value = 'terminal-1'
    mockTheme.themeMode = 'dark'
    mockSystemTerminals.activeTerminal.value = null
    mockSystemTerminals.systemTerminal.isReady = true
    mockSystemTerminals.timelineTerminal.isReady = true
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

      // The component now shows system terminal view instead of empty state
      expect(wrapper.text()).toContain('Terminal [System] ready')
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

    it('should handle auto theme mode as dark', async () => {
      mockTheme.themeMode = 'auto'

      wrapper = mount(TerminalPanel)
      await nextTick()

      const terminalView = wrapper.findComponent({ name: 'TerminalView' })
      expect(terminalView.props('theme')).toBe('dark')
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

    it('should handle terminal creation with custom options through events', async () => {
      const terminalTabBar = wrapper.findComponent({ name: 'TerminalTabBar' })
      const customOptions = { name: 'Custom Terminal', cwd: '/custom/path' }

      await terminalTabBar.vm.$emit('new-terminal', customOptions)

      expect(mockTerminalManager.createTerminal).toHaveBeenCalledWith(
        customOptions
      )
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

    it('should handle tab context menu events', async () => {
      const terminalTabBar = wrapper.findComponent({ name: 'TerminalTabBar' })

      // Should not throw when context menu is triggered
      expect(async () => {
        await terminalTabBar.vm.$emit('tab-context-menu', 'terminal-1')
      }).not.toThrow()
    })
  })

  describe('📡 Terminal Event Handling', () => {
    beforeEach(() => {
      wrapper = mount(TerminalPanel)
    })

    it('should handle terminal data events from TerminalView', async () => {
      const terminalView = wrapper.findComponent({ name: 'TerminalView' })

      await terminalView.vm.$emit('data', 'test input data')

      // The event should be handled by the sendTerminalInput method
      expect(mockElectronAPI.sendTerminalInput).toHaveBeenCalledWith({
        id: 'terminal-1',
        data: 'test input data',
      })
    })

    it('should handle terminal resize events from TerminalView', async () => {
      const terminalView = wrapper.findComponent({ name: 'TerminalView' })

      await terminalView.vm.$emit('resize', { cols: 80, rows: 24 })

      // The event should be handled by the resizeTerminal method
      expect(mockElectronAPI.sendTerminalResize).toHaveBeenCalledWith({
        id: 'terminal-1',
        cols: 80,
        rows: 24,
      })
    })

    it('should handle terminal ready events from TerminalView', async () => {
      const terminalView = wrapper.findComponent({ name: 'TerminalView' })

      // Should not throw when terminal ready event is emitted
      expect(async () => {
        await terminalView.vm.$emit('ready')
      }).not.toThrow()
    })

    it('should handle system terminal events', async () => {
      const systemTerminalView = wrapper.findComponent({
        name: 'SystemTerminalView',
      })

      await systemTerminalView.vm.$emit('set-active-terminal', 'timeline')

      expect(mockSystemTerminals.setActiveTerminal).toHaveBeenCalledWith(
        'timeline'
      )
    })
  })

  describe('📺 Terminal Display Logic', () => {
    it('should show system terminal when no regular terminals exist', () => {
      mockTerminalManager.terminals.value = []

      wrapper = mount(TerminalPanel)

      // Component shows system terminal instead of empty state
      expect(wrapper.text()).toContain('System terminal ready')
    })

    it('should show correct system terminal content', () => {
      mockTerminalManager.terminals.value = []

      wrapper = mount(TerminalPanel)

      expect(wrapper.text()).toContain('IDE lifecycle events will appear here')
    })

    it('should show regular terminal when no system terminal is active', () => {
      mockSystemTerminals.activeTerminal.value = null
      mockTerminalManager.activeTerminalId.value = 'terminal-1'

      wrapper = mount(TerminalPanel)

      const regularTerminal = wrapper.find('[data-terminal-id="terminal-1"]')
      expect(regularTerminal.isVisible()).toBe(true)
    })

    it('should hide regular terminals when system terminal is active', async () => {
      mockSystemTerminals.activeTerminal.value = 'system'
      mockTerminalManager.activeTerminalId.value = 'terminal-1'

      wrapper = mount(TerminalPanel)
      await nextTick()

      // Check v-show condition: regular terminal should be hidden when system terminal is active
      const regularTerminal = wrapper.find('[data-terminal-id="terminal-1"]')
      expect((regularTerminal.element as HTMLElement).style.display).toBe(
        'none'
      )
    })
  })

  describe('Multiple Terminals', () => {
    beforeEach(() => {
      mockTerminalManager.terminals.value = [
        {
          id: 'terminal-1',
          name: 'Terminal 1',
          cwd: '/test',
          isActive: false,
          isRunning: true,
        },
        {
          id: 'terminal-2',
          name: 'Terminal 2',
          cwd: '/test',
          isActive: true,
          isRunning: true,
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

  describe('🎯 System Terminals Integration', () => {
    beforeEach(() => {
      wrapper = mount(TerminalPanel)
    })

    it('should render system terminal view', () => {
      const systemTerminalView = wrapper.findComponent({
        name: 'SystemTerminalView',
      })
      expect(systemTerminalView.exists()).toBe(true)
    })

    it('should show system terminal when system terminal is active', async () => {
      mockSystemTerminals.activeTerminal.value = 'system'

      wrapper = mount(TerminalPanel)
      await nextTick()

      const systemTerminalView = wrapper.findComponent({
        name: 'SystemTerminalView',
      })
      expect(systemTerminalView.isVisible()).toBe(true)
    })

    it('should show timeline terminal when timeline terminal is active', async () => {
      mockSystemTerminals.activeTerminal.value = 'timeline'

      wrapper = mount(TerminalPanel)
      await nextTick()

      const systemTerminalView = wrapper.findComponent({
        name: 'SystemTerminalView',
      })
      expect(systemTerminalView.isVisible()).toBe(true)
    })

    it('should hide system terminal when regular terminal is active', async () => {
      mockSystemTerminals.activeTerminal.value = null
      mockTerminalManager.activeTerminalId.value = 'terminal-1'

      wrapper = mount(TerminalPanel)
      await nextTick()

      // Check v-show condition: system terminal should be hidden when no system terminal is active
      const systemTerminalView = wrapper.find(
        '[data-testid="system-terminal-view"]'
      )
      expect((systemTerminalView.element as HTMLElement).style.display).toBe(
        'none'
      )
    })
  })

  describe('🔄 Terminal Switching Logic', () => {
    beforeEach(() => {
      wrapper = mount(TerminalPanel)
    })

    it('should handle system terminal activation', async () => {
      const vm = wrapper.vm as TerminalPanelInstance

      vm.setActiveTerminal('system')

      expect(mockTerminalManager.setActiveTerminal).toHaveBeenCalledWith(null)
      expect(mockSystemTerminals.setActiveTerminal).toHaveBeenCalledWith(
        'system'
      )
    })

    it('should handle timeline terminal activation', async () => {
      const vm = wrapper.vm as TerminalPanelInstance

      vm.setActiveTerminal('timeline')

      expect(mockTerminalManager.setActiveTerminal).toHaveBeenCalledWith(null)
      expect(mockSystemTerminals.setActiveTerminal).toHaveBeenCalledWith(
        'timeline'
      )
    })

    it('should handle regular terminal activation', async () => {
      const vm = wrapper.vm as TerminalPanelInstance

      vm.setActiveTerminal('terminal-1')

      expect(mockSystemTerminals.setActiveTerminal).toHaveBeenCalledWith(null)
      expect(mockTerminalManager.setActiveTerminal).toHaveBeenCalledWith(
        'terminal-1'
      )
    })

    it('should focus terminal when activating regular terminal', async () => {
      const vm = wrapper.vm as TerminalPanelInstance
      const mockFocus = vi.fn()

      // Set up terminal ref with focus method
      vm.terminalRefs.set('terminal-1', { focus: mockFocus })

      vm.setActiveTerminal('terminal-1')

      // Wait for the timeout in setActiveTerminal
      await new Promise((resolve) => setTimeout(resolve, 150))

      expect(mockFocus).toHaveBeenCalled()
    })
  })

  describe('📡 IPC Communication', () => {
    beforeEach(() => {
      wrapper = mount(TerminalPanel)
    })

    it('should send terminal input via electronAPI', () => {
      const vm = wrapper.vm as TerminalPanelInstance

      vm.sendTerminalInput('terminal-1', 'ls -la')

      expect(mockElectronAPI.sendTerminalInput).toHaveBeenCalledWith({
        id: 'terminal-1',
        data: 'ls -la',
      })
    })

    it('should fallback to generic send method for terminal input', () => {
      const vm = wrapper.vm as TerminalPanelInstance

      // Remove specific method to test fallback
      const originalMethod = window.electronAPI.sendTerminalInput
      ;(
        window.electronAPI as { sendTerminalInput?: unknown }
      ).sendTerminalInput = undefined

      vm.sendTerminalInput('terminal-1', 'echo hello')

      expect(mockElectronAPI.send).toHaveBeenCalledWith('terminal-input', {
        id: 'terminal-1',
        data: 'echo hello',
      })

      // Restore method
      ;(
        window.electronAPI as { sendTerminalInput?: unknown }
      ).sendTerminalInput = originalMethod
    })

    it('should send terminal resize via electronAPI', () => {
      const vm = wrapper.vm as TerminalPanelInstance

      vm.resizeTerminal('terminal-1', { cols: 80, rows: 24 })

      expect(mockElectronAPI.sendTerminalResize).toHaveBeenCalledWith({
        id: 'terminal-1',
        cols: 80,
        rows: 24,
      })
    })

    it('should fallback to generic send method for terminal resize', () => {
      const vm = wrapper.vm as TerminalPanelInstance

      // Remove specific method to test fallback
      const originalMethod = window.electronAPI.sendTerminalResize
      ;(
        window.electronAPI as { sendTerminalResize?: unknown }
      ).sendTerminalResize = undefined

      vm.resizeTerminal('terminal-1', { cols: 120, rows: 30 })

      expect(mockElectronAPI.send).toHaveBeenCalledWith('terminal-resize', {
        id: 'terminal-1',
        cols: 120,
        rows: 30,
      })

      // Restore method
      ;(
        window.electronAPI as { sendTerminalResize?: unknown }
      ).sendTerminalResize = originalMethod
    })

    it('should handle missing electronAPI gracefully for input', () => {
      const vm = wrapper.vm as TerminalPanelInstance
      const originalAPI = window.electronAPI
      delete (window as { electronAPI?: unknown }).electronAPI

      expect(() => {
        vm.sendTerminalInput('terminal-1', 'test')
      }).not.toThrow()

      window.electronAPI = originalAPI
    })

    it('should handle missing electronAPI gracefully for resize', () => {
      const vm = wrapper.vm as TerminalPanelInstance
      const originalAPI = window.electronAPI
      delete (window as { electronAPI?: unknown }).electronAPI

      expect(() => {
        vm.resizeTerminal('terminal-1', { cols: 80, rows: 24 })
      }).not.toThrow()

      window.electronAPI = originalAPI
    })
  })

  describe('🔧 Terminal References Management', () => {
    beforeEach(() => {
      wrapper = mount(TerminalPanel)
    })

    it('should set terminal reference correctly', () => {
      const vm = wrapper.vm as TerminalPanelInstance
      const mockTerminalRef = { focus: vi.fn() }

      vm.setTerminalRef('terminal-1', mockTerminalRef)

      const storedRef = vm.terminalRefs.get('terminal-1')
      expect(storedRef).toBeDefined()
      expect(storedRef.focus).toBeDefined()
    })

    it('should remove terminal reference when ref is null', () => {
      const vm = wrapper.vm as TerminalPanelInstance
      const mockTerminalRef = { focus: vi.fn() }

      // First set the ref
      vm.setTerminalRef('terminal-1', mockTerminalRef)
      const storedRef = vm.terminalRefs.get('terminal-1')
      expect(storedRef).toBeDefined()

      // Then remove it
      vm.setTerminalRef('terminal-1', null)
      expect(vm.terminalRefs.get('terminal-1')).toBeUndefined()
    })
  })

  describe('🚀 Terminal Lifecycle Management', () => {
    beforeEach(() => {
      wrapper = mount(TerminalPanel)
    })

    it('should handle terminal creation with options', async () => {
      const vm = wrapper.vm as TerminalPanelInstance
      const options = { name: 'Custom Terminal', cwd: '/home/user' }

      const mockResult = {
        id: 'new-terminal',
        name: 'New Terminal',
        cwd: '/test',
        isActive: true,
      }

      mockTerminalManager.createTerminal.mockResolvedValueOnce(mockResult)

      const result = await vm.createTerminal(options)

      expect(mockTerminalManager.createTerminal).toHaveBeenCalledWith(options)
      expect(result).toEqual(mockResult)
    })

    it('should handle terminal creation without options', async () => {
      const vm = wrapper.vm as TerminalPanelInstance

      const mockResult = {
        id: 'default-terminal',
        name: 'Default Terminal',
        cwd: '/home',
        isActive: true,
      }

      mockTerminalManager.createTerminal.mockResolvedValueOnce(mockResult)

      const result = await vm.createTerminal()

      expect(mockTerminalManager.createTerminal).toHaveBeenCalledWith(undefined)
      expect(result).toEqual(mockResult)
    })

    it('should handle terminal creation errors', async () => {
      const vm = wrapper.vm as TerminalPanelInstance
      const error = new Error('Failed to create terminal')

      mockTerminalManager.createTerminal.mockRejectedValueOnce(error)

      await expect(vm.createTerminal()).rejects.toThrow(
        'Failed to create terminal'
      )
    })

    it('should handle terminal closure and cleanup refs', async () => {
      const vm = wrapper.vm as TerminalPanelInstance
      const mockTerminalRef = { focus: vi.fn() }

      // Set up terminal ref
      vm.setTerminalRef('terminal-1', mockTerminalRef)
      const storedRef = vm.terminalRefs.get('terminal-1')
      expect(storedRef).toBeDefined()

      // Close terminal
      await vm.closeTerminal('terminal-1')

      expect(mockTerminalManager.closeTerminal).toHaveBeenCalledWith(
        'terminal-1'
      )
      expect(vm.terminalRefs.get('terminal-1')).toBeUndefined()
    })

    it('should handle terminal ready callback', () => {
      const vm = wrapper.vm as TerminalPanelInstance

      // Should not throw
      expect(() => {
        vm.onTerminalReady('terminal-1')
      }).not.toThrow()
    })

    it('should handle terminal context menu', () => {
      const vm = wrapper.vm as TerminalPanelInstance

      // Should not throw (placeholder implementation)
      expect(() => {
        vm.showTerminalContextMenu()
      }).not.toThrow()
    })
  })

  describe('📊 System Terminal Activity States', () => {
    beforeEach(() => {
      wrapper = mount(TerminalPanel)
    })

    it('should return error state for terminals with error logs', () => {
      mockSystemTerminals.systemTerminal.lines = [
        { type: 'ERROR', content: 'Error message', timestamp: Date.now() },
        { type: 'INFO', content: 'Some info', timestamp: Date.now() },
      ]

      wrapper = mount(TerminalPanel)
      const vm = wrapper.vm as TerminalPanelInstance

      const state = vm.getSystemTerminalActivityState('system')
      expect(state).toBe('error')
    })

    it('should return error state for terminals with fatal logs', () => {
      mockSystemTerminals.systemTerminal.lines = [
        { type: 'INFO', content: 'Some info', timestamp: Date.now() },
        { type: 'FATAL', content: 'Fatal error', timestamp: Date.now() },
      ]

      wrapper = mount(TerminalPanel)
      const vm = wrapper.vm as TerminalPanelInstance

      const state = vm.getSystemTerminalActivityState('system')
      expect(state).toBe('error')
    })

    it('should return warning state for terminals with warning logs', () => {
      mockSystemTerminals.systemTerminal.lines = [
        { type: 'INFO', content: 'Some info', timestamp: Date.now() },
        { type: 'WARN', content: 'Warning message', timestamp: Date.now() },
      ]

      wrapper = mount(TerminalPanel)
      const vm = wrapper.vm as TerminalPanelInstance

      const state = vm.getSystemTerminalActivityState('system')
      expect(state).toBe('warning')
    })

    it('should return info state for terminals with command/git/info logs', () => {
      mockSystemTerminals.timelineTerminal.lines = [
        { type: 'CMD', content: 'git status', timestamp: Date.now() },
        { type: 'GIT', content: 'Git operation', timestamp: Date.now() },
        { type: 'INFO', content: 'Information', timestamp: Date.now() },
      ]

      wrapper = mount(TerminalPanel)
      const vm = wrapper.vm as TerminalPanelInstance

      const state = vm.getSystemTerminalActivityState('timeline')
      expect(state).toBe('info')
    })

    it('should return idle state for empty terminals', () => {
      const vm = wrapper.vm as TerminalPanelInstance

      mockSystemTerminals.systemTerminal.lines = []

      const state = vm.getSystemTerminalActivityState('system')
      expect(state).toBe('idle')
    })

    it('should return idle state for terminals with no recognized activity', () => {
      const vm = wrapper.vm as TerminalPanelInstance

      mockSystemTerminals.systemTerminal.lines = [
        { type: 'UNKNOWN', content: 'Some unknown log', timestamp: Date.now() },
      ]

      const state = vm.getSystemTerminalActivityState('system')
      expect(state).toBe('idle')
    })
  })

  describe('🧮 Computed Properties', () => {
    beforeEach(() => {
      wrapper = mount(TerminalPanel)
    })

    it('should compute regular terminals correctly', () => {
      const vm = wrapper.vm as TerminalPanelInstance

      expect(vm.terminals).toHaveLength(1)
      expect(vm.terminals[0]).toMatchObject({
        id: 'terminal-1',
        name: 'Terminal 1',
        isRunning: true,
        isActive: true,
        terminalType: 'regular',
        closable: true,
      })
    })

    it('should compute system terminals when ready', () => {
      const vm = wrapper.vm as TerminalPanelInstance

      expect(vm.systemTerminals).toHaveLength(2)

      const systemTerminal = vm.systemTerminals.find(
        (t: { id: string }) => t.id === 'system'
      )
      expect(systemTerminal).toMatchObject({
        id: 'system',
        name: 'System',
        isRunning: true,
        isActive: false,
        terminalType: 'system',
        activityState: expect.stringMatching(
          /^(idle|info|warning|error|active)$/
        ),
        closable: false,
      })

      const timelineTerminal = vm.systemTerminals.find(
        (t: { id: string }) => t.id === 'timeline'
      )
      expect(timelineTerminal).toMatchObject({
        id: 'timeline',
        name: 'Timeline',
        isRunning: true,
        isActive: false,
        terminalType: 'timeline',
        activityState: expect.stringMatching(
          /^(idle|info|warning|error|active)$/
        ),
        closable: false,
      })
    })

    it('should not include system terminals when not ready', () => {
      mockSystemTerminals.systemTerminal.isReady = false
      mockSystemTerminals.timelineTerminal.isReady = false

      wrapper = mount(TerminalPanel)
      const vm = wrapper.vm as TerminalPanelInstance

      expect(vm.systemTerminals).toHaveLength(0)
    })

    it('should include only ready system terminals', () => {
      mockSystemTerminals.systemTerminal.isReady = true
      mockSystemTerminals.timelineTerminal.isReady = false

      wrapper = mount(TerminalPanel)
      const vm = wrapper.vm as TerminalPanelInstance

      expect(vm.systemTerminals).toHaveLength(1)
      expect(vm.systemTerminals[0].id).toBe('system')
    })
  })

  describe('👀 Watchers', () => {
    it('should deactivate regular terminals when system terminal becomes active', async () => {
      wrapper = mount(TerminalPanel)
      await nextTick()

      // Clear previous calls from mount
      vi.clearAllMocks()

      // Test the setActiveTerminal method directly with system terminal
      const vm = wrapper.vm as TerminalPanelInstance
      vm.setActiveTerminal('system')

      expect(mockTerminalManager.setActiveTerminal).toHaveBeenCalledWith(null)
      expect(mockSystemTerminals.setActiveTerminal).toHaveBeenCalledWith(
        'system'
      )
    })

    it('should deactivate system terminals when regular terminal becomes active', async () => {
      wrapper = mount(TerminalPanel)
      await nextTick()

      // Clear previous calls from mount
      vi.clearAllMocks()

      // Test the setActiveTerminal method directly with regular terminal
      const vm = wrapper.vm as TerminalPanelInstance
      vm.setActiveTerminal('terminal-2')

      expect(mockSystemTerminals.setActiveTerminal).toHaveBeenCalledWith(null)
      expect(mockTerminalManager.setActiveTerminal).toHaveBeenCalledWith(
        'terminal-2'
      )
    })
  })

  describe('🔄 Lifecycle Hooks', () => {
    it('should create initial terminal on mount when no terminals exist', async () => {
      mockTerminalManager.terminals.value = []

      wrapper = mount(TerminalPanel)
      await nextTick()

      expect(mockTerminalManager.createTerminal).toHaveBeenCalled()
    })

    it('should not create terminal on mount when terminals already exist', async () => {
      mockTerminalManager.terminals.value = [
        {
          id: 'existing-terminal',
          name: 'Existing Terminal',
          cwd: '/test',
          isActive: false,
          isRunning: true,
        },
      ]

      wrapper = mount(TerminalPanel)
      await nextTick()

      expect(mockTerminalManager.createTerminal).not.toHaveBeenCalled()
    })

    it('should handle terminal creation promise on mount', async () => {
      mockTerminalManager.terminals.value = []
      mockSystemTerminals.activeTerminal.value = 'system'

      const mockTerminal = {
        id: 'auto-terminal',
        name: 'Auto Terminal',
        cwd: '/home',
        isActive: true,
      }

      mockTerminalManager.createTerminal.mockResolvedValueOnce(mockTerminal)

      wrapper = mount(TerminalPanel)
      await nextTick()

      // Wait for the promise to resolve
      await new Promise((resolve) => setTimeout(resolve, 0))

      expect(mockTerminalManager.createTerminal).toHaveBeenCalled()
      expect(mockTerminalManager.setActiveTerminal).toHaveBeenCalledWith(null)
    })

    it('should clear terminal refs on unmount', () => {
      wrapper = mount(TerminalPanel)
      const vm = wrapper.vm as TerminalPanelInstance

      // Add some refs
      vm.setTerminalRef('terminal-1', { focus: vi.fn() })
      vm.setTerminalRef('terminal-2', { focus: vi.fn() })

      expect(vm.terminalRefs.size).toBe(2)

      wrapper.unmount()

      expect(vm.terminalRefs.size).toBe(0)
    })
  })

  describe('⚡ Error Handling', () => {
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

    it('should handle errors in terminal creation gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const vm = wrapper.vm as TerminalPanelInstance
      const error = new Error('Terminal creation failed')

      mockTerminalManager.createTerminal.mockRejectedValueOnce(error)

      await expect(vm.createTerminal()).rejects.toThrow(
        'Terminal creation failed'
      )
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to create terminal:',
        error
      )

      consoleSpy.mockRestore()
    })
  })
})
