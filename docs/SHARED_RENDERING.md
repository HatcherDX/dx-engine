# Shared Rendering Engine

**Technical documentation for the `@hatcherdx/shared-rendering` package**

## Overview

The Shared Rendering Engine is a WebGL-accelerated graphics infrastructure that powers both Terminal text rendering and Git visualization in Hatcher. Built on THREE.js, it delivers desktop-class performance for real-time rendering, large dataset visualization, and complex UI interactions.

## Architecture

```
@hatcherdx/shared-rendering/
├── webgl/
│   └── WebGLEngine.ts          # Core THREE.js wrapper (scene, camera, renderer)
├── terminal/
│   └── TerminalRenderer.ts     # Text rendering with instanced geometry (522 lines)
└── git/
    └── GitRenderer.ts          # Commit graph + diff visualization (1,382 lines)
```

### Core Components

#### WebGLEngine

The foundation layer that manages THREE.js scene, camera, and renderer lifecycle.

**Responsibilities:**

- Scene creation and management
- Camera setup (orthographic for 2D, perspective for 3D)
- Renderer initialization and configuration
- Animation loop management
- Resource disposal

#### TerminalRenderer

Specialized renderer for high-performance terminal text output.

**Key Features:**

- Instanced geometry for identical characters (10x-100x performance)
- Texture atlas for glyph caching (reduces draw calls)
- Dirty region tracking (only update changed areas)
- Support for 10,000+ lines at 60 FPS
- ANSI color support with custom shaders

**Performance Optimizations:**

- Single draw call for all text via instanced rendering
- Pre-rendered glyph atlas (no per-frame font rendering)
- Frustum culling (only render visible text)
- Attribute updates only for dirty regions

**Implementation Reference:**

- `TerminalRenderer.ts:369-417` - Text atlas generation
- `TerminalRenderer.ts:424-460` - Custom GLSL shaders

#### GitRenderer

Advanced renderer for commit graphs and diff visualization.

**Key Features:**

- Three rendering modes: `COMMIT_GRAPH`, `DIFF_ONLY`, `HYBRID`
- Instanced commit nodes with branch visualization
- LOD (Level of Detail) system for repositories with 1000+ commits
- DataTexture-based diff encoding
- Side-by-side diff with syntax highlighting
- Timeline playback with smooth animation
- Virtual scrolling for large diff files

**Performance Optimizations:**

- Instanced meshes for commit nodes (single draw call)
- LOD system: only render visible commits in viewport
- DataTexture for diff data (GPU-side processing)
- Dirty region tracking for incremental updates
- WebGL2 compute shaders (when available)

**Implementation Reference:**

- `GitRenderer.ts:690-732` - Instanced commit node rendering
- `GitRenderer.ts:752-829` - Diff visualization with custom shaders
- `GitRenderer.ts:1254-1333` - LOD optimization for large repos
- `GitRenderer.ts:489-541` - Timeline playback animation

## Rendering Modes

### GitRenderer Modes

```typescript
export enum GitRendererMode {
  COMMIT_GRAPH = 'commit-graph', // Show commit nodes with branch lines
  DIFF_ONLY = 'diff-only', // Show only diff content
  HYBRID = 'hybrid', // Show both graph and diff
}
```

**COMMIT_GRAPH Mode:**

- Renders commit nodes as instanced meshes
- Draws branch lines connecting commits
- Supports panning and zooming
- LOD optimization for large repos

**DIFF_ONLY Mode:**

- Full-screen diff viewer
- Side-by-side comparison
- Syntax highlighting via Prism.js
- Expandable diff sections (bidirectional)

**HYBRID Mode:**

- Split view: commit graph on left, diff on right
- Synchronized selection between views
- Hover effects across both panels

## Integration

### Terminal Integration

