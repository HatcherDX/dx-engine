import type { Browser, Page } from 'puppeteer-core'
import type { ISO639Type } from './ISO-639-code.js'
import type {
  GoogleTranslatorConfig,
  TranslationRequest,
  TranslationResult,
  TranslationServiceInterface,
  BrowserFactoryInterface,
} from './types/index.js'
import {
  TranslationError,
  BrowserError,
  ERROR_CODES,
  DEFAULT_CONFIG,
} from './types/index.js'
import { BrowserFactory } from './factories/BrowserFactory.js'

/**
 * Professional Google Translator implementation with robust error handling,
 * retry logic, and dependency injection support
 */
export class GoogleTranslator implements TranslationServiceInterface {
  private browser: Browser | null = null
  private browserPromise: Promise<Browser> | null = null
  private page: Page | null = null
  private readonly config: Required<GoogleTranslatorConfig>

  constructor(
    config: GoogleTranslatorConfig = {},
    private readonly browserFactory: BrowserFactoryInterface = new BrowserFactory()
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * Initialize browser instance lazily
   */
  private async ensureBrowser(): Promise<Browser> {
    if (this.browser && !this.browser.isConnected()) {
      this.browser = null
      this.page = null
    }

    if (this.browser) {
      return this.browser
    }

    if (!this.browserPromise) {
      this.browserPromise = this.initializeBrowser()
    }

    this.browser = await this.browserPromise
    this.browserPromise = null
    return this.browser
  }

  /**
   * Initialize browser with error handling
   */
  private async initializeBrowser(): Promise<Browser> {
    try {
      const browser = await this.browserFactory.createBrowser(this.config)

      browser.on('disconnected', () => {
        this.log('Browser disconnected')
        this.browser = null
        this.page = null
      })

      return browser
    } catch (error) {
      throw new BrowserError(
        'Failed to initialize browser',
        ERROR_CODES.BROWSER_LAUNCH_FAILED,
        error
      )
    }
  }

  /**
   * Get or create a page instance
   */
  private async ensurePage(): Promise<Page> {
    const browser = await this.ensureBrowser()

    if (!this.page || this.page.isClosed()) {
      this.page = await browser.newPage()

      // Set up page error handling
      this.page.on('error', (error) => {
        this.log(`Page error: ${error.message}`)
      })

      this.page.on('pageerror', (error) => {
        this.log(`Page error: ${error.message}`)
      })

      // Set realistic user agent
      await this.page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      )
    }

    return this.page
  }

  /**
   * Translate text with retry logic and comprehensive error handling
   */
  async translateText(request: TranslationRequest): Promise<TranslationResult>
  async translateText(
    text: string,
    from?: string,
    to?: ISO639Type
  ): Promise<string>
  async translateText(
    textOrRequest: string | TranslationRequest,
    from: string = 'auto',
    to: ISO639Type = 'en'
  ): Promise<TranslationResult | string> {
    const startTime = Date.now()

    // Handle both function signatures
    const request: TranslationRequest =
      typeof textOrRequest === 'string'
        ? { text: textOrRequest, from, to }
        : textOrRequest

    // Validate input
    this.validateTranslationRequest(request)

    let lastError: unknown

    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        this.log(`Translation attempt ${attempt}/${this.config.maxRetries}`)

        const result = await this.performTranslation(request)
        const duration = Date.now() - startTime

        this.log(`Translation successful in ${duration}ms`)

        const translationResult: TranslationResult = {
          ...result,
          duration,
          success: true,
        }

        // Return string for backward compatibility or full result
        return typeof textOrRequest === 'string'
          ? result.translatedText
          : translationResult
      } catch (error) {
        lastError = error
        this.log(
          `Translation attempt ${attempt} failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        )

        if (attempt < this.config.maxRetries) {
          await this.delay(this.config.retryDelay * attempt) // Exponential backoff
        }
      }
    }

    // All retries failed
    const duration = Date.now() - startTime
    const errorResult: TranslationResult = {
      translatedText: request.text,
      originalText: request.text,
      sourceLanguage: request.from,
      targetLanguage: request.to,
      success: false,
      error: lastError instanceof Error ? lastError.message : 'Unknown error',
      duration,
    }

    if (typeof textOrRequest === 'string') {
      this.log(
        `Translation failed after ${this.config.maxRetries} attempts, returning original text`
      )
      return request.text
    }

    return errorResult
  }

  /**
   * Perform the actual translation
   */
  private async performTranslation(
    request: TranslationRequest
  ): Promise<Omit<TranslationResult, 'duration' | 'success'>> {
    const page = await this.ensurePage()

    try {
      // Navigate to Google Translate
      const encodedText = encodeURIComponent(request.text)
      const url = `https://translate.google.com/?sl=${request.from}&tl=${request.to}&text=${encodedText}&op=translate`

      this.log(`Navigating to: ${url}`)
      await page.goto(url, {
        waitUntil: 'networkidle0',
        timeout: this.config.timeout,
      })

      // Wait for translation to appear
      await page.waitForSelector('[data-result-index="0"] span', {
        timeout: this.config.timeout,
      })

      // Extract translated text
      const translatedText = await page.evaluate(() => {
        const elements = document.querySelectorAll(
          '[data-result-index="0"] span'
        )
        return Array.from(elements)
          .map((el) => el.textContent)
          .filter((text) => text && text.trim())
          .join('')
      })

      if (!translatedText || translatedText.trim() === '') {
        throw new TranslationError(
          'No translation found in page',
          ERROR_CODES.ELEMENT_NOT_FOUND
        )
      }

      return {
        translatedText: translatedText.trim(),
        originalText: request.text,
        sourceLanguage: request.from,
        targetLanguage: request.to,
      }
    } catch (error) {
      if (error instanceof TranslationError) {
        throw error
      }

      throw new TranslationError(
        `Translation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ERROR_CODES.TRANSLATION_TIMEOUT,
        error
      )
    }
  }

  /**
   * Validate translation request
   */
  private validateTranslationRequest(request: TranslationRequest): void {
    if (!request.text || request.text.trim() === '') {
      throw new TranslationError(
        'Text cannot be empty',
        ERROR_CODES.TEXT_TOO_LONG
      )
    }

    if (request.text.length > 5000) {
      throw new TranslationError(
        'Text is too long (max 5000 characters)',
        ERROR_CODES.TEXT_TOO_LONG
      )
    }

    if (!request.from || !request.to) {
      throw new TranslationError(
        'Source and target languages must be specified',
        ERROR_CODES.INVALID_LANGUAGE_CODE
      )
    }
  }

  /**
   * Utility method for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  /**
   * Logging utility
   */
  private log(message: string): void {
    if (this.config.verbose) {
      console.log(`[GoogleTranslator] ${message}`)
    }
  }

  /**
   * Close browser and clean up resources
   */
  async close(): Promise<void> {
    try {
      if (this.page) {
        await this.page.close()
        this.page = null
      }

      if (this.browser) {
        await this.browser.close()
        this.browser = null
      }

      this.log('Browser closed successfully')
    } catch (error) {
      this.log(
        `Error closing browser: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }
}
