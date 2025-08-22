#!/usr/bin/env node

/**
 * @fileoverview Professional CLI application for Hatcher DX Engine Translation System
 *
 * @description
 * Command-line interface providing comprehensive translation capabilities for documentation.
 * Features include:
 * - Multi-language translation with progress tracking
 * - Configuration validation and file structure verification
 * - Interactive progress reporting with spinners and progress bars
 * - Support for VitePress and Docusaurus documentation frameworks
 * - Batch processing with error handling and recovery
 * - CLI commands: translate, validate, init, clean, status, languages
 *
 * @example
 * ```bash
 * # Translate documentation
 * dx-translate translate --source ./docs --target ./translations --languages es,fr,de
 *
 * # Initialize configuration
 * dx-translate init --source ./docs --target ./docs --vitepress
 *
 * # Validate setup
 * dx-translate validate --source ./docs --config ./config.js
 * ```
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import chalk from 'chalk'
import { Command } from 'commander'
import { promises as fs } from 'fs'
import ora from 'ora'
import { join, resolve } from 'path'
import { ConfigurationService } from '../config/ConfigurationService.js'
import { FileByFileStrategy } from '../strategies/FileByFileStrategy.js'
import type {
  BatchTranslationResult,
  SupportedLanguageCode,
  TranslationJobConfig,
  TranslationProgress,
} from '../types/index.js'
import { SUPPORTED_LANGUAGES, TranslationSystemError } from '../types/index.js'

/**
 * Command line options for the translate command
 *
 * @public
 * @interface
 */
interface TranslateCommandOptions {
  /** Path to configuration file */
  config?: string
  /** Output directory for translations */
  output?: string
  /** Comma-separated list of target languages */
  languages?: string
  /** Input directory (alias for source) */
  input?: string
  /** Source directory containing markdown files */
  source?: string
  /** Target directory for translated files */
  target?: string
  /** Force overwrite existing translations */
  force?: boolean
  /** Enable verbose logging */
  verbose?: boolean
  /** Show what would be translated without executing */
  dryRun?: boolean
}

/**
 * Command line options for the validate command
 *
 * @public
 * @interface
 */
interface ValidateCommandOptions {
  /** Path to configuration file to validate */
  config?: string
  /** Output directory for validation results */
  output?: string
  /** Source directory to validate */
  source?: string
}

/**
 * Command line options for the init command
 *
 * @public
 * @interface
 */
interface InitCommandOptions {
  /** Source directory for documentation */
  source: string
  /** Target directory for translations */
  target: string
  /** Comma-separated list of target languages */
  languages?: string
  /** Force overwrite existing configuration */
  force?: boolean
  /** Configure for VitePress framework */
  vitepress?: boolean
  /** Configure for Docusaurus framework */
  docusaurus?: boolean
}

/**
 * Command line options for the clean command
 *
 * @public
 * @interface
 */
interface CleanCommandOptions {
  /** Target directory to clean */
  target: string
  /** Comma-separated list of languages to clean */
  languages?: string
  /** Force removal without confirmation */
  force?: boolean
}

/**
 * Command line options for the status command
 *
 * @public
 * @interface
 */
interface StatusCommandOptions {
  /** Source directory to analyze */
  source?: string
  /** Target directory to check */
  target?: string
  /** Comma-separated list of languages to check */
  languages?: string
}

/**
 * Professional progress handler for CLI translation operations
 *
 * @description
 * Manages visual feedback during translation processes with:
 * - Animated progress bars with percentage indicators
 * - Color-coded status messages with emoji icons
 * - Spinner animations for ongoing operations
 * - Success/failure state management
 * - Time tracking and duration reporting
 *
 * @example
 * ```typescript
 * const progressHandler = new CLIProgressHandler()
 *
 * // Handle translation progress updates
 * const progress = {
 *   phase: 'translating',
 *   currentFile: 'README.md',
 *   currentLanguage: 'es',
 *   overallProgress: 75,
 *   message: 'Processing documentation'
 * }
 * progressHandler.handleProgress(progress)
 *
 * // Stop and show success
 * progressHandler.stop()
 * ```
 *
 * @public
 * @since 1.0.0
 */
class CLIProgressHandler {
  private spinner = ora()
  private startTime = Date.now()

