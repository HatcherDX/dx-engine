import type {
  ISO639Type,
  GoogleTranslatorConfig,
} from '@hatcherdx/puppeteer-google-translate'

/**
 * Supported languages for documentation translation
 */
export const SUPPORTED_LANGUAGES = {
  ar: 'العربية', // Arabic
  'zh-cn': '简体中文', // Chinese Simplified
  es: 'Español', // Spanish
  pt: 'Português', // Portuguese
  fr: 'Français', // French
  de: 'Deutsch', // German
  hi: 'हिन्दी', // Hindi
  id: 'Bahasa Indonesia', // Indonesian
  ja: '日本語', // Japanese
  ko: '한국어', // Korean
  fa: 'فارسی', // Persian
  ru: 'Русский', // Russian
  tr: 'Türkçe', // Turkish
} as const

/**
 * Language code mapping from our codes to Google Translate ISO639 codes
 */
export const LANGUAGE_CODE_MAPPING: Record<SupportedLanguageCode, ISO639Type> =
  {
    ar: 'ar',
    'zh-cn': 'zh', // Map zh-cn to zh for Google Translate
    es: 'es',
    pt: 'pt',
    fr: 'fr',
    de: 'de',
    hi: 'hi',
    id: 'id',
    ja: 'ja',
    ko: 'ko',
    fa: 'fa',
    ru: 'ru',
    tr: 'tr',
  } as const

export type SupportedLanguageCode = keyof typeof SUPPORTED_LANGUAGES

/**
 * Translation strategy configuration
 */
export interface TranslationStrategyConfig {
  /** Maximum number of concurrent translations */
  readonly maxConcurrency?: number
  /** Delay between translations (milliseconds) */
  readonly delayBetweenTranslations?: number
  /** Whether to continue on individual translation failures */
  readonly continueOnError?: boolean
  /** Whether to use cache for repeated translations */
  readonly useCache?: boolean
}

/**
 * Markdown protection configuration
 */
export interface MarkdownProtectionConfig {
  /** Whether to protect code blocks */
  readonly protectCodeBlocks?: boolean
  /** Whether to protect inline code */
  readonly protectInlineCode?: boolean
  /** Whether to protect YAML frontmatter */
  readonly protectYamlFrontmatter?: boolean
  /** Whether to protect HTML tags */
  readonly protectHtmlTags?: boolean
  /** Whether to protect links */
  readonly protectLinks?: boolean
  /** Custom protection patterns */
  readonly customPatterns?: ProtectionPattern[]
}

/**
 * Custom protection pattern
 */
export interface ProtectionPattern {
  /** Name of the pattern */
  readonly name: string
  /** Regex pattern to match */
  readonly pattern: RegExp
  /** Replacement placeholder prefix */
  readonly placeholder: string
}

/**
 * File processing configuration
 */
export interface FileProcessingConfig {
  /** Source directory for markdown files */
  sourceDir: string
  /** Target directory for translated files */
  targetDir: string
  /** File patterns to include */
  includePatterns?: string[]
  /** File patterns to exclude */
  excludePatterns?: string[]
  /** Whether to preserve directory structure */
  preserveStructure?: boolean
  /** Whether to overwrite existing files */
  overwriteExisting?: boolean
}

/**
 * Translation job configuration
 */
export interface TranslationJobConfig {
  /** Source language code */
  sourceLanguage: string
  /** Target languages */
  targetLanguages: SupportedLanguageCode[]
  /** Translation strategy to use */
  strategy: 'file-by-file' | 'language-by-language'
  /** File processing configuration */
  fileProcessing: FileProcessingConfig
  /** Markdown protection configuration */
  markdownProtection: MarkdownProtectionConfig
  /** Translation strategy configuration */
  strategyConfig: TranslationStrategyConfig
  /** Google Translator configuration */
  translatorConfig: GoogleTranslatorConfig
}

/**
 * Protected content structure
 */
export interface ProtectedContent {
  /** Protected content with placeholders */
  readonly content: string
  /** Protected elements by type */
  readonly protectedElements: Record<string, string[]>
  /** YAML texts extracted for translation */
  readonly yamlTexts: string[]
  /** Original content for fallback */
  readonly originalContent: string
}

/**
 * Translation context for a single file
 */
export interface FileTranslationContext {
  /** Source file path */
  readonly sourceFile: string
  /** Target file path */
  readonly targetFile: string
  /** Source language code */
  readonly sourceLanguage: string
  /** Target language code */
  readonly targetLanguage: SupportedLanguageCode
  /** Original content */
  readonly originalContent: string
  /** Protected content structure */
  readonly protectedContent: ProtectedContent
}

/**
 * Translation result for a single file
 */
export interface FileTranslationResult {
  /** File context */
  readonly context: FileTranslationContext
  /** Whether translation was successful */
  readonly success: boolean
  /** Translated content */
  readonly translatedContent?: string
  /** Error message if failed */
  readonly error?: string
  /** Duration in milliseconds */
  readonly duration: number
  /** Number of retries attempted */
  readonly retries: number
}

/**
 * Batch translation result
 */
export interface BatchTranslationResult {
  /** Overall success status */
  readonly success: boolean
  /** Individual file results */
  readonly fileResults: FileTranslationResult[]
  /** Total duration in milliseconds */
  readonly totalDuration: number
  /** Summary statistics */
  readonly stats: TranslationStats
}

/**
 * Translation statistics
 */
export interface TranslationStats {
  /** Total files processed */
  readonly totalFiles: number
  /** Successfully translated files */
  readonly successfulFiles: number
  /** Failed translations */
  readonly failedFiles: number
  /** Total languages processed */
  readonly totalLanguages: number
  /** Total translation requests made */
  readonly totalTranslations: number
  /** Average translation time per file */
  readonly averageTimePerFile: number
  /** Total characters translated */
  readonly totalCharacters: number
}

