/**
 * @fileoverview Browser-only exports for terminal-system.
 *
 * @description
 * These exports are only for browser/renderer process environments.
 * They include XTerm.js components that require DOM and browser APIs.
 * Do not import this file in Node.js or Electron main process.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

// XTerm.js utilities and managers (Browser/Renderer only)
export {
  XTermManager,
  TerminalBackpressureManager,
  TerminalAddonManager,
  AddonType,
  TerminalResizeManager,
  TerminalFocusManager,
  XTerminalFactory,
  type XTermOptions,
  type BackpressureOptions,
  type AddonManagerOptions,
  type ResizeManagerOptions,
  type TerminalDimensions,
  type FocusManagerOptions,
  type KeyboardShortcut,
  type FocusEvent,
  type XTerminalFactoryOptions,
  type XTerminalInstance,
} from './xterm/index.js'

// Hatcher Terminal - Browser component
export {
  createHatcherTerminal,
  type HatcherTerminalInstance,
  type HatcherTerminalOptions,
  type HatcherTerminalTheme,
} from './components/HatcherTerminal.js'

// Re-export XTerm.js types
export type {
  Terminal as XTerminal,
  ITerminalOptions as XTerminalOptions,
  ITerminalAddon as XTerminalAddon,
  ITheme as XTerminalTheme,
} from 'xterm'

// Re-export addon types
export type { FitAddon } from '@xterm/addon-fit'
export type { SearchAddon } from '@xterm/addon-search'
export type { WebLinksAddon } from '@xterm/addon-web-links'
export type { ClipboardAddon } from '@xterm/addon-clipboard'
export type { Unicode11Addon } from '@xterm/addon-unicode11'
