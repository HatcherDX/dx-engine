import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { TerminalManager } from './TerminalManager'

// Simple mock that doesn't cause issues
let mockIdCounter = 0
vi.mock('../ProcessManager', () => ({
  ProcessManager: class MockProcessManager {
    spawn = vi.fn().mockImplementation(() => {
      mockIdCounter++
      return Promise.resolve({
        id: `test-id-${mockIdCounter}`,
        info: {
          pid: 1234 + mockIdCounter,
          startTime: new Date(),
          name: 'bash',
          cmd: 'bash',
          cwd: '/home/user',
          env: {},
        },
      })
    })
    write = vi.fn().mockReturnValue(true)
    resize = vi.fn().mockReturnValue(true)
    kill = vi.fn().mockReturnValue(true)
    cleanup = vi.fn()
    on = vi.fn()
    emit = vi.fn()
    removeAllListeners = vi.fn()
  },
}))

describe('TerminalManager - Simple Tests', () => {
  let terminalManager: TerminalManager

  beforeEach(() => {
    mockIdCounter = 0
    vi.clearAllMocks()
    terminalManager = new TerminalManager()
  })

  afterEach(() => {
    terminalManager.cleanup()
    vi.restoreAllMocks()
  })

  describe('Basic Functionality', () => {
    it('should create a terminal manager instance', () => {
      expect(terminalManager).toBeDefined()
      expect(terminalManager.getAllTerminals).toBeDefined()
      expect(terminalManager.createTerminal).toBeDefined()
    })

    it('should return empty array initially', () => {
      const terminals = terminalManager.getAllTerminals()
      expect(terminals).toEqual([])
    })

    it('should return 0 running terminals initially', () => {
      const count = terminalManager.getRunningCount()
      expect(count).toBe(0)
    })

    it('should return undefined for non-existent terminal', () => {
      const terminal = terminalManager.getTerminal('non-existent')
      expect(terminal).toBeUndefined()
    })

    it('should return undefined when no terminal is active', () => {
      const activeTerminal = terminalManager.getActiveTerminal()
      expect(activeTerminal).toBeUndefined()
    })

    it('should handle cleanup', () => {
      expect(() => terminalManager.cleanup()).not.toThrow()
    })

    it('should handle operations on non-existent terminals', () => {
      const sendResult = terminalManager.sendData('non-existent', 'data')
      expect(sendResult).toBe(false)

      const resizeResult = terminalManager.resizeTerminal({
        id: 'non-existent',
        cols: 80,
        rows: 24,
      })
      expect(resizeResult).toBe(false)

      const closeResult = terminalManager.closeTerminal('non-existent')
      expect(closeResult).toBe(false)

      const activeResult = terminalManager.setActiveTerminal('non-existent')
      expect(activeResult).toBe(false)
    })
  })
})
