/**
 * @fileoverview Action scheduler with parallel execution and retry logic.
 *
 * @description
 * Schedules and executes actions based on dependency graph with:
 * - Level-based parallel execution (Turborepo pattern)
 * - Retry with exponential backoff (GitHub Actions pattern)
 * - Fail-fast support
 * - Forensic logging
 *
 * Context7 Patterns:
 * - Turborepo: Parallel execution within dependency levels
 * - GitHub Actions: Retry with exponential backoff
 * - Nx: Topological sort and dependency resolution
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import type {
  ActionDefinition,
  ActionResult,
  ExecutionContext,
  ExecutionSettings,
  RetryStrategy,
} from './types'

/**
 * Action scheduler with level-based parallel execution
 *
 * @remarks
 * Implements Turborepo-style parallel execution within dependency levels.
 * Automatically groups actions by dependency depth and executes in waves.
 *
 * @example
 * ```typescript
 * const scheduler = new ActionScheduler(actions, settings)
 * const results = await scheduler.execute(context)
 * ```
 *
 * @public
 * @since 1.0.0
 */
export class ActionScheduler {
  private actions: Map<string, ActionDefinition>
  private settings: ExecutionSettings

  /**
   * Create action scheduler
   *
   * @param actions - Array of action definitions
   * @param settings - Execution settings
   *
   * @remarks
   * Expands pipeline dependencies (Turborepo pattern) during initialization.
   * `dependsOn: ['^build']` is expanded to all dependencies' build tasks.
   */
  constructor(actions: ActionDefinition[], settings: ExecutionSettings) {
    this.actions = new Map(actions.map((a) => [a.id, a]))
    this.settings = settings

    // Expand pipeline dependencies (Turborepo pattern)
    this.expandPipelineDependencies()
  }

  /**
   * Expand pipeline dependencies (Turborepo pattern)
   *
   * @remarks
   * Converts `dependsOn: ['^build']` to explicit dependencies:
   * - `^build` means "all workspace dependencies' build tasks"
   * - Regular deps like `lint` remain unchanged
   * - Combines with existing `dependencies` field
   *
   * @example
   * ```typescript
   * // Before expansion:
   * {
   *   id: 'test-web',
   *   dependsOn: ['^build', 'lint'],
   *   dependencies: []
   * }
   *
   * // After expansion (if web depends on storage):
   * {
   *   id: 'test-web',
   *   dependsOn: ['^build', 'lint'],
   *   dependencies: ['build-storage', 'lint']  // Expanded
   * }
   * ```
   *
   * @private
   */
  private expandPipelineDependencies(): void {
    this.actions.forEach((action) => {
      if (!action.dependsOn || action.dependsOn.length === 0) {
        return
      }

      const expandedDeps = new Set<string>(action.dependencies || [])

      action.dependsOn.forEach((dep) => {
        if (dep.startsWith('^')) {
          // Pipeline dependency: add all workspace deps' matching tasks
          const taskName = dep.slice(1) // Remove '^' prefix

          // Find all actions with this task name
          this.actions.forEach((otherAction) => {
            if (
              otherAction.id !== action.id &&
              otherAction.id.endsWith(taskName)
            ) {
              expandedDeps.add(otherAction.id)
            }
          })
        } else {
          // Regular dependency: add directly
          expandedDeps.add(dep)
        }
      })

      // Update action with expanded dependencies
      action.dependencies = Array.from(expandedDeps)
    })
  }

  /**
   * Execute all actions according to dependency graph
   *
   * @param context - Execution context with callbacks
   * @returns Promise resolving to array of action results
   *
   * @remarks
   * Implements Turborepo-style level-based parallel execution:
   * - Groups actions by dependency level
   * - Executes all actions at same level in parallel
   * - Waits for entire level to complete before next level
   * - Respects maxParallel setting with Promise pooling
   *
   * @example
   * ```typescript
   * // Level 0: [lint, format] - run in parallel
   * // Level 1: [test] - run after level 0 completes
   * // Level 2: [build] - run after level 1 completes
   * const results = await scheduler.execute(context)
   * ```
   *
   * @public
   */
  async execute(context: ExecutionContext): Promise<ActionResult[]> {
    const results: ActionResult[] = []
    const failedActions = new Set<string>()
    const resultMap = new Map<string, ActionResult>()

    // Get execution levels (grouped by dependency depth)
    const levels = this.getExecutionOrder()

    // Execute level by level (Turborepo pattern)
    for (const levelActions of levels) {
      // Check if we should skip this level due to fail-fast
      if (this.settings.failFast && failedActions.size > 0) {
        // Skip all remaining actions
        for (const actionId of levelActions) {
          const action = this.actions.get(actionId)!
          const result: ActionResult = {
            actionId: action.id,
            status: 'skipped',
            duration: 0,
            startTime: Date.now(),
            endTime: Date.now(),
            error: 'Skipped due to failed dependencies',
          }
          resultMap.set(actionId, result)
          results.push(result)
        }
        continue
      }

      // Execute all actions in this level in parallel (up to maxParallel)
      const levelResults = await this.executeActionsInParallel(
        levelActions,
        context,
        failedActions
      )

      // Store results
      levelResults.forEach((result) => {
        resultMap.set(result.actionId, result)
        results.push(result)

        if (result.status === 'failed') {
          failedActions.add(result.actionId)
        }
      })
    }

    return results
  }

