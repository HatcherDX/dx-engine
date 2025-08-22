/**
 * @fileoverview Coverage tests for handleValidateCommand
 *
 * @description
 * Targeted tests to improve coverage for handleValidateCommand method:
 * - Valid configuration validation
 * - Invalid configuration with error display
 * - Valid file structure validation
 * - File structure warnings display
 * - Error handling in catch block
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TranslationCLI } from './index.js'
import type { ValidateCommandOptions } from './index.js'

// Enhanced mocking setup
vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>()
  return {
    ...actual,
    default: actual.default || actual,
    promises: {
      ...actual.promises,
      mkdir: vi.fn().mockResolvedValue(undefined),
      writeFile: vi.fn().mockResolvedValue(undefined),
      readFile: vi.fn().mockResolvedValue('{}'),
      stat: vi.fn().mockResolvedValue({ isDirectory: () => true }),
      readdir: vi.fn().mockResolvedValue([]),
      access: vi.fn().mockResolvedValue(undefined),
    },
  }
})

vi.mock('ora', () => ({
  default: () => ({
    start: vi.fn().mockReturnThis(),
    succeed: vi.fn().mockReturnThis(),
    fail: vi.fn().mockReturnThis(),
    stop: vi.fn().mockReturnThis(),
    text: '',
    isSpinning: false,
  }),
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

// Configurable ConfigurationService mock
const createConfigServiceMock = (overrides = {}) => ({
  validateJob: vi.fn().mockReturnValue({ valid: true, errors: [] }),
  validateFileStructure: vi.fn().mockResolvedValue({
    valid: true,
    errors: [],
    warnings: [],
  }),
  loadFromFile: vi.fn().mockResolvedValue({
    fileProcessing: {
      sourceDir: './docs',
      targetDir: './translations',
      overwriteExisting: false,
    },
    targetLanguages: ['es', 'fr'],
    strategy: 'file-by-file',
  }),
  ...overrides,
})

vi.mock('../config/ConfigurationService.js', () => ({
  ConfigurationService: Object.assign(
    vi.fn(() => ({
      validateJob: vi.fn().mockReturnValue({ valid: true, errors: [] }),
      validateFileStructure: vi
        .fn()
        .mockResolvedValue({ valid: true, errors: [], warnings: [] }),
    })),
    {
      loadFromFile: vi.fn().mockResolvedValue({
        fileProcessing: {
          sourceDir: './docs',
          targetDir: './translations',
          overwriteExisting: false,
        },
        targetLanguages: ['es', 'fr'],
        strategy: 'file-by-file',
      }),
    }
  ),
}))

describe('ValidateCommand Coverage Tests', () => {
  let cli: TranslationCLI
  let consoleSpy: ReturnType<typeof vi.spyOn>
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>
  let processExitSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    cli = new TranslationCLI()
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    processExitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called')
    })
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Configuration Validation Success Cases', () => {
    it('should handle valid configuration file validation', async () => {
      // Setup: ConfigurationService with valid config
      const mockConfigService = createConfigServiceMock({
        validateJob: vi.fn().mockReturnValue({ valid: true, errors: [] }),
        loadFromFile: vi.fn().mockResolvedValue({
          fileProcessing: {
            sourceDir: './docs',
            targetDir: './translations',
            overwriteExisting: false,
          },
          targetLanguages: ['es', 'fr', 'de'],
          strategy: 'file-by-file',
        }),
      })

      const { ConfigurationService } = await import(
        '../config/ConfigurationService.js'
      )
      vi.mocked(ConfigurationService).mockImplementation(
        () =>
          mockConfigService as unknown as InstanceType<
            typeof ConfigurationService
          >
      )
      // Mock static method
      ;(
        ConfigurationService as unknown as { loadFromFile: unknown }
      ).loadFromFile = mockConfigService.loadFromFile

      const options: ValidateCommandOptions = {
        config: './valid-config.js',
      }

      // Execute
      // Test private handleValidateCommand method
      await (
        cli as unknown as {
          handleValidateCommand: (
            options: ValidateCommandOptions
          ) => Promise<void>
        }
      ).handleValidateCommand(options)

      // Verify success path
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('🔍 Validation Results')
      )
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          '📋 Validating configuration: ./valid-config.js'
        )
      )
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('✅ Configuration is valid')
      )
      expect(mockConfigService.loadFromFile).toHaveBeenCalled()
      expect(mockConfigService.validateJob).toHaveBeenCalled()
    })

    it('should handle valid file structure validation', async () => {
      // Setup: ConfigurationService with valid file structure
      const mockConfigService = createConfigServiceMock({
        validateFileStructure: vi.fn().mockResolvedValue({
          valid: true,
          errors: [],
          warnings: [],
        }),
      })

      const { ConfigurationService } = await import(
        '../config/ConfigurationService.js'
      )
      vi.mocked(ConfigurationService).mockImplementation(
        () =>
          mockConfigService as unknown as InstanceType<
            typeof ConfigurationService
          >
      )
      // Mock static method
      ;(
        ConfigurationService as unknown as { loadFromFile: unknown }
      ).loadFromFile = mockConfigService.loadFromFile

      const options: ValidateCommandOptions = {
        source: './valid-docs',
      }

      // Execute
      // Test private handleValidateCommand method
      await (
        cli as unknown as {
          handleValidateCommand: (
            options: ValidateCommandOptions
          ) => Promise<void>
        }
      ).handleValidateCommand(options)

      // Verify success path
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('🔍 Validation Results')
      )
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('📁 Validating file structure: ./valid-docs')
      )
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('✅ File structure is valid')
      )
      expect(mockConfigService.validateFileStructure).toHaveBeenCalledWith(
        './valid-docs'
      )
    })

    it('should handle both config and source validation successfully', async () => {
      // Setup: ConfigurationService with both validations successful
      const mockConfigService = createConfigServiceMock({
        validateJob: vi.fn().mockReturnValue({ valid: true, errors: [] }),
        validateFileStructure: vi.fn().mockResolvedValue({
          valid: true,
          errors: [],
          warnings: [],
        }),
        loadFromFile: vi.fn().mockResolvedValue({
          fileProcessing: {
            sourceDir: './docs',
            targetDir: './translations',
            overwriteExisting: false,
          },
          targetLanguages: ['es'],
          strategy: 'file-by-file',
        }),
      })

      const { ConfigurationService } = await import(
        '../config/ConfigurationService.js'
      )
      vi.mocked(ConfigurationService).mockImplementation(
        () =>
          mockConfigService as unknown as InstanceType<
            typeof ConfigurationService
          >
      )
      // Mock static method
      ;(
        ConfigurationService as unknown as { loadFromFile: unknown }
      ).loadFromFile = mockConfigService.loadFromFile

      const options: ValidateCommandOptions = {
        config: './config.js',
        source: './docs',
      }

      // Execute
      // Test private handleValidateCommand method
      await (
        cli as unknown as {
          handleValidateCommand: (
            options: ValidateCommandOptions
          ) => Promise<void>
        }
      ).handleValidateCommand(options)

      // Verify both validations run
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('📋 Validating configuration')
      )
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('✅ Configuration is valid')
      )
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('📁 Validating file structure')
      )
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('✅ File structure is valid')
      )
    })
  })

  describe('Configuration Validation Failure Cases', () => {
    it('should handle invalid configuration with error display', async () => {
      // Setup: ConfigurationService with validation errors
      const mockConfigService = createConfigServiceMock({
        validateJob: vi.fn().mockReturnValue({
          valid: false,
          errors: [
            { message: 'Source directory path is invalid' },
            { message: 'Target languages array is empty' },
            { message: 'Strategy is not supported' },
          ],
        }),
        loadFromFile: vi.fn().mockResolvedValue({
          fileProcessing: {
            sourceDir: '',
            targetDir: '',
            overwriteExisting: false,
          },
          targetLanguages: [],
          strategy: 'invalid-strategy',
        }),
      })

      const { ConfigurationService } = await import(
        '../config/ConfigurationService.js'
      )
      vi.mocked(ConfigurationService).mockImplementation(
        () =>
          mockConfigService as unknown as InstanceType<
            typeof ConfigurationService
          >
      )
      // Mock static method
      ;(
        ConfigurationService as unknown as { loadFromFile: unknown }
      ).loadFromFile = mockConfigService.loadFromFile

      const options: ValidateCommandOptions = {
        config: './invalid-config.js',
      }

      // Execute and verify that process.exit is called for validation failures
      try {
        await (
          cli as unknown as {
            handleValidateCommand: (
              options: ValidateCommandOptions
            ) => Promise<void>
          }
        ).handleValidateCommand(options)
        // If no error is thrown, the test should fail
        expect.fail(
          'Expected method to call process.exit for validation failure'
        )
      } catch (error) {
        expect(error).toEqual(new Error('process.exit called'))
      }

      // Verify error path
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('❌ Configuration validation failed:')
      )
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Source directory path is invalid')
      )
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Target languages array is empty')
      )
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Strategy is not supported')
      )
      expect(processExitSpy).toHaveBeenCalledWith(1)
    })

    it('should handle invalid file structure with error display', async () => {
      // Setup: ConfigurationService with file structure errors
      const mockConfigService = createConfigServiceMock({
        validateFileStructure: vi.fn().mockResolvedValue({
          valid: false,
          errors: [
            { message: 'Source directory does not exist' },
            { message: 'No readable markdown files found' },
          ],
          warnings: [],
        }),
      })

      const { ConfigurationService } = await import(
        '../config/ConfigurationService.js'
      )
      vi.mocked(ConfigurationService).mockImplementation(
        () =>
          mockConfigService as unknown as InstanceType<
            typeof ConfigurationService
          >
      )
      // Mock static method
      ;(
        ConfigurationService as unknown as { loadFromFile: unknown }
      ).loadFromFile = mockConfigService.loadFromFile

      const options: ValidateCommandOptions = {
        source: './nonexistent-docs',
      }

      // Execute and verify that process.exit is called for validation failures
      try {
        await (
          cli as unknown as {
            handleValidateCommand: (
              options: ValidateCommandOptions
            ) => Promise<void>
          }
        ).handleValidateCommand(options)
        // If no error is thrown, the test should fail
        expect.fail(
          'Expected method to call process.exit for validation failure'
        )
      } catch (error) {
        expect(error).toEqual(new Error('process.exit called'))
      }

      // Verify error path
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('❌ File structure validation failed:')
      )
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Source directory does not exist')
      )
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('No readable markdown files found')
      )
      expect(processExitSpy).toHaveBeenCalledWith(1)
    })
  })

  describe('File Structure Warnings Display', () => {
    it('should display file structure warnings when present', async () => {
      // Setup: ConfigurationService with warnings
      const mockConfigService = createConfigServiceMock({
        validateFileStructure: vi.fn().mockResolvedValue({
          valid: true,
          errors: [],
          warnings: [
            {
              message: 'Some files may be too large for efficient translation',
            },
            { message: 'Detected non-standard markdown extensions' },
            { message: 'Found files with special characters in names' },
          ],
        }),
      })

      const { ConfigurationService } = await import(
        '../config/ConfigurationService.js'
      )
      vi.mocked(ConfigurationService).mockImplementation(
        () =>
          mockConfigService as unknown as InstanceType<
            typeof ConfigurationService
          >
      )
      // Mock static method
      ;(
        ConfigurationService as unknown as { loadFromFile: unknown }
      ).loadFromFile = mockConfigService.loadFromFile

      const options: ValidateCommandOptions = {
        source: './docs-with-warnings',
      }

      // Execute
      // Test private handleValidateCommand method
      await (
        cli as unknown as {
          handleValidateCommand: (
            options: ValidateCommandOptions
          ) => Promise<void>
        }
      ).handleValidateCommand(options)

      // Verify warnings are displayed
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('✅ File structure is valid')
      )
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('⚠️  Warnings:')
      )
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Some files may be too large')
      )
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Detected non-standard markdown')
      )
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Found files with special characters')
      )
    })

    it('should handle file structure with both errors and warnings', async () => {
      // Setup: ConfigurationService with both errors and warnings
      const mockConfigService = createConfigServiceMock({
        validateFileStructure: vi.fn().mockResolvedValue({
          valid: false,
          errors: [{ message: 'Critical: Source directory not accessible' }],
          warnings: [
            { message: 'Warning: Some files might not translate well' },
          ],
        }),
      })

      const { ConfigurationService } = await import(
        '../config/ConfigurationService.js'
      )
      vi.mocked(ConfigurationService).mockImplementation(
        () =>
          mockConfigService as unknown as InstanceType<
            typeof ConfigurationService
          >
      )
      // Mock static method
      ;(
        ConfigurationService as unknown as { loadFromFile: unknown }
      ).loadFromFile = mockConfigService.loadFromFile

      const options: ValidateCommandOptions = {
        source: './problematic-docs',
      }

      // Execute and verify that process.exit is called for validation failures
      try {
        await (
          cli as unknown as {
            handleValidateCommand: (
              options: ValidateCommandOptions
            ) => Promise<void>
          }
        ).handleValidateCommand(options)
        // If no error is thrown, the test should fail
        expect.fail(
          'Expected method to call process.exit for validation failure'
        )
      } catch (error) {
        expect(error).toEqual(new Error('process.exit called'))
      }

      // Verify both errors and warnings are shown
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('❌ File structure validation failed:')
      )
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Critical: Source directory not accessible')
      )
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('⚠️  Warnings:')
      )
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Warning: Some files might not translate')
      )
      expect(processExitSpy).toHaveBeenCalledWith(1)
    })
  })

  describe('Error Handling in Catch Block', () => {
    it('should handle errors during config file loading', async () => {
      // Setup: ConfigurationService that throws during loadFromFile
      const mockConfigService = createConfigServiceMock({
        loadFromFile: vi
          .fn()
          .mockRejectedValue(new Error('Config file not found')),
      })

      const { ConfigurationService } = await import(
        '../config/ConfigurationService.js'
      )
      vi.mocked(ConfigurationService).mockImplementation(
        () =>
          mockConfigService as unknown as InstanceType<
            typeof ConfigurationService
          >
      )
      // Mock static method
      ;(
        ConfigurationService as unknown as { loadFromFile: unknown }
      ).loadFromFile = mockConfigService.loadFromFile

      const options: ValidateCommandOptions = {
        config: './missing-config.js',
      }

      // Execute and verify that process.exit is called
      // Test private handleValidateCommand method with rejection
      try {
        await (
          cli as unknown as {
            handleValidateCommand: (
              options: ValidateCommandOptions
            ) => Promise<void>
          }
        ).handleValidateCommand(options)
        // If no error is thrown, the test should fail
        expect.fail('Expected method to call process.exit')
      } catch (error) {
        expect(error).toEqual(new Error('process.exit called'))
      }

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('❌ Validation failed:'),
        expect.objectContaining({ message: 'Config file not found' })
      )
      expect(processExitSpy).toHaveBeenCalledWith(1)
    })

    it('should handle errors during file structure validation', async () => {
      // Setup: ConfigurationService that throws during validateFileStructure
      const mockConfigService = createConfigServiceMock({
        validateFileStructure: vi
          .fn()
          .mockRejectedValue(new Error('Permission denied')),
      })

      const { ConfigurationService } = await import(
        '../config/ConfigurationService.js'
      )
      vi.mocked(ConfigurationService).mockImplementation(
        () =>
          mockConfigService as unknown as InstanceType<
            typeof ConfigurationService
          >
      )
      // Mock static method
      ;(
        ConfigurationService as unknown as { loadFromFile: unknown }
      ).loadFromFile = mockConfigService.loadFromFile

      const options: ValidateCommandOptions = {
        source: './restricted-docs',
      }

      // Execute and verify that process.exit is called
      // Test private handleValidateCommand method with rejection
      try {
        await (
          cli as unknown as {
            handleValidateCommand: (
              options: ValidateCommandOptions
            ) => Promise<void>
          }
        ).handleValidateCommand(options)
        // If no error is thrown, the test should fail
        expect.fail('Expected method to call process.exit')
      } catch (error) {
        expect(error).toEqual(new Error('process.exit called'))
      }

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('❌ Validation failed:'),
        expect.objectContaining({ message: 'Permission denied' })
      )
      expect(processExitSpy).toHaveBeenCalledWith(1)
    })

    it('should handle unexpected errors during validation process', async () => {
      // Setup: ConfigurationService that throws unexpected error
      const mockConfigService = createConfigServiceMock({
        validateJob: vi.fn().mockImplementation(() => {
          throw new Error('Unexpected validation error')
        }),
        loadFromFile: vi.fn().mockResolvedValue({
          fileProcessing: {
            sourceDir: './docs',
            targetDir: './translations',
            overwriteExisting: false,
          },
          targetLanguages: ['es'],
          strategy: 'file-by-file',
        }),
      })

      const { ConfigurationService } = await import(
        '../config/ConfigurationService.js'
      )
      vi.mocked(ConfigurationService).mockImplementation(
        () =>
          mockConfigService as unknown as InstanceType<
            typeof ConfigurationService
          >
      )
      // Mock static method
      ;(
        ConfigurationService as unknown as { loadFromFile: unknown }
      ).loadFromFile = mockConfigService.loadFromFile

      const options: ValidateCommandOptions = {
        config: './problematic-config.js',
      }

      // Execute and verify that process.exit is called
      // Test private handleValidateCommand method with rejection
      try {
        await (
          cli as unknown as {
            handleValidateCommand: (
              options: ValidateCommandOptions
            ) => Promise<void>
          }
        ).handleValidateCommand(options)
        // If no error is thrown, the test should fail
        expect.fail('Expected method to call process.exit')
      } catch (error) {
        expect(error).toEqual(new Error('process.exit called'))
      }

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('❌ Validation failed:'),
        expect.objectContaining({ message: 'Unexpected validation error' })
      )
      expect(processExitSpy).toHaveBeenCalledWith(1)
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty options (no config, no source)', async () => {
      const options: ValidateCommandOptions = {}

      // Execute
      // Test private handleValidateCommand method
      await (
        cli as unknown as {
          handleValidateCommand: (
            options: ValidateCommandOptions
          ) => Promise<void>
        }
      ).handleValidateCommand(options)

      // Verify header is shown but no validation occurs
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('🔍 Validation Results')
      )

      // Verify no validation methods are called
      const { ConfigurationService } = await import(
        '../config/ConfigurationService.js'
      )
      const mockInstance = vi.mocked(ConfigurationService).mock.instances[0]
      if (mockInstance) {
        expect(mockInstance.validateJob).not.toHaveBeenCalled()
        expect(mockInstance.validateFileStructure).not.toHaveBeenCalled()
      }
    })

    it('should handle config validation with source validation', async () => {
      // Setup: Both config and source provided with different outcomes
      const mockConfigService = createConfigServiceMock({
        validateJob: vi.fn().mockReturnValue({ valid: true, errors: [] }),
        validateFileStructure: vi.fn().mockResolvedValue({
          valid: false,
          errors: [{ message: 'Source structure issue' }],
          warnings: [{ message: 'Minor source warning' }],
        }),
        loadFromFile: vi.fn().mockResolvedValue({
          fileProcessing: {
            sourceDir: './docs',
            targetDir: './translations',
            overwriteExisting: false,
          },
          targetLanguages: ['es'],
          strategy: 'file-by-file',
        }),
      })

      const { ConfigurationService } = await import(
        '../config/ConfigurationService.js'
      )
      vi.mocked(ConfigurationService).mockImplementation(
        () =>
          mockConfigService as unknown as InstanceType<
            typeof ConfigurationService
          >
      )
      // Mock static method
      ;(
        ConfigurationService as unknown as { loadFromFile: unknown }
      ).loadFromFile = mockConfigService.loadFromFile

      const options: ValidateCommandOptions = {
        config: './good-config.js',
        source: './bad-source',
      }

      // Execute and verify that process.exit is called for validation failures
      try {
        await (
          cli as unknown as {
            handleValidateCommand: (
              options: ValidateCommandOptions
            ) => Promise<void>
          }
        ).handleValidateCommand(options)
        // If no error is thrown, the test should fail
        expect.fail(
          'Expected method to call process.exit for validation failure'
        )
      } catch (error) {
        expect(error).toEqual(new Error('process.exit called'))
      }

      // Verify both validations run with their respective outcomes
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('✅ Configuration is valid')
      )
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('❌ File structure validation failed:')
      )
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Source structure issue')
      )
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('⚠️  Warnings:')
      )
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Minor source warning')
      )
      expect(processExitSpy).toHaveBeenCalledWith(1)
    })
  })
})