  /**
   * Handles translation progress updates with visual feedback
   *
   * @param progress - Progress information from translation strategy
   *
   * @remarks
   * Updates the CLI interface with:
   * - Dynamic progress bar based on percentage completion
   * - Context-aware status messages (file, language, phase)
   * - Automatic completion detection and success display
   * - Spinner management for continuous feedback
   *
   * @example
   * ```typescript
   * const progress = {
   *   phase: 'translating',
   *   currentFile: 'guide.md',
   *   currentLanguage: 'fr',
   *   overallProgress: 50,
   *   message: 'Processing guide documentation'
   * }
   * progressHandler.handleProgress(progress)
   * ```
   *
   * @public
   */
  handleProgress = (progress: TranslationProgress): void => {
    const { phase, currentFile, currentLanguage, overallProgress, message } =
      progress

    // Format progress message
    let displayMessage = message || `${phase} phase`

    if (currentFile && currentLanguage) {
      displayMessage = `${currentLanguage}/${currentFile}`
    } else if (currentFile) {
      displayMessage = `Processing ${currentFile}`
    }

    // Update spinner
    const progressBar = this.createProgressBar(overallProgress)
    this.spinner.text = `${progressBar} ${displayMessage}`

    if (phase === 'complete') {
      this.spinner.succeed(chalk.green(`✅ ${displayMessage}`))
    } else if (!this.spinner.isSpinning) {
      this.spinner.start()
    }
  }

  /**
   * Creates ASCII progress bar with percentage indicator
   *
   * @param progress - Completion percentage (0-100)
   * @returns Formatted progress bar string with cyan styling
   *
   * @remarks
   * Generates a 20-character wide progress bar using:
   * - Filled blocks (█) for completed progress
   * - Empty blocks (░) for remaining progress
   * - Percentage display with rounded values
   * - Cyan color coding for visual appeal
   *
   * @example
   * ```typescript
   * const bar = progressHandler.createProgressBar(75)
   * // Returns: "[███████████████░░░░░] 75%"
   * ```
   *
   * @internal
   */
  private createProgressBar(progress: number): string {
    const width = 20
    const filled = Math.round((progress / 100) * width)
    const empty = width - filled
    const bar = '█'.repeat(filled) + '░'.repeat(empty)
    return chalk.cyan(`[${bar}] ${Math.round(progress)}%`)
  }

  /**
   * Stops the progress spinner if currently running
   *
   * @remarks
   * Safely stops the ora spinner to prevent console interference.
   * Called when translation operations complete or when cleanup is needed.
   *
   * @example
   * ```typescript
   * progressHandler.stop()
   * ```
   *
   * @public
   */
  stop(): void {
    if (this.spinner.isSpinning) {
      this.spinner.stop()
    }
  }

  /**
   * Displays failure message with error styling
   *
   * @param message - Error message to display
   *
   * @remarks
   * Shows a red-colored failure message using the ora spinner's fail method.
   * Automatically stops any running spinner before displaying the error.
   *
   * @example
   * ```typescript
   * progressHandler.fail('Translation failed: Network timeout')
   * ```
   *
   * @public
   */
  fail(message: string): void {
    this.spinner.fail(chalk.red(message))
  }
}

/**
 * Professional CLI application for Hatcher DX Engine Translation System
 *
 * @description
 * Main command-line interface providing comprehensive translation capabilities:
 * - Multi-language documentation translation with progress tracking
 * - Configuration validation and file structure verification
 * - Support for VitePress and Docusaurus documentation frameworks
 * - Interactive progress reporting with spinners and progress bars
 * - Batch processing with error handling and recovery
 * - Commands: translate, validate, init, clean, status, languages
 *
 * @example
 * ```typescript
 * // Create and run CLI application
 * const cli = new TranslationCLI()
 * await cli.run()
 *
 * // Or use programmatically
 * const cli = new TranslationCLI()
 * await cli.handleTranslateCommand({
 *   source: './docs',
 *   target: './translations',
 *   languages: 'es,fr,de'
 * })
 * ```
 *
 * @remarks
 * Built on Commander.js for robust argument parsing and command organization.
 * Integrates with {@link ConfigurationService} for setup management and
 * {@link FileByFileStrategy} for translation execution.
 *
 * @public
 * @since 1.0.0
 */
class TranslationCLI {
  private program: Command

  constructor() {
    this.program = new Command()
    this.setupCommands()
  }

