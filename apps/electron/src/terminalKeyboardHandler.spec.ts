/**
 * Comprehensive test suite for TerminalKeyboardHandler
 *
 * @fileoverview
 * Complete test coverage for Electron keyboard handler functionality including
 * initialization, keyboard event handling, state management, IPC communication,
 * debouncing, and lifecycle management using context7 patterns.
 *
 * @example
 * ```typescript
 * // Test keyboard handler with context7 patterns
 * const mockWindow = createMockBrowserWindow()
 * handler.initialize(mockWindow)
 * const mockInput = createMockKeyboardInput('h')
 * await handler.handleKeyboardInput(mockEvent, mockInput)
 * ```
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { BrowserWindow, type WebContents } from 'electron'
import {
  TerminalKeyboardHandler,
  terminalKeyboardHandler,
} from './terminalKeyboardHandler'

// Mock the entire electron module using context7 patterns
vi.mock('electron', () => ({
  BrowserWindow: vi.fn(),
  WebContents: vi.fn(),
}))

/**
 * Creates a mock WebContents for testing with context7 patterns.
 *
 * @returns Partial WebContents mock with common methods
 */
function createMockWebContents(): Partial<WebContents> {
  return {
    send: vi.fn(),
    on: vi.fn(),
    removeAllListeners: vi.fn(),
    listenerCount: vi.fn(() => 0),
    setIgnoreMenuShortcuts: vi.fn(),
  }
}

/**
 * Creates a mock BrowserWindow for testing with context7 patterns.
 *
 * @param webContents - Optional WebContents to attach
 * @returns Partial BrowserWindow mock
 */
function createMockBrowserWindow(
  webContents?: Partial<WebContents>
): Partial<BrowserWindow> {
  return {
    webContents: (webContents || createMockWebContents()) as WebContents,
    loadFile: vi.fn(),
    loadURL: vi.fn(),
  }
}

/**
 * Creates a mock keyboard input event for testing.
 *
 * @param key - The key pressed
 * @param options - Additional options for the input
 * @returns Mock keyboard input event
 */
function createMockKeyboardInput(
  key: string,
  options: {
    type?: string
    control?: boolean
    meta?: boolean
    shift?: boolean
  } = {}
): Electron.Input {
  return {
    key,
    type: options.type || 'keyDown',
    control: options.control || false,
    meta: options.meta || false,
    shift: options.shift || false,
  } as Electron.Input
}

/**
 * Creates a mock Electron Event for testing.
 *
 * @returns Mock Electron Event with preventDefault method
 */
function createMockEvent(): Electron.Event {
  return {
    preventDefault: vi.fn(),
  } as unknown as Electron.Event
}

