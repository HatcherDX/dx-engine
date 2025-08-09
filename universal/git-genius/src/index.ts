/**
 * @fileoverview Main exports for Git Genius library.
 *
 * @description
 * The Git Genius library provides advanced Git operations with Timeline mode support,
 * intelligent caching, and seamless integration with the existing terminal system.
 * This module serves as the main entry point for all Git Genius functionality.
 *
 * @example
 * ```typescript
 * import { RepositoryManager, GitEngine, EnhancedGitRunner } from '@hatcherdx/git-genius'
 *
 * // Create repository manager
 * const repoManager = new RepositoryManager({
 *   maxConcurrentRepos: 10,
 *   enableFileWatching: true
 * })
 *
 * // Open a repository (typically from "Open Project" button)
 * const result = await repoManager.openRepository('/path/to/project')
 * if (result.success) {
 *   console.log(`Opened: ${result.data.metadata.config.name}`)
 * }
 *
 * // Use enhanced Git runner for terminal integration
 * const gitRunner = new EnhancedGitRunner(repoManager)
 * const status = await gitRunner.status()
 * ```
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

// Core exports
export { GitEngine } from './core/GitEngine'
export { RepositoryManager } from './core/RepositoryManager'
export { EnhancedGitRunner } from './core/EnhancedGitRunner'

// Cache system exports
export { CacheManager } from './cache/CacheManager'

// Timeline mode utilities (placeholder for future implementation)
export { TimelineController } from './timeline/TimelineController'
export { DiffEngine } from './timeline/DiffEngine'

// Utility exports
export { GitUtils } from './utils/GitUtils'
export { Logger, LogLevel } from './utils/Logger'

// Type exports - Re-export all types for consumers
export type * from './types'

// Re-export specific commonly used types
export type {
  RepositoryConfig,
  RepositoryMetadata,
  RepositoryOperationResult,
} from './types/repository'

export type { RepositoryInstance } from './core/RepositoryManager'

export type {
  GitCommit,
  GitStatus,
  GitBranch,
  GitDiffOptions,
  GitLogOptions,
  GitFileChange,
} from './types/git'

export type {
  TimelineViewConfig,
  TimelineEntry,
  DiffViewData,
  TimelineSidebarData,
} from './types/timeline'

export type {
  CacheConfig,
  CacheOperationResult,
  CacheStats,
} from './types/cache'

import { RepositoryManager } from './core/RepositoryManager'
import { EnhancedGitRunner } from './core/EnhancedGitRunner'
import type { GitGeniusConfig } from './types'

/**
 * Git Genius library version.
 *
 * @public
 */
export const VERSION = '0.1.0'

/**
 * Default configuration for Git Genius library.
 *
 * @public
 */
export const DEFAULT_CONFIG: GitGeniusConfig = {
  cache: {
    defaultTtl: 300000, // 5 minutes
    maxSize: 104857600, // 100MB
    cleanupInterval: 60000, // 1 minute
    persistent: true,
  },
  git: {
    defaultTimeout: 30000,
    maxConcurrentOps: 5,
    enableProgress: true,
  },
  timeline: {
    defaultCommitLimit: 100,
    refreshInterval: 5000,
    enableRealTimeUpdates: true,
  },
  filesystem: {
    maxDiffFileSize: 1048576, // 1MB
    binaryThreshold: 8192,
    enableFileWatching: true,
  },
  performance: {
    lazyLoading: true,
    debounceDelay: 250,
    enableMonitoring: false,
  },
}

/**
 * Creates a new Git Genius instance with default configuration.
 *
 * @remarks
 * This is a convenience function that creates a RepositoryManager with
 * sensible defaults for most use cases. For advanced configuration,
 * create the RepositoryManager directly.
 *
 * @param config - Optional configuration overrides
 * @returns Configured RepositoryManager instance
 *
 * @example
 * ```typescript
 * // Create with defaults
 * const gitGenius = createGitGenius()
 *
 * // Create with custom config
 * const gitGenius = createGitGenius({
 *   maxConcurrentRepos: 5,
 *   enableFileWatching: false
 * })
 * ```
 *
 * @public
 */
export function createGitGenius(/* _config?: Partial<GitGeniusConfig> */): RepositoryManager {
  const repositoryManagerConfig = {
    maxConcurrentRepos: 5,
    inactiveCleanupTime: 1800000, // 30 minutes
    enableFileWatching: true,
    globalCache: {
      shared: true,
      config: DEFAULT_CONFIG.cache,
    },
  }

  return new RepositoryManager(repositoryManagerConfig, DEFAULT_CONFIG)
}

/**
 * Creates an enhanced Git runner for terminal system integration.
 *
 * @remarks
 * This function creates an EnhancedGitRunner that integrates Git Genius
 * with the existing terminal system, providing backward compatibility
 * while adding advanced features.
 *
 * @param repositoryManager - Repository manager instance
 * @param options - Configuration options
 * @returns Configured EnhancedGitRunner instance
 *
 * @example
 * ```typescript
 * const repoManager = createGitGenius()
 * const gitRunner = createEnhancedGitRunner(repoManager, {
 *   fallbackToCommand: true
 * })
 * ```
 *
 * @public
 */
export function createEnhancedGitRunner(
  repositoryManager: RepositoryManager,
  options: { fallbackToCommand?: boolean } = {}
): EnhancedGitRunner {
  return new EnhancedGitRunner(
    repositoryManager,
    options.fallbackToCommand ?? true
  )
}

/**
 * Utility function to check if Git Genius is compatible with the current Node.js/Electron environment.
 *
 * @returns Compatibility information
 *
 * @example
 * ```typescript
 * const compat = checkCompatibility()
 * if (compat.isCompatible) {
 *   console.log('Git Genius is ready to use!')
 * } else {
 *   console.warn('Compatibility issues:', compat.issues)
 * }
 * ```
 *
 * @public
 */
export function checkCompatibility(): {
  isCompatible: boolean
  environment: 'node'
  features: {
    isomorphicGit: boolean
    fileSystem: boolean
    caching: boolean
  }
  issues: string[]
} {
  const features = {
    isomorphicGit: true, // Always available as a dependency
    fileSystem: (() => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        require('fs')
        return true
      } catch {
        return false
      }
    })(), // Native fs module in Node.js/Electron
    caching: true, // Always available
  }

  const issues: string[] = []

  if (!features.fileSystem) {
    issues.push('Node.js fs module not available')
  }

  return {
    isCompatible:
      features.isomorphicGit && features.fileSystem && features.caching,
    environment: 'node',
    features,
    issues,
  }
}
