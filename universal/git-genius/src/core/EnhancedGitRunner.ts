/**
 * @fileoverview Enhanced Git runner that integrates Git Genius with the terminal system.
 *
 * @description
 * The EnhancedGitRunner extends the existing terminal system's GitRunner to provide
 * advanced Git operations powered by Git Genius. It maintains compatibility with
 * the existing interface while adding Timeline mode features and improved performance.
 *
 * @example
 * ```typescript
 * import { RepositoryManager } from '@hatcherdx/git-genius'
 * import { EnhancedGitRunner } from '@hatcherdx/git-genius'
 *
 * const repoManager = new RepositoryManager()
 * const gitRunner = new EnhancedGitRunner(repoManager)
 *
 * // Enhanced status with caching
 * const status = await gitRunner.status()
 * console.log(`Advanced status: ${status.branch}`)
 *
 * // Timeline mode features
 * const timeline = await gitRunner.getTimelineData()
 * ```
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import type {
  GitCommandOptions,
  GitStatus as TerminalGitStatus,
  GitCommit as TerminalGitCommit,
  CommandResult,
} from '@hatcherdx/terminal-system'
// import { CommandRunner } from '@hatcherdx/terminal-system'
import { RepositoryManager, type RepositoryInstance } from './RepositoryManager'
import type { GitStatus, GitCommit } from '../types/git'
import type {
  TimelineEntry,
  TimelineViewConfig,
  DiffViewData,
  TimelineSidebarData,
} from '../types/timeline'

/**
 * Enhanced Git runner integrating Git Genius with the terminal system.
 *
 * @remarks
 * This class extends the existing terminal system's CommandRunner and implements
 * the GitRunner interface to provide seamless integration. It adds Git Genius
 * capabilities while maintaining backward compatibility with existing code.
 *
 * @public
 */
export class EnhancedGitRunner {
  /** Repository manager for Git Genius operations */
  private readonly repositoryManager: RepositoryManager

  /** Current working directory for Git operations */
  private currentDirectory?: string

  /** Cache for frequently accessed data */
  private readonly operationCache = new Map<
    string,
    { data: unknown; timestamp: number }
  >()

  /**
   * Creates a new EnhancedGitRunner instance.
   *
   * @param repositoryManager - Repository manager instance
   * @param fallbackToCommand - Whether to fallback to command-line Git for unsupported operations
   *
   * @example
   * ```typescript
   * const repoManager = new RepositoryManager()
   * const gitRunner = new EnhancedGitRunner(repoManager, true)
   * ```
   */
  constructor(
    repositoryManager: RepositoryManager,
    private readonly fallbackToCommand = true
  ) {
    this.repositoryManager = repositoryManager
  }

  /**
   * Gets the current Git repository status using Git Genius engine.
   *
   * @param options - Git command options including working directory
   * @returns Promise resolving to Git status in terminal system format
   *
   * @example
   * ```typescript
   * const status = await gitRunner.status({ cwd: '/path/to/repo' })
   * console.log(`Branch: ${status.branch}, modified: ${status.modified.length}`)
   * ```
   */
  async status(options: GitCommandOptions = {}): Promise<TerminalGitStatus> {
    try {
      const repository = await this.ensureRepository(options.cwd)
      if (!repository) {
        return this.fallbackStatus()
      }

      const result = await repository.engine.getStatus()
      if (!result.success || !result.data) {
        return this.fallbackStatus()
      }

      // Convert Git Genius format to terminal system format
      return this.convertToTerminalStatus(result.data)
    } catch (error) {
      console.warn(
        'EnhancedGitRunner: status failed, falling back to command:',
        error
      )
      return this.fallbackStatus()
    }
  }

