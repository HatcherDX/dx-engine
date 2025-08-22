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

  describe('Tab reordering', () => {
    let tabId1: string
    let tabId2: string
    let tabId3: string

    beforeEach(async () => {
      const { v4 } = await import('uuid')
      vi.mocked(v4)
        .mockReturnValueOnce('tab-1')
        .mockReturnValueOnce('tab-2')
        .mockReturnValueOnce('tab-3')

      await tabManager.createTab({ name: 'Terminal 1' })
      tabId1 = 'tab-1'

      await tabManager.createTab({ name: 'Terminal 2' })
      tabId2 = 'tab-2'

      await tabManager.createTab({ name: 'Terminal 3' })
      tabId3 = 'tab-3'
    })

    /**
     * Tests tab reordering functionality.
     *
     * @returns void
     * Should reorder tabs according to provided array and emit reordering event
     *
     * @example
     * ```typescript
     * const reorderedSpy = vi.fn()
     * tabManager.on('tabs-reordered', reorderedSpy)
     * tabManager.reorderTabs([tabId3, tabId1, tabId2])
     * expect(reorderedSpy).toHaveBeenCalledWith([tabId3, tabId1, tabId2])
     * ```
     *
     * @public
     */
    it('should reorder tabs', () => {
      const reorderedSpy = vi.fn()
      tabManager.on('tabs-reordered', reorderedSpy)

      const newOrder = [tabId3, tabId1, tabId2]
      const result = tabManager.reorderTabs(newOrder)

      expect(result).toBe(true)
      expect(reorderedSpy).toHaveBeenCalledWith(newOrder)

      const tabsInOrder = tabManager.getTabsInOrder()
      expect(tabsInOrder[0].id).toBe(tabId3)
      expect(tabsInOrder[1].id).toBe(tabId1)
      expect(tabsInOrder[2].id).toBe(tabId2)
    })

    /**
     * Tests reordering with invalid tab IDs.
     *
     * @returns void
     * Should return false and not reorder when invalid tab ID is provided
     *
     * @example
     * ```typescript
     * const result = tabManager.reorderTabs(['invalid-id', tabId1])
     * expect(result).toBe(false)
     * ```
     *
     * @public
     */
    it('should return false when reordering with invalid tab IDs', () => {
      const reorderedSpy = vi.fn()
      tabManager.on('tabs-reordered', reorderedSpy)

      const result = tabManager.reorderTabs(['invalid-id', tabId1, tabId2])

      expect(result).toBe(false)
      expect(reorderedSpy).not.toHaveBeenCalled()
    })

    /**
     * Tests reordering when disposed.
     *
     * @returns void
     * Should return false when TabManager is disposed
     *
     * @example
     * ```typescript
     * await tabManager.dispose()
     * const result = tabManager.reorderTabs([tabId1, tabId2])
     * expect(result).toBe(false)
     * ```
     *
     * @public
     */
    it('should return false when disposed', async () => {
      await tabManager.dispose()
      const result = tabManager.reorderTabs([tabId1, tabId2, tabId3])

      expect(result).toBe(false)
    })
  })

  describe('Tab pinning', () => {
    let tabId1: string

    beforeEach(async () => {
      const { v4 } = await import('uuid')
      vi.mocked(v4).mockReturnValueOnce('tab-1')

      await tabManager.createTab({ name: 'Terminal 1' })
      tabId1 = 'tab-1'
    })

    /**
     * Tests tab pinning functionality.
     *
     * @returns void
     * Should toggle pin state of specified tab
     *
     * @example
     * ```typescript
     * const result = tabManager.togglePin(tabId1)
     * expect(result).toBe(true)
     * ```
     *
     * @public
     */
    it('should toggle pin state', () => {
      const result1 = tabManager.togglePin(tabId1)
      expect(result1).toBe(true)

      // Should be pinned now, toggle again to unpin
      const result2 = tabManager.togglePin(tabId1)
      expect(result2).toBe(true)
    })

    /**
     * Tests pinning non-existent tab.
     *
     * @returns void
     * Should return false when trying to pin non-existent tab
     *
     * @example
     * ```typescript
     * const result = tabManager.togglePin('non-existent')
     * expect(result).toBe(false)
     * ```
     *
     * @public
     */
    it('should return false for non-existent tab', () => {
      const result = tabManager.togglePin('non-existent-id')
      expect(result).toBe(false)
    })

    /**
     * Tests pinning when disposed.
     *
     * @returns void
     * Should return false when TabManager is disposed
     *
     * @example
     * ```typescript
     * await tabManager.dispose()
     * const result = tabManager.togglePin(tabId1)
     * expect(result).toBe(false)
     * ```
     *
     * @public
     */
    it('should return false when disposed', async () => {
      await tabManager.dispose()
      const result = tabManager.togglePin(tabId1)

      expect(result).toBe(false)
    })
  })

  describe('Bulk operations', () => {
    let tabId1: string
    let tabId2: string
    let tabId3: string

    beforeEach(async () => {
      const { v4 } = await import('uuid')
      vi.mocked(v4)
        .mockReturnValueOnce('tab-1')
        .mockReturnValueOnce('tab-2')
        .mockReturnValueOnce('tab-3')

      await tabManager.createTab({ name: 'Terminal 1' })
      tabId1 = 'tab-1'

      await tabManager.createTab({ name: 'Terminal 2' })
      tabId2 = 'tab-2'

      await tabManager.createTab({ name: 'Terminal 3' })
      tabId3 = 'tab-3'

      // Pin one tab
      tabManager.togglePin(tabId2)
    })

    /**
     * Tests closing all tabs except pinned.
     *
     * @returns Promise<void>
     * Should close all unpinned tabs and return count of closed tabs
     *
     * @example
     * ```typescript
     * const closedCount = await tabManager.closeAllExceptPinned()
     * expect(closedCount).toBe(2)
     * expect(tabManager.getTabCount()).toBe(1)
     * ```
     *
     * @public
     */
    it('should close all tabs except pinned', async () => {
      expect(tabManager.getTabCount()).toBe(3)

      const closedCount = await tabManager.closeAllExceptPinned()

      expect(closedCount).toBe(2)
      expect(tabManager.getTabCount()).toBe(1)
      expect(tabManager.hasTab(tabId2)).toBe(true) // Pinned tab should remain
      expect(tabManager.hasTab(tabId1)).toBe(false)
      expect(tabManager.hasTab(tabId3)).toBe(false)
    })

    /**
     * Tests closing all tabs.
     *
     * @returns Promise<void>
     * Should close all tabs including pinned ones
     *
     * @example
     * ```typescript
     * const closedCount = await tabManager.closeAllTabs()
     * expect(closedCount).toBe(3)
     * expect(tabManager.getTabCount()).toBe(0)
     * ```
     *
     * @public
     */
    it('should close all tabs including pinned', async () => {
      expect(tabManager.getTabCount()).toBe(3)

      const closedCount = await tabManager.closeAllTabs()

      expect(closedCount).toBe(3)
      expect(tabManager.getTabCount()).toBe(0)
      expect(tabManager.getActiveTabId()).toBeNull()
    })

    /**
     * Tests bulk operations when disposed.
     *
     * @returns Promise<void>
     * Should return 0 when TabManager is disposed
     *
     * @example
     * ```typescript
     * await tabManager.dispose()
     * const count = await tabManager.closeAllExceptPinned()
     * expect(count).toBe(0)
     * ```
     *
     * @public
     */
    it('should return 0 when disposed', async () => {
      await tabManager.dispose()

      const closedCount1 = await tabManager.closeAllExceptPinned()
      expect(closedCount1).toBe(0)

      const closedCount2 = await tabManager.closeAllTabs()
      expect(closedCount2).toBe(0)
    })
  })

  describe('Tab search', () => {
    beforeEach(async () => {
      const { v4 } = await import('uuid')
      vi.mocked(v4)
        .mockReturnValueOnce('tab-1')
        .mockReturnValueOnce('tab-2')
        .mockReturnValueOnce('tab-3')

      // Create mock instances with different titles
      const mockInstance1 = {
        ...mockTerminalInstance,
        id: 'tab-1',
        title: 'Development Server',
      }
      const mockInstance2 = {
        ...mockTerminalInstance,
        id: 'tab-2',
        title: 'Git Operations',
      }
      const mockInstance3 = {
        ...mockTerminalInstance,
        id: 'tab-3',
        title: 'Development Build',
      }

      vi.mocked(TerminalInstance)
        .mockReturnValueOnce(mockInstance1 as TerminalInstance)
        .mockReturnValueOnce(mockInstance2 as TerminalInstance)
        .mockReturnValueOnce(mockInstance3 as TerminalInstance)

      await tabManager.createTab({ name: 'Terminal 1' })
      await tabManager.createTab({ name: 'Terminal 2' })
      await tabManager.createTab({ name: 'Terminal 3' })
    })

    /**
     * Tests finding tab by exact title.
     *
     * @returns void
     * Should find tab with exact title match
     *
     * @example
     * ```typescript
     * const tab = tabManager.findTabByTitle('Development Server', true)
     * expect(tab).toBeDefined()
     * expect(tab?.title).toBe('Development Server')
     * ```
     *
     * @public
     */
    it('should find tab by exact title', () => {
      const tab = tabManager.findTabByTitle('Development Server', true)

      expect(tab).toBeDefined()
      expect(tab?.title).toBe('Development Server')
    })

    /**
     * Tests finding tab by partial title.
     *
     * @returns void
     * Should find tab with partial title match (case insensitive)
     *
     * @example
     * ```typescript
     * const tab = tabManager.findTabByTitle('development')
     * expect(tab).toBeDefined()
     * expect(tab?.title).toBe('Development Server')
     * ```
     *
     * @public
     */
    it('should find tab by partial title (case insensitive)', () => {
      const tab = tabManager.findTabByTitle('development')

      expect(tab).toBeDefined()
      expect(tab?.title).toBe('Development Server')
    })

    /**
     * Tests finding non-existent tab.
     *
     * @returns void
     * Should return null when no tab matches the title
     *
     * @example
     * ```typescript
     * const tab = tabManager.findTabByTitle('Non-existent Title')
     * expect(tab).toBeNull()
     * ```
     *
     * @public
     */
    it('should return null for non-existent title', () => {
      const tab = tabManager.findTabByTitle('Non-existent Title')

      expect(tab).toBeNull()
    })

    /**
     * Tests exact vs partial matching.
     *
     * @returns void
     * Should distinguish between exact and partial matches
     *
     * @example
     * ```typescript
     * const exactTab = tabManager.findTabByTitle('Development', true)
     * expect(exactTab).toBeNull()
     *
     * const partialTab = tabManager.findTabByTitle('Development')
     * expect(partialTab).toBeDefined()
     * ```
     *
     * @public
     */
    it('should distinguish between exact and partial matches', () => {
      const exactTab = tabManager.findTabByTitle('Development', true)
      expect(exactTab).toBeNull()

      const partialTab = tabManager.findTabByTitle('Development')
      expect(partialTab).toBeDefined()
      expect(partialTab?.title).toBe('Development Server')
    })
  })

  describe('Utility methods', () => {
    beforeEach(async () => {
      const { v4 } = await import('uuid')
      vi.mocked(v4).mockReturnValueOnce('tab-1').mockReturnValueOnce('tab-2')

      await tabManager.createTab({ name: 'Terminal 1' })
      await tabManager.createTab({ name: 'Terminal 2' })
    })

    /**
     * Tests hasTab method.
     *
     * @returns void
     * Should return true for existing tabs and false for non-existent tabs
     *
     * @example
     * ```typescript
     * expect(tabManager.hasTab('tab-1')).toBe(true)
     * expect(tabManager.hasTab('non-existent')).toBe(false)
     * ```
     *
     * @public
     */
    it('should check if tab exists', () => {
      expect(tabManager.hasTab('tab-1')).toBe(true)
      expect(tabManager.hasTab('tab-2')).toBe(true)
      expect(tabManager.hasTab('non-existent-id')).toBe(false)
    })

    /**
     * Tests getTabsInOrder method.
     *
     * @returns void
     * Should return tabs in correct order with metadata
     *
     * @example
     * ```typescript
     * const tabsInOrder = tabManager.getTabsInOrder()
     * expect(tabsInOrder).toHaveLength(2)
     * expect(tabsInOrder[0].id).toBe('tab-1')
     * ```
     *
     * @public
     */
    it('should get tabs in order with metadata', () => {
      const tabsInOrder = tabManager.getTabsInOrder()

      expect(tabsInOrder).toHaveLength(2)
      expect(tabsInOrder[0]).toMatchObject({
        id: 'tab-1',
        instance: expect.any(Object),
        isActive: expect.any(Boolean),
        isPinned: expect.any(Boolean),
      })
    })

    /**
     * Tests isDisposed getter.
     *
     * @returns Promise<void>
     * Should return correct disposal state
     *
     * @example
     * ```typescript
     * expect(tabManager.isDisposed).toBe(false)
     * await tabManager.dispose()
     * expect(tabManager.isDisposed).toBe(true)
     * ```
     *
     * @public
     */
    it('should return correct disposal state', async () => {
      expect(tabManager.isDisposed).toBe(false)

      await tabManager.dispose()

      expect(tabManager.isDisposed).toBe(true)
    })
  })

  describe('Statistics', () => {
    beforeEach(async () => {
      const { v4 } = await import('uuid')
      vi.mocked(v4)
        .mockReturnValueOnce('tab-1')
        .mockReturnValueOnce('tab-2')
        .mockReturnValueOnce('tab-3')

      await tabManager.createTab({ name: 'Terminal 1' })
      await tabManager.createTab({ name: 'Terminal 2' })
      await tabManager.createTab({ name: 'Terminal 3' })

      // Pin one tab
      tabManager.togglePin('tab-2')

      // Activate a specific tab
      tabManager.activateTab('tab-3')
    })

    /**
     * Tests getting tab statistics.
     *
     * @returns void
     * Should return comprehensive statistics about all tabs
     *
     * @example
     * ```typescript
     * const stats = tabManager.getStats()
     * expect(stats.totalTabs).toBe(3)
     * expect(stats.pinnedTabs).toBe(1)
     * expect(stats.activeTabId).toBe('tab-3')
     * ```
     *
     * @public
     */
    it('should return comprehensive tab statistics', () => {
      const stats = tabManager.getStats()

      expect(stats.totalTabs).toBe(3)
      expect(stats.activeTabs).toBe(1) // Only one active tab
      expect(stats.pinnedTabs).toBe(1)
      expect(stats.activeTabId).toBe('tab-3')
      expect(stats.oldestTab).toBeDefined()
      expect(stats.newestTab).toBeDefined()
      expect(stats.oldestTab?.id).toBe('tab-1')
      expect(stats.newestTab?.id).toBe('tab-3')
    })

    /**
     * Tests statistics with no tabs.
     *
     * @returns Promise<void>
     * Should return empty statistics when no tabs exist
     *
     * @example
     * ```typescript
     * await tabManager.closeAllTabs()
     * const stats = tabManager.getStats()
     * expect(stats.totalTabs).toBe(0)
     * expect(stats.oldestTab).toBeUndefined()
     * ```
     *
     * @public
     */
    it('should return empty statistics when no tabs exist', async () => {
      await tabManager.closeAllTabs()
      const stats = tabManager.getStats()

      expect(stats.totalTabs).toBe(0)
      expect(stats.activeTabs).toBe(0)
      expect(stats.pinnedTabs).toBe(0)
      expect(stats.activeTabId).toBeNull()
      expect(stats.oldestTab).toBeUndefined()
      expect(stats.newestTab).toBeUndefined()
    })
  })

  describe('Event handling edge cases', () => {
    beforeEach(async () => {
      const { v4 } = await import('uuid')
      vi.mocked(v4).mockReturnValueOnce('tab-1')

      await tabManager.createTab({ name: 'Test Terminal' })
    })

    /**
     * Tests terminal instance data event handling.
     *
     * @returns void
     * Should update tab modification state when data is received
     *
     * @example
     * ```typescript
     * const dataHandler = mockTerminalInstance.on.mock.calls.find(call => call[0] === 'data')[1]
     * dataHandler()
     * // Should mark tab as modified if not active
     * ```
     *
     * @public
     */
    it('should handle terminal data events', () => {
      // Get the data event handler
      const dataCall = mockTerminalInstance.on.mock.calls.find(
        (call) => call[0] === 'data'
      )
      expect(dataCall).toBeDefined()

      const dataHandler = dataCall?.[1]

      // Tab is currently active, should not mark as modified
      dataHandler()

      // Deactivate tab and test again
      tabManager.activateTab('different-tab')
      dataHandler()
    })

    /**
     * Tests terminal instance focus event handling.
     *
     * @returns void
     * Should activate tab when terminal instance receives focus
     *
     * @example
     * ```typescript
     * const focusHandler = mockTerminalInstance.on.mock.calls.find(call => call[0] === 'focus')[1]
     * focusHandler()
     * expect(tabManager.getActiveTabId()).toBe('tab-1')
     * ```
     *
     * @public
     */
    it('should handle terminal focus events', () => {
      const activatedSpy = vi.fn()
      tabManager.on('tab-activated', activatedSpy)

      // Get the focus event handler
      const focusCall = mockTerminalInstance.on.mock.calls.find(
        (call) => call[0] === 'focus'
      )
      expect(focusCall).toBeDefined()

      const focusHandler = focusCall?.[1]

      // Since tab is already active, should not trigger activation
      focusHandler()
      expect(activatedSpy).not.toHaveBeenCalled()
    })

    /**
     * Tests terminal instance exit event handling setup.
     *
     * @returns void
     * Should register exit event handler for terminal instance
     *
     * @example
     * ```typescript
     * expect(mockTerminalInstance.on).toHaveBeenCalledWith('exit', expect.any(Function))
     * ```
     *
     * @public
     */
    it('should setup exit event handler for terminal instance', () => {
      // Get the exit event handler
      const exitCall = mockTerminalInstance.on.mock.calls.find(
        (call) => call[0] === 'exit'
      )

      expect(exitCall).toBeDefined()
      expect(exitCall?.[0]).toBe('exit')
      expect(typeof exitCall?.[1]).toBe('function')
    })
  })

  describe('Error handling', () => {
    beforeEach(async () => {
      const { v4 } = await import('uuid')
      vi.mocked(v4).mockReturnValueOnce('tab-1')

      await tabManager.createTab({ name: 'Test Terminal' })
    })

    /**
     * Tests removal of non-existent tab.
     *
     * @returns Promise<void>
     * Should return false when trying to remove non-existent tab
     *
     * @example
     * ```typescript
     * const result = await tabManager.removeTab('non-existent-id')
     * expect(result).toBe(false)
     * ```
     *
     * @public
     */
    it('should handle removal of non-existent tab', async () => {
      const removedSpy = vi.fn()
      tabManager.on('tab-removed', removedSpy)

      const result = await tabManager.removeTab('non-existent-id')

      expect(result).toBe(false)
      expect(removedSpy).not.toHaveBeenCalled()
    })

    /**
     * Tests activation of non-existent tab.
     *
     * @returns void
     * Should return false when trying to activate non-existent tab
     *
     * @example
     * ```typescript
     * const result = tabManager.activateTab('non-existent-id')
     * expect(result).toBe(false)
     * ```
     *
     * @public
     */
    it('should handle activation of non-existent tab', () => {
      const activatedSpy = vi.fn()
      tabManager.on('tab-activated', activatedSpy)

      const result = tabManager.activateTab('non-existent-id')

      expect(result).toBe(false)
      expect(activatedSpy).not.toHaveBeenCalled()
    })

    /**
     * Tests disposal error handling during tab removal.
     *
     * @returns Promise<void>
     * Should continue removal even when terminal disposal fails
     *
     * @example
     * ```typescript
     * mockTerminalInstance.dispose.mockImplementation(() => { throw new Error('Disposal failed') })
     * const result = await tabManager.removeTab('tab-1')
     * expect(result).toBe(true)
     * ```
     *
     * @public
     */
    it('should handle disposal errors during tab removal', async () => {
      mockTerminalInstance.dispose = vi.fn().mockImplementation(() => {
        throw new Error('Terminal disposal failed')
      })

      const result = await tabManager.removeTab('tab-1')

      expect(result).toBe(true)
      expect(tabManager.getTab('tab-1')).toBeNull()
    })

    /**
     * Tests operations after disposal.
     *
     * @returns Promise<void>
     * Should handle all operations gracefully after disposal
     *
     * @example
     * ```typescript
     * await tabManager.dispose()
     * expect(tabManager.activateTab('tab-1')).toBe(false)
     * expect(await tabManager.removeTab('tab-1')).toBe(false)
     * ```
     *
     * @public
     */
    it('should handle operations after disposal', async () => {
      await tabManager.dispose()

      expect(tabManager.activateTab('tab-1')).toBe(false)
      expect(await tabManager.removeTab('tab-1')).toBe(false)
      expect(tabManager.togglePin('tab-1')).toBe(false)
      expect(tabManager.reorderTabs(['tab-1'])).toBe(false)
    })
  })
})
