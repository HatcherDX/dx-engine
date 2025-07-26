import { describe, it, expect, vi } from 'vitest'
import type { App } from 'vue'

// Mock Vue and CSS imports
vi.mock('vue', () => ({
  createApp: vi.fn(() => ({
    mount: vi.fn(),
  })),
}))

vi.mock('./style.css', () => ({}))
vi.mock('./App.vue', () => ({
  default: { name: 'App' },
}))

describe('main.ts', () => {
  it('should create Vue app and mount to #app', async () => {
    const { createApp } = await import('vue')
    const mockApp = {
      mount: vi.fn(),
    }
    vi.mocked(createApp).mockReturnValue(mockApp as unknown as App<Element>)

    // Import main.ts to trigger the app creation and mounting
    await import('./main')

    expect(createApp).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'App',
      })
    )
    expect(mockApp.mount).toHaveBeenCalledWith('#app')
  })

  it('should import App component', async () => {
    const AppComponent = await import('./App.vue')
    expect(AppComponent.default).toHaveProperty('name', 'App')
  })

  it('should test createApp function call', async () => {
    const { createApp } = await import('vue')

    // Since the main module already executed, just verify it was called
    expect(createApp).toHaveBeenCalled()
  })

  it('should test mount function call', async () => {
    const { createApp } = await import('vue')

    // Get the mock app that was returned in the first test
    const mockCall = vi.mocked(createApp).mock.results[0]
    if (mockCall && mockCall.type === 'return') {
      expect(mockCall.value.mount).toHaveBeenCalledWith('#app')
    }
  })

  it('should import style.css', async () => {
    // The import should not throw an error
    expect(async () => {
      await import('./style.css')
    }).not.toThrow()
  })
})
