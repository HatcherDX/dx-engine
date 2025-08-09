/**
 * @fileoverview Core Git engine using isomorphic-git for cross-platform operations.
 *
 * @description
 * The GitEngine provides a comprehensive interface for Git operations using isomorphic-git.
 * It supports both Node.js and browser environments, implements intelligent caching,
 * and provides Timeline mode specific functionality for advanced UI integration.
 *
 * @example
 * ```typescript
 * const engine = new GitEngine('/path/to/repo', {
 *   cache: { enabled: true, ttl: 300000 }
 * })
 *
 * // Get repository status
 * const status = await engine.getStatus()
 * console.log(`Branch: ${status.currentBranch}`)
 *
 * // Get commit history
 * const commits = await engine.getCommits({ maxCount: 50 })
 * console.log(`Found ${commits.length} commits`)
 * ```
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import { EventEmitter } from 'events'
import git from 'isomorphic-git'
import { CacheManager } from '../cache/CacheManager'
import type { ErrorCode } from '../types'
import type {
  GitBranch,
  GitCommit,
  GitLogOptions,
  GitStatus,
  GitStatusFile,
} from '../types/git'
import type {
  RepositoryConfig,
  RepositoryOperationResult,
} from '../types/repository'

/**
 * HTTP client configuration for isomorphic-git.
 */
interface HttpConfig {
  /**
   * HTTP client implementation
   */
  http: unknown

  /**
   * CORS proxy URL for browser environments
   */
  corsProxy?: string

  /**
   * Authentication credentials
   */
  auth?:
    | {
        username: string
        password: string
      }
    | {
        token: string
      }
}

/**
 * Type for isomorphic-git operation parameters
 */
interface GitOperationParams {
  fs: typeof import('fs')
  dir: string
  cache?: Record<string, unknown>
  ref?: string
  depth?: number
  since?: Date
}

/**
 * Core Git engine implementing comprehensive Git operations with caching.
 *
 * @remarks
 * GitEngine uses isomorphic-git to provide cross-platform Git functionality
 * optimized for Electron environments. It includes intelligent caching with
 * shared isomorphic-git cache objects, error handling, and Timeline mode optimizations.
 *
 * @public
 */
export class GitEngine extends EventEmitter {
  /** Repository configuration */
  private readonly config: RepositoryConfig

  /** File system implementation (Node.js only) */
  private readonly fs: typeof import('fs')

  /** Cache manager for optimization */
  private readonly cache: CacheManager

  /** Shared isomorphic-git cache object to avoid packfile re-parsing */
  private gitCache: Record<string, unknown> = {}

  /** HTTP configuration for remote operations */
  private httpConfig?: HttpConfig

  /** Repository root path */
  private readonly repoPath: string

  /** Whether the engine is initialized */
  private isInitialized = false

  /** Cache performance metrics */
  private cacheMetrics = {
    hits: 0,
    misses: 0,
    operations: 0,
    totalSizeBytes: 0,
    packfileParsingAvoided: 0,
    autoCleanups: 0,
    memoryPressureDetected: 0,
  }

  /** Memory pressure monitoring configuration */
  private readonly memoryConfig = {
    maxCacheSize: 50 * 1024 * 1024, // 50MB
    memoryPressureThreshold: 512 * 1024 * 1024, // 512MB heap
    checkInterval: 10, // Check every 10 operations
    operationCount: 0,
  }

  /** Retry configuration for resilient operations */
  private readonly retryConfig = {
    maxRetries: 3,
    baseDelayMs: 1000,
    maxDelayMs: 10000,
    backoffMultiplier: 2,
    retryableErrors: new Set([
      'NETWORK_ERROR',
      'CONNECTION_TIMEOUT',
      'CONNECTION_REFUSED',
      'GIT_NETWORK_ERROR',
      'FILE_SYSTEM_ERROR',
      'REPOSITORY_LOCK_ERROR',
    ]),
  }

  /** Operation metrics tracking */
  private operationMetrics = {
    totalOperations: 0,
    successfulOperations: 0,
    failedOperations: 0,
    retriedOperations: 0,
    totalRetries: 0,
  }

  /** Performance metrics for detailed monitoring */
  private performanceMetrics = {
    // Operation timings
    operations: new Map<
      string,
      {
        count: number
        totalTime: number
        minTime: number
        maxTime: number
        averageTime: number
        p95Time: number
        recentTimes: number[]
      }
    >(),

    // Cache performance
    cacheHitRates: new Map<
      string,
      {
        hits: number
        misses: number
        hitRate: number
      }
    >(),

    // Memory usage tracking
    memorySnapshots: [] as Array<{
      timestamp: number
      heapUsed: number
      heapTotal: number
      cacheSize: number
    }>,

    // Error tracking
    errorFrequency: new Map<
      string,
      {
        count: number
        lastOccurrence: number
        operations: string[]
      }
    >(),
  }

  /** Performance monitoring configuration */
  private readonly performanceConfig = {
    enabled: true,
    sampleSize: 100, // Keep last 100 operation times for percentile calculation
    memorySnapshotInterval: 60000, // Take memory snapshot every minute
    maxMemorySnapshots: 1440, // Keep 24 hours of snapshots (1 per minute)
    logSlowOperations: true,
    slowOperationThreshold: 5000, // 5 seconds
  }

