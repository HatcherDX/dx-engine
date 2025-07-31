import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useBreadcrumbContext } from './useBreadcrumbContext'
import type { MockStorage } from '../../../../types/test-mocks'

describe('useBreadcrumbContext', () => {
  let mockLocalStorage: MockStorage

  beforeEach(() => {
    // Mock localStorage
    mockLocalStorage = {
      length: 0,
      clear: vi.fn(),
      key: vi.fn(),
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    }

    Object.defineProperty(global, 'localStorage', {
      value: mockLocalStorage,
      writable: true,
    })

    // Mock Math.random for consistent test results
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.restoreAllMocks()
  })

  it('should initialize with default context', () => {
    vi.mocked(mockLocalStorage.getItem).mockReturnValue(null)

    const breadcrumb = useBreadcrumbContext()

    expect(breadcrumb.context.generative.projectPath).toBe(
      '/home/usuario/mi-proyecto/'
    )
    expect(breadcrumb.context.visual.currentUrl).toBe(
      'https://example.com/dashboard'
    )
    expect(breadcrumb.context.code.projectName).toBe('mi-proyecto')
    expect(breadcrumb.context.code.filePath).toBe(
      'src/components/atoms/Button.vue'
    )
    expect(breadcrumb.context.timeline.projectName).toBe('mi-proyecto')
    expect(breadcrumb.context.timeline.currentPeriod).toBe('Last 24 hours')
  })

  it('should load context from localStorage', () => {
    const storedContext = {
      generative: { projectPath: '/custom/path/' },
      visual: { currentUrl: 'https://custom.com' },
    }
    vi.mocked(mockLocalStorage.getItem).mockReturnValue(
      JSON.stringify(storedContext)
    )

    const breadcrumb = useBreadcrumbContext()

    expect(breadcrumb.context.generative.projectPath).toBe('/custom/path/')
    expect(breadcrumb.context.visual.currentUrl).toBe('https://custom.com')
    // Should merge with defaults
    expect(breadcrumb.context.code.projectName).toBe('mi-proyecto')
  })

  it('should handle localStorage load errors gracefully', () => {
    vi.mocked(mockLocalStorage.getItem).mockImplementation(() => {
      throw new Error('Storage error')
    })

    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const breadcrumb = useBreadcrumbContext()

    expect(breadcrumb.context.generative.projectPath).toBe(
      '/home/usuario/mi-proyecto/'
    )
    expect(consoleSpy).toHaveBeenCalledWith(
      'Failed to load breadcrumb context from storage:',
      expect.any(Error)
    )

    consoleSpy.mockRestore()
  })

  it('should handle invalid JSON in localStorage', () => {
    vi.mocked(mockLocalStorage.getItem).mockReturnValue('invalid json')

    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const breadcrumb = useBreadcrumbContext()

    expect(breadcrumb.context.generative.projectPath).toBe(
      '/home/usuario/mi-proyecto/'
    )
    expect(consoleSpy).toHaveBeenCalledWith(
      'Failed to load breadcrumb context from storage:',
      expect.any(Error)
    )

    consoleSpy.mockRestore()
  })

  it('should save context to localStorage on changes', async () => {
    vi.mocked(mockLocalStorage.getItem).mockReturnValue(null)

    const breadcrumb = useBreadcrumbContext()

    breadcrumb.updateGenerativePath('/new/path/')

    // Wait for watcher to trigger
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      'hatcher-breadcrumb-context',
      expect.stringContaining('/new/path/')
    )
  })

  it('should handle localStorage save errors gracefully', async () => {
    vi.mocked(mockLocalStorage.setItem).mockImplementation(() => {
      throw new Error('Storage error')
    })

    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const breadcrumb = useBreadcrumbContext()
    breadcrumb.updateGenerativePath('/new/path/')

    // Wait for watcher to trigger
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(consoleSpy).toHaveBeenCalledWith(
      'Failed to save breadcrumb context to storage:',
      expect.any(Error)
    )

    consoleSpy.mockRestore()
  })

  it('should update generative path', () => {
    const breadcrumb = useBreadcrumbContext()

    breadcrumb.updateGenerativePath('/new/project/path/')

    expect(breadcrumb.context.generative.projectPath).toBe('/new/project/path/')
  })

  it('should update visual URL', () => {
    const breadcrumb = useBreadcrumbContext()

    breadcrumb.updateVisualUrl('https://newsite.com')

    expect(breadcrumb.context.visual.currentUrl).toBe('https://newsite.com')
  })

  it('should update code context', () => {
    const breadcrumb = useBreadcrumbContext()

    breadcrumb.updateCodeContext('new-project', 'src/NewComponent.vue')

    expect(breadcrumb.context.code.projectName).toBe('new-project')
    expect(breadcrumb.context.code.filePath).toBe('src/NewComponent.vue')
  })

  it('should update timeline context', () => {
    const breadcrumb = useBreadcrumbContext()

    breadcrumb.updateTimelineContext('timeline-project', 'Last year')

    expect(breadcrumb.context.timeline.projectName).toBe('timeline-project')
    expect(breadcrumb.context.timeline.currentPeriod).toBe('Last year')
  })

  it('should get context for generative mode', () => {
    const breadcrumb = useBreadcrumbContext()

    const context = breadcrumb.getContextForMode('generative')

    expect(context).toEqual({
      projectPath: '/home/usuario/mi-proyecto/',
    })
  })

  it('should get context for visual mode', () => {
    const breadcrumb = useBreadcrumbContext()

    const context = breadcrumb.getContextForMode('visual')

    expect(context).toEqual({
      currentUrl: 'https://example.com/dashboard',
    })
  })

  it('should get context for code mode', () => {
    const breadcrumb = useBreadcrumbContext()

    const context = breadcrumb.getContextForMode('code')

    expect(context).toEqual({
      projectName: 'mi-proyecto',
      filePath: 'src/components/atoms/Button.vue',
    })
  })

  it('should get context for timeline mode', () => {
    const breadcrumb = useBreadcrumbContext()

    const context = breadcrumb.getContextForMode('timeline')

    expect(context).toEqual({
      projectName: 'mi-proyecto',
      currentPeriod: 'Last 24 hours',
    })
  })

  it('should return empty object for unknown mode', () => {
    const breadcrumb = useBreadcrumbContext()

    const context = breadcrumb.getContextForMode('unknown' as never)

    expect(context).toEqual({})
  })

  it('should simulate file change for code mode', () => {
    const breadcrumb = useBreadcrumbContext()

    breadcrumb.simulateFileChange('code')

    // With Math.random() mocked to 0.5, it should pick middle item
    expect(breadcrumb.context.code.filePath).toBe('src/composables/useTheme.ts')
  })

  it('should simulate file change for timeline mode', () => {
    const breadcrumb = useBreadcrumbContext()

    breadcrumb.simulateFileChange('timeline')

    // With Math.random() mocked to 0.5, it should pick middle item
    expect(breadcrumb.context.timeline.currentPeriod).toBe('Last month')
  })

  it('should simulate file change for generative mode', () => {
    const breadcrumb = useBreadcrumbContext()

    breadcrumb.simulateFileChange('generative')

    // With Math.random() mocked to 0.5, it should pick middle item
    expect(breadcrumb.context.generative.projectPath).toBe(
      '/home/usuario/mi-proyecto/src/components/'
    )
  })

  it('should simulate file change for visual mode', () => {
    const breadcrumb = useBreadcrumbContext()

    breadcrumb.simulateFileChange('visual')

    // With Math.random() mocked to 0.5, it should pick middle item
    expect(breadcrumb.context.visual.currentUrl).toBe(
      'https://github.com/user/repo'
    )
  })

  it('should handle simulate file change for different random values', () => {
    Math.random = vi.fn().mockReturnValue(0.1) // Should pick first item

    const breadcrumb = useBreadcrumbContext()
    breadcrumb.simulateFileChange('code')

    expect(breadcrumb.context.code.filePath).toBe(
      'src/components/atoms/BaseButton.vue'
    )
  })
})