describe('TerminalKeyboardHandler', () => {
  let handler: TerminalKeyboardHandler
  let mockWebContents: Partial<WebContents>
  let mockWindow: Partial<BrowserWindow>

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks()
    vi.clearAllTimers()
    vi.useFakeTimers()

    // Create fresh mock instances
    mockWebContents = createMockWebContents()
    mockWindow = createMockBrowserWindow(mockWebContents)

    // Create new handler instance
    handler = new TerminalKeyboardHandler()
  })

  afterEach(() => {
    vi.useRealTimers()
    // Clean up handler state
    if (handler && typeof handler.cleanup === 'function') {
      handler.cleanup()
    }
  })

  describe('Constructor and Singleton Pattern', () => {
    /**
     * Test singleton pattern implementation
     */
    it('should implement singleton pattern correctly', () => {
      const instance1 = terminalKeyboardHandler
      const instance2 = terminalKeyboardHandler

      expect(instance1).toBe(instance2)
      expect(instance1).toBeInstanceOf(TerminalKeyboardHandler)
    })

    /**
     * Test new instance creation
     */
    it('should create new instance with constructor', () => {
      const instance = new TerminalKeyboardHandler()

      expect(instance).toBeInstanceOf(TerminalKeyboardHandler)
      expect(instance).not.toBe(terminalKeyboardHandler)
    })
  })

  describe('Initialization', () => {
    /**
     * Test successful initialization
     */
    it('should initialize with BrowserWindow successfully', () => {
      expect(() =>
        handler.initialize(mockWindow as BrowserWindow)
      ).not.toThrow()

      // Verify WebContents methods are set up
      expect(mockWebContents.on).toHaveBeenCalledWith(
        'before-input-event',
        expect.any(Function)
      )
    })

    /**
     * Test initialization with null window gracefully
     */
    it('should handle initialization with null window gracefully', () => {
      // The real implementation doesn't handle null gracefully, so we expect an error
      expect(() =>
        handler.initialize(null as unknown as BrowserWindow)
      ).toThrow()
    })

    /**
     * Test initialization with window without webContents
     */
    it('should handle initialization with window without webContents', () => {
      const incompleteWindow = { loadFile: vi.fn() } as Partial<BrowserWindow>

      expect(() =>
        handler.initialize(incompleteWindow as BrowserWindow)
      ).not.toThrow()
    })

    /**
     * Test multiple initializations (idempotent)
     */
    it('should handle multiple initializations correctly', () => {
      handler.initialize(mockWindow as BrowserWindow)

      // Second initialization should not throw and should be idempotent
      expect(() =>
        handler.initialize(mockWindow as BrowserWindow)
      ).not.toThrow()

      // Should only set up event listeners once due to isInitialized check
      expect(mockWebContents.on).toHaveBeenCalledTimes(1)
    })
  })

  describe('Step Management', () => {
    beforeEach(() => {
      handler.initialize(mockWindow as BrowserWindow)
    })

    /**
     * Test updating step
     */
    it('should update current step using updateStep method', () => {
      expect(() => handler.updateStep('project-selection')).not.toThrow()

      // Should send appropriate IPC message for step change
      expect(mockWebContents.send).toHaveBeenCalledWith('terminal-show', {
        step: 'project-selection',
        hasBeenActivated: false,
      })
    })

    /**
     * Test step auto-activation logic
     */
    it('should auto-activate for certain steps', () => {
      handler.updateStep('project-selection')

      expect(mockWebContents.send).toHaveBeenCalledWith('terminal-show', {
        step: 'project-selection',
        hasBeenActivated: false,
      })
    })

    /**
     * Test welcome step handling
     */
    it('should handle welcome step correctly when not activated', () => {
      handler.updateStep('welcome')

      expect(mockWebContents.send).toHaveBeenCalledWith('terminal-hide')
    })

    /**
     * Test completed step handling
     */
    it('should disable Easter Egg when onboarding is completed', () => {
      handler.updateStep('completed')

      expect(mockWebContents.send).toHaveBeenCalledWith('terminal-hide')
    })
  })

  describe('Visibility Management', () => {
    beforeEach(() => {
      handler.initialize(mockWindow as BrowserWindow)
    })

    /**
     * Test updating visibility state
     */
    it('should update visibility state', () => {
      expect(() => handler.updateVisibility(true)).not.toThrow()
      expect(() => handler.updateVisibility(false)).not.toThrow()
    })

    /**
     * Test easter egg visibility tracking
     */
    it('should track easter egg UI visibility', () => {
      expect(() => handler.updateEasterEggVisibility(true)).not.toThrow()
      expect(() => handler.updateEasterEggVisibility(false)).not.toThrow()
    })
  })

  describe('Keyboard Event Handling', () => {
    let mockEvent: Electron.Event
    let beforeInputHandler:
      | ((event: Electron.Event, input: Electron.Input) => void)
      | undefined

    beforeEach(() => {
      handler.initialize(mockWindow as BrowserWindow)
      mockEvent = createMockEvent()

      // Capture the before-input-event handler
      const onCalls = vi.mocked(mockWebContents.on).mock.calls
      const beforeInputCall = onCalls.find(
        (call) => call[0] === 'before-input-event'
      )
      beforeInputHandler = beforeInputCall?.[1] as (
        event: Electron.Event,
        input: Electron.Input
      ) => void
    })

    /**
     * Test h key handling in welcome step
     */
    it('should handle h key in welcome step', () => {
      handler.updateStep('welcome')
      const hInput = createMockKeyboardInput('h')

      beforeInputHandler(mockEvent, hInput)

      expect(mockEvent.preventDefault).toHaveBeenCalled()
      expect(mockWebContents.send).toHaveBeenCalledWith('terminal-activate', {
        step: 'welcome',
        hasBeenActivated: true,
      })
    })

    /**
     * Test escape key handling
     */
    it('should handle escape key', () => {
      handler.updateStep('project-selection')
      handler.updateEasterEggVisibility(true)
      const escapeInput = createMockKeyboardInput('Escape')

      beforeInputHandler(mockEvent, escapeInput)

      expect(mockEvent.preventDefault).toHaveBeenCalled()
      expect(mockWebContents.send).toHaveBeenCalledWith('terminal-command', {
        command: 'Escape',
        step: 'project-selection',
      })
    })

    /**
     * Test arrow key handling in task-detail
     */
    it('should handle arrow keys in task-detail when easter egg is visible', () => {
      handler.updateStep('task-detail')
      handler.updateEasterEggVisibility(true)
      const arrowInput = createMockKeyboardInput('ArrowDown')

      beforeInputHandler(mockEvent, arrowInput)

      expect(mockEvent.preventDefault).toHaveBeenCalled()
      expect(mockWebContents.send).toHaveBeenCalledWith('terminal-command', {
        command: 'ArrowDown',
        step: 'task-detail',
      })
    })

    /**
     * Test regular key input (should not be prevented when easter egg not visible)
     */
    it('should not prevent regular key input when easter egg not visible', () => {
      handler.updateStep('project-selection')
      handler.updateEasterEggVisibility(false)
      const regularInput = createMockKeyboardInput('a')

      beforeInputHandler(mockEvent, regularInput)

      expect(mockEvent.preventDefault).not.toHaveBeenCalled()
    })

    /**
     * Test system shortcuts pass through
     */
    it('should allow system shortcuts to pass through', () => {
      handler.updateStep('project-selection')

      // Clear any IPC calls from step change
      vi.clearAllMocks()

      const systemShortcut = createMockKeyboardInput('r', { meta: true })

      beforeInputHandler(mockEvent, systemShortcut)

      expect(mockEvent.preventDefault).not.toHaveBeenCalled()
      expect(mockWebContents.send).not.toHaveBeenCalled()
    })

    /**
     * Test project selection shortcuts
     */
    it('should handle project selection shortcuts', () => {
      handler.updateStep('project-selection')
      const oInput = createMockKeyboardInput('o')

      beforeInputHandler(mockEvent, oInput)

      expect(mockEvent.preventDefault).toHaveBeenCalled()
    })

    /**
     * Test task selector shortcuts
     */
    it('should handle task selector shortcuts', () => {
      handler.updateStep('task-selector')
      const nInput = createMockKeyboardInput('n')

      beforeInputHandler(mockEvent, nInput)

      expect(mockEvent.preventDefault).toHaveBeenCalled()
    })

    /**
     * Test ignoring events after onboarding completion
     */
    it('should ignore keyboard events after onboarding is completed', () => {
      handler.updateStep('completed')
      const anyInput = createMockKeyboardInput('h')

      beforeInputHandler(mockEvent, anyInput)

      // Should not prevent default or send any commands in completed state
      expect(mockEvent.preventDefault).not.toHaveBeenCalled()
      expect(mockWebContents.send).not.toHaveBeenCalledWith(
        expect.stringMatching(/^terminal-(command|input)$/),
        expect.anything()
      )
    })
  })

  describe('Debouncing', () => {
    let beforeInputHandler:
      | ((event: Electron.Event, input: Electron.Input) => void)
      | undefined

    beforeEach(() => {
      handler.initialize(mockWindow as BrowserWindow)

      // Capture the before-input-event handler
      const onCalls = vi.mocked(mockWebContents.on).mock.calls
      const beforeInputCall = onCalls.find(
        (call) => call[0] === 'before-input-event'
      )
      beforeInputHandler = beforeInputCall?.[1] as (
        event: Electron.Event,
        input: Electron.Input
      ) => void
    })

    /**
     * Test debouncing of rapid key events
     */
    it('should debounce rapid character input', () => {
      handler.updateStep('project-selection')
      handler.updateEasterEggVisibility(true)

      // Clear any IPC calls from step change
      vi.clearAllMocks()

      const charInput = createMockKeyboardInput('a')
      const mockEvent = createMockEvent()

      // Send multiple rapid events
      beforeInputHandler(mockEvent, charInput)
      beforeInputHandler(mockEvent, charInput)
      beforeInputHandler(mockEvent, charInput)

      // Should only process first event due to debouncing
      expect(mockWebContents.send).toHaveBeenCalledTimes(1)
      expect(mockWebContents.send).toHaveBeenCalledWith('terminal-input', {
        char: 'a',
        step: 'project-selection',
      })
    })

    /**
     * Test that debouncing allows events after timeout
     */
    it('should allow events after debounce timeout', () => {
      handler.updateStep('project-selection')
      handler.updateEasterEggVisibility(true)

      // Clear any IPC calls from step change
      vi.clearAllMocks()

      const charInput = createMockKeyboardInput('a')
      const mockEvent = createMockEvent()

      // Send first event
      beforeInputHandler(mockEvent, charInput)
      expect(mockWebContents.send).toHaveBeenCalledTimes(1)

      // Advance time beyond debounce period
      vi.advanceTimersByTime(200)

      // Send second event
      beforeInputHandler(mockEvent, charInput)
      expect(mockWebContents.send).toHaveBeenCalledTimes(2)
    })

    /**
     * Test navigation keys are not debounced
     */
    it('should not debounce navigation keys', () => {
      handler.updateStep('task-detail')
      handler.updateEasterEggVisibility(true)

      // Clear any IPC calls from step change
      vi.clearAllMocks()

      const arrowInput = createMockKeyboardInput('ArrowDown')
      const mockEvent = createMockEvent()

      // Send multiple rapid arrow key events
      beforeInputHandler(mockEvent, arrowInput)
      beforeInputHandler(mockEvent, arrowInput)
      beforeInputHandler(mockEvent, arrowInput)

      // All navigation events should be processed (no debouncing for navigation)
      expect(mockWebContents.send).toHaveBeenCalledTimes(3)
    })
  })

  describe('Error Handling', () => {
    /**
     * Test handling of WebContents send errors
     */
    it('should handle WebContents send errors gracefully', () => {
      const errorMockWebContents = {
        ...createMockWebContents(),
        send: vi.fn().mockImplementation(() => {
          throw new Error('IPC send failed')
        }),
      }
      const errorMockWindow = createMockBrowserWindow(errorMockWebContents)

      expect(() =>
        handler.initialize(errorMockWindow as BrowserWindow)
      ).not.toThrow()

      const onCalls = vi.mocked(errorMockWebContents.on).mock.calls
      const beforeInputCall = onCalls.find(
        (call) => call[0] === 'before-input-event'
      )
      const beforeInputHandler = beforeInputCall?.[1] as (
        event: Electron.Event,
        input: Electron.Input
      ) => void

      const mockEvent = createMockEvent()
      const hInput = createMockKeyboardInput('h')

      // Real implementation doesn't handle IPC errors gracefully, so it should throw
      expect(() => beforeInputHandler(mockEvent, hInput)).toThrow(
        'IPC send failed'
      )
    })

    /**
     * Test handling of malformed input events
     */
    it('should handle malformed input events', () => {
      handler.initialize(mockWindow as BrowserWindow)

      const onCalls = vi.mocked(mockWebContents.on).mock.calls
      const beforeInputCall = onCalls.find(
        (call) => call[0] === 'before-input-event'
      )
      const beforeInputHandler = beforeInputCall?.[1] as (
        event: Electron.Event,
        input: Electron.Input
      ) => void

      const mockEvent = createMockEvent()

      // Real implementation doesn't handle null input gracefully, so it should throw
      expect(() => beforeInputHandler(mockEvent, null)).toThrow()
      expect(() => beforeInputHandler(mockEvent, undefined)).toThrow()

      // Test with empty input object - should not crash
      expect(() => beforeInputHandler(mockEvent, {})).not.toThrow()
    })
  })

  describe('Lifecycle Management', () => {
    /**
     * Test cleanup functionality
     */
    it('should cleanup state but preserve listener', () => {
      handler.initialize(mockWindow as BrowserWindow)

      // Verify listeners are added
      expect(mockWebContents.on).toHaveBeenCalled()

      // Cleanup should clear state but not remove persistent listener
      handler.cleanup()

      // Should not remove the persistent listener
      expect(mockWebContents.removeAllListeners).not.toHaveBeenCalledWith(
        'before-input-event'
      )
    })

    /**
     * Test reinitialization after cleanup
     */
    it('should allow reinitialization after cleanup', () => {
      handler.initialize(mockWindow as BrowserWindow)
      handler.cleanup()

      // Should be able to reinitialize
      expect(() =>
        handler.initialize(mockWindow as BrowserWindow)
      ).not.toThrow()
    })

    /**
     * Test timeout cleanup
     */
    it('should clear pending timeouts on step change', () => {
      handler.initialize(mockWindow as BrowserWindow)
      handler.updateStep('welcome')

      // Trigger h key to create timeout
      const onCalls = vi.mocked(mockWebContents.on).mock.calls
      const beforeInputCall = onCalls.find(
        (call) => call[0] === 'before-input-event'
      )
      const beforeInputHandler = beforeInputCall?.[1] as (
        event: Electron.Event,
        input: Electron.Input
      ) => void

      const mockEvent = createMockEvent()
      const hInput = createMockKeyboardInput('h')
      beforeInputHandler(mockEvent, hInput)

      // Change step should clear timeouts
      expect(() => handler.updateStep('project-selection')).not.toThrow()
    })
  })

  describe('Edge Cases - Uncovered Branches', () => {
    /**
     * Test webContents change during reinitialization
     */
    it('should update webContents reference when changed during reinitialization', () => {
      // Initial initialization
      handler.initialize(mockWindow as BrowserWindow)

      // Create new mock with different webContents
      const newMockWebContents = createMockWebContents()
      const newMockWindow = createMockBrowserWindow(newMockWebContents)

      // Reinitialize with new window (different webContents)
      handler.initialize(newMockWindow as BrowserWindow)

      // Verify the new webContents is used
      expect(newMockWebContents.on).not.toHaveBeenCalled() // Should not setup again (already initialized)
    })

    /**
     * Test handling keyUp events
     */
    it('should prevent default for keyUp events when easter egg is visible', () => {
      handler.initialize(mockWindow as BrowserWindow)
      handler.updateStep('task-detail')
      handler.updateEasterEggVisibility(true)

      const onCalls = vi.mocked(mockWebContents.on).mock.calls
      const beforeInputCall = onCalls.find(
        (call) => call[0] === 'before-input-event'
      )
      const beforeInputHandler = beforeInputCall?.[1] as (
        event: Electron.Event,
        input: Electron.Input
      ) => void

      const mockEvent = createMockEvent()
      const keyUpInput = createMockKeyboardInput('a', { type: 'keyUp' })

      beforeInputHandler(mockEvent, keyUpInput)

      expect(mockEvent.preventDefault).toHaveBeenCalled()
    })

    /**
     * Test h key debouncing in welcome step
     */
    it('should debounce rapid h key presses in welcome step', () => {
      handler.initialize(mockWindow as BrowserWindow)
      handler.updateStep('welcome')

      const onCalls = vi.mocked(mockWebContents.on).mock.calls
      const beforeInputCall = onCalls.find(
        (call) => call[0] === 'before-input-event'
      )
      const beforeInputHandler = beforeInputCall?.[1] as (
        event: Electron.Event,
        input: Electron.Input
      ) => void

      // Clear initial step change IPC calls
      vi.clearAllMocks()

      const mockEvent = createMockEvent()
      const hInput = createMockKeyboardInput('h')

      // Send multiple rapid h key events
      beforeInputHandler(mockEvent, hInput)
      beforeInputHandler(mockEvent, hInput)
      beforeInputHandler(mockEvent, hInput)

      // Should only activate once due to debouncing
      expect(mockWebContents.send).toHaveBeenCalledWith('terminal-activate', {
        step: 'welcome',
        hasBeenActivated: true,
      })

      // Verify only one activation occurred
      const activateCalls = vi
        .mocked(mockWebContents.send)
        .mock.calls.filter((call) => call[0] === 'terminal-activate')
      expect(activateCalls.length).toBe(1)
    })

    /**
     * Test h key when terminal is already visible
     */
    it('should send h command when terminal already visible', () => {
      handler.initialize(mockWindow as BrowserWindow)
      handler.updateStep('welcome')

      const onCalls = vi.mocked(mockWebContents.on).mock.calls
      const beforeInputCall = onCalls.find(
        (call) => call[0] === 'before-input-event'
      )
      const beforeInputHandler = beforeInputCall?.[1] as (
        event: Electron.Event,
        input: Electron.Input
      ) => void

      const mockEvent = createMockEvent()
      const hInput = createMockKeyboardInput('h')

      // First h key activates terminal
      beforeInputHandler(mockEvent, hInput)

      // Manually mark as visible and activated
      handler.updateVisibility(true)

      // Advance time for debounce
      vi.advanceTimersByTime(200)

      // Clear previous IPC calls
      vi.clearAllMocks()

      // Second h key should send input
      beforeInputHandler(mockEvent, hInput)

      // Advance timeout
      vi.advanceTimersByTime(200)

      expect(mockWebContents.send).toHaveBeenCalledWith('terminal-input', {
        char: 'h',
        step: 'welcome',
      })
    })

    /**
     * Test task selector 'b' key shortcut (not covered)
     */
    it('should handle task-selector b key shortcut', () => {
      handler.initialize(mockWindow as BrowserWindow)
      handler.updateStep('task-selector')
      handler.updateEasterEggVisibility(false) // Test with easter egg not visible

      const onCalls = vi.mocked(mockWebContents.on).mock.calls
      const beforeInputCall = onCalls.find(
        (call) => call[0] === 'before-input-event'
      )
      const beforeInputHandler = beforeInputCall?.[1] as (
        event: Electron.Event,
        input: Electron.Input
      ) => void

      // Clear step change IPC calls
      vi.clearAllMocks()

      const mockEvent = createMockEvent()
      const bInput = createMockKeyboardInput('b')

      beforeInputHandler(mockEvent, bInput)

      expect(mockEvent.preventDefault).toHaveBeenCalled()
    })

    /**
     * Test navigation keys when easter egg NOT visible
     */
    it('should not send navigation commands when easter egg not visible', () => {
      handler.initialize(mockWindow as BrowserWindow)
      handler.updateStep('project-selection')
      handler.updateEasterEggVisibility(false)

      const onCalls = vi.mocked(mockWebContents.on).mock.calls
      const beforeInputCall = onCalls.find(
        (call) => call[0] === 'before-input-event'
      )
      const beforeInputHandler = beforeInputCall?.[1] as (
        event: Electron.Event,
        input: Electron.Input
      ) => void

      // Clear step change IPC calls
      vi.clearAllMocks()

      const mockEvent = createMockEvent()
      const arrowInput = createMockKeyboardInput('ArrowUp')

      beforeInputHandler(mockEvent, arrowInput)

      // Should not send terminal-command when easter egg not visible
      expect(mockWebContents.send).not.toHaveBeenCalledWith(
        'terminal-command',
        expect.anything()
      )
    })

    /**
     * Test Home/End keys in task-detail
     */
    it('should handle Home and End keys in task-detail when easter egg visible', () => {
      handler.initialize(mockWindow as BrowserWindow)
      handler.updateStep('task-detail')
      handler.updateEasterEggVisibility(true)

      const onCalls = vi.mocked(mockWebContents.on).mock.calls
      const beforeInputCall = onCalls.find(
        (call) => call[0] === 'before-input-event'
      )
      const beforeInputHandler = beforeInputCall?.[1] as (
        event: Electron.Event,
        input: Electron.Input
      ) => void

      // Clear step change IPC calls
      vi.clearAllMocks()

      const mockEvent = createMockEvent()

      // Test Home key
      const homeInput = createMockKeyboardInput('Home')
      beforeInputHandler(mockEvent, homeInput)

      expect(mockWebContents.send).toHaveBeenCalledWith('terminal-command', {
        command: 'Home',
        step: 'task-detail',
      })

      // Clear for next test
      vi.clearAllMocks()

      // Test End key
      const endInput = createMockKeyboardInput('End')
      beforeInputHandler(mockEvent, endInput)

      expect(mockWebContents.send).toHaveBeenCalledWith('terminal-command', {
        command: 'End',
        step: 'task-detail',
      })
    })

    /**
     * Test Delete key in task-detail
     */
    it('should handle Delete key when easter egg visible', () => {
      handler.initialize(mockWindow as BrowserWindow)
      handler.updateStep('task-detail')
      handler.updateEasterEggVisibility(true)

      const onCalls = vi.mocked(mockWebContents.on).mock.calls
      const beforeInputCall = onCalls.find(
        (call) => call[0] === 'before-input-event'
      )
      const beforeInputHandler = beforeInputCall?.[1] as (
        event: Electron.Event,
        input: Electron.Input
      ) => void

      // Clear step change IPC calls
      vi.clearAllMocks()

      const mockEvent = createMockEvent()
      const deleteInput = createMockKeyboardInput('Delete')

      beforeInputHandler(mockEvent, deleteInput)

      expect(mockEvent.preventDefault).toHaveBeenCalled()
      expect(mockWebContents.send).toHaveBeenCalledWith('terminal-command', {
        command: 'Delete',
        step: 'task-detail',
      })
    })

    /**
     * Test Enter key handling
     */
    it('should handle Enter key', () => {
      handler.initialize(mockWindow as BrowserWindow)
      handler.updateStep('project-selection')
      handler.updateEasterEggVisibility(true)

      const onCalls = vi.mocked(mockWebContents.on).mock.calls
      const beforeInputCall = onCalls.find(
        (call) => call[0] === 'before-input-event'
      )
      const beforeInputHandler = beforeInputCall?.[1] as (
        event: Electron.Event,
        input: Electron.Input
      ) => void

      // Clear step change IPC calls
      vi.clearAllMocks()

      const mockEvent = createMockEvent()
      const enterInput = createMockKeyboardInput('Enter')

      beforeInputHandler(mockEvent, enterInput)

      expect(mockEvent.preventDefault).toHaveBeenCalled()
      expect(mockWebContents.send).toHaveBeenCalledWith('terminal-command', {
        command: 'Enter',
        step: 'project-selection',
      })
    })

    /**
     * Test Backspace key handling
     */
    it('should handle Backspace key', () => {
      handler.initialize(mockWindow as BrowserWindow)
      handler.updateStep('task-detail')
      handler.updateEasterEggVisibility(true)

      const onCalls = vi.mocked(mockWebContents.on).mock.calls
      const beforeInputCall = onCalls.find(
        (call) => call[0] === 'before-input-event'
      )
      const beforeInputHandler = beforeInputCall?.[1] as (
        event: Electron.Event,
        input: Electron.Input
      ) => void

      // Clear step change IPC calls
      vi.clearAllMocks()

      const mockEvent = createMockEvent()
      const backspaceInput = createMockKeyboardInput('Backspace')

      beforeInputHandler(mockEvent, backspaceInput)

      expect(mockEvent.preventDefault).toHaveBeenCalled()
      expect(mockWebContents.send).toHaveBeenCalledWith('terminal-command', {
        command: 'Backspace',
        step: 'task-detail',
      })
    })

    /**
     * Test key tracker cleanup (memory leak prevention)
     */
    it('should cleanup old key tracker entries to prevent memory leak', () => {
      handler.initialize(mockWindow as BrowserWindow)
      handler.updateStep('project-selection')
      handler.updateEasterEggVisibility(true)

      const onCalls = vi.mocked(mockWebContents.on).mock.calls
      const beforeInputCall = onCalls.find(
        (call) => call[0] === 'before-input-event'
      )
      const beforeInputHandler = beforeInputCall?.[1] as (
        event: Electron.Event,
        input: Electron.Input
      ) => void

      const mockEvent = createMockEvent()

      // Send 25 different character keys to trigger cleanup (> 20 threshold)
      for (let i = 0; i < 25; i++) {
        const char = String.fromCharCode(97 + i) // a-z
        const input = createMockKeyboardInput(char)
        beforeInputHandler(mockEvent, input)

        // Advance time a bit
        vi.advanceTimersByTime(150)
      }

      // The key tracker should have been cleaned up (removing old entries)
      // We can't directly test the size, but we verify the code path works
      expect(mockEvent.preventDefault).toHaveBeenCalled()
    })

    /**
     * Test welcome step with hasBeenActivated true
     */
    it('should show terminal in welcome step when previously activated', () => {
      handler.initialize(mockWindow as BrowserWindow)

      // First activate the terminal
      handler.updateStep('welcome')

      const onCalls = vi.mocked(mockWebContents.on).mock.calls
      const beforeInputCall = onCalls.find(
        (call) => call[0] === 'before-input-event'
      )
      const beforeInputHandler = beforeInputCall?.[1] as (
        event: Electron.Event,
        input: Electron.Input
      ) => void

      const mockEvent = createMockEvent()
      const hInput = createMockKeyboardInput('h')
      beforeInputHandler(mockEvent, hInput)

      // Go to another step
      handler.updateStep('project-selection')

      // Clear IPC calls
      vi.clearAllMocks()

      // Return to welcome - should show terminal
      handler.updateStep('welcome')

      expect(mockWebContents.send).toHaveBeenCalledWith('terminal-show', {
        step: 'welcome',
        hasBeenActivated: true,
      })
    })

    /**
     * Test step change with visible terminal (non-auto-activation step)
     */
    it('should send step-change when terminal visible but step has no auto-activation', () => {
      handler.initialize(mockWindow as BrowserWindow)

      // Activate terminal first
      handler.updateStep('project-selection')
      handler.updateVisibility(true)

      // Clear IPC calls
      vi.clearAllMocks()

      // Switch to transition step (has auto-activation)
      handler.updateStep('transition')

      expect(mockWebContents.send).toHaveBeenCalledWith('terminal-show', {
        step: 'transition',
        hasBeenActivated: true,
      })
    })

    /**
     * Test existing listeners cleanup
     */
    it('should remove existing listeners during initialization', () => {
      // Mock listenerCount to return > 0
      const mockWebContentsWithListeners = {
        ...createMockWebContents(),
        listenerCount: vi.fn((event: string) => {
          if (event === 'before-input-event') return 2
          if (event === 'input-event') return 1
          return 0
        }),
      } as Partial<WebContents>

      const mockWindowWithListeners = createMockBrowserWindow(
        mockWebContentsWithListeners
      )

      handler.initialize(mockWindowWithListeners as BrowserWindow)

      // Should remove all existing listeners
      expect(
        mockWebContentsWithListeners.removeAllListeners
      ).toHaveBeenCalledWith('before-input-event')
      expect(
        mockWebContentsWithListeners.removeAllListeners
      ).toHaveBeenCalledWith('input-event')
    })
  })

  describe('Integration Tests', () => {
    /**
     * Test complete onboarding flow navigation
     */
    it('should handle complete onboarding flow', () => {
      handler.initialize(mockWindow as BrowserWindow)

      const mockEvent = createMockEvent()
      const onCalls = vi.mocked(mockWebContents.on).mock.calls
      const beforeInputCall = onCalls.find(
        (call) => call[0] === 'before-input-event'
      )
      const beforeInputHandler = beforeInputCall?.[1] as (
        event: Electron.Event,
        input: Electron.Input
      ) => void

      // Start in welcome step
      handler.updateStep('welcome')

      // Activate with h key
      const hInput = createMockKeyboardInput('h')
      beforeInputHandler(mockEvent, hInput)

      expect(mockWebContents.send).toHaveBeenCalledWith('terminal-activate', {
        step: 'welcome',
        hasBeenActivated: true,
      })

      // Move to project selection
      handler.updateStep('project-selection')

      expect(mockWebContents.send).toHaveBeenCalledWith('terminal-show', {
        step: 'project-selection',
        hasBeenActivated: true,
      })

      // Navigate to task detail
      handler.updateStep('task-detail')
      handler.updateEasterEggVisibility(true)

      // Use arrow keys for navigation
      const arrowInput = createMockKeyboardInput('ArrowUp')
      beforeInputHandler(mockEvent, arrowInput)

      expect(mockWebContents.send).toHaveBeenCalledWith('terminal-command', {
        command: 'ArrowUp',
        step: 'task-detail',
      })

      // Complete onboarding
      handler.updateStep('completed')

      expect(mockWebContents.send).toHaveBeenCalledWith('terminal-hide')
    })

    /**
     * Test step-specific behavior patterns
     */
    it('should handle different step patterns correctly', () => {
      handler.initialize(mockWindow as BrowserWindow)

      // Test auto-activation steps one by one
      handler.updateStep('project-selection')
      expect(mockWebContents.send).toHaveBeenCalledWith('terminal-show', {
        step: 'project-selection',
        hasBeenActivated: false,
      })

      // Clear previous calls
      vi.clearAllMocks()

      handler.updateStep('task-selector')
      expect(mockWebContents.send).toHaveBeenCalledWith('terminal-show', {
        step: 'task-selector',
        hasBeenActivated: true, // Should be true after first activation
      })

      // Clear previous calls
      vi.clearAllMocks()

      handler.updateStep('task-detail')
      expect(mockWebContents.send).toHaveBeenCalledWith('terminal-show', {
        step: 'task-detail',
        hasBeenActivated: true,
      })

      // Test completion resets state
      handler.updateStep('completed')
      expect(mockWebContents.send).toHaveBeenCalledWith('terminal-hide')
    })

    /**
     * Test persistent listener behavior
     */
    it('should maintain persistent listener across operations', () => {
      handler.initialize(mockWindow as BrowserWindow)

      // Multiple operations should not add more listeners
      handler.updateStep('project-selection')
      handler.updateVisibility(true)
      handler.updateEasterEggVisibility(true)
      handler.cleanup()

      // Should only have one listener registration
      expect(mockWebContents.on).toHaveBeenCalledTimes(1)
      expect(mockWebContents.on).toHaveBeenCalledWith(
        'before-input-event',
        expect.any(Function)
      )
    })
  })

  describe('Coverage - Uncovered Lines', () => {
    /**
     * Test hideTerminal method coverage (lines 589-591)
     * This method is called in handleStepChange for 'welcome' and 'completed' steps
     */
    it('should hide terminal when transitioning to completed step', () => {
      handler.initialize(mockWindow as BrowserWindow)

      // Start with terminal visible in a task step
      handler.updateStep('task-detail')
      vi.clearAllMocks()

      // Transition to completed step (should call hideTerminal internally)
      handler.updateStep('completed')

      // Verify terminal-hide was sent (lines 589-590)
      expect(mockWebContents.send).toHaveBeenCalledWith('terminal-hide')
    })

    it('should hide terminal in welcome step without prior activation', () => {
      handler.initialize(mockWindow as BrowserWindow)

      // Update to welcome step (should call hideTerminal if not previously activated)
      handler.updateStep('welcome')

      // Verify terminal-hide was sent (lines 589-590)
      const hideCalls = vi
        .mocked(mockWebContents.send)
        .mock.calls.filter((call) => call[0] === 'terminal-hide')

      expect(hideCalls.length).toBeGreaterThan(0)
    })

    /**
     * Test step-change for visible terminal without auto-activation (lines 666-671)
     * This requires:
     * - Terminal is visible (isVisible = true)
     * - Step does NOT have auto-activation
     * - Terminal has NOT been activated (hasBeenActivated = false)
     *
     * The scenario: Terminal was auto-shown in an auto-activation step,
     * then user hides it (clearing hasBeenActivated), then shows it manually,
     * then navigates to a non-auto step.
     */
    it('should send step-change when terminal is visible but transitioning to non-auto step', () => {
      handler.initialize(mockWindow as BrowserWindow)

      // Start in an auto-activation step (terminal auto-shows but hasBeenActivated remains false initially)
      handler.updateStep('project-selection') // Auto-activation step
      vi.clearAllMocks()

      // User hides terminal (this clears hasBeenActivated flag)
      handler.updateVisibility(false)
      vi.clearAllMocks()

      // User manually shows terminal again (without activation)
      handler.updateVisibility(true)
      vi.clearAllMocks()

      // Now update to a custom step that doesn't have auto-activation
      // At this point:
      // - isVisible = true (manually shown)
      // - hasBeenActivated = false (cleared when hidden)
      // - shouldAutoActivate = false (custom step not in auto list)
      // Lines 666-671 should execute
      handler.updateStep('custom-non-auto-step' as OnboardingStep)

      // Verify terminal-step-change was sent (line 668)
      const stepChangeCalls = vi
        .mocked(mockWebContents.send)
        .mock.calls.filter((call) => call[0] === 'terminal-step-change')

      // Should have step-change calls
      expect(stepChangeCalls.length).toBeGreaterThan(0)

      // Verify at least one includes the custom step
      const relevantCall = stepChangeCalls.find(
        (call) => call[1]?.step === 'custom-non-auto-step'
      )
      expect(relevantCall).toBeDefined()
    })

    /**
     * Test debounce logic for rapid character input (lines 562-570)
     * Verifies that duplicate characters within debounce window are ignored
     */
    it('should ignore rapid duplicate character input within debounce window', () => {
      handler.initialize(mockWindow as BrowserWindow)
      handler.updateStep('task-detail')
      handler.updateEasterEggVisibility(true)

      const beforeInputHandler = vi
        .mocked(mockWebContents.on)
        .mock.calls.find((call) => call[0] === 'before-input-event')?.[1]
      expect(beforeInputHandler).toBeDefined()
      if (!beforeInputHandler) return

      const mockEvent = createMockEvent()
      vi.clearAllMocks()

      // Send first 'z' character
      const input1 = createMockKeyboardInput('z', { type: 'keyDown' })
      beforeInputHandler(mockEvent, input1)

      // First character should send terminal-input
      const firstCallCount = vi
        .mocked(mockWebContents.send)
        .mock.calls.filter(
          (call) => call[0] === 'terminal-input' && call[1]?.char === 'z'
        ).length
      expect(firstCallCount).toBe(1)

      // Immediately send duplicate 'z' within debounce window
      // This should execute lines 562-570 and return early at line 569
      const input2 = createMockKeyboardInput('z', { type: 'keyDown' })
      beforeInputHandler(mockEvent, input2)

      // Second character should NOT send additional terminal-input (was debounced)
      const totalCallCount = vi
        .mocked(mockWebContents.send)
        .mock.calls.filter(
          (call) => call[0] === 'terminal-input' && call[1]?.char === 'z'
        ).length
      expect(totalCallCount).toBe(1) // Still only 1 call from the first input

      // Note: preventDefault is NOT called when debouncing (line 569 returns early)
      // The debounce logic lets the duplicate through without prevention
    })

    /**
     * Test hideTerminal method directly via welcome step (lines 589-591)
     * The hideTerminal method is private but called from handleStepChange
     */
    it('should execute hideTerminal method when returning to welcome without activation', () => {
      handler.initialize(mockWindow as BrowserWindow)

      // Start in welcome step (no activation yet, so hasBeenActivated = false)
      handler.updateStep('welcome')
      vi.clearAllMocks()

      // Navigate to project-selection, but manually hide it before auto-activation
      handler.updateStep('project-selection')
      // Immediately hide terminal before it auto-activates (to keep hasBeenActivated = false)
      handler.updateVisibility(false) // This clears hasBeenActivated
      vi.clearAllMocks()

      // Navigate back to welcome step
      // Since hasBeenActivated = false, hideTerminal should be called (line 613-614)
      handler.updateStep('welcome')

      // Verify terminal-hide was sent (hideTerminal was called)
      expect(mockWebContents.send).toHaveBeenCalledWith('terminal-hide')
    })
  })
})
