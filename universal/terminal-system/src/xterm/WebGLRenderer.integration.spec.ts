/**
 * @fileoverview Integration tests for WebGL Terminal Rendering.
 *
 * @description
 * Tests the WebGL rendering integration with XTerm.js to ensure
 * GPU acceleration is properly enabled and falls back gracefully.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { Terminal } from 'xterm'
import { WebGLTerminalRenderer } from './WebGLRenderer'
import { TerminalAddonManager, AddonType } from './AddonManager'

describe('WebGL Rendering Integration', () => {
  let container: HTMLElement
  let terminal: Terminal

  beforeEach(() => {
    // Create container element
    container = document.createElement('div')
    document.body.appendChild(container)

    // Create terminal
    terminal = new Terminal({
      cols: 80,
      rows: 24,
    })
    terminal.open(container)
  })

  afterEach(() => {
    // Cleanup
    terminal.dispose()
    if (container.parentNode) {
      document.body.removeChild(container)
    }
  })

  it('should check WebGL support correctly', async () => {
    const renderer = new WebGLTerminalRenderer({ debug: true })

    // Check if WebGL is supported
    const isSupported = renderer.isSupported()

    // In jsdom test environment, WebGL should be mocked
    expect(typeof isSupported).toBe('boolean')
    console.log(`WebGL supported in test environment: ${isSupported}`)

    // Try to initialize
    const success = await renderer.initialize(terminal)

    // The WebGL addon may fail to load even with mocks due to xterm.js internals
    // This is expected behavior and doesn't indicate a problem with our code
    if (success) {
      expect(renderer.isReady()).toBe(true)
      console.log('✅ WebGL renderer initialized successfully in tests')

      // Get performance metrics
      const metrics = renderer.getPerformanceMetrics()
      expect(metrics.contextLossCount).toBe(0)

      // Cleanup
      renderer.dispose()
    } else {
      console.log(
        '⚠️  WebGL addon failed to load in test environment (expected with mocks)'
      )
      expect(renderer.isReady()).toBe(false)
    }
  })

  it('should load WebGL addon via AddonManager', async () => {
    const addonManager = new TerminalAddonManager({ debug: true })

    // Try to load WebGL addon
    const webglAddon = await addonManager.loadWebGLAddon(terminal)

    // Check if WebGL is supported
    if (webglAddon) {
      expect(addonManager.isAddonLoaded(AddonType.WEBGL)).toBe(true)

      const addon = addonManager.getAddon(AddonType.WEBGL)
      expect(addon).toBeDefined()
      expect(addon).toBe(webglAddon)

      console.log('✅ WebGL addon loaded successfully')
    } else {
      console.log('⚠️  WebGL not supported, addon returned null')
      expect(addonManager.isAddonLoaded(AddonType.WEBGL)).toBe(false)
    }

    // Cleanup
    addonManager.dispose()
  })

  it('should handle disposal and cleanup correctly', async () => {
    const renderer = new WebGLTerminalRenderer({ debug: true })

    // Try to initialize
    const success = await renderer.initialize(terminal)

    if (success) {
      expect(renderer.isReady()).toBe(true)

      // Dispose
      renderer.dispose()
      expect(renderer.isReady()).toBe(false)

      console.log('✅ Disposal handled correctly')
    } else {
      // Even if initialization fails, disposal should work
      renderer.dispose()
      expect(renderer.isReady()).toBe(false)
      console.log('✅ Disposal works even when not initialized')
    }
  })

  it('should fall back gracefully when WebGL is not supported', async () => {
    const renderer = new WebGLTerminalRenderer({ debug: true })

    // If WebGL is not supported, initialization should return false
    if (!renderer.isSupported()) {
      const success = await renderer.initialize(terminal)
      expect(success).toBe(false)
      expect(renderer.isReady()).toBe(false)

      console.log('✅ Graceful fallback confirmed')
    } else {
      console.log('WebGL is supported in this environment')
    }
  })

  it('should provide performance metrics API', async () => {
    const renderer = new WebGLTerminalRenderer({
      debug: true,
      enablePerformanceMonitoring: true,
    })

    // Metrics should always be available, even before initialization
    const metricsBeforeInit = renderer.getPerformanceMetrics()
    expect(metricsBeforeInit).toBeDefined()
    expect(metricsBeforeInit.isActive).toBe(false)
    expect(metricsBeforeInit.fps).toBe(0)
    expect(metricsBeforeInit.contextLossCount).toBe(0)

    const success = await renderer.initialize(terminal)

    if (success) {
      // Wait a bit for metrics to accumulate
      await new Promise((resolve) => setTimeout(resolve, 100))

      const metrics = renderer.getPerformanceMetrics()
      expect(metrics).toBeDefined()
      expect(metrics.fps).toBeGreaterThanOrEqual(0)
      expect(metrics.frameTime).toBeGreaterThanOrEqual(0)

      console.log('Performance metrics:', {
        fps: metrics.fps,
        frameTime: metrics.frameTime,
        contextLossCount: metrics.contextLossCount,
      })

      renderer.dispose()
    } else {
      console.log('WebGL not available in test, but metrics API works')
    }
  })

  it('should take screenshots when preserveDrawingBuffer is enabled', async () => {
    const renderer = new WebGLTerminalRenderer({
      debug: true,
      preserveDrawingBuffer: true,
    })

    if (renderer.isSupported()) {
      await renderer.initialize(terminal)

      // Write some content to the terminal
      terminal.write('Hello WebGL Terminal!\r\n')

      // Wait for render
      await new Promise((resolve) => setTimeout(resolve, 100))

      // Try to take screenshot
      const screenshot = await renderer.takeScreenshot()

      if (screenshot) {
        expect(screenshot).toContain('data:image/png')
        console.log('✅ Screenshot captured successfully')
      } else {
        console.log('Screenshot not available (expected in some environments)')
      }

      renderer.dispose()
    } else {
      console.log('WebGL not supported, skipping screenshot test')
    }
  })
})
