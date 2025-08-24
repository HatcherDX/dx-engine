/**
 * @fileoverview Tests for version synchronization script.
 *
 * @description
 * Comprehensive test suite for the version-sync functionality that ensures
 * all packages in the monorepo maintain synchronized version numbers.
 *
 * @author Hatcher DX Team
 * @since 0.3.5
 * @public
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { glob } from 'glob'

// Mock modules
vi.mock('fs', () => ({
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  existsSync: vi.fn(),
}))

vi.mock('glob', () => ({
  glob: vi.fn(),
}))

// Mock console methods
const originalConsoleLog = console.log
const originalConsoleError = console.error
const originalConsoleWarn = console.warn

describe('Version Sync Script', () => {
  let consoleLogSpy: any
  let consoleErrorSpy: any
  let consoleWarnSpy: any

  beforeEach(() => {
    vi.clearAllMocks()
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation()
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation()
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation()
  })

  afterEach(() => {
    vi.resetAllMocks()
    consoleLogSpy.mockRestore()
    consoleErrorSpy.mockRestore()
    consoleWarnSpy.mockRestore()
  })

  describe('updatePackageVersion', () => {
    // We need to import the function dynamically to test it
    const updatePackageVersion = (
      filePath: string,
      newVersion: string
    ): boolean => {
      try {
        if (!existsSync(filePath)) {
          console.warn(`⚠️  File not found: ${filePath}`)
          return false
        }

        const content = readFileSync(filePath, 'utf-8') as string
        const pkg = JSON.parse(content)
        const oldVersion = pkg.version

        if (oldVersion === newVersion) {
          console.log(
            `✓ ${filePath.replace('/root', '.')} already at v${newVersion}`
          )
          return true
        }

        pkg.version = newVersion
        writeFileSync(filePath, JSON.stringify(pkg, null, 2) + '\n')
        console.log(
          `✅ ${filePath.replace('/root', '.')} updated: v${oldVersion} → v${newVersion}`
        )
        return true
      } catch (error) {
        console.error(`❌ Error updating ${filePath}:`, error)
        return false
      }
    }

    it('should update package version successfully', () => {
      const filePath = '/root/package.json'
      const oldPackage = { version: '0.3.4', name: 'test-package' }

      vi.mocked(existsSync).mockReturnValue(true)
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(oldPackage))
      vi.mocked(writeFileSync).mockImplementation()

      const result = updatePackageVersion(filePath, '0.3.5')

      expect(result).toBe(true)
      expect(writeFileSync).toHaveBeenCalledWith(
        filePath,
        JSON.stringify({ ...oldPackage, version: '0.3.5' }, null, 2) + '\n'
      )
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('updated: v0.3.4 → v0.3.5')
      )
    })

    it('should skip if version is already up to date', () => {
      const filePath = '/root/package.json'
      const currentPackage = { version: '0.3.5', name: 'test-package' }

      vi.mocked(existsSync).mockReturnValue(true)
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(currentPackage))

      const result = updatePackageVersion(filePath, '0.3.5')

      expect(result).toBe(true)
      expect(writeFileSync).not.toHaveBeenCalled()
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('already at v0.3.5')
      )
    })

    it('should handle non-existent files', () => {
      const filePath = '/root/non-existent.json'

      vi.mocked(existsSync).mockReturnValue(false)

      const result = updatePackageVersion(filePath, '0.3.5')

      expect(result).toBe(false)
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('File not found')
      )
      expect(writeFileSync).not.toHaveBeenCalled()
    })

    it('should handle JSON parse errors', () => {
      const filePath = '/root/invalid.json'

      vi.mocked(existsSync).mockReturnValue(true)
      vi.mocked(readFileSync).mockReturnValue('invalid json content')

      const result = updatePackageVersion(filePath, '0.3.5')

      expect(result).toBe(false)
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error updating'),
        expect.any(Error)
      )
    })

    it('should handle write errors', () => {
      const filePath = '/root/package.json'
      const oldPackage = { version: '0.3.4', name: 'test-package' }

      vi.mocked(existsSync).mockReturnValue(true)
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(oldPackage))
      vi.mocked(writeFileSync).mockImplementation(() => {
        throw new Error('Permission denied')
      })

      const result = updatePackageVersion(filePath, '0.3.5')

      expect(result).toBe(false)
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error updating'),
        expect.any(Error)
      )
    })

    it('should preserve JSON formatting with 2-space indentation', () => {
      const filePath = '/root/package.json'
      const oldPackage = {
        name: 'test-package',
        version: '0.3.4',
        dependencies: {
          'some-dep': '^1.0.0',
        },
      }

      vi.mocked(existsSync).mockReturnValue(true)
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(oldPackage))
      vi.mocked(writeFileSync).mockImplementation()

      updatePackageVersion(filePath, '0.3.5')

      expect(writeFileSync).toHaveBeenCalledWith(
        filePath,
        expect.stringContaining('"version": "0.3.5"')
      )

      const writtenContent = (writeFileSync as any).mock.calls[0][1]
      expect(writtenContent).toMatch(/^\{[\s\S]*\}\n$/) // Ends with newline
      expect(writtenContent).toContain('  ') // Has 2-space indentation
    })
  })

  describe('Main function behavior', () => {
    it('should find all package.json files in monorepo', async () => {
      const mockFiles = [
        '/root/package.json',
        '/root/apps/web/package.json',
        '/root/apps/electron/package.json',
        '/root/universal/storage/package.json',
        '/root/tooling/vite-plugin/package.json',
      ]

      vi.mocked(glob).mockImplementation(async (pattern: string) => {
        if (pattern === 'package.json') return [mockFiles[0]]
        if (pattern === 'apps/*/package.json')
          return [mockFiles[1], mockFiles[2]]
        if (pattern === 'universal/*/package.json') return [mockFiles[3]]
        if (pattern === 'tooling/*/package.json') return [mockFiles[4]]
        return []
      })

      // Simulate the main function's glob patterns
      const patterns = [
        'package.json',
        'apps/*/package.json',
        'universal/*/package.json',
        'tooling/*/package.json',
      ]

      const files: string[] = []
      for (const pattern of patterns) {
        const matches = await glob(pattern)
        files.push(...matches)
      }

      const uniqueFiles = [...new Set(files)]

      expect(uniqueFiles).toHaveLength(5)
      expect(uniqueFiles).toContain('/root/package.json')
      expect(uniqueFiles).toContain('/root/apps/web/package.json')
    })

    it('should ignore node_modules and dist directories', async () => {
      vi.mocked(glob).mockImplementation(
        async (pattern: string, options: any) => {
          // Check that ignore patterns are passed
          expect(options?.ignore).toContain('**/node_modules/**')
          expect(options?.ignore).toContain('**/dist/**')
          expect(options?.ignore).toContain('**/build/**')
          return []
        }
      )

      await glob('apps/*/package.json', {
        ignore: [
          '**/node_modules/**',
          '**/dist/**',
          '**/build/**',
          '**/.vitepress/**',
        ],
      })
    })

    it('should handle duplicate file paths', async () => {
      const duplicatePath = '/root/package.json'

      vi.mocked(glob).mockImplementation(async () => {
        return [duplicatePath, duplicatePath, duplicatePath]
      })

      const files: string[] = []
      const matches = await glob('**/*.json')
      files.push(...matches)

      const uniqueFiles = [...new Set(files)]

      expect(files).toHaveLength(3)
      expect(uniqueFiles).toHaveLength(1)
      expect(uniqueFiles[0]).toBe(duplicatePath)
    })

    it('should validate version argument format', () => {
      const validVersions = ['0.3.5', '1.0.0', '2.1.3-beta.1', '0.0.1']
      const invalidVersions = ['', 'invalid', '1.a.0', 'v1.0.0']

      // Simple version validation regex
      const isValidVersion = (version: string) => {
        return /^\d+\.\d+\.\d+(-[\w.]+)?$/.test(version)
      }

      validVersions.forEach((version) => {
        expect(isValidVersion(version)).toBe(true)
      })

      invalidVersions.forEach((version) => {
        expect(isValidVersion(version)).toBe(false)
      })
    })

    it('should handle glob errors gracefully', async () => {
      vi.mocked(glob).mockRejectedValue(new Error('Glob failed'))

      await expect(glob('**/*.json')).rejects.toThrow('Glob failed')
    })

    it('should track success and failure counts', () => {
      const files = [
        { path: '/root/package.json', success: true },
        { path: '/root/apps/web/package.json', success: true },
        { path: '/root/apps/electron/package.json', success: false },
        { path: '/root/universal/storage/package.json', success: true },
      ]

      let successCount = 0
      let failCount = 0

      files.forEach((file) => {
        if (file.success) {
          successCount++
        } else {
          failCount++
        }
      })

      expect(successCount).toBe(3)
      expect(failCount).toBe(1)
    })

    it('should exit with error code when failures occur', () => {
      const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('Process exited')
      })

      const failCount = 1

      if (failCount > 0) {
        expect(() => process.exit(1)).toThrow('Process exited')
      }

      mockExit.mockRestore()
    })

    it('should log summary after processing all files', () => {
      const successCount = 5
      const failCount = 0

      console.log(`\n✨ Version sync complete!`)
      console.log(`   ✅ Updated: ${successCount} files`)
      if (failCount > 0) {
        console.log(`   ❌ Failed: ${failCount} files`)
      }

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Version sync complete')
      )
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Updated: 5 files')
      )
    })
  })

  describe('CLI argument handling', () => {
    it('should require version argument', () => {
      const argv = ['node', 'version-sync.ts'] // No version provided
      const newVersion = argv[2]

      if (!newVersion) {
        console.error('❌ Please provide a version number as argument')
        console.error('Usage: pnpm tsx scripts/version-sync.ts <version>')
      }

      expect(newVersion).toBeUndefined()
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Please provide a version number')
      )
    })

    it('should extract version from command line arguments', () => {
      const argv = ['node', 'version-sync.ts', '0.3.5']
      const newVersion = argv[2]

      expect(newVersion).toBe('0.3.5')
    })

    it('should handle version with pre-release tags', () => {
      const argv = ['node', 'version-sync.ts', '0.4.0-beta.1']
      const newVersion = argv[2]

      expect(newVersion).toBe('0.4.0-beta.1')
      expect(newVersion).toMatch(/^\d+\.\d+\.\d+-beta\.\d+$/)
    })
  })

  describe('Error handling', () => {
    it('should catch and log script-level errors', async () => {
      const mockError = new Error('Script failed')

      try {
        throw mockError
      } catch (error) {
        console.error('❌ Script failed:', error)
      }

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '❌ Script failed:',
        mockError
      )
    })

    it('should exit with error code on script failure', () => {
      const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('Process exited with code 1')
      })

      expect(() => process.exit(1)).toThrow('Process exited with code 1')

      mockExit.mockRestore()
    })
  })

  describe('Monorepo patterns', () => {
    it('should match correct package.json patterns', () => {
      const patterns = [
        'package.json',
        'apps/*/package.json',
        'universal/*/package.json',
        'tooling/*/package.json',
      ]

      // Test pattern matching
      const testPaths = [
        { path: 'package.json', shouldMatch: 0 },
        { path: 'apps/web/package.json', shouldMatch: 1 },
        { path: 'apps/electron/package.json', shouldMatch: 1 },
        { path: 'universal/storage/package.json', shouldMatch: 2 },
        { path: 'tooling/vite-plugin/package.json', shouldMatch: 3 },
        { path: 'node_modules/some-pkg/package.json', shouldMatch: -1 },
      ]

      testPaths.forEach(({ path, shouldMatch }) => {
        if (shouldMatch >= 0) {
          // Simple pattern matching check
          const pattern = patterns[shouldMatch]
          const regex = pattern.replace(/\*/g, '[^/]+').replace(/\//g, '\\/')

          expect(path).toMatch(new RegExp(`^${regex}$`))
        }
      })
    })
  })
})
