/**
 * @fileoverview Comprehensive coverage tests for translation-system main index
 *
 * @description
 * Tests for the main index module including convenience functions
 * translateDocumentation and validateTranslationSetup.
 * These are the primary public API entry points.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  translateDocumentation,
  validateTranslationSetup,
  TranslationCLI,
  ConfigurationService,
  FileByFileStrategy,
  SUPPORTED_LANGUAGES,
  DEFAULT_TRANSLATION_CONFIG,
  TranslationSystemError,
} from './index.js'

// Mock dependencies
vi.mock('./config/ConfigurationService.js', () => {
  const mockCreateDefaultConfig = vi.fn(() => ({
    fileProcessing: {
      sourceDir: './docs',
      targetDir: './translations',
      overwriteExisting: false,
      patterns: ['**/*.md'],
      preserveStructure: true,
    },
    targetLanguages: ['es', 'fr'],
    strategy: 'file-by-file',
    translatorConfig: {
      verbose: false,
      retryAttempts: 3,
      timeout: 30000,
    },
  }))

  const mockValidateFileStructure = vi.fn(() =>
    Promise.resolve({
      valid: true,
      errors: [],
      warnings: [],
    })
  )

  const mockValidateLanguageCodes = vi.fn(() => ({
    valid: true,
    errors: [],
    warnings: [],
  }))

  const MockConfigurationService = vi.fn(() => ({
    validateFileStructure: mockValidateFileStructure,
    validateLanguageCodes: mockValidateLanguageCodes,
  }))

  MockConfigurationService.createDefaultConfig = mockCreateDefaultConfig

  return {
    ConfigurationService: MockConfigurationService,
  }
})

vi.mock('./strategies/FileByFileStrategy.js', () => {
  const mockExecute = vi.fn(() =>
    Promise.resolve({
      success: true,
      stats: {
        successfulFiles: 5,
        totalFiles: 5,
        failedFiles: 0,
        totalLanguages: 2,
        totalCharacters: 1500,
      },
      totalDuration: 3000,
      fileResults: [
        {
          sourceFile: './docs/index.md',
          targetFiles: [
            './translations/es/index.md',
            './translations/fr/index.md',
          ],
          success: true,
          duration: 1000,
          characterCount: 500,
        },
      ],
    })
  )

  const MockFileByFileStrategy = vi.fn(() => ({
    execute: mockExecute,
  }))

  return {
    FileByFileStrategy: MockFileByFileStrategy,
  }
})

