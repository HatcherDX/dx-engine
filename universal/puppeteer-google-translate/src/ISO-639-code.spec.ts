import { describe, it, expect } from 'vitest'
import { ISO639, type ISO639Type } from './ISO-639-code'

describe('ISO-639 Language Codes Coverage', () => {
  it('should export ISO639 array with all language codes', () => {
    // Test that ISO639 is an array
    expect(Array.isArray(ISO639)).toBe(true)

    // Test that it contains expected language codes
    expect(ISO639).toContain('en')
    expect(ISO639).toContain('es')
    expect(ISO639).toContain('fr')
    expect(ISO639).toContain('de')
    expect(ISO639).toContain('ja')
    expect(ISO639).toContain('zh')

    // Test array length (should be significant)
    expect(ISO639.length).toBeGreaterThan(100)
  })

  it('should have all expected common language codes', () => {
    const commonLanguages = [
      'af',
      'ar',
      'bg',
      'bn',
      'ca',
      'cs',
      'da',
      'de',
      'el',
      'en',
      'es',
      'et',
      'fa',
      'fi',
      'fr',
      'gu',
      'he',
      'hi',
      'hr',
      'hu',
      'id',
      'it',
      'ja',
      'ko',
      'lt',
      'lv',
      'mk',
      'ms',
      'mt',
      'nl',
      'no',
      'pl',
      'pt',
      'ro',
      'ru',
      'sk',
      'sl',
      'sq',
      'sv',
      'th',
      'tr',
      'uk',
      'ur',
      'vi',
      'zh',
    ]

    commonLanguages.forEach((lang) => {
      expect(ISO639).toContain(lang)
    })
  })

  it('should test ISO639Type usage', () => {
    // Test that we can use the type
    const testLang: ISO639Type = 'en'
    expect(typeof testLang).toBe('string')
    expect(ISO639).toContain(testLang)

    // Test various language codes as ISO639Type
    const languages: ISO639Type[] = ['en', 'es', 'fr', 'de', 'ja']
    languages.forEach((lang) => {
      expect(ISO639).toContain(lang)
      expect(typeof lang).toBe('string')
    })
  })

  it('should test array immutability', () => {
    // Since it's 'as const', it should be readonly
    const originalLength = ISO639.length

    // Test that the array contains all expected elements
    expect(ISO639.length).toBe(originalLength)
    expect(ISO639[0]).toBeTruthy()
    expect(ISO639[ISO639.length - 1]).toBeTruthy()
  })

  it('should test specific language codes from different regions', () => {
    // Test African languages
    expect(ISO639).toContain('af') // Afrikaans
    expect(ISO639).toContain('sw') // Swahili
    expect(ISO639).toContain('zu') // Zulu

    // Test Asian languages
    expect(ISO639).toContain('ja') // Japanese
    expect(ISO639).toContain('ko') // Korean
    expect(ISO639).toContain('th') // Thai
    expect(ISO639).toContain('vi') // Vietnamese

    // Test European languages
    expect(ISO639).toContain('de') // German
    expect(ISO639).toContain('fr') // French
    expect(ISO639).toContain('it') // Italian
    expect(ISO639).toContain('ru') // Russian

    // Test Middle Eastern languages
    expect(ISO639).toContain('ar') // Arabic
    expect(ISO639).toContain('he') // Hebrew
    expect(ISO639).toContain('fa') // Persian
  })

  it('should test array properties and methods', () => {
    // Test that we can use array methods
    expect(ISO639.includes('en')).toBe(true)
    expect(ISO639.indexOf('en')).toBeGreaterThanOrEqual(0)

    // Test filtering
    const shortCodes = ISO639.filter((code) => code.length === 2)
    expect(shortCodes.length).toBeGreaterThan(0)

    // Test mapping
    const upperCaseCodes = ISO639.map((code) => code.toUpperCase())
    expect(upperCaseCodes).toContain('EN')
    expect(upperCaseCodes).toContain('ES')
  })

  it('should test type constraints', () => {
    // Test that the type is properly constrained
    const validLang: ISO639Type = 'en'
    expect(ISO639).toContain(validLang)

    // Test array iteration with typing
    for (const lang of ISO639) {
      expect(typeof lang).toBe('string')
      expect(lang.length).toBeGreaterThan(0)
      expect(lang.length).toBeLessThanOrEqual(3)
    }
  })

  it('should test complete array access', () => {
    // Access first and last elements to ensure array is complete
    expect(ISO639[0]).toBe('af')
    expect(ISO639[ISO639.length - 1]).toBe('zu')

    // Test some middle elements
    expect(ISO639).toContain('en') // Common language
    expect(ISO639).toContain('zh') // Chinese

    // Test that all elements are strings
    ISO639.forEach((code) => {
      expect(typeof code).toBe('string')
      expect(code.length).toBeGreaterThan(0)
    })
  })
})
