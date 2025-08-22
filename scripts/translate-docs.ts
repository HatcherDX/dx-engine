#!/usr/bin/env tsx

import { translateDocumentation } from '../tooling/translation-system/dist/index.js'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { rmSync, existsSync } from 'fs'
import type { ProgressInfo } from '../types/test-mocks'

// Types for professional TypeScript development
interface ColorFunction {
  (text: string): string
}

interface Colors {
  blue: ColorFunction
  gray: ColorFunction
  cyan: ColorFunction
  green: ColorFunction
  yellow: ColorFunction
  magenta: ColorFunction
  red: ColorFunction
}

interface TranslationConfig {
  overwriteExisting: boolean
  verbose: boolean
  onProgress: (progress: ProgressInfo) => void
  rateLimit?: RateLimitConfig
  retryStrategy?: RetryStrategyConfig
}

interface RateLimitConfig {
  requestsPerMinute: number
  requestsPerHour: number
  delayBetweenBatches: number
  batchSize: number
}

interface RetryStrategyConfig {
  maxRetries: number
  initialDelay: number
  maxDelay: number
  backoffMultiplier: number
  jitterRange: number
}

interface TranslationMetrics {
  startTime: number
  requestCount: number
  errorCount: number
  successCount: number
  lastRequestTime: number
  hourlyRequests: number[]
  retryAttempts: Map<string, number>
}

type SupportedLanguageCode =
  | 'ar'
  | 'zh-cn'
  | 'es'
  | 'pt'
  | 'fr'
  | 'de'
  | 'hi'
  | 'id'
  | 'ja'
  | 'ko'
  | 'fa'
  | 'ru'
  | 'tr'

