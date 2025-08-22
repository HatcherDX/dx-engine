/**
 * @fileoverview Comprehensive tests for BrowserReadOnlyTerminalManager.
 *
 * @description
 * Tests for browser-compatible read-only terminal management system including:
 * - Browser-compatible terminal creation and initialization
 * - System and Timeline terminal management
 * - Event handling and routing from BrowserSystemLogger
 * - Terminal state management and configuration
 * - Line management with limits and filtering
 * - Integration with SimpleEventEmitter pattern
 * - Browser-specific compatibility features
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  BrowserReadOnlyTerminalManager,
  browserReadOnlyTerminalManager,
} from './BrowserReadOnlyTerminalManager'
import type { SystemEvent } from './BrowserSystemLogger'

/**
 * Mock interface for BrowserSystemLogger in terminal manager tests.
 */
interface MockSystemLogger {
  info: ReturnType<typeof vi.fn>
  warn: ReturnType<typeof vi.fn>
  error: ReturnType<typeof vi.fn>
  on: ReturnType<typeof vi.fn>
  emit: ReturnType<typeof vi.fn>
}

/**
 * Internal manager interface for accessing private methods during testing.
 */
interface BrowserReadOnlyTerminalManagerInternal {
  formatTimestamp: (date: Date) => string
}