  /**
   * Configures all CLI commands with options and actions
   *
   * @remarks
   * Sets up the complete command structure including:
   * - Main translate command with comprehensive options
   * - Utility commands (languages, validate, init, clean, status)
   * - Option parsing and validation
   * - Command-specific help and documentation
   *
   * Uses Commander.js fluent API for clean command definition.
   *
   * @private
   */
  private setupCommands(): void {
    this.program
      .name('dx-translate')
      .description(
        'Professional translation system for Hatcher DX Engine documentation'
      )
      .version('1.0.0')

    // Main translate command
    this.program
      .command('translate')
      .description('Translate documentation files')
      .option(
        '-s, --source <dir>',
        'Source directory containing markdown files',
        './docs'
      )
      .option(
        '-t, --target <dir>',
        'Target directory for translated files',
        './docs'
      )
      .option(
        '-l, --languages <langs>',
        'Target languages (comma-separated)',
        'es,fr,de'
      )
      .option('-c, --config <file>', 'Configuration file path')
      .option('--strategy <strategy>', 'Translation strategy', 'file-by-file')
      .option('--overwrite', 'Overwrite existing translations', false)
      .option('--headless', 'Run browser in headless mode', true)
      .option('--verbose', 'Enable verbose logging', false)
      .option(
        '--dry-run',
        'Show what would be translated without actually doing it',
        false
      )
      .action(this.handleTranslateCommand.bind(this))

    // List supported languages
    this.program
      .command('languages')
      .description('List all supported languages')
      .action(this.handleLanguagesCommand.bind(this))

    // Validate configuration
    this.program
      .command('validate')
      .description('Validate configuration and file structure')
      .option('-s, --source <dir>', 'Source directory to validate', './docs')
      .option('-c, --config <file>', 'Configuration file to validate')
      .action(this.handleValidateCommand.bind(this))

    // Initialize configuration
    this.program
      .command('init')
      .description('Initialize translation configuration')
      .option('-s, --source <dir>', 'Source directory', './docs')
      .option('-t, --target <dir>', 'Target directory', './docs')
      .option('-l, --languages <langs>', 'Target languages', 'es,fr,de')
      .option('--vitepress', 'Configure for VitePress', false)
      .option('--docusaurus', 'Configure for Docusaurus', false)
      .action(this.handleInitCommand.bind(this))

    // Clean translations
    this.program
      .command('clean')
      .description('Clean existing translations')
      .option('-t, --target <dir>', 'Target directory', './docs')
      .option('-l, --languages <langs>', 'Languages to clean', 'es,fr,de')
      .action(this.handleCleanCommand.bind(this))

    // Status command
    this.program
      .command('status')
      .description('Show translation status and statistics')
      .option('-s, --source <dir>', 'Source directory', './docs')
      .option('-t, --target <dir>', 'Target directory', './docs')
      .option('-l, --languages <langs>', 'Languages to check', 'es,fr,de')
      .action(this.handleStatusCommand.bind(this))
  }

