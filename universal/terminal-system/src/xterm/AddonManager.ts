/**
 * @fileoverview Terminal Addon Manager - Manages XTerm.js addons.
 *
 * @description
 * Centralized management for XTerm.js addons including FitAddon, WebglAddon,
 * SearchAddon, and more. Handles loading, configuration, and disposal of addons
 * with proper error handling and fallback mechanisms.
 *
 * @example
 * ```typescript
 * const manager = new TerminalAddonManager()
 * const fitAddon = await manager.loadFitAddon(terminal)
 * fitAddon.fit()
 * ```
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import type { Terminal, ITerminalAddon } from 'xterm'
import type { FitAddon } from '@xterm/addon-fit'
import type { SearchAddon } from '@xterm/addon-search'
import type { WebLinksAddon } from '@xterm/addon-web-links'
import type { ClipboardAddon } from '@xterm/addon-clipboard'
import type { Unicode11Addon } from '@xterm/addon-unicode11'

/**
 * Addon types enumeration.
 *
 * @public
 * @since 1.0.0
 */
export enum AddonType {
  FIT = 'fit',
  SEARCH = 'search',
  WEB_LINKS = 'webLinks',
  CLIPBOARD = 'clipboard',
  UNICODE11 = 'unicode11',
}

/**
 * Configuration options for addon manager.
 *
 * @public
 * @since 1.0.0
 */
export interface AddonManagerOptions {
  /** Enable debug logging */
  debug?: boolean
  /** Enable WebGL addon if supported */
  enableWebGL?: boolean
  /** Enable search addon */
  enableSearch?: boolean
  /** Enable web links addon */
  enableWebLinks?: boolean
  /** Enable clipboard addon */
  enableClipboard?: boolean
  /** Enable Unicode 11 addon */
  enableUnicode11?: boolean
}

/**
 * Manages XTerm.js addon lifecycle.
 *
 * @remarks
 * This class provides centralized management for all XTerm.js addons.
 * It handles dynamic loading, configuration, error recovery, and disposal.
 *
 * Key features:
 * - Dynamic addon loading
 * - Error handling with fallbacks
 * - Memory management
 * - Type-safe addon access
 * - WebGL detection and fallback
 *
 * @public
 * @since 1.0.0
 */
export class TerminalAddonManager {
  private addons: Map<AddonType, ITerminalAddon> = new Map()
  private readonly debug: boolean

  /**
   * Creates a new TerminalAddonManager instance.
   *
   * @param options - Configuration options
   *
   * @example
   * ```typescript
   * const manager = new TerminalAddonManager({
   *   debug: true,
   *   enableWebGL: true
   * })
   * ```
   */
  constructor(options: AddonManagerOptions = {}) {
    this.debug = options.debug ?? false
  }

  /**
   * Loads and configures FitAddon.
   *
   * @param terminal - XTerm.js terminal instance
   * @returns Loaded FitAddon instance
   *
   * @example
   * ```typescript
   * const fitAddon = await manager.loadFitAddon(terminal)
   * fitAddon.fit()
   * ```
   */
  async loadFitAddon(terminal: Terminal): Promise<FitAddon> {
    try {
      // Dynamic import for better code splitting
      const { FitAddon } = await import('@xterm/addon-fit')
      const addon = new FitAddon()

      terminal.loadAddon(addon)
      this.addons.set(AddonType.FIT, addon)

      if (this.debug) {
        console.log('[AddonManager] FitAddon loaded successfully')
      }

      return addon
    } catch (error) {
      if (this.debug) {
        console.error('[AddonManager] Failed to load FitAddon:', error)
      }
      throw new Error(`Failed to load FitAddon: ${error}`)
    }
  }

