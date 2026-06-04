/**
 * @fileoverview Test suite for TerminalEchoHandler functionality.
 *
 * @description
 * Comprehensive tests for the TerminalEchoHandler class that provides
 * echo management for subprocess-based terminals. Tests all input processing,
 * special characters, and buffer management to achieve 100% coverage.
 *
 * @example
 * ```typescript
 * // Testing echo handler for terminal input
 * const handler = new TerminalEchoHandler()
 * const result = handler.processInput('a')
 * expect(result.echo).toBe('a')
 * ```
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { TerminalEchoHandler } from './TerminalEchoHandler'

describe('TerminalEchoHandler', () => {
  let handler: TerminalEchoHandler

  beforeEach(() => {
    handler = new TerminalEchoHandler()
  })

  describe('Constructor and Initial State', () => {
    it('should initialize with empty command buffer', () => {
      expect(handler.getBuffer()).toBe('')
    })
  })

  describe('processInput - Enter Key Handling', () => {
    it('should handle carriage return (\\r)', () => {
      handler.setBuffer('test command')
      const result = handler.processInput('\r')

      expect(result.echo).toBe('\r\n')
      expect(result.sendToProcess).toBe(true)
      expect(result.commandBuffer).toBe('test command')
      expect(result.clearBuffer).toBe(true)
      expect(handler.getBuffer()).toBe('')
    })

    it('should handle newline (\\n)', () => {
      handler.setBuffer('another command')
      const result = handler.processInput('\n')

      expect(result.echo).toBe('\r\n')
      expect(result.sendToProcess).toBe(true)
      expect(result.commandBuffer).toBe('another command')
      expect(result.clearBuffer).toBe(true)
      expect(handler.getBuffer()).toBe('')
    })

    it('should handle Enter with empty buffer', () => {
      const result = handler.processInput('\r')

      expect(result.echo).toBe('\r\n')
      expect(result.sendToProcess).toBe(true)
      expect(result.commandBuffer).toBe('')
      expect(result.clearBuffer).toBe(true)
    })
  })

  describe('processInput - Backspace Handling', () => {
    it('should handle backspace (charCode 127) with non-empty buffer', () => {
      handler.setBuffer('test')
      const result = handler.processInput(String.fromCharCode(127))

      expect(result.echo).toBe('\b \b')
      expect(result.sendToProcess).toBe(false)
      expect(result.commandBuffer).toBe('tes')
      expect(handler.getBuffer()).toBe('tes')
    })

    it('should handle delete (charCode 8) with non-empty buffer', () => {
      handler.setBuffer('hello')
      const result = handler.processInput(String.fromCharCode(8))

      expect(result.echo).toBe('\b \b')
      expect(result.sendToProcess).toBe(false)
      expect(result.commandBuffer).toBe('hell')
      expect(handler.getBuffer()).toBe('hell')
    })

    it('should handle backspace (\\x7f) with non-empty buffer', () => {
      handler.setBuffer('world')
      const result = handler.processInput('\x7f')

      expect(result.echo).toBe('\b \b')
      expect(result.sendToProcess).toBe(false)
      expect(result.commandBuffer).toBe('worl')
      expect(handler.getBuffer()).toBe('worl')
    })

    it('should handle backspace (\\b) with non-empty buffer', () => {
      handler.setBuffer('abc')
      const result = handler.processInput('\b')

      expect(result.echo).toBe('\b \b')
      expect(result.sendToProcess).toBe(false)
      expect(result.commandBuffer).toBe('ab')
      expect(handler.getBuffer()).toBe('ab')
    })

    it('should handle backspace with empty buffer', () => {
      const result = handler.processInput(String.fromCharCode(127))

      expect(result.echo).toBeNull()
      expect(result.sendToProcess).toBe(false)
      expect(result.commandBuffer).toBe('')
      expect(handler.getBuffer()).toBe('')
    })

    it('should handle delete with empty buffer', () => {
      const result = handler.processInput(String.fromCharCode(8))

      expect(result.echo).toBeNull()
      expect(result.sendToProcess).toBe(false)
      expect(result.commandBuffer).toBe('')
      expect(handler.getBuffer()).toBe('')
    })

    it('should handle multiple backspaces', () => {
      handler.setBuffer('test')

      let result = handler.processInput('\x7f')
      expect(handler.getBuffer()).toBe('tes')

      result = handler.processInput('\x7f')
      expect(handler.getBuffer()).toBe('te')

      result = handler.processInput('\x7f')
      expect(handler.getBuffer()).toBe('t')

      result = handler.processInput('\x7f')
      expect(handler.getBuffer()).toBe('')

      result = handler.processInput('\x7f')
      expect(result.echo).toBeNull()
      expect(handler.getBuffer()).toBe('')
    })
  })

  describe('processInput - Ctrl+C Handling', () => {
    it('should handle Ctrl+C (SIGINT)', () => {
      handler.setBuffer('partial command')
      const result = handler.processInput(String.fromCharCode(3))

      expect(result.echo).toBe('^C\r\n')
      expect(result.sendToProcess).toBe(true)
      expect(result.commandBuffer).toBe('')
      expect(result.clearBuffer).toBe(true)
      expect(handler.getBuffer()).toBe('')
    })

    it('should handle Ctrl+C with empty buffer', () => {
      const result = handler.processInput(String.fromCharCode(3))

      expect(result.echo).toBe('^C\r\n')
      expect(result.sendToProcess).toBe(true)
      expect(result.commandBuffer).toBe('')
      expect(result.clearBuffer).toBe(true)
      expect(handler.getBuffer()).toBe('')
    })
  })

  describe('processInput - Ctrl+D Handling', () => {
    it('should handle Ctrl+D (EOF) with buffer', () => {
      handler.setBuffer('some text')
      const result = handler.processInput(String.fromCharCode(4))

      expect(result.echo).toBeNull()
      expect(result.sendToProcess).toBe(true)
      expect(result.commandBuffer).toBe('some text')
      expect(result.clearBuffer).toBeUndefined()
      expect(handler.getBuffer()).toBe('some text')
    })

    it('should handle Ctrl+D with empty buffer', () => {
      const result = handler.processInput(String.fromCharCode(4))

      expect(result.echo).toBeNull()
      expect(result.sendToProcess).toBe(true)
      expect(result.commandBuffer).toBe('')
      expect(result.clearBuffer).toBeUndefined()
      expect(handler.getBuffer()).toBe('')
    })
  })

  describe('processInput - Tab Handling', () => {
    it('should handle Tab key', () => {
      handler.setBuffer('ls ')
      const result = handler.processInput(String.fromCharCode(9))

      expect(result.echo).toBe('    ')
      expect(result.sendToProcess).toBe(false)
      expect(result.commandBuffer).toBe('ls     ')
      expect(result.clearBuffer).toBeUndefined()
      expect(handler.getBuffer()).toBe('ls     ')
    })

    it('should handle Tab with empty buffer', () => {
      const result = handler.processInput('\t')

      expect(result.echo).toBe('    ')
      expect(result.sendToProcess).toBe(false)
      expect(result.commandBuffer).toBe('    ')
      expect(handler.getBuffer()).toBe('    ')
    })

    it('should handle multiple tabs', () => {
      handler.processInput('\t')
      handler.processInput('\t')

      expect(handler.getBuffer()).toBe('        ')
    })
  })

  describe('processInput - Regular Printable Characters', () => {
    it('should handle lowercase letters', () => {
      const result = handler.processInput('a')

      expect(result.echo).toBe('a')
      expect(result.sendToProcess).toBe(false)
      expect(result.commandBuffer).toBe('a')
      expect(handler.getBuffer()).toBe('a')
    })

    it('should handle uppercase letters', () => {
      const result = handler.processInput('Z')

      expect(result.echo).toBe('Z')
      expect(result.sendToProcess).toBe(false)
      expect(result.commandBuffer).toBe('Z')
      expect(handler.getBuffer()).toBe('Z')
    })

    it('should handle numbers', () => {
      const result = handler.processInput('5')

      expect(result.echo).toBe('5')
      expect(result.sendToProcess).toBe(false)
      expect(result.commandBuffer).toBe('5')
      expect(handler.getBuffer()).toBe('5')
    })

    it('should handle space character (charCode 32)', () => {
      handler.setBuffer('hello')
      const result = handler.processInput(' ')

      expect(result.echo).toBe(' ')
      expect(result.sendToProcess).toBe(false)
      expect(result.commandBuffer).toBe('hello ')
      expect(handler.getBuffer()).toBe('hello ')
    })

    it('should handle tilde character (charCode 126)', () => {
      const result = handler.processInput('~')

      expect(result.echo).toBe('~')
      expect(result.sendToProcess).toBe(false)
      expect(result.commandBuffer).toBe('~')
      expect(handler.getBuffer()).toBe('~')
    })

    it('should handle special printable characters', () => {
      const specialChars = '!@#$%^&*()_+-={}[]|\\:";\'<>?,./'

      for (const char of specialChars) {
        handler.reset()
        const result = handler.processInput(char)

        expect(result.echo).toBe(char)
        expect(result.sendToProcess).toBe(false)
        expect(result.commandBuffer).toBe(char)
        expect(handler.getBuffer()).toBe(char)
      }
    })

    it('should accumulate multiple characters', () => {
      handler.processInput('h')
      handler.processInput('e')
      handler.processInput('l')
      handler.processInput('l')
      handler.processInput('o')

      expect(handler.getBuffer()).toBe('hello')
    })

    it('should handle full command input sequence', () => {
      const command = 'git status --short'

      for (const char of command) {
        handler.processInput(char)
      }

      expect(handler.getBuffer()).toBe(command)

      const result = handler.processInput('\r')
      expect(result.commandBuffer).toBe(command)
      expect(result.clearBuffer).toBe(true)
      expect(handler.getBuffer()).toBe('')
    })
  })

  describe('processInput - Control Characters', () => {
    it('should handle control character below 32 (non-special)', () => {
      // Test with charCode 1 (not Ctrl+C which is 3, not Ctrl+D which is 4)
      const result = handler.processInput(String.fromCharCode(1))

      expect(result.echo).toBeNull()
      expect(result.sendToProcess).toBe(true)
      expect(result.commandBuffer).toBe('')
      expect(handler.getBuffer()).toBe('')
    })

    it('should handle control character above 126', () => {
      const result = handler.processInput(String.fromCharCode(200))

      expect(result.echo).toBeNull()
      expect(result.sendToProcess).toBe(true)
      expect(result.commandBuffer).toBe('')
      expect(handler.getBuffer()).toBe('')
    })

    it('should handle various control characters', () => {
      // Test various control characters that aren't specially handled
      // Note: 10 is \n (newline) which is handled as Enter, so we exclude it
      const controlChars = [
        1, 2, 5, 6, 7, 11, 12, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25,
        26, 27, 28, 29, 30, 31,
      ]

      for (const charCode of controlChars) {
        handler.reset()
        handler.setBuffer('test')
        const result = handler.processInput(String.fromCharCode(charCode))

        expect(result.echo).toBeNull()
        expect(result.sendToProcess).toBe(true)
        expect(result.commandBuffer).toBe('test')
        expect(handler.getBuffer()).toBe('test')
      }
    })

    it('should preserve buffer when handling non-special control characters', () => {
      handler.setBuffer('preserved')
      handler.processInput(String.fromCharCode(15)) // Shift In

      expect(handler.getBuffer()).toBe('preserved')
    })
  })

  describe('Buffer Management Methods', () => {
    it('should reset command buffer', () => {
      handler.setBuffer('some text')
      expect(handler.getBuffer()).toBe('some text')

      handler.reset()
      expect(handler.getBuffer()).toBe('')
    })

    it('should get current buffer', () => {
      expect(handler.getBuffer()).toBe('')

      handler.setBuffer('test buffer')
      expect(handler.getBuffer()).toBe('test buffer')
    })

    it('should set buffer directly', () => {
      handler.setBuffer('first')
      expect(handler.getBuffer()).toBe('first')

      handler.setBuffer('second')
      expect(handler.getBuffer()).toBe('second')

      handler.setBuffer('')
      expect(handler.getBuffer()).toBe('')
    })
  })

  describe('Complex Interaction Scenarios', () => {
    it('should handle typing, backspace, and enter sequence', () => {
      // Type "hello"
      handler.processInput('h')
      handler.processInput('e')
      handler.processInput('l')
      handler.processInput('l')
      handler.processInput('o')
      expect(handler.getBuffer()).toBe('hello')

      // Backspace twice
      handler.processInput('\x7f')
      handler.processInput('\x7f')
      expect(handler.getBuffer()).toBe('hel')

      // Type "p!"
      handler.processInput('p')
      handler.processInput('!')
      expect(handler.getBuffer()).toBe('help!')

      // Press Enter
      const result = handler.processInput('\r')
      expect(result.commandBuffer).toBe('help!')
      expect(handler.getBuffer()).toBe('')
    })

    it('should handle Ctrl+C interruption during typing', () => {
      handler.processInput('g')
      handler.processInput('i')
      handler.processInput('t')
      handler.processInput(' ')
      expect(handler.getBuffer()).toBe('git ')

      // Interrupt with Ctrl+C
      const result = handler.processInput(String.fromCharCode(3))
      expect(result.echo).toBe('^C\r\n')
      expect(handler.getBuffer()).toBe('')
    })

    it('should handle tab completion simulation', () => {
      handler.processInput('l')
      handler.processInput('s')
      handler.processInput(' ')
      handler.processInput('-')

      // Press Tab for "completion"
      handler.processInput('\t')
      expect(handler.getBuffer()).toBe('ls -    ')

      // Continue typing
      handler.processInput('l')
      handler.processInput('a')
      expect(handler.getBuffer()).toBe('ls -    la')
    })

    it('should handle mixed control and printable characters', () => {
      handler.processInput('t')
      handler.processInput('e')
      handler.processInput('s')
      handler.processInput('t')

      // Send control character (doesn't clear buffer)
      handler.processInput(String.fromCharCode(5))
      expect(handler.getBuffer()).toBe('test')

      // Continue typing
      handler.processInput('1')
      handler.processInput('2')
      handler.processInput('3')
      expect(handler.getBuffer()).toBe('test123')
    })

    it('should handle edge case of all backspaces on long string', () => {
      const longString = 'this is a very long command with many characters'

      // Type the entire string
      for (const char of longString) {
        handler.processInput(char)
      }
      expect(handler.getBuffer()).toBe(longString)

      // Backspace everything
      for (let i = 0; i < longString.length; i++) {
        handler.processInput('\x7f')
      }
      expect(handler.getBuffer()).toBe('')

      // Extra backspace on empty buffer
      const result = handler.processInput('\x7f')
      expect(result.echo).toBeNull()
      expect(handler.getBuffer()).toBe('')
    })

    it('should handle all printable ASCII characters', () => {
      // Test every printable ASCII character (32-126)
      for (let i = 32; i <= 126; i++) {
        handler.reset()
        const char = String.fromCharCode(i)
        const result = handler.processInput(char)

        expect(result.echo).toBe(char)
        expect(result.sendToProcess).toBe(false)
        expect(handler.getBuffer()).toBe(char)
      }
    })

    it('should handle command with special characters and spaces', () => {
      const command = 'echo "Hello, World!" && ls -la | grep .txt'

      for (const char of command) {
        handler.processInput(char)
      }

      expect(handler.getBuffer()).toBe(command)

      const result = handler.processInput('\n')
      expect(result.commandBuffer).toBe(command)
      expect(handler.getBuffer()).toBe('')
    })
  })

  describe('Edge Cases and Boundary Conditions', () => {
    it('should handle empty input gracefully', () => {
      const result = handler.processInput('')

      expect(result.echo).toBeNull()
      expect(result.sendToProcess).toBe(true)
      expect(result.commandBuffer).toBe('')
    })

    it('should handle very long buffer', () => {
      const longText = 'a'.repeat(1000)

      for (const char of longText) {
        handler.processInput(char)
      }

      expect(handler.getBuffer()).toBe(longText)

      // Backspace should still work
      handler.processInput('\x7f')
      expect(handler.getBuffer()).toBe('a'.repeat(999))
    })

    it('should handle rapid state changes', () => {
      handler.setBuffer('initial')
      handler.reset()
      handler.setBuffer('second')
      handler.processInput('a')
      handler.reset()
      handler.processInput('b')

      expect(handler.getBuffer()).toBe('b')
    })

    it('should maintain buffer integrity through various operations', () => {
      // Set initial buffer
      handler.setBuffer('start')

      // Add characters
      handler.processInput('1')
      handler.processInput('2')
      expect(handler.getBuffer()).toBe('start12')

      // Backspace
      handler.processInput('\b')
      expect(handler.getBuffer()).toBe('start1')

      // Tab
      handler.processInput('\t')
      expect(handler.getBuffer()).toBe('start1    ')

      // Reset
      handler.reset()
      expect(handler.getBuffer()).toBe('')

      // Type after reset
      handler.processInput('n')
      handler.processInput('e')
      handler.processInput('w')
      expect(handler.getBuffer()).toBe('new')
    })
  })
})
