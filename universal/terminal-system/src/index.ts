// Core exports
export { EventEmitter } from './core/EventEmitter.js'
export { IPCBridge } from './core/IPCBridge.js'
export { ProcessManager } from './core/ProcessManager.js'
export { TerminalManager } from './core/TerminalManager.js'

// Enhanced backend system exports
export { BackendDetector } from './core/BackendDetector.js'
export { EnhancedTerminalFactory } from './core/EnhancedTerminalFactory.js'
export { NodePtyBackend } from './core/NodePtyBackend.js'
export { SubprocessBackend } from './core/SubprocessBackend.js'
export { SimpleSubprocessBackend } from './core/SimpleSubprocessBackend.js'
export { TerminalBackend } from './core/TerminalBackend.js'

// Plug-and-play initialization exports
export { TerminalReadyDetector } from './core/TerminalReadyDetector.js'
export {
  WelcomeMessageProvider,
  type WelcomeMessageOptions,
} from './core/WelcomeMessageProvider.js'
export { TerminalEchoHandler } from './core/TerminalEchoHandler.js'
// export { TerminalInitializer, type TerminalInitOptions, type TerminalInitResult } from './core/TerminalInitializer.js'

// Terminal UI exports - VSCode-style multi-tab terminal
export { TabManager, TerminalInstance, TerminalUI } from './terminal/index.js'

// WebGL rendering exports
export { WebGLTerminalAdapter } from './rendering/WebGLTerminalAdapter.js'

// Command API - Central API for DX Engine
export { CommandRunner, GitRunner, TaskRunner } from './commands/index.js'

// System logging and read-only terminals
export * from './system/index.js'

// Type exports
export type * from './types/index.js'

// Utility exports
export { Logger } from './utils/logger.js'
export { PlatformUtils } from './utils/platform.js'

// Re-export commonly used types
export type {
  CreateTerminalOptions,
  TerminalConfig,
  TerminalDataEvent,
  TerminalLifecycleEvent,
  TerminalResize,
  TerminalState,
} from './types/terminal'

export type {
  CreateTerminalMessage,
  TerminalCreatedMessage,
  TerminalDataMessage,
  TerminalErrorMessage,
  TerminalExitMessage,
  TerminalInputMessage,
  TerminalResizeMessage,
} from './types/ipc'

export type {
  ProcessEvent,
  ProcessSpawnOptions,
  TerminalProcess,
} from './types/process'

// Enhanced backend types
export type { TerminalCapabilities } from './core/BackendDetector'

export type {
  BackendProcess,
  BackendSpawnOptions,
} from './core/TerminalBackend'

// Constants
export { IPC_CHANNELS } from './types/ipc'

// NOTE: Browser-only exports (XTerm.js components) have been moved to ./browser
// Import from '@hatcherdx/terminal-system/browser' for:
// - XTermManager, TerminalAddonManager, XTerminalFactory
// - createHatcherTerminal
// - WebGLTerminalRenderer, TerminalResizeManager, TerminalFocusManager
// These components require DOM and browser APIs and cannot be used in Node.js/Electron main process

// Extended Electron IPC Bridge
export {
  ExtendedIPCBridge,
  type ExtendedCreateTerminalOptions,
  type SessionRecording,
  type BatchWrite,
  type TerminalStats,
} from './electron/ExtendedIPCBridge.js'

// Type exports moved to ./browser to avoid loading xterm module
