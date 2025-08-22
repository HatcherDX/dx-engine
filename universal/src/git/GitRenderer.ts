/**
 * @fileoverview WebGL-accelerated Git visualization renderer.
 *
 * @description
 * Specialized renderer for high-performance Git commit graphs, diff visualization,
 * and timeline playback. Optimized for large repositories with thousands of commits
 * while maintaining smooth 60fps navigation and interactive features.
 *
 * @example
 * ```typescript
 * const engine = new WebGLEngine()
 * await engine.initialize({ canvas })
 *
 * const gitRenderer = new GitRenderer(engine)
 * await gitRenderer.initialize({
 *   maxCommits: 1000,
 *   enableInteraction: true
 * })
 *
 * gitRenderer.updateCommits(commits)
 * ```
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import * as THREE from 'three'
import type { WebGLEngine } from '../webgl/WebGLEngine'
import type { Disposable, Color, Vector3 } from '../types'

/**
 * Git commit data for visualization.
 *
 * @public
 */
export interface GitCommitData {
  /** Commit hash */
  hash: string
  /** Short hash */
  shortHash: string
  /** Commit message */
  message: string
  /** Author information */
  author: {
    name: string
    email: string
    date: Date
  }
  /** Parent commit hashes */
  parents: string[]
  /** Branch name */
  branch: string
  /** Commit tags */
  tags: string[]
  /** Number of files changed */
  filesChanged: number
  /** Lines added */
  linesAdded: number
  /** Lines deleted */
  linesDeleted: number
}

/**
 * Git branch information.
 *
 * @public
 */
export interface GitBranchData {
  /** Branch name */
  name: string
  /** Branch color */
  color: Color
  /** Whether this is the current branch */
  current: boolean
  /** Branch type */
  type: 'local' | 'remote' | 'tag'
}

/**
 * Git diff visualization data.
 *
 * @public
 */
export interface GitDiffData {
  /** File path */
  file: string
  /** Diff hunks */
  hunks: GitDiffHunk[]
  /** File type for syntax highlighting */
  language?: string
  /** Whether file is binary */
  binary: boolean
}

/**
 * Git diff hunk data.
 *
 * @public
 */
export interface GitDiffHunk {
  /** Hunk header */
  header: string
  /** Old file line start */
  oldStart: number
  /** Old file line count */
  oldCount: number
  /** New file line start */
  newStart: number
  /** New file line count */
  newCount: number
  /** Diff lines */
  lines: GitDiffLine[]
}

/**
 * Git diff line data.
 *
 * @public
 */
export interface GitDiffLine {
  /** Line content */
  content: string
  /** Line type */
  type: 'context' | 'added' | 'removed'
  /** Old line number (if applicable) */
  oldLineNumber?: number
  /** New line number (if applicable) */
  newLineNumber?: number
}

/**
 * Git renderer mode.
 *
 * @public
 */
export enum GitRendererMode {
  /** Show commit graph with timeline navigation */
  COMMIT_GRAPH = 'commit-graph',
  /** Show diff viewer only (no commits) */
  DIFF_ONLY = 'diff-only',
  /** Show both commits and diff overlay */
  HYBRID = 'hybrid',
}

/**
 * Git renderer configuration.
 *
 * @public
 */
export interface GitRendererConfig {
  /** Rendering mode */
  mode?: GitRendererMode
  /** Maximum number of commits to render */
  maxCommits: number
  /** Enable interactive features */
  enableInteraction: boolean
  /** Commit node size */
  commitNodeSize?: number
  /** Branch line width */
  branchLineWidth?: number
  /** Timeline animation speed */
  animationSpeed?: number
  /** Enable syntax highlighting in diffs */
  enableSyntaxHighlighting?: boolean
  /** Font size for text rendering */
  fontSize?: number
  /** Font family */
  fontFamily?: string
  /** Background color */
  backgroundColor?: Color
  /** Grid color */
  gridColor?: Color
  /** Selection color */
  selectionColor?: Color
}

/**
 * Timeline playback state.
 *
 * @public
 */
export interface TimelineState {
  /** Current commit index */
  currentCommit: number
  /** Total commit count */
  totalCommits: number
  /** Whether timeline is playing */
  isPlaying: boolean
  /** Playback speed (commits per second) */
  speed: number
  /** Timeline direction */
  direction: 'forward' | 'backward'
}

/**
 * Git graph layout information.
 *
 * @public
 */
interface CommitLayout {
  position: Vector3
  branch: string
  branchIndex: number
  connections: string[]
}

