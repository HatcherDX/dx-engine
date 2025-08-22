import { describe, it, expect, beforeEach, vi } from 'vitest'
import { themeStore } from './theme'

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
Object.defineProperty(window, 'localStorage', { value: localStorageMock })

describe('Theme Store', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    themeStore.reset()
  })

  it('should initialize with default auto mode', () => {
    expect(themeStore.mode.value).toBe('auto')
  })

  it('should set mode correctly', () => {
    themeStore.setMode('dark')
    expect(themeStore.mode.value).toBe('dark')
    expect(localStorageMock.setItem).toHaveBeenCalledWith('theme-mode', 'dark')
  })

  it('should set light mode', () => {
    themeStore.setMode('light')
    expect(themeStore.mode.value).toBe('light')
    expect(localStorageMock.setItem).toHaveBeenCalledWith('theme-mode', 'light')
  })

  it('should set auto mode', () => {
    themeStore.setMode('auto')
    expect(themeStore.mode.value).toBe('auto')
    expect(localStorageMock.setItem).toHaveBeenCalledWith('theme-mode', 'auto')
  })

  it('should initialize from localStorage', () => {
    localStorageMock.getItem.mockReturnValue('dark')
    themeStore.initialize()
    expect(themeStore.mode.value).toBe('dark')
    expect(themeStore.initialized.value).toBe(true)
  })

  it('should handle invalid localStorage values', () => {
    localStorageMock.getItem.mockReturnValue('invalid')
    themeStore.initialize()
    expect(themeStore.mode.value).toBe('auto')
  })

  it('should reset to default state', () => {
    themeStore.setMode('dark')
    themeStore.reset()
    expect(themeStore.mode.value).toBe('auto')
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('theme-mode')
  })

  it('should track initialization state', () => {
    // Reset again to ensure clean state
    themeStore.reset()
    expect(themeStore.initialized.value).toBe(false)
    themeStore.initialize()
    expect(themeStore.initialized.value).toBe(true)
  })
})
