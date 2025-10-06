/**
 * @fileoverview XTerminal Factory - Factory pattern for creating configured terminals.
 *
 * @description
 * Provides a factory pattern for creating fully configured XTerm.js terminals
 * with all necessary managers and addons. Simplifies terminal creation with
 * sensible defaults and automatic setup of common features.
 *
 * @example
 * ```typescript
 * const terminal = await XTerminalFactory.createTerminal(container, {
 *   theme: 'dark',
 *   enableWebGL: true
 * })
 * terminal.manager.write('Welcome!\r\n')
 * ```
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import type { Terminal } from 'xterm'
import { XTermManager, type XTermOptions } from './XTermManager'
import { TerminalAddonManager, type AddonManagerOptions } from './AddonManager'
import {
  TerminalResizeManager,
  type ResizeManagerOptions,
} from './ResizeManager'
import { TerminalFocusManager, type FocusManagerOptions } from './FocusManager'
import { WebGLTerminalRenderer, type WebGLOptions } from './WebGLRenderer'
import {
  TerminalBackpressureManager,
  type BackpressureOptions,
} from './BackpressureManager'

/**
 * Complete terminal configuration options.
 *
 * @public
 * @since 1.0.0
 */
export interface XTerminalOptions {
  /** XTerm manager options */
  terminal?: XTermOptions
  /** Addon manager options */
  addons?: AddonManagerOptions & {
    /** Load FitAddon */
    enableFit?: boolean
    /** Load SearchAddon */
    enableSearch?: boolean
    /** Load WebLinksAddon */
    enableWebLinks?: boolean
    /** Load ClipboardAddon */
    enableClipboard?: boolean
    /** Load Unicode11Addon */
    enableUnicode11?: boolean
  }
  /** Resize manager options */
  resize?: ResizeManagerOptions & {
    /** Enable resize manager */
    enabled?: boolean
  }
  /** Focus manager options */
  focus?: FocusManagerOptions & {
    /** Enable focus manager */
    enabled?: boolean
  }
  /** WebGL renderer options */
  webgl?: WebGLOptions & {
    /** Enable WebGL renderer */
    enabled?: boolean
  }
  /** Backpressure manager options */
  backpressure?: BackpressureOptions & {
    /** Enable backpressure manager */
    enabled?: boolean
  }
  /** Theme preset */
  theme?: 'dark' | 'light' | 'hatcher-dark' | 'hatcher-light'
  /** Enable debug mode for all components */
  debug?: boolean
}

/**
 * Complete terminal instance with all managers.
 *
 * @public
 * @since 1.0.0
 */
export interface XTerminalInstance {
  /** XTerm.js terminal instance */
  terminal: Terminal
  /** Terminal manager */
  manager: XTermManager
  /** Addon manager */
  addons: TerminalAddonManager
  /** Resize manager (if enabled) */
  resize?: TerminalResizeManager
  /** Focus manager (if enabled) */
  focus?: TerminalFocusManager
  /** WebGL renderer (if enabled) */
  webgl?: WebGLTerminalRenderer
  /** Backpressure manager (if enabled) */
  backpressure?: TerminalBackpressureManager
  /** Dispose all components */
  dispose(): void
}

/**
 * Factory for creating configured XTerm.js terminals.
 *
 * @remarks
 * This class provides a high-level factory pattern for creating fully
 * configured terminals with all necessary components. It handles the
 * complex setup process and ensures proper initialization order.
 *
 * Key features:
 * - One-line terminal creation
 * - Automatic component setup
 * - Sensible defaults
 * - Theme presets
 * - Proper disposal handling
 *
 * @public
 * @since 1.0.0
 */
export class XTerminalFactory {
  /**
   * Theme presets for quick configuration.
   *
   * @internal
   */
  private static readonly THEME_PRESETS = {
    'hatcher-dark': {
      fontSize: 14,
      fontFamily: 'ui-monospace, "SF Mono", "Cascadia Mono", monospace',
      theme: 'dark' as const,
      cursorBlink: true,
      cursorStyle: 'block' as const,
    },
    'hatcher-light': {
      fontSize: 14,
      fontFamily: 'ui-monospace, "SF Mono", "Cascadia Mono", monospace',
      theme: 'light' as const,
      cursorBlink: true,
      cursorStyle: 'block' as const,
    },
    dark: {
      theme: 'dark' as const,
    },
    light: {
      theme: 'light' as const,
    },
  }

