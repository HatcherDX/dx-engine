/**
 * @fileoverview Repository manager for handling multiple Git repositories.
 *
 * @description
 * The RepositoryManager provides centralized management of multiple Git repositories,
 * including project opening, instance lifecycle, and coordination between repositories.
 * It integrates with the "Open Project" functionality and manages repository state.
 *
 * @example
 * ```typescript
 * const manager = new RepositoryManager()
 *
 * // Open a project via "Open Project" button
 * const repo = await manager.openRepository('/path/to/project')
 * console.log(`Opened repository: ${repo.metadata.config.name}`)
 *
 * // Get active repository
 * const active = manager.getActiveRepository()
 * if (active) {
 *   const status = await active.engine.getStatus()
 * }
 * ```
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import { EventEmitter } from 'events'
import { v4 as uuidv4 } from 'uuid'
import { GitEngine } from './GitEngine'
import { CacheManager } from '../cache/CacheManager'
import type {
  RepositoryConfig,
  RepositoryMetadata,
  RepositoryOperationResult,
  RepositoryStatus,
} from '../types/repository'
import type { GitGeniusConfig, ErrorCode } from '../types'

/**
 * Repository instance containing engine and metadata.
 *
 * @public
 */
export interface RepositoryInstance {
  /**
   * Repository metadata
   */
  metadata: RepositoryMetadata

  /**
   * Git engine for operations
   */
  engine: GitEngine

  /**
   * File system watcher for real-time updates
   */
  watcher?: { close: () => void } // TODO: Add proper file watcher type

  /**
   * Last activity timestamp
   */
  lastActivity: number
}

/**
 * Repository manager configuration options.
 *
 * @public
 */
export interface RepositoryManagerConfig {
  /**
   * Maximum number of concurrent repositories
   * @default 5
   */
  maxConcurrentRepos?: number

  /**
   * Auto-cleanup inactive repositories after this time (ms)
   * @default 1800000 (30 minutes)
   */
  inactiveCleanupTime?: number

  /**
   * Enable file system watching for real-time updates
   * @default true
   */
  enableFileWatching?: boolean

  /**
   * Global cache configuration
   */
  globalCache?: {
    /**
     * Enable shared cache across repositories
     * @default true
     */
    shared?: boolean

    /**
     * Cache configuration
     */
    config?: unknown // CacheConfig reference
  }

  /**
   * Default repository configuration
   */
  defaultRepoConfig?: Partial<RepositoryConfig>
}

/**
 * Repository manager for handling multiple Git repositories with Timeline mode support.
 *
 * @remarks
 * The RepositoryManager coordinates multiple repository instances, manages their lifecycle,
 * and provides integration with the "Open Project" functionality. It ensures optimal
 * resource usage and maintains repository state for the Timeline mode UI.
 *
 * @public
 */
export class RepositoryManager extends EventEmitter {
  /** Manager configuration */
  private readonly config: Required<RepositoryManagerConfig>

  /** Active repository instances */
  private readonly repositories = new Map<string, RepositoryInstance>()

  /** Currently active repository ID */
  private activeRepositoryId?: string

  /** Global cache manager */
  private readonly globalCache: CacheManager

  /** Cleanup timer for inactive repositories */
  private cleanupTimer?: NodeJS.Timeout

  /** File system watcher instances */
  private readonly watchers = new Map<string, { close: () => void }>()

  /**
   * Creates a new RepositoryManager instance.
   *
   * @param config - Manager configuration options
   * @param globalConfig - Global Git Genius configuration
   *
   * @example
   * ```typescript
   * const manager = new RepositoryManager({
   *   maxConcurrentRepos: 10,
   *   enableFileWatching: true
   * })
   * ```
   */
  constructor(
    config: RepositoryManagerConfig = {},
    globalConfig?: GitGeniusConfig
  ) {
    super()

    this.config = {
      maxConcurrentRepos: config.maxConcurrentRepos ?? 5,
      inactiveCleanupTime: config.inactiveCleanupTime ?? 1800000, // 30 minutes
      enableFileWatching: config.enableFileWatching ?? true,
      globalCache: {
        shared: config.globalCache?.shared ?? true,
        config: config.globalCache?.config ?? globalConfig?.cache,
      },
      defaultRepoConfig: config.defaultRepoConfig ?? {},
    }

    // Initialize global cache
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.globalCache = new CacheManager(this.config.globalCache.config as any)

    // Start cleanup timer
    this.startCleanupTimer()

    // Set up cache event forwarding
    this.globalCache.on('cache-event', (event) => {
      this.emit('cache-event', event)
    })
  }

