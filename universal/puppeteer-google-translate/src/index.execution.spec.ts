import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock GoogleTranslator
const mockTranslator = {
  translateText: vi.fn(),
  close: vi.fn(),
}

const mockGoogleTranslator = vi.fn(() => mockTranslator)

vi.mock('./google-translator.js', () => ({
  GoogleTranslator: mockGoogleTranslator,
}))

describe('Index Module - Complete Coverage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should export all required modules and types', async () => {
    // Import the main module
    const indexModule = await import('./index')

    // Verify all exports are available
    expect(indexModule.GoogleTranslator).toBeDefined()
    expect(indexModule.BrowserFactory).toBeDefined()
    expect(indexModule.MockBrowserFactory).toBeDefined()
    expect(indexModule.TranslationError).toBeDefined()
    expect(indexModule.BrowserError).toBeDefined()
    expect(indexModule.ERROR_CODES).toBeDefined()
    expect(indexModule.DEFAULT_CONFIG).toBeDefined()
    expect(indexModule.translateText).toBeDefined()
  })

  it('should execute translateText convenience function successfully', async () => {
    // Mock successful translation
    mockTranslator.translateText.mockResolvedValue('Translated text')
    mockTranslator.close.mockResolvedValue(undefined)

    // Import and use the function
    const { translateText } = await import('./index')

    const result = await translateText('Hello world', 'en', 'es')

    // Verify GoogleTranslator was instantiated with correct config
    expect(mockGoogleTranslator).toHaveBeenCalledWith({
      headless: true,
      verbose: false,
    })

    // Verify translation was called
    expect(mockTranslator.translateText).toHaveBeenCalledWith(
      'Hello world',
      'en',
      'es'
    )

    // Verify cleanup
    expect(mockTranslator.close).toHaveBeenCalled()

    // Verify result
    expect(result).toBe('Translated text')
  })

  it('should execute translateText with default parameters', async () => {
    // Mock successful translation
    mockTranslator.translateText.mockResolvedValue('Default translation')
    mockTranslator.close.mockResolvedValue(undefined)

    // Import and use the function with defaults
    const { translateText } = await import('./index')

    const result = await translateText('Hello world')

    // Verify translation was called with defaults
    expect(mockTranslator.translateText).toHaveBeenCalledWith(
      'Hello world',
      'auto',
      'en'
    )

    // Verify result
    expect(result).toBe('Default translation')
  })

  it('should execute translateText with partial parameters', async () => {
    // Mock successful translation
    mockTranslator.translateText.mockResolvedValue('Partial params translation')
    mockTranslator.close.mockResolvedValue(undefined)

    // Import and use the function with partial params
    const { translateText } = await import('./index')

    const result = await translateText('Hello world', 'fr')

    // Verify translation was called with partial params (to defaults to 'en')
    expect(mockTranslator.translateText).toHaveBeenCalledWith(
      'Hello world',
      'fr',
      'en'
    )

    // Verify result
    expect(result).toBe('Partial params translation')
  })

  it('should handle translateText errors and still close translator', async () => {
    // Mock translation error
    mockTranslator.translateText.mockRejectedValue(
      new Error('Translation failed')
    )
    mockTranslator.close.mockResolvedValue(undefined)

    // Import and use the function
    const { translateText } = await import('./index')

    // Expect the function to throw
    await expect(translateText('Hello world')).rejects.toThrow(
      'Translation failed'
    )

    // Verify cleanup still happened
    expect(mockTranslator.close).toHaveBeenCalled()
  })

  it('should handle close errors in translateText', async () => {
    // Mock successful translation but close error
    mockTranslator.translateText.mockResolvedValue('Success')
    mockTranslator.close.mockRejectedValue(new Error('Close failed'))

    // Import and use the function
    const { translateText } = await import('./index')

    // Since close() is awaited in finally block without try-catch,
    // the close error should propagate and cause translateText to throw
    await expect(translateText('Hello world')).rejects.toThrow('Close failed')

    // Verify translation was successful before close error
    expect(mockTranslator.translateText).toHaveBeenCalledWith(
      'Hello world',
      'auto',
      'en'
    )

    // Verify close was attempted
    expect(mockTranslator.close).toHaveBeenCalled()
  })

  it('should test different language combinations', async () => {
    // Mock successful translations
    mockTranslator.translateText.mockResolvedValue('Translated')
    mockTranslator.close.mockResolvedValue(undefined)

    // Import the function
    const { translateText } = await import('./index')

    // Test various language combinations
    const testCases = [
      { text: 'Hello', from: 'en', to: 'es' as const },
      { text: 'Bonjour', from: 'fr', to: 'de' as const },
      { text: 'こんにちは', from: 'ja', to: 'ko' as const },
      { text: '你好', from: 'zh', to: 'ar' as const },
    ]

    for (const testCase of testCases) {
      mockTranslator.translateText.mockClear()
      mockTranslator.close.mockClear()

      await translateText(testCase.text, testCase.from, testCase.to)

      expect(mockTranslator.translateText).toHaveBeenCalledWith(
        testCase.text,
        testCase.from,
        testCase.to
      )
      expect(mockTranslator.close).toHaveBeenCalled()
    }
  })

  it('should test auto-detection from language', async () => {
    // Mock successful translation
    mockTranslator.translateText.mockResolvedValue('Auto detected')
    mockTranslator.close.mockResolvedValue(undefined)

    // Import and use the function
    const { translateText } = await import('./index')

    const result = await translateText('Text to detect', 'auto', 'fr')

    // Verify auto detection was used
    expect(mockTranslator.translateText).toHaveBeenCalledWith(
      'Text to detect',
      'auto',
      'fr'
    )
    expect(result).toBe('Auto detected')
  })

  it('should test module import structure', async () => {
    // Test that all imports work correctly
    const module = await import('./index')

    // Test that the convenience function exists and is a function
    expect(typeof module.translateText).toBe('function')

    // Test that other exports are accessible
    expect(module.GoogleTranslator).toBe(mockGoogleTranslator)
    expect(module.TranslationError).toBeDefined()
    expect(module.BrowserError).toBeDefined()
  })

  it('should test translateText with empty string', async () => {
    // Mock translation of empty string
    mockTranslator.translateText.mockResolvedValue('')
    mockTranslator.close.mockResolvedValue(undefined)

    // Import and use the function
    const { translateText } = await import('./index')

    const result = await translateText('', 'en', 'es')

    expect(mockTranslator.translateText).toHaveBeenCalledWith('', 'en', 'es')
    expect(result).toBe('')
  })
})
