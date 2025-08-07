import type { ISO639Type } from '../ISO-639-code.js'

/**
 * Configuration options for the Google Translator
 */
export interface GoogleTranslatorConfig {
  /** Whether to run browser in headless mode */
  readonly headless?: boolean
  /** Slow down operations for debugging (milliseconds) */
  readonly slowMo?: number
  /** Timeout for page operations (milliseconds) */
  readonly timeout?: number
  /** Maximum number of retries for failed translations */
  readonly maxRetries?: number
  /** Delay between retries (milliseconds) */
  readonly retryDelay?: number
  /** Whether to enable verbose logging */
  readonly verbose?: boolean
}

/**
 * Translation request parameters
 */
export interface TranslationRequest {
  /** Text to translate */
  readonly text: string
  /** Source language code */
  readonly from: string
  /** Target language code */
  readonly to: ISO639Type
}

/**
 * Translation result with metadata
 */
export interface TranslationResult {
  /** Translated text */
  readonly translatedText: string
  /** Original text */
  readonly originalText: string
  /** Source language detected/specified */
  readonly sourceLanguage: string
  /** Target language */
  readonly targetLanguage: ISO639Type
  /** Whether translation was successful */
  readonly success: boolean
  /** Error message if translation failed */
  readonly error?: string
  /** Time taken for translation (milliseconds) */
  readonly duration: number
  /** Confidence score (if available) */
  readonly confidence?: number
}

/**
 * Browser factory interface for dependency injection
 */
export interface BrowserFactoryInterface {
  createBrowser(
    config: GoogleTranslatorConfig
  ): Promise<import('puppeteer-core').Browser>
  getChromePath(): string
}

/**
 * Translation service interface
 */
export interface TranslationServiceInterface {
  translateText(request: TranslationRequest): Promise<TranslationResult>
  close(): Promise<void>
}

/**
 * Error types for better error handling
 */
export class TranslationError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly originalError?: unknown
  ) {
    super(message)
    this.name = 'TranslationError'
  }
}

export class BrowserError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly originalError?: unknown
  ) {
    super(message)
    this.name = 'BrowserError'
  }
}

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG: Required<GoogleTranslatorConfig> = {
  headless: true,
  slowMo: 0,
  timeout: 30000,
  maxRetries: 3,
  retryDelay: 1000,
  verbose: false,
} as const

/**
 * Error codes for standardized error handling
 */
export const ERROR_CODES = {
  BROWSER_LAUNCH_FAILED: 'BROWSER_LAUNCH_FAILED',
  BROWSER_NOT_INITIALIZED: 'BROWSER_NOT_INITIALIZED',
  PAGE_NAVIGATION_FAILED: 'PAGE_NAVIGATION_FAILED',
  TRANSLATION_TIMEOUT: 'TRANSLATION_TIMEOUT',
  ELEMENT_NOT_FOUND: 'ELEMENT_NOT_FOUND',
  NETWORK_ERROR: 'NETWORK_ERROR',
  INVALID_LANGUAGE_CODE: 'INVALID_LANGUAGE_CODE',
  TEXT_TOO_LONG: 'TEXT_TOO_LONG',
} as const

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES]
