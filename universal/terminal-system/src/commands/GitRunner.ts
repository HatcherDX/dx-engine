/**
 * @fileoverview Git command runner for executing Git operations in a type-safe manner.
 *
 * @description
 * GitRunner provides a comprehensive interface for executing Git commands within the terminal system.
 * It extends CommandRunner to provide Git-specific functionality including status checking,
 * branch management, commit operations, and repository synchronization. All methods include
 * proper error handling and logging for debugging purposes.
 *
 * @example
 * ```typescript
 * const gitRunner = new GitRunner()
 *
 * // Get repository status
 * const status = await gitRunner.status()
 * console.log(`Branch: ${status.branch}, Modified files: ${status.modified.length}`)
 *
 * // Create a quick commit
 * const result = await gitRunner.quickCommit("feat: add new feature")
 * if (result.success) {
 *   console.log("Commit created successfully")
 * }
 * ```
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import { CommandRunner } from './CommandRunner'
import { Logger } from '../utils/logger'
import type {
  GitCommandOptions,
  GitStatus,
  GitCommit,
  CommandResult,
  GitRunner as GitRunnerInterface,
} from '../types/commands'

/**
 * Git command runner that provides type-safe Git operations.
 *
 * @remarks
 * This class extends {@link CommandRunner} and implements {@link GitRunnerInterface} to provide
 * a complete Git interface. It includes both basic Git operations (add, commit, push, pull)
 * and convenience methods for common workflows (quickCommit, sync).
 *
 * @public
 */
export class GitRunner extends CommandRunner implements GitRunnerInterface {
  /** Logger instance for Git operations */
  protected logger = new Logger('GitRunner')

