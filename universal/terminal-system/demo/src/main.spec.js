/* eslint-env browser */
/* eslint-disable no-undef */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('main.js', () => {
  let mockApp
  let mockCreateApp

  beforeEach(() => {
    // Clear module cache
    vi.resetModules()

    // Create mock app instance
    mockApp = {
      mount: vi.fn(),
    }

    // Mock createApp function
    mockCreateApp = vi.fn(() => mockApp)

    // Mock Vue module
    vi.doMock('vue', () => ({
      createApp: mockCreateApp,
    }))

    // Mock the App component
    vi.doMock('./App.vue', () => ({
      default: { name: 'MockApp', template: '<div>App</div>' },
    }))

    // Create mock DOM element
    const mountElement = document.createElement('div')
    mountElement.id = 'app'
    document.body.appendChild(mountElement)
  })

  afterEach(() => {
    // Clean up DOM
    document.body.innerHTML = ''
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('should create Vue app with App component', async () => {
    // Import main.js (this will execute the code)
    await import('./main.js')

    // Should have called createApp with App component
    expect(mockCreateApp).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'MockApp',
      })
    )
  })

  it('should mount app to #app element', async () => {
    // Import main.js
    await import('./main.js')

    // Should have mounted to #app
    expect(mockApp.mount).toHaveBeenCalledWith('#app')
  })

  it('should work even if #app element does not exist initially', async () => {
    // Remove the element
    document.body.innerHTML = ''

    // Import should not throw
    await expect(import('./main.js')).resolves.not.toThrow()

    // Should still attempt to mount
    expect(mockApp.mount).toHaveBeenCalledWith('#app')
  })
})
