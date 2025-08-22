import {
  GoogleTranslator,
  type GoogleTranslatorConfig,
  type TranslationResult,
} from '@hatcherdx/puppeteer-google-translate'
import type {
  TranslationServiceInterface,
  FileTranslationContext,
  FileTranslationResult,
  SupportedLanguageCode,
} from '../types/index.js'
import {
  TranslationSystemError,
  TRANSLATION_ERROR_CODES,
  LANGUAGE_CODE_MAPPING,
} from '../types/index.js'
import { MarkdownProtectionService } from './MarkdownProtectionService.js'

/**
 * High-level translation service that orchestrates markdown protection,
 * Google translation, and content restoration.
 *
 * @remarks
 * This service provides the main translation pipeline, coordinating between
 * markdown protection, Google translation API, and content restoration with
 * language-specific post-processing. Includes automatic chunking for large
 * content, technical term preservation, and link localization.
 *
 * @example
 * ```typescript
 * const service = new TranslationService({
 *   headless: false,
 *   timeout: 120000,
 *   maxRetries: 5
 * });
 *
 * const context = {
 *   sourceFile: 'guide.md',
 *   targetFile: 'es/guide.md',
 *   sourceLanguage: 'en',
 *   targetLanguage: 'es',
 *   originalContent: '# Guide\nContent...',
 *   protectedContent: {...}
 * };
 *
 * const result = await service.translateFile(context);
 * if (result.success) {
 *   console.log('Translation completed:', result.translatedContent);
 * }
 * ```
 *
 * @public
 * @since 1.0.0
 */
export class TranslationService implements TranslationServiceInterface {
  private readonly googleTranslator: GoogleTranslator
  private readonly protectionService: MarkdownProtectionService

  /**
   * Creates a new TranslationService instance with specified configuration.
   *
   * @remarks
   * Initializes Google Translator with bot-detection avoidance settings
   * and sets up markdown protection service. Default configuration is
   * optimized for reliability over speed.
   *
   * @param config - Google Translator configuration options
   * @param protectionService - Optional custom protection service instance
   *
   * @example
   * ```typescript
   * // Use default configuration
   * const service = new TranslationService();
   *
   * // Custom configuration
   * const service = new TranslationService({
   *   headless: true,
   *   timeout: 60000,
   *   maxRetries: 3
   * });
   * ```
   *
   * @public
   * @since 1.0.0
   */
  constructor(
    config: GoogleTranslatorConfig = {},
    protectionService?: MarkdownProtectionService
  ) {
    this.googleTranslator = new GoogleTranslator({
      headless: false, // Show browser to avoid bot detection
      verbose: true, // Enable verbose for debugging
      maxRetries: 5, // More retries
      retryDelay: 2000, // Longer delay between retries
      timeout: 120000, // 2 minutes timeout instead of 30 seconds
      ...config,
    })

    this.protectionService =
      protectionService || new MarkdownProtectionService()
  }

  /**
   * Translates a single file through the complete protection and restoration pipeline.
   *
   * @remarks
   * Executes the full translation workflow: context validation, content translation
   * with automatic chunking if needed, content restoration with protected elements,
   * and language-specific post-processing including technical term preservation
   * and link localization.
   *
   * @param context - Complete translation context with source content and metadata
   * @returns Promise resolving to translation result with success status and content
   *
   * @throws {@link TranslationSystemError}
   * Thrown for validation failures, translation errors, or restoration problems
   *
   * @example
   * ```typescript
   * const context = {
   *   sourceFile: 'api.md',
   *   targetFile: 'es/api.md',
   *   sourceLanguage: 'en',
   *   targetLanguage: 'es',
   *   originalContent: '# API Reference\n## Overview\nThe API...',
   *   protectedContent: {
   *     content: 'API Reference Overview The API...',
   *     protectedElements: { codeBlocks: [], inlineCode: [], links: [] },
   *     yamlTexts: ['title: API Reference'],
   *     originalContent: '# API Reference...'
   *   }
   * };
   *
   * const result = await service.translateFile(context);
   * if (result.success) {
   *   console.log(`Translated in ${result.duration}ms`);
   *   console.log('Content:', result.translatedContent);
   * } else {
   *   console.error('Translation failed:', result.error);
   * }
   * ```
   *
   * @public
   * @since 1.0.0
   */
  async translateFile(
    context: FileTranslationContext
  ): Promise<FileTranslationResult> {
    const startTime = Date.now()
    const retries = 0

    try {
      // Step 1: Validate context
      this.validateContext(context)

      // Step 2: Translate the protected content
      const translationResult = await this.performTranslation(context)

      if (!translationResult.success) {
        throw new TranslationSystemError(
          translationResult.error || 'Translation failed',
          TRANSLATION_ERROR_CODES.TRANSLATION_FAILED,
          context.sourceFile
        )
      }

      // Step 3: Process translated content and restore protected elements
      const restoredContent = this.restoreContent(
        context.protectedContent,
        translationResult.translatedText!,
        context.targetLanguage
      )

      const duration = Date.now() - startTime

      return {
        context,
        success: true,
        translatedContent: restoredContent,
        duration,
        retries,
      }
    } catch (error) {
      const duration = Date.now() - startTime

      return {
        context,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration,
        retries,
      }
    }
  }