  /**
   * Creates a new GitEngine instance.
   *
   * @param repositoryPath - Absolute path to the Git repository
   * @param config - Repository configuration options
   * @param cacheManager - Optional cache manager instance
   *
   * @example
   * ```typescript
   * const engine = new GitEngine('/path/to/repo', {
   *   path: '/path/to/repo',
   *   name: 'My Project',
   *   autoDetectConfig: true
   * })
   * ```
   */
  constructor(
    repositoryPath: string,
    config: Partial<RepositoryConfig> = {},
    cacheManager?: CacheManager
  ) {
    super()

    this.repoPath = repositoryPath
    this.config = {
      path: repositoryPath,
      name: config.name || 'Unknown Repository',
      autoDetectConfig: config.autoDetectConfig ?? true,
      gitConfig: config.gitConfig,
      cacheConfig: config.cacheConfig,
    }

    // Initialize filesystem (Node.js only for Electron)
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    this.fs = require('fs')

    // Initialize cache
    this.cache = cacheManager ?? new CacheManager()

    // Set up HTTP configuration for Node.js (Electron)
    this.setupNodeHttp()

    // Start performance monitoring
    this.startPerformanceMonitoring()
  }

  /**
   * Initializes the Git engine and validates repository.
   *
   * @returns Promise resolving to operation result
   *
   * @throws {@link GitGeniusError} When repository is not found or invalid
   */
  async initialize(): Promise<RepositoryOperationResult<boolean>> {
    const startTime = Date.now()

    try {
      // Check if directory exists and is a Git repository
      const isRepo = await this.isRepository()
      if (!isRepo) {
        return this.createErrorResult(
          'REPOSITORY_NOT_GIT',
          'Directory is not a Git repository',
          startTime
        )
      }

      // Auto-detect Git configuration if enabled
      if (this.config.autoDetectConfig) {
        await this.detectConfiguration()
      }

      this.isInitialized = true
      this.emit('initialized', { repositoryPath: this.repoPath })

      return {
        success: true,
        data: true,
        executionTime: Date.now() - startTime,
      }
    } catch (error) {
      return this.createErrorResult(
        'UNKNOWN_ERROR',
        error instanceof Error ? error.message : String(error),
        startTime,
        error
      )
    }
  }

  /**
   * Gets the current repository status including working directory changes.
   *
   * @returns Promise resolving to Git status information
   *
   * @example
   * ```typescript
   * const status = await engine.getStatus()
   * console.log(`Modified files: ${status.modified.length}`)
   * console.log(`Staged files: ${status.staged.length}`)
   * ```
   */
  async getStatus(): Promise<RepositoryOperationResult<GitStatus>> {
    const startTime = Date.now()

    try {
      this.ensureInitialized()

      // Check cache first
      const cacheKey = 'status'
      const cached = await this.cache.get<GitStatus>(
        this.repoPath,
        'status',
        cacheKey
      )

      // Record cache metrics
      this.recordCacheMetrics('status', cached.hit)

      if (cached.hit && cached.data) {
        const executionTime = Date.now() - startTime
        this.recordOperationMetrics('getStatus', executionTime, true)
        return {
          success: true,
          data: cached.data,
          executionTime,
        }
      }

      // Track cache performance
      this.cacheMetrics.operations++
      const hadCachedData = Object.keys(this.gitCache).length > 0
      if (hadCachedData) {
        this.cacheMetrics.packfileParsingAvoided++
      }

      // Get current branch with shared cache
      const currentBranch =
        (await git.currentBranch({
          fs: this.fs,
          dir: this.repoPath,
          cache: this.gitCache,
        } as GitOperationParams)) || 'main'

      // Get repository status using shared cache
      const statusMatrix = await git.statusMatrix({
        fs: this.fs,
        dir: this.repoPath,
        cache: this.gitCache,
      } as GitOperationParams)

      // Process status matrix into categorized files
      const modified: GitStatusFile[] = []
      const staged: GitStatusFile[] = []
      const untracked: GitStatusFile[] = []
      const conflicted: GitStatusFile[] = []

      for (const [
        filepath,
        headStatus,
        workdirStatus,
        stageStatus,
      ] of statusMatrix) {
        const file: GitStatusFile = {
          path: filepath,
          workingDirStatus: this.mapFileStatus(workdirStatus),
          indexStatus: this.mapFileStatus(stageStatus),
          isIgnored: false,
        }

        // Categorize files based on status
        if (headStatus === 1 && workdirStatus === 1 && stageStatus === 1) {
          // File is unmodified
          continue
        } else if (
          headStatus === 0 &&
          workdirStatus === 2 &&
          stageStatus === 0
        ) {
          // Untracked file
          untracked.push(file)
        } else if (stageStatus !== headStatus) {
          // File is staged
          staged.push(file)
        } else if (workdirStatus !== headStatus) {
          // File is modified
          modified.push(file)
        }

        // TODO: Detect conflicted files
      }

      // Get ahead/behind information
      const ahead = 0
      const behind = 0
      try {
        await git.log({
          fs: this.fs,
          dir: this.repoPath,
          ref: currentBranch,
          depth: 100,
          cache: this.gitCache,
        } as GitOperationParams)

        // TODO: Implement proper ahead/behind calculation
        // This would require comparing with remote branch
      } catch {
        // Ignore errors for ahead/behind calculation
      }

      const status: GitStatus = {
        currentBranch,
        ahead,
        behind,
        modified,
        staged,
        untracked,
        conflicted,
        isClean:
          modified.length === 0 &&
          staged.length === 0 &&
          untracked.length === 0,
      }

      // Cache the result
      await this.cache.set(this.repoPath, 'status', cacheKey, status, 30000) // 30 second TTL

      // Monitor cache size periodically
      this.checkCacheSize()

      const executionTime = Date.now() - startTime
      this.recordOperationMetrics('getStatus', executionTime, true)

      return {
        success: true,
        data: status,
        executionTime,
      }
    } catch (error) {
      const executionTime = Date.now() - startTime
      const errorCode = this.categorizeError(error)
      this.recordOperationMetrics('getStatus', executionTime, false, errorCode)

      return this.createErrorResult(
        errorCode,
        error instanceof Error ? error.message : String(error),
        startTime,
        error
      )
    }
  }