describe('Translation System Index - Main API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Module Exports', () => {
    it('should export all required services and classes', () => {
      expect(TranslationCLI).toBeDefined()
      expect(ConfigurationService).toBeDefined()
      expect(FileByFileStrategy).toBeDefined()
    })

    it('should export constants and types', () => {
      expect(SUPPORTED_LANGUAGES).toBeDefined()
      expect(DEFAULT_TRANSLATION_CONFIG).toBeDefined()
      expect(TranslationSystemError).toBeDefined()
      expect(typeof SUPPORTED_LANGUAGES).toBe('object')
      expect(Object.keys(SUPPORTED_LANGUAGES).length).toBeGreaterThan(0)
    })

    it('should export convenience functions', () => {
      expect(typeof translateDocumentation).toBe('function')
      expect(typeof validateTranslationSetup).toBe('function')
    })
  })

  describe('translateDocumentation() - Convenience Function', () => {
    it('should execute translation with minimal parameters', async () => {
      const result = await translateDocumentation('./docs', './translations', [
        'es',
        'fr',
      ])

      expect(result.success).toBe(true)
      expect(result.stats.successfulFiles).toBe(5)
      expect(result.stats.totalLanguages).toBe(2)
      expect(result.fileResults).toHaveLength(1)
    })

    it('should create default configuration correctly', async () => {
      const { ConfigurationService } = await import(
        './config/ConfigurationService.js'
      )

      await translateDocumentation('./source', './target', ['es', 'de'])

      expect(ConfigurationService.createDefaultConfig).toHaveBeenCalledWith(
        './source',
        './target',
        ['es', 'de']
      )
    })

    it('should apply overwriteExisting option', async () => {
      const { FileByFileStrategy } = await import(
        './strategies/FileByFileStrategy.js'
      )
      const mockInstance = new FileByFileStrategy()

      await translateDocumentation('./docs', './translations', ['es'], {
        overwriteExisting: true,
      })

      const executedConfig = vi.mocked(mockInstance.execute).mock.calls[0][0]
      expect(executedConfig.fileProcessing.overwriteExisting).toBe(true)
    })

    it('should apply verbose option', async () => {
      const { FileByFileStrategy } = await import(
        './strategies/FileByFileStrategy.js'
      )
      const mockInstance = new FileByFileStrategy()

      await translateDocumentation('./docs', './translations', ['fr'], {
        verbose: true,
      })

      const executedConfig = vi.mocked(mockInstance.execute).mock.calls[0][0]
      expect(executedConfig.translatorConfig?.verbose).toBe(true)
    })

    it('should handle both overwriteExisting and verbose options', async () => {
      const { FileByFileStrategy } = await import(
        './strategies/FileByFileStrategy.js'
      )
      const mockInstance = new FileByFileStrategy()

      await translateDocumentation('./docs', './translations', ['es', 'fr'], {
        overwriteExisting: false,
        verbose: true,
      })

      const executedConfig = vi.mocked(mockInstance.execute).mock.calls[0][0]
      expect(executedConfig.fileProcessing.overwriteExisting).toBe(false)
      expect(executedConfig.translatorConfig?.verbose).toBe(true)
    })

    it('should pass progress callback to strategy', async () => {
      const { FileByFileStrategy } = await import(
        './strategies/FileByFileStrategy.js'
      )
      const mockInstance = new FileByFileStrategy()
      const mockProgressCallback = vi.fn()

      await translateDocumentation('./docs', './translations', ['es'], {
        onProgress: mockProgressCallback,
      })

      expect(mockInstance.execute).toHaveBeenCalledWith(
        expect.any(Object),
        mockProgressCallback
      )
    })

    it('should work with empty options object', async () => {
      const result = await translateDocumentation(
        './docs',
        './translations',
        ['es'],
        {}
      )

      expect(result.success).toBe(true)
      expect(result.stats).toBeDefined()
    })

    it('should work without options parameter', async () => {
      const result = await translateDocumentation('./docs', './translations', [
        'fr',
      ])

      expect(result.success).toBe(true)
      expect(result.stats.totalLanguages).toBe(2)
    })

    it('should handle single language translation', async () => {
      const result = await translateDocumentation('./docs', './output', ['de'])

      expect(result.success).toBe(true)
      expect(result.fileResults).toHaveLength(1)
    })

    it('should handle multiple languages', async () => {
      const result = await translateDocumentation('./docs', './output', [
        'es',
        'fr',
        'de',
        'ja',
      ])

      expect(result.success).toBe(true)
      expect(result.stats.successfulFiles).toBe(5)
    })

    it('should preserve config structure when no options provided', async () => {
      const { FileByFileStrategy } = await import(
        './strategies/FileByFileStrategy.js'
      )
      const mockInstance = new FileByFileStrategy()

      await translateDocumentation('./docs', './translations', ['es'])

      const executedConfig = vi.mocked(mockInstance.execute).mock.calls[0][0]
      expect(executedConfig.fileProcessing.overwriteExisting).toBe(false)
      expect(executedConfig.translatorConfig?.verbose).toBe(false)
    })
  })

  describe('validateTranslationSetup() - Validation Function', () => {
    it('should validate successful setup', async () => {
      const result = await validateTranslationSetup('./docs', ['es', 'fr'])

      expect(result.valid).toBe(true)
      expect(result.errors).toEqual([])
      expect(result.warnings).toEqual([])
    })

    it('should create ConfigurationService instance', async () => {
      const { ConfigurationService } = await import(
        './config/ConfigurationService.js'
      )

      await validateTranslationSetup('./docs', ['es'])

      expect(ConfigurationService).toHaveBeenCalledTimes(1)
    })

    it('should validate file structure', async () => {
      const { ConfigurationService } = await import(
        './config/ConfigurationService.js'
      )
      const mockInstance = new ConfigurationService()

      await validateTranslationSetup('./source', ['es'])

      expect(mockInstance.validateFileStructure).toHaveBeenCalledWith(
        './source'
      )
    })

    it('should validate language codes', async () => {
      const { ConfigurationService } = await import(
        './config/ConfigurationService.js'
      )
      const mockInstance = new ConfigurationService()

      await validateTranslationSetup('./docs', ['es', 'fr', 'de'])

      expect(mockInstance.validateLanguageCodes).toHaveBeenCalledWith([
        'es',
        'fr',
        'de',
      ])
    })

    it('should handle file structure validation errors', async () => {
      const { ConfigurationService } = await import(
        './config/ConfigurationService.js'
      )
      const mockInstance = new ConfigurationService()

      vi.mocked(mockInstance.validateFileStructure).mockResolvedValueOnce({
        valid: false,
        errors: [{ message: 'No markdown files found' }],
        warnings: [],
      })

      const result = await validateTranslationSetup('./empty', ['es'])

      expect(result.valid).toBe(false)
      expect(result.errors).toEqual([{ message: 'No markdown files found' }])
    })

    it('should handle language validation errors', async () => {
      const { ConfigurationService } = await import(
        './config/ConfigurationService.js'
      )
      const mockInstance = new ConfigurationService()

      vi.mocked(mockInstance.validateLanguageCodes).mockReturnValueOnce({
        valid: false,
        errors: [{ message: 'Invalid language code: invalid' }],
        warnings: [],
      })

      const result = await validateTranslationSetup('./docs', [
        'invalid' as unknown as string,
      ])

      expect(result.valid).toBe(false)
      expect(result.errors).toEqual([
        { message: 'Invalid language code: invalid' },
      ])
    })

    it('should combine errors from both validations', async () => {
      const { ConfigurationService } = await import(
        './config/ConfigurationService.js'
      )
      const mockInstance = new ConfigurationService()

      vi.mocked(mockInstance.validateFileStructure).mockResolvedValueOnce({
        valid: false,
        errors: [{ message: 'File error' }],
        warnings: [],
      })

      vi.mocked(mockInstance.validateLanguageCodes).mockReturnValueOnce({
        valid: false,
        errors: [{ message: 'Language error' }],
        warnings: [],
      })

      const result = await validateTranslationSetup('./docs', [
        'invalid' as unknown as string,
      ])

      expect(result.valid).toBe(false)
      expect(result.errors).toHaveLength(2)
      expect(result.errors).toEqual([
        { message: 'File error' },
        { message: 'Language error' },
      ])
    })

    it('should combine warnings from both validations', async () => {
      const { ConfigurationService } = await import(
        './config/ConfigurationService.js'
      )
      const mockInstance = new ConfigurationService()

      vi.mocked(mockInstance.validateFileStructure).mockResolvedValueOnce({
        valid: true,
        errors: [],
        warnings: [{ message: 'Large files detected' }],
      })

      vi.mocked(mockInstance.validateLanguageCodes).mockReturnValueOnce({
        valid: true,
        errors: [],
        warnings: [{ message: 'Some languages may have poor support' }],
      })

      const result = await validateTranslationSetup('./docs', ['es'])

      expect(result.valid).toBe(true)
      expect(result.warnings).toHaveLength(2)
      expect(result.warnings).toEqual([
        { message: 'Large files detected' },
        { message: 'Some languages may have poor support' },
      ])
    })

    it('should be invalid when either validation fails', async () => {
      const { ConfigurationService } = await import(
        './config/ConfigurationService.js'
      )
      const mockInstance = new ConfigurationService()

      // File validation passes, language validation fails
      vi.mocked(mockInstance.validateFileStructure).mockResolvedValueOnce({
        valid: true,
        errors: [],
        warnings: [],
      })

      vi.mocked(mockInstance.validateLanguageCodes).mockReturnValueOnce({
        valid: false,
        errors: [{ message: 'Invalid language' }],
        warnings: [],
      })

      const result = await validateTranslationSetup('./docs', [
        'bad' as unknown as string,
      ])

      expect(result.valid).toBe(false)
    })

    it('should handle single language validation', async () => {
      const result = await validateTranslationSetup('./docs', ['es'])

      expect(result.valid).toBe(true)
      expect(result.errors).toEqual([])
    })

    it('should handle multiple language validation', async () => {
      const result = await validateTranslationSetup('./docs', [
        'es',
        'fr',
        'de',
        'ja',
        'ko',
      ])

      expect(result.valid).toBe(true)
      expect(result.warnings).toEqual([])
    })

    it('should handle empty warnings arrays', async () => {
      const { ConfigurationService } = await import(
        './config/ConfigurationService.js'
      )
      const mockInstance = new ConfigurationService()

      vi.mocked(mockInstance.validateFileStructure).mockResolvedValueOnce({
        valid: true,
        errors: [],
        warnings: [],
      })

      vi.mocked(mockInstance.validateLanguageCodes).mockReturnValueOnce({
        valid: true,
        errors: [],
        warnings: [],
      })

      const result = await validateTranslationSetup('./docs', ['es'])

      expect(result.warnings).toEqual([])
    })
  })

  describe('Error Handling', () => {
    it('should handle strategy execution errors in translateDocumentation', async () => {
      const { FileByFileStrategy } = await import(
        './strategies/FileByFileStrategy.js'
      )
      const mockInstance = new FileByFileStrategy()

      vi.mocked(mockInstance.execute).mockRejectedValueOnce(
        new Error('Translation failed')
      )

      await expect(
        translateDocumentation('./docs', './out', ['es'])
      ).rejects.toThrow('Translation failed')
    })

    it('should handle config creation errors in translateDocumentation', async () => {
      const { ConfigurationService } = await import(
        './config/ConfigurationService.js'
      )

      vi.mocked(
        ConfigurationService.createDefaultConfig
      ).mockImplementationOnce(() => {
        throw new Error('Config creation failed')
      })

      await expect(
        translateDocumentation('./docs', './out', ['es'])
      ).rejects.toThrow('Config creation failed')
    })

    it('should handle file validation errors in validateTranslationSetup', async () => {
      const { ConfigurationService } = await import(
        './config/ConfigurationService.js'
      )
      const mockInstance = new ConfigurationService()

      vi.mocked(mockInstance.validateFileStructure).mockRejectedValueOnce(
        new Error('File validation failed')
      )

      await expect(validateTranslationSetup('./docs', ['es'])).rejects.toThrow(
        'File validation failed'
      )
    })

    it('should handle language validation errors in validateTranslationSetup', async () => {
      const { ConfigurationService } = await import(
        './config/ConfigurationService.js'
      )
      const mockInstance = new ConfigurationService()

      vi.mocked(mockInstance.validateLanguageCodes).mockImplementationOnce(
        () => {
          throw new Error('Language validation failed')
        }
      )

      await expect(validateTranslationSetup('./docs', ['es'])).rejects.toThrow(
        'Language validation failed'
      )
    })
  })
})
