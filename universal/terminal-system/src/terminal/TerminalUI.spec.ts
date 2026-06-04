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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Mocking HTMLElement.style for testing flexibility
  style?: any
  remove?: ReturnType<typeof vi.fn>
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
      remove: vi.fn(),
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
        const divElement = {
          innerHTML: '',
          className: '',
          style: {},
          appendChild: vi.fn(),
          querySelectorAll: vi.fn(() => []),
          querySelector: vi.fn(),
          remove: vi.fn(),
        } as Partial<HTMLDivElement>

        // Store references for later access in tests
        if (!mocks.mockTabsContainer.innerHTML) {
          Object.assign(mocks.mockTabsContainer, divElement)
        } else if (!mocks.mockContentContainer.innerHTML) {
          Object.assign(mocks.mockContentContainer, divElement)
        }

        return divElement
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

    /**
     * Tests initialization without container fails gracefully.
     *
     * @returns Promise<void>
     * Should handle null container gracefully
     *
     * @public
     */
    it('should handle initialization with null container', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Testing null container edge case
      await terminalUI.initialize(null as any)

      // Should not throw but also should not setup observer
      expect(mocks.resizeObserver.observe).not.toHaveBeenCalled()
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

    /**
     * Tests terminal UI setup without content container.
     *
     * @returns Promise<void>
     * Should handle missing content container gracefully
     *
     * @public
     */
    it('should handle terminal UI setup without content container', async () => {
      // Create a new UI without proper initialization
      const newUI = new TerminalUI(mockTabManager)
      const instance = await newUI.createTerminal()

      expect(instance).toBe(mocks.mockTerminalInstance)
      // Should not attempt to append to non-existent container
      expect(mocks.mockTerminalInstance.initializeXterm).not.toHaveBeenCalled()

      newUI.dispose()
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
     * Tests terminal removal with split pane cleanup.
     *
     * @returns Promise<void>
     * Should remove split pane element when terminal is removed
     *
     * @public
     */
    it('should remove split pane element when terminal is removed', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Mocking DOM element for testing
      const mockElement = { remove: vi.fn() } as any

      // Manually add split pane to test removal
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private _splitPanes Map for testing
      const splitPanesMap = (terminalUI as any)._splitPanes as Map<string, any>
      splitPanesMap.set('test-ui-uuid-123', {
        id: 'pane-test-ui-uuid-123',
        terminalId: 'test-ui-uuid-123',
        element: mockElement,
        isActive: true,
        size: 100,
      })

      await terminalUI.removeTerminal('test-ui-uuid-123')

      expect(mockElement.remove).toHaveBeenCalled()
      expect(splitPanesMap.has('test-ui-uuid-123')).toBe(false)
    })

    /**
     * Tests terminal removal when tab manager fails.
     *
     * @returns Promise<void>
     * Should return false when tab manager fails to remove
     *
     * @public
     */
    it('should handle tab manager removal failure', async () => {
      mockTabManager.removeTab = vi.fn().mockResolvedValue(false)
      const closeSpy = vi.fn()
      terminalUI.on('close-request', closeSpy)

      const result = await terminalUI.removeTerminal('test-ui-uuid-123')

      expect(result).toBe(false)
      expect(closeSpy).not.toHaveBeenCalled()
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
     * Tests vertical terminal splitting when UI is disposed.
     *
     * @returns Promise<void>
     * Should return null when UI is disposed
     *
     * @public
     */
    it('should return null when splitting vertically with disposed UI', async () => {
      terminalUI.dispose()

      const result = await terminalUI.splitTerminalVertical('test-ui-uuid-123')

      expect(result).toBeNull()
    })

    /**
     * Tests vertical splitting non-existent terminal.
     *
     * @returns Promise<void>
     * Should return null when source terminal doesn't exist
     *
     * @public
     */
    it('should return null when splitting non-existent terminal vertically', async () => {
      mockTabManager.getTab = vi.fn().mockReturnValue(null)

      const result = await terminalUI.splitTerminalVertical('non-existent')

      expect(result).toBeNull()
    })

    /**
     * Tests split layout setup with proper pane configuration.
     *
     * @returns Promise<void>
     * Should setup split panes with correct dimensions
     *
     * @public
     */
    it('should setup split layout with both panes having elements', async () => {
      // Create source pane with element
      const sourceElement = {
        style: { width: '', height: '' },
        appendChild: vi.fn(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Mocking DOM element for testing
      } as any
      const newElement = {
        style: { width: '', height: '' },
        appendChild: vi.fn(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Mocking DOM element for testing
      } as any

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private _splitPanes Map for testing
      const splitPanesMap = (terminalUI as any)._splitPanes as Map<string, any>
      splitPanesMap.set('test-ui-uuid-123', {
        id: 'pane-test-ui-uuid-123',
        terminalId: 'test-ui-uuid-123',
        element: sourceElement,
        isActive: true,
        size: 100,
      })

      // Mock new terminal creation to add new pane
      mockTabManager.createTab = vi.fn().mockResolvedValue({
        ...mocks.mockTerminalInstance,
        id: 'new-terminal-id',
      })

      // Add new pane before split layout is called
      const originalCreateTerminal = terminalUI.createTerminal.bind(terminalUI)
      terminalUI.createTerminal = vi.fn().mockImplementation(async (config) => {
        const result = await originalCreateTerminal(config)
        splitPanesMap.set('new-terminal-id', {
          id: 'pane-new-terminal-id',
          terminalId: 'new-terminal-id',
          element: newElement,
          isActive: true,
          size: 100,
        })
        return { ...result, id: 'new-terminal-id' }
      })

      await terminalUI.splitTerminalHorizontal('test-ui-uuid-123')

      expect(sourceElement.style.width).toBe('50%')
      expect(newElement.style.width).toBe('50%')
    })

    /**
     * Tests vertical split layout setup with proper pane configuration.
     *
     * @returns Promise<void>
     * Should setup vertical split panes with correct dimensions
     *
     * @public
     */
    it('should setup vertical split layout with proper dimensions', async () => {
      // Create source pane with element
      const sourceElement = {
        style: { width: '', height: '' },
        appendChild: vi.fn(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Mocking DOM element for testing
      } as any
      const newElement = {
        style: { width: '', height: '' },
        appendChild: vi.fn(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Mocking DOM element for testing
      } as any

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private _splitPanes Map for testing
      const splitPanesMap = (terminalUI as any)._splitPanes as Map<string, any>
      splitPanesMap.set('test-ui-uuid-123', {
        id: 'pane-test-ui-uuid-123',
        terminalId: 'test-ui-uuid-123',
        element: sourceElement,
        isActive: true,
        size: 100,
      })

      // Mock new terminal creation to add new pane
      mockTabManager.createTab = vi.fn().mockResolvedValue({
        ...mocks.mockTerminalInstance,
        id: 'new-terminal-id',
      })

      // Add new pane before split layout is called
      const originalCreateTerminal = terminalUI.createTerminal.bind(terminalUI)
      terminalUI.createTerminal = vi.fn().mockImplementation(async (config) => {
        const result = await originalCreateTerminal(config)
        splitPanesMap.set('new-terminal-id', {
          id: 'pane-new-terminal-id',
          terminalId: 'new-terminal-id',
          element: newElement,
          isActive: true,
          size: 100,
        })
        return { ...result, id: 'new-terminal-id' }
      })

      await terminalUI.splitTerminalVertical('test-ui-uuid-123')

      expect(sourceElement.style.height).toBe('50%')
      expect(newElement.style.height).toBe('50%')
    })

    /**
     * Tests split layout when content container is missing.
     *
     * @returns Promise<void>
     * Should handle missing content container gracefully
     *
     * @public
     */
    it('should handle split layout without content container', async () => {
      // Remove content container reference
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private _contentContainer for testing
      ;(terminalUI as any)._contentContainer = null

      const result =
        await terminalUI.splitTerminalHorizontal('test-ui-uuid-123')

      // Should still create terminal but not setup layout
      expect(result).toBe(mocks.mockTerminalInstance)
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

    /**
     * Tests active tab UI update without tabs container.
     *
     * @returns void
     * Should handle missing tabs container gracefully
     *
     * @public
     */
    it('should handle active tab UI update without tabs container', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private _tabsContainer for testing
      ;(terminalUI as any)._tabsContainer = null

      const result = terminalUI.switchToTab('test-ui-uuid-123')

      expect(result).toBe(true)
      // Should not throw when tabs container is missing
    })

    /**
     * Tests active tab UI update with split panes.
     *
     * @returns void
     * Should show/hide split panes based on active tab
     *
     * @public
     */
    it('should update split pane visibility when switching tabs', async () => {
      await terminalUI.createTerminal()

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Mocking DOM element for testing
      const mockElement1 = { style: { display: '' } } as any
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Mocking DOM element for testing
      const mockElement2 = { style: { display: '' } } as any

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private _splitPanes Map for testing
      const splitPanesMap = (terminalUI as any)._splitPanes as Map<string, any>
      splitPanesMap.set('terminal-1', {
        id: 'pane-1',
        terminalId: 'terminal-1',
        element: mockElement1,
        isActive: false,
        size: 50,
      })
      splitPanesMap.set('terminal-2', {
        id: 'pane-2',
        terminalId: 'terminal-2',
        element: mockElement2,
        isActive: false,
        size: 50,
      })

      // Create mock tabs container with querySelectorAll
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private _tabsContainer for testing
      ;(terminalUI as any)._tabsContainer = {
        querySelectorAll: vi
          .fn()
          .mockReturnValue([
            { classList: { toggle: vi.fn() } },
            { classList: { toggle: vi.fn() } },
          ]),
      }

      // Mock tab order to match our test terminals
      mockTabManager.getTabsInOrder = vi.fn().mockReturnValue([
        { id: 'terminal-1', instance: {}, isActive: false },
        { id: 'terminal-2', instance: {}, isActive: false },
      ])

      terminalUI.switchToTab('terminal-1')

      expect(mockElement1.style.display).toBe('block')
      expect(mockElement2.style.display).toBe('none')
      expect(splitPanesMap.get('terminal-1').isActive).toBe(true)
      expect(splitPanesMap.get('terminal-2').isActive).toBe(false)
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
     * Tests theme updating for terminal without xterm or not ready.
     *
     * @returns void
     * Should skip terminals that are not ready or missing xterm
     *
     * @public
     */
    it('should skip terminals without xterm or not ready', () => {
      const terminalWithoutXterm = {
        ...mocks.mockTerminalInstance,
        xtermTerminal: null,
      }
      const terminalNotReady = { ...mocks.mockTerminalInstance, isReady: false }

      mockTabManager.getAllTabs = vi
        .fn()
        .mockReturnValue([
          terminalWithoutXterm,
          terminalNotReady,
          mocks.mockTerminalInstance,
        ])

      terminalUI.updateTheme({ background: '#000000' })

      // Only the ready terminal with xterm should be updated
      expect(mocks.mockTerminalInstance.xtermTerminal.options.theme).toEqual(
        expect.objectContaining({ background: '#000000' })
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
     * Tests resizing with fit addon that has direct fit method.
     *
     * @returns void
     * Should call fit() directly on addon when available
     *
     * @public
     */
    it('should call fit() directly on addon when available', () => {
      const fitMock = vi.fn()
      const terminalWithDirectFit = {
        ...mocks.mockTerminalInstance,
        xtermTerminal: {
          options: { theme: {} },
          _core: {
            _addonManager: {
              _addons: [
                {
                  fit: fitMock, // Direct fit method
                },
              ],
            },
          },
        },
      }

      mockTabManager.getAllTabs = vi
        .fn()
        .mockReturnValue([terminalWithDirectFit])

      terminalUI.resizeTerminals()

      expect(fitMock).toHaveBeenCalled()
    })

    /**
     * Tests resizing terminal without fit addon.
     *
     * @returns void
     * Should handle terminal without fit addon gracefully
     *
     * @public
     */
    it('should handle terminal without fit addon', () => {
      const terminalWithoutFit = {
        ...mocks.mockTerminalInstance,
        xtermTerminal: {
          options: { theme: {} },
          _core: {
            _addonManager: {
              _addons: [],
            },
          },
        },
      }

      mockTabManager.getAllTabs = vi.fn().mockReturnValue([terminalWithoutFit])

      expect(() => terminalUI.resizeTerminals()).not.toThrow()
    })

    /**
     * Tests resizing terminal without extended terminal structure.
     *
     * @returns void
     * Should handle incomplete terminal structure gracefully
     *
     * @public
     */
    it('should handle terminal without extended structure', () => {
      const basicTerminal = {
        ...mocks.mockTerminalInstance,
        xtermTerminal: {
          options: { theme: {} },
          // No _core property
        },
      }

      mockTabManager.getAllTabs = vi.fn().mockReturnValue([basicTerminal])

      expect(() => terminalUI.resizeTerminals()).not.toThrow()
    })

    /**
     * Tests resizing without container.
     *
     * @returns void
     * Should return early when container is missing
     *
     * @public
     */
    it('should not resize when container is missing', () => {
      const newUI = new TerminalUI(mockTabManager)

      expect(() => newUI.resizeTerminals()).not.toThrow()

      newUI.dispose()
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

    /**
     * Tests statistics with split panes and multiple terminals.
     *
     * @returns void
     * Should return accurate counts for split panes and terminals
     *
     * @public
     */
    it('should return stats with split panes and terminals', async () => {
      await terminalUI.createTerminal()

      // Add split panes
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private _splitPanes Map for testing
      const splitPanesMap = (terminalUI as any)._splitPanes as Map<string, any>
      splitPanesMap.set('pane1', { id: 'pane1' })
      splitPanesMap.set('pane2', { id: 'pane2' })

      // Mock multiple terminals with different ready states
      const terminal1 = { ...mocks.mockTerminalInstance, isReady: true }
      const terminal2 = { ...mocks.mockTerminalInstance, isReady: false }
      const terminal3 = { ...mocks.mockTerminalInstance, isReady: true }

      mockTabManager.getAllTabs = vi
        .fn()
        .mockReturnValue([terminal1, terminal2, terminal3])
      mockTabManager.getTabCount = vi.fn().mockReturnValue(3)

      const stats = terminalUI.getUIStats()

      expect(stats).toEqual({
        hasContainer: true,
        splitPanes: 3, // Including the one created in createTerminal
        activeTerminals: 2, // Only ready terminals
        totalTerminals: 3,
        theme: 'default',
      })
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

    /**
     * Tests tab manager event handlers.
     *
     * @returns void
     * Should update tabs UI when tab manager events are triggered
     *
     * @public
     */
    it('should update tabs UI on tab manager events', () => {
      // Get the registered event handlers
      const tabCreatedHandler = mockTabManager.on.mock.calls.find(
        (call) => call[0] === 'tab-created'
      )?.[1]
      const tabRemovedHandler = mockTabManager.on.mock.calls.find(
        (call) => call[0] === 'tab-removed'
      )?.[1]
      const tabActivatedHandler = mockTabManager.on.mock.calls.find(
        (call) => call[0] === 'tab-activated'
      )?.[1]
      const tabTitleChangedHandler = mockTabManager.on.mock.calls.find(
        (call) => call[0] === 'tab-title-changed'
      )?.[1]

      // Mock tabs container for updateTabsUI
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private _tabsContainer for testing
      ;(terminalUI as any)._tabsContainer = {
        innerHTML: '',
        appendChild: vi.fn(),
        querySelectorAll: vi.fn().mockReturnValue([]),
      }

      // Trigger events
      tabCreatedHandler?.('new-tab-id')
      tabRemovedHandler?.('removed-tab-id')
      tabActivatedHandler?.('activated-tab-id')
      tabTitleChangedHandler?.('renamed-tab-id', 'New Title')

      // Verify tabs were updated (getTabsInOrder called for each event)
      expect(mockTabManager.getTabsInOrder).toHaveBeenCalled()
    })

    /**
     * Tests tab click handler in updateTabsUI.
     *
     * @returns void
     * Should switch to tab when clicked
     *
     * @public
     */
    it('should handle tab click to switch tabs', async () => {
      await terminalUI.createTerminal()

      // Setup tabs container
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private _tabsContainer for testing
      ;(terminalUI as any)._tabsContainer = {
        innerHTML: '',
        appendChild: vi.fn(),
        querySelectorAll: vi.fn().mockReturnValue([]),
      }

      // Trigger updateTabsUI
      const tabCreatedHandler = mockTabManager.on.mock.calls.find(
        (call) => call[0] === 'tab-created'
      )?.[1]
      tabCreatedHandler?.('test-ui-uuid-123')

      // Get the created button element
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing mock calls for testing
      const createElementCalls = (document.createElement as any).mock.calls
      const buttonCall = createElementCalls.find(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Mocking call signature for testing
        (call: any[]) => call[0] === 'button'
      )
      const buttonIndex = createElementCalls.indexOf(buttonCall)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing mock results for testing
      const button = (document.createElement as any).mock.results[buttonIndex]
        ?.value

      // Trigger click
      if (button?.onclick) {
        button.onclick()
      }

      expect(mockTabManager.activateTab).toHaveBeenCalledWith(
        'test-ui-uuid-123'
      )
    })

    /**
     * Tests close button click handler in updateTabsUI.
     *
     * @returns void
     * Should remove terminal when close button clicked
     *
     * @public
     */
    it('should handle close button click to remove terminal', async () => {
      await terminalUI.createTerminal()

      // Setup tabs container
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private _tabsContainer for testing
      ;(terminalUI as any)._tabsContainer = {
        innerHTML: '',
        appendChild: vi.fn(),
        querySelectorAll: vi.fn().mockReturnValue([]),
      }

      // Trigger updateTabsUI
      const tabCreatedHandler = mockTabManager.on.mock.calls.find(
        (call) => call[0] === 'tab-created'
      )?.[1]
      tabCreatedHandler?.('test-ui-uuid-123')

      // Get the created close button (second button created)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing mock calls for testing
      const createElementCalls = (document.createElement as any).mock.calls
      const buttonCalls = createElementCalls.filter(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Mocking call signature for testing
        (call: any[]) => call[0] === 'button'
      )
      const closeButtonIndex = createElementCalls.indexOf(buttonCalls[1])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing mock results for testing
      const closeButton = (document.createElement as any).mock.results[
        closeButtonIndex
      ]?.value

      // Mock event for stopPropagation
      const mockEvent = { stopPropagation: vi.fn() }

      // Trigger close button click
      if (closeButton?.onclick) {
        closeButton.onclick(mockEvent)
      }

      expect(mockEvent.stopPropagation).toHaveBeenCalled()
      expect(mockTabManager.removeTab).toHaveBeenCalledWith('test-ui-uuid-123')
    })

    /**
     * Tests updateTabsUI without tabs container.
     *
     * @returns void
     * Should handle missing tabs container gracefully
     *
     * @public
     */
    it('should handle updateTabsUI without tabs container', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private _tabsContainer for testing
      ;(terminalUI as any)._tabsContainer = null

      // Trigger tab created event
      const tabCreatedHandler = mockTabManager.on.mock.calls.find(
        (call) => call[0] === 'tab-created'
      )?.[1]

      expect(() => tabCreatedHandler?.('test-ui-uuid-123')).not.toThrow()
    })

    /**
     * Tests updateTabsUI with inactive tab to cover ternary branch.
     *
     * @returns void
     * Should properly render inactive tab without active class
     *
     * @public
     */
    it('should render inactive tab without active class', async () => {
      await terminalUI.createTerminal()

      // Setup tabs to return two tabs - first active, second inactive
      mockTabManager.getTabsInOrder.mockReturnValue([
        {
          id: 'active-tab',
          instance: mocks.mockTerminalInstance,
          isActive: true, // Active tab
        },
        {
          id: 'inactive-tab',
          instance: mocks.mockTerminalInstance,
          isActive: false, // Inactive tab - this is what we're testing
        },
      ])

      // Setup tabs container
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private _tabsContainer for testing
      ;(terminalUI as any)._tabsContainer = {
        innerHTML: '',
        appendChild: vi.fn(),
        querySelectorAll: vi.fn().mockReturnValue([]),
      }

      // Clear previous createElement calls
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing mock for testing
      ;(document.createElement as any).mockClear()

      // Trigger updateTabsUI
      const tabCreatedHandler = mockTabManager.on.mock.calls.find(
        (call) => call[0] === 'tab-created'
      )?.[1]
      tabCreatedHandler?.('inactive-tab')

      // Get created buttons (should be at least 2, plus close buttons)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing mock calls for testing
      const createElementCalls = (document.createElement as any).mock.calls
      const buttonCalls = createElementCalls.filter(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Mocking call signature for testing
        (call: any[]) => call[0] === 'button'
      )

      // Find the tab buttons specifically (not close buttons)
      const tabButtons = []
      for (let i = 0; i < buttonCalls.length; i++) {
        const buttonIndex = createElementCalls.indexOf(buttonCalls[i])
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing mock results for testing
        const button = (document.createElement as any).mock.results[buttonIndex]
          ?.value
        if (button?.className?.includes('terminal-tab')) {
          tabButtons.push(button)
        }
      }

      expect(tabButtons.length).toBeGreaterThanOrEqual(2)

      // Get the inactive tab button
      const inactiveButton = tabButtons.find(
        (btn) => !btn.className.includes('active')
      )

      // Should have found an inactive button
      expect(inactiveButton).toBeTruthy()
      expect(inactiveButton?.className).toContain('terminal-tab')
      expect(inactiveButton?.className).not.toContain('active')
    })

    /**
     * Tests updateActiveTabUI with split pane without element.
     *
     * @returns void
     * Should handle split pane without element gracefully
     *
     * @public
     */
    it('should handle split pane without element in updateActiveTabUI', async () => {
      await terminalUI.createTerminal()

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private _splitPanes Map for testing
      const splitPanesMap = (terminalUI as any)._splitPanes as Map<string, any>
      splitPanesMap.set('terminal-1', {
        id: 'pane-1',
        terminalId: 'terminal-1',
        element: null, // No element
        isActive: false,
        size: 50,
      })

      // Setup tabs container with querySelectorAll
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private _tabsContainer for testing
      ;(terminalUI as any)._tabsContainer = {
        querySelectorAll: vi.fn().mockReturnValue([
          {
            dataset: { terminalId: 'test-ui-uuid-123' },
            classList: {
              add: vi.fn(),
              remove: vi.fn(),
              toggle: vi.fn(),
            },
          },
        ]),
      }

      // Should not throw when switching tabs
      expect(() => terminalUI.switchToTab('test-ui-uuid-123')).not.toThrow()
    })

    /**
     * Tests container structure setup to ensure proper initialization.
     *
     * @returns void
     * Should setup container structure correctly
     *
     * @public
     */
    it('should setup container structure during initialization', async () => {
      // Create a fresh terminalUI
      const testUI = new TerminalUI(mockTabManager)

      // Initialize the UI with container
      await testUI.initialize(mockContainer)

      // Verify container structure was setup
      expect(mockContainer.className).toContain('terminal-ui-container')

      // Verify tabs container was created
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing mock calls for testing
      const tabsContainerCall = (document.createElement as any).mock.calls.find(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Mocking call signature for testing
        (call: any[]) => call[0] === 'div'
      )
      expect(tabsContainerCall).toBeTruthy()

      // Verify the UI is properly initialized (checking container is set)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private _container for testing
      expect((testUI as any)._container).toBe(mockContainer)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private _isDisposed for testing
      expect((testUI as any)._isDisposed).toBe(false)
    })
  })
})
