import { config } from '@vue/test-utils'
import { RouterLinkStub } from '@vue/test-utils'
import { vi } from 'vitest'

// Mock básico de fetch
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
  })
)

// Mock de Vue lifecycle hooks
vi.mock('vue', async () => {
  const actual = (await vi.importActual('vue')) as Record<string, unknown>
  return {
    ...actual,
    onMounted: vi.fn(),
    onUnmounted: vi.fn(),
    onBeforeMount: vi.fn(),
    onBeforeUnmount: vi.fn(),
  }
})

// Configuración básica de Vue Test Utils
config.global.stubs = {
  'router-link': RouterLinkStub,
  'router-view': true,
}

config.global.mocks = {
  $router: {
    push: vi.fn(),
    replace: vi.fn(),
  },
  $route: {
    path: '/test',
    params: {},
    query: {},
  },
}

// Mock de APIs del navegador
global.ResizeObserver = vi.fn(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
Object.defineProperty(window, 'localStorage', { value: localStorageMock })

// Auto unmount
import { enableAutoUnmount } from '@vue/test-utils'
enableAutoUnmount(afterEach)

console.log('✅ Global vitest setup completed')