```typescript
import { WebGLEngine, TerminalRenderer } from '@hatcherdx/shared-rendering'

// Initialize WebGL engine
const engine = new WebGLEngine()
await engine.initialize({ canvas: canvasElement })

// Create terminal renderer
const terminalRenderer = new TerminalRenderer(engine)
await terminalRenderer.initialize({
  rows: 25,
  cols: 80,
  fontSize: 14,
  fontFamily: 'JetBrains Mono',
})

// Render text
terminalRenderer.renderText(0, 0, [
  {
    char: 'H',
    fg: { r: 1, g: 1, b: 1, a: 1 },
    bg: { r: 0, g: 0, b: 0, a: 1 },
    bold: false,
    italic: false,
    underline: false,
    strikethrough: false,
    inverse: false,
  },
  // ... more cells
])

// Render frame
terminalRenderer.render()
```

### Git Visualization Integration

```typescript
import {
  WebGLEngine,
  GitRenderer,
  GitRendererMode,
} from '@hatcherdx/shared-rendering'

// Initialize WebGL engine
const engine = new WebGLEngine()
await engine.initialize({ canvas: canvasElement })

// Create git renderer
const gitRenderer = new GitRenderer(engine)
await gitRenderer.initialize({
  mode: GitRendererMode.HYBRID,
  commitNodeSize: 8,
  branchSpacing: 24,
  fontSize: 12,
})

// Load commit data
await gitRenderer.loadCommits(commits)

// Render frame
gitRenderer.render()
```

## Performance Benchmarks

### Terminal Rendering

| Lines  | Traditional Renderer | WebGL Renderer | Improvement |
| ------ | -------------------- | -------------- | ----------- |
| 1,000  | 30 FPS               | 60 FPS         | 2x          |
| 5,000  | 12 FPS               | 60 FPS         | 5x          |
| 10,000 | 6 FPS                | 60 FPS         | 10x         |

### Git Visualization

| Commits | Without LOD | With LOD | Improvement |
| ------- | ----------- | -------- | ----------- |
| 100     | 60 FPS      | 60 FPS   | -           |
| 1,000   | 45 FPS      | 60 FPS   | 1.3x        |
| 5,000   | 15 FPS      | 60 FPS   | 4x          |
| 10,000  | 8 FPS       | 60 FPS   | 7.5x        |

## Technical Details

### Instanced Rendering

Instead of drawing each character/commit individually, we use THREE.js `InstancedBufferGeometry` to draw thousands of identical objects in a single draw call.

**Example: Commit Nodes**

```typescript
// Create base geometry (shared by all instances)
const geometry = new THREE.CircleGeometry(nodeSize, 16)
const instancedGeometry = new THREE.InstancedBufferGeometry()
instancedGeometry.copy(geometry)

// Add per-instance attributes
const positions = new Float32Array(commitCount * 3)
const colors = new Float32Array(commitCount * 3)

for (let i = 0; i < commitCount; i++) {
  positions[i * 3] = commits[i].x
  positions[i * 3 + 1] = commits[i].y
  positions[i * 3 + 2] = 0

  colors[i * 3] = commits[i].color.r
  colors[i * 3 + 1] = commits[i].color.g
  colors[i * 3 + 2] = commits[i].color.b
}

instancedGeometry.setAttribute(
  'instancePosition',
  new THREE.InstancedBufferAttribute(positions, 3)
)
instancedGeometry.setAttribute(
  'instanceColor',
  new THREE.InstancedBufferAttribute(colors, 3)
)

// Single draw call for all commits
const mesh = new THREE.Mesh(instancedGeometry, material)
mesh.count = commitCount
scene.add(mesh)
```

### Texture Atlas

Pre-rendering all glyphs to a single texture reduces draw calls and GPU state changes.

**Terminal Glyph Atlas:**

```typescript
// Create canvas for atlas
const atlasCanvas = document.createElement('canvas')
const atlasCtx = atlasCanvas.getContext('2d')
atlasCanvas.width = 2048
atlasCanvas.height = 2048

// Render all glyphs
const glyphWidth = 12
const glyphHeight = 20
const glyphsPerRow = Math.floor(2048 / glyphWidth)

for (let i = 0; i < 256; i++) {
  const x = (i % glyphsPerRow) * glyphWidth
  const y = Math.floor(i / glyphsPerRow) * glyphHeight

  atlasCtx.fillText(String.fromCharCode(i), x, y + glyphHeight)
}

// Create THREE.js texture
const texture = new THREE.CanvasTexture(atlasCanvas)
```

