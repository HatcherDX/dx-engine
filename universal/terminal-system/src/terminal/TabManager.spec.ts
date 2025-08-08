/**
 * @fileoverview Test suite for TabManager functionality.
 *
 * @description
 * Comprehensive tests for the TabManager class that manages multiple terminal tabs
 * following VSCode's TabManager pattern for multi-terminal support.
 *
 * @example
 * ```typescript
 * // Testing tab creation
 * const tabManager = new TabManager()
 * const instance = await tabManager.createTab({ name: 'Test Terminal' })
 * expect(instance.config.name).toBe('Test Terminal')
 * ```
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest'
import { TabManager } from './TabManager'
import { TerminalInstance } from './TerminalInstance'
import type { TerminalConfig } from '../types/terminal'

// Mock dependencies
vi.mock('./TerminalInstance', () => ({
  TerminalInstance: vi.fn(),
}))
vi.mock('uuid', () => ({
  v4: vi.fn(() => 'test-tab-id-123'),
}))

/**
 * Mock TerminalInstance interface for testing tab operations.
 *
 * @remarks
 * Simulates the TerminalInstance interface with configuration,
 * lifecycle methods, and event handling for comprehensive testing.
 *
 * @public
 * @since 1.0.0
 */
interface MockTerminalInstance extends Partial<TerminalInstance> {
  id: string
  config: TerminalConfig
  title: string
  on: ReturnType<typeof vi.fn>
  dispose: ReturnType<typeof vi.fn>
  write: ReturnType<typeof vi.fn>
  resize: ReturnType<typeof vi.fn>
  focus: ReturnType<typeof vi.fn>
  blur: ReturnType<typeof vi.fn>
}

