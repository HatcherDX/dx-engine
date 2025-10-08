import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, VueWrapper, flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'

/* eslint-env browser */

// Enable DOM environment for all tests
/**
 * @vitest-environment jsdom
 */

// Mock xterm CSS import before importing component
vi.mock('xterm/css/xterm.css', () => ({}))

// Create mock terminal instance factory
const createMockTerminalInstance = () => ({
  terminal: {
    onData: vi.fn(),
    onResize: vi.fn(),
    onTitleChange: vi.fn(),
    focus: vi.fn(),
    blur: vi.fn(),
    options: {},
    textarea: document.createElement('textarea'),
    element: document.createElement('div'),
  },
  manager: {
    write: vi.fn(),
    clear: vi.fn(),
  },
  resize: {
    fit: vi.fn(),
  },
  addons: {
    getLoadedAddons: vi.fn(() => []),
  },
  focus: vi.fn(),
  dispose: vi.fn(),
})

// Store mock instance at module level
let mockTerminalInstance = createMockTerminalInstance()

// Mock the terminal-system browser module
vi.mock('@hatcherdx/terminal-system/browser', () => ({
  XTerminalFactory: {
    createTerminal: vi.fn(() => Promise.resolve(mockTerminalInstance)),
  },
  XTermManager: vi.fn(),
  TerminalBackpressureManager: vi.fn(),
  TerminalAddonManager: vi.fn(),
  AddonType: {},
  WebGLTerminalRenderer: vi.fn(),
  TerminalResizeManager: vi.fn(),
  TerminalFocusManager: vi.fn(),
  createHatcherTerminal: vi.fn(),
}))

// Now import the component after mocks are set up
import TerminalView from './TerminalView.vue'

// Type definition for TerminalView component instance
interface TerminalViewInstance extends InstanceType<typeof TerminalView> {
  terminal: object | null
  focus: () => void
  fit: () => void
  clear: () => void
  write: (data: string) => void
}

