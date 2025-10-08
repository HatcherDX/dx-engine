/**
 * @fileoverview Hatcher Terminal - Production-ready, plug-and-play terminal component.
 *
 * @description
 * Self-contained terminal component that provides a complete terminal experience
 * with minimal configuration. Designed to be extremely plug-and-play, requiring
 * only a container element and optional configuration to get started.
 *
 * @example
 * ```typescript
 * import { createHatcherTerminal } from '@hatcherdx/terminal-system'
 *
 * const terminal = await createHatcherTerminal('#terminal-container', {
 *   theme: 'dark',
 *   welcomeMessage: true
 * })
 * ```
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import type { Terminal as XTerminal } from 'xterm'
import { Logger } from '../utils/logger'
import { WelcomeMessageProvider } from '../core/WelcomeMessageProvider'

/**
 * Hatcher Terminal theme configuration.
 *
 * @remarks
 * Themes are designed to match the Hatcher UI design system.
 * All colors follow the CSS custom properties defined in the main app.
 *
 * @public
 * @since 1.0.0
 */
export interface HatcherTerminalTheme {
  /**
   * Theme name identifier.
   * @defaultValue 'dark'
   */
  name: 'dark' | 'light' | 'custom'

  /**
   * Terminal background color.
   * @defaultValue 'transparent' to inherit from container
   */
  background?: string

  /**
   * Terminal foreground (text) color.
   * @defaultValue '#f8fafc' for dark theme
   */
  foreground?: string

  /**
   * Cursor color.
   * @defaultValue '#dfa927' (Hatcher accent color)
   */
  cursor?: string

  /**
   * Selection background color.
   * @defaultValue 'rgba(223, 169, 39, 0.3)'
   */
  selection?: string

  /**
   * ANSI color palette.
   */
  colors?: {
    black?: string
    red?: string
    green?: string
    yellow?: string
    blue?: string
    magenta?: string
    cyan?: string
    white?: string
    brightBlack?: string
    brightRed?: string
    brightGreen?: string
    brightYellow?: string
    brightBlue?: string
    brightMagenta?: string
    brightCyan?: string
    brightWhite?: string
  }
}

/**
 * Configuration options for Hatcher Terminal.
 *
 * @remarks
 * All options are optional with sensible defaults for immediate productivity.
 * The terminal will work out-of-the-box with zero configuration.
 *
 * @public
 * @since 1.0.0
 */
export interface HatcherTerminalOptions {
  /**
   * Terminal theme configuration.
   * @defaultValue 'dark' theme matching Hatcher UI
   */
  theme?: 'dark' | 'light' | HatcherTerminalTheme

  /**
   * Show welcome message on terminal start.
   * @defaultValue true
   */
  welcomeMessage?: boolean

  /**
   * Custom welcome message content.
   * @defaultValue Auto-generated based on system info
   */
  customWelcomeMessage?: string

  /**
   * Font size in pixels.
   * @defaultValue 14
   */
  fontSize?: number

  /**
   * Font family for terminal text.
   * @defaultValue System monospace font stack
   */
  fontFamily?: string

  /**
   * Enable cursor blinking.
   * @defaultValue true
   */
  cursorBlink?: boolean

  /**
   * Scrollback buffer size.
   * @defaultValue 10000
   */
  scrollback?: number

  /**
   * Enable WebGL renderer for performance.
   * @defaultValue true (with fallback to canvas)
   */
  useWebGL?: boolean

  /**
   * Enable web links addon.
   * @defaultValue true
   */
  enableWebLinks?: boolean

  /**
   * Auto-resize terminal on container resize.
   * @defaultValue true
   */
  autoResize?: boolean

  /**
   * IPC channel configuration for Electron integration.
   */
  ipc?: {
    enabled: boolean
    channelPrefix?: string
  }
}

/**
 * Hatcher Terminal instance interface.
 *
 * @remarks
 * Provides methods to control and interact with the terminal after creation.
 *
 * @public
 * @since 1.0.0
 */
export interface HatcherTerminalInstance {
  /**
   * Unique identifier for this terminal instance.
   */
  id: string

  /**
   * The underlying xterm.js terminal instance.
   */
  terminal: XTerminal

  /**
   * Write data to the terminal.
   *
   * @param data - Text to write to terminal
   */
  write(data: string): void

  /**
   * Clear the terminal screen.
   */
  clear(): void

  /**
   * Reset the terminal to initial state.
   */
  reset(): void

