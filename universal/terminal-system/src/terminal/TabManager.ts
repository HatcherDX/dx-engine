import { v4 as uuidv4 } from 'uuid'
import { EventEmitter } from '../core/EventEmitter'
import { Logger } from '../utils/logger'
import { TerminalInstance } from './TerminalInstance'
import type { TerminalConfig } from '../types/terminal'

/**
 * Tab manager events following VSCode pattern
 */
interface TabManagerEvents extends Record<string, unknown[]> {
  'tab-created': [TerminalInstance] // New tab created
  'tab-removed': [string] // Tab removed (ID)
  'tab-activated': [string] // Tab activated (ID)
  'tab-title-changed': [string, string] // Tab ID, new title
  'tabs-reordered': [string[]] // New tab order (IDs)
}

/**
 * Terminal tab data structure
 */
interface TerminalTab {
  id: string
  instance: TerminalInstance
  isActive: boolean
  isPinned: boolean
  isModified: boolean
  order: number
  createdAt: Date
  lastActiveAt: Date
}

/**
 * TabManager - Manages multiple terminal tabs with UUID tracking
 * Following VSCode's TabManager pattern for multi-terminal support
 */
export class TabManager extends EventEmitter<TabManagerEvents> {
  private logger = new Logger('TabManager')
  private _tabs = new Map<string, TerminalTab>()
  private _activeTabId: string | null = null
  private _nextOrder = 0
  private _isDisposed = false

  constructor() {
    super()
    this.logger.info('TabManager initialized')
  }

  /**
   * Create new terminal tab
   */
  async createTab(
    config: Partial<TerminalConfig> = {}
  ): Promise<TerminalInstance> {
    if (this._isDisposed) {
      throw new Error('TabManager is disposed')
    }

    const tabId = uuidv4()
    const terminalConfig: TerminalConfig = {
      id: tabId,
      name: config.name || `Terminal ${this._tabs.size + 1}`,
      shell:
        config.shell ||
        (process.platform === 'win32' ? 'cmd.exe' : '/bin/bash'),
      cwd: config.cwd || process.cwd(),
      env: { ...process.env, ...config.env } as Record<string, string>,
      cols: config.cols || 80,
      rows: config.rows || 24,
    }

    // Create terminal instance
    const instance = new TerminalInstance(terminalConfig)

    // Setup instance event handlers
    this.setupInstanceEventHandlers(instance)

    // Create tab
    const tab: TerminalTab = {
      id: tabId,
      instance,
      isActive: false,
      isPinned: false,
      isModified: false,
      order: this._nextOrder++,
      createdAt: new Date(),
      lastActiveAt: new Date(),
    }

    // Add to tabs
    this._tabs.set(tabId, tab)

    // Activate if it's the first tab
    if (this._tabs.size === 1) {
      this.activateTab(tabId)
    }

    this.logger.info(`Created terminal tab: ${tabId}`)
    this.emit('tab-created', instance)

    return instance
  }

  /**
   * Remove terminal tab
   */
  async removeTab(tabId: string): Promise<boolean> {
    if (this._isDisposed) return false

    const tab = this._tabs.get(tabId)
    if (!tab) {
      this.logger.warn(`Tab not found: ${tabId}`)
      return false
    }

    // Dispose terminal instance
    try {
      tab.instance.dispose()
    } catch (error) {
      this.logger.error(
        `Failed to dispose terminal instance ${tabId}:`,
        error as Error
      )
    }

    // Remove from tabs
    this._tabs.delete(tabId)

    // If this was the active tab, activate another one
    if (this._activeTabId === tabId) {
      this._activeTabId = null

      // Activate the most recently used tab
      const remainingTabs = Array.from(this._tabs.values()).sort(
        (a, b) => b.lastActiveAt.getTime() - a.lastActiveAt.getTime()
      )

      if (remainingTabs.length > 0) {
        this.activateTab(remainingTabs[0].id)
      }
    }

    this.logger.info(`Removed terminal tab: ${tabId}`)
    this.emit('tab-removed', tabId)

    return true
  }

  /**
   * Activate terminal tab
   */
  activateTab(tabId: string): boolean {
    if (this._isDisposed) return false

    const tab = this._tabs.get(tabId)
    if (!tab) {
      this.logger.warn(`Tab not found: ${tabId}`)
      return false
    }

    // Deactivate current active tab
    if (this._activeTabId) {
      const currentActive = this._tabs.get(this._activeTabId)
      if (currentActive) {
        currentActive.isActive = false
        currentActive.instance.blur()
      }
    }

    // Activate new tab
    tab.isActive = true
    tab.lastActiveAt = new Date()
    this._activeTabId = tabId

    // Focus terminal
    tab.instance.focus()

    this.logger.info(`Activated terminal tab: ${tabId}`)
    this.emit('tab-activated', tabId)

    return true
  }

  /**
   * Get terminal tab by ID
   */
  getTab(tabId: string): TerminalInstance | null {
    const tab = this._tabs.get(tabId)
    return tab ? tab.instance : null
  }

  /**
   * Get active terminal tab
   */
  getActiveTab(): TerminalInstance | null {
    if (!this._activeTabId) return null
    return this.getTab(this._activeTabId)
  }

  /**
   * Get all terminal tabs
   */
  getAllTabs(): TerminalInstance[] {
    return Array.from(this._tabs.values())
      .sort((a, b) => a.order - b.order)
      .map((tab) => tab.instance)
  }

