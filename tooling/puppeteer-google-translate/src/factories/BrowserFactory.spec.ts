import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock chrome-launcher
const mockGetChromePath = vi.fn()
vi.mock('chrome-launcher', () => ({
  getChromePath: mockGetChromePath,
}))

// Mock puppeteer-core
const mockLaunch = vi.fn()
const mockBrowser = {
  on: vi.fn(),
}
vi.mock('puppeteer-core', () => ({
  default: {
    launch: mockLaunch,
  },
}))

// Mock error classes
vi.mock('../types/index.js', () => ({
  BrowserError: class BrowserError extends Error {
    constructor(
      message: string,
      public code: string,
      public cause?: unknown
    ) {
      super(message)
      this.name = 'BrowserError'
    }
  },
  ERROR_CODES: {
    BROWSER_LAUNCH_FAILED: 'BROWSER_LAUNCH_FAILED',
  },
}))

describe('BrowserFactory', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetChromePath.mockReturnValue('/path/to/chrome')
    mockLaunch.mockResolvedValue(mockBrowser)
  })

  it('should export BrowserFactory class', async () => {
    const { BrowserFactory } = await import('./BrowserFactory')

    expect(BrowserFactory).toBeDefined()
    expect(typeof BrowserFactory).toBe('function')
  })

  it('should export MockBrowserFactory class', async () => {
    const { MockBrowserFactory } = await import('./BrowserFactory')

    expect(MockBrowserFactory).toBeDefined()
    expect(typeof MockBrowserFactory).toBe('function')
  })

  it('should create BrowserFactory instance', async () => {
    const { BrowserFactory } = await import('./BrowserFactory')

    const factory = new BrowserFactory()
    expect(factory).toBeInstanceOf(BrowserFactory)
  })

  it('should implement getChromePath method', async () => {
    const { BrowserFactory } = await import('./BrowserFactory')

    const factory = new BrowserFactory()
    const chromePath = factory.getChromePath()

    expect(mockGetChromePath).toHaveBeenCalled()
    expect(chromePath).toBe('/path/to/chrome')
  })

  it('should handle getChromePath error', async () => {
    const { BrowserFactory, BrowserError } = await import('./BrowserFactory')

    mockGetChromePath.mockImplementation(() => {
      throw new Error('Chrome not found')
    })

    const factory = new BrowserFactory()

    expect(() => factory.getChromePath()).toThrow(BrowserError)
  })

  it('should create browser with default config', async () => {
    const { BrowserFactory } = await import('./BrowserFactory')

    const factory = new BrowserFactory()
    const browser = await factory.createBrowser({})

    expect(mockLaunch).toHaveBeenCalledWith({
      executablePath: '/path/to/chrome',
      headless: true,
      slowMo: 0,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
      ],
      defaultViewport: {
        width: 1280,
        height: 720,
      },
    })

    expect(browser).toBe(mockBrowser)
  })

  it('should create browser with custom config', async () => {
    const { BrowserFactory } = await import('./BrowserFactory')

    const factory = new BrowserFactory()
    const config = { headless: false, slowMo: 100, verbose: true }

    await factory.createBrowser(config)

    expect(mockLaunch).toHaveBeenCalledWith({
      executablePath: '/path/to/chrome',
      headless: false,
      slowMo: 100,
      args: expect.any(Array),
      defaultViewport: expect.any(Object),
    })
  })

  it('should setup browser event handlers', async () => {
    const { BrowserFactory } = await import('./BrowserFactory')

    const factory = new BrowserFactory()
    await factory.createBrowser({})

    expect(mockBrowser.on).toHaveBeenCalledWith(
      'disconnected',
      expect.any(Function)
    )
  })

  it('should setup browser event handlers with verbose logging', async () => {
    const { BrowserFactory } = await import('./BrowserFactory')

    const consoleWarnSpy = vi
      .spyOn(console, 'warn')
      .mockImplementation(() => {})

    const factory = new BrowserFactory()
    await factory.createBrowser({ verbose: true })

    // Get the disconnected handler and test it
    const disconnectedHandler = mockBrowser.on.mock.calls.find(
      (call) => call[0] === 'disconnected'
    )[1]
    disconnectedHandler()

    expect(consoleWarnSpy).toHaveBeenCalledWith('Browser disconnected')

    consoleWarnSpy.mockRestore()
  })

  it('should handle browser launch errors', async () => {
    const { BrowserFactory, BrowserError } = await import('./BrowserFactory')

    mockLaunch.mockRejectedValue(new Error('Launch failed'))

    const factory = new BrowserFactory()

    await expect(factory.createBrowser({})).rejects.toThrow(BrowserError)
  })

  it('should handle non-Error launch exceptions', async () => {
    const { BrowserFactory, BrowserError } = await import('./BrowserFactory')

    mockLaunch.mockRejectedValue('String error')

    const factory = new BrowserFactory()

    await expect(factory.createBrowser({})).rejects.toThrow(BrowserError)
  })

  it('should create MockBrowserFactory instance', async () => {
    const { MockBrowserFactory } = await import('./BrowserFactory')

    const mockBrowser = { mock: true } as unknown as Browser
    const factory = new MockBrowserFactory(mockBrowser)

    expect(factory).toBeInstanceOf(MockBrowserFactory)
  })

  it('should implement MockBrowserFactory getChromePath', async () => {
    const { MockBrowserFactory } = await import('./BrowserFactory')

    const mockBrowser = { mock: true } as unknown as Browser
    const factory = new MockBrowserFactory(mockBrowser)

    const chromePath = factory.getChromePath()
    expect(chromePath).toBe('/mock/chrome/path')
  })

  it('should implement MockBrowserFactory createBrowser', async () => {
    const { MockBrowserFactory } = await import('./BrowserFactory')

    const mockBrowser = { mock: true } as unknown as Browser
    const factory = new MockBrowserFactory(mockBrowser)

    const browser = await factory.createBrowser({})
    expect(browser).toBe(mockBrowser)
  })

  it('should test browser configuration object structure', async () => {
    const { BrowserFactory } = await import('./BrowserFactory')

    const factory = new BrowserFactory()

    // Test with all config options
    const fullConfig = {
      headless: false,
      slowMo: 50,
      verbose: true,
    }

    await factory.createBrowser(fullConfig)

    const launchCall = mockLaunch.mock.calls[0][0]

    expect(launchCall).toHaveProperty('executablePath')
    expect(launchCall).toHaveProperty('headless', false)
    expect(launchCall).toHaveProperty('slowMo', 50)
    expect(launchCall).toHaveProperty('args')
    expect(launchCall).toHaveProperty('defaultViewport')

    expect(Array.isArray(launchCall.args)).toBe(true)
    expect(launchCall.args.length).toBeGreaterThan(0)

    expect(launchCall.defaultViewport).toEqual({
      width: 1280,
      height: 720,
    })
  })

  it('should test browser args array content', async () => {
    const { BrowserFactory } = await import('./BrowserFactory')

    const factory = new BrowserFactory()
    await factory.createBrowser({})

    const launchCall = mockLaunch.mock.calls[0][0]
    const args = launchCall.args

    expect(args).toContain('--no-sandbox')
    expect(args).toContain('--disable-setuid-sandbox')
    expect(args).toContain('--disable-dev-shm-usage')
    expect(args).toContain('--disable-accelerated-2d-canvas')
    expect(args).toContain('--no-first-run')
    expect(args).toContain('--no-zygote')
    expect(args).toContain('--disable-gpu')
  })

  it('should test browser event handler execution', async () => {
    const { BrowserFactory } = await import('./BrowserFactory')

    const factory = new BrowserFactory()
    await factory.createBrowser({ verbose: false })

    // Get the disconnected handler
    const disconnectedCall = mockBrowser.on.mock.calls.find(
      (call) => call[0] === 'disconnected'
    )
    expect(disconnectedCall).toBeDefined()

    const handler = disconnectedCall[1]

    // Execute handler without verbose logging
    const consoleWarnSpy = vi
      .spyOn(console, 'warn')
      .mockImplementation(() => {})
    handler()

    // Should not log when verbose is false
    expect(consoleWarnSpy).not.toHaveBeenCalled()

    consoleWarnSpy.mockRestore()
  })

  it('should test error message formatting in BrowserError', async () => {
    const { BrowserFactory } = await import('./BrowserFactory')

    const testError = new Error('Custom error message')
    mockLaunch.mockRejectedValue(testError)

    const factory = new BrowserFactory()

    try {
      await factory.createBrowser({})
    } catch (error: unknown) {
      expect(error.message).toContain(
        'Failed to launch browser: Custom error message'
      )
      expect(error.code).toBe('BROWSER_LAUNCH_FAILED')
      expect(error.cause).toBe(testError)
    }
  })

  it('should test Chrome path error formatting', async () => {
    const { BrowserFactory } = await import('./BrowserFactory')

    const chromeError = new Error('Chrome installation not found')
    mockGetChromePath.mockImplementation(() => {
      throw chromeError
    })

    const factory = new BrowserFactory()

    try {
      factory.getChromePath()
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(Error)
      expect(
        (error as Error & { code?: string; cause?: unknown }).message
      ).toBe('Failed to find Chrome installation')
      expect((error as Error & { code?: string; cause?: unknown }).code).toBe(
        'BROWSER_LAUNCH_FAILED'
      )
      expect((error as Error & { code?: string; cause?: unknown }).cause).toBe(
        chromeError
      )
    }
  })
})
