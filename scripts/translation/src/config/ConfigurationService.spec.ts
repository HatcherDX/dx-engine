import { describe, it, expect } from 'vitest'
import { ConfigurationService } from '../config/ConfigurationService.js'
import type { TranslationJobConfig } from '../types/index.js'

describe('ConfigurationService', () => {
  describe('createDefaultConfig', () => {
    it('should create a valid default configuration', () => {
      const config = ConfigurationService.createDefaultConfig(
        '/src/docs',
        '/dist/docs',
        ['es', 'fr', 'de']
      )

      expect(config.sourceLanguage).toBe('en')
      expect(config.targetLanguages).toEqual(['es', 'fr', 'de'])
      expect(config.strategy).toBe('file-by-file')
      expect(config.fileProcessing.sourceDir).toBe('/src/docs')
      expect(config.fileProcessing.targetDir).toBe('/dist/docs')
      expect(config.fileProcessing.includePatterns).toContain('**/*.md')
      expect(config.fileProcessing.excludePatterns).toContain(
        '**/node_modules/**'
      )
      expect(config.markdownProtection.protectCodeBlocks).toBe(true)
      expect(config.translatorConfig.headless).toBe(true)
    })

    it('should use default target languages if none provided', () => {
      const config = ConfigurationService.createDefaultConfig('/src', '/dist')

      expect(config.targetLanguages).toEqual(['es', 'fr', 'de'])
    })
  })

  describe('validateAndNormalize', () => {
    it('should validate and normalize a complete configuration', () => {
      const input = {
        sourceLanguage: 'en',
        targetLanguages: ['es', 'fr'],
        strategy: 'file-by-file',
        fileProcessing: {
          sourceDir: '/src',
          targetDir: '/dist',
        },
      }

      const result = ConfigurationService.validateAndNormalize(input)

      expect(result.sourceLanguage).toBe('en')
      expect(result.targetLanguages).toEqual(['es', 'fr'])
      expect(result.fileProcessing.includePatterns).toEqual(['**/*.md'])
      expect(result.fileProcessing.preserveStructure).toBe(true)
      expect(result.markdownProtection.protectCodeBlocks).toBe(true)
    })

    it('should apply defaults to missing optional fields', () => {
      const minimalConfig = {
        sourceLanguage: 'en',
        targetLanguages: ['es'],
        strategy: 'file-by-file' as const,
        fileProcessing: {
          sourceDir: '/src',
          targetDir: '/dist',
        },
      }

      const result = ConfigurationService.validateAndNormalize(minimalConfig)

      expect(result.fileProcessing.includePatterns).toEqual(['**/*.md'])
      expect(result.fileProcessing.excludePatterns).toContain(
        '**/node_modules/**'
      )
      expect(result.fileProcessing.preserveStructure).toBe(true)
      expect(result.fileProcessing.overwriteExisting).toBe(false)
      expect(result.markdownProtection.protectCodeBlocks).toBe(true)
      expect(result.strategyConfig.maxConcurrency).toBe(1)
      expect(result.translatorConfig.headless).toBe(true)
    })

    it('should preserve provided optional values', () => {
      const config = {
        sourceLanguage: 'en',
        targetLanguages: ['es'],
        strategy: 'file-by-file' as const,
        fileProcessing: {
          sourceDir: '/src',
          targetDir: '/dist',
          includePatterns: ['docs/**/*.md'],
          overwriteExisting: true,
        },
        markdownProtection: {
          protectCodeBlocks: false,
        },
        strategyConfig: {
          maxConcurrency: 3,
        },
      }

      const result = ConfigurationService.validateAndNormalize(config)

      expect(result.fileProcessing.includePatterns).toEqual(['docs/**/*.md'])
      expect(result.fileProcessing.overwriteExisting).toBe(true)
      expect(result.markdownProtection.protectCodeBlocks).toBe(false)
      expect(result.strategyConfig.maxConcurrency).toBe(3)
    })

    it('should throw error for invalid configuration', () => {
      const invalidConfig = {
        sourceLanguage: '', // empty string
        targetLanguages: [], // empty array
        fileProcessing: {
          sourceDir: '', // empty string
        },
      }

      expect(() => {
        ConfigurationService.validateAndNormalize(invalidConfig)
      }).toThrow('Configuration validation failed')
    })

    it('should throw error for unsupported language codes', () => {
      const invalidConfig = {
        sourceLanguage: 'en',
        targetLanguages: ['invalid-lang'],
        strategy: 'file-by-file',
        fileProcessing: {
          sourceDir: '/src',
          targetDir: '/dist',
        },
      }

      expect(() => {
        ConfigurationService.validateAndNormalize(invalidConfig)
      }).toThrow('Configuration validation failed')
    })
  })

  describe('validateJob', () => {
    let validConfig: TranslationJobConfig

    beforeEach(() => {
      validConfig = ConfigurationService.createDefaultConfig('/src', '/dist', [
        'es',
      ])
    })

    it('should validate a valid configuration', () => {
      const result = new ConfigurationService().validateJob(validConfig)

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
      expect(result.warnings).toHaveLength(0)
    })

    it('should return errors for invalid configuration', () => {
      const invalidConfig = {
        ...validConfig,
        sourceLanguage: '',
        targetLanguages: [],
      }

      const result = new ConfigurationService().validateJob(invalidConfig)

      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })
  })

  describe('validateLanguageCodes', () => {
    let service: ConfigurationService

    beforeEach(() => {
      service = new ConfigurationService()
    })

    it('should validate supported language codes', () => {
      const result = service.validateLanguageCodes(['es', 'fr', 'de', 'zh-cn'])

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject unsupported language codes', () => {
      const result = service.validateLanguageCodes(['invalid', 'xx'])

      expect(result.valid).toBe(false)
      expect(result.errors).toHaveLength(2)
      expect(result.errors[0].message).toContain(
        'Unsupported language code: invalid'
      )
    })

    it('should warn about duplicate language codes', () => {
      const result = service.validateLanguageCodes(['es', 'fr', 'es'])

      expect(result.valid).toBe(true)
      expect(result.warnings).toHaveLength(1)
      expect(result.warnings[0].message).toContain('Duplicate language codes')
    })
  })

  describe('getSupportedLanguages', () => {
    it('should return all supported languages', () => {
      const languages = ConfigurationService.getSupportedLanguages()

      expect(languages).toHaveProperty('es', 'Español')
      expect(languages).toHaveProperty('zh-cn', '简体中文')
      expect(languages).toHaveProperty('ar', 'العربية')
      expect(Object.keys(languages)).toHaveLength(13)
    })
  })

  describe('getDefaultPatterns', () => {
    it('should return default include and exclude patterns', () => {
      const patterns = ConfigurationService.getDefaultPatterns()

      expect(patterns.include).toContain('**/*.md')
      expect(patterns.exclude).toContain('**/node_modules/**')
      expect(patterns.exclude).toContain('**/dist/**')
      expect(patterns.exclude).toContain('**/.git/**')
    })
  })

  describe('framework-specific configurations', () => {
    it('should create VitePress configuration', () => {
      const config = ConfigurationService.createVitePressConfig('/docs', [
        'es',
        'fr',
      ])

      expect(config.fileProcessing.sourceDir).toBe('/docs')
      expect(config.fileProcessing.targetDir).toBe('/docs')
      expect(config.targetLanguages).toEqual(['es', 'fr'])
    })

    it('should create Docusaurus configuration', () => {
      const config = ConfigurationService.createDocusaurusConfig('/website', [
        'de',
        'ja',
      ])

      expect(config.fileProcessing.sourceDir).toBe('/website')
      expect(config.fileProcessing.includePatterns).toContain('docs/**/*.md')
      expect(config.fileProcessing.includePatterns).toContain('blog/**/*.md')
      expect(config.fileProcessing.excludePatterns).toContain(
        '**/versioned_docs/**'
      )
      expect(config.targetLanguages).toEqual(['de', 'ja'])
    })
  })
})