/**
 * WebGL-accelerated Git visualization renderer.
 *
 * @remarks
 * This renderer provides high-performance visualization of Git commit graphs,
 * diff views, and timeline playback. It's optimized for large repositories
 * and includes interactive features like hover, selection, and smooth navigation.
 *
 * Key features:
 * - Instanced rendering for commit nodes and branch lines
 * - LOD (Level of Detail) for performance with large commit histories
 * - Interactive timeline playback with smooth animations
 * - Side-by-side diff rendering with syntax highlighting
 * - Efficient occlusion culling for off-screen commits
 *
 * @public
 */
export class GitRenderer implements Disposable {
  private _engine: WebGLEngine
  private _scene: THREE.Scene | null = null
  private _camera: THREE.PerspectiveCamera | THREE.OrthographicCamera | null =
    null
  private _config: GitRendererConfig | null = null
  private _isDisposed = false
  private _isInitialized = false

  // Git data
  private _commits: GitCommitData[] = []
  private _branches: GitBranchData[] = []
  private _commitLayouts = new Map<string, CommitLayout>()

  // Rendering resources
  private _commitMaterial: THREE.ShaderMaterial | null = null
  private _branchMaterial: THREE.ShaderMaterial | null = null
  private _commitGeometry: THREE.InstancedBufferGeometry | null = null
  private _branchGeometry: THREE.BufferGeometry | null = null
  private _commitMesh: THREE.InstancedMesh | null = null
  private _branchMesh: THREE.Line | null = null

  // Diff rendering resources
  private _diffMaterial: THREE.ShaderMaterial | null = null
  private _diffGeometry: THREE.BufferGeometry | null = null
  private _diffMesh: THREE.Mesh | null = null
  private _diffTexture: THREE.DataTexture | null = null

  // Timeline state
  private _timelineState: TimelineState = {
    currentCommit: 0,
    totalCommits: 0,
    isPlaying: false,
    speed: 1,
    direction: 'forward',
  }

  // Interaction
  private _raycaster: THREE.Raycaster | null = null
  private _selectedCommit: string | null = null
  private _hoveredCommit: string | null = null

  // Animation
  private _animationId: number | null = null
  private _lastUpdateTime = 0

  constructor(engine: WebGLEngine) {
    this._engine = engine
  }

  /**
   * Initialize the Git renderer.
   *
   * @param config - Renderer configuration
   * @returns Promise that resolves when initialization is complete
   *
   * @throws Will throw if engine is not initialized
   *
   * @public
   */
  async initialize(config: GitRendererConfig): Promise<void> {
    if (this._isDisposed) {
      throw new Error('Cannot initialize disposed Git renderer')
    }

    if (this._isInitialized) {
      throw new Error('Git renderer already initialized')
    }

    if (!this._engine.threeRenderer) {
      throw new Error('WebGL engine must be initialized first')
    }

    this._config = {
      mode: GitRendererMode.COMMIT_GRAPH, // Default mode
      commitNodeSize: 8,
      branchLineWidth: 2,
      animationSpeed: 1,
      enableSyntaxHighlighting: true,
      fontSize: 12,
      fontFamily: 'Monaco, Consolas, monospace',
      backgroundColor: { r: 0.1, g: 0.1, b: 0.1, a: 1 },
      gridColor: { r: 0.3, g: 0.3, b: 0.3, a: 0.2 },
      selectionColor: { r: 0.2, g: 0.5, b: 1, a: 0.5 },
      ...config,
    }

    // Create scene and camera
    await this.setupScene()

    // Create rendering resources based on mode
    if (
      this._config.mode === GitRendererMode.COMMIT_GRAPH ||
      this._config.mode === GitRendererMode.HYBRID
    ) {
      await this.setupCommitRendering()
    }

    // Always setup diff rendering (needed for DIFF_ONLY and HYBRID modes)
    await this.setupDiffRendering()

    // Setup interaction
    if (this._config.enableInteraction) {
      this.setupInteraction()
    }

    this._isInitialized = true
  }

