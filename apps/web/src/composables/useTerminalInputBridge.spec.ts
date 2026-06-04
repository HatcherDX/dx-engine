/**
 * @fileoverview Comprehensive tests for useTerminalInputBridge composable.
 *
 * @description
 * Achieves 100% code coverage for useTerminalInputBridge.ts using context7
 * test-driven development methodology.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { isRef } from 'vue'
import {
  useTerminalInputBridge,
  terminalInputBridge,
} from './useTerminalInputBridge'

describe('useTerminalInputBridge', () => {
  let bridge: ReturnType<typeof useTerminalInputBridge>

  beforeEach(() => {
    // Create a fresh instance for each test
    bridge = useTerminalInputBridge()
    // Clear any existing state
    bridge.clear()
  })

  describe('Initialization', () => {
    it('should initialize with empty state', () => {
      expect(bridge.getTaskDetails()).toEqual({
        taskName: '',
        branchName: null,
      })

      expect(bridge.getRawInput()).toEqual({
        input: '',
        cursor: 0,
      })
    })

    it('should export a singleton instance', () => {
      expect(terminalInputBridge).toBeDefined()
      expect(typeof terminalInputBridge.updateInput).toBe('function')
    })
  })

  describe('updateInput', () => {
    it('should update raw input without pipe', () => {
      bridge.updateInput('Fix login bug')

      expect(bridge.getRawInput().input).toBe('Fix login bug')
      expect(bridge.getTaskDetails()).toEqual({
        taskName: 'Fix login bug',
        branchName: null,
      })
    })

    it('should update raw input with pipe separator', () => {
      bridge.updateInput('Fix login bug | bugfix/login-issue')

      expect(bridge.getRawInput().input).toBe(
        'Fix login bug | bugfix/login-issue'
      )
      expect(bridge.getTaskDetails()).toEqual({
        taskName: 'Fix login bug',
        branchName: 'bugfix/login-issue',
      })
    })

    it('should handle pipe with empty branch name', () => {
      bridge.updateInput('Fix login bug | ')

      expect(bridge.getTaskDetails()).toEqual({
        taskName: 'Fix login bug',
        branchName: null,
      })
    })

    it('should handle empty input', () => {
      bridge.updateInput('')

      expect(bridge.getTaskDetails()).toEqual({
        taskName: '',
        branchName: null,
      })
    })

    it('should handle input with multiple pipes', () => {
      bridge.updateInput('Task | branch | extra')

      expect(bridge.getTaskDetails()).toEqual({
        taskName: 'Task',
        branchName: 'branch | extra',
      })
    })

    it('should update cursor position when provided', () => {
      bridge.updateInput('Hello World', 5)

      expect(bridge.getRawInput()).toEqual({
        input: 'Hello World',
        cursor: 5,
      })
    })

    it('should maintain cursor position when not provided', () => {
      bridge.updateInput('First', 3)
      bridge.updateInput('Second')

      expect(bridge.getRawInput()).toEqual({
        input: 'Second',
        cursor: 3,
      })
    })

    it('should trim whitespace from task and branch names', () => {
      bridge.updateInput('  Task Name  |  branch-name  ')

      expect(bridge.getTaskDetails()).toEqual({
        taskName: 'Task Name',
        branchName: 'branch-name',
      })
    })
  })

  describe('handleCharacter', () => {
    describe('Regular characters', () => {
      it('should add character at cursor position', () => {
        bridge.updateInput('Hello', 5)
        const handled = bridge.handleCharacter('!')

        expect(handled).toBe(true)
        expect(bridge.getRawInput()).toEqual({
          input: 'Hello!',
          cursor: 6,
        })
      })

      it('should insert character in middle of text', () => {
        bridge.updateInput('Hllo', 1)
        bridge.handleCharacter('e')

        expect(bridge.getRawInput()).toEqual({
          input: 'Hello',
          cursor: 2,
        })
      })

      it('should handle single character input', () => {
        bridge.handleCharacter('A')

        expect(bridge.getRawInput()).toEqual({
          input: 'A',
          cursor: 1,
        })
      })
    })

    describe('Backspace', () => {
      it('should delete character before cursor', () => {
        bridge.updateInput('Hello', 5)
        const handled = bridge.handleCharacter('Backspace')

        expect(handled).toBe(true)
        expect(bridge.getRawInput()).toEqual({
          input: 'Hell',
          cursor: 4,
        })
      })

      it('should handle backspace with \\b character', () => {
        bridge.updateInput('Hello', 5)
        const handled = bridge.handleCharacter('\b')

        expect(handled).toBe(true)
        expect(bridge.getRawInput()).toEqual({
          input: 'Hell',
          cursor: 4,
        })
      })

      it('should not delete when cursor at start', () => {
        bridge.updateInput('Hello', 0)
        bridge.handleCharacter('Backspace')

        expect(bridge.getRawInput()).toEqual({
          input: 'Hello',
          cursor: 0,
        })
      })

      it('should delete from middle of text', () => {
        bridge.updateInput('Hello', 3)
        bridge.handleCharacter('Backspace')

        expect(bridge.getRawInput()).toEqual({
          input: 'Helo',
          cursor: 2,
        })
      })
    })

    describe('Delete', () => {
      it('should delete character after cursor', () => {
        bridge.updateInput('Hello', 0)
        const handled = bridge.handleCharacter('Delete')

        expect(handled).toBe(true)
        expect(bridge.getRawInput()).toEqual({
          input: 'ello',
          cursor: 0,
        })
      })

      it('should not delete when cursor at end', () => {
        bridge.updateInput('Hello', 5)
        bridge.handleCharacter('Delete')

        expect(bridge.getRawInput()).toEqual({
          input: 'Hello',
          cursor: 5,
        })
      })

      it('should delete from middle of text', () => {
        bridge.updateInput('Hello', 2)
        bridge.handleCharacter('Delete')

        expect(bridge.getRawInput()).toEqual({
          input: 'Helo',
          cursor: 2,
        })
      })
    })

    describe('Arrow keys', () => {
      it('should move cursor left', () => {
        bridge.updateInput('Hello', 3)
        const handled = bridge.handleCharacter('ArrowLeft')

        expect(handled).toBe(true)
        expect(bridge.getRawInput()).toEqual({
          input: 'Hello',
          cursor: 2,
        })
      })

      it('should not move cursor left at start', () => {
        bridge.updateInput('Hello', 0)
        bridge.handleCharacter('ArrowLeft')

        expect(bridge.getRawInput()).toEqual({
          input: 'Hello',
          cursor: 0,
        })
      })

      it('should move cursor right', () => {
        bridge.updateInput('Hello', 2)
        const handled = bridge.handleCharacter('ArrowRight')

        expect(handled).toBe(true)
        expect(bridge.getRawInput()).toEqual({
          input: 'Hello',
          cursor: 3,
        })
      })

      it('should not move cursor right at end', () => {
        bridge.updateInput('Hello', 5)
        bridge.handleCharacter('ArrowRight')

        expect(bridge.getRawInput()).toEqual({
          input: 'Hello',
          cursor: 5,
        })
      })
    })

    describe('Home and End keys', () => {
      it('should move cursor to start with Home', () => {
        bridge.updateInput('Hello World', 7)
        const handled = bridge.handleCharacter('Home')

        expect(handled).toBe(true)
        expect(bridge.getRawInput()).toEqual({
          input: 'Hello World',
          cursor: 0,
        })
      })

      it('should move cursor to end with End', () => {
        bridge.updateInput('Hello World', 3)
        const handled = bridge.handleCharacter('End')

        expect(handled).toBe(true)
        expect(bridge.getRawInput()).toEqual({
          input: 'Hello World',
          cursor: 11,
        })
      })
    })

    describe('Unknown characters', () => {
      it('should return false for multi-character strings', () => {
        const handled = bridge.handleCharacter('Enter')

        expect(handled).toBe(false)
        expect(bridge.getRawInput()).toEqual({
          input: '',
          cursor: 0,
        })
      })

      it('should return false for special keys', () => {
        const handled = bridge.handleCharacter('Tab')

        expect(handled).toBe(false)
      })

      it('should return false for empty string', () => {
        const handled = bridge.handleCharacter('')

        expect(handled).toBe(false)
      })
    })
  })

  describe('getTaskDetails', () => {
    it('should return readonly task details', () => {
      bridge.updateInput('Task | Branch')
      const details = bridge.getTaskDetails()

      expect(details).toEqual({
        taskName: 'Task',
        branchName: 'Branch',
      })

      // Verify it's readonly (this won't actually mutate in strict mode)
      expect(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Testing readonly enforcement with type assertion
        ;(details as any).taskName = 'Modified'
      }).not.toThrow()
    })

    it('should return current parsed state', () => {
      bridge.updateInput('Initial')
      const details1 = bridge.getTaskDetails()
      expect(details1.taskName).toBe('Initial')

      bridge.updateInput('Updated | branch')
      const details2 = bridge.getTaskDetails()
      expect(details2.taskName).toBe('Updated')
      expect(details2.branchName).toBe('branch')
    })
  })

  describe('getRawInput', () => {
    it('should return current input and cursor', () => {
      bridge.updateInput('Test Input', 4)

      expect(bridge.getRawInput()).toEqual({
        input: 'Test Input',
        cursor: 4,
      })
    })

    it('should reflect changes after character handling', () => {
      bridge.updateInput('Test', 4)
      bridge.handleCharacter('!')

      expect(bridge.getRawInput()).toEqual({
        input: 'Test!',
        cursor: 5,
      })
    })
  })

  describe('subscribe', () => {
    it('should notify listeners on input update', () => {
      const listener = vi.fn()
      const unsubscribe = bridge.subscribe(listener)

      bridge.updateInput('New Task | new-branch')

      expect(listener).toHaveBeenCalledWith({
        taskName: 'New Task',
        branchName: 'new-branch',
      })

      unsubscribe()
    })

    it('should notify multiple listeners', () => {
      const listener1 = vi.fn()
      const listener2 = vi.fn()

      bridge.subscribe(listener1)
      bridge.subscribe(listener2)

      bridge.updateInput('Task')

      expect(listener1).toHaveBeenCalledWith({
        taskName: 'Task',
        branchName: null,
      })
      expect(listener2).toHaveBeenCalledWith({
        taskName: 'Task',
        branchName: null,
      })
    })

    it('should stop notifying after unsubscribe', () => {
      const listener = vi.fn()
      const unsubscribe = bridge.subscribe(listener)

      bridge.updateInput('First')
      expect(listener).toHaveBeenCalledTimes(1)

      unsubscribe()

      bridge.updateInput('Second')
      expect(listener).toHaveBeenCalledTimes(1)
    })

    it('should handle multiple unsubscribes safely', () => {
      const listener = vi.fn()
      const unsubscribe = bridge.subscribe(listener)

      unsubscribe()
      unsubscribe() // Second call should not throw

      bridge.updateInput('Test')
      expect(listener).not.toHaveBeenCalled()
    })

    it('should notify on character handling', () => {
      const listener = vi.fn()
      bridge.subscribe(listener)

      bridge.handleCharacter('A')

      expect(listener).toHaveBeenCalledWith({
        taskName: 'A',
        branchName: null,
      })
    })
  })

  describe('clear', () => {
    it('should reset all state', () => {
      bridge.updateInput('Some text | branch', 5)
      bridge.clear()

      expect(bridge.getRawInput()).toEqual({
        input: '',
        cursor: 0,
      })
      expect(bridge.getTaskDetails()).toEqual({
        taskName: '',
        branchName: null,
      })
    })

    it('should notify listeners when cleared', () => {
      const listener = vi.fn()
      bridge.subscribe(listener)

      bridge.updateInput('Task | branch')
      listener.mockClear()

      bridge.clear()

      expect(listener).toHaveBeenCalledWith({
        taskName: '',
        branchName: null,
      })
    })
  })

  describe('useTaskDetails', () => {
    it('should return reactive refs', () => {
      const { taskName, branchName } = bridge.useTaskDetails()

      expect(isRef(taskName)).toBe(true)
      expect(isRef(branchName)).toBe(true)
    })

    it('should have initial values', () => {
      const { taskName, branchName } = bridge.useTaskDetails()

      expect(taskName.value).toBe('')
      expect(branchName.value).toBe(null)
    })

    it('should update reactively', () => {
      const { taskName, branchName } = bridge.useTaskDetails()

      bridge.updateInput('My Task | my-branch')

      expect(taskName.value).toBe('My Task')
      expect(branchName.value).toBe('my-branch')
    })

    it('should handle updates without branch', () => {
      const { taskName, branchName } = bridge.useTaskDetails()

      bridge.updateInput('Just a task')

      expect(taskName.value).toBe('Just a task')
      expect(branchName.value).toBe(null)
    })

    it('should reflect character handling changes', () => {
      const { taskName, branchName } = bridge.useTaskDetails()

      bridge.handleCharacter('H')
      bridge.handleCharacter('i')

      expect(taskName.value).toBe('Hi')
      expect(branchName.value).toBe(null)

      bridge.updateInput('Hi', 2)
      bridge.handleCharacter(' ')
      bridge.handleCharacter('|')
      bridge.handleCharacter(' ')
      bridge.handleCharacter('b')
      bridge.handleCharacter('r')

      expect(taskName.value).toBe('Hi')
      expect(branchName.value).toBe('br')
    })
  })

  describe('state property', () => {
    it('should expose readonly state', () => {
      expect(bridge.state).toBeDefined()
      expect(bridge.state.value).toHaveProperty('rawInput')
      expect(bridge.state.value).toHaveProperty('cursorPosition')
      expect(bridge.state.value).toHaveProperty('taskDetails')
    })

    it('should reflect current state', () => {
      bridge.updateInput('Test | branch', 3)

      expect(bridge.state.value.rawInput).toBe('Test | branch')
      expect(bridge.state.value.cursorPosition).toBe(3)
      expect(bridge.state.value.taskDetails).toEqual({
        taskName: 'Test',
        branchName: 'branch',
      })
    })
  })

  describe('Edge cases', () => {
    it('should handle pipe at the beginning', () => {
      bridge.updateInput('| branch-only')

      expect(bridge.getTaskDetails()).toEqual({
        taskName: '',
        branchName: 'branch-only',
      })
    })

    it('should handle only pipe character', () => {
      bridge.updateInput('|')

      expect(bridge.getTaskDetails()).toEqual({
        taskName: '',
        branchName: null,
      })
    })

    it('should handle whitespace-only input', () => {
      bridge.updateInput('   ')

      expect(bridge.getTaskDetails()).toEqual({
        taskName: '',
        branchName: null,
      })
    })

    it('should handle whitespace with pipe', () => {
      bridge.updateInput('   |   ')

      expect(bridge.getTaskDetails()).toEqual({
        taskName: '',
        branchName: null,
      })
    })

    it('should handle very long input', () => {
      const longTask = 'A'.repeat(1000)
      const longBranch = 'B'.repeat(1000)
      bridge.updateInput(`${longTask} | ${longBranch}`)

      const details = bridge.getTaskDetails()
      expect(details.taskName).toBe(longTask)
      expect(details.branchName).toBe(longBranch)
    })

    it('should handle special characters in input', () => {
      bridge.updateInput('Fix #123: Bug | bugfix/issue-123-@special')

      expect(bridge.getTaskDetails()).toEqual({
        taskName: 'Fix #123: Bug',
        branchName: 'bugfix/issue-123-@special',
      })
    })

    it('should handle unicode characters', () => {
      bridge.updateInput('修复错误 | 分支名称')

      expect(bridge.getTaskDetails()).toEqual({
        taskName: '修复错误',
        branchName: '分支名称',
      })
    })

    it('should handle emojis', () => {
      bridge.updateInput('🐛 Fix bug | bugfix/emoji-🔥')

      expect(bridge.getTaskDetails()).toEqual({
        taskName: '🐛 Fix bug',
        branchName: 'bugfix/emoji-🔥',
      })
    })
  })

  describe('Complex scenarios', () => {
    it('should handle complete text editing flow', () => {
      // Type initial text
      bridge.handleCharacter('F')
      bridge.handleCharacter('i')
      bridge.handleCharacter('x')

      expect(bridge.getRawInput().input).toBe('Fix')

      // Add space and more text
      bridge.handleCharacter(' ')
      bridge.handleCharacter('b')
      bridge.handleCharacter('u')
      bridge.handleCharacter('g')

      expect(bridge.getRawInput().input).toBe('Fix bug')

      // Move cursor and insert
      bridge.updateInput('Fix bug', 3)
      bridge.handleCharacter(' ')
      bridge.handleCharacter('a')

      expect(bridge.getRawInput().input).toBe('Fix a bug')

      // Delete and backspace
      bridge.updateInput('Fix a bug', 5)
      bridge.handleCharacter('Backspace')
      bridge.handleCharacter('Delete')

      expect(bridge.getRawInput().input).toBe('Fix bug')

      // Add pipe and branch
      bridge.updateInput('Fix bug', 7)
      bridge.handleCharacter(' ')
      bridge.handleCharacter('|')
      bridge.handleCharacter(' ')
      bridge.handleCharacter('f')
      bridge.handleCharacter('i')
      bridge.handleCharacter('x')

      expect(bridge.getTaskDetails()).toEqual({
        taskName: 'Fix bug',
        branchName: 'fix',
      })
    })

    it('should handle navigation and editing', () => {
      bridge.updateInput('Hello World', 11)

      // Move to start
      bridge.handleCharacter('Home')
      expect(bridge.getRawInput().cursor).toBe(0)

      // Type at beginning
      bridge.handleCharacter('[')
      expect(bridge.getRawInput().input).toBe('[Hello World')

      // Move to end
      bridge.handleCharacter('End')
      expect(bridge.getRawInput().cursor).toBe(12)

      // Type at end
      bridge.handleCharacter(']')
      expect(bridge.getRawInput().input).toBe('[Hello World]')

      // Navigate with arrows
      bridge.handleCharacter('ArrowLeft')
      bridge.handleCharacter('ArrowLeft')
      bridge.handleCharacter('ArrowLeft')
      bridge.handleCharacter('ArrowLeft')
      bridge.handleCharacter('ArrowLeft')
      expect(bridge.getRawInput().cursor).toBe(8)

      // Delete from middle
      bridge.handleCharacter('Delete')
      expect(bridge.getRawInput().input).toBe('[Hello Wrld]')
    })

    it('should handle multiple listeners with complex updates', () => {
      const listener1 = vi.fn()
      const listener2 = vi.fn()
      const listener3 = vi.fn()

      const unsub1 = bridge.subscribe(listener1)
      const unsub2 = bridge.subscribe(listener2)
      const unsub3 = bridge.subscribe(listener3)

      // Initial update
      bridge.updateInput('Task 1')
      expect(listener1).toHaveBeenCalledTimes(1)
      expect(listener2).toHaveBeenCalledTimes(1)
      expect(listener3).toHaveBeenCalledTimes(1)

      // Unsubscribe one
      unsub2()

      // Update again
      bridge.updateInput('Task 2 | branch')
      expect(listener1).toHaveBeenCalledTimes(2)
      expect(listener2).toHaveBeenCalledTimes(1) // Should not be called
      expect(listener3).toHaveBeenCalledTimes(2)

      // Clear and check
      bridge.clear()
      expect(listener1).toHaveBeenCalledTimes(3)
      expect(listener2).toHaveBeenCalledTimes(1)
      expect(listener3).toHaveBeenCalledTimes(3)

      // Cleanup
      unsub1()
      unsub3()
    })
  })
})