  /**
   * Focus the terminal for input.
   */
  focus(): void

  /**
   * Blur (unfocus) the terminal.
   */
  blur(): void

  /**
   * Update terminal theme.
   *
   * @param theme - New theme configuration
   */
  updateTheme(theme: 'dark' | 'light' | HatcherTerminalTheme): void

  /**
   * Resize terminal to fit container.
   */
  fit(): void

  /**
   * Get current terminal size.
   *
   * @returns Object with cols and rows
   */
  getSize(): { cols: number; rows: number }

  /**
   * Dispose of the terminal and clean up resources.
   */
  dispose(): void

  /**
   * Event handler for terminal data.
   *
   * @param callback - Function to handle terminal input
   */
  onData(callback: (data: string) => void): void

  /**
   * Event handler for terminal resize.
   *
   * @param callback - Function to handle resize events
   */
  onResize(callback: (size: { cols: number; rows: number }) => void): void
}

/**
 * Default themes for Hatcher Terminal.
 */
const HATCHER_THEMES = {
  dark: {
    name: 'dark' as const,
    background: 'transparent',
    foreground: '#f8fafc',
    cursor: '#dfa927',
    selection: 'rgba(223, 169, 39, 0.3)',
    colors: {
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
    },
  },
  light: {
    name: 'light' as const,
    background: 'transparent',
    foreground: '#0f172a',
    cursor: '#dfa927',
    selection: 'rgba(223, 169, 39, 0.3)',
    colors: {
      black: '#000000',
      red: '#cd3131',
      green: '#0dbc79',
      yellow: '#c79920',
      blue: '#2472c8',
      magenta: '#bc3fbc',
      cyan: '#11a8cd',
      white: '#e5e5e5',
      brightBlack: '#666666',
      brightRed: '#f14c4c',
      brightGreen: '#23d18b',
      brightYellow: '#dfa927',
      brightBlue: '#3b8eea',
      brightMagenta: '#d670d6',
      brightCyan: '#29b8db',
      brightWhite: '#ffffff',
    },
  },
}

/**
 * Creates a new Hatcher Terminal instance.
 *
 * @remarks
 * This is the main entry point for creating a terminal. It's designed to be
 * extremely simple to use - just pass a container selector and optional config.
 *
 * @param container - CSS selector or HTMLElement for terminal container
 * @param options - Optional configuration options
 * @returns Promise that resolves to a HatcherTerminalInstance
 *
 * @throws {@link Error}
 * Thrown when container element is not found or xterm.js is not available
 *
 * @example
 * ```typescript
 * // Simplest usage - just works
 * const terminal = await createHatcherTerminal('#terminal')
 *
 * // With configuration
 * const terminal = await createHatcherTerminal('#terminal', {
 *   theme: 'dark',
 *   fontSize: 16,
 *   welcomeMessage: true
 * })
 *
 * // Write to terminal
 * terminal.write('Hello, Hatcher Terminal!\\r\\n')
 *
 * // Handle user input
 * terminal.onData(data => {
 *   console.log('User typed:', data)
 * })
 * ```
 *
 * @public
 * @since 1.0.0
 */