describe('TerminalView', () => {
  let wrapper: VueWrapper<TerminalViewInstance>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Mock electronAPI requires flexible typing for tests
  let mockElectronAPI: any

  beforeEach(() => {
    vi.clearAllMocks()

    // Reset mock terminal instance
    mockTerminalInstance = createMockTerminalInstance()

    // Setup window mocks
    mockElectronAPI = {
      invoke: vi.fn().mockResolvedValue({ success: true }),
      onTerminalData: vi.fn(),
      onTerminalExit: vi.fn(),
      sendTerminalInput: vi.fn(),
      sendTerminalResize: vi.fn(),
    }

    // Mock window properties
    Object.defineProperty(window, 'electronAPI', {
      value: mockElectronAPI,
      writable: true,
      configurable: true,
    })

    Object.defineProperty(window, 'matchMedia', {
      value: vi.fn(() => ({
        matches: false,
        media: '',
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
      writable: true,
      configurable: true,
    })

    // Mock ResizeObserver
    global.ResizeObserver = vi.fn().mockImplementation(() => ({
      observe: vi.fn(),
      disconnect: vi.fn(),
      unobserve: vi.fn(),
    }))
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
    vi.clearAllTimers()
    vi.restoreAllMocks()
  })

  describe('Component Initialization', () => {
    it('should mount successfully with default props', async () => {
      wrapper = mount(TerminalView)
      await nextTick()

      expect(wrapper.exists()).toBe(true)
      expect(wrapper.find('.terminal-view').exists()).toBe(true)
    })

    it('should apply theme data attribute', async () => {
      wrapper = mount(TerminalView, {
        props: { theme: 'light' },
      })
      await nextTick()

      expect(wrapper.find('[data-theme="light"]').exists()).toBe(true)
    })

    it('should render terminal container', async () => {
      wrapper = mount(TerminalView)
      await nextTick()

      expect(wrapper.find('.terminal-view__container').exists()).toBe(true)
    })

    it('should initialize terminal on mount', async () => {
      const { XTerminalFactory } = await vi.importMock(
        '@hatcherdx/terminal-system/browser'
      )

      wrapper = mount(TerminalView, {
        props: { terminalId: 'test-id' },
      })

      await flushPromises()
      await nextTick()

      expect(XTerminalFactory.createTerminal).toHaveBeenCalled()
    })
  })

  describe('Props Handling', () => {
    it('should accept fontSize prop', async () => {
      wrapper = mount(TerminalView, {
        props: { fontSize: 16 },
      })
      await nextTick()

      expect(wrapper.props('fontSize')).toBe(16)
    })

    it('should accept fontFamily prop', async () => {
      wrapper = mount(TerminalView, {
        props: { fontFamily: 'Courier' },
      })
      await nextTick()

      expect(wrapper.props('fontFamily')).toBe('Courier')
    })

    it('should accept terminalId prop', async () => {
      wrapper = mount(TerminalView, {
        props: { terminalId: 'test-123' },
      })
      await nextTick()

      expect(wrapper.props('terminalId')).toBe('test-123')
    })

    it('should handle theme changes', async () => {
      wrapper = mount(TerminalView, {
        props: { theme: 'dark' },
      })
      await nextTick()

      await wrapper.setProps({ theme: 'light' })
      await nextTick()

      expect(wrapper.find('[data-theme="light"]').exists()).toBe(true)
    })
  })

  describe('Exposed Methods', () => {
    beforeEach(async () => {
      wrapper = mount(TerminalView)
      await flushPromises()
      await nextTick()
    })

    it('should expose focus method', () => {
      expect(typeof wrapper.vm.focus).toBe('function')
      wrapper.vm.focus()
      expect(mockTerminalInstance.terminal.focus).toHaveBeenCalled()
    })

    it('should expose fit method', () => {
      expect(typeof wrapper.vm.fit).toBe('function')
      wrapper.vm.fit()
      expect(mockTerminalInstance.resize.fit).toHaveBeenCalled()
    })

    it('should expose clear method', () => {
      expect(typeof wrapper.vm.clear).toBe('function')
      wrapper.vm.clear()
      expect(mockTerminalInstance.manager.clear).toHaveBeenCalled()
    })

    it('should expose write method', () => {
      expect(typeof wrapper.vm.write).toBe('function')
      wrapper.vm.write('test data')
      expect(mockTerminalInstance.manager.write).toHaveBeenCalledWith(
        'test data'
      )
    })

    it('should expose terminal getter', () => {
      expect(wrapper.vm.terminal).toBeDefined()
      expect(wrapper.vm.terminal).toStrictEqual(mockTerminalInstance.terminal)
    })
  })

  describe('Event Emissions', () => {
    it('should emit data event when terminal sends data', async () => {
      wrapper = mount(TerminalView, {
        props: { terminalId: 'test-terminal' },
      })

      await flushPromises()
      await nextTick()

      // Simulate terminal data event
      const onDataCallback =
        mockTerminalInstance.terminal.onData.mock.calls[0]?.[0]
      if (onDataCallback) {
        onDataCallback('test input')
      }

      await nextTick()

      expect(wrapper.emitted('data')).toBeTruthy()
      const dataEvents = wrapper.emitted('data')
      expect(dataEvents?.[0]).toEqual(['test-terminal', 'test input'])
    })

    it('should emit resize event when terminal resizes', async () => {
      wrapper = mount(TerminalView, {
        props: { terminalId: 'test-terminal' },
      })

      await flushPromises()
      await nextTick()

      // Simulate terminal resize event
      const onResizeCallback =
        mockTerminalInstance.terminal.onResize.mock.calls[0]?.[0]
      if (onResizeCallback) {
        onResizeCallback({ cols: 80, rows: 24 })
      }

      await nextTick()

      expect(wrapper.emitted('resize')).toBeTruthy()
      const resizeEvents = wrapper.emitted('resize')
      expect(resizeEvents?.[0]).toEqual(['test-terminal', 80, 24])
    })

    it('should emit ready event after initialization', async () => {
      wrapper = mount(TerminalView, {
        props: { terminalId: 'test-terminal' },
      })

      await flushPromises()
      await nextTick()

      expect(wrapper.emitted('ready')).toBeTruthy()
      const readyEvents = wrapper.emitted('ready')
      expect(readyEvents?.[0]).toEqual(['test-terminal'])
    })
  })

  describe('IPC Communication', () => {
    it('should register terminal data handler', async () => {
      wrapper = mount(TerminalView, {
        props: { terminalId: 'test-terminal' },
      })

      await flushPromises()
      await nextTick()

      // Check that onTerminalData was called to register handler
      expect(mockElectronAPI.onTerminalData).toHaveBeenCalled()
    })

    it('should handle terminal data from IPC', async () => {
      wrapper = mount(TerminalView, {
        props: { terminalId: 'test-terminal' },
      })

      await flushPromises()
      await nextTick()

      // Get the registered handler
      const handler = mockElectronAPI.onTerminalData.mock.calls[0]?.[0]

      // Simulate IPC data event
      if (handler) {
        handler({ id: 'test-terminal', data: 'terminal output' })
      }

      await nextTick()

      expect(mockTerminalInstance.manager.write).toHaveBeenCalledWith(
        'terminal output'
      )
    })

    it('should ignore data for other terminals', async () => {
      wrapper = mount(TerminalView, {
        props: { terminalId: 'test-terminal' },
      })

      await flushPromises()
      await nextTick()

      const writeCallsBefore =
        mockTerminalInstance.manager.write.mock.calls.length

      // Get the registered handler
      const handler = mockElectronAPI.onTerminalData.mock.calls[0]?.[0]

      // Simulate IPC data event for different terminal
      if (handler) {
        handler({ id: 'other-terminal', data: 'other output' })
      }

      await nextTick()

      const writeCallsAfter =
        mockTerminalInstance.manager.write.mock.calls.length
      expect(writeCallsAfter).toBe(writeCallsBefore)
    })

    it('should register terminal exit handler', async () => {
      wrapper = mount(TerminalView, {
        props: { terminalId: 'test-terminal' },
      })

      await flushPromises()
      await nextTick()

      // Check that onTerminalExit was called to register handler
      expect(mockElectronAPI.onTerminalExit).toHaveBeenCalled()
    })

    it('should handle terminal exit from IPC', async () => {
      wrapper = mount(TerminalView, {
        props: { terminalId: 'test-terminal' },
      })

      await flushPromises()
      await nextTick()

      // Get the registered handler
      const handler = mockElectronAPI.onTerminalExit.mock.calls[0]?.[0]

      // Simulate IPC exit event
      if (handler) {
        handler({ id: 'test-terminal', exitCode: 0 })
      }

      await nextTick()

      expect(wrapper.emitted('exit')).toBeTruthy()
      const exitEvents = wrapper.emitted('exit')
      expect(exitEvents?.[0]).toEqual(['test-terminal', 0])
    })
  })

  describe('Error Handling', () => {
    it('should handle missing electronAPI gracefully', async () => {
      const originalElectronAPI = window.electronAPI
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test requires flexible typing for validation testing
      delete (window as any).electronAPI

      expect(() => {
        wrapper = mount(TerminalView)
      }).not.toThrow()

      window.electronAPI = originalElectronAPI
    })

    it('should handle terminal creation failure', async () => {
      const { XTerminalFactory } = await vi.importMock(
        '@hatcherdx/terminal-system/browser'
      )
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Mock function type assertion required for test setup
      ;(XTerminalFactory.createTerminal as any).mockRejectedValueOnce(
        new Error('Failed to create')
      )

      // Should not throw
      wrapper = mount(TerminalView)
      await flushPromises()

      expect(wrapper.exists()).toBe(true)
    })
  })

  describe('Cleanup', () => {
    it('should dispose terminal on unmount', async () => {
      wrapper = mount(TerminalView)

      await flushPromises()
      await nextTick()

      wrapper.unmount()

      expect(mockTerminalInstance.dispose).toHaveBeenCalled()
    })

    it('should cleanup on unmount when electronAPI exists', async () => {
      wrapper = mount(TerminalView, {
        props: { terminalId: 'test-terminal' },
      })

      await flushPromises()
      await nextTick()

      wrapper.unmount()

      // Should attempt to close terminal via IPC
      expect(mockElectronAPI.invoke).toHaveBeenCalledWith(
        'terminal-close',
        'test-terminal'
      )
    })
  })

  describe('Loading State', () => {
    it('should show loading indicator initially', () => {
      wrapper = mount(TerminalView)

      expect(wrapper.find('.terminal-loading').exists()).toBe(true)
    })

    it('should hide loading indicator after terminal is ready', async () => {
      wrapper = mount(TerminalView)

      await flushPromises()
      await nextTick()

      // Wait for loading to complete
      await new Promise((resolve) => setTimeout(resolve, 100))
      await nextTick()

      expect(wrapper.find('.terminal-loading').exists()).toBe(false)
    })
  })

  describe('Focus Management', () => {
    it('should show focus overlay when not focused', async () => {
      wrapper = mount(TerminalView)

      await flushPromises()
      await nextTick()

      // Wait for loading to complete
      await new Promise((resolve) => setTimeout(resolve, 100))
      await nextTick()

      const focusOverlay = wrapper.find('.terminal-focus-overlay')
      expect(focusOverlay.exists()).toBe(true)
    })

    it('should handle focus overlay click', async () => {
      wrapper = mount(TerminalView)

      await flushPromises()
      await nextTick()

      // Wait for loading to complete
      await new Promise((resolve) => setTimeout(resolve, 100))
      await nextTick()

      const focusOverlay = wrapper.find('.terminal-focus-overlay')
      if (focusOverlay.exists()) {
        await focusOverlay.trigger('click')
        expect(mockTerminalInstance.terminal.focus).toHaveBeenCalled()
      }
    })
  })

  describe('Resize Handling', () => {
    it('should set up resize observer', async () => {
      // Clear mocks to ensure clean state
      vi.clearAllMocks()

      wrapper = mount(TerminalView)

      // Wait for async initialization to complete
      await flushPromises()
      await nextTick()
      await flushPromises()

      // Verify ResizeObserver was instantiated
      expect(global.ResizeObserver).toHaveBeenCalled()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test requires flexible typing for validation testing
      const resizeObserverInstance = (global.ResizeObserver as any).mock
        .results[0].value
      expect(resizeObserverInstance.observe).toHaveBeenCalled()
    })

    it('should handle container resize', async () => {
      // Clear mocks to ensure clean state
      vi.clearAllMocks()

      wrapper = mount(TerminalView)

      // Wait for async initialization to complete
      await flushPromises()
      await nextTick()
      await flushPromises()

      // Verify ResizeObserver was called before trying to access it
      expect(global.ResizeObserver).toHaveBeenCalled()

      // Get the resize observer callback
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test requires flexible typing for validation testing
      const resizeObserverMock = global.ResizeObserver as any
      expect(resizeObserverMock.mock.calls.length).toBeGreaterThan(0)

      const resizeCallback = resizeObserverMock.mock.calls[0][0]

      // Trigger resize
      resizeCallback()

      // Wait for debounce
      await new Promise((resolve) => setTimeout(resolve, 150))
      await nextTick()

      expect(mockTerminalInstance.resize.fit).toHaveBeenCalled()
    })
  })

  describe('Backend Connection', () => {
    it('should connect to backend when electronAPI is available', async () => {
      // Clear mocks to ensure clean state
      vi.clearAllMocks()

      wrapper = mount(TerminalView, {
        props: {
          terminalId: 'test-terminal',
          cols: 100,
          rows: 30,
        },
      })

      // Wait for async initialization and backend connection to complete
      await flushPromises()
      await nextTick()
      await flushPromises()

      expect(mockElectronAPI.invoke).toHaveBeenCalledWith('terminal-create', {
        name: 'test-terminal',
        cols: 100,
        rows: 30,
      })
    })

    it('should handle backend connection failure', async () => {
      mockElectronAPI.invoke.mockRejectedValueOnce(
        new Error('Connection failed')
      )

      // Should not throw
      wrapper = mount(TerminalView, {
        props: { terminalId: 'test-terminal' },
      })

      await flushPromises()

      expect(wrapper.exists()).toBe(true)
    })
  })

  describe('Props Watchers', () => {
    beforeEach(async () => {
      wrapper = mount(TerminalView)
      await flushPromises()
      await nextTick()
    })

    it('should update fontSize when prop changes', async () => {
      await wrapper.setProps({ fontSize: 18 })
      await nextTick()

      expect(mockTerminalInstance.terminal.options.fontSize).toBe(18)
      expect(mockTerminalInstance.resize.fit).toHaveBeenCalled()
    })

    it('should update fontFamily when prop changes', async () => {
      await wrapper.setProps({ fontFamily: 'Monaco' })
      await nextTick()

      expect(mockTerminalInstance.terminal.options.fontFamily).toBe('Monaco')
      expect(mockTerminalInstance.resize.fit).toHaveBeenCalled()
    })

    it('should update theme when prop changes', async () => {
      await wrapper.setProps({ theme: 'light' })
      await nextTick()

      expect(mockTerminalInstance.terminal.options.theme).toBeDefined()
    })

    it('should update cursorBlink when prop changes', async () => {
      await wrapper.setProps({ cursorBlink: false })
      await nextTick()

      expect(mockTerminalInstance.terminal.options.cursorBlink).toBe(false)
    })

    it('should update cursorStyle when prop changes', async () => {
      await wrapper.setProps({ cursorStyle: 'bar' })
      await nextTick()

      expect(mockTerminalInstance.terminal.options.cursorStyle).toBe('bar')
    })
  })
})
