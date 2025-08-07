// Terminal UI components - VSCode-style terminal with multi-tab support
export { TerminalInstance } from './TerminalInstance'
export { TabManager } from './TabManager'
export { TerminalUI } from './TerminalUI'

// Re-export types for convenience
export type {
  TerminalConfig,
  TerminalState,
  CreateTerminalOptions,
  TerminalDataEvent,
  TerminalLifecycleEvent,
  TerminalResize,
} from '../types/terminal'
