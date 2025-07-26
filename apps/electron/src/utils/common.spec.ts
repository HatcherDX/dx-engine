import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock electron app before importing
vi.mock('electron', () => ({
  app: {
    isPackaged: false,
  },
}))

// Mock import.meta.env
vi.stubGlobal('import.meta', {
  env: {
    DEV: true,
    PROD: false,
  },
})

describe('common utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should export isDev from import.meta.env.DEV', async () => {
    const { isDev } = await import('./common')
    expect(isDev).toBe(true)
  })

  it('should export isProd from import.meta.env.PROD', async () => {
    const { isProd } = await import('./common')
    expect(isProd).toBe(false)
  })

  it('should export isPackaged from app.isPackaged', async () => {
    const { isPackaged } = await import('./common')
    expect(isPackaged).toBe(false)
  })

  it('should export isMac based on process.platform', async () => {
    const { isMac } = await import('./common')
    expect(typeof isMac).toBe('boolean')
    expect(isMac).toBe(process.platform === 'darwin')
  })

  it('should export isWindows based on process.platform', async () => {
    const { isWindows } = await import('./common')
    expect(typeof isWindows).toBe('boolean')
    expect(isWindows).toBe(process.platform === 'win32')
  })
})
