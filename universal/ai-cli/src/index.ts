/**
 * @fileoverview Main entry point for @hatcherdx/ai-cli package.
 *
 * @description
 * Exports all core components, types, and providers for the AI CLI system.
 * This package provides a generic interface for interacting with AI CLIs
 * like Claude Code, Gemini CLI, and others through a unified API.
 *
 * @example
 * ```typescript
 * import { aiProviderRegistry, ClaudeCodeProvider, CLIRunner } from '@hatcherdx/ai-cli'
 *
 * // Register Claude Code provider
 * const cliRunner = new CLIRunner()
 * const claudeProvider = new ClaudeCodeProvider(cliRunner)
 * aiProviderRegistry.register(claudeProvider)
 *
 * // Use the provider
 * const response = await claudeProvider.sendMessage({
 *   message: 'Hello, Claude!'
 * })
 * ```
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

// Core types and interfaces
export type {
  SendMessageParams,
  AIResponse,
  AIChunk,
  AIMessage,
  TokenUsage,
  ProviderCapabilities,
  CLIOptions,
  CLIResult,
} from './core/types'

// Core abstractions
export type { AIProvider } from './core/AIProvider'
export {
  AIProviderRegistry,
  aiProviderRegistry,
} from './core/AIProviderRegistry'

// CLI execution
export { CLIRunner } from './cli/CLIRunner'

// Providers
export { ClaudeCodeProvider } from './providers/ClaudeCodeProvider'

// Commands
export type { Command, CommandResult, CommandCategory } from './commands/types'
export { CommandRegistry } from './commands/CommandRegistry'