  /**
   * Gets commit log using Git Genius engine with enhanced performance.
   *
   * @param count - Number of commits to retrieve
   * @param options - Git command options
   * @returns Promise resolving to array of commits in terminal system format
   */
  async log(
    count = 10,
    options: GitCommandOptions = {}
  ): Promise<TerminalGitCommit[]> {
    try {
      const repository = await this.ensureRepository(options.cwd)
      if (!repository) {
        return this.fallbackLog(count)
      }

      const result = await repository.engine.getCommits({ maxCount: count })
      if (!result.success || !result.data) {
        return this.fallbackLog(count)
      }

      // Convert Git Genius format to terminal system format
      return result.data.map(this.convertToTerminalCommit)
    } catch (error) {
      console.warn(
        'EnhancedGitRunner: log failed, falling back to command:',
        error
      )
      return this.fallbackLog(count)
    }
  }

  /**
   * Adds files to the staging area using Git Genius when possible.
   *
   * @param files - Files to add (empty array for all files)
   * @param options - Git command options
   * @returns Promise resolving to command result
   */
  async add(
    files: string[]
    /* _options: GitCommandOptions = {} */
  ): Promise<CommandResult> {
    // For now, fallback to command-line for operations that modify state
    // TODO: Implement add operation in Git Genius
    return this.fallbackAdd(files)
  }

  /**
   * Creates a commit using Git Genius when possible.
   *
   * @param message - Commit message
   * @param options - Git command options
   * @returns Promise resolving to command result
   */
  async commit(
    message: string
    /* _options: GitCommandOptions = {} */
  ): Promise<CommandResult> {
    // For now, fallback to command-line for operations that modify state
    // TODO: Implement commit operation in Git Genius
    return this.fallbackCommit(message)
  }

  /**
   * Pushes changes to remote repository.
   *
   * @param options - Git command options
   * @returns Promise resolving to command result
   */
  async push(/* _options: GitCommandOptions = {} */): Promise<CommandResult> {
    // For now, fallback to command-line for remote operations
    return this.fallbackPush()
  }

  /**
   * Pulls changes from remote repository.
   *
   * @param options - Git command options
   * @returns Promise resolving to command result
   */
  async pull(/* _options: GitCommandOptions = {} */): Promise<CommandResult> {
    // For now, fallback to command-line for remote operations
    return this.fallbackPull()
  }

  /**
   * Gets available branches using Git Genius engine.
   *
   * @param options - Git command options
   * @returns Promise resolving to array of branch names
   */
  async branch(options: GitCommandOptions = {}): Promise<string[]> {
    try {
      const repository = await this.ensureRepository(options.cwd)
      if (!repository) {
        return this.fallbackBranch()
      }

      const result = await repository.engine.getBranches()
      if (!result.success || !result.data) {
        return this.fallbackBranch()
      }

      return result.data.map((branch) => branch.name)
    } catch (error) {
      console.warn(
        'EnhancedGitRunner: branch failed, falling back to command:',
        error
      )
      return this.fallbackBranch()
    }
  }

  /**
   * Checks out a branch.
   *
   * @param branch - Branch name to checkout
   * @param options - Git command options
   * @returns Promise resolving to command result
   */
  async checkout(
    branch: string
    /* _options: GitCommandOptions = {} */
  ): Promise<CommandResult> {
    // For now, fallback to command-line for operations that modify state
    return this.fallbackCheckout(branch)
  }

  /**
   * Performs a quick commit (add all + commit) with enhanced performance.
   *
   * @param message - Commit message
   * @param options - Git command options
   * @returns Promise resolving to command result
   */
  async quickCommit(
    message: string
    /* _options: GitCommandOptions = {} */
  ): Promise<CommandResult> {
    // For now, fallback to command-line
    // TODO: Implement optimized quick commit in Git Genius
    return this.fallbackQuickCommit(message)
  }

  /**
   * Syncs with remote (pull + push).
   *
   * @param options - Git command options
   * @returns Promise resolving to command result
   */
  async sync(/* _options: GitCommandOptions = {} */): Promise<CommandResult> {
    // For now, fallback to command-line for remote operations
    return this.fallbackSync()
  }