  /**
   * Gets commit history with optional filtering and pagination.
   *
   * @param options - Log options for filtering and formatting
   * @returns Promise resolving to array of commits
   *
   * @example
   * ```typescript
   * const commits = await engine.getCommits({
   *   maxCount: 50,
   *   ref: 'main',
   *   author: 'john@example.com'
   * })
   * ```
   */
  async getCommits(
    options: GitLogOptions = {}
  ): Promise<RepositoryOperationResult<GitCommit[]>> {
    const startTime = Date.now()

    try {
      this.ensureInitialized()

      const {
        maxCount = 100,
        since,
        author,
        grep,
        includeMerges = true,
        ref = 'HEAD',
      } = options

      // Generate cache key based on options
      const cacheKey = JSON.stringify(options)
      const cached = await this.cache.get<GitCommit[]>(
        this.repoPath,
        'commits',
        cacheKey
      )

      if (cached.hit && cached.data) {
        return {
          success: true,
          data: cached.data,
          executionTime: Date.now() - startTime,
        }
      }

      // Track cache performance
      this.cacheMetrics.operations++
      const hadCachedData = Object.keys(this.gitCache).length > 0
      if (hadCachedData) {
        this.cacheMetrics.packfileParsingAvoided++
      }

      // Get commit log using shared cache
      const commits = await git.log({
        fs: this.fs,
        dir: this.repoPath,
        ref,
        depth: maxCount,
        since: since ? new Date(since) : undefined,
        cache: this.gitCache,
        // TODO: Add more filtering options as isomorphic-git supports them
      } as GitOperationParams)

      // Transform to our format
      const gitCommits: GitCommit[] = commits.map((commit) => ({
        hash: commit.oid,
        shortHash: commit.oid.substring(0, 7),
        author: {
          name: commit.commit.author.name,
          email: commit.commit.author.email,
          timestamp: new Date(
            commit.commit.author.timestamp * 1000
          ).toISOString(),
        },
        committer: {
          name: commit.commit.committer.name,
          email: commit.commit.committer.email,
          timestamp: new Date(
            commit.commit.committer.timestamp * 1000
          ).toISOString(),
        },
        message: commit.commit.message.split('\n')[0] || '',
        fullMessage: commit.commit.message,
        timestamp: new Date(
          commit.commit.author.timestamp * 1000
        ).toISOString(),
        parents: commit.commit.parent || [],
        files: [], // TODO: Get file changes for each commit
        stats: {
          filesChanged: 0,
          insertions: 0,
          deletions: 0,
        },
        isMerge: (commit.commit.parent || []).length > 1,
        tags: [], // TODO: Get tags for commit
      }))

      // Apply client-side filtering
      let filteredCommits = gitCommits

      if (author) {
        filteredCommits = filteredCommits.filter(
          (commit) =>
            commit.author.email.includes(author) ||
            commit.author.name.includes(author)
        )
      }

      if (grep) {
        filteredCommits = filteredCommits.filter(
          (commit) =>
            commit.message.includes(grep) || commit.fullMessage.includes(grep)
        )
      }

      if (!includeMerges) {
        filteredCommits = filteredCommits.filter((commit) => !commit.isMerge)
      }

      // Cache the result
      await this.cache.set(
        this.repoPath,
        'commits',
        cacheKey,
        filteredCommits,
        300000
      ) // 5 minute TTL

      // Monitor cache size periodically
      this.checkCacheSize()

      return {
        success: true,
        data: filteredCommits,
        executionTime: Date.now() - startTime,
      }
    } catch (error) {
      return this.createErrorResult(
        'GIT_COMMAND_FAILED',
        error instanceof Error ? error.message : String(error),
        startTime,
        error
      )
    }
  }

