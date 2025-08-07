import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { ref, computed } from 'vue'
import UnifiedFrame from './UnifiedFrame.vue'

// Mock child components
vi.mock('../atoms/BaseLogo.vue', () => ({
  default: {
    name: 'BaseLogo',
    template: '<div data-testid="base-logo"><slot /></div>',
    props: ['size', 'variant'],
  },
}))

vi.mock('../atoms/BaseButton.vue', () => ({
  default: {
    name: 'BaseButton',
    template:
      '<button data-testid="base-button" v-bind="$attrs"><slot /></button>',
    props: {
      variant: String,
      size: String,
      disabled: Boolean,
      ariaLabel: String,
    },
    emits: ['click'],
  },
}))

vi.mock('../atoms/BaseIcon.vue', () => ({
  default: {
    name: 'BaseIcon',
    template: '<span data-testid="base-icon"><slot /></span>',
    props: ['name', 'size'],
  },
}))

vi.mock('../molecules/WindowControls.vue', () => ({
  default: {
    name: 'WindowControls',
    template: '<div data-testid="window-controls"><slot /></div>',
    props: ['variant'],
  },
}))

vi.mock('../atoms/Sidebar.vue', () => ({
  default: {
    name: 'Sidebar',
    template: '<div data-testid="sidebar"><slot /></div>',
    props: {
      width: Number,
      isResizing: Boolean,
      resizeCursor: String,
      platform: String,
    },
    emits: ['start-resize', 'header-double-click'],
  },
}))

// Mock composables with proper Vue refs
const mockTheme = {
  isDark: ref(false),
  toggleTheme: vi.fn(),
  platform: ref('macos'),
}

const mockWindowControls = {
  handleDoubleClick: vi.fn(),
}

const mockSidebarResize = (() => {
  const sidebarWidth = ref(250)
  const sidebarWidthPx = computed((): string => sidebarWidth.value + 'px')
  const isResizing = ref(false)
  const startResize = vi.fn() as (...args: unknown[]) => void
  const resizeCursor = ref('col-resize')

  return {
    sidebarWidth,
    sidebarWidthPx,
    isResizing,
    startResize,
    resizeCursor,
  }
})()

const mockChatSidebar = {
  isGenerativeMode: ref(false),
  setMode: vi.fn(),
}

vi.mock('../../composables/useTheme', () => ({
  useTheme: () => ({
    isDark: mockTheme.isDark,
    toggleTheme: mockTheme.toggleTheme,
    platform: mockTheme.platform,
  }),
}))

vi.mock('../../composables/useWindowControls', () => ({
  useWindowControls: () => mockWindowControls,
}))

vi.mock('../../composables/useSidebarResize', () => ({
  useSidebarResize: () => ({
    sidebarWidth: mockSidebarResize.sidebarWidth,
    sidebarWidthPx: mockSidebarResize.sidebarWidthPx,
    isResizing: mockSidebarResize.isResizing,
    startResize: mockSidebarResize.startResize,
    resizeCursor: mockSidebarResize.resizeCursor,
  }),
}))

vi.mock('../../composables/useChatSidebar', () => ({
  useChatSidebar: () => ({
    isGenerativeMode: mockChatSidebar.isGenerativeMode,
    setMode: mockChatSidebar.setMode,
  }),
}))

Object.defineProperty(global, 'window', {
  value: {
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    innerWidth: 1200,
    innerHeight: 800,
    dispatchEvent: vi.fn(),
  },
  writable: true,
})

