/**
 * @fileoverview Enhanced tests for TranslationService
 *
 * @description
 * Comprehensive test suite for the high-level translation service that orchestrates
 * markdown protection, Google translation, and content restoration. Tests cover
 * all public methods, error scenarios, and language-specific processing.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 */

import { describe, it, expect, beforeEach, vi, Mock } from 'vitest'
import { TranslationService } from '../services/TranslationService.js'
import { MarkdownProtectionService } from '../services/MarkdownProtectionService.js'
import type {
  FileTranslationContext,
  ProtectedContent,
  SupportedLanguageCode,
} from '../types/index.js'

// Interface for accessing private methods in tests
interface TranslationServicePrivateMethods {
  isValidLanguageCode: (code: string) => boolean
  applySpanishFixes: (content: string) => string
  applyChineseFixes: (content: string) => string
  applyJapaneseFixes: (content: string) => string
  applyRtlFixes: (content: string) => string
  applyLatinScriptFixes: (content: string) => string
  applyCommonFixes: (content: string) => string
  updateLinksForLanguage: (
    content: string,
    targetLanguage: string,
    sourceDir: string,
    targetDir: string
  ) => string
  applyLanguageSpecificFixes: (
    content: string,
    targetLanguage: string
  ) => string
  googleTranslator: unknown
}

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

/**
 * Enhanced Translation Service Test Suite
 *
 * @remarks
 * Comprehensive test coverage for TranslationService including:
 * - File translation with protection and restoration
 * - Error handling and validation
 * - Language-specific processing
 * - Chunking and content management
 * - Technical term preservation
 * - Link updating and content fixes
 */
