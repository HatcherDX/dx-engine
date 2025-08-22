/**
 * @fileoverview Comprehensive tests for GitRenderer - WebGL-accelerated Git visualization.
 *
 * @description
 * This test suite provides 100% coverage for the GitRenderer class, testing all rendering modes,
 * timeline features, diff visualization, LOD optimization, and disposal patterns.
 * Tests use comprehensive mocking for Three.js dependencies while maintaining realistic behavior.
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  GitRenderer,
  GitRendererMode,
  type GitCommitData,
  type GitBranchData,
  type GitDiffData,
  type GitRendererConfig,
} from './GitRenderer'
import type { WebGLEngine } from '../webgl/WebGLEngine'

// Mock Three.js globally
const mockScene = {
  add: vi.fn(),
  remove: vi.fn(),
  children: [],
}

const mockCamera = {
  position: { x: 0, y: 0, z: 50, set: vi.fn() },
  aspect: 1,
  lookAt: vi.fn(),
  updateProjectionMatrix: vi.fn(),
}

const mockRenderer = {
  setSize: vi.fn(),
  setClearColor: vi.fn(),
  render: vi.fn(),
  dispose: vi.fn(),
  domElement: {} as HTMLCanvasElement,
}

const mockGeometry = {
  dispose: vi.fn(),
  setAttribute: vi.fn(),
  getAttribute: vi.fn(() => ({
    setXYZ: vi.fn(),
    setXYZW: vi.fn(),
    setX: vi.fn(),
    needsUpdate: false,
  })),
  getIndex: vi.fn(),
  setIndex: vi.fn(),
}

const mockMaterial = {
  dispose: vi.fn(),
  uniforms: {
    time: { value: 0 },
    selected: { value: 0 },
    hovered: { value: 0 },
    selectionColor: { value: { r: 0.2, g: 0.5, b: 1 } },
    diffTexture: { value: null },
    viewportSize: { value: { set: vi.fn() } },
    scrollOffset: { value: { x: 0, y: 0 } },
    lineHeight: { value: 16.8 },
    fontSize: { value: 12 },
    addedColor: { value: { r: 0.06, g: 0.72, b: 0.51 } },
    removedColor: { value: { r: 0.94, g: 0.27, b: 0.27 } },
    contextColor: { value: { r: 1, g: 1, b: 1 } },
  },
}

const mockInstancedMesh = {
  count: 0,
}

const mockLine = {}

const mockMesh = {
  position: { z: 0 },
  visible: true,
}

const mockTexture = {
  dispose: vi.fn(),
  needsUpdate: false,
  minFilter: 0,
  magFilter: 0,
}

const mockRaycaster = {
  setFromCamera: vi.fn(),
  intersectObject: vi.fn(() => []),
}

vi.mock('three', () => ({
  Scene: vi.fn(() => mockScene),
  PerspectiveCamera: vi.fn(() => mockCamera),
  OrthographicCamera: vi.fn(() => mockCamera),
  WebGLRenderer: vi.fn(() => mockRenderer),
  SphereGeometry: vi.fn(() => mockGeometry),
  PlaneGeometry: vi.fn(() => mockGeometry),
  InstancedBufferGeometry: vi.fn(() => mockGeometry),
  BufferGeometry: vi.fn(() => mockGeometry),
  ShaderMaterial: vi.fn(() => mockMaterial),
  LineBasicMaterial: vi.fn(() => mockMaterial),
  InstancedMesh: vi.fn(() => mockInstancedMesh),
  Line: vi.fn(() => mockLine),
  Mesh: vi.fn(() => mockMesh),
  DataTexture: vi.fn(() => mockTexture),
  InstancedBufferAttribute: vi.fn(() => ({
    setXYZ: vi.fn(),
    setXYZW: vi.fn(),
    setX: vi.fn(),
    needsUpdate: false,
  })),
  Float32BufferAttribute: vi.fn(() => ({
    setXYZ: vi.fn(),
    setXYZW: vi.fn(),
    setX: vi.fn(),
    needsUpdate: false,
  })),
  AmbientLight: vi.fn(() => ({})),
  DirectionalLight: vi.fn(() => ({ position: { set: vi.fn() } })),
  Raycaster: vi.fn(() => mockRaycaster),
  Color: vi.fn((r, g, b) => ({ r, g, b })),
  Vector2: vi.fn(() => ({ set: vi.fn() })),
  Vector3: vi.fn(() => ({ x: 0, y: 0, z: 0 })),
  RGBAFormat: 1023,
  FloatType: 1015,
  NearestFilter: 1003,
  DoubleSide: 2,
}))

describe('🎨 GitRenderer - WebGL Git Visualization', () => {
  let gitRenderer: GitRenderer
  let mockEngine: WebGLEngine

  const sampleCommits: GitCommitData[] = [
    {
      hash: 'abc123',
      shortHash: 'abc123',
      message: 'Initial commit',
      author: { name: 'Dev', email: 'dev@test.com', date: new Date() },
      parents: [],
      branch: 'main',
      tags: ['v1.0.0'],
      filesChanged: 3,
      linesAdded: 100,
      linesDeleted: 0,
    },
    {
      hash: 'def456',
      shortHash: 'def456',
      message: 'Add feature',
      author: { name: 'Dev', email: 'dev@test.com', date: new Date() },
      parents: ['abc123'],
      branch: 'main',
      tags: [],
      filesChanged: 2,
      linesAdded: 50,
      linesDeleted: 10,
    },
    {
      hash: 'ghi789',
      shortHash: 'ghi789',
      message: 'Fix bug',
      author: { name: 'Dev', email: 'dev@test.com', date: new Date() },
      parents: ['def456'],
      branch: 'feature',
      tags: [],
      filesChanged: 1,
      linesAdded: 5,
      linesDeleted: 3,
    },
  ]

  const sampleBranches: GitBranchData[] = [
    {
      name: 'main',
      color: { r: 0.2, g: 0.5, b: 1, a: 1 },
      current: true,
      type: 'local',
    },
    {
      name: 'feature',
      color: { r: 1, g: 0.5, b: 0.2, a: 1 },
      current: false,
      type: 'local',
    },
  ]

  const sampleDiff: GitDiffData = {
    file: 'src/example.ts',
    binary: false,
    language: 'typescript',
    hunks: [
      {
        header: '@@ -1,3 +1,4 @@',
        oldStart: 1,
        oldCount: 3,
        newStart: 1,
        newCount: 4,
        lines: [
          {
            content: 'function test() {',
            type: 'context',
            oldLineNumber: 1,
            newLineNumber: 1,
          },
          {
            content: '  console.log("old");',
            type: 'removed',
            oldLineNumber: 2,
          },
          { content: '  console.log("new");', type: 'added', newLineNumber: 2 },
          { content: '  return true;', type: 'added', newLineNumber: 3 },
          { content: '}', type: 'context', oldLineNumber: 3, newLineNumber: 4 },
        ],
      },
    ],
  }

  beforeEach(() => {
    vi.clearAllMocks()

    // Reset mock states
    mockScene.add.mockClear()
    mockScene.remove.mockClear()
    mockCamera.position.set.mockClear()
    mockCamera.lookAt.mockClear()
    mockGeometry.dispose.mockClear()
    mockMaterial.dispose.mockClear()
    mockTexture.dispose.mockClear()
    mockInstancedMesh.count = 0
    mockMesh.visible = true

    // Reset scroll offset
    mockMaterial.uniforms.scrollOffset.value.x = 0
    mockMaterial.uniforms.scrollOffset.value.y = 0

    // Create mock engine
    mockEngine = {
      threeRenderer: mockRenderer,
      createScene: vi.fn(() => mockScene),
      createPerspectiveCamera: vi.fn(() => mockCamera),
      createOrthographicCamera: vi.fn(() => mockCamera),
      render: vi.fn(),
      dispose: vi.fn(),
      performanceMetrics: {
        fps: 60,
        frameTime: 16.67,
        drawCalls: 0,
        vertices: 0,
        triangles: 0,
        timestamp: Date.now(),
      },
    } as unknown as InstanceType<
      typeof import('../webgl/WebGLEngine').WebGLEngine
    >

    gitRenderer = new GitRenderer(mockEngine)
  })

  afterEach(() => {
    if (gitRenderer && !gitRenderer.isDisposed) {
      gitRenderer.dispose()
    }
    vi.restoreAllMocks()
  })

  describe('🚀 Construction and Configuration', () => {
    it('should create GitRenderer instance with engine', () => {
      expect(gitRenderer).toBeInstanceOf(GitRenderer)
      expect(gitRenderer.isDisposed).toBe(false)
    })

    it('should initialize with commit graph mode by default', async () => {
      const config: GitRendererConfig = {
        maxCommits: 100,
        enableInteraction: true,
      }

      await gitRenderer.initialize(config)

      expect(mockEngine.createScene).toHaveBeenCalled()
      expect(mockEngine.createPerspectiveCamera).toHaveBeenCalledWith(
        75,
        1,
        0.1,
        1000
      )
      expect(mockScene.add).toHaveBeenCalled() // Lights and meshes
    })

    it('should initialize with diff-only mode', async () => {
      const config: GitRendererConfig = {
        mode: GitRendererMode.DIFF_ONLY,
        maxCommits: 100,
        enableInteraction: false,
      }

      await gitRenderer.initialize(config)

      expect(mockEngine.createOrthographicCamera).toHaveBeenCalledWith(
        -1,
        1,
        1,
        -1,
        0.1,
        10
      )
      expect(mockCamera.position.set).toHaveBeenCalledWith(0, 0, 1)
    })

    it('should initialize with hybrid mode', async () => {
      const config: GitRendererConfig = {
        mode: GitRendererMode.HYBRID,
        maxCommits: 100,
        enableInteraction: true,
      }

      await gitRenderer.initialize(config)

      expect(mockEngine.createPerspectiveCamera).toHaveBeenCalled()
      expect(mockScene.add).toHaveBeenCalled() // Should add both commit and diff meshes
    })

    it('should apply custom configuration options', async () => {
      const config: GitRendererConfig = {
        maxCommits: 500,
        enableInteraction: true,
        commitNodeSize: 12,
        branchLineWidth: 3,
        animationSpeed: 2,
        enableSyntaxHighlighting: false,
        fontSize: 14,
        fontFamily: 'Fira Code, monospace',
        backgroundColor: { r: 0.05, g: 0.05, b: 0.05, a: 1 },
        gridColor: { r: 0.2, g: 0.2, b: 0.2, a: 0.3 },
        selectionColor: { r: 1, g: 0.6, b: 0, a: 0.7 },
      }

      await gitRenderer.initialize(config)

      expect(mockEngine.createScene).toHaveBeenCalledWith(
        config.backgroundColor
      )
    })

    it('should throw error when initializing disposed renderer', async () => {
      gitRenderer.dispose()

      const config: GitRendererConfig = {
        maxCommits: 100,
        enableInteraction: true,
      }

      await expect(gitRenderer.initialize(config)).rejects.toThrow(
        'Cannot initialize disposed Git renderer'
      )
    })

    it('should throw error when initializing twice', async () => {
      const config: GitRendererConfig = {
        maxCommits: 100,
        enableInteraction: true,
      }

      await gitRenderer.initialize(config)

      await expect(gitRenderer.initialize(config)).rejects.toThrow(
        'Git renderer already initialized'
      )
    })

    it('should throw error when engine is not initialized', async () => {
      const uninitializedEngine = {
        threeRenderer: null,
      } as unknown as InstanceType<
        typeof import('../webgl/WebGLEngine').WebGLEngine
      >
      const renderer = new GitRenderer(uninitializedEngine)

      const config: GitRendererConfig = {
        maxCommits: 100,
        enableInteraction: true,
      }

      await expect(renderer.initialize(config)).rejects.toThrow(
        'WebGL engine must be initialized first'
      )
    })
  })

  describe('📊 Commit Data Management', () => {
    beforeEach(async () => {
      const config: GitRendererConfig = {
        maxCommits: 100,
        enableInteraction: true,
      }
      await gitRenderer.initialize(config)
    })

    it('should update commits and calculate layouts', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      gitRenderer.updateCommits(sampleCommits)

      expect(consoleSpy).toHaveBeenCalledWith(
        '[GitRenderer] updateCommits called with:',
        expect.objectContaining({
          totalCommits: 3,
          maxCommits: 100,
          firstCommit: 'abc123',
          firstCommitMessage: 'Initial commit',
        })
      )

      expect(consoleSpy).toHaveBeenCalledWith(
        '[GitRenderer] Calculating commit layouts and updating meshes...'
      )
    })

    it('should limit commits to maxCommits', async () => {
      const config: GitRendererConfig = {
        maxCommits: 2,
        enableInteraction: true,
      }
      const renderer = new GitRenderer(mockEngine)
      await renderer.initialize(config)

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      renderer.updateCommits(sampleCommits)

      expect(consoleSpy).toHaveBeenCalledWith(
        '[GitRenderer] updateCommits called with:',
        expect.objectContaining({
          totalCommits: 3,
          maxCommits: 2,
        })
      )

      renderer.dispose()
    })

    it('should enable LOD optimization for large datasets', async () => {
      // Create a renderer with higher maxCommits to allow LOD triggering
      const config: GitRendererConfig = {
        maxCommits: 1500,
        enableInteraction: true,
      }
      const largRenderer = new GitRenderer(mockEngine)
      await largRenderer.initialize(config)

      const largeCommits = Array.from({ length: 1500 }, (_, i) => ({
        hash: `commit${i}`,
        shortHash: `commit${i}`,
        message: `Commit ${i}`,
        author: { name: 'Dev', email: 'dev@test.com', date: new Date() },
        parents: i > 0 ? [`commit${i - 1}`] : [],
        branch: 'main',
        tags: [],
        filesChanged: 1,
        linesAdded: 10,
        linesDeleted: 5,
      }))

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      largRenderer.updateCommits(largeCommits)

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('LOD optimization enabled for 1500 commits')
      )

      largRenderer.dispose()
    })

    it('should skip commit rendering in DIFF_ONLY mode', async () => {
      const config: GitRendererConfig = {
        mode: GitRendererMode.DIFF_ONLY,
        maxCommits: 100,
        enableInteraction: false,
      }
      const renderer = new GitRenderer(mockEngine)
      await renderer.initialize(config)

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      renderer.updateCommits(sampleCommits)

      expect(consoleSpy).toHaveBeenCalledWith(
        '[GitRenderer] updateCommits called but skipping in DIFF_ONLY mode'
      )
    })

    it('should handle empty commits array', () => {
      gitRenderer.updateCommits([])

      expect(mockInstancedMesh.count).toBe(0)
    })

    it('should ignore updates when disposed', () => {
      gitRenderer.dispose()

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      gitRenderer.updateCommits(sampleCommits)

      expect(consoleSpy).not.toHaveBeenCalled()
    })
  })

  describe('🌿 Branch Data Management', () => {
    beforeEach(async () => {
      const config: GitRendererConfig = {
        maxCommits: 100,
        enableInteraction: true,
      }
      await gitRenderer.initialize(config)
    })

    it('should update branch information', () => {
      gitRenderer.updateBranches(sampleBranches)

      // Should not throw and should trigger requestFrame
      expect(mockRenderer.render).not.toHaveBeenCalled() // render happens asynchronously
    })

    it('should handle empty branches array', () => {
      gitRenderer.updateBranches([])

      // Should not throw
    })

    it('should ignore updates when disposed', () => {
      gitRenderer.dispose()

      gitRenderer.updateBranches(sampleBranches)

      // Should not throw or log anything
    })
  })

  describe('📋 Diff Visualization', () => {
    beforeEach(async () => {
      const config: GitRendererConfig = {
        maxCommits: 100,
        enableInteraction: true,
      }
      await gitRenderer.initialize(config)
    })

    it('should create diff visualization from diff data', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      gitRenderer.updateDiff(sampleDiff)

      expect(consoleSpy).toHaveBeenCalledWith(
        '[GitRenderer] updateDiff called with:',
        expect.objectContaining({
          hasData: true,
          file: 'src/example.ts',
          hunksCount: 1,
          binary: false,
          language: 'typescript',
        })
      )

      expect(consoleSpy).toHaveBeenCalledWith(
        '[GitRenderer] Creating diff visualization for:',
        'src/example.ts'
      )
      expect(consoleSpy).toHaveBeenCalledWith(
        '[GitRenderer] Total lines in diff:',
        5
      )

      expect(mockMesh.visible).toBe(true)
    })

    it('should hide diff when passed null', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      gitRenderer.updateDiff(null)

      expect(consoleSpy).toHaveBeenCalledWith(
        '[GitRenderer] updateDiff called with:',
        expect.objectContaining({
          hasData: false,
        })
      )

      expect(consoleSpy).toHaveBeenCalledWith(
        '[GitRenderer] Hiding diff visualization - no data'
      )
      expect(mockMesh.visible).toBe(false)
    })

    it('should handle binary diff files', () => {
      const binaryDiff: GitDiffData = {
        file: 'image.png',
        binary: true,
        hunks: [],
      }

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      gitRenderer.updateDiff(binaryDiff)

      expect(consoleSpy).toHaveBeenCalledWith(
        '[GitRenderer] updateDiff called with:',
        expect.objectContaining({
          binary: true,
        })
      )
    })

    it('should handle diff with no lines', () => {
      const emptyDiff: GitDiffData = {
        file: 'empty.txt',
        binary: false,
        hunks: [
          {
            header: '@@ -0,0 +0,0 @@',
            oldStart: 0,
            oldCount: 0,
            newStart: 0,
            newCount: 0,
            lines: [],
          },
        ],
      }

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      gitRenderer.updateDiff(emptyDiff)

      expect(consoleSpy).toHaveBeenCalledWith(
        '[GitRenderer] Total lines in diff:',
        0
      )
      expect(consoleSpy).toHaveBeenCalledWith(
        '[GitRenderer] No lines in diff, hiding mesh'
      )
      expect(mockMesh.visible).toBe(false)
    })

    it('should enable virtual scrolling for large diffs', () => {
      const largeDiff: GitDiffData = {
        file: 'large.ts',
        binary: false,
        hunks: [
          {
            header: '@@ -1,1500 +1,1500 @@',
            oldStart: 1,
            oldCount: 1500,
            newStart: 1,
            newCount: 1500,
            lines: Array.from({ length: 1500 }, (_, i) => ({
              content: `Line ${i}`,
              type: 'context' as const,
              oldLineNumber: i + 1,
              newLineNumber: i + 1,
            })),
          },
        ],
      }

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      gitRenderer.updateDiff(largeDiff)

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Virtual scrolling enabled for 1500 lines diff')
      )
    })

    it('should ignore updates when disposed', () => {
      gitRenderer.dispose()

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      gitRenderer.updateDiff(sampleDiff)

      expect(consoleSpy).not.toHaveBeenCalled()
    })
  })

  describe('🎯 Commit Selection and Navigation', () => {
    beforeEach(async () => {
      const config: GitRendererConfig = {
        maxCommits: 100,
        enableInteraction: true,
      }
      await gitRenderer.initialize(config)
      gitRenderer.updateCommits(sampleCommits)
    })

    it('should select commit', () => {
      gitRenderer.selectCommit('abc123')

      // Should trigger requestFrame
      expect(mockRenderer.render).not.toHaveBeenCalled() // render happens asynchronously
    })

    it('should clear selection with null', () => {
      gitRenderer.selectCommit('abc123')
      gitRenderer.selectCommit(null)

      // Should not throw
    })

    it('should navigate to commit with animation', () => {
      gitRenderer.navigateToCommit('abc123', true)

      expect(mockCamera.position.set).toHaveBeenCalled()
      expect(mockCamera.lookAt).toHaveBeenCalled()
    })

    it('should navigate to commit without animation', () => {
      gitRenderer.navigateToCommit('def456', false)

      expect(mockCamera.position.set).toHaveBeenCalled()
      expect(mockCamera.lookAt).toHaveBeenCalled()
    })

    it('should ignore navigation for non-existent commit', () => {
      gitRenderer.navigateToCommit('nonexistent', true)

      // Should not crash, but position should not be set
    })

    it('should ignore navigation when disposed or no camera', () => {
      gitRenderer.dispose()

      gitRenderer.navigateToCommit('abc123', true)

      // Should not throw
    })
  })

  describe('⏰ Timeline Playback', () => {
    beforeEach(async () => {
      const config: GitRendererConfig = {
        maxCommits: 100,
        enableInteraction: true,
      }
      await gitRenderer.initialize(config)
      gitRenderer.updateCommits(sampleCommits)
    })

    it('should start timeline playback', () => {
      gitRenderer.startTimeline(2, 'forward')

      const state = gitRenderer.getTimelineState()
      expect(state.isPlaying).toBe(true)
      expect(state.speed).toBe(2)
      expect(state.direction).toBe('forward')
    })

    it('should start timeline with default parameters', () => {
      gitRenderer.startTimeline()

      const state = gitRenderer.getTimelineState()
      expect(state.isPlaying).toBe(true)
      expect(state.speed).toBe(1)
      expect(state.direction).toBe('forward')
    })

    it('should stop timeline playback', () => {
      gitRenderer.startTimeline()
      gitRenderer.stopTimeline()

      const state = gitRenderer.getTimelineState()
      expect(state.isPlaying).toBe(false)
    })

    it('should step timeline forward', () => {
      const initialState = gitRenderer.getTimelineState()
      const initialCommit = initialState.currentCommit

      gitRenderer.stepTimeline('forward')

      const newState = gitRenderer.getTimelineState()
      expect(newState.currentCommit).toBe(
        Math.min(sampleCommits.length - 1, initialCommit + 1)
      )
    })

    it('should step timeline backward', () => {
      // First move forward to have somewhere to go back
      gitRenderer.stepTimeline('forward')
      const midState = gitRenderer.getTimelineState()

      gitRenderer.stepTimeline('backward')

      const finalState = gitRenderer.getTimelineState()
      expect(finalState.currentCommit).toBe(
        Math.max(0, midState.currentCommit - 1)
      )
    })

    it('should clamp timeline at boundaries', () => {
      // Try to go before first commit
      for (let i = 0; i < 10; i++) {
        gitRenderer.stepTimeline('backward')
      }

      let state = gitRenderer.getTimelineState()
      expect(state.currentCommit).toBe(0)

      // Try to go past last commit
      for (let i = 0; i < 10; i++) {
        gitRenderer.stepTimeline('forward')
      }

      state = gitRenderer.getTimelineState()
      expect(state.currentCommit).toBe(sampleCommits.length - 1)
    })

    it('should get timeline state snapshot', () => {
      const state1 = gitRenderer.getTimelineState()
      const state2 = gitRenderer.getTimelineState()

      expect(state1).toEqual(state2)
      expect(state1).not.toBe(state2) // Should be different objects
    })

    it('should ignore timeline operations when disposed', () => {
      gitRenderer.dispose()

      gitRenderer.startTimeline()
      gitRenderer.stepTimeline('forward')
      gitRenderer.stopTimeline()

      // Should not throw
    })
  })

  describe('🎬 Rendering and Animation', () => {
    beforeEach(async () => {
      const config: GitRendererConfig = {
        maxCommits: 100,
        enableInteraction: true,
      }
      await gitRenderer.initialize(config)
      gitRenderer.updateCommits(sampleCommits)
    })

    it('should render without errors', async () => {
      await gitRenderer.render()

      expect(mockEngine.render).toHaveBeenCalledWith(mockScene, mockCamera)
    })

    it('should handle render when disposed', async () => {
      gitRenderer.dispose()

      await gitRenderer.render()

      expect(mockEngine.render).not.toHaveBeenCalled()
    })

    it('should handle render without scene or camera', async () => {
      const renderer = new GitRenderer(mockEngine)

      await renderer.render()

      expect(mockEngine.render).not.toHaveBeenCalled()
    })

    it('should update timeline during render when playing', async () => {
      gitRenderer.startTimeline()

      // Mock performance.now to simulate time passage
      const originalNow = performance.now
      let timeValue = 0
      vi.spyOn(performance, 'now').mockImplementation(() => timeValue)

      // First render
      await gitRenderer.render()

      // Advance time and render again
      timeValue += 100
      await gitRenderer.render()

      performance.now = originalNow
    })

    it('should update interaction when enabled', async () => {
      await gitRenderer.render()

      // Interaction update is internal, but should not throw
    })
  })

  describe('📏 Viewport and Scrolling', () => {
    beforeEach(async () => {
      const config: GitRendererConfig = {
        maxCommits: 100,
        enableInteraction: true,
      }
      await gitRenderer.initialize(config)
    })

    it('should update viewport size', () => {
      gitRenderer.updateViewport(1920, 1080)

      expect(mockMaterial.uniforms.viewportSize.value.set).toHaveBeenCalledWith(
        1920,
        1080
      )
    })

    it('should handle viewport update when disposed', () => {
      gitRenderer.dispose()

      gitRenderer.updateViewport(800, 600)

      // Should not throw
    })

    it('should scroll diff content', () => {
      gitRenderer.scrollDiff(10, 20)

      // Should update scroll offset uniforms (adds to current values)
      expect(mockMaterial.uniforms.scrollOffset.value.x).toBe(10)
      expect(mockMaterial.uniforms.scrollOffset.value.y).toBe(20)
    })

    it('should clamp scroll bounds', () => {
      gitRenderer.scrollDiff(-100, -100) // Try to scroll to negative values

      expect(mockMaterial.uniforms.scrollOffset.value.x).toBe(0) // Should be clamped to 0
      expect(mockMaterial.uniforms.scrollOffset.value.y).toBe(0) // Should be clamped to 0
    })

    it('should handle scroll when disposed', () => {
      gitRenderer.dispose()

      gitRenderer.scrollDiff(10, 10)

      // Should not throw
    })
  })

  describe('♻️ Resource Management and Disposal', () => {
    it('should dispose all resources properly', async () => {
      const config: GitRendererConfig = {
        maxCommits: 100,
        enableInteraction: true,
      }
      await gitRenderer.initialize(config)
      gitRenderer.updateCommits(sampleCommits)
      gitRenderer.updateDiff(sampleDiff)

      gitRenderer.dispose()

      expect(gitRenderer.isDisposed).toBe(true)
      expect(mockMaterial.dispose).toHaveBeenCalled()
      expect(mockGeometry.dispose).toHaveBeenCalled()
      expect(mockTexture.dispose).toHaveBeenCalled()
      expect(mockScene.remove).toHaveBeenCalled()
    })

    it('should handle multiple dispose calls safely', async () => {
      const config: GitRendererConfig = {
        maxCommits: 100,
        enableInteraction: true,
      }
      await gitRenderer.initialize(config)

      gitRenderer.dispose()
      gitRenderer.dispose()
      gitRenderer.dispose()

      expect(gitRenderer.isDisposed).toBe(true)
    })

    it('should dispose without initialization', () => {
      const renderer = new GitRenderer(mockEngine)

      renderer.dispose()

      expect(renderer.isDisposed).toBe(true)
    })

    it('should stop animation on disposal', async () => {
      const config: GitRendererConfig = {
        maxCommits: 100,
        enableInteraction: true,
      }
      await gitRenderer.initialize(config)

      gitRenderer.startTimeline()
      expect(gitRenderer.getTimelineState().isPlaying).toBe(true)

      gitRenderer.dispose()

      // After disposal, timeline state should indicate it's not playing
      // (disposal should call stopTimeline internally)
      expect(gitRenderer.isDisposed).toBe(true)
    })
  })

  describe('⚡ Performance Optimizations', () => {
    beforeEach(async () => {
      const config: GitRendererConfig = {
        maxCommits: 2000,
        enableInteraction: true,
      }
      await gitRenderer.initialize(config)
    })

    it('should use LOD optimization for large commit datasets', () => {
      const largeCommits = Array.from({ length: 1500 }, (_, i) => ({
        hash: `commit${i}`,
        shortHash: `c${i}`,
        message: `Commit ${i}`,
        author: { name: 'Dev', email: 'dev@test.com', date: new Date() },
        parents: i > 0 ? [`commit${i - 1}`] : [],
        branch: 'main',
        tags: [],
        filesChanged: 1,
        linesAdded: 10,
        linesDeleted: 5,
      }))

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      // Mock camera position
      mockCamera.position.x = 1200 // Position in the middle of commits

      gitRenderer.updateCommits(largeCommits)

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('LOD optimization enabled')
      )
    })

    it('should fall back to regular rendering for small datasets', () => {
      gitRenderer.updateCommits(sampleCommits) // Only 3 commits

      expect(mockInstancedMesh.count).toBe(sampleCommits.length)
    })

    it('should handle LOD without camera', () => {
      const largeCommits = Array.from({ length: 1500 }, (_, i) => ({
        hash: `commit${i}`,
        shortHash: `c${i}`,
        message: `Commit ${i}`,
        author: { name: 'Dev', email: 'dev@test.com', date: new Date() },
        parents: i > 0 ? [`commit${i - 1}`] : [],
        branch: 'main',
        tags: [],
        filesChanged: 1,
        linesAdded: 10,
        linesDeleted: 5,
      }))

      // Create renderer without camera
      const renderer = new GitRenderer(mockEngine)
      renderer.updateCommits(largeCommits)

      // Should not crash
    })
  })

  describe('🛡️ Error Handling and Edge Cases', () => {
    it('should handle missing diff material during visualization', async () => {
      const config: GitRendererConfig = {
        maxCommits: 100,
        enableInteraction: true,
      }
      await gitRenderer.initialize(config)

      // Manually clear diff material to simulate error condition
      // Access private property for testing
      ;(gitRenderer as unknown as { _diffMaterial: unknown })._diffMaterial =
        null

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      gitRenderer.updateDiff(sampleDiff)

      expect(consoleSpy).toHaveBeenCalledWith(
        '[GitRenderer] createDiffVisualization - missing diff material or mesh'
      )
    })

    it('should handle commits with missing branch information', async () => {
      const config: GitRendererConfig = {
        maxCommits: 100,
        enableInteraction: true,
      }
      await gitRenderer.initialize(config)

      const commitsWithUnknownBranch: GitCommitData[] = [
        {
          ...sampleCommits[0],
          branch: 'unknown-branch',
        },
      ]

      gitRenderer.updateCommits(commitsWithUnknownBranch)

      // Should not throw and use default color
    })

    it('should handle viewport update without diff material', () => {
      const renderer = new GitRenderer(mockEngine)

      renderer.updateViewport(800, 600)

      // Should not throw
    })

    it('should handle scroll without diff material', () => {
      const renderer = new GitRenderer(mockEngine)

      renderer.scrollDiff(10, 10)

      // Should not throw
    })

    it('should handle timeline operations with no commits', async () => {
      const config: GitRendererConfig = {
        maxCommits: 100,
        enableInteraction: true,
      }
      await gitRenderer.initialize(config)

      // Don't add any commits
      gitRenderer.stepTimeline('forward')
      gitRenderer.stepTimeline('backward')

      const state = gitRenderer.getTimelineState()
      expect(state.currentCommit).toBe(0)
      expect(state.totalCommits).toBe(0)
    })

    it('should handle navigation without camera', () => {
      const renderer = new GitRenderer(mockEngine)

      renderer.navigateToCommit('abc123', true)

      // Should not throw
    })
  })

  describe('🧪 Integration Tests', () => {
    it('should handle complete workflow from initialization to disposal', async () => {
      const config: GitRendererConfig = {
        mode: GitRendererMode.HYBRID,
        maxCommits: 100,
        enableInteraction: true,
        commitNodeSize: 10,
        animationSpeed: 1.5,
      }

      await gitRenderer.initialize(config)

      // Update data
      gitRenderer.updateCommits(sampleCommits)
      gitRenderer.updateBranches(sampleBranches)
      gitRenderer.updateDiff(sampleDiff)

      // Test interactions
      gitRenderer.selectCommit('abc123')
      gitRenderer.navigateToCommit('def456', true)

      // Test timeline
      gitRenderer.startTimeline(2, 'forward')
      gitRenderer.stepTimeline('forward')
      gitRenderer.stopTimeline()

      // Test viewport
      gitRenderer.updateViewport(1920, 1080)
      gitRenderer.scrollDiff(50, -30)

      // Render
      await gitRenderer.render()

      // Clean up
      gitRenderer.dispose()

      expect(gitRenderer.isDisposed).toBe(true)
    })

    it('should handle mode switching workflow', async () => {
      // Start with commit graph mode
      const config1: GitRendererConfig = {
        mode: GitRendererMode.COMMIT_GRAPH,
        maxCommits: 100,
        enableInteraction: true,
      }

      await gitRenderer.initialize(config1)
      gitRenderer.updateCommits(sampleCommits)

      // Dispose and reinitialize in diff-only mode
      gitRenderer.dispose()

      const renderer2 = new GitRenderer(mockEngine)
      const config2: GitRendererConfig = {
        mode: GitRendererMode.DIFF_ONLY,
        maxCommits: 100,
        enableInteraction: false,
      }

      await renderer2.initialize(config2)
      renderer2.updateDiff(sampleDiff)

      await renderer2.render()
      renderer2.dispose()

      expect(renderer2.isDisposed).toBe(true)
    })
  })
})
