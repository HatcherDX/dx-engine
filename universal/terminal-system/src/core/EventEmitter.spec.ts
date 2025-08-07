import { describe, it, expect, vi, beforeEach } from 'vitest'
import { EventEmitter } from './EventEmitter'

interface TestEvents {
  test: [string, number]
  simple: []
  error: [Error]
}

describe('EventEmitter', () => {
  let emitter: EventEmitter<TestEvents>

  beforeEach(() => {
    emitter = new EventEmitter<TestEvents>()
  })

  describe('on', () => {
    it('should add event listener', () => {
      const listener = vi.fn()
      emitter.on('test', listener)

      expect(emitter.listenerCount('test')).toBe(1)
    })

    it('should allow multiple listeners for same event', () => {
      const listener1 = vi.fn()
      const listener2 = vi.fn()

      emitter.on('test', listener1)
      emitter.on('test', listener2)

      expect(emitter.listenerCount('test')).toBe(2)
    })
  })

  describe('emit', () => {
    it('should call all listeners with correct arguments', () => {
      const listener1 = vi.fn()
      const listener2 = vi.fn()

      emitter.on('test', listener1)
      emitter.on('test', listener2)

      emitter.emit('test', 'hello', 42)

      expect(listener1).toHaveBeenCalledWith('hello', 42)
      expect(listener2).toHaveBeenCalledWith('hello', 42)
    })

    it('should not throw if no listeners', () => {
      expect(() => {
        emitter.emit('test', 'hello', 42)
      }).not.toThrow()
    })

    it('should handle listener errors gracefully', () => {
      const errorListener = vi.fn(() => {
        throw new Error('Listener error')
      })
      const normalListener = vi.fn()

      emitter.on('test', errorListener)
      emitter.on('test', normalListener)

      // Should not throw and should still call other listeners
      expect(() => {
        emitter.emit('test', 'hello', 42)
      }).not.toThrow()

      expect(errorListener).toHaveBeenCalled()
      expect(normalListener).toHaveBeenCalled()
    })
  })

  describe('once', () => {
    it('should call listener only once', () => {
      const listener = vi.fn()
      emitter.once('test', listener)

      emitter.emit('test', 'hello', 42)
      emitter.emit('test', 'world', 24)

      expect(listener).toHaveBeenCalledTimes(1)
      expect(listener).toHaveBeenCalledWith('hello', 42)
    })

    it('should remove listener after first call', () => {
      const listener = vi.fn()
      emitter.once('test', listener)

      expect(emitter.listenerCount('test')).toBe(1)

      emitter.emit('test', 'hello', 42)

      expect(emitter.listenerCount('test')).toBe(0)
    })
  })

  describe('off', () => {
    it('should remove specific listener', () => {
      const listener1 = vi.fn()
      const listener2 = vi.fn()

      emitter.on('test', listener1)
      emitter.on('test', listener2)

      emitter.off('test', listener1)

      expect(emitter.listenerCount('test')).toBe(1)

      emitter.emit('test', 'hello', 42)

      expect(listener1).not.toHaveBeenCalled()
      expect(listener2).toHaveBeenCalled()
    })

    it('should handle removing non-existent listener', () => {
      const listener = vi.fn()

      expect(() => {
        emitter.off('test', listener)
      }).not.toThrow()
    })
  })

  describe('removeAllListeners', () => {
    it('should remove all listeners for specific event', () => {
      const listener1 = vi.fn()
      const listener2 = vi.fn()

      emitter.on('test', listener1)
      emitter.on('simple', listener2)

      emitter.removeAllListeners('test')

      expect(emitter.listenerCount('test')).toBe(0)
      expect(emitter.listenerCount('simple')).toBe(1)
    })

    it('should remove all listeners for all events', () => {
      const listener1 = vi.fn()
      const listener2 = vi.fn()

      emitter.on('test', listener1)
      emitter.on('simple', listener2)

      emitter.removeAllListeners()

      expect(emitter.listenerCount('test')).toBe(0)
      expect(emitter.listenerCount('simple')).toBe(0)
    })
  })

  describe('listenerCount', () => {
    it('should return 0 for event with no listeners', () => {
      expect(emitter.listenerCount('test')).toBe(0)
    })

    it('should return correct count', () => {
      const listener1 = vi.fn()
      const listener2 = vi.fn()

      emitter.on('test', listener1)
      emitter.on('test', listener2)

      expect(emitter.listenerCount('test')).toBe(2)
    })
  })
})
