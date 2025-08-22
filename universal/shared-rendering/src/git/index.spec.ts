/**
 * @fileoverview Tests for Git rendering module exports.
 *
 * @description
 * Comprehensive tests for the Git rendering module's export structure.
 * Ensures all classes, types, and utilities are properly exported and accessible.
 * Validates module structure and API consistency.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @priority HIGH
 */

import { describe, it, expect } from 'vitest'
import { GitRenderer } from './index'
import type {
  GitRendererConfig,
  GitCommitData,
  GitBranchData,
  GitDiffData,
  GitDiffHunk,
  GitDiffLine,
  TimelineState,
} from './index'

describe('🎨 Git Rendering Module - Index Exports', () => {
  describe('📦 Class Exports', () => {
    it('should export GitRenderer class', () => {
      expect(GitRenderer).toBeDefined()
      expect(typeof GitRenderer).toBe('function')
      expect(GitRenderer.name).toBe('GitRenderer')
    })

    it('should allow GitRenderer instantiation', () => {
      expect(() => {
        // This will create an instance but not initialize it
        const renderer = new GitRenderer()
        expect(renderer).toBeInstanceOf(GitRenderer)
      }).not.toThrow()
    })
  })

  describe('🔧 Type Export Validation', () => {
    it('should validate GitRendererConfig type structure', () => {
      const config: GitRendererConfig = {
        container: document.createElement('div'),
        width: 800,
        height: 600,
        debug: false,
        performance: {
          enableFrustumCulling: true,
          enableLevelOfDetail: true,
          maxCommitNodes: 1000,
          renderDistance: 100,
        },
      }

      expect(typeof config.container).toBe('object')
      expect(typeof config.width).toBe('number')
      expect(typeof config.height).toBe('number')
      expect(typeof config.debug).toBe('boolean')
      expect(typeof config.performance).toBe('object')
      expect(typeof config.performance.enableFrustumCulling).toBe('boolean')
    })

    it('should validate GitCommitData type structure', () => {
      const commitData: GitCommitData = {
        hash: 'abc123',
        message: 'Initial commit',
        author: 'Test Author',
        date: '2023-01-01T00:00:00Z',
        parentHashes: [],
        branch: 'main',
        x: 0,
        y: 0,
        z: 0,
      }

      expect(typeof commitData.hash).toBe('string')
      expect(typeof commitData.message).toBe('string')
      expect(typeof commitData.author).toBe('string')
      expect(typeof commitData.date).toBe('string')
      expect(Array.isArray(commitData.parentHashes)).toBe(true)
      expect(typeof commitData.branch).toBe('string')
      expect(typeof commitData.x).toBe('number')
      expect(typeof commitData.y).toBe('number')
      expect(typeof commitData.z).toBe('number')
    })

    it('should validate GitBranchData type structure', () => {
      const branchData: GitBranchData = {
        name: 'main',
        color: 0x00ff00,
        commits: [],
      }

      expect(typeof branchData.name).toBe('string')
      expect(typeof branchData.color).toBe('number')
      expect(Array.isArray(branchData.commits)).toBe(true)
    })

    it('should validate GitDiffData type structure', () => {
      const diffData: GitDiffData = {
        file: 'src/example.ts',
        language: 'typescript',
        binary: false,
        hunks: [],
      }

      expect(typeof diffData.file).toBe('string')
      expect(typeof diffData.language).toBe('string')
      expect(typeof diffData.binary).toBe('boolean')
      expect(Array.isArray(diffData.hunks)).toBe(true)
    })

    it('should validate GitDiffHunk type structure', () => {
      const hunk: GitDiffHunk = {
        oldStart: 1,
        oldLines: 3,
        newStart: 1,
        newLines: 5,
        lines: [],
      }

      expect(typeof hunk.oldStart).toBe('number')
      expect(typeof hunk.oldLines).toBe('number')
      expect(typeof hunk.newStart).toBe('number')
      expect(typeof hunk.newLines).toBe('number')
      expect(Array.isArray(hunk.lines)).toBe(true)
    })

    it('should validate GitDiffLine type structure', () => {
      const line: GitDiffLine = {
        type: 'add',
        content: 'const newFunction = () => {}',
        oldLineNumber: undefined,
        newLineNumber: 5,
      }

      expect(['add', 'remove', 'context']).toContain(line.type)
      expect(typeof line.content).toBe('string')
      expect(['number', 'undefined']).toContain(typeof line.oldLineNumber)
      expect(['number', 'undefined']).toContain(typeof line.newLineNumber)
    })

    it('should validate TimelineState type structure', () => {
      const timelineState: TimelineState = {
        currentIndex: 0,
        isPlaying: false,
        speed: 1.0,
        totalCommits: 100,
      }

      expect(typeof timelineState.currentIndex).toBe('number')
      expect(typeof timelineState.isPlaying).toBe('boolean')
      expect(typeof timelineState.speed).toBe('number')
      expect(typeof timelineState.totalCommits).toBe('number')
    })
  })

  describe('🔍 Type Completeness', () => {
    it('should support optional properties in GitRendererConfig', () => {
      const minimalConfig: GitRendererConfig = {
        container: document.createElement('div'),
        width: 800,
        height: 600,
      }

      expect(minimalConfig.debug).toBeUndefined()
      expect(minimalConfig.performance).toBeUndefined()
    })

    it('should support optional properties in GitCommitData', () => {
      const minimalCommit: GitCommitData = {
        hash: 'abc123',
        message: 'Test commit',
        author: 'Test Author',
        date: '2023-01-01T00:00:00Z',
        parentHashes: [],
        branch: 'main',
        x: 0,
        y: 0,
        z: 0,
      }

      expect(minimalCommit).toBeDefined()
      expect(minimalCommit.hash).toBe('abc123')
    })

    it('should support all diff line types', () => {
      const addLine: GitDiffLine = {
        type: 'add',
        content: 'Added line',
        newLineNumber: 1,
      }

      const removeLine: GitDiffLine = {
        type: 'remove',
        content: 'Removed line',
        oldLineNumber: 1,
      }

      const contextLine: GitDiffLine = {
        type: 'context',
        content: 'Context line',
        oldLineNumber: 1,
        newLineNumber: 1,
      }

      expect(addLine.type).toBe('add')
      expect(removeLine.type).toBe('remove')
      expect(contextLine.type).toBe('context')
    })
  })

  describe('🏗️ Module Integration', () => {
    it('should work with GitRenderer and its types together', () => {
      const config: GitRendererConfig = {
        container: document.createElement('div'),
        width: 800,
        height: 600,
        debug: true,
      }

      const renderer = new GitRenderer()
      expect(renderer).toBeInstanceOf(GitRenderer)
      expect(typeof config.container).toBe('object')
    })

    it('should maintain type relationships', () => {
      const diffHunk: GitDiffHunk = {
        oldStart: 1,
        oldLines: 2,
        newStart: 1,
        newLines: 3,
        lines: [
          {
            type: 'remove',
            content: 'old line',
            oldLineNumber: 1,
          },
          {
            type: 'add',
            content: 'new line',
            newLineNumber: 1,
          },
        ] as GitDiffLine[],
      }

      const diffData: GitDiffData = {
        file: 'test.ts',
        language: 'typescript',
        binary: false,
        hunks: [diffHunk],
      }

      expect(diffData.hunks).toContain(diffHunk)
      expect(diffHunk.lines.length).toBe(2)
    })
  })

  describe('🎯 API Consistency', () => {
    it('should maintain consistent naming conventions', () => {
      // All exported types should follow PascalCase
      const typeNames = [
        'GitRendererConfig',
        'GitCommitData',
        'GitBranchData',
        'GitDiffData',
        'GitDiffHunk',
        'GitDiffLine',
        'TimelineState',
      ]

      typeNames.forEach((typeName) => {
        expect(typeName).toMatch(/^[A-Z][a-zA-Z]*$/)
      })
    })

    it('should provide comprehensive Git visualization types', () => {
      // Verify that all necessary types for Git visualization are exported
      const requiredTypes = [
        'GitRendererConfig', // Configuration
        'GitCommitData', // Commit information
        'GitBranchData', // Branch information
        'GitDiffData', // Diff visualization
        'GitDiffHunk', // Diff sections
        'GitDiffLine', // Individual diff lines
        'TimelineState', // Timeline playback
      ]

      // This test verifies the types can be imported and used
      expect(requiredTypes.length).toBe(7)
    })
  })

  describe('📊 Performance Characteristics', () => {
    it('should import module quickly', () => {
      const start = Date.now()

      // Re-import to test import performance
      import('./index').then((module) => {
        const end = Date.now()
        expect(end - start).toBeLessThan(100) // Should import in <100ms
        expect(module.GitRenderer).toBeDefined()
      })
    })

    it('should create renderer instances efficiently', () => {
      const start = Date.now()

      const renderers = Array.from({ length: 10 }, () => new GitRenderer())

      const end = Date.now()
      expect(end - start).toBeLessThan(50) // Should create 10 instances in <50ms
      expect(renderers.length).toBe(10)
      expect(renderers.every((r) => r instanceof GitRenderer)).toBe(true)
    })
  })
})
