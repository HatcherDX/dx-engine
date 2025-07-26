#!/usr/bin/env node

import { Command } from 'commander'
import chalk from 'chalk'
import ora from 'ora'
import { promises as fs } from 'fs'
import { resolve, join } from 'path'
import type {
  TranslationJobConfig,
  SupportedLanguageCode,
  TranslationProgress,
} from '../types/index.js'
import { SUPPORTED_LANGUAGES } from '../types/index.js'
import { ConfigurationService } from '../config/ConfigurationService.js'
import { FileByFileStrategy } from '../strategies/FileByFileStrategy.js'
import { TranslationSystemError } from '../types/index.js'

/**
 * CLI Progress Handler
 */
class CLIProgressHandler {
  private spinner = ora()
  private startTime = Date.now()

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

  private createProgressBar(progress: number): string {
    const width = 20
    const filled = Math.round((progress / 100) * width)
    const empty = width - filled
    const bar = '█'.repeat(filled) + '░'.repeat(empty)
    return chalk.cyan(`[${bar}] ${Math.round(progress)}%`)
  }

  stop(): void {
    if (this.spinner.isSpinning) {
      this.spinner.stop()
    }
  }

  fail(message: string): void {
    this.spinner.fail(chalk.red(message))
  }
}

/**
 * CLI Application
 */
class TranslationCLI {
  private program: Command

  constructor() {
    this.program = new Command()
    this.setupCommands()
  }

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
   * Handle translate command
   */
  private async handleTranslateCommand(options: any): Promise<void> {
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
   * Handle languages command
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
   * Handle validate command
   */
  private async handleValidateCommand(options: any): Promise<void> {
    try {
      console.log(chalk.blue.bold('🔍 Validation Results'))
      console.log('')

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
        }

        if (result.warnings.length > 0) {
          console.log(chalk.yellow('⚠️  Warnings:'))
          result.warnings.forEach((warning) => {
            console.log(chalk.yellow(`   • ${warning.message}`))
          })
        }
      }
    } catch (error) {
      console.error(chalk.red('❌ Validation failed:'), error)
      process.exit(1)
    }
  }

  /**
   * Handle init command
   */
  private async handleInitCommand(options: any): Promise<void> {
    try {
      console.log(chalk.blue.bold('🎉 Initializing Translation Configuration'))
      console.log('')

      const sourceDir = resolve(options.source)
      const targetDir = resolve(options.target)
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
   * Handle clean command
   */
  private async handleCleanCommand(options: any): Promise<void> {
    try {
      console.log(chalk.blue.bold('🧹 Cleaning Translations'))
      console.log('')

      const targetDir = resolve(options.target)
      const languages = this.parseLanguages(options.languages)

      console.log(chalk.gray(`Target directory: ${targetDir}`))
      console.log(chalk.gray(`Languages: ${languages.join(', ')}`))
      console.log('')

      const fileService = new (
        await import('../services/FileProcessingService.js')
      ).FileProcessingService()

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
   * Handle status command
   */
  private async handleStatusCommand(options: any): Promise<void> {
    try {
      console.log(chalk.blue.bold('📊 Translation Status'))
      console.log('')

      const sourceDir = resolve(options.source)
      const targetDir = resolve(options.target)
      const languages = this.parseLanguages(options.languages)

      const fileService = new (
        await import('../services/FileProcessingService.js')
      ).FileProcessingService()

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
   * Create configuration from CLI options
   */
  private createConfigFromOptions(options: any): TranslationJobConfig {
    const sourceDir = resolve(options.source)
    const targetDir = resolve(options.target)
    const languages = this.parseLanguages(options.languages)

    return ConfigurationService.createDefaultConfig(
      sourceDir,
      targetDir,
      languages
    )
  }

  /**
   * Parse language codes from string
   */
  private parseLanguages(languagesStr: string): SupportedLanguageCode[] {
    return languagesStr
      .split(',')
      .map((lang) => lang.trim())
      .filter((lang) => lang.length > 0) as SupportedLanguageCode[]
  }

  /**
   * Show configuration summary
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
   * Show translation results
   */
  private showResults(
    result: import('../types/index.js').BatchTranslationResult
  ): void {
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
   * Run the CLI
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

export { TranslationCLI }
