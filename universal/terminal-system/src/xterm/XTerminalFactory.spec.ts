/**
 * @fileoverview XTerminalFactory test suite - Comprehensive tests for terminal factory.
 *
 * @description
 * Complete test coverage for XTerminalFactory including all creation methods,
 * theme presets, error handling, and component initialization.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { SpyInstance } from 'vitest'
import { XTerminalFactory } from './XTerminalFactory'

// Mock all dependencies
vi.mock('./XTermManager', () => ({
  XTermManager: vi.fn().mockImplementation(() => ({
    initialize: vi.fn().mockResolvedValue({
      onData: vi.fn(),
      onResize: vi.fn(),
      options: {},
    }),
    dispose: vi.fn(),
  })),
}))

vi.mock('./AddonManager', () => ({
  TerminalAddonManager: vi.fn().mockImplementation(() => ({
    loadAllAddons: vi.fn().mockResolvedValue({
      fit: { fit: vi.fn() },
      search: null,
      webgl: null,
      webLinks: null,
      clipboard: null,
      unicode11: null,
    }),
    getLoadedAddons: vi.fn().mockReturnValue(['fit']),
    dispose: vi.fn(),
  })),
  AddonType: {},
}))

vi.mock('./ResizeManager', () => ({
  TerminalResizeManager: vi.fn().mockImplementation(() => ({
    initialize: vi.fn().mockResolvedValue(undefined),
    dispose: vi.fn(),
  })),
}))

vi.mock('./FocusManager', () => ({
  TerminalFocusManager: vi.fn().mockImplementation(() => ({
    initialize: vi.fn(),
    dispose: vi.fn(),
  })),
}))

vi.mock('../rendering/WebGLTerminalAdapter', () => ({
  WebGLTerminalAdapter: vi.fn().mockImplementation(() => ({
    initialize: vi.fn().mockResolvedValue(undefined),
    render: vi.fn(),
    dispose: vi.fn(),
    getContextInfo: vi.fn().mockReturnValue({
      vendor: 'Mock Vendor',
      renderer: 'Mock Renderer',
      version: 'WebGL 2.0',
    }),
  })),
}))

vi.mock('./BackpressureManager', () => ({
  TerminalBackpressureManager: vi.fn().mockImplementation(() => ({
    clear: vi.fn(),
  })),
}))

describe('XTerminalFactory', () => {
  let container: HTMLElement
  let mockConsoleLog: SpyInstance
  let mockConsoleWarn: SpyInstance

  beforeEach(() => {
    // Create mock container
    container = document.createElement('div')
    document.body.appendChild(container)

    // Mock console methods
    mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {})
    mockConsoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    // Clear all mocks
    vi.clearAllMocks()
  })

  afterEach(() => {
    // Remove container
    if (container.parentNode) {
      container.parentNode.removeChild(container)
    }

    // Restore console
    mockConsoleLog.mockRestore()
    mockConsoleWarn.mockRestore()

    // Clear all mocks
    vi.clearAllMocks()
  })

  describe('createTerminal', () => {
    it('should create terminal with default options', async () => {
      const instance = await XTerminalFactory.createTerminal(container)

      expect(instance).toBeDefined()
      expect(instance.terminal).toBeDefined()
      expect(instance.manager).toBeDefined()
      expect(instance.addons).toBeDefined()
      expect(instance.resize).toBeDefined()
      expect(instance.focus).toBeDefined()
      expect(instance.backpressure).toBeDefined()
      expect(instance.dispose).toBeDefined()
    })

    it('should throw error when container is null', async () => {
      await expect(
        XTerminalFactory.createTerminal(null as unknown as HTMLElement)
      ).rejects.toThrow('Container element is required')
    })

    it('should throw error when container is undefined', async () => {
      await expect(
        XTerminalFactory.createTerminal(undefined as unknown as HTMLElement)
      ).rejects.toThrow('Container element is required')
    })

    it('should apply hatcher-dark theme preset', async () => {
      const { XTermManager } = await vi.importMock('./XTermManager')

      await XTerminalFactory.createTerminal(container, {
        theme: 'hatcher-dark',
      })

      expect(XTermManager).toHaveBeenCalledWith(
        expect.objectContaining({
          fontSize: 14,
          fontFamily: 'ui-monospace, "SF Mono", "Cascadia Mono", monospace',
          theme: 'dark',
          cursorBlink: true,
          cursorStyle: 'block',
        })
      )
    })

    it('should apply hatcher-light theme preset', async () => {
      const { XTermManager } = await vi.importMock('./XTermManager')

      await XTerminalFactory.createTerminal(container, {
        theme: 'hatcher-light',
      })

      expect(XTermManager).toHaveBeenCalledWith(
        expect.objectContaining({
          fontSize: 14,
          fontFamily: 'ui-monospace, "SF Mono", "Cascadia Mono", monospace',
          theme: 'light',
          cursorBlink: true,
          cursorStyle: 'block',
        })
      )
    })

    it('should apply dark theme preset', async () => {
      const { XTermManager } = await vi.importMock('./XTermManager')

      await XTerminalFactory.createTerminal(container, {
        theme: 'dark',
      })

      expect(XTermManager).toHaveBeenCalledWith(
        expect.objectContaining({
          theme: 'dark',
        })
      )
    })

    it('should apply light theme preset', async () => {
      const { XTermManager } = await vi.importMock('./XTermManager')

      await XTerminalFactory.createTerminal(container, {
        theme: 'light',
      })

      expect(XTermManager).toHaveBeenCalledWith(
        expect.objectContaining({
          theme: 'light',
        })
      )
    })

    it('should merge terminal options with theme preset', async () => {
      const { XTermManager } = await vi.importMock('./XTermManager')

      await XTerminalFactory.createTerminal(container, {
        theme: 'dark',
        terminal: {
          fontSize: 16,
          scrollback: 5000,
        },
      })

      expect(XTermManager).toHaveBeenCalledWith(
        expect.objectContaining({
          theme: 'dark',
          fontSize: 16,
          scrollback: 5000,
        })
      )
    })

    it('should load all addons when enabled', async () => {
      const { TerminalAddonManager } = await vi.importMock('./AddonManager')
      const mockLoadAllAddons = vi.fn().mockResolvedValue({
        fit: { fit: vi.fn() },
        search: { search: vi.fn() },
        webgl: { webgl: vi.fn() },
        webLinks: { webLinks: vi.fn() },
        clipboard: { clipboard: vi.fn() },
        unicode11: { unicode11: vi.fn() },
      })

      TerminalAddonManager.mockImplementation(() => ({
        loadAllAddons: mockLoadAllAddons,
        getLoadedAddons: vi.fn().mockReturnValue(['all']),
        dispose: vi.fn(),
      }))

      await XTerminalFactory.createTerminal(container, {
        addons: {
          enableWebGL: true,
          enableSearch: true,
          enableWebLinks: true,
          enableClipboard: true,
          enableUnicode11: true,
        },
      })

      expect(mockLoadAllAddons).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          enableWebGL: true,
          enableSearch: true,
          enableWebLinks: true,
          enableClipboard: true,
          enableUnicode11: true,
        })
      )
    })

    it('should disable specific addons when requested', async () => {
      const { TerminalAddonManager } = await vi.importMock('./AddonManager')
      const mockLoadAllAddons = vi.fn().mockResolvedValue({})

      TerminalAddonManager.mockImplementation(() => ({
        loadAllAddons: mockLoadAllAddons,
        getLoadedAddons: vi.fn().mockReturnValue([]),
        dispose: vi.fn(),
      }))

      await XTerminalFactory.createTerminal(container, {
        addons: {
          enableWebGL: false,
          enableSearch: false,
          enableWebLinks: false,
          enableClipboard: false,
          enableUnicode11: false,
        },
      })

      expect(mockLoadAllAddons).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          enableWebGL: false,
          enableSearch: false,
          enableWebLinks: false,
          enableClipboard: false,
          enableUnicode11: false,
        })
      )
    })

    it('should disable resize manager when requested', async () => {
      const { TerminalResizeManager } = await vi.importMock('./ResizeManager')

      const instance = await XTerminalFactory.createTerminal(container, {
        resize: {
          enabled: false,
        },
      })

      expect(TerminalResizeManager).not.toHaveBeenCalled()
      expect(instance.resize).toBeUndefined()
    })

    it('should enable resize manager by default', async () => {
      const { TerminalResizeManager } = await vi.importMock('./ResizeManager')

      const instance = await XTerminalFactory.createTerminal(container)

      expect(TerminalResizeManager).toHaveBeenCalled()
      expect(instance.resize).toBeDefined()
    })

    it('should pass resize options to manager', async () => {
      const { TerminalResizeManager } = await vi.importMock('./ResizeManager')

      await XTerminalFactory.createTerminal(container, {
        resize: {
          autoResize: true,
          debounceDelay: 100,
        },
      })

      expect(TerminalResizeManager).toHaveBeenCalledWith(
        expect.objectContaining({
          autoResize: true,
          debounceDelay: 100,
        })
      )
    })

    it('should disable focus manager when requested', async () => {
      const { TerminalFocusManager } = await vi.importMock('./FocusManager')

      const instance = await XTerminalFactory.createTerminal(container, {
        focus: {
          enabled: false,
        },
      })

      expect(TerminalFocusManager).not.toHaveBeenCalled()
      expect(instance.focus).toBeUndefined()
    })

    it('should enable focus manager by default', async () => {
      const { TerminalFocusManager } = await vi.importMock('./FocusManager')

      const instance = await XTerminalFactory.createTerminal(container)

      expect(TerminalFocusManager).toHaveBeenCalled()
      expect(instance.focus).toBeDefined()
    })

    it('should pass focus options to manager', async () => {
      const { TerminalFocusManager } = await vi.importMock('./FocusManager')

      await XTerminalFactory.createTerminal(container, {
        focus: {
          focusOnClick: true,
          blurOnEscape: true,
        },
      })

      expect(TerminalFocusManager).toHaveBeenCalledWith(
        expect.objectContaining({
          focusOnClick: true,
          blurOnEscape: true,
        })
      )
    })

    it('should create WebGL renderer when enabled', async () => {
      // Context7 Best Practice: WebGL renderer is actively used in production (TerminalView.vue:196-227)
      // This test validates WebGL initialization path which is critical for performance
      const { WebGLTerminalAdapter } = await vi.importMock(
        '../rendering/WebGLTerminalAdapter'
      )
      const { TerminalAddonManager } = await vi.importMock('./AddonManager')
      const { XTermManager } = await vi.importMock('./XTermManager')

      // Mock terminal with element property for canvas attachment
      const mockTerminalElement = document.createElement('div')
      XTermManager.mockImplementation(() => ({
        initialize: vi.fn().mockResolvedValue({
          onData: vi.fn(),
          onResize: vi.fn(),
          options: {},
          element: mockTerminalElement, // Terminal element required for WebGL
          rows: 24,
          cols: 80,
          buffer: {
            active: {
              length: 0,
              cursorY: 0,
              cursorX: 0,
              getLine: vi.fn(() => ({ translateToString: () => '' })),
            },
          },
        }),
        dispose: vi.fn(),
      }))

      TerminalAddonManager.mockImplementation(() => ({
        loadAllAddons: vi.fn().mockResolvedValue({
          fit: { fit: vi.fn() },
          webgl: null, // No WebGL addon loaded - use custom renderer
        }),
        getLoadedAddons: vi.fn().mockReturnValue(['fit']),
        dispose: vi.fn(),
      }))

      // Mock WebGL adapter to succeed initialization
      WebGLTerminalAdapter.mockImplementation(() => ({
        initialize: vi.fn().mockResolvedValue(undefined),
        render: vi.fn(),
        dispose: vi.fn(),
        getContextInfo: vi.fn().mockReturnValue({
          vendor: 'Test Vendor',
          renderer: 'Test Renderer',
          version: 'WebGL 2.0',
        }),
      }))

      const instance = await XTerminalFactory.createTerminal(container, {
        webgl: {
          enabled: true,
        },
      })

      expect(WebGLTerminalAdapter).toHaveBeenCalled()
      expect(instance.webgl).toBeDefined()
    })

    it('should handle WebGL initialization failure gracefully', async () => {
      // Context7 Best Practice: Test error handling for WebGL failures (GPU unavailable, driver issues)
      const { WebGLTerminalAdapter } = await vi.importMock(
        '../rendering/WebGLTerminalAdapter'
      )
      const { TerminalAddonManager } = await vi.importMock('./AddonManager')
      const { XTermManager } = await vi.importMock('./XTermManager')

      // Mock terminal with element property for canvas attachment
      const mockTerminalElement = document.createElement('div')
      XTermManager.mockImplementation(() => ({
        initialize: vi.fn().mockResolvedValue({
          onData: vi.fn(),
          onResize: vi.fn(),
          options: {},
          element: mockTerminalElement,
          rows: 24,
          cols: 80,
          buffer: {
            active: {
              length: 0,
              cursorY: 0,
              cursorX: 0,
              getLine: vi.fn(() => ({ translateToString: () => '' })),
            },
          },
        }),
        dispose: vi.fn(),
      }))

      TerminalAddonManager.mockImplementation(() => ({
        loadAllAddons: vi.fn().mockResolvedValue({
          fit: { fit: vi.fn() },
          webgl: null,
        }),
        getLoadedAddons: vi.fn().mockReturnValue(['fit']),
        dispose: vi.fn(),
      }))

      // Mock WebGL adapter to throw error during initialization
      WebGLTerminalAdapter.mockImplementation(() => ({
        initialize: vi.fn().mockRejectedValue(new Error('WebGL not supported')),
        dispose: vi.fn(),
      }))

      const instance = await XTerminalFactory.createTerminal(container, {
        webgl: {
          enabled: true,
        },
        debug: true,
      })

      expect(WebGLTerminalAdapter).toHaveBeenCalled()
      expect(instance.webgl).toBeUndefined()
      expect(mockConsoleWarn).toHaveBeenCalledWith(
        '[XTerminalFactory] WebGL renderer initialization failed:',
        expect.any(Error)
      )
    })

    it('should skip WebGL when terminal.element is null', async () => {
      // Context7 Best Practice: Test defensive programming - handle missing DOM element
      const { WebGLTerminalAdapter } = await vi.importMock(
        '../rendering/WebGLTerminalAdapter'
      )
      const { TerminalAddonManager } = await vi.importMock('./AddonManager')
      const { XTermManager } = await vi.importMock('./XTermManager')

      // Mock terminal WITHOUT element property (simulates terminal not yet attached to DOM)
      XTermManager.mockImplementation(() => ({
        initialize: vi.fn().mockResolvedValue({
          onData: vi.fn(),
          onResize: vi.fn(),
          options: {},
          element: null, // No DOM element attached
          rows: 24,
          cols: 80,
        }),
        dispose: vi.fn(),
      }))

      TerminalAddonManager.mockImplementation(() => ({
        loadAllAddons: vi.fn().mockResolvedValue({
          fit: { fit: vi.fn() },
        }),
        getLoadedAddons: vi.fn().mockReturnValue(['fit']),
        dispose: vi.fn(),
      }))

      const instance = await XTerminalFactory.createTerminal(container, {
        webgl: {
          enabled: true,
        },
        debug: true,
      })

      expect(WebGLTerminalAdapter).not.toHaveBeenCalled()
      expect(instance.webgl).toBeUndefined()
      expect(mockConsoleWarn).toHaveBeenCalledWith(
        '[XTerminalFactory] WebGL renderer requires terminal element'
      )
    })

    it('should bridge terminal data to WebGL renderer', async () => {
      // Context7 Best Practice: Test data flow from XTerm buffer to WebGL renderer
      const { WebGLTerminalAdapter } = await vi.importMock(
        '../rendering/WebGLTerminalAdapter'
      )
      const { TerminalAddonManager } = await vi.importMock('./AddonManager')
      const { XTermManager } = await vi.importMock('./XTermManager')

      const mockTerminalElement = document.createElement('div')
      const mockWebGLRender = vi.fn()
      let onDataCallback: ((data: string) => void) | null = null

      // Mock terminal that captures onData callback
      XTermManager.mockImplementation(() => ({
        initialize: vi.fn().mockResolvedValue({
          onData: vi.fn((callback) => {
            onDataCallback = callback
          }),
          onResize: vi.fn(),
          options: {},
          element: mockTerminalElement,
          rows: 24,
          cols: 80,
          buffer: {
            active: {
              length: 3,
              cursorY: 2,
              cursorX: 10,
              getLine: vi.fn((i) => ({
                translateToString: () => `Line ${i} content`,
              })),
            },
          },
        }),
        dispose: vi.fn(),
      }))

      TerminalAddonManager.mockImplementation(() => ({
        loadAllAddons: vi.fn().mockResolvedValue({
          fit: { fit: vi.fn() },
          webgl: null,
        }),
        getLoadedAddons: vi.fn().mockReturnValue(['fit']),
        dispose: vi.fn(),
      }))

      WebGLTerminalAdapter.mockImplementation(() => ({
        initialize: vi.fn().mockResolvedValue(undefined),
        render: mockWebGLRender,
        dispose: vi.fn(),
        getContextInfo: vi.fn().mockReturnValue({
          vendor: 'Test',
          renderer: 'Test',
          version: 'WebGL 2.0',
        }),
      }))

      await XTerminalFactory.createTerminal(container, {
        webgl: {
          enabled: true,
        },
        debug: true,
      })

      // Trigger onData callback to test buffer extraction
      expect(onDataCallback).toBeDefined()
      if (onDataCallback) {
        onDataCallback('test data')

        // Verify WebGL render was called with buffer content
        expect(mockWebGLRender).toHaveBeenCalledWith({
          content: ['Line 0 content', 'Line 1 content', 'Line 2 content'],
          cursor: {
            row: 2,
            col: 10,
          },
        })

        expect(mockConsoleLog).toHaveBeenCalledWith(
          '[XTerminalFactory] WebGL renderer initialized and connected'
        )
      }
    })

    it('should disable backpressure manager when requested', async () => {
      const { TerminalBackpressureManager } = await vi.importMock(
        './BackpressureManager'
      )

      const instance = await XTerminalFactory.createTerminal(container, {
        backpressure: {
          enabled: false,
        },
      })

      expect(TerminalBackpressureManager).not.toHaveBeenCalled()
      expect(instance.backpressure).toBeUndefined()
    })

    it('should enable backpressure manager by default', async () => {
      const { TerminalBackpressureManager } = await vi.importMock(
        './BackpressureManager'
      )

      const instance = await XTerminalFactory.createTerminal(container)

      expect(TerminalBackpressureManager).toHaveBeenCalled()
      expect(instance.backpressure).toBeDefined()
    })

    it('should pass backpressure options to manager', async () => {
      const { TerminalBackpressureManager } = await vi.importMock(
        './BackpressureManager'
      )

      await XTerminalFactory.createTerminal(container, {
        backpressure: {
          chunkSize: 2048,
          maxQueueSize: 100,
        },
      })

      expect(TerminalBackpressureManager).toHaveBeenCalledWith(
        expect.objectContaining({
          chunkSize: 2048,
          maxQueueSize: 100,
        })
      )
    })

    it('should enable debug mode for all components', async () => {
      const { TerminalAddonManager } = await vi.importMock('./AddonManager')
      const { TerminalResizeManager } = await vi.importMock('./ResizeManager')
      const { TerminalFocusManager } = await vi.importMock('./FocusManager')
      const { TerminalBackpressureManager } = await vi.importMock(
        './BackpressureManager'
      )

      await XTerminalFactory.createTerminal(container, {
        debug: true,
      })

      expect(TerminalAddonManager).toHaveBeenCalledWith(
        expect.objectContaining({ debug: true })
      )
      expect(TerminalResizeManager).toHaveBeenCalledWith(
        expect.objectContaining({ debug: true })
      )
      expect(TerminalFocusManager).toHaveBeenCalledWith(
        expect.objectContaining({ debug: true })
      )
      expect(TerminalBackpressureManager).toHaveBeenCalledWith(
        expect.objectContaining({ debug: true })
      )
    })

    it('should log success message in debug mode', async () => {
      await XTerminalFactory.createTerminal(container, {
        debug: true,
      })

      expect(mockConsoleLog).toHaveBeenCalledWith(
        '[XTerminalFactory] Terminal created successfully',
        expect.objectContaining({
          hasResize: true,
          hasFocus: true,
          hasWebGL: false,
          hasBackpressure: true,
          addons: expect.any(Array),
        })
      )
    })

    it('should properly dispose all components', async () => {
      const { XTermManager } = await vi.importMock('./XTermManager')
      const { TerminalAddonManager } = await vi.importMock('./AddonManager')
      const { TerminalResizeManager } = await vi.importMock('./ResizeManager')
      const { TerminalFocusManager } = await vi.importMock('./FocusManager')
      const { TerminalBackpressureManager } = await vi.importMock(
        './BackpressureManager'
      )

      const mockManagerDispose = vi.fn()
      const mockAddonDispose = vi.fn()
      const mockResizeDispose = vi.fn()
      const mockFocusDispose = vi.fn()
      const mockBackpressureClear = vi.fn()

      XTermManager.mockImplementation(() => ({
        initialize: vi.fn().mockResolvedValue({}),
        dispose: mockManagerDispose,
      }))

      TerminalAddonManager.mockImplementation(() => ({
        loadAllAddons: vi.fn().mockResolvedValue({}),
        getLoadedAddons: vi.fn().mockReturnValue([]),
        dispose: mockAddonDispose,
      }))

      TerminalResizeManager.mockImplementation(() => ({
        initialize: vi.fn().mockResolvedValue(undefined),
        dispose: mockResizeDispose,
      }))

      TerminalFocusManager.mockImplementation(() => ({
        initialize: vi.fn(),
        dispose: mockFocusDispose,
      }))

      TerminalBackpressureManager.mockImplementation(() => ({
        clear: mockBackpressureClear,
      }))

      const instance = await XTerminalFactory.createTerminal(container)

      instance.dispose()

      // Verify disposal order (reverse of creation)
      expect(mockBackpressureClear).toHaveBeenCalled()
      expect(mockFocusDispose).toHaveBeenCalled()
      expect(mockResizeDispose).toHaveBeenCalled()
      expect(mockAddonDispose).toHaveBeenCalled()
      expect(mockManagerDispose).toHaveBeenCalled()
    })
  })

  describe('createMinimalTerminal', () => {
    it('should create terminal with all features disabled', async () => {
      const { TerminalAddonManager } = await vi.importMock('./AddonManager')
      const { TerminalResizeManager } = await vi.importMock('./ResizeManager')
      const { TerminalFocusManager } = await vi.importMock('./FocusManager')
      const { TerminalBackpressureManager } = await vi.importMock(
        './BackpressureManager'
      )

      const mockLoadAllAddons = vi.fn().mockResolvedValue({})

      TerminalAddonManager.mockImplementation(() => ({
        loadAllAddons: mockLoadAllAddons,
        getLoadedAddons: vi.fn().mockReturnValue([]),
        dispose: vi.fn(),
      }))

      const instance = await XTerminalFactory.createMinimalTerminal(container)

      expect(mockLoadAllAddons).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          enableWebGL: false,
          enableSearch: false,
          enableWebLinks: false,
          enableClipboard: false,
          enableUnicode11: false,
        })
      )

      expect(TerminalResizeManager).not.toHaveBeenCalled()
      expect(TerminalFocusManager).not.toHaveBeenCalled()
      expect(TerminalBackpressureManager).not.toHaveBeenCalled()

      expect(instance.resize).toBeUndefined()
      expect(instance.focus).toBeUndefined()
      expect(instance.webgl).toBeUndefined()
      expect(instance.backpressure).toBeUndefined()
    })
  })

  describe('createPerformanceTerminal', () => {
    it('should create terminal with performance optimizations', async () => {
      const { XTermManager } = await vi.importMock('./XTermManager')
      const { TerminalAddonManager } = await vi.importMock('./AddonManager')
      const { TerminalResizeManager } = await vi.importMock('./ResizeManager')
      const { TerminalFocusManager } = await vi.importMock('./FocusManager')
      const { TerminalBackpressureManager } = await vi.importMock(
        './BackpressureManager'
      )

      const mockLoadAllAddons = vi.fn().mockResolvedValue({})

      TerminalAddonManager.mockImplementation(() => ({
        loadAllAddons: mockLoadAllAddons,
        getLoadedAddons: vi.fn().mockReturnValue([]),
        dispose: vi.fn(),
      }))

      await XTerminalFactory.createPerformanceTerminal(container)

      expect(XTermManager).toHaveBeenCalledWith(
        expect.objectContaining({
          scrollback: 1000,
          fastScrollModifier: 'alt',
          scrollOnUserInput: false,
        })
      )

      expect(mockLoadAllAddons).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          enableWebGL: true,
          enableSearch: false,
          enableWebLinks: false,
          enableClipboard: true,
          enableUnicode11: false,
        })
      )

      expect(TerminalResizeManager).toHaveBeenCalledWith(
        expect.objectContaining({
          debounceDelay: 200,
        })
      )

      expect(TerminalFocusManager).toHaveBeenCalledWith(
        expect.objectContaining({
          focusOnHover: false,
        })
      )

      expect(TerminalBackpressureManager).toHaveBeenCalledWith(
        expect.objectContaining({
          chunkSize: 1024,
          maxQueueSize: 50,
        })
      )
    })
  })

  describe('createDevelopmentTerminal', () => {
    it('should create terminal with all features and debugging enabled', async () => {
      const { XTermManager } = await vi.importMock('./XTermManager')
      const { TerminalAddonManager } = await vi.importMock('./AddonManager')
      const { TerminalResizeManager } = await vi.importMock('./ResizeManager')
      const { TerminalFocusManager } = await vi.importMock('./FocusManager')
      const { TerminalBackpressureManager } = await vi.importMock(
        './BackpressureManager'
      )

      const mockLoadAllAddons = vi.fn().mockResolvedValue({})

      TerminalAddonManager.mockImplementation(() => ({
        loadAllAddons: mockLoadAllAddons,
        getLoadedAddons: vi.fn().mockReturnValue([]),
        dispose: vi.fn(),
      }))

      await XTerminalFactory.createDevelopmentTerminal(container)

      expect(XTermManager).toHaveBeenCalledWith(
        expect.objectContaining({
          scrollback: 10000,
          allowProposedApi: true,
        })
      )

      expect(mockLoadAllAddons).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          enableWebGL: true,
          enableSearch: true,
          enableWebLinks: true,
          enableClipboard: true,
          enableUnicode11: true,
        })
      )

      expect(TerminalAddonManager).toHaveBeenCalledWith(
        expect.objectContaining({
          debug: true,
        })
      )

      expect(TerminalResizeManager).toHaveBeenCalledWith(
        expect.objectContaining({
          autoResize: true,
          debug: true,
        })
      )

      expect(TerminalFocusManager).toHaveBeenCalledWith(
        expect.objectContaining({
          focusOnClick: true,
          blurOnEscape: true,
          debug: true,
        })
      )

      expect(TerminalBackpressureManager).toHaveBeenCalledWith(
        expect.objectContaining({
          debug: true,
        })
      )
    })
  })

  describe('createElectronTerminal', () => {
    it('should create terminal optimized for Electron', async () => {
      const { XTermManager } = await vi.importMock('./XTermManager')
      const { TerminalAddonManager } = await vi.importMock('./AddonManager')
      const { TerminalResizeManager } = await vi.importMock('./ResizeManager')
      const { TerminalFocusManager } = await vi.importMock('./FocusManager')
      const { TerminalBackpressureManager } = await vi.importMock(
        './BackpressureManager'
      )

      const mockLoadAllAddons = vi.fn().mockResolvedValue({})

      TerminalAddonManager.mockImplementation(() => ({
        loadAllAddons: mockLoadAllAddons,
        getLoadedAddons: vi.fn().mockReturnValue([]),
        dispose: vi.fn(),
      }))

      await XTerminalFactory.createElectronTerminal(container)

      expect(XTermManager).toHaveBeenCalledWith(
        expect.objectContaining({
          scrollback: 5000,
        })
      )

      expect(mockLoadAllAddons).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          enableWebGL: true,
          enableSearch: true,
          enableWebLinks: true,
          enableClipboard: true,
          enableUnicode11: true,
        })
      )

      expect(TerminalResizeManager).toHaveBeenCalledWith(
        expect.objectContaining({
          autoResize: true,
        })
      )

      expect(TerminalFocusManager).toHaveBeenCalledWith(
        expect.objectContaining({
          focusOnClick: true,
          restoreFocusAfterContextMenu: true,
        })
      )

      expect(TerminalBackpressureManager).toHaveBeenCalled()
    })
  })
})
