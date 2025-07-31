import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick, ref } from 'vue'
import App from './App.vue'

// Mock composables
vi.mock('./composables/useTheme', () => ({
  useTheme: () => ({
    platform: ref('darwin'),
    isDark: ref(false),
    themeMode: ref('auto'),
    setTheme: vi.fn(),
    toggleTheme: vi.fn(),
    syncThemeWithElectron: vi.fn(),
    setPlatform: vi.fn(),
  }),
}))

vi.mock('./composables/useBreadcrumbContext', () => ({
  useBreadcrumbContext: () => ({
    getContextForMode: vi.fn(),
    simulateFileChange: vi.fn(),
  }),
}))

vi.mock('./composables/useChatSidebar', () => ({
  useChatSidebar: () => ({
    width: ref(350),
    isResizing: ref(false),
    currentMode: ref('generative'),
    widthPx: ref('350px'),
    resizeCursor: ref('col-resize'),
    shouldShowResizeHandle: ref(false), // false in generative mode
    isGenerativeMode: ref(true),
    startResize: vi.fn(),
    setMode: vi.fn(),
    resetWidth: vi.fn(),
    MIN_WIDTH: 250,
    MAX_WIDTH: 600,
    DEFAULT_WIDTH: 400,
  }),
}))

vi.mock('./composables/useSidebarResize', () => ({
  useSidebarResize: () => ({
    sidebarWidth: ref(270),
    sidebarWidthPx: ref('270px'),
    isResizing: ref(false),
    startResize: vi.fn(),
    resizeCursor: ref('e-resize'),
  }),
}))

vi.mock('./composables/useWindowControls', () => ({
  useWindowControls: () => ({
    handleDoubleClick: vi.fn(),
    isMaximized: ref(false),
    isElectron: false,
    minimize: vi.fn(),
    maximize: vi.fn(),
    close: vi.fn(),
  }),
}))

describe('App.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should mount and render without errors', () => {
    const wrapper = mount(App)
    expect(wrapper.exists()).toBe(true)
  })

  it('should render UnifiedFrame component', () => {
    const wrapper = mount(App)
    const unifiedFrame = wrapper.findComponent({ name: 'UnifiedFrame' })
    expect(unifiedFrame.exists()).toBe(true)
  })

  it('should have default mode set to generative', () => {
    const wrapper = mount(App)
    const data = wrapper.vm
    expect(data.currentMode).toBe('generative')
  })

  it('should initialize with empty address value', () => {
    const wrapper = mount(App)
    const data = wrapper.vm
    expect(data.addressValue).toBe('')
  })

  it('should execute onMounted lifecycle hook', async () => {
    const wrapper = mount(App)
    await nextTick()

    // Component should be successfully mounted
    expect(wrapper.exists()).toBe(true)
    expect(wrapper.vm).toBeTruthy()
  })

  it('should handle mode changes', async () => {
    const wrapper = mount(App)

    // Test mode change handler
    wrapper.vm.handleModeChange('visual')
    await nextTick()

    expect(wrapper.vm.currentMode).toBe('visual')
  })

  it('should handle address changes', async () => {
    const wrapper = mount(App)

    // Test direct address value change
    wrapper.vm.addressValue = 'test-address'
    await nextTick()

    expect(wrapper.vm.addressValue).toBe('test-address')
  })

  it('should pass correct props to UnifiedFrame', () => {
    const wrapper = mount(App)
    const unifiedFrame = wrapper.findComponent({ name: 'UnifiedFrame' })

    expect(unifiedFrame.props('currentMode')).toBe('generative')
  })

  it('should render with correct initial state', () => {
    const wrapper = mount(App)

    expect(wrapper.vm.currentMode).toBe('generative')
    expect(wrapper.vm.addressValue).toBe('')
    expect(wrapper.exists()).toBe(true)
  })

  it('should test complete component functionality', async () => {
    const wrapper = mount(App)

    // Test all mode changes including timeline
    const modes: Array<'generative' | 'visual' | 'code' | 'timeline'> = [
      'visual',
      'code',
      'timeline',
      'generative',
    ]

    for (const mode of modes) {
      wrapper.vm.handleModeChange(mode)
      await nextTick()
      expect(wrapper.vm.currentMode).toBe(mode)
      expect(wrapper.vm.addressValue).toBe('') // Address should be cleared on mode change
    }
  })

  it('should handle command execution for all modes', () => {
    const wrapper = mount(App)
    const testCommand = 'test command'

    // Test command execution for each mode
    const modes: Array<'generative' | 'visual' | 'code' | 'timeline'> = [
      'generative',
      'visual',
      'code',
      'timeline',
    ]

    // Test that command execution doesn't throw errors
    for (const mode of modes) {
      expect(() => {
        wrapper.vm.handleExecuteCommand(testCommand, mode)
      }).not.toThrow()
    }

    // Verify address value is cleared after execution
    expect(wrapper.vm.addressValue).toBe('')
  })

  it('should handle play and stop button actions', () => {
    const wrapper = mount(App)

    // Test that play and stop buttons don't throw errors
    expect(() => {
      wrapper.vm.handlePlay()
    }).not.toThrow()

    expect(() => {
      wrapper.vm.handleStop()
    }).not.toThrow()
  })

  it('should handle GitHub link opening', () => {
    const wrapper = mount(App)
    const windowOpenSpy = vi
      .spyOn(window, 'open')
      .mockImplementation(() => null)

    // Mock window without electronAPI
    Object.defineProperty(window, 'electronAPI', {
      value: undefined,
      writable: true,
    })

    wrapper.vm.openGitHub()
    expect(windowOpenSpy).toHaveBeenCalledWith(
      'https://github.com/HatcherDX/dx-engine',
      '_blank'
    )

    windowOpenSpy.mockRestore()
  })

  it('should handle GitHub link in Electron environment', () => {
    const wrapper = mount(App)

    // Mock electronAPI
    const originalElectronAPI = (window as unknown as { electronAPI?: unknown })
      .electronAPI
    ;(window as unknown as { electronAPI: unknown }).electronAPI = {
      someMethod: vi.fn(),
    }

    // Test that openGitHub doesn't throw in Electron environment
    expect(() => {
      wrapper.vm.openGitHub()
    }).not.toThrow()

    // Restore original value
    ;(window as unknown as { electronAPI: unknown }).electronAPI =
      originalElectronAPI
  })
})
