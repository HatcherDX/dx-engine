/**
 * @fileoverview Comprehensive tests for BrowserSystemLogger.
 *
 * @description
 * Tests for browser-compatible system logging functionality including:
 * - Simple event emitter implementation
 * - Causa-Efecto logging pattern
 * - Event creation and emission
 * - Browser console integration
 * - Event filtering and retrieval
 * - Memory management
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  BrowserSystemLogger,
  browserSystemLogger,
  type SystemEventType,
  type SystemTerminalType,
} from './BrowserSystemLogger'

/**
 * Mock interface for console methods in tests.
 */
interface MockConsole {
  log: ReturnType<typeof vi.spyOn>
  warn: ReturnType<typeof vi.spyOn>
  error: ReturnType<typeof vi.spyOn>
}

describe('BrowserSystemLogger', () => {
  let logger: BrowserSystemLogger
  let consoleSpy: MockConsole

  beforeEach(() => {
    logger = new BrowserSystemLogger()

    // Mock console methods
    consoleSpy = {
      log: vi.spyOn(console, 'log').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
    }
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Constructor', () => {
    it('should create BrowserSystemLogger instance', () => {
      expect(logger).toBeInstanceOf(BrowserSystemLogger)
    })

    it('should initialize with empty events array', () => {
      expect(logger.getEvents()).toHaveLength(0)
    })

    it('should have event counter starting at 0', () => {
      const firstEvent = logger.info('test')
      expect(firstEvent.id).toBe('system-000001')
    })
  })

  describe('logCommand() - Causa Logging', () => {
    it('should log command without arguments', () => {
      const event = logger.logCommand('git.status')

      expect(event.type).toBe('CMD')
      expect(event.terminal).toBe('timeline')
      expect(event.message).toBe('git.status()')
      expect(event.context).toEqual({
        functionName: 'git.status',
        args: undefined,
      })
    })

    it('should log command with arguments', () => {
      const args = ['--porcelain', { verbose: true }]
      const event = logger.logCommand('git.status', args)

      expect(event.type).toBe('CMD')
      expect(event.message).toBe('git.status("--porcelain", {"verbose":true})')
      expect(event.context).toEqual({
        functionName: 'git.status',
        args,
      })
    })

    it('should log command with empty arguments array', () => {
      const event = logger.logCommand('git.status', [])

      expect(event.message).toBe('git.status()')
    })

    it('should route to specified terminal', () => {
      const event = logger.logCommand('system.init', [], 'system')

      expect(event.terminal).toBe('system')
    })

    it('should default to timeline terminal', () => {
      const event = logger.logCommand('git.status')

      expect(event.terminal).toBe('timeline')
    })

    it('should handle complex arguments', () => {
      const complexArgs = [
        { path: '/test', recursive: true },
        null,
        undefined,
        42,
        'string',
        [1, 2, 3],
      ]
      const event = logger.logCommand('complex.operation', complexArgs)

      expect(event.message).toContain('{"path":"/test","recursive":true}')
      expect(event.message).toContain('null')
      expect(event.message).toContain('42')
      expect(event.message).toContain('"string"')
      expect(event.message).toContain('[1,2,3]')
    })

    it('should emit commandLogged event', () => {
      const commandLoggedSpy = vi.fn()
      logger.on('commandLogged', commandLoggedSpy)

      const event = logger.logCommand('test.function')

      expect(commandLoggedSpy).toHaveBeenCalledOnce()
      expect(commandLoggedSpy).toHaveBeenCalledWith(event)
    })

    it('should emit systemEvent event', () => {
      const systemEventSpy = vi.fn()
      logger.on('systemEvent', systemEventSpy)

      const event = logger.logCommand('test.function')

      expect(systemEventSpy).toHaveBeenCalledOnce()
      expect(systemEventSpy).toHaveBeenCalledWith(event)
    })
  })

  describe('logResult() - Efecto Logging', () => {
    it('should log successful git result', () => {
      const event = logger.logResult('GIT', 'Status retrieved successfully')

      expect(event.type).toBe('GIT')
      expect(event.terminal).toBe('timeline')
      expect(event.message).toBe('Status retrieved successfully')
      expect(event.context).toBeUndefined()
    })

    it('should log error result with context', () => {
      const errorContext = { error: 'Permission denied', code: 403 }
      const event = logger.logResult(
        'ERROR',
        'Failed to access repository',
        'system',
        errorContext
      )

      expect(event.type).toBe('ERROR')
      expect(event.terminal).toBe('system')
      expect(event.message).toBe('Failed to access repository')
      expect(event.context).toEqual(errorContext)
    })

    it('should log info result', () => {
      const event = logger.logResult('INFO', 'Project initialized')

      expect(event.type).toBe('INFO')
      expect(event.terminal).toBe('timeline')
    })

    it('should log warning result', () => {
      const event = logger.logResult('WARN', 'Deprecated API used')

      expect(event.type).toBe('WARN')
      expect(event.terminal).toBe('timeline')
    })

    it('should log fatal error result', () => {
      const event = logger.logResult('FATAL', 'System corruption detected')

      expect(event.type).toBe('FATAL')
      expect(event.terminal).toBe('timeline')
    })

    it('should emit resultLogged event', () => {
      const resultLoggedSpy = vi.fn()
      logger.on('resultLogged', resultLoggedSpy)

      const event = logger.logResult('GIT', 'Operation completed')

      expect(resultLoggedSpy).toHaveBeenCalledOnce()
      expect(resultLoggedSpy).toHaveBeenCalledWith(event)
    })

    it('should not emit commandLogged event for results', () => {
      const commandLoggedSpy = vi.fn()
      logger.on('commandLogged', commandLoggedSpy)

      logger.logResult('GIT', 'Operation completed')

      expect(commandLoggedSpy).not.toHaveBeenCalled()
    })
  })

  describe('Convenience Logging Methods', () => {
    describe('info()', () => {
      it('should create INFO event for system terminal', () => {
        const event = logger.info('Application started')

        expect(event.type).toBe('INFO')
        expect(event.terminal).toBe('system')
        expect(event.message).toBe('Application started')
      })

      it('should include context if provided', () => {
        const context = { version: '1.0.0', environment: 'production' }
        const event = logger.info('Application started', context)

        expect(event.context).toEqual(context)
      })
    })

    describe('warn()', () => {
      it('should create WARN event for system terminal by default', () => {
        const event = logger.warn('Memory usage high')

        expect(event.type).toBe('WARN')
        expect(event.terminal).toBe('system')
        expect(event.message).toBe('Memory usage high')
      })

      it('should support custom terminal', () => {
        const event = logger.warn('Git operation slow', 'timeline')

        expect(event.terminal).toBe('timeline')
      })

      it('should include context if provided', () => {
        const context = { memoryUsage: '85%', threshold: '80%' }
        const event = logger.warn('Memory usage high', 'system', context)

        expect(event.context).toEqual(context)
      })
    })

    describe('error()', () => {
      it('should create ERROR event for system terminal by default', () => {
        const event = logger.error('Database connection failed')

        expect(event.type).toBe('ERROR')
        expect(event.terminal).toBe('system')
        expect(event.message).toBe('Database connection failed')
      })

      it('should support custom terminal', () => {
        const event = logger.error('Git push failed', 'timeline')

        expect(event.terminal).toBe('timeline')
      })

      it('should include error context', () => {
        const error = new Error('Connection timeout')
        const context = { error, retryCount: 3 }
        const event = logger.error('Operation failed', 'system', context)

        expect(event.context).toEqual(context)
      })
    })

    describe('fatal()', () => {
      it('should create FATAL event for system terminal by default', () => {
        const event = logger.fatal('System corruption detected')

        expect(event.type).toBe('FATAL')
        expect(event.terminal).toBe('system')
        expect(event.message).toBe('System corruption detected')
      })

      it('should support custom terminal', () => {
        const event = logger.fatal('Critical git error', 'timeline')

        expect(event.terminal).toBe('timeline')
      })

      it('should include fatal error context', () => {
        const context = {
          errorCode: 'SYSTEM_FATAL_001',
          affectedModules: ['core', 'storage'],
        }
        const event = logger.fatal('System failure', 'system', context)

        expect(event.context).toEqual(context)
      })
    })
  })

  describe('Console Integration', () => {
    it('should log INFO events to console.log', () => {
      logger.info('Test message')

      expect(consoleSpy.log).toHaveBeenCalledWith(
        '[INFO] [SYSTEM] Test message',
        undefined
      )
    })

    it('should log WARN events to console.warn', () => {
      const context = { level: 'high' }
      logger.warn('Warning message', 'system', context)

      expect(consoleSpy.warn).toHaveBeenCalledWith(
        '[WARN] [SYSTEM] Warning message',
        context
      )
    })

    it('should log ERROR events to console.error', () => {
      const context = { error: 'Network timeout' }
      logger.error('Error occurred', 'timeline', context)

      expect(consoleSpy.error).toHaveBeenCalledWith(
        '[ERROR] [TIMELINE] Error occurred',
        context
      )
    })

    it('should log FATAL events to console.error', () => {
      logger.fatal('Fatal error')

      expect(consoleSpy.error).toHaveBeenCalledWith(
        '[FATAL] [SYSTEM] Fatal error',
        undefined
      )
    })

    it('should log CMD events to console.log', () => {
      logger.logCommand('git.status', ['--porcelain'])

      expect(consoleSpy.log).toHaveBeenCalledWith(
        '[CMD] [TIMELINE] git.status("--porcelain")',
        expect.objectContaining({
          functionName: 'git.status',
          args: ['--porcelain'],
        })
      )
    })

    it('should log GIT result events to console.log', () => {
      const context = { files: 3 }
      logger.logResult('GIT', 'Status completed', 'timeline', context)

      expect(consoleSpy.log).toHaveBeenCalledWith(
        '[GIT] [TIMELINE] Status completed',
        context
      )
    })

    it('should uppercase terminal names in console output', () => {
      logger.info('Message for system')
      logger.warn('Message for timeline', 'timeline')

      expect(consoleSpy.log).toHaveBeenCalledWith(
        '[INFO] [SYSTEM] Message for system',
        undefined
      )
      expect(consoleSpy.warn).toHaveBeenCalledWith(
        '[WARN] [TIMELINE] Message for timeline',
        undefined
      )
    })
  })

  describe('Event Management', () => {
    describe('getEvents()', () => {
      beforeEach(() => {
        logger.info('System message 1')
        logger.warn('Timeline warning', 'timeline')
        logger.error('System error')
        logger.logCommand('git.status', [], 'timeline')
        logger.logResult('GIT', 'Status completed', 'timeline')
      })

      it('should return all events when no filter is provided', () => {
        const events = logger.getEvents()

        expect(events).toHaveLength(5)
      })

      it('should filter events by terminal type', () => {
        const systemEvents = logger.getEvents('system')
        const timelineEvents = logger.getEvents('timeline')

        expect(systemEvents).toHaveLength(2) // info + error
        expect(timelineEvents).toHaveLength(3) // warn + command + result

        expect(systemEvents.every((event) => event.terminal === 'system')).toBe(
          true
        )
        expect(
          timelineEvents.every((event) => event.terminal === 'timeline')
        ).toBe(true)
      })

      it('should limit returned events when limit is specified', () => {
        const limitedEvents = logger.getEvents(undefined, 3)

        expect(limitedEvents).toHaveLength(3)
        // Should return the last 3 events
        expect(limitedEvents[0].type).toBe('ERROR')
        expect(limitedEvents[1].type).toBe('CMD')
        expect(limitedEvents[2].type).toBe('GIT')
      })

      it('should combine terminal filter with limit', () => {
        const limitedSystemEvents = logger.getEvents('system', 1)

        expect(limitedSystemEvents).toHaveLength(1)
        expect(limitedSystemEvents[0].terminal).toBe('system')
        expect(limitedSystemEvents[0].type).toBe('ERROR') // Last system event
      })

      it('should handle limit larger than available events', () => {
        const events = logger.getEvents(undefined, 100)

        expect(events).toHaveLength(5) // All available events
      })

      it('should handle zero or negative limit', () => {
        const zeroLimitEvents = logger.getEvents(undefined, 0)
        const negativeLimitEvents = logger.getEvents(undefined, -5)

        expect(zeroLimitEvents).toHaveLength(5) // All events (0 is falsy)
        expect(negativeLimitEvents).toHaveLength(5) // All events (negative ignored)
      })
    })

    describe('clearEvents()', () => {
      it('should clear all events from memory', () => {
        logger.info('Test message 1')
        logger.warn('Test message 2')
        logger.error('Test message 3')

        expect(logger.getEvents()).toHaveLength(3)

        logger.clearEvents()

        expect(logger.getEvents()).toHaveLength(0)
      })

      it('should reset event counter', () => {
        logger.info('First message')
        expect(logger.getEvents()[0].id).toBe('system-000001')

        logger.clearEvents()

        logger.info('After clear')
        expect(logger.getEvents()[0].id).toBe('system-000001')
      })
    })
  })

  describe('Event Structure and Properties', () => {
    it('should create events with required properties', () => {
      const event = logger.info('Test message')

      expect(event).toHaveProperty('type', 'INFO')
      expect(event).toHaveProperty('terminal', 'system')
      expect(event).toHaveProperty('message', 'Test message')
      expect(event).toHaveProperty('timestamp')
      expect(event).toHaveProperty('id')
      expect(event.timestamp).toBeInstanceOf(Date)
      expect(typeof event.id).toBe('string')
    })

    it('should generate unique sequential IDs', () => {
      const event1 = logger.info('Message 1')
      const event2 = logger.warn('Message 2')
      const event3 = logger.error('Message 3')

      expect(event1.id).toBe('system-000001')
      expect(event2.id).toBe('system-000002')
      expect(event3.id).toBe('system-000003')
    })

    it('should pad event IDs with zeros', () => {
      // Create many events to test padding
      for (let i = 0; i < 99; i++) {
        logger.info(`Message ${i}`)
      }

      const event100 = logger.info('Message 100')
      expect(event100.id).toBe('system-000100')
    })

    it('should handle context being undefined', () => {
      const event = logger.info('Message without context')

      expect(event.context).toBeUndefined()
    })

    it('should preserve context when provided', () => {
      const context = { key1: 'value1', key2: 42, key3: { nested: true } }
      const event = logger.info('Message with context', context)

      expect(event.context).toEqual(context)
      // Note: BrowserSystemLogger passes context directly (no cloning)
      expect(event.context).toBe(context)
    })
  })

  describe('Memory Management', () => {
    it('should respect maxEvents limit (1000)', () => {
      // Create more than maxEvents (1000)
      for (let i = 0; i < 1002; i++) {
        logger.info(`Message ${i}`)
      }

      const events = logger.getEvents()
      expect(events).toHaveLength(1000)

      // Should have removed the oldest events
      expect(events[0].message).toBe('Message 2')
      expect(events[999].message).toBe('Message 1001')
    })

    it('should maintain FIFO order when exceeding maxEvents', () => {
      // Add exactly maxEvents + 5
      for (let i = 0; i < 1005; i++) {
        logger.info(`Message ${i}`)
      }

      const events = logger.getEvents()
      expect(events).toHaveLength(1000)

      // First event should be Message 5 (0-4 removed)
      expect(events[0].message).toBe('Message 5')
      // Last event should be Message 1004
      expect(events[999].message).toBe('Message 1004')
    })
  })

  describe('SimpleEventEmitter Implementation', () => {
    it('should support event listeners registration', () => {
      const listener = vi.fn()
      logger.on('systemEvent', listener)

      logger.info('Test message')

      expect(listener).toHaveBeenCalledOnce()
    })

    it('should support multiple listeners for same event', () => {
      const listener1 = vi.fn()
      const listener2 = vi.fn()

      logger.on('systemEvent', listener1)
      logger.on('systemEvent', listener2)

      logger.info('Test message')

      expect(listener1).toHaveBeenCalledOnce()
      expect(listener2).toHaveBeenCalledOnce()
    })

    it('should return this for method chaining', () => {
      const result = logger.on('systemEvent', vi.fn())

      expect(result).toBe(logger)
    })

    it('should handle removeAllListeners', () => {
      const listener = vi.fn()
      logger.on('systemEvent', listener)

      logger.removeAllListeners()
      logger.info('Test message')

      expect(listener).not.toHaveBeenCalled()
    })

    it('should emit events with correct arguments', () => {
      const systemEventListener = vi.fn()
      const commandLoggedListener = vi.fn()
      const resultLoggedListener = vi.fn()

      logger.on('systemEvent', systemEventListener)
      logger.on('commandLogged', commandLoggedListener)
      logger.on('resultLogged', resultLoggedListener)

      const commandEvent = logger.logCommand('test.command')
      const resultEvent = logger.logResult('INFO', 'test result')

      expect(systemEventListener).toHaveBeenCalledTimes(2)
      expect(commandLoggedListener).toHaveBeenCalledOnce()
      expect(resultLoggedListener).toHaveBeenCalledOnce()

      expect(commandLoggedListener).toHaveBeenCalledWith(commandEvent)
      expect(resultLoggedListener).toHaveBeenCalledWith(resultEvent)
    })
  })

  describe('Type System Integration', () => {
    it('should work with all SystemEventType values', () => {
      const eventTypes: SystemEventType[] = [
        'CMD',
        'GIT',
        'INFO',
        'WARN',
        'ERROR',
        'FATAL',
      ]

      eventTypes.forEach((type) => {
        if (type === 'CMD') {
          const event = logger.logCommand('test.function')
          expect(event.type).toBe(type)
        } else {
          const event = logger.logResult(type, `Test ${type} message`)
          expect(event.type).toBe(type)
        }
      })
    })

    it('should work with all SystemTerminalType values', () => {
      const terminalTypes: SystemTerminalType[] = ['system', 'timeline']

      terminalTypes.forEach((terminal) => {
        logger.info('Test message')
        // Since info() defaults to 'system', we test logResult for flexibility
        const resultEvent = logger.logResult('INFO', 'Test message', terminal)
        expect(resultEvent.terminal).toBe(terminal)
      })
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle null arguments in logCommand', () => {
      const event = logger.logCommand(
        'test.function',
        null as unknown as Record<string, unknown>
      )

      expect(event.message).toBe('test.function()')
      expect(event.context?.args).toBeNull()
    })

    it('should handle undefined functionName', () => {
      const event = logger.logCommand(undefined as unknown as string)

      expect(event.message).toBe('undefined()')
      expect(event.context?.functionName).toBeUndefined()
    })

    it('should handle empty string messages', () => {
      const event = logger.info('')

      expect(event.message).toBe('')
    })

    it('should handle very long messages', () => {
      const longMessage = 'A'.repeat(10000)
      const event = logger.info(longMessage)

      expect(event.message).toBe(longMessage)
      expect(event.message).toHaveLength(10000)
    })

    it('should handle circular reference in context', () => {
      const circular: { name: string; self?: unknown } = { name: 'test' }
      circular.self = circular

      // Should not throw error, but may stringify differently
      expect(() => {
        logger.info('Test with circular reference', { circular })
      }).not.toThrow()
    })

    it('should handle arguments with circular references', () => {
      const circular: { name: string; self?: unknown } = { name: 'test' }
      circular.self = circular

      // JSON.stringify will throw for circular references, which is expected behavior
      expect(() => {
        logger.logCommand('test.function', [circular])
      }).toThrow('Converting circular structure to JSON')
    })
  })

  describe('Integration with Default Instance', () => {
    it('should provide browserSystemLogger default instance', () => {
      expect(browserSystemLogger).toBeInstanceOf(BrowserSystemLogger)
    })

    it('should be separate from manually created instances', () => {
      const manualLogger = new BrowserSystemLogger()

      browserSystemLogger.info('Default logger message')
      manualLogger.info('Manual logger message')

      expect(browserSystemLogger.getEvents()).toHaveLength(1)
      expect(manualLogger.getEvents()).toHaveLength(1)
    })
  })

  describe('Performance and Scalability', () => {
    it('should handle rapid event creation efficiently', () => {
      const startTime = Date.now()

      // Create 1000 events rapidly
      for (let i = 0; i < 1000; i++) {
        logger.info(`Rapid event ${i}`)
      }

      const endTime = Date.now()
      const executionTime = endTime - startTime

      // Should complete within reasonable time (less than 1 second)
      expect(executionTime).toBeLessThan(1000)
      expect(logger.getEvents()).toHaveLength(1000)
    })

    it('should maintain performance with many listeners', () => {
      // Add many listeners
      for (let i = 0; i < 100; i++) {
        logger.on('systemEvent', vi.fn())
      }

      const startTime = Date.now()
      logger.info('Test message with many listeners')
      const endTime = Date.now()

      // Should still execute quickly
      expect(endTime - startTime).toBeLessThan(100)
    })
  })
})