  /**
   * Execute multiple actions in parallel with maxParallel limit
   *
   * @param actionIds - Array of action IDs to execute
   * @param context - Execution context
   * @param failedActions - Set of already failed actions
   * @returns Promise resolving to array of results
   *
   * @remarks
   * Implements Promise pooling to respect maxParallel setting.
   * Uses GitHub Actions-style retry logic with exponential backoff.
   *
   * @private
   */
  private async executeActionsInParallel(
    actionIds: string[],
    context: ExecutionContext,
    failedActions: Set<string>
  ): Promise<ActionResult[]> {
    const results: ActionResult[] = []
    const queue = [...actionIds]
    const executing: Promise<ActionResult>[] = []

    while (queue.length > 0 || executing.length > 0) {
      // Start new actions up to maxParallel limit
      while (queue.length > 0 && executing.length < this.settings.maxParallel) {
        const actionId = queue.shift()!
        const action = this.actions.get(actionId)!

        // Check if dependencies failed (fail-fast)
        if (this.settings.failFast) {
          const hasFailedDependency = action.dependencies.some((depId) =>
            failedActions.has(depId)
          )

          if (hasFailedDependency) {
            results.push({
              actionId: action.id,
              status: 'skipped',
              duration: 0,
              startTime: Date.now(),
              endTime: Date.now(),
              error: 'Skipped due to failed dependencies',
            })
            continue
          }
        }

        // Execute action with retry logic
        const promise = this.executeActionWithRetry(action, context).then(
          (result) => {
            // Remove from executing pool
            const index = executing.indexOf(promise)
            if (index > -1) {
              executing.splice(index, 1)
            }
            return result
          }
        )

        executing.push(promise)
      }

      // Wait for at least one action to complete
      if (executing.length > 0) {
        const result = await Promise.race(executing)
        results.push(result)
      }
    }

    return results
  }

  /**
   * Execute action with retry logic (GitHub Actions pattern)
   *
   * @param action - Action to execute
   * @param context - Execution context
   * @returns Promise resolving to action result
   *
   * @remarks
   * Implements retry strategies:
   * - Exponential: 1s, 2s, 4s, 8s (default)
   * - Linear: 1s, 2s, 3s, 4s
   * - Fixed: 1s, 1s, 1s, 1s
   *
   * @example
   * ```typescript
   * // With 3 retries and exponential backoff:
   * // Attempt 1: Execute immediately
   * // Attempt 2: Wait 1s, then execute
   * // Attempt 3: Wait 2s, then execute
   * // Attempt 4: Wait 4s, then execute
   * ```
   *
   * @private
   */
  private async executeActionWithRetry(
    action: ActionDefinition,
    context: ExecutionContext
  ): Promise<ActionResult> {
    const maxAttempts = this.settings.retries + 1 // Initial attempt + retries
    const retryStrategy = this.settings.retryStrategy || 'exponential'
    const baseDelay = this.settings.retryDelay || 1000

    let lastResult: ActionResult | null = null

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      // Execute action
      const result = await this.executeAction(action, context)

      // Success - return immediately
      if (result.status === 'success') {
        return result
      }

      // Store result for potential retry
      lastResult = result

      // No more retries - return last result
      if (attempt >= maxAttempts) {
        return result
      }

      // Calculate retry delay
      const delay = this.calculateRetryDelay(attempt, retryStrategy, baseDelay)

      // Wait before retry
      console.log(
        `Action "${action.id}" failed (attempt ${attempt}/${maxAttempts}). Retrying in ${delay}ms...`
      )
      await new Promise((resolve) => setTimeout(resolve, delay))
    }