### LOD (Level of Detail)

For large datasets (1000+ commits), we only render objects within the viewport.

**LOD Implementation:**

```typescript
private updateCommitMeshWithLOD(): void {
  if (this._commits.length <= 1000) {
    return this.updateCommitMesh() // Render all
  }

  // Calculate visible range based on camera position
  const viewDistance = 200
  const cameraX = this._camera.position.x
  const startIndex = Math.max(0, Math.floor(cameraX / 24) - viewDistance)
  const endIndex = Math.min(this._commits.length - 1, Math.floor(cameraX / 24) + viewDistance)

  // Only render visible commits
  const visibleCommits = this._commits.slice(startIndex, endIndex)
  this.updateCommitMesh(visibleCommits)
}
```

### DataTexture for Diff Encoding

Encode diff data in a texture for GPU-side processing.

**Diff DataTexture:**

```typescript
// Encode diff lines as RGB values
const width = 4096
const height = Math.ceil(diffLines.length / width)
const data = new Uint8Array(width * height * 4)

for (let i = 0; i < diffLines.length; i++) {
  const line = diffLines[i]
  data[i * 4 + 0] =
    line.type === 'added' ? 255 : line.type === 'removed' ? 128 : 0
  data[i * 4 + 1] = line.lineNumber & 0xff
  data[i * 4 + 2] = (line.lineNumber >> 8) & 0xff
  data[i * 4 + 3] = 255
}

const texture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat)
```

### Custom GLSL Shaders

**Diff Fragment Shader:**

```glsl
precision mediump float;

varying vec2 vUv;
uniform sampler2D diffTexture;
uniform sampler2D atlas;
uniform vec3 addedColor;
uniform vec3 removedColor;
uniform vec3 contextColor;

void main() {
  // Sample diff type from texture
  vec4 diffData = texture2D(diffTexture, vUv);
  float lineType = diffData.r; // 0=context, 0.5=removed, 1.0=added

  // Sample glyph from atlas
  vec4 glyphColor = texture2D(atlas, vUv);

  // Apply diff coloring
  vec3 finalColor;
  if (lineType > 0.9) {
    finalColor = addedColor * glyphColor.rgb;
  } else if (lineType > 0.4) {
    finalColor = removedColor * glyphColor.rgb;
  } else {
    finalColor = contextColor * glyphColor.rgb;
  }

  gl_FragColor = vec4(finalColor, glyphColor.a);
}
```

## Future Enhancements

### Planned Features

- [ ] WebGL2 compute shaders for advanced effects
- [ ] Multi-threaded rendering with OffscreenCanvas
- [ ] GPU-accelerated text shaping (complex scripts)
- [ ] 3D commit graph visualization
- [ ] Heatmap overlays for code metrics
- [ ] Real-time collaborative cursors

### Performance Targets

- Maintain 60 FPS with 100,000+ lines of terminal output
- Support repositories with 50,000+ commits
- Sub-100ms initial render time
- < 16ms per frame (60 FPS budget)

## Contributing

When contributing to the Shared Rendering Engine:

1. **Maintain 60 FPS**: All changes must maintain target frame rate
2. **Memory Management**: Always dispose THREE.js resources properly
3. **Test Coverage**: Maintain >90% test coverage
4. **Browser Compatibility**: Test on Chrome, Firefox, Safari
5. **Documentation**: Update TSDoc comments for all public APIs

## Related Documentation

- [Terminal System Architecture](../universal/terminal-system/ARCHITECTURE.md)
- [Git Genius Documentation](../universal/git-genius/README.md)
- [WebGL Best Practices](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices)
- [THREE.js Documentation](https://threejs.org/docs/)
