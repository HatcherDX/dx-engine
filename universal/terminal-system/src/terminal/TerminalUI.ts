import { EventEmitter } from '../core/EventEmitter'
import { Logger } from '../utils/logger'
import { TabManager } from './TabManager'
import { TerminalInstance } from './TerminalInstance'
import type { TerminalConfig } from '../types/terminal'

/**
 * Xterm.js addon interface for fit functionality
 */
interface FitAddon {
  instance?: {
    fit(): void
  }
  fit?(): void
}

/**
 * Xterm terminal core interface (internal API)
 */
interface TerminalCore {
  _addonManager?: {
    _addons?: FitAddon[]
  }
}

/**
 * Extended Terminal interface with core access
 */
interface ExtendedTerminal {
  _core?: TerminalCore
  options?: {
    theme?: Record<string, string>
  }
}

/**
 * Terminal UI events
 */
interface TerminalUIEvents extends Record<string, unknown[]> {
  'terminal-ready': [string] // Terminal ID ready for use
  'terminal-error': [string, Error] // Terminal ID, error
  'ui-resize': [number, number] // New width, height
  'split-request': [string] // Terminal ID to split
  'close-request': [string] // Terminal ID to close
  'tab-switch': [string] // New active tab ID
}

/**
 * Split pane configuration
 */
interface SplitPane {
  id: string
  terminalId: string
  element: HTMLElement | null
  isActive: boolean
  size: number // Percentage of container
}

/**
 * UI Theme configuration
 */
interface TerminalTheme {
  background: string
  foreground: string
  cursor: string
  selection: string
  black: string
  red: string
  green: string
  yellow: string
  blue: string
  magenta: string
  cyan: string
  white: string
  brightBlack: string
  brightRed: string
  brightGreen: string
  brightYellow: string
  brightBlue: string
  brightMagenta: string
  brightCyan: string
  brightWhite: string
}

/**
 * TerminalUI - Handles rendering and UI interactions
 * Following VSCode's terminal UI patterns for consistency
 */
export class TerminalUI extends EventEmitter<TerminalUIEvents> {
  private logger = new Logger('TerminalUI')
  private tabManager: TabManager
  private _container: HTMLElement | null = null
  private _tabsContainer: HTMLElement | null = null
  private _contentContainer: HTMLElement | null = null
  private _splitPanes = new Map<string, SplitPane>()
  private _isDisposed = false
  private _currentTheme: TerminalTheme
  private _observers = new Map<HTMLElement, ResizeObserver>()

  constructor(tabManager: TabManager) {
    super()
    this.tabManager = tabManager
    this._currentTheme = this.getDefaultTheme()

    // Setup tab manager event handlers
    this.setupTabManagerHandlers()

    this.logger.info('TerminalUI initialized')
  }

  /**
   * Initialize UI with container element
   */
  async initialize(container: HTMLElement): Promise<void> {
    if (this._isDisposed) {
      throw new Error('TerminalUI is disposed')
    }

    this._container = container
    this.setupContainerStructure()
    this.setupContainerObserver()

    this.logger.info('TerminalUI initialized with container')
  }

  /**
   * Create new terminal with UI
   */
  async createTerminal(
    config: Partial<TerminalConfig> = {}
  ): Promise<TerminalInstance> {
    if (this._isDisposed) {
      throw new Error('TerminalUI is disposed')
    }

    const instance = await this.tabManager.createTab(config)
    await this.setupTerminalUI(instance)

    this.logger.info(`Created terminal UI for: ${instance.id}`)
    return instance
  }

  /**
   * Remove terminal and its UI
   */
  async removeTerminal(terminalId: string): Promise<boolean> {
    if (this._isDisposed) return false

    // Remove split pane if exists
    const splitPane = this._splitPanes.get(terminalId)
    if (splitPane && splitPane.element) {
      splitPane.element.remove()
      this._splitPanes.delete(terminalId)
    }

    // Remove from tab manager
    const result = await this.tabManager.removeTab(terminalId)

    if (result) {
      this.logger.info(`Removed terminal UI: ${terminalId}`)
      this.emit('close-request', terminalId)
    }

    return result
  }