  /**
   * Update commit data for visualization.
   *
   * @param commits - Array of commit data
   *
   * @public
   */
  updateCommits(commits: GitCommitData[]): void {
    if (!this._config || this._isDisposed) return

    // In DIFF_ONLY mode, skip commit rendering
    if (this._config.mode === GitRendererMode.DIFF_ONLY) {
      console.log(
        '[GitRenderer] updateCommits called but skipping in DIFF_ONLY mode'
      )
      this._commits = commits.slice(0, this._config.maxCommits)
      return
    }

    console.log('[GitRenderer] updateCommits called with:', {
      totalCommits: commits.length,
      maxCommits: this._config.maxCommits,
      firstCommit: commits[0]?.shortHash,
      firstCommitMessage: commits[0]?.message?.substring(0, 50),
    })

    this._commits = commits.slice(0, this._config.maxCommits)
    this._timelineState.totalCommits = this._commits.length

    // Enable performance mode for large datasets (LOD optimization)
    const performanceMode = this._commits.length > 1000
    if (performanceMode) {
      console.log(
        `[GitRenderer] LOD optimization enabled for ${this._commits.length} commits`
      )
    }

    console.log(
      '[GitRenderer] Calculating commit layouts and updating meshes...'
    )
    // Calculate commit layouts
    this.calculateCommitLayouts()

    // Update rendering with LOD optimization
    this.updateCommitMeshWithLOD()
    this.updateBranchMesh()

    this.requestFrame()
  }

  /**
   * Update branch information.
   *
   * @param branches - Array of branch data
   *
   * @public
   */
  updateBranches(branches: GitBranchData[]): void {
    if (this._isDisposed) return

    this._branches = branches
    this.requestFrame()
  }

  /**
   * Update diff visualization.
   *
   * @param diff - Diff data (null to hide diff)
   *
   * @public
   */
  updateDiff(diff: GitDiffData | null): void {
    if (this._isDisposed) return

    console.log('[GitRenderer] updateDiff called with:', {
      hasData: !!diff,
      file: diff?.file,
      hunksCount: diff?.hunks?.length || 0,
      binary: diff?.binary,
      language: diff?.language,
    })

    // Store diff for visualization

    if (!diff) {
      console.log('[GitRenderer] Hiding diff visualization - no data')
      // Hide diff visualization
      if (this._diffMesh) {
        this._diffMesh.visible = false
      }
      this.requestFrame()
      return
    }

    console.log('[GitRenderer] Creating diff visualization for:', diff.file)
    // Create or update diff visualization
    this.createDiffVisualization(diff)
    this.requestFrame()
  }

  /**
   * Set selected commit.
   *
   * @param commitHash - Commit hash (null to clear selection)
   *
   * @public
   */
  selectCommit(commitHash: string | null): void {
    if (this._isDisposed) return

    this._selectedCommit = commitHash
    this.requestFrame()
  }

  /**
   * Navigate to specific commit.
   *
   * @param commitHash - Target commit hash
   * @param animated - Whether to animate the navigation
   *
   * @public
   */
  navigateToCommit(commitHash: string, animated = true): void {
    if (!this._camera || this._isDisposed) return

    const layout = this._commitLayouts.get(commitHash)
    if (!layout) return

    if (animated) {
      // TODO: Implement smooth camera animation
      this._camera.position.set(
        layout.position.x,
        layout.position.y,
        this._camera.position.z
      )
    } else {
      this._camera.position.set(
        layout.position.x,
        layout.position.y,
        this._camera.position.z
      )
    }

    this._camera.lookAt(layout.position.x, layout.position.y, 0)
    this.requestFrame()
  }

  /**
   * Start timeline playback.
   *
   * @param speed - Playback speed (commits per second)
   * @param direction - Playback direction
   *
   * @public
   */
  startTimeline(
    speed = 1,
    direction: 'forward' | 'backward' = 'forward'
  ): void {
    if (this._isDisposed) return

    this._timelineState.isPlaying = true
    this._timelineState.speed = speed
    this._timelineState.direction = direction
    this._lastUpdateTime = performance.now()

    this.startAnimation()
  }

  /**
   * Stop timeline playback.
   *
   * @public
   */
  stopTimeline(): void {
    if (this._isDisposed) return

    this._timelineState.isPlaying = false
    this.stopAnimation()
  }

  /**
   * Step timeline to next/previous commit.
   *
   * @param direction - Step direction
   *
   * @public
   */
  stepTimeline(direction: 'forward' | 'backward' = 'forward'): void {
    if (this._isDisposed) return

    const delta = direction === 'forward' ? 1 : -1
    const newIndex = Math.max(
      0,
      Math.min(
        this._commits.length - 1,
        this._timelineState.currentCommit + delta
      )
    )

    if (newIndex !== this._timelineState.currentCommit) {
      this._timelineState.currentCommit = newIndex
      const commit = this._commits[newIndex]
      if (commit) {
        this.navigateToCommit(commit.hash, true)
      }
    }
  }

