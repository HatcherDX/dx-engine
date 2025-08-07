// Core services
export { TranslationService } from './services/TranslationService.js'
export { MarkdownProtectionService } from './services/MarkdownProtectionService.js'
export { FileProcessingService } from './services/FileProcessingService.js'

// Strategies
export { FileByFileStrategy } from './strategies/FileByFileStrategy.js'

// Configuration
export { ConfigurationService } from './config/ConfigurationService.js'

// CLI
export { TranslationCLI } from './cli/index.js'

// Types and interfaces
export type {
  TranslationJobConfig,
  SupportedLanguageCode,
  FileTranslationContext,
  FileTranslationResult,
  BatchTranslationResult,
  TranslationProgress,
  TranslationStats,
  ProtectedContent,
  MarkdownProtectionConfig,
  FileProcessingConfig,
  TranslationStrategyConfig,
  ValidationResult,
  ProgressCallback,
  TranslationServiceInterface,
  MarkdownProtectionServiceInterface,
  FileProcessingServiceInterface,
  TranslationStrategyInterface,
  ConfigurationValidatorInterface,
} from './types/index.js'

// Constants and defaults
export {
  SUPPORTED_LANGUAGES,
  LANGUAGE_CODE_MAPPING,
  DEFAULT_TRANSLATION_CONFIG,
  DEFAULT_PROTECTION_CONFIG,
  TRANSLATION_ERROR_CODES,
  TranslationSystemError,
} from './types/index.js'

/**
 * Convenience function to create a complete translation job
 */
export async function translateDocumentation(
  sourceDir: string,
  targetDir: string,
  targetLanguages: import('./types/index.js').SupportedLanguageCode[],
  options: {
    overwriteExisting?: boolean
    verbose?: boolean
    onProgress?: import('./types/index.js').ProgressCallback
  } = {}
): Promise<import('./types/index.js').BatchTranslationResult> {
  const { ConfigurationService } = await import(
    './config/ConfigurationService.js'
  )
  const { FileByFileStrategy } = await import(
    './strategies/FileByFileStrategy.js'
  )

  // Create default configuration
  const config = ConfigurationService.createDefaultConfig(
    sourceDir,
    targetDir,
    targetLanguages
  )

  // Apply options
  if (options.overwriteExisting !== undefined) {
    config.fileProcessing.overwriteExisting = options.overwriteExisting
  }

  if (options.verbose !== undefined) {
    config.translatorConfig = {
      ...config.translatorConfig,
      verbose: options.verbose,
    }
  }

  // Execute translation
  const strategy = new FileByFileStrategy()
  return await strategy.execute(config, options.onProgress)
}

/**
 * Convenience function to validate a translation setup
 */
export async function validateTranslationSetup(
  sourceDir: string,
  targetLanguages: import('./types/index.js').SupportedLanguageCode[]
): Promise<import('./types/index.js').ValidationResult> {
  const { ConfigurationService } = await import(
    './config/ConfigurationService.js'
  )

  const configService = new ConfigurationService()

  // Validate file structure
  const fileValidation = await configService.validateFileStructure(sourceDir)

  // Validate language codes
  const langValidation = configService.validateLanguageCodes(targetLanguages)

  return {
    valid: fileValidation.valid && langValidation.valid,
    errors: [...fileValidation.errors, ...langValidation.errors],
    warnings: [...fileValidation.warnings, ...langValidation.warnings],
  }
}
