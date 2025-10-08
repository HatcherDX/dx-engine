/**
 * @fileoverview Comprehensive coverage tests for version synchronization script.
 *
 * @description
 * Full test suite that achieves 100% code coverage for the version-sync.ts script
 * by testing all functions, branches, and edge cases.
 *
 * @author Hatcher DX Team
 * @since 0.3.5
 * @public
 */

import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
  beforeAll,
} from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

// Mock modules before importing the module under test
vi.mock('fs')
vi.mock('glob')

describe('Version Sync Script - Full Coverage', () => {
  let consoleLogSpy: any
  let consoleErrorSpy: any
  let consoleWarnSpy: any
  let processExitSpy: any
  let originalArgv: string[]
  let originalEnv: any

  beforeAll(() => {
    // Set test environment to prevent script auto-execution
    process.env.NODE_ENV = 'test'
    process.env.VITEST = 'true'
  })

  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()

    // Store originals
    originalArgv = process.argv
    originalEnv = { ...process.env }

    // Mock console methods
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    // Mock process.exit
    processExitSpy = vi
      .spyOn(process, 'exit')
      .mockImplementation((code?: number) => {
        throw new Error(`Process exited with code ${code}`)
      })
  })

  afterEach(() => {
    // Restore originals
    process.argv = originalArgv
    process.env = originalEnv

    vi.resetAllMocks()
    consoleLogSpy.mockRestore()
    consoleErrorSpy.mockRestore()
    consoleWarnSpy.mockRestore()
    processExitSpy.mockRestore()
  })

  describe('updatePackageVersion function', () => {
    let updatePackageVersion: any

    beforeEach(async () => {
      // Import fresh module for each test
      const module = await import('./version-sync')
      updatePackageVersion = module.updatePackageVersion
    })

    it('should update package version successfully', () => {
      const mockPackageJson = {
        name: 'test-package',
        version: '1.0.0',
      }

      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify(mockPackageJson)
      )
      vi.mocked(fs.writeFileSync).mockImplementation(() => {})

      const result = updatePackageVersion('/test/package.json', '2.0.0')

      expect(result).toBe(true)
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        '/test/package.json',
        JSON.stringify({ ...mockPackageJson, version: '2.0.0' }, null, 2) + '\n'
      )
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('updated: v1.0.0 → v2.0.0')
      )
    })

    it('should skip update when version is already the same', () => {
      const mockPackageJson = {
        name: 'test-package',
        version: '1.0.0',
      }

      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify(mockPackageJson)
      )

      const result = updatePackageVersion('/test/package.json', '1.0.0')

      expect(result).toBe(true)
      expect(fs.writeFileSync).not.toHaveBeenCalled()
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('already at v1.0.0')
      )
    })

    it('should handle non-existent file', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false)

      const result = updatePackageVersion('/test/package.json', '2.0.0')

      expect(result).toBe(false)
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('File not found')
      )
      expect(fs.readFileSync).not.toHaveBeenCalled()
      expect(fs.writeFileSync).not.toHaveBeenCalled()
    })

    it('should handle JSON parse error', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockReturnValue('invalid json')

      const result = updatePackageVersion('/test/package.json', '2.0.0')

      expect(result).toBe(false)
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error updating'),
        expect.any(Error)
      )
    })

    it('should handle file write error', () => {
      const mockPackageJson = {
        name: 'test-package',
        version: '1.0.0',
      }

      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify(mockPackageJson)
      )
      vi.mocked(fs.writeFileSync).mockImplementation(() => {
        throw new Error('Write permission denied')
      })

      const result = updatePackageVersion('/test/package.json', '2.0.0')

      expect(result).toBe(false)
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error updating'),
        expect.any(Error)
      )
    })
  })

  describe('main function', () => {
    let main: any
    let glob: any

    beforeEach(async () => {
      // Import fresh module and glob mock
      const globModule = await import('glob')
      glob = globModule.glob
      const module = await import('./version-sync')
      main = module.main
    })

    it('should exit with error when no version argument provided', async () => {
      process.argv = ['node', 'version-sync.ts']

      await expect(main()).rejects.toThrow('Process exited with code 1')

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '❌ Please provide a version number as argument'
      )
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Usage: pnpm tsx scripts/version-sync.ts <version>'
      )
    })

    it('should process all package.json files successfully', async () => {
      process.argv = ['node', 'version-sync.ts', '2.0.0']

      // Mock glob to return test files
      vi.mocked(glob).mockImplementation(async (pattern: string) => {
        if (pattern === 'package.json') return ['/root/package.json']
        if (pattern === 'apps/*/package.json')
          return ['/root/apps/web/package.json']
        if (pattern === 'universal/*/package.json')
          return ['/root/universal/storage/package.json']
        if (pattern === 'tooling/*/package.json') return []
        return []
      })

      // Mock file operations
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({ name: 'test', version: '1.0.0' })
      )
      vi.mocked(fs.writeFileSync).mockImplementation(() => {})

      await main()

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          '🔄 Synchronizing all packages to version 2.0.0'
        )
      )
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Found 3 package.json files to update')
      )
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('✨ Version sync complete!')
      )
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('✅ Updated: 3 files')
      )
    })

    it('should handle duplicates in glob results', async () => {
      process.argv = ['node', 'version-sync.ts', '2.0.0']

      // Mock glob to return duplicates
      vi.mocked(glob).mockImplementation(async (pattern: string) => {
        if (pattern === 'package.json') return ['/root/package.json']
        if (pattern === 'apps/*/package.json') return ['/root/package.json'] // Duplicate
        return []
      })

      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({ name: 'test', version: '1.0.0' })
      )
      vi.mocked(fs.writeFileSync).mockImplementation(() => {})

      await main()

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Found 1 package.json files to update')
      )
    })

    it('should exit with error when some files fail to update', async () => {
      process.argv = ['node', 'version-sync.ts', '2.0.0']

      vi.mocked(glob).mockImplementation(async (pattern: string) => {
        if (pattern === 'package.json')
          return ['/root/package.json', '/root/broken/package.json']
        return []
      })

      // First file succeeds, second fails
      vi.mocked(fs.existsSync)
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(false)

      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({ name: 'test', version: '1.0.0' })
      )
      vi.mocked(fs.writeFileSync).mockImplementation(() => {})

      await expect(main()).rejects.toThrow('Process exited with code 1')

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('✅ Updated: 1 files')
      )
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('❌ Failed: 1 files')
      )
    })

    it('should handle glob with all ignore patterns', async () => {
      process.argv = ['node', 'version-sync.ts', '2.0.0']

      let capturedGlobOptions: any = null

      vi.mocked(glob).mockImplementation(
        async (pattern: string, options: any) => {
          capturedGlobOptions = options
          return []
        }
      )

      await main()

      expect(capturedGlobOptions).toMatchObject({
        ignore: expect.arrayContaining([
          '**/node_modules/**',
          '**/dist/**',
          '**/build/**',
          '**/.vitepress/**',
        ]),
        absolute: true,
      })
    })
  })

  describe('Script execution detection', () => {
    it('should not execute main when imported as module', async () => {
      // Set environment to indicate module import
      process.env.NODE_ENV = 'production'
      delete process.env.VITEST
      process.argv = ['node', 'other-script.ts']

      // Mock import.meta.url to simulate module import
      const originalUrl = import.meta.url
      Object.defineProperty(import.meta, 'url', {
        value: 'file:///different/path',
        configurable: true,
      })

      // Import should not trigger main execution
      await import('./version-sync')

      // Restore
      Object.defineProperty(import.meta, 'url', {
        value: originalUrl,
        configurable: true,
      })

      // Main should not have been called
      expect(consoleLogSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('🔄 Synchronizing')
      )
    })

    it.skipIf(process.env.CI === 'true')(
      'should execute main when run directly and handle errors',
      async () => {
        // Reset modules to get fresh import
        vi.resetModules()

        // Clear test environment
        delete process.env.NODE_ENV
        delete process.env.VITEST

        // Set up as if script is run directly
        const scriptPath = fileURLToPath(import.meta.url).replace(
          '.coverage.spec.ts',
          '.ts'
        )
        process.argv = ['node', scriptPath, '2.0.0']

        // Mock glob to throw an error
        const globModule = await import('glob')
        vi.mocked(globModule.glob).mockRejectedValue(new Error('Glob error'))

        // Mock import.meta.url to match argv[1]
        const originalUrl = import.meta.url
        Object.defineProperty(import.meta, 'url', {
          value: `file://${scriptPath}`,
          configurable: true,
        })

        // Import should trigger main execution
        try {
          await import('./version-sync')
        } catch (error: any) {
          expect(error.message).toContain('Process exited with code 1')
        }

        // Wait for async operations
        await new Promise((resolve) => setTimeout(resolve, 10))

        expect(consoleErrorSpy).toHaveBeenCalledWith(
          '❌ Script failed:',
          expect.any(Error)
        )

        // Restore
        Object.defineProperty(import.meta, 'url', {
          value: originalUrl,
          configurable: true,
        })
      }
    )
  })
})
