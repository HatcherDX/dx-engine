/**
 * @fileoverview Git operation type definitions for Git Genius.
 *
 * @description
 * Defines interfaces and types for Git operations including commits, diffs,
 * branches, and other Git-specific data structures. These types provide
 * comprehensive coverage of Git functionality needed for Timeline mode.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */
/**
 * Git commit information with comprehensive metadata.
 *
 * @public
 */
export interface GitCommit {
  /**
   * Full SHA-1 hash of the commit
   */
  hash: string
  /**
   * Short SHA-1 hash (first 7 characters)
   */
  shortHash: string
  /**
   * Commit author information
   */
  author: GitAuthor
  /**
   * Commit committer information (may differ from author)
   */
  committer: GitAuthor
  /**
   * Commit message (first line)
   */
  message: string
  /**
   * Full commit message including body
   */
  fullMessage: string
  /**
   * Commit timestamp (ISO 8601)
   */
  timestamp: string
  /**
   * Parent commit hashes
   */
  parents: string[]
  /**
   * Files changed in this commit
   */
  files: GitFileChange[]
  /**
   * Commit statistics (insertions, deletions)
   */
  stats: GitCommitStats
  /**
   * Whether this is a merge commit
   */
  isMerge: boolean
  /**
   * Git tags pointing to this commit
   */
  tags: string[]
}
/**
 * Git author/committer information.
 *
 * @public
 */
export interface GitAuthor {
  /**
   * Author/committer name
   */
  name: string
  /**
   * Author/committer email
   */
  email: string
  /**
   * Timestamp when authored/committed
   */
  timestamp: string
}
/**
 * File change information in a commit or diff.
 *
 * @public
 */
export interface GitFileChange {
  /**
   * File path relative to repository root
   */
  path: string
  /**
   * Previous file path (for renames)
   */
  oldPath?: string
  /**
   * Type of change
   */
  changeType: 'added' | 'modified' | 'deleted' | 'renamed' | 'copied'
  /**
   * Number of lines added
   */
  linesAdded: number
  /**
   * Number of lines deleted
   */
  linesDeleted: number
  /**
   * Whether the file is binary
   */
  isBinary: boolean
  /**
   * File permissions (octal string)
   */
  mode?: string
  /**
   * Diff hunks for this file
   */
  hunks?: GitDiffHunk[]
}
/**
 * Git commit statistics summary.
 *
 * @public
 */
export interface GitCommitStats {
  /**
   * Total files changed
   */
  filesChanged: number
  /**
   * Total lines inserted
   */
  insertions: number
  /**
   * Total lines deleted
   */
  deletions: number
}
/**
 * Git diff hunk representing a section of changes in a file.
 *
 * @public
 */
export interface GitDiffHunk {
  /**
   * Hunk header (e.g., "@@ -1,4 +1,6 @@")
   */
  header: string
  /**
   * Starting line in old file
   */
  oldStart: number
  /**
   * Number of lines in old file
   */
  oldLines: number
  /**
   * Starting line in new file
   */
  newStart: number
  /**
   * Number of lines in new file
   */
  newLines: number
  /**
   * Individual line changes in this hunk
   */
  lines: GitDiffLine[]
}
/**
 * Individual line change in a diff hunk.
 *
 * @public
 */
export interface GitDiffLine {
  /**
   * Line change type
   */
  type: 'context' | 'added' | 'deleted'
  /**
   * Line content (without diff prefix)
   */
  content: string
  /**
   * Line number in old file (for context and deleted lines)
   */
  oldLineNumber?: number
  /**
   * Line number in new file (for context and added lines)
   */
  newLineNumber?: number
}
/**
 * Git branch information.
 *
 * @public
 */
export interface GitBranch {
  /**
   * Branch name
   */
  name: string
  /**
   * Full reference name (e.g., "refs/heads/main")
   */
  ref: string
  /**
   * Current commit hash
   */
  commit: string
  /**
   * Whether this is the current branch
   */
  isCurrent: boolean
  /**
   * Whether this is a remote branch
   */
  isRemote: boolean
  /**
   * Remote name (for remote branches)
   */
  remote?: string
  /**
   * Upstream branch information
   */
  upstream?: {
    /**
     * Upstream branch name
     */
    name: string
    /**
     * Number of commits ahead
     */
    ahead: number
    /**
     * Number of commits behind
     */
    behind: number
  }
}
/**
 * Git diff options for customizing diff generation.
 *
 * @public
 */
export interface GitDiffOptions {
  /**
   * Source commit/branch for comparison
   */
  source?: string
  /**
   * Target commit/branch for comparison
   */
  target?: string
  /**
   * Specific file paths to include in diff
   */
  paths?: string[]
  /**
   * Include context lines around changes
   * @default 3
   */
  context?: number
  /**
   * Ignore whitespace changes
   * @default false
   */
  ignoreWhitespace?: boolean
  /**
   * Generate word-level diffs instead of line-level
   * @default false
   */
  wordDiff?: boolean
  /**
   * Include binary file diffs
   * @default false
   */
  includeBinary?: boolean
}
/**
 * Git log options for filtering and formatting commit history.
 *
 * @public
 */
export interface GitLogOptions {
  /**
   * Maximum number of commits to retrieve
   * @default 100
   */
  maxCount?: number
  /**
   * Starting commit hash for log traversal
   */
  since?: string
  /**
   * Ending commit hash for log traversal
   */
  until?: string
  /**
   * Author filter (name or email)
   */
  author?: string
  /**
   * Grep pattern for commit messages
   */
  grep?: string
  /**
   * Include merge commits
   * @default true
   */
  includeMerges?: boolean
  /**
   * Specific file paths to filter commits
   */
  paths?: string[]
  /**
   * Branch or reference to start from
   * @default 'HEAD'
   */
  ref?: string
}
/**
 * Git status information for the working directory.
 *
 * @public
 */
export interface GitStatus {
  /**
   * Current branch name
   */
  currentBranch: string
  /**
   * Number of commits ahead of upstream
   */
  ahead: number
  /**
   * Number of commits behind upstream
   */
  behind: number
  /**
   * Files with unstaged changes
   */
  modified: GitStatusFile[]
  /**
   * Files staged for commit
   */
  staged: GitStatusFile[]
  /**
   * Untracked files
   */
  untracked: GitStatusFile[]
  /**
   * Files with merge conflicts
   */
  conflicted: GitStatusFile[]
  /**
   * Whether the working directory is clean
   */
  isClean: boolean
}
/**
 * File status information in Git working directory.
 *
 * @public
 */
export interface GitStatusFile {
  /**
   * File path relative to repository root
   */
  path: string
  /**
   * Working directory status
   */
  workingDirStatus: GitFileStatus
  /**
   * Index (staging area) status
   */
  indexStatus: GitFileStatus
  /**
   * Whether the file is ignored by Git
   */
  isIgnored: boolean
  /**
   * File size in bytes
   */
  size?: number
  /**
   * Last modification timestamp
   */
  lastModified?: string
}
/**
 * Git file status codes.
 *
 * @public
 */
export type GitFileStatus =
  | 'unmodified'
  | 'modified'
  | 'added'
  | 'deleted'
  | 'renamed'
  | 'copied'
  | 'untracked'
  | 'ignored'
  | 'conflicted'
