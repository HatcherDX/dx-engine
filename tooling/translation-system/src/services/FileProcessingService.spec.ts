/**
 * @fileoverview Comprehensive tests for FileProcessingService
 *
 * @description
 * Tests for the file processing service that handles markdown file operations,
 * directory management, validation, and file statistics. Covers all public
 * methods and error scenarios with professional mock implementations.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 */

import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest'
import { FileProcessingService } from './FileProcessingService.js'
import type {
  FileProcessingConfig,
  FileTranslationResult,
} from '../types/index.js'
import { TranslationSystemError } from '../types/index.js'

/**
 * Types for mocked fs.stat responses
 */
interface MockStats {
  isDirectory(): boolean
  isFile(): boolean
  size?: number
}

interface MockDirEntry {
  name: string
  isFile(): boolean
}

// Mock modules before imports
vi.mock('fs', () => {
  const mockConstants = {
    R_OK: 4,
    W_OK: 2,
    X_OK: 1,
    F_OK: 0,
  }

  const mockPromises = {
    stat: vi.fn(),
    access: vi.fn(),
    readFile: vi.fn(),
    writeFile: vi.fn(),
    mkdir: vi.fn(),
    readdir: vi.fn(),
    unlink: vi.fn(),
  }

  return {
    default: {
      constants: mockConstants,
      promises: mockPromises,
    },
    promises: mockPromises,
    constants: mockConstants,
  }
})
vi.mock('glob')
vi.mock('path')

// Import mocked modules
import { promises as fs } from 'fs'
import { constants as fsConstants } from 'fs'
import { glob } from 'glob'
import { join, dirname, basename, extname, relative } from 'path'

/**
 * Enhanced File Processing Service Test Suite
 *
 * @remarks
 * Comprehensive test coverage for FileProcessingService including:
 * - File discovery and validation
 * - Directory operations and permissions
 * - Error handling and edge cases
 * - Configuration validation
 * - File statistics and metadata
 */