  /**
   * Closes the translation service and cleans up all resources.
   *
   * @remarks
   * Properly shuts down the Google Translator instance and releases browser
   * resources. Should be called when the service is no longer needed to
   * prevent resource leaks.
   *
   * @returns Promise that resolves when cleanup is complete
   *
   * @example
   * ```typescript
   * const service = new TranslationService();
   * try {
   *   // Use service for translations...
   *   await service.translateFile(context);
   * } finally {
   *   // Always clean up
   *   await service.close();
   * }
   * ```
   *
   * @public
   * @since 1.0.0
   */
  async close(): Promise<void> {
    try {
      await this.googleTranslator.close()
    } catch (error) {
      console.warn('Warning: Error closing Google Translator:', error)
    }
  }

  /**
   * Validate translation context
   */
  private validateContext(context: FileTranslationContext): void {
    if (!context.originalContent || context.originalContent.trim() === '') {
      throw new TranslationSystemError(
        'Original content cannot be empty',
        TRANSLATION_ERROR_CODES.INVALID_MARKDOWN,
        context.sourceFile
      )
    }

    if (!context.protectedContent.content) {
      throw new TranslationSystemError(
        'Protected content is required',
        TRANSLATION_ERROR_CODES.PROTECTION_FAILED,
        context.sourceFile
      )
    }

    if (!this.isValidLanguageCode(context.targetLanguage)) {
      throw new TranslationSystemError(
        `Invalid target language code: ${context.targetLanguage}`,
        TRANSLATION_ERROR_CODES.UNSUPPORTED_LANGUAGE,
        context.sourceFile
      )
    }
  }