  /**
   * Get tabs in display order
   */
  getTabsInOrder(): {
    id: string
    instance: TerminalInstance
    isActive: boolean
    isPinned: boolean
  }[] {
    return Array.from(this._tabs.values())
      .sort((a, b) => a.order - b.order)
      .map((tab) => ({
        id: tab.id,
        instance: tab.instance,
        isActive: tab.isActive,
        isPinned: tab.isPinned,
      }))
  }

  /**
   * Reorder tabs
   */
  reorderTabs(tabIds: string[]): boolean {
    if (this._isDisposed) return false

    // Validate all tab IDs exist
    for (const tabId of tabIds) {
      if (!this._tabs.has(tabId)) {
        this.logger.warn(`Invalid tab ID in reorder: ${tabId}`)
        return false
      }
    }

    // Update order
    tabIds.forEach((tabId, index) => {
      const tab = this._tabs.get(tabId)
      if (tab) {
        tab.order = index
      }
    })

    this.logger.info('Reordered tabs:', tabIds)
    this.emit('tabs-reordered', tabIds)

    return true
  }

  /**
   * Pin/unpin tab
   */
  togglePin(tabId: string): boolean {
    if (this._isDisposed) return false

    const tab = this._tabs.get(tabId)
    if (!tab) {
      this.logger.warn(`Tab not found: ${tabId}`)
      return false
    }

    tab.isPinned = !tab.isPinned
    this.logger.info(`Tab ${tabId} pinned: ${tab.isPinned}`)

    return true
  }

  /**
   * Close all tabs except pinned
   */
  async closeAllExceptPinned(): Promise<number> {
    if (this._isDisposed) return 0

    const tabsToClose = Array.from(this._tabs.values())
      .filter((tab) => !tab.isPinned)
      .map((tab) => tab.id)

    let closedCount = 0
    for (const tabId of tabsToClose) {
      if (await this.removeTab(tabId)) {
        closedCount++
      }
    }

    this.logger.info(`Closed ${closedCount} unpinned tabs`)
    return closedCount
  }

  /**
   * Close all tabs
   */
  async closeAllTabs(): Promise<number> {
    if (this._isDisposed) return 0

    const allTabIds = Array.from(this._tabs.keys())
    let closedCount = 0

    for (const tabId of allTabIds) {
      if (await this.removeTab(tabId)) {
        closedCount++
      }
    }

    this.logger.info(`Closed all ${closedCount} tabs`)
    return closedCount
  }

  /**
   * Find tab by title or partial title
   */
  findTabByTitle(title: string, exact = false): TerminalInstance | null {
    for (const tab of this._tabs.values()) {
      const tabTitle = tab.instance.title
      const matches = exact
        ? tabTitle === title
        : tabTitle.toLowerCase().includes(title.toLowerCase())

      if (matches) {
        return tab.instance
      }
    }
    return null
  }

  /**
   * Get tab count
   */
  getTabCount(): number {
    return this._tabs.size
  }

  /**
   * Get active tab ID
   */
  getActiveTabId(): string | null {
    return this._activeTabId
  }

  /**
   * Check if tab exists
   */
  hasTab(tabId: string): boolean {
    return this._tabs.has(tabId)
  }

  /**
   * Setup event handlers for terminal instance
   */
  private setupInstanceEventHandlers(instance: TerminalInstance): void {
    instance.on('title-changed', (title: string) => {
      this.emit('tab-title-changed', instance.id, title)
    })

    instance.on('data', () => {
      const tab = this._tabs.get(instance.id)
      if (tab) {
        tab.lastActiveAt = new Date()
        if (!tab.isActive) {
          tab.isModified = true
        }
      }
    })

    instance.on('focus', () => {
      if (this._activeTabId !== instance.id) {
        this.activateTab(instance.id)
      }
    })

    instance.on('exit', () => {
      // Auto-remove tab when terminal exits
      setTimeout(() => {
        this.removeTab(instance.id)
      }, 1000) // Small delay to show exit message
    })
  }

  /**
   * Get tab statistics
   */
  getStats(): {
    totalTabs: number
    activeTabs: number
    pinnedTabs: number
    activeTabId: string | null
    oldestTab?: { id: string; age: number }
    newestTab?: { id: string; age: number }
  } {
    const tabs = Array.from(this._tabs.values())
    const now = Date.now()

    let oldestTab: { id: string; age: number } | undefined
    let newestTab: { id: string; age: number } | undefined

    if (tabs.length > 0) {
      const sorted = tabs.sort(
        (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
      )
      const oldest = sorted[0]
      const newest = sorted[sorted.length - 1]

      oldestTab = {
        id: oldest.id,
        age: now - oldest.createdAt.getTime(),
      }

      newestTab = {
        id: newest.id,
        age: now - newest.createdAt.getTime(),
      }
    }

    return {
      totalTabs: this._tabs.size,
      activeTabs: tabs.filter((tab) => tab.isActive).length,
      pinnedTabs: tabs.filter((tab) => tab.isPinned).length,
      activeTabId: this._activeTabId,
      oldestTab,
      newestTab,
    }
  }

  /**
   * Dispose tab manager
   */
  async dispose(): Promise<void> {
    if (this._isDisposed) return

    this.logger.info('Disposing TabManager')

    // Close all tabs
    await this.closeAllTabs()

    this._activeTabId = null
    this._isDisposed = true

    // Remove all listeners
    this.removeAllListeners()
  }

  get isDisposed(): boolean {
    return this._isDisposed
  }
}