  /**
   * Executes the main translation command with comprehensive workflow
   *
   * @param options - Translation command options from CLI arguments
   *
   * @remarks
   * Complete translation workflow including:
   * 1. Configuration loading/creation from CLI options
   * 2. Configuration and file structure validation
   * 3. Progress tracking with visual feedback
   * 4. Translation execution using FileByFileStrategy
   * 5. Results reporting with statistics and error details
   * 6. Graceful error handling with user-friendly messages
   *
   * @example
   * ```typescript
   * await cli.handleTranslateCommand({
   *   source: './docs',
   *   target: './translations',
   *   languages: 'es,fr,de',
   *   config: './dx-translate.config.js',
   *   verbose: true
   * })
   * ```
   *
   * @throws {@link TranslationSystemError} When validation or translation fails
   *
   * @public
   */
  private async handleTranslateCommand(
    options: TranslateCommandOptions
  ): Promise<void> {
    const progressHandler = new CLIProgressHandler()

    try {
      console.log(chalk.blue.bold('🌍 DX Engine Translation System'))
      console.log('')

      // Load or create configuration
      let config: TranslationJobConfig

      if (options.config) {
        console.log(
          chalk.gray(`📋 Loading configuration from: ${options.config}`)
        )
        config = await ConfigurationService.loadFromFile(
          resolve(options.config)
        )
      } else {
        console.log(chalk.gray('⚙️  Creating configuration from CLI options'))
        config = this.createConfigFromOptions(options)
      }

      // Validate configuration
      const configService = new ConfigurationService()
      const configValidation = configService.validateJob(config)

      if (!configValidation.valid) {
        console.error(chalk.red('❌ Configuration validation failed:'))
        configValidation.errors.forEach((error) => {
          console.error(chalk.red(`   • ${error.message}`))
        })
        process.exit(1)
      }

      // Validate file structure
      const fileValidation = await configService.validateFileStructure(
        config.fileProcessing.sourceDir
      )

      if (!fileValidation.valid) {
        console.error(chalk.red('❌ File structure validation failed:'))
        fileValidation.errors.forEach((error) => {
          console.error(chalk.red(`   • ${error.message}`))
        })
        process.exit(1)
      }

      // Show warnings
      if (fileValidation.warnings.length > 0) {
        console.log(chalk.yellow('⚠️  Warnings:'))
        fileValidation.warnings.forEach((warning) => {
          console.log(chalk.yellow(`   • ${warning.message}`))
        })
        console.log('')
      }

      // Show configuration summary
      this.showConfigSummary(config)

      if (options.dryRun) {
        console.log(
          chalk.blue(
            '🔍 Dry run complete. Use --no-dry-run to execute translation.'
          )
        )
        return
      }

      // Execute translation
      console.log(chalk.green('🚀 Starting translation...'))
      console.log('')

      const strategy = new FileByFileStrategy()
      const result = await strategy.execute(
        config,
        progressHandler.handleProgress
      )

      progressHandler.stop()

      // Show results
      this.showResults(result)
    } catch (error) {
      progressHandler.fail('Translation failed')

      if (error instanceof TranslationSystemError) {
        console.error(chalk.red(`❌ ${error.message}`))
        if (error.file) {
          console.error(chalk.gray(`   File: ${error.file}`))
        }
      } else {
        console.error(chalk.red('❌ Unexpected error:'), error)
      }

      process.exit(1)
    }
  }

  /**
   * Displays all supported languages with codes and names
   *
   * @remarks
   * Shows a formatted list of all supported language codes with their
   * full names, total count, and usage examples. Helps users discover
   * available translation targets.
   *
   * @example
   * ```typescript
   * cli.handleLanguagesCommand()
   * // Output:
   * // 🌍 Supported Languages
   * //
   * // es       Spanish
   * // fr       French
   * // de       German
   * // ...
   * //
   * // Total: 13 languages
   * ```
   *
   * @public
   */
  private handleLanguagesCommand(): void {
    console.log(chalk.blue.bold('🌍 Supported Languages'))
    console.log('')

    Object.entries(SUPPORTED_LANGUAGES).forEach(([code, name]) => {
      console.log(`${chalk.cyan(code.padEnd(8))} ${name}`)
    })

    console.log('')
    console.log(
      chalk.gray(`Total: ${Object.keys(SUPPORTED_LANGUAGES).length} languages`)
    )
  }

  /**
   * Validates configuration files and directory structure
   *
   * @param options - Validation command options
   *
   * @remarks
   * Performs comprehensive validation including:
   * - Configuration file syntax and schema validation
   * - Source directory structure and permissions
   * - File accessibility and markdown detection
   * - Warning reporting for potential issues
   *
   * @example
   * ```typescript
   * await cli.handleValidateCommand({
   *   config: './dx-translate.config.js',
   *   source: './docs'
   * })
   * ```
   *
   * @throws {@link Error} When validation encounters critical errors
   *
   * @public
   */
  private async handleValidateCommand(
    options: ValidateCommandOptions
  ): Promise<void> {
    try {
      console.log(chalk.blue.bold('🔍 Validation Results'))
      console.log('')

      let hasValidationFailures = false

      if (options.config) {
        // Validate configuration file
        console.log(
          chalk.gray(`📋 Validating configuration: ${options.config}`)
        )
        const config = await ConfigurationService.loadFromFile(
          resolve(options.config)
        )

        const configService = new ConfigurationService()
        const result = configService.validateJob(config)

        if (result.valid) {
          console.log(chalk.green('✅ Configuration is valid'))
        } else {
          console.log(chalk.red('❌ Configuration validation failed:'))
          result.errors.forEach((error) => {
            console.error(chalk.red(`   • ${error.message}`))
          })
          hasValidationFailures = true
        }
      }

      if (options.source) {
        // Validate file structure
        console.log(
          chalk.gray(`📁 Validating file structure: ${options.source}`)
        )
        const configService = new ConfigurationService()
        const result = await configService.validateFileStructure(options.source)

        if (result.valid) {
          console.log(chalk.green('✅ File structure is valid'))
        } else {
          console.log(chalk.red('❌ File structure validation failed:'))
          result.errors.forEach((error) => {
            console.error(chalk.red(`   • ${error.message}`))
          })
          hasValidationFailures = true
        }

        if (result.warnings.length > 0) {
          console.log(chalk.yellow('⚠️  Warnings:'))
          result.warnings.forEach((warning) => {
            console.log(chalk.yellow(`   • ${warning.message}`))
          })
        }
      }

      if (hasValidationFailures) {
        process.exit(1)
      }
    } catch (error) {
      console.error(chalk.red('❌ Validation failed:'), error)
      process.exit(1)
    }
  }