  /**
   * Gets available branches in the repository.
   *
   * @returns Promise resolving to array of branches
   */
  async getBranches(): Promise<RepositoryOperationResult<GitBranch[]>> {
    const startTime = Date.now()

    try {
      this.ensureInitialized()

      // Check cache first
      const cached = await this.cache.get<GitBranch[]>(
        this.repoPath,
        'branches',
        'all'
      )

      if (cached.hit && cached.data) {
        return {
          success: true,
          data: cached.data,
          executionTime: Date.now() - startTime,
        }
      }

      // Track cache performance
      this.cacheMetrics.operations++
      const hadCachedData = Object.keys(this.gitCache).length > 0
      if (hadCachedData) {
        this.cacheMetrics.packfileParsingAvoided++
      }

      const currentBranch = await git.currentBranch({
        fs: this.fs,
        dir: this.repoPath,
        cache: this.gitCache,
      } as GitOperationParams)

      const branchList = await git.listBranches({
        fs: this.fs,
        dir: this.repoPath,
        cache: this.gitCache,
      } as GitOperationParams)

      const branches: GitBranch[] = branchList.map((branchName) => ({
        name: branchName,
        ref: `refs/heads/${branchName}`,
        commit: '', // TODO: Get commit hash for branch
        isCurrent: branchName === currentBranch,
        isRemote: false,
        // TODO: Add upstream information
      }))

      // Cache the result
      await this.cache.set(this.repoPath, 'branches', 'all', branches, 120000) // 2 minute TTL

      // Monitor cache size periodically
      this.checkCacheSize()

      return {
        success: true,
        data: branches,
        executionTime: Date.now() - startTime,
      }
    } catch (error) {
      return this.createErrorResult(
        'GIT_COMMAND_FAILED',
        error instanceof Error ? error.message : String(error),
        startTime,
        error
      )
    }
  }

  /**
   * Checks if the directory is a Git repository.
   *
   * @returns Promise resolving to whether directory is a Git repository
   */
  async isRepository(): Promise<boolean> {
    try {
      const commits = await git.log({
        fs: this.fs,
        dir: this.repoPath,
        depth: 1,
        cache: this.gitCache,
      } as GitOperationParams)
      return commits.length > 0
    } catch {
      return false
    }
  }

  /**
   * Destroys the engine and cleans up resources.
   *
   * @remarks
   * Cleans up both application-level cache and isomorphic-git internal cache
   * to free memory and prevent resource leaks in long-running Electron apps.
   */
  destroy(): void {
    this.cache.destroy()
    this.clearGitCache()
    this.removeAllListeners()
    this.isInitialized = false
    this.emit('destroyed', { cacheMetrics: this.getCacheMetrics() })
  }

  /**
   * Clears the shared isomorphic-git cache to free memory.
   *
   * @remarks
   * According to isomorphic-git documentation, clearing the cache is done by
   * replacing the cache object reference, allowing the old object to be garbage collected.
   * This should be called periodically in long-running applications to manage memory.
   *
   * @example
   * ```typescript
   * // Clear cache when memory pressure is detected
   * if (process.memoryUsage().heapUsed > MEMORY_THRESHOLD) {
   *   engine.clearGitCache()
   * }
   * ```
   */
  clearGitCache(): void {
    const oldCacheSize = this.estimateGitCacheSize()
    this.gitCache = {}
    this.cacheMetrics.totalSizeBytes -= oldCacheSize
    this.emit('gitCacheCleared', { freedBytes: oldCacheSize })
  }

  /**
   * Gets current cache performance metrics.
   *
   * @returns Object containing cache hit ratio, size, and performance data
   */
  getCacheMetrics(): {
    hits: number
    misses: number
    operations: number
    totalSizeBytes: number
    packfileParsingAvoided: number
    autoCleanups: number
    memoryPressureDetected: number
  } {
    return { ...this.cacheMetrics }
  }

  /**
   * Estimates the memory size of the git cache object.
   *
   * @returns Estimated size in bytes
   */
  private estimateGitCacheSize(): number {
    try {
      const cacheString = JSON.stringify(this.gitCache)
      return cacheString.length * 2 // Rough estimate: 2 bytes per character
    } catch {
      // If cache contains non-serializable data, return rough estimate
      return Object.keys(this.gitCache).length * 1024 // 1KB per key estimate
    }
  }

  /**
   * Monitors cache size and memory pressure, clearing cache when needed.
   *
   * @remarks
   * This method implements intelligent cache management for long-running Electron apps:
   * - Periodically checks memory usage to detect pressure
   * - Automatically clears cache when size exceeds threshold
   * - Emits events for monitoring and debugging
   *
   * @param maxSizeBytes - Maximum cache size in bytes (optional override)
   */
  private checkCacheSize(maxSizeBytes?: number): void {
    this.memoryConfig.operationCount++

    // Only check periodically to avoid performance impact
    if (
      this.memoryConfig.operationCount % this.memoryConfig.checkInterval !==
      0
    ) {
      return
    }

    const currentSize = this.estimateGitCacheSize()
    this.cacheMetrics.totalSizeBytes = currentSize
    const threshold = maxSizeBytes ?? this.memoryConfig.maxCacheSize

    // Check for memory pressure
    const memoryUsage = process.memoryUsage()
    const isMemoryPressure =
      memoryUsage.heapUsed > this.memoryConfig.memoryPressureThreshold

    if (isMemoryPressure) {
      this.cacheMetrics.memoryPressureDetected++
      this.clearGitCache()
      this.cacheMetrics.autoCleanups++
      this.emit('memoryPressureDetected', {
        heapUsed: memoryUsage.heapUsed,
        threshold: this.memoryConfig.memoryPressureThreshold,
        cacheCleared: true,
      })
      return
    }

    // Check cache size threshold
    if (currentSize > threshold) {
      this.clearGitCache()
      this.cacheMetrics.autoCleanups++
      this.emit('cacheSizeExceeded', {
        clearedSize: currentSize,
        threshold: threshold,
        reason: 'size_limit',
      })
    }
  }