  /**
   * Opens a repository from the given path (typically from "Open Project" button).
   *
   * @param repositoryPath - Absolute path to the repository root
   * @param config - Optional repository configuration
   * @returns Promise resolving to repository operation result
   *
   * @throws {@link GitGeniusError} When repository cannot be opened
   *
   * @example
   * ```typescript
   * // Typically called when user clicks "Open Project"
   * const result = await manager.openRepository('/path/to/project')
   * if (result.success) {
   *   console.log(`Opened: ${result.data.metadata.config.name}`)
   * }
   * ```
   */
  async openRepository(
    repositoryPath: string,
    config: Partial<RepositoryConfig> = {}
  ): Promise<RepositoryOperationResult<RepositoryInstance>> {
    const startTime = Date.now()

    try {
      // Check if repository is already open
      const existingId = this.findRepositoryByPath(repositoryPath)
      if (existingId) {
        const existing = this.repositories.get(existingId)!
        existing.lastActivity = Date.now()
        this.setActiveRepository(existingId)

        return {
          success: true,
          data: existing,
          executionTime: Date.now() - startTime,
        }
      }

      // Check concurrent repository limit
      if (this.repositories.size >= this.config.maxConcurrentRepos) {
        await this.cleanupOldestRepository()
      }

      // Merge configuration
      const fullConfig: RepositoryConfig = {
        ...this.config.defaultRepoConfig,
        ...config,
        path: repositoryPath,
        name: config.name ?? this.extractProjectName(repositoryPath),
      }

      // Create repository instance
      const repositoryId = uuidv4()
      const engine = new GitEngine(
        repositoryPath,
        fullConfig,
        this.config.globalCache.shared ? this.globalCache : undefined
      )

      // Initialize engine
      const initResult = await engine.initialize()
      if (!initResult.success) {
        return {
          success: false,
          error: initResult.error,
          executionTime: Date.now() - startTime,
        }
      }

      // Get initial repository metadata
      const metadata = await this.createRepositoryMetadata(
        repositoryId,
        fullConfig,
        engine
      )

      // Create repository instance
      const instance: RepositoryInstance = {
        metadata,
        engine,
        lastActivity: Date.now(),
      }

      // Set up file watching if enabled
      if (this.config.enableFileWatching) {
        await this.setupFileWatcher(repositoryId, repositoryPath, instance)
      }

      // Store repository and set as active
      this.repositories.set(repositoryId, instance)
      this.setActiveRepository(repositoryId)

      // Emit event
      this.emitRepositoryEvent('repository-opened', {
        repositoryId,
        path: repositoryPath,
        name: metadata.config.name,
      })

      return {
        success: true,
        data: instance,
        executionTime: Date.now() - startTime,
      }
    } catch (error) {
      return this.createErrorResult(
        'REPOSITORY_NOT_FOUND',
        error instanceof Error ? error.message : String(error),
        startTime,
        error
      )
    }
  }

  /**
   * Closes a repository and cleans up resources.
   *
   * @param repositoryId - Repository ID to close
   * @returns Promise resolving to whether repository was closed
   */
  async closeRepository(repositoryId: string): Promise<boolean> {
    const instance = this.repositories.get(repositoryId)
    if (!instance) {
      return false
    }

    try {
      // Clean up file watcher
      const watcher = this.watchers.get(repositoryId)
      if (watcher) {
        await watcher.close()
        this.watchers.delete(repositoryId)
      }

      // Destroy engine
      instance.engine.destroy()

      // Remove from repositories
      this.repositories.delete(repositoryId)

      // Update active repository if this was active
      if (this.activeRepositoryId === repositoryId) {
        this.activeRepositoryId = undefined

        // Set another repository as active if available
        const remaining = Array.from(this.repositories.keys())
        if (remaining.length > 0 && remaining[0]) {
          this.setActiveRepository(remaining[0])
        }
      }

      // Emit event
      this.emitRepositoryEvent('repository-closed', {
        repositoryId,
        path: instance.metadata.config.path,
      })

      return true
    } catch (error) {
      console.error('Error closing repository:', error)
      return false
    }
  }

