/**
 * @fileoverview Comprehensive tests for useTerminalInput composable.
 *
 * @description
 * Achieves 100% code coverage for useTerminalInput.ts by testing all
 * character handling, keyboard navigation, history management, and callbacks.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useTerminalInput } from './useTerminalInput'

describe('useTerminalInput', () => {
  describe('initialization', () => {
    it('should initialize with default values', () => {
      const handler = useTerminalInput()

      expect(handler.input.value).toBe('')
      expect(handler.cursorPosition.value).toBe(0)
      expect(handler.history.value).toEqual([])
      expect(handler.historyIndex.value).toBe(-1)
    })

    it('should initialize with custom initial values', () => {
      const handler = useTerminalInput({
        initialValue: 'test input',
        initialCursor: 5,
      })

      expect(handler.input.value).toBe('test input')
      expect(handler.cursorPosition.value).toBe(5)
    })
  })

  describe('handleCharacter', () => {
    it('should insert regular character at cursor position', () => {
      const onInputChange = vi.fn()
      const handler = useTerminalInput({ onInputChange })

      handler.handleCharacter('a')
      expect(handler.input.value).toBe('a')
      expect(handler.cursorPosition.value).toBe(1)
      expect(onInputChange).toHaveBeenCalledWith('a', 1)
    })

    it('should insert character in middle of text', () => {
      const handler = useTerminalInput({
        initialValue: 'hello',
        initialCursor: 2,
      })

      handler.handleCharacter('X')
      expect(handler.input.value).toBe('heXllo')
      expect(handler.cursorPosition.value).toBe(3)
    })

    it('should handle backspace character \\b', () => {
      const handler = useTerminalInput({
        initialValue: 'test',
        initialCursor: 3,
      })

      const result = handler.handleCharacter('\b')
      expect(result).toBe(true)
      expect(handler.input.value).toBe('tet') // Removes 's' at position 2
      expect(handler.cursorPosition.value).toBe(2)
    })

    it('should handle Backspace string', () => {
      const handler = useTerminalInput({
        initialValue: 'test',
        initialCursor: 2,
      })

      const result = handler.handleCharacter('Backspace')
      expect(result).toBe(true)
      expect(handler.input.value).toBe('tst')
      expect(handler.cursorPosition.value).toBe(1)
    })

    it('should not delete when backspace at position 0', () => {
      const onInputChange = vi.fn()
      const handler = useTerminalInput({
        initialValue: 'test',
        initialCursor: 0,
        onInputChange,
      })

      handler.handleCharacter('\b')
      expect(handler.input.value).toBe('test')
      expect(handler.cursorPosition.value).toBe(0)
      expect(onInputChange).not.toHaveBeenCalled()
    })

    it('should handle Enter key (\\r) when not multiline', () => {
      const onEnter = vi.fn()
      const handler = useTerminalInput({
        initialValue: 'command',
        onEnter,
      })

      const result = handler.handleCharacter('\r')
      expect(result).toBe(true)
      expect(onEnter).toHaveBeenCalledWith('command')
    })

    it('should handle Enter key (\\n) when not multiline', () => {
      const onEnter = vi.fn()
      const handler = useTerminalInput({
        initialValue: 'command',
        onEnter,
      })

      const result = handler.handleCharacter('\n')
      expect(result).toBe(true)
      expect(onEnter).toHaveBeenCalledWith('command')
    })

    it('should handle Enter without callback', () => {
      const handler = useTerminalInput({
        initialValue: 'command',
      })

      const result = handler.handleCharacter('\r')
      expect(result).toBe(true)
    })

    it('should allow newline in multiline mode', () => {
      const onEnter = vi.fn()
      const handler = useTerminalInput({
        allowMultiline: true,
        onEnter,
      })

      const result = handler.handleCharacter('\n')
      // In multiline mode, Enter still returns true but doesn't call onEnter
      expect(result).toBe(true)
      expect(onEnter).not.toHaveBeenCalled()
    })

    it('should use custom key handler when provided', () => {
      const customKeyHandler = vi.fn(() => true)
      const handler = useTerminalInput({ customKeyHandler })

      const result = handler.handleCharacter('a')
      expect(result).toBe(true)
      expect(customKeyHandler).toHaveBeenCalledWith('a')
      expect(handler.input.value).toBe('') // Character not inserted
    })

    it('should fall through when custom handler returns false', () => {
      const customKeyHandler = vi.fn(() => false)
      const handler = useTerminalInput({ customKeyHandler })

      handler.handleCharacter('a')
      expect(customKeyHandler).toHaveBeenCalledWith('a')
      expect(handler.input.value).toBe('a')
    })
  })

  describe('handleKeyboard', () => {
    describe('arrow navigation', () => {
      it('should move cursor left', () => {
        const onInputChange = vi.fn()
        const handler = useTerminalInput({
          initialValue: 'test',
          initialCursor: 2,
          onInputChange,
        })

        const result = handler.handleKeyboard('ArrowLeft')
        expect(result).toBe(true)
        expect(handler.cursorPosition.value).toBe(1)
        expect(onInputChange).toHaveBeenCalledWith('test', 1)
      })

      it('should not move cursor left at position 0', () => {
        const onInputChange = vi.fn()
        const handler = useTerminalInput({
          initialValue: 'test',
          initialCursor: 0,
          onInputChange,
        })

        handler.handleKeyboard('ArrowLeft')
        expect(handler.cursorPosition.value).toBe(0)
        expect(onInputChange).not.toHaveBeenCalled()
      })

      it('should move cursor right', () => {
        const handler = useTerminalInput({
          initialValue: 'test',
          initialCursor: 2,
        })

        const result = handler.handleKeyboard('ArrowRight')
        expect(result).toBe(true)
        expect(handler.cursorPosition.value).toBe(3)
      })

      it('should not move cursor right at end', () => {
        const onInputChange = vi.fn()
        const handler = useTerminalInput({
          initialValue: 'test',
          initialCursor: 4,
          onInputChange,
        })

        handler.handleKeyboard('ArrowRight')
        expect(handler.cursorPosition.value).toBe(4)
        expect(onInputChange).not.toHaveBeenCalled()
      })
    })

    describe('history navigation', () => {
      let handler: ReturnType<typeof useTerminalInput>

      beforeEach(() => {
        handler = useTerminalInput()
        handler.addToHistory('command1')
        handler.addToHistory('command2')
        handler.addToHistory('command3')
      })

      it('should navigate up through history', () => {
        const result = handler.handleKeyboard('ArrowUp')
        expect(result).toBe(true)
        expect(handler.input.value).toBe('command3')
        expect(handler.historyIndex.value).toBe(0)
        expect(handler.cursorPosition.value).toBe(8)

        handler.handleKeyboard('ArrowUp')
        expect(handler.input.value).toBe('command2')
        expect(handler.historyIndex.value).toBe(1)
      })

      it('should not navigate up beyond history length', () => {
        handler.historyIndex.value = 2
        const onInputChange = vi.fn()
        handler = useTerminalInput({ onInputChange })
        handler.addToHistory('cmd')
        handler.historyIndex.value = 0

        handler.handleKeyboard('ArrowUp')
        expect(handler.historyIndex.value).toBe(0)
        expect(onInputChange).not.toHaveBeenCalled()
      })

      it('should navigate down through history', () => {
        handler.historyIndex.value = 2

        const result = handler.handleKeyboard('ArrowDown')
        expect(result).toBe(true)
        expect(handler.input.value).toBe('command2')
        expect(handler.historyIndex.value).toBe(1)
      })

      it('should clear input when navigating down from index 0', () => {
        handler.historyIndex.value = 0

        handler.handleKeyboard('ArrowDown')
        expect(handler.input.value).toBe('')
        expect(handler.historyIndex.value).toBe(-1)
        expect(handler.cursorPosition.value).toBe(0)
      })

      it('should not navigate down from -1', () => {
        handler.historyIndex.value = -1
        const onInputChange = vi.fn()
        handler = useTerminalInput({ onInputChange })
        handler.historyIndex.value = -1

        handler.handleKeyboard('ArrowDown')
        expect(handler.historyIndex.value).toBe(-1)
        expect(onInputChange).not.toHaveBeenCalled()
      })
    })

    describe('Home/End keys', () => {
      it('should move cursor to start with Home', () => {
        const handler = useTerminalInput({
          initialValue: 'test',
          initialCursor: 3,
        })

        const result = handler.handleKeyboard('Home')
        expect(result).toBe(true)
        expect(handler.cursorPosition.value).toBe(0)
      })

      it('should move cursor to end with End', () => {
        const handler = useTerminalInput({
          initialValue: 'test',
          initialCursor: 1,
        })

        const result = handler.handleKeyboard('End')
        expect(result).toBe(true)
        expect(handler.cursorPosition.value).toBe(4)
      })
    })

    describe('special keys', () => {
      it('should handle Enter key', () => {
        const onEnter = vi.fn()
        const handler = useTerminalInput({
          initialValue: 'command',
          onEnter,
        })

        const result = handler.handleKeyboard('Enter')
        expect(result).toBe(true)
        expect(onEnter).toHaveBeenCalledWith('command')
      })

      it('should handle Enter without callback', () => {
        const handler = useTerminalInput()

        const result = handler.handleKeyboard('Enter')
        expect(result).toBe(true)
      })

      it('should handle Escape key', () => {
        const onEscape = vi.fn()
        const handler = useTerminalInput({ onEscape })

        const result = handler.handleKeyboard('Escape')
        expect(result).toBe(true)
        expect(onEscape).toHaveBeenCalled()
      })

      it('should handle Escape without callback', () => {
        const handler = useTerminalInput()

        const result = handler.handleKeyboard('Escape')
        expect(result).toBe(true)
      })

      it('should handle Backspace key', () => {
        const handler = useTerminalInput({
          initialValue: 'test',
          initialCursor: 3,
        })

        const result = handler.handleKeyboard('Backspace')
        expect(result).toBe(true)
        expect(handler.input.value).toBe('tet') // Removes 's' at position 2
        expect(handler.cursorPosition.value).toBe(2)
      })

      it('should not delete with Backspace at position 0', () => {
        const onInputChange = vi.fn()
        const handler = useTerminalInput({
          initialValue: 'test',
          initialCursor: 0,
          onInputChange,
        })

        handler.handleKeyboard('Backspace')
        expect(handler.input.value).toBe('test')
        expect(onInputChange).not.toHaveBeenCalled()
      })

      it('should handle Delete key', () => {
        const handler = useTerminalInput({
          initialValue: 'test',
          initialCursor: 1,
        })

        const result = handler.handleKeyboard('Delete')
        expect(result).toBe(true)
        expect(handler.input.value).toBe('tst')
        expect(handler.cursorPosition.value).toBe(1)
      })

      it('should not delete with Delete at end', () => {
        const onInputChange = vi.fn()
        const handler = useTerminalInput({
          initialValue: 'test',
          initialCursor: 4,
          onInputChange,
        })

        handler.handleKeyboard('Delete')
        expect(handler.input.value).toBe('test')
        expect(onInputChange).not.toHaveBeenCalled()
      })
    })

    it('should return false for unknown commands', () => {
      const handler = useTerminalInput()

      const result = handler.handleKeyboard('UnknownKey')
      expect(result).toBe(false)
    })

    it('should use custom key handler when provided', () => {
      const customKeyHandler = vi.fn(() => true)
      const handler = useTerminalInput({ customKeyHandler })

      const result = handler.handleKeyboard('ArrowLeft')
      expect(result).toBe(true)
      expect(customKeyHandler).toHaveBeenCalledWith('ArrowLeft')
      expect(handler.cursorPosition.value).toBe(0) // Not moved
    })

    it('should fall through when custom handler returns false', () => {
      const customKeyHandler = vi.fn(() => false)
      const handler = useTerminalInput({
        customKeyHandler,
        initialValue: 'test',
        initialCursor: 2,
      })

      handler.handleKeyboard('ArrowLeft')
      expect(customKeyHandler).toHaveBeenCalledWith('ArrowLeft')
      expect(handler.cursorPosition.value).toBe(1) // Moved
    })
  })

  describe('setInput', () => {
    it('should set input and cursor to end by default', () => {
      const onInputChange = vi.fn()
      const handler = useTerminalInput({ onInputChange })

      handler.setInput('new text')
      expect(handler.input.value).toBe('new text')
      expect(handler.cursorPosition.value).toBe(8)
      expect(onInputChange).toHaveBeenCalledWith('new text', 8)
    })

    it('should set input with custom cursor position', () => {
      const handler = useTerminalInput()

      handler.setInput('new text', 3)
      expect(handler.input.value).toBe('new text')
      expect(handler.cursorPosition.value).toBe(3)
    })

    it('should handle cursor position 0', () => {
      const handler = useTerminalInput()

      handler.setInput('test', 0)
      expect(handler.cursorPosition.value).toBe(0)
    })
  })

  describe('clear', () => {
    it('should clear all state', () => {
      const onInputChange = vi.fn()
      const handler = useTerminalInput({
        initialValue: 'test',
        initialCursor: 2,
        onInputChange,
      })

      handler.historyIndex.value = 5
      handler.clear()

      expect(handler.input.value).toBe('')
      expect(handler.cursorPosition.value).toBe(0)
      expect(handler.historyIndex.value).toBe(-1)
      expect(onInputChange).toHaveBeenCalledWith('', 0)
    })
  })

  describe('addToHistory', () => {
    it('should add non-empty command to history', () => {
      const handler = useTerminalInput()

      handler.addToHistory('command1')
      expect(handler.history.value).toEqual(['command1'])
      expect(handler.historyIndex.value).toBe(-1)
    })

    it('should not add empty command', () => {
      const handler = useTerminalInput()

      handler.addToHistory('')
      expect(handler.history.value).toEqual([])
    })

    it('should not add whitespace-only command', () => {
      const handler = useTerminalInput()

      handler.addToHistory('   ')
      expect(handler.history.value).toEqual([])
    })

    it('should not add duplicate command', () => {
      const handler = useTerminalInput()

      handler.addToHistory('command1')
      handler.addToHistory('command1')
      expect(handler.history.value).toEqual(['command1'])
    })

    it('should add to beginning of history', () => {
      const handler = useTerminalInput()

      handler.addToHistory('command1')
      handler.addToHistory('command2')
      expect(handler.history.value).toEqual(['command2', 'command1'])
    })

    it('should limit history to 20 items', () => {
      const handler = useTerminalInput()

      for (let i = 1; i <= 25; i++) {
        handler.addToHistory(`command${i}`)
      }

      expect(handler.history.value.length).toBe(20)
      expect(handler.history.value[0]).toBe('command25')
      expect(handler.history.value[19]).toBe('command6')
    })

    it('should reset history index after adding', () => {
      const handler = useTerminalInput()

      handler.historyIndex.value = 5
      handler.addToHistory('new command')
      expect(handler.historyIndex.value).toBe(-1)
    })
  })

  describe('getDisplayInput', () => {
    it('should split input at cursor position', () => {
      const handler = useTerminalInput({
        initialValue: 'hello world',
        initialCursor: 5,
      })

      const display = handler.getDisplayInput()
      expect(display.beforeCursor).toBe('hello')
      expect(display.afterCursor).toBe(' world')
    })

    it('should handle cursor at start', () => {
      const handler = useTerminalInput({
        initialValue: 'test',
        initialCursor: 0,
      })

      const display = handler.getDisplayInput()
      expect(display.beforeCursor).toBe('')
      expect(display.afterCursor).toBe('test')
    })

    it('should handle cursor at end', () => {
      const handler = useTerminalInput({
        initialValue: 'test',
        initialCursor: 4,
      })

      const display = handler.getDisplayInput()
      expect(display.beforeCursor).toBe('test')
      expect(display.afterCursor).toBe('')
    })

    it('should handle empty input', () => {
      const handler = useTerminalInput()

      const display = handler.getDisplayInput()
      expect(display.beforeCursor).toBe('')
      expect(display.afterCursor).toBe('')
    })
  })

  describe('callbacks', () => {
    it('should not call onInputChange when not provided', () => {
      const handler = useTerminalInput()

      // Should not throw
      handler.handleCharacter('a')
      expect(handler.input.value).toBe('a')
    })

    it('should call onInputChange for various operations', () => {
      const onInputChange = vi.fn()
      const handler = useTerminalInput({
        onInputChange,
        initialValue: 'test',
        initialCursor: 2,
      })

      // Character insertion
      onInputChange.mockClear()
      handler.handleCharacter('X')
      expect(onInputChange).toHaveBeenCalledWith('teXst', 3)

      // Backspace
      onInputChange.mockClear()
      handler.handleCharacter('\b')
      expect(onInputChange).toHaveBeenCalledWith('test', 2)

      // Arrow navigation
      onInputChange.mockClear()
      handler.handleKeyboard('ArrowLeft')
      expect(onInputChange).toHaveBeenCalledWith('test', 1)

      // Delete key
      onInputChange.mockClear()
      handler.handleKeyboard('Delete')
      expect(onInputChange).toHaveBeenCalledWith('tst', 1)
    })
  })

  describe('edge cases', () => {
    it('should handle empty options object', () => {
      const handler = useTerminalInput({})

      expect(handler.input.value).toBe('')
      expect(handler.cursorPosition.value).toBe(0)
    })

    it('should handle all options provided', () => {
      const onInputChange = vi.fn()
      const onEnter = vi.fn()
      const onEscape = vi.fn()
      const customKeyHandler = vi.fn(() => false)

      const handler = useTerminalInput({
        onInputChange,
        onEnter,
        onEscape,
        initialValue: 'test',
        initialCursor: 2,
        allowMultiline: true,
        customKeyHandler,
      })

      expect(handler.input.value).toBe('test')
      expect(handler.cursorPosition.value).toBe(2)

      // Test callbacks work
      handler.handleCharacter('a')
      expect(onInputChange).toHaveBeenCalled()
      expect(customKeyHandler).toHaveBeenCalled()
    })

    it('should handle history edge case with empty string fallback', () => {
      const handler = useTerminalInput()
      handler.history.value = ['cmd']
      handler.historyIndex.value = 1 // Invalid index

      handler.handleKeyboard('ArrowUp')
      expect(handler.input.value).toBe('') // Fallback to empty string
    })
  })
})