  /**
   * Initializes translation configuration for documentation projects
   *
   * @param options - Initialization command options
   *
   * @remarks
   * Creates framework-specific configuration including:
   * - VitePress configuration with proper routing structure
   * - Docusaurus configuration with i18n support
   * - Default configuration for generic projects
   * - Configuration file generation in project root
   *
   * @example
   * ```typescript
   * await cli.handleInitCommand({
   *   source: './docs',
   *   target: './docs',
   *   languages: 'es,fr,de',
   *   vitepress: true
   * })
   * ```
   *
   * @throws {@link Error} When configuration creation or file writing fails
   *
   * @public
   */
  private async handleInitCommand(options: InitCommandOptions): Promise<void> {
    try {
      console.log(chalk.blue.bold('🎉 Initializing Translation Configuration'))
      console.log('')

      const sourceDir = resolve(options.source || '.')
      const targetDir = resolve(options.target || '.')
      const languages = this.parseLanguages(options.languages)

      let config: TranslationJobConfig

      if (options.vitepress) {
        config = ConfigurationService.createVitePressConfig(
          sourceDir,
          languages
        )
        console.log(chalk.green('📚 Created VitePress configuration'))
      } else if (options.docusaurus) {
        config = ConfigurationService.createDocusaurusConfig(
          sourceDir,
          languages
        )
        console.log(chalk.green('📚 Created Docusaurus configuration'))
      } else {
        config = ConfigurationService.createDefaultConfig(
          sourceDir,
          targetDir,
          languages
        )
        console.log(chalk.green('📚 Created default configuration'))
      }

      // Save configuration file
      const configPath = join(process.cwd(), 'dx-translate.config.js')
      const configContent = `export default ${JSON.stringify(config, null, 2)}`

      await fs.writeFile(configPath, configContent, 'utf-8')

      console.log(chalk.green(`✅ Configuration saved to: ${configPath}`))
      console.log('')
      console.log(chalk.gray('To translate your documentation, run:'))
      console.log(chalk.cyan(`dx-translate translate --config ${configPath}`))
    } catch (error) {
      console.error(chalk.red('❌ Initialization failed:'), error)
      process.exit(1)
    }
  }

  /**
   * Removes existing translations from target directories
   *
   * @param options - Clean command options
   *
   * @remarks
   * Safely removes translated files while preserving:
   * - Source documentation files
   * - Non-markdown assets and resources
   * - Directory structure for future translations
   *
   * @example
   * ```typescript
   * await cli.handleCleanCommand({
   *   target: './docs',
   *   languages: 'es,fr',
   *   force: true
   * })
   * ```
   *
   * @throws {@link Error} When file deletion fails or access is denied
   *
   * @public
   */
  private async handleCleanCommand(
    options: CleanCommandOptions
  ): Promise<void> {
    try {
      console.log(chalk.blue.bold('🧹 Cleaning Translations'))
      console.log('')

      const targetDir = resolve(options.target)
      const languages = this.parseLanguages(options.languages)

      console.log(chalk.gray(`Target directory: ${targetDir}`))
      console.log(chalk.gray(`Languages: ${languages.join(', ')}`))
      console.log('')

      const { FileProcessingService } = await import(
        '../services/FileProcessingService.js'
      )
      const fileService = new FileProcessingService()

      await fileService.cleanTargetDirectory(
        {
          sourceDir: '',
          targetDir,
          preserveStructure: true,
          overwriteExisting: true,
        },
        languages
      )

      console.log(chalk.green('✅ Translations cleaned successfully'))
    } catch (error) {
      console.error(chalk.red('❌ Clean failed:'), error)
      process.exit(1)
    }
  }

