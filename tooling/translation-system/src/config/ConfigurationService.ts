import { DEFAULT_CONFIG as DEFAULT_TRANSLATOR_CONFIG } from '@hatcherdx/puppeteer-google-translate'
import type { ZodIssue } from 'zod'
import { z } from 'zod'
import type {
  ConfigurationValidatorInterface,
  SupportedLanguageCode,
  TranslationJobConfig,
  ValidationError,
  ValidationResult,
  ValidationWarning,
} from '../types/index.js'
import {
  DEFAULT_PROTECTION_CONFIG,
  DEFAULT_TRANSLATION_CONFIG,
  SUPPORTED_LANGUAGES,
  TRANSLATION_ERROR_CODES,
  TranslationSystemError,
} from '../types/index.js'

/**
 * Zod schemas for configuration validation
 */
const SupportedLanguageSchema = z.enum([
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
])

const FileProcessingConfigSchema = z.object({
  sourceDir: z.string().min(1, 'Source directory is required'),
  targetDir: z.string().min(1, 'Target directory is required'),
  includePatterns: z.array(z.string()).optional(),
  excludePatterns: z.array(z.string()).optional(),
  preserveStructure: z.boolean().optional().default(true),
  overwriteExisting: z.boolean().optional().default(false),
})

const MarkdownProtectionConfigSchema = z.object({
  protectCodeBlocks: z.boolean().optional().default(true),
  protectInlineCode: z.boolean().optional().default(true),
  protectYamlFrontmatter: z.boolean().optional().default(true),
  protectHtmlTags: z.boolean().optional().default(true),
  protectLinks: z.boolean().optional().default(true),
  customPatterns: z
    .array(
      z.object({
        name: z.string(),
        pattern: z.instanceof(RegExp),
        placeholder: z.string(),
      })
    )
    .optional()
    .default([]),
})

const TranslationStrategyConfigSchema = z.object({
  maxConcurrency: z.number().min(1).optional().default(1),
  delayBetweenTranslations: z.number().min(0).optional().default(500),
  continueOnError: z.boolean().optional().default(true),
  useCache: z.boolean().optional().default(false),
})

const GoogleTranslatorConfigSchema = z.object({
  headless: z.boolean().optional().default(true),
  slowMo: z.number().min(0).optional().default(0),
  timeout: z.number().min(1000).optional().default(30000),
  maxRetries: z.number().min(1).optional().default(3),
  retryDelay: z.number().min(100).optional().default(1000),
  verbose: z.boolean().optional().default(false),
})

const TranslationJobConfigSchema = z.object({
  sourceLanguage: z.string().min(1, 'Source language is required'),
  targetLanguages: z
    .array(SupportedLanguageSchema)
    .min(1, 'At least one target language is required'),
  strategy: z
    .enum(['file-by-file', 'language-by-language'])
    .default('file-by-file'),
  fileProcessing: FileProcessingConfigSchema,
  markdownProtection: MarkdownProtectionConfigSchema.optional(),
  strategyConfig: TranslationStrategyConfigSchema.optional(),
  translatorConfig: GoogleTranslatorConfigSchema.optional(),
})

/**
 * Configuration service with validation and defaults
 */
export class ConfigurationService implements ConfigurationValidatorInterface {
  /**
   * Create a default translation job configuration
   */
  static createDefaultConfig(
    sourceDir: string,
    targetDir: string,
    targetLanguages: SupportedLanguageCode[] = ['es', 'fr', 'de']
  ): TranslationJobConfig {
    return {
      sourceLanguage: 'en',
      targetLanguages,
      strategy: 'file-by-file',
      fileProcessing: {
        sourceDir,
        targetDir,
        includePatterns: ['**/*.md'],
        excludePatterns: [
          '**/node_modules/**',
          '**/dist/**',
          '**/build/**',
          '**/.git/**',
          '**/test-*.md',
          // Exclude existing translations
          '**/ar/**',
          '**/zh-cn/**',
          '**/es/**',
          '**/pt/**',
          '**/fr/**',
          '**/de/**',
          '**/hi/**',
          '**/id/**',
          '**/ja/**',
          '**/ko/**',
          '**/fa/**',
          '**/ru/**',
          '**/tr/**',
        ],
        preserveStructure: true,
        overwriteExisting: false,
      },
      markdownProtection: DEFAULT_PROTECTION_CONFIG,
      strategyConfig: DEFAULT_TRANSLATION_CONFIG,
      translatorConfig: {
        ...DEFAULT_TRANSLATOR_CONFIG,
        verbose: false,
      },
    }
  }

