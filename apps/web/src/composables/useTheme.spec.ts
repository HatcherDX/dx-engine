/**
 * @fileoverview Tests for useTheme composable.
 *
 * @description
 * Tests for the theme management system to achieve 80%+ coverage.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { MockDocument } from '../../../../types/test-mocks'

// Mock VueUse composables with reactive refs
import { ref } from 'vue'
const mockPreferredDark = ref(false)
const mockThemeMode = ref('auto')

vi.mock('@vueuse/core', () => ({
  usePreferredDark: () => mockPreferredDark,
  useStorage: (key: string, defaultValue: unknown) => {
    // Return a reactive ref that can be used like the real useStorage
    if (key === 'theme-mode') {
      return mockThemeMode
    }
    return ref(defaultValue)
  },
}))

// Mock ElectronAPI interface for theme
interface MockElectronAPI {
  versions: Record<string, string>
  send: (channel: string, data: unknown) => void
  on: (channel: string, listener: (...args: unknown[]) => void) => void
  invoke: (channel: string, data?: unknown) => Promise<unknown>
  sendTerminalInput: (data: { id: string; data: string }) => void
  sendTerminalResize: (data: { id: string; cols: number; rows: number }) => void
  setTheme: (theme: string) => void
  openProjectDialog: () => Promise<unknown>
  statFile: (filePath: string) => Promise<unknown>
  readDirectory: (dirPath: string) => Promise<unknown>
  pathExists: (path: string) => Promise<boolean>
  isDirectory: (path: string) => Promise<boolean>
  readFile: (filePath: string) => Promise<string>
  scanDirectory: (
    dirPath: string,
    options?: { ignoredDirs?: string[]; configFiles?: string[] }
  ) => Promise<unknown>
  getGitStatus: (projectPath: string) => Promise<unknown>
  getGitDiff: (
    projectPath: string,
    filePath: string,
    options?: { staged?: boolean; commit?: string }
  ) => Promise<unknown>
  getFileContent: (
    projectPath: string,
    filePath: string,
    options?: { commit?: string; fromWorkingTree?: boolean }
  ) => Promise<unknown>
  off: (channel: string, listener: (...args: unknown[]) => void) => void
  systemTerminal: {
    initialize: (options?: {
      projectType?: string
      projectName?: string
      projectPath?: string
      packageManager?: string
    }) => Promise<unknown>
    log: (request: {
      level: 'info' | 'warn' | 'error'
      message: string
      terminal?: 'system' | 'timeline'
      context?: Record<string, unknown>
    }) => Promise<unknown>
    gitOperation: (request: {
      operation: string
      args?: unknown[]
      context?: Record<string, unknown>
    }) => Promise<unknown>
    getTerminal: (terminalType: 'system' | 'timeline') => Promise<unknown>
    listTerminals: () => Promise<unknown>
    setActive: (terminalType: 'system' | 'timeline') => Promise<unknown>
    clear: (terminalType: 'system' | 'timeline') => Promise<unknown>
    getLines: (
      terminalType: 'system' | 'timeline',
      options?: {
        limit?: number
        type?: 'CMD' | 'GIT' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL'
        since?: string
      }
    ) => Promise<unknown>
    updateConfig: (
      terminalType: 'system' | 'timeline',
      config: { autoScroll?: boolean; maxLines?: number }
    ) => Promise<unknown>
    onEvent: (
      callback: (data: {
        event: unknown
        terminal: 'system' | 'timeline'
      }) => void
    ) => void
    onOutput: (callback: (event: unknown) => void) => void
    onActivated: (
      callback: (data: {
        terminalId: string
        terminalType: 'system' | 'timeline'
      }) => void
    ) => void
    onCleared: (
      callback: (data: {
        terminalId: string
        terminalType: 'system' | 'timeline'
      }) => void
    ) => void
  }
}

// Create mock ElectronAPI implementation
const mockElectronAPI: MockElectronAPI = {
  versions: { node: '16.0.0', electron: '13.0.0', chrome: '91.0.0' },
  send: vi.fn(),
  on: vi.fn(),
  invoke: vi.fn().mockResolvedValue({}),
  sendTerminalInput: vi.fn(),
  sendTerminalResize: vi.fn(),
  setTheme: vi.fn(),
  openProjectDialog: vi.fn().mockResolvedValue({}),
  statFile: vi.fn().mockResolvedValue({}),
  readDirectory: vi.fn().mockResolvedValue([]),
  pathExists: vi.fn().mockResolvedValue(true),
  isDirectory: vi.fn().mockResolvedValue(true),
  readFile: vi.fn().mockResolvedValue(''),
  scanDirectory: vi.fn().mockResolvedValue([]),
  getGitStatus: vi.fn().mockResolvedValue({}),
  getGitDiff: vi.fn().mockResolvedValue(''),
  getFileContent: vi.fn().mockResolvedValue(''),
  off: vi.fn(),
  systemTerminal: {
    initialize: vi.fn().mockResolvedValue({}),
    log: vi.fn().mockResolvedValue({}),
    gitOperation: vi.fn().mockResolvedValue({}),
    getTerminal: vi.fn().mockResolvedValue({}),
    listTerminals: vi.fn().mockResolvedValue([]),
    setActive: vi.fn().mockResolvedValue({}),
    clear: vi.fn().mockResolvedValue({}),
    getLines: vi.fn().mockResolvedValue([]),
    updateConfig: vi.fn().mockResolvedValue({}),
    onEvent: vi.fn(),
    onOutput: vi.fn(),
    onActivated: vi.fn(),
    onCleared: vi.fn(),
  },
}

describe('useTheme', () => {
  let mockDocument: MockDocument

  beforeEach(async () => {
    // Clear module cache to reset global state
    vi.resetModules()

    // Reset mock values
    mockPreferredDark.value = false
    mockThemeMode.value = 'auto'
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
      querySelector: vi.fn().mockReturnValue(null),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }

    Object.defineProperty(global, 'window', {
      value: {
        electronAPI: mockElectronAPI,
        matchMedia: vi.fn(() => ({
          matches: mockPreferredDark.value,
          addListener: vi.fn(),
          removeListener: vi.fn(),
        })),
        navigator: {
          userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
        },
      },
      writable: true,
    })

    global.document = mockDocument as unknown as Document
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('should initialize and provide basic functionality', async () => {
    const { useTheme } = await import('./useTheme')
    const theme = useTheme()

    // Basic property checks
    expect(theme.themeMode.value).toBe('auto')
    expect(theme.isDark.value).toBe(false)
    expect(typeof theme.setTheme).toBe('function')
    expect(typeof theme.toggleTheme).toBe('function')
    expect(typeof theme.syncThemeWithElectron).toBe('function')
    expect(typeof theme.setPlatform).toBe('function')
  })

  it('should handle theme changes', async () => {
    const { useTheme } = await import('./useTheme')
    const theme = useTheme()

    // Test setting different themes
    theme.setTheme('dark')
    expect(theme.themeMode.value).toBe('dark')
    expect(theme.isDark.value).toBe(true)

    theme.setTheme('light')
    expect(theme.themeMode.value).toBe('light')
    expect(theme.isDark.value).toBe(false)

    // Test auto mode - depends on mock preference
    theme.setTheme('auto')
    expect(theme.themeMode.value).toBe('auto')
    expect(theme.isDark.value).toBe(false) // Mock preference is false
  })

  it('should handle theme toggle', async () => {
    const { useTheme } = await import('./useTheme')
    const theme = useTheme()

    // Test toggle from auto with false preference (should go to dark)
    mockPreferredDark.value = false
    theme.setTheme('auto')
    theme.toggleTheme()
    expect(theme.themeMode.value).toBe('dark')

    // Test toggle from dark to light
    theme.toggleTheme()
    expect(theme.themeMode.value).toBe('light')

    // Test toggle from light to dark
    theme.toggleTheme()
    expect(theme.themeMode.value).toBe('dark')
  })

  it('should handle platform changes', async () => {
    const { useTheme } = await import('./useTheme')
    const theme = useTheme()

    // Test platform changes
    theme.setPlatform('macos')
    expect(theme.platform.value).toBe('macos')

    theme.setPlatform('windows')
    expect(theme.platform.value).toBe('windows')
    expect(mockDocument.documentElement.classList.remove).toHaveBeenCalledWith(
      'platform-macos'
    )
    expect(mockDocument.documentElement.classList.add).toHaveBeenCalledWith(
      'platform-windows'
    )

    theme.setPlatform('linux')
    expect(theme.platform.value).toBe('linux')
  })

  it('should handle Electron integration', async () => {
    const mockSetTheme = vi.fn()
    global.window = {
      ...global.window,
      electronAPI: {
        setTheme: mockSetTheme,
      },
    } as unknown as Window & typeof globalThis

    // Reset mock storage to ensure clean state
    mockThemeMode.value = 'auto'

    const { useTheme } = await import('./useTheme')
    const theme = useTheme()

    // Test Electron theme sync with initial theme
    theme.syncThemeWithElectron()
    expect(mockSetTheme).toHaveBeenCalledWith('auto')

    // Test with different theme
    theme.setTheme('dark')
    theme.syncThemeWithElectron()
    expect(mockSetTheme).toHaveBeenCalledWith('dark')
  })

  it('should handle missing Electron API gracefully', async () => {
    global.window = {
      ...global.window,
    } as unknown as Window & typeof globalThis

    const { useTheme } = await import('./useTheme')
    const theme = useTheme()

    // Should not throw error
    expect(() => theme.syncThemeWithElectron()).not.toThrow()
  })

  it('should handle server-side rendering', async () => {
    const originalWindow = global.window
    // @ts-expect-error - Intentionally setting to undefined for SSR test
    global.window = undefined

    const { useTheme } = await import('./useTheme')
    expect(() => useTheme()).not.toThrow()

    global.window = originalWindow
  })

  it('should detect platform from user agent', async () => {
    // Test Windows detection by setting up before import
    global.window = {
      ...global.window,
      navigator: {
        userAgent: 'Windows NT 10.0',
      },
    } as unknown as Window & typeof globalThis

    // Clear mock call history
    ;(
      mockDocument.documentElement.classList.add as ReturnType<typeof vi.fn>
    ).mockClear()

    const { useTheme } = await import('./useTheme')
    const theme = useTheme()

    // The platform should be detected correctly
    expect(theme.platform.value).toBe('windows')
    expect(mockDocument.documentElement.classList.add).toHaveBeenCalledWith(
      'platform-windows'
    )
  })

  it('should handle platform simulation events', async () => {
    const mockOn = vi.fn()
    global.window = {
      ...global.window,
      electronAPI: {
        ...mockElectronAPI,
        on: mockOn,
      },
    } as unknown as Window & typeof globalThis

    const { useTheme } = await import('./useTheme')
    useTheme()

    // Should register platform simulation event listener during module initialization
    expect(mockOn).toHaveBeenCalledWith(
      'simulate-platform',
      expect.any(Function)
    )

    // Test the callback function
    const callsForSimulatePlatform = mockOn.mock.calls.filter(
      (call) => call[0] === 'simulate-platform'
    )
    expect(callsForSimulatePlatform.length).toBeGreaterThan(0)

    const [eventName, callback] = callsForSimulatePlatform[0]
    expect(eventName).toBe('simulate-platform')

    // Call the callback to test platform simulation
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    callback('linux')
    expect(consoleSpy).toHaveBeenCalledWith(
      'Platform simulation received:',
      'linux'
    )
    consoleSpy.mockRestore()
  })

  it('should return void from all methods', async () => {
    const { useTheme } = await import('./useTheme')
    const theme = useTheme()

    expect(theme.setTheme('dark')).toBeUndefined()
    expect(theme.toggleTheme()).toBeUndefined()
    expect(theme.setPlatform('windows')).toBeUndefined()
    expect(theme.syncThemeWithElectron()).toBeUndefined()
  })
})
