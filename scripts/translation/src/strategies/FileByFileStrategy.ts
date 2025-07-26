import type {
  ITranslationStrategy,
  TranslationJobConfig,
  BatchTranslationResult,
  FileTranslationContext,
  FileTranslationResult,
  ProgressCallback,
  TranslationProgress,
  TranslationStats,
} from '../types/index.js'
import { TranslationService } from '../services/TranslationService.js'
import { FileProcessingService } from '../services/FileProcessingService.js'
import { MarkdownProtectionService } from '../services/MarkdownProtectionService.js'
import {
  TranslationSystemError,
  TRANSLATION_ERROR_CODES,
} from '../types/index.js'

/**
 * File-by-file translation strategy
 * Processes one file across all languages before moving to the next file
 * This ensures completeness and consistency across all languages
 */
export class FileByFileStrategy implements ITranslationStrategy {
  private translationService: TranslationService | null = null
  private fileProcessingService: FileProcessingService
  private protectionService: MarkdownProtectionService

  constructor(
    fileProcessingService?: FileProcessingService,
    protectionService?: MarkdownProtectionService
  ) {
    this.fileProcessingService =
      fileProcessingService || new FileProcessingService()
    this.protectionService =
      protectionService || new MarkdownProtectionService()
  }

  /**
   * Execute the file-by-file translation strategy
   */
  async execute(
    job: TranslationJobConfig,
    progressCallback?: ProgressCallback
  ): Promise<BatchTranslationResult> {
    const startTime = Date.now()
    let fileResults: FileTranslationResult[] = []

    try {
      // Initialize services
      this.translationService = new TranslationService(
        job.translatorConfig,
        this.protectionService
      )

      // Get source files
      const sourceFiles = await this.fileProcessingService.getSourceFiles(
        job.fileProcessing
      )

      if (sourceFiles.length === 0) {
        throw new TranslationSystemError(
          'No source files found to translate',
          TRANSLATION_ERROR_CODES.FILE_NOT_FOUND,
          job.fileProcessing.sourceDir
        )
      }

      // Clean existing translations if needed
      if (job.fileProcessing.overwriteExisting) {
        await this.fileProcessingService.cleanTargetDirectory(
          job.fileProcessing,
          job.targetLanguages
        )
      }

      // Calculate totals for progress tracking
      const totalFiles = sourceFiles.length
      const totalLanguages = job.targetLanguages.length
      const totalTranslations = totalFiles * totalLanguages

      // Clean existing translations to prevent corruption from previous system
      this.reportProgress(progressCallback, {
        phase: 'cleaning',
        filesCompleted: 0,
        totalFiles,
        languagesCompleted: 0,
        totalLanguages,
        overallProgress: 0,
        timeElapsed: 0,
        message: `[${new Date().toISOString()}] Cleaning existing translations to prevent corruption`,
      })

      await this.cleanExistingTranslations(job.fileProcessing.targetDir)

      // Report initial progress
      this.reportProgress(progressCallback, {
        phase: 'initialization',
        filesCompleted: 0,
        totalFiles,
        languagesCompleted: 0,
        totalLanguages,
        overallProgress: 0,
        timeElapsed: 0,
        message: `[${new Date().toISOString()}] Starting translation of ${totalFiles} files to ${totalLanguages} languages`,
      })

      // Process each file across all languages
      for (let fileIndex = 0; fileIndex < sourceFiles.length; fileIndex++) {
        const sourceFile = sourceFiles[fileIndex]!
        const relativeFile = sourceFile

        this.reportProgress(progressCallback, {
          phase: 'protection',
          currentFile: relativeFile,
          filesCompleted: fileIndex,
          totalFiles,
          languagesCompleted: 0,
          totalLanguages,
          overallProgress: (fileIndex / totalFiles) * 100,
          timeElapsed: Date.now() - startTime,
          message: `[${new Date().toISOString()}] Processing file ${fileIndex + 1}/${totalFiles}: ${relativeFile}`,
        })

        // Read and protect source content once
        const sourceFilePath = `${job.fileProcessing.sourceDir}/${relativeFile}`
        const originalContent =
          await this.fileProcessingService.readSourceFile(sourceFilePath)
        const protectedContent = this.protectionService.protect(
          originalContent,
          job.markdownProtection
        )

        // Prepare translation tasks for all languages
        const translationTasks = job.targetLanguages.map(
          (targetLanguage, langIndex) => ({
            targetLanguage,
            langIndex,
            targetFile: this.fileProcessingService.generateTargetPath(
              sourceFilePath,
              targetLanguage,
              job.fileProcessing
            ),
            context: {
              sourceFile: sourceFilePath,
              targetFile: this.fileProcessingService.generateTargetPath(
                sourceFilePath,
                targetLanguage,
                job.fileProcessing
              ),
              sourceLanguage: job.sourceLanguage,
              targetLanguage,
              originalContent,
              protectedContent,
            } as FileTranslationContext,
          })
        )

        // Process languages with controlled concurrency
        const maxConcurrency = job.strategyConfig.maxConcurrency || 1
        const semaphore = new Array(maxConcurrency).fill(null)

        const results = await Promise.all(
          translationTasks.map(async (task, taskIndex) => {
            // Wait for available slot
            const slotIndex = taskIndex % maxConcurrency
            await semaphore[slotIndex]

            // Create slot promise for next task
            const slotPromise = this.processLanguageTranslation(
              task,
              fileIndex,
              totalFiles,
              totalLanguages,
              totalTranslations,
              startTime,
              relativeFile,
              job,
              progressCallback
            )

            semaphore[slotIndex] = slotPromise
            return slotPromise
          })
        )

        // Add all results to fileResults
        fileResults.push(...results)
      }

      // Generate final statistics
      const totalDuration = Date.now() - startTime
      const stats = this.generateStats(fileResults, totalDuration)

      this.reportProgress(progressCallback, {
        phase: 'complete',
        filesCompleted: totalFiles,
        totalFiles,
        languagesCompleted: totalLanguages,
        totalLanguages,
        overallProgress: 100,
        timeElapsed: totalDuration,
        message: `[${new Date().toISOString()}] Translation complete! ${stats.successfulFiles}/${stats.totalFiles} files translated successfully`,
      })

      return {
        success: stats.failedFiles === 0,
        fileResults,
        totalDuration,
        stats,
      }
    } catch (error) {
      const totalDuration = Date.now() - startTime
      const stats = this.generateStats(fileResults, totalDuration)

      throw new TranslationSystemError(
        `File-by-file translation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        TRANSLATION_ERROR_CODES.TRANSLATION_FAILED,
        undefined,
        error
      )
    } finally {
      // Cleanup resources - moved to end of entire process
      if (this.translationService) {
        await this.translationService.close()
        this.translationService = null
      }
    }
  }

  /**
   * Generate translation statistics
   */
  private generateStats(
    results: FileTranslationResult[],
    totalDuration: number
  ): TranslationStats {
    const totalFiles = new Set(results.map((r) => r.context.sourceFile)).size
    const successfulFiles = results.filter((r) => r.success).length
    const failedFiles = results.filter((r) => !r.success).length
    const totalLanguages = new Set(results.map((r) => r.context.targetLanguage))
      .size
    const totalTranslations = results.length
    const totalCharacters = results
      .filter((r) => r.success && r.translatedContent)
      .reduce((sum, r) => sum + r.translatedContent!.length, 0)

    return {
      totalFiles,
      successfulFiles: Math.floor(successfulFiles / totalLanguages), // Files successfully translated to all languages
      failedFiles: totalFiles - Math.floor(successfulFiles / totalLanguages),
      totalLanguages,
      totalTranslations,
      averageTimePerFile: totalFiles > 0 ? totalDuration / totalFiles : 0,
      totalCharacters,
    }
  }

  /**
   * Report progress to callback if provided
   */
  private reportProgress(
    callback: ProgressCallback | undefined,
    progress: TranslationProgress
  ): void {
    if (callback) {
      // Calculate estimated time remaining
      if (progress.overallProgress > 0 && progress.timeElapsed > 0) {
        const estimatedTotal =
          (progress.timeElapsed / progress.overallProgress) * 100
        progress = {
          ...progress,
          estimatedTimeRemaining: Math.max(
            0,
            estimatedTotal - progress.timeElapsed
          ),
        }
      }

      callback(progress)
    }
  }

  /**
   * Process translation for a single language
   */
  private async processLanguageTranslation(
    task: any,
    fileIndex: number,
    totalFiles: number,
    totalLanguages: number,
    totalTranslations: number,
    startTime: number,
    relativeFile: string,
    job: any,
    progressCallback?: (progress: TranslationProgress) => void
  ): Promise<FileTranslationResult> {
    const { targetLanguage, langIndex, context } = task

    this.reportProgress(progressCallback, {
      phase: 'translation',
      currentFile: relativeFile,
      currentLanguage: targetLanguage,
      filesCompleted: fileIndex,
      totalFiles,
      languagesCompleted: langIndex,
      totalLanguages,
      overallProgress:
        ((fileIndex * totalLanguages + langIndex) / totalTranslations) * 100,
      timeElapsed: Date.now() - startTime,
      message: `[${new Date().toISOString()}] Translating ${relativeFile} to ${targetLanguage}`,
    })

    // Check if we should skip existing files
    if (!job.fileProcessing.overwriteExisting) {
      const shouldOverwrite = await this.fileProcessingService.shouldOverwrite(
        context.targetFile,
        job.fileProcessing
      )

      if (!shouldOverwrite) {
        return {
          context,
          success: true,
          translatedContent: context.originalContent,
          duration: 0,
          retries: 0,
        }
      }
    }

    // Add small delay before translation
    if (
      job.strategyConfig.delayBetweenTranslations &&
      job.strategyConfig.delayBetweenTranslations > 0
    ) {
      await this.delay(job.strategyConfig.delayBetweenTranslations)
    }

    // Perform translation
    if (!this.translationService) {
      throw new Error('Translation service not initialized')
    }
    const result = await this.translationService.translateFile(context)

    // Write translated file if successful
    if (result.success) {
      this.reportProgress(progressCallback, {
        phase: 'writing',
        currentFile: relativeFile,
        currentLanguage: targetLanguage,
        filesCompleted: fileIndex,
        totalFiles,
        languagesCompleted: langIndex + 1,
        totalLanguages,
        overallProgress:
          ((fileIndex * totalLanguages + langIndex + 1) / totalTranslations) *
          100,
        timeElapsed: Date.now() - startTime,
        message: `[${new Date().toISOString()}] Writing ${targetLanguage}/${relativeFile}`,
      })

      await this.fileProcessingService.writeTranslatedFile(result)
    }

    return result
  }

  /**
   * Clean existing translations to prevent corruption from previous system
   */
  private async cleanExistingTranslations(docsDir: string): Promise<void> {
    const fs = await import('fs')
    const path = await import('path')

    const LANGUAGE_CODES = [
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

    let removedCount = 0

    for (const langCode of LANGUAGE_CODES) {
      const langDir = path.join(docsDir, langCode)

      if (fs.existsSync(langDir)) {
        try {
          fs.rmSync(langDir, { recursive: true, force: true })
          removedCount++
        } catch (error) {
          console.warn(`Failed to remove ${langCode}/:`, error)
        }
      }
    }

    if (removedCount > 0) {
      console.log(
        `🗑️  Cleaned ${removedCount} existing translation directories`
      )
    }
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}
