import { promises as fs } from 'fs'
import { join, dirname, basename, extname, relative } from 'path'
import { glob } from 'glob'
import type {
  FileProcessingServiceInterface,
  FileProcessingConfig,
  FileTranslationResult,
  ValidationResult,
  ValidationError,
} from '../types/index.js'
import {
  TranslationSystemError,
  TRANSLATION_ERROR_CODES,
} from '../types/index.js'

/**
 * Professional file processing service for handling markdown files
 * and directory operations with validation and error handling
 */
export class FileProcessingService implements FileProcessingServiceInterface {
  /**
   * Get list of source markdown files based on configuration
   */
  async getSourceFiles(config: FileProcessingConfig): Promise<string[]> {
    try {
      // Validate source directory exists
      await this.validateDirectory(config.sourceDir)

      // Default patterns if not specified
      const includePatterns = config.includePatterns || ['**/*.md']
      const excludePatterns = config.excludePatterns || [
        '**/node_modules/**',
        '**/dist/**',
        '**/build/**',
        '**/.git/**',
        '**/test-*.md',
        '**/*test*.md',
        '**/*.test.md',
      ]

      // Find all files matching include patterns
      const allFiles: string[] = []

      for (const pattern of includePatterns) {
        const matchedFiles = await glob(pattern, {
          cwd: config.sourceDir,
          absolute: false,
          ignore: excludePatterns,
        })

        allFiles.push(...matchedFiles)
      }

      // Remove duplicates and sort
      const uniqueFiles = [...new Set(allFiles)].sort()

      // Validate files exist and are readable
      const validFiles: string[] = []

      for (const file of uniqueFiles) {
        const fullPath = join(config.sourceDir, file)

        try {
          const stats = await fs.stat(fullPath)

          if (stats.isFile() && this.isMarkdownFile(file)) {
            // Verify file is readable
            await fs.access(fullPath, fs.constants.R_OK)
            validFiles.push(file)
          }
        } catch (error) {
          console.warn(`Skipping inaccessible file: ${file}`)
        }
      }

      if (validFiles.length === 0) {
        throw new TranslationSystemError(
          'No valid markdown files found in source directory',
          TRANSLATION_ERROR_CODES.FILE_NOT_FOUND,
          config.sourceDir
        )
      }

      return validFiles
    } catch (error) {
      if (error instanceof TranslationSystemError) {
        throw error
      }

      throw new TranslationSystemError(
        `Failed to get source files: ${error instanceof Error ? error.message : 'Unknown error'}`,
        TRANSLATION_ERROR_CODES.DIRECTORY_NOT_FOUND,
        config.sourceDir,
        error
      )
    }
  }

  /**
   * Ensure target directory exists and create if necessary
   */
  async ensureTargetDirectory(targetPath: string): Promise<void> {
    try {
      const targetDir = dirname(targetPath)

      // Create directory recursively if it doesn't exist
      await fs.mkdir(targetDir, { recursive: true })

      // Verify directory is writable
      await fs.access(targetDir, fs.constants.W_OK)
    } catch (error) {
      throw new TranslationSystemError(
        `Failed to ensure target directory: ${error instanceof Error ? error.message : 'Unknown error'}`,
        TRANSLATION_ERROR_CODES.DIRECTORY_NOT_FOUND,
        targetPath,
        error
      )
    }
  }

  /**
   * Write translated file to disk
   */
  async writeTranslatedFile(result: FileTranslationResult): Promise<void> {
    try {
      if (!result.success || !result.translatedContent) {
        throw new TranslationSystemError(
          'Cannot write failed translation result',
          TRANSLATION_ERROR_CODES.FILE_WRITE_FAILED,
          result.context.targetFile
        )
      }

      // Ensure target directory exists
      await this.ensureTargetDirectory(result.context.targetFile)

      // Write translated content
      await fs.writeFile(
        result.context.targetFile,
        result.translatedContent,
        'utf-8'
      )

      // Verify file was written correctly
      const writtenContent = await fs.readFile(
        result.context.targetFile,
        'utf-8'
      )

      if (writtenContent !== result.translatedContent) {
        throw new TranslationSystemError(
          'File verification failed - content mismatch',
          TRANSLATION_ERROR_CODES.FILE_WRITE_FAILED,
          result.context.targetFile
        )
      }
    } catch (error) {
      if (error instanceof TranslationSystemError) {
        throw error
      }

      throw new TranslationSystemError(
        `Failed to write translated file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        TRANSLATION_ERROR_CODES.FILE_WRITE_FAILED,
        result.context.targetFile,
        error
      )
    }
  }

  /**
   * Read content from source file
   */
  async readSourceFile(filePath: string): Promise<string> {
    try {
      await fs.access(filePath, fs.constants.R_OK)
      const content = await fs.readFile(filePath, 'utf-8')

      if (content.trim() === '') {
        throw new TranslationSystemError(
          'Source file is empty',
          TRANSLATION_ERROR_CODES.INVALID_MARKDOWN,
          filePath
        )
      }

      return content
    } catch (error) {
      if (error instanceof TranslationSystemError) {
        throw error
      }

      throw new TranslationSystemError(
        `Failed to read source file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        TRANSLATION_ERROR_CODES.FILE_NOT_FOUND,
        filePath,
        error
      )
    }
  }

  /**
   * Generate target file path for translated content
   */
  generateTargetPath(
    sourceFile: string,
    languageCode: string,
    config: FileProcessingConfig
  ): string {
    if (config.preserveStructure) {
      // Preserve directory structure: docs/guide/intro.md -> docs/es/guide/intro.md
      const relativePath = relative(config.sourceDir, sourceFile)
      const targetPath = join(config.targetDir, languageCode, relativePath)
      return targetPath
    } else {
      // Flat structure: docs/guide/intro.md -> docs/es/intro.md
      const fileName = basename(sourceFile)
      return join(config.targetDir, languageCode, fileName)
    }
  }