  /**
   * Gets the currently active repository instance.
   *
   * @returns Active repository instance or undefined
   */
  getActiveRepository(): RepositoryInstance | undefined {
    if (!this.activeRepositoryId) {
      return undefined
    }

    return this.repositories.get(this.activeRepositoryId)
  }

  /**
   * Sets the active repository.
   *
   * @param repositoryId - Repository ID to set as active
   * @returns Whether the repository was set as active
   */
  setActiveRepository(repositoryId: string): boolean {
    const instance = this.repositories.get(repositoryId)
    if (!instance) {
      return false
    }

    const previousId = this.activeRepositoryId
    this.activeRepositoryId = repositoryId
    instance.lastActivity = Date.now()

    // Mark repository as active
    instance.metadata.isActive = true

    // Mark previous repository as inactive
    if (previousId && previousId !== repositoryId) {
      const previous = this.repositories.get(previousId)
      if (previous) {
        previous.metadata.isActive = false
      }
    }

    // Emit event
    this.emitRepositoryEvent('repository-activated', {
      repositoryId,
      previousRepositoryId: previousId,
    })

    return true
  }

  /**
   * Gets all open repository instances.
   *
   * @returns Array of repository instances
   */
  getAllRepositories(): RepositoryInstance[] {
    return Array.from(this.repositories.values())
  }

  /**
   * Gets a repository instance by ID.
   *
   * @param repositoryId - Repository ID
   * @returns Repository instance or undefined
   */
  getRepository(repositoryId: string): RepositoryInstance | undefined {
    return this.repositories.get(repositoryId)
  }

  /**
   * Gets repository statistics.
   *
   * @returns Repository manager statistics
   */
  getStatistics() {
    return {
      totalRepositories: this.repositories.size,
      activeRepositoryId: this.activeRepositoryId,
      maxConcurrent: this.config.maxConcurrentRepos,
      cacheStats: this.globalCache.getStats(),
      repositories: Array.from(this.repositories.entries()).map(
        ([id, instance]) => ({
          id,
          name: instance.metadata.config.name,
          path: instance.metadata.config.path,
          isActive: instance.metadata.isActive,
          lastActivity: instance.lastActivity,
          currentBranch: instance.metadata.currentBranch,
        })
      ),
    }
  }

  /**
   * Destroys the repository manager and cleans up all resources.
   */
  destroy(): void {
    // Close all repositories
    for (const repositoryId of this.repositories.keys()) {
      this.closeRepository(repositoryId)
    }

    // Stop cleanup timer
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = undefined
    }

    // Destroy global cache
    this.globalCache.destroy()