  /**
   * Reports translation status and progress statistics
   *
   * @param options - Status command options
   *
   * @remarks
   * Provides comprehensive project status including:
   * - Source directory analysis with file counts and sizes
   * - Per-language translation completion percentages
   * - Missing translations and coverage gaps
   * - File size and character count statistics
   *
   * @example
   * ```typescript
   * await cli.handleStatusCommand({
   *   source: './docs',
   *   target: './docs',
   *   languages: 'es,fr,de'
   * })
   * ```
   *
   * @throws {@link Error} When directory analysis fails
   *
   * @public
   */
  private async handleStatusCommand(
    options: StatusCommandOptions
  ): Promise<void> {
    try {
      console.log(chalk.blue.bold('📊 Translation Status'))
      console.log('')

      const sourceDir = resolve(options.source || '.')
      const targetDir = resolve(options.target || '.')
      const languages = this.parseLanguages(options.languages)

      const { FileProcessingService } = await import(
        '../services/FileProcessingService.js'
      )
      const fileService = new FileProcessingService()

      // Get source files info
      const sourceInfo = await fileService.getDirectoryInfo(sourceDir)
      console.log(chalk.cyan('Source Directory:'))
      console.log(`   📁 ${sourceDir}`)
      console.log(`   📄 ${sourceInfo.markdownFiles} markdown files`)
      console.log(`   💾 ${Math.round(sourceInfo.totalSize / 1024)} KB`)
      console.log('')

      // Check each language
      console.log(chalk.cyan('Translation Status:'))
      for (const lang of languages) {
        const langDir = join(targetDir, lang)
        try {
          const langInfo = await fileService.getDirectoryInfo(langDir)
          const percentage = Math.round(
            (langInfo.markdownFiles / sourceInfo.markdownFiles) * 100
          )

          console.log(
            `   ${chalk.green(lang.padEnd(8))} ${langInfo.markdownFiles}/${sourceInfo.markdownFiles} files (${percentage}%)`
          )
        } catch {
          console.log(`   ${chalk.red(lang.padEnd(8))} Not translated`)
        }
      }
    } catch (error) {
      console.error(chalk.red('❌ Status check failed:'), error)
      process.exit(1)
    }
  }

  /**
   * Creates translation configuration from command-line options
   *
   * @param options - CLI options from translate command
   * @returns Complete translation job configuration
   *
   * @remarks
   * Converts CLI arguments into a structured configuration object
   * compatible with {@link ConfigurationService}. Handles path resolution,
   * language parsing, and default value assignment.
   *
   * @example
   * ```typescript
   * const config = cli.createConfigFromOptions({
   *   source: './docs',
   *   target: './translations',
   *   languages: 'es,fr,de'
   * })
   * ```
   *
   * @private
   */
  private createConfigFromOptions(
    options: TranslateCommandOptions
  ): TranslationJobConfig {
    const sourceDir = resolve(options.source || options.input || '.')
    const targetDir = resolve(
      options.target || options.output || './translations'
    )
    const languages = this.parseLanguages(options.languages)

    return ConfigurationService.createDefaultConfig(
      sourceDir,
      targetDir,
      languages
    )
  }

  /**
   * Parses comma-separated language codes into validated array
   *
   * @param languagesStr - Comma-separated language codes or undefined
   * @returns Array of validated supported language codes
   *
   * @remarks
   * Processes language input with:
   * - Comma-based splitting and whitespace trimming
   * - Empty string filtering for clean results
   * - Default to all supported languages when undefined
   * - Type casting to ensure SupportedLanguageCode compliance
   *
   * @example
   * ```typescript
   * const languages = cli.parseLanguages('es, fr, de')
   * // Returns: ['es', 'fr', 'de']
   *
   * const allLanguages = cli.parseLanguages(undefined)
   * // Returns: ['ar', 'zh-cn', 'es', 'pt', 'fr', 'de', ...]
   * ```
   *
   * @private
   */
  private parseLanguages(
    languagesStr: string | undefined
  ): SupportedLanguageCode[] {
    if (!languagesStr) {
      return Object.keys(SUPPORTED_LANGUAGES) as SupportedLanguageCode[]
    }

    return languagesStr
      .split(',')
      .map((lang) => lang.trim())
      .filter((lang) => lang.length > 0) as SupportedLanguageCode[]
  }