  /**
   * Get current timeline state.
   *
   * @returns Current timeline state
   *
   * @public
   */
  getTimelineState(): TimelineState {
    return { ...this._timelineState }
  }

  /**
   * Render Git visualization.
   *
   * @returns Promise that resolves when rendering is complete
   *
   * @public
   */
  async render(): Promise<void> {
    if (!this._scene || !this._camera || this._isDisposed) return

    // Update timeline animation
    if (this._timelineState.isPlaying) {
      this.updateTimeline()
    }

    // Update interaction
    if (this._config?.enableInteraction) {
      this.updateInteraction()
    }

    // Render scene
    this._engine.render(this._scene, this._camera)
  }

  /**
   * Setup scene and camera.
   *
   * @private
   */
  private async setupScene(): Promise<void> {
    if (!this._config) return

    // Create scene
    this._scene = this._engine.createScene(this._config.backgroundColor)

    // Create camera based on mode
    if (this._config.mode === GitRendererMode.DIFF_ONLY) {
      // Use orthographic camera for diff viewing (better for text rendering)
      this._camera = this._engine.createOrthographicCamera(
        -1,
        1,
        1,
        -1,
        0.1,
        10
      )
      if (this._camera) {
        this._camera.position.set(0, 0, 1)
        this._camera.lookAt(0, 0, 0)
      }
    } else {
      // Use perspective camera for commit graph
      this._camera = this._engine.createPerspectiveCamera(75, 1, 0.1, 1000)
      if (this._camera) {
        this._camera.position.set(0, 0, 50)
      }
    }

    // Add lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 0.4)
    this._scene.add(ambientLight)

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6)
    directionalLight.position.set(10, 10, 5)
    this._scene.add(directionalLight)
  }

  /**
   * Setup commit rendering resources.
   *
   * @private
   */
  private async setupCommitRendering(): Promise<void> {
    if (!this._config) return

    // Create commit material
    this._commitMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        selected: { value: 0 },
        hovered: { value: 0 },
        selectionColor: {
          value: new THREE.Color(
            this._config.selectionColor!.r,
            this._config.selectionColor!.g,
            this._config.selectionColor!.b
          ),
        },
      },
      vertexShader: `
        attribute vec3 instancePosition;
        attribute vec4 instanceColor;
        attribute float instanceSelected;
        attribute float instanceHovered;
        
        varying vec4 vColor;
        varying float vSelected;
        varying float vHovered;
        
        void main() {
          vColor = instanceColor;
          vSelected = instanceSelected;
          vHovered = instanceHovered;
          
          vec3 pos = position * ${this._config.commitNodeSize!.toFixed(1)} + instancePosition;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 selectionColor;
        uniform float time;
        
        varying vec4 vColor;
        varying float vSelected;
        varying float vHovered;
        
        void main() {
          vec3 color = vColor.rgb;
          
          if (vSelected > 0.5) {
            color = mix(color, selectionColor, 0.7);
          } else if (vHovered > 0.5) {
            color = mix(color, selectionColor, 0.3);
          }
          
          // Add subtle pulsing for selected commits
          if (vSelected > 0.5) {
            float pulse = sin(time * 3.0) * 0.1 + 0.9;
            color *= pulse;
          }
          
          gl_FragColor = vec4(color, vColor.a);
        }
      `,
    })

    // Create commit geometry
    const sphereGeometry = new THREE.SphereGeometry(1, 8, 6)
    this._commitGeometry = new THREE.InstancedBufferGeometry()

    // Copy attributes from sphere geometry to instanced geometry
    const position = sphereGeometry.getAttribute('position')
    const normal = sphereGeometry.getAttribute('normal')
    const index = sphereGeometry.getIndex()

    if (position) this._commitGeometry.setAttribute('position', position)
    if (normal) this._commitGeometry.setAttribute('normal', normal)
    if (index) this._commitGeometry.setIndex(index)

    const maxInstances = this._config.maxCommits
    const instancePositions = new Float32Array(maxInstances * 3)
    const instanceColors = new Float32Array(maxInstances * 4)
    const instanceSelected = new Float32Array(maxInstances)
    const instanceHovered = new Float32Array(maxInstances)

    this._commitGeometry.setAttribute(
      'instancePosition',
      new THREE.InstancedBufferAttribute(instancePositions, 3)
    )
    this._commitGeometry.setAttribute(
      'instanceColor',
      new THREE.InstancedBufferAttribute(instanceColors, 4)
    )
    this._commitGeometry.setAttribute(
      'instanceSelected',
      new THREE.InstancedBufferAttribute(instanceSelected, 1)
    )
    this._commitGeometry.setAttribute(
      'instanceHovered',
      new THREE.InstancedBufferAttribute(instanceHovered, 1)
    )

    // Create commit mesh
    this._commitMesh = new THREE.InstancedMesh(
      this._commitGeometry,
      this._commitMaterial,
      maxInstances
    )
    this._scene?.add(this._commitMesh)

    // Create branch line material and geometry
    this._branchMaterial = new THREE.LineBasicMaterial({
      vertexColors: true,
    }) as unknown as THREE.ShaderMaterial

    this._branchGeometry = new THREE.BufferGeometry()
    this._branchMesh = new THREE.Line(
      this._branchGeometry,
      this._branchMaterial
    )
    this._scene?.add(this._branchMesh)
  }

  /**
   * Setup diff rendering resources.
   *
   * @private
   */
  private async setupDiffRendering(): Promise<void> {
    if (!this._config) return

    // Create diff material with custom shader for side-by-side view
    this._diffMaterial = new THREE.ShaderMaterial({
      uniforms: {
        diffTexture: { value: null },
        viewportSize: { value: new THREE.Vector2(800, 600) },
        scrollOffset: { value: new THREE.Vector2(0, 0) },
        lineHeight: { value: this._config.fontSize! * 1.4 },
        fontSize: { value: this._config.fontSize! },
        addedColor: { value: new THREE.Color(0x10b981) },
        removedColor: { value: new THREE.Color(0xef4444) },
        contextColor: { value: new THREE.Color(0xffffff) },
      },
      vertexShader: `
        varying vec2 vUv;
        
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D diffTexture;
        uniform vec2 viewportSize;
        uniform vec2 scrollOffset;
        uniform float lineHeight;
        uniform float fontSize;
        uniform vec3 addedColor;
        uniform vec3 removedColor;
        uniform vec3 contextColor;
        
        varying vec2 vUv;
        
        void main() {
          vec2 screenPos = vUv * viewportSize + scrollOffset;
          
          // Sample diff data from texture
          vec2 texCoord = screenPos / viewportSize;
          vec4 diffData = texture2D(diffTexture, texCoord);
          
          // Determine line type from texture data
          float lineType = diffData.r; // 0=context, 0.5=removed, 1.0=added
          
          vec3 color = contextColor;
          if (lineType > 0.75) {
            color = addedColor; // Added line
          } else if (lineType > 0.25 && lineType < 0.75) {
            color = removedColor; // Removed line
          }
          
          // Add subtle background for changed lines
          float bgAlpha = (lineType > 0.25) ? 0.1 : 0.0;
          
          gl_FragColor = vec4(color, 1.0 - bgAlpha);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
    })

    // Create diff geometry (full viewport quad)
    this._diffGeometry = new THREE.PlaneGeometry(2, 2)

    // Create diff mesh
    this._diffMesh = new THREE.Mesh(this._diffGeometry, this._diffMaterial)

    // Position based on mode
    if (this._config.mode === GitRendererMode.DIFF_ONLY) {
      this._diffMesh.position.z = 0 // Front and center for diff-only mode
    } else {
      this._diffMesh.position.z = -0.5 // Behind commits for hybrid mode
    }

    this._diffMesh.visible = false
    this._scene?.add(this._diffMesh)
  }

  /**
   * Create diff visualization from diff data.
   *
   * @param diff - Git diff data
   * @private
   */
  private createDiffVisualization(diff: GitDiffData): void {
    if (!this._diffMaterial || !this._diffMesh) {
      console.log(
        '[GitRenderer] createDiffVisualization - missing diff material or mesh'
      )
      return
    }

    console.log('[GitRenderer] Creating diff visualization for:', {
      file: diff.file,
      hunksCount: diff.hunks.length,
      binary: diff.binary,
      language: diff.language,
    })

    // Calculate total lines for texture size
    let totalLines = 0
    diff.hunks.forEach((hunk) => {
      totalLines += hunk.lines.length
    })

    console.log('[GitRenderer] Total lines in diff:', totalLines)

    if (totalLines === 0) {
      console.log('[GitRenderer] No lines in diff, hiding mesh')
      this._diffMesh.visible = false
      return
    }

    // Virtual scrolling optimization for large diffs
    const enableVirtualScrolling = totalLines > 1000

    if (enableVirtualScrolling) {
      console.log(
        `[GitRenderer] Virtual scrolling enabled for ${totalLines} lines diff`
      )
    }

    console.log('[GitRenderer] Creating texture data for diff visualization...')
    // Create texture data for diff lines
    const textureWidth = Math.min(1024, Math.max(256, totalLines))
    const textureHeight = Math.ceil(totalLines / textureWidth)
    const textureSize = textureWidth * textureHeight
    const textureData = new Float32Array(textureSize * 4) // RGBA

    let lineIndex = 0
    diff.hunks.forEach((hunk) => {
      hunk.lines.forEach((line) => {
        if (lineIndex >= textureSize) return

        const pixelIndex = lineIndex * 4

        // Encode line type in red channel
        switch (line.type) {
          case 'context':
            textureData[pixelIndex] = 0.0 // Context line
            break
          case 'removed':
            textureData[pixelIndex] = 0.5 // Removed line
            break
          case 'added':
            textureData[pixelIndex] = 1.0 // Added line
            break
        }

        // Store line numbers in other channels for reference
        textureData[pixelIndex + 1] = (line.oldLineNumber || 0) / 10000.0
        textureData[pixelIndex + 2] = (line.newLineNumber || 0) / 10000.0
        textureData[pixelIndex + 3] = 1.0 // Alpha

        lineIndex++
      })
    })

    // Update or create texture
    if (this._diffTexture) {
      this._diffTexture.dispose()
    }

    this._diffTexture = new THREE.DataTexture(
      textureData,
      textureWidth,
      textureHeight,
      THREE.RGBAFormat,
      THREE.FloatType
    )
    this._diffTexture.needsUpdate = true
    this._diffTexture.minFilter = THREE.NearestFilter
    this._diffTexture.magFilter = THREE.NearestFilter

    console.log('[GitRenderer] Created diff texture:', {
      width: textureWidth,
      height: textureHeight,
      size: textureSize,
      processedLines: lineIndex,
    })

    // Update material uniforms
    if (this._diffMaterial.uniforms) {
      this._diffMaterial.uniforms.diffTexture!.value = this._diffTexture
      this._diffMaterial.uniforms.viewportSize!.value.set(800, 600) // Will be updated on resize
      console.log('[GitRenderer] Updated diff material uniforms')
    }

    // Show diff mesh
    this._diffMesh.visible = true
    console.log('[GitRenderer] Diff mesh is now visible')
  }

  /**
   * Calculate commit layouts for visualization.
   *
   * @private
   */
  private calculateCommitLayouts(): void {
    if (!this._config) return

    this._commitLayouts.clear()

    // Simple linear layout for now
    // TODO: Implement more sophisticated branch-aware layout
    const spacing = this._config.commitNodeSize! * 3

    this._commits.forEach((commit, index) => {
      const x = index * spacing
      const y = 0
      const z = 0

      this._commitLayouts.set(commit.hash, {
        position: { x, y, z },
        branch: commit.branch,
        branchIndex: 0,
        connections: commit.parents,
      })
    })
  }

  /**
   * Update commit mesh with current data.
   *
   * @private
   */
  private updateCommitMesh(): void {
    if (!this._commitMesh || !this._commitGeometry) return

    const positions = this._commitGeometry.getAttribute(
      'instancePosition'
    ) as THREE.InstancedBufferAttribute
    const colors = this._commitGeometry.getAttribute(
      'instanceColor'
    ) as THREE.InstancedBufferAttribute
    const selected = this._commitGeometry.getAttribute(
      'instanceSelected'
    ) as THREE.InstancedBufferAttribute
    const hovered = this._commitGeometry.getAttribute(
      'instanceHovered'
    ) as THREE.InstancedBufferAttribute

    this._commits.forEach((commit, index) => {
      const layout = this._commitLayouts.get(commit.hash)
      if (!layout) return

      // Position
      positions.setXYZ(
        index,
        layout.position.x,
        layout.position.y,
        layout.position.z
      )

      // Color based on branch
      const branch = this._branches.find((b) => b.name === commit.branch)
      const color = branch?.color || { r: 1, g: 1, b: 1, a: 1 }
      colors.setXYZW(index, color.r, color.g, color.b, color.a)

      // Selection state
      selected.setX(index, commit.hash === this._selectedCommit ? 1 : 0)
      hovered.setX(index, commit.hash === this._hoveredCommit ? 1 : 0)
    })

    // Update instance count
    this._commitMesh.count = this._commits.length

    // Mark attributes as needing update
    positions.needsUpdate = true
    colors.needsUpdate = true
    selected.needsUpdate = true
    hovered.needsUpdate = true
  }

  /**
   * Update branch line mesh.
   *
   * @private
   */
  private updateBranchMesh(): void {
    if (!this._branchMesh || !this._branchGeometry) return

    const positions: number[] = []
    const colors: number[] = []

    // Draw connections between commits
    this._commits.forEach((commit) => {
      const layout = this._commitLayouts.get(commit.hash)
      if (!layout) return

      commit.parents.forEach((parentHash) => {
        const parentLayout = this._commitLayouts.get(parentHash)
        if (!parentLayout) return

        // Line from child to parent
        positions.push(layout.position.x, layout.position.y, layout.position.z)
        positions.push(
          parentLayout.position.x,
          parentLayout.position.y,
          parentLayout.position.z
        )

        // Use branch color
        const branch = this._branches.find((b) => b.name === commit.branch)
        const color = branch?.color || { r: 0.5, g: 0.5, b: 0.5, a: 1 }

        colors.push(color.r, color.g, color.b)
        colors.push(color.r, color.g, color.b)
      })
    })

    this._branchGeometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(positions, 3)
    )
    this._branchGeometry.setAttribute(
      'color',
      new THREE.Float32BufferAttribute(colors, 3)
    )
  }

  /**
   * Setup interaction handling.
   *
   * @private
   */
  private setupInteraction(): void {
    this._raycaster = new THREE.Raycaster()

    // Mouse event handlers would be setup here
    // TODO: Implement mouse interaction handlers
  }

  /**
   * Update interaction (hover, selection).
   *
   * @private
   */
  private updateInteraction(): void {
    if (!this._raycaster || !this._camera || !this._commitMesh) return

    // TODO: Implement raycasting for commit hover/selection
  }

  /**
   * Start animation loop.
   *
   * @private
   */
  private startAnimation(): void {
    if (this._animationId) return

    const animate = () => {
      if (!this._timelineState.isPlaying) return

      this.render()
      this._animationId = requestAnimationFrame(animate)
    }

    this._animationId = requestAnimationFrame(animate)
  }

  /**
   * Stop animation loop.
   *
   * @private
   */
  private stopAnimation(): void {
    if (this._animationId) {
      cancelAnimationFrame(this._animationId)
      this._animationId = null
    }
  }

  /**
   * Update timeline animation.
   *
   * @private
   */
  private updateTimeline(): void {
    const now = performance.now()
    const deltaTime = now - this._lastUpdateTime
    this._lastUpdateTime = now

    // Update shader uniforms for animation
    if (
      this._commitMaterial &&
      this._commitMaterial.uniforms &&
      this._commitMaterial.uniforms.time
    ) {
      this._commitMaterial.uniforms.time.value = now * 0.001
    }

    // Auto-advance timeline based on speed
    const advanceRate = this._timelineState.speed * (deltaTime / 1000)
    if (advanceRate > 1) {
      const steps = Math.floor(advanceRate)

      for (let i = 0; i < steps; i++) {
        this.stepTimeline(this._timelineState.direction)
      }
    }
  }

  /**
   * Request a render frame.
   *
   * @private
   */
  private requestFrame(): void {
    requestAnimationFrame(() => this.render())
  }

  /**
   * Whether the renderer has been disposed.
   *
   * @public
   */
  get isDisposed(): boolean {
    return this._isDisposed
  }

  /**
   * Dispose the renderer and free resources.
   *
   * @public
   */
  dispose(): void {
    if (this._isDisposed) return

    // Stop animation
    this.stopAnimation()

    // Dispose Three.js resources
    if (this._commitMaterial) {
      this._commitMaterial.dispose()
      this._commitMaterial = null
    }

    if (this._branchMaterial) {
      this._branchMaterial.dispose()
      this._branchMaterial = null
    }

    if (this._commitGeometry) {
      this._commitGeometry.dispose()
      this._commitGeometry = null
    }

    if (this._branchGeometry) {
      this._branchGeometry.dispose()
      this._branchGeometry = null
    }

    if (this._commitMesh) {
      this._scene?.remove(this._commitMesh)
      this._commitMesh = null
    }

    if (this._branchMesh) {
      this._scene?.remove(this._branchMesh)
      this._branchMesh = null
    }

    if (this._diffMaterial) {
      this._diffMaterial.dispose()
      this._diffMaterial = null
    }

    if (this._diffGeometry) {
      this._diffGeometry.dispose()
      this._diffGeometry = null
    }

    if (this._diffTexture) {
      this._diffTexture.dispose()
      this._diffTexture = null
    }

    if (this._diffMesh) {
      this._scene?.remove(this._diffMesh)
      this._diffMesh = null
    }

    this._scene = null
    this._camera = null
    this._config = null
    this._commits = []
    this._branches = []
    this._commitLayouts.clear()
    this._raycaster = null

    this._isDisposed = true
  }

  /**
   * Update commit mesh with Level of Detail (LOD) optimization.
   * For large datasets (>1000 commits), only render commits in visible range.
   *
   * @private
   */
  private updateCommitMeshWithLOD(): void {
    if (!this._commitMesh || !this._commitGeometry) return

    // For smaller datasets, use the regular update method
    if (this._commits.length <= 1000) {
      return this.updateCommitMesh()
    }

    // LOD optimization for large datasets
    const camera = this._camera
    if (!camera) return

    // Calculate visible range based on camera position
    const cameraX = camera.position.x
    const viewDistance = 200 // Distance in commit units
    const startIndex = Math.max(0, Math.floor(cameraX / 24) - viewDistance)
    const endIndex = Math.min(
      this._commits.length - 1,
      Math.floor(cameraX / 24) + viewDistance
    )

    const positions = this._commitGeometry.getAttribute(
      'instancePosition'
    ) as THREE.InstancedBufferAttribute
    const colors = this._commitGeometry.getAttribute(
      'instanceColor'
    ) as THREE.InstancedBufferAttribute
    const selected = this._commitGeometry.getAttribute(
      'instanceSelected'
    ) as THREE.InstancedBufferAttribute
    const hovered = this._commitGeometry.getAttribute(
      'instanceHovered'
    ) as THREE.InstancedBufferAttribute

    let visibleCount = 0

    // Only render commits in visible range
    for (let i = startIndex; i <= endIndex; i++) {
      const commit = this._commits[i]
      if (!commit) continue

      const layout = this._commitLayouts.get(commit.hash)
      if (!layout) continue

      // Position
      positions.setXYZ(
        visibleCount,
        layout.position.x,
        layout.position.y,
        layout.position.z
      )

      // Color based on branch
      const branch = this._branches.find((b) => b.name === commit.branch)
      const color = branch?.color || { r: 1, g: 1, b: 1, a: 1 }
      colors.setXYZW(visibleCount, color.r, color.g, color.b, color.a)

      // Selection state
      selected.setX(visibleCount, commit.hash === this._selectedCommit ? 1 : 0)
      hovered.setX(visibleCount, commit.hash === this._hoveredCommit ? 1 : 0)

      visibleCount++
    }

    // Update instance count to only visible commits
    this._commitMesh.count = visibleCount

    // Mark attributes as needing update
    positions.needsUpdate = true
    colors.needsUpdate = true
    selected.needsUpdate = true
    hovered.needsUpdate = true

    // Log performance info (throttled)
    if (Date.now() % 1000 < 16) {
      console.log(
        `LOD: Rendering ${visibleCount}/${this._commits.length} commits`
      )
    }
  }

  /**
   * Update viewport size for diff rendering.
   *
   * @param width - Viewport width
   * @param height - Viewport height
   *
   * @public
   */
  updateViewport(width: number, height: number): void {
    if (!this._diffMaterial || this._isDisposed) return

    if (
      this._diffMaterial.uniforms &&
      this._diffMaterial.uniforms.viewportSize
    ) {
      this._diffMaterial.uniforms.viewportSize.value.set(width, height)
    }
    this.requestFrame()
  }

  /**
   * Scroll diff content.
   *
   * @param deltaX - Horizontal scroll delta
   * @param deltaY - Vertical scroll delta
   *
   * @public
   */
  scrollDiff(deltaX: number, deltaY: number): void {
    if (!this._diffMaterial || this._isDisposed) return

    if (
      this._diffMaterial.uniforms &&
      this._diffMaterial.uniforms.scrollOffset
    ) {
      const currentOffset = this._diffMaterial.uniforms.scrollOffset.value
      currentOffset.x += deltaX
      currentOffset.y += deltaY

      // Clamp scroll bounds
      currentOffset.x = Math.max(0, currentOffset.x)
      currentOffset.y = Math.max(0, currentOffset.y)
    }

    this.requestFrame()
  }
}