  /**
   * Gets detailed memory and cache status information.
   *
   * @returns Comprehensive status including memory usage and cache metrics
   */
  getMemoryStatus(): {
    memoryUsage: NodeJS.MemoryUsage
    cacheMetrics: {
      hits: number
      misses: number
      operations: number
      totalSizeBytes: number
      packfileParsingAvoided: number
      autoCleanups: number
      memoryPressureDetected: number
    }
    cacheSize: number
    isMemoryPressure: boolean
    hitRatio: number
  } {
    const memoryUsage = process.memoryUsage()
    const cacheSize = this.estimateGitCacheSize()
    const isMemoryPressure =
      memoryUsage.heapUsed > this.memoryConfig.memoryPressureThreshold
    const hitRatio =
      this.cacheMetrics.operations > 0
        ? this.cacheMetrics.hits / this.cacheMetrics.operations
        : 0

    return {
      memoryUsage,
      cacheMetrics: this.getCacheMetrics(),
      cacheSize,
      isMemoryPressure,
      hitRatio,
    }
  }

  /**
   * Configures memory pressure thresholds and cache limits.
   *
   * @param config - Partial configuration to override defaults
   */
  configureMemoryManagement(
    config: Partial<{
      maxCacheSize: number
      memoryPressureThreshold: number
      checkInterval: number
      operationCount: number
    }>
  ): void {
    Object.assign(this.memoryConfig, config)
    this.emit('memoryConfigUpdated', { config: this.memoryConfig })
  }

  /**
   * Maps isomorphic-git file status codes to our enum.
   */
  private mapFileStatus(
    status: number
  ): 'deleted' | 'unmodified' | 'modified' | 'added' {
    switch (status) {
      case 0:
        return 'deleted'
      case 1:
        return 'unmodified'
      case 2:
        return 'modified'
      case 3:
        return 'added'
      default:
        return 'unmodified'
    }
  }

