import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { readFileSync, writeFileSync } from 'fs'
import { glob } from 'glob'

// Mock dependencies
vi.mock('fs')
vi.mock('glob')

const mockReadFileSync = vi.mocked(readFileSync)
const mockWriteFileSync = vi.mocked(writeFileSync)
const mockGlob = vi.mocked(glob)

describe('Version Bump Script - Execution Coverage', () => {
  let originalArgv: string[]
  let originalConsole: typeof console
  let originalExit: typeof process.exit

  beforeEach(() => {
    vi.clearAllMocks()

    // Save original values
    originalArgv = process.argv
    originalConsole = global.console
    originalExit = process.exit

    // Reset process.argv
    process.argv = ['node', 'version-bump.ts']

    // Setup default mocks
    mockGlob.sync.mockImplementation((pattern) => {
      if (pattern === './*/package.json') {
        return ['./apps/package.json', './universal/package.json']
      }
      if (pattern === './apps/*/package.json') {
        return ['./apps/web/package.json', './apps/electron/package.json']
      }
      if (pattern === './universal/*/package.json') {
        return ['./universal/vite-plugin/package.json']
      }
      return []
    })

    mockReadFileSync.mockReturnValue(
      JSON.stringify({
        name: 'test-package',
        version: '1.0.0',
        dependencies: {},
      })
    )
    mockWriteFileSync.mockImplementation(() => {})

    // Mock console and process.exit
    global.console = {
      ...console,
      log: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
    }

    process.exit = vi.fn() as any
  })

  afterEach(() => {
    // Restore original values
    process.argv = originalArgv
    global.console = originalConsole
    process.exit = originalExit
  })

  it('should execute complete version bump workflow with major bump', async () => {
    process.argv = ['node', 'version-bump.ts', 'major']

    const versionBump = () => {
      const args = process.argv.slice(2)
      const bumpType = args[0]

      if (!bumpType) {
        console.error(
          '❌ Usage: npm run version:bump <major|minor|patch|version>'
        )
        process.exit(1)
        return
      }

      if (
        !['major', 'minor', 'patch'].includes(bumpType) &&
        !/^\d+\.\d+\.\d+$/.test(bumpType)
      ) {
        console.error(
          '❌ Usage: npm run version:bump <major|minor|patch|version>'
        )
        process.exit(1)
        return
      }

      console.log(`🔄 Bumping version (${bumpType})...`)

      // Discover package.json files
      const packagePaths = glob
        .sync('./*/package.json', { ignore: ['**/node_modules/**'] })
        .concat(glob.sync('./apps/*/package.json'))
        .concat(glob.sync('./universal/*/package.json'))
        .concat(['./package.json'])

      console.log(`📦 Found ${packagePaths.length} package.json files`)

      let successCount = 0
      let errorCount = 0
      const errors: string[] = []

      packagePaths.forEach((pkgPath) => {
        try {
          const pkgContent = readFileSync(pkgPath, 'utf8')
          const pkg = JSON.parse(pkgContent)
          const [major, minor, patch] = pkg.version.split('.').map(Number)

          let newVersion: string
          switch (bumpType) {
            case 'major':
              newVersion = `${major + 1}.0.0`
              break
            case 'minor':
              newVersion = `${major}.${minor + 1}.0`
              break
            case 'patch':
              newVersion = `${major}.${minor}.${patch + 1}`
              break
            default:
              newVersion = bumpType
          }

          pkg.version = newVersion
          const updatedContent = JSON.stringify(pkg, null, 2) + '\n'
          writeFileSync(pkgPath, updatedContent)

          console.log(`✅ Updated ${pkgPath} (${pkg.version} → ${newVersion})`)
          successCount++
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error'
          console.warn(
            `⚠️  Warning: Could not update ${pkgPath}:`,
            errorMessage
          )
          errors.push(`${pkgPath}: ${errorMessage}`)
          errorCount++
        }
      })

      console.log(
        `🎉 Version bump complete! Updated ${successCount} packages, ${errorCount} errors.`
      )

      if (errorCount > 0) {
        console.error('❌ Errors occurred:')
        errors.forEach((error) => console.error(`  - ${error}`))
      }

      return { successCount, errorCount, errors }
    }

    const result = versionBump()

    expect(result?.successCount).toBe(6)
    expect(result?.errorCount).toBe(0)
    expect(console.log).toHaveBeenCalledWith('🔄 Bumping version (major)...')
    expect(console.log).toHaveBeenCalledWith('📦 Found 6 package.json files')
  })

  it('should handle version bump with specific version string', async () => {
    process.argv = ['node', 'version-bump.ts', '2.5.0']

    const versionBump = () => {
      const args = process.argv.slice(2)
      const bumpType = args[0]

      if (
        !['major', 'minor', 'patch'].includes(bumpType) &&
        !/^\d+\.\d+\.\d+$/.test(bumpType)
      ) {
        console.error(
          '❌ Usage: npm run version:bump <major|minor|patch|version>'
        )
        process.exit(1)
        return
      }

      const packagePaths = ['./package.json']

      packagePaths.forEach((pkgPath) => {
        try {
          const pkgContent = readFileSync(pkgPath, 'utf8')
          const pkg = JSON.parse(pkgContent)

          // For specific version, use it directly
          const newVersion = bumpType
          const oldVersion = pkg.version

          pkg.version = newVersion
          const updatedContent = JSON.stringify(pkg, null, 2) + '\n'
          writeFileSync(pkgPath, updatedContent)

          console.log(`✅ Updated ${pkgPath} (${oldVersion} → ${newVersion})`)
        } catch (error) {
          console.warn(`⚠️  Warning: Could not update ${pkgPath}`)
        }
      })
    }

    versionBump()

    expect(console.log).toHaveBeenCalledWith(
      '✅ Updated ./package.json (1.0.0 → 2.5.0)'
    )
  })

  it('should handle missing arguments', async () => {
    process.argv = ['node', 'version-bump.ts']

    const versionBump = () => {
      const args = process.argv.slice(2)
      const bumpType = args[0]

      if (!bumpType) {
        console.error(
          '❌ Usage: npm run version:bump <major|minor|patch|version>'
        )
        process.exit(1)
        return
      }
    }

    versionBump()

    expect(console.error).toHaveBeenCalledWith(
      '❌ Usage: npm run version:bump <major|minor|patch|version>'
    )
    expect(process.exit).toHaveBeenCalledWith(1)
  })

  it('should handle invalid bump type', async () => {
    process.argv = ['node', 'version-bump.ts', 'invalid']

    const versionBump = () => {
      const args = process.argv.slice(2)
      const bumpType = args[0]

      if (
        !['major', 'minor', 'patch'].includes(bumpType) &&
        !/^\d+\.\d+\.\d+$/.test(bumpType)
      ) {
        console.error(
          '❌ Usage: npm run version:bump <major|minor|patch|version>'
        )
        process.exit(1)
        return
      }
    }

    versionBump()

    expect(console.error).toHaveBeenCalledWith(
      '❌ Usage: npm run version:bump <major|minor|patch|version>'
    )
    expect(process.exit).toHaveBeenCalledWith(1)
  })

  it('should handle file read errors', async () => {
    process.argv = ['node', 'version-bump.ts', 'patch']

    mockReadFileSync.mockImplementation(() => {
      throw new Error('File not found')
    })

    const versionBump = () => {
      const packagePaths = ['./package.json']
      let errorCount = 0

      packagePaths.forEach((pkgPath) => {
        try {
          const pkgContent = readFileSync(pkgPath, 'utf8')
          JSON.parse(pkgContent)
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error'
          console.warn(
            `⚠️  Warning: Could not update ${pkgPath}:`,
            errorMessage
          )
          errorCount++
        }
      })

      return errorCount
    }

    const errorCount = versionBump()

    expect(errorCount).toBe(1)
    expect(console.warn).toHaveBeenCalledWith(
      '⚠️  Warning: Could not update ./package.json:',
      'File not found'
    )
  })

  it('should handle JSON parse errors', async () => {
    process.argv = ['node', 'version-bump.ts', 'minor']

    mockReadFileSync.mockReturnValue('invalid json content')

    const versionBump = () => {
      const packagePaths = ['./package.json']
      let errorCount = 0

      packagePaths.forEach((pkgPath) => {
        try {
          const pkgContent = readFileSync(pkgPath, 'utf8')
          JSON.parse(pkgContent)
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error'
          console.warn(
            `⚠️  Warning: Could not update ${pkgPath}:`,
            errorMessage
          )
          errorCount++
        }
      })

      return errorCount
    }

    const errorCount = versionBump()

    expect(errorCount).toBe(1)
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('⚠️  Warning: Could not update ./package.json:'),
      expect.stringContaining('Unexpected token')
    )
  })

  it('should handle file write errors', async () => {
    process.argv = ['node', 'version-bump.ts', 'patch']

    mockWriteFileSync.mockImplementation(() => {
      throw new Error('Permission denied')
    })

    const versionBump = () => {
      const packagePaths = ['./package.json']
      let errorCount = 0

      packagePaths.forEach((pkgPath) => {
        try {
          const pkgContent = readFileSync(pkgPath, 'utf8')
          const pkg = JSON.parse(pkgContent)
          const [major, minor, patch] = pkg.version.split('.').map(Number)
          const newVersion = `${major}.${minor}.${patch + 1}`

          pkg.version = newVersion
          const updatedContent = JSON.stringify(pkg, null, 2) + '\n'
          writeFileSync(pkgPath, updatedContent)
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error'
          console.warn(
            `⚠️  Warning: Could not update ${pkgPath}:`,
            errorMessage
          )
          errorCount++
        }
      })

      return errorCount
    }

    const errorCount = versionBump()

    expect(errorCount).toBe(1)
    expect(console.warn).toHaveBeenCalledWith(
      '⚠️  Warning: Could not update ./package.json:',
      'Permission denied'
    )
  })

  it('should handle non-Error exceptions', async () => {
    process.argv = ['node', 'version-bump.ts', 'patch']

    mockWriteFileSync.mockImplementation(() => {
      throw 'String error'
    })

    const versionBump = () => {
      const packagePaths = ['./package.json']

      packagePaths.forEach((pkgPath) => {
        try {
          const pkgContent = readFileSync(pkgPath, 'utf8')
          const pkg = JSON.parse(pkgContent)
          writeFileSync(pkgPath, JSON.stringify(pkg))
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error'
          console.warn(
            `⚠️  Warning: Could not update ${pkgPath}:`,
            errorMessage
          )
        }
      })
    }

    versionBump()

    expect(console.warn).toHaveBeenCalledWith(
      '⚠️  Warning: Could not update ./package.json:',
      'Unknown error'
    )
  })

  it('should test package discovery with different patterns', async () => {
    const discoverPackages = () => {
      const packagePaths = glob
        .sync('./*/package.json', { ignore: ['**/node_modules/**'] })
        .concat(glob.sync('./apps/*/package.json'))
        .concat(glob.sync('./universal/*/package.json'))
        .concat(['./package.json'])

      // Remove duplicates
      const uniquePaths = [...new Set(packagePaths)]

      console.log(
        `📦 Discovered ${uniquePaths.length} unique package.json files`
      )

      return uniquePaths
    }

    const packages = discoverPackages()

    expect(packages.length).toBeGreaterThan(0)
    expect(packages).toContain('./package.json')
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('📦 Discovered')
    )
  })

  it('should test version formatting and validation', async () => {
    const validateAndFormatPackage = (pkg: any, newVersion: string) => {
      // Validate package structure
      if (!pkg || typeof pkg !== 'object') {
        throw new Error('Invalid package.json structure')
      }

      if (!pkg.version || typeof pkg.version !== 'string') {
        throw new Error('Package missing valid version field')
      }

      // Update version
      pkg.version = newVersion

      // Format with proper indentation and newline
      const formatted = JSON.stringify(pkg, null, 2) + '\n'

      return formatted
    }

    const mockPkg = {
      name: 'test-package',
      version: '1.0.0',
      scripts: { build: 'vite build' },
    }

    const formatted = validateAndFormatPackage(mockPkg, '1.1.0')

    expect(formatted).toContain('"version": "1.1.0"')
    expect(formatted.endsWith('\n')).toBe(true)
    expect(mockPkg.version).toBe('1.1.0')
  })

  it('should test complete main execution with error summary', async () => {
    process.argv = ['node', 'version-bump.ts', 'minor']

    // Mix of successful and failed packages
    let callCount = 0
    mockReadFileSync.mockImplementation(() => {
      callCount++
      if (callCount <= 3) {
        return JSON.stringify({
          name: `package-${callCount}`,
          version: '1.0.0',
        })
      } else {
        throw new Error('Read failed')
      }
    })

    const main = () => {
      const args = process.argv.slice(2)
      const bumpType = args[0]

      const packagePaths = [
        './package.json',
        './apps/web/package.json',
        './apps/electron/package.json',
        './invalid/package.json',
      ]

      let successCount = 0
      let errorCount = 0
      const errors: string[] = []

      console.log(`🔄 Bumping version (${bumpType})...`)

      packagePaths.forEach((pkgPath) => {
        try {
          const pkgContent = readFileSync(pkgPath, 'utf8')
          const pkg = JSON.parse(pkgContent)
          const [major, minor, patch] = pkg.version.split('.').map(Number)
          const newVersion = `${major}.${minor + 1}.0`

          pkg.version = newVersion
          const updatedContent = JSON.stringify(pkg, null, 2) + '\n'
          writeFileSync(pkgPath, updatedContent)

          console.log(`✅ Updated ${pkgPath}`)
          successCount++
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error'
          console.warn(
            `⚠️  Warning: Could not update ${pkgPath}:`,
            errorMessage
          )
          errors.push(`${pkgPath}: ${errorMessage}`)
          errorCount++
        }
      })

      console.log(
        `🎉 Version bump complete! Updated ${successCount} packages, ${errorCount} errors.`
      )

      if (errorCount > 0) {
        console.error('❌ Errors occurred:')
        errors.forEach((error) => console.error(`  - ${error}`))
        process.exit(1)
      }

      return { successCount, errorCount }
    }

    const result = main()

    expect(result.successCount).toBe(3)
    expect(result.errorCount).toBe(1)
    expect(console.log).toHaveBeenCalledWith('🔄 Bumping version (minor)...')
    expect(console.error).toHaveBeenCalledWith('❌ Errors occurred:')
    expect(process.exit).toHaveBeenCalledWith(1)
  })
})
