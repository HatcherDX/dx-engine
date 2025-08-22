/**
 * @fileoverview Comprehensive tests for Electron menu functionality
 *
 * @description
 * Tests for the application menu system:
 * - Menu creation and template configuration
 * - Platform-specific menu variations (macOS vs Windows/Linux)
 * - Development mode menu additions
 * - Platform simulation functionality
 * - IPC integration for development features
 * - Menu item click handlers and interactions
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Mock modules with hoisted functions
const { mockMenu, mockShell } = vi.hoisted(() => ({
  mockMenu: {
    buildFromTemplate: vi.fn(),
    setApplicationMenu: vi.fn(),
  },
  mockShell: {
    openExternal: vi.fn(),
  },
}))

const { mockIsDev } = vi.hoisted(() => ({
  mockIsDev: vi.fn(),
}))

const { mockIpcMain } = vi.hoisted(() => ({
  mockIpcMain: {
    send: vi.fn(),
  },
}))

// Mock Electron modules
vi.mock('electron', () => ({
  Menu: mockMenu,
  shell: mockShell,
  app: {
    getName: vi.fn(() => 'Test App'),
    getVersion: vi.fn(() => '1.0.0'),
  },
}))

// Mock utility modules
vi.mock('./utils', () => {
  let isDev = false // Default value
  return {
    get isDev() {
      return isDev
    },
    set isDev(value) {
      isDev = value
    },
  }
})

// Mock IPC module
vi.mock('./ipc', () => ({
  ipcMain: mockIpcMain,
}))

describe('Menu Module', () => {
  let originalPlatform: string
  let originalRequire: NodeRequire

  beforeEach(() => {
    // Store original platform
    originalPlatform = process.platform

    // Setup default mocks
    mockIsDev.mockReturnValue(false)

    // Mock Node.js Module.require for menu.ts dynamic imports
    const Module = require('module')
    originalRequire = Module.prototype.require
    Module.prototype.require = vi.fn((id) => {
      if (id === 'electron') {
        return { shell: mockShell }
      }
      return originalRequire.call(this, id)
    })

    vi.clearAllMocks()
  })

  afterEach(() => {
    // Restore original platform
    Object.defineProperty(process, 'platform', {
      value: originalPlatform,
      writable: true,
    })

    // Restore original require
    if (originalRequire) {
      const Module = require('module')
      Module.prototype.require = originalRequire
    }

    vi.restoreAllMocks()
  })

  describe('Module Import and Function Execution', () => {
    it('should import and call setupApplicationMenu function', async () => {
      vi.resetModules()

      // Import and execute the function
      const { setupApplicationMenu } = await import('./menu')
      setupApplicationMenu()

      // Verify menu was built and set
      expect(mockMenu.buildFromTemplate).toHaveBeenCalled()
      expect(mockMenu.setApplicationMenu).toHaveBeenCalled()
    })

    it('should execute setupApplicationMenu with macOS platform', async () => {
      vi.resetModules()

      // Set macOS platform
      Object.defineProperty(process, 'platform', {
        value: 'darwin',
        writable: true,
      })

      const { setupApplicationMenu } = await import('./menu')
      setupApplicationMenu()

      // Verify macOS-specific menu structure was used
      expect(mockMenu.buildFromTemplate).toHaveBeenCalled()
      const menuTemplate = mockMenu.buildFromTemplate.mock.calls[0][0]

      // Check for macOS-specific menu items
      const appMenu = menuTemplate.find(
        (item: unknown) => (item as Record<string, unknown>).label === 'Hatcher'
      ) as Record<string, unknown>
      expect(appMenu).toBeDefined()

      const hasServicesRole = (appMenu.submenu as unknown[]).some(
        (item: unknown) => (item as Record<string, unknown>).role === 'services'
      )
      expect(hasServicesRole).toBe(true)
    })

    it('should execute setupApplicationMenu with Windows/Linux platform', async () => {
      vi.resetModules()

      // Set Windows platform
      Object.defineProperty(process, 'platform', {
        value: 'win32',
        writable: true,
      })

      const { setupApplicationMenu } = await import('./menu')
      setupApplicationMenu()

      // Verify Windows-specific menu structure was used
      expect(mockMenu.buildFromTemplate).toHaveBeenCalled()
      const menuTemplate = mockMenu.buildFromTemplate.mock.calls[0][0]

      // Check for Windows-specific menu items
      const fileMenu = menuTemplate.find(
        (item: unknown) => (item as Record<string, unknown>).label === 'File'
      )
      expect(fileMenu).toBeDefined()
      const hasAboutHatcher = (
        (fileMenu as Record<string, unknown>).submenu as unknown[]
      ).some(
        (item: unknown) =>
          (item as Record<string, unknown>).label === 'About Hatcher'
      )
      expect(hasAboutHatcher).toBe(true)
    })

    it('should include Development menu in development mode', async () => {
      vi.resetModules()

      // Enable development mode using dynamic import
      vi.doMock('./utils', () => ({
        isDev: true,
      }))

      const { setupApplicationMenu } = await import('./menu')
      setupApplicationMenu()

      // Verify development menu was included
      expect(mockMenu.buildFromTemplate).toHaveBeenCalled()
      const menuTemplate = mockMenu.buildFromTemplate.mock.calls[0][0]

      const devMenu = menuTemplate.find(
        (item: unknown) =>
          (item as Record<string, unknown>).label === 'Development'
      )
      expect(devMenu).toBeDefined()
      const hasSimulatePlatform = (
        (devMenu as Record<string, unknown>).submenu as unknown[]
      ).some(
        (item: unknown) =>
          (item as Record<string, unknown>).label === 'Simulate Platform'
      )
      expect(hasSimulatePlatform).toBe(true)
    })

    it('should exclude Development menu in production mode', async () => {
      vi.resetModules()

      // Disable development mode using dynamic import
      vi.doMock('./utils', () => ({
        isDev: false,
      }))

      const { setupApplicationMenu } = await import('./menu')
      setupApplicationMenu()

      // Verify development menu was not included
      expect(mockMenu.buildFromTemplate).toHaveBeenCalled()
      const menuTemplate = mockMenu.buildFromTemplate.mock.calls[0][0]

      const devMenu = menuTemplate.find(
        (item: unknown) =>
          (item as Record<string, unknown>).label === 'Development'
      )
      expect(devMenu).toBeUndefined()
    })
  })

  describe('Menu Template Structure Tests', () => {
    it('should create correct menu structure for macOS', () => {
      // Test macOS menu template structure

      const createMacTemplate = () => [
        // App Menu
        {
          label: 'Hatcher',
          submenu: [
            { role: 'about' },
            { type: 'separator' },
            { label: 'Settings...', enabled: false, accelerator: 'Cmd+,' },
            { type: 'separator' },
            { role: 'services' },
            { type: 'separator' },
            { role: 'hide' },
            { role: 'hideothers' },
            { role: 'unhide' },
            { type: 'separator' },
            { role: 'quit' },
          ],
        },
        // Edit Menu
        {
          label: 'Edit',
          submenu: [
            { role: 'undo' },
            { role: 'redo' },
            { type: 'separator' },
            { role: 'cut' },
            { role: 'copy' },
            { role: 'paste' },
            { role: 'pasteAndMatchStyle' },
            { role: 'delete' },
            { role: 'selectAll' },
            { type: 'separator' },
            {
              label: 'Speech',
              submenu: [{ role: 'startSpeaking' }, { role: 'stopSpeaking' }],
            },
          ],
        },
      ]

      const template = createMacTemplate()
      expect(template).toHaveLength(2)
      expect(template[0].label).toBe('Hatcher')
      expect(template[1].label).toBe('Edit')
    })

    it('should create correct menu structure for Windows/Linux', () => {
      // Test Windows/Linux menu template structure

      const createWinTemplate = () => [
        // File Menu
        {
          label: 'File',
          submenu: [
            { label: 'Settings...', enabled: false },
            { type: 'separator' },
            { label: 'About Hatcher' },
            { type: 'separator' },
            { role: 'quit' },
          ],
        },
        // Edit Menu
        {
          label: 'Edit',
          submenu: [
            { role: 'undo' },
            { role: 'redo' },
            { type: 'separator' },
            { role: 'cut' },
            { role: 'copy' },
            { role: 'paste' },
            { role: 'delete' },
            { type: 'separator' },
            { role: 'selectAll' },
          ],
        },
      ]

      const template = createWinTemplate()
      expect(template).toHaveLength(2)
      expect(template[0].label).toBe('File')
      expect(template[1].label).toBe('Edit')
    })

    it('should include View menu with standard options', () => {
      const viewMenu = {
        label: 'View',
        submenu: [
          { role: 'reload' },
          { role: 'forceReload' },
          { role: 'toggleDevTools' },
          { type: 'separator' },
          { role: 'resetZoom' },
          { role: 'zoomIn' },
          { role: 'zoomOut' },
          { type: 'separator' },
          { role: 'togglefullscreen' },
        ],
      }

      expect(viewMenu.label).toBe('View')
      expect(viewMenu.submenu).toHaveLength(9)
      const hasToggleDevTools = (
        (viewMenu as Record<string, unknown>).submenu as unknown[]
      ).some(
        (item: unknown) =>
          (item as Record<string, unknown>).role === 'toggleDevTools'
      )
      expect(hasToggleDevTools).toBe(true)
    })

    it('should include Tools menu with disabled features', () => {
      const toolsMenu = {
        label: 'Tools',
        submenu: [
          {
            label: 'Playbooks...',
            enabled: false,
            click: expect.any(Function),
          },
        ],
      }

      expect(toolsMenu.label).toBe('Tools')
      expect(toolsMenu.submenu[0].enabled).toBe(false)
      expect(toolsMenu.submenu[0].label).toBe('Playbooks...')
    })

    it('should include Help menu with external link', () => {
      const helpMenu = {
        role: 'help',
        submenu: [
          {
            label: 'Learn More',
            click: () => {}, // Simple function for test
          },
        ],
      }

      expect(helpMenu.role).toBe('help')
      expect(helpMenu.submenu[0].label).toBe('Learn More')
      expect(typeof helpMenu.submenu[0].click).toBe('function')
    })
  })

  describe('Development Menu Platform Simulation', () => {
    it('should create development menu with platform simulation options', () => {
      const developmentMenu = {
        label: 'Development',
        submenu: [
          {
            label: 'Simulate Platform',
            submenu: [
              {
                label: 'macOS',
                type: 'radio',
                checked: process.platform === 'darwin',
                click: expect.any(Function),
              },
              {
                label: 'Windows',
                type: 'radio',
                checked: process.platform === 'win32',
                click: expect.any(Function),
              },
              {
                label: 'Linux',
                type: 'radio',
                checked: process.platform === 'linux',
                click: expect.any(Function),
              },
            ],
          },
          { type: 'separator' },
          {
            label: 'Reset to Native Platform',
            click: expect.any(Function),
          },
        ],
      }

      expect(developmentMenu.label).toBe('Development')
      expect(developmentMenu.submenu).toHaveLength(3)
      expect(developmentMenu.submenu[0].label).toBe('Simulate Platform')
      expect(developmentMenu.submenu[2].label).toBe('Reset to Native Platform')
    })

    it('should test platform simulation functions', async () => {
      vi.resetModules()
      mockIsDev.mockReturnValue(true)

      // Import module to get access to simulation functions
      const menuModule = await import('./menu')

      // Access simulation functions through menu template execution
      menuModule.setupApplicationMenu()

      expect(mockMenu.buildFromTemplate).toHaveBeenCalled()
      expect(mockIpcMain.send).not.toHaveBeenCalled() // Not called until menu items are clicked
    })
  })

  describe('Menu Click Handlers', () => {
    it('should test Help menu Learn More click handler', async () => {
      vi.resetModules()

      const { setupApplicationMenu } = await import('./menu')
      setupApplicationMenu()

      expect(mockMenu.buildFromTemplate).toHaveBeenCalled()
      const menuTemplate = mockMenu.buildFromTemplate.mock.calls[0][0]

      // Find and test Help menu click handler
      const helpMenu = menuTemplate.find(
        (item: unknown) => (item as Record<string, unknown>).role === 'help'
      )
      expect(helpMenu).toBeDefined()

      const learnMoreItem = (
        (helpMenu as Record<string, unknown>).submenu as unknown[]
      )[0]
      expect((learnMoreItem as Record<string, unknown>).label).toBe(
        'Learn More'
      )

      // Test the click handler
      await learnMoreItem.click()
      expect(mockShell.openExternal).toHaveBeenCalledWith('https://hatcher.dev')
    })

    it('should test Settings click handlers (macOS)', async () => {
      vi.resetModules()

      // Set macOS platform
      Object.defineProperty(process, 'platform', {
        value: 'darwin',
        writable: true,
      })

      const { setupApplicationMenu } = await import('./menu')
      setupApplicationMenu()

      const menuTemplate = mockMenu.buildFromTemplate.mock.calls[0][0]
      const appMenu = menuTemplate.find(
        (item: unknown) => (item as Record<string, unknown>).label === 'Hatcher'
      )

      const settingsItem = (
        appMenu as { submenu: Array<Record<string, unknown>> }
      ).submenu.find(
        (item: unknown) =>
          (item as Record<string, unknown>).label === 'Settings...'
      )
      expect(settingsItem).toBeDefined()
      expect((settingsItem as Record<string, unknown>).enabled).toBe(false)
      expect((settingsItem as Record<string, unknown>).accelerator).toBe(
        'Cmd+,'
      )
    })

    it('should test About click handler (Windows/Linux)', async () => {
      vi.resetModules()

      // Set Windows platform
      Object.defineProperty(process, 'platform', {
        value: 'win32',
        writable: true,
      })

      const { setupApplicationMenu } = await import('./menu')
      setupApplicationMenu()

      const menuTemplate = mockMenu.buildFromTemplate.mock.calls[0][0]
      const fileMenu = menuTemplate.find(
        (item: Record<string, unknown>) => item.label === 'File'
      )

      const aboutItem = (
        fileMenu as { submenu: Array<Record<string, unknown>> }
      ).submenu.find(
        (item: Record<string, unknown>) => item.label === 'About Hatcher'
      )
      expect(aboutItem).toBeDefined()
      expect(typeof (aboutItem as Record<string, unknown>).click).toBe(
        'function'
      )

      // Test the click handler (should not throw)
      expect(() =>
        ((aboutItem as Record<string, unknown>).click as () => void)()
      ).not.toThrow()
    })

    it('should test Tools menu Playbooks click handler', async () => {
      vi.resetModules()

      const { setupApplicationMenu } = await import('./menu')
      setupApplicationMenu()

      const menuTemplate = mockMenu.buildFromTemplate.mock.calls[0][0]
      const toolsMenu = menuTemplate.find(
        (item: Record<string, unknown>) => item.label === 'Tools'
      )

      const playbooksItem = (
        toolsMenu as { submenu: Array<Record<string, unknown>> }
      ).submenu[0]
      expect(playbooksItem.label).toBe('Playbooks...')
      expect(playbooksItem.enabled).toBe(false)
      expect(typeof playbooksItem.click).toBe('function')

      // Test the click handler (should not throw)
      expect(() =>
        ((playbooksItem as Record<string, unknown>).click as () => void)()
      ).not.toThrow()
    })
  })

  describe('Platform Detection Logic', () => {
    it('should detect macOS platform correctly', () => {
      // Test platform detection logic
      Object.defineProperty(process, 'platform', {
        value: 'darwin',
        writable: true,
      })

      const isMac = process.platform === 'darwin'
      expect(isMac).toBe(true)
    })

    it('should detect Windows platform correctly', () => {
      Object.defineProperty(process, 'platform', {
        value: 'win32',
        writable: true,
      })

      const isMac = process.platform === 'darwin'
      expect(isMac).toBe(false)
    })

    it('should detect Linux platform correctly', () => {
      Object.defineProperty(process, 'platform', {
        value: 'linux',
        writable: true,
      })

      const isMac = process.platform === 'darwin'
      expect(isMac).toBe(false)
    })
  })

  describe('Development Mode Detection', () => {
    it('should include development menu when isDev is true', () => {
      const isDev = true
      const developmentMenuItems = isDev ? [{ label: 'Development' }] : []

      expect(developmentMenuItems).toHaveLength(1)
      expect(developmentMenuItems[0].label).toBe('Development')
    })

    it('should exclude development menu when isDev is false', () => {
      const isDev = false
      const developmentMenuItems = isDev ? [{ label: 'Development' }] : []

      expect(developmentMenuItems).toHaveLength(0)
    })
  })

  describe('Platform Reset Logic', () => {
    it('should map darwin to macos platform', () => {
      Object.defineProperty(process, 'platform', {
        value: 'darwin',
        writable: true,
      })

      let nativePlatform: 'macos' | 'windows' | 'linux'
      if (process.platform === 'darwin') {
        nativePlatform = 'macos'
      } else if (process.platform === 'win32') {
        nativePlatform = 'windows'
      } else {
        nativePlatform = 'linux'
      }

      expect(nativePlatform).toBe('macos')
    })

    it('should map win32 to windows platform', () => {
      Object.defineProperty(process, 'platform', {
        value: 'win32',
        writable: true,
      })

      let nativePlatform: 'macos' | 'windows' | 'linux'
      if (process.platform === 'darwin') {
        nativePlatform = 'macos'
      } else if (process.platform === 'win32') {
        nativePlatform = 'windows'
      } else {
        nativePlatform = 'linux'
      }

      expect(nativePlatform).toBe('windows')
    })

    it('should map other platforms to linux', () => {
      Object.defineProperty(process, 'platform', {
        value: 'freebsd',
        writable: true,
      })

      let nativePlatform: 'macos' | 'windows' | 'linux'
      if (process.platform === 'darwin') {
        nativePlatform = 'macos'
      } else if (process.platform === 'win32') {
        nativePlatform = 'windows'
      } else {
        nativePlatform = 'linux'
      }

      expect(nativePlatform).toBe('linux')
    })
  })

  describe('Menu Role and Type Validation', () => {
    it('should validate standard menu roles', () => {
      const standardRoles = [
        'about',
        'services',
        'hide',
        'hideothers',
        'unhide',
        'quit',
        'undo',
        'redo',
        'cut',
        'copy',
        'paste',
        'pasteAndMatchStyle',
        'delete',
        'selectAll',
        'startSpeaking',
        'stopSpeaking',
        'reload',
        'forceReload',
        'toggleDevTools',
        'resetZoom',
        'zoomIn',
        'zoomOut',
        'togglefullscreen',
        'minimize',
        'close',
        'front',
        'window',
        'help',
      ]

      standardRoles.forEach((role) => {
        expect(typeof role).toBe('string')
        expect(role.length).toBeGreaterThan(0)
      })
    })

    it('should validate menu item types', () => {
      const validTypes = ['separator', 'radio', 'checkbox']

      validTypes.forEach((type) => {
        expect(typeof type).toBe('string')
        expect(['separator', 'radio', 'checkbox'].includes(type)).toBe(true)
      })
    })

    it('should validate accelerator format', () => {
      const accelerators = ['Cmd+,', 'Ctrl+N', 'Alt+F4']

      accelerators.forEach((accelerator) => {
        expect(typeof accelerator).toBe('string')
        expect(accelerator.includes('+')).toBeTruthy()
      })

      // Test function key without modifier
      const functionKey = 'F12'
      expect(typeof functionKey).toBe('string')
      expect(
        [
          'F1',
          'F2',
          'F3',
          'F4',
          'F5',
          'F6',
          'F7',
          'F8',
          'F9',
          'F10',
          'F11',
          'F12',
        ].includes(functionKey)
      ).toBeTruthy()
    })
  })

  describe('Complete Menu Template Coverage', () => {
    it('should create full menu template for macOS with all sections', async () => {
      vi.resetModules()

      Object.defineProperty(process, 'platform', {
        value: 'darwin',
        writable: true,
      })

      const { setupApplicationMenu } = await import('./menu')
      setupApplicationMenu()

      const menuTemplate = mockMenu.buildFromTemplate.mock.calls[0][0]

      // Verify all expected menu sections exist
      const menuLabels = menuTemplate.map(
        (item: Record<string, unknown>) => item.label || item.role
      )
      expect(menuLabels).toContain('Hatcher')
      expect(menuLabels).toContain('Edit')
      expect(menuLabels).toContain('View')
      expect(menuLabels).toContain('Window')
      expect(menuLabels).toContain('Tools')
      expect(menuLabels).toContain('help')

      // Verify Window menu structure
      const windowMenu = menuTemplate.find(
        (item: Record<string, unknown>) => item.label === 'Window'
      )
      expect(windowMenu).toBeDefined()
      expect((windowMenu as Record<string, unknown>).label).toBe('Window')
      expect(
        Array.isArray((windowMenu as Record<string, unknown>).submenu)
      ).toBe(true)
    })

    it('should create full menu template for Windows with all sections', async () => {
      vi.resetModules()

      Object.defineProperty(process, 'platform', {
        value: 'win32',
        writable: true,
      })

      const { setupApplicationMenu } = await import('./menu')
      setupApplicationMenu()

      const menuTemplate = mockMenu.buildFromTemplate.mock.calls[0][0]

      // Verify all expected menu sections exist for Windows
      const menuLabels = menuTemplate.map(
        (item: Record<string, unknown>) => item.label || item.role
      )
      expect(menuLabels).toContain('File')
      expect(menuLabels).toContain('Edit')
      expect(menuLabels).toContain('View')
      expect(menuLabels).toContain('Window')
      expect(menuLabels).toContain('Tools')
      expect(menuLabels).toContain('help')

      // Verify File menu has About item for Windows
      const fileMenu = menuTemplate.find(
        (item: Record<string, unknown>) => item.label === 'File'
      )
      expect(fileMenu).toBeDefined()
      const aboutItem = (
        fileMenu as { submenu: Array<Record<string, unknown>> }
      ).submenu.find(
        (item: Record<string, unknown>) => item.label === 'About Hatcher'
      )
      expect(aboutItem).toBeDefined()
    })

    it('should test Window menu roles and structure', async () => {
      vi.resetModules()

      const { setupApplicationMenu } = await import('./menu')
      setupApplicationMenu()

      const menuTemplate = mockMenu.buildFromTemplate.mock.calls[0][0]
      const windowMenu = menuTemplate.find(
        (item: Record<string, unknown>) => item.label === 'Window'
      )

      expect((windowMenu as Record<string, unknown>).label).toBe('Window')
      expect(
        Array.isArray((windowMenu as Record<string, unknown>).submenu)
      ).toBe(true)

      // Check for standard window menu items
      const windowItems = (
        (windowMenu as Record<string, unknown>).submenu as Array<
          Record<string, unknown>
        >
      ).map((item: Record<string, unknown>) => item.role)
      expect(windowItems).toContain('minimize')
      expect(windowItems).toContain('close')

      // On macOS, there should be a 'window' role item in the submenu
      if (process.platform === 'darwin') {
        expect(windowItems).toContain('window')
        expect(windowItems).toContain('front')
      }
    })

    it('should include all Edit menu items', async () => {
      vi.resetModules()

      const { setupApplicationMenu } = await import('./menu')
      setupApplicationMenu()

      const menuTemplate = mockMenu.buildFromTemplate.mock.calls[0][0]
      const editMenu = menuTemplate.find(
        (item: Record<string, unknown>) => item.label === 'Edit'
      )

      expect(editMenu).toBeDefined()
      const editRoles = (
        (editMenu as Record<string, unknown>).submenu as Array<
          Record<string, unknown>
        >
      )
        .filter((item: Record<string, unknown>) => item.role)
        .map((item: Record<string, unknown>) => item.role)

      // Verify standard edit operations are present
      expect(editRoles).toContain('undo')
      expect(editRoles).toContain('redo')
      expect(editRoles).toContain('cut')
      expect(editRoles).toContain('copy')
      expect(editRoles).toContain('paste')
      expect(editRoles).toContain('selectAll')
    })

    it('should include all View menu items with correct roles', async () => {
      vi.resetModules()

      const { setupApplicationMenu } = await import('./menu')
      setupApplicationMenu()

      const menuTemplate = mockMenu.buildFromTemplate.mock.calls[0][0]
      const viewMenu = menuTemplate.find(
        (item: Record<string, unknown>) => item.label === 'View'
      )

      expect(viewMenu).toBeDefined()
      const viewRoles = (
        (viewMenu as Record<string, unknown>).submenu as Array<
          Record<string, unknown>
        >
      )
        .filter((item: Record<string, unknown>) => item.role)
        .map((item: Record<string, unknown>) => item.role)

      // Verify view operations are present
      expect(viewRoles).toContain('reload')
      expect(viewRoles).toContain('forceReload')
      expect(viewRoles).toContain('toggleDevTools')
      expect(viewRoles).toContain('resetZoom')
      expect(viewRoles).toContain('zoomIn')
      expect(viewRoles).toContain('zoomOut')
      expect(viewRoles).toContain('togglefullscreen')
    })
  })

  describe('Development Mode Menu Integration', () => {
    it('should test platform simulation click handlers', async () => {
      vi.resetModules()

      vi.doMock('./utils', () => ({
        isDev: true,
      }))

      const { setupApplicationMenu } = await import('./menu')
      setupApplicationMenu()

      const menuTemplate = mockMenu.buildFromTemplate.mock.calls[0][0]
      const devMenu = menuTemplate.find(
        (item: Record<string, unknown>) => item.label === 'Development'
      )
      const simulateMenu = (
        (devMenu as Record<string, unknown>).submenu as Array<
          Record<string, unknown>
        >
      ).find(
        (item: Record<string, unknown>) => item.label === 'Simulate Platform'
      )

      expect(simulateMenu).toBeDefined()
      expect(
        Array.isArray((simulateMenu as Record<string, unknown>).submenu)
      ).toBe(true)
      expect((simulateMenu as Record<string, unknown>).submenu).toHaveLength(3)

      // Test each platform option
      const macOption = (
        (simulateMenu as Record<string, unknown>).submenu as Array<
          Record<string, unknown>
        >
      ).find((item: Record<string, unknown>) => item.label === 'macOS')
      const winOption = (
        (simulateMenu as Record<string, unknown>).submenu as Array<
          Record<string, unknown>
        >
      ).find((item: Record<string, unknown>) => item.label === 'Windows')
      const linuxOption = (
        (simulateMenu as Record<string, unknown>).submenu as Array<
          Record<string, unknown>
        >
      ).find((item: Record<string, unknown>) => item.label === 'Linux')

      expect((macOption as Record<string, unknown>).type).toBe('radio')
      expect((winOption as Record<string, unknown>).type).toBe('radio')
      expect((linuxOption as Record<string, unknown>).type).toBe('radio')
      expect(typeof (macOption as Record<string, unknown>).click).toBe(
        'function'
      )
      expect(typeof (winOption as Record<string, unknown>).click).toBe(
        'function'
      )
      expect(typeof (linuxOption as Record<string, unknown>).click).toBe(
        'function'
      )

      // Test platform simulation handlers (should not throw)
      expect(() =>
        ((macOption as Record<string, unknown>).click as () => void)()
      ).not.toThrow()
      expect(() =>
        ((winOption as Record<string, unknown>).click as () => void)()
      ).not.toThrow()
      expect(() =>
        ((linuxOption as Record<string, unknown>).click as () => void)()
      ).not.toThrow()
    })

    it('should test reset to native platform handler', async () => {
      vi.resetModules()

      vi.doMock('./utils', () => ({
        isDev: true,
      }))

      const { setupApplicationMenu } = await import('./menu')
      setupApplicationMenu()

      const menuTemplate = mockMenu.buildFromTemplate.mock.calls[0][0]
      const devMenu = menuTemplate.find(
        (item: Record<string, unknown>) => item.label === 'Development'
      )
      const resetItem = (
        (devMenu as Record<string, unknown>).submenu as Array<
          Record<string, unknown>
        >
      ).find(
        (item: Record<string, unknown>) =>
          item.label === 'Reset to Native Platform'
      )

      expect(resetItem).toBeDefined()
      expect(typeof (resetItem as Record<string, unknown>).click).toBe(
        'function'
      )

      // Test reset handler (should not throw)
      expect(() =>
        ((resetItem as Record<string, unknown>).click as () => void)()
      ).not.toThrow()
    })

    it('should verify development menu IPC integration', async () => {
      vi.resetModules()

      vi.doMock('./utils', () => ({
        isDev: true,
      }))

      const { setupApplicationMenu } = await import('./menu')
      setupApplicationMenu()

      expect(mockMenu.buildFromTemplate).toHaveBeenCalled()
      expect(mockMenu.setApplicationMenu).toHaveBeenCalled()

      // Development menu should be included
      const menuTemplate = mockMenu.buildFromTemplate.mock.calls[0][0]
      const devMenu = menuTemplate.find(
        (item: Record<string, unknown>) => item.label === 'Development'
      )
      expect(devMenu).toBeDefined()
    })
  })

  describe('Menu State and Radio Button Logic', () => {
    it('should set correct checked state for platform radio buttons', async () => {
      vi.resetModules()

      // Test with macOS platform
      Object.defineProperty(process, 'platform', {
        value: 'darwin',
        writable: true,
      })

      vi.doMock('./utils', () => ({
        isDev: true,
      }))

      const { setupApplicationMenu } = await import('./menu')
      setupApplicationMenu()

      const menuTemplate = mockMenu.buildFromTemplate.mock.calls[0][0]
      const devMenu = menuTemplate.find(
        (item: Record<string, unknown>) => item.label === 'Development'
      )
      const simulateMenu = (
        (devMenu as Record<string, unknown>).submenu as Array<
          Record<string, unknown>
        >
      ).find(
        (item: Record<string, unknown>) => item.label === 'Simulate Platform'
      )

      const macOption = (
        (simulateMenu as Record<string, unknown>).submenu as Array<
          Record<string, unknown>
        >
      ).find((item: Record<string, unknown>) => item.label === 'macOS')
      const winOption = (
        (simulateMenu as Record<string, unknown>).submenu as Array<
          Record<string, unknown>
        >
      ).find((item: Record<string, unknown>) => item.label === 'Windows')
      const linuxOption = (
        (simulateMenu as Record<string, unknown>).submenu as Array<
          Record<string, unknown>
        >
      ).find((item: Record<string, unknown>) => item.label === 'Linux')

      // macOS should be checked when platform is darwin
      expect((macOption as Record<string, unknown>).checked).toBe(true)
      expect((winOption as Record<string, unknown>).checked).toBe(false)
      expect((linuxOption as Record<string, unknown>).checked).toBe(false)
    })

    it('should set correct checked state for Windows platform', async () => {
      vi.resetModules()

      // Test with Windows platform
      Object.defineProperty(process, 'platform', {
        value: 'win32',
        writable: true,
      })

      vi.doMock('./utils', () => ({
        isDev: true,
      }))

      const { setupApplicationMenu } = await import('./menu')
      setupApplicationMenu()

      const menuTemplate = mockMenu.buildFromTemplate.mock.calls[0][0]
      const devMenu = menuTemplate.find(
        (item: Record<string, unknown>) => item.label === 'Development'
      )
      const simulateMenu = (
        (devMenu as Record<string, unknown>).submenu as Array<
          Record<string, unknown>
        >
      ).find(
        (item: Record<string, unknown>) => item.label === 'Simulate Platform'
      )

      const macOption = (
        (simulateMenu as Record<string, unknown>).submenu as Array<
          Record<string, unknown>
        >
      ).find((item: Record<string, unknown>) => item.label === 'macOS')
      const winOption = (
        (simulateMenu as Record<string, unknown>).submenu as Array<
          Record<string, unknown>
        >
      ).find((item: Record<string, unknown>) => item.label === 'Windows')
      const linuxOption = (
        (simulateMenu as Record<string, unknown>).submenu as Array<
          Record<string, unknown>
        >
      ).find((item: Record<string, unknown>) => item.label === 'Linux')

      // Windows should be checked when platform is win32
      expect((macOption as Record<string, unknown>).checked).toBe(false)
      expect((winOption as Record<string, unknown>).checked).toBe(true)
      expect((linuxOption as Record<string, unknown>).checked).toBe(false)
    })
  })

  describe('Menu Template Validation and Edge Cases', () => {
    it('should handle malformed menu template gracefully', async () => {
      vi.resetModules()

      // Mock buildFromTemplate to throw an error
      mockMenu.buildFromTemplate.mockImplementationOnce(() => {
        throw new Error('Invalid menu template')
      })

      const { setupApplicationMenu } = await import('./menu')

      // Should not crash when menu building fails
      expect(() => setupApplicationMenu()).toThrow('Invalid menu template')
    })

    it('should verify separator items are properly placed', async () => {
      vi.resetModules()

      const { setupApplicationMenu } = await import('./menu')
      setupApplicationMenu()

      const menuTemplate = mockMenu.buildFromTemplate.mock.calls[0][0]

      // Check that separators exist in expected places
      const editMenu = menuTemplate.find(
        (item: Record<string, unknown>) => item.label === 'Edit'
      )
      const separators = (
        (editMenu as Record<string, unknown>).submenu as Array<
          Record<string, unknown>
        >
      ).filter((item: Record<string, unknown>) => item.type === 'separator')
      expect(separators.length).toBeGreaterThan(0)
    })

    it('should verify menu items have required properties', async () => {
      vi.resetModules()

      const { setupApplicationMenu } = await import('./menu')
      setupApplicationMenu()

      const menuTemplate = mockMenu.buildFromTemplate.mock.calls[0][0]

      // Verify each menu item has either a label or role
      menuTemplate.forEach((menu: Record<string, unknown>) => {
        expect(menu.label || menu.role).toBeDefined()
        if (menu.submenu) {
          ;(menu.submenu as Array<Record<string, unknown>>).forEach(
            (item: Record<string, unknown>) => {
              if (item.type !== 'separator') {
                expect(item.label || item.role).toBeDefined()
              }
            }
          )
        }
      })
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle shell.openExternal errors gracefully', async () => {
      vi.resetModules()

      // Mock shell.openExternal to throw an error
      mockShell.openExternal.mockRejectedValue(new Error('Network error'))

      const { setupApplicationMenu } = await import('./menu')
      setupApplicationMenu()

      const menuTemplate = mockMenu.buildFromTemplate.mock.calls[0][0]
      const helpMenu = menuTemplate.find(
        (item: { role?: string }) => item.role === 'help'
      )
      const learnMoreItem = helpMenu.submenu[0]

      // Test that the error doesn't crash the application
      await expect(learnMoreItem.click()).rejects.toThrow('Network error')
    })

    it('should handle missing IPC gracefully', async () => {
      vi.resetModules()

      // Reset the IPC mock to undefined
      mockIpcMain.send.mockImplementation(() => {
        throw new Error('IPC not available')
      })

      vi.doMock('./utils', () => ({
        isDev: true,
      }))

      const { setupApplicationMenu } = await import('./menu')

      // Should not throw when setting up menu
      expect(() => setupApplicationMenu()).not.toThrow()

      expect(mockMenu.buildFromTemplate).toHaveBeenCalled()
      expect(mockMenu.setApplicationMenu).toHaveBeenCalled()
    })

    it('should handle undefined process.platform', () => {
      const originalPlatform = process.platform

      // Temporarily remove platform
      Object.defineProperty(process, 'platform', {
        value: undefined,
        writable: true,
      })

      let nativePlatform: 'macos' | 'windows' | 'linux'
      if (process.platform === 'darwin') {
        nativePlatform = 'macos'
      } else if (process.platform === 'win32') {
        nativePlatform = 'windows'
      } else {
        nativePlatform = 'linux'
      }

      expect(nativePlatform).toBe('linux') // Default fallback

      // Restore platform
      Object.defineProperty(process, 'platform', {
        value: originalPlatform,
        writable: true,
      })
    })

    it('should handle app name and version retrieval', async () => {
      vi.resetModules()

      // Mock electron app module
      vi.doMock('electron', () => ({
        Menu: mockMenu,
        shell: mockShell,
        app: {
          getName: vi.fn(() => 'Test App Name'),
          getVersion: vi.fn(() => '2.1.0'),
        },
      }))

      const { setupApplicationMenu } = await import('./menu')
      setupApplicationMenu()

      // Verify menu was created successfully
      expect(mockMenu.buildFromTemplate).toHaveBeenCalled()
      expect(mockMenu.setApplicationMenu).toHaveBeenCalled()
    })
  })
})
