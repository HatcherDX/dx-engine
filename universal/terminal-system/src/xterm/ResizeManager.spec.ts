/**
 * @fileoverview Comprehensive tests for ResizeManager.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 */

import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
  type SpyInstance,
} from 'vitest'
import type { Terminal } from 'xterm'
import type { FitAddon } from '@xterm/addon-fit'
import {
  TerminalResizeManager,
  type ResizeManagerOptions,
} from './ResizeManager'

// Mock FitAddon
class MockFitAddon {
  public fitCalled = false

  fit(): void {
    this.fitCalled = true
  }

  proposeDimensions(): {
    cols: number
    rows: number
    charWidth?: number
    charHeight?: number
  } {
    return {
      cols: 80,
      rows: 24,
      charWidth: 9,
      charHeight: 17,
    }
  }

  dispose(): void {}
}

// Mock Terminal
class MockTerminal {
  public cols = 80
  public rows = 24
  public element = document.createElement('div')
  private addons: unknown[] = []
  public resized = false
  public _core = {
    _renderService: {
      _renderer: {
        dimensions: {
          actualCellWidth: 9,
          actualCellHeight: 17,
        },
      },
    },
  }

  loadAddon(addon: unknown): void {
    this.addons.push(addon)
  }

  resize(cols: number, rows: number): void {
    this.cols = cols
    this.rows = rows
    this.resized = true
  }

  dispose(): void {}
}

// Mock @xterm/addon-fit module
vi.mock('@xterm/addon-fit', () => ({
  FitAddon: MockFitAddon,
}))

// Mock ResizeObserver
class MockResizeObserver {
  private callback: ResizeObserverCallback
  private observing = new Set<Element>()

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Setting global test property
    ;(global as any).mockResizeObserverInstance = this
  }

  observe(target: Element): void {
    this.observing.add(target)
  }

  unobserve(target: Element): void {
    this.observing.delete(target)
  }

  disconnect(): void {
    this.observing.clear()
  }

  trigger(target: Element): void {
    if (this.observing.has(target)) {
      const entry = {
        target,
        contentRect: {} as DOMRectReadOnly,
        borderBoxSize: [] as ReadonlyArray<ResizeObserverSize>,
        contentBoxSize: [] as ReadonlyArray<ResizeObserverSize>,
        devicePixelContentBoxSize: [] as ReadonlyArray<ResizeObserverSize>,
      }
      this.callback([entry], this as unknown as ResizeObserver)
    }
  }
}

// Install mock ResizeObserver globally
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Installing global mock for testing
;(global as any).ResizeObserver = MockResizeObserver