describe('UnifiedFrame', () => {
  let wrapper: VueWrapper<InstanceType<typeof UnifiedFrame>>

  beforeEach(() => {
    vi.clearAllMocks()
    mockTheme.isDark.value = false
    mockTheme.platform.value = 'macos'
    mockSidebarResize.sidebarWidth.value = 250
    mockSidebarResize.isResizing.value = false
    mockChatSidebar.isGenerativeMode.value = false
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
    vi.restoreAllMocks()
  })

  describe('Component Initialization', () => {
    it('should mount successfully with default props', () => {
      wrapper = mount(UnifiedFrame)

      expect(wrapper.exists()).toBe(true)
      expect(wrapper.find('.unified-frame').exists()).toBe(true)
    })

    it('should apply correct CSS classes based on props', () => {
      wrapper = mount(UnifiedFrame, {
        props: {
          variant: 'compact',
          currentMode: 'generative',
        },
      })

      const frame = wrapper.find('.unified-frame')
      expect(frame.classes()).toContain('platform-macos')
      expect(frame.classes()).toContain('variant-compact')
      expect(frame.classes()).toContain('mode-generative')
    })
  })

  describe('Platform-specific Rendering', () => {
    it('should render macOS layout correctly', () => {
      mockTheme.platform.value = 'macos'

      wrapper = mount(UnifiedFrame, {
        props: { showModeNavigation: true },
      })

      const headerLeft = wrapper.find('.header-left')
      expect(headerLeft.find('[data-testid="base-logo"]').exists()).toBe(true)

      const headerRight = wrapper.find('.header-right')
      expect(headerRight.find('.mode-navigation').exists()).toBe(true)
    })

    it('should render Windows layout correctly', () => {
      mockTheme.platform.value = 'windows'

      wrapper = mount(UnifiedFrame, {
        props: { showModeNavigation: true },
      })

      const headerLeft = wrapper.find('.header-left')
      expect(headerLeft.find('.mode-navigation').exists()).toBe(true)

      const headerRight = wrapper.find('.header-right')
      expect(headerRight.find('[data-testid="window-controls"]').exists()).toBe(
        true
      )
    })
  })

  describe('Mode-specific Behavior', () => {
    it('should show terminal panel in code mode', () => {
      wrapper = mount(UnifiedFrame, {
        props: { currentMode: 'code' },
      })

      expect(wrapper.find('.frame-terminal').exists()).toBe(true)
    })

    it('should hide terminal panel in non-code modes', () => {
      wrapper = mount(UnifiedFrame, {
        props: { currentMode: 'generative' },
      })

      expect(wrapper.find('.frame-terminal').exists()).toBe(false)
    })

    it('should apply generative mode layout', () => {
      mockChatSidebar.isGenerativeMode.value = true

      wrapper = mount(UnifiedFrame, {
        props: { currentMode: 'generative' },
      })

      const frame = wrapper.find('.unified-frame')
      expect(frame.classes()).toContain('mode-generative')

      const chatPanel = wrapper.find('.frame-chat')
      expect(chatPanel.classes()).toContain('chat-generative')
    })
  })

  describe('Sidebar Management', () => {
    beforeEach(() => {
      wrapper = mount(UnifiedFrame)
    })

    it('should render sidebar with correct props', () => {
      const sidebar = wrapper.findComponent({ name: 'Sidebar' })

      expect(sidebar.props('width')).toBe(250)
      expect(sidebar.props('isResizing')).toBe(false)
      expect(sidebar.props('resizeCursor')).toBe('col-resize')
      expect(sidebar.props('platform')).toBe('macos')
    })

    it('should handle sidebar resize start', async () => {
      const sidebar = wrapper.findComponent({ name: 'Sidebar' })
      const mockEvent = new MouseEvent('mousedown')

      await sidebar.vm.$emit('start-resize', mockEvent)

      expect(mockSidebarResize.startResize).toHaveBeenCalledWith(mockEvent)
    })

    it('should handle sidebar double click', async () => {
      const sidebar = wrapper.findComponent({ name: 'Sidebar' })

      await sidebar.vm.$emit('header-double-click')

      expect(mockWindowControls.handleDoubleClick).toHaveBeenCalled()
    })
  })

  describe('Header Management', () => {
    it('should handle header double click', async () => {
      wrapper = mount(UnifiedFrame)

      // Simulate header double click by calling the method directly
      const vm = wrapper.vm as { handleHeaderDoubleClick?: () => Promise<void> }
      if (vm.handleHeaderDoubleClick) {
        await vm.handleHeaderDoubleClick()
      }

      expect(mockWindowControls.handleDoubleClick).toHaveBeenCalled()
    })

    it('should render navigation slot when showModeNavigation is true', () => {
      wrapper = mount(UnifiedFrame, {
        props: { showModeNavigation: true },
        slots: {
          navigation: '<div data-testid="navigation-content">Navigation</div>',
        },
      })

      expect(wrapper.find('[data-testid="navigation-content"]').exists()).toBe(
        true
      )
    })

    it('should hide navigation when showModeNavigation is false', () => {
      wrapper = mount(UnifiedFrame, {
        props: { showModeNavigation: false },
        slots: {
          navigation: '<div data-testid="navigation-content">Navigation</div>',
        },
      })

      expect(wrapper.find('.mode-navigation').exists()).toBe(false)
    })
  })

  describe('Theme Management', () => {
    beforeEach(() => {
      wrapper = mount(UnifiedFrame, {
        slots: {
          footer: '<div data-testid="footer-content">Footer</div>',
        },
      })
    })

    it('should render theme toggle button in footer', () => {
      const themeButton = wrapper.find('[data-testid="base-button"]')
      expect(themeButton.exists()).toBe(true)
    })

    it('should toggle theme on button click', async () => {
      // Simulate theme toggle by calling the method directly
      const vm = wrapper.vm as { toggleTheme?: () => Promise<void> }
      if (vm.toggleTheme) {
        await vm.toggleTheme()
      }

      expect(mockTheme.toggleTheme).toHaveBeenCalled()
    })

    it('should have correct aria-label for theme toggle', () => {
      const themeButton = wrapper.findComponent({ name: 'BaseButton' })
      const ariaLabel = themeButton.props('ariaLabel')
      expect(ariaLabel).toBeTruthy()
      expect(ariaLabel).toContain('Switch to')
    })
  })

  describe('Slot Management', () => {
    it('should render main content slot', () => {
      wrapper = mount(UnifiedFrame, {
        slots: {
          default: '<div data-testid="main-content">Main Content</div>',
        },
      })

      expect(wrapper.find('[data-testid="main-content"]').exists()).toBe(true)
    })

    it('should render terminal panel slot when in code mode', () => {
      wrapper = mount(UnifiedFrame, {
        props: { currentMode: 'code' },
        slots: {
          'terminal-panel':
            '<div data-testid="terminal-panel-content">Terminal</div>',
        },
      })

      expect(
        wrapper.find('[data-testid="terminal-panel-content"]').exists()
      ).toBe(true)
    })

    it('should render chat panel slot', () => {
      wrapper = mount(UnifiedFrame, {
        slots: {
          'chat-panel': '<div data-testid="chat-panel-content">Chat</div>',
        },
      })

      expect(wrapper.find('[data-testid="chat-panel-content"]').exists()).toBe(
        true
      )
    })
  })

  describe('Mode Change Handling', () => {
    it('should emit chatModeChange when mode changes', async () => {
      wrapper = mount(UnifiedFrame, {
        props: { currentMode: 'generative' },
      })

      await wrapper.setProps({ currentMode: 'code' })

      expect(mockChatSidebar.setMode).toHaveBeenCalledWith('code')
      expect(wrapper.emitted('chatModeChange')).toBeTruthy()
      // The component emits generative first on mount, then code when prop changes
      const chatModeEvents = wrapper.emitted('chatModeChange')
      expect(chatModeEvents?.[1]).toEqual(['code'])
    })
  })

  describe('Variant Handling', () => {
    it('should apply compact variant styles', () => {
      wrapper = mount(UnifiedFrame, {
        props: { variant: 'compact' },
      })

      const frame = wrapper.find('.unified-frame')
      expect(frame.classes()).toContain('variant-compact')
    })

    it('should apply fullscreen variant styles', () => {
      wrapper = mount(UnifiedFrame, {
        props: { variant: 'fullscreen' },
      })

      const frame = wrapper.find('.unified-frame')
      expect(frame.classes()).toContain('variant-fullscreen')
    })
  })

  describe('Accessibility', () => {
    it('should have proper semantic structure', () => {
      wrapper = mount(UnifiedFrame)

      expect(wrapper.find('header').exists()).toBe(true)
      expect(wrapper.find('main').exists()).toBe(true)
    })

    it('should have accessible theme toggle button', () => {
      wrapper = mount(UnifiedFrame, {
        slots: {
          footer: '<div>Footer</div>',
        },
      })

      const themeButton = wrapper.findComponent({ name: 'BaseButton' })
      expect(themeButton.props('ariaLabel')).toBeTruthy()
    })
  })
})
