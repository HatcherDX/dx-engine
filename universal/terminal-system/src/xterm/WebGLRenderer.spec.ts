/**
 * @fileoverview Comprehensive tests for WebGLRenderer.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 */

import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
  type SpyInstance,
} from 'vitest'
import { Terminal } from 'xterm'
import { WebGLTerminalRenderer, type WebGLOptions } from './WebGLRenderer'

// Mock WebGL context
const mockWebGLContext = {
  VENDOR: 7936,
  RENDERER: 7937,
  VERSION: 7938,
  getParameter: vi.fn((param: number) => {
    if (param === 7936) return 'Mock Vendor' // GL_VENDOR
    if (param === 7937) return 'Mock Renderer' // GL_RENDERER
    if (param === 7938) return 'Mock Version' // GL_VERSION
    if (param === 37445) return 'Mock Vendor (Debug)' // UNMASKED_VENDOR_WEBGL
    if (param === 37446) return 'Mock Renderer (Debug)' // UNMASKED_RENDERER_WEBGL
    return ''
  }),
  getExtension: vi.fn((name: string) => {
    if (name === 'WEBGL_debug_renderer_info') {
      return {
        UNMASKED_VENDOR_WEBGL: 37445,
        UNMASKED_RENDERER_WEBGL: 37446,
      }
    }
    return null
  }),
}

// Mock canvas element
const mockCanvas = {
  getContext: vi.fn((type: string) => {
    if (
      type === 'webgl2' ||
      type === 'webgl' ||
      type === 'experimental-webgl'
    ) {
      return mockWebGLContext
    }
    return null
  }),
  toDataURL: vi.fn(() => 'data:image/png;base64,mockdata'),
}

// Mock terminal element
const mockTerminalElement = {
  querySelector: vi.fn((selector: string) => {
    if (selector === 'canvas') {
      return mockCanvas
    }
    return null
  }),
}

// Mock Terminal instance
const createMockTerminal = () => ({
  loadAddon: vi.fn(),
  element: mockTerminalElement,
  dispose: vi.fn(),
})

// Mock WebglAddon
class MockWebglAddon {
  private contextLossHandler: (() => void) | null = null
  public disposed = false
  public preserveDrawingBuffer: boolean | undefined

  constructor(preserveDrawingBuffer?: boolean) {
    this.preserveDrawingBuffer = preserveDrawingBuffer
  }

  onContextLoss(handler: () => void): void {
    this.contextLossHandler = handler
  }

  dispose(): void {
    this.disposed = true
  }

  triggerContextLoss(): void {
    if (this.contextLossHandler) {
      this.contextLossHandler()
    }
  }
}

// Store MockWebglAddon globally for tests to access
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Installing global mock for testing
;(global as any).MockWebglAddon = MockWebglAddon

// Mock @xterm/addon-webgl module
vi.mock('@xterm/addon-webgl', () => ({
  WebglAddon: MockWebglAddon,
}))

// Store original createElement
const originalCreateElement = document.createElement.bind(document)

// Mock performance
vi.spyOn(performance, 'now').mockReturnValue(1000)

// Mock requestAnimationFrame and cancelAnimationFrame
let rafId = 0
const rafCallbacks: Map<number, () => void> = new Map()

vi.stubGlobal(
  'requestAnimationFrame',
  vi.fn((callback: () => void) => {
    const id = ++rafId
    rafCallbacks.set(id, callback)
    // Execute callback immediately in tests
    setTimeout(() => {
      const cb = rafCallbacks.get(id)
      if (cb) {
        cb()
        rafCallbacks.delete(id)
      }
    }, 0)
    return id
  })
)

vi.stubGlobal(
  'cancelAnimationFrame',
  vi.fn((id: number) => {
    rafCallbacks.delete(id)
  })
)

