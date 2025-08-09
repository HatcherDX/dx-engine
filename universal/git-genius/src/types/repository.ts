/**
 * @fileoverview Repository-related type definitions for Git Genius.
 *
 * @description
 * Defines interfaces and types for repository management, including repository
 * metadata, configuration, and state management. These types provide the foundation
 * for the repository management system and ensure type safety across the library.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */
/**
 * Repository configuration options for opening and managing repositories.
 *
 * @public
 */
export interface RepositoryConfig {
  /**
   * Absolute path to the repository root directory
   */
  path: string
  /**
   * Display name for the repository (defaults to directory name)
   */
  name?: string | undefined
  /**
   * Whether to automatically detect Git configuration
   * @default true
   */
  autoDetectConfig?: boolean
  /**
   * Custom Git configuration overrides
   */
  gitConfig?: Record<string, string>
  /**
   * Cache configuration for this repository
   */
  cacheConfig?: {
    /**
     * Enable caching for this repository
     * @default true
     */
    enabled?: boolean
    /**
     * Cache TTL in milliseconds
     * @default 300000 (5 minutes)
     */
    ttl?: number
  }
}
/**
 * Repository metadata containing essential information about a Git repository.
 *
 * @public
 */
export interface RepositoryMetadata {
  /**
   * Unique identifier for the repository instance
   */
  id: string
  /**
   * Repository configuration
   */
  config: RepositoryConfig
  /**
   * Current branch name
   */
  currentBranch: string
  /**
   * Remote repository information
   */
  remotes: RepositoryRemote[]
  /**
   * Repository status summary
   */
  status: RepositoryStatus
  /**
   * Last update timestamp
   */
  lastUpdated: number
  /**
   * Whether the repository is currently being operated on
   */
  isActive: boolean
}
/**
 * Remote repository configuration and information.
 *
 * @public
 */
export interface RepositoryRemote {
  /**
   * Remote name (e.g., 'origin', 'upstream')
   */
  name: string
  /**
   * Remote URL
   */
  url: string
  /**
   * Remote type (fetch/push)
   */
  type: 'fetch' | 'push'
}
/**
 * Repository working tree status information.
 *
 * @public
 */
export interface RepositoryStatus {
  /**
   * Overall repository state
   */
  state: 'clean' | 'dirty' | 'conflicted' | 'unknown'
  /**
   * Number of commits ahead of upstream
   */
  ahead: number
  /**
   * Number of commits behind upstream
   */
  behind: number
  /**
   * Files with modifications
   */
  modifiedFiles: string[]
  /**
   * Files staged for commit
   */
  stagedFiles: string[]
  /**
   * Untracked files
   */
  untrackedFiles: string[]
  /**
   * Files with merge conflicts
   */
  conflictedFiles: string[]
}
/**
 * Repository operation result containing success status and optional data.
 *
 * @public
 */
export interface RepositoryOperationResult<T = unknown> {
  /**
   * Whether the operation succeeded
   */
  success: boolean
  /**
   * Operation result data (if successful)
   */
  data?: T
  /**
   * Error information (if failed)
   */
  error?: {
    /**
     * Error code for programmatic handling
     */
    code: string
    /**
     * Human-readable error message
     */
    message: string
    /**
     * Additional error details
     */
    details?: unknown
  }
  /**
   * Operation execution time in milliseconds
   */
  executionTime: number
}
/**
 * Repository events that can be emitted during operations.
 *
 * @public
 */
export type RepositoryEvent =
  | RepositoryStatusChangedEvent
  | RepositoryBranchChangedEvent
  | RepositoryFileChangedEvent
  | RepositoryErrorEvent
/**
 * Event emitted when repository status changes.
 *
 * @public
 */
export interface RepositoryStatusChangedEvent {
  type: 'status-changed'
  repositoryId: string
  oldStatus: RepositoryStatus
  newStatus: RepositoryStatus
  timestamp: number
}
/**
 * Event emitted when the current branch changes.
 *
 * @public
 */
export interface RepositoryBranchChangedEvent {
  type: 'branch-changed'
  repositoryId: string
  oldBranch: string
  newBranch: string
  timestamp: number
}
/**
 * Event emitted when files in the repository change.
 *
 * @public
 */
export interface RepositoryFileChangedEvent {
  type: 'file-changed'
  repositoryId: string
  changedFiles: string[]
  changeType: 'modified' | 'added' | 'deleted'
  timestamp: number
}
/**
 * Event emitted when a repository operation encounters an error.
 *
 * @public
 */
export interface RepositoryErrorEvent {
  type: 'error'
  repositoryId: string
  error: {
    code: string
    message: string
    details?: unknown
  }
  operation: string
  timestamp: number
}