  /**
   * Gets working tree status in simplified format.
   *
   * @returns Promise resolving to working tree status
   */
  async getWorkingTreeStatus(): Promise<'clean' | 'dirty' | 'conflicted'> {
    try {
      const repository = await this.ensureRepository()
      if (!repository) {
        return this.fallbackGetWorkingTreeStatus()
      }

      const result = await repository.engine.getStatus()
      if (!result.success || !result.data) {
        return this.fallbackGetWorkingTreeStatus()
      }

      const status = result.data
      if (status.conflicted.length > 0) {
        return 'conflicted'
      }

      if (
        status.modified.length > 0 ||
        status.staged.length > 0 ||
        status.untracked.length > 0
      ) {
        return 'dirty'
      }

      return 'clean'
    } catch (error) {
      console.warn(
        'EnhancedGitRunner: getWorkingTreeStatus failed, falling back:',
        error
      )
      return this.fallbackGetWorkingTreeStatus()
    }
  }

  /**
   * Checks if directory is a Git repository.
   *
   * @param path - Directory path to check
   * @returns Promise resolving to whether directory is a Git repository
   */
  async isRepository(path?: string): Promise<boolean> {
    try {
      const repository = await this.ensureRepository(path)
      if (!repository) {
        return this.fallbackIsRepository()
      }

      return await repository.engine.isRepository()
    } catch {
      return this.fallbackIsRepository()
    }
  }

  // === Git Genius Enhanced Features ===

  /**
   * Gets Timeline mode data for advanced UI visualization.
   *
   * @param config - Timeline view configuration
   * @returns Promise resolving to timeline entries
   */
  async getTimelineData(config: TimelineViewConfig): Promise<TimelineEntry[]> {
    const repository = await this.ensureRepository()
    if (!repository) {
      throw new Error('No active repository for Timeline mode')
    }

    const result = await repository.engine.getCommits({
      maxCount: config.commitLimit,
      includeMerges: config.showMergeCommits,
    })

    if (!result.success || !result.data) {
      throw new Error('Failed to get commits for Timeline mode')
    }

    // Transform commits to timeline entries
    return result.data.map((commit, index) =>
      this.convertToTimelineEntry(commit, index)
    )
  }

  /**
   * Gets diff data optimized for dual-column Timeline mode view.
   *
   * @param sourceCommit - Source commit hash
   * @param targetCommit - Target commit hash
   * @param options - Diff options
   * @returns Promise resolving to diff view data
   */
  async getDiffViewData(
    sourceCommit: string,
    targetCommit: string
    /* _options?: GitDiffOptions */
  ): Promise<DiffViewData> {
    const repository = await this.ensureRepository()
    if (!repository) {
      throw new Error('No active repository for diff view')
    }

    // TODO: Implement diff generation using Git Genius
    // For now, return a basic structure
    const commits = await repository.engine.getCommits({ maxCount: 100 })
    const commitsData = commits.success ? commits.data || [] : []

    const sourceCommitData = commitsData.find((c) => c.hash === sourceCommit)
    const targetCommitData = commitsData.find((c) => c.hash === targetCommit)

    if (!sourceCommitData || !targetCommitData) {
      throw new Error('Commits not found for diff view')
    }

    return {
      source: {
        hash: sourceCommitData.hash,
        message: sourceCommitData.message,
        author: sourceCommitData.author.name,
        timestamp: sourceCommitData.timestamp,
      },
      target: {
        hash: targetCommitData.hash,
        message: targetCommitData.message,
        author: targetCommitData.author.name,
        timestamp: targetCommitData.timestamp,
      },
      fileChanges: [], // TODO: Implement file change detection
      summary: {
        filesChanged: 0,
        linesAdded: 0,
        linesDeleted: 0,
        categories: {
          added: 0,
          modified: 0,
          deleted: 0,
          renamed: 0,
        },
      },
    }
  }