describe('TranslationService', () => {
  let translationService: TranslationService
  let mockProtectedContent: ProtectedContent
  let mockGoogleTranslator: {
    translateText: Mock
    close: Mock
  }
  let mockProtectionService: {
    createChunks: Mock
    restore: Mock
  }

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks()

    // Create mock instances
    mockGoogleTranslator = {
      translateText: vi.fn(),
      close: vi.fn(),
    }

    mockProtectionService = {
      createChunks: vi.fn(),
      restore: vi.fn(),
    }

    // Setup default successful responses
    mockGoogleTranslator.translateText.mockResolvedValue({
      success: true,
      translatedText: 'Texto traducido',
      originalText: 'Test content',
      sourceLanguage: 'en',
      targetLanguage: 'es',
      duration: 1000,
    })

    mockGoogleTranslator.close.mockResolvedValue(undefined)
    mockProtectionService.createChunks.mockReturnValue([
      'Test content to translate',
    ])
    mockProtectionService.restore.mockReturnValue('# Prueba\nTexto traducido')

    translationService = new TranslationService(
      {},
      mockProtectionService as unknown as InstanceType<
        typeof MarkdownProtectionService
      >
    )
    // Access private property for testing
    ;(
      translationService as unknown as { googleTranslator: unknown }
    ).googleTranslator = mockGoogleTranslator

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

  /**
   * Tests for translateFile method
   *
   * @remarks
   * Covers successful translation, validation, and error scenarios
   */
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
      expect(mockGoogleTranslator.translateText).toHaveBeenCalledWith({
        text: 'Test content to translate',
        from: 'en',
        to: 'es',
      })
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

    it('should handle missing protected content', async () => {
      const context: FileTranslationContext = {
        sourceFile: 'test.md',
        targetFile: 'es/test.md',
        sourceLanguage: 'en',
        targetLanguage: 'es',
        originalContent: '# Test',
        protectedContent: {
          ...mockProtectedContent,
          content: '',
        },
      }

      const result = await translationService.translateFile(context)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Protected content is required')
    })

    it('should handle invalid language codes', async () => {
      const context: FileTranslationContext = {
        sourceFile: 'test.md',
        targetFile: 'invalid/test.md',
        sourceLanguage: 'en',
        targetLanguage: 'invalid' as unknown as SupportedLanguageCode,
        originalContent: '# Test',
        protectedContent: mockProtectedContent,
      }

      const result = await translationService.translateFile(context)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Invalid target language code')
    })

    it('should handle translation failures', async () => {
      mockGoogleTranslator.translateText.mockResolvedValue({
        success: false,
        error: 'Translation API error',
        originalText: 'Test content',
        sourceLanguage: 'en',
        targetLanguage: 'es',
        duration: 500,
      })

      const context: FileTranslationContext = {
        sourceFile: 'test.md',
        targetFile: 'es/test.md',
        sourceLanguage: 'en',
        targetLanguage: 'es',
        originalContent: '# Test',
        protectedContent: mockProtectedContent,
      }

      const result = await translationService.translateFile(context)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Translation API error')
    })

    it('should handle translation exceptions', async () => {
      mockGoogleTranslator.translateText.mockRejectedValue(
        new Error('Network error')
      )

      const context: FileTranslationContext = {
        sourceFile: 'test.md',
        targetFile: 'es/test.md',
        sourceLanguage: 'en',
        targetLanguage: 'es',
        originalContent: '# Test',
        protectedContent: mockProtectedContent,
      }

      const result = await translationService.translateFile(context)

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })
  })

  /**
   * Tests for chunking functionality
   *
   * @remarks
   * Covers single chunk and multi-chunk translation scenarios
   */
  describe('chunking and content management', () => {
    it('should handle single chunk translation', async () => {
      mockProtectionService.createChunks.mockReturnValue([
        'Single chunk content',
      ])

      const context: FileTranslationContext = {
        sourceFile: 'test.md',
        targetFile: 'es/test.md',
        sourceLanguage: 'en',
        targetLanguage: 'es',
        originalContent: 'Short content',
        protectedContent: mockProtectedContent,
      }

      await translationService.translateFile(context)

      expect(mockGoogleTranslator.translateText).toHaveBeenCalledTimes(1)
      expect(mockGoogleTranslator.translateText).toHaveBeenCalledWith({
        text: 'Test content to translate',
        from: 'en',
        to: 'es',
      })
    })

    it('should handle multi-chunk translation', async () => {
      const chunks = [
        'First chunk of content',
        'Second chunk of content',
        'Third chunk of content',
      ]
      mockProtectionService.createChunks.mockReturnValue(chunks)

      // Mock multiple successful translations
      mockGoogleTranslator.translateText
        .mockResolvedValueOnce({
          success: true,
          translatedText: 'Primer fragmento de contenido',
          originalText: chunks[0],
          sourceLanguage: 'en',
          targetLanguage: 'es',
          duration: 800,
        })
        .mockResolvedValueOnce({
          success: true,
          translatedText: 'Segundo fragmento de contenido',
          originalText: chunks[1],
          sourceLanguage: 'en',
          targetLanguage: 'es',
          duration: 900,
        })
        .mockResolvedValueOnce({
          success: true,
          translatedText: 'Tercer fragmento de contenido',
          originalText: chunks[2],
          sourceLanguage: 'en',
          targetLanguage: 'es',
          duration: 750,
        })

      const context: FileTranslationContext = {
        sourceFile: 'large.md',
        targetFile: 'es/large.md',
        sourceLanguage: 'en',
        targetLanguage: 'es',
        originalContent: 'Large content requiring chunking',
        protectedContent: mockProtectedContent,
      }

      const result = await translationService.translateFile(context)

      expect(result.success).toBe(true)
      expect(mockGoogleTranslator.translateText).toHaveBeenCalledTimes(3)
      expect(mockGoogleTranslator.translateText).toHaveBeenNthCalledWith(1, {
        text: chunks[0],
        from: 'en',
        to: 'es',
      })
      expect(mockGoogleTranslator.translateText).toHaveBeenNthCalledWith(2, {
        text: chunks[1],
        from: 'en',
        to: 'es',
      })
      expect(mockGoogleTranslator.translateText).toHaveBeenNthCalledWith(3, {
        text: chunks[2],
        from: 'en',
        to: 'es',
      })
    })

    it('should handle chunk translation failure', async () => {
      const chunks = ['First chunk', 'Second chunk']
      mockProtectionService.createChunks.mockReturnValue(chunks)

      mockGoogleTranslator.translateText
        .mockResolvedValueOnce({
          success: true,
          translatedText: 'Primer fragmento',
          originalText: chunks[0],
          sourceLanguage: 'en',
          targetLanguage: 'es',
          duration: 800,
        })
        .mockResolvedValueOnce({
          success: false,
          error: 'Chunk translation failed',
          originalText: chunks[1],
          sourceLanguage: 'en',
          targetLanguage: 'es',
          duration: 200,
        })

      const context: FileTranslationContext = {
        sourceFile: 'test.md',
        targetFile: 'es/test.md',
        sourceLanguage: 'en',
        targetLanguage: 'es',
        originalContent: 'Content with chunks',
        protectedContent: mockProtectedContent,
      }

      const result = await translationService.translateFile(context)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Chunk 2/2 translation failed')
    })

    it('should skip empty chunks', async () => {
      const chunks = ['Valid chunk', '', 'Another valid chunk']
      mockProtectionService.createChunks.mockReturnValue(chunks)

      mockGoogleTranslator.translateText
        .mockResolvedValueOnce({
          success: true,
          translatedText: 'Fragmento válido',
          originalText: chunks[0],
          sourceLanguage: 'en',
          targetLanguage: 'es',
          duration: 800,
        })
        .mockResolvedValueOnce({
          success: true,
          translatedText: 'Otro fragmento válido',
          originalText: chunks[2],
          sourceLanguage: 'en',
          targetLanguage: 'es',
          duration: 900,
        })

      const context: FileTranslationContext = {
        sourceFile: 'test.md',
        targetFile: 'es/test.md',
        sourceLanguage: 'en',
        targetLanguage: 'es',
        originalContent: 'Content with empty chunks',
        protectedContent: mockProtectedContent,
      }

      await translationService.translateFile(context)

      expect(mockGoogleTranslator.translateText).toHaveBeenCalledTimes(2)
    })
  })

  /**
   * Tests for language validation
   *
   * @remarks
   * Covers supported and unsupported language codes
   */
  describe('language validation', () => {
    it('should validate supported language codes', () => {
      const validCodes: SupportedLanguageCode[] = [
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
        // Test private method
        const isValid = (
          translationService as unknown as TranslationServicePrivateMethods
        ).isValidLanguageCode(code)
        expect(isValid).toBe(true)
      })
    })

    it('should reject invalid language codes', () => {
      const invalidCodes = ['xx', 'invalid', 'en-gb', 'zh-tw', 'en', 'und']

      invalidCodes.forEach((code) => {
        // Test private method
        const isValid = (
          translationService as unknown as TranslationServicePrivateMethods
        ).isValidLanguageCode(code)
        expect(isValid).toBe(false)
      })
    })
  })

  /**
   * Tests for content restoration and post-processing
   *
   * @remarks
   * Covers language-specific fixes, technical term preservation, and link updates
   */
  describe('content restoration and post-processing', () => {
    describe('language-specific fixes', () => {
      it('should apply Spanish fixes', () => {
        const content = 'dx engine javascript hatcher'
        // Test private method
        const spanishFixed = (
          translationService as unknown as TranslationServicePrivateMethods
        ).applySpanishFixes(content)

        expect(spanishFixed).toContain('DX Engine')
        expect(spanishFixed).toContain('Hatcher')
      })

      it('should apply Chinese punctuation fixes', () => {
        const content = '测试 ， 内容 。 结束 ！ 问题 ？'
        // Test private method
        const chineseFixed = (
          translationService as unknown as TranslationServicePrivateMethods
        ).applyChineseFixes(content)

        expect(chineseFixed).toBe('测试，内容。结束！问题？')
      })

      it('should apply Japanese punctuation fixes', () => {
        const content = 'テスト 。 内容 、 終了 ！'
        // Test private method
        const japaneseFixed = (
          translationService as unknown as TranslationServicePrivateMethods
        ).applyJapaneseFixes(content)

        expect(japaneseFixed).toBe('テスト。内容、終了！')
      })

      it('should apply RTL language fixes', () => {
        const content = 'محتوى للاختبار'
        // Test private method
        const rtlFixed = (
          translationService as unknown as TranslationServicePrivateMethods
        ).applyRtlFixes(content)

        // RTL fixes are currently minimal, just ensure it doesn't break
        expect(rtlFixed).toBe(content)
      })

      it('should apply Latin script fixes', () => {
        const content = 'test content'
        // Test private method
        const latinFixed = (
          translationService as unknown as TranslationServicePrivateMethods
        ).applyLatinScriptFixes(content)

        expect(latinFixed).toBe(content)
      })
    })

    describe('technical terms preservation', () => {
      it('should preserve technical terms in translations', () => {
        const content =
          'Use the api to connect to the css framework with javascript and react'
        // Test private method
        const fixed = (
          translationService as unknown as TranslationServicePrivateMethods
        ).applyCommonFixes(content)

        expect(fixed).toContain('API')
        expect(fixed).toContain('CSS')
        expect(fixed).toContain('JavaScript')
        expect(fixed).toContain('React')
      })

      it('should preserve case-insensitive technical terms', () => {
        const content = 'html and HTML, node.js and NODE.JS, vuejs and VueJS'
        // Test private method
        const fixed = (
          translationService as unknown as TranslationServicePrivateMethods
        ).applyCommonFixes(content)

        expect(fixed).toContain('HTML')
        expect(fixed).toContain('Node.js')
        expect(fixed).toContain('Vue.js')
      })

      it('should handle AI and TypeScript variations', () => {
        const content = 'ai intelligence typescript programming'
        // Test private method
        const fixed = (
          translationService as unknown as TranslationServicePrivateMethods
        ).applyCommonFixes(content)

        expect(fixed).toContain('AI')
        expect(fixed).toContain('TypeScript')
      })
    })

    describe('link updating', () => {
      it('should update markdown links for target language', () => {
        const content =
          'See [documentation](/guide.md) and [API](/api) for more info'
        // Test private method
        const updated = (
          translationService as unknown as TranslationServicePrivateMethods
        ).updateLinksForLanguage(content, 'es')

        expect(updated).toContain('](/es/guide.md)')
        expect(updated).toContain('](/es/api)')
      })

      it('should update frontmatter links', () => {
        const content = 'link: /getting-started\nother: value'
        // Test private method
        const updated = (
          translationService as unknown as TranslationServicePrivateMethods
        ).updateLinksForLanguage(content, 'fr')

        expect(updated).toContain('link: /fr/getting-started')
      })

      it('should not update external links', () => {
        const content =
          '[External](https://example.com) and [GitHub](https://github.com/user/repo)'
        // Test private method
        const updated = (
          translationService as unknown as TranslationServicePrivateMethods
        ).updateLinksForLanguage(content, 'es')

        expect(updated).toContain('https://example.com')
        expect(updated).toContain('https://github.com/user/repo')
      })

      it('should not update anchor links', () => {
        const content = '[Section](#header) and [Another](#footer)'
        // Test private method
        const updated = (
          translationService as unknown as TranslationServicePrivateMethods
        ).updateLinksForLanguage(content, 'de')

        expect(updated).toContain('#header')
        expect(updated).toContain('#footer')
      })

      it('should handle complex link patterns', () => {
        const content = `[Simple](/guide.md)
[External](https://example.com)
[Anchor](#section)
[Root](/root)
link: /frontmatter-link`
        // Test private method
        const updated = (
          translationService as unknown as TranslationServicePrivateMethods
        ).updateLinksForLanguage(content, 'ja')

        expect(updated).toContain('](/ja/guide.md)')
        expect(updated).toContain('(https://example.com)')
        expect(updated).toContain('(#section)')
        expect(updated).toContain('](/ja/root)')
        expect(updated).toContain('link: /ja/frontmatter-link')
      })
    })

    describe('YAML text extraction', () => {
      it('should extract YAML texts from translated content', () => {
        const translatedContent = `[#yaml#]
title: Título Traducido
description: Descripción traducida
[#yaml#]

# Contenido principal`

        const yamlTexts = (
          translationService as unknown as TranslationServicePrivateMethods
        ).extractTranslatedYamlTexts(translatedContent)

        expect(yamlTexts).toEqual([
          'title: Título Traducido',
          'description: Descripción traducida',
        ])
      })

      it('should handle content without YAML blocks', () => {
        const translatedContent = '# Simple content without YAML'
        const yamlTexts = (
          translationService as unknown as TranslationServicePrivateMethods
        ).extractTranslatedYamlTexts(translatedContent)

        expect(yamlTexts).toEqual([])
      })

      it('should handle empty YAML blocks', () => {
        const translatedContent = '[#yaml#]\n\n[#yaml#]\nContent'
        const yamlTexts = (
          translationService as unknown as TranslationServicePrivateMethods
        ).extractTranslatedYamlTexts(translatedContent)

        expect(yamlTexts).toEqual([])
      })
    })
  })

  /**
   * Tests for service lifecycle and configuration
   *
   * @remarks
   * Covers initialization, cleanup, and error handling in service operations
   */
  describe('service lifecycle and configuration', () => {
    it('should initialize with custom configuration', () => {
      const customConfig = {
        headless: true,
        verbose: false,
        maxRetries: 3,
        timeout: 60000,
      }

      const customService = new TranslationService(customConfig)

      // The service should be initialized without errors
      expect(customService).toBeInstanceOf(TranslationService)
    })

    it('should initialize with custom protection service', () => {
      const customProtectionService = new MarkdownProtectionService()
      const customService = new TranslationService({}, customProtectionService)

      expect(customService).toBeInstanceOf(TranslationService)
    })

    it('should close translator successfully', async () => {
      mockGoogleTranslator.close.mockResolvedValue(undefined)

      await translationService.close()

      expect(mockGoogleTranslator.close).toHaveBeenCalledTimes(1)
    })

    it('should handle translator close errors gracefully', async () => {
      const consoleWarnSpy = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => {})
      mockGoogleTranslator.close.mockRejectedValue(new Error('Close failed'))

      // Should not throw an error
      await expect(translationService.close()).resolves.toBeUndefined()

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Warning: Error closing Google Translator:',
        expect.any(Error)
      )

      consoleWarnSpy.mockRestore()
    })
  })

  /**
   * Tests for edge cases and error scenarios
   *
   * @remarks
   * Covers unusual inputs, error propagation, and resilience testing
   */
  describe('edge cases and error scenarios', () => {
    it('should handle restoration errors gracefully', async () => {
      mockProtectionService.restore.mockImplementation(() => {
        throw new Error('Restoration failed')
      })

      const context: FileTranslationContext = {
        sourceFile: 'test.md',
        targetFile: 'es/test.md',
        sourceLanguage: 'en',
        targetLanguage: 'es',
        originalContent: '# Test',
        protectedContent: mockProtectedContent,
      }

      const result = await translationService.translateFile(context)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Content restoration failed')
    })

    it('should handle very long content', async () => {
      const longContent = 'Very long content. '.repeat(1000)
      const chunks = Array(10).fill('chunk content')
      mockProtectionService.createChunks.mockReturnValue(chunks)

      // Mock successful translation for all chunks
      chunks.forEach(() => {
        mockGoogleTranslator.translateText.mockResolvedValueOnce({
          success: true,
          translatedText: 'contenido traducido',
          originalText: 'chunk content',
          sourceLanguage: 'en',
          targetLanguage: 'es',
          duration: 500,
        })
      })

      const context: FileTranslationContext = {
        sourceFile: 'large.md',
        targetFile: 'es/large.md',
        sourceLanguage: 'en',
        targetLanguage: 'es',
        originalContent: longContent,
        protectedContent: {
          ...mockProtectedContent,
          content: longContent,
          originalContent: longContent,
        },
      }

      const result = await translationService.translateFile(context)

      expect(result.success).toBe(true)
      expect(mockGoogleTranslator.translateText).toHaveBeenCalledTimes(10)
    })

    it('should handle special characters in content', () => {
      const content = 'Special chars: ñáéíóú çüß αβγ 中文 العربية'
      // Test private method
      const fixed = (
        translationService as unknown as TranslationServicePrivateMethods
      ).applyCommonFixes(content)

      // Should preserve special characters
      expect(fixed).toContain('ñáéíóú')
      expect(fixed).toContain('çüß')
      expect(fixed).toContain('αβγ')
      expect(fixed).toContain('中文')
      expect(fixed).toContain('العربية')
    })

    it('should handle mixed language detection correctly', () => {
      const supportedLanguages: SupportedLanguageCode[] = [
        'ar',
        'zh-cn',
        'es',
        'pt',
        'fr',
        'de',
        'hi',
        'id',
        'ja',
        'ko',
        'fa',
        'ru',
        'tr',
      ]

      supportedLanguages.forEach((language) => {
        const content = 'Mixed content with technical terms API CSS JavaScript'
        // Test private method
        const fixed = (
          translationService as unknown as TranslationServicePrivateMethods
        ).applyLanguageSpecificFixes(content, language)

        // Technical terms should be preserved regardless of language
        expect(fixed).toContain('API')
        expect(fixed).toContain('CSS')
        expect(fixed).toContain('JavaScript')
      })
    })

    it('should handle empty translation results', async () => {
      mockGoogleTranslator.translateText.mockResolvedValue({
        success: true,
        translatedText: '',
        originalText: 'Test content',
        sourceLanguage: 'en',
        targetLanguage: 'es',
        duration: 1000,
      })

      const context: FileTranslationContext = {
        sourceFile: 'test.md',
        targetFile: 'es/test.md',
        sourceLanguage: 'en',
        targetLanguage: 'es',
        originalContent: '# Test',
        protectedContent: mockProtectedContent,
      }

      const result = await translationService.translateFile(context)

      expect(result.success).toBe(true)
      expect(result.translatedContent).toBeDefined()
    })
  })
})
