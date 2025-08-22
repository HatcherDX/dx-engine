/**
 * @fileoverview Browser-compatible system logging and terminal components for DX Engine.
 *
 * @description
 * Browser-compatible versions of the system-level logging and read-only terminal
 * infrastructure for DX Engine, including:
 * - BrowserSystemLogger with professional logging without Node.js dependencies
 * - BrowserGitCommandLogger for Causa-Efecto git operation tracing
 * - BrowserReadOnlyTerminalManager for System and Timeline terminals
 *
 * @example
 * ```typescript
 * import {
 *   browserSystemLogger,
 *   browserGitCommandLogger,
 *   browserReadOnlyTerminalManager,
 * } from '@hatcherdx/terminal-system/system/browser'
 *
 * // Initialize system terminals
 * await browserReadOnlyTerminalManager.initializeSystemTerminals()
 *
 * // Log system events
 * browserSystemLogger.info('Application initialized')
 *
 * // Log git operations with traceability
 * await browserGitCommandLogger.wrapGitOperation('status', () => mockGitStatus())
 * ```
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

// Browser-compatible system logging
export { BrowserSystemLogger, browserSystemLogger } from './BrowserSystemLogger'
export type {
  SystemEvent,
  SystemEventType,
  SystemTerminalType,
} from './BrowserSystemLogger'

// Browser-compatible Git operation logging with Causa-Efecto pattern
export {
  BrowserGitCommandLogger,
  browserGitCommandLogger,
} from './BrowserGitCommandLogger'
export type {
  GitOperationResult,
  GitOperationContext,
} from './BrowserGitCommandLogger'

// Browser-compatible read-only terminal management
export {
  BrowserReadOnlyTerminalManager,
  browserReadOnlyTerminalManager,
} from './BrowserReadOnlyTerminalManager'
export type {
  ReadOnlyTerminalState,
  ReadOnlyTerminalLine,
  TerminalOutputEvent,
} from './BrowserReadOnlyTerminalManager'
