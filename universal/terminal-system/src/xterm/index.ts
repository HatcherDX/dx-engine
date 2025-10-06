/**
 * @fileoverview XTerm.js utilities exports.
 *
 * @description
 * Centralized exports for all XTerm.js utilities, managers, and types.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

// Core managers
export { XTermManager, type XTermOptions } from './XTermManager.js'

export {
  TerminalBackpressureManager,
  type BackpressureOptions,
} from './BackpressureManager.js'

export {
  TerminalAddonManager,
  AddonType,
  type AddonManagerOptions,
} from './AddonManager.js'

// Advanced managers
export {
  WebGLTerminalRenderer,
  type WebGLOptions,
  type PerformanceMetrics,
} from './WebGLRenderer.js'

export {
  TerminalResizeManager,
  type ResizeManagerOptions,
  type TerminalDimensions,
} from './ResizeManager.js'

export {
  TerminalFocusManager,
  type FocusManagerOptions,
  type KeyboardShortcut,
  type FocusEvent,
} from './FocusManager.js'

// Factory pattern
export {
  XTerminalFactory,
  type XTerminalOptions as XTerminalFactoryOptions,
  type XTerminalInstance,
} from './XTerminalFactory.js'

// Re-export commonly used XTerm types
export type { Terminal, ITerminalOptions, ITheme, ITerminalAddon } from 'xterm'

// Re-export addon types
export type { FitAddon } from '@xterm/addon-fit'
export type { WebglAddon } from '@xterm/addon-webgl'
export type { SearchAddon } from '@xterm/addon-search'
export type { WebLinksAddon } from '@xterm/addon-web-links'
export type { ClipboardAddon } from '@xterm/addon-clipboard'
export type { Unicode11Addon } from '@xterm/addon-unicode11'