  /**
   * Gets the current Git repository status including branch information and file changes.
   *
   * @remarks
   * This method retrieves comprehensive repository status including the current branch,
   * ahead/behind commit counts, and categorized file changes (modified, staged, untracked, conflicted).
   * It uses `git status --porcelain` for reliable parsing and handles error cases gracefully.
   *
   * @param options - Configuration options for the Git command execution
   * @returns Promise resolving to a {@link GitStatus} object with complete repository state
   *
   * @throws Will not throw but returns default status on error (branch: 'unknown', empty arrays)
   *
   * @example
   * ```typescript
   * const status = await gitRunner.status({ cwd: '/path/to/repo' })
   * console.log(`On branch ${status.branch}`)
   * console.log(`${status.modified.length} modified files`)
   * console.log(`${status.staged.length} staged files`)
   * ```
   *
   * @public
   */
  async status(options: GitCommandOptions = {}): Promise<GitStatus> {
    this.logger.info('Getting git status')

    try {
      // Get current branch
      const branchResult = await this.execute(
        'git branch --show-current',
        options
      )
      const branch = branchResult.stdout.trim() || 'main'

      // Get ahead/behind info
      const aheadBehindResult = await this.execute(
        `git rev-list --left-right --count ${branch}...origin/${branch} 2>/dev/null || echo "0	0"`,
        options
      )
      const [behind, ahead] = aheadBehindResult.stdout
        .trim()
        .split('\t')
        .map(Number)

      // Get file statuses
      const statusResult = await this.execute('git status --porcelain', options)
      const statusLines = statusResult.stdout.trim().split('\n').filter(Boolean)

      const modified: string[] = []
      const staged: string[] = []
      const untracked: string[] = []
      const conflicted: string[] = []

      for (const line of statusLines) {
        const status = line.substring(0, 2)
        const file = line.substring(3)

        if (
          status.includes('U') ||
          status.includes('A') ||
          status.includes('D')
        ) {
          conflicted.push(file)
        } else if (status[0] !== ' ' && status[0] !== '?') {
          staged.push(file)
        } else if (status[1] !== ' ') {
          modified.push(file)
        } else if (status === '??') {
          untracked.push(file)
        }
      }

      return {
        branch,
        ahead: ahead || 0,
        behind: behind || 0,
        modified,
        staged,
        untracked,
        conflicted,
      }
    } catch (error) {
      this.logger.error(
        'Failed to get git status:',
        error instanceof Error ? error : new Error(String(error))
      )
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
  }

  async log(count = 10, options: GitCommandOptions = {}): Promise<GitCommit[]> {
    this.logger.info(`Getting git log (${count} commits)`)

    try {
      const result = await this.execute(
        `git log --oneline --format="%H|%an|%ad|%s" --date=iso -n ${count}`,
        options
      )

      return result.stdout
        .trim()
        .split('\n')
        .filter(Boolean)
        .map((line) => {
          const [hash, author, date, message] = line.split('|')
          return {
            hash,
            author,
            date,
            message,
            files: [], // Would need separate call to get files
          }
        })
    } catch (error) {
      this.logger.error(
        'Failed to get git log:',
        error instanceof Error ? error : new Error(String(error))
      )
      return []
    }
  }

  async add(
    files: string[],
    options: GitCommandOptions = {}
  ): Promise<CommandResult> {
    const filesArg =
      files.length === 0 ? '.' : files.map((f) => `"${f}"`).join(' ')
    this.logger.info(`Adding files to git: ${filesArg}`)

    return this.execute(`git add ${filesArg}`, options)
  }

  async commit(
    message: string,
    options: GitCommandOptions = {}
  ): Promise<CommandResult> {
    this.logger.info('Creating git commit')

    // Escape message properly
    const escapedMessage = message.replace(/"/g, '\\"')
    return this.execute(`git commit -m "${escapedMessage}"`, options)
  }

  async push(options: GitCommandOptions = {}): Promise<CommandResult> {
    const { branch, remote = 'origin' } = options
    const pushTarget = branch ? `${remote} ${branch}` : remote

    this.logger.info(`Pushing to ${pushTarget}`)
    return this.execute(`git push ${pushTarget}`, options)
  }

  async pull(options: GitCommandOptions = {}): Promise<CommandResult> {
    const { branch, remote = 'origin' } = options
    const pullTarget = branch ? `${remote} ${branch}` : ''

    this.logger.info(`Pulling from ${remote}`)
    return this.execute(`git pull ${pullTarget}`.trim(), options)
  }

  async branch(options: GitCommandOptions = {}): Promise<string[]> {
    this.logger.info('Getting git branches')

    try {
      const result = await this.execute('git branch', options)
      return result.stdout
        .split('\n')
        .map((line) => line.replace(/^\*?\s*/, '').trim())
        .filter(Boolean)
    } catch (error) {
      this.logger.error(
        'Failed to get git branches:',
        error instanceof Error ? error : new Error(String(error))
      )
      return []
    }
  }

  async checkout(
    branch: string,
    options: GitCommandOptions = {}
  ): Promise<CommandResult> {
    this.logger.info(`Checking out branch: ${branch}`)
    return this.execute(`git checkout ${branch}`, options)
  }

  /**
   * Performs a quick commit by adding all changes and committing with the provided message.
   *
   * @remarks
   * This is a convenience method that combines `git add .` followed by `git commit -m "message"`.
   * It's designed for Timeline mode where users want to quickly save their current work state.
   * The operation is atomic - if adding files fails, the commit will not be attempted.
   *
   * @param message - The commit message to use
   * @param options - Configuration options for Git command execution
   * @returns Promise resolving to {@link CommandResult} indicating success/failure
   *
   * @throws Does not throw but returns failed CommandResult on error
   *
   * @example
   * ```typescript
   * const result = await gitRunner.quickCommit("feat: implement user dashboard")
   * if (result.success) {
   *   console.log("Changes committed successfully!")
   * } else {
   *   console.error("Commit failed:", result.stderr)
   * }
   * ```
   *
   * @beta This method is part of the Timeline mode feature set
   * @public
   */
  async quickCommit(
    message: string,
    options: GitCommandOptions = {}
  ): Promise<CommandResult> {
    this.logger.info('Performing quick commit (add all + commit)')

    // Add all changes first
    const addResult = await this.add([], options)
    if (!addResult.success) {
      return addResult
    }

    // Then commit
    return this.commit(message, options)
  }

  async sync(options: GitCommandOptions = {}): Promise<CommandResult> {
    this.logger.info('Syncing with remote (pull + push)')

    // Pull first
    const pullResult = await this.pull(options)
    if (!pullResult.success) {
      return pullResult
    }

    // Then push
    return this.push(options)
  }

  /**
   * Determines the overall working tree status in a simplified format.
   *
   * @remarks
   * This method provides a high-level view of the repository state by categorizing
   * it into three possible states:
   * - `'clean'`: No changes, staging area empty
   * - `'dirty'`: Has modified, staged, or untracked files
   * - `'conflicted'`: Has merge conflicts that need to be resolved
   *
   * @returns Promise resolving to the current working tree status
   *
   * @example
   * ```typescript
   * const status = await gitRunner.getWorkingTreeStatus()
   * switch (status) {
   *   case 'clean':
   *     console.log("Repository is clean")
   *     break
   *   case 'dirty':
   *     console.log("Repository has changes")
   *     break
   *   case 'conflicted':
   *     console.log("Repository has conflicts - resolve before proceeding")
   *     break
   * }
   * ```
   *
   * @public
   */
  async getWorkingTreeStatus(): Promise<'clean' | 'dirty' | 'conflicted'> {
    const status = await this.status()

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
  }

  async isRepository(path?: string): Promise<boolean> {
    try {
      const result = await this.execute('git rev-parse --is-inside-work-tree', {
        cwd: path,
      })
      return result.success && result.stdout.trim() === 'true'
    } catch {
      return false
    }
  }
}