describe('TabManager', () => {
  let tabManager: TabManager
  let mockTerminalInstance: MockTerminalInstance
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

    // Create mock terminal instance
    mockTerminalInstance = {
      id: 'test-tab-id-123',
      config: {
        id: 'test-tab-id-123',
        name: 'Test Terminal',
        shell: '/bin/bash',
        cwd: '/home/user',
        env: {},
        cols: 80,
        rows: 24,
      },
      title: 'Test Terminal',
      on: vi.fn(),
      dispose: vi.fn(),
      write: vi.fn(),
      resize: vi.fn(),
      focus: vi.fn(),
      blur: vi.fn(),
    }

    // Mock TerminalInstance constructor
    vi.mocked(TerminalInstance).mockImplementation(
      () => mockTerminalInstance as TerminalInstance
    )

    tabManager = new TabManager()
  })

  afterEach(async () => {
    vi.clearAllMocks()
    global.process = originalProcess
    await tabManager.dispose()
  })

  describe('Tab creation', () => {
    /**
     * Tests tab creation with default configuration.
     *
     * @returns Promise<void>
     * Should create a terminal tab with auto-generated name and platform-appropriate shell
     *
     * @example
     * ```typescript
     * const instance = await tabManager.createTab()
     * expect(instance.config.name).toBe('Terminal 1')
     * expect(instance.config.shell).toBe('/bin/bash')
     * ```
     *
     * @public
     */
    it('should create a tab with default configuration', async () => {
      const instance = await tabManager.createTab()

      expect(TerminalInstance).toHaveBeenCalledWith({
        id: 'test-tab-id-123',
        name: 'Terminal 1',
        shell: '/bin/bash',
        cwd: '/home/user',
        env: expect.objectContaining({
          PATH: '/usr/bin',
          HOME: '/home/user',
        }),
        cols: 80,
        rows: 24,
      })

      expect(instance).toBe(mockTerminalInstance)
    })

    /**
     * Tests tab creation with custom configuration.
     *
     * @returns Promise<void>
     * Should create a terminal tab with specified configuration options
     *
     * @example
     * ```typescript
     * const config = { name: 'Custom Terminal', shell: '/bin/zsh', cols: 120, rows: 40 }
     * const instance = await tabManager.createTab(config)
     * expect(instance.config.name).toBe('Custom Terminal')
     * ```
     *
     * @public
     */
    it('should create a tab with custom configuration', async () => {
      const customConfig: Partial<TerminalConfig> = {
        name: 'Custom Terminal',
        shell: '/bin/zsh',
        cwd: '/custom/path',
        env: { CUSTOM_VAR: 'value' },
        cols: 120,
        rows: 40,
      }

      await tabManager.createTab(customConfig)

      expect(TerminalInstance).toHaveBeenCalledWith({
        id: 'test-tab-id-123',
        name: 'Custom Terminal',
        shell: '/bin/zsh',
        cwd: '/custom/path',
        env: expect.objectContaining({
          PATH: '/usr/bin',
          HOME: '/home/user',
          CUSTOM_VAR: 'value',
        }),
        cols: 120,
        rows: 40,
      })
    })

    /**
     * Tests platform-specific shell selection.
     *
     * @param platform - The platform to test
     * @param expectedShell - The expected default shell for the platform
     * @returns Promise<void>
     * Should select appropriate shell based on operating system
     *
     * @example
     * ```typescript
     * global.process.platform = 'win32'
     * const instance = await tabManager.createTab()
     * expect(instance.config.shell).toBe('cmd.exe')
     * ```
     *
     * @public
     */
    it.each([
      ['win32', 'cmd.exe'],
      ['linux', '/bin/bash'],
      ['darwin', '/bin/bash'],
    ])(
      'should use correct default shell for platform %s',
      async (platform, expectedShell) => {
        global.process.platform = platform as NodeJS.Platform

        await tabManager.createTab()

        expect(TerminalInstance).toHaveBeenCalledWith(
          expect.objectContaining({
            shell: expectedShell,
          })
        )
      }
    )

    /**
     * Tests that first tab is automatically activated.
     *
     * @returns Promise<void>
     * Should set the first created tab as active
     *
     * @example
     * ```typescript
     * const eventSpy = vi.fn()
     * tabManager.on('tab-activated', eventSpy)
     * await tabManager.createTab()
     * expect(eventSpy).toHaveBeenCalledWith('test-tab-id-123')
     * ```
     *
     * @public
     */
    it('should activate the first tab automatically', async () => {
      const activatedSpy = vi.fn()
      tabManager.on('tab-activated', activatedSpy)

      await tabManager.createTab()

      expect(activatedSpy).toHaveBeenCalledWith('test-tab-id-123')
      expect(tabManager.getActiveTabId()).toBe('test-tab-id-123')
    })

    /**
     * Tests tab creation event emission.
     *
     * @returns Promise<void>
     * Should emit tab-created event when new tab is created
     *
     * @example
     * ```typescript
     * const createdSpy = vi.fn()
     * tabManager.on('tab-created', createdSpy)
     * const instance = await tabManager.createTab()
     * expect(createdSpy).toHaveBeenCalledWith(instance)
     * ```
     *
     * @public
     */
    it('should emit tab-created event', async () => {
      const createdSpy = vi.fn()
      tabManager.on('tab-created', createdSpy)

      const instance = await tabManager.createTab()

      expect(createdSpy).toHaveBeenCalledWith(instance)
    })

    /**
     * Tests error handling when TabManager is disposed.
     *
     * @throws {@link Error}
     * Should throw error when attempting to create tab after disposal
     *
     * @example
     * ```typescript
     * await tabManager.dispose()
     * await expect(tabManager.createTab()).rejects.toThrow('TabManager is disposed')
     * ```
     *
     * @public
     */
    it('should throw error when creating tab after disposal', async () => {
      await tabManager.dispose()

      await expect(tabManager.createTab()).rejects.toThrow(
        'TabManager is disposed'
      )
    })
  })

  describe('Tab management', () => {
    let tabId1: string
    let tabId2: string

    beforeEach(async () => {
      // Create mock UUIDs for multiple tabs
      const { v4 } = await import('uuid')
      vi.mocked(v4).mockReturnValueOnce('tab-1').mockReturnValueOnce('tab-2')

      await tabManager.createTab({ name: 'Terminal 1' })
      tabId1 = 'tab-1'

      await tabManager.createTab({ name: 'Terminal 2' })
      tabId2 = 'tab-2'
    })

    /**
     * Tests tab activation.
     *
     * @returns void
     * Should set the specified tab as active and emit activation event
     *
     * @example
     * ```typescript
     * const activatedSpy = vi.fn()
     * tabManager.on('tab-activated', activatedSpy)
     * tabManager.activateTab(tabId2)
     * expect(activatedSpy).toHaveBeenCalledWith(tabId2)
     * ```
     *
     * @public
     */
    it('should activate a tab', () => {
      const activatedSpy = vi.fn()
      tabManager.on('tab-activated', activatedSpy)

      tabManager.activateTab(tabId2)

      expect(tabManager.getActiveTabId()).toBe(tabId2)
      expect(activatedSpy).toHaveBeenCalledWith(tabId2)
    })

    /**
     * Tests tab removal.
     *
     * @returns void
     * Should remove the specified tab and emit removal event
     *
     * @example
     * ```typescript
     * const removedSpy = vi.fn()
     * tabManager.on('tab-removed', removedSpy)
     * tabManager.removeTab(tabId1)
     * expect(removedSpy).toHaveBeenCalledWith(tabId1)
     * ```
     *
     * @public
     */
    it('should remove a tab', async () => {
      const removedSpy = vi.fn()
      tabManager.on('tab-removed', removedSpy)

      await tabManager.removeTab(tabId1)

      expect(tabManager.getTab(tabId1)).toBeNull()
      expect(removedSpy).toHaveBeenCalledWith(tabId1)
    })

    /**
     * Tests getting all tabs.
     *
     * @returns void
     * Should return array of all tab instances
     *
     * @example
     * ```typescript
     * const allTabs = tabManager.getAllTabs()
     * expect(allTabs).toHaveLength(2)
     * ```
     *
     * @public
     */
    it('should get all tabs', () => {
      const allTabs = tabManager.getAllTabs()

      expect(allTabs).toHaveLength(2)
      // Note: The actual instances returned may have the default mock UUID
      expect(allTabs[0]).toBeDefined()
      expect(allTabs[1]).toBeDefined()
    })

    /**
     * Tests getting tab count.
     *
     * @returns void
     * Should return the correct number of active tabs
     *
     * @example
     * ```typescript
     * expect(tabManager.getTabCount()).toBe(2)
     * ```
     *
     * @public
     */
    it('should get tab count', () => {
      expect(tabManager.getTabCount()).toBe(2)
    })

    /**
     * Tests getting specific tab by ID.
     *
     * @returns void
     * Should return the correct tab instance for valid ID
     *
     * @example
     * ```typescript
     * const tab = tabManager.getTab(tabId1)
     * expect(tab).toBeDefined()
     * ```
     *
     * @public
     */
    it('should get specific tab by ID', () => {
      const tab = tabManager.getTab(tabId1)

      expect(tab).toBeDefined()
      expect(tab).toBe(mockTerminalInstance)
    })

    /**
     * Tests getting non-existent tab.
     *
     * @returns void
     * Should return null for invalid tab ID
     *
     * @example
     * ```typescript
     * const tab = tabManager.getTab('non-existent')
     * expect(tab).toBeNull()
     * ```
     *
     * @public
     */
    it('should return null for non-existent tab', () => {
      const tab = tabManager.getTab('non-existent-id')

      expect(tab).toBeNull()
    })
  })

  describe('Tab activation handling', () => {
    let tabId1: string
    let tabId2: string

    beforeEach(async () => {
      const { v4 } = await import('uuid')
      vi.mocked(v4).mockReturnValueOnce('tab-1').mockReturnValueOnce('tab-2')

      await tabManager.createTab({ name: 'Terminal 1' })
      tabId1 = 'tab-1'

      await tabManager.createTab({ name: 'Terminal 2' })
      tabId2 = 'tab-2'
    })

    /**
     * Tests automatic activation of next tab when active tab is removed.
     *
     * @returns void
     * Should activate the next available tab when current active tab is removed
     *
     * @example
     * ```typescript
     * tabManager.activateTab(tabId1)
     * tabManager.removeTab(tabId1)
     * expect(tabManager.getActiveTabId()).toBe(tabId2)
     * ```
     *
     * @public
     */
    it('should activate next tab when active tab is removed', async () => {
      tabManager.activateTab(tabId1)
      expect(tabManager.getActiveTabId()).toBe(tabId1)

      await tabManager.removeTab(tabId1)

      expect(tabManager.getActiveTabId()).toBe(tabId2)
    })

    /**
     * Tests handling of removing non-active tab.
     *
     * @returns void
     * Should maintain current active tab when removing non-active tab
     *
     * @example
     * ```typescript
     * tabManager.activateTab(tabId2)
     * tabManager.removeTab(tabId1)
     * expect(tabManager.getActiveTabId()).toBe(tabId2)
     * ```
     *
     * @public
     */
    it('should maintain active tab when removing non-active tab', async () => {
      tabManager.activateTab(tabId2)
      expect(tabManager.getActiveTabId()).toBe(tabId2)

      await tabManager.removeTab(tabId1)

      expect(tabManager.getActiveTabId()).toBe(tabId2)
    })

    /**
     * Tests handling when all tabs are removed.
     *
     * @returns void
     * Should clear active tab ID when no tabs remain
     *
     * @example
     * ```typescript
     * tabManager.removeTab(tabId1)
     * tabManager.removeTab(tabId2)
     * expect(tabManager.getActiveTabId()).toBeNull()
     * ```
     *
     * @public
     */
    it('should clear active tab when all tabs are removed', async () => {
      await tabManager.removeTab(tabId1)
      await tabManager.removeTab(tabId2)

      expect(tabManager.getActiveTabId()).toBeNull()
      expect(tabManager.getTabCount()).toBe(0)
    })
  })

  describe('Disposal', () => {
    beforeEach(async () => {
      const { v4 } = await import('uuid')
      vi.mocked(v4).mockReturnValueOnce('tab-1').mockReturnValueOnce('tab-2')

      await tabManager.createTab({ name: 'Terminal 1' })
      await tabManager.createTab({ name: 'Terminal 2' })
    })

    /**
     * Tests proper disposal of TabManager.
     *
     * @returns void
     * Should dispose all terminal instances and clear internal state
     *
     * @example
     * ```typescript
     * await tabManager.dispose()
     * expect(mockTerminalInstance.dispose).toHaveBeenCalledTimes(2)
     * expect(tabManager.getTabCount()).toBe(0)
     * ```
     *
     * @public
     */
    it('should dispose all tabs and clear state', async () => {
      expect(tabManager.getTabCount()).toBe(2)

      await tabManager.dispose()

      expect(mockTerminalInstance.dispose).toHaveBeenCalledTimes(2)
      expect(tabManager.getTabCount()).toBe(0)
      expect(tabManager.getActiveTabId()).toBeNull()
    })

    /**
     * Tests that disposal is idempotent.
     *
     * @returns void
     * Should handle multiple disposal calls gracefully
     *
     * @example
     * ```typescript
     * await tabManager.dispose()
     * await tabManager.dispose() // Should not cause errors
     * ```
     *
     * @public
     */
    it('should handle multiple disposal calls gracefully', async () => {
      expect(tabManager.getTabCount()).toBe(2)

      await tabManager.dispose()
      expect(tabManager.getTabCount()).toBe(0)

      // Second disposal should not cause errors
      await expect(tabManager.dispose()).resolves.not.toThrow()
      expect(tabManager.getTabCount()).toBe(0)
    })

    /**
     * Tests disposal error handling.
     *
     * @returns void
     * Should continue disposal even when individual tab disposal fails
     *
     * @example
     * ```typescript
     * mockTerminalInstance.dispose.mockImplementation(() => { throw new Error('Dispose failed') })
     * await expect(tabManager.dispose()).resolves.not.toThrow()
     * ```
     *
     * @public
     */
    it('should handle disposal errors gracefully', async () => {
      mockTerminalInstance.dispose = vi.fn().mockImplementation(() => {
        throw new Error('Disposal failed')
      })

      await expect(tabManager.dispose()).resolves.not.toThrow()
      expect(tabManager.getTabCount()).toBe(0)
    })
  })

  describe('Event forwarding', () => {
    beforeEach(async () => {
      await tabManager.createTab({ name: 'Test Terminal' })
    })

    /**
     * Tests terminal instance event handler setup.
     *
     * @returns void
     * Should register event handlers for terminal instance events
     *
     * @example
     * ```typescript
     * expect(mockTerminalInstance.on).toHaveBeenCalledWith('title-changed', expect.any(Function))
     * ```
     *
     * @public
     */
    it('should setup event handlers for terminal instance', () => {
      expect(mockTerminalInstance.on).toHaveBeenCalledWith(
        'title-changed',
        expect.any(Function)
      )
    })

    /**
     * Tests title change event forwarding.
     *
     * @returns void
     * Should emit tab-title-changed event when terminal title changes
     *
     * @example
     * ```typescript
     * const titleSpy = vi.fn()
     * tabManager.on('tab-title-changed', titleSpy)
     * titleHandler('New Title')
     * expect(titleSpy).toHaveBeenCalledWith('test-tab-id-123', 'New Title')
     * ```
     *
     * @public
     */
    it('should forward title change events', () => {
      const titleSpy = vi.fn()
      tabManager.on('tab-title-changed', titleSpy)

      // Get the title-changed event handler
      const titleCall = mockTerminalInstance.on.mock.calls.find(
        (call) => call[0] === 'title-changed'
      )
      expect(titleCall).toBeDefined()

      const titleHandler = titleCall?.[1]
      titleHandler('New Terminal Title')

      expect(titleSpy).toHaveBeenCalledWith(
        'test-tab-id-123',
        'New Terminal Title'
      )
    })
  })
})
