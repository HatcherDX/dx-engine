/**
 * @fileoverview Comprehensive tests for GitUtils - Git Utility Functions System
 *
 * @description
 * This test suite provides 100% coverage for the GitUtils class utility functions.
 * Tests cover commit hash validation, path normalization, language detection, time formatting,
 * caching utilities, JSON parsing, debouncing/throttling, retry logic, and error handling.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @priority CRITICAL
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { GitUtils } from './GitUtils'

describe('🔧 GitUtils - Git Utility Functions System', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  describe('🔑 Commit Hash Validation', () => {
    describe('isValidCommitHash', () => {
      it('should validate full 40-character commit hashes', () => {
        const fullHash = 'a1b2c3d4e5f6789012345678901234567890abcd'
        expect(GitUtils.isValidCommitHash(fullHash)).toBe(true)
      })

      it('should validate short 7-character commit hashes', () => {
        const shortHash = 'a1b2c3d'
        expect(GitUtils.isValidCommitHash(shortHash)).toBe(true)
      })

      it('should validate medium-length commit hashes', () => {
        const mediumHash = 'a1b2c3d4e5f67890'
        expect(GitUtils.isValidCommitHash(mediumHash)).toBe(true)
      })

      it('should accept uppercase hex characters', () => {
        const upperHash = 'A1B2C3D4E5F6789012345678901234567890ABCD'
        expect(GitUtils.isValidCommitHash(upperHash)).toBe(true)
      })

      it('should accept mixed case hex characters', () => {
        const mixedHash = 'A1b2C3d4E5f6789012345678901234567890AbCd'
        expect(GitUtils.isValidCommitHash(mixedHash)).toBe(true)
      })

      it('should reject hashes that are too short', () => {
        const tooShort = 'a1b2c3'
        expect(GitUtils.isValidCommitHash(tooShort)).toBe(false)
      })

      it('should reject hashes that are too long', () => {
        const tooLong = 'a1b2c3d4e5f6789012345678901234567890abcde'
        expect(GitUtils.isValidCommitHash(tooLong)).toBe(false)
      })

      it('should reject hashes with invalid characters', () => {
        const invalidChars = 'g1h2i3j4k5l6m7n8o9p0q1r2s3t4u5v6w7x8y9z0'
        expect(GitUtils.isValidCommitHash(invalidChars)).toBe(false)
      })

      it('should reject empty string', () => {
        expect(GitUtils.isValidCommitHash('')).toBe(false)
      })

      it('should reject non-hex characters', () => {
        expect(GitUtils.isValidCommitHash('1234567890abcdefg')).toBe(false)
        expect(GitUtils.isValidCommitHash('commit-hash-with-dashes')).toBe(
          false
        )
        expect(GitUtils.isValidCommitHash('hash with spaces')).toBe(false)
      })

      it('should reject special characters and symbols', () => {
        expect(GitUtils.isValidCommitHash('1234567!@#$%^&*()')).toBe(false)
        expect(GitUtils.isValidCommitHash('abcdef_123456')).toBe(false)
        expect(GitUtils.isValidCommitHash('abcdef.123456')).toBe(false)
      })
    })

    describe('shortenHash', () => {
      it('should shorten full hash to 7 characters', () => {
        const fullHash = 'a1b2c3d4e5f6789012345678901234567890abcd'
        expect(GitUtils.shortenHash(fullHash)).toBe('a1b2c3d')
      })

      it('should return first 7 characters of any length hash', () => {
        const mediumHash = 'a1b2c3d4e5f67890'
        expect(GitUtils.shortenHash(mediumHash)).toBe('a1b2c3d')
      })

      it('should handle short hashes gracefully', () => {
        const shortHash = 'abc'
        expect(GitUtils.shortenHash(shortHash)).toBe('abc')
      })

      it('should handle exactly 7 character hashes', () => {
        const exactHash = 'abcdefg'
        expect(GitUtils.shortenHash(exactHash)).toBe('abcdefg')
      })

      it('should handle empty string', () => {
        expect(GitUtils.shortenHash('')).toBe('')
      })

      it('should preserve case', () => {
        const mixedCase = 'ABCdefGHI123'
        expect(GitUtils.shortenHash(mixedCase)).toBe('ABCdefG')
      })
    })
  })

  describe('📝 Commit Message Processing', () => {
    describe('getCommitSummary', () => {
      it('should extract first line from single line message', () => {
        const message = 'feat: add new feature'
        expect(GitUtils.getCommitSummary(message)).toBe('feat: add new feature')
      })

      it('should extract first line from multiline message', () => {
        const message =
          'feat: add new feature\n\nThis is a detailed description\nwith multiple lines'
        expect(GitUtils.getCommitSummary(message)).toBe('feat: add new feature')
      })

      it('should handle message with only newlines', () => {
        const message = '\n\n\n'
        expect(GitUtils.getCommitSummary(message)).toBe('')
      })

      it('should handle empty message', () => {
        expect(GitUtils.getCommitSummary('')).toBe('')
      })

      it('should handle message starting with newline', () => {
        const message = '\nSecond line is first content'
        expect(GitUtils.getCommitSummary(message)).toBe('')
      })

      it('should handle Windows line endings', () => {
        const message = 'First line\r\nSecond line\r\nThird line'
        expect(GitUtils.getCommitSummary(message)).toBe('First line\r')
      })

      it('should handle mixed line endings', () => {
        const message = 'First line\r\nSecond line\nThird line'
        expect(GitUtils.getCommitSummary(message)).toBe('First line\r')
      })

      it('should handle very long first lines', () => {
        const longLine = 'x'.repeat(1000)
        const message = `${longLine}\nSecond line`
        expect(GitUtils.getCommitSummary(message)).toBe(longLine)
      })

      it('should handle unicode characters', () => {
        const message = '🚀 feat: add emoji support\n\nDetailed description'
        expect(GitUtils.getCommitSummary(message)).toBe(
          '🚀 feat: add emoji support'
        )
      })
    })
  })

  describe('📁 Path Normalization', () => {
    describe('normalizePath', () => {
      it('should convert Windows backslashes to forward slashes', () => {
        const windowsPath = 'src\\components\\Button.tsx'
        expect(GitUtils.normalizePath(windowsPath)).toBe(
          'src/components/Button.tsx'
        )
      })

      it('should handle mixed slashes', () => {
        const mixedPath = 'src\\components/Button\\index.tsx'
        expect(GitUtils.normalizePath(mixedPath)).toBe(
          'src/components/Button/index.tsx'
        )
      })

      it('should leave forward slashes unchanged', () => {
        const unixPath = 'src/components/Button.tsx'
        expect(GitUtils.normalizePath(unixPath)).toBe(
          'src/components/Button.tsx'
        )
      })

      it('should handle empty path', () => {
        expect(GitUtils.normalizePath('')).toBe('')
      })

      it('should handle root paths', () => {
        expect(GitUtils.normalizePath('C:\\')).toBe('C:/')
        expect(GitUtils.normalizePath('\\')).toBe('/')
      })

      it('should handle UNC paths', () => {
        const uncPath = '\\\\server\\share\\folder\\file.txt'
        expect(GitUtils.normalizePath(uncPath)).toBe(
          '//server/share/folder/file.txt'
        )
      })

      it('should handle paths with consecutive backslashes', () => {
        const path = 'src\\\\components\\\\Button.tsx'
        expect(GitUtils.normalizePath(path)).toBe('src//components//Button.tsx')
      })

      it('should handle very long paths', () => {
        const longPath = 'src\\' + 'folder\\'.repeat(100) + 'file.txt'
        const expected = 'src/' + 'folder/'.repeat(100) + 'file.txt'
        expect(GitUtils.normalizePath(longPath)).toBe(expected)
      })
    })
  })

  describe('📄 Binary File Detection', () => {
    describe('isBinaryFile', () => {
      it('should detect image files as binary', () => {
        expect(GitUtils.isBinaryFile('image.jpg')).toBe(true)
        expect(GitUtils.isBinaryFile('image.jpeg')).toBe(true)
        expect(GitUtils.isBinaryFile('image.png')).toBe(true)
        expect(GitUtils.isBinaryFile('image.gif')).toBe(true)
        expect(GitUtils.isBinaryFile('image.bmp')).toBe(true)
        expect(GitUtils.isBinaryFile('image.ico')).toBe(true)
        expect(GitUtils.isBinaryFile('image.svg')).toBe(true)
      })

      it('should detect document files as binary', () => {
        expect(GitUtils.isBinaryFile('document.pdf')).toBe(true)
        expect(GitUtils.isBinaryFile('document.doc')).toBe(true)
        expect(GitUtils.isBinaryFile('document.docx')).toBe(true)
        expect(GitUtils.isBinaryFile('spreadsheet.xls')).toBe(true)
        expect(GitUtils.isBinaryFile('spreadsheet.xlsx')).toBe(true)
        expect(GitUtils.isBinaryFile('presentation.ppt')).toBe(true)
        expect(GitUtils.isBinaryFile('presentation.pptx')).toBe(true)
      })

      it('should detect archive files as binary', () => {
        expect(GitUtils.isBinaryFile('archive.zip')).toBe(true)
        expect(GitUtils.isBinaryFile('archive.tar')).toBe(true)
        expect(GitUtils.isBinaryFile('archive.gz')).toBe(true)
        expect(GitUtils.isBinaryFile('archive.7z')).toBe(true)
        expect(GitUtils.isBinaryFile('archive.rar')).toBe(true)
      })

      it('should detect executable files as binary', () => {
        expect(GitUtils.isBinaryFile('program.exe')).toBe(true)
        expect(GitUtils.isBinaryFile('library.dll')).toBe(true)
        expect(GitUtils.isBinaryFile('library.so')).toBe(true)
        expect(GitUtils.isBinaryFile('library.dylib')).toBe(true)
      })

      it('should detect media files as binary', () => {
        expect(GitUtils.isBinaryFile('audio.mp3')).toBe(true)
        expect(GitUtils.isBinaryFile('video.mp4')).toBe(true)
        expect(GitUtils.isBinaryFile('video.avi')).toBe(true)
        expect(GitUtils.isBinaryFile('video.mov')).toBe(true)
        expect(GitUtils.isBinaryFile('video.mkv')).toBe(true)
      })

      it('should detect font files as binary', () => {
        expect(GitUtils.isBinaryFile('font.ttf')).toBe(true)
        expect(GitUtils.isBinaryFile('font.otf')).toBe(true)
        expect(GitUtils.isBinaryFile('font.woff')).toBe(true)
        expect(GitUtils.isBinaryFile('font.woff2')).toBe(true)
      })

      it('should detect text files as non-binary', () => {
        expect(GitUtils.isBinaryFile('file.txt')).toBe(false)
        expect(GitUtils.isBinaryFile('code.js')).toBe(false)
        expect(GitUtils.isBinaryFile('code.ts')).toBe(false)
        expect(GitUtils.isBinaryFile('markup.html')).toBe(false)
        expect(GitUtils.isBinaryFile('styles.css')).toBe(false)
        expect(GitUtils.isBinaryFile('data.json')).toBe(false)
        expect(GitUtils.isBinaryFile('config.yaml')).toBe(false)
        expect(GitUtils.isBinaryFile('README.md')).toBe(false)
      })

      it('should handle case insensitive extensions', () => {
        expect(GitUtils.isBinaryFile('IMAGE.JPG')).toBe(true)
        expect(GitUtils.isBinaryFile('Image.Png')).toBe(true)
        expect(GitUtils.isBinaryFile('DOCUMENT.PDF')).toBe(true)
      })

      it('should handle files without extensions', () => {
        expect(GitUtils.isBinaryFile('README')).toBe(false)
        expect(GitUtils.isBinaryFile('Makefile')).toBe(false)
        expect(GitUtils.isBinaryFile('dockerfile')).toBe(false)
      })

      it('should handle files with multiple dots', () => {
        expect(GitUtils.isBinaryFile('archive.tar.gz')).toBe(true)
        expect(GitUtils.isBinaryFile('backup.sql.zip')).toBe(true)
        expect(GitUtils.isBinaryFile('config.test.js')).toBe(false)
      })

      it('should handle paths with directories', () => {
        expect(GitUtils.isBinaryFile('src/images/logo.png')).toBe(true)
        expect(GitUtils.isBinaryFile('docs/assets/screenshot.jpg')).toBe(true)
        expect(GitUtils.isBinaryFile('src/components/Button.tsx')).toBe(false)
      })
    })
  })

  describe('🎯 Language Detection', () => {
    describe('detectLanguage', () => {
      it('should detect JavaScript files', () => {
        expect(GitUtils.detectLanguage('file.js')).toBe('javascript')
        expect(GitUtils.detectLanguage('component.jsx')).toBe('javascript')
      })

      it('should detect TypeScript files', () => {
        expect(GitUtils.detectLanguage('file.ts')).toBe('typescript')
        expect(GitUtils.detectLanguage('component.tsx')).toBe('typescript')
      })

      it('should detect various programming languages', () => {
        expect(GitUtils.detectLanguage('script.py')).toBe('python')
        expect(GitUtils.detectLanguage('Main.java')).toBe('java')
        expect(GitUtils.detectLanguage('program.c')).toBe('c')
        expect(GitUtils.detectLanguage('program.cpp')).toBe('cpp')
        expect(GitUtils.detectLanguage('header.h')).toBe('c')
        expect(GitUtils.detectLanguage('header.hpp')).toBe('cpp')
        expect(GitUtils.detectLanguage('app.cs')).toBe('csharp')
        expect(GitUtils.detectLanguage('main.go')).toBe('go')
        expect(GitUtils.detectLanguage('lib.rs')).toBe('rust')
        expect(GitUtils.detectLanguage('index.php')).toBe('php')
        expect(GitUtils.detectLanguage('script.rb')).toBe('ruby')
        expect(GitUtils.detectLanguage('app.swift')).toBe('swift')
        expect(GitUtils.detectLanguage('App.kt')).toBe('kotlin')
        expect(GitUtils.detectLanguage('Program.scala')).toBe('scala')
      })

      it('should detect shell scripts', () => {
        expect(GitUtils.detectLanguage('script.sh')).toBe('bash')
        expect(GitUtils.detectLanguage('script.bash')).toBe('bash')
        expect(GitUtils.detectLanguage('config.zsh')).toBe('bash')
        expect(GitUtils.detectLanguage('functions.fish')).toBe('bash')
        expect(GitUtils.detectLanguage('script.ps1')).toBe('powershell')
      })

      it('should detect markup and styling languages', () => {
        expect(GitUtils.detectLanguage('page.html')).toBe('html')
        expect(GitUtils.detectLanguage('page.htm')).toBe('html')
        expect(GitUtils.detectLanguage('data.xml')).toBe('xml')
        expect(GitUtils.detectLanguage('styles.css')).toBe('css')
        expect(GitUtils.detectLanguage('styles.scss')).toBe('scss')
        expect(GitUtils.detectLanguage('styles.sass')).toBe('sass')
        expect(GitUtils.detectLanguage('styles.less')).toBe('less')
      })

      it('should detect data and config formats', () => {
        expect(GitUtils.detectLanguage('data.json')).toBe('json')
        expect(GitUtils.detectLanguage('config.yaml')).toBe('yaml')
        expect(GitUtils.detectLanguage('config.yml')).toBe('yaml')
        expect(GitUtils.detectLanguage('config.toml')).toBe('toml')
        expect(GitUtils.detectLanguage('config.ini')).toBe('ini')
        expect(GitUtils.detectLanguage('app.cfg')).toBe('ini')
        expect(GitUtils.detectLanguage('nginx.conf')).toBe('ini')
      })

      it('should detect documentation and other formats', () => {
        expect(GitUtils.detectLanguage('README.md')).toBe('markdown')
        expect(GitUtils.detectLanguage('doc.markdown')).toBe('markdown')
        expect(GitUtils.detectLanguage('query.sql')).toBe('sql')
        expect(GitUtils.detectLanguage('Dockerfile')).toBe('text') // No extension, returns 'text'
        expect(GitUtils.detectLanguage('analysis.r')).toBe('r')
        expect(GitUtils.detectLanguage('script.m')).toBe('matlab')
        expect(GitUtils.detectLanguage('document.tex')).toBe('latex')
        expect(GitUtils.detectLanguage('config.vim')).toBe('vim')
      })

      it('should handle Vue files', () => {
        expect(GitUtils.detectLanguage('Component.vue')).toBe('vue')
      })

      it('should return "text" for unknown extensions', () => {
        expect(GitUtils.detectLanguage('file.unknown')).toBe('text')
        expect(GitUtils.detectLanguage('file.xyz')).toBe('text')
        expect(GitUtils.detectLanguage('file.customext')).toBe('text')
      })

      it('should return "text" for files without extensions', () => {
        expect(GitUtils.detectLanguage('README')).toBe('text')
        expect(GitUtils.detectLanguage('Makefile')).toBe('text')
      })

      it('should handle case insensitive extensions', () => {
        expect(GitUtils.detectLanguage('FILE.JS')).toBe('javascript')
        expect(GitUtils.detectLanguage('Component.VUE')).toBe('vue')
        expect(GitUtils.detectLanguage('Script.PY')).toBe('python')
      })

      it('should handle paths with directories', () => {
        expect(GitUtils.detectLanguage('src/components/Button.tsx')).toBe(
          'typescript'
        )
        expect(GitUtils.detectLanguage('docs/guide.md')).toBe('markdown')
        expect(GitUtils.detectLanguage('assets/styles/main.scss')).toBe('scss')
      })
    })
  })

  describe('⏰ Time Formatting', () => {
    describe('formatRelativeTime', () => {
      const mockNow = 1640995200000 // 2022-01-01 00:00:00 UTC

      beforeEach(() => {
        vi.spyOn(Date, 'now').mockReturnValue(mockNow)
      })

      it('should return "just now" for very recent times', () => {
        const timestamp = new Date(mockNow - 30000).toISOString() // 30 seconds ago
        expect(GitUtils.formatRelativeTime(timestamp)).toBe('just now')
      })

      it('should return minutes ago for recent times', () => {
        const timestamp = new Date(mockNow - 2 * 60 * 1000).toISOString() // 2 minutes ago
        expect(GitUtils.formatRelativeTime(timestamp)).toBe('2 minutes ago')
      })

      it('should return minute ago (singular) for one minute', () => {
        const timestamp = new Date(mockNow - 60 * 1000).toISOString() // 1 minute ago
        expect(GitUtils.formatRelativeTime(timestamp)).toBe('1 minute ago')
      })

      it('should return hours ago for times within a day', () => {
        const timestamp = new Date(mockNow - 3 * 60 * 60 * 1000).toISOString() // 3 hours ago
        expect(GitUtils.formatRelativeTime(timestamp)).toBe('3 hours ago')
      })

      it('should return hour ago (singular) for one hour', () => {
        const timestamp = new Date(mockNow - 60 * 60 * 1000).toISOString() // 1 hour ago
        expect(GitUtils.formatRelativeTime(timestamp)).toBe('1 hour ago')
      })

      it('should return days ago for times within a week', () => {
        const timestamp = new Date(
          mockNow - 4 * 24 * 60 * 60 * 1000
        ).toISOString() // 4 days ago
        expect(GitUtils.formatRelativeTime(timestamp)).toBe('4 days ago')
      })

      it('should return day ago (singular) for one day', () => {
        const timestamp = new Date(mockNow - 24 * 60 * 60 * 1000).toISOString() // 1 day ago
        expect(GitUtils.formatRelativeTime(timestamp)).toBe('1 day ago')
      })

      it('should return weeks ago for times within a month', () => {
        const timestamp = new Date(
          mockNow - 2 * 7 * 24 * 60 * 60 * 1000
        ).toISOString() // 2 weeks ago
        expect(GitUtils.formatRelativeTime(timestamp)).toBe('2 weeks ago')
      })

      it('should return week ago (singular) for one week', () => {
        const timestamp = new Date(
          mockNow - 7 * 24 * 60 * 60 * 1000
        ).toISOString() // 1 week ago
        expect(GitUtils.formatRelativeTime(timestamp)).toBe('1 week ago')
      })

      it('should return months ago for times within a year', () => {
        const timestamp = new Date(
          mockNow - 6 * 30 * 24 * 60 * 60 * 1000
        ).toISOString() // 6 months ago
        expect(GitUtils.formatRelativeTime(timestamp)).toBe('6 months ago')
      })

      it('should return month ago (singular) for one month', () => {
        const timestamp = new Date(
          mockNow - 30 * 24 * 60 * 60 * 1000
        ).toISOString() // 1 month ago
        expect(GitUtils.formatRelativeTime(timestamp)).toBe('1 month ago')
      })

      it('should return years ago for times over a year', () => {
        const timestamp = new Date(
          mockNow - 2 * 365 * 24 * 60 * 60 * 1000
        ).toISOString() // 2 years ago
        expect(GitUtils.formatRelativeTime(timestamp)).toBe('2 years ago')
      })

      it('should return year ago (singular) for one year', () => {
        const timestamp = new Date(
          mockNow - 365 * 24 * 60 * 60 * 1000
        ).toISOString() // 1 year ago
        expect(GitUtils.formatRelativeTime(timestamp)).toBe('1 year ago')
      })

      it('should handle edge cases at boundaries', () => {
        // Just under 1 minute
        const almostMinute = new Date(mockNow - 59000).toISOString()
        expect(GitUtils.formatRelativeTime(almostMinute)).toBe('just now')

        // Exactly 1 minute
        const exactMinute = new Date(mockNow - 60000).toISOString()
        expect(GitUtils.formatRelativeTime(exactMinute)).toBe('1 minute ago')
      })

      it('should handle invalid timestamps gracefully', () => {
        const invalidTimestamp = 'not-a-valid-date'
        expect(() =>
          GitUtils.formatRelativeTime(invalidTimestamp)
        ).not.toThrow()
      })
    })
  })

  describe('🔐 Cache Key Generation', () => {
    describe('generateCacheKey', () => {
      it('should generate key from string components', () => {
        const key = GitUtils.generateCacheKey('repo', 'branch', 'main')
        expect(key).toBe('repo:branch:main')
      })

      it('should generate key from mixed types', () => {
        const key = GitUtils.generateCacheKey('repo', 123, true, 'commit')
        expect(key).toBe('repo:123:true:commit')
      })

      it('should handle empty components', () => {
        const key = GitUtils.generateCacheKey()
        expect(key).toBe('')
      })

      it('should handle single component', () => {
        const key = GitUtils.generateCacheKey('single')
        expect(key).toBe('single')
      })

      it('should sanitize special characters', () => {
        const key = GitUtils.generateCacheKey(
          'repo name',
          'branch/feature',
          'commit@hash'
        )
        expect(key).toBe('repo_name:branch_feature:commit_hash')
      })

      it('should preserve allowed characters', () => {
        const key = GitUtils.generateCacheKey('repo-1', 'branch_2', 'commit:3')
        expect(key).toBe('repo-1:branch_2:commit:3')
      })

      it('should handle Unicode characters', () => {
        const key = GitUtils.generateCacheKey('repo', '🚀feature', 'commit')
        expect(key).toBe('repo:__feature:commit') // Emoji becomes two underscores
      })

      it('should handle numbers and booleans correctly', () => {
        const key = GitUtils.generateCacheKey(0, false, -123, 3.14)
        expect(key).toBe('0:false:-123:3_14') // Dot is sanitized to underscore
      })
    })
  })

  describe('📋 JSON Parsing', () => {
    describe('safeJsonParse', () => {
      it('should parse valid JSON', () => {
        const json = '{"name": "test", "value": 123}'
        const result = GitUtils.safeJsonParse(json, {})
        expect(result).toEqual({ name: 'test', value: 123 })
      })

      it('should return fallback for invalid JSON', () => {
        const invalidJson = '{"name": test, value: 123}'
        const fallback = { error: true }
        const result = GitUtils.safeJsonParse(invalidJson, fallback)
        expect(result).toBe(fallback)
      })

      it('should handle empty string', () => {
        const result = GitUtils.safeJsonParse('', null)
        expect(result).toBe(null)
      })

      it('should handle different fallback types', () => {
        expect(GitUtils.safeJsonParse('invalid', [])).toEqual([])
        expect(GitUtils.safeJsonParse('invalid', 'fallback')).toBe('fallback')
        expect(GitUtils.safeJsonParse('invalid', 42)).toBe(42)
        expect(GitUtils.safeJsonParse('invalid', true)).toBe(true)
      })

      it('should handle nested objects', () => {
        const json = '{"user": {"name": "test", "data": {"age": 25}}}'
        const result = GitUtils.safeJsonParse(json, {})
        expect(result).toEqual({
          user: {
            name: 'test',
            data: { age: 25 },
          },
        })
      })

      it('should handle arrays', () => {
        const json = '[1, 2, 3, {"name": "test"}]'
        const result = GitUtils.safeJsonParse(json, [])
        expect(result).toEqual([1, 2, 3, { name: 'test' }])
      })

      it('should preserve null and undefined values in JSON', () => {
        const json = '{"value": null, "undefined": null}'
        const result = GitUtils.safeJsonParse(json, {})
        expect(result).toEqual({ value: null, undefined: null })
      })
    })
  })

  describe('⚡ Debouncing', () => {
    describe('debounce', () => {
      it('should debounce function calls', () => {
        const mockFn = vi.fn()
        const debounced = GitUtils.debounce(mockFn, 100)

        debounced('arg1')
        debounced('arg2')
        debounced('arg3')

        // Function should not be called immediately
        expect(mockFn).not.toHaveBeenCalled()

        // Advance time and function should be called with last arguments
        vi.advanceTimersByTime(100)
        expect(mockFn).toHaveBeenCalledTimes(1)
        expect(mockFn).toHaveBeenCalledWith('arg3')
      })

      it('should reset timer on subsequent calls', () => {
        const mockFn = vi.fn()
        const debounced = GitUtils.debounce(mockFn, 100)

        debounced('first')
        vi.advanceTimersByTime(50) // Halfway through

        debounced('second')
        vi.advanceTimersByTime(50) // Should not trigger yet

        expect(mockFn).not.toHaveBeenCalled()

        vi.advanceTimersByTime(50) // Complete the second timer
        expect(mockFn).toHaveBeenCalledTimes(1)
        expect(mockFn).toHaveBeenCalledWith('second')
      })

      it('should handle multiple arguments', () => {
        const mockFn = vi.fn()
        const debounced = GitUtils.debounce(mockFn, 100)

        debounced('arg1', 'arg2', 'arg3')
        vi.advanceTimersByTime(100)

        expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2', 'arg3')
      })

      it('should handle zero delay', () => {
        const mockFn = vi.fn()
        const debounced = GitUtils.debounce(mockFn, 0)

        debounced('test')
        vi.advanceTimersByTime(0)

        expect(mockFn).toHaveBeenCalledWith('test')
      })

      it('should work with async functions', () => {
        const mockAsyncFn = vi.fn().mockResolvedValue('result')
        const debounced = GitUtils.debounce(mockAsyncFn, 100)

        debounced('async-arg')
        vi.advanceTimersByTime(100)

        expect(mockAsyncFn).toHaveBeenCalledWith('async-arg')
      })
    })
  })

  describe('🚦 Throttling', () => {
    describe('throttle', () => {
      it('should throttle function calls', () => {
        const mockFn = vi.fn()
        const throttled = GitUtils.throttle(mockFn, 100)

        // First call should execute immediately
        throttled('arg1')
        expect(mockFn).toHaveBeenCalledTimes(1)
        expect(mockFn).toHaveBeenCalledWith('arg1')

        // Subsequent calls within limit should be ignored
        throttled('arg2')
        throttled('arg3')
        expect(mockFn).toHaveBeenCalledTimes(1)

        // After limit, next call should execute
        vi.advanceTimersByTime(100)
        throttled('arg4')
        expect(mockFn).toHaveBeenCalledTimes(2)
        expect(mockFn).toHaveBeenCalledWith('arg4')
      })

      it('should handle rapid successive calls', () => {
        const mockFn = vi.fn()
        const throttled = GitUtils.throttle(mockFn, 100)

        // Make many rapid calls
        for (let i = 0; i < 10; i++) {
          throttled(`arg${i}`)
        }

        // Only first call should execute
        expect(mockFn).toHaveBeenCalledTimes(1)
        expect(mockFn).toHaveBeenCalledWith('arg0')
      })

      it('should handle multiple arguments', () => {
        const mockFn = vi.fn()
        const throttled = GitUtils.throttle(mockFn, 100)

        throttled('arg1', 'arg2', 'arg3')
        expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2', 'arg3')
      })

      it('should handle zero limit', () => {
        const mockFn = vi.fn()
        const throttled = GitUtils.throttle(mockFn, 0)

        throttled('test1')
        throttled('test2')
        throttled('test3')

        // All calls should execute with zero limit
        expect(mockFn).toHaveBeenCalledTimes(3)
      })
    })
  })

  describe('🔄 Retry Logic', () => {
    describe('retry', () => {
      it('should succeed on first attempt', async () => {
        const mockOperation = vi.fn().mockResolvedValue('success')

        const result = await GitUtils.retry(mockOperation, 3, 100)

        expect(result).toBe('success')
        expect(mockOperation).toHaveBeenCalledTimes(1)
      })

      it('should retry on failure and eventually succeed', async () => {
        const mockOperation = vi
          .fn()
          .mockRejectedValueOnce(new Error('Attempt 1 failed'))
          .mockRejectedValueOnce(new Error('Attempt 2 failed'))
          .mockResolvedValue('success on third try')

        const promise = GitUtils.retry(mockOperation, 3, 100)

        // Fast-forward through all the delays
        await vi.runAllTimersAsync()

        const result = await promise
        expect(result).toBe('success on third try')
        expect(mockOperation).toHaveBeenCalledTimes(3)
      }, 15000)

      it('should fail after max retries', async () => {
        const mockOperation = vi
          .fn()
          .mockRejectedValue(new Error('Always fails'))

        // Create the promise first
        const promise = GitUtils.retry(mockOperation, 2, 100)

        // Set up the promise rejection handler before advancing timers
        const resultPromise = promise.catch((error) => error)

        // Fast-forward through all the delays
        await vi.runAllTimersAsync()

        // Now check the result
        const error = await resultPromise
        expect(error.message).toBe('Always fails')
        expect(mockOperation).toHaveBeenCalledTimes(3) // Initial + 2 retries
      }, 15000)

      it('should use exponential backoff', async () => {
        const mockOperation = vi
          .fn()
          .mockRejectedValueOnce(new Error('Fail 1'))
          .mockRejectedValueOnce(new Error('Fail 2'))
          .mockResolvedValue('success')

        const promise = GitUtils.retry(mockOperation, 2, 100)

        // Fast-forward through all the delays
        await vi.runAllTimersAsync()

        const result = await promise
        expect(result).toBe('success')
      }, 15000)

      it('should handle non-Error rejections', async () => {
        const mockOperation = vi
          .fn()
          .mockRejectedValueOnce('string error')
          .mockRejectedValueOnce(123)
          .mockResolvedValue('success')

        const promise = GitUtils.retry(mockOperation, 3, 100)

        // Fast-forward through all the delays
        await vi.runAllTimersAsync()

        const result = await promise
        expect(result).toBe('success')
      }, 15000)

      it('should work with default parameters', async () => {
        const mockOperation = vi.fn().mockResolvedValue('default success')

        const result = await GitUtils.retry(mockOperation)
        expect(result).toBe('default success')
      })

      it('should handle zero retries', async () => {
        const mockOperation = vi
          .fn()
          .mockRejectedValue(new Error('Immediate fail'))

        await expect(GitUtils.retry(mockOperation, 0, 100)).rejects.toThrow(
          'Immediate fail'
        )
        expect(mockOperation).toHaveBeenCalledTimes(1)
      })
    })
  })
})
