/**
 * @fileoverview Comprehensive tests for TerminalRenderer class.
 *
 * @description
 * Tests the WebGL-accelerated terminal text renderer including
 * initialization, rendering, text handling, and performance optimization.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { WebGLEngine } from '../webgl/WebGLEngine'
import type {
  TerminalCell,
  TerminalCursor,
  TerminalRendererConfig,
  TextSelection,
} from './TerminalRenderer'
import { TerminalRenderer } from './TerminalRenderer'

// Mock Three.js
const mockScene = {
  add: vi.fn(),
  remove: vi.fn(),
  traverse: vi.fn(),
}

const mockCamera = {
  position: { set: vi.fn() },
  lookAt: vi.fn(),
  left: 0,
  right: 0,
  top: 0,
  bottom: 0,
  updateProjectionMatrix: vi.fn(),
}

const mockGeometry = {
  setAttribute: vi.fn(),
  setIndex: vi.fn(),
  dispose: vi.fn(),
}

const mockMaterial = {
  uniforms: {},
  dispose: vi.fn(),
}

vi.mock('three', () => ({
  Scene: vi.fn(() => mockScene),
  OrthographicCamera: vi.fn(() => mockCamera),
  InstancedBufferGeometry: vi.fn(() => mockGeometry),
  ShaderMaterial: vi.fn(() => mockMaterial),
  PlaneGeometry: vi.fn(() => mockGeometry),
  MeshBasicMaterial: vi.fn(() => mockMaterial),
  Mesh: vi.fn(),
  Vector3: vi.fn(),
  Color: vi.fn(),
  CanvasTexture: vi.fn(),
  DataTexture: vi.fn(),
  BufferAttribute: vi.fn(),
  InstancedBufferAttribute: vi.fn(),
}))

describe('🖥️ Terminal Renderer', () => {
  let renderer: TerminalRenderer
  let mockEngine: WebGLEngine
  let mockCanvas: HTMLCanvasElement

  beforeEach(() => {
    vi.clearAllMocks()

    mockCanvas = document.createElement('canvas')
    mockCanvas.width = 1024
    mockCanvas.height = 768

    // Mock WebGL engine
    mockEngine = {
      canvas: mockCanvas,
      isDisposed: false,
      createScene: vi.fn(() => mockScene),
      createOrthographicCamera: vi.fn(() => mockCamera),
      render: vi.fn(),
      resize: vi.fn(),
      dispose: vi.fn(),
    } as unknown as WebGLEngine

    renderer = new TerminalRenderer(mockEngine)
  })

  afterEach(() => {
    if (renderer && !renderer.isDisposed) {
      renderer.dispose()
    }
    vi.restoreAllMocks()
  })

  describe('🚀 Initialization', () => {
    it('should initialize with basic configuration', async () => {
      const config: TerminalRendererConfig = {
        rows: 25,
        cols: 80,
        fontSize: 14,
      }

      await renderer.initialize(config)

      expect(mockEngine.createScene).toHaveBeenCalled()
      expect(mockEngine.createOrthographicCamera).toHaveBeenCalled()
    })

    it('should initialize with full configuration', async () => {
      const config: TerminalRendererConfig = {
        rows: 30,
        cols: 120,
        fontSize: 16,
        fontFamily: 'Monaco',
        lineHeight: 1.2,
        charWidth: 9,
        charHeight: 18,
        antialias: true,
        backgroundColor: { r: 0, g: 0, b: 0, a: 1 },
        textColor: { r: 1, g: 1, b: 1, a: 1 },
        cursorColor: { r: 1, g: 1, b: 0, a: 1 },
        selectionColor: { r: 0, g: 0.5, b: 1, a: 0.3 },
        useWebGL: true,
        maxAtlasSize: 2048,
      }

      await renderer.initialize(config)

      expect(mockEngine.createScene).toHaveBeenCalled()
      expect(mockEngine.createOrthographicCamera).toHaveBeenCalled()
    })

    it('should throw error if already initialized', async () => {
      const config: TerminalRendererConfig = {
        rows: 25,
        cols: 80,
        fontSize: 14,
      }

      await renderer.initialize(config)

      await expect(renderer.initialize(config)).rejects.toThrow(
        'Terminal renderer already initialized'
      )
    })

    it('should throw error if disposed', async () => {
      renderer.dispose()

      const config: TerminalRendererConfig = {
        rows: 25,
        cols: 80,
        fontSize: 14,
      }

      await expect(renderer.initialize(config)).rejects.toThrow(
        'Cannot initialize disposed terminal renderer'
      )
    })

    it('should handle engine disposal during initialization', async () => {
      mockEngine.isDisposed = true

      const config: TerminalRendererConfig = {
        rows: 25,
        cols: 80,
        fontSize: 14,
      }

      await expect(renderer.initialize(config)).rejects.toThrow(
        'WebGL engine is disposed'
      )
    })
  })

  describe('📝 Text Rendering', () => {
    beforeEach(async () => {
      await renderer.initialize({
        rows: 25,
        cols: 80,
        fontSize: 14,
      })
    })

    it('should render terminal cells', () => {
      const cells: TerminalCell[] = [
        {
          char: 'H',
          fg: { r: 1, g: 1, b: 1, a: 1 },
          bg: { r: 0, g: 0, b: 0, a: 1 },
          bold: false,
          italic: false,
          underline: false,
          strikethrough: false,
          inverse: false,
        },
        {
          char: 'i',
          fg: { r: 1, g: 1, b: 1, a: 1 },
          bg: { r: 0, g: 0, b: 0, a: 1 },
          bold: true,
          italic: false,
          underline: false,
          strikethrough: false,
          inverse: false,
        },
      ]

      expect(() => renderer.renderText(0, 0, cells)).not.toThrow()
    })

    it('should handle text with different styles', () => {
      const cells: TerminalCell[] = [
        {
          char: 'B',
          fg: { r: 1, g: 0, b: 0, a: 1 },
          bg: { r: 0, g: 0, b: 0, a: 1 },
          bold: true,
          italic: false,
          underline: false,
          strikethrough: false,
          inverse: false,
        },
        {
          char: 'I',
          fg: { r: 0, g: 1, b: 0, a: 1 },
          bg: { r: 0, g: 0, b: 0, a: 1 },
          bold: false,
          italic: true,
          underline: false,
          strikethrough: false,
          inverse: false,
        },
        {
          char: 'U',
          fg: { r: 0, g: 0, b: 1, a: 1 },
          bg: { r: 0, g: 0, b: 0, a: 1 },
          bold: false,
          italic: false,
          underline: true,
          strikethrough: false,
          inverse: false,
        },
      ]

      expect(() => renderer.renderText(1, 0, cells)).not.toThrow()
    })

    it('should handle inverse colors', () => {
      const cells: TerminalCell[] = [
        {
          char: 'X',
          fg: { r: 1, g: 1, b: 1, a: 1 },
          bg: { r: 0, g: 0, b: 0, a: 1 },
          bold: false,
          italic: false,
          underline: false,
          strikethrough: false,
          inverse: true,
        },
      ]

      expect(() => renderer.renderText(0, 0, cells)).not.toThrow()
    })

    it('should handle special characters', () => {
      const cells: TerminalCell[] = [
        {
          char: '█',
          fg: { r: 1, g: 1, b: 1, a: 1 },
          bg: { r: 0, g: 0, b: 0, a: 1 },
          bold: false,
          italic: false,
          underline: false,
          strikethrough: false,
          inverse: false,
        },
        {
          char: '░',
          fg: { r: 0.5, g: 0.5, b: 0.5, a: 1 },
          bg: { r: 0, g: 0, b: 0, a: 1 },
          bold: false,
          italic: false,
          underline: false,
          strikethrough: false,
          inverse: false,
        },
      ]

      expect(() => renderer.renderText(0, 0, cells)).not.toThrow()
    })

    it('should handle empty cells', () => {
      expect(() => renderer.renderText(0, 0, [])).not.toThrow()
    })
  })

  describe('💫 Cursor Rendering', () => {
    beforeEach(async () => {
      await renderer.initialize({
        rows: 25,
        cols: 80,
        fontSize: 14,
      })
    })

    it('should render visible cursor', () => {
      const cursor: TerminalCursor = {
        row: 5,
        col: 10,
        visible: true,
        blinking: false,
      }

      expect(() => renderer.renderCursor(cursor)).not.toThrow()
    })

    it('should handle invisible cursor', () => {
      const cursor: TerminalCursor = {
        row: 5,
        col: 10,
        visible: false,
        blinking: false,
      }

      expect(() => renderer.renderCursor(cursor)).not.toThrow()
    })

    it('should handle blinking cursor', () => {
      const cursor: TerminalCursor = {
        row: 5,
        col: 10,
        visible: true,
        blinking: true,
      }

      expect(() => renderer.renderCursor(cursor)).not.toThrow()
    })

    it('should handle cursor at boundaries', () => {
      const cursorAtStart: TerminalCursor = {
        row: 0,
        col: 0,
        visible: true,
        blinking: false,
      }

      const cursorAtEnd: TerminalCursor = {
        row: 24,
        col: 79,
        visible: true,
        blinking: false,
      }

      expect(() => renderer.renderCursor(cursorAtStart)).not.toThrow()
      expect(() => renderer.renderCursor(cursorAtEnd)).not.toThrow()
    })
  })

  describe('🎯 Selection Rendering', () => {
    beforeEach(async () => {
      await renderer.initialize({
        rows: 25,
        cols: 80,
        fontSize: 14,
      })
    })

    it('should render text selection', () => {
      const selection: TextSelection = {
        startRow: 2,
        startCol: 5,
        endRow: 4,
        endCol: 15,
      }

      expect(() => renderer.renderSelection(selection)).not.toThrow()
    })

    it('should handle single character selection', () => {
      const selection: TextSelection = {
        startRow: 5,
        startCol: 10,
        endRow: 5,
        endCol: 10,
      }

      expect(() => renderer.renderSelection(selection)).not.toThrow()
    })

    it('should handle multi-line selection', () => {
      const selection: TextSelection = {
        startRow: 0,
        startCol: 0,
        endRow: 24,
        endCol: 79,
      }

      expect(() => renderer.renderSelection(selection)).not.toThrow()
    })

    it('should handle reversed selection', () => {
      const selection: TextSelection = {
        startRow: 10,
        startCol: 20,
        endRow: 5,
        endCol: 10,
      }

      expect(() => renderer.renderSelection(selection)).not.toThrow()
    })

    it('should clear selection when null', () => {
      expect(() => renderer.renderSelection(null)).not.toThrow()
    })
  })

  describe('📏 Resize Handling', () => {
    beforeEach(async () => {
      await renderer.initialize({
        rows: 25,
        cols: 80,
        fontSize: 14,
      })
    })

    it('should resize to new dimensions', () => {
      renderer.resize(30, 100)

      expect(mockCamera.left).toBeDefined()
      expect(mockCamera.right).toBeDefined()
      expect(mockCamera.top).toBeDefined()
      expect(mockCamera.bottom).toBeDefined()
      expect(mockCamera.updateProjectionMatrix).toHaveBeenCalled()
    })

    it('should handle extreme dimensions', () => {
      expect(() => renderer.resize(1, 1)).not.toThrow()
      expect(() => renderer.resize(200, 500)).not.toThrow()
    })

    it('should not resize if disposed', () => {
      renderer.dispose()

      // Clear mock calls from previous operations
      vi.clearAllMocks()

      expect(() => renderer.resize(30, 100)).not.toThrow()
      expect(mockCamera.updateProjectionMatrix).not.toHaveBeenCalled()
    })
  })

  describe('🎨 Rendering Pipeline', () => {
    beforeEach(async () => {
      await renderer.initialize({
        rows: 25,
        cols: 80,
        fontSize: 14,
      })
    })

    it('should render complete frame', () => {
      const cells: TerminalCell[] = [
        {
          char: 'A',
          fg: { r: 1, g: 1, b: 1, a: 1 },
          bg: { r: 0, g: 0, b: 0, a: 1 },
          bold: false,
          italic: false,
          underline: false,
          strikethrough: false,
          inverse: false,
        },
      ]

      const cursor: TerminalCursor = {
        row: 0,
        col: 1,
        visible: true,
        blinking: false,
      }

      const selection: TextSelection = {
        startRow: 0,
        startCol: 0,
        endRow: 0,
        endCol: 0,
      }

      renderer.renderText(0, 0, cells)
      renderer.renderCursor(cursor)
      renderer.renderSelection(selection)

      expect(() => renderer.render()).not.toThrow()
      expect(mockEngine.render).toHaveBeenCalled()
    })

    it('should handle render without initialization', () => {
      const uninitializedRenderer = new TerminalRenderer(mockEngine)

      expect(() => uninitializedRenderer.render()).not.toThrow()
      expect(mockEngine.render).not.toHaveBeenCalled()
    })

    it('should not render when disposed', () => {
      renderer.dispose()

      expect(() => renderer.render()).not.toThrow()
      expect(mockEngine.render).not.toHaveBeenCalled()
    })
  })

  describe('⚡ Performance Optimizations', () => {
    beforeEach(async () => {
      await renderer.initialize({
        rows: 25,
        cols: 80,
        fontSize: 14,
        useWebGL: true,
      })
    })

    it('should handle dirty region tracking', () => {
      // Simulate dirty region updates
      renderer.markDirty(0, 0, 5, 10)
      renderer.markDirty(10, 10, 15, 20)

      expect(() => renderer.render()).not.toThrow()
    })

    it('should clear dirty regions after render', () => {
      renderer.markDirty(0, 0, 25, 80)
      renderer.render()

      // Should not re-render unchanged content
      expect(() => renderer.render()).not.toThrow()
    })

    it('should handle atlas texture updates', () => {
      const cells: TerminalCell[] = []

      // Generate cells with various characters to trigger atlas updates
      for (let i = 32; i < 127; i++) {
        cells.push({
          char: String.fromCharCode(i),
          fg: { r: 1, g: 1, b: 1, a: 1 },
          bg: { r: 0, g: 0, b: 0, a: 1 },
          bold: false,
          italic: false,
          underline: false,
          strikethrough: false,
          inverse: false,
        })
      }

      expect(() => renderer.renderText(0, 0, cells)).not.toThrow()
      expect(() => renderer.render()).not.toThrow()
    })
  })

  describe('🗑️ Resource Management', () => {
    it('should dispose resources properly', async () => {
      await renderer.initialize({
        rows: 25,
        cols: 80,
        fontSize: 14,
      })

      renderer.dispose()

      expect(renderer.isDisposed).toBe(true)
      expect(mockMaterial.dispose).toHaveBeenCalled()
      expect(mockGeometry.dispose).toHaveBeenCalled()
    })

    it('should handle disposal when not initialized', () => {
      expect(() => renderer.dispose()).not.toThrow()
      expect(renderer.isDisposed).toBe(true)
    })

    it('should handle multiple dispose calls', async () => {
      await renderer.initialize({
        rows: 25,
        cols: 80,
        fontSize: 14,
      })

      renderer.dispose()

      expect(() => renderer.dispose()).not.toThrow()
      expect(mockMaterial.dispose).toHaveBeenCalledTimes(1)
    })
  })

  describe('🎯 Edge Cases', () => {
    it('should handle invalid configuration gracefully', async () => {
      const invalidConfig: TerminalRendererConfig = {
        rows: 0,
        cols: 0,
        fontSize: 0,
      }

      await expect(renderer.initialize(invalidConfig)).rejects.toThrow(
        'Invalid terminal configuration'
      )
    })

    it('should handle negative dimensions', async () => {
      const config: TerminalRendererConfig = {
        rows: -5,
        cols: -10,
        fontSize: 14,
      }

      await expect(renderer.initialize(config)).rejects.toThrow(
        'Invalid terminal configuration'
      )
    })

    it('should handle text rendering out of bounds', async () => {
      await renderer.initialize({
        rows: 25,
        cols: 80,
        fontSize: 14,
      })

      const cells: TerminalCell[] = [
        {
          char: 'X',
          fg: { r: 1, g: 1, b: 1, a: 1 },
          bg: { r: 0, g: 0, b: 0, a: 1 },
          bold: false,
          italic: false,
          underline: false,
          strikethrough: false,
          inverse: false,
        },
      ]

      // Should handle gracefully
      expect(() => renderer.renderText(100, 100, cells)).not.toThrow()
      expect(() => renderer.renderText(-1, -1, cells)).not.toThrow()
    })

    it('should handle cursor out of bounds', async () => {
      await renderer.initialize({
        rows: 25,
        cols: 80,
        fontSize: 14,
      })

      const invalidCursor: TerminalCursor = {
        row: -1,
        col: -1,
        visible: true,
        blinking: false,
      }

      expect(() => renderer.renderCursor(invalidCursor)).not.toThrow()
    })

    it('should handle selection out of bounds', async () => {
      await renderer.initialize({
        rows: 25,
        cols: 80,
        fontSize: 14,
      })

      const invalidSelection: TextSelection = {
        startRow: -10,
        startCol: -10,
        endRow: 1000,
        endCol: 1000,
      }

      expect(() => renderer.renderSelection(invalidSelection)).not.toThrow()
    })
  })

  describe('🏁 Performance Tests', () => {
    beforeEach(async () => {
      await renderer.initialize({
        rows: 25,
        cols: 80,
        fontSize: 14,
      })
    })

    it('should render large amounts of text efficiently', () => {
      const cells: TerminalCell[] = []

      // Generate a full screen of text
      for (let i = 0; i < 25 * 80; i++) {
        cells.push({
          char: String.fromCharCode(65 + (i % 26)),
          fg: { r: 1, g: 1, b: 1, a: 1 },
          bg: { r: 0, g: 0, b: 0, a: 1 },
          bold: false,
          italic: false,
          underline: false,
          strikethrough: false,
          inverse: false,
        })
      }

      const startTime = performance.now()

      renderer.renderText(0, 0, cells)
      renderer.render()

      const duration = performance.now() - startTime
      expect(duration).toBeLessThan(50) // Should render within 50ms
    })

    it('should handle rapid resize operations', () => {
      const startTime = performance.now()

      for (let i = 0; i < 100; i++) {
        renderer.resize(20 + (i % 10), 60 + (i % 20))
      }

      const duration = performance.now() - startTime
      expect(duration).toBeLessThan(100) // Should handle 100 resizes within 100ms
    })
  })
})
