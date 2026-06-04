/**
 * @fileoverview Type definitions for Hatcher Actions system.
 *
 * @description
 * Core types for the DAG-based action scheduling system.
 * Supports deterministic command execution with dependency management.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

/**
 * Action definition from .hatcher/actions.yaml
 *
 * @remarks
 * Represents a single action with its metadata, dependencies, and execution settings.
 *
 * @public
 * @since 1.0.0
 */
export interface ActionDefinition {
  /** Unique action identifier (e.g., "lint:check") */
  id: string

  /** Human-readable action name */
  name: string

  /** Detailed description of what the action does */
  description: string

  /** Shell command to execute */
  command: string

  /** Icon name for UI display */
  icon?: string

  /** Array of action IDs that must complete before this action */
  dependencies: string[]

  /**
   * Whether this action can run in parallel with others at the same level
   *
   * @remarks
   * When true, action can execute concurrently with other parallel actions
   * that have the same dependencies satisfied.
   */
  parallel?: boolean

  /** Estimated execution duration in milliseconds */
  estimatedDuration?: number

  /**
   * File globs that trigger this action (Nx pattern)
   *
   * @remarks
   * When specified, action only runs if changed files match these globs.
   * Used for incremental builds and affected-only execution.
   *
   * @example
   * ```yaml
   * affectedBy:
   *   - 'apps/web/**'
   *   - 'universal/storage/**'
   * ```
   *
   * @since 2.0.0
   */
  affectedBy?: string[]

  /**
   * Matrix configuration for parameterized execution (GitHub Actions pattern)
   *
   * @remarks
   * Generates multiple job instances from Cartesian product of matrix values.
   *
   * @example
   * ```yaml
   * matrix:
   *   os: [ubuntu, windows, macos]
   *   node: [18, 20, 22]
   * # Generates 9 jobs: ubuntu-18, ubuntu-20, ..., macos-22
   * ```
   *
   * @since 2.0.0
   */
  matrix?: Record<string, (string | number)[]>

  /**
   * Cache configuration (GitHub Actions pattern)
   *
   * @remarks
   * Defines cache key, restore keys, and paths to cache.
   *
   * @example
   * ```yaml
   * cache:
   *   key: deps-${{ hashFiles('pnpm-lock.yaml') }}
   *   restoreKeys:
   *     - deps-${{ runner.os }}-
   *     - deps-
   *   paths:
   *     - node_modules/
   * ```
   *
   * @since 1.0.0
   */
  cache?: {
    /** Cache key with optional template variables */
    key: string
    /** Fallback keys for cache restoration (prefix matching) */
    restoreKeys?: string[]
    /** Paths to cache */
    paths: string[]
  }

  /**
   * Input files/globs for incremental builds (Turborepo pattern)
   *
   * @remarks
   * Specifies which files affect the cache key calculation.
   * Only rebuild when these files change.
   *
   * @example
   * ```typescript
   * inputs: ['src/ ** /*.ts', '!src/ ** /*.spec.ts', 'tsconfig.json']
   * ```
   *
   * @since 1.0.0
   */
  inputs?: string[]

  /**
   * Output files/globs for caching (Turborepo pattern)
   *
   * @remarks
   * Specifies which files should be cached after successful execution.
   *
   * @example
   * ```typescript
   * outputs: ['dist/ ** /', '.next/ ** /', '!.next/cache/ ** /']
   * ```
   *
   * @since 1.0.0
   */
  outputs?: string[]

  /**
   * Pipeline-style dependencies (Turborepo pattern)
   *
   * @remarks
   * Allows expressing "this task depends on the same task of all dependencies".
   * Use '^build' to mean "all dependencies' build tasks".
   *
   * @example
   * ```yaml
   * dependsOn: ['^build']  # Wait for dependencies' build
   * dependsOn: ['^test', 'lint']  # Mix pipeline and regular deps
   * ```
   *
   * @since 1.0.0
   */
  dependsOn?: string[]

  /**
   * Task timeout in milliseconds
   *
   * @remarks
   * Overrides global timeout for this specific action.
   *
   * @since 1.0.0
   */
  timeout?: number