    // Should never reach here, but TypeScript needs it
    return lastResult!
  }

  /**
   * Calculate retry delay based on strategy
   *
   * @param attempt - Current attempt number (1-based)
   * @param strategy - Retry strategy
   * @param baseDelay - Base delay in milliseconds
   * @returns Delay in milliseconds
   *
   * @private
   */
  private calculateRetryDelay(
    attempt: number,
    strategy: RetryStrategy,
    baseDelay: number
  ): number {
    switch (strategy) {
      case 'exponential':
        // 1s, 2s, 4s, 8s
        return baseDelay * Math.pow(2, attempt - 1)
      case 'linear':
        // 1s, 2s, 3s, 4s
        return baseDelay * attempt
      case 'fixed':
        // 1s, 1s, 1s, 1s
        return baseDelay
    }
  }

  /**
   * Execute single action
   *
   * @param action - Action to execute
   * @param context - Execution context
   * @returns Promise resolving to action result
   *
   * @private
   */
  private async executeAction(
    action: ActionDefinition,
    context: ExecutionContext
  ): Promise<ActionResult> {
    const startTime = Date.now()

    // Notify start
    context.onActionStart?.(action)

    try {
      // Execute command via IPC
      const commandResult = (await context.ipc.invoke('actions:execute', {
        command: action.command,
        cwd: context.projectPath,
      })) as {
        exitCode: number
        stdout: string
        stderr: string
      }

      const endTime = Date.now()
      const result: ActionResult = {
        actionId: action.id,
        status: commandResult.exitCode === 0 ? 'success' : 'failed',
        duration: endTime - startTime,
        output: commandResult.stdout,
        error: commandResult.stderr || undefined,
        exitCode: commandResult.exitCode,
        startTime,
        endTime,
      }

      // Notify completion
      context.onActionComplete?.(action, result)

      return result
    } catch (error) {
      const endTime = Date.now()
      const result: ActionResult = {
        actionId: action.id,
        status: 'failed',
        duration: endTime - startTime,
        error:
          error instanceof Error ? error.message : 'Unknown error occurred',
        startTime,
        endTime,
      }

      context.onActionComplete?.(action, result)

      return result
    }
  }

  /**
   * Get execution order (for debugging/visualization)
   *
   * @returns Array of action IDs in execution order
   *
   * @remarks
   * Performs topological sort on the dependency graph.
   * Actions at the same level (can run in parallel) are grouped.
   *
   * @public
   */
  getExecutionOrder(): string[][] {
    const levels: string[][] = []

    const getLevel = (actionId: string): number => {
      const action = this.actions.get(actionId)
      if (!action || action.dependencies.length === 0) {
        return 0
      }

      return (
        Math.max(...action.dependencies.map((depId) => getLevel(depId))) + 1
      )
    }

    // Group actions by level
    this.actions.forEach((action) => {
      const level = getLevel(action.id)

      if (!levels[level]) {
        levels[level] = []
      }

      levels[level].push(action.id)
    })

    return levels.filter((level) => level.length > 0)
  }

  /**
   * Validate action dependencies
   *
   * @returns Validation result with errors if any
   *
   * @public
   */
  validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    // Check all dependencies exist
    this.actions.forEach((action) => {
      action.dependencies.forEach((depId) => {
        if (!this.actions.has(depId)) {
          errors.push(
            `Action "${action.id}" depends on non-existent action "${depId}"`
          )
        }
      })
    })

    // Check for circular dependencies (already done in ActionLoader, but double-check)
    try {
      this.detectCircularDependencies()
    } catch (error) {
      if (error instanceof Error) {
        errors.push(error.message)
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  }

  /**
   * Detect circular dependencies
   *
   * @throws {@link Error}
   * Thrown when circular dependency is detected
   *
   * @private
   */
  private detectCircularDependencies(): void {
    const _visited = new Set<string>()
    const recursionStack = new Set<string>()

    const visit = (actionId: string, path: string[] = []): void => {
      if (recursionStack.has(actionId)) {
        const cycle = [...path, actionId].join(' -> ')
        throw new Error(`Circular dependency detected: ${cycle}`)
      }

      if (_visited.has(actionId)) {
        return
      }

      _visited.add(actionId)
      recursionStack.add(actionId)

      const action = this.actions.get(actionId)
      if (action?.dependencies) {
        for (const depId of action.dependencies) {
          visit(depId, [...path, actionId])
        }
      }

      recursionStack.delete(actionId)
    }

    this.actions.forEach((_, actionId) => {
      if (!_visited.has(actionId)) {
        visit(actionId)
      }
    })
  }
}
