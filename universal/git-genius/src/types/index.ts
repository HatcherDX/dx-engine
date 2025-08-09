/**
 * @fileoverview Main type exports for Git Genius library.
 *
 * @description
 * Aggregates and re-exports all type definitions used throughout the Git Genius library.
 * This serves as the single entry point for TypeScript type imports, ensuring consistent
 * type usage across the library and dependent projects.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

// Repository-related types
export type {
  RepositoryConfig,
  RepositoryMetadata,
  RepositoryRemote,
  RepositoryStatus,
  RepositoryOperationResult,
  RepositoryEvent,
  RepositoryStatusChangedEvent,
  RepositoryBranchChangedEvent,
  RepositoryFileChangedEvent,
  RepositoryErrorEvent,
} from './repository'

// Git operation types
export type {
  GitCommit,
  GitAuthor,
  GitFileChange,
  GitCommitStats,
  GitDiffHunk,
  GitDiffLine,
  GitBranch,
  GitDiffOptions,
  GitLogOptions,
  GitStatus,
  GitStatusFile,
  GitFileStatus,
} from './git'

// Timeline mode types
export type {
  TimelineViewConfig,
  TimelineEntry,
  TimelineConnection,
  DiffViewData,
  DiffViewFileChange,
  DiffViewFileContent,
  DiffViewLineMetadata,
  SyntaxToken,
  DiffViewHunk,
  DiffViewLine,
  InlineChange,
  TimelineSidebarData,
} from './timeline'

// Cache system types
export type {
  CacheConfig,
  CacheEntry,
  CacheKey,
  CacheOperationResult,
  CacheStats,
  CacheEventType,
  CacheEvent,
} from './cache'

/**
 * Common error codes used throughout the Git Genius library.
 *
 * @public
 */
export const ErrorCodes = {
  // Repository errors
  REPOSITORY_NOT_FOUND: 'REPOSITORY_NOT_FOUND',
  REPOSITORY_NOT_GIT: 'REPOSITORY_NOT_GIT',
  REPOSITORY_ACCESS_DENIED: 'REPOSITORY_ACCESS_DENIED',
  REPOSITORY_CORRUPTED: 'REPOSITORY_CORRUPTED',
  REPOSITORY_LOCK_ERROR: 'REPOSITORY_LOCK_ERROR',

  // Git operation errors
  GIT_COMMAND_FAILED: 'GIT_COMMAND_FAILED',
  GIT_MERGE_CONFLICT: 'GIT_MERGE_CONFLICT',
  GIT_AUTHENTICATION_FAILED: 'GIT_AUTHENTICATION_FAILED',
  GIT_NETWORK_ERROR: 'GIT_NETWORK_ERROR',
  GIT_OBJECT_NOT_FOUND: 'GIT_OBJECT_NOT_FOUND',
  GIT_REF_NOT_FOUND: 'GIT_REF_NOT_FOUND',
  GIT_REMOTE_ERROR: 'GIT_REMOTE_ERROR',

  // File system errors
  FILE_NOT_FOUND: 'FILE_NOT_FOUND',
  FILE_ACCESS_DENIED: 'FILE_ACCESS_DENIED',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  FILE_SYSTEM_ERROR: 'FILE_SYSTEM_ERROR',

  // Cache errors
  CACHE_ERROR: 'CACHE_ERROR',
  CACHE_MISS: 'CACHE_MISS',
  CACHE_EXPIRED: 'CACHE_EXPIRED',

  // Configuration errors
  CONFIG_INVALID: 'CONFIG_INVALID',
  CONFIG_MISSING: 'CONFIG_MISSING',

  // Network and connectivity errors
  NETWORK_ERROR: 'NETWORK_ERROR',
  CONNECTION_TIMEOUT: 'CONNECTION_TIMEOUT',
  CONNECTION_REFUSED: 'CONNECTION_REFUSED',

  // Retry and resilience errors
  MAX_RETRIES_EXCEEDED: 'MAX_RETRIES_EXCEEDED',
  OPERATION_ABORTED: 'OPERATION_ABORTED',

  // General errors
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
  OPERATION_CANCELLED: 'OPERATION_CANCELLED',
  TIMEOUT: 'TIMEOUT',
} as const

/**
 * Type for error codes.
 *
 * @public
 */
export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes]

/**
 * Standard error structure used throughout the library.
 *
 * @public
 */
export interface GitGeniusError {
  /**
   * Error code for programmatic handling
   */
  code: ErrorCode

  /**
   * Human-readable error message
   */
  message: string

  /**
   * Additional error details
   */
  details?: unknown

  /**
   * Stack trace (in development)
   */
  stack?: string

  /**
   * Operation that caused the error
   */
  operation?: string

  /**
   * Repository ID related to the error
   */
  repositoryId?: string

  /**
   * Timestamp when error occurred
   */
  timestamp: number
}

/**
 * Configuration options for the Git Genius library.
 *
 * @public
 */
export interface GitGeniusConfig {
  /**
   * Default cache configuration
   */
  cache: {
    /**
     * Default TTL in milliseconds
     * @default 300000 (5 minutes)
     */
    defaultTtl: number

    /**
     * Maximum cache size in MB
     * @default 100
     */
    maxSize: number

    /**
     * Cache cleanup interval in milliseconds
     * @default 60000 (1 minute)
     */
    cleanupInterval: number

    /**
     * Enable persistent cache
     * @default true
     */
    persistent: boolean
  }

  /**
   * Git operation configuration
   */
  git: {
    /**
     * Default timeout for Git operations in milliseconds
     * @default 30000
     */
    defaultTimeout: number

    /**
     * Maximum number of concurrent operations
     * @default 5
     */
    maxConcurrentOps: number

    /**
     * Enable progress reporting
     * @default true
     */
    enableProgress: boolean
  }

  /**
   * Timeline mode configuration
   */
  timeline: {
    /**
     * Default commit limit
     * @default 100
     */
    defaultCommitLimit: number

    /**
     * Refresh interval in milliseconds
     * @default 5000
     */
    refreshInterval: number

    /**
     * Enable real-time updates
     * @default true
     */
    enableRealTimeUpdates: boolean
  }

  /**
   * File system configuration
   */
  filesystem: {
    /**
     * Maximum file size for diff display in bytes
     * @default 1048576 (1MB)
     */
    maxDiffFileSize: number

    /**
     * Binary file detection threshold
     * @default 8192
     */
    binaryThreshold: number

    /**
     * Enable file watching
     * @default true
     */
    enableFileWatching: boolean
  }

  /**
   * Performance optimization settings
   */
  performance: {
    /**
     * Enable lazy loading
     * @default true
     */
    lazyLoading: boolean

    /**
     * Debounce delay for file system events in milliseconds
     * @default 250
     */
    debounceDelay: number

    /**
     * Enable performance monitoring
     * @default false
     */
    enableMonitoring: boolean
  }
}