  /**
   * Gets sidebar data for Timeline mode UI.
   *
   * @returns Promise resolving to sidebar data
   */
  async getTimelineSidebarData(): Promise<TimelineSidebarData> {
    const repository = await this.ensureRepository()
    if (!repository) {
      throw new Error('No active repository for sidebar data')
    }

    const [statusResult, commitsResult, branchesResult] = await Promise.all([
      repository.engine.getStatus(),
      repository.engine.getCommits({ maxCount: 10 }),
      repository.engine.getBranches(),
    ])

    const status = statusResult.success ? statusResult.data : null
    const commits = commitsResult.success ? commitsResult.data || [] : []
    const branches = branchesResult.success ? branchesResult.data || [] : []

    return {
      currentStatus: status
        ? this.convertToTerminalStatus(status)
        : this.getEmptyStatus(),
      recentCommits: {
        commits: commits.slice(0, 10),
        hasMore: commits.length === 10,
      },
      currentChanges: {
        modified:
          status?.modified.map((f) => ({
            path: f.path,
            changeType: 'modified' as const,
            linesAdded: 0,
            linesDeleted: 0,
            isBinary: false,
            oldPath: undefined,
          })) || [],
        staged:
          status?.staged.map((f) => ({
            path: f.path,
            changeType: 'modified' as const,
            linesAdded: 0,
            linesDeleted: 0,
            isBinary: false,
            oldPath: undefined,
          })) || [],
        untracked: status?.untracked.map((f) => f.path) || [],
        quickActions: {
          canStageAll: (status?.modified.length || 0) > 0,
          canCommit: (status?.staged.length || 0) > 0,
          canPush: true, // TODO: Determine based on ahead commits
          canPull: true, // TODO: Determine based on behind commits
        },
      },
      branches: {
        current: status?.currentBranch || 'main',
        recent: branches
          .filter((b) => !b.isRemote)
          .map((b) => b.name)
          .slice(0, 5),
        remote: branches
          .filter((b) => b.isRemote)
          .map((b) => b.name)
          .slice(0, 5),
        switchingInProgress: false,
      },
      updateInfo: {
        lastUpdate: Date.now(),
        isPaused: false,
        nextUpdate: Date.now() + 5000,
      },
    }
  }

  // === Private Methods ===

  /**
   * Ensures a repository is available for operations.
   */
  private async ensureRepository(
    cwd?: string
  ): Promise<RepositoryInstance | undefined> {
    const workingDir = cwd || this.currentDirectory || process.cwd()

    // Try to get active repository first
    let repository = this.repositoryManager.getActiveRepository()

    // If no active repository or path doesn't match, try to open the repository
    if (!repository || repository.metadata.config.path !== workingDir) {
      try {
        const result = await this.repositoryManager.openRepository(workingDir)
        repository = result.success ? result.data : undefined
      } catch (error) {
        console.warn('Could not open repository:', error)
        repository = undefined
      }
    }

    if (repository) {
      this.currentDirectory = repository.metadata.config.path
    }

    return repository
  }

  /**
   * Converts Git Genius status to terminal system format.
   */
  private convertToTerminalStatus(status: GitStatus): TerminalGitStatus {
    return {
      branch: status.currentBranch,
      ahead: status.ahead,
      behind: status.behind,
      modified: status.modified.map((f) => f.path),
      staged: status.staged.map((f) => f.path),
      untracked: status.untracked.map((f) => f.path),
      conflicted: status.conflicted.map((f) => f.path),
    }
  }

  /**
   * Converts Git Genius commit to terminal system format.
   */
  private convertToTerminalCommit(commit: GitCommit): TerminalGitCommit {
    return {
      hash: commit.hash,
      author: commit.author.name,
      date: commit.timestamp,
      message: commit.message,
      files: commit.files.map((f) => f.path),
    }
  }

  /**
   * Converts Git Genius commit to Timeline entry.
   */
  private convertToTimelineEntry(
    commit: GitCommit,
    index: number
    /* _config?: TimelineViewConfig */
  ): TimelineEntry {
    return {
      commit,
      position: {
        x: 50, // TODO: Calculate based on branch visualization
        y: index * 60, // Vertical spacing
        color: commit.isMerge ? '#ff6b6b' : '#4ecdc4',
      },
      connections: [], // TODO: Calculate connections to parent commits
      isSelected: false,
      isHighlighted: false,
      metadata: {
        branch: 'main', // TODO: Determine branch
        isMerge: commit.isMerge,
        tags: commit.tags,
        significance: this.determineCommitSignificance(commit),
      },
    }
  }

