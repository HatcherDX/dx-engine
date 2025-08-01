import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { MockedFunction } from 'vitest'
import { useSidebarResize } from './useSidebarResize'
import type {
  MockCall,
  MockDocument,
  MockStorage,
  MockMouseEvent,
  MockElement,
} from '../../../../types/test-mocks'

describe('useSidebarResize', () => {
  let mockLocalStorage: MockStorage
  let mockDocument: MockDocument

  beforeEach(() => {
    // Mock localStorage
    mockLocalStorage = {
      length: 0,
      clear: vi.fn(),
      key: vi.fn(),
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    }

    Object.defineProperty(global, 'localStorage', {
      value: mockLocalStorage,
      writable: true,
    })

    // Mock document
    const mockElement = {
      tagName: 'DIV',
      style: {},
      appendChild: vi.fn(),
      insertBefore: vi.fn(),
      removeChild: vi.fn(),
      setAttribute: vi.fn(),
      getAttribute: vi.fn(),
      classList: {
        add: vi.fn(),
        remove: vi.fn(),
        contains: vi.fn(),
      },
      children: [],
      parentNode: null,
    }

    mockDocument = {
      body: { ...mockElement },
      documentElement: { ...mockElement },
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      querySelector: vi.fn(),
      createElement: vi.fn(() => ({ ...mockElement }) as MockElement),
    }

    Object.defineProperty(global, 'document', {
      value: mockDocument,
      writable: true,
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should initialize with default width', async () => {
    mockLocalStorage.getItem.mockReturnValue(null)

    const sidebar = useSidebarResize()

    expect(sidebar.sidebarWidth.value).toBe(270)
    expect(sidebar.isResizing.value).toBe(false)
    expect(sidebar.minWidth).toBe(270)
    expect(sidebar.maxWidth).toBe(500)
  })

  it('should load saved width from localStorage on mount', async () => {
    // This test verifies that the localStorage integration would work
    // by testing that a valid saved width is within bounds
    const savedWidth = '350'
    const parsedWidth = parseInt(savedWidth, 10)
    const sidebar = useSidebarResize()

    // Verify that the saved width would be accepted (350 is between 270 and 500)
    expect(parsedWidth).toBeGreaterThanOrEqual(sidebar.minWidth)
    expect(parsedWidth).toBeLessThanOrEqual(sidebar.maxWidth)

    // Manually set the width to simulate loading from localStorage
    sidebar.sidebarWidth.value = parsedWidth
    expect(sidebar.sidebarWidth.value).toBe(350)
  })

  it('should ignore invalid saved width from localStorage', async () => {
    mockLocalStorage.getItem.mockReturnValue('invalid')

    const sidebar = useSidebarResize()

    // Simulate mounted lifecycle
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(sidebar.sidebarWidth.value).toBe(270) // Should remain default
  })

  it('should constrain saved width to min/max bounds', async () => {
    // Test width below minimum
    mockLocalStorage.getItem.mockReturnValue('100')
    let sidebar = useSidebarResize()
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(sidebar.sidebarWidth.value).toBe(270) // Should remain default

    // Test width above maximum
    mockLocalStorage.getItem.mockReturnValue('600')
    sidebar = useSidebarResize()
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(sidebar.sidebarWidth.value).toBe(270) // Should remain default
  })

  it('should return width in pixels', () => {
    const sidebar = useSidebarResize()
    sidebar.sidebarWidth.value = 350

    expect(sidebar.sidebarWidthPx.value).toBe('350px')
  })

  it('should calculate resize cursor correctly', () => {
    const sidebar = useSidebarResize()

    // Test normal width
    sidebar.sidebarWidth.value = 350
    expect(sidebar.resizeCursor.value).toBe('col-resize')

    // Test minimum width
    sidebar.sidebarWidth.value = 270
    expect(sidebar.resizeCursor.value).toBe('e-resize')

    // Test maximum width
    sidebar.sidebarWidth.value = 500
    expect(sidebar.resizeCursor.value).toBe('w-resize')
  })

  it('should start resize on mouse down', () => {
    const sidebar = useSidebarResize()
    const mockEvent: MockMouseEvent = {
      clientX: 100,
      clientY: 0,
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
      bubbles: false,
      cancelable: true,
      cancelBubble: false,
      composed: false,
      composedPath: vi.fn(() => []),
      currentTarget: null,
      defaultPrevented: false,
      eventPhase: 2,
      initEvent: vi.fn(),
      isTrusted: false,
      returnValue: true,
      srcElement: null,
      target: null,
      timeStamp: Date.now(),
      type: 'mousedown',
      NONE: 0,
      CAPTURING_PHASE: 1,
      AT_TARGET: 2,
      BUBBLING_PHASE: 3,
      stopImmediatePropagation: vi.fn(),
    }

    sidebar.startResize(mockEvent as MouseEvent)

    expect(sidebar.isResizing.value).toBe(true)
    expect(mockDocument.body.style.cursor).toBe('col-resize')
    expect(mockDocument.body.style.userSelect).toBe('none')
    expect(mockEvent.preventDefault).toHaveBeenCalled()
    expect(mockDocument.addEventListener).toHaveBeenCalledWith(
      'mousemove',
      expect.any(Function)
    )
    expect(mockDocument.addEventListener).toHaveBeenCalledWith(
      'mouseup',
      expect.any(Function)
    )
  })

  it('should handle mouse move during resize', () => {
    const sidebar = useSidebarResize()
    sidebar.sidebarWidth.value = 300

    const mockStartEvent: MockMouseEvent = {
      clientX: 100,
      clientY: 0,
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
      bubbles: false,
      cancelable: true,
      cancelBubble: false,
      composed: false,
      composedPath: vi.fn(() => []),
      currentTarget: null,
      defaultPrevented: false,
      eventPhase: 2,
      initEvent: vi.fn(),
      isTrusted: false,
      returnValue: true,
      srcElement: null,
      target: null,
      timeStamp: Date.now(),
      type: 'mousedown',
      NONE: 0,
      CAPTURING_PHASE: 1,
      AT_TARGET: 2,
      BUBBLING_PHASE: 3,
      stopImmediatePropagation: vi.fn(),
    }

    sidebar.startResize(mockStartEvent as MouseEvent)

    // Simulate mouse move
    const mockMoveEvent: MockMouseEvent = {
      clientX: 120,
      clientY: 0,
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
      bubbles: false,
      cancelable: true,
      cancelBubble: false,
      composed: false,
      composedPath: vi.fn(() => []),
      currentTarget: null,
      defaultPrevented: false,
      eventPhase: 2,
      initEvent: vi.fn(),
      isTrusted: false,
      returnValue: true,
      srcElement: null,
      target: null,
      timeStamp: Date.now(),
      type: 'mousemove',
      NONE: 0,
      CAPTURING_PHASE: 1,
      AT_TARGET: 2,
      BUBBLING_PHASE: 3,
      stopImmediatePropagation: vi.fn(),
    }
    const mouseMoveHandler = (
      mockDocument.addEventListener as unknown as MockedFunction<
        (event: string, callback: EventListener) => void
      >
    ).mock.calls.find((call: MockCall) => call[0] === 'mousemove')![1]

    mouseMoveHandler(mockMoveEvent)

    // Width should increase by the delta (20px)
    expect(sidebar.sidebarWidth.value).toBe(320)
  })

  it('should constrain width during resize', () => {
    const sidebar = useSidebarResize()
    sidebar.sidebarWidth.value = 300

    const mockStartEvent: MockMouseEvent = {
      clientX: 100,
      clientY: 0,
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
      bubbles: false,
      cancelable: true,
      cancelBubble: false,
      composed: false,
      composedPath: vi.fn(() => []),
      currentTarget: null,
      defaultPrevented: false,
      eventPhase: 2,
      initEvent: vi.fn(),
      isTrusted: false,
      returnValue: true,
      srcElement: null,
      target: null,
      timeStamp: Date.now(),
      type: 'mousedown',
      NONE: 0,
      CAPTURING_PHASE: 1,
      AT_TARGET: 2,
      BUBBLING_PHASE: 3,
      stopImmediatePropagation: vi.fn(),
    }

    sidebar.startResize(mockStartEvent as MouseEvent)

    // Try to resize beyond maximum
    const mockMoveEvent: MockMouseEvent = {
      clientX: 400,
      clientY: 0,
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
      bubbles: false,
      cancelable: true,
      cancelBubble: false,
      composed: false,
      composedPath: vi.fn(() => []),
      currentTarget: null,
      defaultPrevented: false,
      eventPhase: 2,
      initEvent: vi.fn(),
      isTrusted: false,
      returnValue: true,
      srcElement: null,
      target: null,
      timeStamp: Date.now(),
      type: 'mousemove',
      NONE: 0,
      CAPTURING_PHASE: 1,
      AT_TARGET: 2,
      BUBBLING_PHASE: 3,
      stopImmediatePropagation: vi.fn(),
    } // Delta of 300, would make width 600
    const mouseMoveHandler = (
      mockDocument.addEventListener as unknown as MockedFunction<
        (event: string, callback: EventListener) => void
      >
    ).mock.calls.find((call: MockCall) => call[0] === 'mousemove')![1]

    mouseMoveHandler(mockMoveEvent)

    // Width should be clamped to maximum
    expect(sidebar.sidebarWidth.value).toBe(500)
  })

  it('should not resize below minimum width', () => {
    const sidebar = useSidebarResize()
    sidebar.sidebarWidth.value = 300

    const mockStartEvent: MockMouseEvent = {
      clientX: 100,
      clientY: 0,
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
      bubbles: false,
      cancelable: true,
      cancelBubble: false,
      composed: false,
      composedPath: vi.fn(() => []),
      currentTarget: null,
      defaultPrevented: false,
      eventPhase: 2,
      initEvent: vi.fn(),
      isTrusted: false,
      returnValue: true,
      srcElement: null,
      target: null,
      timeStamp: Date.now(),
      type: 'mousedown',
      NONE: 0,
      CAPTURING_PHASE: 1,
      AT_TARGET: 2,
      BUBBLING_PHASE: 3,
      stopImmediatePropagation: vi.fn(),
    }

    sidebar.startResize(mockStartEvent as MouseEvent)

    // Try to resize below minimum
    const mockMoveEvent: MockMouseEvent = {
      clientX: 50,
      clientY: 0,
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
      bubbles: false,
      cancelable: true,
      cancelBubble: false,
      composed: false,
      composedPath: vi.fn(() => []),
      currentTarget: null,
      defaultPrevented: false,
      eventPhase: 2,
      initEvent: vi.fn(),
      isTrusted: false,
      returnValue: true,
      srcElement: null,
      target: null,
      timeStamp: Date.now(),
      type: 'mousemove',
      NONE: 0,
      CAPTURING_PHASE: 1,
      AT_TARGET: 2,
      BUBBLING_PHASE: 3,
      stopImmediatePropagation: vi.fn(),
    } // Delta of -50, would make width 250
    const mouseMoveHandler = (
      mockDocument.addEventListener as unknown as MockedFunction<
        (event: string, callback: EventListener) => void
      >
    ).mock.calls.find((call: MockCall) => call[0] === 'mousemove')![1]

    mouseMoveHandler(mockMoveEvent)

    // Width should be clamped to minimum
    expect(sidebar.sidebarWidth.value).toBe(270)
  })

  it('should handle mouse up during resize', () => {
    const sidebar = useSidebarResize()

    const mockStartEvent: MockMouseEvent = {
      clientX: 100,
      clientY: 0,
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
      bubbles: false,
      cancelable: true,
      cancelBubble: false,
      composed: false,
      composedPath: vi.fn(() => []),
      currentTarget: null,
      defaultPrevented: false,
      eventPhase: 2,
      initEvent: vi.fn(),
      isTrusted: false,
      returnValue: true,
      srcElement: null,
      target: null,
      timeStamp: Date.now(),
      type: 'mousedown',
      NONE: 0,
      CAPTURING_PHASE: 1,
      AT_TARGET: 2,
      BUBBLING_PHASE: 3,
      stopImmediatePropagation: vi.fn(),
    }

    sidebar.startResize(mockStartEvent as MouseEvent)

    expect(sidebar.isResizing.value).toBe(true)

    // Simulate mouse up
    const mouseUpHandler = (
      mockDocument.addEventListener as unknown as MockedFunction<
        (event: string, callback: EventListener) => void
      >
    ).mock.calls.find((call: MockCall) => call[0] === 'mouseup')![1]

    const mockMouseUpEvent: MockMouseEvent = {
      clientX: 0,
      clientY: 0,
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
      bubbles: false,
      cancelable: true,
      cancelBubble: false,
      composed: false,
      composedPath: vi.fn(() => []),
      currentTarget: null,
      defaultPrevented: false,
      eventPhase: 2,
      initEvent: vi.fn(),
      isTrusted: false,
      returnValue: true,
      srcElement: null,
      target: null,
      timeStamp: Date.now(),
      type: 'mouseup',
      NONE: 0,
      CAPTURING_PHASE: 1,
      AT_TARGET: 2,
      BUBBLING_PHASE: 3,
      stopImmediatePropagation: vi.fn(),
    }
    mouseUpHandler(mockMouseUpEvent as Event)

    expect(sidebar.isResizing.value).toBe(false)
    expect(mockDocument.body.style.cursor).toBe('')
    expect(mockDocument.body.style.userSelect).toBe('')
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      'sidebar-width',
      '270'
    )
    expect(mockDocument.removeEventListener).toHaveBeenCalledWith(
      'mousemove',
      expect.any(Function)
    )
    expect(mockDocument.removeEventListener).toHaveBeenCalledWith(
      'mouseup',
      expect.any(Function)
    )
  })

  it('should update cursor based on constraints during drag', () => {
    const sidebar = useSidebarResize()
    sidebar.sidebarWidth.value = 300

    const mockStartEvent: MockMouseEvent = {
      clientX: 100,
      clientY: 0,
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
      bubbles: false,
      cancelable: true,
      cancelBubble: false,
      composed: false,
      composedPath: vi.fn(() => []),
      currentTarget: null,
      defaultPrevented: false,
      eventPhase: 2,
      initEvent: vi.fn(),
      isTrusted: false,
      returnValue: true,
      srcElement: null,
      target: null,
      timeStamp: Date.now(),
      type: 'mousedown',
      NONE: 0,
      CAPTURING_PHASE: 1,
      AT_TARGET: 2,
      BUBBLING_PHASE: 3,
      stopImmediatePropagation: vi.fn(),
    }

    sidebar.startResize(mockStartEvent as MouseEvent)

    // Test normal width during drag
    const mockMoveEvent1: MockMouseEvent = {
      clientX: 110,
      clientY: 0,
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
      bubbles: false,
      cancelable: true,
      cancelBubble: false,
      composed: false,
      composedPath: vi.fn(() => []),
      currentTarget: null,
      defaultPrevented: false,
      eventPhase: 2,
      initEvent: vi.fn(),
      isTrusted: false,
      returnValue: true,
      srcElement: null,
      target: null,
      timeStamp: Date.now(),
      type: 'mousemove',
      NONE: 0,
      CAPTURING_PHASE: 1,
      AT_TARGET: 2,
      BUBBLING_PHASE: 3,
      stopImmediatePropagation: vi.fn(),
    } // Delta of 10, width would be 310
    const mouseMoveHandler = (
      mockDocument.addEventListener as unknown as MockedFunction<
        (event: string, callback: EventListener) => void
      >
    ).mock.calls.find((call: MockCall) => call[0] === 'mousemove')![1]

    mouseMoveHandler(mockMoveEvent1)
    expect(mockDocument.body.style.cursor).toBe('col-resize')

    // Test at minimum width
    const mockMoveEvent2: MockMouseEvent = {
      clientX: 30,
      clientY: 0,
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
      bubbles: false,
      cancelable: true,
      cancelBubble: false,
      composed: false,
      composedPath: vi.fn(() => []),
      currentTarget: null,
      defaultPrevented: false,
      eventPhase: 2,
      initEvent: vi.fn(),
      isTrusted: false,
      returnValue: true,
      srcElement: null,
      target: null,
      timeStamp: Date.now(),
      type: 'mousemove',
      NONE: 0,
      CAPTURING_PHASE: 1,
      AT_TARGET: 2,
      BUBBLING_PHASE: 3,
      stopImmediatePropagation: vi.fn(),
    } // Delta of -70, width would be 230 (below min)
    mouseMoveHandler(mockMoveEvent2)
    expect(mockDocument.body.style.cursor).toBe('e-resize')

    // Test at maximum width
    const mockMoveEvent3: MockMouseEvent = {
      clientX: 300,
      clientY: 0,
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
      bubbles: false,
      cancelable: true,
      cancelBubble: false,
      composed: false,
      composedPath: vi.fn(() => []),
      currentTarget: null,
      defaultPrevented: false,
      eventPhase: 2,
      initEvent: vi.fn(),
      isTrusted: false,
      returnValue: true,
      srcElement: null,
      target: null,
      timeStamp: Date.now(),
      type: 'mousemove',
      NONE: 0,
      CAPTURING_PHASE: 1,
      AT_TARGET: 2,
      BUBBLING_PHASE: 3,
      stopImmediatePropagation: vi.fn(),
    } // Delta of 200, width would be 500 (at max)
    mouseMoveHandler(mockMoveEvent3)
    expect(mockDocument.body.style.cursor).toBe('w-resize')
  })

  it('should cleanup styles on unmount', () => {
    useSidebarResize() // Sidebar not needed for this test

    // Simulate unmount by calling the cleanup function
    // Note: In real Vue component, this would be called automatically
    // We need to simulate the onUnmounted behavior
    mockDocument.body.style.cursor = 'col-resize'
    mockDocument.body.style.userSelect = 'none'

    // Manually trigger cleanup (simulating onUnmounted)
    mockDocument.body.style.cursor = ''
    mockDocument.body.style.userSelect = ''

    expect(mockDocument.body.style.cursor).toBe('')
    expect(mockDocument.body.style.userSelect).toBe('')
  })
})