describe('BrowserReadOnlyTerminalManager', () => {
  let manager: BrowserReadOnlyTerminalManager
  let mockLogger: MockSystemLogger

  beforeEach(() => {
    // Mock the BrowserSystemLogger dependency
    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      on: vi.fn(),
      emit: vi.fn(),
    }

    manager = new BrowserReadOnlyTerminalManager(mockLogger)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    manager.cleanup()
  })

  describe('Constructor', () => {
    it('should create BrowserReadOnlyTerminalManager instance', () => {
      expect(manager).toBeInstanceOf(BrowserReadOnlyTerminalManager)
    })

    it('should initialize with provided logger', () => {
      const customLogger: MockSystemLogger = {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        on: vi.fn(),
        emit: vi.fn(),
      }
      const customManager = new BrowserReadOnlyTerminalManager(customLogger)

      expect(customManager).toBeInstanceOf(BrowserReadOnlyTerminalManager)
    })

    it('should use default logger when none provided', () => {
      const defaultManager = new BrowserReadOnlyTerminalManager()

      expect(defaultManager).toBeInstanceOf(BrowserReadOnlyTerminalManager)
    })

    it('should setup logger event handlers', () => {
      expect(mockLogger.on).toHaveBeenCalledWith(
        'systemEvent',
        expect.any(Function)
      )
    })
  })

  describe('initializeSystemTerminals()', () => {
    it('should create both system and timeline terminals', async () => {
      await manager.initializeSystemTerminals()

      const systemTerminal = manager.getTerminal('system')
      const timelineTerminal = manager.getTerminal('timeline')

      expect(systemTerminal).toBeDefined()
      expect(timelineTerminal).toBeDefined()
      expect(systemTerminal?.type).toBe('system')
      expect(timelineTerminal?.type).toBe('timeline')
    })

    it('should set system terminal as initially active', async () => {
      await manager.initializeSystemTerminals()

      const systemTerminal = manager.getTerminal('system')
      const timelineTerminal = manager.getTerminal('timeline')

      expect(systemTerminal?.isActive).toBe(true)
      expect(timelineTerminal?.isActive).toBe(false)
    })

    it('should add initialization messages to terminals', async () => {
      await manager.initializeSystemTerminals()

      const systemTerminal = manager.getTerminal('system')
      const timelineTerminal = manager.getTerminal('timeline')

      expect(systemTerminal?.lines).toHaveLength(1)
      expect(timelineTerminal?.lines).toHaveLength(1)
      expect(systemTerminal?.lines[0].content).toContain(
        'ready - monitoring IDE lifecycle events'
      )
      expect(timelineTerminal?.lines[0].content).toContain(
        'ready - monitoring Git activity'
      )
    })

    it('should configure terminals with correct settings', async () => {
      await manager.initializeSystemTerminals()

      const systemTerminal = manager.getTerminal('system')
      const timelineTerminal = manager.getTerminal('timeline')

      expect(systemTerminal?.maxLines).toBe(500)
      expect(timelineTerminal?.maxLines).toBe(1000)
      expect(systemTerminal?.autoScroll).toBe(true)
      expect(timelineTerminal?.autoScroll).toBe(true)
    })

    it('should log initialization completion', async () => {
      await manager.initializeSystemTerminals()

      expect(mockLogger.info).toHaveBeenCalledWith(
        'System terminals initialized successfully'
      )
    })

    it('should emit terminalCreated events', async () => {
      const terminalCreatedSpy = vi.fn()
      manager.on('terminalCreated', terminalCreatedSpy)

      await manager.initializeSystemTerminals()

      expect(terminalCreatedSpy).toHaveBeenCalledTimes(2)
      expect(terminalCreatedSpy).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'system' })
      )
      expect(terminalCreatedSpy).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'timeline' })
      )
    })

    it('should emit terminalActivated event for system terminal', async () => {
      const terminalActivatedSpy = vi.fn()
      manager.on('terminalActivated', terminalActivatedSpy)

      await manager.initializeSystemTerminals()

      expect(terminalActivatedSpy).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'system', isActive: true })
      )
    })
  })

  describe('createTerminal()', () => {
    it('should create terminal with default options', () => {
      const terminal = manager.createTerminal('system', 'Test Terminal')

      expect(terminal).toEqual({
        id: 'system',
        name: 'Test Terminal',
        type: 'system',
        isActive: false,
        createdAt: expect.any(Date),
        lastActivity: expect.any(Date),
        lines: [],
        autoScroll: true,
        maxLines: 1000,
        status: 'ready',
      })
    })

    it('should create terminal with custom options', () => {
      const terminal = manager.createTerminal('timeline', 'Custom Terminal', {
        maxLines: 500,
        autoScroll: false,
      })

      expect(terminal.maxLines).toBe(500)
      expect(terminal.autoScroll).toBe(false)
    })

    it('should use type as terminal ID', () => {
      const systemTerminal = manager.createTerminal('system', 'System')
      const timelineTerminal = manager.createTerminal('timeline', 'Timeline')

      expect(systemTerminal.id).toBe('system')
      expect(timelineTerminal.id).toBe('timeline')
    })

    it('should emit terminalCreated event', () => {
      const terminalCreatedSpy = vi.fn()
      manager.on('terminalCreated', terminalCreatedSpy)

      const terminal = manager.createTerminal('system', 'Test Terminal')

      expect(terminalCreatedSpy).toHaveBeenCalledWith(terminal)
    })

    it('should store terminal in internal map', () => {
      const terminal = manager.createTerminal('system', 'Test Terminal')

      expect(manager.getTerminal('system')).toBe(terminal)
    })
  })

  describe('getTerminal()', () => {
    beforeEach(() => {
      manager.createTerminal('system', 'System Terminal')
      manager.createTerminal('timeline', 'Timeline Terminal')
    })

    it('should return terminal by ID', () => {
      const systemTerminal = manager.getTerminal('system')
      const timelineTerminal = manager.getTerminal('timeline')

      expect(systemTerminal?.type).toBe('system')
      expect(timelineTerminal?.type).toBe('timeline')
    })

    it('should return undefined for non-existent terminal', () => {
      const terminal = manager.getTerminal('non-existent')

      expect(terminal).toBeUndefined()
    })
  })

  describe('getAllTerminals()', () => {
    it('should return empty array when no terminals', () => {
      const terminals = manager.getAllTerminals()

      expect(terminals).toEqual([])
    })

    it('should return all terminals', () => {
      manager.createTerminal('system', 'System Terminal')
      manager.createTerminal('timeline', 'Timeline Terminal')

      const terminals = manager.getAllTerminals()

      expect(terminals).toHaveLength(2)
      expect(terminals.some((t) => t.type === 'system')).toBe(true)
      expect(terminals.some((t) => t.type === 'timeline')).toBe(true)
    })

    it('should return copy of terminals array', () => {
      manager.createTerminal('system', 'System Terminal')

      const terminals1 = manager.getAllTerminals()
      const terminals2 = manager.getAllTerminals()

      expect(terminals1).not.toBe(terminals2)
      expect(terminals1).toEqual(terminals2)
    })
  })

  describe('setActiveTerminal()', () => {
    beforeEach(() => {
      manager.createTerminal('system', 'System Terminal')
      manager.createTerminal('timeline', 'Timeline Terminal')
    })

    it('should activate terminal and deactivate others', () => {
      manager.setActiveTerminal('system')
      manager.setActiveTerminal('timeline')

      const systemTerminal = manager.getTerminal('system')
      const timelineTerminal = manager.getTerminal('timeline')

      expect(systemTerminal?.isActive).toBe(false)
      expect(timelineTerminal?.isActive).toBe(true)
    })

    it('should update lastActivity timestamp', () => {
      const beforeTime = new Date()

      const success = manager.setActiveTerminal('system')
      const terminal = manager.getTerminal('system')

      expect(success).toBe(true)
      expect(terminal?.lastActivity.getTime()).toBeGreaterThanOrEqual(
        beforeTime.getTime()
      )
    })

    it('should emit terminalActivated event', () => {
      const terminalActivatedSpy = vi.fn()
      manager.on('terminalActivated', terminalActivatedSpy)

      manager.setActiveTerminal('system')

      expect(terminalActivatedSpy).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'system', isActive: true })
      )
    })

    it('should return false for non-existent terminal', () => {
      const success = manager.setActiveTerminal('non-existent')

      expect(success).toBe(false)
    })
  })

  describe('addLine()', () => {
    beforeEach(() => {
      manager.createTerminal('system', 'System Terminal')
    })

    it('should add line to terminal', () => {
      const line = manager.addLine('system', 'Test message', 'INFO')

      expect(line).toBeDefined()
      expect(line?.content).toBe('Test message')
      expect(line?.type).toBe('INFO')
      expect(line?.timestamp).toBeInstanceOf(Date)
      expect(line?.id).toMatch(/^line-\d{6}$/)
    })

    it('should add line with metadata', () => {
      const metadata = { source: 'test', level: 1 }
      const line = manager.addLine('system', 'Test message', 'INFO', metadata)

      expect(line?.metadata).toEqual(metadata)
    })

    it('should increment line counter', () => {
      const line1 = manager.addLine('system', 'Message 1')
      const line2 = manager.addLine('system', 'Message 2')

      expect(line1?.id).toBe('line-000001')
      expect(line2?.id).toBe('line-000002')
    })

    it('should update terminal lastActivity', async () => {
      const terminal = manager.getTerminal('system')
      const beforeTime = terminal?.lastActivity.getTime() || 0

      // Wait a small amount to ensure time difference
      await new Promise((resolve) => setTimeout(resolve, 2))
      manager.addLine('system', 'Test message')

      expect(terminal?.lastActivity.getTime()).toBeGreaterThanOrEqual(
        beforeTime
      )
    })

    it('should enforce line limits', () => {
      manager.updateTerminalConfig('system', { maxLines: 3 })

      manager.addLine('system', 'Line 1')
      manager.addLine('system', 'Line 2')
      manager.addLine('system', 'Line 3')
      manager.addLine('system', 'Line 4')

      const terminal = manager.getTerminal('system')
      expect(terminal?.lines).toHaveLength(3)
      expect(terminal?.lines[0].content).toBe('Line 2')
      expect(terminal?.lines[2].content).toBe('Line 4')
    })

    it('should emit terminalOutput event', () => {
      const terminalOutputSpy = vi.fn()
      manager.on('terminalOutput', terminalOutputSpy)

      const line = manager.addLine('system', 'Test message', 'INFO')

      expect(terminalOutputSpy).toHaveBeenCalledWith({
        terminalId: 'system',
        terminal: 'system',
        line,
        content: 'Test message',
        timestamp: line?.timestamp,
      })
    })

    it('should return null for non-existent terminal', () => {
      const line = manager.addLine('non-existent', 'Test message')

      expect(line).toBeNull()
    })

    it('should use INFO as default line type', () => {
      const line = manager.addLine('system', 'Test message')

      expect(line?.type).toBe('INFO')
    })
  })

  describe('clearTerminal()', () => {
    beforeEach(() => {
      manager.createTerminal('system', 'System Terminal')
      manager.addLine('system', 'Line 1')
      manager.addLine('system', 'Line 2')
    })

    it('should clear all lines from terminal', () => {
      const success = manager.clearTerminal('system')
      const terminal = manager.getTerminal('system')

      expect(success).toBe(true)
      expect(terminal?.lines).toHaveLength(0)
    })

    it('should update lastActivity timestamp', () => {
      const beforeTime = new Date()

      manager.clearTerminal('system')
      const terminal = manager.getTerminal('system')

      expect(terminal?.lastActivity.getTime()).toBeGreaterThanOrEqual(
        beforeTime.getTime()
      )
    })

    it('should emit terminalCleared event', () => {
      const terminalClearedSpy = vi.fn()
      manager.on('terminalCleared', terminalClearedSpy)

      manager.clearTerminal('system')

      expect(terminalClearedSpy).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'system' })
      )
    })

    it('should return false for non-existent terminal', () => {
      const success = manager.clearTerminal('non-existent')

      expect(success).toBe(false)
    })
  })

  describe('getTerminalLines()', () => {
    beforeEach(() => {
      manager.createTerminal('system', 'System Terminal')

      // Add test lines with different types and timestamps
      manager.addLine('system', 'Info message', 'INFO')
      manager.addLine('system', 'Warning message', 'WARN')
      manager.addLine('system', 'Error message', 'ERROR')
      manager.addLine('system', 'Another info', 'INFO')
    })

    it('should return all lines without filters', () => {
      const lines = manager.getTerminalLines('system')

      expect(lines).toHaveLength(4)
      expect(lines[0].content).toBe('Info message')
      expect(lines[3].content).toBe('Another info')
    })

    it('should filter lines by type', () => {
      const infoLines = manager.getTerminalLines('system', { type: 'INFO' })
      const warnLines = manager.getTerminalLines('system', { type: 'WARN' })

      expect(infoLines).toHaveLength(2)
      expect(warnLines).toHaveLength(1)
      expect(infoLines.every((line) => line.type === 'INFO')).toBe(true)
      expect(warnLines[0].type).toBe('WARN')
    })

    it('should filter lines by date', async () => {
      // Wait a moment to ensure time difference (increase to 10ms for reliability)
      await new Promise((resolve) => setTimeout(resolve, 10))
      const cutoffTime = new Date()

      // Wait another moment to ensure the new line has a different timestamp
      await new Promise((resolve) => setTimeout(resolve, 10))

      // Add more lines after cutoff
      manager.addLine('system', 'Recent message', 'INFO')

      const recentLines = manager.getTerminalLines('system', {
        since: cutoffTime,
      })

      expect(recentLines).toHaveLength(1)
      expect(recentLines[0].content).toBe('Recent message')
    })

    it('should limit returned lines', () => {
      const limitedLines = manager.getTerminalLines('system', { limit: 2 })

      expect(limitedLines).toHaveLength(2)
      expect(limitedLines[0].content).toBe('Error message')
      expect(limitedLines[1].content).toBe('Another info')
    })

    it('should combine filters', () => {
      const filteredLines = manager.getTerminalLines('system', {
        type: 'INFO',
        limit: 1,
      })

      expect(filteredLines).toHaveLength(1)
      expect(filteredLines[0].content).toBe('Another info')
      expect(filteredLines[0].type).toBe('INFO')
    })

    it('should return empty array for non-existent terminal', () => {
      const lines = manager.getTerminalLines('non-existent')

      expect(lines).toEqual([])
    })

    it('should handle zero or negative limit', () => {
      const zeroLimitLines = manager.getTerminalLines('system', { limit: 0 })
      const negativeLimitLines = manager.getTerminalLines('system', {
        limit: -5,
      })

      expect(zeroLimitLines).toHaveLength(4) // All lines (0 is falsy)
      expect(negativeLimitLines).toHaveLength(4) // All lines (negative ignored)
    })
  })

  describe('updateTerminalConfig()', () => {
    beforeEach(() => {
      manager.createTerminal('system', 'System Terminal', {
        maxLines: 100,
        autoScroll: true,
      })
    })

    it('should update autoScroll setting', () => {
      const success = manager.updateTerminalConfig('system', {
        autoScroll: false,
      })
      const terminal = manager.getTerminal('system')

      expect(success).toBe(true)
      expect(terminal?.autoScroll).toBe(false)
    })

    it('should update maxLines setting', () => {
      const success = manager.updateTerminalConfig('system', { maxLines: 50 })
      const terminal = manager.getTerminal('system')

      expect(success).toBe(true)
      expect(terminal?.maxLines).toBe(50)
    })

    it('should enforce new line limit when reducing maxLines', () => {
      // Add lines beyond new limit
      for (let i = 1; i <= 10; i++) {
        manager.addLine('system', `Line ${i}`)
      }

      manager.updateTerminalConfig('system', { maxLines: 5 })
      const terminal = manager.getTerminal('system')

      expect(terminal?.lines).toHaveLength(5)
      expect(terminal?.lines[0].content).toBe('Line 6')
      expect(terminal?.lines[4].content).toBe('Line 10')
    })

    it('should update both settings simultaneously', () => {
      const success = manager.updateTerminalConfig('system', {
        autoScroll: false,
        maxLines: 25,
      })
      const terminal = manager.getTerminal('system')

      expect(success).toBe(true)
      expect(terminal?.autoScroll).toBe(false)
      expect(terminal?.maxLines).toBe(25)
    })

    it('should return false for non-existent terminal', () => {
      const success = manager.updateTerminalConfig('non-existent', {
        autoScroll: false,
      })

      expect(success).toBe(false)
    })

    it('should handle undefined values gracefully', () => {
      const terminal = manager.getTerminal('system')
      const originalAutoScroll = terminal?.autoScroll
      const originalMaxLines = terminal?.maxLines

      manager.updateTerminalConfig('system', {
        autoScroll: undefined,
        maxLines: undefined,
      })

      expect(terminal?.autoScroll).toBe(originalAutoScroll)
      expect(terminal?.maxLines).toBe(originalMaxLines)
    })
  })

  describe('cleanup()', () => {
    beforeEach(() => {
      manager.createTerminal('system', 'System Terminal')
      manager.createTerminal('timeline', 'Timeline Terminal')
      manager.addLine('system', 'Test line')
    })

    it('should clear all terminals', () => {
      manager.cleanup()

      expect(manager.getAllTerminals()).toHaveLength(0)
      expect(manager.getTerminal('system')).toBeUndefined()
      expect(manager.getTerminal('timeline')).toBeUndefined()
    })

    it('should reset line counter', () => {
      manager.cleanup()
      manager.createTerminal('system', 'New Terminal')
      const line = manager.addLine('system', 'First line after cleanup')

      expect(line?.id).toBe('line-000001')
    })

    it('should remove all event listeners', () => {
      const removeAllListenersSpy = vi.spyOn(manager, 'removeAllListeners')

      manager.cleanup()

      expect(removeAllListenersSpy).toHaveBeenCalled()
    })
  })

  describe('System Event Handling', () => {
    beforeEach(async () => {
      await manager.initializeSystemTerminals()
    })

    it('should handle system events and route to terminals', () => {
      // Get the event handler that was registered with the logger
      const eventHandlerCall = mockLogger.on.mock.calls.find(
        (call: unknown[]) => call[0] === 'systemEvent'
      )
      expect(eventHandlerCall).toBeDefined()

      const handleSystemEvent = eventHandlerCall[1]

      // Create a mock system event
      const systemEvent: SystemEvent = {
        id: 'event-001',
        type: 'INFO',
        terminal: 'system',
        message: 'Test system message',
        timestamp: new Date(),
        context: { test: true },
      }

      // Trigger the event handler
      handleSystemEvent(systemEvent)

      const lines = manager.getTerminalLines('system')

      expect(lines).toHaveLength(2) // 1 init + 1 new
      expect(lines[1].content).toContain('[INFO] Test system message')
      expect(lines[1].metadata?.eventId).toBe('event-001')
      expect(lines[1].metadata?.context).toEqual({ test: true })
    })

    it('should format timestamps in system event messages', () => {
      const eventHandlerCall = mockLogger.on.mock.calls.find(
        (call: unknown[]) => call[0] === 'systemEvent'
      )
      const handleSystemEvent = eventHandlerCall[1]

      const systemEvent: SystemEvent = {
        id: 'event-001',
        type: 'ERROR',
        terminal: 'timeline',
        message: 'Git operation failed',
        timestamp: new Date('2023-01-01T12:30:45.123Z'),
      }

      handleSystemEvent(systemEvent)

      const lines = manager.getTerminalLines('timeline')
      expect(lines[1].content).toContain('2023-01-01 12:30:45.123')
      expect(lines[1].content).toContain('[ERROR] Git operation failed')
    })

    it('should ignore events for non-existent terminals', () => {
      const eventHandlerCall = mockLogger.on.mock.calls.find(
        (call: unknown[]) => call[0] === 'systemEvent'
      )
      const handleSystemEvent = eventHandlerCall[1]

      const systemEvent: SystemEvent = {
        id: 'event-001',
        type: 'INFO',
        terminal: 'non-existent' as SystemEvent['terminal'],
        message: 'Test message',
        timestamp: new Date(),
      }

      // Should not throw error
      expect(() => handleSystemEvent(systemEvent)).not.toThrow()
    })
  })

  describe('Terminal Initialization Messages', () => {
    it('should add appropriate message for system terminal', async () => {
      await manager.initializeSystemTerminals()

      const lines = manager.getTerminalLines('system')

      expect(lines).toHaveLength(1)
      expect(lines[0].content).toContain(
        'Terminal [System] ready - monitoring IDE lifecycle events'
      )
      expect(lines[0].type).toBe('INFO')
    })

    it('should add appropriate message for timeline terminal', async () => {
      await manager.initializeSystemTerminals()

      const lines = manager.getTerminalLines('timeline')

      expect(lines).toHaveLength(1)
      expect(lines[0].content).toContain(
        'Terminal [Timeline] ready - monitoring Git activity with complete traceability'
      )
      expect(lines[0].type).toBe('INFO')
    })

    it('should format initialization timestamps correctly', async () => {
      await manager.initializeSystemTerminals()

      const lines = manager.getTerminalLines('system')
      const timestampRegex = /\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3}/

      expect(lines[0].content).toMatch(timestampRegex)
    })
  })

  describe('Timestamp Formatting', () => {
    it('should format timestamps correctly', () => {
      const testDate = new Date('2023-01-01T12:30:45.123Z')
      const formatted = (
        manager as unknown as BrowserReadOnlyTerminalManagerInternal
      ).formatTimestamp(testDate)

      expect(formatted).toBe('2023-01-01 12:30:45.123')
    })

    it('should handle different dates consistently', () => {
      const dates = [
        new Date('2023-12-31T23:59:59.999Z'),
        new Date('2023-01-01T00:00:00.000Z'),
        new Date('2023-06-15T15:30:45.500Z'),
      ]

      dates.forEach((date) => {
        const formatted = (
          manager as unknown as BrowserReadOnlyTerminalManagerInternal
        ).formatTimestamp(date)
        expect(formatted).toMatch(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3}/)
      })
    })
  })

  describe('SimpleEventEmitter Integration', () => {
    it('should implement event emitter functionality', () => {
      expect(manager.on).toBeDefined()
      expect(manager.emit).toBeDefined()
      expect(manager.removeAllListeners).toBeDefined()
    })

    it('should support multiple listeners for same event', () => {
      const listener1 = vi.fn()
      const listener2 = vi.fn()

      manager.on('terminalCreated', listener1)
      manager.on('terminalCreated', listener2)

      manager.createTerminal('system', 'Test Terminal')

      expect(listener1).toHaveBeenCalledOnce()
      expect(listener2).toHaveBeenCalledOnce()
    })

    it('should emit events with correct data types', () => {
      const terminalOutputSpy = vi.fn()
      manager.on('terminalOutput', terminalOutputSpy)

      manager.createTerminal('system', 'Test Terminal')
      manager.addLine('system', 'Test message', 'INFO')

      expect(terminalOutputSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          terminalId: expect.any(String),
          terminal: expect.any(String),
          line: expect.objectContaining({
            id: expect.any(String),
            content: expect.any(String),
            type: expect.any(String),
            timestamp: expect.any(Date),
          }),
          content: expect.any(String),
          timestamp: expect.any(Date),
        })
      )
    })

    it('should handle event listeners correctly', () => {
      const listener = vi.fn()
      manager.on('terminalCreated', listener)

      // Test that listener is called
      manager.createTerminal('system', 'Test Terminal')
      expect(listener).toHaveBeenCalledOnce()

      // Test that removeAllListeners works
      manager.removeAllListeners()
      manager.createTerminal('timeline', 'Test Terminal 2')
      expect(listener).toHaveBeenCalledOnce() // Should not be called again
    })
  })

  describe('Browser Compatibility Features', () => {
    it('should work without Node.js dependencies', () => {
      // Verify that the manager doesn't rely on Node.js-specific modules
      expect(manager).toBeInstanceOf(BrowserReadOnlyTerminalManager)

      // Test basic functionality in browser-like environment
      const terminal = manager.createTerminal('system', 'Browser Terminal')
      const line = manager.addLine('system', 'Browser test message')

      expect(terminal).toBeDefined()
      expect(line).toBeDefined()
    })

    it('should handle browser-compatible event emitting', () => {
      const events = [
        'terminalCreated',
        'terminalOutput',
        'terminalActivated',
        'terminalCleared',
      ]

      events.forEach((eventName) => {
        const listener = vi.fn()
        manager.on(eventName as keyof typeof manager, listener)

        // The fact that this doesn't throw confirms browser compatibility
        expect(() =>
          manager.on(eventName as keyof typeof manager, listener)
        ).not.toThrow()
      })
    })

    it('should use browser-compatible timestamp formatting', () => {
      const testDate = new Date('2023-01-01T12:30:45.123Z')
      const formatted = (
        manager as unknown as BrowserReadOnlyTerminalManagerInternal
      ).formatTimestamp(testDate)

      // Should use toISOString() which is universally supported
      expect(formatted).toBe('2023-01-01 12:30:45.123')
      expect(typeof formatted).toBe('string')
    })
  })

  describe('Memory Management and Performance', () => {
    it('should handle many terminals efficiently', () => {
      const terminalCount = 100

      for (let i = 0; i < terminalCount; i++) {
        // Create unique terminal IDs by using the index
        manager.createTerminal(
          i % 2 === 0 ? 'system' : 'timeline',
          `Terminal ${i}`
        )
      }

      // Since terminals use type as ID, we can only have 2 unique terminals (system + timeline)
      // The test should verify the manager can handle repeated terminal creation
      expect(manager.getAllTerminals()).toHaveLength(2)
      expect(manager.getTerminal('system')?.name).toBe('Terminal 98') // Last even index
      expect(manager.getTerminal('timeline')?.name).toBe('Terminal 99') // Last odd index
    })

    it('should handle many lines per terminal efficiently', () => {
      manager.createTerminal('system', 'Test Terminal', { maxLines: 10000 })

      const lineCount = 1000
      for (let i = 0; i < lineCount; i++) {
        manager.addLine('system', `Line ${i}`)
      }

      const lines = manager.getTerminalLines('system')
      expect(lines).toHaveLength(lineCount)
    })

    it('should respect memory limits with large line counts', () => {
      manager.createTerminal('system', 'Test Terminal', { maxLines: 5 })

      // Add more lines than the limit
      for (let i = 1; i <= 10; i++) {
        manager.addLine('system', `Line ${i}`)
      }

      const terminal = manager.getTerminal('system')
      expect(terminal?.lines).toHaveLength(5)
      expect(terminal?.lines[0].content).toBe('Line 6')
      expect(terminal?.lines[4].content).toBe('Line 10')
    })

    it('should handle rapid line addition efficiently', () => {
      manager.createTerminal('system', 'Performance Test Terminal')

      const startTime = Date.now()

      // Add many lines rapidly
      for (let i = 0; i < 1000; i++) {
        manager.addLine('system', `Rapid line ${i}`)
      }

      const endTime = Date.now()
      const executionTime = endTime - startTime

      // Should complete within reasonable time
      expect(executionTime).toBeLessThan(1000)
      expect(manager.getTerminalLines('system')).toHaveLength(1000)
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle empty terminal name', () => {
      const terminal = manager.createTerminal('system', '')

      expect(terminal.name).toBe('')
      expect(terminal.type).toBe('system')
    })

    it('should handle very long terminal names', () => {
      const longName = 'A'.repeat(1000)
      const terminal = manager.createTerminal('system', longName)

      expect(terminal.name).toBe(longName)
    })

    it('should handle empty line content', () => {
      manager.createTerminal('system', 'Test Terminal')
      const line = manager.addLine('system', '')

      expect(line?.content).toBe('')
    })

    it('should handle very long line content', () => {
      manager.createTerminal('system', 'Test Terminal')
      const longContent = 'A'.repeat(10000)
      const line = manager.addLine('system', longContent)

      expect(line?.content).toBe(longContent)
    })

    it('should handle null/undefined metadata gracefully', () => {
      manager.createTerminal('system', 'Test Terminal')

      const line1 = manager.addLine(
        'system',
        'Test',
        'INFO',
        null as unknown as Record<string, unknown>
      )
      const line2 = manager.addLine('system', 'Test', 'INFO', undefined)

      expect(line1?.metadata).toBeNull()
      expect(line2?.metadata).toBeUndefined()
    })

    it('should handle complex metadata objects', () => {
      manager.createTerminal('system', 'Test Terminal')

      const complexMetadata = {
        nested: { deep: { value: 42 } },
        array: [1, 2, { nested: true }],
        null: null,
        undefined: undefined,
        date: new Date(),
        regex: /test/gi,
      }

      const line = manager.addLine('system', 'Test', 'INFO', complexMetadata)

      expect(line?.metadata).toEqual(complexMetadata)
    })
  })

  describe('Integration with Default Instance', () => {
    it('should provide browserReadOnlyTerminalManager default instance', () => {
      expect(browserReadOnlyTerminalManager).toBeInstanceOf(
        BrowserReadOnlyTerminalManager
      )
    })

    it('should be separate from manually created instances', async () => {
      const manualManager = new BrowserReadOnlyTerminalManager(mockLogger)

      await browserReadOnlyTerminalManager.initializeSystemTerminals()
      await manualManager.initializeSystemTerminals()

      expect(browserReadOnlyTerminalManager.getAllTerminals()).toHaveLength(2)
      expect(manualManager.getAllTerminals()).toHaveLength(2)

      // They should be separate instances
      expect(browserReadOnlyTerminalManager.getTerminal('system')).not.toBe(
        manualManager.getTerminal('system')
      )
    })
  })

  describe('Type Safety and Interface Compliance', () => {
    it('should create terminals that match ReadOnlyTerminalState interface', () => {
      const terminal = manager.createTerminal('system', 'Test Terminal')

      // Verify all required properties exist with correct types
      expect(typeof terminal.id).toBe('string')
      expect(typeof terminal.name).toBe('string')
      expect(['system', 'timeline'].includes(terminal.type)).toBe(true)
      expect(typeof terminal.isActive).toBe('boolean')
      expect(terminal.createdAt).toBeInstanceOf(Date)
      expect(terminal.lastActivity).toBeInstanceOf(Date)
      expect(Array.isArray(terminal.lines)).toBe(true)
      expect(typeof terminal.autoScroll).toBe('boolean')
      expect(typeof terminal.maxLines).toBe('number')
      expect(['initializing', 'ready', 'error'].includes(terminal.status)).toBe(
        true
      )
    })

    it('should create lines that match ReadOnlyTerminalLine interface', () => {
      manager.createTerminal('system', 'Test Terminal')
      const line = manager.addLine('system', 'Test message', 'INFO', {
        test: true,
      })

      expect(line).toBeDefined()
      if (line) {
        expect(typeof line.id).toBe('string')
        expect(typeof line.content).toBe('string')
        expect(
          ['CMD', 'GIT', 'INFO', 'WARN', 'ERROR', 'FATAL'].includes(line.type)
        ).toBe(true)
        expect(line.timestamp).toBeInstanceOf(Date)
        expect(typeof line.metadata).toBe('object')
      }
    })

    it('should emit events that match TerminalOutputEvent interface', () => {
      const terminalOutputSpy = vi.fn()
      manager.on('terminalOutput', terminalOutputSpy)

      manager.createTerminal('system', 'Test Terminal')
      manager.addLine('system', 'Test message', 'INFO')

      expect(terminalOutputSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          terminalId: expect.any(String),
          terminal: expect.any(String),
          line: expect.objectContaining({
            id: expect.any(String),
            content: expect.any(String),
            type: expect.any(String),
            timestamp: expect.any(Date),
          }),
          content: expect.any(String),
          timestamp: expect.any(Date),
        })
      )
    })
  })

  describe('SimpleEventEmitter Implementation Details', () => {
    it('should store listeners correctly', () => {
      const listener1 = vi.fn()
      const listener2 = vi.fn()

      manager.on('terminalCreated', listener1)
      manager.on('terminalOutput', listener2)

      // Test that listeners are stored
      manager.createTerminal('system', 'Test')
      expect(listener1).toHaveBeenCalled()
      expect(listener2).not.toHaveBeenCalled()

      manager.addLine('system', 'Test')
      expect(listener2).toHaveBeenCalled()
    })

    it('should handle events without listeners', () => {
      // Should not throw when emitting events without listeners
      expect(() => {
        manager.createTerminal('system', 'Test')
        manager.addLine('system', 'Test')
      }).not.toThrow()
    })

    it('should support chaining for on() method', () => {
      const listener1 = vi.fn()
      const listener2 = vi.fn()

      const result = manager
        .on('terminalCreated', listener1)
        .on('terminalOutput', listener2)

      expect(result).toBe(manager)
    })

    it('should clear all listeners on removeAllListeners', () => {
      const listener = vi.fn()

      manager.on('terminalCreated', listener)
      manager.createTerminal('system', 'Test 1')
      expect(listener).toHaveBeenCalledTimes(1)

      manager.removeAllListeners()
      manager.createTerminal('timeline', 'Test 2')
      expect(listener).toHaveBeenCalledTimes(1) // Should not be called again
    })
  })
})