describe('FileProcessingService', () => {
  let fileProcessingService: FileProcessingService
  let consoleWarnSpy: Mock

  beforeEach(() => {
    fileProcessingService = new FileProcessingService()

    // Mock console.warn to track warnings
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    // Ensure fs constants are properly mocked
    Object.defineProperty(fs, 'constants', {
      value: fsConstants,
      writable: false,
      configurable: true,
    })

    // Setup path mocks as regular functions
    vi.mocked(join).mockImplementation((...args: string[]) =>
      args.filter((arg) => arg).join('/')
    )
    vi.mocked(dirname).mockImplementation((path: string) =>
      path.split('/').slice(0, -1).join('/')
    )
    vi.mocked(basename).mockImplementation(
      (path: string) => path.split('/').pop() || ''
    )
    vi.mocked(extname).mockImplementation((path: string) => {
      const lastDot = path.lastIndexOf('.')
      return lastDot > 0 ? path.substring(lastDot) : ''
    })
    vi.mocked(relative).mockImplementation((from: string, to: string) => {
      return to.replace(from + '/', '')
    })

    // Reset all mocks
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  /**
   * Tests for getSourceFiles method
   *
   * @remarks
   * Covers file discovery, pattern matching, validation, and error scenarios
   */
  describe('getSourceFiles', () => {
    it('should discover and validate markdown files successfully', async () => {
      const config: FileProcessingConfig = {
        sourceDir: '/test/docs',
        targetDir: '/test/output',
        preserveStructure: true,
        overwriteExisting: false,
      }

      // Mock directory validation
      vi.mocked(fs.stat).mockResolvedValue({
        isDirectory: () => true,
        isFile: () => false,
      } satisfies MockStats)
      vi.mocked(fs.access).mockResolvedValue(undefined)

      // Mock glob to return test files
      vi.mocked(glob).mockResolvedValue(['guide.md', 'api.md', 'readme.md'])

      // Mock file validation for each discovered file
      vi.mocked(fs.stat)
        .mockResolvedValueOnce({
          isDirectory: () => true,
          isFile: () => false,
        } satisfies MockStats) // Directory stat
        .mockResolvedValue({
          isDirectory: () => false,
          isFile: () => true,
        } satisfies MockStats) // File stats

      const result = await fileProcessingService.getSourceFiles(config)

      expect(result).toEqual(['api.md', 'guide.md', 'readme.md'])
      expect(glob).toHaveBeenCalledWith('**/*.md', {
        cwd: '/test/docs',
        absolute: false,
        ignore: [
          '**/node_modules/**',
          '**/dist/**',
          '**/build/**',
          '**/.git/**',
          '**/test-*.md',
          '**/*test*.md',
          '**/*.test.md',
        ],
      })
    })

    it('should use custom include and exclude patterns', async () => {
      const config: FileProcessingConfig = {
        sourceDir: '/test/docs',
        targetDir: '/test/output',
        preserveStructure: true,
        overwriteExisting: false,
        includePatterns: ['**/*.markdown', '**/*.md'],
        excludePatterns: ['**/private/**', '**/draft-*.md'],
      }

      vi.mocked(fs.stat).mockResolvedValue({
        isDirectory: () => true,
        isFile: () => false,
      } satisfies MockStats)
      vi.mocked(fs.access).mockResolvedValue(undefined)
      vi.mocked(glob).mockResolvedValue(['public.md'])

      vi.mocked(fs.stat)
        .mockResolvedValueOnce({
          isDirectory: () => true,
          isFile: () => false,
        } satisfies MockStats)
        .mockResolvedValue({
          isDirectory: () => false,
          isFile: () => true,
        } satisfies MockStats)

      await fileProcessingService.getSourceFiles(config)

      expect(glob).toHaveBeenCalledTimes(2)
      expect(glob).toHaveBeenCalledWith('**/*.markdown', {
        cwd: '/test/docs',
        absolute: false,
        ignore: ['**/private/**', '**/draft-*.md'],
      })
      expect(glob).toHaveBeenCalledWith('**/*.md', {
        cwd: '/test/docs',
        absolute: false,
        ignore: ['**/private/**', '**/draft-*.md'],
      })
    })

    it('should handle inaccessible files gracefully', async () => {
      const config: FileProcessingConfig = {
        sourceDir: '/test/docs',
        targetDir: '/test/output',
        preserveStructure: true,
        overwriteExisting: false,
      }

      vi.mocked(fs.stat).mockResolvedValue({
        isDirectory: () => true,
        isFile: () => false,
      } satisfies MockStats)
      vi.mocked(fs.access).mockResolvedValue(undefined)
      // Return files in alphabetical order as glob would naturally do
      vi.mocked(glob).mockResolvedValue(['bad.md', 'good.md'])

      // First call for directory validation
      vi.mocked(fs.stat).mockResolvedValueOnce({
        isDirectory: () => true,
        isFile: () => false,
      } satisfies MockStats)

      // File validation - first file (bad.md) fails, second file (good.md) succeeds
      vi.mocked(fs.stat)
        .mockRejectedValueOnce(new Error('Permission denied')) // bad.md stat fails
        .mockResolvedValueOnce({
          isDirectory: () => false,
          isFile: () => true,
        } satisfies MockStats) // good.md stat succeeds

      // Access checks
      vi.mocked(fs.access)
        .mockResolvedValueOnce(undefined) // Directory access
        .mockResolvedValueOnce(undefined) // good.md access

      const result = await fileProcessingService.getSourceFiles(config)

      expect(result).toEqual(['good.md'])
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Skipping inaccessible file: bad.md'
      )
    })

    it('should throw error when no valid files found', async () => {
      const config: FileProcessingConfig = {
        sourceDir: '/test/empty',
        targetDir: '/test/output',
        preserveStructure: true,
        overwriteExisting: false,
      }

      vi.mocked(fs.stat).mockResolvedValue({
        isDirectory: () => true,
        isFile: () => false,
      } satisfies MockStats)
      vi.mocked(fs.access).mockResolvedValue(undefined)
      vi.mocked(glob).mockResolvedValue([])

      await expect(
        fileProcessingService.getSourceFiles(config)
      ).rejects.toThrow(TranslationSystemError)
      await expect(
        fileProcessingService.getSourceFiles(config)
      ).rejects.toThrow('No valid markdown files found in source directory')
    })

    it('should handle directory validation failure', async () => {
      const config: FileProcessingConfig = {
        sourceDir: '/nonexistent',
        targetDir: '/test/output',
        preserveStructure: true,
        overwriteExisting: false,
      }

      vi.mocked(fs.stat).mockRejectedValue(new Error('Directory not found'))

      await expect(
        fileProcessingService.getSourceFiles(config)
      ).rejects.toThrow(TranslationSystemError)
      await expect(
        fileProcessingService.getSourceFiles(config)
      ).rejects.toThrow('Directory validation failed')
    })
  })

  /**
   * Tests for directory and file operations
   *
   * @remarks
   * Covers directory creation, file writing, and permission handling
   */
  describe('Directory and File Operations', () => {
    describe('ensureTargetDirectory', () => {
      it('should create target directory successfully', async () => {
        const targetPath = '/test/output/es/guide.md'

        vi.mocked(fs.mkdir).mockResolvedValue(undefined)
        vi.mocked(fs.access).mockResolvedValue(undefined)

        await fileProcessingService.ensureTargetDirectory(targetPath)

        expect(fs.mkdir).toHaveBeenCalledWith('/test/output/es', {
          recursive: true,
        })
        expect(fs.access).toHaveBeenCalledWith(
          '/test/output/es',
          fsConstants.W_OK
        )
      })

      it('should handle directory creation failure', async () => {
        const targetPath = '/readonly/output/file.md'

        vi.mocked(fs.mkdir).mockRejectedValue(new Error('Permission denied'))

        await expect(
          fileProcessingService.ensureTargetDirectory(targetPath)
        ).rejects.toThrow(TranslationSystemError)
        await expect(
          fileProcessingService.ensureTargetDirectory(targetPath)
        ).rejects.toThrow('Failed to ensure target directory')
      })
    })

    describe('writeTranslatedFile', () => {
      it('should write translated file successfully', async () => {
        const result: FileTranslationResult = {
          context: {
            sourceFile: 'test.md',
            targetFile: '/output/es/test.md',
            sourceLanguage: 'en',
            targetLanguage: 'es',
            originalContent: 'Test content',
            protectedContent: {
              content: 'Test content',
              protectedElements: {
                codeBlocks: [],
                inlineCode: [],
                links: [],
              },
              yamlTexts: [],
              originalContent: 'Test content',
            },
          },
          success: true,
          translatedContent: 'Contenido de prueba',
          duration: 1000,
          retries: 0,
        }

        vi.mocked(fs.mkdir).mockResolvedValue(undefined)
        vi.mocked(fs.access).mockResolvedValue(undefined)
        vi.mocked(fs.writeFile).mockResolvedValue(undefined)
        vi.mocked(fs.readFile).mockResolvedValue('Contenido de prueba')

        await fileProcessingService.writeTranslatedFile(result)

        expect(fs.writeFile).toHaveBeenCalledWith(
          '/output/es/test.md',
          'Contenido de prueba',
          'utf-8'
        )
        expect(fs.readFile).toHaveBeenCalledWith('/output/es/test.md', 'utf-8')
      })

      it('should reject failed translation results', async () => {
        const result: FileTranslationResult = {
          context: {
            sourceFile: 'test.md',
            targetFile: '/output/es/test.md',
            sourceLanguage: 'en',
            targetLanguage: 'es',
            originalContent: 'Test content',
            protectedContent: {
              content: 'Test content',
              protectedElements: {
                codeBlocks: [],
                inlineCode: [],
                links: [],
              },
              yamlTexts: [],
              originalContent: 'Test content',
            },
          },
          success: false,
          error: 'Translation failed',
          duration: 1000,
          retries: 3,
        }

        await expect(
          fileProcessingService.writeTranslatedFile(result)
        ).rejects.toThrow(TranslationSystemError)
        await expect(
          fileProcessingService.writeTranslatedFile(result)
        ).rejects.toThrow('Cannot write failed translation result')
      })

      it('should handle content verification failure', async () => {
        const result: FileTranslationResult = {
          context: {
            sourceFile: 'test.md',
            targetFile: '/output/es/test.md',
            sourceLanguage: 'en',
            targetLanguage: 'es',
            originalContent: 'Test content',
            protectedContent: {
              content: 'Test content',
              protectedElements: {
                codeBlocks: [],
                inlineCode: [],
                links: [],
              },
              yamlTexts: [],
              originalContent: 'Test content',
            },
          },
          success: true,
          translatedContent: 'Contenido de prueba',
          duration: 1000,
          retries: 0,
        }

        vi.mocked(fs.mkdir).mockResolvedValue(undefined)
        vi.mocked(fs.access).mockResolvedValue(undefined)
        vi.mocked(fs.writeFile).mockResolvedValue(undefined)
        vi.mocked(fs.readFile).mockResolvedValue('Different content') // Verification fails

        await expect(
          fileProcessingService.writeTranslatedFile(result)
        ).rejects.toThrow(TranslationSystemError)
        await expect(
          fileProcessingService.writeTranslatedFile(result)
        ).rejects.toThrow('File verification failed - content mismatch')
      })
    })

    describe('readSourceFile', () => {
      it('should read source file successfully', async () => {
        const filePath = '/test/docs/guide.md'
        const content = '# Guide\n\nThis is a guide.'

        vi.mocked(fs.access).mockResolvedValue(undefined)
        vi.mocked(fs.readFile).mockResolvedValue(content)

        const result = await fileProcessingService.readSourceFile(filePath)

        expect(result).toBe(content)
        expect(fs.access).toHaveBeenCalledWith(filePath, fsConstants.R_OK)
        expect(fs.readFile).toHaveBeenCalledWith(filePath, 'utf-8')
      })

      it('should reject empty files', async () => {
        const filePath = '/test/docs/empty.md'

        vi.mocked(fs.access).mockResolvedValue(undefined)
        vi.mocked(fs.readFile).mockResolvedValue('   \n  \t  ')

        await expect(
          fileProcessingService.readSourceFile(filePath)
        ).rejects.toThrow(TranslationSystemError)
        await expect(
          fileProcessingService.readSourceFile(filePath)
        ).rejects.toThrow('Source file is empty')
      })

      it('should handle file access errors', async () => {
        const filePath = '/test/docs/inaccessible.md'

        vi.mocked(fs.access).mockRejectedValue(new Error('Permission denied'))

        await expect(
          fileProcessingService.readSourceFile(filePath)
        ).rejects.toThrow(TranslationSystemError)
        await expect(
          fileProcessingService.readSourceFile(filePath)
        ).rejects.toThrow('Failed to read source file')
      })
    })
  })

  /**
   * Tests for path generation and configuration
   *
   * @remarks
   * Covers target path generation and overwrite decisions
   */
  describe('Path Generation and Configuration', () => {
    describe('generateTargetPath', () => {
      it('should preserve directory structure when configured', () => {
        const config: FileProcessingConfig = {
          sourceDir: '/docs',
          targetDir: '/output',
          preserveStructure: true,
          overwriteExisting: false,
        }

        const result = fileProcessingService.generateTargetPath(
          '/docs/guide/intro.md',
          'es',
          config
        )

        expect(result).toBe('/output/es/guide/intro.md')
      })

      it('should use flat structure when configured', () => {
        const config: FileProcessingConfig = {
          sourceDir: '/docs',
          targetDir: '/output',
          preserveStructure: false,
          overwriteExisting: false,
        }

        const result = fileProcessingService.generateTargetPath(
          '/docs/guide/intro.md',
          'es',
          config
        )

        expect(result).toBe('/output/es/intro.md')
      })
    })

    describe('shouldOverwrite', () => {
      it('should return true when overwrite is enabled', async () => {
        const config: FileProcessingConfig = {
          sourceDir: '/docs',
          targetDir: '/output',
          preserveStructure: true,
          overwriteExisting: true,
        }

        const result = await fileProcessingService.shouldOverwrite(
          '/output/es/test.md',
          config
        )

        expect(result).toBe(true)
      })

      it('should return false when file exists and overwrite is disabled', async () => {
        const config: FileProcessingConfig = {
          sourceDir: '/docs',
          targetDir: '/output',
          preserveStructure: true,
          overwriteExisting: false,
        }

        vi.mocked(fs.access).mockResolvedValue(undefined) // File exists

        const result = await fileProcessingService.shouldOverwrite(
          '/output/es/test.md',
          config
        )

        expect(result).toBe(false)
      })

      it('should return true when file does not exist', async () => {
        const config: FileProcessingConfig = {
          sourceDir: '/docs',
          targetDir: '/output',
          preserveStructure: true,
          overwriteExisting: false,
        }

        vi.mocked(fs.access).mockRejectedValue(new Error('File not found'))

        const result = await fileProcessingService.shouldOverwrite(
          '/output/es/test.md',
          config
        )

        expect(result).toBe(true)
      })
    })
  })

  /**
   * Tests for file statistics and analysis
   *
   * @remarks
   * Covers file stats calculation and directory information gathering
   */
  describe('File Statistics and Analysis', () => {
    describe('getFileStats', () => {
      it('should calculate file statistics correctly', async () => {
        const filePath = '/test/sample.md'
        const content = '# Title\n\nThis is a test file with some words.\n'

        vi.mocked(fs.stat).mockResolvedValue({
          size: 1024,
        } satisfies MockStats)
        vi.mocked(fs.readFile).mockResolvedValue(content)

        const result = await fileProcessingService.getFileStats(filePath)

        expect(result).toEqual({
          size: 1024,
          lines: 4,
          characters: content.length,
          words: 10, // "Title", "This", "is", "a", "test", "file", "with", "some", "words"
        })
      })

      it('should handle file stats errors', async () => {
        const filePath = '/test/nonexistent.md'

        vi.mocked(fs.stat).mockRejectedValue(new Error('File not found'))

        await expect(
          fileProcessingService.getFileStats(filePath)
        ).rejects.toThrow(TranslationSystemError)
        await expect(
          fileProcessingService.getFileStats(filePath)
        ).rejects.toThrow('Failed to get file stats')
      })
    })

    describe('getDirectoryInfo', () => {
      it('should gather directory information successfully', async () => {
        const dirPath = '/test/docs'

        vi.mocked(glob).mockResolvedValue([
          '/test/docs/guide.md',
          '/test/docs/api.md',
          '/test/docs/image.png',
          '/test/docs/script.js',
        ])

        vi.mocked(fs.stat)
          .mockResolvedValueOnce({ size: 1024 } satisfies MockStats) // guide.md
          .mockResolvedValueOnce({ size: 2048 } satisfies MockStats) // api.md
          .mockResolvedValueOnce({ size: 512 } satisfies MockStats) // image.png
          .mockResolvedValueOnce({ size: 256 } satisfies MockStats) // script.js

        const result = await fileProcessingService.getDirectoryInfo(dirPath)

        expect(result).toEqual({
          totalFiles: 4,
          totalSize: 3840, // 1024 + 2048 + 512 + 256
          markdownFiles: 2, // guide.md and api.md
        })
      })

      it('should handle inaccessible files gracefully', async () => {
        const dirPath = '/test/docs'

        vi.mocked(glob).mockResolvedValue([
          '/test/docs/good.md',
          '/test/docs/bad.md',
        ])

        vi.mocked(fs.stat)
          .mockResolvedValueOnce({ size: 1024 } satisfies MockStats) // good.md
          .mockRejectedValueOnce(new Error('Permission denied')) // bad.md

        const result = await fileProcessingService.getDirectoryInfo(dirPath)

        expect(result).toEqual({
          totalFiles: 1,
          totalSize: 1024,
          markdownFiles: 1,
        })
      })
    })
  })

  /**
   * Tests for configuration validation
   *
   * @remarks
   * Covers validation rules, error detection, and circular path checking
   */
  describe('Configuration Validation', () => {
    describe('validateConfig', () => {
      it('should validate correct configuration', () => {
        const config: FileProcessingConfig = {
          sourceDir: '/docs',
          targetDir: '/output',
          preserveStructure: true,
          overwriteExisting: false,
          includePatterns: ['**/*.md'],
          excludePatterns: ['**/test/**'],
        }

        const result = fileProcessingService.validateConfig(config)

        expect(result.valid).toBe(true)
        expect(result.errors).toHaveLength(0)
      })

      it('should detect missing source directory', () => {
        const config: FileProcessingConfig = {
          sourceDir: '',
          targetDir: '/output',
          preserveStructure: true,
          overwriteExisting: false,
        }

        const result = fileProcessingService.validateConfig(config)

        expect(result.valid).toBe(false)
        expect(result.errors).toContainEqual({
          code: 'MISSING_SOURCE_DIR',
          message: 'Source directory is required',
        })
      })

      it('should detect missing target directory', () => {
        const config: FileProcessingConfig = {
          sourceDir: '/docs',
          targetDir: '   ',
          preserveStructure: true,
          overwriteExisting: false,
        }

        const result = fileProcessingService.validateConfig(config)

        expect(result.valid).toBe(false)
        expect(result.errors).toContainEqual({
          code: 'MISSING_TARGET_DIR',
          message: 'Target directory is required',
        })
      })

      it('should detect empty include patterns', () => {
        const config: FileProcessingConfig = {
          sourceDir: '/docs',
          targetDir: '/output',
          preserveStructure: true,
          overwriteExisting: false,
          includePatterns: [],
        }

        const result = fileProcessingService.validateConfig(config)

        expect(result.valid).toBe(false)
        expect(result.errors).toContainEqual({
          code: 'EMPTY_INCLUDE_PATTERNS',
          message: 'Include patterns array cannot be empty',
        })
      })

      it('should detect circular paths', () => {
        const config: FileProcessingConfig = {
          sourceDir: '/docs',
          targetDir: '/docs/translations',
          preserveStructure: true,
          overwriteExisting: false,
        }

        const result = fileProcessingService.validateConfig(config)

        expect(result.valid).toBe(false)
        expect(result.errors).toContainEqual({
          code: 'CIRCULAR_PATHS',
          message:
            'Source and target directories cannot be nested within each other',
        })
      })
    })
  })

  /**
   * Tests for cleanup operations
   *
   * @remarks
   * Covers target directory cleanup and file deletion
   */
  describe('Cleanup Operations', () => {
    describe('cleanTargetDirectory', () => {
      it('should clean markdown files from target directories', async () => {
        const config: FileProcessingConfig = {
          sourceDir: '/docs',
          targetDir: '/output',
          preserveStructure: true,
          overwriteExisting: false,
        }

        const languageCodes = ['es', 'fr']

        vi.mocked(fs.access).mockResolvedValue(undefined)
        vi.mocked(fs.readdir).mockResolvedValue([
          { name: 'guide.md', isFile: () => true },
          { name: 'api.md', isFile: () => true },
          { name: 'image.png', isFile: () => true },
          { name: 'subdir', isFile: () => false },
        ] satisfies MockDirEntry[])
        vi.mocked(fs.unlink).mockResolvedValue(undefined)

        await fileProcessingService.cleanTargetDirectory(config, languageCodes)

        expect(fs.readdir).toHaveBeenCalledWith('/output/es', {
          withFileTypes: true,
        })
        expect(fs.readdir).toHaveBeenCalledWith('/output/fr', {
          withFileTypes: true,
        })
        expect(fs.unlink).toHaveBeenCalledWith('/output/es/guide.md')
        expect(fs.unlink).toHaveBeenCalledWith('/output/es/api.md')
        expect(fs.unlink).toHaveBeenCalledWith('/output/fr/guide.md')
        expect(fs.unlink).toHaveBeenCalledWith('/output/fr/api.md')
        expect(fs.unlink).not.toHaveBeenCalledWith('/output/es/image.png')
      })

      it('should handle nonexistent directories gracefully', async () => {
        const config: FileProcessingConfig = {
          sourceDir: '/docs',
          targetDir: '/output',
          preserveStructure: true,
          overwriteExisting: false,
        }

        const languageCodes = ['es']

        const enoentError = new Error('Directory not found')
        ;(enoentError as NodeJS.ErrnoException).code = 'ENOENT'

        vi.mocked(fs.access).mockRejectedValue(enoentError)

        // Should not throw error
        await expect(
          fileProcessingService.cleanTargetDirectory(config, languageCodes)
        ).resolves.toBeUndefined()
      })

      it('should warn about other directory errors', async () => {
        const config: FileProcessingConfig = {
          sourceDir: '/docs',
          targetDir: '/output',
          preserveStructure: true,
          overwriteExisting: false,
        }

        const languageCodes = ['es']

        vi.mocked(fs.access).mockResolvedValue(undefined)
        vi.mocked(fs.readdir).mockRejectedValue(new Error('Permission denied'))

        await fileProcessingService.cleanTargetDirectory(config, languageCodes)

        expect(consoleWarnSpy).toHaveBeenCalledWith(
          'Warning cleaning es directory: Permission denied'
        )
      })
    })
  })
})
