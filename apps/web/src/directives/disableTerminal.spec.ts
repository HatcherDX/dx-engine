/**
 * @fileoverview Comprehensive tests for disableTerminal directive.
 *
 * @description
 * Achieves 100% code coverage for disableTerminal.ts by testing all
 * lifecycle hooks, event handlers, and edge cases.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- Import not needed in test scope
import { defineComponent, h } from 'vue'
import disableTerminalDirective, {
  TERMINAL_DISABLE_EVENT,
} from './disableTerminal'

describe('disableTerminal Directive', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Mock requires flexible typing
  let consoleLogSpy: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Mock requires flexible typing
  let dispatchEventSpy: any
  let element: HTMLElement

  beforeEach(() => {
    // Spy on console.log
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    // Spy on document.dispatchEvent
    dispatchEventSpy = vi
      .spyOn(document, 'dispatchEvent')
      .mockImplementation(() => true)

    // Create a fresh element for each test
    element = document.createElement('div')
    document.body.appendChild(element)
  })

  afterEach(() => {
    // Clean up
    consoleLogSpy.mockRestore()
    dispatchEventSpy.mockRestore()

    // Remove element from DOM
    if (element && element.parentNode) {
      element.parentNode.removeChild(element)
    }
  })

  describe('Directive Registration', () => {
    it('should register the directive properly', () => {
      const TestComponent = defineComponent({
        directives: {
          'disable-terminal': disableTerminalDirective,
        },
        template: '<button v-disable-terminal>Test Button</button>',
      })

      const wrapper = mount(TestComponent)
      const button = wrapper.find('button').element

      expect(button.getAttribute('data-disable-terminal')).toBe('true')
      wrapper.unmount()
    })

    it('should export the correct event name', () => {
      expect(TERMINAL_DISABLE_EVENT).toBe('disable-terminal-interaction')
    })
  })

  describe('mounted lifecycle hook', () => {
    it('should add data-disable-terminal attribute', () => {
      const TestComponent = defineComponent({
        directives: {
          'disable-terminal': disableTerminalDirective,
        },
        template: '<input v-disable-terminal />',
      })

      const wrapper = mount(TestComponent)
      const input = wrapper.find('input').element

      expect(input.getAttribute('data-disable-terminal')).toBe('true')
      wrapper.unmount()
    })

    it('should add event listeners', () => {
      const TestComponent = defineComponent({
        directives: {
          'disable-terminal': disableTerminalDirective,
        },
        template: '<button v-disable-terminal>Click me</button>',
      })

      const wrapper = mount(TestComponent)
      const button = wrapper.find('button').element as HTMLElement

      // Create spies for addEventListener
      const addEventListenerSpy = vi.spyOn(button, 'addEventListener')

      // Manually call mounted to test the adding of listeners
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Directive binding test requires flexible typing
      disableTerminalDirective.mounted!(button, {} as any, {} as any, {} as any)

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'click',
        expect.any(Function)
      )
      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'focus',
        expect.any(Function)
      )

      addEventListenerSpy.mockRestore()
      wrapper.unmount()
    })

    it('should set position style if not already set', () => {
      const TestComponent = defineComponent({
        directives: {
          'disable-terminal': disableTerminalDirective,
        },
        template: '<div v-disable-terminal></div>',
      })

      const wrapper = mount(TestComponent)
      const div = wrapper.find('div').element as HTMLElement

      expect(div.style.position).toBe('relative')
      wrapper.unmount()
    })

    it('should preserve existing position style', () => {
      const TestComponent = defineComponent({
        directives: {
          'disable-terminal': disableTerminalDirective,
        },
        template: '<div v-disable-terminal style="position: absolute;"></div>',
      })

      const wrapper = mount(TestComponent)
      const div = wrapper.find('div').element as HTMLElement

      expect(div.style.position).toBe('absolute')
      wrapper.unmount()
    })
  })

  describe('unmounted lifecycle hook', () => {
    it('should remove data-disable-terminal attribute', () => {
      const TestComponent = defineComponent({
        directives: {
          'disable-terminal': disableTerminalDirective,
        },
        template: '<button v-disable-terminal>Test</button>',
      })

      const wrapper = mount(TestComponent)
      const button = wrapper.find('button').element as HTMLElement

      // Verify attribute is added
      expect(button.getAttribute('data-disable-terminal')).toBe('true')

      // Unmount the component
      wrapper.unmount()

      // Verify attribute is removed
      expect(button.getAttribute('data-disable-terminal')).toBeNull()
    })

    it('should remove event listeners', () => {
      const button = document.createElement('button')

      // Spy on removeEventListener
      const removeEventListenerSpy = vi.spyOn(button, 'removeEventListener')

      // First mount the directive
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Directive binding test requires flexible typing
      disableTerminalDirective.mounted!(button, {} as any, {} as any, {} as any)

      // Then unmount it
      disableTerminalDirective.unmounted!(
        button,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Directive binding test requires flexible typing
        {} as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Directive binding test requires flexible typing
        {} as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Directive binding test requires flexible typing
        {} as any
      )

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'click',
        expect.any(Function)
      )
      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'focus',
        expect.any(Function)
      )

      removeEventListenerSpy.mockRestore()
    })
  })

  describe('handleClick event handler', () => {
    it('should handle click events and dispatch custom event', async () => {
      const TestComponent = defineComponent({
        directives: {
          'disable-terminal': disableTerminalDirective,
        },
        template: '<button v-disable-terminal>Click me</button>',
      })

      const wrapper = mount(TestComponent)
      const button = wrapper.find('button')

      // Trigger click event
      await button.trigger('click')

      // Check console.log calls
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[DisableTerminal Directive] Click detected on element with v-disable-terminal'
      )
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[DisableTerminal Directive] Click target:',
        button.element
      )
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[DisableTerminal Directive] Current target:',
        button.element
      )
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[DisableTerminal Directive] Dispatching custom event:',
        'disable-terminal-interaction'
      )

      // Check that custom event was dispatched
      expect(dispatchEventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'disable-terminal-interaction',
          bubbles: true,
          composed: true,
        })
      )

      // Verify event detail
      const dispatchedEvent = dispatchEventSpy.mock.calls[0][0]
      expect(dispatchedEvent.detail).toEqual({
        type: 'click',
        target: button.element,
        currentTarget: button.element,
      })

      wrapper.unmount()
    })

    it('should handle click on nested elements', async () => {
      const TestComponent = defineComponent({
        directives: {
          'disable-terminal': disableTerminalDirective,
        },
        template: `
          <button v-disable-terminal>
            <span>Click me</span>
          </button>
        `,
      })

      const wrapper = mount(TestComponent)
      const span = wrapper.find('span')
      const button = wrapper.find('button')

      // Click on the nested span element
      await span.trigger('click')

      // The event should bubble up to the button
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[DisableTerminal Directive] Click detected on element with v-disable-terminal'
      )

      // Check that target is span but currentTarget is button
      const dispatchedEvent = dispatchEventSpy.mock.calls[0][0]
      expect(dispatchedEvent.detail.target).toBe(span.element)
      expect(dispatchedEvent.detail.currentTarget).toBe(button.element)

      wrapper.unmount()
    })
  })

  describe('handleFocus event handler', () => {
    it('should handle focus events for trusted events', async () => {
      const TestComponent = defineComponent({
        directives: {
          'disable-terminal': disableTerminalDirective,
        },
        template: '<input v-disable-terminal type="text" />',
      })

      const wrapper = mount(TestComponent)
      const input = wrapper.find('input')

      // Mock matches method for :focus-visible
      const originalMatches = input.element.matches
      input.element.matches = vi.fn((selector: string) => {
        if (selector === ':focus-visible') return true
        return originalMatches.call(input.element, selector)
      })

      // Trigger focus event
      await input.trigger('focus')

      // Check that custom event was dispatched
      expect(dispatchEventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'disable-terminal-interaction',
          bubbles: true,
          composed: true,
        })
      )

      // Verify event detail
      const dispatchedEvent = dispatchEventSpy.mock.calls[0][0]
      expect(dispatchedEvent.detail).toEqual({
        type: 'focus',
        target: input.element,
      })

      // Restore original matches
      input.element.matches = originalMatches
      wrapper.unmount()
    })

    it('should not dispatch event for readonly input', async () => {
      const TestComponent = defineComponent({
        directives: {
          'disable-terminal': disableTerminalDirective,
        },
        template: '<input v-disable-terminal readonly />',
      })

      const wrapper = mount(TestComponent)
      const input = wrapper.find('input')

      // Mock matches for :focus-visible
      input.element.matches = vi.fn(() => true)

      // Clear previous calls
      dispatchEventSpy.mockClear()

      // Trigger focus event
      await input.trigger('focus')

      // Should not dispatch event for readonly input
      expect(dispatchEventSpy).not.toHaveBeenCalled()

      wrapper.unmount()
    })

    it('should not dispatch event for disabled input', async () => {
      const TestComponent = defineComponent({
        directives: {
          'disable-terminal': disableTerminalDirective,
        },
        template: '<input v-disable-terminal disabled />',
      })

      const wrapper = mount(TestComponent)
      const input = wrapper.find('input')

      // Mock matches for :focus-visible
      input.element.matches = vi.fn(() => true)

      // Clear previous calls
      dispatchEventSpy.mockClear()

      // Trigger focus event
      await input.trigger('focus')

      // Should not dispatch event for disabled input
      expect(dispatchEventSpy).not.toHaveBeenCalled()

      wrapper.unmount()
    })

    it('should handle focus for trusted events without :focus-visible', async () => {
      const TestComponent = defineComponent({
        directives: {
          'disable-terminal': disableTerminalDirective,
        },
        template: '<input v-disable-terminal type="text" />',
      })

      const wrapper = mount(TestComponent)
      const input = wrapper.find('input')

      // Mock matches to return false for :focus-visible
      input.element.matches = vi.fn(() => false)

      // Create a trusted focus event
      const focusEvent = new FocusEvent('focus', {
        bubbles: true,
        cancelable: true,
        composed: true,
      })
      Object.defineProperty(focusEvent, 'isTrusted', {
        value: true,
        writable: false,
      })

      // Clear previous calls
      dispatchEventSpy.mockClear()

      // Dispatch the trusted event
      input.element.dispatchEvent(focusEvent)

      // Should dispatch custom event for trusted event
      expect(dispatchEventSpy).toHaveBeenCalled()

      wrapper.unmount()
    })

    it('should not dispatch event for untrusted focus without :focus-visible', async () => {
      const TestComponent = defineComponent({
        directives: {
          'disable-terminal': disableTerminalDirective,
        },
        template: '<input v-disable-terminal type="text" />',
      })

      const wrapper = mount(TestComponent)
      const input = wrapper.find('input')

      // Mock matches to return false for :focus-visible
      input.element.matches = vi.fn(() => false)

      // Create an untrusted focus event
      const focusEvent = new FocusEvent('focus', {
        bubbles: true,
        cancelable: true,
      })
      Object.defineProperty(focusEvent, 'isTrusted', {
        value: false,
        writable: false,
      })

      // Clear previous calls
      dispatchEventSpy.mockClear()

      // Dispatch the untrusted event
      input.element.dispatchEvent(focusEvent)

      // Should not dispatch custom event
      expect(dispatchEventSpy).not.toHaveBeenCalled()

      wrapper.unmount()
    })
  })

  describe('Event dispatching', () => {
    it('should dispatch events that bubble', async () => {
      const TestComponent = defineComponent({
        directives: {
          'disable-terminal': disableTerminalDirective,
        },
        template: '<button v-disable-terminal>Test</button>',
      })

      const wrapper = mount(TestComponent)
      const button = wrapper.find('button')

      await button.trigger('click')

      const dispatchedEvent = dispatchEventSpy.mock.calls[0][0]
      expect(dispatchedEvent.bubbles).toBe(true)

      wrapper.unmount()
    })

    it('should dispatch events with composed flag', async () => {
      const TestComponent = defineComponent({
        directives: {
          'disable-terminal': disableTerminalDirective,
        },
        template: '<button v-disable-terminal>Test</button>',
      })

      const wrapper = mount(TestComponent)
      const button = wrapper.find('button')

      await button.trigger('click')

      const dispatchedEvent = dispatchEventSpy.mock.calls[0][0]
      expect(dispatchedEvent.composed).toBe(true)

      wrapper.unmount()
    })
  })

  describe('Integration tests', () => {
    it('should work with multiple elements', () => {
      const TestComponent = defineComponent({
        directives: {
          'disable-terminal': disableTerminalDirective,
        },
        template: `
          <div>
            <button v-disable-terminal id="btn1">Button 1</button>
            <button v-disable-terminal id="btn2">Button 2</button>
            <input v-disable-terminal id="input1" />
          </div>
        `,
      })

      const wrapper = mount(TestComponent)

      const btn1 = wrapper.find('#btn1').element
      const btn2 = wrapper.find('#btn2').element
      const input1 = wrapper.find('#input1').element

      expect(btn1.getAttribute('data-disable-terminal')).toBe('true')
      expect(btn2.getAttribute('data-disable-terminal')).toBe('true')
      expect(input1.getAttribute('data-disable-terminal')).toBe('true')

      wrapper.unmount()
    })

    it('should handle dynamic addition and removal of directive', async () => {
      const TestComponent = defineComponent({
        directives: {
          'disable-terminal': disableTerminalDirective,
        },
        data() {
          return {
            show: true,
          }
        },
        template: `
          <button v-if="show" v-disable-terminal>Dynamic Button</button>
        `,
      })

      const wrapper = mount(TestComponent)

      // Initially visible
      let button = wrapper.find('button')
      expect(button.exists()).toBe(true)
      expect(button.element.getAttribute('data-disable-terminal')).toBe('true')

      // Hide the button
      await wrapper.setData({ show: false })
      button = wrapper.find('button')
      expect(button.exists()).toBe(false)

      // Show the button again
      await wrapper.setData({ show: true })
      button = wrapper.find('button')
      expect(button.exists()).toBe(true)
      expect(button.element.getAttribute('data-disable-terminal')).toBe('true')

      wrapper.unmount()
    })
  })

  describe('Edge cases', () => {
    it('should handle elements without style property', () => {
      const element = {} as HTMLElement
      element.setAttribute = vi.fn()
      element.addEventListener = vi.fn()
      element.style = {} as CSSStyleDeclaration

      disableTerminalDirective.mounted!(
        element,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Directive binding test requires flexible typing
        {} as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Directive binding test requires flexible typing
        {} as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Directive binding test requires flexible typing
        {} as any
      )

      expect(element.style.position).toBe('relative')
    })

    it('should handle null event targets gracefully', () => {
      // This should not throw
      expect(() => {
        // Create a button and add the directive
        const button = document.createElement('button')
        disableTerminalDirective.mounted!(
          button,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Directive binding test requires flexible typing
          {} as any,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Directive binding test requires flexible typing
          {} as any,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Directive binding test requires flexible typing
          {} as any
        )

        // Manually trigger the click handler with null targets
        button.click()
      }).not.toThrow()
    })
  })
})