  /**
   * Loads and configures WebglAddon with fallback support.
   *
   * @deprecated WebGL is now handled by WebGLTerminalAdapter
   * @param terminal - XTerm.js terminal instance
   * @returns Always returns null - WebGL is handled by WebGLTerminalAdapter
   *
   * @example
   * ```typescript
   * // This method is deprecated
   * // Use WebGLTerminalAdapter instead in XTerminalFactory
   * ```
   */
  async loadWebGLAddon(): Promise<null> {
    if (this.debug) {
      console.log(
        '[AddonManager] WebGL addon deprecated - using WebGLTerminalAdapter instead'
      )
    }
    // WebGL rendering is now handled by our own WebGLTerminalAdapter
    // This method is kept for API compatibility but always returns null
    return null
  }

  /**
   * Loads and configures SearchAddon.
   *
   * @param terminal - XTerm.js terminal instance
   * @returns Loaded SearchAddon instance
   *
   * @example
   * ```typescript
   * const searchAddon = await manager.loadSearchAddon(terminal)
   * searchAddon.findNext('pattern')
   * ```
   */
  async loadSearchAddon(terminal: Terminal): Promise<SearchAddon> {
    try {
      const { SearchAddon } = await import('@xterm/addon-search')
      const addon = new SearchAddon()

      terminal.loadAddon(addon)
      this.addons.set(AddonType.SEARCH, addon)

      if (this.debug) {
        console.log('[AddonManager] SearchAddon loaded successfully')
      }

      return addon
    } catch (error) {
      if (this.debug) {
        console.error('[AddonManager] Failed to load SearchAddon:', error)
      }
      throw new Error(`Failed to load SearchAddon: ${error}`)
    }
  }

  /**
   * Loads and configures WebLinksAddon.
   *
   * @param terminal - XTerm.js terminal instance
   * @returns Loaded WebLinksAddon instance
   *
   * @example
   * ```typescript
   * const webLinksAddon = await manager.loadWebLinksAddon(terminal)
   * // Links are now clickable in the terminal
   * ```
   */
  async loadWebLinksAddon(terminal: Terminal): Promise<WebLinksAddon> {
    try {
      const { WebLinksAddon } = await import('@xterm/addon-web-links')
      const addon = new WebLinksAddon()

      terminal.loadAddon(addon)
      this.addons.set(AddonType.WEB_LINKS, addon)

      if (this.debug) {
        console.log('[AddonManager] WebLinksAddon loaded successfully')
      }

      return addon
    } catch (error) {
      if (this.debug) {
        console.error('[AddonManager] Failed to load WebLinksAddon:', error)
      }
      throw new Error(`Failed to load WebLinksAddon: ${error}`)
    }
  }

  /**
   * Loads and configures ClipboardAddon.
   *
   * @param terminal - XTerm.js terminal instance
   * @returns Loaded ClipboardAddon instance
   *
   * @example
   * ```typescript
   * const clipboardAddon = await manager.loadClipboardAddon(terminal)
   * // Copy/paste now works in the terminal
   * ```
   */
  async loadClipboardAddon(terminal: Terminal): Promise<ClipboardAddon> {
    try {
      const { ClipboardAddon } = await import('@xterm/addon-clipboard')
      const addon = new ClipboardAddon()

      terminal.loadAddon(addon)
      this.addons.set(AddonType.CLIPBOARD, addon)

      if (this.debug) {
        console.log('[AddonManager] ClipboardAddon loaded successfully')
      }

      return addon
    } catch (error) {
      if (this.debug) {
        console.error('[AddonManager] Failed to load ClipboardAddon:', error)
      }
      throw new Error(`Failed to load ClipboardAddon: ${error}`)
    }
  }

  /**
   * Loads and configures Unicode11Addon.
   *
   * @param terminal - XTerm.js terminal instance
   * @returns Loaded Unicode11Addon instance
   *
   * @example
   * ```typescript
   * const unicodeAddon = await manager.loadUnicode11Addon(terminal)
   * terminal.unicode.activeVersion = '11'
   * ```
   */
  async loadUnicode11Addon(terminal: Terminal): Promise<Unicode11Addon> {
    try {
      const { Unicode11Addon } = await import('@xterm/addon-unicode11')
      const addon = new Unicode11Addon()

      terminal.loadAddon(addon)
      this.addons.set(AddonType.UNICODE11, addon)

      // Activate Unicode 11
      if ('unicode' in terminal) {
        const terminalWithUnicode = terminal as Terminal & {
          unicode: { activeVersion: string }
        }
        terminalWithUnicode.unicode.activeVersion = '11'
      }

      if (this.debug) {
        console.log('[AddonManager] Unicode11Addon loaded successfully')
      }

      return addon
    } catch (error) {
      if (this.debug) {
        console.error('[AddonManager] Failed to load Unicode11Addon:', error)
      }
      throw new Error(`Failed to load Unicode11Addon: ${error}`)
    }
  }