  /**
   * Load configuration from file
   */
  static async loadFromFile(configPath: string): Promise<TranslationJobConfig> {
    try {
      const { default: config } = await import(configPath)
      return this.validateAndNormalize(config)
    } catch (error) {
      throw new TranslationSystemError(
        `Failed to load configuration from ${configPath}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        TRANSLATION_ERROR_CODES.INVALID_CONFIG,
        configPath,
        error
      )
    }
  }

  /**
   * Validate and normalize configuration
   */
  static validateAndNormalize(config: unknown): TranslationJobConfig {
    try {
      const validated = TranslationJobConfigSchema.parse(config)

      // Apply defaults for optional fields
      return {
        ...validated,
        fileProcessing: {
          ...validated.fileProcessing,
          includePatterns: validated.fileProcessing.includePatterns || [
            '**/*.md',
          ],
          excludePatterns: validated.fileProcessing.excludePatterns || [
            '**/node_modules/**',
            '**/dist/**',
            '**/build/**',
            '**/.git/**',
            '**/test-*.md',
            // Exclude existing translations
            '**/ar/**',
            '**/zh-cn/**',
            '**/es/**',
            '**/pt/**',
            '**/fr/**',
            '**/de/**',
            '**/hi/**',
            '**/id/**',
            '**/ja/**',
            '**/ko/**',
            '**/fa/**',
            '**/ru/**',
            '**/tr/**',
          ],
          preserveStructure: validated.fileProcessing.preserveStructure ?? true,
          overwriteExisting:
            validated.fileProcessing.overwriteExisting ?? false,
        },
        markdownProtection: {
          ...DEFAULT_PROTECTION_CONFIG,
          ...validated.markdownProtection,
        },
        strategyConfig: {
          ...DEFAULT_TRANSLATION_CONFIG,
          ...validated.strategyConfig,
        },
        translatorConfig: {
          ...DEFAULT_TRANSLATOR_CONFIG,
          ...validated.translatorConfig,
        },
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const formattedErrors = (error as z.ZodError).errors
          .map((err: ZodIssue) => `${err.path.join('.')}: ${err.message}`)
          .join(', ')

        throw new TranslationSystemError(
          `Configuration validation failed: ${formattedErrors}`,
          TRANSLATION_ERROR_CODES.INVALID_CONFIG
        )
      }

      throw new TranslationSystemError(
        `Configuration validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        TRANSLATION_ERROR_CODES.INVALID_CONFIG,
        undefined,
        error
      )
    }
  }

