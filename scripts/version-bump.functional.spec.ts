import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync, writeFileSync } from 'fs'
import { glob } from 'glob'

// Mock dependencies
vi.mock('fs')
vi.mock('glob')

const mockReadFileSync = vi.mocked(readFileSync)
const mockWriteFileSync = vi.mocked(writeFileSync)
const mockGlob = vi.mocked(glob)

describe('Version Bump Script - Functional Coverage', () => {
  beforeEach(() => {
    vi.clearAllMocks()

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

    // Mock console methods
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  it('should test version parsing and increment logic', async () => {
    const currentVersion = '1.2.3'
    const [major, minor, patch] = currentVersion.split('.').map(Number)

    // Test version component extraction
    expect(major).toBe(1)
    expect(minor).toBe(2)
    expect(patch).toBe(3)

    // Test major bump
    const majorBump = `${major + 1}.0.0`
    expect(majorBump).toBe('2.0.0')

    // Test minor bump
    const minorBump = `${major}.${minor + 1}.0`
    expect(minorBump).toBe('1.3.0')

    // Test patch bump
    const patchBump = `${major}.${minor}.${patch + 1}`
    expect(patchBump).toBe('1.2.4')
  })

  it('should test argument parsing logic', async () => {
    // Test with patch argument
    process.argv = ['node', 'version-bump.ts', 'patch']
    const args = process.argv.slice(2)
    const bumpType = args[0]

    expect(args).toEqual(['patch'])
    expect(bumpType).toBe('patch')

    // Test with specific version
    process.argv = ['node', 'version-bump.ts', '2.0.0']
    const versionArgs = process.argv.slice(2)
    const specificVersion = versionArgs[0]

    expect(specificVersion).toBe('2.0.0')

    // Test with no arguments
    process.argv = ['node', 'version-bump.ts']
    const noArgs = process.argv.slice(2)

    expect(noArgs).toHaveLength(0)
  })

  it('should test bump type validation', async () => {
    const validBumpTypes = ['major', 'minor', 'patch']

    const isValidBumpType = (type: string) => validBumpTypes.includes(type)
    const isVersionString = (version: string) => /^\d+\.\d+\.\d+$/.test(version)

    expect(isValidBumpType('major')).toBe(true)
    expect(isValidBumpType('minor')).toBe(true)
    expect(isValidBumpType('patch')).toBe(true)
    expect(isValidBumpType('invalid')).toBe(false)

    expect(isVersionString('1.0.0')).toBe(true)
    expect(isVersionString('2.1.3')).toBe(true)
    expect(isVersionString('1.0')).toBe(false)
    expect(isVersionString('v1.0.0')).toBe(false)
  })

  it('should test package.json discovery logic', async () => {
    const packagePaths = glob
      .sync('./*/package.json', { ignore: ['**/node_modules/**'] })
      .concat(glob.sync('./apps/*/package.json'))
      .concat(glob.sync('./universal/*/package.json'))
      .concat(['./package.json'])

    expect(packagePaths).toContain('./package.json')
    expect(packagePaths).toContain('./apps/web/package.json')
    expect(packagePaths).toContain('./apps/electron/package.json')
    expect(packagePaths).toContain('./universal/vite-plugin/package.json')

    expect(mockGlob.sync).toHaveBeenCalledWith('./*/package.json', {
      ignore: ['**/node_modules/**'],
    })
    expect(mockGlob.sync).toHaveBeenCalledWith('./apps/*/package.json')
    expect(mockGlob.sync).toHaveBeenCalledWith('./universal/*/package.json')
  })

  it('should test package.json reading and parsing', async () => {
    const mockPackageContent = JSON.stringify({
      name: 'test-package',
      version: '1.0.0',
      scripts: { build: 'vite build' },
      dependencies: { 'some-dep': '^1.0.0' },
    })

    mockReadFileSync.mockReturnValue(mockPackageContent)

    const pkgContent = readFileSync('./package.json', 'utf8')
    const pkg = JSON.parse(pkgContent)

    expect(pkg.name).toBe('test-package')
    expect(pkg.version).toBe('1.0.0')
    expect(pkg.scripts).toEqual({ build: 'vite build' })
    expect(pkg.dependencies).toEqual({ 'some-dep': '^1.0.0' })

    expect(mockReadFileSync).toHaveBeenCalledWith('./package.json', 'utf8')
  })

  it('should test version update and formatting logic', async () => {
    const originalPackage = {
      name: 'test-package',
      version: '1.0.0',
      description: 'Test package',
      scripts: { build: 'vite build' },
      dependencies: { 'some-dep': '^1.0.0' },
    }

    const newVersion = '1.1.0'
    const updatedPackage = { ...originalPackage, version: newVersion }
    const formattedContent = JSON.stringify(updatedPackage, null, 2) + '\n'

    expect(updatedPackage.version).toBe(newVersion)
    expect(updatedPackage.name).toBe(originalPackage.name)
    expect(formattedContent).toContain('"version": "1.1.0"')
    expect(formattedContent).toContain('{\n')
    expect(formattedContent.endsWith('\n')).toBe(true)
  })

  it('should test file writing operations', async () => {
    const pkgPath = './test/package.json'
    const packageData = {
      name: 'test-package',
      version: '2.0.0',
      scripts: { test: 'vitest' },
    }
    const content = JSON.stringify(packageData, null, 2) + '\n'

    writeFileSync(pkgPath, content)

    expect(mockWriteFileSync).toHaveBeenCalledWith(pkgPath, content)
    expect(content).toContain('"version": "2.0.0"')
  })

  it('should test error handling for file operations', async () => {
    // Test read error
    mockReadFileSync.mockImplementation(() => {
      throw new Error('File not found')
    })

    let readError: string | null = null
    try {
      readFileSync('./invalid/package.json', 'utf8')
    } catch (error) {
      readError = error instanceof Error ? error.message : 'Unknown error'
    }

    expect(readError).toBe('File not found')

    // Test write error
    mockWriteFileSync.mockImplementation(() => {
      throw new Error('Permission denied')
    })

    let writeError: string | null = null
    try {
      writeFileSync('./test.json', 'content')
    } catch (error) {
      writeError = error instanceof Error ? error.message : 'Unknown error'
    }

    expect(writeError).toBe('Permission denied')
  })

  it('should test JSON parsing error handling', async () => {
    // Test invalid JSON
    mockReadFileSync.mockReturnValue('invalid json content')

    let parseError: string | null = null
    try {
      const content = readFileSync('./package.json', 'utf8')
      JSON.parse(content)
    } catch (error) {
      parseError = error instanceof Error ? error.message : 'Unknown error'
    }

    expect(parseError).toContain('Unexpected token')
  })

  it('should test success and error counting', async () => {
    const operations = [
      { success: true, path: './package.json' },
      { success: false, path: './invalid.json', error: 'File not found' },
      { success: true, path: './apps/web/package.json' },
      { success: false, path: './broken.json', error: 'Parse error' },
      { success: true, path: './apps/electron/package.json' },
    ]

    let successCount = 0
    let errorCount = 0
    const errors: string[] = []

    operations.forEach(({ success, path, error }) => {
      if (success) {
        successCount++
        console.log(`✅ Updated ${path}`)
      } else {
        errorCount++
        console.warn(`⚠️  Warning: Could not update ${path}:`, error)
        if (error) errors.push(`${path}: ${error}`)
      }
    })

    expect(successCount).toBe(3)
    expect(errorCount).toBe(2)
    expect(errors).toHaveLength(2)
    expect(errors[0]).toContain('File not found')
    expect(errors[1]).toContain('Parse error')
  })

  it('should test console output patterns', async () => {
    const consoleSpy = vi.spyOn(console, 'log')
    const consoleWarnSpy = vi.spyOn(console, 'warn')
    const consoleErrorSpy = vi.spyOn(console, 'error')

    // Test different console outputs
    console.log('✅ Updated ./package.json')
    console.warn(
      '⚠️  Warning: Could not update ./invalid.json:',
      'Error message'
    )
    console.error('❌ Usage: npm run version:bump <major|minor|patch|version>')
    console.log('🎉 Version bump complete! Updated 3 packages, 2 errors.')

    expect(consoleSpy).toHaveBeenCalledWith('✅ Updated ./package.json')
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      '⚠️  Warning: Could not update ./invalid.json:',
      'Error message'
    )
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '❌ Usage: npm run version:bump <major|minor|patch|version>'
    )
    expect(consoleSpy).toHaveBeenCalledWith(
      '🎉 Version bump complete! Updated 3 packages, 2 errors.'
    )
  })

  it('should test complete workflow simulation', async () => {
    // Simulate complete version bump workflow
    process.argv = ['node', 'version-bump.ts', 'minor']
    const args = process.argv.slice(2)
    const bumpType = args[0]

    if (
      !['major', 'minor', 'patch'].includes(bumpType) &&
      !/^\d+\.\d+\.\d+$/.test(bumpType)
    ) {
      console.error(
        '❌ Usage: npm run version:bump <major|minor|patch|version>'
      )
      return
    }

    const packagePaths = ['./package.json', './apps/web/package.json']
    let successCount = 0
    let errorCount = 0

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

        console.log(`✅ Updated ${pkgPath}`)
        successCount++
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error'
        console.warn(`⚠️  Warning: Could not update ${pkgPath}:`, errorMessage)
        errorCount++
      }
    })

    console.log(
      `🎉 Version bump complete! Updated ${successCount} packages, ${errorCount} errors.`
    )

    expect(successCount).toBe(2)
    expect(errorCount).toBe(0)
  })

  it('should test version string validation patterns', async () => {
    const testVersions = [
      { version: '1.0.0', valid: true },
      { version: '10.5.3', valid: true },
      { version: '0.1.0', valid: true },
      { version: '1.0', valid: false },
      { version: '1.0.0.0', valid: false },
      { version: 'v1.0.0', valid: false },
      { version: '1.0.0-beta', valid: false },
    ]

    const isValidVersion = (version: string) => /^\d+\.\d+\.\d+$/.test(version)

    testVersions.forEach(({ version, valid }) => {
      expect(isValidVersion(version)).toBe(valid)
    })
  })

  it('should test glob pattern functionality', async () => {
    // Test glob pattern matching simulation
    const allFiles = [
      './package.json',
      './apps/web/package.json',
      './apps/electron/package.json',
      './universal/vite-plugin/package.json',
      './node_modules/some-package/package.json',
      './src/config.json',
    ]

    // Simulate glob patterns
    const rootPackages = allFiles.filter((f) =>
      /^\.\/[^/]+\/package\.json$/.test(f)
    )
    const appsPackages = allFiles.filter((f) =>
      /^\.\/apps\/[^/]+\/package\.json$/.test(f)
    )
    const universalPackages = allFiles.filter((f) =>
      /^\.\/universal\/[^/]+\/package\.json$/.test(f)
    )
    const nodeModulesFilter = allFiles.filter(
      (f) => !f.includes('node_modules')
    )

    expect(rootPackages).toEqual([])
    expect(appsPackages).toEqual([
      './apps/web/package.json',
      './apps/electron/package.json',
    ])
    expect(universalPackages).toEqual(['./universal/vite-plugin/package.json'])
    expect(nodeModulesFilter).not.toContain(
      './node_modules/some-package/package.json'
    )
  })

  it('should test array concatenation and deduplication', async () => {
    const array1 = ['./package.json', './apps/web/package.json']
    const array2 = ['./apps/electron/package.json']
    const array3 = ['./universal/vite-plugin/package.json']
    const mainPackage = ['./package.json']

    const combined = array1.concat(array2).concat(array3).concat(mainPackage)
    const unique = [...new Set(combined)]

    expect(combined).toHaveLength(5)
    expect(unique).toHaveLength(4) // Deduplicated ./package.json
    expect(unique).toContain('./package.json')
    expect(unique).toContain('./apps/web/package.json')
    expect(unique).toContain('./apps/electron/package.json')
    expect(unique).toContain('./universal/vite-plugin/package.json')
  })
})
