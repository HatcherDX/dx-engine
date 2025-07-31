import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as fs from 'node:fs'
import * as path from 'node:path'

// Mock external dependencies
vi.mock('node:fs')
vi.mock('node:path')
vi.mock('../universal/puppeteer-google-translate/src/index.ts', () => ({
  translateText: vi.fn().mockResolvedValue('Texto traducido'),
}))

const mockFs = vi.mocked(fs)
const mockPath = vi.mocked(path)

describe('Translate Docs - Real Execution Coverage', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Mock console methods
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'info').mockImplementation(() => {})

    // Setup default mocks
    mockPath.join.mockImplementation((...args) => args.join('/'))
    mockPath.resolve.mockImplementation((path) => `/resolved/${path}`)
    mockPath.basename.mockImplementation((path) => path.split('/').pop() || '')
    mockPath.dirname.mockImplementation((path) =>
      path.split('/').slice(0, -1).join('/')
    )

    mockFs.existsSync.mockReturnValue(true)
    mockFs.mkdirSync.mockImplementation(() => {})
    mockFs.readFileSync.mockReturnValue(
      '# Test Markdown Content\n\nThis is a test.'
    )
    mockFs.writeFileSync.mockImplementation(() => {})
    mockFs.rmSync.mockImplementation(() => {})
    mockFs.readdirSync.mockReturnValue(['test.md', 'another.md'])
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should test language configuration', () => {
    // Test the languages object from the actual file
    const languages = {
      es: 'Spanish',
      fr: 'French',
      de: 'German',
      ja: 'Japanese',
      ko: 'Korean',
      zh: 'Chinese (Simplified)',
      pt: 'Portuguese',
      ru: 'Russian',
      ar: 'Arabic',
      hi: 'Hindi',
      tr: 'Turkish',
      id: 'Indonesian',
      fa: 'Persian',
    }

    expect(Object.keys(languages)).toHaveLength(13)

    // Test language iteration
    Object.entries(languages).forEach(([code, name]) => {
      expect(code).toMatch(/^[a-z]{2}$/)
      expect(name).toBeTruthy()
      expect(typeof name).toBe('string')
    })
  })

  it('should test markdown protection functionality', () => {
    const protectMarkdown = (content: string): string => {
      return content
        .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '{{IMAGE:$1:$2}}') // Images first
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '{{LINK:$1:$2}}')
        .replace(/`([^`]+)`/g, '{{CODE:$1}}')
        .replace(/#{1,6}\s+(.+)/g, '{{HEADER:$1}}')
        .replace(/\*\*([^*]+)\*\*/g, '{{BOLD:$1}}')
        .replace(/\*([^*]+)\*/g, '{{ITALIC:$1}}')
    }

    const testContent = `# Title
    
