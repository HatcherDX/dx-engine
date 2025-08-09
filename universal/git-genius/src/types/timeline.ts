/**
 * @fileoverview Timeline mode type definitions for Git Genius.
 *
 * @description
 * Defines interfaces and types specifically for Timeline mode UI integration,
 * including data structures for the dual-column diff view, sidebar content,
 * and real-time change monitoring. These types bridge Git operations with
 * the Timeline mode user interface.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */
import type { GitCommit, GitFileChange, GitDiffHunk } from './git'
/**
 * Timeline view configuration and display options.
 *
 * @public
 */
export interface TimelineViewConfig {
  /**
   * Number of commits to display in timeline
   * @default 50
   */
  commitLimit: number
  /**
   * Whether to show merge commits
   * @default true
   */
  showMergeCommits: boolean
  /**
   * Branch filter for timeline display
   */
  branchFilter?: string[]
  /**
   * Author filter for timeline display
   */
  authorFilter?: string[]
  /**
   * Date range filter
   */
  dateRange?: {
    /**
     * Start date (ISO 8601)
     */
    from: string
    /**
     * End date (ISO 8601)
     */
    to: string
  }
  /**
   * Refresh interval for real-time updates (milliseconds)
   * @default 5000
   */
  refreshInterval: number
}
/**
 * Timeline entry representing a commit in the timeline view.
 *
 * @public
 */
export interface TimelineEntry {
  /**
   * Git commit information
   */
  commit: GitCommit
  /**
   * Visual position in timeline
   */
  position: {
    /**
     * X-coordinate for branch visualization
     */
    x: number
    /**
     * Y-coordinate for chronological position
     */
    y: number
    /**
     * Branch color identifier
     */
    color: string
  }
  /**
   * Relationships to other commits
   */
  connections: TimelineConnection[]
  /**
   * Whether this entry is currently selected
   */
  isSelected: boolean
  /**
   * Whether this entry is highlighted
   */
  isHighlighted: boolean
  /**
   * Additional metadata for UI display
   */
  metadata: {
    /**
     * Branch name at this commit
     */
    branch: string
    /**
     * Whether this is a merge commit
     */
    isMerge: boolean
    /**
     * Tags associated with this commit
     */
    tags: string[]
    /**
     * Commit significance (major, minor, patch, etc.)
     */
    significance: 'major' | 'minor' | 'patch' | 'hotfix' | 'feature'
  }
}
/**
 * Connection between timeline entries for branch visualization.
 *
 * @public
 */
export interface TimelineConnection {
  /**
   * Target timeline entry
   */
  target: string
  /**
   * Connection type
   */
  type: 'parent' | 'merge' | 'branch'
  /**
   * Visual path for rendering connection
   */
  path: {
    /**
     * Starting point coordinates
     */
    start: {
      x: number
      y: number
    }
    /**
     * Ending point coordinates
     */
    end: {
      x: number
      y: number
    }
    /**
     * Intermediate control points for curves
     */
    controlPoints?: {
      x: number
      y: number
    }[]
  }
  /**
   * Connection color
   */
  color: string
}
/**
 * Dual-column diff view data structure.
 *
 * @public
 */
export interface DiffViewData {
  /**
   * Source commit information
   */
  source: {
    /**
     * Commit hash
     */
    hash: string
    /**
     * Commit message
     */
    message: string
    /**
     * Author information
     */
    author: string
    /**
     * Commit timestamp
     */
    timestamp: string
  }
  /**
   * Target commit information
   */
  target: {
    /**
     * Commit hash
     */
    hash: string
    /**
     * Commit message
     */
    message: string
    /**
     * Author information
     */
    author: string
    /**
     * Commit timestamp
     */
    timestamp: string
  }
  /**
   * File changes between source and target
   */
  fileChanges: DiffViewFileChange[]
  /**
   * Summary statistics
   */
  summary: {
    /**
     * Total files changed
     */
    filesChanged: number
    /**
     * Total lines added
     */
    linesAdded: number
    /**
     * Total lines deleted
     */
    linesDeleted: number
    /**
     * Change categories
     */
    categories: {
      /**
       * Added files count
       */
      added: number
      /**
       * Modified files count
       */
      modified: number
      /**
       * Deleted files count
       */
      deleted: number
      /**
       * Renamed files count
       */
      renamed: number
    }
  }
}
/**
 * File change data optimized for dual-column diff display.
 *
 * @public
 */
export interface DiffViewFileChange extends GitFileChange {
  /**
   * File content for side-by-side comparison
   */
  content: {
    /**
     * Original file content (left column)
     */
    before: DiffViewFileContent
    /**
     * Modified file content (right column)
     */
    after: DiffViewFileContent
  }
  /**
   * Diff hunks optimized for visual display
   */
  visualHunks: DiffViewHunk[]
  /**
   * File type information for syntax highlighting
   */
  fileType: {
    /**
     * File extension
     */
    extension: string
    /**
     * Language identifier for syntax highlighting
     */
    language: string
    /**
     * Whether the file is binary
     */
    isBinary: boolean
  }
  /**
   * UI state for this file
   */
  uiState: {
    /**
     * Whether the file is expanded in the UI
     */
    isExpanded: boolean
    /**
     * Selected line ranges
     */
    selectedLines: {
      start: number
      end: number
    }[]
    /**
     * Whether to show line numbers
     */
    showLineNumbers: boolean
  }
}
/**
 * File content structure for diff view columns.
 *
 * @public
 */
