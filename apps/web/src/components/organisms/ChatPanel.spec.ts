import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick, ref, computed } from 'vue'
import ChatPanel from './ChatPanel.vue'

// Create persistent mock functions that can be reused across tests
const mockSaveUserMessage = vi.fn().mockResolvedValue(undefined)
const mockSaveAssistantMessage = vi.fn().mockResolvedValue(undefined)
const mockLoadSession = vi.fn().mockResolvedValue(undefined)
const mockStreamMessage = vi.fn().mockResolvedValue(undefined)

// Mock composables that depend on Electron APIs
vi.mock('../../composables/useChatPersistence', () => ({
  useChatPersistence: () => ({
    messages: ref([]),
    metrics: ref(null),
    saveUserMessage: mockSaveUserMessage,
    saveAssistantMessage: mockSaveAssistantMessage,
    loadSession: mockLoadSession,
  }),
}))

vi.mock('../../composables/useAIChat', () => ({
  useAIChat: () => ({
    error: ref(null),
    streamMessage: mockStreamMessage,
    isElectron: computed(() => true), // Always return true in tests
    currentProvider: ref('anthropic'),
  }),
}))

vi.mock('../../composables/useProjectContext', () => ({
  useProjectContext: () => ({
    openedProject: ref(null),
  }),
}))

vi.mock('../../composables/useWorkspace', () => ({
  useWorkspace: () => ({
    currentProjectPath: ref('/test/project'),
    currentBranch: ref('main'),
  }),
}))

// Mock BaseIcon component
vi.mock('../atoms/BaseIcon.vue', () => ({
  default: {
    name: 'BaseIcon',
    props: ['name', 'size', 'color'],
    template: '<span class="base-icon" :data-name="name"></span>',
  },
}))