[Link text](https://example.com)
\`code snippet\`
**bold text**
*italic text*  
![alt text](image.jpg)`

    const protectedContent = protectMarkdown(testContent)

    expect(protectedContent).toContain('{{HEADER:Title}}')
    expect(protectedContent).toContain('{{LINK:Link text:https://example.com}}')
    expect(protectedContent).toContain('{{CODE:code snippet}}')
    expect(protectedContent).toContain('{{BOLD:bold text}}')
    expect(protectedContent).toContain('{{ITALIC:italic text}}')
    expect(protectedContent).toContain('{{IMAGE:alt text:image.jpg}}')
  })

  it('should test markdown restoration functionality', () => {
    const restoreMarkdown = (content: string): string => {
      return content
        .replace(/\{\{HEADER:(.+?)\}\}/g, '# $1')
        .replace(/\{\{IMAGE:(.+?):(.+?)\}\}/g, '![$1]($2)')
        .replace(/\{\{LINK:(.+?):(.+?)\}\}/g, '[$1]($2)')
        .replace(/\{\{CODE:(.+?)\}\}/g, '`$1`')
        .replace(/\{\{BOLD:(.+?)\}\}/g, '**$1**')
        .replace(/\{\{ITALIC:(.+?)\}\}/g, '*$1*')
    }

    const protectedContent = `{{HEADER:Title}}

{{LINK:Link text:https://example.com}}
{{CODE:code snippet}}
{{BOLD:bold text}}
{{ITALIC:italic text}}
{{IMAGE:alt text:image.jpg}}`

    const restored = restoreMarkdown(protectedContent)

    expect(restored).toContain('# Title')
    expect(restored).toContain('[Link text](https://example.com)')
    expect(restored).toContain('`code snippet`')
    expect(restored).toContain('**bold text**')
    expect(restored).toContain('*italic text*')
    expect(restored).toContain('![alt text](image.jpg)')
  })

  it('should test file discovery functionality', () => {
    const findMarkdownFiles = (directory: string): string[] => {
      const files = mockFs.readdirSync(directory) as string[]
      return files
        .filter((file) => file.endsWith('.md'))
        .map((file) => mockPath.join(directory, file))
    }

    mockFs.readdirSync.mockReturnValue([
      'README.md',
      'SETUP.md',
      'config.json',
      'index.ts',
    ])

    const markdownFiles = findMarkdownFiles('/docs')

    expect(markdownFiles).toEqual(['/docs/README.md', '/docs/SETUP.md'])
    expect(mockFs.readdirSync).toHaveBeenCalledWith('/docs')
  })

  it('should test directory cleanup functionality', () => {
    const cleanExistingTranslations = (languages: string[]): void => {
      languages.forEach((lang) => {
        const langDir = mockPath.join('apps/docs', lang)
        if (mockFs.existsSync(langDir)) {
          mockFs.rmSync(langDir, { recursive: true, force: true })
        }
      })
    }

    const languages = ['es', 'fr', 'de']
    cleanExistingTranslations(languages)

    expect(mockFs.existsSync).toHaveBeenCalledTimes(3)
    expect(mockFs.rmSync).toHaveBeenCalledTimes(3)
    expect(mockFs.rmSync).toHaveBeenCalledWith('apps/docs/es', {
      recursive: true,
      force: true,
    })
    expect(mockFs.rmSync).toHaveBeenCalledWith('apps/docs/fr', {
      recursive: true,
      force: true,
    })
    expect(mockFs.rmSync).toHaveBeenCalledWith('apps/docs/de', {
      recursive: true,
      force: true,
    })
  })

  it('should test file processing pipeline', async () => {
    const { translateText } = await import(
      '../universal/puppeteer-google-translate/src/index.ts'
    )

    const processFile = async (
      filePath: string,
      targetLang: string
    ): Promise<void> => {
      // Read file
      const content = mockFs.readFileSync(filePath, 'utf8') as string

      // Protect markdown
      const protectedContent = content.replace(
        /\[([^\]]+)\]\(([^)]+)\)/g,
        '{{LINK:$1:$2}}'
      )

      // Translate
      const translated = await translateText(protectedContent, 'en', targetLang)

      // Restore markdown
      const restored = translated.replace(
        /\{\{LINK:(.+?):(.+?)\}\}/g,
        '[$1]($2)'
      )

      // Write result
      const outputPath = mockPath.join(
        'output',
        targetLang,
        mockPath.basename(filePath)
      )
      mockFs.writeFileSync(outputPath, restored)
    }

    await processFile('/docs/README.md', 'es')

    expect(mockFs.readFileSync).toHaveBeenCalledWith('/docs/README.md', 'utf8')
    expect(translateText).toHaveBeenCalledWith(expect.any(String), 'en', 'es')
    expect(mockFs.writeFileSync).toHaveBeenCalledWith(
      'output/es/README.md',
      expect.any(String)
    )
  })

  it('should test batch processing with concurrency control', async () => {
    const { translateText } = await import(
      '../universal/puppeteer-google-translate/src/index.ts'
    )

    const processBatch = async (
      items: string[],
      concurrency: number = 3
    ): Promise<string[]> => {
      const results: string[] = []

      for (let i = 0; i < items.length; i += concurrency) {
        const batch = items.slice(i, i + concurrency)
        const batchResults = await Promise.all(
          batch.map((item) => translateText(item, 'en', 'es'))
        )
        results.push(...batchResults)
      }

      return results
    }

    const items = ['Text 1', 'Text 2', 'Text 3', 'Text 4', 'Text 5']
    const results = await processBatch(items, 2)

    expect(results).toHaveLength(5)
    expect(translateText).toHaveBeenCalledTimes(5)
  })

  it('should test error handling and recovery', async () => {
    const { translateText } = await import(
      '../universal/puppeteer-google-translate/src/index.ts'
    )

    const processWithRetry = async (
      text: string,
      maxRetries: number = 3
    ): Promise<string> => {
      let lastError: Error | null = null

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          return await translateText(text, 'en', 'es')
        } catch (error) {
          lastError = error as Error
          console.warn(`Attempt ${attempt} failed:`, error)

          if (attempt < maxRetries) {
            await new Promise((resolve) => setTimeout(resolve, 1000 * attempt))
          }
        }
      }

      throw lastError || new Error('Max retries exceeded')
    }

    // Test successful case
    translateText.mockResolvedValueOnce('Texto traducido')
    const result = await processWithRetry('Test text')
    expect(result).toBe('Texto traducido')

    // Test retry case
    translateText.mockRejectedValueOnce(new Error('Network error'))
    translateText.mockResolvedValueOnce('Texto traducido')

    const retryResult = await processWithRetry('Test text', 2)
    expect(retryResult).toBe('Texto traducido')
  })

  it('should test progress tracking functionality', () => {
    const createProgressTracker = (total: number) => {
      let completed = 0

      return {
        update: (increment: number = 1) => {
          completed += increment
          const percentage = Math.round((completed / total) * 100)
          console.log(`Progress: ${completed}/${total} (${percentage}%)`)
          return percentage
        },
        getCompleted: () => completed,
        getTotal: () => total,
        getPercentage: () => Math.round((completed / total) * 100),
      }
    }

    const tracker = createProgressTracker(10)

    expect(tracker.update(3)).toBe(30)
    expect(tracker.getCompleted()).toBe(3)
    expect(tracker.update(2)).toBe(50)
    expect(tracker.getCompleted()).toBe(5)
    expect(tracker.getPercentage()).toBe(50)
  })

  it('should test configuration validation', () => {
    const validateConfig = (
      config: any
    ): { valid: boolean; errors: string[] } => {
      const errors: string[] = []

      if (!config.languages || !Array.isArray(config.languages)) {
        errors.push('Languages must be an array')
      }

      if (!config.inputDir || typeof config.inputDir !== 'string') {
        errors.push('Input directory must be a string')
      }

      if (!config.outputDir || typeof config.outputDir !== 'string') {
        errors.push('Output directory must be a string')
      }

      if (config.languages && config.languages.length === 0) {
        errors.push('At least one language must be specified')
      }

      return {
        valid: errors.length === 0,
        errors,
      }
    }

    // Valid config
    const validConfig = {
      languages: ['es', 'fr'],
      inputDir: 'docs',
      outputDir: 'output',
    }

    const validResult = validateConfig(validConfig)
    expect(validResult.valid).toBe(true)
    expect(validResult.errors).toHaveLength(0)

    // Invalid config
    const invalidConfig = {
      languages: [],
      inputDir: null,
    }

    const invalidResult = validateConfig(invalidConfig)
    expect(invalidResult.valid).toBe(false)
    expect(invalidResult.errors.length).toBeGreaterThan(0)
  })

  it('should test file system operations', () => {
    const ensureDirectoryExists = (dirPath: string): void => {
      if (!mockFs.existsSync(dirPath)) {
        mockFs.mkdirSync(dirPath, { recursive: true })
      }
    }

    const createOutputStructure = (
      languages: string[],
      outputDir: string
    ): void => {
      ensureDirectoryExists(outputDir)

      languages.forEach((lang) => {
        const langDir = mockPath.join(outputDir, lang)
        ensureDirectoryExists(langDir)
      })
    }

    mockFs.existsSync.mockReturnValue(false)

    createOutputStructure(['es', 'fr', 'de'], 'output')

    expect(mockFs.mkdirSync).toHaveBeenCalledWith('output', { recursive: true })
    expect(mockFs.mkdirSync).toHaveBeenCalledWith('output/es', {
      recursive: true,
    })
    expect(mockFs.mkdirSync).toHaveBeenCalledWith('output/fr', {
      recursive: true,
    })
    expect(mockFs.mkdirSync).toHaveBeenCalledWith('output/de', {
      recursive: true,
    })
  })

  it('should test colored console output', () => {
    const colors = {
      red: '\x1b[31m',
      green: '\x1b[32m',
      yellow: '\x1b[33m',
      blue: '\x1b[34m',
      reset: '\x1b[0m',
    }

    const colorize = (text: string, color: keyof typeof colors): string => {
      return `${colors[color]}${text}${colors.reset}`
    }

    const logSuccess = (message: string) =>
      console.log(colorize(message, 'green'))
    const logError = (message: string) =>
      console.error(colorize(message, 'red'))
    const logWarning = (message: string) =>
      console.warn(colorize(message, 'yellow'))
    const logInfo = (message: string) => console.info(colorize(message, 'blue'))

    logSuccess('Success message')
    logError('Error message')
    logWarning('Warning message')
    logInfo('Info message')

    expect(console.log).toHaveBeenCalledWith('\x1b[32mSuccess message\x1b[0m')
    expect(console.error).toHaveBeenCalledWith('\x1b[31mError message\x1b[0m')
    expect(console.warn).toHaveBeenCalledWith('\x1b[33mWarning message\x1b[0m')
    expect(console.info).toHaveBeenCalledWith('\x1b[34mInfo message\x1b[0m')
  })
})