  /**
   * Determines commit significance for Timeline visualization.
   */
  private determineCommitSignificance(
    commit: GitCommit
  ): TimelineEntry['metadata']['significance'] {
    const message = commit.message.toLowerCase()

    if (message.includes('major') || message.includes('breaking')) {
      return 'major'
    } else if (message.includes('feat') || message.includes('feature')) {
      return 'feature'
    } else if (message.includes('fix') || message.includes('hotfix')) {
      return 'hotfix'
    } else if (message.includes('patch')) {
      return 'patch'
    }

    return 'minor'
  }

  /**
   * Gets empty status for fallback scenarios.
   */
  private getEmptyStatus(): TerminalGitStatus {
    return {
      branch: 'unknown',
      ahead: 0,
      behind: 0,
      modified: [],
      staged: [],
      untracked: [],
      conflicted: [],
    }
  }

  /**
   * Execute a command (placeholder for terminal system integration).
   */
  private async execute(
    command: string /* _options?: GitCommandOptions */
  ): Promise<CommandResult> {
    // This is a placeholder implementation
    // In a real scenario, this would integrate with the terminal system
    return {
      success: false,
      stdout: '',
      stderr: 'Not implemented - placeholder for terminal system integration',
      exitCode: 1,
      duration: 0,
      command,
    }
  }

  // === Fallback Methods ===
  // These methods use the original CommandRunner for operations that Git Genius doesn't support yet

  private async fallbackStatus(/* _options: GitCommandOptions */): Promise<TerminalGitStatus> {
    // Use original GitRunner implementation as fallback
    await this.execute('git status --porcelain -b')
    // TODO: Parse git status output and return proper format
    return this.getEmptyStatus()
  }

  private async fallbackLog(count: number): Promise<TerminalGitCommit[]> {
    await this.execute(`git log --oneline -n ${count}`)
    // TODO: Parse git log output and return proper format
    return []
  }

  private async fallbackAdd(files: string[]): Promise<CommandResult> {
    const filesArg =
      files.length === 0 ? '.' : files.map((f) => `"${f}"`).join(' ')
    return this.execute(`git add ${filesArg}`)
  }

  private async fallbackCommit(message: string): Promise<CommandResult> {
    const escapedMessage = message.replace(/"/g, '\\"')
    return this.execute(`git commit -m "${escapedMessage}"`)
  }

  private async fallbackPush(/* _options: GitCommandOptions */): Promise<CommandResult> {
    return this.execute('git push')
  }

  private async fallbackPull(/* _options: GitCommandOptions */): Promise<CommandResult> {
    return this.execute('git pull')
  }

  private async fallbackBranch(/* _options: GitCommandOptions */): Promise<
    string[]
  > {
    const result = await this.execute('git branch')
    return result.stdout
      .split('\n')
      .map((line) => line.replace(/^\*?\s*/, '').trim())
      .filter(Boolean)
  }

  private async fallbackCheckout(branch: string): Promise<CommandResult> {
    return this.execute(`git checkout ${branch}`)
  }

  private async fallbackQuickCommit(message: string): Promise<CommandResult> {
    const addResult = await this.execute('git add .')
    if (!addResult.success) {
      return addResult
    }
    return this.fallbackCommit(message)
  }

  private async fallbackSync(/* _options: GitCommandOptions */): Promise<CommandResult> {
    const pullResult = await this.execute('git pull')
    if (!pullResult.success) {
      return pullResult
    }
    return this.execute('git push')
  }

  private async fallbackGetWorkingTreeStatus(): Promise<
    'clean' | 'dirty' | 'conflicted'
  > {
    const result = await this.execute('git status --porcelain')
    if (!result.success || !result.stdout.trim()) {
      return 'clean'
    }
    // TODO: Parse output to detect conflicts
    return 'dirty'
  }

  private async fallbackIsRepository(/* _path?: string */): Promise<boolean> {
    const result = await this.execute('git rev-parse --is-inside-work-tree')
    return result.success && result.stdout.trim() === 'true'
  }
}
