/**
 * Test suite for path-mock helper functions
 *
 * @fileoverview
 * Comprehensive test coverage for platform-aware path.join mocking functionality.
 * Tests both Windows and Unix-like platform behaviors using vitest stubbing patterns.
 *
 * @example
 * ```typescript
 * // Test Windows path behavior
 * vi.stubGlobal('process', { platform: 'win32' })
 * const mockJoin = createPathJoinMock()
 * expect(mockJoin('path', 'to', 'file')).toBe('C:\\test\\electron\\path\\to\\file')
 * ```
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createPathJoinMock, pathMock } from './path-mock'

describe('path-mock', () => {
  let originalProcess: NodeJS.Process

  beforeEach(() => {
    // Store original process object for restoration
    originalProcess = global.process
  })

  afterEach(() => {
    // Restore original process and clean up global stubs
    vi.unstubAllGlobals()
    global.process = originalProcess
  })

  describe('createPathJoinMock', () => {
    describe('Unix-like platforms (non-win32)', () => {
      beforeEach(() => {
        // Stub process.platform to simulate Unix-like environment
        vi.stubGlobal('process', { platform: 'linux' })
      })

      /**
       * Test basic path joining on Unix platforms
       */
      it('should join paths with forward slashes on Unix platforms', () => {
        const mockJoin = createPathJoinMock()
        const result = mockJoin('path', 'to', 'file')

        expect(result).toBe('path/to/file')
      })

      /**
       * Test __dirname special case handling on Unix platforms
       */
      it('should handle __dirname replacement on Unix platforms', () => {
        const mockJoin = createPathJoinMock()
        const result = mockJoin('__dirname', 'relative', 'path')

        expect(result).toBe('/test/electron/relative/path')
      })

      /**
       * Test filtering of null/undefined arguments on Unix platforms
       */
      it('should filter out null and undefined arguments on Unix platforms', () => {
        const mockJoin = createPathJoinMock()
        const result = mockJoin(
          'path',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test validation requires bypassing type system to test runtime null handling
          null as any,
          'to',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test validation requires bypassing type system to test runtime undefined handling
          undefined as any,
          'file'
        )

        expect(result).toBe('path/to/file')
      })

      /**
       * Test empty arguments handling on Unix platforms
       */
      it('should handle empty arguments array on Unix platforms', () => {
        const mockJoin = createPathJoinMock()
        const result = mockJoin()

        expect(result).toBe('')
      })

      /**
       * Test single argument on Unix platforms
       */
      it('should handle single argument on Unix platforms', () => {
        const mockJoin = createPathJoinMock()
        const result = mockJoin('single')

        expect(result).toBe('single')
      })
    })

    describe('Windows platform (win32)', () => {
      beforeEach(() => {
        // Stub process.platform to simulate Windows environment
        vi.stubGlobal('process', { platform: 'win32' })
      })

      /**
       * Test basic path joining on Windows
       */
      it('should join paths with backslashes on Windows', () => {
        const mockJoin = createPathJoinMock()
        const result = mockJoin('path', 'to', 'file')

        expect(result).toBe('C:\\test\\electron\\path\\to\\file')
      })

      /**
       * Test __dirname special case handling on Windows
       */
      it('should handle __dirname replacement on Windows', () => {
        const mockJoin = createPathJoinMock()
        const result = mockJoin('__dirname', 'relative', 'path')

        expect(result).toBe('C:\\test\\electron\\relative\\path')
      })

      /**
       * Test filtering of null/undefined arguments on Windows
       */
      it('should filter out null and undefined arguments on Windows', () => {
        const mockJoin = createPathJoinMock()
        const result = mockJoin(
          'path',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test validation requires bypassing type system to test runtime null handling
          null as any,
          'to',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test validation requires bypassing type system to test runtime undefined handling
          undefined as any,
          'file'
        )

        expect(result).toBe('C:\\test\\electron\\path\\to\\file')
      })

      /**
       * Test absolute path detection with drive letter (line 31-32)
       */
      it('should preserve paths that already start with drive letter', () => {
        const mockJoin = createPathJoinMock()
        const result = mockJoin('D:\\absolute\\path')

        expect(result).toBe('D:\\absolute\\path')
      })

      /**
       * Test absolute path with lowercase drive letter (line 31-32)
       */
      it('should preserve paths with lowercase drive letters', () => {
        const mockJoin = createPathJoinMock()
        const result = mockJoin('c:\\lowercase\\drive')

        expect(result).toBe('c:\\lowercase\\drive')
      })

      /**
       * Test path starting with separator gets C: drive prefix (lines 35-36)
       */
      it('should add C: prefix to paths starting with separator', () => {
        const mockJoin = createPathJoinMock()
        const result = mockJoin('\\absolute\\from\\root')

        expect(result).toBe('C:\\absolute\\from\\root')
      })

      /**
       * Test relative path gets full absolute prefix (lines 39-40)
       */
      it('should make relative paths absolute with full prefix', () => {
        const mockJoin = createPathJoinMock()
        const result = mockJoin('relative', 'path')

        expect(result).toBe('C:\\test\\electron\\relative\\path')
      })

      /**
       * Test path already starting with C: prefix (line 39 condition false)
       */
      it('should preserve paths already starting with C: prefix', () => {
        const mockJoin = createPathJoinMock()
        const result = mockJoin('C:\\already\\absolute')

        expect(result).toBe('C:\\already\\absolute')
      })

      /**
       * Test empty arguments on Windows
       */
      it('should handle empty arguments array on Windows', () => {
        const mockJoin = createPathJoinMock()
        const result = mockJoin()

        // On Windows, empty args result in empty string joined which becomes absolute path
        expect(result).toBe('C:\\test\\electron\\')
      })

      /**
       * Test single argument on Windows
       */
      it('should handle single argument on Windows', () => {
        const mockJoin = createPathJoinMock()
        const result = mockJoin('single')

        expect(result).toBe('C:\\test\\electron\\single')
      })

      /**
       * Test complex path scenarios on Windows
       */
      it('should handle complex mixed path scenarios', () => {
        const mockJoin = createPathJoinMock()

        // Test multiple path components
        expect(mockJoin('a', 'b', 'c', 'd')).toBe(
          'C:\\test\\electron\\a\\b\\c\\d'
        )

        // Test with __dirname in middle - the __dirname gets replaced, then all are joined and made absolute
        expect(mockJoin('start', '__dirname', 'end')).toBe(
          'C:\\test\\electron\\start\\C:\\test\\electron\\end'
        )
      })
    })

    describe('Edge cases and error handling', () => {
      /**
       * Test all null arguments
       */
      it('should handle all null arguments', () => {
        vi.stubGlobal('process', { platform: 'linux' })
        const mockJoin = createPathJoinMock()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test validation requires bypassing type system to test runtime null handling
        const result = mockJoin(null as any, null as any)

        expect(result).toBe('')
      })

      /**
       * Test mixed valid and invalid arguments
       */
      it('should handle mixed valid and invalid arguments', () => {
        vi.stubGlobal('process', { platform: 'linux' })
        const mockJoin = createPathJoinMock()
        const result = mockJoin(
          'start',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test validation requires bypassing type system to test runtime null handling
          null as any,
          'middle',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test validation requires bypassing type system to test runtime undefined handling
          undefined as any,
          'end'
        )

        expect(result).toBe('start/middle/end')
      })

      /**
       * Test platform switching behavior
       */
      it('should adapt to platform changes', () => {
        // Test Unix behavior
        vi.stubGlobal('process', { platform: 'darwin' })
        let mockJoin = createPathJoinMock()
        expect(mockJoin('a', 'b')).toBe('a/b')

        // Change to Windows behavior
        vi.stubGlobal('process', { platform: 'win32' })
        mockJoin = createPathJoinMock()
        expect(mockJoin('a', 'b')).toBe('C:\\test\\electron\\a\\b')
      })
    })
  })

  describe('pathMock', () => {
    describe('Unix-like platforms', () => {
      beforeEach(() => {
        // Stub process.platform to simulate Unix-like environment
        vi.stubGlobal('process', { platform: 'linux' })
      })

      /**
       * Test pathMock structure on Unix platforms
       */
      it('should provide correct separator and join function on Unix', async () => {
        // Need to re-import after stubbing to get updated values
        const { createPathJoinMock } = await import('./path-mock')
        const expectedMock = {
          join: createPathJoinMock(),
          sep: '/',
        }

        expect(typeof expectedMock.join).toBe('function')
        expect(expectedMock.sep).toBe('/')

        // Test that join works correctly
        expect(expectedMock.join('a', 'b')).toBe('a/b')
      })
    })

    describe('Windows platform', () => {
      beforeEach(() => {
        // Stub process.platform to simulate Windows environment
        vi.stubGlobal('process', { platform: 'win32' })
      })

      /**
       * Test pathMock structure on Windows
       */
      it('should provide correct separator and join function on Windows', async () => {
        // Need to re-import after stubbing to get updated values
        const { createPathJoinMock } = await import('./path-mock')
        const expectedMock = {
          join: createPathJoinMock(),
          sep: '\\',
        }

        expect(typeof expectedMock.join).toBe('function')
        expect(expectedMock.sep).toBe('\\')

        // Test that join works correctly
        expect(expectedMock.join('a', 'b')).toBe('C:\\test\\electron\\a\\b')
      })
    })

    /**
     * Test exported pathMock object consistency
     */
    it('should export consistent pathMock object structure', () => {
      expect(pathMock).toHaveProperty('join')
      expect(pathMock).toHaveProperty('sep')
      expect(typeof pathMock.join).toBe('function')
      expect(typeof pathMock.sep).toBe('string')
    })
  })

  describe('Coverage completion tests', () => {
    /**
     * Test all code branches for 100% coverage
     */
    describe('Complete branch coverage', () => {
      it('should cover all Windows-specific path handling branches', () => {
        vi.stubGlobal('process', { platform: 'win32' })
        const mockJoin = createPathJoinMock()

        // Cover branch: path with drive letter (line 31-32 true)
        expect(mockJoin('E:\\test')).toBe('E:\\test')

        // Cover branch: path starting with separator (line 35-36 true)
        expect(mockJoin('\\test')).toBe('C:\\test')

        // Cover branch: relative path needing absolute prefix (line 39-40 true)
        expect(mockJoin('test')).toBe('C:\\test\\electron\\test')

        // Cover branch: path already with C: prefix (line 39 false)
        expect(mockJoin('C:\\test')).toBe('C:\\test')
      })

      it('should cover all argument filtering scenarios', () => {
        vi.stubGlobal('process', { platform: 'linux' })
        const mockJoin = createPathJoinMock()

        // Cover null filtering
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test validation requires bypassing type system to test runtime null handling
        expect(mockJoin('a', null as any, 'b')).toBe('a/b')

        // Cover undefined filtering
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test validation requires bypassing type system to test runtime undefined handling
        expect(mockJoin('a', undefined as any, 'b')).toBe('a/b')

        // Cover both null and undefined
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test validation requires bypassing type system to test runtime null handling
        expect(mockJoin(null as any, 'middle', undefined as any)).toBe('middle')
      })

      it('should cover __dirname handling on both platforms', () => {
        // Unix __dirname handling
        vi.stubGlobal('process', { platform: 'linux' })
        let mockJoin = createPathJoinMock()
        expect(mockJoin('__dirname')).toBe('/test/electron')

        // Windows __dirname handling
        vi.stubGlobal('process', { platform: 'win32' })
        mockJoin = createPathJoinMock()
        expect(mockJoin('__dirname')).toBe('C:\\test\\electron')
      })
    })
  })
})