// Simple color functions to replace chalk
const colors: Colors = {
  blue: (text: string): string => `\x1b[34m${text}\x1b[0m`,
  gray: (text: string): string => `\x1b[90m${text}\x1b[0m`,
  cyan: (text: string): string => `\x1b[36m${text}\x1b[0m`,
  green: (text: string): string => `\x1b[32m${text}\x1b[0m`,
  yellow: (text: string): string => `\x1b[33m${text}\x1b[0m`,
  magenta: (text: string): string => `\x1b[35m${text}\x1b[0m`,
  red: (text: string): string => `\x1b[31m${text}\x1b[0m`,
}

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Configuration
const DOCS_DIR: string = join(__dirname, '../apps/docs')
const ALL_LANGUAGES: SupportedLanguageCode[] = [
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

// Default rate limiting configuration
const DEFAULT_RATE_LIMIT: RateLimitConfig = {
  requestsPerMinute: 20,
  requestsPerHour: 500,
  delayBetweenBatches: 5000, // 5 seconds between language batches
  batchSize: 3, // Process 3 languages at a time
}

// Default retry strategy with exponential backoff
const DEFAULT_RETRY_STRATEGY: RetryStrategyConfig = {
  maxRetries: 5,
  initialDelay: 1000, // 1 second
  maxDelay: 60000, // 1 minute
  backoffMultiplier: 2,
  jitterRange: 0.3, // 30% jitter
}

/**
 * Rate limiter class to prevent API throttling
 */
export class RateLimiter {
  private metrics: TranslationMetrics
  private config: RateLimitConfig

  constructor(config: RateLimitConfig = DEFAULT_RATE_LIMIT) {
    this.config = config
    this.metrics = {
      startTime: Date.now(),
      requestCount: 0,
      errorCount: 0,
      successCount: 0,
      lastRequestTime: 0,
      hourlyRequests: [],
      retryAttempts: new Map(),
    }
  }

  /**
   * Check if we can make a request based on rate limits
   */
  async checkRateLimit(): Promise<boolean> {
    const now = Date.now()
    const minuteAgo = now - 60000
    const hourAgo = now - 3600000

    // Clean old hourly requests
    this.metrics.hourlyRequests = this.metrics.hourlyRequests.filter(
      (time) => time > hourAgo
    )

    // Count requests in the last minute
    const recentRequests = this.metrics.hourlyRequests.filter(
      (time) => time > minuteAgo
    ).length

    // Check rate limits
    if (recentRequests >= this.config.requestsPerMinute) {
      const waitTime = 60000 - (now - this.metrics.hourlyRequests[0])
      console.log(
        colors.yellow(
          `⏳ Rate limit reached (${recentRequests}/${this.config.requestsPerMinute} per minute). Waiting ${Math.ceil(waitTime / 1000)}s...`
        )
      )
      await this.delay(waitTime)
      return this.checkRateLimit() // Recursive check after waiting
    }

    if (this.metrics.hourlyRequests.length >= this.config.requestsPerHour) {
      const waitTime = 3600000 - (now - this.metrics.hourlyRequests[0])
      console.log(
        colors.yellow(
          `⏳ Hourly rate limit reached. Waiting ${Math.ceil(waitTime / 60000)} minutes...`
        )
      )
      await this.delay(waitTime)
      return this.checkRateLimit()
    }

    return true
  }

  /**
   * Record a request
   */
  recordRequest(): void {
    const now = Date.now()
    this.metrics.requestCount++
    this.metrics.lastRequestTime = now
    this.metrics.hourlyRequests.push(now)
  }

  /**
   * Record success
   */
  recordSuccess(): void {
    this.metrics.successCount++
  }

  /**
   * Record error
   */
  recordError(identifier: string): void {
    this.metrics.errorCount++
    const currentAttempts = this.metrics.retryAttempts.get(identifier) || 0
    this.metrics.retryAttempts.set(identifier, currentAttempts + 1)
  }

  /**
   * Get retry count for an identifier
   */
  getRetryCount(identifier: string): number {
    return this.metrics.retryAttempts.get(identifier) || 0
  }

  /**
   * Get metrics summary
   */
  getMetrics(): TranslationMetrics {
    return { ...this.metrics }
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}

/**
 * Retry strategy with exponential backoff and jitter
 */
export class RetryStrategy {
  private config: RetryStrategyConfig

  constructor(config: RetryStrategyConfig = DEFAULT_RETRY_STRATEGY) {
    this.config = config
  }

  /**
   * Calculate delay for retry attempt with exponential backoff and jitter
   */
  calculateDelay(attemptNumber: number): number {
    // Exponential backoff
    let delay = Math.min(
      this.config.initialDelay *
        Math.pow(this.config.backoffMultiplier, attemptNumber - 1),
      this.config.maxDelay
    )

    // Add jitter to prevent thundering herd
    const jitter = delay * this.config.jitterRange * (Math.random() - 0.5)
    delay = Math.max(0, delay + jitter)

    return Math.round(delay)
  }

  /**
   * Execute operation with retry logic
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    identifier: string,
    rateLimiter: RateLimiter
  ): Promise<T> {
    let lastError: Error | undefined

    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        // Check rate limit before attempting
        await rateLimiter.checkRateLimit()
        rateLimiter.recordRequest()

        // Execute operation
        const result = await operation()
        rateLimiter.recordSuccess()
        return result
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        rateLimiter.recordError(identifier)

        if (attempt < this.config.maxRetries) {
          const delay = this.calculateDelay(attempt)
          console.log(
            colors.yellow(
              `🔄 Retry ${attempt}/${this.config.maxRetries} for ${identifier} after ${delay}ms delay...`
            )
          )
          await this.delay(delay)
        } else {
          console.error(
            colors.red(
              `❌ Failed after ${this.config.maxRetries} attempts: ${identifier}`
            )
          )
        }
      }
    }

    throw (
      lastError ||
      new Error(`Operation failed after ${this.config.maxRetries} retries`)
    )
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}

/**
 * Translation queue for batch processing
 */
export class TranslationQueue {
  private queue: Array<{
    language: SupportedLanguageCode
    priority: number
  }> = []
  private processing = false
  private batchSize: number

  constructor(batchSize: number = 3) {
    this.batchSize = batchSize
  }

  /**
   * Add languages to queue with priority
   */
  addToQueue(languages: SupportedLanguageCode[], priority: number = 0): void {
    languages.forEach((language) => {
      this.queue.push({ language, priority })
    })
    // Sort by priority (higher priority first)
    this.queue.sort((a, b) => b.priority - a.priority)
  }

  /**
   * Get next batch to process
   */
  getNextBatch(): SupportedLanguageCode[] {
    const batch = this.queue.splice(0, this.batchSize)
    return batch.map((item) => item.language)
  }

  /**
   * Check if queue has items
   */
  hasItems(): boolean {
    return this.queue.length > 0
  }

  /**
   * Get queue size
   */
  size(): number {
    return this.queue.length
  }
}

// Get target languages based on command line arguments
function getTargetLanguages(): SupportedLanguageCode[] {
  return process.argv.includes('--test') ? ['es', 'fr', 'de'] : ALL_LANGUAGES
}

// Get configuration from command line arguments
export function getConfiguration(): {
  rateLimit: RateLimitConfig
  retryStrategy: RetryStrategyConfig
} {
  const config = {
    rateLimit: { ...DEFAULT_RATE_LIMIT },
    retryStrategy: { ...DEFAULT_RETRY_STRATEGY },
  }

  // Parse command line arguments for custom configuration
  const args = process.argv.slice(2)
  args.forEach((arg, index) => {
    if (arg === '--requests-per-minute' && args[index + 1]) {
      config.rateLimit.requestsPerMinute = parseInt(args[index + 1], 10)
    }
    if (arg === '--requests-per-hour' && args[index + 1]) {
      config.rateLimit.requestsPerHour = parseInt(args[index + 1], 10)
    }
    if (arg === '--batch-size' && args[index + 1]) {
      config.rateLimit.batchSize = parseInt(args[index + 1], 10)
    }
    if (arg === '--max-retries' && args[index + 1]) {
      config.retryStrategy.maxRetries = parseInt(args[index + 1], 10)
    }
    if (arg === '--backoff-multiplier' && args[index + 1]) {
      config.retryStrategy.backoffMultiplier = parseFloat(args[index + 1])
    }
  })

  return config
}

/**
 * Clean existing translations before creating new ones
 * @param docsDir - Documentation directory path
 * @returns Number of directories removed
 */
export function cleanExistingTranslations(docsDir: string): number {
  console.log(colors.cyan('🧹 Cleaning existing translations...'))

  let removedCount: number = 0

  for (const langCode of ALL_LANGUAGES) {
    const langDir: string = join(docsDir, langCode)

    if (existsSync(langDir)) {
      try {
        rmSync(langDir, { recursive: true, force: true })
        console.log(colors.gray(`  ✅ Removed ${langCode}/ directory`))
        removedCount++
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error'
        console.warn(
          colors.yellow(`  ⚠️  Failed to remove ${langCode}/: ${errorMessage}`)
        )
      }
    }
  }

  if (removedCount === 0) {
    console.log(
      colors.gray('  ✅ No existing translations found - directory is clean')
    )
  } else {
    console.log(
      colors.green(
        `  🗑️  Cleaned ${removedCount} existing translation directories`
      )
    )
  }

  console.log()
  return removedCount
}

/**
 * Enhanced main translation function with rate limiting and retry strategies
 */
export async function main(): Promise<void> {
  const targetLanguages = getTargetLanguages()
  const config = getConfiguration()

  console.log(
    colors.blue('🚀 Starting enhanced TypeScript translation system...')
  )
  console.log(colors.gray(`📁 Source: ${DOCS_DIR}`))
  console.log(colors.gray(`🌍 Target languages: ${targetLanguages.length}`))
  console.log(
    colors.gray(
      `⚙️  Rate limit: ${config.rateLimit.requestsPerMinute} req/min, ${config.rateLimit.requestsPerHour} req/hour`
    )
  )
  console.log(
    colors.gray(
      `🔄 Retry strategy: ${config.retryStrategy.maxRetries} attempts with ${config.retryStrategy.backoffMultiplier}x backoff`
    )
  )
  console.log(
    colors.gray(
      `📦 Batch size: ${config.rateLimit.batchSize} languages per batch`
    )
  )
  console.log()

  // Always clean existing translations first
  cleanExistingTranslations(DOCS_DIR)

  // Initialize rate limiter and retry strategy
  const rateLimiter = new RateLimiter(config.rateLimit)
  const retryStrategy = new RetryStrategy(config.retryStrategy)
  const queue = new TranslationQueue(config.rateLimit.batchSize)

  // Add languages to queue with priority (prioritize smaller language codes first as they might be faster)
  const prioritizedLanguages = [...targetLanguages].sort((a, b) => {
    const priority: Record<string, number> = {
      es: 10, // Spanish - high priority
      fr: 9, // French - high priority
      de: 8, // German - high priority
      pt: 7, // Portuguese
      ja: 5, // Japanese - might be slower
      'zh-cn': 4, // Chinese - might be slower
      ar: 3, // Arabic - RTL, might need special handling
      fa: 3, // Persian - RTL
      ko: 5, // Korean
      ru: 6, // Russian
      tr: 6, // Turkish
      hi: 5, // Hindi
      id: 7, // Indonesian
    }
    return (priority[b] || 0) - (priority[a] || 0)
  })

  queue.addToQueue(prioritizedLanguages, 0)

  try {
    const startTime = Date.now()
    const results: any[] = []

    // Process in batches
    while (queue.hasItems()) {
      const batch = queue.getNextBatch()

      if (batch.length === 0) break

      console.log(
        colors.cyan(
          `\n📦 Processing batch: ${batch.join(', ')} (${queue.size()} remaining in queue)`
        )
      )

      // Process batch with retry logic
      const batchPromises = batch.map(async (language) => {
        const translationConfig: TranslationConfig = {
          overwriteExisting: true,
          verbose: false,
          onProgress: (progress: ProgressInfo) => {
            const phase: string = colors.cyan(progress.phase.toUpperCase())
            const percent: string = colors.green(
              `${progress.overallProgress.toFixed(1)}%`
            )
            const file: string = progress.currentFile
              ? colors.yellow(progress.currentFile)
              : ''
            const lang: string = progress.currentLanguage
              ? colors.magenta(progress.currentLanguage)
              : ''

            if (progress.message) {
              console.log(
                `${phase} ${percent} - ${progress.message} ${file} ${lang}`
              )
            }
          },
        }

        return retryStrategy.executeWithRetry(
          async () => {
            return translateDocumentation(
              DOCS_DIR,
              DOCS_DIR,
              [language],
              translationConfig
            )
          },
          `translation-${language}`,
          rateLimiter
        )
      })

      // Wait for batch to complete
      const batchResults = await Promise.allSettled(batchPromises)
      results.push(...batchResults)

      // Log batch results
      const successful = batchResults.filter(
        (r) => r.status === 'fulfilled'
      ).length
      const failed = batchResults.filter((r) => r.status === 'rejected').length

      console.log(
        colors.green(
          `\n✅ Batch completed: ${successful} successful, ${failed} failed`
        )
      )

      // Delay between batches
      if (queue.hasItems()) {
        const delayMs = config.rateLimit.delayBetweenBatches
        console.log(
          colors.gray(`⏳ Waiting ${delayMs / 1000}s before next batch...`)
        )
        await new Promise((resolve) => setTimeout(resolve, delayMs))
      }
    }

    // Process results
    const successfulResults = results.filter((r) => r.status === 'fulfilled')
    const failedResults = results.filter((r) => r.status === 'rejected')
    const totalDuration = Date.now() - startTime

    // Get metrics
    const metrics = rateLimiter.getMetrics()

    console.log()
    console.log(colors.green('🎉 Translation process completed!'))
    console.log(colors.gray(`📊 Statistics:`))
    console.log(colors.gray(`   • Total languages: ${targetLanguages.length}`))
    console.log(colors.gray(`   • Successful: ${successfulResults.length}`))
    console.log(colors.gray(`   • Failed: ${failedResults.length}`))
    console.log(colors.gray(`   • Total requests: ${metrics.requestCount}`))
    console.log(colors.gray(`   • Total retries: ${metrics.errorCount}`))
    console.log(
      colors.gray(
        `   • Success rate: ${((metrics.successCount / metrics.requestCount) * 100).toFixed(1)}%`
      )
    )
    console.log(
      colors.gray(`   • Total duration: ${(totalDuration / 1000).toFixed(1)}s`)
    )
    console.log(
      colors.gray(
        `   • Average time per language: ${(totalDuration / targetLanguages.length / 1000).toFixed(1)}s`
      )
    )

    if (failedResults.length > 0) {
      console.log()
      console.log(colors.red('❌ Failed translations:'))
      failedResults.forEach((result, index) => {
        if (result.status === 'rejected') {
          console.log(
            colors.red(`   • Language ${index + 1}: ${result.reason}`)
          )
        }
      })
      process.exit(1)
    }
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error occurred'
    const errorStack = error instanceof Error ? error.stack : undefined

    console.error(colors.red('💥 Fatal error occurred:'))
    console.error(colors.red(errorMessage))
    if (errorStack) {
      console.error(colors.gray(errorStack))
    }
    process.exit(1)
  }
}

// Handle process termination
process.on('SIGINT', (): void => {
  console.log(colors.yellow('\\n⚠️ Translation interrupted by user'))
  process.exit(130)
})

process.on('SIGTERM', (): void => {
  console.log(colors.yellow('\\n⚠️ Translation terminated'))
  process.exit(143)
})

// Only run the main function if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error: unknown) => {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error occurred'
    console.error(colors.red('💥 Unhandled error:'), errorMessage)
    process.exit(1)
  })
}
