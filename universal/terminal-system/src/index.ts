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
export { TerminalBackend } from './core/TerminalBackend.js'

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
