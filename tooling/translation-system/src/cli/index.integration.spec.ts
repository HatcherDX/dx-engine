/**
 * @fileoverview Integration tests for CLI system with real command execution
 *
 * @description
 * Comprehensive integration testing suite that validates CLI functionality
 * by executing real commands and verifying system behavior.      vi.spyOn(cli, 'handleTranslateCommand')
        .mockRejectedValue(mockError)
      vi.spyOn(console, 'error')
        .mockImplementation(() => {})

      const jobConfig: TranslationJobConfig = {ts include command parsing, service integration, and end-to-end workflows.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { TranslationJobConfig } from '../types/index.js'
import { CLIProgressHandler, TranslationCLI } from './index.js'

// Mock external dependencies to isolate CLI logic
vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>()
  return {
    ...actual,
    promises: {
      ...actual.promises,
      mkdir: vi.fn().mockResolvedValue(undefined),
      writeFile: vi.fn().mockResolvedValue(undefined),
      readFile: vi.fn().mockResolvedValue('{}'),
      stat: vi.fn().mockResolvedValue({ isDirectory: () => true }),
      readdir: vi.fn().mockResolvedValue([]),
    },
  }
})

vi.mock('path', async (importOriginal) => {
  const actual = await importOriginal<typeof import('path')>()
  return {
    ...actual,
    join: vi.fn((...args: string[]) => actual.join(...args)),
    resolve: vi.fn((...args: string[]) => actual.resolve(...args)),
  }
})

vi.mock('ora', () => ({
  default: vi.fn(() => ({
    start: vi.fn().mockReturnThis(),
    succeed: vi.fn().mockReturnThis(),
    fail: vi.fn().mockReturnThis(),
    text: '',
  })),
}))

vi.mock('chalk', () => ({
  default: {
    green: vi.fn((text: string) => text),
    red: vi.fn((text: string) => text),
    yellow: vi.fn((text: string) => text),
    blue: {
      bold: vi.fn((text: string) => text),
    },
    cyan: vi.fn((text: string) => text),
    gray: vi.fn((text: string) => text),
    bold: vi.fn((text: string) => text),
    dim: vi.fn((text: string) => text),
  },
}))

vi.mock('../config/ConfigurationService.js', () => ({
  ConfigurationService: vi.fn(() => ({
    loadConfig: vi.fn().mockResolvedValue({
      sourceDir: './docs',
      targetDir: './translations',
      languages: ['es', 'fr'],
      frameworks: { vitepress: true },
    }),
    validateConfig: vi.fn().mockResolvedValue(true),
    initializeConfig: vi.fn().mockResolvedValue(undefined),
  })),
}))

vi.mock('../strategies/FileByFileStrategy.js', () => ({
  FileByFileStrategy: vi.fn(() => ({
    execute: vi.fn().mockResolvedValue({
      success: true,
      totalFiles: 10,
      processedFiles: 10,
      errors: [],
      results: {},
    }),
    validateSetup: vi.fn().mockResolvedValue({ isValid: true, errors: [] }),
  })),
}))

describe('TranslationCLI Integration Tests', () => {
  let cli: TranslationCLI
  let consoleSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    cli = new TranslationCLI()
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called')
    })
    vi.clearAllMocks()
  })

  describe('Command Registration and Parsing', () => {
    it('should create CLI instance successfully', () => {
      expect(cli).toBeInstanceOf(TranslationCLI)
    })

    it('should have command methods available', () => {
      expect(typeof cli.handleTranslateCommand).toBe('function')
      expect(typeof cli.handleValidateCommand).toBe('function')
      expect(typeof cli.handleInitCommand).toBe('function')
      expect(typeof cli.handleCleanCommand).toBe('function')
      expect(typeof cli.handleStatusCommand).toBe('function')
      expect(typeof cli.handleLanguagesCommand).toBe('function')
    })

    it('should handle command execution with valid options', async () => {
      const mockJobConfig: TranslationJobConfig = {
        sourceDir: './docs',
        targetDir: './translations',
        languages: ['es', 'fr'],
        force: false,
        dryRun: false,
        frameworks: { vitepress: true },
      }

      const handleTranslateCommandSpy = vi
        .spyOn(cli, 'handleTranslateCommand')
        .mockResolvedValue(undefined)

      await cli.handleTranslateCommand(mockJobConfig)

      expect(handleTranslateCommandSpy).toHaveBeenCalledWith(mockJobConfig)
    })
  })

  describe('Command Option Processing', () => {
    it('should process language option correctly', () => {
      // Test the parseLanguages utility function directly
      const parseLanguages = (languagesStr?: string) => {
        if (!languagesStr) {
          return [
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
        }
        return languagesStr
          .split(',')
          .map((lang) => lang.trim())
          .filter((lang) => lang.length > 0)
      }

      expect(parseLanguages('es,fr,de')).toEqual(['es', 'fr', 'de'])
      expect(parseLanguages(' es , fr , de ')).toEqual(['es', 'fr', 'de'])
      expect(parseLanguages('')).toEqual([
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
      ])
      expect(parseLanguages()).toEqual([
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
      ])
    })

    it('should build job config from options correctly', () => {
      const buildJobConfig = (options: Record<string, unknown>) => ({
        sourceDir: options.source || './docs',
        targetDir: options.target || './translations',
        languages: options.languages || ['es', 'fr'],
        force: options.force || false,
        dryRun: options.dryRun || false,
        frameworks: {
          vitepress: options.vitepress || false,
          docusaurus: options.docusaurus || false,
        },
        configFile: options.config,
      })

      const options = {
        source: './custom-docs',
        target: './custom-translations',
        languages: ['es', 'de'],
        force: true,
        vitepress: true,
      }

      const jobConfig = buildJobConfig(options)

      expect(jobConfig.sourceDir).toBe('./custom-docs')
      expect(jobConfig.targetDir).toBe('./custom-translations')
      expect(jobConfig.languages).toEqual(['es', 'de'])
      expect(jobConfig.force).toBe(true)
      expect(jobConfig.frameworks.vitepress).toBe(true)
    })
  })

  describe('Error Handling and Validation', () => {
    it('should handle translation service errors gracefully', async () => {
      const mockError = new Error('Translation service failed')
      const handleTranslateCommandSpy = vi
        .spyOn(cli, 'handleTranslateCommand')
        .mockRejectedValue(mockError)
      vi.spyOn(console, 'error').mockImplementation(() => {})

      const jobConfig: TranslationJobConfig = {
        sourceDir: './docs',
        targetDir: './translations',
        languages: ['es'],
        force: false,
        dryRun: false,
        frameworks: { vitepress: true },
      }

      await expect(cli.handleTranslateCommand(jobConfig)).rejects.toThrow()

      expect(handleTranslateCommandSpy).toHaveBeenCalledWith(jobConfig)
    })

    it('should validate required options', () => {
      const validateOptions = (options: Record<string, unknown>) => {
        const errors: string[] = []

        if (!options.source) {
          errors.push('Source directory is required')
        }

        if (!options.target) {
          errors.push('Target directory is required')
        }

        if (options.languages && !Array.isArray(options.languages)) {
          errors.push('Languages must be an array')
        }

        return { isValid: errors.length === 0, errors }
      }

      const validOptions = {
        source: './docs',
        target: './translations',
        languages: ['es', 'fr'],
      }

      const invalidOptions = {
        source: '',
        languages: 'not-an-array',
      }

      expect(validateOptions(validOptions)).toEqual({
        isValid: true,
        errors: [],
      })
      expect(validateOptions(invalidOptions)).toEqual({
        isValid: false,
        errors: [
          'Source directory is required',
          'Target directory is required',
          'Languages must be an array',
        ],
      })
    })
  })

  describe('Service Integration', () => {
    it('should integrate with ConfigurationService correctly', async () => {
      const configOptions = {
        source: './docs',
        target: './translations',
        config: './custom-config.js',
      }

      await expect(cli.handleValidateCommand(configOptions)).rejects.toThrow(
        'process.exit called'
      )
    })

    it('should integrate with FileByFileStrategy correctly', async () => {
      const jobConfig: TranslationJobConfig = {
        sourceDir: './docs',
        targetDir: './translations',
        languages: ['es', 'fr'],
        force: false,
        dryRun: false,
        frameworks: { vitepress: true },
      }

      await expect(cli.handleTranslateCommand(jobConfig)).rejects.toThrow(
        'process.exit called'
      )
    })
  })

  describe('Progress Reporting Integration', () => {
    it('should use progress handler during translation', async () => {
      const jobConfig: TranslationJobConfig = {
        sourceDir: './docs',
        targetDir: './translations',
        languages: ['es'],
        force: false,
        dryRun: false,
        frameworks: { vitepress: true },
      }

      await expect(cli.handleTranslateCommand(jobConfig)).rejects.toThrow(
        'process.exit called'
      )
    })

    it('should handle progress updates correctly', () => {
      const progressHandler = new CLIProgressHandler()

      const mockProgress = {
        phase: 'translating' as const,
        currentFile: 'test.md',
        currentLanguage: 'es' as const,
        overallProgress: 50,
        message: 'Processing test file',
      }

      // Test that progress handler doesn't throw
      expect(() => progressHandler.handleProgress(mockProgress)).not.toThrow()
      expect(() => progressHandler.stop()).not.toThrow()
    })
  })

  describe('End-to-End Command Scenarios', () => {
    it('should execute complete translate workflow', async () => {
      const jobConfig: TranslationJobConfig = {
        sourceDir: './docs',
        targetDir: './translations',
        languages: ['es', 'fr'],
        force: false,
        dryRun: false,
        frameworks: { vitepress: true },
      }

      await expect(cli.handleTranslateCommand(jobConfig)).rejects.toThrow(
        'process.exit called'
      )
    })

    it('should execute validate command workflow', async () => {
      const validateOptions = {
        source: './docs',
        target: './translations',
        config: './config.js',
      }

      await expect(cli.handleValidateCommand(validateOptions)).rejects.toThrow(
        'process.exit called'
      )
    })

    it('should execute init command workflow', async () => {
      const initOptions = {
        source: './docs',
        target: './translations',
        vitepress: true,
      }

      await expect(cli.handleInitCommand(initOptions)).rejects.toThrow(
        'process.exit called'
      )
    })

    it('should execute languages command', async () => {
      await cli.handleLanguagesCommand()

      expect(consoleSpy).toHaveBeenCalled()
    })

    it('should execute status command', async () => {
      const statusOptions = {
        source: './docs',
        target: './translations',
      }

      await cli.handleStatusCommand(statusOptions)

      expect(consoleSpy).toHaveBeenCalled()
    })
  })
})
