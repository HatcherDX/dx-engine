/**
 * @fileoverview Test setup configuration for terminal-system tests.
 *
 * @description
 * Global test setup for DOM environment and common mocks.
 * Provides necessary mocks for browser APIs and DOM elements.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @internal
 */

import { vi } from 'vitest'

// Mock console methods for cleaner test output
global.console = {
  ...console,
  log: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
}

// Mock HTMLCanvasElement if needed
if (typeof HTMLCanvasElement !== 'undefined') {
  HTMLCanvasElement.prototype.getContext = vi.fn((contextType: string) => {
    const baseContextMock = {
      fillRect: vi.fn(),
      clearRect: vi.fn(),
      getImageData: vi.fn(),
      putImageData: vi.fn(),
      createImageData: vi.fn(),
      setTransform: vi.fn(),
      drawImage: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      closePath: vi.fn(),
      stroke: vi.fn(),
      fill: vi.fn(),
      arc: vi.fn(),
      scale: vi.fn(),
      rotate: vi.fn(),
      translate: vi.fn(),
    }

    if (contextType === '2d') {
      return baseContextMock as unknown as CanvasRenderingContext2D
    } else if (contextType === 'webgl' || contextType === 'webgl2') {
      // Return mock WebGL context with similar base methods
      return {
        ...baseContextMock,
        // Add WebGL-specific methods
        getShaderInfoLog: vi.fn(),
        getProgramInfoLog: vi.fn(),
        createShader: vi.fn(),
        createProgram: vi.fn(),
        attachShader: vi.fn(),
        linkProgram: vi.fn(),
        useProgram: vi.fn(),
        getAttribLocation: vi.fn(),
        getUniformLocation: vi.fn(),
        enableVertexAttribArray: vi.fn(),
        vertexAttribPointer: vi.fn(),
        uniform1f: vi.fn(),
        uniform2f: vi.fn(),
        uniform3f: vi.fn(),
        uniform4f: vi.fn(),
        uniformMatrix4fv: vi.fn(),
      } as unknown as WebGLRenderingContext
    }
    return null
  }) as unknown as typeof HTMLCanvasElement.prototype.getContext
}

// Mock performance API if not available
if (typeof global.performance === 'undefined') {
  global.performance = {
    now: vi.fn(() => Date.now()),
    mark: vi.fn(),
    measure: vi.fn(),
    getEntriesByName: vi.fn(() => []),
    getEntriesByType: vi.fn(() => []),
  } as unknown as Performance
}

// Mock requestAnimationFrame and cancelAnimationFrame
global.requestAnimationFrame = vi.fn((callback: FrameRequestCallback) => {
  const id = setTimeout(() => callback(Date.now()), 16) as unknown as number
  return id
})

global.cancelAnimationFrame = vi.fn((id: number) => {
  clearTimeout(id)
})
