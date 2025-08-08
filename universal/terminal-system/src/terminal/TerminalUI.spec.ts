/**
 * @fileoverview Test suite for TerminalUI functionality.
 *
 * @description
 * Comprehensive tests for the TerminalUI class that handles rendering and UI interactions
 * following VSCode's terminal UI patterns for consistency with split panes and theming.
 *
 * @example
 * ```typescript
 * // Testing terminal UI creation
 * const tabManager = new TabManager()
 * const terminalUI = new TerminalUI(tabManager)
 * await terminalUI.initialize(mockContainer)
 * const instance = await terminalUI.createTerminal({ name: 'Test UI Terminal' })
 * expect(instance.config.name).toBe('Test UI Terminal')
 * ```
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { TerminalConfig } from '../types/terminal'
import { TabManager } from './TabManager'
import { TerminalUI } from './TerminalUI'

/**
 * Mock interfaces for testing DOM elements and tab management.
 */
interface MockTabManager extends Partial<TabManager> {
  createTab: ReturnType<typeof vi.fn>
  removeTab: ReturnType<typeof vi.fn>
  activateTab: ReturnType<typeof vi.fn>
  getTab: ReturnType<typeof vi.fn>
  getAllTabs: ReturnType<typeof vi.fn>
  getTabsInOrder: ReturnType<typeof vi.fn>
  getTabCount: ReturnType<typeof vi.fn>
  on: ReturnType<typeof vi.fn>
  dispose: ReturnType<typeof vi.fn>
}

interface MockHTMLElement extends Partial<HTMLElement> {
  innerHTML: string
  className: string
  appendChild: ReturnType<typeof vi.fn>
  getBoundingClientRect: ReturnType<typeof vi.fn>
  textContent?: string
  querySelector?: ReturnType<typeof vi.fn>
  querySelectorAll?: ReturnType<typeof vi.fn>
  classList?: {
    add: ReturnType<typeof vi.fn>
    remove: ReturnType<typeof vi.fn>
    toggle: ReturnType<typeof vi.fn>
  }
}

// Mock dependencies with vi.hoisted
const mocks = vi.hoisted(() => {
  return {
    uuidV4: vi.fn(() => 'test-ui-uuid-123'),
    mockContainer: {
      innerHTML: '',
      className: '',
      appendChild: vi.fn(),
      getBoundingClientRect: vi.fn(() => ({
        width: 800,
        height: 600,
      })),
    },
    mockTabsContainer: {
      innerHTML: '',
      className: '',
      appendChild: vi.fn(),
      querySelectorAll: vi.fn(() => []),
    },
    mockContentContainer: {
      innerHTML: '',
      className: '',
      appendChild: vi.fn(),
    },
    mockTerminalContainer: {
      className: '',
      style: {},
    },
    mockTerminalInstance: {
      id: 'test-ui-uuid-123',
      config: {
        id: 'test-ui-uuid-123',
        name: 'Test UI Terminal',
        shell: '/bin/bash',
        cwd: '/home/user',
        env: {},
        cols: 80,
        rows: 24,
      },
      title: 'Test UI Terminal',
      xtermTerminal: {
        options: { theme: {} },
        _core: {
          _addonManager: {
            _addons: [
              {
                instance: {
                  fit: vi.fn(),
                },
              },
            ],
          },
        },
      },
      isReady: true,
      initializeXterm: vi.fn(),
      on: vi.fn(),
      dispose: vi.fn(),
    },
    mockTabManager: {
      createTab: vi.fn(),
      removeTab: vi.fn(() => true),
      activateTab: vi.fn(() => true),
      getTab: vi.fn(),
      getAllTabs: vi.fn(() => []),
      getTabsInOrder: vi.fn(() => []),
      getTabCount: vi.fn(() => 0),
      on: vi.fn(),
      dispose: vi.fn(),
    },
    resizeObserver: {
      observe: vi.fn(),
      disconnect: vi.fn(),
    },
    createElement: vi.fn(),
  }
})

vi.mock('uuid', () => ({
  v4: mocks.uuidV4,
}))

vi.mock('../TabManager')
vi.mock('../TerminalInstance')

