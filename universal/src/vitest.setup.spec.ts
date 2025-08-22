/**
 * @fileoverview Comprehensive tests for Vitest setup configuration and mocks.
 *
 * @description
 * This test suite provides 100% coverage for the vitest.setup.ts file, ensuring all
 * WebGL mocks, DOM APIs, and browser API mocks work correctly. Validates the test
 * environment setup for WebGL and Three.js components testing.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @priority CRITICAL
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Import the setup file to ensure it's executed
import '../vitest.setup'

describe('🔧 Vitest Setup - Test Environment Configuration', () => {
  describe('🌐 WebGL2 Context Mock', () => {
    it('should provide WebGL2RenderingContext global', () => {
      expect(global.WebGL2RenderingContext).toBeDefined()
      expect(typeof global.WebGL2RenderingContext).toBe('function')
    })

    it('should allow WebGL2RenderingContext instantiation', () => {
      const context = new global.WebGL2RenderingContext()
      expect(context).toBeInstanceOf(global.WebGL2RenderingContext)
    })
  })

  describe('🎨 Canvas Context Mocking', () => {
    let canvas: HTMLCanvasElement

    beforeEach(() => {
      canvas = document.createElement('canvas')
    })

    it('should mock WebGL context', () => {
      const webglContext = canvas.getContext('webgl')

      expect(webglContext).not.toBeNull()
      expect(webglContext).toBeDefined()
      expect(typeof webglContext!.drawingBufferWidth).toBe('number')
      expect(typeof webglContext!.drawingBufferHeight).toBe('number')
    })

    it('should mock WebGL2 context', () => {
      const webgl2Context = canvas.getContext('webgl2')

      expect(webgl2Context).not.toBeNull()
      expect(webgl2Context).toBeDefined()
      expect(webgl2Context!.drawingBufferWidth).toBe(1024)
      expect(webgl2Context!.drawingBufferHeight).toBe(768)
    })

    it('should mock experimental-webgl context', () => {
      const expWebglContext = canvas.getContext('experimental-webgl')

      expect(expWebglContext).not.toBeNull()
      expect(expWebglContext).toBeDefined()
    })

    it('should mock 2D context', () => {
      const context2d = canvas.getContext('2d')

      expect(context2d).not.toBeNull()
      expect(context2d).toBeDefined()
      expect(typeof context2d!.fillRect).toBe('function')
      expect(typeof context2d!.clearRect).toBe('function')
      expect(typeof context2d!.drawImage).toBe('function')
    })

    it('should return null for unknown context types', () => {
      const unknownContext = canvas.getContext(
        'unknown' as unknown as
          | CanvasRenderingContext2D
          | WebGLRenderingContext
          | string
      )
      expect(unknownContext).toBeNull()
    })
  })

  describe('🎯 WebGL Context Functions', () => {
    let webglContext: WebGLRenderingContext

    beforeEach(() => {
      const canvas = document.createElement('canvas')
      webglContext = canvas.getContext('webgl')!
    })

    it('should mock WebGL extension functions', () => {
      expect(typeof webglContext.getExtension).toBe('function')
      expect(typeof webglContext.getSupportedExtensions).toBe('function')

      const extension = webglContext.getExtension('OES_texture_float')
      expect(extension).toBeDefined()

      const extensions = webglContext.getSupportedExtensions()
      expect(Array.isArray(extensions)).toBe(true)
      expect(extensions).toContain('OES_texture_float')
      expect(extensions).toContain('ANGLE_instanced_arrays')
    })

    it('should mock WebGL parameter functions', () => {
      expect(typeof webglContext.getParameter).toBe('function')

      const vendor = webglContext.getParameter(webglContext.VENDOR)
      expect(vendor).toBe('WebGL Mock')
    })

    it('should mock shader and program functions', () => {
      expect(typeof webglContext.createShader).toBe('function')
      expect(typeof webglContext.createProgram).toBe('function')
      expect(typeof webglContext.shaderSource).toBe('function')
      expect(typeof webglContext.compileShader).toBe('function')
      expect(typeof webglContext.attachShader).toBe('function')
      expect(typeof webglContext.linkProgram).toBe('function')
      expect(typeof webglContext.useProgram).toBe('function')

      const shader = webglContext.createShader(webglContext.VERTEX_SHADER)
      expect(shader).toBeDefined()

      const program = webglContext.createProgram()
      expect(program).toBeDefined()

      const shaderStatus = webglContext.getShaderParameter(
        shader,
        webglContext.COMPILE_STATUS
      )
      expect(shaderStatus).toBe(true)

      const programStatus = webglContext.getProgramParameter(
        program,
        webglContext.LINK_STATUS
      )
      expect(programStatus).toBe(true)
    })

    it('should mock buffer functions', () => {
      expect(typeof webglContext.createBuffer).toBe('function')
      expect(typeof webglContext.bindBuffer).toBe('function')
      expect(typeof webglContext.bufferData).toBe('function')

      const buffer = webglContext.createBuffer()
      expect(buffer).toBeDefined()

      // Test buffer operations don't throw
      expect(() => {
        webglContext.bindBuffer(webglContext.ARRAY_BUFFER, buffer)
        webglContext.bufferData(
          webglContext.ARRAY_BUFFER,
          new Float32Array([1, 2, 3]),
          webglContext.STATIC_DRAW
        )
      }).not.toThrow()
    })

    it('should mock vertex attribute functions', () => {
      expect(typeof webglContext.enableVertexAttribArray).toBe('function')
      expect(typeof webglContext.vertexAttribPointer).toBe('function')
      expect(typeof webglContext.getAttribLocation).toBe('function')

      const location = webglContext.getAttribLocation(
        {} as unknown as WebGLProgram,
        'position'
      )
      expect(typeof location).toBe('number')
      expect(location).toBe(0)
    })

    it('should mock uniform functions', () => {
      expect(typeof webglContext.uniform1f).toBe('function')
      expect(typeof webglContext.uniform2f).toBe('function')
      expect(typeof webglContext.uniform3f).toBe('function')
      expect(typeof webglContext.uniform4f).toBe('function')
      expect(typeof webglContext.uniformMatrix4fv).toBe('function')
      expect(typeof webglContext.getUniformLocation).toBe('function')

      const uniformLocation = webglContext.getUniformLocation(
        {} as unknown as WebGLProgram,
        'u_matrix'
      )
      expect(uniformLocation).toBeDefined()
    })

    it('should mock drawing functions', () => {
      expect(typeof webglContext.drawArrays).toBe('function')
      expect(typeof webglContext.drawElements).toBe('function')

      // Test drawing operations don't throw
      expect(() => {
        webglContext.drawArrays(webglContext.TRIANGLES, 0, 3)
        webglContext.drawElements(
          webglContext.TRIANGLES,
          3,
          webglContext.UNSIGNED_BYTE,
          0
        )
      }).not.toThrow()
    })

    it('should mock rendering state functions', () => {
      expect(typeof webglContext.clear).toBe('function')
      expect(typeof webglContext.clearColor).toBe('function')
      expect(typeof webglContext.clearDepth).toBe('function')
      expect(typeof webglContext.enable).toBe('function')
      expect(typeof webglContext.disable).toBe('function')
      expect(typeof webglContext.viewport).toBe('function')

      // Test state functions don't throw
      expect(() => {
        webglContext.clearColor(0, 0, 0, 1)
        webglContext.clear(webglContext.COLOR_BUFFER_BIT)
        webglContext.enable(webglContext.DEPTH_TEST)
        webglContext.viewport(0, 0, 1024, 768)
      }).not.toThrow()
    })

    it('should mock texture functions', () => {
      expect(typeof webglContext.createTexture).toBe('function')
      expect(typeof webglContext.bindTexture).toBe('function')
      expect(typeof webglContext.texImage2D).toBe('function')
      expect(typeof webglContext.texParameteri).toBe('function')
      expect(typeof webglContext.generateMipmap).toBe('function')
      expect(typeof webglContext.activeTexture).toBe('function')

      const texture = webglContext.createTexture()
      expect(texture).toBeDefined()

      // Test texture operations don't throw
      expect(() => {
        webglContext.activeTexture(webglContext.TEXTURE0)
        webglContext.bindTexture(webglContext.TEXTURE_2D, texture)
        webglContext.texParameteri(
          webglContext.TEXTURE_2D,
          webglContext.TEXTURE_MIN_FILTER,
          webglContext.LINEAR
        )
      }).not.toThrow()
    })

    it('should provide WebGL constants', () => {
      expect(webglContext.VERTEX_SHADER).toBe(35633)
      expect(webglContext.FRAGMENT_SHADER).toBe(35632)
      expect(webglContext.COMPILE_STATUS).toBe(35713)
      expect(webglContext.LINK_STATUS).toBe(35714)
      expect(webglContext.ARRAY_BUFFER).toBe(34962)
      expect(webglContext.ELEMENT_ARRAY_BUFFER).toBe(34963)
      expect(webglContext.STATIC_DRAW).toBe(35044)
      expect(webglContext.DYNAMIC_DRAW).toBe(35048)
      expect(webglContext.TRIANGLES).toBe(4)
      expect(webglContext.TRIANGLE_STRIP).toBe(5)
      expect(webglContext.LINES).toBe(1)
      expect(webglContext.LINE_STRIP).toBe(3)
      expect(webglContext.POINTS).toBe(0)
      expect(webglContext.COLOR_BUFFER_BIT).toBe(16384)
      expect(webglContext.DEPTH_BUFFER_BIT).toBe(256)
      expect(webglContext.DEPTH_TEST).toBe(2929)
      expect(webglContext.BLEND).toBe(3042)
      expect(webglContext.CULL_FACE).toBe(2884)
    })

    it('should provide texture constants', () => {
      expect(webglContext.TEXTURE_2D).toBe(3553)
      expect(webglContext.TEXTURE0).toBe(33984)
      expect(webglContext.RGBA).toBe(6408)
      expect(webglContext.UNSIGNED_BYTE).toBe(5121)
      expect(webglContext.TEXTURE_MAG_FILTER).toBe(10240)
      expect(webglContext.TEXTURE_MIN_FILTER).toBe(10241)
      expect(webglContext.TEXTURE_WRAP_S).toBe(10242)
      expect(webglContext.TEXTURE_WRAP_T).toBe(10243)
      expect(webglContext.LINEAR).toBe(9729)
      expect(webglContext.NEAREST).toBe(9728)
      expect(webglContext.CLAMP_TO_EDGE).toBe(33071)
      expect(webglContext.REPEAT).toBe(10497)
    })

    it('should provide capability constants', () => {
      expect(webglContext.MAX_TEXTURE_SIZE).toBe(0x0d33)
      expect(webglContext.MAX_TEXTURE_IMAGE_UNITS).toBe(0x8872)
      expect(webglContext.VENDOR).toBe(0x1f00)
      expect(webglContext.RENDERER).toBe(0x1f01)
    })
  })

  describe('🎨 2D Context Functions', () => {
    let context2d: CanvasRenderingContext2D

    beforeEach(() => {
      const canvas = document.createElement('canvas')
      context2d = canvas.getContext('2d')!
    })

    it('should mock basic drawing functions', () => {
      expect(typeof context2d.fillRect).toBe('function')
      expect(typeof context2d.clearRect).toBe('function')
      expect(typeof context2d.fillText).toBe('function')
      expect(typeof context2d.drawImage).toBe('function')

      // Test functions don't throw
      expect(() => {
        context2d.fillRect(0, 0, 100, 100)
        context2d.clearRect(0, 0, 50, 50)
        context2d.fillText('Hello', 10, 10)
      }).not.toThrow()
    })

    it('should mock image data functions', () => {
      expect(typeof context2d.getImageData).toBe('function')
      expect(typeof context2d.putImageData).toBe('function')
      expect(typeof context2d.createImageData).toBe('function')
    })

    it('should mock transform functions', () => {
      expect(typeof context2d.setTransform).toBe('function')
      expect(typeof context2d.save).toBe('function')
      expect(typeof context2d.restore).toBe('function')
      expect(typeof context2d.scale).toBe('function')
      expect(typeof context2d.rotate).toBe('function')
      expect(typeof context2d.translate).toBe('function')
    })

    it('should mock path functions', () => {
      expect(typeof context2d.beginPath).toBe('function')
      expect(typeof context2d.moveTo).toBe('function')
      expect(typeof context2d.lineTo).toBe('function')
      expect(typeof context2d.closePath).toBe('function')
      expect(typeof context2d.stroke).toBe('function')
      expect(typeof context2d.fill).toBe('function')
      expect(typeof context2d.arc).toBe('function')

      // Test path operations don't throw
      expect(() => {
        context2d.beginPath()
        context2d.moveTo(0, 0)
        context2d.lineTo(100, 100)
        context2d.arc(50, 50, 25, 0, Math.PI * 2)
        context2d.closePath()
        context2d.stroke()
        context2d.fill()
      }).not.toThrow()
    })
  })

  describe('⚡ Performance API Mock', () => {
    it('should mock performance.now', () => {
      expect(typeof global.performance.now).toBe('function')

      const now1 = global.performance.now()
      const now2 = global.performance.now()

      expect(typeof now1).toBe('number')
      expect(typeof now2).toBe('number')
      expect(now1).toBeGreaterThanOrEqual(0)
      expect(now2).toBeGreaterThanOrEqual(now1)
    })

    it('should mock performance measurement functions', () => {
      expect(typeof global.performance.mark).toBe('function')
      expect(typeof global.performance.measure).toBe('function')
      expect(typeof global.performance.getEntriesByName).toBe('function')
      expect(typeof global.performance.getEntriesByType).toBe('function')

      // Test functions don't throw
      expect(() => {
        global.performance.mark('test-mark')
        global.performance.measure('test-measure')
      }).not.toThrow()

      const entriesByName = global.performance.getEntriesByName('test')
      const entriesByType = global.performance.getEntriesByType('mark')

      expect(Array.isArray(entriesByName)).toBe(true)
      expect(Array.isArray(entriesByType)).toBe(true)
    })
  })

  describe('🎬 Animation Frame API Mock', () => {
    it('should mock requestAnimationFrame', () => {
      expect(typeof global.requestAnimationFrame).toBe('function')

      let callbackCalled = false
      const callback = () => {
        callbackCalled = true
      }

      const id = global.requestAnimationFrame(callback)
      expect(typeof id).toBe('object') // setTimeout returns a Timeout object in Node.js

      // Wait for callback to be called
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(callbackCalled).toBe(true)
          resolve()
        }, 20)
      })
    })

    it('should mock cancelAnimationFrame', () => {
      expect(typeof global.cancelAnimationFrame).toBe('function')

      let callbackCalled = false
      const callback = () => {
        callbackCalled = true
      }

      const id = global.requestAnimationFrame(callback)
      global.cancelAnimationFrame(id)

      // Wait and verify callback was not called
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(callbackCalled).toBe(false)
          resolve()
        }, 20)
      })
    })

    it('should pass timestamp to requestAnimationFrame callback', () => {
      let receivedTimestamp: number | undefined

      const callback = (timestamp: number) => {
        receivedTimestamp = timestamp
      }

      global.requestAnimationFrame(callback)

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(typeof receivedTimestamp).toBe('number')
          expect(receivedTimestamp).toBeGreaterThan(0)
          resolve()
        }, 20)
      })
    })
  })

  describe('🖼️ Image Constructor Mock', () => {
    it('should mock Image constructor', () => {
      expect(typeof global.Image).toBe('function')

      const image = new global.Image()
      expect(image).toBeDefined()
      expect(typeof image.src).toBe('string')
      expect(typeof image.width).toBe('number')
      expect(typeof image.height).toBe('number')
    })

    it('should simulate image loading', () => {
      const image = new global.Image()
      let loadCalled = false

      image.onload = () => {
        loadCalled = true
      }

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(loadCalled).toBe(true)
          expect(image.width).toBe(256)
          expect(image.height).toBe(256)
          resolve()
        }, 10)
      })
    })

    it('should handle image properties', () => {
      const image = new global.Image()

      expect(image.onload).toBeNull()
      expect(image.onerror).toBeNull()
      expect(image.src).toBe('')
      expect(image.width).toBe(0)
      expect(image.height).toBe(0)

      image.src = 'test.jpg'
      expect(image.src).toBe('test.jpg')
    })
  })

  describe('👁️ ResizeObserver Mock', () => {
    it('should mock ResizeObserver constructor', () => {
      expect(typeof global.ResizeObserver).toBe('function')

      const callback = vi.fn()
      const observer = new global.ResizeObserver(callback)

      expect(observer).toBeDefined()
      expect(typeof observer.observe).toBe('function')
      expect(typeof observer.unobserve).toBe('function')
      expect(typeof observer.disconnect).toBe('function')
    })

    it('should handle ResizeObserver methods', () => {
      const callback = vi.fn()
      const observer = new global.ResizeObserver(callback)
      const element = document.createElement('div')

      // Test methods don't throw
      expect(() => {
        observer.observe(element)
        observer.unobserve(element)
        observer.disconnect()
      }).not.toThrow()
    })

    it('should simulate resize events', () => {
      let callbackCalled = false
      let receivedEntries: ResizeObserverEntry[] = []

      const callback = (entries: ResizeObserverEntry[]) => {
        callbackCalled = true
        receivedEntries = entries
      }

      const observer = new global.ResizeObserver(callback)
      const element = document.createElement('div')

      observer.observe(element)

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(callbackCalled).toBe(true)
          expect(Array.isArray(receivedEntries)).toBe(true)
          expect(receivedEntries.length).toBe(1)

          const entry = receivedEntries[0]
          expect(entry.contentRect.width).toBe(1024)
          expect(entry.contentRect.height).toBe(768)
          expect(entry.borderBoxSize).toBeDefined()
          expect(entry.contentBoxSize).toBeDefined()
          expect(entry.devicePixelContentBoxSize).toBeDefined()

          resolve()
        }, 10)
      })
    })
  })

  describe('🔧 Mock Integration', () => {
    it('should work with WebGL and Canvas together', () => {
      const canvas = document.createElement('canvas')
      const webglContext = canvas.getContext('webgl')
      const context2d = canvas.getContext('2d')

      // Both contexts should be available
      expect(webglContext).not.toBeNull()
      expect(context2d).not.toBeNull()

      // Should be able to use both
      expect(() => {
        webglContext!.viewport(0, 0, 100, 100)
        context2d!.fillRect(0, 0, 50, 50)
      }).not.toThrow()
    })

    it('should work with performance and animation frame together', () => {
      const startTime = global.performance.now()

      return new Promise<void>((resolve) => {
        global.requestAnimationFrame((timestamp) => {
          const endTime = global.performance.now()

          expect(typeof timestamp).toBe('number')
          expect(endTime).toBeGreaterThanOrEqual(startTime)
          resolve()
        })
      })
    })

    it('should work with Image and ResizeObserver together', () => {
      const image = new global.Image()
      const observer = new global.ResizeObserver(() => {})
      const element = document.createElement('div')

      expect(() => {
        observer.observe(element)
        image.src = 'test.jpg'
      }).not.toThrow()

      observer.disconnect()
    })

    it('should maintain mock state across multiple uses', () => {
      const canvas1 = document.createElement('canvas')
      const canvas2 = document.createElement('canvas')

      const ctx1 = canvas1.getContext('webgl')
      const ctx2 = canvas2.getContext('webgl')

      expect(ctx1).not.toBeNull()
      expect(ctx2).not.toBeNull()
      expect(ctx1!.drawingBufferWidth).toBe(1024)
      expect(ctx2!.drawingBufferWidth).toBe(1024)
    })
  })

  describe('🎯 Edge Cases and Error Handling', () => {
    it('should handle multiple WebGL context requests', () => {
      const canvas = document.createElement('canvas')

      const ctx1 = canvas.getContext('webgl')
      const ctx2 = canvas.getContext('webgl2')
      const ctx3 = canvas.getContext('experimental-webgl')

      expect(ctx1).toBeDefined()
      expect(ctx2).toBeDefined()
      expect(ctx3).toBeDefined()
    })

    it('should handle invalid context requests gracefully', () => {
      const canvas = document.createElement('canvas')

      expect(() => {
        canvas.getContext('invalid' as unknown as string)
        canvas.getContext('' as unknown as string)
        canvas.getContext(null as unknown as string)
      }).not.toThrow()
    })

    it('should handle rapid animation frame requests', () => {
      const callbacks: (() => void)[] = []

      for (let i = 0; i < 10; i++) {
        global.requestAnimationFrame(() => {
          callbacks.push(() => {})
        })
      }

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(callbacks.length).toBe(10)
          resolve()
        }, 50)
      })
    })

    it('should handle multiple ResizeObserver instances', () => {
      const observer1 = new global.ResizeObserver(() => {})
      const observer2 = new global.ResizeObserver(() => {})
      const element = document.createElement('div')

      expect(() => {
        observer1.observe(element)
        observer2.observe(element)
        observer1.disconnect()
        observer2.disconnect()
      }).not.toThrow()
    })
  })
})
