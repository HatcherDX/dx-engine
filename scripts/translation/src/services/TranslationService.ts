import {
  GoogleTranslator,
  type GoogleTranslatorConfig,
  type TranslationResult,
} from '@hatcherdx/puppeteer-google-translate'
import type {
  ITranslationService,
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
 * Google translation, and content restoration
 */
export class TranslationService implements ITranslationService {
  private readonly googleTranslator: GoogleTranslator
  private readonly protectionService: MarkdownProtectionService

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
   * Translate a single file with full protection and restoration pipeline
   */
  async translateFile(
    context: FileTranslationContext
  ): Promise<FileTranslationResult> {
    const startTime = Date.now()
    let retries = 0

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
   * Close the translation service and clean up resources
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
      /^(\s*link:\s*)\/([^\/\s)]+)/gm,
      `$1/${language}/$2`
    )

    // Update markdown links to internal pages
    updated = updated.replace(/\]\(\/([^\/\s)]+\.md)\)/g, `](/${language}/$1)`)

    // Update markdown links to internal sections
    updated = updated.replace(/\]\(\/([^\/\s)]+)\)/g, (match, path) => {
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
