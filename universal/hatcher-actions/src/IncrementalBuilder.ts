/**
 * @fileoverview Incremental build system for skipping unchanged actions.
 *
 * @description
 * Implements Turborepo-style incremental builds:
 * - Track input/output file hashes
 * - Skip actions when inputs unchanged and outputs exist
 * - Persistent cache across runs
 * - Automatic dependency tracking
 *
 * Context7 Pattern: Turborepo incremental builds
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import type { ActionDefinition } from './types'
import type { FileHasher } from './FileHasher'

/**
 * Build metadata for incremental tracking
 *
 * @internal
 */
interface BuildMetadata {
  /** Action ID */
  actionId: string

  /** Input file hashes at last build */
  inputHashes: Record<string, string>

  /** Output file hashes at last build */
  outputHashes: Record<string, string>

  /** Timestamp of last build */
  lastBuildTime: number

  /** Hash of action command */
  commandHash: string
}

/**
 * Incremental builder for skipping unchanged actions (Turborepo pattern)
 *
 * @remarks
 * Determines if action needs to run by comparing:
 * - Current input hashes vs last build input hashes
 * - Existence of output files
 * - Action command changes
 *
 * @example
 * ```typescript
 * const builder = new IncrementalBuilder(hasher, ipc)
 *
 * // Check if action needs to run
 * const needsRebuild = await builder.needsRebuild(action, '/project')
 *
 * if (!needsRebuild) {
 *   console.log('Skipping - no changes detected')
 *   return cachedResult
 * }
 *
 * // Execute action...
 * const result = await execute(action)
 *
 * // Record successful build
 * await builder.recordBuild(action, '/project')
 * ```
 *
 * @public
 * @since 1.0.0
 */
export class IncrementalBuilder {
  private hasher: FileHasher
  private ipc: {
    invoke: (channel: string, ...args: unknown[]) => Promise<unknown>
  }
  private metadata: Map<string, BuildMetadata>

  /**
   * Create incremental builder instance
   *
   * @param hasher - File hasher for input/output tracking
   * @param ipc - IPC interface for file operations
   *
   * @example
   * ```typescript
   * const hasher = new FileHasher(window.electronAPI)
   * const builder = new IncrementalBuilder(hasher, window.electronAPI)
   * ```
   */
  constructor(
    hasher: FileHasher,
    ipc: {
      invoke: (channel: string, ...args: unknown[]) => Promise<unknown>
    }
  ) {
    this.hasher = hasher
    this.ipc = ipc
    this.metadata = new Map()
  }

  /**
   * Check if action needs to be rebuilt
   *
   * @param action - Action definition
   * @param projectPath - Project root directory
   * @returns Promise resolving to true if rebuild needed, false if can skip
   *
   * @remarks
   * Rebuild is needed if:
   * - No previous build metadata exists
   * - Input files changed (hash mismatch)
   * - Output files missing
   * - Action command changed
   *
   * @example
   * ```typescript
   * const needsRebuild = await builder.needsRebuild(action, '/project')
   * if (!needsRebuild) {
   *   return { status: 'skipped', message: 'No changes detected' }
   * }
   * ```
   *
   * @public
   */
  async needsRebuild(
    action: ActionDefinition,
    projectPath: string
  ): Promise<boolean> {
    // Actions without inputs/outputs always run
    if (!action.inputs || !action.outputs) {
      return true
    }

    // Get previous build metadata
    const prevMetadata = this.metadata.get(action.id)
    if (!prevMetadata) {
      console.log(`[IncrementalBuilder] No previous build for ${action.id}`)
      return true
    }

    // Check if command changed
    const currentCommandHash = this.hashString(action.command)
    if (currentCommandHash !== prevMetadata.commandHash) {
      console.log(`[IncrementalBuilder] Command changed for ${action.id}`)
      return true
    }

    // Hash current inputs
    const currentInputHashes = await this.hasher.hashInputs(action, projectPath)

    // Check if inputs changed
    if (!this.hashesMatch(currentInputHashes, prevMetadata.inputHashes)) {
      console.log(`[IncrementalBuilder] Inputs changed for ${action.id}`)
      return true
    }

    // Check if outputs exist
    const outputsExist = await this.checkOutputsExist(action, projectPath)
    if (!outputsExist) {
      console.log(`[IncrementalBuilder] Outputs missing for ${action.id}`)
      return true
    }

    // All checks passed - can skip rebuild
    console.log(
      `[IncrementalBuilder] Skipping ${action.id} - no changes detected`
    )
    return false
  }

  /**
   * Record successful build metadata
   *
   * @param action - Action definition
   * @param projectPath - Project root directory
   *
   * @remarks
   * Should be called after successful action execution to update metadata.
   *
   * @example
   * ```typescript
   * // Execute action
   * const result = await execute(action)
   *
   * // Record build metadata
   * await builder.recordBuild(action, '/project')
   * ```
   *
   * @public
   */
  async recordBuild(
    action: ActionDefinition,
    projectPath: string
  ): Promise<void> {
    if (!action.inputs || !action.outputs) {
      return
    }

    // Hash inputs and outputs
    const inputHashes = await this.hasher.hashInputs(action, projectPath)
    const outputHashes = await this.hashOutputs(action, projectPath)

    // Store metadata
    this.metadata.set(action.id, {
      actionId: action.id,
      inputHashes,
      outputHashes,
      lastBuildTime: Date.now(),
      commandHash: this.hashString(action.command),
    })

    console.log(`[IncrementalBuilder] Recorded build for ${action.id}`)
  }