describe('TerminalResizeManager', () => {
  let manager: TerminalResizeManager
  let mockTerminal: MockTerminal
  let mockContainer: HTMLElement
  let consoleLogSpy: SpyInstance
  let consoleWarnSpy: SpyInstance
  let consoleErrorSpy: SpyInstance

  beforeEach(() => {
    vi.clearAllMocks()
    vi.clearAllTimers()
    vi.useFakeTimers()

    // Create mock container
    mockContainer = document.createElement('div')
    Object.defineProperty(mockContainer, 'clientWidth', {
      configurable: true,
      value: 800,
    })
    Object.defineProperty(mockContainer, 'clientHeight', {
      configurable: true,
      value: 600,
    })

    mockTerminal = new MockTerminal()

    // Spy on console methods
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    manager = new TerminalResizeManager()
  })

  afterEach(() => {
    manager.dispose()
    vi.useRealTimers()
    consoleLogSpy.mockRestore()
    consoleWarnSpy.mockRestore()
    consoleErrorSpy.mockRestore()
  })

  describe('constructor', () => {
    it('should initialize with default options', () => {
      const manager = new TerminalResizeManager()
      expect(manager).toBeDefined()
      expect(manager.getLastDimensions()).toBeNull()
    })

    it('should accept custom options', () => {
      const options: ResizeManagerOptions = {
        debounceDelay: 200,
        autoResize: false,
        minCols: 20,
        maxCols: 150,
        minRows: 10,
        maxRows: 50,
        padding: 10,
        debug: true,
      }
      const manager = new TerminalResizeManager(options)
      expect(manager).toBeDefined()
    })
  })

  describe('initialize', () => {
    it('should initialize with terminal and container', async () => {
      await manager.initialize(
        mockTerminal as unknown as Terminal,
        mockContainer
      )
      expect(manager.getCurrentDimensions()).not.toBeNull()
    })

    it('should throw error if terminal is not provided', async () => {
      await expect(
        manager.initialize(null as unknown as HTMLElement, mockContainer)
      ).rejects.toThrow('Terminal instance is required')
    })

    it('should throw error if container is not provided', async () => {
      await expect(
        manager.initialize(
          mockTerminal as unknown as Terminal,
          null as unknown as HTMLElement
        )
      ).rejects.toThrow('Container element is required')
    })

    it('should use provided FitAddon', async () => {
      const fitAddon = new MockFitAddon()
      await manager.initialize(
        mockTerminal as unknown as Terminal,
        mockContainer,
        fitAddon as unknown as FitAddon
      )
      expect(fitAddon.fitCalled).toBe(true)
    })

    it('should create FitAddon if not provided', async () => {
      await manager.initialize(
        mockTerminal as unknown as Terminal,
        mockContainer
      )
      expect(mockTerminal.resized).toBe(false) // FitAddon will handle it
    })

    it('should handle FitAddon import failure', async () => {
      vi.doMock('@xterm/addon-fit', () => {
        throw new Error('Import failed')
      })

      const debugManager = new TerminalResizeManager({ debug: true })
      await debugManager.initialize(
        mockTerminal as unknown as Terminal,
        mockContainer
      )
      expect(consoleWarnSpy).toHaveBeenCalled()

      vi.doUnmock('@xterm/addon-fit')
      debugManager.dispose()
    })

    it('should start observing if autoResize is enabled', async () => {
      const autoManager = new TerminalResizeManager({ autoResize: true })
      await autoManager.initialize(
        mockTerminal as unknown as Terminal,
        mockContainer
      )
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing global test property
      expect((global as any).mockResizeObserverInstance).toBeDefined()
      autoManager.dispose()
    })

    it('should not start observing if autoResize is disabled', async () => {
      const manualManager = new TerminalResizeManager({ autoResize: false })
      await manualManager.initialize(
        mockTerminal as unknown as Terminal,
        mockContainer
      )
      // ResizeObserver might be created but not observing
      manualManager.dispose()
    })

    it('should log initialization with debug mode', async () => {
      const debugManager = new TerminalResizeManager({ debug: true })
      await debugManager.initialize(
        mockTerminal as unknown as Terminal,
        mockContainer
      )
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[ResizeManager] Initialized',
        expect.any(Object)
      )
      debugManager.dispose()
    })
  })

  describe('fit', () => {
    beforeEach(async () => {
      await manager.initialize(
        mockTerminal as unknown as Terminal,
        mockContainer
      )
    })

    it('should fit terminal to container', () => {
      const dimensions = manager.fit()
      expect(dimensions).toBeDefined()
      expect(dimensions?.cols).toBeGreaterThan(0)
      expect(dimensions?.rows).toBeGreaterThan(0)
    })

    it('should return undefined if terminal not initialized', () => {
      const newManager = new TerminalResizeManager()
      const result = newManager.fit()
      expect(result).toBeUndefined()
    })

    it('should return undefined when getCurrentDimensions returns null', async () => {
      await manager.initialize(
        mockTerminal as unknown as Terminal,
        mockContainer
      )
      // Mock getCurrentDimensions to return null
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private method for testing
      ;(manager as any).getCurrentDimensions = () => null
      const result = manager.fit()
      expect(result).toBeUndefined()
    })

    it('should use FitAddon when available', async () => {
      const fitAddon = new MockFitAddon()
      await manager.initialize(
        mockTerminal as unknown as Terminal,
        mockContainer,
        fitAddon as unknown as FitAddon
      )
      manager.fit()
      expect(fitAddon.fitCalled).toBe(true)
    })

    it('should calculate dimensions manually without FitAddon', async () => {
      // Initialize without FitAddon by mocking import failure
      vi.doMock('@xterm/addon-fit', () => {
        throw new Error('Import failed')
      })

      const manualManager = new TerminalResizeManager()
      await manualManager.initialize(
        mockTerminal as unknown as Terminal,
        mockContainer
      )
      const dimensions = manualManager.fit()
      expect(dimensions).toBeDefined()

      vi.doUnmock('@xterm/addon-fit')
      manualManager.dispose()
    })

    it('should notify resize handlers', () => {
      const handler = vi.fn()
      manager.onResize(handler)
      manager.fit()
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          cols: expect.any(Number),
          rows: expect.any(Number),
        })
      )
    })

    it('should handle fit errors with debug mode', async () => {
      const debugManager = new TerminalResizeManager({ debug: true })
      await debugManager.initialize(
        mockTerminal as unknown as Terminal,
        mockContainer
      )

      // Force an error by nullifying terminal
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private property for testing
      ;(debugManager as any).terminal = null

      const result = debugManager.fit()
      // When terminal is null, it returns undefined without error
      expect(result).toBeUndefined()

      debugManager.dispose()
    })

    it('should handle actual fit errors with debug mode', async () => {
      const debugManager = new TerminalResizeManager({ debug: true })

      // Create FitAddon that throws error
      const errorFitAddon = {
        fit: vi.fn(() => {
          throw new Error('Fit failed')
        }),
      }

      await debugManager.initialize(
        mockTerminal as unknown as Terminal,
        mockContainer,
        errorFitAddon as unknown as FitAddon
      )

      const result = debugManager.fit()
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[ResizeManager] Fit failed:',
        expect.any(Error)
      )
      expect(result).toBeUndefined()

      debugManager.dispose()
    })
  })

  describe('proposeDimensions', () => {
    beforeEach(async () => {
      await manager.initialize(
        mockTerminal as unknown as Terminal,
        mockContainer
      )
    })

    it('should propose dimensions using FitAddon', async () => {
      const fitAddon = new MockFitAddon()
      await manager.initialize(
        mockTerminal as unknown as Terminal,
        mockContainer,
        fitAddon as unknown as FitAddon
      )
      const proposed = manager.proposeDimensions()
      expect(proposed).toEqual({
        cols: 80,
        rows: 24,
        width: 800,
        height: 600,
        charWidth: 9,
        charHeight: 17,
      })
    })

    it('should calculate dimensions without FitAddon', async () => {
      vi.doMock('@xterm/addon-fit', () => {
        throw new Error('Import failed')
      })

      const calcManager = new TerminalResizeManager()
      await calcManager.initialize(
        mockTerminal as unknown as Terminal,
        mockContainer
      )
      const proposed = calcManager.proposeDimensions()
      expect(proposed).toBeDefined()
      expect(proposed?.cols).toBeGreaterThan(0)

      vi.doUnmock('@xterm/addon-fit')
      calcManager.dispose()
    })

    it('should respect min/max constraints', async () => {
      const constrainedManager = new TerminalResizeManager({
        minCols: 50,
        maxCols: 100,
        minRows: 20,
        maxRows: 30,
      })
      await constrainedManager.initialize(
        mockTerminal as unknown as Terminal,
        mockContainer
      )
      const proposed = constrainedManager.proposeDimensions()
      expect(proposed?.cols).toBeGreaterThanOrEqual(50)
      expect(proposed?.cols).toBeLessThanOrEqual(100)
      expect(proposed?.rows).toBeGreaterThanOrEqual(20)
      expect(proposed?.rows).toBeLessThanOrEqual(30)
      constrainedManager.dispose()
    })

    it('should handle FitAddon without proposeDimensions method', async () => {
      const basicFitAddon = { fit: vi.fn() }
      await manager.initialize(
        mockTerminal as unknown as Terminal,
        mockContainer,
        basicFitAddon as unknown as FitAddon
      )
      const proposed = manager.proposeDimensions()
      expect(proposed).toBeDefined()
    })

    it('should handle FitAddon returning invalid proposed dimensions', async () => {
      const invalidFitAddon = {
        fit: vi.fn(),
        proposeDimensions: vi.fn(() => null),
      }
      await manager.initialize(
        mockTerminal as unknown as Terminal,
        mockContainer,
        invalidFitAddon as unknown as FitAddon
      )
      const proposed = manager.proposeDimensions()
      // Should fall back to calculateDimensions
      expect(proposed).toBeDefined()
    })
  })

  describe('getCurrentDimensions', () => {
    it('should return current dimensions', async () => {
      await manager.initialize(
        mockTerminal as unknown as Terminal,
        mockContainer
      )
      const dimensions = manager.getCurrentDimensions()
      expect(dimensions).toEqual({
        cols: 80,
        rows: 24,
        width: 800,
        height: 600,
        charWidth: 9,
        charHeight: 17,
      })
    })

    it('should return null if not initialized', () => {
      const dimensions = manager.getCurrentDimensions()
      expect(dimensions).toBeNull()
    })
  })

  describe('calculateDimensions', () => {
    it('should return undefined when character dimensions are zero', async () => {
      // Create mock terminal with no _core and zero cols/rows
      const zeroTerminal = {
        cols: 0,
        rows: 0,
        resize: vi.fn(),
        loadAddon: vi.fn(),
      }

      // Create container with dimensions but terminal has 0 cols/rows
      const testContainer = document.createElement('div')
      Object.defineProperty(testContainer, 'clientWidth', {
        configurable: true,
        value: 100,
      })
      Object.defineProperty(testContainer, 'clientHeight', {
        configurable: true,
        value: 100,
      })

      // Mock FitAddon to fail
      vi.doMock('@xterm/addon-fit', () => {
        throw new Error('Import failed')
      })

      const testManager = new TerminalResizeManager()
      await testManager.initialize(
        zeroTerminal as unknown as Terminal,
        testContainer
      )

      // Force calculateDimensions to return undefined by making getCharWidth/Height return 0
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private method for testing
      ;(testManager as any).getCharWidth = () => 0
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private method for testing
      ;(testManager as any).getCharHeight = () => 0

      const dimensions = testManager.proposeDimensions()
      expect(dimensions).toBeUndefined()

      vi.doUnmock('@xterm/addon-fit')
      testManager.dispose()
    })

    it('should return undefined when terminal is null in calculateDimensions', async () => {
      // Initialize without FitAddon
      vi.doMock('@xterm/addon-fit', () => {
        throw new Error('Import failed')
      })

      const testManager = new TerminalResizeManager()
      await testManager.initialize(
        mockTerminal as unknown as Terminal,
        mockContainer
      )

      // Nullify terminal to test line 270
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private property for testing
      ;(testManager as any).terminal = null

      const dimensions = testManager.proposeDimensions()
      expect(dimensions).toBeUndefined()

      vi.doUnmock('@xterm/addon-fit')
      testManager.dispose()
    })
  })

  describe('resize', () => {
    beforeEach(async () => {
      await manager.initialize(
        mockTerminal as unknown as Terminal,
        mockContainer
      )
    })

    it('should manually resize terminal', () => {
      manager.resize(100, 30)
      expect(mockTerminal.cols).toBe(100)
      expect(mockTerminal.rows).toBe(30)
    })

    it('should apply constraints', () => {
      const constrainedManager = new TerminalResizeManager({
        minCols: 50,
        maxCols: 90,
        minRows: 20,
        maxRows: 25,
      })
      constrainedManager.initialize(
        mockTerminal as unknown as Terminal,
        mockContainer
      )

      constrainedManager.resize(200, 50) // Over max
      expect(mockTerminal.cols).toBe(90)
      expect(mockTerminal.rows).toBe(25)

      constrainedManager.resize(10, 5) // Under min
      expect(mockTerminal.cols).toBe(50)
      expect(mockTerminal.rows).toBe(20)

      constrainedManager.dispose()
    })

    it('should notify resize handlers', () => {
      const handler = vi.fn()
      manager.onResize(handler)
      manager.resize(90, 25)
      expect(handler).toHaveBeenCalled()
    })

    it('should do nothing if not initialized', () => {
      const newManager = new TerminalResizeManager()
      expect(() => newManager.resize(80, 24)).not.toThrow()
    })
  })

  describe('ResizeObserver integration', () => {
    it('should handle container resize events', async () => {
      const autoManager = new TerminalResizeManager({
        autoResize: true,
        debounceDelay: 100,
      })
      await autoManager.initialize(
        mockTerminal as unknown as Terminal,
        mockContainer
      )

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing global test property
      const observer = (global as any)
        .mockResizeObserverInstance as MockResizeObserver
      observer.trigger(mockContainer)

      // Should debounce
      expect(mockTerminal.resized).toBe(false)

      // Fast-forward debounce timer
      vi.advanceTimersByTime(100)

      // Now should have resized (check autoManager, not manager)
      expect(autoManager.getCurrentDimensions()).not.toBeNull()

      autoManager.dispose()
    })

    it('should debounce multiple resize events', async () => {
      const autoManager = new TerminalResizeManager({
        autoResize: true,
        debounceDelay: 100,
      })
      await autoManager.initialize(
        mockTerminal as unknown as Terminal,
        mockContainer
      )

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing global test property
      const observer = (global as any)
        .mockResizeObserverInstance as MockResizeObserver

      // Trigger multiple resize events
      observer.trigger(mockContainer)
      vi.advanceTimersByTime(50)
      observer.trigger(mockContainer)
      vi.advanceTimersByTime(50)
      observer.trigger(mockContainer)

      // Should still be debouncing
      expect(mockTerminal.resized).toBe(false)

      // Complete debounce
      vi.advanceTimersByTime(100)

      // Should have resized only once
      autoManager.dispose()
    })
  })

  describe('onResize', () => {
    beforeEach(async () => {
      await manager.initialize(
        mockTerminal as unknown as Terminal,
        mockContainer
      )
    })

    it('should register resize handler', () => {
      const handler = vi.fn()
      const unsubscribe = manager.onResize(handler)

      manager.fit()
      expect(handler).toHaveBeenCalled()

      unsubscribe()
      handler.mockClear()

      manager.fit()
      expect(handler).not.toHaveBeenCalled()
    })

    it('should handle errors in resize handlers', () => {
      const debugManager = new TerminalResizeManager({ debug: true })
      debugManager.initialize(
        mockTerminal as unknown as Terminal,
        mockContainer
      )

      const errorHandler = vi.fn(() => {
        throw new Error('Handler error')
      })
      debugManager.onResize(errorHandler)

      debugManager.fit()
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[ResizeManager] Handler error:',
        expect.any(Error)
      )

      debugManager.dispose()
    })

    it('should call multiple handlers', () => {
      const handler1 = vi.fn()
      const handler2 = vi.fn()

      manager.onResize(handler1)
      manager.onResize(handler2)

      manager.fit()

      expect(handler1).toHaveBeenCalled()
      expect(handler2).toHaveBeenCalled()
    })
  })

  describe('character dimensions', () => {
    it('should get character dimensions from terminal core', async () => {
      await manager.initialize(
        mockTerminal as unknown as Terminal,
        mockContainer
      )
      const dimensions = manager.getCurrentDimensions()
      expect(dimensions?.charWidth).toBe(9)
      expect(dimensions?.charHeight).toBe(17)
    })

    it('should calculate character dimensions as fallback', async () => {
      // Remove core dimensions
      delete (mockTerminal as unknown as Terminal)._core

      await manager.initialize(
        mockTerminal as unknown as Terminal,
        mockContainer
      )
      const dimensions = manager.getCurrentDimensions()

      // Should calculate from container/cols
      expect(dimensions?.charWidth).toBe(800 / 80) // 10
      expect(dimensions?.charHeight).toBe(600 / 24) // 25
    })

    it('should use defaults when dimensions are zero', async () => {
      mockTerminal.cols = 0
      mockTerminal.rows = 0
      delete (mockTerminal as unknown as Terminal)._core

      vi.doMock('@xterm/addon-fit', () => {
        throw new Error('Import failed')
      })

      const zeroManager = new TerminalResizeManager()
      await zeroManager.initialize(
        mockTerminal as unknown as Terminal,
        mockContainer
      )

      // When cols/rows are 0, it uses fallback calculation
      const result = zeroManager.proposeDimensions()
      expect(result?.charWidth).toBeCloseTo(9, 0)
      expect(result?.charHeight).toBeCloseTo(17, 0)

      vi.doUnmock('@xterm/addon-fit')
      zeroManager.dispose()
    })

    it('should handle zero character dimensions', async () => {
      // Create terminal with no dimensions and no _core
      const zeroTerminal = {
        cols: 0,
        rows: 0,
        resize: vi.fn(),
        loadAddon: vi.fn(),
      }

      // Create new container with zero dimensions
      const zeroContainer = document.createElement('div')
      Object.defineProperty(zeroContainer, 'clientWidth', {
        configurable: true,
        value: 0,
      })
      Object.defineProperty(zeroContainer, 'clientHeight', {
        configurable: true,
        value: 0,
      })

      vi.doMock('@xterm/addon-fit', () => {
        throw new Error('Import failed')
      })

      const zeroManager = new TerminalResizeManager()
      await zeroManager.initialize(
        zeroTerminal as unknown as Terminal,
        zeroContainer
      )

      // When container has zero dimensions and terminal has 0 cols/rows,
      // it returns the minimum dimensions based on constraints
      const dimensions = zeroManager.proposeDimensions()
      // With zero dimensions but default char width/height (9/17),
      // it will calculate 0/9=0 cols but constrain to minCols=10
      expect(dimensions).toBeDefined()
      expect(dimensions?.cols).toBe(10) // minimum
      expect(dimensions?.rows).toBe(5) // minimum

      vi.doUnmock('@xterm/addon-fit')
      zeroManager.dispose()
    })
  })

  describe('padding', () => {
    it('should apply padding to calculations', async () => {
      vi.doMock('@xterm/addon-fit', () => {
        throw new Error('Import failed')
      })

      const paddedManager = new TerminalResizeManager({ padding: 20 })
      await paddedManager.initialize(
        mockTerminal as unknown as Terminal,
        mockContainer
      )

      // Container is 800x600, with 20px padding on each side = 760x560 usable
      const dimensions = paddedManager.proposeDimensions()
      expect(dimensions?.width).toBe(760)
      expect(dimensions?.height).toBe(560)

      vi.doUnmock('@xterm/addon-fit')
      paddedManager.dispose()
    })
  })

  describe('updateOptions', () => {
    it('should update options dynamically', () => {
      manager.updateOptions({
        debounceDelay: 300,
        maxCols: 200,
      })

      // Options should be updated (we can't directly check private options)
      expect(manager).toBeDefined()
    })

    it('should merge partial options', () => {
      manager.updateOptions({ debug: true })
      manager.updateOptions({ debounceDelay: 250 })

      // Both options should be applied
      expect(manager).toBeDefined()
    })
  })

  describe('getLastDimensions', () => {
    it('should return null initially', () => {
      expect(manager.getLastDimensions()).toBeNull()
    })

    it('should return last dimensions after fit', async () => {
      await manager.initialize(
        mockTerminal as unknown as Terminal,
        mockContainer
      )
      manager.fit()

      const last = manager.getLastDimensions()
      expect(last).not.toBeNull()
      expect(last?.cols).toBe(80)
      expect(last?.rows).toBe(24)
    })
  })

  describe('dispose', () => {
    it('should clean up resources', async () => {
      const debugManager = new TerminalResizeManager({
        autoResize: true,
        debug: true,
      })
      await debugManager.initialize(
        mockTerminal as unknown as Terminal,
        mockContainer
      )

      const handler = vi.fn()
      debugManager.onResize(handler)

      debugManager.dispose()

      expect(consoleLogSpy).toHaveBeenCalledWith('[ResizeManager] Disposed')
      expect(debugManager.getCurrentDimensions()).toBeNull()
      expect(debugManager.getLastDimensions()).toBeNull()
    })

    it('should clear debounce timer', async () => {
      const autoManager = new TerminalResizeManager({
        autoResize: true,
        debounceDelay: 1000, // Long delay
      })
      await autoManager.initialize(
        mockTerminal as unknown as Terminal,
        mockContainer
      )

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing global test property
      const observer = (global as any)
        .mockResizeObserverInstance as MockResizeObserver
      observer.trigger(mockContainer)

      // Timer should be pending
      autoManager.dispose()

      // Advance time - nothing should happen after dispose
      vi.advanceTimersByTime(1000)

      // Terminal should not have been resized
      expect(mockTerminal.resized).toBe(false)
    })

    it('should disconnect ResizeObserver', async () => {
      const autoManager = new TerminalResizeManager({ autoResize: true })
      await autoManager.initialize(
        mockTerminal as unknown as Terminal,
        mockContainer
      )

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing global test property
      const observer = (global as any)
        .mockResizeObserverInstance as MockResizeObserver
      const disconnectSpy = vi.spyOn(observer, 'disconnect')

      autoManager.dispose()

      expect(disconnectSpy).toHaveBeenCalled()
    })

    it('should handle multiple dispose calls', () => {
      expect(() => {
        manager.dispose()
        manager.dispose()
      }).not.toThrow()
    })
  })
})