  /**
   * Ensures the engine is initialized before operations.
   */
  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('GitEngine must be initialized before use')
    }
  }

  /**
   * Detects Git configuration automatically.
   */
  private async detectConfiguration(): Promise<void> {
    // TODO: Implement Git config detection
    // This could read .git/config and detect remotes, user info, etc.
  }

  /**
   * Sets up HTTP client for Node.js (Electron) environment.
   */
  private setupNodeHttp(): void {
    // Configure isomorphic-git for Node.js/Electron use
    // HTTP client will be passed as parameter to git operations when needed
    this.httpConfig = {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      http: require('isomorphic-git/http/node'),
    }
  }

  /**
   * Executes an operation with automatic retry logic and error handling.
   *
   * @remarks
   * This method implements resilient operation execution for Electron environments:
   * - Categorizes errors into retryable and non-retryable types
   * - Implements exponential backoff for retries
   * - Tracks operation metrics for monitoring
   * - Emits events for debugging and observability
   *
   * @param operation - The async operation to execute
   * @param operationName - Name for logging and metrics
   * @param startTime - Operation start timestamp
   * @returns Promise resolving to operation result
   */
  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
    startTime: number
  ): Promise<RepositoryOperationResult<T>> {
    this.operationMetrics.totalOperations++
    let lastError: unknown

    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        const result = await operation()
        this.operationMetrics.successfulOperations++

        if (attempt > 0) {
          this.operationMetrics.retriedOperations++
          this.emit('operationRetrySucceeded', {
            operation: operationName,
            attempt,
            totalRetries: attempt,
          })
        }

        return {
          success: true,
          data: result,
          executionTime: Date.now() - startTime,
        }
      } catch (error) {
        lastError = error
        const errorCode = this.categorizeError(error)

        // Check if error is retryable and we have attempts left
        if (
          attempt < this.retryConfig.maxRetries &&
          this.isRetryableError(errorCode)
        ) {
          this.operationMetrics.totalRetries++
          const delay = this.calculateRetryDelay(attempt)

          this.emit('operationRetryAttempt', {
            operation: operationName,
            attempt: attempt + 1,
            maxRetries: this.retryConfig.maxRetries,
            error: errorCode,
            retryAfterMs: delay,
          })

          await this.sleep(delay)
          continue
        }

        // Max retries exceeded or non-retryable error
        break
      }
    }

    // Operation failed after all retries
    this.operationMetrics.failedOperations++
    const finalErrorCode = this.categorizeError(lastError)

    this.emit('operationFailed', {
      operation: operationName,
      error: finalErrorCode,
      totalAttempts: this.retryConfig.maxRetries + 1,
    })

    return this.createErrorResult(
      finalErrorCode,
      this.extractErrorMessage(lastError),
      startTime,
      lastError
    )
  }

  /**
   * Categorizes errors into appropriate error codes for better handling.
   *
   * @param error - The error to categorize
   * @returns Appropriate ErrorCode
   */
  private categorizeError(error: unknown): ErrorCode {
    if (!error) return 'UNKNOWN_ERROR'

    const errorStr = String(error).toLowerCase()
    const message =
      error instanceof Error ? error.message.toLowerCase() : errorStr

    // Network-related errors
    if (
      message.includes('network') ||
      message.includes('connection') ||
      message.includes('timeout')
    ) {
      if (message.includes('timeout')) return 'CONNECTION_TIMEOUT'
      if (message.includes('refused') || message.includes('econnrefused'))
        return 'CONNECTION_REFUSED'
      return 'NETWORK_ERROR'
    }

    // Git-specific errors
    if (message.includes('not a git repository')) return 'REPOSITORY_NOT_GIT'
    if (message.includes('no such file or directory')) return 'FILE_NOT_FOUND'
    if (
      message.includes('permission denied') ||
      message.includes('access denied')
    )
      return 'FILE_ACCESS_DENIED'
    if (message.includes('object not found')) return 'GIT_OBJECT_NOT_FOUND'
    if (
      message.includes('reference not found') ||
      message.includes('ref not found')
    )
      return 'GIT_REF_NOT_FOUND'
    if (message.includes('authentication failed') || message.includes('auth'))
      return 'GIT_AUTHENTICATION_FAILED'
    if (message.includes('merge conflict')) return 'GIT_MERGE_CONFLICT'
    if (message.includes('lock') && message.includes('git'))
      return 'REPOSITORY_LOCK_ERROR'

    // File system errors
    if (message.includes('enoent') || message.includes('file not found'))
      return 'FILE_NOT_FOUND'
    if (message.includes('eacces') || message.includes('eperm'))
      return 'FILE_ACCESS_DENIED'
    if (message.includes('emfile') || message.includes('enfile'))
      return 'FILE_SYSTEM_ERROR'

    // Default git command error
    if (message.includes('git') || message.includes('isomorphic'))
      return 'GIT_COMMAND_FAILED'

    return 'UNKNOWN_ERROR'
  }

  /**
   * Checks if an error code represents a retryable error.
   *
   * @param errorCode - The error code to check
   * @returns True if the error is retryable
   */
  private isRetryableError(errorCode: ErrorCode): boolean {
    return this.retryConfig.retryableErrors.has(errorCode)
  }

  /**
   * Calculates retry delay using exponential backoff with jitter.
   *
   * @param attempt - Current attempt number (0-based)
   * @returns Delay in milliseconds
   */
  private calculateRetryDelay(attempt: number): number {
    const exponentialDelay =
      this.retryConfig.baseDelayMs *
      Math.pow(this.retryConfig.backoffMultiplier, attempt)

    // Add jitter (±25% random variation)
    const jitter = exponentialDelay * 0.25 * (Math.random() - 0.5)
    const delayWithJitter = exponentialDelay + jitter

    return Math.min(delayWithJitter, this.retryConfig.maxDelayMs)
  }

  /**
   * Extracts a readable error message from various error types.
   *
   * @param error - The error to extract message from
   * @returns Human-readable error message
   */
  private extractErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message
    }
    if (typeof error === 'string') {
      return error
    }
    if (error && typeof error === 'object' && 'message' in error) {
      return String((error as { message: unknown }).message)
    }
    return 'An unknown error occurred'
  }

  /**
   * Simple sleep utility for retry delays.
   *
   * @param ms - Milliseconds to sleep
   * @returns Promise that resolves after the delay
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  /**
   * Gets comprehensive operation metrics and health status.
   *
   * @returns Object containing operation metrics and system health
   */
  getOperationMetrics(): {
    operations: {
      totalOperations: number
      successfulOperations: number
      failedOperations: number
      retriedOperations: number
      totalRetries: number
    }
    successRate: number
    retryRate: number
    averageRetriesPerOperation: number
    health: 'healthy' | 'degraded' | 'unhealthy'
  } {
    const successRate =
      this.operationMetrics.totalOperations > 0
        ? this.operationMetrics.successfulOperations /
          this.operationMetrics.totalOperations
        : 1

    const retryRate =
      this.operationMetrics.totalOperations > 0
        ? this.operationMetrics.retriedOperations /
          this.operationMetrics.totalOperations
        : 0

    const averageRetriesPerOperation =
      this.operationMetrics.totalOperations > 0
        ? this.operationMetrics.totalRetries /
          this.operationMetrics.totalOperations
        : 0

    // Determine system health
    let health: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'
    if (successRate < 0.5) {
      health = 'unhealthy'
    } else if (successRate < 0.9 || retryRate > 0.3) {
      health = 'degraded'
    }

    return {
      operations: { ...this.operationMetrics },
      successRate,
      retryRate,
      averageRetriesPerOperation,
      health,
    }
  }

  /**
   * Configures retry behavior for operations.
   *
   * @param config - Partial retry configuration to override
   */
  configureRetryBehavior(
    config: Partial<{
      maxRetries: number
      baseDelayMs: number
      maxDelayMs: number
      backoffMultiplier: number
      retryableErrors: Set<string>
    }>
  ): void {
    Object.assign(this.retryConfig, config)
    this.emit('retryConfigUpdated', { config: this.retryConfig })
  }

  /**
   * Starts performance monitoring including memory snapshots.
   *
   * @private
   */
  private startPerformanceMonitoring(): void {
    if (!this.performanceConfig.enabled) return

    // Take initial memory snapshot
    this.takeMemorySnapshot()

    // Set up periodic memory snapshots
    const memorySnapshotTimer = setInterval(() => {
      this.takeMemorySnapshot()
    }, this.performanceConfig.memorySnapshotInterval)

    // Clean up timer on destroy
    this.once('destroyed', () => {
      clearInterval(memorySnapshotTimer)
    })
  }

  /**
   * Records performance metrics for an operation.
   *
   * @param operationName - Name of the operation
   * @param executionTime - Time taken in milliseconds
   * @param success - Whether the operation succeeded
   * @param error - Error code if operation failed
   */
  private recordOperationMetrics(
    operationName: string,
    executionTime: number,
    success: boolean,
    error?: ErrorCode
  ): void {
    if (!this.performanceConfig.enabled) return

    // Record operation timing
    let opMetrics = this.performanceMetrics.operations.get(operationName)
    if (!opMetrics) {
      opMetrics = {
        count: 0,
        totalTime: 0,
        minTime: Infinity,
        maxTime: 0,
        averageTime: 0,
        p95Time: 0,
        recentTimes: [],
      }
      this.performanceMetrics.operations.set(operationName, opMetrics)
    }

    opMetrics.count++
    opMetrics.totalTime += executionTime
    opMetrics.minTime = Math.min(opMetrics.minTime, executionTime)
    opMetrics.maxTime = Math.max(opMetrics.maxTime, executionTime)
    opMetrics.averageTime = opMetrics.totalTime / opMetrics.count

    // Keep recent times for percentile calculation
    opMetrics.recentTimes.push(executionTime)
    if (opMetrics.recentTimes.length > this.performanceConfig.sampleSize) {
      opMetrics.recentTimes.shift()
    }

    // Calculate P95
    const sortedTimes = [...opMetrics.recentTimes].sort((a, b) => a - b)
    const p95Index = Math.floor(sortedTimes.length * 0.95)
    opMetrics.p95Time = sortedTimes[p95Index] || 0

    // Log slow operations
    if (
      this.performanceConfig.logSlowOperations &&
      executionTime > this.performanceConfig.slowOperationThreshold
    ) {
      this.emit('slowOperation', {
        operation: operationName,
        executionTime,
        threshold: this.performanceConfig.slowOperationThreshold,
      })
    }

    // Record error if present
    if (error) {
      this.recordErrorMetrics(error, operationName)
    }
  }

  /**
   * Records cache hit/miss metrics for performance analysis.
   *
   * @param operationType - Type of operation (e.g., 'status', 'commits')
   * @param hit - Whether cache was hit
   */
  private recordCacheMetrics(operationType: string, hit: boolean): void {
    if (!this.performanceConfig.enabled) return

    let cacheMetrics = this.performanceMetrics.cacheHitRates.get(operationType)
    if (!cacheMetrics) {
      cacheMetrics = { hits: 0, misses: 0, hitRate: 0 }
      this.performanceMetrics.cacheHitRates.set(operationType, cacheMetrics)
    }

    if (hit) {
      cacheMetrics.hits++
      this.cacheMetrics.hits++
    } else {
      cacheMetrics.misses++
      this.cacheMetrics.misses++
    }

    cacheMetrics.hitRate =
      cacheMetrics.hits / (cacheMetrics.hits + cacheMetrics.misses)
  }

  /**
   * Records error frequency and patterns for analysis.
   *
   * @param errorCode - The error code that occurred
   * @param operation - The operation that caused the error
   */
  private recordErrorMetrics(errorCode: ErrorCode, operation: string): void {
    if (!this.performanceConfig.enabled) return

    let errorMetrics = this.performanceMetrics.errorFrequency.get(errorCode)
    if (!errorMetrics) {
      errorMetrics = {
        count: 0,
        lastOccurrence: 0,
        operations: [],
      }
      this.performanceMetrics.errorFrequency.set(errorCode, errorMetrics)
    }

    errorMetrics.count++
    errorMetrics.lastOccurrence = Date.now()

    // Track which operations cause this error
    if (!errorMetrics.operations.includes(operation)) {
      errorMetrics.operations.push(operation)
    }
  }

  /**
   * Takes a snapshot of current memory usage for trend analysis.
   *
   * @private
   */
  private takeMemorySnapshot(): void {
    if (!this.performanceConfig.enabled) return

    const memoryUsage = process.memoryUsage()
    const cacheSize = this.estimateGitCacheSize()

    const snapshot = {
      timestamp: Date.now(),
      heapUsed: memoryUsage.heapUsed,
      heapTotal: memoryUsage.heapTotal,
      cacheSize,
    }

    this.performanceMetrics.memorySnapshots.push(snapshot)

    // Keep only recent snapshots
    while (
      this.performanceMetrics.memorySnapshots.length >
      this.performanceConfig.maxMemorySnapshots
    ) {
      this.performanceMetrics.memorySnapshots.shift()
    }

    // Emit memory pressure warnings
    const memoryUsagePercent = memoryUsage.heapUsed / memoryUsage.heapTotal
    if (memoryUsagePercent > 0.9) {
      this.emit('memoryPressureWarning', {
        heapUsed: memoryUsage.heapUsed,
        heapTotal: memoryUsage.heapTotal,
        usagePercent: memoryUsagePercent,
        cacheSize,
      })
    }
  }

  /**
   * Gets comprehensive performance analytics and insights.
   *
   * @returns Detailed performance metrics and analysis
   */
  getPerformanceAnalytics(): {
    operations: Record<
      string,
      {
        count: number
        averageTime: number
        p95Time: number
        minTime: number
        maxTime: number
        throughput: number // ops per second
      }
    >
    cache: {
      overallHitRate: number
      byOperation: Record<string, number>
      sizeBytes: number
      packfileParsingAvoided: number
    }
    memory: {
      current: NodeJS.MemoryUsage
      trend: 'increasing' | 'stable' | 'decreasing'
      peakUsage: number
      snapshots: Array<{
        timestamp: number
        heapUsed: number
        heapTotal: number
        cacheSize: number
      }>
    }
    errors: Record<
      string,
      {
        frequency: number
        lastSeen: number
        affectedOperations: string[]
      }
    >
    health: {
      overall: 'healthy' | 'degraded' | 'unhealthy'
      issues: string[]
      recommendations: string[]
    }
  } {
    // Analyze operations
    const operations: Record<
      string,
      {
        count: number
        averageTime: number
        p95Time: number
        minTime: number
        maxTime: number
        throughput: number
      }
    > = {}
    for (const [name, metrics] of this.performanceMetrics.operations) {
      const timeSpanMs =
        Date.now() -
        (this.performanceMetrics.memorySnapshots[0]?.timestamp || Date.now())
      const throughput =
        timeSpanMs > 0 ? (metrics.count / timeSpanMs) * 1000 : 0

      operations[name] = {
        count: metrics.count,
        averageTime: metrics.averageTime,
        p95Time: metrics.p95Time,
        minTime: metrics.minTime === Infinity ? 0 : metrics.minTime,
        maxTime: metrics.maxTime,
        throughput,
      }
    }

    // Analyze cache performance
    const cacheByOperation: Record<string, number> = {}
    for (const [operation, metrics] of this.performanceMetrics.cacheHitRates) {
      cacheByOperation[operation] = metrics.hitRate
    }

    const overallHitRate =
      this.cacheMetrics.operations > 0
        ? this.cacheMetrics.hits / this.cacheMetrics.operations
        : 0

    // Analyze memory trends
    const memoryUsage = process.memoryUsage()
    let memoryTrend: 'increasing' | 'stable' | 'decreasing' = 'stable'
    let peakUsage = 0

    if (this.performanceMetrics.memorySnapshots.length > 10) {
      const recent = this.performanceMetrics.memorySnapshots.slice(-10)
      const first = recent[0]?.heapUsed ?? 0
      const last = recent[recent.length - 1]?.heapUsed ?? 0
      const change = first > 0 ? (last - first) / first : 0

      if (change > 0.1) memoryTrend = 'increasing'
      else if (change < -0.1) memoryTrend = 'decreasing'

      peakUsage = Math.max(
        ...this.performanceMetrics.memorySnapshots.map((s) => s.heapUsed)
      )
    }

    // Analyze errors
    const errors: Record<
      string,
      {
        frequency: number
        lastSeen: number
        affectedOperations: string[]
      }
    > = {}
    for (const [code, metrics] of this.performanceMetrics.errorFrequency) {
      errors[code] = {
        frequency: metrics.count,
        lastSeen: metrics.lastOccurrence,
        affectedOperations: metrics.operations,
      }
    }

    // Health assessment
    const issues: string[] = []
    const recommendations: string[] = []

    // Check for performance issues
    const slowOperations = Object.entries(operations).filter(
      ([, metrics]) =>
        metrics.p95Time > this.performanceConfig.slowOperationThreshold
    )
    if (slowOperations.length > 0) {
      issues.push(
        `Slow operations detected: ${slowOperations.map(([name]) => name).join(', ')}`
      )
      recommendations.push(
        'Consider optimizing slow operations or increasing cache TTL'
      )
    }

    // Check cache performance
    if (overallHitRate < 0.7) {
      issues.push('Low cache hit rate')
      recommendations.push(
        'Consider increasing cache size or adjusting TTL values'
      )
    }

    // Check memory usage
    if (memoryTrend === 'increasing') {
      issues.push('Memory usage is trending upward')
      recommendations.push(
        'Monitor for memory leaks and consider more aggressive cache cleanup'
      )
    }

    // Check error rates
    const recentErrors = Object.values(errors).filter(
      (e) => Date.now() - e.lastSeen < 300000 // Last 5 minutes
    ).length
    if (recentErrors > 5) {
      issues.push('High recent error rate')
      recommendations.push(
        'Investigate error patterns and consider circuit breaker patterns'
      )
    }

    let health: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'
    if (issues.length > 3) health = 'unhealthy'
    else if (issues.length > 1) health = 'degraded'

    return {
      operations,
      cache: {
        overallHitRate,
        byOperation: cacheByOperation,
        sizeBytes: this.estimateGitCacheSize(),
        packfileParsingAvoided: this.cacheMetrics.packfileParsingAvoided,
      },
      memory: {
        current: memoryUsage,
        trend: memoryTrend,
        peakUsage,
        snapshots: this.performanceMetrics.memorySnapshots,
      },
      errors,
      health: {
        overall: health,
        issues,
        recommendations,
      },
    }
  }

  /**
   * Configures performance monitoring settings.
   *
   * @param config - Partial performance configuration to override
   */
  configurePerformanceMonitoring(
    config: Partial<{
      enabled: boolean
      sampleSize: number
      memorySnapshotInterval: number
      maxMemorySnapshots: number
      logSlowOperations: boolean
      slowOperationThreshold: number
    }>
  ): void {
    Object.assign(this.performanceConfig, config)
    this.emit('performanceConfigUpdated', { config: this.performanceConfig })
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
