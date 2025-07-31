import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import ChatPanel from './ChatPanel.vue'

// Mock BaseIcon component
vi.mock('../atoms/BaseIcon.vue', () => ({
  default: {
    name: 'BaseIcon',
    template: '<div class="input-icon" data-testid="base-icon"></div>',
    props: ['name', 'size', 'color', 'accessible', 'ariaLabel'],
  },
}))

describe('ChatPanel.vue', () => {
  const defaultProps = {
    currentMode: 'generative' as const,
    effectiveWidth: '350px',
    shouldShowResizeHandle: true,
    isGenerativeMode: true,
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
      props: { ...defaultProps, shouldShowResizeHandle: false },
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
    expect(wrapper.vm.inputMessage).toBe('Test message')
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

    expect(wrapper.vm.inputMessage).toBe('')
    expect(wrapper.vm.userMessages.length).toBe(1)
  })

  it('should not send empty messages', async () => {
    const wrapper = mount(ChatPanel, { props: defaultProps })
    const textarea = wrapper.find('textarea')

    await textarea.setValue('   ')
    await textarea.trigger('keydown.enter')

    expect(wrapper.vm.userMessages.length).toBe(0)
  })

  it('should hide welcome message after sending first message', async () => {
    const wrapper = mount(ChatPanel, { props: defaultProps })
    const textarea = wrapper.find('textarea')

    await textarea.setValue('First message')
    await textarea.trigger('keydown', { key: 'Enter', shiftKey: false })

    await nextTick()
    // Allow some time for async operations
    await new Promise((resolve) => setTimeout(resolve, 10))

    expect(wrapper.vm.showWelcome).toBe(false)
  })

  it('should show typing indicator after sending message', async () => {
    const wrapper = mount(ChatPanel, { props: defaultProps })
    const textarea = wrapper.find('textarea')

    await textarea.setValue('Test message')
    await textarea.trigger('keydown', { key: 'Enter', shiftKey: false })

    await nextTick()
    // Allow some time for async operations
    await new Promise((resolve) => setTimeout(resolve, 10))

    expect(wrapper.vm.isTyping).toBe(true)
  })

  it('should auto-resize textarea on input', async () => {
    const wrapper = mount(ChatPanel, { props: defaultProps })
    const textarea = wrapper.find('textarea')

    // Mock scrollHeight
    Object.defineProperty(textarea.element, 'scrollHeight', {
      value: 100,
      configurable: true,
    })

    await textarea.trigger('input')
    expect(wrapper.exists()).toBe(true)
  })

  it('should handle Shift+Enter for new line', async () => {
    const wrapper = mount(ChatPanel, { props: defaultProps })
    const textarea = wrapper.find('textarea')

    await textarea.setValue('Test message')
    await textarea.trigger('keydown', { key: 'Enter', shiftKey: true })

    // Should not send message
    expect(wrapper.vm.userMessages.length).toBe(0)
  })

  it('should apply generative mode classes', () => {
    const wrapper = mount(ChatPanel, {
      props: { ...defaultProps, isGenerativeMode: true },
    })
    const chatPanel = wrapper.find('.chat-panel')
    expect(chatPanel.classes()).toContain('is-generative')
  })

  it('should handle resize cursor changes', () => {
    const wrapper = mount(ChatPanel, {
      props: { ...defaultProps, resizeCursor: 'ew-resize' },
    })
    const resizeHandle = wrapper.find('.resize-handle')
    expect(resizeHandle.attributes('style')).toContain('ew-resize')
  })

  it('should call startResize on mousedown', async () => {
    const startResizeFn = vi.fn()
    const wrapper = mount(ChatPanel, {
      props: { ...defaultProps, startResize: startResizeFn },
    })
    const resizeHandle = wrapper.find('.resize-handle')

    await resizeHandle.trigger('mousedown')
    expect(startResizeFn).toHaveBeenCalled()
  })
})
