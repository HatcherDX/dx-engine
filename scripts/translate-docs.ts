#!/usr/bin/env tsx

import { translateDocumentation } from './translation/dist/index.js'
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

// By default create all languages, use --test flag for testing with 3 languages
const TARGET_LANGUAGES: SupportedLanguageCode[] = process.argv.includes(
  '--test'
)
  ? ['es', 'fr', 'de']
  : ALL_LANGUAGES

/**
 * Clean existing translations before creating new ones
 * @param docsDir - Documentation directory path
 * @returns Number of directories removed
 */
function cleanExistingTranslations(docsDir: string): number {
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
          colors.yellow(`  ⚠️  Failed to remove ${langCode}/:`, errorMessage)
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
 * Main translation function using the new TypeScript system
 */
async function main(): Promise<void> {
  console.log(
    colors.blue('🚀 Starting professional TypeScript translation system...')
  )
  console.log(colors.gray(`📁 Source: ${DOCS_DIR}`))
  console.log(colors.gray(`🌍 Target languages: ${TARGET_LANGUAGES.length}`))
  console.log()

  // Always clean existing translations first
  cleanExistingTranslations(DOCS_DIR)

  try {
    const config: TranslationConfig = {
      overwriteExisting: true, // Always overwrite since we cleaned first
      verbose: false, // Reduce verbosity to avoid spam
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

        // Show completion stats
        if (progress.phase === 'complete') {
          console.log()
          console.log(colors.green('✅ Translation completed!'))
          console.log(
            colors.gray(
              `📊 Files: ${progress.filesCompleted}/${progress.totalFiles}`
            )
          )
          console.log(
            colors.gray(
              `🌐 Languages: ${progress.languagesCompleted}/${progress.totalLanguages}`
            )
          )
          console.log(
            colors.gray(
              `⏱️  Time: ${(progress.timeElapsed / 1000).toFixed(1)}s`
            )
          )
        }
      },
    }

    const result = await translateDocumentation(
      DOCS_DIR,
      DOCS_DIR, // Same directory structure
      TARGET_LANGUAGES,
      config
    )

    if (result.success) {
      console.log()
      console.log(
        colors.green('🎉 Translation process completed successfully!')
      )
      console.log(colors.gray(`📊 Statistics:`))
      console.log(colors.gray(`   • Total files: ${result.stats.totalFiles}`))
      console.log(
        colors.gray(`   • Successful: ${result.stats.successfulFiles}`)
      )
      console.log(colors.gray(`   • Failed: ${result.stats.failedFiles}`))
      console.log(colors.gray(`   • Languages: ${result.stats.totalLanguages}`))
      console.log(
        colors.gray(
          `   • Total translations: ${result.stats.totalTranslations}`
        )
      )
      console.log(
        colors.gray(
          `   • Average time per file: ${result.stats.averageTimePerFile.toFixed(1)}ms`
        )
      )
      console.log(
        colors.gray(
          `   • Total duration: ${(result.totalDuration / 1000).toFixed(1)}s`
        )
      )
    } else {
      console.error(colors.red('❌ Translation process failed'))

      // Show failed files
      const failedFiles = result.fileResults.filter((r) => !r.success)
      if (failedFiles.length > 0) {
        console.log(colors.red('Failed files:'))
        failedFiles.forEach((file) => {
          console.log(
            colors.red(`  • ${file.context.targetFile}: ${file.error}`)
          )
        })
      }

      process.exit(1)
    }
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'
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
