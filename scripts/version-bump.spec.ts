/**
 * @fileoverview Comprehensive tests for version-bump.ts
 *
 * @description
 * Tests for version bump script functionality:
 * - Semantic version parsing and generation
 * - Package.json file updates
 * - Command-line argument processing
 * - Error handling and recovery
 * - Multi-package monorepo support
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 */

import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest'
import { glob } from 'glob'

// Mock modules with hoisted functions
const {
  readFileSync,
  writeFileSync,
  existsSync,
  rmSync,
  mkdirSync,
  readdirSync,
} = vi.hoisted(() => ({
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  existsSync: vi.fn(),
  rmSync: vi.fn(),
  mkdirSync: vi.fn(),
  readdirSync: vi.fn(),
}))

vi.mock('fs', () => ({
  default: {
    readFileSync,
    writeFileSync,
    existsSync,
    rmSync,
    mkdirSync,
    readdirSync,
  },
  readFileSync,
  writeFileSync,
  existsSync,
  rmSync,
  mkdirSync,
  readdirSync,
}))
const { glob: mockGlob, sync: mockGlobSync } = vi.hoisted(() => ({
  glob: vi.fn(),
  sync: vi.fn(),
}))

vi.mock('glob', () => ({
  default: {
    sync: mockGlobSync,
  },
  glob: {
    sync: mockGlobSync,
  },
  sync: mockGlobSync,
}))

// Import functions from version-bump.ts
import {
  parseVersion,
  generateNewVersion,
  updatePackageVersion,
  main,
} from './version-bump'