  /**
   * Creates a fully configured terminal with all managers.
   *
   * @param container - HTML element to attach terminal to
   * @param options - Configuration options for all components
   * @returns Promise resolving to complete terminal instance
   *
   * @throws {@link Error}
   * Thrown when container is invalid or initialization fails
   *
   * @example
   * ```typescript
   * // Simple usage with defaults
   * const term = await XTerminalFactory.createTerminal(container)
   *
   * // Advanced usage with full configuration
   * const term = await XTerminalFactory.createTerminal(container, {
   *   theme: 'hatcher-dark',
   *   terminal: {
   *     fontSize: 16,
   *     scrollback: 5000
   *   },
   *   addons: {
   *     enableWebGL: true,
   *     enableSearch: true
   *   },
   *   resize: {
   *     enabled: true,
   *     autoResize: true
   *   },
   *   focus: {
   *     enabled: true,
   *     focusOnClick: true
   *   }
   * })
   * ```
   */
  static async createTerminal(
    container: HTMLElement,
    options: XTerminalOptions = {}
  ): Promise<XTerminalInstance> {
    if (!container) {
      throw new Error('Container element is required')
    }

    const debug = options.debug ?? false

    // Apply theme preset if specified
    let terminalOptions = { ...options.terminal }
    if (options.theme && this.THEME_PRESETS[options.theme]) {
      terminalOptions = {
        ...this.THEME_PRESETS[options.theme],
        ...terminalOptions,
      }
    }

    // Create terminal manager
    const manager = new XTermManager(terminalOptions)
    const terminal = await manager.initialize(container)

    // Create addon manager and load requested addons
    const addonManager = new TerminalAddonManager({
      debug,
      ...options.addons,
    })

    const loadedAddons = await addonManager.loadAllAddons(terminal, {
      enableWebGL:
        options.addons?.enableWebGL !== false &&
        options.webgl?.enabled !== false,
      enableSearch: options.addons?.enableSearch !== false,
      enableWebLinks: options.addons?.enableWebLinks !== false,
      enableClipboard: options.addons?.enableClipboard !== false,
      enableUnicode11: options.addons?.enableUnicode11 !== false,
    })

    // Initialize optional components
    let resizeManager: TerminalResizeManager | undefined
    let focusManager: TerminalFocusManager | undefined
    let webglRenderer: WebGLTerminalRenderer | undefined
    let backpressureManager: TerminalBackpressureManager | undefined

    // Setup resize manager if enabled
    if (options.resize?.enabled !== false) {
      resizeManager = new TerminalResizeManager({
        debug,
        ...options.resize,
      })
      await resizeManager.initialize(terminal, container, loadedAddons.fit)
    }

    // Setup focus manager if enabled
    if (options.focus?.enabled !== false) {
      focusManager = new TerminalFocusManager({
        debug,
        ...options.focus,
      })
      focusManager.initialize(terminal)
    }

    // Setup WebGL renderer if requested (and not already loaded via addon)
    if (options.webgl?.enabled && !loadedAddons.webgl) {
      webglRenderer = new WebGLTerminalRenderer({
        debug,
        ...options.webgl,
      })
      const webglSuccess = await webglRenderer.initialize(terminal)
      if (!webglSuccess) {
        webglRenderer = undefined
        if (debug) {
          console.warn(
            '[XTerminalFactory] WebGL renderer initialization failed'
          )
        }
      }
    }

    // Setup backpressure manager if enabled
    if (options.backpressure?.enabled !== false) {
      backpressureManager = new TerminalBackpressureManager({
        debug,
        ...options.backpressure,
      })
    }

    // Create instance object
    const instance: XTerminalInstance = {
      terminal,
      manager,
      addons: addonManager,
      resize: resizeManager,
      focus: focusManager,
      webgl: webglRenderer,
      backpressure: backpressureManager,
      dispose() {
        // Dispose in reverse order of creation
        backpressureManager?.clear()
        webglRenderer?.dispose()
        focusManager?.dispose()
        resizeManager?.dispose()
        addonManager.dispose()
        manager.dispose()
      },
    }

    if (debug) {
      console.log('[XTerminalFactory] Terminal created successfully', {
        hasResize: !!resizeManager,
        hasFocus: !!focusManager,
        hasWebGL: !!webglRenderer || !!loadedAddons.webgl,
        hasBackpressure: !!backpressureManager,
        addons: addonManager.getLoadedAddons(),
      })
    }

    return instance
  }