  /**
   * Maximum parallel instances of this action
   *
   * @remarks
   * Limits concurrency for resource-intensive tasks (e.g., e2e tests).
   *
   * @example
   * ```yaml
   * maxParallel: 1  # Never run in parallel (Playwright)
   * ```
   *
   * @since 1.0.0
   */
  maxParallel?: number
}

/**
 * Action execution result
 *
 * @public
 * @since 1.0.0
 */
export interface ActionResult {
  /** Action ID that was executed */
  actionId: string

  /** Execution status */
  status: 'success' | 'failed' | 'skipped'

  /** Execution duration in milliseconds */
  duration: number

  /** Command stdout output */
  output?: string

  /** Command stderr output or error message */
  error?: string

  /** Exit code from command execution */
  exitCode?: number

  /** Start timestamp */
  startTime: number

  /** End timestamp */
  endTime: number
}

/**
 * Action group definition
 *
 * @remarks
 * Groups actions for common workflows (pre-commit, pre-push, pre-deploy).
 *
 * @public
 * @since 1.0.0
 */
export interface ActionGroup {
  /** Group identifier */
  name: string

  /** Array of action IDs in this group */
  actions: string[]
}

/**
 * Actions configuration from .hatcher/actions.yaml
 *
 * @public
 * @since 1.0.0
 */
export interface ActionsConfig {
  /** Schema version */
  version: string

  /** Project name */
  project: string

  /** Action groups */
  groups: Record<string, string[]>

  /** Action definitions */
  actions: Record<string, Omit<ActionDefinition, 'id'>>

  /** Execution settings */
  settings: ExecutionSettings
}

/**
 * Retry strategy for failed actions
 *
 * @remarks
 * - 'exponential': Delays grow exponentially (1s, 2s, 4s, 8s)
 * - 'linear': Delays grow linearly (1s, 2s, 3s, 4s)
 * - 'fixed': Same delay for all retries (1s, 1s, 1s, 1s)
 *
 * @public
 * @since 2.0.0
 */
export type RetryStrategy = 'exponential' | 'linear' | 'fixed'

/**
 * Global execution settings
 *
 * @remarks
 * Inspired by GitHub Actions and Turborepo execution patterns.
 *
 * @public
 * @since 1.0.0
 */
export interface ExecutionSettings {
  /** Stop pipeline on first failure */
  failFast: boolean

  /** Maximum number of actions running in parallel */
  maxParallel: number

  /** Global timeout in milliseconds */
  timeout: number

  /** Number of retries for failed actions */
  retries: number

  /**
   * Retry strategy: exponential backoff, linear, or fixed delay
   *
   * @defaultValue 'exponential'
   * @since 2.0.0
   */
  retryStrategy?: RetryStrategy

  /**
   * Base delay in milliseconds between retries
   *
   * @defaultValue 1000 (1 second)
   * @since 2.0.0
   */
  retryDelay?: number
}

/**
 * Execution context passed to action runner
 *
 * @remarks
 * Provides callbacks and context for action execution.
 *
 * @public
 * @since 1.0.0
 */
export interface ExecutionContext {
  /** Project root path */
  projectPath: string

  /** Current Git branch ID for forensics logging */
  branchId?: string

  /** IPC interface for Electron backend */
  ipc: {
    invoke: (channel: string, ...args: unknown[]) => Promise<unknown>
  }

  /**
   * Callback when action starts
   *
   * @param action - Action that started
   */
  onActionStart?: (action: ActionDefinition) => void

  /**
   * Callback when action completes
   *
   * @param action - Action that completed
   * @param result - Execution result
   */
  onActionComplete?: (action: ActionDefinition, result: ActionResult) => void

  /**
   * Callback for progress updates
   *
   * @param action - Action in progress
   * @param progress - Progress percentage (0-100)
   */
  onActionProgress?: (action: ActionDefinition, progress: number) => void
}

/**
 * Command execution result from IPC
 *
 * @internal
 */
export interface CommandExecutionResult {
  /** Exit code (0 = success) */
  exitCode: number

  /** Standard output */
  stdout: string

  /** Standard error */
  stderr: string
}
