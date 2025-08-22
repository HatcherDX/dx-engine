/**
 * @fileoverview Comprehensive tests for setup-env.ts
 *
 * @description
 * Tests for environment file setup script functionality:
 * - File mapping configuration validation
 * - Environment file copying functionality
 * - Error handling for missing source files
 * - Skip logic for existing destination files
 * - File system operations and console output verification
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import path from 'path'

// Mock modules before importing the module under test
vi.mock('fs', () => ({
  default: {
    existsSync: vi.fn(),
    copyFileSync: vi.fn(),
  },
  existsSync: vi.fn(),
  copyFileSync: vi.fn(),
}))

vi.mock('path', () => ({
  default: {
    join: vi.fn(),
  },
  join: vi.fn(),
}))

describe('Setup Environment Script', () => {
  let consoleLogSpy: any
  let consoleErrorSpy: any
  let consoleWarnSpy: any
  let processCwdSpy: any

  let setupEnvironmentFiles: any
  let filesToCopy: any
  let projectRoot: any

  beforeEach(async () => {
    // Mock console methods
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    // Mock process.cwd
    processCwdSpy = vi.spyOn(process, 'cwd').mockReturnValue('/test/project')

    // Set up simple path mocking
    vi.mocked(path.join).mockImplementation((...args: string[]) => {
      return args.filter(Boolean).join('/')
    })

    // Set up default fs mocks
    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.copyFileSync).mockImplementation(() => undefined)

    // Clear all mocks before importing fresh module
    vi.clearAllMocks()

    // Import the module fresh for each test
    const module = await import('./setup-env')
    setupEnvironmentFiles = module.setupEnvironmentFiles
    filesToCopy = module.filesToCopy
    projectRoot = module.projectRoot
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Module Exports and Configuration', () => {
    it('should export setupEnvironmentFiles function', () => {
      expect(typeof setupEnvironmentFiles).toBe('function')
    })

    it('should export filesToCopy array with correct structure', () => {
      expect(Array.isArray(filesToCopy)).toBe(true)
      expect(filesToCopy).toHaveLength(3)

      const expectedMappings = [
        { source: '.env.example', destination: '.env' },
        {
          source: 'apps/electron/.env.development.example',
          destination: 'apps/electron/.env.development',
        },
        {
          source: 'apps/electron/.env.production.example',
          destination: 'apps/electron/.env.production',
        },
      ]

      expectedMappings.forEach((expected, index) => {
        expect(filesToCopy[index]).toEqual(expected)
      })
    })

    it('should export projectRoot as string', () => {
      expect(typeof projectRoot).toBe('string')
    })

    it('should have valid file mapping structure', () => {
      filesToCopy.forEach((mapping: any) => {
        expect(mapping).toHaveProperty('source')
        expect(mapping).toHaveProperty('destination')
        expect(typeof mapping.source).toBe('string')
        expect(typeof mapping.destination).toBe('string')
        expect(mapping.source.length).toBeGreaterThan(0)
        expect(mapping.destination.length).toBeGreaterThan(0)
      })
    })
  })

  describe('File Mapping Configuration', () => {
    it('should include root .env mapping', () => {
      const rootMapping = filesToCopy.find(
        (mapping: any) =>
          mapping.source === '.env.example' && mapping.destination === '.env'
      )
      expect(rootMapping).toBeDefined()
    })

    it('should include electron development environment mapping', () => {
      const devMapping = filesToCopy.find(
        (mapping: any) =>
          mapping.source === 'apps/electron/.env.development.example' &&
          mapping.destination === 'apps/electron/.env.development'
      )
      expect(devMapping).toBeDefined()
    })

    it('should include electron production environment mapping', () => {
      const prodMapping = filesToCopy.find(
        (mapping: any) =>
          mapping.source === 'apps/electron/.env.production.example' &&
          mapping.destination === 'apps/electron/.env.production'
      )
      expect(prodMapping).toBeDefined()
    })

    it('should have unique source files', () => {
      const sources = filesToCopy.map((mapping: any) => mapping.source)
      const uniqueSources = [...new Set(sources)]
      expect(sources).toHaveLength(uniqueSources.length)
    })

    it('should have unique destination files', () => {
      const destinations = filesToCopy.map(
        (mapping: any) => mapping.destination
      )
      const uniqueDestinations = [...new Set(destinations)]
      expect(destinations).toHaveLength(uniqueDestinations.length)
    })
  })

  describe('Environment File Setup Function', () => {
    beforeEach(() => {
      // Mock file system operations with simple, predictable behavior
      vi.mocked(fs.existsSync).mockImplementation((filePath) => {
        const pathStr = String(filePath)
        // Source files (.example) exist by default
        if (pathStr.includes('.example')) return true
        // Destination files don't exist by default (need to be created)
        return false
      })

      vi.mocked(fs.copyFileSync).mockImplementation(() => undefined)
    })

    it('should successfully copy all environment files when sources exist and destinations do not', () => {
      setupEnvironmentFiles()

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '🔧 Setting up environment files...'
      )
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '✅ Created .env from .env.example'
      )
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '✅ Created apps/electron/.env.development from apps/electron/.env.development.example'
      )
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '✅ Created apps/electron/.env.production from apps/electron/.env.production.example'
      )
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '🎉 Environment setup complete! Created 3 files.'
      )

      expect(vi.mocked(fs.copyFileSync)).toHaveBeenCalledTimes(3)
    })

    it('should skip copying when destination files already exist', () => {
      // All files exist (both source and destination)
      vi.mocked(fs.existsSync).mockReturnValue(true)

      setupEnvironmentFiles()

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '⏭️  .env already exists, skipping'
      )
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '⏭️  apps/electron/.env.development already exists, skipping'
      )
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '⏭️  apps/electron/.env.production already exists, skipping'
      )
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '🎉 Environment setup complete! Created 0 files.'
      )

      expect(vi.mocked(fs.copyFileSync)).not.toHaveBeenCalled()
    })

    it('should warn when source files are missing', () => {
      // No source files exist
      vi.mocked(fs.existsSync).mockReturnValue(false)

      setupEnvironmentFiles()

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '⚠️  Source file not found: .env.example'
      )
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '⚠️  Source file not found: apps/electron/.env.development.example'
      )
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '⚠️  Source file not found: apps/electron/.env.production.example'
      )
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '🎉 Environment setup complete! Created 0 files.'
      )

      expect(vi.mocked(fs.copyFileSync)).not.toHaveBeenCalled()
    })

    it('should handle mixed scenarios correctly', () => {
      vi.mocked(fs.existsSync).mockImplementation((filePath) => {
        const pathStr = String(filePath)

        // First file: source exists, destination doesn't (should copy)
        if (pathStr.includes('.env.example')) return true
        if (pathStr.endsWith('/.env')) return false

        // Second file: source doesn't exist (should warn)
        if (pathStr.includes('.env.development.example')) return false
        if (pathStr.includes('.env.development')) return false

        // Third file: both exist (should skip)
        if (pathStr.includes('.env.production.example')) return true
        if (pathStr.includes('.env.production')) return true

        return false
      })

      setupEnvironmentFiles()

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '✅ Created .env from .env.example'
      )
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '⚠️  Source file not found: apps/electron/.env.development.example'
      )
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '⏭️  apps/electron/.env.production already exists, skipping'
      )
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '🎉 Environment setup complete! Created 1 files.'
      )

      expect(vi.mocked(fs.copyFileSync)).toHaveBeenCalledTimes(1)
    })

    it('should call path.join with correct arguments', () => {
      setupEnvironmentFiles()

      // Verify path.join was called for constructing source and destination paths
      expect(vi.mocked(path.join)).toHaveBeenCalledWith(
        '/test/project',
        '.env.example'
      )
      expect(vi.mocked(path.join)).toHaveBeenCalledWith('/test/project', '.env')
      expect(vi.mocked(path.join)).toHaveBeenCalledWith(
        '/test/project',
        'apps/electron/.env.development.example'
      )
      expect(vi.mocked(path.join)).toHaveBeenCalledWith(
        '/test/project',
        'apps/electron/.env.development'
      )
      expect(vi.mocked(path.join)).toHaveBeenCalledWith(
        '/test/project',
        'apps/electron/.env.production.example'
      )
      expect(vi.mocked(path.join)).toHaveBeenCalledWith(
        '/test/project',
        'apps/electron/.env.production'
      )
    })

    it('should maintain correct file count throughout execution', () => {
      // Test that file count is correctly tracked
      vi.mocked(fs.existsSync).mockImplementation((filePath) => {
        const pathStr = String(filePath)
        if (pathStr.includes('.example')) return true
        return false // No destination files exist
      })

      setupEnvironmentFiles()

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '🎉 Environment setup complete! Created 3 files.'
      )
    })
  })

  describe('Error Handling', () => {
    beforeEach(() => {
      // Setup default successful conditions
      vi.mocked(fs.existsSync).mockImplementation((filePath) => {
        const pathStr = String(filePath)
        if (pathStr.includes('.example')) return true
        return false
      })
    })

    it('should handle file copy errors gracefully', () => {
      vi.mocked(fs.copyFileSync).mockImplementation(() => {
        throw new Error('Permission denied')
      })

      setupEnvironmentFiles()

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '❌ Failed to create .env:',
        'Permission denied'
      )
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '❌ Failed to create apps/electron/.env.development:',
        'Permission denied'
      )
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '❌ Failed to create apps/electron/.env.production:',
        'Permission denied'
      )
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '🎉 Environment setup complete! Created 0 files.'
      )
    })

    it('should handle non-Error exception types', () => {
      vi.mocked(fs.copyFileSync).mockImplementation(() => {
        throw 'String error'
      })

      setupEnvironmentFiles()

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '❌ Failed to create .env:',
        'Unknown error'
      )
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '🎉 Environment setup complete! Created 0 files.'
      )
    })

    it('should handle null exceptions', () => {
      vi.mocked(fs.copyFileSync).mockImplementation(() => {
        throw null
      })

      setupEnvironmentFiles()

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '❌ Failed to create .env:',
        'Unknown error'
      )
    })

    it('should handle undefined exceptions', () => {
      vi.mocked(fs.copyFileSync).mockImplementation(() => {
        throw undefined
      })

      setupEnvironmentFiles()

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '❌ Failed to create .env:',
        'Unknown error'
      )
    })

    it('should handle partial failures correctly', () => {
      let copyCallCount = 0
      vi.mocked(fs.copyFileSync).mockImplementation(() => {
        copyCallCount++
        if (copyCallCount === 2) {
          throw new Error('Second file failed')
        }
      })

      setupEnvironmentFiles()

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '✅ Created .env from .env.example'
      )
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '❌ Failed to create apps/electron/.env.development:',
        'Second file failed'
      )
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '✅ Created apps/electron/.env.production from apps/electron/.env.production.example'
      )
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '🎉 Environment setup complete! Created 2 files.'
      )
    })

    it('should handle fs.existsSync throwing errors', () => {
      vi.mocked(fs.existsSync).mockImplementation(() => {
        throw new Error('File system error')
      })

      expect(() => setupEnvironmentFiles()).toThrow('File system error')
    })
  })

  describe('Path Construction and File System Operations', () => {
    beforeEach(() => {
      vi.mocked(fs.existsSync).mockImplementation((filePath) => {
        const pathStr = String(filePath)
        if (pathStr.includes('.example')) return true
        return false
      })
      vi.mocked(fs.copyFileSync).mockImplementation(() => undefined)
    })

    it('should construct paths correctly for all file mappings', () => {
      setupEnvironmentFiles()

      // Verify that path.join was called for each source and destination
      const expectedCalls = [
        ['/test/project', '.env.example'],
        ['/test/project', '.env'],
        ['/test/project', 'apps/electron/.env.development.example'],
        ['/test/project', 'apps/electron/.env.development'],
        ['/test/project', 'apps/electron/.env.production.example'],
        ['/test/project', 'apps/electron/.env.production'],
      ]

      expectedCalls.forEach((expectedCall) => {
        expect(vi.mocked(path.join)).toHaveBeenCalledWith(...expectedCall)
      })
    })

    it('should call fs.copyFileSync with correct paths', () => {
      setupEnvironmentFiles()

      expect(vi.mocked(fs.copyFileSync)).toHaveBeenCalledWith(
        '/test/project/.env.example',
        '/test/project/.env'
      )
      expect(vi.mocked(fs.copyFileSync)).toHaveBeenCalledWith(
        '/test/project/apps/electron/.env.development.example',
        '/test/project/apps/electron/.env.development'
      )
      expect(vi.mocked(fs.copyFileSync)).toHaveBeenCalledWith(
        '/test/project/apps/electron/.env.production.example',
        '/test/project/apps/electron/.env.production'
      )
    })

    it('should check file existence for correct paths', () => {
      setupEnvironmentFiles()

      const expectedExistsCalls = [
        '/test/project/.env.example',
        '/test/project/.env',
        '/test/project/apps/electron/.env.development.example',
        '/test/project/apps/electron/.env.development',
        '/test/project/apps/electron/.env.production.example',
        '/test/project/apps/electron/.env.production',
      ]

      expectedExistsCalls.forEach((expectedPath) => {
        expect(vi.mocked(fs.existsSync)).toHaveBeenCalledWith(expectedPath)
      })
    })
  })

  describe('Console Output Formatting', () => {
    it('should display proper emojis and formatting', () => {
      vi.mocked(fs.existsSync).mockImplementation((filePath) => {
        const pathStr = String(filePath)
        if (pathStr.includes('.example')) return true
        return false
      })
      vi.mocked(fs.copyFileSync).mockImplementation(() => undefined)

      setupEnvironmentFiles()

      const logCalls = consoleLogSpy.mock.calls.map((call: any[]) => call[0])

      expect(logCalls).toContain('🔧 Setting up environment files...')
      expect(logCalls).toContain('✅ Created .env from .env.example')
      expect(logCalls).toContain(
        '🎉 Environment setup complete! Created 3 files.'
      )
    })

    it('should use correct emojis for different scenarios', () => {
      // Test all warning scenarios
      vi.mocked(fs.existsSync).mockReturnValue(false)
      setupEnvironmentFiles()
      expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringMatching(/^⚠️/))

      vi.clearAllMocks()
      consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      // Test all skip scenarios
      vi.mocked(fs.existsSync).mockReturnValue(true)
      setupEnvironmentFiles()
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringMatching(/^⏭️/))
    })

    it('should display complete summary message', () => {
      vi.mocked(fs.existsSync).mockImplementation((filePath) => {
        const pathStr = String(filePath)
        if (pathStr.includes('.example')) return true
        return false
      })
      vi.mocked(fs.copyFileSync).mockImplementation(() => undefined)

      setupEnvironmentFiles()

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '🎉 Environment setup complete! Created 3 files.'
      )
    })
  })

  describe('Integration Tests', () => {
    it('should handle complete workflow with realistic file system state', () => {
      // Simulate realistic scenario: some files exist, some don't
      vi.mocked(fs.existsSync).mockImplementation((filePath) => {
        const pathStr = String(filePath)

        // Root .env.example exists, .env doesn't
        if (pathStr.includes('.env.example')) return true
        if (pathStr.endsWith('/.env')) return false

        // Development files don't exist
        if (pathStr.includes('.env.development')) return false

        // Production example exists, production env exists
        if (pathStr.includes('.env.production.example')) return true
        if (pathStr.includes('.env.production')) return true

        return false
      })
      vi.mocked(fs.copyFileSync).mockImplementation(() => undefined)

      setupEnvironmentFiles()

      // Should create root .env
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '✅ Created .env from .env.example'
      )

      // Should warn about missing development example
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '⚠️  Source file not found: apps/electron/.env.development.example'
      )

      // Should skip existing production file
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '⏭️  apps/electron/.env.production already exists, skipping'
      )

      // Should report correct count
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '🎉 Environment setup complete! Created 1 files.'
      )

      expect(vi.mocked(fs.copyFileSync)).toHaveBeenCalledTimes(1)
    })

    it('should work with empty project (no example files)', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false)

      setupEnvironmentFiles()

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '🔧 Setting up environment files...'
      )
      expect(consoleWarnSpy).toHaveBeenCalledTimes(3)
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '🎉 Environment setup complete! Created 0 files.'
      )
      expect(vi.mocked(fs.copyFileSync)).not.toHaveBeenCalled()
    })

    it('should work with fully set up project (all files exist)', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)

      setupEnvironmentFiles()

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '🔧 Setting up environment files...'
      )
      expect(consoleLogSpy).toHaveBeenCalledTimes(5) // Start + 3 skip messages + end
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '🎉 Environment setup complete! Created 0 files.'
      )
      expect(vi.mocked(fs.copyFileSync)).not.toHaveBeenCalled()
    })

    it('should handle all files created successfully', () => {
      vi.mocked(fs.existsSync).mockImplementation((filePath) => {
        const pathStr = String(filePath)
        if (pathStr.includes('.example')) return true
        return false
      })
      vi.mocked(fs.copyFileSync).mockImplementation(() => undefined)

      setupEnvironmentFiles()

      expect(vi.mocked(fs.copyFileSync)).toHaveBeenCalledTimes(3)
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '🎉 Environment setup complete! Created 3 files.'
      )
    })
  })
})