  /**
   * Displays formatted configuration summary for user review
   *
   * @param config - Translation job configuration to display
   *
   * @remarks
   * Shows key configuration details including:
   * - Source and target directory paths
   * - Target languages list
   * - Translation strategy selection
   * - Overwrite behavior setting
   *
   * @example
   * ```typescript
   * cli.showConfigSummary(config)
   * // Output:
   * // 📋 Configuration Summary:
   * //    Source: /path/to/docs
   * //    Target: /path/to/translations
   * //    Languages: es, fr, de
   * //    Strategy: file-by-file
   * //    Overwrite: No
   * ```
   *
   * @private
   */
  private showConfigSummary(config: TranslationJobConfig): void {
    console.log(chalk.cyan('📋 Configuration Summary:'))
    console.log(`   Source: ${config.fileProcessing.sourceDir}`)
    console.log(`   Target: ${config.fileProcessing.targetDir}`)
    console.log(`   Languages: ${config.targetLanguages.join(', ')}`)
    console.log(`   Strategy: ${config.strategy}`)
    console.log(
      `   Overwrite: ${config.fileProcessing.overwriteExisting ? 'Yes' : 'No'}`
    )
    console.log('')
  }

  /**
   * Displays comprehensive translation results and statistics
   *
   * @param result - Batch translation result from strategy execution
   *
   * @remarks
   * Presents detailed translation outcome including:
   * - Success/failure file counts and percentages
   * - Total duration and performance metrics
   * - Character count and translation volume
   * - Failed file details with error messages (up to 10 files)
   * - Overall success status with appropriate styling
   *
   * @example
   * ```typescript
   * cli.showResults(result)
   * // Output:
   * // 📊 Translation Results:
   * //    ✅ Successful: 45/50 files
   * //    ❌ Failed: 5 files
   * //    🌍 Languages: 3
   * //    ⏱️  Duration: 120s
   * //    📝 Characters: 125,000
   * ```
   *
   * @private
   */
  private showResults(result: BatchTranslationResult): void {
    console.log('')
    console.log(chalk.cyan('📊 Translation Results:'))
    console.log(
      `   ✅ Successful: ${result.stats.successfulFiles}/${result.stats.totalFiles} files`
    )
    console.log(`   ❌ Failed: ${result.stats.failedFiles} files`)
    console.log(`   🌍 Languages: ${result.stats.totalLanguages}`)
    console.log(`   ⏱️  Duration: ${Math.round(result.totalDuration / 1000)}s`)
    console.log(
      `   📝 Characters: ${result.stats.totalCharacters.toLocaleString()}`
    )
    console.log('')

    if (result.success) {
      console.log(chalk.green.bold('🎉 Translation completed successfully!'))
    } else {
      console.log(
        chalk.yellow.bold('⚠️  Translation completed with some failures')
      )

      // Show failed files
      const failedFiles = result.fileResults.filter((r) => !r.success)
      if (failedFiles.length > 0 && failedFiles.length <= 10) {
        console.log(chalk.red('Failed files:'))
        failedFiles.forEach((result) => {
          console.log(
            chalk.red(
              `   • ${result.context.targetLanguage}/${result.context.sourceFile}: ${result.error}`
            )
          )
        })
      }
    }
  }

  /**
   * Starts the CLI application and processes command-line arguments
   *
   * @remarks
   * Main entry point for CLI execution. Parses process.argv using Commander.js
   * and routes to appropriate command handlers. Handles argument validation
   * and provides help output for invalid commands.
   *
   * @example
   * ```typescript
   * const cli = new TranslationCLI()
   * await cli.run()
   * ```
   *
   * @throws When command parsing or execution fails
   *
   * @public
   */
  async run(): Promise<void> {
    await this.program.parseAsync(process.argv)
  }
}

// Run CLI if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const cli = new TranslationCLI()
  cli.run().catch((error) => {
    console.error(chalk.red('Fatal error:'), error)
    process.exit(1)
  })
}

export { TranslationCLI, CLIProgressHandler }