  /**
   * Load build metadata from persistent storage
   *
   * @param projectPath - Project root directory
   * @returns Promise resolving when metadata is loaded
   *
   * @remarks
   * Loads metadata from `.hatcher/build-cache.json`.
   * Should be called once at initialization.
   *
   * @public
   */
  async loadMetadata(projectPath: string): Promise<void> {
    try {
      const metadataPath = `${projectPath}/.hatcher/build-cache.json`
      const content = (await this.ipc.invoke('fs:readFile', {
        filepath: metadataPath,
      })) as string

      const data = JSON.parse(content) as Record<string, BuildMetadata>

      this.metadata.clear()
      Object.entries(data).forEach(([key, value]) => {
        this.metadata.set(key, value)
      })

      console.log(
        `[IncrementalBuilder] Loaded metadata for ${this.metadata.size} actions`
      )
    } catch (_error) {
      // File doesn't exist or invalid - start fresh
      console.log('[IncrementalBuilder] No previous metadata found')
      this.metadata.clear()
    }
  }

  /**
   * Save build metadata to persistent storage
   *
   * @param projectPath - Project root directory
   * @returns Promise resolving when metadata is saved
   *
   * @remarks
   * Saves metadata to `.hatcher/build-cache.json`.
   * Should be called after all builds complete.
   *
   * @public
   */
  async saveMetadata(projectPath: string): Promise<void> {
    try {
      const metadataPath = `${projectPath}/.hatcher/build-cache.json`
      const data = Object.fromEntries(this.metadata.entries())

      await this.ipc.invoke('fs:writeFile', {
        filepath: metadataPath,
        content: JSON.stringify(data, null, 2),
      })

      console.log(
        `[IncrementalBuilder] Saved metadata for ${this.metadata.size} actions`
      )
    } catch (error) {
      console.error('[IncrementalBuilder] Failed to save metadata:', error)
    }
  }

  /**
   * Clear all build metadata
   *
   * @remarks
   * Forces full rebuild on next execution.
   *
   * @public
   */
  clearMetadata(): void {
    this.metadata.clear()
    console.log('[IncrementalBuilder] Metadata cleared')
  }

  /**
   * Hash output files for action
   *
   * @param action - Action definition
   * @param projectPath - Project root directory
   * @returns Promise resolving to map of output paths to hashes
   *
   * @private
   */
  private async hashOutputs(
    action: ActionDefinition,
    projectPath: string
  ): Promise<Record<string, string>> {
    if (!action.outputs) {
      return {}
    }

    const hashes: Record<string, string> = {}

    // Get all files matching output globs
    const allFiles = (await this.ipc.invoke('fs:listFiles', {
      cwd: projectPath,
    })) as string[]

    for (const file of allFiles) {
      for (const outputGlob of action.outputs) {
        if (this.matchGlob(file, outputGlob)) {
          try {
            const content = (await this.ipc.invoke('fs:readFile', {
              filepath: `${projectPath}/${file}`,
            })) as string

            hashes[file] = this.hashString(content)
          } catch (error) {
            console.warn(
              `[IncrementalBuilder] Failed to hash output ${file}:`,
              error
            )
          }
        }
      }
    }

    return hashes
  }

  /**
   * Check if all output files exist
   *
   * @param action - Action definition
   * @param projectPath - Project root directory
   * @returns Promise resolving to true if all outputs exist
   *
   * @private
   */
  private async checkOutputsExist(
    action: ActionDefinition,
    projectPath: string
  ): Promise<boolean> {
    if (!action.outputs) {
      return true
    }

    const prevMetadata = this.metadata.get(action.id)
    if (!prevMetadata) {
      return false
    }

    // Check that all previously recorded outputs still exist
    for (const outputPath of Object.keys(prevMetadata.outputHashes)) {
      try {
        await this.ipc.invoke('fs:stat', {
          filepath: `${projectPath}/${outputPath}`,
        })
      } catch {
        // File doesn't exist
        return false
      }
    }

    return true
  }

  /**
   * Compare two hash maps for equality
   *
   * @param current - Current hashes
   * @param previous - Previous hashes
   * @returns True if hashes match
   *
   * @private
   */
  private hashesMatch(
    current: Record<string, string>,
    previous: Record<string, string>
  ): boolean {
    const currentKeys = Object.keys(current).sort()
    const previousKeys = Object.keys(previous).sort()

    // Different file count
    if (currentKeys.length !== previousKeys.length) {
      return false
    }

    // Different files
    if (currentKeys.join(',') !== previousKeys.join(',')) {
      return false
    }

    // Different hashes
    for (const key of currentKeys) {
      if (current[key] !== previous[key]) {
        return false
      }
    }

    return true
  }

  /**
   * Simple glob matching (minimatch alternative)
   *
   * @param path - File path
   * @param glob - Glob pattern
   * @returns True if path matches glob
   *
   * @private
   */
  private matchGlob(path: string, glob: string): boolean {
    // Convert glob to regex (simple implementation)
    const regex = new RegExp(
      '^' +
        glob
          .replace(/\./g, '\\.')
          .replace(/\*\*/g, '.*')
          .replace(/\*/g, '[^/]*') +
        '$'
    )

    return regex.test(path)
  }

  /**
   * Hash string using SHA256
   *
   * @param content - Content to hash
   * @returns SHA256 hash (hex string)
   *
   * @private
   */
  private hashString(content: string): string {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const crypto = require('crypto')
    return crypto.createHash('sha256').update(content).digest('hex')
  }
}
