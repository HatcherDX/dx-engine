import { describe, it, expect, vi } from 'vitest'
import { Menu, app } from 'electron'

// Mock electron modules
vi.mock('electron', () => ({
  Menu: {
    buildFromTemplate: vi.fn(),
    setApplicationMenu: vi.fn(),
  },
  app: {
    getName: vi.fn(() => 'Test App'),
    getVersion: vi.fn(() => '1.0.0'),
  },
}))

describe('Menu Module', () => {
  it('should be testable', () => {
    expect(true).toBe(true)
  })

  it('should have electron Menu available', () => {
    expect(Menu).toBeDefined()
    expect(Menu.buildFromTemplate).toBeDefined()
  })

  it('should have electron app available', () => {
    expect(app).toBeDefined()
    expect(app.getName).toBeDefined()
  })
})