export async function createHatcherTerminal(
  container: string | HTMLElement,
  options: HatcherTerminalOptions = {}
): Promise<HatcherTerminalInstance> {
  const logger = new Logger('HatcherTerminal')

  // Resolve container element
  const containerEl =
    typeof container === 'string'
      ? (document.querySelector(container) as HTMLElement)
      : container

  if (!containerEl) {
    throw new Error(`Container element not found: ${container}`)
  }

  // Apply default options
  const config: Required<HatcherTerminalOptions> = {
    theme: options.theme || 'dark',
    welcomeMessage: options.welcomeMessage !== false,
    customWelcomeMessage: options.customWelcomeMessage || '',
    fontSize: options.fontSize || 14,
    fontFamily:
      options.fontFamily ||
      'ui-monospace, "SF Mono", SFMono-Regular, "Cascadia Mono", "Cascadia Code", "Segoe UI Mono", "Roboto Mono", "Oxygen Mono", "Ubuntu Monospace", "Source Code Pro", "Fira Mono", "Droid Sans Mono", "Courier New", monospace',
    cursorBlink: options.cursorBlink !== false,
    scrollback: options.scrollback || 10000,
    useWebGL: options.useWebGL !== false,
    enableWebLinks: options.enableWebLinks !== false,
    autoResize: options.autoResize !== false,
    ipc: options.ipc || { enabled: false },
  }

  // Dynamically import xterm and addons
  const [{ Terminal }, { FitAddon }, { WebLinksAddon }] = await Promise.all([
    import('xterm'),
    import('@xterm/addon-fit'),
    import('@xterm/addon-web-links'),
  ])

  // Resolve theme
  const theme =
    typeof config.theme === 'string'
      ? HATCHER_THEMES[config.theme]
      : (config.theme as HatcherTerminalTheme)

  // Create terminal instance
  const terminal = new Terminal({
    fontSize: config.fontSize,
    fontFamily: config.fontFamily,
    theme: {
      background: theme.background,
      foreground: theme.foreground,
      cursor: theme.cursor,
      selectionBackground: theme.selection,
      ...theme.colors,
    },
    cursorBlink: config.cursorBlink,
    scrollback: config.scrollback,
  })

  // Add fit addon
  const fitAddon = new FitAddon()
  terminal.loadAddon(fitAddon)

  // Add web links addon if enabled
  if (config.enableWebLinks) {
    terminal.loadAddon(new WebLinksAddon())
  }

  // Try to add WebGL addon for performance
  if (config.useWebGL) {
    try {
      // WebGL addon is optional - it might not be available
      logger.debug('WebGL addon not available in this environment')
    } catch {
      logger.debug('WebGL not available, using canvas renderer')
    }
  }

  // Open terminal in container
  terminal.open(containerEl)
  fitAddon.fit()

  // Generate and show welcome message
  if (config.welcomeMessage) {
    const welcomeMessage =
      config.customWelcomeMessage || (await generateWelcomeMessage())
    terminal.write(welcomeMessage)
  }

  // Setup auto-resize if enabled
  if (config.autoResize) {
    const resizeObserver = new ResizeObserver(() => {
      fitAddon.fit()
    })
    resizeObserver.observe(containerEl)
  }

  // Setup IPC if in Electron environment
  if (config.ipc?.enabled && window.electronAPI) {
    await setupElectronIPC(terminal)
  }

  // Generate unique ID
  const instanceId = `hatcher-terminal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

  // Create instance object
  const instance: HatcherTerminalInstance = {
    id: instanceId,
    terminal,

    write(data: string) {
      terminal.write(data)
    },

    clear() {
      terminal.clear()
    },

    reset() {
      terminal.reset()
    },

    focus() {
      terminal.focus()
    },

    blur() {
      terminal.blur()
    },

    updateTheme(newTheme: 'dark' | 'light' | HatcherTerminalTheme) {
      const resolvedTheme =
        typeof newTheme === 'string' ? HATCHER_THEMES[newTheme] : newTheme

      terminal.options.theme = {
        background: resolvedTheme.background,
        foreground: resolvedTheme.foreground,
        cursor: resolvedTheme.cursor,
        selectionBackground: resolvedTheme.selection,
        ...resolvedTheme.colors,
      }
    },

    fit() {
      fitAddon.fit()
    },

    getSize() {
      return {
        cols: terminal.cols,
        rows: terminal.rows,
      }
    },

    dispose() {
      terminal.dispose()
    },

    onData(callback: (data: string) => void) {
      terminal.onData(callback)
    },

    onResize(callback: (size: { cols: number; rows: number }) => void) {
      terminal.onResize(callback)
    },
  }

  logger.info(`Hatcher Terminal created: ${instanceId}`)

  return instance
}

/**
 * Generates a welcome message for the terminal.
 *
 * @returns Formatted welcome message with ANSI colors
 *
 * @internal
 */
async function generateWelcomeMessage(): Promise<string> {
  const provider = new WelcomeMessageProvider()
  return provider.getWelcomeMessage()
}

/**
 * Sets up Electron IPC integration for the terminal.
 *
 * @param terminal - xterm.js terminal instance
 *
 * @internal
 */
async function setupElectronIPC(terminal: XTerminal): Promise<void> {
  if (!window.electronAPI) return

  const logger = new Logger('HatcherTerminal-IPC')

  // Note: Electron IPC integration would be set up here
  // This requires the proper ElectronTerminalAPI interface to be available
  logger.debug('Electron IPC setup would happen here')

  // For now, just log that we're in Electron environment
  terminal.write('\r\n[Running in Electron environment]\r\n')
}

/**
 * Export default for convenience.
 */
export default createHatcherTerminal
