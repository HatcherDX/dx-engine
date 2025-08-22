/**
 * @fileoverview System logging and terminal components for DX Engine.
 *
 * @description
 * This module provides the system-level logging and read-only terminal
 * infrastructure for DX Engine, including:
 * - SystemLogger with professional tslog integration
 * - GitCommandLogger for Causa-Efecto git operation tracing
 * - ReadOnlyTerminalManager for System and Timeline terminals
 * - SystemEventBus for cross-component event coordination
 *
 * @example
 * ```typescript
 * import {
 *   systemLogger,
 *   gitCommandLogger,
 *   readOnlyTerminalManager,
 *   systemEventBus
 * } from '@hatcherdx/terminal-system/system'
 *
 * // Initialize system terminals
 * await readOnlyTerminalManager.initializeSystemTerminals()
 *
 * // Log system events
 * systemLogger.info('Application initialized')
 *
 * // Log git operations with traceability
 * await gitCommandLogger.wrapGitOperation('status', () => git.status())
 * ```
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

// Core system logging
export { SystemLogger, systemLogger } from './SystemLogger'
export type {
  SystemEvent,
  SystemEventType,
  SystemTerminalType,
  SystemLoggerConfig,
} from './SystemLogger'

// Git operation logging with Causa-Efecto pattern
export { GitCommandLogger, gitCommandLogger } from './GitCommandLogger'
export type {
  GitOperationResult,
  GitOperationContext,
} from './GitCommandLogger'

// Read-only terminal management
export {
  ReadOnlyTerminalManager,
  readOnlyTerminalManager,
} from './ReadOnlyTerminalManager'
export type {
  ReadOnlyTerminalState,
  ReadOnlyTerminalLine,
  TerminalOutputEvent,
} from './ReadOnlyTerminalManager'

// System event coordination
export { SystemEventBus, systemEventBus } from './SystemEventBus'
export type {
  ProjectEventType,
  GitEventType,
  SystemEventType as BusSystemEventType,
  ProjectEventData,
  GitEventData,
  SystemEventData,
} from './SystemEventBus'
