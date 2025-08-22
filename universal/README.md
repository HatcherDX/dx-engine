# @hatcherdx/shared-rendering

High-performance WebGL rendering engine for terminal and Git UI components.

## Overview

The shared rendering engine provides WebGL-accelerated rendering capabilities that can be used across both terminal and Git UI components. Built on Three.js for robust WebGL abstraction while maintaining direct access for performance-critical operations.

## Features

- **Shared WebGL Engine**: Single engine instance for multiple use cases
- **Terminal Rendering**: High-performance text rendering with WebGL acceleration
- **Git Visualization**: Interactive commit graphs and timeline playback
- **Performance Optimized**: 60fps rendering for large datasets
- **Three.js Integration**: Leverages mature WebGL abstraction
- **Resource Management**: Automatic cleanup and memory management

## Installation

```bash
pnpm add @hatcherdx/shared-rendering
```

## Quick Start

```typescript
import {
  WebGLEngine,
  TerminalRenderer,
  GitRenderer,
} from '@hatcherdx/shared-rendering'

// Create shared WebGL engine
const engine = new WebGLEngine()
await engine.initialize({
  canvas: document.getElementById('canvas') as HTMLCanvasElement,
  antialias: true,
})

// Use for terminal rendering
const terminalRenderer = new TerminalRenderer(engine)
await terminalRenderer.initialize({
  rows: 25,
  cols: 80,
  fontSize: 14,
})

// Use for Git visualization
const gitRenderer = new GitRenderer(engine)
await gitRenderer.initialize({
  maxCommits: 1000,
  enableInteraction: true,
})
```

## Architecture

### WebGL Engine

The core `WebGLEngine` provides:

- Three.js WebGL renderer management
- Context loss recovery
- Performance monitoring
- Resource cleanup
- Event handling

### Terminal Renderer

The `TerminalRenderer` specializes in:

- Text glyph atlas generation
- Instanced character rendering
- Cursor and selection visualization
- Smooth scrolling
- Large buffer handling

### Git Renderer

The `GitRenderer` provides:

- Commit graph visualization
- Branch line rendering
- Timeline animation
- Interactive navigation
- Diff visualization

## Performance

Key optimizations include:

- **Instanced Rendering**: Identical objects share geometry
- **Texture Atlases**: Minimize texture switches
- **Dirty Region Tracking**: Update only changed areas
- **LOD System**: Level of detail for large datasets
- **Memory Pooling**: Reuse objects to reduce GC pressure
- **WebGL2 Features**: Use compute shaders when available

## API Reference

### WebGLEngine

```typescript
class WebGLEngine {
  async initialize(config: WebGLEngineConfig): Promise<void>
  resize(width: number, height: number): void
  render(scene?: THREE.Scene, camera?: THREE.Camera): void
  dispose(): void
}
```

### TerminalRenderer

```typescript
class TerminalRenderer {
  async initialize(config: TerminalRendererConfig): Promise<void>
  updateCell(row: number, col: number, cell: TerminalCell): void
  updateCursor(cursor: Partial<TerminalCursor>): void
  scroll(offset: number): void
  dispose(): void
}
```

### GitRenderer

```typescript
class GitRenderer {
  async initialize(config: GitRendererConfig): Promise<void>
  updateCommits(commits: GitCommitData[]): void
  navigateToCommit(hash: string, animated?: boolean): void
  startTimeline(speed?: number): void
  dispose(): void
}
```

## WebGL Support

Check WebGL availability:

```typescript
import { checkWebGLSupport } from '@hatcherdx/shared-rendering'

const support = checkWebGLSupport()
if (!support.webgl1) {
  console.warn('WebGL not supported')
}
```

## Integration with Terminal System

The shared rendering engine is designed to integrate with `@hatcherdx/terminal-system`:

```typescript
import { TerminalUI } from '@hatcherdx/terminal-system'
import { WebGLEngine, TerminalRenderer } from '@hatcherdx/shared-rendering'

// Enhance existing terminal with WebGL
const engine = new WebGLEngine()
const terminalRenderer = new TerminalRenderer(engine)

// Use alongside existing TerminalUI
const terminalUI = new TerminalUI(tabManager)
await terminalUI.initialize(container)
```

## Integration with Git Genius

Enhanced Git visualization for `@hatcherdx/git-genius`:

```typescript
import { GitGenius } from '@hatcherdx/git-genius'
import { WebGLEngine, GitRenderer } from '@hatcherdx/shared-rendering'

const engine = new WebGLEngine()
const gitRenderer = new GitRenderer(engine)

// Visualize Git data
const commits = await gitGenius.getCommits()
gitRenderer.updateCommits(commits)
```

## Development

```bash
# Install dependencies
pnpm install

# Build
pnpm build

# Watch mode
pnpm dev

# Run tests
pnpm test

# Coverage
pnpm test:coverage

# Lint
pnpm lint
```

## License

MIT
