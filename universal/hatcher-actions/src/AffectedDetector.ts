/**
 * @fileoverview Detects affected actions based on Git diff (Nx pattern).
 *
 * @description
 * Implements Nx-style affected command logic:
 * - Compares Git diff between base and head
 * - Matches changed files against action `affectedBy` globs
 * - Returns only actions that need to run
 *
 * Context7 Pattern: Nx affected commands for incremental builds
 *
 * @author Hatcher DX Team
 * @since 2.0.0
 * @public
 */

import { minimatch } from 'minimatch'
import type { ActionDefinition } from './types'

/**
 * Git diff result from IPC
 *
 * @internal
 */
interface GitDiffResult {
  /** Array of changed file paths */
  changedFiles: string[]
}

/**
 * Detects affected actions based on Git diff
 *
 * @remarks
 * Mirrors Nx's affected command logic - only runs actions
 * whose `affectedBy` globs match changed files.
 *
 * This can reduce CI execution time by 90% by skipping
 * actions that don't need to run based on file changes.
 *
 * @example
 * ```typescript
 * const detector = new AffectedDetector(actions, ipc)
 * const affected = await detector.getAffectedActions('main', 'HEAD')
 * // Returns: ['test-web', 'lint-web'] (if apps/web/ changed)
 * ```
 *
 * @public
 * @since 2.0.0
 */
export class AffectedDetector {
  private actions: Map<string, ActionDefinition>
  private ipc: {
    invoke: (channel: string, ...args: unknown[]) => Promise<unknown>
  }

  /**
   * Create affected detector
   *
   * @param actions - Array of action definitions
   * @param ipc - IPC interface for Git operations
   */
  constructor(
    actions: ActionDefinition[],
    ipc: {
      invoke: (channel: string, ...args: unknown[]) => Promise<unknown>
    }
  ) {
    this.actions = new Map(actions.map((a) => [a.id, a]))
    this.ipc = ipc
  }

  /**
   * Get affected actions based on Git diff
   *
   * @param base - Base Git ref (e.g., 'main', 'origin/main')
   * @param head - Head Git ref (e.g., 'HEAD', 'feature-branch')
   * @returns Promise resolving to array of affected action IDs
   *
   * @example
   * ```typescript
   * // Compare current branch against main
   * const affected = await detector.getAffectedActions('main', 'HEAD')
   *
   * // Compare between two commits
   * const affected = await detector.getAffectedActions('abc123', 'def456')
   * ```
   *
   * @public
   */
  async getAffectedActions(base: string, head: string): Promise<string[]> {
    // Get changed files from Git
    const changedFiles = await this.getChangedFiles(base, head)

    if (changedFiles.length === 0) {
      // No changes - no actions affected
      return []
    }

    // Find actions affected by changed files
    const affectedIds: string[] = []

    this.actions.forEach((action) => {
      if (this.isActionAffected(action, changedFiles)) {
        affectedIds.push(action.id)
      }
    })

    return affectedIds
  }

  /**
   * Get changed files between Git refs
   *
   * @param base - Base Git ref
   * @param head - Head Git ref
   * @returns Promise resolving to array of changed file paths
   *
   * @private
   */
  private async getChangedFiles(base: string, head: string): Promise<string[]> {
    try {
      const result = (await this.ipc.invoke('git:diff', {
        base,
        head,
      })) as GitDiffResult

      return result.changedFiles
    } catch (error) {
      console.error('Failed to get Git diff:', error)
      // On error, return empty array (assumes no files changed)
      return []
    }
  }

  /**
   * Check if action is affected by changed files
   *
   * @param action - Action definition
   * @param changedFiles - Array of changed file paths
   * @returns True if action is affected
   *
   * @remarks
   * An action is affected if:
   * 1. It has no `affectedBy` globs (always runs)
   * 2. Any changed file matches any `affectedBy` glob
   *
   * @private
   */
  private isActionAffected(
    action: ActionDefinition,
    changedFiles: string[]
  ): boolean {
    // No affectedBy config - always affected (backward compatibility)
    if (!action.affectedBy || action.affectedBy.length === 0) {
      return true
    }

    // Check if any changed file matches any glob
    return changedFiles.some((filePath) =>
      action.affectedBy!.some((glob) => minimatch(filePath, glob))
    )
  }

  /**
   * Get all affected actions including dependencies
   *
   * @param base - Base Git ref
   * @param head - Head Git ref
   * @returns Promise resolving to array of action IDs (affected + dependencies)
   *
   * @remarks
   * Expands affected actions to include all their dependencies.
   * If 'test-web' is affected and depends on 'lint-web',
   * both will be returned.
   *
   * @example
   * ```typescript
   * // Get affected actions with dependencies
   * const withDeps = await detector.getAffectedActionsWithDependencies('main', 'HEAD')
   * // Returns: ['lint-web', 'test-web', 'build-web']
   * ```
   *
   * @public
   */
  async getAffectedActionsWithDependencies(
    base: string,
    head: string
  ): Promise<string[]> {
    const directlyAffected = await this.getAffectedActions(base, head)

    // Expand to include dependencies
    const allAffected = new Set<string>()

    const addActionAndDependencies = (actionId: string): void => {
      if (allAffected.has(actionId)) {
        return
      }

      allAffected.add(actionId)

      const action = this.actions.get(actionId)
      if (action?.dependencies) {
        action.dependencies.forEach((depId) => {
          addActionAndDependencies(depId)
        })
      }
    }

    directlyAffected.forEach((actionId) => {
      addActionAndDependencies(actionId)
    })

    return Array.from(allAffected)
  }
}