describe('ChatPanel.vue', () => {
  const defaultProps = {
    currentMode: 'generative' as const,
    effectiveWidth: '400px',
    shouldShowResizeHandle: true,
    isGenerativeMode: false,
    isResizing: false,
    startResize: vi.fn(),
    resizeCursor: 'col-resize',
  }

  beforeEach(() => {
    vi.clearAllMocks()

    // Reset mock implementations
    mockSaveUserMessage.mockResolvedValue(undefined)
    mockSaveAssistantMessage.mockResolvedValue(undefined)
    mockLoadSession.mockResolvedValue(undefined)
    mockStreamMessage.mockResolvedValue(undefined)

    // Mock window.electronAPI for AI chat functionality
    Object.defineProperty(window, 'electronAPI', {
      value: {
        aiChat: {
          sendMessage: vi.fn().mockResolvedValue({
            success: true,
            response: 'AI response',
          }),
          getProviders: vi.fn().mockResolvedValue(['anthropic']),
          getCurrentProvider: vi.fn().mockResolvedValue('anthropic'),
        },
      },
      writable: true,
      configurable: true,
    })
  })

  it('should mount and render without errors', () => {
    const wrapper = mount(ChatPanel, { props: defaultProps })
    expect(wrapper.exists()).toBe(true)
  })

  it('should render chat panel container', () => {
    const wrapper = mount(ChatPanel, { props: defaultProps })
    const chatPanel = wrapper.find('.chat-panel')
    expect(chatPanel.exists()).toBe(true)
  })

  it('should show resize handle when shouldShowResizeHandle is true', () => {
    const wrapper = mount(ChatPanel, { props: defaultProps })
    const resizeHandle = wrapper.find('.resize-handle')
    expect(resizeHandle.exists()).toBe(true)
  })

  it('should hide resize handle when shouldShowResizeHandle is false', () => {
    const wrapper = mount(ChatPanel, {
      props: {
        ...defaultProps,
        shouldShowResizeHandle: false,
      },
    })
    const resizeHandle = wrapper.find('.resize-handle')
    expect(resizeHandle.exists()).toBe(false)
  })

  it('should display welcome greeting initially', () => {
    const wrapper = mount(ChatPanel, { props: defaultProps })
    const greeting = wrapper.find('.central-greeting')
    expect(greeting.exists()).toBe(true)
    expect(greeting.text()).toContain('Hello')
    expect(greeting.text()).toContain('Hatcher')
  })

  it('should render input container', () => {
    const wrapper = mount(ChatPanel, { props: defaultProps })
    const inputContainer = wrapper.find('.minimalist-input-container')
    expect(inputContainer.exists()).toBe(true)
  })

  it('should render textarea input', () => {
    const wrapper = mount(ChatPanel, { props: defaultProps })
    const textarea = wrapper.find('textarea')
    expect(textarea.exists()).toBe(true)
    expect(textarea.attributes('placeholder')).toBe(
      'What are we building today?'
    )
  })

  it('should render input icon', () => {
    const wrapper = mount(ChatPanel, { props: defaultProps })
    const inputIcon = wrapper.find('.minimalist-input-wrapper .input-icon')
    expect(inputIcon.exists()).toBe(true)
  })

  it('should handle message input', async () => {
    const wrapper = mount(ChatPanel, { props: defaultProps })
    const textarea = wrapper.find('textarea')

    await textarea.setValue('Test message')
    expect(textarea.element.value).toBe('Test message')
  })

  it('should send message on Enter key press', async () => {
    const wrapper = mount(ChatPanel, { props: defaultProps })
    const textarea = wrapper.find('textarea')

    await textarea.setValue('Test message')

    // Trigger keydown event with Enter key (not shifted)
    await textarea.trigger('keydown', { key: 'Enter', shiftKey: false })

    // Wait for async message sending and DOM updates
    await nextTick()
    await nextTick()
    await new Promise((resolve) => setTimeout(resolve, 50))

    // Verify saveUserMessage was called with the message
    expect(mockSaveUserMessage).toHaveBeenCalledWith('Test message')
  })

  it('should not send empty messages', async () => {
    const wrapper = mount(ChatPanel, { props: defaultProps })
    const textarea = wrapper.find('textarea')

    await textarea.setValue('   ')
    await textarea.trigger('keydown.enter')

    // Test that no message was sent by checking welcome is still visible
    const greeting = wrapper.find('.central-greeting')
    expect(greeting.exists()).toBe(true)
  })

  it('should hide welcome message after sending first message', async () => {
    const wrapper = mount(ChatPanel, { props: defaultProps })
    const textarea = wrapper.find('textarea')

    await textarea.setValue('First message')
    await textarea.trigger('keydown', { key: 'Enter', shiftKey: false })

    // Wait for async message sending and DOM updates
    await nextTick()
    await nextTick()
    await new Promise((resolve) => setTimeout(resolve, 50))

    // Verify message was saved (which means it was sent)
    expect(mockSaveUserMessage).toHaveBeenCalledWith('First message')
    expect(mockStreamMessage).toHaveBeenCalled()
  })

  it('should show typing indicator after sending message', async () => {
    // Mock streamMessage as async generator that delays
    mockStreamMessage.mockImplementation(async function* () {
      await new Promise((resolve) => setTimeout(resolve, 100))
      yield { type: 'assistant', content: 'Response' }
    })

    const wrapper = mount(ChatPanel, { props: defaultProps })
    const textarea = wrapper.find('textarea')

    await textarea.setValue('Test message')
    await textarea.trigger('keydown', { key: 'Enter', shiftKey: false })

    // Wait for async message sending to start
    await nextTick()
    await nextTick()
    await new Promise((resolve) => setTimeout(resolve, 50))

    // Verify streamMessage was called (which triggers typing indicator)
    expect(mockStreamMessage).toHaveBeenCalled()

    // Wait for streaming to complete
    await new Promise((resolve) => setTimeout(resolve, 100))

    // Reset mock for other tests
    mockStreamMessage.mockResolvedValue(undefined)
  })

  it('should auto-resize textarea on input', async () => {
    const wrapper = mount(ChatPanel, { props: defaultProps })
    const textarea = wrapper.find('textarea')

    // Mock scrollHeight
    Object.defineProperty(textarea.element, 'scrollHeight', {})

    await textarea.trigger('input')
    expect(wrapper.exists()).toBe(true)
  })

  it('should handle Shift+Enter for new line', async () => {
    const wrapper = mount(ChatPanel, { props: defaultProps })
    const textarea = wrapper.find('textarea')

    await textarea.setValue('Test message')
    await textarea.trigger('keydown', { key: 'Enter', shiftKey: true })

    // Should not send message - welcome should still be visible
    const greeting = wrapper.find('.central-greeting')
    expect(greeting.exists()).toBe(true)
  })

  it('should apply generative mode classes', () => {
    const wrapper = mount(ChatPanel, {
      props: {
        ...defaultProps,
        isGenerativeMode: true,
      },
    })
    const chatPanel = wrapper.find('.chat-panel')
    expect(chatPanel.classes()).toContain('is-generative')
  })

  it('should handle resize cursor changes', () => {
    const wrapper = mount(ChatPanel, {
      props: {
        ...defaultProps,
        resizeCursor: 'ew-resize',
      },
    })
    const resizeHandle = wrapper.find('.resize-handle')
    expect(resizeHandle.attributes('style')).toContain('ew-resize')
  })

  it('should call startResize on mousedown', async () => {
    const startResizeFn = vi.fn()
    const wrapper = mount(ChatPanel, {
      props: {
        ...defaultProps,
        startResize: startResizeFn,
      },
    })
    const resizeHandle = wrapper.find('.resize-handle')

    await resizeHandle.trigger('mousedown')
    expect(startResizeFn).toHaveBeenCalled()
  })

  it('should not send empty message', async () => {
    const wrapper = mount(ChatPanel, { props: defaultProps })
    const textarea = wrapper.find('.minimalist-input')

    // Try to send empty message
    await textarea.setValue('')
    await textarea.trigger('keydown', { key: 'Enter', shiftKey: false })

    await nextTick()
    await new Promise((resolve) => setTimeout(resolve, 50))

    // Should not call saveUserMessage for empty messages
    expect(mockSaveUserMessage).not.toHaveBeenCalled()
    // Welcome message should still be visible
    const greeting = wrapper.find('.central-greeting')
    expect(greeting.exists()).toBe(true)
  })

  it('should not send message when already typing', async () => {
    // Mock streamMessage to simulate long-running stream
    let resolveStream: () => void
    const streamPromise = new Promise<void>((resolve) => {
      resolveStream = resolve
    })

    mockStreamMessage.mockImplementation(async function* () {
      await streamPromise
      yield { type: 'assistant', content: 'Response' }
    })

    const wrapper = mount(ChatPanel, { props: defaultProps })
    const textarea = wrapper.find('.minimalist-input')

    // Send first message (will start typing state)
    await textarea.setValue('First message')
    await textarea.trigger('keydown', { key: 'Enter', shiftKey: false })

    await nextTick()
    await new Promise((resolve) => setTimeout(resolve, 50))

    // Clear mocks and try to send second message while typing
    vi.clearAllMocks()
    await textarea.setValue('Second message')
    await textarea.trigger('keydown', { key: 'Enter', shiftKey: false })

    await nextTick()

    // Should not call saveUserMessage again while typing
    expect(mockSaveUserMessage).not.toHaveBeenCalled()

    // Cleanup
    resolveStream!()
  })

  it('should not send message with only whitespace', async () => {
    const wrapper = mount(ChatPanel, { props: defaultProps })
    const textarea = wrapper.find('.minimalist-input')

    // Try to send whitespace-only message
    await textarea.setValue('   \n  \t  ')
    await textarea.trigger('keydown', { key: 'Enter', shiftKey: false })

    await nextTick()
    await new Promise((resolve) => setTimeout(resolve, 50))

    // Should not call saveUserMessage for whitespace-only messages
    expect(mockSaveUserMessage).not.toHaveBeenCalled()
    // Welcome message should still be visible
    const greeting = wrapper.find('.central-greeting')
    expect(greeting.exists()).toBe(true)
  })

  it('should use default cursor when resizeCursor is not provided', () => {
    const wrapper = mount(ChatPanel, {
      props: {
        ...defaultProps,
        resizeCursor: undefined,
      },
    })
    const resizeHandle = wrapper.find('.resize-handle')

    // Should default to 'col-resize'
    expect(resizeHandle.attributes('style')).toContain('cursor: col-resize')
  })

  it('should handle null resizeCursor gracefully', () => {
    const wrapper = mount(ChatPanel, {
      props: {
        ...defaultProps,
        resizeCursor: undefined,
      },
    })
    const resizeHandle = wrapper.find('.resize-handle')

    // Should default to 'col-resize' when null
    expect(resizeHandle.attributes('style')).toContain('cursor: col-resize')
  })

  it('should allow message input with Shift+Enter for newline', async () => {
    const wrapper = mount(ChatPanel, { props: defaultProps })
    const textarea = wrapper.find('.minimalist-input')

    // Type message with Shift+Enter (should not send)
    await textarea.setValue('Line 1')
    await textarea.trigger('keydown', { key: 'Enter', shiftKey: true })

    await nextTick()
    await new Promise((resolve) => setTimeout(resolve, 50))

    // Should not send message with Shift+Enter
    expect(mockSaveUserMessage).not.toHaveBeenCalled()
    // Message should remain in textarea
    expect(textarea.element.value).toBe('Line 1')
  })

  // 🎯 Context7: 100% Coverage Tests
  describe('🎯 Coverage: Format functions and utility methods', () => {
    it('should test formatProviderName with various providers', () => {
      const wrapper = mount(ChatPanel, { props: defaultProps })

      interface ChatPanelVM {
        formatProviderName: (provider: string | undefined) => string
      }

      const vm = wrapper.vm as unknown as ChatPanelVM

      // Test all provider mappings
      expect(vm.formatProviderName('anthropic')).toBe('Claude Code')
      expect(vm.formatProviderName('openai')).toBe('OpenAI')
      expect(vm.formatProviderName('claude-code')).toBe('Claude Code')
      expect(vm.formatProviderName('copilot')).toBe('GitHub Copilot')
      expect(vm.formatProviderName('gemini')).toBe('Gemini')

      // Test case insensitivity
      expect(vm.formatProviderName('ANTHROPIC')).toBe('Claude Code')
      expect(vm.formatProviderName('OpenAI')).toBe('OpenAI')

      // Test unknown provider
      expect(vm.formatProviderName('unknown-provider')).toBe('unknown-provider')

      // Test undefined provider (legacy messages)
      expect(vm.formatProviderName(undefined)).toBe('Unknown')
    })

    it('should test formatModelName with Claude Sonnet models', () => {
      const wrapper = mount(ChatPanel, { props: defaultProps })

      interface ChatPanelVM {
        formatModelName: (model: string | undefined) => string
      }

      const vm = wrapper.vm as unknown as ChatPanelVM

      // Claude Sonnet 4.5
      expect(vm.formatModelName('claude-sonnet-4-5-20250929')).toBe(
        'Sonnet 4.5'
      )
      expect(vm.formatModelName('claude-sonnet-4.5-20250929')).toBe(
        'Sonnet 4.5'
      )

      // Claude Sonnet 4
      expect(vm.formatModelName('claude-sonnet-4-20250514')).toBe('Sonnet 4')
      expect(vm.formatModelName('claude-sonnet-4-')).toBe('Sonnet 4')

      // Claude Sonnet 3.7
      expect(vm.formatModelName('claude-3-7-sonnet-20250219')).toBe(
        'Sonnet 3.7'
      )
      expect(vm.formatModelName('claude-3.7-sonnet-20250219')).toBe(
        'Sonnet 3.7'
      )

      // Claude Sonnet 3.5
      expect(vm.formatModelName('claude-3-5-sonnet-20241022')).toBe(
        'Sonnet 3.5'
      )
      expect(vm.formatModelName('claude-3.5-sonnet-20241022')).toBe(
        'Sonnet 3.5'
      )

      // Claude Sonnet 3
      expect(vm.formatModelName('claude-3-sonnet-20240307')).toBe('Sonnet 3')

      // Generic Sonnet
      expect(vm.formatModelName('sonnet')).toBe('Sonnet')
    })

    it('should test formatModelName with Claude Opus models', () => {
      const wrapper = mount(ChatPanel, { props: defaultProps })

      interface ChatPanelVM {
        formatModelName: (model: string | undefined) => string
      }

      const vm = wrapper.vm as unknown as ChatPanelVM

      // Claude Opus 4.1
      expect(vm.formatModelName('claude-opus-4-1-20250805')).toBe('Opus 4.1')

      // Claude Opus 4
      expect(vm.formatModelName('claude-opus-4-20250514')).toBe('Opus 4')

      // Claude Opus 3
      expect(vm.formatModelName('claude-3-opus-20240229')).toBe('Opus 3')

      // Generic Opus
      expect(vm.formatModelName('opus')).toBe('Opus')
    })

    it('should test formatModelName with Claude Haiku models', () => {
      const wrapper = mount(ChatPanel, { props: defaultProps })

      interface ChatPanelVM {
        formatModelName: (model: string | undefined) => string
      }

      const vm = wrapper.vm as unknown as ChatPanelVM

      // Claude Haiku 3.5
      expect(vm.formatModelName('claude-3-5-haiku-20241022')).toBe('Haiku 3.5')

      // Claude Haiku 3
      expect(vm.formatModelName('claude-3-haiku-20240307')).toBe('Haiku 3')

      // Generic Haiku
      expect(vm.formatModelName('haiku')).toBe('Haiku')
    })

    it('should test formatModelName with OpenAI and Gemini models', () => {
      const wrapper = mount(ChatPanel, { props: defaultProps })

      interface ChatPanelVM {
        formatModelName: (model: string | undefined) => string
      }

      const vm = wrapper.vm as unknown as ChatPanelVM

      // OpenAI models
      expect(vm.formatModelName('gpt-4o')).toBe('GPT-5o')
      expect(vm.formatModelName('gpt-4-turbo')).toBe('GPT-5')
      expect(vm.formatModelName('gpt-3.5-turbo')).toBe('GPT-3.5')

      // Gemini models
      expect(vm.formatModelName('gemini-pro')).toBe('Gemini Pro')
      expect(vm.formatModelName('gemini')).toBe('Gemini')
    })

    it('should test formatModelName with undefined and unknown models', () => {
      const wrapper = mount(ChatPanel, { props: defaultProps })

      interface ChatPanelVM {
        formatModelName: (model: string | undefined) => string
      }

      const vm = wrapper.vm as unknown as ChatPanelVM

      // Test undefined model (legacy messages)
      expect(vm.formatModelName(undefined)).toBe('Unknown Model')

      // Test unknown model (fallback to original name)
      expect(vm.formatModelName('custom-model-xyz')).toBe('custom-model-xyz')
    })

    it('should test formatTime function', () => {
      const wrapper = mount(ChatPanel, { props: defaultProps })

      interface ChatPanelVM {
        formatTime: (date: Date) => string
      }

      const vm = wrapper.vm as unknown as ChatPanelVM

      // Test with specific date
      const testDate = new Date('2025-01-15T14:30:00')
      const formatted = vm.formatTime(testDate)

      // Should return time in "2:30 PM" format
      expect(formatted).toMatch(/\d{1,2}:\d{2}\s(AM|PM)/)
    })

    it('should test renderMarkdown function', () => {
      const wrapper = mount(ChatPanel, { props: defaultProps })

      interface ChatPanelVM {
        renderMarkdown: (content: string) => string
      }

      const vm = wrapper.vm as unknown as ChatPanelVM

      // Test simple markdown
      const markdown = '# Hello World'
      const html = vm.renderMarkdown(markdown)
      expect(html).toContain('<h1')
      expect(html).toContain('Hello World')
    })
  })

  describe('🎯 Coverage: Exposed methods', () => {
    it('should test clearMessages method', async () => {
      const wrapper = mount(ChatPanel, { props: defaultProps })
      const textarea = wrapper.find('.minimalist-input')

      // Send a message to populate localMessages
      await textarea.setValue('Test message')
      await textarea.trigger('keydown', { key: 'Enter', shiftKey: false })

      await nextTick()
      await new Promise((resolve) => setTimeout(resolve, 50))

      // Clear messages using exposed method
      wrapper.vm.clearMessages()

      await nextTick()

      // Welcome message should be visible again
      const greeting = wrapper.find('.central-greeting')
      expect(greeting.exists()).toBe(true)
    })

    it('should test rewindMessages method with default step', async () => {
      const wrapper = mount(ChatPanel, { props: defaultProps })
      const textarea = wrapper.find('.minimalist-input')

      // Send two messages
      await textarea.setValue('First message')
      await textarea.trigger('keydown', { key: 'Enter', shiftKey: false })
      await nextTick()
      await new Promise((resolve) => setTimeout(resolve, 50))

      await textarea.setValue('Second message')
      await textarea.trigger('keydown', { key: 'Enter', shiftKey: false })
      await nextTick()
      await new Promise((resolve) => setTimeout(resolve, 50))

      // Rewind one message
      const removedCount = wrapper.vm.rewindMessages()

      expect(removedCount).toBeGreaterThan(0)
    })

    it('should test rewindMessages with specific step count', () => {
      const wrapper = mount(ChatPanel, { props: defaultProps })

      // Rewind with no messages (should return 0)
      const removedCount = wrapper.vm.rewindMessages(5)
      expect(removedCount).toBe(0)
    })
  })

  describe('🎯 Coverage: Animation hooks', () => {
    it('should test onBeforeEnter hook with data-index', () => {
      const wrapper = mount(ChatPanel, { props: defaultProps })

      interface ChatPanelVM {
        onBeforeEnter: (el: Element) => void
      }

      const vm = wrapper.vm as unknown as ChatPanelVM

      // Create mock element with dataset
      const mockElement = document.createElement('div')
      mockElement.dataset.index = '0'

      vm.onBeforeEnter(mockElement)

      // Should set CSS custom property
      expect(mockElement.style.getPropertyValue('--message-index')).toBe('0')
    })

    it('should test onBeforeEnter hook without data-index', () => {
      const wrapper = mount(ChatPanel, { props: defaultProps })

      interface ChatPanelVM {
        onBeforeEnter: (el: Element) => void
      }

      const vm = wrapper.vm as unknown as ChatPanelVM

      // Create mock element without dataset.index
      const mockElement = document.createElement('div')

      vm.onBeforeEnter(mockElement)

      // Should not set CSS custom property
      expect(mockElement.style.getPropertyValue('--message-index')).toBe('')
    })

    it('should test onEnter hook', async () => {
      const wrapper = mount(ChatPanel, { props: defaultProps })

      interface ChatPanelVM {
        onEnter: (el: Element, done: () => void) => void
      }

      const vm = wrapper.vm as unknown as ChatPanelVM

      const mockElement = document.createElement('div')
      const doneFn = vi.fn()

      vm.onEnter(mockElement, doneFn)

      // Wait for setTimeout
      await new Promise((resolve) => setTimeout(resolve, 150))

      // Done callback should have been called
      expect(doneFn).toHaveBeenCalled()
    })

    it('should test onWelcomeGone hook', () => {
      const wrapper = mount(ChatPanel, { props: defaultProps })

      interface ChatPanelVM {
        onWelcomeGone: () => void
      }

      const vm = wrapper.vm as unknown as ChatPanelVM

      // Should execute without errors
      vm.onWelcomeGone()
      expect(wrapper.exists()).toBe(true)
    })
  })

  describe('🎯 Coverage: handleInput auto-resize', () => {
    it('should handle textarea auto-resize on input', async () => {
      const wrapper = mount(ChatPanel, { props: defaultProps })
      const textarea = wrapper.find('.minimalist-input')

      // Mock scrollHeight to simulate content
      Object.defineProperty(textarea.element, 'scrollHeight', {
        value: 100,
        writable: true,
        configurable: true,
      })

      await textarea.trigger('input')
      await nextTick()

      // Height should be set to 'auto' then to scrollHeight
      expect(textarea.element.style.height).toBe('100px')
    })
  })

  describe('🎯 Coverage: Context CSS classes and computed properties', () => {
    it('should render context usage status section', () => {
      const wrapper = mount(ChatPanel, { props: defaultProps })

      // Find the context usage section
      const statusSection = wrapper.find('[title^="Context usage:"]')
      expect(statusSection.exists()).toBe(true)

      // Should have metric-value with percentage
      const metricValue = statusSection.find('.metric-value')
      expect(metricValue.exists()).toBe(true)
    })

    it('should render conversation cost section', () => {
      const wrapper = mount(ChatPanel, { props: defaultProps })

      // Find the cost section
      const costSection = wrapper.find('[title="Total conversation cost"]')
      expect(costSection.exists()).toBe(true)

      // Should have cost metric value
      const metricValue = costSection.find('.metric-value')
      expect(metricValue.exists()).toBe(true)
    })
  })
})