/**
 * Translation service interface
 */
export interface TranslationServiceInterface {
  translateFile(context: FileTranslationContext): Promise<FileTranslationResult>
  close(): Promise<void>
}

/**
 * Markdown protection service interface
 */
export interface MarkdownProtectionServiceInterface {
  protect(content: string, config: MarkdownProtectionConfig): ProtectedContent
  restore(protectedContent: ProtectedContent, translatedTexts: string[]): string
}

/**
 * File processing service interface
 */
export interface FileProcessingServiceInterface {
  getSourceFiles(config: FileProcessingConfig): Promise<string[]>
  ensureTargetDirectory(targetPath: string): Promise<void>
  writeTranslatedFile(result: FileTranslationResult): Promise<void>
}

/**
 * Translation strategy interface
 */
export interface TranslationStrategyInterface {
  execute(job: TranslationJobConfig): Promise<BatchTranslationResult>
}

/**
 * Progress callback function
 */
export type ProgressCallback = (progress: TranslationProgress) => void

/**
 * Translation progress information
 */
export interface TranslationProgress {
  /** Current phase of translation */
  readonly phase:
    | 'cleaning'
    | 'initialization'
    | 'protection'
    | 'translation'
    | 'restoration'
    | 'writing'
    | 'complete'
  /** Current file being processed */
  readonly currentFile?: string
  /** Current language being processed */
  readonly currentLanguage?: SupportedLanguageCode
  /** Files completed */
  readonly filesCompleted: number
  /** Total files to process */
  readonly totalFiles: number
  /** Languages completed */
  readonly languagesCompleted: number
  /** Total languages to process */
  readonly totalLanguages: number
  /** Overall progress percentage */
  readonly overallProgress: number
  /** Time elapsed in milliseconds */
  readonly timeElapsed: number
  /** Estimated time remaining in milliseconds */
  readonly estimatedTimeRemaining?: number
  /** Current operation message */
  readonly message?: string
}

/**
 * Validation result
 */
export interface ValidationResult {
  /** Whether validation passed */
  readonly valid: boolean
  /** Validation errors */
  readonly errors: ValidationError[]
  /** Validation warnings */
  readonly warnings: ValidationWarning[]
}

/**
 * Validation error
 */
export interface ValidationError {
  /** Error code */
  readonly code: string
  /** Error message */
  readonly message: string
  /** File path where error occurred */
  readonly file?: string
  /** Line number where error occurred */
  readonly line?: number
}

/**
 * Validation warning
 */
export interface ValidationWarning {
  /** Warning code */
  readonly code: string
  /** Warning message */
  readonly message: string
  /** File path where warning occurred */
  readonly file?: string
  /** Line number where warning occurred */
  readonly line?: number
}

/**
 * Configuration validation service interface
 */
export interface ConfigurationValidatorInterface {
  validateJob(config: TranslationJobConfig): ValidationResult
  validateFileStructure(sourceDir: string): Promise<ValidationResult>
  validateLanguageCodes(languages: string[]): ValidationResult
}

/**
 * Cache service interface for translation optimization
 */
export interface CacheServiceInterface {
  get(key: string): Promise<string | null>
  set(key: string, value: string, ttl?: number): Promise<void>
  clear(): Promise<void>
  getStats(): Promise<{ hits: number; misses: number; size: number }>
}

/**
 * Logging service interface
 */
export interface LoggerInterface {
  debug(message: string, meta?: Record<string, unknown>): void
  info(message: string, meta?: Record<string, unknown>): void
  warn(message: string, meta?: Record<string, unknown>): void
  error(message: string, error?: Error, meta?: Record<string, unknown>): void
}

/**
 * Default configurations
 */
export const DEFAULT_TRANSLATION_CONFIG: Required<TranslationStrategyConfig> = {
  maxConcurrency: 1,
  delayBetweenTranslations: 500,
  continueOnError: true,
  useCache: false,
} as const

export const DEFAULT_PROTECTION_CONFIG: Required<MarkdownProtectionConfig> = {
  protectCodeBlocks: true,
  protectInlineCode: true,
  protectYamlFrontmatter: true,
  protectHtmlTags: true,
  protectLinks: true,
  customPatterns: [],
} as const

/**
 * Error codes for translation system
 */
export const TRANSLATION_ERROR_CODES = {
  INVALID_CONFIG: 'INVALID_CONFIG',
  FILE_NOT_FOUND: 'FILE_NOT_FOUND',
  DIRECTORY_NOT_FOUND: 'DIRECTORY_NOT_FOUND',
  PROTECTION_FAILED: 'PROTECTION_FAILED',
  RESTORATION_FAILED: 'RESTORATION_FAILED',
  TRANSLATION_FAILED: 'TRANSLATION_FAILED',
  FILE_WRITE_FAILED: 'FILE_WRITE_FAILED',
  UNSUPPORTED_LANGUAGE: 'UNSUPPORTED_LANGUAGE',
  INVALID_MARKDOWN: 'INVALID_MARKDOWN',
} as const

export type TranslationErrorCode =
  (typeof TRANSLATION_ERROR_CODES)[keyof typeof TRANSLATION_ERROR_CODES]

/**
 * Translation system errors
 */
export class TranslationSystemError extends Error {
  constructor(
    message: string,
    public readonly code: TranslationErrorCode,
    public readonly file?: string,
    public readonly originalError?: unknown
  ) {
    super(message)
    this.name = 'TranslationSystemError'
  }
}