describe('Version Bump Script', () => {
  let consoleLogSpy: Mock
  let consoleErrorSpy: Mock
  let consoleWarnSpy: Mock
  let processExitSpy: Mock
  let processArgvBackup: string[]

  beforeEach(() => {
    // Mock console methods
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    // Mock process.exit
    processExitSpy = vi
      .spyOn(process, 'exit')
      .mockImplementation((code?: number) => {
        throw new Error(`Process exit with code ${code}`)
      })

    // Backup process.argv
    processArgvBackup = [...process.argv]

    // Default mock implementations
    readFileSync.mockReturnValue(
      JSON.stringify({ name: 'test-package', version: '1.0.0' })
    )
    writeFileSync.mockImplementation(() => {})
    mockGlobSync.mockReturnValue([])
  })

  afterEach(() => {
    process.argv = processArgvBackup
    vi.restoreAllMocks()
  })

  describe('parseVersion Function', () => {
    it('should parse a valid semantic version', () => {
      const result = parseVersion('1.2.3')
      expect(result).toEqual({ major: 1, minor: 2, patch: 3 })
    })

    it('should parse version with large numbers', () => {
      const result = parseVersion('10.20.30')
      expect(result).toEqual({ major: 10, minor: 20, patch: 30 })
    })

    it('should parse version with zeros', () => {
      const result = parseVersion('0.0.0')
      expect(result).toEqual({ major: 0, minor: 0, patch: 0 })
    })

    it('should handle version with leading zeros', () => {
      const result = parseVersion('01.02.03')
      expect(result).toEqual({ major: 1, minor: 2, patch: 3 })
    })
  })

  describe('generateNewVersion Function', () => {
    it('should bump patch version', () => {
      expect(generateNewVersion('1.2.3', 'patch')).toBe('1.2.4')
      expect(generateNewVersion('0.0.0', 'patch')).toBe('0.0.1')
      expect(generateNewVersion('1.0.9', 'patch')).toBe('1.0.10')
    })

    it('should bump minor version and reset patch', () => {
      expect(generateNewVersion('1.2.3', 'minor')).toBe('1.3.0')
      expect(generateNewVersion('0.0.0', 'minor')).toBe('0.1.0')
      expect(generateNewVersion('1.9.5', 'minor')).toBe('1.10.0')
    })

    it('should bump major version and reset minor and patch', () => {
      expect(generateNewVersion('1.2.3', 'major')).toBe('2.0.0')
      expect(generateNewVersion('0.0.0', 'major')).toBe('1.0.0')
      expect(generateNewVersion('9.5.3', 'major')).toBe('10.0.0')
    })

    it('should throw error for invalid bump type', () => {
      expect(() => generateNewVersion('1.2.3', 'invalid' as any)).toThrow(
        'Invalid bump type: invalid'
      )
    })
  })

  describe('updatePackageVersion Function', () => {
    it('should update package.json with new version', () => {
      const mockPackage = {
        name: 'test-package',
        version: '1.0.0',
        scripts: {},
      }
      readFileSync.mockReturnValue(JSON.stringify(mockPackage))

      const result = updatePackageVersion('package.json', '1.0.1')

      expect(result).toBe(true)
      expect(readFileSync).toHaveBeenCalledWith('package.json', 'utf8')
      expect(writeFileSync).toHaveBeenCalledWith(
        'package.json',
        JSON.stringify({ ...mockPackage, version: '1.0.1' }, null, 2) + '\n'
      )
      expect(consoleLogSpy).toHaveBeenCalledWith('✅ Updated package.json')
    })

    it('should handle file read errors', () => {
      readFileSync.mockImplementation(() => {
        throw new Error('File not found')
      })

      const result = updatePackageVersion('package.json', '1.0.1')

      expect(result).toBe(false)
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '⚠️  Warning: Could not update package.json:',
        'File not found'
      )
    })

    it('should handle invalid JSON', () => {
      readFileSync.mockReturnValue('invalid json')

      const result = updatePackageVersion('package.json', '1.0.1')

      expect(result).toBe(false)
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('⚠️  Warning: Could not update package.json:'),
        expect.any(String)
      )
    })

    it('should handle write errors', () => {
      writeFileSync.mockImplementation(() => {
        throw new Error('Permission denied')
      })

      const result = updatePackageVersion('package.json', '1.0.1')

      expect(result).toBe(false)
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '⚠️  Warning: Could not update package.json:',
        'Permission denied'
      )
    })

    it('should preserve JSON formatting', () => {
      const mockPackage = {
        name: 'test-package',
        version: '1.0.0',
        scripts: {
          test: 'vitest',
          build: 'tsc',
        },
        dependencies: {
          vue: '^3.0.0',
        },
      }
      readFileSync.mockReturnValue(JSON.stringify(mockPackage))

      updatePackageVersion('package.json', '2.0.0')

      const expectedOutput =
        JSON.stringify({ ...mockPackage, version: '2.0.0' }, null, 2) + '\n'
      expect(writeFileSync).toHaveBeenCalledWith('package.json', expectedOutput)
    })

    it('should handle non-Error exceptions', () => {
      readFileSync.mockImplementation(() => {
        throw 'String error'
      })

      const result = updatePackageVersion('package.json', '1.0.1')

      expect(result).toBe(false)
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '⚠️  Warning: Could not update package.json:',
        'Unknown error'
      )
    })
  })

  describe('main Function', () => {
    it('should show usage when no arguments provided', () => {
      process.argv = ['node', 'version-bump.ts']

      expect(() => main()).toThrow('Process exit with code 1')

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '❌ Usage: npm run version:bump <major|minor|patch|version>'
      )
      expect(consoleErrorSpy).toHaveBeenCalledWith('\nExamples:')
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '  npm run version:bump patch    # 0.3.0 -> 0.3.1'
      )
    })

    it('should bump patch version across all packages', () => {
      process.argv = ['node', 'version-bump.ts', 'patch']

      const mockGlobResult = [
        './apps/web/package.json',
        './apps/electron/package.json',
      ]
      mockGlobSync.mockImplementation((pattern) => {
        if (pattern === './*/package.json') return []
        if (pattern === './apps/*/package.json') return mockGlobResult
        if (pattern === './universal/*/package.json') return []
        return []
      })

      main()

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '🚀 Bumping version from 1.0.0 to 1.0.1'
      )
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '📦 Found 3 package.json files to update'
      )
      expect(writeFileSync).toHaveBeenCalledTimes(3) // root + 2 apps
    })

    it('should bump minor version', () => {
      process.argv = ['node', 'version-bump.ts', 'minor']

      mockGlobSync.mockReturnValue([])

      main()

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '🚀 Bumping version from 1.0.0 to 1.1.0'
      )
    })

    it('should bump major version', () => {
      process.argv = ['node', 'version-bump.ts', 'major']

      mockGlobSync.mockReturnValue([])

      main()

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '🚀 Bumping version from 1.0.0 to 2.0.0'
      )
    })

    it('should set specific version', () => {
      process.argv = ['node', 'version-bump.ts', '3.0.0']

      mockGlobSync.mockReturnValue([])

      main()

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '🚀 Bumping version from 1.0.0 to 3.0.0'
      )
    })

    it('should handle mixed success and failure', () => {
      process.argv = ['node', 'version-bump.ts', 'patch']

      mockGlobSync.mockImplementation((pattern) => {
        if (pattern === './apps/*/package.json') {
          return ['./apps/web/package.json', './apps/electron/package.json']
        }
        return []
      })

      // Make one update fail
      let callCount = 0
      writeFileSync.mockImplementation(() => {
        callCount++
        if (callCount === 2) {
          throw new Error('Permission denied')
        }
      })

      main()

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '📊 Successfully updated: 2/3 packages'
      )
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '⚠️  Errors: 1 packages failed to update'
      )
    })

    it('should display next steps after successful bump', () => {
      process.argv = ['node', 'version-bump.ts', 'patch']

      mockGlobSync.mockReturnValue([])

      main()

      expect(consoleLogSpy).toHaveBeenCalledWith('\n📋 Next steps:')
      expect(consoleLogSpy).toHaveBeenCalledWith('1. 📝 Update CHANGELOG.md')
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '2. 💾 Commit changes: git add . && git commit -m "bump: version 1.0.1"'
      )
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '3. 🏷️  Create tag: git tag v1.0.1'
      )
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '4. 🚀 Push: git push && git push --tags'
      )
    })

    it('should find all package.json files in monorepo', () => {
      process.argv = ['node', 'version-bump.ts', 'patch']

      mockGlobSync.mockImplementation((pattern) => {
        if (pattern === './*/package.json') {
          return ['./scripts/package.json']
        }
        if (pattern === './apps/*/package.json') {
          return ['./apps/web/package.json', './apps/electron/package.json']
        }
        if (pattern === './universal/*/package.json') {
          return ['./universal/vite-plugin/package.json']
        }
        return []
      })

      main()

      // Should find 5 files total (4 from glob + 1 root)
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '📦 Found 5 package.json files to update'
      )
      expect(writeFileSync).toHaveBeenCalledTimes(5)
    })

    it('should handle empty glob results', () => {
      process.argv = ['node', 'version-bump.ts', 'patch']

      mockGlobSync.mockReturnValue([])

      main()

      // Should still update root package.json
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '📦 Found 1 package.json files to update'
      )
      expect(writeFileSync).toHaveBeenCalledTimes(1)
    })

    it('should read current version from root package.json', () => {
      process.argv = ['node', 'version-bump.ts', 'patch']

      const mockRootPackage = {
        name: '@hatcherdx/dx-engine',
        version: '2.5.3',
      }
      readFileSync.mockImplementation((path) => {
        if (path === './package.json') {
          return JSON.stringify(mockRootPackage)
        }
        return JSON.stringify({ name: 'sub-package', version: '1.0.0' })
      })
      mockGlobSync.mockReturnValue([])

      main()

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '🚀 Bumping version from 2.5.3 to 2.5.4'
      )
    })

    it('should complete successfully with all packages updated', () => {
      process.argv = ['node', 'version-bump.ts', 'minor']

      mockGlobSync.mockReturnValue([])

      main()

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '✅ Version bump complete! New version: 1.1.0'
      )
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '📊 Successfully updated: 1/1 packages'
      )
    })
  })

  describe('Process Error Handlers', () => {
    it('should handle uncaught exceptions', () => {
      const listeners = process.listeners('uncaughtException')
      const handler = listeners[listeners.length - 1] as any

      expect(() => handler(new Error('Test error'))).toThrow(
        'Process exit with code 1'
      )

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '💥 Uncaught exception:',
        'Test error'
      )
    })

    it('should handle unhandled rejections', () => {
      const listeners = process.listeners('unhandledRejection')
      const handler = listeners[listeners.length - 1] as any

      expect(() => handler('Test rejection')).toThrow(
        'Process exit with code 1'
      )

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '💥 Unhandled rejection:',
        'Test rejection'
      )
    })
  })

  describe('Edge Cases', () => {
    it('should handle version with pre-release tags as custom version', () => {
      process.argv = ['node', 'version-bump.ts', '1.0.0-beta.1']

      mockGlobSync.mockReturnValue([])

      main()

      // Should treat it as a specific version
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '🚀 Bumping version from 1.0.0 to 1.0.0-beta.1'
      )
    })

    it('should handle very large version numbers', () => {
      const mockPackage = {
        name: 'test',
        version: '999.999.999',
      }
      readFileSync.mockReturnValue(JSON.stringify(mockPackage))

      process.argv = ['node', 'version-bump.ts', 'patch']
      mockGlobSync.mockReturnValue([])

      main()

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '🚀 Bumping version from 999.999.999 to 999.999.1000'
      )
    })

    it('should handle missing version in root package.json', () => {
      const mockPackage = {
        name: 'test',
        // version missing
      }
      readFileSync.mockReturnValue(JSON.stringify(mockPackage))

      process.argv = ['node', 'version-bump.ts', 'patch']

      // This will fail when trying to parse undefined version
      expect(() => main()).toThrow()
    })
  })
})
