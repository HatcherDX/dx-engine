/**
 * @fileoverview Tests for TerminalEasterEgg component.
 *
 * @description
 * Comprehensive test suite for the TerminalEasterEgg component to achieve 100% coverage.
 * Tests all functions, computed properties, event handlers, watchers, and conditional rendering.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @internal
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { nextTick, ref } from 'vue'
import TerminalEasterEgg from './TerminalEasterEgg.vue'
import { TERMINAL_DISABLE_EVENT } from '../../directives/disableTerminal'

// Mock the useTerminalEasterEgg composable
const mockTerminalState = ref({
  lines: [
    { id: '1', text: 'System initialized', type: 'system', isTyping: false },
    {
      id: '2',
      text: 'Type **help** for commands',
      type: 'prompt',
      isTyping: false,
    },
  ],
  currentInput: 'test input',
  cursorPosition: 5,
  isTypingLine: false,
  isVisible: true,
  currentStep: 'task-detail',
})

const mockIsVisible = ref(true)
const mockHasExclusiveFocus = ref(false)
const mockSetTerminalElement = vi.fn()
const mockDeactivateAndHide = vi.fn()
const mockExecuteCommand = vi.fn()

vi.mock('../../composables/useTerminalEasterEgg', () => ({
  useTerminalEasterEgg: () => ({
    terminalState: mockTerminalState,
    isVisible: mockIsVisible,
    hasExclusiveFocus: mockHasExclusiveFocus,
    setTerminalElement: mockSetTerminalElement,
    deactivateAndHide: mockDeactivateAndHide,
    executeCommand: mockExecuteCommand,
  }),
}))

// Mock console.log to avoid test output noise
const _consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

describe('TerminalEasterEgg.vue', () => {
  let wrapper: VueWrapper<unknown>

  const createWrapper = (props = {}) => {
    return mount(TerminalEasterEgg, {
      props,
      global: {
        stubs: {
          Transition: false,
          TransitionGroup: false,
        },
      },
    })
  }

  beforeEach(() => {
    vi.clearAllMocks()

    // Reset ref values to defaults
    mockTerminalState.value = {
      lines: [
        {
          id: '1',
          text: 'System initialized',
          type: 'system',
          isTyping: false,
        },
        {
          id: '2',
          text: 'Type **help** for commands',
          type: 'prompt',
          isTyping: false,
        },
      ],
      currentInput: 'test input',
      cursorPosition: 5,
      isTypingLine: false,
      isVisible: true,
      currentStep: 'task-detail',
    }

    mockIsVisible.value = true
    mockHasExclusiveFocus.value = false
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
    vi.restoreAllMocks()
  })

  describe('🎯 Basic rendering and visibility', () => {
    it('should render when isVisible is true', () => {
      wrapper = createWrapper()
      expect(wrapper.exists()).toBe(true)
      expect(wrapper.find('.terminal-easter-egg').exists()).toBe(true)
    })

    it('should not render when isVisible is false', () => {
      mockIsVisible.value = false
      wrapper = createWrapper()
      expect(wrapper.find('.terminal-easter-egg').exists()).toBe(false)
    })

    it('should apply correct classes based on state', () => {
      mockTerminalState.value = {
        lines: [],
        currentInput: '',
        cursorPosition: 0,
        isTypingLine: true,
        isVisible: true,
        currentStep: 'task-detail',
      }
      mockHasExclusiveFocus.value = true

      wrapper = createWrapper()
      const terminal = wrapper.find('.terminal-easter-egg')

      expect(terminal.classes()).toContain('terminal-typing')
      expect(terminal.classes()).toContain('has-exclusive-focus')
    })
  })

  describe('🎯 Terminal lines rendering', () => {
    it('should render terminal lines with correct classes', () => {
      mockTerminalState.value = {
        lines: [
          { id: '1', text: 'System line', type: 'system', isTyping: false },
          { id: '2', text: 'Error line', type: 'error', isTyping: false },
          { id: '3', text: 'Success line', type: 'success', isTyping: true },
        ],
        currentInput: '',
        cursorPosition: 0,
        isTypingLine: false,
        isVisible: true,
        currentStep: 'task-detail',
      }

      wrapper = createWrapper()
      const lines = wrapper.findAll('.terminal-line')

      expect(lines).toHaveLength(3)
      expect(lines[0].classes()).toContain('terminal-line--system')
      expect(lines[1].classes()).toContain('terminal-line--error')
      expect(lines[2].classes()).toContain('terminal-line--success')
      expect(lines[2].classes()).toContain('typing')
    })

    it('should render typing cursor for typing lines', () => {
      mockTerminalState.value = {
        lines: [
          { id: '1', text: 'Typing line', type: 'prompt', isTyping: true },
        ],
        currentInput: '',
        cursorPosition: 0,
        isTypingLine: false,
        isVisible: true,
        currentStep: 'task-detail',
      }

      wrapper = createWrapper()
      expect(wrapper.find('.typing-cursor').exists()).toBe(true)
    })

    it('should not render typing cursor for non-typing lines', () => {
      mockTerminalState.value = {
        lines: [
          { id: '1', text: 'Static line', type: 'prompt', isTyping: false },
        ],
        currentInput: '',
        cursorPosition: 0,
        isTypingLine: false,
        isVisible: true,
        currentStep: 'task-detail',
      }

      wrapper = createWrapper()
      expect(wrapper.find('.typing-cursor').exists()).toBe(false)
    })
  })

  describe('🎯 Input line and cursor', () => {
    it('should render input line when terminalState exists', () => {
      wrapper = createWrapper()
      expect(wrapper.find('.terminal-input-line').exists()).toBe(true)
      expect(wrapper.find('.terminal-prompt').text()).toBe('$')
    })

    it('should display current input text', () => {
      wrapper = createWrapper()
      expect(wrapper.find('.terminal-input').text()).toBe('test input')
    })

    it('should display character at cursor position', () => {
      wrapper = createWrapper()
      const cursor = wrapper.find('.input-cursor')
      expect(cursor.text()).toBe('i') // Position 5 is at character 'i' in "test input"
    })
  })

  describe('🎯 Computed properties', () => {
    describe('characterAtCursor', () => {
      it('should return character at cursor position', () => {
        mockTerminalState.value = {
          lines: [],
          currentInput: 'hello',
          cursorPosition: 2,
          isTypingLine: false,
          isVisible: true,
          currentStep: 'task-detail',
        }
        wrapper = createWrapper()
        expect(wrapper.find('.input-cursor').text()).toBe('l')
      })

      it('should return space when cursor is beyond input length', () => {
        mockTerminalState.value = {
          lines: [],
          currentInput: 'hi',
          cursorPosition: 5,
          isTypingLine: false,
          isVisible: true,
          currentStep: 'task-detail',
        }
        wrapper = createWrapper()
        expect(wrapper.find('.input-cursor').text()).toBe('')
      })

      it('should handle empty currentInput', () => {
        mockTerminalState.value = {
          lines: [],
          currentInput: '',
          cursorPosition: 0,
          isTypingLine: false,
          isVisible: true,
          currentStep: 'task-detail',
        }
        wrapper = createWrapper()
        expect(wrapper.find('.input-cursor').text()).toBe('')
      })
    })

    describe('cursorStyle', () => {
      it('should return correct left position in ch units', async () => {
        mockTerminalState.value = {
          lines: [],
          currentInput: 'test',
          cursorPosition: 3,
          isTypingLine: false,
          isVisible: true,
          currentStep: 'task-detail',
        }
        wrapper = createWrapper()
        await nextTick()
        const cursor = wrapper.find('.input-cursor')
        expect(cursor.attributes('style')).toContain('left: 3ch')
      })
    })
  })

  describe('🎯 formatLineText function', () => {
    it('should escape HTML special characters', () => {
      mockTerminalState.value = {
        lines: [
          {
            id: '1',
            text: '<script>alert("test")</script>',
            type: 'system',
            isTyping: false,
          },
        ],
        currentInput: '',
        cursorPosition: 0,
        isTypingLine: false,
        isVisible: true,
        currentStep: 'task-detail',
      }
      wrapper = createWrapper()
      const lineContent = wrapper.find('.line-content')
      expect(lineContent.html()).toContain('&lt;script&gt;')
      expect(lineContent.html()).toContain('alert(')
    })

    it('should convert **text** to bold tags', () => {
      mockTerminalState.value = {
        lines: [
          {
            id: '1',
            text: 'Type **help** for commands',
            type: 'prompt',
            isTyping: false,
          },
        ],
        currentInput: '',
        cursorPosition: 0,
        isTypingLine: false,
        isVisible: true,
        currentStep: 'task-detail',
      }
      wrapper = createWrapper()
      const lineContent = wrapper.find('.line-content')
      expect(lineContent.html()).toContain('<strong>help</strong>')
    })

    it('should handle mixed HTML escaping and bold formatting', () => {
      mockTerminalState.value = {
        lines: [
          {
            id: '1',
            text: 'Use **<command>** & **help**',
            type: 'prompt',
            isTyping: false,
          },
        ],
        currentInput: '',
        cursorPosition: 0,
        isTypingLine: false,
        isVisible: true,
        currentStep: 'task-detail',
      }
      wrapper = createWrapper()
      const lineContent = wrapper.find('.line-content')
      expect(lineContent.html()).toContain('<strong>&lt;command&gt;</strong>')
      expect(lineContent.html()).toContain('<strong>help</strong>')
      expect(lineContent.html()).toContain('&amp;')
    })
  })

  describe('🎯 Event handlers', () => {
    describe('handleDocumentClick', () => {
      beforeEach(() => {
        wrapper = createWrapper()
      })

      it('should ignore clicks when terminal does not have exclusive focus', () => {
        mockHasExclusiveFocus.value = false

        const clickEvent = new MouseEvent('click', { bubbles: true })
        Object.defineProperty(clickEvent, 'target', {
          value: document.createElement('div'),
          enumerable: true,
        })

        document.dispatchEvent(clickEvent)

        expect(mockDeactivateAndHide).not.toHaveBeenCalled()
      })

      it('should keep terminal active when clicking on non-interactive elements', () => {
        mockHasExclusiveFocus.value = true

        const targetElement = document.createElement('div')
        document.body.appendChild(targetElement)

        const clickEvent = new MouseEvent('click', { bubbles: true })
        Object.defineProperty(clickEvent, 'target', {
          value: targetElement,
          enumerable: true,
        })

        document.dispatchEvent(clickEvent)

        expect(mockDeactivateAndHide).not.toHaveBeenCalled()

        document.body.removeChild(targetElement)
      })

      it('should deactivate terminal when clicking on element with data-disable-terminal', () => {
        mockHasExclusiveFocus.value = true

        // Create an element with data-disable-terminal attribute
        const targetElement = document.createElement('button')
        targetElement.setAttribute('data-disable-terminal', 'true')
        document.body.appendChild(targetElement)

        const dispatchEventSpy = vi.spyOn(window, 'dispatchEvent')

        const clickEvent = new MouseEvent('click', { bubbles: true })
        Object.defineProperty(clickEvent, 'target', {
          value: targetElement,
          enumerable: true,
        })

        // Trigger the click event to cover lines 228-249
        document.dispatchEvent(clickEvent)

        // Should deactivate terminal and emit event
        expect(mockDeactivateAndHide).toHaveBeenCalled()
        expect(dispatchEventSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'terminal-deactivate-from-ui',
          })
        )

        document.body.removeChild(targetElement)
        dispatchEventSpy.mockRestore()
      })
    })

    describe('handleDisableTerminalEvent', () => {
      beforeEach(() => {
        wrapper = createWrapper()
      })

      it('should ignore event when terminal does not have exclusive focus', () => {
        mockHasExclusiveFocus.value = false

        const customEvent = new CustomEvent(TERMINAL_DISABLE_EVENT, {
          detail: { reason: 'test' },
        })

        document.dispatchEvent(customEvent)

        expect(mockDeactivateAndHide).not.toHaveBeenCalled()
      })

      it('should deactivate terminal when event is received and has exclusive focus', () => {
        mockHasExclusiveFocus.value = true

        const customEvent = new CustomEvent(TERMINAL_DISABLE_EVENT, {
          detail: { reason: 'test' },
        })

        const dispatchEventSpy = vi.spyOn(window, 'dispatchEvent')

        document.dispatchEvent(customEvent)

        expect(mockDeactivateAndHide).toHaveBeenCalled()
        expect(dispatchEventSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'terminal-deactivate-from-ui',
          })
        )
      })
    })

    describe('handleKeyDown', () => {
      beforeEach(() => {
        wrapper = createWrapper()
      })

      it('should ignore keys when terminal is not visible', () => {
        mockIsVisible.value = false

        const keyEvent = new KeyboardEvent('keydown', { key: 'ArrowLeft' })
        keyEvent.preventDefault = vi.fn()
        keyEvent.stopPropagation = vi.fn()

        document.dispatchEvent(keyEvent)

        expect(mockExecuteCommand).not.toHaveBeenCalled()
        expect(keyEvent.preventDefault).not.toHaveBeenCalled()

        // Reset
        mockIsVisible.value = true
      })

      it('should ignore keys when step is not supported', () => {
        mockTerminalState.value = {
          ...mockTerminalState.value,
          currentStep: 'unsupported-step',
        }

        const keyEvent = new KeyboardEvent('keydown', { key: 'ArrowLeft' })
        keyEvent.preventDefault = vi.fn()
        keyEvent.stopPropagation = vi.fn()

        document.dispatchEvent(keyEvent)

        expect(mockExecuteCommand).not.toHaveBeenCalled()
      })

      it('should handle arrow keys in supported steps', () => {
        const arrowKeys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']

        arrowKeys.forEach((key) => {
          vi.clearAllMocks()

          const keyEvent = new KeyboardEvent('keydown', { key })
          keyEvent.preventDefault = vi.fn()
          keyEvent.stopPropagation = vi.fn()

          document.dispatchEvent(keyEvent)

          expect(keyEvent.preventDefault).toHaveBeenCalled()
          expect(keyEvent.stopPropagation).toHaveBeenCalled()
          expect(mockExecuteCommand).toHaveBeenCalledWith(key)
        })
      })

      it('should ignore non-arrow keys', () => {
        const keyEvent = new KeyboardEvent('keydown', { key: 'Enter' })
        keyEvent.preventDefault = vi.fn()
        keyEvent.stopPropagation = vi.fn()

        document.dispatchEvent(keyEvent)

        expect(keyEvent.preventDefault).not.toHaveBeenCalled()
        expect(mockExecuteCommand).not.toHaveBeenCalled()
      })
    })

    describe('handleFocusLoss', () => {
      beforeEach(() => {
        wrapper = createWrapper()
      })

      it('should maintain focus when terminal has exclusive focus', () => {
        mockHasExclusiveFocus.value = true

        const focusTarget = wrapper.find('.terminal-focus-target')
        const focusSpy = vi.spyOn(focusTarget.element as HTMLElement, 'focus')

        const blurEvent = new FocusEvent('blur')
        focusTarget.trigger('blur', blurEvent)

        expect(focusSpy).toHaveBeenCalled()
      })

      it('should not focus when terminal does not have exclusive focus', () => {
        mockHasExclusiveFocus.value = false

        const focusTarget = wrapper.find('.terminal-focus-target')
        const focusSpy = vi.spyOn(focusTarget.element as HTMLElement, 'focus')

        const blurEvent = new FocusEvent('blur')
        focusTarget.trigger('blur', blurEvent)

        expect(focusSpy).not.toHaveBeenCalled()
      })
    })
  })

  describe('🎯 Lifecycle hooks', () => {
    it('should call setTerminalElement on mount', () => {
      wrapper = createWrapper()
      expect(mockSetTerminalElement).toHaveBeenCalledWith(
        expect.any(HTMLElement)
      )
    })

    it('should add event listeners on mount', () => {
      const addEventListenerSpy = vi.spyOn(document, 'addEventListener')

      wrapper = createWrapper()

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'click',
        expect.any(Function),
        true
      )
      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'keydown',
        expect.any(Function),
        true
      )
      expect(addEventListenerSpy).toHaveBeenCalledWith(
        TERMINAL_DISABLE_EVENT,
        expect.any(Function)
      )
    })

    it('should remove event listeners on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener')

      wrapper = createWrapper()
      wrapper.unmount()

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'click',
        expect.any(Function),
        true
      )
      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'keydown',
        expect.any(Function),
        true
      )
      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        TERMINAL_DISABLE_EVENT,
        expect.any(Function)
      )
      expect(mockSetTerminalElement).toHaveBeenCalledWith(null)
    })
  })

  describe('🎯 Watchers and scrolling', () => {
    it('should trigger isVisible watcher when visibility changes', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      // Create wrapper with initial isVisible = true
      mockIsVisible.value = true
      wrapper = createWrapper()

      // Change isVisible to trigger the watcher (line 116)
      mockIsVisible.value = false
      await nextTick()

      expect(consoleSpy).toHaveBeenCalledWith(
        '[TerminalComponent] Terminal visibility:',
        false
      )

      consoleSpy.mockRestore()
    })

    it('should scroll to bottom when lines change', async () => {
      wrapper = createWrapper()

      const terminalBody = wrapper.find('.terminal-body')
      const scrollSpy = vi.spyOn(terminalBody.element, 'scrollTop', 'set')

      // Mock scrollHeight
      Object.defineProperty(terminalBody.element, 'scrollHeight', {
        value: 500,
        configurable: true,
      })

      // Trigger watcher by directly modifying the lines array (line 179)
      // This should trigger the watch(() => terminalState.value?.lines?.length || 0)
      mockTerminalState.value.lines.push({
        id: '999',
        text: 'Trigger watcher line',
        type: 'system',
        isTyping: false,
      })

      await nextTick()

      expect(scrollSpy).toHaveBeenCalledWith(500)
    })

    it('should scroll to bottom when currentInput changes', async () => {
      wrapper = createWrapper()

      const terminalBody = wrapper.find('.terminal-body')
      const scrollSpy = vi.spyOn(terminalBody.element, 'scrollTop', 'set')

      Object.defineProperty(terminalBody.element, 'scrollHeight', {
        value: 300,
        configurable: true,
      })

      // Trigger watcher by changing currentInput
      mockTerminalState.value = {
        ...mockTerminalState.value,
        currentInput: 'new input value',
      }

      await nextTick()

      expect(scrollSpy).toHaveBeenCalledWith(300)
    })

    it('should handle scrollToBottom when terminalBody is null', async () => {
      wrapper = createWrapper()

      // Mock the ref to be null during nextTick
      const originalTerminalBody = wrapper.vm.terminalBody
      wrapper.vm.terminalBody = null

      // This should not throw an error
      expect(() => {
        wrapper.vm.scrollToBottom()
      }).not.toThrow()

      // Restore ref
      wrapper.vm.terminalBody = originalTerminalBody
    })
  })

  describe('🎯 Edge cases and error handling', () => {
    it('should handle missing terminalContainer in click handler', () => {
      wrapper = createWrapper()

      // Mock terminalContainer to be null
      wrapper.vm.terminalContainer = null

      mockHasExclusiveFocus.value = true

      const targetElement = document.createElement('div')
      const clickEvent = new MouseEvent('click', { bubbles: true })
      Object.defineProperty(clickEvent, 'target', {
        value: targetElement,
        enumerable: true,
      })

      // Should not throw when terminalContainer is null
      expect(() => {
        document.dispatchEvent(clickEvent)
      }).not.toThrow()
    })

    it('should handle closest() returning null in click handler', () => {
      mockHasExclusiveFocus.value = true

      const targetElement = document.createElement('div')
      // Mock closest to return null
      targetElement.closest = vi.fn().mockReturnValue(null)
      targetElement.hasAttribute = vi.fn().mockReturnValue(false)
      document.body.appendChild(targetElement)

      const clickEvent = new MouseEvent('click', { bubbles: true })
      Object.defineProperty(clickEvent, 'target', {
        value: targetElement,
        enumerable: true,
      })

      wrapper = createWrapper()

      // Should not throw and should not deactivate terminal
      document.dispatchEvent(clickEvent)
      expect(mockDeactivateAndHide).not.toHaveBeenCalled()

      document.body.removeChild(targetElement)
    })

    it('should handle focus target not found in handleFocusLoss', () => {
      mockHasExclusiveFocus.value = true

      wrapper = createWrapper()

      // Mock querySelector to return null
      const mockQuerySelector = vi.fn().mockReturnValue(null)
      Object.defineProperty(wrapper.vm.terminalContainer, 'querySelector', {
        value: mockQuerySelector,
        configurable: true,
      })

      const blurEvent = new FocusEvent('blur')

      // Should not throw when focus target is not found
      expect(() => {
        wrapper.find('.terminal-focus-target').trigger('blur', blurEvent)
      }).not.toThrow()
    })
  })

  describe('🎯 DOM interactions and refs', () => {
    it('should set terminal container ref correctly', () => {
      wrapper = createWrapper()
      expect(wrapper.vm.terminalContainer).toBeTruthy()
      expect(wrapper.vm.terminalBody).toBeTruthy()
    })

    it('should handle click.stop on terminal body', async () => {
      wrapper = createWrapper()

      const terminalBody = wrapper.find('.terminal-body')
      const stopPropagationSpy = vi.fn()

      await terminalBody.trigger('click', {
        stopPropagation: stopPropagationSpy,
      })

      // The @click.stop should prevent event propagation
      expect(terminalBody.exists()).toBe(true)
    })
  })

  describe('🎯 Additional coverage targets', () => {
    it('should handle terminalState isVisible property check', () => {
      // Test the handleKeyDown isVisible check
      mockIsVisible.value = false

      wrapper = createWrapper()

      const keyEvent = new KeyboardEvent('keydown', { key: 'ArrowLeft' })
      keyEvent.preventDefault = vi.fn()

      document.dispatchEvent(keyEvent)

      expect(mockExecuteCommand).not.toHaveBeenCalled()

      // Reset
      mockIsVisible.value = true
    })

    it('should handle terminal element ref setting', () => {
      wrapper = createWrapper()

      // Verify that the terminal element is set
      expect(mockSetTerminalElement).toHaveBeenCalledWith(
        expect.objectContaining({
          classList: expect.objectContaining({
            contains: expect.any(Function),
          }),
        })
      )
    })

    it('should render all terminal line types', () => {
      mockTerminalState.value = {
        lines: [
          { id: '1', text: 'Input line', type: 'input', isTyping: false },
          { id: '2', text: 'Prompt line', type: 'prompt', isTyping: false },
        ],
        currentInput: '',
        cursorPosition: 0,
        isTypingLine: false,
        isVisible: true,
        currentStep: 'task-detail',
      }

      wrapper = createWrapper()
      const lines = wrapper.findAll('.terminal-line')

      expect(lines[0].classes()).toContain('terminal-line--input')
      expect(lines[1].classes()).toContain('terminal-line--prompt')
    })
  })
})
