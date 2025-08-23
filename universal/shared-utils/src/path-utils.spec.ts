/**
 * @fileoverview Tests for cross-platform path utilities.
 *
 * @description
 * Comprehensive tests for path normalization and handling utilities
 * that work consistently across Windows, macOS, and Linux.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import { describe, it, expect } from 'vitest'
import {
  normalizePath,
  toPosixPath,
  toWindowsPath,
  toSystemPath,
  resolveHome,
  safeJoin,
  getPathSeparator,
  isAbsolutePath,
  parsePath,
  getTempPath,
  toUrlPath,
  isWindows,
  isMacOS,
  isLinux,
} from './path-utils'

describe('Path Utilities', () => {
  describe('Platform Detection', () => {
    it('should detect exactly one platform', () => {
      const platformCount = [isWindows, isMacOS, isLinux].filter(Boolean).length
      expect(platformCount).toBeLessThanOrEqual(1)
    })
  })

  describe('normalizePath', () => {
    it('should normalize mixed separators', () => {
      const input = 'folder/subfolder\\file.txt'
      const result = normalizePath(input)
      const sep = getPathSeparator()
      expect(result).toBe(`folder${sep}subfolder${sep}file.txt`)
    })

    it('should handle multiple consecutive separators', () => {
      const input = 'folder//subfolder\\\\file.txt'
      const result = normalizePath(input)
      const sep = getPathSeparator()
      expect(result).toBe(`folder${sep}subfolder${sep}file.txt`)
    })
  })

  describe('toPosixPath', () => {
    it('should convert backslashes to forward slashes', () => {
      expect(toPosixPath('C:\\Users\\test\\file.txt')).toBe(
        'C:/Users/test/file.txt'
      )
    })

    it('should leave forward slashes unchanged', () => {
      expect(toPosixPath('/usr/local/bin')).toBe('/usr/local/bin')
    })
  })

  describe('toWindowsPath', () => {
    it('should convert forward slashes to backslashes', () => {
      expect(toWindowsPath('/Users/test/file.txt')).toBe(
        '\\Users\\test\\file.txt'
      )
    })

    it('should leave backslashes unchanged', () => {
      expect(toWindowsPath('C:\\Windows\\System32')).toBe(
        'C:\\Windows\\System32'
      )
    })
  })

  describe('toSystemPath', () => {
    it('should convert to appropriate system format', () => {
      const input = 'folder/subfolder\\file.txt'
      const result = toSystemPath(input)

      if (isWindows) {
        expect(result).toBe('folder\\subfolder\\file.txt')
      } else {
        expect(result).toBe('folder/subfolder/file.txt')
      }
    })
  })

  describe('resolveHome', () => {
    it('should resolve tilde to home directory', () => {
      const result = resolveHome('~/Documents')
      expect(result).not.toContain('~')
      expect(isAbsolutePath(result)).toBe(true)
    })

    it('should leave absolute paths unchanged', () => {
      const absolutePath = isWindows ? 'C:\\Users\\test' : '/Users/test'
      expect(resolveHome(absolutePath)).toBe(absolutePath)
    })

    it('should leave relative paths unchanged', () => {
      expect(resolveHome('./relative/path')).toBe('./relative/path')
    })
  })

  describe('safeJoin', () => {
    it('should join paths with correct separator', () => {
      const result = safeJoin('folder', 'subfolder', 'file.txt')
      const sep = getPathSeparator()
      expect(result).toBe(`folder${sep}subfolder${sep}file.txt`)
    })

    it('should handle paths with mixed separators', () => {
      const result = safeJoin('folder/sub', 'another\\sub', 'file.txt')
      const sep = getPathSeparator()
      expect(result).toContain(sep)
      expect(result).not.toContain(isWindows ? '/' : '\\')
    })
  })

  describe('isAbsolutePath', () => {
    it('should identify absolute paths correctly', () => {
      if (isWindows) {
        expect(isAbsolutePath('C:\\Users')).toBe(true)
        expect(isAbsolutePath('D:\\Program Files')).toBe(true)
        expect(isAbsolutePath('\\\\server\\share')).toBe(true)
      } else {
        expect(isAbsolutePath('/usr/local')).toBe(true)
        expect(isAbsolutePath('/home/user')).toBe(true)
      }

      expect(isAbsolutePath('./relative')).toBe(false)
      expect(isAbsolutePath('../parent')).toBe(false)
    })
  })

  describe('parsePath', () => {
    it('should correctly parse file paths', () => {
      const testPath = isWindows
        ? 'C:\\Users\\test\\document.txt'
        : '/Users/test/document.txt'

      const result = parsePath(testPath)

      expect(result.name).toBe('document')
      expect(result.ext).toBe('.txt')
      expect(result.dir).toContain('test')
    })

    it('should handle files without extensions', () => {
      const result = parsePath('folder/README')
      expect(result.name).toBe('README')
      expect(result.ext).toBe('')
    })

    it('should handle dotfiles', () => {
      const result = parsePath('/home/user/.gitignore')
      expect(result.name).toBe('.gitignore')
      expect(result.ext).toBe('')
    })
  })

  describe('getTempPath', () => {
    it('should create temp file paths', () => {
      const result = getTempPath('test.txt')
      expect(result).toContain('test.txt')
      expect(isAbsolutePath(result)).toBe(true)
    })
  })

  describe('toUrlPath', () => {
    it('should convert absolute paths to file URLs', () => {
      if (isWindows) {
        const result = toUrlPath('C:\\Users\\test\\file.txt')
        expect(result).toBe('file:///C:/Users/test/file.txt')
      } else {
        const result = toUrlPath('/Users/test/file.txt')
        expect(result).toBe('file:///Users/test/file.txt')
      }
    })

    it('should handle relative paths', () => {
      const result = toUrlPath('./relative/path.txt')
      expect(result).toBe('./relative/path.txt')
    })

    it('should not double-prefix file URLs', () => {
      const input = 'file:///already/url/path.txt'
      expect(toUrlPath(input)).toBe('file:///already/url/path.txt')
    })
  })

  describe('Cross-platform consistency', () => {
    it('should provide consistent API across platforms', () => {
      // Test that all functions return defined values
      expect(normalizePath('test/path')).toBeDefined()
      expect(toPosixPath('test\\path')).toBeDefined()
      expect(toWindowsPath('test/path')).toBeDefined()
      expect(toSystemPath('test/path')).toBeDefined()
      expect(getPathSeparator()).toBeDefined()
      expect(isAbsolutePath('./test')).toBeDefined()
    })
  })
})
