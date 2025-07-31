import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { MockedFunction } from 'vitest'
import { nextTick } from 'vue'
import { useChatSidebar } from './useChatSidebar'
import type {
  MockDocument,
  MockCall,
  MockStorage,
  MockMouseEvent,
} from '../../../../types/test-mocks'

describe('useChatSidebar', () => {
  let mockLocalStorage: MockStorage

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

    // Mock document for event listeners
    Object.defineProperty(global, 'document', {
      value: {
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        body: {
          style: {},
        },
        documentElement: {
          style: {},
          classList: {
            add: vi.fn(),
            remove: vi.fn(),
            contains: vi.fn(),
          },
        },
        querySelector: vi.fn(),
      } as MockDocument,
      writable: true,
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should initialize with default values', () => {
    vi.mocked(mockLocalStorage.getItem).mockReturnValue(null)

    const sidebar = useChatSidebar()

    expect(sidebar.width.value).toBe(400) // DEFAULT_WIDTH
    expect(sidebar.isResizing.value).toBe(false)
    expect(sidebar.currentMode.value).toBe('generative')
    expect(sidebar.isGenerativeMode.value).toBe(true)
    expect(sidebar.shouldShowResizeHandle.value).toBe(false) // Hidden in generative mode
  })

  it('should load width from localStorage', () => {
    vi.mocked(mockLocalStorage.getItem).mockReturnValue('350')

    const sidebar = useChatSidebar()

    expect(sidebar.width.value).toBe(350)
    expect(mockLocalStorage.getItem).toHaveBeenCalledWith(
      'hatcher-chat-sidebar'
    )
  })

  it('should use default width for invalid localStorage values', () => {
    vi.mocked(mockLocalStorage.getItem).mockReturnValue('invalid')

    const sidebar = useChatSidebar()

    expect(sidebar.width.value).toBe(400)
  })

  it('should constrain width to min/max bounds from localStorage', () => {
    // Test value below minimum
    vi.mocked(mockLocalStorage.getItem).mockReturnValue('100')
    let sidebar = useChatSidebar()
    expect(sidebar.width.value).toBe(400) // Falls back to default

    // Test value above maximum
    vi.mocked(mockLocalStorage.getItem).mockReturnValue('800')
    sidebar = useChatSidebar()
    expect(sidebar.width.value).toBe(400) // Falls back to default
  })

  it('should handle localStorage errors gracefully', () => {
    vi.mocked(mockLocalStorage.getItem).mockImplementation(() => {
      throw new Error('Storage error')
    })

    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const sidebar = useChatSidebar()

    expect(sidebar.width.value).toBe(400)
    expect(consoleSpy).toHaveBeenCalledWith(
      'Failed to load chat sidebar width from storage:',
      expect.any(Error)
    )

    consoleSpy.mockRestore()
  })

  it('should save width changes to localStorage', async () => {
    vi.mocked(mockLocalStorage.getItem).mockReturnValue(null)

    const sidebar = useChatSidebar()

    sidebar.width.value = 350

    // Wait for watcher to trigger
    await nextTick()

    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      'hatcher-chat-sidebar',
      '350'
    )
  })

  it('should handle localStorage save errors gracefully', async () => {
    vi.mocked(mockLocalStorage.setItem).mockImplementation(() => {
      throw new Error('Storage error')
    })

    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const sidebar = useChatSidebar()
    sidebar.width.value = 350

    // Wait for watcher to trigger
    await nextTick()

    expect(consoleSpy).toHaveBeenCalledWith(
      'Failed to save chat sidebar width to storage:',
      expect.any(Error)
    )

    consoleSpy.mockRestore()
  })

  it('should set mode correctly', () => {
    const sidebar = useChatSidebar()

    sidebar.setMode('visual')

    expect(sidebar.currentMode.value).toBe('visual')
    expect(sidebar.isGenerativeMode.value).toBe(false)
    expect(sidebar.shouldShowResizeHandle.value).toBe(true) // Shown in non-generative modes
  })

  it('should calculate resize cursor correctly for generative mode', () => {
    const sidebar = useChatSidebar()
    sidebar.setMode('generative')

    expect(sidebar.resizeCursor.value).toBe('not-allowed')
  })

  it('should calculate resize cursor correctly for different width constraints', () => {
    const sidebar = useChatSidebar()
    sidebar.setMode('visual') // Non-generative mode

    // Test normal width
    sidebar.width.value = 350
    expect(sidebar.resizeCursor.value).toBe('col-resize')

    // Test minimum width
    sidebar.width.value = 250 // MIN_WIDTH
    expect(sidebar.resizeCursor.value).toBe('w-resize')

    // Test maximum width
    sidebar.width.value = 600 // MAX_WIDTH
    expect(sidebar.resizeCursor.value).toBe('e-resize')
  })

  it('should not start resize in generative mode', () => {
    const sidebar = useChatSidebar()
    sidebar.setMode('generative')

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

    expect(sidebar.isResizing.value).toBe(false)
    expect(mockEvent.preventDefault).not.toHaveBeenCalled()
  })

  it('should start resize in non-generative mode', () => {
    const sidebar = useChatSidebar()
    sidebar.setMode('visual')

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
    expect(mockEvent.preventDefault).toHaveBeenCalled()
    expect(global.document.addEventListener).toHaveBeenCalledWith(
      'mousemove',
      expect.any(Function)
    )
    expect(global.document.addEventListener).toHaveBeenCalledWith(
      'mouseup',
      expect.any(Function)
    )
  })

  it('should reset width to default', () => {
    const sidebar = useChatSidebar()
    sidebar.width.value = 350

    sidebar.resetWidth()

    expect(sidebar.width.value).toBe(400)
  })

  it('should provide width in pixels', () => {
    const sidebar = useChatSidebar()
    sidebar.width.value = 350

    expect(sidebar.widthPx.value).toBe('350px')
  })

  it('should expose constants', () => {
    const sidebar = useChatSidebar()

    expect(sidebar.MIN_WIDTH).toBe(250)
    expect(sidebar.MAX_WIDTH).toBe(600)
    expect(sidebar.DEFAULT_WIDTH).toBe(400)
  })

  it('should handle mouse move during resize', () => {
    const sidebar = useChatSidebar()
    sidebar.setMode('visual')
    sidebar.width.value = 400

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
      clientX: 80,
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
      global.document.addEventListener as unknown as MockedFunction<
        (event: string, callback: EventListener) => void
      >
    ).mock.calls.find((call: MockCall) => call[0] === 'mousemove')![1]

    mouseMoveHandler(mockMoveEvent)

    // Moving left (positive diff) should increase width
    expect(sidebar.width.value).toBe(420)
  })

  it('should constrain width during resize', () => {
    const sidebar = useChatSidebar()
    sidebar.setMode('visual')
    sidebar.width.value = 600 // Start at maximum

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

    // Try to increase width beyond maximum
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
    }
    const mouseMoveHandler = (
      global.document.addEventListener as unknown as MockedFunction<
        (event: string, callback: EventListener) => void
      >
    ).mock.calls.find((call: MockCall) => call[0] === 'mousemove')![1]

    mouseMoveHandler(mockMoveEvent)

    // Width should remain at maximum
    expect(sidebar.width.value).toBe(600)
  })

  it('should handle mouse up during resize', () => {
    const sidebar = useChatSidebar()
    sidebar.setMode('visual')

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
      global.document.addEventListener as unknown as MockedFunction<
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
    expect(global.document.removeEventListener).toHaveBeenCalledWith(
      'mousemove',
      expect.any(Function)
    )
    expect(global.document.removeEventListener).toHaveBeenCalledWith(
      'mouseup',
      expect.any(Function)
    )
  })
})