  /**
   * Creates a minimal terminal with only essential features.
   *
   * @param container - HTML element to attach terminal to
   * @returns Promise resolving to terminal instance
   *
   * @example
   * ```typescript
   * const term = await XTerminalFactory.createMinimalTerminal(container)
   * term.manager.write('Minimal terminal ready\r\n')
   * ```
   */
  static async createMinimalTerminal(
    container: HTMLElement
  ): Promise<XTerminalInstance> {
    return this.createTerminal(container, {
      addons: {
        enableWebGL: false,
        enableSearch: false,
        enableWebLinks: false,
        enableClipboard: false,
        enableUnicode11: false,
      },
      resize: {
        enabled: false,
      },
      focus: {
        enabled: false,
      },
      webgl: {
        enabled: false,
      },
      backpressure: {
        enabled: false,
      },
    })
  }

  /**
   * Creates a high-performance terminal with all optimizations.
   *
   * @param container - HTML element to attach terminal to
   * @returns Promise resolving to terminal instance
   *
   * @example
   * ```typescript
   * const term = await XTerminalFactory.createPerformanceTerminal(container)
   * // Terminal with WebGL, backpressure, and optimizations
   * ```
   */
  static async createPerformanceTerminal(
    container: HTMLElement
  ): Promise<XTerminalInstance> {
    return this.createTerminal(container, {
      theme: 'hatcher-dark',
      terminal: {
        scrollback: 1000, // Reduced for performance
        fastScrollModifier: 'alt' as const,
        scrollOnUserInput: false,
      },
      addons: {
        enableWebGL: true,
        enableSearch: false, // Disable for performance
        enableWebLinks: false,
        enableClipboard: true,
        enableUnicode11: false,
      },
      resize: {
        enabled: true,
        debounceDelay: 200, // Higher debounce for performance
      },
      focus: {
        enabled: true,
        focusOnHover: false, // Disable for performance
      },
      webgl: {
        enabled: true,
        powerPreference: 'high-performance',
        enablePerformanceMonitoring: true,
      },
      backpressure: {
        enabled: true,
        chunkSize: 1024, // Larger chunks for performance
        maxQueueSize: 50, // Smaller queue to prevent memory issues
      },
    })
  }

  /**
   * Creates a development terminal with all features and debugging.
   *
   * @param container - HTML element to attach terminal to
   * @returns Promise resolving to terminal instance
   *
   * @example
   * ```typescript
   * const term = await XTerminalFactory.createDevelopmentTerminal(container)
   * // Terminal with all features and debug logging enabled
   * ```
   */
  static async createDevelopmentTerminal(
    container: HTMLElement
  ): Promise<XTerminalInstance> {
    return this.createTerminal(container, {
      theme: 'hatcher-dark',
      debug: true,
      terminal: {
        scrollback: 10000,
        allowProposedApi: true,
      },
      addons: {
        enableWebGL: true,
        enableSearch: true,
        enableWebLinks: true,
        enableClipboard: true,
        enableUnicode11: true,
      },
      resize: {
        enabled: true,
        autoResize: true,
        debug: true,
      },
      focus: {
        enabled: true,
        focusOnClick: true,
        blurOnEscape: true,
        debug: true,
      },
      webgl: {
        enabled: true,
        enablePerformanceMonitoring: true,
        debug: true,
      },
      backpressure: {
        enabled: true,
        debug: true,
      },
    })
  }

  /**
   * Creates a terminal optimized for Electron applications.
   *
   * @param container - HTML element to attach terminal to
   * @returns Promise resolving to terminal instance
   *
   * @remarks
   * IPC bindings should be set up by the consuming application.
   *
   * @example
   * ```typescript
   * const term = await XTerminalFactory.createElectronTerminal(container)
   * // Terminal optimized for Electron (IPC bindings set separately)
   * ```
   */
  static async createElectronTerminal(
    container: HTMLElement
  ): Promise<XTerminalInstance> {
    const instance = await this.createTerminal(container, {
      theme: 'hatcher-dark',
      terminal: {
        scrollback: 5000,
      },
      addons: {
        enableWebGL: true,
        enableSearch: true,
        enableWebLinks: true,
        enableClipboard: true, // Native clipboard in Electron
        enableUnicode11: true,
      },
      resize: {
        enabled: true,
        autoResize: true,
      },
      focus: {
        enabled: true,
        focusOnClick: true,
        restoreFocusAfterContextMenu: true,
      },
      webgl: {
        enabled: true,
        preserveDrawingBuffer: true, // For screenshots
      },
      backpressure: {
        enabled: true,
      },
    })

    // NOTE: IPC handlers should be set up by the consuming application
    // (e.g., useSystemTerminals) with proper terminal ID context.
    // This factory function creates a terminal instance without IPC bindings.

    return instance
  }
}
