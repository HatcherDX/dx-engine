/**
 * @fileoverview Hatcher Actions - DAG-based action scheduling system.
 *
 * @description
 * Provides deterministic action execution with dependency management using Directed DAG.
 * Supports git-committable configuration via .hatcher/actions.yaml.
 *
 * Features (v2.0):
 * - Parallel execution within dependency levels (Turborepo pattern)
 * - Retry with exponential backoff (GitHub Actions pattern)
 * - Affected-only execution (Nx pattern)
 * - Remote caching (Turborepo pattern)
 * - Matrix builds (GitHub Actions pattern)
 *
 * @example
 * ```typescript
 * import { ActionLoader, ActionScheduler, AffectedDetector, RemoteCache } from '@hatcherdx/hatcher-actions'
 *
 * // Load configuration
 * const loader = new ActionLoader()
 * const config = loader.parseConfig(yamlContent)
 * const actions = loader.toActionDefinitions(config)
 *
 * // Detect affected actions (Nx pattern)
 * const detector = new AffectedDetector(actions, ipc)
 * const affected = await detector.getAffectedActions('main', 'HEAD')
 *
 * // Create scheduler with retry and parallel execution
 * const scheduler = new ActionScheduler(actions, {
 *   ...config.settings,
 *   retries: 3,
 *   retryStrategy: 'exponential',
 *   maxParallel: 4
 * })
 *
 * // Execute actions with caching
 * const cache = new RemoteCache({ endpoint: 's3://my-bucket' })
 * const results = await scheduler.execute(context)
 * ```
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

// Core classes
export { ActionLoader } from './ActionLoader'
export { ActionScheduler } from './ActionScheduler'

// Advanced features (v2.0)
export { AffectedDetector } from './AffectedDetector'
export { RemoteCache } from './RemoteCache'
export { MatrixExpander } from './MatrixExpander'
export { FileHasher } from './FileHasher'
export { IncrementalBuilder } from './IncrementalBuilder'
export type { ActionInstance } from './MatrixExpander'
export type { CacheContext, EvictionPolicy } from './RemoteCache'
export type { FileHash } from './FileHasher'

// Type definitions
export type {
  ActionDefinition,
  ActionResult,
  ActionGroup,
  ActionsConfig,
  ExecutionSettings,
  ExecutionContext,
  CommandExecutionResult,
  RetryStrategy,
} from './types'
