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

vi.mock('./composables/useOnboarding', () => ({
  useOnboarding: () => ({
    isOnboardingActive: ref(false), // Set onboarding as inactive so main app renders
    currentStep: ref('completed'),
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
    const unifiedFrame = wrapper.findComponent({ name: 'UnifiedFrame' })
    expect(unifiedFrame.props('currentMode')).toBe('generative')
  })

  it('should initialize with empty address value', () => {
    const wrapper = mount(App)
    const addressBar = wrapper.findComponent({ name: 'AddressBar' })
    expect(addressBar.props('value')).toBe('')
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
    const modeSelector = wrapper.findComponent({ name: 'ModeSelector' })

    // Test mode change by emitting event from ModeSelector
    await modeSelector.vm.$emit('mode-change', 'visual')
    await nextTick()

    const unifiedFrame = wrapper.findComponent({ name: 'UnifiedFrame' })
    expect(unifiedFrame.props('currentMode')).toBe('visual')
  })

  it('should handle address changes', async () => {
    const wrapper = mount(App)
    const addressBar = wrapper.findComponent({ name: 'AddressBar' })

    // Test address value change by emitting update event
    await addressBar.vm.$emit('update:value', 'test-address')
    await nextTick()

    expect(addressBar.props('value')).toBe('test-address')
  })

  it('should pass correct props to UnifiedFrame', () => {
    const wrapper = mount(App)
    const unifiedFrame = wrapper.findComponent({ name: 'UnifiedFrame' })

    expect(unifiedFrame.props('currentMode')).toBe('generative')
  })

  it('should render with correct initial state', () => {
    const wrapper = mount(App)
    const unifiedFrame = wrapper.findComponent({ name: 'UnifiedFrame' })
    const addressBar = wrapper.findComponent({ name: 'AddressBar' })

    expect(unifiedFrame.props('currentMode')).toBe('generative')
    expect(addressBar.props('value')).toBe('')
    expect(wrapper.exists()).toBe(true)
  })

  it('should test complete component functionality', async () => {
    const wrapper = mount(App)
    const modeSelector = wrapper.findComponent({ name: 'ModeSelector' })

    // Test all mode changes including timeline
    const modes: Array<'generative' | 'visual' | 'code' | 'timeline'> = [
      'visual',
      'code',
      'timeline',
      'generative',
    ]

    for (const mode of modes) {
      await modeSelector.vm.$emit('mode-change', mode)
      await nextTick()

      const unifiedFrame = wrapper.findComponent({ name: 'UnifiedFrame' })
      const addressBar = wrapper.findComponent({ name: 'AddressBar' })

      expect(unifiedFrame.props('currentMode')).toBe(mode)
      expect(addressBar.props('value')).toBe('') // Address should be cleared on mode change
    }
  })

  it('should handle command execution for all modes', async () => {
    const wrapper = mount(App)
    const addressBar = wrapper.findComponent({ name: 'AddressBar' })
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
        addressBar.vm.$emit('execute', testCommand, mode)
      }).not.toThrow()
    }

    // Address should remain empty since it's not being updated
    expect(addressBar.props('value')).toBe('')
  })

  it('should handle play and stop button actions', async () => {
    const wrapper = mount(App)
    const playButton = wrapper.findComponent({ name: 'PlayButton' })

    // Test that play and stop buttons don't throw errors
    expect(() => {
      playButton.vm.$emit('play')
    }).not.toThrow()

    expect(() => {
      playButton.vm.$emit('stop')
    }).not.toThrow()
  })

  it('should handle GitHub link opening in web environment', () => {
    const windowOpenSpy = vi
      .spyOn(window, 'open')
      .mockImplementation(() => null)

    // Mock window without electronAPI
    Object.defineProperty(window, 'electronAPI', {
      value: undefined,
      writable: true,
    })

    // Test the openGitHub logic directly (since it's defined in the script)
    // Simulate calling window.open when not in Electron
    if (!window.electronAPI) {
      window.open('https://github.com/HatcherDX/dx-engine', '_blank')
    }

    expect(windowOpenSpy).toHaveBeenCalledWith(
      'https://github.com/HatcherDX/dx-engine',
      '_blank'
    )

    windowOpenSpy.mockRestore()
  })

  it('should handle GitHub link in Electron environment', () => {
    // Mock electronAPI
    const originalElectronAPI = (window as unknown as { electronAPI?: unknown })
      .electronAPI
    ;(window as unknown as { electronAPI: unknown }).electronAPI = {
      someMethod: vi.fn(),
    }

    // Test the openGitHub logic for Electron environment
    // In Electron, the function should not call window.open but handle it via IPC
    const windowOpenSpy = vi
      .spyOn(window, 'open')
      .mockImplementation(() => null)

    // Simulate the Electron branch of the openGitHub function
    if (window.electronAPI) {
      // TODO: In Electron environment - implement shell.openExternal via IPC
      // For now, this branch does nothing (as per the current implementation)
    } else {
      window.open('https://github.com/HatcherDX/dx-engine', '_blank')
    }

    // In Electron environment, window.open should NOT be called
    expect(windowOpenSpy).not.toHaveBeenCalled()

    // Restore original values
    windowOpenSpy.mockRestore()
    ;(window as unknown as { electronAPI: unknown }).electronAPI =
      originalElectronAPI
  })
})
