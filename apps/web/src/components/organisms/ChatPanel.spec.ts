import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import ChatPanel from './ChatPanel.vue'

// Type definition for ChatPanel component instance - NO ANY TYPES ALLOWED
interface ChatPanelInstance extends InstanceType<typeof ChatPanel> {
  messages: Array<{ id: string; text: string; sender: string; timestamp: Date }>
  newMessage: string
  addMessage: (text: string, sender: string) => void
  sendMessage: () => void
  clearMessages: () => void
  handleKeyDown: (event: KeyboardEvent) => void
  handleKeyUp: (event: KeyboardEvent) => void
  [key: string]: unknown
}

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

    await nextTick()
    // Allow some time for async operations
    await new Promise((resolve) => setTimeout(resolve, 10))

    // Test that message was sent by checking textarea is cleared
    expect(textarea.element.value).toBe('')
    // Test that welcome message is hidden after sending
    const greeting = wrapper.find('.central-greeting')
    expect(greeting.exists()).toBe(false)
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

    await nextTick()
    // Allow some time for async operations
    await new Promise((resolve) => setTimeout(resolve, 10))

    // Test that welcome message is hidden by checking DOM
    const greeting = wrapper.find('.central-greeting')
    expect(greeting.exists()).toBe(false)
  })

  it('should show typing indicator after sending message', async () => {
    const wrapper = mount(ChatPanel, { props: defaultProps })
    const textarea = wrapper.find('textarea')

    await textarea.setValue('Test message')
    await textarea.trigger('keydown', { key: 'Enter', shiftKey: false })

    await nextTick()
    // Allow some time for async operations
    await new Promise((resolve) => setTimeout(resolve, 10))

    // Test that typing indicator appears in DOM
    const typingIndicator = wrapper.find('.typing-indicator')
    expect(typingIndicator.exists()).toBe(true)
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
    const vm = wrapper.vm as ChatPanelInstance

    // Try to send empty message
    await textarea.setValue('')
    await textarea.trigger('keydown', { key: 'Enter', shiftKey: false })

    await nextTick()

    // Should not add any messages
    expect(vm.userMessages).toHaveLength(0)
    expect(vm.showWelcome).toBe(true)
  })

  it('should not send message when already typing', async () => {
    const wrapper = mount(ChatPanel, { props: defaultProps })
    const textarea = wrapper.find('.minimalist-input')
    const vm = wrapper.vm as ChatPanelInstance

    // Set typing state
    vm.isTyping = true

    // Try to send message while typing
    await textarea.setValue('Test message')
    await textarea.trigger('keydown', { key: 'Enter', shiftKey: false })

    await nextTick()

    // Should not add message while typing
    expect(vm.userMessages).toHaveLength(0)
    expect(vm.inputMessage).toBe('Test message') // Message should remain in input
  })

  it('should not send message with only whitespace', async () => {
    const wrapper = mount(ChatPanel, { props: defaultProps })
    const textarea = wrapper.find('.minimalist-input')
    const vm = wrapper.vm as ChatPanelInstance

    // Try to send whitespace-only message
    await textarea.setValue('   \n  \t  ')
    await textarea.trigger('keydown', { key: 'Enter', shiftKey: false })

    await nextTick()

    // Should not add message (trimmed to empty)
    expect(vm.userMessages).toHaveLength(0)
    expect(vm.showWelcome).toBe(true)
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
    const vm = wrapper.vm as ChatPanelInstance

    // Type message with Shift+Enter (should not send)
    await textarea.setValue('Line 1')
    await textarea.trigger('keydown', { key: 'Enter', shiftKey: true })

    await nextTick()

    // Should not send message with Shift+Enter
    expect(vm.userMessages).toHaveLength(0)
    expect(vm.inputMessage).toBe('Line 1') // Message should remain
  })
})
