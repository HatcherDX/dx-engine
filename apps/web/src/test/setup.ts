/**
 * @fileoverview Test setup configuration for web app tests.
 *
 * @description
 * Global test setup for all web app tests. Provides mocks for browser APIs
 * and Electron APIs to prevent "window is not defined" errors.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @internal
 */

import { vi } from 'vitest'

// Mock Electron API globally
const mockElectronAPI = {
  sendTerminalInput: vi.fn(),
  sendTerminalResize: vi.fn(),
  send: vi.fn(),
  invoke: vi.fn().mockResolvedValue('test-terminal-id'),
  on: vi.fn(),
  off: vi.fn(),
}

// Mock window object globally to prevent "window is not defined" errors
const mockWindow = {
  electronAPI: mockElectronAPI,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  innerHeight: 800,
  innerWidth: 1200,
  location: {
    href: 'http://localhost:3000',
    pathname: '/',
    search: '',
    hash: '',
  },
  history: {
    pushState: vi.fn(),
    replaceState: vi.fn(),
  },
  requestAnimationFrame: vi.fn((callback: FrameRequestCallback) => {
    return setTimeout(() => callback(Date.now()), 16) as unknown as number
  }),
  cancelAnimationFrame: vi.fn((id: number) => {
    clearTimeout(id)
  }),
}

// Ensure window is available globally
Object.defineProperty(global, 'window', {
  value: mockWindow,
  writable: true,
  configurable: true,
})

Object.defineProperty(globalThis, 'window', {
  value: mockWindow,
  writable: true,
  configurable: true,
})

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

// Mock console methods for cleaner test output
global.console = {
  ...console,
  log: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
}
