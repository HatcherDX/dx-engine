/**
 * @fileoverview Tests for TerminalAddonManager.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { Terminal, ITerminalAddon } from 'xterm'
import { TerminalAddonManager, AddonType } from './AddonManager'

// Mock terminal
const createMockTerminal = (): Terminal =>
  ({
    loadAddon: vi.fn(),
    dispose: vi.fn(),
    unicode: { activeVersion: '6' },
  }) as Partial<Terminal>

// Mock the addon constructors
const mockFitAddonInstance = { fit: vi.fn(), dispose: vi.fn() }
const mockWebglAddonInstance = {
  onContextLoss: vi.fn(),
  dispose: vi.fn(),
}
const mockSearchAddonInstance = {
  findNext: vi.fn(),
  dispose: vi.fn(),
}
const mockWebLinksAddonInstance = { dispose: vi.fn() }
const mockClipboardAddonInstance = { dispose: vi.fn() }
const mockUnicode11AddonInstance = { dispose: vi.fn() }

// Mock addon modules
vi.mock('@xterm/addon-fit', () => ({
  FitAddon: vi.fn(() => mockFitAddonInstance),
}))

vi.mock('@xterm/addon-webgl', () => ({
  WebglAddon: vi.fn(() => mockWebglAddonInstance),
}))

vi.mock('@xterm/addon-search', () => ({
  SearchAddon: vi.fn(() => mockSearchAddonInstance),
}))

vi.mock('@xterm/addon-web-links', () => ({
  WebLinksAddon: vi.fn(() => mockWebLinksAddonInstance),
}))

vi.mock('@xterm/addon-clipboard', () => ({
  ClipboardAddon: vi.fn(() => mockClipboardAddonInstance),
}))

vi.mock('@xterm/addon-unicode11', () => ({
  Unicode11Addon: vi.fn(() => mockUnicode11AddonInstance),
}))

describe('TerminalAddonManager', () => {
  let manager: TerminalAddonManager
  let mockTerminal: Terminal

  beforeEach(() => {
    vi.clearAllMocks()
    manager = new TerminalAddonManager()
    mockTerminal = createMockTerminal()

    // Mock WebGL support check
    const mockCanvas = {
      getContext: vi.fn(() => ({})), // Return truthy value for WebGL support
    }
    vi.spyOn(document, 'createElement').mockReturnValue(
      mockCanvas as Partial<HTMLCanvasElement>
    )
  })

  afterEach(() => {
    manager.dispose()
    vi.restoreAllMocks()
  })

  describe('constructor', () => {
    it('should initialize with default options', () => {
      const manager = new TerminalAddonManager()
      expect(manager.getAddonCount()).toBe(0)
    })

    it('should accept debug option as true', () => {
      const manager = new TerminalAddonManager({ debug: true })
      expect(manager).toBeDefined()
      expect(manager.getAddonCount()).toBe(0)
    })

    it('should accept debug option as false', () => {
      const manager = new TerminalAddonManager({ debug: false })
      expect(manager).toBeDefined()
      expect(manager.getAddonCount()).toBe(0)
    })
  })

  describe('loadFitAddon', () => {
    it('should load FitAddon successfully', async () => {
      const addon = await manager.loadFitAddon(mockTerminal)

      expect(addon).toBe(mockFitAddonInstance)
      expect(addon.fit).toBeDefined()
      expect(mockTerminal.loadAddon).toHaveBeenCalledWith(addon)
      expect(manager.isAddonLoaded(AddonType.FIT)).toBe(true)
    })

    it('should log when debug is enabled', async () => {
      const consoleSpy = vi.spyOn(console, 'log')
      const debugManager = new TerminalAddonManager({ debug: true })

      await debugManager.loadFitAddon(mockTerminal)

      expect(consoleSpy).toHaveBeenCalledWith(
        '[AddonManager] FitAddon loaded successfully'
      )
      consoleSpy.mockRestore()
    })

    it('should throw error on load failure', async () => {
      const consoleSpy = vi.spyOn(console, 'error')
      const debugManager = new TerminalAddonManager({ debug: true })

      // Mock the import to throw an error
      const error = new Error('Module not found')
      vi.mocked(
        await import('@xterm/addon-fit')
      ).FitAddon.mockImplementationOnce(() => {
        throw error
      })

      await expect(debugManager.loadFitAddon(mockTerminal)).rejects.toThrow(
        'Failed to load FitAddon: Error: Module not found'
      )

      expect(consoleSpy).toHaveBeenCalledWith(
        '[AddonManager] Failed to load FitAddon:',
        error
      )
      consoleSpy.mockRestore()
    })
  })

  describe('loadWebGLAddon', () => {
    it('should load WebglAddon when WebGL is supported', async () => {
      const addon = await manager.loadWebGLAddon(mockTerminal)

      expect(addon).toBe(mockWebglAddonInstance)
      expect(addon!.onContextLoss).toBeDefined()
      expect(mockTerminal.loadAddon).toHaveBeenCalledWith(addon)
      expect(addon!.onContextLoss).toHaveBeenCalled()
      expect(manager.isAddonLoaded(AddonType.WEBGL)).toBe(true)
    })

    it('should log when debug is enabled', async () => {
      const consoleSpy = vi.spyOn(console, 'log')
      const debugManager = new TerminalAddonManager({ debug: true })

      await debugManager.loadWebGLAddon(mockTerminal)

      expect(consoleSpy).toHaveBeenCalledWith(
        '[AddonManager] WebglAddon loaded successfully'
      )
      consoleSpy.mockRestore()
    })

    it('should return null when WebGL is not supported', async () => {
      const consoleSpy = vi.spyOn(console, 'warn')
      const debugManager = new TerminalAddonManager({ debug: true })

      // Mock no WebGL support
      const mockCanvas = {
        getContext: vi.fn(() => null),
      }
      vi.spyOn(document, 'createElement').mockReturnValue(
        mockCanvas as Partial<HTMLCanvasElement>
      )

      const addon = await debugManager.loadWebGLAddon(mockTerminal)

      expect(addon).toBeNull()
      expect(mockTerminal.loadAddon).not.toHaveBeenCalled()
      expect(debugManager.isAddonLoaded(AddonType.WEBGL)).toBe(false)
      expect(consoleSpy).toHaveBeenCalledWith(
        '[AddonManager] WebGL not supported, skipping addon'
      )
      consoleSpy.mockRestore()
    })

    it('should handle WebGL context loss', async () => {
      const consoleSpy = vi.spyOn(console, 'warn')
      const debugManager = new TerminalAddonManager({ debug: true })
      await debugManager.loadWebGLAddon(mockTerminal)

      // Trigger context loss callback
      const contextLossCallback =
        mockWebglAddonInstance.onContextLoss.mock.calls[0][0]
      contextLossCallback()

      expect(consoleSpy).toHaveBeenCalledWith(
        '[AddonManager] WebGL context lost, disposing addon'
      )
      expect(debugManager.isAddonLoaded(AddonType.WEBGL)).toBe(false)
      consoleSpy.mockRestore()
    })

    it('should return null on load error', async () => {
      const consoleSpy = vi.spyOn(console, 'warn')
      const debugManager = new TerminalAddonManager({ debug: true })

      // Mock the import to throw an error
      const error = new Error('WebGL error')
      vi.mocked(
        await import('@xterm/addon-webgl')
      ).WebglAddon.mockImplementationOnce(() => {
        throw error
      })

      const addon = await debugManager.loadWebGLAddon(mockTerminal)

      expect(addon).toBeNull()
      expect(consoleSpy).toHaveBeenCalledWith(
        '[AddonManager] WebglAddon failed, falling back to canvas:',
        error
      )
      consoleSpy.mockRestore()
    })

    it('should handle exception in WebGL support check', async () => {
      // Mock document.createElement to throw
      vi.spyOn(document, 'createElement').mockImplementationOnce(() => {
        throw new Error('Canvas error')
      })

      const addon = await manager.loadWebGLAddon(mockTerminal)
      expect(addon).toBeNull()
    })
  })

  describe('loadSearchAddon', () => {
    it('should load SearchAddon successfully', async () => {
      const addon = await manager.loadSearchAddon(mockTerminal)

      expect(addon).toBe(mockSearchAddonInstance)
      expect(addon.findNext).toBeDefined()
      expect(mockTerminal.loadAddon).toHaveBeenCalledWith(addon)
      expect(manager.isAddonLoaded(AddonType.SEARCH)).toBe(true)
    })

    it('should log when debug is enabled', async () => {
      const consoleSpy = vi.spyOn(console, 'log')
      const debugManager = new TerminalAddonManager({ debug: true })

      await debugManager.loadSearchAddon(mockTerminal)

      expect(consoleSpy).toHaveBeenCalledWith(
        '[AddonManager] SearchAddon loaded successfully'
      )
      consoleSpy.mockRestore()
    })

    it('should throw error on load failure', async () => {
      const consoleSpy = vi.spyOn(console, 'error')
      const debugManager = new TerminalAddonManager({ debug: true })

      // Mock the import to throw an error
      const error = new Error('Search addon error')
      vi.mocked(
        await import('@xterm/addon-search')
      ).SearchAddon.mockImplementationOnce(() => {
        throw error
      })

      await expect(debugManager.loadSearchAddon(mockTerminal)).rejects.toThrow(
        'Failed to load SearchAddon: Error: Search addon error'
      )

      expect(consoleSpy).toHaveBeenCalledWith(
        '[AddonManager] Failed to load SearchAddon:',
        error
      )
      consoleSpy.mockRestore()
    })
  })

  describe('loadWebLinksAddon', () => {
    it('should load WebLinksAddon successfully', async () => {
      const addon = await manager.loadWebLinksAddon(mockTerminal)

      expect(addon).toBe(mockWebLinksAddonInstance)
      expect(mockTerminal.loadAddon).toHaveBeenCalledWith(addon)
      expect(manager.isAddonLoaded(AddonType.WEB_LINKS)).toBe(true)
    })

    it('should log when debug is enabled', async () => {
      const consoleSpy = vi.spyOn(console, 'log')
      const debugManager = new TerminalAddonManager({ debug: true })

      await debugManager.loadWebLinksAddon(mockTerminal)

      expect(consoleSpy).toHaveBeenCalledWith(
        '[AddonManager] WebLinksAddon loaded successfully'
      )
      consoleSpy.mockRestore()
    })

    it('should throw error on load failure', async () => {
      const consoleSpy = vi.spyOn(console, 'error')
      const debugManager = new TerminalAddonManager({ debug: true })

      // Mock the import to throw an error
      const error = new Error('WebLinks addon error')
      vi.mocked(
        await import('@xterm/addon-web-links')
      ).WebLinksAddon.mockImplementationOnce(() => {
        throw error
      })

      await expect(
        debugManager.loadWebLinksAddon(mockTerminal)
      ).rejects.toThrow(
        'Failed to load WebLinksAddon: Error: WebLinks addon error'
      )

      expect(consoleSpy).toHaveBeenCalledWith(
        '[AddonManager] Failed to load WebLinksAddon:',
        error
      )
      consoleSpy.mockRestore()
    })
  })

  describe('loadClipboardAddon', () => {
    it('should load ClipboardAddon successfully', async () => {
      const addon = await manager.loadClipboardAddon(mockTerminal)

      expect(addon).toBe(mockClipboardAddonInstance)
      expect(mockTerminal.loadAddon).toHaveBeenCalledWith(addon)
      expect(manager.isAddonLoaded(AddonType.CLIPBOARD)).toBe(true)
    })

    it('should log when debug is enabled', async () => {
      const consoleSpy = vi.spyOn(console, 'log')
      const debugManager = new TerminalAddonManager({ debug: true })

      await debugManager.loadClipboardAddon(mockTerminal)

      expect(consoleSpy).toHaveBeenCalledWith(
        '[AddonManager] ClipboardAddon loaded successfully'
      )
      consoleSpy.mockRestore()
    })

    it('should throw error on load failure', async () => {
      const consoleSpy = vi.spyOn(console, 'error')
      const debugManager = new TerminalAddonManager({ debug: true })

      // Mock the import to throw an error
      const error = new Error('Clipboard addon error')
      vi.mocked(
        await import('@xterm/addon-clipboard')
      ).ClipboardAddon.mockImplementationOnce(() => {
        throw error
      })

      await expect(
        debugManager.loadClipboardAddon(mockTerminal)
      ).rejects.toThrow(
        'Failed to load ClipboardAddon: Error: Clipboard addon error'
      )

      expect(consoleSpy).toHaveBeenCalledWith(
        '[AddonManager] Failed to load ClipboardAddon:',
        error
      )
      consoleSpy.mockRestore()
    })
  })

  describe('loadUnicode11Addon', () => {
    it('should load Unicode11Addon and activate Unicode 11', async () => {
      const addon = await manager.loadUnicode11Addon(mockTerminal)

      expect(addon).toBe(mockUnicode11AddonInstance)
      expect(mockTerminal.loadAddon).toHaveBeenCalledWith(addon)
      expect(mockTerminal.unicode.activeVersion).toBe('11')
      expect(manager.isAddonLoaded(AddonType.UNICODE11)).toBe(true)
    })

    it('should handle terminal without unicode property', async () => {
      const terminalWithoutUnicode = createMockTerminal()
      delete (terminalWithoutUnicode as Partial<Terminal>).unicode

      const addon = await manager.loadUnicode11Addon(terminalWithoutUnicode)

      expect(addon).toBe(mockUnicode11AddonInstance)
      expect(terminalWithoutUnicode.loadAddon).toHaveBeenCalled()
    })

    it('should log when debug is enabled', async () => {
      const consoleSpy = vi.spyOn(console, 'log')
      const debugManager = new TerminalAddonManager({ debug: true })

      await debugManager.loadUnicode11Addon(mockTerminal)

      expect(consoleSpy).toHaveBeenCalledWith(
        '[AddonManager] Unicode11Addon loaded successfully'
      )
      consoleSpy.mockRestore()
    })

    it('should throw error on load failure', async () => {
      const consoleSpy = vi.spyOn(console, 'error')
      const debugManager = new TerminalAddonManager({ debug: true })

      // Mock the import to throw an error
      const error = new Error('Unicode11 addon error')
      vi.mocked(
        await import('@xterm/addon-unicode11')
      ).Unicode11Addon.mockImplementationOnce(() => {
        throw error
      })

      await expect(
        debugManager.loadUnicode11Addon(mockTerminal)
      ).rejects.toThrow(
        'Failed to load Unicode11Addon: Error: Unicode11 addon error'
      )

      expect(consoleSpy).toHaveBeenCalledWith(
        '[AddonManager] Failed to load Unicode11Addon:',
        error
      )
      consoleSpy.mockRestore()
    })
  })

  describe('loadAllAddons', () => {
    it('should load all addons by default', async () => {
      const addons = await manager.loadAllAddons(mockTerminal)

      expect(addons.fit).toBe(mockFitAddonInstance)
      expect(addons.webgl).toBe(mockWebglAddonInstance)
      expect(addons.search).toBe(mockSearchAddonInstance)
      expect(addons.webLinks).toBe(mockWebLinksAddonInstance)
      expect(addons.clipboard).toBe(mockClipboardAddonInstance)
      expect(addons.unicode11).toBe(mockUnicode11AddonInstance)
      expect(manager.getAddonCount()).toBe(6)
    })

    it('should skip disabled addons', async () => {
      const addons = await manager.loadAllAddons(mockTerminal, {
        enableWebGL: false,
        enableSearch: false,
        enableWebLinks: false,
        enableClipboard: false,
        enableUnicode11: false,
      })

      expect(addons.fit).toBe(mockFitAddonInstance)
      expect(addons.webgl).toBeUndefined()
      expect(addons.search).toBeUndefined()
      expect(addons.webLinks).toBeUndefined()
      expect(addons.clipboard).toBeUndefined()
      expect(addons.unicode11).toBeUndefined()
      expect(manager.getAddonCount()).toBe(1)
    })

    it('should load all addons with empty options', async () => {
      const addons = await manager.loadAllAddons(mockTerminal, {})

      expect(addons.fit).toBe(mockFitAddonInstance)
      expect(addons.webgl).toBe(mockWebglAddonInstance)
      expect(addons.search).toBe(mockSearchAddonInstance)
      expect(addons.webLinks).toBe(mockWebLinksAddonInstance)
      expect(addons.clipboard).toBe(mockClipboardAddonInstance)
      expect(addons.unicode11).toBe(mockUnicode11AddonInstance)
    })
  })

  describe('getAddon', () => {
    it('should retrieve loaded addon', async () => {
      await manager.loadFitAddon(mockTerminal)

      const addon = manager.getAddon(AddonType.FIT)
      expect(addon).toBe(mockFitAddonInstance)
    })

    it('should return undefined for unloaded addon', () => {
      const addon = manager.getAddon(AddonType.SEARCH)
      expect(addon).toBeUndefined()
    })
  })

  describe('isAddonLoaded', () => {
    it('should return true for loaded addon', async () => {
      await manager.loadSearchAddon(mockTerminal)

      expect(manager.isAddonLoaded(AddonType.SEARCH)).toBe(true)
    })

    it('should return false for unloaded addon', () => {
      expect(manager.isAddonLoaded(AddonType.CLIPBOARD)).toBe(false)
    })
  })

  describe('disposeAddon', () => {
    it('should dispose specific addon', async () => {
      await manager.loadFitAddon(mockTerminal)
      expect(manager.isAddonLoaded(AddonType.FIT)).toBe(true)

      manager.disposeAddon(AddonType.FIT)

      expect(mockFitAddonInstance.dispose).toHaveBeenCalled()
      expect(manager.isAddonLoaded(AddonType.FIT)).toBe(false)
    })

    it('should handle disposing non-existent addon', () => {
      expect(() => manager.disposeAddon(AddonType.WEBGL)).not.toThrow()
    })

    it('should dispose addon with debug logging', async () => {
      const consoleSpy = vi.spyOn(console, 'log')
      const debugManager = new TerminalAddonManager({ debug: true })

      await debugManager.loadFitAddon(mockTerminal)
      debugManager.disposeAddon(AddonType.FIT)

      expect(consoleSpy).toHaveBeenCalledWith(
        `[AddonManager] Disposed addon: ${AddonType.FIT}`
      )
      consoleSpy.mockRestore()
    })

    it('should handle addon without dispose method', async () => {
      // Create a mock addon without dispose
      const addonWithoutDispose = {} as Partial<ITerminalAddon>
      const manager = new TerminalAddonManager()

      // Manually add to the map to simulate an addon without dispose
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private property for testing
      ;(manager as any).addons.set(AddonType.SEARCH, addonWithoutDispose)

      expect(() => manager.disposeAddon(AddonType.SEARCH)).not.toThrow()
      expect(manager.isAddonLoaded(AddonType.SEARCH)).toBe(true)
    })
  })

  describe('dispose', () => {
    it('should dispose all loaded addons', async () => {
      await manager.loadFitAddon(mockTerminal)
      await manager.loadSearchAddon(mockTerminal)
      await manager.loadWebLinksAddon(mockTerminal)

      manager.dispose()

      expect(mockFitAddonInstance.dispose).toHaveBeenCalled()
      expect(mockSearchAddonInstance.dispose).toHaveBeenCalled()
      expect(mockWebLinksAddonInstance.dispose).toHaveBeenCalled()
      expect(manager.getAddonCount()).toBe(0)
    })

    it('should handle addons without dispose method', async () => {
      const manager = new TerminalAddonManager()

      // Add addon without dispose method
      const addonWithoutDispose = {} as Partial<ITerminalAddon>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private property for testing
      ;(manager as any).addons.set(AddonType.SEARCH, addonWithoutDispose)

      expect(() => manager.dispose()).not.toThrow()
      expect(manager.getAddonCount()).toBe(0)
    })

    it('should log when debug is enabled', async () => {
      const consoleSpy = vi.spyOn(console, 'log')
      const debugManager = new TerminalAddonManager({ debug: true })

      await debugManager.loadFitAddon(mockTerminal)
      debugManager.dispose()

      expect(consoleSpy).toHaveBeenCalledWith(
        '[AddonManager] All addons disposed'
      )
      consoleSpy.mockRestore()
    })
  })

  describe('getLoadedAddons', () => {
    it('should return list of loaded addon types', async () => {
      await manager.loadFitAddon(mockTerminal)
      await manager.loadSearchAddon(mockTerminal)

      const loaded = manager.getLoadedAddons()

      expect(loaded).toContain(AddonType.FIT)
      expect(loaded).toContain(AddonType.SEARCH)
      expect(loaded.length).toBe(2)
    })

    it('should return empty array when no addons loaded', () => {
      expect(manager.getLoadedAddons()).toEqual([])
    })
  })

  describe('getAddonCount', () => {
    it('should return correct count of loaded addons', async () => {
      expect(manager.getAddonCount()).toBe(0)

      await manager.loadFitAddon(mockTerminal)
      expect(manager.getAddonCount()).toBe(1)

      await manager.loadSearchAddon(mockTerminal)
      expect(manager.getAddonCount()).toBe(2)

      manager.disposeAddon(AddonType.FIT)
      expect(manager.getAddonCount()).toBe(1)
    })
  })

  describe('debug mode disabled branches', () => {
    it('should not log when loading FitAddon with debug disabled', async () => {
      const consoleSpy = vi.spyOn(console, 'log')
      const manager = new TerminalAddonManager({ debug: false })

      await manager.loadFitAddon(mockTerminal)

      expect(consoleSpy).not.toHaveBeenCalled()
      consoleSpy.mockRestore()
    })

    it('should not log when loading WebGL addon with debug disabled and WebGL not supported', async () => {
      const consoleSpy = vi.spyOn(console, 'warn')
      const manager = new TerminalAddonManager({ debug: false })

      // Mock no WebGL support
      const mockCanvas = {
        getContext: vi.fn(() => null),
      }
      vi.spyOn(document, 'createElement').mockReturnValue(
        mockCanvas as Partial<HTMLCanvasElement>
      )

      await manager.loadWebGLAddon(mockTerminal)

      expect(consoleSpy).not.toHaveBeenCalled()
      consoleSpy.mockRestore()
    })

    it('should not log on WebGL context loss with debug disabled', async () => {
      const consoleSpy = vi.spyOn(console, 'warn')
      const manager = new TerminalAddonManager({ debug: false })

      await manager.loadWebGLAddon(mockTerminal)

      // Trigger context loss callback
      const contextLossCallback =
        mockWebglAddonInstance.onContextLoss.mock.calls[0][0]
      contextLossCallback()

      expect(consoleSpy).not.toHaveBeenCalled()
      consoleSpy.mockRestore()
    })

    it('should not log when loading WebGL with debug disabled', async () => {
      const consoleSpy = vi.spyOn(console, 'log')
      const manager = new TerminalAddonManager({ debug: false })

      await manager.loadWebGLAddon(mockTerminal)

      expect(consoleSpy).not.toHaveBeenCalled()
      consoleSpy.mockRestore()
    })

    it('should not log when loading SearchAddon with debug disabled', async () => {
      const consoleSpy = vi.spyOn(console, 'log')
      const manager = new TerminalAddonManager({ debug: false })

      await manager.loadSearchAddon(mockTerminal)

      expect(consoleSpy).not.toHaveBeenCalled()
      consoleSpy.mockRestore()
    })

    it('should not log when loading WebLinksAddon with debug disabled', async () => {
      const consoleSpy = vi.spyOn(console, 'log')
      const manager = new TerminalAddonManager({ debug: false })

      await manager.loadWebLinksAddon(mockTerminal)

      expect(consoleSpy).not.toHaveBeenCalled()
      consoleSpy.mockRestore()
    })

    it('should not log when loading ClipboardAddon with debug disabled', async () => {
      const consoleSpy = vi.spyOn(console, 'log')
      const manager = new TerminalAddonManager({ debug: false })

      await manager.loadClipboardAddon(mockTerminal)

      expect(consoleSpy).not.toHaveBeenCalled()
      consoleSpy.mockRestore()
    })

    it('should not log when loading Unicode11Addon with debug disabled', async () => {
      const consoleSpy = vi.spyOn(console, 'log')
      const manager = new TerminalAddonManager({ debug: false })

      await manager.loadUnicode11Addon(mockTerminal)

      expect(consoleSpy).not.toHaveBeenCalled()
      consoleSpy.mockRestore()
    })

    it('should not log when disposing addon with debug disabled', async () => {
      const consoleSpy = vi.spyOn(console, 'log')
      const manager = new TerminalAddonManager({ debug: false })

      await manager.loadFitAddon(mockTerminal)
      manager.disposeAddon(AddonType.FIT)

      // The first call is from loadFitAddon which doesn't log when debug is false
      expect(consoleSpy).not.toHaveBeenCalled()
      consoleSpy.mockRestore()
    })

    it('should not log when disposing all with debug disabled', async () => {
      const consoleSpy = vi.spyOn(console, 'log')
      const manager = new TerminalAddonManager({ debug: false })

      await manager.loadFitAddon(mockTerminal)
      manager.dispose()

      expect(consoleSpy).not.toHaveBeenCalled()
      consoleSpy.mockRestore()
    })

    it('should not log error when FitAddon fails with debug disabled', async () => {
      const consoleSpy = vi.spyOn(console, 'error')
      const manager = new TerminalAddonManager({ debug: false })

      const error = new Error('Module not found')
      vi.mocked(
        await import('@xterm/addon-fit')
      ).FitAddon.mockImplementationOnce(() => {
        throw error
      })

      await expect(manager.loadFitAddon(mockTerminal)).rejects.toThrow()

      expect(consoleSpy).not.toHaveBeenCalled()
      consoleSpy.mockRestore()
    })

    it('should not log error when SearchAddon fails with debug disabled', async () => {
      const consoleSpy = vi.spyOn(console, 'error')
      const manager = new TerminalAddonManager({ debug: false })

      const error = new Error('Search error')
      vi.mocked(
        await import('@xterm/addon-search')
      ).SearchAddon.mockImplementationOnce(() => {
        throw error
      })

      await expect(manager.loadSearchAddon(mockTerminal)).rejects.toThrow()

      expect(consoleSpy).not.toHaveBeenCalled()
      consoleSpy.mockRestore()
    })

    it('should not log error when WebLinksAddon fails with debug disabled', async () => {
      const consoleSpy = vi.spyOn(console, 'error')
      const manager = new TerminalAddonManager({ debug: false })

      const error = new Error('WebLinks error')
      vi.mocked(
        await import('@xterm/addon-web-links')
      ).WebLinksAddon.mockImplementationOnce(() => {
        throw error
      })

      await expect(manager.loadWebLinksAddon(mockTerminal)).rejects.toThrow()

      expect(consoleSpy).not.toHaveBeenCalled()
      consoleSpy.mockRestore()
    })

    it('should not log error when ClipboardAddon fails with debug disabled', async () => {
      const consoleSpy = vi.spyOn(console, 'error')
      const manager = new TerminalAddonManager({ debug: false })

      const error = new Error('Clipboard error')
      vi.mocked(
        await import('@xterm/addon-clipboard')
      ).ClipboardAddon.mockImplementationOnce(() => {
        throw error
      })

      await expect(manager.loadClipboardAddon(mockTerminal)).rejects.toThrow()

      expect(consoleSpy).not.toHaveBeenCalled()
      consoleSpy.mockRestore()
    })

    it('should not log error when Unicode11Addon fails with debug disabled', async () => {
      const consoleSpy = vi.spyOn(console, 'error')
      const manager = new TerminalAddonManager({ debug: false })

      const error = new Error('Unicode11 error')
      vi.mocked(
        await import('@xterm/addon-unicode11')
      ).Unicode11Addon.mockImplementationOnce(() => {
        throw error
      })

      await expect(manager.loadUnicode11Addon(mockTerminal)).rejects.toThrow()

      expect(consoleSpy).not.toHaveBeenCalled()
      consoleSpy.mockRestore()
    })

    it('should not log warning when WebGL fails with debug disabled', async () => {
      const consoleSpy = vi.spyOn(console, 'warn')
      const manager = new TerminalAddonManager({ debug: false })

      const error = new Error('WebGL error')
      vi.mocked(
        await import('@xterm/addon-webgl')
      ).WebglAddon.mockImplementationOnce(() => {
        throw error
      })

      await manager.loadWebGLAddon(mockTerminal)

      expect(consoleSpy).not.toHaveBeenCalled()
      consoleSpy.mockRestore()
    })
  })
})
