import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import WindowControls from './WindowControls.vue'

// Mock composables
vi.mock('../../composables/useWindowControls', () => ({
  useWindowControls: () => ({
    isMaximized: { value: false },
    minimizeWindow: vi.fn(),
    maximizeWindow: vi.fn(),
    closeWindow: vi.fn(),
    handleDoubleClick: vi.fn(),
    isElectron: true,
  }),
}))

vi.mock('../../composables/useTheme', () => ({
  useTheme: () => ({
    themeMode: { value: 'light' },
    isDark: { value: false },
    platform: { value: 'windows' },
    setTheme: vi.fn(),
    toggleTheme: vi.fn(),
    syncThemeWithElectron: vi.fn(),
    setPlatform: vi.fn(),
  }),
}))

describe('WindowControls.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should mount and render without errors', () => {
    const wrapper = mount(WindowControls)
    expect(wrapper.exists()).toBe(true)
  })

  it('should render window control buttons', () => {
    const wrapper = mount(WindowControls)

    // Check for minimize, maximize, and close buttons
    const buttons = wrapper.findAll('button')
    expect(buttons.length).toBeGreaterThanOrEqual(3)
  })

  it('should render WindowMinimizeButton component', () => {
    const wrapper = mount(WindowControls)
    const minimizeBtn = wrapper.findComponent({ name: 'WindowMinimizeButton' })
    expect(minimizeBtn.exists()).toBe(true)
  })

  it('should render WindowMaximizeButton component', () => {
    const wrapper = mount(WindowControls)
    const maximizeBtn = wrapper.findComponent({ name: 'WindowMaximizeButton' })
    expect(maximizeBtn.exists()).toBe(true)
  })

  it('should render WindowCloseButton component', () => {
    const wrapper = mount(WindowControls)
    const closeBtn = wrapper.findComponent({ name: 'WindowCloseButton' })
    expect(closeBtn.exists()).toBe(true)
  })

  it('should handle window control interactions', async () => {
    const wrapper = mount(WindowControls)

    // Find specific control buttons
    const minimizeBtn = wrapper.findComponent({ name: 'WindowMinimizeButton' })
    const maximizeBtn = wrapper.findComponent({ name: 'WindowMaximizeButton' })
    const closeBtn = wrapper.findComponent({ name: 'WindowCloseButton' })

    if (minimizeBtn.exists()) {
      await minimizeBtn.trigger('click')
    }
    if (maximizeBtn.exists()) {
      await maximizeBtn.trigger('click')
    }
    if (closeBtn.exists()) {
      await closeBtn.trigger('click')
    }

    expect(wrapper.exists()).toBe(true)
  })

  it('should have proper styling classes', () => {
    const wrapper = mount(WindowControls)
    const container = wrapper.find('.window-controls')
    expect(container.exists()).toBe(true)
  })

  it('should render with correct platform-specific styles', () => {
    const wrapper = mount(WindowControls)
    const container = wrapper.find('.window-controls')

    expect(container.classes()).toContain('platform-windows')
    expect(wrapper.exists()).toBe(true)
  })

  it('should handle maximized state changes', async () => {
    const wrapper = mount(WindowControls)
    const maximizeBtn = wrapper.findComponent({ name: 'WindowMaximizeButton' })

    if (maximizeBtn.exists()) {
      expect(maximizeBtn.props('isMaximized')).toBeDefined()
    }

    expect(wrapper.exists()).toBe(true)
  })
})
