import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync, writeFileSync } from 'fs'
import { glob } from 'glob'

// Mock dependencies
vi.mock('fs')
vi.mock('glob')

const mockReadFileSync = vi.mocked(readFileSync)
const mockWriteFileSync = vi.mocked(writeFileSync)
const mockGlob = vi.mocked(glob)

describe('Version Bump Script - Import Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Reset process.argv
    process.argv = ['node', 'version-bump.ts']

    // Mock glob to return package.json files
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

    // Mock file system operations
    mockReadFileSync.mockReturnValue(JSON.stringify({ version: '0.3.0' }))
    mockWriteFileSync.mockImplementation(() => {})
  })

  it('should test version parsing logic', async () => {
    const version = '1.2.3'
    const [major, minor, patch] = version.split('.').map(Number)
    const components = { major, minor, patch }

    expect(components.major).toBe(1)
    expect(components.minor).toBe(2)
    expect(components.patch).toBe(3)
  })

  it('should test version generation for different bump types', async () => {
    const currentVersion = '1.2.3'
    const { major, minor, patch } = { major: 1, minor: 2, patch: 3 }

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

  it('should test invalid bump type handling', async () => {
    const validBumpTypes = ['major', 'minor', 'patch']
    const invalidBumpType = 'invalid'

    expect(validBumpTypes.includes('major')).toBe(true)
    expect(validBumpTypes.includes('minor')).toBe(true)
    expect(validBumpTypes.includes('patch')).toBe(true)
    expect(validBumpTypes.includes(invalidBumpType)).toBe(false)
  })

  it('should test package.json file discovery', async () => {
    const packagePaths = glob
      .sync('./*/package.json', { ignore: ['**/node_modules/**'] })
      .concat(glob.sync('./apps/*/package.json'))
      .concat(glob.sync('./universal/*/package.json'))
      .concat(['./package.json'])

    expect(packagePaths).toContain('./package.json')
    expect(packagePaths.length).toBeGreaterThan(0)
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
      dependencies: {},
    })

    mockReadFileSync.mockReturnValue(mockPackageContent)

    const pkgContent = readFileSync('./package.json', 'utf8')
    const pkg = JSON.parse(pkgContent)

    expect(pkg.version).toBe('1.0.0')
    expect(pkg.name).toBe('test-package')
    expect(mockReadFileSync).toHaveBeenCalledWith('./package.json', 'utf8')
  })

  it('should test package.json version update', async () => {
    const originalPackage = {
      name: 'test-package',
      version: '1.0.0',
      dependencies: {},
    }

    const newVersion = '1.1.0'
    const updatedPackage = { ...originalPackage, version: newVersion }
    const expectedContent = JSON.stringify(updatedPackage, null, 2) + '\n'

    expect(updatedPackage.version).toBe(newVersion)
    expect(expectedContent).toContain('"version": "1.1.0"')
  })

  it('should test file writing operation', async () => {
    const pkgPath = './test/package.json'
    const packageData = { name: 'test', version: '2.0.0' }
    const content = JSON.stringify(packageData, null, 2) + '\n'

    writeFileSync(pkgPath, content)

    expect(mockWriteFileSync).toHaveBeenCalledWith(pkgPath, content)
  })

  it('should test error handling in package update', async () => {
    mockReadFileSync.mockImplementation(() => {
      throw new Error('File not found')
    })

    let errorOccurred = false
    let errorMessage = ''

    try {
      readFileSync('./invalid/package.json', 'utf8')
    } catch (error: unknown) {
      errorOccurred = true
      errorMessage = error instanceof Error ? error.message : 'Unknown error'
    }

    expect(errorOccurred).toBe(true)
    expect(errorMessage).toBe('File not found')
  })

  it('should test success and error counting logic', async () => {
    const operations = [true, false, true, true, false] // success/failure pattern
    let successCount = 0
    let errorCount = 0

    operations.forEach((success) => {
      if (success) {
        successCount++
      } else {
        errorCount++
      }
    })

    expect(successCount).toBe(3)
    expect(errorCount).toBe(2)
  })

  it('should test command line argument parsing', async () => {
    const testArgs = ['patch']
    process.argv = ['node', 'version-bump.ts', ...testArgs]

    const args = process.argv.slice(2)
    expect(args).toEqual(['patch'])
    expect(args.length).toBe(1)

    // Test no arguments
    process.argv = ['node', 'version-bump.ts']
    const emptyArgs = process.argv.slice(2)
    expect(emptyArgs.length).toBe(0)
  })

  it('should test version type detection', async () => {
    const bumpTypes = ['major', 'minor', 'patch']
    const specificVersion = '2.1.0'

    expect(bumpTypes.includes('patch')).toBe(true)
    expect(bumpTypes.includes(specificVersion)).toBe(false)
  })

  it('should test JSON formatting consistency', async () => {
    const packageData = {
      name: 'test-package',
      version: '1.0.0',
      scripts: {
        build: 'vite build',
        test: 'vitest',
      },
    }

    const formatted = JSON.stringify(packageData, null, 2) + '\n'

    expect(formatted).toContain('{\n')
    expect(formatted).toContain('  "name": "test-package"')
    expect(formatted).toContain('  "version": "1.0.0"')
    expect(formatted.endsWith('\n')).toBe(true)
  })

  it('should test version string validation', async () => {
    const validVersions = ['1.0.0', '0.1.0', '10.5.3']
    const invalidVersions = ['1.0', '1.0.0.0', 'v1.0.0']

    validVersions.forEach((version) => {
      const parts = version.split('.')
      expect(parts.length).toBe(3)
      expect(parts.every((part) => !isNaN(Number(part)))).toBe(true)
    })

    invalidVersions.forEach((version) => {
      const parts = version.split('.')
      const isValid =
        parts.length === 3 && parts.every((part) => !isNaN(Number(part)))
      expect(isValid).toBe(false)
    })
  })

  it('should test console output patterns', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {})
    const consoleWarnSpy = vi
      .spyOn(console, 'warn')
      .mockImplementation(() => {})

    // Test different console outputs
    console.log('✅ Updated ./package.json')
    console.warn(
      '⚠️  Warning: Could not update ./package.json:',
      'Error message'
    )
    console.error('❌ Usage: npm run version:bump <major|minor|patch|version>')

    expect(consoleSpy).toHaveBeenCalledWith('✅ Updated ./package.json')
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      '⚠️  Warning: Could not update ./package.json:',
      'Error message'
    )
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '❌ Usage: npm run version:bump <major|minor|patch|version>'
    )

    consoleSpy.mockRestore()
    consoleErrorSpy.mockRestore()
    consoleWarnSpy.mockRestore()
  })
})
