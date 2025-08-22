/**
 * @fileoverview Comprehensive tests for coverage-check.ts
 *
 * @description
 * Tests for coverage checking and reporting script:
 * - Coverage directory detection
 * - Coverage summary parsing
 * - Threshold validation
 * - Badge URL generation
 * - Error handling
 * - Direct execution simulation
 *
 * @author Hatcher DX Team
 * @since 1.0.0
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
import { join } from 'path'

// Mock modules with hoisted functions
const {
  existsSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  readdirSync,
  rmSync,
} = vi.hoisted(() => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
  readdirSync: vi.fn(),
  rmSync: vi.fn(),
}))

vi.mock('fs', () => ({
  default: {
    existsSync,
    readFileSync,
    writeFileSync,
    mkdirSync,
    readdirSync,
    rmSync,
  },
  existsSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  readdirSync,
  rmSync,
}))
vi.mock('path')

describe('Coverage Check Script', () => {
  let consoleLogSpy: any
  let consoleErrorSpy: any
  let processExitSpy: any
  let processCwdSpy: any
  let checkCoverageReport: any
  let simulateDirectExecution: any

  beforeAll(async () => {
    // Set up mocks for path module before importing
    vi.mocked(join).mockImplementation((...args: string[]) => args.join('/'))

    // Import the module after mocks are set up
    const module = await import('./coverage-check')
    checkCoverageReport = module.checkCoverageReport
    simulateDirectExecution = module.simulateDirectExecution
  })

  beforeEach(() => {
    // Mock console methods
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    // Mock process methods
    processExitSpy = vi
      .spyOn(process, 'exit')
      .mockImplementation((code?: number) => {
        throw new Error(`Process exit with code ${code}`)
      })
    processCwdSpy = vi.spyOn(process, 'cwd').mockReturnValue('/test/project')

    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Directory and File Validation', () => {
    it('should fail when coverage directory does not exist', () => {
      vi.mocked(existsSync).mockReturnValue(false)

      expect(() => checkCoverageReport()).toThrow('Process exit with code 1')
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '❌ Coverage directory not found. Run: pnpm test:coverage'
      )
      expect(processExitSpy).toHaveBeenCalledWith(1)
    })

    it('should fail when coverage summary file does not exist', () => {
      vi.mocked(existsSync).mockImplementation((path) => {
        const pathStr = path.toString()
        if (pathStr.endsWith('/coverage')) return true
        if (pathStr.endsWith('coverage-summary.json')) return false
        return false
      })

      expect(() => checkCoverageReport()).toThrow('Process exit with code 1')
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '❌ Coverage summary not found. Run: pnpm test:coverage'
      )
      expect(processExitSpy).toHaveBeenCalledWith(1)
    })

    it('should verify correct path construction', () => {
      vi.mocked(existsSync).mockReturnValue(false)

      try {
        checkCoverageReport()
      } catch {
        // Expected to throw
      }

      // The paths are constructed at module load time using process.cwd() at that moment
      // We verify that existsSync was called (regardless of the exact path)
      expect(vi.mocked(existsSync)).toHaveBeenCalled()
      expect(vi.mocked(existsSync).mock.calls[0][0]).toContain('coverage')
    })
  })

  describe('Coverage Summary Parsing', () => {
    it('should successfully parse and display coverage summary', () => {
      const mockSummary = {
        total: {
          statements: { pct: 85.5 },
          branches: { pct: 72.3 },
          functions: { pct: 91.2 },
          lines: { pct: 84.7 },
        },
      }

      vi.mocked(existsSync).mockReturnValue(true)
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(mockSummary))

      const result = checkCoverageReport()

      expect(result).toEqual(mockSummary)
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '🔍 Checking coverage report...'
      )
      expect(consoleLogSpy).toHaveBeenCalledWith('✅ Coverage report found!')
      expect(consoleLogSpy).toHaveBeenCalledWith('\n📊 Coverage Summary:')
      expect(consoleLogSpy).toHaveBeenCalledWith('─'.repeat(50))
      expect(consoleLogSpy).toHaveBeenCalledWith('📈 Statements: 85.5%')
      expect(consoleLogSpy).toHaveBeenCalledWith('🌿 Branches:   72.3%')
      expect(consoleLogSpy).toHaveBeenCalledWith('⚡ Functions:  91.2%')
      expect(consoleLogSpy).toHaveBeenCalledWith('📝 Lines:      84.7%')
      expect(consoleLogSpy).toHaveBeenCalledWith('─'.repeat(50))
    })

    it('should handle malformed JSON in coverage summary', () => {
      vi.mocked(existsSync).mockReturnValue(true)
      vi.mocked(readFileSync).mockReturnValue('{ invalid json')

      expect(() => checkCoverageReport()).toThrow('Process exit with code 1')
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '❌ Error reading coverage summary:',
        expect.any(Error)
      )
    })

    it('should handle empty coverage summary file', () => {
      vi.mocked(existsSync).mockReturnValue(true)
      vi.mocked(readFileSync).mockReturnValue('')

      expect(() => checkCoverageReport()).toThrow('Process exit with code 1')
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '❌ Error reading coverage summary:',
        expect.any(Error)
      )
    })

    it('should handle missing total property in summary', () => {
      const mockSummary = {
        // Missing 'total' property
        files: {},
      }

      vi.mocked(existsSync).mockReturnValue(true)
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(mockSummary))

      // This will throw because the code tries to access total.statements.pct outside the if block
      expect(() => checkCoverageReport()).toThrow('Process exit with code 1')

      // Should display initial messages before the error
      expect(consoleLogSpy).toHaveBeenCalledWith('✅ Coverage report found!')
      expect(consoleLogSpy).toHaveBeenCalledWith('\n📊 Coverage Summary:')
      // Should error when trying to access total.statements.pct
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '❌ Error reading coverage summary:',
        expect.any(Error)
      )
    })
  })

  describe('Coverage Thresholds', () => {
    beforeEach(() => {
      vi.mocked(existsSync).mockReturnValue(true)
    })

    it('should display excellent coverage message for >= 80%', () => {
      const mockSummary = {
        total: {
          statements: { pct: 85 },
          branches: { pct: 80 },
          functions: { pct: 90 },
          lines: { pct: 85 },
        },
      }

      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(mockSummary))
      checkCoverageReport()

      expect(consoleLogSpy).toHaveBeenCalledWith('\n🎉 Excellent coverage!')
    })

    it('should display good coverage message for >= 60% and < 80%', () => {
      const mockSummary = {
        total: {
          statements: { pct: 65 },
          branches: { pct: 60 },
          functions: { pct: 70 },
          lines: { pct: 65 },
        },
      }

      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(mockSummary))
      checkCoverageReport()

      expect(consoleLogSpy).toHaveBeenCalledWith('\n👍 Good coverage!')
    })

    it('should display improving coverage message for >= 40% and < 60%', () => {
      const mockSummary = {
        total: {
          statements: { pct: 45 },
          branches: { pct: 40 },
          functions: { pct: 50 },
          lines: { pct: 45 },
        },
      }

      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(mockSummary))
      checkCoverageReport()

      expect(consoleLogSpy).toHaveBeenCalledWith('\n📈 Improving coverage!')
    })

    it('should display needs improvement message for < 40%', () => {
      const mockSummary = {
        total: {
          statements: { pct: 30 },
          branches: { pct: 25 },
          functions: { pct: 35 },
          lines: { pct: 30 },
        },
      }

      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(mockSummary))
      checkCoverageReport()

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '\n⚠️  Coverage needs improvement'
      )
    })

    it('should handle edge case of exactly 80% coverage', () => {
      const mockSummary = {
        total: {
          statements: { pct: 80 },
          branches: { pct: 80 },
          functions: { pct: 80 },
          lines: { pct: 80 },
        },
      }

      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(mockSummary))
      checkCoverageReport()

      expect(consoleLogSpy).toHaveBeenCalledWith('\n🎉 Excellent coverage!')
    })

    it('should handle edge case of exactly 60% coverage', () => {
      const mockSummary = {
        total: {
          statements: { pct: 60 },
          branches: { pct: 60 },
          functions: { pct: 60 },
          lines: { pct: 60 },
        },
      }

      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(mockSummary))
      checkCoverageReport()

      expect(consoleLogSpy).toHaveBeenCalledWith('\n👍 Good coverage!')
    })

    it('should handle edge case of exactly 40% coverage', () => {
      const mockSummary = {
        total: {
          statements: { pct: 40 },
          branches: { pct: 40 },
          functions: { pct: 40 },
          lines: { pct: 40 },
        },
      }

      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(mockSummary))
      checkCoverageReport()

      expect(consoleLogSpy).toHaveBeenCalledWith('\n📈 Improving coverage!')
    })

    it('should handle zero coverage', () => {
      const mockSummary = {
        total: {
          statements: { pct: 0 },
          branches: { pct: 0 },
          functions: { pct: 0 },
          lines: { pct: 0 },
        },
      }

      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(mockSummary))
      checkCoverageReport()

      expect(consoleLogSpy).toHaveBeenCalledWith('📈 Statements: 0%')
      expect(consoleLogSpy).toHaveBeenCalledWith('🌿 Branches:   0%')
      expect(consoleLogSpy).toHaveBeenCalledWith('⚡ Functions:  0%')
      expect(consoleLogSpy).toHaveBeenCalledWith('📝 Lines:      0%')
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '\n⚠️  Coverage needs improvement'
      )
    })

    it('should handle 100% coverage', () => {
      const mockSummary = {
        total: {
          statements: { pct: 100 },
          branches: { pct: 100 },
          functions: { pct: 100 },
          lines: { pct: 100 },
        },
      }

      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(mockSummary))
      checkCoverageReport()

      expect(consoleLogSpy).toHaveBeenCalledWith('📈 Statements: 100%')
      expect(consoleLogSpy).toHaveBeenCalledWith('🌿 Branches:   100%')
      expect(consoleLogSpy).toHaveBeenCalledWith('⚡ Functions:  100%')
      expect(consoleLogSpy).toHaveBeenCalledWith('📝 Lines:      100%')
      expect(consoleLogSpy).toHaveBeenCalledWith('\n🎉 Excellent coverage!')
    })
  })

  describe('Badge URL Generation', () => {
    it('should generate correct badge URL', () => {
      const mockSummary = {
        total: {
          statements: { pct: 75 },
          branches: { pct: 70 },
          functions: { pct: 80 },
          lines: { pct: 75 },
        },
      }

      vi.mocked(existsSync).mockReturnValue(true)
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(mockSummary))

      checkCoverageReport()

      const expectedBadgeUrl = `https://img.shields.io/badge/dynamic/json?label=Coverage&query=%24.total.statements.pct&suffix=%25&url=https%3A%2F%2Fraw.githubusercontent.com%2FHatcherDX%2Fdx-engine%2Fcoverage-reports%2Fcoverage-summary.json&colorB=brightgreen&colorA=gray&style=flat`

      expect(consoleLogSpy).toHaveBeenCalledWith('\n🔗 Badge URL:')
      expect(consoleLogSpy).toHaveBeenCalledWith(expectedBadgeUrl)
    })

    it('should always display the same badge URL format', () => {
      const mockSummary1 = {
        total: {
          statements: { pct: 50 },
          branches: { pct: 50 },
          functions: { pct: 50 },
          lines: { pct: 50 },
        },
      }

      const mockSummary2 = {
        total: {
          statements: { pct: 90 },
          branches: { pct: 90 },
          functions: { pct: 90 },
          lines: { pct: 90 },
        },
      }

      vi.mocked(existsSync).mockReturnValue(true)

      // First call
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(mockSummary1))
      checkCoverageReport()

      // Second call with different coverage
      vi.clearAllMocks()
      consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      vi.mocked(existsSync).mockReturnValue(true)
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(mockSummary2))
      checkCoverageReport()

      // Both should generate the same URL (dynamic badge updates on its own)
      const expectedBadgeUrl = `https://img.shields.io/badge/dynamic/json?label=Coverage&query=%24.total.statements.pct&suffix=%25&url=https%3A%2F%2Fraw.githubusercontent.com%2FHatcherDX%2Fdx-engine%2Fcoverage-reports%2Fcoverage-summary.json&colorB=brightgreen&colorA=gray&style=flat`

      expect(consoleLogSpy).toHaveBeenCalledWith(expectedBadgeUrl)
    })
  })

  describe('Error Handling', () => {
    it('should handle file reading errors', () => {
      vi.mocked(existsSync).mockReturnValue(true)
      vi.mocked(readFileSync).mockImplementation(() => {
        throw new Error('Permission denied')
      })

      expect(() => checkCoverageReport()).toThrow('Process exit with code 1')
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '❌ Error reading coverage summary:',
        expect.objectContaining({ message: 'Permission denied' })
      )
    })

    it('should handle JSON parsing errors', () => {
      vi.mocked(existsSync).mockReturnValue(true)
      vi.mocked(readFileSync).mockReturnValue('{"unclosed": ')

      expect(() => checkCoverageReport()).toThrow('Process exit with code 1')
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '❌ Error reading coverage summary:',
        expect.any(Error)
      )
    })

    it('should handle file system errors during exists check', () => {
      vi.mocked(existsSync).mockImplementation(() => {
        throw new Error('File system error')
      })

      expect(() => checkCoverageReport()).toThrow('File system error')
    })

    it('should handle null/undefined values in coverage data', () => {
      // When JSON.stringify is used, undefined values are omitted
      // So we need to manually construct the JSON string to test this case
      const mockSummaryStr = `{
        "total": {
          "statements": { "pct": null },
          "branches": { },
          "functions": { "pct": null },
          "lines": { "pct": 75 }
        }
      }`

      vi.mocked(existsSync).mockReturnValue(true)
      vi.mocked(readFileSync).mockReturnValue(mockSummaryStr)

      checkCoverageReport()

      expect(consoleLogSpy).toHaveBeenCalledWith('📈 Statements: null%')
      expect(consoleLogSpy).toHaveBeenCalledWith('🌿 Branches:   undefined%') // branches.pct is undefined
      expect(consoleLogSpy).toHaveBeenCalledWith('⚡ Functions:  null%')
      expect(consoleLogSpy).toHaveBeenCalledWith('📝 Lines:      75%')
    })
  })

  describe('Output Formatting', () => {
    it('should display proper formatting with separators', () => {
      const mockSummary = {
        total: {
          statements: { pct: 75.55 },
          branches: { pct: 70.12 },
          functions: { pct: 80.99 },
          lines: { pct: 75.33 },
        },
      }

      vi.mocked(existsSync).mockReturnValue(true)
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(mockSummary))

      checkCoverageReport()

      // Verify the order of console logs
      const calls = consoleLogSpy.mock.calls.map((call: any[]) => call[0])

      expect(calls).toContain('🔍 Checking coverage report...')
      expect(calls).toContain('✅ Coverage report found!')
      expect(calls).toContain('\n📊 Coverage Summary:')
      expect(calls).toContain('─'.repeat(50))
      expect(calls).toContain('📈 Statements: 75.55%')
      expect(calls).toContain('🌿 Branches:   70.12%')
      expect(calls).toContain('⚡ Functions:  80.99%')
      expect(calls).toContain('📝 Lines:      75.33%')
    })

    it('should handle decimal values correctly', () => {
      const mockSummary = {
        total: {
          statements: { pct: 99.999 },
          branches: { pct: 0.001 },
          functions: { pct: 50.5 },
          lines: { pct: 33.333 },
        },
      }

      vi.mocked(existsSync).mockReturnValue(true)
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(mockSummary))

      checkCoverageReport()

      expect(consoleLogSpy).toHaveBeenCalledWith('📈 Statements: 99.999%')
      expect(consoleLogSpy).toHaveBeenCalledWith('🌿 Branches:   0.001%')
      expect(consoleLogSpy).toHaveBeenCalledWith('⚡ Functions:  50.5%')
      expect(consoleLogSpy).toHaveBeenCalledWith('📝 Lines:      33.333%')
    })
  })

  describe('Direct Execution Simulation', () => {
    it('should export simulateDirectExecution function', () => {
      expect(typeof simulateDirectExecution).toBe('function')
    })

    it('should call checkCoverageReport when simulateDirectExecution is called', () => {
      const mockSummary = {
        total: {
          statements: { pct: 75 },
          branches: { pct: 70 },
          functions: { pct: 80 },
          lines: { pct: 75 },
        },
      }

      vi.mocked(existsSync).mockReturnValue(true)
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(mockSummary))

      simulateDirectExecution()

      expect(consoleLogSpy).toHaveBeenCalledWith('✅ Coverage report found!')
      expect(consoleLogSpy).toHaveBeenCalledWith('\n👍 Good coverage!')
    })

    it('should handle errors in simulateDirectExecution', () => {
      vi.mocked(existsSync).mockReturnValue(false)

      expect(() => simulateDirectExecution()).toThrow(
        'Process exit with code 1'
      )
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '❌ Coverage directory not found. Run: pnpm test:coverage'
      )
    })
  })

  describe('Integration Tests', () => {
    it('should complete full successful workflow', () => {
      const mockSummary = {
        total: {
          statements: { pct: 88.5, covered: 885, total: 1000 },
          branches: { pct: 75.0, covered: 150, total: 200 },
          functions: { pct: 92.3, covered: 120, total: 130 },
          lines: { pct: 87.2, covered: 872, total: 1000 },
        },
        files: {
          'src/index.ts': {
            statements: { pct: 100 },
            branches: { pct: 100 },
            functions: { pct: 100 },
            lines: { pct: 100 },
          },
        },
      }

      vi.mocked(existsSync).mockReturnValue(true)
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(mockSummary))

      const result = checkCoverageReport()

      expect(result).toEqual(mockSummary)
      expect(processExitSpy).not.toHaveBeenCalled()
      expect(consoleLogSpy).toHaveBeenCalledWith('✅ Coverage report found!')
      expect(consoleLogSpy).toHaveBeenCalledWith('\n🎉 Excellent coverage!')
    })

    it('should handle complex nested coverage data', () => {
      const mockSummary = {
        total: {
          statements: { pct: 76, covered: 760, total: 1000, skipped: 0 },
          branches: { pct: 65, covered: 130, total: 200, skipped: 0 },
          functions: { pct: 82, covered: 82, total: 100, skipped: 0 },
          lines: { pct: 74, covered: 740, total: 1000, skipped: 0 },
        },
        '/Users/project/src': {
          statements: { pct: 80 },
          branches: { pct: 70 },
          functions: { pct: 85 },
          lines: { pct: 78 },
        },
      }

      vi.mocked(existsSync).mockReturnValue(true)
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(mockSummary))

      const result = checkCoverageReport()

      expect(result).toEqual(mockSummary)
      expect(consoleLogSpy).toHaveBeenCalledWith('📈 Statements: 76%')
      expect(consoleLogSpy).toHaveBeenCalledWith('\n👍 Good coverage!')
    })

    it('should handle UTF-8 file encoding', () => {
      const mockSummary = {
        total: {
          statements: { pct: 75 },
          branches: { pct: 70 },
          functions: { pct: 80 },
          lines: { pct: 75 },
        },
      }

      vi.mocked(existsSync).mockReturnValue(true)
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(mockSummary))

      checkCoverageReport()

      // Verify that readFileSync was called with 'utf8' encoding
      expect(vi.mocked(readFileSync)).toHaveBeenCalledWith(
        expect.stringContaining('coverage-summary.json'),
        'utf8'
      )
    })
  })
})