describe('WebGLTerminalRenderer', () => {
  let renderer: WebGLTerminalRenderer
  let mockTerminal: ReturnType<typeof createMockTerminal>
  let consoleWarnSpy: SpyInstance
  let consoleLogSpy: SpyInstance
  let consoleErrorSpy: SpyInstance

  beforeEach(() => {
    vi.clearAllMocks()
    rafCallbacks.clear()

    // Reset mock canvas for each test
    mockCanvas.getContext.mockImplementation((type: string) => {
      if (
        type === 'webgl2' ||
        type === 'webgl' ||
        type === 'experimental-webgl'
      ) {
        return mockWebGLContext
      }
      return null
    })

    // Mock document.createElement for each test
    vi.spyOn(document, 'createElement').mockImplementation(
      (tagName: string) => {
        if (tagName === 'canvas') {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Returning mock canvas for testing
          return mockCanvas as any
        }
        return originalCreateElement(tagName)
      }
    )

    mockTerminal = createMockTerminal()
    renderer = new WebGLTerminalRenderer()

    // Spy on console methods
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    renderer.dispose()
    consoleWarnSpy.mockRestore()
    consoleLogSpy.mockRestore()
    consoleErrorSpy.mockRestore()
    vi.spyOn(document, 'createElement').mockRestore()
  })

  describe('constructor', () => {
    it('should initialize with default options', () => {
      const renderer = new WebGLTerminalRenderer()
      expect(renderer.isReady()).toBe(false)
      expect(renderer.getAddon()).toBeNull()
    })

    it('should accept custom options', () => {
      const options: WebGLOptions = {
        enablePerformanceMonitoring: true,
        preserveDrawingBuffer: true,
        powerPreference: 'high-performance',
        debug: true,
        contextAttributes: { alpha: false },
      }
      const renderer = new WebGLTerminalRenderer(options)
      expect(renderer.isReady()).toBe(false)
    })

    it('should handle debug option', () => {
      const debugRenderer = new WebGLTerminalRenderer({ debug: true })
      expect(debugRenderer.isReady()).toBe(false)
    })
  })

  describe('isSupported', () => {
    it('should return true when WebGL is supported', () => {
      const result = renderer.isSupported()
      expect(result).toBe(true)
    })

    it('should return false when window is undefined', () => {
      const originalWindow = global.window
      // @ts-expect-error - Intentionally deleting global.window for testing
      delete global.window
      const result = renderer.isSupported()
      expect(result).toBe(false)
      global.window = originalWindow
    })

    it('should return false when WebGL context creation fails', () => {
      mockCanvas.getContext.mockImplementation(() => null)
      const result = renderer.isSupported()
      expect(result).toBe(false)
    })

    it('should return false when WebGL context creation throws', () => {
      mockCanvas.getContext.mockImplementationOnce(() => {
        throw new Error('WebGL not supported')
      })
      const result = renderer.isSupported()
      expect(result).toBe(false)
    })
  })

  describe('initialize', () => {
    it('should initialize successfully with WebGL support', async () => {
      const result = await renderer.initialize(mockTerminal as Terminal)
      expect(result).toBe(true)
      expect(renderer.isReady()).toBe(true)
      expect(renderer.getAddon()).not.toBeNull()
      expect(mockTerminal.loadAddon).toHaveBeenCalled()
    })

    it('should return true if already initialized', async () => {
      await renderer.initialize(mockTerminal as Terminal)
      const result = await renderer.initialize(mockTerminal as Terminal)
      expect(result).toBe(true)
    })

    it('should log warning when already initialized with debug mode', async () => {
      const debugRenderer = new WebGLTerminalRenderer({ debug: true })
      await debugRenderer.initialize(mockTerminal as Terminal)
      await debugRenderer.initialize(mockTerminal as Terminal)
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[WebGLRenderer] Already initialized'
      )
      debugRenderer.dispose()
    })

    it('should return false when WebGL is not supported', async () => {
      mockCanvas.getContext.mockImplementation(() => null)
      const result = await renderer.initialize(mockTerminal as Terminal)
      expect(result).toBe(false)
      expect(renderer.isReady()).toBe(false)
    })

    it('should log warning when WebGL not supported with debug mode', async () => {
      const debugRenderer = new WebGLTerminalRenderer({ debug: true })
      mockCanvas.getContext.mockImplementation(() => null)
      await debugRenderer.initialize(mockTerminal as Terminal)
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[WebGLRenderer] WebGL not supported'
      )
      debugRenderer.dispose()
    })

    it('should merge options when provided', async () => {
      const result = await renderer.initialize(mockTerminal as Terminal, {
        preserveDrawingBuffer: true,
        enablePerformanceMonitoring: true,
      })
      expect(result).toBe(true)

      // Check that performance monitoring started
      const metrics = renderer.getPerformanceMetrics()
      expect(metrics).toBeDefined()
    })

    it('should start performance monitoring when enabled', async () => {
      await renderer.initialize(mockTerminal as Terminal, {
        enablePerformanceMonitoring: true,
      })

      const metrics = renderer.getPerformanceMetrics()
      expect(metrics.isActive).toBe(true)
    })

    it('should log success message with debug mode', async () => {
      const debugRenderer = new WebGLTerminalRenderer({ debug: true })
      await debugRenderer.initialize(mockTerminal as Terminal)
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[WebGLRenderer] Initialized successfully'
      )
      debugRenderer.dispose()
    })

    it('should handle initialization failure', async () => {
      // Mock import to throw error
      vi.doMock('@xterm/addon-webgl', () => {
        throw new Error('Import failed')
      })

      const failRenderer = new WebGLTerminalRenderer()
      const result = await failRenderer.initialize(mockTerminal as Terminal)
      expect(result).toBe(false)

      vi.doUnmock('@xterm/addon-webgl')
    })

    it('should log error on initialization failure with debug mode', async () => {
      vi.doMock('@xterm/addon-webgl', () => {
        throw new Error('Import failed')
      })

      const debugRenderer = new WebGLTerminalRenderer({ debug: true })
      await debugRenderer.initialize(mockTerminal as Terminal)
      expect(consoleErrorSpy).toHaveBeenCalled()

      vi.doUnmock('@xterm/addon-webgl')
      debugRenderer.dispose()
    })
  })

  describe('handleContextLoss', () => {
    beforeEach(async () => {
      vi.useFakeTimers()
      await renderer.initialize(mockTerminal as Terminal)
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should handle context loss and attempt recovery', async () => {
      // Directly call the context loss handler
      renderer.handleContextLoss()

      // Check that addon was disposed
      expect(renderer.getAddon()).toBeNull()

      // Fast-forward time to trigger recovery
      vi.advanceTimersByTime(1000)
      await vi.runAllTimersAsync()

      // Should attempt to reinitialize
      expect(mockTerminal.loadAddon).toHaveBeenCalledTimes(2)
    })

    it('should log context loss with debug mode', async () => {
      const debugRenderer = new WebGLTerminalRenderer({ debug: true })
      await debugRenderer.initialize(mockTerminal as Terminal)

      // Directly call the context loss handler
      debugRenderer.handleContextLoss()

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[WebGLRenderer] Context lost (count: 1)'
      )
      debugRenderer.dispose()
    })

    it('should stop recovery after 3 attempts', async () => {
      // Trigger context loss 3 times
      for (let i = 0; i < 3; i++) {
        renderer.handleContextLoss()
        vi.advanceTimersByTime(1000)
        await vi.runAllTimersAsync()
      }

      // 4th context loss should not trigger recovery
      const loadAddonCallsBefore = mockTerminal.loadAddon.mock.calls.length
      renderer.handleContextLoss()
      vi.advanceTimersByTime(1000)
      const loadAddonCallsAfter = mockTerminal.loadAddon.mock.calls.length

      // Should not have called loadAddon again
      expect(loadAddonCallsAfter).toBe(loadAddonCallsBefore)

      const metrics = renderer.getPerformanceMetrics()
      expect(metrics.contextLossCount).toBe(4)
    })

    it('should not attempt recovery if terminal is null', () => {
      renderer['terminal'] = null
      renderer.handleContextLoss()

      vi.advanceTimersByTime(1000)
      expect(mockTerminal.loadAddon).toHaveBeenCalledTimes(1) // Only initial load
    })
  })

  describe('dispose', () => {
    it('should clean up resources when not initialized', () => {
      renderer.dispose()
      expect(renderer.isReady()).toBe(false)
      expect(renderer.getAddon()).toBeNull()
    })

    it('should clean up resources when initialized', async () => {
      await renderer.initialize(mockTerminal as Terminal)

      renderer.dispose()

      // Check if dispose was called (addon should be null now)
      expect(renderer.isReady()).toBe(false)
      expect(renderer.getAddon()).toBeNull()
    })

    it('should stop performance monitoring', async () => {
      await renderer.initialize(mockTerminal as Terminal, {
        enablePerformanceMonitoring: true,
      })

      renderer.dispose()

      const metrics = renderer.getPerformanceMetrics()
      expect(metrics.isActive).toBe(false)
    })

    it('should log disposal with debug mode', async () => {
      const debugRenderer = new WebGLTerminalRenderer({ debug: true })
      await debugRenderer.initialize(mockTerminal as Terminal)
      debugRenderer.dispose()
      expect(consoleLogSpy).toHaveBeenCalledWith('[WebGLRenderer] Disposed')
    })
  })

  describe('getPerformanceMetrics', () => {
    it('should return default metrics when not initialized', () => {
      const metrics = renderer.getPerformanceMetrics()
      expect(metrics).toEqual({
        fps: 0,
        frameTime: 0,
        drawCalls: 0,
        gpuMemory: 0,
        contextLossCount: 0,
        isActive: false,
      })
    })

    it('should return active metrics when initialized', async () => {
      await renderer.initialize(mockTerminal as Terminal)
      const metrics = renderer.getPerformanceMetrics()
      expect(metrics.isActive).toBe(true)
    })

    it('should return performance data when monitoring enabled', async () => {
      await renderer.initialize(mockTerminal as Terminal, {
        enablePerformanceMonitoring: true,
      })

      // Wait for performance monitor to update
      await new Promise((resolve) => setTimeout(resolve, 1100))

      const metrics = renderer.getPerformanceMetrics()
      expect(metrics.isActive).toBe(true)
    })

    it('should track context loss count', async () => {
      await renderer.initialize(mockTerminal as Terminal)

      renderer.handleContextLoss()

      const metrics = renderer.getPerformanceMetrics()
      expect(metrics.contextLossCount).toBe(1)
    })
  })

  describe('getContextInfo', () => {
    it('should return null when not initialized', () => {
      const info = renderer.getContextInfo()
      expect(info).toBeNull()
    })

    it('should return WebGL context info when initialized', async () => {
      // Fix mock to return proper values
      // Create a new mock context for this test
      const testContext = {
        VENDOR: 7936,
        RENDERER: 7937,
        VERSION: 7938,
        getParameter: vi.fn((param: number) => {
          if (param === 7936) return 'Mock Vendor' // GL_VENDOR
          if (param === 7937) return 'Mock Renderer' // GL_RENDERER
          if (param === 7938) return 'Mock Version' // GL_VERSION
          if (param === 37445) return 'Mock Vendor (Debug)' // UNMASKED_VENDOR_WEBGL
          if (param === 37446) return 'Mock Renderer (Debug)' // UNMASKED_RENDERER_WEBGL
          return 'Mock Version'
        }),
        getExtension: vi.fn((name: string) => {
          if (name === 'WEBGL_debug_renderer_info') {
            return {
              UNMASKED_VENDOR_WEBGL: 37445,
              UNMASKED_RENDERER_WEBGL: 37446,
            }
          }
          return null
        }),
      }

      // Mock createElement to return canvas with our test context
      vi.spyOn(document, 'createElement').mockImplementationOnce(
        (tagName: string) => {
          if (tagName === 'canvas') {
            return {
              getContext: vi.fn((type: string) => {
                if (type === 'webgl2' || type === 'webgl') {
                  return testContext
                }
                return null
              }),
              // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Returning mock canvas for testing
            } as any
          }
          return originalCreateElement(tagName)
        }
      )

      await renderer.initialize(mockTerminal as Terminal)
      const info = renderer.getContextInfo()

      expect(info).toEqual({
        vendor: 'Mock Vendor (Debug)',
        renderer: 'Mock Renderer (Debug)',
        version: 'Mock Version',
      })
    })

    it('should handle missing debug extension', async () => {
      // Create a new renderer for this test to avoid contamination
      const testRenderer = new WebGLTerminalRenderer()

      // Create a new mock context for this test
      const testContext = {
        VENDOR: 7936,
        RENDERER: 7937,
        VERSION: 7938,
        getParameter: vi.fn((param: number) => {
          if (param === 7936) return 'Mock Vendor' // GL_VENDOR
          if (param === 7937) return 'Mock Renderer' // GL_RENDERER
          if (param === 7938) return 'Mock Version' // GL_VERSION
          return 'Mock Version'
        }),
        getExtension: vi.fn(() => null), // No debug extension
      }

      // Override createElement for getContextInfo call
      vi.spyOn(document, 'createElement').mockImplementation(
        (tagName: string) => {
          if (tagName === 'canvas') {
            // First call for isSupported check
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing mock calls for testing
            const callCount = (document.createElement as any).mock.calls.filter(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Typing mock call array
              (c: any) => c[0] === 'canvas'
            ).length
            if (callCount <= 1) {
              // For isSupported check during initialize
              // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Returning mock canvas for testing
              return mockCanvas as any
            } else {
              // For getContextInfo
              return {
                getContext: vi.fn((type: string) => {
                  if (type === 'webgl2' || type === 'webgl') {
                    return testContext
                  }
                  return null
                }),
                // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Returning mock canvas for testing
              } as any
            }
          }
          return originalCreateElement(tagName)
        }
      )

      await testRenderer.initialize(mockTerminal as Terminal)
      const info = testRenderer.getContextInfo()

      expect(info).toEqual({
        vendor: 'Mock Vendor',
        renderer: 'Mock Renderer',
        version: 'Mock Version',
      })

      testRenderer.dispose()
    })

    it('should return null when WebGL context is not available', async () => {
      mockCanvas.getContext
        .mockReturnValueOnce(mockWebGLContext)
        .mockReturnValueOnce(null)
        .mockReturnValueOnce(null)
      await renderer.initialize(mockTerminal as Terminal)
      const info = renderer.getContextInfo()
      expect(info).toBeNull()
    })

    it('should handle exceptions gracefully', async () => {
      await renderer.initialize(mockTerminal as Terminal)
      mockCanvas.getContext.mockImplementationOnce(() => {
        throw new Error('Context error')
      })
      const info = renderer.getContextInfo()
      expect(info).toBeNull()
    })
  })

  describe('takeScreenshot', () => {
    it('should return null when not initialized', async () => {
      const screenshot = await renderer.takeScreenshot()
      expect(screenshot).toBeNull()
    })

    it('should return null when terminal is null', async () => {
      await renderer.initialize(mockTerminal as Terminal)
      renderer['terminal'] = null
      const screenshot = await renderer.takeScreenshot()
      expect(screenshot).toBeNull()
    })

    it('should return screenshot data when initialized', async () => {
      await renderer.initialize(mockTerminal as Terminal)
      // Mock querySelector to return a canvas that is an HTMLCanvasElement
      const canvasElement = {
        ...mockCanvas,
        toDataURL: vi.fn(() => 'data:image/png;base64,mockdata'),
      }
      Object.setPrototypeOf(canvasElement, HTMLCanvasElement.prototype)
      mockTerminalElement.querySelector.mockReturnValueOnce(canvasElement)
      const screenshot = await renderer.takeScreenshot()
      expect(screenshot).toBe('data:image/png;base64,mockdata')
    })

    it('should return null when canvas is not found', async () => {
      await renderer.initialize(mockTerminal as Terminal)
      mockTerminalElement.querySelector.mockReturnValueOnce(null)
      const screenshot = await renderer.takeScreenshot()
      expect(screenshot).toBeNull()
    })

    it('should handle screenshot errors gracefully', async () => {
      await renderer.initialize(mockTerminal as Terminal)
      mockCanvas.toDataURL.mockImplementationOnce(() => {
        throw new Error('Screenshot failed')
      })
      const screenshot = await renderer.takeScreenshot()
      expect(screenshot).toBeNull()
    })

    it('should log error on screenshot failure with debug mode', async () => {
      const debugRenderer = new WebGLTerminalRenderer({ debug: true })
      await debugRenderer.initialize(mockTerminal as Terminal)
      // Mock querySelector to return a canvas that throws an error
      const canvasElement = {
        ...mockCanvas,
        toDataURL: vi.fn(() => {
          throw new Error('Screenshot failed')
        }),
      }
      Object.setPrototypeOf(canvasElement, HTMLCanvasElement.prototype)
      mockTerminalElement.querySelector.mockReturnValueOnce(canvasElement)
      await debugRenderer.takeScreenshot()
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[WebGLRenderer] Screenshot failed:',
        expect.any(Error)
      )
      debugRenderer.dispose()
    })
  })

  describe('isReady', () => {
    it('should return false when not initialized', () => {
      expect(renderer.isReady()).toBe(false)
    })

    it('should return true when initialized', async () => {
      await renderer.initialize(mockTerminal as Terminal)
      expect(renderer.isReady()).toBe(true)
    })
  })

  describe('getAddon', () => {
    it('should return null when not initialized', () => {
      expect(renderer.getAddon()).toBeNull()
    })

    it('should return addon instance when initialized', async () => {
      await renderer.initialize(mockTerminal as Terminal)
      const addon = renderer.getAddon()
      expect(addon).not.toBeNull()
      // Check that it has the expected methods
      expect(addon).toHaveProperty('dispose')
      expect(addon).toHaveProperty('onContextLoss')
    })
  })

  describe('PerformanceMonitor', () => {
    it('should track FPS over time', async () => {
      const perfRenderer = new WebGLTerminalRenderer({
        enablePerformanceMonitoring: true,
      })
      await perfRenderer.initialize(mockTerminal as Terminal)

      // Simulate time passing
      vi.spyOn(performance, 'now')
        .mockReturnValueOnce(1000)
        .mockReturnValueOnce(1016) // ~60 FPS
        .mockReturnValueOnce(1033)
        .mockReturnValueOnce(1050)
        .mockReturnValueOnce(2000) // 1 second later

      // Wait for performance updates
      await new Promise((resolve) => setTimeout(resolve, 100))

      const metrics = perfRenderer.getPerformanceMetrics()
      expect(metrics).toBeDefined()

      perfRenderer.dispose()
    })

    it('should stop monitoring on dispose', async () => {
      const perfRenderer = new WebGLTerminalRenderer({
        enablePerformanceMonitoring: true,
      })
      await perfRenderer.initialize(mockTerminal as Terminal)

      perfRenderer.dispose()

      const metrics = perfRenderer.getPerformanceMetrics()
      expect(metrics.isActive).toBe(false)
    })

    it('should calculate frame time correctly', async () => {
      const perfRenderer = new WebGLTerminalRenderer({
        enablePerformanceMonitoring: true,
      })
      await perfRenderer.initialize(mockTerminal as Terminal)

      // Mock time progression for multiple frames
      let currentTime = 1000
      vi.spyOn(performance, 'now').mockImplementation(() => {
        currentTime += 16 // ~60 FPS
        return currentTime
      })

      // Wait for at least 1 second worth of frames
      await new Promise((resolve) => setTimeout(resolve, 1100))

      const metrics = perfRenderer.getPerformanceMetrics()
      expect(metrics).toBeDefined()

      perfRenderer.dispose()
    })
  })
})