  /**
   * Validate translation job configuration
   */
  validateJob(config: TranslationJobConfig): ValidationResult {
    try {
      TranslationJobConfigSchema.parse(config)
      return { valid: true, errors: [], warnings: [] }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = (error as z.ZodError).errors.map((err: ZodIssue) => ({
          code: err.code,
          message: err.message,
          file: err.path.join('.'),
        }))

        return { valid: false, errors, warnings: [] }
      }

      return {
        valid: false,
        errors: [
          {
            code: 'VALIDATION_ERROR',
            message:
              error instanceof Error
                ? error.message
                : 'Unknown validation error',
          },
        ],
        warnings: [],
      }
    }
  }

  /**
   * Validate file structure exists
   */
  async validateFileStructure(sourceDir: string): Promise<ValidationResult> {
    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []

    try {
      const { promises: fs } = await import('fs')

      // Check if source directory exists
      try {
        const stats = await fs.stat(sourceDir)
        if (!stats.isDirectory()) {
          errors.push({
            code: 'NOT_DIRECTORY',
            message: `Source path is not a directory: ${sourceDir}`,
          })
        }
      } catch {
        errors.push({
          code: 'DIRECTORY_NOT_FOUND',
          message: `Source directory not found: ${sourceDir}`,
        })
        return { valid: false, errors, warnings }
      }

      // Check for markdown files
      const { glob } = await import('glob')
      const mdFiles = await glob('**/*.md', { cwd: sourceDir })

      if (mdFiles.length === 0) {
        warnings.push({
          code: 'NO_MARKDOWN_FILES',
          message: 'No markdown files found in source directory',
        })
      }

      // Check for common documentation files
      const commonFiles = ['README.md', 'index.md', 'introduction.md']
      const existingCommonFiles = mdFiles.filter((file) =>
        commonFiles.includes(file.toLowerCase())
      )

      if (existingCommonFiles.length === 0) {
        warnings.push({
          code: 'NO_COMMON_FILES',
          message:
            'No common documentation files found (README.md, index.md, etc.)',
        })
      }

      return { valid: errors.length === 0, errors, warnings }
    } catch (error) {
      errors.push({
        code: 'VALIDATION_ERROR',
        message: `File structure validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      })

      return { valid: false, errors, warnings }
    }
  }

  /**
   * Validate language codes
   */
  validateLanguageCodes(languages: string[]): ValidationResult {
    const errors = []
    const warnings = []

    const validLanguages = Object.keys(SUPPORTED_LANGUAGES)

    for (const lang of languages) {
      if (!validLanguages.includes(lang)) {
        errors.push({
          code: 'INVALID_LANGUAGE_CODE',
          message: `Unsupported language code: ${lang}. Supported languages: ${validLanguages.join(', ')}`,
        })
      }
    }

    // Check for duplicate languages
    const uniqueLanguages = new Set(languages)
    if (uniqueLanguages.size !== languages.length) {
      warnings.push({
        code: 'DUPLICATE_LANGUAGES',
        message: 'Duplicate language codes found in target languages',
      })
    }

    return { valid: errors.length === 0, errors, warnings }
  }

  /**
   * Get supported languages information
   */
  static getSupportedLanguages(): Record<SupportedLanguageCode, string> {
    return SUPPORTED_LANGUAGES
  }

  /**
   * Get default file patterns
   */
  static getDefaultPatterns(): { include: string[]; exclude: string[] } {
    return {
      include: ['**/*.md'],
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/build/**',
        '**/.git/**',
        '**/test-*.md',
        '**/*test*.md',
        '**/*.test.md',
      ],
    }
  }

  /**
   * Create configuration for common documentation structures
   */
  static createVitePressConfig(
    docsDir: string,
    targetLanguages: SupportedLanguageCode[]
  ): TranslationJobConfig {
    return this.createDefaultConfig(docsDir, docsDir, targetLanguages)
  }

  static createDocusaurusConfig(
    docsDir: string,
    targetLanguages: SupportedLanguageCode[]
  ): TranslationJobConfig {
    const baseConfig = this.createDefaultConfig(
      docsDir,
      docsDir,
      targetLanguages
    )

    // Docusaurus specific patterns
    return {
      ...baseConfig,
      fileProcessing: {
        ...baseConfig.fileProcessing,
        includePatterns: ['docs/**/*.md', 'blog/**/*.md'],
        excludePatterns: [
          '**/node_modules/**',
          '**/build/**',
          '**/.docusaurus/**',
          '**/versioned_docs/**',
          '**/versioned_sidebars/**',
          // Exclude existing translations
          '**/ar/**',
          '**/zh-cn/**',
          '**/es/**',
          '**/pt/**',
          '**/fr/**',
          '**/de/**',
          '**/hi/**',
          '**/id/**',
          '**/ja/**',
          '**/ko/**',
          '**/fa/**',
          '**/ru/**',
          '**/tr/**',
        ],
      },
    }
  }
}
