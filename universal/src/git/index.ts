/**
 * @fileoverview Git rendering module exports.
 *
 * @description
 * Exports all Git-specific rendering classes and utilities.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

export { GitRenderer } from './GitRenderer'
export type {
  GitRendererConfig,
  GitCommitData,
  GitBranchData,
  GitDiffData,
  GitDiffHunk,
  GitDiffLine,
  TimelineState,
} from './GitRenderer'
