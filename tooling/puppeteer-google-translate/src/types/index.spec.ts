import { describe, it, expect } from 'vitest'
import { TranslationError, BrowserError } from './index'

describe('Error Classes Coverage', () => {
  it('should create TranslationError with all properties', () => {
    const originalError = new Error('Original error')
    const translationError = new TranslationError(
      'Translation failed',
      'TRANSLATION_FAILED',
      originalError
    )

    expect(translationError.message).toBe('Translation failed')
    expect(translationError.code).toBe('TRANSLATION_FAILED')
    expect(translationError.originalError).toBe(originalError)
    expect(translationError.name).toBe('TranslationError')
    expect(translationError).toBeInstanceOf(Error)
  })

  it('should create TranslationError without originalError', () => {
    const translationError = new TranslationError(
      'Translation failed',
      'TRANSLATION_FAILED'
    )

    expect(translationError.message).toBe('Translation failed')
    expect(translationError.code).toBe('TRANSLATION_FAILED')
    expect(translationError.originalError).toBeUndefined()
    expect(translationError.name).toBe('TranslationError')
  })

  it('should create BrowserError with all properties', () => {
    const originalError = new Error('Browser error')
    const browserError = new BrowserError(
      'Browser initialization failed',
      'BROWSER_INIT_FAILED',
      originalError
    )

    expect(browserError.message).toBe('Browser initialization failed')
    expect(browserError.code).toBe('BROWSER_INIT_FAILED')
    expect(browserError.originalError).toBe(originalError)
    expect(browserError.name).toBe('BrowserError')
    expect(browserError).toBeInstanceOf(Error)
  })

  it('should create BrowserError without originalError', () => {
    const browserError = new BrowserError('Browser failed', 'BROWSER_FAILED')

    expect(browserError.message).toBe('Browser failed')
    expect(browserError.code).toBe('BROWSER_FAILED')
    expect(browserError.originalError).toBeUndefined()
    expect(browserError.name).toBe('BrowserError')
  })

  it('should test error inheritance and properties', () => {
    const translationError = new TranslationError('Test', 'TEST_CODE')
    const browserError = new BrowserError('Test', 'TEST_CODE')

    // Test inheritance
    expect(translationError instanceof Error).toBe(true)
    expect(browserError instanceof Error).toBe(true)

    // Test that they can be thrown and caught
    expect(() => {
      throw translationError
    }).toThrow(TranslationError)

    expect(() => {
      throw browserError
    }).toThrow(BrowserError)
  })

  it('should test error serialization', () => {
    const translationError = new TranslationError(
      'Serialization test',
      'SERIALIZATION_TEST',
      { detail: 'test detail' }
    )

    // Test that the error can be serialized/stringified
    const errorString = translationError.toString()
    expect(errorString).toContain('TranslationError: Serialization test')

    // Test JSON serialization
    const errorJSON = JSON.stringify({
      message: translationError.message,
      code: translationError.code,
      name: translationError.name,
    })

    expect(errorJSON).toContain('Serialization test')
    expect(errorJSON).toContain('SERIALIZATION_TEST')
    expect(errorJSON).toContain('TranslationError')
  })
})
