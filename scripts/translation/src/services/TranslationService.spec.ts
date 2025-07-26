import { describe, it, expect, beforeEach, vi } from 'vitest'
import { TranslationService } from '../services/TranslationService.js'
import { MarkdownProtectionService } from '../services/MarkdownProtectionService.js'
import type {
  FileTranslationContext,
  ProtectedContent,
} from '../types/index.js'

// Mock the Google Translator
vi.mock('@hatcherdx/puppeteer-google-translate', () => ({
  GoogleTranslator: vi.fn().mockImplementation(() => ({
    translateText: vi.fn().mockResolvedValue({
      success: true,
      translatedText: 'Texto traducido',
      originalText: 'Test content',
      sourceLanguage: 'en',
      targetLanguage: 'es',
      duration: 1000,
    }),
    close: vi.fn().mockResolvedValue(undefined),
  })),
}))

describe('TranslationService', () => {
  let translationService: TranslationService
  let mockProtectedContent: ProtectedContent

  beforeEach(() => {
    translationService = new TranslationService()
    mockProtectedContent = {
      content: 'Test content to translate',
      protectedElements: {
        codeBlocks: ['```js\nconsole.log("test")\n```'],
        inlineCode: ['`code`'],
        links: ['[test](https://example.com)'],
      },
      yamlTexts: ['title: Test', 'description: Test description'],
      originalContent: '# Test\nTest content to translate\n`code`',
    }
  })

  describe('translateFile', () => {
    it('should successfully translate a file', async () => {
      const context: FileTranslationContext = {
        sourceFile: 'test.md',
        targetFile: 'es/test.md',
        sourceLanguage: 'en',
        targetLanguage: 'es',
        originalContent: '# Test\nTest content',
        protectedContent: mockProtectedContent,
      }

      const result = await translationService.translateFile(context)

      expect(result.success).toBe(true)
      expect(result.translatedContent).toBeDefined()
      expect(result.context).toBe(context)
      expect(result.duration).toBeGreaterThanOrEqual(0)
      expect(result.retries).toBe(0)
    })

    it('should handle empty content', async () => {
      const context: FileTranslationContext = {
        sourceFile: 'empty.md',
        targetFile: 'es/empty.md',
        sourceLanguage: 'en',
        targetLanguage: 'es',
        originalContent: '',
        protectedContent: {
          ...mockProtectedContent,
          content: '',
          originalContent: '',
        },
      }

      const result = await translationService.translateFile(context)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Original content cannot be empty')
    })

    it('should handle invalid language codes', async () => {
      const context: FileTranslationContext = {
        sourceFile: 'test.md',
        targetFile: 'invalid/test.md',
        sourceLanguage: 'en',
        targetLanguage: 'invalid' as any,
        originalContent: '# Test',
        protectedContent: mockProtectedContent,
      }

      const result = await translationService.translateFile(context)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Invalid target language code')
    })
  })

  describe('language validation', () => {
    it('should validate supported language codes', () => {
      const validCodes = [
        'es',
        'fr',
        'de',
        'zh-cn',
        'ja',
        'ko',
        'ar',
        'pt',
        'hi',
        'id',
        'fa',
        'ru',
        'tr',
      ]

      validCodes.forEach((code) => {
        // Access private method via type assertion for testing
        const isValid = (translationService as any).isValidLanguageCode(code)
        expect(isValid).toBe(true)
      })
    })

    it('should reject invalid language codes', () => {
      const invalidCodes = ['xx', 'invalid', 'en-gb', 'zh-tw']

      invalidCodes.forEach((code) => {
        const isValid = (translationService as any).isValidLanguageCode(code)
        expect(isValid).toBe(false)
      })
    })
  })

  describe('content restoration', () => {
    it('should apply language-specific fixes', () => {
      const content = 'dx engine javascript vuejs'

      // Test Spanish fixes
      const spanishFixed = (translationService as any).applySpanishFixes(
        content
      )
      expect(spanishFixed).toContain('DX Engine')

      // Test Chinese fixes
      const chineseContent = '测试 ， 内容 。 结束'
      const chineseFixed = (translationService as any).applyChineseFixes(
        chineseContent
      )
      expect(chineseFixed).toBe('测试，内容。结束')
    })

    it('should update links for target language', () => {
      const content = 'See [documentation](/guide.md) and [API](/api)'
      const updated = (translationService as any).updateLinksForLanguage(
        content,
        'es'
      )

      expect(updated).toContain('](/es/guide.md)')
      expect(updated).toContain('](/es/api)')
    })

    it('should not update external links', () => {
      const content = '[External](https://example.com) and [anchor](#section)'
      const updated = (translationService as any).updateLinksForLanguage(
        content,
        'es'
      )

      expect(updated).toContain('https://example.com')
      expect(updated).toContain('#section')
    })
  })

  describe('technical terms preservation', () => {
    it('should preserve technical terms in translations', () => {
      const content = 'Use the api to connect to the css framework'
      const fixed = (translationService as any).applyCommonFixes(content)

      expect(fixed).toContain('API')
      expect(fixed).toContain('CSS')
    })
  })

  describe('cleanup', () => {
    it('should close translator on cleanup', async () => {
      const mockClose = vi.fn().mockResolvedValue(undefined)
      ;(translationService as any).googleTranslator.close = mockClose

      await translationService.close()

      expect(mockClose).toHaveBeenCalled()
    })
  })
})
