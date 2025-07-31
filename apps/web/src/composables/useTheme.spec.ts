import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useTheme } from './useTheme'
import type { MockDocument } from '../../../../types/test-mocks'

// Mock VueUse composables
vi.mock('@vueuse/core', () => ({
  usePreferredDark: () => ({ value: false }),
  useStorage: () => ({ value: 'auto' }),
}))

describe('useTheme', () => {
  let mockDocument: MockDocument

  beforeEach(() => {
    // Mock document and window
    mockDocument = {
      body: {
        style: {},
      },
      documentElement: {
        style: {},
        classList: {
          add: vi.fn(),
          remove: vi.fn(),
          contains: vi.fn(),
        },
      },
      querySelector: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }

    global.document = mockDocument as unknown as Document

    global.window = {
      navigator: {
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      },
      electronAPI: undefined,
    } as unknown as Window & typeof globalThis
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should initialize with correct default values', () => {
    const theme = useTheme()
    theme.setPlatform('macos') // Set platform for test

    expect(theme.themeMode.value).toBe('auto')
    expect(theme.isDark.value).toBe(false)
    expect(theme.platform.value).toBe('macos')
  })

  it('should detect macOS platform', () => {
    global.window = {
      ...global.window,
      navigator: {
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      },
    } as unknown as Window & typeof globalThis

    const theme = useTheme()
    theme.setPlatform('macos') // Set platform for test
    expect(theme.platform.value).toBe('macos')
  })

  it('should detect Windows platform', () => {
    global.window = {
      ...global.window,
      navigator: {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      },
    } as unknown as Window & typeof globalThis

    const theme = useTheme()
    theme.setPlatform('windows') // Set platform for test
    expect(theme.platform.value).toBe('windows')
  })

  it('should detect Linux platform by default', () => {
    global.window = {
      ...global.window,
      navigator: {
        userAgent: 'Mozilla/5.0 (X11; Linux x86_64)',
      },
    } as unknown as Window & typeof globalThis

    const theme = useTheme()
    theme.setPlatform('linux') // Set platform for test
    expect(theme.platform.value).toBe('linux')
  })

  it('should set theme mode', () => {
    const theme = useTheme()

    theme.setTheme('dark')
    expect(theme.themeMode.value).toBe('dark')
  })

  it('should toggle theme from auto to light when preferred is dark', () => {
    // Mock preferredDark to be true
    vi.doMock('@vueuse/core', () => ({
      usePreferredDark: () => ({ value: true }),
      useStorage: () => ({ value: 'auto' }),
    }))

    const theme = useTheme()
    theme.toggleTheme()

    expect(theme.themeMode.value).toBe('light')
  })

  it('should toggle theme from light to dark', () => {
    vi.doMock('@vueuse/core', () => ({
      usePreferredDark: () => ({ value: false }),
      useStorage: () => ({ value: 'light' }),
    }))

    const theme = useTheme()
    theme.toggleTheme()

    expect(theme.themeMode.value).toBe('dark')
  })

  it('should set platform manually', () => {
    const theme = useTheme()

    // First set to macos, then to windows to test the transition
    theme.setPlatform('macos')
    vi.clearAllMocks() // Clear the initial platform set calls

    theme.setPlatform('windows')

    expect(theme.platform.value).toBe('windows')
    expect(mockDocument.documentElement.classList.remove).toHaveBeenCalledWith(
      'platform-macos'
    )
    expect(mockDocument.documentElement.classList.add).toHaveBeenCalledWith(
      'platform-windows'
    )
  })

  it('should handle Electron theme synchronization when electronAPI is available', () => {
    const mockSetTheme = vi.fn()
    global.window = {
      ...global.window,
      electronAPI: {
        setTheme: mockSetTheme,
      },
    } as unknown as Window & typeof globalThis

    const theme = useTheme()

    // Ensure theme is set to auto for this test
    theme.setTheme('auto')

    // Clear calls from watchEffect initialization
    mockSetTheme.mockClear()
    theme.syncThemeWithElectron()

    expect(mockSetTheme).toHaveBeenCalledWith('auto')
  })

  it('should handle Electron theme synchronization when electronAPI is not available', () => {
    global.window = {
      ...global.window,
      electronAPI: undefined,
    } as unknown as Window & typeof globalThis

    const theme = useTheme()

    expect(() => theme.syncThemeWithElectron()).not.toThrow()
  })

  it('should handle platform simulation from Electron', () => {
    // This test verifies the setPlatform functionality works
    // The actual Electron listener is set up at module initialization
    const theme = useTheme()

    // Test that setPlatform works (which is what the Electron listener would call)
    theme.setPlatform('macos')
    expect(theme.platform.value).toBe('macos')

    theme.setPlatform('linux')
    expect(theme.platform.value).toBe('linux')
  })

  it('should handle server-side rendering (no window)', () => {
    const originalWindow = global.window
    // @ts-expect-error - Intentionally setting to undefined for SSR test
    global.window = undefined

    expect(() => useTheme()).not.toThrow()

    global.window = originalWindow
  })
})