  /**
   * Perform the actual translation using Google Translator with automatic chunking
   */
  private async performTranslation(
    context: FileTranslationContext
  ): Promise<TranslationResult> {
    try {
      const content = context.protectedContent.content

      // Check if we need to chunk the content
      const chunks = this.protectionService.createChunks(content)

      if (chunks.length === 1) {
        // Single chunk - translate directly
        return await this.googleTranslator.translateText({
          text: content,
          from: context.sourceLanguage,
          to: LANGUAGE_CODE_MAPPING[context.targetLanguage],
        })
      } else {
        // Multiple chunks - translate each and combine
        const translatedChunks: string[] = []
        let totalDuration = 0

        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i]
          if (!chunk) continue

          const chunkResult = await this.googleTranslator.translateText({
            text: chunk,
            from: context.sourceLanguage,
            to: LANGUAGE_CODE_MAPPING[context.targetLanguage],
          })

          if (!chunkResult.success) {
            throw new Error(
              `Chunk ${i + 1}/${chunks.length} translation failed: ${chunkResult.error}`
            )
          }

          translatedChunks.push(chunkResult.translatedText || '')
          totalDuration += chunkResult.duration

          // Small delay between chunks only if many chunks
          if (i < chunks.length - 1 && chunks.length > 3) {
            await new Promise((resolve) => setTimeout(resolve, 100))
          }
        }

        // Combine translated chunks
        const combinedTranslation = translatedChunks.join('\n')

        return {
          success: true,
          translatedText: combinedTranslation,
          originalText: content,
          sourceLanguage: context.sourceLanguage,
          targetLanguage: LANGUAGE_CODE_MAPPING[context.targetLanguage],
          duration: totalDuration,
        }
      }
    } catch (error) {
      throw new TranslationSystemError(
        `Google Translation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        TRANSLATION_ERROR_CODES.TRANSLATION_FAILED,
        context.sourceFile,
        error
      )
    }
  }

  /**
   * Restore protected content and apply post-translation fixes
   */
  private restoreContent(
    protectedContent: import('../types/index.js').ProtectedContent,
    translatedText: string,
    targetLanguage: SupportedLanguageCode
  ): string {
    try {
      // Create a temporary protected content structure with translated text
      const translatedProtectedContent = {
        ...protectedContent,
        content: translatedText,
      }

      // Extract translated YAML texts if present
      const translatedYamlTexts =
        this.extractTranslatedYamlTexts(translatedText)

      // Restore protected elements
      let restoredContent = this.protectionService.restore(
        translatedProtectedContent,
        translatedYamlTexts
      )

      // Apply language-specific post-processing
      restoredContent = this.applyLanguageSpecificFixes(
        restoredContent,
        targetLanguage
      )

      // Update internal links for language
      restoredContent = this.updateLinksForLanguage(
        restoredContent,
        targetLanguage
      )

      return restoredContent
    } catch (error) {
      throw new TranslationSystemError(
        `Content restoration failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        TRANSLATION_ERROR_CODES.RESTORATION_FAILED,
        undefined,
        error
      )
    }
  }

  /**
   * Extract translated YAML texts from the translated content
   */
  private extractTranslatedYamlTexts(translatedContent: string): string[] {
    const yamlBlockMatch = translatedContent.match(
      /\[#yaml#\]\n([\s\S]*?)\n\[#yaml#\]/
    )
    if (yamlBlockMatch && yamlBlockMatch[1]) {
      return yamlBlockMatch[1].split('\n').filter((line) => line.trim())
    }
    return []
  }

  /**
   * Apply language-specific fixes and optimizations
   */
  private applyLanguageSpecificFixes(
    content: string,
    language: SupportedLanguageCode
  ): string {
    let fixed = content

    // Common fixes for all languages
    fixed = this.applyCommonFixes(fixed)

    // Language-specific fixes
    switch (language) {
      case 'ar':
      case 'fa':
        // RTL language fixes
        fixed = this.applyRtlFixes(fixed)
        break

      case 'zh-cn':
        // Chinese-specific fixes
        fixed = this.applyChineseFixes(fixed)
        break

      case 'ja':
        // Japanese-specific fixes
        fixed = this.applyJapaneseFixes(fixed)
        break

      case 'es':
        // Spanish-specific fixes
        fixed = this.applySpanishFixes(fixed)
        break

      default:
        // Apply general Latin script fixes
        fixed = this.applyLatinScriptFixes(fixed)
    }

    return fixed
  }

  /**
   * Apply common fixes for all languages
   */
  private applyCommonFixes(content: string): string {
    let fixed = content

    // Fix technical terms that should remain in English
    const technicalTerms = [
      { term: 'AI', pattern: /\b(ai|IA|ia)\b/gi },
      { term: 'API', pattern: /\b(api)\b/gi },
      { term: 'CSS', pattern: /\b(css)\b/gi },
      { term: 'HTML', pattern: /\b(html)\b/gi },
      { term: 'JavaScript', pattern: /\b(javascript|Javascript)\b/gi },
      { term: 'TypeScript', pattern: /\b(typescript|Typescript)\b/gi },
      { term: 'Vue.js', pattern: /\b(vue\.js|vuejs)\b/gi },
      { term: 'React', pattern: /\b(react)\b/gi },
      { term: 'Node.js', pattern: /\b(node\.js|nodejs)\b/gi },
    ]

    technicalTerms.forEach(({ term, pattern }) => {
      fixed = fixed.replace(pattern, term)
    })

    return fixed
  }

  /**
   * Apply RTL language fixes
   */
  private applyRtlFixes(content: string): string {
    // Add RTL-specific markdown fixes
    // This could include proper handling of mixed LTR/RTL content
    return content
  }

  /**
   * Apply Chinese language fixes
   */
  private applyChineseFixes(content: string): string {
    let fixed = content

    // Fix spacing around Chinese punctuation
    fixed = fixed.replace(/\s+([，。！？；：])/g, '$1')
    fixed = fixed.replace(/([，。！？；：])\s+/g, '$1')

    return fixed
  }

  /**
   * Apply Japanese language fixes
   */
  private applyJapaneseFixes(content: string): string {
    let fixed = content

    // Fix spacing around Japanese punctuation
    fixed = fixed.replace(/\s+([。、！？])/g, '$1')
    fixed = fixed.replace(/([。、！？])\s+/g, '$1')

    return fixed
  }

  /**
   * Apply Spanish language fixes
   */
  private applySpanishFixes(content: string): string {
    let fixed = content

    // Fix capitalization in Spanish
    fixed = fixed.replace(/\bdx engine\b/gi, 'DX Engine')
    fixed = fixed.replace(/\bhatcher\b/gi, 'Hatcher')

    return fixed
  }

  /**
   * Apply Latin script fixes
   */
  private applyLatinScriptFixes(content: string): string {
    // General fixes for Latin-script languages
    return content
  }

  /**
   * Update internal links to include language prefix
   */
  private updateLinksForLanguage(
    content: string,
    language: SupportedLanguageCode
  ): string {
    // Update frontmatter links
    let updated = content.replace(
      /^(\s*link:\s*)\/([^/\s)]+)/gm,
      `$1/${language}/$2`
    )

    // Update markdown links to internal pages
    updated = updated.replace(/\]\(\/([^/\s)]+\.md)\)/g, `](/${language}/$1)`)

    // Update markdown links to internal sections
    updated = updated.replace(/\]\(\/([^/\s)]+)\)/g, (match, path) => {
      // Don't update external links or anchors
      if (path.startsWith('http') || path.startsWith('#')) {
        return match
      }
      return `](/${language}/${path})`
    })

    return updated
  }

  /**
   * Validate language code
   */
  private isValidLanguageCode(code: string): code is SupportedLanguageCode {
    const validCodes = [
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
    return validCodes.includes(code)
  }
}