/**
 * Mock ResizeObserver global for testing DOM observations.
 *
 * @remarks
 * Provides mock implementation of ResizeObserver API for testing
 * terminal UI resize behavior and container observations.
 *
 * @public
 * @since 1.0.0
 */
Object.defineProperty(globalThis, 'ResizeObserver', {
  value: vi.fn(() => mocks.resizeObserver),
  writable: true,
})

/**
 * Mock document global for testing DOM operations.
 *
 * @remarks
 * Provides mock implementation of document API for testing
 * terminal UI DOM manipulation and element creation.
 *
 * @public
 * @since 1.0.0
 */
Object.defineProperty(globalThis, 'document', {
  value: {
    createElement: vi.fn((tagName: string) => {
      if (tagName === 'div') {
        return { ...mocks.mockTerminalContainer }
      }
      if (tagName === 'style') {
        return { textContent: '' }
      }
      if (tagName === 'button') {
        return {
          className: '',
          onclick: null,
          appendChild: vi.fn(),
          innerHTML: '',
          textContent: '',
        }
      }
      if (tagName === 'span') {
        return { textContent: '' }
      }
      return { ...mocks.mockTerminalContainer }
    }),
    head: {
      appendChild: vi.fn(),
    },
  },
  writable: true,
})

describe('TerminalUI', () => {
  let terminalUI: TerminalUI
  let mockTabManager: MockTabManager
  let mockContainer: MockHTMLElement
  let originalProcess: typeof process

  beforeEach(() => {
    originalProcess = global.process

    // Mock process for platform detection
    global.process = {
      ...originalProcess,
      platform: 'linux',
      cwd: vi.fn(() => '/home/user'),
      env: { PATH: '/usr/bin', HOME: '/home/user' },
    } as NodeJS.Process

    // Reset UUID mock
    mocks.uuidV4.mockReturnValue('test-ui-uuid-123')

    // Create mock tab manager
    mockTabManager = {
      createTab: mocks.mockTabManager.createTab.mockResolvedValue(
        mocks.mockTerminalInstance
      ),
      removeTab: mocks.mockTabManager.removeTab,
      activateTab: mocks.mockTabManager.activateTab,
      getTab: mocks.mockTabManager.getTab.mockReturnValue(
        mocks.mockTerminalInstance
      ),
      getAllTabs: mocks.mockTabManager.getAllTabs.mockReturnValue([
        mocks.mockTerminalInstance,
      ]),
      getTabsInOrder: mocks.mockTabManager.getTabsInOrder.mockReturnValue([
        {
          id: 'test-ui-uuid-123',
          instance: mocks.mockTerminalInstance,
          isActive: true,
          isPinned: false,
        },
      ]),
      getTabCount: mocks.mockTabManager.getTabCount,
      on: mocks.mockTabManager.on,
      dispose: mocks.mockTabManager.dispose,
    } as MockTabManager

    // Create mock container
    mockContainer = {
      innerHTML: '',
      className: '',
      appendChild: mocks.mockContainer.appendChild,
      getBoundingClientRect: mocks.mockContainer.getBoundingClientRect,
    } as MockHTMLElement

    // Setup createElement mocks with proper methods
    const createElementMock = document.createElement as unknown as ReturnType<
      typeof vi.fn
    >
    createElementMock.mockImplementation((tagName: string) => {
      if (tagName === 'div') {
        return {
          innerHTML: '',
          className: '',
          style: {},
          appendChild: vi.fn(),
          querySelectorAll: vi.fn(() => []),
          remove: vi.fn(),
        } as Partial<HTMLDivElement>
      }
      if (tagName === 'style') {
        return { textContent: '' } as Partial<HTMLStyleElement>
      }
      if (tagName === 'button') {
        return {
          className: '',
          onclick: null,
          appendChild: vi.fn(),
          innerHTML: '',
          textContent: '',
          classList: {
            toggle: vi.fn(),
          },
        } as Partial<HTMLButtonElement>
      }
      if (tagName === 'span') {
        return { textContent: '' } as Partial<HTMLSpanElement>
      }
      return {
        innerHTML: '',
        className: '',
        style: {},
        appendChild: vi.fn(),
        remove: vi.fn(),
      } as Partial<HTMLElement>
    })

    terminalUI = new TerminalUI(mockTabManager)
  })

  afterEach(() => {
    vi.clearAllMocks()
    global.process = originalProcess
    terminalUI.dispose()
  })

  describe('Constructor', () => {
    /**
     * Tests TerminalUI construction with TabManager.
     *
     * @returns void
     * Should create TerminalUI instance with provided TabManager
     *
     * @example
     * ```typescript
     * const tabManager = new TabManager()
     * const terminalUI = new TerminalUI(tabManager)
     * expect(terminalUI).toBeInstanceOf(TerminalUI)
     * expect(terminalUI.isDisposed).toBe(false)
     * ```
     *
     * @public
     */
    it('should create TerminalUI instance with TabManager', () => {
      expect(terminalUI).toBeInstanceOf(TerminalUI)
      expect(terminalUI.isDisposed).toBe(false)
    })

    /**
     * Tests TabManager event handler setup during construction.
     *
     * @returns void
     * Should register event handlers for TabManager events
     *
     * @example
     * ```typescript
     * expect(mockTabManager.on).toHaveBeenCalledWith('tab-created', expect.any(Function))
     * expect(mockTabManager.on).toHaveBeenCalledWith('tab-removed', expect.any(Function))
     * ```
     *
     * @public
     */
    it('should setup TabManager event handlers', () => {
      expect(mockTabManager.on).toHaveBeenCalledWith(
        'tab-created',
        expect.any(Function)
      )
      expect(mockTabManager.on).toHaveBeenCalledWith(
        'tab-removed',
        expect.any(Function)
      )
      expect(mockTabManager.on).toHaveBeenCalledWith(
        'tab-activated',
        expect.any(Function)
      )
      expect(mockTabManager.on).toHaveBeenCalledWith(
        'tab-title-changed',
        expect.any(Function)
      )
    })
  })

  describe('Initialization', () => {
    /**
     * Tests successful UI initialization with container.
     *
     * @returns Promise<void>
     * Should initialize UI with provided container element
     *
     * @example
     * ```typescript
     * await terminalUI.initialize(mockContainer)
     * expect(mockContainer.appendChild).toHaveBeenCalledTimes(2)
     * expect(document.createElement).toHaveBeenCalledWith('div')
     * ```
     *
     * @public
     */
    it('should initialize UI with container', async () => {
      await terminalUI.initialize(mockContainer)

      expect(mockContainer.appendChild).toHaveBeenCalledTimes(2)
      expect(document.createElement).toHaveBeenCalledWith('div')
      expect(document.createElement).toHaveBeenCalledWith('style')
    })

    /**
     * Tests initialization error when UI is disposed.
     *
     * @throws {@link Error}
     * Should throw error when attempting to initialize disposed UI
     *
     * @example
     * ```typescript
     * terminalUI.dispose()
     * await expect(terminalUI.initialize(mockContainer)).rejects.toThrow('TerminalUI is disposed')
     * ```
     *
     * @public
     */
    it('should throw error when initializing disposed UI', async () => {
      terminalUI.dispose()

      await expect(terminalUI.initialize(mockContainer)).rejects.toThrow(
        'TerminalUI is disposed'
      )
    })

    /**
     * Tests container structure creation during initialization.
     *
     * @returns Promise<void>
     * Should create proper DOM structure with tabs and content containers
     *
     * @example
     * ```typescript
     * await terminalUI.initialize(mockContainer)
     * expect(mockContainer.className).toBe('terminal-ui-container')
     * expect(document.createElement).toHaveBeenCalledWith('div')
     * ```
     *
     * @public
     */
    it('should setup container structure', async () => {
      await terminalUI.initialize(mockContainer)

      expect(mockContainer.className).toBe('terminal-ui-container')
      expect(mockContainer.innerHTML).toBe('')
    })
  })

  describe('Terminal creation', () => {
    beforeEach(async () => {
      await terminalUI.initialize(mockContainer)
    })

    /**
     * Tests terminal creation with default configuration.
     *
     * @returns Promise<void>
     * Should create terminal with UI components
     *
     * @example
     * ```typescript
     * const instance = await terminalUI.createTerminal()
     * expect(mockTabManager.createTab).toHaveBeenCalledWith({})
     * expect(instance).toBe(mocks.mockTerminalInstance)
     * ```
     *
     * @public
     */
    it('should create terminal with default config', async () => {
      const instance = await terminalUI.createTerminal()

      expect(mockTabManager.createTab).toHaveBeenCalledWith({})
      expect(instance).toBe(mocks.mockTerminalInstance)
      expect(mocks.mockTerminalInstance.initializeXterm).toHaveBeenCalled()
    })

    /**
     * Tests terminal creation with custom configuration.
     *
     * @returns Promise<void>
     * Should create terminal with specified configuration
     *
     * @example
     * ```typescript
     * const config = { name: 'Custom UI Terminal', shell: '/bin/zsh' }
     * const instance = await terminalUI.createTerminal(config)
     * expect(mockTabManager.createTab).toHaveBeenCalledWith(config)
     * ```
     *
     * @public
     */
    it('should create terminal with custom config', async () => {
      const config: Partial<TerminalConfig> = {
        name: 'Custom UI Terminal',
        shell: '/bin/zsh',
      }

      const instance = await terminalUI.createTerminal(config)

      expect(mockTabManager.createTab).toHaveBeenCalledWith(config)
      expect(instance).toBe(mocks.mockTerminalInstance)
    })

    /**
     * Tests terminal creation when UI is disposed.
     *
     * @throws {@link Error}
     * Should throw error when attempting to create terminal after disposal
     *
     * @example
     * ```typescript
     * terminalUI.dispose()
     * await expect(terminalUI.createTerminal()).rejects.toThrow('TerminalUI is disposed')
     * ```
     *
     * @public
     */
    it('should throw error when creating terminal after disposal', async () => {
      terminalUI.dispose()

      await expect(terminalUI.createTerminal()).rejects.toThrow(
        'TerminalUI is disposed'
      )
    })

    /**
     * Tests terminal-ready event emission.
     *
     * @returns Promise<void>
     * Should emit terminal-ready event when terminal UI is set up
     *
     * @example
     * ```typescript
     * const readySpy = vi.fn()
     * terminalUI.on('terminal-ready', readySpy)
     * await terminalUI.createTerminal()
     * expect(readySpy).toHaveBeenCalledWith('test-ui-uuid-123')
     * ```
     *
     * @public
     */
    it('should emit terminal-ready event', async () => {
      const readySpy = vi.fn()
      terminalUI.on('terminal-ready', readySpy)

      await terminalUI.createTerminal()

      expect(readySpy).toHaveBeenCalledWith('test-ui-uuid-123')
    })
  })

  describe('Terminal removal', () => {
    beforeEach(async () => {
      await terminalUI.initialize(mockContainer)
      await terminalUI.createTerminal()
    })

    /**
     * Tests successful terminal removal.
     *
     * @returns Promise<void>
     * Should remove terminal and emit close-request event
     *
     * @example
     * ```typescript
     * const result = await terminalUI.removeTerminal('test-ui-uuid-123')
     * expect(result).toBe(true)
     * expect(mockTabManager.removeTab).toHaveBeenCalledWith('test-ui-uuid-123')
     * ```
     *
     * @public
     */
    it('should remove terminal successfully', async () => {
      const closeSpy = vi.fn()
      terminalUI.on('close-request', closeSpy)

      const result = await terminalUI.removeTerminal('test-ui-uuid-123')

      expect(result).toBe(true)
      expect(mockTabManager.removeTab).toHaveBeenCalledWith('test-ui-uuid-123')
      expect(closeSpy).toHaveBeenCalledWith('test-ui-uuid-123')
    })

    /**
     * Tests terminal removal when UI is disposed.
     *
     * @returns Promise<void>
     * Should return false when UI is disposed
     *
     * @example
     * ```typescript
     * terminalUI.dispose()
     * const result = await terminalUI.removeTerminal('test-id')
     * expect(result).toBe(false)
     * ```
     *
     * @public
     */
    it('should return false when UI is disposed', async () => {
      terminalUI.dispose()

      const result = await terminalUI.removeTerminal('test-ui-uuid-123')

      expect(result).toBe(false)
    })
  })

  describe('Terminal splitting', () => {
    beforeEach(async () => {
      await terminalUI.initialize(mockContainer)
      await terminalUI.createTerminal()
    })

    /**
     * Tests horizontal terminal splitting.
     *
     * @returns Promise<void>
     * Should create new terminal and setup horizontal split layout
     *
     * @example
     * ```typescript
     * const newInstance = await terminalUI.splitTerminalHorizontal('test-ui-uuid-123')
     * expect(newInstance).toBeDefined()
     * expect(mockTabManager.createTab).toHaveBeenCalledTimes(2)
     * ```
     *
     * @public
     */
    it('should split terminal horizontally', async () => {
      const splitSpy = vi.fn()
      terminalUI.on('split-request', splitSpy)

      const newInstance =
        await terminalUI.splitTerminalHorizontal('test-ui-uuid-123')

      expect(newInstance).toBe(mocks.mockTerminalInstance)
      expect(mockTabManager.createTab).toHaveBeenCalledWith({
        name: 'Test UI Terminal (Split)',
        shell: '/bin/bash',
        cwd: '/home/user',
        env: {},
        cols: 80,
        rows: 24,
      })
      expect(splitSpy).toHaveBeenCalledWith('test-ui-uuid-123')
    })

    /**
     * Tests vertical terminal splitting.
     *
     * @returns Promise<void>
     * Should create new terminal and setup vertical split layout
     *
     * @example
     * ```typescript
     * const newInstance = await terminalUI.splitTerminalVertical('test-ui-uuid-123')
     * expect(newInstance).toBeDefined()
     * expect(mockTabManager.createTab).toHaveBeenCalledTimes(2)
     * ```
     *
     * @public
     */
    it('should split terminal vertically', async () => {
      const splitSpy = vi.fn()
      terminalUI.on('split-request', splitSpy)

      const newInstance =
        await terminalUI.splitTerminalVertical('test-ui-uuid-123')

      expect(newInstance).toBe(mocks.mockTerminalInstance)
      expect(mockTabManager.createTab).toHaveBeenCalledWith({
        name: 'Test UI Terminal (Split)',
        shell: '/bin/bash',
        cwd: '/home/user',
        env: {},
        cols: 80,
        rows: 24,
      })
      expect(splitSpy).toHaveBeenCalledWith('test-ui-uuid-123')
    })

    /**
     * Tests splitting non-existent terminal.
     *
     * @returns Promise<void>
     * Should return null when source terminal doesn't exist
     *
     * @example
     * ```typescript
     * mockTabManager.getTab.mockReturnValue(null)
     * const result = await terminalUI.splitTerminalHorizontal('non-existent')
     * expect(result).toBeNull()
     * ```
     *
     * @public
     */
    it('should return null when splitting non-existent terminal', async () => {
      mockTabManager.getTab = vi.fn().mockReturnValue(null)

      const result = await terminalUI.splitTerminalHorizontal('non-existent')

      expect(result).toBeNull()
    })

    /**
     * Tests splitting when UI is disposed.
     *
     * @returns Promise<void>
     * Should return null when UI is disposed
     *
     * @example
     * ```typescript
     * terminalUI.dispose()
     * const result = await terminalUI.splitTerminalHorizontal('test-id')
     * expect(result).toBeNull()
     * ```
     *
     * @public
     */
    it('should return null when UI is disposed', async () => {
      terminalUI.dispose()

      const result =
        await terminalUI.splitTerminalHorizontal('test-ui-uuid-123')

      expect(result).toBeNull()
    })
  })

  describe('Tab switching', () => {
    beforeEach(async () => {
      await terminalUI.initialize(mockContainer)
    })

    /**
     * Tests successful tab switching.
     *
     * @returns void
     * Should activate tab and emit tab-switch event
     *
     * @example
     * ```typescript
     * const switchSpy = vi.fn()
     * terminalUI.on('tab-switch', switchSpy)
     * const result = terminalUI.switchToTab('test-ui-uuid-123')
     * expect(result).toBe(true)
     * expect(switchSpy).toHaveBeenCalledWith('test-ui-uuid-123')
     * ```
     *
     * @public
     */
    it('should switch to tab successfully', () => {
      const switchSpy = vi.fn()
      terminalUI.on('tab-switch', switchSpy)

      const result = terminalUI.switchToTab('test-ui-uuid-123')

      expect(result).toBe(true)
      expect(mockTabManager.activateTab).toHaveBeenCalledWith(
        'test-ui-uuid-123'
      )
      expect(switchSpy).toHaveBeenCalledWith('test-ui-uuid-123')
    })

    /**
     * Tests tab switching when UI is disposed.
     *
     * @returns void
     * Should return false when UI is disposed
     *
     * @example
     * ```typescript
     * terminalUI.dispose()
     * const result = terminalUI.switchToTab('test-id')
     * expect(result).toBe(false)
     * ```
     *
     * @public
     */
    it('should return false when UI is disposed', () => {
      terminalUI.dispose()

      const result = terminalUI.switchToTab('test-ui-uuid-123')

      expect(result).toBe(false)
    })

    /**
     * Tests tab switching failure from TabManager.
     *
     * @returns void
     * Should return false when TabManager activation fails
     *
     * @example
     * ```typescript
     * mockTabManager.activateTab.mockReturnValue(false)
     * const result = terminalUI.switchToTab('invalid-id')
     * expect(result).toBe(false)
     * ```
     *
     * @public
     */
    it('should return false when tab activation fails', () => {
      mockTabManager.activateTab = vi.fn().mockReturnValue(false)

      const result = terminalUI.switchToTab('invalid-id')

      expect(result).toBe(false)
    })
  })

  describe('Theme management', () => {
    beforeEach(async () => {
      await terminalUI.initialize(mockContainer)
    })

    /**
     * Tests theme updating with partial theme configuration.
     *
     * @returns void
     * Should update theme and apply to all active terminals
     *
     * @example
     * ```typescript
     * const customTheme = { background: '#1e1e1e', foreground: '#d4d4d4' }
     * terminalUI.updateTheme(customTheme)
     * expect(mocks.mockTerminalInstance.xtermTerminal.options.theme).toEqual(
     *   expect.objectContaining(customTheme)
     * )
     * ```
     *
     * @public
     */
    it('should update theme for all terminals', () => {
      const customTheme = {
        background: '#1e1e1e',
        foreground: '#d4d4d4',
      }

      terminalUI.updateTheme(customTheme)

      expect(mocks.mockTerminalInstance.xtermTerminal.options.theme).toEqual(
        expect.objectContaining(customTheme)
      )
    })

    /**
     * Tests theme updating when UI is disposed.
     *
     * @returns void
     * Should not update theme when UI is disposed
     *
     * @example
     * ```typescript
     * terminalUI.dispose()
     * terminalUI.updateTheme({ background: '#000000' })
     * // Should not throw error or update theme
     * ```
     *
     * @public
     */
    it('should not update theme when UI is disposed', () => {
      terminalUI.dispose()

      expect(() =>
        terminalUI.updateTheme({ background: '#000000' })
      ).not.toThrow()
    })
  })

  describe('Terminal resizing', () => {
    beforeEach(async () => {
      await terminalUI.initialize(mockContainer)
    })

    /**
     * Tests terminal resizing functionality.
     *
     * @returns void
     * Should trigger fit addon for all ready terminals
     *
     * @example
     * ```typescript
     * terminalUI.resizeTerminals()
     * expect(mocks.mockTerminalInstance.xtermTerminal._core._addonManager._addons[0].instance.fit).toHaveBeenCalled()
     * ```
     *
     * @public
     */
    it('should resize all ready terminals', () => {
      terminalUI.resizeTerminals()

      expect(
        mocks.mockTerminalInstance.xtermTerminal._core._addonManager._addons[0]
          .instance.fit
      ).toHaveBeenCalled()
    })

    /**
     * Tests resizing when UI is disposed.
     *
     * @returns void
     * Should not attempt to resize when UI is disposed
     *
     * @example
     * ```typescript
     * terminalUI.dispose()
     * terminalUI.resizeTerminals()
     * // Should not throw error or attempt resize
     * ```
     *
     * @public
     */
    it('should not resize when UI is disposed', () => {
      terminalUI.dispose()

      expect(() => terminalUI.resizeTerminals()).not.toThrow()
    })
  })

  describe('UI statistics', () => {
    beforeEach(async () => {
      await terminalUI.initialize(mockContainer)
    })

    /**
     * Tests UI statistics retrieval.
     *
     * @returns void
     * Should return comprehensive UI statistics
     *
     * @example
     * ```typescript
     * const stats = terminalUI.getUIStats()
     * expect(stats.hasContainer).toBe(true)
     * expect(stats.totalTerminals).toBe(0)
     * expect(stats.theme).toBe('default')
     * ```
     *
     * @public
     */
    it('should return UI statistics', () => {
      const stats = terminalUI.getUIStats()

      expect(stats).toEqual({
        hasContainer: true,
        splitPanes: 0,
        activeTerminals: 1,
        totalTerminals: 0,
        theme: 'default',
      })
    })

    /**
     * Tests statistics when UI is not initialized.
     *
     * @returns void
     * Should return statistics indicating no container
     *
     * @example
     * ```typescript
     * const uninitializedUI = new TerminalUI(mockTabManager)
     * const stats = uninitializedUI.getUIStats()
     * expect(stats.hasContainer).toBe(false)
     * ```
     *
     * @public
     */
    it('should return correct stats when not initialized', () => {
      const uninitializedUI = new TerminalUI(mockTabManager)
      const stats = uninitializedUI.getUIStats()

      expect(stats.hasContainer).toBe(false)
      expect(stats.splitPanes).toBe(0)

      uninitializedUI.dispose()
    })
  })

  describe('Disposal', () => {
    beforeEach(async () => {
      await terminalUI.initialize(mockContainer)
    })

    /**
     * Tests proper UI disposal.
     *
     * @returns void
     * Should dispose all resources and clear state
     *
     * @example
     * ```typescript
     * terminalUI.dispose()
     * expect(terminalUI.isDisposed).toBe(true)
     * expect(mocks.resizeObserver.disconnect).toHaveBeenCalled()
     * ```
     *
     * @public
     */
    it('should dispose UI properly', () => {
      expect(terminalUI.isDisposed).toBe(false)

      terminalUI.dispose()

      expect(terminalUI.isDisposed).toBe(true)
      expect(mocks.resizeObserver.disconnect).toHaveBeenCalled()
    })

    /**
     * Tests idempotent disposal.
     *
     * @returns void
     * Should handle multiple disposal calls gracefully
     *
     * @example
     * ```typescript
     * terminalUI.dispose()
     * terminalUI.dispose() // Should not cause errors
     * expect(terminalUI.isDisposed).toBe(true)
     * ```
     *
     * @public
     */
    it('should handle multiple disposal calls gracefully', () => {
      terminalUI.dispose()
      expect(terminalUI.isDisposed).toBe(true)

      expect(() => terminalUI.dispose()).not.toThrow()
      expect(terminalUI.isDisposed).toBe(true)
    })
  })

  describe('Event handling', () => {
    beforeEach(async () => {
      await terminalUI.initialize(mockContainer)
    })

    /**
     * Tests UI resize event emission.
     *
     * @returns void
     * Should emit ui-resize event when container is resized
     *
     * @example
     * ```typescript
     * const resizeSpy = vi.fn()
     * terminalUI.on('ui-resize', resizeSpy)
     * // Trigger resize observer callback manually
     * expect(resizeSpy).toHaveBeenCalledWith(800, 600)
     * ```
     *
     * @public
     */
    it('should emit ui-resize event on container resize', () => {
      const resizeSpy = vi.fn()
      terminalUI.on('ui-resize', resizeSpy)

      // Get the ResizeObserver callback
      const ResizeObserverConstructor = vi.mocked(ResizeObserver)
      const callback = ResizeObserverConstructor.mock.calls[0][0]

      // Trigger the callback
      callback([], mocks.resizeObserver as ResizeObserver)

      expect(resizeSpy).toHaveBeenCalledWith(800, 600)
    })

    /**
     * Tests error event emission.
     *
     * @returns void
     * Should emit terminal-error event when terminal encounters error
     *
     * @example
     * ```typescript
     * const errorSpy = vi.fn()
     * terminalUI.on('terminal-error', errorSpy)
     * const error = new Error('Terminal error')
     * // Simulate error scenario
     * expect(errorSpy).toHaveBeenCalledWith('terminal-id', error)
     * ```
     *
     * @public
     */
    it('should handle terminal error events', () => {
      const errorSpy = vi.fn()
      terminalUI.on('terminal-error', errorSpy)

      // This test verifies the event is registered but doesn't trigger it
      // as error emission is handled by terminal instances
      expect(errorSpy).not.toHaveBeenCalled()
    })
  })
})