export interface DiffViewFileContent {
  /**
   * File content split into lines
   */
  lines: string[]
  /**
   * Line metadata for rendering
   */
  lineMetadata: DiffViewLineMetadata[]
  /**
   * File encoding
   */
  encoding: string
  /**
   * Whether content was truncated
   */
  isTruncated: boolean
  /**
   * Total file size in bytes
   */
  size: number
}
/**
 * Metadata for individual lines in diff view.
 *
 * @public
 */
export interface DiffViewLineMetadata {
  /**
   * Original line number
   */
  lineNumber: number
  /**
   * Line change type
   */
  changeType: 'unchanged' | 'added' | 'deleted' | 'modified'
  /**
   * Whether this line is highlighted
   */
  isHighlighted: boolean
  /**
   * Inline comments or annotations
   */
  annotations?: string[]
  /**
   * Syntax highlighting tokens
   */
  syntaxTokens?: SyntaxToken[]
}
/**
 * Syntax highlighting token for code display.
 *
 * @public
 */
export interface SyntaxToken {
  /**
   * Token type (keyword, string, comment, etc.)
   */
  type: string
  /**
   * Token text content
   */
  text: string
  /**
   * Start position in line
   */
  start: number
  /**
   * End position in line
   */
  end: number
  /**
   * CSS class for styling
   */
  cssClass: string
}
/**
 * Diff hunk optimized for visual display in Timeline mode.
 *
 * @public
 */
export interface DiffViewHunk extends GitDiffHunk {
  /**
   * Visual grouping information
   */
  visual: {
    /**
     * Hunk index for reference
     */
    index: number
    /**
     * Whether this hunk is collapsed
     */
    isCollapsed: boolean
    /**
     * Context lines to show around changes
     */
    contextLines: number
    /**
     * Hunk summary for collapsed view
     */
    summary: string
  }
  /**
   * Enhanced line information for rendering
   */
  enhancedLines: DiffViewLine[]
}
/**
 * Enhanced diff line with visual display information.
 *
 * @public
 */
export interface DiffViewLine {
  /**
   * Line content
   */
  content: string
  /**
   * Line type
   */
  type: 'context' | 'added' | 'deleted'
  /**
   * Line numbers for both sides
   */
  lineNumbers: {
    /**
     * Left column line number
     */
    left?: number
    /**
     * Right column line number
     */
    right?: number
  }
  /**
   * Visual styling information
   */
  style: {
    /**
     * Background color class
     */
    backgroundColor: string
    /**
     * Text color class
     */
    textColor: string
    /**
     * Whether to show diff indicators
     */
    showIndicators: boolean
  }
  /**
   * Inline diff information for modified lines
   */
  inlineDiff?: {
    /**
     * Character-level changes
     */
    changes: InlineChange[]
  }
}
/**
 * Character-level change information for inline diffs.
 *
 * @public
 */
export interface InlineChange {
  /**
   * Change type
   */
  type: 'added' | 'deleted' | 'unchanged'
  /**
   * Text content
   */
  text: string
  /**
   * Start position in line
   */
  start: number
  /**
   * End position in line
   */
  end: number
}
/**
 * Sidebar content data for Timeline mode.
 *
 * @public
 */
export interface TimelineSidebarData {
  /**
   * Current repository status
   */
  currentStatus: unknown
  /**
   * Recent commits section
   */
  recentCommits: {
    /**
     * Last 10 commits
     */
    commits: GitCommit[]
    /**
     * Whether more commits are available
     */
    hasMore: boolean
  }
  /**
   * Current changes section
   */
  currentChanges: {
    /**
     * Modified files
     */
    modified: GitFileChange[]
    /**
     * Staged files
     */
    staged: GitFileChange[]
    /**
     * Untracked files
     */
    untracked: string[]
    /**
     * Quick action buttons state
     */
    quickActions: {
      /**
       * Whether stage all is enabled
       */
      canStageAll: boolean
      /**
       * Whether commit is enabled
       */
      canCommit: boolean
      /**
       * Whether push is enabled
       */
      canPush: boolean
      /**
       * Whether pull is enabled
       */
      canPull: boolean
    }
  }
  /**
   * Branch information section
   */
  branches: {
    /**
     * Current branch
     */
    current: string
    /**
     * Recent branches
     */
    recent: string[]
    /**
     * Remote branches
     */
    remote: string[]
    /**
     * Branch switching state
     */
    switchingInProgress: boolean
  }
  /**
   * Real-time update information
   */
  updateInfo: {
    /**
     * Last update timestamp
     */
    lastUpdate: number
    /**
     * Whether updates are paused
     */
    isPaused: boolean
    /**
     * Next update in milliseconds
     */
    nextUpdate: number
  }
}
