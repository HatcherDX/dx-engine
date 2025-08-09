/**
 * @fileoverview Basic integration tests for Git Genius library.
 */

import { describe, it, expect } from 'vitest'
import {
  createGitGenius,
  createEnhancedGitRunner,
  checkCompatibility,
  VERSION,
  DEFAULT_CONFIG,
  RepositoryManager,
  GitEngine,
  CacheManager,
  GitUtils,
  Logger,
  LogLevel,
} from './index'

describe('Git Genius Library', () => {
  it('should export VERSION correctly', () => {
    expect(VERSION).toBe('0.1.0')
  })

  it('should export DEFAULT_CONFIG with required properties', () => {
    expect(DEFAULT_CONFIG).toHaveProperty('cache')
    expect(DEFAULT_CONFIG).toHaveProperty('git')
    expect(DEFAULT_CONFIG).toHaveProperty('timeline')
    expect(DEFAULT_CONFIG).toHaveProperty('filesystem')
    expect(DEFAULT_CONFIG).toHaveProperty('performance')
  })

  it('should create RepositoryManager instance', () => {
    const repoManager = createGitGenius()
    expect(repoManager).toBeInstanceOf(RepositoryManager)
  })

  it('should create EnhancedGitRunner instance', () => {
    const repoManager = createGitGenius()
    const gitRunner = createEnhancedGitRunner(repoManager)
    expect(gitRunner).toBeDefined()
  })

  it('should check compatibility', () => {
    const compatibility = checkCompatibility()
    expect(compatibility).toHaveProperty('isCompatible')
    expect(compatibility).toHaveProperty('environment')
    expect(compatibility).toHaveProperty('features')
    expect(compatibility).toHaveProperty('issues')
  })

  it('should export core classes', () => {
    expect(RepositoryManager).toBeDefined()
    expect(GitEngine).toBeDefined()
    expect(CacheManager).toBeDefined()
  })

  it('should export utility classes', () => {
    expect(GitUtils).toBeDefined()
    expect(Logger).toBeDefined()
    expect(LogLevel).toBeDefined()
  })

  it('should validate commit hash with GitUtils', () => {
    expect(GitUtils.isValidCommitHash('abc123f')).toBe(true)
    expect(GitUtils.isValidCommitHash('invalid')).toBe(false)
    expect(GitUtils.isValidCommitHash('')).toBe(false)
  })

  it('should shorten commit hash correctly', () => {
    const longHash = 'abcdef1234567890abcdef1234567890abcdef12'
    expect(GitUtils.shortenHash(longHash)).toBe('abcdef1')
  })

  it('should create Logger instance', () => {
    const logger = new Logger('Test')
    expect(logger).toBeInstanceOf(Logger)
  })

  it('should detect programming languages correctly', () => {
    expect(GitUtils.detectLanguage('test.js')).toBe('javascript')
    expect(GitUtils.detectLanguage('test.ts')).toBe('typescript')
    expect(GitUtils.detectLanguage('test.py')).toBe('python')
    expect(GitUtils.detectLanguage('unknown.xyz')).toBe('text')
  })

  it('should format relative time correctly', () => {
    const now = new Date().toISOString()
    const result = GitUtils.formatRelativeTime(now)
    expect(result).toBe('just now')
  })

  it('should generate cache keys correctly', () => {
    const key = GitUtils.generateCacheKey('repo1', 'commits', 'abc123')
    expect(key).toBe('repo1:commits:abc123')
  })

  it('should safely parse JSON', () => {
    const validJson = '{"test": true}'
    const invalidJson = 'invalid json'

    expect(GitUtils.safeJsonParse(validJson, {})).toEqual({ test: true })
    expect(GitUtils.safeJsonParse(invalidJson, { fallback: true })).toEqual({
      fallback: true,
    })
  })
})