    // Clean up event listeners
    this.removeAllListeners()
  }

  /**
   * Finds repository ID by path.
   */
  private findRepositoryByPath(path: string): string | undefined {
    for (const [id, instance] of this.repositories) {
      if (instance.metadata.config.path === path) {
        return id
      }
    }
    return undefined
  }

  /**
   * Extracts project name from repository path.
   */
  private extractProjectName(repositoryPath: string): string {
    const parts = repositoryPath.split(/[/\\]/)
    return parts[parts.length - 1] || 'Unknown Project'
  }

  /**
   * Creates repository metadata from configuration and engine.
   */
  private async createRepositoryMetadata(
    repositoryId: string,
    config: RepositoryConfig,
    engine: GitEngine
  ): Promise<RepositoryMetadata> {
    // Get initial status
    const statusResult = await engine.getStatus()
    const status: RepositoryStatus =
      statusResult.success && statusResult.data
        ? {
            state: statusResult.data.isClean ? 'clean' : 'dirty',
            ahead: statusResult.data.ahead,
            behind: statusResult.data.behind,
            modifiedFiles: statusResult.data.modified.map((f) => f.path),
            stagedFiles: statusResult.data.staged.map((f) => f.path),
            untrackedFiles: statusResult.data.untracked.map((f) => f.path),
            conflictedFiles: statusResult.data.conflicted.map((f) => f.path),
          }
        : {
            state: 'unknown',
            ahead: 0,
            behind: 0,
            modifiedFiles: [],
            stagedFiles: [],
            untrackedFiles: [],
            conflictedFiles: [],
          }

    // Get branches
    const branchesResult = await engine.getBranches()
    const currentBranch =
      branchesResult.success && branchesResult.data
        ? branchesResult.data.find((b) => b.isCurrent)?.name || 'main'
        : 'main'

    return {
      id: repositoryId,
      config,
      currentBranch,
      remotes: [], // TODO: Get remotes from engine
      status,
      lastUpdated: Date.now(),
      isActive: false,
    }
  }

  /**
   * Sets up file system watcher for repository.
   */
  private async setupFileWatcher(
    repositoryId: string,
    repositoryPath: string,
    instance: RepositoryInstance
  ): Promise<void> {
    try {
      // TODO: Implement file system watching
      // This would watch for changes in the repository and emit events

      // For now, we'll set up a simple timer-based update
      const watcher = setInterval(async () => {
        try {
          const statusResult = await instance.engine.getStatus()
          if (statusResult.success && statusResult.data) {
            // Check if status changed
            const newStatus = statusResult.data
            const currentStatus = instance.metadata.status

            if (this.hasStatusChanged(currentStatus, newStatus)) {
              // Update metadata
              instance.metadata.status = {
                state: newStatus.isClean ? 'clean' : 'dirty',
                ahead: newStatus.ahead,
                behind: newStatus.behind,
                modifiedFiles: newStatus.modified.map((f) => f.path),
                stagedFiles: newStatus.staged.map((f) => f.path),
                untrackedFiles: newStatus.untracked.map((f) => f.path),
                conflictedFiles: newStatus.conflicted.map((f) => f.path),
              }
              instance.metadata.lastUpdated = Date.now()

              // Emit status change event
              this.emitRepositoryEvent('status-changed', {
                repositoryId,
                newStatus: instance.metadata.status,
              })
            }
          }
        } catch (error) {
          console.error('File watcher error:', error)
        }
      }, 5000) // Check every 5 seconds

      this.watchers.set(repositoryId, { close: () => clearInterval(watcher) })
    } catch (error) {
      console.error('Failed to setup file watcher:', error)
    }
  }

  /**
   * Checks if repository status has changed.
   */
  private hasStatusChanged(
    current: RepositoryStatus,
    updated: {
      isClean: boolean
      ahead: number
      behind: number
      modified: { path: string }[]
      staged: { path: string }[]
      untracked: { path: string }[]
    }
  ): boolean {
    return (
      current.state !== (updated.isClean ? 'clean' : 'dirty') ||
      current.ahead !== updated.ahead ||
      current.behind !== updated.behind ||
      current.modifiedFiles.length !== updated.modified.length ||
      current.stagedFiles.length !== updated.staged.length ||
      current.untrackedFiles.length !== updated.untracked.length
    )
  }

  /**
   * Cleans up the oldest repository to make room for new ones.
   */
  private async cleanupOldestRepository(): Promise<void> {
    let oldestId: string | undefined
    let oldestTime = Date.now()

    for (const [id, instance] of this.repositories) {
      if (instance.lastActivity < oldestTime && !instance.metadata.isActive) {
        oldestTime = instance.lastActivity
        oldestId = id
      }
    }

    if (oldestId) {
      await this.closeRepository(oldestId)
    }
  }

  /**
   * Starts the cleanup timer for inactive repositories.
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      const now = Date.now()
      const inactiveThreshold = now - this.config.inactiveCleanupTime

      for (const [id, instance] of this.repositories) {
        if (
          instance.lastActivity < inactiveThreshold &&
          !instance.metadata.isActive
        ) {
          this.closeRepository(id)
        }
      }
    }, this.config.inactiveCleanupTime / 4) // Check every quarter of the cleanup time

    // Don't prevent process exit
    this.cleanupTimer.unref()
  }

  /**
   * Emits repository events with consistent structure.
   */
  private emitRepositoryEvent(type: string, data: unknown): void {
    const event = {
      type,
      timestamp: Date.now(),
      ...(data as Record<string, unknown>),
    }

    this.emit('repository-event', event)
    this.emit(type, event)
  }

  /**
   * Creates a standardized error result.
   */
  private createErrorResult<T>(
    code: ErrorCode,
    message: string,
    startTime: number,
    details?: unknown
  ): RepositoryOperationResult<T> {
    return {
      success: false,
      error: {
        code,
        message,
        details,
      },
      executionTime: Date.now() - startTime,
    }
  }
}
