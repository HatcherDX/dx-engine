import { describe, it, expect, beforeEach, vi } from 'vitest'
import { FileByFileStrategy } from '../strategies/FileByFileStrategy.js'
import { TranslationService } from '../services/TranslationService.js'
import { FileProcessingService } from '../services/FileProcessingService.js'
import { MarkdownProtectionService } from '../services/MarkdownProtectionService.js'
import type {
  TranslationJobConfig,
  FileTranslationResult,
} from '../types/index.js'

// Mock the puppeteer-google-translate package
vi.mock('@hatcherdx/puppeteer-google-translate', () => ({
  DEFAULT_CONFIG: {
    headless: true,
    slowMo: 0,
    timeout: 30000,
    maxRetries: 3,
    retryDelay: 1000,
    verbose: false,
  },
  GoogleTranslator: vi.fn(),
  BrowserFactory: vi.fn(),
  MockBrowserFactory: vi.fn(),
  TranslationError: vi.fn(),
  BrowserError: vi.fn(),
  ERROR_CODES: {},
}))

// Mock all dependencies
vi.mock('../services/TranslationService.js')
vi.mock('../services/FileProcessingService.js')
vi.mock('../services/MarkdownProtectionService.js')

describe('FileByFileStrategy (Enhanced)', () => {
  let strategy: FileByFileStrategy
  let mockTranslationService: any
  let mockFileService: any
  let mockProtectionService: any
  let mockConfig: TranslationJobConfig

  beforeEach(() => {
    vi.clearAllMocks()

    // Enhanced mocks with proper typing
    mockTranslationService = {
      translateFile: vi.fn().mockImplementation((context) =>
        Promise.resolve({
          success: true,
          translatedContent: `TRANSLATED: ${context.originalContent}`,
          context: context,
          duration: 100,
          retries: 0,
        } as FileTranslationResult)
      ),
      close: vi.fn().mockResolvedValue(undefined),
    }

    mockFileService = {
      getSourceFiles: vi.fn().mockResolvedValue(['file1.md', 'file2.md']),
      readSourceFile: vi
        .fn()
        .mockResolvedValue('# Original Content\\nSample text'),
      ensureTargetDirectory: vi.fn().mockResolvedValue(undefined),
      writeTranslatedFile: vi.fn().mockResolvedValue(undefined),
      generateTargetPath: vi
        .fn()
        .mockImplementation(
          (sourcePath, language, config) =>
            `${config.targetDir}/${language}/${sourcePath}`
        ),
      shouldOverwrite: vi.fn().mockResolvedValue(true),
      cleanTargetDirectory: vi.fn().mockResolvedValue(undefined),
    }

    mockProtectionService = {
      protect: vi.fn().mockReturnValue({
        content: 'Protected content with [#c1#] tokens',
        protectedElements: {
          codeBlocks: ['```bash\\necho "test"\\n```'],
        },
        yamlTexts: ['Sample title'],
        originalContent: '# Original Content\\nSample text',
      }),
      restore: vi
        .fn()
        .mockImplementation((protectedContent, texts) =>
          protectedContent.content.replace(
            /\\[#c1#\\]/g,
            '```bash\\necho "test"\\n```'
          )
        ),
    }

    // Apply mocks to constructors
    ;(TranslationService as any).mockImplementation(
      () => mockTranslationService
    )
    ;(FileProcessingService as any).mockImplementation(() => mockFileService)
    ;(MarkdownProtectionService as any).mockImplementation(
      () => mockProtectionService
    )

    strategy = new FileByFileStrategy()

    mockConfig = {
      sourceLanguage: 'en',
      targetLanguages: ['es', 'fr'],
      fileProcessing: {
        sourceDir: '/source',
        targetDir: '/target',
        includePatterns: ['**/*.md'],
        excludePatterns: [],
        preserveStructure: true,
        overwriteExisting: true,
      },
      markdownProtection: {
        protectCodeBlocks: true,
        protectInlineCode: true,
        protectHtmlTags: true,
        protectYamlFrontmatter: true,
        protectLinks: true,
      },
      strategyConfig: {
        maxConcurrency: 1,
        delayBetweenTranslations: 0, // No delay in tests
        continueOnError: true,
        useCache: false,
      },
      translatorConfig: {
        headless: true,
        verbose: false,
        maxRetries: 1,
        retryDelay: 100,
        timeout: 5000,
      },
    }
  })

  describe('Successful execution', () => {
    it('should successfully translate all files', async () => {
      const result = await strategy.execute(mockConfig)

      expect(result.success).toBe(true)
      expect(result.fileResults).toHaveLength(4) // 2 files × 2 languages
      expect(result.stats.totalFiles).toBe(2)
      expect(result.stats.totalLanguages).toBe(2)
      expect(result.stats.successfulFiles).toBe(2) // 2 files successfully translated to all languages
      expect(result.stats.failedFiles).toBe(0)
    })

    it('should call all services correctly', async () => {
      await strategy.execute(mockConfig)

      // Verify file service calls
      expect(mockFileService.getSourceFiles).toHaveBeenCalledWith(
        mockConfig.fileProcessing
      )
      expect(mockFileService.readSourceFile).toHaveBeenCalledTimes(2)
      expect(mockFileService.writeTranslatedFile).toHaveBeenCalledTimes(4)

      // Verify protection service calls
      expect(mockProtectionService.protect).toHaveBeenCalledTimes(2)

      // Verify translation service calls
      expect(mockTranslationService.translateFile).toHaveBeenCalledTimes(4)
      expect(mockTranslationService.close).toHaveBeenCalledOnce()
    })

    it('should generate correct target paths', async () => {
      await strategy.execute(mockConfig)

      expect(mockFileService.generateTargetPath).toHaveBeenCalledWith(
        '/source/file1.md',
        'es',
        mockConfig.fileProcessing
      )
      expect(mockFileService.generateTargetPath).toHaveBeenCalledWith(
        '/source/file1.md',
        'fr',
        mockConfig.fileProcessing
      )
    })
  })

  describe('Error handling', () => {
    it('should handle translation failures gracefully when continueOnError is true', async () => {
      // Mock with proper context for stats calculation
      mockTranslationService.translateFile
        .mockResolvedValueOnce({
          success: false,
          error: 'Translation failed',
          context: { sourceFile: 'file1.md', targetLanguage: 'es' },
          duration: 0,
          retries: 1,
        })
        .mockResolvedValueOnce({
          success: true,
          translatedContent: 'Success',
          context: { sourceFile: 'file1.md', targetLanguage: 'fr' },
          duration: 100,
          retries: 0,
        })
        .mockResolvedValueOnce({
          success: true,
          translatedContent: 'Success',
          context: { sourceFile: 'file2.md', targetLanguage: 'es' },
          duration: 100,
          retries: 0,
        })
        .mockResolvedValueOnce({
          success: true,
          translatedContent: 'Success',
          context: { sourceFile: 'file2.md', targetLanguage: 'fr' },
          duration: 100,
          retries: 0,
        })

      const result = await strategy.execute(mockConfig)

      expect(result.success).toBe(false) // Overall failure due to some failed translations
      expect(result.fileResults).toHaveLength(4) // 2 files × 2 languages
      expect(result.stats.totalFiles).toBe(2)
      expect(result.stats.totalLanguages).toBe(2)
      expect(result.fileResults.some((r) => !r.success)).toBe(true)
    })

    it('should handle empty source files gracefully', async () => {
      mockFileService.getSourceFiles.mockResolvedValue([])

      await expect(strategy.execute(mockConfig)).rejects.toThrow(
        'No source files found to translate'
      )
    })
  })

  describe('Concurrency control', () => {
    it('should respect maxConcurrency setting', async () => {
      const configWithConcurrency = {
        ...mockConfig,
        strategyConfig: { ...mockConfig.strategyConfig, maxConcurrency: 1 },
      }

      await strategy.execute(configWithConcurrency)

      // With maxConcurrency=1, translations should be sequential
      expect(mockTranslationService.translateFile).toHaveBeenCalledTimes(4)
    })
  })

  describe('Progress reporting', () => {
    it('should call progress callback with correct information', async () => {
      const progressCallback = vi.fn()

      await strategy.execute(mockConfig, progressCallback)

      // Should call progress callback multiple times with different phases
      expect(progressCallback).toHaveBeenCalled()

      const calls = progressCallback.mock.calls
      const phases = calls.map((call) => call[0].phase)

      expect(phases).toContain('cleaning')
      expect(phases).toContain('initialization')
      expect(phases).toContain('protection')
      expect(phases).toContain('translation')
      expect(phases).toContain('complete')
    })

    it('should report accurate progress percentages', async () => {
      const progressCallback = vi.fn()

      await strategy.execute(mockConfig, progressCallback)

      const calls = progressCallback.mock.calls
      const progresses = calls.map((call) => call[0].overallProgress)

      // Progress should start at 0 and end at 100
      expect(progresses[0]).toBe(0)
      expect(progresses[progresses.length - 1]).toBe(100)
    })
  })

  describe('Resource cleanup', () => {
    it('should close translation service even on error', async () => {
      mockTranslationService.translateFile.mockRejectedValue(
        new Error('Fatal error')
      )

      try {
        await strategy.execute(mockConfig)
      } catch (error) {
        // Expected to throw
      }

      expect(mockTranslationService.close).toHaveBeenCalledOnce()
    })
  })
})
