import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useSmartTruncation } from './useSmartTruncation'
import type { MockElement } from '../../../../types/test-mocks'

describe('useSmartTruncation', () => {
  let mockCanvas: MockElement
  let mockContext: MockElement

  beforeEach(() => {
    // Mock canvas and context
    mockContext = {
      measureText: vi.fn().mockReturnValue({ width: 10 }), // Default small width
      font: '',
    }

    mockCanvas = {
      getContext: vi.fn().mockReturnValue(mockContext),
    }

    global.document = {
      createElement: vi.fn().mockReturnValue(mockCanvas),
    } as unknown

    global.window = {
      getComputedStyle: vi.fn().mockReturnValue({
        paddingLeft: '8px',
        paddingRight: '8px',
        borderLeftWidth: '1px',
        borderRightWidth: '1px',
      }),
    } as unknown
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should return empty string for empty path', () => {
    const truncation = useSmartTruncation()

    const result = truncation.truncatePath('', 100)

    expect(result).toBe('')
  })

  it('should return full path if maxWidth is 0 or negative', () => {
    const truncation = useSmartTruncation()
    const fullPath = 'src/components/Hello.vue'

    const result = truncation.truncatePath(fullPath, 0)

    expect(result).toBe(fullPath)
  })

  it('should return full path if it fits within maxWidth', () => {
    const truncation = useSmartTruncation()
    const fullPath = 'src/components/Hello.vue'

    mockContext.measureText.mockReturnValue({ width: 50 })

    const result = truncation.truncatePath(fullPath, 100)

    expect(result).toBe(fullPath)
    expect(mockContext.measureText).toHaveBeenCalledWith(fullPath)
  })

  it('should handle context creation failure', () => {
    const truncation = useSmartTruncation()
    mockCanvas.getContext.mockReturnValue(null)

    const result = truncation.truncatePath('src/components/Hello.vue', 100)

    expect(result).toBe('src/components/Hello.vue')
  })

  it('should handle single filename truncation', () => {
    const truncation = useSmartTruncation()
    const filename = 'VeryLongFileName.vue'

    // Mock measureText to simulate text width based on character count
    // Make the filename too wide to fit
    mockContext.measureText.mockImplementation((text: string) => ({
      width: text.length * 8, // Higher multiplier to ensure truncation
    }))

    const result = truncation.truncatePath(filename, 100)

    // For single filename, truncateText removes from start without adding ...
    expect(result.length).toBeLessThan(filename.length)
    expect(result).toContain('.vue') // Should preserve extension
  })

  it('should use first and last strategy successfully', () => {
    const truncation = useSmartTruncation()
    const fullPath = 'src/components/atoms/Hello.vue'

    mockContext.measureText
      .mockReturnValueOnce({ width: 200 }) // Full path width (too wide)
      .mockReturnValueOnce({ width: 80 }) // 'src/.../Hello.vue' width (fits)

    const result = truncation.truncatePath(fullPath, 100)

    expect(result).toBe('src/.../Hello.vue')
  })

  it('should fallback to keep last strategy', () => {
    const truncation = useSmartTruncation()
    const fullPath = 'very/long/path/components/Hello.vue'

    // Mock to make full path too wide, first strategy too wide, but last strategy fits
    mockContext.measureText.mockImplementation((text: string) => {
      if (text === fullPath) return { width: 300 } // Too wide
      if (text === 'very/.../Hello.vue') return { width: 150 } // Too wide
      if (text === '.../Hello.vue') return { width: 80 } // Fits
      if (text === 'Hello.vue') return { width: 60 }
      if (text === '...') return { width: 20 }
      return { width: text.length * 6 }
    })

    const result = truncation.truncatePath(fullPath, 100)

    expect(result).toBe('.../Hello.vue')
  })

  it('should fallback to truncate filename strategy', () => {
    const truncation = useSmartTruncation()
    const fullPath = 'src/VeryLongFileName.vue'

    // Mock to make all strategies fail except truncate filename
    mockContext.measureText.mockImplementation((text: string) => {
      if (text === fullPath) return { width: 200 } // Too wide
      if (text === 'src/.../VeryLongFileName.vue') return { width: 150 } // Too wide
      if (text === '.../VeryLongFileName.vue') return { width: 120 } // Too wide
      if (text === 'VeryLongFileName.vue') return { width: 110 } // Too wide
      if (text === '...') return { width: 20 }
      if (text === 'FileName.vue') return { width: 70 } // Fits
      if (text === 'ileName.vue') return { width: 65 } // Fits
      if (text === 'leName.vue') return { width: 60 } // Fits
      return { width: text.length * 6 }
    })

    const result = truncation.truncatePath(fullPath, 100)

    expect(result).toContain('...')
    expect(result).toContain('FileName.vue')
  })

  it('should handle case where even truncated filename is too wide', () => {
    const truncation = useSmartTruncation()
    const fullPath = 'src/VeryLongFileName.vue'

    mockContext.measureText
      .mockReturnValueOnce({ width: 200 }) // Full path width
      .mockReturnValueOnce({ width: 150 }) // Filename width
      .mockReturnValueOnce({ width: 30 }) // '...' width
      .mockReturnValue({ width: 200 }) // All subsequent measurements too wide

    const result = truncation.truncatePath(fullPath, 50)

    expect(result).toContain('...')
  })

  it('should calculate available width correctly', () => {
    const truncation = useSmartTruncation()

    const mockElement = {
      clientWidth: 200,
    } as HTMLElement

    const availableWidth = truncation.getAvailableWidth(mockElement)

    // 200 - 8 - 8 - 1 - 1 = 182
    expect(availableWidth).toBe(182)
    expect(global.window.getComputedStyle).toHaveBeenCalledWith(mockElement)
  })

  it('should set correct font on canvas context', () => {
    const truncation = useSmartTruncation()

    truncation.truncatePath('test.vue', 100, 14)

    expect(mockContext.font).toBe(
      '14px ui-monospace, SFMono-Regular, "SF Mono", Monaco, Inconsolata, "Roboto Mono", monospace'
    )
  })

  it('should use default font size when not provided', () => {
    const truncation = useSmartTruncation()

    truncation.truncatePath('test.vue', 100)

    expect(mockContext.font).toBe(
      '13px ui-monospace, SFMono-Regular, "SF Mono", Monaco, Inconsolata, "Roboto Mono", monospace'
    )
  })

  it('should handle path with less than 3 parts in first strategy', () => {
    const truncation = useSmartTruncation()
    const fullPath = 'src/Hello.vue'

    mockContext.measureText
      .mockReturnValueOnce({ width: 200 }) // Full path width (too wide)
      .mockReturnValueOnce({ width: 80 }) // '.../Hello.vue' width (fits)

    const result = truncation.truncatePath(fullPath, 100)

    expect(result).toBe('.../Hello.vue')
  })

  it('should handle edge case where available space for filename is 0 or negative', () => {
    const truncation = useSmartTruncation()
    const fullPath = 'src/Hello.vue'

    mockContext.measureText
      .mockReturnValueOnce({ width: 200 }) // Full path width (too wide)
      .mockReturnValueOnce({ width: 150 }) // First strategy fails
      .mockReturnValueOnce({ width: 120 }) // Second strategy fails
      .mockReturnValueOnce({ width: 200 }) // '...' width (larger than maxWidth)

    const result = truncation.truncatePath(fullPath, 50)

    // Should fallback to final strategy
    expect(result).toContain('...')
  })

  it('should provide container ref', () => {
    const truncation = useSmartTruncation()

    expect(truncation.containerRef).toBeDefined()
    expect(truncation.containerRef.value).toBeUndefined()
  })
})
