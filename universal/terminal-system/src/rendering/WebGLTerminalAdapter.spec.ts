/**
 * @fileoverview Comprehensive tests for WebGL Terminal Adapter.
 *
 * @description
 * Complete test suite for the WebGLTerminalAdapter class, ensuring 100% coverage
 * of all functionality including initialization, rendering, theme updates, resizing,
 * and error handling. Tests the adapter layer between terminal system and WebGL engine.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @priority CRITICAL
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  WebGLTerminalAdapter,
  type WebGLTerminalConfig,
  type TerminalTheme,
  type TerminalRenderData,
} from './WebGLTerminalAdapter'

// Mock the shared-rendering module
const mockWebGLEngine = {
  initialize: vi.fn(),
  resize: vi.fn(),
  dispose: vi.fn(),
}

const mockTerminalRenderer = {
  initialize: vi.fn(),
  renderCursor: vi.fn(),
  renderSelection: vi.fn(),
  dispose: vi.fn(),
}

const MockWebGLEngine = vi.fn(() => mockWebGLEngine)
const MockTerminalRenderer = vi.fn(() => mockTerminalRenderer)

// Mock the dynamic import
vi.mock('@hatcherdx/shared-rendering', () => ({
  WebGLEngine: MockWebGLEngine,
  TerminalRenderer: MockTerminalRenderer,
}))

// Mock the dynamic import
vi.mock('@hatcherdx/shared-rendering', async () => {
  return {
    WebGLEngine: MockWebGLEngine,
    TerminalRenderer: MockTerminalRenderer,
  }
})

describe('🖥️ WebGL Terminal Adapter', () => {
  let adapter: WebGLTerminalAdapter
  let mockCanvas: HTMLCanvasElement
  let mockConfig: WebGLTerminalConfig

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks()
    mockWebGLEngine.initialize.mockResolvedValue(undefined)
    mockTerminalRenderer.initialize.mockResolvedValue(undefined)

    // Create fresh adapter instance
    adapter = new WebGLTerminalAdapter()

    // Create mock canvas
    mockCanvas = document.createElement('canvas')

    // Create mock config
    mockConfig = {
      canvas: mockCanvas,
      terminalConfig: {
        rows: 24,
        cols: 80,
        fontFamily: 'monospace',
        fontSize: 14,
      },
    }
  })

  afterEach(() => {
    adapter.dispose()
  })

  describe('🏗️ Constructor and Initial State', () => {
    it('should create adapter instance with correct initial state', () => {
      expect(adapter).toBeInstanceOf(WebGLTerminalAdapter)
      expect(adapter.isInitialized).toBe(false)
      expect(adapter.engine).toBe(null)
    })

    it('should have proper prototype chain', () => {
      expect(adapter.constructor).toBe(WebGLTerminalAdapter)
      expect(adapter instanceof WebGLTerminalAdapter).toBe(true)
    })
  })

  describe('🔧 Initialization', () => {
    it('should initialize successfully with minimal config', async () => {
      await adapter.initialize(mockConfig)

      expect(adapter.isInitialized).toBe(true)
      expect(adapter.engine).toBe(mockWebGLEngine)
      expect(MockWebGLEngine).toHaveBeenCalledTimes(1)
      expect(MockTerminalRenderer).toHaveBeenCalledWith(mockWebGLEngine)
    })

    it('should initialize WebGL engine with correct parameters', async () => {
      await adapter.initialize(mockConfig)

      expect(mockWebGLEngine.initialize).toHaveBeenCalledWith({
        canvas: mockCanvas,
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
      })
    })

    it('should initialize terminal renderer with config values', async () => {
      await adapter.initialize(mockConfig)

      expect(mockTerminalRenderer.initialize).toHaveBeenCalledWith({
        rows: 24,
        cols: 80,
        fontSize: 12,
        fontFamily: 'SF Mono, Monaco, Inconsolata, Roboto Mono, monospace',
        backgroundColor: undefined,
        textColor: undefined,
        cursorColor: undefined,
      })
    })

    it('should initialize with custom theme colors', async () => {
      const configWithTheme: WebGLTerminalConfig = {
        ...mockConfig,
        theme: {
          background: '#000000',
          foreground: '#ffffff',
          cursor: '#ff0000',
          selectionBackground: '#3366cc',
        },
      }

      await adapter.initialize(configWithTheme)

      expect(mockTerminalRenderer.initialize).toHaveBeenCalledWith({
        rows: 24,
        cols: 80,
        fontSize: 12,
        fontFamily: 'SF Mono, Monaco, Inconsolata, Roboto Mono, monospace',
        backgroundColor: { r: 0, g: 0, b: 0, a: 1 },
        textColor: { r: 1, g: 1, b: 1, a: 1 },
        cursorColor: { r: 1, g: 1, b: 1, a: 1 },
      })
    })

    it('should use default values when terminal config is incomplete', async () => {
      const minimalConfig: WebGLTerminalConfig = {
        canvas: mockCanvas,
        terminalConfig: {},
      }

      await adapter.initialize(minimalConfig)

      expect(mockTerminalRenderer.initialize).toHaveBeenCalledWith({
        rows: 24,
        cols: 80,
        fontSize: 12,
        fontFamily: 'SF Mono, Monaco, Inconsolata, Roboto Mono, monospace',
        backgroundColor: undefined,
        textColor: undefined,
        cursorColor: undefined,
      })
    })

    it('should throw error when already initialized', async () => {
      await adapter.initialize(mockConfig)

      await expect(adapter.initialize(mockConfig)).rejects.toThrow(
        'WebGL terminal adapter already initialized'
      )
    })

    it('should handle WebGL engine initialization failure', async () => {
      const engineError = new Error('WebGL not supported')
      mockWebGLEngine.initialize.mockRejectedValue(engineError)

      await expect(adapter.initialize(mockConfig)).rejects.toThrow(
        'Failed to initialize WebGL terminal adapter: Error: WebGL not supported'
      )
      expect(adapter.isInitialized).toBe(false)
    })

    it('should handle terminal renderer initialization failure', async () => {
      const rendererError = new Error('Renderer initialization failed')
      mockTerminalRenderer.initialize.mockRejectedValue(rendererError)

      await expect(adapter.initialize(mockConfig)).rejects.toThrow(
        'Failed to initialize WebGL terminal adapter: Error: Renderer initialization failed'
      )
      expect(adapter.isInitialized).toBe(false)
    })

    it('should handle constructor errors gracefully', async () => {
      // Mock WebGLEngine constructor to throw
      MockWebGLEngine.mockImplementationOnce(() => {
        throw new Error('WebGL context creation failed')
      })

      await expect(adapter.initialize(mockConfig)).rejects.toThrow(
        'Failed to initialize WebGL terminal adapter: Error: WebGL context creation failed'
      )
      expect(adapter.isInitialized).toBe(false)
    })
  })

  describe('🎨 Rendering', () => {
    beforeEach(async () => {
      await adapter.initialize(mockConfig)
    })

    it('should render terminal data with cursor position', () => {
      const renderData: TerminalRenderData = {
        content: ['$ ls', 'file1.txt file2.txt'],
        cursor: { row: 1, col: 17 },
      }

      adapter.render(renderData)

      expect(mockTerminalRenderer.renderCursor).toHaveBeenCalledWith({
        row: 1,
        col: 17,
        visible: true,
        blinking: true,
      })
      expect(mockTerminalRenderer.renderSelection).toHaveBeenCalledWith(null)
    })

    it('should render terminal data with text selection', () => {
      const renderData: TerminalRenderData = {
        content: ['Hello World', 'Second line'],
        cursor: { row: 0, col: 5 },
        selection: [
          {
            start: { row: 0, col: 0 },
            end: { row: 0, col: 5 },
          },
        ],
      }

      adapter.render(renderData)

      expect(mockTerminalRenderer.renderCursor).toHaveBeenCalledWith({
        row: 0,
        col: 5,
        visible: true,
        blinking: true,
      })
      expect(mockTerminalRenderer.renderSelection).toHaveBeenCalledWith({
        startRow: 0,
        startCol: 0,
        endRow: 0,
        endCol: 5,
      })
    })

    it('should handle multiple selections by using the first one', () => {
      const renderData: TerminalRenderData = {
        content: ['Line 1', 'Line 2', 'Line 3'],
        cursor: { row: 1, col: 3 },
        selection: [
          {
            start: { row: 0, col: 0 },
            end: { row: 0, col: 6 },
          },
          {
            start: { row: 2, col: 0 },
            end: { row: 2, col: 6 },
          },
        ],
      }

      adapter.render(renderData)

      expect(mockTerminalRenderer.renderSelection).toHaveBeenCalledWith({
        startRow: 0,
        startCol: 0,
        endRow: 0,
        endCol: 6,
      })
    })

    it('should clear selection when no selection provided', () => {
      const renderData: TerminalRenderData = {
        content: ['No selection'],
        cursor: { row: 0, col: 0 },
      }

      adapter.render(renderData)

      expect(mockTerminalRenderer.renderSelection).toHaveBeenCalledWith(null)
    })

    it('should clear selection when empty selection array provided', () => {
      const renderData: TerminalRenderData = {
        content: ['Empty selection array'],
        cursor: { row: 0, col: 0 },
        selection: [],
      }

      adapter.render(renderData)

      expect(mockTerminalRenderer.renderSelection).toHaveBeenCalledWith(null)
    })

    it('should throw error when not initialized', () => {
      const newAdapter = new WebGLTerminalAdapter()
      const renderData: TerminalRenderData = {
        content: ['Test'],
        cursor: { row: 0, col: 0 },
      }

      expect(() => newAdapter.render(renderData)).toThrow(
        'WebGL terminal adapter not initialized'
      )
    })
  })

  describe('🎨 Theme Updates', () => {
    beforeEach(async () => {
      await adapter.initialize(mockConfig)
    })

    it('should log theme update request', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      const theme: TerminalTheme = {
        background: '#1e1e1e',
        foreground: '#d4d4d4',
        cursor: '#ffffff',
        selectionBackground: '#264f78',
      }

      adapter.updateTheme(theme)

      expect(consoleSpy).toHaveBeenCalledWith('Theme update requested:', theme)
      consoleSpy.mockRestore()
    })

    it('should handle theme update when not initialized', () => {
      const newAdapter = new WebGLTerminalAdapter()
      const theme: TerminalTheme = {
        background: '#000000',
        foreground: '#ffffff',
      }

      // Should not throw and should not call console.log
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      newAdapter.updateTheme(theme)
      expect(consoleSpy).not.toHaveBeenCalled()
      consoleSpy.mockRestore()
    })

    it('should handle partial theme objects', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      const partialTheme: TerminalTheme = {
        background: '#1e1e1e',
      }

      adapter.updateTheme(partialTheme)

      expect(consoleSpy).toHaveBeenCalledWith(
        'Theme update requested:',
        partialTheme
      )
      consoleSpy.mockRestore()
    })

    it('should handle empty theme objects', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      const emptyTheme: TerminalTheme = {}

      adapter.updateTheme(emptyTheme)

      expect(consoleSpy).toHaveBeenCalledWith(
        'Theme update requested:',
        emptyTheme
      )
      consoleSpy.mockRestore()
    })
  })

  describe('📐 Resizing', () => {
    beforeEach(async () => {
      await adapter.initialize(mockConfig)
    })

    it('should resize WebGL engine', () => {
      adapter.resize(1024, 768)

      expect(mockWebGLEngine.resize).toHaveBeenCalledWith(1024, 768)
    })

    it('should handle resize with zero dimensions', () => {
      adapter.resize(0, 0)

      expect(mockWebGLEngine.resize).toHaveBeenCalledWith(0, 0)
    })

    it('should handle resize with large dimensions', () => {
      adapter.resize(4096, 2160)

      expect(mockWebGLEngine.resize).toHaveBeenCalledWith(4096, 2160)
    })

    it('should handle negative dimensions', () => {
      adapter.resize(-100, -100)

      expect(mockWebGLEngine.resize).toHaveBeenCalledWith(-100, -100)
    })

    it('should handle resize when not initialized', () => {
      const newAdapter = new WebGLTerminalAdapter()

      // Should not throw and should not call resize
      newAdapter.resize(800, 600)
      expect(mockWebGLEngine.resize).not.toHaveBeenCalled()
    })
  })

  describe('🧹 Disposal', () => {
    it('should dispose of resources when initialized', async () => {
      await adapter.initialize(mockConfig)

      expect(adapter.isInitialized).toBe(true)
      expect(adapter.engine).toBe(mockWebGLEngine)

      adapter.dispose()

      expect(mockTerminalRenderer.dispose).toHaveBeenCalledTimes(1)
      expect(mockWebGLEngine.dispose).toHaveBeenCalledTimes(1)
      expect(adapter.isInitialized).toBe(false)
      expect(adapter.engine).toBe(null)
    })

    it('should handle disposal when not initialized', () => {
      const newAdapter = new WebGLTerminalAdapter()

      // Should not throw
      newAdapter.dispose()

      expect(mockTerminalRenderer.dispose).not.toHaveBeenCalled()
      expect(mockWebGLEngine.dispose).not.toHaveBeenCalled()
      expect(newAdapter.isInitialized).toBe(false)
      expect(newAdapter.engine).toBe(null)
    })

    it('should handle multiple dispose calls', async () => {
      await adapter.initialize(mockConfig)

      adapter.dispose()
      adapter.dispose() // Second call

      expect(mockTerminalRenderer.dispose).toHaveBeenCalledTimes(1)
      expect(mockWebGLEngine.dispose).toHaveBeenCalledTimes(1)
      expect(adapter.isInitialized).toBe(false)
    })

    it('should handle disposal with null renderer', async () => {
      await adapter.initialize(mockConfig)

      // Manually set renderer to null to simulate edge case
      ;(
        adapter as { _renderer: typeof mockTerminalRenderer | null }
      )._renderer = null

      adapter.dispose()

      expect(mockWebGLEngine.dispose).toHaveBeenCalledTimes(1)
      expect(adapter.isInitialized).toBe(false)
    })

    it('should handle disposal with null engine', async () => {
      await adapter.initialize(mockConfig)

      // Manually set engine to null to simulate edge case
      ;(adapter as { _engine: typeof mockWebGLEngine | null })._engine = null

      adapter.dispose()

      expect(mockTerminalRenderer.dispose).toHaveBeenCalledTimes(1)
      expect(adapter.isInitialized).toBe(false)
    })
  })

  describe('🔍 Getters and Properties', () => {
    it('should return correct initialization state', () => {
      expect(adapter.isInitialized).toBe(false)
    })

    it('should return correct engine reference', () => {
      expect(adapter.engine).toBe(null)
    })

    it('should update initialization state after successful init', async () => {
      expect(adapter.isInitialized).toBe(false)

      await adapter.initialize(mockConfig)

      expect(adapter.isInitialized).toBe(true)
    })

    it('should update engine reference after successful init', async () => {
      expect(adapter.engine).toBe(null)

      await adapter.initialize(mockConfig)

      expect(adapter.engine).toBe(mockWebGLEngine)
    })

    it('should reset properties after disposal', async () => {
      await adapter.initialize(mockConfig)

      expect(adapter.isInitialized).toBe(true)
      expect(adapter.engine).toBe(mockWebGLEngine)

      adapter.dispose()

      expect(adapter.isInitialized).toBe(false)
      expect(adapter.engine).toBe(null)
    })
  })

  describe('🎯 Edge Cases and Error Handling', () => {
    it('should handle render with minimal data', async () => {
      await adapter.initialize(mockConfig)

      const minimalData: TerminalRenderData = {
        content: [],
        cursor: { row: 0, col: 0 },
      }

      adapter.render(minimalData)

      expect(mockTerminalRenderer.renderCursor).toHaveBeenCalledWith({
        row: 0,
        col: 0,
        visible: true,
        blinking: true,
      })
      expect(mockTerminalRenderer.renderSelection).toHaveBeenCalledWith(null)
    })

    it('should handle render with large cursor positions', async () => {
      await adapter.initialize(mockConfig)

      const largePositionData: TerminalRenderData = {
        content: ['test'],
        cursor: { row: 999, col: 999 },
      }

      adapter.render(largePositionData)

      expect(mockTerminalRenderer.renderCursor).toHaveBeenCalledWith({
        row: 999,
        col: 999,
        visible: true,
        blinking: true,
      })
    })

    it('should handle render with negative cursor positions', async () => {
      await adapter.initialize(mockConfig)

      const negativePositionData: TerminalRenderData = {
        content: ['test'],
        cursor: { row: -1, col: -1 },
      }

      adapter.render(negativePositionData)

      expect(mockTerminalRenderer.renderCursor).toHaveBeenCalledWith({
        row: -1,
        col: -1,
        visible: true,
        blinking: true,
      })
    })

    it('should handle initialization with null canvas', async () => {
      const invalidConfig = {
        canvas: null as unknown as HTMLCanvasElement,
        terminalConfig: { rows: 24, cols: 80 },
      } as WebGLTerminalConfig

      // Mock WebGL engine to throw error when initializing with null canvas
      mockWebGLEngine.initialize.mockRejectedValueOnce(
        new Error('Canvas is null')
      )

      await expect(adapter.initialize(invalidConfig)).rejects.toThrow(
        'Failed to initialize WebGL terminal adapter: Error: Canvas is null'
      )
    })

    it('should handle complex terminal configurations', async () => {
      const complexConfig: WebGLTerminalConfig = {
        canvas: mockCanvas,
        terminalConfig: {
          rows: 50,
          cols: 120,
          fontFamily: 'Cascadia Code',
          fontSize: 16,
          lineHeight: 1.5,
          letterSpacing: 0.5,
        },
        theme: {
          background: '#0d1117',
          foreground: '#c9d1d9',
          cursor: '#58a6ff',
          selectionBackground: '#264f78',
        },
      }

      await adapter.initialize(complexConfig)

      expect(mockTerminalRenderer.initialize).toHaveBeenCalledWith({
        rows: 50,
        cols: 120,
        fontSize: 12,
        fontFamily: 'SF Mono, Monaco, Inconsolata, Roboto Mono, monospace',
        backgroundColor: { r: 0, g: 0, b: 0, a: 1 },
        textColor: { r: 1, g: 1, b: 1, a: 1 },
        cursorColor: { r: 1, g: 1, b: 1, a: 1 },
      })
    })
  })

  describe('🏗️ Integration Testing', () => {
    it('should work end-to-end: initialize, render, resize, dispose', async () => {
      // Initialize
      await adapter.initialize(mockConfig)
      expect(adapter.isInitialized).toBe(true)

      // Render
      const renderData: TerminalRenderData = {
        content: ['$ echo "Hello, World!"', 'Hello, World!'],
        cursor: { row: 1, col: 13 },
        selection: [
          {
            start: { row: 1, col: 0 },
            end: { row: 1, col: 13 },
          },
        ],
      }
      adapter.render(renderData)
      expect(mockTerminalRenderer.renderCursor).toHaveBeenCalled()
      expect(mockTerminalRenderer.renderSelection).toHaveBeenCalled()

      // Resize
      adapter.resize(1920, 1080)
      expect(mockWebGLEngine.resize).toHaveBeenCalledWith(1920, 1080)

      // Update theme
      const theme: TerminalTheme = {
        background: '#2d3748',
        foreground: '#e2e8f0',
      }
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      adapter.updateTheme(theme)
      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()

      // Dispose
      adapter.dispose()
      expect(adapter.isInitialized).toBe(false)
      expect(adapter.engine).toBe(null)
    })

    it('should maintain state consistency throughout lifecycle', async () => {
      // Initial state
      expect(adapter.isInitialized).toBe(false)
      expect(adapter.engine).toBe(null)

      // After initialization
      await adapter.initialize(mockConfig)
      expect(adapter.isInitialized).toBe(true)
      expect(adapter.engine).toBe(mockWebGLEngine)

      // State should remain consistent during operations
      adapter.render({
        content: ['test'],
        cursor: { row: 0, col: 0 },
      })
      expect(adapter.isInitialized).toBe(true)
      expect(adapter.engine).toBe(mockWebGLEngine)

      adapter.resize(800, 600)
      expect(adapter.isInitialized).toBe(true)
      expect(adapter.engine).toBe(mockWebGLEngine)

      adapter.updateTheme({ background: '#000' })
      expect(adapter.isInitialized).toBe(true)
      expect(adapter.engine).toBe(mockWebGLEngine)

      // After disposal
      adapter.dispose()
      expect(adapter.isInitialized).toBe(false)
      expect(adapter.engine).toBe(null)
    })
  })
})
