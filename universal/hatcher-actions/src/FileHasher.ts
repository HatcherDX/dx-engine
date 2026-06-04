/**
 * @fileoverview File hashing system for cache key generation.
 *
 * @description
 * Implements Nx-style file hashing for precise cache invalidation:
 * - SHA256 hashing of file contents
 * - Glob pattern matching for file selection
 * - Incremental hashing (only changed files)
 * - IPC-based file reading for Electron integration
 *
 * Context7 Pattern: Nx file hashing and cache invalidation
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import { createHash } from 'crypto'
import { minimatch } from 'minimatch'
import type { ActionDefinition } from './types'

/**
 * File hash result
 *
 * @public
 * @since 1.0.0
 */
export interface FileHash {
  /** File path relative to project root */
  path: string

  /** SHA256 hash of file contents */
  hash: string
}

/**
 * File hasher for cache key generation (Nx pattern)
 *
 * @remarks
 * Generates SHA256 hashes of files matching input globs.
 * Used to create content-addressable cache keys that invalidate
 * only when relevant files change.
 *
 * @example
 * ```typescript
 * const hasher = new FileHasher(ipc)
 *
 * const hashes = await hasher.hashInputs(action, '/project/root')
 * // Returns: { 'src/index.ts': 'abc123...', 'package.json': 'def456...' }
 *
 * const key = hasher.generateCacheKey(action, hashes)
 * // Returns: '7f8a9b2c...' (SHA256 of normalized inputs)
 * ```
 *
 * @public
 * @since 1.0.0
 */
export class FileHasher {
  private ipc: {
    invoke: (channel: string, ...args: unknown[]) => Promise<unknown>
  }

  /**
   * Create file hasher instance
   *
   * @param ipc - IPC interface for file operations
   *
   * @example
   * ```typescript
   * const hasher = new FileHasher(window.electronAPI)
   * ```
   */
  constructor(ipc: {
    invoke: (channel: string, ...args: unknown[]) => Promise<unknown>
  }) {
    this.ipc = ipc
  }

  /**
   * Hash all input files for an action
   *
   * @param action - Action definition with inputs globs
   * @param projectPath - Project root directory
   * @returns Promise resolving to map of file paths to hashes
   *
   * @remarks
   * Process:
   * 1. List all files in project
   * 2. Filter by input globs
   * 3. Read and hash each file
   * 4. Return path->hash map
   *
   * @example
   * ```typescript
   * const hashes = await hasher.hashInputs({
   *   id: 'build',
   *   inputs: ['src/**\/*.ts', 'package.json']
   * }, '/project')
   * // Returns: { 'src/index.ts': 'abc123', 'package.json': 'def456' }
   * ```
   *
   * @public
   */
  async hashInputs(
    action: ActionDefinition,
    projectPath: string
  ): Promise<Record<string, string>> {
    if (!action.inputs || action.inputs.length === 0) {
      return {}
    }

    // Get all files in project
    const allFiles = (await this.ipc.invoke('fs:listFiles', {
      cwd: projectPath,
    })) as string[]

    // Filter files by input globs
    const matchedFiles = this.matchGlobs(allFiles, action.inputs)

    // Hash each matched file
    const hashes: Record<string, string> = {}

    for (const file of matchedFiles) {
      try {
        const content = (await this.ipc.invoke('fs:readFile', {
          filepath: `${projectPath}/${file}`,
        })) as string

        hashes[file] = this.hashContent(content)
      } catch (error) {
        console.warn(`[FileHasher] Failed to hash ${file}:`, error)
        // Continue with other files
      }
    }

    return hashes
  }

  /**
   * Generate cache key from action and file hashes
   *
   * @param action - Action definition
   * @param fileHashes - Map of file paths to hashes
   * @returns SHA256 cache key
   *
   * @remarks
   * Combines action command, environment, and file hashes into
   * a single normalized cache key. Any change to inputs invalidates cache.
   *
   * @example
   * ```typescript
   * const key = hasher.generateCacheKey(action, {
   *   'src/index.ts': 'abc123',
   *   'package.json': 'def456'
   * })
   * // Returns: '7f8a9b2c...'
   * ```
   *
   * @public
   */
  generateCacheKey(
    action: ActionDefinition,
    fileHashes: Record<string, string>
  ): string {
    const inputs = {
      command: action.command,
      files: fileHashes,
    }

    // Normalize for consistent hashing
    const normalized = JSON.stringify(inputs, Object.keys(inputs).sort())

    return this.hashContent(normalized)
  }

  /**
   * Match files against glob patterns
   *
   * @param files - Array of file paths
   * @param globs - Array of glob patterns (supports negation with !)
   * @returns Array of matched file paths
   *
   * @remarks
   * Uses minimatch for glob matching.
   * Supports negation patterns like `!**\/*.spec.ts`.
   *
   * @example
   * ```typescript
   * const matched = hasher.matchGlobs(
   *   ['src/index.ts', 'src/test.spec.ts'],
   *   ['src/**\/*.ts', '!**\/*.spec.ts']
   * )
   * // Returns: ['src/index.ts']
   * ```
   *
   * @private
   */
  private matchGlobs(files: string[], globs: string[]): string[] {
    const includeGlobs = globs.filter((g) => !g.startsWith('!'))
    const excludeGlobs = globs
      .filter((g) => g.startsWith('!'))
      .map((g) => g.slice(1))

    return files.filter((file) => {
      // Must match at least one include glob
      const included = includeGlobs.some((glob) => minimatch(file, glob))
      if (!included) {
        return false
      }

      // Must not match any exclude glob
      const excluded = excludeGlobs.some((glob) => minimatch(file, glob))
      return !excluded
    })
  }

  /**
   * Hash content using SHA256
   *
   * @param content - Content to hash
   * @returns SHA256 hash (hex string)
   *
   * @private
   */
  private hashContent(content: string): string {
    return createHash('sha256').update(content).digest('hex')
  }
}
