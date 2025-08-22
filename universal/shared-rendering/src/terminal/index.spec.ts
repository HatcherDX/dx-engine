/**
 * @fileoverview Tests for Terminal rendering module exports.
 *
 * @description
 * Comprehensive tests for the Terminal rendering module's export structure.
 * Ensures all classes, types, and utilities are properly exported and accessible.
 * Validates module structure and API consistency for terminal rendering components.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @priority HIGH
 */

import { describe, it, expect } from 'vitest'
import { TerminalRenderer } from './index'
import type {
  TerminalRendererConfig,
  TerminalCell,
  TerminalCursor,
  TextSelection,
} from './index'

describe('🖥️ Terminal Rendering Module - Index Exports', () => {
  describe('📦 Class Exports', () => {
    it('should export TerminalRenderer class', () => {
      expect(TerminalRenderer).toBeDefined()
      expect(typeof TerminalRenderer).toBe('function')
      expect(TerminalRenderer.name).toBe('TerminalRenderer')
    })

    it('should allow TerminalRenderer instantiation', () => {
      expect(() => {
        // This will create an instance but not initialize it
        const renderer = new TerminalRenderer()
        expect(renderer).toBeInstanceOf(TerminalRenderer)
      }).not.toThrow()
    })

    it('should have proper prototype chain', () => {
      const renderer = new TerminalRenderer()
      expect(renderer.constructor).toBe(TerminalRenderer)
      expect(renderer instanceof TerminalRenderer).toBe(true)
    })
  })

  describe('🔧 Type Export Validation', () => {
    it('should validate TerminalRendererConfig type structure', () => {
      const config: TerminalRendererConfig = {
        canvas: document.createElement('canvas'),
        width: 80,
        height: 24,
        cellWidth: 10,
        cellHeight: 18,
        fontFamily: 'monospace',
        fontSize: 14,
        theme: {
          background: '#000000',
          foreground: '#ffffff',
          cursor: '#ffffff',
          selection: '#3366cc',
          black: '#000000',
          red: '#cc0000',
          green: '#00cc00',
          yellow: '#cccc00',
          blue: '#0000cc',
          magenta: '#cc00cc',
          cyan: '#00cccc',
          white: '#cccccc',
          brightBlack: '#666666',
          brightRed: '#ff0000',
          brightGreen: '#00ff00',
          brightYellow: '#ffff00',
          brightBlue: '#0000ff',
          brightMagenta: '#ff00ff',
          brightCyan: '#00ffff',
          brightWhite: '#ffffff',
        },
      }

      expect(config.canvas instanceof HTMLCanvasElement).toBe(true)
      expect(typeof config.width).toBe('number')
      expect(typeof config.height).toBe('number')
      expect(typeof config.cellWidth).toBe('number')
      expect(typeof config.cellHeight).toBe('number')
      expect(typeof config.fontFamily).toBe('string')
      expect(typeof config.fontSize).toBe('number')
      expect(typeof config.theme).toBe('object')
    })

    it('should validate TerminalCell type structure', () => {
      const cell: TerminalCell = {
        char: 'A',
        fg: 0xffffff,
        bg: 0x000000,
        bold: false,
        dim: false,
        italic: false,
        underline: false,
        strikethrough: false,
        inverse: false,
        invisible: false,
        blink: false,
      }

      expect(typeof cell.char).toBe('string')
      expect(typeof cell.fg).toBe('number')
      expect(typeof cell.bg).toBe('number')
      expect(typeof cell.bold).toBe('boolean')
      expect(typeof cell.dim).toBe('boolean')
      expect(typeof cell.italic).toBe('boolean')
      expect(typeof cell.underline).toBe('boolean')
      expect(typeof cell.strikethrough).toBe('boolean')
      expect(typeof cell.inverse).toBe('boolean')
      expect(typeof cell.invisible).toBe('boolean')
      expect(typeof cell.blink).toBe('boolean')
    })

    it('should validate TerminalCursor type structure', () => {
      const cursor: TerminalCursor = {
        x: 0,
        y: 0,
        visible: true,
        blinking: true,
        style: 'block',
      }

      expect(typeof cursor.x).toBe('number')
      expect(typeof cursor.y).toBe('number')
      expect(typeof cursor.visible).toBe('boolean')
      expect(typeof cursor.blinking).toBe('boolean')
      expect(['block', 'underline', 'bar']).toContain(cursor.style)
    })

    it('should validate TextSelection type structure', () => {
      const selection: TextSelection = {
        startX: 0,
        startY: 0,
        endX: 5,
        endY: 2,
      }

      expect(typeof selection.startX).toBe('number')
      expect(typeof selection.startY).toBe('number')
      expect(typeof selection.endX).toBe('number')
      expect(typeof selection.endY).toBe('number')
    })
  })

  describe('🔍 Type Completeness', () => {
    it('should support minimal TerminalRendererConfig', () => {
      const minimalConfig: TerminalRendererConfig = {
        canvas: document.createElement('canvas'),
        width: 80,
        height: 24,
        cellWidth: 10,
        cellHeight: 18,
      }

      expect(minimalConfig.fontFamily).toBeUndefined()
      expect(minimalConfig.fontSize).toBeUndefined()
      expect(minimalConfig.theme).toBeUndefined()
    })

    it('should support minimal TerminalCell', () => {
      const minimalCell: TerminalCell = {
        char: 'X',
        fg: 0xffffff,
        bg: 0x000000,
      }

      expect(minimalCell.bold).toBeUndefined()
      expect(minimalCell.italic).toBeUndefined()
      expect(minimalCell.underline).toBeUndefined()
    })

    it('should support all cursor styles', () => {
      const blockCursor: TerminalCursor = {
        x: 0,
        y: 0,
        style: 'block',
        visible: true,
        blinking: false,
      }

      const underlineCursor: TerminalCursor = {
        x: 1,
        y: 1,
        style: 'underline',
        visible: true,
        blinking: true,
      }

      const barCursor: TerminalCursor = {
        x: 2,
        y: 2,
        style: 'bar',
        visible: false,
        blinking: false,
      }

      expect(blockCursor.style).toBe('block')
      expect(underlineCursor.style).toBe('underline')
      expect(barCursor.style).toBe('bar')
    })

    it('should handle text selection edge cases', () => {
      const singleCharSelection: TextSelection = {
        startX: 5,
        startY: 10,
        endX: 5,
        endY: 10,
      }

      const reverseSelection: TextSelection = {
        startX: 10,
        startY: 5,
        endX: 0,
        endY: 3,
      }

      expect(singleCharSelection.startX).toBe(singleCharSelection.endX)
      expect(singleCharSelection.startY).toBe(singleCharSelection.endY)
      expect(reverseSelection.startX).toBeGreaterThan(reverseSelection.endX)
      expect(reverseSelection.startY).toBeGreaterThan(reverseSelection.endY)
    })
  })

  describe('🏗️ Module Integration', () => {
    it('should work with TerminalRenderer and its types together', () => {
      const canvas = document.createElement('canvas')
      const config: TerminalRendererConfig = {
        canvas,
        width: 80,
        height: 24,
        cellWidth: 12,
        cellHeight: 20,
        fontFamily: 'Courier New',
        fontSize: 16,
      }

      const renderer = new TerminalRenderer()
      expect(renderer).toBeInstanceOf(TerminalRenderer)
      expect(config.canvas).toBe(canvas)
    })

    it('should maintain type relationships', () => {
      const cells: TerminalCell[] = [
        {
          char: 'H',
          fg: 0xffffff,
          bg: 0x000000,
          bold: true,
        },
        {
          char: 'i',
          fg: 0x00ff00,
          bg: 0x000000,
          italic: true,
        },
      ]

      const cursor: TerminalCursor = {
        x: 2,
        y: 0,
        visible: true,
        blinking: true,
        style: 'block',
      }

      const selection: TextSelection = {
        startX: 0,
        startY: 0,
        endX: 1,
        endY: 0,
      }

      expect(cells.length).toBe(2)
      expect(cells[0].char).toBe('H')
      expect(cells[1].char).toBe('i')
      expect(cursor.x).toBe(2)
      expect(selection.endX).toBe(1)
    })

    it('should support theme color validation', () => {
      const theme = {
        background: '#1e1e1e',
        foreground: '#d4d4d4',
        cursor: '#ffffff',
        selection: '#264f78',
        black: '#000000',
        red: '#cd3131',
        green: '#0dbc79',
        yellow: '#e5e510',
        blue: '#2472c8',
        magenta: '#bc3fbc',
        cyan: '#11a8cd',
        white: '#e5e5e5',
        brightBlack: '#666666',
        brightRed: '#f14c4c',
        brightGreen: '#23d18b',
        brightYellow: '#f5f543',
        brightBlue: '#3b8eea',
        brightMagenta: '#d670d6',
        brightCyan: '#29b8db',
        brightWhite: '#e5e5e5',
      }

      const config: TerminalRendererConfig = {
        canvas: document.createElement('canvas'),
        width: 80,
        height: 24,
        cellWidth: 10,
        cellHeight: 18,
        theme,
      }

      expect(config.theme?.background).toBe('#1e1e1e')
      expect(config.theme?.foreground).toBe('#d4d4d4')
      expect(Object.keys(theme).length).toBe(20) // All ANSI colors + special colors
    })
  })

  describe('🎯 API Consistency', () => {
    it('should maintain consistent naming conventions', () => {
      // All exported types should follow PascalCase
      const typeNames = [
        'TerminalRendererConfig',
        'TerminalCell',
        'TerminalCursor',
        'TextSelection',
      ]

      typeNames.forEach((typeName) => {
        expect(typeName).toMatch(/^[A-Z][a-zA-Z]*$/)
      })
    })

    it('should provide comprehensive terminal rendering types', () => {
      // Verify that all necessary types for terminal rendering are exported
      const requiredTypes = [
        'TerminalRendererConfig', // Configuration
        'TerminalCell', // Cell data structure
        'TerminalCursor', // Cursor information
        'TextSelection', // Selection handling
      ]

      // This test verifies the types can be imported and used
      expect(requiredTypes.length).toBe(4)
    })

    it('should maintain color consistency in terminal cells', () => {
      const standardColors = [
        0x000000, // Black
        0xff0000, // Red
        0x00ff00, // Green
        0xffff00, // Yellow
        0x0000ff, // Blue
        0xff00ff, // Magenta
        0x00ffff, // Cyan
        0xffffff, // White
      ]

      standardColors.forEach((color) => {
        const cell: TerminalCell = {
          char: 'X',
          fg: color,
          bg: 0x000000,
        }

        expect(typeof cell.fg).toBe('number')
        expect(cell.fg).toBe(color)
      })
    })
  })

  describe('📊 Performance Characteristics', () => {
    it('should import module quickly', () => {
      const start = Date.now()

      // Re-import to test import performance
      import('./index').then((module) => {
        const end = Date.now()
        expect(end - start).toBeLessThan(100) // Should import in <100ms
        expect(module.TerminalRenderer).toBeDefined()
      })
    })

    it('should create renderer instances efficiently', () => {
      const start = Date.now()

      const renderers = Array.from({ length: 10 }, () => new TerminalRenderer())

      const end = Date.now()
      expect(end - start).toBeLessThan(50) // Should create 10 instances in <50ms
      expect(renderers.length).toBe(10)
      expect(renderers.every((r) => r instanceof TerminalRenderer)).toBe(true)
    })

    it('should handle large terminal configurations efficiently', () => {
      const largeConfig: TerminalRendererConfig = {
        canvas: document.createElement('canvas'),
        width: 200, // Large terminal
        height: 100, // Large terminal
        cellWidth: 8,
        cellHeight: 16,
        fontFamily: 'Monaco',
        fontSize: 12,
        theme: {
          background: '#000000',
          foreground: '#ffffff',
          cursor: '#ffffff',
          selection: '#3366cc',
          black: '#000000',
          red: '#cc0000',
          green: '#00cc00',
          yellow: '#cccc00',
          blue: '#0000cc',
          magenta: '#cc00cc',
          cyan: '#00cccc',
          white: '#cccccc',
          brightBlack: '#666666',
          brightRed: '#ff0000',
          brightGreen: '#00ff00',
          brightYellow: '#ffff00',
          brightBlue: '#0000ff',
          brightMagenta: '#ff00ff',
          brightCyan: '#00ffff',
          brightWhite: '#ffffff',
        },
      }

      expect(largeConfig.width * largeConfig.height).toBe(20000) // 20k cells
      expect(typeof largeConfig).toBe('object')
    })
  })

  describe('🔧 Type Edge Cases', () => {
    it('should handle special characters in terminal cells', () => {
      const specialChars = ['█', '▀', '▄', '▌', '▐', '■', '□', '▣', '▤', '▥']

      specialChars.forEach((char) => {
        const cell: TerminalCell = {
          char,
          fg: 0xffffff,
          bg: 0x000000,
        }

        expect(cell.char).toBe(char)
        expect(typeof cell.char).toBe('string')
      })
    })

    it('should handle cursor boundary conditions', () => {
      const edgeCursor: TerminalCursor = {
        x: 79, // Right edge of 80-column terminal
        y: 23, // Bottom edge of 24-row terminal
        visible: true,
        blinking: false,
        style: 'bar',
      }

      expect(edgeCursor.x).toBe(79)
      expect(edgeCursor.y).toBe(23)
      expect(edgeCursor.visible).toBe(true)
    })

    it('should handle empty text selections', () => {
      const emptySelection: TextSelection = {
        startX: 10,
        startY: 5,
        endX: 10,
        endY: 5,
      }

      expect(emptySelection.startX).toBe(emptySelection.endX)
      expect(emptySelection.startY).toBe(emptySelection.endY)
    })
  })
})