  /**
   * Loads all standard addons.
   *
   * @param terminal - XTerm.js terminal instance
   * @param options - Options for which addons to load
   * @returns Object containing loaded addons
   *
   * @example
   * ```typescript
   * const addons = await manager.loadAllAddons(terminal, {
   *   enableWebGL: true,
   *   enableSearch: true
   * })
   * ```
   */
  async loadAllAddons(
    terminal: Terminal,
    options: AddonManagerOptions = {}
  ): Promise<{
    fit?: FitAddon
    search?: SearchAddon
    webLinks?: WebLinksAddon
    clipboard?: ClipboardAddon
    unicode11?: Unicode11Addon
  }> {
    const result: {
      fit?: FitAddon
      search?: SearchAddon
      webLinks?: WebLinksAddon
      clipboard?: ClipboardAddon
      unicode11?: Unicode11Addon
    } = {}

    // Always load FitAddon
    result.fit = await this.loadFitAddon(terminal)

    // Load optional addons based on options
    // Note: WebGL is now handled by WebGLTerminalAdapter, not here

    if (options.enableSearch !== false) {
      result.search = await this.loadSearchAddon(terminal)
    }

    if (options.enableWebLinks !== false) {
      result.webLinks = await this.loadWebLinksAddon(terminal)
    }

    if (options.enableClipboard !== false) {
      result.clipboard = await this.loadClipboardAddon(terminal)
    }

    if (options.enableUnicode11 !== false) {
      result.unicode11 = await this.loadUnicode11Addon(terminal)
    }

    return result
  }

  /**
   * Gets a loaded addon by type.
   *
   * @param type - Addon type to retrieve
   * @returns Addon instance or undefined if not loaded
   *
   * @example
   * ```typescript
   * const fitAddon = manager.getAddon<FitAddon>(AddonType.FIT)
   * if (fitAddon) {
   *   fitAddon.fit()
   * }
   * ```
   */
  getAddon<T extends ITerminalAddon>(type: AddonType): T | undefined {
    return this.addons.get(type) as T | undefined
  }

  /**
   * Checks if an addon is loaded.
   *
   * @param type - Addon type to check
   * @returns True if addon is loaded
   */
  isAddonLoaded(type: AddonType): boolean {
    return this.addons.has(type)
  }

  /**
   * Disposes a specific addon.
   *
   * @param type - Addon type to dispose
   */
  disposeAddon(_type: AddonType): void {
    const type = _type
    const addon = this.addons.get(type)
    if (addon && 'dispose' in addon) {
      ;(addon as ITerminalAddon).dispose()
      this.addons.delete(type)

      if (this.debug) {
        console.log(`[AddonManager] Disposed addon: ${type}`)
      }
    }
  }

  /**
   * Disposes all loaded addons.
   *
   * @example
   * ```typescript
   * manager.dispose()
   * ```
   */
  dispose(): void {
    for (const [, addon] of this.addons) {
      if ('dispose' in addon) {
        ;(addon as ITerminalAddon).dispose()
      }
    }
    this.addons.clear()

    if (this.debug) {
      console.log('[AddonManager] All addons disposed')
    }
  }

  /**
   * Gets list of loaded addon types.
   *
   * @returns Array of loaded addon types
   */
  getLoadedAddons(): AddonType[] {
    return Array.from(this.addons.keys())
  }

  /**
   * Gets count of loaded addons.
   *
   * @returns Number of loaded addons
   */
  getAddonCount(): number {
    return this.addons.size
  }
}