  /**
   * Split terminal horizontally
   */
  async splitTerminalHorizontal(
    terminalId: string
  ): Promise<TerminalInstance | null> {
    if (this._isDisposed) return null

    const sourceInstance = this.tabManager.getTab(terminalId)
    if (!sourceInstance) {
      this.logger.warn(`Source terminal not found: ${terminalId}`)
      return null
    }

    // Create new terminal with same config
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, ...configWithoutId } = sourceInstance.config
    const newConfig = {
      ...configWithoutId,
      name: `${sourceInstance.title} (Split)`,
    }

    const newInstance = await this.createTerminal(newConfig)

    // Setup split layout
    await this.setupSplitLayout(terminalId, newInstance.id, 'horizontal')

    this.logger.info(
      `Split terminal ${terminalId} horizontally -> ${newInstance.id}`
    )
    this.emit('split-request', newInstance.id)

    return newInstance
  }

  /**
   * Split terminal vertically
   */
  async splitTerminalVertical(
    terminalId: string
  ): Promise<TerminalInstance | null> {
    if (this._isDisposed) return null

    const sourceInstance = this.tabManager.getTab(terminalId)
    if (!sourceInstance) {
      this.logger.warn(`Source terminal not found: ${terminalId}`)
      return null
    }

    // Create new terminal with same config
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, ...configWithoutId } = sourceInstance.config
    const newConfig = {
      ...configWithoutId,
      name: `${sourceInstance.title} (Split)`,
    }

    const newInstance = await this.createTerminal(newConfig)

    // Setup split layout
    await this.setupSplitLayout(terminalId, newInstance.id, 'vertical')

    this.logger.info(
      `Split terminal ${terminalId} vertically -> ${newInstance.id}`
    )
    this.emit('split-request', newInstance.id)

    return newInstance
  }

  /**
   * Switch to terminal tab
   */
  switchToTab(terminalId: string): boolean {
    if (this._isDisposed) return false

    const result = this.tabManager.activateTab(terminalId)
    if (result) {
      this.updateActiveTabUI(terminalId)
      this.emit('tab-switch', terminalId)
    }

    return result
  }

  /**
   * Update terminal theme
   */
  updateTheme(theme: Partial<TerminalTheme>): void {
    if (this._isDisposed) return

    this._currentTheme = { ...this._currentTheme, ...theme }

    // Update all active terminals
    for (const instance of this.tabManager.getAllTabs()) {
      if (instance.xtermTerminal && instance.isReady) {
        instance.xtermTerminal.options.theme = this._currentTheme as unknown
      }
    }

    this.logger.info('Updated terminal theme')
  }

  /**
   * Resize all terminals
   */
  resizeTerminals(): void {
    if (this._isDisposed || !this._container) return

    for (const instance of this.tabManager.getAllTabs()) {
      if (instance.xtermTerminal && instance.isReady) {
        // Trigger resize via fit addon
        const extendedTerminal =
          instance.xtermTerminal as ExtendedTerminal | null
        const fitAddon = extendedTerminal?._core?._addonManager?._addons?.find(
          (addon: FitAddon) => addon.instance?.fit || addon.fit
        )
        if (fitAddon) {
          if (fitAddon.instance?.fit) {
            fitAddon.instance.fit()
          } else if (fitAddon.fit) {
            fitAddon.fit()
          }
        }
      }
    }
  }

  /**
   * Get UI statistics
   */
  getUIStats(): {
    hasContainer: boolean
    splitPanes: number
    activeTerminals: number
    totalTerminals: number
    theme: string
  } {
    return {
      hasContainer: this._container !== null,
      splitPanes: this._splitPanes.size,
      activeTerminals: this.tabManager.getAllTabs().filter((t) => t.isReady)
        .length,
      totalTerminals: this.tabManager.getTabCount(),
      theme: 'default',
    }
  }

  /**
   * Setup container structure
   */
  private setupContainerStructure(): void {
    if (!this._container) return

    this._container.innerHTML = ''
    this._container.className = 'terminal-ui-container'

    // Create tabs container
    this._tabsContainer = document.createElement('div')
    this._tabsContainer.className = 'terminal-tabs'
    this._container.appendChild(this._tabsContainer)

    // Create content container
    this._contentContainer = document.createElement('div')
    this._contentContainer.className = 'terminal-content'
    this._container.appendChild(this._contentContainer)

    // Apply styles
    this.applyContainerStyles()
  }

  /**
   * Apply container styles
   */
  private applyContainerStyles(): void {
    if (!this._container) return

    const style = document.createElement('style')
    style.textContent = `
      .terminal-ui-container {
        display: flex;
        flex-direction: column;
        height: 100%;
        background-color: ${this._currentTheme.background};
        color: ${this._currentTheme.foreground};
      }

      .terminal-tabs {
        display: flex;
        background-color: rgba(0, 0, 0, 0.1);
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        min-height: 32px;
        overflow-x: auto;
      }

      .terminal-content {
        flex: 1;
        display: flex;
        position: relative;
        overflow: hidden;
      }

      .terminal-split-pane {
        position: relative;
        background-color: ${this._currentTheme.background};
      }

      .terminal-split-horizontal {
        display: flex;
        flex-direction: row;
      }

      .terminal-split-vertical {
        display: flex;
        flex-direction: column;
      }

      .terminal-tab {
        padding: 8px 16px;
        background-color: transparent;
        border: none;
        color: ${this._currentTheme.foreground};
        cursor: pointer;
        border-radius: 4px 4px 0 0;
        position: relative;
        display: flex;
        align-items: center;
        gap: 8px;
        white-space: nowrap;
      }

      .terminal-tab:hover {
        background-color: rgba(255, 255, 255, 0.05);
      }

      .terminal-tab.active {
        background-color: ${this._currentTheme.background};
        border-bottom: 2px solid ${this._currentTheme.blue};
      }

      .terminal-tab-close {
        width: 16px;
        height: 16px;
        border: none;
        background: none;
        color: ${this._currentTheme.foreground};
        cursor: pointer;
        border-radius: 2px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
      }

      .terminal-tab-close:hover {
        background-color: rgba(255, 255, 255, 0.1);
      }
    `
    document.head.appendChild(style)
  }

  /**
   * Setup terminal UI for instance
   */
  private async setupTerminalUI(instance: TerminalInstance): Promise<void> {
    if (!this._contentContainer) return

    // Create terminal container
    const terminalContainer = document.createElement('div')
    terminalContainer.className = 'terminal-split-pane'
    terminalContainer.style.width = '100%'
    terminalContainer.style.height = '100%'

    this._contentContainer.appendChild(terminalContainer)

    // Initialize xterm.js in the container
    await instance.initializeXterm(terminalContainer)

    // Create split pane record
    const splitPane: SplitPane = {
      id: `pane-${instance.id}`,
      terminalId: instance.id,
      element: terminalContainer,
      isActive: true,
      size: 100,
    }

    this._splitPanes.set(instance.id, splitPane)

    // Update tabs UI
    this.updateTabsUI()

    this.emit('terminal-ready', instance.id)
  }

  /**
   * Setup split layout
   */
  private async setupSplitLayout(
    sourceId: string,
    newId: string,
    direction: 'horizontal' | 'vertical'
  ): Promise<void> {
    if (!this._contentContainer) return

    const sourcePane = this._splitPanes.get(sourceId)
    const newPane = this._splitPanes.get(newId)

    if (!sourcePane || !newPane) return

    // Create split container
    const splitContainer = document.createElement('div')
    splitContainer.className = `terminal-split-${direction}`

    // Adjust sizes for split
    sourcePane.size = 50
    newPane.size = 50

    if (direction === 'horizontal') {
      if (sourcePane.element) sourcePane.element.style.width = '50%'
      if (newPane.element) newPane.element.style.width = '50%'
    } else {
      if (sourcePane.element) sourcePane.element.style.height = '50%'
      if (newPane.element) newPane.element.style.height = '50%'
    }

    // Move elements to split container
    if (sourcePane.element) splitContainer.appendChild(sourcePane.element)
    if (newPane.element) splitContainer.appendChild(newPane.element)

    this._contentContainer.appendChild(splitContainer)
  }

  /**
   * Update tabs UI
   */
  private updateTabsUI(): void {
    if (!this._tabsContainer) return

    const tabs = this.tabManager.getTabsInOrder()
    this._tabsContainer.innerHTML = ''

    for (const { id, instance, isActive } of tabs) {
      const tabElement = document.createElement('button')
      tabElement.className = `terminal-tab ${isActive ? 'active' : ''}`
      tabElement.onclick = () => this.switchToTab(id)

      const titleSpan = document.createElement('span')
      titleSpan.textContent = instance.title
      tabElement.appendChild(titleSpan)

      const closeButton = document.createElement('button')
      closeButton.className = 'terminal-tab-close'
      closeButton.innerHTML = '×'
      closeButton.onclick = (e) => {
        e.stopPropagation()
        this.removeTerminal(id)
      }
      tabElement.appendChild(closeButton)

      this._tabsContainer.appendChild(tabElement)
    }
  }

  /**
   * Update active tab UI
   */
  private updateActiveTabUI(terminalId: string): void {
    if (!this._tabsContainer) return

    // Update tab classes
    const tabs = this._tabsContainer.querySelectorAll('.terminal-tab')
    tabs.forEach((tab, index) => {
      const tabOrder = this.tabManager.getTabsInOrder()
      const isActive = tabOrder[index]?.id === terminalId
      tab.classList.toggle('active', isActive)
    })

    // Show/hide split panes
    for (const [id, pane] of this._splitPanes) {
      if (pane.element) {
        pane.element.style.display = id === terminalId ? 'block' : 'none'
        pane.isActive = id === terminalId
      }
    }
  }

  /**
   * Setup tab manager event handlers
   */
  private setupTabManagerHandlers(): void {
    this.tabManager.on('tab-created', () => {
      this.updateTabsUI()
    })

    this.tabManager.on('tab-removed', () => {
      this.updateTabsUI()
    })

    this.tabManager.on('tab-activated', (tabId: string) => {
      this.updateActiveTabUI(tabId)
    })

    this.tabManager.on('tab-title-changed', () => {
      this.updateTabsUI()
    })
  }

  /**
   * Setup container resize observer
   */
  private setupContainerObserver(): void {
    if (!this._container) return

    const observer = new ResizeObserver(() => {
      this.resizeTerminals()
      const rect = this._container!.getBoundingClientRect()
      this.emit('ui-resize', rect.width, rect.height)
    })

    observer.observe(this._container)
    this._observers.set(this._container, observer)
  }

  /**
   * Get default theme
   */
  private getDefaultTheme(): TerminalTheme {
    return {
      background: 'transparent',
      foreground: '#ffffff',
      cursor: '#ffffff',
      selection: '#ffffff40',
      black: '#000000',
      red: '#cd3131',
      green: '#0dbc79',
      yellow: '#e5e510',
      blue: '#2472c8',
      magenta: '#bc3fbc',
      cyan: '#11a8cd',
      white: '#e5e5e5',
      brightBlack: '#666666',
      brightRed: '#f14c4c',
      brightGreen: '#23d18b',
      brightYellow: '#f5f543',
      brightBlue: '#3b8eea',
      brightMagenta: '#d670d6',
      brightCyan: '#29b8db',
      brightWhite: '#ffffff',
    }
  }

  /**
   * Dispose UI
   */
  dispose(): void {
    if (this._isDisposed) return

    this.logger.info('Disposing TerminalUI')

    // Dispose all observers
    for (const observer of this._observers.values()) {
      observer.disconnect()
    }
    this._observers.clear()

    // Clear split panes
    this._splitPanes.clear()

    // Clear containers
    this._container = null
    this._tabsContainer = null
    this._contentContainer = null

    this._isDisposed = true

    // Remove all listeners
    this.removeAllListeners()
  }

  get isDisposed(): boolean {
    return this._isDisposed
  }
}
