import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GoogleTranslator } from './google-translator'
import type { Browser, Page } from 'puppeteer-core'
import { TranslationError } from './types/index'

// Mock puppeteer-core
vi.mock('puppeteer-core', () => ({
  default: {},
}))

describe('GoogleTranslator - Actual Class Tests', () => {
  let mockBrowser: Browser
  let mockPage: Page
  let mockBrowserFactory: { createBrowser: ReturnType<typeof vi.fn> }

  beforeEach(() => {
    vi.clearAllMocks()

    // Create comprehensive page mock
    mockPage = {
      goto: vi.fn().mockResolvedValue(undefined),
      setUserAgent: vi.fn().mockResolvedValue(undefined),
      waitForSelector: vi.fn().mockResolvedValue({}),
      evaluate: vi.fn().mockResolvedValue('translated text'),
      on: vi.fn(),
      close: vi.fn().mockResolvedValue(undefined),
      isClosed: vi.fn(() => false),
      url: vi.fn(() => 'https://translate.google.com'),
    } as Page

    // Create comprehensive browser mock
    mockBrowser = {
      newPage: vi.fn().mockResolvedValue(mockPage),
      close: vi.fn().mockResolvedValue(undefined),
      isConnected: vi.fn(() => true),
      on: vi.fn(),
    } as Browser

    // Create browser factory mock
    mockBrowserFactory = {
      createBrowser: vi.fn().mockResolvedValue(mockBrowser),
    }
  })

  it('should create GoogleTranslator instance with default config', () => {
    const translator = new GoogleTranslator({}, mockBrowserFactory)
    expect(translator).toBeInstanceOf(GoogleTranslator)
  })

  it('should create GoogleTranslator instance with custom config', () => {
    const config = {
      timeout: 10000,
      maxRetries: 5,
      retryDelay: 2000,
      verbose: true,
    }

    const translator = new GoogleTranslator(config, mockBrowserFactory)
    expect(translator).toBeInstanceOf(GoogleTranslator)
  })

  it('should translate text with string parameters', async () => {
    const translator = new GoogleTranslator(
      { verbose: false },
      mockBrowserFactory
    )

    mockPage.evaluate.mockResolvedValue('hola mundo')

    const result = await translator.translateText('hello world', 'en', 'es')

    expect(result).toBe('hola mundo')
    expect(mockBrowserFactory.createBrowser).toHaveBeenCalled()
    expect(mockPage.goto).toHaveBeenCalledWith(
      expect.stringContaining('translate.google.com'),
      expect.any(Object)
    )
  })

  it('should translate text with request object', async () => {
    const translator = new GoogleTranslator(
      { verbose: false },
      mockBrowserFactory
    )

    mockPage.evaluate.mockResolvedValue('bonjour le monde')

    const result = await translator.translateText({
      text: 'hello world',
      from: 'en',
      to: 'fr',
    })

    expect(result.translatedText).toBe('bonjour le monde')
    expect(result.success).toBe(true)
    expect(result.duration).toBeGreaterThanOrEqual(0)
    expect(result.originalText).toBe('hello world')
    expect(result.sourceLanguage).toBe('en')
    expect(result.targetLanguage).toBe('fr')
  })

  it('should handle browser initialization failure', async () => {
    mockBrowserFactory.createBrowser.mockRejectedValue(
      new Error('Browser launch failed')
    )

    const translator = new GoogleTranslator(
      {
        maxRetries: 1,
        retryDelay: 0,
        verbose: false,
      },
      mockBrowserFactory
    )

    // String signature returns original text on failure
    const result = await translator.translateText('hello', 'en', 'es')
    expect(result).toBe('hello')
  })

  it('should handle page creation failure', async () => {
    mockBrowser.newPage.mockRejectedValue(new Error('Page creation failed'))

    const translator = new GoogleTranslator(
      {
        maxRetries: 1,
        retryDelay: 0,
        verbose: false,
      },
      mockBrowserFactory
    )

    // String signature returns original text on failure
    const result = await translator.translateText('hello', 'en', 'es')
    expect(result).toBe('hello')
  })

  it('should validate empty text input', async () => {
    const translator = new GoogleTranslator({}, mockBrowserFactory)

    await expect(translator.translateText('', 'en', 'es')).rejects.toThrow(
      TranslationError
    )
    await expect(translator.translateText('   ', 'en', 'es')).rejects.toThrow(
      TranslationError
    )
  })

  it('should validate text length limit', async () => {
    const translator = new GoogleTranslator({}, mockBrowserFactory)
    const longText = 'a'.repeat(5001)

    await expect(
      translator.translateText(longText, 'en', 'es')
    ).rejects.toThrow(TranslationError)
  })

  it('should validate language parameters', async () => {
    const translator = new GoogleTranslator({}, mockBrowserFactory)

    await expect(translator.translateText('hello', '', 'es')).rejects.toThrow(
      TranslationError
    )
    await expect(translator.translateText('hello', 'en', '')).rejects.toThrow(
      TranslationError
    )
  })

  it('should handle browser disconnection', async () => {
    const translator = new GoogleTranslator({}, mockBrowserFactory)

    // First call should work
    await translator.translateText('hello', 'en', 'es')

    // Simulate browser disconnection
    mockBrowser.isConnected.mockReturnValue(false)

    // Next call should create a new browser
    await translator.translateText('world', 'en', 'es')

    expect(mockBrowserFactory.createBrowser).toHaveBeenCalledTimes(2)
  })

  it('should handle page closed scenario', async () => {
    const translator = new GoogleTranslator({}, mockBrowserFactory)

    // First call
    await translator.translateText('hello', 'en', 'es')

    // Simulate page closed
    mockPage.isClosed.mockReturnValue(true)

    // Next call should create new page
    await translator.translateText('world', 'en', 'es')

    expect(mockBrowser.newPage).toHaveBeenCalledTimes(2)
  })

  it('should set user agent correctly', async () => {
    const translator = new GoogleTranslator({}, mockBrowserFactory)

    await translator.translateText('hello', 'en', 'es')

    expect(mockPage.setUserAgent).toHaveBeenCalledWith(
      expect.stringContaining('Chrome/120.0.0.0')
    )
  })

  it('should retry on failure', async () => {
    const translator = new GoogleTranslator(
      {
        maxRetries: 2,
        retryDelay: 0,
        verbose: false,
      },
      mockBrowserFactory
    )

    // First attempt fails, second succeeds
    mockPage.goto
      .mockRejectedValueOnce(new Error('Navigation failed'))
      .mockResolvedValueOnce(undefined)

    const result = await translator.translateText('hello', 'en', 'es')

    expect(result).toBe('translated text')
    expect(mockPage.goto).toHaveBeenCalledTimes(2)
  })

  it('should handle maximum retries exceeded', async () => {
    const translator = new GoogleTranslator(
      {
        maxRetries: 1,
        retryDelay: 0,
        verbose: false,
      },
      mockBrowserFactory
    )

    mockPage.goto.mockRejectedValue(new Error('Persistent error'))

    // Should return original text for string signature
    const result = await translator.translateText('hello', 'en', 'es')
    expect(result).toBe('hello')
  })

  it('should handle maximum retries with request object', async () => {
    const translator = new GoogleTranslator(
      {
        maxRetries: 1,
        retryDelay: 0,
        verbose: false,
      },
      mockBrowserFactory
    )

    mockPage.goto.mockRejectedValue(new Error('Persistent error'))

    const result = await translator.translateText({
      text: 'hello',
      from: 'en',
      to: 'es',
    })

    expect(result.success).toBe(false)
    expect(result.translatedText).toBe('hello')
    expect(result.error).toContain('Persistent error')
  })

  it('should handle navigation timeout', async () => {
    const translator = new GoogleTranslator(
      {
        timeout: 100,
        maxRetries: 1,
        retryDelay: 0,
        verbose: false,
      },
      mockBrowserFactory
    )

    mockPage.goto.mockRejectedValue(new Error('Navigation timeout'))

    const result = await translator.translateText('hello', 'en', 'es')
    expect(result).toBe('hello') // Should return original text on timeout
  })

  it('should handle waitForSelector timeout', async () => {
    const translator = new GoogleTranslator(
      {
        timeout: 100,
        maxRetries: 1,
        retryDelay: 0,
        verbose: false,
      },
      mockBrowserFactory
    )

    mockPage.waitForSelector.mockRejectedValue(new Error('Selector timeout'))

    const result = await translator.translateText('hello', 'en', 'es')
    expect(result).toBe('hello')
  })

  it('should handle empty translation result', async () => {
    const translator = new GoogleTranslator(
      { verbose: false },
      mockBrowserFactory
    )

    mockPage.evaluate.mockResolvedValue('')

    const result = await translator.translateText('hello', 'en', 'es')
    expect(result).toBe('hello') // Should return original text
  })

  it('should construct correct Google Translate URL', async () => {
    const translator = new GoogleTranslator({}, mockBrowserFactory)

    await translator.translateText('hello world', 'en', 'es')

    expect(mockPage.goto).toHaveBeenCalledWith(
      expect.stringMatching(
        /translate\.google\.com.*sl=en.*tl=es.*text=hello%20world/
      ),
      expect.any(Object)
    )
  })

  it('should handle auto language detection', async () => {
    const translator = new GoogleTranslator({}, mockBrowserFactory)

    await translator.translateText('hello', 'auto', 'es')

    expect(mockPage.goto).toHaveBeenCalledWith(
      expect.stringMatching(/sl=auto/),
      expect.any(Object)
    )
  })

  it('should setup page error handlers', async () => {
    const translator = new GoogleTranslator({}, mockBrowserFactory)

    await translator.translateText('hello', 'en', 'es')

    expect(mockPage.on).toHaveBeenCalledWith('error', expect.any(Function))
    expect(mockPage.on).toHaveBeenCalledWith('pageerror', expect.any(Function))
  })

  it('should setup browser disconnection handler', async () => {
    const translator = new GoogleTranslator({}, mockBrowserFactory)

    await translator.translateText('hello', 'en', 'es')

    expect(mockBrowser.on).toHaveBeenCalledWith(
      'disconnected',
      expect.any(Function)
    )
  })

  it('should trigger browser disconnection handler', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    const translator = new GoogleTranslator(
      { verbose: true },
      mockBrowserFactory
    )

    // Initialize to create browser with disconnection handler
    await translator.translateText('hello', 'en', 'es')

    // Get the disconnection handler that was registered
    const disconnectedCalls = mockBrowser.on.mock.calls.filter(
      (call) => call[0] === 'disconnected'
    )
    expect(disconnectedCalls).toHaveLength(1)

    // Trigger the disconnection handler
    const disconnectionHandler = disconnectedCalls[0][1]
    disconnectionHandler()

    expect(consoleSpy).toHaveBeenCalledWith(
      '[GoogleTranslator] Browser disconnected'
    )

    consoleSpy.mockRestore()
  })

  it('should handle verbose logging', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    const translator = new GoogleTranslator(
      { verbose: true },
      mockBrowserFactory
    )

    await translator.translateText('hello', 'en', 'es')

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[GoogleTranslator]')
    )

    consoleSpy.mockRestore()
  })

  it('should close browser and page resources', async () => {
    const translator = new GoogleTranslator({}, mockBrowserFactory)

    // Initialize by translating
    await translator.translateText('hello', 'en', 'es')

    // Close resources
    await translator.close()

    expect(mockPage.close).toHaveBeenCalled()
    expect(mockBrowser.close).toHaveBeenCalled()
  })

  it('should handle close when no browser exists', async () => {
    const translator = new GoogleTranslator({}, mockBrowserFactory)

    // Close without initializing - should not throw
    await expect(translator.close()).resolves.not.toThrow()
  })

  it('should handle close errors gracefully', async () => {
    const translator = new GoogleTranslator(
      { verbose: false },
      mockBrowserFactory
    )

    await translator.translateText('hello', 'en', 'es')

    mockPage.close.mockRejectedValue(new Error('Close failed'))
    mockBrowser.close.mockRejectedValue(new Error('Browser close failed'))

    await expect(translator.close()).resolves.not.toThrow()
  })

  it('should handle concurrent browser initialization', async () => {
    const translator = new GoogleTranslator({}, mockBrowserFactory)

    // Start multiple translations concurrently
    const promises = [
      translator.translateText('hello', 'en', 'es'),
      translator.translateText('world', 'en', 'fr'),
      translator.translateText('test', 'en', 'de'),
    ]

    await Promise.all(promises)

    // Should only create one browser instance
    expect(mockBrowserFactory.createBrowser).toHaveBeenCalledTimes(1)
  })

  it('should handle page evaluation errors', async () => {
    const translator = new GoogleTranslator(
      { verbose: false },
      mockBrowserFactory
    )

    mockPage.evaluate.mockRejectedValue(new Error('Evaluation failed'))

    const result = await translator.translateText('hello', 'en', 'es')
    expect(result).toBe('hello')
  })

  it('should handle text encoding in URL', async () => {
    const translator = new GoogleTranslator({}, mockBrowserFactory)

    const textWithSpecialChars = 'hello & goodbye'
    await translator.translateText(textWithSpecialChars, 'en', 'es')

    expect(mockPage.goto).toHaveBeenCalledWith(
      expect.stringContaining('hello%20%26%20goodbye'),
      expect.any(Object)
    )
  })

  it('should trigger page error handlers', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    const translator = new GoogleTranslator(
      { verbose: true },
      mockBrowserFactory
    )

    // Initialize to create page with error handlers
    await translator.translateText('hello', 'en', 'es')

    // Get the error handler that was registered
    const errorCalls = mockPage.on.mock.calls.filter(
      (call) => call[0] === 'error'
    )
    const pageErrorCalls = mockPage.on.mock.calls.filter(
      (call) => call[0] === 'pageerror'
    )

    expect(errorCalls).toHaveLength(1)
    expect(pageErrorCalls).toHaveLength(1)

    // Trigger the error handlers
    const errorHandler = errorCalls[0][1]
    const pageErrorHandler = pageErrorCalls[0][1]

    errorHandler(new Error('Page error test'))
    pageErrorHandler(new Error('Page error test'))

    expect(consoleSpy).toHaveBeenCalledWith(
      '[GoogleTranslator] Page error: Page error test'
    )

    consoleSpy.mockRestore()
  })

  it('should handle complex page evaluation', async () => {
    const translator = new GoogleTranslator({}, mockBrowserFactory)

    // Mock page.evaluate to return filtered and joined text
    mockPage.evaluate.mockResolvedValue('translated text content')

    const result = await translator.translateText('hello', 'en', 'es')

    expect(mockPage.evaluate).toHaveBeenCalledWith(expect.any(Function))
    expect(result).toBe('translated text content')
  })

  it('should execute page evaluation function directly to cover lines 213-218', async () => {
    const translator = new GoogleTranslator({}, mockBrowserFactory)

    // Mock page.evaluate to actually execute and return the function result
    mockPage.evaluate.mockImplementation((fn: () => string) => {
      // Simulate the DOM environment inside page.evaluate
      const mockElements = [
        { textContent: 'translated ' },
        { textContent: 'text ' },
        { textContent: null }, // This should be filtered out
        { textContent: '' }, // This should be filtered out
        { textContent: '  ' }, // This should be filtered out (whitespace only)
        { textContent: 'content' },
      ]

      // Mock document.querySelectorAll
      const mockDocument = {
        querySelectorAll: () => mockElements,
      }

      // Execute the function with mocked document
      const originalDocument = global.document
      try {
        global.document = mockDocument as any
        return Promise.resolve(fn())
      } finally {
        global.document = originalDocument
      }
    })

    const result = await translator.translateText('hello world', 'en', 'es')

    expect(result).toBe('translated text content')
    expect(mockPage.evaluate).toHaveBeenCalledWith(expect.any(Function))
  })

  it('should handle empty spans in translation result', async () => {
    const translator = new GoogleTranslator(
      { verbose: false },
      mockBrowserFactory
    )

    // Mock page.evaluate to return empty result (simulating no translation found)
    mockPage.evaluate.mockResolvedValue('')

    const result = await translator.translateText({
      text: 'hello',
      from: 'en',
      to: 'es',
    })

    expect(result.success).toBe(false)
    expect(result.translatedText).toBe('hello')
    expect(result.error).toContain('No translation found')
  })
})