  /**
   * Check if file should be overwritten
   */
  async shouldOverwrite(
    targetPath: string,
    config: FileProcessingConfig
  ): Promise<boolean> {
    if (config.overwriteExisting) {
      return true
    }

    try {
      await fs.access(targetPath)
      return false // File exists and overwrite is disabled
    } catch {
      return true // File doesn't exist, safe to write
    }
  }

  /**
   * Get file statistics
   */
  async getFileStats(filePath: string): Promise<{
    size: number
    lines: number
    characters: number
    words: number
  }> {
    try {
      const stats = await fs.stat(filePath)
      const content = await fs.readFile(filePath, 'utf-8')

      return {
        size: stats.size,
        lines: content.split('\n').length,
        characters: content.length,
        words: content.split(/\s+/).filter((word) => word.length > 0).length,
      }
    } catch (error) {
      throw new TranslationSystemError(
        `Failed to get file stats: ${error instanceof Error ? error.message : 'Unknown error'}`,
        TRANSLATION_ERROR_CODES.FILE_NOT_FOUND,
        filePath,
        error
      )
    }
  }

  /**
   * Validate directory exists and is accessible
   */
  private async validateDirectory(dirPath: string): Promise<void> {
    try {
      const stats = await fs.stat(dirPath)

      if (!stats.isDirectory()) {
        throw new TranslationSystemError(
          'Path is not a directory',
          TRANSLATION_ERROR_CODES.DIRECTORY_NOT_FOUND,
          dirPath
        )
      }

      // Check read access
      await fs.access(dirPath, fs.constants.R_OK)
    } catch (error) {
      if (error instanceof TranslationSystemError) {
        throw error
      }

      throw new TranslationSystemError(
        `Directory validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        TRANSLATION_ERROR_CODES.DIRECTORY_NOT_FOUND,
        dirPath,
        error
      )
    }
  }

  /**
   * Check if file is a markdown file
   */
  private isMarkdownFile(filePath: string): boolean {
    const ext = extname(filePath).toLowerCase()
    return ext === '.md' || ext === '.markdown'
  }

  /**
   * Validate file processing configuration
   */
  validateConfig(config: FileProcessingConfig): ValidationResult {
    const errors: ValidationError[] = []

    // Validate source directory
    if (!config.sourceDir || config.sourceDir.trim() === '') {
      errors.push({
        code: 'MISSING_SOURCE_DIR',
        message: 'Source directory is required',
      })
    }

    // Validate target directory
    if (!config.targetDir || config.targetDir.trim() === '') {
      errors.push({
        code: 'MISSING_TARGET_DIR',
        message: 'Target directory is required',
      })
    }

    // Validate patterns
    if (config.includePatterns && config.includePatterns.length === 0) {
      errors.push({
        code: 'EMPTY_INCLUDE_PATTERNS',
        message: 'Include patterns array cannot be empty',
      })
    }

    // Check for circular paths
    if (config.sourceDir && config.targetDir) {
      const normalizedSource = join(config.sourceDir).replace(/\\/g, '/')
      const normalizedTarget = join(config.targetDir).replace(/\\/g, '/')

      if (
        normalizedTarget.startsWith(normalizedSource + '/') ||
        normalizedSource.startsWith(normalizedTarget + '/')
      ) {
        errors.push({
          code: 'CIRCULAR_PATHS',
          message:
            'Source and target directories cannot be nested within each other',
        })
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings: [],
    }
  }

  /**
   * Clean up target directory (remove existing translations)
   */
  async cleanTargetDirectory(
    config: FileProcessingConfig,
    languageCodes: string[]
  ): Promise<void> {
    try {
      for (const langCode of languageCodes) {
        const langDir = join(config.targetDir, langCode)

        try {
          // Check if directory exists
          await fs.access(langDir)

          // Read all files in the directory
          const files = await fs.readdir(langDir, { withFileTypes: true })

          // Delete all .md files
          for (const file of files) {
            if (file.isFile() && this.isMarkdownFile(file.name)) {
              const filePath = join(langDir, file.name)
              await fs.unlink(filePath)
            }
          }
        } catch (error) {
          // Directory doesn't exist or other error, continue
          if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
            console.warn(
              `Warning cleaning ${langCode} directory: ${error instanceof Error ? error.message : 'Unknown error'}`
            )
          }
        }
      }
    } catch (error) {
      throw new TranslationSystemError(
        `Failed to clean target directory: ${error instanceof Error ? error.message : 'Unknown error'}`,
        TRANSLATION_ERROR_CODES.DIRECTORY_NOT_FOUND,
        config.targetDir,
        error
      )
    }
  }

  /**
   * Get directory size and file count
   */
  async getDirectoryInfo(dirPath: string): Promise<{
    totalFiles: number
    totalSize: number
    markdownFiles: number
  }> {
    try {
      let totalFiles = 0
      let totalSize = 0
      let markdownFiles = 0

      const files = await glob('**/*', {
        cwd: dirPath,
        nodir: true,
        absolute: true,
      })

      for (const file of files) {
        try {
          const stats = await fs.stat(file)
          totalFiles++
          totalSize += stats.size

          if (this.isMarkdownFile(file)) {
            markdownFiles++
          }
        } catch {
          // Skip inaccessible files
        }
      }

      return { totalFiles, totalSize, markdownFiles }
    } catch (error) {
      throw new TranslationSystemError(
        `Failed to get directory info: ${error instanceof Error ? error.message : 'Unknown error'}`,
        TRANSLATION_ERROR_CODES.DIRECTORY_NOT_FOUND,
        dirPath,
        error
      )
    }
  }
}
